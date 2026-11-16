/**
 * test-pet-events.js - Comprehensive Unit & Integration Tests for Pet Events & Motion UI
 * Worker A (events-ui-dev) Verification Suite - GIAI ĐOẠN 4 & GIAI ĐOẠN 2 (ĐỢT 1 + ĐỢT 2)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('====================================================');
console.log('🧪 RUNNING COMPREHENSIVE PET EVENTS & MOTION UI TESTS');
console.log('====================================================\n');

// ─────────────────────────────────────────────────────────────
// Setup Headless DOM Mock
// ─────────────────────────────────────────────────────────────
class MockClassList {
  constructor() {
    this.classes = new Set();
  }
  add(...cls) { cls.forEach(c => this.classes.add(c)); }
  remove(...cls) { cls.forEach(c => this.classes.delete(c)); }
  contains(c) { return this.classes.has(c); }
  toggle(c, force) {
    if (typeof force === 'boolean') {
      if (force) this.classes.add(c); else this.classes.delete(c);
      return force;
    }
    if (this.classes.has(c)) { this.classes.delete(c); return false; }
    this.classes.add(c); return true;
  }
  toString() { return Array.from(this.classes).join(' '); }
}

class MockElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.className = '';
    this.classList = new MockClassList();
    this.dataset = {};
    this.style = {};
    this.children = [];
    this.parentNode = null;
    this.innerHTMLValue = '';
    this.textContent = '';
    this.value = '';
    this.onclick = null;
    this.onchange = null;
    this.oninput = null;
  }

  get innerHTML() {
    return this.innerHTMLValue;
  }

  set innerHTML(val) {
    this.innerHTMLValue = val;
    this._parseHtml(val);
  }

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

  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }

  querySelectorAll(sel) {
    const res = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (matchesSelector(child, sel)) res.push(child);
        walk(child);
      }
    };
    walk(this);
    return res;
  }

  _parseHtml(html) {
    this.children = [];
    const idRegex = /id="([^"]+)"/g;
    let match;
    while ((match = idRegex.exec(html)) !== null) {
      const el = new MockElement('div', match[1]);
      this.children.push(el);
    }
    const classRegex = /class="([^"]+)"/g;
    while ((match = classRegex.exec(html)) !== null) {
      const clsList = match[1].split(/\s+/).filter(Boolean);
      const el = new MockElement('div');
      clsList.forEach(c => el.classList.add(c));
      this.children.push(el);
    }
  }
}

function matchesSelector(el, sel) {
  if (sel.startsWith('#')) return el.id === sel.slice(1);
  if (sel.startsWith('.')) return el.classList.contains(sel.slice(1));
  if (sel.includes('[data-event="')) {
    const ev = sel.match(/\[data-event="([^"]+)"\]/)[1];
    return el.dataset.event === ev;
  }
  return false;
}

class MockDocument {
  constructor() {
    this.elements = {};
    this.listeners = {};
    this.body = new MockElement('body');
  }

  getElementById(id) {
    return this.elements[id] || null;
  }

  createElement(tag) {
    return new MockElement(tag);
  }

  querySelector(sel) {
    if (sel.startsWith('#')) return this.getElementById(sel.slice(1));
    return this.body.querySelector(sel);
  }

  querySelectorAll(sel) {
    return this.body.querySelectorAll(sel);
  }

  addEventListener(ev, fn) {
    if (!this.listeners[ev]) this.listeners[ev] = [];
    this.listeners[ev].push(fn);
  }

  dispatchEvent(ev) {
    if (this.listeners[ev.type]) {
      this.listeners[ev.type].forEach(fn => fn(ev));
    }
  }
}

const mockDoc = new MockDocument();
global.document = mockDoc;
global.window = {
  document: mockDoc,
  appState: {},
  addEventListener: (ev, fn) => mockDoc.addEventListener(ev, fn)
};

// Create required DOM containers
const petMount = new MockElement('div', 'petEventsMount');
const simBar = new MockElement('div', 'previewPetSimBar');
const composer = new MockElement('div', 'previewComposer');
const badge = new MockElement('div', 'previewMascotBadge');
const motionMount = new MockElement('div', 'motionUIMount');

composer.appendChild(badge);
mockDoc.elements['petEventsMount'] = petMount;
mockDoc.elements['previewPetSimBar'] = simBar;
mockDoc.elements['previewComposer'] = composer;
mockDoc.elements['previewMascotBadge'] = badge;
mockDoc.elements['motionUIMount'] = motionMount;
mockDoc.body.appendChild(petMount);
mockDoc.body.appendChild(simBar);
mockDoc.body.appendChild(composer);
mockDoc.body.appendChild(motionMount);

// Load events.js & motion-ui.js
const { StudioEvents, PetEventsUI, EVENT_PRIORITIES, DEFAULT_PET_EVENTS } = require('../renderer/events.js');
const MotionUI = require('../renderer/motion-ui.js');

// Mock PetOverlayInstance for integration testing
let mockOverlayState = 'idle';
let mockOverlaySpeech = '';
global.window.PetOverlayInstance = {
  setState: (s) => { mockOverlayState = s; },
  showSpeechBubble: (text) => { mockOverlaySpeech = text; },
  _removeBubble: () => { mockOverlaySpeech = ''; }
};

// Mock MotionEngine
let mockEngineConfig = null;
global.window.MotionEngine = {
  setConfig: (cfg) => { mockEngineConfig = cfg; }
};

// ─────────────────────────────────────────────────────────────
// TEST SUITE 1: Data Contract & Default Events
// ─────────────────────────────────────────────────────────────
console.log('--- TEST SUITE 1: Data Contract & Default Events ---');

assert.strictEqual(DEFAULT_PET_EVENTS.length, 7, 'Must define exactly 7 default pet events');
const requiredEvents = ['error', 'ai-thinking', 'user-typing', 'ai-done', 'pet-click', 'pet-drag', 'idle-long'];
requiredEvents.forEach(ev => {
  assert.ok(DEFAULT_PET_EVENTS.some(e => e.event === ev), `Missing event in contract: ${ev}`);
});
console.log('✓ All 7 pet events present in contract');

// Priority contract verification
assert.strictEqual(EVENT_PRIORITIES['error'], 100);
assert.strictEqual(EVENT_PRIORITIES['ai-thinking'], 80);
assert.strictEqual(EVENT_PRIORITIES['user-typing'], 60);
assert.strictEqual(EVENT_PRIORITIES['ai-done'], 40);
assert.strictEqual(EVENT_PRIORITIES['pet-click'], 30);
assert.strictEqual(EVENT_PRIORITIES['pet-drag'], 25);
assert.strictEqual(EVENT_PRIORITIES['idle-long'], 10);
assert.ok(
  EVENT_PRIORITIES['error'] > EVENT_PRIORITIES['ai-thinking'] &&
  EVENT_PRIORITIES['ai-thinking'] > EVENT_PRIORITIES['user-typing'] &&
  EVENT_PRIORITIES['user-typing'] > EVENT_PRIORITIES['ai-done'] &&
  EVENT_PRIORITIES['ai-done'] > EVENT_PRIORITIES['pet-click'] &&
  EVENT_PRIORITIES['pet-click'] > EVENT_PRIORITIES['pet-drag'] &&
  EVENT_PRIORITIES['pet-drag'] > EVENT_PRIORITIES['idle-long'],
  'Priority hierarchy must strictly satisfy error 100 > thinking 80 > typing 60 > done 40 > click 30 > drag 25 > idle 10'
);
console.log('✓ Priority ordering strictly verified (100 > 80 > 60 > 40 > 30 > 25 > 10)');

// ─────────────────────────────────────────────────────────────
// TEST SUITE 2: PetEventsUI Initialization & DOM Rendering
// ─────────────────────────────────────────────────────────────
console.log('\n--- TEST SUITE 2: UI Mount & Table / Sim Bar Rendering ---');

PetEventsUI.init(petMount, simBar);
assert.ok(petMount.innerHTML.includes('BẢNG PHẢN ỨNG SỰ KIỆN CHO PET'), 'Pet events table header rendered');
assert.ok(petMount.innerHTML.includes('pet-events-table'), 'Table structure rendered');
assert.ok(petMount.innerHTML.includes('data-event="error"'), 'Error event row rendered');
assert.ok(petMount.innerHTML.includes('data-event="ai-thinking"'), 'Thinking event row rendered');
assert.ok(petMount.innerHTML.includes('data-event="user-typing"'), 'User typing row rendered');

// Verify Simulation Bar buttons
assert.ok(simBar.innerHTML.includes('Thinking'), 'Sim bar has Thinking button');
assert.ok(simBar.innerHTML.includes('Đang gõ'), 'Sim bar has Đang gõ button');
assert.ok(simBar.innerHTML.includes('Xong'), 'Sim bar has Xong button');
assert.ok(simBar.innerHTML.includes('Lỗi'), 'Sim bar has Lỗi button');
assert.ok(simBar.innerHTML.includes('Rảnh lâu'), 'Sim bar has Rảnh lâu button');
console.log('✓ All 5 sim bar buttons ("Thinking", "Đang gõ", "Xong", "Lỗi", "Rảnh lâu") rendered properly');

// ─────────────────────────────────────────────────────────────
// TEST SUITE 3: Priority Interrupt Rules & Overwrite Prevention
// ─────────────────────────────────────────────────────────────
console.log('\n--- TEST SUITE 3: Priority Interrupt & Non-Overwrite Rules ---');

// 1. Trigger "Lỗi" (error - priority 100)
PetEventsUI.triggerEvent('error');
assert.strictEqual(PetEventsUI.getActiveEvent(), 'error', 'Active event should be error');
assert.strictEqual(PetEventsUI.getCurrentState(), 'sleep', 'Pet state should change to sleep on error');
assert.strictEqual(mockOverlayState, 'sleep', 'Overlay state should receive sleep');
assert.ok(mockOverlaySpeech.includes('Ối có lỗi'), 'Speech bubble must contain error text');
assert.strictEqual(badge.dataset.petState, 'sleep', 'Preview pet badge must have data-pet-state="sleep"');
console.log('✓ Step 1: Triggering "Lỗi" changes pet state to sleep with error speech bubble');

// 2. While "Lỗi" is active, attempt to trigger "Thinking" (ai-thinking - priority 80)
const thinkingResult = PetEventsUI.triggerEvent('ai-thinking');
assert.strictEqual(thinkingResult, false, 'Triggering lower priority thinking while error is active must be rejected');
assert.strictEqual(PetEventsUI.getActiveEvent(), 'error', 'Active event MUST remain error');
assert.strictEqual(PetEventsUI.getCurrentState(), 'sleep', 'State MUST remain sleep, not overwritten by thinking');
assert.ok(mockOverlaySpeech.includes('Ối có lỗi'), 'Speech bubble must NOT be overwritten');
console.log('✓ Step 2: Triggering "Thinking" (80) while "Lỗi" (100) is active DOES NOT overwrite error');

// 3. While "Lỗi" is active, attempt to trigger "Đang gõ" (60) or another "Lỗi" (100)
const typingResult = PetEventsUI.triggerEvent('user-typing');
assert.strictEqual(typingResult, false, 'Equal or lower priority must not overwrite active event');
const errorAgainResult = PetEventsUI.triggerEvent('error');
assert.strictEqual(errorAgainResult, false, 'Equal priority (100 vs 100) must not interrupt');
console.log('✓ Step 3: Equal or lower priority events cannot overwrite active event');

// ─────────────────────────────────────────────────────────────
// TEST SUITE 4: Timer & Automatic Reversion to 'idle'
// ─────────────────────────────────────────────────────────────
console.log('\n--- TEST SUITE 4: Reversion to Idle after returnAfterMs ---');

// Force revert to idle
PetEventsUI.revertToIdle();
assert.strictEqual(PetEventsUI.getActiveEvent(), null, 'Active event should be null after revert');
assert.strictEqual(PetEventsUI.getCurrentState(), 'idle', 'Current state should be idle');
assert.strictEqual(mockOverlayState, 'idle', 'Overlay state reverted to idle');
assert.strictEqual(badge.dataset.petState, 'idle', 'Preview badge state reverted to idle');
console.log('✓ Revert to idle successfully resets state and overlay to idle');

// Now trigger "Thinking" (80) with a custom fast return time (30ms)
const thinkingConfig = PetEventsUI.events.find(e => e.event === 'ai-thinking');
thinkingConfig.returnAfterMs = 40;

PetEventsUI.triggerEvent('ai-thinking');
assert.strictEqual(PetEventsUI.getActiveEvent(), 'ai-thinking');
assert.strictEqual(PetEventsUI.getCurrentState(), 'walk');

// Wait for timer to automatically fire
setTimeout(() => {
  assert.strictEqual(PetEventsUI.getActiveEvent(), null, 'After returnAfterMs, active event automatically clears');
  assert.strictEqual(PetEventsUI.getCurrentState(), 'idle', 'After returnAfterMs, state automatically reverts to idle');
  console.log('✓ Automatic timer reversion to "idle" verified');

  // ─────────────────────────────────────────────────────────────
  // TEST SUITE 5: Higher Priority Interrupting Lower Priority
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 5: Higher Priority Interrupting Lower Priority ---');
  PetEventsUI.triggerEvent('user-typing');
  assert.strictEqual(PetEventsUI.getActiveEvent(), 'user-typing');

  const interruptThinking = PetEventsUI.triggerEvent('ai-thinking');
  assert.strictEqual(interruptThinking, true, '80 should interrupt 60');
  assert.strictEqual(PetEventsUI.getActiveEvent(), 'ai-thinking');

  const interruptError = PetEventsUI.triggerEvent('error');
  assert.strictEqual(interruptError, true, '100 should interrupt 80');
  assert.strictEqual(PetEventsUI.getActiveEvent(), 'error');
  console.log('✓ Higher priority cleanly interrupts lower priority as specified');

  // ─────────────────────────────────────────────────────────────
  // TEST SUITE 6: Fallback to 'idle' for Missing / Invalid State
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 6: Fallback to idle with Gentle Warning ---');
  PetEventsUI.revertToIdle();

  const errConf = PetEventsUI.events.find(e => e.event === 'error');
  const prevErrState = errConf.state;
  errConf.state = 'invalid_nonexistent_state';

  PetEventsUI.triggerEvent('error');
  assert.strictEqual(PetEventsUI.getCurrentState(), 'idle', 'Invalid state must fall back to idle');
  assert.ok(PetEventsUI.lastWarning.includes('không hợp lệ'), 'Gentle warning logged on invalid state');
  errConf.state = prevErrState; // restore
  console.log('✓ Fallback to "idle" with gentle warning verified');

  // ─────────────────────────────────────────────────────────────
  // TEST SUITE 7: StudioEvents Event Bus Integration
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 7: Event Bus Integration (window.StudioEvents) ---');
  PetEventsUI.revertToIdle();

  StudioEvents.emit('ai-done');
  assert.strictEqual(PetEventsUI.getActiveEvent(), 'ai-done', 'StudioEvents.emit("ai-done") must trigger PetEventsUI');
  console.log('✓ Event Bus StudioEvents.emit() triggers PetEventsUI');

  // ─────────────────────────────────────────────────────────────
  // TEST SUITE 8: MotionUI Basic Controls & Clean View Toggle
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 8: MotionUI Clean View & Basic Controls ---');
  MotionUI.init(motionMount);
  assert.strictEqual(MotionUI.initialized, true, 'MotionUI initializes successfully');

  // Clean View Toggle
  MotionUI.toggleCleanView();
  assert.strictEqual(MotionUI.cleanViewActive, true, 'Clean view activates');
  MotionUI.toggleCleanView(false);
  assert.strictEqual(MotionUI.cleanViewActive, false, 'Clean view deactivates');

  // Hold H simulation
  MotionUI._bindGlobalShortcuts();
  mockDoc.dispatchEvent({ type: 'keydown', key: 'h' });
  assert.strictEqual(MotionUI.cleanViewActive, true, 'Pressing H activates clean view');
  mockDoc.dispatchEvent({ type: 'keyup', key: 'h' });
  assert.strictEqual(MotionUI.cleanViewActive, false, 'Releasing H deactivates clean view');
  console.log('✓ Clean View toggle and Hold H keyboard shortcut verified');

  // ─────────────────────────────────────────────────────────────
  // TEST SUITE 9: ĐỢT 2 - Multi-Layer Management (3 Layers Demo)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 9: ĐỢT 2 - Multi-Layer (Tóc bay, Váy lay động, Mây trôi) ---');

  // Load 3-layer demo: Tóc, Váy, Mây
  const threeLayers = MotionUI.loadThreeLayerDemo();
  assert.strictEqual(threeLayers.length, 3, 'Must load exactly 3 layers');
  assert.strictEqual(threeLayers[0].name, 'Tóc bay');
  assert.strictEqual(threeLayers[1].name, 'Váy lay động');
  assert.strictEqual(threeLayers[2].name, 'Mây trôi');

  // Verify dedicated sliders for each layer
  assert.strictEqual(threeLayers[0].speed, 1.2, 'Tóc bay has speed 1.2');
  assert.strictEqual(threeLayers[0].intensity, 1.4, 'Tóc bay has intensity 1.4');
  assert.strictEqual(threeLayers[0].direction, 15, 'Tóc bay has direction 15');

  assert.strictEqual(threeLayers[1].speed, 0.9, 'Váy lay động has speed 0.9');
  assert.strictEqual(threeLayers[1].intensity, 1.2, 'Váy lay động has intensity 1.2');
  assert.strictEqual(threeLayers[1].direction, 45, 'Váy lay động has direction 45');

  assert.strictEqual(threeLayers[2].speed, 0.7, 'Mây trôi has speed 0.7');
  assert.strictEqual(threeLayers[2].intensity, 0.8, 'Mây trôi has intensity 0.8');
  assert.strictEqual(threeLayers[2].direction, 0, 'Mây trôi has direction 0');

  // Test updating layer slider values
  MotionUI.updateLayerProperty(threeLayers[0].id, 'speed', 2.5);
  assert.strictEqual(threeLayers[0].speed, 2.5, 'Updating layer speed persists');
  assert.strictEqual(mockEngineConfig.layers[0].speed, 2.5, 'Syncs immediately to MotionEngine');

  // Test Layer CRUD: duplicate, rename, toggle visibility, lock, delete
  const cloned = MotionUI.duplicateLayer(threeLayers[0].id);
  assert.strictEqual(MotionUI.layers.length, 4, 'Duplicate adds a layer');
  assert.ok(cloned.name.includes('(Bản sao)'), 'Duplicate has (Bản sao) in name');

  MotionUI.toggleLayerVisibility(cloned.id);
  assert.strictEqual(cloned.visible, false, 'Visibility toggle works');

  MotionUI.toggleLayerLock(cloned.id);
  assert.strictEqual(cloned.locked, true, 'Lock toggle works');

  MotionUI.removeLayer(cloned.id);
  assert.strictEqual(MotionUI.layers.length, 3, 'Removing layer restores count to 3');

  console.log('✓ Multi-layer 3-layer creation, dedicated sliders, and CRUD verified');

  // ─────────────────────────────────────────────────────────────
  // TEST SUITE 10: ĐỢT 2 - Canvas Layer Isolation & Clean View Check
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 10: Canvas Layer Isolation & No Red Dots in Clean View ---');

  // Mock MotionStudio for canvas rendering check
  const mockCalls = [];
  const mockCtx = {
    clearRect: () => {},
    drawImage: () => {},
    fillRect: () => {},
    beginPath: () => {},
    arc: (x, y, r) => { mockCalls.push({ type: 'arc', x, y, r }); },
    fill: () => {},
    stroke: () => {},
    setLineDash: () => {},
    save: () => {},
    restore: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    globalAlpha: 1.0
  };

  const mockStudio = {
    editorCtx: mockCtx,
    editorCanvas: { width: 800, height: 600 },
    currentImg: { complete: true, naturalWidth: 800 },
    arrows: [],
    pins: [],
    flowSpeed: 1.0,
    redrawEditor: () => {}
  };

  MotionUI.attachToStudio(mockStudio);

  // 1. In standard editing mode, verify active layer renders at alpha 1.0, and pins have radius 3.5px (no red 6px circles)
  mockCalls.length = 0;
  mockStudio.redrawEditor();
  const pinDots = mockCalls.filter(c => c.r === 3.5);
  assert.ok(pinDots.length > 0, 'Pins are rendered as small crisp 3.5px dots');
  const largeRedCircles = mockCalls.filter(c => c.r === 6);
  assert.strictEqual(largeRedCircles.length, 0, 'Zero large 6px red circles rendered');

  // 2. In Clean View mode, verify ZERO pins and ZERO overlays are drawn on canvas
  MotionUI.setCleanView(true);
  mockCalls.length = 0;
  mockStudio.redrawEditor();
  assert.strictEqual(mockCalls.length, 0, 'In Clean View mode, zero pins/gizmos are drawn on canvas');
  MotionUI.setCleanView(false);

  console.log('✓ Canvas layer isolation confirmed: zero red circles, small 3.5px dots, clean view leaves pure image');

  // ─────────────────────────────────────────────────────────────
  // TEST SUITE 11: ĐỢT 3 - Quick Intensity Presets & Advanced Accordion
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 11: ĐỢT 3 - Intensity Presets & Advanced Settings ---');

  // 1. Test intensity preset switching
  assert.strictEqual(MotionUI.config.intensityPreset, 'vua', 'Default intensity preset is "vua"');
  
  MotionUI.setIntensityPreset('tinh-te');
  assert.strictEqual(MotionUI.config.intensityPreset, 'tinh-te');
  assert.strictEqual(mockEngineConfig.intensityPreset, 'tinh-te', 'Syncs "tinh-te" directly to MotionEngine');

  MotionUI.setIntensityPreset('manh');
  assert.strictEqual(MotionUI.config.intensityPreset, 'manh');
  assert.strictEqual(mockEngineConfig.intensityPreset, 'manh', 'Syncs "manh" directly to MotionEngine');

  MotionUI.setIntensityPreset('vua');
  assert.strictEqual(MotionUI.config.intensityPreset, 'vua');

  // 2. Verify Advanced Details Accordion rendered and default closed
  assert.ok(motionMount.innerHTML.includes('motion-advanced-details'), 'Advanced details element rendered');
  assert.ok(!motionMount.innerHTML.includes('<details class="motion-advanced-details" open>'), 'Advanced details is default CLOSED');

  console.log('✓ Intensity presets (Tinh tế / Vừa / Mạnh) & Advanced Accordion verified');

  // ─────────────────────────────────────────────────────────────
  // TEST SUITE 12: ĐỢT 3 - Depth, Compare Slider & Parallax
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 12: ĐỢT 3 - Depth, Compare Slider & Parallax ---');

  // 1. Mock DepthEngine and test auto-depth generation
  let autoDepthCalled = false;
  global.window.DepthEngine = {
    generateAutoDepth: () => { autoDepthCalled = true; return {}; }
  };

  MotionUI.generateAutoDepth();
  assert.strictEqual(autoDepthCalled, true, 'generateAutoDepth called on DepthEngine');
  assert.strictEqual(MotionUI.layers.find(l => l.name.includes('Tóc')).depth, 0.85, 'Tóc assigned foreground depth');
  assert.strictEqual(MotionUI.layers.find(l => l.name.includes('Mây')).depth, 0.10, 'Mây assigned background depth');

  // 2. Test Compare Slider (Before / After)
  let comparedRatio = null;
  global.window.MotionEngine.setCompare = (r) => { comparedRatio = r; };

  MotionUI.toggleCompare(true);
  assert.strictEqual(MotionUI.compareActive, true, 'Compare mode activated');

  MotionUI.setCompareRatio(0.65);
  assert.strictEqual(comparedRatio, 0.65, 'Compare ratio 0.65 synced to MotionEngine');

  MotionUI.toggleCompare(false);
  assert.strictEqual(comparedRatio, null, 'Disabling compare calls MotionEngine.setCompare(null)');

  // 3. Test Parallax Mouse Toggle
  MotionUI.setParallaxMouse(false);
  assert.strictEqual(MotionUI.config.parallaxMouse, false);
  MotionUI.setParallaxMouse(true);
  assert.strictEqual(MotionUI.config.parallaxMouse, true);

  console.log('✓ Depth map integration, Compare Slider & Mouse Parallax verified');

  console.log('\n====================================================');
  console.log('🎉 ALL 12 PET EVENTS & MOTION UI TEST SUITES PASSED (100%)');
  console.log('====================================================');
}, 100);
