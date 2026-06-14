import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../models/plan.dart';
import '../../theme/tokens.dart';
import 'checkout_screen.dart';

/// Public plans listing — `GET /subscription-plans` → {plans:[...]}.
final plansProvider = FutureProvider<List<Plan>>((ref) async {
  final r = await ref.read(apiProvider).dio.get('/subscription-plans');
  final list = ((r.data['plans'] as List?) ?? const [])
      .cast<Map<String, dynamic>>();
  return list.map(Plan.fromJson).toList();
});

class PlansScreen extends ConsumerWidget {
  const PlansScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(plansProvider);
    return Scaffold(
      appBar: AppBar(
        backgroundColor: T.canvas,
        elevation: 0,
        foregroundColor: T.ink,
        title: Text('Plans', style: display(20, color: T.ink)),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator(color: T.accent)),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Text(_msg(e), textAlign: TextAlign.center, style: bodyText(14, color: T.inkSoft)),
          ),
        ),
        data: (plans) {
          if (plans.isEmpty) {
            return Center(
              child: Text('No plans available right now.', style: bodyText(14, color: T.inkSoft)),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
            itemCount: plans.length,
            separatorBuilder: (_, __) => const SizedBox(height: 16),
            itemBuilder: (context, i) => _PlanCard(plan: plans[i]),
          );
        },
      ),
    );
  }

  static String _msg(Object e) =>
      e is ApiException ? e.message : 'Could not load plans — check your connection.';
}

class _PlanCard extends StatelessWidget {
  final Plan plan;
  const _PlanCard({required this.plan});

  @override
  Widget build(BuildContext context) {
    final premium = plan.isPremium;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: T.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: premium ? T.accent : T.line, width: premium ? 1.5 : 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(_title(plan.name), style: display(20, color: T.ink)),
              if (premium) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: T.accent, borderRadius: BorderRadius.circular(999)),
                  child: Text('POPULAR',
                      style: bodyText(10, weight: FontWeight.w700, color: T.canvas).copyWith(letterSpacing: 1.2)),
                ),
              ],
            ],
          ),
          const SizedBox(height: 10),
          Text(plan.priceDisplay, style: display(30, weight: FontWeight.w800, color: T.ink, spacing: -1)),
          const SizedBox(height: 14),
          _MetaRow(label: 'Biomarkers covered', value: '${plan.biomarkerCount}'),
          const SizedBox(height: 4),
          _MetaRow(label: 'Tests per year', value: '${plan.annualTestsCount}'),
          if (plan.features.isNotEmpty) ...[
            const SizedBox(height: 14),
            for (final f in plan.features)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.check_circle, size: 18, color: T.green),
                    const SizedBox(width: 8),
                    Expanded(child: Text(f, style: bodyText(14, color: T.inkSoft, height: 1.4))),
                  ],
                ),
              ),
          ],
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: T.ink,
                foregroundColor: T.canvas,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => CheckoutScreen(plan: plan)),
              ),
              child: const Text('Subscribe'),
            ),
          ),
        ],
      ),
    );
  }

  static String _title(String name) =>
      name.isEmpty ? name : '${name[0].toUpperCase()}${name.substring(1)}';
}

class _MetaRow extends StatelessWidget {
  final String label;
  final String value;
  const _MetaRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: bodyText(13, color: T.inkMuted)),
        Text(value, style: bodyText(13, weight: FontWeight.w700, color: T.ink)),
      ],
    );
  }
}
