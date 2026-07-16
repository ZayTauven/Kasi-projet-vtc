import 'package:client_shared/theme/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:kasi_driver/l10n/messages.dart';
import 'package:kasi_driver/schema.gql.dart';
import 'package:url_launcher/url_launcher.dart';

/// Détails d'un colis Kasi Moto (services orderType=Delivery) sur l'offre
/// et sur la course en cours. Ne s'affiche pas pour une course classique.
class DeliveryInfoView extends StatelessWidget {
  final Enum$PackageSize? packageSize;
  final String? recipientName;
  final String? recipientMobileNumber;
  final String? deliveryInstructions;

  /// Vue compacte (carrousel d'offres) : taille + instructions seulement,
  /// le contact du destinataire n'apparaît qu'une fois la course acceptée.
  final bool compact;

  const DeliveryInfoView(
      {Key? key,
      required this.packageSize,
      this.recipientName,
      this.recipientMobileNumber,
      this.deliveryInstructions,
      this.compact = false})
      : super(key: key);

  bool get hasContent =>
      packageSize != null ||
      recipientName != null ||
      recipientMobileNumber != null ||
      deliveryInstructions != null;

  String _packageSizeLabel(BuildContext context) {
    switch (packageSize) {
      case Enum$PackageSize.Small:
        return S.of(context).package_size_small;
      case Enum$PackageSize.Medium:
        return S.of(context).package_size_medium;
      case Enum$PackageSize.Large:
        return S.of(context).package_size_large;
      default:
        return "";
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!hasContent) return const SizedBox();
    final sizeLabel = _packageSizeLabel(context);
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
          color: CustomTheme.primaryColors.shade100,
          borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(Ionicons.cube,
                  size: 16, color: CustomTheme.primaryColors.shade700),
              const SizedBox(width: 6),
              Text(
                sizeLabel.isEmpty
                    ? S.of(context).delivery_tag
                    : "${S.of(context).delivery_tag} — $sizeLabel",
                style: Theme.of(context).textTheme.titleSmall,
              ),
            ],
          ),
          if (!compact &&
              (recipientName != null || recipientMobileNumber != null))
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(
                children: [
                  Icon(Ionicons.person,
                      size: 14, color: CustomTheme.neutralColors.shade500),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      [recipientName, recipientMobileNumber]
                          .where((e) => e != null && e.isNotEmpty)
                          .join(" • "),
                      style: Theme.of(context).textTheme.bodySmall,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (recipientMobileNumber != null &&
                      recipientMobileNumber!.isNotEmpty)
                    // Appel direct volontaire (pas de call masking) : le
                    // destinataire d'une livraison Kasi Moto n'est pas un
                    // utilisateur de l'app, on ne peut donc pas lui attribuer de
                    // numéro proxy. Décision produit phase 1 — reste en tel://
                    // direct vers le numéro saisi par l'expéditeur.
                    InkWell(
                      onTap: () =>
                          launchUrl(Uri.parse("tel://$recipientMobileNumber")),
                      child: Icon(Ionicons.call,
                          size: 16,
                          color: CustomTheme.primaryColors.shade700),
                    ),
                ],
              ),
            ),
          if (deliveryInstructions != null &&
              deliveryInstructions!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Ionicons.document_text,
                      size: 14, color: CustomTheme.neutralColors.shade500),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      deliveryInstructions!,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
