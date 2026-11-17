/**
 * viewport.js - Antigravity Theme Studio: Viewport, Zoom, Pan & Render Loop
 * BƯỚC 1.2: Quản lý khung nhìn, biến đổi tọa độ ảnh/màn hình và vòng lặp render
 */

// Đảm bảo môi trường chạy tương thích (Browser & Node.js test)
if (typeof document === 'undefined') {
  global.document = {
    createElement(tag) {
      return {
        width: 0,
        height: 0,
        style: {},
        getContext: () => ({
          setTransform() {},
          clearRect() {},
          fillRect() {},
          drawImage() {}
        }),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 })
      };
    },
    hidden: false
  };
}

if (typeof Project === 'undefined') {
  try {
    const layers = require('./layers.js');
    if (typeof global !== 'undefined') {
      global.Project = layers.Project;
      global.compose = layers.compose;
    }
  } catch (err) {}
}

// -----------------------------------------------------------------------------
// CHÉP NGUYÊN VĂN THEO YÊU CẦU ĐỀ BÀI
// -----------------------------------------------------------------------------

const View = { zoom: 1, panX: 0, panY: 0, MIN: 0.1, MAX: 8 };
let viewCanvas = null, dirty = true, lastT = 0;
const overlayDrawers = []; // mỗi phần tử: (ctx) => {} vẽ theo TỌA ĐỘ ẢNH (đã áp zoom/pan)

function requestRedraw() { dirty = true; }
function localToImage(lx, ly) { return { x: (lx - View.panX) / View.zoom, y: (ly - View.panY) / View.zoom }; }
function imageToLocal(ix, iy) { return { x: ix * View.zoom + View.panX, y: iy * View.zoom + View.panY }; }
function screenToImage(sx, sy) { const r = viewCanvas.getBoundingClientRect(); return localToImage(sx - r.left, sy - r.top); }

function zoomAt(lx, ly, factor) {
  const nz = Math.min(View.MAX, Math.max(View.MIN, View.zoom * factor)), k = nz / View.zoom;
  View.panX = lx - (lx - View.panX) * k; View.panY = ly - (ly - View.panY) * k; View.zoom = nz;
  requestRedraw();
}
function fitToView() {
  if (!viewCanvas || !Project.width || !Project.height) return;
  const z = Math.min(viewCanvas.width / Project.width, viewCanvas.height / Project.height) * 0.95;
  View.zoom = z; View.panX = (viewCanvas.width - Project.width * z) / 2; View.panY = (viewCanvas.height - Project.height * z) / 2;
  requestRedraw();
}
function drawCheckerboard(ctx, w, h, s = 12) {
  for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { ctx.fillStyle = ((x / s + y / s) & 1) ? '#2a3140' : '#1b212c'; ctx.fillRect(x, y, s, s); }
}
const composeCanvas = document.createElement('canvas');
function renderView() {
  const ctx = viewCanvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, viewCanvas.width, viewCanvas.height);
  drawCheckerboard(ctx, viewCanvas.width, viewCanvas.height);
  if (!Project.width) return;
  if (composeCanvas.width !== Project.width || composeCanvas.height !== Project.height) { composeCanvas.width = Project.width; composeCanvas.height = Project.height; }
  compose(composeCanvas.getContext('2d'));
  ctx.setTransform(View.zoom, 0, 0, View.zoom, View.panX, View.panY);
  ctx.imageSmoothingEnabled = View.zoom < 1;
  ctx.drawImage(composeCanvas, 0, 0);
  for (const f of overlayDrawers) f(ctx);
}
function viewLoop(t) {
  const dt = Math.min(0.1, (t - lastT) / 1000); lastT = t;
  if (typeof onFrame === 'function') onFrame(dt); // các giai đoạn sau gắn vào đây
  if (dirty && !document.hidden) { dirty = false; renderView(); }
  requestAnimationFrame(viewLoop);
}

