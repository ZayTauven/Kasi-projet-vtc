import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * p1-unicite (2026-09-29) : cle d'unicite sur les operations d'argent.
 *
 * Ajoute `idempotencyKey` (varchar 128, NULL admis) et un index unique sur les
 * quatre tables de transactions. Purement additif :
 * - colonne nullable sans valeur par defaut : ajout instantane (catalogue
 *   seulement), aucune reecriture de table ;
 * - l'historique garde une cle NULL (plusieurs NULL sont admis par un index
 *   unique PostgreSQL) : aucune collision possible, rien a retro-remplir
 *   (mesure du 2026-09-29 sur la base de demo : 32 + 84 + 60 + 78 lignes, aucun
 *   `documentNumber` renseigne, aucun doublon (course, type)) ;
 * - le code deja en service ignore la colonne : compatible pendant le
 *   deploiement (migrate avant up -d).
 *
 * Voir libs/database/src/lib/order/wallet-ledger.ts (MoneyKey) pour le format
 * des cles, toutes derivees cote serveur.
 */
export class MoneyIdempotencyKey1790647094992 implements MigrationInterface {
  name = 'MoneyIdempotencyKey1790647094992';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rider_transaction" ADD "idempotencyKey" character varying(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "driver_transaction" ADD "idempotencyKey" character varying(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "fleet_transaction" ADD "idempotencyKey" character varying(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin_transaction" ADD "idempotencyKey" character varying(128)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_rider_transaction_idempotencyKey" ON "rider_transaction" ("idempotencyKey") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_driver_transaction_idempotencyKey" ON "driver_transaction" ("idempotencyKey") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fleet_transaction_idempotencyKey" ON "fleet_transaction" ("idempotencyKey") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_admin_transaction_idempotencyKey" ON "admin_transaction" ("idempotencyKey") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_admin_transaction_idempotencyKey"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fleet_transaction_idempotencyKey"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_driver_transaction_idempotencyKey"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_rider_transaction_idempotencyKey"`);
    await queryRunner.query(`ALTER TABLE "admin_transaction" DROP COLUMN "idempotencyKey"`);
    await queryRunner.query(`ALTER TABLE "fleet_transaction" DROP COLUMN "idempotencyKey"`);
    await queryRunner.query(`ALTER TABLE "driver_transaction" DROP COLUMN "idempotencyKey"`);
    await queryRunner.query(`ALTER TABLE "rider_transaction" DROP COLUMN "idempotencyKey"`);
  }
}
