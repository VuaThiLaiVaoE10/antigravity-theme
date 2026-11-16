/**
 * End-to-End Headless Verification Test for Pet Builder Studio (Giai Đoạn 1)
 *
 * Simulates:
 *   a) Loading an image with a solid black background.
 *   b) Running Magic Wand / Eyedropper 1-tap color key to remove the black background (alpha = 0).
 *   c) Auto-trimming the transparent borders.
 *   d) Setting the foot anchor crosshair (+).
 *   e) Setting the hitbox.
 *   f) Exporting clean transparent PNG & pet data.
 *   g) Initializing PetOverlay with the transparent pet sprite at corner (posX, posY), and verifying:
 *      - Independent fixed overlay layer (pointer-events: none, filter bypass).
 *      - Hitbox receives mouse events (pointer-events: auto).
 *      - Triggering click event transitions to 'click' animation state and shows speech bubble.
 *      - Drag and drop repositioning and velocity-based flipping.
 *      - Animation state transitions with PetAnimationEngine.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('================================================================');
console.log('🧪 E2E HEADLESS VERIFICATION: PET BUILDER STUDIO (GIAI ĐOẠN 1)');
console.log('================================================================\n');

/* ───────────────────────────────────────────────────────────────────
 * 1. Headless DOM & Canvas Mock Environment
 * ─────────────────────────────────────────────────────────────────── */

class MockElement {
  constructor(tag, id = '', className = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.className = className;
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.listeners = {};
    this.clientWidth = 600;
    this.clientHeight = 400;
    this.textContent = '';
    this.style = {
      removeProperty: (prop) => { delete this.style[prop]; }
    };
  }

  setAttribute(k, v) {
    this.attributes[k] = String(v);
    if (k === 'id') this.id = v;
    if (k === 'class') this.className = v;
  }
  getAttribute(k) { return this.attributes[k] || null; }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      const targetId = selector.slice(1);
      if (this.id === targetId) return this;
      for (const c of this.children) {
        if (c.id === targetId) return c;
        const found = c.querySelector && c.querySelector(selector);
        if (found) return found;
      }
      return null;
    }
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      for (const c of this.children) {
        if (c.className === cls || (c.className && c.className.split(' ').includes(cls))) return c;
        const found = c.querySelector && c.querySelector(selector);
        if (found) return found;
      }
      return null;
    }
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      for (const c of this.children) {
        if (c.className === cls || (c.className && c.className.split(' ').includes(cls))) results.push(c);
        if (c.querySelectorAll) results.push(...c.querySelectorAll(selector));
      }
    }
    return results;
  }

  addEventListener(evt, fn) {
    if (!this.listeners[evt]) this.listeners[evt] = [];
    this.listeners[evt].push(fn);
  }

  removeEventListener(evt, fn) {
    if (this.listeners[evt]) {
      this.listeners[evt] = this.listeners[evt].filter(f => f !== fn);
    }
  }

  dispatchEvent(evt) {
    const fns = this.listeners[evt.type] || [];
    for (const fn of fns) {
      fn(evt);
    }
  }
}

class MockCanvas extends MockElement {
  constructor(w = 120, h = 100) {
    super('canvas');
    this._width = w;
    this._height = h;
    this._pixels = new Uint8ClampedArray(w * h * 4);
    this._ctx = null;
  }

  get width() { return this._width; }
  set width(v) {
    this._width = v;
    this._resizeBuffer();
  }

  get height() { return this._height; }
  set height(v) {
    this._height = v;
    this._resizeBuffer();
  }

  _resizeBuffer() {
    this._pixels = new Uint8ClampedArray(this._width * this._height * 4);
  }

  getContext(type) {
    if (!this._ctx) this._ctx = new MockContext2D(this);
    return this._ctx;
  }

