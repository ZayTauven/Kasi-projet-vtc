import { resolveJwtSecret } from '@kasi/database';

/**
 * Secret JWT propre a admin-api, derive de `JWT_SECRET` (audience figee 'admin').
 * Appele a la fois par JwtModule (signature) et JwtStrategy (verification) pour
 * garantir un secret STRICTEMENT identique de part et d'autre.
 */
export function getAdminJwtSecret(): string {
  return resolveJwtSecret('admin');
}
