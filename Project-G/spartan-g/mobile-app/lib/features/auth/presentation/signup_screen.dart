import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/string_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/reusable_widgets.dart';
import '../presentation/providers.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _studentIdController = TextEditingController();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  
  String? _selectedCollege;
  int? _selectedYearLevel;
  String? _selectedSex;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  final List<String> colleges = ['CCS', 'CED', 'CHS', 'CAS', 'CHE'];
  final List<int> yearLevels = [1, 2, 3, 4];
  final List<String> sexOptions = ['M', 'F', 'Other'];

  @override
  void dispose() {
    _studentIdController.dispose();
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _handleSignup() async {
    if (_formKey.currentState!.validate() &&
        _selectedCollege != null &&
        _selectedYearLevel != null &&
        _selectedSex != null) {
      ref.read(authProvider.notifier).signup(
        _studentIdController.text,
        _nameController.text,
        _emailController.text,
        _passwordController.text,
        _selectedCollege!,
        _selectedYearLevel!,
        _selectedSex!,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authProvider, (previous, next) {
      if (next.isAuthenticated) {
        context.go('/home');
      } else if (next.error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.error!),
            backgroundColor: AppColors.error,
          ),
        );
      }
    });

    final authState = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(StringConstants.signup),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Create your account',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.gray500,
                      ),
                ),
                const SizedBox(height: 24),
                CustomTextField(
                  label: StringConstants.studentId,
                  hint: 'e.g., STU001',
                  controller: _studentIdController,
                  prefixIcon: Icons.badge,
                  validator: (value) =>
                      Validators.validateStudentId(value),
                ),
                const SizedBox(height: 16),
                CustomTextField(
                  label: StringConstants.name,
                  hint: 'Enter your full name',
                  controller: _nameController,
                  prefixIcon: Icons.person,
                  validator: (value) =>
                      Validators.validateName(value),
                ),
                const SizedBox(height: 16),
                CustomTextField(
                  label: StringConstants.email,
                  hint: 'Enter your email',
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  prefixIcon: Icons.email,
                  validator: (value) =>
                      Validators.validateEmail(value),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: _selectedCollege,
                  decoration: InputDecoration(
                    labelText: StringConstants.college,
                    prefixIcon: const Icon(Icons.school),
                  ),
                  items: colleges
                      .map((college) => DropdownMenuItem(
                            value: college,
                            child: Text(college),
                          ))
                      .toList(),
                  onChanged: (value) {
                    setState(() {
                      _selectedCollege = value;
                    });
                  },
                  validator: (value) {
                    if (value == null) {
                      return 'Please select a college';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<int>(
                  initialValue: _selectedYearLevel,
                  decoration: InputDecoration(
                    labelText: StringConstants.yearLevel,
                    prefixIcon: const Icon(Icons.calendar_today),
                  ),
                  items: yearLevels
                      .map((year) => DropdownMenuItem(
                            value: year,
                            child: Text('Year $year'),
                          ))
                      .toList(),
                  onChanged: (value) {
                    setState(() {
                      _selectedYearLevel = value;
                    });
                  },
                  validator: (value) {
                    if (value == null) {
                      return 'Please select year level';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: _selectedSex,
                  decoration: InputDecoration(
                    labelText: StringConstants.sex,
                    prefixIcon: const Icon(Icons.wc),
                  ),
                  items: sexOptions
                      .map((sex) => DropdownMenuItem(
                            value: sex,
                            child: Text(sex),
                          ))
                      .toList(),
                  onChanged: (value) {
                    setState(() {
                      _selectedSex = value;
                    });
                  },
                  validator: (value) {
                    if (value == null) {
                      return 'Please select sex';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                CustomTextField(
                  label: StringConstants.password,
                  hint: 'At least 6 characters',
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  prefixIcon: Icons.lock,
                  suffixIcon: _obscurePassword
                      ? Icons.visibility_off
                      : Icons.visibility,
                  onSuffixIconPressed: () {
                    setState(() {
                      _obscurePassword = !_obscurePassword;
                    });
                  },
                  validator: (value) =>
                      Validators.validatePassword(value),
                ),
                const SizedBox(height: 16),
                CustomTextField(
                  label: StringConstants.confirmPassword,
                  hint: 'Confirm your password',
                  controller: _confirmPasswordController,
                  obscureText: _obscureConfirmPassword,
                  prefixIcon: Icons.lock,
                  suffixIcon: _obscureConfirmPassword
                      ? Icons.visibility_off
                      : Icons.visibility,
                  onSuffixIconPressed: () {
                    setState(() {
                      _obscureConfirmPassword = !_obscureConfirmPassword;
                    });
                  },
                  validator: (value) =>
                      Validators.validateConfirmPassword(
                        value,
                        _passwordController.text,
                      ),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: CustomButton(
                    text: StringConstants.signup,
                    onPressed: _handleSignup,
                    isLoading: authState.isLoading,
                    enabled: !authState.isLoading,
                    icon: Icons.person_add,
                  ),
                ),
                const SizedBox(height: 16),
                Center(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        StringConstants.alreadyHaveAccount,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      TextButton(
                        onPressed: () => context.pop(),
                        child: Text(StringConstants.login),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
