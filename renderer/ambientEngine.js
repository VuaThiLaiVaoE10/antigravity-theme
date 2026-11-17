/**
 * Antigravity Theme Studio - Ambient Engine
 * High-craft, subtle ambient canvas effects engine inspired by top creative repositories:
 * crnacura/AmbientCanvasBackgrounds, RainyDay.js, Canvas-Nest.
 *
 * Designed specifically for non-distracting IDE use:
 * - Default opacity: 0.30 - 0.40 (subtle, transparent, never obscures code/text).
 * - Calming breathing tempo (speed factor: 0.2x - 1.5x).
 * - Ultra lightweight 2D canvas drawing with requestAnimationFrame.
 *
 * Core Effects:
 * - 'aurora-mist': Slow Simplex noise glowing atmospheric mist drifting along edges.
 * - 'rain-glass': Realistic water droplets on frosted window glass slowly sliding down with subtle trails.
 * - 'constellation': Delicate floating dust particles connected by faint hairline lines (alpha 0.15).
 * - 'sunbeam-dust': Soft, out-of-focus bokeh circles drifting upwards like particles in warm sunlight.
 * - 'sakura-drift': Organic cherry blossom petals gently rotating and fluttering down on sin/cos curves.
 * - 'water-ripple': Subtle Lofi water wave concentric rings softly radiating from the corner.
 *
 * Compatible Legacy Effects:
 * - 'snow', 'fireflies', 'rain', 'breathing', 'none'.
 */

// ============================================================================
// 1. FAST COMPACT SIMPLEX NOISE 2D (Deterministic, 0 Allocations during frame)
// ============================================================================
class SimplexNoise2D {
  constructor(seed = 1337) {
    this.p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) this.p[i] = i;

    // LCG PRNG shuffle
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      const tmp = this.p[i];
      this.p[i] = this.p[j];
      this.p[j] = tmp;
    }

    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
    }
  }

  noise(xin, yin) {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;

    const gi0 = this.perm[ii + this.perm[jj]] % 8;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 8;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 8;

    const grad = (g, x, y) => {
      switch (g) {
        case 0: return x + y;
        case 1: return -x + y;
        case 2: return x - y;
        case 3: return -x - y;
        case 4: return x;
        case 5: return -x;
        case 6: return y;
        case 7: return -y;
        default: return 0;
      }
    };

    let n0 = 0.0, n1 = 0.0, n2 = 0.0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * grad(gi0, x0, y0); }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * grad(gi1, x1, y1); }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * grad(gi2, x2, y2); }

    return 70.0 * (n0 + n1 + n2);
  }
}

// ============================================================================
// 2. MAIN AMBIENT ENGINE CLASS
// ============================================================================
class AmbientEngine {
  /**
   * Effect metadata directory for UI preset pickers and tooltips.
   */
  static EFFECTS = {
    'none': {
      id: 'none',
      name: 'Tĩnh',
      icon: '🚫',
      desc: 'Tắt hoàn toàn hiệu ứng canvas động'
    },
    'aurora-mist': {
      id: 'aurora-mist',
      name: 'Màn sương Bắc cực',
      icon: '🌫️',
      desc: 'Dải sương quang chậm chuyển màu êm dịu ở viền trên/dưới'
    },
    'rain-glass': {
      id: 'rain-glass',
      name: 'Mưa đọng trên kính',
      icon: '🌧️',
      desc: 'Giọt nước ngưng tụ trên mặt kính mờ trượt chậm để lại vệt nước ẩm'
    },
    'constellation': {
      id: 'constellation',
      name: 'Mạng chòm sao',
      icon: '🕸️',
      desc: 'Bụi hạt tinh tế kết nối bằng các sợi tơ siêu mảnh bay lượn lơ lửng'
    },
    'sunbeam-dust': {
      id: 'sunbeam-dust',
      name: 'Bụi nắng Lofi',
      icon: '☀️',
      desc: 'Các đốm bokeh mờ ấm áp bay lơ lửng ngược lên như bụi dưới ánh nắng'
    },
    'sakura-drift': {
      id: 'sakura-drift',
      name: 'Cánh hoa anh đào',
      icon: '🌸',
      desc: 'Cánh hoa bay lượn xoay 3D mềm mại theo nhịp sóng sin/cos'
    },
    'water-ripple': {
      id: 'water-ripple',
      name: 'Gợn sóng êm đềm',
      icon: '🌊',
      desc: 'Các vòng sóng đồng tâm nhẹ nhàng lan tỏa từ góc mặt hồ tĩnh'
    },
    'snow': {
      id: 'snow',
      name: 'Tuyết rơi nhẹ',
      icon: '❄️',
      desc: 'Bông tuyết trắng li ti rơi chậm'
    },
    'fireflies': {
      id: 'fireflies',
      name: 'Đom đóm ấm',
      icon: '✨',
      desc: 'Đom đóm vàng ấm lượn lờ phát sáng trong bóng tối'
    },
    'rain': {
      id: 'rain',
      name: 'Mưa rơi nhẹ',
      icon: '🌧️',
      desc: 'Mưa rơi thẳng đứng mỏng nhẹ'
    },
    'breathing': {
      id: 'breathing',
      name: 'Nhịp thở Parallax',
      icon: '🌌',
      desc: 'Ánh sáng nền thở nhịp chậm'
    }
  };

