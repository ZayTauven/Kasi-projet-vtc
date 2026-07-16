-- Module Call Masking P3 : table call_masking_provider (Direct / TwilioVoice)
-- + seed d'un provider Direct par défaut pour le dev/E2E.
-- La synchronisation TypeORM ne tourne qu'à la création de la base
-- (libs/database/src/lib/database.module.ts : shouldSync = tables < 5).
-- Ce script reproduit ce que synchronize aurait généré.
-- À exécuter sur toute base existante (locale ET production) :
--   docker exec -i kasi-postgres psql -U kasi -d kasi < add_call_masking.sql

DO $$ BEGIN
  CREATE TYPE call_masking_provider_type_enum AS ENUM ('Direct', 'TwilioVoice');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS call_masking_provider (
  id SERIAL PRIMARY KEY,
  type call_masking_provider_type_enum NOT NULL,
  name character varying NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  "isDefault" boolean NOT NULL DEFAULT false,
  "accountId" character varying,
  "apiSecret" character varying,
  "proxyNumber" character varying,
  "webhookAuthToken" character varying,
  "sessionTtlMinutes" integer NOT NULL DEFAULT 120,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- Seed : provider Direct par défaut (aucun masquage réel, le vrai numéro est
-- renvoyé — rend le parcours mobile + backend testable sans Twilio ni webhook).
INSERT INTO call_masking_provider (type, name, enabled, "isDefault")
SELECT 'Direct', 'Direct (dev)', true, true
WHERE NOT EXISTS (SELECT 1 FROM call_masking_provider);
