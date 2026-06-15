import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../core/api_client.dart';
import '../../models/addon.dart';
import '../../theme/tokens.dart';

/// Add-on checkout — pay for the extra markers attached to a freshly created
/// booking. Initiates a Paymob order on load, shows the line items + 14% VAT,
/// then renders the Paymob iframe. Success is reconciled server-side via the
/// webhook; the WebView navigation is only the UX signal.
class AddonCheckoutScreen extends ConsumerStatefulWidget {
  final String bookingId;
  const AddonCheckoutScreen({super.key, required this.bookingId});

  @override
  ConsumerState<AddonCheckoutScreen> createState() => _AddonCheckoutScreenState();
}

class _AddonCheckoutScreenState extends ConsumerState<AddonCheckoutScreen> {
  AddonOrder? _order;
  String? _iframeUrl;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _initiate();
  }

  Future<void> _initiate() async {
    final selected = List<String>.from(AddonSelection.selected);
    if (selected.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).pop();
      });
      return;
    }
    try {
      final r = await ref.read(apiProvider).dio.post(
        '/payments/addons/initiate',
        data: {'booking_id': widget.bookingId, 'biomarker_ids': selected},
      );
      if (!mounted) return;
      setState(() {
        _order = AddonOrder.fromJson(r.data['order'] as Map<String, dynamic>);
        _iframeUrl = r.data['iframe_url'] as String?;
        _loading = false;
      });
    } on DioException catch (e) {
      final data = e.response?.data;
      final msg = (data is Map && data['error'] is Map)
          ? (data['error']['message']?.toString() ?? 'Could not start payment')
          : 'Network error — check your connection.';
      if (mounted) setState(() {
        _error = msg;
        _loading = false;
      });
    }
  }

  Future<void> _pay() async {
    final url = _iframeUrl;
    if (url == null || url.isEmpty) return;
    final paid = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => _PaymobWebView(url: url)),
    );
    if (paid == true && mounted) {
      AddonSelection.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Extra tests paid — added to your visit',
            style: bodyText(13, color: T.canvas))),
      );
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    return Scaffold(
      backgroundColor: T.canvas,
      appBar: AppBar(
        backgroundColor: T.canvas,
        elevation: 0,
        foregroundColor: T.ink,
        leading: const BackButton(color: T.ink),
        title: Text('Pay for extra tests', style: display(20, color: T.ink)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: T.accent))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Text(_error!, textAlign: TextAlign.center, style: bodyText(14, color: T.rust)),
                  ),
                )
              : order == null
                  ? const SizedBox.shrink()
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
                      children: [
                        Text('Your booking is confirmed. These extra markers are billed '
                            'separately from your plan.', style: bodyText(13, color: T.inkSoft)),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: T.card,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: T.line),
                          ),
                          child: Column(
                            children: [
                              for (final it in order.items)
                                Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 3),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(child: Text(it.name, style: bodyText(14, color: T.ink))),
                                      Text('EGP ${it.priceEgp}', style: bodyText(13, color: T.inkSoft)),
                                    ],
                                  ),
                                ),
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 12),
                                child: Divider(height: 1, color: T.line),
                              ),
                              _Line(label: 'Subtotal', value: 'EGP ${order.subtotalEgp}'),
                              const SizedBox(height: 8),
                              _Line(label: 'VAT (14%)', value: 'EGP ${order.vatEgp}'),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Total', style: display(18, color: T.ink)),
                                  Text('EGP ${order.totalEgp}',
                                      style: display(24, weight: FontWeight.w800, color: T.ink)),
                                ],
                              ),
                            ],
                          ),
                        ),
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
                            onPressed: _pay,
                            child: Text('Pay EGP ${order.totalEgp}'),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Center(
                          child: TextButton(
                            onPressed: () => Navigator.of(context).pop(),
                            child: Text('Pay later', style: bodyText(13, color: T.inkSoft)),
                          ),
                        ),
                      ],
                    ),
    );
  }
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

/// Full-screen Paymob iframe; pops `true` to the caller when the webview reaches
/// the payment-return URL (or via the AppBar "Done" action).
class _PaymobWebView extends StatefulWidget {
  final String url;
  const _PaymobWebView({required this.url});

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
    Navigator.of(context).pop(true);
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
