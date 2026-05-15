import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'models.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/services/secure_storage_service.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository();
});

class AuthRepository {
  final _secureStorage = SecureStorageService();
  final Dio _dio = Dio(
    BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: ApiConstants.connectionTimeout,
      receiveTimeout: ApiConstants.receiveTimeout,
      sendTimeout: ApiConstants.sendTimeout,
      contentType: Headers.jsonContentType,
      responseType: ResponseType.json,
    ),
  );

  Exception _apiExceptionFromResponse(Map<String, dynamic> response, String fallback) {
    final message = response['message'] as String?;
    return Exception(message ?? fallback);
  }

  String _dioErrorMessage(DioException error, String fallback) {
    final data = error.response?.data;
    if (data is Map<String, dynamic>) {
      final message = data['message'] as String?;
      if (message != null && message.isNotEmpty) {
        return message;
      }
    }
    return error.message ?? fallback;
  }

  /// Login with student ID and password
  Future<AuthDataModel> login(String studentId, String password) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.authLogin,
        data: {
          'role': 'student',
          'studentId': studentId,
          'password': password,
        },
      );

      final responseData = response.data ?? <String, dynamic>{};

      final success = responseData['success'] == true;
      if (!success) {
        throw _apiExceptionFromResponse(responseData, 'Login failed.');
      }

      final data = responseData['data'] as Map<String, dynamic>?;
      final student = data?['student'] as Map<String, dynamic>?;
      final token = data?['token'] as String?;

      if (student == null || token == null || token.isEmpty) {
        throw Exception('Invalid login response from server.');
      }

      final authData = AuthDataModel(
        studentId: student['studentId']?.toString() ?? studentId,
        name: student['name']?.toString() ?? '',
        email: student['email']?.toString() ?? '',
        college: student['college']?.toString() ?? '',
        yearLevel: (student['yearLevel'] as num?)?.toInt() ?? 0,
        sex: student['sex']?.toString() ?? '',
        consentFlag: (student['consentFlag'] as bool?) ?? false,
        token: token,
      );

      await _secureStorage.saveToken(token);
      await _secureStorage.saveStudentId(authData.studentId);
      await _secureStorage.saveStudentRole('student');

      return authData;
    } on DioException catch (e) {
      throw Exception('Login failed: ${_dioErrorMessage(e, 'Unable to connect to server.')}');
    } catch (e) {
      throw Exception('Login failed: $e');
    }
  }

  /// Sign up new student
  Future<AuthDataModel> signup(
    String studentId,
    String name,
    String email,
    String password,
    String college,
    int yearLevel,
    String sex,
  ) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.authSignup,
        data: {
          'role': 'student',
          'studentId': studentId,
          'name': name,
          'email': email,
          'password': password,
          'college': college,
          'yearLevel': yearLevel,
          'sex': sex,
        },
      );

      final responseData = response.data ?? <String, dynamic>{};

      final success = responseData['success'] == true;
      if (!success) {
        throw _apiExceptionFromResponse(responseData, 'Signup failed.');
      }

      // Backend signup returns message only, so authenticate after successful signup.
      return await login(studentId, password);
    } on DioException catch (e) {
      throw Exception('Signup failed: ${_dioErrorMessage(e, 'Unable to connect to server.')}');
    } catch (e) {
      throw Exception('Signup failed: $e');
    }
  }

  /// Logout
  Future<void> logout() async {
    try {
      // TODO: Call logout API endpoint if needed
      await _secureStorage.clearAll();
    } catch (e) {
      throw Exception('Logout failed: $e');
    }
  }

  /// Get stored authentication token
  Future<String?> getStoredToken() async {
    try {
      return await _secureStorage.getToken();
    } catch (e) {
      return null;
    }
  }

  Future<AuthDataModel?> getCurrentStudent() async {
    try {
      final token = await _secureStorage.getToken();
      if (token == null) return null;

      final response = await _dio.get<Map<String, dynamic>>(
        ApiConstants.studentProfileMe,
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );

      final responseData = response.data ?? <String, dynamic>{};
      if (responseData['success'] != true) return null;

      final student = responseData['data'] as Map<String, dynamic>?;
      if (student == null) return null;

      return AuthDataModel(
        studentId: student['studentId']?.toString() ?? '',
        name: student['name']?.toString() ?? '',
        email: student['email']?.toString() ?? '',
        college: student['college']?.toString() ?? '',
        yearLevel: (student['yearLevel'] as num?)?.toInt() ?? 0,
        sex: student['sex']?.toString() ?? '',
        consentFlag: (student['consentFlag'] as bool?) ?? false,
        token: token,
      );
    } catch (e) {
      return null;
    }
  }

  /// Validate if stored token is still valid
  Future<bool> validateToken() async {
    try {
      final token = await _secureStorage.getToken();
      if (token == null) return false;

      return await getCurrentStudent() != null;
    } catch (e) {
      return false;
    }
  }
}
