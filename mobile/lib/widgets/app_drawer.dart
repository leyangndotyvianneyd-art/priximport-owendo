import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../screens/home_screen.dart';
import '../screens/catalogue_screen.dart';
import '../screens/fraicheur_screen.dart';
import '../screens/nouveautes_screen.dart';
import '../screens/services_screen.dart';
import '../screens/localisation_screen.dart';
import '../screens/contact_screen.dart';
import '../screens/settings_screen.dart';

/// Menu latéral commun à tous les écrans, reprenant la navigation du site
/// web (Accueil / Catalogue / Fraîcheur / Nouveautés / Services /
/// Localisation / Contact).
class AppDrawer extends StatelessWidget {
  final String current;

  const AppDrawer({super.key, required this.current});

  @override
  Widget build(BuildContext context) {
    Widget item(String label, IconData icon, Widget Function() builder, String key) {
      final selected = current == key;
      return ListTile(
        leading: Icon(icon, color: selected ? AppColors.orange : AppColors.green),
        title: Text(
          label,
          style: TextStyle(
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? AppColors.orange : AppColors.ink,
          ),
        ),
        selected: selected,
        onTap: () {
          Navigator.of(context).pop();
          if (!selected) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (_) => builder()),
            );
          }
        },
      );
    }

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(20, 56, 20, 20),
            color: AppColors.green,
            width: double.infinity,
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'PRIX IMPORT',
                  style: TextStyle(
                    color: AppColors.yellow,
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1,
                  ),
                ),
                Text(
                  'OWENDO',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 2,
                  ),
                ),
              ],
            ),
          ),
          item('Accueil', Icons.home_outlined, () => const HomeScreen(), 'home'),
          item('Catalogue', Icons.storefront_outlined, () => const CatalogueScreen(), 'catalogue'),
          item('Fraîcheur & local', Icons.eco_outlined, () => const FraicheurScreen(), 'fraicheur'),
          item('Nouveautés', Icons.photo_library_outlined, () => const NouveautesScreen(), 'nouveautes'),
          item('Services', Icons.miscellaneous_services_outlined, () => const ServicesScreen(), 'services'),
          item('Localisation', Icons.place_outlined, () => const LocalisationScreen(), 'localisation'),
          item('Contact', Icons.chat_outlined, () => const ContactScreen(), 'contact'),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.settings_outlined, color: AppColors.green),
            title: const Text('Réglages du serveur'),
            onTap: () {
              Navigator.of(context).pop();
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const SettingsScreen()),
              );
            },
          ),
        ],
      ),
    );
  }
}
