import 'dart:async';

import 'package:client_shared/components/marker_new.dart';
import 'package:client_shared/map_providers.dart';
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
import 'package:kasi_rider/map/map_view.dart';
import 'package:kasi_rider/schema.gql.dart';

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

  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      mapController: controller.mapController.mapController,
      options: MapOptions(
          interactiveFlags: widget.interactive
              ? (InteractiveFlag.drag |
                  InteractiveFlag.pinchZoom |
                  InteractiveFlag.doubleTapZoom |
                  InteractiveFlag.pinchMove)
              : InteractiveFlag.none,
          center: widget.initialLocation?.latlng,
          zoom: 18,
          onMapEvent: widget.mode != MapViewMode.picker
              ? null
              : (event) async {
                  if (event is MapEventMoveStart) {
                    widget.onMapMoved?.call(null);
                  } else if (event is MapEventMoveEnd) {
                    final x =
                        widget.markerKey.globalPaintBounds!.bottomCenter.dx;
                    final y =
                        widget.markerKey.globalPaintBounds!.bottomCenter.dy -
                            80;
                    final latLng = controller.mapController.mapController
                        .pointToLatLng(CustomPoint(x, y));

                    final place = await getReverseGeocode(
                        location: latLng,
                        language: placesCountry,
                        provider: Enum$GeoProvider.NOMINATIM);
                    widget.onMapMoved?.call(place);
                  }
                },
          onMapReady: () {
            widget.onControllerReady(controller);
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
                color: Colors.blue)
          ],
        ),
      ],
    );
  }
}
