import 'package:equatable/equatable.dart';

abstract class LoginVerifyCodeState extends Equatable {
  const LoginVerifyCodeState();

  @override
  List<Object> get props => [];
}

class LoginVerifyCodeInputState extends LoginVerifyCodeState {
  const LoginVerifyCodeInputState();

  @override
  List<Object> get props => [];
}

class LoginVerifyCodeErrorState extends LoginVerifyCodeState {
  final String errorMessage;

  const LoginVerifyCodeErrorState({required this.errorMessage});

  @override
  List<Object> get props => [errorMessage];
}

class LoginVerifyCodeLoadingState extends LoginVerifyCodeState {
  const LoginVerifyCodeLoadingState();

  @override
  List<Object> get props => [];
}

/// Un nouveau SMS a ete envoye : porte le NOUVEAU `verificationId` afin que
/// `LoginBloc` remplace celui qu'il detient. Sans cela, la saisie suivante etait
/// validee contre l'identifiant peri me et Firebase repondait « code invalide »
/// meme pour un code correct.
class LoginVerifyCodeResentState extends LoginVerifyCodeState {
  final String verificationId;
  final int? resendToken;

  const LoginVerifyCodeResentState(
      {required this.verificationId, this.resendToken});

  @override
  List<Object> get props => [verificationId, resendToken ?? ''];
}

class LoginVerifyCodeVerificationCompletedState extends LoginVerifyCodeState {
  final String uid;

  const LoginVerifyCodeVerificationCompletedState({required this.uid});

  @override
  List<Object> get props => [uid];
}
