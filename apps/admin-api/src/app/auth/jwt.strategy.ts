import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { getAdminJwtSecret } from './jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getAdminJwtSecret(),
    });
  }

  async validate(payload: AuthenticatedUser): Promise<AuthenticatedUser> {
    return payload;
  }
}

export type AuthenticatedUser = { id: number };

export async function validateToken(token: string): Promise<{ id: number }> {
  // Le client WS (admin-panel) envoie le JWT brut (connectionParams.authToken),
  // sans prefixe Bearer ; on le retire malgre tout par robustesse.
  const raw =
    typeof token === 'string' && token.startsWith('Bearer ')
      ? token.slice('Bearer '.length)
      : token;
  // VERIFIE LA SIGNATURE avec le secret derive de l'audience admin. Toute
  // signature invalide / jeton expire / malforme leve une exception, qui
  // remonte au onConnect de la subscription et REJETTE la connexion WS
  // (fail-closed). On ne renvoie jamais d'id issu d'un jeton non verifie.
  const payload = jwt.verify(raw, getAdminJwtSecret(), {
    algorithms: ['HS256'],
  }) as { id: number };
  return {
    id: payload.id,
  };
}
