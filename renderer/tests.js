/**
 * tests.js - Antigravity Theme Studio: THẺ T1 BỘ CHẠY KIỂM THỬ TRONG APP (IN-APP TEST RUNNER)
 * Chép nguyên văn cấu trúc bộ chạy và quản lý danh sách REQUIRED_TESTS
 */

const Tests = { results: [], running: false };
const REQUIRED_TESTS = []; // CHỈ ĐƯỢC THÊM tên khi thẻ xong, không xóa/sửa. Danh sách đầy đủ ở cuối thẻ.

function snapGlobals() {
  const s = {}, put = (k, v) => { s[k] = structuredClone(v); };
  if (typeof LOOP !== 'undefined') put('LOOP', LOOP);
  if (typeof Clock !== 'undefined') put('Clock', Clock);
  if (typeof Calm !== 'undefined') put('Calm', Object.assign({}, Calm, { timer: null }));
  if (typeof Parallax !== 'undefined') put('Parallax', Parallax);
  if (typeof CalmPreset !== 'undefined') put('CalmPreset', CalmPreset);
  if (typeof Safe !== 'undefined') put('Safe', { rects: Safe.rects, feather: Safe.feather });
  return s;
}
function restoreGlobals(s) {
  if (s.LOOP) Object.assign(LOOP, s.LOOP);
  if (s.Clock) Object.assign(Clock, s.Clock);
  if (s.Calm) { clearTimeout(Calm.timer); Object.assign(Calm, s.Calm); }
  if (s.Parallax) Object.assign(Parallax, s.Parallax);
  if (s.CalmPreset) Object.assign(CalmPreset, s.CalmPreset);
  if (s.Safe) { Safe.rects = s.Safe.rects; Safe.feather = s.Safe.feather; Safe.cache = {}; Safe.version++; }
}
function discoverTests() {
  return Object.getOwnPropertyNames(window).filter(n => /^test[A-Z]\w*$/.test(n) && typeof window[n] === 'function').sort();
}

async function runAllTests(only) {
  if (Tests.running) return Tests.results;
  Tests.running = true; Tests.results = [];
  const g = snapGlobals(), origLog = console.log; let backup = null;
  try {
    if (typeof saveProjectBlob === 'function' && Project.width) backup = await (await saveProjectBlob()).arrayBuffer();
    const names = only || discoverTests();
    for (const n of names) {
      const lines = [], t0 = performance.now(); let err = null;
      console.log = (...a) => { lines.push(a.join(' ')); };
      try { await window[n](); } catch (e) { err = e; }
      console.log = origLog;
      const fail = lines.find(l => l.startsWith('FAIL')), pass = lines.find(l => l.startsWith('PASS'));
      const status = err || fail ? 'FAIL' : pass ? 'PASS' : 'KHÔNG KẾT LUẬN';
      Tests.results.push({ name: n, status, ms: Math.round(performance.now() - t0),
        detail: err ? 'Lỗi: ' + err.message : (fail || pass || lines.join(' | ') || 'test không in PASS hoặc FAIL') });
    }
    if (!only) for (const n of REQUIRED_TESTS) if (!Tests.results.some(r => r.name === n))
      Tests.results.push({ name: n, status: 'THIẾU', ms: 0, detail: 'Không tìm thấy hàm test (bị xóa hoặc đổi tên?)' });
  } finally {
    console.log = origLog;
    if (backup) { try { await loadProjectBuffer(backup); } catch (e) { console.error('Không khôi phục được dự án', e); } }
    else { Project.layers = []; Project.width = 0; Project.height = 0; Project.activeId = null; }
    restoreGlobals(g); requestRedraw(); Tests.running = false;
  }
  return Tests.results;
}

function testReport() {
  const r = Tests.results, ok = r.filter(x => x.status === 'PASS').length;
  return ['KẾT QUẢ: ' + ok + '/' + r.length + ' PASS'].concat(r.map(x => x.status.padEnd(16) + x.name.padEnd(22) + String(x.ms).padStart(5) + 'ms  ' + x.detail)).join('\n');
}

