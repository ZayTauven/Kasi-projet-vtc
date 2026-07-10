export const PHONE_AUTH_VERIFIER = 'PHONE_AUTH_VERIFIER';

export interface IPhoneAuthVerifier {
  verifyToken(token: string): Promise<{ phoneNumber: string }>;
}
