/// Formate un montant en FCFA avec séparateur de milliers,
/// comme le fait `toLocaleString('fr-FR')` côté site web.
/// Ex : 12500 -> "12 500 FCFA"
String formatFcfa(num value) {
  final rounded = value.round();
  final str = rounded.abs().toString();
  final buffer = StringBuffer();
  for (int i = 0; i < str.length; i++) {
    final posFromEnd = str.length - i;
    buffer.write(str[i]);
    if (posFromEnd > 1 && posFromEnd % 3 == 1) {
      buffer.write(' ');
    }
  }
  final sign = rounded < 0 ? '-' : '';
  return '$sign${buffer.toString()} FCFA';
}
