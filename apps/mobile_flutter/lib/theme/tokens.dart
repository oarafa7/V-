import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Warm-paper design tokens — mirrors apps/mobile/constants/tokens.js so the
/// Flutter app matches the React Native app and the design handoff.
class T {
  static const canvas = Color(0xFFFBF6EC); // app background — warm cream
  static const panel = Color(0xFFF3EAD9); // sectioned / inset background
  static const card = Color(0xFFFFFFFF); // raised cards
  static const line = Color(0xFFE7DECC); // hairline dividers & borders

  static const ink = Color(0xFF20201C); // primary text & headings
  static const inkSoft = Color(0xFF6B6459); // secondary / body-dim
  static const inkMuted = Color(0xFFA89E92); // tertiary, captions

  // Status — data only, never interactive chrome.
  static const green = Color(0xFF6FA97D); // optimal
  static const greenInk = Color(0xFF3E7A53);
  static const amber = Color(0xFFCDA24E); // review / suboptimal
  static const rust = Color(0xFFC2603C); // alert / out of range
  static const untested = Color(0xFFB6AD9C);

  // Brand / interactive accent (same clay as rust by design intent).
  static const accent = Color(0xFFC2603C);

  static Color statusColor(BiomarkerStatus s) => switch (s) {
        BiomarkerStatus.optimal => green,
        BiomarkerStatus.suboptimal => amber,
        BiomarkerStatus.alert => rust,
        BiomarkerStatus.untested => untested,
      };
}

/// Biomarker status — mirrors @vital/shared BiomarkerStatus.
enum BiomarkerStatus {
  optimal,
  suboptimal,
  alert,
  untested;

  static BiomarkerStatus parse(String? v) => switch (v) {
        'optimal' => BiomarkerStatus.optimal,
        'suboptimal' => BiomarkerStatus.suboptimal,
        'alert' => BiomarkerStatus.alert,
        _ => BiomarkerStatus.untested,
      };

  String get label => switch (this) {
        BiomarkerStatus.optimal => 'Optimal',
        BiomarkerStatus.suboptimal => 'Review',
        BiomarkerStatus.alert => 'Out of Range',
        BiomarkerStatus.untested => 'Untested',
      };
}

/// App-wide ThemeData using Bricolage Grotesque (display) + Inter (body).
ThemeData buildTheme() {
  final base = ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: T.canvas,
    colorScheme: ColorScheme.fromSeed(seedColor: T.accent, brightness: Brightness.light),
  );
  final body = GoogleFonts.interTextTheme(base.textTheme);
  return base.copyWith(
    textTheme: body.copyWith(
      displayLarge: GoogleFonts.bricolageGrotesque(
        fontWeight: FontWeight.w800,
        color: T.ink,
        letterSpacing: -1,
      ),
      titleLarge: GoogleFonts.bricolageGrotesque(fontWeight: FontWeight.w700, color: T.ink),
    ),
  );
}

/// Display (Bricolage Grotesque) text style helper.
TextStyle display(double size, {FontWeight weight = FontWeight.w700, Color color = T.ink, double spacing = 0}) =>
    GoogleFonts.bricolageGrotesque(fontSize: size, fontWeight: weight, color: color, letterSpacing: spacing);

/// Body (Inter) text style helper.
TextStyle bodyText(double size, {FontWeight weight = FontWeight.w400, Color color = T.inkSoft, double height = 1.4}) =>
    GoogleFonts.inter(fontSize: size, fontWeight: weight, color: color, height: height);
