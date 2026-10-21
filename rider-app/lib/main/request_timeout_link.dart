import 'dart:async';

import 'package:gql/ast.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

/// Délai des requêtes et mutations HTTP de l'app (bug-timeout).
const Duration graphQLRequestTimeout = Duration(seconds: 20);

/// Délai des requêtes et mutations HTTP, appliqué par un lien plutôt que par le
/// `queryRequestTimeout` du paquet `graphql` 5.2.4 (bug-timeout).
///
/// Le délai du paquet (`query_manager.dart`) pose `Stream.timeout` sur la
/// réponse sans annuler la requête : quand la réponse arrive après le délai, le
/// paquet rappelle `complete` sur un Completer déjà résolu par le
/// `TimeoutException` et lève « Bad state: Future already completed », hors de
/// tout appelant. Ce lien lève le même `TimeoutException` au même délai, puis
/// coupe l'écoute de la requête : la réponse tardive n'est plus livrée à
/// personne. Le client doit donc être créé avec `queryRequestTimeout: null`.
///
/// Pour l'appelant, rien ne change : le résultat porte la même exception
/// (`UnknownException(TimeoutException)`) qu'avec le délai du paquet. Les
/// souscriptions ne sont pas concernées (aucun délai, comme avant).
class RequestTimeoutLink extends Link {
  RequestTimeoutLink({this.timeout = graphQLRequestTimeout});

  final Duration timeout;

  @override
  Stream<Response> request(Request request, [NextLink? forward]) {
    if (request.isSubscription) return forward!(request);
    final operation = operationNameOf(request);
    StreamSubscription<Response>? upstream;
    Timer? timer;
    var closed = false;
    late final StreamController<Response> controller;

    void finish() {
      if (closed) return;
      closed = true;
      timer?.cancel();
      controller.close();
    }

    controller = StreamController<Response>(
      onListen: () {
        timer = Timer(timeout, () {
          if (closed) return;
          upstream?.cancel();
          controller.addError(TimeoutException(
              'Pas de réponse à $operation après ${timeout.inSeconds} s',
              timeout));
          finish();
        });
        upstream = forward!(request).listen(
          (response) {
            if (closed) return;
            timer?.cancel();
            controller.add(response);
          },
          onError: (Object error, StackTrace stack) {
            if (closed) return;
            timer?.cancel();
            controller.addError(error, stack);
          },
          onDone: finish,
        );
      },
      onCancel: () {
        closed = true;
        timer?.cancel();
        return upstream?.cancel();
      },
    );
    return controller.stream;
  }
}

/// Vrai si l'opération a échoué faute de réponse dans le délai (bug-timeout).
/// L'action a pu aboutir côté serveur : il faut relire l'état, pas la rejouer.
bool isRequestTimeout(OperationException? exception) {
  Object? current = exception?.linkException;
  for (var depth = 0; current != null && depth < 4; depth++) {
    if (current is TimeoutException) return true;
    current = current is LinkException ? current.originalException : null;
  }
  return false;
}

/// Nom de l'opération : les options générées ne renseignent pas
/// `operationName`, on le lit donc dans le document (même AST que le code
/// généré, paquet `gql`).
String operationNameOf(Request request) {
  final explicit = request.operation.operationName;
  if (explicit != null) return explicit;
  for (final definition in request.operation.document.definitions) {
    if (definition is OperationDefinitionNode && definition.name != null) {
      return definition.name!.value;
    }
  }
  return 'anonyme';
}
