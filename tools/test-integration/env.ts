/**
 * Environnement du banc d'integration (charge avant chaque fichier de test ET
 * par global-setup.ts). Voir docs/tests-integration.md.
 *
 * - Lit `.env` sans ecraser les variables deja exportees (comme les scripts
 *   npm migration:*). `.env` decrit la stack Docker : DB_HOST=postgres et
 *   REDIS_HOST=redis ne sont pas joignables depuis l'hote, on vise donc les
 *   ports publies par docker-compose.yml (127.0.0.1:5433 et 127.0.0.1:6379).
 * - La base visee est TOUJOURS une base de test : KASI_TEST_DB_NAME, par
 *   defaut `kasi_test`. Le nom doit contenir "test" ; `kasi` (jeu de demo du
 *   memoire) est refuse.
 * - p2-argent I2 : LEDGER_MODE=strict par defaut (voir plus bas).
 */
import * as path from 'path';
import * as dotenv from 'dotenv';

const root = path.resolve(__dirname, '..', '..');

export const TEST_REDIS_DB = Number(process.env.KASI_TEST_REDIS_DB ?? 15);

export function configureTestEnv(): void {
  dotenv.config({ path: path.join(root, '.env'), quiet: true } as dotenv.DotenvConfigOptions);
  if (process.env.DB_HOST === 'postgres' || process.env.DB_HOST == null) {
    process.env.DB_HOST = '127.0.0.1';
    process.env.DB_PORT = process.env.DB_HOST_PORT || '5433';
  }
  if (process.env.REDIS_HOST === 'redis' || process.env.REDIS_HOST == null) {
    process.env.REDIS_HOST = '127.0.0.1';
    process.env.REDIS_PORT = process.env.REDIS_HOST_PORT || '6379';
  }
  const dbName = process.env.KASI_TEST_DB_NAME || 'kasi_test';
  if (dbName === 'kasi' || !dbName.includes('test')) {
    throw new Error(
      `[integration] REFUS : base "${dbName}". Le banc ne vise qu'une base de test (nom contenant "test").`,
    );
  }
  if (TEST_REDIS_DB === 0) {
    throw new Error('[integration] REFUS : la base Redis 0 est celle de la stack locale.');
  }
  process.env.DB_NAME = dbName;
  // Pas de passerelle de paiement reelle en test.
  process.env.GATEWAY_SERVER_URL = 'http://127.0.0.1:9';
  // p2-argent I2 (2026-10-19) : le banc tourne en LEDGER_MODE=strict (sauf
  // valeur exportee) : une ecriture refusee par le grand livre fait echouer le
  // test au lieu d'etre seulement journalisee. Le mode shadow a son test.
  if (process.env.LEDGER_MODE == null || process.env.LEDGER_MODE === '') {
    process.env.LEDGER_MODE = 'strict';
  }
}

configureTestEnv();
