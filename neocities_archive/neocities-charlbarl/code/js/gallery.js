document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const gallery = document.getElementById('gallery');
  const lightbox = document.getElementById('lightbox');
  const imgEl = document.getElementById('lightboxImage');
  const captionEl = document.getElementById('lightboxCaption');
  const btnClose = document.getElementById('lbClose');
  const btnPrev = document.getElementById('lbPrev');
  const btnNext = document.getElementById('lbNext');
  const filterLinks = document.querySelectorAll('[data-filter]');


  let currentIndex = 0;
  let lastFocus = null;

  /* -------------------------
     Photo data
     Keep all images in the gallery
  ------------------------- */
  const photos = [
    { src: 'mexico4023', alt: 'Cancun Beach with Umbrellas', tags: ['nature','favorites','film'] },
    { src: 'maybw007', alt: 'Black and White Walking Path', tags: ['nature','favorites','bw','film'] },
    { src: 'dig-birds1', alt: 'Bridge Birds', tags: ['nature'] },
    { src: 'dig-lightning1', alt: 'Bridge Lightning', tags: ['nature'] },
    { src: 'dig-dad', alt: 'Dad on the Deck', tags: ['people'] },
    { src: 'may3004', alt: 'Rainy Windshield', tags: ['film','nature'] },
    { src: 'mexico3032', alt: 'Pool Party', tags: ['film','people','favorites'] },
    { src: 'mayagain2009', alt: 'Endless Mountains, PA', tags: ['nature','film'] },
    { src: 'roll2026', alt: 'Liberty Place', tags: ['film'] },
    { src: 'roll3044', alt: 'Subway Friend', tags: ['people','film','favorites'] },
    { src: 'pony135026', alt: 'Kodak Pony Double Exposure', tags: ['nature','film'] },
    { src: 'maybw069', alt: 'Brandywine Creek', tags: ['nature','bw','film'] },
    { src: 'may2071', alt: 'Winterthur Flower', tags: ['nature','film'] },
    { src: 'monastery028', alt: 'Monastery', tags: ['nature','film','favorites'] },
    { src: 'roll3053', alt: 'Sky Over the House', tags: ['nature','film'] },
    { src: 'roll4062', alt: 'Black and White Bridge', tags: ['bw','film'] },
    { src: 'monastery002', alt: 'Monastery Concert', tags: ['people','film'] },
    { src: 'maybw057', alt: 'Friend on Stairs', tags: ['people','bw'] },
    { src: 'dig-moon2', alt: 'Full Moon - DSLR', tags: ['nature'] },
    { src: 'julybeach1030', alt: 'Beach Bar Flowers', tags: ['nature', 'film'  ] },
    { src: 'roll2033', alt: 'Friends in Philly', tags: ['film', 'people'  ] },
    { src: 'mexico2028', alt: 'Elevator Mirror', tags: ['people', 'film', 'favorites'  ] },
    { src: 'mexico3026', alt: 'Pool Party 2', tags: ['people', 'film'  ] },
    { src: 'mayagain022', alt: 'Fishing with Family', tags: ['film', 'people', 'nature'  ] },
    { src: 'roll2012', alt: 'Gymnastics', tags: ['people', 'film'  ] },
    { src: 'stacked-andromeda', alt: 'Andromeda Attempt 1', tags: ['nature', 'bw', 'favorites'  ] },
    { src: 'roll2029', alt: 'Rittenhouse Square Flowers', tags: ['film', 'nature'  ] },
    { src: 'roll4070', alt: 'B&W Wheat', tags: ['bw', 'film', 'nature', 'favorites'  ] },
    { src: 'pony135012', alt: 'Neighborhood by Pony', tags: ['film', 'nature'  ] },
    { src: 'maybw054', alt: 'Brandywine Creek Crane', tags: ['bw', 'nature', 'film','favorites'  ] },
    { src: 'mexico2013', alt: 'Long Exposure Night Beach', tags: ['nature'  ] },
    { src: 'roll4068', alt: 'Dilapidated Barn', tags: ['film', 'bw', 'nature', 'favorites'  ] },
    { src: 'roll4071', alt: 'You Will Never Get To Heaven', tags: ['film', 'bw', 'nature' ] },
    { src: 'introroll1021', alt: 'Dark Potato', tags: ['film' ] },
    { src: 'julybeach1062', alt: 'Beach Bridge', tags: ['film'  ] },
    { src: 'roll4020', alt: 'Renaissance Faire', tags: ['film', 'people', 'favorites'  ] },
  ];

  /* -------------------------
     Build gallery dynamically
  ------------------------- */
  function buildGallery() {
    gallery.innerHTML = ''; // clear old items
    photos.forEach(photo => {
      const figure = document.createElement('figure');
      const btn = document.createElement('button');
      btn.className = 'thumb';
      btn.type = 'button';
      btn.dataset.tags = photo.tags.join(' ');

      const img = document.createElement('img');
      img.className = 'thumb';
      img.src = `assets/images/photo/${photo.src}-thb.jpg`; // make sure your image paths match
      img.alt = photo.alt;

      btn.appendChild(img);
      figure.appendChild(btn);
      gallery.appendChild(figure);
      console.log(`Loading image: assets/images/photo/${photo.src}-thb.jpg`);
    });
  }

  buildGallery();

  /* -------------------------
     Helpers
  ------------------------- */
  const isVisible = el => el.offsetParent !== null;

  const getVisibleButtons = () =>
    Array.from(gallery.querySelectorAll('button.thumb'))
      .filter(btn => isVisible(btn.closest('figure')));

  const deriveFullSrc = src =>
    src.replace(/[-_]thb\.jpg$/i, '.jpg');

  function setImage(index) {
    const items = getVisibleButtons();
    if (!items.length) return;

    currentIndex = (index + items.length) % items.length;
    const img = items[currentIndex].querySelector('img');

    imgEl.src = deriveFullSrc(img.src);
    imgEl.alt = img.alt || '';
    captionEl.textContent = img.alt || '';
  }

  /* -------------------------
     Lightbox
  ------------------------- */
  function openLightbox(btn) {
    const items = getVisibleButtons();
    const index = items.indexOf(btn);
    if (index === -1) return;

    lastFocus = document.activeElement;
    setImage(index);
    lightbox.removeAttribute('hidden');
    setTimeout(() => btnClose.focus(), 0);
    document.addEventListener('keydown', onKeydown);
  }

  function closeLightbox() {
    lightbox.setAttribute('hidden', '');
    document.removeEventListener('keydown', onKeydown);
    lastFocus?.focus?.();
  }

  const prevImage = () => setImage(currentIndex - 1);
  const nextImage = () => setImage(currentIndex + 1);

  function onKeydown(e) {
    if (lightbox.hasAttribute('hidden')) return;
    if (e.key === 'Escape') return closeLightbox();
    if (e.key === 'ArrowLeft') return prevImage();
    if (e.key === 'ArrowRight') return nextImage();
  }

  /* -------------------------
     Filtering
  ------------------------- */
  function filterGallery(tag) {
    gallery.querySelectorAll('figure').forEach(fig => {
      const btn = fig.querySelector('button.thumb');
      const tags = btn.dataset.tags?.split(/\s+/) || [];
      fig.style.display =
        tag === '*' || tags.includes(tag) ? '' : 'none';
    });

    if (!lightbox.hasAttribute('hidden')) {
      const items = getVisibleButtons();
      items.length ? setImage(0) : closeLightbox();
    }
  }

  filterLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      filterGallery(link.dataset.filter);
    });
  });

  /* -------------------------
     Gallery clicks
  ------------------------- */
  gallery.addEventListener('click', e => {
    const btn = e.target.closest('button.thumb');
    if (!btn || !isVisible(btn.closest('figure'))) return;
    openLightbox(btn);
  });

  btnClose.addEventListener('click', closeLightbox);
  btnPrev.addEventListener('click', prevImage);
  btnNext.addEventListener('click', nextImage);

  lightbox.addEventListener('click', e => {
    if (!e.target.closest('.lightbox-dialog')) closeLightbox();
  });
});
