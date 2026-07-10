# libs/* — état de reconstitution

## Récupérées / peuplées

**`libs/database`** — lib Nx TypeScript, ~399 imports via `@ridy/database`
dans le monorepo. Contenu récupéré depuis la source originale d'app-ridy
et présent dans ce dépôt (entités TypeORM, migrations, DTOs partagés — ex.
`libs/database/src/lib/interfaces/point`, `.../media.entity`,
`.../shared-configuration.service`, `.../migration/*.ts`).

**`libs/client-shared`** — lib Dart (pas Nx/TypeScript), référencée par
`driver-app/pubspec.yaml` et `rider-app/pubspec.yaml` via
`client_shared: path: ../../libs/client-shared` (audit mobile du
2026-07-01). Contenu récupéré et présent dans ce dépôt.

## Manquantes — code source non disponible, build backend bloqué

**`libs/order`** (57 imports via `@ridy/order`), **`libs/redis`** (18
imports via `@ridy/redis`), **`libs/coupon`** (6 imports via
`@ridy/coupon`) — libs Nx réelles du monorepo `app-ridy` original (voir
grep du 2026-07-01).

Contrairement à `package.json` / `nx.json` / `tsconfig.base.json` (config
de workspace, reconstituable par inférence des imports et du Dockerfile),
le contenu de ces libs est de la **logique métier réelle** (services Redis,
règles de tarification/commande, logique de coupons).

Fabriquer ce code à partir des seuls noms de symboles importés produirait
des entités/services **incorrects par construction** et serait pire que de
laisser le manque explicite. Ces 3 dossiers ne sont donc **pas reconstitués**.

`kasi-backend-services` doit récupérer leur contenu depuis la source
originale d'app-ridy avant d'auditer ou de migrer le backend. Voir
`KASI_DECISIONS.md` à la racine du dépôt Kasi pour le détail.
