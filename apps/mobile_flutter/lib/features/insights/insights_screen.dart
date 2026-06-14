import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../models/ai.dart';
import '../../theme/tokens.dart';

/// AI Insights & Chat — shows the user's published clinician notes / protocols
/// and a grounded chat. Surfaces are gated by the admin-managed AI config; the
/// disclaimer is always shown.
class InsightsScreen extends ConsumerStatefulWidget {
  /// Optional seed prompt (e.g. tapped "Explore your labs in detail" elsewhere);
  /// when chat is enabled it is auto-sent once on open.
  final String? ask;
  const InsightsScreen({super.key, this.ask});

  @override
  ConsumerState<InsightsScreen> createState() => _InsightsScreenState();
}

class _InsightsScreenState extends ConsumerState<InsightsScreen> {
  // AI config flags.
  bool _enabled = false;
  bool _featInsights = false;
  bool _featProtocols = false;
  bool _featChat = false;
  bool _allowGenerate = false;

  List<AiInsight> _insights = const [];
  final List<ChatMessage> _messages = [];

  bool _loading = true;
  bool _sending = false;
  bool _generating = false;
  bool _asked = false;

  final _input = TextEditingController();
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Dio get _dio => ref.read(apiProvider).dio;

  Future<void> _load() async {
    try {
      final statusRes = await _dio.get('/ai-status');
      final status = (statusRes.data['status'] as Map?)?.cast<String, dynamic>() ?? const {};
      final features = (status['features'] as Map?)?.cast<String, dynamic>() ?? const {};
      _enabled = status['enabled'] == true;
      _featInsights = features['insights'] == true;
      _featProtocols = features['protocols'] == true;
      _featChat = features['chat'] == true;
      _allowGenerate = status['allow_user_generate'] == true;

      if (_enabled) {
        if (_featInsights || _featProtocols) {
          await _fetchInsights();
        }
        if (_featChat) {
          final chatRes = await _dio.get('/ai/chat/me');
          final msgs = ((chatRes.data['messages'] as List?) ?? const [])
              .cast<Map<String, dynamic>>()
              .map(ChatMessage.fromJson)
              .toList();
          _messages
            ..clear()
            ..addAll(msgs);
        }
      }
    } catch (_) {
      // Leave surfaces empty on failure.
    } finally {
      if (mounted) setState(() => _loading = false);
      _maybeAutoAsk();
    }
  }

  Future<void> _fetchInsights() async {
    final res = await _dio.get('/ai/insights/me');
    final list = ((res.data['insights'] as List?) ?? const [])
        .cast<Map<String, dynamic>>()
        .map(AiInsight.fromJson)
        .toList();
    if (mounted) setState(() => _insights = list);
  }

  /// Auto-send the seed prompt once, after load, when chat is enabled.
  void _maybeAutoAsk() {
    if (_asked || _loading) return;
    final ask = widget.ask;
    if (ask == null || ask.trim().isEmpty) return;
    if (!_enabled || !_featChat) return;
    _asked = true;
    _send(ask);
  }

  /// Send a chat message — `override` supplies an explicit text (auto-send),
  /// otherwise the current input value is used.
  Future<void> _send([String? override]) async {
    final text = (override ?? _input.text).trim();
    if (text.isEmpty || _sending) return;

    setState(() {
      _input.clear();
      _sending = true;
      _messages.add(ChatMessage(role: 'user', content: text));
    });
    _scrollToEnd();

    try {
      final res = await _dio.post('/ai/chat/me', data: {'message': text});
      final reply = (res.data['reply'] as String?) ?? '';
      if (mounted) {
        setState(() => _messages.add(ChatMessage(role: 'assistant', content: reply)));
      }
    } catch (_) {
      if (mounted) _toast('Could not send');
    } finally {
      if (mounted) setState(() => _sending = false);
      _scrollToEnd();
    }
  }

