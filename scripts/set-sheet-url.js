// Relie un magasin à sa feuille Google Sheets de suivi des commandes.
//
//   npm run set-sheet                          (liste les magasins reliés ou non)
//   npm run set-sheet -- golf https://script.google.com/macros/s/.../exec
//   npm run set-sheet -- golf https://.../exec --test   (+ envoie une commande test)
//
// Le lien est enregistré dans le champ "googleSheetWebhookUrl" du magasin
// (data/stores.json). Relance ensuite le serveur du magasin pour qu'il soit
// pris en compte. Création de la feuille et du lien : voir README.md.

const fs = require('fs');
const path = require('path');
const { STORES, resolveStoreOrExit } = require('../store');

const STORES_FILE = path.join(__dirname, '..', 'data', 'stores.json');
const args = process.argv.slice(2);
const sendTest = args.includes('--test');
const [storeId, url] = args.filter((a) => !a.startsWith('--'));

function listStores() {
  console.log('Suivi Google Sheets des commandes :');
  STORES.forEach((s) => {
    const status = s.googleSheetWebhookUrl ? 'relié' : 'PAS DE FEUILLE';
    console.log(`  ${s.id.padEnd(15)} ${s.name.padEnd(45)} ${status}`);
  });
  console.log('\nPour relier un magasin : npm run set-sheet -- <magasin> <lien /exec>');
}

async function sendTestOrder(store, webhookUrl) {
  const order = {
    reference: `${store.orderPrefix}-TEST`,
    store: store.name,
    date: new Date().toISOString(),
    customer: { name: 'Commande test (à supprimer)', phone: '', mode: 'retrait', address: '' },
    items: [{ id: 'test', name: 'Article test', price: 0, qty: 1 }],
    total: 0
  };
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });
  const text = await res.text();
  if (!res.ok || !text.includes('"ok":true')) {
    throw new Error(`réponse inattendue (HTTP ${res.status}). Vérifie que le déploiement est en "Application Web", accès "Tout le monde".`);
  }
}

async function main() {
  if (!storeId) return listStores();
  const store = resolveStoreOrExit(storeId);
  if (!url) {
    console.error(`Lien manquant. Exemple : npm run set-sheet -- ${store.id} https://script.google.com/macros/s/.../exec`);
    process.exit(1);
  }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) {
    console.error('Ce lien ne ressemble pas à un lien d\'Application Web Google Apps Script');
    console.error('(attendu : https://script.google.com/macros/s/.../exec).');
    process.exit(1);
  }
  const other = STORES.find((s) => s.id !== store.id && s.googleSheetWebhookUrl === url);
  if (other) {
    console.warn(`Attention : ce lien est déjà celui de ${other.name}. Les deux magasins écriront dans la même feuille.`);
  }

  // Relecture du fichier pour ne modifier que ce champ.
  const stores = JSON.parse(fs.readFileSync(STORES_FILE, 'utf8'));
  stores.find((s) => s.id === store.id).googleSheetWebhookUrl = url;
  fs.writeFileSync(STORES_FILE, JSON.stringify(stores, null, 2) + '\n');
  console.log(`${store.name} est relié à sa feuille Google Sheets.`);

  if (sendTest) {
    try {
      await sendTestOrder(store, url);
      console.log('Commande test envoyée : vérifie l\'onglet "Commandes" puis supprime la ligne de test.');
    } catch (err) {
      console.error('Échec de la commande test :', err.message);
      process.exit(1);
    }
  }
  console.log('Relance le serveur de ce magasin pour prendre le lien en compte.');
}

main();
