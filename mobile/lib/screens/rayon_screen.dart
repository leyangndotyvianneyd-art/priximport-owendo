import 'package:flutter/material.dart';

import '../models/product.dart';
import '../models/rayon.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/cart_badge_icon.dart';
import '../widgets/pill_tabs.dart';
import '../widgets/product_card.dart';

/// Écran d'un rayon (Cave à vin, Électroménager, Animalerie...) : produits
/// de la catégorie du rayon, filtrables par type, comme pages/rayon.html et
/// pages/cave.html côté site.
class RayonScreen extends StatefulWidget {
  final Rayon rayon;

  const RayonScreen({super.key, required this.rayon});

  @override
  State<RayonScreen> createState() => _RayonScreenState();
}

class _RayonScreenState extends State<RayonScreen> {
  Rayon get rayon => widget.rayon;

  late Future<List<Product>> _future;
  String _type = 'Tous';

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

  /// Ordre des filtres : celui du rayon, un type inconnu passe à la fin.
  int _rank(String t) {
    final i = rayon.types.indexOf(t);
    return i < 0 ? rayon.types.length : i;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(rayon.shortTitle),
        actions: const [CartBadgeIcon(), SizedBox(width: 8)],
      ),
      drawer: AppDrawer(current: rayon.slug),
      body: FutureBuilder<List<Product>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
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
                      'Impossible de charger ce rayon.\n'
                      'Vérifie ta connexion Internet puis réessaie.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.gray),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                        onPressed: _reload, child: const Text('Réessayer')),
                  ],
                ),
              ),
            );
          }

          final wines = (snapshot.data ?? [])
              .where((p) => p.category == rayon.category)
              .toList();
          final types = wines
              .map(rayon.typeOf)
              .whereType<String>()
              .where((t) => t.isNotEmpty)
              .toSet()
              .toList()
            ..sort((a, b) {
              final r = _rank(a) - _rank(b);
              return r != 0 ? r : a.compareTo(b);
            });
          final type = types.contains(_type) ? _type : 'Tous';
          final filtered = type == 'Tous'
              ? wines
              : wines.where((p) => rayon.typeOf(p) == type).toList();

          return RefreshIndicator(
            onRefresh: _reload,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                SliverToBoxAdapter(
                  child: Container(
                    margin: const EdgeInsets.fromLTRB(14, 14, 14, 4),
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          rayon.color,
                          Color.lerp(rayon.color, Colors.black, 0.45)!,
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(AppTheme.radius),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          rayon.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          rayon.text,
                          style: const TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ),
                if (types.isNotEmpty)
                  SliverToBoxAdapter(
                    child: PillTabs(
                      labels: ['Tous', ...types],
                      selected: type,
                      onSelected: (t) => setState(() => _type = t),
                    ),
                  ),
                if (filtered.isEmpty)
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: Text(
                        'Ce rayon se remplit bientôt — revenez nous voir !',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.gray),
                      ),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.all(14),
                    sliver: SliverGrid(
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 0.64,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, i) => ProductCard(product: filtered[i]),
                        childCount: filtered.length,
                      ),
                    ),
                  ),
                if (rayon.notice != null)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(14, 0, 14, 24),
                      child: Text(
                        rayon.notice!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppColors.gray, fontSize: 12),
                      ),
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
