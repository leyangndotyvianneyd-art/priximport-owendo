// ===== PRIX IMPORT — products.js =====
// Charge data/products.json et affiche les produits sur la page catalogue.
// Sert aussi aux pages "rayon" (ex. Cave à vin) : si la page définit
// window.PRODUCTS_CATEGORY, seuls les produits de cette catégorie sont
// affichés, et les boutons de filtre portent sur window.PRODUCTS_FILTER_FIELD
// (ex. "wineType" : Rouge, Blanc...) au lieu de la catégorie.

(function () {

  const dataBase = window.DATA_BASE || '';
  const grid = document.getElementById('productsGrid');
  const filtersWrap = document.getElementById('categoryFilters');
  const searchBar = document.getElementById('searchActiveBar');

  if (!grid) return; // pas sur la page catalogue

  const params = new URLSearchParams(window.location.search);
  const urlCategory = params.get('category');
  const searchQuery = (params.get('q') || '').trim();

  const fixedCategory = window.PRODUCTS_CATEGORY || null;
  const filterField = window.PRODUCTS_FILTER_FIELD || 'category';
  const filterOrder = window.PRODUCTS_FILTER_ORDER || null;

  let allProducts = [];
  let activeCategory = (fixedCategory ? params.get(filterField) : urlCategory) || 'Tous';

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
    // Photo envoyée depuis l'admin : chemin déjà complet (assets/...).
    if (/^assets\//.test(image)) return dataBase + image;
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
    if (!categories.length) {
      filtersWrap.innerHTML = '';
      return;
    }
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
      : allProducts.filter(p => p[filterField] === activeCategory);

    if (searchQuery) {
      const needle = normalize(searchQuery);
      filtered = filtered.filter(p =>
        normalize(p.name).includes(needle) || normalize(p.category).includes(needle) ||
        normalize(p[filterField] || '').includes(needle)
      );
    }

    if (filtered.length === 0) {
      const emptyMsg = searchQuery
        ? 'Aucun produit ne correspond à votre recherche.'
        : (fixedCategory && window.PRODUCTS_EMPTY_MESSAGE) || 'Aucun produit dans cette catégorie pour le moment.';
      grid.innerHTML = `<p class="empty-state">${emptyMsg}</p>`;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const promoActive = isPromoActive(p);
      return `
      <div class="product-card">
        ${promoActive ? `<span class="badge-promo">${p.oldPrice > p.price ? `-${Math.round((1 - p.price / p.oldPrice) * 100)} %` : 'Promo'}</span>` : ''}
        <div class="product-image" style="background-image:url('${resolveImage(p.image)}')" data-zoom-id="${p.id}" role="button" tabindex="0" aria-label="Voir la photo de ${p.name} en grand"></div>
        <div class="product-body">
          <p class="product-category">${(fixedCategory && p[filterField]) || p.category}</p>
          <h3>${p.name}</h3>
          <div class="product-price${promoActive ? ' is-promo' : ''}">
            <span class="price">${formatPrice(p.price)}</span>
            ${promoActive && p.oldPrice ? `<span class="price-old">${formatPrice(p.oldPrice)}</span>` : ''}
          </div>
          <p class="product-unit">${p.unit}</p>
          <button type="button" class="btn btn-primary btn-add-cart" data-id="${p.id}">Ajouter au panier</button>
        </div>
      </div>
    `;
    }).join('');

    bindAddToCartButtons(grid);
  }

  function addToCartById(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product || !window.Cart) return;
    window.Cart.add(product, 1);
    if (typeof showToast === 'function') showToast(`${product.name} ajouté au panier`);
  }

  function bindAddToCartButtons(container) {
    container.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', () => addToCartById(btn.dataset.id));
    });
  }

  // Clic (ou Entrée/Espace) sur la photo d'un produit : ouvre la lightbox
  // déjà utilisée ailleurs sur le site pour les vidéos. Si le produit a un
  // "group" partagé avec d'autres produits actifs (ex. plusieurs marques de
  // farine), on affiche une vue comparative (photos + prix) plutôt qu'une
  // simple photo agrandie, pour que le client puisse comparer d'un coup d'œil.
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const media = lightbox.querySelector('.lightbox-media');

    function openImageLightbox(src, name) {
      media.className = 'lightbox-media is-image';
      media.innerHTML = `<img src="${src}" alt="${name}">`;
      lightbox.classList.add('open');
    }

    // Plusieurs photos pour un même produit (ex. plusieurs vues de l'étal de
    // poisson) : le client peut faire défiler (flèches, points, glisser au
    // doigt) au lieu d'une seule photo fixe.
    function openGalleryLightbox(images, name) {
      media.className = 'lightbox-media is-gallery';
      media.innerHTML = `
        <div class="gallery">
          <button type="button" class="gallery-arrow gallery-prev" aria-label="Photo précédente">&#8249;</button>
          <div class="gallery-track">
            ${images.map(src => `<div class="gallery-slide"><img src="${src}" alt="${name}"></div>`).join('')}
          </div>
          <button type="button" class="gallery-arrow gallery-next" aria-label="Photo suivante">&#8250;</button>
        </div>
        <div class="gallery-dots">
          ${images.map((_, i) => `<button type="button" class="gallery-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Aller à la photo ${i + 1}"></button>`).join('')}
        </div>
      `;
      lightbox.classList.add('open');

      const track = media.querySelector('.gallery-track');
      const dots = media.querySelectorAll('.gallery-dot');

      function currentIndex() {
        return Math.round(track.scrollLeft / track.clientWidth);
      }
      function goToSlide(i) {
        const clamped = Math.max(0, Math.min(images.length - 1, i));
        track.children[clamped].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }

      media.querySelector('.gallery-prev').addEventListener('click', () => goToSlide(currentIndex() - 1));
      media.querySelector('.gallery-next').addEventListener('click', () => goToSlide(currentIndex() + 1));
      dots.forEach(dot => dot.addEventListener('click', () => goToSlide(Number(dot.dataset.index))));
      track.addEventListener('scroll', () => {
        const i = currentIndex();
        dots.forEach((d, idx) => d.classList.toggle('active', idx === i));
      }, { passive: true });
    }

    function openCompareLightbox(items) {
      media.className = 'lightbox-media is-compare';
      media.innerHTML = `
        <h3 class="compare-title">Comparer les options</h3>
        <div class="compare-grid">
          ${items.map(p => `
            <div class="compare-card">
              <div class="compare-card-image" style="background-image:url('${resolveImage(p.image)}')"></div>
              <p class="product-category">${p.category}</p>
              <h4>${p.name}</h4>
              <div class="product-price">
                <span class="price">${formatPrice(p.price)}</span>
              </div>
              <p class="product-unit">Prix / ${p.unit}</p>
              <button type="button" class="btn btn-primary btn-add-cart" data-id="${p.id}">Ajouter au panier</button>
            </div>
          `).join('')}
        </div>
      `;
      bindAddToCartButtons(media);
      lightbox.classList.add('open');
    }

    function openProductLightbox(id) {
      const product = allProducts.find(p => p.id === id);
      if (!product) return;
      const group = product.group
        ? allProducts.filter(p => p.group === product.group)
        : [product];
      const gallery = [product.image, ...(product.images || [])].filter(Boolean).map(resolveImage);
      if (group.length > 1) {
        openCompareLightbox(group);
      } else if (gallery.length > 1) {
        openGalleryLightbox(gallery, product.name);
      } else {
        openImageLightbox(resolveImage(product.image), product.name);
      }
    }

    function closeLightbox() {
      if (!lightbox.classList.contains('open')) return;
      lightbox.classList.remove('open');
      media.className = 'lightbox-media';
      media.innerHTML = '';
      // Même principe que dans posts.js : la visionneuse invisible capte
      // encore les clics un court instant pour qu'un toucher sur le ✕ ne
      // traverse pas jusqu'au lien situé dessous.
      lightbox.classList.add('closing');
      clearTimeout(lightbox._closingTimer);
      lightbox._closingTimer = setTimeout(() => lightbox.classList.remove('closing'), 400);
    }

    // Le ✕ ferme dès qu'on relâche la souris (ou le doigt) dessus, même si
    // elle a un peu bougé depuis l'appui (cas où un "click" est ignoré).
    const closeBtn = lightbox.querySelector('.lightbox-close');
    if (closeBtn) closeBtn.addEventListener('pointerup', closeLightbox);

    grid.addEventListener('click', (e) => {
      const el = e.target.closest('[data-zoom-id]');
      if (!el) return;
      openProductLightbox(el.dataset.zoomId);
    });

    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = e.target.closest('[data-zoom-id]');
      if (!el) return;
      e.preventDefault();
      openProductLightbox(el.dataset.zoomId);
    });

    // Ferme sur le ✕, sur le fond sombre, ou sur une photo simple agrandie
    // (pas dans la galerie ni la comparaison, qui ont leurs propres clics).
    lightbox.addEventListener('click', (e) => {
      const onPhoto = media.classList.contains('is-image') && e.target.closest('.lightbox-media');
      if (e.target.closest('.lightbox-close') || e.target === lightbox || onPhoto) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (!lightbox.classList.contains('open') || !media.classList.contains('is-gallery')) return;
      if (e.key === 'ArrowLeft') media.querySelector('.gallery-prev')?.click();
      if (e.key === 'ArrowRight') media.querySelector('.gallery-next')?.click();
    });
  }

  fetch(dataBase + 'data/products.json')
    .then(res => {
      if (!res.ok) throw new Error('Impossible de charger les produits');
      return res.json();
    })
    .then(products => {
      allProducts = products.filter(p => p.active !== false &&
        (!fixedCategory || p.category === fixedCategory));
      let categories = [...new Set(allProducts.map(p => p[filterField]).filter(Boolean))];
      if (filterOrder) {
        const rank = (c) => (filterOrder.includes(c) ? filterOrder.indexOf(c) : filterOrder.length);
        categories.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'fr'));
      }
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
