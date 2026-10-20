import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:kasi_driver/config.dart';
import 'package:kasi_driver/session_token.dart';

import 'crashlytics_error_reporter.dart';
import 'error_reporter.dart';

/// Rapporteur d'erreurs de l'app (p1-sentry).
const ErrorReporter errorReporter = CrashlyticsErrorReporter();

/// Environnement rapporte a Crashlytics (cle `environment`). Surchargeable au
/// build : `--dart-define=KASI_ENV=staging`. A defaut, deduit de l'adresse du
/// backend : production pour kasigroupe.tech, local sinon.
String get crashReportingEnvironment {
  const fromBuild = String.fromEnvironment('KASI_ENV');
  if (fromBuild.isNotEmpty) return fromBuild;
  return serverUrl.contains('kasigroupe.tech') ? 'production' : 'local';
}

/// Branche Crashlytics (p1-sentry). A appeler juste apres
/// `Firebase.initializeApp` : erreurs du framework et erreurs asynchrones non
/// attrapees remontees en fatal, collecte coupee en debug, cles d'environnement.
Future<void> setupCrashReporting() async {
  await errorReporter.setCollectionEnabled(!kDebugMode);
  FlutterError.onError = errorReporter.fatalErrorHandler;
  // Erreurs asynchrones hors widgets (Future non attendue, callback de
  // platform channel...) : sans ce gestionnaire, elles ne remontaient pas.
  PlatformDispatcher.instance.onError = (error, stack) {
    // Seule exception au fatal : `Future already completed`. Le paquet
    // `graphql` 5.2.4 la leve quand une reponse arrive apres le delai de 20 s
    // (`queryRequestTimeout`, voir graphql_provider.dart) : c'est la
    // consequence d'un delai reseau (bug-timeout), pas un plantage. Elle reste
    // visible, en non fatal, sans fausser le taux de sessions sans plantage.
    final lateResponse =
        error is StateError && error.message == 'Future already completed';
    errorReporter.recordError(error, stack,
        fatal: !lateResponse,
        reason: lateResponse
            ? 'pendant une reponse GraphQL tardive (bug-timeout)'
            : null);
    return true;
  };
  await errorReporter.setCustomKey('environment', crashReportingEnvironment);
  await errorReporter.setCustomKey(
      'build_mode',
      kReleaseMode
          ? 'release'
          : kProfileMode
              ? 'profile'
              : 'debug');
}

/// Suit la session (box Hive `user`, cle `jwt`) et rapporte l'identifiant
/// interne de l'utilisateur, lu dans la charge utile du jeton (`{ id }`, voir
/// auth.service.ts des API). Le jeton lui-meme n'est jamais transmis. A appeler
/// apres `Hive.openBox('user')`.
void bindCrashReportingUser() {
  void update() =>
      errorReporter.setUserIdentifier(_userIdFromJwt(readStoredJwt()) ?? '');
  update();
  Hive.box('user').listenable(keys: ['jwt']).addListener(update);
}

String? _userIdFromJwt(String? jwt) {
  if (jwt == null) return null;
  final parts = jwt.split('.');
  if (parts.length != 3) return null;
  try {
    final payload = jsonDecode(
        utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))));
    final id = payload is Map ? payload['id'] : null;
    return id?.toString();
  } catch (_) {
    return null;
  }
}
