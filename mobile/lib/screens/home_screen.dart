import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/cart_badge_icon.dart';
import '../widgets/home_slider.dart';
import 'catalogue_screen.dart';
import 'fraicheur_screen.dart';
import 'cave_screen.dart';
import 'nouveautes_screen.dart';
import 'services_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PRIX IMPORT OWENDO'),
        actions: const [CartBadgeIcon(), SizedBox(width: 8)],
      ),
      drawer: const AppDrawer(current: 'home'),
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          // Carrousel (diapos réglables dans l'admin, onglet « Carrousel »)
          const HomeSlider(),
          Padding(
            padding: const EdgeInsets.all(20),
            child: GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 14,
              crossAxisSpacing: 14,
              childAspectRatio: 1.25,
              children: [
                _HighlightCard(
                  icon: Icons.storefront_outlined,
                  title: 'Catalogue',
                  subtitle: 'Tous nos produits',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const CatalogueScreen()),
                  ),
                ),
                _HighlightCard(
                  icon: Icons.eco_outlined,
                  title: 'Fraîcheur & local',
                  subtitle: 'Produits locaux',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const FraicheurScreen()),
                  ),
                ),
                _HighlightCard(
                  icon: Icons.wine_bar_outlined,
                  title: 'Cave à vin',
                  subtitle: 'Vins & spiritueux',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const CaveScreen()),
                  ),
                ),
                _HighlightCard(
                  icon: Icons.photo_library_outlined,
                  title: 'Nouveautés',
                  subtitle: 'Photos & vidéos',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                        builder: (_) => const NouveautesScreen()),
                  ),
                ),
                _HighlightCard(
                  icon: Icons.miscellaneous_services_outlined,
                  title: 'Services',
                  subtitle: 'Livraison, retrait...',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const ServicesScreen()),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HighlightCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _HighlightCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(AppTheme.radius),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: AppColors.green, size: 30),
              const SizedBox(height: 10),
              Text(title,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 15)),
              const SizedBox(height: 2),
              Text(subtitle,
                  style:
                      const TextStyle(fontSize: 12, color: AppColors.gray)),
            ],
          ),
        ),
      ),
    );
  }
}
