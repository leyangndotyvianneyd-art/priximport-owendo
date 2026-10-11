// ===== PRIX IMPORT — home.js =====
// Page d'accueil, façon appli de shopping, à partir de data/products.json
// (même source que le catalogue, assets/js/products.js) :
//  - "Explorez nos rayons" : une carte par catégorie, photo + prix de départ
//  - "Pour vous" : onglets (Tous, Promotions, rayons) + grille de produits

(function () {
  const base = window.DATA_BASE || '';
  const aisles = document.getElementById('homeAisles');
  const filters = document.getElementById('homeFilters');
  const grid = document.getElementById('homeGrid');
  if (!aisles && !grid) return;

  const ALL = 'Tous';
  const PROMOS = 'Promotions';
  const GRID_LIMIT = 24;
  const catalogueUrl = base + 'pages/catalogue.html';

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatPrice(n) {
    return Number(n || 0).toLocaleString('fr-FR').replace(/,/g, ' ') + ' FCFA';
  }

  function resolveImage(image) {
    if (!image) return '';
    // Photo envoyée depuis l'admin : chemin déjà complet (assets/...).
    if (/^assets\//.test(image)) return base + image;
    return /^https?:\/\//.test(image) ? image : `${base}assets/img/products/${image}`;
  }

  function isPromoActive(p) {
    if (!p.promo) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (p.promoStart && today < new Date(p.promoStart)) return false;
    if (p.promoEnd) {
      const end = new Date(p.promoEnd);
      end.setHours(23, 59, 59, 999);
      if (today > end) return false;
    }
    return true;
  }

  function discountLabel(p) {
    const pct = p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    return pct > 0 ? `-${pct} %` : 'Promo';
  }

  function cardHTML(p) {
    const promo = isPromoActive(p);
    return `
      <div class="product-card">
        ${promo ? `<span class="badge-promo">${discountLabel(p)}</span>` : ''}
        <a class="product-image" href="${catalogueUrl}?q=${encodeURIComponent(p.name)}" style="background-image:url('${escapeHtml(resolveImage(p.image))}')" aria-label="${escapeHtml(p.name)}"></a>
        <div class="product-body">
          <p class="product-category">${escapeHtml(p.category)}</p>
          <h3>${escapeHtml(p.name)}</h3>
          <div class="product-price${promo ? ' is-promo' : ''}">
            <span class="price">${formatPrice(p.price)}</span>
            ${promo && p.oldPrice ? `<span class="price-old">${formatPrice(p.oldPrice)}</span>` : ''}
          </div>
          <p class="product-unit">${escapeHtml(p.unit)}</p>
          <button type="button" class="btn btn-primary btn-add-cart" data-id="${escapeHtml(p.id)}">Ajouter au panier</button>
        </div>
      </div>`;
  }

  function renderAisles(active) {
    if (!aisles) return;
    const byCat = new Map();
    active.forEach((p) => {
      if (!byCat.has(p.category)) byCat.set(p.category, []);
      byCat.get(p.category).push(p);
    });
    aisles.innerHTML = [...byCat.entries()].map(([cat, list]) => {
      const cover = list.find((p) => p.image) || list[0];
      const min = Math.min(...list.map((p) => Number(p.price) || 0));
      // Catégorie qui a son propre rayon (Cave à vin, Animalerie...) : on
      // ouvre la page du rayon, sinon le catalogue filtré.
      const rayon = (window.PioRayons || []).find((r) => r.category === cat);
      const href = rayon
        ? base + window.PioRayonHref(rayon)
        : `${catalogueUrl}?category=${encodeURIComponent(cat)}`;
      return `
        <a class="aisle-card" href="${href}">
          <span class="aisle-img" style="background-image:url('${escapeHtml(resolveImage(cover.image))}')">
            <span class="aisle-price">dès ${formatPrice(min)}</span>
          </span>
          <span class="aisle-name">${escapeHtml(cat)}</span>
        </a>`;
    }).join('') || '<p class="carousel-empty">Aucun rayon pour le moment.</p>';
  }

  function renderGrid(active) {
    if (!grid) return;
    const promos = active.filter(isPromoActive);
    const categories = [...new Set(active.map((p) => p.category))]
      .sort((a, b) => a.localeCompare(b, 'fr'));
    const labels = [ALL, ...(promos.length ? [PROMOS] : []), ...categories];
    let current = ALL;

    function list() {
      if (current === ALL) return promos.concat(active.filter((p) => !isPromoActive(p)));
      if (current === PROMOS) return promos;
      return active.filter((p) => p.category === current);
    }

    function draw() {
      const items = list().slice(0, GRID_LIMIT);
      grid.innerHTML = items.map(cardHTML).join('') ||
        '<p class="empty-state">Aucun produit pour le moment.</p>';
      grid.querySelectorAll('.btn-add-cart').forEach((btn) => {
        btn.addEventListener('click', () => {
          const product = active.find((p) => p.id === btn.dataset.id);
          if (!product || !window.Cart) return;
          window.Cart.add(product, 1);
          if (typeof showToast === 'function') showToast(`${product.name} ajouté au panier`);
        });
      });
    }

    if (filters) {
      filters.innerHTML = labels.map((l) => `
        <button type="button" class="filter-btn${l === current ? ' active' : ''}" data-label="${escapeHtml(l)}">
          ${l === PROMOS ? '🏷️ ' : ''}${escapeHtml(l)}
        </button>`).join('');
      filters.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        current = btn.dataset.label;
        filters.querySelectorAll('.filter-btn').forEach((b) => b.classList.toggle('active', b === btn));
        draw();
      });
    }
    draw();
  }

  fetch(base + 'data/products.json')
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((products) => {
      const active = products.filter((p) => p.active !== false);
      renderAisles(active);
      renderGrid(active);
    })
    .catch(() => {
      const msg = '<p class="carousel-empty">Erreur de chargement du catalogue.</p>';
      if (aisles) aisles.innerHTML = msg;
      if (grid) grid.innerHTML = msg;
    });
})();
