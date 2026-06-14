/// Models for the AI Insights & Chat feature.

/// A published clinician note or protocol, surfaced to the user.
class AiInsight {
  final String id;
  final String type;
  final String title;
  final String body;
  final String status;

  AiInsight({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.status,
  });

  factory AiInsight.fromJson(Map<String, dynamic> j) => AiInsight(
        id: (j['id'] as String?) ?? '',
        type: (j['type'] as String?) ?? 'insight',
        title: (j['title'] as String?) ?? '',
        body: (j['body'] as String?) ?? '',
        status: (j['status'] as String?) ?? '',
      );
}

/// A single message in the grounded AI chat.
class ChatMessage {
  final String role;
  final String content;

  ChatMessage({required this.role, required this.content});

  bool get isUser => role == 'user';

  factory ChatMessage.fromJson(Map<String, dynamic> j) => ChatMessage(
        role: (j['role'] as String?) ?? 'assistant',
        content: (j['content'] as String?) ?? '',
      );
}
