/**
 * selection.js - Antigravity Theme Studio: Quản lý Vùng chọn & Công cụ Magic Wand / Cọ chọn / Lasso đa giác / Hậu xử lý & Hiển thị
 * BƯỚC 1.3a + 1.3b + 1.3c + 1.3d
 */

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

if (typeof Selection === 'undefined') {
  try {
    const undoMod = require('./undo.js');
    if (typeof global !== 'undefined') {
      global.Selection = undoMod.Selection;
      global.commitSelection = undoMod.commitSelection;
      global.pushUndoPatch = undoMod.pushUndoPatch;
    }
  } catch (err) {
    global.Selection = { mask: null, phase: 0 };
  }
}

if (typeof Project === 'undefined') {
  try {
    const layers = require('./layers.js');
    if (typeof global !== 'undefined') {
      global.Project = layers.Project;
      global.getActiveLayer = layers.getActiveLayer;
      global.getLayer = layers.getLayer;
    }
  } catch (err) {}
}

if (typeof screenToImage === 'undefined') {
  try {
    const vp = require('./viewport.js');
    if (typeof global !== 'undefined') {
      global.screenToImage = vp.screenToImage;
      global.requestRedraw = vp.requestRedraw;
      global.overlayDrawers = vp.overlayDrawers;
      global.viewCanvas = vp.viewCanvas;
      global.View = vp.View;
    }
  } catch (err) {}
}

// -----------------------------------------------------------------------------
// CHÉP NGUYÊN VĂN THEO YÊU CẦU ĐỀ BÀI (1.3a, 1.3b, 1.3c, 1.3d)
// -----------------------------------------------------------------------------

function newMask(w, h) { return new Uint8ClampedArray(w * h); }

function combineMask(base, add, mode) { // mode: 'replace' | 'add' | 'sub'
  if (mode === 'replace') return add.slice();
  const out = base.slice();
  for (let i = 0; i < out.length; i++) {
    if (mode === 'add') out[i] = Math.max(out[i], add[i]);
    else out[i] = Math.round(out[i] * (1 - add[i] / 255));
  }
  return out;
}

function magicWand(imgData, w, h, sx, sy, tol, contiguous) {
  const d = imgData.data, mask = new Uint8ClampedArray(w * h);
  const i0 = (sy * w + sx) * 4;
  const r0 = d[i0], g0 = d[i0+1], b0 = d[i0+2], a0 = d[i0+3];
  const t2 = Math.pow(tol / 100 * 510, 2);
  const match = (p) => { const i = p * 4;
    const dr = d[i]-r0, dg = d[i+1]-g0, db = d[i+2]-b0, da = d[i+3]-a0;
    return dr*dr + dg*dg + db*db + da*da <= t2; };
  if (!contiguous) { for (let p = 0; p < w*h; p++) if (match(p)) mask[p] = 255; return mask; }
  const stack = [sx, sy];
  while (stack.length) {
    const y = stack.pop(); let x = stack.pop();
    while (x >= 0 && !mask[y*w+x] && match(y*w+x)) x--;
    x++;
    let up = false, down = false;
    while (x < w && !mask[y*w+x] && match(y*w+x)) {
      mask[y*w+x] = 255;
      if (y > 0) { const ok = !mask[(y-1)*w+x] && match((y-1)*w+x);
        if (ok && !up) { stack.push(x, y-1); up = true; } else if (!ok) up = false; }
      if (y < h-1) { const ok = !mask[(y+1)*w+x] && match((y+1)*w+x);
        if (ok && !down) { stack.push(x, y+1); down = true; } else if (!ok) down = false; }
      x++;
    }
  }
  return mask;
}

function stampBrush(mask, w, h, cx, cy, radius, hardness, erase) {
  const r = Math.max(1, radius), x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dist = Math.hypot(x - cx, y - cy); if (dist > r) continue;
    const t = dist / r, soft = t <= hardness ? 1 : 1 - (t - hardness) / (1 - hardness + 1e-6);
    const v = Math.round(255 * Math.max(0, soft)), p = y * w + x;
    if (erase) mask[p] = Math.round(mask[p] * (1 - v / 255)); else mask[p] = Math.max(mask[p], v);
  }
}

function strokeBrush(mask, w, h, x0, y0, x1, y1, radius, hardness, erase) {
  const dist = Math.hypot(x1 - x0, y1 - y0), step = Math.max(1, radius * 0.25);
  const n = Math.max(1, Math.ceil(dist / step));
  for (let i = 0; i <= n; i++) stampBrush(mask, w, h, x0 + (x1-x0)*i/n, y0 + (y1-y0)*i/n, radius, hardness, erase);
}

function polygonToMask(points, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = '#fff';
  g.beginPath(); points.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
  g.closePath(); g.fill('evenodd');
  const d = g.getImageData(0, 0, w, h).data, m = new Uint8ClampedArray(w * h);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3];
  return m;
}

function boxBlurMask(mask, w, h, r) { // r >= 1, chạy 2 lượt để mềm hơn
  let src = mask.slice();
  for (let pass = 0; pass < 2; pass++) {
    const tmp = new Float32Array(w * h), out = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) { let sum = 0, cnt = 0;
      for (let x = -r; x <= r; x++) if (x >= 0 && x < w) { sum += src[y*w+x]; cnt++; }
      for (let x = 0; x < w; x++) { tmp[y*w+x] = sum / cnt;
        const rm = x - r, ad = x + r + 1;
        if (rm >= 0) { sum -= src[y*w+rm]; cnt--; } if (ad < w) { sum += src[y*w+ad]; cnt++; } } }
    for (let x = 0; x < w; x++) { let sum = 0, cnt = 0;
      for (let y = -r; y <= r; y++) if (y >= 0 && y < h) { sum += tmp[y*w+x]; cnt++; }
      for (let y = 0; y < h; y++) { out[y*w+x] = Math.round(sum / cnt);
        const rm = y - r, ad = y + r + 1;
        if (rm >= 0) { sum -= tmp[rm*w+x]; cnt--; } if (ad < h) { sum += tmp[ad*w+x]; cnt++; } } }
    src = out;
  }
  return src;
}

