import 'package:country_code_picker/country_code_picker.dart';
import 'package:flutter/material.dart';

import '../config.dart';
import '../theme/theme.dart';

/// Champ d'indicatif téléphonique des écrans d'authentification (client et
/// Kasiman).
///
/// Les deux apps affichaient un sélecteur listant ~250 pays alors que Kasi
/// n'opère qu'au Sénégal, et proposaient par défaut l'indicatif de la locale de
/// l'appareil — « +1 » sur un téléphone configuré en anglais US, soit un
/// indicatif inutilisable pour toute personne du marché visé.
///
/// Tant que [allowCountrySelection] vaut `false`, l'indicatif de
/// [operatingCountryCode] est affiché en lecture seule. Le remettre à `true`
/// (dans `client_shared/config.dart`) restaure le sélecteur complet, sans
/// aucune autre modification : c'est le seul point à toucher le jour où Kasi
/// dessert un second pays.
class CountryCodeField extends StatelessWidget {
  /// Code ISO 3166-1 alpha-2 courant (« SN »), pas un indicatif téléphonique.
  final String countryCode;

  /// Notifié uniquement quand la sélection est autorisée.
  final ValueChanged<String> onChanged;

  const CountryCodeField({
    Key? key,
    required this.countryCode,
    required this.onChanged,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
          color: CustomTheme.neutralColors.shade200,
          borderRadius: BorderRadius.circular(10)),
      child: allowCountrySelection
          ? FormField<String?>(
              initialValue: countryCode,
              onSaved: (value) => onChanged(value ?? countryCode),
              builder: (state) => CountryCodePicker(
                boxDecoration: BoxDecoration(
                    color: CustomTheme.neutralColors.shade100,
                    borderRadius: BorderRadius.circular(10)),
                initialSelection: countryCode,
                onChanged: (code) {
                  state.didChange(code.code);
                  onChanged(code.code ?? countryCode);
                },
              ),
            )
          : _buildFixedCountry(context),
    );
  }

  Widget _buildFixedCountry(BuildContext context) {
    final country = CountryCode.fromCountryCode(operatingCountryCode);
    return Semantics(
      label: '$operatingDialCode ${country.name ?? operatingCountryCode}',
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (country.flagUri != null)
              Image.asset(
                country.flagUri!,
                package: 'country_code_picker',
                width: 28,
              ),
            const SizedBox(width: 8),
            Text(
              operatingDialCode,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ],
        ),
      ),
    );
  }
}
