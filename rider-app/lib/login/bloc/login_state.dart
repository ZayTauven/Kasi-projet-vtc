import 'package:equatable/equatable.dart';

abstract class LoginState extends Equatable {
  const LoginState();
}

class LoginInputNumberState extends LoginState {
  const LoginInputNumberState();

  @override
  List<Object> get props => [];
}

class LoginInputCodeState extends LoginState {
  final String phoneNumber;
  final String verificationId;
  final int? resendToken;
  final DateTime lastSendCodeAt;
  const LoginInputCodeState(
      {required this.phoneNumber,
      required this.verificationId,
      required this.resendToken,
      required this.lastSendCodeAt});

  @override
  List<Object> get props =>
      [phoneNumber, verificationId, resendToken ?? '', lastSendCodeAt];
}

class LoginInputNameState extends LoginState {
  final String jwtToken;

  const LoginInputNameState({required this.jwtToken});

  @override
  List<Object> get props => [jwtToken];
}

/// Utilisateur DEJA inscrit : la session est ouverte, il n'y a plus rien a
/// saisir, on le renvoie directement dans son espace.
///
/// Auparavant cet etat n'existait pas : `LoginVerificationCompletedEvent`
/// emettait `LoginInputNameState` sans condition, donc un utilisateur deja
/// inscrit devait repasser par le formulaire de nom (pre-rempli) et re-valider
/// avant de retrouver sa session.
class LoginSessionReadyState extends LoginState {
  final String jwtToken;

  const LoginSessionReadyState({required this.jwtToken});

  @override
  List<Object> get props => [jwtToken];
}

class LoginSuccessState extends LoginState {
  const LoginSuccessState();

  @override
  List<Object> get props => [];
}
