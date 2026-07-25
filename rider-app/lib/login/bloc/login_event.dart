import 'package:equatable/equatable.dart';

abstract class LoginEvent extends Equatable {
  const LoginEvent();
}

class LoginCodeSentEvent extends LoginEvent {
  final String phoneNumber;
  final String verificationId;
  final int? resendToken;

  const LoginCodeSentEvent(
      {required this.phoneNumber,
      required this.verificationId,
      this.resendToken});

  @override
  List<Object> get props => [phoneNumber];
}

class LoginVerificationCompletedEvent extends LoginEvent {
  final String jwtToken;

  /// Renvoye par la mutation `Login` du backend : `true` uniquement si ce numero
  /// vient d'etre enregistre. Seule source fiable pour decider entre onboarding
  /// et retour direct en session — le client n'avait auparavant aucun moyen de
  /// faire la difference.
  final bool isNewUser;

  const LoginVerificationCompletedEvent(
      {required this.jwtToken, required this.isNewUser});

  @override
  List<Object> get props => [jwtToken, isNewUser];
}

/// Un NOUVEAU code SMS a ete envoye (bouton « renvoyer »).
///
/// Indispensable : le `verificationId` renvoye par Firebase lors du renvoi etait
/// purement jete, et la saisie suivante etait donc validee contre l'ancien
/// identifiant — un code de test parfaitement correct etait refuse. Rafraichit
/// aussi `lastSendCodeAt`, donc le compte a rebours du bouton.
class LoginCodeResentEvent extends LoginEvent {
  final String verificationId;
  final int? resendToken;

  const LoginCodeResentEvent({required this.verificationId, this.resendToken});

  @override
  List<Object> get props => [verificationId, resendToken ?? ''];
}

class LoginNameSubmittedEvent extends LoginEvent {
  const LoginNameSubmittedEvent();

  @override
  List<Object> get props => [];
}

class LoginErrorEvent extends LoginEvent {
  final String message;

  const LoginErrorEvent({required this.message});

  @override
  List<Object> get props => [message];
}

class LoginChangePhoneNumberEvent extends LoginEvent {
  const LoginChangePhoneNumberEvent();

  @override
  List<Object?> get props => [];
}
