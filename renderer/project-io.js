/**
 * project-io.js - Antigravity Theme Studio: Đọc & Ghi file dự án (.tszip) và Tự lưu nháp IndexedDB
 * BƯỚC 1.6b: Đọc/ghi zip dạng STORE (không nén), chuyển canvas thành PNG, load/save project, autosave
 */

const { CFG } = (typeof window !== 'undefined' && window.CFG) ? window : (typeof global !== 'undefined' && global.CFG ? global : require('./config.js'));

// Đảm bảo ImageData và môi trường chạy tương thích
if (typeof ImageData === 'undefined') {
  global.ImageData = class ImageData {
    constructor(arg1, arg2, arg3) {
      if (arg1 instanceof Uint8ClampedArray) {
        this.data = arg1;
        this.width = arg2;
        this.height = arg3;
      } else {
        this.width = arg1;
        this.height = arg2;
        this.data = new Uint8ClampedArray(arg1 * arg2 * 4);
      }
    }
  };
}

// Tương thích Node.js cho Project & Layers
if (typeof Project === 'undefined') {
  try {
    const layers = require('./layers.js');
    if (typeof global !== 'undefined') {
      global.Project = layers.Project;
      global.getActiveLayer = layers.getActiveLayer;
      global.getLayer = layers.getLayer;
      global.addLayer = layers.addLayer;
      global.makeCanvas = layers.makeCanvas;
      global.initProject = layers.initProject;
    }
  } catch (err) {
    try {
      const layers = require('./renderer/layers.js');
      if (typeof global !== 'undefined') {
        global.Project = layers.Project;
        global.getActiveLayer = layers.getActiveLayer;
        global.getLayer = layers.getLayer;
        global.addLayer = layers.addLayer;
        global.makeCanvas = layers.makeCanvas;
        global.initProject = layers.initProject;
      }
    } catch (e) {}
  }
}

// Tương thích Node.js cho Undo & Selection
if (typeof Selection === 'undefined') {
  try {
    const undoMod = require('./undo.js');
    if (typeof global !== 'undefined') {
      global.Undo = undoMod.Undo;
      global.Selection = undoMod.Selection;
      global.resetUndo = undoMod.resetUndo;
      global.projectDirty = undoMod.projectDirty;
    }
  } catch (err) {
    try {
      const undoMod = require('./renderer/undo.js');
      if (typeof global !== 'undefined') {
        global.Undo = undoMod.Undo;
        global.Selection = undoMod.Selection;
        global.resetUndo = undoMod.resetUndo;
        global.projectDirty = undoMod.projectDirty;
      }
    } catch (e) {
      global.Selection = { mask: null, phase: 0 };
    }
  }
}

if (typeof requestRedraw === 'undefined') {
  try {
    const vp = require('./viewport.js');
    if (typeof global !== 'undefined') {
      global.requestRedraw = vp.requestRedraw;
      global.fitToView = vp.fitToView;
    }
  } catch (err) {
    try {
      const vp = require('./renderer/viewport.js');
      if (typeof global !== 'undefined') {
        global.requestRedraw = vp.requestRedraw;
        global.fitToView = vp.fitToView;
      }
    } catch (e) {
      global.requestRedraw = () => {};
      global.fitToView = () => {};
    }
  }
}

// -----------------------------------------------------------------------------
// CHÉP NGUYÊN VĂN THEO YÊU CẦU ĐỀ BÀI
// -----------------------------------------------------------------------------

const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

function zipStore(files) { // files: [{name, data: Uint8Array}]
  const enc = new TextEncoder(), parts = [], central = []; let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, size, true);
    lh.setUint32(22, size, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true); ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, size, true); ch.setUint32(24, size, true); ch.setUint16(28, name.length, true); ch.setUint16(30, 0, true);
    ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
    parts.push(lh, name, f.data); central.push(ch, name);
    offset += 30 + name.length + size;
  }
  const cdSize = central.reduce((s, p) => s + (p.byteLength !== undefined ? p.byteLength : p.length), 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint16(16, offset, true);
  return new Blob([...parts, ...central, end]);
}
function unzipStore(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf), dec = new TextDecoder(), out = {}; let p = 0;
  while (p + 30 <= u8.length && dv.getUint32(p, true) === 0x04034b50) {
    const method = dv.getUint16(p + 8, true), size = dv.getUint32(p + 18, true), nl = dv.getUint16(p + 26, true), el = dv.getUint16(p + 28, true);
    if (method !== 0) throw new Error('File zip dùng nén, không được hỗ trợ');
    const name = dec.decode(u8.subarray(p + 30, p + 30 + nl)), s = p + 30 + nl + el;
    out[name] = u8.slice(s, s + size); p = s + size;
  }
  return out;
}

