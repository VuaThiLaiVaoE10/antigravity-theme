/**
 * acceptance.js - Antigravity Theme Studio: Thẻ A1
 * Bộ nghiệm thu toàn diện và Bảng nghiệm thu tự động cho Nền động
 */

// ---------------------------------------------------------------------------
// 1. CÁC HÀM NGHIỆM THU CỐT LÕI (CHÉP NGUYÊN VĂN THEO THẺ A1)
// ---------------------------------------------------------------------------

function buildSampleScene() { // ảnh mẫu vẽ bằng code, không cần file ảnh
  const W = 1600, H = 900, bg = makeCanvas(W, H), g = bg.getContext('2d');
  const grad = g.createLinearGradient(0, 0, W, H); grad.addColorStop(0, '#0e1a2e'); grad.addColorStop(1, '#3a2a5c');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  initProject(bg);
  const mk = (name, draw, type, patch) => { const L = addLayer(name); draw(L.canvas.getContext('2d')); if (type) L.motion = Object.assign(defaultMotion(type), patch); return L; };
  mk('Chữ lớn', c => { c.fillStyle = 'rgba(255,255,255,0.12)'; c.font = 'bold 220px sans-serif'; c.textAlign = 'center'; c.fillText('KINDRED', 1000, 760); });
  mk('Mây', c => { for (const [x, y, r] of [[300, 180, 140], [520, 140, 110], [1300, 220, 160]]) {
    const rg = c.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(200,210,255,0.55)'); rg.addColorStop(1, 'rgba(200,210,255,0)');
    c.fillStyle = rg; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } }, 'drift', { amp: 2, angle: 0, cycles: 1, chaos: 0.15, seed: 3, phase: 0 });
  const body = mk('Nhân vật', c => { c.fillStyle = '#d8c8e8'; c.beginPath(); c.arc(800, 330, 70, 0, 7); c.fill(); c.fillRect(740, 400, 120, 330); },
    'breathe', { amp: 1.5, cycles: 1, chaos: 0.1, seed: 5, phase: 0 });
  const hair = mk('Tóc', c => { c.strokeStyle = '#1a1030'; c.lineWidth = 18; c.lineCap = 'round';
    for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(800 + i * 14, 275); c.quadraticCurveTo(800 + i * 40, 420, 800 + i * 55, 600); c.stroke(); } },
    'sway', { amp: 2.5, cycles: 2, chaos: 0.2, seed: 9, phase: 0.1 });
  hair.pivot = { x: 800, y: 275 }; body.pivot = { x: 800, y: 730 }; Project.activeId = hair.id;
  requestRedraw(); return Project;
}

function layerAlpha(L) { const w = L.canvas.width, h = L.canvas.height, d = L.canvas.getContext('2d').getImageData(0, 0, w, h).data, a = new Uint8ClampedArray(w * h); for (let p = 0; p < a.length; p++) a[p] = d[p * 4 + 3]; return a; }
function belowAlpha(idx) { const n = Project.width * Project.height, out = new Uint8ClampedArray(n);
  for (let i = 0; i < idx; i++) { if (!Project.layers[i].visible) continue; const a = layerAlpha(Project.layers[i]); for (let p = 0; p < n; p++) if (a[p] > out[p]) out[p] = a[p]; } return out; }
function checkReveal() {
  let worst = 0, name = '';
  Project.layers.forEach((L, i) => { if (!activeMotion(L) || i === 0) return;
    const dist = Math.max(1, Math.ceil(ampPx(L.motion.type, L.motion.amp)));
    const r = revealMap(layerAlpha(L), belowAlpha(i), Project.width, Project.height, dist).reduce((s, v) => s + (v ? 1 : 0), 0);
    if (r > worst) { worst = r; name = L.name; } });
  return { worst, name };
}

