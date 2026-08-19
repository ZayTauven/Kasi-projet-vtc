import 'package:flutter/material.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';

import '../theme/theme.dart';

/// Vignette distante tolérante à l'échec de chargement.
///
/// `Image.network` sans `errorBuilder` affiche, en cas d'échec, un widget
/// d'erreur qui rend **le texte de l'exception dans l'interface**. C'est
/// l'origine des « HTTP request failed, statusCode: 404 » lisibles en clair
/// dans les cartes de commande — et des débordements qu'ils provoquaient, ce
/// message ne tenant évidemment pas dans une boîte dimensionnée pour une
/// vignette de 75 pixels. Aucun des huit points de chargement des deux apps
/// n'en déclarait.
///
/// Un média absent est un cas NORMAL : le catalogue de services, les
/// promotions, les moyens de paiement et les photos de profil sont téléversés
/// depuis le panel, et rien ne garantit qu'un fichier existe toujours sur le
/// volume. On dégrade donc vers une vignette neutre plutôt que d'exposer une
/// trace technique à l'utilisateur.
class KasiNetworkImage extends StatelessWidget {
  /// URL complète de l'image, ou `null` s'il n'y a pas de média.
  final String? url;
  final double? width;
  final double? height;
  final BoxFit? fit;

  /// Icône de la vignette de repli, à adapter au contenu attendu.
  final IconData placeholderIcon;

  /// Rayon d'arrondi du repli, pour qu'il s'aligne sur l'image qu'il remplace.
  final double borderRadius;

  const KasiNetworkImage({
    Key? key,
    required this.url,
    this.width,
    this.height,
    this.fit,
    this.placeholderIcon = Ionicons.image,
    this.borderRadius = 8,
  }) : super(key: key);

  /// Construit l'URL à partir d'un préfixe serveur et d'une adresse relative.
  ///
  /// Les deux formats coexistent en base (`uploads/x.png` et `/uploads/x.png`)
  /// alors que `serverUrl` se termine déjà par « / » : la concaténation naïve
  /// produisait `.../rider-api//uploads/x.png`, que le serveur de fichiers
  /// statiques rejette en 404. [_normalize] absorbe le cas.
  factory KasiNetworkImage.fromAddress({
    Key? key,
    required String urlPrefix,
    required String? address,
    double? width,
    double? height,
    BoxFit? fit,
    IconData placeholderIcon = Ionicons.image,
    double borderRadius = 8,
  }) =>
      KasiNetworkImage(
        key: key,
        url: (address == null || address.isEmpty) ? null : urlPrefix + address,
        width: width,
        height: height,
        fit: fit,
        placeholderIcon: placeholderIcon,
        borderRadius: borderRadius,
      );

  static String? _normalize(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    final schemeEnd = raw.indexOf('://');
    if (schemeEnd < 0) return raw.replaceAll(RegExp(r'/{2,}'), '/');
    final scheme = raw.substring(0, schemeEnd + 3);
    final rest = raw.substring(schemeEnd + 3).replaceAll(RegExp(r'/{2,}'), '/');
    return scheme + rest;
  }

  @override
  Widget build(BuildContext context) {
    final address = _normalize(url);
    if (address == null) return _placeholder();
    return Image.network(
      address,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (context, error, stackTrace) => _placeholder(),
      // Le repli sert aussi de réservation d'espace pendant le téléchargement :
      // sans lui, la vignette apparaît d'un coup et décale ce qui l'entoure.
      frameBuilder: (context, child, frame, wasSynchronouslyLoaded) =>
          (wasSynchronouslyLoaded || frame != null) ? child : _placeholder(),
    );
  }

  Widget _placeholder() {
    final double side = width ?? height ?? 32;
    return Container(
      width: width,
      height: height,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: CustomTheme.neutralColors.shade100,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: Icon(
        placeholderIcon,
        size: (side * 0.45).clamp(12.0, 36.0),
        color: CustomTheme.neutralColors.shade600,
      ),
    );
  }
}
