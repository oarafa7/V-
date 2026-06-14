class AppNotification {
  final String id;
  final String type;
  final String severity;
  final String title;
  final String body;
  final String? link;
  final String? readAt;
  final String createdAt;

  AppNotification({
    required this.id,
    required this.type,
    required this.severity,
    required this.title,
    required this.body,
    required this.link,
    required this.readAt,
    required this.createdAt,
  });

  bool get unread => readAt == null;

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: j['id'] as String,
        type: (j['type'] as String?) ?? 'system',
        severity: (j['severity'] as String?) ?? 'info',
        title: (j['title'] as String?) ?? '',
        body: (j['body'] as String?) ?? '',
        link: j['link'] as String?,
        readAt: j['read_at'] as String?,
        createdAt: (j['created_at'] as String?) ?? '',
      );
}
