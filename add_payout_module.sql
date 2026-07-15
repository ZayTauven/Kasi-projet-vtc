-- Module Payouts P2 (versement des gains aux Kasimen) : tables
-- payout_method / payout_session / payout + méthode de retrait sur driver.
-- La synchronisation TypeORM ne tourne qu'à la création de la base
-- (libs/database/src/lib/database.module.ts : shouldSync = tables < 5).
-- Ce script reproduit ce que synchronize aurait généré.
-- À exécuter sur toute base existante (locale ET production) :
--   docker exec -i kasi-postgres psql -U kasi -d kasi < add_payout_module.sql

DO $$ BEGIN
  CREATE TYPE payout_method_type_enum AS ENUM ('Wave', 'OrangeMoney', 'BankTransfer', 'Cash');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payout_session_status_enum AS ENUM ('Pending', 'Processed', 'Canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payout_status_enum AS ENUM ('Pending', 'Paid', 'Canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payout_methodtype_enum AS ENUM ('Wave', 'OrangeMoney', 'BankTransfer', 'Cash');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS payout_method (
  id SERIAL PRIMARY KEY,
  type payout_method_type_enum NOT NULL,
  name character varying NOT NULL,
  currency character(3) NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  "minimumAmount" numeric(10,2) NOT NULL DEFAULT '0.00',
  instructions character varying,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "deletedAt" timestamp
);

CREATE TABLE IF NOT EXISTS payout_session (
  id SERIAL PRIMARY KEY,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "processedAt" timestamp,
  status payout_session_status_enum NOT NULL DEFAULT 'Pending',
  currency character(3) NOT NULL,
  "minimumAmount" numeric(10,2) NOT NULL DEFAULT '0.00',
  "totalAmount" numeric(12,2) NOT NULL DEFAULT '0.00',
  description character varying,
  "operatorId" integer REFERENCES operator(id)
);

CREATE TABLE IF NOT EXISTS payout (
  id SERIAL PRIMARY KEY,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  status payout_status_enum NOT NULL DEFAULT 'Pending',
  amount numeric(10,2) NOT NULL DEFAULT '0.00',
  currency character(3) NOT NULL,
  "methodType" payout_methodtype_enum NOT NULL,
  "methodName" character varying NOT NULL,
  "accountNumber" character varying,
  "processedAt" timestamp,
  "driverTransactionId" integer,
  "sessionId" integer NOT NULL REFERENCES payout_session(id) ON DELETE CASCADE,
  "driverId" integer NOT NULL REFERENCES driver(id),
  "methodId" integer REFERENCES payout_method(id) ON DELETE SET NULL
);

ALTER TABLE driver
  ADD COLUMN IF NOT EXISTS "payoutMethodId" integer REFERENCES payout_method(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "payoutAccountNumber" character varying;