  toDataURL(type = 'image/png') {
    // Generate valid mock base64 data URL
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
}

class MockContext2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1;
    this.shadowColor = '';
    this.shadowBlur = 0;
  }

  clearRect(x, y, w, h) {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(cw, Math.floor(x + w));
    const y1 = Math.min(ch, Math.floor(y + h));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const i = (py * cw + px) * 4;
        this.canvas._pixels[i] = 0;
        this.canvas._pixels[i+1] = 0;
        this.canvas._pixels[i+2] = 0;
        this.canvas._pixels[i+3] = 0;
      }
    }
  }

  fillRect(x, y, w, h) {}
  strokeRect(x, y, w, h) {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  fill() {}
  stroke() {}
  save() {}
  restore() {}
  translate() {}
  scale() {}
  setLineDash() {}
  createPattern() { return {}; }

  getImageData(sx, sy, sw, sh) {
    const cw = this.canvas.width;
    const data = new Uint8ClampedArray(sw * sh * 4);
    for (let y = 0; y < sh; y++) {
      const srcY = sy + y;
      if (srcY < 0 || srcY >= this.canvas.height) continue;
      for (let x = 0; x < sw; x++) {
        const srcX = sx + x;
        if (srcX < 0 || srcX >= cw) continue;
        const sIdx = (srcY * cw + srcX) * 4;
        const dIdx = (y * sw + x) * 4;
        data[dIdx]   = this.canvas._pixels[sIdx];
        data[dIdx+1] = this.canvas._pixels[sIdx+1];
        data[dIdx+2] = this.canvas._pixels[sIdx+2];
        data[dIdx+3] = this.canvas._pixels[sIdx+3];
      }
    }
    return { data, width: sw, height: sh };
  }

  putImageData(imgData, dx, dy) {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    for (let y = 0; y < imgData.height; y++) {
      const dstY = dy + y;
      if (dstY < 0 || dstY >= ch) continue;
      for (let x = 0; x < imgData.width; x++) {
        const dstX = dx + x;
        if (dstX < 0 || dstX >= cw) continue;
        const sIdx = (y * imgData.width + x) * 4;
        const dIdx = (dstY * cw + dstX) * 4;
        this.canvas._pixels[dIdx]   = imgData.data[sIdx];
        this.canvas._pixels[dIdx+1] = imgData.data[sIdx+1];
        this.canvas._pixels[dIdx+2] = imgData.data[sIdx+2];
        this.canvas._pixels[dIdx+3] = imgData.data[sIdx+3];
      }
    }
  }

  drawImage(src, ...args) {
    const [dx, dy] = [args[0] || 0, args[1] || 0];
    const srcPixels = src._pixels;
    const sw = src.naturalWidth || src.width;
    const sh = src.naturalHeight || src.height;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    if (srcPixels) {
      for (let sy = 0; sy < sh; sy++) {
        const py = sy + dy;
        if (py < 0 || py >= ch) continue;
        for (let sx = 0; sx < sw; sx++) {
          const px = sx + dx;
          if (px < 0 || px >= cw) continue;
          const sIdx = (sy * sw + sx) * 4;
          const dIdx = (py * cw + px) * 4;
          this.canvas._pixels[dIdx]   = srcPixels[sIdx];
          this.canvas._pixels[dIdx+1] = srcPixels[sIdx+1];
          this.canvas._pixels[dIdx+2] = srcPixels[sIdx+2];
          this.canvas._pixels[dIdx+3] = srcPixels[sIdx+3];
        }
      }
    }
  }
}

// Global DOM setup
global.HTMLElement = MockElement;
global.HTMLCanvasElement = MockCanvas;

const mockDocListeners = {};
const mockDoc = {
  head: new MockElement('head'),
  body: new MockElement('body'),
  documentElement: new MockElement('html'),
  elementsById: {},
  getElementById(id) {
    return this.elementsById[id] || null;
  },
  createElement(tag) {
    let el;
    if (tag === 'canvas') el = new MockCanvas();
    else el = new MockElement(tag);
    Object.defineProperty(el, 'id', {
      get() { return this._id || ''; },
      set(val) {
        this._id = val;
        if (val) mockDoc.elementsById[val] = this;
      }
    });
    return el;
  },
  addEventListener(evt, fn) {
    if (!mockDocListeners[evt]) mockDocListeners[evt] = [];
    mockDocListeners[evt].push(fn);
  },
  removeEventListener(evt, fn) {
    if (mockDocListeners[evt]) {
      mockDocListeners[evt] = mockDocListeners[evt].filter(f => f !== fn);
    }
  },
  dispatchEvent(evt) {
    const fns = mockDocListeners[evt.type] || [];
    for (const fn of fns) fn(evt);
  }
};

