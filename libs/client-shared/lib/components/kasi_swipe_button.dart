import 'package:flutter/material.dart';

import 'package:client_shared/theme/theme.dart';

/// Bouton « glisser pour confirmer » custom (aucun package externe), aligné sur
/// l'identité v3 Kasi (pétrole/orange, corps DM Sans).
///
/// Comportement : une pastille pleine glisse depuis la gauche d'une piste
/// arrondie pleine largeur ; le label est centré. Lorsque l'utilisateur glisse
/// la pastille au-delà du seuil ([_thresholdFraction] = 85 % de la course),
/// [onConfirmed] est déclenché et la pastille reste en fin de course avec un
/// spinner tant que l'action asynchrone (ou [isLoading]) est en cours. Si la
/// pastille est relâchée avant le seuil, elle revient au départ en animation.
class KasiSwipeButton extends StatefulWidget {
  /// Libellé centré, ex. « Glisser pour démarrer ».
  final String label;

  /// Action asynchrone déclenchée au franchissement du seuil (ex. mutation).
  final Future<void> Function() onConfirmed;

  /// Icône de la pastille (flèche par défaut).
  final IconData? icon;

  /// Désactive le bouton et affiche un spinner (ex. pendant la mutation).
  final bool isLoading;

  /// Couleur de base ; défaut = pétrole de marque (CustomTheme.primaryColors).
  final Color? color;

  /// Hauteur de la piste (et diamètre de la pastille = height - 2*padding).
  final double height;

  const KasiSwipeButton({
    Key? key,
    required this.label,
    required this.onConfirmed,
    this.icon,
    this.isLoading = false,
    this.color,
    this.height = 58,
  }) : super(key: key);

  @override
  State<KasiSwipeButton> createState() => _KasiSwipeButtonState();
}

class _KasiSwipeButtonState extends State<KasiSwipeButton>
    with SingleTickerProviderStateMixin {
  /// Position horizontale courante de la pastille (px depuis la gauche).
  double _dragPosition = 0;

  /// True pendant l'attente de [onConfirmed] déclenché par un glissé réussi.
  bool _confirming = false;

  /// Fraction de la course à franchir pour déclencher la confirmation.
  static const double _thresholdFraction = 0.85;

  /// Marge interne entre la piste et la pastille.
  static const double _padding = 4;

  late final AnimationController _resetController;

  @override
  void initState() {
    super.initState();
    _resetController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 220),
    );
  }

  @override
  void dispose() {
    _resetController.dispose();
    super.dispose();
  }

  bool get _disabled => widget.isLoading || _confirming;

  void _animateBack() {
    final from = _dragPosition;
    if (from <= 0) return;
    _resetController.reset();
    final anim = Tween<double>(begin: from, end: 0).animate(
        CurvedAnimation(parent: _resetController, curve: Curves.easeOut));
    void listener() {
      if (!mounted) return;
      setState(() => _dragPosition = anim.value);
    }

    _resetController.addListener(listener);
    _resetController.forward().whenComplete(() {
      _resetController.removeListener(listener);
    });
  }

  void _onDragUpdate(DragUpdateDetails details, double maxDrag) {
    setState(() {
      _dragPosition = (_dragPosition + details.delta.dx).clamp(0.0, maxDrag);
    });
  }

  Future<void> _onDragEnd(double maxDrag) async {
    if (maxDrag > 0 && _dragPosition >= maxDrag * _thresholdFraction) {
      setState(() {
        _dragPosition = maxDrag;
        _confirming = true;
      });
      try {
        await widget.onConfirmed();
      } finally {
        if (mounted) {
          setState(() => _confirming = false);
          _animateBack();
        }
      }
    } else {
      _animateBack();
    }
  }

  @override
  Widget build(BuildContext context) {
    final Color color = widget.color ?? CustomTheme.primaryColors;
    return LayoutBuilder(builder: (context, constraints) {
      final double trackWidth = constraints.maxWidth;
      final double thumbSize = widget.height - _padding * 2;
      final double maxDrag =
          (trackWidth - thumbSize - _padding * 2).clamp(0.0, double.infinity);
      final double progress =
          maxDrag <= 0 ? 0.0 : (_dragPosition / maxDrag).clamp(0.0, 1.0);
      final bool showSpinner = _confirming || widget.isLoading;

      return Opacity(
        opacity: widget.isLoading && !_confirming ? 0.7 : 1,
        child: Container(
          height: widget.height,
          decoration: BoxDecoration(
            color: color.withOpacity(0.14),
            borderRadius: BorderRadius.circular(widget.height / 2),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Label centré, qui s'estompe à mesure que la pastille avance.
              Padding(
                padding: EdgeInsets.symmetric(horizontal: thumbSize + 8),
                child: Opacity(
                  opacity: (1 - progress * 1.4).clamp(0.0, 1.0),
                  child: Text(
                    widget.label,
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: color,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ),
              ),
              // Pastille glissante.
              Positioned(
                left: _padding + _dragPosition,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onHorizontalDragUpdate: _disabled
                      ? null
                      : (details) => _onDragUpdate(details, maxDrag),
                  onHorizontalDragEnd:
                      _disabled ? null : (_) => _onDragEnd(maxDrag),
                  child: Container(
                    width: thumbSize,
                    height: thumbSize,
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(thumbSize / 2),
                      boxShadow: const [
                        BoxShadow(
                            color: Color(0x22000000),
                            offset: Offset(0, 2),
                            blurRadius: 6)
                      ],
                    ),
                    child: Center(
                      child: showSpinner
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.4,
                                valueColor:
                                    AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : Icon(
                              widget.icon ?? Icons.arrow_forward_rounded,
                              color: Colors.white,
                              size: 26,
                            ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    });
  }
}
