abstract class PushTokenProvider {
  Future<String?> getToken();
  Stream<String> get onTokenRefresh;
}
