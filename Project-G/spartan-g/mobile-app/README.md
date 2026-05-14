# SPARTAN-G Mobile App (Flutter Android)

Student Mental Health Monitoring, Assessment, and Counseling Referral System - Mobile Application

## Overview

This is a Flutter-based Android mobile application for Project SPARTAN-G, designed exclusively for students. It integrates with the existing Node.js/Express backend API to provide:

- Authentication and session management
- Mental health assessments (DASS-21, PHQ-9, GAD-7)
- ESM (Experience Sampling Method) check-ins
- Appointment booking with OGC (Office of Guidance and Counseling)
- Emergency contact information
- Student profile management
- Push notifications via Firebase Cloud Messaging

## Tech Stack

- **Flutter**: Latest stable version
- **State Management**: Riverpod
- **Navigation**: GoRouter
- **HTTP Client**: Dio with interceptors
- **Secure Storage**: flutter_secure_storage
- **Local Storage**: Hive
- **Push Notifications**: Firebase Cloud Messaging
- **Charts**: fl_chart
- **Design**: Material 3

## Project Structure

```
lib/
├── main.dart
├── core/
│   ├── api/
│   │   ├── api_client.dart
│   │   ├── api_response.dart
│   │   └── interceptors.dart
│   ├── constants/
│   │   ├── api_constants.dart
│   │   ├── app_constants.dart
│   │   └── string_constants.dart
│   ├── theme/
│   │   ├── app_theme.dart
│   │   └── app_colors.dart
│   ├── utils/
│   │   ├── logger.dart
│   │   ├── validators.dart
│   │   └── helpers.dart
│   ├── widgets/
│   │   ├── loading_indicator.dart
│   │   ├── error_widget.dart
│   │   ├── empty_state_widget.dart
│   │   └── reusable_widgets.dart
│   └── services/
│       ├── secure_storage_service.dart
│       ├── local_storage_service.dart
│       ├── fcm_service.dart
│       └── connectivity_service.dart
├── features/
│   ├── auth/
│   │   ├── data/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   └── datasources/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   └── repositories/
│   │   └── presentation/
│   │       ├── providers/
│   │       └── screens/
│   ├── dashboard/
│   ├── assessments/
│   ├── esm/
│   ├── appointments/
│   ├── emergency/
│   ├── profile/
│   └── settings/
└── routes/
    └── router.dart
```

## Prerequisites

- Flutter SDK >= 3.16.0
- Dart SDK >= 3.0.0
- Android SDK (API level 21+)
- Java Development Kit (JDK) 11+
- Android Studio or equivalent
- Backend API running on `http://192.168.X.X:3001`

## Setup Instructions

### 1. Clone & Navigate

```bash
cd mobile-app
flutter pub get
```

### 2. Configure Backend URL

Edit `lib/core/constants/api_constants.dart` and update:

```dart
static const String baseUrl = 'http://192.168.X.X:3001/api';
```

Replace `192.168.X.X` with your development machine's IP address.

### 3. Firebase Setup

1. Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add Android app to the project
3. Download `google-services.json`
4. Place it in `android/app/google-services.json`

### 4. Build & Run

```bash
# Run on connected device or emulator
flutter run

# Build APK
flutter build apk --release

# Build App Bundle
flutter build appbundle --release
```

## Development Workflow

### Run Tests

```bash
flutter test
```

### Format Code

```bash
dart format lib/
```

### Analyze Code

```bash
dart analyze
```

## API Endpoints

All endpoints are prefixed with `/api`:

### Authentication
- `POST /auth/login` - Login
- `POST /auth/signup` - Register
- `GET /auth/validate` - Validate token

### Student Profile
- `GET /student/profile/me` - Get profile
- `POST /student/profile/consent` - Give consent

### Assessments
- `GET /student/gawa/dass21/questions` - Get DASS-21 questions
- `POST /student/gawa/dass21/submit` - Submit DASS-21
- `POST /student/gawa/phq9/submit` - Submit PHQ-9
- `POST /student/gawa/gad7/submit` - Submit GAD-7

### Dashboard
- `GET /student/gawa/dashboard` - Get dashboard data

### ESM Check-ins
- `POST /student/gawa/esm/submit` - Submit ESM check-in

