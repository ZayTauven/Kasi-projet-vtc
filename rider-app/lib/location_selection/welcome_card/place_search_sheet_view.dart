import 'dart:async';

import 'package:client_shared/components/list_shimmer_skeleton.dart';
import 'package:dotted_line/dotted_line.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:kasi_rider/location_selection/welcome_card/place_confirm_sheet_view.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:latlong2/latlong.dart';
import 'package:modal_bottom_sheet/modal_bottom_sheet.dart';
import 'package:collection/collection.dart';
import 'package:kasi_rider/main/bloc/last_orders_cubit.dart';
import 'package:kasi_rider/main/bloc/main_bloc.dart';
import 'package:kasi_rider/main/order.graphql.dart';
import 'package:kasi_rider/map/geo_utils.dart';
import 'package:kasi_rider/schema.gql.dart';
import 'package:shimmer/shimmer.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../config.dart';
import 'package:kasi_rider/l10n/messages.dart';
import 'package:kasi_rider/unit_of_measurement.dart';

class PlaceSearchSheetView extends StatefulWidget {
  final FullLocation? currentLocation;

  const PlaceSearchSheetView(this.currentLocation, {Key? key})
      : super(key: key);

  @override
  State<PlaceSearchSheetView> createState() => _PlaceSearchSheetViewState();
}

class _PlaceSearchSheetViewState extends State<PlaceSearchSheetView> {
  bool showChooseOnMap = true;
  Timer? _debounce;
  String? searchKeyword;
  List<FullLocation?> selectedLocations = [];

  int selectedIndex = 1;

