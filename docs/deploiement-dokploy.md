# Déploiement Kasi avec Dokploy

Runbook de la chaîne d'intégration et de déploiement Kasi, du poste de dev à la
production. Remplace le déploiement SSH manuel documenté dans
`KASI_DECISIONS.md` (`git pull && docker compose build && docker compose up -d`).

---

## 1. Pourquoi Dokploy

Le déploiement actuel fonctionne, mais il a quatre trous :

| Trou | Aujourd'hui | Avec Dokploy |
|---|---|---|
| Déclenchement | SSH manuel, à la main, depuis le poste | webhook GitHub au push |
| TLS | certbot standalone + `certbot.timer` + `docker-compose.override.yml` non versionné | Traefik, renouvellement automatique |
| Retour arrière | aucun — `git pull` ne va que vers l'avant | redéploiement d'un commit antérieur en un clic |
| Visibilité | `docker logs` en SSH | logs, terminal et état par service dans l'UI |

Surtout : **Dokploy clone et construit sur le serveur lui-même**. Aucune minute
GitHub Actions n'est consommée, donc le verrou de facturation qui bloquait
[ci.yml](../.github/workflows/ci.yml) et
[deploy.yml](../.github/workflows/deploy.yml) devient hors sujet.
Dokploy n'a besoin que d'un accès **lecture** au dépôt.

### Ce que Dokploy ne règle pas

À savoir avant de s'engager, pour ne pas se croire couvert :

- **La lenteur du build.** Le VPS a 2 vCPU et le build Angular tourne avec
  `--max-old-space-size=4096`. Dokploy ne l'accélère pas, il l'affiche. Prévoir
  du swap sur le VPS avant la bascule.
- **La dérive de schéma en production.** Le projet n'a aucune migration TypeORM
  et `synchronize` ne s'active jamais sur une base peuplée (procédure de secours
  `FORCE_SYNC_DB`). Une chaîne de déploiement propre livre du code plus vite,
  pas un schéma à jour. Chantier applicatif distinct, non couvert ici.
- **Les sauvegardes.** Dokploy sait planifier des dumps vers un bucket
  S3-compatible, mais rien n'est configuré tant qu'on ne le fait pas. La base de
  production n'a aujourd'hui **aucune sauvegarde automatisée**.
- **Les applications Flutter.** `driver-app` et `rider-app` restent construites
  et publiées à la main, hors de cette chaîne.

---

## 2. Architecture cible

```
                  GitHub — ZayTauven/Kasi-projet-vtc
                            │  push sur main / develop
                            ▼  (webhook, aucun runner)
   ┌──────────────────────────────────────────────────────────────┐
   │  VPS Hostinger — Dokploy                                     │
   │                                                              │
   │   Traefik  :80 / :443   ← TLS Let's Encrypt automatique      │
   │      │                                                       │
   │      │  dokploy-network                                      │
   │      ▼                                                       │
   │   nginx :80  ← SEUL service de la stack exposé à Traefik     │
   │      │                                                       │
   │      │  kasi-net (bridge isolé, aucune sortie)               │
   │      ├── /            → admin-panel:80                       │
   │      ├── /admin-api/  → admin-api:3000                       │
   │      ├── /driver-api/ → driver-api:3002                      │
   │      ├── /rider-api/  → rider-api:3001                       │
   │      │                                                       │
   │      └── postgres (PostGIS) · redis                          │
   └──────────────────────────────────────────────────────────────┘
```

**Décision structurante : `kasi-nginx` est conservé, Traefik ne fait que le TLS
et le routage du domaine.** Le routage applicatif reste dans
[.nginx/kasi-locations.conf](../.nginx/kasi-locations.conf).

C'est délibéré. Ce fichier fait bien plus que du routage par préfixe : upgrade
WebSocket pour les subscriptions GraphQL, réponse CORS préflight avec masquage
des en-têtes émis par NestJS (`proxy_hide_header`, sinon doublons rejetés par
les navigateurs), et surtout le resolver `127.0.0.11` avec upstreams passés en
variable — le correctif du piège d'IP figée qui produisait des 502 après chaque
rebuild. Réécrire tout ça en middlewares Traefik, c'est risquer de casser les
apps mobiles **déjà installées**, qui tapent en dur sur `/driver-api/` et
`/rider-api/`.

Le fichier de déploiement est
[docker-compose.dokploy.yml](../docker-compose.dokploy.yml), distinct de
`docker-compose.yml` qui reste utilisable pour le dev local à la main.

### Différences entre les deux fichiers

