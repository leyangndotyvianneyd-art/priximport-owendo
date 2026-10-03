import 'package:flutter/material.dart';

import '../models/product.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/cart_badge_icon.dart';
import '../widgets/product_card.dart';

/// Catégorie des produits affichés dans la cave (même nom que côté admin).
const caveCategory = 'Cave à vin';

/// Ordre d'affichage des filtres ; un type inconnu passe à la fin.
const _wineTypeOrder = [
  'Rouge',
  'Blanc',
  'Rosé',
  'Champagne & mousseux',
  'Spiritueux',
];

/// Page Cave à vin — produits de la catégorie "Cave à vin", filtrables par
/// type de vin (champ wineType), comme pages/cave.html.
class CaveScreen extends StatefulWidget {
  const CaveScreen({super.key});

  @override
  State<CaveScreen> createState() => _CaveScreenState();
}

class _CaveScreenState extends State<CaveScreen> {
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

  int _rank(String t) {
    final i = _wineTypeOrder.indexOf(t);
    return i < 0 ? _wineTypeOrder.length : i;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cave à vin'),
        actions: const [CartBadgeIcon(), SizedBox(width: 8)],
      ),
      drawer: const AppDrawer(current: 'cave'),
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
                      'Impossible de charger la cave.\n'
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
              .where((p) => p.category == caveCategory)
              .toList();
          final types = wines
              .map((p) => p.wineType)
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
              : wines.where((p) => p.wineType == type).toList();

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
                      gradient: const LinearGradient(
                        colors: [Color(0xFF6B1E2E), Color(0xFF3A0F18)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(AppTheme.radius),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Notre cave à vin',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        SizedBox(height: 6),
                        Text(
                          'Rouges, blancs, rosés, champagnes et spiritueux, '
                          'au prix import.',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ),
                if (types.isNotEmpty)
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 48,
                      child: ListView.separated(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 6),
                        scrollDirection: Axis.horizontal,
                        itemCount: types.length + 1,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (context, i) {
                          final t = i == 0 ? 'Tous' : types[i - 1];
                          final selected = t == type;
                          return ChoiceChip(
                            label: Text(t),
                            selected: selected,
                            onSelected: (_) => setState(() => _type = t),
                            selectedColor: AppColors.green,
                            labelStyle: TextStyle(
                              color: selected ? Colors.white : AppColors.ink,
                              fontWeight: FontWeight.w600,
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                if (filtered.isEmpty)
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: Text(
                        'La cave se remplit bientôt — revenez nous voir !',
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
                        childAspectRatio: 0.62,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, i) => ProductCard(product: filtered[i]),
                        childCount: filtered.length,
                      ),
                    ),
                  ),
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(14, 0, 14, 24),
                    child: Text(
                      "L'abus d'alcool est dangereux pour la santé, à consommer "
                      'avec modération. Vente interdite aux mineurs.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.gray, fontSize: 12),
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
