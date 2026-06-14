import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth.dart';
import '../../theme/tokens.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    await ref.read(authProvider.notifier).login(_email.text.trim(), _password.text);
    if (!mounted) return;
    final state = ref.read(authProvider);
    setState(() {
      _busy = false;
      _error = state.hasError ? state.error.toString() : null;
    });
    // On success the AuthGate swaps this screen out automatically.
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 380),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('VITAL',
                    textAlign: TextAlign.center,
                    style: display(40, weight: FontWeight.w800, color: T.ink)),
                const SizedBox(height: 4),
                Text('Know your body. Before it fails you.',
                    textAlign: TextAlign.center, style: bodyText(14, color: T.inkSoft)),
                const SizedBox(height: 28),
                _field(_email, 'Email', keyboard: TextInputType.emailAddress),
                const SizedBox(height: 12),
                _field(_password, 'Password', obscure: true),
                if (_error != null) ...[
                  const SizedBox(height: 10),
                  Text(_error!, style: bodyText(13, color: T.rust)),
                ],
                const SizedBox(height: 20),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: T.ink,
                    foregroundColor: T.canvas,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: _busy ? null : _submit,
                  child: Text(_busy ? 'Signing in…' : 'Sign In',
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
