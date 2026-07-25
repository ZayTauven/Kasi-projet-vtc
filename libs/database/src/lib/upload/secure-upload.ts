import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { createWriteStream, promises as fs } from 'fs';
import { join, posix, sep } from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pump = promisify(pipeline);

/**
 * Types acceptes par defaut : avatars et documents d'inscription.
 * Le mimetype est fourni par @fastify/multipart d'apres le Content-Type de la
 * partie, donc declaratif — il ferme les envois accidentels, pas un attaquant
 * determine. La vraie barriere est la sanitisation du nom + le repertoire fixe.
 */
export const DEFAULT_ALLOWED_UPLOAD_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

/** Longueur max du nom de fichier conserve (hors prefixe). */
const MAX_FILE_NAME_LENGTH = 100;

export interface StoredUpload {
  /** Chemin tel qu'ecrit sur le disque (separateurs de la plateforme). */
  diskPath: string;
  /**
   * Chemin a persister en base et a concatener aux URLs clientes. TOUJOURS en
   * separateurs POSIX : `join()` produit des `\` sous Windows, ce qui donnait
   * `uploads\123-x.jpg` en base et une URL invalide en dev local hors Docker.
   */
  address: string;
}

export interface StoreUploadOptions {
  /** Repertoire de destination, relatif au cwd. Jamais fourni par le client. */
  dir: string;
  /** Prefixe ajoute au nom sanitise (ex. timestamp). */
  fileNamePrefix?: string;
  /**
   * Nom de destination impose. Quand il est fourni, le nom envoye par le client
   * est integralement ignore — indispensable pour les repertoires sensibles
   * (`config/`), ou un nom libre permettrait d'ecraser la configuration ou la
   * cle de service Firebase.
   */
  forcedFileName?: string;
  /** Liste blanche de mimetypes. `null` desactive le controle. */
  allowedMimeTypes?: string[] | null;
}

/**
 * Reduit un nom de fichier fourni par le client a un nom inoffensif.
 *
 * `data.filename` provient du header `Content-Disposition` : il peut contenir
 * des segments de chemin (`../../etc/passwd`), des separateurs Windows, ou etre
 * vide. `join(dir, name)` normalise `..` et sort alors du repertoire cible, donc
 * on ne garde que le dernier segment puis on filtre les caracteres restants.
 */
export function sanitizeUploadFileName(rawName: unknown): string {
  const asString = typeof rawName === 'string' ? rawName : '';
  // Dernier segment, quel que soit le style de separateur envoye.
  const lastSegment = asString.split(/[/\\]/).pop() ?? '';
  const filtered = lastSegment
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Neutralise `..` et les noms caches : aucun point en tete.
    .replace(/^\.+/, '');
  const capped = filtered.slice(0, MAX_FILE_NAME_LENGTH);
  return capped.length > 0 ? capped : 'file';
}

/**
 * Lit la partie fichier d'une requete multipart Fastify et l'ecrit sur le
 * disque de facon defensive.
 *
 * Garanties, absentes des handlers d'origine :
 *  - requete non multipart ou sans partie fichier -> 400 au lieu d'un 500 (et,
 *    quand l'appel n'etait pas `await`, d'un rejet non capture qui tuait le
 *    process Node) ;
 *  - nom de fichier sanitise -> plus de traversee de chemin ;
 *  - depassement de `limits.fileSize` -> 413 et **suppression du fichier
 *    partiel**, qui restait auparavant sur le disque ;
 *  - mimetype hors liste blanche -> 415.
 */
export async function storeUploadedFile(
  req: any,
  options: StoreUploadOptions,
): Promise<StoredUpload> {
  const {
    dir,
    fileNamePrefix,
    forcedFileName,
    allowedMimeTypes = DEFAULT_ALLOWED_UPLOAD_MIMETYPES,
  } = options;

  if (typeof req.isMultipart !== 'function' || !req.isMultipart()) {
    throw new BadRequestException('Expected a multipart/form-data request');
  }

  const data = await req.file();
  if (data == null) {
    throw new BadRequestException('No file part found in the request');
  }

  if (allowedMimeTypes != null && !allowedMimeTypes.includes(data.mimetype)) {
    throw new UnsupportedMediaTypeException(
      `Unsupported file type: ${data.mimetype}`,
    );
  }

  const safeName =
    forcedFileName != null
      ? sanitizeUploadFileName(forcedFileName)
      : sanitizeUploadFileName(data.filename);
  const finalName =
    forcedFileName == null && fileNamePrefix != null
      ? `${fileNamePrefix}-${safeName}`
      : safeName;

  await fs.mkdir(dir, { recursive: true });
  const diskPath = join(dir, finalName);

  try {
    await pump(data.file, createWriteStream(diskPath));
  } catch (error) {
    await fs.unlink(diskPath).catch(() => undefined);
    if ((error as { code?: string })?.code === 'FST_REQ_FILE_TOO_LARGE') {
      throw new PayloadTooLargeException('File exceeds the maximum size');
    }
    throw error;
  }

  // Filet de securite : selon la configuration du plugin, un depassement peut
  // tronquer silencieusement au lieu de lever.
  if (data.file?.truncated === true) {
    await fs.unlink(diskPath).catch(() => undefined);
    throw new PayloadTooLargeException('File exceeds the maximum size');
  }

  return {
    diskPath,
    address: diskPath.split(sep).join(posix.sep),
  };
}
