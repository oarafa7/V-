import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/auth.dart';
import 'features/auth/login_screen.dart';
import 'features/home/home_shell.dart';
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
          error: (_, __) => const LoginScreen(),
          data: (user) => user == null ? const LoginScreen() : const HomeShell(),
        );
  }
}
