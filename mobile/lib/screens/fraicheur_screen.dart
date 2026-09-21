import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/cart_badge_icon.dart';

class FraicheurScreen extends StatelessWidget {
  const FraicheurScreen({super.key});

  static const _items = [
    (
      'Producteurs locaux',
      'Fruits et légumes livrés directement par nos producteurs partenaires '
          "d'Owendo et des environs, plusieurs fois par semaine.",
      Icons.agriculture_outlined,
    ),
    (
      'Fraîcheur garantie',
      'Rotation quotidienne des rayons frais : ce que vous trouvez en rayon '
          'est arrivé dans la journée ou la veille.',
      Icons.eco_outlined,
    ),
    (
      'Prix justes',
      "Des prix compétitifs toute l'année, sans marge excessive sur les "
          'produits de première nécessité.',
      Icons.sell_outlined,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Fraîcheur & local'),
        actions: const [CartBadgeIcon(), SizedBox(width: 8)],
      ),
      drawer: const AppDrawer(current: 'fraicheur'),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            "Le meilleur du frais, made in Owendo",
            style: Theme.of(context).textTheme.displayMedium,
          ),
          const SizedBox(height: 8),
          const Text(
            "Nous travaillons directement avec des producteurs locaux pour "
            "vous garantir des produits frais, de qualité, à prix juste.",
            style: TextStyle(color: AppColors.gray),
          ),
          const SizedBox(height: 20),
          for (final item in _items)
            Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(item.$3, color: AppColors.green, size: 28),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.$1,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700, fontSize: 15)),
                          const SizedBox(height: 4),
                          Text(item.$2,
                              style: const TextStyle(
                                  color: AppColors.gray, fontSize: 13)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