async function runAcceptance() { // trả về các dòng: {id, label, status: 'PASS'|'FAIL'|'TAY', note}
  const rows = [], add = (id, label, status, note) => rows.push({ id, label, status, note });
  const loop = checkLoop();
  add(1, 'Vòng lặp liền mạch', loop.length && loop.every(r => r.ok) ? 'PASS' : 'FAIL', loop.map(r => r.name + ' ' + r.ratio.toFixed(2)).join(', ') || 'không có lớp động');
  const el = eyeLoad(); add(2, 'Tải mắt không đỏ', loadLevel(el) !== 'red' ? 'PASS' : 'FAIL', 'tải ' + el.toFixed(2) + ' (' + loadLevel(el) + ')');
  add(3, 'Số lớp động không quá ' + CFG.load.maxActive, animatedCount() <= CFG.load.maxActive ? 'PASS' : 'FAIL', animatedCount() + ' lớp');
  const keep = Safe.rects;
  try {
    Safe.rects = [{ name: 'Vùng chữ', x: 0.35, y: 0.25, w: 0.3, h: 0.5, factor: 0 }]; Safe.cache = {}; Safe.version++;
    const w = Project.width, h = Project.height, c1 = makeCanvas(w, h), c2 = makeCanvas(w, h);
    renderWithSafe(c1.getContext('2d'), 0.25); renderWithSafe(c2.getContext('2d'), 0.5);
    const d1 = c1.getContext('2d').getImageData(0, 0, w, h).data, d2 = c2.getContext('2d').getImageData(0, 0, w, h).data;
    const m = Math.ceil(3 * Safe.feather * unitPx()), x0 = Math.floor(0.35 * w) + m, x1 = Math.floor(0.65 * w) - m, y0 = Math.floor(0.25 * h) + m, y1 = Math.floor(0.75 * h) - m;
    let s = 0, n = 0, t = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * w + x) * 4; s += Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2]); n += 3; }
    for (let p = 0; p < w * h; p++) t = Math.max(t, Math.abs(d1[p * 4] - d2[p * 4]));
    const inside = n ? s / n : 999;
    add(4, 'Vùng chữ đứng yên', inside < 1.5 && t > 8 ? 'PASS' : 'FAIL', 'trong vùng ' + inside.toFixed(2) + ', toàn ảnh tối đa ' + t);
  } finally { Safe.rects = keep; Safe.cache = {}; Safe.version++; }
  const rv = checkReveal();
  add(5, 'Không lộ vết rách', rv.worst <= Project.width * Project.height * 1e-4 ? 'PASS' : 'FAIL', rv.worst + ' pixel lộ' + (rv.name ? ' (lớp ' + rv.name + ')' : ''));
  add(6, 'Xem 3 vòng liên tiếp, không thấy chỗ "nhảy"', 'TAY', 'bạn tự xem');
  add(7, 'Đọc chữ trong khung chat và ô nhập thoải mái 1 phút', 'TAY', 'bạn tự xem ở Live Preview');
  add(8, 'Giữ phím \\ so ảnh gốc: không méo mặt/nét, tóc không rách', 'TAY', 'bạn tự xem');
  return rows;
}

async function testAcceptanceAuto() {
  buildSampleScene(); const rows = await runAcceptance();
  const bad = rows.filter(r => r.status === 'FAIL');
  console.log(bad.length ? 'FAIL acceptance ' + bad.map(r => r.id + ':' + r.note).join('; ') : 'PASS acceptance (' + rows.filter(r => r.status === 'PASS').length + '/5 tự động)');
  return bad.length === 0;
}

// ---------------------------------------------------------------------------
// 2. GIAO DIỆN BẢNG NGHIỆM THU (PANEL "NGHIỆM THU")
// ---------------------------------------------------------------------------

const AcceptanceState = {
  lastRows: null,
  manualChecks: { 6: false, 7: false, 8: false },
  running: false
};

