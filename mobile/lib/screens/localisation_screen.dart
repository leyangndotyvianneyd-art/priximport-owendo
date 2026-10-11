import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/site_content.dart';
import '../theme/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/cart_badge_icon.dart';
import '../widgets/content_builder.dart';
import '../config/store_info.dart';

/// Coordonnées et horaires du magasin — gérés depuis l'admin (onglet
/// "Contenu du site"), comme pages/localisation.html.
class LocalisationScreen extends StatelessWidget {
  const LocalisationScreen({super.key});

  Future<void> _openMaps(String address) async {
    final query = Uri.encodeComponent('${StoreConfig.current.name}, $address');
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$query');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _call(String tel) async {
    await launchUrl(Uri(scheme: 'tel', path: tel));
  }

  Future<void> _mail(String email) async {
    await launchUrl(Uri(scheme: 'mailto', path: email));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Localisation'),
        actions: const [CartBadgeIcon(), SizedBox(width: 8)],
      ),
      drawer: const AppDrawer(current: 'localisation'),
      body: ContentBuilder(builder: (context, c) => _body(context, c)),
    );
  }

  Widget _body(BuildContext context, SiteContent c) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(20),
      children: [
        Card(
          child: InkWell(
            borderRadius: BorderRadius.circular(AppTheme.radius),
            onTap: () => _openMaps(c.address),
            child: Container(
              height: 160,
              alignment: Alignment.center,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.grayLight,
                borderRadius: BorderRadius.circular(AppTheme.radius),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.map_outlined, size: 40, color: AppColors.green),
                  const SizedBox(height: 8),
                  const Text('Ouvrir dans Google Maps',
                      style: TextStyle(
                          color: AppColors.green, fontWeight: FontWeight.w600)),
                  if (c.mapCaption.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(c.mapCaption,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppColors.gray, fontSize: 12)),
                  ],
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
                if (c.address.isNotEmpty)
                  _infoLine(Icons.place_outlined, c.address,
                      onTap: () => _openMaps(c.address)),
                if (c.phone.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  _infoLine(Icons.phone_outlined, c.phone,
                      onTap: () => _call(c.phoneTel)),
                ],
                if (c.email.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  _infoLine(Icons.mail_outline, c.email,
                      onTap: () => _mail(c.email)),
                ],
              ],
            ),
          ),
        ),
        if (c.hours.isNotEmpty) ...[
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Horaires', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 10),
                  for (final h in c.hours) _hoursRow(h.label, h.value),
                ],
              ),
            ),
          ),
        ],
        if (StoreConfig.current.features?.isNotEmpty ?? false) ...[
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Nos atouts',
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final f in StoreConfig.current.features!)
                        Chip(
                          label: Text(f),
                          backgroundColor: AppColors.green,
                          labelStyle: const TextStyle(
                              color: Colors.white, fontWeight: FontWeight.w600),
                        ),
                    ],
                  ),
                  if (StoreConfig.current.surfaceM2 != null) ...[
                    const SizedBox(height: 10),
                    Text('Surface de vente : ${StoreConfig.current.surfaceM2} m²',
                        style: const TextStyle(color: AppColors.gray)),
                  ],
                ],
              ),
            ),
          ),
        ],
      ],
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
          Flexible(child: Text(day, style: const TextStyle(color: AppColors.gray))),
          const SizedBox(width: 12),
          Text(hours, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
