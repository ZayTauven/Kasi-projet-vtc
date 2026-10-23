# Tests d'intégration du backend

Points du référentiel : `p1-tests` (socle, amorcé le 2026-09-29), `p1-transitions`,
`p1-unicite` (lots `lot-fiabilite` et `lot-qualite`). Décision : `KASI_DECISIONS.md`,
entrée du 2026-09-29.

Règle du chantier : **aucun correctif sans test sur le cycle de course et l'argent.**
Les anomalies visées sont des courses concurrentes et des rejeux : des tests
unitaires avec des doubles de base ne prouvent rien. Ce banc exécute le vrai code
des API contre un vrai PostgreSQL et un vrai Redis.

## 1. Lancer

Prérequis : la stack locale tourne (`kasi-postgres` sur 127.0.0.1:5433,
`kasi-redis` sur 127.0.0.1:6379) et `.env` existe à la racine du monorepo.

```sh
npm run test:integration                              # tout (~3 min)
npm run test:integration -- driver-order-transitions  # un fichier (filtre sur le chemin)
npm run test:integration -- -t "rejeu"                # les tests dont le nom contient « rejeu »
```

## 2. Ce que fait le banc

| Élément | Choix |
|---|---|
| Base | `kasi_test` dans le conteneur `kasi-postgres`. Créée si absente, puis mise à niveau par **les migrations** (même liste que le service `migrate`) : `tools/test-integration/global-setup.ts`. Autre nom : `KASI_TEST_DB_NAME` (doit contenir « test »). |
| Base interdite | `kasi` (jeu de démo du mémoire) : `env.ts` et le harnais refusent tout nom sans « test ». |
| Redis | Instance locale, base logique **15** (`KASI_TEST_REDIS_DB`), vidée avant chaque test. La base 0 (stack locale) est refusée. |
| Données | Créées par chaque test (service, client, 2 ou 3 Kasimen, flotte, passerelle), tables vidées (`TRUNCATE`) avant chaque test et en fin de fichier, tables du grand livre comprises (ses déclencheurs d'immuabilité sont des déclencheurs de ligne : `TRUNCATE` ne les déclenche pas). `money_policy` est vidée aussi : sans politique, aucun plafond ; seul `debt-limit.int-spec.ts` en insère une (XOF, 10 000 / 7 500). |
| Grand livre | `LEDGER_MODE=strict` par défaut sur le banc (`env.ts`, sauf valeur exportée) : une écriture refusée par le grand livre fait échouer l'opération, donc le test, au lieu d'être seulement journalisée. Le mode `shadow` a son propre test. |
| Exécution | Un fichier à la fois (`maxWorkers: 1`) : ils partagent la base. |
| Compilation | ts-jest **avec** vérification de types (pas d'`isolatedModules`, sinon TypeORM refuse les entités à champ d'énumération). |

Doubles, et pourquoi (`tools/test-integration/harness.ts`) :

- **Diffusion GraphQL** (`RedisPubSub`) : enregistreur. Les canaux pub/sub Redis sont
  communs à toutes les bases logiques ; publier atteindrait les API de la stack et
  les apps connectées.
- **Notifications push** : espions qui comptent les envois (un rejeu ne doit pas
  renvoyer de push), push en texte direct `plainText` comprise (I3).
- **Itinéraire** (OSRM/Mapbox) : pas de réseau. Depuis `p2-argent` I4, `d.routing`
  (`RoutingDouble`) est réglable par test : `d.routing.use('haversine')` simule
  l'estimation à vol d'oiseau (tous les fournisseurs en échec), `'mapbox'`,
  `'google'` ou `'osrm'` un vrai calcul routier ; distance et durée en option
  (`use('osrm', 1234, 77)`, défaut 1 200 m et 180 s). Chaque appel est noté
  (`d.routing.calls`).
- **Calcul du prix** : réel depuis I4 (`FareQuoteService`, `RegionService`,
  `ServiceService`). Pour chiffrer, un test crée la tarification avec les aides du
  harnais : `createRegion`, `setServicePricing`, `createZonePrice`,
  `createServiceOption`, points `PLATEAU` et `ALMADIES`.
- **Passerelle de paiement** (HTTP) : répond en erreur ; le code doit la tolérer.
- **Appels masqués** : sans effet.
- **Dispatch par vagues** (`p2-dispatch` D2-D3) : `d.dispatch`
  (`RecordingDispatchProducer`) note les 1res vagues posées par `createOrder` et
  `processPrePay` ; `buildDispatchWaves(ds, redis, d, queue?)` construit le vrai
  `DispatchWaveService` avec une `RecordingQueue` (jobs planifiés notés, rien
  d'exécuté) ou une vraie file BullMQ sur la base Redis du banc. Les espions de push
  notent aussi leurs arguments (`spy.args`), push texte client `plainText` comprise.
  Les réglages `DISPATCH_*` se posent par test dans `process.env` (lus à chaque appel).
  Depuis D4-D6 : `buildDispatchWaves` construit aussi le vrai journal
  (`DispatchAttemptJournal`) et la demande non servie (`UnservedDemandService`) ; la
  `RecordingQueue` note les jobs avancés (`promoted`) ; `d.routing.getDurationsTo`
  simule la matrice à vol d'oiseau. Le classement par la route se teste avec le vrai
  `RoutingService` et un faux `HttpService` (Mapbox, OSRM, en service ou en panne),
  passé en 5e argument de `buildDispatchWaves`.

Transactions, verrous, contraintes uniques et clés étrangères sont ceux de PostgreSQL.

## 3. Fichiers

| Fichier | Contenu |
|---|---|
| `tools/test-integration/jest.config.js` | Configuration (motif `*.int-spec.ts`) |
| `tools/test-integration/env.ts` | Variables : base de test, Redis 15, garde-fous |
| `tools/test-integration/global-setup.ts` | Création de la base et migrations |
| `tools/test-integration/harness.ts` | Connexions, doubles, données minimales, fabrique des vrais services |
| `tools/test-integration/uuid-shim.js` | `uuid` 14 n'existe qu'en ESM, illisible pour Jest |
| `apps/driver-api/src/app/order/driver-order-transitions.int-spec.ts` | Transitions côté Kasiman, 50 courses d'affilée, pourboire et service `OnlyCash` en fin de course |
| `apps/rider-api/src/app/order/rider-cancel.int-spec.ts` | Annulation client, avis, retour de passerelle |
| `apps/admin-api/src/app/payout/admin-money.int-spec.ts` | Opérations manuelles (et leurs permissions `*Wallet_Edit`), versements, actions opérateur |
| `libs/database/src/lib/order/wallet-ledger.int-spec.ts` | Écritures de portefeuille, clés d'unicité (depuis I2, au travers de `postLedgerEntry`) |
| `libs/database/src/lib/order/ledger.int-spec.ts` | Grand livre (`p2-argent` I2) : écriture déséquilibrée refusée par la base, `UPDATE` / `DELETE` refusés, rejeu en série et en parallèle, 50 opérations mêlées puis balayage à zéro écart, 10 fins de course simultanées, ouverture lancée deux fois, arrondis, contrepartie et motif par défaut, modes `shadow` et `strict`, aucun appel direct hors de `postLedgerEntry` |
| `apps/rider-api/src/app/coupon/gift-card.int-spec.ts` | Carte cadeau : crédit unique, carte utilisée, expirée ou pas encore disponible, deux clients simultanés (`p2-argent` I1) |
| `apps/rider-api/src/app/order/rider-order-update.int-spec.ts` | Pourboire, attente et coupon après démarrage, part d'annulation du Kasiman (`p2-argent` I1) |
| `libs/database/src/lib/coupon/common-coupon.int-spec.ts` | Règles du coupon : plancher et arrondi, services, bornes de prix, première course, date de début (`p2-argent` I1) |
| `libs/database/src/lib/order/fare-quote.int-spec.ts` | Devis figé (`p2-argent` I4), par les vrais résolveurs `getFare` et `createOrder` de rider-api : prix commandé = prix affiché (itinéraire changé entre-temps, options payantes, coupon, forfait de zone et ses multiplicateurs, réservation chiffrée à l'heure prévue) ; total entier, `roundingFactor` ; devis expiré ou inconnu refusé (`QUOTE_EXPIRED`), trajet différent refusé (`QUOTE_MISMATCH`) ; app sans `quoteId` qui retrouve son devis jusqu'à 10 minutes, coupon compris, puis devis recalculé (origine `commande`) ; deux `createOrder` simultanés sur un devis = une course, rendue aux deux ; commande renvoyée par l'app installée (timeout de 20 s, `bug-timeout`) = la même course, nouvelle course permise après annulation ; Mapbox, Google, OSRM acceptés, vol d'oiseau refusé (`ROUTE_UNAVAILABLE`), forfait de zone accepté sans itinéraire ; fin de course avec coupon financé par Kasi (commission sur le prix avant coupon, `KASI:PROMOTIONS`, rejeu, relevé) ; purge des devis de plus de 24 h |
| `libs/database/src/lib/order/debt-limit.int-spec.ts` | Dette espèces et plafond (`p2-argent` I3) : règle (plafond strict, alerte, sans politique, plafond relevé sans déploiement) ; Kasiman bloqué absent des destinataires (`getOnlineDriversWithServiceId` de `createOrder`, `processPrePay`, relance du cron), d'`availableOrders` ; acceptation refusée avec le message lisible et `KASIMAN_DEBT_LIMIT` ; attribution opérateur permise ; course en cours terminée ; push une seule fois au passage de chaque seuil (rejeu, deux fins simultanées) ; règlement opérateur qui débloque, rejoué en série et en parallèle = un crédit, refus (montant, motif, permission) ; compensation par une course payée en ligne ; part de flotte (option A) ; `kasimanAccount` et `kasimanStatement` |

| `apps/driver-api/src/app/dispatch/dispatch-queue.int-spec.ts` | File BullMQ `kasi-dispatch` et battement du cron, relance du cron en `legacy` (`p2-dispatch` D1) |
| `apps/driver-api/src/app/dispatch/dispatch-journal.int-spec.ts` | Journal, refus, classement par la route, demande non servie (`p2-dispatch` D4-D6) : une ligne par Kasiman sollicité, rejeu sans ligne ni push de plus ; issues `accepted`, `no_answer` (pris par un autre, course annulée), `rejected` (rejouable), `expired` ; refus sans offre ou en `legacy` sans effet ; le refus sollicite le suivant de l'anneau, l'offre disparaît pour celui qui refuse, tous refusent = vague suivante avancée ; deux refus simultanés sans double sollicitation ; matrice Mapbox (jeton, sources, destination), le plus rapide passe devant le plus proche, panne de Mapbox = OSRM puis vol d'oiseau, 10 candidats au plus par appel, le mode commandé passe avant la durée (Q9 révisée) ; seuil 3 demandes à 1 km en 15 min, push aux seuls Kasimen en ligne à 5 km, une fois par heure et par zone, fenêtre de 15 min, deux expirations simultanées = une push ; lecture admin-api `dispatchAttempts` et `unservedDemands` avec `Requests_View`, refusée sans ; `legacy` : rien d’écrit |
| `apps/driver-api/src/app/dispatch/dispatch-waves.int-spec.ts` | Dispatch par vagues (`p2-dispatch` D2-D3) : rayons 1, 2, 3 km puis rayon du service ; vraie file BullMQ à durées réduites (4 vagues cumulatives, double envoi dédupliqué, « aucun Kasiman » une fois) ; 5 Kasimen au plus, mono-service en tête de l'anneau, polyvalent sollicité dès la 1re vague s'il reste de la place, réglage coupé = ordre de distance (Q9 révisée en D7) ; `availableOrders` limité aux offres adressées (Q6) ; rejeu d'une vague ; Kasiman bloqué pour dette exclu, y compris entre deux vagues ; acceptation en vague 2 qui arrête tout ; expiration rejouée en même temps que le cron = une push client ; expiration contre acceptation ; `createOrder` de rider-api en `legacy` (inchangé) et en `waves` (réservation dispatchée 15 min avant) |
| `apps/driver-api/src/app/kyc/kyc.int-spec.ts` | Documents typés (`p2-kyc` K1) : envoi en attente, rejeu = le même, nouvel envoi remplace, fichier d'un autre Kasiman, date passée, invalide ou manquante refusés, carte grise sans date ; 3 envois simultanés = un seul en attente ; revue (permissions `Drivers_View` / `Drivers_Edit`, validation rejouable, refus, un seul validé par type, échéances, catalogue) ; l'opérateur type un fichier de l'ancienne app ; contrôle `kyc-check` : document obligatoire expiré = Kasiman suspendu, retiré de Redis, une push, rejeu sans effet, facultatif sans suspension, remplacement valide protège, Kasiman en course suspendu au passage suivant ; rappels une fois par seuil, rattrapage, pas la nuit ; garde du statut (suspendu, bloqué, document expiré avant le contrôle) et réactivation par la validation |
| `apps/driver-api/src/app/dispatch/cycle-pilote.int-spec.ts` | **Critère de sortie de la phase 1** sur la chaîne réelle du pilote, en `waves` : 50 courses d'affilée (graine fixe, `KASI_PILOT_SEED`, `KASI_PILOT_COURSES`), 8 scénarios mêlés (espèces, portefeuille, refus, annulation client avant et après acceptation, annulation Kasiman, « aucun Kasiman », livraison Kasi Moto avec taille du colis contre capacité du Kasiman) ; devis puis commande, renvoyée pendant ou après le traitement (timeout de 20 s) = une seule course ; vagues pas à pas, jobs parfois rejoués ; après chaque vague, chaque Kasiman relit ses offres (`availableOrders`, coupure réseau) : l'offre est là pour les sollicités, absente pour les autres et pour le Kasiman bloqué pour dette ; acceptations concurrentes, chaque étape doublée puis rejouée ; à la fin : courses closes, aucun Kasiman « en course », aucune activité en double, une acceptation par course, portefeuilles égaux au calcul attendu, grand livre conforme, une notification client par événement. ~80 s |
| `apps/rider-api/src/app/order/cancel-reasons.int-spec.ts` | Motifs d'annulation (`p3-mesures` M4, A1) : `cancelReasons` client et Kasiman (actifs, triés par id) ; les six chemins (client pendant la recherche, après attribution, à la facture, réservation, Kasiman, opérateur) écrivent le motif ; sans motif (app installée) = motif vide ; motif désactivé, inconnu, d'un autre auteur ou illisible = annulation faite, motif vide, un avertissement ; rejeu avec un autre motif = le premier reste ; `pilotCancelReasons` par auteur ; signatures GraphQL lues dans les métadonnées des décorateurs (ajouts facultatifs seulement, `CancelReason` sans `userType`) |
| `apps/admin-api/src/app/order/dispatcher-cancel-reason.int-spec.ts` | Signature de `cancelOrder(orderId: ID!, cancelReasonId: ID)` du répartiteur (`p3-mesures` M4, A1), lue dans les métadonnées `@Args` : le schéma complet d'admin-api ne se construit pas sous ts-jest (plugin `@nestjs/graphql` absent), et un fichier à part évite les deux types `Order` dans le même processus |
| `apps/admin-api/src/app/pilot-insights/pilot-insights.int-spec.ts` | Tableau de suivi du pilote (`p3-mesures` M1, M3) : 33 courses par la vraie chaîne en `waves` (espèces, portefeuille, livraisons, réservation, refus, annulations client avant et après attribution, Kasiman, opérateur, « aucun Kasiman » avec alerte de demande non servie, avis, règlements de dette), en trois lots replacés après coup dans une semaine avant la période puis deux semaines de pilote (horodatages décalés, déclencheur d'immuabilité du grand livre suspendu le temps de l'UPDATE puis vérifié actif) ; `pilotDashboard` comparé champ par champ au calcul attendu, sur la période et sur une période qui commence et finit en milieu de semaine ; `Requests_View` seul = argent à null ; sans `Requests_View` = refus des 4 requêtes ; période invalide ; `pilotCancelReasons`, `pilotTopKasimen`, export CSV (colonnes d'argent vides sans `ProviderWallet_View`) ; schéma GraphQL construit. ~90 s |

Les `*.int-spec.ts` sont exclus des builds (`tsconfig.app.json`, `tsconfig.lib.json`)
et ne sont pas lancés par `nx test` (motif `*.spec.ts`).

## 4. Écrire un test

```ts
import { buildDriverApi, createOrder, createWorld, makeDoubles, openDataSource,
  openRedis, resetDatabase, OrderStatus } from '../../../../../tools/test-integration/harness';

beforeEach(async () => {
  await resetDatabase(ds, redis);
  d = makeDoubles();
  world = await createWorld(ds, { drivers: 2 });
});

it('...', async () => {
  const orderId = await createOrder(ds, world);
  const kasiman = buildDriverApi(ds, redis, d, world.driverIds[0]);
  await kasiman.update(orderId, { status: OrderStatus.DriverAccepted }); // = updateOneOrder
  expect(d.riderNotifications.count('accepted')).toBe(1);
});
```

- Concurrence : `concurrently(n, fn)` lance `n` appels en même temps
  (`Promise.allSettled`).
- Un correctif de transition ou d'argent vient avec un test qui **échoue sur l'ancien
  code**. Contre-épreuve faite le 2026-09-29 : l'ancien `driver-order.query-service.ts`
  échoue à 14 tests sur 15, les anciens `rechargeWallet` échouent sur tous les rejeux.
- Nouvelle entité ou colonne : la migration d'abord (`docs/migrations-base-de-donnees.md`),
  le banc l'applique tout seul au lancement suivant.
- Argent (depuis `p2-argent` I2) : toute opération passe par `postLedgerEntry`. Les
  lectures utiles sont dans le harnais : `ledgerBalance(ds, 'KASIMAN:12')`,
  `ledgerEntries(ds, where)`, `integrity(ds)` (même fonction que la requête
  `ledgerIntegrityReport`). Terminer un test d'argent par `expect((await
  integrity(ds)).ok).toBe(true)`. Un portefeuille créé à la main (`INSERT INTO
  rider_wallet ...`) n'a pas d'ouverture : le contrôle d'intégrité le signale, c'est
  voulu.

## 5. Ce qui reste pour `p1-tests`

Le cycle complet (commande, vagues, relecture des offres, transitions, paiement,
annulations) est couvert de bout en bout par `cycle-pilote.int-spec.ts` depuis le
2026-10-20. Restent : deux courses qui se disputent le même Kasiman au même instant,
annulation sur course réservée, notation, tests au vert sur le staging
(`p1-staging`) et en CI.
