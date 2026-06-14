import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth.dart';
import '../../theme/tokens.dart';

/// Account creation. On success the AuthGate advances automatically (the auth
/// state flips to a signed-in user), so we never navigate ourselves.
class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _fullName = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _phone = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _fullName.dispose();
    _email.dispose();
    _password.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final fullName = _fullName.text.trim();
    final email = _email.text.trim();
    final password = _password.text;
    if (fullName.isEmpty || email.isEmpty || password.isEmpty) {
      setState(() => _error = 'Please fill in your name, email and password.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    await ref
        .read(authProvider.notifier)
        .signup(email, password, fullName, phone: _phone.text.trim());
    if (!mounted) return;
    final state = ref.read(authProvider);
    if (state.hasError) {
      setState(() {
        _busy = false;
        _error = state.error.toString();
      });
    } else {
      // Success — pop back to the root so the AuthGate (now the OnboardingFlow)
      // is visible; this screen was pushed on top of it.
      Navigator.of(context).popUntil((r) => r.isFirst);
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
        title: Text('Create account', style: display(20, color: T.ink)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Start with the basics — you can fine-tune your profile next.',
                    style: bodyText(14, color: T.inkSoft)),
                const SizedBox(height: 24),
                _field(_fullName, 'Full name', keyboard: TextInputType.name),
                const SizedBox(height: 12),
                _field(_email, 'Email', keyboard: TextInputType.emailAddress),
                const SizedBox(height: 12),
                _field(_password, 'Password', obscure: true),
                const SizedBox(height: 12),
                _field(_phone, 'Phone (optional)', keyboard: TextInputType.phone),
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
                  child: Text(_busy ? 'Creating account…' : 'Create account',
                      style: bodyText(15, weight: FontWeight.w600, color: T.canvas)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController c, String label,
      {bool obscure = false, TextInputType? keyboard}) {
    return TextField(
      controller: c,
      obscureText: obscure,
      keyboardType: keyboard,
      autocorrect: false,
      enabled: !_busy,
      style: bodyText(15, color: T.ink),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: bodyText(13, color: T.inkMuted),
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
    );
  }
}
