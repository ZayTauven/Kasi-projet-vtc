import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import jwt_decode from 'jwt-decode';
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
  const res: any = jwt_decode(token);
  Logger.log(`validated rider socket: ${res.id}`);
  return {
    id: res.id
  };
}