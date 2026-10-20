import 'package:intl/intl.dart';

/// bug-debordements (p2-vehicules, 2026-10-20) : `NumberFormat.simpleCurrency`
/// affiche « CFA » pour le franc CFA (XOF). Au Sénégal on écrit « FCFA »,
/// après le montant et sans décimales : « 10 300 FCFA ». Remplace
/// `NumberFormat.simpleCurrency(name: ...)` partout dans l'app.
NumberFormat kasiCurrencyFormat(String? currency) {
  final code = (currency ?? '').trim().toUpperCase();
  if (code == 'XOF' || code == 'XAF') {
    return NumberFormat.currency(locale: 'fr', symbol: 'FCFA', decimalDigits: 0);
  }
  return NumberFormat.simpleCurrency(name: code.isEmpty ? null : code);
}
