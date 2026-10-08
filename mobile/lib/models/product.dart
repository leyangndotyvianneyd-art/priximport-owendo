import '../services/api_service.dart';

/// Produits « Import sur commande » : pas en stock, commandés chez le
/// fournisseur après la commande du client, avec un acompte. Mêmes valeurs
/// que window.PioImport (assets/js/rayons.js) et server.js.
class ImportOnDemand {
  static const category = 'Import sur commande';
  static const defaultLeadTime = '3 à 5 semaines';
  static const depositRate = 0.5;
}

/// Modèle produit — mêmes champs que data/products.json côté serveur,
/// pour rester compatible avec le catalogue déjà utilisé par le site web.
class Product {
  final String id;
  final String name;
  final String unit;
  final num price;
  final num? oldPrice;
  final bool promo;
  final String? promoStart;
  final String? promoEnd;
  final String category;

  /// Type de vin (Rouge, Blanc...) pour les produits de la catégorie
  /// "Cave à vin" — sert aux filtres de l'écran Cave à vin.
  final String? wineType;

  /// Type dans les autres rayons (Électroménager, Animalerie...), pour
  /// leurs filtres (ex. Nourriture / Accessoires).
  final String? subType;
  final String image;
  final bool active;

  /// Délai de livraison d'un produit importé sur commande (sinon le délai
  /// par défaut, voir [importLeadTime]).
  final String? leadTime;

  Product({
    required this.id,
    required this.name,
    required this.unit,
    required this.price,
    this.oldPrice,
    this.promo = false,
    this.promoStart,
    this.promoEnd,
    required this.category,
    this.wineType,
    this.subType,
    required this.image,
    this.active = true,
    this.leadTime,
  });

  /// Délai de livraison si le produit est importé sur commande, sinon null.
  String? get importLeadTime {
    if (category != ImportOnDemand.category) return null;
    final t = leadTime?.trim() ?? '';
    return t.isNotEmpty ? t : ImportOnDemand.defaultLeadTime;
  }

  /// URL complète de l'image (le serveur peut ne stocker qu'un nom de fichier).
  String? get imageUrl => ApiConfig.resolveProductImage(image);

  /// Un produit "en promo" avec des dates de début/fin n'affiche le badge
  /// promo et l'ancien prix barré que pendant cette période — comme sur le
  /// site web (voir assets/js/products.js, isPromoActive).
  bool get isPromoActive {
    if (!promo) return false;
    final today = DateTime.now();
    final todayDay = DateTime(today.year, today.month, today.day);
    if (promoStart != null && promoStart!.isNotEmpty) {
      final start = DateTime.tryParse(promoStart!);
      if (start != null && todayDay.isBefore(DateTime(start.year, start.month, start.day))) {
        return false;
      }
    }
    if (promoEnd != null && promoEnd!.isNotEmpty) {
      final end = DateTime.tryParse(promoEnd!);
      if (end != null && todayDay.isAfter(DateTime(end.year, end.month, end.day))) {
        return false;
      }
    }
    return true;
  }

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      unit: json['unit']?.toString() ?? '',
      price: (json['price'] as num?) ?? 0,
      oldPrice: json['oldPrice'] as num?,
      promo: json['promo'] == true,
      promoStart: json['promoStart']?.toString(),
      promoEnd: json['promoEnd']?.toString(),
      category: json['category']?.toString() ?? 'Divers',
      wineType: json['wineType']?.toString(),
      subType: json['subType']?.toString(),
      image: json['image']?.toString() ?? '',
      active: json['active'] != false,
      leadTime: json['leadTime']?.toString(),
    );
  }
}
