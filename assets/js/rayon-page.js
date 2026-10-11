// ===== PRIX IMPORT — rayon-page.js =====
// Page pages/rayon.html. Avec ?r=<rayon> (ex. ?r=animalerie) : affiche le
// rayon (titre, couleur) et prépare products.js pour n'afficher que ses
// produits, filtrables par type. Sans paramètre : liste de tous les rayons
// (window.PioRayons, voir rayons.js), avec leur nombre de produits.
//
// Doit être chargé AVANT products.js, qui lit window.PRODUCTS_*.

(function () {
  const base = window.DATA_BASE || '';
  const rayons = window.PioRayons || [];
  const slug = new URLSearchParams(window.location.search).get('r');
  const rayon = rayons.find((r) => r.slug === slug && !r.href);

  const hero = document.getElementById('rayonHero');
  const index = document.getElementById('rayonIndex');

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  if (rayon) {
    const name = rayon.shortTitle || rayon.title;
    document.title = `${name} — ${(window.STORE ? window.STORE.name : 'Prix Import').toUpperCase()}`;
    document.getElementById('rayonCrumb').textContent = ' / ' + name;
    document.getElementById('rayonEyebrow').textContent = name;
    document.getElementById('rayonTitle').textContent = rayon.title;
    document.getElementById('rayonText').textContent = rayon.text;
    if (hero) hero.style.setProperty('--rayon-color', rayon.color);

    window.PRODUCTS_CATEGORY = rayon.category;
    window.PRODUCTS_FILTER_FIELD = rayon.typeField || 'subType';
    window.PRODUCTS_FILTER_ORDER = rayon.types;
    window.PRODUCTS_EMPTY_MESSAGE = 'Ce rayon se remplit bientôt — revenez nous voir !';
    return;
  }

  // --- Liste de tous les rayons ---
  // On retire la grille produits : products.js ne fera alors rien.
  ['productsGrid', 'categoryFilters', 'searchActiveBar'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  if (!index) return;
  index.hidden = false;

  function draw(products) {
    const count = (cat) => products.filter((p) => p.active !== false && p.category === cat).length;
    index.innerHTML = rayons.map((r) => {
      const n = count(r.category);
      return `
        <a class="rayon-card" href="${base}${escapeHtml(window.PioRayonHref(r))}" style="--rayon-color:${escapeHtml(r.color)}">
          <strong>${escapeHtml(r.shortTitle || r.title)}</strong>
          <span>${escapeHtml(r.text)}</span>
          <em>${n ? `${n} produit${n > 1 ? 's' : ''}` : 'Bientôt disponible'} →</em>
        </a>`;
    }).join('');
  }

  draw([]);
  fetch(base + 'data/products.json')
    .then((res) => (res.ok ? res.json() : []))
    .then(draw)
    .catch(() => {});
})();
