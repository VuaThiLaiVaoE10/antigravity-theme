/**
 * PetOverlay - Independent Fixed Overlay Layer for the AG Pet Entity
 * Part C of Giai Đoạn 1: Overlay, Drag & Drop, Click Interaction, Sprite Rendering
 *
 * Attaches to window.PetOverlay (browser/renderer context).
 * Node.js: exported as module.exports for patcher/liveSync injection.
 */
(function (root, factory) {
  const mod = factory();
  if (typeof root !== 'undefined') root.PetOverlay = mod;
  if (typeof window !== 'undefined') window.PetOverlay = mod;
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ─────────────────────────── Constants ─────────────────────────── */
  const OVERLAY_ID       = 'ag-pet-overlay-container';
  const PET_ENTITY_ID    = 'ag-pet-entity';
  const HITBOX_CLS       = 'ag-pet-hitbox';
  const SPRITE_CLS       = 'ag-pet-sprite-canvas';
  const PEDESTAL_CLS     = 'ag-pet-pedestal-holo';
  const BUBBLE_CLS       = 'ag-pet-speech-bubble';
  const FILTER_SCOPE_ID  = 'ag-pet-filter-scope';
  const STYLE_ID         = 'ag-pet-overlay-style';

  /* Speech messages cycled on click */
  const SPEECH_LINES = [
    'Chủ nhân cố lên nhé! ✨',
    'Code đẹp lắm hôm nay! 🌸',
    'Nghỉ giải lao chút đi nào~ ☕',
    'Tôi luôn ở đây bên bạn! 🐾',
    'Hôm nay build có pass không? 🤞',
  ];

  /* ─────────────────────────── Inject Global CSS ───────────────────── */
  function injectStyle(doc) {
    if (doc.getElementById(STYLE_ID)) return;
    const st = doc.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
/* ── AG Pet Overlay ── */
#${OVERLAY_ID} {
  position: absolute !important;
  inset: 0 !important;
  z-index: 5 !important;
  pointer-events: none !important;
  /* Explicitly NO backdrop-filter / filter / background so it is completely
     independent from the wallpaper/glass/blur pipeline. */
  background: transparent !important;
  filter: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  isolation: isolate !important;
  overflow: hidden !important;
}

/* Pet entity wrapper – positioned via JS (foot-anchor) */
#${PET_ENTITY_ID} {
  position: absolute;
  pointer-events: none;
  user-select: none;
  transform-origin: bottom center;
  /* sub-pixel rendering hint */
  will-change: transform, left, top;
}

/* Hitbox – the only pointer-events: auto region */
.${HITBOX_CLS} {
  position: absolute;
  pointer-events: auto !important;
  cursor: grab;
  /* invisible – interaction area only */
  background: transparent;
  border: none;
  outline: none;
  /* debug: uncomment to visualise hitbox */
  /* border: 1px dashed rgba(0,255,255,0.4); */
}
.${HITBOX_CLS}:active { cursor: grabbing; }

/* Sprite canvas – transparent background, contour drop-shadow */
.${SPRITE_CLS} {
  position: absolute;
  pointer-events: none;
  /* contour drop-shadow rendered in drawSprite(); CSS layer for extra pop */
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.55));
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

/* Holographic pedestal disc */
.${PEDESTAL_CLS} {
  position: absolute;
  pointer-events: none;
  border-radius: 50%;
  animation: agPedestalPulse 2.8s ease-in-out infinite alternate;
}
@keyframes agPedestalPulse {
  0%   { transform: translateX(-50%) scaleX(0.88); opacity: 0.55; }
  100% { transform: translateX(-50%) scaleX(1.12); opacity: 0.95; }
}

/* Speech bubble */
.${BUBBLE_CLS} {
  position: absolute;
  pointer-events: none;
  background: rgba(10, 20, 36, 0.95);
  border: 1px solid rgba(125, 207, 255, 0.7);
  color: #e8f4ff;
  border-radius: 10px;
  padding: 6px 12px;
  font-size: 11px;
  font-family: system-ui, sans-serif;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(0,0,0,0.5);
  animation: agBubblePop 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
  transform-origin: bottom right;
  z-index: 1000000;
  bottom: calc(100% + 10px);
  right: 0;
}
.${BUBBLE_CLS}::after {
  content: '';
  position: absolute;
  top: 100%;
  right: 14px;
  border: 5px solid transparent;
  border-top-color: rgba(125, 207, 255, 0.7);
}
@keyframes agBubblePop {
  0%   { opacity: 0; transform: scale(0.55); }
  100% { opacity: 1; transform: scale(1); }
}

