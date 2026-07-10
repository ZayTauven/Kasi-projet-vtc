# Connexion pgAdmin4 a l instance PostgreSQL Dockerisee

## Prerequis

- pgAdmin4 installe sur Windows (deja present sur la machine)
- Le conteneur `kasi-postgres` en cours d execution : `docker compose up postgres -d`

## Creer un serveur dans pgAdmin4

1. Ouvrir pgAdmin4 et aller dans **Object > Register > Server...**
2. Onglet **General** : Name = `Kasi Dev`
3. Onglet **Connection** :
   - Host name/address : `localhost`
   - Port : `5432`
   - Maintenance database : valeur de `DB_NAME` dans votre `.env` (ex: `kasi`)
   - Username : valeur de `DB_USER` (ex: `kasi`)
   - Password : valeur de `DB_PASS`
4. Cliquer **Save** — pgAdmin4 se connecte au conteneur via le port expose.

## Verifier que PostGIS est active

L image `postgis/postgis:16-3.4` cree automatiquement l extension PostGIS
sur la base `POSTGRES_DB` au premier demarrage via le script d initialisation
embarque. Pour le confirmer, ouvrir l outil Query Tool et executer :

```sql
SELECT postgis_full_version();
```

Si la requete echoue, activer manuellement l extension :

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

## Reinitialiser les donnees (dev)

Pour repartir d une base vierge :

```bash
docker compose down -v   # supprime le volume postgres-data
docker compose up postgres -d
```
