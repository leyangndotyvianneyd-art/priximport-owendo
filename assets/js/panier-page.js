// ===== PRIX IMPORT OWENDO — panier-page.js =====
// Logique propre à la page panier.html : affichage du panier, formulaire, commande.

(function () {
  const container = document.getElementById('cartContent');
  if (!container) return;

  const SHOP_PHONE = '24107413215'; // format international sans le +, pour wa.me

  function formatPrice(n) {
    return n.toLocaleString('fr-FR').replace(/,/g, ' ') + ' FCFA';
  }

  function resolveImage(image) {
    if (!image) return '';
    // Photo envoyée depuis l'admin : chemin déjà complet (assets/...).
    if (/^assets\//.test(image)) return '' + image;
    return /^https?:\/\//.test(image) ? image : `assets/img/products/${image}`;
  }

  // Acompte demandé sur les produits importés sur commande (ceux qui ont un
  // délai, voir cart.js). Le serveur refait le même calcul.
  function depositFor(items) {
    const rate = (window.PioImport && window.PioImport.depositRate) || 0.5;
    const importTotal = items.filter(i => i.leadTime).reduce((s, i) => s + i.qty * i.price, 0);
    return Math.round(importTotal * rate);
  }

  function render() {
    const items = window.Cart.getAll();

    if (items.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <p>Votre panier est vide pour le moment.</p>
          <a href="pages/catalogue.html">Voir le catalogue →</a>
        </div>`;
      return;
    }

    const total = window.Cart.getTotal();
    const deposit = depositFor(items);
    const leadTimes = [...new Set(items.filter(i => i.leadTime).map(i => i.leadTime))];

    container.innerHTML = `
      <div class="cart-layout">
        <div class="cart-list">
          ${items.map(item => `
            <div class="cart-row" data-id="${item.id}">
              <div class="cart-thumb" style="background-image:url('${resolveImage(item.image)}')"></div>
              <div class="cart-info">
                <h4>${item.name}</h4>
                <span>${item.unit} — ${formatPrice(item.price)}</span>
                ${item.leadTime ? `<span class="cart-lead-time">Import sur commande · livraison sous ${item.leadTime}</span>` : ''}
              </div>
              <div class="cart-qty">
                <button type="button" data-action="dec" aria-label="Diminuer">−</button>
                <span>${item.qty}</span>
                <button type="button" data-action="inc" aria-label="Augmenter">+</button>
              </div>
              <div class="cart-price">${formatPrice(item.price * item.qty)}</div>
              <button type="button" class="cart-remove" data-action="remove" aria-label="Retirer">&times;</button>
            </div>
          `).join('')}
        </div>

        <div class="cart-summary">
          <h3>Récapitulatif</h3>
          <div class="line"><span>Articles</span><span>${items.reduce((s, i) => s + i.qty, 0)}</span></div>
          <div class="total"><span>Total</span><span>${formatPrice(total)}</span></div>
          ${deposit ? `
          <div class="line is-deposit"><span>Acompte à verser</span><span>${formatPrice(deposit)}</span></div>
          <p class="cart-import-note">Votre panier contient des produits importés sur commande (délai : ${leadTimes.join(', ')}). Nous les commandons dès réception de l'acompte ; le reste est payé à la livraison.</p>` : ''}

          <form id="orderForm">
            <label for="custName">Nom complet</label>
            <input type="text" id="custName" name="name" required>

            <label for="custPhone">Téléphone</label>
            <input type="tel" id="custPhone" name="phone" required placeholder="074 XX XX XX">

            <label for="custMode">Retrait ou livraison ?</label>
            <select id="custMode" name="mode">
              <option value="retrait">Retrait en magasin (Owendo)</option>
              <option value="livraison">Livraison à domicile</option>
            </select>

            <label for="custAddress">Adresse (si livraison)</label>
            <textarea id="custAddress" name="address" placeholder="Quartier, repère..."></textarea>

            <button type="submit" class="btn btn-primary">Valider la commande</button>
          </form>
        </div>
      </div>`;

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.cart-row');
        const id = row.dataset.id;
        const item = items.find(i => i.id === id);
        if (!item) return;
        if (btn.dataset.action === 'inc') window.Cart.setQty(id, item.qty + 1);
        if (btn.dataset.action === 'dec') window.Cart.setQty(id, item.qty - 1);
        if (btn.dataset.action === 'remove') window.Cart.remove(id);
        render();
      });
    });

    const form = document.getElementById('orderForm');
    form.addEventListener('submit', handleSubmit);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const customer = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      mode: form.mode.value,
      address: form.address.value.trim()
    };
    const items = window.Cart.getAll();
    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch('/api/commande', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, customer })
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data }), () => { throw new Error('offline'); }))
      .then(({ ok, data }) => {
        if (!ok || !data.success) {
          // Le serveur a répondu mais refuse la commande (produit retiré,
          // quantité invalide...) : on l'explique au client, sans vider le panier.
          if (submitBtn) submitBtn.disabled = false;
          alert(data.error || 'La commande n\'a pas pu être enregistrée.');
          return;
        }
        // Le serveur renvoie les articles et le total au prix du catalogue.
        showConfirmation(data.reference, customer, data.items || items, data.total, data.deposit);
        window.Cart.clear();
      })
      .catch(() => {
        // Le serveur Node n'est peut-être pas lancé (aperçu statique) : on
        // dégrade proprement avec une référence générée côté client.
        const fallbackRef = 'PIO-' + Date.now().toString(36).toUpperCase();
        showConfirmation(fallbackRef, customer, items);
        window.Cart.clear();
      });
  }

  function showConfirmation(reference, customer, items, serverTotal, serverDeposit) {
    const total = typeof serverTotal === 'number' ? serverTotal : items.reduce((s, i) => s + i.qty * i.price, 0);
    const deposit = typeof serverDeposit === 'number' ? serverDeposit : depositFor(items);
    const lines = items.map(i => `• ${i.qty} x ${i.name}${i.leadTime ? ' (import sur commande)' : ''}`).join('\n');
    const message = encodeURIComponent(
      `Bonjour Prix Import Owendo, je viens de passer la commande ${reference} (${customer.mode}) :\n${lines}\nTotal : ${formatPrice(total)}${deposit ? `\nAcompte à verser : ${formatPrice(deposit)}` : ''}\nNom : ${customer.name} — Tél : ${customer.phone}${customer.address ? ' — Adresse : ' + customer.address : ''}`
    );

    container.innerHTML = `
      <div class="order-confirm">
        <h2>Merci, votre commande est enregistrée !</h2>
        <p>Référence de commande</p>
        <span class="ref">${reference}</span>
        <p>Total : <strong>${formatPrice(total)}</strong></p>
        ${deposit ? `<p>Acompte à verser : <strong>${formatPrice(deposit)}</strong></p>` : ''}
        <p style="margin: 18px 0; color: var(--gray);">${deposit
          ? "Confirmez votre commande sur WhatsApp : le magasin vous indiquera comment verser l'acompte, puis lancera l'import de vos produits."
          : 'Confirmez votre commande sur WhatsApp pour que le magasin la prépare tout de suite.'}</p>
        <a class="btn btn-whatsapp" href="https://wa.me/${SHOP_PHONE}?text=${message}" target="_blank" rel="noopener">Confirmer sur WhatsApp</a>
        <p style="margin-top: 24px;"><a href="pages/catalogue.html">← Continuer mes achats</a></p>
      </div>`;
  }

  document.addEventListener('cart:updated', render);
  render();
})();
