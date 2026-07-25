abstract class LoginVerifyCodeEvent {
  const LoginVerifyCodeEvent();
}

class LoginVerifyCodeEnteredCodeEvent extends LoginVerifyCodeEvent {
  final String code;

  const LoginVerifyCodeEnteredCodeEvent({required this.code});
}

class LoginVerifyCodeVerificationCompletedEvent extends LoginVerifyCodeEvent {
  final String firebaseToken;

  const LoginVerifyCodeVerificationCompletedEvent(
      {required this.firebaseToken});
}

class LoginVerifyCodeResendCodeRequestedEvent extends LoginVerifyCodeEvent {
  const LoginVerifyCodeResendCodeRequestedEvent();
}

/// Firebase a confirme l'envoi d'un nouveau code et fourni un nouveau
/// `verificationId`. Dispatche depuis le callback de `verifyPhoneNumber` via
/// `add()` — et non `emit()`, qui etait appele apres la fin du handler et levait
/// « emit was called after an event handler completed ».
class LoginVerifyCodeCodeResentEvent extends LoginVerifyCodeEvent {
  final String verificationId;
  final int? resendToken;

  const LoginVerifyCodeCodeResentEvent(
      {required this.verificationId, this.resendToken});
}

class LoginVerifyCodeErrorEvent extends LoginVerifyCodeEvent {
  final String errorMessage;
  const LoginVerifyCodeErrorEvent({required this.errorMessage});
}

class LoginVerifyCodeChangePhoneNumberEvent extends LoginVerifyCodeEvent {
  const LoginVerifyCodeChangePhoneNumberEvent();
}
