import 'package:flutter/material.dart';

import 'product.dart';

/// Un rayon mis en avant (Cave à vin, Électroménager...) : les produits
/// d'une catégorie, filtrables par type. Même liste que
/// assets/js/rayons.js côté site — à garder identiques.
class Rayon {
  final String slug;
  final String category;
  final String title;
  final String shortTitle;
  final String text;
  final Color color;
  final IconData icon;
  final List<String> types;

  /// Avertissement affiché en bas du rayon (ex. alcool).
  final String? notice;

  /// La cave range le type dans "wineType", les autres rayons dans "subType".
  final bool usesWineType;

  const Rayon({
    required this.slug,
    required this.category,
    required this.title,
    String? shortTitle,
    required this.text,
    required this.color,
    required this.icon,
    required this.types,
    this.notice,
    this.usesWineType = false,
  }) : shortTitle = shortTitle ?? title;

  String? typeOf(Product p) => usesWineType ? p.wineType : p.subType;
}

class Rayons {
  static const cave = Rayon(
    slug: 'cave',
    category: 'Cave à vin',
    title: 'Notre cave à vin',
    shortTitle: 'Cave à vin',
    text: 'Rouges, blancs, rosés, champagnes et spiritueux, au prix import.',
    color: Color(0xFF8B1E3F),
    icon: Icons.wine_bar_outlined,
    types: ['Rouge', 'Blanc', 'Rosé', 'Champagne & mousseux', 'Spiritueux'],
    notice: "L'abus d'alcool est dangereux pour la santé, à consommer avec "
        'modération. Vente interdite aux mineurs.',
    usesWineType: true,
  );

  static const electromenager = Rayon(
    slug: 'electromenager',
    category: 'Électroménager',
    title: 'Électroménager',
    text: 'Réfrigérateurs, congélateurs, ventilateurs, mixeurs, bouilloires… '
        'pour équiper toute la maison.',
    color: Color(0xFF1D4ED8),
    icon: Icons.kitchen_outlined,
    types: [
      'Gros électroménager',
      'Petit électroménager',
      'Climatisation & ventilation',
      'Entretien de la maison',
    ],
  );

  static const ustensiles = Rayon(
    slug: 'ustensiles',
    category: 'Ustensiles de cuisine',
    title: 'Ustensiles de cuisine',
    text: 'Marmites, casseroles, poêles, couverts, vaisselle et rangements.',
    color: Color(0xFFB45309),
    icon: Icons.soup_kitchen_outlined,
    types: [
      'Marmites & casseroles',
      'Poêles & cocottes',
      'Couverts & vaisselle',
      'Préparation & découpe',
      'Rangement & conservation',
    ],
  );

  static const charcuterie = Rayon(
    slug: 'charcuterie',
    category: 'Charcuterie',
    title: 'Charcuterie',
    text: 'Jambons, saucissons, salamis, saucisses, pâtés et lardons, pour '
        'vos sandwichs, apéritifs et petits plats.',
    color: Color(0xFFBE185D),
    icon: Icons.kebab_dining_outlined,
    types: [
      'Jambons',
      'Saucissons & salamis',
      'Saucisses',
      'Pâtés & terrines',
      'Lardons & bacon',
    ],
  );

  static const conserves = Rayon(
    slug: 'conserves',
    category: 'Conserves',
    title: 'Conserves',
    text: 'Sardines, thon, corned-beef, tomate concentrée, petits pois… '
        'les indispensables du placard.',
    color: Color(0xFFB91C1C),
    icon: Icons.inventory_2_outlined,
    types: ['Poissons', 'Viandes', 'Légumes', 'Sauces & tomate', 'Fruits & desserts'],
  );

  static const animalerie = Rayon(
    slug: 'animalerie',
    category: 'Animalerie',
    title: 'Animalerie : tout pour votre chien',
    shortTitle: 'Animalerie',
    text: 'Croquettes, pâtées, friandises, colliers, laisses, gamelles et '
        'soins pour votre chien.',
    color: Color(0xFF0F766E),
    icon: Icons.pets_outlined,
    types: ['Nourriture', 'Friandises', 'Accessoires', 'Hygiène & soins'],
  );

  /// Rayons qui ont leur écran (la Fraîcheur a le sien, à part).
  static const all = [
    cave,
    electromenager,
    ustensiles,
    charcuterie,
    conserves,
    animalerie,
  ];

  static Rayon? forCategory(String category) {
    for (final r in all) {
      if (r.category == category) return r;
    }
    return null;
  }

  static Rayon? forSlug(String slug) {
    for (final r in all) {
      if (r.slug == slug) return r;
    }
    return null;
  }
}
