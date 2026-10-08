// ===== PRIX IMPORT OWENDO — cart.js =====
// Panier client, persisté dans localStorage. Chargé sur toutes les pages,
// AVANT main.js, pour que window.Cart soit disponible partout.

window.Cart = (function () {
  const KEY = 'pio_cart_v1';

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function write(items) {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch (e) {
      // stockage indisponible (navigation privée...) : on continue sans persister
    }
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { items } }));
  }

  function add(product, qty) {
    qty = qty || 1;
    const items = read();
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        image: product.image,
        qty
      });
      // Produit importé sur commande : le panier affiche son délai et
      // calcule l'acompte (voir window.PioImport dans rayons.js).
      const imp = window.PioImport;
      if (imp && product.category === imp.category) {
        items[items.length - 1].leadTime = product.leadTime || imp.defaultLeadTime;
      }
    }
    write(items);
  }

  function setQty(id, qty) {
    let items = read();
    if (qty <= 0) {
      items = items.filter(i => i.id !== id);
    } else {
      const item = items.find(i => i.id === id);
      if (item) item.qty = qty;
    }
    write(items);
  }

  function remove(id) {
    setQty(id, 0);
  }

  function clear() {
    write([]);
  }

  function getAll() {
    return read();
  }

  function getCount() {
    return read().reduce((sum, i) => sum + i.qty, 0);
  }

  function getTotal() {
    return read().reduce((sum, i) => sum + i.qty * i.price, 0);
  }

  return { add, setQty, remove, clear, getAll, getCount, getTotal };
})();
