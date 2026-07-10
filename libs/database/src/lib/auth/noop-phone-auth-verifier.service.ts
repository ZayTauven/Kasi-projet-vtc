import { Injectable, Logger } from '@nestjs/common';
import { IPhoneAuthVerifier } from './interfaces/phone-auth-verifier.interface';

@Injectable()
export class NoOpPhoneAuthVerifier implements IPhoneAuthVerifier {
  private readonly logger = new Logger(NoOpPhoneAuthVerifier.name);

  async verifyToken(_token: string): Promise<{ phoneNumber: string }> {
    this.logger.warn(
      'Phone auth not configured — set FIREBASE_CONFIG or implement an alternative IPhoneAuthVerifier',
    );
    throw new Error(
      'Phone auth not configured — set FIREBASE_CONFIG or implement an alternative IPhoneAuthVerifier',
    );
  }
}