async function selfCheckRunner() { // kiểm tra chính bộ chạy test; chạy tay một lần
  const names = ['testZzPass', 'testZzFail', 'testZzSilent', 'testZzThrow', 'testZzBoth'];
  window.testZzPass = () => console.log('PASS giả'); window.testZzFail = () => console.log('FAIL giả');
  window.testZzSilent = () => {}; window.testZzThrow = () => { throw new Error('boom'); };
  window.testZzBoth = () => { console.log('PASS a'); console.log('FAIL b'); };
  const r = await runAllTests(names); names.forEach(n => delete window[n]);
  const s = Object.fromEntries(r.map(x => [x.name, x.status]));
  const ok = s.testZzPass === 'PASS' && s.testZzFail === 'FAIL' && s.testZzSilent === 'KHÔNG KẾT LUẬN' && s.testZzThrow === 'FAIL' && s.testZzBoth === 'FAIL';
  console.log(ok ? 'PASS runner' : 'FAIL runner ' + JSON.stringify(s));
}

// -----------------------------------------------------------------------------
// DANH SÁCH THÊM DẦN VÀO REQUIRED_TESTS (KHI CÁC THẺ HOÀN TẤT)
// -----------------------------------------------------------------------------
const COMPLETED_CARD_TESTS = [
  'testConfig', 'testLayers', 'testView', 'testUndo', 'testWand',
  'testBrush', 'testLasso', 'testMorph', 'testCut', 'testClone',
  'testFill', 'testReveal', 'testZip', 'testSaveLoad', 'testMigrate',
  'testMotion', 'testUnits', 'testSetMotion', 'testLoad', 'testSafe',
  'testParallax', 'testPresets'
];
COMPLETED_CARD_TESTS.forEach(n => {
  if (!REQUIRED_TESTS.includes(n)) REQUIRED_TESTS.push(n);
});

