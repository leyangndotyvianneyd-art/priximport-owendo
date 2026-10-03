import 'package:flutter/material.dart';

import '../models/site_content.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

/// Charge le contenu géré depuis l'admin (/api/content) et construit
/// l'écran avec. Tirer vers le bas recharge les dernières modifications.
class ContentBuilder extends StatefulWidget {
  final Widget Function(BuildContext context, SiteContent content) builder;

  const ContentBuilder({super.key, required this.builder});

  @override
  State<ContentBuilder> createState() => _ContentBuilderState();
}

class _ContentBuilderState extends State<ContentBuilder> {
  late Future<SiteContent> _future;

  @override
  void initState() {
    super.initState();
    // Toujours la version à jour à l'ouverture de l'écran.
    _future = ApiService.fetchContent(refresh: true);
  }

  Future<void> _reload() async {
    setState(() => _future = ApiService.fetchContent(refresh: true));
    // L'erreur éventuelle est affichée par le FutureBuilder.
    await _future.then((_) {}, onError: (_) {});
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<SiteContent>(
      future: _future,
      builder: (context, snapshot) {
        // Hors connexion : on garde le dernier contenu connu s'il existe.
        final content = snapshot.data ??
            (snapshot.hasError ? ApiService.cachedContent : null);
        if (content != null) {
          return RefreshIndicator(
            onRefresh: _reload,
            child: widget.builder(context, content),
          );
        }
        if (snapshot.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.wifi_off, size: 42, color: AppColors.gray),
                  const SizedBox(height: 12),
                  const Text(
                    'Impossible de charger ces informations.\n'
                    'Vérifie ta connexion Internet puis réessaie.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.gray),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(onPressed: _reload, child: const Text('Réessayer')),
                ],
              ),
            ),
          );
        }
        return const Center(child: CircularProgressIndicator());
      },
    );
  }
}
