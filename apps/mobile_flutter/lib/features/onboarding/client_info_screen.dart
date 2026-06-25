import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../theme/tokens.dart';
import '../../widgets/location_picker.dart';

/// Step 2 of post-signup onboarding — activity level and address.
class ClientInfoScreen extends ConsumerStatefulWidget {
  final VoidCallback onNext;
  const ClientInfoScreen({super.key, required this.onNext});

  @override
  ConsumerState<ClientInfoScreen> createState() => _ClientInfoScreenState();
}

const _activityLevels = <({String slug, String title, String hint})>[
  (slug: 'sedentary', title: 'Sedentary', hint: 'Little or no exercise'),
  (slug: 'light', title: 'Lightly active', hint: '1–3 days/week'),
  (slug: 'moderate', title: 'Moderately active', hint: '3–5 days/week'),
  (slug: 'active', title: 'Active', hint: '6–7 days/week'),
  (slug: 'very_active', title: 'Very active', hint: 'Hard daily / physical'),
];

class _ClientInfoScreenState extends ConsumerState<ClientInfoScreen> {
  final _address = TextEditingController();
  String? _level;
  double? _lat;
  double? _lng;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _address.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_level == null) {
      setState(() => _error = 'Please choose your activity level.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(apiProvider).dio.put('/users/me/client-info', data: {
        'activity_level': _level,
        'address': _address.text.trim(),
        if (_lat != null) 'latitude': _lat,
        if (_lng != null) 'longitude': _lng,
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
        title: Text('A bit about you', style: display(20, color: T.ink)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Your lifestyle shapes the recommendations we make.',
                  style: bodyText(14, color: T.inkSoft)),
              const SizedBox(height: 24),
              Text('ACTIVITY LEVEL',
                  style: bodyText(11, weight: FontWeight.w600, color: T.inkMuted)
                      .copyWith(letterSpacing: 1.2)),
              const SizedBox(height: 10),
              for (final a in _activityLevels) ...[
                _ActivityCard(
                  title: a.title,
                  hint: a.hint,
                  selected: _level == a.slug,
                  onTap: _busy ? null : () => setState(() => _level = a.slug),
                ),
                const SizedBox(height: 8),
              ],
              const SizedBox(height: 12),
              Text('ADDRESS',
                  style: bodyText(11, weight: FontWeight.w600, color: T.inkMuted)
                      .copyWith(letterSpacing: 1.2)),
              const SizedBox(height: 8),
              LocationPicker(
                onPick: (loc) => setState(() {
                  _lat = loc.latitude;
                  _lng = loc.longitude;
                  if (loc.address.isNotEmpty) _address.text = loc.address;
                }),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _address,
                enabled: !_busy,
                minLines: 2,
                maxLines: 4,
                style: bodyText(15, color: T.ink),
                decoration: InputDecoration(
                  hintText: 'Street, city, postcode',
                  hintStyle: bodyText(14, color: T.inkMuted),
                  filled: true,
                  fillColor: T.panel,
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
}

class _ActivityCard extends StatelessWidget {
  final String title;
  final String hint;
  final bool selected;
  final VoidCallback? onTap;
  const _ActivityCard({
    required this.title,
    required this.hint,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: selected ? T.accent.withValues(alpha: 0.08) : T.panel,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? T.accent : T.line,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            _Radio(selected: selected),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: display(15, color: T.ink)),
                  const SizedBox(height: 2),
                  Text(hint, style: bodyText(12, color: T.inkSoft)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Radio extends StatelessWidget {
  final bool selected;
  const _Radio({required this.selected});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: selected ? T.accent : T.inkMuted, width: 2),
      ),
      child: selected
          ? Center(
              child: Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(shape: BoxShape.circle, color: T.accent),
              ),
            )
          : null,
    );
  }
}
