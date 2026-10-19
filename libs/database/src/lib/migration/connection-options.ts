/** Sous-ensemble des options PostgreSQL de TypeORM (le type complet n'est plus exporte en 1.x). */
export interface KasiConnectionOptions {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

/**
 * Parametres de connexion PostgreSQL lus depuis l'environnement, partages par
 * les trois API (DatabaseModule), l'executable de migration (`migrate.js`) et
 * la DataSource de la CLI TypeORM. Une seule source : les trois chemins
 * parlent forcement a la meme base.
 *
 * Les valeurs par defaut sont celles historiques du DatabaseModule.
 */
export function kasiConnectionOptions(
  env: NodeJS.ProcessEnv = process.env,
): KasiConnectionOptions {
  return {
    type: 'postgres',
    host: env['DB_HOST'] || 'localhost',
    port: Number(env['DB_PORT'] || 5432),
    username: env['DB_USER'] || 'root',
    password: env['DB_PASS'] || 'defaultpassword',
    database: env['DB_NAME'] || 'kasi',
  };
}

/** Nom de la table d'historique des migrations (defaut TypeORM, explicite). */
export const MIGRATIONS_TABLE_NAME = 'migrations';
