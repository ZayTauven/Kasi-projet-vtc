import { registerEnumType } from '@nestjs/graphql';

/**
 * p2-vehicules (2026-10-20, docs/fiche-vehicules.md) : type de vehicule du
 * Kasiman. Un seul Kasiman, quel que soit le vehicule (vision, pilier 1) :
 * le type conditionne les services proposes et les documents exiges, jamais
 * l'identite, le badge ni la reputation.
 *
 * Une seule enumeration PostgreSQL (`vehicle_type_enum`) pour les quatre
 * colonnes qui la portent (car, driver, service, driver_document_type).
 */
export enum VehicleType {
  /** Moto, scooter : livraison et taxi-moto. */
  Motorcycle = 'Motorcycle',
  /** Taxi ou voiture particuliere : courses de personnes, petits colis. */
  Car = 'Car',
  /** Camionnette, tricycle cargo : tournees et gros colis. */
  Van = 'Van',
}

export const VEHICLE_TYPE_ENUM_NAME = 'vehicle_type_enum';

registerEnumType(VehicleType, { name: 'VehicleType' });

/**
 * Le service accepte-t-il ce vehicule ? Liste vide = tous les types (services
 * existants, inchanges). Kasiman sans type (inscrit avant p2-vehicules) :
 * accepte partout, sinon toute la flotte en place perdrait ses offres
 * (tranche, a revoir).
 */
export function vehicleTypeAllowed(
  allowed: VehicleType[] | null | undefined,
  vehicleType: VehicleType | null | undefined,
): boolean {
  if (allowed == null || allowed.length === 0) return true;
  if (vehicleType == null) return true;
  return allowed.includes(vehicleType);
}
