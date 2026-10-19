/**
 * Executable de migration de Kasi (`p1-migrations`).
 *
 * - En conteneur : bundle webpack `migrate.js` embarque dans l'image admin-api
 *   (entree additionnelle), lance par le service compose `migrate` AVANT les
 *   trois API (`depends_on: service_completed_successfully`).
 * - Sur le poste : `npm run migration:<commande>` (ts-node, voir tools/typeorm).
 *
 * Commandes :
 *   run            applique les migrations en attente (une seule transaction)
 *   show           liste les migrations et leur etat, sans rien ecrire
 *   check          compare le schema reel aux entites ; code 1 si ecart
 *   mark-baseline  base DEJA peuplee : enregistre la migration de reference
 *                  comme appliquee, sans l'executer
 *   revert         annule la derniere migration (jamais la reference)
 *
 * Deux gardes-fous :
 * - un verrou consultatif PostgreSQL : deux executions simultanees (deux
 *   deploiements, un `run` manuel pendant un `up -d`) s'attendent ;
 * - `run` refuse d'executer la reference sur une base qui contient deja le
 *   schema Kasi : il faut d'abord `mark-baseline`.
 *
 * Voir docs/migrations-base-de-donnees.md.
 */
import 'reflect-metadata';
import { DataSource, MigrationExecutor } from 'typeorm';

import { allEntities } from './all-entities';
import { kasiConnectionOptions, MIGRATIONS_TABLE_NAME } from './connection-options';
import { BASELINE_MIGRATION_NAME, kasiMigrations } from './index';
import { BASELINE_TABLES } from './postgres/baseline-tables';

/** Cle arbitraire mais fixe du verrou consultatif des migrations Kasi. */
const MIGRATION_LOCK_KEY = 4815162342;

type Command = 'run' | 'show' | 'check' | 'mark-baseline' | 'revert';
const COMMANDS: Command[] = ['run', 'show', 'check', 'mark-baseline', 'revert'];

function log(message: string): void {
  console.log(`[migrate] ${message}`);
}

async function ensureDatabaseExists(): Promise<void> {
  const options = kasiConnectionOptions();
  const admin = new DataSource({ ...options, database: 'postgres', logging: false });
  await admin.initialize();
  try {
    const rows: unknown[] = await admin.query(
      'SELECT 1 FROM pg_catalog.pg_database WHERE datname = $1',
      [options.database],
    );
    if (rows.length === 0) {
      log(`base "${options.database}" absente : creation`);
      await admin.query(`CREATE DATABASE "${options.database}"`);
    }
  } finally {
    await admin.destroy();
  }
}

