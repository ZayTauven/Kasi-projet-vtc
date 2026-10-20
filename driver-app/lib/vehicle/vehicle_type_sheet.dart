import 'package:flutter/material.dart';
import 'package:kasi_driver/l10n/messages.dart';
import 'package:kasi_driver/query_result_view.dart';
import 'package:kasi_driver/register/register.graphql.dart';
import 'package:kasi_driver/schema.gql.dart';
import 'package:kasi_driver/vehicle/vehicle_type_picker.dart';

/// p2-vehicules (2026-10-20) : le Kasiman inscrit avant le catalogue des
/// véhicules renseigne une fois son type depuis son profil. Renvoie `true`
/// si le type est enregistré.
Future<bool?> showVehicleTypeSheet(BuildContext context) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    builder: (_) => const _VehicleTypeSheet(),
  );
}

class _VehicleTypeSheet extends StatefulWidget {
  const _VehicleTypeSheet();

  @override
  State<_VehicleTypeSheet> createState() => _VehicleTypeSheetState();
}

class _VehicleTypeSheetState extends State<_VehicleTypeSheet> {
  Enum$VehicleType? type;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      minimum: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(S.of(context).vehicle_type_title,
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(S.of(context).vehicle_type_hint,
              style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 16),
          VehicleTypePicker(
              value: type, onChanged: (value) => setState(() => type = value)),
          const SizedBox(height: 8),
          Text(S.of(context).vehicle_type_locked,
              style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 16),
          Mutation$UpdateProfile$Widget(
            options: WidgetOptions$Mutation$UpdateProfile(
              onCompleted: (result, parsedData) {
                if (parsedData?.updateOneDriver == null) return;
                Navigator.of(context).pop(true);
              },
              onError: (error) => showOperationErrorMessage(context, error),
            ),
            builder: (runMutation, result) => SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                key: const ValueKey('vehicle-type-save'),
                onPressed: type == null || (result?.isLoading ?? false)
                    ? null
                    : () => runMutation(Variables$Mutation$UpdateProfile(
                        input: Input$UpdateDriverInput(vehicleType: type))),
                child: Text(S.of(context).vehicle_type_save),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
