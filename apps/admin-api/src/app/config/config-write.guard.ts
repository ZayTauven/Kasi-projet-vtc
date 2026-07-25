import { ExecutionContext, Injectable } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RestJwtAuthGuard } from '../auth/rest-jwt-auth.guard';
import { isServerConfigured } from './config-bootstrap';

/**
 * Gardes des operations de configuration.
 *
 * Avant ce correctif, `POST /config/upload` et les mutations `updateFirebase` /
 * `updateMapsAPIKey` etaient totalement ouvertes : n'importe qui pouvait ecrire
 * dans `config/` — le volume partage par les 3 APIs qui contient
 * `config.production.json` et la cle de service Firebase.
 *
 * On ne peut pas exiger un jeton admin en toutes circonstances : le wizard
 * d'installation (`/config` dans le admin-panel) tourne deliberement sans
 * authentification au premier demarrage. La regle appliquee est donc :
 * ouvert tant que le serveur n'est PAS configure, jeton admin requis ensuite.
 */
@Injectable()
export class ConfigWriteRestGuard extends RestJwtAuthGuard {
  canActivate(context: ExecutionContext) {
    if (!isServerConfigured()) {
      return true;
    }
    return super.canActivate(context);
  }
}

@Injectable()
export class ConfigWriteGqlGuard extends JwtAuthGuard {
  canActivate(context: ExecutionContext) {
    if (!isServerConfigured()) {
      return true;
    }
    return super.canActivate(context);
  }
}
