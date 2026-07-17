import 'package:client_shared/theme/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:kasi_driver/l10n/messages.dart';
import 'package:kasi_driver/schema.gql.dart';
import 'package:kasi_driver/shift_rules/shift_rules.graphql.dart';

/// Bannière informative (SOFT) rappelant au Kasiman la limite de temps de
/// service configurée quand au moins une règle est active (`enabled = true`).
///
/// Strictement non bloquante : aucune action, aucun compteur temps réel,
/// aucune mise hors-ligne. En cas d'erreur, de chargement ou d'absence de
/// règle active, le widget est silencieux ([SizedBox.shrink]).
class ShiftRuleBannerView extends StatelessWidget {
  const ShiftRuleBannerView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Query$ActiveShiftRules$Widget(
      builder: (result, {refetch, fetchMore}) {
        // Non bloquant : on ne montre rien tant que ce n'est pas exploitable.
        if (result.isLoading || result.hasException) {
          return const SizedBox.shrink();
        }

        final nodes = result.parsedData?.shiftRules.nodes;
        if (nodes == null || nodes.isEmpty) {
          return const SizedBox.shrink();
        }

        final rule = nodes.first;
        final hours = rule.maxHoursPerPeriod.toString();
        final message = rule.frequency == Enum$ShiftRuleFrequency.Weekly
            ? S.of(context).shift_rule_banner_weekly(hours)
            : S.of(context).shift_rule_banner_daily(hours);
        final breakText = rule.mandatoryBreakMinutes > 0
            ? S.of(context).shift_rule_banner_break(
                rule.mandatoryBreakMinutes.toString())
            : null;

        return Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
          decoration: BoxDecoration(
            color: CustomTheme.primaryColors.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: CustomTheme.primaryColors.shade100),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                Ionicons.time_outline,
                size: 20,
                color: CustomTheme.secondaryColors.shade600,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      message,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: CustomTheme.primaryColors.shade700,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    if (breakText != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        breakText,
                        style:
                            Theme.of(context).textTheme.labelSmall?.copyWith(
                                  color: CustomTheme.neutralColors.shade600,
                                ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
