import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';

/// Carte produit du catalogue — image, nom, unité, prix (barré si promo)
/// et bouton "Ajouter au panier", équivalent de products.js côté web.
class ProductCard extends StatelessWidget {
  final Product product;

  const ProductCard({super.key, required this.product});

  @override
  Widget build(BuildContext context) {
    final cart = context.read<CartProvider>();

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 1.3,
            child: Stack(
              fit: StackFit.expand,
              children: [
                product.image.isNotEmpty
                    ? Image.network(
                        product.image,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          color: AppColors.grayLight,
                          child: const Icon(Icons.image_not_supported_outlined,
                              color: AppColors.gray),
                        ),
                      )
                    : Container(color: AppColors.grayLight),
                if (product.isPromoActive)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.orange,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'PROMO',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontSize: 13.5),
                ),
                const SizedBox(height: 2),
                Text(
                  product.unit,
                  style: const TextStyle(fontSize: 11.5, color: AppColors.gray),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    if (product.isPromoActive && product.oldPrice != null)
                      Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: Text(
                          formatFcfa(product.oldPrice!),
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.gray,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                      ),
                    Expanded(
                      child: Text(
                        formatFcfa(product.price),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.green,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      textStyle: const TextStyle(fontSize: 12.5),
                    ),
                    onPressed: () {
                      cart.add(product);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          duration: const Duration(seconds: 1),
                          content: Text('${product.name} ajouté au panier'),
                        ),
                      );
                    },
                    child: const Text('Ajouter'),
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
