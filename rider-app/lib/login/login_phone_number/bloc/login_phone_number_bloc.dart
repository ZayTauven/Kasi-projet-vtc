import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kasi_rider/login/phone_auth_repository.dart';
import 'package:kasi_rider/login/login_phone_number/bloc/login_phone_number_event.dart';
import 'package:kasi_rider/login/login_phone_number/bloc/login_phone_number_state.dart';

class LoginPhoneNumberBloc
    extends Bloc<LoginPhoneNumberEvent, LoginPhoneNumberState> {
  final PhoneAuthRepository authRepository;
  LoginPhoneNumberBloc({required this.authRepository})
      : super(const LoginPhoneNumberInitialState()) {
    on<LoginPhoneNumberRequestedEvent>((event, emit) {
      emit(const LoginPhoneNumberLoadingState());
      // Numero au format international, reutilise tel quel en aval.
      final fullPhoneNumber = event.countryCode + event.phoneNumber;
      authRepository.verifyPhoneNumber(fullPhoneNumber, null,
          (String verificationId, int? resendToken) {
        add(LoginPhoneNumberCodeSentEvent(
          // On propage le numero COMPLET (avec indicatif), pas le numero local.
          // L'ancien code transmettait `event.phoneNumber` : ce numero tronque
          // finissait dans `LoginVerifyCodeBloc`, qui rappelait Firebase avec un
          // numero invalide au renvoi de code, et l'envoyait tel quel a
          // `SkipVerification` — creant un compte distinct de celui du premier
          // ecran, qui envoie bien l'indicatif.
          phoneNumber: fullPhoneNumber,
          verificationId: verificationId,
          resendToken: resendToken,
        ));
      }, (String firebaseToken) {
        add(LoginPhoneNumberVerificationCompletedEvent(
          firebaseToken: firebaseToken,
        ));
      }, (String message) {
        add(LoginPhoneNumberErrorEvent(message: message));
      });
    });

    on<LoginPhoneNumberVerificationCompletedEvent>((event, emit) {
      emit(LoginPhoneNumberVerificationCompletedState(
          firebaseToken: event.firebaseToken));
    });

    on<LoginPhoneNumberErrorEvent>((event, emit) {
      emit(LoginPhoneNumberErrorState(message: event.message));
    });

    on<LoginPhoneNumberCodeSentEvent>((event, emit) {
      emit(LoginPhoneNumberCodeSentState(
          phoneNumber: event.phoneNumber,
          verificationId: event.verificationId,
          resendToken: event.resendToken));
    });
  }
}