function morphMask(mask, w, h, r, grow) { // grow=true: mở rộng, false: thu hẹp (nhân vuông, tách 2 chiều)
  const f = grow ? Math.max : Math.min, init = grow ? 0 : 255;
  const tmp = new Uint8ClampedArray(w * h), out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = init;
    for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) v = f(v, mask[y*w+xx]); }
    tmp[y*w+x] = v; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = init;
    for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) v = f(v, tmp[yy*w+x]); }
    out[y*w+x] = v; }
  return out;
}

function invertMask(m) { const o = new Uint8ClampedArray(m.length); for (let i = 0; i < m.length; i++) o[i] = 255 - m[i]; return o; }

function drawSelectionOverlay(ctx, mask, w, h, phase) { // phase tăng dần theo thời gian cho viền chạy
  const img = ctx.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y*w+x, on = mask[p] >= 128; if (!on) continue; const i = p*4;
    const edge = x === 0 || y === 0 || x === w-1 || y === h-1 || mask[p-1] < 128 || mask[p+1] < 128 || mask[p-w] < 128 || mask[p+w] < 128;
    if (edge) { const black = ((x + y + phase) >> 2) & 1; d[i] = d[i+1] = d[i+2] = black ? 0 : 255; d[i+3] = 255; }
    else { d[i] = 0; d[i+1] = 200; d[i+2] = 255; d[i+3] = 50; }
  }
  ctx.putImageData(img, 0, 0);
}

// -----------------------------------------------------------------------------
// CẤU HÌNH VÀ BỘ NHỚ CÔNG CỤ VÙNG CHỌN
// -----------------------------------------------------------------------------

const SelectionSettings = {
  activeTool: 'wand',  // 'wand' | 'brush' | 'brush-erase' | 'lasso' | null
  tolerance: 20,       // Dung sai đũa thần (0-100, mặc định 20)
  contiguous: true,    // Liền kề (mặc định bật)
  brushSize: 20,       // Kích thước cọ 1-200 (mặc định 20)
  brushRadius: 10,     // Bán kính r = brushSize / 2
  brushHardness: 0.8,  // Độ cứng cọ 0.0-1.0 (mặc định 80%)
  cursorX: -1,         // Tọa độ ảnh của con trỏ
  cursorY: -1,
  cursorInside: false,
  lassoPoints: [],     // Mảng điểm đỉnh Lasso đa giác
  modifyRadius: 2,     // Bán kính làm mềm (1-20) / co giãn (1-10)
  showOverlay: true    // Hiện / ẩn lớp phủ
};

// Canvas phủ riêng cho hiệu ứng viền chạy (Marching Ants) & Cyan tint
let _selectionMarchingAntsCanvas = null;

function updateSelectionOverlay() {
  if (typeof document === 'undefined') return;
  if (!Project || !Project.width || !Project.height) return;
  if (!_selectionMarchingAntsCanvas) {
    _selectionMarchingAntsCanvas = document.createElement('canvas');
  }
  if (_selectionMarchingAntsCanvas.width !== Project.width || _selectionMarchingAntsCanvas.height !== Project.height) {
    _selectionMarchingAntsCanvas.width = Project.width;
    _selectionMarchingAntsCanvas.height = Project.height;
  }
  const sctx = _selectionMarchingAntsCanvas.getContext('2d');
  sctx.clearRect(0, 0, Project.width, Project.height);
  if (!Selection.mask || !SelectionSettings.showOverlay) return;

  drawSelectionOverlay(sctx, Selection.mask, Project.width, Project.height, Selection.phase || 0);
}

// Phase tăng dần mỗi ~100ms cho viền chạy marching ants
if (typeof setInterval !== 'undefined') {
  const _antsTimer = setInterval(() => {
    if (Selection && Selection.mask && SelectionSettings.showOverlay && Project && Project.width && Project.height) {
      Selection.phase = (Selection.phase + 1) % 10000;
      updateSelectionOverlay();
      if (typeof requestRedraw === 'function') requestRedraw();
    }
  }, 100);
  if (_antsTimer && typeof _antsTimer.unref === 'function') {
    _antsTimer.unref();
  }
}

