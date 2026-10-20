import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * p2-vehicules et p2-kyc K4 (2026-10-20, docs/fiche-vehicules.md) : type de
 * vehicule du Kasiman (moto, taxi/voiture, camionnette).
 *
 * Purement additive : une enumeration partagee `vehicle_type_enum`, deux
 * colonnes nullables (`car.vehicleType`, `driver.vehicleType`) et deux listes
 * vides par defaut (`service.vehicleTypes`, `driver_document_type.vehicleTypes` :
 * vide = tous les vehicules). Rien ne change pour le code deja en service ni
 * pour les donnees existantes : aucun service ni document n'est restreint,
 * aucun Kasiman n'a de type (le panel et l'app les renseignent ensuite).
 * Seule reprise : un Kasiman prend le type de son modele de vehicule s'il en a
 * un (sans effet a la premiere execution, les modeles n'etant pas classes).
 */
export class VehicleTypes1792493301332 implements MigrationInterface {
    name = 'VehicleTypes1792493301332'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."vehicle_type_enum" AS ENUM('Motorcycle', 'Car', 'Van')
        `);
        await queryRunner.query(`
            ALTER TABLE "car"
            ADD "vehicleType" "public"."vehicle_type_enum"
        `);
        await queryRunner.query(`
            ALTER TABLE "service"
            ADD "vehicleTypes" "public"."vehicle_type_enum" array NOT NULL DEFAULT '{}'
        `);
        await queryRunner.query(`
            ALTER TABLE "driver"
            ADD "vehicleType" "public"."vehicle_type_enum"
        `);
        await queryRunner.query(`
            ALTER TABLE "driver_document_type"
            ADD "vehicleTypes" "public"."vehicle_type_enum" array NOT NULL DEFAULT '{}'
        `);
        await queryRunner.query(`
            UPDATE "driver" d SET "vehicleType" = c."vehicleType"
              FROM "car" c
             WHERE c."id" = d."carId" AND d."vehicleType" IS NULL AND c."vehicleType" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "driver_document_type" DROP COLUMN "vehicleTypes"
        `);
        await queryRunner.query(`
            ALTER TABLE "driver" DROP COLUMN "vehicleType"
        `);
        await queryRunner.query(`
            ALTER TABLE "service" DROP COLUMN "vehicleTypes"
        `);
        await queryRunner.query(`
            ALTER TABLE "car" DROP COLUMN "vehicleType"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."vehicle_type_enum"
        `);
    }
}
