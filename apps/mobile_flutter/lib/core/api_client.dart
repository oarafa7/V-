import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/biomarker.dart';
import '../models/notification.dart';
import '../models/recommendation.dart';
import '../models/score.dart';
import '../models/user.dart';

/// Backend base URL — pass with `--dart-define=API_URL=https://...`.
const apiBaseUrl =
    String.fromEnvironment('API_URL', defaultValue: 'http://localhost:3000/api/v1');

class TokenStore {
  final _storage = const FlutterSecureStorage();
  static const _key = 'vital_token';

  Future<String?> read() => _storage.read(key: _key);
  Future<void> write(String token) => _storage.write(key: _key, value: token);
  Future<void> clear() => _storage.delete(key: _key);
}

final tokenStoreProvider = Provider((_) => TokenStore());

class ApiException implements Exception {
  final String message;
  final int? status;
  ApiException(this.message, [this.status]);
  @override
  String toString() => message;
}

class ApiClient {
  final Dio _dio;
  final TokenStore _tokens;

  /// Raw dio (with the auth interceptor) for feature modules to call endpoints
  /// not yet wrapped by a typed method.
  Dio get dio => _dio;

  ApiClient(this._tokens)
      : _dio = Dio(BaseOptions(baseUrl: apiBaseUrl, contentType: 'application/json')) {
    _dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) async {
      final token = await _tokens.read();
      if (token != null) options.headers['Authorization'] = 'Bearer $token';
      handler.next(options);
    }));
  }

  Never _fail(DioException e) {
    final data = e.response?.data;
    final msg = (data is Map && data['error'] is Map)
        ? (data['error']['message']?.toString() ?? 'Request failed')
        : 'Network error — check your connection.';
    throw ApiException(msg, e.response?.statusCode);
  }

  Future<void> login(String email, String password) async {
    try {
      final r = await _dio.post('/auth/login', data: {'email': email, 'password': password});
      await _tokens.write(r.data['access_token'] as String);
    } on DioException catch (e) {
      _fail(e);
    }
  }

  Future<AppUser> me() async {
    try {
      final r = await _dio.get('/users/me');
      return AppUser.fromJson(r.data['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      _fail(e);
    }
  }

  Future<List<Biomarker>> biomarkers() async {
    try {
      final r = await _dio.get('/biomarkers', queryParameters: {'limit': 200});
      final list = (r.data['biomarkers'] as List).cast<Map<String, dynamic>>();
      return list.map(Biomarker.fromJson).toList();
    } on DioException catch (e) {
      _fail(e);
    }
  }

  Future<VitalScore?> score() async {
    try {
      final r = await _dio.get('/score/me');
      final s = r.data['score'] as Map<String, dynamic>?;
      return s == null ? null : VitalScore.fromJson(s);
    } on DioException catch (e) {
      _fail(e);
    }
  }

  Future<List<ScorePoint>> scoreHistory() async {
    try {
      final r = await _dio.get('/score/me/history');
      return ((r.data['history'] as List?) ?? const [])
          .cast<Map<String, dynamic>>()
          .map(ScorePoint.fromJson)
          .toList();
    } on DioException catch (e) {
      _fail(e);
    }
  }

  Future<({List<AppNotification> items, int unread})> notifications() async {
    try {
      final r = await _dio.get('/notifications/me');
      final items = ((r.data['notifications'] as List?) ?? const [])
          .cast<Map<String, dynamic>>()
          .map(AppNotification.fromJson)
          .toList();
      return (items: items, unread: (r.data['unread_count'] as num?)?.toInt() ?? 0);
    } on DioException catch (e) {
      _fail(e);
    }
  }

  Future<void> markNotificationsRead(List<String> ids) async {
    try {
      await _dio.post('/notifications/me/read', data: {'ids': ids});
    } on DioException catch (e) {
      _fail(e);
    }
  }

  Future<List<ResultPoint>> resultHistory(String biomarkerId) async {
    try {
      final r = await _dio.get('/results/me/$biomarkerId');
      return ((r.data['results'] as List?) ?? const [])
          .cast<Map<String, dynamic>>()
          .map(ResultPoint.fromJson)
          .toList();
    } on DioException catch (e) {
      _fail(e);
    }
  }

  Future<List<Recommendation>> recommendations() async {
    try {
      final r = await _dio.get('/recommendations/me');
      return ((r.data['recommendations'] as List?) ?? const [])
          .cast<Map<String, dynamic>>()
          .map(Recommendation.fromJson)
          .toList();
    } on DioException catch (e) {
      _fail(e);
    }
  }

  Future<void> logout() => _tokens.clear();
}

final apiProvider = Provider((ref) => ApiClient(ref.read(tokenStoreProvider)));

