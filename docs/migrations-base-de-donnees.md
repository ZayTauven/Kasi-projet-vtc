# Migrations de la base de données

Point du référentiel : `p1-migrations` (lot `lot-fiabilite`, action `act-migrations`).
Mis en place le 2026-09-28. Décision : `KASI_DECISIONS.md`, entrée du 2026-09-28
« p1-migrations ».

## 1. Le principe en cinq lignes

- `synchronize` est **désactivé pour de bon** (`false` en dur, aucune variable pour le
  réactiver). La règle `tables < 5 || FORCE_SYNC_DB` et la procédure `FORCE_SYNC_DB`
  n'existent plus. Plus aucune table créée à la main (les scripts `add_*.sql` à la
  racine du monorepo sont obsolètes).
- Le schéma n'évolue **que par migrations**, rangées dans
  `libs/database/src/lib/migration/postgres/` et listées **explicitement** dans
  `libs/database/src/lib/migration/index.ts`.
- Elles sont exécutées par **un seul acteur** : le service compose `migrate`, un
  conteneur ponctuel (image admin-api, commande `node migrate.js run`) qui démarre
  avant les trois API. Les API attendent sa réussite (`service_completed_successfully`) :
  si une migration échoue, aucune API ne démarre sur un schéma incohérent. **Mais**
  compose a déjà supprimé l'ancien conteneur de chaque API à recréer : elles restent
  arrêtées (`Created`) jusqu'à correction (constaté le 2026-09-28). D'où la règle de
  déploiement : **lancer `migrate` explicitement avant `up -d`** (sections 6 et 7).
- La première migration, `Baseline1790629154960`, reproduit **exactement** le schéma
  de production du 2026-09-28 (commit déployé `8cbe512`). Sur une base neuve, elle crée
  tout ; sur une base déjà peuplée (production, base locale de démo), elle est
  **marquée comme appliquée sans être exécutée** (`migrate.js mark-baseline`).
- Au démarrage, chaque API vérifie en lecture seule qu'aucune migration n'est en
  attente et l'écrit dans ses logs (`[Migrations] schema a jour (...)` ou une erreur).

## 2. Les fichiers

| Fichier | Rôle |
|---|---|
| `libs/database/src/lib/migration/index.ts` | Liste ordonnée des migrations + nom de la référence |
| `libs/database/src/lib/migration/postgres/1790629154960-Baseline.ts` | Migration de référence (ne jamais la modifier) |
| `libs/database/src/lib/migration/postgres/baseline-tables.ts` | Les 59 tables qu'elle crée (contrôle de `mark-baseline`) |
| `libs/database/src/lib/migration/migrate.ts` | Exécutable : `run`, `show`, `check`, `mark-baseline`, `revert`, et pour le grand livre `ledger-open`, `ledger-check` |
| `libs/database/src/lib/migration/all-entities.ts` | Les 54 entités (union des trois API ; dont les 3 du grand livre et `money_policy` depuis le 2026-10-19) |
| `libs/database/src/lib/order/ledger-open.ts`, `ledger-integrity.ts` | Ouverture du grand livre et contrôle d'intégrité (appelés par `migrate.js`) |
| `libs/database/src/lib/migration/connection-options.ts` | Connexion lue dans `DB_*`, partagée par API, exécutable et CLI |
| `libs/database/src/lib/migration/data-source.cli.ts` | DataSource de la CLI TypeORM (poste de dev) |
| `tools/typeorm/register.js` | Préchargement ts-node + `.env` pour les scripts npm |
| `libs/database/src/lib/migration/mysql-archive/` | Historique Ridy MySQL, **inerte** (plus compilé ni chargé) |

`migrate.js` est une entrée webpack supplémentaire d'admin-api
(`apps/admin-api/project.json`, `additionalEntryPoints`) : il est produit à côté de
`main.js` dans `dist/apps/admin-api/` et donc présent dans l'image admin-api.

