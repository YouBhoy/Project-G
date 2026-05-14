# SPARTAN-G Mobile App - Feature Implementation Guide

## Table of Contents

1. [Authentication](#authentication)
2. [Consent Flow](#consent-flow)
3. [Dashboard](#dashboard)
4. [Assessments](#assessments)
5. [ESM Check-ins](#esm-check-ins)
6. [Appointments](#appointments)
7. [Emergency Contacts](#emergency-contacts)
8. [Profile & Settings](#profile--settings)
9. [Offline Support](#offline-support)
10. [Push Notifications](#push-notifications)

## Authentication

### Screens

- **Splash Screen** (`splash_screen.dart`)
  - 2-second delay
  - Checks stored token validity
  - Redirects to login or home

- **Login Screen** (`login_screen.dart`)
  - Student ID + Password form
  - JWT token storage via `flutter_secure_storage`
  - Token expires in 12 hours
  - Error handling with snackbars

- **Signup Screen** (`signup_screen.dart`)
  - Form with dropdowns for college, year level, sex
  - Password confirmation
  - Role automatically set to "student"

### Implementation Details

**Token Management:**
```dart
// Save token after login
await secureStorage.saveToken(token);

// Retrieve token on app start
final token = await secureStorage.getToken();

// Attach token to API requests
// Done automatically via AuthInterceptor in Dio
```

**Session Persistence:**
- Token stored in `flutter_secure_storage` (encrypted)
- Survives app restart
- Validated on splash screen
- Cleared on logout

**Token Refresh:**
- Current: Manual refresh on 401 response
- Redirects to login automatically
- User must re-authenticate

### API Endpoints

```
POST /api/auth/signup
POST /api/auth/login
GET /api/auth/validate
```

---

## Consent Flow

### Implementation

1. After login, check `consentFlag` in user profile
2. If false, show consent dialog
3. User must agree before accessing assessments
4. Consent stored in backend with timestamp

### Screens

**Consent Dialog** (in dashboard)
```dart
if (!student.consentFlag) {
  _showConsentDialog();
}
```

### API Endpoints

```
GET /api/student/profile/me
POST /api/student/profile/consent
```

---

## Dashboard

### Features

1. **Welcome Card**
   - Displays student name
   - Quick mood/energy overview

2. **Risk Level Badge**
   - Color-coded (low=green, moderate=orange, high=red, crisis=purple)
   - Shows latest classification

3. **Latest Assessment**
   - Assessment type and date
   - Subscale scores

4. **Mood & Energy Trends**
   - Chart showing last 7 days
   - Uses `fl_chart` for visualization

5. **Recent ESM Entries**
   - Last 3 check-ins
   - Time and mood/energy scores

6. **Next Recommended Action**
   - Suggests booking appointment if needed
   - Based on risk level

### Riverpod State Management

```dart
final dashboardProvider = FutureProvider((ref) async {
  final apiClient = ref.watch(apiClientProvider);
  final response = await apiClient.get(
    ApiConstants.dashboardData,
  );
  return DashboardDataModel.fromJson(response);
});
```

### Caching

Dashboard data cached locally for 1 hour:
```dart
await localStorageService.cacheDashboardData(data);
final cached = await localStorageService.getCachedDashboardData();
```

### API Endpoint

```
GET /api/student/gawa/dashboard
```

---

## Assessments

### Supported Assessments

1. **DASS-21** (Depression, Anxiety, Stress Scale)
   - 21 items
   - Likert scale 0-3
   - Scores: depression, anxiety, stress
   - Severity levels

2. **PHQ-9** (Patient Health Questionnaire)
   - 9 items
   - 0-27 total score
   - Scoring: 0-4 (minimal), 5-9 (mild), 10-14 (moderate), 15-19 (moderately severe), 20+ (severe)

3. **GAD-7** (Generalized Anxiety Disorder Scale)
   - 7 items
   - 0-21 total score
   - Same severity scoring as PHQ-9

### Implementation Flow

1. **Selection Screen** (`assessment_selection_screen.dart`)
   - User selects assessment type
   - Navigate to assessment detail screen

2. **Question Fetching**
   - GET questions from backend
   - Cache locally if offline

3. **Question Presentation**
   - Display one question at a time OR all at once (configurable)
   - Progress indicator
   - Likert scale buttons

4. **Response Tracking**
   - Store selected score for each item
   - Draft saved to local storage
   - Allow save without submit

5. **Submission**
   - POST responses to backend
   - Display results

6. **Results Display**
   - Show all subscale scores
   - Color-coded severity
   - Risk level recommendation
   - Option to schedule appointment

### Draft Functionality

```dart
// Save draft
final draft = {
  'assessmentType': 'DASS21',
  'responses': [...],
  'timestamp': DateTime.now(),
};
await localStorageService.saveAssessmentDraft('DASS21', draft);

// Resume draft
final saved = await localStorageService.getAssessmentDraft('DASS21');
```

### API Endpoints

```
GET /api/student/gawa/dass21/questions
POST /api/student/gawa/dass21/submit

POST /api/student/gawa/phq9/submit
POST /api/student/gawa/gad7/submit
```

---

## ESM Check-ins

### Purpose

Experience Sampling Method - Quick daily mood check-ins

### Features

1. **Sliders**
   - Mood score (0-10)
   - Energy score (0-10)
   - Real-time value display

2. **Stressor Category**
   - Dropdown selection
   - Options: Academics, Social, Family, Health, Financial, Other

3. **Binary Flags**
   - Physical symptoms? (Y/N)
   - Need help? (Y/N)

4. **Submission**
   - Immediate submit to backend
   - Show success message
   - Clear form for next entry

5. **Offline Support**
   - Save as draft if offline
   - Auto-sync when reconnected
   - Notify user of sync status

### Draft Caching

```dart
// Save draft
await localStorageService.saveESMDraft({
  'moodScore': 6,
  'energyScore': 5,
  'stressorCategory': 'Academics',
  'physicalSymptom': false,
  'helpIntent': true,
  'timestamp': DateTime.now(),
});

// Auto-sync on reconnect
final drafts = await localStorageService.getESMDraft();
if (drafts != null && isOnline) {
  await submitESM(drafts);
  await localStorageService.clearESMDraft();
}
```

### API Endpoint

```
POST /api/student/gawa/esm/submit
Body: {
  "moodScore": 6,
  "energyScore": 5,
  "stressorCategory": "Academics",
  "physicalSymptom": false,
  "helpIntent": true
}
```

---

## Appointments

### Screens

1. **Available Slots Tab**
   - List of counselor availability
   - Shows date, time, counselor name
   - "Book" button per slot

2. **My Appointments Tab**
   - Upcoming appointments
   - Past appointments
   - Status badge (Scheduled, Completed, Cancelled)
   - Cancel button for active appointments

### Features

1. **Slot Booking**
   - Select slot from available list
   - Confirmation dialog
   - Success notification
   - Redirect to my appointments

2. **Appointment Cancellation**
   - Confirmation required
   - Update status on backend
   - Refresh list

3. **Conflict Prevention**
   - Backend prevents booking same slot twice
   - Check capacity before booking

### Riverpod Providers

```dart
final availableSlotsProvider = FutureProvider((ref) async {
  return ref.read(apiClientProvider).get(
    ApiConstants.appointmentsAvailable,
  );
});

final myAppointmentsProvider = FutureProvider((ref) async {
  return ref.read(apiClientProvider).get(
    ApiConstants.appointmentsMyList,
  );
});
```

### API Endpoints

```
GET /api/student/appointments/available
POST /api/student/appointments/book
Body: { "slotId": "..." }

GET /api/student/appointments
DELETE /api/student/appointments/:appointmentId
```

---

## Emergency Contacts

### Features

1. **Contact Cards**
   - Organization name
   - Phone number
   - Category/classification
   - Description
   - 24/7 availability badge

2. **Actions**
   - Click-to-call button
   - Copy phone number to clipboard
   - Information display

3. **Categories**
   - Mental health crisis
   - Suicide prevention
   - Campus health services
   - Other hotlines

### Implementation

```dart
// Call number
void _callNumber(String phone) async {
  final Uri launchUri = Uri(scheme: 'tel', path: phone);
  if (await canLaunchUrl(launchUri)) {
    await launchUrl(launchUri);
  }
}
```

### Caching

```dart
await localStorageService.cacheEmergencyContacts(contacts);
final cached = await localStorageService.getCachedEmergencyContacts();
```

### API Endpoint

```
GET /api/emergency-contacts
Response: [
  {
    "contactId": "...",
    "name": "Mental Health Hotline",
    "phoneNumber": "1-800-...",
    "category": "Mental Health Crisis",
    "description": "...",
    "available247": true
  }
]
```

---

## Profile & Settings

### Profile Screen

Displays:
- Student avatar/icon
- Student ID
- Name
- Email
- College
- Year level
- Sex

Actions:
- Change password
- Logout

### Settings Screen

1. **Appearance**
   - Theme toggle (light/dark)

2. **Notifications**
   - Enable/disable push notifications
   - Stored in secure storage

3. **Support**
   - Help
   - About
   - Terms of Service
   - Privacy Policy

4. **Info**
   - App version
   - Copyright

### Logout Implementation

```dart
Future<void> logout() async {
  await secureStorageService.clearToken();
  await localStorageService.clearAll();
  context.go('/login');
}
```

---

## Offline Support

### Implementation with Hive

Hive is used for local data persistence without cloud sync.

### Cached Data

1. **Assessment Questions**
   ```dart
   await localStorageService.cacheAssessmentQuestions(
     'DASS21',
     questions,
   );
   ```

2. **Dashboard Data**
   ```dart
   await localStorageService.cacheDashboardData(data);
   ```

3. **Appointments**
   ```dart
   await localStorageService.cacheAppointments(appointments);
   ```

4. **Emergency Contacts**
   ```dart
   await localStorageService.cacheEmergencyContacts(contacts);
   ```

### Draft Functionality

Users can save incomplete forms locally and submit when online:

```dart
// ESM Draft
await localStorageService.saveESMDraft(draft);

// Assessment Draft
await localStorageService.saveAssessmentDraft('DASS21', draft);
```

### Sync Strategy

1. **On Reconnect Detection**
   ```dart
   ref.watch(connectivityProvider).when(
     data: (connectivity) {
       if (connectivity == ConnectivityResult.mobile ||
           connectivity == ConnectivityResult.wifi) {
         _syncOfflineData();
       }
     },
   );
   ```

2. **Auto-Sync Drafts**
   ```dart
   Future<void> _syncOfflineData() async {
     final esmDraft = await localStorageService.getESMDraft();
     if (esmDraft != null) {
       await apiClient.post('/student/gawa/esm/submit', data: esmDraft);
       await localStorageService.clearESMDraft();
     }
   }
   ```

### Cache Invalidation

- Dashboard: 1 hour
- Questions: 24 hours
- Appointments: 30 minutes
- Manual refresh button on each screen

---

## Push Notifications

### Firebase Cloud Messaging (FCM) Integration

### Setup

1. **Android Configuration**
   - Google Services Gradle plugin
   - google-services.json in app folder

2. **Initialize FCM**
   ```dart
   await FirebaseMessaging.instance.requestPermission();
   final token = await FirebaseMessaging.instance.getToken();
   ```

3. **Listen for Messages**
   - Foreground: `FirebaseMessaging.onMessage`
   - Background: `FirebaseMessaging.onMessageOpenedApp`
   - Terminated: Handled by Flutter

### Notification Handling

```dart
// Foreground notification
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  // Show local notification
  _showNotification(message);
});

// Background notification tap
FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
  // Navigate to relevant screen
  _handleNotificationTap(message);
});
```

### Register FCM Token

After login, send token to backend:

```dart
final token = await FirebaseMessaging.instance.getToken();
await apiClient.post(
  ApiConstants.fcmRegister,
  data: {'fcmToken': token},
);
```

### Notification Types

1. **Assessment Reminders**
   - Prompt to complete DASS-21
   - Trigger: Weekly on Monday

2. **Appointment Reminders**
   - Appointment in 24 hours
   - Trigger: 1 day before

3. **Mental Health Tips**
   - Weekly wellness tips
   - Trigger: Every Friday

4. **Urgent Alerts**
   - Risk escalation notifications
   - Trigger: On-demand by OGC staff

### API Endpoint

```
POST /api/fcm-register
Body: {
  "fcmToken": "token_here"
}
```

---

## State Management with Riverpod

### Providers Used

```dart
// Auth
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(...);

// Dashboard
final dashboardProvider = FutureProvider(...);

// Assessments
final assessmentQuestionsProvider = FutureProvider(...);

// Connectivity
final connectivityProvider = StreamProvider(...);
final isConnectedProvider = FutureProvider(...);

// Local Storage
final localStorageProvider = Provider(...);
```

### Usage Pattern

```dart
ref.watch(dashboardProvider).when(
  data: (data) => _buildUI(data),
  loading: () => LoadingIndicator(),
  error: (err, stack) => ErrorWidget(message: err.toString()),
);
```

---

## Error Handling

### API Errors

- 401: Unauthorized - Redirect to login
- 403: Forbidden - Show error message
- 404: Not found - Show "not found" state
- 500: Server error - Show retry button

### Network Errors

- Timeout: Show timeout message with retry
- No connection: Show offline message, cache data
- Connection lost during operation: Save draft, notify user

### User Feedback

- Success: Green snackbar
- Error: Red snackbar
- Info: Blue snackbar
- Warning: Orange snackbar

---

## Performance Considerations

1. **List Rendering**
   - Use `ListView.builder` for large lists
   - Implement pagination if needed

2. **Image Loading**
   - Use cached image networks
   - Compress images before upload

3. **Chart Rendering**
   - Limit data points for smooth animation
   - Cache chart data

4. **API Calls**
   - Implement request debouncing
   - Use cache whenever possible
   - Limit request frequency

---

## Testing

### Unit Tests

```dart
test('assessment response calculation', () {
  final responses = [/* responses */];
  final result = calculateScore(responses);
  expect(result, equals(expectedScore));
});
```

### Widget Tests

```dart
testWidgets('dashboard renders correctly', (WidgetTester tester) async {
  await tester.pumpWidget(const MyApp());
  expect(find.text('Welcome back'), findsOneWidget);
});
```

### Integration Tests

Test complete user flows:
- Login → Dashboard → Assessment → Results
- Book Appointment → Confirm → My Appointments
- ESM Check-in → Save Draft → Sync

---

## Accessibility

- Material 3 support
- High contrast mode
- Screen reader friendly
- Semantic labels
- Proper focus navigation
- Large tap targets (48x48 minimum)

---

## Next Steps

1. Implement data repositories (currently mock data)
2. Add real API integration tests
3. Implement Firebase analytics events
4. Add crash reporting
5. Implement advanced caching strategies
6. Add unit and widget tests
7. Optimize performance
8. Submit to Play Store
