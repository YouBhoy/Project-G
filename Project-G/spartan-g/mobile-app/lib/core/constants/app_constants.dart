class AppConstants {
  // App Info
  static const String appName = 'SPARTAN-G';
  static const String appVersion = '1.0.0';

  // Token Configuration
  static const String tokenKey = 'auth_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String studentIdKey = 'student_id';
  static const String studentRoleKey = 'student_role';
  static const String themeKey = 'theme_mode';
  static const String notificationsKey = 'notifications_enabled';

  // Cache Keys
  static const String dashboardCacheKey = 'dashboard_cache';
  static const String assessmentsCacheKey = 'assessments_cache';
  static const String appointmentsCacheKey = 'appointments_cache';
  static const String emergencyContactsCacheKey = 'emergency_contacts_cache';

  // Draft Keys
  static const String esmDraftKey = 'esm_draft';
  static const String assessmentDraftKey = 'assessment_draft';

  // Time Configuration
  static const Duration tokenRefreshThreshold = Duration(minutes: 1);
  static const Duration cacheDuration = Duration(hours: 1);

  // UI Configuration
  static const double defaultPadding = 16.0;
  static const double defaultRadius = 8.0;

  // Assessment Configuration
  static const Map<String, int> assessmentItemCounts = {
    'DASS21': 21,
    'PHQ9': 9,
    'GAD7': 7,
  };

  // Risk Levels
  static const List<String> riskLevels = ['Low', 'Moderate', 'High', 'Crisis'];

  // Stressor Categories
  static const List<String> stressorCategories = [
    'Academics',
    'Social',
    'Family',
    'Health',
    'Financial',
    'Other'
  ];
}
