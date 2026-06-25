import 'package:flutter/material.dart';

import '../models/biomarker.dart';
import '../theme/tokens.dart';

/// Range-reference chart: a vertical optimal band on the left (green optimal,
/// rust above/below), a line across test dates with status-colored points, the
/// current value labeled, and a dashed projection to a hollow "next" point.
class RangeReferenceChart extends StatelessWidget {
  final Biomarker marker;
  final List<ResultPoint> history; // ascending (oldest → newest)
  final double height;
  const RangeReferenceChart({super.key, required this.marker, required this.history, this.height = 180});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      width: double.infinity,
      child: CustomPaint(painter: _ChartPainter(marker, history)),
    );
  }
}

class _ChartPainter extends CustomPainter {
  final Biomarker m;
  final List<ResultPoint> history;
  _ChartPainter(this.m, this.history);

  Color _statusColor(double v) {
    if (v >= m.optimalLow && v <= m.optimalHigh) return T.green;
    if (v >= m.normalLow && v <= m.normalHigh) return T.amber;
    return T.rust;
  }

  void _text(Canvas c, String s, Offset at, {Color color = T.inkMuted, double size = 10, FontWeight w = FontWeight.w400}) {
    final tp = TextPainter(
      text: TextSpan(text: s, style: TextStyle(color: color, fontSize: size, fontWeight: w)),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(c, at);
  }

  @override
  void paint(Canvas canvas, Size size) {
    final values = [
      ...history.map((p) => p.value),
      if (m.value != null) m.value!,
      m.optimalLow,
      m.optimalHigh,
    ];
    if (values.isEmpty) return;
    var yMin = values.reduce((a, b) => a < b ? a : b);
    var yMax = values.reduce((a, b) => a > b ? a : b);
    final pad = (yMax - yMin) == 0 ? (yMax.abs() * 0.2 + 1) : (yMax - yMin) * 0.18;
    yMin -= pad;
    yMax += pad;
    final span = (yMax - yMin) == 0 ? 1 : (yMax - yMin);

    const top = 18.0;
    final bottom = size.height - 22;
    final plotH = bottom - top;
    double y(double v) => bottom - ((v - yMin) / span) * plotH;

    // Left reference band.
    const bandX = 10.0, bandW = 10.0;
    final optTop = y(m.optimalHigh), optBot = y(m.optimalLow);
    final r = const Radius.circular(3);
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTRB(bandX, top, bandX + bandW, bottom), r),
      Paint()..color = T.rust.withOpacity(0.25),
    );
    canvas.drawRect(
      Rect.fromLTRB(bandX, optTop, bandX + bandW, optBot),
      Paint()..color = T.green,
    );
    _text(canvas, 'Optimal', Offset(bandX + bandW + 6, (optTop + optBot) / 2 - 7), color: T.inkSoft, size: 11);

    // Plot points across the right area.
    final pts = history.isEmpty && m.value != null
        ? [ResultPoint(m.value!, m.testedAt ?? '')]
        : history;
    if (pts.isEmpty) return;
    const leftX = 60.0;
    final rightX = size.width - 26;
    final n = pts.length;
    double px(int i) => n == 1 ? (leftX + rightX) / 2 : leftX + (i / (n - 1)) * (rightX - leftX);

    // Line through points.
    final linePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..color = const Color(0xFFC9BFA8);
    final path = Path();
    for (var i = 0; i < n; i++) {
      final o = Offset(px(i), y(pts[i].value));
      i == 0 ? path.moveTo(o.dx, o.dy) : path.lineTo(o.dx, o.dy);
    }
    canvas.drawPath(path, linePaint);

    // Points.
    for (var i = 0; i < n; i++) {
      final o = Offset(px(i), y(pts[i].value));
      canvas.drawCircle(o, 5, Paint()..color = _statusColor(pts[i].value));
    }

    // Current value label above the last point.
    final last = Offset(px(n - 1), y(pts[n - 1].value));
    _text(canvas, _fmt(pts[n - 1].value), Offset(last.dx - 10, last.dy - 18),
        color: _statusColor(pts[n - 1].value), size: 13, w: FontWeight.w700);

    // Dashed projection to a hollow "next" point.
    final nextX = (size.width - 12).clamp(rightX, size.width);
    final nextPt = Offset(nextX.toDouble(), last.dy);
    _dashed(canvas, last, nextPt, const Color(0xFFCFC6B2));
    canvas.drawCircle(nextPt, 5, Paint()..color = T.canvas);
    canvas.drawCircle(nextPt, 5, Paint()..style = PaintingStyle.stroke..strokeWidth = 2..color = T.inkMuted);
    _text(canvas, 'Next', Offset(nextPt.dx - 12, bottom + 6), color: T.inkMuted, size: 10);
  }

  void _dashed(Canvas canvas, Offset a, Offset b, Color color) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2.5;
    const dash = 4.0, gap = 4.0;
    final total = (b - a).distance;
    final dir = (b - a) / total;
    var d = 0.0;
    while (d < total) {
      final start = a + dir * d;
      final end = a + dir * (d + dash).clamp(0, total);
      canvas.drawLine(start, end, paint);
      d += dash + gap;
    }
  }

  static String _fmt(double v) => v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toString();

  @override
  bool shouldRepaint(covariant _ChartPainter old) =>
      old.m.id != m.id || old.history.length != history.length;
}