### Pourquoi une liste d'entités à part (`allEntities`)

Chaque API ne charge que ses propres entités (`autoLoadEntities`) : les trois
chargent les 48 entités de `entities` + `RequestActivityEntity`, et seule admin-api
charge `RewardEntity`. Aucune API ne voit le schéma complet ; c'est aussi pour cela
que l'ancien `synchronize` était fragile. `allEntities` en est l'union. La DataSource
de la CLI refuse de démarrer si un fichier de `entities/` déclare une entité absente
de cette liste.

## 3. Commandes

Sur le serveur (image admin-api, dans le réseau compose) :

```sh
docker compose run --rm --no-deps migrate node migrate.js show           # état, lecture seule
docker compose run --rm --no-deps migrate node migrate.js check          # base = entités ? (code 1 si écart)
docker compose run --rm --no-deps migrate node migrate.js run            # appliquer (fait par `up -d`)
docker compose run --rm --no-deps migrate node migrate.js mark-baseline  # une seule fois par base peuplée
docker compose run --rm --no-deps migrate node migrate.js revert         # annuler la dernière (jamais la référence)
docker compose run --rm --no-deps migrate node migrate.js ledger-open    # p2-argent I2 : ouverture du grand livre (une fois, API arrêtées)
docker compose run --rm --no-deps migrate node migrate.js ledger-check   # p2-argent I2 : intégrité, lecture seule (code 1 si écart)
```

Sur le poste de développement (depuis `app-kasi/`) :

```sh
npm run migration:show
npm run migration:check
npm run migration:run
npm run migration:revert
npm run migration:mark-baseline
npm run ledger:open      # p2-argent I2 : ouverture du grand livre (relancer ne fait rien)
npm run ledger:check     # p2-argent I2 : contrôle d'intégrité, lecture seule
npm run migration:generate -- libs/database/src/lib/migration/postgres/NomExplicite
npm run migration:create   -- libs/database/src/lib/migration/postgres/NomExplicite
```

Les scripts npm lisent `.env` sans écraser les variables déjà exportées. Comme `.env`
décrit la stack Docker (`DB_HOST=postgres`), ils visent alors automatiquement
`127.0.0.1:5433` (port publié par `docker-compose.yml`) et l'annoncent. Pour viser une
autre base : `DB_NAME=kasi_migtest npm run migration:show` (Git Bash) ou
`$env:DB_NAME='kasi_migtest'; npm run migration:show` (PowerShell).
Compter environ **2 minutes par commande** : ts-node vérifie les types en entier, et
c'est obligatoire (en compilation isolée, un champ typé par une énumération importée
reçoit `design:type = Object` et TypeORM refuse l'entité).

Garde-fous de `migrate.js` :

- **Verrou consultatif** PostgreSQL : deux exécutions simultanées s'attendent.
- `run` **refuse** (code 2) d'exécuter la référence sur une base qui contient déjà une
  des 59 tables : il faut d'abord `mark-baseline`. Une erreur de procédure ne peut donc
  pas tenter de recréer la production.
- `mark-baseline` **refuse** sur une base vide, ou s'il manque une des 59 tables.
- `revert` **refuse** d'annuler la référence (elle supprimerait tout) ; son `down()`
  lève d'ailleurs une erreur. Il annule la migration appliquée la plus récente
  (corrigé le 2026-09-29 : il visait à tort la référence dès qu'une seconde migration
  existait, et refusait donc tout retour arrière).

Migrations après la référence, dans l'ordre :

1. `MoneyIdempotencyKey1790647094992` (2026-09-29, `p1-unicite`) : colonne
   `idempotencyKey` + index unique sur les 4 tables de transactions. Additive,
   réversible, vérifiée sur une copie de la base de démo.
