import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_animations/flutter_map_animations.dart';
import 'package:latlong2/latlong.dart';
import 'package:kasi_rider/map/map_view.dart';

class FlutterMapController implements MapViewController {
  final AnimatedMapController mapController;

  FlutterMapController({required this.mapController});

  @override
  void fitBounds(List<LatLng> points) {
    // `LatLngBounds.fromPoints` leve une assertion sur une liste vide
    // ("points.isNotEmpty") -> plantage si appele avant que les points de
    // la course (pickup/destination) ne soient tous resolus. Pas la peine
    // de recadrer sur rien : on ignore silencieusement l'appel.
    if (points.isEmpty) return;
    // `animatedFitBounds(bounds)` a été remplacé par
    // `animatedFitCamera(cameraFit: CameraFit.bounds(bounds: ...))`.
    mapController.animatedFitCamera(
        cameraFit: CameraFit.bounds(bounds: LatLngBounds.fromPoints(points)));
  }

  @override
  void moveCamera(LatLng location, double? zoom) {
    mapController.animateTo(dest: location, zoom: zoom);
  }

  @override
  Future<LatLng> getCenter() async {
    // Le getter `.center` direct sur `MapController` a migré vers l'objet
    // `MapCamera` exposé par `MapController.camera`.
    return mapController.mapController.camera.center;
  }

  @override
  dispose() {
    mapController.dispose();
  }
}
