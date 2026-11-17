/**
 * cut.js - Antigravity Theme Studio: Cắt & Sao chép vùng chọn thành Lớp mới (Cut/Copy to Layer)
 * BƯỚC 1.4: Cắt / Sao chép vùng chọn, khử viền sáng (decontaminate), undo nhóm, phím tắt Ctrl+J
 */

// Đảm bảo ImageData và môi trường chạy tương thích trên cả Node.js và Browser
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
    const layers = require('./renderer/layers.js');
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
      const layers = require('./layers.js');
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
if (typeof withGroup === 'undefined') {
  try {
    const undoMod = require('./renderer/undo.js');
    if (typeof global !== 'undefined') {
      global.Undo = undoMod.Undo;
      global.Selection = undoMod.Selection;
      global.withGroup = undoMod.withGroup;
      global.beginPixelEdit = undoMod.beginPixelEdit;
      global.commitPixelEdit = undoMod.commitPixelEdit;
      global.withStructureUndo = undoMod.withStructureUndo;
      global.commitSelection = undoMod.commitSelection;
      global.undo = undoMod.undo;
      global.redo = undoMod.redo;
    }
  } catch (err) {
    try {
      const undoMod = require('./undo.js');
      if (typeof global !== 'undefined') {
        global.Undo = undoMod.Undo;
        global.Selection = undoMod.Selection;
        global.withGroup = undoMod.withGroup;
        global.beginPixelEdit = undoMod.beginPixelEdit;
        global.commitPixelEdit = undoMod.commitPixelEdit;
        global.withStructureUndo = undoMod.withStructureUndo;
        global.commitSelection = undoMod.commitSelection;
        global.undo = undoMod.undo;
        global.redo = undoMod.redo;
      }
    } catch (e) {}
  }
}

// -----------------------------------------------------------------------------
// CHÉP NGUYÊN VĂN THEO YÊU CẦU ĐỀ BÀI
// -----------------------------------------------------------------------------

function decontaminate(d, w, h) { // loại quầng sáng: pixel viền lấy màu trung bình của pixel đặc gần đó
  const c = new Uint8ClampedArray(d);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = (y * w + x) * 4, a = c[p + 3]; if (a === 0 || a >= 250) continue;
    let r = 0, g = 0, b = 0, n = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const q = (yy * w + xx) * 4; if (c[q + 3] >= 250) { r += c[q]; g += c[q + 1]; b += c[q + 2]; n++; } }
    if (n) { d[p] = r / n; d[p + 1] = g / n; d[p + 2] = b / n; }
  }
}

function cutToLayer(mask, copyOnly, doDecontam) {
  const src = getActiveLayer(); if (!src || src.locked) return null;
  const w = Project.width, h = Project.height;
  let any = false; for (let p = 0; p < mask.length; p++) if (mask[p] > 0) { any = true; break; }
  if (!any) return null;
  const sg = src.canvas.getContext('2d'), sd = sg.getImageData(0, 0, w, h), o = sd.data;
  const nd = new ImageData(w, h), n = nd.data;
  let bx0 = w, by0 = h, bx1 = -1, by1 = -1;
  for (let p = 0; p < w * h; p++) { const m = mask[p]; if (!m) continue; const i = p * 4;
    n[i] = o[i]; n[i+1] = o[i+1]; n[i+2] = o[i+2]; n[i+3] = Math.round(o[i+3] * m / 255);
    if (n[i+3] > 0) { const x = p % w, y = (p / w) | 0; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; } }
  if (doDecontam) decontaminate(n, w, h);
  let result = null;
  withGroup(copyOnly ? 'Sao chép thành lớp' : 'Cắt thành lớp', () => {
    if (!copyOnly) {
      const snap = beginPixelEdit(src);
      for (let p = 0; p < w * h; p++) { const m = mask[p]; if (m) o[p * 4 + 3] = Math.round(o[p * 4 + 3] * (1 - m / 255)); }
      sg.putImageData(sd, 0, 0); commitPixelEdit(snap, 'Xóa phần cắt');
    }
    const c = makeCanvas(w, h); c.getContext('2d').putImageData(nd, 0, 0);
    withStructureUndo('Thêm lớp cắt', () => {
      result = addLayer('Lớp cắt ' + Project.nextId, c, Project.layers.indexOf(src) + 1);
      if (bx1 >= 0) result.pivot = { x: (bx0 + bx1) / 2, y: (by0 + by1) / 2 };
      Project.activeId = result.id; });
  });
  return result;
}

