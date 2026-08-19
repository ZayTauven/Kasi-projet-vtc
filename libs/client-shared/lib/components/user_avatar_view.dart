import 'package:flutter/cupertino.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';

import 'package:client_shared/components/kasi_network_image.dart';
import 'package:client_shared/theme/theme.dart';

class UserAvatarView extends StatelessWidget {
  final String urlPrefix;
  final String? url;
  final double cornerRadius;
  final double size;
  final Color? backgroundColor;

  const UserAvatarView(
      {required this.urlPrefix,
      required this.url,
      required this.cornerRadius,
      required this.size,
      this.backgroundColor,
      Key? key})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
        borderRadius: BorderRadius.circular(cornerRadius),
        // Le repli n'existait que pour `url == null`. Quand une photo de profil
        // etait referencee en base mais absente du volume (cas courant : les
        // televersements anterieurs au montage du volume), le chargement
        // echouait et Flutter affichait le texte de l'exception a la place du
        // visage — « HTTP request failed, statusCode: 404 » en clair, dans une
        // boite ronde de 50 pixels. `KasiNetworkImage` degrade desormais vers
        // la meme silhouette que le cas sans URL.
        child: url != null
            ? KasiNetworkImage(
                url: urlPrefix + url!,
                width: size,
                height: size,
                fit: BoxFit.cover,
                placeholderIcon: Ionicons.person,
                borderRadius: cornerRadius,
              )
            : _fallback());
  }

  Widget _fallback() => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(cornerRadius),
          color: backgroundColor ?? CustomTheme.neutralColors.shade100,
        ),
        child: Icon(
          Ionicons.person,
          size: size,
          color: CustomTheme.neutralColors.shade600,
        ),
      );
}
