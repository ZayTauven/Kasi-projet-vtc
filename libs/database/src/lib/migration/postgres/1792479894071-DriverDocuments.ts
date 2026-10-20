import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * p2-kyc K1 (2026-10-20) : documents types du Kasiman et echeance
 * (docs/fiche-kyc.md §3).
 *
 * Purement additive : deux tables neuves (`driver_document_type`, catalogue
 * seme ci-dessous ; `driver_document`, vide) et une colonne nullable
 * `driver.documentsSuspendedAt`. Le code deja en service les ignore (migrate
 * avant up -d). SQL produit par `migration:generate` contre kasi_test, plus
 * le catalogue (Q1, hypothese juridique la plus prudente, a confirmer) :
 * `ON CONFLICT DO NOTHING`, un catalogue retouche par le panel n'est jamais
 * ecrase.
 */
export class DriverDocuments1792479894071 implements MigrationInterface {
    name = 'DriverDocuments1792479894071'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "driver_document_type" (
                "id" SERIAL NOT NULL,
                "code" character varying(32) NOT NULL,
                "title" character varying(120) NOT NULL,
                "description" text,
                "isEnabled" boolean NOT NULL DEFAULT true,
                "isRequired" boolean NOT NULL DEFAULT true,
                "hasExpiryDate" boolean NOT NULL DEFAULT true,
                "reminderDays" integer array NOT NULL DEFAULT '{30,14,7,3,1}',
                "sortOrder" smallint NOT NULL DEFAULT '0',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_8e9e3986c7a164406967f52abc1" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_driver_document_type_code" ON "driver_document_type" ("code")
        `);
        await queryRunner.query(`
            CREATE TABLE "driver_document" (
                "id" SERIAL NOT NULL,
                "driverId" integer NOT NULL,
                "typeId" integer NOT NULL,
                "mediaId" integer,
                "number" character varying(64),
                "expiresAt" date,
                "status" character varying(16) NOT NULL DEFAULT 'pending',
                "reviewNote" character varying(500),
                "reviewedAt" TIMESTAMP,
                "reviewedByOperatorId" integer,
                "lastReminderDays" smallint,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_21c7cd21e8a72b1209b9c4bc39d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_driver_document_one_approved" ON "driver_document" ("driverId", "typeId")
            WHERE "status" = 'approved'
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_driver_document_one_pending" ON "driver_document" ("driverId", "typeId")
            WHERE "status" = 'pending'
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_driver_document_status_expiresAt" ON "driver_document" ("status", "expiresAt")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_driver_document_driver_type" ON "driver_document" ("driverId", "typeId")
        `);
        await queryRunner.query(`
            ALTER TABLE "driver"
            ADD "documentsSuspendedAt" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "driver_document"
            ADD CONSTRAINT "FK_8360fd10dbe1b739c02ea9b44c6" FOREIGN KEY ("driverId") REFERENCES "driver"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "driver_document"
            ADD CONSTRAINT "FK_a9daea5ff9ca8bd8060c6c338fd" FOREIGN KEY ("typeId") REFERENCES "driver_document_type"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "driver_document"
            ADD CONSTRAINT "FK_caad7d91806c37e0bfe7ddfa98b" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            INSERT INTO "driver_document_type" ("code", "title", "description", "isRequired", "hasExpiryDate", "sortOrder")
            VALUES
                ('driving_license', 'Permis de conduire', 'Catégorie adaptée au véhicule, vérifiée par l''opérateur.', true, true, 1),
                ('vehicle_registration', 'Carte grise', 'Certificat d''immatriculation du véhicule.', true, false, 2),
                ('insurance', 'Assurance du véhicule', 'Attestation en cours de validité.', true, true, 3),
                ('identity_document', 'Pièce d''identité', 'Carte nationale d''identité ou passeport.', true, true, 4),
                ('technical_inspection', 'Visite technique', 'Certificat de visite technique du véhicule.', true, true, 5)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "driver_document" DROP CONSTRAINT "FK_caad7d91806c37e0bfe7ddfa98b"
        `);
        await queryRunner.query(`
            ALTER TABLE "driver_document" DROP CONSTRAINT "FK_a9daea5ff9ca8bd8060c6c338fd"
        `);
        await queryRunner.query(`
            ALTER TABLE "driver_document" DROP CONSTRAINT "FK_8360fd10dbe1b739c02ea9b44c6"
        `);
        await queryRunner.query(`
            ALTER TABLE "driver" DROP COLUMN "documentsSuspendedAt"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_driver_document_driver_type"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_driver_document_status_expiresAt"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_driver_document_one_pending"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_driver_document_one_approved"
        `);
        await queryRunner.query(`
            DROP TABLE "driver_document"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_driver_document_type_code"
        `);
        await queryRunner.query(`
            DROP TABLE "driver_document_type"
        `);
    }

}
