# Fiche de cadrage : déploiement groupé en production

Points du référentiel : `p1-migrations` (migration de référence appliquée en production), qui
entraîne tout ce qui a été committé depuis ; `socle-deploiement`. Lots embarqués : voir §2.
Fiche rédigée par la session principale le 23 octobre 2026, **sans aucune commande exécutée en
production** : tout ce qui touche le VPS est décrit ici pour être joué par l'utilisateur.
Statut : **à valider par l'utilisateur** (§8).

Le détail des gestes de migration existe déjà et n'est pas recopié :
`docs/migrations-base-de-donnees.md` §6 (mise en place), §7 (déploiements suivants), §7 bis
(grand livre). Cette fiche dit **quoi** part, **dans quel ordre**, **comment le répéter** et
**comment revenir en arrière**.

## 1. Point de départ

| | Production | Prêt à partir |
|---|---|---|
| Code | `8cbe512` (25 juillet 2026) | `main` à `dbef451`, arbre propre, **2 commits non poussés** |
| Écart | | 23 commits, 443 fichiers |
| Table `migrations` | absente | baseline + 7 migrations |
| Images | `kasi-local/*:latest`, construites sur le VPS | à construire sur le VPS |
| Apps installées | rider-app et driver-app de juillet, pointées sur la prod | nouvelles versions à construire |

Le déploiement se fait **en SSH**, à la main (`p1-staging` et Dokploy restent bloqués). Les
images se construisent sur le VPS (2 vCPU, 8 Go) : compter un long `build`, à lancer **avant**
la fenêtre de coupure, pendant que l'ancienne version sert.

## 2. Ce qui part

### Fonctionnel (lots du référentiel)

| Point | Contenu | Activé au déploiement ? |
|---|---|---|
| `p1-transitions`, `p1-unicite`, `p1-resync`, `p1-tests` | Transitions atomiques et rejouables, clés d'unicité sur l'argent, resynchronisation des offres | Oui |
| Hachage scrypt des mots de passe opérateurs | Migration transparente à la connexion | Oui |
| `p1-sentry` | SDK Sentry dans les 3 API | Inerte tant que `SENTRY_DSN_*` est vide |
| `p2-argent` I1 à I4 | Correctifs d'argent, grand livre, dette espèces et plafond, devis figé | Oui ; grand livre en `shadow` |
| `p2-dispatch` D1 à D7 | Dispatch par vagues, demande non servie | **Non** : `DISPATCH_MODE=legacy` (§6) |
| `p2-kyc` K1 à K4 | Documents typés, expiration, validation au panel | Oui ; SMS coupés (`KYC_SMS_ENABLED=false`) |
| `p2-vehicules` | Type de véhicule du Kasiman et du service | Oui ; aucun effet tant que les services n'ont pas de type (§4) |
| `p3-mesures` M1 à M4 | Écran Pilote, export, motifs d'annulation | Oui |
| `bug-timeout`, `bug-rafraichissement`, `socle-securite` | Côté API : piles d'appels masquées | Oui |
| Nom « Kasi Pro » (`d-nom-app`) | Apps seulement | Avec les nouvelles apps |

### Schéma : 7 migrations après la baseline

| Migration | Nature | Écrit des données ? | `down` |
|---|---|---|---|
| `MoneyIdempotencyKey` | 4 colonnes nullables, 4 index uniques | Non (index sur colonnes vides) | Oui |
| `LedgerTables` | 3 tables, déclencheurs d'immuabilité, colonne `ledgerEntryId` | Non (puis `ledger-open`, §5) | Oui, grand livre perdu |
| `MoneyPolicy` | Table, **plafond XOF 10 000 / alerte 7 500** | 1 ligne | Oui |
| `FareQuote` | Table des devis, `request.quoteId` | Non | Oui |
| `DispatchAttempt` | 2 tables (sollicitations, demande non servie) | Non | Oui |
| `DriverDocuments` | 2 tables, catalogue de 5 documents types | 5 lignes | Oui |
| `VehicleTypes` | Colonnes `vehicleType` (Kasiman, véhicule) et `vehicleTypes` (service) | Reprise `driver ← car` | Oui |

Toutes sont additives : **l'ancien code (`8cbe512`) tourne sur le schéma migré**. C'est ce qui
rend possible le retour arrière du code sans restauration (§7), et c'est à prouver pendant la
répétition (§3, étape 5).

### Configuration

- `docker-compose.yml` : service ponctuel `migrate`, dont les API attendent la réussite ;
  rotation des journaux (10 Mo × 5) ; variables `LEDGER_MODE`, `DISPATCH_MODE`, `SENTRY_*`,
  `KYC_SMS_ENABLED`. Les valeurs par défaut conviennent : **aucune ligne nouvelle n'est
  obligatoire dans `/opt/kasi/.env`**.
- `.nginx` : `X-Forwarded-Proto` et IP réelle derrière un proxy amont. Sans proxy (cas de la
  prod), le comportement est inchangé.
