import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kasi_rider/login/bloc/login_event.dart';
import 'package:kasi_rider/login/bloc/login_state.dart';

class LoginBloc extends Bloc<LoginEvent, LoginState> {
  LoginBloc() : super(const LoginInputNumberState()) {
    on<LoginCodeSentEvent>((event, emit) async {
      emit(LoginInputCodeState(
          verificationId: event.verificationId,
          resendToken: event.resendToken,
          phoneNumber: event.phoneNumber,
          lastSendCodeAt: DateTime.now()));
    });

    // Renvoi de code : on conserve le numero mais on adopte le NOUVEAU
    // `verificationId`, sans quoi la saisie suivante est validee contre l'ancien.
    // Rafraichit `lastSendCodeAt`, donc rearme le compte a rebours du bouton.
    on<LoginCodeResentEvent>((event, emit) async {
      final current = state;
      if (current is! LoginInputCodeState) {
        return;
      }
      emit(LoginInputCodeState(
          verificationId: event.verificationId,
          resendToken: event.resendToken ?? current.resendToken,
          phoneNumber: current.phoneNumber,
          lastSendCodeAt: DateTime.now()));
    });

    // Aiguillage decide par le backend (`Login.isNewUser`) : un utilisateur deja
    // inscrit rejoint directement sa session au lieu de repasser par le
    // formulaire de nom, ce qui etait le cas pour TOUT LE MONDE auparavant.
    on<LoginVerificationCompletedEvent>((event, emit) async {
      if (event.isNewUser) {
        emit(LoginInputNameState(jwtToken: event.jwtToken));
      } else {
        emit(LoginSessionReadyState(jwtToken: event.jwtToken));
      }
    });

    on<LoginNameSubmittedEvent>(
      (event, emit) async {
        emit(const LoginSuccessState());
      },
    );

    on<LoginChangePhoneNumberEvent>(
      (event, emit) async {
        emit(const LoginInputNumberState());
      },
    );
  }
}
