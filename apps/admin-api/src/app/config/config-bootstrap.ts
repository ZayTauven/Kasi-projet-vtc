import { existsSync, readFileSync } from 'fs';

/**
 * Indique si le serveur a deja ete configure (fichier de config present ET cle
 * de service Firebase referencee et presente sur le disque).
 *
 * Sert de bascule aux gardes de `config/` : le wizard d'installation du
 * admin-panel (route `/config`, volontairement HORS `LoginGuard`) doit pouvoir
 * ecrire avant qu'un administrateur ne puisse se connecter, mais une fois le
 * serveur configure ces ecritures doivent exiger un jeton admin.
 *
 * Lecture synchrone assumee : appelee depuis `canActivate`, sur un fichier
 * local de quelques centaines d'octets.
 */
export function isServerConfigured(): boolean {
  const configAddress = `${process.cwd()}/config/config.${
    process.env.NODE_ENV ?? 'production'
  }.json`;
  if (!existsSync(configAddress)) {
    return false;
  }
  try {
    const config = JSON.parse(readFileSync(configAddress, { encoding: 'utf-8' }));
    return (
      config.firebaseProjectPrivateKey != null &&
      existsSync(`${process.cwd()}/config/${config.firebaseProjectPrivateKey}`)
    );
  } catch {
    // Config illisible/corrompue : on considere le serveur non configure pour
    // laisser le wizard reparer, plutot que de verrouiller definitivement.
    return false;
  }
}
