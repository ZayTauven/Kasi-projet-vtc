-- =============================================================================
-- p2-parametrage (2026-10-20) : region de Dakar d'abord.
-- Fiche : docs/fiche-parametrage-dakar.md. Rejouable (aucun effet au 2e passage).
--
-- Lancement (stack locale) :
--   G=$(python -c "import json;print(json.dumps(json.load(open('tools/parametrage/region-dakar.geojson',encoding='utf-8'))['geometry']))")
--   docker exec -i kasi-postgres psql -U kasi -d kasi -v ON_ERROR_STOP=1 -v geom="$G" < tools/parametrage/dakar.sql
--
-- Contour : OpenStreetMap, relation 2892079 (region administrative de Dakar),
-- ODbL 1.0, (c) les contributeurs d'OpenStreetMap. Terre ferme seulement
-- (Goree et les ilots ne sont pas desservis).
--
-- En production (debut de la phase 3) : relire d'abord les regions et les
-- services existants. Les etapes 3 a 5 visent les noms du jeu de demo et ne
-- font rien si ces noms n'existent pas.
-- =============================================================================
BEGIN;

-- 1. Une seule region, aux limites administratives de Dakar.
INSERT INTO region (name, currency, enabled, location)
SELECT 'Région de Dakar', 'XOF', TRUE, ST_SetSRID(ST_GeomFromGeoJSON(:'geom'), 4326)
WHERE NOT EXISTS (SELECT 1 FROM region WHERE name = 'Région de Dakar');

UPDATE region
   SET location = ST_SetSRID(ST_GeomFromGeoJSON(:'geom'), 4326), currency = 'XOF', enabled = TRUE
 WHERE name = 'Région de Dakar';

-- 2. Tous les services actifs sont ouverts sur la region.
INSERT INTO service_regions_region ("serviceId", "regionId")
SELECT s.id, r.id
  FROM service s CROSS JOIN region r
 WHERE r.name = 'Région de Dakar' AND s."deletedAt" IS NULL
ON CONFLICT DO NOTHING;

-- 3. Jeu de demo : les 5 rectangles laissaient des trous (Mermoz, Sacre-Coeur,
--    Ouakam, HLM, Hann, Keur Massar, Mbao, Sebikotane). Desactives, pas
--    supprimes (historique des courses de demo). Le corridor AIBD reste ferme.
UPDATE region SET enabled = FALSE
 WHERE name IN ('Dakar Plateau & Medina', 'Almadies & Ngor', 'Parcelles & Grand Yoff',
                'Pikine & Guediawaye', 'Rufisque & Diamniadio')
   AND enabled;

-- 4. Vehicules admis par service (p2-vehicules). Un Kasiman sans type declare
--    reste accepte partout : rien n'est retire a la flotte actuelle.
UPDATE service SET "vehicleTypes" = '{Motorcycle}'
 WHERE title IN ('Kasi Moto Livraison', 'Kasi Moto Express')
   AND "vehicleTypes" IS DISTINCT FROM '{Motorcycle}';
UPDATE service SET "vehicleTypes" = '{Car}'
 WHERE title IN ('Kasi Ville', 'Kasi Ville Confort')
   AND "vehicleTypes" IS DISTINCT FROM '{Car}';
-- Tournees pour entreprises : moto et camionnette (a valider, fiche §4).
UPDATE service SET "vehicleTypes" = '{Motorcycle,Van}'
 WHERE title = 'Kasi Tournée'
   AND "vehicleTypes" IS DISTINCT FROM '{Motorcycle,Van}';

-- 5. « Kasi Pro » est le nom de l'app Kasiman (d-nom-app, 2026-10-20) : la
--    categorie client « Kasi Pro — entreprises » est renommee.
UPDATE service_category SET title = 'Kasi Entreprises'
 WHERE title = 'Kasi Pro — entreprises';

-- 6. Valeurs standard de lancement (fiche §4). Choisies par la session
--    principale a la demande de l'utilisateur ; modifiables par le panel.
-- 6a. Prix arrondis a 50 FCFA (pilote en especes ; decision de l'utilisateur).
UPDATE service SET "roundingFactor" = 50
 WHERE "deletedAt" IS NULL AND "roundingFactor" IS DISTINCT FROM 50;
-- 6b. Commission de lancement dans le repere 12-15 % (d-commission) :
--     15 % sur les livraisons et le confort, 12 % sur le taxi et les tournees.
UPDATE service SET "providerSharePercent" = 15
 WHERE title IN ('Kasi Moto Livraison', 'Kasi Moto Express', 'Kasi Ville Confort')
   AND "providerSharePercent" <> 15;
UPDATE service SET "providerSharePercent" = 12
 WHERE title IN ('Kasi Ville', 'Kasi Tournée') AND "providerSharePercent" <> 12;
-- 6c. Forfaits de zone : seul l'aeroport reste. Les 3 forfaits urbains
--     coutaient plus cher que la formule (Plateau-Almadies : 4 500 contre
--     environ 2 000). Liens retires, forfaits gardes.
DELETE FROM zone_price_services_service
 WHERE "zonePriceId" IN (SELECT id FROM zone_price
                          WHERE name IN ('Plateau <-> Almadies', 'Plateau <-> Guediawaye',
                                         'Yoff <-> Marche Sandaga'));
-- 6d. Visite technique exigee pour les voitures et camionnettes seulement
--     (liste legale a confirmer). Les autres documents restent exiges partout.
UPDATE driver_document_type SET "vehicleTypes" = '{Car,Van}'
 WHERE title = 'Visite technique' AND "vehicleTypes" IS DISTINCT FROM '{Car,Van}';

COMMIT;

-- Controle : region retenue pour quelques quartiers (attendu : Région de Dakar
-- partout, aucune hors region pour l'AIBD et Thies).
WITH q(nom, lat, lng) AS (VALUES
  ('Plateau', 14.6681, -17.4380), ('Mermoz', 14.7080, -17.4750), ('Ouakam', 14.7240, -17.4880),
  ('Keur Massar', 14.7830, -17.3150), ('Sebikotane', 14.7460, -17.1360),
  ('AIBD (hors region)', 14.7397, -17.0902), ('Thies (hors region)', 14.7910, -16.9260))
SELECT q.nom,
       coalesce((SELECT string_agg(r.name, ', ') FROM region r
                  WHERE r.enabled AND ST_Within(ST_SetSRID(ST_MakePoint(q.lng, q.lat), 4326), r.location)),
                '(aucune region)') AS region
  FROM q;
