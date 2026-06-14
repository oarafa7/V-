import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/biomarker.dart';
import '../../theme/tokens.dart';
import '../../widgets/locked_view.dart';
import '../../widgets/range_bar.dart';
import '../../widgets/status_dial.dart';
import '../biomarker/biomarker_detail_screen.dart';
import '../subscription/subscription_provider.dart';
import 'biomarkers_provider.dart';

const _order = [
  BiomarkerStatus.alert,
  BiomarkerStatus.suboptimal,
  BiomarkerStatus.optimal,
  BiomarkerStatus.untested,
];

class LabsSummaryScreen extends ConsumerWidget {
  const LabsSummaryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Non-subscribers get the lock/upsell instead of the (gated) data.
    if (ref.watch(subscriptionActiveProvider).valueOrNull == false) {
      return const SafeArea(child: LockedView());
    }
    final markersAsync = ref.watch(biomarkersProvider);
    final counts = ref.watch(countsProvider);

    return SafeArea(
      child: markersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: T.accent)),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text("Couldn't load biomarkers.\n$e",
                textAlign: TextAlign.center, style: bodyText(14, color: T.inkSoft)),
          ),
        ),
        data: (markers) {
          final groups = [
            for (final s in _order)
              (s, markers.where((m) => m.status == s).toList()),
          ].where((g) => g.$2.isNotEmpty).toList();

          return ListView(
            padding: const EdgeInsets.fromLTRB(0, 12, 0, 32),
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Labs Summary', style: display(26, weight: FontWeight.w800, color: T.ink, spacing: -0.5)),
                    const SizedBox(height: 4),
                    Text('${counts.tested} of ${counts.total} biomarkers tested',
                        style: bodyText(12, color: T.inkSoft)),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Center(child: StatusDial(counts: counts)),
              const SizedBox(height: 8),
              Center(
                child: Text('${counts.tested} of ${counts.total} markers tested',
                    style: bodyText(13, color: T.inkSoft)),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    _Breakdown('Optimal', counts.optimal, T.green),
                    const SizedBox(width: 8),
                    _Breakdown('Review', counts.suboptimal, T.amber),
                    const SizedBox(width: 8),
                    _Breakdown('Out of Range', counts.alert, T.rust),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              for (final (status, items) in groups) _Group(status: status, items: items),
            ],
          );
        },
      ),
    );
  }
}

class _Breakdown extends StatelessWidget {
  final String label;
  final int n;
  final Color color;
  const _Breakdown(this.label, this.n, this.color);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.fromLTRB(8, 12, 8, 10),
        decoration: BoxDecoration(
          color: T.panel,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: T.line),
        ),
        child: Column(
          children: [
            Text('$n', style: display(30, weight: FontWeight.w800, color: color)),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(width: 6, height: 6, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                const SizedBox(width: 5),
                Flexible(child: Text(label, style: bodyText(11, color: T.inkSoft), textAlign: TextAlign.center)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Group extends StatelessWidget {
  final BiomarkerStatus status;
  final List<Biomarker> items;
  const _Group({required this.status, required this.items});

  @override
  Widget build(BuildContext context) {
    final color = T.statusColor(status);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 6, 20, 6),
          child: Row(
            children: [
              Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
              const SizedBox(width: 7),
              Text(status.label, style: display(15, weight: FontWeight.w700, color: T.ink)),
              const SizedBox(width: 8),
              Text('${items.length}', style: bodyText(12, color: T.inkMuted)),
            ],
          ),
        ),
        for (final m in items) _MarkerRow(m),
        Container(height: 1, color: T.line, margin: const EdgeInsets.only(top: 6, bottom: 6)),
      ],
    );
  }
}

class _MarkerRow extends StatelessWidget {
  final Biomarker m;
  const _MarkerRow(this.m);

  @override
  Widget build(BuildContext context) {
    final color = T.statusColor(m.status);
    final has = m.value != null;
    return InkWell(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => BiomarkerDetailScreen(marker: m)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 5),
              child: Container(width: 7, height: 7, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(m.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyText(14, color: T.ink)),
                  const SizedBox(height: 6),
                  if (has) RangeBar(marker: m) else Text('Not tested yet', style: bodyText(12, color: T.inkMuted)),
                ],
              ),
            ),
            if (has) ...[
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(_fmt(m.value!), style: display(17, color: color)),
                  Text(m.unit, style: bodyText(10, color: T.inkMuted)),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  static String _fmt(double v) => v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toString();
}
