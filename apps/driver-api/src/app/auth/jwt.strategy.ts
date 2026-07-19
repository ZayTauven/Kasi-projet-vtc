import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import { AuthenticatedDriverDTO } from './authenticated-user';
import * as jwt from 'jsonwebtoken';
import { getDriverJwtSecret } from './jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getDriverJwtSecret()
    });
  }

  async validate(payload: AuthenticatedDriverDTO): Promise<AuthenticatedDriverDTO> {
    return { id: payload.id };
  }
}

export async function validateToken(token: string): Promise<Record<string, unknown>> {
  // Le client WS envoie le JWT brut (initialPayload.authToken), sans prefixe
  // Bearer ; on le retire malgre tout par robustesse s'il est present.
  const raw =
    typeof token === 'string' && token.startsWith('Bearer ')
      ? token.slice('Bearer '.length)
      : token;
  // VERIFIE LA SIGNATURE avec le secret derive de l'audience driver. Toute
  // signature invalide / jeton expire / malforme leve une exception, qui
  // remonte au onConnect de la subscription et REJETTE la connexion WS
  // (fail-closed). On ne renvoie jamais d'id issu d'un jeton non verifie.
  const payload = jwt.verify(raw, getDriverJwtSecret(), {
    algorithms: ['HS256'],
  }) as { id: number };
  Logger.log(`validated driver socket: ${payload.id}`);
  return {
    id: payload.id
  };
}