2. `LedgerTables1792421211893` (2026-10-19, `p2-argent` I2) : tables `ledger_account`,
   `ledger_entry`, `ledger_line` (vides), colonne `ledgerEntryId` nullable et indexée sur
   les 4 tables de transactions, et déclencheurs **écrits à la main** (équilibre de
   chaque écriture contrôlé à la validation de la transaction ; `UPDATE` et `DELETE`
   refusés sur les écritures et les lignes). Additive, réversible (`down` complet,
   fonctions comprises), vérifiée sur `kasi_test` (up, down, up, `check` sans écart)
   puis sur la base locale `kasi`. **Elle est suivie de `ledger-open`** : voir la
   section 7 bis.
3. `MoneyPolicy1792434023914` (2026-10-19, `p2-argent` I3) : table `money_policy`
   (une ligne par devise : plafond de dette du Kasiman `debtLimit`, seuil d'alerte
   `debtAlertThreshold`, `updatedByOperatorId`, `updatedAt`, index unique sur la
   devise) et sa ligne `XOF` à 10 000 / 7 500 FCFA (`ON CONFLICT DO NOTHING`). Aucune
   colonne ajoutée à `driver` (dérogation par Kasiman non retenue). Additive,
   réversible, vérifiée sur `kasi_test` (up, down, up, `check` sans écart) puis sur la
   base locale `kasi` par le service `migrate` (sauvegarde
   `../archive/sauvegardes/kasi-avant-dette-20261019.dump`, `ledger-check` à zéro
   écart ensuite). Rien à lancer après elle. Les montants se règlent ensuite sans
   déploiement : `UPDATE money_policy SET "debtLimit" = ..., "debtAlertThreshold" = ...
   WHERE currency = 'XOF'` en attendant l'écran du panel ; les API relisent la table à
   chaque contrôle.

## 4. Faire évoluer le schéma (développeur)

1. Modifier ou ajouter l'entité. Nouvelle entité : l'ajouter à `entities`
   (`database.module.ts`) ou à `allEntities`, et au `forFeature` de l'API qui s'en sert.
2. `npm run migration:generate -- libs/database/src/lib/migration/postgres/AjoutXxx`
3. **Relire le SQL généré.** Refuser tout `DROP COLUMN` ou renommage non voulu :
   TypeORM traduit un renommage de propriété en suppression puis création (perte de
   données).
