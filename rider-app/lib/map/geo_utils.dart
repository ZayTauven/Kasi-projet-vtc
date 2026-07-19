import 'dart:async';

import 'package:client_shared/config.dart';
import 'package:client_shared/map_providers.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:latlong2/latlong.dart';
import 'package:kasi_rider/schema.gql.dart';

/// Fournisseur de géocodage EFFECTIF pour les queries backend
/// (`reverseGeocode`, `getPlaces`, `GetDriversLocation`).
///
/// Source de vérité : Hive `settings`.'mapProvider', réécrit au démarrage
/// depuis la config MapSetting du panel ; repli sur le global `mapProvider`
/// (--dart-define). NE JAMAIS coder un provider en dur dans une query : le
/// backend Kasi n'a pas de clé Google, un `reverseGeocode(GOOGLE)` jette et
/// fait échouer TOUTE la query qui le contient (drivers compris).
Enum$GeoProvider effectiveGeoProvider() {
  final saved = Hive.box('settings').get('mapProvider');
  var provider = mapProvider;
  if (saved == 'googlemap') {
    provider = MapProvider.googleMap;
  } else if (saved == 'mapbox') {
    provider = MapProvider.mapBox;
  } else if (saved == 'openstreet') {
    provider = MapProvider.openStreetMap;
  }
  return provider == MapProvider.googleMap
      ? Enum$GeoProvider.GOOGLE
      : (provider == MapProvider.mapBox
          ? Enum$GeoProvider.MAPBOX
          : Enum$GeoProvider.NOMINATIM);
}

/// Adresse de repli quand le géocodage inverse échoue : les coordonnées
/// formatées (« 14.6928, -17.4467 »). Permet de ne JAMAIS laisser le bouton
/// de confirmation d'emplacement désactivé faute de libellé résolu.
String formatLatLngAddress(LatLng latlng) =>
    '${latlng.latitude.toStringAsFixed(4)}, '
    '${latlng.longitude.toStringAsFixed(4)}';

/// Acquisition robuste de la position GPS.
/// Séquence : service activé → permission (demandée si nécessaire) →
/// `getCurrentPosition` borné dans le temps, repli `getLastKnownPosition`.
/// Chaque étape est protégée : tout échec renvoie null (l'appelant reste sur
/// son fallback), jamais d'exception ni de blocage.
Future<Position?> acquireCurrentPosition(
    {Duration timeout = const Duration(seconds: 10)}) async {
  try {
    if (!await Geolocator.isLocationServiceEnabled()) return null;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return null;
    }
    try {
      return await Geolocator.getCurrentPosition(timeLimit: timeout);
    } catch (_) {
      // Timeout ou erreur plateforme : dernière position connue, si disponible.
      if (kIsWeb) return null; // getLastKnownPosition non supporté sur web
      return await Geolocator.getLastKnownPosition();
    }
  } catch (_) {
    return null;
  }
}
