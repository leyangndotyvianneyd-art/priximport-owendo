import 'package:flutter/material.dart';

import '../models/product.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/cart_badge_icon.dart';
import '../widgets/product_card.dart';
import 'settings_screen.dart';

class CatalogueScreen extends StatefulWidget {
  const CatalogueScreen({super.key});

  @override
  State<CatalogueScreen> createState() => _CatalogueScreenState();
}

class _CatalogueScreenState extends State<CatalogueScreen> {
  late Future<List<Product>> _future;
  String _category = 'Tous';

  @override
  void initState() {
    super.initState();
    _future = ApiService.fetchProducts();
  }

  Future<void> _reload() async {
    setState(() {
      _future = ApiService.fetchProducts();
    });
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Catalogue'),
        actions: const [CartBadgeIcon(), SizedBox(width: 8)],
      ),
      drawer: const AppDrawer(current: 'catalogue'),
      body: FutureBuilder<List<Product>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _ErrorState(onRetry: _reload);
          }
          final products = snapshot.data ?? [];
          final categories = <String>{
            'Tous',
            ...products.map((p) => p.category),
          }.toList();
          final filtered = _category == 'Tous'
              ? products
              : products.where((p) => p.category == _category).toList();

          return RefreshIndicator(
            onRefresh: _reload,
            child: Column(
              children: [
                SizedBox(
                  height: 48,
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 6),
                    scrollDirection: Axis.horizontal,
                    itemCount: categories.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, i) {
                      final cat = categories[i];
                      final selected = cat == _category;
                      return ChoiceChip(
                        label: Text(cat),
                        selected: selected,
                        onSelected: (_) => setState(() => _category = cat),
                        selectedColor: AppColors.green,
                        labelStyle: TextStyle(
                          color: selected ? Colors.white : AppColors.ink,
                          fontWeight: FontWeight.w600,
                        ),
                      );
                    },
                  ),
                ),
                Expanded(
                  child: filtered.isEmpty
                      ? const Center(
                          child: Text('Aucun produit dans cette catégorie.'))
                      : GridView.builder(
                          padding: const EdgeInsets.all(14),
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisSpacing: 12,
                            crossAxisSpacing: 12,
                            childAspectRatio: 0.62,
                          ),
                          itemCount: filtered.length,
                          itemBuilder: (context, i) =>
                              ProductCard(product: filtered[i]),
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final VoidCallback onRetry;

  const _ErrorState({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off, size: 42, color: AppColors.gray),
            const SizedBox(height: 12),
            Text(
              ApiConfig.isPublicBuild
                  ? 'Impossible de charger le catalogue.\n'
                      'Vérifie ta connexion Internet puis réessaie.'
                  : 'Impossible de joindre le serveur.\n'
                      'Vérifie que le serveur (npm start) tourne bien et que\n'
                      "l'adresse du serveur est la bonne.",
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.gray),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              alignment: WrapAlignment.center,
              children: [
                ElevatedButton(onPressed: onRetry, child: const Text('Réessayer')),
                if (!ApiConfig.isPublicBuild)
                OutlinedButton(
                  onPressed: () async {
                    final changed = await Navigator.of(context).push<bool>(
                      MaterialPageRoute(builder: (_) => const SettingsScreen()),
                    );
                    if (changed == true) onRetry();
                  },
                  child: const Text('Adresse du serveur'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
