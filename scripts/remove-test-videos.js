// Retire les vidéos de test ajoutées pour essayer la page Nouveautés.
//
// Utilisation :
//   npm run remove-test-videos
//
// Supprime de data/posts.json toutes les publications de test (id
// "test-video-..." ou marquées "test": true), puis efface du dossier
// assets/videos/ les fichiers vidéo qu'elles utilisaient — seulement les
// copies faites dans le site, jamais les fichiers d'origine ailleurs sur
// l'ordinateur.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POSTS_FILE = path.join(ROOT, 'data', 'posts.json');

const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8') || '[]');
const isTest = (p) => p.test === true || String(p.id || '').startsWith('test-video-');
const testPosts = posts.filter(isTest);

if (!testPosts.length) {
  console.log('Aucune vidéo de test à retirer.');
  process.exit(0);
}

// Fichiers encore utilisés par une vraie publication : on n'y touche pas.
const stillUsed = new Set(posts.filter((p) => !isTest(p)).map((p) => p.media));

let deletedFiles = 0;
testPosts.forEach((p) => {
  const media = String(p.media || '');
  if (!media.startsWith('assets/videos/') || stillUsed.has(media)) return;
  const file = path.join(ROOT, media);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    deletedFiles++;
  }
});

fs.writeFileSync(POSTS_FILE, JSON.stringify(posts.filter((p) => !isTest(p)), null, 2));
console.log(`${testPosts.length} publication(s) de test retirée(s), ${deletedFiles} fichier(s) vidéo supprimé(s) de assets/videos/.`);