// -----------------------------------------------------------------------------
// NỐI GIAO DIỆN & SỰ KIỆN VIEWPORT
// -----------------------------------------------------------------------------

let hudElements = {
  zoomLabel: null,
  coordLabel: null,
  fitBtn: null,
  container: null
};

function updateCanvasPixelated() {
  if (!viewCanvas) return;
  if (View.zoom >= 4.0) {
    viewCanvas.style.imageRendering = 'pixelated';
  } else {
    viewCanvas.style.imageRendering = 'auto';
  }
}

function updateHUD(clientX, clientY) {
  if (hudElements.zoomLabel) {
    hudElements.zoomLabel.textContent = `Zoom ${Math.round(View.zoom * 100)}%`;
  }
  if (hudElements.coordLabel) {
    if (clientX !== undefined && clientY !== undefined && viewCanvas) {
      const imgPt = screenToImage(clientX, clientY);
      hudElements.coordLabel.textContent = `X: ${Math.round(imgPt.x)}, Y: ${Math.round(imgPt.y)}`;
    }
  }
}

function ensureViewportHUDStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('viewport-hud-styles')) return;
  const style = document.createElement('style');
  style.id = 'viewport-hud-styles';
  style.textContent = `
    .viewport-hud-bottom-left {
      position: absolute;
      bottom: 12px;
      left: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 5px 12px;
      background: rgba(18, 20, 29, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      font-size: 11px;
      font-family: monospace, sans-serif;
      color: #c0caf5;
      user-select: none;
      z-index: 50;
      pointer-events: auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }
    .viewport-zoom-label {
      color: #7dcfff;
      font-weight: 600;
      min-width: 65px;
    }
    .viewport-coord-label {
      color: rgba(255, 255, 255, 0.7);
      min-width: 90px;
    }
    .viewport-fit-btn {
      background: rgba(125, 207, 255, 0.15);
      border: 1px solid rgba(125, 207, 255, 0.35);
      border-radius: 4px;
      color: #7dcfff;
      font-size: 11px;
      padding: 2px 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .viewport-fit-btn:hover {
      background: rgba(125, 207, 255, 0.3);
      border-color: #7dcfff;
      color: #ffffff;
    }
  `;
  document.head.appendChild(style);
}

function createOrAttachHUD(container) {
  if (typeof document === 'undefined') return;
  ensureViewportHUDStyles();

  let hud = container ? container.querySelector('.viewport-hud-bottom-left') : null;
  if (!hud) {
    hud = document.createElement('div');
    hud.className = 'viewport-hud-bottom-left';
    hud.innerHTML = `
      <span class="viewport-zoom-label">Zoom 100%</span>
      <span class="viewport-coord-label">X: 0, Y: 0</span>
      <button type="button" class="viewport-fit-btn" title="Phóng vừa khung hình">Vừa khung</button>
    `;
    if (container) {
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      container.appendChild(hud);
    }
  }

  hudElements.container = hud;
  hudElements.zoomLabel = hud.querySelector('.viewport-zoom-label');
  hudElements.coordLabel = hud.querySelector('.viewport-coord-label');
  hudElements.fitBtn = hud.querySelector('.viewport-fit-btn');

  if (hudElements.fitBtn) {
    hudElements.fitBtn.onclick = () => {
      fitToView();
      updateCanvasPixelated();
      updateHUD();
    };
  }

  updateHUD();
}

let isInitialized = false;

