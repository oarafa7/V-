import 'package:flutter/widgets.dart';

/// VITAL brand logo — the design-system colour mark (ring + wordmark) as a
/// baked PNG, so it renders identically everywhere regardless of fonts.
class VitalLogo extends StatelessWidget {
  final double size; // width; height follows the intrinsic ratio
  const VitalLogo({super.key, this.size = 120});

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/logo/vital-logo.png',
      width: size,
      height: size * 324 / 272,
      fit: BoxFit.contain,
    );
  }
}
