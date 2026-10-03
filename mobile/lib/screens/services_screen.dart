import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/cart_badge_icon.dart';
import '../widgets/content_builder.dart';

/// Page Services — cartes gérées depuis l'admin (onglet "Contenu du site"),
/// comme pages/services.html.
class ServicesScreen extends StatelessWidget {
  const ServicesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Services'),
        actions: const [CartBadgeIcon(), SizedBox(width: 8)],
      ),
      drawer: const AppDrawer(current: 'services'),
      body: ContentBuilder(
        builder: (context, content) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            Text('Nos services', style: Theme.of(context).textTheme.displayMedium),
            const SizedBox(height: 16),
            for (final s in content.servicesCards)
              Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  contentPadding: const EdgeInsets.all(14),
                  leading: CircleAvatar(
                    backgroundColor: AppColors.green,
                    child: Icon(s.iconData, color: Colors.white, size: 20),
                  ),
                  title: Text(s.title,
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: s.text.isEmpty
                      ? null
                      : Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(s.text,
                              style: const TextStyle(
                                  color: AppColors.gray, fontSize: 13)),
                        ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
