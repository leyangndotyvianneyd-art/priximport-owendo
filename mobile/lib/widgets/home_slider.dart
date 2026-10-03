import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/post.dart';
import '../models/product.dart';
import '../models/site_content.dart';
import '../screens/cart_screen.dart';
import '../screens/catalogue_screen.dart';
import '../screens/cave_screen.dart';
import '../screens/contact_screen.dart';
import '../screens/fraicheur_screen.dart';
import '../screens/localisation_screen.dart';
import '../screens/nouveautes_screen.dart';
import '../screens/services_screen.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';

/// Carrousel en haut de l'accueil — même contenu que le carrousel du site
/// (assets/js/hero-slider.js) : bienvenue, diapos créées dans l'admin
/// (onglet « Carrousel »), promotions, rayon frais, dernière nouveauté,
/// livraison & Mobile Money. Défile tout seul (durée réglée dans l'admin)
/// et se fait glisser au doigt.
class HomeSlider extends StatefulWidget {
  const HomeSlider({super.key});

  @override
  State<HomeSlider> createState() => _HomeSliderState();
}

class _HomeSliderState extends State<HomeSlider> {
  static const double _height = 320;

  final _controller = PageController();
  List<_Slide> _slides = [_Slide.welcome()];
  int _index = 0;
  int _delay = 6;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  /// Charge contenu, produits et publications. Si le serveur ne répond pas,
  /// la diapo de bienvenue reste seule : l'accueil n'est jamais vide.
  Future<void> _load() async {
    Future<T?> safe<T>(Future<T> f) => f.then<T?>((v) => v, onError: (_) => null);
    final results = await Future.wait([
      safe(ApiService.fetchContent(refresh: true)),
      safe(ApiService.fetchProducts()),
      safe(ApiService.fetchPosts()),
    ]);
    if (!mounted) return;
    final content = results[0] as SiteContent?;
    final products = (results[1] as List<Product>?) ?? [];
    final posts = (results[2] as List<Post>?) ?? [];
    final settings = content?.heroSlider ??
        const HeroSliderSettings(delay: 6, auto: {}, slides: []);

    final slides = <_Slide>[
      if (settings.isOn('welcome')) _Slide.welcome(),
      ...settings.slides.map(_Slide.custom),
      ..._automaticSlides(products, posts).where((s) => settings.isOn(s.key)),
    ];
    setState(() {
      _slides = _withBackgrounds(slides.isEmpty ? [_Slide.welcome()] : slides, products);
      _delay = settings.delay;
      _index = 0;
    });
    if (_controller.hasClients) _controller.jumpToPage(0);
    _restartTimer();
  }

  void _restartTimer() {
    _timer?.cancel();
    // Pas de défilement automatique si le téléphone demande moins
    // d'animations (réglage d'accessibilité).
    if (_slides.length < 2 || MediaQuery.of(context).disableAnimations) return;
    _timer = Timer.periodic(Duration(seconds: _delay), (_) {
      if (!_controller.hasClients) return;
      final next = (_index + 1) % _slides.length;
      if (next == 0) {
        _controller.jumpToPage(0);
      } else {
        _controller.animateToPage(next,
            duration: const Duration(milliseconds: 500), curve: Curves.easeInOut);
      }
    });
  }

  /// Chaque diapo a une photo en fond : la sienne (produit en promo, produit
  /// frais, dernière nouveauté...), sinon une photo de produit du catalogue
  /// (promos en premier), différente pour chaque diapo autant que possible.
  List<_Slide> _withBackgrounds(List<_Slide> slides, List<Product> products) {
    final used = slides.map((s) => s.image).whereType<String>().toSet();
    final active = products.where((p) => p.active && p.imageUrl != null).toList();
    final pool = [
      ...active.where((p) => p.isPromoActive),
      ...active.where((p) => !p.isPromoActive),
    ].map((p) => p.imageUrl!).toSet().toList();
    final spare = pool.where((u) => !used.contains(u)).toList();
    final fallback = spare.isNotEmpty ? spare : pool;
    var next = 0;
    return slides.map((s) {
      if (s.poster) return s;
      if (s.image != null) return s.withBackground(s.image);
      if (fallback.isEmpty) return s;
      return s.withBackground(fallback[next++ % fallback.length]);
    }).toList();
  }

