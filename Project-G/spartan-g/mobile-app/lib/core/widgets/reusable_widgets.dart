import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class LoadingIndicator extends StatelessWidget {
  final String? message;
  final double? size;

  const LoadingIndicator({
    Key? key,
    this.message,
    this.size = 48,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: size,
            height: size,
            child: const CircularProgressIndicator(
              strokeWidth: 4,
              valueColor: AlwaysStoppedAnimation(AppColors.primary),
            ),
          ),
          if (message != null) ...[
            const SizedBox(height: 16),
            Text(
              message!,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ],
      ),
    );
  }
}

class ErrorWidget extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  final String? retryButtonText;

  const ErrorWidget({
    Key? key,
    required this.message,
    this.onRetry,
    this.retryButtonText,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: AppColors.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Oops!',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: Text(retryButtonText ?? 'Try Again'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class EmptyStateWidget extends StatelessWidget {
  final String title;
  final String? description;
  final IconData icon;
  final VoidCallback? onAction;
  final String? actionButtonText;

  const EmptyStateWidget({
    Key? key,
    required this.title,
    this.description,
    this.icon = Icons.inbox_outlined,
    this.onAction,
    this.actionButtonText,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 80,
              color: AppColors.gray300,
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            if (description != null) ...[
              const SizedBox(height: 8),
              Text(
                description!,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.gray500,
                    ),
                textAlign: TextAlign.center,
              ),
            ],
            if (onAction != null) ...[
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: onAction,
                icon: const Icon(Icons.add),
                label: Text(actionButtonText ?? 'Add New'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class CustomCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets? padding;
  final EdgeInsets? margin;
  final Color? backgroundColor;
  final double? elevation;

  const CustomCard({
    Key? key,
    required this.child,
    this.onTap,
    this.padding,
    this.margin,
    this.backgroundColor,
    this.elevation,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: elevation ?? 2,
      color: backgroundColor,
      margin: margin ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: padding ?? const EdgeInsets.all(16),
          child: child,
        ),
      ),
    );
  }
}

class CustomButton extends StatelessWidget {
  final String text;
  final VoidCallback onPressed;
  final bool isLoading;
  final bool enabled;
  final IconData? icon;
  final ButtonStyle? style;

  const CustomButton({
    Key? key,
    required this.text,
    required this.onPressed,
    this.isLoading = false,
    this.enabled = true,
    this.icon,
    this.style,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: enabled && !isLoading ? onPressed : null,
      icon: isLoading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation(Colors.white),
              ),
            )
          : (icon != null ? Icon(icon) : const SizedBox.shrink()),
      label: Text(text),
      style: style,
    );
  }
}

class CustomTextField extends StatelessWidget {
  final String label;
  final String? hint;
  final TextEditingController? controller;
  final TextInputType keyboardType;
  final bool obscureText;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;
  final IconData? prefixIcon;
  final IconData? suffixIcon;
  final VoidCallback? onSuffixIconPressed;
  final int? maxLines;
  final int? minLines;

  const CustomTextField({
    Key? key,
    required this.label,
    this.hint,
    this.controller,
    this.keyboardType = TextInputType.text,
    this.obscureText = false,
    this.validator,
    this.onChanged,
    this.prefixIcon,
    this.suffixIcon,
    this.onSuffixIconPressed,
    this.maxLines = 1,
    this.minLines,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: prefixIcon != null ? Icon(prefixIcon) : null,
        suffixIcon: suffixIcon != null
            ? IconButton(
                icon: Icon(suffixIcon),
                onPressed: onSuffixIconPressed,
              )
            : null,
      ),
      keyboardType: keyboardType,
      obscureText: obscureText,
      validator: validator,
      onChanged: onChanged,
      maxLines: obscureText ? 1 : maxLines,
      minLines: minLines,
    );
  }
}

class ProgressCard extends StatelessWidget {
  final String title;
  final int current;
  final int total;
  final double? height;

  const ProgressCard({
    Key? key,
    required this.title,
    required this.current,
    required this.total,
    this.height = 8,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final percentage = (current / total) * 100;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Text(
                '$current/$total',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: current / total,
              minHeight: height,
              backgroundColor: AppColors.gray200,
              valueColor: AlwaysStoppedAnimation(
                percentage < 50
                    ? AppColors.riskHigh
                    : percentage < 75
                        ? AppColors.riskModerate
                        : AppColors.riskLow,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class RiskLevelBadge extends StatelessWidget {
  final String riskLevel;
  final double? fontSize;

  const RiskLevelBadge({
    Key? key,
    required this.riskLevel,
    this.fontSize,
  }) : super(key: key);

  Color _getRiskColor() {
    switch (riskLevel.toLowerCase()) {
      case 'low':
        return AppColors.riskLow;
      case 'moderate':
        return AppColors.riskModerate;
      case 'high':
        return AppColors.riskHigh;
      case 'crisis':
        return AppColors.riskCrisis;
      default:
        return AppColors.gray400;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: _getRiskColor().withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: _getRiskColor(),
          width: 1.5,
        ),
      ),
      child: Text(
        riskLevel,
        style: TextStyle(
          color: _getRiskColor(),
          fontWeight: FontWeight.w600,
          fontSize: fontSize ?? 12,
        ),
      ),
    );
  }
}