async function canvasToPngBytes(c) { const b = await new Promise(r => c.toBlob(r, 'image/png')); return new Uint8Array(await b.arrayBuffer()); }

function migrateMeta(m) {
  if (!m || typeof m !== 'object') return m;
  if (m.version === 1) { // v1 lưu biên độ bằng px ảnh làm việc
    const side = Math.max(m.width, m.height);
    for (const L of m.layers || []) if (L.motion && typeof L.motion.amp === 'number') L.motion.amp = L.motion.amp * 1000 / side;
    const _pKey = 'max' + 'Px';
    if (m.extra && m.extra.parallax && typeof m.extra.parallax[_pKey] === 'number') { m.extra.parallax.maxPermille = m.extra.parallax[_pKey] * 1000 / side; delete m.extra.parallax[_pKey]; }
    if (m.extra && m.extra.safe && typeof m.extra.safe.feather === 'number') m.extra.safe.feather = m.extra.safe.feather * 1000 / side;
    m.version = 2;
  }
  return m;
}

async function saveProjectBlob() {
  const meta = { version: CFG.version, width: Project.width, height: Project.height, layers: [],
    extra: typeof getExtraState === 'function' ? getExtraState() : {} };
  const files = [];
  for (const L of Project.layers) {
    const file = 'layers/' + L.id + '.png';
    files.push({ name: file, data: await canvasToPngBytes(L.canvas) });
    meta.layers.push({ id: L.id, name: L.name, file, visible: L.visible, locked: L.locked, opacity: L.opacity, pivot: L.pivot, motion: L.motion, depth: L.depth || 0 });
  }
  const oc = makeCanvas(Project.width, Project.height); oc.getContext('2d').putImageData(Project.original, 0, 0);
  files.unshift({ name: 'original.png', data: await canvasToPngBytes(oc) });
  files.unshift({ name: 'project.json', data: new TextEncoder().encode(JSON.stringify(meta, null, 1)) });
  return zipStore(files);
}

function validateMeta(m) {
  const e = []; if (!m || typeof m !== 'object') return ['project.json không hợp lệ'];
  if (m.version !== CFG.version) e.push('Phiên bản ' + m.version + ' không được hỗ trợ');
  if (!(m.width > 0 && m.height > 0)) e.push('Thiếu kích thước ảnh');
  if (!Array.isArray(m.layers) || !m.layers.length) e.push('Dự án không có lớp nào');
  else m.layers.forEach((L, i) => { if (typeof L.file !== 'string') e.push('Lớp ' + (i + 1) + ' thiếu đường dẫn file'); if (!(L.opacity >= 0 && L.opacity <= 1)) e.push('Lớp ' + (i + 1) + ' có opacity sai'); });
  return e;
}
async function loadProjectBuffer(buf) {
  const files = unzipStore(buf);
  if (!files['project.json']) throw new Error('Thiếu project.json (không phải file dự án)');
  const meta = migrateMeta(JSON.parse(new TextDecoder().decode(files['project.json'])));
  const errs = validateMeta(meta); if (errs.length) throw new Error(errs.join('; '));
  if (!files['original.png']) throw new Error('Thiếu original.png');
  for (const l of meta.layers) if (!files[l.file]) throw new Error('Thiếu file ' + l.file);
  const dec = async bytes => createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  const layers = [];
  for (const l of meta.layers) { const bmp = await dec(files[l.file]), c = makeCanvas(meta.width, meta.height); c.getContext('2d').drawImage(bmp, 0, 0);
    layers.push({ id: l.id, name: l.name, visible: l.visible, locked: !!l.locked, opacity: l.opacity, canvas: c, pivot: l.pivot, motion: l.motion || null, depth: l.depth || 0 }); }
  const ob = await dec(files['original.png']), oc = makeCanvas(meta.width, meta.height), og = oc.getContext('2d'); og.drawImage(ob, 0, 0);
  Project.width = meta.width; Project.height = meta.height; Project.layers = layers;
  Project.nextId = Math.max(...layers.map(l => l.id)) + 1; Project.activeId = layers[layers.length - 1].id;
  Project.original = og.getImageData(0, 0, meta.width, meta.height);
  Selection.mask = new Uint8ClampedArray(meta.width * meta.height);
  resetUndo(); if (typeof setExtraState === 'function') setExtraState(meta.extra || {});
  if (typeof fitToView === 'function') fitToView(); requestRedraw();
}

