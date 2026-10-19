import 'package:client_shared/components/back_button.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:intl/intl.dart';

import 'package:kasi_driver/l10n/messages.dart';
import '../query_result_view.dart';
import 'kasiman_account_cubit.dart';
import 'kasiman_debt_views.dart';
import 'kasiman_statement_cubit.dart';

/// Écran « Mon relevé » (p2-argent I3) : solde, dette, plafond, et mouvements
/// du compte du Kasiman tirés du grand livre, page par page.
class KasimanStatementView extends StatelessWidget {
  const KasimanStatementView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final client = GraphQLProvider.of(context).value;
    return BlocProvider<KasimanStatementCubit>(
      create: (_) => KasimanStatementCubit(client)..reload(),
      child: const _StatementBody(),
    );
  }
}

class _StatementBody extends StatefulWidget {
  const _StatementBody();

  @override
  State<_StatementBody> createState() => _StatementBodyState();
}

class _StatementBodyState extends State<_StatementBody> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _refreshAccount());
  }

  Future<void> _refreshAccount() => context
      .read<KasimanAccountCubit>()
      .refresh(GraphQLProvider.of(context).value);

  Future<void> _reloadAll() async {
    await Future.wait(
        [_refreshAccount(), context.read<KasimanStatementCubit>().reload()]);
  }

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    return Scaffold(
      body: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 16, 16, 0),
        child: BlocBuilder<KasimanStatementCubit, KasimanStatementState>(
          builder: (context, statement) {
            return RefreshIndicator(
              onRefresh: _reloadAll,
              child: ListView.builder(
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: statement.items.length + 3,
                itemBuilder: (context, index) {
                  if (index == 0) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Align(
                          alignment: Alignment.centerLeft,
                          child: KasiBackButton(text: s.action_back)),
                    );
                  }
                  if (index == 1) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(s.statement_title,
                            style: Theme.of(context).textTheme.headlineMedium),
                        const SizedBox(height: 12),
                        BlocBuilder<KasimanAccountCubit, KasimanAccountState>(
                            builder: (context, state) => state.account == null
                                ? const SizedBox.shrink()
                                : _AccountSummaryCard(account: state.account!)),
                        const SizedBox(height: 24),
                        Text(s.statement_movements,
                            style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 8),
                      ],
                    );
                  }
                  final itemIndex = index - 2;
                  if (itemIndex < statement.items.length) {
                    return _StatementItemTile(
                        item: statement.items[itemIndex],
                        currency: statement.currency ?? 'XOF');
                  }
                  return _StatementFooter(state: statement);
                },
              ),
            );
          },
        ),
      ),
    );
  }
}

class _AccountSummaryCard extends StatelessWidget {
  final KasimanAccount account;

  const _AccountSummaryCard({required this.account});

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final theme = Theme.of(context);
    final limit = account.debtLimit;
    final threshold = account.debtAlertThreshold;
    final Color debtColor = account.blocked
        ? theme.colorScheme.error
        : account.alert
            ? CustomTheme.secondaryColors.shade700
            : CustomTheme.primaryColors.shade700;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: CustomTheme.primaryColors.shade50,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [kasiCardShadow()]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(s.statement_balance, style: theme.textTheme.bodyMedium),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(formatKasiMoney(account.balance, account.currency),
                style: theme.textTheme.headlineMedium?.copyWith(
                    color: account.balance < 0
                        ? debtColor
                        : CustomTheme.primaryColors.shade900)),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                  child: _Figure(
                      label: s.statement_debt,
                      value: account.debt > 0
                          ? formatKasiMoney(account.debt, account.currency)
                          : s.statement_no_debt,
                      color: account.debt > 0 ? debtColor : null)),
              if (limit != null)
                Expanded(
                    child: _Figure(
                        label: s.statement_debt_limit,
                        value: formatKasiMoney(limit, account.currency))),
            ],
          ),
          if (limit != null && limit > 0) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: (account.debt / limit).clamp(0.0, 1.0),
                minHeight: 6,
                color: debtColor,
                backgroundColor: CustomTheme.primaryColors.shade100,
              ),
            ),
            if (threshold != null) ...[
              const SizedBox(height: 6),
              Text(
                  s.statement_debt_progress(
                      formatKasiMoney(threshold, account.currency),
                      formatKasiMoney(limit, account.currency)),
                  style: theme.textTheme.bodySmall),
            ],
          ],
          if (account.blocked || account.showAlert) ...[
            const SizedBox(height: 12),
            if (account.blocked)
              DebtBlockedPanel(account: account)
            else
              DebtAlertBanner(account: account),
          ],
        ],
      ),
    );
  }
}

class _Figure extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;

  const _Figure({required this.label, required this.value, this.color});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: theme.textTheme.bodySmall),
        const SizedBox(height: 2),
        Text(value,
            style: theme.textTheme.titleMedium
                ?.copyWith(color: color, fontWeight: FontWeight.w700)),
      ],
    );
  }
}

class _StatementItemTile extends StatelessWidget {
  final KasimanStatementItem item;
  final String currency;

