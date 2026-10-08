import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/product.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import '../widgets/app_drawer.dart';
import '../widgets/cart_badge_icon.dart';
import '../widgets/home_slider.dart';
import '../widgets/pill_tabs.dart';
import '../widgets/product_card.dart';
import 'catalogue_screen.dart';
import '../models/rayon.dart';
import 'rayon_screen.dart';
import 'fraicheur_screen.dart';
import 'localisation_screen.dart';
import 'main_shell.dart';
import 'nouveautes_screen.dart';
import 'services_screen.dart';

/// Accueil façon grande appli de shopping : recherche en tête, raccourcis
/// vers les rayons, bandeau de confiance, carrousel, vitrine des rayons,
/// puis tous les produits en grille avec des onglets de filtre.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const _all = 'Tous';
  static const _promos = 'Promotions';

  late Future<List<Product>> _future;
  Key _sliderKey = UniqueKey();
  String _filter = _all;

  @override
  void initState() {
    super.initState();
    _future = ApiService.fetchProducts();
  }

  Future<void> _reload() async {
    setState(() {
      _future = ApiService.fetchProducts();
      _sliderKey = UniqueKey(); // recharge aussi le carrousel
    });
    await _future.then((_) {}, onError: (_) {});
  }

  void _push(Widget screen) =>
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));

  void _search(String query) {
    final q = query.trim();
    if (q.isEmpty) {
      openShellTab(context, ShellTabs.catalogue);
    } else {
      _push(CatalogueScreen(initialQuery: q));
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: const Color(0xFFF6F6F7),
        drawer: const AppDrawer(current: 'home'),
        body: FutureBuilder<List<Product>>(
          future: _future,
          builder: (context, snapshot) {
            final products =
                (snapshot.data ?? []).where((p) => p.active).toList();
            final loading = snapshot.connectionState == ConnectionState.waiting;

            return RefreshIndicator(
              onRefresh: _reload,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverToBoxAdapter(child: _Header(onSearch: _search)),
                  SliverToBoxAdapter(child: _Shortcuts(onOpen: _push)),
                  const SliverToBoxAdapter(child: _TrustBanner()),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: HomeSlider(key: _sliderKey),
                      ),
                    ),
                  ),
                  if (products.isNotEmpty)
                    SliverToBoxAdapter(
                      child: _AisleShowcase(
                        products: products,
                        // Catégorie avec son propre rayon : on ouvre le
                        // rayon, sinon le catalogue filtré.
                        onOpen: (cat) {
                          final rayon = Rayons.forCategory(cat);
                          _push(rayon != null
                              ? RayonScreen(rayon: rayon)
                              : CatalogueScreen(initialCategory: cat));
                        },
                      ),
                    ),
                  ..._productGrid(products, loading, snapshot.hasError),
                  const SliverToBoxAdapter(child: SizedBox(height: 24)),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  List<Widget> _productGrid(
      List<Product> products, bool loading, bool hasError) {
    if (loading) {
      return const [
        SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.all(32),
            child: Center(child: CircularProgressIndicator()),
          ),
        ),
      ];
    }
    if (hasError) {
      return [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              children: [
                const Icon(Icons.wifi_off, size: 36, color: AppColors.gray),
                const SizedBox(height: 8),
                const Text(
                  'Impossible de charger les produits.\n'
                  'Vérifie ta connexion puis tire vers le bas pour réessayer.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.gray),
                ),
                const SizedBox(height: 12),
                ElevatedButton(onPressed: _reload, child: const Text('Réessayer')),
              ],
            ),
          ),
        ),
      ];
    }

    final hasPromos = products.any((p) => p.isPromoActive);
    final categories = products.map((p) => p.category).toSet().toList()
      ..sort();
    final labels = [_all, if (hasPromos) _promos, ...categories];
    final filter = labels.contains(_filter) ? _filter : _all;
    final shown = switch (filter) {
      _all => [
          ...products.where((p) => p.isPromoActive),
          ...products.where((p) => !p.isPromoActive),
        ],
      _promos => products.where((p) => p.isPromoActive).toList(),
      _ => products.where((p) => p.category == filter).toList(),
    };

    return [
      const SliverToBoxAdapter(
        child: Padding(
          padding: EdgeInsets.fromLTRB(16, 18, 16, 0),
          child: Text(
            'Pour vous',
            style: TextStyle(
                fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.ink),
          ),
        ),
      ),
      SliverToBoxAdapter(
        child: PillTabs(
          labels: labels,
          selected: filter,
          icons: const {_promos: Icons.local_offer},
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          onSelected: (f) => setState(() => _filter = f),
        ),
      ),
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
        sliver: SliverGrid(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 0.64,
          ),
          delegate: SliverChildBuilderDelegate(
            (context, i) => ProductCard(product: shown[i]),
            childCount: shown.length,
          ),
        ),
      ),
    ];
  }
}

