-- P1 alignement v3 — Kasi Moto (livraison).
-- Colonnes : service.orderType, driver.canDeliver / maxPackageSize,
-- request.packageSize / recipientName / recipientMobileNumber / deliveryInstructions.
-- La synchronisation TypeORM ne tournant qu'à la création de la base
-- (voir add_reward_table.sql), ce script reproduit ce que synchronize
-- aurait généré. À exécuter sur toute base existante (locale ET production) :
--   docker exec -i kasi-postgres psql -U kasi -d kasi < add_kasi_moto_delivery.sql

DO $$ BEGIN
  CREATE TYPE service_ordertype_enum AS ENUM ('Ride', 'Delivery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE driver_maxpackagesize_enum AS ENUM ('Small', 'Medium', 'Large');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE request_packagesize_enum AS ENUM ('Small', 'Medium', 'Large');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE service
  ADD COLUMN IF NOT EXISTS "orderType" service_ordertype_enum NOT NULL DEFAULT 'Ride';

ALTER TABLE driver
  ADD COLUMN IF NOT EXISTS "canDeliver" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "maxPackageSize" driver_maxpackagesize_enum;

ALTER TABLE request
  ADD COLUMN IF NOT EXISTS "packageSize" request_packagesize_enum,
  ADD COLUMN IF NOT EXISTS "recipientName" character varying,
  ADD COLUMN IF NOT EXISTS "recipientMobileNumber" character varying,
  ADD COLUMN IF NOT EXISTS "deliveryInstructions" character varying;