  const _StatementItemTile({required this.item, required this.currency});

  String _natureLabel(S s) {
    switch (item.nature) {
      case 'FIN_COURSE':
        return s.statement_nature_fin_course;
      case 'ANNULATION':
        return s.statement_nature_annulation;
      case 'RECHARGE':
        return s.statement_nature_recharge;
      case 'VERSEMENT':
        return s.statement_nature_versement;
      case 'CARTE_CADEAU':
        return s.statement_nature_carte_cadeau;
      case 'REGLEMENT_DETTE':
        return s.statement_nature_reglement_dette;
      case 'AVENANT_ARRET':
        return s.statement_nature_avenant_arret;
      case 'CORRECTION':
        return s.statement_nature_correction;
      case 'CONTRE_PASSATION':
        return s.statement_nature_contre_passation;
      case 'OUVERTURE':
        return s.statement_nature_ouverture;
      default:
        return s.statement_nature_other;
    }
  }

  IconData get _icon {
    switch (item.nature) {
      case 'FIN_COURSE':
        return Ionicons.car_sport;
      case 'ANNULATION':
        return Ionicons.close_circle;
      case 'REGLEMENT_DETTE':
        return Ionicons.receipt;
      case 'VERSEMENT':
        return Ionicons.cash;
      case 'RECHARGE':
        return Ionicons.add_circle;
      default:
        return Ionicons.swap_horizontal;
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final theme = Theme.of(context);
    String money(double v) => formatKasiMoney(v, currency);
    String signed(double v) => v > 0 ? '+${money(v)}' : money(v);
    final details = <MapEntry<String, String>>[
      if (item.orderPrice != null)
        MapEntry(s.statement_line_order_price, money(item.orderPrice!)),
      if ((item.cashCollected ?? 0) != 0)
        MapEntry(s.statement_line_cash, money(item.cashCollected!)),
      if (item.onlinePaid != 0)
        MapEntry(s.statement_line_online, signed(item.onlinePaid)),
      if (item.commission != 0)
        MapEntry(s.statement_line_commission, signed(item.commission)),
      if (item.tip != 0) MapEntry(s.statement_line_tip, signed(item.tip)),
      if (item.addedStop != 0)
        MapEntry(s.statement_line_added_stop, signed(item.addedStop)),
      if (item.settlement != 0)
        MapEntry(s.statement_line_settlement, signed(item.settlement)),
      if (item.other != 0) MapEntry(s.statement_line_other, signed(item.other)),
    ];
    final subtitle = [
      DateFormat('d MMM y, HH:mm',
              Localizations.localeOf(context).toString()).format(item.createdAt),
      if (item.requestId != null) s.statement_ride(item.requestId!),
      if (item.reference != null && item.reference!.isNotEmpty)
        s.statement_receipt(item.reference!),
    ].join(' · ');
    final amountColor = item.amount < 0
        ? theme.colorScheme.error
        : CustomTheme.primaryColors.shade700;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: CustomTheme.neutralColors.shade50,
          borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(_icon, color: CustomTheme.primaryColors.shade700, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_natureLabel(s), style: theme.textTheme.titleSmall),
                    const SizedBox(height: 2),
                    Text(subtitle, style: theme.textTheme.bodySmall),
                    if (item.motif != null && item.motif!.isNotEmpty)
                      Text(item.motif!, style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(signed(item.amount),
                  style: theme.textTheme.titleSmall?.copyWith(
                      color: amountColor, fontWeight: FontWeight.w700)),
            ],
          ),
          if (details.isNotEmpty) ...[
            const SizedBox(height: 8),
            for (final d in details)
              Padding(
                padding: const EdgeInsets.only(left: 32, top: 2),
                child: Row(
                  children: [
                    Expanded(
                        child: Text(d.key, style: theme.textTheme.bodySmall)),
                    Text(d.value, style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
          ],
          Padding(
            padding: const EdgeInsets.only(left: 32, top: 6),
            child: Text(s.statement_balance_after(money(item.balanceAfter)),
                style: theme.textTheme.bodySmall
                    ?.copyWith(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}

class _StatementFooter extends StatelessWidget {
  final KasimanStatementState state;

  const _StatementFooter({required this.state});

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    Widget child;
    if (state.loading) {
      child = const CircularProgressIndicator();
    } else if (state.error != null) {
      child = Column(
        children: [
          Text(getErrorMessage(context, state.error),
              textAlign: TextAlign.center),
          TextButton(
              onPressed: () => state.items.isEmpty
                  ? context.read<KasimanStatementCubit>().reload()
                  : context.read<KasimanStatementCubit>().loadMore(),
              child: Text(s.debt_blocked_refresh)),
        ],
      );
    } else if (state.items.isEmpty) {
      child = Text(s.statement_empty);
    } else if (state.hasMore) {
      child = OutlinedButton(
          onPressed: () => context.read<KasimanStatementCubit>().loadMore(),
          child: Text(s.statement_load_more));
    } else {
      child = const SizedBox.shrink();
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Center(child: child),
    );
  }
}
