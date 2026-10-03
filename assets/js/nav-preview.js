// ===== PRIX IMPORT OWENDO — nav-preview.js =====
// Aperçu au survol des onglets du menu principal (.nav-links) : quand on
// passe la souris (ou le clavier) sur "Catalogue", "Nouveautés", etc., un
// panneau s'ouvre sous la barre et montre ce qu'on va trouver dans l'onglet.
// Tout est tiré des mêmes fichiers que le reste du site (data/products.json,
// data/posts.json, data/content.json) : ce que l'admin modifie apparaît donc
// aussi dans les aperçus, sans rien toucher ici.

(function () {
  const base = window.DATA_BASE || '';
  const links = document.querySelectorAll('.nav-links > li > a[data-page]');
  if (!links.length) return;

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatPrice(n) {
    return Number(n || 0).toLocaleString('fr-FR').replace(/,/g, ' ') + ' FCFA';
  }

  function resolveAsset(src) {
    if (!src) return '';
    return /^https?:\/\//.test(src) ? src : base + src;
  }

  function resolveProductImage(image) {
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

  function youtubeThumb(raw) {
    const m = String(raw || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([A-Za-z0-9_-]{11})/);
    const id = m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(String(raw || '').trim()) ? String(raw).trim() : '');
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
  }

  // --- Blocs réutilisables ---

  function introHTML(opts) {
    return `
      <div class="np-intro">
        <p class="np-eyebrow">${escapeHtml(opts.eyebrow)}</p>
        <h3>${escapeHtml(opts.title)}</h3>
        <p class="np-text">${escapeHtml(opts.text)}</p>
        <a class="btn btn-primary btn-sm" href="${opts.href}">${escapeHtml(opts.cta)} →</a>
      </div>`;
  }

  function productHTML(p) {
    const promo = isPromoActive(p);
    const img = resolveProductImage(p.image);
    return `
      <a class="np-product" href="${base}pages/catalogue.html?q=${encodeURIComponent(p.name)}">
        <span class="np-thumb"${img ? ` style="background-image:url('${escapeHtml(img)}')"` : ''}>
          ${promo ? '<span class="np-badge">Promo</span>' : ''}
        </span>
        <span class="np-name">${escapeHtml(p.name)}</span>
        <span class="np-price">${formatPrice(p.price)}${promo && p.oldPrice ? ` <s>${formatPrice(p.oldPrice)}</s>` : ''}</span>
      </a>`;
  }

  function cardHTML(c, iconSvg) {
    const inner = `
      <span class="np-card-icon">${iconSvg}</span>
      <span>
        <strong>${escapeHtml(c.title)}</strong>
        <span class="np-card-text">${escapeHtml(c.text)}</span>
      </span>`;
    return c.href
      ? `<a class="np-card" href="${base}${escapeHtml(c.href)}">${inner}</a>`
      : `<div class="np-card">${inner}</div>`;
  }

  // --- Contenu de chaque onglet ---

  const builders = {
    catalogue(d) {
      const active = d.products.filter((p) => p.active !== false);
      const promos = active.filter(isPromoActive);
      const categories = [...new Set(active.map((p) => p.category))].sort((a, b) => a.localeCompare(b, 'fr'));
      const picks = promos.concat(active.filter((p) => !isPromoActive(p))).slice(0, 4);
      const chips = categories.map((cat) =>
        `<a class="np-chip" href="${base}pages/catalogue.html?category=${encodeURIComponent(cat)}">${escapeHtml(cat)}</a>`
      ).join('');
      return introHTML({
        eyebrow: 'Catalogue',
        title: 'Tout le magasin, au meilleur prix',
        text: `${active.length} produits dans ${categories.length} catégories` +
          (promos.length ? `, dont ${promos.length} en promotion en ce moment.` : '.'),
        href: base + 'pages/catalogue.html',
        cta: 'Voir le catalogue'
      }) + `
        <div class="np-body">
          <div class="np-products">${picks.map(productHTML).join('') || '<p class="np-empty">Aucun produit pour le moment.</p>'}</div>
          ${chips ? `<div class="np-chips">${chips}</div>` : ''}
        </div>`;
    },

    fraicheur(d) {
      const cards = (d.content.cards && d.content.cards.fraicheur) || [];
      const fresh = d.products.filter((p) => p.active !== false && p.category === 'Fraîcheur & Local').slice(0, 3);
      const Icons = window.PioIcons;
      return introHTML({
        eyebrow: 'Fraîcheur & Local',
        title: 'Le meilleur du Gabon, chaque matin',
        text: 'Plantain, manioc, poisson du port et légumes de saison, en priorité auprès des producteurs gabonais.',
        href: base + 'pages/fraicheur.html',
        cta: 'Découvrir le rayon frais'
      }) + `
        <div class="np-body">
          <div class="np-cards">${cards.slice(0, 4).map((c) => cardHTML(c, Icons ? Icons.freshSvg(c.icon) : '')).join('')}</div>
          ${fresh.length ? `<div class="np-products">${fresh.map(productHTML).join('')}</div>` : ''}
        </div>`;
    },

    cave(d) {
      const wines = d.products.filter((p) => p.active !== false && p.category === 'Cave à vin');
      const promos = wines.filter(isPromoActive);
      const picks = promos.concat(wines.filter((p) => !isPromoActive(p))).slice(0, 4);
      const types = [...new Set(wines.map((p) => p.wineType).filter(Boolean))];
      const chips = types.map((t) =>
        `<a class="np-chip" href="${base}pages/cave.html?wineType=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`
      ).join('');
      return introHTML({
        eyebrow: 'Cave à vin',
        title: 'Vins & spiritueux au prix import',
        text: wines.length
          ? `${wines.length} bouteille${wines.length > 1 ? 's' : ''} en cave` +
            (promos.length ? `, dont ${promos.length} en promotion en ce moment.` : '.')
          : 'Rouges, blancs, rosés, champagnes et spiritueux pour vos repas et vos fêtes.',
        href: base + 'pages/cave.html',
        cta: 'Entrer dans la cave'
      }) + `
        <div class="np-body">
          <div class="np-products">${picks.map(productHTML).join('') || '<p class="np-empty">La cave se remplit bientôt.</p>'}</div>
          ${chips ? `<div class="np-chips">${chips}</div>` : ''}
        </div>`;
    },

    nouveautes(d) {
      const posts = d.posts.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
      const items = posts.map((post) => {
        const isVideo = post.type === 'video';
        const thumb = post.thumbnail
          ? resolveAsset(post.thumbnail)
          : isVideo ? youtubeThumb(post.media || post.youtube) : resolveAsset(post.media);
        const date = new Date(post.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        // Vidéo sans miniature (fichier .mp4) : on affiche la première image
        // de la vidéo elle-même plutôt qu'une case vide.
        const style = thumb ? ` style="background-image:url('${escapeHtml(thumb)}')"` : '';
        const video = !thumb && isVideo && post.media
          ? `<video src="${escapeHtml(resolveAsset(post.media))}#t=0.5" muted preload="metadata" playsinline></video>`
          : '';
        return `
          <a class="np-post" href="${base}pages/nouveautes.html">
            <span class="np-post-media"${style}>${video}${isVideo ? '<span class="np-play">▶</span>' : ''}</span>
            <span class="np-name">${escapeHtml(post.title)}</span>
            <span class="np-meta">${isVideo ? 'Vidéo' : 'Photo'} · ${escapeHtml(date)}</span>
          </a>`;
      }).join('');
      return introHTML({
        eyebrow: 'Nouveautés',
        title: 'Les derniers arrivages',
        text: 'Nouveaux produits et coulisses du magasin, en photo et en vidéo.',
        href: base + 'pages/nouveautes.html',
        cta: 'Voir toutes les nouveautés'
      }) + `
        <div class="np-body">
          <div class="np-posts">${items || '<p class="np-empty">Aucune publication pour le moment.</p>'}</div>
        </div>`;
    },

    services(d) {
      const cards = (d.content.cards && d.content.cards.services) || [];
      const Icons = window.PioIcons;
      return introHTML({
        eyebrow: 'Services',
        title: 'Faites vos courses comme vous voulez',
        text: 'Livraison, paiement Mobile Money, achats en gros ou retrait en magasin.',
        href: base + 'pages/services.html',
        cta: 'Voir les services'
      }) + `
        <div class="np-body">
          <div class="np-cards">${cards.slice(0, 4).map((c) => cardHTML(c, Icons ? Icons.badgeSvg(c.icon) : '')).join('')}</div>
        </div>`;
    },

    localisation(d) {
      const c = d.content;
      const contact = c.contact || {};
      const hours = (c.hours || []).map((h) =>
        `<li><span>${escapeHtml(h.label)}</span><strong>${escapeHtml(h.value)}</strong></li>`
      ).join('');
      return introHTML({
        eyebrow: 'Localisation & horaires',
        title: 'Venez nous voir à Owendo',
        text: c.mapCaption || contact.address || '',
        href: base + 'pages/localisation.html',
        cta: 'Voir le plan'
      }) + `
        <div class="np-body np-visit">
          <div>
            <p class="np-label">Horaires</p>
            <ul class="np-hours">${hours}</ul>
          </div>
          <div>
            <p class="np-label">Adresse</p>
            <p>${escapeHtml(contact.address || '')}</p>
            ${contact.phone ? `<p class="np-label">Téléphone</p><p><a href="tel:${escapeHtml(contact.phone.replace(/\s/g, ''))}">${escapeHtml(contact.phone)}</a></p>` : ''}
          </div>
        </div>`;
    }
  };

  // --- Création des panneaux ---

  const panels = [];
  links.forEach((link) => {
    const page = link.dataset.page;
    if (!builders[page]) return;
    const li = link.parentElement;
    const panel = document.createElement('div');
    panel.className = 'nav-preview';
    panel.id = 'navPreview-' + page;
    panel.innerHTML = '<div class="nav-preview-inner"><p class="np-empty">Chargement…</p></div>';
    li.classList.add('has-preview');
    li.appendChild(panel);
    link.setAttribute('aria-describedby', panel.id);
    panels.push({ page, li, panel });

    // Échap referme l'aperçu ; il se rouvrira au prochain survol.
    li.addEventListener('mouseleave', () => li.classList.remove('np-dismissed'));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    panels.forEach(({ li }) => li.classList.add('np-dismissed'));
  });
  document.addEventListener('focusin', (e) => {
    panels.forEach(({ li }) => { if (!li.contains(e.target)) li.classList.remove('np-dismissed'); });
  });

  function getJson(path, fallback) {
    return fetch(base + path)
      .then((res) => (res.ok ? res.json() : fallback))
      .catch(() => fallback);
  }

  Promise.all([
    getJson('data/products.json', []),
    getJson('data/posts.json', []),
    getJson('data/content.json', {})
  ]).then(([products, posts, content]) => {
    const data = {
      products: Array.isArray(products) ? products : [],
      posts: Array.isArray(posts) ? posts : [],
      content: content || {}
    };
    panels.forEach(({ page, panel }) => {
      try {
        panel.firstElementChild.innerHTML = builders[page](data);
      } catch (e) {
        panel.remove();
      }
    });
  });
})();