function renderAcceptancePanel(mount) {
  if (!mount) return;
  mount.innerHTML = `
    <div class="acceptance-container" style="display:flex; flex-direction:column; gap:16px; padding:12px 0;">
      <!-- NÚT ĐIỀU KHIỂN -->
      <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
        <button id="btnAcceptanceLoadSample" class="btn" style="background:#3b82f6; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
          <span>🎨</span> Nạp ảnh mẫu
        </button>
        <button id="btnAcceptanceRun" class="btn" style="background:#10b981; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
          <span>▶️</span> Chạy nghiệm thu
        </button>
        <span id="acceptanceStatusText" style="font-size:13px; color:#94a3b8;">Sẵn sàng chạy trên cảnh mẫu hoặc dự án hiện tại</span>
      </div>

      <!-- BẢNG 8 DÒNG NGHIỆM THU -->
      <div style="background:#1e1e2e; border:1px solid #313244; border-radius:8px; overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
          <thead>
            <tr style="background:#181825; color:#a6adc8; border-bottom:1px solid #313244;">
              <th style="padding:10px 12px; width:40px; text-align:center;">#</th>
              <th style="padding:10px 12px;">Tiêu chí nghiệm thu</th>
              <th style="padding:10px 12px; width:130px; text-align:center;">Trạng thái</th>
              <th style="padding:10px 12px;">Ghi chú / Kết quả đo</th>
            </tr>
          </thead>
          <tbody id="acceptanceTableBody">
            <tr>
              <td colspan="4" style="padding:24px; text-align:center; color:#6c7086;">
                Chưa có dữ liệu nghiệm thu. Bấm <b>"Chạy nghiệm thu"</b> hoặc <b>"Nạp ảnh mẫu"</b> để bắt đầu.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- DÒNG CUỐI: HUY HIỆU ĐẠT / CHƯA ĐẠT -->
      <div id="acceptanceVerdictContainer" style="background:#181825; border:1px solid #313244; border-radius:8px; padding:14px 20px; display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; flex-direction:column; gap:4px;">
          <div style="font-weight:700; font-size:14px; color:#cdd6f4;">KẾT QUẢ NGHIỆM THU CHUNG</div>
          <div id="acceptanceVerdictDetail" style="font-size:12px; color:#94a3b8;">Chưa kiểm tra (Cần 5/5 tự động PASS và tích chọn đủ 3 mục kiểm tra tay)</div>
        </div>
        <div id="acceptanceVerdictBadge" style="font-size:16px; font-weight:800; padding:8px 24px; border-radius:999px; background:#313244; color:#a6adc8; border:1px solid #45475a; letter-spacing:1px;">
          CHƯA KIỂM TRA
        </div>
      </div>
    </div>
  `;

  const btnLoad = mount.querySelector('#btnAcceptanceLoadSample');
  const btnRun = mount.querySelector('#btnAcceptanceRun');

  if (btnLoad) {
    btnLoad.addEventListener('click', () => {
      buildSampleScene();
      const st = mount.querySelector('#acceptanceStatusText');
      if (st) st.textContent = '✓ Đã nạp ảnh mẫu KINDRED (1600x900, 4 lớp: Chữ lớn, Mây, Nhân vật, Tóc)';
      if (typeof showStatus === 'function') showStatus('Đã nạp cảnh mẫu thành công');
      // Tự động chạy nghiệm thu sau khi nạp mẫu
      executeRunAcceptance(mount);
    });
  }

  if (btnRun) {
    btnRun.addEventListener('click', () => {
      executeRunAcceptance(mount);
    });
  }
}

async function executeRunAcceptance(mount) {
  if (AcceptanceState.running) return;
  AcceptanceState.running = true;
  const st = mount.querySelector('#acceptanceStatusText');
  if (st) st.textContent = '⏳ Đang phân tích chuyển động, vòng lặp và vết rách...';

  try {
    const rows = await runAcceptance();
    AcceptanceState.lastRows = rows;
    updateAcceptanceUI(mount, rows);
    if (st) st.textContent = '✓ Nghiệm thu hoàn tất lúc ' + new Date().toLocaleTimeString();
  } catch (err) {
    console.error('Lỗi khi chạy runAcceptance:', err);
    if (st) st.textContent = '❌ Lỗi nghiệm thu: ' + (err.message || err);
  } finally {
    AcceptanceState.running = false;
  }
}

function updateAcceptanceUI(mount, rows) {
  const tbody = mount.querySelector('#acceptanceTableBody');
  if (!tbody || !rows) return;

  tbody.innerHTML = rows.map(r => {
    const isManual = r.status === 'TAY';
    let statusCellHTML = '';

    if (isManual) {
      const isChecked = !!AcceptanceState.manualChecks[r.id];
      statusCellHTML = `
        <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-weight:600; color:${isChecked ? '#4ade80' : '#facc15'};">
          <input type="checkbox" class="acceptance-manual-cb" data-id="${r.id}" ${isChecked ? 'checked' : ''} style="cursor:pointer; accent-color:#10b981; width:16px; height:16px;">
          <span>${isChecked ? 'ĐÃ ĐẠT' : 'CHƯA TICK'}</span>
        </label>
      `;
    } else if (r.status === 'PASS') {
      statusCellHTML = `
        <span style="display:inline-block; padding:3px 10px; border-radius:4px; font-weight:700; font-size:12px; background:rgba(34,197,94,0.18); color:#4ade80; border:1px solid rgba(34,197,94,0.4);">
          PASS
        </span>
      `;
    } else {
      statusCellHTML = `
        <span style="display:inline-block; padding:3px 10px; border-radius:4px; font-weight:700; font-size:12px; background:rgba(239,68,68,0.18); color:#f87171; border:1px solid rgba(239,68,68,0.4);">
          FAIL
        </span>
      `;
    }

    const rowBg = isManual ? (AcceptanceState.manualChecks[r.id] ? 'rgba(34,197,94,0.03)' : 'transparent') : (r.status === 'PASS' ? 'rgba(34,197,94,0.03)' : 'rgba(239,68,68,0.05)');

    return `
      <tr style="border-bottom:1px solid #313244; background:${rowBg};">
        <td style="padding:10px 12px; text-align:center; font-weight:700; color:#89b4fa;">${r.id}</td>
        <td style="padding:10px 12px; font-weight:600; color:#cdd6f4;">${r.label}</td>
        <td style="padding:10px 12px; text-align:center;">${statusCellHTML}</td>
        <td style="padding:10px 12px; color:#a6adc8; font-size:12px;">${r.note}</td>
      </tr>
    `;
  }).join('');

  // Gắn sự kiện cho các ô tick thủ công
  tbody.querySelectorAll('.acceptance-manual-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.id, 10);
      AcceptanceState.manualChecks[id] = e.target.checked;
      updateAcceptanceVerdict(mount);
      updateAcceptanceUI(mount, AcceptanceState.lastRows);
    });
  });

  updateAcceptanceVerdict(mount);
}

