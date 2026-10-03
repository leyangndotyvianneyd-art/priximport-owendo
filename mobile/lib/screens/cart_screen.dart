import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../providers/cart_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';

/// Numéro WhatsApp du magasin, utilisé pour la confirmation de commande
/// (même numéro que assets/js/panier-page.js côté site web).
/// Numéro WhatsApp de secours, si le contenu de l'admin n'a pas pu être
/// chargé. Le vrai numéro vient de l'admin (onglet "Contenu du site").
const String fallbackShopPhone = '24107413215';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  String _mode = 'retrait';
  bool _sending = false;
  Map<String, dynamic>? _confirmation;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  String _generateOfflineReference() {
    final now = DateTime.now().millisecondsSinceEpoch;
    return 'PIO-${now.toRadixString(36).toUpperCase()}';
  }

  Future<void> _submit(CartProvider cart) async {
    if (_nameCtrl.text.trim().isEmpty || _phoneCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nom et téléphone requis.')),
      );
      return;
    }
    if (_mode == 'livraison' && _addressCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Adresse requise pour la livraison.')),
      );
      return;
    }

    setState(() => _sending = true);

    final items = cart.items.map((i) => i.toOrderJson()).toList();
    final customer = {
      'name': _nameCtrl.text.trim(),
      'phone': _phoneCtrl.text.trim(),
      'mode': _mode,
      if (_mode == 'livraison') 'address': _addressCtrl.text.trim(),
    };

    Map<String, dynamic> result;
    try {
      result = await ApiService.sendOrder(items: items, customer: customer);
    } on OrderRejected catch (e) {
      // Le serveur refuse la commande : on l'explique, sans vider le panier.
      if (!mounted) return;
      setState(() => _sending = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), duration: const Duration(seconds: 5)),
      );
      return;
    } catch (_) {
      // Le serveur est injoignable (pas de Wi-Fi, serveur éteint...) :
      // on ne bloque jamais la commande, comme sur le site web.
      final total = cart.total;
      result = {
        'success': true,
        'reference': _generateOfflineReference(),
        'total': total,
        'offline': true,
      };
    }

    if (!mounted) return;
    setState(() {
      _sending = false;
      _confirmation = result;
    });
    cart.clear();
  }

  Future<void> _confirmOnWhatsApp(CartProvider cart, String reference) async {
    final total = _confirmation?['total'] ?? 0;
    final text = Uri.encodeComponent(
      'Bonjour, je confirme ma commande $reference '
      '(${formatFcfa(total is num ? total : 0)}) — ${_nameCtrl.text.trim()}.',
    );
    String shopPhone = fallbackShopPhone;
    try {
      final wa = (await ApiService.fetchContent()).whatsapp;
      if (wa.isNotEmpty) shopPhone = wa;
    } catch (_) {
      // Hors connexion : numéro de secours.
    }
    final uri = Uri.parse('https://wa.me/$shopPhone?text=$text');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Impossible d'ouvrir WhatsApp.")),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Mon panier')),
      body: _confirmation != null
          ? _buildConfirmation(cart)
          : cart.isEmpty
              ? _buildEmpty()
              : _buildCart(cart),
    );
  }

  Widget _buildEmpty() {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.shopping_cart_outlined, size: 46, color: AppColors.gray),
            SizedBox(height: 12),
            Text('Votre panier est vide.', style: TextStyle(color: AppColors.gray)),
          ],
        ),
      ),
    );
  }

  Widget _buildCart(CartProvider cart) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        for (final item in cart.items)
          Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ListTile(
              contentPadding: const EdgeInsets.all(10),
              leading: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: 52,
                  height: 52,
                  child: item.product.imageUrl != null
                      ? Image.network(item.product.imageUrl!, fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) =>
                              Container(color: AppColors.grayLight))
                      : Container(color: AppColors.grayLight),
                ),
              ),
              title: Text(item.product.name,
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text(formatFcfa(item.product.price)),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.remove_circle_outline, size: 20),
                    onPressed: () =>
                        cart.setQty(item.product.id, item.qty - 1),
                  ),
                  Text('${item.qty}'),
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline, size: 20),
                    onPressed: () =>
                        cart.setQty(item.product.id, item.qty + 1),
                  ),
                ],
              ),
            ),
          ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Total', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            Text(formatFcfa(cart.total),
                style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 18,
                    color: AppColors.green)),
          ],
        ),
        const Divider(height: 32),
        Text('Vos coordonnées', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        TextField(
          controller: _nameCtrl,
          decoration: const InputDecoration(labelText: 'Nom complet'),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _phoneCtrl,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(labelText: 'Téléphone'),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: RadioListTile<String>(
                contentPadding: EdgeInsets.zero,
                dense: true,
                value: 'retrait',
                groupValue: _mode,
                title: const Text('Retrait'),
                onChanged: (v) => setState(() => _mode = v!),
              ),
            ),
            Expanded(
              child: RadioListTile<String>(
                contentPadding: EdgeInsets.zero,
                dense: true,
                value: 'livraison',
                groupValue: _mode,
                title: const Text('Livraison'),
                onChanged: (v) => setState(() => _mode = v!),
              ),
            ),
          ],
        ),
        if (_mode == 'livraison') ...[
          const SizedBox(height: 6),
          TextField(
            controller: _addressCtrl,
            decoration: const InputDecoration(labelText: 'Adresse de livraison'),
          ),
        ],
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _sending ? null : () => _submit(cart),
            child: _sending
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Text('Valider la commande'),
          ),
        ),
      ],
    );
  }

  Widget _buildConfirmation(CartProvider cart) {
    final reference = _confirmation?['reference'] ?? '';
    final offline = _confirmation?['offline'] == true;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle, color: AppColors.green, size: 56),
            const SizedBox(height: 14),
            Text('Commande enregistrée',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text('Référence : $reference',
                style: const TextStyle(fontWeight: FontWeight.w600)),
            if (offline) ...[
              const SizedBox(height: 8),
              const Text(
                "Connexion au serveur indisponible : confirme directement "
                "ta commande sur WhatsApp ci-dessous.",
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.gray, fontSize: 13),
              ),
            ],
            const SizedBox(height: 20),
            ElevatedButton.icon(
              icon: const Icon(Icons.chat),
              label: const Text('Confirmer sur WhatsApp'),
              onPressed: () => _confirmOnWhatsApp(cart, reference),
            ),
            const SizedBox(height: 10),
            TextButton(
              onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
              child: const Text("Retour à l'accueil"),
            ),
          ],
        ),
      ),
    );
  }
}
