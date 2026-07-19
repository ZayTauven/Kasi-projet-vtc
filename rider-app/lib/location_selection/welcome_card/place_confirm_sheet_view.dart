import 'dart:async';

import 'package:client_shared/components/list_shimmer_skeleton.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:latlong2/latlong.dart';
import 'package:shimmer/shimmer.dart';
import 'package:kasi_rider/config.dart';
import 'package:kasi_rider/l10n/messages.dart';
import 'package:kasi_rider/location_selection/location_selection_parent_view.dart';
import 'package:kasi_rider/location_selection/welcome_card/place_search_sheet_view.dart';
import 'package:kasi_rider/main/order.graphql.dart';
import 'package:kasi_rider/map/geo_utils.dart';
import 'package:kasi_rider/map/map_view.dart';
import 'package:kasi_rider/schema.gql.dart';

class PlaceConfirmSheetView extends StatefulWidget {
  final FullLocation? defaultLocation;

  const PlaceConfirmSheetView(this.defaultLocation, {Key? key})
      : super(key: key);

  @override
  State<PlaceConfirmSheetView> createState() => _PlaceConfirmSheetViewState();
}

class _PlaceConfirmSheetViewState extends State<PlaceConfirmSheetView> {
  FullLocation? location;
  MapViewController? controller;

  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;
  String? searchKeyword;

  @override
  void initState() {
    location ??= widget.defaultLocation;
    super.initState();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    controller?.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    if (value.isEmpty) {
      setState(() => searchKeyword = null);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 500), () {
      if (!mounted) return;
      setState(() => searchKeyword = value);
    });
  }

  void _onSearchResultSelected(FullLocation place) {
    FocusScope.of(context).unfocus();
    setState(() {
      searchKeyword = null;
      _searchController.text =
          place.title.isNotEmpty ? place.title : place.address;
      // Le déplacement de caméra ci-dessous est PROGRAMMATIQUE : il n'émet
      // pas de MapEventMoveEnd, donc `location` (déjà complète, avec adresse)
      // n'est pas écrasée par un reverse geocode du centre.
      location = place;
    });
    controller?.moveCamera(place.latlng, 17);
  }

  /// FAB « ma position » : recentre le picker sur la position GPS courante et
  /// résout son adresse (repli coordonnées si le géocodage échoue).
  Future<void> _recenterOnUser() async {
    final position = await acquireCurrentPosition();
    if (position == null || !mounted) return;
    final latlng = LatLng(position.latitude, position.longitude);
    controller?.moveCamera(latlng, 17);
    final place = await getReverseGeocode(
        location: latlng,
        language: placesCountry,
        provider: effectiveGeoProvider());
    if (!mounted) return;
    setState(() {
      location = place ??
          FullLocation(
              title: '', address: formatLatLngAddress(latlng), latlng: latlng);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        MapView(
            interactive: true,
            onMapMoved: (fullLocation) {
              if (mounted) {
                setState(() => location = fullLocation);
              }
            },
            initialLocation: location,
            padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).padding.bottom + 50),
            mode: MapViewMode.picker,
            onControllerReady: (controller) {
              this.controller = controller;
            }),
        Align(
          alignment: Alignment.bottomRight,
          child: SafeArea(
            minimum: const EdgeInsets.only(right: 16, bottom: 88),
            child: FloatingActionButton.small(
              heroTag: 'pickerMyLocationFab',
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
          ),
        ),
        Align(
          alignment: Alignment.bottomCenter,
          child: SafeArea(
            minimum: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                  onPressed: location == null
                      ? null
                      : () => Navigator.of(context).pop(location),
                  child: Text(S.of(context).action_confirm_location)),
            ),
          ),
        ),
        // Barre de recherche + résultats, par-dessus la carte.
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: SafeArea(
            minimum: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Material(
                  elevation: 2,
                  borderRadius: BorderRadius.circular(10),
                  color: Colors.white,
                  child: TextField(
                    controller: _searchController,
                    onChanged: _onSearchChanged,
                    decoration: InputDecoration(
                      isDense: true,
                      filled: true,
                      fillColor: Colors.white,
                      prefixIcon: Icon(
                        Ionicons.search,
                        color: CustomTheme.neutralColors.shade400,
                      ),
                      suffixIcon: _searchController.text.isEmpty
                          ? null
                          : IconButton(
                              icon: const Icon(Icons.close),
                              color: CustomTheme.neutralColors.shade400,
                              onPressed: () {
                                _searchController.clear();
                                _onSearchChanged('');
                              },
                            ),
                      hintText: S.of(context).picker_search_hint,
                      hintStyle: Theme.of(context)
                          .textTheme
                          .bodyMedium!
                          .copyWith(color: CustomTheme.neutralColors),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide.none),
                    ),
                  ),
                ),
                if (searchKeyword != null && searchKeyword!.length >= 3)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    constraints: BoxConstraints(
                        maxHeight: MediaQuery.of(context).size.height * 0.45),
                    decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: const [
                          BoxShadow(
                              color: Color(0x1f000000),
                              offset: Offset(0, 4),
                              blurRadius: 12)
                        ]),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Query$getPlaces$Widget(
                          options: Options$Query$getPlaces(
                            variables: Variables$Query$getPlaces(
                                keyWord: searchKeyword!,
                                point: location == null
                                    ? null
                                    : Input$PointInput(
                                        lat: location!.latlng.latitude,
                                        lng: location!.latlng.longitude),
                                language: placesCountry,
                                radius: 100000,
                                provider: effectiveGeoProvider()),
                            onError: (error) {},
                          ),
                          builder: (result, {refetch, fetchMore}) {
                            if (result.isLoading) {
                              return Padding(
                                padding: const EdgeInsets.all(16),
                                child: Shimmer.fromColors(
                                  baseColor: CustomTheme.neutralColors.shade300,
                                  highlightColor:
                                      CustomTheme.neutralColors.shade100,
                                  enabled: true,
                                  child: const ListShimmerSkeleton(),
                                ),
                              );
                            }
                            final places = result.parsedData?.getPlaces ?? [];
                            if (places.isEmpty) {
                              return const SizedBox.shrink();
                            }
                            return ListView.builder(
                                shrinkWrap: true,
                                padding: EdgeInsets.zero,
                                itemCount: places.length,
                                itemBuilder: (context, index) {
                                  return LocationSearchResultItem(
                                      location: places[index].toFullLocation(
                                          from: location?.latlng),
                                      isHistory: false,
                                      confirmOnMap: false,
                                      onSelected: _onSearchResultSelected);
                                });
                          }),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
