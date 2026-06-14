import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../models/biomarker.dart';
import '../../theme/tokens.dart';
import '../biomarker/biomarker_detail_screen.dart';

/// Biomarkers in one category — `GET /biomarkers?category={slug}&limit=200`
/// → {biomarkers:[...]}.
final categoryBiomarkersProvider =
    FutureProvider.family<List<Biomarker>, String>((ref, slug) async {
  final r = await ref.read(apiProvider).dio.get(
    '/biomarkers',
    queryParameters: {'category': slug, 'limit': 200},
  );
  final list = ((r.data['biomarkers'] as List?) ?? const [])
      .cast<Map<String, dynamic>>();
  return list.map(Biomarker.fromJson).toList();
});

class CategoryDetailScreen extends ConsumerWidget {
  final String slug;
  final String name;
  const CategoryDetailScreen({super.key, required this.slug, required this.name});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(categoryBiomarkersProvider(slug));
    return Scaffold(
      appBar: AppBar(
        backgroundColor: T.canvas,
        elevation: 0,
        foregroundColor: T.ink,
        title: Text(name, style: display(20, color: T.ink)),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator(color: T.accent)),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Text(_msg(e), textAlign: TextAlign.center, style: bodyText(14, color: T.inkSoft)),
          ),
        ),
        data: (markers) {
          if (markers.isEmpty) {
            return Center(
              child: Text('No biomarkers in this category yet.', style: bodyText(14, color: T.inkSoft)),
            );
          }
          final counts = StatusCounts.from(markers);
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
            children: [
              Text(name, style: display(28, weight: FontWeight.w700, color: T.ink, spacing: -0.5)),
              const SizedBox(height: 4),
              Text('${markers.length} biomarkers', style: bodyText(13, color: T.inkMuted)),
              const SizedBox(height: 16),
              _Breakdown(counts: counts),
              const SizedBox(height: 20),
              for (final m in markers) _MarkerRow(marker: m),
            ],
          );
        },
      ),
    );
  }

  static String _msg(Object e) =>
      e is ApiException ? e.message : 'Could not load biomarkers — check your connection.';
}

class _Breakdown extends StatelessWidget {
  final StatusCounts counts;
  const _Breakdown({required this.counts});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: T.panel,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: T.line),
      ),
      child: Row(
        children: [
          _Stat(label: 'Optimal', value: counts.optimal, color: T.green),
          _Stat(label: 'Review', value: counts.suboptimal, color: T.amber),
          _Stat(label: 'Out of Range', value: counts.alert, color: T.rust),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  const _Stat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text('$value', style: display(24, color: color)),
          const SizedBox(height: 2),
          Text(label.toUpperCase(),
              textAlign: TextAlign.center,
              style: bodyText(10, weight: FontWeight.w600, color: T.inkMuted).copyWith(letterSpacing: 1)),
        ],
      ),
    );
  }
}

class _MarkerRow extends StatelessWidget {
  final Biomarker marker;
  const _MarkerRow({required this.marker});

  @override
  Widget build(BuildContext context) {
    final m = marker;
    final color = T.statusColor(m.status);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: T.card,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => BiomarkerDetailScreen(marker: m)),
          ),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: T.line),
            ),
            child: Row(
              children: [
                Container(width: 9, height: 9, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                const SizedBox(width: 12),
                Expanded(child: Text(m.name, style: bodyText(15, weight: FontWeight.w600, color: T.ink))),
                if (m.value != null) ...[
                  Text(_fmt(m.value!), style: display(16, color: color)),
                  const SizedBox(width: 4),
                  Text(m.unit, style: bodyText(12, color: T.inkSoft)),
                ] else
                  Text('—', style: bodyText(15, color: T.inkMuted)),
                const SizedBox(width: 6),
                const Icon(Icons.chevron_right, size: 18, color: T.inkMuted),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static String _fmt(double v) => v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toString();
}
