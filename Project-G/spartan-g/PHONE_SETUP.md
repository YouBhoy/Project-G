# SPARTAN-G Phone Setup Guide

This guide explains how to run the full SPARTAN-G stack and install the Flutter mobile app on a physical Android phone.

## What You Need

- Windows PC with XAMPP installed
- MySQL running in XAMPP
- Node.js installed for the backend
- Flutter SDK installed
- Android phone with USB debugging enabled
- Phone and PC connected to the same Wi-Fi network for testing

## What The System Uses

- Backend: Node.js + Express on port `3001`
- Database: MySQL database named `spartan_g`
- Mobile app: Flutter Android app
- API base URL: your PC LAN IP, not `10.0.2.2`, when testing on a real phone
- Calendar bridge: optional, only if you have your own Google service account JSON

## Required Local Changes On Your Side

1. Open `mobile-app/lib/core/constants/api_constants.dart`.
2. Set the API base URL to your computer's Wi-Fi IPv4 address.
3. Keep the `/api` suffix.

Example:

```dart
static const String baseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://192.168.5.52:3001/api',
);
```

If your PC gets a different Wi-Fi address, update that IP before rebuilding the APK.

## Backend Setup

1. Start XAMPP MySQL.
2. Import `backend/sql/setup-spartan-g.sql` into phpMyAdmin.
3. Confirm the database name is `spartan_g`.
4. Make sure `backend/.env` contains:

```env
DB_CLIENT=mysql
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=spartan_g
PORT=3001
```

5. Start the backend:

```powershell
cd "spartan-g/backend"
npm install
npm run dev
```

6. Verify the health check:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3001/api/health
```

You should get:

```json
{"success":true,"data":{"status":"ok"}}
```

## Mobile App Setup

1. Open `mobile-app` in VS Code.
2. Make sure Flutter is installed and `flutter --version` works.
3. Confirm your phone is on the same Wi-Fi as the PC.
4. Build the APK:

```powershell
cd "spartan-g/mobile-app"
flutter pub get
flutter build apk --debug
```

5. Install to the phone:

```powershell
cd E:\AndroidSDK\platform-tools
.\adb devices
.\adb install -r "c:\xampp\htdocs\Prototype of Project G\Project-G\Project-G\spartan-g\mobile-app\build\app\outputs\flutter-apk\app-debug.apk"
```

## Using The Phone With The Backend

Your phone does not talk to the backend through `localhost`. It must use the PC's LAN IP.

Important rules:

1. Phone and PC must be on the same Wi-Fi.
2. Windows Firewall must allow incoming traffic to port `3001` if requests fail.
3. If your Wi-Fi IP changes, update `api_constants.dart` and rebuild the APK.
4. If you are testing on an emulator, `10.0.2.2` is fine, but not for a real phone.

## What The Mobile App Currently Does

- Signup writes the new student into the MySQL `spartan_g` database.
- Login reads the student from the backend and shows the real logged-in account.
- Logout clears the secure storage and returns to the login screen.
- Dashboard and profile screens now show the active student instead of hardcoded demo data.
- Facilitator-facing data is authorized server-side, so phone and web clients only see their own scoped data.

## If You Want To Change Things On Your End

You only need to change these items for your own machine:

1. The Wi-Fi IP in `mobile-app/lib/core/constants/api_constants.dart`
2. The MySQL credentials in `backend/.env` if your XAMPP setup is different
3. The Firebase Android config file if you plan to use push notifications:
  - add `android/app/google-services.json`
4. Optionally, the Android application ID in `mobile-app/android/app/build.gradle.kts` if you want a custom package name
5. If you want calendar-backed facilitator features, add your own `server/.env` and `server/service-account.json` in the `spartan-g/server` folder.

## Troubleshooting

### App opens but cannot log in or sign up

- Check the backend is running on port `3001`
- Check the phone is on the same Wi-Fi as the PC
- Check the IP in `api_constants.dart`
- Try `Invoke-WebRequest http://<your-pc-ip>:3001/api/health` from another device on the same network

### Signup works but data is not in MySQL

- Make sure you imported `backend/sql/setup-spartan-g.sql`
- Make sure the backend `.env` points to `MYSQL_DATABASE=spartan_g`
- Confirm the student row appears in the `students` table

### App shows black screen or hangs on splash

- Reinstall the newest APK
- Make sure you are not running an old build
- Check ADB logs with:

```powershell
cd E:\AndroidSDK\platform-tools
.\adb logcat | findstr /i "flutter firebase fatal exception"
```

### Phone is not reachable by ADB

- Enable USB debugging on the phone
- Tap Allow on the USB debugging prompt
- Run:

```powershell
.\adb kill-server
.\adb start-server
.\adb devices
```

## Recommended Run Order

1. Start XAMPP MySQL
2. Start the backend
3. Verify the backend health endpoint
4. Update the mobile API IP if needed
5. Build and install the APK
6. Sign up or log in on the phone

If you want a one-click desktop launcher, use [start-all.bat](start-all.bat) from the `spartan-g` folder. Set `MOBILE_API_BASE_URL` first if you are targeting a physical phone instead of the emulator.
The launcher will skip the optional calendar server unless the local calendar files already exist.

Local Setup Checklist (quick):

- Install Node.js, npm, Flutter (for mobile), and XAMPP with MySQL.
- Clone the repo and run `npm install` in `backend/`, `server/`, and `student-portal/`.
- Import `backend/sql/setup-spartan-g.sql` into phpMyAdmin and copy `.env.example` → `.env` in `backend/` with local MySQL credentials.
- If using calendar features, add `server/service-account.json` and create `server/.env` with `CALENDAR_ID` and optionally `PORT=3002`.
- For physical Android testing, set `MOBILE_API_BASE_URL` to your machine's LAN IP (e.g. `http://192.168.1.10:3001/api`) before running `start-all.bat`.

## Quick Win

If you only need the student portal and backend, you do not need any Google calendar secrets. Copy `backend/.env.example` to `backend/.env`, import the SQL seed, and run `start-all.bat`.
