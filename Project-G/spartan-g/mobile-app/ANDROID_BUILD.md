# Android Build & Deployment Guide for SPARTAN-G Mobile App

## Prerequisites

1. **Android SDK**
   - Minimum API level: 21
   - Target API level: 34+
   - Download via Android Studio SDK Manager

2. **Java Development Kit (JDK)**
   - JDK 11 or higher
   - Set JAVA_HOME environment variable

3. **Android Studio**
   - Latest stable version
   - Gradle 8.0+

4. **Flutter SDK**
   - Flutter 3.16+ with Dart 3.0+
   - Run: `flutter doctor`

## Setup

### 1. Configure Android SDK

In Android Studio:
1. Settings > Appearance & Behavior > System Settings > Android SDK
2. Ensure SDK Platform 34 is installed
3. Install required build tools

### 2. Set Environment Variables

**Windows:**
```cmd
setx ANDROID_SDK_ROOT C:\Users\<username>\AppData\Local\Android\sdk
setx ANDROID_HOME C:\Users\<username>\AppData\Local\Android\sdk
setx JAVA_HOME C:\Program Files\Java\jdk-11
```

**macOS/Linux:**
```bash
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
export ANDROID_HOME=$HOME/Library/Android/sdk
export JAVA_HOME=$(/usr/libexec/java_home -v 11)
```

### 3. Create Signing Key (for release builds)

```bash
keytool -genkey -v -keystore ~/upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10950 \
  -alias upload -noprompt \
  -dname "CN=SPARTAN-G,O=University,L=City,ST=State,C=PH" \
  -keypass password123 -storepass password123
```

**Note:** Store the keystore securely. You'll need it for all release builds.

### 4. Build APK

**Debug APK:**
```bash
flutter build apk --debug
# Output: build/app/outputs/flutter-apk/app-debug.apk
```

**Release APK (without signing):**
```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

**Release APK (with signing):**

Create `android/key.properties`:
```properties
storePassword=password123
keyPassword=password123
keyAlias=upload
storeFile=path/to/upload-keystore.jks
```

Then build:
```bash
flutter build apk --release
```

### 5. Build App Bundle (for Play Store)

```bash
flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab
```

## Installation

### On Physical Device

1. Enable USB Debugging:
   - Settings > Developer Options > USB Debugging (ON)

2. Connect device via USB

3. Install:
   ```bash
   flutter install
   ```

Or manually:
```bash
adb install -r build/app/outputs/flutter-apk/app-release.apk
```

### On Emulator

```bash
# Start emulator
emulator -avd Pixel_5_API_33

# Or via Flutter
flutter emulators --launch pixel_5

# Run app
flutter run
```

## Testing on Android

### Emulator Setup

1. Create AVD in Android Studio:
   - AVD Manager > Create Virtual Device
   - Select Pixel 5
   - Select API 33+ (target)
   - Allocate 4GB RAM, 2GB VM heap

2. Configure Network Access:
   - For backend at 192.168.X.X:3001
   - Edit AVD settings > Advanced > qemu.net.bat = on

### Run Tests

```bash
# Unit tests
flutter test

# Integration tests
flutter drive --target=test_driver/app.dart
```

### Debug APK on Device

```bash
flutter run -v

# With specific device
flutter run -d <device_id> -v
```

## Performance Optimization

### Build Optimization

```bash
# Faster builds (skip unnecessary)
flutter build apk --release --split-per-abi

# APK size analysis
flutter build apk --analyze-size --release
```

### APK Size Reduction

- Use `--split-per-abi` for separate APKs per architecture
- Remove unused dependencies
- Minimize asset sizes
- Enable ProGuard/R8 obfuscation

## Troubleshooting

### Issue: "Android SDK not found"

Solution:
```bash
flutter config --android-sdk-path /path/to/android/sdk
```

### Issue: "Gradle build failed"

Solution:
```bash
flutter clean
flutter pub get
flutter build apk --release -v
```

### Issue: "Certificate error when installing"

Solution - Clear cached app:
```bash
adb uninstall com.spartang.mobile
adb install build/app/outputs/flutter-apk/app-release.apk
```

### Issue: "Network unreachable in emulator"

Solution:
1. Check emulator network settings
2. Use 10.0.2.2 instead of localhost
3. Configure firewall to allow connections

### Issue: "Firebase Cloud Messaging not working"

Solution:
1. Ensure `google-services.json` is in `android/app/`
2. Rebuild: `flutter clean && flutter run`
3. Check FCM token in logcat: `adb logcat | grep FCM`

## Release Checklist

- [ ] Update `pubspec.yaml` version
- [ ] Update `versionCode` and `versionName` in `build.gradle`
- [ ] Test on emulator
- [ ] Test on physical device
- [ ] Run all unit tests
- [ ] Build APK with signing
- [ ] Test signed APK installation
- [ ] Verify all features work
- [ ] Check battery usage
- [ ] Test offline functionality
- [ ] Build App Bundle for Play Store

## Play Store Submission

1. Create Google Play Developer account ($25 one-time fee)
2. Create app listing
3. Upload signed App Bundle (.aab)
4. Add screenshots, description, privacy policy
5. Set content rating
6. Add pricing and distribution
7. Submit for review

## Monitoring & Analytics

### Firebase Console

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Select your project
3. View:
   - Analytics
   - Crash Reports
   - Performance Monitoring
   - User Engagement

### Logcat Monitoring

```bash
adb logcat | grep flutter
adb logcat | grep SPARTAN
```

## Version Updates

### Update Process

```bash
# Update version in pubspec.yaml
# 1. major.minor.patch+buildNumber format
# E.g., 1.1.0+2

flutter build apk --release
# New APK created with new version
```

### Track Version History

- Keep all release APKs
- Document changes in CHANGELOG.md
- Tag releases in version control

## Security Best Practices

- [ ] Never commit signing keys to git
- [ ] Use environment variables for sensitive data
- [ ] Enable ProGuard obfuscation
- [ ] Implement certificate pinning for API
- [ ] Regularly update dependencies
- [ ] Monitor Firebase Crashlytics
- [ ] Test with security scanning tools

## Useful Commands Reference

```bash
# Clean build
flutter clean

# Get dependencies
flutter pub get

# Build for testing
flutter build apk --debug

# Build for production
flutter build apk --release

# Build app bundle
flutter build appbundle --release

# Install on device
flutter install

# Run with verbose output
flutter run -v

# Analyze code
dart analyze

# Format code
dart format .

# Run tests
flutter test
```

## Support & Documentation

- [Flutter Official Docs](https://flutter.dev/docs)
- [Android Developer Docs](https://developer.android.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Play Store Guidelines](https://play.google.com/console/about/)
