/**
 * layers.js - Antigravity Theme Studio: Quản lý Layer & Panel Lớp
 * BƯỚC 1.1: Quản lý các lớp hình ảnh xếp từ dưới lên trên (layers[0] là lớp dưới cùng).
 */

const Project = { width: 0, height: 0, original: null, layers: [], activeId: null, nextId: 1 };

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function initProject(img) { // img: Image, ImageBitmap hoặc canvas
  let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const s = Math.min(1, 2048 / Math.max(w, h));
  w = Math.max(1, Math.round(w * s)); h = Math.max(1, Math.round(h * s));
  Project.width = w; Project.height = h; Project.layers = []; Project.nextId = 1;
  const base = makeCanvas(w, h), g = base.getContext('2d');
  g.drawImage(img, 0, 0, w, h);
  Project.original = g.getImageData(0, 0, w, h); // BẤT BIẾN, không bao giờ ghi vào
  const L = addLayer('Nền', base);
  Project.activeId = L.id;
  if (typeof resetUndo === 'function') resetUndo();
  else if (typeof window !== 'undefined' && typeof window.resetUndo === 'function') window.resetUndo();
  else if (typeof global !== 'undefined' && typeof global.resetUndo === 'function') global.resetUndo();
  if (typeof Selection !== 'undefined') Selection.mask = new Uint8ClampedArray(w * h);
  else if (typeof window !== 'undefined' && window.Selection) window.Selection.mask = new Uint8ClampedArray(w * h);
  else if (typeof global !== 'undefined' && global.Selection) global.Selection.mask = new Uint8ClampedArray(w * h);
  return L;
}

function addLayer(name, canvas, index) {
  const L = { id: Project.nextId++, name, visible: true, locked: false, opacity: 1,
    canvas: canvas || makeCanvas(Project.width, Project.height),
    pivot: { x: Project.width / 2, y: Project.height / 2 },
    motion: {
      type: 'sway',
      amplitude: 1.0,
      chaos: 0.15,
      loopSec: 12,
      anchor: { x: 0.5, y: 0.5 }
    },
    motionType: 'sway',
    amplitude: 1.0,
    chaos: 0.15,
    loopSec: 12,
    anchor: { x: 0.5, y: 0.5 },
    depth: 0 };
  Project.layers.splice(index === undefined ? Project.layers.length : index, 0, L);
  return L;
}
function getLayer(id) { return Project.layers.find(l => l.id === id) || null; }
function getActiveLayer() { return getLayer(Project.activeId); }

function removeLayer(id) {
  if (Project.layers.length <= 1) return false;
  const i = Project.layers.findIndex(l => l.id === id); if (i < 0) return false;
  Project.layers.splice(i, 1);
  if (Project.activeId === id) Project.activeId = Project.layers[Math.max(0, i - 1)].id;
  return true;
}
function duplicateLayer(id) {
  const s = getLayer(id); if (!s) return null;
  const c = makeCanvas(Project.width, Project.height); c.getContext('2d').drawImage(s.canvas, 0, 0);
  const i = Project.layers.indexOf(s);
  const L = addLayer(s.name + ' (bản sao)', c, i + 1);
  L.visible = s.visible; L.opacity = s.opacity; L.pivot = { ...s.pivot }; L.depth = s.depth;
  L.motion = s.motion ? JSON.parse(JSON.stringify(s.motion)) : null;
  Project.activeId = L.id; return L;
}
function moveLayer(id, newIndex) {
  const i = Project.layers.findIndex(l => l.id === id); if (i < 0) return;
  const [L] = Project.layers.splice(i, 1);
  Project.layers.splice(Math.max(0, Math.min(Project.layers.length, newIndex)), 0, L);
}
function compose(ctx) {
  ctx.clearRect(0, 0, Project.width, Project.height);
  for (const L of Project.layers) { if (!L.visible) continue; ctx.globalAlpha = L.opacity; ctx.drawImage(L.canvas, 0, 0); }
  ctx.globalAlpha = 1;
}

// -----------------------------------------------------------------------------
// Giao diện (Panel lớp, bên trái)
// -----------------------------------------------------------------------------

