// ===== PRIX IMPORT — main.js =====

function pioCartLink() {
  return (window.DATA_BASE || '') + 'panier.html';
}

function pioInjectCartNav() {
  // Sur desktop, le panier a sa propre icône dans le header (voir
  // .header-actions dans chaque page) — on ne l'ajoute donc qu'au menu
  // mobile, qui n'a pas cette icône.
  const href = pioCartLink();
  const mobileList = document.querySelector('.mobile-menu ul');
  if (!mobileList || mobileList.querySelector('.nav-cart-item')) return;
  const li = document.createElement('li');
  li.className = 'nav-cart-item';
  li.innerHTML = `<a href="${href}" data-page="panier">🛒 Panier <span class="cart-badge">0</span></a>`;
  mobileList.appendChild(li);
}

// Barre de navigation en bas de l'écran sur téléphone (comme les applis de
// shopping) : Accueil, Catalogue, Panier, Contact. Masquée sur ordinateur
// par le CSS (.bottom-nav).
function pioInjectBottomNav() {
  if (document.querySelector('.bottom-nav') || !document.querySelector('header')) return;
  if (window.CURRENT_PAGE === 'admin') return;
  const base = window.DATA_BASE || '';
  const current = window.CURRENT_PAGE || '';
  const icon = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2.5 3.5h2.2l2.4 11.6a1.8 1.8 0 0 0 1.8 1.4h8a1.8 1.8 0 0 0 1.8-1.4L20.5 7.5H6"/>',
    chat: '<path d="M4 11.5C4 7.4 7.6 4 12 4s8 3.4 8 7.5S16.4 19 12 19c-1 0-2-.2-2.9-.5L5 20l1.2-3.6A7.2 7.2 0 0 1 4 11.5Z"/>'
  };
  const items = [
    ['accueil', 'index.html', 'home', 'Accueil'],
    ['catalogue', 'pages/catalogue.html', 'grid', 'Catalogue'],
    ['panier', 'panier.html', 'cart', 'Panier'],
    ['contact', 'contact.html', 'chat', 'Contact']
  ];
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.setAttribute('aria-label', 'Navigation principale');
  nav.innerHTML = items.map(([page, href, ic, label]) => `
    <a href="${base}${href}"${page === current ? ' aria-current="page"' : ''}>
      <span class="bn-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon[ic]}</svg>
        ${page === 'panier' ? '<span class="cart-badge">0</span>' : ''}
      </span>
      <span>${label}</span>
    </a>`).join('');
  document.body.appendChild(nav);
  document.body.classList.add('has-bottom-nav');
}

function pioUpdateCartBadges() {
  const count = (window.Cart && window.Cart.getCount) ? window.Cart.getCount() : 0;
  document.querySelectorAll('.cart-badge').forEach(el => { el.textContent = count; });
}

document.addEventListener('DOMContentLoaded', () => {

  // --- Menu burger (mobile) ---
  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      burger.classList.toggle('active', isOpen);
    });

    // Ferme le menu si on clique sur un lien
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // --- Panier : lien + badge injectés dans la nav sur toutes les pages ---
  pioInjectCartNav();
  pioInjectBottomNav();
  pioUpdateCartBadges();
  document.addEventListener('cart:updated', pioUpdateCartBadges);

  // --- Surligne le lien de navigation actif ---
  const currentPage = window.CURRENT_PAGE || '';
  document.querySelectorAll('[data-page]').forEach(link => {
    if (link.dataset.page === currentPage) {
      link.setAttribute('aria-current', 'page');
    }
  });

  // --- Ombre du header au scroll ---
  const header = document.querySelector('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    });
  }

});

// --- Toast (notification courte, ex: "Ajouté au panier") ---
function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}
