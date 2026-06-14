import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../core/api_client.dart';
import '../../models/plan.dart';
import '../../theme/tokens.dart';
import 'confirmation_screen.dart';

/// 14% Egyptian VAT — mirrors the backend `VAT_RATE` in payments.ts.
const _vatRate = 0.14;

class CheckoutScreen extends ConsumerStatefulWidget {
  final Plan plan;
  const CheckoutScreen({super.key, required this.plan});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  bool _loading = false;
  String? _error;

  int get _subtotal => widget.plan.priceEgp;
  int get _vat => (widget.plan.priceEgp * _vatRate).round();
  int get _total => _subtotal + _vat;

  Future<void> _pay() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      // POST /payments/initiate {plan_id} → {payment_key, iframe_url, ...}.
      final r = await ref.read(apiProvider).dio.post(
        '/payments/initiate',
        data: {'plan_id': widget.plan.id},
      );
      final url = r.data['iframe_url'] as String?;
      if (url == null || url.isEmpty) {
        throw ApiException('Payment could not be started — please try again.');
      }
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => _PaymobWebView(url: url, plan: widget.plan)),
      );
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } on DioException catch (e) {
      final data = e.response?.data;
      final msg = (data is Map && data['error'] is Map)
          ? (data['error']['message']?.toString() ?? 'Payment failed')
          : 'Network error — check your connection.';
      if (mounted) setState(() => _error = msg);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final plan = widget.plan;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: T.canvas,
        elevation: 0,
        foregroundColor: T.ink,
        title: Text('Checkout', style: display(20, color: T.ink)),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
        children: [
          Text(_title(plan.name), style: display(26, color: T.ink, spacing: -0.5)),
          const SizedBox(height: 4),
          Text(plan.priceDisplay, style: bodyText(14, color: T.inkSoft)),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: T.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: T.line),
            ),
            child: Column(
              children: [
                _Line(label: 'Subtotal', value: '$_subtotal EGP'),
                const SizedBox(height: 10),
                _Line(label: 'VAT (14%)', value: '$_vat EGP'),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 14),
                  child: Divider(height: 1, color: T.line),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Total', style: display(18, color: T.ink)),
                    Text('$_total EGP', style: display(24, weight: FontWeight.w800, color: T.ink)),
                  ],
                ),
              ],
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: T.panel,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: T.line),
              ),
              child: Text(_error!, style: bodyText(13, color: T.rust)),
            ),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: T.ink,
                foregroundColor: T.canvas,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: _loading ? null : _pay,
              child: _loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: T.canvas),
                    )
                  : Text('Pay $_total EGP'),
            ),
          ),
        ],
      ),
    );
  }

  static String _title(String name) =>
      name.isEmpty ? name : '${name[0].toUpperCase()}${name.substring(1)}';
}

class _Line extends StatelessWidget {
  final String label;
  final String value;
  const _Line({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: bodyText(14, color: T.inkSoft)),
        Text(value, style: bodyText(14, weight: FontWeight.w600, color: T.ink)),
      ],
    );
  }
}

/// Full-screen Paymob iframe. Pops to [ConfirmationScreen] when the webview
/// reaches the app's payment-return URL, or via the AppBar "Done" action.
class _PaymobWebView extends StatefulWidget {
  final String url;
  final Plan plan;
  const _PaymobWebView({required this.url, required this.plan});

  @override
  State<_PaymobWebView> createState() => _PaymobWebViewState();
}

class _PaymobWebViewState extends State<_PaymobWebView> {
  late final WebViewController _controller;
  bool _done = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (req) {
            if (_looksLikeReturn(req.url)) {
              _finish();
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
          onUrlChange: (change) {
            final u = change.url;
            if (u != null && _looksLikeReturn(u)) _finish();
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.url));
  }

  /// Heuristic for the post-payment redirect / Paymob callback URL.
  bool _looksLikeReturn(String url) {
    final u = url.toLowerCase();
    return u.contains('payment/return') ||
        u.contains('payment-return') ||
        u.contains('payment_complete') ||
        (u.contains('success=true') && !u.contains('accept.paymobsolutions.com')) ||
        u.contains('txn_response_code');
  }

  void _finish() {
    if (_done || !mounted) return;
    _done = true;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => ConfirmationScreen(plan: widget.plan)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: T.canvas,
        elevation: 0,
        foregroundColor: T.ink,
        title: Text('Payment', style: display(20, color: T.ink)),
        actions: [
          TextButton(
            onPressed: _finish,
            child: Text('Done', style: bodyText(15, weight: FontWeight.w600, color: T.accent)),
          ),
        ],
      ),
      body: WebViewWidget(controller: _controller),
    );
  }
}