function requestRedraw() {
  if (typeof window !== 'undefined' && typeof window.requestRedraw === 'function') {
    window.requestRedraw();
  }
}

let _panelContainer = null;

function ensureLayerStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('layer-panel-styles')) return;
  const style = document.createElement('style');
  style.id = 'layer-panel-styles';
  style.textContent = `
    .layers-panel-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background: rgba(18, 20, 29, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      overflow: hidden;
      font-family: inherit;
      color: #e0e6ed;
      user-select: none;
      box-sizing: border-box;
    }
    .layers-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .layers-panel-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #7dcfff;
      text-transform: uppercase;
    }
    .layers-panel-actions {
      display: flex;
      gap: 5px;
    }
    .layer-action-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      color: #c0caf5;
      font-size: 11px;
      padding: 3px 7px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .layer-action-btn:hover:not(:disabled) {
      background: rgba(125, 207, 255, 0.2);
      border-color: #7dcfff;
      color: #ffffff;
    }
    .layer-action-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .layers-list {
      flex: 1;
      overflow-y: auto;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .layer-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    }
    .layer-item:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    .layer-item.active {
      border-color: #7dcfff;
      background: rgba(125, 207, 255, 0.14);
      box-shadow: 0 0 8px rgba(125, 207, 255, 0.35);
    }
    .layer-item.drag-over {
      border-top: 2px solid #ff9e64;
    }
    .layer-item.dragging {
      opacity: 0.4;
    }
    .layer-drag-handle {
      color: rgba(255, 255, 255, 0.35);
      cursor: grab;
      font-size: 13px;
    }
    .layer-thumb {
      width: 36px;
      height: 36px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: #111;
      flex-shrink: 0;
    }
    .layer-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .layer-name-wrap {
      display: flex;
      align-items: center;
    }
    .layer-name {
      font-size: 12px;
      font-weight: 500;
      color: #e0e6ed;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: text;
    }
    .layer-name-edit {
      font-size: 12px;
      background: #1a1b26;
      color: #fff;
      border: 1px solid #7dcfff;
      border-radius: 3px;
      padding: 1px 4px;
      width: 100%;
      outline: none;
      box-sizing: border-box;
    }
    .layer-opacity-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .layer-opacity-label {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.5);
      width: 28px;
    }
    .layer-opacity-slider {
      flex: 1;
      height: 3px;
      accent-color: #7dcfff;
      cursor: pointer;
    }
    .layer-controls {
      display: flex;
      gap: 4px;
    }
    .layer-ctrl-btn {
      background: transparent;
      border: none;
      color: #c0caf5;
      font-size: 14px;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
      transition: background 0.15s;
    }
    .layer-ctrl-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  `;
  document.head.appendChild(style);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function drawCheckerboard(ctx, w, h) {
  const size = 6;
  ctx.fillStyle = '#1e1e2e';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2a2b3d';
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
        ctx.fillRect(x, y, size, size);
      }
    }
  }
}

function callWithStructureUndo(label, fn) {
  if (typeof withStructureUndo === 'function') return withStructureUndo(label, fn);
  if (typeof window !== 'undefined' && typeof window.withStructureUndo === 'function') return window.withStructureUndo(label, fn);
  if (typeof global !== 'undefined' && typeof global.withStructureUndo === 'function') return global.withStructureUndo(label, fn);
  return fn();
}

