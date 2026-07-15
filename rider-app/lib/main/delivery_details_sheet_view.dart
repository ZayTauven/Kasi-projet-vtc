import 'package:flutter/material.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:client_shared/components/sheet_title_view.dart';

import 'package:kasi_rider/l10n/messages.dart';
import 'package:kasi_rider/schema.gql.dart';

class DeliveryDetails {
  final Enum$PackageSize packageSize;
  final String? recipientName;
  final String recipientMobileNumber;
  final String? deliveryInstructions;

  const DeliveryDetails(
      {required this.packageSize,
      this.recipientName,
      required this.recipientMobileNumber,
      this.deliveryInstructions});
}

class DeliveryDetailsSheetView extends StatefulWidget {
  const DeliveryDetailsSheetView({Key? key}) : super(key: key);

  @override
  State<DeliveryDetailsSheetView> createState() =>
      _DeliveryDetailsSheetViewState();
}

class _DeliveryDetailsSheetViewState extends State<DeliveryDetailsSheetView> {
  Enum$PackageSize? packageSize;
  String recipientName = "";
  String recipientMobileNumber = "";
  String deliveryInstructions = "";

  String _packageSizeLabel(BuildContext context, Enum$PackageSize size) {
    switch (size) {
      case Enum$PackageSize.Small:
        return S.of(context).package_size_small;
      case Enum$PackageSize.Medium:
        return S.of(context).package_size_medium;
      case Enum$PackageSize.Large:
        return S.of(context).package_size_large;
      default:
        return size.name;
    }
  }

  @override
  Widget build(BuildContext context) {
    const sizes = [
      Enum$PackageSize.Small,
      Enum$PackageSize.Medium,
      Enum$PackageSize.Large
    ];
    return SafeArea(
        minimum: EdgeInsets.only(
            top: 16,
            left: 16,
            right: 16,
            bottom: MediaQuery.of(context).viewInsets.bottom + 16),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SheetTitleView(
                title: S.of(context).delivery_details_title,
                closeAction: () => Navigator.pop(context),
              ),
              Text(
                S.of(context).delivery_details_body,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 16),
              Text(
                S.of(context).delivery_package_size,
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              Row(
                  children: sizes
                      .map((size) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text(_packageSizeLabel(context, size)),
                              selected: packageSize == size,
                              onSelected: (selected) => setState(() {
                                packageSize = selected ? size : null;
                              }),
                            ),
                          ))
                      .toList()),
              const SizedBox(height: 16),
              TextField(
                onChanged: (value) => setState(() {
                  recipientName = value;
                }),
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(
                    isDense: true,
                    prefixIcon: const Icon(Ionicons.person),
                    hintText: S.of(context).delivery_recipient_name),
              ),
              const SizedBox(height: 12),
              TextField(
                onChanged: (value) => setState(() {
                  recipientMobileNumber = value;
                }),
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                    isDense: true,
                    prefixIcon: const Icon(Ionicons.call),
                    hintText: S.of(context).delivery_recipient_mobile),
              ),
              const SizedBox(height: 12),
              TextField(
                onChanged: (value) => setState(() {
                  deliveryInstructions = value;
                }),
                maxLines: 2,
                decoration: InputDecoration(
                    isDense: true,
                    prefixIcon: const Icon(Ionicons.document_text),
                    hintText: S.of(context).delivery_instructions),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                      child: ElevatedButton(
                          onPressed: packageSize == null ||
                                  recipientMobileNumber.trim().isEmpty
                              ? null
                              : () {
                                  Navigator.pop(
                                      context,
                                      DeliveryDetails(
                                          packageSize: packageSize!,
                                          recipientName:
                                              recipientName.trim().isEmpty
                                                  ? null
                                                  : recipientName.trim(),
                                          recipientMobileNumber:
                                              recipientMobileNumber.trim(),
                                          deliveryInstructions:
                                              deliveryInstructions
                                                      .trim()
                                                      .isEmpty
                                                  ? null
                                                  : deliveryInstructions
                                                      .trim()));
                                },
                          child: Text(S.of(context).action_confirm))),
                ],
              )
            ],
          ),
        ));
  }
}
