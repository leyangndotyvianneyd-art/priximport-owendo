# Prix Import Owendo — Site vitrine & commande en ligne

Site du supermarché **Prix Import Owendo** (Libreville, Gabon) : catalogue,
fraîcheur locale, nouveautés (photos/vidéos), et un panier permettant aux
clients de passer commande (retrait en magasin ou livraison, règlement à la
remise).

Le contenu du catalogue se gère en éditant un seul fichier —
`data/products.json` — sans jamais toucher au HTML, au CSS ou au JavaScript.
Les publications de la page Nouveautés se gèrent de la même façon dans
`assets/js/posts-data.js`.

## Lancer le site en local

Deux façons de le lancer, selon ce que tu veux tester :

**Option A — juste consulter le site (catalogue, fraîcheur, nouveautés...)**
Installe l'extension VS Code *Live Server* (Ritwick Dey), puis clic droit sur
`index.html` → **Open with Live Server**. Le catalogue se charge très bien
ainsi, car `data/products.json` est un fichier statique.

**Option B — tester aussi le panier et l'enregistrement des commandes**
Le formulaire de commande du panier appelle une petite API (`/api/commande`)
fournie par `server.js`. Il faut alors un vrai serveur Node :
```bash
npm install
npm start
```
Puis ouvre `http://localhost:3000`. Les commandes passées sont enregistrées
dans `data/orders.json`.

Si le serveur Node n'est pas lancé (aperçu via Live Server par exemple), le
bouton "Valider la commande" fonctionne quand même : il génère une référence
côté client et propose directement de confirmer la commande sur WhatsApp.

## Ajouter un nouveau produit

**Le plus simple : via la page d'administration** (`pages/admin.html`) — voir
la section "Administration du catalogue et des Nouveautés" plus bas.

Sinon, à la main : ouvre `data/products.json` et ajoute un objet dans le
tableau :

```json
{
  "id": "farine-ble-1kg",
  "name": "Farine de blé",
  "unit": "Paquet 1kg",
  "price": 750,
  "oldPrice": 900,
  "promo": true,
  "category": "Épicerie",
  "image": "https://... (ou un fichier dans assets/img/products/)",
  "active": true
}
```

- `oldPrice` et `promo: true` affichent le prix barré et le badge "Promo".
- Si tu ajoutes aussi `promoStart` et `promoEnd` (format `AAAA-MM-JJ`), le badge
  et le prix barré ne s'affichent qu'entre ces deux dates — en dehors de cette
  période, le produit redevient normal automatiquement, sans qu'il faille y
  repenser. Via la page d'administration, ces deux dates sont obligatoires
  dès que tu coches "En promotion".
- `image` peut être une URL complète, ou juste un nom de fichier si tu places
  la photo dans `assets/img/products/`.
- Passe `"active"` à `false` pour masquer un produit temporairement sans le
  perdre.

Sauvegarde : le catalogue se met à jour automatiquement.

## Ajouter une nouvelle publication (page Nouveautés)

Deux façons de faire :
- **Via la page d'administration** (recommandé) : `pages/admin.html`, voir la
  section "Administration du catalogue et des Nouveautés" ci-dessous.
- **À la main** : ouvre `data/posts.json` et ajoute un objet dans le tableau,
  en suivant le même schéma que les autres entrées (`type: "photo"` ou
  `"video"`, `youtube` + `thumbnail` pour une vidéo YouTube, `media` pour une
  photo).

(`assets/js/posts-data.js` est l'ancien système, il n'est plus utilisé.)

## Administration du catalogue et des Nouveautés

Une page d'administration protégée par mot de passe permet de gérer le
catalogue et les publications Nouveautés sans toucher aux fichiers JSON —
tout changement fait ici apparaît **immédiatement** sur le site web et dans
l'application mobile (les deux lisent en direct les mêmes fichiers/API).

**Étape 1 — Créer ton compte administrateur** (une seule fois)

```bash
npm install
npm run create-admin
```

Le script te demande un email, un nom (optionnel) et un mot de passe, puis
crée le compte dans `data/admins.json` (mot de passe toujours chiffré, jamais
stocké en clair). Relance cette commande avec le même email si tu veux
changer le mot de passe plus tard, ou avec un email différent pour créer un
deuxième compte (par ex. pour un employé de confiance).

**Étape 2 — Se connecter**

