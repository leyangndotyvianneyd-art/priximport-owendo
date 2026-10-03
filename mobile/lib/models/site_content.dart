import 'package:flutter/material.dart';

/// Contenu modifiable depuis l'administration (data/content.json, servi par
/// /api/content) : coordonnées, horaires, cartes Fraîcheur et Services...
/// Même source que assets/js/site-content.js côté site web, pour que l'appli
/// affiche toujours la même chose que le site.
class SiteContent {
  final String address;
  final String phone;
  final String email;
  final String whatsapp; // chiffres uniquement, ex. 241074132215
  final String mapCaption;
  final String freshNote;
  final List<HoursRow> hours;
  final List<InfoCard> fraicheurCards;
  final List<InfoCard> servicesCards;
  final HeroSliderSettings heroSlider;

  const SiteContent({
    required this.address,
    required this.phone,
    required this.email,
    required this.whatsapp,
    required this.mapCaption,
    required this.freshNote,
    required this.hours,
    required this.fraicheurCards,
    required this.servicesCards,
    required this.heroSlider,
  });

  factory SiteContent.fromJson(Map<String, dynamic> json) {
    final contact = (json['contact'] as Map?)?.cast<String, dynamic>() ?? {};
    final cards = (json['cards'] as Map?)?.cast<String, dynamic>() ?? {};
    List<InfoCard> cardList(String key) => ((cards[key] as List?) ?? [])
        .whereType<Map>()
        .map((c) => InfoCard.fromJson(c.cast<String, dynamic>()))
        .toList();
    String s(dynamic v) => v?.toString().trim() ?? '';

    return SiteContent(
      address: s(contact['address']),
      phone: s(contact['phone']),
      email: s(contact['email']),
      whatsapp: s(contact['whatsapp']).replaceAll(RegExp(r'\D'), ''),
      mapCaption: s(json['mapCaption']),
      freshNote: s(json['freshNote']),
      hours: ((json['hours'] as List?) ?? [])
          .whereType<Map>()
          .map((h) => HoursRow(s(h['label']), s(h['value'])))
          .toList(),
      fraicheurCards: cardList('fraicheur'),
      servicesCards: cardList('services'),
      heroSlider: HeroSliderSettings.fromJson(
          (json['heroSlider'] as Map?)?.cast<String, dynamic>() ?? {}),
    );
  }

  /// Numéro de téléphone utilisable dans un lien "tel:".
  String get phoneTel => phone.replaceAll(RegExp(r'[^\d+]'), '');
}

/// Réglages du carrousel de l'accueil (onglet « Carrousel » de l'admin,
/// content.json → heroSlider) — mêmes règles que assets/js/hero-slider.js.
class HeroSliderSettings {
  /// Durée d'affichage de chaque diapo, en secondes (6 par défaut).
  final int delay;
  final Map<String, bool> auto;
  final List<CustomSlide> slides;

  const HeroSliderSettings({
    required this.delay,
    required this.auto,
    required this.slides,
  });

  /// Diapo automatique (welcome, promo, fraicheur, nouveaute, services)
  /// activée ? Tout est activé tant que rien n'a été enregistré.
  bool isOn(String key) => auto[key] != false;

  factory HeroSliderSettings.fromJson(Map<String, dynamic> json) {
    final d = num.tryParse(json['delay']?.toString() ?? '');
    final auto = (json['auto'] as Map?)?.cast<String, dynamic>() ?? {};
    return HeroSliderSettings(
      delay: d != null && d >= 3 ? d.round() : 6,
      auto: auto.map((k, v) => MapEntry(k, v != false)),
      slides: ((json['slides'] as List?) ?? [])
          .whereType<Map>()
          .map((s) => CustomSlide.fromJson(s.cast<String, dynamic>()))
          .where((s) => s.active && (s.isPoster ? s.image.isNotEmpty : s.title.isNotEmpty))
          .toList(),
    );
  }
}

/// Diapo créée dans l'admin : "poster" (affiche plein cadre) ou "split"
/// (texte + photo).
class CustomSlide {
  final String layout;
  final String theme;
  final String eyebrow;
  final String title;
  final String text;
  final String image;
  final String ctaLabel;
  final String ctaHref;
  final bool active;

  const CustomSlide({
    required this.layout,
    required this.theme,
    required this.eyebrow,
    required this.title,
    required this.text,
    required this.image,
    required this.ctaLabel,
    required this.ctaHref,
    required this.active,
  });

  bool get isPoster => layout == 'poster';

  factory CustomSlide.fromJson(Map<String, dynamic> json) {
    String s(String k) => json[k]?.toString().trim() ?? '';
    return CustomSlide(
      layout: s('layout'),
      theme: s('theme'),
      eyebrow: s('eyebrow'),
      title: s('title'),
      text: s('text'),
      image: s('image'),
      ctaLabel: s('ctaLabel'),
      ctaHref: s('ctaHref'),
      active: json['active'] != false && json['active'] != 'false',
    );
  }
}

class HoursRow {
  final String label;
  final String value;
  const HoursRow(this.label, this.value);
}

class InfoCard {
  final String icon;
  final String title;
  final String text;

  const InfoCard({required this.icon, required this.title, required this.text});

  factory InfoCard.fromJson(Map<String, dynamic> json) => InfoCard(
        icon: json['icon']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
        text: json['text']?.toString() ?? '',
      );

  /// Équivalent Material des icônes choisies dans l'admin (PioIcons côté web).
  IconData get iconData => _icons[icon] ?? Icons.star_outline;

  static const _icons = <String, IconData>{
    // Icônes "badge" (Accueil / Services)
    'bag': Icons.shopping_bag_outlined,
    'leaf': Icons.eco_outlined,
    'clock': Icons.schedule,
    'card': Icons.credit_card,
    'truck': Icons.local_shipping_outlined,
    'box': Icons.inventory_2_outlined,
    'check-shield': Icons.verified_user_outlined,
    'star': Icons.star_outline,
    'pin': Icons.place_outlined,
    // Icônes "fraîcheur"
    'plantain': Icons.spa_outlined,
    'fish': Icons.set_meal_outlined,
    'veggie': Icons.grass,
    'morning': Icons.wb_sunny_outlined,
  };
}
