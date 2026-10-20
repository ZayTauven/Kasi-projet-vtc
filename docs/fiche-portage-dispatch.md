# Fiche de portage : dispatch par vagues

**Point** : `p2-dispatch` (`lot-dispatch`). **Points liés** : `bs-mod-dispatch`,
`bs-act-bullmq`, `bs-act-dispatch`, `dira-r-vagues`, `dira-r-journal`,
`dira-r-nonservi`, `bug-offre-perdue`, `bug-aucun-kasiman`.
**Rédigée le** 2026-10-20, au commit `b3a6866`. **État** : D1 à D6 faits, D7 essayé sur émulateur (non committés,
`KASI_DECISIONS.md`, entrées du 2026-10-20) ; restent téléphone réel, anciennes versions,
livraison et bascule `waves`. Questions de la section 7 tranchées, Q9 révisée en D7.
**Méthode** : skill `kasi-portage-bettersuite` (licence confirmée, `p0-licence` : Fait).
Dira : idées seulement, aucun code.

## 1. Le dispatch actuel de Kasi

Chemins relatifs à `app-kasi/`, lignes au commit `b3a6866`.

**Diffusion à la création, une seule fois, à tout le monde.**
- `libs/database/src/lib/order/shared-order.service.ts:321-331` : `getClose` au rayon
  du service (`service.searchRadius`, au vol d'oiseau), puis
  `getOnlineDriversWithServiceId` (en ligne, service activé, flotte, livraison, dette).
- `:371-376` : statut `NoCloseFound` si personne, sinon `Requested` (`Booked` au-delà
  de 30 min, `WaitingForPrePay` si prépaiement).
- `:417-428` : inscription Redis, puis `driverNotified`, publication `orderCreated`
  (`driverIds` = tous les candidats d'un coup) et push `requests`. Aucun classement,
  aucune vague, aucune trace de qui a vu l'offre.
- `:432-492` (`processPrePay`) : même diffusion après `WaitingForPrePay → Requested`.

**Redis** (`libs/database/src/lib/redis/order-redis.service.ts`) :
- `request` : index GEO du point de départ ; `request-time` : ZSET, score = heure de
  prise en charge en ms (`add`, l. 15-30) ; `request-drivers:<id>` : SET des Kasimen
  prévenus (l. 77-92) ; `expire` (l. 94-108) retire les trois.

**Côté Kasiman** : `availableOrders` et `updateDriversLocationNew`
(`apps/driver-api/src/app/order/order.resolver.ts:42`, `:59-69`) passent par
`getOrdersForDriver` (`apps/driver-api/src/app/order/order.service.ts:225`), qui relit
`getForDriver` (GEO au rayon du Kasiman, fenêtre −20/+30 min) puis filtre statut,
service, livraison, flotte et dette. Toute offre dans le rayon est visible, qu'elle
ait été adressée au Kasiman ou non. driver-app ne relit qu'à l'ouverture de l'écran
ou tous les 50 m.

**Cron de driver-api** (`apps/driver-api/src/app/order/cron-job.service.ts`), toutes
les 5 min : expiration après `REQUEST_EXPIRATION` (10 min) par `expireOrders`
(`order.service.ts:196`, conditionnelle depuis `p1-transitions`), puis relance des
courses en attente (rayon fixe 10 km, push seulement, pas de souscription).

**Défauts constatés**
1. `OrderRedisService.getRequestIdsInTimeRage` lisait `request-time` par **rang**
   (`zrange`) avec des bornes en ms : liste toujours vide, la relance ne partait
   jamais (relevé le 19 octobre). **Corrigé en D1.**
2. `bug-offre-perdue` : `orderCreated` part une fois ; un Kasiman dont la connexion
   revient ne revoit l'offre qu'en rouvrant l'écran ou en roulant 50 m.
3. `bug-aucun-kasiman` : l'expiration ne publie rien au client (`expireOrders` n'émet
   pas `orderUpdated`). rider-app reste sur « Nous recherchons pour vous le Kasiman le
   plus proche » jusqu'à sa prochaine relecture : 10 min plus la granularité de 5 min
   du cron (12 min 30 observées).
4. Le Kasiman ne peut pas refuser une offre : aucune mutation de refus. Sans trace,
   impossible de répondre à « pourquoi personne n'a pris la course ? ».

**Dette (I3, à préserver)** : `isBlockedForDebt` / `blockedForDebtDriverIds`
(`libs/database/src/lib/order/debt-limit.ts`) filtrent dans
`getOnlineDriversWithServiceId` (création, prépaiement, relance), vident
`getOrdersForDriver`, et refusent l'acceptation avant l'écriture conditionnelle (seul
contrôle qui fait foi). Le dispatcher par vagues passe par
`getOnlineDriversWithServiceId` pour chaque vague : le filtre reste en un seul endroit.

## 2. Le dispatcher de BetterSuite 5.3.2

`apps/rider-api/src/app/dispatcher/` (832 lignes) et
`libs/database/src/lib/redis/ride-offer-redis.service.ts` (445 lignes).

- **Trois files BullMQ** : `dispatch-main` (job `dispatch`, puis `expire-order`
  différé de `requestTimeoutSeconds`), `dispatch-broadcast` (une vague par job,
  `wave` n+1 planifiée après `waveIntervalSeconds`, jusqu'à `maxWaves`),
  `dispatch-sequential` (un Kasiman à la fois, `perDriverTimeoutSeconds`). Jobs
  dédupliqués par `jobId` (`dispatch:<id>`, `expire:<id>`). Le producteur est
  `createOrder` (`shared-order.service.ts:757`, différé de la durée de réservation).
- **Sélection** (`driver-selection.service.ts`) : candidats Redis au rayon max, score
  pondéré (distance **au vol d'oiseau**, note, temps d'inactivité, taux de refus),
  seuil, top N, mémorisés comme candidats de la course. Une vague prend la tranche
  `[(wave−1)·waveSize, wave·waveSize[` de cette liste figée.
- **Élargissement du rayon** : `RadiusExpansionConfig` existe, mais
  `applyRadiusExpansion` renvoie la liste telle quelle et la relance par rayon est
  commentée dans `broadcast.processor.ts`. À écrire.
- **Offres** : `offerRide` ne vise que les Kasimen sans offre ni course en cours ;
  publication `driver.event` (`RideOfferReceived`, `RideOfferRevoked`).
- **Expiration** (`main.processor.ts`) : `Expired` en base (sans condition), message
  éphémère au client, `rider.order.updated` (`NoDriverFound`), retrait des offres.

**Écarts avec Kasi**

| BetterSuite | Kasi | Conséquence |
|---|---|---|
| `taxi_order`, `customer` | `request`, `rider` | réécrire les accès, pas de copie |
| `ride_offer:<id>` en **RedisJSON** (`json.get`), client `redis` (node-redis) | `redis:7-alpine` sans module JSON, client `ioredis` | métadonnées en HASH ou chaîne JSON |
| métadonnées Kasiman en ligne (note, inactivité, refus, offres en cours) | GEO + `driver-location-time` seulement | score réduit à la distance au départ |
| souscriptions `driver.event`, `rider.order.updated` | `orderCreated(driverIds)`, `orderRemoved`, `orderUpdated` | garder celles de Kasi (section 4) |
| statuts et `RiderOrderUpdateType.NoDriverFound` | `Requested`, `NoCloseFound`, `Expired`… | aucune valeur d'énumération ajoutée |
| `BetterConfigService` (fichier de config) | rien | env puis table de réglage (Q10) |
| expiration sans condition | `transitionOrder` conditionnel (`p1-transitions`) | garder la transition Kasi |
| Bull Board (adaptateur Express) | Fastify | non porté au pilote |
| dispatcher dans rider-api | courses créées par rider-api **et** admin-api | consommateur dans driver-api (Q1) |

**On garde** : l'organisation en files, la déduplication par `jobId`, la vague comme
job différé, l'expiration différée par course, le retrait d'offre. **On laisse** :
le mode séquentiel (Q8), le score note/inactivité/refus (données absentes), RedisJSON,
Bull Board.

## 3. La cible

1. **Vagues à rayon croissant** (`dira-r-vagues`) : 1 km, puis 2 km, puis 3 km
   (Q2). Chaque vague n'ajoute que les nouveaux candidats ; les offres déjà faites
   restent ouvertes (cumulatif, comme le mode diffusion de BetterSuite).
2. **Classement par la route** : préfiltre GEO au vol d'oiseau, puis distance et
   durée routières pour les N premiers (Q7) ; repli au vol d'oiseau si le routage
   échoue. Dans chaque anneau, le mode commandé passe en tête (Q9 révisée en D7 :
   priorité de classement, plus une exclusion de la 1re vague).
3. **Journal des appels** (`dira-r-journal`), une table `dispatch_attempt` (migration) :
   `requestId`, `driverId`, `wave`, `rank`, `airDistanceM`, `roadDistanceM`,
   `roadDurationS`, `offeredAt`, `outcome` (`accepted`, `rejected`, `no_answer`,
   `revoked`, `taken_by_other`), `respondedAt`. Une ligne par (course, Kasiman),
   unique. Lecture dans admin-api (fiche de la course).
4. **Refus explicite** : mutation facultative `rejectOrderOffer(orderId)` dans
   driver-api. Les apps installées ne l'appellent pas : leurs Kasimen restent en
   `no_answer`.
5. **Client prévenu** (`bug-aucun-kasiman`) et **expiration** : job différé
   `expire:<id>` après la dernière vague (Q4) ; transition conditionnelle vers
   `Expired`, publication `orderUpdated` (rider-app installée revient à l'accueil),
   push en français « Aucun Kasiman disponible pour le moment… ». Le cron reste en
   filet de sécurité (`REQUEST_EXPIRATION`).
6. **Offre perdue** (`bug-offre-perdue`) : chaque vague republie `orderCreated` aux
   Kasimen déjà sollicités et encore éligibles ; `availableOrders` ne renvoie que les
   offres adressées au Kasiman (Q6).
7. **Demande non servie** (`dira-r-nonservi`) : chaque expiration sans Kasiman est
   journalisée avec son point ; plusieurs dans la même zone en peu de temps
   déclenchent une push aux Kasimen en ligne proches (Q12). La carte des zones de
   forte demande relève de `p4-pilotage` (tableaux de bord, après le pilote).

## 4. Contrat avec les apps installées

Skill `kasi-contrat-mobile-backend`. Ajouts seulement, rien de renommé ni retiré.

- **Le Kasiman reçoit les offres par la même souscription** `orderCreated`, même
  payload (`{ orderCreated, driverIds }`), même filtre ; une vague = une publication
  avec les `driverIds` de la vague. Retrait par `orderRemoved` (existant).
- `availableOrders` et `updateDriversLocationNew` : même signature. Seul le contenu
  change si Q6 est retenue (moins d'offres visibles). À valider avec `kasi-mobile-apps`.
- Pas de nouvelle valeur de `OrderStatus` : `Expired` et `NoCloseFound` existent, et
  rider-app les gère déjà (`rider-app/lib/main/bloc/main_bloc.dart:320-340`).
- Ajouts facultatifs : mutation `rejectOrderOffer` (driver-api) ; requête
  `dispatchAttempts(requestId)` (admin-api, panel seulement) ; push texte au client
  (aucune clé de traduction nouvelle côté app).
- Validation sur téléphone réel, ancienne et nouvelle version des deux apps, avant
  la bascule (Q10).

## 5. Découpage en incréments

| Incr. | Contenu | Tests au banc | Estimation |
|---|---|---|---|
| **D1** (fait) | BullMQ dans driver-api (file `kasi-dispatch`, préfixe `kasi-bull`), battement du cron porté par la file, correctif `getRequestIdsInTimeRage`, relance durcie | 7 nouveaux + test de dette sans bouchon | 1,5 j |
| D2 | Vagues 1/2/3 km : producteur dans `createOrder`/`processPrePay` (rider-api, admin-api), consommateur driver-api, réglages, bascule `DISPATCH_MODE` | vagues, cumul, dette par vague, déduplication, rejeu du job, bascule | 5 à 7 j |
| D3 | Expiration par course, client prévenu (`orderUpdated` + push), cron en filet | expiration vs acceptation concurrente, rejeu, push unique | 2 à 3 j |
| **D4** (fait) | Journal `dispatch_attempt` (migration), refus explicite, lecture admin-api | une ligne par Kasiman, issues, unicité, migration | 3 à 4 j |
| **D5** (fait) | Classement par la route (matrice), repli, priorité au mode commandé | ordre, repli sans réseau, quota | 3 à 5 j |
| **D6** (fait) | Demande non servie : détection et alerte | seuil, fenêtre, pas de doublon | 2 à 3 j |
| D7 | Bout en bout : émulateur + téléphone, anciennes versions, bascule, retrait de la relance du cron | E2E course et livraison | 2 à 3 j |

Total : 19 à 26,5 jours-développeur (4 à 5,5 semaines), dans l'enveloppe du lot (4 à 7 sem.).

## 6. D1 en détail (fait le 2026-10-20, non committé)

- Dépendances : `@nestjs/bullmq` 11.0.5 (peers NestJS 10/11, BullMQ ≤ 5) et `bullmq`
  5.81.5, mêmes majeures que BetterSuite ; `ioredis` 5.11.1 dédupliqué.
- `apps/driver-api/src/app/dispatch/dispatch-queue.ts` : préfixe `kasi-bull`, file
  `kasi-dispatch`, connexion lue comme `RedisModule.forRoot` (même Redis), base logique 2. Les données
  des API (positions GEO, clés de vague, pub/sub) sont, elles, en base 0 :
  `RedisModule.forRoot` ignore `commonOptions.db` avec une config unique (constaté en D7).
- `apps/driver-api/src/app/dispatch/dispatch-tick.processor.ts` : planificateur
  BullMQ `dispatch-tick` (toutes les 5 min, idempotent au redémarrage) qui appelle
  `CronJobService.cronTask` ; `@Interval(300_000)` retiré. Gain : un seul battement
  même avec plusieurs instances de driver-api. Différence : le premier battement part
  au démarrage au lieu de 5 min après (balayage idempotent).
- `getRequestIdsInTimeRage` lit par score ; `getAll` lit tout par rang.
- Relance du cron, qui tourne désormais : courses sans Kasiman seulement (ni
  prépaiement en attente, ni course acceptée), mêmes filtres qu'à la création
  (livraison comprise), Kasiman inscrit dans `request-drivers` (pas de push répétée
  toutes les 5 min), une course en défaut n'arrête plus la boucle.
- Rien ne change pour rider-api ni admin-api : ils n'importent pas BullMQ en D1.

## 7. Questions à trancher

> **Tranché le 2026-10-20** par la session principale : recommandations retenues ; Q9 révisée le même jour après l'essai D7. Voir `KASI_DECISIONS.md`.

| # | Question | Recommandation |
|---|---|---|
| Q1 | Où tourne le consommateur ? | **driver-api** : il a déjà le cron, les push Kasiman et l'acceptation ; rider-api et admin-api ne font qu'ajouter des jobs (producteurs légers). |
| Q2 | Rayons des vagues | **1, 2, 3 km** (Dira), puis une 4e vague au `searchRadius` du service : au pilote, la flotte sera clairsemée. |
| Q3 | Intervalle et taille d'une vague | **30 s** entre vagues ; au plus **5** Kasimen par vague, les mieux classés de l'anneau. |
| Q4 | Délai avant « aucun Kasiman » | **2 min après la dernière vague** (≈ 3 min 30 au total, contre 10 à 15 min). Réservations : dispatch lancé **15 min** avant l'heure. |
| Q5 | Une offre reste-t-elle ouverte aux vagues précédentes ? | **Oui** (cumulatif), le premier qui accepte gagne (acceptation conditionnelle déjà en place). |
| Q6 | `availableOrders` limité aux offres adressées au Kasiman ? | **Oui** une fois les vagues actives, sinon un Kasiman à 3 km voit la course dès la première seconde et les vagues ne servent à rien. |
| Q7 | Source du classement par la route | **Matrice Mapbox** (même jeton que `RoutingService`, un appel par vague, 10 candidats au plus), repli OSRM puis vol d'oiseau. À chiffrer en quota. |
| Q8 | Porter le mode séquentiel (un par un) ? | **Non** au pilote : trop lent avec peu de Kasimen ; la structure le permet plus tard. |
| Q9 | Définition de « mode commandé » pour la 1re vague | ~~Kasimen dont le seul service activé correspond au service commandé ; les polyvalents à partir de la 2e vague.~~ **Révisée en D7** : la flotte est polyvalente (`vision-kasiman`), l'exclusion l'écartait presque entière. Le mode commandé (seul service activé = service commandé) est une **priorité de classement dans chaque anneau**, avant la durée routière ; un polyvalent est sollicité dès la 1re vague s'il reste de la place. Réglage `DISPATCH_PREFER_SINGLE_SERVICE` (vrai par défaut). |
| Q10 | Réglages et bascule | Variables d'environnement au pilote, `DISPATCH_MODE=legacy` par défaut, `waves` activé par l'opérateur ; table de réglage après le pilote. |
| Q11 | Texte de la push client | « Aucun Kasiman n'est disponible près de vous pour le moment. Réessayez dans quelques minutes. » |
| Q12 | Seuil de la demande non servie | **3 demandes non servies à moins de 1 km en 15 min** : push aux Kasimen en ligne à moins de 5 km, une fois par zone et par heure. |
| Q13 | Refus explicite côté driver-app | Ajouter un bouton « Refuser » dans la prochaine version (mutation facultative) ; sans lui le journal ne distingue pas refus et absence de réponse. |
