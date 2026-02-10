/* /js/now-sidebar.js */
(function () {
  'use strict';

  // Run after DOM is ready (covers missing/defer edge cases)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function init() {
    // Works with or without the legacy #now-sidebar wrapper
    const root =
      document.getElementById('now-sidebar') || // legacy wrapper (if present)
      document.getElementById('leftSidebar') || // the <aside>
      (document.querySelector('#now-listening, #now-reading, #now-playing')?.parentElement) ||
      document.body;                             // absolute fallback

    // Allow overriding the data URL via a global if you want (e.g., set window.NOW_DATA_URL in the page)
    const url = (typeof window !== 'undefined' && window.NOW_DATA_URL) || '/code/data/now.json';
    const cacheBust = `cb=${Date.now()}`;

    fetch(`${url}?${cacheBust}`, { cache: 'no-store' })
      .then(async (r) => {
        const text = await r.text().catch(() => '');
        if (!r.ok) {
          console.error(`[now] HTTP ${r.status} for ${url}`, text.slice(0, 300));
          throw new Error(`HTTP ${r.status}`);
        }
        // Guard: if we received HTML, it's likely a 404 page; bail early
        if (/^\s*</.test(text)) {
          console.error('[now] Expected JSON but got HTML. Check NOW_DATA_URL/path and hosting rewrites.', text.slice(0, 300));
          throw new Error('HTML instead of JSON');
        }
        return JSON.parse(text);
      })
      .then(render)
      .catch(err => {
        console.error('[now] Failed to load now.json:', err);
        root.insertAdjacentHTML('beforeend', `<div class="box">Could not load updates <span class="subtle">(path?)</span>.</div>`);
      });
  }

  function render(data) {
    const { listening, reading, playing } = normalize(data);
    if (listening.length) renderListening(listening);
    if (reading.length)   renderReading(reading);
    if (playing.length)   renderPlaying(playing);
  }

  /**
   * Accept both:
   *  - Legacy flat:  { listening: {...}, reading: {...}, playing: {...} }
   *  - New shaped:   { current: { listening:[...], reading:[...], playing:[...] }, archive:[...] }
   */
  function normalize(d) {
    if (d && d.current) {
      const cur = d.current || {};
      return {
        listening: Array.isArray(cur.listening) ? cur.listening : (cur.listening ? [cur.listening] : []),
        reading:   Array.isArray(cur.reading)   ? cur.reading   : (cur.reading   ? [cur.reading]   : []),
        playing:   Array.isArray(cur.playing)   ? cur.playing   : (cur.playing   ? [cur.playing]   : []),
      };
    }
    return {
      listening: d && d.listening ? [d.listening] : [],
      reading:   d && d.reading   ? [d.reading]   : [],
      playing:   d && d.playing   ? [d.playing]   : [],
    };
  }

  // ===== RENDERERS ===================================================================

  function renderListening(items) {
  const el = document.getElementById('now-listening');
  if (!el) return;

  for (const d of items) {
    const year   = d.year ? ` (${esc(String(d.year))})` : '';
    const album  = typeof d.album  === 'string' ? d.album.trim()  : '';
    const artist = typeof d.artist === 'string' ? d.artist.trim() : '';
    const fav    = typeof d.favoriteSong === 'string' ? d.favoriteSong.trim() : '';

    // Title line: album (preferred) or artist, plus (year)
    const titleText = album ? `${esc(album)}${year}` : `${esc(artist)}${year}`;

    // Subline: Artist + (optional) inline favorite
    const subText = [
      esc(artist),
      fav ? `<span class="fav-inline" aria-label="Favorite track"><span class="star" aria-hidden="true">★</span> ${esc(fav)}</span>` : ''
    ].filter(Boolean).join('');

    // Accessible label prioritizes album and artist
    const aria = album ? `${album} — ${artist}` : `${artist}${fav ? ' — ' + fav : ''}`;

    // ===== Card container =====
    const figure = document.createElement('figure');
    figure.className = 'now-card';
    figure.setAttribute('aria-label', aria || 'Listening item');

    // --- Always show cover if available (even when an embed exists) ---
    if (d.cover) {
      const mediaNode = coverNode(d.cover, aria || 'cover', d.url);
      if (mediaNode) figure.appendChild(mediaNode);
    }

    // --- Overlay/meta ---
    const figcap = document.createElement('figcaption');
    figcap.className = 'now-overlay';

    const meta = document.createElement('div');
    meta.className = 'meta';

    const pTitle = document.createElement('p');
    pTitle.className = 'title';
    // Title uses innerHTML because we already escaped album/artist/year above
    pTitle.innerHTML = titleText;
    meta.appendChild(pTitle);

    if (artist) {
      const pSub = document.createElement('p');
      pSub.className = 'sub';
      pSub.innerHTML = subText; // contains the ★ span, already escaped where needed
      meta.appendChild(pSub);
    }

    figcap.appendChild(meta);
    figure.appendChild(figcap);

    // Append the card to the section
    el.appendChild(figure);

    // Optional description under the card
    if (d.description) {
      const p = document.createElement('p');
      p.className = 'now-desc';
      p.textContent = d.description;
      el.appendChild(p);
    }

    // --- Append embed (if present) below the card ---
    if (d.embed) {
      const iframe = makeEmbedIframe(d.embed);
      if (iframe) el.appendChild(iframe);
    }
  }
}

  function renderReading(items) {
    const el = document.getElementById('now-reading');
    if (!el) return;

    for (const d of items) {
      const title  = typeof d.title  === 'string' ? d.title.trim()  : '';
      const author = typeof d.author === 'string' ? d.author.trim() : '';
      const year   = d.year ? ` (${esc(String(d.year))})` : '';

      const figure = document.createElement('figure');
      figure.className = 'now-card';
      figure.setAttribute('aria-label', `${title} — ${author}`);

      // Hide cover when embed exists? Toggle if desired.
      const hasEmbed = !!d.embed;
      if (!hasEmbed && d.cover) {
        const mediaNode = coverNode(d.cover, `${title} — ${author}`, d.url);
        if (mediaNode) figure.appendChild(mediaNode);
      }

      const figcap = document.createElement('figcaption');
      figcap.className = 'now-overlay';

      const meta = document.createElement('div');
      meta.className = 'meta';

      const pTitle = document.createElement('p');
      pTitle.className = 'title';
      pTitle.textContent = title + (d.year ? ` (${d.year})` : '');

      meta.appendChild(pTitle);

      if (author) {
        const pSub = document.createElement('p');
        pSub.className = 'sub';
        pSub.textContent = author;
        meta.appendChild(pSub);
      }

      figcap.appendChild(meta);
      figure.appendChild(figcap);
      el.appendChild(figure);

      if (d.description) {
        const p = document.createElement('p');
        p.className = 'now-desc';
        p.textContent = d.description;
        el.appendChild(p);
      }

      if (d.embed) {
        const iframe = makeEmbedIframe(d.embed);
        if (iframe) el.appendChild(iframe);
      }
    }
  }

  function renderPlaying(items) {
    const el = document.getElementById('now-playing');
    if (!el) return;

    for (const d of items) {
      const title = typeof d.title === 'string' ? d.title.trim() : '';

      const figure = document.createElement('figure');
      figure.className = 'now-card';
      figure.setAttribute('aria-label', `${title} cover`);

      const hasEmbed = !!d.embed;
      if (!hasEmbed && d.cover) {
        const mediaNode = coverNode(d.cover, `${title} cover`, d.url);
        if (mediaNode) figure.appendChild(mediaNode);
      }

      const figcap = document.createElement('figcaption');
      figcap.className = 'now-overlay';

      const meta = document.createElement('div');
      meta.className = 'meta';

      const pTitle = document.createElement('p');
      pTitle.className = 'title';
      pTitle.textContent = title + (d.year ? ` (${d.year})` : '');

      meta.appendChild(pTitle);
      figcap.appendChild(meta);
      figure.appendChild(figcap);
      el.appendChild(figure);

      if (d.description) {
        const p = document.createElement('p');
        p.className = 'now-desc';
        p.textContent = d.description;
        el.appendChild(p);
      }

      if (d.embed) {
        const iframe = makeEmbedIframe(d.embed);
        if (iframe) el.appendChild(iframe);
      }
    }
  }

  // ===== HELPERS =====================================================================

  function coverNode(src, alt, href) {
    if (!src) return null;

    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.className = 'now-img';

    if (!href) return img;

    const a = document.createElement('a');
    a.className = 'now-link';
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';

    a.appendChild(img);

    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = alt || '';
    a.appendChild(sr);

    return a;
  }

  /**
   * Create and return an <iframe> element for supported embeds.
   * Supported: bandcamp (trackId), youtube (id), soundcloud (url)
   */
  function makeEmbedIframe(e) {
    if (!e || !e.type) return null;

    // Bandcamp (track)
    if (e.type === 'bandcamp' && e.trackId) {
      const bg   = String(e.bgcol  || 'ffffff').replace('#','');
      const link = String(e.linkcol || '333333').replace('#','');
      const src  = `https://bandcamp.com/EmbeddedPlayer/track=${encodeURIComponent(e.trackId)}/size=small/bgcol=${bg}/linkcol=${link}/transparent=true/`;
      const iframe = document.createElement('iframe');
      iframe.className = 'now-embed now-embed--bc';
      iframe.src = src;
      iframe.seamless = true;
      iframe.loading = 'lazy';
      iframe.title = 'Bandcamp player';
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.setAttribute('allow', 'autoplay');
      iframe.style.width = '92%';
      iframe.style.border = '0';
      // height is typically controlled in CSS (e.g., .now-embed--bc)
      return iframe;
    }

    // YouTube (compact)
    if (e.type === 'youtube' && e.id) {
      const src = `https://www.youtube.com/embed/${encodeURIComponent(e.id)}?modestbranding=1&rel=0&playsinline=1`;
      const iframe = document.createElement('iframe');
      iframe.className = 'now-embed now-embed--yt';
      iframe.src = src;
      iframe.loading = 'lazy';
      iframe.title = 'YouTube player';
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.allowFullscreen = true;
      iframe.style.width = '95%';
      iframe.style.height='60px';
      iframe.style.border = '0';
      return iframe;
    }

    // SoundCloud (track/playlist/set)
    if (e.type === 'soundcloud' && e.url) {
      const params = new URLSearchParams({
        url: e.url, // full SoundCloud resource URL
        color: e.color || '#ff7700',
        auto_play: e.auto_play ? 'true' : 'false',
        hide_related: e.hide_related ? 'true' : 'false',
        show_comments: e.show_comments === false ? 'false' : 'true',
        show_user: e.show_user === false ? 'false' : 'true',
        show_reposts: e.show_reposts ? 'true' : 'false',
        show_teaser: e.show_teaser === false ? 'false' : 'true',
        visual: 'false'
      });

      const src = `https://w.soundcloud.com/player/?${params.toString()}`;
      const iframe = document.createElement('iframe');
      iframe.className = `now-embed ${e.visual ? 'now-embed--sc-visual' : 'now-embed--sc-compact'}`;
      iframe.src = src;
      iframe.loading = 'lazy';
      iframe.title = 'SoundCloud player';
      iframe.setAttribute('allow', 'autoplay');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.style.width = '92%';
      iframe.style.height='80px';
      iframe.style.border = '0';
      // Height is controlled in CSS via .now-embed--sc-*
      return iframe;
    }

    // Optional passthrough: raw iframe HTML
    if (e.type === 'bandcamp_iframe' && e.html) {
      // Create a wrapper and parse, then return the first iframe if present.
      const wrapper = document.createElement('div');
      wrapper.innerHTML = e.html;
      const iframe = wrapper.querySelector('iframe');
      return iframe || null;
    }

    return null;
  }

  // Proper HTML-escape for **text** we inject (not for URLs we set as attributes)
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();