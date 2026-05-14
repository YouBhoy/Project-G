import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:spartan_g_mobile/core/constants/string_constants.dart';
import 'package:spartan_g_mobile/core/theme/app_colors.dart';

class AssessmentSelectionScreen extends StatelessWidget {
  const AssessmentSelectionScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text(StringConstants.assessments)),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Select an Assessment',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 24),
              _buildAssessmentCard(
                context,
                'DASS-21',
                'Depression, Anxiety, and Stress Scale',
                '21 questions • 5-10 minutes',
                Icons.sentiment_very_dissatisfied_outlined,
                () => context.push('/assessments/dass21'),
              ),
              const SizedBox(height: 16),
              _buildAssessmentCard(
                context,
                'PHQ-9',
                'Patient Health Questionnaire',
                '9 questions • 3-5 minutes',
                Icons.health_and_safety_outlined,
                () => context.push('/assessments/phq9'),
              ),
              const SizedBox(height: 16),
              _buildAssessmentCard(
                context,
                'GAD-7',
                'Generalized Anxiety Disorder Scale',
                '7 questions • 3-5 minutes',
                Icons.sentiment_dissatisfied,
                () => context.push('/assessments/gad7'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAssessmentCard(
    BuildContext context,
    String title,
    String description,
    String info,
    IconData icon,
    VoidCallback onTap,
  ) {
    return Card(
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: Colors.white, size: 32),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      info,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.gray500,
                          ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios, size: 16),
            ],
          ),
        ),
      ),
    );
  }
}
