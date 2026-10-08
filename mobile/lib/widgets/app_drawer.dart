import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../screens/main_shell.dart';
import '../screens/fraicheur_screen.dart';
import '../models/rayon.dart';
import '../screens/rayon_screen.dart';
import '../screens/nouveautes_screen.dart';
import '../screens/services_screen.dart';
import '../screens/localisation_screen.dart';
import '../screens/settings_screen.dart';

/// Menu latéral commun à tous les écrans, reprenant la navigation du site
/// web (Accueil / Catalogue / Fraîcheur / Cave à vin / Nouveautés / Services /
/// Localisation / Contact).
class AppDrawer extends StatelessWidget {
  final String current;

  const AppDrawer({super.key, required this.current});

  @override
  Widget build(BuildContext context) {
    // Accueil, Catalogue et Contact sont des onglets de la barre du bas ;
    // les autres rubriques s'ouvrent par-dessus l'écran principal.
    Widget tab(String label, IconData icon, int index, String key) =>
        _tile(context, label, icon, key, () => openShellTab(context, index));

    Widget item(String label, IconData icon, Widget Function() builder,
            String key) =>
        _tile(context, label, icon, key, () {
          final nav = Navigator.of(context);
          nav.popUntil((route) => route.isFirst);
          nav.push(MaterialPageRoute(builder: (_) => builder()));
        });

    return _buildDrawer(context, tab, item);
  }

  Widget _tile(BuildContext context, String label, IconData icon, String key,
      VoidCallback open) {
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
        if (!selected) open();
      },
    );
  }

  Widget _buildDrawer(
    BuildContext context,
    Widget Function(String, IconData, int, String) tab,
    Widget Function(String, IconData, Widget Function(), String) item,
  ) {
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
          tab('Accueil', Icons.home_outlined, ShellTabs.home, 'home'),
          tab('Catalogue', Icons.storefront_outlined, ShellTabs.catalogue,
              'catalogue'),
          item('Fraîcheur & local', Icons.eco_outlined,
              () => const FraicheurScreen(), 'fraicheur'),
          for (final r in Rayons.all)
            item(r.shortTitle, r.icon, () => RayonScreen(rayon: r), r.slug),
          item('Nouveautés', Icons.photo_library_outlined,
              () => const NouveautesScreen(), 'nouveautes'),
          item('Services', Icons.miscellaneous_services_outlined,
              () => const ServicesScreen(), 'services'),
          item('Localisation', Icons.place_outlined,
              () => const LocalisationScreen(), 'localisation'),
          tab('Contact', Icons.chat_outlined, ShellTabs.contact, 'contact'),
          const Divider(height: 1),
          if (!ApiConfig.isPublicBuild)
            ListTile(
              leading:
                  const Icon(Icons.settings_outlined, color: AppColors.green),
              title: const Text('Réglages du serveur'),
              onTap: () {
                Navigator.of(context).pop();
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const SettingsScreen()),
                );
              },
            ),
          // Permet de vérifier d'un coup d'œil quelle version est installée.
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text('Version $appVersion',
                style: TextStyle(color: AppColors.gray, fontSize: 12)),
          ),
        ],
      ),
    );
  }
}

/// À garder identique au champ "version" de pubspec.yaml.
const appVersion = '1.9.0';