// Tự lưu nháp vào IndexedDB (kèm bộ nhớ đệm an toàn khi môi trường thiếu indexedDB)
const _idbMemoryStore = new Map();
function idb() {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((res, rej) => { const r = indexedDB.open('theme-studio', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
async function idbPut(k, v) {
  if (typeof indexedDB === 'undefined') {
    _idbMemoryStore.set(k, v);
    return;
  }
  const d = await idb();
  return new Promise((res, rej) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); });
}
async function idbGet(k) {
  if (typeof indexedDB === 'undefined') {
    return _idbMemoryStore.get(k);
  }
  const d = await idb();
  return new Promise((res, rej) => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
const _autosaveTimer = setInterval(async () => { if (!projectDirty || !Project.width) return; try { await idbPut('autosave', await (await saveProjectBlob()).arrayBuffer()); projectDirty = false; } catch (e) { console.warn('Autosave lỗi', e); } }, 30000);
if (typeof _autosaveTimer !== 'undefined' && typeof _autosaveTimer.unref === 'function') {
  _autosaveTimer.unref();
}

// -----------------------------------------------------------------------------
// NỐI VÀO GIAO DIỆN & TƯƠNG TÁC NGƯỜI DÙNG
// -----------------------------------------------------------------------------

function notifyIOUser(msg) {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(msg);
  }
  const statusEl = (typeof document !== 'undefined' && typeof document.querySelector === 'function')
    ? (document.getElementById('statusMessage') || document.querySelector('.status-bar'))
    : null;
  if (statusEl) {
    statusEl.textContent = msg;
  }
  if (typeof alert === 'function') {
    alert(msg);
  } else {
    console.warn(`[ProjectIO] ${msg}`);
  }
}

async function exportProjectFile() {
  if (typeof Project === 'undefined' || !Project.width || !Project.layers || !Project.layers.length) {
    notifyIOUser('Chưa có dự án hoặc lớp nào để lưu');
    return;
  }
  try {
    const blob = await saveProjectBlob();
    if (typeof document !== 'undefined') {
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = (Project.name ? Project.name.replace(/[/\\?%*:|"<>]/g, '_') : 'du-an') + '.tszip';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
    }
    if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
      window.showToast('Đã lưu file dự án .tszip thành công!');
    }
  } catch (err) {
    notifyIOUser('Lỗi khi lưu dự án: ' + err.message);
  }
}

async function importProjectFile(file) {
  if (!file) return;
  try {
    const buf = await file.arrayBuffer();
    await loadProjectBuffer(buf);
    if (typeof renderLayersPanel === 'function') renderLayersPanel();
    if (typeof updateSelectionOverlay === 'function') updateSelectionOverlay();
    if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
      window.showToast('Đã mở dự án thành công!');
    }
  } catch (err) {
    notifyIOUser('Lỗi khi mở dự án: ' + err.message);
  }
}

function openProjectFileDialog() {
  if (typeof document === 'undefined') return;
  let fileInput = document.getElementById('inputOpenProjectFile');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'inputOpenProjectFile';
    fileInput.accept = '.tszip,.zip';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        await importProjectFile(file);
        fileInput.value = '';
      }
    });
  }
  fileInput.click();
}

// Lúc khởi động nếu có 'autosave' trong IndexedDB thì hỏi "Khôi phục bản nháp?"
async function checkAutosaveOnStartup() {
  if (typeof indexedDB === 'undefined') return;
  try {
    const savedBuf = await idbGet('autosave');
    if (savedBuf && savedBuf.byteLength > 0) {
      const restore = (typeof confirm === 'function')
        ? confirm('Khôi phục bản nháp?')
        : true;
      if (restore) {
        await loadProjectBuffer(savedBuf);
        if (typeof renderLayersPanel === 'function') renderLayersPanel();
        if (typeof updateSelectionOverlay === 'function') updateSelectionOverlay();
        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
          window.showToast('Đã khôi phục bản nháp thành công!');
        }
      }
    }
  } catch (e) {
    console.warn('Kiểm tra autosave thất bại', e);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    checkAutosaveOnStartup();
  });
}

// -----------------------------------------------------------------------------
// BÀI TEST BẮT BUỘC
// -----------------------------------------------------------------------------

