import 'package:client_shared/map_providers.dart';
import 'package:kasi_rider/map/map_setting_bootstrap.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_animations/flutter_map_animations.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:latlong2/latlong.dart';
import 'package:kasi_rider/config.dart';
import 'package:kasi_rider/main/order.graphql.dart';
import 'package:kasi_rider/schema.gql.dart';
import '../../location_selection/welcome_card/place_search_sheet_view.dart';
import '../bloc/current_location_cubit.dart';
import '../bloc/main_bloc.dart';
import 'package:flutter_map_location_marker/flutter_map_location_marker.dart';
import 'package:geolocator/geolocator.dart';

class OpenStreetMapProvider extends StatefulWidget {
  final double bottomSheetHeight;
  const OpenStreetMapProvider({Key? key, required this.bottomSheetHeight})
      : super(key: key);

  @override
  OpenStreetMapState createState() => OpenStreetMapState();
}

class OpenStreetMapState extends State<OpenStreetMapProvider>
    with TickerProviderStateMixin {
  late final controller = AnimatedMapController(vsync: this);

  @override
  void initState() {
    super.initState();
    // Synchronise le fournisseur/token de carte depuis la config backend (panel).
    bootstrapMapSetting().then((changed) {
      if (changed && mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    var mainBloc = context.read<MainBloc>();
    return FlutterMap(
        mapController: controller.mapController,
        options: MapOptions(
            keepAlive: true,
            boundsOptions: FitBoundsOptions(
                padding: EdgeInsets.only(
                    top: 100,
                    left: 130,
                    right: 130,
                    bottom: widget.bottomSheetHeight + 100)),
            maxZoom: 20,
            zoom: 16,
            interactiveFlags: InteractiveFlag.none),
        children: [
          ValueListenableBuilder<Box>(
              valueListenable:
                  Hive.box('settings').listenable(keys: ['mapProvider']),
              builder: (context, value, child) {
                final providerId =
                    effectiveMapProviderId(value.get('mapProvider'));
                if (providerId == 'mapbox') {
                  return mapBoxTileLayer;
                } else {
                  return openStreetTileLayer;
                }
              }),
          BlocBuilder<CurrentLocationCubit, FullLocation?>(
              builder: (context, state) => state == null
                  ? const SizedBox()
                  : CurrentLocationLayer(
                      followOnLocationUpdate: FollowOnLocationUpdate.once)),
          BlocConsumer<MainBloc, MainBlocState>(listener: (context, state) {
            if (state is SelectingPoints) {
              final currentLocationCubit = context.read<CurrentLocationCubit>();
              if (currentLocationCubit.state == null) return;
              controller.mapController.move(
                  currentLocationCubit.state!.latlng, 16,
                  offset: Offset(0, widget.bottomSheetHeight / -2));
            }
            if (state is OrderPreview && state.points.isNotEmpty) {
              controller.animatedFitBounds(
                  LatLngBounds.fromPoints(
                      state.points.map((e) => e.latlng).toList()),
                  options: FitBoundsOptions(
                      padding: EdgeInsets.only(
                          top: 100,
                          left: 130,
                          right: 130,
                          bottom: widget.bottomSheetHeight + 100)));
            }
            if (state is StateWithActiveOrder) {
              controller.animatedFitBounds(
                  LatLngBounds.fromPoints(state.currentOrder.points
                      .map((e) => e.toLatLng())
                      .toList()),
                  options: FitBoundsOptions(
                      padding: EdgeInsets.only(
                          top: 80,
                          left: 130,
                          right: 130,
                          bottom: widget.bottomSheetHeight + 80)));
            }
          }, builder: (context, state) {
            return Stack(
              children: [
                if (state is OrderPreview &&
                    state.directions != null &&
                    state.directions!.isNotEmpty)
                  PolylineLayer(polylineCulling: true, polylines: [
                    Polyline(
                        points: state.directions!,
                        strokeWidth: 5,
                        color: CustomTheme.primaryColors)
                  ]),
                if (state is StateWithActiveOrder &&
                    (state.currentOrder.directions?.isNotEmpty ?? false))
                  PolylineLayer(polylineCulling: true, polylines: [
                    Polyline(
                        points: state.currentOrder.directions!
                            .map((e) => LatLng(e.lat, e.lng))
                            .toList(),
                        strokeWidth: 5,
                        color: CustomTheme.primaryColors)
                  ]),
                if (state is SelectingPoints)
                  FutureBuilder<List<Position?>>(
                      future: Future.wait([
                        if (!kIsWeb) Geolocator.getLastKnownPosition(),
                        Geolocator.getCurrentPosition()
                      ]),
                      builder: (context, snapshot) {
                        if (snapshot.data?.first != null ||
                            snapshot.data?.last != null) {
                          WidgetsBinding.instance.addPostFrameCallback((_) {
                            setCurrentLocation(context, snapshot.data!);
                          });
                        }
                        return const SizedBox();
                        // return BlocConsumer<CurrentLocationCubit,
                        //     FullLocation?>(
                        //   listener: (context, currentLocation) {
                        //     if (!mounted || currentLocation == null) return;
                        //     controller.animatedFitBounds(
                        //         LatLngBounds.fromPoints(state.driverLocations
                        //             .followedBy(
                        //                 [currentLocation.latlng]).toList()),
                        //         options: FitBoundsOptions(
                        //             padding: EdgeInsets.only(
                        //                 top: 100,
                        //                 left: 130,
                        //                 right: 130,
                        //                 bottom:
                        //                     widget.bottomSheetHeight + 100)));
                        //   },
                        //   builder: (context, currentLocation) {
                        //     if (currentLocation == null) {
                        //       return const SizedBox();
                        //     }
                        //     return Query$GetDriversLocation$Widget(
                        //         options: Options$Query$GetDriversLocation(
                        //             variables:
                        //                 Variables$Query$GetDriversLocation(
                        //                     point: currentLocation
                        //                         .toPointInput())),
                        //         builder: (result, {refetch, fetchMore}) {
                        //           if (result.isLoading ||
                        //               result.hasException ||
                        //               result.parsedData == null) {
                        //             return const SizedBox();
                        //           }
                        //           WidgetsBinding.instance
                        //               .addPostFrameCallback((_) {
                        //             mainBloc.add(SetDriversLocations(result
                        //                 .parsedData!.getDriversLocation
                        //                 .map((e) => e.toLatLng())
                        //                 .toList()));
                        //           });
                        //           return const SizedBox();
                        //         });
                        //   },
                        // );
                      }),
                MarkerLayer(
                    markers: state.markers
                        .map((e) => e.toFlutterMapMarker())
                        .toList())
              ],
            );
          })
        ]);
  }

  void setCurrentLocation(
      BuildContext context, List<Position?> positions) async {
    final position = positions.last ?? positions.first;
    if (position == null) return;

    final httpLink = HttpLink(
      "${serverUrl}graphql",
    );
    final authLink = AuthLink(
      getToken: () async => 'Bearer ${Hive.box('user').get('jwt')}',
    );
    Link link = authLink.concat(httpLink);
    final GraphQLClient client = GraphQLClient(
      cache: GraphQLCache(),
      link: link,
    );
    final mainBloc = context.read<MainBloc>();
    final currentLocationCubit = context.read<CurrentLocationCubit>();
    final result = await client.query(Options$Query$GetDriversLocation(
        variables: Variables$Query$GetDriversLocation(
            point: Input$PointInput(
                lat: position.latitude, lng: position.longitude),
            provider: Enum$GeoProvider.GOOGLE,
            language: placesCountry)));
    if (result.parsedData == null) return;

    final fullLocation = FullLocation(
        title: '',
        latlng: LatLng(position.latitude, position.longitude),
        address: result.parsedData!.reverseGeocode.address);
    try {
      currentLocationCubit.updateLocation(fullLocation);
    } catch (error) {
      if (kDebugMode) {
        print(error);
      }
    }
    final locations =
        result.parsedData!.getDriversLocation.map((e) => e.toLatLng()).toList();
    mainBloc.add(SetDriversLocations(locations));
  }
}