  @override
  initState() {
    selectedIndex = widget.currentLocation == null ? 0 : 1;
    selectedLocations = [null, null];
    super.initState();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(children: [
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.close),
            splashRadius: 20,
          )
        ]),
        const SizedBox(height: 4),
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 12),
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              color: CustomTheme.neutralColors.shade100),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Column(
                  children: selectedLocations.mapIndexed((index, e) {
                return Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(4),
                      child: Icon(
                        index == 0
                            ? Ionicons.navigate
                            : (index == selectedLocations.length - 1
                                ? Ionicons.location
                                : Ionicons.flag),
                        color: index == selectedLocations.length - 1
                            ? CustomTheme.primaryColors
                            : CustomTheme.neutralColors,
                      ),
                    ),
                    if (index != selectedLocations.length - 1)
                      const DottedLine(
                        direction: Axis.vertical,
                        dashColor: CustomTheme.neutralColors,
                        lineLength: 20,
                        lineThickness: 2.0,
                      )
                  ],
                );
              }).toList()),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ...selectedLocations.mapIndexed((index, location) {
                      return Column(
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: location == null
                                      ? null
                                      : TextEditingController(
                                          text: location.address),
                                  autofocus: widget.currentLocation == null
                                      ? index == 0
                                      : index == 1,
                                  onTap: (() {
                                    setState(() {
                                      if (!showChooseOnMap) {
                                        showChooseOnMap = true;
                                      }
                                    });
                                    selectedIndex = index;
                                  }),
                                  onChanged: (value) async {
                                    if (value.isEmpty &&
                                        searchKeyword != null) {
                                      setState(() {
                                        searchKeyword = null;
                                      });
                                      return;
                                    }
                                    if (value.isNotEmpty) {
                                      if (_debounce?.isActive ?? false) {
                                        _debounce?.cancel();
                                      }
                                      _debounce = Timer(
                                          const Duration(milliseconds: 500),
                                          () {
                                        setState(() {
                                          searchKeyword = value;
                                        });
                                      });
                                    }
                                  },
                                  decoration: noBorderInputDecoration.copyWith(
                                      hintText: index == 0
                                          ? S.of(context).current_location
                                          : (index <
                                                  selectedLocations.length - 1
                                              ? S.of(context).add_stop
                                              : S.of(context).your_destination),
                                      hintStyle: Theme.of(context)
                                          .textTheme
                                          .bodyMedium!
                                          .copyWith(
                                              color: index ==
                                                      selectedLocations.length -
                                                          1
                                                  ? CustomTheme.primaryColors
                                                  : CustomTheme.neutralColors)),
                                ),
                              ),
                              if (index == selectedLocations.length - 1 &&
                                  selectedLocations.length < 5)
                                CupertinoButton(
                                  onPressed: () {
                                    setState(() {
                                      selectedLocations = selectedLocations
                                          .followedBy([null]).toList();
                                    });
                                  },
                                  padding: const EdgeInsets.all(4),
                                  minSize: 0,
                                  child: const Icon(
                                    Icons.add,
                                    color: CustomTheme.neutralColors,
                                  ),
                                ),
                              if (index > 0 &&
                                  index < selectedLocations.length - 1)
                                CupertinoButton(
                                  onPressed: () {
                                    setState(() {
                                      selectedLocations = [
                                        selectedLocations.first,
                                        ...selectedLocations.sublist(2)
                                      ];
                                    });
                                  },
                                  padding: const EdgeInsets.all(4),
                                  minSize: 0,
                                  child: const Icon(
                                    Icons.remove,
                                    color: CustomTheme.neutralColors,
                                  ),
                                )
                            ],
                          ),
                          if (index < selectedLocations.length - 1)
                            const Divider(),
                        ],
                      );
                    }),
                  ],
                ),
              )
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          height: 8,
          decoration:
              BoxDecoration(color: Colors.grey.shade50, boxShadow: const [
            BoxShadow(
                color: Color(0x0f000000),
                offset: Offset(0, 2),
                blurRadius: 12,
                spreadRadius: 0)
          ]),
        ),
        if (showChooseOnMap)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(boxShadow: [
              BoxShadow(
                  color: Colors.grey.shade300,
                  blurRadius: 1,
                  spreadRadius: -1,
                  offset: const Offset(0, -3)),
              const BoxShadow(
                  color: Color(0xfff2f5fa), blurRadius: 10, spreadRadius: 5),
            ]),
            child: Center(
              child: CupertinoButton(
                onPressed: () async {
                  final result = await showBarModalBottomSheet<FullLocation>(
                      enableDrag: false,
                      context: context,
                      builder: (context) {
                        return PlaceConfirmSheetView(widget.currentLocation);
                      });
                  if (result == null) return;
                  setLocation(result);
                },
                minSize: 0,
                padding: const EdgeInsets.all(0),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Ionicons.locate,
                      color: CustomTheme.neutralColors.shade600,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      S.of(context).action_choose_on_map,
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall!
                          .copyWith(color: CustomTheme.neutralColors.shade600),
                    ),
                  ],
                ),
              ),
            ),
          ),
        Container(
          height: 10,
          color: Colors.grey.shade50,
        ),
        if ((searchKeyword?.isEmpty ?? true) || searchKeyword!.length < 3)
          BlocBuilder<LastOrdersCubit,
              List<Query$GetCurrentOrder$rider$lastOrders>>(
            builder: (context, state) {
              return Expanded(
                child: ListView.builder(
                    itemCount: state.length,
                    itemBuilder: (context, index) {
                      final historyItem = state[index];
                      return LocationSearchResultItem(
                          location: FullLocation(
                              latlng: historyItem.points.last.toLatLng(),
                              address: historyItem.addresses.last,
                              title: timeago.format(historyItem.createdOn)),
                          isHistory: true,
                          onSelected: (location) => setLocation(location));
                    }),
              );
            },
          )
        else
          Query$getPlaces$Widget(
              options: Options$Query$getPlaces(
                variables: Variables$Query$getPlaces(
                    keyWord: searchKeyword!,
                    point: widget.currentLocation == null
                        ? null
                        : Input$PointInput(
                            lat: widget.currentLocation!.latlng.latitude,
                            lng: widget.currentLocation!.latlng.longitude),
                    language: placesCountry,
                    radius: 100000,
                    provider: effectiveGeoProvider()),
                onError: (error) {},
              ),
              builder: (result, {refetch, fetchMore}) {
                if (result.isLoading) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Shimmer.fromColors(
                      baseColor: CustomTheme.neutralColors.shade300,
                      highlightColor: CustomTheme.neutralColors.shade100,
                      enabled: true,
                      child: const ListShimmerSkeleton(),
                    ),
                  );
                }
                if (result.parsedData == null) {
                  return const SizedBox();
                } else {
                  return Expanded(
                    child: ListView.builder(
                        itemCount: result.parsedData!.getPlaces.length,
                        itemBuilder: ((context, index) {
                          return LocationSearchResultItem(
                              location: result.parsedData!.getPlaces[index]
                                  .toFullLocation(
                                      from: widget.currentLocation?.latlng),
                              isHistory: false,
                              onSelected: (location) => setLocation(location));
                        })),
                  );
                }
              }),
      ],
    );
  }

  void setLocation(FullLocation location) {
    selectedLocations[selectedIndex] = location;
    if (selectedLocations.sublist(1).indexWhere((element) => element == null) <
        0) {
      if (selectedLocations[0] == null && widget.currentLocation == null) {
        showPickupLocationCanNotBeEmptyDialog(context);
        return;
      }
      final List<FullLocation> locations = [
        selectedLocations[0] ?? widget.currentLocation!,
        ...(selectedLocations.sublist(1)).whereType<FullLocation>()
      ];
      Navigator.pop(context, locations);
      return;
    }
    setState(() {
      selectedLocations[selectedIndex] = location;
    });
  }

  void showPickupLocationCanNotBeEmptyDialog(BuildContext context) async {
    showDialog(
        context: context,
        builder: (context) {
          return AlertDialog(
            title: Text(S.of(context).message_title_location),
            content: Text(S.of(context).message_body_location),
            actions: [
              TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child:
                      Text(S.of(context).action_ok, textAlign: TextAlign.end))
            ],
          );
        });
  }

}

