import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/cart_badge_icon.dart';

/// Coordonnées du magasin — mêmes informations que pages/localisation.html
/// côté site web.
const String shopAddress = 'Owendo, Libreville, Gabon';
const String shopPhoneDisplay = '+241 07 41 32 15';
const String shopPhoneTel = '+24107413215';

class LocalisationScreen extends StatelessWidget {
  const LocalisationScreen({super.key});

  Future<void> _openMaps() async {
    final query = Uri.encodeComponent('Prix Import Owendo, $shopAddress');
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$query');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _call() async {
    final uri = Uri(scheme: 'tel', path: shopPhoneTel);
    await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Localisation'),
        actions: const [CartBadgeIcon(), SizedBox(width: 8)],
      ),
      drawer: const AppDrawer(current: 'localisation'),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Card(
            child: InkWell(
              borderRadius: BorderRadius.circular(AppTheme.radius),
              onTap: _openMaps,
              child: Container(
                height: 160,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.grayLight,
                  borderRadius: BorderRadius.circular(AppTheme.radius),
                ),
                child: const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.map_outlined, size: 40, color: AppColors.green),
                    SizedBox(height: 8),
                    Text('Ouvrir dans Google Maps',
                        style: TextStyle(
                            color: AppColors.green,
                            fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _infoLine(Icons.place_outlined, shopAddress),
                  const SizedBox(height: 12),
                  _infoLine(Icons.phone_outlined, shopPhoneDisplay, onTap: _call),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Horaires', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 10),
                  _hoursRow('Lundi – Samedi', '7h30 – 20h00'),
                  _hoursRow('Dimanche', '8h00 – 13h00'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoLine(IconData icon, String text, {VoidCallback? onTap}) {
    return InkWell(
      onTap: onTap,
      child: Row(
        children: [
          Icon(icon, color: AppColors.green, size: 20),
          const SizedBox(width: 10),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }

  Widget _hoursRow(String day, String hours) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(day, style: const TextStyle(color: AppColors.gray)),
          Text(hours, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