Lance le serveur (`npm start`), puis ouvre :
```
http://localhost:3000/pages/admin.html
```
Connecte-toi avec l'email et le mot de passe créés à l'étape 1. Depuis là,
tu peux :
- **Produits** : ajouter, modifier (prix, promo, catégorie, photo...) ou
  supprimer un produit, et le rendre visible/invisible sur le site sans le
  supprimer (case "Actif").
- **Nouveautés** : ajouter, modifier ou supprimer une photo ou vidéo.

La session reste ouverte 8 heures, puis il faudra se reconnecter.

⚠️ Si tu mets un jour le site en ligne sur un vrai serveur (accessible
publiquement, pas juste sur ton réseau local), pense à définir la variable
d'environnement `SESSION_SECRET` avec une valeur secrète à toi (actuellement
une valeur par défaut est utilisée dans `server.js`, ligne
`SESSION_SECRET`), pour que personne ne puisse deviner les sessions
administrateur.

## Carrousel de la page d'accueil

Le grand bandeau qui défile en haut de l'accueil se gère dans l'onglet
**Carrousel** de `pages/admin.html` :
- **Réglages** : durée d'affichage de chaque diapositive, et choix des
  diapositives automatiques à garder (bienvenue, promotions, fraîcheur,
  dernière nouveauté, livraison & Mobile Money). Ces dernières se remplissent
  toutes seules à partir du catalogue et des Nouveautés.
- **Mes diapositives** : tes propres diapositives, soit en *affiche* (une
  image sur toute la largeur, format paysage ~1600 × 600 conseillé), soit en
  *texte + photo*. Elles s'affichent juste après la bienvenue, dans l'ordre
  choisi avec les flèches ↑ ↓. Les images envoyées vont dans
  `assets/img/slides/`.

Tout est enregistré dans `data/content.json` (clé `heroSlider`).

## Où sont enregistrées les commandes ?

Dans `data/orders.json`, uniquement quand le site tourne via `npm start`
(serveur Node). Chaque commande contient la référence, le client, les
articles et le total.

## Suivi des commandes dans Google Sheets (pour l'administrateur)

En plus de `data/orders.json`, chaque commande peut être ajoutée
automatiquement dans une feuille Google Sheets — pratique pour que
l'administrateur du magasin suive les commandes sans ouvrir de fichier
technique. Aucune carte de crédit ni compte Google Cloud payant n'est
nécessaire : on utilise un petit script Google Apps Script gratuit.

