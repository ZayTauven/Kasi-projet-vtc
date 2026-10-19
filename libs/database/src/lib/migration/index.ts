import { MigrationInterface } from 'typeorm';

import { Baseline1790629154960 } from './postgres/1790629154960-Baseline';
import { MoneyIdempotencyKey1790647094992 } from './postgres/1790647094992-MoneyIdempotencyKey';

/**
 * Liste ORDONNEE et EXPLICITE des migrations PostgreSQL de Kasi.
 *
 * Pas de glob : les API et `migrate.js` sont des bundles webpack, un glob de
 * fichiers `.js` n'y trouverait rien (c'est ce qui rendait l'ancien reglage
 * `migrations: [`${__dirname}/migration/*.js`]` inoperant, et dangereux : il
 * visait les migrations MySQL archivees).
 *
 * Apres `npm run migration:generate`, AJOUTER la nouvelle classe ici. Un oubli
 * se voit tout de suite : `npm run migration:check` continue de signaler l'ecart.
 */
export const kasiMigrations: Array<new () => MigrationInterface> = [
  Baseline1790629154960,
  // p1-unicite (2026-09-29) : cle d'unicite sur les 4 tables de transactions.
  MoneyIdempotencyKey1790647094992,
];

/**
 * Migration de reference : schema de production du 2026-09-28 (commit
 * deploye `8cbe512`). Sur une base deja peuplee (prod, base locale), elle est
 * MARQUEE comme appliquee (`migrate.js mark-baseline`), jamais executee.
 */
export const BASELINE_MIGRATION_NAME = 'Baseline1790629154960';
