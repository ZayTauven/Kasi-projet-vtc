import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kasi_rider/login/phone_auth_repository.dart';

import 'login_verify_code_event.dart';
import 'login_verify_code_state.dart';

class LoginVerifyCodeBloc
    extends Bloc<LoginVerifyCodeEvent, LoginVerifyCodeState> {
  final PhoneAuthRepository authRepository;
  final String phoneNumber;

  /// Identifiant de verification COURANT.
  ///
  /// Mutable a dessein : un renvoi de code produit un nouveau `verificationId`
  /// cote Firebase. Ce champ etait `final`, donc le nouvel identifiant etait
  /// purement jete et la saisie suivante etait validee contre l'ancien — un code
  /// correct etait alors refuse.
  String _verificationId;
  int? _resendToken;

  LoginVerifyCodeBloc(
      {required this.authRepository,
      required this.phoneNumber,
      required String verificationId,
      required int? resendToken})
      : _verificationId = verificationId,
        _resendToken = resendToken,
        super(const LoginVerifyCodeInputState()) {
    on<LoginVerifyCodeEnteredCodeEvent>((event, emit) async {
      emit(const LoginVerifyCodeLoadingState());
      authRepository.verifyPhoneNumberWithCode(
          _verificationId,
          event.code,
          (uid) => add(
              LoginVerifyCodeVerificationCompletedEvent(firebaseToken: uid)),
          (message) => add(LoginVerifyCodeErrorEvent(errorMessage: message)));
    });

    // Les trois callbacks utilisent `add()` et non `emit()`. `verifyPhoneNumber`
    // n'est pas attendu : ses callbacks s'executaient donc APRES la fin de ce
    // handler, ou `emit` leve « emit was called after an event handler
    // completed » (bloc 8.x). Le handler voisin utilisait deja `add()`.
    on<LoginVerifyCodeResendCodeRequestedEvent>((event, emit) async {
      emit(const LoginVerifyCodeLoadingState());
      authRepository.verifyPhoneNumber(
          phoneNumber,
          _resendToken,
          (verificationId, resendToken) => add(LoginVerifyCodeCodeResentEvent(
              verificationId: verificationId, resendToken: resendToken)),
          (firebaseToken) => add(LoginVerifyCodeVerificationCompletedEvent(
              firebaseToken: firebaseToken)),
          (message) => add(LoginVerifyCodeErrorEvent(errorMessage: message)));
    });

    on<LoginVerifyCodeCodeResentEvent>((event, emit) {
      _verificationId = event.verificationId;
      _resendToken = event.resendToken ?? _resendToken;
      // Remonte le nouvel identifiant a `LoginBloc` (via la page), qui detient
      // l'etat de reference et reconstruira ce bloc si besoin.
      emit(LoginVerifyCodeResentState(
          verificationId: _verificationId, resendToken: _resendToken));
    });

    on<LoginVerifyCodeVerificationCompletedEvent>((event, emit) {
      emit(LoginVerifyCodeVerificationCompletedState(uid: event.firebaseToken));
    });

    on<LoginVerifyCodeErrorEvent>((event, emit) {
      emit(LoginVerifyCodeErrorState(errorMessage: event.errorMessage));
    });
  }
}
