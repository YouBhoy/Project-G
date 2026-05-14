# SPARTAN-G Mobile App - Architecture & Code Organization

## Clean Architecture Implementation

The app follows clean architecture principles with separation of concerns:

```
lib/
├── core/                  # Core/common functionality
│   ├── api/               # HTTP client & interceptors
│   ├── constants/         # App constants
│   ├── models/            # Shared data models
│   ├── services/          # System services
│   ├── theme/             # UI theme configuration
│   ├── utils/             # Utilities & helpers
│   └── widgets/           # Reusable widgets
├── features/              # Feature modules (by domain)
│   ├── auth/              # Authentication
│   ├── dashboard/         # Main dashboard
│   ├── assessments/       # Mental health assessments
│   ├── esm/               # Experience sampling method
│   ├── appointments/      # Appointment booking
│   ├── emergency/         # Emergency contacts
│   ├── profile/           # User profile
│   └── settings/          # App settings
├── routes/                # Navigation routing
└── main.dart              # App entry point
```

## Feature Module Structure

Each feature follows the same pattern:

```
feature/
├── data/                  # Data layer
│   ├── models/            # API models (JSON serialization)
│   ├── repositories/      # Repository implementations
│   └── datasources/       # Remote/local data sources
├── domain/                # Domain layer (optional)
│   ├── entities/          # Business entities
│   └── repositories/      # Repository interfaces
└── presentation/          # Presentation layer
    ├── providers/         # Riverpod state management
    ├── screens/           # UI screens
    └── widgets/           # Feature-specific widgets
```

### Layer Responsibilities

**Data Layer:**
- API calls via Dio
- Response parsing
- Model transformation
- Local caching

**Domain Layer:**
- Business logic
- Use cases
- Entity definitions
- Repository interfaces

**Presentation Layer:**
- UI rendering
- User interaction
- State management with Riverpod
- Navigation

## State Management with Riverpod

### Provider Types Used

```dart
// Simple Provider - Dependency injection
final apiClientProvider = Provider((ref) {
  final dio = ref.watch(dioProvider);
  return ApiClient(dio);
});

// StateNotifierProvider - Stateful business logic
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});

// FutureProvider - Async data fetching
final dashboardProvider = FutureProvider((ref) async {
  return ref.read(apiClientProvider).get('/dashboard');
});

// StreamProvider - Real-time updates
final connectivityProvider = StreamProvider((ref) {
  return Connectivity().onConnectivityChanged;
});
```

### Usage in Widgets

```dart
// Watching provider
final data = ref.watch(dashboardProvider);

// Listening for changes
ref.listen(authProvider, (previous, next) {
  if (next.isAuthenticated) {
    context.go('/home');
  }
});

// Getting provider value once
final repository = ref.read(authRepositoryProvider);
```

## API Integration

### Request Flow

```
1. Widget calls ref.watch(provider)
   ↓
2. Provider calls ref.read(apiClientProvider)
   ↓
3. ApiClient.get() with Dio
   ↓
4. AuthInterceptor adds JWT token
   ↓
5. LoggingInterceptor logs request/response
   ↓
6. ErrorInterceptor handles errors
   ↓
7. Response parsed to model
   ↓
8. Provider returns data to widget
```

### Error Handling

- Exceptions caught in interceptors
- Custom exception classes for different error types
- Error states propagated through Riverpod
- UI displays appropriate error widgets

### Token Management

```dart
// Interceptor automatically adds token
Authorization: Bearer <token>

// On 401, token is cleared
// User redirected to login
// Token refreshed before expiry (12 hours)
```

## Local Caching Strategy

### Hive Implementation

```dart
// Initialize on app start
await LocalStorageService.initialize();

// Cache data
await localStorageService.cacheDashboardData(data);

// Retrieve cached data
final cached = await localStorageService.getCachedDashboardData();

// Clear cache
await localStorageService.clearAll();
```

### Cache Keys

```
dashboard_cache          // Dashboard data
assessments_cache_DASS21 // Assessment questions
esm_draft                // ESM check-in draft
assessment_draft_DASS21  // Assessment responses draft
appointments_cache       // Booked appointments
emergency_contacts_cache // Emergency contact list
```

### Offline Sync

```dart
// Detect connectivity change
ref.watch(connectivityProvider).when(
  data: (connectivity) {
    if (connectivity != ConnectivityResult.none) {
      // Auto-sync drafts when online
      _syncOfflineData();
    }
  },
);
```

## Theme System

### Material 3 Support

- Light theme with primary blue, secondary cyan
- Dark theme with adjusted colors
- Responsive to system theme (future)

### Theme Customization

```dart
// In AppTheme
static ThemeData lightTheme() {
  return ThemeData(
    useMaterial3: true,
    colorScheme: lightColorScheme,
    // ... custom styles
  );
}
```

### Using Theme Colors

