import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/product.dart';
import '../models/post.dart';

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
  static const String defaultBaseUrl = 'http://192.168.1.73:3000';
  static const String _prefsKey = 'server_base_url';

  static String _baseUrl = defaultBaseUrl;

  static String get baseUrl => _baseUrl;

  /// À appeler une fois au démarrage de l'appli (avant runApp) pour
  /// recharger l'adresse enregistrée par l'utilisateur, si elle existe.
  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_prefsKey);
    if (saved != null && saved.trim().isNotEmpty) {
      _baseUrl = saved.trim();
    }
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
      throw Exception(body['error'] ?? 'Erreur lors de la commande.');
    }
    return body;
  }
}
