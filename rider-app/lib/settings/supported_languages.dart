/// Langues proposées à l'utilisateur dans les Paramètres.
///
/// Volontairement plus courte que `S.supportedLocales` : les 21 fichiers ARB
/// hérités du template restent en place (rien n'est supprimé), mais Kasi
/// n'expose que les langues réellement pertinentes pour son marché. Le français
/// est la langue par défaut de l'application — voir `main.dart`, qui lit
/// `Locale(box.get('language') ?? 'fr')`.
///
/// Le choix de la langue n'apparaît plus dans l'onboarding : imposer un écran
/// de sélection avant même la première utilisation, avec l'anglais présélectionné
/// sur un marché francophone, était le premier écran que voyait un nouvel
/// utilisateur. C'est désormais une personnalisation, accessible après
/// authentification depuis Paramètres → Langue.
///
/// Ajouter une langue ici suffit à la proposer, à condition que son ARB existe
/// dans `lib/l10n/` et que sa locale soit déclarée dans `S.supportedLocales`.
const Map<String, String> kSupportedLanguages = {
  "fr": "Français",
  "en": "English",
};

/// Code de langue utilisé tant que l'utilisateur n'a rien choisi.
const String kDefaultLanguageCode = "fr";