| Point | `docker-compose.yml` | `docker-compose.dokploy.yml` | Raison |
|---|---|---|---|
| `container_name` | fixes (`kasi-nginx`…) | absents | noms globaux sur l'hôte : prod et staging entreraient en collision |
| `ports:` | publiés sur l'hôte | aucun | Traefik détient 80/443 ; publier 5433 ou 3000 ferait aussi collisionner les environnements |
| `config/` et `uploads/` | `./config`, `./data/uploads` | `../files/config`, `../files/uploads` | **voir ci-dessous** |
| `image:` GHCR | présent | absent | plus de registre : Dokploy construit sur place |
| Secrets | valeurs par défaut `CHANGEME_*` | `${VAR:?}` obligatoire | échouer bruyamment plutôt que créer une base avec un mot de passe par défaut |
| SSL | `ssl-kasigroupe.conf` + certbot | rien | TLS terminé par Traefik |

### ⚠️ Le piège `../files/`

Dokploy **re-clone le dépôt à chaque déploiement** dans
`/etc/dokploy/compose/<service>/code/`. Un montage `./config` pointerait dans ce
clone. Or `config/` et `data/` sont gitignorés (`.gitignore` lignes 145 et 150) :
ils reviendraient donc **vides à chaque `git push`**, effaçant la clé de service
Firebase, `config.production.json` et l'intégralité des uploads.

`../files/` est le répertoire frère du clone, géré par Dokploy et jamais effacé.
C'est le seul emplacement valide pour les données runtime.

---

## 3. Prérequis

- Un hôte Linux (Ubuntu 24.04 / Debian 12) avec accès root. Dokploy initialise
  Docker Swarm et prend les ports 80, 443 et 3000.
- 2 Go de RAM minimum pour Dokploy seul, **en plus** de la stack Kasi.
- Un accès lecture au dépôt GitHub :
  - **VPS** : application GitHub (auto-déploiement au push) — nécessite que
    l'instance Dokploy soit joignable publiquement pour le webhook.
  - **Local** : pas d'URL publique, donc pas de webhook. Utiliser le fournisseur
    « Git » générique avec une clé SSH de déploiement, et déclencher les
    déploiements à la main.

---

## 4. Étape 1 — Répétition locale

But : valider la stack, les variables et le montage `../files/` **sans toucher
à la production**. La base repart vide, ce qui répète aussi la restauration de
dump nécessaire le jour de la bascule.

Le jeu de données de démo (59 tables peuplées, utilisé pour les captures du
mémoire) vit dans le volume Docker Desktop `app-kasi_postgres-data` et n'est
**pas** visible depuis cette distro : il n'est pas menacé par la répétition.

```powershell
# 1. Distro Linux dédiée (Docker Desktop reste intact, moteur séparé)
wsl --install -d Ubuntu-24.04 --no-launch
```

```bash
# 2. systemd (requis pour que Docker tourne comme un service) et isolation du
#    PATH Windows, qui pollue sinon le PATH de la distro et casse les scripts
wsl -d Ubuntu-24.04 -u root -e bash -c \
  'printf "[boot]\nsystemd=true\n\n[interop]\nappendWindowsPath=false\n" > /etc/wsl.conf'

# --terminate et NON --shutdown : `wsl --shutdown` arrête la machine virtuelle
# WSL entière, donc Docker Desktop et la stack Kasi de développement avec elle.
# `--terminate` ne redémarre que cette distro, ce qui suffit à relire wsl.conf.
wsl --terminate Ubuntu-24.04
wsl -d Ubuntu-24.04 -u root -e bash -c 'ps -p 1 -o comm='   # doit afficher: systemd

# 3. Docker natif DANS la distro — surtout pas l'intégration Docker Desktop,
#    qui renverrait vers le moteur partagé et ferait un swarm init dessus
wsl -d Ubuntu-24.04 -u root -e bash -c \
  'curl -fsSL https://get.docker.com | sh && systemctl enable --now docker'

# 4. Dokploy
wsl -d Ubuntu-24.04 -u root -e bash -c \
  'curl -sSL https://dokploy.com/install.sh | sh'
```

**Conflit de ports — l'installeur échoue tel quel.** Vérifié : l'installation
s'arrête sur `Error: something is already running on port 80`.

La cause n'est pas évidente. WSL2 est en mode NAT (la distro a sa propre eth0
en 172.20.x.x), mais il maintient en plus un relais de loopback qui **reflète
les ports en écoute côté Windows dans la distro**. Depuis Ubuntu, un `ss -tuln`
montre donc `*:80`, `127.0.0.1:3000`, `:3001`, `:3002`, `:8080`, `:5433`,
`:6379` — c'est-à-dire exactement la stack Kasi tournant sur Docker Desktop.
Dokploy réclame 80, 443 et 3000, dont deux sont pris.

Il faut donc mettre la stack manuelle en pause avant d'installer :

