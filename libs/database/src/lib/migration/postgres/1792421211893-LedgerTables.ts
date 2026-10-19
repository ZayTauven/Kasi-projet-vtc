import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * p2-argent I2 (2026-10-19) : grand livre en partie double
 * (docs/fiche-conception-argent.md §3.3 et §7 « I2 »).
 *
 * Purement additif :
 * - trois tables neuves et vides : `ledger_account`, `ledger_entry`,
 *   `ledger_line` (montants entiers `bigint`, cle `idempotencyKey` non nulle et
 *   unique sur l'ecriture) ;
 * - colonne `ledgerEntryId` nullable, sans valeur par defaut, indexee, sur les
 *   quatre tables de lignes de portefeuille : ajout instantane, l'historique
 *   garde NULL, le code deja en service l'ignore (migrate avant up -d).
 *
 * Partie ecrite A LA MAIN (`migration:generate` ne produit ni fonction ni
 * declencheur ; `migration:check` les ignore) :
 * - `ledger_line_balance_check` : declencheur de contrainte DIFFERE
 *   (DEFERRABLE INITIALLY DEFERRED). A la validation de la transaction, chaque
 *   ecriture touchee doit sommer a zero et n'avoir que des comptes de sa devise,
 *   sinon la transaction echoue. postLedgerEntry le passe en IMMEDIATE le temps
 *   de son controle (SET CONSTRAINTS), pour echouer au plus tot ;
 * - `ledger_entry_immutable` / `ledger_line_immutable` : tout UPDATE ou DELETE
 *   est refuse. On corrige par une contre-passation. TRUNCATE reste possible
 *   (vidage du banc d'integration) : il ne declenche pas les declencheurs de
 *   ligne.
 *
 * Apres cette migration, en production comme en local : `migrate.js
 * ledger-open` (ouverture du grand livre, fiche §3.8), voir
 * docs/migrations-base-de-donnees.md.
 */
export class LedgerTables1792421211893 implements MigrationInterface {
  name = 'LedgerTables1792421211893';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ledger_account" (
        "id" SERIAL NOT NULL,
        "code" character varying(64) NOT NULL,
        "kind" character varying(16) NOT NULL,
        "ownerId" integer,
        "currency" character(3) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_34640393ff83dad2b4627d7ae5f" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ledger_account_code_currency" ON "ledger_account" ("code", "currency")`,
    );
    await queryRunner.query(`
      CREATE TABLE "ledger_line" (
        "id" SERIAL NOT NULL,
        "entryId" integer NOT NULL,
        "accountId" integer NOT NULL,
        "amount" bigint NOT NULL,
        "nature" character varying(32) NOT NULL,
        CONSTRAINT "PK_a19363079df6f58038f909718ab" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_ledger_line_entryId" ON "ledger_line" ("entryId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ledger_line_accountId" ON "ledger_line" ("accountId")`,
    );
    await queryRunner.query(`
      CREATE TABLE "ledger_entry" (
        "id" SERIAL NOT NULL,
        "idempotencyKey" character varying(128) NOT NULL,
        "nature" character varying(32) NOT NULL,
        "currency" character(3) NOT NULL,
        "requestId" integer,
        "operatorId" integer,
        "reference" character varying(255),
        "motif" character varying(500),
        "reversesEntryId" integer,
        "cashCollected" bigint,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_04e9d274911f909a5848a15cd74" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ledger_entry_idempotencyKey" ON "ledger_entry" ("idempotencyKey")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ledger_entry_requestId" ON "ledger_entry" ("requestId")`,
    );
    for (const table of WALLET_LINE_TABLES) {
      await queryRunner.query(`ALTER TABLE "${table}" ADD "ledgerEntryId" integer`);
      await queryRunner.query(
        `CREATE INDEX "IDX_${table}_ledgerEntryId" ON "${table}" ("ledgerEntryId")`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "ledger_line" ADD CONSTRAINT "FK_89fec2707816f034fc7293e0677" FOREIGN KEY ("entryId") REFERENCES "ledger_entry"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_line" ADD CONSTRAINT "FK_fd216120ebe162ed3e3efc3b414" FOREIGN KEY ("accountId") REFERENCES "ledger_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_entry" ADD CONSTRAINT "FK_41f44822f6e215562e70afe561c" FOREIGN KEY ("reversesEntryId") REFERENCES "ledger_entry"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // --- Ecrit a la main : equilibre de chaque ecriture, controle differe ----
    await queryRunner.query(`
      CREATE FUNCTION "ledger_check_entry_balance"() RETURNS trigger
      LANGUAGE plpgsql AS $$
      DECLARE
        entry_currency character(3);
        total numeric;
        foreign_lines integer;
      BEGIN
        SELECT e."currency" INTO entry_currency
          FROM "ledger_entry" e WHERE e."id" = NEW."entryId";
        SELECT COALESCE(SUM(l."amount"), 0) INTO total
          FROM "ledger_line" l WHERE l."entryId" = NEW."entryId";
        IF total <> 0 THEN
          RAISE EXCEPTION 'LEDGER_ENTRY_UNBALANCED: ecriture % desequilibree (somme des lignes : %)',
            NEW."entryId", total
            USING ERRCODE = 'check_violation';
        END IF;
        SELECT count(*) INTO foreign_lines
          FROM "ledger_line" l JOIN "ledger_account" a ON a."id" = l."accountId"
         WHERE l."entryId" = NEW."entryId" AND a."currency" <> entry_currency;
        IF foreign_lines > 0 THEN
          RAISE EXCEPTION 'LEDGER_ENTRY_CURRENCY_MISMATCH: ecriture % (devise %) sur un compte d''une autre devise',
            NEW."entryId", entry_currency
            USING ERRCODE = 'check_violation';
        END IF;
        RETURN NULL;
      END
      $$`);
    await queryRunner.query(`
      CREATE CONSTRAINT TRIGGER "ledger_line_balance_check"
        AFTER INSERT ON "ledger_line"
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION "ledger_check_entry_balance"()`);

    // --- Ecrit a la main : immuabilite ---------------------------------------
    await queryRunner.query(`
      CREATE FUNCTION "ledger_refuse_change"() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'LEDGER_IMMUTABLE: % refuse sur %. Une ecriture se corrige par contre-passation.',
          TG_OP, TG_TABLE_NAME
          USING ERRCODE = 'restrict_violation';
      END
      $$`);
    await queryRunner.query(`
      CREATE TRIGGER "ledger_entry_immutable"
        BEFORE UPDATE OR DELETE ON "ledger_entry"
        FOR EACH ROW EXECUTE FUNCTION "ledger_refuse_change"()`);
    await queryRunner.query(`
      CREATE TRIGGER "ledger_line_immutable"
        BEFORE UPDATE OR DELETE ON "ledger_line"
        FOR EACH ROW EXECUTE FUNCTION "ledger_refuse_change"()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER "ledger_line_immutable" ON "ledger_line"`);
    await queryRunner.query(`DROP TRIGGER "ledger_entry_immutable" ON "ledger_entry"`);
    await queryRunner.query(`DROP FUNCTION "ledger_refuse_change"()`);
    await queryRunner.query(`DROP TRIGGER "ledger_line_balance_check" ON "ledger_line"`);
    await queryRunner.query(`DROP FUNCTION "ledger_check_entry_balance"()`);
    await queryRunner.query(
      `ALTER TABLE "ledger_entry" DROP CONSTRAINT "FK_41f44822f6e215562e70afe561c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_line" DROP CONSTRAINT "FK_fd216120ebe162ed3e3efc3b414"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_line" DROP CONSTRAINT "FK_89fec2707816f034fc7293e0677"`,
    );
    for (const table of [...WALLET_LINE_TABLES].reverse()) {
      await queryRunner.query(`DROP INDEX "public"."IDX_${table}_ledgerEntryId"`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "ledgerEntryId"`);
    }
    await queryRunner.query(`DROP INDEX "public"."IDX_ledger_entry_requestId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ledger_entry_idempotencyKey"`);
    await queryRunner.query(`DROP TABLE "ledger_entry"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ledger_line_accountId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ledger_line_entryId"`);
    await queryRunner.query(`DROP TABLE "ledger_line"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ledger_account_code_currency"`);
    await queryRunner.query(`DROP TABLE "ledger_account"`);
  }
}

/** Les quatre tables de lignes de portefeuille (projections du grand livre). */
const WALLET_LINE_TABLES = [
  'rider_transaction',
  'admin_transaction',
  'fleet_transaction',
  'driver_transaction',
];
