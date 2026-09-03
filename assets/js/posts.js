// posts.js
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('[data-posts-grid]');
  if (!grid || !window.POSTS) return;

  const base = window.DATA_BASE || '';
  const isPreview = grid.classList.contains('preview');
  const chipsWrap = document.querySelector('[data-posts-filters]');

  const sorted = [...window.POSTS].sort((a, b) => new Date(b.date) - new Date(a.date));
  const initialList = isPreview ? sorted.slice(0, 3) : sorted;

  function isNew(dateStr) {
    const diffDays = (Date.now() - new Date(dateStr).getTime()) / 86400000;
    return diffDays <= 7;
  }

  function cardHTML(post) {
    const newBadge = isNew(post.date) ? `<span class="stamp-new">Nouveau</span>` : '';
    const dateLabel = new Date(post.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

    let media;
    if (post.type === 'video') {
      const videoRef = post.youtube ? `yt:${post.youtube}` : `${base}${post.video}`;
      media = `<div class="post-media" data-video="${videoRef}">
                 <img src="${base}${post.thumbnail}" alt="${post.title}" loading="lazy">
                 <span class="play"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="26" fill="#F4C430"/><path d="M21 16l16 10-16 10V16Z" fill="#241C15"/></svg></span>
               </div>`;
    } else {
      media = `<div class="post-media"><img src="${base}${post.media}" alt="${post.title}" loading="lazy"></div>`;
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

  render(initialList);

  if (chipsWrap) {
    chipsWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-chip');
      if (!btn) return;
      chipsWrap.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const type = btn.dataset.filter;
      render(type === 'all' ? sorted : sorted.filter(p => p.type === type));
    });
  }

  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const media = lightbox.querySelector('.lightbox-media');

    grid.addEventListener('click', (e) => {
      const el = e.target.closest('[data-video]');
      if (!el) return;
      const src = el.dataset.video;
      media.innerHTML = src.startsWith('yt:')
        ? `<iframe src="https://www.youtube.com/embed/${src.slice(3)}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
        : `<video src="${src}" controls autoplay></video>`;
      lightbox.classList.add('open');
    });

    function closeLightbox() {
      lightbox.classList.remove('open');
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