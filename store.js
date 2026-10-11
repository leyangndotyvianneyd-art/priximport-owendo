// Magasin servi par ce serveur (un seul code pour les 9 Prix Import).
//
// Chaque magasin est décrit dans data/stores.json (nom, coordonnées,
// horaires, atouts...). Le magasin à servir se choisit au lancement :
//   node server.js golf          (ou npm start -- golf)
//   STORE_ID=golf node server.js (chez un hébergeur)
// Sans précision, c'est Prix Import Owendo.
//
// Données de chaque magasin (catalogue, publications, contenu, commandes,
// comptes admin, fichiers envoyés depuis l'admin) :
//   - Owendo : dans le dossier du projet (data/, assets/), comme avant ;
//   - les autres : dans stores/<id>/ (data/ et assets/), créé et pré-rempli
//     automatiquement au premier démarrage ;
//   - chez un hébergeur : STORAGE_DIR (disque persistant) pour tous.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DEFAULT_STORE_ID = 'owendo';
const STORES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'stores.json'), 'utf8'));

function getStore(id) {
  return STORES.find((s) => s.id === id) || null;
}

// Premier argument qui n'est pas une option (--all...), sinon STORE_ID.
function storeIdFromArgs(argv = process.argv.slice(2), env = process.env) {
  const arg = argv.find((a) => !a.startsWith('-'));
  return (arg || env.STORE_ID || DEFAULT_STORE_ID).trim().toLowerCase();
}

// Arrête le programme avec la liste des magasins si l'identifiant est inconnu.
function resolveStoreOrExit(id) {
  const store = getStore(id);
  if (!store) {
    console.error(`Magasin inconnu : « ${id} ». Magasins disponibles :`);
    STORES.forEach((s) => console.error(`  ${s.id.padEnd(15)} ${s.name}`));
    process.exit(1);
  }
  return store;
}

function storageDirFor(store, env = process.env) {
  if (env.STORAGE_DIR) return path.resolve(env.STORAGE_DIR);
  return store.id === DEFAULT_STORE_ID ? ROOT : path.join(ROOT, 'stores', store.id);
}

// Le magasin a-t-il cet atout (Cave, Boucherie...) ? Sans liste d'atouts
// renseignée (Owendo), toutes les sections du site restent affichées.
function hasFeature(store, feature) {
  if (!Array.isArray(store.features)) return true;
  const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return store.features.some((f) => norm(f) === norm(feature));
}

// Infos publiques du magasin (site web via window.STORE, appli via /api/store).
function publicStore(store) {
  return {
    id: store.id,
    name: store.name,
    shortName: store.shortName,
    orderPrefix: store.orderPrefix,
    contact: store.contact,
    features: store.features,
    surfaceM2: store.surfaceM2,
    hasCave: hasFeature(store, 'Cave')
  };
}

// ---- Pré-remplissage d'un nouveau magasin ----
// Au premier démarrage, un magasin part du catalogue d'Owendo (son gérant
// l'ajuste ensuite depuis l'admin), sans les publications Nouveautés
// d'Owendo, et avec ses propres coordonnées et horaires.

function readSeed(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', file), 'utf8'));
}

function seedContent(store) {
  // Textes d'Owendo, adaptés au magasin (modifiables ensuite depuis l'admin).
  const text = JSON.stringify(readSeed('content.json'))
    .replace(/Livraison à Owendo & Libreville/g, 'Livraison dans tout Libreville')
    .replace(/sur Owendo et Libreville/g, 'dans tout Libreville')
    .replace(/les pêcheurs du port d'Owendo/g, 'les pêcheurs de la région')
    .replace(/Owendo/g, store.shortName);
  const content = JSON.parse(text);
  const c = store.contact || {};
  content.contact = {
    address: c.address || `${store.shortName}, Libreville, Gabon`,
    phone: c.phone || '',
    email: c.email || '',
    whatsapp: c.whatsapp || ''
  };
  content.mapCaption = c.address || `${store.name} — Libreville`;
  content.footerTagline = `Supermarché de produits importés et de fraîcheur locale — ${store.name}, Libreville. Prix bas, gros volumes, paiement Mobile Money.`;
  content.hours = (store.hours || []).map((h) => ({ id: h.id, label: h.label, value: h.value || 'Nous consulter' }));
  if (content.heroSlider) content.heroSlider.slides = [];
  return content;
}

function seedProducts(store) {
  const products = readSeed('products.json');
  return hasFeature(store, 'Cave') ? products : products.filter((p) => p.category !== 'Cave à vin');
}

// Crée les fichiers de données manquants du magasin (jamais d'écrasement).
function ensureStoreData(store, storageDir) {
  const dataDir = path.join(storageDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  if (storageDir === ROOT) return dataDir;
  const isOwendo = store.id === DEFAULT_STORE_ID;
  const seeds = {
    'products.json': () => (isOwendo ? readSeed('products.json') : seedProducts(store)),
    'posts.json': () => (isOwendo ? readSeed('posts.json') : []),
    'content.json': () => (isOwendo ? readSeed('content.json') : seedContent(store))
  };
  for (const [file, build] of Object.entries(seeds)) {
    const target = path.join(dataDir, file);
    if (!fs.existsSync(target)) fs.writeFileSync(target, JSON.stringify(build(), null, 2) + '\n');
  }
  return dataDir;
}

module.exports = {
  ROOT,
  STORES,
  DEFAULT_STORE_ID,
  getStore,
  storeIdFromArgs,
  resolveStoreOrExit,
  storageDirFor,
  hasFeature,
  publicStore,
  ensureStoreData
};
