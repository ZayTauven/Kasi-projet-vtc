import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { getRiderJwtSecret } from './jwt-secret';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getRiderJwtSecret()
    });
  }

  async validate(payload: AuthenticatedUser): Promise<AuthenticatedUser> {
    return { id: payload.id };
  }
}

export type AuthenticatedUser = { id: number };

export async function validateToken(token: string): Promise<Record<string, any>> {
  // Le client WS envoie le JWT brut (initialPayload.authToken), sans prefixe
  // Bearer ; on le retire malgre tout par robustesse s'il est present.
  const raw =
    typeof token === 'string' && token.startsWith('Bearer ')
      ? token.slice('Bearer '.length)
      : token;
  // VERIFIE LA SIGNATURE avec le secret derive de l'audience rider. Toute
  // signature invalide / jeton expire / malforme leve une exception, qui
  // remonte au onConnect de la subscription et REJETTE la connexion WS
  // (fail-closed). On ne renvoie jamais d'id issu d'un jeton non verifie.
  const payload = jwt.verify(raw, getRiderJwtSecret(), {
    algorithms: ['HS256'],
  }) as { id: number };
  Logger.log(`validated rider socket: ${payload.id}`);
  return {
    id: payload.id,
  };
}