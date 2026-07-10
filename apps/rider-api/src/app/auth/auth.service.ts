import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RiderEntity } from '@kasi/database/rider-entity';
import { SharedRiderService } from '@kasi/order/shared-rider.service';
import {
  IPhoneAuthVerifier,
  PHONE_AUTH_VERIFIER,
} from '@kasi/database';

@Injectable()
export class AuthService {
  constructor(
    private riderService: SharedRiderService,
    private jwtService: JwtService,
    @Inject(PHONE_AUTH_VERIFIER)
    private readonly phoneAuthVerifier: IPhoneAuthVerifier,
  ) {}

  async validateUser(firebaseToken: string): Promise<RiderEntity> {
    const { phoneNumber } = await this.phoneAuthVerifier.verifyToken(firebaseToken);
    const number = phoneNumber.substring(1);
    const user = await this.riderService.findOrCreateUserWithMobileNumber(
      number,
    );
    return user;
  }

  async loginUser(user: RiderEntity): Promise<TokenObject> {
    const payload = { id: user.id };
    return {
      token: this.jwtService.sign(payload),
    };
  }
}

export type TokenObject = { token: string };