  List<_Slide> _automaticSlides(List<Product> products, List<Post> posts) {
    final active = products.where((p) => p.active).toList();
    final slides = <_Slide>[];

    // 1. Promotions en cours (plus forte remise), sinon notre sélection
    final promos = active.where((p) => p.isPromoActive).toList();
    double discount(Product p) {
      final old = p.oldPrice;
      return old != null && old > p.price ? 1 - p.price / old : 0;
    }

    if (promos.isNotEmpty) {
      final best = (promos.toList()..sort((a, b) => discount(b).compareTo(discount(a)))).first;
      final pct = (discount(best) * 100).round();
      slides.add(_Slide(
        key: 'promo',
        theme: 'dark',
        eyebrow: 'Promotions en cours',
        title: pct > 0 ? "Jusqu'à -$pct % en ce moment" : 'Les bonnes affaires du moment',
        text: '${promos.length} produit${promos.length > 1 ? 's' : ''} en promotion, '
            'dont ${best.name} à ${formatFcfa(best.price)}.',
        image: best.imageUrl,
        imageTag: formatFcfa(best.price),
        ctaLabel: 'Voir les promotions',
        ctaHref: 'pages/catalogue.html',
      ));
    } else if (active.isNotEmpty) {
      final pick = active.first;
      slides.add(_Slide(
        key: 'promo',
        theme: 'dark',
        eyebrow: 'Notre sélection',
        title: 'Les essentiels, en gros volumes',
        text: '${active.length} produits pour la maison et les revendeurs.',
        image: pick.imageUrl,
        imageTag: formatFcfa(pick.price),
        ctaLabel: 'Voir le catalogue',
        ctaHref: 'pages/catalogue.html',
      ));
    }

    // 2. Rayon frais
    final fresh = active
        .where((p) => p.category == 'Fraîcheur & Local' && p.imageUrl != null)
        .toList();
    slides.add(_Slide(
      key: 'fraicheur',
      theme: 'yellow',
      eyebrow: 'Fraîcheur & Local',
      title: 'Du frais du Gabon, chaque matin',
      text: 'Plantain, manioc, poisson du port et légumes de saison.',
      image: fresh.isNotEmpty ? fresh.first.imageUrl : null,
      imageTag: fresh.isNotEmpty ? fresh.first.name : null,
      ctaLabel: 'Découvrir le rayon frais',
      ctaHref: 'pages/fraicheur.html',
    ));

    // 3. Dernière nouveauté en photo
    final photos = posts.where((p) => !p.isVideo && p.photoUrl != null).toList()
      ..sort((a, b) => (DateTime.tryParse(b.date) ?? DateTime(0))
          .compareTo(DateTime.tryParse(a.date) ?? DateTime(0)));
    if (photos.isNotEmpty) {
      final latest = photos.first;
      slides.add(_Slide(
        key: 'nouveaute',
        theme: 'green',
        eyebrow: 'Nouveauté',
        title: latest.title,
        text: latest.caption.isNotEmpty
            ? latest.caption
            : 'Découvrez les derniers arrivages du magasin.',
        image: latest.photoUrl,
        imageTag: latest.tag.isNotEmpty ? latest.tag : 'Nouveau',
        ctaLabel: 'Voir les nouveautés',
        ctaHref: 'pages/nouveautes.html',
      ));
    }

    // 4. Livraison & Mobile Money
    slides.add(const _Slide(
      key: 'services',
      theme: 'dark',
      eyebrow: 'Services',
      title: 'Livré chez vous, payé en Mobile Money',
      text: 'Livraison sur Owendo et Libreville, Airtel Money / Moov Money, '
          'ou retrait en magasin.',
      ctaLabel: 'Voir les services',
      ctaHref: 'pages/services.html',
      showServices: true,
    ));

    return slides;
  }

