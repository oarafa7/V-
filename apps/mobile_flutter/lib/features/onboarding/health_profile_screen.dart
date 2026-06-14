import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../theme/tokens.dart';

/// Step 1 of post-signup onboarding — date of birth, gender and body metrics.
class HealthProfileScreen extends ConsumerStatefulWidget {
  final VoidCallback onNext;
  const HealthProfileScreen({super.key, required this.onNext});

  @override
  ConsumerState<HealthProfileScreen> createState() => _HealthProfileScreenState();
}

const _genders = <({String slug, String label})>[
  (slug: 'male', label: 'Male'),
  (slug: 'female', label: 'Female'),
  (slug: 'other', label: 'Other'),
  (slug: 'prefer_not_to_say', label: 'Prefer not to say'),
];

class _HealthProfileScreenState extends ConsumerState<HealthProfileScreen> {
  final _height = TextEditingController();
  final _weight = TextEditingController();
  DateTime? _dob;
  String? _gender;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _height.dispose();
    _weight.dispose();
    super.dispose();
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _dob ?? DateTime(now.year - 30, now.month, now.day),
      firstDate: DateTime(now.year - 120),
      lastDate: now,
      helpText: 'Date of birth',
    );
    if (picked != null) setState(() => _dob = picked);
  }

  static String _fmtDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';

  Future<void> _submit() async {
    if (_dob == null || _gender == null) {
      setState(() => _error = 'Please add your date of birth and gender.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final height = double.tryParse(_height.text.trim());
    final weight = double.tryParse(_weight.text.trim());
    try {
      await ref.read(apiProvider).dio.put('/users/me/health-profile', data: {
        'date_of_birth': _fmtDate(_dob!),
        'gender': _gender,
        if (height != null) 'height_cm': height,
        if (weight != null) 'weight_kg': weight,
      });
      if (!mounted) return;
      widget.onNext();
    } on Object catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = e.toString();
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
        title: Text('A few health basics', style: display(20, color: T.ink)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('This helps us tailor reference ranges to you.',
                  style: bodyText(14, color: T.inkSoft)),
              const SizedBox(height: 24),
              _Label('Date of birth'),
              const SizedBox(height: 8),
              InkWell(
                onTap: _busy ? null : _pickDob,
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
                      Text(
                        _dob == null ? 'Select your date of birth' : _fmtDate(_dob!),
                        style: bodyText(15, color: _dob == null ? T.inkMuted : T.ink),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              _Label('Gender'),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final g in _genders)
                    ChoiceChip(
                      label: Text(g.label,
                          style: bodyText(13,
                              weight: FontWeight.w600,
                              color: _gender == g.slug ? T.canvas : T.ink)),
                      selected: _gender == g.slug,
                      showCheckmark: false,
                      backgroundColor: T.panel,
                      selectedColor: T.ink,
                      side: BorderSide(color: _gender == g.slug ? T.ink : T.line),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      onSelected: _busy ? null : (_) => setState(() => _gender = g.slug),
                    ),
                ],
              ),
              const SizedBox(height: 20),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: _numberField(_height, 'Height (cm)')),
                  const SizedBox(width: 12),
                  Expanded(child: _numberField(_weight, 'Weight (kg)')),
                ],
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: bodyText(13, color: T.rust)),
              ],
              const SizedBox(height: 28),
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
      ),
    );
  }

  Widget _numberField(TextEditingController c, String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Label(label),
        const SizedBox(height: 8),
        TextField(
          controller: c,
          enabled: !_busy,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: bodyText(15, color: T.ink),
          decoration: InputDecoration(
            filled: true,
            fillColor: T.panel,
            hintText: '—',
            hintStyle: bodyText(15, color: T.inkMuted),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: T.line),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: T.accent, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}

class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(text.toUpperCase(),
        style: bodyText(11, weight: FontWeight.w600, color: T.inkMuted).copyWith(letterSpacing: 1.2));
  }
}
