/**
 * undo.js - Antigravity Theme Studio: Hệ thống Hoàn tác (Undo/Redo) & Quản lý Vùng chọn
 * BƯỚC 1.6a: Quản lý Undo stack, pixel diff crop, cấu trúc lớp & phím tắt
 */

// Đảm bảo ImageData và môi trường chạy tương thích trên cả Node.js và Browser
if (typeof ImageData === 'undefined') {
  global.ImageData = class ImageData {
    constructor(w, h) {
      this.width = w;
      this.height = h;
      this.data = new Uint8ClampedArray(w * h * 4);
    }
  };
}

if (typeof requestRedraw !== 'function') {
  function requestRedraw() {
    if (typeof window !== 'undefined' && typeof window.requestRedraw === 'function') {
      window.requestRedraw();
    }
  }
}

if (typeof Project === 'undefined') {
  try {
    const layers = require('./layers.js');
    if (typeof global !== 'undefined') {
      global.Project = layers.Project;
      global.getLayer = layers.getLayer;
      global.getActiveLayer = layers.getActiveLayer;
      global.addLayer = layers.addLayer;
      global.makeCanvas = layers.makeCanvas;
      global.initProject = layers.initProject;
    }
  } catch (err) {}
}

const { CFG } = (typeof window !== 'undefined' && window.CFG) ? window : (typeof global !== 'undefined' && global.CFG ? global : require('./config.js'));

// -----------------------------------------------------------------------------
// CHÉP NGUYÊN VĂN THEO YÊU CẦU ĐỀ BÀI
// -----------------------------------------------------------------------------

const Undo = { stack: [], index: 0, maxSteps: CFG.undo.maxSteps, maxBytes: CFG.undo.maxBytes, group: null };
const Selection = { mask: null, phase: 0 }; // mask: Uint8ClampedArray(width*height) hoặc null = không chọn
let projectDirty = false;

function undoBytes() { return Undo.stack.reduce((s, c) => s + (c.bytes || 0), 0); }
function resetUndo() { Undo.stack = []; Undo.index = 0; Undo.group = null; updateUndoUI(); }

function pushUndoPatch(cmd) { // cmd: { label, bytes, undo(), redo() } — lệnh đã được thực hiện sẵn
  projectDirty = true;
  if (Undo.group) { Undo.group.push(cmd); return; }
  Undo.stack.length = Undo.index; Undo.stack.push(cmd); Undo.index = Undo.stack.length;
  while (Undo.stack.length > Undo.maxSteps || (undoBytes() > Undo.maxBytes && Undo.stack.length > 1)) { Undo.stack.shift(); Undo.index--; }
  if (typeof Bus !== 'undefined') Bus.emit('project:changed', { label: cmd.label });
  updateUndoUI();
  requestRedraw();
}
function undo() { if (Undo.index === 0) return false; Undo.index--; Undo.stack[Undo.index].undo(); updateUndoUI(); requestRedraw(); return true; }
function redo() { if (Undo.index >= Undo.stack.length) return false; Undo.stack[Undo.index].redo(); Undo.index++; updateUndoUI(); requestRedraw(); return true; }

function withGroup(label, fn) { // gom nhiều lệnh thành MỘT bước undo
  Undo.group = []; let r;
  try { r = fn(); } finally { var cmds = Undo.group; Undo.group = null; }
  if (!cmds.length) return r;
  pushUndoPatch({ label, bytes: cmds.reduce((s, c) => s + (c.bytes || 0), 0),
    undo() { for (let i = cmds.length - 1; i >= 0; i--) cmds[i].undo(); },
    redo() { for (const c of cmds) c.redo(); } });
  return r;
}