/* Filter scope toggle – rendered by the studio UI, not the overlay itself */
#${FILTER_SCOPE_ID} {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-family: system-ui, sans-serif;
  color: rgba(255,255,255,0.75);
  user-select: none;
}
#${FILTER_SCOPE_ID} label { cursor: pointer; }
#${FILTER_SCOPE_ID} input[type=checkbox] { accent-color: #7DCFFF; cursor: pointer; }
    `;
    (doc.head || doc.documentElement).appendChild(st);
  }

  /* ───────────────────────── PetOverlay Class ──────────────────────── */
  class PetOverlay {
    /**
     * @param {object} opts
     * @param {Document}  [opts.doc]           – target document (default: window.document)
     * @param {object}    [opts.animEngine]     – PetAnimationEngine instance (optional)
     * @param {object}    [opts.appState]       – shared state store for position persistence
     * @param {number}    [opts.posX]           – initial horizontal offset (px, default 0)
     * @param {number}    [opts.posY]           – initial vertical offset (px, default 0)
     * @param {number}    [opts.anchorX]        – foot anchor X on sprite sheet (px)
     * @param {number}    [opts.anchorY]        – foot anchor Y on sprite sheet (px)
     * @param {number}    [opts.hitboxW]        – hitbox width (px, default 80)
     * @param {number}    [opts.hitboxH]        – hitbox height (px, default 80)
     * @param {boolean}   [opts.showPedestal]   – holographic disc (default false)
     * @param {string}    [opts.pedestalColor]  – pedestal accent hex (default '#7DCFFF')
     * @param {boolean}   [opts.filterOnPet]    – apply filter to overlay (default false)
     * @param {string}    [opts.petDataUrl]     – fallback static image dataURL
     * @param {string[]}  [opts.speechLines]    – custom speech lines
     */
    constructor(opts = {}) {
      this._doc          = opts.doc || (typeof document !== 'undefined' ? document : null);
      this._container    = opts.container    || null;
      this._animEngine   = opts.animEngine   || null;
      this._appState     = opts.appState     || null;
      this.posX          = opts.posX         ?? 100;
      this.posY          = opts.posY         ?? 100;
      this.anchorX       = opts.anchorX      ?? 0;
      this.anchorY       = opts.anchorY      ?? 0;
      this.hitboxW       = opts.hitboxW      ?? 80;
      this.hitboxH       = opts.hitboxH      ?? 80;
      this.showPedestal  = opts.showPedestal ?? false;
      this.pedestalColor = opts.pedestalColor || '#7DCFFF';
      this.filterOnPet   = opts.filterOnPet  ?? false;
      this.petDataUrl    = opts.petDataUrl   || '';
      this.speechLines   = opts.speechLines  || SPEECH_LINES;

      /* Internal state */
      this._state        = 'idle';  // 'idle' | 'walk' | 'sleep' | 'click' | 'drag'
      this._faceDir      = 1;       // 1 = right, -1 = left
      this._dragging     = false;
      this._dragStartX   = null;
      this._dragStartY   = null;
      this._dragOriginX  = 0;
      this._dragOriginY  = 0;
      this._lastDragX    = 0;
      this._dragVelX     = 0;
      this._animRafId    = null;
      this._bubbleTimer  = null;
      this._speechIdx    = 0;

      /* DOM refs */
      this._overlay      = null;
      this._entity       = null;
      this._hitbox       = null;
      this._spriteCanvas = null;
      this._pedestal     = null;
      this._bubble       = null;

      /* Sprite canvas 2D context */
      this._spriteCtx    = null;
    }

    /* ─────────────── Mount / unmount ─────────────── */
    mount(container) {
      const doc = this._doc;
      if (!doc) return this;

      injectStyle(doc);

      const mountMount = (typeof doc.getElementById === 'function' && (doc.getElementById('previewPetOverlayMount') || doc.getElementById('previewWindow'))) || null;
      const targetParent = container || this._container || mountMount || (doc.body || doc.documentElement);

      /* Overlay container */
      let overlay = doc.getElementById(OVERLAY_ID);
      if (!overlay) {
        overlay = doc.createElement('div');
        overlay.id = OVERLAY_ID;
        if (targetParent && typeof targetParent.appendChild === 'function') {
          targetParent.appendChild(overlay);
        }
      } else if (targetParent && overlay.parentNode !== targetParent && typeof targetParent.appendChild === 'function') {
        targetParent.appendChild(overlay);
      }
      this._overlay = overlay;
      this._applyFilterScope();

      if (targetParent !== doc.body) {
        if (overlay.style && typeof overlay.style.setProperty === 'function') {
          overlay.style.setProperty('position', 'absolute', 'important');
          overlay.style.setProperty('inset', '0', 'important');
          overlay.style.setProperty('z-index', '5', 'important');
          overlay.style.setProperty('pointer-events', 'none', 'important');
          overlay.style.setProperty('overflow', 'hidden', 'important');
        } else if (overlay.style) {
          overlay.style.position = 'absolute';
          overlay.style.inset = '0';
          overlay.style.zIndex = '5';
          overlay.style.pointerEvents = 'none';
          overlay.style.overflow = 'hidden';
        }
      }

      /* Pet entity */
      let entity = doc.getElementById(PET_ENTITY_ID);
      if (!entity) {
        entity = doc.createElement('div');
        entity.id = PET_ENTITY_ID;
        overlay.appendChild(entity);
      }
      if (typeof entity.setAttribute === 'function') {
        entity.setAttribute('data-ui', 'pet');
      }
      this._entity = entity;

      /* Pedestal */
      let ped = entity.querySelector('.' + PEDESTAL_CLS);
      if (!ped) {
        ped = doc.createElement('div');
        ped.className = PEDESTAL_CLS;
        entity.appendChild(ped);
      }
      this._pedestal = ped;
      this._updatePedestal();

      /* Sprite canvas */
      let canvas = entity.querySelector('.' + SPRITE_CLS);
      if (!canvas) {
        canvas = doc.createElement('canvas');
        canvas.className = SPRITE_CLS;
        entity.appendChild(canvas);
      }
      this._spriteCanvas = canvas;
      this._spriteCtx    = canvas.getContext('2d');

      /* Hitbox – must come after sprite so it's on top in stacking order */
      let hitbox = entity.querySelector('.' + HITBOX_CLS);
      if (!hitbox) {
        hitbox = doc.createElement('div');
        hitbox.className = HITBOX_CLS;
        entity.appendChild(hitbox);
      }
      this._hitbox = hitbox;
      this._updateHitboxSize();
      this._bindEvents();

      /* Start render loop */
      this._startRenderLoop();
      this._updateEntityPosition();

      return this;
    }

    unmount() {
      this._stopRenderLoop();
      this._unbindEvents();
      if (this._overlay && this._overlay.parentNode) {
        this._overlay.parentNode.removeChild(this._overlay);
      }
      this._overlay = this._entity = this._hitbox = this._spriteCanvas = null;
      return this;
    }

    /* ────────────────── Public API ────────────────── */

    /** Attach a PetAnimationEngine. Can be called after mount(). */
    setAnimEngine(engine) {
      this._animEngine = engine;
      return this;
    }

    /** Update foot-anchor and hitbox from PetCanvasStudio export. */
    setPetData(data) {
      // data = { dataUrl, width, height, anchorX, anchorY, hitbox: {x,y,w,h} }
      if (data.anchorX !== undefined) this.anchorX = data.anchorX;
      if (data.anchorY !== undefined) this.anchorY = data.anchorY;
      if (data.hitbox) {
        this.hitboxW = data.hitbox.w || this.hitboxW;
        this.hitboxH = data.hitbox.h || this.hitboxH;
      }
      if (data.dataUrl) this.petDataUrl = data.dataUrl;
      if (this._hitbox) this._updateHitboxSize();
      return this;
    }

    /** Programmatically switch animation state. */
    setState(state) {
      const valid = ['idle', 'walk', 'sleep', 'click', 'drag'];
      if (!valid.includes(state)) return this;
      this._state = state;
      if (this._animEngine) this._animEngine.setState(state);
      return this;
    }

    /** Enable / disable filter scope on the overlay. */
    setFilterOnPet(enabled) {
      this.filterOnPet = Boolean(enabled);
      this._applyFilterScope();
      return this;
    }

    /** Update position (posX, posY) and persist. */
    setPosition(x, y) {
      this.posX = x;
      this.posY = y;
      this._updateEntityPosition();
      this._persistPosition();
      return this;
    }

    /** Update pedestal visibility and color. */
    setPedestal(show, color) {
      this.showPedestal  = Boolean(show);
      if (color) this.pedestalColor = color;
      this._updatePedestal();
      return this;
    }

    /* ─────────────── Filter Scope ─────────────── */
    _applyFilterScope() {
      if (!this._overlay) return;
      if (this.filterOnPet) {
        // Allow user-configured filter (set externally)
        this._overlay.style.removeProperty('filter');
        this._overlay.style.removeProperty('backdrop-filter');
        this._overlay.style.removeProperty('-webkit-backdrop-filter');
      } else {
        // Default: pet is EXCLUDED from filter pipeline
        this._overlay.style.filter         = 'none';
        this._overlay.style.backdropFilter = 'none';
        this._overlay.style.webkitBackdropFilter = 'none';
      }
    }

    /* ─────────────── Layout helpers ─────────────── */
    _updateEntityPosition() {
      if (!this._entity) return;
      // Position entity so that (anchorX, anchorY) of sprite maps to (posX, posY) on screen
      const left = this.posX - this.anchorX;
      const top  = this.posY - this.anchorY;
      this._entity.style.left = left + 'px';
      this._entity.style.top  = top  + 'px';
    }

    _updateHitboxSize() {
      if (!this._hitbox) return;
      this._hitbox.style.width  = this.hitboxW + 'px';
      this._hitbox.style.height = this.hitboxH + 'px';
      // Center hitbox on anchor within entity space
      const anchorOffX = this.anchorX - this.hitboxW / 2;
      const anchorOffY = this.anchorY - this.hitboxH;
      this._hitbox.style.left = anchorOffX + 'px';
      this._hitbox.style.top  = anchorOffY + 'px';
    }

    _updatePedestal() {
      if (!this._pedestal) return;
      const c = this.pedestalColor || '#7DCFFF';
      if (this.showPedestal) {
        const w = Math.max(this.hitboxW * 0.9, 40);
        const h = 14;
        this._pedestal.style.display = 'block';
        this._pedestal.style.position = 'absolute';
        this._pedestal.style.width = w + 'px';
        this._pedestal.style.height = h + 'px';
        this._pedestal.style.left = this.anchorX + 'px';
        this._pedestal.style.top = (this.anchorY - h / 2) + 'px';
        this._pedestal.style.transform = 'translateX(-50%)';
        this._pedestal.style.background = `radial-gradient(ellipse at center, ${c} 0%, ${_toRgba(c, 0.4)} 50%, transparent 78%)`;
        this._pedestal.style.boxShadow = `0 0 10px ${_toRgba(c, 0.45)}`;
        this._pedestal.style.animation = 'agPedestalPulse 2.8s ease-in-out infinite alternate';
        this._pedestal.style.pointerEvents = 'none';
        this._pedestal.style.zIndex = '0';
      } else {
        this._pedestal.style.display = 'none';
      }
    }

    /* ─────────────── Render Loop ─────────────── */
    _startRenderLoop() {
      this._stopRenderLoop();
      const tick = () => {
        this._drawSprite();
        this._animRafId = (typeof requestAnimationFrame !== 'undefined')
          ? requestAnimationFrame(tick)
          : null;
      };
      if (typeof requestAnimationFrame !== 'undefined') {
        this._animRafId = requestAnimationFrame(tick);
      }
    }

    _stopRenderLoop() {
      if (this._animRafId !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this._animRafId);
        this._animRafId = null;
      }
    }

    _drawSprite() {
      if (!this._spriteCanvas || !this._spriteCtx) return;

      let frame = null;

      /* Try to get current frame from animation engine */
      if (this._animEngine && typeof this._animEngine.getCurrentFrame === 'function') {
        frame = this._animEngine.getCurrentFrame();
      }

      /* Determine canvas size from frame or petDataUrl img cache */
      let srcWidth  = frame ? frame.width  : (this._cachedImg ? this._cachedImg.naturalWidth  : 80);
      let srcHeight = frame ? frame.height : (this._cachedImg ? this._cachedImg.naturalHeight : 80);

      /* Ensure canvas matches frame size */
      if (this._spriteCanvas.width !== srcWidth || this._spriteCanvas.height !== srcHeight) {
        this._spriteCanvas.width  = srcWidth;
        this._spriteCanvas.height = srcHeight;
        this._spriteCanvas.style.width  = srcWidth  + 'px';
        this._spriteCanvas.style.height = srcHeight + 'px';
        // Position sprite canvas so anchor point aligns with entity origin
        this._spriteCanvas.style.left = (this.anchorX - srcWidth  / 2) + 'px';
        this._spriteCanvas.style.top  = (this.anchorY - srcHeight)     + 'px';
      }

      const ctx = this._spriteCtx;
      ctx.clearRect(0, 0, srcWidth, srcHeight);

      /* Apply horizontal flip for drag direction */
      ctx.save();
      if (this._faceDir === -1) {
        ctx.translate(srcWidth, 0);
        ctx.scale(-1, 1);
      }

      if (frame) {
        /* frame is a canvas or ImageBitmap */
        ctx.drawImage(frame, 0, 0, srcWidth, srcHeight);
      } else if (this.petDataUrl) {
        /* Fallback: static image */
        this._ensureCachedImg(this.petDataUrl, () => {
          if (this._spriteCanvas && this._spriteCtx && this._cachedImg) {
            this._spriteCtx.save();
            if (this._faceDir === -1) {
              this._spriteCtx.translate(srcWidth, 0);
              this._spriteCtx.scale(-1, 1);
            }
            this._spriteCtx.drawImage(this._cachedImg, 0, 0, srcWidth, srcHeight);
            this._spriteCtx.restore();
          }
        });
      }

      ctx.restore();
    }

    _ensureCachedImg(src, cb) {
      if (this._cachedImg && this._cachedImg.src === src) {
        if (this._cachedImg.complete) cb();
        else this._cachedImg.onload = cb;
        return;
      }
      const img = (typeof Image !== 'undefined') ? new Image() : null;
      if (!img) return;
      img.onload = cb;
      img.src = src;
      this._cachedImg = img;
    }

    /* ─────────────── Event Binding ─────────────── */
    _bindEvents() {
      if (!this._hitbox) return;
      this._onMouseDown = this._handleMouseDown.bind(this);
      this._onMouseMove = this._handleMouseMove.bind(this);
      this._onMouseUp   = this._handleMouseUp.bind(this);
      this._onClick     = this._handleClick.bind(this);

      this._hitbox.addEventListener('mousedown', this._onMouseDown);
      this._hitbox.addEventListener('click',     this._onClick);
      if (this._entity) {
        this._entity.addEventListener('click', this._onClick);
      }
    }

    _unbindEvents() {
      if (this._hitbox) {
        this._hitbox.removeEventListener('mousedown', this._onMouseDown);
        this._hitbox.removeEventListener('click',     this._onClick);
      }
      if (this._entity) {
        this._entity.removeEventListener('click', this._onClick);
      }
      const doc = this._doc || (typeof document !== 'undefined' ? document : null);
      if (doc) {
        doc.removeEventListener('mousemove', this._onMouseMove);
        doc.removeEventListener('mouseup',   this._onMouseUp);
      }
    }

    _handleMouseDown(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      this._dragging    = true;
      this._dragStartX  = e.clientX;
      this._dragStartY  = e.clientY;
      this._dragOriginX = this.posX;
      this._dragOriginY = this.posY;
      this._lastDragX   = e.clientX;
      this._dragVelX    = 0;

      this.setState('drag');
      if (this._hitbox) this._hitbox.style.cursor = 'grabbing';

      const doc = this._doc || document;
      doc.addEventListener('mousemove', this._onMouseMove);
      doc.addEventListener('mouseup',   this._onMouseUp);
    }

    _handleMouseMove(e) {
      if (!this._dragging) return;

      const dx = e.clientX - this._dragStartX;
      const dy = e.clientY - this._dragStartY;

      /* Velocity for auto-flip */
      this._dragVelX = e.clientX - this._lastDragX;
      this._lastDragX = e.clientX;

      if (Math.abs(this._dragVelX) > 0.5) {
        this._faceDir = this._dragVelX > 0 ? 1 : -1;
      }

      this.posX = this._dragOriginX + dx;
      this.posY = this._dragOriginY + dy;
      this._updateEntityPosition();
    }

    _handleMouseUp(e) {
      if (!this._dragging) return;
      this._dragging = false;

      const doc = this._doc || document;
      doc.removeEventListener('mousemove', this._onMouseMove);
      doc.removeEventListener('mouseup',   this._onMouseUp);

      if (this._hitbox) this._hitbox.style.cursor = 'grab';

      this._persistPosition();
      this.setState('idle');

      // Clear drag start after click event has had a chance to evaluate
      setTimeout(() => {
        this._dragStartX = null;
        this._dragStartY = null;
      }, 60);
    }

    _handleClick(e) {
      /* Only cancel click if a drag occurred */
      if (this._dragStartX !== null && this._dragStartY !== null && e.clientX !== undefined) {
        const dx = e.clientX - this._dragStartX;
        const dy = e.clientY - this._dragStartY;
        if (Math.hypot(dx, dy) > 4) return;
      }

      if (e.stopPropagation) e.stopPropagation();
      this.setState('click');
      this._showSpeechBubble();

      /* Return to idle after click animation (3.5s) */
      clearTimeout(this._clickTimer);
      this._clickTimer = setTimeout(() => {
        this.setState('idle');
      }, 3500);
    }

    /* ─────────────── Speech Bubble ─────────────── */
    _showSpeechBubble() {
      if (!this._entity) return;
      this._removeBubble();

      const doc  = this._doc || document;
      const bub  = doc.createElement('div');
      bub.className = BUBBLE_CLS;
      if (typeof bub.setAttribute === 'function') {
        bub.setAttribute('data-ui', 'pet-bubble');
      }
      bub.textContent = this.speechLines[this._speechIdx % this.speechLines.length];
      this._speechIdx++;
      this._entity.appendChild(bub);
      this._bubble = bub;

      this._positionBubble(bub);

      clearTimeout(this._bubbleTimer);
      this._bubbleTimer = setTimeout(() => this._removeBubble(), 3000);
    }

    _positionBubble(bub) {
      if (!bub || !this._entity) return;
      const doc = this._doc || (typeof document !== 'undefined' ? document : null);
      if (!doc) return;

      const preview = (typeof doc.querySelector === 'function' && doc.querySelector('[data-ui="preview"]')) ||
                      (typeof doc.getElementById === 'function' && doc.getElementById('previewWindow')) ||
                      this._overlay;

      bub.style.position = 'absolute';
      bub.style.zIndex = '100';
      bub.style.whiteSpace = 'nowrap';
      bub.style.pointerEvents = 'none';

      if (preview && typeof preview.getBoundingClientRect === 'function' && typeof bub.getBoundingClientRect === 'function' && typeof this._entity.getBoundingClientRect === 'function') {
        const pRect = preview.getBoundingClientRect();
        const eRect = this._entity.getBoundingClientRect();
        const bRect = bub.getBoundingClientRect();

        const bW = bRect.width || 120;
        const bH = bRect.height || 32;

        // Prefer above pet
        let top = -bH - 8;
        // Flip below if not enough room above entity inside preview
        if (eRect.top - bH - 8 < pRect.top + 2) {
          top = eRect.height + 8;
        }

        // Center horizontally relative to entity
        let left = (eRect.width - bW) / 2;

        // Clamp horizontally relative to preview
        const globalLeft = eRect.left + left;
        if (globalLeft < pRect.left + 4) {
          left += (pRect.left + 4 - globalLeft);
        } else if (globalLeft + bW > pRect.right - 4) {
          left -= (globalLeft + bW - (pRect.right - 4));
        }

        // Clamp vertically relative to preview
        const globalTop = eRect.top + top;
        if (globalTop < pRect.top + 4) {
          top += (pRect.top + 4 - globalTop);
        } else if (globalTop + bH > pRect.bottom - 4) {
          top -= (globalTop + bH - (pRect.bottom - 4));
        }

        bub.style.left = Math.round(left) + 'px';
        bub.style.top = Math.round(top) + 'px';
        bub.style.bottom = 'auto';
        bub.style.right = 'auto';
      } else {
        bub.style.bottom = 'calc(100% + 8px)';
        bub.style.left = '50%';
        bub.style.transform = 'translateX(-50%)';
      }
    }

    _removeBubble() {
      if (this._bubble && this._bubble.parentNode) {
        this._bubble.parentNode.removeChild(this._bubble);
      }
      this._bubble = null;
    }

    /* ─────────────── Persistence ─────────────── */
    _persistPosition() {
      const data = { posX: this.posX, posY: this.posY };
      if (this._appState && typeof this._appState.set === 'function') {
        this._appState.set('petPosition', data);
      }
      /* Also attempt to persist via global appState if available */
      if (typeof globalThis !== 'undefined' && globalThis.appState) {
        try { globalThis.appState.petPosition = data; } catch {}
      }
    }

    /* ─────────────── Static helpers ─────────────── */
    /**
     * Build the client-side script string that injects the overlay into Antigravity.
     * Used by liveSync.js and patcher.js.
     */
    static buildInjectionScript(config) {
      config = config || {};
      const posX         = config.petPosX         ?? 200;
      const posY         = config.petPosY         ?? (typeof window !== 'undefined' ? window.innerHeight - 160 : 800);
      const anchorX      = config.petAnchorX      ?? 40;
      const anchorY      = config.petAnchorY      ?? 80;
      const hitboxW      = config.petHitboxW      ?? 80;
      const hitboxH      = config.petHitboxH      ?? 80;
      const showPed      = Boolean(config.petPedestal);
      const pedColor     = JSON.stringify(config.petPedestalColor || config.petGlowColor || '#7DCFFF');
      const filterOnPet  = Boolean(config.petFilterEnabled);
      const petDataUrl   = JSON.stringify(config.mascotUrl || config.petDataUrl || '');
      const speechLines  = JSON.stringify(config.petSpeechLines || []);

      /* Serialise the class + mount call as an inline IIFE that runs in the
         Antigravity renderer process. We paste a minimal runtime version rather
         than the full source (the full source is for the Theme Studio renderer). */
      return `
