import 'package:flutter/material.dart';

import '../features/subscription/plans_screen.dart';
import '../theme/tokens.dart';

/// Non-subscriber lock / upsell shown on subscription-gated screens.
class LockedView extends StatelessWidget {
  final String title;
  final String message;
  const LockedView({
    super.key,
    this.title = 'Unlock your biomarkers',
    this.message =
        'A VITAL subscription gives you 80+ biomarkers, optimal ranges, your score, and longitudinal tracking.',
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(color: T.panel, shape: BoxShape.circle),
              child: const Icon(Icons.lock_outline, color: T.inkSoft, size: 24),
            ),
            const SizedBox(height: 16),
            Text(title, textAlign: TextAlign.center, style: display(22, color: T.ink)),
            const SizedBox(height: 8),
            Text(message,
                textAlign: TextAlign.center, style: bodyText(14, color: T.inkSoft, height: 1.55)),
            const SizedBox(height: 22),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: T.ink,
                foregroundColor: T.canvas,
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () =>
                  Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PlansScreen())),
              child: const Text('View Plans'),
            ),
          ],
        ),
      ),
    );
  }
}
