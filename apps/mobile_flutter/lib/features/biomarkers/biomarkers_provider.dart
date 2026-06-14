import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/auth.dart';
import '../../models/biomarker.dart';
import '../../models/category.dart';

/// The user's biomarker library (with latest result + status). Refetches when
/// the signed-in user changes.
final biomarkersProvider = FutureProvider<List<Biomarker>>((ref) async {
  ref.watch(authProvider);
  return ref.read(apiProvider).biomarkers();
});

/// Status counts derived from the library (drives the dial + breakdown cards).
final countsProvider = Provider<StatusCounts>((ref) {
  return ref.watch(biomarkersProvider).maybeWhen(
        data: StatusCounts.from,
        orElse: () => const StatusCounts(0, 0, 0, 0),
      );
});

/// Biomarker categories (for the dashboard category row → Category Detail).
final categoriesProvider = FutureProvider<List<BiomarkerCategory>>((ref) async {
  final r = await ref.read(apiProvider).dio.get('/biomarker-categories');
  return ((r.data['categories'] as List?) ?? const [])
      .cast<Map<String, dynamic>>()
      .map(BiomarkerCategory.fromJson)
      .toList();
});
