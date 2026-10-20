import { MigrationInterface } from 'typeorm';

import { Baseline1790629154960 } from './postgres/1790629154960-Baseline';
import { MoneyIdempotencyKey1790647094992 } from './postgres/1790647094992-MoneyIdempotencyKey';
import { LedgerTables1792421211893 } from './postgres/1792421211893-LedgerTables';
import { MoneyPolicy1792434023914 } from './postgres/1792434023914-MoneyPolicy';
import { FareQuote1792452456288 } from './postgres/1792452456288-FareQuote';
import { DispatchAttempt1792471583975 } from './postgres/1792471583975-DispatchAttempt';
import { DriverDocuments1792479894071 } from './postgres/1792479894071-DriverDocuments';
import { VehicleTypes1792493301332 } from './postgres/1792493301332-VehicleTypes';

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
  // p2-argent I2 (2026-10-19) : grand livre en partie double (tables,
  // declencheurs, ledgerEntryId). A suivre de `migrate.js ledger-open`.
  LedgerTables1792421211893,
  // p2-argent I3 (2026-10-19) : plafond de dette du Kasiman par devise
  // (table money_policy, ligne XOF 10 000 / 7 500).
  MoneyPolicy1792434023914,
  // p2-argent I4 (2026-10-20) : devis fige (table fare_quote, colonne
  // request.quoteId). Rien a lancer apres elle.
  FareQuote1792452456288,
  // p2-dispatch D4 et D6 (2026-10-20) : tables dispatch_attempt (journal des
  // sollicitations) et unserved_demand (demande non servie). Rien a lancer
  // apres elle.
  DispatchAttempt1792471583975,
  // p2-kyc K1 (2026-10-20) : documents types du Kasiman (tables
  // driver_document_type, semee, et driver_document ; colonne
  // driver.documentsSuspendedAt). Rien a lancer apres elle.
  DriverDocuments1792479894071,
  // p2-vehicules et p2-kyc K4 (2026-10-20) : type de vehicule (enumeration
  // vehicle_type_enum ; car, driver, service, driver_document_type). Rien a
  // lancer apres elle.
  VehicleTypes1792493301332,
];

/**
 * Migration de reference : schema de production du 2026-09-28 (commit
 * deploye `8cbe512`). Sur une base deja peuplee (prod, base locale), elle est
 * MARQUEE comme appliquee (`migrate.js mark-baseline`), jamais executee.
 */
export const BASELINE_MIGRATION_NAME = 'Baseline1790629154960';
