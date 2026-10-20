import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * p2-argent I4 (2026-10-20) : devis fige (docs/fiche-conception-argent.md §5.2
 * et §7 « I4 »).
 *
 * Purement additif : une table neuve `fare_quote` (vide) et une colonne
 * nullable `request.quoteId`. Le code deja en service les ignore (migrate
 * avant up -d). Identifiant uuid fourni par le code : pas de valeur par
 * defaut, donc aucune extension (uuid-ossp absente des bases Kasi).
 * SQL produit par `migration:generate` contre kasi_test, defaut d'id retire.
 */
export class FareQuote1792452456288 implements MigrationInterface {
  name = 'FareQuote1792452456288';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "fare_quote" (
        "id" uuid NOT NULL,
        "riderId" integer,
        "serviceId" integer NOT NULL,
        "currency" character(3) NOT NULL,
        "points" geometry(MultiPoint, 4326) NOT NULL,
        "pointsHash" character varying(64) NOT NULL,
        "optionIds" text NOT NULL,
        "couponId" integer,
        "twoWay" boolean NOT NULL DEFAULT false,
        "pickupAt" TIMESTAMP NOT NULL,
        "distance" integer NOT NULL DEFAULT '0',
        "duration" integer NOT NULL DEFAULT '0',
        "routingSource" character varying(16) NOT NULL,
        "breakdown" jsonb NOT NULL,
        "totalBeforeCoupon" integer NOT NULL,
        "total" integer NOT NULL,
        "origin" character varying(16) NOT NULL DEFAULT 'apercu',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "expiresAt" TIMESTAMP NOT NULL,
        "consumedAt" TIMESTAMP,
        "requestId" integer,
        "kind" character varying(16) NOT NULL DEFAULT 'initial',
        "parentQuoteId" uuid,
        CONSTRAINT "PK_5400fa5923d30622809310edb64" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fare_quote_requestId" ON "fare_quote" ("requestId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fare_quote_createdAt" ON "fare_quote" ("createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fare_quote_match" ON "fare_quote" ("riderId", "serviceId", "pointsHash")`,
    );
    await queryRunner.query(`ALTER TABLE "request" ADD "quoteId" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "request" DROP COLUMN "quoteId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fare_quote_match"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fare_quote_createdAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fare_quote_requestId"`);
    await queryRunner.query(`DROP TABLE "fare_quote"`);
  }
}
