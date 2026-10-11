import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'providers/cart_provider.dart';
import 'screens/main_shell.dart';
import 'services/api_service.dart';
import 'theme/app_theme.dart';
import 'config/store_info.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiConfig.init();
  runApp(const PrixImportApp());
}

class PrixImportApp extends StatelessWidget {
  const PrixImportApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => CartProvider(),
      child: MaterialApp(
        title: StoreConfig.current.name,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.theme,
        home: const MainShell(),
      ),
    );
  }
}
