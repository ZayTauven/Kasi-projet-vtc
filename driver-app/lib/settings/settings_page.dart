import 'package:client_shared/components/back_button.dart';
import 'package:client_shared/config.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:modal_bottom_sheet/modal_bottom_sheet.dart';
import 'package:kasi_driver/gen/assets.gen.dart';
import 'package:kasi_driver/settings/language_settings.dart';
import 'package:kasi_driver/settings/map_settings.dart';
import 'package:kasi_driver/query_result_view.dart';
import 'package:kasi_driver/register/register.graphql.dart';
import 'package:kasi_driver/session_token.dart';

import 'package:kasi_driver/l10n/messages.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              KasiBackButton(text: S.of(context).action_back),
              const SizedBox(height: 16),
              Text(
                S.of(context).settings,
                style: Theme.of(context).textTheme.headlineLarge,
              ),
              const SizedBox(height: 16),
              if (demoMode)
                SettingItem(
                  icon: Assets.ionicons.map,
                  title: S.of(context).mapSettings,
                  onPressed: () {
                    showBarModalBottomSheet(
                        context: context,
                        builder: (context) {
                          return const MapSettingsPage();
                        });
                  },
                ),
              const Divider(),
              SettingItem(
                icon: Assets.ionicons.language,
                title: S.of(context).languageSettings,
                onPressed: () {
                  showBarModalBottomSheet(
                      context: context,
                      builder: (context) {
                        return const LanguageSettings();
                      });
                },
              ),
              const Divider(),
              SettingItem(
                icon: Assets.ionicons.trashOutline,
                title: S.of(context).action_delete_account,
                destructive: true,
                onPressed: () => _confirmAccountDeletion(context),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Deplacee ici depuis la boite de deconnexion du tiroir : une action
  // irreversible n'a pas sa place a cote d'un simple « se deconnecter ».
  void _confirmAccountDeletion(BuildContext context) {
    showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
              title: Text(S.of(context).dialog_account_deletion_title),
              content: Text(S.of(context).dialog_account_deletion_body),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(dialogContext),
                    child: Text(S.of(context).action_cancel)),
                Mutation$DeleteUser$Widget(
                    options: WidgetOptions$Mutation$DeleteUser(
                      onCompleted: (p0, p1) async {
                        await clearSession();
                        if (dialogContext.mounted) {
                          Navigator.pop(dialogContext);
                        }
                      },
                      onError: (error) =>
                          showOperationErrorMessage(dialogContext, error),
                    ),
                    builder: (runMutation, result) {
                      return TextButton(
                          onPressed: () => runMutation(),
                          child: Text(
                            S.of(context).action_delete_account,
                            style: const TextStyle(color: Color(0xffb20d0e)),
                          ));
                    }),
              ],
            ));
  }
}

class SettingItem extends StatelessWidget {
  final SvgGenImage icon;
  final String title;
  final Function() onPressed;

  /// Teinte l'entree en rouge pour les actions irreversibles.
  final bool destructive;

  const SettingItem(
      {Key? key,
      required this.icon,
      required this.title,
      required this.onPressed,
      this.destructive = false})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    final foreground = destructive
        ? const Color(0xffb20d0e)
        : CustomTheme.neutralColors.shade600;
    return CupertinoButton(
      minSize: 0,
      padding: const EdgeInsets.symmetric(vertical: 4),
      onPressed: onPressed,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: destructive
                    ? const Color(0xffb20d0e).withValues(alpha: 0.12)
                    : const Color(0xFFDFE4EF)),
            child: icon.svg(width: 20, height: 20, color: foreground),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(color: destructive ? foreground : null),
            ),
          ),
          const SizedBox(width: 8),
          Assets.ionicons.chevronForward.svg(
              color: CustomTheme.neutralColors.shade600, width: 15, height: 15),
        ],
      ),
    );
  }
}
