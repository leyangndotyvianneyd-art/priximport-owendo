// ===== PRIX IMPORT OWENDO — rayons.js =====
// Liste des rayons mis en avant (onglet « Rayons » du site, page
// pages/rayon.html, menu de l'administration). Chaque rayon regroupe les
// produits d'une catégorie (champ "category" de data/products.json), que
// l'on peut filtrer par type (champ "subType", ou "wineType" pour la cave).
//
// Pour ajouter un rayon : ajouter une entrée ici (et dans
// mobile/lib/models/rayon.dart pour l'application), puis créer des produits
// de la catégorie correspondante dans l'administration.

window.PioRayons = [
  {
    slug: 'fraicheur',
    category: 'Fraîcheur & Local',
    title: 'Fraîcheur & local',
    text: 'Plantain, manioc, poisson du port et légumes de saison, en priorité auprès des producteurs gabonais.',
    href: 'pages/fraicheur.html',
    color: '#1B4332',
    types: []
  },
  {
    slug: 'cave',
    category: 'Cave à vin',
    title: 'Cave à vin',
    text: 'Rouges, blancs, rosés, champagnes et spiritueux au prix import.',
    href: 'pages/cave.html',
    color: '#8B1E3F',
    typeField: 'wineType',
    types: ['Rouge', 'Blanc', 'Rosé', 'Champagne & mousseux', 'Spiritueux']
  },
  {
    slug: 'electromenager',
    category: 'Électroménager',
    title: 'Électroménager',
    text: 'Réfrigérateurs, congélateurs, ventilateurs, mixeurs, bouilloires, fers à repasser… pour équiper toute la maison.',
    color: '#1D4ED8',
    types: ['Gros électroménager', 'Petit électroménager', 'Climatisation & ventilation', 'Entretien de la maison']
  },
  {
    slug: 'ustensiles',
    category: 'Ustensiles de cuisine',
    title: 'Ustensiles de cuisine',
    text: 'Marmites, casseroles, poêles, couverts, vaisselle et rangements : tout pour cuisiner et recevoir.',
    color: '#B45309',
    types: ['Marmites & casseroles', 'Poêles & cocottes', 'Couverts & vaisselle', 'Préparation & découpe', 'Rangement & conservation']
  },
  {
    slug: 'charcuterie',
    category: 'Charcuterie',
    title: 'Charcuterie',
    text: 'Jambons, saucissons, salamis, saucisses, pâtés et lardons, pour vos sandwichs, apéritifs et petits plats.',
    color: '#BE185D',
    types: ['Jambons', 'Saucissons & salamis', 'Saucisses', 'Pâtés & terrines', 'Lardons & bacon']
  },
  {
    slug: 'conserves',
    category: 'Conserves',
    title: 'Conserves',
    text: 'Sardines, thon, corned-beef, tomate concentrée, petits pois, fruits au sirop… les indispensables du placard.',
    color: '#B91C1C',
    types: ['Poissons', 'Viandes', 'Légumes', 'Sauces & tomate', 'Fruits & desserts']
  },
  {
    slug: 'animalerie',
    category: 'Animalerie',
    title: 'Animalerie : tout pour votre chien',
    shortTitle: 'Animalerie',
    text: 'Croquettes, pâtées, friandises, colliers, laisses, gamelles et produits de soin pour votre chien.',
    color: '#0F766E',
    types: ['Nourriture', 'Friandises', 'Accessoires', 'Hygiène & soins']
  }
];

// Adresse de la page d'un rayon, depuis la racine du site.
window.PioRayonHref = function (r) {
  return r.href || 'pages/rayon.html?r=' + encodeURIComponent(r.slug);
};