function renderLayersPanel(container) {
  if (typeof document === 'undefined') return;
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;
  _panelContainer = el;
  ensureLayerStyles();

  // Danh sách từ TRÊN xuống DƯỚI (đảo ngược mảng Project.layers)
  const reversed = [];
  for (let i = Project.layers.length - 1; i >= 0; i--) {
    reversed.push(Project.layers[i]);
  }

  const canDelete = Project.layers.length > 1;

  el.innerHTML = `
    <div class="layers-panel-container">
      <div class="layers-panel-header">
        <span class="layers-panel-title">DANH SÁCH LỚP (${Project.layers.length})</span>
        <div class="layers-panel-actions">
          <button type="button" class="layer-action-btn" id="btnSaveProject" title="Lưu dự án thành file .tszip">💾 Lưu</button>
          <button type="button" class="layer-action-btn" id="btnOpenProject" title="Mở dự án từ file .tszip">📂 Mở</button>
          <button type="button" class="layer-action-btn btn-undo" id="btnUndo" title="Hoàn tác (Ctrl+Z)" disabled>↩ Hoàn tác</button>
          <button type="button" class="layer-action-btn btn-redo" id="btnRedo" title="Làm lại (Ctrl+Y)" disabled>↪ Làm lại</button>
          <button type="button" class="layer-action-btn" id="btnLayersAddEmpty" title="Thêm lớp trống">➕ Thêm</button>
          <button type="button" class="layer-action-btn" id="btnLayersDuplicate" title="Nhân bản lớp đang chọn">📋 Nhân bản</button>
          <button type="button" class="layer-action-btn" id="btnLayersDelete" title="Xóa lớp đang chọn" ${canDelete ? '' : 'disabled'}>🗑️ Xóa</button>
        </div>
      </div>
      <div class="layers-list" id="layersList"></div>
    </div>
  `;

  // Gán sự kiện nút Lưu / Mở dự án
  const btnSave = el.querySelector('#btnSaveProject');
  if (btnSave) {
    btnSave.onclick = () => {
      if (typeof exportProjectFile === 'function') exportProjectFile();
      else if (typeof window !== 'undefined' && typeof window.exportProjectFile === 'function') window.exportProjectFile();
    };
  }
  const btnOpen = el.querySelector('#btnOpenProject');
  if (btnOpen) {
    btnOpen.onclick = () => {
      if (typeof openProjectFileDialog === 'function') openProjectFileDialog();
      else if (typeof window !== 'undefined' && typeof window.openProjectFileDialog === 'function') window.openProjectFileDialog();
    };
  }

  // Gán sự kiện nút Hoàn tác / Làm lại
  const btnUndo = el.querySelector('#btnUndo');
  if (btnUndo) {
    btnUndo.onclick = () => {
      if (typeof undo === 'function') undo();
      else if (typeof window !== 'undefined' && typeof window.undo === 'function') window.undo();
      renderLayersPanel(el);
    };
  }
  const btnRedo = el.querySelector('#btnRedo');
  if (btnRedo) {
    btnRedo.onclick = () => {
      if (typeof redo === 'function') redo();
      else if (typeof window !== 'undefined' && typeof window.redo === 'function') window.redo();
      renderLayersPanel(el);
    };
  }

  if (typeof updateUndoUI === 'function') updateUndoUI();
  else if (typeof window !== 'undefined' && typeof window.updateUndoUI === 'function') window.updateUndoUI();

  // Gán sự kiện nút trên Header
  const btnAdd = el.querySelector('#btnLayersAddEmpty');
  if (btnAdd) {
    btnAdd.onclick = () => {
      callWithStructureUndo('Thêm lớp', () => {
        const newLayer = addLayer('Lớp ' + Project.nextId);
        Project.activeId = newLayer.id;
      });
      requestRedraw();
      renderLayersPanel(el);
    };
  }

  const btnDup = el.querySelector('#btnLayersDuplicate');
  if (btnDup) {
    btnDup.onclick = () => {
      if (Project.activeId != null) {
        callWithStructureUndo('Nhân bản lớp', () => {
          duplicateLayer(Project.activeId);
        });
        requestRedraw();
        renderLayersPanel(el);
      }
    };
  }

  const btnDel = el.querySelector('#btnLayersDelete');
  if (btnDel) {
    btnDel.onclick = () => {
      if (Project.activeId != null && Project.layers.length > 1) {
        callWithStructureUndo('Xóa lớp', () => {
          removeLayer(Project.activeId);
        });
        requestRedraw();
        renderLayersPanel(el);
      }
    };
  }

  const listEl = el.querySelector('#layersList');
  if (!listEl) return;

  reversed.forEach((L) => {
    const isActive = L.id === Project.activeId;
    const row = document.createElement('div');
    row.className = `layer-item ${isActive ? 'active' : ''} ${L.locked ? 'locked' : ''}`;
    row.dataset.id = String(L.id);
    row.draggable = !L.locked;

    row.innerHTML = `
      <div class="layer-drag-handle" title="Kéo thả để đổi thứ tự">⋮⋮</div>
      <canvas class="layer-thumb" width="36" height="36" title="Ảnh thu nhỏ"></canvas>
      <div class="layer-info">
        <div class="layer-name-wrap">
          <span class="layer-name" title="Nhấp đôi để đổi tên">${escapeHtml(L.name)}</span>
          <input type="text" class="layer-name-edit" value="${escapeHtml(L.name)}" style="display:none;" />
        </div>
        <div class="layer-opacity-wrap">
          <span class="layer-opacity-label">${Math.round(L.opacity * 100)}%</span>
          <input type="range" class="layer-opacity-slider" min="0" max="100" value="${Math.round(L.opacity * 100)}" title="Độ mờ đục: ${Math.round(L.opacity * 100)}%" />
        </div>
      </div>
      <div class="layer-controls">
        <button type="button" class="layer-ctrl-btn layer-vis-btn" title="${L.visible ? 'Ẩn lớp' : 'Hiện lớp'}">
          ${L.visible ? '👁️' : '🙈'}
        </button>
        <button type="button" class="layer-ctrl-btn layer-lock-btn" title="${L.locked ? 'Mở khóa lớp' : 'Khóa lớp'}">
          ${L.locked ? '🔒' : '🔓'}
        </button>
      </div>
    `;

    // Vẽ thumbnail
    const thumbCanvas = row.querySelector('.layer-thumb');
    if (thumbCanvas && L.canvas) {
      const tctx = thumbCanvas.getContext('2d');
      if (tctx) {
        tctx.clearRect(0, 0, 36, 36);
        drawCheckerboard(tctx, 36, 36);
        try {
          tctx.drawImage(L.canvas, 0, 0, 36, 36);
        } catch (err) {}
      }
    }

    // Nhấp dòng để chọn lớp đang hoạt động (viền sáng)
    row.onclick = (e) => {
      if (e.target.closest('.layer-ctrl-btn') || e.target.closest('.layer-opacity-slider') || e.target.closest('.layer-name-edit')) {
        return;
      }
      Project.activeId = L.id;
      requestRedraw();
      renderLayersPanel(el);
    };

    // Nhấp đôi để đổi tên
    const nameSpan = row.querySelector('.layer-name');
    const nameInput = row.querySelector('.layer-name-edit');
    if (nameSpan && nameInput) {
      nameSpan.ondblclick = (e) => {
        e.stopPropagation();
        nameSpan.style.display = 'none';
        nameInput.style.display = 'inline-block';
        nameInput.focus();
        nameInput.select();
      };

      const finishRename = () => {
        const val = nameInput.value.trim();
        if (val && val !== L.name) {
          callWithStructureUndo('Đổi tên lớp', () => {
            L.name = val;
          });
          requestRedraw();
        }
        renderLayersPanel(el);
      };

      nameInput.onblur = finishRename;
      nameInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          finishRename();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          nameInput.value = L.name;
          renderLayersPanel(el);
        }
      };
    }

    // Biểu tượng mắt (ẩn/hiện)
    const visBtn = row.querySelector('.layer-vis-btn');
    if (visBtn) {
      visBtn.onclick = (e) => {
        e.stopPropagation();
        callWithStructureUndo('Ẩn/hiện lớp', () => {
          L.visible = !L.visible;
        });
        requestRedraw();
        renderLayersPanel(el);
      };
    }

    // Biểu tượng khóa (khóa/mở khóa)
    const lockBtn = row.querySelector('.layer-lock-btn');
    if (lockBtn) {
      lockBtn.onclick = (e) => {
        e.stopPropagation();
        callWithStructureUndo('Khóa/mở khóa lớp', () => {
          L.locked = !L.locked;
        });
        requestRedraw();
        renderLayersPanel(el);
      };
    }

    // Thanh trượt opacity 0-100 (chỉ gọi withStructureUndo ở sự kiện 'change', không gọi ở 'input')
    const opSlider = row.querySelector('.layer-opacity-slider');
    const opLabel = row.querySelector('.layer-opacity-label');
    if (opSlider && opLabel) {
      opSlider.onpointerdown = opSlider.onmousedown = () => {
        opSlider.dataset.startOpacity = String(L.opacity);
      };
      opSlider.oninput = (e) => {
        e.stopPropagation();
        const num = Number(e.target.value);
        L.opacity = Math.max(0, Math.min(100, num)) / 100;
        opLabel.textContent = Math.round(L.opacity * 100) + '%';
        requestRedraw();
      };
      opSlider.onchange = (e) => {
        e.stopPropagation();
        const newOp = Math.max(0, Math.min(100, Number(e.target.value))) / 100;
        const startOp = opSlider.dataset.startOpacity !== undefined ? Number(opSlider.dataset.startOpacity) : L.opacity;
        L.opacity = startOp;
        callWithStructureUndo('Chỉnh độ mờ', () => {
          L.opacity = newOp;
        });
        requestRedraw();
      };
    }

    // Kéo thả dòng để đổi thứ tự (gọi moveLayer qua withStructureUndo)
    row.ondragstart = (e) => {
      e.dataTransfer.setData('text/plain', String(L.id));
      row.classList.add('dragging');
    };
    row.ondragend = () => {
      row.classList.remove('dragging');
      listEl.querySelectorAll('.layer-item').forEach((item) => item.classList.remove('drag-over'));
    };
    row.ondragover = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      row.classList.add('drag-over');
    };
    row.ondragleave = () => {
      row.classList.remove('drag-over');
    };
    row.ondrop = (e) => {
      e.preventDefault();
      row.classList.remove('drag-over');
      const dragId = Number(e.dataTransfer.getData('text/plain'));
      if (!dragId || dragId === L.id) return;
      const targetIndex = Project.layers.findIndex((l) => l.id === L.id);
      if (targetIndex >= 0) {
        callWithStructureUndo('Đổi thứ tự lớp', () => {
          moveLayer(dragId, targetIndex);
        });
        requestRedraw();
        renderLayersPanel(el);
      }
    };

    listEl.appendChild(row);
  });
}