// Đăng ký vẽ lớp phủ vùng chọn, cọ và lasso vào overlayDrawers của Viewport
if (typeof overlayDrawers !== 'undefined' && Array.isArray(overlayDrawers)) {
  overlayDrawers.push((ctx) => {
    // 1. Vẽ lớp phủ vùng chọn kiến bò (Marching ants & cyan tint)
    if (SelectionSettings.showOverlay && Selection.mask && Project.width && Project.height) {
      if (_selectionMarchingAntsCanvas) {
        ctx.drawImage(_selectionMarchingAntsCanvas, 0, 0);
      }
    }

    const zoom = (typeof View !== 'undefined' && View.zoom) ? View.zoom : 1;

    // 2. Hiện vòng tròn kích thước cọ theo con trỏ (tính theo zoom)
    if (SelectionSettings.cursorInside && (SelectionSettings.activeTool === 'brush' || SelectionSettings.activeTool === 'brush-erase')) {
      const cx = SelectionSettings.cursorX;
      const cy = SelectionSettings.cursorY;
      const r = SelectionSettings.brushRadius;
      if (cx >= 0 && cy >= 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.lineWidth = 1.2 / zoom;
        const isErase = SelectionSettings.activeTool === 'brush-erase';
        ctx.strokeStyle = isErase ? 'rgba(255, 110, 110, 0.95)' : 'rgba(125, 207, 255, 0.95)';
        ctx.stroke();

        if (SelectionSettings.brushHardness > 0 && SelectionSettings.brushHardness < 1) {
          ctx.beginPath();
          ctx.arc(cx, cy, r * SelectionSettings.brushHardness, 0, Math.PI * 2);
          ctx.lineWidth = 0.8 / zoom;
          ctx.setLineDash([3 / zoom, 3 / zoom]);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // 3. Hiện các đường nối Lasso đa giác + đường dẫn tới con trỏ
    if (SelectionSettings.activeTool === 'lasso' && SelectionSettings.lassoPoints.length > 0) {
      const pts = SelectionSettings.lassoPoints;
      ctx.save();
      ctx.beginPath();
      pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));

      if (SelectionSettings.cursorInside && SelectionSettings.cursorX >= 0 && SelectionSettings.cursorY >= 0) {
        ctx.lineTo(SelectionSettings.cursorX, SelectionSettings.cursorY);
      }

      ctx.lineWidth = 1.2 / zoom;
      ctx.strokeStyle = '#ff9e64';
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.stroke();

      ctx.setLineDash([]);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        ctx.beginPath();
        const isStart = i === 0 && pts.length >= 3;
        ctx.arc(p.x, p.y, (isStart ? 4.5 : 3) / zoom, 0, Math.PI * 2);
        ctx.fillStyle = isStart ? '#73daca' : '#ff9e64';
        ctx.fill();
        ctx.lineWidth = 1 / zoom;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
      ctx.restore();
    }
  });
}

// -----------------------------------------------------------------------------
// HÀNH ĐỘNG HẬU XỬ LÝ VÙNG CHỌN (BLUR, GROW, SHRINK, INVERT, DESELECT)
// -----------------------------------------------------------------------------

function blurSelection(radius) {
  if (!Selection.mask || !Project.width || !Project.height) return;
  const r = Math.max(1, Math.min(20, radius || SelectionSettings.modifyRadius));
  const newM = boxBlurMask(Selection.mask, Project.width, Project.height, r);
  if (typeof commitSelection === 'function') {
    commitSelection(newM, `Làm mềm vùng chọn (r=${r})`);
  } else {
    Selection.mask = newM;
  }
  updateSelectionOverlay();
  if (typeof requestRedraw === 'function') requestRedraw();
}

function growSelection(radius) {
  if (!Selection.mask || !Project.width || !Project.height) return;
  const r = Math.max(1, Math.min(10, radius || SelectionSettings.modifyRadius));
  const newM = morphMask(Selection.mask, Project.width, Project.height, r, true);
  if (typeof commitSelection === 'function') {
    commitSelection(newM, `Mở rộng vùng chọn (+${r}px)`);
  } else {
    Selection.mask = newM;
  }
  updateSelectionOverlay();
  if (typeof requestRedraw === 'function') requestRedraw();
}

function shrinkSelection(radius) {
  if (!Selection.mask || !Project.width || !Project.height) return;
  const r = Math.max(1, Math.min(10, radius || SelectionSettings.modifyRadius));
  const newM = morphMask(Selection.mask, Project.width, Project.height, r, false);
  if (typeof commitSelection === 'function') {
    commitSelection(newM, `Thu hẹp vùng chọn (-${r}px)`);
  } else {
    Selection.mask = newM;
  }
  updateSelectionOverlay();
  if (typeof requestRedraw === 'function') requestRedraw();
}

function invertSelection() {
  if (!Selection.mask || !Project.width || !Project.height) return;
  const newM = invertMask(Selection.mask);
  if (typeof commitSelection === 'function') {
    commitSelection(newM, 'Đảo vùng chọn');
  } else {
    Selection.mask = newM;
  }
  updateSelectionOverlay();
  if (typeof requestRedraw === 'function') requestRedraw();
}

function deselectAll() {
  if (!Project || !Project.width || !Project.height) return;
  const empty = newMask(Project.width, Project.height);
  if (typeof commitSelection === 'function') {
    commitSelection(empty, 'Bỏ chọn');
  } else {
    Selection.mask = empty;
  }
  updateSelectionOverlay();
  if (typeof requestRedraw === 'function') requestRedraw();
}

function toggleSelectionOverlay() {
  SelectionSettings.showOverlay = !SelectionSettings.showOverlay;
  updateSelectionOverlay();
  if (typeof requestRedraw === 'function') requestRedraw();
}

// -----------------------------------------------------------------------------
// XỬ LÝ SỰ KIỆN CHUỘT & BÀN PHÍM
// -----------------------------------------------------------------------------

let isDrawingStroke = false;
let strokeStartMask = null;
let lastStrokePoint = null;

function commitLassoSelection(e) {
  if (SelectionSettings.lassoPoints.length < 3) return;
  if (typeof Project === 'undefined' || !Project.width || !Project.height) return;

  const w = Project.width;
  const h = Project.height;
  const m = polygonToMask(SelectionSettings.lassoPoints, w, h);

  let mode = 'replace';
  if (e && e.shiftKey) mode = 'add';
  else if (e && e.altKey) mode = 'sub';

  const baseMask = Selection.mask && Selection.mask.length === w * h ? Selection.mask : newMask(w, h);
  const finalMask = combineMask(baseMask, m, mode);

  if (typeof commitSelection === 'function') {
    commitSelection(finalMask, `Lasso đa giác (${mode})`);
  } else {
    Selection.mask = finalMask;
  }

  SelectionSettings.lassoPoints = [];
  updateSelectionOverlay();
  if (typeof requestRedraw === 'function') requestRedraw();
}

function handleCanvasWandClick(e) {
  if (SelectionSettings.activeTool !== 'wand') return;
  if (e.button !== 0 || e.spaceKey) return;
  const targetCanvas = (typeof viewCanvas !== 'undefined' && viewCanvas) ? viewCanvas : e.currentTarget;
  if (!targetCanvas) return;
  if (typeof Project === 'undefined' || !Project.width || !Project.height) return;

  const L = typeof getActiveLayer === 'function' ? getActiveLayer() : (Project.layers && Project.layers[0]);
  if (!L || !L.canvas) return;

  const pt = typeof screenToImage === 'function' ? screenToImage(e.clientX, e.clientY) : { x: 0, y: 0 };
  const sx = Math.floor(pt.x);
  const sy = Math.floor(pt.y);

  if (sx < 0 || sx >= Project.width || sy < 0 || sy >= Project.height) return;

  const lctx = L.canvas.getContext('2d');
  const imgData = lctx.getImageData(0, 0, Project.width, Project.height);

  const wandMask = magicWand(
    imgData,
    Project.width,
    Project.height,
    sx,
    sy,
    SelectionSettings.tolerance,
    SelectionSettings.contiguous
  );

  let mode = 'replace';
  if (e.shiftKey) {
    mode = 'add';
  } else if (e.altKey) {
    mode = 'sub';
  }

  const baseMask = Selection.mask && Selection.mask.length === Project.width * Project.height
    ? Selection.mask
    : newMask(Project.width, Project.height);

  const finalMask = combineMask(baseMask, wandMask, mode);

  if (typeof commitSelection === 'function') {
    commitSelection(finalMask, `Cây đũa thần (${mode})`);
  } else {
    Selection.mask = finalMask;
  }

  updateSelectionOverlay();
  if (typeof requestRedraw === 'function') requestRedraw();
}

function handleCanvasLassoClick(e) {
  if (SelectionSettings.activeTool !== 'lasso') return;
  if (e.button !== 0 || e.spaceKey) return;
  if (typeof Project === 'undefined' || !Project.width || !Project.height) return;

  const pt = typeof screenToImage === 'function' ? screenToImage(e.clientX, e.clientY) : { x: 0, y: 0 };

  if (SelectionSettings.lassoPoints.length >= 3) {
    const p0 = SelectionSettings.lassoPoints[0];
    const zoom = (typeof View !== 'undefined' && View.zoom) ? View.zoom : 1;
    const dist = Math.hypot(pt.x - p0.x, pt.y - p0.y);
    if (dist <= 8 / zoom) {
      commitLassoSelection(e);
      return;
    }
  }

  SelectionSettings.lassoPoints.push({ x: pt.x, y: pt.y });
  if (typeof requestRedraw === 'function') requestRedraw();
}

function handleCanvasLassoDblClick(e) {
  if (SelectionSettings.activeTool !== 'lasso') return;
  e.preventDefault();
  if (SelectionSettings.lassoPoints.length >= 3) {
    commitLassoSelection(e);
  }
}

function handleBrushMouseDown(e) {
  const isBrush = SelectionSettings.activeTool === 'brush';
  const isBrushErase = SelectionSettings.activeTool === 'brush-erase';
  if (!isBrush && !isBrushErase) return;
  if (e.button !== 0 || e.spaceKey) return;
  if (typeof Project === 'undefined' || !Project.width || !Project.height) return;

  const pt = typeof screenToImage === 'function' ? screenToImage(e.clientX, e.clientY) : { x: 0, y: 0 };
  if (!Selection.mask || Selection.mask.length !== Project.width * Project.height) {
    Selection.mask = newMask(Project.width, Project.height);
  }

  strokeStartMask = Selection.mask.slice();
  isDrawingStroke = true;
  lastStrokePoint = { x: pt.x, y: pt.y };

  const erase = isBrushErase ? !e.altKey : e.altKey;

  stampBrush(
    Selection.mask,
    Project.width,
    Project.height,
    pt.x,
    pt.y,
    SelectionSettings.brushRadius,
    SelectionSettings.brushHardness,
    erase
  );

  updateSelectionOverlay();
  if (typeof requestRedraw === 'function') requestRedraw();
}

function handleMouseMove(e) {
  if (typeof screenToImage === 'function') {
    const pt = screenToImage(e.clientX, e.clientY);
    SelectionSettings.cursorX = pt.x;
    SelectionSettings.cursorY = pt.y;
    SelectionSettings.cursorInside = true;
  }

  const isBrush = SelectionSettings.activeTool === 'brush';
  const isBrushErase = SelectionSettings.activeTool === 'brush-erase';
  const isLasso = SelectionSettings.activeTool === 'lasso';

  if (isDrawingStroke && lastStrokePoint && (isBrush || isBrushErase)) {
    const pt = typeof screenToImage === 'function' ? screenToImage(e.clientX, e.clientY) : { x: 0, y: 0 };
    const erase = isBrushErase ? !e.altKey : e.altKey;

    strokeBrush(
      Selection.mask,
      Project.width,
      Project.height,
      lastStrokePoint.x,
      lastStrokePoint.y,
      pt.x,
      pt.y,
      SelectionSettings.brushRadius,
      SelectionSettings.brushHardness,
      erase
    );

    lastStrokePoint = { x: pt.x, y: pt.y };
    updateSelectionOverlay();
    if (typeof requestRedraw === 'function') requestRedraw();
  } else if (isBrush || isBrushErase || (isLasso && SelectionSettings.lassoPoints.length > 0)) {
    if (typeof requestRedraw === 'function') requestRedraw();
  }
}

function handleBrushMouseUp(e) {
  if (!isDrawingStroke) return;
  isDrawingStroke = false;
  lastStrokePoint = null;

  if (strokeStartMask && Selection.mask) {
    const before = strokeStartMask;
    const after = Selection.mask.slice();
    const erase = (SelectionSettings.activeTool === 'brush-erase') || (e && e.altKey);
    const label = erase ? 'Cọ bỏ chọn' : 'Cọ chọn';

    const pushFn = typeof pushUndoPatch === 'function' ? pushUndoPatch : (typeof window !== 'undefined' ? window.pushUndoPatch : null);
    if (pushFn) {
      pushFn({
        label,
        bytes: before.length + after.length,
        undo() {
          Selection.mask = before.slice();
          updateSelectionOverlay();
          if (typeof requestRedraw === 'function') requestRedraw();
        },
        redo() {
          Selection.mask = after.slice();
          updateSelectionOverlay();
          if (typeof requestRedraw === 'function') requestRedraw();
        }
      });
    }
    strokeStartMask = null;
  }
}

function handleMouseLeave() {
  SelectionSettings.cursorInside = false;
  if (typeof requestRedraw === 'function') requestRedraw();
}

// Bắt phím cho Lasso đa giác & Bỏ chọn (Ctrl+D)
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.target.matches && e.target.matches('input, textarea, select')) return;

    // Ctrl+D / Cmd+D: Bỏ chọn
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    if (isCtrlOrMeta && !e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      deselectAll();
      return;
    }

    // Lasso keys
    if (SelectionSettings.activeTool === 'lasso' && SelectionSettings.lassoPoints.length > 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (SelectionSettings.lassoPoints.length >= 3) {
          commitLassoSelection(e);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        SelectionSettings.lassoPoints = [];
        if (typeof requestRedraw === 'function') requestRedraw();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        SelectionSettings.lassoPoints.pop();
        if (typeof requestRedraw === 'function') requestRedraw();
      }
    }
  });
}

