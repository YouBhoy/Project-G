import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/secure_storage_service.dart';
import 'api_response.dart';

class AuthInterceptor extends Interceptor {
  final SecureStorageService _storageService;
  final Ref ref;

  AuthInterceptor(this._storageService, this.ref);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    try {
      final token = await _storageService.getToken();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    } catch (e) {
      print('Error retrieving token: $e');
    }
    return handler.next(options);
  }
}

class ErrorInterceptor extends Interceptor {
  final SecureStorageService _storageService;
  final Ref ref;

  ErrorInterceptor(this._storageService, this.ref);

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401) {
      // Token expired or unauthorized
      await _storageService.clearToken();
      // Trigger logout notification
      // Navigate to login
      return handler.reject(
        DioException(requestOptions: err.requestOptions, error: UnauthorizedException('Session expired. Please login again.')),
      );
    }

    if (err.response?.statusCode == 403) {
      final msg = (err.response?.data is Map) ? (err.response?.data['message']?.toString() ?? '') : (err.response?.statusMessage ?? 'Access forbidden');
      if (msg.toLowerCase().contains('consent')) {
        return handler.reject(
          DioException(requestOptions: err.requestOptions, error: ConsentRequiredException(msg)),
        );
      }
      return handler.reject(
        DioException(requestOptions: err.requestOptions, error: UnauthorizedException(msg)),
      );
    }

    if (err.response?.statusCode == 404) {
      return handler.reject(
        DioException(requestOptions: err.requestOptions, error: NotFoundException('Resource not found.')),
      );
    }

    if (err.response?.statusCode == 500) {
      return handler.reject(
        DioException(requestOptions: err.requestOptions, error: ServerException('Server error. Please try again later.')),
      );
    }

    if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.sendTimeout) {
      return handler.reject(
        DioException(requestOptions: err.requestOptions, error: NetworkException('Request timeout. Please check your connection.'), type: err.type),
      );
    }

    if (err.type == DioExceptionType.unknown) {
      return handler.reject(
        DioException(requestOptions: err.requestOptions, error: NetworkException('Network error. Please check your connection.'), type: err.type),
      );
    }

    return handler.next(err);
  }
}

class LoggingInterceptor extends Interceptor {
  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    print('📤 REQUEST: ${options.method} ${options.path}');
    print('📦 DATA: ${options.data}');
    return handler.next(options);
  }

  @override
  Future<void> onResponse(
    Response response,
    ResponseInterceptorHandler handler,
  ) async {
    print('📥 RESPONSE: ${response.statusCode} ${response.requestOptions.path}');
    print('📊 DATA: ${response.data}');
    return handler.next(response);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    print('❌ ERROR: ${err.message}');
    print('🔴 STATUS: ${err.response?.statusCode}');
    return handler.next(err);
  }
}
