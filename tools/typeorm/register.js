/**
 * Prechargement (`node -r`) des commandes de migration lancees sur le poste de
 * developpement (scripts npm `migration:*`). Voir docs/migrations-base-de-donnees.md.
 *
 * 1. Charge `.env` a la racine du monorepo SANS ecraser les variables deja
 *    exportees dans le shell (elles gagnent toujours).
 * 2. `.env` decrit la stack Docker : DB_HOST=postgres (nom de service, injoignable
 *    depuis l'hote). Dans ce cas seulement, on vise le port publie par
 *    docker-compose.yml (127.0.0.1:5433) et on le dit.
 * 3. Enregistre ts-node (CommonJS, verification de types complete pour que les
 *    metadonnees de decorateurs soient identiques a celles du build webpack)
 *    et les alias de chemins de tsconfig.base.json.
 */
const path = require('path');
const root = path.resolve(__dirname, '..', '..');

require('dotenv').config({ path: path.join(root, '.env'), quiet: true });

if (process.env.DB_HOST === 'postgres') {
  process.env.DB_HOST = '127.0.0.1';
  process.env.DB_PORT = process.env.DB_HOST_PORT || '5433';
  console.log(
    `[migrations] DB_HOST=postgres (nom de service Docker) -> 127.0.0.1:${process.env.DB_PORT} (port publie par docker-compose.yml). Base : ${process.env.DB_NAME || 'kasi'}`,
  );
}

require('ts-node').register({
  project: path.join(root, 'tsconfig.base.json'),
  compilerOptions: { module: 'commonjs', target: 'es2021' },
  // PAS de transpileOnly : en compilation isolee, un champ type par une enum
  // importee recoit `design:type = Object` et TypeORM refuse l'entite
  // (constate sur RiderEntity.documentType). Compter ~2 min par commande.
  transpileOnly: false,
});
require('tsconfig-paths').register({
  baseUrl: root,
  paths: require(path.join(root, 'tsconfig.base.json')).compilerOptions.paths,
});
