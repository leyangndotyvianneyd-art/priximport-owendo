// posts.js
// Charge data/posts.json (géré depuis pages/admin.html, ou modifiable à la
// main) et affiche les publications sur la page Nouveautés — même source de
// données que l'API /api/posts utilisée par l'application mobile, donc tout
// changement fait par l'administrateur apparaît ici automatiquement.
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('[data-posts-grid]');
  if (!grid) return;

  const base = window.DATA_BASE || '';
  const isPreview = grid.classList.contains('preview');
  const chipsWrap = document.querySelector('[data-posts-filters]');

  function resolveAsset(src) {
    if (!src) return '';
    return /^https?:\/\//.test(src) ? src : `${base}${src}`;
  }

  // Accepte aussi bien un ID brut qu'un lien YouTube complet (watch?v=,
  // youtu.be/, shorts/, embed/) — l'admin ne colle pas toujours juste l'ID.
  function extractYoutubeId(input) {
    if (!input) return '';
    const str = String(input).trim();
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([A-Za-z0-9_-]{11})/);
    return match ? match[1] : str;
  }

  // Un seul champ "média" sert pour tout, comme pour les photos : on détecte
  // tout seul s'il s'agit d'un lien YouTube (ou d'un ID YouTube brut) plutôt
  // que de forcer l'admin à choisir entre deux champs séparés.
  function detectYoutubeId(raw) {
    const str = String(raw || '').trim();
    if (!str) return '';
    if (/youtu\.be\/|youtube\.com\//.test(str)) return extractYoutubeId(str);
    if (/^[A-Za-z0-9_-]{11}$/.test(str)) return str;
    return '';
  }

  function isNew(dateStr) {
    const diffDays = (Date.now() - new Date(dateStr).getTime()) / 86400000;
    return diffDays <= 7;
  }

  function cardHTML(post) {
    const newBadge = isNew(post.date) ? `<span class="stamp-new">Nouveau</span>` : '';
    const dateLabel = new Date(post.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

    let media;
    if (post.type === 'video') {
      const source = post.media || post.youtube || '';
      const ytId = detectYoutubeId(source);
      const videoRef = ytId ? `yt:${ytId}` : resolveAsset(source);
      const thumb = post.thumbnail ? resolveAsset(post.thumbnail) : (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : '');
      media = `<div class="post-media" data-video="${videoRef}" role="button" tabindex="0" aria-label="Lire la vidéo « ${post.title} »">
                 ${thumb ? `<img src="${thumb}" alt="${post.title}" loading="lazy">` : ''}
                 <span class="play"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="26" fill="#F4C430"/><path d="M21 16l16 10-16 10V16Z" fill="#241C15"/></svg></span>
               </div>`;
    } else {
      const src = resolveAsset(post.media);
      media = `<div class="post-media" data-zoom-img="${src}" data-zoom-name="${post.title}" role="button" tabindex="0" aria-label="Voir la photo « ${post.title} » en grand"><img src="${src}" alt="${post.title}" loading="lazy"></div>`;
    }

    return `
      <article class="post-card">
        <span class="tape"></span>
        ${newBadge}
        ${media}
        <div class="post-body">
          <span class="post-tag">${post.tag}</span>
          <h3>${post.title}</h3>
          <p>${post.caption}</p>
          <span class="post-date">${dateLabel}</span>
        </div>
      </article>`;
  }

  function render(items) {
    grid.innerHTML = items.length
      ? items.map(cardHTML).join('')
      : `<div class="posts-empty">Aucune publication pour ce filtre.</div>`;
  }

  fetch(base + 'data/posts.json')
    .then((res) => {
      if (!res.ok) throw new Error('Impossible de charger les publications.');
      return res.json();
    })
    .then((posts) => {
      const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
      const initialList = isPreview ? sorted.slice(0, 3) : sorted;
      render(initialList);

      if (chipsWrap) {
        chipsWrap.addEventListener('click', (e) => {
          const btn = e.target.closest('.filter-chip');
          if (!btn) return;
          chipsWrap.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
          btn.classList.add('active');
          const type = btn.dataset.filter;
          render(type === 'all' ? sorted : sorted.filter((p) => p.type === type));
        });
      }
    })
    .catch((err) => {
      grid.innerHTML = '<div class="posts-empty">Erreur de chargement des publications.</div>';
      console.error(err);
    });

  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const media = lightbox.querySelector('.lightbox-media');

    function openVideoLightbox(src) {
      media.innerHTML = src.startsWith('yt:')
        ? `<iframe src="https://www.youtube.com/embed/${src.slice(3)}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
        : `<video src="${src}" controls autoplay></video>`;
      lightbox.classList.add('open');
    }

    grid.addEventListener('click', (e) => {
      const videoEl = e.target.closest('[data-video]');
      if (videoEl) { openVideoLightbox(videoEl.dataset.video); return; }
      const imgEl = e.target.closest('[data-zoom-img]');
      if (imgEl) openImageLightbox(imgEl.dataset.zoomImg, imgEl.dataset.zoomName);
    });

    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const videoEl = e.target.closest('[data-video]');
      if (videoEl) { e.preventDefault(); openVideoLightbox(videoEl.dataset.video); return; }
      const imgEl = e.target.closest('[data-zoom-img]');
      if (!imgEl) return;
      e.preventDefault();
      openImageLightbox(imgEl.dataset.zoomImg, imgEl.dataset.zoomName);
    });

    function openImageLightbox(src, name) {
      media.classList.add('is-image');
      media.innerHTML = `<img src="${src}" alt="${name}">`;
      lightbox.classList.add('open');
    }

    function closeLightbox() {
      lightbox.classList.remove('open');
      media.classList.remove('is-image');
      media.innerHTML = '';
    }

    lightbox.addEventListener('click', (e) => {
      if (e.target.closest('.lightbox-close') || e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
  }
});