class LocationSearchResultItem extends StatelessWidget {
  final FullLocation location;
  final bool isHistory;
  final Function(FullLocation) onSelected;

  /// Si false, la sélection remonte directement [onSelected] sans ouvrir de
  /// PlaceConfirmSheetView intermédiaire — indispensable quand l'item est
  /// affiché DEPUIS le picker lui-même (évite un picker imbriqué).
  final bool confirmOnMap;

  const LocationSearchResultItem(
      {required this.location,
      required this.isHistory,
      required this.onSelected,
      this.confirmOnMap = true,
      Key? key})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return CupertinoButton(
      padding: EdgeInsets.zero,
      onPressed: () async {
        if (!confirmOnMap) {
          onSelected(location);
          return;
        }
        final result = await showBarModalBottomSheet<FullLocation>(
            context: context,
            enableDrag: false,
            builder: (context) {
              return PlaceConfirmSheetView(location);
            });
        if (result == null) return;
        onSelected(result);
      },
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  isHistory ? Ionicons.time : Ionicons.compass,
                  color: CustomTheme.neutralColors.shade400,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        location.title,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        location.address,
                        overflow: TextOverflow.fade,
                        style: Theme.of(context).textTheme.labelMedium,
                      ),
                      if (location.distance != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          distanceToString(context, location.distance!),
                          style: Theme.of(context)
                              .textTheme
                              .labelSmall
                              ?.copyWith(
                                  color: CustomTheme.neutralColors.shade400),
                        ),
                      ],
                    ],
                  ),
                )
              ],
            ),
          ),
          const Divider()
        ],
      ),
    );
  }
}

const noBorderInputDecoration = InputDecoration(
    isDense: true,
    contentPadding: EdgeInsets.all(8),
    filled: false,
    enabledBorder: OutlineInputBorder(borderSide: BorderSide.none),
    focusedBorder: OutlineInputBorder(borderSide: BorderSide.none));

class FullLocation {
  String title;
  String address;
  LatLng latlng;
  double? distance;

  FullLocation(
      {required this.latlng,
      required this.address,
      required this.title,
      this.distance});
}

extension ConvertToFullLocation on Query$getPlaces$getPlaces {
  /// [from] is the reference point (e.g. the rider's current/pickup
  /// location) used to compute the display distance client-side, since the
  /// `getPlaces` API does not return a `distance` field.
  FullLocation toFullLocation({LatLng? from}) {
    final placeLatLng = LatLng(point.lat, point.lng);
    return FullLocation(
        latlng: placeLatLng,
        address: address,
        title: title ?? '',
        distance:
            from == null ? null : const Distance().distance(from, placeLatLng));
  }
}
