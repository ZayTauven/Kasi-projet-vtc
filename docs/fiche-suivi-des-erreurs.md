# Fiche de décision : suivi des erreurs en production (`p1-sentry`)

Point du référentiel : `p1-sentry` (phase 1, `lot-qualite`), en lien avec `bs-stack-monitoring`,
`sc-stack` et `p1-staging`. Fiche rédigée par kasi-integrations-auditor le 29 septembre 2026,
à partir du code relu ce jour-là. Statut : **en attente des décisions de la section 6**.

**En bref** : aujourd'hui, aucune erreur serveur ne remonte nulle part, et le mobile ne remonte
qu'une partie des crashs. Recommandation : reprendre le branchement Sentry de BetterSuite sur
les trois API, en le corrigeant, et envoyer les erreurs vers GlitchTip auto-hébergé. Crashlytics
reste sur le mobile pour la phase 1.

## 1. Ce qui existe aujourd'hui

### Backend (3 API NestJS) : rien ne remonte

- **Pas de filtre d'exceptions** : aucun `@Catch`, `APP_FILTER` ni `useGlobalFilters` dans
  `apps/` et `libs/`.
- **Pas de traitement des erreurs GraphQL** : ni `formatError` ni
  `includeStacktraceInErrorResponses` dans les `GraphQLModule.forRoot` de
  `apps/{driver,rider,admin}-api/src/app/*-api.module.ts`.
- **Seul journal : le `Logger` NestJS**, en texte libre sur la sortie standard. Pas de JSON, pas
  d'alerte, pas de rotation des logs Docker (aucune option `logging:` dans les fichiers compose).
- **Pas de capture des erreurs non attrapées** : aucun `unhandledRejection` ni
  `uncaughtException` dans les `main.ts`.
- **Les crons, exemple du problème** : `apps/driver-api/src/app/order/cron-job.service.ts`.
  - Une exception dans `cronTask()` (toutes les 5 minutes) finit seulement dans les logs de
    `@nestjs/schedule`. C'est ainsi que le bug `DateTimeParseError` est resté invisible des
    semaines.
  - Lignes 53 et 76 : `expireDriverStatus(...)` et `requests(...)` sont lancés sans `await`, donc
    leurs erreurs partent en rejets non gérés.
  - Ligne 67 : `requestLocation[0][1]` fait planter tout le passage du cron si la position de la
    demande manque dans Redis.
  - Seule la sous-partie `enforceShiftRulesSoft` a un `try/catch`, et elle ne fait qu'un `warn`.
  - Le cron quotidien `apps/admin-api/src/app/retention-policy/retention-policy.service.ts:32`
    est dans le même cas.

### Admin-panel Angular : rien

Pas de `ErrorHandler` personnalisé, pas de gestion d'erreur au niveau d'Apollo. Seulement un
`console.error` dans `apps/admin-panel/src/main.ts:22` et `app.component.ts:60`.

### Mobile (driver-app, rider-app) : Crashlytics branché à moitié

- **En place** :
  - `firebase_crashlytics` 5.2.6 et le plugin Gradle Crashlytics (`android/app/build.gradle.kts:72`).
  - L'abstraction `lib/monitoring/error_reporter.dart` et `crashlytics_error_reporter.dart`.
  - Seul branchement réel : `FlutterError.onError = CrashlyticsErrorReporter().fatalErrorHandler`
    (`rider-app/lib/main.dart:65`, `driver-app/lib/main.dart:81`).
- **Manquant** :
  - Pas de `PlatformDispatcher.instance.onError` : les erreurs asynchrones hors widgets ne
    remontent pas.
  - `recordError()` n'est jamais appelé : les erreurs GraphQL et celles attrapées dans les BLoC
    ne remontent pas.
  - Pas d'identifiant ni de clé d'environnement, et la collecte n'est pas coupée en debug.
  - Envoi des symboles iOS de rider-app non vérifié.

