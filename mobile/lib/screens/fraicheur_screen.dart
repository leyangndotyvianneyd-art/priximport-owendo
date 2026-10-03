import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/cart_badge_icon.dart';
import '../widgets/content_builder.dart';

/// Page Fraîcheur & local — cartes et note gérées depuis l'admin
/// (onglet "Contenu du site"), comme pages/fraicheur.html.
class FraicheurScreen extends StatelessWidget {
  const FraicheurScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Fraîcheur & local'),
        actions: const [CartBadgeIcon(), SizedBox(width: 8)],
      ),
      drawer: const AppDrawer(current: 'fraicheur'),
      body: ContentBuilder(
        builder: (context, content) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              'Le meilleur du frais, made in Owendo',
              style: Theme.of(context).textTheme.displayMedium,
            ),
            const SizedBox(height: 20),
            for (final card in content.fraicheurCards)
              Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(card.iconData, color: AppColors.green, size: 28),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(card.title,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700, fontSize: 15)),
                            if (card.text.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(card.text,
                                  style: const TextStyle(
                                      color: AppColors.gray, fontSize: 13)),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            if (content.freshNote.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.yellow.withValues(alpha: 0.25),
                  borderRadius: BorderRadius.circular(AppTheme.radius),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.info_outline, color: AppColors.green, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(content.freshNote,
                          style: const TextStyle(fontSize: 13)),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
