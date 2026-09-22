const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Session utilisée par la page d'administration (pages/admin.html) pour
// savoir qui est connecté. En production, définis la variable
// d'environnement SESSION_SECRET avec une valeur secrète à toi ; sinon une
// valeur par défaut est utilisée (change-la si tu mets le site en ligne
// publiquement).
app.use(session({
  secret: process.env.SESSION_SECRET || 'pio-admin-secret-a-changer-en-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 heures
}));

app.use(express.static(path.join(__dirname)));

const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');
const POSTS_FILE = path.join(__dirname, 'data', 'posts.json');
const ADMINS_FILE = path.join(__dirname, 'data', 'admins.json');
const CONTENT_FILE = path.join(__dirname, 'data', 'content.json');

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
app.post('/api/commande', (req, res) => {
  const { items, customer } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Le panier est vide.' });
  }
  if (!customer || !customer.name || !customer.phone) {
    return res.status(400).json({ error: 'Nom et téléphone requis.' });
  }

  const reference = 'PIO-' + Date.now().toString(36).toUpperCase();
  const total = items.reduce((sum, i) => sum + (Number(i.price) * Number(i.qty)), 0);

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
      res.json({ success: true, reference, total });
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

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body || {};
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
  if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  }
  req.session.adminId = admin.id;
  req.session.adminEmail = admin.email;
  res.json({ success: true, email: admin.email, name: admin.name || null });
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

app.listen(PORT, () => {
  console.log(`Serveur PRIX IMPORT OWENDO opérationnel sur http://localhost:${PORT}`);
});
