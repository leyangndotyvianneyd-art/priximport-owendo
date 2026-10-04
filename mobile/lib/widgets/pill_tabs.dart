import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Rangée de pastilles de filtre qui défile horizontalement ("Tous",
/// "Promotions", rayons...). La pastille choisie est cerclée de foncé.
class PillTabs extends StatelessWidget {
  final List<String> labels;
  final String selected;
  final ValueChanged<String> onSelected;

  /// Petite icône facultative devant certaines pastilles.
  final Map<String, IconData> icons;

  final EdgeInsetsGeometry padding;

  const PillTabs({
    super.key,
    required this.labels,
    required this.selected,
    required this.onSelected,
    this.icons = const {},
    this.padding = const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 54,
      child: ListView.separated(
        padding: padding,
        scrollDirection: Axis.horizontal,
        itemCount: labels.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final label = labels[i];
          final isOn = label == selected;
          final icon = icons[label];
          return Material(
            color: isOn ? Colors.white : const Color(0xFFF1F2F4),
            shape: StadiumBorder(
              side: BorderSide(
                color: isOn ? AppColors.ink : Colors.transparent,
                width: 1.4,
              ),
            ),
            child: InkWell(
              customBorder: const StadiumBorder(),
              onTap: () => onSelected(label),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (icon != null) ...[
                      Icon(icon, size: 16, color: AppColors.orange),
                      const SizedBox(width: 5),
                    ],
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 13.5,
                        color: AppColors.ink,
                        fontWeight: isOn ? FontWeight.w700 : FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
