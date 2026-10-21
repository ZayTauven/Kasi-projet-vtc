# Runbook : mise en production de l'ouverture de la phase 3

Décision de l'utilisateur du 20 octobre 2026 : tout reste en local jusqu'à la fin de la phase 2 ;
**la mise en production est la première étape de la phase 3 (pilote)**. Ce runbook la prépare.
Points du référentiel : `p1-migrations`, `socle-deploiement`, `act-hachage`, `p2-argent`,
`p2-dispatch`, `p2-parametrage`, et la validation sur téléphone réel de tous les lots.

Rédigé le 21 octobre 2026 par la session principale, à partir de
`docs/migrations-base-de-donnees.md` (§6, §7, §7 bis), qui reste la référence détaillée.
**Aucune commande de ce document n'a encore été jouée en production.** Les accès au VPS sont hors
dépôt (`Kasi-ressources/vps/`).

## 0. Hors calendrier : risque Yessal avant le 7 novembre 2026

Indépendant de la phase 3, et à traiter **avant le prochain renouvellement TLS (vers le
7 novembre)**, avec l'accord de l'utilisateur, puisque c'est une action en production.

`kasi-nginx` sert aussi Yessal (`yessal.kasigroupe.tech`) par un fichier
`conf.d/yessal-demo.conf` posé **à la main dans la couche du conteneur**, avec un réseau
`yessal_demo_net` rattaché à la main. Deux pannes possibles :

- au renouvellement, le hook relance nginx : si Yessal ne répond pas à ce moment-là, ses
  upstreams statiques font échouer le démarrage, et **Kasi tombe avec** ;
- toute recréation de `kasi-nginx` efface le fichier : **Yessal tombe**.

À faire, en une seule session SSH (le port 22 coupe après 3 ou 4 connexions rapprochées) :
1. copier le fichier hors du conteneur :
   `docker cp kasi-nginx:/etc/nginx/conf.d/yessal-demo.conf /opt/kasi/.nginx-extra/yessal-demo.conf` ;
2. le monter depuis l'hôte, dans `docker-compose.override.yml` (non versionné), avec le réseau
   Yessal déclaré en `external` ;
3. rendre ses upstreams dynamiques (`resolver 127.0.0.11` et `proxy_pass` par variable, comme
   `kasi-locations.conf`) : une absence de Yessal ne doit plus empêcher nginx de démarrer ;
4. vérifier : `nginx -t`, `certbot renew --dry-run`, puis Kasi et Yessal en HTTPS.

Le certificat Yessal est en `manual` (dns-01) : il ne se renouvellera pas seul et expire le
9 décembre 2026. C'est à l'équipe Yessal de s'en occuper.

## 1. Ce qui part en production

La production est au commit `8cbe512` (25 juillet 2026). Avant de commencer, lister ce qui part :
`git log --oneline 8cbe512..origin/main`. Au 21 octobre : phase 1 et phase 2 entières, dont :
- hachage des mots de passe opérateurs (`act-hachage`) ;
- transitions atomiques, unicité de l'argent, grand livre, dette en espèces, devis figé ;
- dispatch par vagues (livré en `legacy`), KYC, types de véhicules, suivi des erreurs ;
- correctifs du banc pilote ;
- « Kasi Pro » et le paramétrage de Dakar.

**Migrations** : la référence, à marquer seulement, puis 7 migrations, toutes additives.

| Migration | Lot |
|---|---|
| `Baseline1790629154960` | `p1-migrations` : **marquée, jamais exécutée** |
| `MoneyIdempotencyKey1790647094992` | `p1-unicite` |
| `LedgerTables1792421211893` | `p2-argent` I2 : impose l'ordre du §4 (API arrêtées, `ledger-open`) |
| `MoneyPolicy1792434023914` | `p2-argent` I3 |
| `FareQuote1792452456288` | `p2-argent` I4 |
| `DispatchAttempt1792471583975` | `p2-dispatch` |
| `DriverDocuments1792479894071` | `p2-kyc` |
| `VehicleTypes1792493301332` | `p2-vehicules` |

**Variables nouvelles** dans `/opt/kasi/.env`. Valeurs du jour J :