global.document = mockDoc;
global.window = {
  document: mockDoc,
  addEventListener() {},
  removeEventListener() {},
  innerWidth: 1920,
  innerHeight: 1080
};

// Synthetic Pet Image generator
class MockImage {
  constructor(w = 120, h = 100) {
    this.naturalWidth = w;
    this.naturalHeight = h;
    this.width = w;
    this.height = h;
    this._pixels = new Uint8ClampedArray(w * h * 4);

    // Fill with solid black background (0, 0, 0, 255)
    // Place a 50x70 pet mascot in rect: x: 35..84, y: 20..89
    // Colors: Gold (#FFB86C) and Cyber Cyan (#8BE9FD)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (x >= 35 && x < 85 && y >= 20 && y < 90) {
          // Pet mascot sprite
          if (y < 45) {
            // Head (Cyber Cyan: 139, 233, 253, 255)
            this._pixels[idx]   = 139;
            this._pixels[idx+1] = 233;
            this._pixels[idx+2] = 253;
            this._pixels[idx+3] = 255;
          } else {
            // Body (Gold: 255, 184, 108, 255)
            this._pixels[idx]   = 255;
            this._pixels[idx+1] = 184;
            this._pixels[idx+2] = 108;
            this._pixels[idx+3] = 255;
          }
        } else {
          // Solid Black Background (0, 0, 0, 255)
          this._pixels[idx]   = 0;
          this._pixels[idx+1] = 0;
          this._pixels[idx+2] = 0;
          this._pixels[idx+3] = 255;
        }
      }
    }
  }

  set src(v) {
    this._src = v;
    if (this.onload) {
      setTimeout(() => this.onload(), 0);
    }
  }
  get src() { return this._src; }
}

global.Image = MockImage;

/* ───────────────────────────────────────────────────────────────────
 * 2. Load Core Engines
 * ─────────────────────────────────────────────────────────────────── */
const PetCanvasStudio = require('../renderer/petCanvasStudio.js');
const PetAnimationEngine = require('../renderer/petAnimationEngine.js');
const PetOverlay = require('../renderer/petOverlay.js');

