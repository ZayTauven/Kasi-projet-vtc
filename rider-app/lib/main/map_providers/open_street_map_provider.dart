import 'package:client_shared/config.dart';
import 'package:client_shared/map_providers.dart';
import 'package:kasi_rider/map/map_setting_bootstrap.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_animations/flutter_map_animations.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:latlong2/latlong.dart';
import 'package:kasi_rider/config.dart';
import 'package:kasi_rider/l10n/messages.dart';
import 'package:kasi_rider/main/order.graphql.dart';
import 'package:kasi_rider/map/geo_utils.dart';
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

  // La géolocalisation est lancée UNE SEULE fois par session de widget (elle
  // était auparavant relancée à chaque rebuild par un FutureBuilder recréant
  // son Future à chaque build).
  bool _locationFlowStarted = false;

  @override
  void initState() {
    super.initState();
    // Synchronise le fournisseur/token de carte depuis la config backend (panel).
    bootstrapMapSetting().then((changed) {
      if (changed && mounted) setState(() {});
    });
    _startLocationFlow();
  }

  Future<void> _startLocationFlow() async {
    if (_locationFlowStarted) return;
    _locationFlowStarted = true;
    final position = await acquireCurrentPosition();
    if (position == null || !mounted) return;
    await setCurrentLocation(position);
  }

  /// Recentrage manuel (FAB « ma position ») : réutilise la position déjà
  /// connue, sinon relance une acquisition complète.
  Future<void> _recenterOnUser() async {
    final currentLocationCubit = context.read<CurrentLocationCubit>();
    var target = currentLocationCubit.state?.latlng;
    if (target == null) {
      final position = await acquireCurrentPosition();
      if (position == null || !mounted) return;
      target = LatLng(position.latitude, position.longitude);
      // Alimente le cubit et les positions drivers, sans bloquer le recentrage.
      setCurrentLocation(position);
    }
    controller.mapController.move(target, 16,
        offset: Offset(0, widget.bottomSheetHeight / -2));
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Recentrage à la PREMIÈRE position résolue. Le listener MainBloc
    // ci-dessous ne recentre qu'à la TRANSITION vers SelectingPoints — or au
    // démarrage l'état est DÉJÀ SelectingPoints avant que la position
    // n'arrive : sans ce listener, la caméra restait figée sur
    // `fallbackLocation` pour toute la session.
    return BlocListener<CurrentLocationCubit, FullLocation?>(
        listenWhen: (previous, current) => previous == null && current != null,
        listener: (context, location) {
          if (location == null) return;
          if (context.read<MainBloc>().state is! SelectingPoints) return;
          controller.mapController.move(location.latlng, 16,
              offset: Offset(0, widget.bottomSheetHeight / -2));
        },
        child: Stack(children: [
          _buildMap(context),
          // FAB « ma position » : recentrage manuel à la demande, visible en
          // état SelectingPoints, au-dessus de la bottom sheet.
          BlocBuilder<MainBloc, MainBlocState>(builder: (context, state) {
            if (state is! SelectingPoints) return const SizedBox.shrink();
            return Positioned(
              right: 16,
              bottom: widget.bottomSheetHeight + 16,
              child: FloatingActionButton.small(
                heroTag: 'homeMyLocationFab',
                tooltip: S.of(context).action_my_location,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30)),
                elevation: 2,
                backgroundColor: Colors.white,
                onPressed: _recenterOnUser,
                child: Icon(
                  Ionicons.locate,
                  color: CustomTheme.primaryColors.shade800,
                ),
              ),
            );
          }),
        ]));
  }

  Widget _buildMap(BuildContext context) {
    return FlutterMap(
        mapController: controller.mapController,
        options: MapOptions(
            // Sans `initialCenter` explicite, flutter_map retombe sur SA
            // valeur par défaut codée en dur — LatLng(50.5, 30.51), soit Kiev.
            // On ancre donc la carte sur `fallbackLocation` (Dakar) le temps
            // que la position réelle arrive. `center:`/`zoom:` (init only)
            // renommés `initialCenter:`/`initialZoom:`.
            initialCenter: fallbackLocation,
            keepAlive: true,
            // L'ancien `boundsOptions: FitBoundsOptions(...)` n'avait ICI
            // AUCUN effet : dans flutter_map 5, `boundsOptions` ne s'appliquait
            // que combiné à `bounds:` (jamais défini dans ce widget) — c'était
            // du code mort déjà avant cette migration. Pas d'équivalent
            // `initialCameraFit` ajouté ici pour ne pas changer le
            // comportement observable.
            maxZoom: 20,
            initialZoom: 16,
            // La carte d'accueil était totalement figée (`InteractiveFlag.none`),
            // ce qu'un utilisateur d'app de VTC ne comprend pas : il s'attend au
            // minimum à déplacer et zoomer pour se repérer. La ROTATION reste
            // désactivée — elle désoriente et casse la lecture des libellés.
            // Le recadrage automatique sur les états métier (SelectingPoints,
            // OrderPreview…) continue de fonctionner par-dessus.
            // `interactiveFlags` (champ direct) → `interactionOptions.flags`.
            interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.drag |
                    InteractiveFlag.pinchMove |
                    InteractiveFlag.pinchZoom |
                    InteractiveFlag.doubleTapZoom)),
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
                  // `followOnLocationUpdate` renommé `alignPositionOnUpdate`,
                  // valeurs d'énumération inchangées (`AlignOnUpdate`
                  // remplace `FollowOnLocationUpdate`).
                  : CurrentLocationLayer(
                      alignPositionOnUpdate: AlignOnUpdate.once)),
          BlocConsumer<MainBloc, MainBlocState>(listener: (context, state) {
            if (state is SelectingPoints) {
              final currentLocationCubit = context.read<CurrentLocationCubit>();
              if (currentLocationCubit.state == null) return;
              controller.mapController.move(
                  currentLocationCubit.state!.latlng, 16,
                  offset: Offset(0, widget.bottomSheetHeight / -2));
            }
            // `animatedFitBounds(bounds, options: FitBoundsOptions(...))` →
            // `animatedFitCamera(cameraFit: CameraFit.bounds(...))`.
            if (state is OrderPreview && state.points.isNotEmpty) {
              controller.animatedFitCamera(
                  cameraFit: CameraFit.bounds(
                      bounds: LatLngBounds.fromPoints(
                          state.points.map((e) => e.latlng).toList()),
                      padding: EdgeInsets.only(
                          top: 100,
                          left: 130,
                          right: 130,
                          bottom: widget.bottomSheetHeight + 100)));
            }
            if (state is StateWithActiveOrder &&
                state.currentOrder.points.isNotEmpty) {
              controller.animatedFitCamera(
                  cameraFit: CameraFit.bounds(
                      bounds: LatLngBounds.fromPoints(state.currentOrder.points
                          .map((e) => e.toLatLng())
                          .toList()),
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
                  // `polylineCulling: true` (bool) → `cullingMargin` (double),
                  // qui vaut déjà 10 par défaut : culling actif nativement.
                  PolylineLayer(polylines: [
                    Polyline(
                        points: state.directions!,
                        strokeWidth: 5,
                        color: CustomTheme.primaryColors)
                  ]),
                if (state is StateWithActiveOrder &&
                    (state.currentOrder.directions?.isNotEmpty ?? false))
                  // `polylineCulling: true` (bool) → `cullingMargin` (double),
                  // qui vaut déjà 10 par défaut : culling actif nativement.
                  PolylineLayer(polylines: [
                    Polyline(
                        points: state.currentOrder.directions!
                            .map((e) => LatLng(e.lat, e.lng))
                            .toList(),
                        strokeWidth: 5,
                        color: CustomTheme.primaryColors)
                  ]),
                MarkerLayer(
                    markers: state.markers
                        .map((e) => e.toFlutterMapMarker())
                        .toList())
              ],
            );
          })
        ]);
  }

  Future<void> setCurrentLocation(Position position) async {
    if (!mounted) return;
    final mainBloc = context.read<MainBloc>();
    final currentLocationCubit = context.read<CurrentLocationCubit>();
    final latlng = LatLng(position.latitude, position.longitude);

    // La position GPS alimente le cubit IMMÉDIATEMENT (adresse vide) : le
    // rider est localisé et recentré sur la carte même si le backend est
    // injoignable. Adresse et positions des drivers arrivent ensuite en
    // enrichissement, quand/si la requête réussit.
    currentLocationCubit
        .updateLocation(FullLocation(title: '', latlng: latlng, address: ''));

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
    try {
      // Provider EFFECTIF (config panel) — jamais GOOGLE en dur : le backend
      // Kasi n'a pas de clé Google, le `reverseGeocode` de la query jetait et
      // TOUTE la query échouait (positions drivers comprises).
      final result = await client.query(Options$Query$GetDriversLocation(
          variables: Variables$Query$GetDriversLocation(
              point: Input$PointInput(
                  lat: position.latitude, lng: position.longitude),
              provider: effectiveGeoProvider(),
              language: placesCountry)));
      if (result.parsedData == null) return;

      currentLocationCubit.updateLocation(FullLocation(
          title: '',
          latlng: latlng,
          address: result.parsedData!.reverseGeocode.address));
      final locations = result.parsedData!.getDriversLocation
          .map((e) => e.toLatLng())
          .toList();
      mainBloc.add(SetDriversLocations(locations));
    } catch (error) {
      if (kDebugMode) {
        print(error);
      }
    }
  }
}
