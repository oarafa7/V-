import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/auth.dart';
import 'features/home/home_shell.dart';
import 'features/onboarding/onboarding_flow.dart';
import 'features/onboarding/welcome_screen.dart';
import 'theme/tokens.dart';

void main() => runApp(const ProviderScope(child: VitalApp()));

class VitalApp extends StatelessWidget {
  const VitalApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'VITAL',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      home: const AuthGate(),
    );
  }
}

/// Swaps between Login and the app shell based on auth state.
class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref.watch(authProvider).when(
          loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(color: T.accent))),
          error: (_, __) => const WelcomeScreen(),
          data: (user) {
            if (user == null) return const WelcomeScreen();
            if (user.needsOnboarding) {
              return OnboardingFlow(onDone: () => ref.read(authProvider.notifier).refresh());
            }
            return const HomeShell();
          },
        );
  }
}
