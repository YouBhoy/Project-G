import 'package:flutter/material.dart';
import 'package:spartan_g_mobile/core/constants/string_constants.dart';
import 'package:spartan_g_mobile/core/theme/app_colors.dart';
import 'package:spartan_g_mobile/core/widgets/reusable_widgets.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({Key? key}) : super(key: key);

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _simulateLoad();
  }

  void _simulateLoad() {
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() => isLoading = false);
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(StringConstants.appointments),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: StringConstants.availableSlots),
            Tab(text: StringConstants.myAppointments),
          ],
        ),
      ),
      body: isLoading
          ? const LoadingIndicator(message: 'Loading appointments...')
          : TabBarView(
              controller: _tabController,
              children: [
                _buildAvailableSlotsTab(),
                _buildMyAppointmentsTab(),
              ],
            ),
    );
  }

  Widget _buildAvailableSlotsTab() {
    final slots = [
      {
        'counselor': 'Dr. Maria Santos',
        'date': 'Monday, May 15',
        'time': '2:00 PM - 3:00 PM',
      },
      {
        'counselor': 'Dr. Juan Dela Cruz',
        'date': 'Tuesday, May 16',
        'time': '10:00 AM - 11:00 AM',
      },
      {
        'counselor': 'Ms. Rosa Garcia',
        'date': 'Wednesday, May 17',
        'time': '3:00 PM - 4:00 PM',
      },
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: slots.length,
      itemBuilder: (context, index) {
        final slot = slots[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            slot['counselor'] ?? '',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            slot['date'] ?? '',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            slot['time'] ?? '',
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'Appointment booked with ${slot['counselor']}',
                            ),
                            backgroundColor: AppColors.success,
                          ),
                        );
                      },
                      child: const Text(StringConstants.book),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMyAppointmentsTab() {
    final appointments = [
      {
        'counselor': 'Dr. Maria Santos',
        'date': 'Monday, May 15',
        'time': '2:00 PM',
        'status': 'Scheduled',
      },
      {
        'counselor': 'Dr. Juan Dela Cruz',
        'date': 'Friday, May 12',
        'time': '10:00 AM',
        'status': 'Completed',
      },
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: appointments.length,
      itemBuilder: (context, index) {
        final apt = appointments[index];
        final isCompleted = apt['status'] == 'Completed';

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          color: isCompleted
              ? AppColors.gray100
              : Theme.of(context).cardColor,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            apt['counselor'] ?? '',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${apt['date']}, ${apt['time']}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    RiskLevelBadge(riskLevel: apt['status'] ?? ''),
                  ],
                ),
                if (!isCompleted) ...[
                  const SizedBox(height: 12),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.error,
                    ),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: const Text('Appointment cancelled'),
                          backgroundColor: AppColors.warning,
                        ),
                      );
                    },
                    child: const Text(StringConstants.cancel),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}