| Variable | Valeur au jour J | Pourquoi |
|---|---|---|
| `LEDGER_MODE` | absente (= `shadow`) | Bascule en `strict` après deux semaines de `ledger-check` sans écart |
| `DISPATCH_MODE` | `legacy` | Bascule en `waves` après les essais sur téléphone (§6) |
| `KYC_SMS_ENABLED` | `false` | `true` une fois le fournisseur SMS de production validé |
| `SENTRY_DSN_*`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` | vides | Rien n'est envoyé tant que les 4 décisions de `docs/fiche-suivi-des-erreurs.md` §6 ne sont pas prises |

## 2. Répétition sur une copie de la production (J-7, en local)

Exigée par la décision du 19 octobre : toute la suite des migrations est d'abord rejouée sur une
copie de la production.

1. Sur le VPS : `docker exec kasi-postgres sh -c 'pg_dump -U kasi -Fc kasi' > /root/backups/kasi_repetition_$(date +%F).dump`,
   puis rapatrier le fichier hors dépôt (`Kasi-ressources/vps/`).
2. En local, dans une base **séparée** (`kasi_copie_prod`, jamais `kasi`, qui sert au mémoire) :
   restaurer, puis lancer les commandes du §4 (étapes 4 à 8) avec `DB_NAME=kasi_copie_prod`.
3. Résultats attendus, à noter ici avant le jour J :
   - `show` : référence et 7 migrations en attente ;
   - `mark-baseline`, puis `run` : 7 migrations appliquées, code de sortie 0 ;
   - `ledger-open`, puis `ledger-check` : aucun écart ;
   - `check` : schéma conforme aux entités ;
   - script de paramétrage de Dakar : voir le §4, étape 9.
4. Démarrer une stack locale sur cette copie et faire une course complète, depuis l'émulateur ou
   le téléphone.

Un écart à cette étape bloque le jour J.

## 3. Prérequis du jour J

- [ ] Répétition du §2 réussie, sorties notées.
- [ ] Yessal traité (§0), ou son état connu et accepté.
- [ ] Créneau creux choisi : coupure d'environ 5 minutes pendant les migrations.
- [ ] Apps prêtes : `driver-app` (nom affiché « Kasi Pro ») et `rider-app`, en release signée
      avec le keystore Kasi, pointées vers `kasigroupe.tech`. Les apps déjà installées restent
      compatibles (contrats vérifiés lot par lot) : la nouvelle version n'est pas un
      préalable à la mise en production.
- [ ] Un téléphone Kasiman et un téléphone client pour les essais du §6.
- [ ] Les valeurs du §1 ajoutées à `/opt/kasi/.env`.

## 4. Jour J : commandes sur le VPS

Toutes depuis `/opt/kasi`, en une seule session SSH. **S'arrêter à la première sortie
inattendue.**

```sh
cd /opt/kasi
# 1. État de départ
git log -1 --oneline                      # attendu : 8cbe512
docker compose ps

# 2. Sauvegardes : base, configuration nginx Yessal, surcouche TLS, configuration des API
mkdir -p /root/backups
docker exec kasi-postgres sh -c 'pg_dump -U kasi -Fc kasi' > /root/backups/kasi_avant_phase3_$(date +%F_%H%M).dump
docker exec kasi-postgres sh -c 'pg_dump -U kasi --schema-only kasi' > /root/backups/kasi_schema_avant_phase3.sql
docker cp kasi-nginx:/etc/nginx/conf.d/yessal-demo.conf /root/backups/yessal-demo.conf 2>/dev/null || echo "pas de conf Yessal dans le conteneur"
cp docker-compose.override.yml .env /root/backups/
tar czf /root/backups/config_$(date +%F).tgz config
ls -la /root/backups/                     # le .dump doit peser plusieurs Mo
# Compteurs témoins
docker exec kasi-postgres sh -c 'psql -U kasi -d kasi -Atc "select (select count(*) from request),(select count(*) from driver),(select count(*) from rider),(select count(*) from operator),(select coalesce(sum(amount),0) from driver_wallet),(select coalesce(sum(amount),0) from rider_wallet)"'

# 3. Code et images : les conteneurs en service ne bougent pas encore
git pull
docker compose build

# 4. Lecture seule
docker compose run --rm --no-deps migrate node migrate.js show
#   attendu : [ ] Baseline1790629154960 puis 7 migrations en attente

# 5. Marquer la référence (crée la table migrations, une ligne)
docker compose run --rm --no-deps migrate node migrate.js mark-baseline
#   attendu : Baseline1790629154960 enregistree comme appliquee, NON executee

# 6. Arrêt des trois API : plus aucun mouvement d'argent (grand livre, §7 bis)
docker compose stop admin-api driver-api rider-api

# 7. Migrations (une seule transaction)
docker compose run --rm --no-deps migrate
#   attendu : 7 migrations appliquees, code de sortie 0 ; sinon S'ARRÊTER (§5)

# 8. Grand livre, puis contrôle du schéma
docker compose run --rm --no-deps migrate node migrate.js ledger-open
docker compose run --rm --no-deps migrate node migrate.js ledger-check
#   attendu : "N ouvert(s)", puis "aucun ecart" ; sinon NE PAS démarrer les API (§5)
docker compose run --rm --no-deps migrate node migrate.js check
#   attendu : schema conforme aux entites

