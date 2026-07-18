import 'package:client_shared/config.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:kasi_rider/config.dart';

bool _mapSettingSynced = false;

/// Récupère la config carte du backend (éditable depuis le panel admin) et
/// l'applique aux globals via [applyMapSetting], en persistant le fournisseur
/// choisi dans la box Hive `settings`. Idempotent (une seule fois par session).
/// Silencieux en cas d'échec réseau/auth : on garde la config courante
/// (valeurs `--dart-define` de repli). Retourne true si une config a été appliquée.
Future<bool> bootstrapMapSetting() async {
  if (_mapSettingSynced) return false;
  try {
    final client = GraphQLClient(
      cache: GraphQLCache(),
      link: AuthLink(
        getToken: () async => 'Bearer ${Hive.box('user').get('jwt')}',
      ).concat(HttpLink('${serverUrl}graphql')),
    );
    final result = await client.query(
      QueryOptions(
        document: gql(
          'query { mapSetting { provider mapboxToken mapboxStyleUser mapboxStyleId googleMapsApiKey } }',
        ),
        fetchPolicy: FetchPolicy.networkOnly,
      ),
    );
    final data = result.data?['mapSetting'];
    if (data == null) return false;
    final providerId = applyMapSetting(Map<String, dynamic>.from(data));
    if (providerId != null) {
      await Hive.box('settings').put('mapProvider', providerId);
    }
    _mapSettingSynced = true;
    return true;
  } catch (_) {
    return false;
  }
}
