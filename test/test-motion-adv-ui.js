/**
 * test-motion-adv-ui.js
 * Comprehensive Unit Test Suite for Motion UI Physics & Auto-Region Suggestions
 * Worker A (pack-dev) Verification Suite - GIAI ĐOẠN 6 (ĐỢT 2)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('====================================================');
console.log('🧪 RUNNING ADVANCED MOTION UI & PHYSICS TESTS');
console.log('====================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// Setup Headless DOM Mock
// ─────────────────────────────────────────────────────────────────────────────
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
    this.checked = false;
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

  _parseHtml(val) {
    this.children = [];
    const idRegex = /id="([^"]+)"/g;
    let match;
    while ((match = idRegex.exec(val)) !== null) {
      const el = new MockElement('div', match[1]);
      this.children.push(el);
    }
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      const id = selector.substring(1);
      return this._findRecursive(el => el.id === id);
    }
    if (selector.startsWith('.')) {
      const cls = selector.substring(1);
      return this._findRecursive(el => el.className && el.className.includes(cls));
    }
    return null;
  }

  querySelectorAll(selector) {
    const res = [];
    if (selector.startsWith('#')) {
      const id = selector.substring(1);
      this._findAllRecursive(el => el.id === id, res);
    } else if (selector.startsWith('.')) {
      const cls = selector.substring(1);
      this._findAllRecursive(el => el.className && el.className.includes(cls), res);
    }
    return res;
  }

  _findRecursive(pred) {
    for (const c of this.children) {
      if (pred(c)) return c;
      const f = c._findRecursive(pred);
      if (f) return f;
    }
    return null;
  }

  _findAllRecursive(pred, acc) {
    for (const c of this.children) {
      if (pred(c)) acc.push(c);
      c._findAllRecursive(pred, acc);
    }
  }

  appendChild(el) {
    el.parentNode = this;
    this.children.push(el);
    return el;
  }

  click() {
    if (typeof this.onclick === 'function') {
      this.onclick({ target: this, stopPropagation: () => {} });
    }
  }
}

// Global Document Mock
const domRegistry = {};
global.document = {
  readyState: 'complete',
  createElement: (tag) => new MockElement(tag),
  getElementById: (id) => domRegistry[id] || null,
  addEventListener: () => {}
};

// Global MotionEngine Mock
const physicsCalls = [];
global.window = {
  document: global.document,
  addEventListener: () => {},
  removeEventListener: () => {},
  appState: {},
  MotionEngine: {
    setConfig: (cfg) => {},
    setPhysics: (layerId, cfg) => {
      physicsCalls.push({ layerId, cfg: JSON.parse(JSON.stringify(cfg)) });
    },
    suggestRegions: async () => {
      return [
        {
          id: 'test-sug-hair',
          name: 'Tóc bay',
          color: '#FF9EAF',
          depth: 0.85,
          speed: 1.2,
          intensity: 1.2,
          direction: 15,
          physics: { enabled: true, anchor: { x: 0.5, y: 0.15 }, stiffness: 1.2, damping: 0.7, lag: 0.4 }
        },
        {
          id: 'test-sug-dress',
          name: 'Váy lay động',
          color: '#BB9AF7',
          depth: 0.70,
          speed: 0.8,
          intensity: 1.0,
          direction: 0,
          physics: { enabled: true, anchor: { x: 0.5, y: 0.55 }, stiffness: 0.8, damping: 0.8, lag: 0.5 }
        },
        {
          id: 'test-sug-water',
          name: 'Suối nước',
          color: '#7AA2F7',
          depth: 0.45,
          speed: 1.5,
          intensity: 1.4,
          direction: -90,
          physics: { enabled: false, anchor: { x: 0.5, y: 0.5 }, stiffness: 1.0, damping: 0.7, lag: 0.3 }
        },
        {
          id: 'test-sug-clouds',
          name: 'Mây trôi',
          color: '#7DCFFF',
          depth: 0.15,
          speed: 0.7,
          intensity: 0.8,
          direction: 90,
          physics: { enabled: false, anchor: { x: 0.5, y: 0.2 }, stiffness: 1.0, damping: 0.7, lag: 0.3 }
        }
      ];
    }
  }
};

const mountEl = new MockElement('div', 'motionUIMount');
domRegistry['motionUIMount'] = mountEl;

// Load MotionUI
const MotionUI = require('../renderer/motion-ui.js');

async function runTests() {
  let passedSuites = 0;

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 1: Initialization & Physics Contract on Layers
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: Physics Contract on Layers ---');
  {
    MotionUI.init(mountEl);
    assert(MotionUI.layers.length >= 1, 'Must have at least 1 layer');

    const activeLayer = MotionUI.getActiveLayer();
    assert(activeLayer.physics !== undefined, 'Layer must have physics configuration');
    assert.strictEqual(typeof activeLayer.physics.enabled, 'boolean', 'physics.enabled must be boolean');
    assert(activeLayer.physics.anchor !== undefined, 'physics.anchor must exist');
    assert.strictEqual(typeof activeLayer.physics.anchor.x, 'number', 'anchor.x must be number');
    assert.strictEqual(typeof activeLayer.physics.anchor.y, 'number', 'anchor.y must be number');
    assert.strictEqual(typeof activeLayer.physics.stiffness, 'number', 'stiffness must be number');
    assert.strictEqual(typeof activeLayer.physics.damping, 'number', 'damping must be number');
    assert.strictEqual(typeof activeLayer.physics.lag, 'number', 'lag must be number');

    console.log('✓ Layer physics data contract strictly conforms to STATUS.md Section 3.2');
    passedSuites++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 2: Layer CRUD Preserves Physics Settings
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Layer CRUD Preserves Physics ---');
  {
    // addLayer
    const newL = MotionUI.addLayer('Khăn quàng');
    assert(newL.physics !== undefined, 'New layer must have default physics');
    assert.strictEqual(newL.physics.enabled, false, 'Default physics for new custom layer is false');

    // setLayerPhysics
    MotionUI.setLayerPhysics(newL.id, {
      enabled: true,
      stiffness: 2.5,
      damping: 0.85,
      lag: 0.6
    });

    const updated = MotionUI.layers.find(l => l.id === newL.id);
    assert.strictEqual(updated.physics.enabled, true, 'Physics enabled updated');
    assert.strictEqual(updated.physics.stiffness, 2.5, 'Stiffness updated to 2.5');
    assert.strictEqual(updated.physics.damping, 0.85, 'Damping updated to 0.85');
    assert.strictEqual(updated.physics.lag, 0.6, 'Lag updated to 0.6');

    // duplicateLayer
    const dup = MotionUI.duplicateLayer(newL.id);
    assert(dup.physics !== undefined, 'Duplicated layer must have physics');
    assert.strictEqual(dup.physics.enabled, true, 'Duplicated physics.enabled preserved');
    assert.strictEqual(dup.physics.stiffness, 2.5, 'Duplicated stiffness preserved');
    assert.strictEqual(dup.physics.damping, 0.85, 'Duplicated damping preserved');

    // Verify MotionEngine.setPhysics was called
    assert(physicsCalls.length > 0, 'MotionEngine.setPhysics must be called on changes');
    const lastCall = physicsCalls[physicsCalls.length - 1];
    assert.strictEqual(lastCall.cfg.stiffness, 2.5, 'MotionEngine received correct stiffness');

    console.log('✓ Layer CRUD (addLayer, duplicateLayer, setLayerPhysics) properly maintains physics');
    passedSuites++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 3: UI Inspector Controls (Checkbox, Sliders, Anchor Picker)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: UI Inspector Controls Interaction ---');
  {
    const targetLayer = MotionUI.getActiveLayer();

    // Test toggle physics
    MotionUI.setLayerPhysics(targetLayer.id, { enabled: false });
    assert.strictEqual(targetLayer.physics.enabled, false);

    MotionUI.setLayerPhysics(targetLayer.id, { enabled: true });
    assert.strictEqual(targetLayer.physics.enabled, true);

    // Test sliders
    MotionUI.setLayerPhysics(targetLayer.id, { stiffness: 3.2 });
    assert.strictEqual(targetLayer.physics.stiffness, 3.2);

    MotionUI.setLayerPhysics(targetLayer.id, { damping: 0.65 });
    assert.strictEqual(targetLayer.physics.damping, 0.65);

    MotionUI.setLayerPhysics(targetLayer.id, { lag: 0.75 });
    assert.strictEqual(targetLayer.physics.lag, 0.75);

    // Test anchor picking
    const newAnchor = MotionUI.pickAnchor(targetLayer.id, { x: 0.45, y: 0.22 });
    assert.deepStrictEqual(newAnchor, { x: 0.45, y: 0.22 });
    assert.deepStrictEqual(targetLayer.physics.anchor, { x: 0.45, y: 0.22 });

    console.log('✓ Inspector controls (Enabled toggle, Stiffness, Damping, Lag, Anchor picker) verified');
    passedSuites++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 4: "✨ Gợi ý vùng" Modal Workflow & Candidate Selection
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: "✨ Gợi ý vùng" Workflow ---');
  {
    // Initial layers count
    const initCount = MotionUI.layers.length;

    // Open suggest modal
    const candidates = await MotionUI.openSuggestRegionsModal();
    assert.strictEqual(MotionUI.isSuggestModalOpen, true, 'Modal must be open');
    assert.strictEqual(candidates.length, 4, 'Must receive 4 candidate regions');

    // Verify 4 candidate categories: Tóc bay, Váy lay động, Suối nước, Mây trôi
    const names = candidates.map(c => c.name);
    assert(names.includes('Tóc bay'), 'Candidate must include Tóc bay');
    assert(names.includes('Váy lay động'), 'Candidate must include Váy lay động');
    assert(names.includes('Suối nước'), 'Candidate must include Suối nước');
    assert(names.includes('Mây trôi'), 'Candidate must include Mây trôi');

    // Check physics on candidates
    const hair = candidates.find(c => c.name === 'Tóc bay');
    assert(hair.physics && hair.physics.enabled, 'Tóc bay candidate has physics enabled');

    const water = candidates.find(c => c.name === 'Suối nước');
    assert(water.physics && !water.physics.enabled, 'Suối nước candidate has physics disabled');

    // Test toggle candidate
    MotionUI.toggleSuggestCandidate(water.id);
    const updatedWater = MotionUI._suggestCandidates.find(c => c.id === water.id);
    assert.strictEqual(updatedWater.selected, false, 'Water candidate unselected');

    // Test remove candidate
    const clouds = candidates.find(c => c.name === 'Mây trôi');
    MotionUI.removeSuggestCandidate(clouds.id);
    assert.strictEqual(MotionUI._suggestCandidates.length, 3, 'Candidate count reduced to 3');

    // Apply suggestions
    const addedCount = MotionUI.applySuggestedRegions();
    assert.strictEqual(addedCount, 2, 'Only 2 selected candidates applied (Hair and Dress)');
    assert.strictEqual(MotionUI.layers.length, initCount + 2, 'Layers list expanded by 2');
    assert.strictEqual(MotionUI.isSuggestModalOpen, false, 'Modal closed after applying');

    // Verify newly added layers exist in MotionUI and have correct physics
    const lastLayer = MotionUI.layers[MotionUI.layers.length - 1];
    assert.strictEqual(lastLayer.name, 'Váy lay động', 'Last added layer is Váy lay động');
    assert.strictEqual(lastLayer.physics.enabled, true, 'Váy lay động has physics enabled');

    console.log('✓ Suggest Regions button, modal drawer, candidates selection and layer batch apply verified');
    passedSuites++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 5: Demo 3-Layer Preset with Physics Verification
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 5: 3-Layer Demo Physics Integration ---');
  {
    MotionUI.loadThreeLayerDemo();
    assert.strictEqual(MotionUI.layers.length, 3, 'Must have 3 demo layers');

    const hair = MotionUI.layers.find(l => l.name === 'Tóc bay');
    assert(hair.physics && hair.physics.enabled, 'Demo Tóc bay must have physics enabled');
    assert.strictEqual(hair.physics.stiffness, 1.2, 'Hair stiffness matches preset');

    const dress = MotionUI.layers.find(l => l.name === 'Váy lay động');
    assert(dress.physics && dress.physics.enabled, 'Demo Váy lay động must have physics enabled');
    assert.strictEqual(dress.physics.lag, 0.5, 'Dress lag matches preset');

    const clouds = MotionUI.layers.find(l => l.name === 'Mây trôi');
    assert(clouds.physics && !clouds.physics.enabled, 'Demo Mây trôi must have physics disabled');

    console.log('✓ 3-Layer Demo correctly pre-configures spring physics on elastic layers');
    passedSuites++;
  }

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedSuites}/5 ADVANCED MOTION UI & PHYSICS TESTS PASSED (100%)`);
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