```dart
Color color = AppColors.primary;
LinearGradient gradient = AppColors.primaryGradient;
Color riskColor = AppColors.riskLow; // or riskModerate, riskHigh
```

## Navigation with GoRouter

### Route Definition

```dart
final router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => SplashScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => LoginScreen(),
    ),
    // ...
  ],
);
```

### Navigation

```dart
// Navigate to route
context.go('/home');

// Push route (with back)
context.push('/assessments');

// Navigate with params
context.go('/assessment/DASS21');

// Go back
context.pop();
```

## Security Best Practices

### Token Security

```dart
// Never store in shared preferences
// Always use flutter_secure_storage
await secureStorageService.saveToken(token);

// Token cleared on logout
await secureStorageService.clearToken();

// Token expiry handled gracefully
// Redirects to login on 401
```

### API Security

```dart
// HTTPS only in production
// Certificates validated
// SSL pinning available (optional)

// Request timeout prevents hanging
connectionTimeout: Duration(seconds: 30)
receiveTimeout: Duration(seconds: 30)
```

### Data Validation

```dart
// Input validation in forms
Validators.validateEmail(value)
Validators.validatePassword(value)

// API response validation
ApiResponse.fromJson() checks structure
```

## Testing Strategy

### Unit Tests

```dart
test('assess depression score', () {
  final responses = [...];
  final score = calculateScore(responses);
  expect(score, equals(expectedScore));
});
```

### Widget Tests

```dart
testWidgets('dashboard renders', (tester) async {
  await tester.pumpWidget(MyApp());
  expect(find.text('Welcome'), findsOneWidget);
});
```

### Integration Tests

```dart
// Complete user flows
// From login to assessment completion
// Appointment booking end-to-end
```

## Performance Optimization

### Memory Management

- Dispose controllers properly
- Clear cached data regularly
- Limit data retained in memory
- Use const constructors

### UI Performance

- ListView.builder for dynamic lists
- Lazy loading for heavy widgets
- Efficient chart rendering
- Image caching strategies

### API Optimization

- Request debouncing
- Local cache utilization
- Pagination for large datasets
- Batch requests where possible

## Accessibility Considerations

- Material 3 semantic widgets
- Proper contrast ratios (WCAG AAA)
- Semantic labels for interactive elements
- Screen reader support
- Proper focus navigation
- Minimum 48x48 tap targets

## Code Quality

### Naming Conventions

```dart
// Classes: PascalCase
class LoginScreen { }

// Variables/functions: camelCase
final userName = '';
void handleLogin() { }

// Constants: camelCase with final
final appName = 'SPARTAN-G';

// Private members: underscore prefix
final _controller = TextEditingController();
void _handleSubmit() { }
```

### File Organization

- One main class per file
- Related private classes in same file
- Imports organized (dart, packages, local)
- Max 500 lines per file

### Documentation

```dart
/// Handles user login with email and password
/// 
/// Returns [AuthEntity] on success
/// Throws [UnauthorizedException] on failure
Future<AuthEntity> login(String email, String password) async {
  // implementation
}
```

## Deployment Checklist

- [ ] Update version in pubspec.yaml
- [ ] Update version in build.gradle
- [ ] Test on emulator
- [ ] Test on physical device
- [ ] Run all tests
- [ ] Generate signed APK
- [ ] Verify signed APK
- [ ] Test signed APK
- [ ] Create release notes
- [ ] Upload to Play Store
- [ ] Monitor crash reports
- [ ] Check analytics

## Future Enhancements

1. **Data Persistence**
   - Implement SQLite for complex queries
   - Add offline-first architecture

2. **Advanced Caching**
   - Cache invalidation strategies
   - Smart prefetching

3. **Performance**
   - Code splitting
   - Lazy package loading
   - Advanced image optimization

4. **Features**
   - Dark mode toggle
   - Multi-language support
   - Accessibility enhancements
   - Video consultation support

5. **Analytics**
   - Enhanced Firebase tracking
   - Custom event logging
   - Funnel analysis

6. **Testing**
   - 80%+ code coverage
   - E2E automated tests
   - Performance benchmarks

## Troubleshooting Common Issues

### Build Issues

```bash
flutter clean
flutter pub get
flutter pub upgrade
flutter build apk --release -v
```

### Runtime Issues

- Check logs: `flutter logs -v`
- Clear cache: `flutter clean`
- Restart emulator
- Rebuild: `flutter run --no-fast-start`

### Firebase Issues

- Verify google-services.json location
- Check firebase plugins version
- Rebuild after Firebase changes

### State Management Issues

- Check provider scope
- Verify invalidation logic
- Use DevTools to inspect state

## Additional Resources

- [Flutter Documentation](https://flutter.dev/docs)
- [Riverpod Documentation](https://riverpod.dev)
- [GoRouter Documentation](https://pub.dev/packages/go_router)
- [Firebase for Flutter](https://firebase.flutter.dev)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
