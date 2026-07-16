import 'package:client_shared/config.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:kasi_rider/config.dart';
import 'package:kasi_rider/graphql/fragments/active-order.fragment.graphql.dart';
import 'package:kasi_rider/location_selection/location_selection_parent_view.dart';
import 'package:kasi_rider/location_selection/welcome_card/place_search_sheet_view.dart';
import 'package:kasi_rider/map/google_map/google_map_controller.dart';
import 'package:kasi_rider/map/map_view.dart';
import 'package:latlong2/latlong.dart' as latlong;
import 'package:kasi_rider/schema.gql.dart';

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

  @override
  Widget build(BuildContext context) {
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
              scrollGesturesEnabled: widget.interactive,
              zoomGesturesEnabled: widget.interactive,
              myLocationButtonEnabled: widget.interactive,
              zoomControlsEnabled: widget.interactive,
              tiltGesturesEnabled: widget.interactive,
              rotateGesturesEnabled: widget.interactive,
              onMapCreated: (controller) {
                widget.onControllerReady(this.controller);
                this.controller.mapController.complete(controller);
              },
              onCameraMoveStarted: () {
                widget.onMapMoved?.call(null);
              },
              onCameraIdle: () async {
                if (cameraPosition == null) return;
                final reverseGeocodeResult = await getReverseGeocode(
                    location: latlong.LatLng(cameraPosition!.target.latitude,
                        cameraPosition!.target.longitude),
                    language: placesCountry,
                    provider: Enum$GeoProvider.GOOGLE);
                widget.onMapMoved?.call(reverseGeocodeResult);
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