  Future<void> _generate() async {
    setState(() => _generating = true);
    try {
      final res = await _dio.post('/ai/insights/me/generate');
      final pending = (res.data is Map) && res.data['pending_review'] == true;
      if (pending) {
        if (mounted) _toast('Your insights are being prepared.');
      } else {
        await _fetchInsights();
        if (mounted) _toast('Insights ready');
      }
    } catch (_) {
      if (mounted) _toast('Could not generate');
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  void _toast(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg, style: bodyText(13, color: T.canvas))),
    );
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: T.canvas,
      appBar: AppBar(
        backgroundColor: T.canvas,
        elevation: 0,
        foregroundColor: T.ink,
        title: Text('VITAL AI', style: display(20, color: T.ink)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: T.accent))
          : !_enabled
              ? _EmptyState(
                  icon: Icons.auto_awesome,
                  title: 'Coming soon',
                  message: "AI insights aren't available yet.",
                )
              : _buildContent(),
    );
  }

  Widget _buildContent() {
    final showInsights = _featInsights || _featProtocols;
    return Column(
      children: [
        Expanded(
          child: ListView(
            controller: _scroll,
            padding: const EdgeInsets.all(20),
            children: [
              if (showInsights) ..._insightsSection(),
              if (_featChat) ..._chatSection(),
              const SizedBox(height: 24),
              Text(
                'Guidance, not medical advice.',
                textAlign: TextAlign.center,
                style: bodyText(11, color: T.inkMuted, height: 1.45),
              ),
            ],
          ),
        ),
        if (_featChat) _inputBar(),
      ],
    );
  }

  List<Widget> _insightsSection() {
    return [
      Row(
        children: [
          Expanded(child: Text('Your insights', style: display(20, color: T.ink))),
          if (_allowGenerate)
            OutlinedButton(
              onPressed: _generating ? null : _generate,
              style: OutlinedButton.styleFrom(
                foregroundColor: T.accent,
                side: const BorderSide(color: T.accent),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: Text(
                _generating ? 'Generating…' : 'Generate',
                style: bodyText(13, weight: FontWeight.w600, color: T.accent),
              ),
            ),
        ],
      ),
      const SizedBox(height: 12),
      if (_insights.isEmpty)
        Text(
          'No insights yet. They appear here once prepared from your results.',
          style: bodyText(13, color: T.inkSoft),
        )
      else
        for (final i in _insights) _InsightCard(i),
      const SizedBox(height: 16),
    ];
  }

  List<Widget> _chatSection() {
    return [
      const SizedBox(height: 4),
      Text('Ask about your results', style: display(20, color: T.ink)),
      const SizedBox(height: 12),
      for (final m in _messages) _Bubble(m),
      if (_sending)
        const Align(
          alignment: Alignment.centerLeft,
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 6),
            child: SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2, color: T.accent),
            ),
          ),
        ),
    ];
  }

  Widget _inputBar() {
    final canSend = !_sending;
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
      decoration: const BoxDecoration(
        color: T.panel,
        border: Border(top: BorderSide(color: T.line)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _input,
                style: bodyText(14, color: T.ink),
                cursorColor: T.accent,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: InputDecoration(
                  hintText: 'Ask a question…',
                  hintStyle: bodyText(14, color: T.inkMuted),
                  isDense: true,
                  border: InputBorder.none,
                ),
              ),
            ),
            IconButton(
              onPressed: canSend ? () => _send() : null,
              icon: const Icon(Icons.send_rounded, color: T.accent),
              disabledColor: T.inkMuted,
            ),
          ],
        ),
      ),
    );
  }
}

class _InsightCard extends StatelessWidget {
  final AiInsight insight;
  const _InsightCard(this.insight);

  @override
  Widget build(BuildContext context) {
    final icon = insight.type == 'protocol' ? Icons.checklist : Icons.auto_awesome;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: T.panel,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: T.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 18, color: T.accent),
              const SizedBox(width: 6),
              Expanded(child: Text(insight.title, style: display(16, color: T.ink))),
            ],
          ),
          const SizedBox(height: 6),
          Text(insight.body, style: bodyText(14, color: T.ink, height: 1.5)),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  final ChatMessage message;
  const _Bubble(this.message);

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.85),
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isUser ? T.accent : T.panel,
          borderRadius: BorderRadius.circular(12),
          border: isUser ? null : Border.all(color: T.line),
        ),
        child: Text(
          message.content,
          style: bodyText(14, color: isUser ? T.canvas : T.ink, height: 1.45),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  const _EmptyState({required this.icon, required this.title, required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 40, color: T.inkMuted),
            const SizedBox(height: 8),
            Text(title, style: display(20, color: T.ink)),
            const SizedBox(height: 4),
            Text(message, textAlign: TextAlign.center, style: bodyText(13, color: T.inkSoft)),
          ],
        ),
      ),
    );
  }
}
