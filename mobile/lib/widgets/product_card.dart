import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import 'image_viewer.dart';

/// Carte produit (accueil, catalogue, cave) — grande photo, nom, prix bien
/// visible, ancien prix barré et badge de remise si promo, bouton "+" pour
/// ajouter au panier. Équivalent de products.js côté web.
///
/// La photo prend toute la place disponible : la carte s'adapte à la
/// hauteur que lui donne la grille.
class ProductCard extends StatelessWidget {
  final Product product;

  const ProductCard({super.key, required this.product});

  int? get _discountPct {
    final old = product.oldPrice;
    if (!product.isPromoActive || old == null || old <= product.price) return null;
    return ((1 - product.price / old) * 100).round();
  }

  void _add(BuildContext context) {
    context.read<CartProvider>().add(product);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          duration: const Duration(seconds: 1),
          behavior: SnackBarBehavior.floating,
          content: Text('${product.name} ajouté au panier'),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final pct = _discountPct;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                product.imageUrl != null
                    ? GestureDetector(
                        // Toucher la photo l'ouvre en grand (zoom possible).
                        onTap: () => openImageViewer(context, product.imageUrl!,
                            title: product.name),
                        child: Image.network(
                          product.imageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: const Color(0xFFF3F4F6),
                            child: const Icon(Icons.image_not_supported_outlined,
                                color: AppColors.gray),
                          ),
                        ),
                      )
                    : Container(color: const Color(0xFFF3F4F6)),
                if (product.isPromoActive)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE53935),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        pct != null && pct > 0 ? '-$pct %' : 'PROMO',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 8, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.25,
                    color: AppColors.ink,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            formatFcfa(product.price),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: product.isPromoActive
                                  ? const Color(0xFFE53935)
                                  : AppColors.ink,
                            ),
                          ),
                          if (product.isPromoActive && product.oldPrice != null)
                            Text(
                              formatFcfa(product.oldPrice!),
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.gray,
                                decoration: TextDecoration.lineThrough,
                              ),
                            )
                          else if (product.unit.isNotEmpty)
                            Text(
                              product.unit,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: 11, color: AppColors.gray),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                    Material(
                      color: AppColors.orange,
                      shape: const CircleBorder(),
                      child: InkWell(
                        customBorder: const CircleBorder(),
                        onTap: () => _add(context),
                        child: const Padding(
                          padding: EdgeInsets.all(7),
                          child: Icon(Icons.add_shopping_cart,
                              color: Colors.white, size: 18),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
