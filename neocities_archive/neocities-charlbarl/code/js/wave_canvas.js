// wave_canvas.js — full-cycle bidirectional wave with smooth zero-crossing
(() => {
  'use strict';

  document.querySelectorAll('canvas[data-tile]').forEach(initWave);

  function initWave(c) {

    // ===== CONFIG ==========================================================
    const IMG_URL = c.dataset.tile;
    if (!IMG_URL) {
      console.error('[wave] canvas missing data-tile attribute');
      return;
    }

    const match = IMG_URL.match(/_(\d+)\.(png|webp|jpg|jpeg|avif)(\?.*)?$/i);
    if (!match) {
      throw new Error('[wave] Could not parse tile size from filename');
    }

    const TILE_W = Number(match[1]);
    const TILE_H = TILE_W;

    console.log('[wave] using tile:', IMG_URL, TILE_W, TILE_H);

    // Tunables
    let AMP      = 40;
    let AMP2     = 20;
    let WAVELEN  = 360;
    let WAVELEN2 = 140;
    let DURATION = 20000;
    let STRIP    = 2;
    let SHAPE_K  = 0.35;

    // ===== CANVAS ==========================================================
    const ctx = c.getContext('2d', { alpha: false });
    const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));

    function resize() {
      const w = Math.ceil(c.clientWidth * DPR);
      const h = Math.ceil(c.clientHeight * DPR);
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
      }
      ctx.imageSmoothingEnabled = false;
    }

    addEventListener('resize', resize, { passive: true });

    // ===== TILE LOADING ====================================================
    const tile = document.createElement('canvas');
    tile.width = TILE_W;
    tile.height = TILE_H;
    const tctx = tile.getContext('2d');

    const img = new Image();

    img.onload = () => {
      console.log('[wave] image loaded:', IMG_URL);
      tctx.drawImage(img, 0, 0);
      start();
    };

    img.onerror = () => {
      console.error('[wave] FAILED to load image:', IMG_URL);
    };

    img.src = IMG_URL + '?v=' + Date.now();

    // ===== ANIMATION =======================================================
    let startTime = 0;

    function start() {
      resize();
      startTime = performance.now();
      requestAnimationFrame(frame);
    }

    function shapedSignedSine(tNow) {
      const T = ((tNow - startTime) % DURATION) / DURATION * Math.PI * 2;
      const Sraw = Math.sin(T);
      const k = Math.max(0, Math.min(1, SHAPE_K));
      return (1 - k) * Sraw + k * Sraw * Sraw * Sraw;
    }

    function frame(tNow) {
      ctx.fillStyle = '#08031A';
      ctx.fillRect(0, 0, c.width, c.height);

      const pattern = ctx.createPattern(tile, 'repeat');
      const S = shapedSignedSine(tNow);

      const stripH = Math.max(2, Math.floor(STRIP * DPR));
      for (let y = 0; y < c.height; y += stripH) {
        const cy = y + stripH * 0.5;

        const phase1 = (cy / (WAVELEN * DPR)) * Math.PI * 2;
        const phase2 = (cy / (WAVELEN2 * DPR)) * Math.PI * 2;

        const offsetX =
          (Math.sin(phase1) * AMP * DPR +
           Math.sin(phase2 + 1.3) * AMP2 * DPR) * S;

        ctx.save();
        ctx.translate(offsetX, 0);
        ctx.fillStyle = pattern;
        ctx.fillRect(-offsetX, y, c.width + Math.abs(offsetX) * 2, stripH);
        ctx.restore();
      }

      requestAnimationFrame(frame);
    }

    // ===== DEVTOOLS ========================================================
    window.WAVE_BG = {
      set amp(v)        { AMP = +v; },
      set amp2(v)       { AMP2 = +v; },
      set wavelength(v) { WAVELEN = +v; },
      set wavelength2(v){ WAVELEN2 = +v; },
      set duration(v)   { DURATION = +v; },
      set strip(v)      { STRIP = Math.max(2, +v); },
      set shapeK(v)     { SHAPE_K = Math.max(0, Math.min(1, +v)); }
    };
  }

})();

     