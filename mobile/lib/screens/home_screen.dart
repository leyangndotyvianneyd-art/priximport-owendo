import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/cart_badge_icon.dart';
import 'catalogue_screen.dart';
import 'fraicheur_screen.dart';
import 'nouveautes_screen.dart';
import 'services_screen.dart';
import 'localisation_screen.dart';

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
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(24, 40, 24, 40),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.green, AppColors.greenDark],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Vos courses,\nau meilleur prix.',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 30,
                    fontWeight: FontWeight.w900,
                    height: 1.15,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Le supermarché de référence à Owendo : épicerie, produits '
                  'frais et locaux, à retirer en magasin ou livrés chez vous.',
                  style: TextStyle(color: Colors.white70, fontSize: 14.5),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    ElevatedButton(
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute(
                            builder: (_) => const CatalogueScreen()),
                      ),
                      child: const Text('Voir le catalogue'),
                    ),
                    const SizedBox(width: 10),
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white70),
                      ),
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute(
                            builder: (_) => const LocalisationScreen()),
                      ),
                      child: const Text('Nous trouver'),
                    ),
                  ],
                ),
              ],
            ),
          ),
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
