abstract class PhoneAuthRepository {
  Future<void> verifyPhoneNumber(
    String phoneNumber,
    int? resendToken,
    void Function(String verificationId, int? resendToken) onCodeSent,
    void Function(String authToken) onVerificationCompleted,
    void Function(String message) onError,
  );

  Future<void> verifyPhoneNumberWithCode(
    String verificationId,
    String smsCode,
    void Function(String authToken) onSignedIn,
    void Function(String message) onError,
  );
}
