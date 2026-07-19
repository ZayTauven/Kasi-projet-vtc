import 'package:client_shared/config.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:kasi_rider/config.dart';
import 'package:kasi_rider/graphql/fragments/active-order.fragment.graphql.dart';
import 'package:kasi_rider/location_selection/location_selection_parent_view.dart';
import 'package:kasi_rider/location_selection/welcome_card/place_search_sheet_view.dart';
import 'package:kasi_rider/map/geo_utils.dart';
import 'package:kasi_rider/map/google_map/google_map_controller.dart';
import 'package:kasi_rider/map/map_view.dart';
import 'package:latlong2/latlong.dart' as latlong;

class GoogleMapView extends StatefulWidget {
  final MapViewMode mode;
  final bool interactive;
  final Function(FullLocation?)? onMapMoved;
  final FullLocation? initialLocation;
  final List<Fragment$Point> polylinePoints;
  final List<FullLocation> positionMarkers;
  final List<latlong.LatLng> driverMarkers;
  final Function(MapViewController) onControllerReady;
  final EdgeInsets padding;

  const GoogleMapView(
      {Key? key,
      this.initialLocation,
      required this.polylinePoints,
      this.positionMarkers = const <FullLocation>[],
      this.driverMarkers = const <latlong.LatLng>[],
      required this.mode,
      required this.onControllerReady,
      this.onMapMoved,
      required this.interactive,
      required this.padding})
      : super(key: key);

  @override
  State<GoogleMapView> createState() => _GoogleMapMapViewState();
}

class _GoogleMapMapViewState extends State<GoogleMapView> {
  final GoogleMapsController controller = GoogleMapsController();
  CameraPosition? cameraPosition;

  @override
  void dispose() {
    controller.mapController.future.then((value) => value.dispose());
    super.dispose();
  }

  /// Géocode inverse de [latLng] et remonte le résultat via [onMapMoved],
  /// avec repli coordonnées formatées si le géocodage échoue — parité avec
  /// `flutter_map_view._resolveCenterAddress` : sans repli, le bouton
  /// « Confirmer l'emplacement » (piloté par `location != null`) peut rester
  /// désactivé à vie.
  Future<void> _resolveAddress(latlong.LatLng latLng) async {
    final place = await getReverseGeocode(
        location: latLng,
        language: placesCountry,
        // Provider EFFECTIF (config panel) — jamais GOOGLE en dur.
        provider: effectiveGeoProvider());
    if (!mounted) return;
    widget.onMapMoved?.call(place ??
        FullLocation(
            title: '', address: formatLatLngAddress(latLng), latlng: latLng));
  }

  @override
  Widget build(BuildContext context) {
    // Invariant partagé avec flutter_map_view : un sélecteur
    // (MapViewMode.picker) est TOUJOURS manipulable, même si l'appelant a
    // oublié `interactive: true` (défaut false dans MapView).
    final canInteract =
        widget.interactive || widget.mode == MapViewMode.picker;
    return FutureBuilder(
        future: Future.wait([
          BitmapDescriptor.fromAssetImage(
              const ImageConfiguration(size: Size(128, 128)),
              "images/marker.png",
              mipmaps: false),
          BitmapDescriptor.fromAssetImage(
              const ImageConfiguration(size: Size(128, 128)),
              "images/marker_taxi.png")
        ]),
        builder: (context, snapshot) {
          return GoogleMap(
              padding: widget.padding,
              scrollGesturesEnabled: canInteract,
              zoomGesturesEnabled: canInteract,
              myLocationButtonEnabled: canInteract,
              zoomControlsEnabled: canInteract,
              tiltGesturesEnabled: canInteract,
              rotateGesturesEnabled: canInteract,
              onMapCreated: (controller) {
                widget.onControllerReady(this.controller);
                this.controller.mapController.complete(controller);
                // Résolution d'adresse INITIALE en mode sélecteur quand aucune
                // position n'est fournie (parité flutter_map_view) : sans
                // elle, le bouton de confirmation reste grisé tant qu'on ne
                // bouge pas la carte.
                if (widget.mode == MapViewMode.picker &&
                    widget.initialLocation == null) {
                  _resolveAddress(fallbackLocation);
                }
              },
              onCameraMoveStarted: () {
                widget.onMapMoved?.call(null);
              },
              onCameraIdle: () async {
                if (cameraPosition == null) return;
                await _resolveAddress(latlong.LatLng(
                    cameraPosition!.target.latitude,
                    cameraPosition!.target.longitude));
              },
              onCameraMove: widget.mode != MapViewMode.picker
                  ? null
                  : (position) async => cameraPosition = position,
              markers: getMapMarkers(widget.positionMarkers,
                  widget.driverMarkers, snapshot.data?[0], snapshot.data?[1]),
              polylines: {
                Polyline(
                    polylineId: const PolylineId("polyline"),
                    points: widget.polylinePoints
                        .map((e) => LatLng(e.lat, e.lng))
                        .toList(),
                    color: CustomTheme.primaryColors,
                    width: 5)
              },
              initialCameraPosition: CameraPosition(
                target: widget.initialLocation != null
                    ? LatLng(widget.initialLocation!.latlng.latitude,
                        widget.initialLocation!.latlng.longitude)
                    : LatLng(
                        fallbackLocation.latitude, fallbackLocation.longitude),
                zoom: 16,
              ));
        });
  }

  getMapMarkers(
      List<FullLocation> positionMarkers,
      List<latlong.LatLng> driverMarkers,
      BitmapDescriptor? positionIcon,
      BitmapDescriptor? driverIcon) {
    List<Marker> markers = [];
    positionMarkers.asMap().forEach((key, element) {
      markers.add(Marker(
          markerId: MarkerId(key.toString()),
          position: LatLng(element.latlng.latitude, element.latlng.longitude),
          infoWindow:
              InfoWindow(title: element.title, snippet: element.address),
          icon: positionIcon ??
              BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue)));
    });
    for (var element in driverMarkers) {
      markers.add(Marker(
          markerId: MarkerId(
              element.latitude.toString() + element.longitude.toString()),
          position: LatLng(element.latitude, element.longitude),
          icon: driverIcon ??
              BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed)));
    }
    return markers.toSet();
  }
}
