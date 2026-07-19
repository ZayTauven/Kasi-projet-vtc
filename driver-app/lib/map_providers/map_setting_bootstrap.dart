import 'package:client_shared/config.dart';
import 'package:flutter/foundation.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:kasi_driver/config.dart';

bool _mapSettingSynced = false;

/// Récupère la config carte du backend (éditable depuis le panel admin) et
/// l'applique aux globals via [applyMapSetting], en persistant le fournisseur
/// choisi dans la box Hive `settings`. Idempotent (une seule fois par session).
/// Silencieux en cas d'échec réseau : on garde la config courante
/// (valeurs `--dart-define` de repli). Retourne true si une config a été appliquée.
///
/// Requête PUBLIQUE, volontairement SANS AuthLink : elle est appelée au démarrage,
/// avant tout login. Ne pas dépendre de la box Hive `user`, qui n'est pas
/// nécessairement ouverte à ce moment-là.
/// `googleMapsApiKey` n'est plus exposé par le DTO mobile — ne pas le redemander,
/// GraphQL rejetterait la requête entière.
/// [attempts] : la 1re tentative part pendant l'initialisation de l'app, quand le
/// thread principal est saturé (en debug on observe >200 frames sautées et des
/// GC) ; le délai de la couche transport peut alors expirer alors que le réseau
/// est parfaitement sain. On retente donc quelques fois avec une pause, plutôt
/// que d'abandonner la synchro panel pour toute la session sur un seul échec de
/// timing. Compte aussi en production, sur réseau mobile lent.
Future<bool> bootstrapMapSetting({int attempts = 3}) async {
  for (var i = 0; i < attempts; i++) {
    if (await _tryFetchMapSetting()) return true;
    if (i < attempts - 1) {
      await Future<void>.delayed(Duration(seconds: 2 * (i + 1)));
    }
  }
  return false;
}

Future<bool> _tryFetchMapSetting() async {
  if (_mapSettingSynced) return false;
  try {
    final client = GraphQLClient(
      cache: GraphQLCache(),
      link: HttpLink('${serverUrl}graphql'),
    );
    final result = await client.query(
      QueryOptions(
        document: gql(
          'query { mapSetting { provider mapboxToken mapboxStyleUser mapboxStyleId } }',
        ),
        fetchPolicy: FetchPolicy.networkOnly,
      ),
    );
    final data = result.data?['mapSetting'];
    if (data == null) {
      // Sans cette trace, un ECHEC est indiscernable d'un souci réseau : c'est
      // ici que se logent les vraies causes (erreur GraphQL, champ inconnu,
      // URL de serveur erronée).
      debugPrint('[BOOTSTRAP CARTE] echec — url=${serverUrl}graphql '
          'exception=${result.exception}');
      return false;
    }
    final providerId = applyMapSetting(Map<String, dynamic>.from(data));
    if (providerId != null) {
      await Hive.box('settings').put('mapProvider', providerId);
    }
    _mapSettingSynced = true;
    return true;
  } catch (e) {
    debugPrint('[BOOTSTRAP CARTE] exception — url=${serverUrl}graphql '
        '${e.runtimeType}: $e');
    return false;
  }
}