  /// Ouvre l'écran de l'appli correspondant à un lien du site
  /// (ex. "pages/fraicheur.html"), ou le navigateur pour une adresse http(s).
  void _open(String href) {
    if (href.isEmpty) return;
    if (RegExp(r'^https?://').hasMatch(href)) {
      launchUrl(Uri.parse(href), mode: LaunchMode.externalApplication);
      return;
    }
    final page = href.split(RegExp(r'[?#]')).first;
    final Widget? screen = switch (page) {
      _ when page.contains('catalogue') => const CatalogueScreen(),
      _ when page.contains('fraicheur') => const FraicheurScreen(),
      _ when page.contains('cave') => const CaveScreen(),
      _ when page.contains('nouveautes') => const NouveautesScreen(),
      _ when page.contains('services') => const ServicesScreen(),
      _ when page.contains('localisation') => const LocalisationScreen(),
      _ when page.contains('contact') => const ContactScreen(),
      _ when page.contains('panier') => const CartScreen(),
      _ => null,
    };
    if (screen != null) {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: _height,
      child: Stack(
        children: [
          // Toucher le carrousel met le défilement automatique en pause ;
          // il reprend dès qu'on le lâche.
          Listener(
            onPointerDown: (_) => _timer?.cancel(),
            onPointerUp: (_) => _restartTimer(),
            onPointerCancel: (_) => _restartTimer(),
            child: PageView.builder(
              controller: _controller,
              itemCount: _slides.length,
              onPageChanged: (i) => setState(() => _index = i),
              itemBuilder: (context, i) => _SlideView(
                slide: _slides[i],
                onOpen: _open,
              ),
            ),
          ),
          if (_slides.length > 1)
            Positioned(
              left: 0,
              right: 0,
              bottom: 12,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 0; i < _slides.length; i++)
                    GestureDetector(
                      onTap: () => _controller.animateToPage(i,
                          duration: const Duration(milliseconds: 400),
                          curve: Curves.easeInOut),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        width: i == _index ? 20 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: i == _index
                              ? AppColors.orange
                              : (_slides[_index].theme == 'yellow' && _slides[_index].background == null
                                  ? Colors.black26
                                  : Colors.white54),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Une diapo, automatique ou créée dans l'admin.
class _Slide {
  final String key;
  final String theme; // green, dark ou yellow
  final bool poster; // affiche : l'image couvre toute la diapo
  final String eyebrow;
  final String title;
  final String text;
  final String? image;
  final String? imageTag;
  final String ctaLabel;
  final String ctaHref;
  final String cta2Label;
  final String cta2Href;
  final bool showServices;

  /// Photo affichée en plein fond de la diapo, sous un voile sombre.
  final String? background;

  const _Slide({
    required this.key,
    required this.theme,
    this.poster = false,
    this.eyebrow = '',
    required this.title,
    this.text = '',
    this.image,
    this.imageTag,
    this.ctaLabel = '',
    this.ctaHref = '',
    this.cta2Label = '',
    this.cta2Href = '',
    this.showServices = false,
    this.background,
  });

  _Slide withBackground(String? url) => _Slide(
        key: key,
        theme: theme,
        poster: poster,
        eyebrow: eyebrow,
        title: title,
        text: text,
        image: image,
        imageTag: imageTag,
        ctaLabel: ctaLabel,
        ctaHref: ctaHref,
        cta2Label: cta2Label,
        cta2Href: cta2Href,
        showServices: showServices,
        background: url,
      );

  factory _Slide.welcome() => const _Slide(
        key: 'welcome',
        theme: 'green',
        title: 'Vos courses,\nau meilleur prix.',
        text: 'Le supermarché de référence à Owendo : épicerie, produits '
            'frais et locaux, à retirer en magasin ou livrés chez vous.',
        ctaLabel: 'Voir le catalogue',
        ctaHref: 'pages/catalogue.html',
        cta2Label: 'Nous trouver',
        cta2Href: 'pages/localisation.html',
      );

  factory _Slide.custom(CustomSlide s) => _Slide(
        key: 'custom',
        theme: s.theme,
        poster: s.isPoster,
        eyebrow: s.eyebrow,
        title: s.title,
        text: s.text,
        image: ApiConfig.resolveAsset(s.image),
        ctaLabel: s.ctaLabel,
        ctaHref: s.ctaHref,
      );
}

class _SlideView extends StatelessWidget {
  final _Slide slide;
  final void Function(String href) onOpen;

  const _SlideView({required this.slide, required this.onOpen});

  bool get _light => slide.theme == 'yellow';

  BoxDecoration get _background => switch (slide.theme) {
        'yellow' => const BoxDecoration(color: AppColors.yellow),
        'dark' => const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.greenDark, Color(0xFF0A1A13)],
            ),
          ),
        _ => const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.green, AppColors.greenDark],
            ),
          ),
      };

