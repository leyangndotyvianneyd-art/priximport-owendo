// ===== PRIX IMPORT OWENDO — main.js =====

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
