import 'package:client_shared/components/back_button.dart';
import 'package:client_shared/components/kasi_banner.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:intl/intl.dart';
import 'package:kasi_driver/l10n/messages.dart';
import 'package:kasi_driver/query_result_view.dart';
import 'package:kasi_driver/profile/payout_methods.graphql.dart';
import 'package:kasi_driver/register/register.graphql.dart';
import 'package:kasi_driver/schema.gql.dart';

/// Ecran Methodes de retrait du profil Kasiman.
///
/// Le Kasiman choisit sa methode de retrait preferee (Wave / Orange Money /
/// Virement / Especes) et renseigne son numero de compte. Le versement des
/// gains est effectue MANUELLEMENT par l operateur Kasi hors application.
class PayoutMethodsView extends StatefulWidget {
  final String? currentPayoutMethodId;
  final String? currentAccountNumber;

  const PayoutMethodsView({
    Key? key,
    this.currentPayoutMethodId,
    this.currentAccountNumber,
  }) : super(key: key);

  @override
  State<PayoutMethodsView> createState() => _PayoutMethodsViewState();
}

class _PayoutMethodsViewState extends State<PayoutMethodsView> {
  String? _selectedMethodId;
  Enum$PayoutMethodType? _selectedMethodType;
  late final TextEditingController _accountController;

  @override
  void initState() {
    super.initState();
    _selectedMethodId = widget.currentPayoutMethodId;
    _accountController =
        TextEditingController(text: widget.currentAccountNumber ?? "");
  }

  @override
  void dispose() {
    _accountController.dispose();
    super.dispose();
  }

  bool get _isCashSelected => _selectedMethodType == Enum$PayoutMethodType.Cash;

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
            Text(
              S.of(context).payout_methods_title,
              style: Theme.of(context).textTheme.headlineLarge,
            ),
            const SizedBox(height: 12),
            Expanded(
              child: Query$PayoutMethods$Widget(
                builder: (result, {fetchMore, refetch}) {
                  if (result.isLoading || result.hasException) {
                    return QueryResultView(result, refetch: refetch);
                  }
                  final methods = result.parsedData?.payoutMethods ?? [];
                  if (_selectedMethodType == null && _selectedMethodId != null) {
                    for (final m in methods) {
                      if (m.id == _selectedMethodId) {
                        _selectedMethodType = m.type;
                        break;
                      }
                    }
                  }
                  return _buildContent(context, methods);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(
      BuildContext context, List<Query$PayoutMethods$payoutMethods> methods) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
          const SizedBox(height: 16),
          if (!_isCashSelected) ...[
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
            const SizedBox(height: 16),
          ],
          _buildSaveButton(context),
          const SizedBox(height: 24),
          const _DriverPayoutHistorySection(),
          const SizedBox(height: 40),
        ],
      ),
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

  Widget _buildSaveButton(BuildContext context) {
    return Mutation$UpdateProfile$Widget(
      options: WidgetOptions$Mutation$UpdateProfile(
        onCompleted: (result, parsedData) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: KasiBanner(S.of(context).payout_saved_message),
          ));
        },
        onError: (error) {
          showOperationErrorMessage(context, error);
        },
      ),
      builder: (runMutation, result) {
        final isSaving = result?.isLoading ?? false;
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: (_selectedMethodId == null || isSaving)
                ? null
                : () {
                    final account = _accountController.text.trim();
                    runMutation(Variables$Mutation$UpdateProfile(
                      input: Input$UpdateDriverInput(
                        payoutMethodId: _selectedMethodId,
                        payoutAccountNumber: _isCashSelected ? null : account,
                      ),
                    ));
                  },
            child: isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(S.of(context).payout_save),
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

class _DriverPayoutHistorySection extends StatelessWidget {
  const _DriverPayoutHistorySection({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Query$DriverPayouts$Widget(
      builder: (result, {fetchMore, refetch}) {
        if (result.isLoading || result.hasException) {
          return const SizedBox.shrink();
        }
        final payouts = result.parsedData?.driverPayouts ?? [];
        if (payouts.isEmpty) {
          return const SizedBox.shrink();
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              S.of(context).payout_history_title,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            ...payouts.map((p) => _PayoutHistoryItem(payout: p)),
          ],
        );
      },
    );
  }
}

class _PayoutHistoryItem extends StatelessWidget {
  final Query$DriverPayouts$driverPayouts payout;

  const _PayoutHistoryItem({Key? key, required this.payout}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: CustomTheme.neutralColors.shade50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: CustomTheme.neutralColors.shade200),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _formatAmount(payout.amount, payout.currency),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 2),
                Text(
                  payout.methodName,
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(color: CustomTheme.neutralColors.shade700),
                ),
                Text(
                  DateFormat.yMMMd().format(payout.createdAt.toLocal()),
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(color: CustomTheme.neutralColors.shade600),
                ),
              ],
            ),
          ),
          _StatusChip(status: payout.status),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final Enum$PayoutStatus status;

  const _StatusChip({Key? key, required this.status}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    late final Color color;
    late final String label;
    switch (status) {
      case Enum$PayoutStatus.Paid:
        color = const Color(0xff046c00);
        label = S.of(context).payout_status_paid;
        break;
      case Enum$PayoutStatus.Pending:
        color = const Color(0xffb8860b);
        label = S.of(context).payout_status_pending;
        break;
      case Enum$PayoutStatus.Canceled:
      case Enum$PayoutStatus.$unknown:
        color = const Color(0xff950101);
        label = S.of(context).payout_status_canceled;
        break;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: Theme.of(context)
            .textTheme
            .labelSmall
            ?.copyWith(color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}
