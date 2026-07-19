import { Logger } from '@nestjs/common';

/**
 * Audiences JWT distinctes. Chaque application derive un secret PROPRE a partir
 * d'un unique `JWT_SECRET` d'environnement. Cela garantit qu'un jeton emis pour
 * une audience (ex. rider) ne peut PAS authentifier contre une autre (ex. admin),
 * meme si le payload n'est que `{ id }` — evitant toute escalade de privilege.
 */
export type JwtAudience = 'rider' | 'driver' | 'admin';

/** Placeholder livre par docker-compose : ne doit JAMAIS servir en production. */
const PLACEHOLDER = 'CHANGEME_jwt_secret_32chars_minimum';

/** Longueur minimale acceptable pour un secret HS256 raisonnablement solide. */
const MIN_LENGTH = 32;

const logger = new Logger('JwtSecret');

/**
 * Resout le secret de signature/verification JWT pour une audience donnee.
 *
 * Invariant critique : cette fonction est l'UNIQUE source du secret. Le module
 * de signature (JwtModule) et la strategie de verification (JwtStrategy) d'une
 * meme application DOIVENT l'appeler avec la meme audience, sinon tous les
 * logins cassent. Les fichiers `auth/jwt-secret.ts` de chaque app figent
 * l'audience pour rendre toute divergence impossible.
 *
 * Comportement fail-closed :
 *  - En production (`NODE_ENV === 'production'`), si `JWT_SECRET` est absent,
 *    vaut encore le placeholder, ou fait moins de 32 caracteres -> throw (refus
 *    de demarrage).
 *  - Hors production, on log un warning et on retombe sur un secret de dev
 *    DERIVE PAR AUDIENCE (jamais les anciennes constantes `secret_rider`, etc.),
 *    de sorte que l'isolation entre audiences reste vraie meme en dev.
 */
export function resolveJwtSecret(audience: JwtAudience): string {
  const base = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  let invalidReason: string | null = null;
  if (base == null || base.length === 0) {
    invalidReason = 'variable absente';
  } else if (base === PLACEHOLDER) {
    invalidReason = 'valeur placeholder par defaut (CHANGEME_...) non modifiee';
  } else if (base.length < MIN_LENGTH) {
    invalidReason = `trop court (${base.length} < ${MIN_LENGTH} caracteres)`;
  }

  if (invalidReason != null) {
    const message =
      `[SECURITE] JWT_SECRET invalide : ${invalidReason}. ` +
      `Definir un JWT_SECRET unique d'au moins ${MIN_LENGTH} caracteres ` +
      `(ex: openssl rand -hex 32).`;
    if (isProduction) {
      // Fail-closed : on refuse de demarrer plutot que d'exposer un secret devinable.
      throw new Error(`${message} Demarrage en production refuse.`);
    }
    logger.warn(
      `${message} Repli sur un secret de developpement — NE JAMAIS utiliser en production.`,
    );
    return `kasi_dev_insecure_secret_do_not_use_in_prod_${audience}`;
  }

  return `${base}_${audience}`;
}