// -----------------------------------------------------------------------------
// BÀI TEST BẮT BUỘC
// -----------------------------------------------------------------------------

function testLayers() {
  const src = makeCanvas(4, 4); const g = src.getContext('2d'); g.fillStyle = '#f00'; g.fillRect(0, 0, 4, 4);
  initProject(src);
  const top = addLayer('Xanh'); const tg = top.canvas.getContext('2d'); tg.fillStyle = '#00f'; tg.fillRect(0, 0, 4, 4);
  const o = makeCanvas(4, 4).getContext('2d'), px = () => o.getImageData(1, 1, 1, 1).data;
  compose(o); const a = [...px()];
  top.visible = false; compose(o); const b = [...px()];
  top.visible = true; moveLayer(top.id, 0); compose(o); const c = [...px()];
  const ok = a[2] === 255 && a[0] === 0 && b[0] === 255 && b[2] === 0 && c[0] === 255 && Project.original.data[0] === 255;
  console.log(ok ? 'PASS layers' : 'FAIL layers ' + [a, b, c]);
  return ok;
}

// Export cho Node.js và Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Project,
    makeCanvas,
    initProject,
    addLayer,
    getLayer,
    getActiveLayer,
    removeLayer,
    duplicateLayer,
    moveLayer,
    compose,
    renderLayersPanel,
    requestRedraw,
    testLayers
  };
}

if (typeof window !== 'undefined') {
  window.Project = Project;
  window.makeCanvas = makeCanvas;
  window.initProject = initProject;
  window.addLayer = addLayer;
  window.getLayer = getLayer;
  window.getActiveLayer = getActiveLayer;
  window.removeLayer = removeLayer;
  window.duplicateLayer = duplicateLayer;
  window.moveLayer = moveLayer;
  window.compose = compose;
  window.renderLayersPanel = renderLayersPanel;
  window.testLayers = testLayers;
}
