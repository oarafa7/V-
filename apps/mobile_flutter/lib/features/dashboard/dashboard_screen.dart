import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth.dart';
import '../../models/biomarker.dart';
import '../../theme/tokens.dart';
import '../biomarkers/biomarkers_provider.dart';

class DashboardScreen extends ConsumerWidget {
  final VoidCallback onOpenLabs;
  const DashboardScreen({super.key, required this.onOpenLabs});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).valueOrNull;
    final counts = ref.watch(countsProvider);
    final firstName = (user?.firstName.isNotEmpty ?? false) ? user!.firstName : 'there';

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        children: [
          Text('WELCOME BACK',
              style: bodyText(12, weight: FontWeight.w600, color: T.accent).copyWith(letterSpacing: 2)),
          const SizedBox(height: 4),
          Text(firstName, style: display(34, color: T.ink)),
          const SizedBox(height: 24),
          if (counts.tested > 0) _CountBarHero(counts: counts, onTap: onOpenLabs),
          const SizedBox(height: 16),
          _DashCard(icon: Icons.show_chart, title: 'VITAL Score', subtitle: 'Your overall health score & trend'),
          const SizedBox(height: 10),
          _DashCard(icon: Icons.auto_awesome, title: 'VITAL AI', subtitle: 'Insights & answers from your results'),
          const SizedBox(height: 10),
          _DashCard(icon: Icons.checklist, title: 'Recommendations', subtitle: 'Supplements & lifestyle tailored to you'),
          const SizedBox(height: 10),
          _DashCard(icon: Icons.event_available, title: 'Book a Test', subtitle: 'Schedule a home blood draw near you'),
        ],
      ),
    );
  }
}

class _CountBarHero extends StatelessWidget {
  final StatusCounts counts;
  final VoidCallback onTap;
  const _CountBarHero({required this.counts, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final maxCount = [counts.optimal, counts.suboptimal, counts.alert, 1].reduce((a, b) => a > b ? a : b);
    final cols = <(String, int, Color)>[
      ('Optimal', counts.optimal, T.green),
      ('Review', counts.suboptimal, T.amber),
      ('Out of Range', counts.alert, T.rust),
    ];
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: T.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: T.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('BIOMARKERS',
                    style: bodyText(11, weight: FontWeight.w600, color: T.accent).copyWith(letterSpacing: 2)),
                const Icon(Icons.chevron_right, size: 18, color: T.inkSoft),
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 140,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  for (final (label, n, color) in cols)
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text('$n', style: display(30, weight: FontWeight.w800, color: color)),
                          const SizedBox(height: 2),
                          Text(label, style: bodyText(12, color: T.inkSoft)),
                          const SizedBox(height: 8),
                          Container(
                            width: 36,
                            height: (n / maxCount * 84).clamp(8, 84).toDouble(),
                            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(8)),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            RichText(
              text: TextSpan(
                style: bodyText(14, color: T.inkSoft),
                children: [
                  TextSpan(text: '${counts.optimal}', style: bodyText(14, weight: FontWeight.w700, color: T.ink)),
                  TextSpan(text: ' of ${counts.tested} markers optimal'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DashCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  const _DashCard({required this.icon, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: T.panel,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: T.line),
      ),
      child: Row(
        children: [
          Icon(icon, size: 22, color: T.accent),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: display(16, color: T.ink)),
                Text(subtitle, style: bodyText(12, color: T.inkSoft)),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, size: 20, color: T.inkSoft),
        ],
      ),
    );
  }
}