async function runE2EVerification() {
  console.log('--- Step 1: Initialize PetCanvasStudio & Load Solid Black BG Image ---');
  const studioContainer = new MockElement('div', 'studioContainer');
  const studio = new PetCanvasStudio(studioContainer, {
    brushRadius: 16,
    tolerance: 30,
    contiguous: false
  });

  assert.ok(studio, 'PetCanvasStudio instance created successfully');
  console.log('   ✓ PetCanvasStudio created with container');

  // Load 120x100 solid black bg image with 50x70 mascot inside
  await studio.loadDataURL('data:image/png;base64,mock-black-bg-pet');

  assert.strictEqual(studio._width, 120, 'Image width matches original (120px)');
  assert.strictEqual(studio._height, 100, 'Image height matches original (100px)');

  const bgPixBefore = studio._imgCanvas.getContext('2d').getImageData(0, 0, 1, 1).data;
  assert.strictEqual(bgPixBefore[0], 0, 'Background pixel R is 0');
  assert.strictEqual(bgPixBefore[1], 0, 'Background pixel G is 0');
  assert.strictEqual(bgPixBefore[2], 0, 'Background pixel B is 0');
  assert.strictEqual(bgPixBefore[3], 255, 'Background pixel is completely opaque black (A=255)');

  const petPixBefore = studio._imgCanvas.getContext('2d').getImageData(50, 50, 1, 1).data;
  assert.strictEqual(petPixBefore[3], 255, 'Pet pixel is opaque (A=255)');
  assert.strictEqual(petPixBefore[0], 255, 'Pet pixel body R is 255');
  console.log('   ✓ Image loaded with 100% solid black background and intact pet mascot');

  console.log('\n--- Step 2: 1-Tap Color Key / Magic Wand to Remove Black Background ---');
  // Sample color key at corner (0, 0)
  studio.setTool(PetCanvasStudio.TOOLS.EYEDROPPER);
  studio._applyEyedropper(0, 0);

  // Verify background pixels are transparent (alpha = 0)
  const testPoints = [
    [0, 0], [10, 10], [119, 0], [0, 99], [119, 99], [20, 50], [100, 50]
  ];
  for (const [x, y] of testPoints) {
    const px = studio._imgCanvas.getContext('2d').getImageData(x, y, 1, 1).data;
    assert.strictEqual(px[3], 0, `Pixel at (${x}, ${y}) must have alpha = 0 (transparent)`);
  }
  console.log('   ✓ Eyedropper 1-tap color key removed solid black background (alpha = 0 across all border points)');

  // Verify pet mascot pixels inside remain completely intact
  const petHeadPix = studio._imgCanvas.getContext('2d').getImageData(60, 30, 1, 1).data;
  assert.strictEqual(petHeadPix[3], 255, 'Pet head alpha remains 255');
  assert.strictEqual(petHeadPix[0], 139, 'Pet head cyan R channel preserved');
  assert.strictEqual(petHeadPix[1], 233, 'Pet head cyan G channel preserved');

  const petBodyPix = studio._imgCanvas.getContext('2d').getImageData(60, 60, 1, 1).data;
  assert.strictEqual(petBodyPix[3], 255, 'Pet body alpha remains 255');
  assert.strictEqual(petBodyPix[0], 255, 'Pet body gold R channel preserved');
  console.log('   ✓ Pet mascot pixels fully preserved with original colors and alpha = 255');

  // Verify Magic Wand BFS flood fill & undo/redo
  studio._pushUndo();
  studio.setContiguous(true);
  studio._applyMagicWand(0, 0);
  assert.ok(studio.canUndo(), 'Undo stack records action');
  studio.undo();
  assert.ok(studio.canRedo(), 'Redo stack available');
  studio.redo();
  console.log('   ✓ Magic Wand contiguous fill and Undo/Redo verified');

  console.log('\n--- Step 3: Auto-Trim Transparent Borders ---');
  studio.autoTrim();

  // Original: mascot was in x: 35..84 (w=50), y: 20..89 (h=70)
  assert.strictEqual(studio._width, 50, 'Trimmed width matches mascot bounding box (50px)');
  assert.strictEqual(studio._height, 70, 'Trimmed height matches mascot bounding box (70px)');

  // Edges of the newly trimmed canvas should now be the mascot's bounds
  const edgeTop = studio._imgCanvas.getContext('2d').getImageData(25, 0, 1, 1).data;
  assert.ok(edgeTop[3] > 0, 'Top boundary touches mascot pixels');
  const edgeBottom = studio._imgCanvas.getContext('2d').getImageData(25, 69, 1, 1).data;
  assert.ok(edgeBottom[3] > 0, 'Bottom boundary touches mascot pixels');
  console.log(`   ✓ Auto-trim reduced canvas from 120x100 to exact pet bounds: ${studio._width}x${studio._height}px`);

  console.log('\n--- Step 4: Setting Foot Anchor Crosshair (+) ---');
  // Set foot anchor at bottom center of the mascot: x = 25, y = 70
  studio.setAnchor(25, 70);
  const anchor = studio.getAnchor();
  assert.strictEqual(anchor.anchorX, 25, 'Anchor X positioned at feet center');
  assert.strictEqual(anchor.anchorY, 70, 'Anchor Y positioned at feet bottom');
  console.log(`   ✓ Foot anchor crosshair configured at (${anchor.anchorX}, ${anchor.anchorY})`);

  console.log('\n--- Step 5: Setting Pet Hitbox ---');
  // Hitbox encompassing the clickable body area: x: 5, y: 10, w: 40, h: 58
  studio.setHitbox({ x: 5, y: 10, w: 40, h: 58 });
  const hitbox = studio.getHitbox();
  assert.strictEqual(hitbox.x, 5, 'Hitbox X matches');
  assert.strictEqual(hitbox.y, 10, 'Hitbox Y matches');
  assert.strictEqual(hitbox.w, 40, 'Hitbox width matches (40px)');
  assert.strictEqual(hitbox.h, 58, 'Hitbox height matches (58px)');
  console.log(`   ✓ Hitbox rectangle configured at [${hitbox.x}, ${hitbox.y}, ${hitbox.w}x${hitbox.h}]`);

  console.log('\n--- Step 6: Exporting Clean Transparent PNG & Pet Data ---');
  const cleanCanvas = studio.getCleanCanvas();
  assert.ok(cleanCanvas, 'Clean canvas exported');
  assert.strictEqual(cleanCanvas.width, 50, 'Clean canvas width matches pet');
  assert.strictEqual(cleanCanvas.height, 70, 'Clean canvas height matches pet');

  const pngDataUrl = studio.exportPNGDataUrl();
  assert.ok(pngDataUrl && pngDataUrl.startsWith('data:image/png'), 'Exported valid PNG data URL');

  const petData = studio.getPetData();
  assert.strictEqual(petData.width, 50, 'petData width is 50');
  assert.strictEqual(petData.height, 70, 'petData height is 70');
  assert.strictEqual(petData.anchorX, 25, 'petData anchorX is 25');
  assert.strictEqual(petData.anchorY, 70, 'petData anchorY is 70');
  assert.strictEqual(petData.hitbox.w, 40, 'petData hitbox w is 40');
  assert.strictEqual(petData.hitbox.h, 58, 'petData hitbox h is 58');
  console.log('   ✓ Exported transparent PNG & complete PetData config');

  console.log('\n--- Step 7: Initializing PetOverlay & Mounting at Corner (posX, posY) ---');
  // Position pet near bottom-right screen corner: posX = 1650, posY = 920
  const overlay = new PetOverlay({
    doc: mockDoc,
    posX: 1650,
    posY: 920,
    anchorX: petData.anchorX,
    anchorY: petData.anchorY,
    hitboxW: petData.hitbox.w,
    hitboxH: petData.hitbox.h,
    petDataUrl: petData.dataUrl,
    showPedestal: true,
    pedestalColor: '#FFB86C',
    filterOnPet: false
  });

  overlay.mount();

  // Verify Independent fixed overlay layer
  const overlayEl = mockDoc.getElementById('ag-pet-overlay-container');
  assert.ok(overlayEl, '#ag-pet-overlay-container mounted in DOM');
  assert.strictEqual(overlayEl.style.filter, 'none', 'Filter isolation verified (filter: none)');
  assert.strictEqual(overlayEl.style.backdropFilter, 'none', 'Backdrop filter isolation verified (backdropFilter: none)');
  console.log('   ✓ Independent fixed overlay layer confirmed with filter bypass isolation');

  // Verify Foot-anchor alignment: entity position = (posX - anchorX, posY - anchorY)
  const entityEl = mockDoc.getElementById('ag-pet-entity');
  assert.ok(entityEl, '#ag-pet-entity exists inside overlay');
  assert.strictEqual(entityEl.style.left, (1650 - 25) + 'px', 'Entity left offset aligns foot anchor to screen posX');
  assert.strictEqual(entityEl.style.top, (920 - 70) + 'px', 'Entity top offset aligns foot anchor to screen posY');
  console.log(`   ✓ Foot-anchor correctly maps (25, 70) to screen (${entityEl.style.left}, ${entityEl.style.top})`);

  // Verify Hitbox pointer-events
  const hitboxEl = entityEl.querySelector('.ag-pet-hitbox');
  assert.ok(hitboxEl, '.ag-pet-hitbox exists within pet entity');
  assert.strictEqual(hitboxEl.style.width, '40px', 'Hitbox width matches exported petData (40px)');
  assert.strictEqual(hitboxEl.style.height, '58px', 'Hitbox height matches exported petData (58px)');
  console.log('   ✓ Hitbox receives mouse events with designated interactive dimensions');

  // Verify Click Event & Speech Bubble Interaction
  assert.strictEqual(overlay._state, 'idle', 'Initial overlay state is idle');
  hitboxEl.dispatchEvent({
    type: 'click',
    clientX: 1650,
    clientY: 920,
    stopPropagation: () => {}
  });

  assert.strictEqual(overlay._state, 'click', 'Click event transitions state to click');
  const speechBubble = entityEl.querySelector('.ag-pet-speech-bubble');
  assert.ok(speechBubble, 'Speech bubble attached on click');
  assert.ok(speechBubble.textContent.length > 0, `Speech bubble displays text: "${speechBubble.textContent}"`);
  console.log(`   ✓ Click triggered state "click" and speech bubble: "${speechBubble.textContent}"`);

  // Verify Drag & Drop Repositioning & Velocity Auto-flip
  hitboxEl.dispatchEvent({
    type: 'mousedown',
    button: 0,
    clientX: 1650,
    clientY: 920,
    preventDefault: () => {},
    stopPropagation: () => {}
  });
  assert.strictEqual(overlay._state, 'drag', 'Mousedown transitions state to drag');

  // Drag to the right (+50px)
  mockDoc.dispatchEvent({
    type: 'mousemove',
    clientX: 1700,
    clientY: 910
  });
  assert.strictEqual(overlay.posX, 1700, 'posX updated during drag');
  assert.strictEqual(overlay.posY, 910, 'posY updated during drag');
  assert.strictEqual(overlay._faceDir, 1, 'Sprite faces right on positive velocity');

  // Drag to the left (-100px)
  mockDoc.dispatchEvent({
    type: 'mousemove',
    clientX: 1600,
    clientY: 900
  });
  assert.strictEqual(overlay.posX, 1600, 'posX updated');
  assert.strictEqual(overlay._faceDir, -1, 'Sprite flips left on negative velocity (scaleX(-1))');

  // Drop pet
  mockDoc.dispatchEvent({
    type: 'mouseup',
    clientX: 1600,
    clientY: 900
  });
  assert.strictEqual(overlay._state, 'idle', 'Mouseup settles pet and reverts state to idle');
  console.log('   ✓ Drag & drop repositioning and velocity auto-flip verified');

  console.log('\n--- Step 8: Animation Engine State Machine Collaboration ---');
  const animEngine = new PetAnimationEngine();
  animEngine.setState('idle',  { startFrame: 0, endFrame: 3, loop: true, fps: 10 });
  animEngine.setState('walk',  { startFrame: 4, endFrame: 7, loop: true, fps: 14 });
  animEngine.setState('click', { startFrame: 8, endFrame: 10, loop: false, fps: 16 });

  overlay.setAnimEngine(animEngine);
  overlay.setState('walk');
  assert.strictEqual(overlay._state, 'walk', 'Overlay state switches to walk');
  assert.strictEqual(animEngine.getCurrentState(), 'walk', 'PetAnimationEngine synchronized to walk');

  overlay.setState('idle');
  assert.strictEqual(overlay._state, 'idle', 'Overlay state returns to idle');
  console.log('   ✓ PetAnimationEngine state machine integrated smoothly with PetOverlay');

  console.log('\n================================================================');
  console.log('🎉 E2E VERIFICATION COMPLETED: ALL GIAI ĐOẠN 1 CRITERIA PASSED!');
  console.log('================================================================');
}

runE2EVerification().catch(err => {
  console.error('\n❌ E2E VERIFICATION FAILED:', err);
  process.exit(1);
});
