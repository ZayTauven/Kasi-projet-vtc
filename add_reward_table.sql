-- Table "reward" (écran admin /marketing/rewards, module Rewards & parrainage).
-- La base existante a été créée avant l'ajout de RewardEntity et la
-- synchronisation TypeORM ne tourne qu'à la création de la base
-- (libs/database/src/lib/database.module.ts : shouldSync = tables < 5).
-- Ce script reproduit exactement ce que synchronize aurait généré.
-- À exécuter sur toute base existante (locale ET production) :
--   docker exec -i kasi-postgres psql -U kasi -d kasi < add_reward_table.sql

DO $$ BEGIN
  CREATE TYPE reward_apptype_enum AS ENUM ('Driver', 'Rider');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reward_beneficiary_enum AS ENUM ('Self', 'Referrer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reward_event_enum AS ENUM ('Register', 'ServiceCompleted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS reward (
  id SERIAL PRIMARY KEY,
  title character varying NOT NULL,
  "startDate" timestamp,
  "endDate" timestamp,
  "appType" reward_apptype_enum NOT NULL,
  beneficiary reward_beneficiary_enum NOT NULL,
  event reward_event_enum NOT NULL,
  "creditGift" numeric(10,2) NOT NULL DEFAULT '0.00',
  "deletedAt" timestamp,
  "tripFeePercentGift" integer,
  "creditCurrency" character(3),
  "conditionTripCountsLessThan" integer,
  "conditionUserNumberFirstDigits" text
);
