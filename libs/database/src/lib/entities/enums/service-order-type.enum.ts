import { registerEnumType } from "@nestjs/graphql";

// Type de commande porté par un service (P1 alignement v3 — Kasi Moto).
// Extensible plus tard vers Food/Shop (marketplace) sans casser l'existant.
export enum ServiceOrderType {
    Ride = 'Ride',
    Delivery = 'Delivery'
}

registerEnumType(ServiceOrderType, { name: 'ServiceOrderType' });
