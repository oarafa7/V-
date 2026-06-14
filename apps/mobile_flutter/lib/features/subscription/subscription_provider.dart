import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';

/// True when the user has an active, unexpired subscription. Defaults to false
/// on any error (the backend gates biomarker data behind a subscription anyway).
final subscriptionActiveProvider = FutureProvider<bool>((ref) async {
  try {
    final r = await ref.read(apiProvider).dio.get('/subscriptions/me');
    final s = r.data['subscription'] as Map<String, dynamic>?;
    if (s == null) return false;
    final status = s['status'] as String?;
    final expires = DateTime.tryParse((s['expires_at'] ?? '').toString());
    return status == 'active' && expires != null && expires.isAfter(DateTime.now());
  } catch (_) {
    return false;
  }
});
