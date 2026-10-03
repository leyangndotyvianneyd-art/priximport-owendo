// Crée (ou met à jour le mot de passe d'un) compte administrateur pour la
// page d'administration du site (pages/admin.html).
//
// Utilisation :
//   npm run create-admin
//
// Le script demande un email, un nom (optionnel) et un mot de passe, puis
// enregistre le compte (mot de passe chiffré, jamais en clair) dans
// data/admins.json. Relance ce script avec le même email pour changer le
// mot de passe d'un compte existant.
//
// Remarque : le mot de passe reste visible à l'écran pendant que tu le
// tapes (pas d'étoiles) — assure-toi que personne ne regarde ton écran.

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcryptjs');

// Même emplacement que celui lu par server.js (STORAGE_DIR chez un hébergeur).
const STORAGE_DIR = process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : path.join(__dirname, '..');
const ADMINS_FILE = path.join(STORAGE_DIR, 'data', 'admins.json');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

(async () => {
  console.log('=== Création / mise à jour d\'un compte administrateur ===');
  console.log('(Prix Import Owendo — page d\'administration du catalogue)\n');

  const emailRaw = await ask('Email : ');
  const email = emailRaw.trim().toLowerCase();
  const name = (await ask('Nom (optionnel) : ')).trim();
  const password = await ask('Mot de passe (10 caractères minimum) : ');
  rl.close();

  if (!email || !email.includes('@')) {
    console.error('\nEmail invalide.');
    process.exit(1);
  }
  if (!password || password.length < 10) {
    console.error('\nLe mot de passe doit faire au moins 10 caractères.');
    process.exit(1);
  }

  let admins = [];
  if (fs.existsSync(ADMINS_FILE)) {
    try {
      admins = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8') || '[]');
    } catch (e) {
      admins = [];
    }
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const existingIndex = admins.findIndex((a) => a.email === email);
  const id = existingIndex >= 0 ? admins[existingIndex].id : 'admin-' + Date.now().toString(36);
  const record = { id, email, name: name || null, passwordHash };

  if (existingIndex >= 0) {
    admins[existingIndex] = record;
    console.log(`\nMot de passe mis à jour pour ${email}.`);
  } else {
    admins.push(record);
    console.log(`\nCompte administrateur créé pour ${email}.`);
  }

  fs.mkdirSync(path.dirname(ADMINS_FILE), { recursive: true });
  fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
  console.log(`Tu peux maintenant te connecter sur /pages/admin.html avec cet email et ce mot de passe.`);
})();
