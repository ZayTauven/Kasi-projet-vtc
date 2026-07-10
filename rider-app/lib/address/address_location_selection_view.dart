import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:kasi_rider/location_selection/welcome_card/place_search_sheet_view.dart';

import 'package:kasi_rider/l10n/messages.dart';
import 'package:kasi_rider/map/map_view.dart';

class AddressLocationSelectionView extends StatefulWidget {
  final FullLocation? defaultLocation;

  const AddressLocationSelectionView(this.defaultLocation, {Key? key})
      : super(key: key);

  @override
  State<AddressLocationSelectionView> createState() =>
      _AddressLocationSelectionViewState();
}

class _AddressLocationSelectionViewState
    extends State<AddressLocationSelectionView> {
  FullLocation? location;
  late StreamSubscription<MapEvent> subscription;

  @override
  void initState() {
    location ??= widget.defaultLocation;
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        MapView(
          mode: MapViewMode.picker,
          onControllerReady: (controller) {},
          onMapMoved: (fullLocation) {
            if (mounted) {
              setState(() {
                location = fullLocation;
              });
            }
          },
        ),
        SafeArea(
          top: false,
          minimum: const EdgeInsets.all(16),
          child: Align(
            alignment: Alignment.bottomCenter,
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                      onPressed: location == null
                          ? null
                          : () {
                              Navigator.of(context).pop(location);
                            },
                      child: Text(S.of(context).action_confirm_location)),
                ),
              ],
            ),
          ),
        )
      ],
    );
  }
}
