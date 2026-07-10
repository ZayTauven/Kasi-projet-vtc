import 'package:flutter/foundation.dart';

abstract class ErrorReporter {
  FlutterExceptionHandler get fatalErrorHandler;
  void recordError(Object exception, StackTrace? stack, {bool fatal = false});
}
