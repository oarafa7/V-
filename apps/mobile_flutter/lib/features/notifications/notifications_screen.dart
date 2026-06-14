import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../models/notification.dart';
import '../../theme/tokens.dart';

final notificationsProvider = FutureProvider<({List<AppNotification> items, int unread})>((ref) {
  return ref.read(apiProvider).notifications();
});

const _sevColor = {
  'info': T.accent,
  'warning': T.amber,
  'critical': T.rust,
};
const _typeIcon = {
  'alert': Icons.warning_amber_rounded,
  'retest': Icons.event_repeat,
  'score': Icons.trending_down,
  'insight': Icons.auto_awesome,
  'booking': Icons.event_available,
  'results': Icons.science_outlined,
  'announcement': Icons.campaign_outlined,
  'system': Icons.notifications_outlined,
};

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationsProvider);
    return Scaffold(
      appBar: AppBar(
        backgroundColor: T.canvas,
        elevation: 0,
        foregroundColor: T.ink,
        title: Text('Notifications', style: display(20, color: T.ink)),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator(color: T.accent)),
        error: (e, _) => Center(child: Text('$e', style: bodyText(14, color: T.inkSoft))),
        data: (data) {
          if (data.items.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.notifications_none, size: 40, color: T.inkMuted),
                    const SizedBox(height: 8),
                    Text('All clear', style: display(20, color: T.ink)),
                    const SizedBox(height: 4),
                    Text("You're up to date — no alerts right now.",
                        textAlign: TextAlign.center, style: bodyText(13, color: T.inkSoft)),
                  ],
                ),
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(20),
            itemCount: data.items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) => _NotifCard(data.items[i]),
          );
        },
      ),
    );
  }
}

class _NotifCard extends StatelessWidget {
  final AppNotification n;
  const _NotifCard(this.n);

  @override
  Widget build(BuildContext context) {
    final color = _sevColor[n.severity] ?? T.accent;
    return Opacity(
      opacity: n.unread ? 1 : 0.7,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: T.panel,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: T.line),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(_typeIcon[n.type] ?? Icons.notifications_outlined, size: 20, color: color),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(n.title, style: display(15, color: T.ink)),
                  const SizedBox(height: 3),
                  Text(n.body, style: bodyText(13, color: T.inkSoft, height: 1.45)),
                  const SizedBox(height: 5),
                  Text(_date(n.createdAt), style: bodyText(10, color: T.inkMuted)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _date(String iso) {
    final d = DateTime.tryParse(iso);
    if (d == null) return '';
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  }
}