/// En-tête : menu, logo, panier, puis la grande barre de recherche, sur un
/// léger dégradé pêche.
class _Header extends StatefulWidget {
  final ValueChanged<String> onSearch;

  const _Header({required this.onSearch});

  @override
  State<_Header> createState() => _HeaderState();
}

class _HeaderState extends State<_Header> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    widget.onSearch(_controller.text);
    FocusScope.of(context).unfocus();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFE7D1), Color(0xFFF6F6F7)],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(4, 4, 4, 10),
          child: Column(
            children: [
              Row(
                children: [
                  Builder(
                    builder: (context) => IconButton(
                      icon: const Icon(Icons.menu, color: AppColors.ink),
                      tooltip: 'Menu',
                      onPressed: () => Scaffold.of(context).openDrawer(),
                    ),
                  ),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.asset('assets/icon/icon.png',
                        width: 34, height: 34),
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Prix Import',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: AppColors.green,
                            height: 1,
                          ),
                        ),
                        Text(
                          'OWENDO · LIBREVILLE',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.4,
                            color: AppColors.orange,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const IconTheme(
                    data: IconThemeData(color: AppColors.ink),
                    child: CartBadgeIcon(),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                child: Container(
                  height: 50,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.orange, width: 2),
                  ),
                  child: Row(
                    children: [
                      const SizedBox(width: 12),
                      const Icon(Icons.search, color: AppColors.gray),
                      const SizedBox(width: 6),
                      Expanded(
                        child: TextField(
                          controller: _controller,
                          textInputAction: TextInputAction.search,
                          onSubmitted: (_) => _submit(),
                          style: const TextStyle(fontSize: 15),
                          decoration: const InputDecoration(
                            hintText: 'Riz, huile, savon, vin...',
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            filled: false,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(4),
                        child: Material(
                          borderRadius: BorderRadius.circular(10),
                          clipBehavior: Clip.antiAlias,
                          child: Ink(
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Color(0xFFF59E2E), AppColors.orange],
                              ),
                            ),
                            child: InkWell(
                              onTap: _submit,
                              child: const SizedBox(
                                width: 56,
                                height: double.infinity,
                                child: Icon(Icons.search, color: Colors.white),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Raccourcis vers les rayons, en cartes qui défilent horizontalement.
class _Shortcuts extends StatelessWidget {
  final void Function(Widget screen) onOpen;

  const _Shortcuts({required this.onOpen});

  @override
  Widget build(BuildContext context) {
    final items = <(IconData, Color, String, VoidCallback)>[
      (Icons.grid_view_rounded, AppColors.orange, 'Tout le\ncatalogue',
          () => openShellTab(context, ShellTabs.catalogue)),
      (Icons.eco, AppColors.green, 'Fraîcheur\n& local',
          () => onOpen(const FraicheurScreen())),
      (Icons.wine_bar, const Color(0xFF8B1E3F), 'Cave\nà vin',
          () => onOpen(const RayonScreen(rayon: Rayons.cave))),
      (Icons.kitchen, const Color(0xFF1D4ED8), 'Électro-\nménager',
          () => onOpen(const RayonScreen(rayon: Rayons.electromenager))),
      (Icons.soup_kitchen, const Color(0xFFB45309), 'Ustensiles\nde cuisine',
          () => onOpen(const RayonScreen(rayon: Rayons.ustensiles))),
      (Icons.kebab_dining, const Color(0xFFBE185D), 'Charcuterie',
          () => onOpen(const RayonScreen(rayon: Rayons.charcuterie))),
      (Icons.inventory_2, const Color(0xFFB91C1C), 'Conserves',
          () => onOpen(const RayonScreen(rayon: Rayons.conserves))),
      (Icons.pets, const Color(0xFF0F766E), 'Animalerie\n(chiens)',
          () => onOpen(const RayonScreen(rayon: Rayons.animalerie))),
      (Icons.photo_library, const Color(0xFF2563EB), 'Nouveautés\n& arrivages',
          () => onOpen(const NouveautesScreen())),
      (Icons.local_shipping, const Color(0xFF7C3AED), 'Livraison\n& services',
          () => onOpen(const ServicesScreen())),
      (Icons.place, const Color(0xFFDC2626), 'Nous\ntrouver',
          () => onOpen(const LocalisationScreen())),
    ];
    return SizedBox(
      height: 70,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final (icon, color, label, onTap) = items[i];
          return Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: onTap,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 10, 14, 10),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(icon, color: color, size: 22),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 13,
                        height: 1.2,
                        fontWeight: FontWeight.w600,
                        color: AppColors.ink,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Bandeau de confiance : livraison et paiement.
class _TrustBanner extends StatelessWidget {
  const _TrustBanner();

  @override
  Widget build(BuildContext context) {
    Widget half(IconData icon, String title, String text) => Expanded(
          child: Row(
            children: [
              Icon(icon, color: AppColors.orange, size: 26),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            color: AppColors.ink)),
                    Text(text,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.gray)),
                  ],
                ),
              ),
            ],
          ),
        );

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFFEFD9), Color(0xFFFFE1DA)],
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          half(Icons.local_shipping_outlined, 'Livraison rapide',
              'Owendo & Libreville'),
          Container(
            width: 1,
            height: 30,
            margin: const EdgeInsets.symmetric(horizontal: 8),
            color: AppColors.orange.withValues(alpha: 0.3),
          ),
          half(Icons.verified_user_outlined, 'Mobile Money',
              'Airtel · Moov · à la remise'),
        ],
      ),
    );
  }
}