### Appointments
- `GET /student/appointments/available` - Get available slots
- `POST /student/appointments/book` - Book appointment
- `GET /student/appointments` - Get my appointments
- `DELETE /student/appointments/:appointmentId` - Cancel appointment

### Emergency Contacts
- `GET /emergency-contacts` - Get emergency contacts

### FCM
- `POST /fcm-register` - Register FCM token

## Features

### 1. Authentication
- Secure login/signup
- JWT token management
- Secure token storage
- Auto-login on app restart
- Session timeout handling

### 2. Consent Flow
- Mandatory consent before assessments
- One-time consent requirement
- Consent status tracking

### 3. Dashboard
- Student overview
- Risk level visualization
- Mood & energy trends (charts)
- Latest assessment results
- Next recommended action
- Recent ESM entries

### 4. Assessments
- **DASS-21**: 21-item self-report anxiety/depression/stress scale
- **PHQ-9**: 9-item patient health questionnaire
- **GAD-7**: 7-item generalized anxiety disorder scale
- Progress tracking
- Result scoring
- Severity classification
- History tracking

### 5. ESM Check-ins
- Quick mood check-ins
- Mood & energy sliders
- Stressor categorization
- Physical symptoms tracking
- Help-seeking intent
- Offline draft support
- Auto-sync on reconnect

### 6. Appointments
- View available slots
- Book appointments
- Cancel appointments
- Appointment history
- Status tracking

### 7. Emergency Contacts
- Hotline information
- Click-to-call functionality
- Category organization
- 24/7 availability indicators

### 8. Profile & Settings
- View student profile
- Theme toggle (light/dark)
- Notification settings
- Privacy settings
- Logout

## Offline Support

The app uses Hive for local caching:

- Assessment questions cache
- Draft ESM entries
- User session persistence
- Appointment data cache

Syncing occurs automatically when internet reconnects.

## Push Notifications

Firebase Cloud Messaging integration for:

- Assessment reminders
- Appointment notifications
- Mental health tips
- System alerts

## Security

- JWT tokens stored in secure storage
- Passwords never stored locally
- Token refresh on 401 responses
- Clear token on logout
- SSL certificate pinning (optional)

## Building & Deployment

### Development Build

```bash
flutter run -d <device_id>
```

### Release APK

```bash
flutter build apk --release
```

Output: `build/app/outputs/flutter-apk/app-release.apk`

### Release App Bundle (for Play Store)

```bash
flutter build appbundle --release
```

Output: `build/app/outputs/bundle/release/app-release.aab`

### Signed APK (Production)

```bash
flutter build apk --release --verbose
```

For manual signing:

```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore path/to/keystore.jks \
  build/app/outputs/flutter-apk/app-release.apk \
  key_alias
```

## Android Emulator Setup

```bash
# List available devices
flutter devices

# Create new emulator
flutter emulators --create --name pixel_5

# Start emulator
flutter emulators --launch pixel_5

# Run app on emulator
flutter run
```

## Physical Device Installation

```bash
# Enable USB Debugging on device
# Connect device via USB
# Verify connection
flutter devices

# Run app
flutter run
```

## Troubleshooting

### API Connection Issues
- Verify backend is running on port 3001
- Update IP address in api_constants.dart
- Check network connectivity
- Verify firewall settings

### Firebase Setup Issues
- Ensure google-services.json is properly placed
- Rebuild app after adding Firebase
- Clear build cache: `flutter clean`

### Token Expiration
- App automatically refreshes tokens
- User redirected to login if token invalid
- Check token expiry in backend (12 hours)

## Performance Optimization

- Image caching
- Lazy loading of screens
- Hive local storage for reduced API calls
- Efficient list rendering with pagination
- Background sync for offline entries

## Accessibility

- Material 3 compliant
- High contrast support
- Screen reader friendly
- Semantic labels on interactive elements
- Proper focus navigation

## Contributing

Follow clean architecture principles:
- Separation of concerns
- Dependency injection via Riverpod
- Reusable widgets
- Proper error handling
- Comprehensive logging

## License

Copyright © 2026 Project SPARTAN-G. All rights reserved.

## Support

For issues or feature requests, contact the development team.