  @override
  Widget build(BuildContext context) {
    return slide.poster ? _buildPoster(context) : _buildSplit(context);
  }

  /// Couleur du voile posé sur la photo de fond, selon le thème de la diapo.
  Color get _veil => switch (slide.theme) {
        'yellow' => const Color(0xFF3A2A00),
        'dark' => const Color(0xFF07130D),
        _ => AppColors.greenDark,
      };

  Widget _buildSplit(BuildContext context) {
    if (slide.background != null) return _buildWithBackground(context);
    final fg = _light ? AppColors.ink : Colors.white;
    final hasVisual = slide.image != null || slide.showServices;
    return Container(
      decoration: _background,
      padding: const EdgeInsets.fromLTRB(22, 26, 22, 36),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: _Copy(slide: slide, color: fg, onOpen: onOpen),
          ),
          if (hasVisual) ...[
            const SizedBox(width: 14),
            Expanded(
              flex: 2,
              child: slide.showServices
                  ? _ServicesVisual(onOpen: onOpen)
                  : _Photo(url: slide.image!, tag: slide.imageTag),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildWithBackground(BuildContext context) {
    return Container(
      decoration: _background,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.network(
            slide.background!,
            fit: BoxFit.cover,
            // Photo introuvable : on garde le fond de couleur du thème.
            errorBuilder: (_, __, ___) => const SizedBox.shrink(),
          ),
          // Voile plus foncé à gauche, là où est le texte.
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [
                  _veil.withValues(alpha: 0.88),
                  _veil.withValues(alpha: 0.65),
                  _veil.withValues(alpha: 0.40),
                ],
                stops: const [0, 0.55, 1],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 26, 22, 36),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: _Copy(
                    slide: slide,
                    color: Colors.white,
                    onOpen: onOpen,
                    onPhoto: true,
                  ),
                ),
                if (slide.showServices) ...[
                  const SizedBox(width: 14),
                  Expanded(flex: 2, child: _ServicesVisual(onOpen: onOpen)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPoster(BuildContext context) {
    final hasCopy = slide.eyebrow.isNotEmpty ||
        slide.title.isNotEmpty ||
        slide.text.isNotEmpty;
    return GestureDetector(
      // Affiche sans bouton mais avec un lien : toute l'affiche est cliquable.
      onTap: slide.ctaLabel.isEmpty && slide.ctaHref.isNotEmpty
          ? () => onOpen(slide.ctaHref)
          : null,
      child: Container(
        decoration: _background,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.network(
              slide.image!,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => const SizedBox.shrink(),
            ),
            if (hasCopy) ...[
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.transparent, Color(0xCC000000)],
                    stops: [0.3, 1],
                  ),
                ),
              ),
              Positioned(
                left: 22,
                right: 22,
                bottom: 36,
                child: _Copy(slide: slide, color: Colors.white, onOpen: onOpen),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Textes et boutons d'une diapo.
class _Copy extends StatelessWidget {
  final _Slide slide;
  final Color color;
  final void Function(String href) onOpen;

  /// Texte posé sur une photo de fond : toujours clair, et l'étiquette de
  /// la photo (prix, nom du produit) s'affiche ici en pastille.
  final bool onPhoto;

  const _Copy({
    required this.slide,
    required this.color,
    required this.onOpen,
    this.onPhoto = false,
  });

  @override
  Widget build(BuildContext context) {
    final light = slide.theme == 'yellow' && !slide.poster && !onPhoto;
    final tag = onPhoto ? slide.imageTag : null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (slide.eyebrow.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: light
                  ? AppColors.green.withValues(alpha: 0.12)
                  : AppColors.yellow.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              slide.eyebrow.toUpperCase(),
              style: TextStyle(
                color: light ? AppColors.green : AppColors.yellow,
                fontSize: 10.5,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
              ),
            ),
          ),
          const SizedBox(height: 10),
        ],
        if (slide.title.isNotEmpty)
          Text(
            slide.title,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: color,
              fontSize: slide.key == 'welcome' ? 28 : 21,
              fontWeight: FontWeight.w900,
              height: 1.15,
            ),
          ),
        if (tag != null && tag.isNotEmpty) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              tag,
              style: const TextStyle(
                color: AppColors.ink,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
        if (slide.text.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            slide.text,
            maxLines: 4,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: color.withValues(alpha: 0.8),
              fontSize: 13.5,
              height: 1.35,
            ),
          ),
        ],
        if (slide.ctaLabel.isNotEmpty && slide.ctaHref.isNotEmpty ||
            slide.cta2Label.isNotEmpty) ...[
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 8,
            children: [
              if (slide.ctaLabel.isNotEmpty && slide.ctaHref.isNotEmpty)
                ElevatedButton(
                  onPressed: () => onOpen(slide.ctaHref),
                  child: Text(slide.ctaLabel),
                ),
              if (slide.cta2Label.isNotEmpty)
                OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: color,
                    side: BorderSide(color: color.withValues(alpha: 0.7)),
                  ),
                  onPressed: () => onOpen(slide.cta2Href),
                  child: Text(slide.cta2Label),
                ),
            ],
          ),
        ],
      ],
    );
  }
}