// -----------------------------------------------------------------------------
// GIAO DIỆN PANEL "KIỂM THỬ"
// -----------------------------------------------------------------------------
function renderReportHTML(reportText) {
  const lines = reportText.split('\n');
  return lines.map((line, idx) => {
    let color = '#cdd6f4';
    if (idx === 0) {
      color = '#7dcfff';
    } else if (line.startsWith('PASS')) {
      color = '#4ade80'; // Xanh lá
    } else if (line.startsWith('FAIL') || line.startsWith('THIẾU')) {
      color = '#f7768e'; // Đỏ
    } else if (line.startsWith('KHÔNG KẾT LUẬN')) {
      color = '#e0af68'; // Vàng
    }
    const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<div style="color:${color};font-family:Consolas, 'Courier New', monospace;white-space:pre;">${escaped}</div>`;
  }).join('');
}

function renderTestsPanel(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="tests-panel" style="display:flex;flex-direction:column;gap:14px;padding:16px;background:rgba(24,24,37,0.85);backdrop-filter:blur(10px);border-radius:12px;border:1px solid rgba(125,207,255,0.25);box-shadow:0 8px 24px rgba(0,0,0,0.35);">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button type="button" class="primary-btn" id="btnRunAllTests" style="display:inline-flex;align-items:center;gap:6px;padding:9px 16px;font-weight:700;font-size:13px;background:linear-gradient(135deg, #7aa2f7, #bb9af7);color:#1a1b26;border:none;border-radius:8px;cursor:pointer;box-shadow:0 4px 12px rgba(122,162,247,0.35);transition:all 0.2s ease;">
            ▶️ Chạy tất cả test
          </button>
          <button type="button" class="secondary-btn" id="btnCopyTestReport" style="display:inline-flex;align-items:center;gap:6px;padding:9px 14px;font-weight:600;font-size:13px;background:rgba(49,50,68,0.7);color:#cdd6f4;border:1px solid #45475a;border-radius:8px;cursor:pointer;transition:all 0.2s ease;">
            📋 Sao chép báo cáo
          </button>
          <button type="button" class="secondary-btn" id="btnSelfCheckRunner" style="display:inline-flex;align-items:center;gap:6px;padding:9px 12px;font-size:12px;background:rgba(30,30,46,0.7);color:#a6adc8;border:1px solid #313244;border-radius:8px;cursor:pointer;transition:all 0.2s ease;">
            🔍 Tự kiểm tra bộ chạy (Self-Check)
          </button>
        </div>
        <div id="testsStatusIndicator" style="font-size:13px;font-weight:600;color:#a6adc8;">
          Chưa chạy kiểm thử
        </div>
      </div>
      <div style="background:#11121d;border:1px solid #24283b;border-radius:8px;padding:14px;max-height:480px;overflow-y:auto;box-shadow:inset 0 2px 6px rgba(0,0,0,0.6);">
        <pre id="testReportPre" style="margin:0;font-family:'JetBrains Mono','Fira Code',Consolas,monospace;font-size:12px;line-height:1.65;color:#a6adc8;">Chưa có kết quả kiểm thử. Nhấn "Chạy tất cả test" để bắt đầu.</pre>
      </div>
    </div>
  `;

  const btnRun = container.querySelector('#btnRunAllTests');
  const btnCopy = container.querySelector('#btnCopyTestReport');
  const btnCheck = container.querySelector('#btnSelfCheckRunner');
  const pre = container.querySelector('#testReportPre');
  const statusInd = container.querySelector('#testsStatusIndicator');

  if (btnRun) {
    btnRun.onclick = async () => {
      const ok = confirm("Dự án hiện tại sẽ được khôi phục sau khi chạy, nhưng lịch sử hoàn tác sẽ mất. Tiếp tục?");
      if (!ok) return;
      btnRun.disabled = true;
      btnRun.textContent = "⏳ Đang chạy...";
      if (statusInd) statusInd.textContent = "Đang chạy kiểm thử...";
      try {
        await runAllTests();
        const rep = testReport();
        if (pre) pre.innerHTML = renderReportHTML(rep);
        const passN = Tests.results.filter(x => x.status === 'PASS').length;
        const total = Tests.results.length;
        if (statusInd) {
          statusInd.innerHTML = `<span style="color:${passN === total ? '#4ade80' : '#f7768e'}; font-weight:bold;">${passN}/${total} PASS</span>`;
        }
      } catch (err) {
        if (pre) pre.textContent = "Lỗi khi chạy bộ test: " + err.message;
      } finally {
        btnRun.disabled = false;
        btnRun.textContent = "▶️ Chạy tất cả test";
      }
    };
  }

  if (btnCopy) {
    btnCopy.onclick = async () => {
      const rep = testReport();
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(rep);
        } else {
          const ta = document.createElement('textarea');
          ta.value = rep;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        const oldText = btnCopy.textContent;
        btnCopy.textContent = "✅ Đã sao chép!";
        setTimeout(() => { btnCopy.textContent = oldText; }, 2000);
      } catch (e) {
        alert("Không thể sao chép tự động: " + e.message);
      }
    };
  }

  if (btnCheck) {
    btnCheck.onclick = async () => {
      btnCheck.disabled = true;
      btnCheck.textContent = "⏳ Đang kiểm tra...";
      try {
        await selfCheckRunner();
        if (pre) pre.innerHTML = `<div style="color:#4ade80;font-family:monospace;">PASS runner (Bộ chạy test tự kiểm tra hoàn toàn chính xác)</div>`;
      } catch (e) {
        if (pre) pre.innerHTML = `<div style="color:#f7768e;font-family:monospace;">FAIL runner: ${e.message}</div>`;
      } finally {
        btnCheck.disabled = false;
        btnCheck.textContent = "🔍 Tự kiểm tra bộ chạy (Self-Check)";
      }
    };
  }
}

if (typeof document !== 'undefined') {
  const mount = () => {
    const el = document.getElementById('testsPanelMount');
    if (el) renderTestsPanel(el);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}

// -----------------------------------------------------------------------------
// EXPORTS
// -----------------------------------------------------------------------------
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Tests,
    REQUIRED_TESTS,
    snapGlobals,
    restoreGlobals,
    discoverTests,
    runAllTests,
    testReport,
    selfCheckRunner,
    renderReportHTML,
    renderTestsPanel
  };
}

if (typeof window !== 'undefined') {
  window.Tests = Tests;
  window.REQUIRED_TESTS = REQUIRED_TESTS;
  window.snapGlobals = snapGlobals;
  window.restoreGlobals = restoreGlobals;
  window.discoverTests = discoverTests;
  window.runAllTests = runAllTests;
  window.selfCheckRunner = selfCheckRunner;
  window.renderReportHTML = renderReportHTML;
  window.renderTestsPanel = renderTestsPanel;
  Tests.testReport = testReport;
}

if (typeof global !== 'undefined') {
  global.Tests = Tests;
  global.REQUIRED_TESTS = REQUIRED_TESTS;
  global.snapGlobals = snapGlobals;
  global.restoreGlobals = restoreGlobals;
  global.discoverTests = discoverTests;
  global.runAllTests = runAllTests;
  global.selfCheckRunner = selfCheckRunner;
  global.renderReportHTML = renderReportHTML;
  global.renderTestsPanel = renderTestsPanel;
  Tests.testReport = testReport;
}
