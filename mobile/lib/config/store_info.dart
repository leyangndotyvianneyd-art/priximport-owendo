import 'package:flutter/services.dart' show appFlavor;

import 'stores.g.dart';

/// Un magasin Prix Import (même fiche que data/stores.json côté serveur).
class StoreInfo {
  final String id;
  final String name;
  final String shortName;
  final String orderPrefix;
  final int port;
  final String phone;

  /// Chiffres uniquement (format wa.me) ; vide si pas encore renseigné.
  final String whatsapp;

  /// Atouts (Boucherie, Cave...) ; null = non renseignés, tout est affiché.
  final List<String>? features;
  final int? surfaceM2;

  const StoreInfo({
    required this.id,
    required this.name,
    required this.shortName,
    required this.orderPrefix,
    required this.port,
    required this.phone,
    required this.whatsapp,
    required this.features,
    required this.surfaceM2,
  });

  bool hasFeature(String feature) {
    final list = features;
    if (list == null) return true;
    String norm(String s) => s
        .toLowerCase()
        .replaceAll(RegExp('[éèêë]'), 'e')
        .replaceAll(RegExp('[àâ]'), 'a')
        .replaceAll(RegExp('[ôö]'), 'o');
    return list.any((f) => norm(f) == norm(feature));
  }

  bool get hasCave => hasFeature('Cave');
}

/// Magasin de cette appli, choisi à la compilation :
///   flutter run --flavor golf            (Android : nom et icône d'appli propres)
///   flutter run --dart-define=STORE_ID=golf   (autres plateformes)
/// Sans précision : Prix Import Owendo.
class StoreConfig {
  static const String _defineId = String.fromEnvironment('STORE_ID');

  static final StoreInfo current = allStores[appFlavor] ??
      allStores[_defineId] ??
      allStores['owendo']!;
}
