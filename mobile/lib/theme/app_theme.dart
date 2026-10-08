import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Couleurs reprises telles quelles des variables CSS du site
/// (assets/css/style.css) pour que l'appli mobile ait exactement
/// la même identité visuelle que le site web.
class AppColors {
  static const green = Color(0xFF1B4332);
  static const greenDark = Color(0xFF10281E);
  static const yellow = Color(0xFFF4C430);
  static const orange = Color(0xFFE8871E);
  static const cream = Color(0xFFFBF7EE);
  static const white = Color(0xFFFFFFFF);
  static const ink = Color(0xFF1A1A1A);
  static const gray = Color(0xFF6B7280);
  static const grayLight = Color(0xFFE5E7EB);

  /// Produits « Import sur commande » (badge, délai, acompte).
  static const importPurple = Color(0xFF7C3AED);
}

class AppTheme {
  static const double radius = 14;

  static ThemeData get theme {
    final base = ThemeData(useMaterial3: true);

    final textTheme = GoogleFonts.workSansTextTheme(base.textTheme).copyWith(
      displayLarge: GoogleFonts.anton(fontSize: 34, color: AppColors.ink),
      displayMedium: GoogleFonts.anton(fontSize: 26, color: AppColors.ink),
      titleLarge: GoogleFonts.anton(fontSize: 20, color: AppColors.ink),
      titleMedium: GoogleFonts.workSans(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: AppColors.ink,
      ),
      bodyLarge: GoogleFonts.workSans(fontSize: 15, color: AppColors.ink),
      bodyMedium: GoogleFonts.workSans(fontSize: 14, color: AppColors.gray),
    );

    return base.copyWith(
      scaffoldBackgroundColor: AppColors.cream,
      colorScheme: base.colorScheme.copyWith(
        primary: AppColors.green,
        secondary: AppColors.orange,
        surface: AppColors.white,
      ),
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.green,
        foregroundColor: AppColors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.anton(
          fontSize: 20,
          color: AppColors.white,
          letterSpacing: 0.5,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.white,
        elevation: 1.5,
        shadowColor: Colors.black.withValues(alpha: 0.08),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radius),
        ),
        margin: EdgeInsets.zero,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.orange,
          foregroundColor: AppColors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          textStyle: GoogleFonts.workSans(fontWeight: FontWeight.w600),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radius),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.green,
          side: const BorderSide(color: AppColors.green, width: 1.4),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radius),
          ),
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        selectedColor: AppColors.green,
        backgroundColor: AppColors.grayLight,
        labelStyle: GoogleFonts.workSans(fontWeight: FontWeight.w600),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius),
          borderSide: const BorderSide(color: AppColors.grayLight),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: AppColors.orange,
        foregroundColor: AppColors.white,
      ),
    );
  }
}
