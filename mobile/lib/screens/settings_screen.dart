import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../config/store_info.dart';

/// Écran Réglages : permet de changer l'adresse du serveur (server.js)
/// sans recompiler l'appli — utile car l'IP locale du PC change souvent.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final TextEditingController _controller;
  bool _testing = false;
  String? _testResult;
  bool? _testOk;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: ApiConfig.baseUrl);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _applyPreset(String url) {
    setState(() {
      _controller.text = url;
      _testResult = null;
    });
  }

  Future<void> _testConnection() async {
    setState(() {
      _testing = true;
      _testResult = null;
      _testOk = null;
    });
    final urlText = _controller.text.trim();
    try {
      // On teste directement l'adresse saisie, sans encore l'enregistrer,
      // pour que l'utilisateur sache si elle fonctionne avant de valider.
      final products = await ApiService.fetchProductsFrom(urlText);
      setState(() {
        _testOk = true;
        _testResult = 'Connexion réussie — ${products.length} produit(s) trouvé(s).';
      });
    } catch (e) {
      setState(() {
        _testOk = false;
        _testResult = "Échec de connexion. Vérifie que le serveur tourne (npm start), "
            "que le téléphone est sur le même Wi-Fi que le PC, et que l'adresse est correcte.";
      });
    } finally {
      if (mounted) setState(() => _testing = false);
    }
  }

  Future<void> _save() async {
    await ApiConfig.setBaseUrl(_controller.text);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Adresse du serveur enregistrée.')),
    );
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Réglages du serveur')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            "Adresse du serveur Node (server.js) que l'appli utilise pour "
            'charger le catalogue, les nouveautés et envoyer les commandes.',
            style: TextStyle(color: AppColors.gray),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _controller,
            keyboardType: TextInputType.url,
            decoration: const InputDecoration(
              labelText: 'Adresse du serveur',
              hintText: 'http://192.168.1.73:3000',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ActionChip(
                label: const Text('Émulateur Android'),
                onPressed: () => _applyPreset('http://10.0.2.2:${StoreConfig.current.port}'),
              ),
              ActionChip(
                label: const Text('Simulateur iOS'),
                onPressed: () => _applyPreset('http://localhost:${StoreConfig.current.port}'),
              ),
              ActionChip(
                label: const Text('Valeur par défaut'),
                onPressed: () => _applyPreset(ApiConfig.defaultBaseUrl),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Pour un téléphone/tablette réel sur le même Wi-Fi que le PC, '
            "utilise l'adresse IP locale du PC (commande `ipconfig` sous "
            'Windows, ligne "Adresse IPv4"), par ex. http://192.168.1.73:3000.',
            style: TextStyle(color: AppColors.gray, fontSize: 12),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: _testing ? null : _testConnection,
            icon: _testing
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.wifi_tethering),
            label: const Text('Tester la connexion'),
          ),
          if (_testResult != null) ...[
            const SizedBox(height: 12),
            Text(
              _testResult!,
              style: TextStyle(
                color: _testOk == true ? AppColors.green : Colors.red,
              ),
            ),
          ],
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _save,
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
  }
}