4. Ajouter la classe à `kasiMigrations` dans `index.ts` (sinon elle ne sera jamais
   jouée ; `migration:check` continuera de signaler l'écart).
5. `npm run migration:run`, puis `npm run migration:check` → « aucun écart ».
6. Tester, puis commit (entité + migration + index ensemble).

Règles :

- Ne **jamais modifier** une migration déjà appliquée quelque part : en écrire une
  nouvelle.
- Préférer des migrations **additives** (nouvelle colonne nullable ou avec valeur par
  défaut) : les apps déjà installées tapent sur la production. Toute colonne exposée
  en GraphQL passe par le skill `kasi-contrat-mobile-backend` avant d'être renommée ou
  supprimée.
- Écrire un vrai `down()` (la CLI le génère) pour pouvoir revenir en arrière.
- Valeurs par défaut `numeric` : écrire `default: () => '0.00'` et non
  `default: '0.00'` ; pour `time`, écrire les secondes (`'00:00:00'`). Sinon TypeORM
  voit un écart qui n'existe pas et le régénère à chaque `migration:generate`
  (24 colonnes corrigées le 2026-09-28 pour cette raison, sans effet sur la base).

## 5. Base neuve (staging Dokploy, poste neuf, tests)

Rien à faire : `docker compose up -d` démarre `migrate`, qui crée la base si besoin,
applique la référence (extension PostGIS comprise), puis les suivantes. Le schéma
obtenu est identique à la production (vérifié le 2026-09-28 par comparaison des
`pg_dump --schema-only`). Seule différence : l'image `postgis/postgis` installe en plus
`postgis_topology`, `postgis_tiger_geocoder` et `fuzzystrmatch` dans la base
`POSTGRES_DB` qu'elle crée elle-même ; Kasi ne s'en sert pas.

Base de test jetable sur le serveur local, sans toucher à la base de démo :

```sh
docker exec kasi-postgres sh -c 'psql -U kasi -d postgres -c "CREATE DATABASE kasi_migtest"'
DB_NAME=kasi_migtest npm run migration:run
DB_NAME=kasi_migtest npm run migration:check
docker exec kasi-postgres sh -c 'psql -U kasi -d postgres -c "DROP DATABASE kasi_migtest"'
```

## 6. Production : première mise en place (une seule fois)

État au 2026-09-28 : production au commit `8cbe512`, aucune table `migrations`, schéma
identique à la migration de référence, **aucune migration de rattrapage nécessaire**.
Cette mise en place n'exécute donc **aucun ordre DDL** sur les tables existantes : elle
crée la table `migrations` et y inscrit une ligne.

**Attention** : déployer `p1-migrations` déploie aussi tout ce qui a été committé
depuis `8cbe512` (dont le hachage scrypt des mots de passe opérateurs). Vérifier
`git log 8cbe512..origin/main` avant de commencer.

Toutes les commandes sur le VPS, depuis `/opt/kasi`.

```sh
# 0. État de départ
cd /opt/kasi
git log -1 --oneline
docker compose ps

# 1. Sauvegarde complète AVANT tout (hors conteneur)
mkdir -p /root/backups
docker exec kasi-postgres sh -c 'pg_dump -U kasi -Fc kasi' > /root/backups/kasi_avant_p1-migrations_$(date +%F_%H%M).dump
docker exec kasi-postgres sh -c 'pg_dump -U kasi --schema-only kasi' > /root/backups/kasi_schema_avant_p1-migrations.sql
ls -la /root/backups/          # le .dump doit peser plusieurs Mo, pas 0 octet
# Compteurs témoins, à comparer à l'étape 6
docker exec kasi-postgres sh -c 'psql -U kasi -d kasi -Atc "select (select count(*) from request),(select count(*) from driver),(select count(*) from rider),(select count(*) from operator)"'

# 2. Code et images (les conteneurs en service ne bougent pas encore)
git pull
docker compose build

# 3. Contrôles en lecture seule, AVANT de marquer
docker compose run --rm --no-deps migrate node migrate.js show
#   attendu : [ ] Baseline1790629154960 / 1 migration(s) en attente
docker compose run --rm --no-deps migrate node migrate.js check
#   attendu : schema conforme aux entites (aucun ecart)
#   S'il y a des écarts : S'ARRÊTER, ne rien marquer, remonter la sortie.

# 4. Marquer la référence (crée la table `migrations`, insère 1 ligne)
docker compose run --rm --no-deps migrate node migrate.js mark-baseline
#   attendu : Baseline1790629154960 enregistree comme appliquee, NON executee (59 tables ...)
docker compose run --rm --no-deps migrate node migrate.js show
#   attendu : [X] Baseline1790629154960 / 0 migration(s) en attente

# 5. Migrations explicites (rien à appliquer ici), puis déploiement habituel
docker compose run --rm --no-deps migrate
#   attendu : aucune migration en attente ; S'ARRÊTER si le code de sortie n'est pas 0
docker compose up -d
docker compose restart nginx

# 6. Vérifications
docker compose ps -a                      # kasi-migrate : Exited (0) ; API : Up
docker compose logs migrate               # "aucune migration en attente"
docker compose logs admin-api driver-api rider-api | grep -i "Migrations"   # "schema a jour (1 migration(s) appliquee(s))" x3
curl -s -X POST http://127.0.0.1:3001/graphql -H 'content-type: application/json' -d '{"query":"{ mapSetting { id } }"}'
curl -s -X POST http://127.0.0.1:3002/graphql -H 'content-type: application/json' -d '{"query":"{ mapSetting { id } }"}'
#   attendu (x2) : {"data":{"mapSetting":{"id":"1"}}}
curl -s -X POST http://127.0.0.1:3000/graphql -H 'content-type: application/json' -d '{"query":"{ login(userName: \"verif-migrations-inexistant\", password: \"x\") { token } }"}'
#   attendu : erreur "Invalid Credentials" (la table operator a bien été lue)
docker exec kasi-postgres sh -c 'psql -U kasi -d kasi -Atc "select (select count(*) from request),(select count(*) from driver),(select count(*) from rider),(select count(*) from operator)"'
#   compteurs identiques à l'étape 1 (hors courses créées entre-temps)
```

Puis un test réel depuis une app installée (connexion, écran carte).

### Retour arrière

- **Échec aux étapes 3 ou 4** : rien n'a été modifié, sauf peut-être la table
  `migrations`, sans effet sur l'ancien code. Les conteneurs en service n'ont pas
  bougé. Pour revenir au code précédent : `git checkout 8cbe512` (les images en service
  sont encore les anciennes, ne pas relancer `up -d` avec les nouvelles).
- **Échec du service `migrate` à l'étape 5** (non attendu : l'étape 4 l'a déjà joué à
  vide) : les API recréées restent **arrêtées** (`Created`), l'application est coupée.
  `docker compose logs migrate` donne la cause. Revenir au code précédent :
  `git checkout 8cbe512 && docker compose build && docker compose up -d && docker compose restart nginx`
  (sur l'ancien code, compose ne connaît plus `migrate` : ajouter `--remove-orphans`).
  L'ancien code ignore la table `migrations` (il ne synchronise jamais une base de plus
  de 5 tables).
