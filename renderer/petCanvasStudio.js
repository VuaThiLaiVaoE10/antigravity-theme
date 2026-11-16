/**
 * PetCanvasStudio - Giai Đoạn 1, Part A
 * Full-featured sprite/pet image editor engine.
 *
 * Features:
 *   1. Image loading (File, Drag-drop, DataURL) with original buffer preservation
 *   2. Viewport: zoom (wheel), pan (space+drag / pan mode), checkered background
 *   3. Editing tools: Eraser, Restore brush, Magic Wand, Eyedropper
 *   4. Trim & Crop: auto-trim, manual marquee crop
 *   5. Anchor point (foot anchor) with crosshair rendering
 *   6. Hitbox: draggable & resizable rectangle overlay
 *   7. Undo/Redo (min 30 states, Ctrl+Z / Ctrl+Y)
 *   8. Export: getCleanCanvas(), exportPNGDataUrl(), getPetData()
 *
 * Usage:
 *   const studio = new PetCanvasStudio(containerEl, options);
 *
 * UMD + ES6 class, attached to window.PetCanvasStudio.
 */
(function (global, factory) {
  'use strict';
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else {
    global.PetCanvasStudio = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // ─── Constants ───────────────────────────────────────────────────────────────

  const HISTORY_MAX = 50;
  const CHECKER_SIZE = 12;

  const TOOLS = Object.freeze({
    PAN:        'pan',
    ERASER:     'eraser',
    RESTORE:    'restore',
    MAGIC_WAND: 'magicWand',
    EYEDROPPER: 'eyedropper',
    CROP:       'crop',
    ANCHOR:     'anchor',
    HITBOX:     'hitbox',
  });

  // ─── Utility helpers ─────────────────────────────────────────────────────────

  /** Create a canvas with the given dimensions */
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width  = w;
    c.height = h;
    return c;
  }

  /** Copy src canvas into dst canvas (must be same size) */
  function copyCanvas(src, dst) {
    const ctx = dst.getContext('2d');
    ctx.clearRect(0, 0, dst.width, dst.height);
    ctx.drawImage(src, 0, 0);
  }

  /** Clamp a value between min and max */
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /**
   * Color distance (R,G,B,A channels) for tolerance comparison.
   * Returns a 0-100 normalised score.
   */
  function colorDist(r1, g1, b1, a1, r2, g2, b2, a2) {
    const dr = r1 - r2, dg = g1 - g2, db = b1 - b2, da = a1 - a2;
    return Math.sqrt(dr*dr + dg*dg + db*db + da*da) / (Math.sqrt(4) * 255) * 100;
  }

  /** Snap float image coordinate to integer pixel */
  function px(v) { return Math.floor(v); }

  // ─── Checkerboard background ─────────────────────────────────────────────────

  function buildCheckerPattern(size) {
    const c = makeCanvas(size * 2, size * 2);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, 0, size * 2, size * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillRect(size, size, size, size);
    return c;
  }

  // ─── Main Class ──────────────────────────────────────────────────────────────

  class PetCanvasStudio {
    /**
     * @param {HTMLElement} container  – host element (gets canvas injected)
     * @param {object}      [opts]     – optional config overrides
     */
    constructor(container, opts = {}) {
      if (!container || !(container instanceof HTMLElement)) {
        throw new Error('PetCanvasStudio: container must be an HTMLElement');
      }

      this._container = container;
      this._opts = Object.assign({
        brushRadius:   16,
        tolerance:     30,
        contiguous:    true,
        initialTool:   TOOLS.ERASER,
      }, opts);

      // ── State ──
      this._zoom      = 1;
      this._panX      = 0;
      this._panY      = 0;
      this._tool      = this._opts.initialTool;
      this._brushRadius = this._opts.brushRadius;
      this._tolerance   = this._opts.tolerance;
      this._contiguous  = this._opts.contiguous;

      // Image state
      this._imgCanvas   = null;   // working copy
      this._origCanvas  = null;   // original (never mutated)
      this._width       = 0;
      this._height      = 0;

      // Anchor
      this._anchorX = 0;
      this._anchorY = 0;

      // Hitbox
      this._hitbox = { x: 0, y: 0, w: 0, h: 0 };

      // Undo / Redo
      this._undoStack = [];
      this._redoStack = [];

      // Interaction state
      this._isPainting  = false;
      this._isSpaceDown = false;
      this._isPanning   = false;
      this._panStartX   = 0;
      this._panStartY   = 0;
      this._panOriginX  = 0;
      this._panOriginY  = 0;

      // Crop marquee state
      this._cropStart  = null;
      this._cropRect   = null;

      // Hitbox drag/resize
      this._hitboxDrag    = null;   // { type: 'move'|'resize', handle, startMouse, startHitbox }

      // Checker pattern
      this._checker = buildCheckerPattern(CHECKER_SIZE);

      this._buildDOM();
      this._bindEvents();
    }

    // ── Static tool constants ──────────────────────────────────────────────────

    static get TOOLS() { return TOOLS; }

    // ── DOM Setup ─────────────────────────────────────────────────────────────

    _buildDOM() {
      // Outer viewport div (clipping region)
      const viewport = document.createElement('div');
      viewport.className = 'pcs-viewport';
      Object.assign(viewport.style, {
        position: 'relative',
        width:    '100%',
        height:   '100%',
        overflow: 'hidden',
        background: 'var(--color-paper-contrast, #1a1a1a)',
        userSelect: 'none',
        cursor:   'crosshair',
      });

      // Main render canvas
      const canvas = document.createElement('canvas');
      canvas.className = 'pcs-canvas';
      Object.assign(canvas.style, {
        position:           'absolute',
        top:                '0',
        left:               '0',
        imageRendering:     'pixelated',
        touchAction:        'none',
        willChange:         'transform',
      });

      // Overlay canvas for handles / anchor / hitbox / marquee
      const overlay = document.createElement('canvas');
      overlay.className = 'pcs-overlay';
      Object.assign(overlay.style, {
        position:    'absolute',
        top:         '0',
        left:        '0',
        pointerEvents: 'none',
        willChange:  'transform',
      });

      viewport.appendChild(canvas);
      viewport.appendChild(overlay);
      this._container.appendChild(viewport);

      this._viewport = viewport;
      this._canvas   = canvas;
      this._overlay  = overlay;

      // Drop zone affordance
      viewport.setAttribute('tabindex', '0');
    }

    // ── Event binding ─────────────────────────────────────────────────────────

    _bindEvents() {
      const vp = this._viewport;

      // Keyboard
      window.addEventListener('keydown', this._onKeyDown.bind(this));
      window.addEventListener('keyup',   this._onKeyUp.bind(this));

      // Mouse
      vp.addEventListener('mousedown',  this._onMouseDown.bind(this));
      vp.addEventListener('mousemove',  this._onMouseMove.bind(this));
      vp.addEventListener('mouseup',    this._onMouseUp.bind(this));
      vp.addEventListener('mouseleave', this._onMouseUp.bind(this));

      // Wheel (zoom)
      vp.addEventListener('wheel', this._onWheel.bind(this), { passive: false });

      // Drag-drop
      vp.addEventListener('dragover',  e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
      vp.addEventListener('drop',      this._onDrop.bind(this));

      // Overlay events for hitbox handles (pointer)
      this._overlay.style.pointerEvents = 'auto';
      this._overlay.addEventListener('mousedown', this._onOverlayMouseDown.bind(this));
    }

    // ── Keyboard ──────────────────────────────────────────────────────────────

    _onKeyDown(e) {
      if (e.code === 'Space') {
        this._isSpaceDown = true;
        this._viewport.style.cursor = 'grab';
        e.preventDefault();
      }
      if (e.ctrlKey && e.code === 'KeyZ') { e.preventDefault(); this.undo(); }
      if (e.ctrlKey && (e.code === 'KeyY' || (e.shiftKey && e.code === 'KeyZ'))) { e.preventDefault(); this.redo(); }
    }

    _onKeyUp(e) {
      if (e.code === 'Space') {
        this._isSpaceDown = false;
        this._updateCursor();
      }
    }

    // ── Mouse ─────────────────────────────────────────────────────────────────

    _onMouseDown(e) {
      if (e.button !== 0) return;
      if (!this._imgCanvas)  return;

      const { ix, iy } = this._viewToImage(e.offsetX, e.offsetY);

      // Pan mode
      if (this._tool === TOOLS.PAN || this._isSpaceDown) {
        this._isPanning   = true;
        this._panStartX   = e.clientX;
        this._panStartY   = e.clientY;
        this._panOriginX  = this._panX;
        this._panOriginY  = this._panY;
        this._viewport.style.cursor = 'grabbing';
        return;
      }

      switch (this._tool) {
        case TOOLS.ERASER:
        case TOOLS.RESTORE:
          this._pushUndo();
          this._isPainting = true;
          this._applyBrush(ix, iy, this._tool);
          this._render();
          break;

        case TOOLS.MAGIC_WAND:
          this._pushUndo();
          this._applyMagicWand(px(ix), px(iy));
          this._render();
          break;

        case TOOLS.EYEDROPPER:
          this._pushUndo();
          this._applyEyedropper(px(ix), px(iy));
          this._render();
          break;

        case TOOLS.CROP:
          this._cropStart = { x: ix, y: iy };
          this._cropRect  = null;
          break;

        case TOOLS.ANCHOR:
          this._anchorX = clamp(ix, 0, this._width);
          this._anchorY = clamp(iy, 0, this._height);
          this._renderOverlay();
          this._emit('anchorChanged', { anchorX: this._anchorX, anchorY: this._anchorY });
          break;

        case TOOLS.HITBOX:
          // handled in overlay mousedown
          break;
      }
    }

    _onMouseMove(e) {
      if (!this._imgCanvas) return;

      if (this._isPanning) {
        this._panX = this._panOriginX + (e.clientX - this._panStartX);
        this._panY = this._panOriginY + (e.clientY - this._panStartY);
        this._applyTransform();
        return;
      }

      const { ix, iy } = this._viewToImage(e.offsetX, e.offsetY);

      if (this._isPainting && (this._tool === TOOLS.ERASER || this._tool === TOOLS.RESTORE)) {
        this._applyBrush(ix, iy, this._tool);
        this._render();
      }

      if (this._tool === TOOLS.CROP && this._cropStart) {
        const x = Math.min(this._cropStart.x, ix);
        const y = Math.min(this._cropStart.y, iy);
        const w = Math.abs(ix - this._cropStart.x);
        const h = Math.abs(iy - this._cropStart.y);
        this._cropRect = { x, y, w, h };
        this._renderOverlay();
      }

      // Brush cursor overlay update
      if (this._tool === TOOLS.ERASER || this._tool === TOOLS.RESTORE) {
        this._renderOverlay(e.offsetX, e.offsetY);
      }
    }

    _onMouseUp(e) {
      if (this._isPanning) {
        this._isPanning = false;
        this._viewport.style.cursor = this._isSpaceDown ? 'grab' : this._getCursorForTool();
      }

      if (this._isPainting) {
        this._isPainting = false;
      }

      // Commit crop
      if (this._tool === TOOLS.CROP && this._cropRect) {
        const r = this._cropRect;
        if (r.w > 1 && r.h > 1) {
          this._pushUndo();
          this._applyCrop(Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h));
          this._render();
        }
        this._cropRect  = null;
        this._cropStart = null;
        this._renderOverlay();
      }

      if (this._hitboxDrag) {
        this._hitboxDrag = null;
        this._emit('hitboxChanged', { hitbox: { ...this._hitbox } });
      }
    }

    // ── Overlay mouse (hitbox handles) ────────────────────────────────────────

    _onOverlayMouseDown(e) {
      if (!this._imgCanvas || this._tool !== TOOLS.HITBOX) return;
      if (e.button !== 0) return;

      const handle = this._hitTestHitboxHandle(e.offsetX, e.offsetY);
      if (!handle) return;

      e.stopPropagation();
      this._pushUndo();

      this._hitboxDrag = {
        type:       handle === 'move' ? 'move' : 'resize',
        handle,
        startMouse: { x: e.clientX, y: e.clientY },
        startHitbox: { ...this._hitbox },
      };

      window.addEventListener('mousemove', this._onHitboxDragMove = (ev) => {
        if (!this._hitboxDrag) return;
        const dx = (ev.clientX - this._hitboxDrag.startMouse.x) / this._zoom;
        const dy = (ev.clientY - this._hitboxDrag.startMouse.y) / this._zoom;
        const sb = this._hitboxDrag.startHitbox;

        if (this._hitboxDrag.type === 'move') {
          this._hitbox.x = clamp(sb.x + dx, 0, this._width  - this._hitbox.w);
          this._hitbox.y = clamp(sb.y + dy, 0, this._height - this._hitbox.h);
        } else {
          this._applyHitboxResize(this._hitboxDrag.handle, sb, dx, dy);
        }
        this._renderOverlay();
      }, { passive: true });

      window.addEventListener('mouseup', this._onHitboxDragEnd = () => {
        window.removeEventListener('mousemove', this._onHitboxDragMove);
        window.removeEventListener('mouseup',   this._onHitboxDragEnd);
        this._hitboxDrag = null;
        this._emit('hitboxChanged', { hitbox: { ...this._hitbox } });
      }, { once: true });
    }

    _applyHitboxResize(handle, sb, dx, dy) {
      const minSz = 4;
      let { x, y, w, h } = sb;

      if (handle.includes('e')) { w = Math.max(minSz, sb.w + dx); }
      if (handle.includes('s')) { h = Math.max(minSz, sb.h + dy); }
      if (handle.includes('w')) {
        const nw = Math.max(minSz, sb.w - dx);
        x = sb.x + (sb.w - nw);
        w = nw;
      }
      if (handle.includes('n')) {
        const nh = Math.max(minSz, sb.h - dy);
        y = sb.y + (sb.h - nh);
        h = nh;
      }

      this._hitbox = {
        x: clamp(x, 0, this._width),
        y: clamp(y, 0, this._height),
        w: Math.min(w, this._width  - x),
        h: Math.min(h, this._height - y),
      };
    }

    // Hit-test hitbox handles. Returns handle name or null.
    _hitTestHitboxHandle(vx, vy) {
      if (!this._imgCanvas) return null;
      const hb   = this._hitbox;
      const HIT  = 8; // px tolerance
      const toV  = (ix, iy) => this._imageToView(ix, iy);

      const tl = toV(hb.x, hb.y);
      const br = toV(hb.x + hb.w, hb.y + hb.h);
      const tr = toV(hb.x + hb.w, hb.y);
      const bl = toV(hb.x, hb.y + hb.h);
      const tm = toV(hb.x + hb.w / 2, hb.y);
      const bm = toV(hb.x + hb.w / 2, hb.y + hb.h);
      const lm = toV(hb.x, hb.y + hb.h / 2);
      const rm = toV(hb.x + hb.w, hb.y + hb.h / 2);

      const near = (pt) => Math.hypot(vx - pt.vx, vy - pt.vy) < HIT;

      if (near(tl)) return 'nw';
      if (near(tr)) return 'ne';
      if (near(bl)) return 'sw';
      if (near(br)) return 'se';
      if (near(tm)) return 'n';
      if (near(bm)) return 's';
      if (near(lm)) return 'w';
      if (near(rm)) return 'e';

      // Inside => move
      if (vx > tl.vx && vx < br.vx && vy > tl.vy && vy < br.vy) return 'move';
      return null;
    }

    // ── Wheel zoom ────────────────────────────────────────────────────────────

    _onWheel(e) {
      e.preventDefault();
      if (!this._imgCanvas) return;

      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const rect   = this._viewport.getBoundingClientRect();
      const mx     = e.clientX - rect.left;
      const my     = e.clientY - rect.top;

      // Zoom toward mouse position
      const prevZoom = this._zoom;
      this._zoom = clamp(this._zoom * factor, 0.05, 32);

      const scale = this._zoom / prevZoom;
      this._panX  = mx - scale * (mx - this._panX);
      this._panY  = my - scale * (my - this._panY);

      this._applyTransform();
    }

    // ── Drag-drop / file load ─────────────────────────────────────────────────

    _onDrop(e) {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) this.loadFile(file);
    }

    /** Load from a File object */
    loadFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => this.loadDataURL(ev.target.result).then(resolve).catch(reject);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    /** Load from a DataURL string */
    loadDataURL(dataUrl) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this._initFromImage(img);
          resolve();
        };
        img.onerror = reject;
        img.src = dataUrl;
      });
    }

    _initFromImage(img) {
      const w = img.naturalWidth  || img.width;
      const h = img.naturalHeight || img.height;

      // Working copy
      this._imgCanvas = makeCanvas(w, h);
      const ctx = this._imgCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Original (immutable reference)
      this._origCanvas = makeCanvas(w, h);
      const octx = this._origCanvas.getContext('2d');
      octx.drawImage(img, 0, 0);

      this._width  = w;
      this._height = h;

      // Reset state
      this._undoStack = [];
      this._redoStack = [];
      this._anchorX   = w / 2;
      this._anchorY   = h;
      this._hitbox    = { x: 0, y: 0, w, h };
      this._cropRect  = null;

      this._fitToViewport();
      this._render();
      this._emit('imageLoaded', { width: w, height: h });
    }

    // ── Viewport transform ────────────────────────────────────────────────────

    _fitToViewport() {
      if (!this._imgCanvas) return;
      const vw = this._viewport.clientWidth  || 600;
      const vh = this._viewport.clientHeight || 400;
      const scale = Math.min(vw / this._width, vh / this._height) * 0.9;
      this._zoom = scale;
      this._panX = (vw - this._width  * scale) / 2;
      this._panY = (vh - this._height * scale) / 2;
      this._applyTransform();
    }

    _applyTransform() {
      const t = `translate(${this._panX}px, ${this._panY}px) scale(${this._zoom})`;
      this._canvas.style.transform        = t;
      this._canvas.style.transformOrigin  = '0 0';
      this._overlay.style.transform       = t;
      this._overlay.style.transformOrigin = '0 0';
    }

    /** Convert viewport pixel → image pixel coords (may be fractional) */
    _viewToImage(vx, vy) {
      return {
        ix: (vx - this._panX) / this._zoom,
        iy: (vy - this._panY) / this._zoom,
      };
    }

    /** Convert image pixel → viewport pixel (object with vx, vy) */
    _imageToView(ix, iy) {
      return {
        vx: ix * this._zoom + this._panX,
        vy: iy * this._zoom + this._panY,
      };
    }

    // ── Render ────────────────────────────────────────────────────────────────

    _render() {
      if (!this._imgCanvas) return;

      const w = this._width, h = this._height;
      this._canvas.width  = w;
      this._canvas.height = h;

      const ctx = this._canvas.getContext('2d');

      // Checkerboard transparency background
      const pattern = ctx.createPattern(this._checker, 'repeat');
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w, h);

      // Image
      ctx.drawImage(this._imgCanvas, 0, 0);

      // Overlay
      this._renderOverlay();
    }

    _renderOverlay(brushVx, brushVy) {
      const w = this._width, h = this._height;
      this._overlay.width  = w;
      this._overlay.height = h;

      const ctx = this._overlay.getContext('2d');
      ctx.clearRect(0, 0, w, h);

      if (!this._imgCanvas) return;

      // ── Hitbox ─────────────────────────────────────────────────────────────
      if (this._tool === TOOLS.HITBOX || true) { // always show hitbox subtly
        const hb = this._hitbox;
        ctx.save();
        ctx.strokeStyle = 'rgba(0,160,255,0.85)';
        ctx.lineWidth   = 1 / this._zoom;  // keep 1px screen-space
        ctx.setLineDash([4 / this._zoom, 3 / this._zoom]);
        ctx.strokeRect(hb.x + 0.5, hb.y + 0.5, hb.w - 1, hb.h - 1);
        ctx.restore();

        if (this._tool === TOOLS.HITBOX) {
          this._drawHitboxHandles(ctx);
        }
      }

      // ── Anchor crosshair ───────────────────────────────────────────────────
      const ax = this._anchorX, ay = this._anchorY;
      const ARM = 10 / this._zoom;
      const LW  = 1.5 / this._zoom;
      ctx.save();
      // Glow
      ctx.shadowColor  = 'rgba(255,220,0,0.9)';
      ctx.shadowBlur   = 6 / this._zoom;
      ctx.strokeStyle  = '#ffe040';
      ctx.lineWidth    = LW;
      ctx.beginPath();
      ctx.moveTo(ax - ARM, ay); ctx.lineTo(ax + ARM, ay);
      ctx.moveTo(ax, ay - ARM); ctx.lineTo(ax, ay + ARM);
      ctx.stroke();
      // Centre dot
      ctx.fillStyle = '#ffe040';
      ctx.beginPath();
      ctx.arc(ax, ay, 2 / this._zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ── Crop marquee ───────────────────────────────────────────────────────
      if (this._cropRect) {
        const r = this._cropRect;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth   = 1 / this._zoom;
        ctx.setLineDash([5 / this._zoom, 3 / this._zoom]);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.restore();
      }

      // ── Brush circle cursor ────────────────────────────────────────────────
      if ((this._tool === TOOLS.ERASER || this._tool === TOOLS.RESTORE) &&
          brushVx !== undefined && brushVy !== undefined) {
        const { ix, iy } = this._viewToImage(brushVx, brushVy);
        const r = this._brushRadius;
        ctx.save();
        ctx.strokeStyle = this._tool === TOOLS.ERASER
          ? 'rgba(255,80,80,0.85)'
          : 'rgba(80,200,120,0.85)';
        ctx.lineWidth   = 1 / this._zoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(ix, iy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    _drawHitboxHandles(ctx) {
      const hb   = this._hitbox;
      const SIZE = 6 / this._zoom;
      const handles = [
        [hb.x,            hb.y           ],
        [hb.x + hb.w / 2, hb.y           ],
        [hb.x + hb.w,     hb.y           ],
        [hb.x + hb.w,     hb.y + hb.h / 2],
        [hb.x + hb.w,     hb.y + hb.h   ],
        [hb.x + hb.w / 2, hb.y + hb.h   ],
        [hb.x,            hb.y + hb.h   ],
        [hb.x,            hb.y + hb.h / 2],
      ];
      ctx.save();
      ctx.fillStyle   = '#fff';
      ctx.strokeStyle = 'rgba(0,120,220,1)';
      ctx.lineWidth   = 1 / this._zoom;
      for (const [hx, hy] of handles) {
        ctx.fillRect(hx - SIZE / 2, hy - SIZE / 2, SIZE, SIZE);
        ctx.strokeRect(hx - SIZE / 2, hy - SIZE / 2, SIZE, SIZE);
      }
      ctx.restore();
    }

    // ── Brush application ─────────────────────────────────────────────────────

    _applyBrush(ix, iy, toolName) {
      const ctx  = this._imgCanvas.getContext('2d');
      const r    = this._brushRadius;
      const x0   = px(ix), y0 = px(iy);
      const left = Math.max(0, x0 - r), top  = Math.max(0, y0 - r);
      const right = Math.min(this._width  - 1, x0 + r);
      const bot   = Math.min(this._height - 1, y0 + r);
      const bw = right - left + 1, bh = bot - top + 1;
      if (bw <= 0 || bh <= 0) return;

      const data = ctx.getImageData(left, top, bw, bh);
      const pix  = data.data;

      let origData = null;
      if (toolName === TOOLS.RESTORE) {
        const oc = this._origCanvas.getContext('2d');
        origData = oc.getImageData(left, top, bw, bh).data;
      }

      const r2 = r * r;
      for (let dy = 0; dy < bh; dy++) {
        for (let dx = 0; dx < bw; dx++) {
          const ddx = (left + dx) - x0, ddy = (top + dy) - y0;
          if (ddx * ddx + ddy * ddy > r2) continue;
          const i = (dy * bw + dx) * 4;
          if (toolName === TOOLS.ERASER) {
            pix[i]     = 0;
            pix[i + 1] = 0;
            pix[i + 2] = 0;
            pix[i + 3] = 0;
          } else {
            pix[i]     = origData[i];
            pix[i + 1] = origData[i + 1];
            pix[i + 2] = origData[i + 2];
            pix[i + 3] = origData[i + 3];
          }
        }
      }
      ctx.putImageData(data, left, top);
    }

    // ── Magic Wand ────────────────────────────────────────────────────────────

    _applyMagicWand(seedX, seedY) {
      if (seedX < 0 || seedY < 0 || seedX >= this._width || seedY >= this._height) return;

      const ctx     = this._imgCanvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, this._width, this._height);
      const pix     = imgData.data;
      const W       = this._width, H = this._height;
      const tol     = this._tolerance;

      const idx = (x, y) => (y * W + x) * 4;
      const si  = idx(seedX, seedY);
      const sr  = pix[si], sg = pix[si+1], sb = pix[si+2], sa = pix[si+3];

      const matches = (x, y) => {
        const i = idx(x, y);
        return colorDist(pix[i], pix[i+1], pix[i+2], pix[i+3], sr, sg, sb, sa) <= tol;
      };

      if (this._contiguous) {
        // BFS flood fill
        const visited = new Uint8Array(W * H);
        const queue   = [[seedX, seedY]];
        visited[seedY * W + seedX] = 1;

        while (queue.length) {
          const [cx, cy] = queue.pop();
          const ci = idx(cx, cy);
          pix[ci] = pix[ci+1] = pix[ci+2] = pix[ci+3] = 0;

          const neighbors = [[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]];
          for (const [nx, ny] of neighbors) {
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            if (visited[ny * W + nx]) continue;
            visited[ny * W + nx] = 1;
            if (matches(nx, ny)) queue.push([nx, ny]);
          }
        }
      } else {
        // Global: scan all pixels
        const total = W * H * 4;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            if (matches(x, y)) {
              const i = idx(x, y);
              pix[i] = pix[i+1] = pix[i+2] = pix[i+3] = 0;
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
    }

    // ── Eyedropper (1-tap color key) ──────────────────────────────────────────

    _applyEyedropper(x, y) {
      if (x < 0 || y < 0 || x >= this._width || y >= this._height) return;

      const ctx     = this._imgCanvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, this._width, this._height);
      const pix     = imgData.data;
      const W = this._width, H = this._height;
      const tol = this._tolerance;

      const si = (y * W + x) * 4;
      const kr = pix[si], kg = pix[si+1], kb = pix[si+2], ka = pix[si+3];

      for (let i = 0; i < W * H * 4; i += 4) {
        if (colorDist(pix[i], pix[i+1], pix[i+2], pix[i+3], kr, kg, kb, ka) <= tol) {
          pix[i] = pix[i+1] = pix[i+2] = pix[i+3] = 0;
        }
      }

      ctx.putImageData(imgData, 0, 0);
    }

    // ── Auto-trim ─────────────────────────────────────────────────────────────

    autoTrim() {
      if (!this._imgCanvas) return;
      const ctx     = this._imgCanvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, this._width, this._height);
      const pix     = imgData.data;
      const W = this._width, H = this._height;

      let minX = W, minY = H, maxX = 0, maxY = 0;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const a = pix[(y * W + x) * 4 + 3];
          if (a > 0) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (minX > maxX || minY > maxY) return; // fully transparent

      this._pushUndo();
      this._applyCrop(minX, minY, maxX - minX + 1, maxY - minY + 1);
      this._render();
    }

    _applyCrop(x, y, w, h) {
      x = clamp(Math.round(x), 0, this._width  - 1);
      y = clamp(Math.round(y), 0, this._height - 1);
      w = clamp(Math.round(w), 1, this._width  - x);
      h = clamp(Math.round(h), 1, this._height - y);

      // Crop working canvas
      const newImg = makeCanvas(w, h);
      newImg.getContext('2d').drawImage(this._imgCanvas, -x, -y);
      this._imgCanvas = newImg;

      // Also keep original cropped the same way (for restore brush correctness)
      const newOrig = makeCanvas(w, h);
      newOrig.getContext('2d').drawImage(this._origCanvas, -x, -y);
      this._origCanvas = newOrig;

      // Adjust anchor & hitbox
      this._anchorX = clamp(this._anchorX - x, 0, w);
      this._anchorY = clamp(this._anchorY - y, 0, h);
      this._hitbox  = {
        x: clamp(this._hitbox.x - x, 0, w - 1),
        y: clamp(this._hitbox.y - y, 0, h - 1),
        w: Math.min(this._hitbox.w, w),
        h: Math.min(this._hitbox.h, h),
      };

      this._width  = w;
      this._height = h;

      this._emit('sizeChanged', { width: w, height: h });
    }

    // ── Undo / Redo ───────────────────────────────────────────────────────────

    _captureState() {
      const snap = makeCanvas(this._width, this._height);
      copyCanvas(this._imgCanvas, snap);
      return {
        canvas:  snap,
        anchorX: this._anchorX,
        anchorY: this._anchorY,
        hitbox:  { ...this._hitbox },
        width:   this._width,
        height:  this._height,
      };
    }

    _restoreState(state) {
      this._imgCanvas = makeCanvas(state.width, state.height);
      copyCanvas(state.canvas, this._imgCanvas);
      this._anchorX = state.anchorX;
      this._anchorY = state.anchorY;
      this._hitbox  = { ...state.hitbox };
      this._width   = state.width;
      this._height  = state.height;
    }

    _pushUndo() {
      this._redoStack = [];
      this._undoStack.push(this._captureState());
      if (this._undoStack.length > HISTORY_MAX) {
        this._undoStack.shift();
      }
    }

    undo() {
      if (!this._undoStack.length) return;
      this._redoStack.push(this._captureState());
      this._restoreState(this._undoStack.pop());
      this._render();
      this._emit('historyChanged', { canUndo: this.canUndo(), canRedo: this.canRedo() });
    }

    redo() {
      if (!this._redoStack.length) return;
      this._undoStack.push(this._captureState());
      this._restoreState(this._redoStack.pop());
      this._render();
      this._emit('historyChanged', { canUndo: this.canUndo(), canRedo: this.canRedo() });
    }

    canUndo() { return this._undoStack.length > 0; }
    canRedo() { return this._redoStack.length > 0; }

    // ── Tool / Property setters ───────────────────────────────────────────────

    setTool(tool) {
      if (!Object.values(TOOLS).includes(tool)) throw new Error(`Unknown tool: ${tool}`);
      this._tool = tool;
      this._updateCursor();
    }

    getTool() { return this._tool; }

    setBrushRadius(r) { this._brushRadius = clamp(r, 1, 64); }
    getBrushRadius()  { return this._brushRadius; }

    setTolerance(t) { this._tolerance = clamp(t, 0, 100); }
    getTolerance()  { return this._tolerance; }

    setContiguous(v) { this._contiguous = !!v; }
    getContiguous()  { return this._contiguous; }

    setZoom(z) {
      this._zoom = clamp(z, 0.05, 32);
      this._applyTransform();
    }
    getZoom() { return this._zoom; }

    setAnchor(x, y) {
      if (typeof x === 'object' && x !== null) {
        y = x.y !== undefined ? x.y : x.anchorY;
        x = x.x !== undefined ? x.x : x.anchorX;
      }
      this._anchorX = clamp(x, 0, this._width);
      this._anchorY = clamp(y, 0, this._height);
      this._renderOverlay();
    }
    getAnchor() { return { anchorX: this._anchorX, anchorY: this._anchorY }; }

    setHitbox(x, y, w, h) {
      if (typeof x === 'object' && x !== null) {
        y = x.y; w = x.w; h = x.h; x = x.x;
      }
      this._hitbox = {
        x: clamp(x, 0, this._width),
        y: clamp(y, 0, this._height),
        w: clamp(w, 1, this._width),
        h: clamp(h, 1, this._height),
      };
      this._renderOverlay();
    }
    getHitbox() { return { ...this._hitbox }; }

    // ── Cursor helper ─────────────────────────────────────────────────────────

    _getCursorForTool() {
      switch (this._tool) {
        case TOOLS.PAN:        return 'grab';
        case TOOLS.ERASER:     return 'crosshair';
        case TOOLS.RESTORE:    return 'crosshair';
        case TOOLS.MAGIC_WAND: return 'cell';
        case TOOLS.EYEDROPPER: return 'copy';
        case TOOLS.CROP:       return 'se-resize';
        case TOOLS.ANCHOR:     return 'pointer';
        case TOOLS.HITBOX:     return 'move';
        default:               return 'default';
      }
    }

    _updateCursor() {
      this._viewport.style.cursor = this._getCursorForTool();
    }

    // ── Event emitter (simple) ────────────────────────────────────────────────

    _listeners = {};

    on(event, fn) {
      (this._listeners[event] = this._listeners[event] || []).push(fn);
      return this;
    }

    off(event, fn) {
      if (this._listeners[event]) {
        this._listeners[event] = this._listeners[event].filter(f => f !== fn);
      }
      return this;
    }

    _emit(event, detail) {
      (this._listeners[event] || []).forEach(fn => fn(detail));
    }

    // ── Export API ────────────────────────────────────────────────────────────

    /**
     * Returns a new canvas with only the image content (no overlays).
     * @returns {HTMLCanvasElement}
     */
    getCleanCanvas() {
      if (!this._imgCanvas) return null;
      const out = makeCanvas(this._width, this._height);
      out.getContext('2d').drawImage(this._imgCanvas, 0, 0);
      return out;
    }

    /**
     * Returns the image as a PNG data URL.
     * @param {number} [quality=1] – for WebP/JPEG only
     * @returns {string}
     */
    exportPNGDataUrl(quality = 1) {
      const c = this.getCleanCanvas();
      if (!c) return null;
      return c.toDataURL('image/png', quality);
    }

    /**
     * Returns all the data needed to instantiate a live pet.
     * @returns {{ dataUrl: string, width: number, height: number, anchorX: number, anchorY: number, hitbox: {x,y,w,h} }}
     */
    getPetData() {
      return {
        dataUrl: this.exportPNGDataUrl(),
        width:   this._width,
        height:  this._height,
        anchorX: this._anchorX,
        anchorY: this._anchorY,
        hitbox: {
          x: this._hitbox.x,
          y: this._hitbox.y,
          w: this._hitbox.w,
          h: this._hitbox.h,
        },
      };
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /** Destroy the studio, clean up all event listeners and DOM nodes */
    destroy() {
      window.removeEventListener('keydown', this._onKeyDown);
      window.removeEventListener('keyup',   this._onKeyUp);
      this._container.innerHTML = '';
      this._listeners = {};
    }
  }

  return PetCanvasStudio;
});
