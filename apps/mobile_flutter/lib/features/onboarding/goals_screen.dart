import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../theme/tokens.dart';

/// Step 3 (final) of post-signup onboarding — pick up to three health goals.
class GoalsScreen extends ConsumerStatefulWidget {
  final VoidCallback onDone;
  const GoalsScreen({super.key, required this.onDone});

  @override
  ConsumerState<GoalsScreen> createState() => _GoalsScreenState();
}

class _Goal {
  final String slug;
  final String label;
  final String? icon;
  const _Goal({required this.slug, required this.label, this.icon});

  static _Goal? tryFrom(Object? raw) {
    if (raw is! Map) return null;
    final slug = raw['slug']?.toString();
    if (slug == null || slug.isEmpty) return null;
    final label = raw['label']?.toString();
    return _Goal(
      slug: slug,
      label: (label == null || label.isEmpty) ? slug : label,
      icon: raw['icon']?.toString(),
    );
  }
}

const _maxSelection = 3;

const _iconMap = <String, IconData>{
  'heart': Icons.favorite_outline,
  'energy': Icons.bolt_outlined,
  'sleep': Icons.bedtime_outlined,
  'weight': Icons.monitor_weight_outlined,
  'longevity': Icons.eco_outlined,
  'fitness': Icons.fitness_center_outlined,
  'stress': Icons.self_improvement_outlined,
  'nutrition': Icons.restaurant_outlined,
  'hormones': Icons.science_outlined,
  'brain': Icons.psychology_outlined,
};

class _GoalsScreenState extends ConsumerState<GoalsScreen> {
  late Future<List<_Goal>> _future;
  final _selected = <String>{};
  bool _busy = false;
  String? _saveError;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<_Goal>> _load() async {
    final r = await ref.read(apiProvider).dio.get('/health-goals');
    final data = r.data;
    final rawGoals = (data is Map ? data['goals'] : null);
    if (rawGoals is! List) return const [];
    return rawGoals.map(_Goal.tryFrom).whereType<_Goal>().toList();
  }

  void _toggle(String slug) {
    setState(() {
      if (_selected.contains(slug)) {
        _selected.remove(slug);
      } else if (_selected.length < _maxSelection) {
        _selected.add(slug);
      }
    });
  }

  Future<void> _submit() async {
    if (_selected.isEmpty) {
      setState(() => _saveError = 'Pick at least one goal.');
      return;
    }
    setState(() {
      _busy = true;
      _saveError = null;
    });
    try {
      await ref.read(apiProvider).dio.put('/users/me/goals', data: {
        'health_goals': _selected.toList(),
      });
      if (!mounted) return;
      widget.onDone();
    } on Object catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _saveError = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: T.canvas,
      appBar: AppBar(
        backgroundColor: T.canvas,
        elevation: 0,
        foregroundColor: T.ink,
        automaticallyImplyLeading: false,
        title: Text('What matters to you?', style: display(20, color: T.ink)),
      ),
      body: SafeArea(
        child: FutureBuilder<List<_Goal>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator(color: T.accent));
            }
            if (snap.hasError) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Text('${snap.error}',
                      textAlign: TextAlign.center, style: bodyText(14, color: T.inkSoft)),
                ),
              );
            }
            final goals = snap.data ?? const <_Goal>[];
            if (goals.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Text('No goals available right now.',
                      textAlign: TextAlign.center, style: bodyText(14, color: T.inkSoft)),
                ),
              );
            }
            return Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text('Choose up to $_maxSelection — we will focus your insights here.',
                            style: bodyText(14, color: T.inkSoft)),
                        const SizedBox(height: 20),
                        GridView.count(
                          crossAxisCount: 2,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 1.4,
                          children: [
                            for (final g in goals)
                              _GoalCard(
                                label: g.label,
                                icon: _iconMap[g.icon] ?? Icons.flag_outlined,
                                selected: _selected.contains(g.slug),
                                onTap: _busy ? null : () => _toggle(g.slug),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (_saveError != null) ...[
                        Text(_saveError!, style: bodyText(13, color: T.rust)),
                        const SizedBox(height: 10),
                      ],
                      FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: T.ink,
                          foregroundColor: T.canvas,
                          padding: const EdgeInsets.symmetric(vertical: 15),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: _busy ? null : _submit,
                        child: Text(_busy ? 'Saving…' : 'Continue',
                            style: bodyText(15, weight: FontWeight.w600, color: T.canvas)),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _GoalCard extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback? onTap;
  const _GoalCard({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: selected ? T.accent.withValues(alpha: 0.08) : T.panel,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? T.accent : T.line,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 24, color: selected ? T.accent : T.inkSoft),
            const Spacer(),
            Text(label, style: display(15, color: T.ink)),
          ],
        ),
      ),
    );
  }
}
