import 'package:client_shared/components/back_button.dart';
import 'package:client_shared/components/list_shimmer_skeleton.dart';
import 'package:client_shared/components/user_avatar_view.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:kasi_driver/config.dart';
import 'package:kasi_driver/l10n/messages.dart';
import 'package:kasi_driver/profile/profile.graphql.dart';
import 'package:kasi_driver/profile/profile_info_card.dart';
import 'package:kasi_driver/profile/payout_methods_view.dart';
import 'package:kasi_driver/unit_of_measurement.dart';
import 'package:kasi_driver/vehicle/vehicle_type_picker.dart';
import 'package:kasi_driver/vehicle/vehicle_type_sheet.dart';
import 'package:shimmer/shimmer.dart';
import 'package:collection/collection.dart';
import 'package:client_shared/components/kasi_network_image.dart';

class ProfileView extends StatefulWidget {
  const ProfileView({Key? key}) : super(key: key);

  @override
  State<ProfileView> createState() => _ProfileViewState();
}

class _ProfileViewState extends State<ProfileView> {
  final List<bool> _isOpen = [false, false];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
          minimum: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              KasiBackButton(text: S.of(context).action_back),
              const SizedBox(height: 4),
              Text(S.of(context).menu_profile,
                  style: Theme.of(context).textTheme.headlineLarge),
              const SizedBox(height: 12),
              Query$GetProfile$Widget(builder: (result, {fetchMore, refetch}) {
                if (result.isLoading) {
                  return Shimmer.fromColors(
                    baseColor: CustomTheme.neutralColors.shade300,
                    highlightColor: CustomTheme.neutralColors.shade100,
                    enabled: true,
                    child: const ListShimmerSkeleton(),
                  );
                }
                final driver = result.parsedData!.driver;
                return Expanded(
                  child: SingleChildScrollView(
                    child: Column(children: [
                      Center(
                        child: UserAvatarView(
                            urlPrefix: serverUrl,
                            url: driver.media?.address,
                            cornerRadius: 12,
                            size: 82),
                      ),
                      const SizedBox(height: 4),
                      Text("${driver.firstName} ${driver.lastName}",
                          style: Theme.of(context).textTheme.headlineLarge),
                      Text(
                        "+${driver.mobileNumber}",
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 12),
                      Row(children: [
                        Expanded(
                          child: ProfileInfoCard(
                              title: S.of(context).profile_distance_traveled,
                              subtitle: Text(
                                distanceToString(
                                    context,
                                    driver.historyOrdersAggregate.firstOrNull
                                            ?.sum?.distanceBest ??
                                        0),
                                style: Theme.of(context).textTheme.titleMedium,
                              )),
                        ),
                        Expanded(
                          child: ProfileInfoCard(
                              title: S.of(context).profile_total_trips,
                              subtitle: Text(
                                driver.historyOrdersAggregate.first.count?.id
                                        .toString() ??
                                    "0",
                                style: Theme.of(context).textTheme.titleMedium,
                              )),
                        ),
                        Expanded(
                          child: ProfileInfoCard(
                              title: S.of(context).profile_rating,
                              subtitle: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(
                                      Ionicons.star,
                                      color: Color(0xFFEFC868),
                                      size: 16,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      driver.rating == null
                                          ? "-"
                                          : (driver.rating! / 20)
                                              .toStringAsFixed(1),
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium,
                                    ),
                                  ])),
                        )
                      ]),
                      const SizedBox(height: 24),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 16),
                        decoration: BoxDecoration(
                            color: CustomTheme.primaryColors.shade100,
                            borderRadius: BorderRadius.circular(10)),
                        child: Row(
                          children: [
                            Text(
                              S.of(context).profile_services_title,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                                child: SingleChildScrollView(
                              // Le defilement doit suivre l'axe du Row : sans
                              // cela la liste des services deborde de 140 px
                              // des que le Kasiman en a plus d'un.
                              scrollDirection: Axis.horizontal,
                              child: Row(
                                  children: driver.enabledServices
                                      .map((e) => Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 4),
                                            child: Text(
                                              "•  ${e.name}",
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .labelMedium,
                                            ),
                                          ))
                                      .toList()),
                            ))
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      // « Informations bancaires » (Ridy) retiré : remplacé par
                      // « Méthodes de retrait » ci-dessous (Wave/OM/Virement/Espèces).
                      GestureDetector(
                        onTap: () {
                          Navigator.of(context).push(MaterialPageRoute(
                            builder: (_) => PayoutMethodsView(
                              currentPayoutMethodId: driver.payoutMethodId,
                              currentAccountNumber: driver.payoutAccountNumber,
                            ),
                          ));
                        },
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                              color: CustomTheme.primaryColors.shade100,
                              borderRadius: BorderRadius.circular(12)),
                          child: Row(
                            children: [
                              Icon(
                                Ionicons.wallet_outline,
                                color: CustomTheme.primaryColors.shade700,
                                size: 20,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  S.of(context).payout_methods_title,
                                  style:
                                      Theme.of(context).textTheme.titleMedium,
                                ),
                              ),
                              Icon(
                                Ionicons.chevron_forward,
                                color: CustomTheme.neutralColors.shade500,
                                size: 18,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        decoration: BoxDecoration(
                            color: CustomTheme.primaryColors.shade100,
                            borderRadius: BorderRadius.circular(12)),
                        child: ExpansionPanelList(
                            elevation: 0,
                            children: [
                              ExpansionPanel(
                                  backgroundColor: Colors.transparent,
                                  isExpanded: _isOpen[1],
                                  canTapOnHeader: true,
                                  headerBuilder: (context, isExpanded) {
                                    return Container(
                                      padding: const EdgeInsets.all(12),
                                      child: Text(
                                        S
                                            .of(context)
                                            .profile_vehicle_information_title,
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium,
                                      ),
                                    );
                                  },
                                  body: VehicleInformationTableView(
                                      driver: driver,
                                      onChanged: () => refetch?.call()))
                            ],
                            expansionCallback: (panelIndex, isExpanded) {
                              // Depuis Flutter 3.13, `isExpanded` est le NOUVEL
                              // etat : `!isExpanded` laissait le panneau ferme.
                              setState(() {
                                _isOpen[1] = isExpanded;
                              });
                            }),
                      ),
                      if (driver.documents?.isNotEmpty ?? false)
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Container(
                            padding: const EdgeInsets.only(left: 4, top: 12),
                            child: Text(
                                S.of(context).profile_uploaded_documents_title,
                                textAlign: TextAlign.start,
                                style: Theme.of(context).textTheme.titleMedium),
                          ),
                        ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Expanded(
                            child: SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: Row(
                                children: (driver.documents ?? [])
                                    .map(
                                      (e) => Container(
                                        padding: const EdgeInsets.only(left: 8),
                                        child: ClipRRect(
                                          borderRadius:
                                              BorderRadius.circular(8),
                                          child: KasiNetworkImage.fromAddress(
                                            urlPrefix: serverUrl,
                                            address: e.address,
                                            width: 105,
                                            height: 105,
                                            fit: BoxFit.cover,
                                            placeholderIcon: Ionicons.document,
                                          ),
                                        ),
                                      ),
                                    )
                                    .toList(),
                              ),
                            ),
                          )
                        ],
                      ),
                      const SizedBox(height: 50),
                    ]),
                  ),
                );
              }),
            ],
          )),
    );
  }
}

