import { resolveJwtSecret } from '@kasi/database';

/**
 * Secret JWT propre a rider-api, derive de `JWT_SECRET` (audience figee 'rider').
 * Appele a la fois par JwtModule (signature) et JwtStrategy (verification) pour
 * garantir un secret STRICTEMENT identique de part et d'autre.
 */
export function getRiderJwtSecret(): string {
  return resolveJwtSecret('rider');
}
