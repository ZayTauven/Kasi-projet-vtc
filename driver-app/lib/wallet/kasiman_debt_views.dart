import 'dart:async';

import 'package:client_shared/components/back_button.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:intl/intl.dart';

import 'package:kasi_driver/l10n/messages.dart';
import '../main_bloc.dart';
import 'kasiman_account_cubit.dart';

/// Montant affiché au Kasiman : « 10 300 FCFA » pour le franc CFA, format
/// monétaire standard sinon.
String formatKasiMoney(double amount, String currency) {
  final code = currency.trim().toUpperCase();
  if (code == 'XOF' || code == 'XAF') {
    return '${NumberFormat.decimalPattern('fr').format(amount.round())} FCFA';
  }
  return NumberFormat.simpleCurrency(name: code).format(amount);
}

BoxShadow kasiCardShadow() => BoxShadow(
    color: CustomTheme.neutralColors.shade900.withValues(alpha: 0.08),
    offset: const Offset(0, 3),
    blurRadius: 20);

/// Relit le compte du Kasiman (p2-argent I3) : à l'affichage de l'accueil, au
/// retour au premier plan, à chaque changement d'état (en ligne, hors ligne,
/// en course : une fin de course peut endetter), et toutes les 60 s tant
/// qu'une alerte ou un blocage est affiché, pour que le déblocage par
/// l'opérateur apparaisse sans action du Kasiman.
class KasimanAccountWatcher extends StatefulWidget {
  final Widget child;

  const KasimanAccountWatcher({Key? key, required this.child})
      : super(key: key);

  @override
  State<KasimanAccountWatcher> createState() => _KasimanAccountWatcherState();
}