**Étape 1 — Créer la feuille**
1. Va sur [sheets.google.com](https://sheets.google.com) et crée une feuille
   vide, par exemple nommée "Commandes Prix Import Owendo".
2. Sur la première ligne, ajoute ces en-têtes de colonnes :
   `Date | Référence | Client | Téléphone | Mode | Adresse | Articles | Total (FCFA)`

**Étape 2 — Ajouter le script qui reçoit les commandes**
1. Dans la feuille, va dans le menu **Extensions → Apps Script**.
2. Supprime le code d'exemple et colle celui-ci :

```javascript
function doPost(e) {
  // Onglet "Commandes" s'il existe, sinon le premier onglet.
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Commandes') || ss.getSheets()[0];
  var data = JSON.parse(e.postData.contents);

  var itemsText = data.items.map(function (i) {
    return i.qty + 'x ' + i.name;
  }).join(', ');

  sheet.appendRow([
    new Date(data.date),
    data.reference,
    data.customer.name,
    data.customer.phone,
    data.customer.mode,
    data.customer.address || '',
    itemsText,
    data.total
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Clique sur l'icône de disquette pour enregistrer (donne-lui un nom, ex.
   "Commandes Webhook").

**Étape 3 — Déployer en tant que Web App**
1. Clique sur **Déployer → Nouveau déploiement**.
2. Clique sur l'icône en forme d'engrenage à côté de "Sélectionner le type",
   choisis **Application Web**.
3. Réglages : *Exécuter en tant que* → **Moi**. *Qui a accès* → **Tout le
   monde**.
4. Clique sur **Déployer**. Google va demander une autorisation (normal,
   c'est ton propre script) : clique sur **Autoriser l'accès**, choisis ton
   compte, puis si un écran d'avertissement apparaît, clique sur
   **Paramètres avancés** → **Accéder à [nom du projet] (non sécurisé)**.
5. Copie l'URL fournie (elle se termine par `/exec`).

**Étape 4 — Relier le site à cette feuille**
Ouvre `server.js`, trouve la ligne :
```javascript
const GOOGLE_SHEET_WEBHOOK_URL = '';
```
et colle ton URL entre les guillemets. Sauvegarde, puis relance le serveur
(`Ctrl+C` puis `npm start`). Chaque nouvelle commande apparaîtra
automatiquement comme une nouvelle ligne dans la feuille Google Sheets.

Si Google Sheets est injoignable (réseau, panne...), la commande du client
n'est jamais bloquée : elle reste de toute façon enregistrée dans
`data/orders.json`.

## Passer de la démo aux vraies commandes

Les commandes passées pendant les essais ne doivent pas se mélanger aux
vraies. Le jour du lancement :

**1. Vider la liste des commandes du site**
```bash
npm run reset-orders
```
Tape `OUI` pour confirmer. Les commandes de démo ne sont pas perdues : elles
sont copiées dans `data/orders.backup-<date>.json`, puis `data/orders.json`
repart de zéro.

**2. Repartir d'une feuille Google Sheets vierge** (même lien, rien à
changer dans `server.js`)
1. Dans la feuille, renomme l'onglet actuel en `Démo` (clic droit sur
   l'onglet → Renommer).
2. Crée un nouvel onglet (bouton **+** en bas à gauche) nommé exactement
   `Commandes`, et recopie la ligne d'en-têtes :
   `Date | Référence | Client | Téléphone | Mode | Adresse | Articles | Total (FCFA)`
3. **Extensions → Apps Script** : remplace la ligne
   `var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();`
   par les deux lignes du script ci-dessus (`getSheetByName('Commandes')`),
   puis enregistre (icône disquette).
4. **Déployer → Gérer les déploiements** → crayon ✏️ → *Version* :
   **Nouvelle version** → **Déployer**. Le lien `/exec` reste le même.
5. Passe une commande test, vérifie qu'elle arrive dans `Commandes`, puis
   supprime cette ligne de test.

L'onglet `Démo` peut être gardé pour mémoire ou supprimé.

## Application mobile (Flutter)

Le dossier `mobile/` contient une application Flutter native — installable
sur téléphone Android/iOS — qui reprend exactement les mêmes fonctions que
le site web (catalogue par catégories, panier, commande avec confirmation
WhatsApp, Fraîcheur, Services, Localisation, Contact, Nouveautés avec
photos/vidéos), en consommant le même serveur (`server.js`).

Le code Dart est déjà écrit dans `mobile/lib/`, mais il manque la coquille
standard d'un projet Flutter (dossiers `android/`, `ios/`, fichiers Gradle,
etc.), qui doit être générée par TON SDK Flutter installé sur ta machine —
je ne peux pas la générer moi-même depuis cet environnement.

**Étape 1 — Générer la coquille du projet**

Dans un terminal, à la racine de `priximport-owendo` :
```bash
flutter create --project-name priximport_owendo_mobile --org com.priximportowendo mobile_shell
```
Cela crée un dossier `mobile_shell/` avec un projet Flutter complet et
vide. Ensuite, copie par-dessus (en écrasant) le contenu du dossier
`mobile/` déjà présent (le vrai `pubspec.yaml` et tout `lib/`) dans
`mobile_shell/` :
- remplace `mobile_shell/pubspec.yaml` par `mobile/pubspec.yaml`
- remplace tout le dossier `mobile_shell/lib/` par `mobile/lib/`

Renomme ensuite `mobile_shell` en `mobile` (en supprimant l'ancien dossier
`mobile` qui ne contenait que le code source).

**Étape 2 — Installer les dépendances**
```bash
cd mobile
flutter pub get
```

**Étape 3 — Adresse du serveur (`ApiConfig.baseUrl`)**

Ouvre `mobile/lib/services/api_service.dart` et choisis l'adresse selon ton
test :
- Émulateur Android → `http://10.0.2.2:3000` (déjà la valeur par défaut).
- Téléphone/tablette réel(le) sur le même Wi-Fi que ton PC → remplace par
  l'adresse IP locale de ton PC (commande `ipconfig` sous Windows, ligne
  "Adresse IPv4", ex. `192.168.1.20`) : `http://192.168.1.20:3000`.
- Simulateur iOS (Mac) → `http://localhost:3000`.

Le serveur Node doit tourner pendant le test (`npm start` à la racine du
projet).

**Étape 4 — Lancer l'appli**
```bash
flutter run
```
Choisis l'émulateur/téléphone branché quand Flutter le demande.

Si Wi-Fi ou serveur indisponibles pendant un test, comme sur le site web,
la commande n'est jamais perdue : l'appli génère une référence locale et
propose directement la confirmation par WhatsApp.
