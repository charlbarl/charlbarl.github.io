// wave_canvas_vertical.js — vertical-only wave animation
(() => {
  'use strict';

  document.querySelectorAll('canvas[data-tile]').forEach(initWave);

  function initWave(c) {
    const IMG_URL = c.dataset.tile;
    if (!IMG_URL) return;

    const match = IMG_URL.match(/_(\d+)\.(png|webp|jpg|jpeg|avif)(\?.*)?$/i);
    if (!match) throw new Error('[wave] Could not parse tile size');

    const TILE_W = Number(match[1]);
    const TILE_H = TILE_W;

    let AMP = 40, AMP2 = 10;
    let WAVELEN = 200, WAVELEN2 = 30;
    let DURATION = 20000;
    let STRIP = 1;
    let SHAPE_K = 0.2;

    const ctx = c.getContext('2d', { alpha: false });
    const DPR = Math.max(1, Math.floor(devicePixelRatio || 1));

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

    const tile = document.createElement('canvas');
    tile.width = TILE_W;
    tile.height = TILE_H;
    const tctx = tile.getContext('2d');

    const img = new Image();
    img.onload = () => {
      tctx.drawImage(img, 0, 0);
      start();
    };
    img.src = IMG_URL + '?v=' + Date.now();

    let startTime = 0;
    function start() {
      resize();
      startTime = performance.now();
      requestAnimationFrame(frame);
    }

    function shapedSignedSine(t) {
      const T = ((t - startTime) % DURATION) / DURATION * Math.PI * 2;
      const s = Math.sin(T);
      return (1 - SHAPE_K) * s + SHAPE_K * s * s * s;
    }

    function frame(t) {
      ctx.fillStyle = '#08031A';
      ctx.fillRect(0, 0, c.width, c.height);

      const pattern = ctx.createPattern(tile, 'repeat');
      const S = shapedSignedSine(t);
      const stripW = Math.max(2, Math.floor(STRIP * DPR));

      for (let x = 0; x < c.width; x += stripW) {
        const cx = x + stripW * 0.5;

        const phase1 = (cx / (WAVELEN * DPR)) * Math.PI * 2;
        const phase2 = (cx / (WAVELEN2 * DPR)) * Math.PI * 2;

        const offsetY =
          (Math.sin(phase1) * AMP * DPR +
           Math.sin(phase2 + 1.3) * AMP2 * DPR) * S;

        ctx.save();
        ctx.translate(0, offsetY);
        ctx.fillStyle = pattern;
        ctx.fillRect(x, -offsetY, stripW, c.height + Math.abs(offsetY) * 2);
        ctx.restore();
      }

      requestAnimationFrame(frame);
    }

    window.WAVE_BG = {
      set amp(v) { AMP = +v; },
      set amp2(v) { AMP2 = +v; },
      set wavelength(v) { WAVELEN = +v; },
      set wavelength2(v) { WAVELEN2 = +v; },
      set duration(v) { DURATION = +v; },
      set strip(v) { STRIP = Math.max(2, +v); },
      set shapeK(v) { SHAPE_K = Math.max(0, Math.min(1, +v)); }
    };
  }
})();
