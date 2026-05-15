import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'providers.dart';

class ConsentGate extends ConsumerStatefulWidget {
  final Widget child;
  final String title;
  final String consentPurposeLabel;

  const ConsentGate({
    Key? key,
    required this.child,
    required this.title,
    required this.consentPurposeLabel,
  }) : super(key: key);

  @override
  ConsumerState<ConsentGate> createState() => _ConsentGateState();
}

class _ConsentGateState extends ConsumerState<ConsentGate> {
  bool _checkingConsent = true;
  bool _promptedForConsent = false;

  @override
  void initState() {
    super.initState();
    _verifyConsent(promptIfNeeded: true);
  }

  Future<void> _verifyConsent({required bool promptIfNeeded}) async {
    if (mounted) {
      setState(() {
        _checkingConsent = true;
      });
    }

    await ref.read(authProvider.notifier).checkAuthStatus();
    if (!mounted) return;

    final consentGranted = ref.read(authProvider).data?.consentFlag ?? false;

    if (!consentGranted && promptIfNeeded && !_promptedForConsent) {
      _promptedForConsent = true;
      if (mounted) {
        setState(() {
          _checkingConsent = false;
        });
      }

      final accepted = await context.push<bool>('/consent');
      if (!mounted) return;

      if (accepted == true) {
        await ref.read(authProvider.notifier).checkAuthStatus();
      }
    }

    if (!mounted) return;
    setState(() {
      _checkingConsent = false;
    });
  }

  Future<void> _openConsentScreen() async {
    final accepted = await context.push<bool>('/consent');
    if (!mounted) return;

    if (accepted == true) {
      await ref.read(authProvider.notifier).checkAuthStatus();
    }

    if (!mounted) return;
    setState(() {
      _checkingConsent = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final consentGranted = authState.data?.consentFlag ?? false;

    if (_checkingConsent) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.title)),
        body: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Checking consent status...'),
            ],
          ),
        ),
      );
    }

    if (consentGranted) {
      return widget.child;
    }

    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
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
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Icon(
                              Icons.lock_outline,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Consent required',
                                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Access to ${widget.consentPurposeLabel} is locked until you complete the consent flow.',
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Your current status is fetched from the server before every access attempt.',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          Chip(
                            avatar: const Icon(Icons.verified_user_outlined, size: 18),
                            label: Text(consentGranted ? 'Consented' : 'Not consented'),
                          ),
                          Chip(
                            avatar: const Icon(Icons.sync_outlined, size: 18),
                            label: const Text('Backend synced'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
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
                      Text(
                        'Why this is required',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Mental health assessments and ESM check-ins collect sensitive data. Consent must be accepted before the app allows access to any of these modules.',
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'If you decline, these modules stay locked until you come back and accept the consent notice.',
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _openConsentScreen,
                  icon: const Icon(Icons.description_outlined),
                  label: const Text('Review consent notice'),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => context.go('/home'),
                  child: const Text('Back to dashboard'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}