function updateAcceptanceVerdict(mount) {
  const badge = mount.querySelector('#acceptanceVerdictBadge');
  const detail = mount.querySelector('#acceptanceVerdictDetail');
  if (!badge || !detail) return;

  const rows = AcceptanceState.lastRows;
  if (!rows || !rows.length) {
    badge.textContent = 'CHƯA KIỂM TRA';
    badge.style.background = '#313244';
    badge.style.color = '#a6adc8';
    badge.style.border = '1px solid #45475a';
    detail.textContent = 'Chưa có dữ liệu kiểm thử.';
    return;
  }

  const autoRows = rows.filter(r => r.id >= 1 && r.id <= 5);
  const autoPassed = autoRows.every(r => r.status === 'PASS');
  const passCount = autoRows.filter(r => r.status === 'PASS').length;

  const manualPassed = [6, 7, 8].every(id => !!AcceptanceState.manualChecks[id]);
  const manualCount = [6, 7, 8].filter(id => !!AcceptanceState.manualChecks[id]).length;

  const isFinalPass = autoPassed && manualPassed;

  if (isFinalPass) {
    badge.textContent = '🎉 ĐẠT';
    badge.style.background = 'rgba(34, 197, 94, 0.2)';
    badge.style.color = '#22c55e';
    badge.style.border = '1px solid #22c55e';
    detail.textContent = 'Hoàn hảo! Toàn bộ 5/5 kiểm tra tự động PASS và đã xác nhận 3/3 kiểm tra bằng tay.';
  } else {
    badge.textContent = '⏳ CHƯA ĐẠT';
    badge.style.background = 'rgba(234, 179, 8, 0.15)';
    badge.style.color = '#facc15';
    badge.style.border = '1px solid #facc15';
    const reasons = [];
    if (!autoPassed) reasons.push(`Tự động: ${passCount}/5 PASS`);
    if (!manualPassed) reasons.push(`Kiểm tra tay: ${manualCount}/3 mục tick`);
    detail.textContent = 'Chưa đạt điều kiện: ' + reasons.join(' | ') + '. (Cần đủ 5/5 tự động PASS và 3/3 ô tick).';
  }
}

// ---------------------------------------------------------------------------
// 3. KHỞI TẠO TỰ ĐỘNG & EXPORTS
// ---------------------------------------------------------------------------

if (typeof document !== 'undefined') {
  const autoMount = () => {
    const el = document.getElementById('acceptancePanelMount');
    if (el) renderAcceptancePanel(el);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }
}

if (typeof window !== 'undefined') {
  window.buildSampleScene = buildSampleScene;
  window.layerAlpha = layerAlpha;
  window.belowAlpha = belowAlpha;
  window.checkReveal = checkReveal;
  window.runAcceptance = runAcceptance;
  window.testAcceptanceAuto = testAcceptanceAuto;
  window.renderAcceptancePanel = renderAcceptancePanel;
  window.AcceptanceState = AcceptanceState;
}

if (typeof global !== 'undefined') {
  global.buildSampleScene = buildSampleScene;
  global.layerAlpha = layerAlpha;
  global.belowAlpha = belowAlpha;
  global.checkReveal = checkReveal;
  global.runAcceptance = runAcceptance;
  global.testAcceptanceAuto = testAcceptanceAuto;
  global.renderAcceptancePanel = renderAcceptancePanel;
  global.AcceptanceState = AcceptanceState;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildSampleScene,
    layerAlpha,
    belowAlpha,
    checkReveal,
    runAcceptance,
    testAcceptanceAuto,
    renderAcceptancePanel,
    AcceptanceState
  };
}
