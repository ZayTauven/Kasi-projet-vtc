import { resolveJwtSecret } from '@kasi/database';

/**
 * Secret JWT propre a driver-api, derive de `JWT_SECRET` (audience figee 'driver').
 * Appele a la fois par JwtModule (signature) et JwtStrategy (verification) pour
 * garantir un secret STRICTEMENT identique de part et d'autre.
 */
export function getDriverJwtSecret(): string {
  return resolveJwtSecret('driver');
}
