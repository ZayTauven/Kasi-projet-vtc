import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';
import 'package:flutter_map/flutter_map.dart';

import 'config.dart';

// Journalise l'échec de CHAQUE tuile — debug uniquement.
// Sans ce rappel, un échec de tuile est invisible : flutter_map avale l'erreur
// primaire (`catch (_)` dans network_image_provider) et l'écran se contente de
// rester vide. Distingue « les tuiles échouent » (des lignes apparaissent) de
// « les tuiles ne sont jamais demandées » (aucune ligne, carte vide quand même),
// deux causes radicalement différentes.
void _logTileError(TileImage tile, Object error, StackTrace? _) {
  if (!kDebugMode) return;
  debugPrint('[TUILE KO] z=${tile.coordinates.z} '
      'x=${tile.coordinates.x} y=${tile.coordinates.y} '
      '-> ${error.runtimeType}: $error');
}

// Gabarit OSM partagé : sert de couche principale ET de repli pour Mapbox.
const String _osmUrlTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// ─── Réglages de performance des tuiles, partagés par les deux couches ───
//
// `keepBuffer` (défaut 2) : anneau de tuiles conservées HORS écran. Le relever
// évite de re-télécharger ce qu'on vient de quitter lors d'un zoom/déplacement
// brusque suivi d'un retour — cas très fréquent.
const int _keepBuffer = 4;

// `panBuffer` : anneau de tuiles PRÉCHARGÉES autour de la vue.
// LAISSÉ À 0 (le défaut) DÉLIBÉRÉMENT. Une valeur de 1 avait été essayée pour
// masquer la latence lors des déplacements, mais elle fait passer le nombre de
// tuiles demandées EN PARALLÈLE d'environ 15 à ~35 : sans limite de connexions
// par hôte côté Dart, cette rafale provoque des `TimeoutException` sur réseau
// mobile, et le repli OSM s'active alors à tort. On préfère une carte Mapbox
// fiable à un préchargement qui la fait échouer. Ne pas relever sans mesurer.
// NB : cette mesure date de la grille 256. Le passage de Mapbox à la grille
// 512 divise par ~4 le nombre de tuiles par vue (~6 visibles au lieu de ~15) ;
// un panBuffer de 1 redeviendrait peut-être viable, mais UNIQUEMENT après une
// nouvelle mesure sur réseau mobile réel — la latence perçue est déjà
// largement réduite par la grille 512 elle-même.
const int _panBuffer = 0;

// `TileDisplay.fadeIn()` par défaut impose un fondu de 100 ms AVANT qu'une tuile
// déjà téléchargée ne devienne visible. En affichage instantané, elle apparaît
// dès qu'elle est prête : gain purement perceptuel, mais c'est exactement ce que
// l'on ressent lors d'un zoom brusque.
const TileDisplay _tileDisplay = TileDisplay.instantaneous();

// Les tuiles en erreur sont libérées dès qu'elles sortent de la vue (en
// respectant `keepBuffer`), au lieu d'être conservées indéfiniment.
const EvictErrorTileStrategy _evictErrorTiles =
    EvictErrorTileStrategy.notVisibleRespectMargin;

/// Relève le plafond du cache image de Flutter (défaut : 100 Mo / 1000 images).
/// Une carte consomme beaucoup d'entrées : lors d'un zoom rapide, le cache par
/// défaut évince des tuiles encore utiles, qu'il faut alors re-télécharger —
/// c'est perçu comme une lenteur alors que c'est une éviction. À appeler une
/// fois au démarrage, avant `runApp`.
void configureMapImageCache() {
  PaintingBinding.instance.imageCache
    ..maximumSizeBytes = 200 << 20 // 200 Mo
    ..maximumSize = 2000;
}

// `userAgentPackageName` : la politique d'usage des tuiles OSM exige un
// User-Agent identifiant l'application ; sans lui les requêtes peuvent être
// bloquées. D'autant plus important qu'OSM est désormais le repli de Mapbox.
const String _userAgentPackageName = 'com.kasi.taxi';

final TileLayer openStreetTileLayer = TileLayer(
  urlTemplate: _osmUrlTemplate,
  userAgentPackageName: _userAgentPackageName,
  errorTileCallback: _logTileError,
  keepBuffer: _keepBuffer,
  panBuffer: _panBuffer,
  tileDisplay: _tileDisplay,
  evictErrorTileStrategy: _evictErrorTiles,
  maxNativeZoom: 18,
  //tileProvider: NetworkTileProvider(),
);