## 2. Ce que fait BetterSuite (`bs-stack-monitoring`)

| Élément BetterSuite | Portable ? |
|---|---|
| `@sentry/nestjs` ^10, `instrument.ts` importé dans `main.ts` | Oui, c'est le socle à reprendre |
| `SentryModule.forRoot()` et `SentryGlobalFilter` en `APP_FILTER` | Oui |
| `beforeSend` qui ignore `ForbiddenError` | Oui, à étendre aux erreurs métier attendues |
| Un DSN par API (`SENTRY_DSN_*_API`) | Oui |
| `sentry_flutter` et envoi des symboles, démarrage seulement si un DSN est fourni | Plus tard, derrière `ErrorReporter` |
| `sendDefaultPii: true` | Non : envoie IP, en-têtes et données utilisateur |
| `tracesSampleRate: 1.0` et profilage | Non en phase 1 |
| DSN écrit en clair dans les logs | Non |
| Routes publiques `GET /debug-sentry` | Non : n'importe qui peut déclencher une erreur |
| `import './instrument'` qui n'est pas le premier import | À corriger |

## 3. Options comparées

VPS de production : Hostinger KVM 2, 2 vCPU, 8 Go de RAM. Le runbook Dokploy estime qu'il ne
reste **aucune marge** une fois le staging en route (estimation, à mesurer avec `free -m` et
`docker stats --no-stream`).

| Critère | Sentry SaaS | Sentry auto-hébergé | GlitchTip auto-hébergé | Crashlytics seul + logs |
|---|---|---|---|---|
| Coût | Gratuit jusqu'à environ 5 000 erreurs/mois, puis environ 26 $/mois (tarifs à revérifier) | Logiciel gratuit, mais **second VPS obligatoire** | 0 (MIT) | 0 |
| Ressources VPS | Aucune | 4 cœurs et 16 Go minimum : **impossible sur le KVM 2** | 0,5 à 1 Go : tient seulement si le staging est éteint, avec swap, ou sur un KVM 4 | Aucune |
| Effort | Faible (environ 1 à 2 j par API avec le filtrage) | Faible côté code, élevé côté exploitation | Même code, plus 0,5 à 1 j de déploiement | Très faible, mais le serveur reste aveugle |
| Données personnelles | Hors Sénégal (US ou UE) | Chez Kasi | **Chez Kasi**, rétention réglable | Mobile chez Google (US) |
| Dépendance | SaaS payant au-delà du quota | Maintenance lourde | Aucune (protocole Sentry, réversible) | Google |
| Compatibilité Dokploy | Sans objet | Mauvaise | **Bonne** (service Compose derrière Traefik) | Sans objet |
| Limites | Quota | Coût du serveur | Pas de symbolication native, pas de profilage | Ne voit pas les bugs serveur comme celui du cron |

- Le code est le même pour Sentry SaaS et GlitchTip : seul le DSN change. Le choix d'hébergement
  est réversible.
- Un outil posé sur le VPS qu'il surveille ne voit pas la panne du VPS : il faudra une
  vérification de disponibilité externe (phase 2).

## 4. Recommandation

| Intégration | Verdict |
|---|---|
| Suivi des erreurs des 3 API | **Ajouter** : SDK Sentry repris de BetterSuite et corrigé, dans un module partagé |
| Hébergement | **GlitchTip auto-hébergé** en cible ; repli temporaire sur Sentry SaaS UE gratuit si le VPS n'a pas la place (à trancher) |
| Crashlytics (mobile) | **Garder et compléter** en phase 1 |
| Admin-panel | **Attendre** la phase 2 |
| Logs backend | **Garder et assainir** (rotation, plus de jetons dans les logs) |

**Phase 1, avant le pilote** :
1. Les 3 API : erreurs non attrapées, erreurs GraphQL inattendues, erreurs des crons, avec les tags
   environnement, service et version.
