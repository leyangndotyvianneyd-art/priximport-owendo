// Test de fumée basique : vérifie que l'application démarre sans planter
// et affiche bien l'écran d'accueil (PRIX IMPORT OWENDO).
import 'package:flutter_test/flutter_test.dart';

import 'package:priximport_owendo_mobile/main.dart';

void main() {
  testWidgets('App starts and shows the home screen', (tester) async {
    await tester.pumpWidget(const PrixImportOwendoApp());
    await tester.pump();

    expect(find.text('PRIX IMPORT OWENDO'), findsOneWidget);
  });
}
