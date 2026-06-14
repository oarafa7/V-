import 'package:flutter/material.dart';

import '../../models/plan.dart';
import '../../theme/tokens.dart';

class ConfirmationScreen extends StatelessWidget {
  final Plan plan;
  const ConfirmationScreen({super.key, required this.plan});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: T.canvas,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 96,
                  height: 96,
                  decoration: const BoxDecoration(color: T.green, shape: BoxShape.circle),
                  child: const Icon(Icons.check, size: 52, color: T.canvas),
                ),
                const SizedBox(height: 24),
                Text("You're all set", style: display(26, color: T.ink, spacing: -0.5)),
                const SizedBox(height: 10),
                Text(
                  'Your ${_title(plan.name)} plan is active — ${plan.biomarkerCount} biomarkers and '
                  '${plan.annualTestsCount} tests this year.',
                  textAlign: TextAlign.center,
                  style: bodyText(15, color: T.inkSoft, height: 1.5),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: T.ink,
                      foregroundColor: T.canvas,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
                    child: const Text('Go to Dashboard'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static String _title(String name) =>
      name.isEmpty ? name : '${name[0].toUpperCase()}${name.substring(1)}';
}
