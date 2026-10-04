// Repart d'une liste de commandes vide (passage de la démo au réel).
//
// Utilisation :
//   npm run reset-orders
//
// Les commandes actuelles de data/orders.json ne sont jamais supprimées :
// elles sont d'abord copiées dans data/orders.backup-<date>.json (fichier
// privé, ignoré par Git), puis data/orders.json est remis à zéro. Le script
// demande de taper OUI avant de faire quoi que ce soit.
//
// Le serveur peut rester allumé : il relit le fichier à chaque commande.

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Même emplacement que celui lu par server.js (STORAGE_DIR chez un hébergeur).
const STORAGE_DIR = process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : path.join(__dirname, '..');
const DATA_DIR = path.join(STORAGE_DIR, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}h${p(d.getMinutes())}`;
}

let orders = [];
if (fs.existsSync(ORDERS_FILE)) {
  try {
    orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8') || '[]');
  } catch (e) {
    console.error('data/orders.json est illisible, rien n\'a été modifié :', e.message);
    process.exit(1);
  }
}

console.log('=== Remise à zéro des commandes ===\n');
if (!orders.length) {
  console.log('data/orders.json est déjà vide : rien à faire.');
  process.exit(0);
}
console.log(`${orders.length} commande(s) actuellement dans data/orders.json.`);
console.log('Elles seront mises de côté dans une copie de sauvegarde, puis la');
console.log('liste repartira de zéro pour les vraies commandes.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Tape OUI pour continuer : ', (answer) => {
  rl.close();
  if (answer.trim().toUpperCase() !== 'OUI') {
    console.log('\nAnnulé : rien n\'a été modifié.');
    return;
  }
  const backup = path.join(DATA_DIR, `orders.backup-${stamp()}.json`);
  fs.copyFileSync(ORDERS_FILE, backup);
  fs.writeFileSync(ORDERS_FILE, '[]\n');
  console.log(`\nSauvegarde des anciennes commandes : data/${path.basename(backup)}`);
  console.log('data/orders.json est maintenant vide, prêt pour les vraies commandes.');
});
