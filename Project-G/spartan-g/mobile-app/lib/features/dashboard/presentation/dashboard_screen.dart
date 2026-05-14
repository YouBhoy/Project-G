import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:spartan_g_mobile/core/constants/string_constants.dart';
import 'package:spartan_g_mobile/core/theme/app_colors.dart';
import 'package:spartan_g_mobile/core/widgets/reusable_widgets.dart';
import '../../auth/presentation/providers.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final student = authState.data;

    return Scaffold(
      appBar: AppBar(
        title: const Text('SPARTAN-G'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) {
                context.go('/login');
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: IndexedStack(
        index: _selectedIndex,
        children: [
          _buildHomeTab(student),
          _buildAssessmentsTab(),
          _buildCheckInsTab(),
          _buildAppointmentsTab(),
          _buildProfileTab(student),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: StringConstants.home_tab,
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.quiz),
            label: StringConstants.assessments_tab,
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.check_circle),
            label: StringConstants.checkIns_tab,
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.calendar_today),
            label: StringConstants.appointments_tab,
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: StringConstants.profile_tab,
          ),
        ],
      ),
    );
  }

  Widget _buildHomeTab(dynamic student) {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome Card
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Container(
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      StringConstants.welcomeBack,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.white70,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      student?.name ?? 'Student',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: Colors.white,
                          ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            // Risk Level Section
            Text(
              StringConstants.riskLevel,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const RiskLevelBadge(riskLevel: 'Moderate'),
                TextButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.info_outline),
                  label: const Text('Details'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            // Latest Assessment
            Text(
              StringConstants.latestAssessment,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            _buildAssessmentCard(
              'DASS-21',
              'Completed 2 days ago',
              'Depression: 22, Anxiety: 18, Stress: 24',
            ),
            const SizedBox(height: 24),
            // Next Action
            Text(
              StringConstants.nextAction,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Schedule Appointment',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Based on your assessment, we recommend scheduling an appointment with a counselor.',
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: () => context.push('/appointments'),
                      child: const Text('Book Now'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            // Recent Check-ins
            Text(
              StringConstants.recentEntries,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            _buildCheckInCard('Today, 10:30 AM', 'Mood: 6/10, Energy: 5/10'),
            _buildCheckInCard('Yesterday, 3:45 PM', 'Mood: 7/10, Energy: 6/10'),
          ],
        ),
      ),
    );
  }

  Widget _buildAssessmentsTab() {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              StringConstants.assessments,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 24),
            _buildAssessmentButton(
              'DASS-21',
              'Depression, Anxiety, Stress Scale',
              Icons.sentiment_very_dissatisfied,
              () => context.push('/assessments'),
            ),
            const SizedBox(height: 16),
            _buildAssessmentButton(
              'PHQ-9',
              'Patient Health Questionnaire',
              Icons.health_and_safety,
              () => context.push('/assessments'),
            ),
            const SizedBox(height: 16),
            _buildAssessmentButton(
              'GAD-7',
              'Generalized Anxiety Disorder Scale',
              Icons.sentiment_dissatisfied,
              () => context.push('/assessments'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCheckInsTab() {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  StringConstants.checkIns,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                ElevatedButton.icon(
                  onPressed: () => context.push('/esm'),
                  icon: const Icon(Icons.add),
                  label: const Text('New'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            _buildCheckInCard('Today, 10:30 AM', 'Mood: 6/10, Energy: 5/10'),
            _buildCheckInCard('Yesterday, 3:45 PM', 'Mood: 7/10, Energy: 6/10'),
            _buildCheckInCard('2 days ago, 2:15 PM', 'Mood: 5/10, Energy: 4/10'),
          ],
        ),
      ),
    );
  }

  Widget _buildAppointmentsTab() {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  StringConstants.appointments,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                ElevatedButton.icon(
                  onPressed: () => context.push('/appointments'),
                  icon: const Icon(Icons.add),
                  label: const Text('Book'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            _buildAppointmentCard(
              'Dr. Maria Santos',
              'Monday, May 15, 2:00 PM',
              'Scheduled',
            ),
            _buildAppointmentCard(
              'Dr. Juan Dela Cruz',
              'Friday, May 12, 10:00 AM',
              'Completed',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileTab(dynamic student) {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              StringConstants.profile,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildProfileRow('Student ID', student?.studentId ?? '-'),
                    _buildProfileRow('Name', student?.name ?? '-'),
                    _buildProfileRow('Email', student?.email ?? '-'),
                    _buildProfileRow('College', student?.college ?? '-'),
                    _buildProfileRow('Year Level', student?.yearLevel.toString() ?? '-'),
                    _buildProfileRow('Sex', student?.sex ?? '-'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => context.push('/settings'),
                icon: const Icon(Icons.settings),
                label: const Text(StringConstants.settings),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.gray500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAssessmentCard(String title, String date, String scores) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              date,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            Text(scores),
          ],
        ),
      ),
    );
  }

  Widget _buildCheckInCard(String time, String data) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              time,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 8),
            Text(data),
          ],
        ),
      ),
    );
  }

  Widget _buildAssessmentButton(
    String title,
    String description,
    IconData icon,
    VoidCallback onTap,
  ) {
    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(icon, size: 40, color: AppColors.primary),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward, color: AppColors.gray400),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAppointmentCard(String counselor, String time, String status) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  counselor,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                Text(time),
              ],
            ),
            RiskLevelBadge(riskLevel: status),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.gray600)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
