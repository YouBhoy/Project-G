import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/app_constants.dart';

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

class SecureStorageService {
  static const _storage = FlutterSecureStorage();

  // Token Management
  Future<void> saveToken(String token) async {
    await _storage.write(
      key: AppConstants.tokenKey,
      value: token,
    );
  }

  Future<String?> getToken() async {
    return await _storage.read(key: AppConstants.tokenKey);
  }

  Future<void> clearToken() async {
    await _storage.delete(key: AppConstants.tokenKey);
  }

  // Student Info
  Future<void> saveStudentId(String studentId) async {
    await _storage.write(
      key: AppConstants.studentIdKey,
      value: studentId,
    );
  }

  Future<String?> getStudentId() async {
    return await _storage.read(key: AppConstants.studentIdKey);
  }

  Future<void> saveStudentRole(String role) async {
    await _storage.write(
      key: AppConstants.studentRoleKey,
      value: role,
    );
  }

  Future<String?> getStudentRole() async {
    return await _storage.read(key: AppConstants.studentRoleKey);
  }

  // Theme
  Future<void> saveThemeMode(String theme) async {
    await _storage.write(
      key: AppConstants.themeKey,
      value: theme,
    );
  }

  Future<String?> getThemeMode() async {
    return await _storage.read(key: AppConstants.themeKey);
  }

  // Notifications
  Future<void> setNotificationsEnabled(bool enabled) async {
    await _storage.write(
      key: AppConstants.notificationsKey,
      value: enabled.toString(),
    );
  }

  Future<bool> areNotificationsEnabled() async {
    final value = await _storage.read(key: AppConstants.notificationsKey);
    return value != 'false';
  }

  // Clear All
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
