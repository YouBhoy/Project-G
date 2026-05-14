import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';

final fcmServiceProvider = Provider<FCMService>((ref) {
  return FCMService();
});

class FCMService {
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final Logger _logger = Logger();

  Future<void> initialize() async {
    try {
      // Request notification permissions
      NotificationSettings settings =
          await _firebaseMessaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      _logger.i(
        'Notification permission granted: ${settings.authorizationStatus}',
      );

      // Get FCM Token
      String? token = await _firebaseMessaging.getToken();
      _logger.i('FCM Token: $token');

      // Handle token refresh
      _firebaseMessaging.onTokenRefresh.listen((newToken) {
        _logger.i('FCM Token refreshed: $newToken');
        // Save new token to backend
        _saveFCMToken(newToken);
      });

      // Handle foreground notifications
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        _logger.i('Foreground message received: ${message.notification?.title}');
        _handleForegroundNotification(message);
      });

      // Handle background notification clicks
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        _logger.i('Background notification clicked: ${message.notification?.title}');
        _handleNotificationClick(message);
      });
    } catch (e) {
      _logger.e('FCM initialization error: $e');
    }
  }

  Future<String?> getToken() async {
    return await _firebaseMessaging.getToken();
  }

  Future<void> _saveFCMToken(String token) async {
    // TODO: Implement API call to save FCM token to backend
    _logger.i('Saving FCM token to backend: $token');
  }

  void _handleForegroundNotification(RemoteMessage message) {
    // TODO: Display notification using local notification library
    _logger.i(
      'Title: ${message.notification?.title}',
    );
    _logger.i(
      'Body: ${message.notification?.body}',
    );
  }

  void _handleNotificationClick(RemoteMessage message) {
    // TODO: Navigate to relevant screen based on notification data
    _logger.i('Notification data: ${message.data}');
  }

  Future<void> deleteToken() async {
    await _firebaseMessaging.deleteToken();
  }
}
