import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/cart_badge_icon.dart';
import 'localisation_screen.dart' show shopPhoneTel;

class ContactScreen extends StatelessWidget {
  const ContactScreen({super.key});

  Future<void> _openWhatsApp() async {
    final phone = shopPhoneTel.replaceAll('+', '').replaceAll(' ', '');
    final uri = Uri.parse(
        'https://wa.me/$phone?text=${Uri.encodeComponent("Bonjour, j'ai une question.")}');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Contact'),
        actions: const [CartBadgeIcon(), SizedBox(width: 8)],
      ),
      drawer: const AppDrawer(current: 'contact'),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('Nous écrire', style: Theme.of(context).textTheme.displayMedium),
          const SizedBox(height: 8),
          const Text(
            "Une question sur un produit, une commande, un partenariat ? "
            "Le moyen le plus rapide de nous joindre reste WhatsApp.",
            style: TextStyle(color: AppColors.gray),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.chat),
              label: const Text('Discuter sur WhatsApp'),
              onPressed: _openWhatsApp,
            ),
          ),
        ],
      ),
    );
  }
}