class _KasimanAccountWatcherState extends State<KasimanAccountWatcher>
    with WidgetsBindingObserver {
  static const Duration _period = Duration(seconds: 60);
  StreamSubscription<MainState>? _mainSub;
  StreamSubscription<KasimanAccountState>? _accountSub;
  Type? _lastMainState;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final mainBloc = context.read<MainBloc>();
    _lastMainState = mainBloc.state.runtimeType;
    _mainSub = mainBloc.stream.listen((state) {
      if (state.runtimeType != _lastMainState) {
        _lastMainState = state.runtimeType;
        _refresh();
      }
    });
    _accountSub = context
        .read<KasimanAccountCubit>()
        .stream
        .listen((_) => _updateTimer());
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
  }

  void _refresh() {
    if (!mounted) return;
    context
        .read<KasimanAccountCubit>()
        .refresh(GraphQLProvider.of(context).value);
  }

  void _updateTimer() {
    if (!mounted) return;
    final account = context.read<KasimanAccountCubit>().state.account;
    final watch = account != null && (account.alert || account.blocked);
    if (watch && _timer == null) {
      _timer = Timer.periodic(_period, (_) => _refresh());
    } else if (!watch) {
      _timer?.cancel();
      _timer = null;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refresh();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _mainSub?.cancel();
    _accountSub?.cancel();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

/// Bandeau d'accueil : seuil d'alerte atteint (orange), ou courses suspendues
/// pendant une course en cours (la course n'est jamais interrompue, le
/// blocage joue sur la suivante).
class DebtAlertBanner extends StatelessWidget {
  final KasimanAccount account;

  const DebtAlertBanner({Key? key, required this.account}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final blocked = account.blocked;
    final debt = formatKasiMoney(account.debt, account.currency);
    final limit = formatKasiMoney(account.debtLimit ?? 0, account.currency);
    final message = blocked
        ? s.debt_blocked_message(debt, limit)
        : s.debt_alert_banner(debt, limit);
    final foreground = blocked
        ? Theme.of(context).colorScheme.error
        : CustomTheme.secondaryColors.shade900;
    final radius = BorderRadius.circular(12);
    return Material(
      color: blocked
          ? CustomTheme.neutralColors.shade50
          : CustomTheme.secondaryColors.shade50,
      borderRadius: radius,
      child: InkWell(
        borderRadius: radius,
        onTap: () => Navigator.pushNamed(context, 'statement'),
        child: Container(
          decoration: BoxDecoration(
              borderRadius: radius,
              border: Border.all(
                  color: blocked
                      ? Theme.of(context).colorScheme.error
                      : CustomTheme.secondaryColors.shade300),
              boxShadow: [kasiCardShadow()]),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              Icon(blocked ? Ionicons.lock_closed : Ionicons.warning,
                  color: foreground, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  message,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: foreground, fontWeight: FontWeight.w600),
                ),
              ),
              const SizedBox(width: 4),
              Icon(Ionicons.chevron_forward, color: foreground, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}

/// Contenu de l'état bloqué : montant dû, minimum pour reprendre, marche à
/// suivre (règlement au guichet contre reçu).
class DebtBlockedPanel extends StatelessWidget {
  final KasimanAccount account;

  const DebtBlockedPanel({Key? key, required this.account}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final theme = Theme.of(context);
    final error = theme.colorScheme.error;
    final debt = formatKasiMoney(account.debt, account.currency);
    final limit = formatKasiMoney(account.debtLimit ?? 0, account.currency);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(children: [
          Icon(Ionicons.lock_closed, color: error, size: 24),
          const SizedBox(width: 8),
          Expanded(
              child: Text(s.debt_blocked_title,
                  style: theme.textTheme.titleLarge?.copyWith(color: error))),
        ]),
        const SizedBox(height: 8),
        Text(s.debt_blocked_message(debt, limit),
            style: theme.textTheme.bodyMedium),
        const SizedBox(height: 12),
        _AmountRow(
            label: s.debt_blocked_amount_due,
            value: debt,
            color: error,
            emphasized: true),
        if (account.minimumToResume > 0)
          _AmountRow(
              label: s.debt_blocked_minimum,
              value:
                  formatKasiMoney(account.minimumToResume, account.currency)),
        const SizedBox(height: 12),
        Text(s.debt_blocked_how_title, style: theme.textTheme.titleSmall),
        const SizedBox(height: 4),
        Text(s.debt_blocked_how_body, style: theme.textTheme.bodySmall),
        const SizedBox(height: 8),
        Wrap(
          alignment: WrapAlignment.end,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          runSpacing: 4,
          children: [
            TextButton.icon(
                onPressed: () => context
                    .read<KasimanAccountCubit>()
                    .refresh(GraphQLProvider.of(context).value),
                icon: const Icon(Ionicons.refresh, size: 18),
                label: Text(s.debt_blocked_refresh)),
            ElevatedButton(
                onPressed: () => Navigator.pushNamed(context, 'statement'),
                child: Text(s.debt_blocked_see_statement)),
          ],
        ),
      ],
    );
  }
}

class _AmountRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;
  final bool emphasized;

  const _AmountRow(
      {required this.label,
      required this.value,
      this.color,
      this.emphasized = false});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Text(label, style: theme.textTheme.bodyMedium)),
          const SizedBox(width: 8),
          Text(value,
              style: (emphasized
                      ? theme.textTheme.titleMedium
                      : theme.textTheme.bodyMedium)
                  ?.copyWith(color: color, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

/// Carte de blocage en bas de l'accueil, à la place de la barre d'avis et des
/// offres.
class DebtBlockedCard extends StatelessWidget {
  final KasimanAccount account;

  const DebtBlockedCard({Key? key, required this.account}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
          color: CustomTheme.neutralColors.shade50,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          boxShadow: [kasiCardShadow()]),
      child: SafeArea(
          top: false,
          minimum: const EdgeInsets.all(16),
          child: DebtBlockedPanel(account: account)),
    );
  }
}

/// Écran de blocage ouvert sur un refus d'acceptation `KASIMAN_DEBT_LIMIT`.
/// Se ferme seul dès que le compte n'est plus bloqué.
class DebtBlockedView extends StatelessWidget {
  const DebtBlockedView({Key? key}) : super(key: key);

  static bool _open = false;

  /// Ouvre l'écran une seule fois, même si plusieurs refus arrivent.
  static Future<void> open(BuildContext context) async {
    if (_open) return;
    _open = true;
    try {
      await Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => const DebtBlockedView(),
          settings: const RouteSettings(name: 'debt-blocked')));
    } finally {
      _open = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        minimum: const EdgeInsets.all(16),
        child: BlocConsumer<KasimanAccountCubit, KasimanAccountState>(
          listenWhen: (previous, next) =>
              (previous.account?.blocked ?? false) &&
              next.account != null &&
              !next.account!.blocked,
          listener: (context, state) => Navigator.of(context).maybePop(),
          builder: (context, state) {
            final account = state.account;
            return SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  KasiBackButton(text: S.of(context).action_back),
                  const SizedBox(height: 16),
                  if (account == null)
                    const Center(child: CircularProgressIndicator())
                  else
                    DebtBlockedPanel(account: account),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