// Getter (et non `final`) : relit les globals à chaque accès, pour que le token
// et le style appliqués à l'exécution par `applyMapSetting` (config backend)
// soient pris en compte sans redémarrage.
//
// `fallbackUrl` est ESSENTIEL, pas cosmétique : dans flutter_map 5.0.0,
// `_loadAsync` fait `catch (_)` sur l'échec de la tuile primaire puis retente
// avec `fallbackUrl ?? ''`. Sans repli, cela produit une carte entièrement
// BLANCHE et un `ArgumentError: No host specified in URI` trompeur qui masque
// la cause réelle (l'erreur primaire est avalée par le `catch`).
// En repliant sur OSM, une panne Mapbox (réseau, TLS, quota, token révoqué)
// dégrade vers une carte lisible au lieu du vide — ce qui compte d'autant plus
// sur des réseaux mobiles instables.
//
// GRILLE 512 (`tiles/512/...` + `tileSize: 512` + `zoomOffset: -1`) : l'API
// Static Tiles de Mapbox sert nativement des tuiles de 512 px ; une seule
// tuile 512 couvre la surface de quatre tuiles 256 → ~4× moins de requêtes
// HTTP pour la même vue, d'où des déplacements bien plus fluides sur réseau
// mobile. flutter_map calcule alors la grille x/y sur 2^(z-1) cellules et
// `zoomOffset: -1` fait pointer {z} de l'URL sur ce même niveau — c'est le
// schéma standard Leaflet pour les tuiles 512.
//
// COMPATIBILITÉ DU REPLI OSM AVEC LA GRILLE 512 : le fallback partage les
// x/y/z de la couche (z déjà décalé de -1). Une tuile OSM 256 px à z-1 couvre
// EXACTEMENT la même cellule géographique que la tuile Mapbox 512 à ce z :
// l'alignement reste correct, l'image est simplement étirée 2× (moins nette).
// Panne Mapbox → carte OSM floue mais lisible et JAMAIS blanche. Vérifié sur
// flutter_map 5.0.0 : `_getTileUrl` applique le même zoomOffset au fallback.
//
// `maxNativeZoom: 18` inchangé : avec le décalage, l'URL plafonne à z=17 en
// grille 512, soit exactement le même niveau de détail que z=18 en 256.
TileLayer get mapBoxTileLayer => TileLayer(
      urlTemplate:
          "https://api.mapbox.com/styles/v1/$mapBoxUserId/$mapBoxTileSetId/tiles/512/{z}/{x}/{y}@2x?access_token=$mapBoxAccessToken",
      fallbackUrl: _osmUrlTemplate,
      userAgentPackageName: _userAgentPackageName,
      errorTileCallback: _logTileError,
      keepBuffer: _keepBuffer,
      panBuffer: _panBuffer,
      tileDisplay: _tileDisplay,
      evictErrorTileStrategy: _evictErrorTiles,
      additionalOptions: {"access_token": mapBoxAccessToken},
      tileSize: 512,
      zoomOffset: -1,
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
///
/// GARDE-FOU : on ne sélectionne JAMAIS Mapbox sans token. Sans cela, un Hive
/// disant `'mapbox'` (écrit par une synchro panel réussie) combiné à un token
/// absent — build sans `--dart-define-from-file`, ou synchro échouée après
/// réinstallation — fait partir chaque tuile avec `access_token=` vide : Mapbox
/// répond 401 et la carte reste GRISE. Ce cas se manifeste comme une
/// « instabilité » (la carte marche quand la synchro aboutit, pas sinon).
/// OSM ne demandant pas de clé, il est toujours affichable : mieux vaut une
/// carte OSM qu'un écran vide.
String effectiveMapProviderId(String? saved) {
  if (saved == 'mapbox' && mapBoxAccessToken.isEmpty) return 'openstreet';
  if (saved == 'googlemap' || saved == 'mapbox' || saved == 'openstreet') {
    return saved!;
  }
  return mapBoxAccessToken.isNotEmpty ? 'mapbox' : 'openstreet';
}
