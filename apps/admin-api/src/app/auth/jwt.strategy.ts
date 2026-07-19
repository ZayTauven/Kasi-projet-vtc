import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import jwt_decode from 'jwt-decode';
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
  const res: any = jwt_decode(token);
  return {
    id: res.id,
  };
}
