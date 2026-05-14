import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'models.dart';
import 'repositories.dart';

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  return AuthNotifier(repository);
});

final authStateProvider = StateProvider<bool>((ref) {
  return false;
});

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AuthNotifier(this._repository) : super(const AuthState.initial());

  Future<void> login(String studentId, String password) async {
    state = const AuthState.loading();
    try {
      final result = await _repository.login(studentId, password);
      state = AuthState.authenticated(result);
    } catch (e) {
      state = AuthState.error(e.toString());
    }
  }

  Future<void> signup(
    String studentId,
    String name,
    String email,
    String password,
    String college,
    int yearLevel,
    String sex,
  ) async {
    state = const AuthState.loading();
    try {
      final result = await _repository.signup(
        studentId,
        name,
        email,
        password,
        college,
        yearLevel,
        sex,
      );
      state = AuthState.authenticated(result);
    } catch (e) {
      state = AuthState.error(e.toString());
    }
  }

  Future<void> logout() async {
    state = const AuthState.loading();
    try {
      await _repository.logout();
      state = const AuthState.initial();
    } catch (e) {
      state = AuthState.error(e.toString());
    }
  }

  Future<void> checkAuthStatus() async {
    try {
      final student = await _repository.getCurrentStudent();
      if (student != null) {
        state = AuthState.authenticated(student);
      } else {
        state = const AuthState.initial();
      }
    } catch (e) {
      state = const AuthState.initial();
    }
  }
}

class AuthState {
  final AuthDataModel? data;
  final String? error;
  final bool isLoading;
  final bool isAuthenticated;

  const AuthState({
    this.data,
    this.error,
    this.isLoading = false,
    this.isAuthenticated = false,
  });

  const AuthState.initial()
      : data = null,
        error = null,
        isLoading = false,
        isAuthenticated = false;

  const AuthState.loading()
      : data = null,
        error = null,
        isLoading = true,
        isAuthenticated = false;

  const AuthState.authenticated(this.data)
      : error = null,
        isLoading = false,
        isAuthenticated = true;

  const AuthState.error(this.error)
      : data = null,
        isLoading = false,
        isAuthenticated = false;
}