(function() {
  'use strict';
  var OVERLAY_ID      = '${OVERLAY_ID}';
  var PET_ENTITY_ID   = '${PET_ENTITY_ID}';
  var HITBOX_CLS      = '${HITBOX_CLS}';
  var SPRITE_CLS      = '${SPRITE_CLS}';
  var PEDESTAL_CLS    = '${PEDESTAL_CLS}';
  var BUBBLE_CLS      = '${BUBBLE_CLS}';
  var STYLE_ID        = '${STYLE_ID}';
  var SPEECH = ${JSON.stringify(SPEECH_LINES)};
  if (${speechLines}.length) SPEECH = ${speechLines};

  // ── Inject CSS ──
  if (!document.getElementById(STYLE_ID)) {
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = [
      '#' + OVERLAY_ID + '{position:fixed!important;inset:0!important;z-index:999999!important;pointer-events:none!important;background:transparent!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;isolation:isolate!important;overflow:visible!important;}',
      '#' + PET_ENTITY_ID + '{position:absolute;pointer-events:none;user-select:none;transform-origin:bottom center;will-change:transform,left,top;}',
      '.' + HITBOX_CLS + '{position:absolute;pointer-events:auto!important;cursor:grab;background:transparent;}',
      '.' + HITBOX_CLS + ':active{cursor:grabbing;}',
      '.' + SPRITE_CLS + '{position:absolute;pointer-events:none;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.55));image-rendering:pixelated;}',
      '.' + PEDESTAL_CLS + '{position:absolute;pointer-events:none;border-radius:50%;animation:agPedestalPulse 2.8s ease-in-out infinite alternate;}',
      '@keyframes agPedestalPulse{0%{transform:translateX(-50%) scaleX(0.88);opacity:0.55;}100%{transform:translateX(-50%) scaleX(1.12);opacity:0.95;}}',
      '.' + BUBBLE_CLS + '{position:absolute;pointer-events:none;background:rgba(10,20,36,0.95);border:1px solid rgba(125,207,255,0.7);color:#e8f4ff;border-radius:10px;padding:6px 12px;font-size:11px;font-family:system-ui,sans-serif;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,0.5);animation:agBubblePop 0.22s cubic-bezier(0.18,0.89,0.32,1.28) forwards;transform-origin:bottom right;z-index:1000000;bottom:calc(100% + 10px);right:0;}',
      '.' + BUBBLE_CLS + '::after{content:"";position:absolute;top:100%;right:14px;border:5px solid transparent;border-top-color:rgba(125,207,255,0.7);}',
      '@keyframes agBubblePop{0%{opacity:0;transform:scale(0.55);}100%{opacity:1;transform:scale(1);}}'
    ].join('\\n');
    (document.head || document.documentElement).appendChild(st);
  }

  // ── State ──
  var posX    = ${posX};
  var posY    = ${posY} || (window.innerHeight - 160);
  var anchorX = ${anchorX};
  var anchorY = ${anchorY};
  var hitboxW = ${hitboxW};
  var hitboxH = ${hitboxH};
  var faceDir  = 1;
  var state    = 'idle';
  var dragging = false;
  var dragStartX, dragStartY, dragOriginX, dragOriginY, lastDragX = 0, dragVelX = 0;
  var speechIdx = 0;
  var bubbleTimer, clickTimer, animRafId;
  var cachedImg = null;

  // ── Helpers ──
  function toRgba(hex, a) {
    if (!hex || typeof hex !== 'string') return 'rgba(125,207,255,' + a + ')';
    if (hex.startsWith('rgba')) return hex;
    if (hex.startsWith('rgb')) return hex.replace('rgb','rgba').replace(')',','+a+')');
    var c = hex.replace('#','');
    if (c.length === 3) { c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2]; }
    if (c.length >= 6) {
      var r=parseInt(c.substring(0,2),16),g=parseInt(c.substring(2,4),16),b=parseInt(c.substring(4,6),16);
      return 'rgba('+r+','+g+','+b+','+a+')';
    }
    return 'rgba(125,207,255,' + a + ')';
  }

  // ── Build DOM ──
  var overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    document.body.appendChild(overlay);
  }
  // Ensure filter isolation
  overlay.style.filter = ${filterOnPet} ? '' : 'none';
  overlay.style.backdropFilter = ${filterOnPet} ? '' : 'none';
  overlay.style.webkitBackdropFilter = ${filterOnPet} ? '' : 'none';

  var entity = document.getElementById(PET_ENTITY_ID);
  if (!entity) {
    entity = document.createElement('div');
    entity.id = PET_ENTITY_ID;
    overlay.appendChild(entity);
  }

  // Pedestal
  var ped = entity.querySelector('.' + PEDESTAL_CLS);
  if (!ped) {
    ped = document.createElement('div');
    ped.className = PEDESTAL_CLS;
    entity.appendChild(ped);
  }
  (function updatePed() {
    var pedColor = ${pedColor};
    if (${showPed}) {
      var w = Math.max(hitboxW * 0.9, 40), h = 14;
      ped.style.cssText = 'display:block;position:absolute;width:'+w+'px;height:'+h+'px;left:'+anchorX+'px;top:'+(anchorY-h/2)+'px;transform:translateX(-50%);background:radial-gradient(ellipse at center,'+pedColor+' 0%,'+toRgba(pedColor,0.4)+' 50%,transparent 78%);box-shadow:0 0 10px '+toRgba(pedColor,0.45)+';animation:agPedestalPulse 2.8s ease-in-out infinite alternate;pointer-events:none;z-index:0;';
    } else {
      ped.style.display = 'none';
    }
  })();

  // Sprite canvas
  var canvas = entity.querySelector('.' + SPRITE_CLS);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = SPRITE_CLS;
    entity.appendChild(canvas);
  }
  var ctx = canvas.getContext('2d');

  // Hitbox
  var hitbox = entity.querySelector('.' + HITBOX_CLS);
  if (!hitbox) {
    hitbox = document.createElement('div');
    hitbox.className = HITBOX_CLS;
    entity.appendChild(hitbox);
  }
  hitbox.style.width  = hitboxW + 'px';
  hitbox.style.height = hitboxH + 'px';
  hitbox.style.left   = (anchorX - hitboxW / 2) + 'px';
  hitbox.style.top    = (anchorY - hitboxH) + 'px';

  // ── Position ──
  function updatePos() {
    entity.style.left = (posX - anchorX) + 'px';
    entity.style.top  = (posY - anchorY) + 'px';
  }
  updatePos();

  // ── Sprite render ──
  var petDataUrl = ${petDataUrl};
  function loadImg(src, cb) {
    if (cachedImg && cachedImg.src === src) { if (cachedImg.complete) cb(cachedImg); else cachedImg.onload = function(){ cb(cachedImg); }; return; }
    var img = new Image();
    img.onload = function(){ cachedImg = img; cb(img); };
    img.src = src;
  }

  function drawSprite() {
    var animEngine = window.PetAnimationEngineInstance;
    var frame = (animEngine && typeof animEngine.getCurrentFrame === 'function') ? animEngine.getCurrentFrame() : null;
    var sw = frame ? frame.width  : (cachedImg ? cachedImg.naturalWidth  : hitboxW);
    var sh = frame ? frame.height : (cachedImg ? cachedImg.naturalHeight : hitboxH);
    if (!sw || !sh) { sw = hitboxW; sh = hitboxH; }

    if (canvas.width !== sw || canvas.height !== sh) {
      canvas.width = sw; canvas.height = sh;
      canvas.style.width  = sw + 'px';
      canvas.style.height = sh + 'px';
      canvas.style.left   = (anchorX - sw / 2) + 'px';
      canvas.style.top    = (anchorY - sh) + 'px';
    }

    ctx.clearRect(0, 0, sw, sh);
    ctx.save();
    if (faceDir === -1) { ctx.translate(sw, 0); ctx.scale(-1, 1); }

    if (frame) {
      ctx.drawImage(frame, 0, 0, sw, sh);
      ctx.restore();
    } else if (petDataUrl) {
      ctx.restore();
      loadImg(petDataUrl, function(img) {
        ctx.clearRect(0, 0, sw, sh);
        ctx.save();
        if (faceDir === -1) { ctx.translate(sw, 0); ctx.scale(-1, 1); }
        ctx.drawImage(img, 0, 0, sw, sh);
        ctx.restore();
      });
    } else {
      ctx.restore();
    }
  }

  function renderLoop() {
    drawSprite();
    animRafId = requestAnimationFrame(renderLoop);
  }
  if (animRafId) cancelAnimationFrame(animRafId);
  renderLoop();

  // ── Speech Bubble ──
  function showBubble() {
    var old = entity.querySelector('.' + BUBBLE_CLS);
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var bub = document.createElement('div');
    bub.className = BUBBLE_CLS;
    bub.textContent = SPEECH[speechIdx % SPEECH.length];
    speechIdx++;
    entity.appendChild(bub);
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function() { if (bub.parentNode) bub.parentNode.removeChild(bub); }, 3500);
  }

  // ── Drag & Drop ──
  function onMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    dragging    = true;
    dragStartX  = e.clientX; dragStartY  = e.clientY;
    dragOriginX = posX;      dragOriginY = posY;
    lastDragX   = e.clientX; dragVelX    = 0;
    state = 'drag';
    hitbox.style.cursor = 'grabbing';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
  }

  function onMouseMove(e) {
    if (!dragging) return;
    dragVelX = e.clientX - lastDragX;
    lastDragX = e.clientX;
    if (Math.abs(dragVelX) > 0.5) faceDir = dragVelX > 0 ? 1 : -1;
    posX = dragOriginX + (e.clientX - dragStartX);
    posY = dragOriginY + (e.clientY - dragStartY);
    updatePos();
  }

  function onMouseUp(e) {
    if (!dragging) return;
    dragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    hitbox.style.cursor = 'grab';
    state = 'idle';
    // Persist position to appState
    if (window._agAppState) {
      window._agAppState.petPosX = posX;
      window._agAppState.petPosY = posY;
    }
  }

  // ── Click ──
  function onClick(e) {
    var dx = e.clientX - (dragStartX || e.clientX);
    var dy = e.clientY - (dragStartY || e.clientY);
    if (Math.sqrt(dx*dx+dy*dy) > 4) return;
    e.stopPropagation();
    state = 'click';
    showBubble();
    clearTimeout(clickTimer);
    clickTimer = setTimeout(function() { state = 'idle'; }, 3500);
  }

  hitbox.addEventListener('mousedown', onMouseDown);
  hitbox.addEventListener('click',     onClick);

  // Expose instance for external control
  window._agPetOverlay = {
    setState: function(s) { state = s; },
    setPosition: function(x, y) { posX = x; posY = y; updatePos(); },
    getState: function() { return state; },
    getPosition: function() { return { x: posX, y: posY }; }
  };
})();
      `;
    }
  }

  /* ─────────────── Utility ─────────────── */
  function _toRgba(hex, a) {
    if (!hex || typeof hex !== 'string') return 'rgba(125,207,255,' + a + ')';
    if (hex.startsWith('rgba')) return hex;
    if (hex.startsWith('rgb')) return hex.replace('rgb', 'rgba').replace(')', ',' + a + ')');
    const c = hex.replace('#', '');
    const full = c.length === 3 ? c[0]+c[0]+c[1]+c[1]+c[2]+c[2] : c;
    if (full.length >= 6) {
      const r = parseInt(full.substring(0,2),16);
      const g = parseInt(full.substring(2,4),16);
      const b = parseInt(full.substring(4,6),16);
      return `rgba(${r},${g},${b},${a})`;
    }
    return `rgba(125,207,255,${a})`;
  }

  return PetOverlay;
}));
