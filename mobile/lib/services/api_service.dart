import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/product.dart';
import '../models/post.dart';
import '../models/site_content.dart';
import '../config/store_info.dart';

/// Adresse du serveur Node (server.js) consommé par l'appli.
///
/// L'adresse locale du PC change souvent (attribution DHCP par le routeur),
/// donc elle n'est plus codée en dur : elle est modifiable depuis l'appli
/// (écran Réglages, accessible depuis le menu) sans recompiler. La valeur
/// ci-dessous n'est que le point de départ tant que rien n'a été enregistré.
///
/// - Émulateur Android : "http://10.0.2.2:3000" (10.0.2.2 est l'alias que
///   l'émulateur utilise pour désigner le "localhost" de ton PC).
/// - Téléphone/tablette réel(le) sur le même Wi-Fi que ton PC : adresse IP
///   locale du PC, ex. "http://192.168.1.73:3000" (trouvable avec
///   `ipconfig` sous Windows, ligne "Adresse IPv4").
/// - iOS Simulator (Mac) : "http://localhost:3000" fonctionne directement.
///
/// Le serveur (`npm start` dans le dossier du site) doit tourner pendant
/// que tu testes l'appli.
class ApiConfig {
  /// Adresse publique du serveur, fixée à la compilation de la version
  /// grand public :
  ///   flutter build apk --release --dart-define=API_URL=https://mon-site.com
  /// Quand elle est fournie, l'appli l'utilise toujours et l'écran
  /// "Réglages du serveur" est masqué (les clients n'ont pas à y toucher).
  static const String publicUrl = String.fromEnvironment('API_URL');
  static bool get isPublicBuild => publicUrl.isNotEmpty;

  /// Port du magasin de cette appli (data/stores.json : Owendo 3000,
  /// Centre Ville 3001...), comme `npm run start-all` côté serveur.
  static String get defaultBaseUrl => publicUrl != ''
      ? publicUrl
      : 'http://192.168.1.69:${StoreConfig.current.port}';
  static const String _prefsKey = 'server_base_url';

  static String _baseUrl = defaultBaseUrl;

  static String get baseUrl => _baseUrl;

  /// À appeler une fois au démarrage de l'appli (avant runApp) pour
  /// recharger l'adresse enregistrée par l'utilisateur, si elle existe.
  static Future<void> init() async {
    if (isPublicBuild) return;
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_prefsKey);
    if (saved != null && saved.trim().isNotEmpty) {
      _baseUrl = saved.trim();
    }
  }

  /// Transforme un chemin relatif du serveur (ex. "assets/videos/x.mp4")
  /// en URL complète — comme resolveAsset() dans assets/js/posts.js.
  static String? resolveAsset(String? src) {
    final s = src?.trim() ?? '';
    if (s.isEmpty) return null;
    if (RegExp(r'^https?://').hasMatch(s)) return s;
    return '$_baseUrl/${s.replaceFirst(RegExp(r'^/+'), '')}';
  }

  /// Image produit : URL complète, ou simple nom de fichier rangé dans
  /// assets/img/products/ — comme resolveImage() dans assets/js/products.js.
  static String? resolveProductImage(String? image) {
    final s = image?.trim() ?? '';
    if (s.isEmpty) return null;
    if (RegExp(r'^https?://').hasMatch(s)) return s;
    if (s.startsWith('assets/')) return resolveAsset(s);
    return '$_baseUrl/assets/img/products/$s';
  }

  /// Enregistre une nouvelle adresse serveur (persistée sur l'appareil) et
  /// l'utilise immédiatement pour tous les appels API suivants.
  static Future<void> setBaseUrl(String url) async {
    final trimmed = url.trim().replaceAll(RegExp(r'/+$'), '');
    _baseUrl = trimmed.isEmpty ? defaultBaseUrl : trimmed;
    final prefs = await SharedPreferences.getInstance();
    if (trimmed.isEmpty) {
      await prefs.remove(_prefsKey);
    } else {
      await prefs.setString(_prefsKey, _baseUrl);
    }
  }
}

class ApiService {
  static Uri _u(String path) => Uri.parse('${ApiConfig.baseUrl}$path');

  static Future<List<Product>> fetchProducts() =>
      fetchProductsFrom(ApiConfig.baseUrl);

  /// Comme [fetchProducts], mais contre une adresse serveur donnée plutôt
  /// que l'adresse enregistrée — utilisé par l'écran Réglages pour tester
  /// une adresse avant de l'enregistrer.
  static Future<List<Product>> fetchProductsFrom(String baseUrl) async {
    final res = await http
        .get(Uri.parse('$baseUrl/api/products'))
        .timeout(const Duration(seconds: 10));
    if (res.statusCode != 200) {
      throw Exception('Impossible de charger le catalogue.');
    }
    final List<dynamic> data = jsonDecode(utf8.decode(res.bodyBytes));
    return data
        .map((e) => Product.fromJson(e as Map<String, dynamic>))
        .where((p) => p.active)
        .toList();
  }

  static SiteContent? _contentCache;

  /// Dernier contenu chargé (pour les écrans qui en ont besoin tout de
  /// suite, ex. numéro WhatsApp du panier). Null tant que rien n'est chargé.
  static SiteContent? get cachedContent => _contentCache;

  /// Contenu modifiable depuis l'admin (coordonnées, horaires, cartes).
  /// Gardé en mémoire ; [refresh] force un nouveau chargement.
  static Future<SiteContent> fetchContent({bool refresh = false}) async {
    if (_contentCache != null && !refresh) return _contentCache!;
    final res = await http
        .get(_u('/api/content'))
        .timeout(const Duration(seconds: 10));
    if (res.statusCode != 200) {
      throw Exception('Impossible de charger les informations du magasin.');
    }
    final Map<String, dynamic> data = jsonDecode(utf8.decode(res.bodyBytes));
    return _contentCache = SiteContent.fromJson(data);
  }

  static Future<List<Post>> fetchPosts() async {
    final res = await http
        .get(_u('/api/posts'))
        .timeout(const Duration(seconds: 10));
    if (res.statusCode != 200) {
      throw Exception('Impossible de charger les publications.');
    }
    final List<dynamic> data = jsonDecode(utf8.decode(res.bodyBytes));
    return data.map((e) => Post.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Envoie une commande au serveur. Retourne la référence de commande
  /// générée par le serveur en cas de succès.
  static Future<Map<String, dynamic>> sendOrder({
    required List<Map<String, dynamic>> items,
    required Map<String, dynamic> customer,
  }) async {
    final res = await http
        .post(
          _u('/api/commande'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'items': items, 'customer': customer}),
        )
        .timeout(const Duration(seconds: 10));

    final Map<String, dynamic> body = jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode != 200 || body['success'] != true) {
      throw OrderRejected(body['error']?.toString() ?? 'Erreur lors de la commande.');
    }
    return body;
  }
}

/// Le serveur a bien reçu la commande mais la refuse (produit retiré,
/// quantité invalide...) — à distinguer d'une panne réseau.
class OrderRejected implements Exception {
  final String message;
  OrderRejected(this.message);

  @override
  String toString() => message;
}
