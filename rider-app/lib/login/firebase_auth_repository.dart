import 'package:firebase_auth/firebase_auth.dart';
import 'phone_auth_repository.dart';

class FirebasePhoneAuthRepository implements PhoneAuthRepository {
  final _firebaseAuth = FirebaseAuth.instance;

  @override
  Future<void> verifyPhoneNumber(
      String phoneNumber,
      int? resendToken,
      void Function(String verificationId, int? resendToken) onCodeSent,
      void Function(String authToken) onVerificationCompleted,
      void Function(String message) onError) async {
    await _firebaseAuth.verifyPhoneNumber(
      phoneNumber: phoneNumber,
      timeout: const Duration(minutes: 2),
      verificationCompleted: (PhoneAuthCredential credential) async {
        final credentials =
            await _firebaseAuth.signInWithCredential(credential);
        final String firebaseToken = (await credentials.user!.getIdToken())!;
        onVerificationCompleted(firebaseToken);
      },
      verificationFailed: (FirebaseAuthException e) {
        onError(e.message ?? 'An error occurred!');
      },
      codeSent: (String verificationId, int? resendToken) {
        onCodeSent(verificationId, resendToken);
      },
      codeAutoRetrievalTimeout: (String verificationId) {},
    );
  }

  @override
  Future<void> verifyPhoneNumberWithCode(String verificationId, String smsCode,
      void Function(String authToken) onSignedIn,
      void Function(String message) onError) async {
    final PhoneAuthCredential credential = PhoneAuthProvider.credential(
      verificationId: verificationId,
      smsCode: smsCode,
    );
    try {
      final credentials = await _firebaseAuth.signInWithCredential(credential);
      final firebaseToken = await credentials.user?.getIdToken();
      if (firebaseToken != null) {
        onSignedIn(firebaseToken);
      } else {
        onError('An error occurred!');
      }
    } on FirebaseAuthException catch (e) {
      onError(e.message ?? 'An error occurred!');
    }
  }
}