  /**
   * @param {HTMLCanvasElement|string} canvas - Canvas element or DOM selector
   * @param {Object} [options]
   * @param {string} [options.effect='aurora-mist'] - Initial effect name
   * @param {number} [options.opacity=0.35] - Layer opacity (0.0 to 1.0 or 0 to 100)
   * @param {number} [options.speed=1.0] - Speed factor (0.2x to 2.0x)
   * @param {Object} [options.themeColors] - Colors for dynamic harmonization
   */
  constructor(canvas, options = {}) {
    if (typeof canvas === 'string' && typeof document !== 'undefined') {
      this.canvas = document.querySelector(canvas);
    } else {
      this.canvas = canvas || null;
    }

    this.ctx = this.canvas && typeof this.canvas.getContext === 'function'
      ? this.canvas.getContext('2d')
      : null;

    this.effect = options.effect || 'aurora-mist';
    this.opacity = this._normalizeOpacity(options.opacity !== undefined ? options.opacity : 0.35);
    this.speed = this._normalizeSpeed(options.speed !== undefined ? options.speed : 1.0);

    this.themeColors = Object.assign({
      accent: '#60a5fa',
      accentSoft: '#38bdf8',
      paper: '#181825',
      ink: '#f1f5f9'
    }, options.themeColors || {});

    this.isRunning = false;
    this.animFrameId = null;
    this.lastTime = 0;
    this.time = 0;

    this.width = this.canvas ? (this.canvas.width || 800) : 800;
    this.height = this.canvas ? (this.canvas.height || 600) : 600;

    // Fast noise instance
    this.simplex = new SimplexNoise2D(2026);

    // Particle / system state containers
    this.particles = [];
    this.state = {};

    this._boundTick = this._tick.bind(this);

    if (this.canvas) {
      this._applyCanvasStyles();
      this.resize(this.canvas.clientWidth || this.canvas.width || 800,
                  this.canvas.clientHeight || this.canvas.height || 600);
      this._initEffectState();
    }
  }

  // ==========================================================================
  // PUBLIC CONTROLLER API
  // ==========================================================================

  /**
   * Set active ambient effect.
   * @param {string} name - e.g. 'aurora-mist', 'rain-glass', 'constellation', etc.
   */
  setEffect(name) {
    const valid = AmbientEngine.EFFECTS[name] ? name : (name === 'none' ? 'none' : 'aurora-mist');
    if (this.effect === valid) return;

    this.effect = valid;
    this._initEffectState();

    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }

    if (this.effect === 'none') {
      // Don't waste CPU when disabled
      if (this.isRunning) {
        this.stop();
      }
    } else if (!this.isRunning && this.canvas) {
      this.start();
    }
  }

  /**
   * Get current active effect name.
   */
  getEffect() {
    return this.effect;
  }

  /**
   * Set overall effect opacity (0.0 to 1.0 or percentage 0 to 100).
   * @param {number} val
   */
  setOpacity(val) {
    this.opacity = this._normalizeOpacity(val);
    this._applyCanvasStyles();
  }

  /**
   * Get current opacity (0.0 to 1.0).
   */
  getOpacity() {
    return this.opacity;
  }

  /**
   * Set movement speed factor (0.2x to 2.0x).
   * @param {number} val
   */
  setSpeed(val) {
    this.speed = this._normalizeSpeed(val);
  }

  /**
   * Get current speed multiplier.
   */
  getSpeed() {
    return this.speed;
  }

  /**
   * Update theme colorway.
   * @param {Object} colors - { accent, accentSoft, paper, ink }
   */
  setTheme(colors = {}) {
    Object.assign(this.themeColors, colors);
  }

  /**
   * Resize internal buffer to match display resolution and devicePixelRatio.
   * @param {number} w - Width in CSS pixels
   * @param {number} h - Height in CSS pixels
   */
  resize(w, h) {
    const cssW = Math.max(10, Math.floor(w || (this.canvas ? this.canvas.clientWidth : 800) || 800));
    const cssH = Math.max(10, Math.floor(h || (this.canvas ? this.canvas.clientHeight : 600) || 600));

    this.width = cssW;
    this.height = cssH;

    if (this.canvas) {
      if (this.canvas.width !== cssW) this.canvas.width = cssW;
      if (this.canvas.height !== cssH) this.canvas.height = cssH;
    }

    this._initEffectState();
  }

  /**
   * Start rendering loop.
   */
  start() {
    if (this.isRunning) return;
    if (this.effect === 'none') return;

    this.isRunning = true;
    this.lastTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (typeof requestAnimationFrame !== 'undefined') {
      this.animFrameId = requestAnimationFrame(this._boundTick);
    }
  }

  /**
   * Stop / Pause rendering loop.
   */
  stop() {
    this.isRunning = false;
    if (this.animFrameId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Destroy instance, clean up listeners and DOM references.
   */
  destroy() {
    this.stop();
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
    this.particles = [];
    this.state = {};
    this.canvas = null;
    this.ctx = null;
  }

  // ==========================================================================
  // PRIVATE HELPERS & STYLING
  // ==========================================================================

  _normalizeOpacity(val) {
    let num = Number(val);
    if (isNaN(num)) num = 0.35;
    if (num > 1.0) num = num / 100.0;
    return Math.max(0.0, Math.min(1.0, num));
  }

  _normalizeSpeed(val) {
    let num = Number(val);
    if (isNaN(num)) num = 1.0;
    return Math.max(0.1, Math.min(3.0, num));
  }

  _applyCanvasStyles() {
    if (!this.canvas || !this.canvas.style) return;
    // Keep canvas transparent and ensure GPU compositing layer
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.opacity = this.opacity.toString();
  }

  _parseColorRgb(hexOrRgb, fallback = [96, 165, 250]) {
    if (!hexOrRgb || typeof hexOrRgb !== 'string') return fallback;
    const clean = hexOrRgb.trim();
    if (clean.startsWith('#')) {
      const hex = clean.slice(1);
      if (hex.length === 3) {
        return [
          parseInt(hex[0] + hex[0], 16),
          parseInt(hex[1] + hex[1], 16),
          parseInt(hex[2] + hex[2], 16)
        ];
      } else if (hex.length >= 6) {
        return [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16)
        ];
      }
    } else if (clean.startsWith('rgb')) {
      const m = clean.match(/\d+/g);
      if (m && m.length >= 3) {
        return [parseInt(m[0], 10), parseInt(m[1], 10), parseInt(m[2], 10)];
      }
    }
    return fallback;
  }

  // ==========================================================================
  // EFFECT STATE INITIALIZERS
  // ==========================================================================

  _initEffectState() {
    this.particles = [];
    this.state = {};

    const w = this.width;
    const h = this.height;

    switch (this.effect) {
      case 'aurora-mist': {
        // Multi-layered wave ribbons
        this.state = {
          layers: [
            { edge: 'top', baseH: h * 0.28, freq: 0.0025, speed: 0.0004, colorOffset: 0.0, alpha: 0.18 },
            { edge: 'top', baseH: h * 0.20, freq: 0.0035, speed: 0.0006, colorOffset: 0.35, alpha: 0.14 },
            { edge: 'bottom', baseH: h * 0.24, freq: 0.0030, speed: 0.0005, colorOffset: 0.65, alpha: 0.16 },
            { edge: 'bottom', baseH: h * 0.16, freq: 0.0040, speed: 0.0007, colorOffset: 0.85, alpha: 0.12 }
          ]
        };
        break;
      }

      case 'rain-glass': {
        // Static condensation micro-droplets
        const microCount = Math.floor(Math.min(50, Math.max(25, (w * h) / 22000)));
        const microDrops = [];
        for (let i = 0; i < microCount; i++) {
          microDrops.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 1.8 + 1.2,
            alpha: Math.random() * 0.35 + 0.3
          });
        }

        // Dynamic sliding droplets with pause and condensation trail
        const slidingCount = Math.floor(Math.min(8, Math.max(4, w / 220)));
        const slidingDrops = [];
        for (let i = 0; i < slidingCount; i++) {
          slidingDrops.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 2.8 + 3.2,
            pauseTimer: Math.random() * 120 + 30, // Frames to wait before slide
            slideTimer: 0,
            slideSpeed: 0,
            trail: [] // Historical trail points { x, y, r, alpha }
          });
        }

        this.state = { microDrops, slidingDrops };
        break;
      }

      case 'constellation': {
        // Delicate floating dust particles connected by faint hairlines
        const count = Math.floor(Math.min(60, Math.max(28, (w * h) / 24000)));
        for (let i = 0; i < count; i++) {
          this.particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            r: Math.random() * 1.0 + 1.0,
            alpha: Math.random() * 0.4 + 0.4
          });
        }
        this.state = { maxDist: Math.min(130, Math.max(85, Math.min(w, h) * 0.28)) };
        break;
      }

      case 'sunbeam-dust': {
        // Soft out-of-focus bokeh circles drifting upwards like sun motes
        const count = Math.floor(Math.min(50, Math.max(25, (w * h) / 22000)));
        for (let i = 0; i < count; i++) {
          const depth = Math.random(); // 0 = far small, 1 = near large bokeh
          this.particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            depth: depth,
            r: depth > 0.75 ? (Math.random() * 8 + 8) : (Math.random() * 3 + 1.5),
            vy: -(0.18 + depth * 0.45),
            swayFreq: Math.random() * 0.02 + 0.01,
            swayAmp: Math.random() * 0.4 + 0.2,
            phase: Math.random() * Math.PI * 2,
            baseAlpha: depth > 0.75 ? (Math.random() * 0.12 + 0.05) : (Math.random() * 0.35 + 0.25)
          });
        }
        break;
      }

      case 'sakura-drift': {
        // Organic cherry blossom petals with 3D tumbling illusion
        const count = Math.floor(Math.min(36, Math.max(18, (w * h) / 28000)));
        for (let i = 0; i < count; i++) {
          this.particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            size: Math.random() * 6 + 7, // 7 to 13px
            vy: Math.random() * 0.5 + 0.45,
            swayPhase: Math.random() * Math.PI * 2,
            swayAmp: Math.random() * 1.2 + 0.6,
            angleZ: Math.random() * Math.PI * 2,
            spinZ: (Math.random() - 0.5) * 0.015,
            flipAngle: Math.random() * Math.PI * 2,
            flipSpeed: Math.random() * 0.02 + 0.012,
            colorVariant: Math.random()
          });
        }
        break;
      }

      case 'water-ripple': {
        // Concentric soft radiating ripples
        this.state = {
          ripples: [],
          nextSpawn: 30, // frames until next ripple birth
          primaryOrigin: { x: w * 0.15, y: h * 0.88 },
          secondaryOrigin: { x: w * 0.82, y: h * 0.78 }
        };
        // Seed initial ripple
        this.state.ripples.push({
          x: this.state.primaryOrigin.x,
          y: this.state.primaryOrigin.y,
          r: 20,
          maxR: Math.min(w, h) * 0.95,
          speed: 0.9,
          rings: [0, 16, 32]
        });
        break;
      }

      case 'snow': {
        const count = Math.floor(Math.min(55, Math.max(25, (w * h) / 24000)));
        for (let i = 0; i < count; i++) {
          this.particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 2.2 + 1.0,
            vy: Math.random() * 0.7 + 0.5,
            vx: (Math.random() - 0.5) * 0.3,
            phase: Math.random() * Math.PI * 2
          });
        }
        break;
      }

      case 'fireflies': {
        const count = Math.floor(Math.min(32, Math.max(16, (w * h) / 32000)));
        for (let i = 0; i < count; i++) {
          this.particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 2.0 + 1.5,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            pulseSpeed: Math.random() * 0.03 + 0.02,
            phase: Math.random() * Math.PI * 2
          });
        }
        break;
      }

      case 'rain': {
        const count = Math.floor(Math.min(65, Math.max(30, (w * h) / 20000)));
        for (let i = 0; i < count; i++) {
          this.particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            len: Math.random() * 12 + 8,
            vy: Math.random() * 5 + 7,
            alpha: Math.random() * 0.3 + 0.2
          });
        }
        break;
      }

      case 'breathing':
      case 'none':
      default:
        break;
    }
  }

  // ==========================================================================
  // MAIN RAF ANIMATION LOOP
  // ==========================================================================

  _tick(currentTime) {
    if (!this.isRunning) return;

    const now = currentTime || (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let dt = (now - (this.lastTime || now)) / 1000.0;
    this.lastTime = now;

    // Guard against giant delta jumps when waking from tab suspension
    if (dt > 0.1) dt = 0.033;
    if (dt <= 0) dt = 0.016;

    this.time += dt * this.speed;

    if (this.ctx && this.canvas && this.effect !== 'none') {
      this._renderFrame(dt);
    }

    if (this.isRunning && typeof requestAnimationFrame !== 'undefined') {
      this.animFrameId = requestAnimationFrame(this._boundTick);
    }
  }

  _renderFrame(dt) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    switch (this.effect) {
      case 'aurora-mist':
        this._renderAuroraMist(ctx, w, h);
        break;
      case 'rain-glass':
        this._renderRainGlass(ctx, w, h, dt);
        break;
      case 'constellation':
        this._renderConstellation(ctx, w, h);
        break;
      case 'sunbeam-dust':
        this._renderSunbeamDust(ctx, w, h);
        break;
      case 'sakura-drift':
        this._renderSakuraDrift(ctx, w, h);
        break;
      case 'water-ripple':
        this._renderWaterRipple(ctx, w, h);
        break;
      case 'snow':
        this._renderSnow(ctx, w, h);
        break;
      case 'fireflies':
        this._renderFireflies(ctx, w, h);
        break;
      case 'rain':
        this._renderRain(ctx, w, h);
        break;
      case 'breathing':
        this._renderBreathing(ctx, w, h);
        break;
      default:
        break;
    }
  }

  // ==========================================================================
  // EFFECT 1: AURORA MIST (Luminous atmospheric noise ribbons)
  // ==========================================================================

  _renderAuroraMist(ctx, w, h) {
    const layers = this.state.layers;
    if (!layers || layers.length === 0) return;

    const accentRgb = this._parseColorRgb(this.themeColors.accent, [96, 165, 250]);
    const stepX = Math.max(16, Math.floor(w / 45));
    const t = this.time;

    // Breath modulation (calm 10s cycle)
    const breath = 0.85 + 0.15 * Math.sin(t * 0.4);

    for (let li = 0; li < layers.length; li++) {
      const l = layers[li];
      const isTop = l.edge === 'top';
      const baseAlpha = l.alpha * breath;

      // Color tint shift per layer
      const r = Math.round(Math.min(255, accentRgb[0] * (0.8 + 0.2 * Math.sin(t * 0.2 + l.colorOffset))));
      const g = Math.round(Math.min(255, accentRgb[1] * (0.8 + 0.2 * Math.cos(t * 0.25 + l.colorOffset))));
      const b = Math.round(Math.min(255, accentRgb[2] * (0.9 + 0.1 * Math.sin(t * 0.15))));

      ctx.beginPath();
      if (isTop) {
        ctx.moveTo(0, 0);
      } else {
        ctx.moveTo(0, h);
      }

      for (let x = 0; x <= w + stepX; x += stepX) {
        // Multi-harmonic Simplex sampling
        const n1 = this.simplex.noise(x * l.freq, t * l.speed);
        const n2 = this.simplex.noise(x * l.freq * 2.1, t * l.speed * 1.7) * 0.5;
        const wave = (n1 + n2) / 1.5; // Normalized approx -1 to 1

        const curH = l.baseH + wave * (l.baseH * 0.45);
        const y = isTop ? curH : (h - curH);

        ctx.lineTo(x, y);
      }

      if (isTop) {
        ctx.lineTo(w, 0);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, 0, l.baseH * 1.5);
        grad.addColorStop(0.0, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 1.3})`);
        grad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.6})`);
        grad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, 0.0)`);
        ctx.fillStyle = grad;
      } else {
        ctx.lineTo(w, h);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, h, 0, h - l.baseH * 1.5);
        grad.addColorStop(0.0, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 1.3})`);
        grad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.6})`);
        grad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, 0.0)`);
        ctx.fillStyle = grad;
      }

      ctx.fill();
    }
  }

  // ==========================================================================
  // EFFECT 2: RAIN GLASS (RainyDay.js style window condensation & beads)
  // ==========================================================================

  _renderRainGlass(ctx, w, h, dt) {
    const { microDrops, slidingDrops } = this.state;
    if (!microDrops || !slidingDrops) return;

    // 1. Draw static micro condensation droplets
    for (let i = 0; i < microDrops.length; i++) {
      const d = microDrops[i];
      const r = d.r;

      // Dark refraction rim
      ctx.beginPath();
      ctx.arc(d.x, d.y + 0.4, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 0, 0, ${d.alpha * 0.28})`;
      ctx.fill();

      // Translucent bead body
      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${d.alpha * 0.2})`;
      ctx.fill();

      // Top specular highlight spot
      ctx.beginPath();
      ctx.arc(d.x - r * 0.35, d.y - r * 0.35, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${d.alpha * 0.75})`;
      ctx.fill();
    }

    // 2. Dynamic sliding droplets
    for (let i = 0; i < slidingDrops.length; i++) {
      const d = slidingDrops[i];

      // Staccato sliding physics: pause -> build surface tension -> slide -> halt
      if (d.pauseTimer > 0) {
        d.pauseTimer -= 1;
        d.slideSpeed = 0;
      } else {
        if (d.slideTimer <= 0) {
          // Begin sudden slide burst
          d.slideTimer = Math.floor(Math.random() * 25 + 15);
          d.slideSpeed = (Math.random() * 1.8 + 1.2) * this.speed;
        } else {
          d.slideTimer -= 1;
          d.y += d.slideSpeed;

          // Record wet trail point
          if (Math.random() < 0.4) {
            d.trail.push({
              x: d.x + (Math.random() - 0.5) * 1.5,
              y: d.y,
              r: d.r * 0.35,
              alpha: 0.4
            });
          }

          if (d.slideTimer <= 0) {
            // Re-enter pause state
            d.pauseTimer = Math.floor(Math.random() * 140 + 60);
          }
        }
      }

      // Draw condensation trail
      for (let ti = d.trail.length - 1; ti >= 0; ti--) {
        const tr = d.trail[ti];
        tr.alpha -= 0.002 * (dt / 0.016);
        if (tr.alpha <= 0) {
          d.trail.splice(ti, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${tr.alpha * 0.25})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(tr.x - tr.r * 0.3, tr.y - tr.r * 0.3, tr.r * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${tr.alpha * 0.6})`;
        ctx.fill();
      }

      // Render the main sliding droplet (authentic glass lens refraction)
      const r = d.r;

      // Drop shadow underneath
      ctx.beginPath();
      ctx.arc(d.x, d.y + 0.8, r * 1.05, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fill();

      // Droplet body
      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(230, 245, 255, 0.15)';
      ctx.fill();

      // Bottom refraction crescent
      ctx.beginPath();
      ctx.arc(d.x, d.y + r * 0.2, r * 0.65, 0, Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fill();

      // Specular bright pinprick highlight
      ctx.beginPath();
      ctx.arc(d.x - r * 0.35, d.y - r * 0.35, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fill();

      // Wrap around screen bottom
      if (d.y > h + 20) {
        d.y = -10;
        d.x = Math.random() * w;
        d.pauseTimer = Math.random() * 80 + 30;
        d.trail = [];
      }
    }
  }

  // ==========================================================================
  // EFFECT 3: CONSTELLATION (Canvas-Nest style hairline particle mesh)
  // ==========================================================================

  _renderConstellation(ctx, w, h) {
    const pts = this.particles;
    const maxDist = this.state.maxDist || 110;
    const maxDistSq = maxDist * maxDist;
    const count = pts.length;

    const accentRgb = this._parseColorRgb(this.themeColors.accent, [147, 197, 253]);

    // 1. Update positions
    for (let i = 0; i < count; i++) {
      const p = pts[i];
      p.x += p.vx * this.speed;
      p.y += p.vy * this.speed;

      // Wrap smoothly around canvas edges
      if (p.x < -10) p.x = w + 10;
      else if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      else if (p.y > h + 10) p.y = -10;
    }

    // 2. Draw connections (Hairlines, max alpha 0.15 strictly)
    ctx.lineWidth = 0.75;
    for (let i = 0; i < count; i++) {
      const p1 = pts[i];
      for (let j = i + 1; j < count; j++) {
        const p2 = pts[j];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        // Bounding box early cull before hypotenuse
        if (Math.abs(dx) > maxDist || Math.abs(dy) > maxDist) continue;

        const dSq = dx * dx + dy * dy;
        if (dSq < maxDistSq) {
          const dist = Math.sqrt(dSq);
          const lineAlpha = (1.0 - dist / maxDist) * 0.15; // Non-distracting hairline

          ctx.strokeStyle = `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${lineAlpha})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    // 3. Draw dust particles
    for (let i = 0; i < count; i++) {
      const p = pts[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${p.alpha})`;
      ctx.fill();
    }
  }

  // ==========================================================================
  // EFFECT 4: SUNBEAM DUST (Warm bokeh particles drifting upwards)
  // ==========================================================================

  _renderSunbeamDust(ctx, w, h) {
    const pts = this.particles;
    const t = this.time;

    // Optional faint ambient sunbeam ray from top-left (ultra subtle 0.02 alpha)
    const rayAlpha = 0.025 + 0.01 * Math.sin(t * 0.3);
    const rayGrad = ctx.createLinearGradient(0, 0, w * 0.7, h);
    rayGrad.addColorStop(0.0, `rgba(255, 245, 210, ${rayAlpha * 1.5})`);
    rayGrad.addColorStop(0.5, `rgba(255, 235, 180, ${rayAlpha * 0.8})`);
    rayGrad.addColorStop(1.0, 'rgba(255, 235, 180, 0.0)');
    ctx.fillStyle = rayGrad;
    ctx.fillRect(0, 0, w, h);

    // Warm bokeh circles drifting upwards
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];

      p.y += p.vy * this.speed;
      p.x += Math.sin(t * p.swayFreq + p.phase) * p.swayAmp * this.speed;

      // Wrap upwards
      if (p.y < -25) {
        p.y = h + 20;
        p.x = Math.random() * w;
      }

      // Shimmering alpha breathing
      const shimmer = 0.8 + 0.2 * Math.sin(t * 1.5 + p.phase);
      const alpha = p.baseAlpha * shimmer;

      if (p.depth > 0.75) {
        // Deep bokeh out-of-focus disc with radial falloff
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0.0, `rgba(255, 240, 200, ${alpha * 1.2})`);
        g.addColorStop(0.7, `rgba(255, 230, 180, ${alpha * 0.6})`);
        g.addColorStop(1.0, 'rgba(255, 230, 180, 0.0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Crisp sun mote
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 248, 220, ${alpha})`;
        ctx.fill();
      }
    }
  }

  // ==========================================================================
  // EFFECT 5: SAKURA DRIFT (Organic cherry petals tumbling in 3D)
  // ==========================================================================

  _renderSakuraDrift(ctx, w, h) {
    const petals = this.particles;
    const t = this.time;

    for (let i = 0; i < petals.length; i++) {
      const p = petals[i];

      // Aerodynamic motion: sway + sink
      p.y += p.vy * this.speed;
      p.swayPhase += 0.02 * this.speed;
      p.x += Math.sin(p.swayPhase) * p.swayAmp * this.speed;

      p.angleZ += p.spinZ * this.speed;
      p.flipAngle += p.flipSpeed * this.speed;

      // Wrap at bottom
      if (p.y > h + 25) {
        p.y = -20;
        p.x = Math.random() * w;
      }

      // 3D Tumbling transform: scale X by cos(flipAngle)
      const flipScale = Math.cos(p.flipAngle);
      const isUnderside = flipScale < 0;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angleZ);
      ctx.scale(Math.abs(flipScale) * 0.85 + 0.15, 1.0);

      const s = p.size;
      const alpha = 0.55;

      // Natural cherry petal dual-tone colors
      const petalGrad = ctx.createLinearGradient(0, -s, 0, s);
      if (isUnderside) {
        // Slightly deeper rose underside
        petalGrad.addColorStop(0.0, `rgba(244, 114, 182, ${alpha * 0.9})`);
        petalGrad.addColorStop(1.0, `rgba(251, 113, 133, ${alpha * 0.75})`);
      } else {
        // Soft delicate sakura blossom top
        petalGrad.addColorStop(0.0, `rgba(254, 205, 211, ${alpha})`);
        petalGrad.addColorStop(0.6, `rgba(249, 168, 212, ${alpha * 0.85})`);
        petalGrad.addColorStop(1.0, `rgba(244, 114, 182, ${alpha * 0.7})`);
      }

      // Organic curved petal contour with curved notch
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.75);
      // Left lobe
      ctx.bezierCurveTo(-s * 0.55, -s * 0.45, -s * 0.55, s * 0.35, 0, s * 0.75);
      // Right lobe
      ctx.bezierCurveTo(s * 0.55, s * 0.35, s * 0.55, -s * 0.45, 0, -s * 0.75);
      ctx.closePath();

      ctx.fillStyle = petalGrad;
      ctx.fill();

      ctx.restore();
    }
  }

  // ==========================================================================
  // EFFECT 6: WATER RIPPLE (Lofi concentric calm wave ripples)
  // ==========================================================================

  _renderWaterRipple(ctx, w, h) {
    const s = this.state;
    if (!s || !s.ripples) return;

    const accentRgb = this._parseColorRgb(this.themeColors.accent, [147, 197, 253]);

    // Ripple spawner
    s.nextSpawn -= 1 * this.speed;
    if (s.nextSpawn <= 0) {
      s.nextSpawn = Math.floor(Math.random() * 80 + 90); // 1.5 - 2.8s spacing
      const origin = Math.random() < 0.7 ? s.primaryOrigin : s.secondaryOrigin;
      s.ripples.push({
        x: origin.x + (Math.random() - 0.5) * 30,
        y: origin.y + (Math.random() - 0.5) * 30,
        r: 6,
        maxR: Math.min(w, h) * 0.85,
        speed: (Math.random() * 0.3 + 0.7) * this.speed,
        rings: [0, 16, 32]
      });
    }

    // Draw concentric ripples with 2.5D perspective ellipse
    ctx.lineWidth = 1.0;
    for (let i = s.ripples.length - 1; i >= 0; i--) {
      const rp = s.ripples[i];
      rp.r += rp.speed;

      const progress = rp.r / rp.maxR;
      if (progress >= 1.0) {
        s.ripples.splice(i, 1);
        continue;
      }

      // Smooth sine bell curve for opacity (emerges -> peak at 30% -> gently dissolves)
      const baseAlpha = Math.sin(progress * Math.PI) * 0.22;

      for (let ri = 0; ri < rp.rings.length; ri++) {
        const ringOffset = rp.rings[ri];
        const curR = rp.r - ringOffset;
        if (curR <= 0) continue;

        const ringAlpha = baseAlpha * (1.0 - ri * 0.25);
        if (ringAlpha <= 0) continue;

        // 2.5D pond perspective: radiusY is ~50% of radiusX
        ctx.beginPath();
        ctx.ellipse(rp.x, rp.y, curR, curR * 0.52, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${ringAlpha})`;
        ctx.stroke();

        // Delicate inner highlight hairline
        if (curR > 10) {
          ctx.beginPath();
          ctx.ellipse(rp.x, rp.y, curR - 1.5, (curR - 1.5) * 0.52, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${ringAlpha * 0.35})`;
          ctx.stroke();
        }
      }
    }
  }

  // ==========================================================================
  // COMPATIBILITY EFFECTS: SNOW, FIREFLIES, RAIN, BREATHING
  // ==========================================================================

  _renderSnow(ctx, w, h) {
    const pts = this.particles;
    ctx.fillStyle = 'rgba(255, 240, 245, 0.65)';
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.y += p.vy * this.speed;
      p.phase += 0.02 * this.speed;
      p.x += Math.sin(p.phase) * 0.4 * this.speed;

      if (p.y > h + 10) {
        p.y = -10;
        p.x = Math.random() * w;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _renderFireflies(ctx, w, h) {
    const pts = this.particles;
    const t = this.time;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.x += p.vx * this.speed;
      p.y += p.vy * this.speed;

      if (p.x < -10) p.x = w + 10;
      else if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      else if (p.y > h + 10) p.y = -10;

      const pulse = 0.5 + 0.5 * Math.sin(t * 2.0 + p.phase);
      const alpha = 0.25 + 0.55 * pulse;

      // Soft glow halo
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.5);
      g.addColorStop(0.0, `rgba(253, 224, 71, ${alpha})`);
      g.addColorStop(0.4, `rgba(250, 204, 21, ${alpha * 0.4})`);
      g.addColorStop(1.0, 'rgba(250, 204, 21, 0.0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _renderRain(ctx, w, h) {
    const pts = this.particles;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.y += p.vy * this.speed;

      if (p.y > h + p.len) {
        p.y = -p.len;
        p.x = Math.random() * w;
      }

      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y + p.len);
      ctx.strokeStyle = `rgba(186, 230, 253, ${p.alpha})`;
      ctx.stroke();
    }
  }

  _renderBreathing(ctx, w, h) {
    const t = this.time;
    const accentRgb = this._parseColorRgb(this.themeColors.accent, [96, 165, 250]);
    const breath = 0.5 + 0.5 * Math.sin(t * 0.6);
    const alpha = 0.08 + 0.08 * breath;

    const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.hypot(w, h) * 0.6);
    g.addColorStop(0.0, `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${alpha * 1.5})`);
    g.addColorStop(0.6, `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${alpha * 0.6})`);
    g.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

// Attach to window in browser environments
if (typeof window !== 'undefined') {
  window.AmbientEngine = AmbientEngine;
}

// Export for Node.js / CommonJS / test suites
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AmbientEngine;
}
