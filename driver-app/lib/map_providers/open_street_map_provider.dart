import 'dart:async';

import 'package:client_shared/components/marker_new.dart';
import 'package:client_shared/config.dart';
import 'package:client_shared/map_providers.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:kasi_driver/map_providers/map_setting_bootstrap.dart';
import 'package:flutter_map_animations/flutter_map_animations.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:kasi_driver/config.dart';
import 'package:kasi_driver/current_location_cubit.dart';
import 'package:kasi_driver/l10n/messages.dart';
import 'package:kasi_driver/location/driver_location_settings.dart';

import 'package:kasi_driver/graphql/order.fragment.graphql.dart';
import 'package:kasi_driver/main.graphql.dart';
import 'package:kasi_driver/schema.gql.dart';
import '../main_bloc.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_location_marker/flutter_map_location_marker.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:geolocator/geolocator.dart' as geo;
import 'package:maps_toolkit/maps_toolkit.dart' as map_toolkit;
import 'package:latlong2/latlong.dart';

class OpenStreetMapProvider extends StatefulWidget {
  const OpenStreetMapProvider({Key? key}) : super(key: key);

  @override
  State<OpenStreetMapProvider> createState() => _OpenStreetMapProviderState();
}

class _OpenStreetMapProviderState extends State<OpenStreetMapProvider>
    with TickerProviderStateMixin {
  late final controller = AnimatedMapController(vsync: this);

  StreamSubscription<geo.Position>? _positionSub;

  // Dernier cadrage appliqué, pour ne pas relancer `animatedFitBounds` sur une
  // zone déjà cadrée (voir la garde dans le listener plus bas).
  LatLng? _lastFitCenter;
  int? _lastFitRadius;

  @override
  void initState() {
    super.initState();
    // Synchronise le fournisseur/token de carte depuis la config backend (panel).
    bootstrapMapSetting().then((changed) {
      if (changed && mounted) setState(() {});
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // L'abonnement au flux de position vit ICI, pas dans un `builder`.
    // Auparavant `onLocationUpdated()` était appelé depuis le `builder` d'un
    // StreamBuilder : chaque appel déclenchait une mutation réseau puis
    // `bloc.add(...)`, donc une reconstruction, donc un nouvel appel — une
    // boucle de rétroaction qui ne s'armait qu'en ligne et maintenait la carte
    // en animation permanente (zoom oscillant sans fin), empêchant toute tuile
    // de se charger. Un `builder` doit rester PUR, sans effet de bord.
    // Les réglages du flux (service de premier plan Android + notification)
    // sont construits ici car ils portent des chaînes i18n qui exigent un
    // BuildContext.
    _positionSub ??= geo.Geolocator.getPositionStream(
      locationSettings: buildDriverLocationSettings(
        notificationTitle: S.of(context).location_service_notification_title,
        notificationText: S.of(context).location_service_notification_text,
        notificationChannelName:
            S.of(context).location_service_notification_channel,
      ),
    ).listen((position) {
      if (!mounted) return;
      onLocationUpdated(
        position,
        context.read<MainBloc>(),
        context.read<CurrentLocationCubit>(),
      );
    });
  }

  @override
  void dispose() {
    _positionSub?.cancel();
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mainBloc = context.read<MainBloc>();
    final locationCubit = context.read<CurrentLocationCubit>();
    return FlutterMap(
        mapController: controller.mapController,
        options: MapOptions(
            // Sans `center` explicite, flutter_map retombe sur SA valeur par
            // défaut codée en dur — LatLng(50.5, 30.51), soit Kiev. On ancre
            // donc la carte sur `fallbackLocation` (Dakar) le temps que la
            // position réelle arrive.
            center: fallbackLocation,
            maxZoom: 20,
            zoom: 12,
            // Diagnostic caméra (debug) : le rider affiche les tuiles avec la
            // MÊME couche partagée, pas le driver, et aucun errorTileCallback ne
            // se déclenche — donc les tuiles ne sont jamais DEMANDÉES. Reste à
            // savoir si la caméra est dans un état exploitable (centre/zoom).
            onMapReady: () {
              if (kDebugMode) {
                debugPrint('[CARTE DRIVER] prete — '
                    'centre=${controller.mapController.center} '
                    'zoom=${controller.mapController.zoom} '
                    'bounds=${controller.mapController.bounds}');
              }
            },
            onPositionChanged: (pos, hasGesture) {
              if (kDebugMode) {
                debugPrint('[CARTE DRIVER] position — '
                    'centre=${pos.center} zoom=${pos.zoom}');
              }
            },
            interactiveFlags: InteractiveFlag.drag |
                InteractiveFlag.pinchMove |
                InteractiveFlag.pinchZoom |
                InteractiveFlag.doubleTapZoom),
        children: [
          ValueListenableBuilder(
              valueListenable:
                  Hive.box('settings').listenable(keys: ['mapProvider']),
              builder: (context, box, child) {
                final provider =
                    effectiveMapProviderId(box.get('mapProvider', defaultValue: null));
                // Confirme que ce builder est bien exécuté et quelle couche il
                // renvoie : si cette ligne n'apparaît jamais, la couche n'est
                // pas dans l'arbre, ce qui expliquerait l'absence totale de
                // requêtes de tuiles.
                if (kDebugMode) {
                  debugPrint('[CARTE DRIVER] construction couche -> $provider');
                }
                switch (provider) {
                  case 'mapbox':
                    return mapBoxTileLayer;
                  default:
                    return openStreetTileLayer;
                }
              }),
          CurrentLocationLayer(
            followOnLocationUpdate: FollowOnLocationUpdate.once,
          ),
          BlocBuilder<MainBloc, MainState>(
              builder: (context, mainBlocState) => mainBlocState
                          is StatusOnline &&
                      mainBlocState.orders.isEmpty
                  ? BlocConsumer<CurrentLocationCubit, CurrentLocationState>(
                      listener: (context, currentLocationState) {
                        if (currentLocationState.location == null ||
                            currentLocationState.radius == null) {
                          return;
                        }
                        final northeast =
                            map_toolkit.SphericalUtil.computeOffset(
                                map_toolkit.LatLng(
                                    currentLocationState.location!.latitude,
                                    currentLocationState.location!.longitude),
                                currentLocationState.radius!,
                                45);
                        final southwest =
                            map_toolkit.SphericalUtil.computeOffset(
                                map_toolkit.LatLng(
                                    currentLocationState.location!.latitude,
                                    currentLocationState.location!.longitude),
                                currentLocationState.radius!,
                                225);
                        final bounds = LatLngBounds.fromPoints([
                          LatLng(southwest.latitude, southwest.longitude),
                          LatLng(northeast.latitude, northeast.longitude)
                        ]);
                        // GARDE 1 — bornes dégénérées (rayon nul) : le calcul de
                        // zoom divergerait vers Infinity/NaN et la plage de
                        // tuiles serait vide.
                        if (currentLocationState.radius! <= 0 ||
                            bounds.north <= bounds.south ||
                            bounds.east <= bounds.west) {
                          return;
                        }
                        // GARDE 2 — recadrage en boucle. Ce listener se
                        // déclenche à CHAQUE mise à jour de position (tous les
                        // 50 m) ; relancer `animatedFitBounds` à chaque fois
                        // redémarrait une animation avant la fin de la
                        // précédente, laissant la carte en mouvement perpétuel
                        // (zoom oscillant observé entre 12,0 et 14,4) et
                        // empêchant toute tuile de se charger. On ne recadre
                        // donc que si la zone visée a réellement changé.
                        final loc = currentLocationState.location!;
                        final radius = currentLocationState.radius!;
                        const distanceCalc = Distance();
                        if (_lastFitRadius == radius &&
                            _lastFitCenter != null &&
                            distanceCalc(_lastFitCenter!, loc) < radius * 0.25) {
                          return;
                        }
                        _lastFitCenter = loc;
                        _lastFitRadius = radius;
                        controller.animatedFitBounds(bounds,
                            options: const FitBoundsOptions(
                                padding: EdgeInsets.all(100)));
                      },
                      builder: (context, state) {
                        if (state.location != null && state.radius != null) {
                          return CircleLayer(circles: <CircleMarker>[
                            CircleMarker(
                                point: state.location!,
                                color: CustomTheme.primaryColors.withOpacity(0.15),
                                borderStrokeWidth: 2,
                                borderColor:
                                    CustomTheme.secondaryColors.shade200,
                                useRadiusInMeter: true,
                                radius: state.radius!.toDouble()),
                          ]);
                        } else {
                          return Container();
                        }
                      },
                    )
                  : Container()),
          BlocBuilder<MainBloc, MainState>(
            builder: (context, state) {
              if (state is StatusOnline &&
                  state.orders.isNotEmpty &&
                  (state.selectedOrder?.directions?.isNotEmpty ?? false)) {
                return PolylineLayer(polylineCulling: true, polylines: [
                  Polyline(
                      points: state.selectedOrder?.directions
                              ?.map((e) => LatLng(e.lat, e.lng))
                              .toList() ??
                          [],
                      strokeWidth: 5,
                      color: CustomTheme.primaryColors)
                ]);
              }
              return const SizedBox();
            },
          ),
          BlocBuilder<MainBloc, MainState>(
              builder: (context, state) => MarkerLayer(
                  markers: state.markers
                      .map((e) => Marker(
                          point: e.position,
                          width: 240,
                          height: 63,
                          builder: (context) => MarkerNew(address: e.address)))
                      .toList())),
          BlocConsumer<MainBloc, MainState>(
            listenWhen: (previous, next) {
              if (previous is StatusOnline &&
                  next is StatusOnline &&
                  previous.selectedOrder?.id == next.selectedOrder?.id) {
                return false;
              }
              return next is StatusOnline || next is StatusInService;
            },
            listener: (context, state) {
              geo.Geolocator.checkPermission().then((value) {
                if (value == geo.LocationPermission.denied) {
                  geo.Geolocator.requestPermission();
                }
              });
              final currentLocation = locationCubit.state.location;
              if (state.markers.isNotEmpty) {
                final points = state.markers
                    .map((e) => e.position)
                    .followedBy(
                        currentLocation != null ? [currentLocation] : [])
                    .toList();
                controller.animatedFitBounds(LatLngBounds.fromPoints(points),
                    options: const FitBoundsOptions(
                        padding: EdgeInsets.only(
                            top: 130, left: 130, right: 130, bottom: 500)));
              }
              if (currentLocation == null &&
                  (state is StatusOnline || state is StatusInService)) {
                geo.Geolocator.getCurrentPosition().then(
                    (value) => onLocationUpdated(value, mainBloc, locationCubit));
              }
            },
            builder: (context, state) {
              if (state is StatusOffline) {
                return const SizedBox();
              }
              return Stack(
                children: [
                  if (state is StatusOnline)
                    Align(
                      alignment: Alignment.bottomRight,
                      child: SafeArea(
                          minimum: EdgeInsets.only(
                              bottom: state.orders.isEmpty ? 96.0 : 350,
                              right: 16.0),
                          child: FloatingActionButton(
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(30)),
                              mini: true,
                              elevation: 0,
                              backgroundColor:
                                  CustomTheme.primaryColors.shade50,
                              onPressed: () {
                                final currentLocation = context
                                    .read<CurrentLocationCubit>()
                                    .state
                                    .location;

                                if (currentLocation == null) return;
                                controller.animateTo(
                                    dest: currentLocation, zoom: 16);
                              },
                              child: Icon(
                                Icons.location_searching,
                                color: CustomTheme.neutralColors.shade500,
                              ))),
                    ),
                  // Le StreamBuilder qui se trouvait ici a été supprimé : son
                  // `builder` appelait `onLocationUpdated()`, un effet de bord
                  // (mutation réseau + `bloc.add`) qui se réamorçait à chaque
                  // reconstruction. L'abonnement vit désormais dans
                  // `didChangeDependencies`, hors de la phase de construction.
                ],
              );
            },
          ),
        ]);
  }
}

// Reçoit le [CurrentLocationCubit] plutôt qu'un [BuildContext] : cette fonction
// est appelée depuis des callbacks asynchrones (`Geolocator.getCurrentPosition()
// .then`, `StreamBuilder`), donc le widget peut être démonté quand elle
// s'exécute. Un `context.read` à ce moment lève « Looking up a deactivated
// widget's ancestor ». Le cubit est résolu SYNCHRONEMENT par l'appelant, tant
// que le contexte est encore valide.
void onLocationUpdated(geo.Position position, MainBloc bloc,
    CurrentLocationCubit locationCubit) async {
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
  final newLocation = LatLng(position.latitude, position.longitude);
  // La position locale est poussée AVANT le réseau : la carte et la distance
  // aux courses restent à jour même si la mutation échoue.
  locationCubit.setCurrentLocation(newLocation);
  // Mutation réseau en best-effort. Elle part tous les 50 m ; à la moindre
  // défaillance (hors-ligne, jeton expiré, erreur backend) `parsedData!`
  // lèverait une exception non gérée dans ce callback async. On sort alors
  // proprement SANS dispatcher : ne rien émettre évite d'effacer les courses
  // du chauffeur sur un simple hoquet réseau. La prochaine position réessaiera.
  try {
    final res = await client.mutate(Options$Mutation$UpdateDriverLocation(
        variables: Variables$Mutation$UpdateDriverLocation(
            point: Input$PointInput(
                lat: position.latitude, lng: position.longitude))));
    if (res.hasException || res.parsedData == null) {
      return;
    }
    final List<Fragment$AvailableOrder> availableOrders = res
        .parsedData!.updateDriversLocationNew
        .map((e) => Fragment$AvailableOrder.fromJson(e.toJson()))
        .toList();
    bloc.add(AvailableOrdersUpdated(availableOrders));
  } catch (_) {
    return;
  }
}
