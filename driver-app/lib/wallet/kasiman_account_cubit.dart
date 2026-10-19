import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

import 'kasiman_account.graphql.dart';

/// Code stable du refus d'acceptation au-delà du plafond de dette
/// (driver-api, `extensions.code`, p2-argent I3).
const kasimanDebtLimitCode = 'KASIMAN_DEBT_LIMIT';

/// Compte du Kasiman tel que l'app l'affiche : solde, dette, plafond, niveau.
class KasimanAccount {
  final String currency;
  final double balance;
  final double debt;
  final double? debtLimit;
  final double? debtAlertThreshold;
  final bool blocked;
  final bool alert;

  const KasimanAccount({
    required this.currency,
    required this.balance,
    required this.debt,
    required this.debtLimit,
    required this.debtAlertThreshold,
    required this.blocked,
    required this.alert,
  });

  factory KasimanAccount.fromQuery(Query$KasimanAccount$kasimanAccount a) =>
      KasimanAccount(
        currency: a.currency.trim(),
        balance: a.balance,
        debt: a.debt,
        debtLimit: a.debtLimit,
        debtAlertThreshold: a.debtAlertThreshold,
        blocked: a.blocked,
        alert: a.alert,
      );

  /// Montant minimal à régler pour repasser sous le plafond.
  double get minimumToResume {
    final limit = debtLimit;
    if (limit == null || debt <= limit) return 0;
    return debt - limit;
  }

  /// Bandeau d'alerte : seuil atteint sans être bloqué.
  bool get showAlert => alert && !blocked;
}

class KasimanAccountState {
  final KasimanAccount? account;

  const KasimanAccountState({this.account});
}

/// État de la dette du Kasiman, partagé par l'accueil (bandeau, blocage), le
/// relevé et le refus d'acceptation. Les relectures sont silencieuses : une
/// erreur réseau garde le dernier état connu.
class KasimanAccountCubit extends Cubit<KasimanAccountState> {
  KasimanAccountCubit() : super(const KasimanAccountState());

  bool _inFlight = false;

  Future<void> refresh(GraphQLClient client) async {
    if (_inFlight || isClosed) return;
    _inFlight = true;
    try {
      final result = await client.query$KasimanAccount(
          Options$Query$KasimanAccount(
              fetchPolicy: FetchPolicy.networkOnly));
      if (isClosed || result.hasException) return;
      final data = result.parsedData?.kasimanAccount;
      emit(KasimanAccountState(
          account: data == null ? null : KasimanAccount.fromQuery(data)));
    } catch (_) {
      // Relecture silencieuse : on garde l'état précédent.
    } finally {
      _inFlight = false;
    }
  }

  /// Refus d'acceptation `KASIMAN_DEBT_LIMIT` : passe immédiatement en état
  /// bloqué avec les montants de l'erreur, avant la relecture du compte.
  /// Renvoie `true` si l'exception portait ce code.
  bool applyDebtLimitError(OperationException? exception) {
    final extensions = debtLimitExtensions(exception);
    if (extensions == null) return false;
    final balance = (extensions['balance'] as num?)?.toDouble();
    final limit = (extensions['debtLimit'] as num?)?.toDouble();
    final currency = extensions['currency']?.toString() ??
        state.account?.currency ??
        'XOF';
    if (balance != null) {
      emit(KasimanAccountState(
          account: KasimanAccount(
        currency: currency.trim(),
        balance: balance,
        debt: balance < 0 ? -balance : 0,
        debtLimit: limit ?? state.account?.debtLimit,
        debtAlertThreshold: state.account?.debtAlertThreshold,
        blocked: true,
        alert: true,
      )));
    }
    return true;
  }
}

/// Extensions de l'erreur `KASIMAN_DEBT_LIMIT`, ou `null`.
Map<String, dynamic>? debtLimitExtensions(OperationException? exception) {
  if (exception == null) return null;
  for (final error in exception.graphqlErrors) {
    final extensions = error.extensions;
    if (extensions != null && extensions['code'] == kasimanDebtLimitCode) {
      return extensions;
    }
  }
  return null;
}
