import 'dart:async';

import 'package:client_shared/components/marker_new.dart';
import 'package:client_shared/config.dart';
import 'package:client_shared/map_providers.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_animations/flutter_map_animations.dart';
import 'package:flutter_map_location_marker/flutter_map_location_marker.dart';
import 'package:latlong2/latlong.dart';
import 'package:kasi_rider/config.dart';
import 'package:kasi_rider/graphql/fragments/active-order.fragment.graphql.dart';
import 'package:kasi_rider/location_selection/location_selection_parent_view.dart';
import 'package:kasi_rider/location_selection/welcome_card/place_search_sheet_view.dart';
import 'package:kasi_rider/main/bloc/main_bloc.dart';
import 'package:kasi_rider/map/flutter_map/flutter_map_controller.dart';
import 'package:kasi_rider/map/geo_utils.dart';
import 'package:kasi_rider/map/map_view.dart';

class FlutterMapView extends StatefulWidget {
  final Function(FullLocation?)? onMapMoved;
  final MapProvider provider;
  final MapViewMode mode;
  final bool interactive;
  final FullLocation? initialLocation;
  final List<Fragment$Point> polylinePoints;
  final List<FullLocation> positionMarkers;
  final List<LatLng> driverMarkers;
  final Function(MapViewController) onControllerReady;
  final EdgeInsets padding;
  final GlobalKey markerKey;

  const FlutterMapView(
      {Key? key,
      this.initialLocation,
      required this.polylinePoints,
      required this.positionMarkers,
      required this.driverMarkers,
      required this.mode,
      required this.onControllerReady,
      required this.onMapMoved,
      required this.interactive,
      required this.padding,
      required this.provider,
      required this.markerKey})
      : super(key: key);

  @override
  State<FlutterMapView> createState() => _FlutterMapViewState();
}

class _FlutterMapViewState extends State<FlutterMapView>
    with TickerProviderStateMixin {
  late final FlutterMapController controller =
      FlutterMapController(mapController: AnimatedMapController(vsync: this));

  /// Géocode inverse de l'emplacement pointé par le marqueur central et remonte
  /// le résultat via [onMapMoved]. Partagé entre la fin de déplacement et la
  /// résolution initiale, pour que les deux chemins restent cohérents.
  Future<void> _resolveCenterAddress() async {
    if (!mounted) return;
    // Le marqueur central n'est pas encore mesuré au tout premier passage : on
    // retombe alors sur le centre de la carte, géométriquement équivalent ici.
    final bounds = widget.markerKey.globalPaintBounds;
    final LatLng latLng;
    if (bounds != null) {
      latLng = controller.mapController.mapController.pointToLatLng(
        CustomPoint(bounds.bottomCenter.dx, bounds.bottomCenter.dy - 80),
      );
    } else {
      latLng = controller.mapController.mapController.center;
    }
    final place = await getReverseGeocode(
      location: latLng,
      language: placesCountry,
      // Provider EFFECTIF (config panel) — NOMINATIM en dur ignorait le
      // provider configuré (mapbox) et pouvait échouer côté backend.
      provider: effectiveGeoProvider(),
    );
    if (!mounted) return;
    // Repli : si le géocodage échoue (réseau/backend KO), on remonte quand
    // même une FullLocation avec les coordonnées formatées en guise
    // d'adresse, pour que « Confirmer l'emplacement » ne reste JAMAIS
    // désactivé : l'utilisateur peut confirmer une position sans libellé.
    widget.onMapMoved?.call(place ??
        FullLocation(
            title: '', address: formatLatLngAddress(latLng), latlng: latLng));
  }

  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      mapController: controller.mapController.mapController,
      options: MapOptions(
          // Un sélecteur (`MapViewMode.picker`) est TOUJOURS manipulable, même
          // si l'appelant a oublié `interactive: true` — dont la valeur par
          // défaut est `false` (voir MapView). Sans cela la carte reste figée,
          // `MapEventMoveEnd` ne part jamais, `onMapMoved` n'est jamais appelé,
          // et le bouton « Confirmer l'emplacement », piloté par `location !=
          // null`, reste désactivé À VIE. C'était le cas de
          // `place_confirm_sheet_view` (et de l'ancien
          // `address_location_selection_view`, depuis supprimé).
          // L'invariant est encodé ici, une fois, plutôt que dans chaque appelant.
          interactiveFlags: (widget.interactive ||
                  widget.mode == MapViewMode.picker)
              ? (InteractiveFlag.drag |
                  InteractiveFlag.pinchZoom |
                  InteractiveFlag.doubleTapZoom |
                  InteractiveFlag.pinchMove)
              : InteractiveFlag.none,
          // `initialLocation` peut être null (position pas encore résolue) ;
          // sans repli, flutter_map centrerait sur sa valeur par défaut codée
          // en dur, LatLng(50.5, 30.51) = Kiev.
          center: widget.initialLocation?.latlng ?? fallbackLocation,
          zoom: 18,
          onMapEvent: widget.mode != MapViewMode.picker
              ? null
              : (event) async {
                  if (event is MapEventMoveStart) {
                    widget.onMapMoved?.call(null);
                  } else if (event is MapEventMoveEnd) {
                    await _resolveCenterAddress();
                  }
                },
          onMapReady: () {
            widget.onControllerReady(controller);
            // Résout l'adresse du centre INITIAL en mode sélecteur.
            // Auparavant `onMapMoved` n'était appelé qu'après un déplacement
            // manuel : à l'ouverture, `location` restait null et le bouton de
            // confirmation était désactivé alors que la carte montrait déjà un
            // emplacement valide (la position courante). L'utilisateur devait
            // deviner qu'il fallait bouger la carte pour l'activer.
            // Post-frame : la mise en page doit être terminée pour que le
            // marqueur central ait des bornes exploitables.
            if (widget.mode == MapViewMode.picker &&
                widget.initialLocation == null) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                _resolveCenterAddress();
              });
            }
          }),
      children: [
        if (widget.provider == MapProvider.openStreetMap) openStreetTileLayer,
        if (widget.provider == MapProvider.mapBox) mapBoxTileLayer,
        CurrentLocationLayer(
            followOnLocationUpdate: FollowOnLocationUpdate.never),
        MarkerLayer(
            markers: widget.driverMarkers
                .map((e) => Marker(
                    builder: (context) => Image.asset('images/marker_taxi.png'),
                    point: e))
                .toList()),
        MarkerLayer(
          anchorPos: AnchorPos.align(AnchorAlign.bottom),
          markers: widget.positionMarkers
              .map((e) => Marker(
                  width: 240,
                  height: 63,
                  builder: (context) => MarkerNew(address: e.address),
                  point: e.latlng))
              .toList(),
        ),
        PolylineLayer(
          polylines: [
            Polyline(
                points: widget.polylinePoints.map((e) => e.toLatLng()).toList(),
                strokeWidth: 5,
                color: CustomTheme.primaryColors)
          ],
        ),
      ],
    );
  }
}
