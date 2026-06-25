import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../models/biomarker.dart';
import '../../theme/tokens.dart';
import '../../widgets/range_bar.dart';
import '../../widgets/range_reference_chart.dart';
import '../biomarkers/biomarkers_provider.dart';
import '../booking/booking_screen.dart';

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
    // Most recent imported result that carried the lab's printed reference range.
    String? labRange;
    for (final h in history) {
      if (h.referenceRange != null) {
        labRange = h.referenceRange;
        break;
      }
    }

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
          if (labRange != null) ...[
            const SizedBox(height: 6),
            Text('Lab range $labRange', style: bodyText(12, color: T.inkMuted)),
          ],
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
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const BookingScreen()),
                  ),
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
                  onPressed: () => _openAddResult(context, ref),
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

  /// Open the manual result-entry sheet; on save, refresh the chart + lists.
  Future<void> _openAddResult(BuildContext context, WidgetRef ref) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: T.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _AddResultSheet(marker: marker),
    );
    if (saved == true) {
      ref.invalidate(resultHistoryProvider(marker.id));
      ref.invalidate(biomarkersProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Result saved', style: bodyText(13, color: T.canvas))),
        );
      }
    }
  }

  static String _fmt(double v) => v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toString();
}

String _fmtNum(double v) => v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toString();

/// Bottom-sheet form for manually logging a biomarker result. Validates the
/// value against the marker's plausible window, then POSTs to /results.
class _AddResultSheet extends ConsumerStatefulWidget {
  final Biomarker marker;
  const _AddResultSheet({required this.marker});

  @override
  ConsumerState<_AddResultSheet> createState() => _AddResultSheetState();
}

class _AddResultSheetState extends ConsumerState<_AddResultSheet> {
  final _value = TextEditingController();
  final _lab = TextEditingController();
  final _notes = TextEditingController();
  DateTime _date = DateTime.now();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _value.dispose();
    _lab.dispose();
    _notes.dispose();
    super.dispose();
  }

  String _fmtDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(now.year - 10),
      lastDate: now,
      helpText: 'Test date',
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    final m = widget.marker;
    final numeric = double.tryParse(_value.text.trim());
    if (numeric == null) {
      setState(() => _error = 'Enter a numeric value');
      return;
    }
    if (numeric < m.minPlausible || numeric > m.maxPlausible) {
      setState(() => _error =
          'Value must be between ${_fmtNum(m.minPlausible)} and ${_fmtNum(m.maxPlausible)} ${m.unit}');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(apiProvider).dio.post('/results', data: {
        'biomarker_id': m.id,
        'value': numeric,
        'tested_at': _fmtDate(_date),
        if (_lab.text.trim().isNotEmpty) 'lab_name': _lab.text.trim(),
        if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
      });
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on DioException catch (e) {
      final data = e.response?.data;
      final msg = (data is Map && data['error'] is Map)
          ? (data['error']['message']?.toString() ?? 'Could not save result')
          : 'Network error — check your connection.';
      if (mounted) {
        setState(() {
          _busy = false;
          _error = msg;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final m = widget.marker;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(color: T.line, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            Text('Add ${m.name} result', style: display(20, color: T.ink)),
            const SizedBox(height: 4),
            Text('Optimal ${_fmtNum(m.optimalLow)}–${_fmtNum(m.optimalHigh)} ${m.unit}',
                style: bodyText(13, color: T.inkSoft)),
            const SizedBox(height: 20),
            _label('Value (${m.unit})'),
            const SizedBox(height: 8),
            _field(
              _value,
              hint: '—',
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
            ),
            const SizedBox(height: 16),
            _label('Test date'),
            const SizedBox(height: 8),
            InkWell(
              onTap: _busy ? null : _pickDate,
              borderRadius: BorderRadius.circular(10),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                decoration: BoxDecoration(
                  color: T.panel,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: T.line),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.calendar_today_outlined, size: 18, color: T.inkMuted),
                    const SizedBox(width: 10),
                    Text(_fmtDate(_date), style: bodyText(15, color: T.ink)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            _label('Lab name (optional)'),
            const SizedBox(height: 8),
            _field(_lab, hint: 'Cairo Labs'),
            const SizedBox(height: 16),
            _label('Notes (optional)'),
            const SizedBox(height: 8),
            _field(_notes, hint: 'Anything worth noting', maxLines: 3),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: bodyText(13, color: T.rust)),
            ],
            const SizedBox(height: 24),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: T.ink,
                foregroundColor: T.canvas,
                padding: const EdgeInsets.symmetric(vertical: 15),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: _busy ? null : _submit,
              child: Text(_busy ? 'Saving…' : 'Save result',
                  style: bodyText(15, weight: FontWeight.w600, color: T.canvas)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(String text) => Text(
        text.toUpperCase(),
        style: bodyText(11, weight: FontWeight.w600, color: T.inkMuted).copyWith(letterSpacing: 1.2),
      );

  Widget _field(
    TextEditingController c, {
    required String hint,
    TextInputType? keyboardType,
    List<TextInputFormatter>? inputFormatters,
    int maxLines = 1,
  }) {
    return TextField(
      controller: c,
      enabled: !_busy,
      keyboardType: keyboardType,
      inputFormatters: inputFormatters,
      maxLines: maxLines,
      style: bodyText(15, color: T.ink),
      decoration: InputDecoration(
        filled: true,
        fillColor: T.panel,
        hintText: hint,
        hintStyle: bodyText(15, color: T.inkMuted),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: T.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: T.accent, width: 1.5),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: T.line),
        ),
      ),
    );
  }
}
