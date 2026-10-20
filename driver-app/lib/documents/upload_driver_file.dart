import 'dart:convert';

import 'package:kasi_driver/config.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import 'package:kasi_driver/graphql/order.fragment.graphql.dart';
import 'package:kasi_driver/session_token.dart';

enum UploadMedia { profile, document }

/// Type MIME d'après l'extension. `MultipartFile.fromPath` envoyait
/// `application/octet-stream`, que l'upload sécurisé du backend refuse (415) :
/// seuls JPEG, PNG, WebP et PDF sont acceptés.
MediaType? uploadContentType(String path) {
  final ext = path.split('.').last.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return MediaType('image', 'jpeg');
    case 'png':
      return MediaType('image', 'png');
    case 'webp':
      return MediaType('image', 'webp');
    case 'pdf':
      return MediaType('application', 'pdf');
    default:
      return null;
  }
}

/// Envoi d'un fichier du Kasiman (`POST /upload_profile` ou
/// `/upload_document`, inchangés), partagé par l'inscription et
/// « Mes documents » (p2-kyc K3).
Future<Fragment$DriverMedia> uploadDriverFile(
    String path, UploadMedia media) async {
  final postUri = Uri.parse(
      "$serverUrl${media == UploadMedia.profile ? "upload_profile" : "upload_document"}");
  final request = http.MultipartRequest("POST", postUri);
  final authorization = readStoredAuthorizationHeader();
  if (authorization == null) {
    throw Exception(
        'Session expiree : reconnectez-vous pour envoyer un fichier.');
  }
  request.headers['Authorization'] = authorization;
  request.files.add(await http.MultipartFile.fromPath('file', path,
      contentType: uploadContentType(path)));
  final streamedResponse = await request.send();
  final response = await http.Response.fromStream(streamedResponse);
  // Le statut n'etait pas verifie : sur 401/413/415/500 le `jsonDecode` puis
  // `Fragment$DriverMedia.fromJson` levaient sur une reponse d'erreur, en
  // masquant la cause reelle.
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw Exception(
        'Echec de l\'envoi du fichier (HTTP ${response.statusCode}).');
  }
  return Fragment$DriverMedia.fromJson(jsonDecode(response.body));
}