2. Le mobile : compléter Crashlytics.
3. Une alerte qui arrive chez un humain.
4. L'hygiène des logs.

**Plus tard** : admin-panel, surveillance « heartbeat » des crons, disponibilité externe du VPS
(phase 2) ; `SentryErrorReporter` mobile (phase 4).

## 5. Plan d'intégration par agent (après validation)

**kasi-devops-infra (prérequis)**
- Mesurer la RAM réelle du VPS, staging allumé puis éteint, et en tirer le lieu d'hébergement.
- Déployer GlitchTip comme service Dokploy séparé de la stack Kasi, sur un sous-domaine en TLS
  (par exemple `erreurs.kasigroupe.tech`), avec une base PostgreSQL dédiée, 30 jours de
  rétention, une sauvegarde et un compte administrateur (action humaine).
- Ajouter la rotation des logs (`logging: json-file`, `max-size`, `max-file`) aux deux fichiers
  compose.
- Nouvelles variables, sans valeur dans les `.env*.example` : `SENTRY_DSN_ADMIN_API`,
  `SENTRY_DSN_DRIVER_API`, `SENTRY_DSN_RIDER_API`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`.

**kasi-backend-services**
- Un module partagé (par exemple `libs/database/src/lib/monitoring/`) avec
  `initMonitoring(serviceName)`, sans effet si le DSN est vide (dev local et tests d'intégration
  n'envoient rien), importé en première ligne de chaque `main.ts`.
- `SentryGlobalFilter` en `APP_FILTER`. Il faut vérifier sur le banc `p1-tests` que la forme des
  erreurs GraphQL renvoyées aux apps ne change pas (skill `kasi-contrat-mobile-backend`).
- Réglages : `sendDefaultPii: false`, `tracesSampleRate: 0`, pas de profilage ; `beforeSend`
  ignore les erreurs attendues.
- Filtrage des données personnelles, avec un test unitaire : corps et variables GraphQL,
  `Authorization`, `connectionParams`, numéros +221, coordonnées, jetons FCM. Identifiant
  utilisateur interne uniquement.
- Crons : capture explicite si `@Interval` ne remonte pas ; `await` manquants ajoutés avec leur
  test.
- Retirer les jetons des logs : `apps/rider-api/src/app/rider-api.module.ts:62`,
  `apps/admin-api/src/app/admin-api.module.ts:83-93`,
  `libs/database/src/lib/order/firebase-notification-service/driver-notification.service.ts:16`.
- Validation sur staging avec une erreur provoquée par une commande interne (pas de route
  publique).

**kasi-mobile-apps**
- `PlatformDispatcher.instance.onError` vers `ErrorReporter.recordError(fatal: true)`.
- `setCrashlyticsCollectionEnabled(!kDebugMode)`, identifiant interne, clé d'environnement.
- `recordError` non fatal sur les erreurs GraphQL, hors délais réseau.
- Vérifier l'envoi des symboles iOS de rider-app.
- Validation sur émulateur et téléphone réel, avec un crash asynchrone provoqué.

**kasi-admin-panel** : rien en phase 1.

## 6. Décisions qui reviennent à l'utilisateur

1. **Accepter ou non que des erreurs serveur partent hors du Sénégal** (Sentry SaaS UE ou US),
   au moins le temps du pilote. La loi sénégalaise n° 2008-12 encadre ces transferts (CDP). Le
   mobile le fait déjà (Firebase Auth, Crashlytics).
2. **Où héberger GlitchTip** : KVM 2 avec staging éteint hors usage et swap, KVM 4, ou second
   VPS. À décider après la mesure de RAM.
3. **Canal d'alerte et destinataires** : e-mail (serveur SMTP nécessaire) ou webhook, et qui est
   d'astreinte pendant le pilote.
4. **Durée de conservation** (30 jours proposés).
5. **Phase 4** : sortir ou non Crashlytics au profit de GlitchTip.
