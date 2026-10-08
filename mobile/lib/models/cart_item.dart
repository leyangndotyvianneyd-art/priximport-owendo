import 'product.dart';

/// Un article du panier : un produit + une quantité choisie par le client.
class CartItem {
  final Product product;
  int qty;

  CartItem({required this.product, this.qty = 1});

  num get subtotal => product.price * qty;

  Map<String, dynamic> toOrderJson() => {
        'id': product.id,
        'name': product.name,
        'price': product.price,
        'qty': qty,
      };

  Map<String, dynamic> toStorageJson() => {
        'id': product.id,
        'name': product.name,
        'unit': product.unit,
        'price': product.price,
        'category': product.category,
        'image': product.image,
        if (product.leadTime != null) 'leadTime': product.leadTime,
        'qty': qty,
      };
}
