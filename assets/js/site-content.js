// ===== PRIX IMPORT — site-content.js =====
// Charge data/content.json et remplit tout le contenu éditable depuis
// l'administration (pages/admin.html, onglet "Contenu du site") : bandeau
// promo, pied de page, cartes des pages Accueil / Fraîcheur & Local /
// Services, horaires, coordonnées. Ne touche que les éléments présents sur
// la page en cours — sans effet sur une page qui n'en a pas besoin.

window.PioIcons = window.PioIcons || (function () {
  // Icônes "badge" (blanches, 22x22, utilisées dans un rond vert — cartes
  // de l'accueil et de la page Services).
  const BADGE = {
    bag: '<rect x="3" y="7" width="16" height="12" rx="2" stroke="#fff" stroke-width="1.8"/><path d="M7 7V5a4 4 0 0 1 8 0v2" stroke="#fff" stroke-width="1.8"/>',
    leaf: '<path d="M4 15c0-6 4-10 10-10 0 6-4 10-10 10Z" fill="#fff"/>',
    clock: '<circle cx="11" cy="11" r="8" stroke="#fff" stroke-width="1.8"/><path d="M11 7v4l3 2" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
    card: '<rect x="3" y="5" width="16" height="12" rx="2" stroke="#fff" stroke-width="1.8"/><path d="M3 9h16" stroke="#fff" stroke-width="1.8"/>',
    truck: '<path d="M2 6h14l3 5v6H2V6Z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7" cy="18" r="1.6" fill="#fff"/><circle cx="16" cy="18" r="1.6" fill="#fff"/>',
    box: '<path d="M11 2 3 6v6c0 5 3.5 7.5 8 8 4.5-.5 8-3 8-8V6l-8-4Z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>',
    'check-shield': '<path d="M11 2 3 6v6c0 5 3.5 7.5 8 8 4.5-.5 8-3 8-8V6l-8-4Z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 11l2 2 4-4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    star: '<path d="M11 2l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3-5.4 3 1.3-6-4.6-4.1 6.1-.6L11 2Z" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>',
    pin: '<path d="M11 20s7-6.5 7-11.5A7 7 0 0 0 4 8.5C4 13.5 11 20 11 20Z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><circle cx="11" cy="8.5" r="2.4" fill="#fff"/>'
  };

  // Icônes "fraîcheur" (dorées, 40x40, sans rond de fond) — cartes de la
  // page Fraîcheur & Local uniquement.
  const FRESH = {
    plantain: '<path d="M12 26c0-9 6-16 16-16 0 10-7 16-16 16Z" fill="#F4C430"/><path d="M12 26c-4-2-6-6-6-11" stroke="#FFF8ED" stroke-width="2" stroke-linecap="round"/>',
    fish: '<path d="M8 20c6-8 18-8 24 0-6 8-18 8-24 0Z" fill="#F4C430"/><circle cx="20" cy="20" r="3" fill="#1B4332"/>',
    veggie: '<rect x="10" y="12" width="20" height="20" rx="4" fill="#F4C430"/><path d="M14 18h12M14 24h12" stroke="#1B4332" stroke-width="2" stroke-linecap="round"/>',
    morning: '<circle cx="20" cy="20" r="10" fill="#F4C430"/><path d="M20 14v6l4 4" stroke="#1B4332" stroke-width="2" stroke-linecap="round"/>'
  };

  const BADGE_LABELS = {
    bag: 'Sac / catalogue', leaf: 'Feuille', clock: 'Horloge', card: 'Carte / paiement',
    truck: 'Camion', box: 'Colis', 'check-shield': 'Bouclier coché', star: 'Étoile', pin: 'Épingle / lieu'
  };
  const FRESH_LABELS = {
    plantain: 'Plantain / manioc', fish: 'Poisson', veggie: 'Légumes', morning: 'Matin / horloge'
  };

  function badgeSvg(key) {
    return `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">${BADGE[key] || BADGE.star}</svg>`;
  }
  function freshSvg(key) {
    return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none">${FRESH[key] || FRESH.plantain}</svg>`;
  }

  return { BADGE, FRESH, BADGE_LABELS, FRESH_LABELS, badgeSvg, freshSvg };
})();

