import 'package:flutter/material.dart';

import '../auth/login_screen.dart';
import '../../theme/tokens.dart';
import 'signup_screen.dart';

/// First screen for signed-out users — brand splash with entry points into
/// signup and login. The AuthGate renders this when there is no session.
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: T.canvas,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(flex: 3),
              Text('VITAL',
                  textAlign: TextAlign.center,
                  style: display(58, weight: FontWeight.w800, color: T.ink, spacing: -1)),
              const SizedBox(height: 16),
              Text('Know your body.\nBefore it fails you.',
                  textAlign: TextAlign.center, style: bodyText(16, color: T.inkSoft, height: 1.5)),
              const Spacer(flex: 4),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: T.ink,
                  foregroundColor: T.canvas,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => const SignupScreen()),
                ),
                child: Text('Get Started',
                    style: bodyText(15, weight: FontWeight.w600, color: T.canvas)),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: T.ink,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  side: const BorderSide(color: T.line),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
                ),
                child: Text('Sign In',
                    style: bodyText(15, weight: FontWeight.w600, color: T.ink)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
