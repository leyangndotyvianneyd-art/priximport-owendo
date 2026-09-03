# Prix Import Owendo — Site vitrine

Site vitrine du supermarché **Prix Import Owendo** (Libreville, Gabon).
Le contenu du catalogue se gère en éditant un seul fichier — `data/products.json` —
sans jamais toucher au HTML, au CSS ou au JavaScript.

## Lancer le site en local

Le catalogue est chargé via `fetch()`, ce qui ne fonctionne pas si tu ouvres
`index.html` directement depuis l'explorateur de fichiers. Il faut un petit
serveur local :

**Option A — Extension VS Code (la plus simple)**
Installe l'extension *Live Server* (Ritwick Dey), puis clic droit sur
`index.html` → **Open with Live Server**.

**Option B — via npm**
```bash
npm install
npm start
```

## Ajouter un nouveau produit

Ouvre `data/products.json` et ajoute un objet dans le tableau :

```json
{
  "id": "farine-ble-1kg",
  "name": "Farine de blé",
  "unit": "Paquet 1kg",
  "oldPrice": 900,
  "price": 750,
  "badge": "-17%",
  "active": true
}
```

Sauvegarde : le catalogue se met à jour automatiquement.

## Supprimer un produit

Supprime son objet dans `data/products.json`, ou passe `"active"` à `false`
pour le masquer temporairement sans le perdre.