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
- **Itinéraire** (OSRM/Mapbox) : durée fixe, pas de réseau.
- **Passerelle de paiement** (HTTP) : répond en erreur ; le code doit la tolérer.
- **Appels masqués** : sans effet.

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
| `libs/database/src/lib/order/debt-limit.int-spec.ts` | Dette espèces et plafond (`p2-argent` I3) : règle (plafond strict, alerte, sans politique, plafond relevé sans déploiement) ; Kasiman bloqué absent des destinataires (`getOnlineDriversWithServiceId` de `createOrder`, `processPrePay`, relance du cron), d'`availableOrders` ; acceptation refusée avec le message lisible et `KASIMAN_DEBT_LIMIT` ; attribution opérateur permise ; course en cours terminée ; push une seule fois au passage de chaque seuil (rejeu, deux fins simultanées) ; règlement opérateur qui débloque, rejoué en série et en parallèle = un crédit, refus (montant, motif, permission) ; compensation par une course payée en ligne ; part de flotte (option A) ; `kasimanAccount` et `kasimanStatement` |

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

Commande (création, calcul du prix, dispatch), offres Redis (`availableOrders`,
resynchronisation), annulation sur course réservée, notation, tests au vert sur le
staging (`p1-staging`) et en CI.
