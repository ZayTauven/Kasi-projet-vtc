import 'dart:io';

/// Erreur reseau de la plateforme (pas de reseau, TLS, connexion coupee).
bool isPlatformNetworkFailure(Object error) =>
    error is SocketException || error is TlsException || error is HttpException;