async function existingBaselineTables(ds: DataSource): Promise<string[]> {
  const rows: Array<{ table_name: string }> = await ds.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        AND table_name = ANY($1)`,
    [BASELINE_TABLES],
  );
  return rows.map((r) => r.table_name);
}

/**
 * Migrations du code, triees comme TypeORM : par horodatage (13 derniers
 * chiffres du nom). On lit la propriete d'instance `name` (generee par la CLI),
 * jamais le nom de classe, que la minification du bundle peut alterer.
 */
function codeMigrations(ds: DataSource): Array<{ name: string; timestamp: number }> {
  return ds.migrations
    .map((m) => {
      const name = m.name ?? m.constructor.name;
      return { name, timestamp: parseInt(name.slice(-13), 10) };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

async function executedNames(ds: DataSource): Promise<string[]> {
  const executor = new MigrationExecutor(ds);
  return (await executor.getExecutedMigrations()).map((m) => m.name);
}

async function withLock<T>(ds: DataSource, fn: () => Promise<T>): Promise<T> {
  const runner = ds.createQueryRunner();
  await runner.connect();
  try {
    await runner.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    return await fn();
  } finally {
    await runner
      .query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY])
      .catch(() => undefined);
    await runner.release();
  }
}

async function show(ds: DataSource): Promise<number> {
  const executed = await executedNames(ds);
  const all = codeMigrations(ds);
  for (const m of all) {
    log(`${executed.includes(m.name) ? '[X]' : '[ ]'} ${m.name}`);
  }
  for (const name of executed.filter((n) => !all.some((m) => m.name === n))) {
    log(`[?] ${name} (enregistree en base mais inconnue du code)`);
  }
  const pending = all.filter((m) => !executed.includes(m.name)).length;
  log(`${pending} migration(s) en attente`);
  return 0;
}

async function run(ds: DataSource): Promise<number> {
  return withLock(ds, async () => {
    const executed = await executedNames(ds);
    if (!executed.includes(BASELINE_MIGRATION_NAME)) {
      const present = await existingBaselineTables(ds);
      if (present.length > 0) {
        log(
          `REFUS : la base contient deja ${present.length} table(s) du schema Kasi mais la migration de ` +
            `reference ${BASELINE_MIGRATION_NAME} n'y est pas enregistree ; l'executer echouerait.`,
        );
        log('Base existante : lancer une fois `node migrate.js mark-baseline`, puis relancer `run`.');
        return 2;
      }
    }
    const done = await ds.runMigrations({ transaction: 'all' });
    if (done.length === 0) {
      log('aucune migration en attente');
    }
    for (const m of done) {
      log(`appliquee : ${m.name}`);
    }
    return 0;
  });
}

async function check(ds: DataSource): Promise<number> {
  const sql = await ds.driver.createSchemaBuilder().log();
  if (sql.upQueries.length === 0) {
    log('schema conforme aux entites (aucun ecart)');
    return 0;
  }
  log(`${sql.upQueries.length} ecart(s) entre la base et les entites :`);
  for (const q of sql.upQueries) {
    console.log(`  ${q.query};`);
  }
  return 1;
}

async function markBaseline(ds: DataSource): Promise<number> {
  return withLock(ds, async () => {
    const executed = await executedNames(ds);
    if (executed.includes(BASELINE_MIGRATION_NAME)) {
      log(`${BASELINE_MIGRATION_NAME} deja enregistree : rien a faire`);
      return 0;
    }
    const present = await existingBaselineTables(ds);
    if (present.length === 0) {
      log('REFUS : base vide. Une base neuve se cree avec `run`, pas avec `mark-baseline`.');
      return 2;
    }
    const missing = BASELINE_TABLES.filter((t) => !present.includes(t));
    if (missing.length > 0) {
      log(
        `REFUS : la base ne correspond pas a la reference, ${missing.length} table(s) absente(s) : ` +
          missing.join(', '),
      );
      return 2;
    }
    const baseline = codeMigrations(ds).find((m) => m.name === BASELINE_MIGRATION_NAME);
    if (!baseline) {
      log(`ERREUR : ${BASELINE_MIGRATION_NAME} absente de la liste des migrations`);
      return 1;
    }
    // Cree la table `migrations` au format TypeORM si besoin, sans rien executer,
    // puis y inscrit la reference, exactement comme TypeORM le fait apres un up().
    await new MigrationExecutor(ds).showMigrations();
    await ds.query(
      `INSERT INTO "${MIGRATIONS_TABLE_NAME}" ("timestamp", "name") VALUES ($1, $2)`,
      [baseline.timestamp, baseline.name],
    );
    log(
      `${BASELINE_MIGRATION_NAME} enregistree comme appliquee, NON executee ` +
        `(${BASELINE_TABLES.length} tables de reference verifiees)`,
    );
    return 0;
  });
}

async function revert(ds: DataSource): Promise<number> {
  return withLock(ds, async () => {
    // getExecutedMigrations() renvoie la plus RECENTE en premier (ORDER BY id
    // DESC) : la derniere appliquee est celle au plus grand horodatage.
    // Corrige le 2026-09-29 : l'ancien `executed[executed.length - 1]`
    // designait la reference et faisait refuser tout revert des qu'une seconde
    // migration existait.
    const executed = await new MigrationExecutor(ds).getExecutedMigrations();
    const last = [...executed].sort((a, b) => b.timestamp - a.timestamp)[0]?.name;
    if (!last) {
      log('aucune migration appliquee');
      return 0;
    }
    if (last === BASELINE_MIGRATION_NAME) {
      log(
        'REFUS : la migration de reference ne se revert pas (elle supprimerait tout le schema). ' +
          'Restaurer une sauvegarde.',
      );
      return 2;
    }
    await ds.undoLastMigration({ transaction: 'all' });
    log(`annulee : ${last}`);
    return 0;
  });
}

async function main(): Promise<number> {
  const command = (process.argv[2] ?? 'run') as Command;
  if (!COMMANDS.includes(command)) {
    console.error(`[migrate] commande inconnue "${command}". Attendu : ${COMMANDS.join(' | ')}`);
    return 64;
  }
  const options = kasiConnectionOptions();
  log(`${command} sur ${options.host}:${options.port}/${options.database}`);
  if (command === 'run') {
    await ensureDatabaseExists();
  }
  const ds = new DataSource({
    ...options,
    entities: allEntities,
    migrations: kasiMigrations,
    migrationsTableName: MIGRATIONS_TABLE_NAME,
    synchronize: false,
    migrationsRun: false,
    dropSchema: false,
    logging: ['error', 'migration'],
  });
  await ds.initialize();
  try {
    switch (command) {
      case 'run':
        return await run(ds);
      case 'show':
        return await show(ds);
      case 'check':
        return await check(ds);
      case 'mark-baseline':
        return await markBaseline(ds);
      case 'revert':
        return await revert(ds);
    }
  } finally {
    await ds.destroy();
  }
  return 1;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error('[migrate] ECHEC :', error);
    process.exit(1);
  },
);
