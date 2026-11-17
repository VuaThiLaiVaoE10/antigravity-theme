/**
 * motion-ui.js - Motion UI (Giao diện điều khiển chuyển động, danh sách lớp & Parallax Depth)
 * GIAI ĐOẠN 2 & GIAI ĐOẠN 3 (ĐỢT 3)
 * 
 * Strict Data Contract (STATUS.md Section 3.1 & 3.2):
 * - Layer: { id, name, color, visible, locked, mask, arrows, pins, speed, intensity, direction, feather, maxShift, depth }
 * - MotionConfig: { layers, naturalness, loopPeriodMs, intensityPreset, parallaxMouse, advanced }
 * 
 * Delivered Features (ĐỢT 3):
 * 1. Thanh chọn cường độ nhanh "Tinh tế / Vừa / Mạnh" (mặc định 'vua').
 *    Các tham số sóng chi tiết gom vào mục <details> "Nâng cao" thu gọn (mặc định đóng).
 * 2. Thanh trượt "Độ sâu" (Depth: 0.0 xa .. 1.0 gần) cho từng lớp trong layer list.
 * 3. Công tắc "Parallax theo chuột", nút "Gợi ý độ sâu tự động" và công cụ cọ tô độ sâu (Depth Brush).
 * 4. Thanh trượt so sánh Trước / Sau (Before / After slider 0..100%) và nút bật/tắt nhanh vạch chia.
 * 5. Ghép nối trực tiếp các lệnh UI với MotionEngine và DepthEngine:
 *    - Chọn preset -> MotionEngine.setConfig({ intensityPreset })
 *    - Kéo thanh so sánh -> MotionEngine.setCompare(ratio)
 *    - Bấm gợi ý độ sâu -> DepthEngine.generateAutoDepth(image) và cập nhật layer.depth
 *    - Rê chuột -> MotionEngine.setMousePos(nx, ny)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MotionUI = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const getCFG = () => {
    if (typeof CFG !== 'undefined' && CFG && CFG.motion) return CFG;
    if (typeof CFG !== 'undefined' && CFG && CFG.motion) return CFG;
    if (typeof window !== 'undefined' && window.CFG && window.CFG.motion) return window.CFG;
    if (typeof global !== 'undefined' && global.CFG && global.CFG.motion) return global.CFG;
    try {
      if (typeof require !== 'undefined') return require('./config.js').CFG;
    } catch (e) {}
    return (typeof window !== 'undefined' && window.CFG) ? window.CFG : ((typeof global !== 'undefined' && global.CFG) ? global.CFG : null);
  };

  const LAYER_PALETTE = ['#7DCFFF', '#73DACA', '#FF9E64', '#BB9AF7', '#E0AF68', '#F7768E', '#2AC3DE'];

  // Preset Layer Templates
  const PRESET_LAYERS = {
    'hair-wind': {
      name: 'Tóc bay',
      color: '#7DCFFF',
      motionType: 'sway',
      amplitude: 1.2,
      chaos: 0.15,
      loopSec: 12,
      anchor: { x: 0.5, y: 0.15 },
      speed: 1.2,
      intensity: 1.4,
      direction: 15,
      feather: 12,
      maxShift: 24,
      depth: 0.85,
      arrows: [
        { x1: 0.45, y1: 0.20, x2: 0.78, y2: 0.18, speed: 1.3 },
        { x1: 0.55, y1: 0.28, x2: 0.88, y2: 0.26, speed: 1.5 },
        { x1: 0.58, y1: 0.40, x2: 0.92, y2: 0.42, speed: 1.6 },
        { x1: 0.52, y1: 0.55, x2: 0.85, y2: 0.60, speed: 1.4 },
        { x1: 0.30, y1: 0.32, x2: 0.42, y2: 0.28, speed: 1.1 }
      ],
      pins: [
        { x: 0.48, y: 0.38, radius: 0.08 },
        { x: 0.48, y: 0.62, radius: 0.08 },
        { x: 0.46, y: 0.25, radius: 0.06 }
      ]
    },
    'waterfall': {
      name: 'Suối nước',
      color: '#73DACA',
      motionType: 'ripple',
      amplitude: 1.5,
      chaos: 0.15,
      loopSec: 12,
      anchor: { x: 0.5, y: 0.10 },
      speed: 1.8,
      intensity: 2.0,
      direction: 90,
      feather: 15,
      maxShift: 30,
      depth: 0.35,
      arrows: [
        { x1: 0.50, y1: 0.12, x2: 0.50, y2: 0.42, speed: 1.8 },
        { x1: 0.50, y1: 0.42, x2: 0.50, y2: 0.78, speed: 2.0 },
        { x1: 0.44, y1: 0.22, x2: 0.44, y2: 0.62, speed: 1.6 },
        { x1: 0.56, y1: 0.22, x2: 0.56, y2: 0.62, speed: 1.6 },
        { x1: 0.50, y1: 0.78, x2: 0.50, y2: 0.95, speed: 1.4 }
      ],
      pins: [
        { x: 0.20, y: 0.25, radius: 0.08 },
        { x: 0.20, y: 0.65, radius: 0.08 },
        { x: 0.80, y: 0.25, radius: 0.08 },
        { x: 0.80, y: 0.65, radius: 0.08 }
      ]
    },
    'clouds': {
      name: 'Mây trôi',
      color: '#BB9AF7',
      motionType: 'drift',
      amplitude: 1.0,
      chaos: 0.10,
      loopSec: 14,
      anchor: { x: 0.5, y: 0.50 },
      speed: 0.7,
      intensity: 0.8,
      direction: 0,
      feather: 25,
      maxShift: 18,
      depth: 0.10,
      arrows: [
        { x1: 0.15, y1: 0.15, x2: 0.45, y2: 0.15, speed: 0.7 },
        { x1: 0.50, y1: 0.18, x2: 0.80, y2: 0.18, speed: 0.8 },
        { x1: 0.22, y1: 0.32, x2: 0.52, y2: 0.33, speed: 0.6 },
        { x1: 0.55, y1: 0.30, x2: 0.85, y2: 0.31, speed: 0.7 }
      ],
      pins: [
        { x: 0.18, y: 0.75, radius: 0.08 },
        { x: 0.50, y: 0.78, radius: 0.08 },
        { x: 0.82, y: 0.75, radius: 0.08 }
      ]
    },
    'sway-fabric': {
      name: 'Váy lay động',
      color: '#FF9E64',
      motionType: 'sway',
      amplitude: 1.2,
      chaos: 0.20,
      loopSec: 12,
      anchor: { x: 0.5, y: 0.40 },
      speed: 0.9,
      intensity: 1.2,
      direction: 45,
      feather: 10,
      maxShift: 20,
      depth: 0.60,
      arrows: [
        { x1: 0.38, y1: 0.65, x2: 0.45, y2: 0.85, speed: 0.9 },
        { x1: 0.50, y1: 0.68, x2: 0.53, y2: 0.90, speed: 1.0 },
        { x1: 0.60, y1: 0.65, x2: 0.70, y2: 0.82, speed: 1.1 },
        { x1: 0.65, y1: 0.80, x2: 0.78, y2: 0.88, speed: 0.9 }
      ],
      pins: [
        { x: 0.50, y: 0.25, radius: 0.08 },
        { x: 0.50, y: 0.45, radius: 0.08 },
        { x: 0.18, y: 0.40, radius: 0.08 }
      ]
    }
  };

  class MotionUIController {
    constructor() {
      this.container = null;
      this.initialized = false;
      this.cleanViewActive = false;
      this._isHoldingH = false;
      this._preHoldCleanState = false;

      // Compare split-screen state
      this.compareActive = false;
      this.compareRatio = 0.5;

      // Seam check state
      this.isSeamCheckActive = false;

      // Depth Brush mode
      this.depthBrushActive = false;

      // Active layer ID
      this.activeLayerId = 'layer-hair';

      // Layers array conforming to Contract 3.1
      this.layers = [
        {
          id: 'layer-hair',
          name: 'Tóc bay',
          color: '#7DCFFF',
          visible: true,
          locked: false,
          mask: null,
          arrows: JSON.parse(JSON.stringify(PRESET_LAYERS['hair-wind'].arrows)),
          pins: JSON.parse(JSON.stringify(PRESET_LAYERS['hair-wind'].pins)),
          speed: 1.2,
          intensity: 1.4,
          direction: 15,
          feather: 12,
          maxShift: 24,
          depth: 0.85,
          motionType: 'sway',
          amplitude: 1.0,
          chaos: 0.15,
          loopSec: 12,
          anchor: { x: 0.5, y: 0.15 },
          physics: {
            enabled: true,
            anchor: { x: 0.5, y: 0.15 },
            stiffness: 1.2,
            damping: 0.7,
            lag: 0.4,
            maxDisplacement: 35.0
          }
        }
      ];

      // Global Motion Config conforming to Contract 3.1
      this.config = {
        layers: this.layers,
        naturalness: 50,
        loopPeriodMs: 4000,
        intensityPreset: 'vua', // 'tinh-te' | 'vua' | 'manh'
        parallaxMouse: true,
        advanced: {
          waves: 3,
          freq: 1.0,
          phaseLag: 0.85,
          noise: 0.25
        }
      };

      // Undo / Redo history
      this.history = [];
      this.historyIndex = -1;
      this._maxHistory = 50;

      // Region Suggestion state & Modal
      this.isSuggestModalOpen = false;
      this._suggestCandidates = [];
      this.pickingAnchorLayerId = null;

      // GIAI ĐOẠN 3: Safe Zones & Focus Shield
      this.showSafeZones = true;
      this.focusShieldEnabled = true;
      this.blurFocusEnabled = false;
      this.safeZones = [];

      // Studio instance reference
      this.studioInstance = null;
    }

    init(mountEl) {
      if (mountEl) this.container = mountEl;
      if (!this.container && typeof document !== 'undefined') {
        this.container = document.getElementById('motionUIMount') || document.getElementById('motionStudioMount');
      }
      if (!this.container) return;

      // Sync from global appState if present
      if (typeof window !== 'undefined' && window.appState && window.appState.motionFlow) {
        const mf = window.appState.motionFlow;
        if (Array.isArray(mf.layers) && mf.layers.length > 0) {
          this.layers = JSON.parse(JSON.stringify(mf.layers));
          this.activeLayerId = this.layers[0].id;
        }
        if (mf.intensityPreset) this.config.intensityPreset = mf.intensityPreset;
        if (typeof mf.parallaxMouse === 'boolean') this.config.parallaxMouse = mf.parallaxMouse;
      }

      this._saveSnapshot();
      this.render();
      this._bindGlobalShortcuts();
      this._bindMouseParallax();

      // Backward compatible fallback to MotionStudio
      if (typeof window !== 'undefined' && typeof window.MotionStudio !== 'undefined' && !window.motionStudioInstance) {
        const initImg = (window.appState && window.appState.wallpaperUrl) || '';
        try {
          window.motionStudioInstance = new window.MotionStudio({
            container: this.container,
            imgUrl: initImg,
            onStateChange: (cfg) => {
              if (window.MotionEngine) window.MotionEngine.setConfig(cfg);
              if (window.appState) window.appState.motionFlow = cfg;
            }
          });
          window.motionStudioInstance.init();
        } catch (e) {
          console.warn('[MotionUI] MotionStudio fallback note:', e);
        }
      }

      if (typeof window !== 'undefined' && window.motionStudioInstance) {
        this.attachToStudio(window.motionStudioInstance);
      }

      this._syncToEngine();
      this.initialized = true;
    }

    attachToStudio(studio) {
      this.studioInstance = studio;
      if (!studio) return;

      const active = this.getActiveLayer();
      if (active) {
        studio.arrows = active.arrows;
        studio.pins = active.pins;
        studio.flowSpeed = active.speed;
      }

      // Override redrawEditor to isolate active layer and replace red circles with 3.5px dots
      studio.redrawEditor = () => {
        if (this.cleanViewActive) {
          const ctx = studio.editorCtx;
          if (ctx && studio.editorCanvas) {
            ctx.clearRect(0, 0, studio.editorCanvas.width, studio.editorCanvas.height);
            if (studio.currentImg && studio.currentImg.complete && studio.currentImg.naturalWidth) {
              ctx.drawImage(studio.currentImg, 0, 0, studio.editorCanvas.width, studio.editorCanvas.height);
            }
          }
          return;
        }

        this.renderCanvasLayers(studio);
      };

      studio.onStateChange = (cfg) => {
        const curActive = this.getActiveLayer();
        if (curActive && !curActive.locked) {
          curActive.arrows = JSON.parse(JSON.stringify(studio.arrows));
          curActive.pins = JSON.parse(JSON.stringify(studio.pins));
          this._saveSnapshot();
          this._syncToEngine();
          this.render();
        }
      };

      studio.redrawEditor();
    }

    renderCanvasLayers(studio) {
      const ctx = studio.editorCtx;
      if (!ctx || !studio.editorCanvas) return;
      const w = studio.editorCanvas.width;
      const h = studio.editorCanvas.height;

      ctx.clearRect(0, 0, w, h);

      if (studio.currentImg && studio.currentImg.complete && studio.currentImg.naturalWidth) {
        ctx.drawImage(studio.currentImg, 0, 0, w, h);
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, w, h);

      for (const layer of this.layers) {
        if (!layer.visible) continue;

        const isActive = layer.id === this.activeLayerId;
        ctx.globalAlpha = isActive ? 1.0 : 0.2;

        // Render delicate small pins (radius 3.5px, 1px crisp white border)
        for (const pin of (layer.pins || [])) {
          const px = pin.x * w;
          const py = pin.y * h;
          const r = (pin.radius || 0.08) * Math.min(w, h);

          if (isActive) {
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fillStyle = `${layer.color}18`;
            ctx.fill();
            ctx.strokeStyle = `${layer.color}66`;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = layer.color;
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Render arrows
        for (const arrow of (layer.arrows || [])) {
          this.drawCrispArrow(
            ctx,
            arrow.x1 * w,
            arrow.y1 * h,
            arrow.x2 * w,
            arrow.y2 * h,
            layer.color,
            isActive ? 1.0 : 0.2
          );
        }

        // Render Anchor / Pivot Point (crosshair + coordinates tag)
        const anc = layer.anchor || (layer.physics && layer.physics.anchor) || { x: 0.5, y: 0.5 };
        const ax = anc.x * w;
        const ay = anc.y * h;
        ctx.save();
        ctx.globalAlpha = isActive ? 0.95 : 0.3;
        ctx.strokeStyle = layer.color;
        ctx.fillStyle = layer.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ax, ay, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ax - 10, ay);
        ctx.lineTo(ax + 10, ay);
        ctx.moveTo(ax, ay - 10);
        ctx.lineTo(ax, ay + 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ax, ay, 2.5, 0, Math.PI * 2);
        ctx.fill();
        if (isActive && typeof ctx.fillText === 'function') {
          ctx.font = '10px sans-serif';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(`🎯 Neo (${Math.round(anc.x * 100)}%, ${Math.round(anc.y * 100)}%)`, ax + 12, ay - 4);
        }
        ctx.restore();
      }

      // Seam Check Mode Overlay Tag
      if (this.isSeamCheckActive && typeof ctx.fillText === 'function') {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 204, 0, 0.95)';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('🔄 KIỂM TRA VÒNG LẶP: 0 NHẢY KHUNG', w - 240, 24);
        if (typeof ctx.arc === 'function') {
          ctx.beginPath();
          ctx.arc(w - 250, 20, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.globalAlpha = 1.0;

      if (studio.isDragging && studio.dragStart && studio.dragCurrent) {
        const active = this.getActiveLayer();
        const activeColor = active ? active.color : '#7DCFFF';
        this.drawCrispArrow(
          ctx,
          studio.dragStart.x * w,
          studio.dragStart.y * h,
          studio.dragCurrent.x * w,
          studio.dragCurrent.y * h,
          activeColor,
          1.0
        );
      }
    }

    drawCrispArrow(ctx, x1, y1, x2, y2, color, alpha = 1.0) {
      const headlen = 10;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const angle = Math.atan2(dy, dx);
      const len = Math.hypot(dx, dy);
      if (len < 5) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x1, y1, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.restore();
    }

    _bindGlobalShortcuts() {
      if (typeof window === 'undefined') return;

      window.addEventListener('keydown', (e) => {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

        // Hold H
        if ((e.key === 'h' || e.key === 'H') && !e.repeat) {
          if (!this._isHoldingH) {
            this._isHoldingH = true;
            this._preHoldCleanState = this.cleanViewActive;
            this.setCleanView(true);
          }
        }

        // Ctrl+Z
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
          e.preventDefault();
          this.undo();
        }

        // Ctrl+Y / Ctrl+Shift+Z
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
          e.preventDefault();
          this.redo();
        }
      });

      window.addEventListener('keyup', (e) => {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

        if (e.key === 'h' || e.key === 'H') {
          if (this._isHoldingH) {
            this._isHoldingH = false;
            this.setCleanView(this._preHoldCleanState);
          }
        }
      });
    }

    _bindMouseParallax() {
      if (typeof window === 'undefined') return;

      window.addEventListener('mousemove', (e) => {
        if (!this.config.parallaxMouse) return;

        // Calculate normalized window coordinates [-1.0 .. 1.0]
        const nx = (e.clientX / (window.innerWidth || 1920)) * 2 - 1;
        const ny = (e.clientY / (window.innerHeight || 1080)) * 2 - 1;

        if (window.MotionEngine && typeof window.MotionEngine.setMousePos === 'function') {
          window.MotionEngine.setMousePos(nx, ny);
        }
      });
    }

    // ─────────────────────────────────────────────────────────────
    // GIAI ĐOẠN 3 Features: Intensity Presets & Compare Slider
    // ─────────────────────────────────────────────────────────────

    /**
     * Set overall motion intensity preset ('tinh-te' | 'vua' | 'manh')
     */
    setIntensityPreset(preset) {
      const valid = ['tinh-te', 'vua', 'manh'];
      if (!valid.includes(preset)) preset = 'vua';

      this.config.intensityPreset = preset;
      this._saveSnapshot();
      this._syncToEngine();
      this.render();
      return preset;
    }

    /**
     * Toggle split-screen comparison mode (Before / After)
     */
    toggleCompare(force) {
      this.compareActive = typeof force === 'boolean' ? force : !this.compareActive;
      const ratio = this.compareActive ? this.compareRatio : null;

      if (typeof window !== 'undefined' && window.MotionEngine && typeof window.MotionEngine.setCompare === 'function') {
        window.MotionEngine.setCompare(ratio);
      }

      this.render();
      return this.compareActive;
    }

    /**
     * Set Before/After split position (0.0 .. 1.0)
     */
    setCompareRatio(ratio) {
      const r = Math.max(0.0, Math.min(1.0, Number(ratio)));
      this.compareRatio = r;
      this.compareActive = true;

      if (typeof window !== 'undefined' && window.MotionEngine && typeof window.MotionEngine.setCompare === 'function') {
        window.MotionEngine.setCompare(r);
      }

      const valSpan = document.getElementById('compareRatioVal');
      if (valSpan) valSpan.textContent = `${Math.round(r * 100)}%`;
    }

    /**
     * Toggle mouse parallax tracking
     */
    setParallaxMouse(enabled) {
      this.config.parallaxMouse = Boolean(enabled);
      this._saveSnapshot();
      this._syncToEngine();
      return this.config.parallaxMouse;
    }

    /**
     * Generate automatic depth map using DepthEngine
     */
    generateAutoDepth() {
      if (typeof window === 'undefined') return;

      const engine = window.DepthEngine;
      const studio = this.studioInstance || window.motionStudioInstance;
      const img = (studio && studio.currentImg) || null;

      if (engine && typeof engine.generateAutoDepth === 'function') {
        engine.generateAutoDepth(img);

        // Intelligently assign realistic depth layers based on layer type
        for (const layer of this.layers) {
          if (layer.name.includes('Tóc')) layer.depth = 0.85; // Foreground
          else if (layer.name.includes('Váy')) layer.depth = 0.60; // Mid-foreground
          else if (layer.name.includes('Suối')) layer.depth = 0.35; // Midground
          else if (layer.name.includes('Mây')) layer.depth = 0.10; // Background
          else layer.depth = 0.50;
        }

        this._saveSnapshot();
        this._syncToEngine();
        this.render();

        console.log('[MotionUI] Bản đồ độ sâu tự động đã được tính toán và áp dụng cho các lớp.');
      }
    }

    // ─────────────────────────────────────────────────────────────
    // History (Undo / Redo)
    // ─────────────────────────────────────────────────────────────
    _saveSnapshot() {
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }

      const snapshot = JSON.stringify({
        layers: this.layers,
        activeLayerId: this.activeLayerId,
        config: this.config,
        compareRatio: this.compareRatio,
        compareActive: this.compareActive
      });

      this.history.push(snapshot);
      if (this.history.length > this._maxHistory) {
        this.history.shift();
      } else {
        this.historyIndex++;
      }
    }

    undo() {
      if (!this.canUndo()) return false;
      this.historyIndex--;
      const state = JSON.parse(this.history[this.historyIndex]);
      this.layers = state.layers;
      this.activeLayerId = state.activeLayerId;
      this.config = state.config;
      this.compareRatio = state.compareRatio !== undefined ? state.compareRatio : 0.5;
      this.compareActive = Boolean(state.compareActive);

      this._syncStudioWithActiveLayer();
      this._syncToEngine();
      this.render();
      return true;
    }

    redo() {
      if (!this.canRedo()) return false;
      this.historyIndex++;
      const state = JSON.parse(this.history[this.historyIndex]);
      this.layers = state.layers;
      this.activeLayerId = state.activeLayerId;
      this.config = state.config;
      this.compareRatio = state.compareRatio !== undefined ? state.compareRatio : 0.5;
      this.compareActive = Boolean(state.compareActive);

      this._syncStudioWithActiveLayer();
      this._syncToEngine();
      this.render();
      return true;
    }

    canUndo() {
      return this.historyIndex > 0;
    }

    canRedo() {
      return this.historyIndex < this.history.length - 1;
    }

    toggleCleanView(force) {
      const next = typeof force === 'boolean' ? force : !this.cleanViewActive;
      return this.setCleanView(next);
    }

    setCleanView(active) {
      this.cleanViewActive = Boolean(active);

      if (typeof document !== 'undefined') {
        const studioWrap = document.querySelector('.motion-studio-wrap');
        if (studioWrap) studioWrap.classList.toggle('clean-view', this.cleanViewActive);

        if (this.container) this.container.classList.toggle('clean-view', this.cleanViewActive);

        const appEl = document.querySelector('.motion-ui-wrap');
        if (appEl) appEl.classList.toggle('clean-view', this.cleanViewActive);

        const cleanBtn = document.getElementById('btnMotionCleanView');
        if (cleanBtn) {
          if (this.cleanViewActive) {
            cleanBtn.classList.add('is-active');
            cleanBtn.innerHTML = '<span class="icon">✨</span> Thoát xem sạch (H)';
          } else {
            cleanBtn.classList.remove('is-active');
            cleanBtn.innerHTML = '<span class="icon">👁️</span> Xem sạch (H)';
          }
        }
      }

      if (this.studioInstance && typeof this.studioInstance.redrawEditor === 'function') {
        this.studioInstance.redrawEditor();
      }

      return this.cleanViewActive;
    }

    // ─────────────────────────────────────────────────────────────
    // Layers Management
    // ─────────────────────────────────────────────────────────────
    addLayer(customName, customColor) {
      const idx = this.layers.length + 1;
      const color = customColor || LAYER_PALETTE[(idx - 1) % LAYER_PALETTE.length];
      const newLayer = {
        id: `layer-${Date.now()}-${idx}`,
        name: customName || `Lớp chuyển động ${idx}`,
        color: color,
        visible: true,
        locked: false,
        mask: null,
        arrows: [],
        pins: [],
        speed: 1.0,
        intensity: 1.0,
        direction: 0,
        feather: 10,
        maxShift: 20,
        depth: 0.50,
        motionType: 'sway',
        amplitude: 1.0,
        chaos: 0.15,
        loopSec: 12,
        anchor: { x: 0.5, y: 0.5 },
        physics: {
          enabled: false,
          anchor: { x: 0.5, y: 0.1 },
          stiffness: 1.0,
          damping: 0.7,
          lag: 0.4,
          maxDisplacement: 35.0
        }
      };

      this.layers.push(newLayer);
      this.activeLayerId = newLayer.id;
      this._saveSnapshot();
      this._syncStudioWithActiveLayer();
      this._syncToEngine();
      this.render();
      return newLayer;
    }

    duplicateLayer(layerId) {
      const src = this.layers.find(l => l.id === layerId) || this.getActiveLayer();
      if (!src) return null;

      const idx = this.layers.length + 1;
      const color = LAYER_PALETTE[(idx - 1) % LAYER_PALETTE.length];
      const clone = {
        id: `layer-${Date.now()}-${idx}`,
        name: `${src.name} (Bản sao)`,
        color: color,
        visible: src.visible,
        locked: false,
        mask: src.mask ? JSON.parse(JSON.stringify(src.mask)) : null,
        arrows: JSON.parse(JSON.stringify(src.arrows)),
        pins: JSON.parse(JSON.stringify(src.pins)),
        speed: src.speed,
        intensity: src.intensity,
        direction: src.direction,
        feather: src.feather,
        maxShift: src.maxShift,
        depth: src.depth,
        motionType: src.motionType || 'sway',
        amplitude: src.amplitude ?? 1.0,
        chaos: src.chaos ?? 0.15,
        loopSec: src.loopSec ?? 12,
        anchor: src.anchor ? { ...src.anchor } : { x: 0.5, y: 0.5 },
        physics: src.physics ? JSON.parse(JSON.stringify(src.physics)) : {
          enabled: false,
          anchor: { x: 0.5, y: 0.1 },
          stiffness: 1.0,
          damping: 0.7,
          lag: 0.4,
          maxDisplacement: 35.0
        }
      };

      this.layers.push(clone);
      this.activeLayerId = clone.id;
      this._saveSnapshot();
      this._syncStudioWithActiveLayer();
      this._syncToEngine();
      this.render();
      return clone;
    }

    removeLayer(layerId) {
      if (this.layers.length <= 1) {
        console.warn('[MotionUI] Cần giữ ít nhất 1 lớp chuyển động.');
        return false;
      }

      const idx = this.layers.findIndex(l => l.id === layerId);
      if (idx === -1) return false;

      this.layers.splice(idx, 1);
      if (this.activeLayerId === layerId) {
        this.activeLayerId = this.layers[Math.max(0, idx - 1)].id;
      }

      this._saveSnapshot();
      this._syncStudioWithActiveLayer();
      this._syncToEngine();
      this.render();
      return true;
    }

    setActiveLayer(layerId) {
      if (this.layers.some(l => l.id === layerId)) {
        this.activeLayerId = layerId;
        this._syncStudioWithActiveLayer();
        this.render();
      }
    }

    toggleLayerVisibility(layerId) {
      const target = this.layers.find(l => l.id === layerId);
      if (target) {
        target.visible = !target.visible;
        this._saveSnapshot();
        this._syncToEngine();
        if (this.studioInstance) this.studioInstance.redrawEditor();
        this.render();
      }
    }

    toggleLayerLock(layerId) {
      const target = this.layers.find(l => l.id === layerId);
      if (target) {
        target.locked = !target.locked;
        this._saveSnapshot();
        this._syncToEngine();
        this.render();
      }
    }

    updateLayerProperty(layerId, prop, val) {
      const target = this.layers.find(l => l.id === layerId);
      if (target) {
        target[prop] = val;
        this._syncStudioWithActiveLayer();
        this._syncToEngine();
      }
    }

    applyPresetLayer(presetKey) {
      const tmpl = PRESET_LAYERS[presetKey];
      if (!tmpl) return null;

      const newLayer = {
        id: `layer-${presetKey}-${Date.now()}`,
        name: tmpl.name,
        color: tmpl.color,
        visible: true,
        locked: false,
        mask: null,
        arrows: JSON.parse(JSON.stringify(tmpl.arrows)),
        pins: JSON.parse(JSON.stringify(tmpl.pins)),
        speed: tmpl.speed,
        intensity: tmpl.intensity,
        direction: tmpl.direction,
        feather: tmpl.feather,
        maxShift: tmpl.maxShift,
        depth: tmpl.depth,
        motionType: tmpl.motionType || 'sway',
        amplitude: tmpl.amplitude ?? 1.0,
        chaos: tmpl.chaos ?? 0.15,
        loopSec: tmpl.loopSec ?? 12,
        anchor: tmpl.anchor ? { ...tmpl.anchor } : { x: 0.5, y: 0.5 }
      };

      this.layers.push(newLayer);
      this.activeLayerId = newLayer.id;
      this._saveSnapshot();
      this._syncStudioWithActiveLayer();
      this._syncToEngine();
      this.render();
      return newLayer;
    }

    loadThreeLayerDemo() {
      this.layers = [
        {
          id: 'layer-hair-demo',
          name: 'Tóc bay',
          color: '#7DCFFF',
          visible: true,
          locked: false,
          mask: null,
          arrows: JSON.parse(JSON.stringify(PRESET_LAYERS['hair-wind'].arrows)),
          pins: JSON.parse(JSON.stringify(PRESET_LAYERS['hair-wind'].pins)),
          speed: 1.2,
          intensity: 1.4,
          direction: 15,
          feather: 12,
          maxShift: 24,
          depth: 0.85,
          physics: {
            enabled: true,
            anchor: { x: 0.5, y: 0.15 },
            stiffness: 1.2,
            damping: 0.7,
            lag: 0.4,
            maxDisplacement: 35.0
          }
        },
        {
          id: 'layer-dress-demo',
          name: 'Váy lay động',
          color: '#FF9E64',
          visible: true,
          locked: false,
          mask: null,
          arrows: JSON.parse(JSON.stringify(PRESET_LAYERS['sway-fabric'].arrows)),
          pins: JSON.parse(JSON.stringify(PRESET_LAYERS['sway-fabric'].pins)),
          speed: 0.9,
          intensity: 1.2,
          direction: 45,
          feather: 10,
          maxShift: 20,
          depth: 0.60,
          physics: {
            enabled: true,
            anchor: { x: 0.5, y: 0.55 },
            stiffness: 0.8,
            damping: 0.8,
            lag: 0.5,
            maxDisplacement: 35.0
          }
        },
        {
          id: 'layer-clouds-demo',
          name: 'Mây trôi',
          color: '#BB9AF7',
          visible: true,
          locked: false,
          mask: null,
          arrows: JSON.parse(JSON.stringify(PRESET_LAYERS['clouds'].arrows)),
          pins: JSON.parse(JSON.stringify(PRESET_LAYERS['clouds'].pins)),
          speed: 0.7,
          intensity: 0.8,
          direction: 0,
          feather: 25,
          maxShift: 18,
          depth: 0.10,
          physics: {
            enabled: false,
            anchor: { x: 0.5, y: 0.2 },
            stiffness: 1.0,
            damping: 0.7,
            lag: 0.3,
            maxDisplacement: 35.0
          }
        }
      ];

      this.activeLayerId = 'layer-hair-demo';
      this._saveSnapshot();
      this._syncStudioWithActiveLayer();
      this._syncToEngine();
      this.render();
      return this.layers;
    }

    getActiveLayer() {
      return this.layers.find(l => l.id === this.activeLayerId) || this.layers[0];
    }

    getLayers() {
      return JSON.parse(JSON.stringify(this.layers));
    }

    getConfig() {
      this.config.layers = this.layers;
      return JSON.parse(JSON.stringify(this.config));
    }

    _syncStudioWithActiveLayer() {
      if (!this.studioInstance) return;
      const active = this.getActiveLayer();
      if (active) {
        this.studioInstance.arrows = active.arrows;
        this.studioInstance.pins = active.pins;
        this.studioInstance.flowSpeed = active.speed;
        this.studioInstance.redrawEditor();
      }
    }

    _syncToEngine() {
      if (typeof window !== 'undefined' && window.MotionEngine) {
        if (typeof window.MotionEngine.setConfig === 'function') {
          window.MotionEngine.setConfig(this.getConfig());
        }
        if (typeof window.MotionEngine.setPhysics === 'function') {
          for (const l of this.layers) {
            if (l.physics) window.MotionEngine.setPhysics(l.id, l.physics);
          }
        }
      }
      if (typeof window !== 'undefined' && window.appState) {
        window.appState.motionFlow = this.getConfig();
      }
    }

    // ─────────────────────────────────────────────────────────────
    // GIAI ĐOẠN 2: Layer Motion Type, Anchor & Seam Check
    // ─────────────────────────────────────────────────────────────

    setLayerMotionType(layerId, motionType) {
      const target = this.layers.find(l => l.id === layerId) || this.getActiveLayer();
      if (!target) return null;
      target.motionType = motionType;
      if (!target.motion) target.motion = {};
      target.motion.type = motionType;
      const limit = (getCFG().motion.limit && getCFG().motion.limit[motionType]) || 3.0;
      if (typeof target.amplitude === 'number' && target.amplitude > limit) {
        target.amplitude = limit;
      }
      this._saveSnapshot();
      this._syncToEngine();
      this.render();
      return target.motionType;
    }

    setLayerAmplitude(layerId, amplitude) {
      const target = this.layers.find(l => l.id === layerId) || this.getActiveLayer();
      if (!target) return null;
      target.amplitude = Number(amplitude);
      if (!target.motion) target.motion = {};
      target.motion.amplitude = Number(amplitude);
      this._syncToEngine();
      return target.amplitude;
    }

    setLayerAnchor(layerId, anchor) {
      const target = this.layers.find(l => l.id === layerId) || this.getActiveLayer();
      if (!target) return null;
      const ax = Math.max(0, Math.min(1, Number(anchor.x) || 0.5));
      const ay = Math.max(0, Math.min(1, Number(anchor.y) || 0.5));
      target.anchor = { x: ax, y: ay };
      if (!target.motion) target.motion = {};
      target.motion.anchor = { x: ax, y: ay };
      if (target.physics) {
        target.physics.anchor = { x: ax, y: ay };
      }
      this._saveSnapshot();
      this._syncToEngine();
      if (this.studioInstance && this.studioInstance.redrawEditor) {
        this.studioInstance.redrawEditor();
      }
      return target.anchor;
    }

    toggleSeamCheck() {
      this.isSeamCheckActive = !this.isSeamCheckActive;
      let res = null;
      if (typeof window !== 'undefined' && window.MotionEngine && typeof window.MotionEngine.seamCheck === 'function') {
        res = window.MotionEngine.seamCheck();
      }
      this.render();
      if (this.studioInstance && this.studioInstance.redrawEditor) {
        this.studioInstance.redrawEditor();
      }
      return res;
    }

    // ─────────────────────────────────────────────────────────────
    // GIAI ĐOẠN 6: Physics & Region Suggestion Controller Methods
    // ─────────────────────────────────────────────────────────────

    setLayerPhysics(layerId, partialCfg) {
      const target = this.layers.find(l => l.id === layerId) || this.getActiveLayer();
      if (!target) return null;
      if (!target.physics) {
        target.physics = {
          enabled: false,
          anchor: { x: 0.5, y: 0.1 },
          stiffness: 1.0,
          damping: 0.7,
          lag: 0.4,
          maxDisplacement: 35.0
        };
      }
      Object.assign(target.physics, partialCfg);
      this._saveSnapshot();
      this._syncToEngine();

      if (typeof window !== 'undefined' && window.MotionEngine && typeof window.MotionEngine.setPhysics === 'function') {
        window.MotionEngine.setPhysics(target.id, target.physics);
      }
      return target.physics;
    }

    pickAnchor(layerId, coords) {
      const target = this.layers.find(l => l.id === layerId) || this.getActiveLayer();
      if (!target) return null;
      const newAnchor = coords || { x: 0.5, y: 0.15 };
      this.setLayerPhysics(target.id, { anchor: newAnchor });
      this.render();
      return newAnchor;
    }

    async openSuggestRegionsModal() {
      let candidates = [];
      try {
        if (typeof window !== 'undefined' && window.MotionEngine && typeof window.MotionEngine.suggestRegions === 'function') {
          const img = (this.studioInstance && this.studioInstance.currentImg) || null;
          candidates = await window.MotionEngine.suggestRegions(img);
        } else if (typeof window !== 'undefined' && window.PetSegment && typeof window.PetSegment.suggestRegions === 'function') {
          const img = (this.studioInstance && this.studioInstance.currentImg) || null;
          candidates = await window.PetSegment.suggestRegions(img);
        }
      } catch (err) {
        console.warn('[MotionUI] Không thể gợi ý vùng tự động:', err);
      }

      if (!candidates || candidates.length === 0) {
        candidates = [
          {
            id: `sug-${Date.now()}-1`,
            name: 'Tóc bay',
            color: '#FF9EAF',
            depth: 0.85,
            speed: 1.2,
            intensity: 1.2,
            direction: 15,
            physics: { enabled: true, anchor: { x: 0.5, y: 0.15 }, stiffness: 1.2, damping: 0.7, lag: 0.4, maxDisplacement: 35.0 }
          },
          {
            id: `sug-${Date.now()}-2`,
            name: 'Váy lay động',
            color: '#BB9AF7',
            depth: 0.70,
            speed: 0.8,
            intensity: 1.0,
            direction: 0,
            physics: { enabled: true, anchor: { x: 0.5, y: 0.55 }, stiffness: 0.8, damping: 0.8, lag: 0.5, maxDisplacement: 35.0 }
          },
          {
            id: `sug-${Date.now()}-3`,
            name: 'Suối nước',
            color: '#7AA2F7',
            depth: 0.45,
            speed: 1.5,
            intensity: 1.4,
            direction: -90,
            physics: { enabled: false, anchor: { x: 0.5, y: 0.5 }, stiffness: 1.0, damping: 0.7, lag: 0.3, maxDisplacement: 35.0 }
          },
          {
            id: `sug-${Date.now()}-4`,
            name: 'Mây trôi',
            color: '#7DCFFF',
            depth: 0.15,
            speed: 0.7,
            intensity: 0.8,
            direction: 90,
            physics: { enabled: false, anchor: { x: 0.5, y: 0.2 }, stiffness: 1.0, damping: 0.7, lag: 0.3, maxDisplacement: 35.0 }
          }
        ];
      }

      this._suggestCandidates = candidates.map(c => ({
        ...c,
        selected: true
      }));

      this.isSuggestModalOpen = true;
      this.render();
      return this._suggestCandidates;
    }

    closeSuggestRegionsModal() {
      this.isSuggestModalOpen = false;
      this.render();
    }

    toggleSuggestCandidate(candId) {
      const cand = this._suggestCandidates.find(c => c.id === candId);
      if (cand) {
        cand.selected = !cand.selected;
        this.render();
      }
    }

    removeSuggestCandidate(candId) {
      this._suggestCandidates = this._suggestCandidates.filter(c => c.id !== candId);
      this.render();
    }

    applySuggestedRegions(selectedCandidates) {
      const toAdd = selectedCandidates || (this._suggestCandidates || []).filter(c => c.selected);
      if (!toAdd || toAdd.length === 0) return 0;

      for (const cand of toAdd) {
        const idx = this.layers.length + 1;
        const newL = {
          id: cand.id || `layer-sug-${Date.now()}-${idx}`,
          name: cand.name || `Lớp gợi ý ${idx}`,
          color: cand.color || '#7DCFFF',
          visible: true,
          locked: false,
          mask: cand.maskCanvas || null,
          arrows: cand.arrows ? JSON.parse(JSON.stringify(cand.arrows)) : [],
          pins: cand.pins ? JSON.parse(JSON.stringify(cand.pins)) : [],
          speed: cand.speed ?? 1.0,
          intensity: cand.intensity ?? 1.0,
          direction: cand.direction ?? 0,
          feather: cand.feather ?? 15,
          maxShift: cand.maxShift ?? 20,
          depth: cand.depth ?? 0.5,
          physics: cand.physics ? JSON.parse(JSON.stringify(cand.physics)) : {
            enabled: false,
            anchor: { x: 0.5, y: 0.1 },
            stiffness: 1.0,
            damping: 0.7,
            lag: 0.4,
            maxDisplacement: 35.0
          }
        };
        this.layers.push(newL);
      }

      this.activeLayerId = this.layers[this.layers.length - 1].id;
      this.isSuggestModalOpen = false;
      this._saveSnapshot();
      this._syncStudioWithActiveLayer();
      this._syncToEngine();
      this.render();
      return toAdd.length;
    }

    // ─────────────────────────────────────────────────────────────
    // GIAI ĐOẠN 3: Visual Load Meter & Safe Zones Overlay (D-008 & D-009)
    // ─────────────────────────────────────────────────────────────
    getVisualLoad() {
      if (typeof window !== 'undefined' && window.MotionEngine && typeof window.MotionEngine.getVisualLoad === 'function') {
        return window.MotionEngine.getVisualLoad(this.layers);
      }
      const cfg = getCFG();
      const active = (this.layers || []).filter(l => l && l.visible !== false);
      let total = 0;
      active.forEach(l => {
        const a = typeof l.amplitude === 'number' ? l.amplitude : 1.0;
        const s = typeof l.speed === 'number' ? l.speed : 1.0;
        total += a * s;
      });
      const g = (cfg.load && cfg.load.green) || 1.5;
      const y = (cfg.load && cfg.load.yellow) || 3.0;
      const maxActive = (cfg.load && cfg.load.maxActive) || 3;
      let lvl = total > y ? 'red' : (total > g ? 'yellow' : 'green');
      let lbl = total > y ? 'Rối mắt' : (total > g ? 'Vừa phải' : 'Dịu mắt');
      let clr = total > y ? '#F7768E' : (total > g ? '#E0AF68' : '#38EF7D');
      return {
        load: Number(total.toFixed(2)),
        level: lvl,
        levelLabel: lbl,
        levelColor: clr,
        activeCount: active.length,
        maxActive,
        isOverloaded: active.length > maxActive,
        greenMax: g,
        yellowMax: y
      };
    }

    reduceExcessLayers(maxActive = null) {
      const cfg = getCFG();
      const limit = typeof maxActive === 'number' ? maxActive : ((cfg.load && cfg.load.maxActive) || 3);
      const active = (this.layers || []).filter(l => l && l.visible !== false);
      if (active.length > limit) {
        this._saveSnapshot();
        for (let i = limit; i < active.length; i++) {
          active[i].visible = false;
        }
        this._syncToEngine();
        this.render();
        if (typeof window !== 'undefined' && typeof window.showStatus === 'function') {
          window.showStatus(`✓ Đã tắt bớt ${active.length - limit} lớp chuyển động để tránh rối mắt`);
        }
      }
    }

    renderSafeZonesOverlay() {
      if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
      const previewWin = document.getElementById('previewWindow') || (typeof document.querySelector === 'function' ? document.querySelector('.preview-window') : null);
      if (!previewWin || typeof previewWin.appendChild !== 'function') return;

      let overlay = document.getElementById('previewSafeZonesOverlay');
      if (!overlay) {
        if (typeof document.createElement !== 'function') return;
        overlay = document.createElement('div');
        overlay.id = 'previewSafeZonesOverlay';
        overlay.className = 'preview-safezones-overlay';
        previewWin.appendChild(overlay);
      }

      if (!this.showSafeZones) {
        if (overlay.style) overlay.style.display = 'none';
        return;
      }

      if (overlay.style) overlay.style.display = 'block';
      if (overlay.classList && typeof overlay.classList.toggle === 'function') {
        overlay.classList.toggle('blur-focus-active', !!this.blurFocusEnabled);
      }

      if (!Array.isArray(this.safeZones) || this.safeZones.length === 0) {
        if (typeof window !== 'undefined' && window.MotionEngine && typeof window.MotionEngine.measureLivePreviewSafeZones === 'function') {
          this.safeZones = window.MotionEngine.measureLivePreviewSafeZones(previewWin);
        }
      }

      overlay.innerHTML = (this.safeZones || []).map(zone => {
        if (!zone || zone.enabled === false) return '';
        const l = (zone.x * 100).toFixed(1);
        const t = (zone.y * 100).toFixed(1);
        const w = (zone.width * 100).toFixed(1);
        const h = (zone.height * 100).toFixed(1);
        return `
          <div class="safe-zone-box" data-zone-id="${zone.id}" style="left:${l}%; top:${t}%; width:${w}%; height:${h}%;">
            <span class="safe-zone-tag">🛡️ ${zone.name} (-80% rung)</span>
            <div class="safe-zone-handle br" title="Kéo để chỉnh kích thước"></div>
          </div>
        `;
      }).join('');
    }

    // ─────────────────────────────────────────────────────────────
    // UI Rendering
    // ─────────────────────────────────────────────────────────────
    render() {
      if (!this.container) return;

      const activeLayer = this.getActiveLayer();
      const curPreset = this.config.intensityPreset || 'vua';
      const visualLoad = this.getVisualLoad();

      this.container.innerHTML = `
        <div class="motion-ui-wrap ${this.cleanViewActive ? 'clean-view' : ''}">
          <!-- Top Bar: Clean View, Compare & History -->
          <div class="motion-top-bar">
            <div class="motion-bar-left">
              <button type="button" id="btnMotionCleanView" class="motion-btn-clean ${this.cleanViewActive ? 'is-active' : ''}" title="Ẩn toàn bộ gizmo và overlay (Nhấp để bật/tắt hoặc GIỮ phím H)">
                <span class="icon">${this.cleanViewActive ? '✨' : '👁️'}</span> ${this.cleanViewActive ? 'Thoát xem sạch (H)' : 'Xem sạch (H)'}
              </button>
              <button type="button" id="btnToggleCompare" class="motion-btn-compare ${this.compareActive ? 'is-active' : ''}" title="So sánh Trước / Sau với vạch chia màn hình">
                <span class="icon">🌓</span> ${this.compareActive ? 'Tắt so sánh' : 'So sánh Trước / Sau'}
              </button>
              <button type="button" id="btnMotionSeamCheck" class="motion-btn-seam ${this.isSeamCheckActive ? 'is-active' : ''}" title="Chạy qua điểm nối 0s/12s và kiểm tra độ liền mạch (0 nhảy khung)">
                <span class="icon">🔄</span> ${this.isSeamCheckActive ? 'Đang kiểm tra vòng lặp' : 'Kiểm tra vòng lặp'}
              </button>
            </div>
            <div class="motion-bar-right">
              <button type="button" id="btnMotionUndo" class="motion-btn-hist" ${!this.canUndo() ? 'disabled' : ''} title="Hoàn tác (Ctrl+Z)">
                ↩️ Hoàn tác
              </button>
              <button type="button" id="btnMotionRedo" class="motion-btn-hist" ${!this.canRedo() ? 'disabled' : ''} title="Làm lại (Ctrl+Y)">
                ↪️ Làm lại
              </button>
            </div>
          </div>

          <!-- Compare Slider Bar (Before / After) -->
          ${this.compareActive ? `
            <div class="motion-compare-bar">
              <div class="compare-lead">
                <span class="compare-tag-before">Ảnh Gốc (Trước)</span>
                <input type="range" id="sliderCompareRatio" min="0" max="1" step="0.01" value="${this.compareRatio}" />
                <span class="compare-tag-after">Ảnh Động (Sau)</span>
              </div>
              <span id="compareRatioVal" class="compare-ratio-badge">${Math.round(this.compareRatio * 100)}%</span>
            </div>
          ` : ''}

          <!-- Intensity Presets Bar: Tinh tế / Vừa / Mạnh -->
          <div class="motion-intensity-box">
            <span class="intensity-label">Cường độ chuyển động tổng thể:</span>
            <div class="intensity-btn-group">
              <button type="button" class="intensity-btn ${curPreset === 'tinh-te' ? 'is-active' : ''}" data-intensity="tinh-te" title="Hiệu ứng nhẹ nhàng, êm dịu (0.4x)">
                🍃 Tinh tế
              </button>
              <button type="button" class="intensity-btn ${curPreset === 'vua' ? 'is-active' : ''}" data-intensity="vua" title="Hiệu ứng chuẩn, mượt mà tự nhiên (1.0x)">
                🌊 Vừa (Mặc định)
              </button>
              <button type="button" class="intensity-btn ${curPreset === 'manh' ? 'is-active' : ''}" data-intensity="manh" title="Hiệu ứng sống động, cuộn trào mạnh mẽ (1.8x)">
                ⚡ Mạnh
              </button>
            </div>
          </div>

          <!-- Parallax & Depth Toolkit -->
          <div class="motion-depth-toolbar">
            <label class="depth-toggle-label" title="Bật chuyển động 3D lệch tầng theo con trỏ chuột">
              <input type="checkbox" id="chkMotionParallax" ${this.config.parallaxMouse ? 'checked' : ''} />
              <span>Parallax theo chuột (3D Mouse)</span>
            </label>
            <div class="depth-actions-group">
              <button type="button" id="btnAutoDepth" class="depth-btn-action" title="Tự động tính toán bản đồ độ sâu dựa trên phối cảnh & luminance">
                🪄 Gợi ý độ sâu tự động
              </button>
              <button type="button" id="btnDepthBrush" class="depth-btn-action ${this.depthBrushActive ? 'is-active' : ''}" title="Cọ tô độ sâu thủ công vào bản đồ độ sâu">
                🖌️ Cọ tô độ sâu
              </button>
            </div>
          </div>

          <!-- Presets Quick Loader Bar -->
          <div class="motion-presets-section">
            <span class="presets-label">⚡ Mẫu chuyển động nạp sẵn:</span>
            <div class="motion-presets-row">
              <button type="button" class="motion-preset-pill" data-preset="hair-wind">💇 Tóc bay</button>
              <button type="button" class="motion-preset-pill" data-preset="waterfall">🌊 Suối nước</button>
              <button type="button" class="motion-preset-pill" data-preset="clouds">☁️ Mây trôi</button>
              <button type="button" class="motion-preset-pill" data-preset="sway-fabric">👗 Váy lay động</button>
              <button type="button" class="motion-preset-pill preset-demo-btn" id="btnLoadThreeLayers" title="Nạp nhanh 3 lớp: Tóc bay + Váy lay động + Mây trôi">
                🚀 Nạp bộ 3 lớp mẫu
              </button>
            </div>
          </div>

          <!-- GIAI ĐOẠN 3: Visual Load Meter & Safe Zones / Calm Toolkit (D-008 & D-009) -->
          <div class="motion-calm-toolkit">
            <div class="motion-load-meter-row">
              <div class="motion-load-title">
                <span class="load-icon">👀</span>
                <span style="font-weight:600;font-size:12px;">TẢI MẮT (VISUAL LOAD):</span>
                <span class="load-badge ${visualLoad.level}" id="visualLoadBadge" style="background:${visualLoad.levelColor}22; color:${visualLoad.levelColor}; border:1px solid ${visualLoad.levelColor}66;">
                  <span class="load-dot" style="background:${visualLoad.levelColor};"></span>
                  ${visualLoad.load} / ${visualLoad.yellowMax} • ${visualLoad.levelLabel}
                </span>
              </div>
              <div class="motion-load-bar-track" title="Thước đo tải mắt: Xanh (<=1.5), Vàng (<=3.0), Đỏ (>3.0)">
                <div class="motion-load-bar-fill" style="width: ${Math.min(100, Math.round((visualLoad.load / (visualLoad.yellowMax * 1.35)) * 100))}%; background-color: ${visualLoad.levelColor};"></div>
              </div>
            </div>

            ${visualLoad.isOverloaded ? `
              <div class="motion-load-warning-banner" id="bannerOverloadedLayers">
                <span class="warning-icon">⚠️</span>
                <span class="warning-msg">Quá nhiều điểm nhấn (${visualLoad.activeCount} lớp đang động). Giới hạn tối đa là ${visualLoad.maxActive} lớp để tránh rối mắt.</span>
                <button type="button" class="btn-calm-reduce" id="btnCalmReduceLayers" title="Tắt bớt các lớp vượt quá giới hạn 3">
                  Tắt bớt lớp thừa
                </button>
              </div>
            ` : ''}

            <div class="motion-calm-controls-row">
              <label class="calm-toggle-label" title="Tự động khóa tĩnh và giảm 80% rung lắc tại các vùng chữ, khung chat và thanh bên">
                <input type="checkbox" id="chkSafeZones" ${this.showSafeZones ? 'checked' : ''} />
                <span>🛡️ Vùng an toàn chữ & chat</span>
              </label>
              <label class="calm-toggle-label" title="Tự động giảm biên độ chuyển động xuống 20% khi đang gõ phím, hồi lại sau 3s">
                <input type="checkbox" id="chkFocusShield" ${this.focusShieldEnabled ? 'checked' : ''} />
                <span>⌨️ Focus Shield (Làm dịu khi gõ)</span>
              </label>
              <label class="calm-toggle-label" title="Tùy chọn làm mờ nhẹ vùng an toàn để chữ nổi bật">
                <input type="checkbox" id="chkBlurFocus" ${this.blurFocusEnabled ? 'checked' : ''} />
                <span>Mờ nhẹ nền</span>
              </label>
            </div>
          </div>

          <!-- Layers Management Panel -->
          <div class="motion-layers-panel">
            <div class="motion-layers-header">
              <div class="motion-panel-title">
                <span class="panel-icon">🥞</span>
                <span>DANH SÁCH LỚP (${this.layers.length})</span>
              </div>
              <div class="motion-layers-header-actions">
                <button type="button" id="btnMotionSuggestRegions" class="motion-btn-suggest-regions" title="Tự động phân đoạn và gợi ý các vùng chuyển động tự nhiên (0 AI)">
                  ✨ Gợi ý vùng
                </button>
                <button type="button" id="btnMotionAddLayer" class="motion-btn-add-layer" title="Thêm lớp chuyển động trống">
                  + Thêm lớp
                </button>
              </div>
            </div>

            <div class="motion-layer-list">
              ${this.layers.map(layer => {
                const isActive = layer.id === this.activeLayerId;
                const depthLabel = layer.depth >= 0.7 ? 'Gần' : (layer.depth <= 0.3 ? 'Xa' : 'Trung');
                return `
                  <div class="motion-layer-item ${isActive ? 'is-active' : ''}" data-layer-id="${layer.id}">
                    <div class="motion-layer-header-row">
                      <div class="motion-layer-lead">
                        <span class="motion-layer-dot" style="background-color: ${layer.color}; box-shadow: 0 0 6px ${layer.color}AA;"></span>
                        <input type="text" class="motion-layer-name-input" data-layer-id="${layer.id}" value="${this._escapeHtml(layer.name)}" title="Nhấp để đổi tên lớp" />
                        <span class="layer-item-badge">${layer.arrows.length} mũi tên, ${layer.pins.length} ghim</span>
                      </div>
                      <div class="motion-layer-actions">
                        <button type="button" class="motion-btn-icon btn-layer-vis" data-layer-id="${layer.id}" title="${layer.visible ? 'Ẩn lớp' : 'Hiện lớp'}">
                          ${layer.visible ? '👁️' : '🙈'}
                        </button>
                        <button type="button" class="motion-btn-icon btn-layer-lock" data-layer-id="${layer.id}" title="${layer.locked ? 'Mở khóa lớp' : 'Khóa lớp'}">
                          ${layer.locked ? '🔒' : '🔓'}
                        </button>
                        <button type="button" class="motion-btn-icon btn-layer-dup" data-layer-id="${layer.id}" title="Nhân đôi lớp này">
                          📋
                        </button>
                        ${this.layers.length > 1 ? `
                          <button type="button" class="motion-btn-icon btn-layer-del" data-layer-id="${layer.id}" title="Xóa lớp này">
                            🗑️
                          </button>
                        ` : ''}
                      </div>
                    </div>

                    <!-- Per-layer Dedicated Sliders: Speed, Intensity, Direction, Depth -->
                    ${isActive ? (() => {
                      const cfgObj = getCFG();
                      const curType = layer.motionType || (layer.motion && layer.motion.type) || 'sway';
                      const typeLimit = (cfgObj.motion && cfgObj.motion.limit && cfgObj.motion.limit[curType]) || 3.0;
                      const warnRatio = (cfgObj.motion && cfgObj.motion.warnRatio) || 0.75;
                      const curAmp = typeof layer.amplitude === 'number' ? layer.amplitude : 1.0;
                      const isWarning = curAmp >= (typeLimit * warnRatio);
                      const curLoopSec = typeof layer.loopSec === 'number' ? layer.loopSec : 12;
                      const curChaos = typeof layer.chaos === 'number' ? layer.chaos : 0.15;
                      const curAnchor = layer.anchor || { x: 0.5, y: 0.5 };

                      return `
                      <div class="layer-sliders-box">
                        <!-- GIAI ĐOẠN 2: Kiểu chuyển động mềm (Thở, Đung đưa, Trôi, Gợn) -->
                        <div class="layer-motion-type-group">
                          <label class="layer-control-label" style="font-weight:600;color:#7DCFFF;font-size:11px;">Kiểu chuyển động mềm:</label>
                          <div class="motion-type-btn-group">
                            <button type="button" class="motion-type-btn ${curType === 'sway' ? 'is-active' : ''}" data-layer-id="${layer.id}" data-motion-type="sway" title="Đung đưa: Xoay quanh điểm neo (gốc tóc/váy cố định, ngọn đung đưa)">
                              🌾 Đung đưa
                            </button>
                            <button type="button" class="motion-type-btn ${curType === 'breathe' ? 'is-active' : ''}" data-layer-id="${layer.id}" data-motion-type="breathe" title="Thở: Co giãn và nhấp nhô nhẹ quanh tâm neo">
                              🫁 Thở
                            </button>
                            <button type="button" class="motion-type-btn ${curType === 'drift' ? 'is-active' : ''}" data-layer-id="${layer.id}" data-motion-type="drift" title="Trôi: Dịch chuyển ngang/dọc theo hướng dòng chảy">
                              🍃 Trôi
                            </button>
                            <button type="button" class="motion-type-btn ${curType === 'ripple' ? 'is-active' : ''}" data-layer-id="${layer.id}" data-motion-type="ripple" title="Gợn: Uốn lượn bề mặt bằng sóng sin hài âm">
                              🌊 Gợn
                            </button>
                          </div>
                        </div>

                        <!-- Điểm neo (Pivot / Anchor) cho từng lớp -->
                        <div class="layer-anchor-row">
                          <label>Điểm neo (Pivot):</label>
                          <div class="layer-anchor-controls">
                            <span class="anchor-coords-badge">(${Math.round(curAnchor.x * 100)}%, ${Math.round(curAnchor.y * 100)}%)</span>
                            <button type="button" class="btn-pick-layer-anchor ${this.pickingAnchorLayerId === layer.id ? 'is-picking' : ''}" data-layer-id="${layer.id}" title="Nhấp chuột lên ảnh để chọn điểm neo (gốc cố định)">
                              ${this.pickingAnchorLayerId === layer.id ? '📍 Đang chọn (Nhấp lên ảnh)...' : '🎯 Đặt neo'}
                            </button>
                          </div>
                        </div>

                        <!-- Biên độ (Amplitude in ‰) -->
                        <div class="layer-slider-row">
                          <label>Biên độ: ‰ cạnh dài (≈ ${(curAmp * (typeof unitPx === 'function' ? unitPx() : 1)).toFixed(1)} px)</label>
                          <input type="range" class="slider-layer-amp" data-layer-id="${layer.id}" min="0.1" max="${typeLimit}" step="0.1" value="${curAmp}" />
                          <span class="slider-val val-amp">${curAmp.toFixed(1)}‰ (≈ ${(curAmp * (typeof unitPx === 'function' ? unitPx() : 1)).toFixed(1)} px)</span>
                        </div>
                        <div class="motion-warning-banner" style="display: ${isWarning ? 'flex' : 'none'};" title="Biên độ vượt 75% ngưỡng khuyến nghị (${(typeLimit * warnRatio).toFixed(1)}‰), có thể gây khó chịu cho mắt">
                          ⚠️ Dễ gây rối mắt (Vượt ${(typeLimit * warnRatio).toFixed(1)}‰)
                        </div>

                        <!-- Chu kỳ vòng lặp (${cfgObj.loop.min} - ${cfgObj.loop.max} giây) -->
                        <div class="layer-slider-row">
                          <label>Chu kỳ lặp:</label>
                          <input type="range" class="slider-layer-loop" data-layer-id="${layer.id}" min="${cfgObj.loop.min}" max="${cfgObj.loop.max}" step="1" value="${curLoopSec}" />
                          <span class="slider-val">${curLoopSec} giây</span>
                        </div>

                        <!-- Độ hỗn loạn (Chaos Noise 0 - 50%) -->
                        <div class="layer-slider-row">
                          <label>Độ hỗn loạn:</label>
                          <input type="range" class="slider-layer-chaos" data-layer-id="${layer.id}" min="0" max="50" step="1" value="${Math.round(curChaos * 100)}" />
                          <span class="slider-val">${Math.round(curChaos * 100)}%</span>
                        </div>
                        <div class="layer-slider-row">
                          <label>Tốc độ:</label>
                          <input type="range" class="slider-layer-speed" data-layer-id="${layer.id}" min="0.1" max="5.0" step="0.1" value="${layer.speed}" />
                          <span class="slider-val">${layer.speed.toFixed(1)}x</span>
                        </div>
                        <div class="layer-slider-row">
                          <label>Cường độ:</label>
                          <input type="range" class="slider-layer-intensity" data-layer-id="${layer.id}" min="0.0" max="3.0" step="0.05" value="${layer.intensity}" />
                          <span class="slider-val">${layer.intensity.toFixed(2)}</span>
                        </div>
                        <div class="layer-slider-row">
                          <label>Hướng:</label>
                          <input type="range" class="slider-layer-direction" data-layer-id="${layer.id}" min="-180" max="180" step="5" value="${layer.direction}" />
                          <span class="slider-val">${layer.direction}°</span>
                        </div>
                        <div class="layer-slider-row">
                          <label>Độ sâu (Depth):</label>
                          <input type="range" class="slider-layer-depth" data-layer-id="${layer.id}" min="0.0" max="1.0" step="0.05" value="${layer.depth}" />
                          <span class="slider-val val-depth">${layer.depth.toFixed(2)} (${depthLabel})</span>
                        </div>

                        <!-- GIAI ĐOẠN 6: Bảng điều khiển Vật lý nhẹ (tóc/váy/dây) -->
                        <div class="layer-physics-box">
                          <div class="layer-physics-header">
                            <label class="layer-physics-toggle-label">
                              <input type="checkbox" class="chk-layer-physics" data-layer-id="${layer.id}" ${(layer.physics && layer.physics.enabled) ? 'checked' : ''} />
                              <span class="physics-title">🌀 Vật lý đàn hồi (Tóc/Váy/Dây)</span>
                            </label>
                            ${(layer.physics && layer.physics.enabled) ? `<span class="physics-badge active">Đang bật</span>` : `<span class="physics-badge">Tắt</span>`}
                          </div>

                          ${(layer.physics && layer.physics.enabled) ? `
                            <div class="layer-physics-controls">
                              <div class="layer-physics-row">
                                <label>Neo gốc (Anchor):</label>
                                <div class="physics-anchor-wrap">
                                  <span class="physics-anchor-coords">(${((layer.physics.anchor?.x ?? 0.5) * 100).toFixed(0)}%, ${((layer.physics.anchor?.y ?? 0.1) * 100).toFixed(0)}%)</span>
                                  <button type="button" class="btn-pick-anchor" data-layer-id="${layer.id}" title="Nhấp để đặt điểm neo gốc">
                                    🎯 Đặt neo
                                  </button>
                                </div>
                              </div>

                              <div class="layer-slider-row">
                                <label>Độ cứng (Stiffness):</label>
                                <input type="range" class="slider-physics-stiffness" data-layer-id="${layer.id}" min="0.1" max="5.0" step="0.1" value="${layer.physics.stiffness ?? 1.0}" />
                                <span class="slider-val">${(layer.physics.stiffness ?? 1.0).toFixed(1)}</span>
                              </div>

                              <div class="layer-slider-row">
                                <label>Giảm chấn (Damping):</label>
                                <input type="range" class="slider-physics-damping" data-layer-id="${layer.id}" min="0.1" max="1.0" step="0.05" value="${layer.physics.damping ?? 0.7}" />
                                <span class="slider-val">${(layer.physics.damping ?? 0.7).toFixed(2)}</span>
                              </div>

                              <div class="layer-slider-row">
                                <label>Độ trễ pha (Lag):</label>
                                <input type="range" class="slider-physics-lag" data-layer-id="${layer.id}" min="0.0" max="1.0" step="0.05" value="${layer.physics.lag ?? 0.4}" />
                                <span class="slider-val">${(layer.physics.lag ?? 0.4).toFixed(2)}</span>
                              </div>
                            </div>
                          ` : ''}
                        </div>
                      </div>
                      `;
                    })() : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Advanced Wave Settings (Accordion, Default Closed) -->
          <details class="motion-advanced-details">
            <summary class="advanced-summary">
              ⚙️ Cấu hình sóng sin nâng cao & Nhiễu Perlin
            </summary>
            <div class="advanced-content">
              <div class="adv-field-row">
                <label>Số sóng sin hài âm (2-3):</label>
                <input type="range" id="advSliderWaves" min="2" max="3" step="1" value="${this.config.advanced.waves}" />
                <span id="advWavesVal" class="adv-val">${this.config.advanced.waves}</span>
              </div>
              <div class="adv-field-row">
                <label>Tần số cơ bản (Freq):</label>
                <input type="range" id="advSliderFreq" min="0.5" max="3.0" step="0.1" value="${this.config.advanced.freq}" />
                <span id="advFreqVal" class="adv-val">${this.config.advanced.freq.toFixed(1)}</span>
              </div>
              <div class="adv-field-row">
                <label>Độ lệch pha (Phase Lag):</label>
                <input type="range" id="advSliderPhase" min="0.0" max="1.5" step="0.05" value="${this.config.advanced.phaseLag}" />
                <span id="advPhaseVal" class="adv-val">${this.config.advanced.phaseLag.toFixed(2)}</span>
              </div>
              <div class="adv-field-row">
                <label>Biên độ nhiễu (Noise):</label>
                <input type="range" id="advSliderNoise" min="0.0" max="1.0" step="0.05" value="${this.config.advanced.noise}" />
                <span id="advNoiseVal" class="adv-val">${this.config.advanced.noise.toFixed(2)}</span>
              </div>
            </div>
          </details>

          <!-- GIAI ĐOẠN 6: Modal Gợi ý vùng tự động (0 AI) -->
          ${this.isSuggestModalOpen ? `
            <div class="motion-suggest-modal-backdrop" id="motionSuggestModalBackdrop">
              <div class="motion-suggest-modal" id="motionSuggestModal">
                <div class="suggest-modal-header">
                  <div class="suggest-modal-title-wrap">
                    <span class="suggest-modal-icon">✨</span>
                    <div>
                      <h4 class="suggest-modal-title">GỢI Ý VÙNG TỰ ĐỘNG (0 AI)</h4>
                      <p class="suggest-modal-subtitle">Phân tích không gian màu &amp; gradient biên phát hiện các vùng chuyển động tự nhiên</p>
                    </div>
                  </div>
                  <button type="button" class="suggest-modal-close" id="btnCloseSuggestModal" title="Đóng">&times;</button>
                </div>

                <div class="suggest-modal-body">
                  <div class="suggest-modal-hint">
                    Chọn các vùng chuyển động bạn muốn thêm vào danh sách lớp:
                  </div>
                  <div class="suggest-candidates-list">
                    ${this._suggestCandidates.map(cand => `
                      <div class="suggest-candidate-card ${cand.selected ? 'is-selected' : ''}" data-cand-id="${cand.id}">
                        <div class="cand-checkbox-wrap">
                          <input type="checkbox" class="chk-candidate" data-cand-id="${cand.id}" ${cand.selected ? 'checked' : ''} />
                        </div>
                        <div class="cand-swatch" style="background-color: ${cand.color}; box-shadow: 0 0 8px ${cand.color}88;"></div>
                        <div class="cand-info">
                          <div class="cand-name-row">
                            <span class="cand-name">${this._escapeHtml(cand.name)}</span>
                            <span class="cand-depth-badge">Độ sâu: ${(cand.depth ?? 0.5).toFixed(2)} (${cand.depth >= 0.7 ? 'Gần' : (cand.depth <= 0.3 ? 'Xa' : 'Trung')})</span>
                          </div>
                          <div class="cand-meta-row">
                            <span class="cand-physics-tag ${(cand.physics && cand.physics.enabled) ? 'physics-on' : 'physics-off'}">
                              ${(cand.physics && cand.physics.enabled) ? '🌀 Lò xo đàn hồi (Anchor + Lag)' : '🌊 Dòng chảy mượt'}
                            </span>
                            <span class="cand-speed-tag">Tốc độ: ${(cand.speed ?? 1.0).toFixed(1)}x</span>
                          </div>
                        </div>
                        <button type="button" class="btn-remove-candidate" data-cand-id="${cand.id}" title="Xóa đề xuất này">
                          🗑️
                        </button>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <div class="suggest-modal-footer">
                  <button type="button" class="suggest-btn-cancel" id="btnCancelSuggestModal">Hủy</button>
                  <button type="button" class="suggest-btn-apply" id="btnApplySuggestModal">
                    ✓ Thêm vào danh sách lớp (${this._suggestCandidates.filter(c => c.selected).length})
                  </button>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      `;

      this._attachUIEvents();
      this.renderSafeZonesOverlay();
    }

    _escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    _attachUIEvents() {
      if (!this.container) return;

      // GIAI ĐOẠN 3: Reduce layers & Calm controls
      const reduceBtn = this.container.querySelector('#btnCalmReduceLayers');
      if (reduceBtn) {
        reduceBtn.onclick = () => this.reduceExcessLayers();
      }

      const chkSafe = this.container.querySelector('#chkSafeZones');
      if (chkSafe) {
        chkSafe.onchange = (e) => {
          this.showSafeZones = e.target.checked;
          if (typeof window !== 'undefined' && window.MotionEngine) {
            window.MotionEngine.showSafeZones = this.showSafeZones;
          }
          this.renderSafeZonesOverlay();
        };
      }

      const chkFocus = this.container.querySelector('#chkFocusShield');
      if (chkFocus) {
        chkFocus.onchange = (e) => {
          this.focusShieldEnabled = e.target.checked;
          if (typeof window !== 'undefined' && window.MotionEngine && typeof window.MotionEngine.setFocusShieldEnabled === 'function') {
            window.MotionEngine.setFocusShieldEnabled(this.focusShieldEnabled);
          }
        };
      }

      const chkBlur = this.container.querySelector('#chkBlurFocus');
      if (chkBlur) {
        chkBlur.onchange = (e) => {
          this.blurFocusEnabled = e.target.checked;
          this.renderSafeZonesOverlay();
        };
      }

      // Clean view button
      const cleanBtn = this.container.querySelector('#btnMotionCleanView');
      if (cleanBtn) cleanBtn.onclick = () => this.toggleCleanView();

      // Compare toggle
      const compBtn = this.container.querySelector('#btnToggleCompare');
      if (compBtn) compBtn.onclick = () => this.toggleCompare();

      // Compare slider
      const compSlider = this.container.querySelector('#sliderCompareRatio');
      if (compSlider) {
        compSlider.oninput = (e) => this.setCompareRatio(e.target.value);
        compSlider.onchange = () => this._saveSnapshot();
      }

      // Undo / Redo
      const undoBtn = this.container.querySelector('#btnMotionUndo');
      if (undoBtn) undoBtn.onclick = () => this.undo();

      const redoBtn = this.container.querySelector('#btnMotionRedo');
      if (redoBtn) redoBtn.onclick = () => this.redo();

      // Intensity Presets
      const intBtns = this.container.querySelectorAll('.intensity-btn');
      intBtns.forEach(btn => {
        btn.onclick = () => this.setIntensityPreset(btn.dataset.intensity);
      });

      // Mouse Parallax Toggle
      const parChk = this.container.querySelector('#chkMotionParallax');
      if (parChk) {
        parChk.onchange = (e) => this.setParallaxMouse(e.target.checked);
      }

      // Auto Depth Button
      const autoDepthBtn = this.container.querySelector('#btnAutoDepth');
      if (autoDepthBtn) {
        autoDepthBtn.onclick = () => this.generateAutoDepth();
      }

      // Depth Brush Button
      const depthBrushBtn = this.container.querySelector('#btnDepthBrush');
      if (depthBrushBtn) {
        depthBrushBtn.onclick = () => {
          this.depthBrushActive = !this.depthBrushActive;
          depthBrushBtn.classList.toggle('is-active', this.depthBrushActive);
          console.log(`[MotionUI] Cọ tô độ sâu: ${this.depthBrushActive ? 'BẬT' : 'TẮT'}`);
        };
      }

      // Preset pills
      const presetBtns = this.container.querySelectorAll('.motion-preset-pill[data-preset]');
      presetBtns.forEach(btn => {
        btn.onclick = () => this.applyPresetLayer(btn.dataset.preset);
      });

      // 3-Layer demo loader
      const demoBtn = this.container.querySelector('#btnLoadThreeLayers');
      if (demoBtn) {
        demoBtn.onclick = () => this.loadThreeLayerDemo();
      }

      // Add layer
      const addBtn = this.container.querySelector('#btnMotionAddLayer');
      if (addBtn) addBtn.onclick = () => this.addLayer();

      // Suggest regions button
      const suggestBtn = this.container.querySelector('#btnMotionSuggestRegions');
      if (suggestBtn) {
        suggestBtn.onclick = () => this.openSuggestRegionsModal();
      }

      // Select active layer
      const items = this.container.querySelectorAll('.motion-layer-item');
      items.forEach(el => {
        el.onclick = (e) => {
          if (e.target.closest('.motion-btn-icon') || e.target.closest('input')) return;
          this.setActiveLayer(el.dataset.layerId);
        };
      });

      // Layer name editing
      const nameInputs = this.container.querySelectorAll('.motion-layer-name-input');
      nameInputs.forEach(inp => {
        inp.onchange = (e) => {
          const target = this.layers.find(l => l.id === e.target.dataset.layerId);
          if (target && e.target.value.trim()) {
            target.name = e.target.value.trim();
            this._saveSnapshot();
            this._syncToEngine();
          }
        };
      });

      // Layer buttons: Visibility, Lock, Duplicate, Delete
      const visBtns = this.container.querySelectorAll('.btn-layer-vis');
      visBtns.forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          this.toggleLayerVisibility(btn.dataset.layerId);
        };
      });

      const lockBtns = this.container.querySelectorAll('.btn-layer-lock');
      lockBtns.forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          this.toggleLayerLock(btn.dataset.layerId);
        };
      });

      const dupBtns = this.container.querySelectorAll('.btn-layer-dup');
      dupBtns.forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          this.duplicateLayer(btn.dataset.layerId);
        };
      });

      const delBtns = this.container.querySelectorAll('.btn-layer-del');
      delBtns.forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          this.removeLayer(btn.dataset.layerId);
        };
      });

      // ─────────────────────────────────────────────────────────────
      // GIAI ĐOẠN 2: Motion Type, Anchor, Amplitude, Loop & Chaos
      // ─────────────────────────────────────────────────────────────
      const btnSeamCheck = this.container.querySelector('#btnMotionSeamCheck');
      if (btnSeamCheck) {
        btnSeamCheck.onclick = () => this.toggleSeamCheck();
      }

      const typeBtns = this.container.querySelectorAll('.motion-type-btn');
      typeBtns.forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          this.setLayerMotionType(btn.dataset.layerId, btn.dataset.motionType);
        };
      });

      const layerAnchorBtns = this.container.querySelectorAll('.btn-pick-layer-anchor');
      layerAnchorBtns.forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const layerId = btn.dataset.layerId;
          this.pickingAnchorLayerId = this.pickingAnchorLayerId === layerId ? null : layerId;
          this.render();
          if (this.studioInstance && this.studioInstance.redrawEditor) {
            this.studioInstance.redrawEditor();
          }
        };
      });

      const ampSliders = this.container.querySelectorAll('.slider-layer-amp');
      ampSliders.forEach(sl => {
        sl.oninput = (e) => {
          const val = Number(e.target.value);
          this.setLayerAmplitude(e.target.dataset.layerId, val);
          const px = (val * (typeof unitPx === 'function' ? unitPx() : 1)).toFixed(1);
          const s = e.target.parentNode.querySelector('.val-amp');
          if (s) s.textContent = `${val.toFixed(1)}‰ (≈ ${px} px)`;
          const lbl = e.target.parentNode.querySelector('label');
          if (lbl) lbl.textContent = `Biên độ: ‰ cạnh dài (≈ ${px} px)`;
          // Dynamically check warning
          const target = this.layers.find(l => l.id === e.target.dataset.layerId);
          const mType = (target && target.motionType) || 'sway';
          const lim = (getCFG().motion.limit && getCFG().motion.limit[mType]) || 3.0;
          const warn = getCFG().motion.warnRatio || 0.75;
          const box = e.target.closest('.layer-sliders-box');
          if (box) {
            const banner = box.querySelector('.motion-warning-banner');
            if (banner) {
              banner.style.display = (val >= lim * warn) ? 'flex' : 'none';
            }
          }
        };
        sl.onchange = () => {
          this._saveSnapshot();
          this.render();
        };
      });

      const loopSliders = this.container.querySelectorAll('.slider-layer-loop');
      loopSliders.forEach(sl => {
        sl.oninput = (e) => {
          const val = Number(e.target.value);
          this.updateLayerProperty(e.target.dataset.layerId, 'loopSec', val);
          const s = e.target.parentNode.querySelector('.slider-val');
          if (s) s.textContent = `${val} giây`;
        };
        sl.onchange = () => this._saveSnapshot();
      });

      const chaosSliders = this.container.querySelectorAll('.slider-layer-chaos');
      chaosSliders.forEach(sl => {
        sl.oninput = (e) => {
          const val = Number(e.target.value) / 100;
          this.updateLayerProperty(e.target.dataset.layerId, 'chaos', val);
          const s = e.target.parentNode.querySelector('.slider-val');
          if (s) s.textContent = `${Math.round(val * 100)}%`;
        };
        chaosSliders.onchange = () => this._saveSnapshot();
      });

      // Sliders: Speed, Intensity, Direction, Depth
      const speedSliders = this.container.querySelectorAll('.slider-layer-speed');
      speedSliders.forEach(sl => {
        sl.oninput = (e) => {
          const val = Number(e.target.value);
          this.updateLayerProperty(e.target.dataset.layerId, 'speed', val);
          const s = e.target.parentNode.querySelector('.slider-val');
          if (s) s.textContent = `${val.toFixed(1)}x`;
        };
        sl.onchange = () => this._saveSnapshot();
      });

      const intSliders = this.container.querySelectorAll('.slider-layer-intensity');
      intSliders.forEach(sl => {
        sl.oninput = (e) => {
          const val = Number(e.target.value);
          this.updateLayerProperty(e.target.dataset.layerId, 'intensity', val);
          const s = e.target.parentNode.querySelector('.slider-val');
          if (s) s.textContent = val.toFixed(2);
        };
        intSliders.onchange = () => this._saveSnapshot();
      });

      const dirSliders = this.container.querySelectorAll('.slider-layer-direction');
      dirSliders.forEach(sl => {
        sl.oninput = (e) => {
          const val = Number(e.target.value);
          this.updateLayerProperty(e.target.dataset.layerId, 'direction', val);
          const s = e.target.parentNode.querySelector('.slider-val');
          if (s) s.textContent = `${val}°`;
        };
        dirSliders.onchange = () => this._saveSnapshot();
      });

      const depthSliders = this.container.querySelectorAll('.slider-layer-depth');
      depthSliders.forEach(sl => {
        sl.oninput = (e) => {
          const val = Number(e.target.value);
          this.updateLayerProperty(e.target.dataset.layerId, 'depth', val);
          const s = e.target.parentNode.querySelector('.slider-val');
          const lbl = val >= 0.7 ? 'Gần' : (val <= 0.3 ? 'Xa' : 'Trung');
          if (s) s.textContent = `${val.toFixed(2)} (${lbl})`;
        };
        depthSliders.onchange = () => this._saveSnapshot();
      });

      // ─────────────────────────────────────────────────────────────
      // GIAI ĐOẠN 6: Physics Controls & Suggest Regions Modal Events
      // ─────────────────────────────────────────────────────────────
      const chkPhysics = this.container.querySelectorAll('.chk-layer-physics');
      chkPhysics.forEach(chk => {
        chk.onchange = (e) => {
          this.setLayerPhysics(e.target.dataset.layerId, { enabled: e.target.checked });
          this.render();
        };
      });

      const anchorBtns = this.container.querySelectorAll('.btn-pick-anchor');
      anchorBtns.forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          this.pickAnchor(btn.dataset.layerId);
        };
      });

      const stiffSliders = this.container.querySelectorAll('.slider-physics-stiffness');
      stiffSliders.forEach(sl => {
        sl.oninput = (e) => {
          const val = Number(e.target.value);
          this.setLayerPhysics(e.target.dataset.layerId, { stiffness: val });
          const s = e.target.parentNode.querySelector('.slider-val');
          if (s) s.textContent = val.toFixed(1);
        };
      });

      const dampSliders = this.container.querySelectorAll('.slider-physics-damping');
      dampSliders.forEach(sl => {
        sl.oninput = (e) => {
          const val = Number(e.target.value);
          this.setLayerPhysics(e.target.dataset.layerId, { damping: val });
          const s = e.target.parentNode.querySelector('.slider-val');
          if (s) s.textContent = val.toFixed(2);
        };
      });

      const lagSliders = this.container.querySelectorAll('.slider-physics-lag');
      lagSliders.forEach(sl => {
        sl.oninput = (e) => {
          const val = Number(e.target.value);
          this.setLayerPhysics(e.target.dataset.layerId, { lag: val });
          const s = e.target.parentNode.querySelector('.slider-val');
          if (s) s.textContent = val.toFixed(2);
        };
      });

      // Suggest Regions Modal Actions
      const closeSugBtn = this.container.querySelector('#btnCloseSuggestModal');
      if (closeSugBtn) closeSugBtn.onclick = () => this.closeSuggestRegionsModal();

      const cancelSugBtn = this.container.querySelector('#btnCancelSuggestModal');
      if (cancelSugBtn) cancelSugBtn.onclick = () => this.closeSuggestRegionsModal();

      const chkCands = this.container.querySelectorAll('.chk-candidate');
      chkCands.forEach(chk => {
        chk.onchange = (e) => {
          this.toggleSuggestCandidate(e.target.dataset.candId);
        };
      });

      const delCandBtns = this.container.querySelectorAll('.btn-remove-candidate');
      delCandBtns.forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          this.removeSuggestCandidate(btn.dataset.candId);
        };
      });

      const applySugBtn = this.container.querySelector('#btnApplySuggestModal');
      if (applySugBtn) {
        applySugBtn.onclick = () => this.applySuggestedRegions();
      }

      // Advanced Wave controls
      const advWaves = this.container.querySelector('#advSliderWaves');
      if (advWaves) {
        advWaves.oninput = (e) => {
          this.config.advanced.waves = Number(e.target.value);
          const s = this.container.querySelector('#advWavesVal');
          if (s) s.textContent = this.config.advanced.waves;
          this._syncToEngine();
        };
      }

      const advFreq = this.container.querySelector('#advSliderFreq');
      if (advFreq) {
        advFreq.oninput = (e) => {
          this.config.advanced.freq = Number(e.target.value);
          const s = this.container.querySelector('#advFreqVal');
          if (s) s.textContent = this.config.advanced.freq.toFixed(1);
          this._syncToEngine();
        };
      }

      const advPhase = this.container.querySelector('#advSliderPhase');
      if (advPhase) {
        advPhase.oninput = (e) => {
          this.config.advanced.phaseLag = Number(e.target.value);
          const s = this.container.querySelector('#advPhaseVal');
          if (s) s.textContent = this.config.advanced.phaseLag.toFixed(2);
          this._syncToEngine();
        };
      }

      const advNoise = this.container.querySelector('#advSliderNoise');
      if (advNoise) {
        advNoise.oninput = (e) => {
          this.config.advanced.noise = Number(e.target.value);
          const s = this.container.querySelector('#advNoiseVal');
          if (s) s.textContent = this.config.advanced.noise.toFixed(2);
          this._syncToEngine();
        };
      }
    }

    applyPreset(presetId) {
      return this.applyPresetLayer(presetId);
    }

    loadImage(url) {
      if (this.studioInstance && typeof this.studioInstance.loadImage === 'function') {
        return this.studioInstance.loadImage(url);
      }
    }
  }

  const instance = new MotionUIController();
  return instance;
});
