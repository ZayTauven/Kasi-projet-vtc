import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'error_reporter.dart';

class CrashlyticsErrorReporter implements ErrorReporter {
  @override
  FlutterExceptionHandler get fatalErrorHandler =>
      FirebaseCrashlytics.instance.recordFlutterFatalError;

  @override
  void recordError(Object exception, StackTrace? stack, {bool fatal = false}) {
    FirebaseCrashlytics.instance.recordError(exception, stack, fatal: fatal);
  }
}
