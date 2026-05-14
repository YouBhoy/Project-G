import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/services/local_storage_service.dart';
import 'core/services/fcm_service.dart';
import 'core/theme/app_theme.dart';
import 'routes/router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  var isFirebaseReady = false;

  try {
    await Firebase.initializeApp();
    isFirebaseReady = true;
  } catch (e) {
    debugPrint('Firebase initialization skipped: $e');
  }

  try {
    await LocalStorageService.initialize();
  } catch (e) {
    debugPrint('Local storage initialization failed: $e');
  }

  runApp(
    ProviderScope(
      child: MyApp(isFirebaseReady: isFirebaseReady),
    ),
  );
}

class MyApp extends ConsumerStatefulWidget {
  final bool isFirebaseReady;

  const MyApp({Key? key, required this.isFirebaseReady}) : super(key: key);

  @override
  ConsumerState<MyApp> createState() => _MyAppState();
}

class _MyAppState extends ConsumerState<MyApp> {
  @override
  void initState() {
    super.initState();
    if (widget.isFirebaseReady) {
      _initializeFCM();
    }
  }

  Future<void> _initializeFCM() async {
    try {
      final fcmService = ref.read(fcmServiceProvider);
      await fcmService.initialize();
    } catch (e) {
      debugPrint('FCM initialization skipped: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'SPARTAN-G',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme(),
      darkTheme: AppTheme.darkTheme(),
      themeMode: ThemeMode.light,
      routerConfig: router,
    );
  }
}
