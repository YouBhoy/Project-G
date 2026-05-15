import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:spartan_g_mobile/core/constants/string_constants.dart';
import 'package:spartan_g_mobile/core/constants/api_constants.dart';
import 'package:spartan_g_mobile/core/models/shared_models.dart';
import 'package:spartan_g_mobile/core/theme/app_colors.dart';
import 'package:spartan_g_mobile/core/widgets/reusable_widgets.dart';
import 'package:spartan_g_mobile/core/api/api_client.dart';

class ESMScreen extends ConsumerStatefulWidget {
  const ESMScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<ESMScreen> createState() => _ESMScreenState();
}

class _ESMScreenState extends ConsumerState<ESMScreen> {
  int moodScore = 5;
  int energyScore = 5;
  String? selectedStressor;
  bool hasPhysicalSymptoms = false;
  bool needsHelp = false;
  bool isSubmitting = false;

  final stressors = [
    'Academics',
    'Social',
    'Family',
    'Health',
    'Financial',
    'Other'
  ];

  Future<void> _handleSubmit() async {
    setState(() => isSubmitting = true);
    final api = ref.read(apiClientProvider);
    final payload = ESMSubmitRequestModel(
      moodScore: moodScore,
      energyScore: energyScore,
      stressorCategory: selectedStressor ?? 'Other',
      physicalSymptom: hasPhysicalSymptoms,
      helpIntent: needsHelp,
    );

    try {
      final resp = await api.post(
        ApiConstants.esmSubmit,
        data: payload.toJson(),
      );

      // Backend returns { success: true, data: { trajectory, generatedNotification } }
      final data = resp['data'] ?? resp;
      final trajectory = data['trajectory'];
      final generatedNotification = data['generatedNotification'] == true;

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(generatedNotification
              ? 'Check-in submitted — facilitator notified.'
              : 'Check-in submitted successfully.'),
          backgroundColor: AppColors.success,
        ),
      );

      _resetForm();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to submit check-in: $e')),
      );
    } finally {
      if (mounted) setState(() => isSubmitting = false);
    }
  }

  void _resetForm() {
    setState(() {
      moodScore = 5;
      energyScore = 5;
      selectedStressor = null;
      hasPhysicalSymptoms = false;
      needsHelp = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text(StringConstants.esm)),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                StringConstants.howAreYouFeeling,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 24),
              // Mood Slider
              _buildSliderSection(
                StringConstants.moodScore,
                moodScore,
                (value) => setState(() => moodScore = value.toInt()),
              ),
              const SizedBox(height: 24),
              // Energy Slider
              _buildSliderSection(
                StringConstants.energyScore,
                energyScore,
                (value) => setState(() => energyScore = value.toInt()),
              ),
              const SizedBox(height: 24),
              // Stressor Dropdown
              Text(
                StringConstants.stressor,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: selectedStressor,
                decoration: InputDecoration(
                  labelText: StringConstants.stressor,
                  prefixIcon: const Icon(Icons.psychology),
                ),
                items: stressors
                    .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                    .toList(),
                onChanged: (value) =>
                    setState(() => selectedStressor = value),
              ),
              const SizedBox(height: 24),
              // Checkboxes
              _buildCheckboxRow(
                StringConstants.physicalSymptoms,
                hasPhysicalSymptoms,
                (value) =>
                    setState(() => hasPhysicalSymptoms = value ?? false),
              ),
              const SizedBox(height: 16),
              _buildCheckboxRow(
                StringConstants.needHelp,
                needsHelp,
                (value) => setState(() => needsHelp = value ?? false),
              ),
              const SizedBox(height: 32),
              // Submit Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: isSubmitting ? null : _handleSubmit,
                  icon: isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor:
                                AlwaysStoppedAnimation(Colors.white),
                          ),
                        )
                      : const Icon(Icons.send),
                  label: Text(
                    isSubmitting ? 'Submitting...' : StringConstants.submit,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSliderSection(
    String label,
    int value,
    Function(double) onChanged,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: Theme.of(context).textTheme.titleMedium),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primaryLight.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '$value/10',
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Slider(
          value: value.toDouble(),
          min: 0,
          max: 10,
          divisions: 10,
          label: '$value',
          onChanged: onChanged,
        ),
      ],
    );
  }

  Widget _buildCheckboxRow(
    String label,
    bool value,
    Function(bool?)? onChanged,
  ) {
    return Row(
      children: [
        Checkbox(
          value: value,
          onChanged: onChanged,
          activeColor: AppColors.primary,
        ),
        const SizedBox(width: 8),
        Expanded(child: Text(label)),
      ],
    );
  }
}
