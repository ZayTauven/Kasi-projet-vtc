# Journal de décisions — Kasi

Ce fichier journalise les décisions structurantes du projet Kasi (écarts
avec l'héritage de code `app-kasi` — anciennement `app-ridy`, renommé le
2026-07-22 —, arbitrages techniques, choix produit),
avec leur justification, pour éviter de rejouer les mêmes arbitrages. Tenu
par `kasi-supervisor`.

---

## 2026-08-31 — Chaîne de déploiement : passage à Dokploy auto-hébergé

**Contexte** : le déploiement de production est manuel (`git pull && docker
compose build && docker compose up -d && docker compose restart nginx` en SSH
sur `/opt/kasi`). Les workflows GitHub Actions écrits en juillet
(`ci.yml` + `deploy.yml` vers GHCR) n'ont jamais tourné, bloqués par le verrou
de facturation du compte GitHub.

**Décision** : adopter **Dokploy** auto-hébergé. Dokploy clone et construit
**sur le serveur**, déclenché par webhook : aucune minute GitHub Actions n'est
consommée, ce qui contourne réellement le blocage plutôt que d'attendre sa
levée. Il apporte aussi le TLS automatique (Traefik), le retour arrière, les
sauvegardes planifiées et les logs par service.

**Périmètre arbitré — `kasi-nginx` est CONSERVÉ, derrière Traefik.**
Traefik ne fait que terminer le TLS et router le domaine vers `nginx:80` ; tout
le routage applicatif reste dans `.nginx/kasi-locations.conf`. Raison : ce
fichier porte l'upgrade WebSocket des subscriptions, la réponse CORS préflight
avec `proxy_hide_header` (sinon en-têtes en double rejetés par les navigateurs)
et le `resolver 127.0.0.11` avec upstreams en variable — le correctif du piège
d'IP figée. Surtout, **les apps mobiles déjà installées tapent en dur sur
`/driver-api/` et `/rider-api/`** : réécrire ce routage en middlewares Traefik
casserait le parc en circulation. L'éclatement en Applications Dokploy (rollback
et rolling update par service) reste possible plus tard.

**Hors lot, explicitement** : sauvegardes automatisées de la base et migrations
TypeORM. Ce sont les deux vrais trous du déploiement actuel, mais ce sont des
chantiers distincts — une chaîne plus propre livre du code plus vite, pas un
schéma à jour.

**Pièges relevés en écrivant `docker-compose.dokploy.yml`** :
- Dokploy **re-clone le dépôt à chaque déploiement**. Les montages `./config` et
  `./data/uploads` pointeraient dans ce clone ; `config/` et `data/` étant
  gitignorés, ils reviendraient vides à chaque `git push` — perte de la clé de
  service Firebase et de tous les uploads. D'où `../files/`, répertoire frère
  du clone que Dokploy n'efface jamais.
- Les `container_name` fixes et les ports publiés sont globaux à l'hôte :
  production et staging ne pourraient pas cohabiter. Retirés de la variante.
- `.gitignore` capturait `.env.dokploy.example` via la règle `.env.*` ;
  exception ajoutée, sans quoi le fichier référencé par le runbook n'existerait
  pour personne d'autre.
- nginx émettait `X-Forwarded-Proto $scheme`, ce qui vaut `http` une fois le TLS
  terminé par Traefik. Remplacé par un `map` qui retombe sur `$scheme` quand
  l'en-tête amont est absent : strictement rétrocompatible avec l'architecture
  actuelle.

**Anomalie de production découverte à l'inventaire (sans rapport avec Dokploy)** :
`/etc/letsencrypt/renewal/kasigroupe.tech.conf` est en `authenticator =
standalone` **sans `pre_hook` ni `post_hook`**, alors que `kasi-nginx` détient
`0.0.0.0:80` en permanence. Le `certbot.timer` sort en succès aujourd'hui
uniquement parce que le certificat n'est pas encore renouvelable. Premier vrai
essai attendu **vers le 2026-09-08** (échec), certificat expiré le
**2026-10-08**. La bascule vers Traefik supprime le problème par construction ;
sinon, correctif d'attente au §7 du runbook.

**Livrables** : `docker-compose.dokploy.yml`, `.env.dokploy.example`,
`docs/deploiement-dokploy.md` (runbook local → staging → production → retour
arrière), `tools/dokploy-setup.mjs` + `tools/dokploy.example.json` (configuration
de l'API Dokploy scriptée et rejouable — les noms de champs de cette API ne sont
pas documentés, ils ont été relevés en sondant les erreurs Zod).

---

## 2026-07-26 — Audit vision produit pour le mémoire de master 2 (kasi-product-vision)

**Contexte** : l'agent `kasi-memoire` a demandé la matière produit des chapitres
1 à 3 du mémoire, avec obligation de séparer [VISION/CIBLE] et
[RÉELLEMENT IMPLÉMENTÉ]. Audit des 5 piliers de `KASI_NARRATIVE_VISION.md`
contre le code réel (entités, resolvers, i18n, écrans mobiles).

**Conforme à la vision (vérifié dans le code, pas supposé)** :
- *Kasiman, identité unique* : une seule entité `DriverEntity`
  (`libs/database/src/lib/entities/driver.entity.ts`), un seul écran
  `/drivers` dans le panel, une seule table de notation
  (`FeedbackEntity.driverId`, `feedback.entity.ts:28-32`). La livraison est
  une **capacité** du même acteur (`canDeliver` l.92-93,
  `maxPackageSize` l.95-99), pas un second rôle. Aucun enum de rôle ne
  distingue « livreur » de « chauffeur ».
- *Trois usages, une infrastructure* : `ServiceEntity.orderType`
  (`Ride`|`Delivery`, `enums/service-order-type.enum.ts`) discrimine l'usage
  sur la **même** `RequestEntity` (champs livraison nullables, l.115-129),
  le même dispatch (`libs/database/src/lib/order/shared-order.service.ts`),
  la même géoloc Redis (`redis/driver-redis.service.ts`), le même wallet.
- *Digitaliser l'existant* : l'onboarding Kasiman ne présuppose aucune flotte
  neuve — pièces demandées = photo d'identité, permis, carte grise
  (`driver-app/lib/l10n/intl_fr.arb:205`) ; aucune contrainte d'âge de
  véhicule côté client ni serveur (`carProductionYear` sans validation,
  vérifié dans les 3 APIs).
- *Terminologie panel* : 54 occurrences « Kasiman/Kasimen », 0 occurrence de
  « chauffeur »/« livreur »/« passager » dans
  `apps/admin-panel/src/assets/i18n/fr.json`.

**Écarts constatés** :
1. **`driver-app` ne dit jamais « Kasiman »** — 0 occurrence dans
   `driver-app/lib/l10n/intl_fr.arb` et `intl_en.arb`, alors que
   `rider-app/lib/l10n/intl_fr.arb` en compte 9. Deux libellés visibles
   parlent encore de « conducteur » (`intl_fr.arb:38` et `:181`
   « Enregistrement du conducteur »). **Non corrigé ici** : modifier un
   `.arb` impose de régénérer `messages_fr.dart` (`flutter gen-l10n`) —
   hors périmètre d'une retouche de copy. → à déléguer à `kasi-mobile-apps`.
2. **Nom d'application « Kasi Driver »** visible sur l'écran d'accueil du
   téléphone et dans les stores :
   `driver-app/android/app/src/main/AndroidManifest.xml:32` et
   `driver-app/ios/Runner/Info.plist:8`. C'est l'endroit le plus exposé où
   le produit contredit l'identité Kasiman. **Non corrigé unilatéralement** :
   le nom exact (« Kasi Kasiman » ? « Kasiman » ?) est un arbitrage de marque
   + une identité de fiche store. → décision produit à trancher, puis
   `kasi-mobile-apps`.
3. **Le segment « flotte pour compte d'entreprise » n'est pas ce que la
   vision décrit.** `FleetEntity` (`entities/fleet.entity.ts`) modélise un
   **partenaire propriétaire de Kasimen** : part de commission
   (`commissionSharePercent`/`Flat`, l.37-41, appliquée dans
   `shared-order.service.ts:564-576`) et zone d'exclusivité de dispatch
   (`exclusivityAreas`, l.64-65). Elle ne modélise **pas** un client
   entreprise : aucune notion de société sur `RiderEntity`, aucune entité
   d'abonnement/forfait mensuel dans tout `libs/database/entities`, aucun
   portail flotte (les colonnes `fleet.userName`/`password` et l'entité
   `FleetDeviceEntity` sont **dormantes** — enregistrées dans
   `database.module.ts` mais exposées par aucun resolver ; vestiges du
   portail flotte de Ridy). Le « Kasi Pro Tournée » du jeu de données démo
   est un service `orderType=Delivery` payé en crédit
   (`paymentMethod=OnlyCredit`), pas un abonnement.
   → **écart de vision assumé et documenté, pas un bug** : c'est le segment
   le moins avancé. Toute implémentation d'un vrai compte entreprise
   (facturation mensuelle, forfait, commande multi-points pour compte de
   tiers) devra passer par `kasi-backend-services` — ne pas la bricoler
   sur `FleetEntity`, dont la sémantique actuelle est « qui touche une part
   de la commission », pas « qui paie la course ».
4. **`management-cars` reste centré voiture** (`CarModelEntity`, champs
   `carPlate`/`carColor`/`carProductionYear` de `DriverEntity`) alors que
   la vision couvre moto/taxi/camionnette. Écart déjà listé dans
   `GUIDE_FONCTIONNALITES.md` (§Dette connue) — inchangé, confirmé au
   niveau schéma. Point de vigilance : si un jour une catégorie de véhicule
   devient un attribut structurant, elle ne doit **pas** segmenter les
   Kasimen en communautés distinctes (badge, réputation, revenu restent
   communs).

**Corrections faites directement (copy, portée nulle sur le schéma)** :
`apps/admin-panel/src/assets/i18n/fr.json` — pluriel fautif « Kasimans »
→ « Kasimen » (clés `shiftRules.subtitle` l.693 et `shiftRule.subtitle`
l.711), conformément à la convention singulier/pluriel Kasiman/Kasimen de
`GUIDE_FONCTIONNALITES.md`. JSON revalidé (74 sections, parse OK). Aucun
build requis : ces libellés sont chargés à l'exécution.

**Non-action délibérée** : aucune retouche des apps Flutter ni du schéma —
l'agent demandeur travaille sur de la documentation, et les écarts 1 à 4
exigent respectivement un `gen-l10n`, un arbitrage de marque, une décision
d'architecture et un arbitrage produit.

---

## 2026-07-25 — Backend : fix `DISTINCT` + colonne PostGIS cassant le flux post-login rider (`GetCurrentOrder`)

**Décision** : patch `patch-package` sur `@ptc-org/nestjs-query-typeorm@9.5.0`
(`patches/@ptc-org+nestjs-query-typeorm+9.5.0.patch`) rendant le
`.distinct(true)` du batch-loader de relation `OneToMany`/`OneToOneNotOwner`
CONDITIONNEL à la présence effective de jointures, au lieu
d'inconditionnel. Corrige la mutation silencieuse du flux de connexion
rider : après un `login` réussi (JWT valide, confirmé par les logs
`[DIAG-AUTH]` côté Flutter dans une session précédente), la query
`GetCurrentOrder` (`rider-app/lib/main/order.graphql`) échouait sur le
champ `rider.orders`/`lastOrders` avec `could not identify an equality
operator for type json`, et un garde-fou client volontaire masquait cette
erreur — l'app affichait le rider comme "invité" sans aucun message.

**Cause racine** : `RiderDTO.orders` (`apps/rider-api/src/app/rider/dto/rider.dto.ts`)
est une relation `OneToMany` (`@UnPagedRelation`) vers `OrderDTO`, adossée
à `RequestEntity` (`libs/database/src/lib/entities/request.entity.ts`), qui
porte deux colonnes PostGIS `geometry` (`points`, `directions`). TypeORM
sérialise systématiquement toute colonne `geometry` sélectionnée via
`ST_AsGeoJSON(colonne)::json` (`SelectQueryBuilder.buildColumnSelectionExpression`,
hardcodé, non configurable côté entité dans cette version). Le type
Postgres `json` (contrairement à `jsonb`) n'a pas d'opérateur d'égalité,
donc `SELECT DISTINCT` plante dès qu'une colonne `geometry` apparaît dans
le `SELECT`. Or `@ptc-org/nestjs-query-typeorm` (`relation-query.builder.js`,
`getOneToManyOrOneToOneNotOwnerMeta().batchSelect`) applique `.distinct(true)`
**inconditionnellement** à chaque relation `OneToMany` résolue en batch via
DataLoader (le chemin systématiquement emprunté par la résolution GraphQL
d'une relation, même pour un seul parent) — y compris quand le filtre ne
référence aucune relation imbriquée et qu'aucune jointure n'est donc
générée, rendant le `DISTINCT` un no-op inutile qui casse la requête sans
bénéfice. Confirmé en lisant le code source du paquet dans le conteneur et
en rejouant la query réelle contre `kasi-rider-api` (rider id=2,
`221781151148`) : erreur SQL identique à celle capturée en logs, sur le
champ `orders` (le path GraphQL réel, malgré le nom d'alias `lastOrders`
initialement suspecté — les deux alias de la même relation `orders`
déclenchent le même bug, avec ou sans le second alias).

**Fix retenu et pourquoi** : patch ciblé de 3 lignes sur
`@ptc-org/nestjs-query-typeorm` (voir `patches/@ptc-org+nestjs-query-typeorm+9.5.0.patch`) :
`const hasJoins = qb.expressionMap.joinAttributes.length > 0; return
(hasJoins ? qb.distinct(true) : qb).andWhere(where, params);` — préféré à
deux alternatives explorées :
- *Exclure `points`/`directions` du `SELECT` par défaut (`select: false`)
  + `@ResolveField` dédié* : rejeté après investigation — `RequestEntity`
  est partagée par les 3 apps, et `points`/`directions` sont consommés
  directement (sans resolver custom) par `rider-api`, `driver-api` ET
  `admin-api` (voir "Ampleur" ci-dessous) ; aurait exigé de dupliquer un
  DataLoader par app pour préserver le contrat GraphQL existant, avec
  risque de régression silencieuse sur un champ mobile déjà en
  circulation.
- *Patch TypeORM (`::json`→`::jsonb`)* : rejeté — corrige le symptôme
  (incompatibilité `json`/`DISTINCT`) plutôt que la cause (le `DISTINCT`
  lui-même est un no-op ici) ; blast radius plus large (tout `SELECT`
  spatial du monorepo, pas seulement les relations `OneToMany` en batch).
  Aucune option native de désactivation du `distinct` par relation
  n'existe dans `@ptc-org/nestjs-query-typeorm@9.5.0`/`-graphql@9.5.0`
  (vérifié : aucune occurrence de `distinct` ailleurs dans leurs sources).
- Pas de bump de version de `@ptc-org/nestjs-query-typeorm` : `9.5.0` est
  déjà la version `latest` sur npm, aucun correctif officiel disponible.

**Ampleur confirmée (pas seulement théorique)** : le même schéma
(relation `OneToMany` batch vers une entité à colonne `geometry`, filtrée
sans référencer de relation imbriquée, avec le champ géométrique
sélectionné par le client) touche concrètement, en plus de
`rider-api` :
- `driver-api` : `DriverDTO.currentOrders` (même `RequestEntity`) — le
  champ `points` est sélectionné dans `driver-app/lib/main.graphql`.
- `admin-api` : `RiderDTO.orders` et `DriverDTO.orders`
  (`@OffsetConnection`) — `points` est sélectionné avec un `$filter`
  dynamique dans `admin-panel` (`rider-view.graphql`,
  `driver-profile.graphql`, onglet "Historique" des fiches
  rider/chauffeur). Ces deux pages étaient donc, avant ce fix, cassées
  dès qu'un filtre de statut était appliqué à l'historique des courses.
- Non concerné en pratique (vérifié) : les requêtes single-entity
  (`fleet(id)`, `zonePrice(id)`, `region(id)`) exposant `exclusivityAreas`/
  `from`/`to`/`location` — elles ne passent jamais par le chemin batch
  DataLoader (pas de `distinct` appliqué), et les relations `regions`/
  `zonePrices` actuellement exposées par l'admin-panel ne sélectionnent
  jamais le champ géométrique correspondant. Latent (aucune query
  actuelle ne les sollicite avec le champ géométrique) mais couvert par
  le même patch si un futur écran vient à le faire :
  `Service.regions.location`, `Fleet.zonePrices.from/to`,
  `Rider.addresses.location` (`RiderAddressDTO`), toute relation vers
  `SOSEntity`/`FleetEntity`.

**Piège Docker découvert en vérifiant** : le patch `patches/` n'était
appliqué que dans le **stage de build** des 3 Dockerfile (`COPY ./patches`
avant `npm ci`, déjà en place pour le patch `@nxrocks/nx-flutter`) — le
**stage runtime final** refait un `npm i --legacy-peer-deps` séparé à
partir du `package.json` généré par Nx (sans `patches/` ni script
`postinstall`), réinstallant `@ptc-org/nestjs-query-typeorm` **non
patché**. Le patch ne prenait donc effet qu'à la compilation, pas à
l'exécution — premier rebuild+test toujours en échec identique malgré le
patch présent dans `patches/`. Fix : les 3 Dockerfile
(`apps/rider-api/Dockerfile`, `apps/driver-api/Dockerfile`,
`apps/admin-api/Dockerfile`) copient désormais explicitement
`/app/node_modules/@ptc-org/nestjs-query-typeorm` depuis le stage `build`
(déjà patché) par-dessus celui du stage runtime, après le `npm i` final.
**Réflexe à garder** : tout `patch-package` sur une dépendance qui finit
dans le `package.json` de production généré par Nx doit être vérifié dans
le stage runtime des Dockerfile multi-stage, pas seulement dans le stage
de build.

**Validation** :
- Reproduction en direct AVANT fix contre `kasi-rider-api` (JWT rider
  id=2 forgé avec le secret réel du conteneur, requête `GetCurrentOrder`
  simplifiée) : erreur `could not identify an equality operator for type
  json`, `path: ["rider","orders"]`, stacktrace identique à celle des
  logs originaux.
- Après fix (rebuild `docker compose build rider-api` + Dockerfile
  corrigé + redémarrage) : même requête → succès, `points`/`directions`
  correctement peuplés sur `orders` et `lastOrders` pour les 7 commandes
  du rider de test, `docker logs kasi-rider-api` sans plus aucune
  occurrence de l'erreur.
- `npx nx build rider-api` : propre (build webpack réussi, warnings
  préexistants sans rapport avec l'executor `@nx/webpack:webpack`
  déprécié).
- Même patch + fix Dockerfile appliqués à `driver-api`/`admin-api`
  (impact concret confirmé ci-dessus), rebuild + redémarrage des 2
  conteneurs, revérifiés en direct : `driver(id).currentOrders(filter:
  {status:{in:[...]}}) { points { lat lng } }` sur `kasi-driver-api`
  répond sans erreur ; `rider(id).orders(paging:..., filter:{status:{eq:
  Expired}}, sorting:...) { nodes { points { lat lng } } }` — exactement
  le pattern de `admin-panel/.../rider-view.graphql` et
  `driver-profile.graphql` — répond avec les points correctement peuplés
  sur `kasi-admin-api`. Aucune occurrence de l'erreur dans les 3 logs de
  conteneurs après fix.

**Fichiers modifiés** : `patches/@ptc-org+nestjs-query-typeorm+9.5.0.patch`
(nouveau), `apps/rider-api/Dockerfile`, `apps/driver-api/Dockerfile`,
`apps/admin-api/Dockerfile`. Aucun changement de schéma GraphQL, de DTO,
ni de fichier Flutter (scope strictement backend).

## 2026-07-25 — Admin-panel : 3 modules "Gestion" déplacés en onglets de "Réglages généraux"

**Décision** : sortis du groupe de menu latéral "Gestion" (18→15 entrées)
et transformés en onglets routés de la page `/management/settings` :
Cartographie (`management-map-settings`), Passerelles de paiement
(`management-payment-gateways`), Fournisseurs email
(`management-email-providers`). Le composant `ManagementSettingsComponent`
devient un shell d'onglets (`kasi-tabs`, `nzLinkRouter`, `<router-outlet>`)
répliquant exactement le pattern déjà éprouvé de
`drivers/driver-profile/` ; le formulaire "Changer le mot de passe"
d'origine devient un enfant (`ManagementSettingsPasswordComponent`) monté
sur `path: 'password'` (redirection par défaut). Les 3 autres onglets
chargent en lazy les modules existants **sans dupliquer leur code**
(`loadChildren` inchangés dans leur contenu interne, juste remontés sous
`settings/`).

**Justification** : ces 3 modules sont configurés une fois puis quasiment
jamais retouchés (à la différence de Régions, Tarifs zonaux, Utilisateurs,
etc., laissés dans "Gestion" tels quels) — les regrouper dans les
réglages généraux allège un menu à 18 entrées sans en changer la portée
fonctionnelle. Aucun rapport avec la vision Kasi (Kasiman/trois usages) :
c'est un allègement de navigation admin, pas un changement de périmètre
produit.

**Détail technique** :
- `management-routing.module.ts` : suppression des 3 routes top-level
  `map-settings`, `payment-gateways`, `email-providers` (migrées sous
  `settings`).
- `management-settings-routing.module.ts` : route parent `path: ''`
  → enfants `password` (composant local), `map`, `payment-gateways`,
  `email-providers` (les 3 derniers en `loadChildren` vers les modules
  existants, inchangés en interne).
- `cms.component.ts` (`navGroups` → `management.children`) : suppression
  des 3 entrées correspondantes, les 15 autres inchangées dans leur ordre.
- Libellés d'onglets : réutilisation des clés i18n existantes
  (`menu.management.mapSettings/paymentGateways/emailProviders`,
  `settings.changePasswordTitle`) — **aucune nouvelle clé i18n créée**.
  Le sous-titre de page a été retiré du shell (`settings.changePasswordSubtitle`
  ne décrivait que l'onglet mot de passe, plus adapté à un shell à 4
  onglets ; pas remplacé par un texte générique inventé, pour éviter
  d'ajouter une clé non demandée).
- **Piège évité** : `email-provider-view.component.ts` faisait 2×
  `router.navigate(["management/email-providers"], {relativeTo:
  route.root})` en chemin ABSOLU — aurait cassé la navigation retour après
  le déplacement. Corrigé en basculant sur `RouterHelperService.goToParent`
  (même pattern relatif déjà utilisé par `payment-gateway-view.component.ts`,
  qui n'a nécessité aucune modification).
- 2 références croisées trouvées HORS des 3 modules déplacés (non
  mentionnées dans le scope initial, trouvées par grep sur tout le repo) :
  `rider-view-financials.component.html` et
  `driver-profile-financial.component.html` avaient chacun un
  `[routerLink]="'/management/payment-gateways/view/' + ..."` en dur
  (lien "voir la passerelle" depuis une ligne de transaction) — mis à jour
  vers `/management/settings/payment-gateways/view/...`.
- Primitive de design déjà présente mais non utilisée,
  `.kasi-tabs--vertical` (styles.scss, commentée "pour la page settings")
  : **non activée ici**. Le pattern `nzLinkRouter` + `<router-outlet>`
  externe (utilisé par `driver-profile`) ne produit aucun contenu à
  l'intérieur du `.ant-tabs-content-holder` d'ant-design ; en position
  `left`, ce conteneur vide occuperait un espace flex à droite du nav
  vertical avant que le contenu du router-outlet ne s'affiche en dessous —
  layout non validé. Onglets horizontaux (défaut) conservés par prudence.
  À reprendre dans un chantier dédié au design system si des onglets
  verticaux sont réellement voulus pour cette page.

**Validation** : `nx build admin-panel` → 0 erreur (warnings préexistants
sans rapport, ex. NG8111 sur `driver-profile-feedbacks` etc.). Grep sur
tout le repo pour `management/map-settings`, `management/payment-gateways`,
`management/email-providers` → plus aucune référence après les correctifs.

---

## 2026-07-22 — Pivot : fin de l'objectif de parité avec Ridy

**Décision** : à partir de cette date, ce journal ne documente plus un
objectif d'alignement/parité avec `app-kasi` (alors encore nommé
`app-ridy`) puis Ridy v3 (voir les entrées
historiques ci-dessous, notamment tout le backlog P0→P6). Il documente les
décisions de construction du produit Kasi tel que défini par
`KASI_NARRATIVE_VISION.md` — Kasiman comme identité unique, trois usages
(personnes/colis/flotte entreprise) sur une seule infrastructure,
digitaliser l'existant plutôt que recruter une flotte neuve.

**Justification** : le chantier de modernisation des dépendances
(Nx 16→23, Angular 16→22, NestJS 10→11, Flutter) est terminé, mais il a
été mené — comme tout ce qui précède dans ce journal — sans cadrer
explicitement le périmètre produit. `app-kasi` reste l'héritage de code
technique sur lequel Kasi est construit ; il cesse d'être la référence
produit à rattraper.

**Actions associées** (voir mémoire `project_kasi_vision_pivot` pour le
détail complet) :
- Archivage (pas suppression) des artefacts construits autour de la
  parité Ridy — `COMPARATIF_KASI_RIDY_V3.md`, `kasi_stack_report*.md`,
  `UPDATES.md`, `kasi_stack_audit.py` — dans
  `archive/phase-1-migration-ridy/` à la racine du repo.
- Réécriture des agents `.claude/agents/` pour retirer le cadrage
  migration/alignement et refléter la stack réellement confirmée
  aujourd'hui ; retrait de `kasi-upgrade-tracker` (suivi d'`UPDATES.md`,
  devenu hors-sujet).
- Les fonctionnalités déjà livrées via l'ancien backlog P0→P6 (gift
  cards, design system v3, shift rules, document retention, etc.)
  restent en place — le pivot porte sur la démarche future, pas sur un
  retrait de l'existant.

Les entrées historiques ci-dessous restent inchangées, pour comprendre
pourquoi certains choix passés ont été faits.

---

## 2026-07-22 — Renommage symbolique `app-ridy` → `app-kasi`

**Décision** : le dossier racine du monorepo (et du dépôt git,
`Kasi-projet-vtc`) est renommé localement de `app-ridy` à `app-kasi`.
Geste symbolique d'amorçage du pivot ci-dessus — l'héritage de code ne
s'appelle plus par le nom du template d'origine.

**Ce qui NE change PAS** (vérifié avant l'action) :
- Le dépôt GitHub reste `ZayTauven/Kasi-projet-vtc` — git ne dépend pas du
  nom du dossier local, seulement de son contenu (`git remote -v` inchangé
  après renommage).
- Le répertoire de production sur le VPS reste `/opt/kasi` — c'est un
  clone indépendant, sans lien avec le nom du dossier de dev local.
- Docker/nginx utilisent des chemins relatifs au contexte de build ; aucun
  changement fonctionnel requis dans les Dockerfiles.

**Ce qui a été mis à jour** :
- Les volumes Docker nommés `app-ridy_postgres-data`/`app-ridy_redis-data`
  (préfixés par Compose selon le nom de dossier) ont été migrés vers
  `app-kasi_postgres-data`/`app-kasi_redis-data` (copie via conteneur
  `alpine` temporaire, données réelles vérifiées présentes après
  migration — 3 drivers / 2 riders en local — avant suppression des
  anciens volumes).
- Commentaires de chemin relatif dans `docker-compose.yml`,
  `apps/admin-panel/nginx.conf`, `apps/admin-panel/src/environments/environment.prod.ts`.
- `Kasi-ressources/tools/gen_kasi_icons.py` (chemin `ROOT` en dur —
  fonctionnel, cassait sans ce fix).
- `Kasi-ressources/vps/acces.env` et `GUIDE_FONCTIONNALITES.md`
  (références de chemin en commentaire/doc).
- Tous les agents `.claude/agents/*.md` et `CLAUDE.md` racine.

**Piège rencontré** : le renommage a d'abord échoué (`Device or resource
busy` puis `Permission denied`) à cause de handles Windows ouverts sur le
dossier — stack Docker locale active (bind mounts), daemons Gradle/Kotlin
et serveur d'analyse Dart (extensions VS Code pour driver-app/rider-app),
et VS Code lui-même ouvert sur le dossier. Ordre de résolution : `docker
compose down` → arrêt des daemons Gradle/Kotlin/Dart → fermeture de VS
Code par l'utilisateur → renommage réussi.

---

## 2026-07-01 — Initialisation réelle du journal

**Décision** : remplacement du contenu de test (`test: jusqu'a completion`)
par un journal structuré.

**Justification** : le fichier existait déjà à la racine mais ne contenait
qu'un texte de vérification, pas de décision réelle. Premier passage
effectif du superviseur sur le projet.

---

## 2026-07-01 — Confirmation de l'état de la stack (audit v2, aucune dérive)

**Décision** : validation du rapport `kasi_stack_report_v2.md` comme
référence actuelle (régénéré à 18:25, contenu identique aux exécutions
précédentes de 17:56 et 18:08 — aucune dérive détectée).

**Stack confirmée** :
- `admin-api`, `driver-api`, `rider-api` : conteneurisés Docker (Node 20,
  voir décision suivante sur la nature exacte).
- `admin-panel` : Docker + GraphQL Codegen (`codegen.yml`).
- `driver-app`, `rider-app` : Flutter/Dart, BLoC (`flutter_bloc`),
  Google Maps, builds Android (Gradle) et iOS/macOS (CocoaPods).
- Intégrations tierces détectées : firebase (53 occurrences), mapbox (14),
  google_maps/googlemaps (13), paypal (7), stripe (5), razorpay (5),
  paystack (5), flutterwave (5), agora (3), zego (2).

**Justification** : `kasi-supervisor` ne doit jamais supposer la stack et
toujours se baser sur le dernier rapport généré, pas sur une exécution
antérieure.

---

## 2026-07-01 — Point ouvert levé : nature du backend (monorepo Nx confirmé, mais incomplet dans l'extraction locale)

**Constat** : l'audit v2 (section "1bis") ne trouve aucun `package.json`
ni `nx.json` nulle part dans le dépôt. En lisant directement les
`Dockerfile` de `admin-api` et `driver-api`, on voit pourtant :

```
COPY ./package.json ./package-lock.json ./decorate-angular-cli.js ./nx.json ./tsconfig.base.json ./
RUN npx nx build admin-api --prod
COPY ./libs/database ./libs/database
```

**Décision** : le backend `app-ridy` **est bien un monorepo Nx**
(Node.js/NestJS très probable + GraphQL, vu les resolvers/DTOs dans
`admin-api/src/app/**`). Ce n'est **pas** l'absence de Node.js qui
explique l'absence de `package.json` — c'est que **les fichiers racine du
workspace Nx (`package.json`, `nx.json`, `tsconfig.base.json`,
`decorate-angular-cli.js`, `libs/database`) n'ont jamais été inclus dans
cette extraction locale d'`app-ridy`**. Seuls les sous-dossiers
`admin-api/`, `driver-api/`, `rider-api/`, `admin-panel/` (équivalents à
un `apps/*` Nx) sont présents.

**Impact / action requise** : `kasi-backend-services` ne pourra pas
builder ni auditer finement le code backend (dépendances exactes,
version de NestJS, ORM utilisé avec `mysql`, etc.) tant que ces fichiers
racine + `libs/database` n'auront pas été récupérés depuis la source
originale d'`app-ridy` (dépôt/zip d'origine). **Point bloquant à lever en
priorité avant toute décision d'architecture backend.**

**Justification** : évite à `kasi-backend-services` de perdre du temps à
chercher une stack "sans Node" alors que le vrai problème est une
extraction de dépôt incomplète.

---

## 2026-07-01 — Répartition du travail à déléguer (documentée, non exécutée par le superviseur)

| Subagent | À faire | Statut |
|---|---|---|
| `kasi-backend-services` | Auditer `admin-api`/`driver-api`/`rider-api` (NestJS 10 + GraphQL code-first + TypeORM + Redis confirmés par inférence) | **Toujours bloqué** : `libs/database`/`redis`/`order`/`coupon` vides — ne peut pas builder ni valider le comportement réel |
| `kasi-mobile-apps` | Comparer driver-app/rider-app, rebranding technique, `.arb` | **Fait** (2026-07-01) — voir section "Audit mobile" ci-dessus. Découverte : `libs/client-shared` (lib Dart partagée) également manquante |
| `kasi-admin-panel` | Auditer `admin-panel` (GraphQL Codegen, Angular) | **Toujours bloqué** : même problème `libs/*`, plus `Dockerfile` cassé (voir audit devops, `.nginx/default.conf` manquant) |
| `kasi-integrations-auditor` | Statuer garder/abstraire/remplacer pour firebase, mapbox, google_maps, paypal, stripe, razorpay, paystack, flutterwave, agora, zego | **Fait** (2026-07-01) — voir section "Audit intégrations tierces" ci-dessus. Agora et Zego étaient des faux positifs ; Firebase à abstraire en priorité |
| `kasi-devops-infra` | Auditer les `Dockerfile`, orchestration, secrets, CI/CD | **Fait** (2026-07-01) — voir section "Audit devops/infra" ci-dessus. `.nginx/default.conf` manquant à créer (blocage indépendant, plus simple que `libs/*`) |

---

## 2026-07-01 — Reconstruction par inférence des fichiers racine du workspace Nx

**Décision utilisateur** : plutôt que d'attendre une source externe,
reconstruire par inférence les fichiers racine manquants (option choisie
explicitement face au blocage précédent).

**Ce qui a été restructuré** :
- Les 4 tsconfig.json de `admin-api`, `driver-api`, `rider-api`,
  `admin-panel` référencent tous `../../tsconfig.base.json` — preuve que
  ces services vivaient à l'origine sous un dossier `apps/`, pas
  directement à la racine d'`app-ridy`. L'extraction avait aplati ce
  niveau. **Ces 4 dossiers ont été déplacés vers `app-ridy/apps/`** pour
  restaurer la profondeur attendue par les tsconfig existants.
  `driver-app` et `rider-app` (Flutter, hors workspace Nx TypeScript)
  restent à la racine d'`app-ridy`, inchangés.

**Ce qui a été créé (par inférence, PAS l'original)** :
- `app-ridy/package.json` : dépendances déduites d'un grep exhaustif de
  tous les imports non-relatifs des 4 apps (`@nestjs/*`, `@ptc-org/nestjs-
  query-*`, `typeorm`, `fastify`, `firebase-admin`, `@angular/*`, `ng-
  zorro-antd`, `@apollo/client`, etc.). **Les numéros de version sont des
  approximations plausibles** (basées sur Node 20.5 du Dockerfile et sur
  l'executor `@nx/webpack` / `@nx/linter:eslint` vu dans
  `admin-api/project.json`, qui situe Nx ~16.8.x) — à confirmer, pas à
  traiter comme exact.
- `app-ridy/nx.json` : config Nx minimale standard (npmScope `ridy`,
  target defaults build/compile).
- `app-ridy/tsconfig.base.json` : `baseUrl: "."` + `paths` pour
  `@ridy/database`, `@ridy/redis`, `@ridy/order`, `@ridy/coupon`,
  `@ridy/admin-panel`, déduits des imports réels (dont des imports bruts
  du style `libs/database/src/lib/...` sans passer par l'alias, qui ne
  fonctionnent qu'avec ce `baseUrl` à la racine).
- `app-ridy/decorate-angular-cli.js` : boilerplate standard `@nx/angular`
  (fichier générique, identique dans la plupart des workspaces Nx de
  cette génération — pas spécifique à ce projet).

**Ce qui reste explicitement NON reconstitué (fabrication trop risquée)** :
- `app-ridy/libs/database`, `libs/redis`, `libs/order`, `libs/coupon` :
  contenu vide + `README-MANQUANT.md`. C'est de la **logique métier
  réelle** (entités TypeORM, migrations, services Redis) référencée
  ~480 fois au total dans le code des 4 apps — la fabriquer à partir des
  seuls noms de symboles importés produirait des entités/migrations
  incorrectes, plus dangereuses qu'un manque explicite.
- `package-lock.json` : un lockfile encode un arbre de résolution exact,
  impossible à reconstituer sans l'avoir — sera régénéré par `npm
  install` une fois les vraies versions confirmées.

**Justification** : rend le workspace navigable/analysable (structure Nx
correcte, dépendances identifiées) sans jamais faire semblant que du code
métier fabriqué serait fiable. Respecte la règle du superviseur de ne
jamais valider une hypothèse de stack sans base vérifiable — ici, toute
donnée déduite est tracée à sa source (grep, Dockerfile, project.json).

**Action de suivi** : dès que la vraie source d'`app-ridy` est disponible
(export original, zip d'achat, dépôt privé), comparer aux fichiers
reconstitués ci-dessus et corriger les versions de dépendances + récupérer
le contenu réel de `libs/*`.

---

## 2026-07-01 — Audit mobile (driver-app / rider-app)

**Constat — divergences pubspec.yaml** (au-delà de celles notées lors du
premier audit) :
- Exclusif `driver-app` : `fl_chart`, `flutter_ringtone_player`,
  `maps_toolkit` (ce dernier absent de `rider-app`, pas signalé
  initialement). `flutter_vector_icons` est en fait présent dans les
  **deux** apps — correction de l'audit v1 qui le donnait comme
  exclusif à driver-app.
- Exclusif `rider-app` : `dots_indicator`, `flutter_rating_bar`,
  `share_plus`. `facebook_app_events` présent mais commenté.
- **Versions divergentes sur libs communes** (risque de comportement
  incohérent entre les deux apps) : `equatable` (2.0.5 vs 2.0.3),
  `graphql_flutter` (5.2.0-beta.5 vs 5.1.2), `http` (1.0.0 vs 1.1.0),
  `intl` (0.18.0 vs 0.18.1), `json_annotation` (>=4.8.0 vs ^4.5.0),
  `timeago_flutter` (3.5.0 vs 3.4.0). Écart plus sérieux : contrainte SDK
  Dart elle-même diverge (`driver-app: sdk >=2.18.0 <3.0.0` vs
  `rider-app: sdk ^3.0.5` / `flutter ^3.10.5`).

**Découverte importante — lib Dart partagée manquante** : les deux
pubspec référencent `client_shared: path: ../../libs/client-shared`
— une lib Dart partagée existe donc bien dans l'architecture d'origine,
mais **son dossier `app-ridy/libs/client-shared` est absent** de ce
dépôt (nos placeholders `libs/*` du 2026-07-01 ne couvraient que les 4
libs backend Nx — `client-shared` n'y figurait pas et doit être ajoutée
à la liste des libs manquantes à récupérer depuis la source originale,
au même titre que `libs/database`).

**Rebranding technique identifié** :
- `applicationId`/`PRODUCT_BUNDLE_IDENTIFIER` : `com.ridy.taxi.driver`
  et `com.ridy.taxi.rider` — à changer pour un identifiant Kasi.
- Nom Dart du package (`pubspec.yaml: name`) identique (`ridy`) sur les
  deux apps ; labels natifs `"Ridy Driver"` / `"Ridy"` dans
  `AndroidManifest.xml` et `Info.plist`.
- Config Firebase déjà partiellement nettoyée : `GoogleService-Info.plist`
  présent mais **vide (0 octet)** sur les deux apps (celui de rider-app
  est en plus mal placé, sous `macos/` au lieu de `ios/Runner/`) ;
  `google-services.json` (Android) absent des deux. Aucun `project_id`
  Firebase exploitable dans ce dépôt — à régénérer entièrement depuis une
  nouvelle console Firebase Kasi si Firebase est conservé (décision qui
  revient à l'audit intégrations, pas tranchée ici).
- **Pas de rebranding textuel nécessaire** : aucune occurrence de "Ridy"
  trouvée dans les 42 fichiers `.arb` (21 langues × 2 apps) — la marque
  n'apparaît que dans les métadonnées natives listées ci-dessus.

**Écrans métier identifiés** (à statuer conserver/adapter/retirer,
décision non prise ici) : gestion des commandes/courses, portefeuille
(wallet), historique de trajets, réservations planifiées, sélection
adresse/carte, chat client-chauffeur, earnings (driver), onboarding
(rider).

**Action de suivi** : ajouter `libs/client-shared` à la liste des libs
manquantes (`app-ridy/libs/README-MANQUANT.md` à mettre à jour) ; aligner
les versions divergentes ci-dessus avant toute décision d'architecture
mobile commune, conformément à la règle du superviseur sur driver-app/
rider-app partageant la même stack.

---

## 2026-07-01 — Audit devops/infra (Dockerfiles, orchestration, CI/CD)

**Dockerfiles** : `apps/admin-api`, `apps/driver-api`, `apps/rider-api`
sont sains (multi-stage, `node:20.5.0-alpine`, ports 3000/3002/3001,
aucun secret en dur) mais **ne pourront pas builder tant que
`libs/database` reste vide** (COPY d'un dossier sans contenu réel).

**Deux Dockerfiles cassés, indépendamment du problème `libs/*`** :
`apps/admin-panel/Dockerfile` et `rider-app/Dockerfile` copient tous les
deux `./.nginx/default.conf`, **fichier absent de tout le dépôt**
(recherche exhaustive). À créer avant tout build de ces deux images.

**Orchestration** : confirmé, aucun `docker-compose.yml` nulle part dans
le dépôt. Squelette minimal proposé par l'audit (MySQL 8 + Redis 7 + les
4 services, réseau interne, volumes nommés) — conservé en brouillon, pas
encore écrit sur disque (dépend de la résolution `.nginx/default.conf` +
`libs/*` avant d'être utilisable). Note : le mode exact de connexion
MySQL (host/port/credentials) n'est pas visible dans le code actuel —
probablement piloté par `SharedConfigurationService` (config stockée en
base), à confirmer une fois `libs/database` récupéré.

**Dépendances d'infra externes remontées à `kasi-integrations-auditor`
(pas tranchées ici)** :
- Firebase : `firebase-admin` en dépendance racine (usage précis à
  confirmer, probablement notifications), Firebase Auth OTP utilisé
  explicitement dans `rider-app/lib/login/firebase_auth_repository.dart`
  (`verifyPhoneNumber`/`signInWithCredential`), FCM web via
  `rider-app/web/firebase-messaging-sw.js` (config actuellement vide).
- Google Maps : `@googlemaps/google-maps-services-js` dans
  `apps/rider-api/src/app/geo/google-geo.service.ts` pour
  autocomplete/geocoding, clé lue en config runtime (pas en dur). **Une
  bascule OpenStreetMap existe déjà dans le code** (env `GEO_PROVIDER`,
  `open_street_map_provider.dart` côté mobile) — piste concrète et déjà
  amorcée pour réduire la dépendance Google Maps.
- MySQL et Redis : self-hostés, pas de service managé tiers détecté,
  hors périmètre de l'auditeur d'intégrations.

**Secrets** : aucune clé/token/mot de passe réel trouvé en clair (recherche
exhaustive). Points d'attention structurels (pas des fuites, des risques) :
- `driver-app/android/key.properties` et `rider-app/android/key.properties`
  committés avec mots de passe vides — ne devraient pas être versionnés.
- Aucun `.gitignore` à la racine d'`app-ridy` ni dans `apps/*` (seuls les
  sous-projets Flutter en ont un) : rien n'empêcherait aujourd'hui le
  commit accidentel d'un futur `.env`.

**CI/CD** : aucun pipeline existant (`.github/workflows`, `.gitlab-ci.yml`,
etc. — absents). Squelette GitHub Actions proposé (lint/test/build par
`nx`, puis build Docker, puis déploiement via `docker compose` sur runner
self-hosted, cohérent avec l'objectif "contrôle total du matériel"). Non
créé sur disque — prérequis : `libs/*` peuplé (sinon `nx build`/`nx test`
échouent partout), `.nginx/default.conf` créé, registre Docker privé
auto-hébergé à mettre en place (aucun n'existe actuellement).

**Action de suivi** : créer `app-ridy/.nginx/default.conf` (config nginx
minimale servant les assets Angular buildés) dès que possible — c'est un
blocage indépendant et plus simple à lever que `libs/*`.

---

## 2026-07-01 — Audit intégrations tierces (fiches garder/abstraire/remplacer)

Méthodologie : grep du vrai code source (pas des fichiers générés/
plateforme), sous `app-ridy/apps/*` et `app-ridy/{rider-app,driver-app}/
lib`. Limite assumée : `libs/order`, `libs/database`, `libs/redis`,
`libs/coupon` sont vides dans ce dépôt — certaines couches (wallet,
service de notification `@ridy/order/firebase-notification-service`) ne
sont pas inspectables tant qu'elles ne sont pas récupérées ; conclusions
ci-dessous à revalider à ce moment-là.

| Intégration | Occurrences scan initial | Réalité constatée | Couplage | Recommandation | Coût |
|---|---|---|---|---|---|
| **firebase** | 53 | Confirmé, usage transversal réel : Auth OTP (`rider-app/lib/login/firebase_auth_repository.dart`), Crashlytics + App Check (`main.dart` des deux apps), FCM push (`select_service_view.dart`, `web/firebase-messaging-sw.js`), vérif token backend (`apps/{driver,rider}-api/.../auth.service.ts`), clé de licence produit (`apps/admin-api/.../configuration.service.ts`) | **Fort** — `FirebaseAuth.instance`/`FirebaseMessaging.instance` appelés directement dans les blocs/écrans, `auth().verifyIdToken` direct côté NestJS, aucune interface interne | **Abstraire en priorité** — c'est l'intégration la plus transversale (auth+push+crash+licence), contraire à "contrôle total" en l'état | **Élevé** (touche tous les flux de connexion rider/driver) |
| **mapbox** | 14 | Simple fournisseur de tuiles raster dans `flutter_map` (`rider-app/lib/main/map_providers/open_street_map_provider.dart`, `config.dart`), pas de SDK natif | **Faible** — déjà derrière un enum `MapProvider` + setting Hive | **Garder / renforcer l'abstraction existante** — bascule vers tuiles OSM auto-hébergées déjà quasi prête | **Faible** |
| **google_maps/googlemaps** | 13 | Rendu carte mobile (`google_map_view.dart`), géocodage backend (`apps/rider-api/.../geo/google-geo.service.ts`) **avec alternative déjà codée** `nominitam-geo.service.ts` (Nominatim/OSM), + composants Angular admin-panel (`@angular/google-maps`) | Mobile/backend geo = **faible** (bascule par enum `GeoProvider` déjà en place) ; **admin-panel Angular = fort** (pas d'abstraction) | Mobile/backend : **garder + renforcer option self-hosted** ; admin-panel : **abstraire** derrière un composant carte interne avant remplacement (Leaflet/MapLibre) | Faible (mobile/backend) à moyen (admin-panel) |
| **paypal/stripe/razorpay/paystack/flutterwave** | 7/5/5/5/5 | Seulement des valeurs d'enum GraphQL généré + formulaire admin générique (`payment-gateway-view.component.ts`, ~20 gateways dont Stripe/PayPal/Razorpay/Paystack/Flutterwave/MercadoPago/Paytm/PayU/BinancePay). **Aucun SDK de paiement serveur dans le `package.json` reconstitué ni dans les pubspec** — l'implémentation d'appel réel est absente du dépôt (probablement dans `libs/order`/`libs/database`, non récupérées) | Front quasi nul (juste enum + saisie clé) ; couplage réel des appels de paiement **impossible à juger, code manquant** | **Ne rien trancher sans arbitrage marché** (multi-pays du template d'origine — question ouverte à l'équipe : quels marchés Kasi cible ?). Dans tous les cas, **abstraire** derrière un `PaymentGatewayAdapter` unique est cohérent indépendamment du choix des gateways gardées | Indéterminé (dépend du code manquant), probablement moyen |
| **agora** | 3 | **FAUX POSITIF** — 3 occurrences sont le mot portugais "agora" (= "maintenant") dans `intl_pt.arb`/`messages_pt.dart`. Aucun SDK Agora, aucune dépendance | — | **Retirer du radar**, rien à traiter | — |
| **zego** | 2 | **FAUX POSITIF** — coïncidence de sous-chaîne avec "BAM" (Bosnia-Herzegovina Convertible Mark) dans `apps/admin-panel/src/app/currencies.ts`. Aucun SDK Zego, aucune dépendance | — | **Retirer du radar**, rien à traiter | — |

**Point important hors périmètre initial, à signaler à l'équipe** :
`apps/admin-api/src/app/config/configuration.service.ts` contacte un
serveur externe (`http://31.220.15.49:9000`) pour vérifier le "purchase
code" (licence du template Ridy d'origine). C'est un mécanisme de
"phone home" directement contraire à l'objectif "contrôle total du
matériel/infra" de Kasi — **à retirer explicitement**, indépendamment de
toute autre décision d'intégration (ce n'est pas un SDK tiers à
arbitrer garder/abstraire/remplacer, c'est un verrou de licence à
supprimer).

**Action de suivi** : corriger la liste de suivi des intégrations
(retirer agora/zego, qui étaient des faux positifs du scan initial par
mots-clés) ; prioriser l'abstraction Firebase (auth) avant tout autre
chantier d'intégration vu son couplage fort et sa transversalité.

---

## 2026-07-01 — Migration path : Option A confirmée (transformation in-place)

**Décision** : la codebase Kasi sera construite par transformation in-place de `app-ridy/`. Le dossier `Kasi/` reste un répertoire de ressources graphiques uniquement (logos `.png`/`.ico`) — il ne deviendra pas une deuxième arborescence de code.

**Justification** : la reconstruction du workspace Nx a déjà été faite dans `app-ridy/`. Dupliquer l'arborescence dans `Kasi/` doublerait la surface sans valeur ajoutée. Le rebranding (`ridy` → `kasi`) est une opération de remplacement de chaînes sur des périmètres ciblés, pas un motif de déplacement de fichiers.

**Impact** : `kasi-backend-services` et `kasi-admin-panel` travaillent exclusivement sous `app-ridy/`. Les logos `Kasi/assets/` seront copiés dans `app-ridy/apps/admin-panel/src/assets/` lors du rebranding panel.

---

## 2026-07-01 — Rebranding npmScope : @ridy/* → @kasi/* (ordre d'exécution)

**Décision** : le remplacement du npmScope `ridy` → `kasi` dans `nx.json`, `tsconfig.base.json` et tous les imports `@ridy/*` des 4 apps sera exécuté par `kasi-backend-services` **uniquement après que `libs/*` soient peuplées**.

**Justification** : effectuer ce remplacement sur du code non fonctionnel (libs vides) produirait un diff massif sur une base instable — diagnostic et rollback seraient difficiles. Attendre les libs garantit que le premier build post-rebranding est significatif.

---

## 2026-07-01 — Création des fichiers infra manquants (kasi-devops-infra, tour 2)

### Fichiers créés

**`app-ridy/.nginx/default.conf`**

- Raison : les Dockerfiles `apps/admin-panel/Dockerfile` et
  `rider-app/Dockerfile` copient tous deux ce fichier
  (`COPY ./.nginx/default.conf /etc/nginx/conf.d/default.conf`) — son
  absence bloquait tout build Docker de ces deux images, indépendamment
  du problème `libs/*`.
- Choix nginx :
  - Un seul bloc `server` sur le port 80, `try_files $uri $uri/ /index.html`
    comme SPA fallback — couvre Angular Router (admin-panel) et Flutter web
    Router (rider-app) sans modification.
  - `gzip on` avec `gzip_min_length 1024` : compression activée uniquement
    au-dessus de 1 Ko pour éviter que l'overhead CPU dépasse le gain réseau
    sur les petites réponses.
  - Cache immutable 1 an pour les assets hachés (JS/CSS/polices/images) :
    Angular CLI avec `output-hashing=all` et Flutter web génèrent des noms
    de fichier incluant le hash de contenu — un nouveau build produit
    automatiquement de nouveaux noms, rendant le cache long sûr.
  - `no-store` sur `index.html` uniquement : le point d'entrée SPA doit
    toujours être rechargé pour que le navigateur découvre les nouveaux hashes.
  - `X-XSS-Protection: 0` intentionnel : la valeur `1; mode=block` est
    ignorée par les navigateurs modernes et peut introduire des failles sur
    d'anciens navigateurs ; la protection réelle repose sur CSP (à ajouter
    en production).
  - `error_page 404 /index.html` : les 404 serveur sont aussi redirigés
    vers la SPA (gestion de l'erreur côté client).

**`app-ridy/.gitignore`**

- Raison : aucun `.gitignore` à la racine d'`app-ridy/` — risque de commit
  accidentel de `.env`, `key.properties`, `*.keystore`, `google-services.json`,
  etc. (signalé lors de l'audit devops précédent).
- Choix de contenu :
  - `.nx/cache`, `.nx/workspace-data` : caches Nx locaux (peuvent faire
    plusieurs Go), jamais à versionner.
  - `.env` et `.env.*` avec `!.env.example` et `!.env.template` : interdit
    les fichiers d'environnement réels tout en permettant les templates.
  - `google-services.json`, `GoogleService-Info.plist`,
    `service-account*.json`, `firebase-adminsdk*.json` : fichiers Firebase
    contenant des clés de service ou des identifiants d'application.
    Commentaire explicite dans le fichier rappelant que ces intégrations
    sont sous arbitrage de `kasi-integrations-auditor`.
  - `key.properties`, `*.keystore`, `*.jks` : secrets de signature Android
    (les deux apps en avaient des versions vides committées — risque si jamais
    remplies avec de vraies clés).
  - `pubspec.lock` ignoré par défaut avec commentaire indiquant que l'équipe
    peut retirer cette règle si elle veut des builds reproductibles (committer
    le lockfile est la bonne pratique pour les apps Flutter, contrairement
    aux packages).
  - `*.g.dart`, `*.freezed.dart`, `*.graphql.dart` : code Dart généré
    (json_serializable, freezed, graphql_flutter codegen) — doit être
    régénéré par `build_runner`, pas versionné.
  - `docker-compose.override.yml` ignoré (surcharges locales Docker) ;
    `docker-compose.yml` et tous les `Dockerfile` sont explicitement
    versionnés (pas ignorés).

**`app-ridy/docker-compose.yml`**

- Raison : aucun fichier d'orchestration existant dans le dépôt. Squelette
  permettant de faire tourner l'ensemble sur le matériel de l'équipe.
- Marqué BROUILLON en en-tête : non opérationnel tant que `libs/*` sont
  vides (les builds des trois API NestJS échoueront).
- Contenu :
  - MySQL 8.0 + Redis 7-alpine avec volumes nommés (`mysql-data`,
    `redis-data`), healthchecks, réseau bridge interne `kasi-net`.
  - `admin-api` (port 3000), `driver-api` (port 3002), `rider-api` (port
    3001) : contexte de build = `.` (racine monorepo) car les Dockerfiles
    copient `package.json`, `nx.json`, `tsconfig.base.json` depuis la racine.
  - `admin-panel` (port 8080→80) : Angular SPA, dépend de `admin-api`.
  - `rider-app-web` commenté : le `Dockerfile` de rider-app ne compile pas
    Flutter — il copie `rider-app/build/web` pré-built. Le service n'est
    opérationnel qu'après `flutter build web --release`.
  - Variables d'env avec fallbacks `CHANGEME_*` : aucune vraie clé en dur,
    toutes les valeurs sensibles (mots de passe DB, Redis, JWT secret,
    clés Firebase) sont lues depuis un `.env` local non versionné.
  - Firebase exposé comme variables d'env avec commentaire explicite
    renvoyant à `kasi-integrations-auditor` pour l'arbitrage
    garder/abstraire/remplacer — kasi-devops-infra ne tranche pas cette
    décision.

### Blocages levés par ce tour

- Build Docker de `apps/admin-panel` : débloqué (`.nginx/default.conf`
  existe maintenant). Reste bloqué par `libs/database` vide.
- Build Docker de `rider-app` : débloqué (même raison). Reste bloqué par
  l'absence du dossier `rider-app/build/web` (build Flutter à effectuer
  manuellement avant le build Docker).

### Blocages non levés (hors périmètre de ce tour)

- `libs/database`, `libs/redis`, `libs/order`, `libs/coupon` toujours vides
  — bloque les builds des trois API NestJS.
- `libs/client-shared` (Dart) toujours absent.
- Phone-home de licence dans `apps/admin-api/.../configuration.service.ts`
  toujours présent.

---

## 2026-07-01 — Migration MySQL → PostgreSQL + PostGIS (décision et exécution)

**Décision** : PostgreSQL 16 + PostGIS 3.4 remplace MySQL 8 comme base de données principale.

**Justification** : le codebase utilisait déjà des types spatiaux natifs (`polygon`, `point`, `multipoint`) pour les zones de service, GPS, et waypoints de courses. PostGIS est supérieur à MySQL spatial pour les requêtes géospatiales (`ST_Contains`, `ST_Distance`, point-in-polygon) critiques pour un service VTC.

**Ce qui a été modifié** :
- `libs/database/src/lib/database.module.ts` — `type: 'mysql'` → `'postgres'`, port 3306→5432, SQL `SHOW DATABASES/TABLES` → équivalents `pg_catalog`/`information_schema`, activation `CREATE EXTENSION IF NOT EXISTS postgis`, variables d'env renommées `MYSQL_*` → `DB_*`, fallback `DB_NAME` → `'kasi'`
- 6 colonnes spatiales sur 5 entités (`ZonePriceEntity`×2, `RegionEntity`, `FleetEntity`, `RequestEntity`×2, `RiderAddressEntity`, `SOSEntity`) — `@Column('polygon'/'point'/'multipoint')` → `@Column({ type: 'geometry', spatialFeatureType: '...', srid: 4326 })`
- `PolygonTransformer`, `MultipointTransformer`, `PointTransformer` — adaptés pour EWKB PostGIS (hex), EWKT avec préfixe `SRID=4326;`, et bug de parsing WKT corrigé
- `package.json` — `mysql2` retiré, `pg: ^8.11.3` + `@types/pg: ^8.10.2` ajoutés
- 3 Dockerfiles (`admin-api`, `driver-api`, `rider-api`) — `RUN npm i mysql` → `RUN npm i pg`
- `docker-compose.yml` — service `mysql:8.0` → `postgis/postgis:16-3.4`, port 5432, volume `postgres-data`, healthcheck `pg_isready`, variables d'env NestJS mises à jour
- `app-ridy/.env.example` créé (documenté, versionné)
- `app-ridy/docs/pgadmin-setup.md` créé (guide connexion pgAdmin4 local)
- 32 migrations MySQL archivées dans `libs/database/src/lib/migration/mysql-archive/` — `synchronize: true` recréera le schéma au premier boot

**`purchaseCode` supprimé** de `ICurrentConfiguration` + `shared-configuration.service.ts` + `configuration.service.ts` + `admin-api.module.ts` (phone-home résiduel totalement nettoyé).

**Point ouvert — admin-panel** : `config.guard.ts`, `config.component.ts`, `app.component.ts` utilisent `purchaseCode == null` comme signal "système non configuré" → doit devenir `firebaseProjectPrivateKey == null`. À corriger par `kasi-admin-panel`.

---

## 2026-07-02 — Nginx reverse proxy : transformation SPA → gateway (kasi-devops-infra)

### Contexte

Le fichier `.nginx/default.conf` existait en SPA-only (servi par les Dockerfiles
`admin-panel` et `rider-app`). La stack étant maintenant composée de trois APIs
NestJS exposées sur des ports internes Docker distincts, un reverse proxy unique
en entrée est nécessaire pour unifier le point d'accès HTTP.

### Decisions prises

**`.nginx/default.conf` transforme en reverse proxy complet.**

- Trois blocs `location /admin-api/`, `/driver-api/`, `/rider-api/` ajoutés.
  Chacun strip le prefixe de chemin via le slash de fin de `proxy_pass`
  (`proxy_pass http://admin-api:3000/` — le `/` final est intentionnel).
- `map $http_upgrade $connection_upgrade` place en contexte http (hors `server{}`)
  pour le support WebSocket. Cela couvre les subscriptions GraphQL (`graphql-ws`
  et `subscriptions-transport-ws`), connexions longues avec `proxy_read_timeout 300s`.
- CORS gere au niveau nginx (`Access-Control-Allow-Origin: $http_origin` + credentials).
  **Consequence directe** : `app.enableCors()` doit etre desactive dans chaque API
  NestJS pour eviter les en-tetes dupliques (comportement de rejet navigateur).
- Preflight OPTIONS intercepte dans chaque bloc proxy et retourne 204 sans
  proxifier — conformite strict au protocole CORS preflight.
- En-tetes de securite (`X-Content-Type-Options`, `X-Frame-Options`,
  `X-XSS-Protection`) declares au niveau `server{}` ET repetes dans chaque
  bloc `location` qui a ses propres `add_header` (comportement d heritage nginx :
  des qu un bloc location a un `add_header`, les `add_header` du parent ne sont
  plus herites).
- Bloc SSL commente avec placeholders clairs renvoyant a `.nginx/ssl-placeholder.md`.

**Service `nginx` ajoute dans `docker-compose.yml`.**

- Image `nginx:1.25-alpine` (coherent avec l image deja utilisee par `admin-panel`).
- Port `80:80` expose. Port `443:443` commente (activer apres Let's Encrypt).
- Volume bind `./.nginx/default.conf` en read-only.
- Volume bind `./dist/apps/admin-panel` en read-only — servir le build statique
  Angular directement depuis nginx sans passer par le conteneur `admin-panel`.
  **Prerequis** : `npx nx build admin-panel --configuration=production` doit
  avoir ete execute sur l hote avant `docker compose up nginx`.
- `depends_on: [admin-api, driver-api, rider-api]` — nginx demarre apres les trois
  APIs (pas de condition healthcheck, les APIs n en ont pas encore).
- Volumes SSL commentes en placeholder (decommenter avec certbot, voir
  `.nginx/ssl-placeholder.md`).

**Fichier `.nginx/ssl-placeholder.md` cree (19 lignes).**
  Guide operationnel Let's Encrypt : certbot standalone, kasi-ssl.conf, cron de
  renouvellement. Aucun certificat genere ni commite.

### Impact sur le service admin-panel

Le service `admin-panel` dans docker-compose conserve son Dockerfile multi-stage
(build Nx + nginx interne) et son port `8080:80` — utile pour acces direct en
debug. En production, le port 8080 peut etre retire de `ports:` (seul le port 80
du nginx reverse proxy est expose) sans toucher au reste du service.

### Ce qui reste a faire avant mise en production

- Desactiver `app.enableCors()` dans `admin-api`, `driver-api`, `rider-api`
  (NestJS) — sinon doublons d en-tetes CORS.
- Executer `npx nx build admin-panel --configuration=production` avant tout
  `docker compose up` (le volume `dist/apps/admin-panel` doit exister).
- Provisionner les certificats SSL via certbot et decommenter les lignes
  markees dans `default.conf` et `docker-compose.yml`.

---

## Prochaine étape

Point bloquant "workspace Nx root manquant" levé par reconstruction (voir
décision ci-dessus) : `package.json`, `nx.json`, `tsconfig.base.json`,
`decorate-angular-cli.js` existent maintenant à `app-ridy/` (racine), et
`admin-api`/`driver-api`/`rider-api`/`admin-panel` ont été déplacés sous
`app-ridy/apps/` pour matcher la profondeur attendue par leurs tsconfig.

Reste bloquant avant tout audit fin du backend : le contenu réel de
`libs/database`, `libs/redis`, `libs/order`, `libs/coupon` (actuellement
vides, voir `app-ridy/libs/README-MANQUANT.md`) — ce sont ces libs qui
portent la vraie logique métier (entités, migrations). Sans elles,
`kasi-backend-services` peut commencer à raisonner sur l'architecture
(NestJS + GraphQL code-first + TypeORM + Redis confirmés) mais ne pourra
ni builder ni valider le comportement réel tant qu'elles ne sont pas
récupérées depuis la source originale.

Relancer `kasi_stack_audit.py` sur la nouvelle structure (`apps/*` +
`libs/*`) pour vérifier qu'il la détecte correctement avant de reprendre
la répartition vers les subagents.

**Confirmé** : `kasi_stack_report_v3_final.md` (généré le 2026-07-01
18:38) détecte maintenant une section "(racine du dépôt)" avec
`nx.json` + `package.json` → "Monorepo (Nx), Node.js / JavaScript-
TypeScript", et les apps sous `apps\admin-api`, `apps\driver-api`, etc.
C'est désormais **le rapport de référence** pour la suite (remplace
`kasi_stack_report_v2.md`).

---

## 2026-07-01 — Rebranding @ridy/* → @kasi/* effectué (356 fichiers TypeScript)

**Décision actée** : le npmScope `ridy` → `kasi` a été appliqué sur l'ensemble du monorepo TypeScript.

**Ce qui a été modifié** :
- `nx.json` : `npmScope: "ridy"` → `"kasi"`
- `tsconfig.base.json` : 7 clés de paths renommées (`@ridy/...` → `@kasi/...`)
- 356 fichiers `.ts` sous `apps/` et `libs/` : tous les imports `@ridy/` remplacés
- Aucune référence `@ridy/` ne subsiste dans `apps/` ou `libs/`

**Ce qui reste à faire** :
- `process.env.MYSQL_DB || 'ridy'` dans `libs/database/src/lib/database.module.ts` — fallback hardcodé à passer en `'kasi'` lors du déploiement (coordination avec kasi-devops-infra sur le nom de la base)
- Champ `purchaseCode` dans `ICurrentConfiguration` (libs/database) — résidu de l'ancien phone-home, à supprimer

---

## 2026-07-01 — Firebase dans libs/database : signal à traiter par kasi-integrations-auditor

**Constat** : Firebase FCM est utilisé directement dans `libs/database/src/lib/order/firebase-notification-service/` :
- `DriverNotificationService` : envoie les notifications FCM aux chauffeurs (nouvelle course, annulation, message, paiement, booking)
- `RiderNotificationService` : envoie les notifications FCM aux riders (acceptée, arrivée, démarrée, terminée, annulée, post-paiement, message, booking)
- L'initialisation Firebase lit un fichier `firebaseProjectPrivateKey` depuis `config/config.<env>.json`

**Ces services sont importés directement par driver-api ET rider-api.** C'est le couplage Firebase le plus critique du backend.

**Action** : à traiter par `kasi-integrations-auditor` en priorité — avant tout build backend opérationnel.

---

## 2026-07-01 — Admin-panel : état du rebranding visuel

**Fait** :
- 5 logos Kasi copiés dans `apps/admin-panel/src/assets/`
- `favicon.ico` remplacé par `logo-kasi-blue.ico`

**À faire (non bloquant pour le build)** :
- `login.component.html` : `assets/logo.png` → `logo-kasi-blue.png`
- `cms.component.html` : `assets/logo.png` → `logo-kasi-white.png`
- 18 fichiers i18n (`en.json` + 17 langues) : section `branding` (nom, URL, copyright)
- `manifest.webmanifest` : name, short_name, theme_color
- `index.html` : couleurs du spinner (rose Ridy → palette Kasi)
- localStorage key : `ridy_admin_token` → `kasi_admin_token` (3 fichiers : graphql.module.ts, login.component.ts, login.guard.ts)

---

## 2026-07-01 — Admin-panel : migration Google Maps → Mapbox GL JS (décision révisée)

**Décision** : Mapbox GL JS (via `ngx-mapbox-gl`) remplace `@angular/google-maps`. Mapbox est retenu à la place de Leaflet/MapLibre car il est déjà utilisé côté mobile (flutter_map avec enum `MapProvider`) — cohérence de la stack cartographique Kasi.

**API keys** : à fournir ultérieurement. Le code lit la clé depuis `environment.mapboxToken` — placeholder en attendant.

**9 fichiers à migrer** :
- `@components/shared.module.ts` — `GoogleMapsModule` → `NgxMapboxGLModule`
- `@components/google-places.component.ts` — Google Places Autocomplete → Mapbox Geocoding API
- `cms/home/overview/overview-drivers-map/` — carte temps réel chauffeurs
- `cms/home/dispatcher/dispatcher-locations-select/` — sélection localisation
- `cms/requests/request-view/request-view-assign/` — carte assignment course
- `cms/management/management-region/region-view/` — dessin polygone (**`@mapbox/mapbox-gl-draw`**)
- `cms/management/management-fleets/fleet-view/fleet-view-details/` — zone exclusivité flotte (**draw**)
- `cms/management/management-zone-prices/zone-price-view/` — **deux** zones tarifaires (**draw**)

**Packages à ajouter** : `mapbox-gl`, `ngx-mapbox-gl`, `@mapbox/mapbox-gl-draw`, `@types/mapbox-gl`.

---

## 2026-07-01 — Mobile : rebranding natif effectué, imports Dart en attente

**Fait** :
- SDK Dart aligné sur `^3.0.5` (les deux apps)
- Flutter env ajouté dans driver-app : `^3.10.5`
- 7 dépendances divergentes alignées (versions les plus récentes retenues)
- `applicationId` : `com.ridy.*` → `com.kasi.*` (Android, les deux apps)
- Labels natifs : `"Ridy Driver"` → `"Kasi Driver"`, `"Ridy"` → `"Kasi"` (AndroidManifest + Info.plist)
- `pubspec.yaml name:` → `kasi_driver` / `kasi_rider`
- Logo de référence `logo-kasi.png` copié dans `assets/` des deux apps

**À faire — imports Dart (BLOQUANT pour le build Flutter)** :
- driver-app : **120 occurrences** `package:ridy/` → `package:kasi_driver/` dans 38 fichiers
- rider-app : **256 occurrences** `package:ridy/` → `package:kasi_rider/` dans 72 fichiers
- Outil : `dart fix` ou remplacement global ciblé — à déléguer à `kasi-mobile-apps` dans un prochain tour

**À faire — icônes (non bloquant pour le build)** :
- Android : 5 densités × 3 PNG (launcher + adaptive back/fore) + notification icons × 2 apps
- iOS : 25 PNG par app
- Outil recommandé : `flutter_launcher_icons` (dev_dependency, pointer sur `logo-kasi.png`)

**Point à vérifier** : `graphql_flutter: ^5.2.0-beta.5` + Dart `^3.0.5` — compatibilité à confirmer au premier `flutter pub get`. Fallback : rester sur `5.1.2` avec dependency_override.

---

## 2026-07-01 — Imports Dart package:ridy/ → package:kasi_driver/ / package:kasi_rider/ (quasi-complet)

**Fait** :
- driver-app : 108/120 occurrences remplacées dans 31 fichiers
- rider-app : 246/256 occurrences remplacées dans 64 fichiers
- 0 occurrence `package:ridy/` restante dans les fichiers non-générés des deux apps

**Résidus dans fichiers générés (à régénérer, pas à modifier manuellement)** :
- driver-app : 12 occurrences dans 7 fichiers `*.graphql.dart` / `*.gql.dart`
- rider-app : 10 occurrences dans 8 fichiers `*.graphql.dart` / `*.gql.dart`

**Action requise** (après `flutter pub get`) :
```
flutter pub run build_runner build --delete-conflicting-outputs
```
À exécuter dans `driver-app/` ET `rider-app/` — portera les résidus à 0.

---

## 2026-07-01 — graphql_flutter : downgrade vers stable décidé

**Décision** : remplacer `graphql_flutter: ^5.2.0-beta.5` par `^5.1.3` dans les deux `pubspec.yaml`.

**Justification** :
- rider-app résolvait vers `5.2.0-beta.4` et driver-app vers `5.2.0-beta.5` — incohérence de versions entre les deux apps
- `5.1.3` (stable) est compatible Dart `^3.0.5` et Flutter `^3.10.5`, expose la même API pour tous les usages présents (Query/Mutation/Subscription widgets, GraphQLClient, GraphQLCache)
- Une contrainte `^5.2.0-beta.x` ne se résout pas automatiquement vers `5.2.0` stable quand il sortira

**À faire** : modifier les deux `pubspec.yaml` (déléguer à `kasi-mobile-apps`).

---

## 2026-07-01 — Plan d'abstraction Firebase (7 interfaces, ordre de migration)

**Décision** : abstraire Firebase derrière des interfaces NestJS/Dart avant tout déploiement, pour rendre Kasi indépendant de Firebase à terme.

### Interfaces à créer (NestJS)

| Interface | Token DI | Rôle | Implémentation Firebase | Alternative self-hosted |
|---|---|---|---|---|
| `IDriverNotificationService` | `DRIVER_NOTIFICATION_SERVICE` | FCM push vers drivers | `FirebaseDriverNotificationService` | `NtfyDriverNotificationService` |
| `IRiderNotificationService` | `RIDER_NOTIFICATION_SERVICE` | FCM push vers riders | `FirebaseRiderNotificationService` | `NtfyRiderNotificationService` |
| `IPhoneAuthVerifier` | `PHONE_AUTH_VERIFIER` | Vérification token OTP backend | `FirebasePhoneAuthVerifier` | `KasiOtpPhoneAuthVerifier` (JWT interne) |

### Interfaces à créer (Flutter/Dart)

| Interface | Rôle | Implémentation Firebase | Alternative self-hosted |
|---|---|---|---|
| `PhoneAuthRepository` | Auth OTP mobile (rider-app) | `FirebasePhoneAuthRepository` | `KasiOtpAuthRepository` (REST Kasi) |
| `PushTokenProvider` | Récupération token FCM | `FcmPushTokenProvider` | `NtfyPushTokenProvider` |
| `ErrorReporter` | Crashlytics | `CrashlyticsErrorReporter` | `SentryErrorReporter` (self-hosted) |
| `AppIntegrityChecker` | App Check | `FirebaseAppCheckIntegrityChecker` | Supprimable si Firebase retiré |

### Ordre de migration (priorité déploiement)

1. ✅ **FAIT — déblocage démarrage** : interfaces `IDriverNotificationService` + `IRiderNotificationService` créées, services Firebase renommés `Firebase*`, `NoOpNotificationService` fourni via tokens DI. Backend démarre sans Firebase configuré. Note : `FirebaseNotificationModule.register()` doit être importé explicitement dans chaque `forFeature` NestjsQueryGraphQLModule qui injecte les tokens (contexte DI distinct).
2. ✅ **FAIT — Authentification backend** : `IPhoneAuthVerifier` créée, `FirebasePhoneAuthVerifier` + `NoOpPhoneAuthVerifier` + `AuthVerifierModule` (dynamic) créés. Duplication `AuthResolver`/`AuthService` driver-api résolue — le resolver délègue maintenant entièrement à `AuthService`. `auth().verifyIdToken` n'existe plus qu'en un seul endroit dans tout le backend (`FirebasePhoneAuthVerifier`).
3. ✅ **FAIT — Auth mobile** : `PhoneAuthRepository` abstraite créée, `FirebaseAuthRepository` → `FirebasePhoneAuthRepository`. Cascade de types mise à jour dans `login_page.dart`, `login_phone_number_bloc.dart`, `login_verify_code_bloc.dart` (rider-app).
4. ✅ **FAIT — FCM mobile** : `PushTokenProvider` + `FcmPushTokenProvider` créés dans les deux apps. `getFcmId()` supprimé de `main.dart` (driver), de `select_service_view.dart` (rider), et d'une 3e copie non répertoriée dans `service_selection_card_view.dart` (rider — code mort).
5. ✅ **FAIT — Monitoring** : `ErrorReporter` + `CrashlyticsErrorReporter` + `AppIntegrityChecker` + `FirebaseAppIntegrityChecker` créés dans les deux apps. Différence rider/driver conservée : rider inclut `appleProvider` (App Check iOS), driver non.
6. **Implémentations alternatives** : après validation équipe sur le choix des services à remplacer (ntfy/Gotify pour FCM, KasiOtp pour auth, Sentry self-hosted pour Crashlytics).

---

## 2026-07-01 — État après les 3 audits non bloqués (mobile, intégrations, devops)

Les trois chantiers non bloqués par l'absence de `libs/*` ont été menés
à leur terme (voir sections dédiées ci-dessus). Récapitulatif des
blocages réels restants, par ordre de facilité de résolution :

1. **`app-ridy/.nginx/default.conf` manquant** (bloque `apps/admin-panel`
   et `rider-app` en Docker) — le plus simple à lever, config nginx
   statique standard à écrire.
2. **`libs/client-shared` manquant** (Dart, référencé par les deux
   pubspec mobile) — bloque une partie du code partagé mobile.
3. **`libs/database`, `libs/redis`, `libs/order`, `libs/coupon`
   manquants** (Nx/TypeScript) — bloque tout build/test backend réel et
   `kasi-admin-panel`. Le plus gros morceau, contient la vraie logique
   métier (wallet, paiement, migrations).
4. **Phone-home de licence** (`apps/admin-api/.../configuration.service.ts`
   → `http://31.220.15.49:9000`) — pas un blocage technique mais un
   renoncement de principe à retirer avant tout déploiement Kasi
   (contraire à "contrôle total du matériel").

**Priorité recommandée pour la suite** : (1) et (4) sont indépendants et
rapides — peuvent être traités immédiatement. (2) et (3) nécessitent de
retrouver la source originale d'`app-ridy` (ou d'accepter une
réécriture complète de ces libs, un chantier de développement à part
entière, pas une simple récupération de fichiers).

---

## 2026-07-01 — Migration base de données : MySQL 8.0 → PostgreSQL 16 + PostGIS 3.4

**Décision** : remplacement du service MySQL 8.0 par `postgis/postgis:16-3.4` dans `app-ridy/docker-compose.yml`. Aucune donnée de production à migrer.

### Fichiers modifiés

**`app-ridy/docker-compose.yml`** :
- Service `mysql` (image `mysql:8.0`, port 3306, volume `mysql-data`) supprimé et remplacé par service `postgres` (image `postgis/postgis:16-3.4`, port 5432, volume `postgres-data`).
- Variables d'env du service postgres : `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (lues depuis `DB_NAME`, `DB_USER`, `DB_PASS`). `MYSQL_ROOT_PASSWORD` supprimé.
- Healthcheck : `pg_isready -U ... -d ...` (remplace `mysqladmin ping`). Type `CMD-SHELL` utilisé pour permettre la substitution de variables shell dans la commande.
- Les trois services NestJS (`admin-api`, `driver-api`, `rider-api`) : `DB_HOST` passe de `mysql` à `postgres`, `DB_PORT` de 3306 à 5432, références aux variables `MYSQL_DATABASE`/`MYSQL_USER`/`MYSQL_PASSWORD` remplacées par `DB_NAME`/`DB_USER`/`DB_PASS`, `DB_PASSWORD` renommé en `DB_PASS`. `depends_on: mysql` → `depends_on: postgres`.
- Volume `mysql-data` supprimé, `postgres-data` ajouté.

**`app-ridy/.env.example`** (créé) : template versionné documentant toutes les variables requises (`DB_NAME`, `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_PORT=5432`, `REDIS_*`, `JWT_SECRET`, `FIREBASE_*` vides, `GEO_PROVIDER`, `GOOGLE_MAPS_API_KEY`). Le `.gitignore` existant ignore `.env` et `.env.*` mais exclut explicitement `.env.example` via `!.env.example` — le template sera versionné sans risque.

**`app-ridy/docs/pgadmin-setup.md`** (créé) : guide de connexion pgAdmin4 à l'instance Dockerisée (host `localhost`, port 5432, credentials depuis `.env`, vérification `SELECT postgis_full_version()`, procédure de réinitialisation du volume).

### Alerte critique — Dockerfiles NestJS référencent directement `mysql`

Contrairement à l'hypothèse de la mission, les trois Dockerfiles NestJS contiennent :
```
RUN npm i mysql
```
dans leur stage de production (ligne 13 de chacun). Cette instruction installe le driver Node.js MySQL (`mysql` npm package) directement dans l'image finale. Après migration vers PostgreSQL, il faut remplacer cette ligne par `RUN npm i pg` dans les trois fichiers :
- `app-ridy/apps/admin-api/Dockerfile`
- `app-ridy/apps/driver-api/Dockerfile`
- `app-ridy/apps/rider-api/Dockerfile`

Cette modification n'a pas été effectuée ici (hors contrainte fixée par la mission), mais elle est **bloquante** : le driver MySQL sera inutile et le driver `pg` absent, TypeORM ne pourra pas se connecter à PostgreSQL à l'exécution. À traiter par `kasi-backend-services` en coordination avec la migration TypeORM (remplacement du `type: 'mysql'` par `type: 'postgres'` dans la configuration de `libs/database`).

### Justification du choix de l'image

`postgis/postgis:16-3.4` est l'image officielle Docker Hub (maintenue par l'équipe PostGIS), basée Debian, embarquant PostgreSQL 16 et PostGIS 3.4. Le script d'initialisation de l'image active automatiquement l'extension PostGIS sur la base `POSTGRES_DB` au premier démarrage — aucun script SQL d'init supplémentaire requis. Ce choix est cohérent avec les besoins géospatiaux de l'app (stockage de positions, zones de service, polygones de prix) et rend les fonctions `ST_*` disponibles nativement sans manipulation manuelle.

---

## 2026-07-02 — Clarification "libs manquantes" : libs/order, libs/redis, libs/coupon sont des ghost dirs

**Constat** : le `tsconfig.base.json` reconstruit en Phase 1 mappe :
- `@kasi/order/*` → `libs/database/src/lib/order/*`
- `@kasi/redis/*` → `libs/database/src/lib/redis/*`
- `@kasi/coupon/*` → `libs/database/src/lib/coupon/*`

Ces trois sous-dossiers de `libs/database` existent et sont peuplés :
- `libs/database/src/lib/order/` : shared-driver/rider/fleet/order/provider.service.ts, firebase-notification-service/, interfaces/, region/, google-services/
- `libs/database/src/lib/redis/` : driver-redis.service.ts, order-redis.service.ts, redis-helper.module.ts
- `libs/database/src/lib/coupon/` : common-coupon.module.ts, common-coupon.service.ts

Les répertoires `libs/order/`, `libs/redis/`, `libs/coupon/` à la racine de `libs/` sont des
**dossiers vides non référencés par aucun chemin TypeScript** — le compilateur ne les voit jamais.
Ils peuvent rester en place (ils ne gênent pas) ou être retirés, mais ils ne bloquent rien.

**Impact** : le blocage backend "libs manquantes" décrit dans les rapports précédents est levé.
La vraie vérification restante est de confirmer que `npm install` + `nx build` passent sans erreur
(en environnement Linux/Docker, pas sur Windows où nx n'est pas installé localement).

**Action** : retirer `libs/order`, `libs/redis`, `libs/coupon` de la liste des blocages actifs dans
le plan Phase 2. Déléguer la vérification de build à `kasi-backend-services` (environnement Docker).

---

## 2026-07-02 — Nouveau subagent `kasi-upgrade-tracker` + audit UPDATES.md vs code réel

**Décision** : création d'un 7e subagent, `kasi-upgrade-tracker`
(`.claude/agents/kasi-upgrade-tracker.md`), dédié au suivi du changelog
amont du template tiers Ridy (`UPDATES.md`, v2.5.6 → v3.5.0). Ce fichier
n'est pas un historique git de ce dépôt et ne peut pas être diffé
automatiquement — le subagent traduit chaque entrée en signal vérifiable
(fichier probable, terme métier, pattern de code) puis grep/lit
`app-ridy/` pour classer chaque entrée ✅ Présent / ❌ Absent / ⚠️ Partiel
/ ❓ Indéterminable, avant répartition vers le bon subagent Kasi.

**Premier audit exécuté** (21 entrées à signal concret sur les ~30 du
changelog, entrées génériques type "various fixes and improvements"
écartées faute de signal vérifiable) :

| # | Entrée | Version | Verdict | Domaine | Coût |
|---|---|---|---|---|---|
| 1 | Phone number validation | v3.4.6 | ❌ Absent — validators actuels ne vérifient que `isNotEmpty` | mobile | faible |
| 2 | Flutter 3.38.2 | v3.4.6 | ❌ Absent — `flutter: ^3.10.5` dans les deux pubspec | mobile/devops | moyen |
| 3 | Double-tap to exit | v3.4.4 | ❌ Absent — aucun `WillPopScope`/`PopScope` | mobile | faible |
| 4 | Avatar pack | v3.4.4 | ❌ Absent — un seul `UserAvatarView`, pas de pack | mobile | faible-moyen |
| 5 | swc compilation (Nx) | v3.3.0 | ❌ Absent — executor `@nx/webpack` + `compiler: tsc` | backend/devops | faible |
| 6 | Per-platform Maps config | v3.3.0 | ❌ Absent — un seul `enum MapProvider` global (Hive) | mobile | moyen |
| 7 | generic_map + MapLibre | v3.2.8 | ❌ Absent — pas de `maplibre`, pas de lib `generic_map` | mobile | élevé |
| 8 | Login OTP accessibilité | v3.2.8 | ❌ Absent — 0 `Semantics(` dans `rider-app/lib/login/**` | mobile | faible |
| 9 | Android Gradle Kotlin DSL | v3.2.6 | ❌ Absent — `build.gradle` Groovy sur les deux apps | mobile/devops | faible-moyen |
| 10 | Installation auto 1 ligne | v3.2.0 | ❌ Absent — aucun script d'install à la racine | devops | moyen |
| 11 | Cache tuiles Mapbox/OSM | v3.1.16 | ❌ Absent — `tileProvider` explicitement commenté | mobile | moyen |
| 12 | Place lookup titre+distance, miles | v3.1.12 | ⚠️ Partiel — `distanceToString()` existe (km/miles) mais jamais appelée | mobile | **faible** |
| 13 | SMS OTP Plivo/Vonage/Broadnet | v3.1.6 | ❌ Absent — OTP 100% Firebase Phone Auth, aucune abstraction SMS | backend/intégrations | moyen |
| 14 | Gift cards batch + CSV | v3.1.0 | ⚠️ Partiel — `GiftCardEntity` existe, aucun écran admin-panel ni batch/CSV | backend+admin-panel | moyen |
| 15 | Driver payout + Stripe Connect | v3.0.0/3.0.5 | ❌ Absent — 0 match "payout" dans `libs/` (désormais peuplé, confirmation définitive) | backend+intégrations | élevé |
| 16 | Save card payment method | v3.0.0 | ❌ Absent | backend+mobile+intégrations | moyen-élevé |
| 17 | Apps responsive | v3.0.0 | ⚠️ Partiel — usage ponctuel (7 occurrences `MediaQuery`/`LayoutBuilder`) | mobile | moyen-élevé |
| 18 | Driver rate rider | v3.0.0 | ❌ Absent — `FeedbackEntity` uniquement rider→driver | backend+mobile | moyen |
| 19 | Rider mark driver favorite | v3.0.0 | ❌ Absent — aucun champ favorite sur les entités | backend+mobile | moyen |
| 20 | Geo calls server-side | v2.5.9 | ✅ Présent — confirmé dans `apps/rider-api/src/app/geo/*` | — | — |
| 21 | Car capacity ride preview | v2.5.6 | ✅ Présent — `ServiceEntity.personCapacity` affiché dans `service_item_view.dart` | — | — |

**Ordre d'intégration recommandé par l'audit** (à valider par l'équipe,
non tranché unilatéralement) :
1. Item 12 (distance place lookup) — fonction déjà écrite, juste à câbler, coût quasi nul.
2. Item 5 (swc) — changement d'executor Nx, gain build immédiat, sans risque.
3. Item 9 (Gradle Kotlin DSL) — à mutualiser avec l'upgrade Flutter (item 2).
4. Item 2 (Flutter 3.10.5 → récent) — bloque indirectement plusieurs items UX (3, 6, 8) ; à planifier avant tout nouveau dev mobile.
5. Items 18/19 (notation driver→rider, favoris) — schéma ciblé, fort impact perçu.
6. Items 15/16 (Stripe Connect, carte enregistrée) — gros chantier stratégique, à arbitrer d'abord avec `kasi-integrations-auditor` (marchés/gateways cibles) avant tout code ; conditionne aussi l'item 14.
7. Items 6/7/11 (maps avancées) — à ne traiter qu'après la décision Firebase/Mapbox déjà engagée, sinon travail redondant.
8. Items 4/8/3 (avatar pack, accessibilité login, double-tap exit) — polish UX à faible coût, à grouper en fin de rebranding.

**Justification** : évite que le changelog du template d'origine reste un
document mort — chaque entrée est maintenant reliée soit à une preuve de
présence dans le code, soit à un ticket de travail explicite avec
domaine et coût, exploitable directement par `kasi-supervisor` pour la
répartition.

**Action de suivi** : `kasi-upgrade-tracker` est disponible dès la
prochaine session (créé via fichier, non enregistré à chaud dans la
session courante). Les items génériques du changelog ("various fixes
and improvements", "chore: update dependencies", ~9 entrées) restent ❓
— aucun signal vérifiable, non traités par cet audit.

---

## 2026-07-02 -- Diagnostic du blocage npm i --force (driver-api) + plan de mise a jour des dependances

### Correction dune hypothese precedente

Contrairement a ce qui etait note dans les tours precedents ("npm/nx
indisponibles sur Windows"), Node.js (v22.13.0), npm (11.0.0), Docker
Desktop (29.4.2 / Engine 29.4.2) et Flutter (3.41.6 / Dart 3.11.4) sont
bien installes sur la machine, simplement non resolus par les alias
node/npm/docker nus dans ce shell -- accessibles via leur chemin
absolu (/c/Program Files/nodejs/node.exe,
/c/Program Files/Docker/Docker/resources/bin/docker.exe,
/c/src/flutter/bin/flutter.bat). Ce tour a donc pu reproduire le
blocage reellement (local + Docker) plutot que par lecture seule.

### Ce qui a ete verifie et ecarte

- app-ridy/package.json et app-ridy/package-lock.json sont
  coherents entre eux : le lockfile (lockfileVersion 2, 3878 entrees
  resolved/integrity) reflete exactement les dependances actuelles du
  package.json racine (pg present, pas de residu mysql/mysql2 en
  dependance directe). Un npm i --force local complet a reussi
  (exit 0, added 79 packages changed 5 packages and audited 3852
  packages, ~10 min avec cache partiel preexistant).
- Aucun module natif necessitant compilation (node-gyp/binding.gyp)
  detecte dans larbre resolu jusqua profondeur 3 -- la piste toolchain
  de compilation absente sur Alpine est ecartee.
- Les noms/versions de paquets exotiques (@ingameltd/payu,
  overshom-wayforpay, sberbank-acquiring, paytm-pg-node-sdk,
  instamojo-payment-nodejs, mercadopago 1.5.17, etc.) existent bien
  sur le registre npm et se resolvent sans erreur -- ce ne sont pas des
  paquets fantomes.
- La cible @nestjs/apollo 12.0.8-next.1 (tag prerelease fige) se
  resout aussi sans erreur -- pas de blocage immediat, mais reste une
  dette technique (voir plan ci-dessous).

### Root cause confirmee par reproduction Docker reelle

Un docker build -f apps/driver-api/Dockerfile . a ete lance sur la
machine (image de base node:20.5.0-alpine, aucun cache BuildKit
preexistant pour npm). Letape RUN npm i --force :
- affiche les memes warnings ERESOLVE que le run local (peer-deps
  ngx-mapbox-gl 9.1.0 incompatible avec angular/core 16.2.1 --
  cosmetique pour driver-api qui nutilise pas Angular, mais consomme du
  temps de resolution inutile),
- ne termine jamais dans un delai raisonnable : toujours en cours
  apres environ 47 minutes, avec apparition repetee (toutes les 250 a
  280 secondes) du warning MaxListenersExceededWarning: Possible
  EventEmitter memory leak detected, 11 close listeners added to
  TLSSocket -- signature classique dun epuisement du pool de
  connexions HTTP/TLS de npm (make-fetch-happen) lorsquil doit
  resoudre/telecharger dun coup les environ 3850 paquets dun
  package.json racine monolithique depuis un conteneur Alpine a froid
  (sans cache, npm 9.x embarque dans node:20.5.0-alpine, reseau Docker
  Desktop).

Conclusion : ce nest pas un package casse, manquant ou incompatible
qui fait echouer npm i --force en Docker. Cest un probleme
structurel de performance et de fiabilite reseau : installer la
totalite du graphe de dependances (Angular 16 + NestJS 10 + une
dizaine de SDK de paiement + tooling Nx/Jest/ESLint/semantic-release)
pour construire une seule API qui nen utilise quune fraction rend
letape extremement lente et sujette a un blocage de sockets qui, en
pratique (timeout CI, plafond memoire ou temps de Docker Desktop, ou
un Ctrl+C utilisateur apres une apparence de gel), se traduit
exactement par lerreur rapportee : process /bin/sh -c npm i --force
did not complete successfully: exit code: 1.

### Facteurs aggravants identifies (a corriger independamment)

- Incoherence des installeurs entre les 3 Dockerfiles API :
  admin-api/Dockerfile utilise npm ci --legacy-peer-deps (deterministe,
  plus rapide) alors que driver-api/Dockerfile et rider-api/Dockerfile
  utilisent npm i --force (resolution complete a chaque fois, plus lent
  et plus fragile). Aucune justification technique a cette difference.
- Aucun cache BuildKit (mount type=cache, target=/root/.npm) sur les
  4 Dockerfiles Nx -- chaque build retelecharge lintegralite des
  environ 3850 paquets depuis zero, ce qui amplifie lexposition a la
  lenteur et a linstabilite reseau a chaque run CI.
- node:20.5.0-alpine est un patch fige de mi-2023 ; Node 20 approche
  la fin de sa LTS active en 2026 -- bon moment pour bumper en meme
  temps que la correction du build (mais apres, pas avant, pour isoler
  les causes en cas de nouvel echec).
- Aucun champ engines dans package.json pour garantir la version
  Node/npm utilisee.
- npm audit local (sur les 3852 paquets) rapporte 259 vulnerabilites
  (17 low, 90 moderate, 140 high, 12 critical) -- non bloquant pour le
  build mais a traiter dans la Phase 1 du plan ci-dessous.

### Plan daction, deblocage immediat (Phase 0, avant tout audit)

A deleguer a kasi-devops-infra :
1. Ajouter un mount de cache BuildKit pour /root/.npm sur letape
   RUN npm i des 4 Dockerfiles (admin-api, driver-api, rider-api,
   admin-panel).
2. Remplacer RUN npm i --force par RUN npm ci --legacy-peer-deps dans
   driver-api/Dockerfile et rider-api/Dockerfile (aligner sur
   admin-api) -- plus rapide (pas de resolution, juste lecture du
   lockfile) et deterministe.
3. Ne pas toucher aux versions de package.json dans cette phase --
   objectif unique : rendre le build reproductible et rapide avec les
   dependances actuelles, avant dentamer la mise a jour proprement
   dite.

### Plan de mise a jour des dependances (Phases 1 a 4, apres deblocage)

Phase 1, bas risque / fondations (kasi-backend-services et
kasi-devops-infra) :
- node:20.5.0-alpine vers LTS Node courant (22 ou plus recent) sur les
  4 Dockerfiles, une fois Phase 0 validee.
- npm audit fix (corrections non-breaking uniquement) pour reduire les
  259 vulnerabilites.
- Ajouter un champ engines a package.json.
- Sortir @nestjs/apollo du tag prerelease 12.0.8-next.1 vers une
  version stable publiee.

Phase 2, majeurs framework, risque plus eleve :
- kasi-backend-services : NestJS 10.1.3 vers 11.x (chantier chiffre a
  part, coordination avec les paquets ptc-org/nestjs-query,
  nestjs/graphql, typeorm pour compat), TypeORM maintenu sur 0.3.x
  (dernier patch).
- kasi-admin-panel : resoudre dabord le conflit peer-dep
  ngx-mapbox-gl 9.0.0 (attend Angular 14 ou 15) avant de bumper Angular
  16 vers 18+, pour ne pas empiler deux incompatibilites masquees par
  --force.

Phase 3, mobile (kasi-mobile-apps, driver-app ET rider-app
identiquement, conformement a la regle du superviseur) :
- Flutter 3.10.5 / Dart 3.0.5 vers une version stable recente (Flutter
  3.41.6 / Dart 3.11.x deja disponibles sur la machine de build).
- Gradle 7.3.3 vers 8.x, Kotlin 1.8.0 vers plus recent, AGP a bumper --
  et corriger au passage la divergence deja detectee : AGP 7.1.3
  (driver-app) contre 7.1.2 (rider-app), meme mineur mais incoherent
  entre les deux apps.
- Revalider graphql_flutter 5.1.3 (deja decide) apres le bump Flutter.

Phase 4, differe / conditionnel :
- SDK de paiement (stripe, paypal, razorpay, paystack, flutterwave,
  etc.) : aucune mise a jour de version tant que
  kasi-integrations-auditor na pas statue sur le perimetre marches et
  gateways (deja en attente, voir audit integrations du 2026-07-01).
- SDK Firebase : abstraction en cours (6 interfaces sur 7 faites) -- ne
  pas bumper les versions Firebase avant la fin de ce chantier, pour ne
  pas deplacer une cible deja en cours de remplacement.

### Table de delegation

| Ordre | Subagent | Tache | Depend de |
|---|---|---|---|
| 1 | kasi-devops-infra | Phase 0 : cache BuildKit + npm ci --legacy-peer-deps sur driver-api et rider-api (aligner sur admin-api) | rien, priorite immediate |
| 2 | kasi-backend-services | Phase 1 : bump Node dans les 4 Dockerfiles, npm audit fix, champ engines, sortir nestjs/apollo du tag next.1 | 1 |
| 3 | kasi-admin-panel | Phase 2 : resoudre le conflit ngx-mapbox-gl / Angular avant de planifier Angular 16 vers 18+ | 1 |
| 4 | kasi-backend-services | Phase 2 : chiffrer et planifier NestJS 10 vers 11 | 1 et 2 |
| 5 | kasi-mobile-apps | Phase 3 : bump Flutter, Dart, Gradle, Kotlin, AGP sur driver-app ET rider-app, corriger divergence AGP 7.1.2 / 7.1.3 | independant, peut demarrer en parallele de 1 a 4 |
| 6 | kasi-integrations-auditor | Statuer marches et gateways de paiement (prealable Phase 4) et finaliser interface Firebase numero 7 | en parallele |
| 7 | kasi-upgrade-tracker | Reevaluer apres Phase 3 les entrees UPDATES.md dependantes de versions Flutter/Gradle plus recentes (items 2, 6, 7, 9, 11 de laudit du 2026-07-02) | 5 |
| 8 | kasi-supervisor | Relancer kasi_stack_audit.py apres Phase 0 et 1, comparer au dernier rapport, arbitrer tout conflit Angular/mapbox ou NestJS/apollo remonte par 3 et 4 | apres 1 et 2 |

Point ouvert signale en marge (hors perimetre de ce tour, a traiter
par kasi-mobile-apps) : app-ridy/libs/client-shared est constate
peuple (41 entrees) lors de ce tour, alors que les decisions
precedentes (2026-07-01) le donnaient comme absent -- derive positive a
confirmer et documenter par kasi-mobile-apps a sa prochaine
intervention.

Justification globale : la reproduction reelle (local et Docker)
plutot que la seule lecture de fichiers a permis decarter la piste
dependance cassee (fausse piste plausible a priori vu les noms de
paquets inhabituels) et didentifier la vraie cause -- un design de
workspace Nx a package.json unique et non mis en cache, qui rend
chaque build Docker couteux et fragile independamment de la validite
des dependances elles-memes. Corriger dabord la Phase 0 (rapide, sans
risque) avant dentamer la mise a jour proprement dite evite de
melanger deux categories de problemes dans un meme diagnostic si un
nouvel echec survient.

---

## 2026-07-02 -- Phase 0 executee : cache BuildKit + npm ci sur les 4 Dockerfiles Nx (kasi-devops-infra)

### Perimetre

Execution stricte de la Phase 0 deleguee par kasi-supervisor dans
lentree precedente (diagnostic du blocage `npm i --force`). Aucune
version de `package.json` touchee, aucune image de base Node changee --
conformement au perimetre impose (Phase 1 et suivantes restent hors
scope de ce tour).

### Fichiers modifies

**`app-ridy/apps/admin-api/Dockerfile`**
- Ajout de `# syntax=docker/dockerfile:1` en tete de fichier (necessaire
  pour activer la syntaxe `RUN --mount=type=cache`).
- `RUN npm ci --legacy-peer-deps` (stage build) -> `RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps`.
- `RUN npm i --legacy-peer-deps` (stage final) -> `RUN --mount=type=cache,target=/root/.npm npm i --legacy-peer-deps`.
- `RUN npm i pg` (stage final) -> `RUN --mount=type=cache,target=/root/.npm npm i pg`.
- Installeur deja aligne (`npm ci --legacy-peer-deps`) -- aucun
  changement dinstalleur necessaire ici, seul le cache a ete ajoute.

**`app-ridy/apps/driver-api/Dockerfile`**
- Ajout de `# syntax=docker/dockerfile:1`.
- Stage build : `RUN npm i --force` -> `RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps` (alignement sur admin-api).
- Stage final : `RUN npm i --force` -> `RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps`.
- Stage final : `RUN npm i pg` -> `RUN --mount=type=cache,target=/root/.npm npm i pg`.

**`app-ridy/apps/rider-api/Dockerfile`**
- Memes 4 changements que driver-api (syntax header, 2x `npm i --force` ->
  `npm ci --legacy-peer-deps` avec cache, `npm i pg` avec cache).

**`app-ridy/apps/admin-panel/Dockerfile`**
- Ajout de `# syntax=docker/dockerfile:1`.
- `RUN npm i --force` (seule etape npm du fichier) -> `RUN --mount=type=cache,target=/root/.npm npm i --force`.
- Installeur volontairement laisse en `npm i --force` (hors perimetre
  Phase 0 pour admin-panel, tel quindique par kasi-supervisor) -- seul
  le cache BuildKit a ete ajoute.

### Validation -- reproduction Docker reelle

`docker build -f apps/driver-api/Dockerfile .` relance depuis
`app-ridy/` avec `DOCKER_BUILDKIT=1`. Constat a environ 500 secondes
dexecution de letape `npm ci --legacy-peer-deps` (premier run, aucun
cache BuildKit preexistant -- normal que ce soit long la premiere fois,
les runs suivants reutiliseront le cache `/root/.npm`) :
- Des paquets distincts sinstallent en continu (uuid, apollo-server-
  plugin-landing-page-graphql-playground, etc.), avec des timestamps qui
  progressent regulierement toutes les 10-30 secondes.
- Contraste net avec le blocage precedent (voir entree diagnostic
  ci-dessus) : la, apres environ 250-280 secondes, seul le warning
  `MaxListenersExceededWarning` se repetait en boucle sans aucune autre
  activite visible pendant 47 minutes avant lechec. Ici, le meme warning
  apparait mais **du nouveau contenu (paquets, deprecations) continue
  detre logue apres**, signe que linstallation progresse reellement et
  ne semble pas bloquee.
- Le run navait pas atteint la fin du telechargement/install au moment
  de la redaction de cette entree (contrainte de duree de session) --
  progression confirmee, completion totale non observee dans ce tour.
  A reverifier par un prochain build (qui, avec le cache BuildKit desormais
  peuple, devrait etre nettement plus rapide) avant de cloturer
  definitivement le point.

### Confirmation du perimetre

- Aucun `package.json` modifie.
- Aucune version de dependance modifiee.
- Aucune image de base (`node:20.5.0-alpine`, `nginx:1.25.1-alpine`)
  changee.
- Limite strictement a : ajout de `# syntax=docker/dockerfile:1`, ajout
  de mounts de cache BuildKit `/root/.npm`, et remplacement de
  `npm i --force` par `npm ci --legacy-peer-deps` dans driver-api et
  rider-api uniquement (admin-panel non touche sur ce point, conformement
  aux instructions).

**Action de suivi** : relancer un `docker build` complet sur driver-api
et rider-api (cache desormais chaud) pour confirmer un temps de build
nettement reduit, et enchainer sur la Phase 1 (bump Node, `npm audit
fix`, champ `engines`, sortie du tag `@nestjs/apollo` prerelease) une
fois cette confirmation obtenue.

---

## 2026-07-02 -- Correction du tour precedent : stage final driver-api/rider-api revert vers `npm i` (pas `npm ci`)

**Constat (revue manuelle post-execution)** : le tour precedent a
remplace `npm i --force` par `npm ci --legacy-peer-deps` **dans les deux
stages** de `driver-api/Dockerfile` et `rider-api/Dockerfile`, y compris
le stage final. Or le stage final ne copie que
`dist/apps/<app>/package.json` (genere par `nx build`), **sans
`package-lock.json`** -- `npm ci` exige la presence d'un lockfile
correspondant et echoue immediatement sans lui (`npm ci` : "can only
install packages when your package.json and package-lock.json ... are
in sync"). `admin-api/Dockerfile`, pris comme reference d'alignement,
utilise deliberement `npm i --legacy-peer-deps` (pas `npm ci`) sur son
stage final, precisement pour cette raison -- le tour precedent a copie
lalignement du stage build mais pas remarque cette difference
intentionnelle sur le stage final.

**Correction appliquee** : stage final de `driver-api/Dockerfile` et
`rider-api/Dockerfile`, `npm ci --legacy-peer-deps` -> `npm i
--legacy-peer-deps` (le mount de cache BuildKit est conserve). Le stage
build reste sur `npm ci --legacy-peer-deps` (lockfile bien present a cet
endroit via le `COPY ./package-lock.json` de la racine).

**Justification** : evite un nouveau blocage de build, cette fois
immediat et deterministe (`npm ci` echoue en quelques secondes sans
lockfile, contrairement au blocage lent de `npm i --force` observe
initialement) plutot qu'un vrai deblocage. Point de vigilance a
transmettre aux prochains tours : ne jamais generaliser un remplacement
`npm i` -> `npm ci` sans verifier au cas par cas la presence effective
d'un `package-lock.json` dans le contexte de build de chaque stage.

---

## 2026-07-02 -- Phase 0 confirmee : `docker build` de `driver-api` reussit

**Constat (rapporte par l'utilisateur)** : l'image `kasi-driver-api`
buildee avec succes depuis `app-ridy/`
(`docker build -f apps/driver-api/Dockerfile -t kasi-driver-api .`).
Letape `npm ci --legacy-peer-deps` (stage build) a mis plus dune heure
sur ce run precis avant daboutir -- duree anormalement longue pour un
`npm ci` (lecture directe du lockfile, aucune resolution), probablement
due au cache BuildKit `/root/.npm` encore froid sur cette machine
combine a une latence reseau ponctuelle (Docker Desktop / WSL2), mais
**pas un blocage permanent** comme lechec initial (`npm i --force`, qui
lui necho jamais apres 47 minutes). Diagnostic reseau approfondi non
effectue (build termine avant), a garder en tete si un nouveau run
lent/bloquant survient.

**Statut Phase 0** : deblocage confirme pour `driver-api`. Reste a
valider `rider-api` et `admin-panel` (meme correctif applique, non
encore confirmes par un build reussi individuel).

**Prochaine etape** : Phase 1 (bump Node LTS sur les 4 Dockerfiles,
`npm audit fix`, champ `engines`, sortie du tag prerelease
`@nestjs/apollo`), a deleguer a `kasi-backend-services` /
`kasi-devops-infra` conformement a la table de delegation.

---

## 2026-07-03 -- Constat hors-cycle : Phase 1 deja executee sans entree de journal + point suspect admin-api/Dockerfile

**Contexte** : releve fait en lecture seule pendant que l'utilisateur
lancait lui-meme la validation des builds Docker `rider-api` et
`admin-panel` (suite de la Phase 0 ci-dessus). Aucune commande Docker
executee par le superviseur dans ce tour pour ne pas concurrencer les
builds en cours.

**Constat 1 — Phase 1 deja appliquee, sans decision journalisee** :
- Les 4 Dockerfiles (`admin-api`, `driver-api`, `rider-api`,
  `admin-panel`) sont maintenant sur `node:20.20.2-alpine`, alors que
  l'entree precedente de ce journal les decrivait encore sur
  `node:20.5.0-alpine`.
- `app-ridy/package.json` contient desormais un champ `engines` :
  `"node": ">=20.20.2 <21.0.0"`, `"npm": ">=10.8.2"` (absent au moment
  du diagnostic du 2026-07-02).
- `@nestjs/apollo` est sorti du tag prerelease : `^12.0.9` (au lieu de
  `12.0.8-next.1` note precedemment comme dette technique).
- `npm audit fix` (259 vulnerabilites relevees le 2026-07-02) : statut
  non verifie dans ce tour (aurait necessite `npm audit`, ecarte pour
  ne pas concurrencer les builds Docker en cours sur la meme machine).

**Decision** : traiter la Phase 1 (bump Node, champ `engines`, sortie
`@nestjs/apollo` du prerelease) comme **faite** dans la table de
delegation du 2026-07-02 — la personne ayant applique ce changement
n'a pas laisse de trace ecrite ici, mais le code fait foi. Reste
ouvert : confirmation du statut `npm audit fix`.

**Constat 2 — `admin-api/Dockerfile` ligne 13, avale les echecs de
build** :
```
RUN npx nx build admin-api --prod --skip-nx-cache 2>&1 || true
```
Le `|| true` fait reussir l'etape Docker meme si `nx build admin-api`
echoue reellement. Consequence : un echec de compilation ne stoppe pas
le build de l'image — il se manifeste seulement plus tard (`COPY
--from=build` avec un `dist/` absent ou perime), ou pas du tout si un
`dist/` d'un build precedent traine encore dans le contexte. Combine a
`NODE_OPTIONS="--max-old-space-size=4096"` et `NX_PARALLEL=1` juste
au-dessus, ce `|| true` a manifestement ete ajoute comme contournement
temporaire d'un probleme de memoire/parallelisme sur `nx build
admin-api` — pas documente dans ce journal, cause racine non
confirmee.

**Action de suivi (non executee, juste consignee)** : une fois les
builds `rider-api`/`admin-panel` en cours valides par l'utilisateur,
verifier si `admin-api` build reellement sans erreur sans le `|| true`
(le retirer temporairement pour un run de diagnostic) avant de le
considerer comme un correctif permanent acceptable ou comme une dette
a lever. Ne pas le retirer a chaud pendant que d'autres builds tournent
sur la meme machine.

**Justification** : evite que ces deux constats (l'un positif — Phase 1
en avance sur le plan — l'autre un risque silencieux) restent invisibles
pour la suite du suivi `kasi-supervisor`/`kasi-backend-services`, sans
interferer avec les builds Docker en cours au moment de la redaction.

---

## 2026-07-03 -- Phase 0 cloturee pour rider-api/driver-api/admin-panel (admin-api non confirme)

**Constat (rapporte par l'utilisateur)** : les builds Docker de
`rider-api`, `driver-api` et `admin-panel` sont passes avec succes.
Cloture le point ouvert laisse par l'entree "Phase 0 confirmee" du
2026-07-02 (qui ne validait alors que `driver-api` seul).

**Point non couvert, signale explicitement** : `admin-api` n'est pas
mentionne dans cette confirmation. Or l'entree precedente (2026-07-03,
"Constat hors-cycle") documente que `apps/admin-api/Dockerfile` contient
`RUN npx nx build admin-api --prod --skip-nx-cache 2>&1 || true` -- ce
`|| true` fait reussir l'etape Docker meme si `nx build admin-api` echoue
reellement. Consequence : si `admin-api` est teste tel quel, un succes
apparent ne garantit pas que le build Nx sous-jacent a reellement abouti.

**Action de suivi (non executee)** : avant de considerer la Phase 0
entierement close, tester `admin-api` avec le `|| true` temporairement
retire pour confirmer que `nx build admin-api --prod` reussit reellement
(pas seulement que l'image Docker se termine). A faire quand aucun autre
build Docker ne tourne en parallele sur la meme machine (cf. consigne du
2026-07-03 precedent).

**Justification** : eviter de marquer la Phase 0 comme "100% validee"
sur la seule base d'un signal (succes Docker) rendu non fiable par un
contournement deja identifie dans ce meme journal.

---

## 2026-07-03 -- admin-api : `|| true` retire definitivement, deux bugs reels trouves et corriges, build confirme

**Decision utilisateur** : garder le build strict (sans `|| true`) plutot
que de le restaurer, et investiguer d'abord la piste Postgres avant de
toucher au chemin des migrations (cf. entree precedente).

**Investigation Postgres (agent Explore, en lecture seule)** : confirme
que la migration MySQL -> PostgreSQL 16 + PostGIS 3.4 est **deja
executee et documentee** (entree du 2026-07-01, "Migration MySQL ->
PostgreSQL + PostGIS"). `libs/database/src/lib/database.module.ts` est
en dur sur `type: 'postgres'`, `package.json` racine n'a plus de residu
`mysql`/`mysql2`, `docker-compose.yml` definit un service
`postgis/postgis:16-3.4`. Le `npm i pg` du Dockerfile n'est donc **pas**
orphelin : c'est la queue de cette migration deja actee. Seul reste en
retard le dossier `libs/database/src/lib/migration/` (toujours nomme
`mysql-archive/`, jamais porte vers Postgres) et le build target
`admin-api` qui pointait a cote.

**Deux bugs reels confirmes par build de diagnostic (`|| true` retire) :**

1. `apps/admin-api/project.json`, cible `build` : la commande
   `tsc libs/database/src/lib/migration/*.ts --outDir
   dist/apps/admin-api/migration` echouait (`TS6053: File ... not
   found`) car les 32 fichiers de migration reels vivent un niveau plus
   bas, sous `migration/mysql-archive/`. **Corrige** : chemin change en
   `libs/database/src/lib/migration/mysql-archive/*.ts` (decision
   utilisateur : pointer vers `mysql-archive`, ces migrations restent
   copiees dans `dist/` comme historique/reference, elles ne s'executent
   pas contre Postgres).
2. Meme commande, deuxieme echec une fois le chemin corrige : un `tsc`
   nu (sans `tsconfig.json`) embarque par defaut **tous** les paquets de
   `node_modules/@types/**` dans le programme de compilation, dont deux
   incompatibles avec les versions installees
   (`@types/mapbox__mapbox-gl-draw` vs `mapbox-gl` reel, et un conflit
   `Buffer` generique dans `pg-protocol`) -- sans lien avec les fichiers
   de migration eux-memes. **Corrige** : ajout de `--skipLibCheck` a la
   commande.

**Verification finale** : `docker build -f apps/admin-api/Dockerfile -t
kasi-admin-api-diag .` termine avec succes de bout en bout (webpack
compile + tsc migration + image finale), `|| true` toujours absent de
`apps/admin-api/Dockerfile` ligne 13. Image de diagnostic supprimee
apres verification (`docker rmi kasi-admin-api-diag`).

**Statut Phase 0** : desormais close pour les 4 services
(`admin-api`, `driver-api`, `rider-api`, `admin-panel`) avec un signal
fiable (plus de `|| true` masquant les echecs) sur `admin-api`.

**Justification** : corriger la cause reelle (chemin + typage) plutot
que de restaurer un contournement qui aurait laisse ces deux bugs
invisibles indefiniment ; consigner la preuve Postgres pour eviter de
rejouer cette investigation si le sujet ressort.

---

## 2026-07-03 -- Confirmation : `libs/client-shared` est bien peuple (cloture du point ouvert du 2026-07-02)

**Contexte** : verification en lecture seule (listing non recursif,
pour ne pas concurrencer en I/O les builds Docker `rider-api`/
`admin-panel` lances par l'utilisateur en parallele de ce tour — un
premier `Glob` recursif a d'ailleurs timeout apres 20s, signe direct de
cette contention, d'ou le choix d'un listing par repertoire).

**Constat** : `app-ridy/libs/client-shared/` contient un vrai module
Flutter/Dart complet : `pubspec.yaml` (`name: client_shared`, `version:
1.0.1+2`, dependances `flutter_map`, `google_fonts`, `latlong2`, etc.),
`pubspec.lock`, `.metadata`, `README.md`, dossiers `lib/` (26 fichiers
Dart : `components/`, `theme/`, `wallet/`, `config.dart`,
`map_providers.dart`, `unit_of_measurement.dart`) et `test/`. Dates de
fichiers au 8 septembre 2023 pour les fichiers de metadonnees (coherent
avec une extraction d'origine, pas une fabrication recente) et au 2
juillet 2026 pour `pubspec.yaml`/`lib/` (dernieres modifications de
session). Le nom du package (`client_shared`) correspond exactement a
la dependance `client_shared: path: ../../libs/client-shared` citee
dans les deux pubspec mobile (audit du 2026-07-01).

**Decision** : cloturer le point ouvert du 2026-07-02 ("derive positive
a confirmer"). `libs/client-shared` n'est plus dans la liste des libs
manquantes — seul reste a verifier, lors d'une prochaine intervention
de `kasi-mobile-apps`, que le contenu correspond fonctionnellement (pas
seulement en presence de fichiers) a ce qu'attendent driver-app et
rider-app (imports, widgets utilises).

**Justification** : evite de laisser trainer un point ouvert deja
resolu dans les faits, et documente la methode (listing non recursif)
a reutiliser si d'autres verifications read-only sont necessaires
pendant que des builds Docker tournent en parallele sur la meme
machine.

---

## 2026-07-03 -- Projet Firebase Kasi cree et configs deployees (kasi-v1) + trou de `.gitignore` corrige

**Contexte** : execute par l'utilisateur en parallele des builds Docker
`rider-api`/`admin-panel` en cours (Phase 0). Point souleve par
`kasi-supervisor` en amont (voir audit mobile du 2026-07-01 :
`GoogleService-Info.plist` vide/0 octet, aucun `google-services.json`,
aucun `project_id` exploitable) -- desormais leve.

**Constat** : nouveau projet Firebase `kasi-v1` cree, avec deux
applications enregistrees correspondant exactement aux bundle
ID/package name deja presents dans le code (verifie par grep, pas
suppose) :
- `driver-app` : `com.kasi.taxi.driver` (Android + iOS, identique dans
  `build.gradle` et `project.pbxproj`)
- `rider-app` : `com.kasi.taxi.rider` (idem)

**Fichiers places par l'utilisateur** (verifie present + non vide) :
- `app-ridy/driver-app/android/app/google-services.json` (664 o)
- `app-ridy/rider-app/android/app/google-services.json` (1131 o --
  contient les entrees client driver ET rider, comportement normal du
  plugin Google Services qui liste toutes les apps Android du projet)
- `app-ridy/driver-app/ios/Runner/GoogleService-Info.plist` (866 o)
- `app-ridy/rider-app/ios/Runner/GoogleService-Info.plist` (865 o)

Ces 4 emplacements sont bien couverts par `app-ridy/.gitignore`
(`google-services.json`, `GoogleService-Info.plist` -- decision du
2026-07-01) : confirme non trackes par `git status` cible.

Copies de reference egalement deposees dans
`Kasi-ressources/firebase/Driver/` et `Kasi-ressources/firebase/Rider/`
(nouvelle organisation -- remplace l'ancienne convention de nommage
`client-ios`/`kasiman-ios`/`client-android`/`kasiman-android` utilisee
lors du premier depot de ressources).

**Trou de securite identifie et corrige** : contrairement a
`app-ridy/.gitignore`, le `.gitignore` **racine** du depot (qui couvre
`Kasi-ressources/`) ne filtrait que `.env`/`*.env` -- aucune regle pour
`google-services.json`/`GoogleService-Info.plist`. Consequence
verifiee : avant correction, `Kasi-ressources/firebase/Driver/` et
`Kasi-ressources/firebase/Rider/` (contenant les vraies cles du projet
`kasi-v1`) apparaissaient en `??` (untracked, prets a etre inclus dans
un futur `git add -A`) dans `git status`. **Correction appliquee** :
ajout au `.gitignore` racine de `google-services.json`,
`GoogleService-Info.plist`, `service-account*.json`,
`firebase-adminsdk*.json` (memes patterns que `app-ridy/.gitignore`).
Verifie apres coup : `git status` sur `Kasi-ressources/firebase/` ne
remonte plus `Driver/`/`Rider/`.

**Point non corrige, signale a l'utilisateur** : les 4 anciens fichiers
placeholder (`GoogleService-Info(client-ios).plist`,
`GoogleService-Info(kasiman-ios).plist`,
`google-services(client-android.json`,
`google-services(kasiman-android).json`) restent en statut `AD` dans
l'index git (Ajoutes puis supprimes du disque, mais **jamais
re-stages**) -- un commit en l'etat inclurait ces 4 fichiers vides
d'origine sous leurs anciens noms (le contenu vient de l'index, pas du
disque). A nettoyer avec `git add -u` (ou `git rm --cached` cible)
avant le premier commit du depot, qui n'a **toujours aucun commit**
(`git log` -> "does not have any commits yet"). Non fait ici : touche
directement l'etat qui sera commit, action laissee a la decision
explicite de l'utilisateur.

**Justification** : le depot n'ayant jamais ete commit, ce trou de
`.gitignore` n'a encore fuite aucun secret dans un historique git --
mais aurait committe des cles Firebase reelles (projet `kasi-v1`) des
le premier commit si non corrige maintenant. Corriger avant plutot
qu'apres est strictement moins cher (pas de purge d'historique
necessaire).

**Action de suivi** : demander a l'utilisateur de resoudre l'etat `AD`
des 4 anciens fichiers (`git add -u` typiquement) avant de proceder au
premier commit du depot.

---

## 2026-07-03 -- Exclusion des fichiers de travail personnels du depot git (decision utilisateur)

**Decision utilisateur** : tout ce qui n'est utile qu'a l'utilisateur
(pas au produit Kasi livrable) est exclu du depot git : `.extraction/`,
`mémoire/` (sources PDF des memoires academiques), `.agents/`
(repertoire racine vide, distinct de `.claude/agents/`), `.claude/`
(config Claude Code + definitions des subagents kasi-*), et tous les
fichiers `.md`/`.py` **a la racine du depot uniquement**
(`KASI_DECISIONS.md`, `UPDATES.md`, `kasi_stack_report*.md`,
`kasi_stack_audit.py`). `Kasi-ressources/` etait deja exclu par
l'utilisateur juste avant cette decision.

**Execution** :
- `.gitignore` racine : ajout de `.extraction/`, `mémoire/`, `.agents/`,
  `.claude/`, `/*.md` et `/*.py` (les deux derniers **ancres a la
  racine** via le `/` initial -- ne touchent pas les `.md`/`.py` a
  l'interieur d'`app-ridy/`, qui restent trackes).
- Desindexation (`git rm -r --cached`) des fichiers deja stages sous
  ces chemins.
- **Erreur intermediaire corrigee dans ce meme tour** : le premier
  passage de `git rm --cached -- "*.md" "*.py"` utilisait un pathspec
  non ancre, qui a desindexe par erreur des `.md`/`.py` **legitimes**
  d'`app-ridy/` (`SECRETS.md`, `ssl-placeholder.md`, les `README.md` de
  `driver-app`/`rider-app`/`libs/*`, `flutter_lldb_helper.py`). Corrige
  immediatement par un `git add` cible sur exactement ces 10 fichiers,
  verifie par `git status --porcelain` que plus aucun `.md`/`.py`
  hors-racine n'est affecte.

**Consequence pratique** : `KASI_DECISIONS.md` lui-meme n'est desormais
plus versionne. Il continue neanmoins de servir de journal de decisions
local pour le suivi `kasi-supervisor`/subagents (source de verite pour
cette session et les suivantes qui liront ce fichier sur disque), il
n'est simplement plus pousse vers un depot git partage.

**Point non affecte** : les 4 anciens fichiers Firebase placeholder
toujours en statut `AD` (voir entree precedente) -- reste a la charge
de l'utilisateur, hors perimetre de cette decision.

**Justification** : separation explicite voulue par l'utilisateur entre
fichiers de travail/recherche personnels (memoires academiques source,
extraction texte, outillage multi-agent Claude Code, rapports d'audit
locaux) et le code produit Kasi destine a etre partage/deploye.

---

## 2026-07-03 -- Suite devops/infra : GHCR confirme (pas de registre auto-heberge pour l'instant), deux bugs pipeline corriges

**Decisions utilisateur** : (1) garder GHCR comme registre d'images pour
l'instant -- le passage a un registre auto-heberge (Harbor ou Docker
Registry) reste possible plus tard mais n'est pas priorise maintenant ;
(2) aucun serveur de prod n'est encore provisionne (`DEPLOY_HOST`/
`DEPLOY_USER`/`DEPLOY_SSH_KEY` ne sont pas encore des secrets reels) --
seul le CI (lint/test/build) est testable en l'etat, pas le deploy SSH.

**Etat constate avant correction** : `docker-compose.yml`,
`.nginx/default.conf`, `ci.yml`, `deploy.yml`, `.env.example` et
`SECRETS.md` existaient deja et etaient substantiels (Postgres+PostGIS,
Redis, reverse-proxy nginx CORS/WS, pipeline lint->test->build->push
GHCR->deploy SSH) -- pas documentes par une entree de journal dediee
jusqu'ici.

**Deux bugs reels trouves et corriges dans ce pipeline deja en place :**

1. `admin-panel` absent de la matrice `build-images` de
   `.github/workflows/deploy.yml` -- seuls `admin-api`/`driver-api`/
   `rider-api` etaient buildes et pousses vers GHCR. **Corrige** : entree
   `admin-panel` / `apps/admin-panel/Dockerfile` ajoutee a la matrice.
2. `docker-compose.yml` n'avait aucun champ `image:` pour les 4 services
   applicatifs (seulement `build:`) -- `deploy.yml` fait
   `docker compose pull` sur le serveur, qui echouerait faute de
   reference d'image de registre. **Corrige** : ajout de
   `image: ${IMAGE_REGISTRY:-kasi-local}/<service>:${IMAGE_TAG:-latest}`
   sur `admin-api`, `driver-api`, `rider-api`, `admin-panel` (coexiste
   avec `build:` -- `up --build` reste utilisable en dev local sans
   toucher a `IMAGE_REGISTRY`). `IMAGE_REGISTRY`/`IMAGE_TAG` documentes
   dans `.env.example` (defaut vide -> `kasi-local`, build 100% local) et
   `SECRETS.md` (valeur attendue en prod : `ghcr.io/<owner>/<repo>`,
   identique aux tags pousses par `deploy.yml`).

**Nettoyage mineur associe** : suppression de l'attribut `version: "3.9"`
en tete de `docker-compose.yml`, marque obsolete par
`docker compose config` (warning, pas une erreur) -- `docker compose
config --quiet` confirme une config valide sans avertissement apres
retrait.

**Verification** : `docker compose config --quiet` execute avec succes
apres les deux corrections (aucune commande de build/deploy reelle
lancee, aucun serveur cible n'existe encore pour la tester).

**Justification** : ces deux bugs auraient silencieusement casse le
premier vrai deploiement (image absente du serveur pour admin-panel,
`pull` en echec pour les 3 autres) -- preferable de les detecter
maintenant, en lecture de code, plutot qu'au moment du premier deploy
reel une fois un serveur provisionne.

**Action de suivi** : quand un serveur de prod sera disponible,
configurer les 3 secrets GitHub (`DEPLOY_HOST`/`DEPLOY_USER`/
`DEPLOY_SSH_KEY`) et `IMAGE_REGISTRY` dans `/opt/kasi/.env` avant le
premier `docker compose pull` reel.

---

## 2026-07-03 -- Premier `docker compose up --build` local : stack complete demarree, 7 bugs reels caches decouverts et corriges

**Contexte** : premier lancement reel de toute la stack en local
(`docker compose up --build`), en attendant l'achat d'un VPS Hostinger
par l'utilisateur (decision : preparer/valider le fonctionnement local
d'abord). Les 4 images backend/frontend buildaient deja avec succes
(cf. entree precedente sur `admin-api`), mais **aucun des 7 conteneurs
applicatifs n'avait encore ete demarre ensemble** -- cette entree
documente tout ce que ce premier run reel a revele, invisible tant que
seul `docker build` avait ete teste.

**Methode** : `docker compose up -d`, puis diagnostic iteratif --
`docker inspect --format RestartCount` pour detecter les crash-loops,
`docker stats` pour detecter les boucles CPU silencieuses (process
"running" sans crash mais qui tourne a 100%+ sans jamais aboutir),
`docker logs` pour la cause racine. Chaque correctif a ete suivi d'un
rebuild cible (`docker compose build <service>`) et d'un redemarrage
avant de passer au suivant -- plusieurs couches d'erreurs etaient
empilees (corriger la premiere revelait la suivante).

**Bugs reels trouves et corriges (par ordre de decouverte)** :

1. **`FirebaseNotificationModule.register()` async casse
   `NestjsQueryGraphQLModule.forFeature()`** (`driver-api`/`rider-api`,
   crash immediat au boot) -- methode `async` retournant une
   `Promise<DynamicModule>`, correctement geree quand importee au niveau
   racine d'un `@Module`, mais `forFeature()` de
   `@ptc-org/nestjs-query-graphql` ne l'attend pas quand elle est
   imbriquee dans son propre `imports:` (`chat.module.ts`,
   `order.module.ts` de rider-api) -- fuite d'une Promise non resolue
   dans les `exports` generes, erreur "Nest cannot export a
   provider/module ... exported [object Promise]". **Corrige** :
   `libs/database/src/lib/order/firebase-notification-service/firebase-notification-service.module.ts`
   rendu synchrone (`readFileSync` au lieu de `fs.promises.readFile`,
   suppression de `async`/`Promise<DynamicModule>`) -- aucun appelant
   n'utilisait `await` dessus, donc correctif sans impact sur les sites
   d'appel.

2. **Colonnes TypeORM MySQL-only non portees vers Postgres** (echec
   `DataSource.initialize()`, `DataTypeNotSupportedError`) -- residus de
   la migration MySQL -> PostgreSQL du 2026-07-01 (cf. entree
   correspondante), jamais recompiles reellement avant ce premier run.
   Trouves et corriges dans `libs/database/src/lib/entities/` :
   - `'set'` (MySQL multi-valeurs) -> `{ type: 'enum', enum: X, array:
     true }` (tableau natif Postgres) : `announcement.entity.ts`
     (`userType`), `operator-role.entity.ts` (`permissions`),
     `operator.entity.ts` (`enabledNotifications`).
   - `'tinyint'` -> `'smallint'` (deja la convention etablie ailleurs
     dans le meme fichier, ex. `driver.entity.ts:107`) :
     `feedback.entity.ts`, `fleet.entity.ts`, `service.entity.ts` (x2),
     `request.entity.ts`, `driver.entity.ts`, `coupon.entity.ts`.
   - `'longtext'` -> `'text'` : `media.entity.ts` (`base64`).
   - Deux passes necessaires : la premiere recherche (guillemets
     simples `@Column('...'`) a rate les occurrences en guillemets
     doubles (`@Column("...")`, `media.entity.ts`,
     `coupon.entity.ts`) -- corrige par une seconde recherche plus large
     avant de considerer le sujet clos.

3. **`float`/`double` avec `precision`+`scale` invalide sous Postgres**
   (echec `RdbmsSchemaBuilder.createNewTables`, `QueryFailedError:
   syntax error at or near "("`) -- `double precision(10,2)` n'est pas
   une syntaxe Postgres valide (contrairement a `FLOAT(10,2)` MySQL).
   **Corrige** : `'float'`/`"float"` -> `'numeric'`/`"numeric"`
   uniquement la ou `precision`+`scale` sont utilises ensemble (27
   occurrences, 13 fichiers : `driver-transaction`, `fleet-transaction`,
   `fleet`, `gift-card`, `coupon` (x4), `provider-transaction`,
   `request` (x5), `rider-transaction`, `reward`, `service-option`,
   `zone-price`, `service` (x9)) -- les colonnes `'float'` **sans**
   precision/scale (soldes de wallet, multiplicateurs) laissees
   intactes pour ne pas changer leur type de retour JS (`numeric` est
   renvoye en `string` par TypeORM, `float`/`double precision` en
   `number`).

4. **`RedisPubSubProvider` et `RedisModule.forRoot()` sans mot de
   passe** (boucle `NOAUTH Authentication required` continue, CPU
   100%+, contribuait au symptome "logs vides puis des milliers de
   lignes" observe en cours de diagnostic) -- `libs/database/src/lib/
   redis-pub-sub.provider.ts` et les 3 `RedisModule.forRoot({config:
   {host}})` dans `admin-api.module.ts`/`driver-api.module.ts`/
   `rider-api.module.ts` construisaient des clients `ioredis` sans lire
   `REDIS_PASSWORD`, alors que le Redis du compose exige
   `--requirepass`. **Corrige** : ajout de `password:
   process.env.REDIS_PASSWORD || undefined` (et `port` via
   `REDIS_PORT` pour coherence) aux 4 endroits.

5. **Port d'ecoute interne des 3 APIs non pilote par docker-compose**
   (conteneurs "running" et stables mais `curl` en HTTP 000 --
   `driver-api`/`rider-api` ecoutaient en dur sur le port 3000 alors que
   seuls 3002/3001 sont publies) -- `apps/{admin,driver,rider}-api/src/
   main.ts` lisent respectivement `ADMIN_API_PORT`/`DRIVER_API_PORT`/
   `RIDER_API_PORT` (defaut 3000 si absent) ; `admin-api` fonctionnait
   par coincidence (3000 partout), pas `driver-api`/`rider-api`.
   **Corrige** : ajout des 3 variables dans `docker-compose.yml`
   (`DRIVER_API_PORT: 3002`, `RIDER_API_PORT: 3001`, `ADMIN_API_PORT:
   3000` explicite par coherence).

6. **`admin-panel` proxifiait sur lui-meme en boucle infinie** (HTTP
   502 "upstream sent too big header", `X-Forwarded-For` grossissant a
   chaque tour) -- `apps/admin-panel/Dockerfile` copiait le **meme**
   `.nginx/default.conf` que le service `nginx` racine (reverse-proxy),
   dont le `location /` fait `proxy_pass http://admin-panel:80/` --
   dans le conteneur `admin-panel` lui-meme, cela boucle sur sa propre
   IP a l'infini jusqu'a depassement de buffer d'en-tete. **Corrige** :
   nouveau fichier dedie `apps/admin-panel/nginx.conf` (SPA statique
   simple, `try_files $uri $uri/ /index.html;`, sans aucun
   `proxy_pass`), Dockerfile mis a jour pour le copier a la place.
   **Meme correctif applique par coherence** a `rider-app/Dockerfile`
   (nouveau `rider-app/nginx.conf`) bien que ce service soit
   actuellement desactive dans `docker-compose.yml` -- evite la meme
   surprise le jour ou il sera reactive.

7. **Concurrence `TypeORM.synchronize()` entre `driver-api` et
   `rider-api`** (transitoire, auto-resolu) -- `duplicate key value
   violates unique constraint "pg_class_relname_nsp_index"` observe une
   fois au demarrage simultane des deux services (les deux tentent de
   creer le meme schema partage en parallele), suivi d'un retry reussi
   (`retryAttempts` de TypeORM). Non bloquant, mais note comme dette :
   `synchronize: true` partage entre plusieurs services concurrents est
   fragile -- a remplacer par de vraies migrations avant un premier
   deploiement en production.

**Verification finale** : `docker compose ps` montre les 7 conteneurs
`Up`, 0 redemarrage sur les 5 services applicatifs, `docker stats` a
0-6% CPU (plus de boucle), `curl` en 200 sur `:3000` (404 attendu,
POST-only), `:3001`, `:3002`, `:8080` et `:80` (entree nginx complete).

**Justification** : chaque bug etait invisible tant que seul `docker
build` avait ete valide -- ce premier run reel etait necessaire avant
l'achat du VPS pour ne pas decouvrir ces memes problemes en production.
Corriger la cause racine (types de colonnes, config nginx dediee,
variables de port) plutot que des contournements, pour que le
comportement reste correct une fois deploye sur le futur VPS Hostinger.

---

## 2026-07-03 -- Revalidation de l'audit UPDATES.md du 2026-07-02 (kasi-upgrade-tracker, aucune derive)

**Contexte** : nouvelle invocation de `kasi-upgrade-tracker` demandee par
`kasi-supervisor` pour comparer `UPDATES.md` (v2.5.6 -> v3.5.0) a l'etat
reel du code. L'audit complet des 21 entrees a signal verifiable existait
deja (entree du 2026-07-02, "Nouveau subagent kasi-upgrade-tracker").
Vu l'activite backend/devops intense entre le 2026-07-02 et le 2026-07-03
(Phase 0/1 Docker, migrations Postgres, premier `docker compose up`
complet), ce tour revalide un echantillon representatif plutot que de
reproduire l'audit a l'identique.

**Confirmation version de depart** : `driver-app/pubspec.yaml` (`version:
2.5.11+172`) et `rider-app/pubspec.yaml` (`version: 2.5.13+175`) placent
la base de code juste avant/au tout debut de la plage couverte par
`UPDATES.md` (qui demarre a v2.5.6) -- coherent avec le "Version: 2.5.2"
releve par les endpoints de sante `driver-api`/`rider-api`. Les deux
apps mobiles n'ont pas la meme micro-version (172 vs 175 build number),
point mineur sans impact sur l'audit changelog.

**Echantillon reverifie, aucun changement de verdict par rapport au
2026-07-02** :
- Item 1 (validation telephone) : confirme absent --
  `login_phone_number_bloc.dart` passe `event.countryCode +
  event.phoneNumber` directement a `verifyPhoneNumber` sans regex ni
  validateur.
- Item 2 (Flutter 3.38.2) : confirme absent -- `flutter: ^3.10.5` /
  `sdk: ^3.0.5` inchange sur les deux pubspec (Phase 3 mobile du plan de
  mise a jour du 2026-07-02 pas encore executee).
- Item 5 (swc) : confirme absent -- `apps/admin-api/project.json` cible
  `compile` toujours `"executor": "@nx/webpack:webpack"` /
  `"compiler": "tsc"`.
- Item 9 (Gradle Kotlin DSL) : confirme absent -- `driver-app/android/`
  contient `build.gradle` (Groovy), pas `build.gradle.kts`.
- Item 12 (distance miles) : confirme partiel -- `unit_of_measurement.dart`
  existe (dans `libs/client-shared`, desormais confirme peuple) mais
  reste la seule occurrence, pas de branchement UI supplementaire trouve.
- Item 13 (SMS OTP Plivo/Vonage/Broadnet) : confirme absent -- 0
  occurrence dans `libs/` (recherche insensible a la casse).
- Item 14 (gift cards batch/CSV) : confirme partiel -- `GiftCardEntity`
  existe toujours (`libs/database/src/lib/entities/gift-card.entity.ts`),
  aucun signal batch/CSV cote admin-panel trouve.
- Item 15 (payout/Stripe Connect) : confirme absent -- 0 occurrence
  "payout"/"stripeConnect" dans `libs/` (recherche desormais possible sur
  le contenu reel, plus une lib vide comme lors du tout premier audit).
- Item 18 (driver rate rider) / 19 (favorite) : confirmes absents --
  `FeedbackEntity` ne porte qu'une relation vers `DriverEntity` (rider ->
  driver uniquement), aucun champ "favorite"/"favourite" dans
  `libs/database/src/lib/entities/`.
- Item 20 (geo server-side) : confirme present --
  `apps/rider-api/src/app/geo/{geo.module.ts, geo.resolver.ts,
  google-geo.service.ts, nominitam-geo.service.ts}`.

**Decision** : le tableau de statut du 2026-07-02 reste la reference
valide, aucune correction necessaire. Pas de nouvelle table dupliquee
dans ce journal -- se referer a l'entree du 2026-07-02 pour le detail
complet des 21 items et de l'ordre d'integration recommande.

**Point mineur nouveau, hors changelog** : divergence de build number
`+172` (driver) vs `+175` (rider) sur les pubspec, notee ici pour
`kasi-mobile-apps` mais sans lien avec une entree specifique
d'`UPDATES.md`.

**Justification** : evite de rejouer un audit deja fait a l'identique
alors que rien n'a bouge cote mobile/paiement/favoris depuis le
2026-07-02 -- seule la partie infra/backend (hors perimetre changelog
fonctionnel) a change entre les deux dates. Confirme neanmoins par
preuve de code fraiche plutot que par confiance aveugle dans le
precedent audit.

**Action de suivi** : aucune action nouvelle -- l'ordre d'integration
recommande du 2026-07-02 (items 12 -> 5 -> 9 -> 2 -> 18/19 -> 15/16 ->
6/7/11 -> 4/8/3) reste valable et arbitrable par `kasi-supervisor`.

---

## 2026-07-03 — Item 5 (swc compilation Nx) — TENTATIVE puis ROLLBACK, incompatibilite reelle identifiee

**Contexte** : suite a l'audit `kasi-upgrade-tracker`, tentative d'activer
`compiler: "swc"` (au lieu de `tsc`) sur les 3 targets webpack Nx
(`apps/admin-api/project.json`, `apps/driver-api/project.json`,
`apps/rider-api/project.json`) pour aligner sur le changelog upstream
Ridy (build plus rapide).

**Ce qui a ete fait puis annule** :
- Ajout de `@swc/core` (~1.3.51), `@swc/helpers` (~0.5.0), `swc-loader`
  (^0.1.15) en devDependencies (versions choisies pour compatibilite avec
  `@nx/webpack` 16.7.2, cf. `node_modules/@nx/webpack/src/utils/versions.js`
  et `node_modules/@nx/js/src/utils/versions.js`).
- Creation d'un `.swcrc` a la racine du monorepo (et non dans chaque
  `apps/*`) car les entites TypeORM partagees vivent dans `libs/database/`,
  hors de l'arborescence `apps/*` -- swc resout le `.swcrc` le plus proche
  du fichier source compile, pas de l'app Nx qui l'importe. Un `.swcrc`
  uniquement dans `apps/admin-api/` etc. ne couvre PAS `libs/database/`.
- `.swcrc` configure avec `jsc.transform.legacyDecorator: true` et
  `decoratorMetadata: true` (equivalent swc de
  `emitDecoratorMetadata`/`experimentalDecorators` de `tsconfig.base.json`)
  et `module.noInterop: false` (aligne sur `esModuleInterop: true` du
  tsconfig -- le defaut genere par `@nx/js convert-to-swc`, `noInterop:
  true`, aurait casse les imports par defaut de packages CommonJS comme
  `import jwt_decode from 'jwt-decode'` utilise dans les 3
  `auth/jwt.strategy.ts`).
- Build Nx/webpack (`nx build admin-api/driver-api/rider-api --prod`)
  **reussi** localement pour les 3 apps apres ces corrections.

**Blocage runtime decouvert (non visible a la compilation)** : au demarrage
reel (`node dist/apps/admin-api/main.js`), crash immediat :
```
ReferenceError: Cannot access 'MediaEntity' before initialization
```
Cause : `libs/database/src/lib/entities/media.entity.ts` et plusieurs
entites qui l'importent (`driver.entity.ts`, `rider-entity.ts`,
`operator.entity.ts`, `announcement.entity.ts`, `payment-gateway.entity.ts`,
`service.entity.ts`) forment un **cycle d'imports circulaires**, un motif
courant/valide avec TypeORM (relations `@OneToOne(() => MediaEntity, ...)`
en callback differe). Avec `emitDecoratorMetadata` (tsc), ce cycle ne pose
pas de probleme au runtime. Avec l'equivalent swc (`decoratorMetadata:
true`), l'emission de la metadonnee `design:type` pour les proprietes
typees directement (ex. `media?: MediaEntity`, hors tableau) semble
evaluer la reference de classe de maniere plus eager, ce qui heurte la
zone morte temporelle (TDZ) du cycle CommonJS genere par webpack au
premier `require`.

**Verification empirique** : meme bundle applicatif recompile avec
`compiler: "tsc"` (baseline) -> demarrage sans crash (bootstrap Nest se
poursuit normalement, tente la connexion DB/Redis comme attendu). Avec
`compiler: "swc"` -> crash systematique et immediat des le chargement du
module racine, avant meme toute tentative de connexion DB. Confirme que
le probleme est specifique au compilateur, pas a l'environnement de build.

**Decision** : **rollback complet**. Les 3 `project.json` sont revenus a
`"compiler": "tsc"`, le `.swcrc` racine a ete supprime, et les 3
devDependencies swc ajoutees ont ete retirees de `package.json` (et
`package-lock.json` resynchronise via `npm install --legacy-peer-deps`).
Aucun changement swc ne subsiste dans l'arbre de travail.

**Justification** : le cout d'investigation pour rendre swc
"comportementalement identique" a tsc sur ce cycle d'entites precis
(potentiellement : reordonner les imports, remplacer les types directs
par des `Relation<MediaEntity>` de TypeORM, ou script de post-traitement
du bundle) depasse le gain (vitesse de build) pour un item de priorite/
cout faible de l'audit. Conforme a la consigne de ne pas laisser un stack
casse : mieux vaut revenir a l'etat fonctionnel connu.

**Action de suivi possible (non executee)** : si ce chantier est repris,
piste a explorer en premier -- typer les relations TypeORM circulaires
avec le wrapper `Relation<T>` (recommande par TypeORM >= 0.3.9
precisement pour ce genre de cas swc/esbuild) plutot que le type direct,
ce qui evite l'emission d'un `design:type` referencant directement la
classe circulaire. Necessiterait un audit complet de toutes les relations
`libs/database/src/lib/entities/*.ts` avant nouvelle tentative -- ne pas
relancer sans ce prealable.

**Domaines impactes** : backend/devops uniquement (`admin-api`,
`driver-api`, `rider-api`, `libs/database`). Aucun contrat GraphQL,
aucune variable d'environnement, aucun schema consomme par les apps
mobiles/admin-panel n'a ete modifie -- rollback total, pas seulement
partiel.

## 2026-07-03 -- Item 2 (Flutter 3.38.2) -- blocage `app_plugin_loader.gradle` resolu, build Gradle/Android verifie reellement (driver-app + rider-app)

**Contexte** : suite directe de l'item 9 (Gradle Kotlin DSL). Le Flutter
installe sur la machine (`C:\src\flutter`, v3.41.6, Dart 3.11.4) ne pouvait
pas builder les apps car `settings.gradle.kts` utilisait le pattern
imperatif `apply(from = ".../app_plugin_loader.gradle")`, desormais
remplace par une `GradleException` explicite dans Flutter 3.41 (le fichier
ne fait plus que `throw` en renvoyant vers la migration declarative). Meme
constat pour `app/build.gradle.kts` qui appliquait imperativement
`flutter.gradle` (meme mecanisme de `throw`, non detecte a l'item 9).

**Versions finales retenues** (identiques driver-app/rider-app, harmonisation
demandee) :
- Gradle : `7.3.3` -> `8.14.3` (deja present en cache local `~/.gradle`,
  aucun telechargement necessaire ; correspond a `templateDefaultGradleVersion`
  du Flutter installe).
- AGP : `7.1.3`/`7.1.2` (divergence constatee a l'item 9) -> `8.11.1` uniforme
  sur les deux apps (= `templateAndroidGradlePluginVersion` de Flutter 3.41 ;
  satisfait la verification stricte de `DependencyVersionChecker.kt` qui exige
  AGP >= 8.1.1 pour ce Flutter).
- Kotlin : `1.8.0` -> `2.2.20` uniforme (`templateKotlinGradlePluginVersion`).
- JDK : `19.0.1` (`C:\Program Files\Java\jdk-19.0.1`), seul JDK installe
  satisfaisant l'exigence stricte Java >= 17 de Flutter 3.41. Fixe
  explicitement via `org.gradle.java.home` dans les deux `gradle.properties`
  (chemin projet, pas de dependance a la config globale).
- `sdk`/`flutter` dans les deux `pubspec.yaml` : **non modifies**
  (`sdk: ^3.0.5` / `flutter: ^3.10.5`). Verifie empiriquement compatibles
  avec Dart 3.11.4/Flutter 3.41.6 installes (`pub get` OK, Gradle invoque
  avec succes le compilateur Dart) -- bump inutile pour l'objectif pragmatique
  de la tache, evite une divergence de version non testee ailleurs.

**Migration technique effectuee** (driver-app ET rider-app, fichiers
symetriques) :
1. `android/settings.gradle.kts` : remplacement complet du bloc imperatif
   par `pluginManagement { includeBuild(".../flutter_tools/gradle") ... }`
   + bloc `plugins { id("dev.flutter.flutter-plugin-loader") version "1.0.0";
   id("com.android.application") version "8.11.1" apply false;
   id("org.jetbrains.kotlin.android") version "2.2.20" apply false }`.
2. `android/build.gradle.kts` (racine) : classpath AGP/Kotlin retires du
   `buildscript` (deplaces vers `settings.gradle.kts`) ; `jcenter()` (mort)
   remplace par `mavenCentral()` ; `google-services` bump `4.3.10` ->
   `4.4.2` et `firebase-crashlytics-gradle` bump `2.8.1` -> `3.0.2`
   (versions Gradle-plugin-tooling, PAS le SDK Firebase/BOM Dart -- decision
   necessaire pour compatibilite AGP8, la version du SDK Firebase reste a
   arbitrer par `kasi-integrations-auditor`). Ajout d'un contournement
   `subprojects { afterEvaluate { ... } }` qui patch `namespace` depuis le
   `package` du manifest pour les plugins pub.dev tiers dont le
   `android/build.gradle` date d'avant AGP8 (ex. `country_codes`) --
   necessaire car AGP8 rend `namespace` obligatoire et ces plugins publies
   ne peuvent pas etre modifies depuis le pub cache.
3. `android/app/build.gradle.kts` : `apply(from = ".../flutter.gradle")`
   remplace par `id("dev.flutter.flutter-gradle-plugin")` dans le bloc
   `plugins`. Ajout de `namespace = "com.kasi.taxi.driver"` /
   `"com.kasi.taxi.rider"` (obligatoire AGP8, valeur reprise telle quelle du
   `package` manifest existant -- **pas** une decision de rebranding, juste
   le mecanisme de migration namespace). Suppression de la dependance
   `kotlin-stdlib-jdk7` (devenue invalide, `rootProject.extra["kotlin_version"]`
   n'existant plus ; inutile depuis Kotlin >= 1.8 qui fusionne les stdlib
   jdk7/jdk8).
4. `android/app/src/{main,debug,profile}/AndroidManifest.xml` (6 fichiers) :
   attribut `package="com.kasi.taxi.*"` retire (deplace vers `namespace` en
   (3), requis par AGP8 qui n'accepte plus le `package` manifest).
5. `android/gradle.properties` (les deux apps) : ajout
   `org.gradle.java.home=.../jdk-19.0.1` et
   `android.defaults.buildfeatures.buildconfig=true` (AGP8 desactive
   `BuildConfig` par defaut ; plusieurs plugins pub.dev anciens, dont le
   wrapper Android de `firebase_analytics`, en dependent encore).
6. Fix machine (hors repo) : `flutter config --jdk-dir` pointait vers
   `C:\Program Files\Java\jdk-17.0.6` qui **n'existe pas sur le disque**
   (chemin fantome deja repere a l'item 9). Ce reglage global court-circuite
   toute variable `JAVA_HOME` passee au sous-processus `gradlew` lance par
   l'outil Flutter (verifie : exporter `JAVA_HOME` dans le shell n'avait
   aucun effet tant que ce reglage restait errone). Corrige via
   `flutter config --jdk-dir="C:\Program Files\Java\jdk-19.0.1"`
   (`C:\Users\moham\AppData\Roaming\.flutter_settings`).

**Verification reelle effectuee** (`flutter build apk --debug`, pas
seulement `pub get`/`flutter doctor`) :
- **driver-app** : la configuration Gradle passe entierement (plus aucune
  erreur AGP/namespace/JDK/BuildConfig), la tache
  `:app:compileFlutterBuildDebug` s'execute reellement (712s de temps Gradle)
  et invoque le compilateur Dart. Le build **echoue** ensuite, mais
  uniquement sur des erreurs Dart pures sans rapport avec Gradle/Android :
  (a) plusieurs vues (`ride_options_sheet_view.dart`,
  `rider_preferences_sheet_view.dart`, `trip_history_details_view.dart`,
  `add_credit_sheet_view.dart`, `submit_complaint_view.dart`) appellent
  `S.of(context)` sans importer la classe de localisation generee ; (b) le
  code GraphQL genere (`trip-hitsory.graphql.dart`, `wallet.graphql.dart`)
  reference des convertisseurs de scalaires custom introuvables
  (`fromGraphQLTimestampToDartDateTime` etc.) ; (c) trois dependances
  pub.dev figees incompatibles avec Dart 3.11.4/Flutter 3.41.6 :
  `flutter_hooks 0.18.5+1` (`KeepAliveHandle.release()` supprime du
  framework Flutter), `win32 5.0.3` (`UnmodifiableUint8ListView`
  deplace/supprime), `google_fonts 5.1.0` (Dart 3 durcit l'egalite des cles
  de const-map, `FontWeight` n'a pas d'operateur `==` primitif).
- **rider-app** : la configuration Gradle passe egalement entierement
  (memes fixes valides symetriquement). Le build echoue plus tot, des la
  generation des localisations (`Target gen_localizations failed`), avec un
  message explicite : `flutter: generate: true` manque dans
  `rider-app/pubspec.yaml` (**present** dans celui de driver-app -- divergence
  preexistante entre les deux apps, sans lien avec le present chantier).
- Dans les deux cas, le blocage **specifique a cette tache**
  (`app_plugin_loader.gradle` imperatif, AGP/Gradle/JDK incompatibles) est
  **leve et confirme empiriquement** : le pipeline atteint la compilation
  Dart reelle, ce qui etait impossible avant. Les echecs restants relevent
  du code Dart applicatif et des versions de dependances pubspec (hors
  `sdk`/`flutter`), explicitement hors perimetre de cette tache.

**Etat des fichiers** : tous les changements ci-dessus sont **conserves**
(pas de rollback) -- ils constituent un progres reel et verifie, ne cassent
rien de plus que l'etat prealable (qui ne buildait pas du tout), et sont
strictement scopes au Gradle/Android natif + config machine locale. Aucun
fichier Dart applicatif ni dependance pubspec (hors `sdk`/`flutter`, non
modifies) n'a ete touche.

**Actions de suivi identifiees (non executees, hors perimetre)** :
1. `rider-app/pubspec.yaml` : ajouter `flutter: generate: true` (manquant,
   present sur driver-app) -- fix d'une ligne mais touche pubspec.yaml hors
   `sdk`/`flutter`, a valider par le proprietaire du chantier Dart/pubspec.
2. Bump cible a arbitrer pour `flutter_hooks`, `win32`, `google_fonts`
   (incompatibles Dart 3.11.4/Flutter 3.41.6) et audit des imports manquants
   de la classe de localisation `S` dans les 5 vues driver-app listees
   ci-dessus.
3. Version du SDK Firebase/BOM (Dart, `pubspec.yaml`) non revisitee ici --
   seules les versions des *plugins Gradle* `google-services` et
   `firebase-crashlytics-gradle` (tooling natif) ont ete bumpees pour
   compatibilite AGP8 ; decision produit/SDK a transmettre a
   `kasi-integrations-auditor`.
4. Items 3/6/8 de l'audit (debloques par celui-ci selon le plan) peuvent
   desormais etre attaques cote build system ; le code Dart lui-meme reste
   a ecrire independamment des points 1-2 ci-dessus.

**Domaines impactes** : mobile/devops (Android natif des deux apps) +
config machine locale (`flutter config --jdk-dir`). Aucun appel API backend
ni contrat GraphQL modifie. Aucun fichier iOS touche (hors perimetre de
cette tache, non demande).

## 2026-07-04 -- Suite item 2 : blocages Dart restants leves, `.apk` reel obtenu sur driver-app ET rider-app

**Contexte** : suite directe de l'entree precedente. Le superviseur a
demande d'aller jusqu'au bout des 4 blocages Dart identifies comme
"actions de suivi" et de confirmer un vrai `.apk` genere sur les deux apps.

**Corrections appliquees (par ordre de decouverte reelle, plusieurs
iterations `flutter build apk --debug` necessaires)** :

1. `rider-app/pubspec.yaml` : ajout de `flutter: generate: true` (manquant,
   present sur driver-app) -- corrige `Target gen_localizations failed`.
2. `driver-app` : l'import `package:flutter_gen/gen_l10n/messages.dart`
   (paquet synthetique) ne resout plus rien sous Flutter 3.41 (deprecation
   confirmee -- `synthetic-package` n'a plus d'effet). Remplace par
   `package:kasi_driver/l10n/messages.dart` (chemin reel du fichier genere)
   dans les **29 fichiers** qui l'importaient (pas seulement les 5 vues
   initialement listees -- la liste precedente etait tronquee par un
   `tail -250` sur un log deja partiel). rider-app importait deja
   correctement via `package:kasi_rider/l10n/messages.dart`, aucune
   correction necessaire cote rider.
3. Code GraphQL genere (`trip-hitsory.graphql.dart`, `wallet.graphql.dart`,
   `announcements.graphql.dart`, `earnings.graphql.dart`,
   `order.fragment.graphql.dart`, `main.graphql.dart`, `schema.gql.dart` --
   7 fichiers driver-app) : root cause reelle trouvee -- ces fichiers
   generes importaient encore `package:ridy/graphql/scalars/...` (ancien nom
   de paquet, avant le renommage `package:ridy` -> `package:kasi_driver` du
   2026-07-01), donc introuvables. Les convertisseurs de scalaires
   (`fromGraphQLTimestampToDartDateTime` etc.) existent bien et sont
   correctement declares dans `build.yaml` (`package:kasi_driver/graphql/
   scalars/*.dart`) -- il suffisait de relancer `dart run build_runner build
   --delete-conflicting-outputs`, ce qui a regenere les imports avec le nom
   de paquet courant. Aucune edition manuelle de code genere.
4. Dependances incompatibles Dart 3.11.4/Flutter 3.41.6, bumpees a la
   version minimale corrigeant l'incompatibilite (verifie fichier par
   fichier dans le cache pub avant de choisir) :
   - `google_fonts` : `^5.1.0` -> `^6.3.3` (la map const
     `_fontWeightToFilenameWeightParts` gardait des cles `FontWeight`
     jusqu'a la 6.2.1 incluse -- Dart n'autorise plus les cles de map
     `const` sans egalite primitive, et `FontWeight` a un `operator ==`
     custom dans le moteur Flutter actuel ; seule la 6.3.3 remplace cette
     map par une `final Map` non-const). Egalement bumpe dans
     `libs/client-shared/pubspec.yaml` (meme contrainte `^5.0.0` -> bloquait
     la resolution des deux apps).
   - `dependency_overrides` ajoutes (driver-app ET rider-app) : `win32:
     5.5.4` (via `file_picker`, `UnmodifiableUint8ListView` supprime),
     `flutter_hooks: 0.18.6` (via `graphql_flutter`, `KeepAliveHandle.
     release()` supprime -> `.dispose()`).
5. Blocage totalement different apparu apres coup (embedding Android v1
   supprime dans Flutter 3.41, `PluginRegistry.Registrar` n'existe plus) --
   traite car mecanique/rapide a corriger une fois la cause identifiee,
   verifiee methodiquement paquet par paquet dans le cache pub :
   - `file_picker` : `^5.3.3` -> `^8.1.4` (direct, API `pickFiles`/
     `FileType.image`/`PlatformFile.single` inchangee, verifie).
   - `country_codes` : `^2.2.0` -> `^3.3.0` (direct, API `CountryCodes.
     init()`/`detailsForLocale()` inchangee, verifie).
   - `map_launcher` : `^2.5.0+1` -> `^3.5.0` (direct, driver-app uniquement,
     API `installedMaps`/`Coords` inchangee, verifie).
   - `flutter_ringtone_player` : `^3.2.0` -> `^4.0.0+4` (direct, driver-app
     uniquement ; `play()` devenu methode d'instance -> corrige l'appel
     `FlutterRingtonePlayer.play(...)` en `FlutterRingtonePlayer().play(...)`
     dans `lib/main_bloc.dart`).
   - `dependency_overrides` ajoutes (les deux apps) :
     `flutter_plugin_android_lifecycle: 2.0.34`, `geolocator_android: 4.6.1`,
     `google_maps_flutter_android: 2.14.11`, `url_launcher_android: 6.3.10`,
     `path_provider_android: 2.2.10` -- toutes verifiees compatibles avec
     les contraintes des paquets parents (pas de force en dehors des ranges
     declares). Balayage systematique de tout `pubspec.lock` resolu contre
     `PluginRegistry.Registrar` avant chaque nouvelle tentative de build,
     pour eviter les allers-retours de 10-30 min un par un.
6. `compileSdk` : `33` -> `36` (les deux apps) -- plusieurs dependances
   androidx (`androidx.core:1.13.1`, `androidx.window:1.2.0`, etc.) exigent
   compileSdk >= 34 ; `36` correspond au defaut du template Flutter 3.41
   (`compileSdkVersionInt` dans `gradle_utils.dart`).
7. `org.gradle.jvmargs` : `-Xmx1536M` -> `-Xmx3072M` (les deux
   `gradle.properties`) -- le Jetifier echouait avec `Java heap space` sur
   les gros jars natifs Flutter (`armeabi_v7a_debug`, `arm64_v8a_debug`,
   `x86_64_debug`) avec le heap par defaut.
8. `compileOptions`/`kotlinOptions` ajoutes explicitement dans les deux
   `app/build.gradle.kts` (`JavaVersion.VERSION_17` pour les deux) -- sans
   cela, `compileDebugJavaWithJavac` restait sur le defaut historique 1.8
   pendant que `compileDebugKotlin` deduisait 19 du JDK utilise par Gradle,
   provoquant une erreur `Inconsistent JVM Target Compatibility`.
9. **Decouverte confirmee** (deja suspectee a l'entree precedente) : les
   deux `MainActivity.kt` vivent toujours sous l'ancien chemin de paquet
   pre-rebranding (`com/ridy/taxi/{driver,rider}/{driver,rider}_app/`,
   `package com.ridy.taxi...`) alors que le `namespace` AGP (et donc la
   classe `R` generee) est deja `com.kasi.taxi.{driver,rider}`. Ceci
   provoquait `Unresolved reference 'R'` a la compilation Kotlin (paquet
   different = `R` hors scope). Corrige au plus mecanique : ajout d'un
   `import com.kasi.taxi.{driver,rider}.R` explicite dans chaque fichier,
   **sans deplacer le dossier/paquet source** (deplacement complet =
   chantier de rebranding Android a part entiere, hors perimetre de cette
   tache Gradle/Flutter -- signale ici pour le suivi du rebranding natif).
10. `firebase_options.dart` manquant sur les deux apps (`import
    'firebase_options.dart'` dans `main.dart`, fichier absent du depot,
    jamais genere ni ignore -- bloquant la compilation, independant de
    toutes les autres taches). Genere manuellement pour les deux apps a
    partir des fichiers Firebase Kasi deja deployes (`android/app/
    google-services.json`, `ios/Runner/GoogleService-Info.plist`), au
    format produit par `flutterfire configure`, car cet outil CLI n'a pas
    ete execute dans cet environnement. Valeurs reprises telles quelles
    (apiKey, appId, messagingSenderId, projectId, storageBucket,
    iosBundleId) -- aucune nouvelle decision Firebase, juste le cablage
    Dart d'une configuration deja approuvee/deployee. A regenerer via la
    CLI officielle `flutterfire configure` si l'acces credentials/CLI
    devient disponible ; signale pour `kasi-integrations-auditor`.
11. `libs/client-shared/lib/theme/theme.dart` et `theme-yellow.dart` :
    renommages mecaniques Material 3 (API Flutter, pas de decision de
    design) -- `DialogTheme(` -> `DialogThemeData(`, `TabBarTheme(` ->
    `TabBarThemeData(` (theme.dart uniquement), `ElevatedButton.styleFrom(
    primary: ..., onPrimary: ...)` -> `styleFrom(backgroundColor: ...,
    foregroundColor: ...)`. Egalement `textTheme.caption` -> `.bodySmall`
    (4 occurrences : driver-app, rider-app, client-shared), `textTheme.
    bodyText1` -> `.bodyLarge` et `Theme.of(context).errorColor` ->
    `.colorScheme.error` (1 occurrence, rider-app). Balayage complet
    effectue pour les autres membres `TextTheme`/widgets Material 2
    depreciees (`headline1-6`, `subtitle1-2`, `RaisedButton`, `FlatButton`,
    `accentColor`, etc.) -- rien d'autre trouve, hormis `headline4` dans
    `libs/client-shared/lib/main.dart` qui est un fichier mort (template
    par defaut d'un module Flutter, jamais importe par aucune des deux
    apps) -- non corrige, hors chemin de compilation reel.
12. Code genere (pas hand-maintenu, mais aucune version de
    `flutter_gen_runner` ne corrige le probleme -- 5.14.1 est confirmee
    derniere version publiee via l'API pub.dev) : `lib/gen/assets.gen.dart`
    (les deux apps) passe `theme: theme` (nullable) directement a
    `SvgAssetLoader` qui exige un `SvgTheme` non-nullable depuis
    `flutter_svg` 2.0.7. Patch minimal directement dans le fichier genere :
    `theme: theme ?? const _svg.SvgTheme()`. A re-appliquer si
    `build_runner`/`flutter_gen_runner` regenere ce fichier -- documente ici
    pour que la prochaine personne qui regenere sache pourquoi ca recasse.

**Verification reelle finale** :
- `driver-app/build/app/outputs/flutter-apk/app-debug.apk` genere avec
  succes (171 908 899 octets, 2026-07-04 02:04). `flutter build apk
  --debug` termine avec `Built build\app\outputs\flutter-apk\app-debug.apk`
  et code de sortie 0.
- `rider-app/build/app/outputs/flutter-apk/app-debug.apk` genere avec
  succes (173 496 142 octets, 2026-07-04 02:31), meme confirmation
  `Built ...` et code de sortie 0. Copie egalement presente sous
  `build/app/outputs/apk/debug/app-debug.apk` (sortie Gradle brute).
- Ni l'un ni l'autre n'a necessite de contournement de derniere minute
  (`--android-skip-build-dependency-validation` etc.) -- les deux passent
  toutes les verifications Gradle/AGP/JDK/Kotlin strictes de
  `DependencyVersionChecker.kt`.

**Etat des fichiers** : tous conserves (aucun rollback necessaire, chaque
iteration a corrige un blocage reel sans en re-casser un autre). Fichiers
touches en plus de l'entree precedente : les deux `pubspec.yaml` (versions
de dependances + `dependency_overrides` + `generate: true` sur rider-app),
`libs/client-shared/pubspec.yaml` (google_fonts), les deux
`android/app/build.gradle.kts` (compileSdk, compileOptions/kotlinOptions),
les deux `android/gradle.properties` (heap), les deux `MainActivity.kt`
(import R), les deux `lib/firebase_options.dart` (nouveaux fichiers), les
deux `lib/gen/assets.gen.dart` (patch genere), `libs/client-shared/lib/
theme/theme.dart` + `theme-yellow.dart` + `components/query_result_view.dart`,
driver-app `lib/main_bloc.dart` + `lib/main.dart`-adjacent 29 fichiers
(import l10n) + `lib/announcements/announcements_view.dart` (caption) +
7 fichiers `*.graphql.dart`/`schema.gql.dart` (regeneres, pas edites),
rider-app `lib/query_result_view.dart` + `lib/announcements/
announcements_list_view.dart` + `lib/address/address_details_view.dart`.

**Actions de suivi restantes (hors perimetre, transmises)** :
1. Deplacement complet des dossiers/paquets Kotlin `com/ridy/...` ->
   `com/kasi/...` pour finir le rebranding Android natif (point 9
   ci-dessus) -- actuellement contourne par un import explicite, fonctionnel
   mais pas "propre".
2. Regeneration de `firebase_options.dart` via la CLI officielle
   `flutterfire configure` quand l'environnement le permettra (point 10) --
   a transmettre a `kasi-integrations-auditor`.
3. Version du SDK Firebase Dart (BOM/pubspec, pas les plugins Gradle deja
   traites precedemment) toujours non revisitee -- meme remarque que
   l'entree precedente.
4. `lib/gen/assets.gen.dart` : patch a reappliquer si regenere (point 12).

**Domaines impactes** : mobile (Dart applicatif + Android natif des deux
apps + `libs/client-shared`). Aucun appel API backend ni contrat GraphQL
modifie -- uniquement des renommages de scalaires/imports internes au
client. Aucun fichier iOS touche.

---

## 2026-07-04 -- Rebranding natif Android termine : deplacement reel des packages Kotlin com/ridy -> com/kasi, premier lancement reel sur emulateur (driver-app + rider-app)

**Contexte** : action de suivi explicitement laissee ouverte par l'entree
precedente (point 9) -- `MainActivity.kt` des deux apps vivait encore sous
l'ancien chemin de package `com/ridy/taxi/{driver,rider}/{driver,rider}_app/`,
contourne par un import `R` explicite plutot que corrige a la racine.
Declenche par un test utilisateur reel : lancement de driver-app sur un
emulateur Android Pixel 8a API 36 (premier test sur device/emulateur de
toute la session, au-dela du simple `flutter build apk`).

**Bug reel decouvert par ce test** : le `.apk` debug s'installe sans
probleme mais l'app **crashe immediatement au lancement** --
`ClassNotFoundException: com.kasi.taxi.driver.MainActivity`. Cause : le
`namespace` AGP8 (`com.kasi.taxi.driver`/`com.kasi.taxi.rider`) fait que
`android:name=".MainActivity"` dans le manifest se resout contre ce
namespace, donc Android cherche la classe a
`com.kasi.taxi.{driver,rider}.MainActivity` -- alors que le fichier
compile reel declarait toujours `package com.ridy.taxi.{driver,rider}.
{driver,rider}_app`. L'import `R` explicite ajoute precedemment resolvait
la ressource a la compilation (Gradle/Kotlin content), mais ne change pas
le nom de classe binaire au runtime -- **le build passait, le lancement
non**, ce qui n'avait jamais ete teste avant ce tour.

**Correction appliquee (les deux apps, symetrique)** :
- Nouveau fichier `android/app/src/main/kotlin/com/kasi/taxi/{driver,rider}/MainActivity.kt`
  avec `package com.kasi.taxi.{driver,rider}` (sans le segment
  `{driver,rider}_app` -- aligne exactement sur le `namespace` declare dans
  `build.gradle.kts`). Import `R` explicite retire (redevenu inutile,
  meme package que la classe R generee).
- Ancien dossier `android/app/src/main/kotlin/com/ridy/` supprime
  entierement sur les deux apps (plus aucune reference `com.ridy.*` dans
  le code source Kotlin).

**Verification reelle effectuee** : `flutter run -d emulator-5554 --debug`
sur les deux apps. Note d'outillage : l'affichage de progression `flutter
run` (compteur `\r` du style "Installing... 46,8s") ne se met pas a jour
correctement une fois la sortie redirigee vers un fichier dans cet
environnement -- **ne pas se fier a la derniere ligne du log pour juger
qu'un build est bloque**. Verification faite directement via `adb shell
pidof <package>` + `adb logcat` (et `adb shell am start` pour rider-app,
lancement manuel de l'activite en parallele du process `flutter run` deja
en cours) :
- **driver-app** : lance sans crash, moteur Impeller (OpenGLES) actif,
  plugin Geolocator attache normalement. Seul point notable (non
  bloquant) : `FirebaseInstanceId: Token retrieval failed:
  SERVICE_NOT_AVAILABLE` -- attendu sur emulateur AOSP sans Google Play
  Services complet pour FCM, n'empeche pas l'app de fonctionner.
- **rider-app** : lance sans crash (pid stable observe sur plusieurs
  lectures), moteur Impeller actif, aucune exception dans logcat au-dela
  du demarrage.

**Etat des fichiers** : conserve, aucun rollback. Fichiers touches en plus
de l'entree precedente : les deux `MainActivity.kt` (deplaces + package
corrige), suppression des deux arborescences `com/ridy/` desormais mortes.

**Action de suivi de l'entree precedente marquee resolue** : le point 1
("Deplacement complet des dossiers/paquets Kotlin com/ridy/... ->
com/kasi/... pour finir le rebranding Android natif") est **fait**. Les
autres actions de suivi de cette meme entree (regeneration
`firebase_options.dart` via `flutterfire configure`, version SDK Firebase
Dart/BOM, patch `assets.gen.dart` a reappliquer si regenere) restent
ouvertes, non concernees par ce tour.

**Justification** : corriger a la racine (deplacement reel du fichier)
plutot que garder le contournement d'import -- le contournement masquait
un vrai bug (mismatch nom de classe binaire vs manifest) qui ne se
revelait qu'a l'execution, jamais a la simple compilation. Premier test
d'execution reelle de la session sur emulateur, valeur elevee : plusieurs
tours precedents avaient valide uniquement `flutter build apk` (succes de
compilation) sans jamais verifier que l'app demarre reellement.

**Domaines impactes** : mobile (Android natif des deux apps uniquement).
Aucun fichier Dart applicatif, aucun contrat GraphQL, aucune dependance
pubspec modifiee.

---

## 2026-07-04 — admin-panel : routes vides diagnostiquées en conditions réelles (stack Docker vivante), FR par défaut, téléphone Sénégal, revue Mapbox (kasi-admin-panel)

### Contexte de vérification

Diagnostic mené contre la stack Docker réellement démarrée (`kasi-admin-panel`,
`kasi-nginx`, `kasi-admin-api`, `kasi-postgres`), pas en lecture de code seule :
requêtes GraphQL rejouées telles qu'elles apparaissent dans les fichiers
`*.graphql` co-localisés à chaque composant, via `curl` contre
`http://localhost:3000/graphql`, avec un vrai JWT obtenu en loggant le compte
`kasi@admin.com` (mot de passe `P@ssword`, cf. `create_superuser.sql`).
Rebuild réel de l'image Docker `admin-panel` (`docker compose build admin-panel`,
~2×) pour valider que le code TypeScript/HTML modifié compile bien en AOT — le
node_modules de l'hôte Windows s'est avéré corrompu (fichiers `ng-zorro-antd`
partiellement absents), donc toute vérification de compilation locale
(`npx nx build`/`serve` hors Docker) échoue indépendamment de nos changements ;
seul le build **dans le conteneur** (npm ci propre à chaque fois) fait foi.

### (a) Routes/sous-menus vides — cause racine réelle trouvée et corrigée

**Deux bugs distincts** expliquent la quasi-totalité des écrans "vides" signalés :

**Bug 1 (corrigé au niveau des données, pas du code) — seed operator sans rôle.**
`app-ridy/create_superuser.sql` insère l'opérateur admin (`kasi@admin.com`) sans
lui assigner de `roleId`, et **aucune ligne `operator_role` n'est créée** dans ce
script (contrairement à l'ancienne migration MySQL archivée
`libs/database/src/lib/migration/mysql-archive/1573397187505-seed-admin-operator.ts`
qui insérait un rôle `admin` avec permissions complètes ET reliait l'opérateur
via `roleId`). Résultat en conditions réelles : `operator.role` est `null` en
base pour le seul compte admin existant.

Or **9 `CustomAuthorizer` d'admin-api font `operator.role.permissions.includes(...)`
sans vérifier que `role` n'est pas `null`** :
`apps/admin-api/src/app/region/dto/region.authorizer.ts:28,34`,
`.../announcement/dto/announcement.authorizer.ts:29,35`,
`.../car/dto/car.authorizer.ts:28,34`,
`.../coupon/dto/coupon.authorizer.ts:28,34`,
`.../fleet/dto/fleet.authorizer.ts:25,31`,
`.../operator/dto/operator.authorizer.ts:28,34`,
`.../payment-gateway/dto/gateway.authorizer.ts:30,36`,
`.../service/dto/service.authorizer.ts:29,35` (utilisé aussi pour `zonePrices`),
et `apps/admin-api/src/app/operator/operator.service.ts:34` (`hasPermission`).
Avec `role == null`, chacun lève une `TypeError: Cannot read properties of
null (reading 'permissions')` — une erreur **serveur 500 non gérée**, pas une
liste vide. Côté admin-panel, Apollo reçoit une erreur GraphQL sur ces champs
et l'écran apparaît vide/cassé sans message clair, exactement le symptôme
signalé pour : Régions, Coupons, Annonces, Flottes, Tarifs zonaux, Véhicules
(modèles), Utilisateurs/Opérateurs, Passerelles de paiement.

Vérifié en direct (`curl` avec JWT) : `regions`, `coupons`, `announcements`,
`fleets`, `zonePrices`, `carModels`, `operators`, `paymentGateways` renvoyaient
tous cette `TypeError` avant correction.

**Correctif appliqué (données uniquement, environnement local)** :
```sql
INSERT INTO operator_role (title, permissions) VALUES ('admin', ARRAY[...toutes les permissions...]::operator_role_permissions_enum[]);
UPDATE operator SET "roleId" = 1 WHERE id = 1;
```
Après correctif, les 8 requêtes ci-dessus renvoient toutes des réponses
valides (listes vides car aucune donnée de test en base — comportement normal,
pas un bug). **Ce correctif est appliqué uniquement sur la base Docker locale
en cours d'exécution**, pas dans un script versionné — **action de suivi pour
`kasi-backend-services`** : ajouter l'insertion `operator_role` + le `roleId`
manquants dans `create_superuser.sql` (ou équivalent), et envisager de
sécuriser les 9 authorizers avec un garde `operator.role == null` →
`UnauthorizedException` explicite plutôt qu'un crash 500 (fragilité de code
indépendante du seed, qui resurgira pour tout futur opérateur créé sans rôle
assigné via `management/user-roles` puis `management/users`).

**Bug 2 (non corrigé — hors périmètre admin-panel, documenté pour
`kasi-backend-services`) — `AccountingService` en SQL brut 100% MySQL, jamais
adapté à PostgreSQL.** `apps/admin-api/src/app/accounting/accounting.service.ts`
lignes 23-82 (`incomeChart`, `requestsChart`, `driverRegistrations`,
`riderRegistrations`, `getQueryVars`) construit des requêtes SQL brutes avec de
la syntaxe strictement MySQL : identifiants entre backticks
(`` from \`request\` ``), fonctions `UNIX_TIMESTAMP()`, `CURDATE()`,
`ANY_VALUE()`, `DAYOFYEAR()`, `WEEKOFYEAR()`, et `INTERVAL 6 MONTH` sans
guillemets (syntaxe invalide en Postgres, qui exige `INTERVAL '6 months'`).
Vérifié en direct : les 4 requêtes GraphQL `incomeChart`, `requestChart`,
`driverRegistrations`, `riderRegistrations` (utilisées par les 4 graphiques de
**Home > Overview**) renvoient toutes une `QueryFailedError: syntax error at or
near "\`"` / `"6"` — un vrai bug post-migration MySQL→Postgres (voir décision du
2026-07-01 sur cette migration), pas un manque de données. Écran concerné :
`/home/overview` (les 4 graphiques restent vides/en erreur ; le reste de
l'écran — agrégats de compteurs, carte chauffeurs — fonctionne). Non corrigé
ici (backend, réécriture SQL nécessaire vers syntaxe Postgres ou vers le query
builder TypeORM) — **à traiter par `kasi-backend-services`**.

**Toutes les autres routes de la sidebar testées renvoient des réponses
GraphQL valides** (généralement des listes vides, car la base ne contient
aucune donnée de test hors le compte admin — normal, pas un bug) :
`/drivers`, `/marketing/coupons`, `/marketing/announcements`,
`/financials/{provider,fleet,driver,rider}`, `/riders`, `/requests`, `/sos`,
`/complaints`, `/management/{regions,services,service-options,fleets,
zone-prices,review-parameters,cars,user-roles,users,payment-gateways}`.
`/home/dispatcher` (calcul de tarif) et `/management/settings` (formulaire de
mot de passe, pas de liste) n'ont pas de dépendance de données à vérifier.

### (b) Régression frontend trouvée en cours de route — chargeur Google Maps mort dans `app.component.ts`

**Constat** : `apps/admin-panel/src/app/app.component.ts` (avant correctif)
chargeait encore `https://maps.googleapis.com/maps/api/js?key=...` au boot de
l'app, en utilisant `currentConfiguration.adminPanelAPIKey` comme clé Google —
résidu de l'ère pré-Mapbox (décision du 2026-07-01 sur la migration Mapbox,
jamais nettoyée ici). Dans l'environnement Kasi, ce champ contient en réalité
un **token Mapbox** (`pk.eyJ...`, vérifié via `currentConfiguration` en
GraphQL), pas une clé Google valide. Le `await this.loadScript(...)` bloquait
la promesse jusqu'à ce que le callback `initMap` de Google se déclenche ; si ce
script échoue à charger (réseau restreint, clé invalide bloquée côté Google),
`isLoaded` ne passe jamais à `true` et `<router-outlet *ngIf="isLoaded">`
n'affiche jamais rien — un risque de blocage total de l'app. Comme la carte
est déjà chargée indépendamment par `NgxMapboxGLModule.withConfig(...)`
(`shared.module.ts`), ce chargeur Google était à la fois redondant et risqué.
**Corrigé** : suppression du chargement du script Google Maps dans
`app.component.ts` ; `isLoaded` est maintenant positionné directement après
`getConfig()`, la redirection vers `/config` est conservée si
`firebaseProjectPrivateKey == null`.

**Dette documentée, non traitée (périmètre limité, faible risque)** : l'écran
de première configuration `apps/admin-panel/src/app/config/config.component.ts`
(lignes 60-66) et son template (`config.component.html` lignes 2,6,8-9)
utilisent toujours le vocabulaire "Google Maps API Key" / `backendMapsAPIKey`
/ `adminPanelAPIKey` pour ce qui est en réalité, dans Kasi, un token Mapbox.
Cet écran n'est affiché que si `firebaseProjectPrivateKey == null` (pas le cas
dans l'environnement testé, `firebaseProjectPrivateKey` valant déjà
`"RESTRICTED"`) — non bloquant aujourd'hui, mais à renommer/rebrander avant
toute réutilisation de ce flux de première installation.

### (c) Mapbox (objectif 4) — code déjà migré, vérifié en conditions réelles

Les 3 écrans cités dans la décision du 2026-07-01
(`overview-drivers-map`, `request-view-assign`, `region-view` avec
`@mapbox/mapbox-gl-draw`) étaient **déjà entièrement migrés** vers
`mgl-map`/`ngx-mapbox-gl` avant cette session (aucune trace de
`@angular/google-maps` restante dans ces 3 composants). Vérifié : le CSS
`mapbox-gl` est bien bundlé dans le build de production
(`grep mapbox-gl dist/apps/admin-panel/styles.*.css` → présent), le token
`environment.mapboxToken` est bien câblé dans `shared.module.ts`, et les
requêtes GraphQL dont ces écrans dépendent (`getDriversLocation`,
`order.points`, `region.location`) répondent sans erreur après le correctif du
point (a). Décision de fournisseur non remise en cause, conformément à la
consigne. Seule la régression du point (b) (chargeur Google Maps mort) a été
corrigée en marge de cette vérification.

### (d) Langue par défaut FR (objectif 2)

- `app.module.ts` : `defaultLanguage: 'en'` → `'fr'` ; les 2 fallbacks
  `localStorage.getItem('lang') ?? 'en'` (locale ng-zorro `NZ_DATE_LOCALE` et
  `NZ_I18N`) basculés sur `'fr'`, y compris leur branche `default:` interne
  (`enUS`/`en_US` → `fr`/`fr_FR`).
- `app.component.ts` : `translate.use(localStorage.getItem('lang') ?? 'en')` →
  `?? 'fr'`.
- `index.html` : `<html lang="en">` → `<html lang="fr">` (cohérence
  accessibilité/SEO avec le changement de langue par défaut).
- **`fr.json` avait une divergence de clés avec `en.json`** (pas juste des
  trous — plus insidieux) : 15 clés existaient avec une **valeur vide
  `""`** (`profile.commissionPercentage`, `commissionFlat`,
  `bankAccountInfo`, `warning`, `clearMap`, `error.nameInvalid`,
  `titleInvalid`, `fleet.exclusitivityAreaTitle/Warning`,
  `cancelReasons.title/subtitle`, `cancelReason.title/subtitle`,
  `menu.management.orderCancelReasons`) — avec ngx-translate, une clé
  présente mais vide **ne déclenche pas le fallback anglais**, elle affiche
  silencieusement une chaîne vide (pire qu'une clé manquante). Une clé était
  carrément mal nommée : `profile.isEnabled` (vide) au lieu de
  `profile.visibilityStatus` (qui existe en anglais). Toutes ces 15 clés ont
  été traduites en français et la clé mal nommée corrigée. Vérifié
  programmatiquement (`node` + `flatten` récursif) : 328 clés EN = 328 clés
  FR, 0 clé manquante, 0 valeur vide des deux côtés après correctif.
- **Textes anglais en dur, non passés par le pipe `translate`**, trouvés et
  traduits dans les formulaires de création à fort trafic identifiés :
  `operator-new.component.html`, `rider-new.component.html`,
  `driver-new.component.html`, `fleet-new.component.html` (titres, sous-titres,
  labels de champ, bouton "Register", messages d'erreur de validation). 9
  nouvelles clés ajoutées sous un nouveau namespace `form.*` dans `en.json`/
  `fr.json` (`form.role`, `form.password`, `form.register`,
  `form.notValid{FirstName,LastName,UserName,Password,Email}`,
  `form.roleNotSelected`, `form.new{Rider,Driver,Operator,Fleet}.{title,
  subtitle}`), le reste réutilisant les clés `profile.*` déjà existantes
  (`firstName`, `lastName`, `phoneNumber`, `gender`, `email`, `userName`,
  `name`, `mobileNumber`, `address`, `commissionPercentage`, `commissionFlat`,
  `bankAccountInfo`) et `enum.gender.{male,female}` pour les options de genre
  (au lieu de `nzLabel="Male"` en dur).
- **Dette documentée, non traitée (périmètre trop large pour cette session)** :
  `management-region/region-view/region-view.component.html` a aussi du texte
  anglais en dur (labels "Name", "Currency", "Is Enabled", "Geofence", "Clear
  Map", nzTitle "New Region"...) — non traité par manque de temps, à faire
  dans une prochaine passe avec les mêmes clés `profile.*`/`form.*` déjà
  créées. Plus largement, un passage exhaustif sur tous les écrans de detail/
  vue (pas seulement les formulaires de création) reste à faire ; cette
  session a priorisé les écrans à fort trafic comme demandé.

### (e) Téléphone Sénégal (objectif 3)

- Défaut `phoneNumberPrefix`/`mobileNumberPrefix` (ou `phoneNumber.prefix`
  pour `driver-new`, structure en `FormGroup` imbriqué) changé de `'+1'` à
  `'+221'` dans les 4 formulaires : `rider-new.component.ts`,
  `driver-new.component.ts`, `operator-new.component.ts`,
  `fleet-new.component.ts` (ce dernier a **deux** champs préfixe —
  `phoneNumberPrefix` ET `mobileNumberPrefix` — les deux corrigés). Recherche
  exhaustive (`grep "'+1'"`) confirmant qu'aucun autre défaut `+1` ne subsiste
  dans le code applicatif (seules les entrées `+1` légitimes de
  `country-codes.ts`, la liste des indicatifs elle-même, subsistent).
- **Validation de format ajoutée**, nouveau fichier
  `apps/admin-panel/src/app/@services/phone-number.validator.ts` :
  `phoneNumberFormatValidator(prefixControlName)` — un `ValidatorFn` qui lit
  la valeur du contrôle préfixe frère dans le même `FormGroup` et applique
  `^7\d{8}$` (9 chiffres commençant par 7 — plages mobiles sénégalaises
  Orange/Free/Expresso) uniquement quand le préfixe vaut `+221` ; pour tout
  autre indicatif, reste permissif (`^\d{4,15}$`, chiffres uniquement, pas de
  contrainte de plage précise faute de connaissance métier par pays). Câblé
  sur les 4 formulaires, avec une souscription `valueChanges` sur le contrôle
  préfixe qui force `updateValueAndValidity()` sur le contrôle numéro à chaque
  changement d'indicatif (sinon la validation ne se réévaluerait qu'au
  prochain événement sur le champ numéro lui-même).
- **Note de cohérence transverse (pas traitée ici, hors périmètre
  admin-panel)** : l'audit `kasi-upgrade-tracker` a déjà signalé l'absence de
  validation téléphone côté mobile (`login_phone_number_bloc.dart`, item 1,
  priorité faible). À aligner un jour avec la règle `+221` / format
  sénégalais posée ici côté admin-panel, pour une cohérence backend/mobile/
  admin-panel — décision qui revient à une coordination inter-agents, pas à
  trancher unilatéralement ici.

### (f) Build & environnement — point d'attention pour les prochaines sessions

Le `node_modules` de l'hôte Windows (`app-ridy/node_modules`) est corrompu
pour au moins `ng-zorro-antd` (sous-dossiers `message/`, `modal/`, `upload/`,
`icon/` présents mais vides de leur contenu réel — `esm2022`/`fesm2022`
partiellement absents). Confirmé indépendant de nos changements (même échec
sur l'arbre stashé/propre). `npx nx build`/`serve` en dehors de Docker
échouent donc systématiquement sur cet hôte. **Seul le build via
`docker compose build admin-panel` fait foi** (le `Dockerfile` fait un
`npm ci` propre dans le conteneur) — les deux rebuilds effectués durant cette
session (avant/après les changements de traduction) ont réussi sans erreur TS/
template. Recommandation : réinstaller `node_modules` proprement sur l'hôte
(`rm -rf node_modules && npm ci`) avant toute session future nécessitant un
`ng serve` local rapide.

**Fichiers modifiés (admin-panel)** : `app.module.ts`, `app.component.ts`,
`index.html`, `assets/i18n/en.json`, `assets/i18n/fr.json`,
`cms/riders/rider-new/rider-new.component.{ts,html}`,
`cms/drivers/driver-new/driver-new.component.{ts,html}`,
`cms/management/management-users/operator-new/operator-new.component.{ts,html}`,
`cms/management/management-fleets/fleet-new/fleet-new.component.{ts,html}`,
nouveau fichier `@services/phone-number.validator.ts`. Aucune requête/mutation
GraphQL modifiée. Aucun changement de schéma de données (le correctif du
point (a) est une insertion de données dans l'environnement Docker local, pas
une migration).

---

## 2026-07-06 — admin-panel : terminologie "Kasiman" (fr/en), cartographie complète des écrans, vérification branding/auth/purchaseCode

### Contexte

Reprise du travail sur `apps/admin-panel` (Angular 16, cms/*) en s'appuyant sur
`KASI_NARRATIVE_VISION.md` : chez Kasi il n'existe pas de rôle "chauffeur"/
"livreur" séparé, il existe un **Kasiman** unique (moto, taxi historique,
camionnette). Les riders restent des clients ("passager"), jamais des
"Kasiman". Les deux décisions précédentes (2026-07-01 rebranding visuel,
2026-07-04 diagnostic routes/i18n/FR par défaut) ont été relues avant de
commencer — pas de re-travail redondant.

### (a) Cartographie complète des écrans (`cms/*`, `config/`, `login/`)

Routes lues dans `cms-routing.module.ts` + les `*-routing.module.ts` de
chaque sous-module ; opérations GraphQL lues dans les fichiers `.graphql`
co-localisés (consommés via des services typés générés par codegen,
`@kasi/admin-panel/generated/graphql`, ex. `DriversListGQL` — confirme
l'hypothèse "client GraphQL généré via codegen" posée dans le brief, pas
d'appels REST directs constatés dans `cms/`).

| Module | Route | But fonctionnel réel | GraphQL principal | Statut vision Kasi |
|---|---|---|---|---|
| Home/Overview | `/home/overview` | Dashboard : compteurs (commandes actives, Kasimen en attente, plaintes, SOS), carte Kasimen en ligne (Mapbox), 4 graphiques (revenu, courses, inscriptions Kasimen/passagers) | `Overview`, `OverviewDriverPaging`, `RequestsChart`, `IncomeChart`, `DriverRegistrations`, `RiderRegistrations` | Conservé, copy corrigée (Kasimen). Les 4 graphiques restent en erreur backend (SQL MySQL non porté vers Postgres, cf. 2026-07-04 bug 2) — hors périmètre admin-panel. |
| Home/Dispatcher | `/home/dispatcher` | Création manuelle d'une course pour un client (façon centre d'appel) : sélection passager → lieux → service → calcul tarif → création commande | `DispatcherCalculateFare`, `CreateOrder`, `OrderUpdated` (subscription), `CancelOrder` | Conservé tel quel, copy corrigée ("Cavalier"→"Passager", "conducteur éligible"→"Kasiman éligible"). |
| Drivers (liste) | `/drivers` | Liste des Kasimen inscrits, filtre/tri, suppression | `DriversList` | Conservé — c'est l'écran de gestion Kasimen central. Copy entièrement rebrandée. |
| Drivers (nouveau) | `/drivers/new` | Formulaire de création d'un Kasiman | `CreateDriver` | Conservé, copy rebrandée (`form.newDriver.*`). |
| Drivers (profil) | `/drivers/view/:id` (details/orders/financial/reviews/documents) | Détail Kasiman : infos, historique commandes, solde/transactions, avis reçus, documents (permis, pièce d'identité, etc.) | `ViewDriver`, `UpdateDriverProfile`, `UpdateDriverStatus`, `DriverFinancials`, `DriverFeedbacks`, `DriverOrders`, `CreateDriverTransaction`, `DeleteDriver` | Conservé, copy rebrandée. |
| Riders (liste/nouveau/vue) | `/riders`, `/riders/new`, `/riders/view/:id` (details/financials/orders/addresses) | Gestion des clients : liste, création, détail (solde, commandes, adresses enregistrées) | `RidersList`, `CreateRider`, `ViewRider`, `RiderAddresses`, `RiderWallet`, `RiderOrders`, `UpdateRider`, `CreateRiderTransaction`, `DeleteRider` | Conservé tel quel — les riders restent des clients, pas des Kasiman. Mistraduction "Cavalier" corrigée en "Passager". |
| Marketing/Coupons | `/marketing/coupons` | Codes de réduction utilisables par les clients sur leurs courses | `CouponList`, `ViewCoupon`, `CreateCoupon`, `UpdateCoupon`, `DeleteCoupon` | Conservé tel quel. |
| Marketing/Announcements | `/marketing/announcements` | Annonces diffusées (probablement push vers apps client/Kasiman) | `AnnouncementsList`, `ViewAnnouncement`, `CreateAnnouncement`, `UpdateAnnouncement`, `DeleteAnnouncement` | Conservé tel quel. |
| Marketing/Rewards | `/marketing/rewards` | Programme de parrainage/récompenses | `RewardList`, `ViewReward`, `CreateReward`, `UpdateReward` | Conservé tel quel. |
| Financials/Provider | `/financials/provider` | Transactions de la plateforme (wallet admin), export | `ProviderWalletsList`, `Export` | Conservé tel quel. |
| Financials/Fleet | `/financials/fleet` | Transactions des flottes (comptes entreprise regroupant plusieurs Kasimen) | `FleetWalletsList` | Conservé — correspond directement à l'usage "PME/entreprise" de la vision Kasi. |
| Financials/Driver | `/financials/driver` | Transactions/solde des Kasimen | `DriverWalletsList` | Conservé, copy rebrandée + 1 texte en dur corrigé (`'Driver not found'` → `'Kasiman not found'` dans `driver-wallets-list.component.html`, hors i18n). |
| Financials/Rider | `/financials/rider` | Transactions/solde des clients | `RiderWalletsList` | Conservé tel quel. |
| Requests (liste) | `/requests` | Liste des commandes/courses, filtre/tri | `OrdersList` | Conservé tel quel. |
| Requests (vue) | `/requests/view/:id` (info/activities/complaints/financials/chats/assign) | Détail d'une commande : infos, historique d'activité, plaintes liées, financier, chat, **assignation manuelle d'un Kasiman** (fallback dispatcher) | `ViewOrder`, `AvailableDriversForOrder`, `DriverSearch`, `AssignDriverToOrder` | Conservé, copy rebrandée (`requests.assign`) + 1 texte en dur corrigé (`View Driver` → `View Kasiman` dans `request-view-assign.component.html`). |
| Complaints | `/complaints` (liste + vue info/records) | Gestion des plaintes clients (soumise/en enquête/résolue) | `ComplaintsList`, `ViewComplaint`, `UpdateComplaintStatus` | Conservé tel quel. |
| SOS | `/sos` (liste + vue) | Signaux de détresse : suivi, historique d'action (contact Kasiman/autorités, résolu/fausse alerte) — fonctionnalité de sécurité cœur de la promesse Kasi | `SOSList`, `ViewSOS`, `CreateSOSActivity` | Conservé tel quel, copy rebrandée (`sosActivityAction.contactDriver`). |
| Management/Regions | `/management/regions` | Zones géographiques (polygones Mapbox Draw) déterminant la couverture de service | `RegionList`, `RegionView`, `CreateRegion`, `UpdateRegion` | Conservé (structure), pas de données Dakar encore saisies (hors code). |
| Management/Services | `/management/services` (+ category) | Catalogue des services proposés (types de course/livraison) et règles tarifaires (multiplicateurs horaires/distance/jour/date) | `ServicesList`, `ViewService`, `NewService`, `CreateService`, `UpdateService`, `DeleteService`, `SetRegionsOnService`, `SetOptionsOnService`, + catégories | Conservé structurellement — c'est ici que seraient définis les "trois usages" (moto/taxi/camionnette) de la vision Kasi ; contenu à peupler plus tard (hors code). |
| Management/Service Options | `/management/service-options` | Options additionnelles par service | `ServiceOptionsList`, `ServiceOptionView`, `CreateServiceOption`, `UpdateServiceOption` | Conservé tel quel. |
| Management/Order Cancel Reasons | `/management/order-cancel-reasons` | Motifs d'annulation proposés aux clients | `OrderCancelReasonList`, `OrderCancelReasonView`, `CreateOrderCancelReason`, `UpdateOrderCancelReason` | Conservé tel quel (copy déjà correcte, utilisait déjà "passagers"). |
| Management/Review Parameters | `/management/review-parameters` | Critères d'évaluation attribués au Kasiman après une course | `ReviewParametersList`, `ReviewParameterView`, `CreateReviewParameter`, `UpdateReviewParameter` | Conservé, copy rebrandée (subtitle "pilote"→"Kasiman"). |
| Management/Fleets | `/management/fleets` (liste/nouveau/vue details-financials-zone-prices) | Gestion des flottes (comptes entreprise groupant des Kasimen), zone d'exclusivité (Mapbox Draw) | `FleetsList`, `CreateFleet`, `ViewFleet`, `FleetFinancials`, `FleetZonePrices`, `FleetDrivers`, `UpdateFleet`, `CreateFleetTransaction` | Conservé — correspond à l'usage "PME/entreprise" de la vision. Copy rebrandée (`fleet.exclusitivityAreaWarning`). |
| Management/Zone Prices | `/management/zone-prices` | Tarifs spécifiques par zone de ramassage/destination | `ZonePricesList`, `ZonePriceView`, `ZonePriceNew`, `CreateZonePrice`, `UpdateZonePrice`, `DeleteZonePrice`, `SetZonePriceRelations` | Conservé tel quel. |
| Management/Cars | `/management/cars` | Catalogue véhicules (modèles/couleurs) utilisé sur le profil Kasiman | `CarsList`, `CreateCarModel`, `CreateCarColor`, `UpdateCarModel`, `UpdateCarColor`, `DeleteCarModel`, `DeleteCarColor` | **Divergence fonctionnelle à noter** : le modèle de données reste centré "voiture" (`carModel`, `carPlateNumber`...) alors que la vision Kasi inclut motos et camionnettes — pas un problème de copy mais de schéma/données, hors périmètre "textes" de cette session. Signalé pour coordination produit/`kasi-backend-services`. |
| Management/Payment Gateways | `/management/payment-gateways` | Configuration des passerelles de paiement | `PaymentGateways`, `ViewPaymentGateway`, `CreatePaymentGateway`, `UpdatePaymentGateway` | Conservé tel quel. |
| Management/Users | `/management/users` (+ user-roles) | Comptes opérateurs back-office (staff admin, pas Kasiman/client) et leurs rôles/permissions | `UsersList`, `CreateOperator`, `ViewOperator`, `UpdateOperator`, `Roles`, `Role`, `CreateRole`, `UpdateRole` | Conservé tel quel — terminologie déjà correcte ("Opérateur"/"Utilisateurs"), aucun rapport avec Kasiman. |
| Management/Settings | `/management/settings` | Formulaire de changement de mot de passe de l'opérateur connecté | `UpdatePassword` | Conservé tel quel. |
| Config (première installation) | `/config` | Assistant de première configuration (clé Mapbox — libellée "Google Maps API Key", legacy — + clé privée Firebase FCM) | `CurrentConfiguration`, `UpdateMapsAPIKey`, `UpdateFirebase` | Dette déjà documentée le 2026-07-04, non re-traitée ici (hors ask du jour, écran non affiché en usage normal). |
| Login | `/login` | Authentification opérateur (email/mot de passe → JWT) | `Login` | Conservé tel quel. Voir (d) pour la vérification du mécanisme d'auth. |

### (b) Corrections de terminologie appliquées

**`fr.json`** — remplacement de toutes les valeurs (jamais les clés JSON) où
"chauffeur"/"conducteur"/"pilote" désignaient le rôle Kasiman, dans les
titres d'écran, boutons, labels et messages (ex. `"DriverAccepted": "Chauffeur
accepté"` → `"Kasiman accepté"`, `"assign": "Attribuer un chauffeur (Alpha)"`
→ `"Attribuer un Kasiman (Alpha)"`, `form.newDriver.title` "Nouveau chauffeur"
→ "Nouveau Kasiman", etc. — 39 valeurs corrigées au total dans ce fichier).
Mistraduction `"rider": "Cavalier"` (faux-ami — "Cavalier" = "horseman" en
français, aucun rapport avec un passager) corrigée en **"Passager"**,
cohérent avec les occurrences déjà correctes présentes ailleurs dans le même
fichier (`RiderCanceled: "Passager annulé"`, `riderInfo: "Informations sur le
passager"`, `form.newRider`). Une deuxième mistraduction du même type trouvée
et corrigée au passage : `table.viewRider: "Voir l'avenant"` ("avenant" =
terme d'assurance/droit, faux-ami de "rider" au sens anglais) → "Voir le
passager". Une troisième trouvée : `overview.chart.newRiderRegisters:
"Nouvelles inscriptions de coureurs"` ("coureurs" = "runners") → "Nouvelles
inscriptions de passagers".

**`en.json`** — même passe, `driver`→`Kasiman` uniquement quand la valeur
désigne le rôle (27 valeurs corrigées). Vérifié : `"rider": "Rider"` est déjà
correctement traduit en anglais (terminologie standard des apps de VTC,
contrairement au français) — **aucune correction nécessaire côté "rider" en
anglais**, conformément à la consigne de vérification.

**Convention de pluriel adoptée pour "Kasiman"** (aucun précédent trouvé dans
le repo au-delà des noms de dossiers `kasiman-ios`/`kasiman-android` de la
configuration Firebase, qui ne sont pas des cas d'usage grammatical) :
singulier **Kasiman**, pluriel **Kasimen** — par analogie explicite avec
"taximan" citée dans `KASI_NARRATIVE_VISION.md`, et cohérent avec l'usage
ouest-africain/sénégalais courant du pluriel "taximen". À documenter dans un
futur guide de style si d'autres modules (mobile, landing) doivent employer
ce terme, pour éviter une divergence "Kasimans" vs "Kasimen" entre équipes.

**Textes en dur (hors i18n) trouvés et corrigés**, strictement limités aux
occurrences du mot "Driver" (recherche `grep` non limitée à `drivers/*` —
étendue à tout `cms/**/*.html` pour ne rien manquer) :
- `cms/financials/driver-wallets/driver-wallets-list.component.html:33` —
  `'Driver not found'` → `'Kasiman not found'`
- `cms/management/management-services/management-services-view/
  management-services-view.component.html:134` — `Cancellation Driver Share`
  → `Cancellation Kasiman Share`
- `cms/requests/request-view/request-view-assign/
  request-view-assign.component.html:67` — `View Driver` → `View Kasiman`

**Dette signalée, non traitée (hors ask du jour)** : ces deux derniers
composants (`management-services-view.component.html`,
`request-view-assign.component.html`) contiennent d'autres textes anglais en
dur non liés au rebranding Kasiman (ex. `Cancellation Total Fee`, `Assign`,
`from {{ reviewCount }} reviews`) — même limite déjà documentée pour
`region-view` le 2026-07-04 (dette i18n plus large que le périmètre "textes
à fort trafic" traité jusqu'ici). Aucun template de `drivers/*` ni
`management-users/*` ne contient de texte en dur (vérifié explicitement,
conformément à la consigne) — ces deux modules passent déjà entièrement par
le pipe `translate`.

### (c) État du branding — aucune régression après les rebuilds Docker

Vérifié après les correctifs Docker/nginx récents :
- Les 5 fichiers logo Kasi du 2026-07-01 sont toujours présents dans
  `src/assets/` (`logo-kasi-blue.ico/png`, `logo-kasi-white.ico/png`,
  `logo-kasi.png`).
- `favicon.ico` (`src/favicon.ico`) est **binairement identique**
  (`cmp`, 6481 octets) à `logo-kasi-blue.ico` — pas de régression du favicon.
- `login.component.html` et `cms.component.html` référencent bien
  `logo-kasi-blue.png`/`logo-kasi-white.png` (les actions listées comme "à
  faire" le 2026-07-01 avaient déjà été faites entre-temps).
- `manifest.webmanifest` : `name`/`short_name`/`theme_color` déjà Kasi
  (`"Kasi Admin Panel"`, `"Kasi"`, `#1976d2`).
- `index.html` : palette du spinner déjà bleue Kasi (`#1976d2` /
  `rgba(61,175,255,1)`), aucune trace de rose Ridy.
- localStorage key déjà `kasi_admin_token` partout (9 fichiers vérifiés).

**Conclusion : aucune action requise sur le branding, tout le travail du
2026-07-01 tient toujours après les rebuilds ultérieurs.**

### (d) Authentification admin — vérifiée, pas de couplage Firebase à signaler

L'authentification de l'admin-panel **n'utilise pas Firebase Auth** :
`login.graphql` (`query Login($username, $password) { login(...) { token } }`)
appelle une résolution GraphQL côté `admin-api` qui vérifie l'`operator` en
base Postgres et renvoie un JWT applicatif, stocké dans
`localStorage['kasi_admin_token']` et vérifié par `login.guard.ts` (simple
présence du token, pas de décodage/validation côté client). C'est un
mécanisme **indépendant** de Firebase, propre à l'admin-panel — contrairement
à ce que le brief supposait par analogie avec les autres modules (mobile).
Le seul couplage Firebase du périmètre admin-panel reste celui déjà documenté
le 2026-07-01 (`firebaseProjectPrivateKey`, utilisé uniquement pour
configurer FCM côté serveur via l'écran `/config`, déjà signalé à
`kasi-integrations-auditor`) — **rien de nouveau à signaler ici**.

### (e) Point `purchaseCode` (diagnostic du 2026-07-04) — déjà résolu, vérifié

Vérification de `config.guard.ts`, `config.component.ts` et
`app.component.ts` : les trois utilisent déjà exclusivement
`firebaseProjectPrivateKey == null` comme signal "système non configuré"
(pas `purchaseCode`). Ce point, ouvert dans le brief de démarrage, était en
réalité **déjà corrigé** par la session du 2026-07-04 (`app.component.ts`,
point (b) de cette entrée) et propagé aux deux autres fichiers. La seule
occurrence restante de `purchaseCode` dans `apps/admin-panel` est dans
`generated/graphql.ts` (fichier codegen, champ de schéma toujours valide côté
API — normal, pas un résidu à nettoyer). **Rien à faire.**

### Fichiers modifiés

- `assets/i18n/fr.json` (39 valeurs terminologiques corrigées)
- `assets/i18n/en.json` (27 valeurs terminologiques corrigées)
- `cms/financials/driver-wallets/driver-wallets-list.component.html` (1 texte en dur)
- `cms/management/management-services/management-services-view/management-services-view.component.html` (1 texte en dur)
- `cms/requests/request-view/request-view-assign/request-view-assign.component.html` (1 texte en dur)

Aucune requête/mutation GraphQL modifiée. Aucun changement de schéma.

### Points restés ouverts (délégués)

- **16 locales non traitées** (`ar`, `bn`, `de`, `es`, `hi`, `hy`, `id`, `it`,
  `ja`, `ko`, `pt`, `ro`, `ru`, `sv`, `ur`, `zh`) — hors scope de cette
  session (FR prioritaire pour Dakar/Sénégal, EN en second) ; contiennent
  très probablement les mêmes occurrences "Driver"/mistraductions "rider" à
  corriger si ces marchés sont un jour activés.
- **Modèle de données véhicule centré "voiture"** (`management-cars`,
  `carModel`/`carPlateNumber` sur le profil Kasiman) alors que la vision
  Kasi couvre moto/taxi/camionnette — divergence fonctionnelle à trancher
  au niveau produit/schéma, pas une correction de copy. À transmettre à
  `kasi-backend-services`.
- **Config wizard (`/config`)** : vocabulaire "Google Maps API Key" pour un
  token Mapbox — dette déjà documentée le 2026-07-04, toujours ouverte,
  non re-traitée ici (écran non affiché en usage normal, hors ask du jour).
- **Textes anglais en dur restants**, non liés à la terminologie Kasiman,
  dans `management-services-view.component.html` et
  `request-view-assign.component.html` (ex. `Cancellation Total Fee`,
  bouton `Assign`, `from {{ reviewCount }} reviews`) — à traiter dans une
  future passe i18n élargie, comme `region-view` déjà signalé le 2026-07-04.
- **Convention de pluriel "Kasimen"** posée unilatéralement ici (aucun
  précédent trouvé) — à valider/diffuser comme guide de style si d'autres
  agents (mobile, landing) doivent introduire le terme "Kasiman" dans leurs
  propres textes, pour éviter une divergence de pluriel entre modules.

---

## 2026-07-06 — admin-panel : couverture i18n manquante (textes en dur au-delà de la terminologie Kasiman)

### Contexte

Suite à une capture d'écran utilisateur montrant l'écran Gestion > Régions
avec des libellés entièrement en anglais non traduits (y compris une faute
de frappe "Pramaters"), reprise complète du sujet déjà partiellement
documenté le 2026-07-06 (entrée précédente) : cette fois l'audit ne se
limite plus au mot-clé "Driver", il couvre tout texte visible non câblé via
le pipe `translate`, sur `cms/**`, `config/**`, `login/**` et
`@components/**`.

**Constat de départ confirmé et bien plus large que prévu** : un grep de
`nzTitle="..."` (chaîne statique, pas liée par `[nzTitle]`) sur tout
`cms/**/*.html` remonte des dizaines de fichiers avec en-têtes de
page-header entièrement en dur (`Fleets`, `Complaints`, `Rider Wallets`,
`SOS`, `Riders`, `Driver Wallets`, `Payment Gateways`, `Cars`, `Coupons`,
`Announcements`, `User Roles`, etc.) — la dette i18n touche pratiquement
tout l'admin-panel, pas seulement `region-view`. Vu l'ampleur, cette passe a
priorisé les écrans à fort trafic explicitement listés dans la consigne
(Régions, Tarifs zonaux, Flottes, Répartiteur, Aperçu) plus `login/` (petit
périmètre, explicitement dans le scope), et deux bonus à coût nul
(`review-parameter-view` qui portait la même faute de frappe "Pramaters"
que `region-view`, et deux sélecteurs "Driver"/"Rider" non traduits dans
`announcement-view`/`order-cancel-reason-view` directement liés à la
terminologie Kasiman déjà actée).

### (a) Fichiers `.html` modifiés (16) et ce qui a été traduit

| Fichier | Textes en dur corrigés |
|---|---|
| `cms/management/management-region/region-view/region-view.component.html` | `nzTitle`/`nzSubtitle` (avec la faute "Pramaters" corrigée), bouton "Clear Map", labels "Name"/"Currency"/"Is Enabled"/"Geofence" |
| `cms/management/management-region/region-list/region-list.component.html` | `nzTitle="Regions"` / `nzSubtitle="List of all the regions app operates within"` |
| `cms/management/management-zone-prices/zone-price-view/zone-price-view.component.html` | `nzTitle`/`nzSubtitle`, `nzErrorTip` nom invalide, 2× `nzPlaceHolder="Please select"`, template `#tagPlaceHolder` ("and N more selected", **actuellement du code mort** — non branché via `[nzMaxTagPlaceholder]` sur le `nz-select`, corrigé par hygiène mais pas visible aujourd'hui), `nzTitle="Time Multiplier"`, bouton "Save" |
| `cms/management/management-fleets/fleets-list/fleets-list.component.html` | `nzTitle="Fleets"` / `nzSubtitle="List of all the fleets registered"` |
| `cms/management/management-fleets/fleet-view/fleet-view-details/fleet-view-details.component.html` | Label "Fee Multiplier" (seul texte en dur du fichier, sinon déjà entièrement traduit) |
| `cms/home/dispatcher/dispatcher-looking/dispatcher-looking.component.html` | "Looking For suitable driver. Please wait...", 3× "View Request Details", "Cancel Request", message d'acceptation Kasiman (nom/tél. restent interpolés hors traduction), "Trip status is updated to {{status}}." (interpolation via `translate:{status:...}`) |
| `cms/home/dispatcher/dispatcher-service-select/dispatcher-service-select.component.html` | Titre "Time" |
| `cms/home/dispatcher/dispatcher-riders-list/dispatcher-riders-list.component.html` | Placeholder "Search Mobile Number" |
| `cms/drivers/drivers-list/drivers-list.component.html` | Placeholder "Search Mobile Number" (même chaîne dupliquée) |
| `cms/riders/riders-list/riders-list.component.html` | `nzTitle="Riders"` / `nzSubtitle="List of all the clients registered"`, placeholder "Search Mobile Number" |
| `cms/home/overview/overview-drivers-map/overview-drivers-map.component.html` | Lien "Show on Map" (seul texte en dur du fichier) |
| `login/login.component.html` | Titre "Login", message de validation "Please input your username!", placeholders "Username"/"Password", bouton "Log in" |
| `cms/management/management-review-parameters/review-parameter-view/review-parameter-view.component.html` | `nzTitle`/`nzSubtitle` (même faute "Pramaters" que region-view), label "Title" (réutilise `profile.title`), `nzErrorTip`, "Is Good", bouton "Save" |
| `cms/management/management-review-parameters/review-parameters-list/review-parameters-list.component.html` | En-tête de colonne "Type" (réutilise `profile.type`), tags "Good"/"Bad" |
| `cms/marketing/announcements/announcement-view/announcement-view.component.html` | Label "User Type", placeholder "Please select", options `nzLabel="Driver"`/`"Rider"` non traduites (`nzValue` backend inchangé, seul le libellé affiché devient Kasiman/Passager via `profile.driver`/`profile.rider`) |
| `cms/management/management-order-cancel-reason/order-cancel-reason-view/order-cancel-reason-view.component.html` | Même correctif que ci-dessus (label "User Type", placeholder, options Driver/Rider) |

Convention respectée : aucune requête/mutation GraphQL touchée — les
`nzValue="Driver"/"Rider"` (valeurs d'enum backend) sont restées inchangées
dans `announcement-view` et `order-cancel-reason-view`, seul le `nzLabel`
affiché a été rebranché sur `translate`.

### (b) Clés i18n ajoutées

**39 nouvelles clés** ajoutées à parts égales dans `fr.json` et `en.json`
(structure vérifiée programmatiquement identique entre les deux fichiers,
361 clés-feuilles de chaque côté après ajout) :

- Nouvelles sections top-level : `region` (title/subtitle/geofence),
  `regions` (title/subtitle liste), `fleets` (title/subtitle liste),
  `reviewParameter` (title/subtitle/isGood/good/bad), `login`
  (title/usernameRequired/username/submit).
- Extensions de sections existantes : `profile` (+pleaseSelect,
  +searchMobileNumber, +userType), `fleet` (+feeMultiplier), `zonePrice`
  (+title/subtitle/timeMultiplierTitle/moreSelected), `dispatcher.looking`
  (+waitMessage), `dispatcher` (+viewRequestDetails, +cancelRequest,
  +driverAcceptedRequestSuffix, +tripStatusUpdated, +time), `overview`
  (+showOnMap), `riders` (+title/subtitle).
- Réutilisation systématique des clés génériques déjà existantes plutôt que
  duplication : `profile.name`, `profile.currency`, `profile.visibilityStatus`
  (pour les toggles "Is Enabled", cohérent avec l'usage déjà établi ailleurs
  dans le repo, ex. `payment-gateway-view`), `profile.clearMap`,
  `error.nameInvalid`, `profile.saveChanges`, `profile.title`, `profile.type`,
  `profile.driver`/`profile.rider` (déjà = "Kasiman"/"Passager" depuis la
  session précédente).
- Deux clés utilisent l'interpolation de paramètre ngx-translate (`{{ 'clé'
  | translate: { param: valeur } }}`, valeur contenant `{{param}}`) —
  premier usage de ce pattern dans le repo : `zonePrice.moreSelected`
  (`{{count}}`) et `dispatcher.tripStatusUpdated` (`{{status}}`). Le nom/
  téléphone du Kasiman dans le message d'acceptation de course restent
  interpolés directement dans le template (hors traduction), seule la
  phrase de queue est traduite.
- Correction de la faute de frappe "Pramaters" → clés `region.subtitle` et
  `reviewParameter.subtitle` rédigées proprement dès la création (pas de
  clé fautive committée à un moment donné).

### (c) Menu latéral "Cavaliers" — déjà corrigé, rien à refaire

Vérifié : `menu.riders` et `menu.accounting.riders` valent déjà
**"Passagers"** dans `fr.json` (correction faite lors de la session
précédente du 2026-07-06, cf. mistraduction "Cavalier" → "Passager"
documentée plus haut). Aucune autre clé de navigation ne contient
"Cavalier"/"Cavaliers" (recherche exhaustive dans `fr.json` et dans tous
les templates `cms/**/*.html`, zéro résultat). Le "Cavaliers" vu sur la
capture d'écran utilisateur provient donc soit d'un build/cache navigateur
antérieur à la correction du 2026-07-06, soit d'un bundle Angular non
reconstruit depuis — **aucune action supplémentaire nécessaire côté code**,
un rebuild/vidage de cache résoudra l'affichage.

### (d) Ce qui reste incomplet (dette documentée, pas traitée dans cette passe)

L'ampleur réelle dépasse largement le périmètre traitable en une session
(quasiment tous les `nz-page-header` de l'admin-panel ont un `nzTitle`/
`nzSubtitle` en dur). Restent non traités, par ordre de trafic estimé :

- **Listes de portefeuilles financiers** : `financials/rider-wallets`,
  `financials/fleet-wallets`, `financials/driver-wallets`,
  `financials/admin-transactions` — `nzTitle`/`nzSubtitle` en dur.
- **Plaintes et SOS** : `complaints-list`, `sos-list` — `nzTitle`/
  `nzSubtitle` en dur ("Complaints submitted by riders/drivers", "Distress
  Signals submitted by users").
- **Gestion** : `management-users/users-list`, `management-roles/roles-list`
  + `role-view`, `management-cars/management-cars-list` (3 `nzTitle` dont 2
  sur des sous-tableaux "Models"/"Colors"), `management-service-options/
  service-option-view`, `management-services/management-service-category-view`,
  `management-payment-gateways/payment-gateways-list`.
- **`management-services-view.component.html`** : dette déjà signalée le
  2026-07-06 (entrée précédente) et confirmée toujours présente — 5
  `nzTitle` de cartes ("Time of the day Multiplier", "Distance Multiplier",
  "Weekday Multipliers", "Date range Multiplier", "Ride preferences") plus
  `nzTitle="Service"` du page-header principal.
- **Marketing** : `coupons-list`, `announcements-list`,
  `announcement-view` (nzTitle "Announcement" du page-header — le
  sélecteur Driver/Rider de ce même fichier a lui été corrigé, cf. (a)).
- **Financials détails** : `driver-profile-financial`, `rider-view-financials`,
  `fleet-view-financials` — `nzTitle="Transactions Records"` / `"Wallet
  Summary"` répétés dans les 3 fichiers (bon candidat pour une clé
  partagée `profile.transactionsRecords`/`profile.walletSummary` lors
  d'une future passe). `request-view-financials` (`nzTitle="Fleet"`).
- **`driver-profile.component.html`** : `nzTitle="Rating summary"` sur un
  `nz-descriptions-item`.
- **Assistant de configuration (`config/config.component.html`)** :
  entièrement en dur (étapes, placeholders, hint upload Firebase, boutons
  Previous/Next/Done, écran de succès) — dette déjà documentée deux fois
  (2026-07-04 et 2026-07-06 précédent) comme non prioritaire car "écran non
  affiché en usage normal" ; toujours non traitée, décision maintenue.
- **`request-view-assign.component.html`** et
  **`management-services-view.component.html`** : dette déjà signalée le
  2026-07-06 précédent (ex. "Cancellation Total Fee", bouton "Assign",
  "from {{ reviewCount }} reviews", placeholder "Enter driver last name or
  mobile number") — toujours non traitée, pas re-couverte ici.
- **`dispatcher-success-driver-info.component.html`** : contient uniquement
  le texte de scaffold Angular CLI `"dispatcher-success-driver-info
  works!"` — composant orphelin (non référencé dans aucune route/template
  trouvée), probable code mort plutôt qu'un écran réel à traduire ; signalé
  pour vérification/suppression plutôt que traduction.
- **`@components/translate-dummy.html`** : fichier d'extraction de clés
  dynamiques (non rendu en usage normal), contient un bug pré-existant sans
  rapport avec cette passe — les 6 clés `sosActivityAction.*` utilisent le
  pipe mal orthographié `tranlate` au lieu de `translate`. Sans impact
  runtime direct (les mêmes clés sont utilisées correctement ailleurs avec
  le bon pipe, ex. `sos-view-info`), mais si un outil d'extraction i18n
  scanne ce fichier pour générer la liste des clés utilisées, ces 6 clés
  pourraient être manquées. Signalé, non corrigé (hors périmètre "textes
  visibles").
- **16 locales non FR/EN** : toujours hors scope (déjà acté), contiennent
  les mêmes textes anglais en dur d'origine.

**Recommandation pour une prochaine passe** : vu le volume, un futur tour
gagnerait à traiter le sujet par extraction automatisée (script grep sur
`nzTitle="[A-Za-z]`, `nzSubtitle="[A-Za-z]`, `placeholder="[A-Za-z]`,
`nzErrorTip="[A-Za-z]` dans tout `cms/**/*.html`) plutôt que fichier par
fichier, pour garantir l'exhaustivité plutôt que de repasser derrière une
priorisation manuelle par écran.

---

## 2026-07-10 — Audit pré-lancement : 8 travaux restants bouclés en une session (backend, admin-panel, mobile, landing)

**Contexte** : audit complet des points ouverts du journal (relecture intégrale
des entrées 2026-07-01 → 2026-07-06) recoupé avec l'état réel du code, en vue
du lancement (VPS acheté le 2026-07-09). Constat notable : la grosse dette i18n
admin-panel listée le 2026-07-06 (d) — financials, complaints, sos, management,
services-view, request-view-assign — **était déjà résolue** entre-temps (grep
attributs `nzTitle=`/`nzSubtitle=`/`placeholder=` : plus aucun texte en dur hors
`config/`), cohérent avec le commit `01eaec5 feat(i18n)`.

**Corrections appliquées et vérifiées** :

1. **`AccountingService` porté vers Postgres** (`apps/admin-api/.../accounting.service.ts`) —
   backticks retirés, `UNIX_TIMESTAMP(ANY_VALUE(x))` → `EXTRACT(EPOCH FROM MIN(x))`,
   `CURDATE()` → `CURRENT_DATE`, `INTERVAL 6 MONTH` → `INTERVAL '6 months'`,
   `DAYOFYEAR/WEEKOFYEAR/MONTH/YEAR` → `EXTRACT(DOY/WEEK/MONTH/YEAR FROM x)`,
   colonnes camelCase quotées. Casts `::int` (COUNT) et `::float8` (SUM, epoch) pour
   que le driver `pg` renvoie des `number` JS (pas des strings) comme MySQL avant.
   **Vérifié** : les 4 requêtes (une par variante de timeframe) exécutées avec succès
   contre le Postgres Docker vivant (`ON_ERROR_STOP=1`, une vraie ligne renvoyée sur
   driverRegistrations). Répare les 4 graphiques de /home/overview (bug 2 du 2026-07-04).
2. **`create_superuser.sql` corrigé** — INSERT `operator_role` 'admin' avec les 31
   permissions de l'enum + `roleId` câblé par sous-requête (pas d'id en dur).
   **Vérifié** : fichier rejoué (identifiants substitués) dans une transaction
   ROLLBACK contre la base vivante — 2×INSERT OK.
3. **Gardes null sur les permissions** — les 20 accès `operator.role.permissions`
   (12 fichiers : 9 authorizers + operator.service + driver/rider.resolver +
   feedback-parameter.authorizer) passés en `operator.role?.permissions` : un
   opérateur sans rôle est désormais refusé (401/Forbidden) au lieu d'un crash 500.
4. **Duplication CORS résolue sans toucher aux APIs** — `proxy_hide_header` des 6
   en-têtes Access-Control-* dans les 3 blocs proxy de `.nginx/default.conf` ;
   `app.enableCors()` conservé dans les 3 main.ts (accès direct :3000/:3001/:3002
   en dev). **Vérifié** : `nginx -t` OK, reload, preflight OPTIONS 204 avec un seul
   jeu d'en-têtes, POST via proxy = exactement 1 `Access-Control-Allow-Origin`.
5. **`privacy.mdx` de la landing réécrit** — politique de confidentialité française
   propre à Kasi (données collectées réelles : compte OTP, géoloc, courses,
   paiements, SOS, docs Kasiman ; loi sénégalaise n° 2008-12, CDP ; contact@kasi.sn),
   remplace le template "Example Site / California / 2021".
6. **Écran `/config` rebrandé + i18n** — vocabulaire "Google Maps API Key" → tokens
   Mapbox (dette du 2026-07-04/06), tous les textes en dur câblés sur le pipe
   `translate` (template + messages TS via `TranslateService.instant`), nouvelle
   section `config.*` (18 clés) dans en.json/fr.json. Parité vérifiée
   programmatiquement : 500 clés EN = 500 FR, 0 manquante. + typo pipe `tranlate` →
   `translate` corrigée (6 clés sosActivityAction de translate-dummy.html).
7. **Composant orphelin supprimé** — `dispatcher-success-driver-info` (scaffold
   "works!", route commentée, sélecteur jamais utilisé — confirmé par grep) retiré
   avec ses références dans dispatcher.module.ts et dispatcher-routing.module.ts.
8. **Validation téléphone mobile alignée sur l'admin-panel** —
   `login_number_page.dart` (rider-app) : validateur `^7\d{8}$` si +221, sinon
   `^\d{4,15}$` (réutilise la clé l10n existante `login_cell_number_empty_error`,
   déjà libellée "format correct" — aucune régénération l10n nécessaire) ;
   `CountryCodePicker.onChanged` tient `countryCode` à jour pour que le validateur
   lise le pays réellement sélectionné. Et `defaultCountryCode` de
   `libs/client-shared/lib/config.dart` passé de "US" à "SN" (cohérence marché).
   **Vérifié** : `flutter analyze` → No issues found. Clôt l'item 1 d'UPDATES.md.

**Vérification de compilation** : rebuild Docker `admin-api` + `admin-panel`
lancé en fin de session pour valider TS/AOT (seul build faisant foi, node_modules
hôte corrompu — cf. 2026-07-04 (f)). Résultat consigné dans l'entrée suivante si
échec ; les conteneurs en cours d'exécution utilisent l'ancien code tant qu'ils
n'ont pas été rebuild/redémarrés.

**Restent ouverts (bloqués sur décision/action utilisateur, pas sur du code)** :
- Déploiement VPS : secrets GitHub `DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_SSH_KEY`,
  `IMAGE_REGISTRY` dans `/opt/kasi/.env`, certbot SSL (cf. 2026-07-03).
- Choix des passerelles de paiement marché Sénégal (Wave/Orange Money ?) —
  préalable aux chantiers payout/carte enregistrée (items 15/16 UPDATES.md).
- Implémentations alternatives Firebase (ntfy/Gotify, KasiOtp, Sentry) — étape 6
  du plan d'abstraction, sur décision d'équipe.
- `synchronize: true` → vraies migrations TypeORM avant la prod (dette 2026-07-03).
- Modèle véhicule centré "voiture" vs vision moto/taxi/camionnette (produit/schéma).
- `flutterfire configure` (régénération firebase_options.dart), bump SDK Firebase
  Dart/BOM, npm audit fix (statut non confirmé), NestJS 11 / Angular 18,
  16 locales admin-panel non FR/EN, items UPDATES.md restants (3/4/6/7/8/11/18/19).

---

## 2026-07-10 — Incident au redéploiement : la config runtime des APIs ne survivait pas à la recréation des conteneurs (corrigé par volume)

**Découverte** : après rebuild + `docker compose up -d admin-api` (validation des
correctifs de la session), l'admin-api est reparti en mode « non configuré »
(schéma GraphQL réduit à `currentConfiguration`, log `Firebase config not found`).
Cause : `config/config.production.json` **et** la clé de service Firebase uploadée
via l'écran `/config` sont écrits par `ConfigurationService` dans
`/app/config/` — le système de fichiers du conteneur, sans volume. Toute
recréation de conteneur (rebuild, changement de compose, futur déploiement VPS)
perdait silencieusement la configuration. Le chargement du module complet
(`admin-api.module.ts`) exige `firebaseProjectPrivateKey != null` ET la présence
du fichier de clé sur disque.

**Correctif appliqué** :
- `docker-compose.yml` : bind mount `./config:/app/config` ajouté aux **3 APIs**
  (admin, driver, rider — le `FirebaseNotificationModule` de driver/rider lit le
  même chemin).
- `app-ridy/config/config.production.json` recréé côté hôte avec le token Mapbox
  public (récupéré depuis `MAPBOX_TOKEN` du `.env`) dans `backendMapsAPIKey` et
  `adminPanelAPIKey` ; `firebaseProjectPrivateKey: null` en attendant la clé.
- `.gitignore` : `/config/` ajouté (le fichier contient des tokens).
- **Vérifié** : conteneurs recréés, `currentConfiguration` renvoie bien le token
  Mapbox depuis le fichier monté.

**Action utilisateur requise pour retrouver le schéma complet** : télécharger la
clé de service du projet Firebase `kasi-v1` (console → Paramètres → Comptes de
service → « Générer une nouvelle clé privée »), déposer le JSON dans
`app-ridy/config/`, renseigner son nom de fichier dans
`config.production.json` (`"firebaseProjectPrivateKey": "<nom-du-fichier>.json"`)
— ou passer par l'assistant `/config` de l'admin-panel (étape 2), qui écrit
désormais dans le volume persistant — puis `docker compose restart admin-api
driver-api rider-api`.

**Conséquence sur la vérification des graphiques** : le test de bout en bout
GraphQL (`incomeChart` etc.) reste impossible tant que le schéma complet n'est
pas rechargé — la validation SQL directe contre Postgres (4 requêtes OK, cf.
entrée précédente) fait foi en attendant.

**Leçon pour le déploiement VPS** : ce bug aurait fait perdre la configuration à
chaque `docker compose pull && up` de mise à jour en production. À intégrer au
runbook de déploiement : le dossier `/opt/kasi/config/` devra être provisionné
avec la clé Firebase avant le premier démarrage.

---

## 2026-07-10 — Décision utilisateur : passerelle de paiement = Bictorys (Wave + Orange Money)

**Décision** : pour le marché Sénégal, Kasi passera par **Bictorys**
(agrégateur de paiement couvrant Wave et Orange Money, entre autres) plutôt
que d'intégrer chaque fournisseur mobile money séparément.

**Conséquences** :
- Débloque l'arbitrage laissé ouvert depuis l'audit intégrations du
  2026-07-01 (« quels marchés/gateways ? ») et conditionnant les items 14/15/16
  d'UPDATES.md (gift cards batch, payout, carte enregistrée).
- Bictorys ne figure pas dans les ~20 gateways du template Ridy d'origine
  (enum GraphQL + formulaire admin `payment-gateway-view`) : c'est une
  **intégration à développer** (API Bictorys : checkout/paiement direct +
  webhooks de confirmation), à cadrer par `kasi-integrations-auditor` puis
  implémenter par `kasi-backend-services` derrière le `PaymentGatewayAdapter`
  recommandé le 2026-07-01.
- Le paiement espèces reste le mode par défaut en attendant.

**Reste à faire (nouveau chantier, non commencé)** : créer un compte marchand
Bictorys, obtenir les clés API sandbox, spécifier le flux (paiement de course
côté rider-app, recharge wallet, payout Kasimen ?), puis implémenter.

---

## 2026-07-10 — Nouveau repo GitHub (Kasi-projet-vtc), historique purgé d'un token Mapbox secret, CI/CD corrigée, 502 nginx expliqué

**Contexte utilisateur** : ancien repo GitHub supprimé ; nouveau =
`https://github.com/ZayTauven/Kasi-projet-vtc` ; décision : ne versionner que
`app-ridy/` (le repo git racine reste local, non poussé).

**Constat** : `app-ridy/` avait déjà son propre repo git (3 commits, remote =
ancien repo supprimé). Le push vers le nouveau repo a été **bloqué par la push
protection GitHub** : le commit historique `e75ca5f` contenait un **token
Mapbox secret (sk.…)** dans `environment.prod.ts`, `environment.ts` et
`libs/client-shared/lib/config.dart` (fichiers nettoyés depuis dans HEAD, mais
pas l'historique).

**Décisions/exécution** :
- Historique réécrit : branche orpheline → un commit initial propre reprenant
  l'état du jour (aucun secret, validé par la push protection au push suivant).
  Perte assumée des 3 anciens messages de commit (faible valeur, dont un
  "first commit" massif).
- **⚠️ Le token Mapbox `sk.…` doit être RÉVOQUÉ/ROTATIONNÉ** dans le dashboard
  Mapbox (il a vécu dans l'ancien repo GitHub avant sa suppression — considéré
  compromis). Le token public `pk.…` du `.env` n'est pas concerné (publiable
  par nature).
- Remote `origin` → nouveau repo, branche `main` poussée + 2 commits de fix.

**CI/CD — 2 bugs corrigés après le premier push réel** (premier passage des
workflows sur GitHub, jamais exécutés avant) :
1. `ci.yml` : `npm ci` nu → échec ERESOLVE (conflit peer-deps
   ngx-mapbox-gl/Angular 16). Corrigé : `npm ci --legacy-peer-deps` (3 jobs),
   aligné sur les 4 Dockerfiles qui utilisaient déjà ce flag.
2. `deploy.yml` : tags `ghcr.io/${{ github.repository }}/…` → échec garanti,
   GHCR exige des noms en minuscules or le repo contient des majuscules
   (`ZayTauven/Kasi-projet-vtc`). Corrigé : étape `Lowercase repository name`
   (`${GITHUB_REPOSITORY,,}`).

**502 Bad Gateway sur localhost:80 (signalé par l'utilisateur) — résolu** :
nginx résout les IPs des upstreams (`proxy_pass http://admin-panel:80/`) au
chargement de sa config ; les conteneurs recréés dans la journée avaient changé
d'IP sur `kasi-net`. Fix immédiat : `docker compose restart nginx`. **Règle
d'exploitation à retenir : redémarrer nginx après toute recréation de
conteneur upstream** (ou passer un jour à `resolver 127.0.0.11` + variables
dans proxy_pass pour une résolution dynamique — non fait, invasif).

**Dashboard vérifié de bout en bout** : après dépôt de la clé de service
Firebase par l'utilisateur (schéma GraphQL complet restauré), login GraphQL +
les 4 requêtes de graphiques répondent sans erreur via nginx
(`driverRegistrations` renvoie une vraie ligne). Le portage Postgres du
2026-07-10 est définitivement clos. Note : `time` est renvoyé en string,
conforme au DTO (`time: string`) — pas une anomalie.

**Déploiement VPS — préparé, en attente de 2 actions utilisateur** :
- Paire de clés SSH dédiée générée :
  `Kasi-ressources/vps/kasi_deploy_ed25519(.pub)` (dossier hors git).
- Action 1 : installer la clé publique sur le VPS (`168.231.78.68`, root,
  mot de passe dans `Kasi-ressources/vps/acces.env`).
- Action 2 : créer les 3 secrets GitHub (Settings → Secrets and variables →
  Actions) : `DEPLOY_HOST=168.231.78.68`, `DEPLOY_USER=root`,
  `DEPLOY_SSH_KEY=<contenu de kasi_deploy_ed25519>` (clé privée).
- Restera ensuite : provisionner le VPS (Docker, `/opt/kasi` avec
  docker-compose.yml + .env + config/ incluant la clé Firebase — leçon de
  l'incident de persistance du même jour).

---

## 2026-07-10 — CI GitHub : échecs expliqués par un verrou de facturation du compte, pas par le code

**Constat** : les 3 runs CI du nouveau repo échouent en ~3 s, 0 step exécuté,
0 log. L'annotation du check-run (récupérée via l'API avec le credential git
local) donne la cause exacte : **« The job was not started because your
account is locked due to a billing issue »** — le compte GitHub `ZayTauven`
est verrouillé côté facturation, GitHub Actions refuse de démarrer tout job
(même sur repo public, normalement gratuit).

**Action utilisateur requise** : github.com → Settings → Billing and plans —
régler le verrou (moyen de paiement expiré/échec d'un ancien prélèvement ou
spending limit), puis relancer le dernier run CI (bouton « Re-run all jobs »)
ou pousser un commit.

**Note** : les correctifs `npm ci --legacy-peer-deps` (ci.yml) et minusculisation
GHCR (deploy.yml) du même jour restent nécessaires — ils n'ont juste pas encore
pu être exercés. `npm ci --legacy-peer-deps --dry-run` local passe (lockfile
en phase avec package.json), le premier vrai run CI a de bonnes chances d'être
vert une fois le compte déverrouillé.

---

## 2026-07-10 — Provisionnement du VPS et premier déploiement (build sur place, contournement du verrou GitHub Actions)

**Préalables confirmés** :
- Token Mapbox secret **rotationné** par l'utilisateur (nouveau `sk.` stocké dans
  `app-ridy/config/config.production.json` → `backendMapsAPIKey`, et archivé
  dans `Kasi-ressources/vps/acces.env` ; l'`adminPanelAPIKey` reste le `pk.`
  public). L'ancien token exposé dans l'historique git est révoqué.
- Clé publique de déploiement installée sur le VPS par l'utilisateur (via panel
  Hostinger) + 3 secrets `DEPLOY_*` créés sur le repo GitHub.
- **Verrou de facturation GitHub re-confirmé empiriquement** : re-run déclenché
  via l'API (HTTP 201), échec en ~3 s avec la même annotation « account is
  locked due to a billing issue » — l'utilisateur ne voit aucune facture ;
  prochaine étape = bannière sur github.com/settings/billing sinon ticket au
  support GitHub. **Toute la chaîne Actions (CI, GHCR, deploy SSH) est bloquée
  par ce verrou, indépendamment du code.**

**Décision** : ne pas attendre GitHub — premier déploiement en **buildant
directement sur le VPS** (`docker compose build`, IMAGE_REGISTRY vide →
fallback `kasi-local`). La chaîne Actions prendra le relais une fois le compte
déverrouillé (il faudra alors soit rendre les packages GHCR publics, soit un
`docker login ghcr.io` sur le VPS avec un PAT read:packages — le deploy.yml ne
fait pas de login côté serveur).

**Provisionnement effectué (SSH avec la clé `kasi_deploy_ed25519`)** :
- VPS `168.231.78.68` (srv1817090.hstgr.cloud) : Ubuntu 24.04.4 LTS, **Docker
  29.6.1 et Compose v5.3.1 déjà présents** (image Hostinger), 96 Go disque
  (2% utilisé), 8 Go RAM.
- Repo public cloné dans `/opt/kasi` (`git clone --depth 1`).
- `/opt/kasi/.env` créé (chmod 600) : `DB_PASS`/`REDIS_PASSWORD` = 48 hex
  aléatoires, `JWT_SECRET` = 64 hex (openssl rand), `GEO_PROVIDER=nominatim`
  (pas de clé Google — le fournisseur OSM déjà codé, cohérent « contrôle
  total »), `MAPBOX_TOKEN` = pk public (ARG de build admin-panel),
  `IMAGE_REGISTRY` vide (build local).
- `/opt/kasi/config/` : `config.production.json` + clé de service Firebase
  copiés par scp (chmod 600) — conformément à la leçon de persistance du même
  jour (volume `./config:/app/config` déjà dans le compose poussé).
- `docker compose build` lancé en détaché (`nohup`, log dans
  `/opt/kasi/build.log`, verdict dans `build.status`), surveillé depuis la
  session locale. `up -d` + vérification HTTP à suivre selon le verdict.

---

## 2026-07-10 — 🚀 PREMIER DÉPLOIEMENT PRODUCTION RÉUSSI (VPS Hostinger) + durcissement des ports

**La stack Kasi complète tourne en production sur `http://168.231.78.68/`.**

**Déroulé** :
- `docker compose build` sur le VPS : succès (les 4 images, build sur place —
  contournement du verrou billing GitHub Actions toujours actif).
- `docker compose up -d` : 7 conteneurs Up, postgres/redis healthy.
- Seed `create_superuser.sql` appliqué sur la base de prod (rôle admin 31
  permissions + opérateur lié — version corrigée du même jour).
- **Vérifié depuis l'extérieur** : GET / → 200 (admin-panel via nginx), login
  GraphQL → JWT, requête protégée `regions` → OK (authorizers + seed),
  `incomeChart` → OK (portage Postgres).

**Faille d'exposition trouvée et corrigée dans la foulée** : le compose
publiait 5432 (Postgres), 6379 (Redis), 3000/3001/3002 (APIs) et 8080
(admin-panel direct) sur `0.0.0.0` — vérifié joignables publiquement pour les
ports HTTP (Docker contourne ufw en écrivant directement dans iptables).
**Correctif** : bindings préfixés `127.0.0.1:` dans `docker-compose.yml` pour
tout sauf nginx:80 (commit `d7fbf24`, poussé + appliqué sur le VPS).
Re-vérifié : seuls 80 répond de l'extérieur, les APIs ne sont accessibles que
via nginx. Aucun impact en dev local (accès déjà via localhost).

**⚠️ Actions de sécurité restantes (utilisateur)** :
1. **URGENT — changer le mot de passe admin** : `kasi@admin.com / P@ssword`
   (mot de passe par défaut du seed) est désormais exposé sur un serveur
   public → à changer immédiatement via /management/settings de l'admin-panel.
2. SSH du VPS : l'auth par mot de passe root reste active — désactiver
   (`PasswordAuthentication no`) une fois un 2e accès par clé confirmé.
3. SSL/domaine : pointer un domaine sur 168.231.78.68 puis suivre
   `.nginx/ssl-placeholder.md` (certbot).

**Exploitation** :
- Runbook mise à jour manuelle : `cd /opt/kasi && git pull && docker compose
  build && docker compose up -d && docker compose restart nginx` (le restart
  nginx est obligatoire — IPs upstream figées à son démarrage, cf. 502 du même
  jour).
- Quand le compte GitHub sera déverrouillé : la chaîne Actions (CI → GHCR →
  deploy SSH) est prête ; il faudra choisir entre packages GHCR publics ou
  `docker login ghcr.io` sur le VPS (PAT read:packages), et renseigner
  `IMAGE_REGISTRY=ghcr.io/zaytauven/kasi-projet-vtc` dans `/opt/kasi/.env`.

---

## 2026-07-10 — Domaines actés, SSH durci, HTTPS en production sur kasigroupe.tech

**Décisions utilisateur** :
- **Domaines** : `kasi.sn` en cours de négociation (non acquis). En attendant :
  **`kasigroupe.tech`** acheté → héberge le backend (stack VPS) ;
  **`kasigroupe.com`** sera acheté plus tard pour le site vitrine (landing/).
- Blocage GitHub billing : pris en charge par l'utilisateur.
- Chantier Bictorys : reporté à plus tard (acté, pas commencé).
- Le mot de passe admin par défaut a été changé par l'utilisateur (vérifié :
  `P@ssword` renvoie désormais "Invalid Credentials").

**SSH durci (exécuté)** : l'auth par mot de passe était réellement active
(`50-cloud-init.conf: PasswordAuthentication yes` gagnait — sshd retient la
première valeur rencontrée, ordre lexical des includes). Créé
`/etc/ssh/sshd_config.d/00-kasi-hardening.conf` (passe avant) :
`PasswordAuthentication no`, `KbdInteractiveAuthentication no`,
`PermitRootLogin prohibit-password`. Validé `sshd -t`, rechargé, **vérifié
dans les deux sens** (clé OK, mot de passe → "Permission denied (publickey)").
Récupération de secours si perte de clé : console navigateur Hostinger.

**HTTPS déployé (exécuté)** — DNS de kasigroupe.tech pointait déjà sur le VPS
(A + AAAA + www, auto-config Hostinger) :
- Refactor nginx versionné : blocs location/gzip/headers extraits dans
  `.nginx/kasi-locations.conf`, inclus par le serveur HTTP de `default.conf`
  (dev local, inchangé fonctionnellement) ET par le nouveau
  `.nginx/ssl-kasigroupe.conf` (serveur 443 + redirect 301 HTTP→HTTPS pour le
  domaine ; l'accès par IP nue reste servi en HTTP par le serveur `_`).
- Certificat Let's Encrypt émis (certbot standalone, nginx stoppé ~30 s) pour
  `kasigroupe.tech` + `www`. Hooks de renouvellement pre/post
  (`/etc/letsencrypt/renewal-hooks/`) qui stoppent/redémarrent le conteneur
  nginx (le timer systemd certbot est actif par défaut).
- `/opt/kasi/docker-compose.override.yml` (non versionné, couvert par
  .gitignore) : port 443 + mounts ssl-kasigroupe.conf et /etc/letsencrypt.
- **Vérifié depuis l'extérieur** : https://kasigroupe.tech/ → 200 (TLS valide),
  http:// → 301 vers https, www OK, GraphQL répond en HTTPS.

**Incident local mineur en passant** : un PostgreSQL natif Windows occupe le
port 5432 de la machine de dev → binding hôte du conteneur passé à
`127.0.0.1:5433:5432` (docs/pgadmin-setup.md mis à jour). Aucun impact interne
(les APIs utilisent postgres:5432 dans le réseau Docker) ni sur le VPS.

**URLs de production** : admin-panel https://kasigroupe.tech/ — APIs
https://kasigroupe.tech/{admin,driver,rider}-api/graphql (à utiliser dans la
config des apps mobiles).

**Prochaine étape mobile suggérée** : pointer driver-app/rider-app sur
https://kasigroupe.tech/driver-api/ et /rider-api/ (config GraphQL des apps)
pour les premiers tests réels contre la prod.

---

## 2026-07-10 — Apps mobiles pointées sur la production (kasigroupe.tech) + défauts client Sénégal

**Changements (commit `3cbbf1d`)** :
- `driver-app/lib/config.dart` : `serverUrl = "https://kasigroupe.tech/driver-api/"`
- `rider-app/lib/config.dart` : `serverUrl = "https://kasigroupe.tech/rider-api/"`
- `wsUrl` dérivé par `replaceFirst("http","ws")` → donne bien `wss://` depuis
  `https://` (vérifié : handshake WebSocket 101 à travers nginx TLS, en
  HTTP/1.1 — note : un test curl en HTTP/2 donne un faux 400, les vrais
  clients WS négocient HTTP/1.1).
- Placeholder `serverIP = "x.x.x.x"` supprimé de `libs/client-shared/config.dart`
  (plus aucune référence, vérifié par grep) ; les anciens ports du template
  (4000/4002) disparaissent — tout passe par les préfixes nginx.
- Défauts client alignés sur le marché : `fallbackLocation` San José/Californie
  → Dakar (14.6928, -17.4467), `defaultCurrency` USD → **XOF**, `tipPresets`
  10/20/50 → 500/1000/2000 XOF, `nominatimCountries = ["sn"]` (rider-app,
  cohérent avec GEO_PROVIDER=nominatim en prod).

**Vérifications** : endpoints prod `POST /driver-api/graphql` et
`/rider-api/graphql` → 200 via nginx TLS ; `flutter analyze` ciblé sur les 3
fichiers modifiés → 0 erreur (1 info `prefer_const` de style préexistant ; les
27 issues du full analyze driver-app sont des dépréciations historiques sans
lien).

**Prochain jalon** : builder les APK debug et tester une vraie course de bout
en bout (rider commande → driver accepte → suivi sur le dashboard admin prod).
Attention Firebase Auth OTP : ajouter l'empreinte SHA-1/SHA-256 debug dans la
console Firebase kasi-v1 si l'OTP échoue sur device réel.

---

## 2026-07-11 — Signature Android : nouveau keystore Kasi + diagnostic APK « incompatible »

**Contexte** : téléphone de test réparé. Debug USB OK sur driver-app,
inscription bloquée à l'étape 2 (OTP). Les APK sideloadés étaient refusés
(« incompatible avec votre téléphone »).

**Diagnostic APK (résolu)** : `rider-app/.../apk/debug/passager.apk` (04/07)
ne contient que des libs natives **x86_64** — build debug produit pendant une
session émulateur. Un téléphone ARM le refuse. Règle : pour sideloader,
toujours `flutter build apk --release` (ou `--debug` sans émulateur connecté) ;
les debug APK produits par `flutter run` ne ciblent que l'ABI du device branché.

**Décision OTP** : on garde Firebase Phone Auth (déjà câblé de bout en bout :
`verifyPhoneNumber` côté Flutter → mutation `login(firebaseToken)` →
`FirebasePhoneAuthVerifier`). Provider Phone activé dans la console `kasi-v1`
en mode test (numéros fictifs) le 2026-07-11. Le chantier WhatsApp OTP
(souhait produit : WhatsApp prioritaire + SMS) reste un lot futur — nécessite
mutations sendOtp/verifyOtp backend + provider (Twilio Verify ou Meta Cloud
API), non décidé.

**Nouveau keystore de signature (exécuté)** :
- L'ancien `driver-app/android/release.keystore` est inutilisable : mot de
  passe inconnu (probablement le keystore du template Ridy ; les
  `key.properties` avaient été vidés au nettoyage des secrets). Peut être
  supprimé.
- Généré `keystore.jks` neuf (RSA 2048, validité 10000 j, alias `upload`,
  CN=Kasi Groupe, L=Dakar, C=SN), copié dans
  `driver-app/android/app/keystore.jks` ET `rider-app/android/app/keystore.jks`
  (même clé pour les deux apps — assumé : une seule entité Kasi, et Play App
  Signing en fera de simples upload keys à la publication).
- `key.properties` des deux apps remplis (mot de passe dedans, fichiers
  couverts par .gitignore : `*.jks`, `*.keystore`, `key.properties` — vérifié
  par `git check-ignore`). **À SAUVEGARDER hors machine : keystore.jks +
  key.properties** (perte = perte de l'identité de signature).

**Correctif build release (exécuté)** : `flutter build apk --release` échouait
sur `:flutter_compass:verifyReleaseResources` → `android:attr/lStar not found`
(plugin pub.dev ancien, compileSdk < 31 ; la tâche ne tourne qu'en release,
d'où des debug qui passaient). Fix dans `{driver,rider}-app/android/build.gradle.kts`
(bloc subprojects/afterEvaluate existant) : bump du compileSdk des seuls
sous-projets déclarant < 31, vers 31 exactement. NE PAS forcer tous les
sous-projets au compileSdk de l'app (36) : ça casse la compilation Kotlin de
`package_info_plus` 4.0.2 et `smart_auth` 1.1.1 (nullabilité durcie des
android.jar récents) — testé, échec reproduit.
**Vérifié** : `app-release.apk` driver 68,4 MB, 3 ABIs (arm64-v8a,
armeabi-v7a, x86_64 → installable partout), signature apksigner =
CN=Kasi Groupe, SHA-1 `A4:B7:8A:B3:...` (le nouveau keystore).
Au passage : `JAVA_HOME` de la machine pointe sur `jdk-17.0.6` inexistant
(le JDK réel est `C:\Program Files\Java\jdk-19.0.1`) — sans impact sur
flutter/gradle, mais casse apksigner.bat ; à corriger un jour.

**Empreintes pour la console Firebase** (Project settings → apps Android →
Add fingerprint, à faire pour les DEUX apps ; re-télécharger ensuite les
`google-services.json`) :
- Debug (`~/.android/debug.keystore`, celle qui compte pour le debug USB) :
  - SHA1 `C7:DD:05:0C:AE:F6:B6:F2:4C:5F:36:C0:F4:7D:BD:E6:23:FB:7A:0D`
  - SHA256 `FB:A6:78:E1:86:80:FE:E6:2A:AF:2D:29:D1:97:68:19:7B:BD:D7:FC:E1:73:5C:1D:EA:CA:4A:81:AF:AC:32:84`
- Prod/upload (nouveau keystore.jks, identique pour les deux apps) :
  - SHA1 `A4:B7:8A:B3:51:62:50:BB:06:35:1E:3A:46:72:51:CB:6A:54:C8:CF`
  - SHA256 `7C:C7:1C:05:39:FA:CD:B2:E2:96:51:43:EB:F3:8D:38:DA:C7:23:66:CD:C8:DC:3B:1B:53:05:75:E9:08:11:0F`

## 2026-07-14 — Comparatif Kasi (base Ridy 2.5.2) ↔ Ridy v3.21 : analyse d'écarts complète

**Contexte** : alignement de Kasi sur la dernière version du stack Ridy.
Analyse exhaustive : 54 captures web + 30 captures mobiles de la démo Ridy
v3.21 (`Kasi-ressources/assets/UX-ridy/`) croisées avec l'inventaire du code
Kasi (admin-panel, rider-app, driver-app, client-shared).

**Livrable** : `COMPARATIF_KASI_RIDY_V3.md` (racine) — arborescences de
navigation, écarts fonctionnels module par module, écarts design web/mobile,
implications backend, stratégie.

**Constats clés** :
- La cible v3.21 = refonte complète de la console admin (design system
  sombre, nouvelle navigation) + 6 modules absents du schéma GraphQL Kasi :
  Payouts/Payout Methods, Gift Cards, SMS Providers (+ call masking),
  Driver Shift Rules, Document Retention, RBAC multi-apps (Taxi/Shop/Parking).
  Toute mise à niveau passe par le backend d'abord.
- Mobile : parité fonctionnelle déjà bonne ; l'écart est surtout design
  (langage lavande/bleu roi, illustrations 3D) + payout in-app driver et
  centre sécurité driver. Kasi est en avance sur l'i18n fr (100 % couvert
  vs résidus anglais dans la cible).
- Ni Bictorys, ni Wave, ni Orange Money dans l'enum des gateways v2.5.2 →
  chantier paiement Sénégal propre à Kasi quelle que soit la version.

**Décision à trancher (non prise ici)** : Option A = acquérir la base Ridy
v3.x et re-porter les personnalisations Kasi ; Option B = rester sur 2.5.2
et recoder par priorité business. Recommandation du comparatif : A si budget
licence OK. Priorisation P0→P6 documentée (P0 = quick wins immédiats :
menus Rewards/Cancel Reasons commentés à réactiver, fr.json « Monte »→Kasi,
défaut mobile fr, icônes/splash Kasi).

## 2026-07-14 — DÉCISION : Option B retenue pour l'alignement sur Ridy v3.21

**Décision (utilisateur)** : rester sur la base Ridy 2.5.2 et réimplémenter
incrémentalement les fonctionnalités/design v3 par priorité business
(Option B du `COMPARATIF_KASI_RIDY_V3.md`), plutôt que d'acquérir la base
v3.x amont. Motif : contrôle complet du code — aligné avec l'objectif
fondateur « contrôle total du matériel/infra ».

**Conséquence** : la feuille de route P0→P6 du comparatif devient le
backlog d'alignement. P0 (quick wins sans upgrade) lancé dans la foulée :
réactivation menus Rewards + Cancel Reasons, corrections fr.json,
défaut mobile fr, branding icônes.

**État P0 fin de session 2026-07-14** (sur disque, non committé) :
menus Rewards + Cancel Reasons réactivés (`cms.component.html`) ; 7
corrections `fr.json` (dont « Monte » → « Kasi ») ; défaut langue mobile
`en` → `fr` (2 `main.dart`) ; 92 icônes Kasi générées pour les 2 apps
(launcher Android légacy + adaptatif sur teal #1285A2, iOS AppIcon complet,
splash, logo in-app, notification) depuis
`Kasi-ressources/assets/fav-icons/kasi_favicon_512_white.png` (plaque
blanche supprimée par flood-fill). Reste : rebuild + vérif visuelle,
test des 2 écrans réactivés contre l'API, icônes PWA admin, manifests web
mobiles. Commit à trancher à la reprise (le working tree contenait déjà
des modifications antérieures à la session).

## 2026-07-14 — Reprise P0 : vérification des écrans Rewards / Cancel Reasons, 3 bugs corrigés

**Contexte** : reprise de la session P0 interrompue. Vérification sur disque :
les items « icônes PWA admin » et « manifests web mobiles » du reste-à-faire
étaient en réalité déjà couverts par des modifications antérieures (icônes
`icon-*.png` admin déjà Kasi teal, manifests rider/driver déjà rebrandés).

**Test E2E des 2 écrans réactivés contre l'admin-api locale (stack Docker up)**
— login `kasi@admin.com` OK (NB : `login` est une **Query** GraphQL, pas une
mutation). Trois bugs découverts et corrigés :

1. **Table `reward` absente de la base** (`relation "reward" does not exist`).
   Cause : `libs/database/src/lib/database.module.ts` ne synchronise le schéma
   qu'à la création de la base (`shouldSync = tables < 5`) ; la base locale
   (49 tables) est antérieure à RewardEntity. **Fix** : nouveau script
   `app-ridy/add_reward_table.sql` (enums + table, nommage identique à ce que
   `synchronize` aurait généré), appliqué à la base locale.
   ⚠️ **À exécuter aussi sur la base de production** (kasigroupe.tech) au
   prochain déploiement — le même écart y est quasi certain.

2. **Resolver `OrderCancelReason` sans `guards: [JwtAuthGuard]`**
   (`apps/admin-api/src/app/order/order.module.ts`) : `req.user` jamais
   peuplé → crash `Cannot read properties of undefined (reading 'id')` dans
   `ServiceAuthorizer` sur toute requête. **Fix** : guard ajouté (aligné sur
   le resolver OrderDTO voisin).

3. **Resolver `Reward` sans guard ni authorizer**
   (`apps/admin-api/src/app/reward/reward.module.ts`) : tout le CRUD rewards
   était exposé **sans authentification** — trou de sécurité hérité du
   template 2.5.2, invisible tant que le menu était commenté. **Fix** :
   `guards: [JwtAuthGuard]` ajouté. (Pas d'authorizer à permission dédiée :
   l'enum OperatorPermission n'a pas de valeur Rewards_* en 2.5.2 ; à
   revisiter avec le chantier RBAC v3 — P5 du comparatif.)

**Vérifications** : `rewards { totalCount }` → 200 OK après création de la
table ; `orderCancelReasons` retesté après rebuild de l'image admin-api.
Env local : `node_modules` était incomplet (ng-zorro-antd manquant, échec
ERESOLVE) → réinstallé avec `npm install --legacy-peer-deps`.

**Validation finale (même soirée)** : image admin-api rebuildée + redémarrée →
`orderCancelReasons` 200 avec JWT, et `rewards`/`orderCancelReasons` renvoient
UNAUTHENTICATED sans token (trou fermé). `ng build admin-panel --configuration
production` passe (seuls warnings préexistants : CommonJS mapbox, budget bundle
+550 Ko). Image admin-panel rebuildée + redémarrée : le chunk servi contient la
route `marketing/rewards`, le fr.json servi n'a plus aucune occurrence de
« Monte ». Spot-check visuel des icônes générées : launchers Android
rider/driver (K sur teal), notification_icon (silhouette blanche), iOS 1024
(détourage OK, pas de plaque blanche). P0 restant : vérif APK sur
émulateur/device réel (nécessite un poste avec device), différenciation
éventuelle icône rider vs driver, commit du working tree (décision
utilisateur — mélange modifs pré-session et session).

## 2026-07-14 — P0 CLOS : commit b8867cf, vérification device OK, déploiement prod différé

**Clôture P0** (utilisateur) :
- Commit `b8867cf` « fix(admin-api) / feat(p0-v3) / chore(branding) » dans le
  dépôt `app-ridy` (Kasi-projet-vtc), working tree propre. NB : les ~194
  entrées restantes dans le dépôt racine « Kasi - Projet » sont un artefact
  (le wrapper trace des fichiers d'app-ridy antérieurs à l'imbrication du
  .git) — dette d'hygiène déjà connue, sans impact.
- Vérification sur device réel par l'utilisateur : Rewards bien présent. ✔

**DIRECTIVE (utilisateur, 2026-07-14)** : tout l'alignement v3 (P0→P6) se
construit et se valide **en local d'abord** ; le déploiement production est
différé et se fera en un lot. **Checklist à dérouler au moment du déploiement
prod (kasigroupe.tech)** — à enrichir au fil des P suivants :
1. Exécuter `app-ridy/add_reward_table.sql` sur la base prod
   (`docker exec -i kasi-postgres psql -U kasi -d kasi < add_reward_table.sql`).
2. Rebuilder/pousser les images admin-api ET admin-panel (guards JWT +
   menus/i18n) — via CI→GHCR une fois le billing GitHub débloqué, sinon
   rebuild manuel sur le VPS.
3. Apps mobiles : republier les APK (icônes Kasi + défaut langue fr).
4. (P1) Exécuter `app-ridy/add_kasi_moto_delivery.sql` sur la base prod ;
   rebuild des 4 images (admin-api, rider-api, driver-api, admin-panel).
5. (P2) Exécuter `app-ridy/add_payout_module.sql` sur la base prod ;
   couvert par le rebuild des images admin-api, driver-api et admin-panel.
6. (P3) Exécuter `app-ridy/add_sms_provider.sql` sur la base prod (crée
   `sms_provider` + seed LogOnly par défaut) ; couvert par le rebuild des
   images admin-api et admin-panel. Configurer ensuite un vrai provider
   (Twilio ou Orange SMS) via le panel — credentials à saisir en prod
   uniquement, jamais en base locale.
7. (P3 call masking) Exécuter `app-ridy/add_call_masking.sql` sur la base prod
   (crée `call_masking_provider` + seed `Direct (dev)` par défaut) ; couvert
   par le rebuild des images admin-api + rider-api + driver-api (+ admin-panel
   quand le volet panel sera livré). **Mise en service du vrai masquage** (hors
   local) : créer un provider `TwilioVoice` via le panel (accountId=SID,
   apiSecret=token, proxyNumber=numéro Twilio E.164, webhookAuthToken, le
   définir par défaut), provisionner ≥1 numéro voix, et pointer son webhook
   Voice Twilio sur `https://kasigroupe.tech/rider-api/call/voice-webhook`
   (option : fixer `TWILIO_VOICE_WEBHOOK_URL` sur rider-api pour la validation
   de signature derrière nginx). Tant que le provider par défaut reste `Direct`,
   les apps composent le vrai numéro (aucun masquage) — bascule sans redéploiement.

## 2026-07-15 — P1 lancé : livraison Kasi Moto (orderType Delivery + capacités driver) — backend + admin fait

**Chantier** : P1 du backlog v3 (`COMPARATIF_KASI_RIDY_V3.md`) — order types
delivery + `canDeliver`/`maxPackageSize`, cœur du modèle Kasi Moto
(ticket 1 000–3 000 FCFA).

**Design (ancré dans l'architecture 2.5.2)** : le dispatch matche déjà les
chauffeurs par service (`enabledServices`, 3 points de passage :
`SharedOrderService.createOrder`, `processPrePay`,
driver-api `getOrdersForDriver`). La livraison est donc portée par le
service, pas par une app séparée comme en v3 multi-apps :
- `ServiceOrderType` (`Ride`|`Delivery`, extensible Food/Shop plus tard) →
  colonne `service.orderType`, défaut `Ride`.
- `PackageSize` (`Small`|`Medium`|`Large`) + helper `packageSizeRank`
  (null = plus petit gabarit) → `driver.canDeliver` (bool, défaut false),
  `driver.maxPackageSize` (nullable), `request.packageSize`,
  `request.recipientName`, `request.recipientMobileNumber`,
  `request.deliveryInstructions`.
- Règle de dispatch injectée aux 3 points : commande d'un service Delivery
  → seuls les drivers `canDeliver` avec `maxPackageSize` ≥ `packageSize`.
- La voie « accept » ne re-valide pas (comportement amont inchangé :
  `canDriverDoServiceAndFleet` n'est appelé nulle part).

**Fichiers** : enums + entités dans `libs/database` ; dispatch
`shared-driver.service.ts` / `shared-order.service.ts` /
driver-api `order.service.ts` ; DTOs/inputs des 3 APIs (admin : Service,
Driver — dont `canDeliver` filtrable —, Order, CreateOrder dispatcher ;
rider : Service.orderType, CreateOrderInput + Order ; driver :
Driver capacités, Order + AvailableOrder) ; panel admin : formulaire
service (select type de commande) + profil driver (case « Peut livrer » +
taille max colis) + clés i18n fr/en ; **`add_kasi_moto_delivery.sql`**
(3 enums PG + 7 colonnes, idempotent) appliqué à la base locale —
⚠️ **ajouté à la checklist de déploiement prod** (voir entrée « P0 CLOS »).

**Validation** : 3 APIs backend + panel compilent ; introspection GraphQL OK
(Service.orderType, Driver.canDeliver/maxPackageSize, Order.packageSize/
recipient*/deliveryInstructions, enum PackageSize) ; E2E local :
`updateOneDriver(canDeliver:true, maxPackageSize:Medium)` OK, filtre
`drivers(canDeliver)` OK, `createOneService(orderType:Delivery)` →
service « Kasi Moto Livraison » (base 1 000 FCFA) créé et relu. Données de
test semées en base locale : media#1, catégorie « Kasi Moto », service#1.
NB build Windows : la sous-tâche nx `tsc .../mysql-archive/*.ts` échoue
(glob non résolu sous cmd) — préexistant, sans lien avec P1, passe sous
Linux/Docker.

**Reste P1** : apps mobiles — rider (parcours livraison : taille colis,
destinataire, instructions si service Delivery) + driver (affichage détails
colis/destinataire sur l'offre et la course) ; écran commande admin
(affichage détails livraison) optionnel.

**Déploiement local complet (même jour)** : les 4 images Docker (admin-api,
rider-api, driver-api, admin-panel) rebuildées et redémarrées. Vérifié sur la
stack : rider-api expose `Service.orderType` + `CreateOrderInput.packageSize/
recipientName/...`, driver-api expose `Driver.canDeliver/maxPackageSize`, le
panel servi contient le select « Type de commande » et « Peut livrer
(Kasi Moto) » en fr. Le volet backend + admin du P1 est clos ; reste mobile.

## 2026-07-15 — HOTFIX : fiche driver inaccessible (SQL MySQL sur Postgres) + écran gains driver

**Symptôme (utilisateur)** : clic sur un driver dans la liste admin → aucune
redirection vers la fiche ; impossible de vérifier/activer les profils
(bloqués en WaitingDocuments/PendingApproval).

**Cause** : la requête `ViewDriver` du panel embarque
`driverFeedbackParametersSummary` ; côté admin-api
(`driver/driver.service.ts`), cette requête raw est en **dialecte MySQL**
(placeholder `?`, `ANY_VALUE()`, identifiants camelCase non quotés) alors que
la base est Postgres → `syntax error at or near "GROUP"` → 500 → le
route-resolver Angular annule silencieusement la navigation. Bug hérité du
template (jamais exercé tant qu'on n'ouvrait pas une fiche driver) ;
**présent aussi en prod**.

**Balayage** : `grep 'ANY_VALUE|= ?'` sur les apps → 1 autre fichier touché :
driver-api `wallet/earnings.service.ts` (écran « Gains » de l'app driver,
`getStats`/`getStatsNew`) — SQL MySQL intégral (DATE_FORMAT, DATEDIFF,
MAKEDATE, YEAR/WEEK/MONTH, CONCAT) : aurait planté dès la première course.

**Fix** : réécriture Postgres des deux fichiers — identifiants quotés,
placeholders `$1..`, `bool_or` (à la place d'ANY_VALUE), `to_char`
(FMDay / IYYY",W"IW / FMYYYY/FMMM), `NOW() - INTERVAL '7 days'`,
`date_trunc('year', …)`, casts `::int`/`::float` pour que les agrégats
sortent en nombres (le driver pg renvoie les SUM/COUNT en chaînes sinon).
Refactor earnings : requêtes construites dans `datasetQuery()` partagé.

**Validation** : images admin-api + driver-api rebuildées/redémarrées ;
requête `ViewDriver` complète (document exact du panel) → 200 avec
feedbackSummary `[]` propre ; les 3 variantes SQL gains exécutées sur la
base locale sans erreur. La fiche driver s'ouvre → déblocage de la
vérification/activation des profils Kasimen.

## 2026-07-15 — P1 volet mobile : parcours livraison rider + affichage colis driver

**rider-app** :
- Schéma `rider.schema.gql` + `lib/schema.gql` régénérés par introspection de
  la rider-api locale (les types supprimés au diff = agrégats inutilisés d'une
  ancienne version ; `ordersAggregate` utilisé par GetCurrentOrder vérifié
  présent). Codegen `build_runner` OK.
- `GetFare` expose `orderType` sur les services ; fragment `CurrentOrder`
  enrichi (packageSize, recipient*, deliveryInstructions, service.orderType).
- Nouvelle bottom sheet `delivery_details_sheet_view.dart` : taille de colis
  (ChoiceChips S/M/L), destinataire (nom facultatif, téléphone requis),
  instructions ; retourne un objet `DeliveryDetails`.
- `select_service_view.dart` : sur « Réserver » ET sur la réservation
  programmée, si `selectedService.orderType == Delivery` → sheet détails
  colis (annulation = pas de commande), champs passés à `CreateOrderInput`.
- i18n : 9 clés ajoutées à `intl_en.arb`/`intl_fr.arb`, `flutter gen-l10n` OK.
- `flutter analyze` : 0 erreur. ⚠️ Piège : `build_runner` écrase le patch
  manuel de `lib/gen/assets.gen.dart` (`theme ?? const SvgTheme()`) → restauré
  via `git checkout`, à surveiller à chaque codegen.

**driver-app** :
- `driver.schema.gql` + `lib/schema.gql` régénérés (Order porte bien
  packageSize/recipient*/deliveryInstructions, Service.orderType).
- Fragments `AvailableOrder` et `CurrentOrder` enrichis.
- Nouveau widget `delivery_info_view.dart` : bandeau colis (taille, badge
  « Livraison ») + destinataire avec appel direct `tel://` + instructions ;
  mode compact sur le carrousel d'offres (pas de contact avant acceptation),
  complet sur la course en cours (`order_status_card_view`).
- i18n : 4 clés en/fr.

## 2026-07-15 — P2 : module Payouts (versement des gains aux Kasimen) — backend + driver-api + panel, E2E validé

**Chantier** : P2 du backlog v3 (`COMPARATIF_KASI_RIDY_V3.md`) — équivalent du
module Payouts/Payout Methods de Ridy v3.21, **adapté au contexte Sénégal** :
méthodes Wave / Orange Money / virement bancaire / espèces, paiement effectué
**manuellement hors application** (pas de PSP intégré à ce stade), puis pointé
dans le panel qui débite alors le wallet. L'intégration API (Bictorys/Wave)
restera branchable dans `processPayout` le moment venu.

**Modèle (libs/database)** :
- `payout_method` : type (`PayoutMethodType` Wave|OrangeMoney|BankTransfer|
  Cash), nom, devise, `enabled`, `minimumAmount` (plancher d'éligibilité),
  `instructions`.
- `payout_session` : statut (`Pending|Processed|Canceled`), devise,
  `minimumAmount`, `totalAmount` (instantané), description, `operatorId`.
- `payout` : montant, statut (`Pending|Paid|Canceled`), **instantanés**
  `methodType`/`methodName`/`accountNumber` (l'historique survit aux
  changements de méthode), `driverTransactionId` (traçabilité du débit),
  FK session (CASCADE) / driver / méthode (SET NULL).
- Driver : `payoutMethodId` + `payoutAccountNumber` (n° Wave/OM ou compte).
- **`add_payout_module.sql`** (4 enums PG + 3 tables + 2 colonnes driver,
  idempotent) appliqué à la base locale — ⚠️ **ajouté à la checklist prod**
  (entrée « P0 CLOS », point 5).

**Logique (admin-api `payout/`)** : éligibilité = solde > 0 dans la devise
+ méthode de retrait active dans la même devise + n° de compte renseigné
(sauf espèces) + solde ≥ max(minimum session, minimum méthode) ; le versement
= l'intégralité du solde. `createPayoutSession` génère un payout par Kasiman
éligible ; `processPayout` re-vérifie le solde puis débite le wallet
(transaction `Deduct/Withdraw/Done` avec opérateur + motif) ;
`processPayoutSession` traite tout (un solde devenu insuffisant reste
Pending) ; `cancelPayout`/`cancelPayoutSession` ; statut de session recalculé
(plus de Pending → Processed si ≥1 payé, sinon Canceled) ;
`payoutSessionPreview` (nombre d'éligibles + total avant création).
CRUD nestjs-query pour les méthodes, lecture seule sessions/payouts,
`JwtAuthGuard` partout.

**driver-api** : queries `payoutMethods` (actives) + `driverPayouts`
(historique, 50 max) ; `payoutMethodId`/`payoutAccountNumber` exposés sur le
profil et modifiables via `updateOneDriver` → prêt pour l'écran mobile
« Méthodes de retrait » (UI driver-app différée, comme le volet mobile P1).

**Panel admin** : nouvelle section menu **Versements** (`/payouts`, icône
wallet, après Comptabilité) — Sessions (liste triée id DESC ; création avec
devise/minimum/méthodes ciblées + bouton **Aperçu** « N Kasimen éligibles —
total » ; détail avec descriptions + table des payouts, boutons « Marquer
payé » / « Annuler » par ligne et « Tout payer » / « Annuler la session » en
tête, popconfirm partout) et Méthodes (liste + formulaire type/nom/devise/
minimum/consignes/actif). i18n fr+en (sections `payouts*`, enums
`payoutMethodType/payoutSessionStatus/payoutStatus`, clé générique
`profile.date` ajoutée) + `translate-dummy.html`.

**Validation E2E (stack locale)** : sans token → UNAUTHENTICATED ✔ ;
méthode « Wave Senegal » (XOF, min 5 000) créée ✔ ; driver#1 rattaché
(n° 778889900) ✔ ; aperçu = 1 éligible / 15 000 XOF ✔ ; session créée
(Pending, total 15 000) ✔ ; `processPayoutSession` → session Processed,
payout Paid ✔ ; en base : wallet 15 000 → **0**, `driver_transaction`
`Deduct/Withdraw -15 000 XOF` (operatorId=1, motif « Payout #1 (session #1,
Wave Senegal) »), `driverTransactionId` renseigné sur le payout ✔.
driver-api : introspection OK (payoutMethods, driverPayouts, champs Driver) ✔.
Codegen panel OK ; `ng build` prod OK (warnings mapbox/budget préexistants) ;
images admin-api + driver-api + admin-panel rebuildées et redémarrées en
local. NB : login admin local = mot de passe seedé localement, distinct de la
prod.

**Reste P2 (optionnel, non bloquant)** : écran driver-app « Méthodes de
retrait » + historique des versements (l'API est prête) ; bouton payout
depuis la fiche driver admin ; devise par défaut du formulaire session tirée
des régions plutôt que XOF en dur.

## 2026-07-15 — P3 : Fournisseurs SMS (backend + panel admin), E2E validé en local

**Chantier** : P3 du backlog v3 (`COMPARATIF_KASI_RIDY_V3.md`) — module
SMS Providers de Ridy v3.21. Réalisé en deux volets délégués
(kasi-admin-panel pour le front, kasi-backend-services pour l'API) +
intégration/codegen/déploiement en session principale.

**Périmètre et positionnement** : l'OTP de login reste **Firebase Phone
Auth** (inchangé, décision du 2026-07-11) ; les providers SMS sont
l'infrastructure d'envoi (SMS de test aujourd'hui, call masking et éventuel
OTP maison demain). Le **call masking est le reste-à-faire de P3**.

**Modèle (libs/database)** : `sms_provider` — `type`
(`SmsProviderType` : `LogOnly|Twilio|OrangeSms`, valeurs alignées sur les
clés i18n du panel), `name`, `enabled` (déf. true), `isDefault` (déf.
false), `accountId` (SID Twilio / client_id Orange), `apiSecret`
(**write-only : absent du DTO de lecture**, vérifié non interrogeable),
`senderId`, `verificationTemplate` (déf.
`'Your Kasi verification code is: %code%'`), `createdAt`.

**admin-api (`sms-provider/`)** : CRUD nestjs-query (OFFSET + totalCount,
`JwtAuthGuard` partout, « many » désactivés) ; `setDefaultSmsProvider`
transactionnel (un seul défaut, force `enabled`) ; `sendTestSms(number,
providerId?)` → provider ciblé sinon défaut activé (erreurs
`SMS_PROVIDER_NOT_FOUND` / `SMS_PROVIDER_DISABLED` /
`NO_DEFAULT_SMS_PROVIDER`, style codes P2). `SmsService` découplé
(extractible en lib partagée pour le call masking) : LogOnly (Logger, mode
dev/E2E), Twilio (REST Basic auth) et Orange SMS (OAuth2
client_credentials, API Orange Developer — pertinent Sénégal) en REST pur
via `@nestjs/axios` — **aucune dépendance npm ajoutée**. Update partiel :
`apiSecret` omis par le panel quand vide → jamais écrasé (vérifié en base).

**`add_sms_provider.sql`** (enum PG + table + seed `LogOnly` « Log (dev) »
enabled/isDefault, idempotent) appliqué à la base locale — ⚠️ **ajouté à la
checklist prod** (entrée « P0 CLOS », point 6).

**Panel admin** : module `management-sms-provider` (liste avec tags
défaut/désactivé + vue création/édition : type, credentials, template
`%code%`, « Définir par défaut », « SMS de test » avec numéro), menu
Management, i18n fr+en, `translate-dummy.html`. Patch en session
principale : `sendTestSms` envoie désormais le `providerId` du provider
édité (le volet initial n'envoyait que le numéro → tester un provider
non-défaut aurait silencieusement testé le défaut).

**Validation** : E2E API complet sur la stack locale (liste/totalCount,
create/view/update/delete, setDefault, `sendTestSms` LogOnly → log
`[SMS LogOnly] to=... body=Your Kasi verification code is: 123456`,
erreurs sur id inconnu, UNAUTHENTICATED sans JWT) ; codegen panel OK
(6 services GQL générés) ; `nx build admin-panel` prod OK (warnings
mapbox/budget préexistants) ; images admin-api + admin-panel rebuildées et
redémarrées en local (nginx restart inclus) ; le panel servi contient la
route `sms-providers` et les clés fr (« Fournisseurs SMS »).

**Points d'attention** : Twilio/Orange SMS non testés avec de vrais
credentials (aucun secret en base locale) — valider avec
`kasi-integrations-auditor` à la mise en service ; bug préexistant
`nx build` sous Windows (glob `mysql-archive/*.ts` non étendu) sans lien
avec P3, passe dans le build Docker Linux.

## 2026-07-15 — P3 volet 2 : call masking (appels anonymisés) — backend, contrat validé en local

**Chantier** : seconde moitié de P3 — appels anonymisés Kasiman↔passager. Conçu
par `kasi-integrations-auditor` (analyse read-only), implémenté par
`kasi-backend-services` (interrompu par une limite de session juste avant le
câblage final), **finalisé en session principale**.

**Décisions d'architecture** :
- **Entité SÉPARÉE `call_masking_provider`** (pas d'extension de `sms_provider`)
  — enums et colonnes disjoints (Orange SMS ≠ Orange Voice ; la voix a besoin de
  `proxyNumber`/`webhookAuthToken`/`sessionTtlMinutes`, pas de `senderId`/template).
- Enum extensible `CallMaskingProviderType { Direct, TwilioVoice }` (réservés
  futurs : AfricasTalking, Sip). **Provider day-1 = Twilio Voice en TwiML brut**
  (pas Twilio Proxy : on garde le mapping proxy↔course chez nous, « contrôle
  total »). Le rendu TwiML est encapsulé côté contrôleur, `resolveIncoming` du
  service reste provider-agnostique.
- **Mode `Direct`** = analogue du `LogOnly` SMS : `requestMaskedCall` renvoie le
  vrai numéro de l'autre partie → parcours mobile+backend testable en local sans
  Twilio ni webhook. Seed par défaut.
- **`CallMaskingService` dans `libs/order`** (partagé rider-api + driver-api,
  extractible comme prévu pour `SmsService`). Sessions Redis
  `callmask:session:{proxy}:{caller}` (+ index `callmask:order:{orderId}`) TTL =
  `sessionTtlMinutes`, purgées par `endSession(orderId)` branché sur les statuts
  terminaux (Finished/RiderCanceled/DriverCanceled/Expired).
- **DÉCISION PRODUIT (utilisateur)** : l'appel Kasiman→**destinataire de
  livraison** (Kasi Moto, non-utilisateur) reste `tel://` direct en phase 1 (pas
  de proxy entrant possible pour un non-utilisateur ; masquage = pont sortant,
  reporté). `delivery_info_view.dart` inchangé.

**Surface backend livrée** : mutation `requestMaskedCall(orderId): MaskedCallDTO
{ proxyNumber, expiresAt }` sur rider-api ET driver-api (gardes `GqlAuthGuard` +
participant de la course + statut actif ; erreurs `CALL_MASKING_NOT_ALLOWED` /
`ORDER_NOT_ACTIVE` / `NO_DEFAULT_CALL_MASKING_PROVIDER`). Webhook public
`POST /rider-api/call/voice-webhook` (contrôleur rider-api, miroir de
`payment_result`, non-JWT, validation de signature `X-Twilio-Signature` +
rendu TwiML `<Dial>`, urlencoded parsé nativement par NestFastify). Module admin
CRUD `call-masking-provider/` (nestjs-query OFFSET+totalCount, JwtAuthGuard,
`setDefaultCallMaskingProvider`, `testMaskedCall`), DTO de lecture **sans**
`apiSecret`/`webhookAuthToken`. `add_call_masking.sql` (idempotent, seed
`Direct (dev)`) appliqué en base locale — ⚠️ **checklist prod point 7**.

**Bug de finalisation corrigé** : rider-api crashait au boot
(`FST_ERR_CTP_ALREADY_PRESENT`) — l'agent avait ajouté un
`addContentTypeParser('application/x-www-form-urlencoded')` manuel dans
`main.ts`, en conflit avec celui que le `FastifyAdapter` de NestJS enregistre
déjà par défaut. Bloc retiré (Nest parse l'urlencoded nativement, `req.body`
arrive en objet). **Leçon : ne pas ré-enregistrer un content-type parser sous
NestFastify.** Autre gap comblé : câblage de `CallMaskingProviderModule` dans
`admin-api.module.ts` (l'agent s'était arrêté juste avant).

**Validation locale** : les 3 images rebuildées, les 3 APIs démarrent proprement
(« Nest application successfully started »). Introspection : `requestMaskedCall`
présent sur rider-api ET driver-api ; admin expose
`createOneCallMaskingProvider`/`setDefaultCallMaskingProvider`/`testMaskedCall` ;
type `CallMaskingProvider` = id/type/enabled/isDefault/name/accountId/
proxyNumber/sessionTtlMinutes/createdAt (secrets absents, vérifié). Garde :
`requestMaskedCall` sans JWT → `UNAUTHENTICATED` sur les deux APIs.

**Non testé en local (frontière mise en service, comme le SMS Twilio réel)** :
E2E « participant obtient le numéro » en mode Direct (aucune course active en
base locale + DEMO_MODE off → nécessiterait de semer course + tokens ; la garde
et la logique participant/course-active sont en place et revues) ; et surtout le
**vrai masquage vocal** (compte Twilio + numéro proxy + webhook public HTTPS +
validation de signature + bridging 2 jambes réel + coût/qualité de terminaison
au Sénégal). Voir checklist prod point 7.

**Volets panel + mobile livrés le 2026-07-16 (même lot, NON committé)** :
- **Panel** (`kasi-admin-panel`) : module `management-call-masking-provider/`
  (liste + fiche, `/management/call-masking-providers`, menu « Appels masqués »),
  secrets `apiSecret` ET `webhookAuthToken` write-only (envoyés seulement si non
  vides), TTL de session, « définir par défaut », « appel test ». i18n fr/en +
  translate-dummy. Codegen OK (6 services GQL), `ng build` prod OK, image
  admin-panel rebuildée : route `call-masking-providers` + « Appels masqués »
  servies en local.
- **Mobile** (`kasi-mobile-apps`) : les 2 boutons d'appel participants basculés
  sur `requestMaskedCall(orderId)` puis composition du `proxyNumber`
  (rider-app `order_status_sheet_view.dart`, driver-app
  `order_status_card_view.dart`) ; **repli gracieux** vers l'appel direct si la
  mutation échoue ou renvoie un numéro vide (équivalent en mode Direct) ; état de
  chargement via un nouveau paramètre `isLoading` de `rounded_button.dart`
  (client-shared, rétro-compatible). Destinataire de livraison
  (`delivery_info_view.dart`) laissé en `tel://` direct + commentaire (décision
  produit). Schémas des 2 apps mis à jour par introspection (insertion
  chirurgicale de `requestMaskedCall`/`MaskedCallDTO`), `build_runner` OK,
  `flutter analyze` **0 erreur** sur les 2 apps.
- **Trouvaille mobile** : `driver-app/lib/gen/assets.gen.dart` était committé
  SANS le patch `theme ?? const SvgTheme()` (contrairement à rider-app) → 1
  erreur `argument_type_not_assignable` préexistante à HEAD ; le même patch
  documenté (cf. entrée P1 mobile) lui a été appliqué. À re-vérifier après tout
  futur `build_runner` sur driver-app aussi, pas seulement rider-app.

**P3 call masking COMPLET côté local** (backend + panel + mobile). NON committé
(commit à la main de l'utilisateur, comme le volet SMS). Restent uniquement les
tâches de **mise en service** (checklist prod point 7 : compte Twilio + numéro +
webhook public + signature) et la republication des APK.

---

## 2026-07-17 — P6 : planification (dernier lot d'alignement Kasi ↔ Ridy v3)

P0→P5 clos, committés et testés OK sur device. Plan P6 produit par `kasi-supervisor`,
arbitrages tranchés par l'utilisateur.

**Correction de périmètre (le COMPARATIF du 14/07 est en partie périmé)** :
- **Gift Cards ~60 % déjà fait** : `libs/database/.../gift-card.entity.ts` existe
  (code, currency, amount, isUsed, availableTimestamp, expirationTimestamp) ET la
  mutation `redeemGiftCard(code): RiderWallet!` est codée/fonctionnelle
  (`apps/rider-api/.../coupon/coupon.service.ts` + `coupon.resolver.ts`) et
  **déjà exposée dans le schéma mobile rider** (`rider-app/lib/schema.gql:1069`).
  ⚠️ NE PAS recréer l'entité ni la mutation de rédemption.
- Champs driver livraison (`canDeliver`/`maxPackageSize`/`softRejectionNote`) déjà là (P1/P5).
- Infra cron `@nestjs/schedule` déjà présente (`driver-api/.../order/cron-job.service.ts`)
  → réutilisée pour Retention/Shift.

**Décisions utilisateur (2026-07-17) — périmètre P6 verrouillé :**
1. **RBAC multi-apps (Taxi/Shop/Parking) : ABANDONNÉ.** Kasi n'a que `Ride|Delivery`
   (`ServiceOrderType`), pas de Shop/Parking → le groupement par produit modéliserait
   une réalité inexistante. On garde le RBAC mono-app plat + on ajoute seulement 9
   permissions P6. **Écart Kasi↔Ridy assumé** (mono-app par choix). À rouvrir si
   « Kasi Moto » devient une ligne produit séparée à opérateurs distincts.
2. **Email Providers : SMTP générique (nodemailer)**, pas d'API tierce → souveraineté/
   « contrôle total ». Passage `kasi-integrations-auditor` obligatoire avant impl.
   Périmètre réduit : providers + 1 template transactionnel (pas d'éditeur multi-templates).
3. **Shift Rules : mode SOFT** (avertissement non bloquant, désactivable via `enforced`) —
   ne pas mettre les Kasimen hors ligne pendant l'amorçage.
4. **Document Retention : inclus (P6.4, en dernier), en `dryRun` d'abord** (log de ce qui
   serait supprimé) ; activation réelle de la suppression destructive seulement après
   validation explicite utilisateur.

**Ordre de bataille** : Lot 0 fondation (9 permissions dans `operator-permission.enum.ts`,
mono-owner) → **P6.1 Gift Cards** → **P6.2 Email (SMTP)** → **P6.3 Shift Rules (soft)** →
**P6.4 Document Retention (dryRun)**. Backend d'abord à chaque lot, puis panel+mobile,
build+codegen+vérif CDP/analyze centralisés en session principale.

**Gabarits** : `apps/admin-api/src/app/payout/` (module session→enfants, pour Gift Batch),
`apps/admin-api/src/app/sms-provider/` (CRUD simple, pour Email/Shift/Retention),
panel `cms/marketing/coupons/` (Gift) et `cms/management/management-sms-provider/` (autres).

**Fichiers partagés mono-propriétaire** (1 seul agent/passe) : `operator-permission.enum.ts`,
`database.module.ts`, `admin-api.module.ts`, `admin-panel/.../i18n/fr.json` + menu/routing CMS ;
`apps/admin-panel/generated/graphql.ts` = JAMAIS à la main (codegen central).

**Pièges** : schéma mobile non auto-synchro (mais `redeemGiftCard` déjà présent, donc P6.1
mobile = juste câbler le bouton `enter_gift_code_sheet_view.dart` `onPressed:(){}` vide +
opération `.graphql` + build_runner) ; migrations SQL prod explicites par entité (GiftBatch,
EmailProvider, ShiftRule, RetentionPolicy + colonne `gift_card.batchId` + valeurs d'enum) via
`kasi-devops-infra` en clôture de lot ; divergence apps (Gift=rider only, Shift=driver only,
Email/Retention=admin only) à acter par lot.

---

## 2026-07-17 — P6.3 Shift Rules (soft) + P6.4 Document Retention (dryRun) — CLÔTURE P6

**P6 terminé** (P6.1 Gift + P6.2 Email committés par l'utilisateur au préalable ;
P6.3 + P6.4 réalisés le 2026-07-17, tout build vert, NON COMMITTÉ — l'utilisateur commite lui-même).
Orchestration : superviseur kasi → Vague A (3 agents backend) → SYNC 1 (câblage + compile + Docker admin-api + codegen) →
Vague B (2 agents panel) → SYNC 2 (routing/menu/i18n + build) → Vague C (driver-api read query + agent mobile).

### P6.3 Shift Rules — mode SOFT confirmé
- Entité `shift_rule` : `name, enabled, frequency (enum Daily|Weekly), maxHoursPerPeriod:int,
  mandatoryBreakMinutes:int, enforced:bool=false, createdAt`. Entité TypeORM pure, exposition via DTO
  (convention réelle du repo : AUCUNE entité ne porte de décorateur GraphQL).
- admin-api : module CRUD nestjs-query (`apps/admin-api/src/app/shift-rule/`), authorizer
  `ShiftRules_View`/`ShiftRules_Edit`. Input GraphQL = **`ShiftRuleInput` unique** (create+update),
  PAS `Create/UpdateShiftRuleInput` (piège codegen panel corrigé).
- driver-api : (a) avertissement SOFT greffé DANS le cron existant `order/cron-job.service.ts`
  (`@Interval(300_000)`, méthode `enforceShiftRulesSoft()`), estimation prudente du temps de travail
  par somme des courses TERMINÉES (sous-estime → ne sur-avertit jamais), `Logger.warn` +
  notification informative via canal driver existant. **AUCUN chemin ne met un driver offline**,
  même `enforced=true` (durcissement = TODO P6+). (b) query lecture seule `shiftRules`/`shiftRule`
  (`apps/driver-api/src/app/shift-rule/`, guard `GqlAuthGuard` driver) pour affichage mobile.
- Panel : `cms/management/management-shift-rules/` (liste + view + CRUD), menu MANAGEMENT + routing
  `management/shift-rules` + i18n `shiftRules.*`/`shiftRule.*` (fr+en).
- Mobile driver : bannière informative `lib/shift_rules/shift_rule_banner_view.dart` sur l'écran
  Gains (`earnings_view.dart`), query `ActiveShiftRules` (`filter:{enabled:{is:true}}`), strictement
  non bloquante (`SizedBox.shrink()` si vide/erreur/loading), style thème (pétrole/orange, sans couleur en dur).
  i18n `.arb` : `shift_rule_banner_daily/weekly/break`.

### P6.4 Document Retention — dryRun, 100% NON DESTRUCTIF confirmé
- Entité `retention_policy` : `name, enabled, retentionDays:int, dryRun:bool=true, lastRunAt?, createdAt`.
- admin-api : module CRUD (`apps/admin-api/src/app/retention-policy/`), authorizer
  `DocumentRetention_View`/`Edit`. Job `@Interval` (24h) : `ScheduleModule.forRoot()` enregistré dans
  CE module (admin-api n'en avait pas). `dryRun=true` (défaut) → LOG seulement ; `dryRun=false` →
  WARNING « suppression réelle désactivée en attente de validation » — **aucune suppression physique
  n'est câblée à ce stade**. Mutation `runRetentionPolicyDryRun` (déclencheur manuel non destructif).
- **Limitation actée** : entité cible = `MediaEntity` (seule entité fichiers), MAIS elle n'a
  AUCUNE colonne temporelle (`createdAt`/`uploadedAt` absent) → l'âge d'un document n'est pas
  calculable en base. Le job log la cible + l'impossibilité et ne flague jamais aucune ligne
  (`eligibleIds=[]`). Point d'extension commenté (`LessThan(cutoff)`) pour le jour où une colonne
  de date sera ajoutée à `MediaEntity` (chantier futur, hors P6).
- Panel : `cms/management/management-retention/`, menu + routing `management/retention`, i18n
  `retention.*`. UX sécurité : `dryRun` coché par défaut + `nz-alert` warning si décoché
  (« purge réelle activée ultérieurement après validation »).

### Piège schéma mobile driver résolu (à retenir)
Le codegen `graphql_codegen` du driver-app résout les types contre **`driver-app/lib/schema.gql`**,
PAS contre `driver-app/driver.schema.gql` (listé dans build.yaml mais inerte pour la résolution de types).
Régénérer `driver.schema.gql` (introspection :3002) n'a PAS suffi ; il a fallu patcher `lib/schema.gql`.
→ `driver.schema.gql` a été **reverté** (regen = bruit inutile) ; seul le bloc ShiftRule minimal (+81 l.)
a été inséré dans `lib/schema.gql`. **Source de vérité mobile = `lib/schema.gql`.** À clarifier/dé-dupliquer
un jour (un seul fichier schéma driver).

### Vérifs (toutes vertes, session principale)
`admin-api:compile` OK · `driver-api:build` OK · Docker admin-api + driver-api rebuild & live
(:3000 expose `ShiftRule`+`RetentionPolicy`, :3002 expose `shiftRules`) · codegen panel = 11 services
générés · `nx build admin-panel` EXIT 0 · driver-app `build_runner` OK + `flutter analyze` 0 erreur
(driver ET rider, aucune régression rider).

### Migration SQL prod (cumul P6.3+P6.4, à jouer via kasi-devops-infra)
- Table **`shift_rule`** · Table **`retention_policy`** · (les 9 valeurs d'enum permissions étaient
  déjà dans le lot P6.1/P6.2). Rebuild images admin-api + driver-api + admin-panel ; republier APK driver.
- RBAC multi-apps = **ABANDONNÉ** (décision 2026-07-17, Kasi mono-app Ride|Delivery).

---

## 2026-07-23 - Triage de 3 bugs fonctionnels trouves pendant la reverence design (Ridy vers Kasi)

Contexte : session de comparaison page-a-page des captures Ridy
(Kasi-ressources/ScreenShot/UX-ridy/web/) vs Kasi (.../NewKasi/), reference
de qualite = "edit kasiman". En comparant, 3 sujets identifies comme de vrais
bugs fonctionnels (pas du pur alignement visuel) ont ete remontes au
superviseur, qui a confirme/creuse chaque diagnostic par lecture de code
directe (pas de supposition) avant repartition. Le chantier d'alignement
page-a-page reste ouvert en parallele, simplement mis en pause le temps du
triage.

### Sujet 1 - Apercu (overview) : cartes de stats bloquees + chevauchement topbar

Constat code : overview.component.html utilise deux blocs @if separes,
chacun avec son propre pipe async sur le meme observable query
(this.route.data.pipe(map(data => data.overview)), alimente par
overview.resolver.ts qui retourne this.gql.fetch() - un resolver de route
Angular classique, resolu AVANT activation). C'est un anti-pattern reel (deux
souscriptions au lieu d'une) mais qui ne devrait normalement PAS causer un
blocage permanent : ActivatedRoute.data rejoue sa derniere valeur aux
abonnes tardifs. Fix recommande quand meme (economie + robustesse) :
fusionner en un seul bloc @if (query | async; as result) avec result == null
pour le squelette et result?.data; as data en @else.

Sur le chevauchement visuel topbar/cartes : lecture de cms.component.css -
le layout est structurellement correct (.kasi-rail et .kasi-topbar en
position: sticky; top:0, dans un flex .kasi-shell/.kasi-main classique, pas
de bug de padding/z-index evident). Hypothese alternative serieuse et NON
tranchee : la capture "Kasi panel apercu.png" a probablement ete produite par
un outil de capture pleine-page (CDP captureBeyondViewport ou
scroll-and-stitch), connu pour mal restituer les elements position: sticky
(ils apparaissent "geles" a la position de scroll du moment de la capture au
lieu de leur position reelle en haut de viewport) - coherent avec le fait que
la barre chevauchante apparait a mi-hauteur, pas a y=0. Non verifiable en
live ce tour-ci (extension Chrome injoignable). Les cartes vides
("squelette") pourraient de meme etre un effet de capture declenchee avant
resolution de la query plutot qu'un vrai blocage.

Repartition : kasi-admin-panel - (a) appliquer le fix du double-async par
precaution, (b) verifier en live (recharger, scroller, inspecter DevTools)
des que possible pour trancher reel bug vs artefact de capture, (c) si le
chevauchement est confirme reel, creuser stacking context/z-index.
Statut : diagnostic partiel, fix mineur propose, confirmation live requise.

### Sujet 2 - Tuiles Mapbox web + carte statique cassee (raffine)

Le mecanisme d'injection du token Mapbox au build est sain (deja verifie par
l'utilisateur : token present dans le bundle JS servi par le conteneur). Le
cablage provideMapboxGL / mgl-map est egalement sain : tous les usages de
carte dans admin-panel (Apercu, zone-prices, fleet-view, dispatcher,
request-view-assign, region-view) passent par le composant mgl-map de
ngx-mapbox-gl, qui consomme le token via le service DI interne - aucune
instanciation directe de mapbox-gl Map en dehors de ce mecanisme n'a ete
trouvee dans admin-panel/src. La capture "Kasi panel apercu.png" elle-meme
montre d'ailleurs des tuiles Mapbox bien rendues (attribution mapbox visible,
marqueur chauffeur affiche) - ce qui contredit en partie l'hypothese d'un
echec systemique des tuiles.

Bug distinct et confirme, trouve en creusant l'ecran "Demande #8.png" (image
cassee notee dans le rapport initial) : request-view-info.component.ts
getMapAddress() construit encore une URL Google Maps Static API
(maps.googleapis.com/maps/api/staticmap avec parametre key) en utilisant
currentConfig.currentConfiguration.adminPanelAPIKey. Or app.component.ts
documente explicitement (commentaire du 2026-07-01, migration Mapbox) que ce
champ contient desormais un token Mapbox, plus une cle Google - l'appel
Google echoue donc systematiquement (cle invalide au sens de Google) - icone
d'image cassee. getMapAddress() a ete oublie lors du nettoyage de la
migration Mapbox du 2026-07-01. Fix direct et non ambigu : remplacer l'appel
Google Static Maps par l'API Mapbox Static Images
(api.mapbox.com/styles/v1/mapbox/streets-v12/static/... + environment.mapboxToken),
coherent avec le reste de l'app.

Constat additionnel (dette, pas la cause du bug ci-dessus) : le champ
MapSetting.mapboxToken (entite DB + ecran Management > Parametres carte,
management-map-settings/) n'est cable nulle part dans l'initialisation
reelle de Mapbox - provideMapboxGL({ accessToken: environment.mapboxToken })
dans shared.module.ts n'utilise que le token injecte au build, jamais le
reglage DB. Un operateur peut donc changer ce champ dans l'UI sans aucun
effet - reglage fantome, a signaler.

Repartition :
- kasi-integrations-auditor : trancher le remplacement Google Static Maps
  vers Mapbox Static Images (usage tiers, cf. regle "jamais de nouvelle
  integration sans passage par cet agent" - ici c'est une substitution d'un
  usage Google existant par Mapbox, dans l'esprit de la decision du
  2026-07-01, mais a valider formellement) ; trancher aussi le sort du
  reglage MapSetting.mapboxToken fantome (le wirer reellement, ou le retirer
  de l'UI pour ne pas induire en erreur).
- kasi-admin-panel : implementer le remplacement dans getMapAddress() une
  fois tranche.
- Hypothese restriction referrer/domaine Mapbox dashboard (prod vs
  localhost) : reste possible pour d'eventuels autres cas de tuiles
  manquantes non encore identifies, mais n'explique PAS le bug confirme
  ci-dessus (qui est un vrai bug de code, pas un souci de token/domaine). A
  garder en tete si un vrai cas de tuiles manquantes est confirme en live
  ailleurs.
Statut : 1 bug confirme avec fix clair (Google Static Maps oublie) ; 1 dette
confirmee (reglage DB fantome) ; hypothese tuiles web a re-tester en live.

### Sujet 3 - Assets uploades casses (avatars, documents) - cause reelle differente de l'hypothese initiale

L'hypothese initiale (bloc nginx /uploads/ manquant) est INVALIDEE par
lecture de code : le frontend ne demande jamais /uploads/... directement -
il construit toujours environment.root + address ou environment.root vaut
protocol//host/admin-api/ (voir driver-profile.component.html,
driver-profile-documents.component.ts, rider-view.component.html,
management-payment-gateways etc.). La requete resultante
(/admin-api/uploads/xxx.jpg) EST bien couverte par le bloc nginx existant
location /admin-api/ (rewrite retire le prefixe, proxy vers admin-api:3000,
qui sert /uploads/ via app.useStaticAssets dans main.ts). Ce chemin
fonctionne structurellement.

Vraie cause racine n.1 (confirmee, structurelle) : mismatch de stockage
inter-services. admin-api, driver-api ET rider-api ont CHACUN leur propre
UploadService / route d'upload (admin-api : POST /upload ; driver-api :
POST /upload_profile et POST /upload_document ; rider-api : POST
/upload_profile), ecrivant CHACUN sur le disque local de LEUR PROPRE
conteneur (process.cwd()/uploads, soit /app/uploads), avec la meme
MediaEntity (table Postgres partagee) enregistrant juste un chemin relatif
(uploads/timestamp-filename.ext). Concretement : un chauffeur qui
televerse sa photo de profil ou un document via l'app mobile passe par
driver-api, et le fichier est physiquement stocke sur le disque du
conteneur driver-api. Mais admin-panel construit TOUJOURS l'URL via le
prefixe /admin-api/ (jamais /driver-api/ ni /rider-api/), donc la requete
atteint le disque du conteneur admin-api, ou ce fichier n'existe PAS -> 404
-> icone cassee. Ce bug touche potentiellement tout avatar/document de
chauffeur ou de client consulte depuis le panel, des le premier
televersement, independamment de tout redeploiement. Seuls les assets
televerses PAR un operateur directement dans admin-panel (icones de
passerelle de paiement, icones de service, via l'endpoint /upload d'admin-api
lui-meme) fonctionnent correctement, puisqu'ils sont bien lus depuis le meme
conteneur qui les sert.

Vraie cause racine n.2 (confirmee, distincte, s'ajoute a la n.1) : volumes
Docker absents. docker-compose.yml ne monte AUCUN volume pour uploads/ sur
admin-api, driver-api NI rider-api (seul ./config:/app/config existe, pour
la config Firebase/runtime). Les 3 services ecrivent donc dans la couche
writable ephemere du conteneur : toute recreation/rebuild (docker compose up
--build, mise a jour d'image) efface definitivement tous les fichiers deja
televerses sur ce service, meme ceux qui, par construction, etaient
accessibles (cas admin-api vers admin-api).

Fix unifie recommande : monter le MEME repertoire hote comme /app/uploads
dans les 3 conteneurs (admin-api, driver-api, rider-api), par exemple
./uploads:/app/uploads sur chacun des 3 services - cela resout
SIMULTANEMENT la cause n.1 (les 3 services partagent alors le meme
repertoire physique, donc n'importe lequel peut servir un fichier ecrit par
n'importe quel autre) et la cause n.2 (persistance au travers des rebuilds,
meme pattern que ./config:/app/config deja en place). Risque residuel mineur
a noter : collision de nom de fichier entre 2 services ecrivant au meme
timestamp+nom - probabilite tres faible, pas bloquant. Alternative plus
lourde (objet storage S3/MinIO) ecartee pour l'instant, a evaluer par
kasi-integrations-auditor seulement si le volume partage s'avere
insuffisant a terme (scalabilite multi-hote).

Repartition :
- kasi-devops-infra : ajouter le volume partage uploads aux 3 services dans
  docker-compose.yml (dev ET prod), documenter le risque de perte des
  fichiers deja uploades avant ce fix (les fichiers physiquement absents des
  disques actuels ne peuvent pas etre recuperes retroactivement).
- kasi-backend-services : verifier qu'aucune autre logique ne suppose une
  separation stricte des repertoires uploads/ par service (ex. nettoyage/
  purge, retention_policy du chantier P6.4) avant le passage en volume
  partage.
Statut : cause racine confirmee par lecture de code (double : mismatch
inter-services + absence de volume), fix concret propose, non encore
implemente.

### Synthese repartition

| Sujet | Agent(s) | Statut |
|---|---|---|
| 1 - Apercu skeleton + chevauchement | kasi-admin-panel | diagnostic partiel, fix mineur propose, confirmation live requise |
| 2 - Carte statique Google oubliee + reglage Mapbox DB fantome | kasi-integrations-auditor puis kasi-admin-panel | bug confirme avec fix clair + dette confirmee |
| 3 - Assets uploades casses (mismatch inter-services + volumes absents) | kasi-devops-infra puis kasi-backend-services (verif non-regression) | cause racine confirmee, fix concret propose, a implementer |

Le chantier d'alignement visuel page-a-page (Ridy vers Kasi, reference "edit
kasiman") reste ouvert en parallele, simplement mis en pause le temps de ce
triage - pas remplace par ces 3 bugs.

---

## 2026-07-23 — Suite du triage : décisions confirmées, dispatch implémentation

### Sujet 2 — décision `kasi-integrations-auditor`

Fiche de décision reçue : **remplacer `getMapAddress()` (image statique
Google Maps cassée sur `request-view-info`) par une mini-carte interactive
`<mgl-map>`**, en recopiant le pattern déjà établi dans le composant frère
`request-view-assign.component.html` (mêmes données `order.points`, mêmes
assets `marker_pickup.png`/`marker_destination.png`) et la logique
`fitBounds`/`LngLatBounds` d'`overview-drivers-map.component.ts` pour le
cadrage automatique. Écarté : l'équivalent statique Mapbox (plafond 1280px,
reste un couplage fort à une URL construite à la main — le même défaut
structurel que le bug actuel).

Sur `MapSetting.mapboxToken` : **diagnostic initial corrigé** — ce n'est
PAS un réglage fantôme. Il est réellement consommé par `rider-api`
(géocodage, `mapbox-geo.service.ts`), `routing.service.ts` (itinéraires
backend), et le bootstrap carte des deux apps mobiles (`map_setting_bootstrap.dart`
driver-app/rider-app). Il est simplement indépendant du token utilisé par
les cartes de l'admin-panel lui-même (`environment.mapboxToken`, injecté au
build via l'ARG Docker). Décision : **garder tel quel**, juste ajouter une
note i18n dans l'écran Management > Paramètres carte clarifiant sa portée
réelle (backend + mobile, pas les cartes du panel). Observation annexe hors
scope : le couple `adminPanelAPIKey`/`backendMapsAPIKey` dans
`config.component.ts` est un vestige de l'assistant de configuration
initiale du template — candidat à une fiche de triage future séparée.

### Sujet 2 (suite) — confirmation terrain de l'utilisateur

Logs console navigateur fournis par l'utilisateur en conditions réelles,
confirmant/précisant l'hypothèse de restriction d'URL :
1. **Confirmé par l'utilisateur** : le token Mapbox a bien une restriction
   d'URL côté dashboard Mapbox qui n'autorise pas `http://localhost`.
   Action humaine hors-code (dashboard Mapbox, ajouter `http://localhost*`
   aux origines autorisées) — l'utilisateur s'en charge.
2. **Bug de build distinct et réel, trouvé dans les logs** : `An error
   occurred while parsing the WebWorker bundle. This is most likely due to
   improper transpilation by Babel` — le builder esbuild d'Angular 22
   empaquette mal le WebWorker interne de mapbox-gl-js (utilisé pour parser
   les tuiles hors thread principal). Affecte le composant carte interactif
   de la page Aperçu (`overview-drivers-map`). Transmis à
   `kasi-admin-panel` pour investigation (config esbuild/ngx-mapbox-gl).
3. Non-problème identifié et à ignorer : `ERR_BLOCKED_BY_ADBLOCKER` sur
   `events.mapbox.com/events/v2` — télémétrie Mapbox bloquée par l'ad-blocker
   du navigateur de l'utilisateur, aucun impact fonctionnel.

### Dispatch en cours (session du 2026-07-23)

Trois agents lancés en parallèle par la session principale :
- `kasi-devops-infra` : fix volume uploads partagé (Sujet 3).
- `kasi-integrations-auditor` : décision Sujet 2 ci-dessus (terminé).
- `kasi-admin-panel` : fix double-async Aperçu (Sujet 1) + bug WebWorker
  Mapbox (Sujet 2, ajouté en cours de tâche) + implémentation du
  remplacement `<mgl-map>` sur `request-view-info` et de la note i18n sur
  `map-settings` (Sujet 2, décision ci-dessus, ajouté en cours de tâche).
Statut : en cours, résultats à consigner à la complétion de chaque agent.

### Sujet 3 — `kasi-devops-infra` : fix implémenté et validé en local

**Confirmation du chemin par lecture de code** : les 3 services sont bien
identiques — `WORKDIR /app` dans les 3 `Dockerfile` (`apps/admin-api`,
`apps/driver-api`, `apps/rider-api`), et chacun des 3 `main.ts` appelle
`app.useStaticAssets({ root: join(process.cwd(), 'uploads'), prefix:
'/uploads/' })`, soit `/app/uploads` dans les 3 conteneurs sans divergence.
Les endpoints d'upload (`admin-api.controller.ts` `POST /upload`,
`driver-api.controller.ts` `POST /upload_profile` et `POST
/upload_document`, `rider-api.controller.ts` `POST /upload_profile`,
`upload.service.ts` pour admin-api) écrivent tous dans le même `dir =
'uploads'` relatif. Nommage de fichier : `${Date.now()}-${filename original}`
(ou `${Date.now()}` seul comme préfixe pour admin-api) — collision inter-
services uniquement si deux uploads strictement au même timestamp
milliseconde ET même nom de fichier original ; risque résiduel jugé
négligeable, non bloquant, à garder en tête si une purge apparaît.

**Fix appliqué** dans `docker-compose.yml` : ajout de
`./data/uploads:/app/uploads` sur les 3 services `admin-api`, `driver-api`,
`rider-api` (même pattern que `./config:/app/config` déjà en place),
répertoire hôte `data/uploads/` créé. `.gitignore` mis à jour (`/data/` —
données utilisateur, jamais versionnées, même traitement que `/config/`).

**Validation en local (stack déjà en cours d'exécution)** :
- Avant le fix : `/app/uploads` n'existait dans AUCUN des 3 conteneurs
  (confirmé par `docker exec ... ls`) — preuve directe de la cause n°2
  (perte au rebuild, aucun fichier d'upload de test n'avait survécu).
- `docker compose up -d admin-api driver-api rider-api` : recréation propre
  des 3 conteneurs, logs de démarrage sans erreur, `Nest application
  successfully started` pour les 3.
- `docker inspect` confirme le même mount source
  (`.../app-kasi/data/uploads`) sur les 3 conteneurs.
- Test croisé : fichier écrit directement dans `data/uploads/` côté hôte →
  visible instantanément dans les 3 conteneurs (`docker exec ... ls`) → servi
  avec succès en HTTP 200 via `http://localhost/admin-api/uploads/...`
  (le chemin nginx que l'admin-panel utilise systématiquement). Reproduit
  fidèlement le scénario du bug (fichier "écrit par driver-api", lu par
  admin-api). Fichier de test supprimé après vérification.
- Vérifié au passage (piège connu, IP upstream nginx figée au démarrage) :
  `curl http://localhost/{admin,driver,rider}-api/` → 200 sur les 3 après
  recréation des conteneurs, pas de 502 — le pattern `resolver 127.0.0.11` +
  variable dans `proxy_pass` déjà en place tient bien.

**⚠️ Action requise en production (hors périmètre de cet agent, à valider
par l'utilisateur)** : le VPS `kasigroupe.tech` déploie `/opt/kasi` en
`git clone` du même dépôt et son runbook de mise à jour est `cd /opt/kasi &&
git pull && docker compose build && docker compose up -d && docker compose
restart nginx` (cf. entrée du 2026-07-03/2026-07-10) — il tourne donc
potentiellement avec le même `docker-compose.yml` non corrigé, donc SANS
volume `uploads`, donc avec le même risque de perte de fichiers à chaque
mise à jour ET la même icône cassée pour tout avatar/document chauffeur
consulté depuis le panel. Avant d'appliquer ce fix en prod :
1. Sauvegarder `/app/uploads` des 3 conteneurs prod AVANT toute recréation
   (`docker cp kasi-admin-api:/app/uploads ...`, idem driver/rider) — la
   recréation avec le nouveau mount écrasera le contenu de la couche
   writable éphémère existante s'il y en a.
2. Fusionner ces 3 sauvegardes dans `/opt/kasi/data/uploads/` (créer le
   dossier) avant de démarrer les conteneurs avec le nouveau
   `docker-compose.yml`, pour ne perdre aucun fichier déjà en place.
3. Ensuite seulement : `git pull` + runbook standard ci-dessus.
Cet agent n'a rien déployé sur le VPS — c'est une action humaine/session
principale à valider explicitement avant exécution.

**Vérification demandée à `kasi-backend-services`** (non réalisée par cet
agent, hors périmètre infra) : confirmer qu'aucune logique de purge/
rétention (`retention_policy` du chantier P6.4) ne suppose une séparation
par service des fichiers dans `uploads/` avant le passage définitif en
répertoire partagé.

Fichiers modifiés : `docker-compose.yml` (3 volumes ajoutés), `.gitignore`
(`/data/` ajouté). Statut : fix implémenté et validé en local, action prod
en attente de validation utilisateur.

### Sujet 3 (suite) — `kasi-backend-services` : vérification non-régression
`retention_policy` (P6.4) vs répertoire uploads partagé — AUCUN RISQUE

Vérification demandée ci-dessus effectuée par lecture de code. Conclusion :
**aucun risque, aucune régression, aucun correctif nécessaire.**

**Localisation** : `apps/admin-api/src/app/retention-policy/
retention-policy.service.ts` (job `@Interval` quotidien, seule
implémentation du chantier P6.4 — pas d'autre job/resolver touchant au
filesystem pour la rétention).

**Constat** : le job `purgeExpiredDocuments()` ne fait **aucune opération
filesystem**. Aucun `import` de `fs`/`path`, aucun `readdir`/`unlink`/accès
à un répertoire `uploads` quelconque, ni relatif ni absolu, ni spécifique à
un service. Toute la logique passe exclusivement par TypeORM :
- `this.policyRepo.findBy({ enabled: true })` (table `retention_policy`,
  agnostique du service — un seul admin-api l'exécute de toute façon).
- `this.mediaRepo.count({ where: { driverDocumentId: Not(IsNull()) } })`
  (table `media`, entité `MediaEntity` — `libs/database/src/lib/entities/
  media.entity.ts`), qui ne comporte qu'un champ `address` (string libre,
  jamais lu par le job) et aucune colonne de date exploitable
  (`createdAt`/`uploadedAt` absentes).

Conséquence déjà documentée dans le code lui-même (commentaires du fichier,
lignes 15-19 et 47-51) : faute de colonne temporelle sur `MediaEntity`,
`eligibleIds` reste **toujours un tableau vide** — 0 document n'est jamais
réellement éligible au calcul d'âge, et même si `dryRun=false`, la
suppression physique est **volontairement non câblée** (juste un
`logger.warn`, aucun `unlink`/appel HTTP de suppression). Le job est donc
actuellement un no-op inoffensif vis-à-vis du filesystem, qu'il y ait un
`uploads/` par service ou un répertoire partagé — il ne l'a jamais consulté
et ne le consulte toujours pas.

**Donc** : le passage à `./data/uploads` partagé (Sujet 3 ci-dessus) ne
casse rien côté P6.4, et n'aggrave ni ne corrige le TODO connu (ajouter une
colonne de date à `MediaEntity` pour rendre la purge effective un jour).
Pas de risque fantôme à traiter ici — si/quand la purge physique sera
câblée à l'avenir, il faudra alors veiller à ce qu'elle résolve le chemin
via la même base (`process.cwd()`, `'uploads'` relatif) que les 3
contrôleurs d'upload, cohérente avec le mount partagé déjà en place ; ce
sera à valider à ce moment-là, pas aujourd'hui.

Fichiers consultés (aucun modifié) : `apps/admin-api/src/app/
retention-policy/retention-policy.service.ts`,
`apps/admin-api/src/app/retention-policy/retention-policy.module.ts`,
`libs/database/src/lib/entities/retention-policy.entity.ts`,
`libs/database/src/lib/entities/media.entity.ts`. Statut : vérification
terminée, sujet 3 définitivement clos côté rétention documentaire.

---

## 2026-07-23 — kasi-admin-panel : implementation Sujet 1 (double-async) + Sujet 2 (mgl-map + worker Mapbox + note i18n)

Quatre correctifs livres dans le meme passage, par ordre de priorite fixe
par le superviseur : (1) double-async Apercu, (2) remplacement mgl-map sur
Demande #8, (3) bug WebWorker Mapbox (exploratoire), (4) note i18n
MapSetting.mapboxToken. Les quatre sont complets.

### 1. Fix double-async - overview.component.html

(query | async) etait appele deux fois independamment dans deux blocs @if
separes (skeleton + cartes de metriques), souscrivant deux fois au meme
flux route.data.pipe(map(...)). Fusionne en un seul point de souscription
(@if (query | async; as result) { @if (result == null) { skeleton } @else if (result.data; as data) { cartes inchangees } }).

Anti-pattern reel corrige par precaution (economie de souscription,
robustesse), conformement a ce que le triage du 2026-07-23 avait deja
identifie sans trancher la cause exacte du symptome visuel (probable
artefact de capture plein-page sur element position: sticky, non reproduit
en dehors d'une capture CDP). Fichier :
apps/admin-panel/src/app/cms/home/overview/overview.component.html.

### 2. Remplacement getMapAddress() (Google Static Maps casse) par une mini-carte mgl-map interactive - request-view-info

Conformement a la decision kasi-integrations-auditor du 2026-07-23 (entree
precedente) : RequestViewInfoComponent.getMapAddress() (URL
maps.googleapis.com/maps/api/staticmap construite avec un token qui est en
realite un token Mapbox depuis la migration du 2026-07-01 - cause du bug)
est supprimee. Remplacee par une carte Mapbox interactive recopiant :
- le pattern marqueurs de request-view-assign.component.html
  (assets/marker_pickup.png sur le point d'index 0, marker_destination.png
  sur les suivants, via @for sur order.points avec [lngLat]
  [point.lng, point.lat] - ordre Mapbox inverse vs Google) ;
- le pattern cadrage automatique de overview-drivers-map.component.ts
  (centerMap()/fitBounds avec LngLatBounds), adapte en
  onMapLoad()/fitBounds() dans request-view-info.component.ts, avec
  gestion du cas ou les donnees du trajet arrivent avant le mapLoad de la
  carte (pendingFitPoints, meme strategie que request-view-assign).

Le lien target="_blank" vers l'image plein ecran est retire (l'admin peut
desormais zoomer/deplacer directement dans la mini-carte) - seule perte
fonctionnelle identifiee par l'auditeur, jugee acceptable.

Nouvelle classe utilitaire mgl-map.h-300 { height: 300px; } ajoutee dans
styles.scss a cote des classes .h-384/.h-400/.h-700 existantes (la hauteur
sur mgl-map casse le rendu si posee en style inline directement -
commentaire deja present dans le fichier, cf. classes dediees).

CurrentConfigService (uniquement utilise par getMapAddress() pour
adminPanelAPIKey) retire des imports de request-view-info.component.ts ;
toujours utilise ailleurs dans le panel (config.component.ts etc.), rien a
nettoyer cote service lui-meme.

Fichiers modifies :
apps/admin-panel/src/app/cms/requests/request-view/request-view-info/request-view-info.component.ts,
.../request-view-info.component.html,
apps/admin-panel/src/styles.scss.

### 3. Bug WebWorker Mapbox (An error occurred while parsing the WebWorker bundle) - cause identifiee et corrigee

Confirme par l'utilisateur : deux causes distinctes coexistaient sur les
cartes interactives web.

Cause A (hors code, action humaine) : le token Mapbox actuel a une
restriction d'URL cote dashboard Mapbox qui n'autorise pas
http://localhost. Aucune action cote code - a corriger dans le dashboard
Mapbox (ajouter http://localhost* aux URL autorisees du token, ou utiliser
un token de dev separe sans restriction pour l'environnement local).

Cause B (code, corrigee) : l'admin-panel construit toujours avec le
builder Angular Webpack classique (@angular-devkit/build-angular:browser,
PAS le builder esbuild application - verifie dans
apps/admin-panel/project.json). mapbox-gl-js (v3.26, dist/mapbox-gl.js)
embarque son propre WebWorker en tant que bundle auto-heberge, instancie
via une Blob URL generee a partir de son propre code source - mecanisme
qui ne survit pas au bundling par un module bundler tiers (Webpack ici),
qui casse le pattern d'auto-referencement. C'est le scenario documente
officiellement par Mapbox (lien cite dans le message d'erreur,
docs.mapbox.com/mapbox-gl-js/guides/install/#transpiling) et par le
typage mapbox-gl.d.ts lui-meme (workerUrl/workerClass, commentaire
« Provides an interface for external module bundlers such as Webpack or
Rollup to package mapbox-gl's WebWorker into a separate class »).

Fix retenu (le plus portable, ne depend d'aucune magie specifique au
bundler) : servir le worker CSP autonome de mapbox-gl-js
(node_modules/mapbox-gl/dist/mapbox-gl-csp-worker.js - script IIFE
autoportant, pas un module ES, donc pas d'import direct cote TypeScript)
comme asset statique, et pointer mapboxgl.workerUrl dessus avant toute
instanciation de new mapboxgl.Map(...), donc dans main.ts, avant
bootstrapModule :

import mapboxgl from 'mapbox-gl';
mapboxgl.workerUrl = 'assets/mapbox-gl-csp-worker.js';

mapboxgl (export par defaut de mapbox-gl) est le meme singleton module que
celui utilise partout ailleurs dans l'app via les imports nommes (import
{ Map, LngLatBounds } from 'mapbox-gl', cf.
overview-drivers-map.component.ts, request-view-assign.component.ts,
request-view-info.component.ts) - pas besoin de dupliquer le bundle
mapbox-gl-csp.js complet (contrairement a l'exemple litteral de la doc
Mapbox qui importe aussi la variante CSP du bundle principal ; ici seul le
fichier worker est necessaire puisque workerUrl/workerClass sont des
proprietes de l'objet mapboxgl standard, pas exclusives a la variante CSP).

Asset ajoute a la config assets de apps/admin-panel/project.json :
{ "glob": "mapbox-gl-csp-worker.js", "input": "node_modules/mapbox-gl/dist", "output": "assets/" }

Verification :
- nx build admin-panel (dev) et nx build admin-panel --configuration
  production (avec injection du vrai token Mapbox local via
  .env/MAPBOX_TOKEN, comme le fait le Dockerfile, puis fichier
  environment.prod.ts restaure immediatement apres le build - jamais
  committe) : les deux passent, exit 0.
- dist/apps/admin-panel/assets/mapbox-gl-csp-worker.js present apres
  build (copie d'asset confirmee).
- Build de production deploye dans le conteneur kasi-admin-panel en cours
  d'execution (docker cp + nginx -s reload, sauvegarde de l'ancien contenu
  dans html_bak avant ecrasement) : curl confirme un 200 sur / et sur
  /assets/mapbox-gl-csp-worker.js, et la chaine mapbox-gl-csp-worker.js
  est bien presente dans le bundle main.*.js servi. Confirme que le
  correctif est bien deploye et actif dans l'environnement local.
- Limite assumee : cet agent n'a pas d'outil de navigateur/CDP dans cette
  session pour rejouer reellement la page et lire la console - la
  disparition effective de l'erreur « An error occurred while parsing the
  WebWorker bundle » dans les DevTools reste a confirmer visuellement par
  l'utilisateur (Cause A - restriction du token - devra aussi etre levee
  cote dashboard Mapbox pour voir les tuiles se charger completement).

Fichiers modifies : apps/admin-panel/src/main.ts,
apps/admin-panel/project.json.

### 4. Note i18n de clarification - MapSetting.mapboxToken

Suite a la decision kasi-integrations-auditor (entree precedente, « Sujet 2
(suite) ») confirmant que ce champ n'est pas mort mais pilote le geocodage
rider-api, le routing backend et le bootstrap carte des deux apps mobiles :
note ajoutee dans la cle i18n existante mapSettings.section.mapbox.desc
(fr + en), precisant que ce token est independant de celui des cartes de
l'admin-panel (environment.mapboxToken, injecte au build). Pas de
modification des autres locales (es/bn/de/hi/ko/id/sv/ja/pt/ru/ur/zh/ar/hy)
- fr/en restent les locales de reference de ce panel, coherent avec la
pratique deja en place pour ce type de precision ponctuelle ; a repercuter
si une prochaine passe i18n globale a lieu.

Fichiers modifies :
apps/admin-panel/src/assets/i18n/fr.json,
apps/admin-panel/src/assets/i18n/en.json.

### Statut global

Les 4 sujets confies a kasi-admin-panel dans ce lot sont clos : build dev +
prod verts, deploiement local verifie par curl/inspection du bundle servi,
verification visuelle DevTools reelle restant a faire par l'utilisateur
(pas d'outil navigateur disponible dans cette session).

### Vérification utilisateur (2026-07-23)

Confirmé fonctionnel par l'utilisateur en conditions réelles : Aperçu, mini-carte
sur "Demande #N", uploads/avatars admin-panel (le volume partagé fonctionne pour
ce qui est écrit *depuis* le panel). **Un point réel reste cassé, volontairement
différé** : upload d'avatar Kasiman (chauffeur) — 404 confirmé en log nginx :

```
GET /admin-api/uploads/1784251150056-JPEG_20260717_011909_7880651638506611095.jpg
HTTP/1.1" 404 129 ".../drivers/view/3/details?refresh=..."
```

Hypothèse la plus probable (non vérifiée) : ce fichier a été uploadé via
`driver-app` (mobile), donc physiquement écrit par `driver-api` — le volume
partagé `./data/uploads` (Sujet 3 ci-dessus) ne couvre que les 3 API
**web/backend** ; reste à confirmer si l'app mobile passe bien par `driver-api`
avec le même mécanisme `useStaticAssets`, ou par un tout autre chemin
(upload direct S3 côté mobile ? endpoint différent ?). **Décision utilisateur :
différé jusqu'au chantier mobile** (la majorité des uploads viennent de
driver-app/rider-app, autant traiter ce point avec le contexte mobile complet
plutôt que de le creuser isolément côté web maintenant). Non bloquant.

Le chantier d'alignement visuel page-à-page (Ridy → Kasi, référence "edit
kasiman") reprend à partir d'ici.


## 2026-07-25 — Plan de lots — refonte page par page (reprise)

**Contexte** : reprise du chantier d'alignement visuel de l'admin-panel
(bordures 8px, toasts/notifications re-skinnes, tokens
--kasi-success/danger/warning/info) sur les primitives CSS de reference
.kasi-form-section / .kasi-form-sections / .kasi-form+.kasi-form--grid
/ .kasi-form-page-actions / .kasi-card+.kasi-card__body(--flush) /
.kasi-page-head+.kasi-page-head__text / .kasi-profile-head (+
__main/__name/__meta/__tags/__actions) / .kasi-tabs /
.kasi-metric / .kasi-section-title / .kasi-btn+.kasi-btn--primary.
Page gold-standard confirmee par lecture reelle du fichier :
drivers/driver-profile/driver-profile-details/driver-profile-details.component.html
("edit kasiman") - et son quasi-jumeau deja conforme
management/management-users/operator-new/operator-new.component.html.
Ecrans de reference Ridy : Kasi-ressources/ScreenShot/UX-ridy/web/Dispatcher1-4.png.
Ecran Kasi actuel deja capture (utile pour comparer avant/apres) :
Kasi-ressources/ScreenShot/UX-ridy/NewKasi/Kasi panel repartiteur.png
(+ variante light mode).

**Methode d'audit** : lecture reelle de tous les fichiers identifies par
l'audit grep initial comme sans primitive (8 fichiers, tous des modules
home/dispatcher, complaints, management), + verification ciblee des
modules a fort taux de couverture (grep nzTabLink/kasi-tabs,
kasi-page-head/kasi-profile-head, nzBordered, couleurs hex inline)
pour detecter des faux positifs. Aucune regression trouvee dans
drivers/requests/riders/marketing/payouts/sos/financials : les 7 pages a
onglets (riders, drivers, management-users (users), management-fleets,
sos, complaints, requests) utilisent toutes kasi-tabs, aucune
couleur hex codee en dur trouvee sous cms/, 66 fichiers utilisent
kasi-page-head/kasi-profile-head de facon coherente.

### Lot 1 - home/dispatcher (PRIORITE 1, effort M)

Fichiers : dispatcher.component.html,
dispatcher-locations-select/dispatcher-locations-select.component.html,
dispatcher-looking/dispatcher-looking.component.html,
dispatcher-riders-list/dispatcher-riders-list.component.html,
dispatcher-service-select/dispatcher-service-select.component.html
(tous sous apps/admin-panel/src/app/cms/home/dispatcher/).

Ecart constate : module a zero primitive kasi-, confirme par lecture
integrale des 5 fichiers - pas un faux negatif de grep. dispatcher.component.html
est un simple <nz-card> brut contenant <nz-steps> (cercles numerotes
ant-design par defaut) + <router-outlet>, sans kasi-page-head ni
equivalent stylise du stepper. dispatcher-riders-list.component.html
duplique quasi mot pour mot le tableau de
riders/riders-list/riders-list.component.html (memes colonnes
lastName/mobileNumber, meme dropdown de filtre .search-box) mais
SANS l'enrober dans .kasi-card/.kasi-card__body--flush - il garde
l'attribut nzBordered legacy que la version riders-list a abandonne.
dispatcher-locations-select.component.html a ses 2 boutons de pied de
page en style="margin-top: 8px" inline au lieu de .kasi-form-page-actions.
dispatcher-looking.component.html et dispatcher-service-select.component.html
utilisent nz-result/nz-list bruts, non enrobes de .kasi-card.
C'est precisement l'ecran envoye par l'utilisateur en reference
esthetique de debut de chantier (captures Dispatcher1-4.png) - deja
capture cote Kasi actuel dans "Kasi panel repartiteur.png" (le theme
sombre global rend deja l'ecran presentable, mais sans la structure de
primitives il divergera du reste du panel des qu'on y regarde de pres :
pas de titre/sous-titre de page, stepper non custom, table sans le
cadre .kasi-card).

Plan d'execution suggere : (1) dispatcher.component.html vers
kasi-page-head (titre + sous-titre) au-dessus du stepper, garder ou
restyler nz-steps selon les tokens (decision de detail visuel a
trancher avec kasi-admin-panel, pas un simple swap de classe - c'est le
seul point du lot qui n'a pas d'equivalent deja resolu ailleurs dans le
panel) ; (2) dispatcher-riders-list.component.html vers copier
exactement le patron .kasi-card > .kasi-card__body--flush de
riders-list.component.html, retirer nzBordered ; (3)
dispatcher-locations-select.component.html vers .kasi-form-page-actions
pour les 2 boutons, .kasi-card autour de la timeline ; (4)
dispatcher-looking.component.html et dispatcher-service-select.component.html
vers enrober nz-result/nz-list dans .kasi-card.

Priorite : 1 (correspondance directe avec la reference esthetique
d'origine de l'utilisateur).

### Lot 2 - management/management-users/user-view/user-view-details (PRIORITE 2, effort S)

Fichier : management/management-users/user-view/user-view-details/user-view-details.component.html.

Ecart constate : seul fichier non conforme du module management
(39/40 - le grep initial le reperait deja correctement, pas un faux
negatif). Formulaire ant-design brut (nz-form-item/nz-form-label sans
aucune classe kasi-), avec un bloc mort commente (ancien
formly-form/nz-checkbox-group) encore present dans le fichier. Son
jumeau exact - meme entite "operator", formulaire de creation plutot que
d'edition - management-users/operator-new/operator-new.component.html
est lui deja entierement migre (kasi-page-head, kasi-form-sections,
kasi-form-section, kasi-form kasi-form--grid,
kasi-form-page-actions) avec des champs quasi identiques (firstName,
lastName, roleId, userName, email, +mobileNumber cote edit). Par ailleurs
le parent user-view.component.html n'a pas de kasi-page-head du tout
(seulement kasi-tabs), contrairement a complaint-view.component.html
qui utilise kasi-profile-head.

Plan d'execution suggere : reprendre quasi telle quelle la structure
de operator-new.component.html (sections identite + compte),
supprimer le bloc commente mort, ajouter un kasi-page-head ou
kasi-profile-head coherent au niveau de user-view.component.html.
Risque tres faible - travail presque mecanique a partir d'un patron deja
en place dans le meme sous-module.

Priorite : 2 (mecanique, faible risque, reference prete a copier).

### Lot 3 - Nettoyage cible : route orpheline + tables legacy isolees (PRIORITE 3, effort S)

Fichiers/sujets :
- complaints/complaint-view/complaint-view-records/complaint-view-records.component.html
  - stub placeholder (<p>complaint-view-records works!</p>), route sur
  /complaints/view/:id/records (complaint-view-routing.module.ts) mais
  AUCUN onglet ne pointe vers cette route : complaint-view.component.html
  n'a qu'un seul nz-tab/kasi-tabs ("Details" vers info). Route
  orpheline, probablement heritee d'app-kasi. Avant de styliser :
  decision de scope a trancher (verifier s'il existe un champ
  GraphQL type "historique"/"records" sur Complaint qui justifierait de
  cabler un vrai 2e onglet, sinon supprimer route + composant). Si
  fonctionnalite retenue, coordonner avec kasi-product-vision pour
  verifier la coherence avec KASI_NARRATIVE_VISION.md avant
  implementation - ne pas la remettre en place au seul motif qu'elle
  existe dans le code herite.
- management/management-services/management-services-view/management-services-view.component.html
  et management/management-zone-prices/zone-price-view/zone-price-view.component.html
  - 2 sous-tableaux isoles encore en nzBordered brut (pattern legacy,
  meme symptome que le Lot 1) au sein de pages deja globalement conformes
  (le reste de ces pages utilise deja les primitives kasi-). Fix
  mecanique identique au point (2) du Lot 1 : .kasi-card/.kasi-card__body--flush,
  retrait de nzBordered.

Priorite : 3 (surface reduite ; le sous-point complaint-view-records
necessite une decision de scope avant tout travail visuel).

### Lot 4 - home/overview/overview-drivers-map (PRIORITE 4, effort S)

Fichier : home/overview/overview-drivers-map/overview-drivers-map.component.html.

Ecart constate : nz-card brut avec nzTitle/nzExtra non
stylises facon .kasi-card, <ng-template #extraTemplate> avec un
style="padding-right: 10px" inline, table nzBordered legacy. Ecart
reel mais mineur car ce composant est un widget imbrique dans
overview.component.html qui, lui, est deja 100% conforme
(kasi-page-head, kasi-metric, kasi-section-title confirmes a la
lecture) - l'ecran overview dans son ensemble ne "choque" donc pas
visuellement autant qu'un module entierement brut comme le Lot 1.

Priorite : 4 (widget imbrique dans une page deja conforme, impact
visuel isole).

Note pour l'agent qui reprend un lot : ne pas relancer l'audit grep
en aveugle - la liste des fichiers concernes ci-dessus est exhaustive
pour les ecarts detectes a ce jour. driver-profile-details.component.html
et operator-new.component.html sont les deux meilleurs patrons a copier
selon qu'il s'agit d'un formulaire de type "profil/details" (avec
sections kasi-form-section multiples) ou "creation simple". Confirmer
tout choix de nouvelle classe kasi- (ex. un eventuel .kasi-stepper
pour Lot 1) contre apps/admin-panel/src/styles.scss et le skill
kasi-design-system avant de l'introduire.

### Lot 3 (execution) - onglet complaint-view-records cable + nettoyage tableaux legacy (2026-07-25)

**Decision utilisateur qui affine le Lot 3 ci-dessus** : au lieu de
trancher entre "supprimer la route orpheline" et "cabler un vrai
onglet" (option laissee ouverte plus haut), l'utilisateur a tranche
cabler un vrai onglet - le backend GraphQL supportait deja tout le
necessaire (`Complaint.activities` avec `type`/`comment`/`actor`/`assignedTo`),
travail 100% frontend, aucune coordination `kasi-backend-services`
requise.

Fichiers modifies, tous sous
apps/admin-panel/src/app/cms/complaints/complaint-view/ :
- complaint-view.component.html : ajout d'un second `<nz-tab>`
  (`routerLink="records"`, libelle `profile.activities` - cle deja
  existante, reutilisee par symetrie avec `profile.details` utilise
  par le premier onglet "info", et avec l'onglet "activities" de
  request-view.component.html qui utilise la meme cle).
- complaint-view-records/complaint-view-records.component.ts : stub
  vide remplace par le patron exact de
  request-view-activities.component.ts (`ActivatedRoute` ->
  `route.parent?.data.pipe(map(data => data.complaint))`), avec
  `getColor`/`translateType`/`isPending` adaptes a
  `ComplaintActivityType` (3 valeurs generees : `AssignToOperator`,
  `Resolved`, `Update` - la valeur reelle generee est
  `AssignToOperator`, pas `AssignedToOperator` comme suggere dans la
  consigne, verifie contre apps/admin-panel/generated/graphql.ts).
- complaint-view-records/complaint-view-records.component.html : stub
  remplace par un `kasi-card`/`kasi-card__body` avec `nz-empty` (liste
  vide) ou `nz-timeline nzMode="custom"` sinon.
- **Decision date/getPosition** : `ComplaintActivity` n'a pas de
  `createdAt` dans le schema GraphQL actuel (verifie
  complaint-view.graphql) - aucune date n'est affichee, pas de champ
  invente. `getPosition` (gauche/droite) de request-view-activities
  n'a pas ete repris : avec seulement 3 types plats (pas de logique
  "cote client" vs "cote operateur"), une alternance gauche/droite
  n'aurait pas de sens ; le timeline est rendu en colonne simple
  (aucun `nzPosition` sur les items, cf. `getInferredTimelineItemPosition`
  qui retourne `undefined` en mode `custom` sans position explicite).
  En echange, le contenu de chaque item exploite les champs
  effectivement disponibles (`comment`, `actor`, `assignedTo`), absents
  du modele request/order. **Limitation a signaler** : sans `createdAt`
  sur `ComplaintActivity`, l'ecran ne peut pas trier ni dater les
  entrees (ordre = ordre de retour de l'API) ; si cette info s'avere
  necessaire a l'usage, ce serait un ajout backend a coordonner avec
  `kasi-backend-services`, pas une invention frontend.
- Cles i18n ajoutees dans assets/i18n/fr.json et en.json :
  `complaint.activityBy` / `complaint.activityAssignedTo` (texte de
  liaison dans le rendu de chaque activite) et le bloc
  `complaintActivityType.{assignToOperator,resolved,update}` (modele
  sur `requestActivityType.*` deja existant).

**Tache B - nettoyage mecanique** (2 fichiers, sous-tableaux `nzBordered`
isoles au sein de pages deja conformes) :
- management/management-services/management-services-view/management-services-view.component.html
  (4 occurrences : time/distance/weekday/dateRange multiplier)
- management/management-zone-prices/zone-price-view/zone-price-view.component.html
  (1 occurrence : time multiplier)

Chaque bloc melangeait, dans un seul `.kasi-card__body`, la liste
`nzBordered` ET le mini-formulaire d'insertion de regle - appliquer
`--flush` tel quel a ce body aurait supprime le padding du formulaire
(regression visuelle, car `.kasi-card__body--flush { padding: 0 }`
s'applique a tout le body, pas seulement a la liste). Fix retenu,
conforme au patron etabli partout ailleurs (ex.
driver-profile-financial.component.html, fleet-view-financials) ou
un tableau/liste flush vit toujours seul dans sa propre carte : chaque
bloc est scinde en deux `.kasi-card` distinctes - une carte
`kasi-card__body--flush` contenant uniquement le `ul[nz-list]` (attribut
`nzBordered` retire), suivie d'une seconde carte classique (padding
normal) contenant le formulaire d'insertion + bouton, inchanges.
`nz-table#preferencesTable` (deja flush, conserve son `nzBordered`
existant) n'a pas ete touche - hors scope, deja conforme au pattern
kasi-card__body--flush.

**Verification Docker** : un `docker compose build admin-panel` +
`docker compose up -d --force-recreate admin-panel` a ete execute et
verifie (conteneur recree, `docker inspect --format='{{.Created}}'`
confirmant l'horodatage frais, `curl` HTTP 200 sur le conteneur, et
les nouvelles cles i18n confirmees presentes dans
`/assets/i18n/en.json` servi par le conteneur) **avant** de recevoir
la consigne de coordination demandant un rebuild unique consolide
partage avec l'agent Lot 1/Lot 2 en parallele. Aucun rebuild
supplementaire n'a ete relance ensuite - le rebuild final consolide
est laisse a l'orchestrateur.

### 2026-07-25 — Execution Lot 1 + Lot 2 (kasi-admin-panel)

**Lot 1 - home/dispatcher, les 5 fichiers, tous traites :**
- `dispatcher.component.html` : `<nz-card>` racine remplace par
  `.kasi-page-head` (titre "Dispatcher"/sous-titre) + `.kasi-card` +
  `.kasi-card__body` autour du `<nz-steps>`, `router-outlet` sorti de la
  carte. Suppression des 2 divs mortes (`grid grid-cols-1` vide,
  `h-4 w-full` spacer). Nouvelles cles i18n `dispatcher.title` /
  `dispatcher.subtitle` ajoutees dans en.json et fr.json (aucune cle
  equivalente n'existait).
- `dispatcher-riders-list.component.html` : copie exacte du patron
  `.kasi-card > .kasi-card__body--flush` de riders-list, `nzBordered`
  retire du `<nz-table>`. Comportement de selection (`(click)="selectRider"`,
  pas de `routerLink`) delibrement conserve car ce tableau est un
  picker dans l'assistant, pas une navigation vers une fiche - ne pas
  confondre avec riders-list qui, lui, navigue vers `view/:id`.
- `dispatcher-locations-select.component.html` : `<nz-card>` autour de
  la timeline remplace par `.kasi-card > .kasi-card__body` ; les 2
  boutons (`style="margin-top:8px"` inline) deplaces dans
  `.kasi-form-page-actions`. `nzType`/`nzDanger` des boutons inchanges
  (pas de reinterpretation semantique demandee).
- `dispatcher-looking.component.html` et
  `dispatcher-service-select.component.html` : `nz-result`/`nz-list`
  enrobes dans `.kasi-card > .kasi-card__body`. Sur ce dernier,
  `nzBordered` est CONSERVE sur le `<nz-list>` (contrairement au
  nz-table de riders-list) : verifie par lecture de
  management-services-view.component.html (Lot 3, non modifie), qui
  montre le precedent etabli dans le panel `nz-list nzBordered` a
  l'interieur d'un `.kasi-card__body` non-flush - `nzBordered` sur
  nz-table et nz-table sur nz-list ne sont pas le meme cas.

**Decision stepper (le seul point sans patron kasi- a copier)** :
pas de nouvelle classe `.kasi-stepper` introduite. Le `<nz-steps>` est
simplement enrobe dans le `.kasi-card` existant (meme traitement que
n'importe quel widget de page - cf. overview.component.html qui empile
plusieurs `.kasi-card`/`.kasi-metric`). Raison : `styles.scss` recolore
deja globalement `.ant-steps-item-process`/`.ant-steps-item-finish`
en petrole (regle preexistante, lignes ~522-530, "Barre de progression
/ slider / steps"), donc le stepper est deja sur la charte de couleurs -
le seul ecart reel etait l'absence d'enrobage/de titre de page, pas la
couleur des puces. Introduire une primitive dediee pour un unique
ecran assistant aurait ajoute de la surface CSS sans reel gain
(le panel n'a pas d'autre wizard a onglets-etapes a ce jour). Le
contenu de chaque etape (route enfant) porte sa propre `.kasi-card`
independante ; empiler 2 cartes verticalement (stepper + contenu
d'etape) est le meme idiome que la page overview, pas une imbrication
carte-dans-carte.

**Lot 2 - management-users/user-view + user-view-details :**
- `user-view-details.component.html` : restructure sur le patron
  operator-new.component.html - `.kasi-form-sections` avec 2
  `.kasi-form-section` ("Identity" : firstName/lastName/mobileNumber/
  email ; "Account" : roleId/userName), `.kasi-form kasi-form--grid`,
  `.kasi-form-page-actions` (Annuler + Enregistrer). Bloc mort commente
  (ancien formly-form/nz-checkbox-group/nz-transfer, ~13 lignes)
  supprime. Cles i18n reutilisees telles quelles depuis
  `form.newOperator.section.identity/account.title/desc` (contenu
  neutre, s'applique aussi bien a l'edition qu'a la creation - pas de
  nouvelle cle necessaire). Bug mineur corrige au passage : `id="'mobileNumber"`
  (guillemet parasite cassant l'association `nzFor`/`id`) -> `id="mobileNumber"`.
- `user-view-details.component.ts` : ajout de `cancel()` + `originalValue`,
  sur le meme patron que driver-profile-details.component.ts (Annuler
  = reinitialiser le formulaire a sa valeur chargee, PAS une navigation
  - coherent avec la semantique "edition sur place" de cet ecran, a la
  difference d'operator-new ou Annuler quitte la page puisqu'il s'agit
  d'une creation). Aucune requete/mutation GraphQL touchee
  (`UpdateOperatorGQL`, `ViewOperatorQuery` inchangees).
- `user-view.component.html` / `.ts` : ajout d'un `.kasi-profile-head`
  (avatar icone `user`, nom, meta userName/email) au-dessus de
  `.kasi-tabs`, sur le patron fleet-view.component.html (avatar icone,
  pas photo - coherent avec le fait qu'un operateur admin n'a pas de
  media/avatar uploade contrairement a un Kasiman). Le composant expose
  desormais `query` via `route.data` (le resolver `OperatorViewResolver`
  est deja attache a ce niveau de route, donc `operator` y est deja
  disponible - aucune requete GraphQL ajoutee, seule la lecture d'une
  donnee deja resolue).

**Verification build/Docker** : `npx nx build admin-panel
--configuration=production` local OK (aucune erreur/warning sur les
fichiers touches - les warnings NG8111 presents dans le log
preexistent sur driver-profile-feedbacks/fleet-view-financials/
fleet-view-zone-prices/rider-view-addresses, hors scope). Image
`kasi-local/admin-panel:latest` rebuild (`docker compose build
admin-panel`) et conteneur recree (`docker compose up -d
--force-recreate admin-panel`) : `docker inspect --format='{{.Created}}'
kasi-admin-panel` confirme un conteneur frais (`2026-07-25T00:41:42Z`,
recreee au moment du build, pas un ancien conteneur laisse en place),
`curl http://127.0.0.1:8080/` -> HTTP 200 verifie sur ce conteneur
frais. **Rebuild effectue AVANT reception d'une consigne de coordination
demandant de laisser le rebuild final consolide a kasi-supervisor**
(un agent kasi-admin-panel parallele travaillait au meme moment sur
Lot 3 - complaint-view-records + les 2 tableaux nzBordered isoles de
management-services-view/zone-price-view). Le rebuild effectue ici
couvre uniquement les fichiers Lot 1 + Lot 2 ci-dessus ; un rebuild
consolide ulterieur integrant le travail de l'autre agent reste
necessaire avant toute verification finale multi-lots.

### Lot 4 (execution) - overview-drivers-map.component.html (2026-07-25)

Fichier modifie : home/overview/overview-drivers-map/overview-drivers-map.component.html.
Aucun changement `.ts` necessaire (composant purement template, aucune
logique de header/table a ajuster).

**Racine `nz-card` -> `.kasi-card`** : `[nzTitle]`/`[nzExtra]`/`[nzCover]`
remplaces par la structure DOM native de `nz-card` en v21
(`ant-card-head` -> `ant-card-cover` -> `ant-card-body`, verifiee par
lecture de `ng-zorro-antd-card.mjs` avant de choisir l'ordre des blocs) :
`.kasi-card__head` (avec `.kasi-card__title` "Chauffeurs en ligne" a
gauche) contient desormais directement le contenu de l'ancien
`#extraTemplate` a droite - patron copie de
management-cars-list.component.html (`.kasi-card__head` avec titre +
action a droite). Le `<mgl-map>` est place en enfant direct de
`.kasi-card` (ni dans `.kasi-card__head` ni dans `.kasi-card__body`),
reproduisant le comportement full-bleed de l'ancien `nzCover` (aucune
carte du panel n'a de precedent de zone media inseree entre header et
body, mais aucune n'a non plus de padding parasite a retirer : ce
placement est le plus proche du comportement Ant Design d'origine).
Le `<ng-template #mapTpl>` et `<ng-template #extraTemplate>` sont
supprimes (inlines directement, ils n'etaient necessaires que pour les
slots `nzCover`/`nzExtra`).

**`style="padding-right: 10px;"` inline -> Tailwind `flex items-center
gap-2`** : le libelle "Zoom auto" + `nz-switch` sont enrobes dans une
`<div class="flex items-center gap-2">` (idiome deja utilise ailleurs
dans le panel pour des paires icone/texte, ex. complaints-list.component.html,
users-list.component.html - confirme par grep avant de l'utiliser),
`gap-2` remplacant le hack `padding-right` sur le span.

**Table -> `.kasi-card__body--flush` + retrait de `nzBordered`** : meme
patron que riders-list.component.html / management-cars-list.component.html
(table de liste = toujours flush, jamais nzBordered dans une carte
`.kasi-card`). Colonnes/logique (`showDriverOnMap`, `routerLink`
`/drivers/view/:id`, `nz-tag` de statut) inchangees.

**Hors scope, note pour un futur lot** : la lecture de
`overview.component.html` (le parent) pour verifier la coherence a
revele qu'il n'est PAS "100% conforme" comme indique dans le plan du
2026-07-25 ci-dessus - seuls le `kasi-page-head` et les 4 `.kasi-metric`
du haut de page le sont. Les 4 blocs de graphes en bas de page
(`overview.chart.requestsTitle`/`revenue`/`newDriverRegisters`/
`newRiderRegisters`) utilisent encore des `<nz-card [nzTitle]
[nzExtra]="...Tmpl">` bruts avec un `<nz-segmented>` en extra, non
convertis en `.kasi-card__head`. Ecart reel, non traite ici (hors
perimetre strict du Lot 4 qui ne portait que sur
overview-drivers-map.component.html, et la consigne interdit de
toucher a un autre fichier) - a ajouter a une future iteration du plan
si un Lot 5 est ouvert.

**Verification build/Docker** : `npx nx build admin-panel
--configuration=production` local OK (aucune erreur/warning nouveau -
les warnings NG8111 preexistants sur driver-profile-feedbacks/
fleet-view-financials/fleet-view-zone-prices/rider-view-addresses sont
les memes que ceux deja notes hors scope dans le log Lot 1+2 ci-dessus).
`docker compose build admin-panel` puis `docker compose up -d
--force-recreate admin-panel` executes (seul agent actif sur ce
chantier a ce moment, aucun risque de conflit de rebuild) :
`docker inspect --format='{{.Created}}' kasi-admin-panel` ->
`2026-07-25T01:05:06Z`, horodatage frais correspondant au moment du
`up -d --force-recreate` ; `curl http://127.0.0.1:8080/` -> HTTP 200 sur
ce conteneur frais, `<title>Kasi · Console d'administration</title>`
confirme dans la reponse.

**Ceci cloture les 4 lots du plan de lots du 2026-07-25** (Lot 1
home/dispatcher, Lot 2 user-view-details, Lot 3 complaint-view-records +
nettoyage nzBordered management-services-view/zone-price-view, Lot 4
overview-drivers-map) - tous executes et verifies (build local +
rebuild Docker + curl HTTP 200) au 2026-07-25.

---

## 2026-07-25 — Plan de lots — uniformisation des formulaires

Suite directe du plan de lots "refonte page par page" ci-dessus (4 lots
clotures), desormais focalisee specifiquement sur les FORMULAIRES de
`apps/admin-panel/src/app/cms/`. Audit (pas de code modifie dans ce
chantier) mene par `kasi-supervisor`, commandite par l'utilisateur.

**Patron gold-standard** (extrait de `driver-profile-details.component.html`
et `operator-new.component.html`) : `.kasi-form-sections` > N x
`.kasi-form-section` (`.kasi-form-section__aside` avec `__title`+`__desc`,
`.kasi-form-section__body` contenant `.kasi-form.kasi-form--grid`) >
`.kasi-form-page-actions` (Annuler `form.cancel` en `nzType="default"`,
Enregistrer en `nzType="primary"`) en pied de page, hors des sections.

**Methode d'audit** : grep confirme sur `nz-form|formGroup` = 35 fichiers
(pas 34 : le compte initial de l'utilisateur en listait un de moins).
Au-dela du grep binaire present/absent demande par l'utilisateur, comptage
des occurrences de chaque sous-primitive (`kasi-form-section`,
`__aside`, `__title`, `__desc`, `__body`, `kasi-form--grid`,
`kasi-form-page-actions`) par fichier, pour verifier que la structure
interne (pas seulement la classe racine) suit reellement le patron.

**Resultat inattendu** : 34/35 fichiers ont un compte de sous-primitives
parfaitement egal au compte de sections (aside=title=desc=body=sections
dans chacun) - la structure gold-standard est deja quasi-integralement en
place suite aux 4 lots precedents. Aucun cas de "grille a 1 colonne" ou
de "sections non decoupees" trouve. Les deux ecarts numeriques releves au
grep (`fleet-view-details` sections=4/grid=3, `role-view` sections=2/grid=1)
sont legitimes apres lecture : une section contient une carte Mapbox
(exclusivite geographique) ou une grille de permissions par categorie,
contenus qui n'ont pas vocation a etre une grille de champs. Categorie
(b) "structure partiellement divergente" : **aucun cas trouve**.

**Categorisation finale** :
- **(a) Conformes** : 32 fichiers stricto sensu + 2 fichiers conformes
  au socle avec extension locale saine (`management-services-view` :
  4 sections standard + mini-formulaires repetables en `.kasi-card` avec
  `.kasi-form-actions` pour l'action locale, distincts du
  `.kasi-form-page-actions` de la page ; `sos-view-info` : sections en
  `.kasi-desc` pour du contenu en lecture seule + un mini-formulaire
  "ajouter une activite" avec le meme patron sain).
- **(c) Primitive totalement absente** : 1 fichier,
  `requests/request-view/request-view-assign/request-view-assign.component.html`.
  Paradigme different des 34 autres (recherche + carte Mapbox + popup
  fiche conducteur + tableau d'assignation), pas un formulaire de saisie
  classique - `<nz-form-control>` isole, fiche conducteur en `<div
  class="grid grid-cols-2 gap-2">` Tailwind brut au lieu de `.kasi-desc__row`.

**Ecart transverse non structurel trouve** (hors grille de lecture
initiale, mais releve car visible utilisateur) : libelle du bouton de
sauvegarde des formulaires d'edition incoherent - `form.cancel`/"Annuler"
est deja 100% homogene (31/31 occurrences), mais le bouton de validation
utilise 3 cles i18n differentes pour la meme action (`profile.save` ->
"Sauvegarder", 7 fichiers, dont le gold-standard `driver-profile-details` ;
`profile.submit` -> "Soumettre", 15 fichiers ; `profile.saveChanges` ->
"Sauvegarder les modifications", 1 fichier). Verifie dans
`apps/admin-panel/src/assets/i18n/fr.json` : ce sont bien des textes
differents, pas des synonymes resolus vers la meme chaine. Aucune logique
de repartition par module identifiee (des pages de meme nature type
"*-view" utilisent l'une ou l'autre cle sans raison apparente).

### Lots proposes

**Lot A - Adopter le patron pour `request-view-assign.component.html`**
(1 fichier). Ecart : primitive absente (c). Ne pas forcer le patron
`.kasi-form-sections`/grid (ce n'est pas un formulaire de saisie) :
encapsuler recherche+carte+tableau dans des `.kasi-card` coherentes avec
le reste du panel, convertir la fiche conducteur de la popup en
`.kasi-desc__row` (meme primitive deja utilisee pour des fiches
similaires dans `sos-view-info`), conserver les `nz-button` deja
corrects. Effort : M (peu de fichiers, mais logique carte Mapbox/popup a
preserver soigneusement + verification visuelle). Priorite : Haute (seul
vrai trou de couverture des 35 fichiers).

**Lot B - Formaliser la convention "sous-formulaire local en carte"**
(2 fichiers : `management-services-view`, `sos-view-info`). Ecart :
aucun structurellement - deja conforme, extension saine du patron.
Travail : revue de confirmation + commentaire dans `styles.scss` a cote
de `.kasi-form-actions` pour documenter explicitement la distinction
avec `.kasi-form-page-actions` (action locale dans une carte vs barre de
sauvegarde de page), afin qu'un futur formulaire similaire (regles/
multiplicateurs, sous-listes editables) reutilise ce patron au lieu d'en
reinventer un autre. Effort : S. Priorite : Basse (rien de casse,
prevention de derive future).

**Lot C - Harmoniser le libelle du bouton de sauvegarde** (16 fichiers :
15 en `profile.submit` + 1 en `profile.saveChanges`, a realigner vers
`profile.save`/"Sauvegarder" deja utilise par le gold-standard et 6
autres fichiers). Ecart : cosmetique/i18n, pas structurel - meme position,
meme primitive `.kasi-form-page-actions`, texte differe sans raison
fonctionnelle identifiee. Effort : S (changement de cle i18n dans les
templates, zero nouvelle traduction a creer). Priorite : Moyenne (visible
utilisateur, correction simple, non bloquant).

**Comparaison visuelle Ridy** (`Kasi-ressources/ScreenShot/UX-ridy/web/New
region.png` vs `Kasi-ressources/ScreenShot/UX-ridy/NewKasi/Kasi panel edit
kasiman.png`) : confirme que le patron Kasi actuel (carte avec aside
titre+description a gauche, champs a droite) est deja tres proche de la
disposition Ridy sur ce point precis - coincidence de bon sens produit,
pas un alignement recherche ; aucune raison d'en devier.

### 2026-07-25 — Execution Lot A + Lot C

Lot B laisse de cote (simple note de doc, hors perimetre de cette
execution). Les deux lots ci-dessous sont **implementes et le build
Docker de l'admin-panel est verifie**.

**Lot A** — `apps/admin-panel/src/app/cms/requests/request-view/request-view-assign/request-view-assign.component.html`.
Pas de patron `.kasi-form-sections`/grid force (paradigme
recherche+carte+tableau, pas un formulaire de saisie). Changements :
- Colonne gauche (recherche + carte Mapbox) encapsulee dans une
  `.kasi-card` : le champ de recherche + `nz-autocomplete` dans un
  `.kasi-card__body`, la `mgl-map` juste apres en flush (meme
  disposition que `overview-drivers-map.component.html`, deja au
  patron depuis le lot precedent — carte edge-to-edge sans wrapper
  `__body`, pas d'`overflow:hidden` sur `.kasi-card`, comportement deja
  accepte ailleurs).
- Colonne droite (tableau des kasimen disponibles) encapsulee dans une
  `.kasi-card` avec `.kasi-card__body.kasi-card__body--flush`, meme
  patron que `drivers-list.component.html`/`requests-list.component.html`.
- Fiche conducteur de la popup Mapbox convertie de
  `<div class="grid grid-cols-2 gap-2 gap-y-2">` Tailwind brut vers
  `.kasi-desc`/`.kasi-desc__row`/`.kasi-desc__label`/`.kasi-desc__value`
  (meme primitive que `sos-view-info.component.html`), 4 lignes (nom,
  statut, telephone, note). Les deux `nz-button` (voir profil / attribuer)
  sont **conserves inchanges** mais sortis du bloc `.kasi-desc` — ce ne
  sont pas des champs description mais des actions, places dans un
  `<div class="flex gap-2 mt-2">` sous la fiche, pattern plus sur que
  de les forcer dans une `kasi-desc__row` "Actions" en 2 colonnes
  (label 220px + valeur) qui les aurait ecrases dans une popup Mapbox
  large de 240px par defaut.
  - **Ajustement necessaire** : `mgl-popup` a recu `[maxWidth]="'400px'"`
    (input natif du composant `ngx-mapbox-gl`, non utilise avant dans
    la codebase). Sans cet ajustement, la largeur de popup Mapbox par
    defaut (240px, `.mapboxgl-popup-content` padding 10px inclus, soit
    ~220px de contenu utile) ne peut pas accueillir la colonne
    `.kasi-desc__row` de 220px de large (le seuil `@media (min-width:
    640px)` qui active le layout 2-colonnes de `.kasi-desc__row`
    reagit a la largeur du **viewport**, pas du conteneur — sur un
    panel desktop il est toujours actif). Verifie en calculant
    220 (label) + 20 (gap) + marge de confort pour la valeur ; pas de
    changement a la logique Mapbox/popup elle-meme (ouverture,
    fermeture, contenu affiche), uniquement la largeur du cadre.
  - Aucun `.kasi-card__head` ajoute (pas de titre de carte) : par
    coherence avec les nombreuses cartes du panel sans en-tete
    (`drivers-list`, `requests-list`, `dispatcher-riders-list`, etc.),
    et pour eviter d'inventer un nouveau libelle i18n hors perimetre
    du lot (le tab au-dessus affiche deja "Attribuer un Kasiman
    (Alpha)" — `requests.assign` — un second titre aurait ete
    redondant).

**Lot C** — harmonisation du libelle du bouton de sauvegarde vers
`profile.save`. **Ecart avec le chiffrage du plan** : le plan annoncait
16 fichiers (15 `profile.submit` + 1 `profile.saveChanges`). Le grep
d'execution (`grep -rn "profile.submit\|profile.saveChanges" --include="*.html" apps/admin-panel/src/app/cms/`)
en trouve **21 occurrences reelles** (16 `profile.submit` + 5
`profile.saveChanges`, contre 15+1 annonces) apres exclusion d'un faux
positif (`sos-view.component.html` : `profile.submittedBy` matche la
regex `profile.submit` par sous-chaine, cle i18n totalement differente
— fichier exclu, non touche). L'audit initial avait sous-compte les
`profile.saveChanges` (1 trouve contre 5 reels). Verification menee
avant correction sur les cas ambigus potentiels (fichiers avec
mini-formulaire local en plus du formulaire de page,
`driver-profile-financial`, `rider-view-financials`,
`management-services-view`, `sos-view-info`) : dans les 4 cas, le
bouton en question utilise bien `.kasi-form-page-actions` +
`form.cancel` (le patron page-level), pas le `.kasi-form-actions` local
documente au Lot B (`management-services-view` a bien les deux : un
`.kasi-form-actions` local pour "Ajouter une regle" avec un libelle
distinct `service.insertRule` non touche, et un `.kasi-form-page-actions`
avec `profile.submit` en pied de page, corrige). Decision : traiter les
21 fichiers reels plutot que de se limiter artificiellement aux 16
annonces, l'objectif ("un seul libelle pour l'action de sauvegarde de
page") s'appliquant identiquement aux 5 occurrences non comptees.

Les 21 fichiers repointes vers `profile.save` :
1. `apps/admin-panel/src/app/cms/drivers/driver-profile/driver-profile-financial/driver-profile-financial.component.html`
2. `apps/admin-panel/src/app/cms/management/management-call-masking-provider/call-masking-provider-view/call-masking-provider-view.component.html`
3. `apps/admin-panel/src/app/cms/management/management-email-providers/email-provider-view/email-provider-view.component.html`
4. `apps/admin-panel/src/app/cms/management/management-fleets/fleet-view/fleet-view-details/fleet-view-details.component.html`
5. `apps/admin-panel/src/app/cms/management/management-fleets/fleet-view/fleet-view-financials/fleet-view-financials.component.html`
6. `apps/admin-panel/src/app/cms/management/management-order-cancel-reason/order-cancel-reason-view/order-cancel-reason-view.component.html`
7. `apps/admin-panel/src/app/cms/management/management-payment-gateways/payment-gateway-view/payment-gateway-view.component.html`
8. `apps/admin-panel/src/app/cms/management/management-region/region-view/region-view.component.html` (etait `profile.saveChanges`)
9. `apps/admin-panel/src/app/cms/management/management-retention/retention-view/retention-view.component.html`
10. `apps/admin-panel/src/app/cms/management/management-review-parameters/review-parameter-view/review-parameter-view.component.html` (etait `profile.saveChanges`)
11. `apps/admin-panel/src/app/cms/management/management-roles/role-view/role-view.component.html`
12. `apps/admin-panel/src/app/cms/management/management-services/management-services-view/management-services-view.component.html`
13. `apps/admin-panel/src/app/cms/management/management-shift-rules/shift-rule-view/shift-rule-view.component.html`
14. `apps/admin-panel/src/app/cms/management/management-sms-provider/sms-provider-view/sms-provider-view.component.html`
15. `apps/admin-panel/src/app/cms/management/management-zone-prices/zone-price-view/zone-price-view.component.html` (etait `profile.saveChanges`)
16. `apps/admin-panel/src/app/cms/marketing/announcements/announcement-view/announcement-view.component.html` (etait `profile.saveChanges`)
17. `apps/admin-panel/src/app/cms/marketing/coupons/coupon-view/coupon-view.component.html` (etait `profile.saveChanges`)
18. `apps/admin-panel/src/app/cms/marketing/rewards/reward-view/reward-view.component.html`
19. `apps/admin-panel/src/app/cms/payouts/payout-methods/payout-method-view/payout-method-view.component.html`
20. `apps/admin-panel/src/app/cms/riders/rider-view/rider-view-financials/rider-view-financials.component.html`
21. `apps/admin-panel/src/app/cms/sos/sos-view/sos-view-info/sos-view-info.component.html`

Post-verification (`grep -rn "profile\.submit\b\|profile\.saveChanges\b"` sur
tout `apps/admin-panel/src`, HTML/TS/JSON) : **zero occurrence restante** —
les deux cles etaient totalement orphelines. Cles `profile.submit` et
`profile.saveChanges` **supprimees** de `fr.json` et `en.json` (la cle
`submit` hors-namespace utilisee pour le bouton de connexion, "Se
connecter"/"Log in", est dans une section differente du JSON et n'a pas
ete touchee). `profile.save` ("Sauvegarder"/"Save") existait deja et
n'a pas ete modifiee.

**Build/verification** : `docker compose build admin-panel` (succes,
seuls warnings preexistants et sans rapport — `NG8111` sur des
`(nzQueryParams)` non invoques, deprecation `@import` Sass, budget de
bundle initial depasse) puis `docker compose up -d --force-recreate
admin-panel`. `docker inspect --format='{{.Created}}' kasi-admin-panel`
confirme un conteneur recree a l'instant du build (`2026-07-25T01:35:56Z`,
horodatage identique au recreate). `curl -s -o /dev/null -w "%{http_code}"
http://127.0.0.1:8080/` → `200` sur le conteneur fraichement recree,
page HTML Kasi servie normalement.

