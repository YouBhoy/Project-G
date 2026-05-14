import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../constants/api_constants.dart';
import '../services/secure_storage_service.dart';
import 'interceptors.dart';

final dioProvider = Provider<Dio>((ref) {
  final storageService = ref.watch(secureStorageProvider);
  final dio = Dio();

  dio.options = BaseOptions(
    baseUrl: ApiConstants.baseUrl,
    connectTimeout: ApiConstants.connectionTimeout,
    receiveTimeout: ApiConstants.receiveTimeout,
    sendTimeout: ApiConstants.sendTimeout,
    contentType: Headers.jsonContentType,
    responseType: ResponseType.json,
  );

  // Add interceptors
  dio.interceptors.add(LoggingInterceptor());
  dio.interceptors.add(AuthInterceptor(storageService, ref));
  dio.interceptors.add(ErrorInterceptor(storageService, ref));

  return dio;
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final dio = ref.watch(dioProvider);
  return ApiClient(dio);
});

class ApiClient {
  final Dio _dio;

  ApiClient(this._dio);

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.get(
        path,
        queryParameters: queryParameters,
      );
      return _handleResponse(response, fromJson);
    } on DioException catch (e) {
      throw _handleError(e);
    } catch (e) {
      throw Exception('Unexpected error: $e');
    }
  }

  Future<T> post<T>(
    String path, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.post(
        path,
        data: data,
        queryParameters: queryParameters,
      );
      return _handleResponse(response, fromJson);
    } on DioException catch (e) {
      throw _handleError(e);
    } catch (e) {
      throw Exception('Unexpected error: $e');
    }
  }

  Future<T> put<T>(
    String path, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.put(
        path,
        data: data,
        queryParameters: queryParameters,
      );
      return _handleResponse(response, fromJson);
    } on DioException catch (e) {
      throw _handleError(e);
    } catch (e) {
      throw Exception('Unexpected error: $e');
    }
  }

  Future<T> delete<T>(
    String path, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.delete(
        path,
        data: data,
        queryParameters: queryParameters,
      );
      return _handleResponse(response, fromJson);
    } on DioException catch (e) {
      throw _handleError(e);
    } catch (e) {
      throw Exception('Unexpected error: $e');
    }
  }

  T _handleResponse<T>(Response response, T Function(dynamic)? fromJson) {
    if (response.statusCode == 200 || response.statusCode == 201) {
      if (fromJson != null) {
        return fromJson(response.data);
      }
      return response.data as T;
    } else {
      throw ServerException('Unexpected status code: ${response.statusCode}');
    }
  }

  Exception _handleError(DioException error) {
    if (error.response?.statusCode == 401) {
      return UnauthorizedException('Unauthorized');
    } else if (error.response?.statusCode == 403) {
      return UnauthorizedException('Forbidden');
    } else if (error.response?.statusCode == 404) {
      return NotFoundException('Not found');
    } else if (error.response?.statusCode == 500) {
      return ServerException('Server error');
    } else if (error.type == DioExceptionType.connectionTimeout) {
      return NetworkException('Connection timeout');
    } else if (error.type == DioExceptionType.receiveTimeout) {
      return NetworkException('Receive timeout');
    } else if (error.type == DioExceptionType.sendTimeout) {
      return NetworkException('Send timeout');
    } else {
      return NetworkException(error.message ?? 'Unknown error');
    }
  }
}
