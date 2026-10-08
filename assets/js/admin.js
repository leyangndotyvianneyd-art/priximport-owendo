// admin.js — Page d'administration (pages/admin.html)
// Gère la connexion, puis l'ajout/modification/suppression des produits
// et des publications Nouveautés. Toute modification enregistrée ici passe
// par /api/admin/* (protégé par session) et se répercute immédiatement sur
// le site (assets/js/products.js, posts.js) et sur l'appli mobile Flutter,
// puisque tous les deux lisent /api/products et /api/posts en direct.

(function () {
  const loginView = document.getElementById('adminLogin');
  const dashboardView = document.getElementById('adminDashboard');
  const topbarActions = document.getElementById('adminTopbarActions');

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
  }

  async function api(url, options) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    let body = {};
    try { body = await res.json(); } catch (e) { /* réponse vide */ }
    if (!res.ok) {
      const err = new Error(body.error || 'Erreur serveur.');
      err.status = res.status;
      throw err;
    }
    return body;
  }

  // Envoie un fichier choisi par l'admin (photo ou vidéo) au serveur, qui le
  // place dans le bon dossier de assets/ et renvoie son chemin — pas de
  // Content-Type manuel ici, le navigateur doit fixer lui-même la frontière
  // multipart/form-data.
  async function uploadFile(file, kind) {
    const formData = new FormData();
    formData.append('kind', kind);
    formData.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', credentials: 'same-origin', body: formData });
    let body = {};
    try { body = await res.json(); } catch (e) { /* réponse vide */ }
    if (!res.ok) throw new Error(body.error || "Erreur d'envoi.");
    return body.path;
  }

  // Branche chaque zone .admin-upload (clic ou glisser-déposer) à
  // uploadFile(), et écrit le chemin renvoyé dans le champ texte associé
  // (data-upload-target) — en le remplaçant, ou en l'ajoutant à la suite
  // pour un champ à plusieurs photos (data-upload-append="true").
  function initUploaders() {
    document.querySelectorAll('.admin-upload').forEach((zone) => {
      const fileInput = zone.querySelector('input[type=file]');
      const append = zone.dataset.uploadAppend === 'true';

      function handleFiles(files) {
        const target = document.getElementById(zone.dataset.uploadTarget);
        [...files].forEach(async (file) => {
          zone.classList.add('uploading');
          try {
            const uploadedPath = await uploadFile(file, zone.dataset.uploadKind);
            target.value = append && target.value ? target.value + '\n' + uploadedPath : uploadedPath;
            showToast('Fichier envoyé.');
          } catch (err) {
            showToast(err.message);
          } finally {
            zone.classList.remove('uploading');
          }
        });
      }

      zone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        if (fileInput.files.length) handleFiles(fileInput.files);
        fileInput.value = '';
      });
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
      });
    });
  }
  initUploaders();

  function renderTopbar(email) {
    topbarActions.innerHTML = '';
    const span = document.createElement('span');
    span.style.color = 'var(--gray)';
    span.style.fontSize = '0.85rem';
    span.style.marginRight = '12px';
    span.textContent = email;
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline';
    btn.type = 'button';
    btn.textContent = 'Se déconnecter';
    btn.addEventListener('click', async () => {
      await api('/api/admin/logout', { method: 'POST' });
      location.reload();
    });
    topbarActions.appendChild(span);
    topbarActions.appendChild(btn);
  }

  // ---------------- Connexion ----------------

  const loginForm = document.getElementById('adminLoginForm');
  const loginError = document.getElementById('adminLoginError');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    const data = Object.fromEntries(new FormData(loginForm));
    try {
      const result = await api('/api/admin/login', { method: 'POST', body: JSON.stringify(data) });
      renderTopbar(result.email);
      loginView.hidden = true;
      dashboardView.hidden = false;
      loadAll();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.hidden = false;
    }
  });

  async function checkSession() {
    try {
      const me = await api('/api/admin/me');
      renderTopbar(me.email);
      loginView.hidden = true;
      dashboardView.hidden = false;
      loadAll();
    } catch (err) {
      loginView.hidden = false;
      dashboardView.hidden = true;
    }
  }

  // ---------------- Onglets ----------------

  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.querySelectorAll('.admin-panel').forEach((panel) => {
        panel.hidden = panel.dataset.panel !== target;
      });
    });
  });

  // ---------------- Produits ----------------

  const productsTableBody = document.getElementById('productsTableBody');
  const productModal = document.getElementById('productModal');
  const productForm = document.getElementById('productForm');
  const productFormError = document.getElementById('productFormError');
  const productModalTitle = document.getElementById('productModalTitle');
  const productPromoCheckbox = document.getElementById('productPromoCheckbox');
  const productPromoDates = document.getElementById('productPromoDates');
  let knownCategories = [];
  let knownGroups = [];

  function togglePromoDates() {
    productPromoDates.hidden = !productPromoCheckbox.checked;
  }
  productPromoCheckbox.addEventListener('change', togglePromoDates);

  // Type dans le rayon (Rouge / Blanc..., Nourriture / Accessoires...) :
  // la liste dépend de la catégorie choisie (voir assets/js/rayons.js).
  const productTypeSelect = document.getElementById('productTypeSelect');
  const productTypeLabel = document.getElementById('productTypeLabel');

  function rayonFor(category) {
    const c = String(category || '').trim().toLowerCase();
    return (window.PioRayons || []).find((r) => r.category.toLowerCase() === c && r.types.length);
  }

  function refreshTypeOptions(selected) {
    const rayon = rayonFor(productForm.elements.category.value);
    const current = selected != null ? selected : productTypeSelect.value;
    productTypeLabel.hidden = !rayon;
    productTypeSelect.innerHTML = '<option value="">—</option>' + (rayon ? rayon.types : [])
      .map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    productTypeSelect.value = rayon && rayon.types.includes(current) ? current : '';
  }

  productForm.elements.category.addEventListener('input', () => refreshTypeOptions());
  productForm.elements.category.addEventListener('change', () => refreshTypeOptions());

  function openProductModal(product) {
    productForm.reset();
    productFormError.hidden = true;
    if (product) {
      productModalTitle.textContent = 'Modifier « ' + product.name + ' »';
      productForm.elements.id.value = product.id;
      productForm.elements.name.value = product.name;
      productForm.elements.unit.value = product.unit || '';
      productForm.elements.category.value = product.category || '';
      productForm.elements.price.value = product.price;
      productForm.elements.oldPrice.value = product.oldPrice || '';
      productForm.elements.image.value = product.image || '';
      productForm.elements.images.value = (product.images || []).join('\n');
      productForm.elements.group.value = product.group || '';
      productForm.elements.promo.checked = !!product.promo;
      productForm.elements.promoStart.value = product.promoStart || '';
      productForm.elements.promoEnd.value = product.promoEnd || '';
      productForm.elements.active.checked = product.active !== false;
    } else {
      productModalTitle.textContent = 'Ajouter un produit';
      productForm.elements.id.value = '';
      productForm.elements.active.checked = true;
    }
    togglePromoDates();
    refreshTypeOptions(product ? (product.wineType || product.subType || '') : '');
    const categoryList = document.getElementById('categoryList');
    // Catégories des rayons (Cave à vin, Électroménager...) toujours
    // proposées, même avant le premier produit.
    categoryList.innerHTML = [...new Set([...knownCategories, ...(window.PioRayons || []).map((r) => r.category)])].map((c) => `<option value="${escapeHtml(c)}">`).join('');
    const groupList = document.getElementById('groupList');
    groupList.innerHTML = knownGroups.map((g) => `<option value="${escapeHtml(g)}">`).join('');
    productModal.hidden = false;
  }

  document.getElementById('btnNewProduct').addEventListener('click', () => openProductModal(null));
  document.getElementById('btnCancelProduct').addEventListener('click', () => { productModal.hidden = true; });

  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    productFormError.hidden = true;
    const raw = Object.fromEntries(new FormData(productForm));
    const isPromo = productForm.elements.promo.checked;
    if (isPromo && (!raw.promoStart || !raw.promoEnd)) {
      productFormError.textContent = 'Renseigne une date de début et une date de fin pour la promotion.';
      productFormError.hidden = false;
      return;
    }
    if (isPromo && raw.promoStart && raw.promoEnd && raw.promoStart > raw.promoEnd) {
      productFormError.textContent = 'La date de fin doit être après la date de début.';
      productFormError.hidden = false;
      return;
    }
    const payload = {
      name: raw.name,
      unit: raw.unit,
      category: raw.category,
      price: Number(raw.price),
      oldPrice: raw.oldPrice ? Number(raw.oldPrice) : '',
      image: raw.image,
      images: raw.images ? raw.images.split('\n').map((s) => s.trim()).filter(Boolean) : [],
      group: raw.group || '',
      // La cave range son type dans "wineType", les autres rayons dans
      // "subType" ; l'autre champ est vidé.
      wineType: (rayonFor(raw.category) || {}).typeField === 'wineType' ? (raw.productType || '') : '',
      subType: (rayonFor(raw.category) || {}).typeField === 'wineType' ? '' : (raw.productType || ''),
      promo: isPromo,
      promoStart: isPromo ? raw.promoStart : '',
      promoEnd: isPromo ? raw.promoEnd : '',
      active: productForm.elements.active.checked
    };
    try {
      if (raw.id) {
        await api('/api/admin/products/' + encodeURIComponent(raw.id), { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Produit mis à jour.');
      } else {
        await api('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Produit ajouté.');
      }
      productModal.hidden = true;
      loadProducts();
    } catch (err) {
      productFormError.textContent = err.message;
      productFormError.hidden = false;
    }
  });

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatFcfa(value) {
    return Number(value || 0).toLocaleString('fr-FR') + ' FCFA';
  }

  async function loadProducts() {
    const products = await api('/api/products');
    knownCategories = [...new Set(products.map((p) => p.category).filter(Boolean))];
    knownGroups = [...new Set(products.map((p) => p.group).filter(Boolean))];
    productsTableBody.innerHTML = products.map((p) => `
      <tr>
        <td>
          <strong>${escapeHtml(p.name)}</strong><br>
          <span class="admin-muted">${escapeHtml(p.unit || '')}</span>
        </td>
        <td>${escapeHtml(p.category || '')}</td>
        <td>${formatFcfa(p.price)}${p.oldPrice ? ` <span class="admin-muted" style="text-decoration:line-through;">${formatFcfa(p.oldPrice)}</span>` : ''}</td>
        <td>${p.active === false ? '<span class="admin-badge admin-badge-off">Masqué</span>' : '<span class="admin-badge admin-badge-on">Visible</span>'}</td>
        <td class="admin-row-actions">
          <button type="button" class="btn btn-outline btn-sm" data-edit-product="${escapeHtml(p.id)}">Modifier</button>
          <button type="button" class="btn btn-outline btn-sm admin-btn-danger" data-delete-product="${escapeHtml(p.id)}">Supprimer</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="admin-muted">Aucun produit pour le moment.</td></tr>';

    productsTableBody.querySelectorAll('[data-edit-product]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const product = products.find((p) => p.id === btn.dataset.editProduct);
        openProductModal(product);
      });
    });
    productsTableBody.querySelectorAll('[data-delete-product]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const product = products.find((p) => p.id === btn.dataset.deleteProduct);
        if (!confirm(`Supprimer « ${product.name} » du catalogue ?`)) return;
        try {
          await api('/api/admin/products/' + encodeURIComponent(product.id), { method: 'DELETE' });
          showToast('Produit supprimé.');
          loadProducts();
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  }

  // ---------------- Publications (Nouveautés) ----------------

  const postsTableBody = document.getElementById('postsTableBody');
  const postModal = document.getElementById('postModal');
  const postForm = document.getElementById('postForm');
  const postFormError = document.getElementById('postFormError');
  const postModalTitle = document.getElementById('postModalTitle');
  const postTypeSelect = document.getElementById('postTypeSelect');
  const postMediaLabel = document.getElementById('postMediaLabel');
  const postMediaUpload = document.getElementById('postMediaUpload');
  const postVideoFields = document.getElementById('postVideoFields');

  function togglePostTypeFields() {
    const isVideo = postTypeSelect.value === 'video';
    postVideoFields.hidden = !isVideo;
    postMediaLabel.firstChild.textContent = isVideo
      ? 'Vidéo (lien YouTube, lien direct .mp4, ou nom de fichier dans assets/videos/) '
      : 'Image (URL, ou nom de fichier dans assets/img/posts/) ';
    postMediaUpload.dataset.uploadKind = isVideo ? 'video' : 'post-image';
    postMediaUpload.querySelector('input[type=file]').accept = isVideo ? 'video/*' : 'image/*';
    postMediaUpload.querySelector('.admin-upload-text').innerHTML = isVideo
      ? '📁 Glisse une vidéo ici, ou <strong>clique pour choisir</strong>'
      : '📁 Glisse une image ici, ou <strong>clique pour choisir</strong>';
  }
  postTypeSelect.addEventListener('change', togglePostTypeFields);

  function openPostModal(post) {
    postForm.reset();
    postFormError.hidden = true;
    if (post) {
      postModalTitle.textContent = 'Modifier « ' + post.title + ' »';
      postForm.elements.id.value = post.id;
      postForm.elements.title.value = post.title;
      postForm.elements.caption.value = post.caption || '';
      postForm.elements.type.value = post.type;
      postForm.elements.tag.value = post.tag || '';
      postForm.elements.date.value = post.date || '';
      postForm.elements.media.value = post.media || post.youtube || '';
      postForm.elements.thumbnail.value = post.thumbnail || '';
    } else {
      postModalTitle.textContent = 'Ajouter une publication';
      postForm.elements.id.value = '';
      postForm.elements.date.value = new Date().toISOString().slice(0, 10);
    }
    togglePostTypeFields();
    postModal.hidden = false;
  }

  document.getElementById('btnNewPost').addEventListener('click', () => openPostModal(null));
  document.getElementById('btnCancelPost').addEventListener('click', () => { postModal.hidden = true; });

  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    postFormError.hidden = true;
    const raw = Object.fromEntries(new FormData(postForm));
    if (!raw.media) {
      postFormError.textContent = raw.type === 'video' ? 'Renseigne un lien YouTube ou une vidéo.' : 'Renseigne une image.';
      postFormError.hidden = false;
      return;
    }
    const payload = {
      title: raw.title,
      caption: raw.caption,
      type: raw.type,
      tag: raw.tag,
      date: raw.date,
      media: raw.media,
      thumbnail: raw.type === 'video' ? raw.thumbnail : ''
    };
    try {
      if (raw.id) {
        await api('/api/admin/posts/' + encodeURIComponent(raw.id), { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Publication mise à jour.');
      } else {
        await api('/api/admin/posts', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Publication ajoutée.');
      }
      postModal.hidden = true;
      loadPosts();
    } catch (err) {
      postFormError.textContent = err.message;
      postFormError.hidden = false;
    }
  });

  async function loadPosts() {
    const posts = await api('/api/posts');
    postsTableBody.innerHTML = posts.map((p) => `
      <tr>
        <td><strong>${escapeHtml(p.title)}</strong><br><span class="admin-muted">${escapeHtml(p.tag || '')}</span></td>
        <td>${p.type === 'video' ? '🎬 Vidéo' : '📷 Photo'}</td>
        <td>${escapeHtml(p.date || '')}</td>
        <td class="admin-row-actions">
          <button type="button" class="btn btn-outline btn-sm" data-edit-post="${escapeHtml(p.id)}">Modifier</button>
          <button type="button" class="btn btn-outline btn-sm admin-btn-danger" data-delete-post="${escapeHtml(p.id)}">Supprimer</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="admin-muted">Aucune publication pour le moment.</td></tr>';

    postsTableBody.querySelectorAll('[data-edit-post]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const post = posts.find((p) => p.id === btn.dataset.editPost);
        openPostModal(post);
      });
    });
    postsTableBody.querySelectorAll('[data-delete-post]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const post = posts.find((p) => p.id === btn.dataset.deletePost);
        if (!confirm(`Supprimer « ${post.title} » ?`)) return;
        try {
          await api('/api/admin/posts/' + encodeURIComponent(post.id), { method: 'DELETE' });
          showToast('Publication supprimée.');
          loadPosts();
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  }

  // ---------------- Contenu du site ----------------

  const fieldsForm = document.getElementById('fieldsForm');
  const fieldsFormError = document.getElementById('fieldsFormError');
  const hoursTableBody = document.getElementById('hoursTableBody');
  const hoursModal = document.getElementById('hoursModal');
  const hoursForm = document.getElementById('hoursForm');
  const hoursFormError = document.getElementById('hoursFormError');
  const hoursModalTitle = document.getElementById('hoursModalTitle');
  const cardModal = document.getElementById('cardModal');
  const cardForm = document.getElementById('cardForm');
  const cardFormError = document.getElementById('cardFormError');
  const cardModalTitle = document.getElementById('cardModalTitle');
  const cardIconSelect = document.getElementById('cardIconSelect');
  const cardHrefField = document.getElementById('cardHrefField');

  const CARD_SECTION_LABELS = { home: 'accueil', fraicheur: 'Fraîcheur & Local', services: 'Services' };

  function fillFieldsForm(content) {
    if (!fieldsForm) return;
    const contact = content.contact || {};
    fieldsForm.elements.topbarMessage.value = content.topbarMessage || '';
    fieldsForm.elements.topbarHighlight.value = content.topbarHighlight || '';
    fieldsForm.elements.footerTagline.value = content.footerTagline || '';
    fieldsForm.elements.address.value = contact.address || '';
    fieldsForm.elements.phone.value = contact.phone || '';
    fieldsForm.elements.email.value = contact.email || '';
    fieldsForm.elements.whatsapp.value = contact.whatsapp || '';
    fieldsForm.elements.mapCaption.value = content.mapCaption || '';
    fieldsForm.elements.freshNote.value = content.freshNote || '';
  }

  if (fieldsForm) {
    fieldsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      fieldsFormError.hidden = true;
      const payload = Object.fromEntries(new FormData(fieldsForm));
      try {
        await api('/api/admin/content/fields', { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Textes enregistrés.');
      } catch (err) {
        fieldsFormError.textContent = err.message;
        fieldsFormError.hidden = false;
      }
    });
  }

  function renderHoursTable(hours) {
    if (!hoursTableBody) return;
    hoursTableBody.innerHTML = (hours || []).map((h) => `
      <tr>
        <td>${escapeHtml(h.label)}</td>
        <td>${escapeHtml(h.value)}</td>
        <td class="admin-row-actions">
          <button type="button" class="btn btn-outline btn-sm" data-edit-hours="${escapeHtml(h.id)}">Modifier</button>
          <button type="button" class="btn btn-outline btn-sm admin-btn-danger" data-delete-hours="${escapeHtml(h.id)}">Supprimer</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="3" class="admin-muted">Aucun horaire pour le moment.</td></tr>';

    hoursTableBody.querySelectorAll('[data-edit-hours]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = (hours || []).find((h) => h.id === btn.dataset.editHours);
        openHoursModal(row);
      });
    });
    hoursTableBody.querySelectorAll('[data-delete-hours]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Supprimer cette ligne d’horaires ?')) return;
        try {
          await api('/api/admin/content/hours/' + encodeURIComponent(btn.dataset.deleteHours), { method: 'DELETE' });
          showToast('Horaire supprimé.');
          loadContent();
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  }

  function openHoursModal(row) {
    if (!hoursModal) return;
    hoursForm.reset();
    hoursFormError.hidden = true;
    if (row) {
      hoursModalTitle.textContent = 'Modifier cette ligne';
      hoursForm.elements.id.value = row.id;
      hoursForm.elements.label.value = row.label;
      hoursForm.elements.value.value = row.value;
    } else {
      hoursModalTitle.textContent = 'Ajouter une ligne d’horaires';
      hoursForm.elements.id.value = '';
    }
    hoursModal.hidden = false;
  }

  if (document.getElementById('btnNewHours')) {
    document.getElementById('btnNewHours').addEventListener('click', () => openHoursModal(null));
    document.getElementById('btnCancelHours').addEventListener('click', () => { hoursModal.hidden = true; });
    hoursForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hoursFormError.hidden = true;
      const raw = Object.fromEntries(new FormData(hoursForm));
      const payload = { label: raw.label, value: raw.value };
      try {
        if (raw.id) {
          await api('/api/admin/content/hours/' + encodeURIComponent(raw.id), { method: 'PUT', body: JSON.stringify(payload) });
          showToast('Horaire mis à jour.');
        } else {
          await api('/api/admin/content/hours', { method: 'POST', body: JSON.stringify(payload) });
          showToast('Horaire ajouté.');
        }
        hoursModal.hidden = true;
        loadContent();
      } catch (err) {
        hoursFormError.textContent = err.message;
        hoursFormError.hidden = false;
      }
    });
  }

  function populateCardIconSelect(section) {
    if (!cardIconSelect) return;
    const isFresh = section === 'fraicheur';
    const icons = isFresh ? window.PioIcons.FRESH : window.PioIcons.BADGE;
    const labels = isFresh ? window.PioIcons.FRESH_LABELS : window.PioIcons.BADGE_LABELS;
    cardIconSelect.innerHTML = Object.keys(icons).map((key) =>
      `<option value="${key}">${escapeHtml(labels[key] || key)}</option>`
    ).join('');
  }

  function openCardModal(section, card) {
    if (!cardModal) return;
    cardForm.reset();
    cardFormError.hidden = true;
    cardForm.elements.section.value = section;
    populateCardIconSelect(section);
    cardHrefField.hidden = section !== 'home';
    if (card) {
      cardModalTitle.textContent = 'Modifier « ' + card.title + ' »';
      cardForm.elements.id.value = card.id;
      cardForm.elements.title.value = card.title;
      cardForm.elements.text.value = card.text || '';
      cardForm.elements.icon.value = card.icon;
      if (section === 'home') cardForm.elements.href.value = card.href || 'pages/catalogue.html';
    } else {
      cardModalTitle.textContent = 'Ajouter une carte (' + CARD_SECTION_LABELS[section] + ')';
      cardForm.elements.id.value = '';
    }
    cardModal.hidden = false;
  }

  document.querySelectorAll('[data-new-card]').forEach((btn) => {
    btn.addEventListener('click', () => openCardModal(btn.dataset.newCard, null));
  });
  if (document.getElementById('btnCancelCard')) {
    document.getElementById('btnCancelCard').addEventListener('click', () => { cardModal.hidden = true; });
  }
  if (cardForm) {
    cardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      cardFormError.hidden = true;
      const raw = Object.fromEntries(new FormData(cardForm));
      const payload = { title: raw.title, text: raw.text, icon: raw.icon };
      if (raw.section === 'home') payload.href = raw.href;
      try {
        if (raw.id) {
          await api('/api/admin/content/cards/' + raw.section + '/' + encodeURIComponent(raw.id), { method: 'PUT', body: JSON.stringify(payload) });
          showToast('Carte mise à jour.');
        } else {
          await api('/api/admin/content/cards/' + raw.section, { method: 'POST', body: JSON.stringify(payload) });
          showToast('Carte ajoutée.');
        }
        cardModal.hidden = true;
        loadContent();
      } catch (err) {
        cardFormError.textContent = err.message;
        cardFormError.hidden = false;
      }
    });
  }

  function renderCardsTable(section, cards) {
    const tbody = document.getElementById('cardsTableBody-' + section);
    if (!tbody) return;
    const showHref = section === 'home';
    tbody.innerHTML = (cards || []).map((c) => `
      <tr>
        <td><strong>${escapeHtml(c.title)}</strong><br><span class="admin-muted">${escapeHtml(c.text || '')}</span></td>
        ${showHref ? `<td class="admin-muted">${escapeHtml(c.href || '')}</td>` : ''}
        <td class="admin-row-actions">
          <button type="button" class="btn btn-outline btn-sm" data-edit-card="${escapeHtml(c.id)}">Modifier</button>
          <button type="button" class="btn btn-outline btn-sm admin-btn-danger" data-delete-card="${escapeHtml(c.id)}">Supprimer</button>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="${showHref ? 3 : 2}" class="admin-muted">Aucune carte pour le moment.</td></tr>`;

    tbody.querySelectorAll('[data-edit-card]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = (cards || []).find((c) => c.id === btn.dataset.editCard);
        openCardModal(section, card);
      });
    });
    tbody.querySelectorAll('[data-delete-card]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const card = (cards || []).find((c) => c.id === btn.dataset.deleteCard);
        if (!confirm(`Supprimer la carte « ${card.title} » ?`)) return;
        try {
          await api('/api/admin/content/cards/' + section + '/' + encodeURIComponent(card.id), { method: 'DELETE' });
          showToast('Carte supprimée.');
          loadContent();
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  }

  // ---------------- Carrousel de l'accueil ----------------
  // Réglages (vitesse + diapos automatiques) et diapos créées par l'admin,
  // stockés dans content.json ("heroSlider") et lus par hero-slider.js.

  const sliderSettingsForm = document.getElementById('sliderSettingsForm');
  const sliderSettingsError = document.getElementById('sliderSettingsError');
  const slidesTableBody = document.getElementById('slidesTableBody');
  const slideModal = document.getElementById('slideModal');
  const slideForm = document.getElementById('slideForm');
  const slideFormError = document.getElementById('slideFormError');
  const slideModalTitle = document.getElementById('slideModalTitle');
  const slideLayoutSelect = document.getElementById('slideLayoutSelect');
  const SLIDER_AUTO_KEYS = ['welcome', 'promo', 'fraicheur', 'nouveaute', 'services'];
  const SLIDE_THEME_LABELS = { green: 'Vert', dark: 'Vert foncé', yellow: 'Jaune' };

  function adminAsset(src) {
    if (!src) return '';
    return /^https?:\/\//.test(src) ? src : '../' + src;
  }

  function fillSliderSettings(slider) {
    if (!sliderSettingsForm) return;
    sliderSettingsForm.elements.delay.value = slider.delay || 6;
    SLIDER_AUTO_KEYS.forEach((k) => {
      sliderSettingsForm.elements[k].checked = !slider.auto || slider.auto[k] !== false;
    });
  }

  if (sliderSettingsForm) {
    sliderSettingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      sliderSettingsError.hidden = true;
      const auto = {};
      SLIDER_AUTO_KEYS.forEach((k) => { auto[k] = sliderSettingsForm.elements[k].checked; });
      const payload = { delay: Number(sliderSettingsForm.elements.delay.value), auto };
      try {
        await api('/api/admin/slider/settings', { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Réglages du carrousel enregistrés.');
      } catch (err) {
        sliderSettingsError.textContent = err.message;
        sliderSettingsError.hidden = false;
      }
    });
  }

  // Affiche : image obligatoire, titre facultatif. Texte + photo : l'inverse.
  function syncSlideLayoutFields() {
    const poster = slideLayoutSelect.value === 'poster';
    document.getElementById('slideImageLabel').firstChild.textContent = poster ? 'Image * ' : 'Photo (facultative) ';
    document.getElementById('slideTitleLabel').firstChild.textContent = poster ? 'Titre (facultatif) ' : 'Titre * ';
    document.getElementById('slidePosterHint').hidden = !poster;
    slideForm.elements.title.required = !poster;
    slideForm.elements.image.required = poster;
  }

  function openSlideModal(slide) {
    if (!slideModal) return;
    slideForm.reset();
    slideFormError.hidden = true;
    if (slide) {
      slideModalTitle.textContent = 'Modifier la diapositive';
      ['id', 'layout', 'theme', 'eyebrow', 'title', 'text', 'image', 'ctaLabel', 'ctaHref'].forEach((k) => {
        slideForm.elements[k].value = slide[k] || '';
      });
      slideForm.elements.layout.value = slide.layout || 'split';
      slideForm.elements.theme.value = slide.theme || 'green';
      slideForm.elements.active.checked = slide.active !== false;
    } else {
      slideModalTitle.textContent = 'Ajouter une diapositive';
      slideForm.elements.id.value = '';
      slideForm.elements.active.checked = true;
    }
    syncSlideLayoutFields();
    slideModal.hidden = false;
  }

  if (slideForm) {
    slideLayoutSelect.addEventListener('change', syncSlideLayoutFields);
    document.getElementById('btnNewSlide').addEventListener('click', () => openSlideModal(null));
    document.getElementById('btnCancelSlide').addEventListener('click', () => { slideModal.hidden = true; });
    slideForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      slideFormError.hidden = true;
      const raw = Object.fromEntries(new FormData(slideForm));
      const payload = {
        layout: raw.layout, theme: raw.theme, eyebrow: raw.eyebrow, title: raw.title, text: raw.text,
        image: raw.image, ctaLabel: raw.ctaLabel, ctaHref: raw.ctaHref,
        active: slideForm.elements.active.checked
      };
      try {
        if (raw.id) {
          await api('/api/admin/slider/slides/' + encodeURIComponent(raw.id), { method: 'PUT', body: JSON.stringify(payload) });
          showToast('Diapositive mise à jour.');
        } else {
          await api('/api/admin/slider/slides', { method: 'POST', body: JSON.stringify(payload) });
          showToast('Diapositive ajoutée.');
        }
        slideModal.hidden = true;
        loadContent();
      } catch (err) {
        slideFormError.textContent = err.message;
        slideFormError.hidden = false;
      }
    });
  }

  function renderSlidesTable(slides) {
    if (!slidesTableBody) return;
    slidesTableBody.innerHTML = slides.map((s, i) => {
      const img = adminAsset(s.image);
      const thumb = `<div class="admin-slide-thumb theme-${escapeHtml(s.theme || 'green')}"${img ? ` style="background-image:url('${escapeHtml(img)}')"` : ''}>${img ? '' : escapeHtml(s.title)}</div>`;
      return `
        <tr>
          <td>${thumb}</td>
          <td>
            <strong>${escapeHtml(s.title || '(sans titre)')}</strong><br>
            <span class="admin-muted">${s.layout === 'poster' ? 'Affiche' : 'Texte + photo'} · ${SLIDE_THEME_LABELS[s.theme] || 'Vert'}${s.ctaHref ? ' · → ' + escapeHtml(s.ctaHref) : ''}</span>
          </td>
          <td>${s.active === false ? '<span class="admin-badge admin-badge-off">Masquée</span>' : '<span class="admin-badge admin-badge-on">Visible</span>'}</td>
          <td class="admin-row-actions">
            <button type="button" class="btn btn-outline btn-sm" data-move-slide="${escapeHtml(s.id)}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Monter">↑</button>
            <button type="button" class="btn btn-outline btn-sm" data-move-slide="${escapeHtml(s.id)}" data-dir="1" ${i === slides.length - 1 ? 'disabled' : ''} aria-label="Descendre">↓</button>
            <button type="button" class="btn btn-outline btn-sm" data-edit-slide="${escapeHtml(s.id)}">Modifier</button>
            <button type="button" class="btn btn-outline btn-sm admin-btn-danger" data-delete-slide="${escapeHtml(s.id)}">Supprimer</button>
          </td>
        </tr>`;
    }).join('') || '<tr><td colspan="4" class="admin-muted">Aucune diapositive personnalisée : seules les diapositives automatiques s\'affichent.</td></tr>';

    slidesTableBody.querySelectorAll('[data-edit-slide]').forEach((btn) => {
      btn.addEventListener('click', () => openSlideModal(slides.find((s) => s.id === btn.dataset.editSlide)));
    });
    slidesTableBody.querySelectorAll('[data-move-slide]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api('/api/admin/slider/slides/' + encodeURIComponent(btn.dataset.moveSlide) + '/move', {
            method: 'POST', body: JSON.stringify({ dir: Number(btn.dataset.dir) })
          });
          loadContent();
        } catch (err) {
          showToast(err.message);
        }
      });
    });
    slidesTableBody.querySelectorAll('[data-delete-slide]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Supprimer cette diapositive ?')) return;
        try {
          await api('/api/admin/slider/slides/' + encodeURIComponent(btn.dataset.deleteSlide), { method: 'DELETE' });
          showToast('Diapositive supprimée.');
          loadContent();
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  }

  async function loadContent() {
    if (!fieldsForm) return; // pas d'onglet "Contenu du site" sur cette page
    const content = await api('/api/content');
    fillFieldsForm(content);
    renderHoursTable(content.hours);
    const cards = content.cards || {};
    renderCardsTable('home', cards.home);
    renderCardsTable('fraicheur', cards.fraicheur);
    renderCardsTable('services', cards.services);
    const slider = content.heroSlider || {};
    fillSliderSettings(slider);
    renderSlidesTable(Array.isArray(slider.slides) ? slider.slides : []);
  }

  function loadAll() {
    loadProducts();
    loadPosts();
    loadContent();
  }

  checkSession();
})();