// -----------------------------------------------------------------------------
// GIAO DIỆN THANH CÔNG CỤ (TOOLBAR)
// -----------------------------------------------------------------------------

function ensureSelectionToolbarStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('selection-toolbar-styles')) return;
  const style = document.createElement('style');
  style.id = 'selection-toolbar-styles';
  style.textContent = `
    .selection-toolbar-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 8px;
    }
    .selection-toolbar-group {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      font-size: 11px;
      color: #c0caf5;
      user-select: none;
      flex-wrap: wrap;
    }
    .selection-tool-btn {
      background: rgba(125, 207, 255, 0.12);
      border: 1px solid rgba(125, 207, 255, 0.3);
      border-radius: 4px;
      color: #7dcfff;
      font-size: 11px;
      padding: 3px 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
    }
    .selection-tool-btn:hover {
      background: rgba(125, 207, 255, 0.25);
      border-color: #7dcfff;
      color: #ffffff;
    }
    .selection-tool-btn.active {
      background: #7dcfff;
      border-color: #7dcfff;
      color: #1a1b26;
      font-weight: 600;
      box-shadow: 0 0 8px rgba(125, 207, 255, 0.4);
    }
    .selection-tool-btn.erase-btn.active {
      background: #f7768e;
      border-color: #f7768e;
      color: #ffffff;
      box-shadow: 0 0 8px rgba(247, 118, 142, 0.4);
    }
    .selection-tool-btn.lasso-btn.active {
      background: #ff9e64;
      border-color: #ff9e64;
      color: #1a1b26;
      box-shadow: 0 0 8px rgba(255, 158, 100, 0.4);
    }
    .selection-opt-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    }
    .selection-opt-input {
      width: 44px;
      background: #1a1b26;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 3px;
      color: #fff;
      padding: 2px 4px;
      font-size: 11px;
      text-align: center;
      outline: none;
    }
    .selection-opt-slider {
      width: 75px;
      height: 3px;
      accent-color: #7dcfff;
      cursor: pointer;
    }
    .selection-opt-val {
      color: #7dcfff;
      font-weight: 500;
      min-width: 32px;
    }
    .selection-opt-checkbox {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }
    .selection-opt-checkbox input {
      accent-color: #7dcfff;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

function renderSelectionToolbar(container) {
  if (typeof document === 'undefined') return;
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;
  ensureSelectionToolbarStyles();

  el.innerHTML = `
    <div class="selection-toolbar-container">
      <!-- 1. Hàng công cụ tạo vùng chọn -->
      <div class="selection-toolbar-group">
        <button type="button" class="selection-tool-btn ${SelectionSettings.activeTool === 'wand' ? 'active' : ''}" id="btnToolWand" title="Đũa thần chọn vùng màu tương đồng (Shift: thêm, Alt: bớt)">
          🪄 Đũa thần
        </button>
        <button type="button" class="selection-tool-btn ${SelectionSettings.activeTool === 'brush' ? 'active' : ''}" id="btnToolBrush" title="Cọ chọn vùng (Tô để chọn, giữ Alt để bỏ chọn)">
          🖌️ Cọ chọn
        </button>
        <button type="button" class="selection-tool-btn erase-btn ${SelectionSettings.activeTool === 'brush-erase' ? 'active' : ''}" id="btnToolBrushErase" title="Cọ bỏ chọn vùng (Tô để xóa bớt vùng chọn)">
          🧹 Cọ bỏ chọn
        </button>
        <button type="button" class="selection-tool-btn lasso-btn ${SelectionSettings.activeTool === 'lasso' ? 'active' : ''}" id="btnToolLasso" title="Lasso đa giác (Nhấp từng điểm, nhấp đôi hoặc Enter để chốt >= 3 điểm, Esc hủy, Backspace lùi)">
          📐 Lasso đa giác
        </button>

        <!-- Tùy chọn cho Cọ chọn / Bỏ chọn -->
        <div class="selection-opt-item" id="brushOptSize" title="Kích thước cọ từ 1 đến 200px">
          <span>Kích thước:</span>
          <input type="range" id="sliderBrushSize" class="selection-opt-slider" min="1" max="200" value="${SelectionSettings.brushSize}" />
          <span class="selection-opt-val" id="valBrushSize">${SelectionSettings.brushSize}px</span>
        </div>
        <div class="selection-opt-item" id="brushOptHardness" title="Độ cứng của cọ từ 0 đến 100%">
          <span>Độ cứng:</span>
          <input type="range" id="sliderBrushHardness" class="selection-opt-slider" min="0" max="100" value="${Math.round(SelectionSettings.brushHardness * 100)}" />
          <span class="selection-opt-val" id="valBrushHardness">${Math.round(SelectionSettings.brushHardness * 100)}%</span>
        </div>

        <!-- Tùy chọn cho Đũa thần -->
        <div class="selection-opt-item" id="wandOptTol" title="Dung sai màu từ 0 đến 100">
          <span>Dung sai:</span>
          <input type="range" id="sliderWandTol" class="selection-opt-slider" min="0" max="100" value="${SelectionSettings.tolerance}" />
          <span class="selection-opt-val" id="valWandTol">${SelectionSettings.tolerance}</span>
        </div>
        <label class="selection-opt-checkbox" id="wandOptCont" title="Chỉ chọn vùng màu liên tục liền kề">
          <input type="checkbox" id="chkWandContiguous" ${SelectionSettings.contiguous ? 'checked' : ''} />
          <span>Liền kề</span>
        </label>
      </div>

      <!-- 2. Hàng nhóm nút "Chỉnh vùng chọn" (BƯỚC 1.3d) -->
      <div class="selection-toolbar-group">
        <span style="font-weight:600;color:#7dcfff;">Chỉnh vùng chọn:</span>
        <div class="selection-opt-item" title="Bán kính làm mềm (1-20) / co giãn (1-10)">
          <span>Bán kính:</span>
          <input type="number" id="inputModifyRadius" class="selection-opt-input" min="1" max="20" value="${SelectionSettings.modifyRadius}" />
        </div>
        <button type="button" class="selection-tool-btn" id="btnBlurMask" title="Làm mềm biên vùng chọn (Feather blur 2 lượt)">
          💧 Làm mềm
        </button>
        <button type="button" class="selection-tool-btn" id="btnGrowMask" title="Mở rộng vùng chọn ra ngoài">
          ➕ Mở rộng
        </button>
        <button type="button" class="selection-tool-btn" id="btnShrinkMask" title="Thu hẹp vùng chọn vào trong">
          ➖ Thu hẹp
        </button>
        <button type="button" class="selection-tool-btn" id="btnInvertMask" title="Đảo ngược vùng chọn">
          🔄 Đảo vùng
        </button>
        <button type="button" class="selection-tool-btn" id="btnDeselect" title="Bỏ chọn hoàn toàn (Phím tắt: Ctrl+D)">
          ✖️ Bỏ chọn
        </button>
        <button type="button" class="selection-tool-btn" id="btnToggleOverlay" title="Hiện hoặc ẩn lớp phủ và viền kiến bò">
          ${SelectionSettings.showOverlay ? '👁️ Lớp phủ: BẬT' : '🙈 Lớp phủ: TẮT'}
        </button>
      </div>

      <!-- 3. Hàng nhóm nút "Tách lớp" (BƯỚC 1.4: Cắt & Sao chép thành lớp) -->
      <div class="selection-toolbar-group" id="cutToolbarGroup">
        <span style="font-weight:600;color:#7dcfff;">Tách lớp:</span>
        <button type="button" class="selection-tool-btn" id="btnCutToLayer" title="Cắt vùng chọn thành lớp mới (Phím tắt: Ctrl+J)">
          ✂️ Cắt thành lớp mới
        </button>
        <button type="button" class="selection-tool-btn" id="btnCopyToLayer" title="Sao chép vùng chọn thành lớp mới">
          📋 Sao chép thành lớp mới
        </button>
        <label class="selection-opt-checkbox" id="lblDecontam" title="Loại quầng sáng: pixel viền lấy màu trung bình của pixel đặc gần đó">
          <input type="checkbox" id="chkDecontam" ${typeof CutSettings !== 'undefined' && CutSettings.decontaminate !== undefined ? (CutSettings.decontaminate ? 'checked' : '') : 'checked'} />
          <span>Loại viền sáng</span>
        </label>
      </div>
    </div>
  `;

  const btnWand = el.querySelector('#btnToolWand');
  const btnBrush = el.querySelector('#btnToolBrush');
  const btnBrushErase = el.querySelector('#btnToolBrushErase');
  const btnLasso = el.querySelector('#btnToolLasso');

  const updateToolButtons = () => {
    if (btnWand) btnWand.classList.toggle('active', SelectionSettings.activeTool === 'wand');
    if (btnBrush) btnBrush.classList.toggle('active', SelectionSettings.activeTool === 'brush');
    if (btnBrushErase) btnBrushErase.classList.toggle('active', SelectionSettings.activeTool === 'brush-erase');
    if (btnLasso) btnLasso.classList.toggle('active', SelectionSettings.activeTool === 'lasso');
    if (typeof requestRedraw === 'function') requestRedraw();
  };

  if (btnWand) {
    btnWand.onclick = () => {
      SelectionSettings.activeTool = SelectionSettings.activeTool === 'wand' ? null : 'wand';
      SelectionSettings.lassoPoints = [];
      updateToolButtons();
    };
  }

  if (btnBrush) {
    btnBrush.onclick = () => {
      SelectionSettings.activeTool = SelectionSettings.activeTool === 'brush' ? null : 'brush';
      SelectionSettings.lassoPoints = [];
      updateToolButtons();
    };
  }

  if (btnBrushErase) {
    btnBrushErase.onclick = () => {
      SelectionSettings.activeTool = SelectionSettings.activeTool === 'brush-erase' ? null : 'brush-erase';
      SelectionSettings.lassoPoints = [];
      updateToolButtons();
    };
  }

  if (btnLasso) {
    btnLasso.onclick = () => {
      SelectionSettings.activeTool = SelectionSettings.activeTool === 'lasso' ? null : 'lasso';
      SelectionSettings.lassoPoints = [];
      updateToolButtons();
    };
  }

  const sliderSize = el.querySelector('#sliderBrushSize');
  const valSize = el.querySelector('#valBrushSize');
  if (sliderSize && valSize) {
    sliderSize.oninput = (e) => {
      const sz = parseInt(e.target.value, 10);
      SelectionSettings.brushSize = sz;
      SelectionSettings.brushRadius = Math.max(1, sz / 2);
      valSize.textContent = sz + 'px';
      if (typeof requestRedraw === 'function') requestRedraw();
    };
  }

  const sliderHard = el.querySelector('#sliderBrushHardness');
  const valHard = el.querySelector('#valBrushHardness');
  if (sliderHard && valHard) {
    sliderHard.oninput = (e) => {
      const hd = parseInt(e.target.value, 10);
      SelectionSettings.brushHardness = hd / 100;
      valHard.textContent = hd + '%';
      if (typeof requestRedraw === 'function') requestRedraw();
    };
  }

  const sliderTol = el.querySelector('#sliderWandTol');
  const valTol = el.querySelector('#valWandTol');
  if (sliderTol && valTol) {
    sliderTol.oninput = (e) => {
      const tol = parseInt(e.target.value, 10);
      SelectionSettings.tolerance = tol;
      valTol.textContent = String(tol);
    };
  }

  const chkCont = el.querySelector('#chkWandContiguous');
  if (chkCont) {
    chkCont.onchange = (e) => {
      SelectionSettings.contiguous = e.target.checked;
    };
  }

  // Sự kiện nhóm "Chỉnh vùng chọn"
  const inputModR = el.querySelector('#inputModifyRadius');
  if (inputModR) {
    inputModR.onchange = (e) => {
      const r = parseInt(e.target.value, 10);
      SelectionSettings.modifyRadius = isNaN(r) ? 2 : Math.max(1, Math.min(20, r));
    };
  }

  const btnBlur = el.querySelector('#btnBlurMask');
  if (btnBlur) {
    btnBlur.onclick = () => {
      blurSelection(SelectionSettings.modifyRadius);
    };
  }

  const btnGrow = el.querySelector('#btnGrowMask');
  if (btnGrow) {
    btnGrow.onclick = () => {
      growSelection(SelectionSettings.modifyRadius);
    };
  }

  const btnShrink = el.querySelector('#btnShrinkMask');
  if (btnShrink) {
    btnShrink.onclick = () => {
      shrinkSelection(SelectionSettings.modifyRadius);
    };
  }

  const btnInvert = el.querySelector('#btnInvertMask');
  if (btnInvert) {
    btnInvert.onclick = () => {
      invertSelection();
    };
  }

  const btnDesel = el.querySelector('#btnDeselect');
  if (btnDesel) {
    btnDesel.onclick = () => {
      deselectAll();
    };
  }

  const btnToggleOv = el.querySelector('#btnToggleOverlay');
  if (btnToggleOv) {
    btnToggleOv.onclick = () => {
      toggleSelectionOverlay();
      btnToggleOv.textContent = SelectionSettings.showOverlay ? '👁️ Lớp phủ: BẬT' : '🙈 Lớp phủ: TẮT';
    };
  }

  // Sự kiện nhóm "Tách lớp" (BƯỚC 1.4: Cắt & Sao chép thành lớp)
  const btnCut = el.querySelector('#btnCutToLayer');
  if (btnCut) {
    btnCut.onclick = () => {
      if (typeof performCutOrCopy === 'function') performCutOrCopy(false);
      else if (typeof window !== 'undefined' && typeof window.performCutOrCopy === 'function') window.performCutOrCopy(false);
    };
  }

  const btnCopy = el.querySelector('#btnCopyToLayer');
  if (btnCopy) {
    btnCopy.onclick = () => {
      if (typeof performCutOrCopy === 'function') performCutOrCopy(true);
      else if (typeof window !== 'undefined' && typeof window.performCutOrCopy === 'function') window.performCutOrCopy(true);
    };
  }

  const chkDec = el.querySelector('#chkDecontam');
  if (chkDec) {
    chkDec.onchange = (e) => {
      if (typeof CutSettings !== 'undefined') CutSettings.decontaminate = e.target.checked;
      else if (typeof window !== 'undefined' && window.CutSettings) window.CutSettings.decontaminate = e.target.checked;
    };
  }
}

// Gắn toàn bộ sự kiện click, mousedown, mousemove, dblclick cho canvas
function attachSelectionListeners(canvas) {
  const c = canvas || (typeof viewCanvas !== 'undefined' ? viewCanvas : null);
  if (!c) return;

  c.removeEventListener('click', handleCanvasWandClick);
  c.removeEventListener('click', handleCanvasLassoClick);
  c.removeEventListener('dblclick', handleCanvasLassoDblClick);
  c.removeEventListener('mousedown', handleBrushMouseDown);
  c.removeEventListener('mousemove', handleMouseMove);
  c.removeEventListener('mouseleave', handleMouseLeave);

  c.addEventListener('click', handleCanvasWandClick);
  c.addEventListener('click', handleCanvasLassoClick);
  c.addEventListener('dblclick', handleCanvasLassoDblClick);
  c.addEventListener('mousedown', handleBrushMouseDown);
  c.addEventListener('mousemove', handleMouseMove);
  c.addEventListener('mouseleave', handleMouseLeave);

  if (typeof window !== 'undefined') {
    window.removeEventListener('mouseup', handleBrushMouseUp);
    window.addEventListener('mouseup', handleBrushMouseUp);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    if (typeof viewCanvas !== 'undefined' && viewCanvas) {
      attachSelectionListeners(viewCanvas);
    }
  });
}

// -----------------------------------------------------------------------------
// BÀI TEST BẮT BUỘC
// -----------------------------------------------------------------------------

function testMorph() {
  const w = 20, h = 20, m = newMask(w, h);
  for (let y = 8; y < 12; y++) for (let x = 8; x < 12; x++) m[y*w+x] = 255;
  const g = morphMask(m, w, h, 2, true), s = morphMask(m, w, h, 1, false);
  const b = boxBlurMask(m, w, h, 2);
  const cnt = a => a.reduce((t, v) => t + (v >= 128 ? 1 : 0), 0);
  console.log(cnt(g) === 64 && cnt(s) === 4 && b[10*w+10] > 0 && b[10*w+10] < 255 ? 'PASS morph' : 'FAIL morph ' + cnt(g) + ',' + cnt(s) + ',' + b[10*w+10]);
  return cnt(g) === 64 && cnt(s) === 4 && b[10*w+10] > 0 && b[10*w+10] < 255;
}

function testLasso() {
  const m = polygonToMask([{x:2,y:2},{x:18,y:2},{x:18,y:18},{x:2,y:18}], 20, 20);
  console.log(m[10*20+10] === 255 && m[0] === 0 ? 'PASS lasso' : 'FAIL lasso');
  return m[10*20+10] === 255 && m[0] === 0;
}

function testBrush() {
  const w = 40, h = 40, m = newMask(w, h);
  strokeBrush(m, w, h, 5, 20, 35, 20, 3, 1, false);
  const filled = m[20*w+5] === 255 && m[20*w+20] === 255 && m[20*w+35] === 255;
  strokeBrush(m, w, h, 20, 20, 20, 20, 3, 1, true);
  console.log(filled && m[20*w+20] === 0 ? 'PASS brush' : 'FAIL brush');
  return filled && m[20*w+20] === 0;
}

function testWand() {
  const w = 10, h = 10, img = new ImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y*w+x)*4, left = x < 5;
    img.data[i] = left ? 255 : 0; img.data[i+1] = 0; img.data[i+2] = left ? 0 : 255; img.data[i+3] = 255; }
  const m = magicWand(img, w, h, 1, 1, 10, true);
  const n = m.reduce((s, v) => s + (v === 255 ? 1 : 0), 0);
  console.log(n === 50 ? 'PASS wand' : 'FAIL wand, count=' + n);
  return n === 50;
}

// Export cho Node.js và Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    newMask,
    combineMask,
    magicWand,
    stampBrush,
    strokeBrush,
    polygonToMask,
    boxBlurMask,
    morphMask,
    invertMask,
    drawSelectionOverlay,
    SelectionSettings,
    blurSelection,
    growSelection,
    shrinkSelection,
    invertSelection,
    deselectAll,
    toggleSelectionOverlay,
    updateSelectionOverlay,
    renderSelectionToolbar,
    attachSelectionListeners,
    testWand,
    testBrush,
    testLasso,
    testMorph
  };
}

if (typeof window !== 'undefined') {
  window.newMask = newMask;
  window.combineMask = combineMask;
  window.magicWand = magicWand;
  window.stampBrush = stampBrush;
  window.strokeBrush = strokeBrush;
  window.polygonToMask = polygonToMask;
  window.boxBlurMask = boxBlurMask;
  window.morphMask = morphMask;
  window.invertMask = invertMask;
  window.drawSelectionOverlay = drawSelectionOverlay;
  window.SelectionSettings = SelectionSettings;
  window.blurSelection = blurSelection;
  window.growSelection = growSelection;
  window.shrinkSelection = shrinkSelection;
  window.invertSelection = invertSelection;
  window.deselectAll = deselectAll;
  window.toggleSelectionOverlay = toggleSelectionOverlay;
  window.updateSelectionOverlay = updateSelectionOverlay;
  window.renderSelectionToolbar = renderSelectionToolbar;
  window.attachSelectionListeners = attachSelectionListeners;
  window.testWand = testWand;
  window.testBrush = testBrush;
  window.testLasso = testLasso;
  window.testMorph = testMorph;
}
