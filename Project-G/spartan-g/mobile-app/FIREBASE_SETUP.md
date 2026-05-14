# Firebase Cloud Messaging Setup Guide

## Overview

Firebase Cloud Messaging (FCM) provides push notifications for:
- Assessment reminders
- Appointment notifications
- Mental health tips
- Urgent alerts

## Prerequisites

1. Google Cloud Platform (GCP) account
2. Firebase project
3. Android app setup

## Step-by-Step Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Enter project name: `spartan-g-mobile`
4. Enable Google Analytics (optional)
5. Select region
6. Create project

### Step 2: Add Android App

1. In Firebase Console, click "Android"
2. Enter package name: `com.spartang.mobile`
3. Enter SHA-1 certificate fingerprint (optional)
4. Download `google-services.json`
5. Place in `android/app/`

### Step 3: Get SHA-1 Certificate

For optional but recommended security:

```bash
# Generate SHA-1 from debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# For release keystore
keytool -list -v -keystore ~/upload-keystore.jks -alias upload
```

### Step 4: Enable Cloud Messaging

In Firebase Console:
1. Project Settings > Cloud Messaging
2. Copy **Server API Key** (needed for backend)
3. Copy **Sender ID** (if not using google-services.json)

### Step 5: Backend Configuration

The backend (Node.js) needs to send notifications using the **Server API Key**:

```javascript
const admin = require('firebase-admin');

admin.initializeApp({
  apiKey: 'YOUR_SERVER_API_KEY',
  // other config
});

// Send notification
await admin.messaging().send({
  token: userFCMToken,
  notification: {
    title: 'Assessment Reminder',
    body: 'Time to complete your DASS-21'
  },
  data: {
    type: 'assessment',
    assessmentId: 'DASS21'
  }
});
```

### Step 6: Mobile App Setup

#### 1. Add Dependencies

Already included in `pubspec.yaml`:
```yaml
firebase_core: ^25.0.0
firebase_messaging: ^14.7.0
```

#### 2. Initialize Firebase

In `main.dart`:
```dart
await Firebase.initializeApp();
```

#### 3. Request Permissions

```dart
NotificationSettings settings = 
  await FirebaseMessaging.instance.requestPermission();
```

#### 4. Get FCM Token

```dart
final token = await FirebaseMessaging.instance.getToken();
// Send to backend for storage
```

#### 5. Listen for Messages

```dart
// Foreground messages
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  // Handle foreground notification
});

// Background message tap
FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
  // Navigate to relevant screen
});
```

## Notification Structure

### Foreground Notification

When app is open:

```json
{
  "notification": {
    "title": "Assessment Reminder",
    "body": "Time to complete your DASS-21"
  },
  "data": {
    "type": "assessment",
    "assessmentId": "DASS21"
  },
  "android": {
    "priority": "high",
    "notification": {
      "sound": "default",
      "click_action": "FLUTTER_NOTIFICATION_CLICK"
    }
  }
}
```

### Background Notification

When app is minimized/closed:

- Notification displayed automatically
- User tap triggers `onMessageOpenedApp` listener
- App opens to relevant screen

## Testing FCM

### Test with Firebase Console

1. Firebase Console > Cloud Messaging
2. Create new campaign
3. Select your app
4. Send test notification to your device

### Test with curl (Backend Testing)

```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Content-Type: application/json" \
  -H "Authorization: key=YOUR_SERVER_API_KEY" \
  -d '{
    "to": "YOUR_FCM_TOKEN",
    "notification": {
      "title": "Test Notification",
      "body": "This is a test"
    },
    "data": {
      "type": "test"
    }
  }'
```

### Verify Token Retrieval

```dart
// In main.dart or FCMService
FirebaseMessaging.instance.getToken().then((token) {
  print('FCM Token: $token');
});
```

## Notification Types

### 1. Assessment Reminder

```json
{
  "notification": {
    "title": "DASS-21 Reminder",
    "body": "Take 5 minutes to complete your assessment"
  },
  "data": {
    "type": "assessment",
    "assessmentType": "DASS21",
    "screen": "/assessments"
  }
}
```

### 2. Appointment Notification

```json
{
  "notification": {
    "title": "Upcoming Appointment",
    "body": "Your appointment with Dr. Santos is in 24 hours"
  },
  "data": {
    "type": "appointment",
    "appointmentId": "APT123",
    "screen": "/appointments"
  }
}
```

### 3. Mental Health Tip

```json
{
  "notification": {
    "title": "Daily Wellness Tip",
    "body": "Remember to take breaks and practice deep breathing"
  },
  "data": {
    "type": "wellness",
    "screen": "/dashboard"
  }
}
```

### 4. Urgent Alert

```json
{
  "notification": {
    "title": "Urgent: Please Reach Out",
    "body": "Our counseling team is available if you need support"
  },
  "data": {
    "type": "urgent",
    "screen": "/emergency"
  }
}
```

## Handling Notifications in App

### Navigation on Notification Tap

```dart
void _handleNotificationTap(RemoteMessage message) {
  final type = message.data['type'];
  final screen = message.data['screen'];
  
  switch (type) {
    case 'assessment':
      context.go('/assessments');
      break;
    case 'appointment':
      context.go('/appointments');
      break;
    case 'emergency':
      context.go('/emergency');
      break;
    default:
      context.go('/home');
  }
}
```

## Troubleshooting

### Issue: FCM Token Not Generated

Solution:
```bash
flutter clean
flutter pub get
flutter run
```

### Issue: Notifications Not Received

Check:
1. Google Services JSON in correct location
2. Firebase Console shows device is registered
3. Permissions granted on device
4. Foreground handler properly set

### Issue: Old Token Still Active

Solution:
```dart
// Refresh token
FirebaseMessaging.instance.deleteToken();
final newToken = await FirebaseMessaging.instance.getToken();
```

### Issue: Token Not Saved to Backend

Implement retry logic:
```dart
Future<void> saveFCMToken() async {
  try {
    final token = await FirebaseMessaging.instance.getToken();
    await apiClient.post(
      '/fcm-register',
      data: {'fcmToken': token},
    );
  } catch (e) {
    // Retry after delay
    Future.delayed(Duration(seconds: 5), saveFCMToken);
  }
}
```

## Best Practices

1. **Request Permissions Appropriately**
   - Request after login or on dashboard
   - Not on app launch

2. **Handle Token Refresh**
   - Listen to `onTokenRefresh` stream
   - Update backend when token changes

3. **User Settings**
   - Allow users to toggle notifications
   - Respect opt-out preferences

4. **Rate Limiting**
   - Don't send too many notifications
   - Maximum 1-2 per day

5. **Testing**
   - Always test on real device
   - Emulator support may be limited

## Security Considerations

1. **Server API Key**
   - Never expose in app
   - Keep only in backend
   - Use environment variables

2. **Data Validation**
   - Validate notification data in app
   - Don't trust client-side data

3. **Authentication**
   - Verify user owns FCM token
   - Use auth header for token registration

## Monitoring

### Firebase Console Analytics

1. Go to Analytics in Firebase Console
2. View notification delivery metrics
3. Track user engagement

### Backend Logging

```javascript
// Log notification sends
console.log(`Sent notification to ${fcmToken}`);

// Log failures
console.error(`Failed to send: ${error}`);
```

## Additional Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Flutter FCM Plugin](https://pub.dev/packages/firebase_messaging)
- [Firebase Console](https://console.firebase.google.com)
- [GCP Console](https://console.cloud.google.com)
