import 'package:flutter/material.dart';
import 'package:kasi_rider/l10n/messages.dart';

/// Dernier écran du parcours d'inscription.
///
/// Ses deux textes étaient codés en dur en anglais (« Congrats », « Sign up
/// completed! ») : c'était le dernier mot adressé à un nouveau client, dans une
/// langue qui n'est pas celle du marché.
class LoginSuccessPage extends StatelessWidget {
  const LoginSuccessPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(S.of(context).login_success_congrats,
              style: Theme.of(context).textTheme.headlineLarge),
          const SizedBox(
            height: 4,
          ),
          Text(
            S.of(context).login_success_subtitle,
            style: Theme.of(context)
                .textTheme
                .headlineMedium
                ?.copyWith(color: const Color(0xff108910)),
          )
        ],
      ),
    );
  }
}