/// Photo arrondie avec son étiquette (prix, nom du produit...).
class _Photo extends StatelessWidget {
  final String url;
  final String? tag;

  const _Photo({required this.url, this.tag});

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 0.8,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppTheme.radius),
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.network(
              url,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                color: Colors.white12,
                child: const Icon(Icons.image_not_supported_outlined,
                    color: Colors.white54),
              ),
            ),
            if (tag != null && tag!.isNotEmpty)
              Positioned(
                left: 6,
                right: 6,
                bottom: 6,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    tag!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: AppColors.ink,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Les 4 services en pastilles (diapo « Livraison & Mobile Money »).
class _ServicesVisual extends StatelessWidget {
  final void Function(String href) onOpen;

  const _ServicesVisual({required this.onOpen});

  @override
  Widget build(BuildContext context) {
    Widget item(IconData icon, String label, String href) => InkWell(
          onTap: () => onOpen(href),
          borderRadius: BorderRadius.circular(10),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Icon(icon, color: AppColors.yellow, size: 20),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(label,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600)),
                ),
              ],
            ),
          ),
        );
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        item(Icons.local_shipping_outlined, 'Livraison', 'pages/services.html'),
        const SizedBox(height: 8),
        item(Icons.credit_card, 'Mobile Money', 'pages/services.html'),
        const SizedBox(height: 8),
        item(Icons.shopping_bag_outlined, 'Retrait en magasin', 'pages/localisation.html'),
        const SizedBox(height: 8),
        item(Icons.inventory_2_outlined, 'Achats en gros', 'pages/catalogue.html'),
      ],
    );
  }
}
