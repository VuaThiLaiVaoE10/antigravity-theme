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

  // High-precision clock
  const getTimeMs = () => {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  };

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
          depth: typeof l.depth === 'number' ? Math.max(0, Math.min(1, l.depth)) : 0.5
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

    renderFrame(t = 0) {
      if (typeof t === 'number') this.currentTime = t;

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

      // Intensity preset multipliers (tinh-te: 0.4x, vua: 1.0x, manh: 1.8x)
      let intensityMult = this.getIntensityMultiplier();
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
      const intensityMult = this.getIntensityMultiplier();

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

      // Modulate displacement when physics is enabled on any active layer
      const pe = this._getPhysicsEngine();
      let physicsShiftX = 0;
      let physicsShiftY = 0;
      const physicsLayer = this.config.layers.find(l => l.visible !== false && l.physics && l.physics.enabled);
      if (physicsLayer && pe && typeof pe.applyPhysics === 'function') {
        const physRes = pe.applyPhysics({ x: 0.5, y: 0.5 }, physicsLayer, timeSec, this.config.loopPeriodMs || 4000, disp);
        physicsShiftX = physRes.dx;
        physicsShiftY = physRes.dy;
        disp = physRes.displacement;
      }

      // Mouse Parallax offset in 2D
      let mouseShiftX = 0;
      let mouseShiftY = 0;
      if (this.config.parallaxMouse) {
        mouseShiftX = this.mousePos.x * 12.0;
        mouseShiftY = this.mousePos.y * 12.0;
      }

      const shiftX = Math.round(disp * 8.0 * intensityMult + mouseShiftX + physicsShiftX * 0.5);
      const shiftY = Math.round(disp * 4.0 * intensityMult + mouseShiftY + physicsShiftY * 0.5);

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

  return instance;
});
