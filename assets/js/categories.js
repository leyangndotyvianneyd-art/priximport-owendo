// ===== PRIX IMPORT OWENDO — categories.js =====
// Charge la liste des catégories depuis data/products.json pour alimenter
// le menu déroulant "Toutes les catégories" du header (présent sur toutes
// les pages) et la sidebar catégories de la page d'accueil, si présente.
//
// Au survol d'une catégorie (menu déroulant ou sidebar), un aperçu montre
// ce qu'elle contient : nombre de produits, promotions et quelques produits
// en photo — même principe que les aperçus des onglets (nav-preview.js).

(function () {
  const base = window.DATA_BASE || '';
  const dropdownBtn = document.getElementById('catDropdownBtn');
  const dropdownPanel = document.getElementById('catDropdownPanel');
  const sidebar = document.getElementById('homeCategorySidebar');

  if (!dropdownPanel && !sidebar) return;

  const catalogueUrl = base + 'pages/catalogue.html';
  const ALL = '';

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

  function categoryUrl(cat) {
    return cat === ALL ? catalogueUrl : `${catalogueUrl}?category=${encodeURIComponent(cat)}`;
  }

  function linkHTML(cat, label) {
    return `<a href="${categoryUrl(cat)}" data-cat="${escapeHtml(cat)}"><span class="dot"></span>${escapeHtml(label || cat)}</a>`;
  }

  function productHTML(p) {
    const promo = isPromoActive(p);
    const img = resolveImage(p.image);
    return `
      <a class="np-product" href="${catalogueUrl}?q=${encodeURIComponent(p.name)}">
        <span class="np-thumb"${img ? ` style="background-image:url('${escapeHtml(img)}')"` : ''}>
          ${promo ? '<span class="np-badge">Promo</span>' : ''}
        </span>
        <span class="np-name">${escapeHtml(p.name)}</span>
        <span class="np-price">${formatPrice(p.price)}${promo && p.oldPrice ? ` <s>${formatPrice(p.oldPrice)}</s>` : ''}</span>
      </a>`;
  }

  // Aperçu d'une catégorie (ou de tout le catalogue si cat === ALL) : les
  // produits en promo passent en premier.
  function previewHTML(cat, active) {
    const list = cat === ALL ? active : active.filter((p) => p.category === cat);
    const promos = list.filter(isPromoActive);
    const picks = promos.concat(list.filter((p) => !isPromoActive(p))).slice(0, 6);
    const count = `${list.length} produit${list.length > 1 ? 's' : ''}` +
      (promos.length ? ` · ${promos.length} en promo` : '');
    return `
      <div class="cat-preview-head">
        <div>
          <h4>${escapeHtml(cat === ALL ? 'Tout le catalogue' : cat)}</h4>
          <p>${count}</p>
        </div>
        <a class="see-all" href="${categoryUrl(cat)}">Voir ${cat === ALL ? 'tout' : 'la catégorie'} →</a>
      </div>
      <div class="cat-preview-grid">${picks.map(productHTML).join('') || '<p class="np-empty">Aucun produit pour le moment.</p>'}</div>`;
  }

  // Branche l'aperçu sur une liste de liens : survol ou focus clavier d'un
  // lien = affichage de sa catégorie dans `preview`.
  function wirePreview(container, preview, active, onShow) {
    let current = null;
    container.querySelectorAll('a[data-cat]').forEach((link) => {
      const show = () => {
        const cat = link.dataset.cat;
        container.querySelectorAll('a[data-cat].is-active').forEach((a) => a.classList.remove('is-active'));
        link.classList.add('is-active');
        if (current !== cat) {
          preview.innerHTML = previewHTML(cat, active);
          current = cat;
        }
        if (onShow) onShow();
      };
      link.addEventListener('mouseenter', show);
      link.addEventListener('focus', show);
    });
  }

  fetch(base + 'data/products.json')
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((products) => {
      const active = products.filter((p) => p.active !== false);
      const categories = [...new Set(active.map((p) => p.category))]
        .sort((a, b) => a.localeCompare(b, 'fr'));

      if (dropdownPanel) {
        if (categories.length) {
          dropdownPanel.classList.add('has-preview');
          dropdownPanel.innerHTML = `
            <div class="cat-list">
              ${linkHTML(ALL, 'Tout le catalogue')}
              ${categories.map((c) => linkHTML(c)).join('')}
            </div>
            <div class="cat-preview"></div>`;
          const list = dropdownPanel.querySelector('.cat-list');
          const preview = dropdownPanel.querySelector('.cat-preview');
          wirePreview(list, preview, active);
          // Aperçu par défaut à l'ouverture : tout le catalogue.
          preview.innerHTML = previewHTML(ALL, active);
          list.querySelector('a[data-cat]').classList.add('is-active');
        } else {
          dropdownPanel.innerHTML = '<p class="empty">Catalogue indisponible pour le moment.</p>';
        }
      }

      if (sidebar) {
        sidebar.innerHTML = '<h3>Catégories</h3>' +
          (categories.length
            ? categories.map((c) => linkHTML(c)).join('') + '<div class="cat-flyout" hidden></div>'
            : '<p class="empty">Aucune catégorie pour le moment.</p>');
        const flyout = sidebar.querySelector('.cat-flyout');
        if (flyout) {
          // Le volet s'ouvre à droite de la sidebar ; il se referme quand
          // la souris quitte l'ensemble sidebar + volet.
          wirePreview(sidebar, flyout, active, () => { flyout.hidden = false; });
          const hide = () => {
            flyout.hidden = true;
            sidebar.querySelectorAll('a[data-cat].is-active').forEach((a) => a.classList.remove('is-active'));
          };
          sidebar.addEventListener('mouseleave', hide);
          sidebar.addEventListener('focusout', (e) => {
            if (!sidebar.contains(e.relatedTarget)) hide();
          });
          document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
        }
      }
    })
    .catch(() => {
      const msg = '<p class="empty">Impossible de charger les catégories.</p>';
      if (dropdownPanel) dropdownPanel.innerHTML = msg;
      if (sidebar) sidebar.innerHTML = '<h3>Catégories</h3>' + msg;
    });

  if (dropdownBtn) {
    const wrap = dropdownBtn.closest('.cat-dropdown');
    let openedByHoverAt = 0;
    let closeTimer = null;

    function setOpen(isOpen) {
      wrap.classList.toggle('open', isOpen);
      dropdownBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Juste ouvert par le survol : le clic qui suit ne doit pas le refermer.
      if (wrap.classList.contains('open') && Date.now() - openedByHoverAt < 600) return;
      setOpen(!wrap.classList.contains('open'));
    });

    // Sur ordinateur (souris), le menu s'ouvre aussi au survol, comme les
    // aperçus des onglets, et se referme peu après que la souris le quitte.
    if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
      wrap.addEventListener('mouseenter', () => {
        clearTimeout(closeTimer);
        if (!wrap.classList.contains('open')) {
          openedByHoverAt = Date.now();
          setOpen(true);
        }
      });
      wrap.addEventListener('mouseleave', () => {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => setOpen(false), 250);
      });
    }
    document.addEventListener('click', (e) => {
      if (wrap.classList.contains('open') && !wrap.contains(e.target)) {
        wrap.classList.remove('open');
        dropdownBtn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && wrap.classList.contains('open')) {
        wrap.classList.remove('open');
        dropdownBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }
})();
