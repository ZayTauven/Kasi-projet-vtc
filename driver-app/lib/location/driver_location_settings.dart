import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

/// Construit les réglages du flux de position du chauffeur.
///
/// Sur Android, on active un service de premier plan (notification
/// persistante) : sans lui, dès que l'app passe en arrière-plan ou que l'écran
/// s'éteint, le système suspend les mises à jour GPS — le chauffeur disparaît
/// alors de la carte et ne reçoit plus de courses. `enableWakeLock` maintient
/// le CPU éveillé pour continuer à recevoir les positions, `setOngoing` rend la
/// notification non balayable tant que le suivi est actif.
///
/// Les autres plateformes (iOS, web) retombent sur des `LocationSettings`
/// standard : le suivi arrière-plan iOS est géré par `UIBackgroundModes`.
LocationSettings buildDriverLocationSettings({
  required String notificationTitle,
  required String notificationText,
  required String notificationChannelName,
}) {
  if (defaultTargetPlatform == TargetPlatform.android) {
    return AndroidSettings(
      accuracy: LocationAccuracy.best,
      distanceFilter: 50,
      foregroundNotificationConfig: ForegroundNotificationConfig(
        notificationTitle: notificationTitle,
        notificationText: notificationText,
        notificationChannelName: notificationChannelName,
        enableWakeLock: true,
        setOngoing: true,
      ),
    );
  }
  return const LocationSettings(distanceFilter: 50);
}

/// Demande la permission de localisation en arrière-plan
/// (ACCESS_BACKGROUND_LOCATION).
///
/// Contrainte Android 10+ : cette permission doit être demandée SÉPARÉMENT et
/// APRÈS la permission de premier plan (le système refuse de les combiner dans
/// une seule invite). On ne la sollicite donc que lorsque le chauffeur passe en
/// ligne, une fois `whileInUse` déjà accordée.
///
/// Dégradation gracieuse : en cas de refus, on ne bloque rien — l'app reste
/// pleinement utilisable écran allumé.
Future<void> requestBackgroundLocationPermission() async {
  final permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.whileInUse) {
    // whileInUse accordée : une nouvelle demande propose l'option « Toujours
    // autoriser » nécessaire au suivi arrière-plan.
    await Geolocator.requestPermission();
  }
}
