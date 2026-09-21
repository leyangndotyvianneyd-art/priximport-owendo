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
  final String image;
  final bool active;

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
    required this.image,
    this.active = true,
  });

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
      image: json['image']?.toString() ?? '',
      active: json['active'] != false,
    );
  }
}
