/**
 * Prepare la base de test une fois par execution : creation si absente, puis
 * migrations (la meme liste que le service compose `migrate`). Le schema de test
 * est donc exactement celui que les migrations produisent en production.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { configureTestEnv } from './env';
import { allEntities } from '../../libs/database/src/lib/migration/all-entities';
import {
  kasiConnectionOptions,
  MIGRATIONS_TABLE_NAME,
} from '../../libs/database/src/lib/migration/connection-options';
import { kasiMigrations } from '../../libs/database/src/lib/migration/index';

export default async function globalSetup(): Promise<void> {
  configureTestEnv();
  const options = kasiConnectionOptions();
  const admin = new DataSource({ ...options, database: 'postgres', logging: false });
  await admin.initialize();
  try {
    const rows: unknown[] = await admin.query(
      'SELECT 1 FROM pg_catalog.pg_database WHERE datname = $1',
      [options.database],
    );
    if (rows.length === 0) {
      console.log(`\n[integration] creation de la base ${options.database}`);
      await admin.query(`CREATE DATABASE "${options.database}"`);
    }
  } finally {
    await admin.destroy();
  }
  const ds = new DataSource({
    ...options,
    entities: allEntities,
    migrations: kasiMigrations,
    migrationsTableName: MIGRATIONS_TABLE_NAME,
    synchronize: false,
    migrationsRun: false,
    logging: ['error'],
  });
  await ds.initialize();
  try {
    const done = await ds.runMigrations({ transaction: 'all' });
    console.log(
      `\n[integration] base ${options.host}:${options.port}/${options.database} : ` +
        (done.length === 0
          ? 'migrations a jour'
          : `${done.length} migration(s) appliquee(s) (${done.map((m) => m.name).join(', ')})`),
    );
  } finally {
    await ds.destroy();
  }
}
