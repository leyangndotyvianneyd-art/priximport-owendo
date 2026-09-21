// ===== PRIX IMPORT OWENDO — home.js =====
// Alimente les carrousels produits de la page d'accueil ("Notre sélection"
// et "Promotions en cours") à partir de data/products.json — même source
// que le catalogue (assets/js/products.js), pour rester toujours à jour.

(function () {
  const base = window.DATA_BASE || '';
  const bestTrack = document.getElementById('bestSellersTrack');
  const promoTrack = document.getElementById('promoTrack');
  if (!bestTrack && !promoTrack) return;

  function formatPrice(n) {
    return n.toLocaleString('fr-FR').replace(/,/g, ' ') + ' FCFA';
  }

  function resolveImage(image) {
    if (!image) return '';
    return /^https?:\/\//.test(image) ? image : `${base}assets/img/products/${image}`;
  }

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

  function cardHTML(p) {
    const promoActive = isPromoActive(p);
    return `
      <div class="product-card carousel-card">
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
      </div>`;
  }

  function wireAddToCart(track, products) {
    track.querySelectorAll('.btn-add-cart').forEach((btn) => {
      btn.addEventListener('click', () => {
        const product = products.find((p) => p.id === btn.dataset.id);
        if (!product || !window.Cart) return;
        window.Cart.add(product, 1);
        if (typeof showToast === 'function') showToast(`${product.name} ajouté au panier`);
      });
    });
  }

  fetch(base + 'data/products.json')
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((products) => {
      const active = products.filter((p) => p.active !== false);

      if (bestTrack) {
        const selection = active.slice(0, 12);
        bestTrack.innerHTML = selection.length
          ? selection.map(cardHTML).join('')
          : '<p class="carousel-empty">Aucun produit pour le moment.</p>';
        wireAddToCart(bestTrack, selection);
      }

      if (promoTrack) {
        const promos = active.filter(isPromoActive);
        const promoSection = promoTrack.closest('section');
        if (promos.length) {
          if (promoSection) promoSection.hidden = false;
          promoTrack.innerHTML = promos.map(cardHTML).join('');
          wireAddToCart(promoTrack, promos);
        } else if (promoSection) {
          // Pas de promotion active : on masque toute la section plutôt que
          // d'afficher un carrousel vide.
          promoSection.hidden = true;
        }
      }
    })
    .catch(() => {
      const msg = '<p class="carousel-empty">Erreur de chargement du catalogue.</p>';
      if (bestTrack) bestTrack.innerHTML = msg;
      if (promoTrack) promoTrack.innerHTML = msg;
    });
})();
