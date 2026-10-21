import 'dart:async';

import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:http/http.dart' as http;

import 'package:kasi_rider/main/request_timeout_link.dart';
import 'error_reporter.dart';
import 'network_failure_stub.dart'
    if (dart.library.io) 'network_failure_io.dart';

/// Lien GraphQL passif (p1-sentry) : remonte en non fatal les erreurs GraphQL
/// qui sont de vrais incidents. Il ne modifie ni la requete ni la reponse :
/// chaque evenement (donnee ou erreur, avec sa pile) est retransmis tel quel.
///
/// Ne remontent PAS, pour ne pas noyer les vrais incidents :
/// - les delais et coupures reseau (pas de reseau, socket fermee, 502/503/504) ;
/// - les refus metier : toute erreur portant un code (`FORBIDDEN`,
///   `UNAUTHENTICATED`, `QUOTE_*`, `KASIMAN_DEBT_LIMIT`, `DOCUMENT_*`...),
///   meme regle que `isExpectedError` cote API.
/// Remontent : erreur sans code, `INTERNAL_SERVER_ERROR`, et les erreurs de
/// contrat (`GRAPHQL_VALIDATION_FAILED`, `GRAPHQL_PARSE_FAILED`), signe d'un
/// ecart entre l'app installee et le schema.
///
/// Rien de la requete n'est transmis hormis le nom de l'operation : ni
/// variables (telephone, positions), ni entetes (jeton).
class GraphQLErrorReportingLink extends Link {
  GraphQLErrorReportingLink(this.reporter);

  final ErrorReporter reporter;

  static const _incidentCodes = {
    'INTERNAL_SERVER_ERROR',
    'GRAPHQL_VALIDATION_FAILED',
    'GRAPHQL_PARSE_FAILED',
  };

  @override
  Stream<Response> request(Request request, [NextLink? forward]) {
    // Les options générées ne renseignent pas `operationName` : nom lu dans
    // le document (voir request_timeout_link.dart).
    final operation = operationNameOf(request);
    return forward!(request).transform(
      StreamTransformer<Response, Response>.fromHandlers(
        handleData: (response, sink) {
          try {
            _reportGraphQLErrors(operation, response.errors);
          } catch (_) {
            // Le suivi des erreurs ne doit jamais perturber le flux GraphQL.
          }
          sink.add(response);
        },
        handleError: (error, stack, sink) {
          _reportException(operation, error, stack);
          sink.addError(error, stack);
        },
      ),
    );
  }

  void _reportGraphQLErrors(String operation, List<GraphQLError>? errors) {
    if (errors == null) return;
    for (final error in errors) {
      _reportIfIncident(
          operation, error.extensions?['code'], error.message, null);
    }
  }

  void _reportException(String operation, Object error, StackTrace stack) {
    try {
      if (_isNetworkFailure(error)) return;
      if (error is ServerException) {
        final errors = error.parsedResponse?.errors;
        if (errors != null && errors.isNotEmpty) {
          _reportGraphQLErrors(operation, errors);
          return;
        }
      }
      if (error is SubscriptionError) {
        final payload = error.payload;
        final items = payload is List ? payload : [payload];
        for (final item in items) {
          if (item is Map) {
            final extensions = item['extensions'];
            _reportIfIncident(operation,
                extensions is Map ? extensions['code'] : null,
                item['message']?.toString() ?? 'SubscriptionError', stack);
          }
        }
        return;
      }
      reporter.recordError(
          GraphQLIncident(operation, null, _scrub(_describe(error))),
          error is LinkException ? (error.originalStackTrace ?? stack) : stack,
          reason: 'pendant l\'operation GraphQL $operation');
    } catch (_) {
      // Le suivi des erreurs ne doit jamais perturber le flux GraphQL.
    }
  }

  void _reportIfIncident(
      String operation, Object? code, String message, StackTrace? stack) {
    final codeText = code?.toString() ?? '';
    if (codeText.isNotEmpty && !_incidentCodes.contains(codeText)) return;
    reporter.recordError(
        GraphQLIncident(
            operation, codeText.isEmpty ? null : codeText, _scrub(message)),
        stack ?? StackTrace.current,
        reason: 'pendant l\'operation GraphQL $operation');
  }

  /// Description sans la reponse analysee (qui peut porter des donnees
  /// personnelles) : type de l'exception, statut HTTP, cause d'origine.
  static String _describe(Object error) {
    if (error is LinkException) {
      final status = error is ServerException ? error.statusCode : null;
      return '${error.runtimeType}${status == null ? '' : ' (HTTP $status)'}'
          ': ${error.originalException ?? 'sans cause'}';
    }
    return error.toString();
  }

  static bool _isNetworkFailure(Object error) {
    Object? current = error;
    for (var depth = 0; current != null && depth < 4; depth++) {
      if (current is TimeoutException ||
          current is http.ClientException ||
          isPlatformNetworkFailure(current) ||
          // web_socket_channel n'est qu'une dependance transitive : reconnue
          // par son message plutot que par son type.
          current.toString().startsWith('WebSocketChannelException')) {
        return true;
      }
      if (current is HttpLinkServerException) {
        final status = current.statusCode;
        if (status == 502 || status == 503 || status == 504) return true;
      }
      current = current is LinkException ? current.originalException : null;
    }
    // Echec d'envoi sans aucune reponse du serveur : coupure reseau.
    return error is ServerException &&
        error is! HttpLinkServerException &&
        error.parsedResponse == null &&
        error.originalException == null;
  }

  /// Retire d'un message libre ce qui ressemble a un numero de telephone ou a
  /// un jeton.
  static String _scrub(String message) {
    final text = message
        .replaceAll(RegExp(r'eyJ[\w-]+\.[\w-]+\.[\w-]+'), '[filtre]')
        .replaceAll(RegExp(r'\+?\d[\d \-.]{6,}\d'), '[filtre]');
    return text.length > 300 ? '${text.substring(0, 300)}...' : text;
  }
}

/// Incident GraphQL rapporte a Crashlytics (regroupe par type d'exception).
class GraphQLIncident implements Exception {
  GraphQLIncident(this.operation, this.code, this.message);

  final String operation;
  final String? code;
  final String message;

  @override
  String toString() =>
      'GraphQLIncident($operation${code == null ? '' : ', $code'}): $message';
}
