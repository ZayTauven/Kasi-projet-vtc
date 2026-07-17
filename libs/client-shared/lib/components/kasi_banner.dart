import 'package:flutter/material.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';

class KasiBanner extends StatelessWidget {
  final BannerType type;
  final String message;

  const KasiBanner(this.message, {Key? key, this.type = BannerType.success})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 8),
      decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          color: backgroundColorForBanner(),
          boxShadow: const [
            BoxShadow(
                color: Color(0x15000000), offset: Offset(2, 3), blurRadius: 10)
          ]),
      child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
        Icon(iconForBanner(), color: foregroundColorForBanner()),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            message,
            style: TextStyle(
              color: foregroundColorForBanner(),
              fontFamily: 'OpenSans',
              fontSize: 14,
              fontWeight: FontWeight.w600,
              fontStyle: FontStyle.normal,
              letterSpacing: -0.35,
            ),
          ),
        ),
      ]),
    );
  }

  Color backgroundColorForBanner() {
    switch (type) {
      case BannerType.success:
        return const Color(0xffc9ffc9);
      case BannerType.error:
        return const Color(0xffffd1d1);
    }
  }

  Color foregroundColorForBanner() {
    switch (type) {
      case BannerType.success:
        return const Color(0xff046c00);
      case BannerType.error:
        return const Color(0xff950101);
    }
  }

  IconData iconForBanner() {
    switch (type) {
      case BannerType.success:
        return Ionicons.checkmark_circle;
      case BannerType.error:
        return Ionicons.alert_circle;
    }
  }
}

enum BannerType { success, error }
