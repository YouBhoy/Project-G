# SPARTAN-G Mobile App - Complete Setup Guide

## Step-by-Step Setup

### Prerequisites

1. **Flutter SDK**
   ```bash
   # Download from https://flutter.dev/docs/get-started/install
   flutter --version
   ```

2. **Android SDK**
   - Minimum API level: 21
   - Target API level: 34+
   - Install via Android Studio

3. **Java JDK**
   ```bash
   java -version
   # Requires JDK 11+
   ```

4. **Backend Running**
   - Verify backend on `http://192.168.X.X:3001`
   - Test: `curl http://192.168.X.X:3001/api/health`

### Step 1: Project Setup

```bash
cd mobile-app
flutter pub get
```

### Step 2: Configure API Base URL

Edit `lib/core/constants/api_constants.dart`:

```dart
class ApiConstants {
  // Change this to your development machine IP
  static const String baseUrl = 'http://192.168.X.X:3001/api';
}
```

To find your machine IP on Windows:
```bash
ipconfig
# Look for "IPv4 Address" under your network adapter
```

### Step 3: Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project or use existing
3. Add Android app with package name: `com.spartang.mobile`
4. Download `google-services.json`
5. Place in `android/app/google-services.json`
6. Rebuild: `flutter clean && flutter pub get`

### Step 4: Android Studio Setup

1. Open project: `android/` folder
2. Wait for Gradle sync
3. Accept any SDK downloads
4. Verify no build errors

### Step 5: Run on Emulator

```bash
# List emulators
flutter emulators

# Create new Pixel 5 emulator (if needed)
flutter emulators --create --name pixel_5

# Launch emulator
flutter emulators --launch pixel_5

# Wait for boot, then:
flutter run
```

### Step 6: Run on Physical Device

```bash
# Enable USB Debugging:
# Settings > Developer Options > USB Debugging (ON)

# Connect device
# Verify with:
flutter devices

# Run app
flutter run
```

## Build Instructions

### Development APK

```bash
flutter build apk --debug
```

Output: `build/app/outputs/flutter-apk/app-debug.apk`

### Release APK

```bash
flutter build apk --release
```

Output: `build/app/outputs/flutter-apk/app-release.apk`

### Release App Bundle (Play Store)

```bash
flutter build appbundle --release
```

Output: `build/app/outputs/bundle/release/app-release.aab`

## Emulator Setup Troubleshooting

### Emulator Won't Start

```bash
# Clear emulator data
flutter emulators --delete pixel_5

# Create fresh emulator
flutter emulators --create --name pixel_5 --force
```

### API Not Reachable from Emulator

Android emulator uses `10.0.2.2` to access host machine:

Edit `lib/core/constants/api_constants.dart`:

```dart
static const String baseUrl = 'http://10.0.2.2:3001/api';
```

### Firebase Not Working

```bash
flutter clean
flutter pub get
flutter run
```

## Device Installation

### Using ADB (Android Debug Bridge)

```bash
# List connected devices
adb devices

# Install APK
adb install -r build/app/outputs/flutter-apk/app-release.apk

# Or via Flutter
flutter install
```

### Using Android Studio

1. Device > Physical Device
2. Build > Build Bundle(s) / APK(s) > Build APK(s)
3. Run > Run
4. Select device

## Testing

### Unit Tests

```bash
flutter test
```

### Integration Tests

```bash
flutter drive --target=test_driver/app.dart
```

### Manual Testing Checklist

- [ ] Login with valid credentials
- [ ] Signup with new account
- [ ] Consent flow works
- [ ] Dashboard loads correctly
- [ ] DASS-21 assessment completes
- [ ] ESM check-in submission works
- [ ] Appointment booking works
- [ ] Emergency contacts display
- [ ] Profile page loads
- [ ] Settings toggle works
- [ ] Logout clears token
- [ ] Offline mode caches data
- [ ] Push notifications received
- [ ] Logout & login again works

## Configuration

### API Base URL

**For Emulator:**
```dart
static const String baseUrl = 'http://10.0.2.2:3001/api';
```

**For Physical Device (WiFi):**
```dart
static const String baseUrl = 'http://192.168.X.X:3001/api';
```

Get your IP: `ipconfig` → IPv4 Address

### Firebase Configuration

- Project: SPARTAN-G Mobile
- Messaging: Enabled
- Authentication: Enabled
- Firestore: Optional

### Environment Variables

Create `.env` file (optional):

```
API_BASE_URL=http://192.168.X.X:3001/api
FIREBASE_PROJECT_ID=spartan-g-mobile
```

## Deployment

### Play Store Submission

1. Generate signed APK/AAB
2. Create app signing key
3. Upload to Play Store Console
4. Fill app details, screenshots, description
5. Submit for review

### Signing Key Generation

```bash
keytool -genkey -v -keystore ~/upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10950 \
  -alias upload
```

Store credentials securely for future updates.

## Monitoring & Analytics

- Firebase Analytics automatically enabled
- Crash reporting via Firebase Crashlytics
- View logs: `flutter logs`
- Detailed logs: `flutter run -v`

## Performance Optimization

- Use `flutter run --profile` for performance testing
- Check frame rates with DevTools
- Profile memory usage
- Monitor API response times

## Useful Commands

```bash
# Full clean build
flutter clean && flutter pub get

# Format code
dart format lib/

# Analyze code
dart analyze

# Generate code (Riverpod, Hive, etc.)
flutter pub run build_runner build

# View widget tree
flutter run --debug

# View debug logs
flutter logs

# Verbose build
flutter build apk --release -v
```

## Common Issues & Solutions

### "Failed to establish a connection"
- Update IP in api_constants.dart
- Ensure backend is running
- Check firewall

### "Firebase plugin not found"
- Run: `flutter clean && flutter pub get`
- Rebuild APK

### "Permission denied" during installation
- Enable USB Debugging
- Revoke USB Debugging Authorization on device
- Reconnect and authorize again

### "Gradle build failed"
- Run: `flutter clean`
- Update gradle: `./gradlew wrapper --gradle-version 8.0`

### Token expired
- App automatically redirects to login
- Clear cache: Settings > Apps > SPARTAN-G > Clear Cache

## Support

For additional help:
- Flutter Docs: https://flutter.dev/docs
- Firebase Docs: https://firebase.google.com/docs
- Riverpod: https://riverpod.dev
- GoRouter: https://pub.dev/packages/go_router