// -----------------------------------------------------------------------------
// NỐI VÀO GIAO DIỆN & TIỆN ÍCH TƯƠNG TÁC
// -----------------------------------------------------------------------------

const CutSettings = {
  decontaminate: true // Mặc định bật "Loại viền sáng"
};

function notifyUser(msg) {
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
    console.warn(`[CutNotification] ${msg}`);
  }
}

function performCutOrCopy(copyOnly = false) {
  const src = typeof getActiveLayer === 'function' ? getActiveLayer() : null;
  if (!src) {
    notifyUser('Chưa chọn lớp');
    return null;
  }
  if (src.locked) {
    notifyUser('Lớp đang khóa');
    return null;
  }
  const mask = (typeof Selection !== 'undefined' && Selection.mask) ? Selection.mask : null;
  const w = (typeof Project !== 'undefined') ? Project.width : 0;
  const h = (typeof Project !== 'undefined') ? Project.height : 0;
  let any = false;
  if (mask && mask.length === w * h) {
    for (let p = 0; p < mask.length; p++) {
      if (mask[p] > 0) {
        any = true;
        break;
      }
    }
  }
  if (!any) {
    notifyUser('Hãy chọn vùng cần cắt');
    return null;
  }

  const doDecontam = CutSettings.decontaminate;
  const result = cutToLayer(mask, copyOnly, doDecontam);

  if (result) {
    const emptyMask = new Uint8ClampedArray(w * h);
    if (typeof commitSelection === 'function') {
      commitSelection(emptyMask, 'Bỏ chọn sau khi cắt');
    } else if (typeof Selection !== 'undefined') {
      Selection.mask = emptyMask;
    }
  }

  if (typeof updateSelectionOverlay === 'function') updateSelectionOverlay();
  if (typeof requestRedraw === 'function') requestRedraw();
  if (typeof renderLayersPanel === 'function') renderLayersPanel();

  return result;
}

// Bắt phím tắt Ctrl+J / Cmd+J
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.target.matches && e.target.matches('input, textarea, select')) return;
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    if (isCtrlOrMeta && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'j') {
      e.preventDefault();
      performCutOrCopy(false); // Cắt thành lớp mới (Ctrl+J)
    }
  });
}

// -----------------------------------------------------------------------------
// BÀI TEST BẮT BUỘC
// -----------------------------------------------------------------------------

function testCut() {
  const src = makeCanvas(4, 1); const g = src.getContext('2d'); g.fillStyle = '#f00'; g.fillRect(0, 0, 4, 1);
  initProject(src);
  const L = cutToLayer(new Uint8ClampedArray([255, 255, 0, 0]), false, false);
  const na = L.canvas.getContext('2d').getImageData(0, 0, 4, 1).data, sa = getLayer(1).canvas.getContext('2d').getImageData(0, 0, 4, 1).data;
  const ok1 = na[3] === 255 && na[7] === 255 && na[11] === 0 && sa[3] === 0 && sa[7] === 0 && sa[11] === 255 && Project.layers.length === 2;
  undo();
  const sb = getLayer(1).canvas.getContext('2d').getImageData(0, 0, 4, 1).data;
  const ok2 = Project.layers.length === 1 && sb[3] === 255 && sb[7] === 255;
  console.log(ok1 && ok2 ? 'PASS cut' : 'FAIL cut ' + [ok1, ok2]);
  return ok1 && ok2;
}

// Export cho Node.js và Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    decontaminate,
    cutToLayer,
    performCutOrCopy,
    CutSettings,
    notifyUser,
    testCut
  };
}

if (typeof window !== 'undefined') {
  window.decontaminate = decontaminate;
  window.cutToLayer = cutToLayer;
  window.performCutOrCopy = performCutOrCopy;
  window.CutSettings = CutSettings;
  window.notifyUser = notifyUser;
  window.testCut = testCut;
}