# 9. Paramétrage de Dakar. Relire d'abord les régions et services réels :
docker exec kasi-postgres psql -U kasi -d kasi -c 'select id, name, enabled from region; select id, title, "deletedAt" from service;'
#   puis jouer tools/parametrage/dakar.sql (commande en tête du script, avec python3 sur le
#   VPS), ou saisir les mêmes
#   valeurs par le panel si les noms diffèrent du jeu de démo (fiche-parametrage-dakar.md §5)

# 10. Démarrage, sans recréer nginx
docker compose up -d --no-deps admin-api driver-api rider-api admin-panel
docker compose restart nginx

# 11. Vérifications
docker compose ps -a                      # migrate : Exited (0) ; API et panel : Up
docker compose logs admin-api driver-api rider-api | grep -iE "Migrations|Monitoring"
#   attendu : schéma à jour, « suivi des erreurs inactif » x3
curl -s -X POST http://127.0.0.1:3000/graphql -H 'content-type: application/json' -d '{"query":"{ login(userName: \"verif-inexistant\", password: \"x\") { token } }"}'
#   attendu : "Invalid Credentials", sans "stacktrace"
curl -s -X POST http://127.0.0.1:3001/graphql -H 'content-type: application/json' -d '{"query":"query F($i: CalculateFareInput!){ getFare(input:$i){ services { services { name cost } } } }","variables":{"i":{"points":[{"lat":14.7080,"lng":-17.4750},{"lat":14.6681,"lng":-17.4380}]}}}'
#   attendu : un prix arrondi à 50 FCFA par service (Mermoz → Plateau)
curl -sI https://kasigroupe.tech/ | head -1          # attendu : 200
curl -sI https://yessal.kasigroupe.tech/ | head -1   # Yessal toujours servi
# Compteurs : mêmes valeurs qu'à l'étape 2, hors activité entre-temps
```

Puis connexion au panel avec un compte opérateur. Le mot de passe est haché à cette première
connexion (`act-hachage`).

## 5. Retour arrière

| Échec | État | Action |
|---|---|---|
| Étapes 3 à 5 | Rien de métier modifié, anciennes API en service | `git checkout 8cbe512` ; ne pas lancer `up -d` avec les nouvelles images |
| Étape 7 (migration) | Transaction annulée, API arrêtées | `docker compose logs migrate` ; `git checkout 8cbe512 && docker compose build && docker compose up -d --remove-orphans && docker compose restart nginx` (l'ancien code ignore la table `migrations`) |
| Étape 8 (écart du grand livre) | Tables créées, API arrêtées | Ne pas démarrer. Lire les lignes `[PROJECTION]` et `[UNLINKED_LINE]`. Restaurer le dump de l'étape 2 (`pg_restore --clean`), puis repartir sur `8cbe512` |
| Après l'étape 10 | Nouvelles API en service | Défaut fonctionnel : corriger en avant si possible. Sinon, restaurer le dump et redéployer `8cbe512` (les écritures faites depuis seront perdues) |
| Yessal ne répond plus | | `docker cp /root/backups/yessal-demo.conf kasi-nginx:/etc/nginx/conf.d/ && docker exec kasi-nginx nginx -s reload` |

## 6. Après la mise en production : essais sur téléphone réel

Dans l'ordre, avec un téléphone Kasiman (« Kasi Pro ») et un téléphone client :

1. Connexion des deux apps, carte, position du Kasiman.
2. Course en espèces, en `legacy` : commande, acceptation, arrivée, démarrage, fin, encaissement.
   Puis une livraison Kasi Moto.
3. Coupure du réseau du Kasiman pendant une offre, puis retour : l'offre revient (`p1-resync`).
   Annulation par le client pendant que l'app Kasiman est en arrière-plan : retour à l'accueil
   (`bug-rafraichissement`).
4. Relevé du Kasiman et dette espèces visibles ; `ledger-check` sans écart.
5. Envoi d'un document dans « Mes documents » et validation depuis le panel (`p2-kyc`).
6. **Bascule `waves`** : `DISPATCH_MODE=waves` dans `.env`, puis
   `docker compose up -d --no-deps admin-api driver-api rider-api`. Refaire les essais 2 et 3 :
   les vagues sont de 1, 2, puis 3 km.
7. Crashlytics : un événement visible dans la console Firebase.

Chaque essai réussi fait passer les points du référentiel concernés à « Fait ».

## 7. Les jours suivants

- `ledger-check` chaque jour, puis `LEDGER_MODE=strict` après deux semaines sans écart.
- Suivi des erreurs : déployer GlitchTip (ou Sentry) une fois les 4 décisions prises, puis
  renseigner les `SENTRY_DSN_*`.
- `KYC_SMS_ENABLED=true` une fois le fournisseur SMS validé, avec un SMS de test depuis le panel.
- Début du pilote : recrutement des Kasimen (`p3-kasimen`) et tableau de suivi (`p3-mesures`).
