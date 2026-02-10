/* walkers.js — people walking with cameras, ONE AT A TIME, alternating */
(() => {
  'use strict';

  /** ================== CONFIG ================== */
  const CONFIG = {
    BASE_PATH: '/assets/images/walkers/',
    RESPAWN_MARGIN: 500,
    MAX_DT: 0.05,
    AUTOSTART: true,
    PAUSE_HIDDEN: true,
    WALK_SPEED: [60, 140],
    WALK_BOB_AMP: [2, 4],
    WALK_BOB_RATE: [0.6, 1.2],
    SHOOT_SPOTS: 2,
    SHOOT_SPOT_MARGIN: 0.25,
    FLASH_MS: 240,
    // Adjustable pause before the flash turns on (ms). 0 preserves previous behavior.
    FLASH_DELAY_MS: 400
  };

  const prefersReduced =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** ================== WALKERS ================== */
  const WALKERS = [
    {
      name: 'barl',
      rootRight: 'barl',
      width: 128,
      height: 128,
      frames: {
        walk:  { start: 0, end: 15, dur: 1000 },
        shoot: { start: 0, end: 4,  dur: 1000 }
      },
      walkSpeed: [80, 90],
      // flashDelayMs: 120
    },
    {
      name: 'charl',
      rootRight: 'charl',
      width: 128,
      height: 128,
      frames: {
        walk:  { start: 0, end: 15, dur: 800 },
        shoot: { start: 0, end: 4,  dur: 500 }
      }
      // flashDelayMs: 90
    }
  ];

  /** ================== Utils ================== */
  const rand  = (a,b) => a + Math.random() * (b - a);
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

  function ensureViewport() {
    let v = document.getElementById('viewport');
    if (!v) {
      v = document.createElement('div');
      v.id = 'viewport';
      Object.assign(v.style, {
        position: 'fixed',
        inset: '0',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: '10'
      });
      document.body.appendChild(v);
    }
    return v;
  }

  function bounds(el) {
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }

  /** ================== Walker ================== */
  class Walker {
    constructor(stage, spec, getBounds) {
      this.stage = stage;
      this.spec = spec;
      this.getBounds = getBounds;

      this.active = false;

      this.el = document.createElement('div');
      this.el.className = 'walker';
      this.el.style.display = 'none';

      this.img = document.createElement('img');
      this.img.width = spec.width;
      this.img.height = spec.height;

      this.flash = document.createElement('div');
      this.flash.className = 'flash';

      this.el.append(this.img, this.flash);
      stage.appendChild(this.el);

      this.walkSpeed = spec.walkSpeed || CONFIG.WALK_SPEED;
      this.bobAmp = rand(CONFIG.WALK_BOB_AMP[0], CONFIG.WALK_BOB_AMP[1]);
      this.bobRate = rand(CONFIG.WALK_BOB_RATE[0], CONFIG.WALK_BOB_RATE[1]);
      this.bobPhase = rand(0, Math.PI * 2);

      this.ready = Promise.resolve();
      this.shootEndTime = 0;
      this.state = 'walk';
      this.shootSpots = [];

      this._flashOnTimeoutId = null;
      this._flashOffTimeoutId = null;

      // Position state
      this.x = 0;
      this.yBase = 0;
      this.dir = 1;
    }

    _clearFlashTimers() {
      if (this._flashOnTimeoutId) {
        clearTimeout(this._flashOnTimeoutId);
        this._flashOnTimeoutId = null;
      }
      if (this._flashOffTimeoutId) {
        clearTimeout(this._flashOffTimeoutId);
        this._flashOffTimeoutId = null;
      }
    }

    _ensureFlashOff() {
      this.flash.classList.remove('is-on');
    }

    _applyPosition() {
      const b = this.getBounds();
      const y = clamp(this.yBase + Math.sin(this.bobPhase) * this.bobAmp, 0, b.h - this.spec.height);
      this.el.style.left = `${this.x | 0}px`;
      this.el.style.top  = `${y | 0}px`;
    }

    activate(dir) {
      this.dir = dir;
      // Set attribute so CSS can flip horizontally on leftward motion
      this.el.dataset.dir = String(dir);

      this.speed = rand(...this.walkSpeed) * this.dir;
      this.spawn();
      this.el.style.display = 'block';
      this.active = true;

      // Ensure we see the correct position immediately (before first RAF tick)
      this._applyPosition();
    }

    deactivate() {
      this.active = false;
      this.el.style.display = 'none';
      this._clearFlashTimers();
      this._ensureFlashOff();
    }

    spawn() {
      const b = this.getBounds();
      this.yBase = rand(20, b.h - this.spec.height - 20);
      this.x = this.dir > 0
        ? -CONFIG.RESPAWN_MARGIN - this.spec.width
        : b.w + CONFIG.RESPAWN_MARGIN + this.spec.width;

      this.bobPhase = rand(0, Math.PI * 2);
      this.state = 'walk';
      this.img.src = `${CONFIG.BASE_PATH}${this.spec.rootRight}_walk.gif`;

      // Shoot spots
      this.shootSpots = [];
      const leftEdge  = b.w * CONFIG.SHOOT_SPOT_MARGIN;
      const rightEdge = b.w * (1 - CONFIG.SHOOT_SPOT_MARGIN);
      for (let i = 0; i < CONFIG.SHOOT_SPOTS; i++) {
        this.shootSpots.push(rand(leftEdge, rightEdge));
      }
      this.shootSpots.sort((a, b) => a - b);

      this.shootEndTime = 0;

      // Reset flash state
      this._clearFlashTimers();
      this._ensureFlashOff();

      // Apply initial position so there is no “stuck at 0,0” frame
      this._applyPosition();
    }

    setState(state) {
      this.state = state;

      // Clear pending flash timers whenever state changes
      this._clearFlashTimers();

      if (state === 'shoot') {
        this.img.src = `${CONFIG.BASE_PATH}${this.spec.rootRight}_shoot.gif`;
        this.speed = 0;
        this.shootEndTime = performance.now() + this.spec.frames.shoot.dur;

        const delay = this.spec.flashDelayMs ?? CONFIG.FLASH_DELAY_MS ?? 0;

        this._flashOnTimeoutId = setTimeout(() => {
          this.flash.classList.add('is-on');
          this._flashOnTimeoutId = null;

          this._flashOffTimeoutId = setTimeout(() => {
            this.flash.classList.remove('is-on');
            this._flashOffTimeoutId = null;
          }, CONFIG.FLASH_MS);
        }, delay);

      } else {
        this.img.src = `${CONFIG.BASE_PATH}${this.spec.rootRight}_walk.gif`;
        this.speed = rand(...this.walkSpeed) * this.dir;
        this._ensureFlashOff();
      }
    }

    update(dt) {
      if (!this.active) return;

      const b = this.getBounds();
      const now = performance.now();

      // Shooting (paused movement)
      if (this.state === 'shoot') {
        if (now >= this.shootEndTime) {
          this.setState('walk');
        } else {
          return;
        }
      }

      // Walking
      this.x += this.speed * dt;
      this.bobPhase += dt * 2 * Math.PI * this.bobRate;
      this._applyPosition();

      // Shoot trigger
      if (this.state === 'walk' && this.shootSpots.length) {
        const spot = this.dir > 0 ? this.shootSpots[0] : this.shootSpots[this.shootSpots.length - 1];
        if ((this.dir > 0 && this.x >= spot) || (this.dir < 0 && this.x <= spot)) {
          this.setState('shoot');
          if (this.dir > 0) this.shootSpots.shift(); else this.shootSpots.pop();
        }
      }

      // Offscreen
      if ((this.dir > 0 && this.x >  b.w + CONFIG.RESPAWN_MARGIN) ||
          (this.dir < 0 && this.x < -CONFIG.RESPAWN_MARGIN)) {
        this.deactivate();
        this.onTraverseEnd?.();
      }
    }
  }

  /** ================== Animator ================== */
  class Animator {
    constructor(stage) {
      this.stage = stage;
      this.walkers = [];
      this.index = 0;
      this.running = false;

      WALKERS.forEach(spec => {
        const w = new Walker(stage, spec, () => bounds(stage));
        w.onTraverseEnd = () => this.next();
        this.walkers.push(w);
      });

      this.ready = Promise.resolve();
    }

    start() {
      if (this.running) return;
      this.running = true;

      let last = performance.now();
      this.activateCurrent();

      const loop = (now) => {
        if (!this.running) return;
        const dt = Math.min(CONFIG.MAX_DT, (now - last) / 1000);
        last = now;
        this.walkers.forEach(w => w.update(dt));
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    activateCurrent() {
      const w = this.walkers[this.index];
      const dir = this.index % 2 === 0 ? 1 : -1;
      w.activate(dir);
    }

    next() {
      this.index = (this.index + 1) % this.walkers.length;
      this.activateCurrent();
    }

    stop() { this.running = false; }
  }

  /** ================== Boot ================== */
  function init() {
    const stage = ensureViewport();
    const anim = new Animator(stage);

    anim.ready.then(() => {
      if (CONFIG.AUTOSTART && !prefersReduced) anim.start();
      window.walkAnimator = anim;
    });

    if (CONFIG.PAUSE_HIDDEN) {
      document.addEventListener('visibilitychange', () => {
        document.hidden ? anim.stop() : anim.start();
      });
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init, { once: true })
    : init();

})();