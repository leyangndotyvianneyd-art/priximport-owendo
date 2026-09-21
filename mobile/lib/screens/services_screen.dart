import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/cart_badge_icon.dart';

class ServicesScreen extends StatelessWidget {
  const ServicesScreen({super.key});

  static const _services = [
    (
      Icons.storefront_outlined,
      'Retrait en magasin',
      'Commandez sur l\'appli, récupérez en caisse prioritaire sans faire '
          'la queue.',
    ),
    (
      Icons.delivery_dining_outlined,
      'Livraison à domicile',
      'Livraison à Owendo et environs, réglement à la remise.',
    ),
    (
      Icons.payments_outlined,
      'Paiement à la remise',
      'Espèces ou Mobile Money au moment de la livraison ou du retrait.',
    ),
    (
      Icons.support_agent_outlined,
      'Commande par WhatsApp',
      'Une question sur un produit, une commande spéciale ? Écrivez-nous '
          'directement sur WhatsApp.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Services'),
        actions: const [CartBadgeIcon(), SizedBox(width: 8)],
      ),
      drawer: const AppDrawer(current: 'services'),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('Nos services', style: Theme.of(context).textTheme.displayMedium),
          const SizedBox(height: 16),
          for (final s in _services)
            Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                contentPadding: const EdgeInsets.all(14),
                leading: CircleAvatar(
                  backgroundColor: AppColors.green,
                  child: Icon(s.$1, color: Colors.white, size: 20),
                ),
                title: Text(s.$2,
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(s.$3,
                      style: const TextStyle(
                          color: AppColors.gray, fontSize: 13)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