class BankInformationTableView extends StatelessWidget {
  final Query$GetProfile$driver driver;
  const BankInformationTableView({Key? key, required this.driver})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          ProfileInformationRow(
              title: S.of(context).account_number,
              content: driver.accountNumber ?? "-"),
          const Divider(),
          ProfileInformationRow(
              title: S.of(context).bank_name, content: driver.bankName ?? "-"),
          const Divider(),
          ProfileInformationRow(
              title: S.of(context).address, content: driver.address ?? "-"),
        ],
      ),
    );
  }
}

class VehicleInformationTableView extends StatelessWidget {
  final Query$GetProfile$driver driver;
  final VoidCallback onChanged;
  const VehicleInformationTableView(
      {Key? key, required this.driver, required this.onChanged})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    final type = kVehicleTypes.contains(driver.vehicleType)
        ? driver.vehicleType
        : null;
    return Container(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          // p2-vehicules : choisi une fois s'il manque (inscrit avant le
          // catalogue des vehicules), ensuite modifie par le support.
          Row(
            children: [
              Icon(vehicleTypeIcon(type),
                  size: 18, color: CustomTheme.neutralColors.shade700),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  S.of(context).vehicle_type_title,
                  style: Theme.of(context)
                      .textTheme
                      .labelMedium
                      ?.copyWith(color: CustomTheme.neutralColors.shade700),
                ),
              ),
              if (type == null)
                TextButton(
                    key: const ValueKey('vehicle-type-choose'),
                    onPressed: () async {
                      final saved = await showVehicleTypeSheet(context);
                      if (saved == true) onChanged();
                    },
                    child: Text(S.of(context).vehicle_type_choose))
              else
                Text(vehicleTypeLabel(context, type),
                    style: Theme.of(context).textTheme.labelMedium),
            ],
          ),
          const Divider(),
          ProfileInformationRow(
              title: S.of(context).car_model, content: driver.car?.name ?? "-"),
          const Divider(),
          ProfileInformationRow(
              title: S.of(context).car_color,
              content: driver.carColor?.name ?? "-"),
          const Divider(),
          ProfileInformationRow(
              title: S.of(context).plate_number,
              content: driver.carPlate ?? "-"),
        ],
      ),
    );
  }
}

class ProfileInformationRow extends StatelessWidget {
  final String title;
  final String content;

  const ProfileInformationRow(
      {required this.title, required this.content, Key? key})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          title,
          style: Theme.of(context)
              .textTheme
              .labelMedium
              ?.copyWith(color: CustomTheme.neutralColors.shade700),
        ),
        const Spacer(),
        Expanded(
            child: Text(
          content,
          textAlign: TextAlign.end,
          style: Theme.of(context).textTheme.labelMedium,
        ))
      ],
    );
  }
}
