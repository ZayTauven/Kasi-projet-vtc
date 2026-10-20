import 'package:flutter/material.dart';

/// bug-debordements (p2-vehicules, 2026-10-20) : bouton « pilule » de la barre
/// supérieure de l'accueil (solde, « Aller en ligne » / « Passer hors ligne »).
///
/// Remplace `FloatingActionButton.extended`, dont le libellé ne rétrécit
/// jamais : sa `Row` interne n'a pas d'enfant flexible, si bien qu'un
/// `Flexible` autour du bouton ne faisait que le rogner et le texte venait
/// chevaucher le solde voisin. Ici le libellé est `Flexible` et s'élide.
class TopBarPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color backgroundColor;
  final Color foregroundColor;
  final VoidCallback? onPressed;
  final TextStyle? textStyle;

  /// Montant : se reduit plutot que de s'elider (un solde tronque ment).
  final bool scaleDown;

  const TopBarPill({
    Key? key,
    required this.icon,
    required this.label,
    required this.backgroundColor,
    required this.foregroundColor,
    required this.onPressed,
    this.textStyle,
    this.scaleDown = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(boxShadow: [
        BoxShadow(color: Color(0x14000000), offset: Offset(0, 3), blurRadius: 15)
      ]),
      child: Material(
        color: backgroundColor,
        shape: const StadiumBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onPressed,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 20, color: foregroundColor),
                  const SizedBox(width: 8),
                  Flexible(child: _label(context)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _label(BuildContext context) {
    final text = Text(
      label,
      maxLines: 1,
      softWrap: false,
      overflow: scaleDown ? TextOverflow.visible : TextOverflow.ellipsis,
      style: (textStyle ?? Theme.of(context).textTheme.titleMedium)
          ?.copyWith(color: foregroundColor),
    );
    if (!scaleDown) return text;
    return FittedBox(
        fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: text);
  }
}
