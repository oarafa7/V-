import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../models/biomarker.dart';
import '../../theme/tokens.dart';
import '../../widgets/range_bar.dart';
import '../../widgets/range_reference_chart.dart';

final resultHistoryProvider =
    FutureProvider.family<List<ResultPoint>, String>((ref, id) => ref.read(apiProvider).resultHistory(id));

class BiomarkerDetailScreen extends ConsumerWidget {
  final Biomarker marker;
  const BiomarkerDetailScreen({super.key, required this.marker});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final m = marker;
    final color = T.statusColor(m.status);
    final history = ref.watch(resultHistoryProvider(m.id)).valueOrNull ?? const [];

    return Scaffold(
      appBar: AppBar(backgroundColor: T.canvas, elevation: 0, foregroundColor: T.ink),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        children: [
          Text(m.name, style: display(30, weight: FontWeight.w700, color: T.ink, spacing: -0.5)),
          const SizedBox(height: 10),
          // Inline status line: ● status · value unit
          Row(
            children: [
              Container(width: 9, height: 9, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Text(m.status.label, style: bodyText(16, weight: FontWeight.w600, color: color)),
              if (m.value != null) ...[
                Text('  ·  ', style: bodyText(16, color: T.inkMuted)),
                Text(_fmt(m.value!), style: display(16, color: T.ink)),
                const SizedBox(width: 4),
                Text(m.unit, style: bodyText(13, color: T.inkSoft)),
              ],
            ],
          ),
          if (m.description.isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(m.description, style: bodyText(15, color: T.inkSoft, height: 1.55)),
          ],
          const SizedBox(height: 22),
          RangeReferenceChart(marker: m, history: history),
          const SizedBox(height: 16),
          RangeBar(marker: m),
          const SizedBox(height: 8),
          Text('Optimal ${_fmt(m.optimalLow)}–${_fmt(m.optimalHigh)} ${m.unit}',
              style: bodyText(12, color: T.inkMuted)),
          _section('Why it matters?', m.whyItMatters),
          _section('What affects this marker', m.whatAffectsIt),
          const SizedBox(height: 8),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
          decoration: const BoxDecoration(
            color: T.canvas,
            border: Border(top: BorderSide(color: T.line)),
          ),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: T.ink,
                    side: const BorderSide(color: T.line),
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => _soon(context),
                  child: const Text('Book a Test'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: T.ink,
                    foregroundColor: T.canvas,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => _soon(context),
                  child: const Text('Add Result'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _section(String title, String body) {
    if (body.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: display(20, color: T.ink)),
          const SizedBox(height: 8),
          Text(body, style: bodyText(15, color: T.inkSoft, height: 1.6)),
        ],
      ),
    );
  }

  void _soon(BuildContext context) =>
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Coming soon in the Flutter port')));

  static String _fmt(double v) => v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toString();
}
