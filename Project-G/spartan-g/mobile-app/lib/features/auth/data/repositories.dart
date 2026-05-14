import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/services/secure_storage_service.dart';
import 'models.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final storageService = ref.watch(secureStorageProvider);
  return AuthRepository(apiClient, storageService);
});

class AuthRepository {
  final ApiClient _apiClient;
  final SecureStorageService _storageService;

  AuthRepository(this._apiClient, this._storageService);

  Future<AuthDataModel> login(String studentId, String password) async {
    final request = LoginRequestModel(
      role: 'student',
      studentId: studentId,
      password: password,
    );

    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.authLogin,
      data: request.toJson(),
    );

    final authResponse = AuthResponseModel.fromJson(response);

    // Save token and student info
    await _storageService.saveToken(authResponse.data.token);
    await _storageService.saveStudentId(authResponse.data.student.studentId);
    await _storageService.saveStudentRole(authResponse.data.role);

    return authResponse.data;
  }

  Future<AuthDataModel> signup(
    String studentId,
    String name,
    String email,
    String password,
    String college,
    int yearLevel,
    String sex,
  ) async {
    final request = SignupRequestModel(
      role: 'student',
      studentId: studentId,
      name: name,
      email: email,
      password: password,
      college: college,
      yearLevel: yearLevel,
      sex: sex,
    );

    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.authSignup,
      data: request.toJson(),
    );

    final authResponse = AuthResponseModel.fromJson(response);

    // Save token and student info
    await _storageService.saveToken(authResponse.data.token);
    await _storageService.saveStudentId(authResponse.data.student.studentId);
    await _storageService.saveStudentRole(authResponse.data.role);

    return authResponse.data;
  }

  Future<bool> validateToken() async {
    try {
      final token = await _storageService.getToken();
      if (token == null) return false;

      await _apiClient.get<Map<String, dynamic>>(
        ApiConstants.authValidate,
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<void> logout() async {
    await _storageService.clearToken();
    await _storageService.clearAll();
  }

  Future<String?> getStoredToken() async {
    return await _storageService.getToken();
  }

  Future<String?> getStoredStudentId() async {
    return await _storageService.getStudentId();
  }
}
