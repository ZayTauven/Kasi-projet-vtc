-- Module Fournisseurs SMS P3 : table sms_provider (LogOnly / Twilio /
-- OrangeSms) + seed d'un provider LogOnly par défaut pour le dev/E2E.
-- La synchronisation TypeORM ne tourne qu'à la création de la base
-- (libs/database/src/lib/database.module.ts : shouldSync = tables < 5).
-- Ce script reproduit ce que synchronize aurait généré.
-- À exécuter sur toute base existante (locale ET production) :
--   docker exec -i kasi-postgres psql -U kasi -d kasi < add_sms_provider.sql

DO $$ BEGIN
  CREATE TYPE sms_provider_type_enum AS ENUM ('LogOnly', 'Twilio', 'OrangeSms');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS sms_provider (
  id SERIAL PRIMARY KEY,
  type sms_provider_type_enum NOT NULL,
  name character varying NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  "isDefault" boolean NOT NULL DEFAULT false,
  "accountId" character varying,
  "apiSecret" character varying,
  "senderId" character varying,
  "verificationTemplate" character varying NOT NULL DEFAULT 'Your Kasi verification code is: %code%',
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- Seed : provider LogOnly par défaut (les SMS sont journalisés côté API).
INSERT INTO sms_provider (type, name, enabled, "isDefault")
SELECT 'LogOnly', 'Log (dev)', true, true
WHERE NOT EXISTS (SELECT 1 FROM sms_provider);
