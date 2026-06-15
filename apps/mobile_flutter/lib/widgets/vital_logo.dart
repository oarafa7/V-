import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// VITAL brand logo (vector, from the design system). "stacked" is the square
/// badge (icon + wordmark); "horizontal" is the lockup for headers. The SVG's
/// warm-paper background matches the app canvas, so it blends seamlessly.
class VitalLogo extends StatelessWidget {
  final double size;
  final bool horizontal;
  const VitalLogo({super.key, this.size = 120, this.horizontal = false});

  @override
  Widget build(BuildContext context) {
    if (horizontal) {
      // viewBox 380×130 → keep aspect ratio.
      return SvgPicture.asset(
        'assets/logo/vital-horizontal.svg',
        width: size,
        height: size * 130 / 380,
      );
    }
    return SvgPicture.asset('assets/logo/vital-stacked.svg', width: size, height: size);
  }
}
