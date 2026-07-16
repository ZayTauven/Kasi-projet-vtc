import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

mixin CustomTheme {
  static const MaterialColor neutralColors = MaterialColor(
    0xff6f7d98, // 0% comes in here, this will be color picked if no shade is selected when defining a Color property which doesn’t require a swatch.
    <int, Color>{
      50: Color(0xfff2f5fa), //10%
      100: Color(0xffe9ecf5), //20%
      200: Color(0xffdfe4ef), //30%
      300: Color(0xffc2cce0), //40%
      400: Color(0xffa9b5cc), //50%
      500: Color(0xff8c9ab5), //60%
      600: Color(0xff516281), //70%
      700: Color(0xff324260), //80%
      800: Color(0xff172643), //90%
      900: Color(0xff0a1833), //100%
    },
  );
  // Kasi pétrole (ancre 600 = #1285a2, teal échantillonné du logo). Identité alignée sur la console admin + la landing.
  static const MaterialColor primaryColors = MaterialColor(
    0xff1285a2, // couleur par défaut quand aucune nuance n'est demandée = pétrole de marque
    <int, Color>{
      50: Color(0xffe7f3f7), //10%
      100: Color(0xffc3e1ea), //20%
      200: Color(0xff9bcedc), //30%
      300: Color(0xff72bace), //40%
      400: Color(0xff53abc3), //50%
      500: Color(0xff349cb9), //60%
      600: Color(0xff1285a2), //70% — ancre pétrole (logo)
      700: Color(0xff0f6c85), //80%
      800: Color(0xff0b5468), //90%
      900: Color(0xff073544), //100%
    },
  );

  // Kasi orange accent (ancre 500 = #f0982e), aligné sur la console admin.
  static const MaterialColor secondaryColors = MaterialColor(
    0xfff0982e, // 0% comes in here, this will be color picked if no shade is selected when defining a Color property which doesn’t require a swatch.
    <int, Color>{
      50: Color(0xfffef3e6), //10%
      100: Color(0xfffbdfc0), //20%
      200: Color(0xfff8c996), //30%
      300: Color(0xfff5b26b), //40%
      400: Color(0xfff2a24b), //50%
      500: Color(0xfff0982e), //60% — ancre orange Kasi
      600: Color(0xffe07d10), //70%
      700: Color(0xffbd6410), //80%
      800: Color(0xff964f0e), //90%
      900: Color(0xff6f3a0a), //100%
    },
  );

  static const double tabletBreakpoint = 1280;

  static final ThemeData theme1 = ThemeData(
    useMaterial3: true,
    fontFamily: GoogleFonts.dmSans().fontFamily, // corps de texte = DM Sans (identité Kasi)
    dividerColor: Color(0xffb9c5db),
    dividerTheme: DividerThemeData(thickness: 0.5, color: Color(0xffb9c5db)),
    bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: primaryColors.shade50,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(
          top: Radius.circular(20), // arrondi v3 (les poignées sont gérées écran par écran)
        ))),
    snackBarTheme:
        SnackBarThemeData(backgroundColor: Colors.transparent, elevation: 0),
    splashColor: primaryColors.shade400,
    highlightColor: primaryColors.shade200,
    dialogTheme: DialogThemeData(
        titleTextStyle: TextStyle(color: neutralColors.shade800)),
    appBarTheme:
        const AppBarTheme(systemOverlayStyle: SystemUiOverlayStyle.dark),
    colorScheme: ColorScheme(
        brightness: Brightness.light,
        primary: primaryColors,
        onPrimary: Colors.white,
        secondary: secondaryColors,
        onSecondary: Colors.white,
        error: const Color(0xffB20D0E),
        onError: Colors.white,
        background: Color(0xfff9fafb),
        onBackground: neutralColors.shade500,
        surface: neutralColors.shade100,
        onSurface: neutralColors.shade700),
    textTheme: TextTheme(
        // Titres display/headline = Bricolage Grotesque (identité Kasi)
        displayLarge: GoogleFonts.bricolageGrotesque(
          color: primaryColors.shade900,
          fontSize: 45,
          fontWeight: FontWeight.w700,
          fontStyle: FontStyle.normal,
          letterSpacing: -1.125,
        ),
        displayMedium: GoogleFonts.bricolageGrotesque(
          color: primaryColors.shade900,
          fontSize: 36,
          fontWeight: FontWeight.w700,
          fontStyle: FontStyle.normal,
          letterSpacing: -0.9,
        ),
        displaySmall: GoogleFonts.bricolageGrotesque(
          color: primaryColors.shade900,
          fontSize: 28,
          fontWeight: FontWeight.w700,
          fontStyle: FontStyle.normal,
          letterSpacing: -0.7,
        ),
        headlineLarge: GoogleFonts.bricolageGrotesque(
          color: neutralColors.shade900,
          fontSize: 22,
          fontWeight: FontWeight.w700,
          fontStyle: FontStyle.normal,
          letterSpacing: -0.55,
        ),
        headlineMedium: TextStyle(
          color: primaryColors.shade900,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          fontStyle: FontStyle.normal,
          letterSpacing: -0.45,
        ),
        titleLarge: TextStyle(
          color: neutralColors.shade800,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          fontStyle: FontStyle.normal,
          letterSpacing: -0.45,
        ),
        headlineSmall: const TextStyle(
          color: Colors.white,
          fontSize: 16,
          fontWeight: FontWeight.w700,
          fontStyle: FontStyle.normal,
          letterSpacing: -0.4,
        ),
        titleMedium: TextStyle(
          color: neutralColors.shade800,
          fontSize: 16,
          fontWeight: FontWeight.w600,
          fontStyle: FontStyle.normal,
          letterSpacing: -0.4,
        ),
        bodyMedium: TextStyle(
          color: neutralColors.shade800,
          fontSize: 18,
          fontWeight: FontWeight.w400,
          fontStyle: FontStyle.normal,
          letterSpacing: -0.45,
        ),
        bodySmall: TextStyle(
          color: neutralColors.shade600,
          fontSize: 16,
          fontWeight: FontWeight.w400,
          fontStyle: FontStyle.normal,
          letterSpacing: -0.4,
        ),
        labelLarge: const TextStyle(
          color: neutralColors,
          fontSize: 16,
          fontWeight: FontWeight.w400,
          fontStyle: FontStyle.normal,
          letterSpacing: -0.4,
        ),
        titleSmall: TextStyle(
          color: primaryColors.shade900,
          fontSize: 14,
          fontWeight: FontWeight.w600,
          fontStyle: FontStyle.normal,
          letterSpacing: -0.35,
        ),
        labelMedium: const TextStyle(
          color: neutralColors,
          fontSize: 14,
          fontWeight: FontWeight.w400,
          fontStyle: FontStyle.normal,
          letterSpacing: -0.35,
        ),
        labelSmall: const TextStyle(
          color: neutralColors,
          fontSize: 12,
          fontWeight: FontWeight.w400,
          fontStyle: FontStyle.normal,
        )),
    outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              side: BorderSide(
                  color: CustomTheme.neutralColors.shade300, width: 2),
              borderRadius: BorderRadius.circular(10), // <-- Radius
            ))),
    elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
            backgroundColor: primaryColors,
            foregroundColor: Colors.white,
            textStyle: const TextStyle(
                fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
            shadowColor: CustomTheme.neutralColors.shade50,
            elevation: 5,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10), // <-- Radius
            ),
            padding: const EdgeInsets.all(16))),
    tabBarTheme: TabBarThemeData(
        indicator: BoxDecoration(
          color: CustomTheme.primaryColors.shade300,
          borderRadius: BorderRadius.circular(24),
        ),
        dividerColor: Colors.transparent,
        unselectedLabelColor: CustomTheme.neutralColors,
        labelColor: CustomTheme.primaryColors.shade900,
        indicatorColor: Colors.transparent,
        labelPadding: EdgeInsets.zero),
    inputDecorationTheme: InputDecorationTheme(
        fillColor: neutralColors.shade200,
        filled: true,
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: primaryColors, width: 1.5)),
        hintStyle: TextStyle(
            color: neutralColors.shade600,
            fontSize: 16,
            fontWeight: FontWeight.normal),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        )),
  );
}
