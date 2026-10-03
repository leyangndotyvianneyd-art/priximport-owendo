// ===== PRIX IMPORT OWENDO — header-slideshow.js =====
// Fait défiler en fondu les photos des produits (data/products.json, promos
// en premier) en fond de tout le header (logo + recherche + panier, et la
// ligne des onglets), sous un voile sombre pour que tout reste lisible.
//
// Les photos changent toutes les 5 secondes, s'arrêtent quand l'onglet
// n'est pas visible, et restent fixes (une seule photo) si le visiteur a
// demandé moins d'animations dans son système.

(function () {
  const inner = document.querySelector('header .header-main-inner');
  if (!inner || !document.querySelector('.header-search')) return;

  const base = window.DATA_BASE || '';
  const DELAY = 5000;
  const MAX_PHOTOS = 12;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  // Précharge une image ; résout avec son adresse, ou null si elle ne
  // s'affiche pas (lien cassé) — on la saute alors.
  function preload(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  fetch(base + 'data/products.json')
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((products) => {
      const active = products.filter((p) => p.active !== false && p.image);
      const ordered = active.filter(isPromoActive).concat(active.filter((p) => !isPromoActive(p)));
      const photos = [...new Set(ordered.map((p) => resolveImage(p.image)))].slice(0, MAX_PHOTOS);
      if (!photos.length) return;

      // Fond placé derrière tout le header (ligne logo + recherche ET ligne
      // des onglets), avec deux calques de photo : l'un apparaît pendant
      // que l'autre disparaît.
      const band = inner.closest('header');
      const bg = document.createElement('div');
      bg.className = 'header-bg';
      bg.setAttribute('aria-hidden', 'true');
      bg.innerHTML = '<div class="header-bg-layer"></div><div class="header-bg-layer"></div>';
      band.insertBefore(bg, band.firstChild);
      const layers = bg.querySelectorAll('.header-bg-layer');

      let current = 0;
      let index = 0;
      let timer = null;

      function show(src) {
        const next = layers[1 - current];
        next.style.backgroundImage = `url("${src.replace(/"/g, '%22')}")`;
        next.classList.add('is-visible');
        layers[current].classList.remove('is-visible');
        current = 1 - current;
      }

      preload(photos[0]).then((src) => {
        if (!src) return;
        layers[current].style.backgroundImage = `url("${src.replace(/"/g, '%22')}")`;
        layers[current].classList.add('is-visible');
        band.classList.add('has-bg');
        if (reduceMotion || photos.length < 2) return;

        async function step() {
          // On essaie les photos suivantes jusqu'à en trouver une qui charge.
          for (let tries = 0; tries < photos.length; tries++) {
            index = (index + 1) % photos.length;
            const ok = await preload(photos[index]);
            if (ok) { show(ok); return; }
          }
        }
        const startTimer = () => { clearInterval(timer); timer = setInterval(step, DELAY); };
        startTimer();
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) clearInterval(timer); else startTimer();
        });
      });
    })
    .catch(() => { /* pas de photos : le header garde son fond blanc */ });
})();
