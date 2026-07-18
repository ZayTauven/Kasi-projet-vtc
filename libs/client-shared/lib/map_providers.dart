import 'package:flutter_map/flutter_map.dart';

import 'config.dart';

final TileLayer openStreetTileLayer = TileLayer(
  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  maxNativeZoom: 18,
  //tileProvider: NetworkTileProvider(),
);

// Getter (et non `final`) : relit les globals à chaque accès, pour que le token
// et le style appliqués à l'exécution par `applyMapSetting` (config backend)
// soient pris en compte sans redémarrage.
TileLayer get mapBoxTileLayer => TileLayer(
      urlTemplate:
          "https://api.mapbox.com/styles/v1/$mapBoxUserId/$mapBoxTileSetId/tiles/256/{z}/{x}/{y}@2x?access_token=$mapBoxAccessToken",
      additionalOptions: {"access_token": mapBoxAccessToken},
      maxNativeZoom: 18,
    );

enum MapProvider { openStreetMap, googleMap, mapBox }

/// Résout l'identifiant du fournisseur de carte EFFECTIF.
///
/// `saved` = valeur Hive `settings`.'mapProvider', qui est AUTORITAIRE car
/// réécrite au démarrage depuis la config MapSetting du backend (éditable au
/// panel) via `applyMapSetting`. On honore donc un choix explicite
/// (mapbox / openstreet / googlemap). En l'absence de valeur (jamais synchronisé,
/// hors-ligne au 1er lancement), repli bulletproof : Mapbox si un token de repli
/// est présent (--dart-define), sinon OpenStreetMap.
String effectiveMapProviderId(String? saved) {
  if (saved == 'googlemap' || saved == 'mapbox' || saved == 'openstreet') {
    return saved!;
  }
  return mapBoxAccessToken.isNotEmpty ? 'mapbox' : 'openstreet';
}
