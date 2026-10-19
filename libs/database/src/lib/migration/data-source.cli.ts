/**
 * DataSource de la CLI TypeORM (poste de developpement uniquement, via ts-node).
 * Utilisee par `npm run migration:generate` / `migration:create` /
 * `migration:check`. Voir docs/migrations-base-de-donnees.md.
 *
 * En conteneur, c'est `migrate.js` (bundle webpack d'admin-api) qui execute les
 * migrations, avec exactement les memes entites et la meme liste.
 */
import 'reflect-metadata';
import { readdirSync } from 'fs';
import { join } from 'path';
import { DataSource, getMetadataArgsStorage } from 'typeorm';

import { allEntities } from './all-entities';
import { kasiConnectionOptions, MIGRATIONS_TABLE_NAME } from './connection-options';
import { kasiMigrations } from './index';

// Garde-fou : charge tous les fichiers du dossier entities/ et verifie que
// chaque classe @Entity qu'ils declarent figure dans `allEntities`. Sans cela,
// une nouvelle entite oubliee dans la liste n'aurait jamais de table, sans
// aucun message.
const entitiesDir = join(__dirname, '..', 'entities');
for (const file of readdirSync(entitiesDir)) {
  if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) {
    require(join(entitiesDir, file));
  }
}
const known = new Set<unknown>(allEntities);
const missing = getMetadataArgsStorage()
  .tables.filter((t) => t.type === 'regular' && typeof t.target === 'function')
  .filter((t) => !known.has(t.target))
  .map((t) => (t.target as { name: string }).name);
if (missing.length > 0) {
  throw new Error(
    `Entites declarees mais absentes de allEntities (libs/database/src/lib/migration/all-entities.ts) : ${missing.join(', ')}`,
  );
}

export default new DataSource({
  ...kasiConnectionOptions(),
  entities: allEntities,
  migrations: kasiMigrations,
  migrationsTableName: MIGRATIONS_TABLE_NAME,
  synchronize: false,
  migrationsRun: false,
  logging: ['error'],
});
