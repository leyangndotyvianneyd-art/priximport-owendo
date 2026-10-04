import 'package:flutter/material.dart';

import '../models/product.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/cart_badge_icon.dart';
import '../widgets/pill_tabs.dart';
import '../widgets/product_card.dart';
import 'settings_screen.dart';

class CatalogueScreen extends StatefulWidget {
  /// Recherche et catégorie déjà choisies (ex. depuis la barre de
  /// recherche ou un raccourci de l'accueil).
  final String initialQuery;
  final String? initialCategory;

  const CatalogueScreen({
    super.key,
    this.initialQuery = '',
    this.initialCategory,
  });

  @override
  State<CatalogueScreen> createState() => _CatalogueScreenState();
}

class _CatalogueScreenState extends State<CatalogueScreen> {
  late Future<List<Product>> _future;
  String _category = 'Tous';
  late final TextEditingController _search;

  @override
  void initState() {
    super.initState();
    _future = ApiService.fetchProducts();
    _category = widget.initialCategory ?? 'Tous';
    _search = TextEditingController(text: widget.initialQuery);
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  /// Recherche insensible aux accents et à la casse ("creme" trouve
  /// "crème"), comme normalize() dans assets/js/products.js.
  static String _normalize(String s) {
    const from = 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ';
    const to = 'aaaaaaceeeeiiiinooooouuuuyyoa';
    final lower = s.toLowerCase();
    final b = StringBuffer();
    for (final ch in lower.split('')) {
      final i = from.indexOf(ch);
      b.write(i >= 0 ? to[i] : ch);
    }
    return b.toString();
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
          final needle = _normalize(_search.text.trim());
          final filtered = products
              .where((p) => _category == 'Tous' || p.category == _category)
              .where((p) =>
                  needle.isEmpty ||
                  _normalize(p.name).contains(needle) ||
                  _normalize(p.category).contains(needle))
              .toList();

          return RefreshIndicator(
            onRefresh: _reload,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 0),
                  child: TextField(
                    controller: _search,
                    textInputAction: TextInputAction.search,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      hintText: 'Rechercher un produit (riz, huile...)',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _search.text.isEmpty
                          ? null
                          : IconButton(
                              icon: const Icon(Icons.close),
                              onPressed: () => setState(_search.clear),
                            ),
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(999),
                        borderSide: const BorderSide(color: AppColors.grayLight),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(999),
                        borderSide:
                            const BorderSide(color: AppColors.orange, width: 2),
                      ),
                    ),
                  ),
                ),
                PillTabs(
                  labels: categories,
                  selected: _category,
                  onSelected: (cat) => setState(() => _category = cat),
                ),
                Expanded(
                  child: filtered.isEmpty
                      ? Center(
                          child: Text(needle.isEmpty
                              ? 'Aucun produit dans cette catégorie.'
                              : 'Aucun produit ne correspond à votre recherche.'))
                      : GridView.builder(
                          padding: const EdgeInsets.all(14),
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisSpacing: 12,
                            crossAxisSpacing: 12,
                            childAspectRatio: 0.64,
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