function initViewport(canvasEl, hudParentContainer) {
  if (!canvasEl) return;
  viewCanvas = canvasEl;

  // Dùng ResizeObserver đặt viewCanvas.width/height bằng kích thước CSS rồi requestRedraw()
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        const w = Math.round(cr.width);
        const h = Math.round(cr.height);
        if (w > 0 && h > 0 && (viewCanvas.width !== w || viewCanvas.height !== h)) {
          viewCanvas.width = w;
          viewCanvas.height = h;
          updateCanvasPixelated();
          requestRedraw();
        }
      }
    });
    ro.observe(viewCanvas);
  } else {
    viewCanvas.width = viewCanvas.clientWidth || viewCanvas.width || 800;
    viewCanvas.height = viewCanvas.clientHeight || viewCanvas.height || 600;
  }

  // Khởi tạo HUD ở góc dưới trái
  const parentContainer = hudParentContainer || viewCanvas.parentElement;
  if (parentContainer) {
    createOrAttachHUD(parentContainer);
  }

  // Lăn chuột: preventDefault, zoomAt(lx, ly, deltaY < 0 ? 1.1 : 1/1.1)
  viewCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = viewCanvas.getBoundingClientRect();
    const lx = e.clientX - r.left;
    const ly = e.clientY - r.top;
    const factor = e.deltaY < 0 ? 1.1 : (1 / 1.1);
    zoomAt(lx, ly, factor);
    updateCanvasPixelated();
    updateHUD(e.clientX, e.clientY);
  }, { passive: false });

  // Kéo ảnh: giữ Space + kéo chuột trái, hoặc kéo chuột giữa
  let isSpacePressed = false;
  let isPanning = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
      isSpacePressed = true;
      if (viewCanvas) viewCanvas.style.cursor = isPanning ? 'grabbing' : 'grab';
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      isSpacePressed = false;
      if (!isPanning && viewCanvas) viewCanvas.style.cursor = 'default';
    }
  });

  viewCanvas.addEventListener('mousedown', (e) => {
    if ((isSpacePressed && e.button === 0) || e.button === 1) {
      e.preventDefault();
      isPanning = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      viewCanvas.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (isPanning) {
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      View.panX += dx;
      View.panY += dy;
      requestRedraw();
    }
    if (viewCanvas) {
      updateHUD(e.clientX, e.clientY);
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (isPanning) {
      isPanning = false;
      if (viewCanvas) viewCanvas.style.cursor = isSpacePressed ? 'grab' : 'default';
    }
  });

  // Gọi requestAnimationFrame(viewLoop) một lần khi khởi động
  if (!isInitialized && typeof requestAnimationFrame !== 'undefined') {
    isInitialized = true;
    requestAnimationFrame(viewLoop);
  }

  updateCanvasPixelated();
  requestRedraw();
}

// -----------------------------------------------------------------------------
// BÀI TEST BẮT BUỘC
// -----------------------------------------------------------------------------

function testView() {
  View.zoom = 2; View.panX = 10; View.panY = 20;
  const p0 = localToImage(100, 100); zoomAt(100, 100, 2); const p1 = localToImage(100, 100);
  const z = View.zoom; zoomAt(0, 0, 1000); const zmax = View.zoom;
  const ok = Math.abs(p0.x - p1.x) < 1e-9 && Math.abs(p0.y - p1.y) < 1e-9 && z === 4 && zmax === View.MAX;
  console.log(ok ? 'PASS view' : 'FAIL view');
  return ok;
}

// Export cho Node.js và Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    View,
    get viewCanvas() { return viewCanvas; },
    set viewCanvas(v) { viewCanvas = v; },
    get dirty() { return dirty; },
    set dirty(v) { dirty = v; },
    overlayDrawers,
    requestRedraw,
    localToImage,
    imageToLocal,
    screenToImage,
    zoomAt,
    fitToView,
    drawCheckerboard,
    renderView,
    viewLoop,
    initViewport,
    updateCanvasPixelated,
    updateHUD,
    testView
  };
}

if (typeof window !== 'undefined') {
  window.View = View;
  window.overlayDrawers = overlayDrawers;
  window.requestRedraw = requestRedraw;
  window.localToImage = localToImage;
  window.imageToLocal = imageToLocal;
  window.screenToImage = screenToImage;
  window.zoomAt = zoomAt;
  window.fitToView = fitToView;
  window.drawCheckerboard = drawCheckerboard;
  window.renderView = renderView;
  window.viewLoop = viewLoop;
  window.initViewport = initViewport;
  window.testView = testView;
}