(function () {
  const base = window.DATA_BASE || '';
  const Icons = window.PioIcons;

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function fillText(id, value) {
    const el = document.getElementById(id);
    if (el && value != null) el.textContent = value;
  }

  function fillHref(id, href) {
    const el = document.getElementById(id);
    if (el && href) el.setAttribute('href', href);
  }

  function renderBadgeCards(gridId, cards, cardClass) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = cards.map((c) => {
      const inner = `
        <div class="icon">${Icons.badgeSvg(c.icon)}</div>
        <h3>${escapeHtml(c.title)}</h3>
        <p>${escapeHtml(c.text)}</p>`;
      return c.href
        ? `<a href="${base}${escapeHtml(c.href)}" class="${cardClass}">${inner}</a>`
        : `<div class="${cardClass}">${inner}</div>`;
    }).join('');
  }

  function renderFreshCards(gridId, cards) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = cards.map((c) => {
      const inner = `
        ${Icons.freshSvg(c.icon)}
        <h3>${escapeHtml(c.title)}</h3>
        <p>${escapeHtml(c.text)}</p>`;
      return c.href
        ? `<a href="${base}${escapeHtml(c.href)}" class="fresh-card">${inner}</a>`
        : `<div class="fresh-card">${inner}</div>`;
    }).join('');
  }

  function renderHours(tbodyId, hours) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = (hours || []).map((h) => `
      <tr><td>${escapeHtml(h.label)}</td><td>${escapeHtml(h.value)}</td></tr>
    `).join('');
  }

  // Atouts et superficie du magasin (page Localisation), d'après
  // window.STORE fourni par le serveur (data/stores.json).
  (function renderStoreAtouts() {
    const store = window.STORE;
    const box = document.getElementById('storeAtouts');
    if (!box || !store || !Array.isArray(store.features) || !store.features.length) return;
    document.getElementById('storeAtoutsList').innerHTML = store.features
      .map((f) => `<span class="store-atout">${escapeHtml(f)}</span>`).join('');
    if (store.surfaceM2) {
      fillText('storeSurface', `Surface de vente : ${Number(store.surfaceM2).toLocaleString('fr-FR')} m²`);
    }
    box.hidden = false;
  })();

  fetch(base + 'data/content.json')
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((content) => {
      const contact = content.contact || {};
      const cards = content.cards || {};

      // Bandeau promo (topbar), présent sur toutes les pages
      fillText('topbarMsgText', content.topbarMessage);
      fillText('topbarHighlight', content.topbarHighlight);

      // Pied de page, présent sur toutes les pages
      fillText('footTagline', content.footerTagline);
      fillText('footAddress', contact.address);
      fillText('footPhone', contact.phone);
      fillText('footEmail', contact.email);

      // Cartes de l'accueil
      if (cards.home) renderBadgeCards('homeHighlightsGrid', cards.home, 'highlight-card');

      // Page Fraîcheur & Local
      if (cards.fraicheur) renderFreshCards('freshCardsGrid', cards.fraicheur);
      fillText('freshNoteText', content.freshNote);

      // Page Services
      if (cards.services) renderBadgeCards('servicesGrid', cards.services, 'service-card');

      // Page Localisation
      fillText('mapCaptionText', content.mapCaption);
      renderHours('locHoursBody', content.hours);
      fillText('locAddress', contact.address);
      fillText('locPhone', contact.phone);
      fillText('locEmail', contact.email);

      // Page Contact
      renderHours('contactHoursBody', content.hours);
      fillText('contactAddress', contact.address);
      fillText('contactPhone', contact.phone);
      fillText('contactEmail', contact.email);
      fillHref('contactWhatsapp', contact.whatsapp ? `https://wa.me/${contact.whatsapp}` : null);
      const waBtn = document.getElementById('contactWhatsapp');
      if (waBtn) waBtn.hidden = !contact.whatsapp;
    })
    .catch((err) => {
      // Le contenu par défaut déjà présent dans le HTML reste affiché tel
      // quel si data/content.json est indisponible — jamais de page cassée.
      console.error('Impossible de charger le contenu du site :', err);
    });
})();
