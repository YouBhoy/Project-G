import 'package:flutter/material.dart';
import 'package:spartan_g_mobile/core/constants/string_constants.dart';
import 'package:spartan_g_mobile/core/theme/app_colors.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool notificationsEnabled = true;
  String theme = 'light';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text(StringConstants.settings)),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Appearance Section
            _buildSectionHeader('Appearance'),
            Card(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Column(
                children: [
                  ListTile(
                    title: const Text(StringConstants.theme),
                    trailing: SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(
                          value: 'light',
                          label: Text(StringConstants.lightMode),
                        ),
                        ButtonSegment(
                          value: 'dark',
                          label: Text(StringConstants.darkMode),
                        ),
                      ],
                      selected: {theme},
                      onSelectionChanged: (Set<String> newSelection) {
                        setState(() {
                          theme = newSelection.first;
                        });
                      },
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            // Notifications Section
            _buildSectionHeader(StringConstants.notifications),
            Card(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: ListTile(
                title: const Text(StringConstants.notificationsEnabled),
                trailing: Switch(
                  value: notificationsEnabled,
                  onChanged: (value) {
                    setState(() {
                      notificationsEnabled = value;
                    });
                  },
                ),
              ),
            ),
            const SizedBox(height: 24),
            // Support Section
            _buildSectionHeader('Support & Info'),
            Card(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Column(
                children: [
                  ListTile(
                    title: const Text(StringConstants.help),
                    trailing: const Icon(Icons.help_outline),
                    onTap: () {
                      // Handle help
                    },
                  ),
                  const Divider(height: 1),
                  ListTile(
                    title: const Text(StringConstants.about),
                    trailing: const Icon(Icons.info_outline),
                    onTap: () {
                      _showAboutDialog(context);
                    },
                  ),
                  const Divider(height: 1),
                  ListTile(
                    title: const Text(StringConstants.termsOfService),
                    trailing: const Icon(Icons.open_in_new),
                    onTap: () {
                      // Handle terms
                    },
                  ),
                  const Divider(height: 1),
                  ListTile(
                    title: const Text(StringConstants.privacyPolicy),
                    trailing: const Icon(Icons.open_in_new),
                    onTap: () {
                      // Handle privacy
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            // Version Info
            Padding(
              padding: const EdgeInsets.all(16),
              child: Center(
                child: Column(
                  children: [
                    Text(
                      'SPARTAN-G',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Version 1.0.0',
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: AppColors.gray500),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppColors.primary,
              ),
        ),
      ),
    );
  }

  void _showAboutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('About SPARTAN-G'),
        content: const Text(
          'SPARTAN-G is a student mental health monitoring, assessment, and counseling referral system designed to support student wellbeing.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}
