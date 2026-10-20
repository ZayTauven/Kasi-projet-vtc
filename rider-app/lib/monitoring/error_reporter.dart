import 'package:flutter/foundation.dart';

/// Point unique de remontee des erreurs (p1-sentry). L'implementation
/// concrete est Crashlytics ([CrashlyticsErrorReporter]) ; le reste de l'app
/// ne depend que de cette interface.
abstract class ErrorReporter {
  FlutterExceptionHandler get fatalErrorHandler;

  /// [reason] et [information] ne doivent jamais contenir de donnee
  /// personnelle (telephone, nom, jeton, variables de requete).
  void recordError(Object exception, StackTrace? stack,
      {bool fatal = false,
      String? reason,
      Iterable<Object> information = const []});

  Future<void> setCollectionEnabled(bool enabled);

  /// Identifiant INTERNE de l'utilisateur (id en base), chaine vide a la
  /// deconnexion. Jamais le telephone, le nom ni le jeton.
  Future<void> setUserIdentifier(String identifier);

  Future<void> setCustomKey(String key, String value);
}
