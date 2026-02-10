// wave_canvas_bi.optimized.js — bidirectional wave (pattern + clipped strips, precomputed phases)
(() => {
  'use strict';

  // Initialize all canvases that declare a tile via data attribute
  document.querySelectorAll('canvas[data-tile]').forEach(initWave);

  function initWave(c) {
    const IMG_URL = c.dataset.tile;
    if (!IMG_URL) return;

    // Parse tile size from filename suffix: ..._NN.(png|webp|jpg|jpeg|avif)
    const m = IMG_URL.match(/_(\d+)\.(png|webp|jpg|jpeg|avif)(\?.*)?$/i);
    if (!m) {
      console.error('[wave] Could not parse tile size from', IMG_URL);
      return;
    }

    const TILE_W = Number(m[1]);
    const TILE_H = TILE_W; // assume square tile

    // ----- Tunables (runtime adjustable via window.WAVE_BG setters) -----
    let AMP_X = 50;        // horizontal amplitude (CSS px @ DPR=1)
    let AMP_Y = 30;        // vertical amplitude
    let WAVELEN_X = 120;   // horizontal wavelength (CSS px)
    let WAVELEN_Y = 180;   // vertical wavelength (CSS px)
    let DURATION = 11000;  // ms per full cycle
    let STRIP = 2;         // strip thickness (CSS px; scaled by DPR)
    let SHAPE_K = 0;    // 0=sine, 1=cubic-shaped sine
    const BG_COLOR = '#08031A';

    // ----- Canvas context & DPR -----
    const ctx = c.getContext('2d', { alpha: false });
    let DPR = Math.max(1, window.devicePixelRatio || 1);

    // Tile canvas & pattern (built once after image load)
    const tile = document.createElement('canvas');
    tile.width = TILE_W;
    tile.height = TILE_H;
    const tctx = tile.getContext('2d', { alpha: false });
    tctx.imageSmoothingEnabled = true;

    let pattern = null;
    function buildPattern() {
      pattern = ctx.createPattern(tile, 'repeat');
    }

    // Animation state
    let startTime = 0;
    let rafId = 0;

    // Strip & phase tables (rebuilt on resize / param changes)
    let stripH = 2;     // device pixels
    let stripW = 2;     // device pixels
    let denomX = 1;     // device pixels per 2π horizontally
    let denomY = 1;     // device pixels per 2π vertically
    let rowCount = 0;
    let colCount = 0;
    let sinRows = [];   // precomputed sin(phase) for each horizontal strip center
    let sinCols = [];   // precomputed sin(phase + phaseShift) for each vertical strip center

    const V_PHASE_SHIFT = 1.7; // keeps passes visually distinct

    function rebuildPhaseTables() {
      stripH = Math.max(2, Math.floor(STRIP * DPR));
      stripW = Math.max(2, Math.floor(STRIP * DPR));

      denomX = Math.max(1, Math.floor(WAVELEN_X * DPR));
      denomY = Math.max(1, Math.floor(WAVELEN_Y * DPR));

      rowCount = Math.ceil(c.height / stripH);
      colCount = Math.ceil(c.width  / stripW);

      sinRows = new Array(rowCount);
      for (let i = 0; i < rowCount; i++) {
        const y = i * stripH + stripH * 0.5;
        const phase = (y / denomX) * Math.PI * 2;
        sinRows[i] = Math.sin(phase);
      }

      sinCols = new Array(colCount);
      for (let i = 0; i < colCount; i++) {
        const x = i * stripW + stripW * 0.5;
        const phase = (x / denomY) * Math.PI * 2 + V_PHASE_SHIFT;
        sinCols[i] = Math.sin(phase);
      }
    }

    function resize() {
      const prevW = c.width;
      const prevH = c.height;

      DPR = Math.max(1, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(c.clientWidth  * DPR));
      const h = Math.max(1, Math.round(c.clientHeight * DPR));

      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
      }

      // (Optional) preserve pattern; not DPR-dependent (tile pixels), so leave as-is
      ctx.imageSmoothingEnabled = true;

      // Recompute tables whenever dimensions or DPR change
      if (c.width !== prevW || c.height !== prevH) {
        rebuildPhaseTables();
      } else {
        // Even if size is same, DPR or STRIP/WAVELEN may have changed
        rebuildPhaseTables();
      }
    }
    addEventListener('resize', resize, { passive: true });

    const img = new Image();
    img.onload = () => {
      tctx.clearRect(0, 0, TILE_W, TILE_H);
      tctx.drawImage(img, 0, 0, TILE_W, TILE_H);
      buildPattern();
      start();
    };
    // Cache-bust once to avoid stale copies during development
    img.src = IMG_URL + (IMG_URL.includes('?') ? '&' : '?') + 'v=' + Date.now();

    function start() {
      resize();
      startTime = performance.now();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(frame);
    }

    function shapedSignedSine(t) {
      // A time-shaped sine wave: blend pure sine and cubic-shaped sine
      const T = ((t - startTime) % DURATION) / DURATION * Math.PI * 2;
      const s = Math.sin(T);
      return (1 - SHAPE_K) * s + SHAPE_K * s * s * s;
    }

    function frame(t) {
      // Clear background
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, c.width, c.height);

      if (!pattern) {
        rafId = requestAnimationFrame(frame);
        return;
      }

      // Time term (multiplies all spatial sines)
      const S = shapedSignedSine(t);

      // Use pattern once per frame
      ctx.fillStyle = pattern;

      // ===== PASS 1: Horizontal strips (shift in X) — clipped to row =====
      for (let i = 0, y = 0; i < rowCount; i++, y += stripH) {
        const offsetX = sinRows[i] * AMP_X * DPR * S;

        ctx.save();
        // Clip row
        ctx.beginPath();
        ctx.rect(0, y, c.width, stripH);
        ctx.clip();

        // Translate horizontally and paint a huge rect to guarantee coverage
        ctx.setTransform(1, 0, 0, 1, offsetX, 0);
        ctx.fillRect(-c.width, 0, c.width * 3, c.height);

        ctx.restore();
      }

      // ===== PASS 2: Vertical strips (shift in Y) — clipped to column =====
      for (let i = 0, x = 0; i < colCount; i++, x += stripW) {
        const offsetY = sinCols[i] * AMP_Y * DPR * S;

        ctx.save();
        // Clip column
        ctx.beginPath();
        ctx.rect(x, 0, stripW, c.height);
        ctx.clip();

        // Translate vertically and paint a huge rect to guarantee coverage
        ctx.setTransform(1, 0, 0, 1, 0, offsetY);
        ctx.fillRect(0, -c.height, c.width, c.height * 3);

        ctx.restore();
      }

      // Restore identity for any subsequent drawing
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      rafId = requestAnimationFrame(frame);
    }

    // Expose simple runtime tuning for the last-initialized canvas
    const api = {
      // amplitudes
      set amp(v)     { AMP_X = +v; },
      set amp2(v)    { AMP_Y = +v; },
      // wavelengths (trigger table rebuild)
      set wavelength(v)  { WAVELEN_X = +v; rebuildPhaseTables(); },
      set wavelength2(v) { WAVELEN_Y = +v; rebuildPhaseTables(); },
      // cycle timing & shape
      set duration(v) { DURATION = Math.max(16, +v); },
      set shapeK(v)   { SHAPE_K = Math.max(0, Math.min(1, +v)); },
      // strip width (CSS px; min 1) — triggers table rebuild
      set strip(v)    { STRIP = Math.max(1, +v); rebuildPhaseTables(); },

      // helpers
      pause()  { cancelAnimationFrame(rafId); },
      resume() { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(frame); },
      resize
    };

    // Keep behavior: last initialized canvas is controlled by window.WAVE_BG
    window.WAVE_BG = api;
    // Also attach to the canvas for per-canvas debugging if needed
    c.WAVE_BG = api;
  }
})();