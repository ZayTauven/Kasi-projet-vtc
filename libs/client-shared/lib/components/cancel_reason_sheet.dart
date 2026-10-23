import 'dart:async';

import 'package:client_shared/components/sheet_title_view.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

/// Motif d'annulation tel que lu au serveur (`cancelReasons`). Le libellé est
/// celui du catalogue (saisi en français dans le panel) : pas de traduction
/// côté app.
class CancelReasonOption {
  final String id;
  final String title;

  const CancelReasonOption({required this.id, required this.title});
}

/// Textes de la feuille, fournis par l'app appelante (chaque app a ses
/// propres fichiers de traduction).
class CancelReasonSheetLabels {
  final String title;
  final String confirm;
  final String back;
  final String unavailable;

  const CancelReasonSheetLabels({
    required this.title,
    required this.confirm,
    required this.back,
    required this.unavailable,
  });
}

/// Choix fait dans la feuille. `reasonId` vaut `null` quand la liste n'a pas
/// pu être lue (réseau, liste vide) : l'annulation part alors sans motif.
class CancelReasonChoice {
  final String? reasonId;

  const CancelReasonChoice(this.reasonId);
}

/// Feuille « Pourquoi annulez-vous ? » (p3-mesures M4), qui remplace la
/// confirmation d'annulation. Rend `null` si l'utilisateur renonce.
///
/// Motif obligatoire quand la liste est arrivée (un appui sur un motif, puis
/// la confirmation). Repli : liste en échec, vide ou plus lente que
/// [timeout] -> la confirmation s'active sans motif ; l'annulation n'est
/// jamais bloquée par le motif.
Future<CancelReasonChoice?> showCancelReasonSheet({
  required BuildContext context,
  required Future<List<CancelReasonOption>> Function() loadReasons,
  required CancelReasonSheetLabels labels,
  String? warning,
  Duration timeout = const Duration(seconds: 20),
}) {
  return showModalBottomSheet<CancelReasonChoice>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    constraints: const BoxConstraints(maxWidth: 500),
    builder: (context) => CancelReasonSheet(
      loadReasons: loadReasons,
      labels: labels,
      warning: warning,
      timeout: timeout,
    ),
  );
}

class CancelReasonSheet extends StatefulWidget {
  final Future<List<CancelReasonOption>> Function() loadReasons;
  final CancelReasonSheetLabels labels;
  final String? warning;
  final Duration timeout;

  const CancelReasonSheet({
    Key? key,
    required this.loadReasons,
    required this.labels,
    this.warning,
    this.timeout = const Duration(seconds: 20),
  }) : super(key: key);

  @override
  State<CancelReasonSheet> createState() => _CancelReasonSheetState();
}

class _CancelReasonSheetState extends State<CancelReasonSheet> {
  List<CancelReasonOption>? _reasons;
  bool _unavailable = false;
  String? _selectedId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final reasons = await widget.loadReasons().timeout(widget.timeout);
      if (!mounted) return;
      setState(() {
        _reasons = reasons;
        _unavailable = reasons.isEmpty;
      });
    } catch (error) {
      debugPrint('[MOTIF-ANNULATION] liste indisponible : $error');
      if (!mounted) return;
      setState(() => _unavailable = true);
    }
  }

  bool get _canConfirm => _unavailable || _selectedId != null;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final errorColor = theme.colorScheme.error;
    final reasons = _reasons;
    return SafeArea(
      minimum: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SheetTitleView(
            title: widget.labels.title,
            closeAction: () => Navigator.pop(context),
          ),
          if (widget.warning != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                widget.warning!,
                style: theme.textTheme.bodyMedium,
              ),
            ),
          Flexible(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: _unavailable
                  ? Padding(
                      key: const ValueKey('unavailable'),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Text(
                        widget.labels.unavailable,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyMedium?.copyWith(
                            color: CustomTheme.neutralColors.shade600),
                      ),
                    )
                  : reasons == null
                      ? const Padding(
                          key: ValueKey('loading'),
                          padding: EdgeInsets.symmetric(vertical: 32),
                          // Pas de `Center` : sous `Flexible`, il prendrait
                          // toute la hauteur et la feuille s'ouvrirait en
                          // plein écran pendant le chargement.
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [CircularProgressIndicator()],
                          ),
                        )
                      : SingleChildScrollView(
                          key: const ValueKey('list'),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: reasons
                                .map((reason) => _ReasonRow(
                                      title: reason.title,
                                      selected: reason.id == _selectedId,
                                      onPressed: () => setState(
                                          () => _selectedId = reason.id),
                                    ))
                                .toList(),
                          ),
                        ),
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: errorColor,
              foregroundColor: Colors.white,
            ),
            onPressed: _canConfirm
                ? () => Navigator.pop(context,
                    CancelReasonChoice(_unavailable ? null : _selectedId))
                : null,
            child: Text(widget.labels.confirm, textAlign: TextAlign.center),
          ),
          const SizedBox(height: 4),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(widget.labels.back, textAlign: TextAlign.center),
          ),
        ],
      ),
    );
  }
}

class _ReasonRow extends StatelessWidget {
  final String title;
  final bool selected;
  final VoidCallback onPressed;

  const _ReasonRow(
      {required this.title, required this.selected, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return CupertinoButton(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
      minimumSize: Size.zero,
      onPressed: onPressed,
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: theme.textTheme.titleMedium,
            ),
          ),
          const SizedBox(width: 12),
          Icon(
            selected ? Icons.radio_button_checked : Icons.radio_button_off,
            color: selected
                ? CustomTheme.primaryColors.shade600
                : CustomTheme.neutralColors.shade400,
          ),
        ],
      ),
    );
  }
}