```bash
cd app-kasi && docker compose stop     # réversible : docker compose start
```

Les volumes `app-kasi_postgres-data` et `app-kasi_redis-data` survivent : le jeu
de données de démo n'est pas touché.

**Conséquence durable :** sur ce poste, la stack Docker Desktop et la stack
Dokploy ne peuvent pas tourner en même temps — elles se disputent le `:80`. Il
faut arrêter l'une pour lancer l'autre. Sur le VPS le problème ne se pose pas,
il n'y a qu'une stack.

### La distro s'éteint toute seule et casse Dokploy

Symptôme, constaté après l'installation : les services `dokploy` et
`dokploy-postgres` oscillent entre `0/1` et `1/1`, les tâches Swarm échouent en
boucle avec `No such container: dokploy.1.xxx` puis `task: non-zero exit (143)`.

Fausses pistes écartées : pas d'OOM (`dmesg` vide, 6,7 Go libres), modules
noyau tous présents (`vxlan`, `ip_vs`, `br_netfilter`, `overlay`, `nf_tables`),
et `systemctl show docker --property=NRestarts` renvoie **0** — le démon ne
plante donc pas.

La vraie cause : `journalctl -u docker` montre un `Processing signal
'terminated'` suivi de `Stopped docker.service` toutes les 40 à 60 secondes.
**WSL éteint une distro dès qu'aucune session n'y est attachée.** Vérifiable :
attendre une minute sans lancer de commande, puis `wsl -l -v` — `Ubuntu-24.04`
est passée à `Stopped` pendant que `docker-desktop` reste `Running` (Docker
Desktop, lui, maintient sa propre session). Chaque `wsl -d Ubuntu-24.04 ...`
rallume la distro, d'où l'illusion d'un redémarrage cyclique.

Correctif — garder une session ouverte en permanence :

```powershell
Start-Process -WindowStyle Hidden -FilePath wsl.exe `
  -ArgumentList '-d','Ubuntu-24.04','-u','root','--','sleep','infinity'
```

Ce processus ne survit pas à un redémarrage de Windows. Pour un poste sur
lequel la répétition dure plusieurs jours, en faire une tâche planifiée
déclenchée à l'ouverture de session.

**Ce piège est propre à WSL et n'existe pas sur le VPS**, où systemd démarre
`docker.service` au boot sans dépendre d'une session utilisateur. Il n'invalide
donc rien de ce qui sera observé ensuite sur la stack Kasi elle-même.

---

## 5. Étape 2 — Configurer le service dans Dokploy

1. **Projet** → créer `kasi`.
2. **Service** → *Compose*.
3. **Provider** : dépôt `ZayTauven/Kasi-projet-vtc`, branche `main`.
4. **Compose Path** : `./docker-compose.dokploy.yml`.
5. **Environment** : coller le contenu de
   [.env.dokploy.example](../.env.dokploy.example) et renseigner les
   valeurs. `JWT_SECRET` doit reprendre celle de `/opt/kasi/.env` — en générer
   une nouvelle déconnecterait tout le parc mobile installé.
6. **Domains** : service `nginx`, port `80`.
   - local : `kasi.localhost`, HTTPS désactivé ;
   - staging : `staging.kasigroupe.tech`, Let's Encrypt ;
   - production : `kasigroupe.tech`, Let's Encrypt, redirection HTTP→HTTPS.

   Le domaine se déclare **uniquement ici**, jamais en labels dans le compose :
   deux stacks sur le même hôte ne peuvent pas déclarer le même routeur Traefik.
7. **Déployer**, puis déposer la clé de service Firebase et
   `config.production.json` dans `<service>/files/config/` avant de considérer
   la stack fonctionnelle.

---

## 6. Étape 3 — Staging sur `develop`

Second service Dokploy dans le même projet, identique au précédent, avec :

- branche `develop`,
- domaine `staging.kasigroupe.tech`,
- **ses propres** `DB_NAME` / `DB_PASS` / `REDIS_PASSWORD`,
- `MAPBOX_TOKEN` : le même token public convient.

`main` devient alors réservé à la production, et `develop` est la branche
d'intégration. Compter environ 3 Go de RAM par environnement : deux stacks
complètes sur le KVM 2 (8 Go) tiennent, mais un build de staging pendant que la
production sert du trafic saturera les 2 vCPU. Éteindre le staging hors usage,
ou le déporter sur un second VPS.

---

## 7. Étape 4 — Bascule de la production

> ### ⏰ Contrainte de calendrier — anomalie TLS en production
>
> Constaté par inventaire du VPS le 2026-08-31 :
> `/etc/letsencrypt/renewal/kasigroupe.tech.conf` déclare
> `authenticator = standalone` et **aucun `pre_hook` / `post_hook`**. Or
> `kasi-nginx` détient `0.0.0.0:80` en permanence, et certbot standalone a
> besoin de ce port pour répondre au challenge ACME.
>
> Le `certbot.timer` s'exécute deux fois par jour et sort en succès
> aujourd'hui **uniquement parce que le certificat n'est pas encore
> renouvelable** (expiration 2026-10-08, certbot ne tente rien avant J-30).
>
> - **~2026-09-08** : premier vrai essai de renouvellement → échec, port 80 pris.
> - **2026-10-08** : certificat expiré → HTTPS de production hors service.
>
> La bascule vers Traefik supprime structurellement le problème (ACME géré par
> le proxy lui-même, aucune contention de port). Si elle n'est pas faite avant
> le 8 septembre, poser le correctif d'attente :
>
> ```bash
> PRE=/etc/letsencrypt/renewal-hooks/pre/stop-nginx.sh
> POST=/etc/letsencrypt/renewal-hooks/post/start-nginx.sh
> echo '#!/bin/sh'               >  $PRE
> echo 'docker stop kasi-nginx'  >> $PRE
> echo '#!/bin/sh'               >  $POST
> echo 'docker start kasi-nginx' >> $POST
> chmod +x $PRE $POST
> certbot renew --dry-run    # doit passer sans "port 80 already in use"
> ```


À exécuter en fenêtre de maintenance. **Ne pas lancer avant que la répétition
locale soit passée intégralement.**

```bash
# --- Filet de sécurité (AVANT toute autre chose) ---
cd /opt/kasi
docker exec kasi-postgres pg_dump -U kasi -Fc kasi > ~/kasi-avant-dokploy.dump
tar czf ~/kasi-config-uploads.tgz config/ data/uploads/
# rapatrier les deux fichiers hors du VPS