- `/opt/kasi/docker-compose.override.yml` (TLS, non versionné) : à relire contre le nouveau
  compose (§3, étape 1).

### Contrat avec les apps installées (vérifié dans les schémas versionnés)

- rider-api : seuls changements, `cancelOrder` et `cancelBooking` reçoivent un argument
  facultatif ; tout le reste est ajout.
- driver-api : ajouts seulement, dont deux énumérations **nouvelles** (`DriverDocumentStatus`,
  `VehicleType`). Aucune valeur ajoutée à une énumération existante (`OrderStatus`,
  `RequestActivityType`…).
- `createOrder` sans `quoteId` (apps de juillet) : le serveur retrouve le devis affiché pendant
  10 minutes, sinon il le recalcule (couvert par le banc).
- Limite : ces schémas sont des instantanés versionnés ; la répétition (§3) le confirme contre
  les API construites.

## 3. Répétition sur une copie de la production (avant toute fenêtre)

Décision du 19 octobre : toute la suite des migrations se rejoue d'abord sur une copie de la
prod. Sur le poste, dans une base séparée (`kasi_prod_copie`), jamais dans `kasi` (jeu du
mémoire) ni `kasi_test`.

1. **Relevé en lecture seule sur le VPS** (par l'utilisateur) : `git log -1`, `docker compose ps`,
   `df -h` et `docker system df` (place pour 4 images neuves), contenu de
   `docker-compose.override.yml`, et **où vit la configuration Yessal posée à la main dans
   `kasi-nginx`** : si elle est dans le conteneur et non dans un volume, la recréation de nginx
   l'efface (Yessal coupé). Renouvellement TLS prévu vers le 7 novembre : déployer avant ou
   après, pas le même jour.
2. **Copie** : `pg_dump -Fc` de la prod (le §6 du runbook le fait déjà), rapatrié sur le poste,
   restauré dans `kasi_prod_copie`.
3. **Conformité de départ** : schéma de la copie comparé à une base neuve créée par la baseline
   seule (`pg_dump --schema-only` des deux, diff). Attendu : identique, comme constaté le
   28 septembre. Le `migrate.js check` du runbook §6 n'est plus utilisable tel quel : avec 7
   migrations en attente, il signale forcément des écarts.
4. **Suite complète** sur la copie : `mark-baseline`, `run` (7 migrations), `ledger-open`,
   `ledger-check` (zéro écart), puis `check` (zéro écart). Noter la durée de chaque étape : elle
   fixe la fenêtre.
5. **Ancien code sur schéma migré** : images `8cbe512` contre la copie migrée ; connexion
   opérateur, `getFare`, `createOrder` par une app de juillet. Si ça casse, le retour arrière du
   code seul (§7, cas C) est exclu, il ne reste que la restauration.
6. **Questions de données**, à lire sur la copie :
   - Kasimen dont la dette dépasse 10 000 FCFA, donc **bloqués dès le déploiement** par le
     plafond ; s'il y en a, décider avant (relever le plafond dans `money_policy`, ou les prévenir) ;
   - portefeuilles en double (fusionnés à l'ouverture du grand livre) et montant de
     `KASI:ARRONDIS` ;
   - Kasimen dont la reprise `vehicleType ← car` a échoué (sans conséquence tant que les services
     n'ont pas de type, §4) ;
   - contenu de `order_cancel_reason` en prod (sans doute les libellés Ridy en anglais) ;
   - comptes réels ou de test : y a-t-il des clients et des Kasimen réels sur la prod ?
7. Banc d'intégration complet au vert sur le commit déployé (et l'instabilité « kind » levée
   ou expliquée).

## 4. Contenus et réglages à préparer

| Quoi | Quand | Par qui |
|---|---|---|
| Catalogue des motifs d'annulation (fiche des motifs §3) | Juste après le déploiement, au panel | Opérateur |
| Catalogue KYC (5 documents types) | Inséré par la migration ; à relire au panel | Opérateur |
| Plafond de dette (10 000 / 7 500 XOF) | Valeur de la migration ; à confirmer (§3.6) | Équipe produit |
| Paramétrage de Dakar (`tools/parametrage/dakar.sql` : région unique, types de véhicule des services, arrondi) | **Pas au déploiement** : au début de la phase 3, après validation des tarifs par l'équipe produit (`p2-parametrage`, `act-dakar`) | Session principale, puis utilisateur |
| Taux de commission de lancement (fourchette validée : 10 à 18 %) | Avec le paramétrage | Équipe produit |
| `SENTRY_DSN_*` | Après les 4 décisions de `p1-sentry` et l'installation de GlitchTip | Utilisateur |

## 5. Ordre de la fenêtre (production, joué par l'utilisateur)

Fenêtre à une heure creuse ; **API arrêtées une à deux minutes** (étapes 6 à 8). Les gestes
détaillés sont ceux du runbook ; l'enchaînement ci-dessous les combine, puisque §6 et §7 bis
partent ensemble.

| # | Étape | Les API servent ? | Si ça échoue |
|---|---|---|---|
| 1 | Poussée de `main` sur GitHub, étiquette `deploy-2026-xx-xx` (poste) | Oui | Rien à défaire |
| 2 | Sauvegarde `pg_dump -Fc` + compteurs témoins (runbook §6, étape 1) | Oui | Ne pas continuer sans dump non vide |
| 3 | **Étiquetage des images en service** : `docker tag <registre>/<image>:latest <registre>/<image>:8cbe512` pour les 4 images (noms exacts : `docker compose images` ; `kasi-local` sauf si `IMAGE_REGISTRY` est posé dans `.env`). Le compose de `8cbe512` lit déjà `IMAGE_TAG` | Oui | — |
| 4 | `git fetch && git checkout <étiquette>`, `docker compose build` (long) | Oui, anciennes images | Revenir à `8cbe512` ; rien n'a bougé |
| 5 | `migrate.js show`, puis `mark-baseline`, puis `show` (attendu : 7 en attente) | Oui | Cas A (§7) |
| 6 | `docker compose stop admin-api driver-api rider-api` | **Non** | Cas B |
| 7 | `docker compose run --rm --no-deps migrate` (7 migrations) | Non | Cas B |
| 8 | `migrate.js ledger-open`, puis `ledger-check` (code 0) | Non | Cas B |
| 9 | `docker compose up -d && docker compose restart nginx` | Oui, nouvelles | Cas C |
| 10 | Vérifications (runbook §6, étape 6) ; panel (Pilote, documents KYC, répartiteur) ; `getFare` ; une app de juillet : connexion, commande, annulation | Oui | Cas C |
| 11 | Catalogue des motifs saisi au panel (§4) | Oui | — |

Les jours suivants : `ledger-check` quotidien (aussi journalisé par admin-api), journaux des API.

## 6. Après la fenêtre

1. **Apps mobiles** : construire rider-app et driver-app (« Kasi Pro ») contre la prod
   (`KASI_SERVER_URL` de prod), les valider sur **téléphone réel** (motifs, KYC, devis, commande
   défensive), puis les distribuer. Le serveur est déjà prêt pour elles et accepte encore celles
   de juillet.
2. **Bascule `DISPATCH_MODE=waves`** : quand tous les Kasimen ont la nouvelle driver-app, et
   avant le premier Kasiman du pilote (sinon le taux d'acceptation n'est pas mesurable). Retour :
   retirer la ligne, `up -d`.
3. **Bascule `LEDGER_MODE=strict`** : après deux semaines de `ledger-check` à zéro écart.
4. GlitchTip et DSN (`p1-sentry`), SMS KYC (`KYC_SMS_ENABLED=true` une fois le fournisseur
   validé).

## 7. Retour arrière

| Cas | Situation | Retour |
|---|---|---|
| **A** | Échec avant l'arrêt des API (étapes 4-5) | Rien n'a changé, sauf peut-être la table `migrations` (ignorée par l'ancien code). Les conteneurs en service tournent toujours sur les anciennes images. `git checkout 8cbe512`, ne pas lancer `up -d`. |
| **B** | Échec pendant l'arrêt (étapes 6-8) | Les anciens conteneurs sont **arrêtés, pas supprimés** : ils gardent l'ancienne image. Restaurer le dump (`pg_restore --clean --if-exists`, runbook §6), puis `docker compose start admin-api driver-api rider-api`. Aucune donnée métier n'a pu être écrite (API arrêtées). |
| **C** | Défaut après `up -d` (étapes 9-10, ou dans les heures qui suivent) | **Code seulement**, schéma gardé : `git checkout 8cbe512`, `IMAGE_TAG=8cbe512 docker compose up -d --remove-orphans`, `restart nginx`. Possible parce que les migrations sont additives (à prouver en §3.5). Les écritures faites entre-temps restent ; le grand livre prend du retard (écarts au `ledger-check`, sans effet en `shadow`). Restaurer le dump seulement si des données sont abîmées : on perd alors tout ce qui a été écrit depuis l'étape 2. |
| **D** | Défaut découvert après plusieurs jours | Correctif en avant, pas de retour : les données du pilote comptent plus que la version. |

`migrate.js revert` existe pour chaque migration, mais en sens inverse et une par une : on lui
préfère la restauration (cas B) ou le retour du code seul (cas C).

## 8. À décider avant de planifier la fenêtre

1. **Date et heure** de la fenêtre, et qui la joue (l'utilisateur, en SSH).
2. **Y a-t-il des utilisateurs réels en prod** (clients, Kasimen), à prévenir de la coupure ?
3. **Plafond de dette** : garder 10 000 / 7 500 XOF dès le déploiement, ou le relever le temps de
   prévenir les Kasimen concernés (§3.6).
4. **Distribution des nouvelles apps** : stores (délai de revue) ou installation directe pour le
   pilote.
5. Accord pour que la session principale prépare la répétition (§3, étapes 2 à 7) une fois le
   dump rapatrié par l'utilisateur.
