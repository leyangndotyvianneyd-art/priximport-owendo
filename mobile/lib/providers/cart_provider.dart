import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/cart_item.dart';
import '../models/product.dart';

/// Panier de l'appli, équivalent mobile de assets/js/cart.js (localStorage)
/// côté site web. Persisté avec SharedPreferences pour survivre à la
/// fermeture de l'appli.
class CartProvider extends ChangeNotifier {
  static const _storageKey = 'pio_cart_v1';

  final List<CartItem> _items = [];
  bool _loaded = false;

  List<CartItem> get items => List.unmodifiable(_items);

  int get count => _items.fold(0, (sum, i) => sum + i.qty);

  num get total => _items.fold(0, (sum, i) => sum + i.subtotal);

  bool get isEmpty => _items.isEmpty;

  CartProvider() {
    _restore();
  }

  Future<void> _restore() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_storageKey);
      if (raw != null && raw.isNotEmpty) {
        final List<dynamic> data = jsonDecode(raw);
        for (final entry in data) {
          final map = entry as Map<String, dynamic>;
          final product = Product(
            id: map['id']?.toString() ?? '',
            name: map['name']?.toString() ?? '',
            unit: map['unit']?.toString() ?? '',
            price: (map['price'] as num?) ?? 0,
            category: map['category']?.toString() ?? '',
            image: map['image']?.toString() ?? '',
          );
          _items.add(CartItem(product: product, qty: (map['qty'] as num?)?.toInt() ?? 1));
        }
      }
    } catch (_) {
      // Panier vide si la lecture échoue — jamais bloquant.
    }
    _loaded = true;
    notifyListeners();
  }

  Future<void> _persist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = _items.map((i) => i.toStorageJson()).toList();
      await prefs.setString(_storageKey, jsonEncode(data));
    } catch (_) {
      // On ne bloque jamais l'usage du panier si la sauvegarde échoue.
    }
  }

  bool get isReady => _loaded;

  void add(Product product, {int qty = 1}) {
    final index = _items.indexWhere((i) => i.product.id == product.id);
    if (index >= 0) {
      _items[index].qty += qty;
    } else {
      _items.add(CartItem(product: product, qty: qty));
    }
    notifyListeners();
    _persist();
  }

  void setQty(String productId, int qty) {
    final index = _items.indexWhere((i) => i.product.id == productId);
    if (index < 0) return;
    if (qty <= 0) {
      _items.removeAt(index);
    } else {
      _items[index].qty = qty;
    }
    notifyListeners();
    _persist();
  }

  void remove(String productId) {
    _items.removeWhere((i) => i.product.id == productId);
    notifyListeners();
    _persist();
  }

  void clear() {
    _items.clear();
    notifyListeners();
    _persist();
  }
}
