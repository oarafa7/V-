import 'package:flutter/material.dart';

import '../models/biomarker.dart';
import '../theme/tokens.dart';

/// Compact 5-zone reference bar (low·review·optimal·review·high) with the value
/// plotted as a marker. Mirrors apps/mobile/components/ui/RangeBar.tsx (compact).
class RangeBar extends StatelessWidget {
  final Biomarker marker;
  const RangeBar({super.key, required this.marker});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 11,
      width: double.infinity,
      child: CustomPaint(painter: _RangePainter(marker)),
    );
  }
}

class _RangePainter extends CustomPainter {
  final Biomarker m;
  _RangePainter(this.m);

  @override
  void paint(Canvas canvas, Size size) {
    final span = (m.normalHigh - m.normalLow).abs().clamp(1e-6, double.infinity);
    final dMin = m.normalLow - span * 0.25;
    final dMax = m.normalHigh + span * 0.25;
    final dom = (dMax - dMin).clamp(1e-6, double.infinity);
    double pct(double x) => ((x - dMin) / dom).clamp(0.0, 1.0);

    final zones = <(double, double, Color)>[
      (pct(dMin), pct(m.normalLow), T.rust),
      (pct(m.normalLow), pct(m.optimalLow), T.amber),
      (pct(m.optimalLow), pct(m.optimalHigh), T.green),
      (pct(m.optimalHigh), pct(m.normalHigh), T.amber),
      (pct(m.normalHigh), pct(dMax), T.rust),
    ];

    final h = 5.0;
    final top = (size.height - h) / 2;
    final radius = const Radius.circular(3);
    // track
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(0, top, size.width, h), radius),
      Paint()..color = T.line,
    );
    for (final (a, b, c) in zones) {
      final left = a * size.width;
      final width = (b - a) * size.width;
      if (width <= 0) continue;
      canvas.drawRect(Rect.fromLTWH(left, top, width, h), Paint()..color = c.withOpacity(0.9));
    }

    if (m.value != null) {
      final x = pct(m.value!) * size.width;
      final cy = size.height / 2;
      canvas.drawCircle(Offset(x, cy), 5.5, Paint()..color = T.statusColor(m.status));
      canvas.drawCircle(
        Offset(x, cy),
        5.5,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..color = T.canvas,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _RangePainter old) => old.m.id != m.id || old.m.value != m.value;
}
