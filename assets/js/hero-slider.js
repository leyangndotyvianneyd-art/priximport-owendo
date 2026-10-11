// ===== PRIX IMPORT — hero-slider.js =====
// Carrousel en haut de la page d'accueil. La 1re diapo (bienvenue) est
// écrite dans index.html ; ce script ajoute les suivantes à partir de
// data/products.json et data/posts.json — promotions (ou sélection), rayon
// frais, dernière nouveauté, livraison & Mobile Money — puis les fait
// défiler automatiquement (6 secondes par défaut).
//
// L'onglet « Carrousel » de l'administration (content.json → heroSlider)
// permet de régler la durée, de masquer des diapos automatiques et d'ajouter
// ses propres diapos (affiches ou texte + photo), placées après la bienvenue.
//
// Le défilement s'arrête quand la souris est dessus, quand on navigue au
// clavier dedans, quand l'onglet n'est pas visible, et ne démarre pas du
// tout si le visiteur a demandé moins d'animations dans son système.

(function () {
  const slider = document.getElementById('heroSlider');
  const track = document.getElementById('heroTrack');
  if (!slider || !track) return;

  const base = window.DATA_BASE || '';
  let delay = 6000; // remplacé par la durée choisie dans l'administration
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  // Lien d'une diapo : chemin du site (relatif à la racine) ou adresse
  // complète http(s).
  function resolveLink(href) {
    if (!href) return '';
    return /^https?:\/\//.test(href) ? href : base + href;
  }

  // --- Construction d'une diapo ---
  // theme : "green" (par défaut), "dark" ou "yellow" (texte foncé).
  function slideHTML(s) {
    const theme = ['green', 'dark', 'yellow'].includes(s.theme) ? s.theme : 'green';
    const ghostClass = theme === 'yellow' ? 'btn-outline' : 'btn-ghost';
    const cta = s.href && s.cta
      ? `<a href="${escapeHtml(resolveLink(s.href))}" class="btn btn-primary">${escapeHtml(s.cta)}</a>` : '';
    const cta2 = s.href2 && s.cta2
      ? `<a href="${escapeHtml(resolveLink(s.href2))}" class="btn ${ghostClass}">${escapeHtml(s.cta2)} →</a>` : '';
    return `
      <div class="hero-slide hero-slide-${theme}" role="group" aria-roledescription="diapositive">
        <div class="wrap hero-slide-inner${s.visual ? '' : ' no-visual'}">
          <div class="hero-copy">
            ${s.eyebrow ? `<p class="eyebrow">${escapeHtml(s.eyebrow)}</p>` : ''}
            <h2>${escapeHtml(s.title)}</h2>
            ${s.text ? `<p>${escapeHtml(s.text)}</p>` : ''}
            ${cta || cta2 ? `<div class="hero-cta">${cta}${cta2}</div>` : ''}
          </div>
          ${s.visual ? `<div class="hero-visual">${s.visual}</div>` : ''}
        </div>
      </div>`;
  }

  // Affiche : l'image couvre toute la diapo ; titre, texte et bouton
  // (facultatifs) s'affichent par-dessus, sur un dégradé pour rester
  // lisibles. Sans bouton mais avec un lien, toute l'affiche est cliquable.
  function posterHTML(s) {
    const theme = ['green', 'dark', 'yellow'].includes(s.theme) ? s.theme : 'green';
    const href = resolveLink(s.ctaHref);
    const hasCopy = s.eyebrow || s.title || s.text || (s.ctaLabel && href);
    const copy = hasCopy ? `
      <div class="wrap hero-poster-copy">
        ${s.eyebrow ? `<p class="eyebrow">${escapeHtml(s.eyebrow)}</p>` : ''}
        ${s.title ? `<h2>${escapeHtml(s.title)}</h2>` : ''}
        ${s.text ? `<p>${escapeHtml(s.text)}</p>` : ''}
        ${s.ctaLabel && href ? `<div class="hero-cta"><a href="${escapeHtml(href)}" class="btn btn-primary">${escapeHtml(s.ctaLabel)}</a></div>` : ''}
      </div>` : '';
    const img = `<img class="hero-poster-img" src="${escapeHtml(resolveAsset(s.image))}" alt="${escapeHtml(s.title || '')}" loading="lazy">`;
    const wholeLink = href && !s.ctaLabel
      ? `<a class="hero-poster-link" href="${escapeHtml(href)}" aria-label="${escapeHtml(s.title || 'Voir l’offre')}"></a>` : '';
    return `
      <div class="hero-slide hero-slide-${theme} hero-slide-poster${hasCopy ? ' has-copy' : ''}" role="group" aria-roledescription="diapositive">
        ${img}${copy}${wholeLink}
      </div>`;
  }

  // Diapo créée dans l'administration (onglet Carrousel)
  function customSlideHTML(s) {
    if (s.layout === 'poster') return posterHTML(s);
    return slideHTML({
      theme: s.theme,
      eyebrow: s.eyebrow,
      title: s.title,
      text: s.text,
      href: s.ctaHref,
      cta: s.ctaLabel,
      visual: s.image ? photoVisual(resolveAsset(s.image), s.title) : ''
    });
  }

  function photoVisual(src, alt, tag) {
    if (!src) return '';
    return `
      <figure class="hero-photo">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy">
        ${tag ? `<figcaption>${tag}</figcaption>` : ''}
      </figure>`;
  }

  function buildSlides(products, posts) {
    const active = products.filter((p) => p.active !== false);
    const slides = [];

    // 1. Promotions en cours, sinon un produit de la sélection
    const promos = active.filter(isPromoActive);
    if (promos.length) {
      // Mise en avant de la plus forte remise
      const discount = (p) => (p.oldPrice > p.price ? 1 - p.price / p.oldPrice : 0);
      const best = promos.slice().sort((a, b) => discount(b) - discount(a))[0];
      const pct = Math.round(discount(best) * 100);
      slides.push({
        key: 'promo',
        theme: 'dark',
        eyebrow: 'Promotions en cours',
        title: pct > 0 ? `Jusqu'à -${pct} % en ce moment` : 'Les bonnes affaires du moment',
        text: `${promos.length} produit${promos.length > 1 ? 's' : ''} en promotion, dont ${best.name} à ${formatPrice(best.price)}.`,
        href: 'pages/catalogue.html',
        cta: 'Voir les promotions',
        visual: photoVisual(resolveImage(best.image), best.name,
          `<strong>${escapeHtml(formatPrice(best.price))}</strong>${best.oldPrice ? ` <s>${escapeHtml(formatPrice(best.oldPrice))}</s>` : ''}`)
      });
    } else if (active.length) {
      const pick = active[0];
      slides.push({
        key: 'promo',
        theme: 'dark',
        eyebrow: 'Notre sélection',
        title: 'Les essentiels, en gros volumes',
        text: `${active.length} produits pour la maison et les revendeurs : épicerie, boissons, hygiène, bébé et plus.`,
        href: 'pages/catalogue.html',
        cta: 'Voir le catalogue',
        visual: photoVisual(resolveImage(pick.image), pick.name,
          `${escapeHtml(pick.name)} · <strong>${escapeHtml(formatPrice(pick.price))}</strong>`)
      });
    }

    // 2. Rayon frais
    const fresh = active.filter((p) => p.category === 'Fraîcheur & Local' && p.image);
    slides.push({
      key: 'fraicheur',
      theme: 'yellow',
      eyebrow: 'Fraîcheur & Local',
      title: 'Du frais du Gabon, chaque matin',
      text: 'Plantain, manioc, poisson du port et légumes de saison, en priorité auprès des producteurs locaux.',
      href: 'pages/fraicheur.html',
      cta: 'Découvrir le rayon frais',
      href2: 'pages/catalogue.html?category=' + encodeURIComponent('Fraîcheur & Local'),
      cta2: 'Voir les produits',
      visual: fresh.length ? photoVisual(resolveImage(fresh[0].image), fresh[0].name, escapeHtml(fresh[0].name)) : ''
    });

    // 3. Dernière nouveauté en photo
    const latestPhoto = posts
      .filter((p) => p.type !== 'video' && p.media)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (latestPhoto) {
      slides.push({
        key: 'nouveaute',
        theme: 'green',
        eyebrow: 'Nouveauté',
        title: latestPhoto.title,
        text: latestPhoto.caption || 'Découvrez les derniers arrivages du magasin.',
        href: 'pages/nouveautes.html',
        cta: 'Voir les nouveautés',
        visual: photoVisual(resolveAsset(latestPhoto.media), latestPhoto.title, escapeHtml(latestPhoto.tag || 'Nouveau'))
      });
    }

    // 4. Livraison & Mobile Money
    const Icons = window.PioIcons;
    const icon = (key, label, href) => `
      <a class="hero-service" href="${base}${href}">
        <span>${Icons ? Icons.badgeSvg(key) : ''}</span>
        <strong>${label}</strong>
      </a>`;
    slides.push({
      key: 'services',
      theme: 'dark',
      eyebrow: 'Services',
      title: 'Livré chez vous, payé en Mobile Money',
      text: 'Livraison dans tout Libreville, paiement Airtel Money / Moov Money, ou retrait en magasin.',
      href: 'pages/services.html',
      cta: 'Voir les services',
      href2: 'panier.html',
      cta2: 'Mon panier',
      visual: `<div class="hero-services">
        ${icon('truck', 'Livraison', 'pages/services.html')}${icon('card', 'Mobile Money', 'pages/services.html')}${icon('bag', 'Retrait en magasin', 'pages/localisation.html')}${icon('box', 'Achats en gros', 'pages/catalogue.html')}
      </div>`
    });

    return slides;
  }

  // --- Mécanique du carrousel ---

  let index = 0;
  let timer = null;
  let paused = false;
  let slides = [];
  const controls = slider.querySelector('.hero-controls');
  const dotsWrap = slider.querySelector('.hero-dots');

  function goTo(i) {
    const n = slides.length;
    index = (i + n) % n;
    track.style.transform = `translateX(-${index * 100}%)`;
    slides.forEach((s, k) => {
      const current = k === index;
      s.setAttribute('aria-hidden', current ? 'false' : 'true');
      // Les liens des diapos cachées ne doivent pas recevoir le focus clavier.
      s.querySelectorAll('a, button').forEach((el) => { el.tabIndex = current ? 0 : -1; });
    });
    dotsWrap.querySelectorAll('button').forEach((d, k) => {
      d.setAttribute('aria-selected', k === index ? 'true' : 'false');
    });
  }

  function start() {
    stop();
    if (reduceMotion || paused || slides.length < 2) return;
    timer = setInterval(() => goTo(index + 1), delay);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  function setup() {
    slides = [...track.querySelectorAll('.hero-slide')];
    if (slides.length < 2) return;

    slides.forEach((s, k) => s.setAttribute('aria-label', `${k + 1} sur ${slides.length}`));
    dotsWrap.innerHTML = slides.map((_, k) =>
      `<button type="button" role="tab" aria-label="Diapositive ${k + 1}"></button>`
    ).join('');
    dotsWrap.querySelectorAll('button').forEach((d, k) => {
      d.addEventListener('click', () => { goTo(k); start(); });
    });
    slider.querySelectorAll('.hero-arrow').forEach((btn) => {
      btn.addEventListener('click', () => { goTo(index + Number(btn.dataset.dir)); start(); });
    });
    controls.hidden = false;

    // Pause au survol / au focus clavier
    slider.addEventListener('mouseenter', () => { paused = true; stop(); });
    slider.addEventListener('mouseleave', () => { paused = false; start(); });
    slider.addEventListener('focusin', () => { paused = true; stop(); });
    slider.addEventListener('focusout', (e) => {
      if (!slider.contains(e.relatedTarget)) { paused = false; start(); }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });

    // Glisser du doigt sur mobile
    let touchX = null;
    slider.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; stop(); }, { passive: true });
    slider.addEventListener('touchend', (e) => {
      if (touchX == null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 40) goTo(index + (dx < 0 ? 1 : -1));
      start();
    });

    // Flèches du clavier quand le focus est dans le carrousel
    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') goTo(index + 1);
      else if (e.key === 'ArrowLeft') goTo(index - 1);
    });

    goTo(0);
    start();
  }

  function getJson(path) {
    return fetch(base + path)
      .then((res) => (res.ok ? res.json() : []))
      .catch(() => []);
  }

  Promise.all([getJson('data/products.json'), getJson('data/posts.json'), getJson('data/content.json')])
    .then(([products, posts, content]) => {
      // Réglages de l'onglet Carrousel de l'administration (tout activé par
      // défaut tant que rien n'a été enregistré).
      const settings = (content && content.heroSlider) || {};
      const auto = settings.auto || {};
      const isOn = (key) => auto[key] !== false;
      if (Number(settings.delay) >= 3) delay = Number(settings.delay) * 1000;

      const custom = (Array.isArray(settings.slides) ? settings.slides : [])
        .filter((s) => s.active !== false && (s.layout === 'poster' ? s.image : s.title));
      const automatic = buildSlides(Array.isArray(products) ? products : [], Array.isArray(posts) ? posts : [])
        .filter((s) => isOn(s.key));

      track.insertAdjacentHTML('beforeend',
        custom.map(customSlideHTML).join('') + automatic.map(slideHTML).join(''));

      // Diapo de bienvenue désactivée : on la retire, sauf si elle est la
      // seule (le bandeau ne doit jamais être vide).
      const welcome = track.querySelector('.hero-slide');
      if (!isOn('welcome') && track.children.length > 1) welcome.remove();

      setup();
    });
})();
