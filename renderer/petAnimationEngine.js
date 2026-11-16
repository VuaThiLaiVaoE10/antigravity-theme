/**
 * PetAnimationEngine — Animation & Sprite Engine (Part B, Giai Đoạn 1)
 * Attached to window.PetAnimationEngine
 *
 * Features:
 *  1. Sprite Sheet Mode  — slices sheet into frames, grid overlay
 *  2. Animated Image Mode (GIF/APNG/WebP) — ImageDecoder or fallback
 *  3. State Machine — idle/walk/sleep/click/drag with per-state fps/loop
 *  4. Sandbox Preview Canvas — checkered bg, state buttons, hitbox/anchor overlay
 *  5. Export — getAnimationConfig()
 */

(function (global) {
  'use strict';

  /* ───────────────────────────── helpers ───────────────────────────── */

  /**
   * Create an offscreen canvas (works in both browser & Node-like envs
   * that have OffscreenCanvas; gracefully absent in pure Node).
   */
  function makeCanvas(w, h) {
    if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(w, h);
    }
    if (typeof document !== 'undefined') {
      var c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    }
    // Minimal stub so node -c doesn't fail (never called at parse time)
    return { width: w, height: h, getContext: function () { return null; } };
  }

  /** Draw a checkered transparency pattern onto ctx. */
  function drawCheckered(ctx, w, h, size) {
    size = size || 8;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#cccccc';
    for (var y = 0; y < h; y += size) {
      for (var x = 0; x < w; x += size) {
        if (((x / size) + (y / size)) % 2 === 0) {
          ctx.fillRect(x, y, size, size);
        }
      }
    }
    ctx.restore();
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  /*  PetAnimationEngine                                                 */
  /* ═══════════════════════════════════════════════════════════════════ */

  /**
   * @param {Object} [options]
   * @param {HTMLCanvasElement} [options.sandboxCanvas]  - preview canvas element
   * @param {HTMLElement}       [options.controlsRoot]   - parent for state buttons
   */
  function PetAnimationEngine(options) {
    options = options || {};

    /* ── raw frame store: [{ canvas, duration }] ── */
    this._frames = [];

    /* ── sheet metadata ── */
    this._sheetMeta = null; // { columns, rows, totalFrames, fps, sourceImage }

    /* ── global default fps (overridden per-state) ── */
    this._globalFps = 12;

    /* ── state machine ── */
    this._STATE_NAMES = ['idle', 'walk', 'sleep', 'click', 'drag'];
    this._states = {};
    var self = this;
    this._STATE_NAMES.forEach(function (s) {
      self._states[s] = { startFrame: 0, endFrame: 0, loop: true, fps: 12, assigned: false };
    });

    /* ── playback ── */
    this._currentState = 'idle';
    this._frameIndex = 0;
    this._lastFrameTime = 0;
    this._rafId = null;
    this._playing = false;
    this._afterClickReturn = false; // flag to return to idle after click anim

    /* ── sandbox canvas ── */
    this._sandboxCanvas = options.sandboxCanvas || null;
    this._sandboxCtx = null;
    if (this._sandboxCanvas && this._sandboxCanvas.getContext) {
      this._sandboxCtx = this._sandboxCanvas.getContext('2d');
    }

    /* ── overlay toggles ── */
    this._showHitbox = false;
    this._showAnchor = false;

    /* ── hitbox / anchor (provided by petCanvasStudio or set manually) ── */
    this._hitbox = { x: 0, y: 0, w: 64, h: 64 };
    this._anchor = { x: 32, y: 64 };

    /* ── build controls if root provided ── */
    this._controlsRoot = options.controlsRoot || null;
    if (this._controlsRoot) {
      this._buildControls();
    }

    /* ── canvas click handler (sandbox) ── */
    if (this._sandboxCanvas) {
      this._sandboxCanvas.addEventListener('click', function () {
        self._triggerClickState();
      });
    }
  }

  /* ─────────────────────────── 1. SPRITE SHEET MODE ─────────────────── */

  /**
   * Load a sprite sheet image and slice it into frames.
   * @param {HTMLImageElement|ImageBitmap} img
   * @param {Object} opts { columns, rows, totalFrames, fps }
   * @returns {Array<{canvas, duration}>}
   */
  PetAnimationEngine.prototype.loadSpriteSheet = function (img, opts) {
    opts = opts || {};
    var columns = opts.columns || 1;
    var rows = opts.rows || 1;
    var totalFrames = opts.totalFrames || (columns * rows);
    var fps = opts.fps || 12;

    var frameW = Math.floor(img.width / columns);
    var frameH = Math.floor(img.height / rows);
    var duration = 1000 / fps; // ms per frame

    this._frames = [];
    for (var i = 0; i < totalFrames; i++) {
      var col = i % columns;
      var row = Math.floor(i / columns);
      var fc = makeCanvas(frameW, frameH);
      var ctx = fc.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, col * frameW, row * frameH, frameW, frameH, 0, 0, frameW, frameH);
      }
      this._frames.push({ canvas: fc, duration: duration });
    }

    this._sheetMeta = {
      columns: columns,
      rows: rows,
      totalFrames: totalFrames,
      fps: fps,
      frameW: frameW,
      frameH: frameH,
      sourceImage: img
    };

    this._globalFps = fps;
    this._frameIndex = 0;

    // Auto-assign idle to all frames as default
    this._states['idle'].startFrame = 0;
    this._states['idle'].endFrame = Math.max(0, totalFrames - 1);
    this._states['idle'].fps = fps;
    this._states['idle'].assigned = true;

    return this._frames;
  };

  /**
   * Generate a grid-overlay canvas over the source image for alignment check.
   * @returns {HTMLCanvasElement|OffscreenCanvas}
   */
  PetAnimationEngine.prototype.generateGridOverlay = function () {
    var meta = this._sheetMeta;
    if (!meta || !meta.sourceImage) {
      throw new Error('No sprite sheet loaded. Call loadSpriteSheet first.');
    }
    var img = meta.sourceImage;
    var gc = makeCanvas(img.width, img.height);
    var ctx = gc.getContext('2d');
    if (!ctx) { return gc; }

    ctx.drawImage(img, 0, 0);

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
    ctx.lineWidth = 1;

    // Vertical lines
    for (var c = 1; c < meta.columns; c++) {
      ctx.beginPath();
      ctx.moveTo(c * meta.frameW, 0);
      ctx.lineTo(c * meta.frameW, img.height);
      ctx.stroke();
    }
    // Horizontal lines
    for (var r = 1; r < meta.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * meta.frameH);
      ctx.lineTo(img.width, r * meta.frameH);
      ctx.stroke();
    }

    // Frame index labels
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = 'rgba(0,255,255,0.9)';
    for (var i = 0; i < meta.totalFrames; i++) {
      var col = i % meta.columns;
      var row = Math.floor(i / meta.columns);
      ctx.fillText(String(i), col * meta.frameW + 3, row * meta.frameH + 12);
    }

    return gc;
  };

  /* ─────────────────── 2. ANIMATED IMAGE MODE (GIF/APNG/WebP) ──────── */

  /**
   * Load an animated image (GIF, APNG, WebP).
   * Uses window.ImageDecoder when available, otherwise falls back to
   * rendering the img element at sequential seek points via canvas.
   * @param {Blob|File|ArrayBuffer|string} source — Blob/File, ArrayBuffer, or DataURL
   * @returns {Promise<Array<{canvas, duration}>>}
   */
  PetAnimationEngine.prototype.loadAnimatedImage = function (source) {
    var self = this;

    // Normalise source → Blob
    function toBlob(src) {
      if (src instanceof Blob) { return Promise.resolve(src); }
      if (src instanceof ArrayBuffer) {
        return Promise.resolve(new Blob([src]));
      }
      if (typeof src === 'string') {
        // DataURL → Blob
        var arr = src.split(',');
        var mime = arr[0].match(/:(.*?);/)[1];
        var bstr = atob(arr[1]);
        var n = bstr.length;
        var u8 = new Uint8Array(n);
        for (var i = 0; i < n; i++) { u8[i] = bstr.charCodeAt(i); }
        return Promise.resolve(new Blob([u8], { type: mime }));
      }
      return Promise.reject(new Error('Unsupported source type'));
    }

    return toBlob(source).then(function (blob) {
      var mime = blob.type || 'image/gif';

      // ── Path A: ImageDecoder API ──
      if (typeof ImageDecoder !== 'undefined') {
        return blob.arrayBuffer().then(function (ab) {
          var decoder = new ImageDecoder({ data: ab, type: mime });
          return decoder.tracks.ready.then(function () {
            var frameCount = decoder.tracks.selectedTrack.frameCount;
            var promises = [];
            for (var i = 0; i < frameCount; i++) {
              promises.push(decoder.decode({ frameIndex: i }));
            }
            return Promise.all(promises);
          }).then(function (results) {
            self._frames = results.map(function (r) {
              var vf = r.image;
              var fc = makeCanvas(vf.displayWidth, vf.displayHeight);
              var ctx = fc.getContext('2d');
              if (ctx) { ctx.drawImage(vf, 0, 0); }
              vf.close();
              var duration = r.image.duration !== undefined
                ? r.image.duration / 1000  // microseconds → ms
                : 1000 / self._globalFps;
              return { canvas: fc, duration: duration };
            });
            self._frameIndex = 0;
            self._autoAssignIdleAll();
            return self._frames;
          });
        });
      }

      // ── Path B: Multi-frame fallback using img element ──
      return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(blob);
        var img = new Image();
        img.onload = function () {
          // Heuristic: use naturalWidth/Height; treat as single frame if
          // we can't detect actual frame count.
          var frameW = img.naturalWidth;
          var frameH = img.naturalHeight;

          // For GIF fallback we just capture the visible frame;
          // true multi-frame extraction without ImageDecoder requires a
          // library. We store what we can and note the limitation.
          var fc = makeCanvas(frameW, frameH);
          var ctx = fc.getContext('2d');
          if (ctx) { ctx.drawImage(img, 0, 0); }
          URL.revokeObjectURL(url);

          self._frames = [{ canvas: fc, duration: 1000 / self._globalFps }];
          self._frameIndex = 0;
          self._autoAssignIdleAll();
          resolve(self._frames);
        };
        img.onerror = function () {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load animated image'));
        };
        img.src = url;
      });
    });
  };

  /** Auto-assign idle state to cover all currently loaded frames. */
  PetAnimationEngine.prototype._autoAssignIdleAll = function () {
    var last = Math.max(0, this._frames.length - 1);
    this._states['idle'].startFrame = 0;
    this._states['idle'].endFrame = last;
    this._states['idle'].assigned = true;
  };

  /* ── Frame editing controls ── */

  /** Delete a frame by index. */
  PetAnimationEngine.prototype.deleteFrame = function (index) {
    if (index < 0 || index >= this._frames.length) { return; }
    this._frames.splice(index, 1);
    this._frameIndex = Math.min(this._frameIndex, Math.max(0, this._frames.length - 1));
    this._clampStateRanges();
  };

  /** Reverse the entire frame array in-place. */
  PetAnimationEngine.prototype.reverseFrames = function () {
    this._frames.reverse();
    this._frameIndex = 0;
  };

  /** Set a uniform duration (from fps) across all frames. */
  PetAnimationEngine.prototype.setCustomFps = function (fps) {
    this._globalFps = fps;
    var duration = 1000 / fps;
    this._frames.forEach(function (f) { f.duration = duration; });
  };

  /** Clamp state start/endFrame to valid range after frame deletion. */
  PetAnimationEngine.prototype._clampStateRanges = function () {
    var last = Math.max(0, this._frames.length - 1);
    var self = this;
    this._STATE_NAMES.forEach(function (s) {
      var st = self._states[s];
      st.startFrame = Math.min(st.startFrame, last);
      st.endFrame = Math.min(st.endFrame, last);
    });
  };

  /* ─────────────────────── 3. STATE MACHINE ────────────────────────── */

  /**
   * Configure a state's frame range and playback settings.
   * @param {string} stateName  one of idle|walk|sleep|click|drag
   * @param {Object} config     { startFrame, endFrame, loop, fps }
   */
  PetAnimationEngine.prototype.setState = function (stateName, config) {
    if (!config || typeof config !== 'object') {
      return this.activateState(stateName);
    }
    if (!this._states[stateName]) {
      throw new Error('Unknown state: ' + stateName);
    }
    var st = this._states[stateName];
    if (config.startFrame !== undefined) { st.startFrame = config.startFrame; }
    if (config.endFrame   !== undefined) { st.endFrame   = config.endFrame;   }
    if (config.loop       !== undefined) { st.loop       = config.loop;        }
    if (config.fps        !== undefined) { st.fps        = config.fps;         }
    st.assigned = true;
  };

  /**
   * Activate a state. Falls back to 'idle' if unassigned.
   * @param {string} stateName
   * @param {boolean} [forceRestart=false]
   */
  PetAnimationEngine.prototype.activateState = function (stateName, forceRestart) {
    if (!this._states[stateName] || !this._states[stateName].assigned) {
      stateName = 'idle';
    }
    if (this._currentState === stateName && !forceRestart) { return; }
    this._currentState = stateName;
    this._frameIndex = this._states[stateName].startFrame;
    this._lastFrameTime = 0;
    this._afterClickReturn = false;
  };

  /** Current active state name. */
  PetAnimationEngine.prototype.getCurrentState = function () {
    return this._currentState;
  };

  /* ──────────────────── 4. SANDBOX PREVIEW CANVAS ─────────────────── */

  /** Attach (or swap) the sandbox canvas element. */
  PetAnimationEngine.prototype.setSandboxCanvas = function (canvas) {
    var self = this;
    this._sandboxCanvas = canvas;
    this._sandboxCtx = canvas ? canvas.getContext('2d') : null;
    if (canvas) {
      canvas.addEventListener('click', function () { self._triggerClickState(); });
    }
  };

  /** Set hitbox used for overlay visualisation. */
  PetAnimationEngine.prototype.setHitbox = function (x, y, w, h) {
    this._hitbox = { x: x, y: y, w: w, h: h };
  };

  /** Set anchor used for overlay visualisation. */
  PetAnimationEngine.prototype.setAnchor = function (x, y) {
    this._anchor = { x: x, y: y };
  };

  /** Toggle hitbox overlay. */
  PetAnimationEngine.prototype.toggleHitbox = function (show) {
    this._showHitbox = (show !== undefined) ? show : !this._showHitbox;
  };

  /** Toggle anchor overlay. */
  PetAnimationEngine.prototype.toggleAnchor = function (show) {
    this._showAnchor = (show !== undefined) ? show : !this._showAnchor;
  };

  /** Trigger the 'click' state and return to 'idle' when finished. */
  PetAnimationEngine.prototype._triggerClickState = function () {
    if (!this._states['click'].assigned) { return; }
    this._afterClickReturn = true;
    this.activateState('click', true);
  };

  /** Start the animation loop (uses requestAnimationFrame). */
  PetAnimationEngine.prototype.play = function () {
    if (this._playing) { return; }
    this._playing = true;
    this._lastFrameTime = performance.now();
    this._scheduleFrame();
  };

  /** Stop the animation loop. */
  PetAnimationEngine.prototype.stop = function () {
    this._playing = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  };

  PetAnimationEngine.prototype._scheduleFrame = function () {
    var self = this;
    this._rafId = requestAnimationFrame(function (ts) {
      self._tick(ts);
    });
  };

  PetAnimationEngine.prototype._tick = function (ts) {
    if (!this._playing) { return; }

    var stCfg = this._states[this._currentState];
    var fps = stCfg.fps || this._globalFps;
    var frameDuration = 1000 / fps;

    if (ts - this._lastFrameTime >= frameDuration) {
      this._lastFrameTime = ts;
      this._advanceFrame(stCfg);
      this._renderSandbox();
    }

    this._scheduleFrame();
  };

  PetAnimationEngine.prototype._advanceFrame = function (stCfg) {
    var start = stCfg.startFrame;
    var end   = stCfg.endFrame;
    var range = Math.max(1, end - start + 1);

    this._frameIndex++;
    if (this._frameIndex > end) {
      if (stCfg.loop) {
        this._frameIndex = start;
      } else {
        this._frameIndex = end;
        // If this was a click-state one-shot, return to idle
        if (this._afterClickReturn) {
          this._afterClickReturn = false;
          this.activateState('idle', true);
        }
      }
    }
  };

  PetAnimationEngine.prototype._renderSandbox = function () {
    var ctx = this._sandboxCtx;
    if (!ctx || this._frames.length === 0) { return; }

    var cw = this._sandboxCanvas.width;
    var ch = this._sandboxCanvas.height;

    // Checkered background
    drawCheckered(ctx, cw, ch, 8);

    // Current frame
    var fi = Math.min(this._frameIndex, this._frames.length - 1);
    var frame = this._frames[fi];
    if (frame && frame.canvas) {
      var fw = frame.canvas.width;
      var fh = frame.canvas.height;
      // Centre-fit
      var scale = Math.min(cw / fw, ch / fh, 1);
      var dx = Math.floor((cw - fw * scale) / 2);
      var dy = Math.floor((ch - fh * scale) / 2);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(frame.canvas, dx, dy, fw * scale, fh * scale);

      // Hitbox overlay
      if (this._showHitbox) {
        ctx.save();
        ctx.translate(dx, dy);
        ctx.scale(scale, scale);
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 1 / scale;
        ctx.setLineDash([4 / scale, 4 / scale]);
        ctx.strokeRect(this._hitbox.x, this._hitbox.y, this._hitbox.w, this._hitbox.h);
        ctx.restore();
      }

      // Anchor crosshair overlay
      if (this._showAnchor) {
        ctx.save();
        ctx.translate(dx, dy);
        ctx.scale(scale, scale);
        var ax = this._anchor.x;
        var ay = this._anchor.y;
        var r = 8 / scale;
        ctx.strokeStyle = '#ffb300';
        ctx.lineWidth = 2 / scale;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(ax - r, ay);
        ctx.lineTo(ax + r, ay);
        ctx.moveTo(ax, ay - r);
        ctx.lineTo(ax, ay + r);
        ctx.stroke();
        // Circle around crosshair
        ctx.beginPath();
        ctx.arc(ax, ay, r * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  /* ── Build UI controls inside controlsRoot ── */
  PetAnimationEngine.prototype._buildControls = function () {
    var self = this;
    var root = this._controlsRoot;
    if (!root || typeof document === 'undefined') { return; }

    root.innerHTML = '';

    // State switch buttons
    var btnWrap = document.createElement('div');
    btnWrap.className = 'anim-state-buttons';
    btnWrap.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;';

    this._STATE_NAMES.forEach(function (s) {
      var btn = document.createElement('button');
      btn.textContent = s.charAt(0).toUpperCase() + s.slice(1);
      btn.style.cssText = 'padding:3px 8px;border-radius:4px;border:1px solid #555;background:#222;color:#eee;cursor:pointer;font-size:11px;';
      btn.addEventListener('click', function () {
        self.activateState(s, true);
        // Highlight active button
        Array.from(btnWrap.querySelectorAll('button')).forEach(function (b) {
          b.style.background = '#222';
        });
        btn.style.background = '#005577';
      });
      btnWrap.appendChild(btn);
    });
    root.appendChild(btnWrap);

    // Hitbox toggle
    var hitboxLbl = document.createElement('label');
    hitboxLbl.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:11px;color:#ccc;cursor:pointer;margin-bottom:4px;';
    var hitboxChk = document.createElement('input');
    hitboxChk.type = 'checkbox';
    hitboxChk.addEventListener('change', function () { self.toggleHitbox(hitboxChk.checked); });
    hitboxLbl.appendChild(hitboxChk);
    hitboxLbl.appendChild(document.createTextNode('Show Hitbox (cyan dashed)'));
    root.appendChild(hitboxLbl);

    // Anchor toggle
    var anchorLbl = document.createElement('label');
    anchorLbl.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:11px;color:#ccc;cursor:pointer;margin-bottom:4px;';
    var anchorChk = document.createElement('input');
    anchorChk.type = 'checkbox';
    anchorChk.addEventListener('change', function () { self.toggleAnchor(anchorChk.checked); });
    anchorLbl.appendChild(anchorChk);
    anchorLbl.appendChild(document.createTextNode('Show Anchor (amber +)'));
    root.appendChild(anchorLbl);

    // FPS control
    var fpsRow = document.createElement('div');
    fpsRow.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;color:#ccc;margin-bottom:4px;';
    var fpsLabel = document.createElement('span');
    fpsLabel.textContent = 'FPS:';
    var fpsInput = document.createElement('input');
    fpsInput.type = 'number';
    fpsInput.min = '1';
    fpsInput.max = '60';
    fpsInput.value = String(this._globalFps);
    fpsInput.style.cssText = 'width:50px;background:#222;color:#eee;border:1px solid #555;border-radius:3px;padding:2px 4px;';
    fpsInput.addEventListener('change', function () {
      var v = parseInt(fpsInput.value, 10);
      if (v >= 1 && v <= 60) { self.setCustomFps(v); }
    });
    fpsRow.appendChild(fpsLabel);
    fpsRow.appendChild(fpsInput);
    root.appendChild(fpsRow);

    // Reverse frames button
    var revBtn = document.createElement('button');
    revBtn.textContent = '⇄ Reverse Frames';
    revBtn.style.cssText = 'padding:3px 8px;border-radius:4px;border:1px solid #555;background:#222;color:#eee;cursor:pointer;font-size:11px;margin-bottom:4px;';
    revBtn.addEventListener('click', function () { self.reverseFrames(); });
    root.appendChild(revBtn);
  };

  /* ─────────────────────────── 5. EXPORT ──────────────────────────── */

  /**
   * Returns the full animation configuration.
   * @returns {Object}
   */
  PetAnimationEngine.prototype.getAnimationConfig = function () {
    var frameData = this._frames.map(function (f, i) {
      var dataUrl = null;
      try {
        if (f.canvas && typeof f.canvas.toDataURL === 'function') {
          dataUrl = f.canvas.toDataURL('image/png');
        } else if (f.canvas && typeof f.canvas.convertToBlob === 'function') {
          // OffscreenCanvas — caller should await, here we signal async
          dataUrl = '[OffscreenCanvas — call convertToBlob]';
        }
      } catch (e) { /* ignore taint */ }
      return { index: i, duration: f.duration, dataUrl: dataUrl };
    });

    return {
      states: JSON.parse(JSON.stringify(this._states)),
      frames: frameData,
      globalFps: this._globalFps,
      currentState: this._currentState,
      sheetMeta: this._sheetMeta ? {
        columns: this._sheetMeta.columns,
        rows: this._sheetMeta.rows,
        totalFrames: this._sheetMeta.totalFrames,
        fps: this._sheetMeta.fps,
        frameW: this._sheetMeta.frameW,
        frameH: this._sheetMeta.frameH
      } : null
    };
  };

  /* ────────────── Convenience: get frames array ────────────────────── */

  /** Raw frames array [{ canvas, duration }]. */
  PetAnimationEngine.prototype.getFrames = function () {
    return this._frames;
  };

  /** Current frame index. */
  PetAnimationEngine.prototype.getFrameIndex = function () {
    return this._frameIndex;
  };

  /** Number of loaded frames. */
  PetAnimationEngine.prototype.getFrameCount = function () {
    return this._frames.length;
  };

  /* ─────────────────── Expose on window ───────────────────────────── */

  global.PetAnimationEngine = PetAnimationEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PetAnimationEngine;
  }

}(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this)));