# --- Libérer 80/443 ---
docker compose down
# Le renouvellement TLS passe par un TIMER SYSTEMD sur ce VPS (certbot.timer),
# pas par crontab. certbot y est configure en `authenticator = standalone`,
# donc il exige le :80 : il se battrait avec Traefik.
systemctl disable --now certbot.timer

# --- Installer Dokploy ---
curl -sSL https://dokploy.com/install.sh | sh
```

Puis, dans l'UI : créer le service comme à l'étape 2, déployer, et **avant de
router le domaine** :

```bash
# Restaurer la base dans le nouveau volume
docker exec -i <conteneur-postgres-dokploy> \
  pg_restore -U kasi -d kasi --clean --if-exists < ~/kasi-avant-dokploy.dump
# Restaurer config et uploads
tar xzf ~/kasi-config-uploads.tgz -C /etc/dokploy/compose/<service>/files/
```

Vérifications avant de déclarer la bascule réussie :

- `https://kasigroupe.tech/` sert le panel et la connexion fonctionne ;
- les 3 endpoints `/admin-api|driver-api|rider-api/graphql` répondent ;
- **handshake WebSocket 101** à travers Traefik (les subscriptions GraphQL sont
  le point le plus susceptible de casser sur un changement de proxy) ;
- une course de bout en bout depuis les apps mobiles réelles, pas seulement le
  panel.

### Retour arrière

Tant que l'ancienne stack n'est pas supprimée, le retour arrière tient en :

```bash
docker stop $(docker ps -q --filter name=traefik)
cd /opt/kasi && docker compose up -d
systemctl enable --now certbot.timer
```

D'où la règle : **ne pas faire de `docker compose down -v` ni supprimer
`/opt/kasi` avant plusieurs jours de fonctionnement nominal.** Le `-v`
détruirait le volume `app-kasi_postgres-data`.

### Sécuriser l'UI Dokploy

L'installeur expose le port **3000 publiquement**. Sur un VPS avec une IP
publique, cela laisse un panneau d'administration ouvert sur Internet. Après
l'installation : lui attribuer un domaine avec TLS dans Dokploy, puis fermer le
3000 au pare-feu.

---

## 8. Ce qui disparaît après la bascule

- `docker-compose.override.yml` sur le VPS (non versionné) ;
- [.nginx/ssl-kasigroupe.conf](../.nginx/ssl-kasigroupe.conf) et
  [.nginx/ssl-placeholder.md](../.nginx/ssl-placeholder.md) — TLS
  désormais géré par Traefik ;
- le timer systemd `certbot.timer` et la configuration `standalone` associee ;
- les variables `IMAGE_REGISTRY` / `IMAGE_TAG` de `.env.example`, et les deux
  workflows GitHub Actions, qui deviennent optionnels.

À ne supprimer qu'**après** plusieurs jours de production stable sur Dokploy.
