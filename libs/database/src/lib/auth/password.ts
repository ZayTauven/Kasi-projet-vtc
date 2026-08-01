import { randomBytes, scrypt, ScryptOptions, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

// `promisify` ne retient que la surcharge a 3 arguments de `scrypt` : on retype
// explicitement pour pouvoir passer les parametres de cout (N, r, p).
const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions
) => Promise<Buffer>;

/**
 * Hachage des mots de passe operateurs.
 *
 * Avant ce correctif, `operator.password` contenait le mot de passe EN CLAIR et
 * la connexion faisait `repo.findOneBy({ userName, password })` — soit une
 * comparaison en clair executee directement en SQL. Toute lecture de la base
 * (sauvegarde, dump, acces console) exposait donc les identifiants admin.
 *
 * On s'appuie sur `crypto.scrypt`, fourni par Node : c'est une derivation lente
 * et memory-hard adaptee aux mots de passe, et surtout cela n'ajoute AUCUNE
 * dependance. bcrypt/argon2 sont des modules natifs, qui imposeraient une
 * chaine de compilation dans les images Alpine des trois APIs.
 *
 * Format stocke : `scrypt$N$r$p$<sel hex>$<empreinte hex>`
 * Les parametres sont inclus dans la chaine pour pouvoir les durcir plus tard
 * sans invalider les empreintes deja enregistrees.
 */
const PREFIX = 'scrypt';
const N = 16384; // cout CPU/memoire (~16 Mo ici, sous la limite maxmem de Node)
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = (await scryptAsync(plain, salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
  }));
  return [
    PREFIX,
    N,
    R,
    P,
    salt.toString('hex'),
    derived.toString('hex'),
  ].join('$');
}

/** Distingue une empreinte de ce format d'un mot de passe herite, en clair. */
export function isPasswordHashed(stored: string | null | undefined): boolean {
  return typeof stored === 'string' && stored.startsWith(`${PREFIX}$`);
}

/**
 * Verifie un mot de passe. Accepte encore les valeurs en clair heritees pour ne
 * verrouiller personne hors du panel pendant la migration : l'appelant est
 * charge de re-enregistrer une empreinte apres une connexion reussie
 * (cf. OperatorService.validateCredentials).
 */
export async function verifyPassword(
  plain: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (typeof stored !== 'string' || stored.length === 0) return false;

  if (!isPasswordHashed(stored)) {
    return safeEquals(Buffer.from(plain, 'utf8'), Buffer.from(stored, 'utf8'));
  }

  const parts = stored.split('$');
  if (parts.length !== 6) return false;
  const [, nRaw, rRaw, pRaw, saltHex, hashHex] = parts;

  const expected = Buffer.from(hashHex, 'hex');
  let derived: Buffer;
  try {
    derived = (await scryptAsync(plain, Buffer.from(saltHex, 'hex'), expected.length, {
      N: Number(nRaw),
      r: Number(rRaw),
      p: Number(pRaw),
    }));
  } catch {
    // Parametres illisibles ou hors limites : on refuse plutot que de laisser
    // passer, mais sans faire remonter d'exception au flux de connexion.
    return false;
  }
  return safeEquals(derived, expected);
}

/** Comparaison a temps constant, robuste aux longueurs differentes. */
function safeEquals(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
