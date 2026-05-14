import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../constants/app_constants.dart';

final localStorageProvider = Provider<LocalStorageService>((ref) {
  return LocalStorageService();
});

class LocalStorageService {
  static late Box<dynamic> _defaultBox;

  static Future<void> initialize() async {
    await Hive.initFlutter();
    _defaultBox = await Hive.openBox('spartan_g');
  }

  // Dashboard Cache
  Future<void> cacheDashboardData(Map<String, dynamic> data) async {
    await _defaultBox.put(AppConstants.dashboardCacheKey, data);
  }

  Future<Map<String, dynamic>?> getCachedDashboardData() async {
    final data = _defaultBox.get(AppConstants.dashboardCacheKey);
    return data != null ? Map<String, dynamic>.from(data) : null;
  }

  // Assessments Cache
  Future<void> cacheAssessmentQuestions(
    String assessmentType,
    List<dynamic> questions,
  ) async {
    final key = '${AppConstants.assessmentsCacheKey}_$assessmentType';
    await _defaultBox.put(key, questions);
  }

  Future<List<dynamic>?> getCachedAssessmentQuestions(
    String assessmentType,
  ) async {
    final key = '${AppConstants.assessmentsCacheKey}_$assessmentType';
    return _defaultBox.get(key) as List<dynamic>?;
  }

  // Appointments Cache
  Future<void> cacheAppointments(List<dynamic> appointments) async {
    await _defaultBox.put(AppConstants.appointmentsCacheKey, appointments);
  }

  Future<List<dynamic>?> getCachedAppointments() async {
    return _defaultBox.get(AppConstants.appointmentsCacheKey) as List<dynamic>?;
  }

  // Emergency Contacts Cache
  Future<void> cacheEmergencyContacts(List<dynamic> contacts) async {
    await _defaultBox.put(
      AppConstants.emergencyContactsCacheKey,
      contacts,
    );
  }

  Future<List<dynamic>?> getCachedEmergencyContacts() async {
    return _defaultBox.get(
      AppConstants.emergencyContactsCacheKey,
    ) as List<dynamic>?;
  }

  // ESM Draft
  Future<void> saveESMDraft(Map<String, dynamic> draft) async {
    await _defaultBox.put(AppConstants.esmDraftKey, draft);
  }

  Future<Map<String, dynamic>?> getESMDraft() async {
    final data = _defaultBox.get(AppConstants.esmDraftKey);
    return data != null ? Map<String, dynamic>.from(data) : null;
  }

  Future<void> clearESMDraft() async {
    await _defaultBox.delete(AppConstants.esmDraftKey);
  }

  // Assessment Draft
  Future<void> saveAssessmentDraft(
    String assessmentType,
    Map<String, dynamic> draft,
  ) async {
    final key = '${AppConstants.assessmentDraftKey}_$assessmentType';
    await _defaultBox.put(key, draft);
  }

  Future<Map<String, dynamic>?> getAssessmentDraft(
    String assessmentType,
  ) async {
    final key = '${AppConstants.assessmentDraftKey}_$assessmentType';
    final data = _defaultBox.get(key);
    return data != null ? Map<String, dynamic>.from(data) : null;
  }

  Future<void> clearAssessmentDraft(String assessmentType) async {
    final key = '${AppConstants.assessmentDraftKey}_$assessmentType';
    await _defaultBox.delete(key);
  }

  // Clear All Cache
  Future<void> clearAll() async {
    await _defaultBox.clear();
  }

  // Clear Specific Key
  Future<void> clearKey(String key) async {
    await _defaultBox.delete(key);
  }
}
