import 'package:client_shared/theme/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:intl/intl.dart';
import 'package:kasi_driver/l10n/messages.dart';
import 'package:kasi_driver/query_result_view.dart';
import 'package:kasi_driver/profile/payout_methods.graphql.dart';
import 'package:kasi_driver/register/register.graphql.dart';
import 'package:kasi_driver/schema.gql.dart';

/// Etape 5 de l inscription Kasiman : choix de la methode de retrait.
///
/// Remplace les anciens champs bancaires Ridy (nom de banque, Swift, etc.)
/// par la selection d une methode de retrait Kasi (Wave / Orange Money /
/// Virement / Especes) + un numero de compte, masque lorsque la methode
/// selectionnee est "Especes" (Cash). Meme logique que l ecran profil
/// payout_methods_view.dart.
class RegisterPayoutDetailsView extends StatefulWidget {
  final String? payoutMethodId;
  final String? payoutAccountNumber;
  final Function() onContinue;
  final Function(bool loading) onLoadingStateUpdated;

  const RegisterPayoutDetailsView({
    Key? key,
    required this.payoutMethodId,
    required this.payoutAccountNumber,
    required this.onContinue,
    required this.onLoadingStateUpdated,
  }) : super(key: key);

  @override
  State<RegisterPayoutDetailsView> createState() =>
      _RegisterPayoutDetailsViewState();
}

class _RegisterPayoutDetailsViewState extends State<RegisterPayoutDetailsView> {
  String? _selectedMethodId;
  Enum$PayoutMethodType? _selectedMethodType;
  late final TextEditingController _accountController;

  @override
  void initState() {
    super.initState();
    _selectedMethodId = widget.payoutMethodId;
    _accountController =
        TextEditingController(text: widget.payoutAccountNumber ?? "");
  }

  @override
  void dispose() {
    _accountController.dispose();
    super.dispose();
  }

  bool get _isCashSelected => _selectedMethodType == Enum$PayoutMethodType.Cash;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Query$PayoutMethods$Widget(
            builder: (result, {fetchMore, refetch}) {
              if (result.isLoading || result.hasException) {
                return QueryResultView(result, refetch: refetch);
              }
              final methods = result.parsedData?.payoutMethods ?? [];
              // Preremplissage : retrouve le type de la methode courante pour
              // savoir s il faut masquer le champ numero de compte (cas Cash).
              if (_selectedMethodType == null && _selectedMethodId != null) {
                for (final m in methods) {
                  if (m.id == _selectedMethodId) {
                    _selectedMethodType = m.type;
                    break;
                  }
                }
              }
              return SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      S.of(context).register_payout_details_title,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 16),
                    _buildInfoBanner(context),
                    const SizedBox(height: 16),
                    ...methods.map((method) => _PayoutMethodCard(
                          method: method,
                          selected: method.id == _selectedMethodId,
                          onTap: () {
                            setState(() {
                              _selectedMethodId = method.id;
                              _selectedMethodType = method.type;
                            });
                          },
                        )),
                    if (!_isCashSelected) ...[
                      const SizedBox(height: 8),
                      Text(
                        S.of(context).payout_account_number_label,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _accountController,
                        keyboardType: TextInputType.text,
                        decoration: InputDecoration(
                          isDense: true,
                          hintText: S.of(context).payout_account_number_hint,
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                  ],
                ),
              );
            },
          ),
        ),
        _buildContinueButton(context),
      ],
    );
  }

  Widget _buildInfoBanner(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: CustomTheme.primaryColors.shade100,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Ionicons.information_circle_outline,
            size: 20,
            color: CustomTheme.primaryColors.shade700,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              S.of(context).payout_info_text,
              style: Theme.of(context).textTheme.labelMedium,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContinueButton(BuildContext context) {
    return Mutation$UpdateProfile$Widget(
      options: WidgetOptions$Mutation$UpdateProfile(
        onCompleted: (result, parsedData) {
          widget.onLoadingStateUpdated(false);
          widget.onContinue();
        },
        onError: (error) {
          widget.onLoadingStateUpdated(false);
          showOperationErrorMessage(context, error);
        },
      ),
      builder: (runMutation, result) {
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _selectedMethodId == null
                ? null
                : () {
                    final account = _accountController.text.trim();
                    widget.onLoadingStateUpdated(true);
                    runMutation(Variables$Mutation$UpdateProfile(
                      input: Input$UpdateDriverInput(
                        payoutMethodId: _selectedMethodId,
                        payoutAccountNumber: _isCashSelected ? null : account,
                      ),
                    ));
                  },
            child: Text(S.of(context).action_continue),
          ),
        );
      },
    );
  }
}

class _PayoutMethodCard extends StatelessWidget {
  final Query$PayoutMethods$payoutMethods method;
  final bool selected;
  final VoidCallback onTap;

  const _PayoutMethodCard({
    Key? key,
    required this.method,
    required this.selected,
    required this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected
              ? CustomTheme.primaryColors.shade100
              : CustomTheme.neutralColors.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected
                ? CustomTheme.primaryColors
                : CustomTheme.neutralColors.shade300,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: CustomTheme.primaryColors.shade100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                _iconForType(method.type),
                color: CustomTheme.primaryColors.shade700,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    method.name,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    S.of(context).payout_minimum_amount(
                          _formatAmount(method.minimumAmount, method.currency),
                        ),
                    style: Theme.of(context)
                        .textTheme
                        .labelSmall
                        ?.copyWith(color: CustomTheme.neutralColors.shade700),
                  ),
                  if ((method.instructions ?? "").isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      method.instructions!,
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              selected ? Ionicons.radio_button_on : Ionicons.radio_button_off,
              color: selected
                  ? CustomTheme.primaryColors
                  : CustomTheme.neutralColors.shade400,
            ),
          ],
        ),
      ),
    );
  }

  IconData _iconForType(Enum$PayoutMethodType type) {
    switch (type) {
      case Enum$PayoutMethodType.Wave:
        return Ionicons.water_outline;
      case Enum$PayoutMethodType.OrangeMoney:
        return Ionicons.phone_portrait_outline;
      case Enum$PayoutMethodType.BankTransfer:
        return Ionicons.business_outline;
      case Enum$PayoutMethodType.Cash:
        return Ionicons.cash_outline;
      case Enum$PayoutMethodType.$unknown:
        return Ionicons.wallet_outline;
    }
  }
}

String _formatAmount(double amount, String currency) {
  final formatted = NumberFormat.decimalPattern().format(amount);
  return "$formatted $currency";
}
