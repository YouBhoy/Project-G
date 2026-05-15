import 'package:go_router/go_router.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/auth/presentation/signup_screen.dart';
import '../features/auth/presentation/splash_screen.dart';
import '../features/auth/presentation/consent_screen.dart';
import '../features/auth/presentation/consent_gate.dart';
import '../features/dashboard/presentation/dashboard_screen.dart';
import '../features/assessments/presentation/assessment_selection_screen.dart';
import '../features/assessments/presentation/assessment_detail_screen.dart';
import '../features/esm/presentation/esm_screen.dart';
import '../features/appointments/presentation/appointments_screen.dart';
import '../features/emergency/presentation/emergency_contacts_screen.dart';
import '../features/profile/presentation/profile_screen.dart';
import '../features/settings/presentation/settings_screen.dart';
import '../features/analytics/presentation/analytics_overview_screen.dart';

final GoRouter router = GoRouter(
  initialLocation: '/',
  redirect: (context, state) {
    // Handle redirects if needed
    return null;
  },
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/signup',
      builder: (context, state) => const SignupScreen(),
    ),
    GoRoute(
      path: '/home',
      builder: (context, state) => const DashboardScreen(),
    ),
    GoRoute(
      path: '/consent',
      builder: (context, state) => const ConsentScreen(),
    ),
    GoRoute(
      path: '/assessments',
      builder: (context, state) => const ConsentGate(
        title: 'Assessments',
        consentPurposeLabel: 'assessment library',
        child: AssessmentSelectionScreen(),
      ),
    ),
    GoRoute(
      path: '/assessments/dass21',
      builder: (context, state) => const ConsentGate(
        title: 'DASS-21',
        consentPurposeLabel: 'DASS-21',
        child: AssessmentDetailScreen(assessmentType: 'DASS21'),
      ),
    ),
    GoRoute(
      path: '/assessments/phq9',
      builder: (context, state) => const ConsentGate(
        title: 'PHQ-9',
        consentPurposeLabel: 'PHQ-9',
        child: AssessmentDetailScreen(assessmentType: 'PHQ9'),
      ),
    ),
    GoRoute(
      path: '/assessments/gad7',
      builder: (context, state) => const ConsentGate(
        title: 'GAD-7',
        consentPurposeLabel: 'GAD-7',
        child: AssessmentDetailScreen(assessmentType: 'GAD7'),
      ),
    ),
    GoRoute(
      path: '/esm',
      builder: (context, state) => const ConsentGate(
        title: 'ESM Check-in',
        consentPurposeLabel: 'ESM check-ins',
        child: ESMScreen(),
      ),
    ),
    GoRoute(
      path: '/appointments',
      builder: (context, state) => const AppointmentsScreen(),
    ),
    GoRoute(
      path: '/emergency',
      builder: (context, state) => const EmergencyContactsScreen(),
    ),
    GoRoute(
      path: '/profile',
      builder: (context, state) => const ProfileScreen(),
    ),
    GoRoute(
      path: '/settings',
      builder: (context, state) => const SettingsScreen(),
    ),
    GoRoute(
      path: '/analytics',
      builder: (context, state) => const AnalyticsOverviewScreen(),
    ),
  ],
);
