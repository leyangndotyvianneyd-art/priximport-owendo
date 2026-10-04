import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/cart_provider.dart';
import '../theme/app_theme.dart';
import 'cart_screen.dart';
import 'catalogue_screen.dart';
import 'contact_screen.dart';
import 'home_screen.dart';

/// Onglet affiché par la barre du bas (0 Accueil, 1 Catalogue, 2 Panier,
/// 3 Contact). Modifiable depuis n'importe où via [openShellTab].
final shellTab = ValueNotifier<int>(0);

class ShellTabs {
  static const home = 0;
  static const catalogue = 1;
  static const cart = 2;
  static const contact = 3;
}

/// Revient à l'écran principal et affiche l'onglet [index] de la barre du
/// bas — utilisé par le menu latéral et l'icône panier.
void openShellTab(BuildContext context, int index) {
  Navigator.of(context).popUntil((route) => route.isFirst);
  shellTab.value = index;
}

/// Écran principal de l'appli : les 4 onglets les plus utilisés, avec une
/// barre de navigation en bas comme les grandes applis de shopping. Les
/// autres rubriques (Fraîcheur, Cave à vin, Nouveautés...) s'ouvrent depuis
/// l'accueil ou le menu ☰.
class MainShell extends StatelessWidget {
  const MainShell({super.key});

  static const _pages = [
    HomeScreen(),
    CatalogueScreen(),
    CartScreen(),
    ContactScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final count = context.watch<CartProvider>().count;
    return ValueListenableBuilder<int>(
      valueListenable: shellTab,
      builder: (context, index, _) => PopScope(
        // Le bouton retour ramène d'abord à l'accueil avant de quitter l'appli.
        canPop: index == ShellTabs.home,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) shellTab.value = ShellTabs.home;
        },
        child: Scaffold(
          body: IndexedStack(index: index, children: _pages),
          bottomNavigationBar: NavigationBarTheme(
            data: NavigationBarThemeData(
              backgroundColor: Colors.white,
              indicatorColor: AppColors.orange.withValues(alpha: 0.14),
              labelTextStyle: WidgetStateProperty.resolveWith(
                (states) => TextStyle(
                  fontSize: 12,
                  fontWeight: states.contains(WidgetState.selected)
                      ? FontWeight.w700
                      : FontWeight.w500,
                  color: states.contains(WidgetState.selected)
                      ? AppColors.orange
                      : AppColors.ink,
                ),
              ),
              iconTheme: WidgetStateProperty.resolveWith(
                (states) => IconThemeData(
                  color: states.contains(WidgetState.selected)
                      ? AppColors.orange
                      : AppColors.ink,
                ),
              ),
            ),
            child: NavigationBar(
              height: 66,
              selectedIndex: index,
              onDestinationSelected: (i) => shellTab.value = i,
              destinations: [
                const NavigationDestination(
                  icon: Icon(Icons.home_outlined),
                  selectedIcon: Icon(Icons.home),
                  label: 'Accueil',
                ),
                const NavigationDestination(
                  icon: Icon(Icons.grid_view_outlined),
                  selectedIcon: Icon(Icons.grid_view_rounded),
                  label: 'Catalogue',
                ),
                NavigationDestination(
                  icon: Badge(
                    isLabelVisible: count > 0,
                    backgroundColor: const Color(0xFFE53935),
                    label: Text(count > 99 ? '99+' : '$count'),
                    child: const Icon(Icons.shopping_cart_outlined),
                  ),
                  selectedIcon: Badge(
                    isLabelVisible: count > 0,
                    backgroundColor: const Color(0xFFE53935),
                    label: Text(count > 99 ? '99+' : '$count'),
                    child: const Icon(Icons.shopping_cart),
                  ),
                  label: 'Panier',
                ),
                const NavigationDestination(
                  icon: Icon(Icons.chat_bubble_outline),
                  selectedIcon: Icon(Icons.chat_bubble),
                  label: 'Contact',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
