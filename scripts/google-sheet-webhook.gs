// Script Google Apps Script à coller dans la feuille Google Sheets d'un
// magasin (Extensions → Apps Script), puis à déployer en "Application Web".
// Le même script sert pour les 9 magasins : il n'y a rien à modifier.
// Marche à suivre complète : README.md, "Suivi des commandes dans Google Sheets".
//
// L'onglet "Commandes" et sa ligne d'en-têtes sont créés automatiquement
// à la première commande s'ils n'existent pas.

var HEADERS = ['Date', 'Référence', 'Magasin', 'Client', 'Téléphone', 'Mode', 'Adresse', 'Articles', 'Total (FCFA)'];

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Commandes');
  if (!sheet) sheet = ss.insertSheet('Commandes');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  var data = JSON.parse(e.postData.contents);
  var itemsText = (data.items || []).map(function (i) {
    return i.qty + 'x ' + i.name;
  }).join(', ');

  sheet.appendRow([
    new Date(data.date),
    data.reference,
    data.store || '',
    data.customer.name,
    data.customer.phone,
    data.customer.mode === 'livraison' ? 'Livraison' : 'Retrait en magasin',
    data.customer.address || '',
    itemsText,
    data.total
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
