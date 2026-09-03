// posts-data.js
// Ajoute ou modifie tes publications ici — c'est le SEUL fichier à toucher
// pour publier une nouvelle photo ou vidéo.
//
// type: "photo" ou "video"
// Pour une vidéo YouTube  → renseigne "youtube": "ID_VIDEO" + "thumbnail"
// Pour une vidéo maison   → renseigne "video": "assets/videos/fichier.mp4" + "thumbnail"

window.POSTS = [
  {
    id: "p1",
    type: "photo",
    title: "Arrivage de tomates fraîches",
    caption: "Récoltées ce matin chez nos producteurs d'Owendo.",
    tag: "Fraîcheur locale",
    date: "2026-08-21",
    media: "assets/img/posts/tomates.jpg"
  },
  {
    id: "p2",
    type: "video",
    title: "Petit tour du rayon épicerie",
    caption: "Nos prix bas expliqués en une minute, en vidéo.",
    tag: "Coulisses",
    date: "2026-08-18",
    youtube: "REMPLACE_PAR_ID_YOUTUBE",
    thumbnail: "assets/img/posts/rayon-epicerie.jpg"
  },
  {
    id: "p3",
    type: "photo",
    title: "Nouveau : huile 5L en promo",
    caption: "8 900 FCFA le bidon, disponible cette semaine.",
    tag: "Nouveau produit",
    date: "2026-08-15",
    media: "assets/img/posts/huile-5l.jpg"
  },
  {
    id: "p4",
    type: "photo",
    title: "Riz 25kg, stock réapprovisionné",
    caption: "Le sac est de retour en rayon, prix inchangé.",
    tag: "Réassort",
    date: "2026-08-10",
    media: "assets/img/posts/riz-25kg.jpg"
  }
];