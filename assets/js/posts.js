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
      // Vidéo envoyée sans miniature : on affiche une image tirée de la
      // vidéo elle-même (chargée seulement quand la carte arrive à l'écran,
      // voir loadVideoFrames) plutôt qu'une case vide.
      const frame = !thumb && !ytId && videoRef
        ? `<video class="post-media-frame" data-frame-src="${videoRef}#t=1" muted playsinline preload="none" aria-hidden="true"></video>`
        : '';
      media = `<div class="post-media" data-video="${videoRef}" role="button" tabindex="0" aria-label="Lire la vidéo « ${post.title} »">
                 ${thumb ? `<img src="${thumb}" alt="${post.title}" loading="lazy">` : frame}
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

  // Charge l'image des vidéos sans miniature seulement quand elles
  // approchent de l'écran — sinon la page téléchargerait toutes les vidéos
  // d'un coup.
  //
  // Une fois l'image obtenue, on la copie dans une simple <img> et on libère
  // le lecteur vidéo : garder des dizaines de lecteurs ouverts pour de
  // simples vignettes alourdissait la page (clics lents, notamment sur le ✕
  // de la visionneuse).
  function frameToImage(video) {
    try {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 480 / (video.videoWidth || 480));
      canvas.width = Math.round((video.videoWidth || 480) * scale);
      canvas.height = Math.round((video.videoHeight || 270) * scale);
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = document.createElement('img');
      img.className = 'post-media-frame';
      img.alt = '';
      img.src = canvas.toDataURL('image/jpeg', 0.8);
      video.replaceWith(img);
    } catch (e) {
      return; // image impossible à copier : on garde le lecteur tel quel
    }
    video.removeAttribute('src');
    video.load();
  }

  // On prend l'image à 1 seconde (la toute première image d'une vidéo est
  // souvent noire).
  function startFrame(video) {
    video.addEventListener('loadeddata', () => {
      if (video.currentTime < 0.5 && video.duration > 1) {
        video.addEventListener('seeked', () => frameToImage(video), { once: true });
        video.currentTime = 1;
      } else {
        frameToImage(video);
      }
    }, { once: true });
    video.preload = 'auto';
    video.src = video.dataset.frameSrc.replace(/#t=[\d.]+$/, '');
  }

  const frameObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          frameObserver.unobserve(entry.target);
          startFrame(entry.target);
        });
      }, { rootMargin: '200px' })
    : null;

  function loadVideoFrames() {
    grid.querySelectorAll('video[data-frame-src]:not([src])').forEach((video) => {
      if (frameObserver) frameObserver.observe(video);
      else startFrame(video);
    });
  }

  function render(items) {
    grid.innerHTML = items.length
      ? items.map(cardHTML).join('')
      : `<div class="posts-empty">Aucune publication pour ce filtre.</div>`;
    loadVideoFrames();
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

    // Vidéo YouTube : cadre 16:9. Vidéo envoyée (souvent verticale, format
    // téléphone) : le lecteur prend la forme exacte de la vidéo, sans bandes
    // noires — un clic à côté de la vidéo tombe alors sur le fond sombre et
    // ferme la visionneuse, au lieu de mettre la vidéo en pause.
    function openVideoLightbox(src) {
      const isYoutube = src.startsWith('yt:');
      media.className = 'lightbox-media' + (isYoutube ? '' : ' is-video');
      media.innerHTML = isYoutube
        ? `<iframe src="https://www.youtube.com/embed/${src.slice(3)}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
        : `<video src="${src}" controls autoplay playsinline></video>`;
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
      media.className = 'lightbox-media is-image';
      media.innerHTML = `<img src="${src}" alt="${name}">`;
      lightbox.classList.add('open');
    }

    function closeLightbox() {
      if (!lightbox.classList.contains('open')) return;
      lightbox.classList.remove('open');
      media.className = 'lightbox-media';
      media.innerHTML = '';
      // La visionneuse (invisible) capte encore les clics un court instant :
      // sur mobile, le "clic" qui suit le relâchement du doigt ne doit pas
      // traverser jusqu'au lien situé sous le ✕.
      lightbox.classList.add('closing');
      clearTimeout(lightbox._closingTimer);
      lightbox._closingTimer = setTimeout(() => lightbox.classList.remove('closing'), 400);
    }

    // Le ✕ ferme dès qu'on relâche la souris (ou le doigt) dessus : un
    // "click" classique est ignoré par le navigateur si la souris a bougé
    // entre l'appui et le relâchement, ce qui arrivait souvent.
    const closeBtn = lightbox.querySelector('.lightbox-close');
    if (closeBtn) closeBtn.addEventListener('pointerup', closeLightbox);

    // Ferme aussi sur le fond sombre, ou sur la photo agrandie elle-même.
    lightbox.addEventListener('click', (e) => {
      const onPhoto = media.classList.contains('is-image') && e.target.closest('.lightbox-media');
      if (e.target.closest('.lightbox-close') || e.target === lightbox || e.target === media || onPhoto) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
  }
});
