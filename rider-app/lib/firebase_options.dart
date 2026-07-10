// File generated manually from the deployed Firebase Kasi config files
// (android/app/google-services.json, ios/Runner/GoogleService-Info.plist),
// following the format produced by the `flutterfire configure` CLI, because
// that CLI was not run in this environment. See KASI_DECISIONS.md for
// details and a recommendation to regenerate this file with the official
// FlutterFire CLI when credentials/CLI access are available.
// ignore_for_file: type=lint
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Default [FirebaseOptions] for use with your Firebase apps.
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'DefaultFirebaseOptions have not been configured for web - '
        'no web app is registered for this project in Firebase.',
      );
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for macos - '
          'no macos app is registered for this project in Firebase.',
        );
      case TargetPlatform.windows:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for windows - '
          'no windows app is registered for this project in Firebase.',
        );
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for linux - '
          'no linux app is registered for this project in Firebase.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyAbABkucR05gIWydW6tx-c_lh3YWyGa0oM',
    appId: '1:463506235281:android:dd379ea41371f469f38430',
    messagingSenderId: '463506235281',
    projectId: 'kasi-v1',
    storageBucket: 'kasi-v1.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyAgpdO00Gb7MG0IEOBevUqiVnwqAPg6dPI',
    appId: '1:463506235281:ios:4b7864ad8ec23663f38430',
    messagingSenderId: '463506235281',
    projectId: 'kasi-v1',
    storageBucket: 'kasi-v1.firebasestorage.app',
    iosBundleId: 'com.kasi.taxi.rider',
  );
}