- **Données abîmées** (non attendu : cette mise en place n'écrit aucune donnée métier) :
  ```sh
  docker compose stop admin-api driver-api rider-api
  docker exec -i kasi-postgres sh -c 'pg_restore -U kasi -d kasi --clean --if-exists' < /root/backups/kasi_avant_p1-migrations_<horodatage>.dump
  docker compose start admin-api driver-api rider-api
  ```

## 7. Production : déploiements suivants

Une étape s'ajoute entre `build` et `up -d` :

```sh
cd /opt/kasi && git pull && docker compose build \
  && docker compose run --rm --no-deps migrate \
  && docker compose up -d && docker compose restart nginx
```

`docker compose run --rm --no-deps migrate` applique les migrations pendant que les
anciennes API tournent encore. S'il échoue, la chaîne `&&` s'arrête **avant** `up -d` :
les API en service ne sont pas touchées. Sans cette étape, `up -d` jouerait quand même
les migrations (service `migrate`), mais un échec laisserait les API recréées arrêtées
(voir section 1). Les migrations doivent donc rester compatibles avec le code en
service pendant quelques minutes : c'est le cas des migrations additives (section 4).

Si le déploiement contient une migration (`git diff --stat <avant>..HEAD -- libs/database/src/lib/migration/postgres/`) :

1. `pg_dump -Fc` comme à l'étape 1 ci-dessus, avant `git pull` ;
2. après `docker compose build` : `docker compose run --rm --no-deps migrate node migrate.js show`
   pour voir ce qui va passer ;
3. après `up -d` : `docker compose logs migrate` et `docker compose ps -a` (Exited (0)) ;
4. retour arrière d'une migration : `docker compose run --rm --no-deps migrate node migrate.js revert`,
   puis redéployer le code précédent ; sinon, restauration du dump.

## 7 bis. Grand livre : premier déploiement (`p2-argent` I2)

À faire **une seule fois**, lors du déploiement qui contient `LedgerTables1792421211893`
(décision du 2026-10-19 : déploiement regroupé plus tard, après `p1-migrations` et la
phase 1). Fiche : `docs/fiche-conception-argent.md` §3.7 à §3.9.

Pourquoi un ordre strict : `ledger-open` reprend le solde de chaque portefeuille comme
ouverture de son compte. Si une **ancienne** API (sans grand livre) écrit un mouvement
d'argent après l'ouverture, ce mouvement n'aura pas d'écriture et le contrôle
d'intégrité le signalera. Les trois API sont donc arrêtées entre la migration et le
démarrage des nouvelles (environ une minute).

```sh
cd /opt/kasi
# 1. Sauvegarde (comme section 6, étape 1)
docker exec kasi-postgres sh -c 'pg_dump -U kasi -Fc kasi' > /root/backups/kasi_avant_grand-livre_$(date +%F_%H%M).dump
# 2. Code et images (les conteneurs en service ne bougent pas)
git pull && docker compose build
docker compose run --rm --no-deps migrate node migrate.js show
#   attendu : [ ] LedgerTables1792421211893 (et les précédentes si elles manquent)
# 3. Arrêt des trois API : plus aucun mouvement d'argent
docker compose stop admin-api driver-api rider-api
# 4. Migration
docker compose run --rm --no-deps migrate
#   attendu : appliquee : LedgerTables1792421211893 ; code de sortie 0, sinon S'ARRÊTER
# 5. Ouverture du grand livre, suivie du contrôle d'intégrité
docker compose run --rm --no-deps migrate node migrate.js ledger-open
#   attendu : "N compte(s) examine(s) : N ouvert(s)" puis
#             "ledger-check : grand livre integre ... aucun ecart" ; code de sortie 0
# 6. Nouvelles API (LEDGER_MODE absent de .env = shadow)
docker compose up -d && docker compose restart nginx
# 7. Contrôle, à refaire les jours suivants (la tâche quotidienne d'admin-api le journalise aussi)
docker compose run --rm --no-deps migrate node migrate.js ledger-check
```

- `ledger-open` est **rejouable** : clé `opening:<compte>:<devise>`, verrou consultatif.
  Une relance n'écrit rien (`0 ouvert(s), N deja ouvert(s)`).
- Ce qu'il écrit : pour chaque portefeuille (Kasiman, client, flotte, `admin_wallet`),
  une écriture `OUVERTURE` (compte +solde arrondi au franc, `KASI:OUVERTURE` −solde) ;
  le portefeuille est aligné sur l'entier (écart de moins d'un franc, sans ligne de
  portefeuille) ; la somme des écarts d'arrondi va sur `KASI:ARRONDIS`, arrondie au
  franc. L'historique d'avant l'ouverture n'est pas reconstitué.
