import { Inject, Injectable } from '@nestjs/common';
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

  async validateUser(firebaseToken: string): Promise<DriverEntity> {
    const { phoneNumber } = await this.phoneAuthVerifier.verifyToken(firebaseToken);
    const number = phoneNumber.substring(1);
    const user = await this.driverService.findOrCreateUserWithMobileNumber(
      number,
    );
    return user;
  }

  async loginUser(user: DriverEntity): Promise<TokenObject> {
    const payload = { id: user.id };
    return {
      token: this.jwtService.sign(payload),
    };
  }
}

export type TokenObject = { token: string };
