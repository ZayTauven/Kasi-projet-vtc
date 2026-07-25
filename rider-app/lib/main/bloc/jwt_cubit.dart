import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kasi_rider/session_token.dart';

/// Jeton de session applicatif (JWT emis par rider-api), source unique de
/// l'entete `Authorization` du client GraphQL.
///
/// L'etat est desormais hydrate DES LA CONSTRUCTION depuis Hive. Auparavant le
/// cubit demarrait a `null` et n'etait alimente que depuis le `build()` d'une
/// vue : le premier `GraphQLClient` etait donc toujours cree sans entete puis
/// immediatement jete (cache perdu, WebSocket reconnectee), et si l'onboarding
/// n'etait pas termine la session n'etait jamais restauree du tout.
class JWTCubit extends Cubit<String?> {
  JWTCubit() : super(readStoredJwt());

  login(String jwt) {
    emit(jwt);
  }

  logOut() {
    emit(null);
  }
}
