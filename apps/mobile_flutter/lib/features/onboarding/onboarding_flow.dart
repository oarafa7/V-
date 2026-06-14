import 'package:flutter/material.dart';

import '../../theme/tokens.dart';
import 'client_info_screen.dart';
import 'goals_screen.dart';
import 'health_profile_screen.dart';

/// Post-signup onboarding stepper. The account already exists at this point;
/// this flow collects the health profile, lifestyle info and goals, then calls
/// [onDone] (which the AuthGate uses to re-fetch the user and move into the app).
class OnboardingFlow extends StatefulWidget {
  final VoidCallback onDone;
  const OnboardingFlow({super.key, required this.onDone});

  @override
  State<OnboardingFlow> createState() => _OnboardingFlowState();
}

class _OnboardingFlowState extends State<OnboardingFlow> {
  static const _steps = 3;
  int _step = 0;

  void _goTo(int step) {
    if (!mounted) return;
    setState(() => _step = step.clamp(0, _steps - 1));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: T.canvas,
      body: Column(
        children: [
          _ProgressBar(step: _step, total: _steps),
          Expanded(
            child: IndexedStack(
              index: _step,
              children: [
                HealthProfileScreen(onNext: () => _goTo(1)),
                ClientInfoScreen(onNext: () => _goTo(2)),
                GoalsScreen(onDone: widget.onDone),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressBar extends StatelessWidget {
  final int step;
  final int total;
  const _ProgressBar({required this.step, required this.total});

  @override
  Widget build(BuildContext context) {
    final fraction = total <= 1 ? 1.0 : (step + 1) / total;
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: fraction,
            minHeight: 4,
            backgroundColor: T.line,
            valueColor: const AlwaysStoppedAnimation<Color>(T.accent),
          ),
        ),
      ),
    );
  }
}