- Code de sortie 1 à l'étape 5 (écart) : ne pas démarrer les API ; lire les lignes
  `[PROJECTION]` / `[UNLINKED_LINE]` ; restaurer le dump au besoin.
- **Bascule `strict`** : après deux semaines de `ledger-check` à zéro écart, ajouter
  `LEDGER_MODE=strict` dans `/opt/kasi/.env`, puis `docker compose up -d`. Retour à
  `shadow` : retirer la ligne et relancer `up -d`.
- Retour arrière de la migration : `node migrate.js revert` supprime les trois tables,
  les déclencheurs et la colonne `ledgerEntryId` (le grand livre est perdu, les
  portefeuilles restent) ; puis redéployer le code précédent.

En local (base `kasi`), même ordre avec les scripts npm (`npm run migration:run`,
`npm run ledger:open`) ou le service `migrate` ; fait le 2026-10-19, sauvegarde
préalable dans `../archive/sauvegardes/`.

## 8. Dokploy

`docker-compose.dokploy.yml` a le même service `migrate` (construit depuis le
Dockerfile d'admin-api) et les mêmes dépendances. Staging sur `develop` (`p1-staging`) :
base neuve, créée entièrement par les migrations. Bascule de la production vers
Dokploy : la base restaurée depuis la production porte déjà sa ligne
`Baseline1790629154960` ; ne **pas** relancer `mark-baseline`.

## 9. Base locale de développement antérieure au 2026-09-28

Une base locale peuplée (jeu de démo) se traite comme la production :
`npm run migration:show`, `npm run migration:check`, `npm run migration:mark-baseline`,
puis `npm run migration:check`.

Si elle a été construite avec les scripts `add_*.sql`, dix clés primaires y portent le
nom PostgreSQL par défaut (`<table>_pkey`) au lieu du nom TypeORM (`PK_<hash>`) de la
production. TypeORM ne le voit pas, mais une future migration qui toucherait l'une de
ces clés échouerait sur cette base. Alignement (métadonnées seulement, instantané) :

```sql
ALTER TABLE "call_masking_provider" RENAME CONSTRAINT "call_masking_provider_pkey" TO "PK_dc98b6b23bb0898031092b46046";
ALTER TABLE "email_provider"        RENAME CONSTRAINT "email_provider_pkey"        TO "PK_7244c12625778820c445d2c17de";
ALTER TABLE "map_setting"           RENAME CONSTRAINT "map_setting_pkey"           TO "PK_cdccc1f6c4442d6d4a985db802d";
ALTER TABLE "payout"                RENAME CONSTRAINT "payout_pkey"                TO "PK_1cb73ce021dc6618a3818b0a474";
ALTER TABLE "payout_method"         RENAME CONSTRAINT "payout_method_pkey"         TO "PK_b90a23fbcc6be221b8c385cf6e2";
ALTER TABLE "payout_session"        RENAME CONSTRAINT "payout_session_pkey"        TO "PK_ed1a6b6cfdd9221a740c1872c5f";
ALTER TABLE "retention_policy"      RENAME CONSTRAINT "retention_policy_pkey"      TO "PK_4e113cd29b4039d30d5d6e1a43a";
ALTER TABLE "reward"                RENAME CONSTRAINT "reward_pkey"                TO "PK_a90ea606c229e380fb341838036";
ALTER TABLE "shift_rule"            RENAME CONSTRAINT "shift_rule_pkey"            TO "PK_efdedef59fbadc08e287f4780ed";
ALTER TABLE "sms_provider"          RENAME CONSTRAINT "sms_provider_pkey"          TO "PK_583b8905944a22e31954c4cf0fd";
```

## 10. Diagnostic

| Symptôme | Cause | Action |
|---|---|---|
| `REFUS : la base contient deja N table(s)...` | Base peuplée jamais marquée | `mark-baseline` (après `check`) |
| `REFUS : base vide` sur `mark-baseline` | Base neuve | `run` |
| `REFUS : ... table(s) absente(s)` | Base qui n'est pas au niveau de la référence | Ne pas marquer ; comparer au schéma de production |
| Log API `[Migrations] N migration(s) non appliquee(s)` | `migrate` sauté ou en échec | `docker compose logs migrate`, puis `run` |
| `service "migrate" didn't complete successfully` au `up -d` | Migration en échec (rien n'a été commité : une seule transaction). Les API recréées sont arrêtées (`Created`) | Lire `docker compose logs migrate` ; corriger ou revenir au code précédent, puis `up -d` |
| `migration:check` signale des `SET DEFAULT` | Valeur par défaut écrite sous une forme que TypeORM relit autrement | Voir la règle des valeurs par défaut (section 4) |
| `ledger-check` : `[PROJECTION] ... sans compte au grand livre` | Grand livre jamais ouvert sur cette base | `ledger-open` (section 7 bis) |
| `ledger-check` : `[UNLINKED_LINE]` | Ligne de portefeuille sans écriture : en `shadow`, une écriture a échoué (voir les logs `[Ledger] ... NON enregistree`), ou une ancienne API a tourné après l'ouverture | Corriger par une écriture motivée, jamais en touchant un solde |
| `LEDGER_IMMUTABLE` | `UPDATE` ou `DELETE` sur `ledger_entry` / `ledger_line` | Interdit : contre-passation |
| `LEDGER_ENTRY_UNBALANCED` | Écriture dont les lignes ne somment pas à zéro (refusée par la base) | Bug du site d'appel : lire l'écriture refusée dans les logs |
