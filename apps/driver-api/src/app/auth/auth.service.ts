import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DriverEntity } from '@kasi/database/driver.entity';

import { DriverService } from '../driver/driver.service';
import {
  IPhoneAuthVerifier,
  PHONE_AUTH_VERIFIER,
} from '@kasi/database';

@Injectable()
export class AuthService {
  constructor(
    private driverService: DriverService,
    private jwtService: JwtService,
    @Inject(PHONE_AUTH_VERIFIER)
    private readonly phoneAuthVerifier: IPhoneAuthVerifier,
  ) {}

  async validateUser(
    firebaseToken: string,
  ): Promise<{ user: DriverEntity; isNewUser: boolean }> {
    const { phoneNumber } = await this.phoneAuthVerifier.verifyToken(
      firebaseToken,
    );
    // `verifyToken` peut renvoyer `undefined` si aucune des identites attendues
    // n'est presente dans le jeton : sans ce controle, `phoneNumber.substring(1)`
    // levait un TypeError remonte au client comme une erreur serveur opaque.
    if (phoneNumber == null || phoneNumber.length < 2) {
      throw new UnauthorizedException(
        'No phone number found in the provided Firebase token',
      );
    }
    const number = phoneNumber.substring(1);
    return this.driverService.findOrCreateUserWithMobileNumberEx(number);
  }

  async loginUser(user: DriverEntity): Promise<TokenObject> {
    const payload = { id: user.id };
    return {
      token: this.jwtService.sign(payload),
    };
  }
}

export type TokenObject = { token: string };
