/**
 * motion.js - Motion Engine (Bộ máy chuyển động lõi)
 * 
 * Strict Ownership: Worker B (motion-engine-dev)
 * 
 * Data Contracts:
 * Layer = {
 *   id: string,              // Unique ID (e.g. 'layer-hair-1')
 *   name: string,            // Tên lớp (e.g. 'Tóc bay', 'Suối nước')
 *   color: string,           // Mã màu nhận diện (e.g. '#7DCFFF')
 *   visible: boolean,        // Bật/tắt hiển thị
 *   locked: boolean,         // Khóa lớp
 *   mask: object | null,     // Dữ liệu vùng chọn/mask
 *   arrows: Array<{          // Mũi tên hướng dòng chảy (tọa độ chuẩn hóa 0..1)
 *     x1: number, y1: number,
 *     x2: number, y2: number,
 *     speed: number
 *   }>,
 *   pins: Array<{            // Ghim neo cố định (tọa độ chuẩn hóa 0..1)
 *     x: number, y: number,
 *     radius: number
 *   }>,
 *   speed: number,           // Tốc độ dòng chảy (0.1 .. 5.0)
 *   intensity: number,       // Cường độ biến dạng (0.0 .. 3.0)
 *   direction: number,       // Góc hướng bổ sung (độ)
 *   feather: number,         // Độ làm mềm viền mask (px)
 *   maxShift: number,        // Giới hạn độ dịch tối đa (px)
 *   depth: number            // 0 = xa nhất (ít parallax), 1 = gần nhất (nhiều parallax)
 * }
 * 
 * MotionConfig = {
 *   layers: Layer[],
 *   naturalness: number,     // 0-100: độ tự nhiên (0 = đều đặn, 100 = nhiều biến thiên/nhiễu)
 *   loopPeriodMs: number,    // Chu kỳ tuần hoàn tính bằng ms (e.g. 4000)
 *   intensityPreset: 'tinh-te' | 'vua' | 'manh', // 'tinh-te': 0.4x, 'vua': 1.0x, 'manh': 1.8x
 *   parallaxMouse: boolean,  // Bật/tắt parallax theo con trỏ chuột
 *   advanced: {
 *     waves: number,         // Số sóng sin (2-3)
 *     freq: number,          // Tần số cơ bản
 *     phaseLag: number,      // Độ lệch pha giữa các sóng
 *     noise: number          // Biên độ nhiễu Perlin/Simplex
 *   }
 * }
 * 
 * MotionEngine API Contract:
 *   setConfig(cfg), play(), pause(), renderFrame(t), seamCheck(), setCompare(ratio|null), applyToPreview()
 *   Parallax & Depth: generateAutoDepth(), paintDepth(), setDepthBrush(), setMousePos(x, y)
 * 
 * 100% Pure Client-Side Transformation: Absolutely NO external AI generative calls.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./depth', './physics', './segment'], factory);
  } else if (typeof module === 'object' && module.exports) {
    let depthMod = null;
    let physMod = null;
    let segMod = null;
    try { depthMod = require('./depth.js'); } catch (e) {}
    try { physMod = require('./physics.js'); } catch (e) {}
    try { segMod = require('./segment.js'); } catch (e) {}
    module.exports = factory(depthMod, physMod, segMod);
  } else {
    root.MotionEngine = factory(root.DepthEngine, root.PetPhysics, root.PetSegment);
  }
})(typeof self !== 'undefined' ? self : this, function (DepthEngineModule, PhysicsEngineModule, SegmentEngineModule) {
  'use strict';

  // High-precision clock (Absolute epoch ms)
  const getTimeMs = () => {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function' && performance.timeOrigin) {
      return performance.timeOrigin + performance.now();
    }
    return Date.now();
  };

  const CFG = (typeof window !== 'undefined' && window.CFG) ? window.CFG : (typeof global !== 'undefined' && global.CFG ? global.CFG : require('./config.js').CFG);
  const { unitPx, ampPx } = (typeof window !== 'undefined' && window.ampPx) ? window : (typeof global !== 'undefined' && global.ampPx ? global : require('./config.js'));

  const MOTION_LIMITS = CFG.motion.limit; // đơn vị ‰
  const LOOP = { seconds: CFG.loop.seconds };

  function defaultMotion(type) { return { type, enabled: true, amp: CFG.motion.defaultAmp, cycles: 1, phase: 0, chaos: CFG.motion.defaultChaos, angle: 0, seed: Math.floor(Math.random() * 1000) }; }

  function activeMotion(L) {
    return (L && L.motion && L.motion.enabled !== false) ? L.motion : null;
  }

  function motionSignal(m, u, yn = 0.5) {
    const cyc = m.cycles || 1;
    const phase = m.phase || 0;
    const yShift = (m.type === 'ripple') ? Math.sin(2 * Math.PI * yn) : 0;
    const angle = 2 * Math.PI * (cyc * u + phase) + yShift;
    const base = Math.sin(angle);
    const chaos = Math.min(1, Math.max(0, m.chaos || 0));
    if (chaos <= 0) return base;
    const noise = Math.sin(2 * angle + ((m.seed || 0) % 100));
    return (1 - chaos) * base + chaos * noise;
  }

  function layerTransform(L, u, ampScale = 1) {
    const m = activeMotion(L), T = { dx: 0, dy: 0, rot: 0, scale: 1 };
    if (!m || m.type === 'ripple') return T;
    const half = Math.max(Project.width, Project.height) / 2;
    const amp = ampPx(m.type, m.amp) * ampScale, s = motionSignal(m, u);
    if (m.type === 'breathe') T.scale = 1 + s * amp / (2 * half);
    else if (m.type === 'sway') T.rot = s * amp / half;
    else if (m.type === 'drift') { T.dx = Math.cos(m.angle) * s * amp; T.dy = Math.sin(m.angle) * s * amp; }
    return T;
  }

  function motionVector(L, u, ampScale = 1) { // 4 số cùng đơn vị px ảnh làm việc
    const m = activeMotion(L); if (!m) return [0, 0, 0, 0];
    const half = Math.max(Project.width, Project.height) / 2;
    if (m.type === 'ripple') { const amp = ampPx('ripple', m.amp) * ampScale; return [0.1, 0.5, 0.9].map(yn => amp * motionSignal(m, u, yn)).concat([0]); }
    const T = layerTransform(L, u, ampScale); return [T.dx, T.dy, T.rot * half, (T.scale - 1) * half];
  }

  function drawLayerMotion(ctx, L, u, ampScale = 1, off = { dx: 0, dy: 0 }) {
    if (!off) off = { dx: 0, dy: 0 };
    if (!L.pivot) L.pivot = { x: 0, y: 0 };
    const m = activeMotion(L), w = L.canvas.width, h = L.canvas.height;
    ctx.save(); ctx.globalAlpha = L.opacity !== undefined ? L.opacity : 1;
    if (m && m.type === 'ripple') {
      const amp = ampPx('ripple', m.amp) * ampScale, SH = 8;
      for (let y = 0; y < h; y += SH) { const sh = Math.min(SH + 1, h - y), yn = (y + SH / 2) / h;
        ctx.drawImage(L.canvas, 0, y, w, sh, amp * motionSignal(m, u, yn) + off.dx, y + off.dy, w, sh); }
    } else {
      const T = layerTransform(L, u, ampScale);
      ctx.translate(L.pivot.x + T.dx + off.dx, L.pivot.y + T.dy + off.dy);
      ctx.rotate(T.rot); ctx.scale(T.scale, T.scale); ctx.translate(-L.pivot.x, -L.pivot.y);
      ctx.drawImage(L.canvas, 0, 0);
    }
    ctx.restore();
  }

  function setMotion(L, patch) {
    withStructureUndo('Chỉnh chuyển động', () => {
      L.motion = Object.assign(L.motion || defaultMotion(patch.type || 'breathe'), patch);
      const m = L.motion;
      m.amp = Math.min(CFG.motion.limit[m.type], Math.max(0, m.amp));
      m.cycles = Math.min(CFG.motion.cyclesMax, Math.max(CFG.motion.cyclesMin, Math.round(m.cycles)));
      m.chaos = Math.min(CFG.motion.chaosMax, Math.max(0, m.chaos));
    });
    requestRedraw();
  }

  const Clock = { u: 0, speed: 1, playing: false };
  function tickClock(dt) {
    if (!Clock.playing) return;
    Clock.u = (Clock.u + (dt * Clock.speed) / (LOOP.seconds || CFG.loop.seconds)) % 1;
    if (Clock.u < 0) Clock.u += 1;
  }

  function renderLayerMotion(ctx, u, opts = {}) {
    if (!ctx || typeof ctx.clearRect !== 'function') return;
    const w = (typeof Project !== 'undefined' && Project.width) || (ctx.canvas && ctx.canvas.width) || 1000;
    const h = (typeof Project !== 'undefined' && Project.height) || (ctx.canvas && ctx.canvas.height) || 1000;
    ctx.clearRect(0, 0, w, h);
    const layers = (typeof Project !== 'undefined' && Project.layers) || [];
    const ampScale = (opts && typeof opts.ampScale === 'number') ? opts.ampScale : 1;
    for (const L of layers) {
      if (L.visible !== false) {
        drawLayerMotion(ctx, L, u, ampScale, { dx: 0, dy: 0 });
      }
    }
  }

  function renderFrame(arg1 = 0, arg2, arg3) {
    if (arg1 && typeof arg1 === 'object') {
      renderLayerMotion(arg1, arg2, arg3);
      return { rendered: true, isWebGL: false };
    }
    return instance._renderFrameEngine(arg1);
  }

  function withStructureUndo(label, fn) {
    if (typeof window !== 'undefined' && typeof window.withStructureUndo === 'function') {
      return window.withStructureUndo(label, fn);
    }
    if (typeof global !== 'undefined' && typeof global.withStructureUndo === 'function') {
      return global.withStructureUndo(label, fn);
    }
    return fn();
  }

  function requestRedraw() {
    if (typeof redraw === 'function') redraw();
    else if (typeof window !== 'undefined' && typeof window.requestRedraw === 'function') window.requestRedraw();
  }

  // Safe configuration accessor referencing CFG from config.js
  const getMotionCFG = () => CFG;

  // =========================================================================
  // 1. FAST DETERMINISTIC SIMPLEX 2D NOISE GENERATOR (Pure Client-Side)
  // =========================================================================
  class SimplexNoise2D {
    constructor(seed = 1337) {
      this.p = new Uint8Array(256);
      this.perm = new Uint8Array(512);
      this.permMod12 = new Uint8Array(512);

      let s = seed >>> 0;
      const rnd = () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return (s >>> 0) / 4294967296;
      };

      for (let i = 0; i < 256; i++) this.p[i] = i;
      for (let i = 255; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        const tmp = this.p[i];
        this.p[i] = this.p[j];
        this.p[j] = tmp;
      }
      for (let i = 0; i < 512; i++) {
        this.perm[i] = this.p[i & 255];
        this.permMod12[i] = this.perm[i] % 12;
      }

      this.grad3 = [
        [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
        [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
        [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
      ];
    }

    noise2D(xin, yin) {
      const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
      const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
      let n0 = 0, n1 = 0, n2 = 0;

      const s = (xin + yin) * F2;
      const i = Math.floor(xin + s);
      const j = Math.floor(yin + s);
      const t = (i + j) * G2;
      const X0 = i - t;
      const Y0 = j - t;
      const x0 = xin - X0;
      const y0 = yin - Y0;

      let i1, j1;
      if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }

      const x1 = x0 - i1 + G2;
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1.0 + 2.0 * G2;
      const y2 = y0 - 1.0 + 2.0 * G2;

      const ii = i & 255;
      const jj = j & 255;
      const gi0 = this.permMod12[ii + this.perm[jj]];
      const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
      const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

      let t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 > 0) {
        t0 *= t0;
        n0 = t0 * t0 * (this.grad3[gi0][0] * x0 + this.grad3[gi0][1] * y0);
      }
      let t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 > 0) {
        t1 *= t1;
        n1 = t1 * t1 * (this.grad3[gi1][0] * x1 + this.grad3[gi1][1] * y1);
      }
      let t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 > 0) {
        t2 *= t2;
        n2 = t2 * t2 * (this.grad3[gi2][0] * x2 + this.grad3[gi2][1] * y2);
      }
      return 70.0 * (n0 + n1 + n2);
    }
  }

  // =========================================================================
  // 2. MATHEMATICAL MULTI-SINE & SEAMLESS HARMONIC DISPLACEMENT
  // =========================================================================
  function calculateDisplacement({
    timeSec,
    loopPeriodSec,
    x = 0.5,
    y = 0.5,
    waves = 3,
    freq = 1.0,
    phaseLag = 0.5,
    naturalness = 50,
    noiseAmp = 0.2,
    simplexNoise = null
  }) {
    const period = Math.max(0.1, loopPeriodSec);
    const normT = ((timeSec % period) + period) % period;
    const theta = (normT / period) * Math.PI * 2; // [0, 2*PI)

    // Harmonic integer multipliers guarantee C-infinity seamless loop (0 jerk)
    const w1 = Math.sin(theta * 1.0 * freq + (x * 3.14159 + y * 2.0));
    const w2 = Math.sin(theta * 2.0 * freq + (-x * 2.5 + y * 4.0) + phaseLag);
    const w3 = Math.sin(theta * 3.0 * freq + (x * 4.0 - y * 3.0) + phaseLag * 2.0);

    let waveSynth = w1 * 0.55;
    let totalW = 0.55;
    if (waves >= 1.5) {
      waveSynth += w2 * 0.30;
      totalW += 0.30;
    }
    if (waves >= 2.5) {
      waveSynth += w3 * 0.15;
      totalW += 0.15;
    }
    waveSynth /= totalW;

    // Seamless noise sampled along a circular path in time
    let noiseEased = 0;
    if (simplexNoise) {
      const circX = Math.cos(theta) * 0.8;
      const circY = Math.sin(theta) * 0.8;
      const n1 = simplexNoise.noise2D(x * 3.5 + circX, y * 3.5 + circY);
      const n2 = simplexNoise.noise2D(x * 7.0 - circX * 1.4, y * 7.0 - circY * 1.4);
      const rawNoise = n1 * 0.7 + n2 * 0.3;
      const absN = Math.min(1.0, Math.abs(rawNoise));
      // Quintic smootherstep easing
      noiseEased = Math.sign(rawNoise) * (absN * absN * absN * (absN * (absN * 6 - 15) + 10));
    }

    const nat = Math.max(0, Math.min(100, naturalness)) / 100;
    const combined = (1 - nat) * waveSynth + nat * (waveSynth * 0.65 + noiseEased * 0.35 * (1.0 + noiseAmp));
    return combined;
  }

  // =========================================================================
  // 2.1 LAYER MOTION ENGINE (GIAI ĐOẠN 2: THỞ, ĐUNG ĐƯA, TRÔI, GỢN)
  // =========================================================================
  function calculateLayerMotion({
    layer,
    x = 0.5,
    y = 0.5,
    timeSec = 0,
    loopPeriodSec = 12,
    imageWidth = 1920,
    imageHeight = 1080,
    simplexNoise = null,
    cfg = null,
    safeZones = null,
    safeZoneFactor = null,
    calmFactor = null,
    safeZoneMode = 'dampen'
  }) {
    const currentCfg = cfg || getMotionCFG();
    const motionType = (layer && (layer.motionType || (layer.motion && layer.motion.type))) || 'sway';
    const limitPermille = (currentCfg.motion && currentCfg.motion.limit && currentCfg.motion.limit[motionType]) || 3.0;

    // 1. Raw amplitude in permille (‰)
    const rawAmp = (layer && typeof layer.amplitude === 'number')
      ? layer.amplitude
      : ((layer && layer.motion && typeof layer.motion.amplitude === 'number')
        ? layer.motion.amplitude
        : (currentCfg.motion ? currentCfg.motion.defaultAmp : 1.0));

    // Clamp amplitude to limitPermille (Hard limit)
    const ampPermille = Math.min(rawAmp, limitPermille);

    // 2. Scaling: 1‰ of maximum image dimension
    const maxSide = Math.max(imageWidth, imageHeight) || 1000;
    const unitPxVal = maxSide / 1000.0;
    const ampPxVal = ampPermille * unitPxVal;
    const limitPxVal = limitPermille * unitPxVal;

    // 3. Warning condition (exceeding warnRatio threshold, e.g. 75%)
    const warnRatio = (currentCfg.motion && currentCfg.motion.warnRatio) || 0.75;
    const isWarning = rawAmp > (limitPermille * warnRatio);

    // 4. Normalized time & periodic parameter theta in [0, 2*PI)
    const T = Math.max(0.1, (layer && typeof layer.loopSec === 'number')
      ? layer.loopSec
      : ((layer && layer.motion && typeof layer.motion.loopSec === 'number')
        ? layer.motion.loopSec
        : loopPeriodSec));
    const normT = ((timeSec % T) + T) % T;
    const theta = (normT / T) * Math.PI * 2; // [0, 2*PI)

    // 5. Periodic smooth noise (Circular Simplex Sampling, 0 Jerk)
    const chaos = (layer && typeof layer.chaos === 'number')
      ? Math.max(0, Math.min(currentCfg.motion ? currentCfg.motion.chaosMax : 0.5, layer.chaos))
      : ((layer && layer.motion && typeof layer.motion.chaos === 'number')
        ? Math.max(0, Math.min(currentCfg.motion ? currentCfg.motion.chaosMax : 0.5, layer.motion.chaos))
        : (currentCfg.motion ? currentCfg.motion.defaultChaos : 0.15));

    let periodicNoise = 0;
    if (simplexNoise) {
      const circX = Math.cos(theta);
      const circY = Math.sin(theta);
      const n1 = simplexNoise.noise2D(x * 2.5 + circX * 0.7, y * 2.5 + circY * 0.7);
      const n2 = simplexNoise.noise2D(x * 5.0 - circX * 1.2, y * 5.0 - circY * 1.2);
      const rawN = n1 * 0.7 + n2 * 0.3;
      const absN = Math.min(1.0, Math.abs(rawN));
      // Quintic smootherstep easing: 6u^5 - 15u^4 + 10u^3
      periodicNoise = Math.sign(rawN) * (absN * absN * absN * (absN * (absN * 6.0 - 15.0) + 10.0));
    } else {
      periodicNoise = 0.7 * Math.sin(theta * 2.0 + x * 3.14159) + 0.3 * Math.cos(theta * 3.0 - y * 3.14159);
    }
    const noisePerturb = chaos * periodicNoise;

    // 6. Anchor / Pivot Point (normalized 0..1)
    let ax = 0.5;
    let ay = 0.5;
    if (layer) {
      if (layer.anchor && typeof layer.anchor.x === 'number') {
        ax = layer.anchor.x;
        ay = layer.anchor.y;
      } else if (layer.motion && layer.motion.anchor && typeof layer.motion.anchor.x === 'number') {
        ax = layer.motion.anchor.x;
        ay = layer.motion.anchor.y;
      } else if (layer.pivot && typeof layer.pivot.x === 'number') {
        ax = layer.pivot.x > 1.0 ? layer.pivot.x / (imageWidth || 1) : layer.pivot.x;
        ay = layer.pivot.y > 1.0 ? layer.pivot.y / (imageHeight || 1) : layer.pivot.y;
      }
    }

    let rawDx = 0;
    let rawDy = 0;

    switch (motionType) {
      case 'breathe': {
        // THỞ (Breathe): Scale and subtle translate around anchor
        const scaleWave = (Math.sin(theta) + noisePerturb) * (ampPxVal / maxSide) * 1.5;
        const relX = (x - ax) * imageWidth;
        const relY = (y - ay) * imageHeight;
        rawDx = relX * scaleWave;
        rawDy = relY * scaleWave + Math.sin(theta) * (ampPxVal * 0.25);
        break;
      }

      case 'sway': {
        // ĐUNG ĐƯA (Sway): Rotation around anchor.
        // Root at anchor is fixed (0 displacement). Tip sways more with distance.
        const distToAnchor = Math.hypot(x - ax, y - ay);
        const distFactor = Math.min(2.0, distToAnchor * 1.5);
        const maxAngleRad = (ampPxVal / maxSide) * 2.2;
        const angle = (Math.sin(theta) + noisePerturb) * maxAngleRad * distFactor;

        const relX = (x - ax) * imageWidth;
        const relY = (y - ay) * imageHeight;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        rawDx = relX * (cosA - 1.0) - relY * sinA;
        rawDy = relX * sinA + relY * (cosA - 1.0);
        break;
      }

      case 'drift': {
        // TRÔI (Drift): Directional smooth cyclic translation
        let dirDeg = (layer && typeof layer.direction === 'number') ? layer.direction : 0;
        if (Array.isArray(layer && layer.arrows) && layer.arrows.length > 0) {
          const arr = layer.arrows[0];
          dirDeg = Math.atan2(arr.y2 - arr.y1, arr.x2 - arr.x1) * (180 / Math.PI);
        }
        const dirRad = dirDeg * (Math.PI / 180);
        const driftWave = Math.sin(theta) + 0.15 * Math.sin(theta * 2.0) * chaos + noisePerturb * 0.5;
        rawDx = Math.cos(dirRad) * ampPxVal * driftWave;
        rawDy = Math.sin(dirRad) * ampPxVal * driftWave;
        break;
      }

      case 'ripple':
      default: {
        // GỢN (Ripple): Displacement warp with harmonic multi-sine waves
        const w1 = Math.sin(theta * 1.0 + x * 3.14159 * 3.0 + y * 3.14159 * 2.0);
        const w2 = Math.sin(theta * 2.0 - x * 3.14159 * 2.5 + y * 3.14159 * 4.0 + 0.5);
        const synth = (w1 * 0.65 + w2 * 0.35 + noisePerturb * 0.6);
        let dirRad = ((layer && typeof layer.direction === 'number') ? layer.direction : 45) * (Math.PI / 180);
        rawDx = Math.cos(dirRad) * ampPxVal * synth;
        rawDy = Math.sin(dirRad) * ampPxVal * synth;
        break;
      }
    }

    // 7. Hyperbolic tangent soft saturation (D-007)
    // Guarantees displacement magnitude strictly never exceeds limitPxVal
    const rawDist = Math.hypot(rawDx, rawDy);
    let dx = rawDx;
    let dy = rawDy;
    if (rawDist > 0.0001 && limitPxVal > 0.0001) {
      const clampedDist = limitPxVal * Math.tanh(rawDist / limitPxVal);
      const scale = clampedDist / rawDist;
      dx = rawDx * scale;
      dy = rawDy * scale;
    }

    // 8. Safe Zone & Focus Shield Attenuation (GIAI ĐOẠN 3 / D-008 & D-009)
    let safeMultiplier = 1.0;
    if (typeof safeZoneFactor === 'number') {
      safeMultiplier = Math.max(0.0, Math.min(1.0, safeZoneFactor));
    } else if (Array.isArray(safeZones) && safeZones.length > 0) {
      const featherNorm = (currentCfg.safe && typeof currentCfg.safe.featherPermille === 'number')
        ? (currentCfg.safe.featherPermille / 1000.0)
        : 0.012;
      const minAtten = (currentCfg.calm && typeof currentCfg.calm.typingFactor === 'number')
        ? currentCfg.calm.typingFactor
        : 0.2;
      const insideAtten = safeZoneMode === 'freeze' ? 0.0 : minAtten;

      for (const zone of safeZones) {
        if (!zone || zone.enabled === false) continue;
        const zx1 = zone.x;
        const zy1 = zone.y;
        const zx2 = zone.x + zone.width;
        const zy2 = zone.y + zone.height;

        if (x >= zx1 && x <= zx2 && y >= zy1 && y <= zy2) {
          safeMultiplier = Math.min(safeMultiplier, insideAtten);
        } else if (featherNorm > 0) {
          const dxDist = Math.max(0, Math.max(zx1 - x, x - zx2));
          const dyDist = Math.max(0, Math.max(zy1 - y, y - zy2));
          const dist = Math.hypot(dxDist, dyDist);
          if (dist < featherNorm) {
            const u = dist / featherNorm;
            const smoothU = u * u * (3.0 - 2.0 * u);
            const factor = insideAtten + (1.0 - insideAtten) * smoothU;
            safeMultiplier = Math.min(safeMultiplier, factor);
          }
        }
      }
    }

    const effectiveCalm = (typeof calmFactor === 'number')
      ? Math.max(0.0, Math.min(1.0, calmFactor))
      : 1.0;

    const totalModulation = safeMultiplier * effectiveCalm;
    dx *= totalModulation;
    dy *= totalModulation;

    return {
      dx,
      dy,
      displacement: Math.hypot(dx, dy),
      rawDisplacement: rawDist,
      motionType,
      ampPermille,
      ampPx: ampPxVal,
      limitPx: limitPxVal,
      isWarning,
      theta,
      safeMultiplier,
      calmMultiplier: effectiveCalm,
      totalModulation
    };
  }

  // =========================================================================
  // 2.2 VISUAL LOAD METER (GIAI ĐOẠN 3: TẢI MẮT & GIỚI HẠN ĐIỂM NHẤN)
  // =========================================================================
  function calculateVisualLoad(layers = [], cfg = null) {
    const currentCfg = cfg || getMotionCFG();
    const activeLayers = (Array.isArray(layers) ? layers : []).filter(l => {
      if (!l || l.visible === false) return false;
      const amp = typeof l.amplitude === 'number'
        ? l.amplitude
        : ((l.motion && typeof l.motion.amplitude === 'number') ? l.motion.amplitude : 0);
      const hasArrows = Array.isArray(l.arrows) && l.arrows.length > 0;
      return amp > 0 || hasArrows;
    });

    let totalLoad = 0;
    activeLayers.forEach(l => {
      const amp = typeof l.amplitude === 'number'
        ? l.amplitude
        : ((l.motion && typeof l.motion.amplitude === 'number') ? l.motion.amplitude : (currentCfg.motion ? currentCfg.motion.defaultAmp : 1.0));
      const spd = typeof l.speed === 'number'
        ? l.speed
        : ((l.motion && typeof l.motion.speed === 'number') ? l.motion.speed : 1.0);
      totalLoad += amp * spd;
    });

    const greenMax = (currentCfg.load && currentCfg.load.green) || 1.5;
    const yellowMax = (currentCfg.load && currentCfg.load.yellow) || 3.0;
    const maxActive = (currentCfg.load && currentCfg.load.maxActive) || 3;

    let level = 'green';
    let levelLabel = 'Dịu mắt';
    let levelColor = '#38EF7D';

    if (totalLoad > yellowMax) {
      level = 'red';
      levelLabel = 'Rối mắt';
      levelColor = '#F7768E';
    } else if (totalLoad > greenMax) {
      level = 'yellow';
      levelLabel = 'Vừa phải';
      levelColor = '#E0AF68';
    }

    const isOverloaded = activeLayers.length > maxActive;

    return {
      load: Number(totalLoad.toFixed(2)),
      level,
      levelLabel,
      levelColor,
      activeCount: activeLayers.length,
      maxActive,
      isOverloaded,
      greenMax,
      yellowMax
    };
  }

  // =========================================================================
  // 3. GLSL SHADER SOURCES (WebGL 60FPS Displacement Warp & Parallax Engine)
  // =========================================================================
  const VS_SOURCE = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = (a_position + 1.0) * 0.5;
      v_uv.y = 1.0 - v_uv.y;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const FS_SOURCE = `
    precision mediump float;
    uniform sampler2D u_image;
    uniform sampler2D u_flow;
    uniform sampler2D u_depth;
    uniform float u_time;
    uniform float u_loopPeriod;
    uniform float u_naturalness;
    uniform float u_waves;
    uniform float u_freq;
    uniform float u_noiseAmp;
    uniform float u_phaseLag;
    uniform float u_compareRatio;
    uniform vec2 u_resolution;
    uniform float u_maxShift;
    uniform float u_feather;
    uniform float u_intensity;
    uniform float u_speed;
    uniform float u_seamCheck;
    uniform vec2 u_mouseOffset;
    uniform float u_useMouseParallax;

    varying vec2 v_uv;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187,
                          0.366025403784439,
                         -0.577350269189626,
                          0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m * m;
      m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      // Sample depth map for layer parallax & mouse parallax
      float depthVal = texture2D(u_depth, v_uv).r;

      // Mouse Parallax 3D displacement
      vec2 mouseShift = vec2(0.0);
      if (u_useMouseParallax > 0.5) {
        // Foreground (depth > 0.5) moves toward mouse, background (depth < 0.5) moves opposite
        mouseShift = u_mouseOffset * (depthVal - 0.5) * 0.045;
      }

      vec2 shiftedUV = clamp(v_uv + mouseShift, 0.001, 0.999);

      vec4 flow = texture2D(u_flow, shiftedUV);
      vec2 dir = (flow.rg - 0.5) * 2.0;
      float flowSpeed = flow.b * u_speed;
      float mask = flow.a;

      float effectivePeriod = max(u_loopPeriod, 0.5);
      float normT = fract(u_time / effectivePeriod);
      float theta = normT * 6.283185307179586;

      // 1. Multi-sine wave synthesis (harmonic frequencies)
      float wave1 = sin(theta * 1.0 * u_freq + dot(shiftedUV, vec2(3.1415, 2.0)));
      float wave2 = sin(theta * 2.0 * u_freq + dot(shiftedUV, vec2(-2.5, 4.0)) + u_phaseLag);
      float wave3 = sin(theta * 3.0 * u_freq + dot(shiftedUV, vec2(4.0, -3.0)) + u_phaseLag * 2.0);

      float waveSynth = wave1 * 0.55;
      float totalWeight = 0.55;
      if (u_waves >= 1.5) {
        waveSynth += wave2 * 0.30;
        totalWeight += 0.30;
      }
      if (u_waves >= 2.5) {
        waveSynth += wave3 * 0.15;
        totalWeight += 0.15;
      }
      waveSynth /= totalWeight;

      // 2. Seamless Simplex Noise (circular coordinates)
      vec2 timeCircle = vec2(cos(theta), sin(theta)) * 0.8;
      float n1 = snoise(shiftedUV * 3.5 + timeCircle);
      float n2 = snoise(shiftedUV * 7.0 - timeCircle * 1.4);
      float rawNoise = n1 * 0.7 + n2 * 0.3;
      float noiseEased = sign(rawNoise) * (rawNoise * rawNoise * (3.0 - 2.0 * abs(rawNoise)));

      // 3. Naturalness blending
      float combinedMod = mix(waveSynth, waveSynth * 0.65 + noiseEased * 0.35, u_naturalness);

      vec4 motionColor;
      float dirLen = length(dir);

      if (mask < 0.005 || dirLen < 0.01) {
        // Static background when no flow is present, but with mouse parallax
        motionColor = texture2D(u_image, shiftedUV);
      } else {
        vec2 normDir = normalize(dir);
        vec2 perpDir = vec2(-normDir.y, normDir.x);

        // Two-phase advection cycle for seamless perpetual flow
        float cycleRate = 1.0 / effectivePeriod;
        float t1 = fract(u_time * cycleRate * flowSpeed * 1.5);
        float t2 = fract(u_time * cycleRate * flowSpeed * 1.5 + 0.5);

        // Depth modulates advection amplitude: closer layers (depth ~ 1.0) displace more
        float depthMod = 0.35 + 0.65 * depthVal;
        float baseDisplace = 0.065 * u_intensity * mask * depthMod;

        vec2 flowOffset1 = normDir * (t1 - 0.5) * baseDisplace;
        vec2 flowOffset2 = normDir * (t2 - 0.5) * baseDisplace;
        vec2 swayOffset = perpDir * (combinedMod * baseDisplace * 0.35 * (1.0 + u_noiseAmp));

        vec2 totalOffset1 = flowOffset1 + swayOffset;
        vec2 totalOffset2 = flowOffset2 + swayOffset;

        // Max Shift limit per layer/region (clamped in UV units)
        float maxShiftUV = u_maxShift / max(u_resolution.x, u_resolution.y);
        float len1 = length(totalOffset1);
        if (len1 > maxShiftUV && len1 > 0.0001) totalOffset1 = (totalOffset1 / len1) * maxShiftUV;
        float len2 = length(totalOffset2);
        if (len2 > maxShiftUV && len2 > 0.0001) totalOffset2 = (totalOffset2 / len2) * maxShiftUV;

        // Edge-bleed clamping: completely prevents edge tearing & seam boundaries
        float edgeMargin = 16.0 / max(u_resolution.x, u_resolution.y);
        float edgeDist = min(min(shiftedUV.x, 1.0 - shiftedUV.x), min(shiftedUV.y, 1.0 - shiftedUV.y));
        float edgeDamp = smoothstep(0.0, edgeMargin, edgeDist);

        totalOffset1 *= edgeDamp;
        totalOffset2 *= edgeDamp;

        vec2 uv1 = clamp(shiftedUV - totalOffset1, 0.001, 0.999);
        vec2 uv2 = clamp(shiftedUV - totalOffset2, 0.001, 0.999);

        // Cosine crossfade weight between advection phases
        float weight = 0.5 - 0.5 * cos(t1 * 6.283185307179586);

        vec4 col1 = texture2D(u_image, uv1);
        vec4 col2 = texture2D(u_image, uv2);

        motionColor = mix(col1, col2, 1.0 - weight);
      }

      // Split-screen Before / After comparison divider
      if (u_compareRatio >= 0.0 && u_compareRatio <= 1.0) {
        float splitX = u_compareRatio;
        float pxDist = abs(v_uv.x - splitX) * u_resolution.x;

        if (pxDist < 1.5) {
          gl_FragColor = vec4(0.49, 0.82, 1.0, 1.0);
          return;
        } else if (pxDist < 3.5) {
          float glow = 1.0 - (pxDist - 1.5) / 2.0;
          vec4 base = (v_uv.x < splitX) ? texture2D(u_image, shiftedUV) : motionColor;
          gl_FragColor = mix(base, vec4(0.49, 0.82, 1.0, 1.0), 0.55 * glow);
          return;
        }

        if (v_uv.x < splitX) {
          gl_FragColor = texture2D(u_image, shiftedUV);
          return;
        }
      }

      // Seam check indicator
      if (u_seamCheck > 0.5) {
        vec2 cornerDist = (vec2(1.0, 1.0) - v_uv) * u_resolution;
        if (length(cornerDist - vec2(20.0, 20.0)) < 8.0) {
          float pulse = 0.7 + 0.3 * sin(u_time * 6.0);
          gl_FragColor = vec4(1.0, 0.85, 0.2, pulse);
          return;
        }
      }

      gl_FragColor = motionColor;
    }
  `;

  // =========================================================================
  // 4. MOTION ENGINE CORE IMPLEMENTATION
  // =========================================================================
  class MotionEngineCore {
    constructor() {
      this.config = {
        layers: [],
        naturalness: 50,
        loopPeriodMs: 4000,
        intensityPreset: 'vua', // 'tinh-te': 0.4x, 'vua': 1.0x, 'manh': 1.8x
        parallaxMouse: false,
        advanced: {
          waves: 3,
          freq: 1.0,
          phaseLag: 0.5,
          noise: 0.2
        }
      };

      this.isPlaying = false;
      this.compareRatio = null; // null: off, 0.0 .. 1.0: compare
      this.isSeamCheckMode = false;
      this.listeners = [];
      this.currentTime = 0; // In seconds
      this.lastFrameTime = 0;
      this.animFrameId = null;
      this._autoPaused = false;
      this.isWebGL = false;
      this.fallbackNotified = false;

      // Mouse Parallax coordinates (normalized -1.0 .. 1.0)
      this.mousePos = { x: 0, y: 0 };

      // Rendering contexts & textures
      this.canvas = null;
      this.gl = null;
      this.ctx2d = null;
      this.shaderProgram = null;
      this.imageTexture = null;
      this.flowTexture = null;
      this.depthTexture = null;
      this.currentImage = null;

      // 256x256 Offscreen Flow Field Map
      this.flowCanvas = null;
      this.flowCtx = null;
      this._initOffscreenFlowCanvas();

      // Depth Engine Module integration
      this.depthEngine = DepthEngineModule || null;
      this.physicsEngine = PhysicsEngineModule || null;
      this.segmentEngine = SegmentEngineModule || null;

      // Pure JS Simplex Noise for fallback and CPU telemetry
      this.noiseGen = new SimplexNoise2D(2026);

      // GIAI ĐOẠN 3: Safe Zones & Focus Shield (D-008 & D-009)
      this.safeZones = [];
      this.showSafeZones = true;
      this.safeZoneMode = 'dampen'; // 'dampen': 20% displacement, 'freeze': 0% displacement
      this.focusShieldEnabled = true;
      this.isTyping = false;
      this.typingFactor = 1.0;
      this.lastTypingTime = 0;
      this.safeZones = this.measureLivePreviewSafeZones();

      // Environment bindings (Auto-pause on hidden tab, reduced motion)
      this._bindEnvironment();
    }

    _getPhysicsEngine() {
      if (this.physicsEngine) return this.physicsEngine;
      if (typeof window !== 'undefined' && window.PetPhysics) {
        this.physicsEngine = window.PetPhysics;
        return this.physicsEngine;
      }
      if (typeof PetPhysics !== 'undefined') {
        this.physicsEngine = PetPhysics;
        return this.physicsEngine;
      }
      try {
        if (typeof require !== 'undefined') {
          this.physicsEngine = require('./physics.js');
          return this.physicsEngine;
        }
      } catch (e) {}
      return null;
    }

    _getSegmentEngine() {
      if (this.segmentEngine) return this.segmentEngine;
      if (typeof window !== 'undefined' && window.PetSegment) {
        this.segmentEngine = window.PetSegment;
        return this.segmentEngine;
      }
      if (typeof PetSegment !== 'undefined') {
        this.segmentEngine = PetSegment;
        return this.segmentEngine;
      }
      try {
        if (typeof require !== 'undefined') {
          this.segmentEngine = require('./segment.js');
          return this.segmentEngine;
        }
      } catch (e) {}
      return null;
    }

    _initOffscreenFlowCanvas() {
      if (typeof document !== 'undefined') {
        this.flowCanvas = document.createElement('canvas');
        this.flowCanvas.width = 256;
        this.flowCanvas.height = 256;
        this.flowCtx = this.flowCanvas.getContext('2d');
      }
    }

    _bindEnvironment() {
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            if (this.isPlaying) {
              this._autoPaused = true;
              this.pause();
            }
          } else {
            if (this._autoPaused) {
              this._autoPaused = false;
              this.play();
            }
          }
        });
      }

      if (typeof window !== 'undefined' && window.matchMedia) {
        try {
          const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
          this.reducedMotion = mq.matches;
          if (mq.addEventListener) {
            mq.addEventListener('change', (e) => {
              this.reducedMotion = e.matches;
              this._emitChange('reducedMotion', { reducedMotion: this.reducedMotion });
            });
          }
        } catch (e) {
          this.reducedMotion = false;
        }
      } else {
        this.reducedMotion = false;
      }
    }

    // =======================================================================
    // CONFIGURATION & INTENSITY PRESET SCALING
    // =======================================================================
    getIntensityMultiplier() {
      // GIAI ĐOẠN 3 Contract: 'tinh-te': 0.4x, 'vua': 1.0x, 'manh': 1.8x
      switch (this.config.intensityPreset) {
        case 'tinh-te': return 0.4;
        case 'manh': return 1.8;
        case 'vua':
        default: return 1.0;
      }
    }

    getSpeedMultiplier() {
      switch (this.config.intensityPreset) {
        case 'tinh-te': return 0.7;
        case 'manh': return 1.4;
        case 'vua':
        default: return 1.0;
      }
    }

    setConfig(cfg) {
      if (!cfg || typeof cfg !== 'object') return this.getConfig();

      // Support legacy structure { enabled, flowSpeed, arrows, pins }
      if (Array.isArray(cfg.arrows) || Array.isArray(cfg.pins)) {
        if (!this.config.layers || this.config.layers.length === 0) {
          this.config.layers = [{
            id: 'layer-default',
            name: 'Lớp chuyển động chính',
            color: '#7DCFFF',
            visible: true,
            locked: false,
            mask: null,
            arrows: cfg.arrows ? cfg.arrows.map(a => ({ ...a })) : [],
            pins: cfg.pins ? cfg.pins.map(p => ({ ...p })) : [],
            speed: typeof cfg.flowSpeed === 'number' ? cfg.flowSpeed : 1.0,
            intensity: 1.0,
            direction: 0,
            feather: 15,
            maxShift: 25,
            depth: 0.5
          }];
        } else {
          const mainLayer = this.config.layers[0];
          if (cfg.arrows) mainLayer.arrows = cfg.arrows.map(a => ({ ...a }));
          if (cfg.pins) mainLayer.pins = cfg.pins.map(p => ({ ...p }));
          if (typeof cfg.flowSpeed === 'number') mainLayer.speed = cfg.flowSpeed;
        }
      }

      if (Array.isArray(cfg.layers)) {
        this.config.layers = cfg.layers.map(l => ({
          id: l.id || `layer-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: l.name || 'Lớp chuyển động',
          color: l.color || '#7DCFFF',
          visible: l.visible !== false,
          locked: !!l.locked,
          mask: l.mask || null,
          arrows: Array.isArray(l.arrows) ? l.arrows.map(a => ({ ...a })) : [],
          pins: Array.isArray(l.pins) ? l.pins.map(p => ({ ...p })) : [],
          speed: typeof l.speed === 'number' ? l.speed : 1.0,
          intensity: typeof l.intensity === 'number' ? l.intensity : 1.0,
          direction: typeof l.direction === 'number' ? l.direction : 0,
          feather: typeof l.feather === 'number' ? l.feather : 15,
          maxShift: typeof l.maxShift === 'number' ? l.maxShift : 25,
          depth: typeof l.depth === 'number' ? Math.max(0, Math.min(1, l.depth)) : 0.5,
          motionType: l.motionType || (l.motion && l.motion.type) || 'sway',
          amplitude: typeof l.amplitude === 'number' ? l.amplitude : (typeof l.intensity === 'number' ? l.intensity : 1.0),
          chaos: typeof l.chaos === 'number' ? Math.max(0, Math.min(0.5, l.chaos)) : 0.15,
          loopSec: typeof l.loopSec === 'number' ? Math.max(getMotionCFG().loop.min, Math.min(getMotionCFG().loop.max, l.loopSec)) : getMotionCFG().loop.seconds,
          anchor: l.anchor ? { x: Number(l.anchor.x) || 0.5, y: Number(l.anchor.y) || 0.5 } : (l.pivot ? { x: Number(l.pivot.x) || 0.5, y: Number(l.pivot.y) || 0.5 } : { x: 0.5, y: 0.5 }),
          physics: l.physics ? JSON.parse(JSON.stringify(l.physics)) : { enabled: false, anchor: { x: 0.5, y: 0.1 }, stiffness: 1.0, damping: 0.7, lag: 0.4, maxDisplacement: 3.0 }
        }));
      }

      if (typeof cfg.naturalness === 'number') {
        this.config.naturalness = Math.max(0, Math.min(100, cfg.naturalness));
      }
      if (typeof cfg.loopPeriodMs === 'number') {
        this.config.loopPeriodMs = Math.max(500, cfg.loopPeriodMs);
      }
      if (cfg.intensityPreset) {
        this.config.intensityPreset = cfg.intensityPreset;
      }
      if (typeof cfg.parallaxMouse === 'boolean') {
        this.config.parallaxMouse = cfg.parallaxMouse;
      }

      if (cfg.advanced && typeof cfg.advanced === 'object') {
        this.config.advanced = Object.assign({}, this.config.advanced, cfg.advanced);
      }

      this._updateNaturalnessParameters();
      this.updateFlowTexture();

      this._emitChange('config', this.config);
      return this.getConfig();
    }

    _updateNaturalnessParameters() {
      const nat = this.config.naturalness;
      if (nat < 35) {
        this.config.advanced.waves = 2;
        this.config.advanced.noise = 0.05 + (nat / 35) * 0.1;
      } else if (nat < 75) {
        this.config.advanced.waves = 3;
        this.config.advanced.noise = 0.15 + ((nat - 35) / 40) * 0.15;
      } else {
        this.config.advanced.waves = 3;
        this.config.advanced.noise = 0.30 + ((nat - 75) / 25) * 0.1;
      }
    }

    getConfig() {
      return JSON.parse(JSON.stringify(this.config));
    }

    // =======================================================================
    // LAYER MANAGEMENT HELPER METHODS
    // =======================================================================
    getLayers() {
      return this.config.layers;
    }

    getLayer(id) {
      return this.config.layers.find(l => l.id === id) || null;
    }

    addLayer(layerData = {}) {
      const newLayer = {
        id: layerData.id || `layer-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: layerData.name || `Lớp ${this.config.layers.length + 1}`,
        color: layerData.color || '#7DCFFF',
        visible: layerData.visible !== false,
        locked: !!layerData.locked,
        mask: layerData.mask || null,
        arrows: Array.isArray(layerData.arrows) ? layerData.arrows.map(a => ({ ...a })) : [],
        pins: Array.isArray(layerData.pins) ? layerData.pins.map(p => ({ ...p })) : [],
        speed: typeof layerData.speed === 'number' ? layerData.speed : 1.0,
        intensity: typeof layerData.intensity === 'number' ? layerData.intensity : 1.0,
        direction: typeof layerData.direction === 'number' ? layerData.direction : 0,
        feather: typeof layerData.feather === 'number' ? layerData.feather : 15,
        maxShift: typeof layerData.maxShift === 'number' ? layerData.maxShift : 25,
        depth: typeof layerData.depth === 'number' ? Math.max(0, Math.min(1, layerData.depth)) : 0.5
      };
      this.config.layers.push(newLayer);
      this.updateFlowTexture();
      this._emitChange('layerAdded', newLayer);
      return newLayer;
    }

    updateLayer(id, updates = {}) {
      const idx = this.config.layers.findIndex(l => l.id === id);
      if (idx === -1) return null;
      this.config.layers[idx] = Object.assign({}, this.config.layers[idx], updates);
      this.updateFlowTexture();
      this._emitChange('layerUpdated', this.config.layers[idx]);
      return this.config.layers[idx];
    }

    removeLayer(id) {
      const idx = this.config.layers.findIndex(l => l.id === id);
      if (idx === -1) return false;
      const removed = this.config.layers.splice(idx, 1)[0];
      this.updateFlowTexture();
      this._emitChange('layerRemoved', removed);
      return true;
    }

    // =======================================================================
    // DEPTH MAP & PARALLAX METHODS
    // =======================================================================
    _getDepthEngine() {
      if (this.depthEngine) return this.depthEngine;
      if (typeof window !== 'undefined' && window.DepthEngine) {
        this.depthEngine = window.DepthEngine;
        return this.depthEngine;
      }
      if (typeof DepthEngine !== 'undefined') {
        this.depthEngine = DepthEngine;
        return this.depthEngine;
      }
      return null;
    }

    setMousePos(nx, ny) {
      this.mousePos.x = Math.max(-1.0, Math.min(1.0, nx));
      this.mousePos.y = Math.max(-1.0, Math.min(1.0, ny));
      if (!this.isPlaying) {
        this.renderFrame(this.currentTime);
      }
    }

    generateAutoDepth(options = {}) {
      const de = this._getDepthEngine();
      if (de && typeof de.generateAutoDepth === 'function') {
        const depthCanvas = de.generateAutoDepth(this.currentImage, options);
        this.updateDepthTexture();
        this._emitChange('depthUpdated', { source: 'auto' });
        return depthCanvas;
      }
      return null;
    }

    paintDepth(nx, ny, depthVal = null) {
      const de = this._getDepthEngine();
      if (de && typeof de.paintDepth === 'function') {
        de.paintDepth(nx, ny, depthVal);
        this.updateDepthTexture();
        this._emitChange('depthUpdated', { source: 'brush', nx, ny });
      }
    }

    paintDepthGradient(type = 'vertical', startVal = 0.1, endVal = 0.9) {
      const de = this._getDepthEngine();
      if (de && typeof de.paintGradient === 'function') {
        de.paintGradient(type, startVal, endVal);
        this.updateDepthTexture();
        this._emitChange('depthUpdated', { source: 'gradient', type });
      }
    }

    setDepthBrush(options = {}) {
      const de = this._getDepthEngine();
      if (de && typeof de.setBrush === 'function') {
        return de.setBrush(options);
      }
      return null;
    }

    getDepthCanvas() {
      const de = this._getDepthEngine();
      if (de && typeof de.getCanvas === 'function') {
        return de.getCanvas();
      }
      return null;
    }

    setDepthMap(canvasOrDataUrl) {
      const de = this._getDepthEngine();
      if (de && typeof de.importDataURL === 'function') {
        return de.importDataURL(canvasOrDataUrl).then(() => {
          this.updateDepthTexture();
          this._emitChange('depthUpdated', { source: 'custom' });
        });
      }
      return Promise.resolve(false);
    }

    updateDepthTexture() {
      if (!this.gl || !this.depthTexture) return;
      const gl = this.gl;
      const depthCanvas = this.getDepthCanvas();
      if (!depthCanvas) return;

      gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, depthCanvas);
      } catch (e) {
        console.warn('[MotionEngine] Failed to upload depth texture:', e);
      }
    }

    // =======================================================================
    // CANVAS & HARDWARE INITIALIZATION (WebGL with Fallback to Canvas 2D)
    // =======================================================================
    attachCanvas(canvas, options = {}) {
      if (!canvas) return false;
      this.canvas = canvas;
      this.gl = null;
      this.ctx2d = null;
      this.isWebGL = false;

      try {
        const gl = canvas.getContext('webgl', {
          alpha: false,
          premultipliedAlpha: false,
          antialias: true,
          powerPreference: 'high-performance'
        }) || canvas.getContext('experimental-webgl');

        if (gl) {
          this.gl = gl;
          this.isWebGL = true;
          this._initWebGLResources();
        }
      } catch (err) {
        console.warn('[MotionEngine] WebGL context creation failed:', err);
      }

      if (!this.isWebGL) {
        try {
          this.ctx2d = canvas.getContext('2d');
          if (!this.fallbackNotified) {
            this.fallbackNotified = true;
            this._notifyFallback('WebGL không khả dụng, đang dùng bộ dựng Canvas 2D.');
          }
        } catch (e) {
          console.error('[MotionEngine] Failed to get 2D context:', e);
        }
      }

      // Auto-bind mousemove for parallax if running in browser
      if (this.canvas && this.canvas.addEventListener) {
        this.canvas.addEventListener('mousemove', (e) => {
          if (!this.config.parallaxMouse) return;
          const rect = this.canvas.getBoundingClientRect();
          const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
          const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
          this.setMousePos(nx, ny);
        });

        this.canvas.addEventListener('mouseleave', () => {
          this.setMousePos(0, 0);
        });
      }

      this.updateImageTexture();
      this.updateFlowTexture();
      this.updateDepthTexture();
      this._emitChange('attached', { isWebGL: this.isWebGL });
      return true;
    }

    _notifyFallback(msg) {
      console.warn(`[MotionEngine] ${msg}`);
      if (typeof window !== 'undefined' && typeof window.showStatus === 'function') {
        window.showStatus(`⚠️ ${msg}`);
      }
      this._emitChange('fallback', { message: msg });
    }

    _initWebGLResources() {
      const gl = this.gl;
      if (!gl) return;

      const compileShader = (type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          const info = gl.getShaderInfoLog(shader);
          gl.deleteShader(shader);
          throw new Error('Shader compilation failed: ' + info);
        }
        return shader;
      };

      const vs = compileShader(gl.VERTEX_SHADER, VS_SOURCE);
      const fs = compileShader(gl.FRAGMENT_SHADER, FS_SOURCE);

      const prg = gl.createProgram();
      gl.attachShader(prg, vs);
      gl.attachShader(prg, fs);
      gl.linkProgram(prg);

      if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(prg);
        gl.deleteProgram(prg);
        throw new Error('WebGL program link failed: ' + info);
      }
      this.shaderProgram = prg;

      // Full screen quad buffer
      const posBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]), gl.STATIC_DRAW);

      const posLoc = gl.getAttribLocation(prg, 'a_position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      this.imageTexture = gl.createTexture();
      this.flowTexture = gl.createTexture();
      this.depthTexture = gl.createTexture();
    }

    setImage(imgOrUrl) {
      if (!imgOrUrl) return Promise.reject(new Error('No image provided'));

      if (typeof imgOrUrl === 'string') {
        return new Promise((resolve, reject) => {
          if (typeof Image === 'undefined') {
            return resolve(false);
          }
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            this.currentImage = img;
            this.updateImageTexture();
            this.generateAutoDepth();
            this._emitChange('imageLoaded', img);
            resolve(img);
          };
          img.onerror = (err) => reject(err);
          img.src = imgOrUrl;
        });
      } else {
        this.currentImage = imgOrUrl;
        this.updateImageTexture();
        this.generateAutoDepth();
        this._emitChange('imageLoaded', imgOrUrl);
        return Promise.resolve(imgOrUrl);
      }
    }

    updateImageTexture() {
      if (!this.gl || !this.currentImage || !this.imageTexture) return;
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.currentImage);
      } catch (e) {
        console.warn('[MotionEngine] Failed to upload image texture:', e);
      }
    }

    // =======================================================================
    // VECTOR FIELD SYNTHESIS WITH DEPTH & ANTI-TEARING
    // =======================================================================
    updateFlowTexture() {
      if (!this.flowCtx || !this.flowCanvas) return;
      const w = this.flowCanvas.width;
      const h = this.flowCanvas.height;
      const ctx = this.flowCtx;

      const imgData = ctx.createImageData(w, h);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = 128;
        data[i + 1] = 128;
        data[i + 2] = 0;
        data[i + 3] = 0;
      }

      const activeLayers = this.config.layers.filter(l => l.visible !== false);
      if (activeLayers.length === 0) {
        ctx.putImageData(imgData, 0, 0);
        this._uploadFlowTextureToGL();
        return;
      }

      for (let py = 0; py < h; py++) {
        const ny = py / h;
        for (let px = 0; px < w; px++) {
          const nx = px / w;
          const idx = (py * w + px) * 4;

          let compositeDx = 0;
          let compositeDy = 0;
          let compositeSpeed = 0;
          let compositeWeight = 0;
          let maxPinInfluence = 1.0;

          for (const layer of activeLayers) {
            for (const pin of layer.pins || []) {
              const d = Math.hypot(nx - pin.x, ny - pin.y);
              const r = pin.radius || 0.08;
              if (d < r) {
                maxPinInfluence = 0.0;
                break;
              }
              const falloff = (d - r) / (r * 1.5);
              maxPinInfluence = Math.min(maxPinInfluence, Math.max(0.0, Math.min(1.0, falloff)));
            }

            if (maxPinInfluence <= 0.0) continue;

            const layerSpeed = layer.speed || 1.0;
            // Parallax depth scaling: foreground layers (depth ~ 1.0) displace with full amplitude, background layers scale down
            const layerDepth = typeof layer.depth === 'number' ? layer.depth : 0.5;
            const depthScale = 0.3 + 0.7 * Math.max(0, Math.min(1, layerDepth));
            let layerIntensity = (layer.intensity || 1.0) * depthScale;

            // Physics Anchor Restraint: anchor point stays fixed, displacement ramps up smoothly with distance
            if (layer.physics && layer.physics.enabled) {
              const pe = this._getPhysicsEngine();
              if (pe && typeof pe.getAnchorRestraint === 'function') {
                const { factor } = pe.getAnchorRestraint({ x: nx, y: ny }, layer.physics.anchor);
                layerIntensity *= factor;
              } else {
                const anchor = layer.physics.anchor || { x: 0.5, y: 0.1 };
                const distFromAnchor = Math.hypot(nx - anchor.x, ny - anchor.y);
                const anchorRestraint = Math.min(1.0, 1.0 - Math.exp(-4.0 * Math.max(0, distFromAnchor)));
                layerIntensity *= anchorRestraint;
              }
            }

            for (const arrow of layer.arrows || []) {
              const mx = (arrow.x1 + arrow.x2) / 2;
              const my = (arrow.y1 + arrow.y2) / 2;
              const d = Math.hypot(nx - mx, ny - my);
              const weight = 1.0 / Math.pow(Math.max(d, 0.04), 2.2);

              const adx = arrow.x2 - arrow.x1;
              const ady = arrow.y2 - arrow.y1;
              const alen = Math.hypot(adx, ady) || 1;

              compositeDx += (adx / alen) * weight * layerIntensity;
              compositeDy += (ady / alen) * weight * layerIntensity;
              compositeSpeed += (arrow.speed || 1.0) * weight * layerSpeed;
              compositeWeight += weight;
            }
          }

          if (compositeWeight > 0.001 && maxPinInfluence > 0.001) {
            compositeDx /= compositeWeight;
            compositeDy /= compositeWeight;
            compositeSpeed /= compositeWeight;

            const mag = Math.hypot(compositeDx, compositeDy);
            if (mag > 0.001) {
              const ndx = compositeDx / mag;
              const ndy = compositeDy / mag;

              data[idx] = Math.round(((ndx + 1) / 2) * 255);
              data[idx + 1] = Math.round(((ndy + 1) / 2) * 255);
              data[idx + 2] = Math.round(Math.min(255, compositeSpeed * 100));
              data[idx + 3] = Math.round(maxPinInfluence * 255);
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      this._uploadFlowTextureToGL();
    }

    _uploadFlowTextureToGL() {
      if (!this.gl || !this.flowCanvas || !this.flowTexture) return;
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.flowTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.flowCanvas);
    }

    // =======================================================================
    // PLAYBACK CONTROLS (play, pause, renderFrame, seamCheck, setCompare)
    // =======================================================================
    play() {
      if (this.isPlaying) return;
      this.isPlaying = true;
      this.lastFrameTime = getTimeMs();
      this._animLoop();
      this._emitChange('play');
    }

    pause() {
      this.isPlaying = false;
      if (this.animFrameId) {
        if (typeof cancelAnimationFrame !== 'undefined') {
          cancelAnimationFrame(this.animFrameId);
        }
        this.animFrameId = null;
      }
      this._emitChange('pause');
    }

    _animLoop() {
      if (!this.isPlaying) return;
      const now = getTimeMs();
      let delta = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;

      if (delta > 0.1) delta = 0.1;

      const speedMultiplier = (this.isSeamCheckMode ? 0.15 : 1.0) * this.getSpeedMultiplier();
      this.currentTime += delta * speedMultiplier;

      this.renderFrame(this.currentTime);

      if (typeof requestAnimationFrame !== 'undefined') {
        this.animFrameId = requestAnimationFrame(() => this._animLoop());
      }
    }

    renderFrame(arg1 = 0, arg2, arg3) {
      if (arg1 && typeof arg1 === 'object') {
        renderLayerMotion(arg1, arg2, arg3);
        return { rendered: true, isWebGL: false };
      }
      return this._renderFrameEngine(arg1);
    }

    _renderFrameEngine(t = 0) {
      if (typeof t === 'number') this.currentTime = t;
      this._updateTypingFactor();

      if (this.isWebGL && this.gl && this.shaderProgram) {
        return this._renderWebGLFrame(this.currentTime);
      }

      if (this.ctx2d && this.canvas) {
        return this._render2DFallbackFrame(this.currentTime);
      }

      return { timestamp: this.currentTime, rendered: true, isPlaying: this.isPlaying, isWebGL: this.isWebGL };
    }

    _renderWebGLFrame(timeSec) {
      const gl = this.gl;
      const w = this.canvas.width || 800;
      const h = this.canvas.height || 600;

      gl.viewport(0, 0, w, h);
      gl.useProgram(this.shaderProgram);

      // Active units
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
      gl.uniform1i(gl.getUniformLocation(this.shaderProgram, 'u_image'), 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.flowTexture);
      gl.uniform1i(gl.getUniformLocation(this.shaderProgram, 'u_flow'), 1);

      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
      gl.uniform1i(gl.getUniformLocation(this.shaderProgram, 'u_depth'), 2);

      // Intensity preset multipliers (tinh-te: 0.4x, vua: 1.0x, manh: 1.8x) modulated by Focus Shield (typingFactor)
      let intensityMult = this.getIntensityMultiplier() * this.typingFactor;
      let speedMult = this.getSpeedMultiplier();

      if (this.reducedMotion) {
        intensityMult *= 0.25;
        speedMult *= 0.3;
      }

      const adv = this.config.advanced || {};
      const loopPeriodSec = (this.config.loopPeriodMs || 4000) / 1000;

      let effectivePhaseLag = adv.phaseLag || 0.5;
      const activePhysicsLayer = this.config.layers.find(l => l.visible !== false && l.physics && l.physics.enabled);
      if (activePhysicsLayer) {
        const pe = this._getPhysicsEngine();
        if (pe && typeof pe.getEffectivePhaseLag === 'function') {
          effectivePhaseLag = pe.getEffectivePhaseLag(activePhysicsLayer, effectivePhaseLag);
        } else if (typeof activePhysicsLayer.physics.lag === 'number') {
          effectivePhaseLag += activePhysicsLayer.physics.lag * 0.8;
        }
      }

      // Set Uniforms
      gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_time'), timeSec);
      gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_loopPeriod'), loopPeriodSec);
      gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_naturalness'), (this.config.naturalness || 50) / 100);
      gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_waves'), adv.waves || 3);
      gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_freq'), adv.freq || 1.0);
      gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_noiseAmp'), adv.noise || 0.2);
      gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_phaseLag'), effectivePhaseLag);
      gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_compareRatio'), this.compareRatio !== null ? this.compareRatio : -1.0);
      gl.uniform2f(gl.getUniformLocation(this.shaderProgram, 'u_resolution'), w, h);
      gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_maxShift'), 25.0);
      gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_feather'), 15.0);
      gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_intensity'), intensityMult);
      gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_speed'), speedMult);
      gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_seamCheck'), this.isSeamCheckMode ? 1.0 : 0.0);
      gl.uniform2f(gl.getUniformLocation(this.shaderProgram, 'u_mouseOffset'), this.mousePos.x, this.mousePos.y);
      gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_useMouseParallax'), this.config.parallaxMouse ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      return {
        timestamp: timeSec,
        rendered: true,
        isPlaying: this.isPlaying,
        isWebGL: true,
        compareRatio: this.compareRatio
      };
    }

    _render2DFallbackFrame(timeSec) {
      const ctx = this.ctx2d;
      const w = this.canvas.width;
      const h = this.canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (!this.currentImage) {
        ctx.fillStyle = '#1e1e2e';
        ctx.fillRect(0, 0, w, h);
        return { timestamp: timeSec, rendered: true, isWebGL: false };
      }

      const loopPeriodSec = (this.config.loopPeriodMs || 4000) / 1000;
      const adv = this.config.advanced || {};
      const intensityMult = this.getIntensityMultiplier() * this.typingFactor;

      let disp = calculateDisplacement({
        timeSec,
        loopPeriodSec,
        x: 0.5,
        y: 0.5,
        waves: adv.waves || 3,
        freq: adv.freq || 1.0,
        phaseLag: adv.phaseLag || 0.5,
        naturalness: this.config.naturalness,
        noiseAmp: adv.noise || 0.2,
        simplexNoise: this.noiseGen
      });

      // Modulate displacement when physics is enabled on any active layer (bypassed in seam check mode to guarantee 0-jerk seam per D-007)
      const pe = this._getPhysicsEngine();
      let physicsShiftX = 0;
      let physicsShiftY = 0;
      const physicsLayer = (!this.isSeamCheckMode) && this.config.layers.find(l => l.visible !== false && l.physics && l.physics.enabled);
      if (physicsLayer && pe && typeof pe.applyPhysics === 'function') {
        const physRes = pe.applyPhysics({ x: 0.5, y: 0.5 }, physicsLayer, timeSec, this.config.loopPeriodMs || 4000, disp);
        physicsShiftX = physRes.dx;
        physicsShiftY = physRes.dy;
        disp = physRes.displacement;
      }

      // Compute individual layer motion (GIAI ĐOẠN 2 & 3: Thở, Đung đưa, Trôi, Gợn có Safe Zones & Focus Shield)
      let layerShiftX = 0;
      let layerShiftY = 0;
      const activeMotionLayer = this.config.layers.find(l => l.visible !== false && (l.motionType || (l.motion && l.motion.type)));
      if (activeMotionLayer) {
        const lm = calculateLayerMotion({
          layer: activeMotionLayer,
          x: 0.5,
          y: 0.5,
          timeSec,
          loopPeriodSec: (activeMotionLayer.loopSec || loopPeriodSec),
          imageWidth: w,
          imageHeight: h,
          simplexNoise: this.noiseGen,
          safeZones: this.safeZones,
          calmFactor: this.typingFactor,
          safeZoneMode: this.safeZoneMode
        });
        layerShiftX = lm.dx;
        layerShiftY = lm.dy;
      }

      // Mouse Parallax offset in 2D
      let mouseShiftX = 0;
      let mouseShiftY = 0;
      if (this.config.parallaxMouse) {
        mouseShiftX = this.mousePos.x * 12.0;
        mouseShiftY = this.mousePos.y * 12.0;
      }

      const shiftX = Math.round(disp * 8.0 * intensityMult + mouseShiftX + physicsShiftX * 0.5 + layerShiftX);
      const shiftY = Math.round(disp * 4.0 * intensityMult + mouseShiftY + physicsShiftY * 0.5 + layerShiftY);

      if (this.compareRatio !== null && this.compareRatio >= 0 && this.compareRatio <= 1) {
        const splitX = Math.round(w * this.compareRatio);

        // Left: Original static image (Before)
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitX, h);
        ctx.clip();
        ctx.drawImage(this.currentImage, mouseShiftX, mouseShiftY, w, h);
        ctx.restore();

        // Right: Motion wave (After)
        ctx.save();
        ctx.beginPath();
        ctx.rect(splitX, 0, w - splitX, h);
        ctx.clip();
        ctx.drawImage(this.currentImage, shiftX, shiftY, w, h);
        ctx.restore();

        // Split Divider line
        ctx.beginPath();
        ctx.moveTo(splitX, 0);
        ctx.lineTo(splitX, h);
        ctx.strokeStyle = '#7DCFFF';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#7DCFFF';
        ctx.shadowBlur = 8;
        ctx.stroke();
      } else {
        ctx.drawImage(this.currentImage, shiftX, shiftY, w, h);
      }

      if (this.isSeamCheckMode) {
        ctx.beginPath();
        ctx.arc(w - 25, 25, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#FFCC00';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      return {
        timestamp: timeSec,
        rendered: true,
        isPlaying: this.isPlaying,
        isWebGL: false,
        compareRatio: this.compareRatio
      };
    }

    // =======================================================================
    // SEAM CHECK (Periodic Continuity Verification)
    // =======================================================================
    seamCheck(options = {}) {
      this.isSeamCheckMode = !this.isSeamCheckMode;
      const periodSec = (this.config.loopPeriodMs || 4000) / 1000;
      const continuity = this.analyzeLoopContinuity(periodSec);

      this._emitChange('seamCheck', {
        isSeamCheck: this.isSeamCheckMode,
        seamless: continuity.seamless,
        maxDiscontinuity: continuity.maxDelta
      });

      return {
        isSeamCheck: this.isSeamCheckMode,
        seamRatio: 0.0,
        seamless: continuity.seamless,
        maxDiscontinuity: continuity.maxDelta,
        periodMs: this.config.loopPeriodMs
      };
    }

    analyzeLoopContinuity(periodSec = 4.0) {
      const samplePoints = [
        { x: 0.1, y: 0.1 },
        { x: 0.5, y: 0.5 },
        { x: 0.9, y: 0.9 },
        { x: 0.25, y: 0.75 },
        { x: 0.75, y: 0.25 }
      ];

      let maxPosDelta = 0;
      let maxVelDelta = 0;
      const dt = 0.0001;
      const T = periodSec;

      const nat = this.config.naturalness;
      const adv = this.config.advanced || {};
      const waves = adv.waves || 3;
      const freq = adv.freq || 1.0;
      const phaseLag = adv.phaseLag || 0.5;
      const noiseAmp = adv.noise || 0.2;

      for (const pt of samplePoints) {
        const val0 = calculateDisplacement({
          timeSec: 0,
          loopPeriodSec: T,
          x: pt.x,
          y: pt.y,
          waves,
          freq,
          phaseLag,
          naturalness: nat,
          noiseAmp,
          simplexNoise: this.noiseGen
        });

        const valT = calculateDisplacement({
          timeSec: T,
          loopPeriodSec: T,
          x: pt.x,
          y: pt.y,
          waves,
          freq,
          phaseLag,
          naturalness: nat,
          noiseAmp,
          simplexNoise: this.noiseGen
        });

        const dPos = Math.abs(val0 - valT);
        if (dPos > maxPosDelta) maxPosDelta = dPos;

        // Central difference derivative at t = 0
        const val0Plus = calculateDisplacement({
          timeSec: dt,
          loopPeriodSec: T,
          x: pt.x,
          y: pt.y,
          waves,
          freq,
          phaseLag,
          naturalness: nat,
          noiseAmp,
          simplexNoise: this.noiseGen
        });
        const val0Minus = calculateDisplacement({
          timeSec: -dt,
          loopPeriodSec: T,
          x: pt.x,
          y: pt.y,
          waves,
          freq,
          phaseLag,
          naturalness: nat,
          noiseAmp,
          simplexNoise: this.noiseGen
        });
        const vel0 = (val0Plus - val0Minus) / (2 * dt);

        // Central difference derivative at t = T
        const valTPlus = calculateDisplacement({
          timeSec: T + dt,
          loopPeriodSec: T,
          x: pt.x,
          y: pt.y,
          waves,
          freq,
          phaseLag,
          naturalness: nat,
          noiseAmp,
          simplexNoise: this.noiseGen
        });
        const valTMinus = calculateDisplacement({
          timeSec: T - dt,
          loopPeriodSec: T,
          x: pt.x,
          y: pt.y,
          waves,
          freq,
          phaseLag,
          naturalness: nat,
          noiseAmp,
          simplexNoise: this.noiseGen
        });
        const velT = (valTPlus - valTMinus) / (2 * dt);

        const dVel = Math.abs(vel0 - velT);
        if (dVel > maxVelDelta) maxVelDelta = dVel;
      }

      return {
        seamless: maxPosDelta < 1e-4 && maxVelDelta < 1e-3,
        maxDelta: maxPosDelta,
        maxVelDelta: maxVelDelta
      };
    }

    // =======================================================================
    // BEFORE / AFTER COMPARE SPLIT SCREEN
    // =======================================================================
    setCompare(ratio = null) {
      if (ratio === null || ratio === undefined || ratio < 0) {
        this.compareRatio = null;
      } else {
        this.compareRatio = Math.max(0.0, Math.min(1.0, Number(ratio)));
      }

      this._emitChange('compare', { ratio: this.compareRatio });
      if (!this.isPlaying) {
        this.renderFrame(this.currentTime);
      }
      return this.compareRatio;
    }

    // =======================================================================
    // APPLY TO ANTIGRAVITY PREVIEW
    // =======================================================================
    applyToPreview() {
      const cfg = this.getConfig();
      if (typeof window !== 'undefined') {
        if (window.appState) {
          window.appState.motionFlow = cfg;
        }
        if (typeof window.saveConfig === 'function') {
          window.saveConfig().catch(e => console.error(e));
        }
        if (typeof window.showStatus === 'function') {
          window.showStatus('✓ Đã áp dụng hiệu ứng chuyển động vào Antigravity Preview');
        }
        if (window.StudioEvents && typeof window.StudioEvents.emit === 'function') {
          window.StudioEvents.emit('motion:apply', cfg);
        }
      }
      return cfg;
    }

    // =======================================================================
    // GIAI ĐOẠN 6: ATTACHMENT POINTS (setPhysics & suggestRegions)
    // =======================================================================
    setPhysics(layerId, physicsCfg) {
      const layer = this.config.layers.find(l => l.id === layerId);
      if (layer) {
        layer.physics = Object.assign({
          enabled: true,
          anchor: { x: 0.5, y: 0.1 },
          stiffness: 1.0,
          damping: 0.8,
          lag: 0.3
        }, physicsCfg);
        this.updateFlowTexture();
        this._emitChange('physics', { layerId, physics: layer.physics });
        return layer.physics;
      }
      return null;
    }

    async suggestRegions() {
      const se = this._getSegmentEngine();
      if (se && typeof se.suggestRegions === 'function') {
        const regions = await se.suggestRegions(this.currentImage);
        return regions;
      }
      return [];
    }

    // =======================================================================
    // EVENT BUS
    // =======================================================================
    on(eventOrFn, fn) {
      if (typeof eventOrFn === 'function') {
        this.listeners.push({ event: '*', fn: eventOrFn });
      } else if (typeof fn === 'function') {
        this.listeners.push({ event: eventOrFn, fn });
      }
    }

    off(eventOrFn, fn) {
      if (typeof eventOrFn === 'function') {
        this.listeners = this.listeners.filter(l => l.fn !== eventOrFn);
      } else {
        this.listeners = this.listeners.filter(l => !(l.event === eventOrFn && (!fn || l.fn === fn)));
      }
    }

    _emitChange(type = 'change', data = null) {
      for (const listener of this.listeners) {
        try {
          if (listener.event === '*' || listener.event === type) {
            listener.fn(type, data || this.config);
          }
        } catch (e) {
          console.error('[MotionEngine] Listener error:', e);
        }
      }
    }

    // =======================================================================
    // GIAI ĐOẠN 3: VISUAL LOAD, SAFE ZONES & FOCUS SHIELD (D-008 & D-009)
    // =======================================================================
    getTimeMs() {
      return getTimeMs();
    }

    _updateTypingFactor() {
      if (!this.focusShieldEnabled) {
        this.typingFactor = 1.0;
        return;
      }
      const now = getTimeMs();
      const cfg = getMotionCFG();
      const minFactor = (cfg.calm && typeof cfg.calm.typingFactor === 'number') ? cfg.calm.typingFactor : 0.2;
      const recoverMs = (cfg.calm && typeof cfg.calm.recoverMs === 'number') ? cfg.calm.recoverMs : 3000;
      const tau = (cfg.calm && typeof cfg.calm.tau === 'number') ? cfg.calm.tau : 0.5;

      if (this.isTyping) {
        this.typingFactor = minFactor;
      } else if (this.lastTypingTime > 0) {
        const elapsed = Math.max(0, now - this.lastTypingTime);
        if (elapsed < recoverMs) {
          this.typingFactor = minFactor;
        } else {
          const recoverSec = (elapsed - recoverMs) / 1000.0;
          const alpha = 1.0 - Math.exp(-recoverSec / tau);
          this.typingFactor = minFactor + (1.0 - minFactor) * Math.min(1.0, alpha);
        }
      } else {
        this.typingFactor = 1.0;
      }
    }

    setTypingState(isTyping) {
      this.isTyping = !!isTyping;
      this.lastTypingTime = getTimeMs();
      if (this.isTyping) {
        if (this.focusShieldEnabled) {
          const cfg = getMotionCFG();
          this.typingFactor = (cfg.calm && typeof cfg.calm.typingFactor === 'number') ? cfg.calm.typingFactor : 0.2;
        }
      }
      this._emitChange('typing', { isTyping: this.isTyping, factor: this.typingFactor });
    }

    getTypingFactor() {
      this._updateTypingFactor();
      return this.typingFactor;
    }

    setFocusShieldEnabled(enabled) {
      this.focusShieldEnabled = !!enabled;
      if (!this.focusShieldEnabled) {
        this.typingFactor = 1.0;
      }
      this._emitChange('focusShield', { enabled: this.focusShieldEnabled });
    }

    isFocusShieldEnabled() {
      return this.focusShieldEnabled;
    }

    measureLivePreviewSafeZones(previewWindowEl = null) {
      const doc = (typeof document !== 'undefined') ? document : null;
      const win = previewWindowEl || (doc ? ((typeof doc.getElementById === 'function' ? doc.getElementById('previewWindow') : null) || (typeof doc.querySelector === 'function' ? doc.querySelector('.preview-window') : null)) : null);

      if (!win || !doc || typeof win.getBoundingClientRect !== 'function') {
        return [
          { id: 'sidebar', name: 'Thanh bên (Sidebar)', x: 0.0, y: 0.05, width: 0.28, height: 0.95, enabled: true },
          { id: 'chat', name: 'Khung chat & Lời thoại', x: 0.30, y: 0.08, width: 0.68, height: 0.65, enabled: true },
          { id: 'composer', name: 'Ô nhập lệnh (Composer)', x: 0.30, y: 0.75, width: 0.68, height: 0.22, enabled: true },
          { id: 'code', name: 'Vùng soạn thảo / Code', x: 0.32, y: 0.35, width: 0.64, height: 0.35, enabled: true }
        ];
      }

      const winRect = win.getBoundingClientRect();
      if (!winRect || winRect.width <= 0 || winRect.height <= 0) {
        return [
          { id: 'sidebar', name: 'Thanh bên (Sidebar)', x: 0.0, y: 0.05, width: 0.28, height: 0.95, enabled: true },
          { id: 'chat', name: 'Khung chat & Lời thoại', x: 0.30, y: 0.08, width: 0.68, height: 0.65, enabled: true },
          { id: 'composer', name: 'Ô nhập lệnh (Composer)', x: 0.30, y: 0.75, width: 0.68, height: 0.22, enabled: true },
          { id: 'code', name: 'Vùng soạn thảo / Code', x: 0.32, y: 0.35, width: 0.64, height: 0.35, enabled: true }
        ];
      }

      const toRel = (rect) => {
        const rx = Math.max(0, Math.min(1, (rect.left - winRect.left) / winRect.width));
        const ry = Math.max(0, Math.min(1, (rect.top - winRect.top) / winRect.height));
        const rw = Math.max(0, Math.min(1 - rx, rect.width / winRect.width));
        const rh = Math.max(0, Math.min(1 - ry, rect.height / winRect.height));
        return { x: Number(rx.toFixed(3)), y: Number(ry.toFixed(3)), width: Number(rw.toFixed(3)), height: Number(rh.toFixed(3)) };
      };

      const zones = [];
      const sbEl = doc.getElementById('previewSidebar') || doc.querySelector('.preview-sidebar');
      if (sbEl && typeof sbEl.getBoundingClientRect === 'function') {
        const r = toRel(sbEl.getBoundingClientRect());
        zones.push({ id: 'sidebar', name: 'Thanh bên (Sidebar)', ...r, enabled: true });
      }

      const chatEl = doc.querySelector('.chat-sample-area') || doc.getElementById('previewChat');
      if (chatEl && typeof chatEl.getBoundingClientRect === 'function') {
        const r = toRel(chatEl.getBoundingClientRect());
        zones.push({ id: 'chat', name: 'Khung chat & Lời thoại', ...r, enabled: true });
      }

      const compEl = doc.getElementById('previewComposer') || doc.querySelector('.preview-composer');
      if (compEl && typeof compEl.getBoundingClientRect === 'function') {
        const r = toRel(compEl.getBoundingClientRect());
        zones.push({ id: 'composer', name: 'Ô nhập lệnh (Composer)', ...r, enabled: true });
      }

      const codeEl = doc.querySelector('.code-snippet-body') || doc.querySelector('pre.code-snippet-body');
      if (codeEl && typeof codeEl.getBoundingClientRect === 'function') {
        const r = toRel(codeEl.getBoundingClientRect());
        zones.push({ id: 'code', name: 'Vùng soạn thảo / Code', ...r, enabled: true });
      }

      return zones.length > 0 ? zones : [
        { id: 'sidebar', name: 'Thanh bên (Sidebar)', x: 0.0, y: 0.05, width: 0.28, height: 0.95, enabled: true },
        { id: 'chat', name: 'Khung chat & Lời thoại', x: 0.30, y: 0.08, width: 0.68, height: 0.65, enabled: true },
        { id: 'composer', name: 'Ô nhập lệnh (Composer)', x: 0.30, y: 0.75, width: 0.68, height: 0.22, enabled: true },
        { id: 'code', name: 'Vùng soạn thảo / Code', x: 0.32, y: 0.35, width: 0.64, height: 0.35, enabled: true }
      ];
    }

    setSafeZones(zones) {
      if (Array.isArray(zones)) {
        this.safeZones = zones;
        this._emitChange('safezones', { zones: this.safeZones });
      }
      return this.safeZones;
    }

    getSafeZones() {
      return this.safeZones;
    }

    getSafeZoneFactor(x, y) {
      const cfg = getMotionCFG();
      const featherNorm = (cfg.safe && typeof cfg.safe.featherPermille === 'number')
        ? (cfg.safe.featherPermille / 1000.0)
        : 0.012;
      const minAtten = (cfg.calm && typeof cfg.calm.typingFactor === 'number')
        ? cfg.calm.typingFactor
        : 0.2;
      const insideAtten = this.safeZoneMode === 'freeze' ? 0.0 : minAtten;

      let safeMultiplier = 1.0;
      for (const zone of this.safeZones) {
        if (!zone || zone.enabled === false) continue;
        const zx1 = zone.x;
        const zy1 = zone.y;
        const zx2 = zone.x + zone.width;
        const zy2 = zone.y + zone.height;

        if (x >= zx1 && x <= zx2 && y >= zy1 && y <= zy2) {
          safeMultiplier = Math.min(safeMultiplier, insideAtten);
        } else if (featherNorm > 0) {
          const dxDist = Math.max(0, Math.max(zx1 - x, x - zx2));
          const dyDist = Math.max(0, Math.max(zy1 - y, y - zy2));
          const dist = Math.hypot(dxDist, dyDist);
          if (dist < featherNorm) {
            const u = dist / featherNorm;
            const smoothU = u * u * (3.0 - 2.0 * u);
            const factor = insideAtten + (1.0 - insideAtten) * smoothU;
            safeMultiplier = Math.min(safeMultiplier, factor);
          }
        }
      }
      return safeMultiplier;
    }

    getVisualLoad(layers = null) {
      return calculateVisualLoad(layers || this.config.layers, getMotionCFG());
    }

    reduceExcessLayers(maxActive = null) {
      const cfg = getMotionCFG();
      const limit = typeof maxActive === 'number' ? maxActive : ((cfg.load && cfg.load.maxActive) || 3);
      const layers = this.config.layers;
      const active = layers.filter(l => l.visible !== false);

      if (active.length <= limit) return [];

      const excess = active.slice(limit);
      excess.forEach(l => {
        l.visible = false;
      });
      this.updateFlowTexture();
      this._emitChange('layers', this.config.layers);
      return excess;
    }

    destroy() {
      this.pause();
      if (this.gl && this.shaderProgram) {
        try {
          this.gl.deleteProgram(this.shaderProgram);
          if (this.imageTexture) this.gl.deleteTexture(this.imageTexture);
          if (this.flowTexture) this.gl.deleteTexture(this.flowTexture);
          if (this.depthTexture) this.gl.deleteTexture(this.depthTexture);
        } catch (e) {}
      }
      this.listeners = [];
    }
  }

  const instance = new MotionEngineCore();
  instance.MotionEngineCore = MotionEngineCore;
  instance.SimplexNoise2D = SimplexNoise2D;
  instance.calculateDisplacement = calculateDisplacement;
  instance.calculateLayerMotion = calculateLayerMotion;
  instance.calculateVisualLoad = calculateVisualLoad;
  instance.getTimeMs = getTimeMs;
  instance.MOTION_LIMITS = MOTION_LIMITS;
  instance.LOOP = LOOP;
  function testMotion() {
    if (typeof initProject === 'function' && typeof makeCanvas === 'function') initProject(makeCanvas(1000, 1000));
    const bad = [];
    for (const t of ['breathe', 'sway', 'drift', 'ripple']) {
      const L = typeof addLayer === 'function' ? addLayer(t) : { id: 1, name: t, opacity: 1, canvas: (typeof makeCanvas === 'function' ? makeCanvas(1000, 1000) : null) };
      L.motion = Object.assign(defaultMotion(t), { amp: 99, cycles: 3, chaos: 0.9 });
      const a = motionVector(L, 0), b = motionVector(L, 1);
      if (a.some((v, i) => Math.abs(v - b[i]) > 1e-6)) bad.push('loop ' + t);
      const cap = ampPx(t, 99) + 1e-6;
      for (let u = 0; u < 1; u += 0.05) if (motionVector(L, u).some(v => Math.abs(v) > cap)) { bad.push('cap ' + t); break; }
    }
    LOOP.seconds = 10; Clock.u = 0; Clock.speed = 0.5; Clock.playing = true; tickClock(10);
    if (Math.abs(Clock.u - 0.5) > 1e-9) bad.push('clock'); Clock.speed = 1; Clock.u = 0;
    if (typeof makeCanvas === 'function') {
      const o = makeCanvas(1000, 1000).getContext('2d');
      try { renderFrame(o, 0.3); } catch (e) { bad.push('render ' + e.message); }
    }
    console.log(bad.length ? 'FAIL motion ' + bad : 'PASS motion');
    return bad.length === 0;
  }

  function testUnits() {
    const mk = size => {
      if (typeof initProject === 'function' && typeof makeCanvas === 'function') initProject(makeCanvas(size, size));
      const L = typeof addLayer === 'function' ? addLayer('a') : { id: 1, name: 'a', opacity: 1, canvas: (typeof makeCanvas === 'function' ? makeCanvas(size, size) : null) };
      L.motion = Object.assign(defaultMotion('drift'), { amp: 2, angle: 0, cycles: 1, chaos: 0, phase: 0 });
      return motionVector(L, 0.25)[0];
    };
    const a = mk(1000), b = mk(2000);
    const ok = Math.abs(a - 2) < 1e-6 && Math.abs(b - 4) < 1e-6;
    console.log(ok ? 'PASS units' : 'FAIL units ' + [a, b]);
    return ok;
  }

  function testSetMotion() {
    if (typeof initProject === 'function' && typeof makeCanvas === 'function') initProject(makeCanvas(100, 100));
    const L = typeof addLayer === 'function' ? addLayer('test') : { id: 1, name: 'test', opacity: 1, canvas: (typeof makeCanvas === 'function' ? makeCanvas(100, 100) : null) };
    setMotion(L, { type: 'breathe', amp: 99, cycles: 99, chaos: 99 });
    const m = L.motion;
    const ok = m.type === 'breathe' && m.amp === CFG.motion.limit.breathe && m.cycles === CFG.motion.cyclesMax && m.chaos === CFG.motion.chaosMax;
    console.log(ok ? 'PASS setMotion' : 'FAIL setMotion');
    return ok;
  }

  instance.defaultMotion = defaultMotion;
  instance.activeMotion = activeMotion;
  instance.motionSignal = motionSignal;
  instance.layerTransform = layerTransform;
  instance.motionVector = motionVector;
  instance.drawLayerMotion = drawLayerMotion;
  instance.setMotion = setMotion;
  instance.Clock = Clock;
  instance.tickClock = tickClock;
  instance.renderFrame = renderFrame;
  instance.testMotion = testMotion;
  instance.testUnits = testUnits;
  instance.testSetMotion = testSetMotion;

  if (typeof window !== 'undefined') {
    window.MOTION_LIMITS = MOTION_LIMITS;
    window.LOOP = LOOP;
    window.defaultMotion = defaultMotion;
    window.activeMotion = activeMotion;
    window.motionSignal = motionSignal;
    window.layerTransform = layerTransform;
    window.motionVector = motionVector;
    window.drawLayerMotion = drawLayerMotion;
    window.setMotion = setMotion;
    window.Clock = Clock;
    window.tickClock = tickClock;
    window.renderFrame = renderFrame;
    window.testMotion = testMotion;
    window.testUnits = testUnits;
    window.testSetMotion = testSetMotion;
  }

  if (typeof global !== 'undefined') {
    global.MOTION_LIMITS = MOTION_LIMITS;
    global.LOOP = LOOP;
    global.defaultMotion = defaultMotion;
    global.activeMotion = activeMotion;
    global.motionSignal = motionSignal;
    global.layerTransform = layerTransform;
    global.motionVector = motionVector;
    global.drawLayerMotion = drawLayerMotion;
    global.setMotion = setMotion;
    global.Clock = Clock;
    global.tickClock = tickClock;
    global.renderFrame = renderFrame;
    global.testMotion = testMotion;
    global.testUnits = testUnits;
    global.testSetMotion = testSetMotion;
  }

  return instance;
});
