import 'package:flutter/material.dart';

import '../models/rayon.dart';
import 'rayon_screen.dart';

/// Page Cave à vin — un rayon comme les autres (voir RayonScreen).
class CaveScreen extends StatelessWidget {
  const CaveScreen({super.key});

  @override
  Widget build(BuildContext context) => const RayonScreen(rayon: Rayons.cave);
}
