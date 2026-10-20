import 'package:client_shared/theme/theme.dart';
import 'package:flutter/material.dart';
import 'package:kasi_driver/l10n/messages.dart';
import 'package:kasi_driver/schema.gql.dart';

/// p2-vehicules (2026-10-20) : type de véhicule du Kasiman. Un seul Kasiman,
/// quel que soit le véhicule : le type ne fixe que les services proposés et
/// les documents demandés.
const kVehicleTypes = [
  Enum$VehicleType.Motorcycle,
  Enum$VehicleType.Car,
  Enum$VehicleType.Van,
];

String vehicleTypeLabel(BuildContext context, Enum$VehicleType? type) {
  switch (type) {
    case Enum$VehicleType.Motorcycle:
      return S.of(context).vehicle_type_motorcycle;
    case Enum$VehicleType.Car:
      return S.of(context).vehicle_type_car;
    case Enum$VehicleType.Van:
      return S.of(context).vehicle_type_van;
    default:
      return S.of(context).vehicle_type_not_set;
  }
}

IconData vehicleTypeIcon(Enum$VehicleType? type) {
  switch (type) {
    case Enum$VehicleType.Motorcycle:
      return Icons.two_wheeler;
    case Enum$VehicleType.Car:
      return Icons.local_taxi;
    case Enum$VehicleType.Van:
      return Icons.local_shipping;
    default:
      return Icons.help_outline;
  }
}

/// Trois cartes côte à côte ; le libellé passe sur deux lignes plutôt que de
/// déborder sur les petits écrans.
class VehicleTypePicker extends StatelessWidget {
  final Enum$VehicleType? value;
  final ValueChanged<Enum$VehicleType> onChanged;

  const VehicleTypePicker(
      {Key? key, required this.value, required this.onChanged})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (final type in kVehicleTypes) ...[
          if (type != kVehicleTypes.first) const SizedBox(width: 8),
          Expanded(child: _card(context, type)),
        ]
      ],
    );
  }

  Widget _card(BuildContext context, Enum$VehicleType type) {
    final selected = type == value;
    return Material(
      key: ValueKey('vehicle-type-${type.name}'),
      color: selected
          ? CustomTheme.primaryColors.shade100
          : CustomTheme.neutralColors.shade100,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
              color: selected
                  ? CustomTheme.primaryColors
                  : CustomTheme.neutralColors.shade200,
              width: selected ? 2 : 1)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => onChanged(type),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(vehicleTypeIcon(type),
                  color: selected
                      ? CustomTheme.primaryColors
                      : CustomTheme.neutralColors.shade700),
              const SizedBox(height: 6),
              Text(
                vehicleTypeLabel(context, type),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelMedium,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
