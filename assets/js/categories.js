// ===== PRIX IMPORT OWENDO — categories.js =====
// Charge la liste des catégories depuis data/products.json pour alimenter
// le menu déroulant "Toutes les catégories" du header (présent sur toutes
// les pages) et la sidebar catégories de la page d'accueil, si présente.

(function () {
  const base = window.DATA_BASE || '';
  const dropdownBtn = document.getElementById('catDropdownBtn');
  const dropdownPanel = document.getElementById('catDropdownPanel');
  const sidebar = document.getElementById('homeCategorySidebar');

  if (!dropdownPanel && !sidebar) return;

  const catalogueUrl = base + 'pages/catalogue.html';

  function linkHTML(cat) {
    const href = `${catalogueUrl}?category=${encodeURIComponent(cat)}`;
    return `<a href="${href}"><span class="dot"></span>${cat}</a>`;
  }

  fetch(base + 'data/products.json')
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((products) => {
      const active = products.filter((p) => p.active !== false);
      const categories = [...new Set(active.map((p) => p.category))]
        .sort((a, b) => a.localeCompare(b, 'fr'));

      if (dropdownPanel) {
        dropdownPanel.innerHTML = categories.length
          ? `<a href="${catalogueUrl}"><span class="dot"></span>Tout le catalogue</a>` +
            categories.map(linkHTML).join('')
          : '<p class="empty">Catalogue indisponible pour le moment.</p>';
      }
      if (sidebar) {
        sidebar.innerHTML = '<h3>Catégories</h3>' +
          (categories.length
            ? categories.map(linkHTML).join('')
            : '<p class="empty">Aucune catégorie pour le moment.</p>');
      }
    })
    .catch(() => {
      const msg = '<p class="empty">Impossible de charger les catégories.</p>';
      if (dropdownPanel) dropdownPanel.innerHTML = msg;
      if (sidebar) sidebar.innerHTML = '<h3>Catégories</h3>' + msg;
    });

  if (dropdownBtn) {
    const wrap = dropdownBtn.closest('.cat-dropdown');
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = wrap.classList.toggle('open');
      dropdownBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
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
