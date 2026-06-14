import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth.dart';
import '../../theme/tokens.dart';
import '../subscription/plans_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).valueOrNull;
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        children: [
          Text('Profile', style: display(34, color: T.ink)),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: T.panel,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: T.line),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: T.accent.withOpacity(0.15),
                  child: Text(
                    (user?.firstName.isNotEmpty ?? false) ? user!.firstName[0].toUpperCase() : '?',
                    style: display(22, color: T.accent),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user?.fullName ?? '—', style: display(18, color: T.ink)),
                      Text(user?.email ?? '', style: bodyText(13, color: T.inkSoft)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          InkWell(
            onTap: () =>
                Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PlansScreen())),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                  color: T.panel, borderRadius: BorderRadius.circular(12), border: Border.all(color: T.line)),
              child: Row(
                children: [
                  const Icon(Icons.workspace_premium_outlined, size: 22, color: T.accent),
                  const SizedBox(width: 12),
                  Expanded(child: Text('Plans & subscription', style: display(16, color: T.ink))),
                  const Icon(Icons.chevron_right, size: 20, color: T.inkSoft),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: T.rust,
              side: const BorderSide(color: T.line),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => ref.read(authProvider.notifier).logout(),
            child: Text('Sign out', style: bodyText(15, weight: FontWeight.w600, color: T.rust)),
          ),
        ],
      ),
    );
  }
}
