import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'error_reporter.dart';

/// Crashlytics n'existe pas pour le web : chaque appel y est sans effet.
class CrashlyticsErrorReporter implements ErrorReporter {
  const CrashlyticsErrorReporter();

  @override
  FlutterExceptionHandler get fatalErrorHandler => kIsWeb
      ? FlutterError.presentError
      : FirebaseCrashlytics.instance.recordFlutterFatalError;

  @override
  void recordError(Object exception, StackTrace? stack,
      {bool fatal = false,
      String? reason,
      Iterable<Object> information = const []}) {
    if (kIsWeb) return;
    FirebaseCrashlytics.instance.recordError(exception, stack,
        fatal: fatal, reason: reason, information: information);
  }

  @override
  Future<void> setCollectionEnabled(bool enabled) async {
    if (kIsWeb) return;
    await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(enabled);
  }

  @override
  Future<void> setUserIdentifier(String identifier) async {
    if (kIsWeb) return;
    await FirebaseCrashlytics.instance.setUserIdentifier(identifier);
  }

  @override
  Future<void> setCustomKey(String key, String value) async {
    if (kIsWeb) return;
    await FirebaseCrashlytics.instance.setCustomKey(key, value);
  }
}
