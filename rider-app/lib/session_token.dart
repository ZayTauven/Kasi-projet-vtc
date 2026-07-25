import 'package:firebase_auth/firebase_auth.dart';
import 'package:hive_flutter/hive_flutter.dart';

/// Lit le jeton de session persiste (box Hive `user`, cle `jwt`).
///
/// Renvoie `null` — et non la chaine `"null"` — quand aucune session n'est
/// ouverte. C'est tout l'objet de ce helper : le code appelait
/// `Hive.box('user').get('jwt').toString()`, qui produit litteralement `"null"`
/// pour une cle absente. La valeur n'etant alors jamais vide, tout invite etait
/// traite comme authentifie et les requetes partaient avec
/// `Authorization: Bearer null`.
String? readStoredJwt() {
  final stored = Hive.box('user').get('jwt');
  if (stored is! String || stored.isEmpty || stored == 'null') {
    return null;
  }
  return stored;
}

/// Entete `Authorization` prete a l'emploi, ou `null` s'il n'y a pas de session.
String? readStoredAuthorizationHeader() {
  final jwt = readStoredJwt();
  return jwt == null ? null : 'Bearer $jwt';
}

/// Ferme la session : deconnecte Firebase PUIS efface le jeton applicatif.
///
/// La deconnexion Firebase manquait completement : le logout ne supprimait que
/// le JWT de Hive, laissant l'utilisateur Firebase connecte.
Future<void> clearSession() async {
  try {
    await FirebaseAuth.instance.signOut();
  } catch (_) {
    // Pas de session Firebase active (ou plugin indisponible) : l'effacement du
    // jeton applicatif ci-dessous reste le point important.
  }
  await Hive.box('user').delete('jwt');
}
