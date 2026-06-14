import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/user.dart';
import 'api_client.dart';

/// Auth state = the signed-in user (null when signed out). On startup it
/// restores the session from the stored token by calling /users/me.
class AuthController extends AsyncNotifier<AppUser?> {
  ApiClient get _api => ref.read(apiProvider);

  @override
  Future<AppUser?> build() async {
    final token = await ref.read(tokenStoreProvider).read();
    if (token == null) return null;
    try {
      return await _api.me();
    } catch (_) {
      await _api.logout();
      return null;
    }
  }

  Future<void> login(String email, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await _api.login(email, password);
      return _api.me();
    });
  }

  Future<void> signup(String email, String password, String fullName, {String? phone}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await _api.signup(email, password, fullName, phone: phone);
      return _api.me();
    });
  }

  /// Re-fetch the current user (e.g. after onboarding writes the profile/goals).
  Future<void> refresh() async {
    state = await AsyncValue.guard(() => _api.me());
  }

  Future<void> logout() async {
    await _api.logout();
    state = const AsyncData(null);
  }
}

final authProvider = AsyncNotifierProvider<AuthController, AppUser?>(AuthController.new);