/// Vitrine des rayons : une carte par catégorie avec une photo et le prix
/// de départ en pastille.
class _AisleShowcase extends StatelessWidget {
  final List<Product> products;
  final ValueChanged<String> onOpen;

  const _AisleShowcase({required this.products, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    final byCategory = <String, List<Product>>{};
    for (final p in products) {
      byCategory.putIfAbsent(p.category, () => []).add(p);
    }
    final aisles = byCategory.entries.map((e) {
      final withImage = e.value.where((p) => p.imageUrl != null).toList();
      final cover = withImage.isNotEmpty ? withImage.first : e.value.first;
      final minPrice =
          e.value.map((p) => p.price).reduce((a, b) => a < b ? a : b);
      return (e.key, cover.imageUrl, minPrice);
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 18, 16, 10),
          child: Row(
            children: [
              const Expanded(
                child: Text(
                  'Explorez nos rayons',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColors.ink),
                ),
              ),
              GestureDetector(
                onTap: () => openShellTab(context, ShellTabs.catalogue),
                child: const Text(
                  'Tout voir ›',
                  style: TextStyle(
                      color: AppColors.orange, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 178,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            scrollDirection: Axis.horizontal,
            itemCount: aisles.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (context, i) {
              final (name, image, minPrice) = aisles[i];
              return GestureDetector(
                onTap: () => onOpen(name),
                child: Container(
                  width: 128,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      SizedBox(
                        height: 112,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: image != null
                                  ? Image.network(image,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => Container(
                                          color: const Color(0xFFF3F4F6)))
                                  : Container(color: const Color(0xFFF3F4F6)),
                            ),
                            Positioned(
                              left: 0,
                              right: 0,
                              bottom: 6,
                              child: Center(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(999),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black
                                            .withValues(alpha: 0.15),
                                        blurRadius: 6,
                                      ),
                                    ],
                                  ),
                                  child: Text(
                                    'dès ${formatFcfa(minPrice)}',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.ink,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        name,
                        maxLines: 2,
                        textAlign: TextAlign.center,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: AppColors.ink,
                          height: 1.2,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
