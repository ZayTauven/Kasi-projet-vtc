import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * p2-dispatch D4 et D6 (2026-10-20) : journal du dispatch par vagues
 * (docs/fiche-portage-dispatch.md §3 et §6).
 *
 * Purement additive : deux tables neuves et vides, sans cle etrangere.
 * - `dispatch_attempt` (D4) : une ligne par (course, Kasiman), unique ;
 * - `unserved_demand` (D6) : une ligne par course passee en « aucun Kasiman »
 *   apres des vagues, point de depart indexe (gist) pour le seuil Q12.
 * Le code deja en service les ignore (migrate avant up -d). En
 * `DISPATCH_MODE=legacy`, rien n'y est ecrit. SQL produit par
 * `migration:generate` contre kasi_test.
 */
export class DispatchAttempt1792471583975 implements MigrationInterface {
    name = 'DispatchAttempt1792471583975'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "dispatch_attempt" (
                "id" SERIAL NOT NULL,
                "requestId" integer NOT NULL,
                "driverId" integer NOT NULL,
                "wave" smallint NOT NULL,
                "rank" smallint NOT NULL,
                "airDistanceM" integer NOT NULL,
                "roadDistanceM" integer,
                "roadDurationS" integer,
                "routingSource" character varying(16),
                "outcome" character varying(16) NOT NULL DEFAULT 'pending',
                "offeredAt" TIMESTAMP NOT NULL DEFAULT now(),
                "respondedAt" TIMESTAMP,
                CONSTRAINT "PK_2587bfa6d7c0d1d2e6d9bdab091" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dispatch_attempt_driver_offeredAt" ON "dispatch_attempt" ("driverId", "offeredAt")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_dispatch_attempt_request_driver" ON "dispatch_attempt" ("requestId", "driverId")
        `);
        await queryRunner.query(`
            CREATE TABLE "unserved_demand" (
                "id" SERIAL NOT NULL,
                "requestId" integer NOT NULL,
                "serviceId" integer NOT NULL,
                "point" geometry(Point, 4326) NOT NULL,
                "driversSolicited" integer NOT NULL DEFAULT '0',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "alertedAt" TIMESTAMP,
                "alertedDrivers" integer,
                CONSTRAINT "PK_ead4d8b40e9cd257a191e925202" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_unserved_demand_point" ON "unserved_demand" USING gist ("point")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_unserved_demand_createdAt" ON "unserved_demand" ("createdAt")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_unserved_demand_requestId" ON "unserved_demand" ("requestId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "public"."IDX_unserved_demand_requestId"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_unserved_demand_createdAt"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_unserved_demand_point"
        `);
        await queryRunner.query(`
            DROP TABLE "unserved_demand"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_dispatch_attempt_request_driver"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_dispatch_attempt_driver_offeredAt"
        `);
        await queryRunner.query(`
            DROP TABLE "dispatch_attempt"
        `);
    }

}
