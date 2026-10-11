// Recopie la liste des magasins (data/stores.json) dans l'appli mobile :
// génère mobile/lib/config/stores.g.dart. À relancer après chaque
// modification de data/stores.json (nom, téléphone, atouts...) :
//   npm run sync-mobile
//
// (Les noms et identifiants Android des 9 applis sont lus directement dans
// data/stores.json par mobile/android/app/build.gradle.kts.)

const fs = require('fs');
const path = require('path');
const { STORES } = require('../store');

const OUT = path.join(__dirname, '..', 'mobile', 'lib', 'config', 'stores.g.dart');

const str = (v) => (v == null ? 'null' : `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\$/g, '\\$')}'`);
const list = (arr) => (Array.isArray(arr) ? `[${arr.map(str).join(', ')}]` : 'null');

const entries = STORES.map((s) => {
  const c = s.contact || {};
  return `  ${str(s.id)}: StoreInfo(
    id: ${str(s.id)},
    name: ${str(s.name)},
    shortName: ${str(s.shortName)},
    orderPrefix: ${str(s.orderPrefix)},
    port: ${Number(s.port) || 3000},
    phone: ${str(c.phone || '')},
    whatsapp: ${str((c.whatsapp || '').replace(/\D/g, ''))},
    features: ${list(s.features)},
    surfaceM2: ${s.surfaceM2 == null ? 'null' : Number(s.surfaceM2)},
  ),`;
}).join('\n');

const dart = `// FICHIER GÉNÉRÉ par scripts/sync-mobile-stores.js depuis data/stores.json.
// Ne pas modifier à la main : modifie data/stores.json puis lance
// \`npm run sync-mobile\` à la racine du projet.

import 'store_info.dart';

const Map<String, StoreInfo> allStores = {
${entries}
};
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, dart);
console.log(`${STORES.length} magasins écrits dans ${path.relative(process.cwd(), OUT)}`);
