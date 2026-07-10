import 'package:client_shared/unit_of_measurement.dart';

import './map_providers.dart';
import 'package:latlong2/latlong.dart';

bool demoMode = false;
String companyName = "kasi.app";
String appName = "Kasi";
MapProvider mapProvider = MapProvider.openStreetMap;
bool isGoogleMapsEnabled = true;
bool isMapBoxEnabled = true;
bool isOpenStreetMapEnabled = true;

// MapBox Configuration (Only if Map Provider is set to mapBox)
String mapBoxAccessToken = ""; // à définir localement, ne pas committer
String mapBoxUserId = "mapbox";
String mapBoxTileSetId = "streets-v12";

String loginTermsAndConditionsUrl = "";

String defaultCurrency = "XOF"; // Franc CFA (Sénégal)
String defaultCountryCode = "SN";
const List<double> tipPresets = [500, 1000, 2000]; // en XOF

// Dakar (Place de l'Indépendance) — remplace le fallback San José/Californie
// du template d'origine.
LatLng fallbackLocation = LatLng(14.6928, -17.4467);

// Menu website url
String? websiteUrl;

UnitOfMeasurement unitOfMeasurement = UnitOfMeasurement.metric;
