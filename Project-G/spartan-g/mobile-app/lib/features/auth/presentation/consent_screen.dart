import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:spartan_g_mobile/core/api/api_client.dart';
import 'package:spartan_g_mobile/core/theme/app_colors.dart';
import 'providers.dart';

class ConsentScreen extends ConsumerStatefulWidget {
  const ConsentScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends ConsumerState<ConsentScreen> {
  bool _agree = false;
  bool _loading = false;

  Future<void> _submitConsent() async {
    if (!_agree || _loading) return;

    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final resp = await api.post(
        '/student/profile/consent',
        data: {'consent': true},
      );

      final success = resp is Map && resp['success'] == true;
      if (!success) {
        throw Exception('Unable to save consent.');
      }

      await ref.read(authProvider.notifier).checkAuthStatus();
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error saving consent: $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _declineConsent() {
    Navigator.of(context).pop(false);
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final student = authState.data;
    final consentGranted = student?.consentFlag ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Digital Informed Consent'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Card(
                elevation: 0,
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 52,
                            height: 52,
                            decoration: BoxDecoration(
                              gradient: AppColors.primaryGradient,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Icon(Icons.shield_outlined, color: Colors.white),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Review the consent notice',
                                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'Consent is required before you can open mental health assessments or ESM check-ins.',
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          Chip(
                            avatar: const Icon(Icons.verified_user_outlined, size: 18),
                            label: Text(consentGranted ? 'Already consented' : 'Consent pending'),
                          ),
                          Chip(
                            avatar: const Icon(Icons.phone_android_outlined, size: 18),
                            label: const Text('Mobile-friendly'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              _ConsentSectionCard(
                title: 'Purpose of data collection',
                icon: Icons.info_outline,
                children: const [
                  Text('Responses from DASS-21, PHQ-9, GAD-7, and ESM check-ins are collected to monitor wellbeing, support referrals, and improve student mental health services.'),
                ],
              ),
              const SizedBox(height: 16),
              _ConsentSectionCard(
                title: 'What is collected',
                icon: Icons.data_usage_outlined,
                children: const [
                  Text('Assessment responses, timestamps, student identifiers, and derived risk or wellness scores may be processed by the system.'),
                ],
              ),
              const SizedBox(height: 16),
              _ConsentSectionCard(
                title: 'How it is used',
                icon: Icons.privacy_tip_outlined,
                children: const [
                  Text('Data is used only for the stated assessment and support purposes, with access limited to authorized personnel when necessary.'),
                ],
              ),
              const SizedBox(height: 16),
              _ConsentSectionCard(
                title: 'Your choices',
                icon: Icons.gavel_outlined,
                children: const [
                  Text('Consent is voluntary, but declining keeps all assessment modules locked until consent is provided.'),
                ],
              ),
              const SizedBox(height: 16),
              _ConsentSectionCard(
                title: 'Contact and policy reference',
                icon: Icons.contact_support_outlined,
                children: const [
                  Text('For privacy concerns, contact the university data protection office or the National Privacy Commission.'),
                ],
              ),
              const SizedBox(height: 20),
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Checkbox(
                            value: _agree,
                            onChanged: _loading ? null : (value) => setState(() => _agree = value ?? false),
                          ),
                          const Expanded(
                            child: Text(
                              'I have read the consent notice and voluntarily agree to the collection and processing of my data as described above.',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'If you decline, the app will keep the assessment modules locked and you will be returned to the locked state.',
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: !_agree || _loading ? null : _submitConsent,
                          child: _loading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white)),
                                )
                              : const Text('I Consent'),
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: _loading ? null : _declineConsent,
                          child: const Text('Decline and keep modules locked'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ConsentSectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;

  const _ConsentSectionCard({
    required this.title,
    required this.icon,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}
