import 'package:flutter/material.dart';

import '../theme/theme.dart';

class EmptyStateCard extends StatelessWidget {
  final String title;
  final String description;
  final IconData icon;

  /// Illustration Kasi optionnelle (story-set) affichée à la place de l'icône.
  /// Chemin relatif au package client_shared, ex. 'assets/illustrations/empty_history.png'.
  final String? illustration;

  const EmptyStateCard(
      {required this.title,
      required this.description,
      required this.icon,
      this.illustration,
      Key? key})
      : super(key: key);
  @override
  Widget build(BuildContext context) {
    return Container(
        margin: const EdgeInsets.only(top: 24),
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 10),
        width: double.infinity,
        decoration: BoxDecoration(
            color: CustomTheme.primaryColors.shade200,
            borderRadius: BorderRadius.circular(10)),
        child: Column(
          children: [
            if (illustration != null)
              Image.asset(
                illustration!,
                package: 'client_shared',
                height: 140,
                fit: BoxFit.contain,
              )
            else
              Icon(
                icon,
                color: CustomTheme.neutralColors,
                size: 64,
              ),
            const SizedBox(height: 9),
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 5),
            Text(
              description,
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            )
          ],
        ));
  }
}
