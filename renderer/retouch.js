/**
 * retouch.js - Antigravity Theme Studio: Công cụ Tu sửa & Cọ nhân bản (Clone Stamp Tool)
 * BƯỚC 1.5a: Cọ nhân bản chỉ ghi vào lớp đang chọn, đọc pixel từ bản chụp snapshot, không lặp lại chính nó
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

// Tương thích Node.js cho Project & Layers
if (typeof Project === 'undefined') {
  try {
    const layers = require('./layers.js');
    if (typeof global !== 'undefined') {
      global.Project = layers.Project;
      global.getActiveLayer = layers.getActiveLayer;
      global.getLayer = layers.getLayer;
    }
  } catch (err) {
    try {
      const layers = require('./renderer/layers.js');
      if (typeof global !== 'undefined') {
        global.Project = layers.Project;
        global.getActiveLayer = layers.getActiveLayer;
        global.getLayer = layers.getLayer;
      }
    } catch (e) {}
  }
}

// Tương thích Node.js cho Undo
if (typeof beginPixelEdit === 'undefined') {
  try {
    const undoMod = require('./undo.js');
    if (typeof global !== 'undefined') {
      global.beginPixelEdit = undoMod.beginPixelEdit;
      global.commitPixelEdit = undoMod.commitPixelEdit;
      global.pushUndoPatch = undoMod.pushUndoPatch;
      global.commitSelection = undoMod.commitSelection;
      global.Selection = undoMod.Selection;
    }
  } catch (err) {
    try {
      const undoMod = require('./renderer/undo.js');
      if (typeof global !== 'undefined') {
        global.beginPixelEdit = undoMod.beginPixelEdit;
        global.commitPixelEdit = undoMod.commitPixelEdit;
        global.pushUndoPatch = undoMod.pushUndoPatch;
        global.commitSelection = undoMod.commitSelection;
        global.Selection = undoMod.Selection;
      }
    } catch (e) {}
  }
}

// Tương thích Viewport
if (typeof screenToImage === 'undefined') {
  try {
    const vp = require('./viewport.js');
    if (typeof global !== 'undefined') {
      global.screenToImage = vp.screenToImage;
      global.requestRedraw = vp.requestRedraw;
      global.overlayDrawers = vp.overlayDrawers;
      global.View = vp.View;
      global.viewCanvas = vp.viewCanvas;
    }
  } catch (err) {
    try {
      const vp = require('./renderer/viewport.js');
      if (typeof global !== 'undefined') {
        global.screenToImage = vp.screenToImage;
        global.requestRedraw = vp.requestRedraw;
        global.overlayDrawers = vp.overlayDrawers;
        global.View = vp.View;
        global.viewCanvas = vp.viewCanvas;
      }
    } catch (e) {
      global.screenToImage = (x, y) => ({ x, y });
      global.requestRedraw = () => {};
    }
  }
}

// -----------------------------------------------------------------------------
// CHÉP NGUYÊN VĂN THEO YÊU CẦU ĐỀ BÀI
// -----------------------------------------------------------------------------

function cloneDab(dstData, srcSnap, w, h, cx, cy, ox, oy, radius, hardness, opacity) {
  // (ox,oy) = độ lệch cố định: pixel nguồn = (x+ox, y+oy)
  const r = Math.max(1, radius);
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dist = Math.hypot(x - cx, y - cy); if (dist > r) continue;
    const sx = Math.round(x + ox), sy = Math.round(y + oy); if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
    const t = dist / r, soft = t <= hardness ? 1 : 1 - (t - hardness) / (1 - hardness + 1e-6);
    const a = Math.max(0, soft) * opacity, di = (y*w+x)*4, si = (sy*w+sx)*4;
    const sa = srcSnap[si+3] / 255, da = dstData[di+3] / 255, ka = a * sa, oa = ka + da * (1 - ka);
    if (oa <= 0) continue;
    for (let c = 0; c < 3; c++) dstData[di+c] = Math.round((srcSnap[si+c] * ka + dstData[di+c] * da * (1 - ka)) / oa);
    dstData[di+3] = Math.round(oa * 255);
  }
}

function fillHole(data, w, h, hole) { // hole: Uint8ClampedArray mask, >=128 là lỗ cần lấp. Sửa trực tiếp data (RGBA).
  const isHole = new Uint8Array(w*h), known = new Uint8Array(w*h);
  let holeCount = 0;
  for (let p = 0; p < w*h; p++) { if (hole[p] >= 128) { isHole[p] = 1; holeCount++; } else known[p] = 1; }
  if (!holeCount || holeCount === w*h) return false;
  const holeList = [];
  const nb8 = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  // (1) bóc dần
  let remaining = holeCount;
  while (remaining > 0) {
    const newly = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = y*w+x; if (!isHole[p] || known[p]) continue;
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (const [dx, dy] of nb8) { const xx = x+dx, yy = y+dy; if (xx<0||yy<0||xx>=w||yy>=h) continue;
        const q = yy*w+xx; if (!known[q]) continue; const i = q*4; r += data[i]; g += data[i+1]; b += data[i+2]; a += data[i+3]; n++; }
      if (n) newly.push([p, r/n, g/n, b/n, a/n]); }
    if (!newly.length) break;
    for (const [p, r, g, b, a] of newly) { const i = p*4; data[i]=r; data[i+1]=g; data[i+2]=b; data[i+3]=a; known[p]=1; holeList.push(p); remaining--; }
  }
  // (2) Laplace
  for (let it = 0; it < 80; it++) for (const p of holeList) { const x = p % w, y = (p / w) | 0, i = p*4;
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (const [dx, dy] of [[0,-1],[-1,0],[1,0],[0,1]]) { const xx = x+dx, yy = y+dy; if (xx<0||yy<0||xx>=w||yy>=h) continue;
      const j = (yy*w+xx)*4; r += data[j]; g += data[j+1]; b += data[j+2]; a += data[j+3]; n++; }
    if (n) { data[i]=r/n; data[i+1]=g/n; data[i+2]=b/n; data[i+3]=a/n; } }
  // (3) nhiễu hạt: ước lượng độ lệch chuẩn từ pixel đã biết sát viền lỗ (cách <=6px)
  let s = 0, c = 0;
  for (let y = 1; y < h-1; y += 2) for (let x = 1; x < w-1; x += 2) { const p = y*w+x; if (isHole[p]) continue;
    let near = false; for (let k = -6; k <= 6 && !near; k += 3) for (let l = -6; l <= 6; l += 3) { const xx = x+k, yy = y+l;
      if (xx>=0&&yy>=0&&xx<w&&yy<h&&isHole[yy*w+xx]) { near = true; break; } }
    if (!near) continue; const i = p*4, lum = data[i]*0.3 + data[i+1]*0.59 + data[i+2]*0.11;
    const lm = (data[i-4]*0.3+data[i-3]*0.59+data[i-2]*0.11 + data[i+4]*0.3+data[i+5]*0.59+data[i+6]*0.11) / 2;
    s += (lum - lm) * (lum - lm); c++; }
  const sigma = c ? Math.min(12, Math.sqrt(s / c)) : 0;
  const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.73;
  for (const p of holeList) { const i = p*4, n = gauss() * sigma;
    for (let k = 0; k < 3; k++) data[i+k] = Math.max(0, Math.min(255, data[i+k] + n)); }
  return true;
}

function revealMap(layerAlpha, baseAlpha, w, h, dist) {
  // layerAlpha: alpha lớp sẽ chuyển động (Uint8 mỗi pixel), baseAlpha: alpha lớp nền phía sau. Trả về mask pixel bị lộ.
  const out = new Uint8ClampedArray(w * h);
  for (const [dx, dy] of [[dist,0],[-dist,0],[0,dist],[0,-dist]]) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = y*w+x;
      if (layerAlpha[p] < 128 || baseAlpha[p] >= 128) continue;
      const sx = x - dx, sy = y - dy; // pixel này có còn được lớp (đã dịch) che không?
      const covered = sx >= 0 && sy >= 0 && sx < w && sy < h && layerAlpha[sy*w+sx] >= 128;
      if (!covered) out[p] = 255; }
  }
  return out;
}

// -----------------------------------------------------------------------------
// NỐI VÀO GIAO DIỆN & TƯƠNG TÁC NÉT VẼ
// -----------------------------------------------------------------------------

const RetouchSettings = {
  activeTool: null,        // 'clone' | null
  cloneRadius: 15,         // Bán kính cọ nhân bản (px)
  cloneHardness: 0.8,      // Độ cứng 0..1
  cloneOpacity: 1.0,       // Độ trong suốt 0..1
  sourcePoint: null,       // { x, y } Tọa độ ảnh của điểm nguồn Alt+nhấp
  currentOffset: null,     // { ox, oy } Độ lệch giữa nguồn và đích
  cursorX: 0,
  cursorY: 0,
  cursorInside: false,
  isCloning: false,
  lastStrokePoint: null,
  shiftDist: 10,           // Khoảng cách dịch thử (px)
  revealMask: null,        // Uint8ClampedArray(w*h) mask các pixel lộ
  showRevealOverlay: true, // Hiển thị lớp phủ tô đỏ vùng lộ
  _revealCanvas: null
};

let _activeSnap = null;
let _activeSrcSnap = null;
let _activeImgData = null;

function cloneStroke(dstData, srcSnap, w, h, x0, y0, x1, y1, ox, oy, radius, hardness, opacity) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const step = Math.max(1, radius * 0.25);
  const n = Math.max(1, Math.ceil(dist / step));
  for (let i = 0; i <= n; i++) {
    const cx = x0 + (x1 - x0) * i / n;
    const cy = y0 + (y1 - y0) * i / n;
    cloneDab(dstData, srcSnap, w, h, cx, cy, ox, oy, radius, hardness, opacity);
  }
}

function notifyRetouchUser(msg) {
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
    console.warn(`[Retouch] ${msg}`);
  }
}

function notifyRetouchStatus(msg) {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(msg);
  }
  const statusEl = (typeof document !== 'undefined' && typeof document.querySelector === 'function')
    ? (document.getElementById('statusMessage') || document.querySelector('.status-bar'))
    : null;
  if (statusEl) {
    statusEl.textContent = msg;
  }
}

// Vẽ lớp phủ cọ nhân bản (vòng tròn nét vẽ + chữ thập nguồn di chuyển theo)
function drawCloneOverlay(ctx) {
  if (RetouchSettings.activeTool !== 'clone') return;
  const zoom = (typeof View !== 'undefined' && View.zoom) ? View.zoom : 1;

  if (RetouchSettings.cursorInside) {
    const cx = RetouchSettings.cursorX;
    const cy = RetouchSettings.cursorY;
    const r = RetouchSettings.cloneRadius;

    ctx.save();

    // 1. Vòng tròn cọ tại con trỏ chuột
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 2.5 / zoom;
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2 / zoom;
    ctx.stroke();

    // 2. Chữ thập điểm nguồn
    let sx = null, sy = null;
    if (RetouchSettings.isCloning && RetouchSettings.currentOffset) {
      sx = cx + RetouchSettings.currentOffset.ox;
      sy = cy + RetouchSettings.currentOffset.oy;
    } else if (RetouchSettings.sourcePoint) {
      sx = RetouchSettings.sourcePoint.x;
      sy = RetouchSettings.sourcePoint.y;
    }

    if (sx != null && sy != null) {
      const arm = 7 / zoom;
      ctx.beginPath();
      ctx.moveTo(sx - arm, sy);
      ctx.lineTo(sx + arm, sy);
      ctx.moveTo(sx, sy - arm);
      ctx.lineTo(sx, sy + arm);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5 / zoom;
      ctx.stroke();

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.2 / zoom;
      ctx.stroke();

      // Nếu đang vẽ: vẽ đường nối mờ giữa con trỏ và điểm nguồn
      if (RetouchSettings.isCloning) {
        ctx.beginPath();
        ctx.setLineDash([4 / zoom, 4 / zoom]);
        ctx.moveTo(cx, cy);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
  }
}

// Lớp phủ tổng hợp công cụ Tu sửa (BƯỚC 1.5a & 1.5c)
function drawRetouchOverlay(ctx) {
  // 1. Tô đỏ bán trong suốt các pixel lộ (BƯỚC 1.5c)
  if (RetouchSettings.revealMask && RetouchSettings.showRevealOverlay && typeof Project !== 'undefined' && Project.width && Project.height) {
    const mask = RetouchSettings.revealMask;
    const w = Project.width, h = Project.height;
    if (!RetouchSettings._revealCanvas || RetouchSettings._revealCanvas.width !== w || RetouchSettings._revealCanvas.height !== h) {
      RetouchSettings._revealCanvas = (typeof document !== 'undefined' && document.createElement) ? document.createElement('canvas') : null;
      if (RetouchSettings._revealCanvas) {
        RetouchSettings._revealCanvas.width = w;
        RetouchSettings._revealCanvas.height = h;
      }
    }
    if (RetouchSettings._revealCanvas) {
      const rc = RetouchSettings._revealCanvas.getContext('2d');
      const imgData = rc.createImageData(w, h);
      const d = imgData.data;
      for (let p = 0; p < w * h; p++) {
        if (mask[p] >= 128) {
          const i = p * 4;
          d[i] = 255;     // Màu đỏ
          d[i + 1] = 40;
          d[i + 2] = 40;
          d[i + 3] = 120; // Bán trong suốt
        }
      }
      rc.putImageData(imgData, 0, 0);
      ctx.drawImage(RetouchSettings._revealCanvas, 0, 0);
    }
  }

  // 2. Vẽ cọ nhân bản
  drawCloneOverlay(ctx);
}

// Đăng ký overlay vào danh sách overlayDrawers của Viewport
if (typeof overlayDrawers !== 'undefined' && Array.isArray(overlayDrawers)) {
  overlayDrawers.push((ctx) => {
    drawRetouchOverlay(ctx);
  });
}

function handleCloneMouseDown(e) {
  if (RetouchSettings.activeTool !== 'clone') return;
  if (e.button !== 0 || e.spaceKey) return;
  if (typeof Project === 'undefined' || !Project.width || !Project.height) return;

  const pt = typeof screenToImage === 'function' ? screenToImage(e.clientX, e.clientY) : { x: 0, y: 0 };

  // Alt + Nhấp: Chọn điểm nguồn
  if (e.altKey) {
    RetouchSettings.sourcePoint = { x: Math.round(pt.x), y: Math.round(pt.y) };
    if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
      window.showToast(`Đã chọn điểm nguồn: (${RetouchSettings.sourcePoint.x}, ${RetouchSettings.sourcePoint.y})`);
    }
    if (typeof requestRedraw === 'function') requestRedraw();
    return;
  }

  // Chưa có điểm nguồn: Báo thông báo tiếng Việt
  if (!RetouchSettings.sourcePoint) {
    notifyRetouchUser('Alt+nhấp để chọn điểm nguồn');
    return;
  }

  const L = typeof getActiveLayer === 'function' ? getActiveLayer() : null;
  if (!L) {
    notifyRetouchUser('Chưa chọn lớp');
    return;
  }
  if (L.locked) {
    notifyRetouchUser('Lớp đang khóa');
    return;
  }

  const w = Project.width, h = Project.height;
  const lctx = L.canvas.getContext('2d');

  // Tính độ lệch cố định ox, oy
  const ox = RetouchSettings.sourcePoint.x - pt.x;
  const oy = RetouchSettings.sourcePoint.y - pt.y;
  RetouchSettings.currentOffset = { ox, oy };
  RetouchSettings.lastStrokePoint = { x: pt.x, y: pt.y };
  RetouchSettings.isCloning = true;

  // BẢN CHỤP bất biến của lớp lúc bắt đầu nét vẽ (để không bị lặp lại chính nó)
  _activeImgData = lctx.getImageData(0, 0, w, h);
  _activeSrcSnap = new Uint8ClampedArray(_activeImgData.data);
  _activeSnap = typeof beginPixelEdit === 'function' ? beginPixelEdit(L) : null;

  // Điểm dab đầu tiên
  cloneDab(
    _activeImgData.data,
    _activeSrcSnap,
    w,
    h,
    pt.x,
    pt.y,
    ox,
    oy,
    RetouchSettings.cloneRadius,
    RetouchSettings.cloneHardness,
    RetouchSettings.cloneOpacity
  );

  lctx.putImageData(_activeImgData, 0, 0);
  if (typeof requestRedraw === 'function') requestRedraw();
}

function handleCloneMouseMove(e) {
  if (typeof screenToImage === 'function') {
    const pt = screenToImage(e.clientX, e.clientY);
    RetouchSettings.cursorX = pt.x;
    RetouchSettings.cursorY = pt.y;
    RetouchSettings.cursorInside = true;
  }

  if (RetouchSettings.isCloning && RetouchSettings.lastStrokePoint && _activeImgData && _activeSrcSnap) {
    const pt = typeof screenToImage === 'function' ? screenToImage(e.clientX, e.clientY) : { x: 0, y: 0 };
    const L = typeof getActiveLayer === 'function' ? getActiveLayer() : null;
    if (!L) return;

    cloneStroke(
      _activeImgData.data,
      _activeSrcSnap,
      Project.width,
      Project.height,
      RetouchSettings.lastStrokePoint.x,
      RetouchSettings.lastStrokePoint.y,
      pt.x,
      pt.y,
      RetouchSettings.currentOffset.ox,
      RetouchSettings.currentOffset.oy,
      RetouchSettings.cloneRadius,
      RetouchSettings.cloneHardness,
      RetouchSettings.cloneOpacity
    );

    RetouchSettings.lastStrokePoint = { x: pt.x, y: pt.y };
    L.canvas.getContext('2d').putImageData(_activeImgData, 0, 0);
  }

  if (RetouchSettings.activeTool === 'clone') {
    if (typeof requestRedraw === 'function') requestRedraw();
  }
}

function handleCloneMouseUp(e) {
  if (!RetouchSettings.isCloning) return;
  RetouchSettings.isCloning = false;
  RetouchSettings.lastStrokePoint = null;
  RetouchSettings.currentOffset = null;

  if (_activeSnap && typeof commitPixelEdit === 'function') {
    commitPixelEdit(_activeSnap, 'Cọ nhân bản');
  }

  _activeSnap = null;
  _activeSrcSnap = null;
  _activeImgData = null;

  if (typeof requestRedraw === 'function') requestRedraw();
}

function handleCloneMouseLeave() {
  RetouchSettings.cursorInside = false;
  if (typeof requestRedraw === 'function') requestRedraw();
}

function attachRetouchListeners(canvas) {
  const c = canvas || (typeof viewCanvas !== 'undefined' ? viewCanvas : null);
  if (!c) return;

  c.removeEventListener('mousedown', handleCloneMouseDown);
  c.removeEventListener('mousemove', handleCloneMouseMove);
  c.removeEventListener('mouseleave', handleCloneMouseLeave);

  c.addEventListener('mousedown', handleCloneMouseDown);
  c.addEventListener('mousemove', handleCloneMouseMove);
  c.addEventListener('mouseleave', handleCloneMouseLeave);

  if (typeof window !== 'undefined') {
    window.removeEventListener('mouseup', handleCloneMouseUp);
    window.addEventListener('mouseup', handleCloneMouseUp);
  }
}

// -----------------------------------------------------------------------------
// BƯỚC 1.5b: LẤP VÙNG TRỐNG THEO VÙNG CHỌN
// -----------------------------------------------------------------------------

function fillSelectionHole() {
  const L = typeof getActiveLayer === 'function' ? getActiveLayer() : null;
  if (!L) {
    notifyRetouchUser('Chưa chọn lớp');
    return false;
  }
  if (L.locked) {
    notifyRetouchUser('Lớp đang khóa');
    return false;
  }

  const mask = (typeof Selection !== 'undefined' && Selection.mask) ? Selection.mask : null;
  if (!mask) {
    notifyRetouchUser('Hãy chọn vùng cần lấp');
    return false;
  }

  const w = Project.width, h = Project.height;
  let minX = w, minY = h, maxX = -1, maxY = -1, holeCount = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (mask[p] >= 128) {
        holeCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!holeCount || maxX < 0) {
    notifyRetouchUser('Hãy chọn vùng cần lấp');
    return false;
  }

  // Bounding box của vùng chọn mở rộng 2px
  const x0 = Math.max(0, minX - 2);
  const y0 = Math.max(0, minY - 2);
  const x1 = Math.min(w - 1, maxX + 2);
  const y1 = Math.min(h - 1, maxY + 2);
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;

  const lctx = L.canvas.getContext('2d');
  // Trích xuất crop trước khi sửa để lưu undo patch
  const cropBefore = lctx.getImageData(x0, y0, bw, bh);
  const beforeBytes = new Uint8ClampedArray(cropBefore.data);
  const layerId = L.id;

  // Trong lúc chạy hiện "Đang lấp..."
  notifyRetouchStatus('Đang lấp...');

  const executeFill = () => {
    const fullImgData = lctx.getImageData(0, 0, w, h);
    const success = fillHole(fullImgData.data, w, h, mask);
    if (!success) {
      notifyRetouchStatus('Không thể lấp vùng chọn');
      return false;
    }

    lctx.putImageData(fullImgData, 0, 0);

    const cropAfter = lctx.getImageData(x0, y0, bw, bh);
    const afterBytes = new Uint8ClampedArray(cropAfter.data);

    // Lưu patch undo của bounding box vùng chọn mở rộng 2px
    if (typeof pushUndoPatch === 'function') {
      pushUndoPatch({
        label: 'Lấp vùng chọn',
        bytes: beforeBytes.length * 2,
        undo() {
          const lyr = typeof getLayer === 'function' ? getLayer(layerId) : null;
          if (lyr) {
            const ctx = lyr.canvas.getContext('2d');
            const img = ctx.createImageData(bw, bh);
            img.data.set(beforeBytes);
            ctx.putImageData(img, x0, y0);
            if (typeof requestRedraw === 'function') requestRedraw();
          }
        },
        redo() {
          const lyr = typeof getLayer === 'function' ? getLayer(layerId) : null;
          if (lyr) {
            const ctx = lyr.canvas.getContext('2d');
            const img = ctx.createImageData(bw, bh);
            img.data.set(afterBytes);
            ctx.putImageData(img, x0, y0);
            if (typeof requestRedraw === 'function') requestRedraw();
          }
        }
      });
    }

    if (typeof requestRedraw === 'function') requestRedraw();
    notifyRetouchStatus('Đã lấp vùng chọn xong');
    return true;
  };

  // Nếu ảnh > 1500px thì chia nhỏ bằng setTimeout để không đơ giao diện
  if (w > 1500 || h > 1500) {
    setTimeout(executeFill, 20);
    return true;
  } else {
    return executeFill();
  }
}

// -----------------------------------------------------------------------------
// BƯỚC 1.5c: THỬ DỊCH LỚP & PHÁT HIỆN VÙNG LỘ
// -----------------------------------------------------------------------------

function tryShiftReveal(distPx) {
  const activeLayer = typeof getActiveLayer === 'function' ? getActiveLayer() : null;
  if (!activeLayer) {
    notifyRetouchUser('Chưa chọn lớp');
    return null;
  }
  if (typeof Project === 'undefined' || !Project.layers || !Project.width || !Project.height) {
    notifyRetouchUser('Dự án chưa khởi tạo');
    return null;
  }
  const idx = Project.layers.indexOf(activeLayer);
  if (idx <= 0) {
    notifyRetouchUser('Không có lớp nền phía dưới lớp đang chọn');
    return null;
  }
  const baseLayer = Project.layers[idx - 1];

  const w = Project.width, h = Project.height;
  const dist = typeof distPx === 'number' && !isNaN(distPx) ? Math.max(1, Math.round(distPx)) : (RetouchSettings.shiftDist || 10);
  RetouchSettings.shiftDist = dist;

  const layerData = activeLayer.canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const baseData = baseLayer.canvas.getContext('2d').getImageData(0, 0, w, h).data;

  const layerAlpha = new Uint8ClampedArray(w * h);
  const baseAlpha = new Uint8ClampedArray(w * h);

  for (let p = 0; p < w * h; p++) {
    layerAlpha[p] = layerData[p * 4 + 3];
    baseAlpha[p] = baseData[p * 4 + 3];
  }

  const mask = revealMap(layerAlpha, baseAlpha, w, h, dist);
  RetouchSettings.revealMask = mask;
  RetouchSettings.showRevealOverlay = true;

  const count = mask.reduce((t, v) => t + (v ? 1 : 0), 0);
  const msg = count > 0 ? `Còn ${count} pixel lộ, cần lấp thêm` : 'Không còn vùng lộ';
  notifyRetouchStatus(msg);

  if (typeof document !== 'undefined') {
    const statusMsgEl = document.getElementById('revealStatusMsg');
    if (statusMsgEl) statusMsgEl.textContent = msg;
  }

  if (typeof requestRedraw === 'function') requestRedraw();
  return { mask, count, message: msg };
}

function selectRevealedRegions() {
  if (!RetouchSettings.revealMask) {
    notifyRetouchUser('Chưa có kết quả thử dịch lớp');
    return false;
  }
  const count = RetouchSettings.revealMask.reduce((t, v) => t + (v ? 1 : 0), 0);
  if (count === 0) {
    notifyRetouchUser('Không còn vùng lộ để chọn');
    return false;
  }
  const newMask = RetouchSettings.revealMask.slice();
  if (typeof commitSelection === 'function') {
    commitSelection(newMask, 'Chọn các vùng lộ');
  } else if (typeof Selection !== 'undefined') {
    Selection.mask = newMask;
  }
  if (typeof requestRedraw === 'function') requestRedraw();
  notifyRetouchStatus(`Đã chọn ${count} pixel lộ`);
  return true;
}

function testShiftReveal(distPx) {
  return tryShiftReveal(distPx);
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    if (typeof viewCanvas !== 'undefined' && viewCanvas) {
      attachRetouchListeners(viewCanvas);
    }
  });
}

// -----------------------------------------------------------------------------
// BÀI TEST BẮT BUỘC
// -----------------------------------------------------------------------------

function testClone() {
  const w = 20, h = 10, snap = new Uint8ClampedArray(w*h*4), dst = new Uint8ClampedArray(w*h*4);
  for (let y = 0; y < h; y++) for (let x = 0; x < 10; x++) { const i = (y*w+x)*4; snap[i] = 255; snap[i+3] = 255; }
  cloneDab(dst, snap, w, h, 15, 5, -10, 0, 2, 1, 1);
  const i = (5*w+15)*4;
  const ok = dst[i] === 255 && dst[i+3] === 255;
  console.log(ok ? 'PASS clone' : 'FAIL clone');
  return ok;
}

function testFill() {
  const w = 30, h = 30, d = new Uint8ClampedArray(w*h*4), hole = new Uint8ClampedArray(w*h);
  for (let p = 0; p < w*h; p++) { d[p*4] = 100; d[p*4+1] = 150; d[p*4+2] = 200; d[p*4+3] = 255; }
  for (let y = 10; y < 20; y++) for (let x = 10; x < 20; x++) { hole[y*w+x] = 255; d[(y*w+x)*4+3] = 0; }
  fillHole(d, w, h, hole);
  const i = (15*w+15)*4;
  const ok = Math.abs(d[i]-100) < 3 && Math.abs(d[i+2]-200) < 3 && d[i+3] > 250;
  console.log(ok ? 'PASS fill' : 'FAIL fill ' + [d[i],d[i+1],d[i+2],d[i+3]]);
  return ok;
}

function testReveal() {
  const w = 20, h = 20, la = new Uint8ClampedArray(w*h), ba = new Uint8ClampedArray(w*h);
  for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) la[y*w+x] = 255;
  const r1 = revealMap(la, ba, w, h, 3).reduce((t, v) => t + (v ? 1 : 0), 0);
  for (let p = 0; p < w*h; p++) ba[p] = 255;
  const r2 = revealMap(la, ba, w, h, 3).reduce((t, v) => t + (v ? 1 : 0), 0);
  const ok = r1 > 0 && r2 === 0;
  console.log(ok ? 'PASS reveal' : 'FAIL reveal ' + r1 + ',' + r2);
  return ok;
}

// Export cho Node.js và Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    cloneDab,
    cloneStroke,
    fillHole,
    fillSelectionHole,
    revealMap,
    tryShiftReveal,
    testShiftReveal,
    selectRevealedRegions,
    RetouchSettings,
    drawCloneOverlay,
    drawRetouchOverlay,
    handleCloneMouseDown,
    handleCloneMouseMove,
    handleCloneMouseUp,
    attachRetouchListeners,
    testClone,
    testFill,
    testReveal
  };
}

if (typeof window !== 'undefined') {
  window.cloneDab = cloneDab;
  window.cloneStroke = cloneStroke;
  window.fillHole = fillHole;
  window.fillSelectionHole = fillSelectionHole;
  window.revealMap = revealMap;
  window.tryShiftReveal = tryShiftReveal;
  window.selectRevealedRegions = selectRevealedRegions;
  window.RetouchSettings = RetouchSettings;
  window.drawCloneOverlay = drawCloneOverlay;
  window.drawRetouchOverlay = drawRetouchOverlay;
  window.attachRetouchListeners = attachRetouchListeners;
  window.testClone = testClone;
  window.testFill = testFill;
  window.testReveal = testReveal;
}
