import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:kasi_driver/l10n/messages.dart';
import 'package:kasi_driver/query_result_view.dart';
import 'package:kasi_driver/register/register.graphql.dart';
import 'package:kasi_driver/schema.gql.dart';
import 'package:kasi_driver/vehicle/vehicle_type_picker.dart';

/// Étape « Votre véhicule » de l'inscription. p2-vehicules (2026-10-20) : le
/// Kasiman choisit d'abord son type de véhicule (moto, taxi/voiture,
/// camionnette), qui filtre la liste des modèles. Le type est obligatoire.
class RegisterRideDetailsView extends StatefulWidget {
  final Function() onContinue;
  final List<Query$GetDriver$carModels> models;
  final List<Query$GetDriver$carColors> colors;
  final Function(bool loading) onLoadingStateUpdated;
  final Enum$VehicleType? vehicleType;
  final String? carId;
  final String? carColorId;
  final String? carPlate;
  final int? carProductionYear;

  const RegisterRideDetailsView(
      {Key? key,
      required this.models,
      required this.colors,
      required this.onContinue,
      required this.onLoadingStateUpdated,
      this.vehicleType,
      this.carId,
      this.carColorId,
      this.carPlate,
      this.carProductionYear})
      : super(key: key);

  @override
  State<RegisterRideDetailsView> createState() =>
      _RegisterRideDetailsViewState();
}

class _RegisterRideDetailsViewState extends State<RegisterRideDetailsView> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  Enum$VehicleType? vehicleType;
  String? carPlate;
  int? carProductionYear;
  String? carId;
  String? carColorId;
  bool showTypeError = false;

  @override
  void initState() {
    super.initState();
    vehicleType = kVehicleTypes.contains(widget.vehicleType)
        ? widget.vehicleType
        : null;
    carId = widget.carId;
    carColorId = widget.carColorId;
    carPlate = widget.carPlate;
    carProductionYear = widget.carProductionYear;
  }

  /// Modèles du type choisi, plus les modèles non classés.
  List<Query$GetDriver$carModels> get models => widget.models
      .where((m) =>
          vehicleType == null ||
          m.vehicleType == null ||
          m.vehicleType == vehicleType)
      .toList();

  @override
  Widget build(BuildContext context) {
    final visibleModels = models;
    return Form(
      key: _formKey,
      child: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      S.of(context).register_ride_details_title,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(S.of(context).vehicle_type_hint,
                        style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(height: 16),
                    VehicleTypePicker(
                        value: vehicleType,
                        onChanged: (type) => setState(() {
                              vehicleType = type;
                              showTypeError = false;
                              if (carId != null &&
                                  !models.any((m) => m.id == carId)) {
                                carId = null;
                              }
                            })),
                    if (showTypeError)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(S.of(context).vehicle_type_required,
                            style: TextStyle(
                                color: Theme.of(context).colorScheme.error)),
                      ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Flexible(
                          child: TextFormField(
                            initialValue: carPlate,
                            onSaved: (value) => carPlate = value,
                            decoration: InputDecoration(
                                isDense: true,
                                labelText: S.of(context).plate_number),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Flexible(
                          child: TextFormField(
                            keyboardType: TextInputType.number,
                            initialValue: carProductionYear?.toString() ?? "",
                            onSaved: (value) {
                              carProductionYear =
                                  value == null ? null : int.tryParse(value);
                            },
                            inputFormatters: <TextInputFormatter>[
                              FilteringTextInputFormatter.digitsOnly
                            ],
                            decoration: InputDecoration(
                                isDense: true,
                                labelText: S.of(context).car_production_year),
                          ),
                        )
                      ],
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      // Recree a chaque type : la valeur initiale suit le filtre.
                      key: ValueKey(vehicleType),
                      initialValue: visibleModels.any((m) => m.id == carId)
                          ? carId
                          : null,
                      isExpanded: true,
                      decoration: InputDecoration(
                          isDense: true, labelText: S.of(context).car_model),
                      items: visibleModels
                          .map((e) => DropdownMenuItem(
                              value: e.id,
                              child: Text(e.name,
                                  overflow: TextOverflow.ellipsis)))
                          .toList(),
                      onChanged: (String? id) => setState(() => carId = id),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: carColorId,
                      isExpanded: true,
                      decoration: InputDecoration(
                          isDense: true, labelText: S.of(context).car_color),
                      items: widget.colors
                          .map((e) => DropdownMenuItem(
                              value: e.id,
                              child: Text(e.name,
                                  overflow: TextOverflow.ellipsis)))
                          .toList(),
                      onChanged: (String? id) =>
                          setState(() => carColorId = id),
                    )
                  ]),
            ),
          ),
          Mutation$UpdateProfile$Widget(
              options: WidgetOptions$Mutation$UpdateProfile(
                  onCompleted: (result, parsedData) {
                    widget.onLoadingStateUpdated(false);
                    if (parsedData?.updateOneDriver == null) return;
                    widget.onContinue();
                  },
                  onError: (error) {
                    widget.onLoadingStateUpdated(false);
                    showOperationErrorMessage(context, error);
                  }),
              builder: (runMutation, result) {
                return SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      if (vehicleType == null) {
                        setState(() => showTypeError = true);
                        return;
                      }
                      bool? isValid = _formKey.currentState?.validate();
                      if (isValid != true) return;
                      _formKey.currentState?.save();
                      widget.onLoadingStateUpdated(true);
                      runMutation(Variables$Mutation$UpdateProfile(
                          input: Input$UpdateDriverInput(
                              vehicleType: vehicleType,
                              carId: carId,
                              carColorId: carColorId,
                              carPlate: carPlate,
                              carProductionYear: carProductionYear)));
                    },
                    child: Text(S.of(context).action_continue),
                  ),
                );
              })
        ],
      ),
    );
  }
}