// --- sửa pixel: chỉ lưu vùng thay đổi ---
function beginPixelEdit(layer) {
  const w = layer.canvas.width, h = layer.canvas.height;
  return { layerId: layer.id, w, h, before: layer.canvas.getContext('2d').getImageData(0, 0, w, h) };
}
function commitPixelEdit(snap, label) {
  const L = getLayer(snap.layerId), w = snap.w, h = snap.h;
  const after = L.canvas.getContext('2d').getImageData(0, 0, w, h), a = after.data, b = snap.before.data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4;
    if (a[i] !== b[i] || a[i+1] !== b[i+1] || a[i+2] !== b[i+2] || a[i+3] !== b[i+3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  if (x1 < 0) return false;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const crop = img => { const o = new ImageData(bw, bh); for (let r = 0; r < bh; r++) o.data.set(img.data.subarray(((y0 + r) * w + x0) * 4, ((y0 + r) * w + x0 + bw) * 4), r * bw * 4); return o; };
  const pb = crop(snap.before), pa = crop(after), id = snap.layerId;
  pushUndoPatch({ label, bytes: pb.data.length * 2,
    undo() { getLayer(id).canvas.getContext('2d').putImageData(pb, x0, y0); },
    redo() { getLayer(id).canvas.getContext('2d').putImageData(pa, x0, y0); } });
  return true;
}

// --- vùng chọn ---
function commitSelection(newMask, label) {
  const before = Selection.mask, after = newMask;
  Selection.mask = after;
  pushUndoPatch({ label: label || 'Vùng chọn', bytes: ((before ? before.length : 0) + (after ? after.length : 0)),
    undo() { Selection.mask = before; }, redo() { Selection.mask = after; } });
}

// --- cấu trúc lớp (thêm/xóa/nhân bản/đổi thứ tự/tên/opacity/ẩn hiện/chuyển động) ---
function snapLayers() {
  return Project.layers.map(L => ({ L, props: JSON.parse(JSON.stringify({ name: L.name, visible: L.visible, locked: L.locked, opacity: L.opacity, pivot: L.pivot, motion: L.motion, depth: L.depth })) }));
}
function restoreLayers(s) {
  Project.layers = s.map(e => { Object.assign(e.L, JSON.parse(JSON.stringify(e.props))); return e.L; });
  if (!getLayer(Project.activeId)) Project.activeId = Project.layers[Project.layers.length - 1].id;
}
function withStructureUndo(label, fn) {
  const before = snapLayers(); const r = fn(); const after = snapLayers();
  pushUndoPatch({ label, bytes: 1000, undo() { restoreLayers(before); }, redo() { restoreLayers(after); } });
  return r;
}

// -----------------------------------------------------------------------------
// NỐI GIAO DIỆN & PHÍM TẮT
// -----------------------------------------------------------------------------

function updateUndoUI() {
  if (typeof document === 'undefined') return;
  const btnUndo = (typeof document.getElementById === 'function' ? document.getElementById('btnUndo') : null) || (typeof document.querySelector === 'function' ? document.querySelector('.btn-undo') : null);
  const btnRedo = (typeof document.getElementById === 'function' ? document.getElementById('btnRedo') : null) || (typeof document.querySelector === 'function' ? document.querySelector('.btn-redo') : null);
  if (btnUndo) {
    btnUndo.disabled = Undo.index === 0;
    btnUndo.style.opacity = Undo.index === 0 ? '0.4' : '1.0';
    btnUndo.style.cursor = Undo.index === 0 ? 'not-allowed' : 'pointer';
  }
  if (btnRedo) {
    btnRedo.disabled = Undo.index >= Undo.stack.length;
    btnRedo.style.opacity = Undo.index >= Undo.stack.length ? '0.4' : '1.0';
    btnRedo.style.cursor = Undo.index >= Undo.stack.length ? 'not-allowed' : 'pointer';
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.target.matches && e.target.matches('input, textarea, select')) return;
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    if (isCtrlOrMeta && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
    } else if ((isCtrlOrMeta && e.key.toLowerCase() === 'y') || (isCtrlOrMeta && e.shiftKey && e.key.toLowerCase() === 'z')) {
      e.preventDefault();
      redo();
    }
  });
}

// -----------------------------------------------------------------------------
// BÀI TEST BẮT BUỘC
// -----------------------------------------------------------------------------

function testUndo() {
  resetUndo(); let v = 0;
  for (let i = 0; i < 5; i++) { const before = v, after = v + 1; v = after; pushUndoPatch({ label: 't', bytes: 10, undo() { v = before; }, redo() { v = after; } }); }
  for (let i = 0; i < 5; i++) undo(); const a = v; for (let i = 0; i < 5; i++) redo(); const b = v;
  initProject(makeCanvas(4, 4)); const L = getActiveLayer(), g = L.canvas.getContext('2d');
  const snap = beginPixelEdit(L); g.fillStyle = '#0f0'; g.fillRect(1, 1, 2, 2); const pushed = commitPixelEdit(snap, 'tô');
  const p = () => g.getImageData(1, 1, 1, 1).data[1];
  const p1 = p(); undo(); const p2 = p(); redo(); const p3 = p();
  withStructureUndo('thêm', () => addLayer('X')); const n1 = Project.layers.length; undo(); const n2 = Project.layers.length; redo(); const n3 = Project.layers.length;
  withGroup('nhóm', () => { withStructureUndo('a', () => addLayer('A')); withStructureUndo('b', () => addLayer('B')); });
  const n4 = Project.layers.length; undo(); const n5 = Project.layers.length;
  const ok = a === 0 && b === 5 && pushed && p1 === 255 && p2 === 0 && p3 === 255 && n1 === 2 && n2 === 1 && n3 === 2 && n4 === 4 && n5 === 2;
  console.log(ok ? 'PASS undo' : 'FAIL undo ' + [a, b, pushed, p1, p2, p3, n1, n2, n3, n4, n5]);
  return ok;
}

// Export cho Node.js và Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Undo,
    Selection,
    get projectDirty() { return projectDirty; },
    set projectDirty(v) { projectDirty = v; },
    undoBytes,
    resetUndo,
    pushUndoPatch,
    undo,
    redo,
    withGroup,
    beginPixelEdit,
    commitPixelEdit,
    commitSelection,
    snapLayers,
    restoreLayers,
    withStructureUndo,
    updateUndoUI,
    testUndo
  };
}

if (typeof window !== 'undefined') {
  window.Undo = Undo;
  window.Selection = Selection;
  window.undoBytes = undoBytes;
  window.resetUndo = resetUndo;
  window.pushUndoPatch = pushUndoPatch;
  window.undo = undo;
  window.redo = redo;
  window.withGroup = withGroup;
  window.beginPixelEdit = beginPixelEdit;
  window.commitPixelEdit = commitPixelEdit;
  window.commitSelection = commitSelection;
  window.snapLayers = snapLayers;
  window.restoreLayers = restoreLayers;
  window.withStructureUndo = withStructureUndo;
  window.updateUndoUI = updateUndoUI;
  window.testUndo = testUndo;
}