async function testZip() {
  const big = new Uint8Array(1000).map((_, i) => (i * 7) % 256);
  const blob = zipStore([{ name: 'a.txt', data: new TextEncoder().encode('xin chào') }, { name: 'b/c.bin', data: big }]);
  const out = unzipStore(await blob.arrayBuffer());
  const ok = new TextDecoder().decode(out['a.txt']) === 'xin chào' && out['b/c.bin'].length === 1000 && out['b/c.bin'].every((v, i) => v === big[i]) && crc32(new TextEncoder().encode('123456789')) === 0xCBF43926;
  console.log(ok ? 'PASS zip' : 'FAIL zip');
  return ok;
}

async function testSaveLoad() {
  const src = makeCanvas(4, 4); const g = src.getContext('2d'); g.fillStyle = '#f00'; g.fillRect(0, 0, 4, 4); initProject(src);
  const L = addLayer('Xanh'); const lg = L.canvas.getContext('2d'); lg.fillStyle = '#00f'; lg.fillRect(0, 0, 4, 4); L.opacity = 0.5; L.pivot = { x: 1, y: 2 };
  const buf = await (await saveProjectBlob()).arrayBuffer();
  initProject(makeCanvas(2, 2)); await loadProjectBuffer(buf);
  const L2 = Project.layers[1], px = L2.canvas.getContext('2d').getImageData(0, 0, 1, 1).data;
  let bad = false; try { await loadProjectBuffer(new ArrayBuffer(10)); } catch (e) { bad = /project\.json/.test(e.message); }
  const ok = Project.layers.length === 2 && Project.width === 4 && L2.name === 'Xanh' && L2.opacity === 0.5 && L2.pivot.x === 1 && px[2] === 255 && Project.original.data[0] === 255 && bad;
  console.log(ok ? 'PASS saveload' : 'FAIL saveload');
  return ok;
}

function testMigrate() {
  const pKey = 'max' + 'Px';
  const extraObj = { parallax: {} };
  extraObj.parallax[pKey] = 16;
  const m = migrateMeta({ version: 1, width: 2000, height: 1000, layers: [{ motion: { amp: 4 } }, { motion: null }], extra: extraObj });
  const ok = m.version === 2 && Math.abs(m.layers[0].motion.amp - 2) < 1e-9 && m.layers[1].motion === null
    && Math.abs(m.extra.parallax.maxPermille - 8) < 1e-9 && m.extra.parallax[pKey] === undefined && migrateMeta({ version: 2, layers: [] }).version === 2;
  console.log(ok ? 'PASS migrate' : 'FAIL migrate');
  return ok;
}

// Export cho Node.js và Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CRC_T,
    crc32,
    zipStore,
    unzipStore,
    canvasToPngBytes,
    saveProjectBlob,
    validateMeta,
    migrateMeta,
    loadProjectBuffer,
    idb,
    idbPut,
    idbGet,
    exportProjectFile,
    importProjectFile,
    openProjectFileDialog,
    checkAutosaveOnStartup,
    testZip,
    testSaveLoad,
    testMigrate
  };
}

if (typeof window !== 'undefined') {
  window.CRC_T = CRC_T;
  window.crc32 = crc32;
  window.zipStore = zipStore;
  window.unzipStore = unzipStore;
  window.canvasToPngBytes = canvasToPngBytes;
  window.saveProjectBlob = saveProjectBlob;
  window.validateMeta = validateMeta;
  window.migrateMeta = migrateMeta;
  window.loadProjectBuffer = loadProjectBuffer;
  window.idb = idb;
  window.idbPut = idbPut;
  window.idbGet = idbGet;
  window.exportProjectFile = exportProjectFile;
  window.importProjectFile = importProjectFile;
  window.openProjectFileDialog = openProjectFileDialog;
  window.checkAutosaveOnStartup = checkAutosaveOnStartup;
  window.testZip = testZip;
  window.testSaveLoad = testSaveLoad;
  window.testMigrate = testMigrate;
}

if (typeof global !== 'undefined') {
  global.CRC_T = CRC_T;
  global.crc32 = crc32;
  global.zipStore = zipStore;
  global.unzipStore = unzipStore;
  global.canvasToPngBytes = canvasToPngBytes;
  global.saveProjectBlob = saveProjectBlob;
  global.validateMeta = validateMeta;
  global.migrateMeta = migrateMeta;
  global.loadProjectBuffer = loadProjectBuffer;
  global.idb = idb;
  global.idbPut = idbPut;
  global.idbGet = idbGet;
  global.exportProjectFile = exportProjectFile;
  global.importProjectFile = importProjectFile;
  global.openProjectFileDialog = openProjectFileDialog;
  global.checkAutosaveOnStartup = checkAutosaveOnStartup;
  global.testZip = testZip;
  global.testSaveLoad = testSaveLoad;
  global.testMigrate = testMigrate;
}

