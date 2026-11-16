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

  const LAYER_PALETTE = ['#7DCFFF', '#73DACA', '#FF9E64', '#BB9AF7', '#E0AF68', '#F7768E', '#2AC3DE'];

  // Preset Layer Templates
  const PRESET_LAYERS = {
    'hair-wind': {
      name: 'Tóc bay',
      color: '#7DCFFF',
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
          depth: 0.85
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
        const initImg = (window.appState && window.appState.wallpaperUrl) || '../assets/violinist-earth.jpg';
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
        depth: 0.50
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
        depth: src.depth
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
        depth: tmpl.depth
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
          depth: 0.85
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
          depth: 0.60
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
          depth: 0.10
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
      if (typeof window !== 'undefined' && window.MotionEngine && typeof window.MotionEngine.setConfig === 'function') {
        window.MotionEngine.setConfig(this.getConfig());
      }
      if (typeof window !== 'undefined' && window.appState) {
        window.appState.motionFlow = this.getConfig();
      }
    }

    // ─────────────────────────────────────────────────────────────
    // UI Rendering
    // ─────────────────────────────────────────────────────────────
    render() {
      if (!this.container) return;

      const activeLayer = this.getActiveLayer();
      const curPreset = this.config.intensityPreset || 'vua';

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

          <!-- Layers Management Panel -->
          <div class="motion-layers-panel">
            <div class="motion-layers-header">
              <div class="motion-panel-title">
                <span class="panel-icon">🥞</span>
                <span>DANH SÁCH LỚP (${this.layers.length})</span>
              </div>
              <button type="button" id="btnMotionAddLayer" class="motion-btn-add-layer" title="Thêm lớp chuyển động trống">
                + Thêm lớp
              </button>
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
                    ${isActive ? `
                      <div class="layer-sliders-box">
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
                      </div>
                    ` : ''}
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
        </div>
      `;

      this._attachUIEvents();
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
