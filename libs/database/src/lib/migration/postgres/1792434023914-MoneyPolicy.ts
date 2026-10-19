import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * p2-argent I3 (2026-10-19) : dette especes et plafond
 * (docs/fiche-conception-argent.md §4.1 et §7 « I3 »).
 *
 * Purement additif : une table neuve, `money_policy` (une ligne par devise :
 * plafond de dette du Kasiman et seuil d'alerte), et sa ligne XOF aux valeurs
 * validees le 2026-10-19 (10 000 FCFA, alerte a 7 500 FCFA ; KASI_DECISIONS).
 * Le code deja en service l'ignore (migrate avant up -d).
 *
 * `driver.debtLimitOverride` (derogation par Kasiman) n'est pas cree : non
 * retenu pour le pilote (fiche §4.1).
 */
export class MoneyPolicy1792434023914 implements MigrationInterface {
  name = 'MoneyPolicy1792434023914';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "money_policy" (
        "id" SERIAL NOT NULL,
        "currency" character(3) NOT NULL,
        "debtLimit" integer NOT NULL,
        "debtAlertThreshold" integer NOT NULL,
        "updatedByOperatorId" integer,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_32104a819b12ba0e0da7e789398" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_money_policy_currency" ON "money_policy" ("currency")`,
    );
    await queryRunner.query(
      `INSERT INTO "money_policy" ("currency", "debtLimit", "debtAlertThreshold")
       VALUES ('XOF', 10000, 7500)
       ON CONFLICT ("currency") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_money_policy_currency"`);
    await queryRunner.query(`DROP TABLE "money_policy"`);
  }
}
