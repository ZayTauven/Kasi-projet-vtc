import 'package:client_shared/unit_of_measurement.dart';

import './map_providers.dart';
import 'package:latlong2/latlong.dart';

bool demoMode = false;
String companyName = "kasigroupe.com";
String appName = "Kasi";
// Mapbox par défaut si un token est fourni au build, sinon fallback OpenStreetMap.
MapProvider mapProvider = mapBoxAccessToken.isNotEmpty
    ? MapProvider.mapBox
    : MapProvider.openStreetMap;
bool isGoogleMapsEnabled = true;
bool isMapBoxEnabled = true;
bool isOpenStreetMapEnabled = true;

// MapBox Configuration (Only if Map Provider is set to mapBox)
// Token public (pk.*) — valeur de REPLI injectée au build via
//   flutter build apk --dart-define=MAPBOX_TOKEN=pk....
// À l'exécution, `applyMapSetting` (config MapSetting du backend, éditable depuis
// le panel) peut écraser cette valeur. Vide et sans override → fallback OSM.
String mapBoxAccessToken = const String.fromEnvironment('MAPBOX_TOKEN');
String mapBoxUserId = "mapbox";
String mapBoxTileSetId = "streets-v12";

// Clé Google Maps (repli build-time). NB : sur mobile la clé du SDK Google Maps
// est NATIVE (AndroidManifest / Info.plist, compile-time) ; cette valeur ne sert
// que si un chemin runtime la consomme. Le panel peut la stocker/afficher.
String googleMapsApiKey = const String.fromEnvironment('GOOGLE_MAPS_API_KEY');

/// Applique une config MapSetting reçue du backend aux globals de carte.
/// Renvoie l'identifiant de provider ('mapbox' | 'openstreet' | 'googlemap')
/// à persister dans Hive par l'app appelante, ou null si provider inconnu.
/// Non destructif : ne remplace un champ que si le backend fournit une valeur.
String? applyMapSetting(Map<String, dynamic> m) {
  final token = m['mapboxToken'] as String?;
  if (token != null) mapBoxAccessToken = token;
  final styleUser = m['mapboxStyleUser'] as String?;
  if (styleUser != null && styleUser.isNotEmpty) mapBoxUserId = styleUser;
  final styleId = m['mapboxStyleId'] as String?;
  if (styleId != null && styleId.isNotEmpty) mapBoxTileSetId = styleId;
  final gKey = m['googleMapsApiKey'] as String?;
  if (gKey != null) googleMapsApiKey = gKey;
  switch (m['provider'] as String?) {
    case 'Mapbox':
      mapProvider = MapProvider.mapBox;
      return 'mapbox';
    case 'Google':
      mapProvider = MapProvider.googleMap;
      return 'googlemap';
    case 'OpenStreetMap':
      mapProvider = MapProvider.openStreetMap;
      return 'openstreet';
  }
  return null;
}

String loginTermsAndConditionsUrl = "";

String defaultCurrency = "XOF"; // Franc CFA (Sénégal)

// ---------------------------------------------------------------------------
// Pays d'exploitation
// ---------------------------------------------------------------------------
// Kasi n'opère qu'au Sénégal. Les écrans d'authentification affichaient
// pourtant un sélecteur listant ~250 pays, et l'indicatif proposé par défaut
// était celui de la locale de l'appareil (« +1 » sur un téléphone configuré en
// anglais US) — donc un indicatif qu'aucun Kasiman ni client ne peut utiliser.
//
// Tant que `allowCountrySelection` est `false`, l'indicatif est figé à celui de
// `operatingCountryCode` et affiché en lecture seule. Le jour où Kasi se
// franchise hors du Sénégal, remettre ce drapeau à `true` suffit à réafficher
// le sélecteur complet : aucun autre fichier n'est à modifier.
const bool allowCountrySelection = false;

/// Code ISO 3166-1 **alpha-2** du pays d'exploitation — pas un indicatif
/// téléphonique. La distinction compte : `defaultCountryCode` était écrasé au
/// démarrage par `CountryCodes.detailsForLocale().dialCode` (« +1 »), donc la
/// même variable contenait tantôt « SN », tantôt « +1 », et
/// `CountryCode.fromCountryCode()` ne savait plus la résoudre.
const String operatingCountryCode = "SN";

/// Indicatif téléphonique correspondant, pour les libellés en lecture seule.
const String operatingDialCode = "+221";

String defaultCountryCode = operatingCountryCode;
const List<double> tipPresets = [500, 1000, 2000]; // en XOF

// Dakar (Place de l'Indépendance) — remplace le fallback San José/Californie
// du template d'origine.
LatLng fallbackLocation = LatLng(14.6928, -17.4467);

// Menu website url
String? websiteUrl;

UnitOfMeasurement unitOfMeasurement = UnitOfMeasurement.metric;
