import 'package:firebase_messaging/firebase_messaging.dart';
import 'push_token_provider.dart';

class FcmPushTokenProvider implements PushTokenProvider {
  @override
  Future<String?> getToken() => FirebaseMessaging.instance.getToken();

  @override
  Stream<String> get onTokenRefresh => FirebaseMessaging.instance.onTokenRefresh;
}
