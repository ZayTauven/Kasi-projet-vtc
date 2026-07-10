import { Injectable } from '@nestjs/common';
import { auth } from 'firebase-admin';
import { IPhoneAuthVerifier } from './interfaces/phone-auth-verifier.interface';

@Injectable()
export class FirebasePhoneAuthVerifier implements IPhoneAuthVerifier {
  async verifyToken(token: string): Promise<{ phoneNumber: string }> {
    try {
      const decodedToken = await auth().verifyIdToken(token);
      const phoneNumber =
        (decodedToken.firebase?.identities?.['phone_number']?.[0] as string | undefined) ??
        (decodedToken.firebase?.identities?.['phone']?.[0] as string | undefined) ??
        decodedToken.phone_number;
      return { phoneNumber };
    } catch (error) {
      if ((error as any)?.code === 'app/no-app') {
        throw new Error('Firebase not configured');
      }
      throw error;
    }
  }
}
