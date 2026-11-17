/**
 * test-pet-pack.js - Comprehensive Unit & Integration Tests for Pet Pack & VSIX
 * Worker A (pack-dev) Verification Suite - GIAI ĐOẠN 5 (ĐỢT 1)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('====================================================');
console.log('🧪 RUNNING COMPREHENSIVE PET PACK & VSIX TESTS');
console.log('====================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// Setup Headless DOM & Global Mocks
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
    this.onclick = null;
    this.onchange = null;
    this.files = [];
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

  removeChild(el) {
    const idx = this.children.indexOf(el);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      el.parentNode = null;
    }
    return el;
  }

  click() {
    if (typeof this.onclick === 'function') {
      this.onclick({ target: this, preventDefault: () => {} });
    }
  }

  getContext(type) {
    return {
      clearRect: () => {},
      drawImage: () => {}
    };
  }

  toDataURL(type) {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
}

// Global Document Mock
const domRegistry = {};
global.document = {
  readyState: 'complete',
  createElement: (tag) => new MockElement(tag),
  getElementById: (id) => domRegistry[id] || null,
  addEventListener: () => {},
  body: new MockElement('body', 'body')
};

global.window = {
  document: global.document,
  appState: {
    petName: 'Gấu Máy Antigravity',
    petSpeech: 'Sẵn sàng code cùng bạn! 🚀',
    petSize: 128,
    petAnchor: { x: 64, y: 128 },
    petHitbox: { x: 10, y: 10, w: 108, h: 108 },
    mascotUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    petAnimConfig: {
      fps: 12,
      states: {
        idle: { startFrame: 0, endFrame: 1, loop: true, fps: 12 },
        walk: { startFrame: 2, endFrame: 3, loop: true, fps: 12 },
        sleep: { startFrame: 4, endFrame: 4, loop: true, fps: 6 },
        click: { startFrame: 0, endFrame: 0, loop: false, fps: 12 },
        drag: { startFrame: 2, endFrame: 2, loop: true, fps: 12 }
      }
    },
    petEvents: [
      { event: 'error', state: 'sleep', speech: 'Ối lỗi rồi!', priority: 100, returnAfterMs: 4000 }
    ]
  },
  confirm: () => true,
  updateLivePreview: () => {},
  saveConfig: () => {}
};

global.Image = class {
  constructor() {
    this.width = 128;
    this.height = 128;
    this.onload = null;
  }
  set src(val) {
    this._src = val;
    if (typeof this.onload === 'function') {
      setTimeout(() => this.onload(), 0);
    }
  }
  get src() { return this._src; }
};

// Mount points in registry
domRegistry['petPackMount'] = new MockElement('div', 'petPackMount');
domRegistry['pbsCanvas'] = new MockElement('canvas', 'pbsCanvas');

// Load PetPack
const PetPack = require('../renderer/pack.js');

// ─────────────────────────────────────────────────────────────────────────────
// Sample Pet Fixtures
// ─────────────────────────────────────────────────────────────────────────────
const SAMPLE_FRAME_1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const SAMPLE_FRAME_2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const validPetData = {
  schemaVersion: 1,
  name: 'Mecha Cyber Cat',
  speech: 'Chào chủ nhân! Hệ thống sẵn sàng ✨',
  fps: 14,
  size: 96,
  anchor: { x: 48, y: 96 },
  hitbox: { x: 8, y: 8, w: 80, h: 80 },
  states: {
    idle: { startFrame: 0, endFrame: 0, loop: true, fps: 12 },
    walk: { startFrame: 1, endFrame: 1, loop: true, fps: 14 },
    sleep: { startFrame: 0, endFrame: 0, loop: true, fps: 6 },
    click: { startFrame: 1, endFrame: 1, loop: false, fps: 16 },
    drag: { startFrame: 1, endFrame: 1, loop: true, fps: 12 }
  },
  events: [
    { event: 'error', state: 'sleep', speech: 'Lỗi rồi nè!', priority: 100, returnAfterMs: 4000 },
    { event: 'ai-thinking', state: 'walk', speech: 'Đang suy nghĩ...', priority: 80, returnAfterMs: 3500 },
    { event: 'user-typing', state: 'walk', speech: 'Đang gõ code!', priority: 60, returnAfterMs: 2500 },
    { event: 'ai-done', state: 'idle', speech: 'Đã xong xuôi!', priority: 40, returnAfterMs: 3000 },
    { event: 'pet-click', state: 'click', speech: 'Nhột quá!', priority: 30, returnAfterMs: 2000 },
    { event: 'pet-drag', state: 'drag', speech: 'Đang bay!', priority: 25, returnAfterMs: 2000 },
    { event: 'idle-long', state: 'sleep', speech: 'Khò khò...', priority: 10, returnAfterMs: 5000 }
  ],
  frames: [SAMPLE_FRAME_1, SAMPLE_FRAME_2]
};

// Helper: build raw zip buffer bypassing safety checks
function buildRawZip(entries) {
  const localChunks = [];
  const cdChunks = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, 'utf8');
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    
    // Local header
    const lh = Buffer.alloc(30 + nameBytes.length);
    lh.writeUInt32LE(0x04034B50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(0, 8); // STORED
    lh.writeUInt32LE(0, 14); // crc
    lh.writeUInt32LE(data.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameBytes.length, 26);
    nameBytes.copy(lh, 30);
    localChunks.push(lh, data);

    // Central directory header
    const cd = Buffer.alloc(46 + nameBytes.length);
    cd.writeUInt32LE(0x02014B50, 0);
    cd.writeUInt16LE(0x0314, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt32LE(0, 16);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBytes.length, 28);
    cd.writeUInt32LE(0x81A40000, 38);
    cd.writeUInt32LE(offset, 42);
    nameBytes.copy(cd, 46);
    cdChunks.push(cd);

    offset += lh.length + data.length;
  }

  const cdOffset = offset;
  const cdTotal = Buffer.concat(cdChunks);
  const cdSize = cdTotal.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054B50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);

  return Buffer.concat([...localChunks, cdTotal, eocd]);
}

async function runTests() {
  let passedSuites = 0;

  // ───────────────────────────────────────────────────────────────────────────
  // TEST SUITE 1: Export to PKZIP and Import Back (Exact Identity Roundtrip)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- TEST SUITE 1: Export to PKZIP & Import Roundtrip ---');
  {
    const zipBlob = await PetPack.exportZip(validPetData);
    assert(zipBlob instanceof Blob, 'Export must return a Blob instance');
    assert(zipBlob.size > 0, 'Exported zip blob must not be empty');
    assert.strictEqual(zipBlob.type, 'application/zip', 'Blob type must be application/zip');

    // Import back
    const importedPet = await PetPack.importZip(zipBlob, { applyNow: false });

    // Validate 100% fidelity
    assert.strictEqual(importedPet.schemaVersion, 1, 'schemaVersion must be 1');
    assert.strictEqual(importedPet.name, validPetData.name, 'Pet name must match exactly');
    assert.strictEqual(importedPet.speech, validPetData.speech, 'Pet speech must match exactly');
    assert.strictEqual(importedPet.fps, validPetData.fps, 'FPS must match exactly');
    assert.strictEqual(importedPet.size, validPetData.size, 'Size must match exactly');
    assert.deepStrictEqual(importedPet.anchor, validPetData.anchor, 'Anchor must match exactly');
    assert.deepStrictEqual(importedPet.hitbox, validPetData.hitbox, 'Hitbox must match exactly');
    assert.deepStrictEqual(importedPet.states, validPetData.states, 'States machine must match exactly');
    assert.deepStrictEqual(importedPet.events, validPetData.events, 'Events must match exactly');
    assert.strictEqual(importedPet.frames.length, 2, 'Must have 2 frames');
    assert.strictEqual(importedPet.frames[0], 'sprites/0001.png', 'Frame 1 path must be sprites/0001.png');
    assert.strictEqual(importedPet.frames[1], 'sprites/0002.png', 'Frame 2 path must be sprites/0002.png');
    assert.deepStrictEqual(importedPet.frameDataUrls, validPetData.frames, 'Binary frame PNGs must convert back to identical dataURLs');
    assert.strictEqual(importedPet.dataUrl, validPetData.frames[0], 'dataUrl must point to first sprite');

    console.log('✓ Pet exported to .zip and imported back produces exact identical pet');
    passedSuites++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST SUITE 2: PATH TRAVERSAL GUARD (Security Hardening)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 2: Path Traversal Security Guards ---');
  {
    const maliciousPaths = [
      '../../secret/password.txt',
      '..\\..\\windows\\system32\\cmd.exe',
      'sprites/../../hidden.sh',
      '/etc/shadow',
      '\\Windows\\win.ini',
      'C:/malware.exe',
      'D:\\payload.bat',
      'sprites/\x00nullbyte.png',
      '   '
    ];

    // Part A: validateEntryPath directly
    for (const badPath of maliciousPaths) {
      assert.throws(() => {
        PetPack.validateEntryPath(badPath);
      }, /(BẢO MẬT|không được để trống|Path Traversal|tuyệt đối)/, `validateEntryPath must reject "${badPath}"`);
    }

    // Part B: Raw zip containing malicious entry rejected on importZip
    for (const badPath of maliciousPaths.filter(p => p.trim())) {
      let threw = false;
      try {
        const rawZip = buildRawZip([
          { name: badPath, data: 'malicious payload' },
          { name: 'pet.json', data: JSON.stringify(validPetData) }
        ]);
        await PetPack.importZip(rawZip, { applyNow: false });
      } catch (err) {
        threw = true;
        assert(
          err.message.includes('BẢO MẬT') || err.message.includes('Path Traversal') || err.message.includes('tuyệt đối') || err.message.includes('không hợp lệ'),
          `Error message must state security rejection in Vietnamese: "${err.message}"`
        );
      }
      assert(threw, `Malicious zip with path "${badPath}" must be strictly rejected on import!`);
    }

    console.log('✓ All Path Traversal variants (../, ..\\, absolute paths, null bytes) strictly blocked');
    passedSuites++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST SUITE 3: Size Limits & Frame Count Protection
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 3: Size Limits & Frame Count Protection ---');
  {
    // Frame count > 500
    const excessiveFrames = [];
    for (let i = 0; i < 501; i++) excessiveFrames.push(SAMPLE_FRAME_1);

    let frameLimitThrew = false;
    try {
      await PetPack.exportZip({
        ...validPetData,
        frames: excessiveFrames
      });
    } catch (err) {
      frameLimitThrew = true;
      assert(err.message.includes('Số lượng khung hình vượt quá giới hạn'), 'Must throw frame count limit in Vietnamese');
    }
    assert(frameLimitThrew, 'Excessive frames (> 500) must throw error');

    // Archive size limit > 30MB
    let sizeLimitThrew = false;
    try {
      const hugeBuffer = Buffer.alloc(31 * 1024 * 1024);
      await PetPack.importZip(hugeBuffer, { applyNow: false });
    } catch (err) {
      sizeLimitThrew = true;
      assert(err.message.includes('vượt quá giới hạn dung lượng') && err.message.includes('30MB'), 'Must throw 30MB size limit in Vietnamese');
    }
    assert(sizeLimitThrew, 'Archives > 30MB must be rejected');

    console.log('✓ 30MB size limit and 500 frame count limit verified with Vietnamese error messages');
    passedSuites++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST SUITE 4: pet.json Schema Validation
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 4: pet.json Schema Validation ---');
  {
    // 1. Missing schemaVersion or schemaVersion !== 1
    assert.throws(() => {
      PetPack.validatePetJson({ ...validPetData, schemaVersion: 2 });
    }, /schemaVersion/, 'Must reject schemaVersion !== 1');

    assert.throws(() => {
      PetPack.validatePetJson({ ...validPetData, schemaVersion: undefined });
    }, /schemaVersion/, 'Must reject missing schemaVersion');

    // 2. Missing or empty name
    assert.throws(() => {
      PetPack.validatePetJson({ ...validPetData, name: '' });
    }, /name/, 'Must reject empty pet name');

    // 3. Missing required states
    const missingStates = JSON.parse(JSON.stringify(validPetData));
    delete missingStates.states.sleep;
    assert.throws(() => {
      PetPack.validatePetJson(missingStates);
    }, /sleep/, 'Must reject missing sleep state');

    // 4. Invalid state startFrame
    const invalidState = JSON.parse(JSON.stringify(validPetData));
    invalidState.states.idle.startFrame = -1;
    assert.throws(() => {
      PetPack.validatePetJson(invalidState);
    }, /startFrame/, 'Must reject negative startFrame');

    // 5. Invalid events
    assert.throws(() => {
      PetPack.validatePetJson({ ...validPetData, events: 'not-an-array' });
    }, /events/, 'Must reject non-array events');

    // 6. Invalid frames
    assert.throws(() => {
      PetPack.validatePetJson({ ...validPetData, frames: [] });
    }, /frames/, 'Must reject empty frames');

    console.log('✓ Strict pet.json schema validation (schemaVersion === 1, name, states, events, frames) verified');
    passedSuites++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST SUITE 5: Missing or Corrupt Frame Image Detection
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 5: Missing or Corrupted Sprite Verification ---');
  {
    // Test 1: Missing frame referenced in pet.json
    {
      const corruptZip = buildRawZip([
        {
          name: 'pet.json',
          data: JSON.stringify({
            schemaVersion: 1,
            name: 'Ghost Pet',
            states: validPetData.states,
            events: validPetData.events,
            frames: ['sprites/0001.png', 'sprites/nonexistent.png']
          })
        },
        {
          name: 'sprites/0001.png',
          data: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00])
        }
      ]);

      let threw = false;
      try {
        await PetPack.importZip(corruptZip, { applyNow: false });
      } catch (err) {
        threw = true;
        assert(err.message.includes('thiếu ảnh khung hình') && err.message.includes('nonexistent.png'), `Must report missing sprite path in Vietnamese: "${err.message}"`);
      }
      assert(threw, 'Missing frame PNG must be caught and reported');
    }

    // Test 2: Frame is not a valid PNG (corrupted magic header)
    {
      const badMagicZip = buildRawZip([
        {
          name: 'pet.json',
          data: JSON.stringify({
            schemaVersion: 1,
            name: 'Corrupt Pet',
            states: validPetData.states,
            events: validPetData.events,
            frames: ['sprites/0001.png']
          })
        },
        {
          name: 'sprites/0001.png',
          data: Buffer.from('NOT A PNG FILE - CORRUPTED HEADER')
        }
      ]);

      let threw = false;
      try {
        await PetPack.importZip(badMagicZip, { applyNow: false });
      } catch (err) {
        threw = true;
        assert(err.message.includes('không phải là định dạng ảnh PNG hợp lệ'), `Must report corrupt PNG header in Vietnamese: "${err.message}"`);
      }
      assert(threw, 'Non-PNG / Corrupted frame file must be caught and reported');
    }

    console.log('✓ Missing frames and invalid/corrupt PNG images caught with specific Vietnamese errors');
    passedSuites++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST SUITE 6: Active Pet Extraction, Overwrite Confirmation & Undo Snapshot
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 6: Active Pet Extraction, Overwrite & Undo Snapshot ---');
  {
    // Export without argument reads active pet data from appState & DOM
    const defaultExportBlob = await PetPack.exportZip();
    assert(defaultExportBlob.size > 0, 'Default export without args must read active pet');

    const defaultImport = await PetPack.importZip(defaultExportBlob, { applyNow: false });
    assert.strictEqual(defaultImport.name, 'Gấu Máy Antigravity', 'Must export active pet name from appState');
    assert.strictEqual(defaultImport.size, 128, 'Must export active pet size');

    // Take snapshot and restore
    PetPack.takeUndoSnapshot();
    assert(PetPack._undoSnapshot !== null, 'Undo snapshot must be stored');

    // Apply new pet data
    PetPack.restorePet(validPetData);
    assert.strictEqual(global.window.appState.petName, 'Mecha Cyber Cat', 'AppState must be updated with new pet name');
    assert.strictEqual(global.window.appState.petSize, 96, 'AppState must be updated with new pet size');

    // Call Undo
    PetPack.undoRestore();
    assert.strictEqual(global.window.appState.petName, 'Gấu Máy Antigravity', 'Undo must restore original pet name');
    assert.strictEqual(global.window.appState.petSize, 128, 'Undo must restore original pet size');
    assert.strictEqual(PetPack._undoSnapshot, null, 'Undo snapshot cleared after undo');

    console.log('✓ Active pet data extraction, restore into appState/PetOverlay, and Undo snapshot verified');
    passedSuites++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST SUITE 7: VSIX Extension Scaffold Generation & Manifest Integrity
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 7: VSIX Extension Scaffold Generator ---');
  {
    const vsixBlob = await PetPack.exportVsix(validPetData);
    assert(vsixBlob instanceof Blob, 'exportVsix must return Blob');
    assert(vsixBlob.size > 0, 'VSIX blob must not be empty');

    // Unpack VSIX and inspect contents
    const ab = await vsixBlob.arrayBuffer();
    const uint8 = new Uint8Array(ab);
    
    const fileNames = [];
    let p = 0;
    while (p < uint8.length - 30) {
      const sig = uint8[p] | (uint8[p+1] << 8) | (uint8[p+2] << 16) | (uint8[p+3] << 24);
      if (sig === 0x04034B50) {
        const nLen = uint8[p+26] | (uint8[p+27] << 8);
        const eLen = uint8[p+28] | (uint8[p+29] << 8);
        const cLen = (uint8[p+18] | (uint8[p+19] << 8) | (uint8[p+20] << 16) | (uint8[p+21] << 24)) >>> 0;
        const nameBytes = uint8.subarray(p+30, p+30+nLen);
        const name = Buffer.from(nameBytes).toString('utf8');
        fileNames.push(name);
        p = p + 30 + nLen + eLen + cLen;
      } else {
        p++;
      }
    }

    assert(fileNames.includes('package.json'), 'VSIX must contain package.json manifest');
    assert(fileNames.includes('extension.js'), 'VSIX must contain extension.js');
    assert(fileNames.includes('media/petOverlayRuntime.js'), 'VSIX must contain media/petOverlayRuntime.js');
    assert(fileNames.includes('media/petOverlayRuntime.css'), 'VSIX must contain media/petOverlayRuntime.css');
    assert(fileNames.includes('media/pet.json'), 'VSIX must contain media/pet.json');
    assert(fileNames.includes('media/sprites/0001.png'), 'VSIX must contain pet sprites');
    assert(fileNames.includes('README.md'), 'VSIX must contain README.md');

    console.log('✓ VSIX extension scaffold contains package.json, extension.js, media/, and transparent README.md');
    passedSuites++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST SUITE 8: UI Mount & Resilience (#petPackMount)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 8: UI Mount & Error Display Resilience ---');
  {
    const mountEl = domRegistry['petPackMount'];
    PetPack.init(mountEl);

    // Verify 3 buttons rendered
    const btnExport = mountEl.querySelector('#btnExportPetZip');
    const btnImport = mountEl.querySelector('#btnImportPetZip');
    const btnVsix = mountEl.querySelector('#btnExportPetVsix');
    const fileInput = mountEl.querySelector('#petPackFileInput');

    assert(btnExport !== null, 'Button "📦 Xuất gói Pet (.zip)" must be rendered');
    assert(btnImport !== null, 'Button "📂 Nhập gói Pet (.zip)" must be rendered');
    assert(btnVsix !== null, 'Button "🧩 Xuất thành Extension (VSIX)" must be rendered');
    assert(fileInput !== null, 'File input must exist');

    // Test error reporting UI resilience
    PetPack.showStatus('Thử nghiệm thông báo lỗi tiếng Việt', 'error');
    const statusArea = mountEl.querySelector('#petPackStatusArea');
    const statusMsg = mountEl.querySelector('#petPackStatusMessage');

    assert.strictEqual(statusArea.style.display, 'flex', 'Status area must be visible on error');
    assert(statusArea.className.includes('status-error'), 'Status area must have status-error class');
    assert.strictEqual(statusMsg.textContent, 'Thử nghiệm thông báo lỗi tiếng Việt', 'Status message must display correct text');

    // Test success with Undo button
    PetPack._undoSnapshot = { dummy: true };
    PetPack.showStatus('Nạp thành công', 'success', true);
    assert(statusArea.className.includes('status-success'), 'Status area must have status-success class');
    const undoBtn = mountEl.querySelector('.pet-pack-undo-btn');
    assert(undoBtn !== null, 'Undo button must be rendered when allowUndo is true');

    console.log('✓ UI correctly mounts into #petPackMount, 3 buttons present, and status banner handles errors gracefully');
    passedSuites++;
  }

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedSuites}/8 TEST SUITES PASSED (100%)`);
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
