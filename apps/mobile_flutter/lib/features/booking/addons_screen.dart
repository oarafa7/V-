import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../models/addon.dart';
import '../../theme/tokens.dart';

/// Add-ons — pick extra blood markers to test on top of your plan. Selection is
/// held in [AddonSelection]; the running total (with 14% VAT) is charged at
/// checkout when the booking is confirmed. Markers are grouped by category.
class AddonsScreen extends ConsumerStatefulWidget {
  const AddonsScreen({super.key});

  @override
  ConsumerState<AddonsScreen> createState() => _AddonsScreenState();
}

const _vatRate = 0.14;
String _egp(int n) => 'EGP $n';

class _AddonsScreenState extends ConsumerState<AddonsScreen> {
  List<AddonMarker> _markers = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await ref.read(apiProvider).dio.get('/addons');
      final markers = ((r.data['addons'] as List?) ?? const [])
          .cast<Map<String, dynamic>>()
          .map(AddonMarker.fromJson)
          .toList();
      if (!mounted) return;
      setState(() {
        _markers = markers;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  int get _subtotal => _markers
      .where((m) => AddonSelection.isSelected(m.id))
      .fold(0, (sum, m) => sum + m.priceEgp);
  int get _vat => (_subtotal * _vatRate).round();
  int get _total => _subtotal + _vat;

  @override
  Widget build(BuildContext context) {
    // Preserve server ordering while grouping by category.
    final groups = <String, List<AddonMarker>>{};
    for (final m in _markers) {
      groups.putIfAbsent(m.categoryName, () => []).add(m);
    }
    final selectedCount = _markers.where((m) => AddonSelection.isSelected(m.id)).length;

    return Scaffold(
      backgroundColor: T.canvas,
      appBar: AppBar(
        backgroundColor: T.canvas,
        elevation: 0,
        foregroundColor: T.ink,
        leading: const BackButton(color: T.ink),
        title: Text('Extra tests', style: display(20, color: T.ink)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: T.accent))
          : _markers.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.science_outlined, size: 40, color: T.inkMuted),
                        const SizedBox(height: 8),
                        Text('No add-ons available', style: display(20, color: T.ink)),
                        const SizedBox(height: 4),
                        Text('There are no extra markers to purchase right now.',
                            textAlign: TextAlign.center, style: bodyText(13, color: T.inkSoft)),
                      ],
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                  children: [
                    Text(
                      'Add markers that aren’t in your plan. You’ll pay for these at checkout '
                      'when you confirm your booking.',
                      style: bodyText(13, color: T.inkSoft),
                    ),
                    const SizedBox(height: 20),
                    for (final entry in groups.entries) ...[
                      Text(entry.key.toUpperCase(),
                          style: bodyText(11, weight: FontWeight.w600, color: T.accent)
                              .copyWith(letterSpacing: 1.2)),
                      const SizedBox(height: 8),
                      for (final m in entry.value)
                        _MarkerTile(
                          m,
                          selected: AddonSelection.isSelected(m.id),
                          onTap: () => setState(() => AddonSelection.toggle(m.id)),
                        ),
                      const SizedBox(height: 16),
                    ],
                  ],
                ),
      bottomNavigationBar: _loading || _markers.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('$selectedCount selected · VAT ${_egp(_vat)}',
                            style: bodyText(13, color: T.inkSoft)),
                        Text(_egp(_total), style: display(20, color: T.ink)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: T.ink,
                          foregroundColor: T.canvas,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () => Navigator.of(context).pop(),
                        child: Text(selectedCount > 0 ? 'Done' : 'Skip extras'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}

class _MarkerTile extends StatelessWidget {
  final AddonMarker marker;
  final bool selected;
  final VoidCallback onTap;
  const _MarkerTile(this.marker, {required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: selected ? T.accent.withOpacity(0.06) : T.panel,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: selected ? T.accent : T.line, width: selected ? 1.5 : 1),
          ),
          child: Row(
            children: [
              Icon(selected ? Icons.check_box : Icons.check_box_outline_blank,
                  size: 20, color: selected ? T.accent : T.inkMuted),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(marker.name, style: bodyText(15, color: T.ink)),
                    if (marker.unit.isNotEmpty)
                      Text(marker.unit, style: bodyText(11, color: T.inkMuted)),
                  ],
                ),
              ),
              Text('EGP ${marker.priceEgp}', style: display(15, color: T.ink)),
            ],
          ),
        ),
      ),
    );
  }
}
