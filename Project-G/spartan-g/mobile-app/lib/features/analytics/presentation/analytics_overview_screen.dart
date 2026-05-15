import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:spartan_g_mobile/core/constants/api_constants.dart';
import 'package:spartan_g_mobile/core/models/shared_models.dart';
import 'package:spartan_g_mobile/core/api/api_client.dart';
import 'package:spartan_g_mobile/core/theme/app_colors.dart';

class AnalyticsOverviewScreen extends ConsumerStatefulWidget {
  const AnalyticsOverviewScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<AnalyticsOverviewScreen> createState() => _AnalyticsOverviewScreenState();
}

class _AnalyticsOverviewScreenState extends ConsumerState<AnalyticsOverviewScreen> {
  DashboardDataModel? dashboard;
  bool loading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    setState(() {
      loading = true;
      error = null;
    });
    final api = ref.read(apiClientProvider);
    try {
      final resp = await api.get(ApiConstants.dashboardData);
      final data = resp['data'] ?? resp;
      setState(() {
        dashboard = DashboardDataModel.fromJson(data as Map<String, dynamic>);
      });
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Analytics Overview')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text('Error: $error'))
              : Padding(
                  padding: const EdgeInsets.all(16),
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Student: ${dashboard?.student.name ?? '-'}', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Risk Level: ${dashboard?.riskLevel ?? '-'}', style: Theme.of(context).textTheme.titleMedium),
                            ElevatedButton(
                              onPressed: _loadDashboard,
                              child: const Text('Refresh'),
                            )
                          ],
                        ),
                        const SizedBox(height: 12),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              const Text('Next Action', style: TextStyle(fontWeight: FontWeight.w600)),
                              const SizedBox(height: 6),
                              Text(_displayText(dashboard?.nextAction, fallback: 'Pending')),
                            ]),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text('Latest Classification', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        if (dashboard?.latestClassification != null)
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text('Risk: ${dashboard!.latestClassification!.riskLevel}', style: const TextStyle(fontWeight: FontWeight.w600)),
                                const SizedBox(height: 6),
                                Text('Trajectory: ${_displayText(dashboard!.latestClassification!.trajectory, fallback: 'Not yet classified')}'),
                                const SizedBox(height: 6),
                                Text('Meta Source: ${_displayText(dashboard!.latestClassification!.meta?.source, fallback: 'No data available')}'),
                                const SizedBox(height: 6),
                                Text('Generated: ${_displayDateTime(dashboard!.latestClassification!.generatedAt)}'),
                              ]),
                            ),
                          )
                        else
                          const Text('Not yet classified.'),
                        const SizedBox(height: 12),
                        Text('Mood & Energy Series', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        if ((dashboard?.moodSeries ?? []).isEmpty)
                          const Text('No data available.')
                        else
                          Column(
                            children: dashboard!.moodSeries.reversed.map((m) {
                              return Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  title: Text(_displayDateTime(m.promptTime)),
                                  subtitle: Text('Mood: ${m.moodScore}/10 · Energy: ${m.energyScore}/10'),
                                ),
                              );
                            }).toList(),
                          ),
                        const SizedBox(height: 20),
                        ElevatedButton(
                          onPressed: () {},
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                          child: const Text('View Detailed Analytics (OGC)'),
                        )
                      ],
                    ),
                  ),
                ),
    );
  }

  String _displayText(String? value, {required String fallback}) {
    final text = value?.trim();
    if (text == null || text.isEmpty || text.toLowerCase() == 'null') {
      return fallback;
    }
    return text;
  }

  String _displayDateTime(DateTime? value) {
    if (value == null) {
      return 'Pending';
    }
    return value.toLocal().toString().split('.').first;
  }
}
