import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../models/biomarker.dart';
import '../theme/tokens.dart';

/// Radial gauge of segmented arc wedges, one per biomarker, grouped by status
/// (alert → review → optimal → untested). Centre shows the tested count.
class StatusDial extends StatelessWidget {
  final StatusCounts counts;
  final double size;
  const StatusDial({super.key, required this.counts, this.size = 224});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(size: Size(size, size), painter: _DialPainter(counts)),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('${counts.tested}',
                  style: display(size * 0.225, weight: FontWeight.w800, color: T.ink, spacing: -1)),
              Text('BIOMARKERS',
                  style: bodyText(10, weight: FontWeight.w600, color: T.inkMuted)
                      .copyWith(letterSpacing: 2)),
            ],
          ),
        ],
      ),
    );
  }
}

class _DialPainter extends CustomPainter {
  final StatusCounts c;
  _DialPainter(this.c);

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final thickness = size.width * 0.085;
    final radius = size.width / 2 - 9 - thickness / 2;
    final rect = Rect.fromCircle(center: center, radius: radius);

    final segments = <(int, Color)>[
      (c.alert, T.rust),
      (c.suboptimal, T.amber),
      (c.optimal, T.green),
      (c.untested, T.untested),
    ];
    final total = c.total < 1 ? 1 : c.total;
    final step = 2 * math.pi / total;
    final gap = step * 0.16;

    var idx = 0;
    for (final (count, color) in segments) {
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = thickness
        ..strokeCap = StrokeCap.butt
        ..color = color;
      for (var i = 0; i < count; i++) {
        final start = -math.pi / 2 + idx * step + gap / 2;
        canvas.drawArc(rect, start, step - gap, false, paint);
        idx++;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DialPainter old) =>
      old.c.optimal != c.optimal ||
      old.c.suboptimal != c.suboptimal ||
      old.c.alert != c.alert ||
      old.c.untested != c.untested;
}
