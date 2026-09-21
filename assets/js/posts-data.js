// posts-data.js
// ⚠️ FICHIER OBSOLÈTE — plus utilisé par le site depuis l'ajout de la page
// d'administration (pages/admin.html). Les publications se gèrent
// maintenant dans data/posts.json (à la main, ou via l'admin — voir
// README.md, section "Administration du catalogue et des Nouveautés").
// Ce fichier n'est plus chargé par aucune page ; gardé pour référence.
//
// type: "photo" ou "video"
// Pour une vidéo YouTube  → renseigne "youtube": "ID_VIDEO" + "thumbnail"
// Pour une vidéo maison   → renseigne "video": "assets/videos/fichier.mp4" + "thumbnail"
// "media"/"thumbnail" peuvent être un chemin local (assets/img/posts/...)
// ou une URL complète (https://...) le temps d'avoir de vraies photos.

window.POSTS = [
  {
    id: "p1",
    type: "photo",
    title: "Arrivage de tomates fraîches",
    caption: "Récoltées ce matin chez nos producteurs d'Owendo.",
    tag: "Fraîcheur locale",
    date: "2026-08-21",
    media: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=800"
  },
  {
    id: "p2",
    type: "video",
    title: "Petit tour du rayon épicerie",
    caption: "Nos prix bas expliqués en une minute, en vidéo.",
    tag: "Coulisses",
    date: "2026-08-18",
    // Vidéo de TEST (Big Buck Bunny, Blender Foundation, libre de droits) —
    // juste pour vérifier que le lecteur fonctionne. Remplace "aqz-KE-bpKQ"
    // par l'ID de ta vraie vidéo YouTube dès que tu l'as (l'ID est la partie
    // après "v=" dans l'URL YouTube, ex: youtube.com/watch?v=CET_ID_ICI).
    youtube: "aqz-KE-bpKQ",
    thumbnail: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=800"
  },
  {
    id: "p3",
    type: "photo",
    title: "Nouveau : huile 5L en promo",
    caption: "8 900 FCFA le bidon, disponible cette semaine.",
    tag: "Nouveau produit",
    date: "2026-08-15",
    media: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=800"
  },
  {
    id: "p4",
    type: "photo",
    title: "Riz 25kg, stock réapprovisionné",
    caption: "Le sac est de retour en rayon, prix inchangé.",
    tag: "Réassort",
    date: "2026-08-10",
    media: "https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=800"
  }
];
