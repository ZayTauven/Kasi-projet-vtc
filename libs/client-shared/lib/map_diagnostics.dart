import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import 'config.dart';
import 'map_providers.dart';

/// Sonde de diagnostic des tuiles de carte — DEBUG UNIQUEMENT.
///
/// Raison d'être : `flutter_map` 5.0.0 avale la vraie erreur de chargement de
/// tuile. Dans `network_image_provider.dart`, `_loadAsync` fait `catch (_)` sur
/// l'échec primaire puis retente avec `fallbackUrl ?? ''`, ce qui produit un
/// `ArgumentError: No host specified in URI` trompeur : le statut HTTP et le
/// corps de la réponse Mapbox (ex. « Not Authorized - Invalid Token ») sont
/// perdus. Cette sonde refait la même requête explicitement, depuis la pile
/// réseau de l'appareil, et journalise ce que Mapbox répond réellement.
///
/// [bootstrapOk] = résultat de `bootstrapMapSetting()` ; [savedProviderId] =
/// valeur BRUTE de Hive `settings`.'mapProvider' lue par l'app appelante.
/// Ces deux valeurs sont indispensables : la globale `mapProvider` reflète le
/// défaut COMPILÉ (`--dart-define`), alors que les widgets carte décident, eux,
/// à partir de la valeur Hive. Les journaliser séparément évite de conclure
/// « on est en Mapbox » alors qu'un `'openstreet'` périmé en cache pilote
/// réellement l'affichage.
///
/// No-op en release : ne coûte rien en production.
Future<void> debugProbeMapTiles({
  bool? bootstrapOk,
  String? savedProviderId,
}) async {
  if (!kDebugMode) return;

  // Tuile fixe (Dakar, z=16) : peu importe laquelle, seule la réponse compte.
  const z = 16, x = 38323, y = 22082;
  final mapboxUrl =
      'https://api.mapbox.com/styles/v1/$mapBoxUserId/$mapBoxTileSetId'
      '/tiles/256/$z/$x/$y@2x?access_token=$mapBoxAccessToken';
  const osmUrl = 'https://tile.openstreetmap.org/$z/$x/$y.png';

  debugPrint('=== SONDE CARTE ===');
  // Le token est un `pk.*` public, mais on n'en journalise que les extrémités :
  // assez pour repérer une troncature ou un token différent de celui attendu,
  // sans déverser la valeur entière dans les logs.
  final t = mapBoxAccessToken;
  debugPrint('sync panel (bootstrap) : '
      '${bootstrapOk == null ? "?" : (bootstrapOk ? "OK" : "ECHEC")}');
  debugPrint('Hive mapProvider (AUTORITAIRE pour les widgets) : '
      '${savedProviderId ?? "(absent)"}');
  debugPrint('-> couche effectivement rendue : '
      '${effectiveMapProviderId(savedProviderId)}');
  debugPrint('global mapProvider (defaut COMPILE, non autoritaire) '
      ': $mapProvider');
  debugPrint('style=$mapBoxUserId/$mapBoxTileSetId');
  debugPrint('token: longueur=${t.length} '
      'debut=${t.length >= 8 ? t.substring(0, 8) : t} '
      'fin=${t.length >= 6 ? t.substring(t.length - 6) : ""}');

  await _probe('Mapbox', mapboxUrl);
  await _probe('OpenStreetMap (repli)', osmUrl);
  debugPrint('=== FIN SONDE ===');
}

Future<void> _probe(String label, String url) async {
  try {
    final r = await http.get(
      Uri.parse(url),
      headers: {'User-Agent': 'flutter_map (com.kasi.taxi)'},
    ).timeout(const Duration(seconds: 15));
    final ct = r.headers['content-type'] ?? '?';
    debugPrint('$label -> HTTP ${r.statusCode}  '
        'type=$ct  taille=${r.bodyBytes.length}o');
    // Une réponse non-image porte le motif du refus (JSON d'erreur Mapbox).
    if (r.statusCode != 200 || !ct.startsWith('image/')) {
      final body = r.body;
      debugPrint('$label corps: '
          '${body.substring(0, body.length > 200 ? 200 : body.length)}');
    }
  } catch (e) {
    // Ici on capture ce que flutter_map masquait : DNS, TLS, timeout, socket.
    debugPrint('$label -> ECHEC RESEAU: ${e.runtimeType} — $e');
  }
}
