import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';
import 'app_integrity_checker.dart';

class FirebaseAppIntegrityChecker implements AppIntegrityChecker {
  @override
  Future<void> activate() => FirebaseAppCheck.instance.activate(
        webRecaptchaSiteKey: 'recaptcha-v3-site-key',
        androidProvider:
            kDebugMode ? AndroidProvider.debug : AndroidProvider.playIntegrity,
        appleProvider: kDebugMode
            ? AppleProvider.debug
            : AppleProvider.appAttestWithDeviceCheckFallback,
      );
}
