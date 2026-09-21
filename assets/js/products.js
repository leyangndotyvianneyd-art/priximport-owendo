// ===== PRIX IMPORT OWENDO — products.js =====
// Charge data/products.json et affiche les produits sur la page catalogue.

(function () {

  const dataBase = window.DATA_BASE || '';
  const grid = document.getElementById('productsGrid');
  const filtersWrap = document.getElementById('categoryFilters');
  const searchBar = document.getElementById('searchActiveBar');

  if (!grid) return; // pas sur la page catalogue

  const params = new URLSearchParams(window.location.search);
  const urlCategory = params.get('category');
  const searchQuery = (params.get('q') || '').trim();

  let allProducts = [];
  let activeCategory = urlCategory || 'Tous';

  // Recherche simple, insensible aux accents et à la casse (permet de
  // trouver "crème" en tapant "creme", par ex.) — utilisée par le champ de
  // recherche du header, qui redirige ici avec ?q=...
  function normalize(str) {
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  function formatPrice(n) {
    return n.toLocaleString('fr-FR').replace(/,/g, ' ') + ' FCFA';
  }

  function resolveImage(image) {
    if (!image) return '';
    return /^https?:\/\//.test(image) ? image : `${dataBase}assets/img/products/${image}`;
  }

  // Un produit "en promo" avec des dates de début/fin ne doit afficher le
  // badge "Promo" et l'ancien prix barré que pendant cette période — en
  // dehors, il redevient un produit normal sans qu'il faille y repenser.
  function isPromoActive(p) {
    if (!p.promo) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (p.promoStart) {
      const start = new Date(p.promoStart);
      if (today < start) return false;
    }
    if (p.promoEnd) {
      const end = new Date(p.promoEnd);
      end.setHours(23, 59, 59, 999);
      if (today > end) return false;
    }
    return true;
  }

  function renderFilters(categories) {
    if (!filtersWrap) return;
    const cats = ['Tous', ...categories];
    filtersWrap.innerHTML = cats.map(cat => `
      <button class="filter-btn${cat === activeCategory ? ' active' : ''}" data-category="${cat}">
        ${cat}
      </button>
    `).join('');

    filtersWrap.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.category;
        filtersWrap.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProducts();
      });
    });
  }

  function renderSearchBar() {
    if (!searchBar) return;
    if (!searchQuery) {
      searchBar.hidden = true;
      searchBar.innerHTML = '';
      return;
    }
    searchBar.hidden = false;
    searchBar.innerHTML = `
      <span>Résultats pour « <strong>${searchQuery}</strong> »</span>
      <a href="${dataBase}pages/catalogue.html">Réinitialiser la recherche ✕</a>
    `;
  }

  function renderProducts() {
    let filtered = activeCategory === 'Tous'
      ? allProducts
      : allProducts.filter(p => p.category === activeCategory);

    if (searchQuery) {
      const needle = normalize(searchQuery);
      filtered = filtered.filter(p =>
        normalize(p.name).includes(needle) || normalize(p.category).includes(needle)
      );
    }

    if (filtered.length === 0) {
      grid.innerHTML = `<p class="empty-state">${searchQuery ? 'Aucun produit ne correspond à votre recherche.' : 'Aucun produit dans cette catégorie pour le moment.'}</p>`;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const promoActive = isPromoActive(p);
      return `
      <div class="product-card">
        ${promoActive ? '<span class="badge-promo">Promo</span>' : ''}
        <div class="product-image" style="background-image:url('${resolveImage(p.image)}')"></div>
        <div class="product-body">
          <p class="product-category">${p.category}</p>
          <h3>${p.name}</h3>
          <div class="product-price">
            <span class="price">${formatPrice(p.price)}</span>
            ${promoActive && p.oldPrice ? `<span class="price-old">${formatPrice(p.oldPrice)}</span>` : ''}
          </div>
          <p class="product-unit">Prix / ${p.unit}</p>
          <button type="button" class="btn btn-primary btn-add-cart" data-id="${p.id}">Ajouter au panier</button>
        </div>
      </div>
    `;
    }).join('');

    grid.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = allProducts.find(p => p.id === btn.dataset.id);
        if (!product || !window.Cart) return;
        window.Cart.add(product, 1);
        if (typeof showToast === 'function') showToast(`${product.name} ajouté au panier`);
      });
    });
  }

  fetch(dataBase + 'data/products.json')
    .then(res => {
      if (!res.ok) throw new Error('Impossible de charger les produits');
      return res.json();
    })
    .then(products => {
      allProducts = products.filter(p => p.active !== false);
      const categories = [...new Set(allProducts.map(p => p.category))];
      if (activeCategory !== 'Tous' && !categories.includes(activeCategory)) {
        activeCategory = 'Tous';
      }
      renderSearchBar();
      renderFilters(categories);
      renderProducts();
    })
    .catch(err => {
      grid.innerHTML = '<p class="empty-state">Erreur de chargement du catalogue. Réessayez plus tard.</p>';
      console.error(err);
    });

})();
