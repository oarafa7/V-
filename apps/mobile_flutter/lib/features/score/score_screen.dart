import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../models/score.dart';
import '../../theme/tokens.dart';

final scoreProvider = FutureProvider<VitalScore?>((ref) => ref.read(apiProvider).score());
final scoreHistoryProvider = FutureProvider<List<ScorePoint>>((ref) => ref.read(apiProvider).scoreHistory());

Color _scoreColor(int s) => s >= 80 ? T.green : (s >= 60 ? T.amber : T.rust);

class ScoreScreen extends ConsumerWidget {
  const ScoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(scoreProvider);
    return Scaffold(
      appBar: AppBar(
        backgroundColor: T.canvas,
        elevation: 0,
        foregroundColor: T.ink,
        title: Text('VITAL Score', style: display(20, color: T.ink)),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator(color: T.accent)),
        error: (e, _) => Center(child: Text('$e', style: bodyText(14, color: T.inkSoft))),
        data: (score) {
          if (score == null || score.testedCount == 0) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text('Your VITAL Score appears once you have biomarker results.',
                    textAlign: TextAlign.center, style: bodyText(14, color: T.inkSoft)),
              ),
            );
          }
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
            children: [
              _Hero(score: score, history: ref.watch(scoreHistoryProvider).valueOrNull ?? const []),
              const SizedBox(height: 20),
              Row(children: [
                _Metric('Biological age', score.biologicalAge?.toString() ?? '—', hint: _ageHint(score)),
                const SizedBox(width: 8),
                _Metric('Cardiometabolic', score.cardiometabolic?.toString() ?? '—', suffix: '/100'),
              ]),
              const SizedBox(height: 8),
              Row(children: [
                _Metric('Longevity', score.longevity?.toString() ?? '—', suffix: '/100'),
                const SizedBox(width: 8),
                _Metric('Confidence', '${score.confidence}', suffix: '%'),
              ]),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                    color: T.panel, borderRadius: BorderRadius.circular(10), border: Border.all(color: T.line)),
                child: RichText(
                  text: TextSpan(style: bodyText(13, color: T.inkSoft), children: [
                    const TextSpan(text: 'Based on '),
                    TextSpan(
                        text: '${score.testedCount} of ${score.totalCount}',
                        style: bodyText(13, weight: FontWeight.w700, color: T.ink)),
                    const TextSpan(text: ' markers tested. More results sharpen the picture.'),
                  ]),
                ),
              ),
              if (score.negative.isNotEmpty) _Drivers('Holding you back', score.negative, T.rust),
              if (score.positive.isNotEmpty) _Drivers('Working in your favour', score.positive, T.green),
            ],
          );
        },
      ),
    );
  }

  static String? _ageHint(VitalScore s) {
    if (s.ageDelta != null && s.ageDelta != 0) {
      return '${s.ageDelta! < 0 ? '−' : '+'}${s.ageDelta!.abs()}y vs ${s.chronologicalAge ?? '—'}';
    }
    return s.chronologicalAge != null ? 'chrono ${s.chronologicalAge}' : null;
  }
}

class _Hero extends StatelessWidget {
  final VitalScore score;
  final List<ScorePoint> history;
  const _Hero({required this.score, required this.history});

  @override
  Widget build(BuildContext context) {
    final color = _scoreColor(score.score);
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
          color: T.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: T.line)),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${score.score}', style: display(56, weight: FontWeight.w800, color: color, spacing: -1)),
              Text(score.band.toUpperCase(),
                  style: bodyText(11, weight: FontWeight.w600, color: T.inkMuted).copyWith(letterSpacing: 1.5)),
              if (score.biologicalAge != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: T.panel, borderRadius: BorderRadius.circular(999)),
                  child: Text('Bio age ${score.biologicalAge}', style: bodyText(12, color: T.inkSoft)),
                ),
              ],
            ],
          ),
          const Spacer(),
          if (history.length >= 2)
            SizedBox(width: 110, height: 56, child: CustomPaint(painter: _Sparkline(history, color))),
        ],
      ),
    );
  }
}

class _Sparkline extends CustomPainter {
  final List<ScorePoint> pts;
  final Color color;
  _Sparkline(this.pts, this.color);
  @override
  void paint(Canvas canvas, Size size) {
    final values = pts.map((p) => p.score.toDouble()).toList();
    final mn = values.reduce((a, b) => a < b ? a : b);
    final mx = values.reduce((a, b) => a > b ? a : b);
    final rng = (mx - mn) == 0 ? 1 : (mx - mn);
    final path = Path();
    for (var i = 0; i < values.length; i++) {
      final x = i / (values.length - 1) * size.width;
      final y = size.height - ((values[i] - mn) / rng) * size.height;
      i == 0 ? path.moveTo(x, y) : path.lineTo(x, y);
    }
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.round
        ..color = color,
    );
  }

  @override
  bool shouldRepaint(covariant _Sparkline old) => old.pts.length != pts.length;
}

class _Metric extends StatelessWidget {
  final String label;
  final String value;
  final String? suffix;
  final String? hint;
  const _Metric(this.label, this.value, {this.suffix, this.hint});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: T.panel, borderRadius: BorderRadius.circular(10), border: Border.all(color: T.line)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label.toUpperCase(),
                style: bodyText(10, weight: FontWeight.w600, color: T.inkMuted).copyWith(letterSpacing: 1.5)),
            const SizedBox(height: 4),
            RichText(
              text: TextSpan(style: display(24, color: T.ink), children: [
                TextSpan(text: value),
                if (suffix != null) TextSpan(text: suffix, style: bodyText(13, color: T.inkSoft)),
              ]),
            ),
            if (hint != null) Text(hint!, style: bodyText(11, color: T.inkSoft)),
          ],
        ),
      ),
    );
  }
}

class _Drivers extends StatelessWidget {
  final String title;
  final List<ScoreDriver> drivers;
  final Color color;
  const _Drivers(this.title, this.drivers, this.color);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 20),
        Text(title, style: display(18, color: T.ink)),
        const SizedBox(height: 8),
        for (final d in drivers)
          Container(
            margin: const EdgeInsets.only(bottom: 6),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
                color: T.panel, borderRadius: BorderRadius.circular(10), border: Border.all(color: T.line)),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(d.name, style: bodyText(14, color: T.ink)),
                      Text(d.category, style: bodyText(11, color: T.inkMuted)),
                    ],
                  ),
                ),
                Text('${d.score}', style: display(16, color: color)),
              ],
            ),
          ),
      ],
    );
  }
}
