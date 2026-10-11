// Lance les sites des 9 magasins en même temps, chacun sur son port
// (champ "port" de data/stores.json : Owendo 3000, Centre Ville 3001...).
//
// Utilisation :
//   npm run start-all
//
// Ctrl+C arrête les 9 serveurs.

const path = require('path');
const { spawn } = require('child_process');
const { STORES } = require('../store');

const server = path.join(__dirname, '..', 'server.js');
const children = STORES.map((store) => {
  const child = spawn(process.execPath, [server, store.id], {
    env: { ...process.env, PORT: String(store.port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const tag = `[${store.shortName}]`;
  const relay = (out) => (chunk) => {
    String(chunk).split(/\r?\n/).filter(Boolean).forEach((line) => out.write(`${tag} ${line}\n`));
  };
  child.stdout.on('data', relay(process.stdout));
  child.stderr.on('data', relay(process.stderr));
  child.on('exit', (code) => {
    if (code) console.error(`${tag} arrêté (code ${code}).`);
  });
  return child;
});

function stopAll() {
  children.forEach((c) => c.kill());
  process.exit(0);
}
process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);
