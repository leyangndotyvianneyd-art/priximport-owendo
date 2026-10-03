const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Dossier où sont rangées les données modifiables (data/*.json) et les
// fichiers envoyés depuis l'admin (assets/videos, assets/img/...). Par
// défaut : le dossier du projet. Chez un hébergeur, pointe STORAGE_DIR vers
// un disque persistant, sinon tout ce qui est ajouté depuis l'admin (et les
// commandes) serait perdu à chaque redémarrage/redéploiement.
const STORAGE_DIR = process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : __dirname;
const DATA_DIR = path.join(STORAGE_DIR, 'data');

// Premier démarrage sur un disque vide : on y recopie les données livrées
// avec le projet (catalogue, publications, contenu) pour ne pas partir de zéro.
if (STORAGE_DIR !== __dirname) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  ['products.json', 'posts.json', 'content.json'].forEach((f) => {
    const target = path.join(DATA_DIR, f);
    const seed = path.join(__dirname, 'data', f);
    if (!fs.existsSync(target) && fs.existsSync(seed)) fs.copyFileSync(seed, target);
  });
}

const SESSION_SECRET = process.env.SESSION_SECRET;
if (IS_PROD && !SESSION_SECRET) {
  console.error('SESSION_SECRET manquant : définis cette variable d\'environnement avant de lancer le serveur en production.');
  process.exit(1);
}

// Derrière l'hébergeur (Render, Railway...), le HTTPS est géré par un proxy :
// nécessaire pour que le cookie "secure" de l'admin fonctionne.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use(express.json({ limit: '200kb' }));

// Session utilisée par la page d'administration (pages/admin.html) pour
// savoir qui est connecté. En production, SESSION_SECRET est obligatoire.
app.use(session({
  // Sans SESSION_SECRET : clé aléatoire à chaque démarrage (il faut juste se
  // reconnecter à l'admin après un redémarrage) — jamais une clé connue.
  secret: SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000, // 8 heures
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD
  }
}));

// Seuls ces fichiers sont publics. Tout le reste du dossier (commandes,
// comptes admin, code du serveur, sources de l'appli...) ne doit jamais
// être téléchargeable depuis le navigateur.
const PUBLIC_DATA_FILES = new Set(['/data/products.json', '/data/posts.json', '/data/content.json']);

function isPublicPath(p) {
  return p === '/'
    || /^\/[A-Za-z0-9_-]+\.html$/.test(p)
    || p.startsWith('/assets/')
    || p.startsWith('/pages/')
    || p.startsWith('/downloads/')
    || p === '/favicon.ico';
}

// Données publiques : lues dans DATA_DIR (là où l'admin écrit).
app.get([...PUBLIC_DATA_FILES], (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(DATA_DIR, path.basename(req.path)));
});

app.use((req, res, next) => {
  let p;
  try {
    p = decodeURIComponent(req.path);
  } catch (e) {
    return res.status(400).send('Adresse invalide.');
  }
  // Refuse les détours du type /assets/../data/orders.json
  if (p.includes('..') || p.includes('\\') || p.includes('\0')) return res.status(404).send('Page introuvable.');
  if (p.startsWith('/api/') || isPublicPath(p)) return next();
  res.status(404).send('Page introuvable.');
});

// Fichiers envoyés depuis l'admin (s'ils sont rangés hors du projet), puis le site.
if (STORAGE_DIR !== __dirname) {
  app.use('/assets', express.static(path.join(STORAGE_DIR, 'assets')));
}
app.use(express.static(path.join(__dirname)));

const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');

// URL du "Web App" Google Apps Script qui reçoit chaque commande et l'ajoute
// à une feuille Google Sheets pour l'administrateur. Laisse la valeur vide
// ("") pour désactiver cet envoi. Voir README.md ("Suivi des commandes dans
// Google Sheets") pour la procédure de création de ce lien, étape par étape.
const GOOGLE_SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbx3zDkqwLfWJDJYX52TkVW8f8exsRfPDC8qSh-B_9DR1CzTO1p0Ih9p1Gu1HuhxeRL5/exec';

function sendOrderToGoogleSheet(order) {
  if (!GOOGLE_SHEET_WEBHOOK_URL) return;
  if (typeof fetch !== 'function') {
    console.error('Envoi vers Google Sheets impossible : Node.js 18+ requis (fetch indisponible).');
    return;
  }
  fetch(GOOGLE_SHEET_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  }).catch(err => {
    // On ne bloque jamais la commande du client si Google Sheets est
    // injoignable (réseau, quota...) : elle reste enregistrée dans
    // data/orders.json de toute façon.
    console.error('Impossible d\'envoyer la commande à Google Sheets :', err.message);
  });
}

// ---- Utilitaires fichiers JSON (lecture/écriture en promesses) ----

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) return reject(err);
      try {
        resolve(JSON.parse(data || '[]'));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function writeJsonFile(file, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(file, JSON.stringify(data, null, 2), (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function slugify(str) {
  const noAccents = String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // retire les accents (é -> e, etc.)
  return noAccents.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'item';
}

// ==================== API PUBLIQUE (site web + appli mobile) ====================

// API : catalogue produits (utilisé par assets/js/products.js et l'appli mobile)
app.get('/api/products', (req, res) => {
  fs.readFile(PRODUCTS_FILE, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Impossible de lire le catalogue.' });
    }
    res.type('application/json').send(data);
  });
});

// API : publications de la page Nouveautés (utilisé par assets/js/posts.js
// et par l'application mobile Flutter — voir mobile/lib/services/api_service.dart)
app.get('/api/posts', (req, res) => {
  fs.readFile(POSTS_FILE, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Impossible de lire les publications.' });
    }
    res.type('application/json').send(data);
  });
});

// API : contenu éditable du site (textes du bandeau, horaires, contact,
// cartes des pages Accueil/Fraîcheur/Services...) — utilisé par
// assets/js/site-content.js sur toutes les pages publiques, pour que tout
// changement fait depuis l'administration apparaisse partout à la fois.
app.get('/api/content', (req, res) => {
  fs.readFile(CONTENT_FILE, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Impossible de lire le contenu du site.' });
    }
    res.type('application/json').send(data);
  });
});

// API : réception d'une commande client (utilisé par assets/js/panier-page.js
// et par l'appli mobile — cart_screen.dart)
app.post('/api/commande', async (req, res) => {
  const { items: rawItems, customer: rawCustomer } = req.body || {};

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return res.status(400).json({ error: 'Le panier est vide.' });
  }
  if (rawItems.length > 100) {
    return res.status(400).json({ error: 'Trop d\'articles dans une seule commande.' });
  }
  const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
  const customer = {
    name: clean(rawCustomer && rawCustomer.name, 80),
    phone: clean(rawCustomer && rawCustomer.phone, 30),
    mode: rawCustomer && rawCustomer.mode === 'livraison' ? 'livraison' : 'retrait',
    address: clean(rawCustomer && rawCustomer.address, 300)
  };
  if (!customer.name || !customer.phone) {
    return res.status(400).json({ error: 'Nom et téléphone requis.' });
  }
  if (customer.mode === 'livraison' && !customer.address) {
    return res.status(400).json({ error: 'Adresse de livraison requise.' });
  }

  // Les prix viennent toujours du catalogue, jamais du navigateur ou de
  // l'appli : sinon n'importe qui pourrait commander à 0 FCFA.
  let catalogue;
  try {
    catalogue = await readJsonFile(PRODUCTS_FILE);
  } catch (e) {
    return res.status(500).json({ error: 'Catalogue indisponible, réessaie dans un instant.' });
  }
  const items = [];
  for (const raw of rawItems) {
    const product = catalogue.find((p) => p.id === String(raw && raw.id) && p.active !== false);
    const qty = Number(raw && raw.qty);
    if (!product) {
      return res.status(400).json({ error: `Le produit « ${clean(raw && raw.name, 60) || 'inconnu'} » n'est plus disponible. Retire-le du panier.` });
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 999) {
      return res.status(400).json({ error: `Quantité invalide pour « ${product.name} ».` });
    }
    items.push({ id: product.id, name: product.name, price: Number(product.price) || 0, qty });
  }

  const reference = 'PIO-' + Date.now().toString(36).toUpperCase();
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  const order = { reference, date: new Date().toISOString(), customer, items, total };

  fs.readFile(ORDERS_FILE, 'utf8', (err, data) => {
    let orders = [];
    if (!err) {
      try { orders = JSON.parse(data || '[]'); } catch (e) { orders = []; }
    }
    orders.push(order);
    fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), (writeErr) => {
      if (writeErr) {
        console.error('Erreur enregistrement commande :', writeErr);
        return res.status(500).json({ error: "Erreur lors de l'enregistrement de la commande." });
      }
      const itemsSummary = items.map(i => `${i.qty}x ${i.name}`).join(', ');
      const modeLabel = customer.mode === 'livraison' ? 'Livraison' : 'Retrait en magasin';
      console.log(`=== NOUVELLE COMMANDE ${reference} — ${customer.name} (${customer.phone}) — ${modeLabel} ===`);
      console.log(`    Articles : ${itemsSummary}`);
      if (customer.address) console.log(`    Adresse : ${customer.address}`);
      console.log(`    Total : ${total.toLocaleString('fr-FR')} FCFA`);
      sendOrderToGoogleSheet(order);
      res.json({ success: true, reference, total, items });
    });
  });
});

// ==================== ADMINISTRATION (pages/admin.html) ====================
// L'administrateur se connecte avec un email + mot de passe créés via
// `npm run create-admin`. Une fois connecté, il peut ajouter/modifier/
// supprimer des produits et des publications Nouveautés : le site web et
// l'appli mobile affichent le changement immédiatement, puisqu'ils lisent
// tous les deux /api/products et /api/posts en direct.

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: 'Non autorisé. Connecte-toi.' });
  }
  next();
}

// ---- Envoi de fichiers (photos produits/publications, vidéos) ----
// Permet à l'admin d'envoyer un fichier depuis son ordinateur (bouton
// "choisir un fichier" / glisser-déposer) plutôt que de devoir coller une
// URL ou compter sur quelqu'un d'autre pour déposer le fichier sur le
// serveur. Le champ "kind" (envoyé avant le fichier dans le formulaire)
// détermine le dossier de destination.
const UPLOAD_DESTS = {
  video: 'assets/videos',
  'product-image': 'assets/img/products',
  'post-image': 'assets/img/posts',
  'slide-image': 'assets/img/slides'
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dest = UPLOAD_DESTS[req.body.kind];
      if (!dest) return cb(new Error('Type de fichier inconnu.'));
      const dir = path.join(STORAGE_DIR, dest);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const base = slugify(path.basename(file.originalname, ext)) || 'fichier';
      cb(null, `${base}-${Date.now().toString(36)}${ext}`);
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 Mo
  fileFilter: (req, file, cb) => {
    const isVideo = req.body.kind === 'video';
    const okType = isVideo ? file.mimetype.startsWith('video/') : file.mimetype.startsWith('image/');
    if (!okType) return cb(new Error(isVideo ? "Ce fichier n'est pas une vidéo." : "Ce fichier n'est pas une image."));
    cb(null, true);
  }
});

app.post('/api/admin/upload', requireAdmin, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' });
    const dest = UPLOAD_DESTS[req.body.kind];
    res.json({ success: true, path: `${dest}/${req.file.filename}` });
  });
});

// Limite les essais de mot de passe : 8 échecs en 15 minutes par adresse IP,
// puis blocage temporaire (contre les robots qui testent des mots de passe).
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILS = 8;
const loginFails = new Map();

function loginBlocked(ip) {
  const entry = loginFails.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.first > LOGIN_WINDOW_MS) {
    loginFails.delete(ip);
    return false;
  }
  return entry.count >= LOGIN_MAX_FAILS;
}

function recordLoginFail(ip) {
  const entry = loginFails.get(ip);
  if (!entry || Date.now() - entry.first > LOGIN_WINDOW_MS) {
    loginFails.set(ip, { first: Date.now(), count: 1 });
  } else {
    entry.count++;
  }
}

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (loginBlocked(req.ip)) {
    return res.status(429).json({ error: 'Trop de tentatives. Réessaie dans 15 minutes.' });
  }
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }
  let admins;
  try {
    admins = await readJsonFile(ADMINS_FILE);
  } catch (e) {
    admins = [];
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const admin = admins.find((a) => a.email === normalizedEmail);
  if (!admin || !bcrypt.compareSync(String(password), admin.passwordHash)) {
    recordLoginFail(req.ip);
    return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  }
  loginFails.delete(req.ip);
  // Nouvelle session à chaque connexion (évite la fixation de session).
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Erreur serveur.' });
    req.session.adminId = admin.id;
    req.session.adminEmail = admin.email;
    res.json({ success: true, email: admin.email, name: admin.name || null });
  });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/admin/me', (req, res) => {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: 'Non connecté.' });
  }
  res.json({ email: req.session.adminEmail });
});

// ---- Produits ----

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const products = await readJsonFile(PRODUCTS_FILE);
    const p = req.body || {};
    if (!p.name || p.price == null || !p.category) {
      return res.status(400).json({ error: 'Nom, prix et catégorie requis.' });
    }
    let id = p.id && String(p.id).trim() ? slugify(p.id) : slugify(p.name);
    if (products.some((x) => x.id === id)) {
      id = id + '-' + Date.now().toString(36);
    }
    const product = {
      id,
      name: String(p.name).trim(),
      unit: p.unit ? String(p.unit).trim() : '',
      price: Number(p.price) || 0,
      ...(p.oldPrice ? { oldPrice: Number(p.oldPrice) } : {}),
      promo: !!p.promo,
      ...(p.promo && p.promoStart ? { promoStart: String(p.promoStart).trim() } : {}),
      ...(p.promo && p.promoEnd ? { promoEnd: String(p.promoEnd).trim() } : {}),
      category: String(p.category).trim(),
      image: p.image ? String(p.image).trim() : '',
      ...(p.group ? { group: String(p.group).trim() } : {}),
      ...(p.wineType ? { wineType: String(p.wineType).trim() } : {}),
      ...(Array.isArray(p.images) && p.images.length ? { images: p.images.map((i) => String(i).trim()).filter(Boolean) } : {}),
      active: p.active !== false
    };
    products.push(product);
    await writeJsonFile(PRODUCTS_FILE, products);
    res.json({ success: true, product });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const products = await readJsonFile(PRODUCTS_FILE);
    const idx = products.findIndex((p) => p.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Produit introuvable.' });
    const p = req.body || {};
    const current = products[idx];
    const updated = {
      ...current,
      name: p.name != null ? String(p.name).trim() : current.name,
      unit: p.unit != null ? String(p.unit).trim() : current.unit,
      price: p.price != null ? Number(p.price) : current.price,
      category: p.category != null ? String(p.category).trim() : current.category,
      image: p.image != null ? String(p.image).trim() : current.image,
      active: p.active != null ? !!p.active : current.active,
      promo: p.promo != null ? !!p.promo : current.promo
    };
    if (p.oldPrice != null) {
      if (p.oldPrice === '' || p.oldPrice === false) {
        delete updated.oldPrice;
      } else {
        updated.oldPrice = Number(p.oldPrice);
      }
    }
    if (p.group != null) {
      if (p.group === '') delete updated.group;
      else updated.group = String(p.group).trim();
    }
    if (p.wineType != null) {
      if (p.wineType === '') delete updated.wineType;
      else updated.wineType = String(p.wineType).trim();
    }
    if (p.images != null) {
      const images = Array.isArray(p.images) ? p.images.map((i) => String(i).trim()).filter(Boolean) : [];
      if (images.length) updated.images = images;
      else delete updated.images;
    }
    if (!updated.promo) {
      // Un produit qui n'est plus en promotion n'a plus besoin de dates.
      delete updated.promoStart;
      delete updated.promoEnd;
    } else {
      if (p.promoStart != null) {
        if (p.promoStart === '') delete updated.promoStart;
        else updated.promoStart = String(p.promoStart).trim();
      }
      if (p.promoEnd != null) {
        if (p.promoEnd === '') delete updated.promoEnd;
        else updated.promoEnd = String(p.promoEnd).trim();
      }
    }
    products[idx] = updated;
    await writeJsonFile(PRODUCTS_FILE, products);
    res.json({ success: true, product: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    let products = await readJsonFile(PRODUCTS_FILE);
    const before = products.length;
    products = products.filter((p) => p.id !== req.params.id);
    if (products.length === before) return res.status(404).json({ error: 'Produit introuvable.' });
    await writeJsonFile(PRODUCTS_FILE, products);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ---- Publications (Nouveautés) ----

app.post('/api/admin/posts', requireAdmin, async (req, res) => {
  try {
    const posts = await readJsonFile(POSTS_FILE);
    const p = req.body || {};
    if (!p.title || !p.type) {
      return res.status(400).json({ error: 'Titre et type requis.' });
    }
    let id = p.id && String(p.id).trim() ? slugify(p.id) : slugify(p.title);
    if (posts.some((x) => x.id === id)) {
      id = id + '-' + Date.now().toString(36);
    }
    const post = {
      id,
      type: p.type === 'video' ? 'video' : 'photo',
      title: String(p.title).trim(),
      caption: p.caption ? String(p.caption).trim() : '',
      tag: p.tag ? String(p.tag).trim() : '',
      date: p.date ? String(p.date).trim() : new Date().toISOString().slice(0, 10),
      ...(p.media ? { media: String(p.media).trim() } : {}),
      ...(p.youtube ? { youtube: String(p.youtube).trim() } : {}),
      ...(p.thumbnail ? { thumbnail: String(p.thumbnail).trim() } : {})
    };
    posts.unshift(post);
    await writeJsonFile(POSTS_FILE, posts);
    res.json({ success: true, post });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.put('/api/admin/posts/:id', requireAdmin, async (req, res) => {
  try {
    const posts = await readJsonFile(POSTS_FILE);
    const idx = posts.findIndex((p) => p.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Publication introuvable.' });
    const p = req.body || {};
    const current = posts[idx];
    const updated = {
      ...current,
      type: p.type != null ? (p.type === 'video' ? 'video' : 'photo') : current.type,
      title: p.title != null ? String(p.title).trim() : current.title,
      caption: p.caption != null ? String(p.caption).trim() : current.caption,
      tag: p.tag != null ? String(p.tag).trim() : current.tag,
      date: p.date != null ? String(p.date).trim() : current.date
    };
    ['media', 'youtube', 'thumbnail'].forEach((field) => {
      if (p[field] != null) {
        if (p[field] === '') delete updated[field];
        else updated[field] = String(p[field]).trim();
      }
    });
    posts[idx] = updated;
    await writeJsonFile(POSTS_FILE, posts);
    res.json({ success: true, post: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.delete('/api/admin/posts/:id', requireAdmin, async (req, res) => {
  try {
    let posts = await readJsonFile(POSTS_FILE);
    const before = posts.length;
    posts = posts.filter((p) => p.id !== req.params.id);
    if (posts.length === before) return res.status(404).json({ error: 'Publication introuvable.' });
    await writeJsonFile(POSTS_FILE, posts);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ---- Contenu du site (textes, horaires, cartes Accueil/Fraîcheur/Services) ----

const CONTENT_CARD_SECTIONS = ['home', 'fraicheur', 'services'];

app.put('/api/admin/content/fields', requireAdmin, async (req, res) => {
  try {
    const content = await readJsonFile(CONTENT_FILE);
    const b = req.body || {};
    if (b.topbarMessage != null) content.topbarMessage = String(b.topbarMessage).trim();
    if (b.topbarHighlight != null) content.topbarHighlight = String(b.topbarHighlight).trim();
    if (b.footerTagline != null) content.footerTagline = String(b.footerTagline).trim();
    if (b.freshNote != null) content.freshNote = String(b.freshNote).trim();
    if (b.mapCaption != null) content.mapCaption = String(b.mapCaption).trim();
    content.contact = content.contact || {};
    if (b.address != null) content.contact.address = String(b.address).trim();
    if (b.phone != null) content.contact.phone = String(b.phone).trim();
    if (b.email != null) content.contact.email = String(b.email).trim();
    if (b.whatsapp != null) content.contact.whatsapp = String(b.whatsapp).trim();
    await writeJsonFile(CONTENT_FILE, content);
    res.json({ success: true, content });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Horaires (liste de lignes libellé/horaire, ex. "Lundi — Samedi" → "07h00 – 19h30")

app.post('/api/admin/content/hours', requireAdmin, async (req, res) => {
  try {
    const content = await readJsonFile(CONTENT_FILE);
    const b = req.body || {};
    if (!b.label || !b.value) return res.status(400).json({ error: 'Libellé et horaire requis.' });
    content.hours = content.hours || [];
    const id = slugify(b.label) + '-' + Date.now().toString(36);
    const row = { id, label: String(b.label).trim(), value: String(b.value).trim() };
    content.hours.push(row);
    await writeJsonFile(CONTENT_FILE, content);
    res.json({ success: true, row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.put('/api/admin/content/hours/:id', requireAdmin, async (req, res) => {
  try {
    const content = await readJsonFile(CONTENT_FILE);
    const rows = content.hours || [];
    const idx = rows.findIndex((r) => r.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Horaire introuvable.' });
    const b = req.body || {};
    if (!b.label || !b.value) return res.status(400).json({ error: 'Libellé et horaire requis.' });
    rows[idx] = { id: rows[idx].id, label: String(b.label).trim(), value: String(b.value).trim() };
    await writeJsonFile(CONTENT_FILE, content);
    res.json({ success: true, row: rows[idx] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.delete('/api/admin/content/hours/:id', requireAdmin, async (req, res) => {
  try {
    const content = await readJsonFile(CONTENT_FILE);
    const before = (content.hours || []).length;
    content.hours = (content.hours || []).filter((r) => r.id !== req.params.id);
    if (content.hours.length === before) return res.status(404).json({ error: 'Horaire introuvable.' });
    await writeJsonFile(CONTENT_FILE, content);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Cartes des pages Accueil / Fraîcheur & Local / Services (icône + titre +
// texte, et un lien optionnel pour les cartes de l'accueil)

function requireCardSection(req, res, next) {
  if (!CONTENT_CARD_SECTIONS.includes(req.params.section)) {
    return res.status(400).json({ error: 'Section de cartes inconnue.' });
  }
  next();
}

app.post('/api/admin/content/cards/:section', requireAdmin, requireCardSection, async (req, res) => {
  try {
    const content = await readJsonFile(CONTENT_FILE);
    const section = req.params.section;
    const b = req.body || {};
    if (!b.title || !b.icon) return res.status(400).json({ error: 'Titre et icône requis.' });
    content.cards = content.cards || {};
    content.cards[section] = content.cards[section] || [];
    const id = slugify(section + '-' + b.title) + '-' + Date.now().toString(36);
    const card = {
      id,
      icon: String(b.icon).trim(),
      title: String(b.title).trim(),
      text: b.text ? String(b.text).trim() : '',
      ...(section === 'home' && b.href ? { href: String(b.href).trim() } : {})
    };
    content.cards[section].push(card);
    await writeJsonFile(CONTENT_FILE, content);
    res.json({ success: true, card });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.put('/api/admin/content/cards/:section/:id', requireAdmin, requireCardSection, async (req, res) => {
  try {
    const content = await readJsonFile(CONTENT_FILE);
    const section = req.params.section;
    const list = (content.cards && content.cards[section]) || [];
    const idx = list.findIndex((c) => c.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Carte introuvable.' });
    const b = req.body || {};
    if (!b.title || !b.icon) return res.status(400).json({ error: 'Titre et icône requis.' });
    list[idx] = {
      id: list[idx].id,
      icon: String(b.icon).trim(),
      title: String(b.title).trim(),
      text: b.text ? String(b.text).trim() : '',
      ...(section === 'home' && b.href ? { href: String(b.href).trim() } : {})
    };
    await writeJsonFile(CONTENT_FILE, content);
    res.json({ success: true, card: list[idx] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.delete('/api/admin/content/cards/:section/:id', requireAdmin, requireCardSection, async (req, res) => {
  try {
    const content = await readJsonFile(CONTENT_FILE);
    const section = req.params.section;
    const list = (content.cards && content.cards[section]) || [];
    const before = list.length;
    content.cards = content.cards || {};
    content.cards[section] = list.filter((c) => c.id !== req.params.id);
    if (content.cards[section].length === before) return res.status(404).json({ error: 'Carte introuvable.' });
    await writeJsonFile(CONTENT_FILE, content);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Carrousel de la page d'accueil (assets/js/hero-slider.js) : réglages
// (vitesse, diapos automatiques à garder) + diapos créées par l'admin.
// Stocké dans content.json sous "heroSlider".

const SLIDER_AUTO_KEYS = ['welcome', 'promo', 'fraicheur', 'nouveaute', 'services'];
const SLIDE_LAYOUTS = ['split', 'poster'];
const SLIDE_THEMES = ['green', 'dark', 'yellow'];

function getSlider(content) {
  const s = content.heroSlider || {};
  const auto = {};
  SLIDER_AUTO_KEYS.forEach((k) => { auto[k] = !s.auto || s.auto[k] !== false; });
  content.heroSlider = {
    delay: Number(s.delay) >= 3 ? Number(s.delay) : 6,
    auto,
    slides: Array.isArray(s.slides) ? s.slides : []
  };
  return content.heroSlider;
}

// Lien d'une diapo : page du site (chemin relatif) ou adresse http(s) —
// rien d'autre (pas de "javascript:" par exemple).
function cleanSlideLink(value) {
  const href = String(value || '').trim();
  if (!href) return '';
  if (/^https?:\/\//i.test(href)) return href;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return '';
  return href.replace(/^\/+/, '');
}

function buildSlide(b, id) {
  const layout = SLIDE_LAYOUTS.includes(b.layout) ? b.layout : 'split';
  const slide = {
    id,
    layout,
    theme: SLIDE_THEMES.includes(b.theme) ? b.theme : 'green',
    eyebrow: String(b.eyebrow || '').trim(),
    title: String(b.title || '').trim(),
    text: String(b.text || '').trim(),
    image: String(b.image || '').trim(),
    ctaLabel: String(b.ctaLabel || '').trim(),
    ctaHref: cleanSlideLink(b.ctaHref),
    active: b.active !== false && b.active !== 'false'
  };
  if (layout === 'poster' && !slide.image) throw new Error('Une affiche a besoin d’une image.');
  if (layout === 'split' && !slide.title) throw new Error('Titre requis.');
  if (b.ctaHref && !slide.ctaHref) throw new Error('Lien du bouton invalide.');
  return slide;
}

app.put('/api/admin/slider/settings', requireAdmin, async (req, res) => {
  try {
    const content = await readJsonFile(CONTENT_FILE);
    const slider = getSlider(content);
    const b = req.body || {};
    const delay = Number(b.delay);
    if (!(delay >= 3 && delay <= 20)) return res.status(400).json({ error: 'La durée doit être entre 3 et 20 secondes.' });
    slider.delay = delay;
    SLIDER_AUTO_KEYS.forEach((k) => { slider.auto[k] = !!(b.auto && b.auto[k]); });
    await writeJsonFile(CONTENT_FILE, content);
    res.json({ success: true, heroSlider: slider });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.post('/api/admin/slider/slides', requireAdmin, async (req, res) => {
  try {
    const content = await readJsonFile(CONTENT_FILE);
    const slider = getSlider(content);
    const b = req.body || {};
    let slide;
    try {
      slide = buildSlide(b, slugify('slide-' + (b.title || 'affiche')) + '-' + Date.now().toString(36));
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    slider.slides.push(slide);
    await writeJsonFile(CONTENT_FILE, content);
    res.json({ success: true, slide });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.put('/api/admin/slider/slides/:id', requireAdmin, async (req, res) => {
  try {
    const content = await readJsonFile(CONTENT_FILE);
    const slider = getSlider(content);
    const idx = slider.slides.findIndex((s) => s.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Diapositive introuvable.' });
    try {
      slider.slides[idx] = buildSlide(req.body || {}, slider.slides[idx].id);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    await writeJsonFile(CONTENT_FILE, content);
    res.json({ success: true, slide: slider.slides[idx] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.post('/api/admin/slider/slides/:id/move', requireAdmin, async (req, res) => {
  try {
    const content = await readJsonFile(CONTENT_FILE);
    const slider = getSlider(content);
    const idx = slider.slides.findIndex((s) => s.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Diapositive introuvable.' });
    const to = idx + (Number((req.body || {}).dir) < 0 ? -1 : 1);
    if (to >= 0 && to < slider.slides.length) {
      const [moved] = slider.slides.splice(idx, 1);
      slider.slides.splice(to, 0, moved);
      await writeJsonFile(CONTENT_FILE, content);
    }
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.delete('/api/admin/slider/slides/:id', requireAdmin, async (req, res) => {
  try {
    const content = await readJsonFile(CONTENT_FILE);
    const slider = getSlider(content);
    const before = slider.slides.length;
    slider.slides = slider.slides.filter((s) => s.id !== req.params.id);
    if (slider.slides.length === before) return res.status(404).json({ error: 'Diapositive introuvable.' });
    await writeJsonFile(CONTENT_FILE, content);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur PRIX IMPORT OWENDO opérationnel sur http://localhost:${PORT}`);
});
