import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../models/recommendation.dart';
import '../../theme/tokens.dart';

final recommendationsProvider =
    FutureProvider<List<Recommendation>>((ref) => ref.read(apiProvider).recommendations());

const _catIcon = {
  'supplement': Icons.medication_outlined,
  'nutrition': Icons.restaurant_outlined,
  'lifestyle': Icons.self_improvement,
  'retest': Icons.event_repeat,
};

class RecommendationsScreen extends ConsumerWidget {
  const RecommendationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(recommendationsProvider);
    return Scaffold(
      appBar: AppBar(
        backgroundColor: T.canvas,
        elevation: 0,
        foregroundColor: T.ink,
        title: Text('Recommendations', style: display(20, color: T.ink)),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator(color: T.accent)),
        error: (e, _) => Center(child: Text('$e', style: bodyText(14, color: T.inkSoft))),
        data: (recs) {
          if (recs.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text('No recommendations yet — they appear here based on your results.',
                    textAlign: TextAlign.center, style: bodyText(14, color: T.inkSoft)),
              ),
            );
          }
          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              for (final r in recs) ...[_RecCard(r), const SizedBox(height: 10)],
              const SizedBox(height: 8),
              Text(
                'Guidance only — not medical advice. Talk to a clinician before changing supplements or medication.',
                style: bodyText(11, color: T.inkMuted, height: 1.5),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _RecCard extends StatelessWidget {
  final Recommendation r;
  const _RecCard(this.r);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: T.panel, borderRadius: BorderRadius.circular(12), border: Border.all(color: T.line)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(_catIcon[r.category] ?? Icons.eco_outlined, size: 20, color: T.accent),
              const SizedBox(width: 10),
              Expanded(child: Text(r.name, style: display(16, color: T.ink))),
              if (r.evidenceLevel.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: T.green.withOpacity(0.15), borderRadius: BorderRadius.circular(999)),
                  child: Text(r.evidenceLevel,
                      style: bodyText(10, weight: FontWeight.w600, color: T.greenInk)),
                ),
            ],
          ),
          if (r.summary.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(r.summary, style: bodyText(14, color: T.inkSoft, height: 1.5)),
          ],
          if (r.dosage.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text('Dose: ${r.dosage}', style: bodyText(12, color: T.inkMuted)),
          ],
          if (r.matched.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final m in r.matched)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: T.card, borderRadius: BorderRadius.circular(999), border: Border.all(color: T.line)),
                    child: Text(m.name, style: bodyText(11, color: T.inkSoft)),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
