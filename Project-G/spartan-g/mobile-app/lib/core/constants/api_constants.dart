class ApiConstants {
  // Base URL order of use:
  // 1) --dart-define=API_BASE_URL=...
  // 2) Default LAN URL below (for physical device on same Wi-Fi)
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://192.168.5.52:3001/api',
  );

  // Endpoints
  static const String authLogin = '/auth/login';
  static const String authSignup = '/auth/signup';
  static const String authValidate = '/auth/validate';

  static const String studentProfileMe = '/student/profile/me';
  static const String studentProfileConsent = '/student/profile/consent';

  static const String dass21Questions = '/student/gawa/dass21/questions';
  static const String dass21Submit = '/student/gawa/dass21/submit';
  static const String phq9Submit = '/student/gawa/phq9/submit';
  static const String gad7Submit = '/student/gawa/gad7/submit';

  static const String dashboardData = '/student/gawa/dashboard';

  static const String esmSubmit = '/student/gawa/esm/submit';

  static const String appointmentsAvailable = '/student/appointments/available';
  static const String appointmentsBook = '/student/appointments/book';
  static const String appointmentsMyList = '/student/appointments';
  static String appointmentsCancel(String id) => '/student/appointments/$id';

  static const String emergencyContacts = '/emergency-contacts';

  static const String fcmRegister = '/fcm-register';

  // HTTP Status Codes
  static const int statusOk = 200;
  static const int statusCreated = 201;
  static const int statusBadRequest = 400;
  static const int statusUnauthorized = 401;
  static const int statusForbidden = 403;
  static const int statusNotFound = 404;
  static const int statusInternalServerError = 500;

  // Timeouts
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 30);
}
