import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth.dart';
import '../../models/biomarker.dart';
import '../../theme/tokens.dart';
import '../../widgets/vital_logo.dart';
import '../biomarkers/biomarkers_provider.dart';
import '../booking/booking_screen.dart';
import '../category/category_detail_screen.dart';
import '../insights/insights_screen.dart';
import '../notifications/notifications_screen.dart';
import '../recommendations/recommendations_screen.dart';
import '../score/score_screen.dart';

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
          const VitalLogo(horizontal: true, size: 150),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('WELCOME BACK',
                        style: bodyText(12, weight: FontWeight.w600, color: T.accent).copyWith(letterSpacing: 2)),
                    const SizedBox(height: 4),
                    Text(firstName, style: display(34, color: T.ink)),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.notifications_none, color: T.ink),
                onPressed: () => Navigator.of(context)
                    .push(MaterialPageRoute(builder: (_) => const NotificationsScreen())),
              ),
            ],
          ),
          const SizedBox(height: 24),
          if (counts.tested > 0) _CountBarHero(counts: counts, onTap: onOpenLabs),
          const SizedBox(height: 16),
          _DashCard(
            icon: Icons.show_chart,
            title: 'VITAL Score',
            subtitle: 'Your overall health score & trend',
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ScoreScreen())),
          ),
          const SizedBox(height: 10),
          _DashCard(
            icon: Icons.auto_awesome,
            title: 'VITAL AI',
            subtitle: 'Insights & answers from your results',
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const InsightsScreen())),
          ),
          const SizedBox(height: 10),
          _DashCard(
            icon: Icons.checklist,
            title: 'Recommendations',
            subtitle: 'Supplements & lifestyle tailored to you',
            onTap: () =>
                Navigator.of(context).push(MaterialPageRoute(builder: (_) => const RecommendationsScreen())),
          ),
          const SizedBox(height: 10),
          _DashCard(
            icon: Icons.event_available,
            title: 'Book a Test',
            subtitle: 'Schedule a home blood draw near you',
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const BookingScreen())),
          ),
          const SizedBox(height: 22),
          const _CategoriesRow(),
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

class _CategoriesRow extends ConsumerWidget {
  const _CategoriesRow();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cats = ref.watch(categoriesProvider).valueOrNull ?? const [];
    if (cats.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('CATEGORIES',
            style: bodyText(11, weight: FontWeight.w600, color: T.accent).copyWith(letterSpacing: 2)),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final c in cats)
              InkWell(
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => CategoryDetailScreen(slug: c.slug, name: c.name)),
                ),
                borderRadius: BorderRadius.circular(999),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: T.panel,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: T.line),
                  ),
                  child: Text(c.name, style: bodyText(13, color: T.ink)),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _DashCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;
  const _DashCard({required this.icon, required this.title, required this.subtitle, this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
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
      ),
    );
  }
}
