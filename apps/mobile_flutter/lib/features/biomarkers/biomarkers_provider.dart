import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/auth.dart';
import '../../models/biomarker.dart';

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
