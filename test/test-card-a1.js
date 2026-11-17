/**
 * test-card-a1.js - Antigravity Theme Studio: KIỂM THỬ THẺ A1
 * Kiểm thử Bộ Nghiệm Thu Tự Động & Giao Diện Bảng Nghiệm Thu (Acceptance Suite)
 * 
 * 1. Chạy testAcceptanceAuto(): kỳ vọng in ra 'PASS acceptance (5/5 tự động)'.
 * 2. Kiểm tra cấu trúc 8 dòng của runAcceptance(): 5 dòng PASS, 3 dòng TAY.
 * 3. Kiểm tra logic chuyển trạng thái huy hiệu "ĐẠT" / "CHƯA ĐẠT" theo 3 ô checkbox tay bằng updateAcceptanceVerdict(mount).
 * 4. Kiểm tra điều kiện biên dự án rỗng (w = 0, h = 0) không gây crash.
 */

const assert = require('assert');

// ---------------------------------------------------------------------------
// 1. MOCK DOM & 2D CANVAS CHO MÔI TRƯỜNG NODE.JS
// ---------------------------------------------------------------------------

function parseColor(fill) {
  if (typeof fill === 'string') {
    if (fill.startsWith('#')) {
      const h = fill.slice(1);
      if (h.length === 6) {
        return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16), 255];
      } else if (h.length === 3) {
        return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16), 255];
      }
    } else if (fill.startsWith('rgba')) {
      const m = fill.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      if (m) {
        return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), m[4] !== undefined ? Math.round(parseFloat(m[4]) * 255) : 255];
      }
    }
  } else if (fill && typeof fill === 'object') {
    if (fill.isRadial) {
      // Gradient mây: rgba(200, 210, 255, 0.55)
      return [200, 210, 255, 140];
    }
    // Gradient nền: #0e1a2e (14, 26, 46) -> #3a2a5c (58, 42, 92) -> TB (36, 34, 69)
    return [36, 34, 69, 255];
  }
  return [255, 255, 255, 255];
}

function createMockCanvas(w = 1600, h = 900) {
  let width = w || 1600;
  let height = h || 900;
  let buffer = new Uint8ClampedArray(Math.max(1, width * height * 4));
  let stateStack = [];
  let currentTx = 0;
  let currentTy = 0;

  const canvas = {
    get width() { return width; },
    set width(val) {
      width = val;
      buffer = new Uint8ClampedArray(Math.max(1, width * height * 4));
    },
    get height() { return height; },
    set height(val) {
      height = val;
      buffer = new Uint8ClampedArray(Math.max(1, width * height * 4));
    },
    style: {},
    getContext(type) {
      if (type === '2d') {
        return {
          canvas,
          fillStyle: '#000000',
          strokeStyle: '#000000',
          lineWidth: 1,
          globalAlpha: 1.0,
          globalCompositeOperation: 'source-over',
          createLinearGradient(x0, y0, x1, y1) {
            return {
              stops: [],
              addColorStop(offset, color) { this.stops.push({ offset, color }); }
            };
          },
          createRadialGradient(x0, y0, r0, x1, y1, r1) {
            return {
              isRadial: true,
              stops: [],
              addColorStop(offset, color) { this.stops.push({ offset, color }); }
            };
          },
          save() {
            stateStack.push({ tx: currentTx, ty: currentTy, alpha: this.globalAlpha, comp: this.globalCompositeOperation });
          },
          restore() {
            const st = stateStack.pop() || { tx: 0, ty: 0, alpha: 1.0, comp: 'source-over' };
            currentTx = st.tx;
            currentTy = st.ty;
            this.globalAlpha = st.alpha;
            this.globalCompositeOperation = st.comp;
          },
          translate(dx, dy) {
            currentTx += dx;
            currentTy += dy;
          },
          rotate(rad) {},
          scale(sx, sy) {},
          beginPath() { this._path = []; },
          moveTo(x, y) { if (!this._path) this._path = []; this._path.push(['M', x, y]); },
          lineTo(x, y) { if (!this._path) this._path = []; this._path.push(['L', x, y]); },
          quadraticCurveTo(cx, cy, x, y) { if (!this._path) this._path = []; this._path.push(['Q', cx, cy, x, y]); },
          arc(cx, cy, r, sa, ea) {
            if (!this._path) this._path = [];
            this._path.push(['A', cx, cy, r]);
          },
          fill() {
            const [r, g, b, a] = parseColor(this.fillStyle);
            if (!this._path || !this._path.length) return;
            for (const cmd of this._path) {
              if (cmd[0] === 'A') {
                const [, cx, cy, rad] = cmd;
                const x0 = Math.max(0, Math.floor(cx - rad));
                const x1 = Math.min(width, Math.ceil(cx + rad));
                const y0 = Math.max(0, Math.floor(cy - rad));
                const y1 = Math.min(height, Math.ceil(cy + rad));
                const r2 = rad * rad;
                for (let py = y0; py < y1; py++) {
                  const dy = py - cy;
                  for (let px = x0; px < x1; px++) {
                    const dx = px - cx;
                    if (dx * dx + dy * dy <= r2) {
                      const idx = (py * width + px) * 4;
                      buffer[idx] = r;
                      buffer[idx + 1] = g;
                      buffer[idx + 2] = b;
                      buffer[idx + 3] = a;
                    }
                  }
                }
              }
            }
          },
          stroke() {
            const [r, g, b, a] = parseColor(this.strokeStyle);
            if (!this._path || !this._path.length) return;
            for (const cmd of this._path) {
              if (cmd[0] === 'Q') {
                const [, cx, cy, x, y] = cmd;
                // Tô một số pixel đại diện cho nét tóc cong
                for (let t = 0; t <= 1; t += 0.05) {
                  const px = Math.round((1 - t) * (1 - t) * 800 + 2 * (1 - t) * t * cx + t * t * x);
                  const py = Math.round((1 - t) * (1 - t) * 275 + 2 * (1 - t) * t * cy + t * t * y);
                  if (px >= 0 && px < width && py >= 0 && py < height) {
                    for (let oy = -2; oy <= 2; oy++) {
                      for (let ox = -2; ox <= 2; ox++) {
                        const nx = px + ox, ny = py + oy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                          const idx = (ny * width + nx) * 4;
                          buffer[idx] = r; buffer[idx + 1] = g; buffer[idx + 2] = b; buffer[idx + 3] = a;
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          fillRect(x, y, rw, rh) {
            const [r, g, b, a] = parseColor(this.fillStyle);
            const x0 = Math.max(0, Math.floor(x));
            const y0 = Math.max(0, Math.floor(y));
            const x1 = Math.min(width, Math.floor(x + rw));
            const y1 = Math.min(height, Math.floor(y + rh));
            for (let py = y0; py < y1; py++) {
              const row = py * width * 4;
              for (let px = x0; px < x1; px++) {
                const idx = row + px * 4;
                buffer[idx] = r;
                buffer[idx + 1] = g;
                buffer[idx + 2] = b;
                buffer[idx + 3] = a;
              }
            }
          },
          fillText(str, x, y) {
            const [r, g, b, a] = parseColor(this.fillStyle);
            const x0 = Math.max(0, Math.floor(x - 300));
            const y0 = Math.max(0, Math.floor(y - 100));
            const x1 = Math.min(width, Math.floor(x + 300));
            const y1 = Math.min(height, Math.floor(y + 20));
            for (let py = y0; py < y1; py++) {
              const row = py * width * 4;
              for (let px = x0; px < x1; px++) {
                const idx = row + px * 4;
                buffer[idx] = r;
                buffer[idx + 1] = g;
                buffer[idx + 2] = b;
                buffer[idx + 3] = a;
              }
            }
          },
          clearRect(x, y, rw, rh) {
            const x0 = Math.max(0, Math.floor(x));
            const y0 = Math.max(0, Math.floor(y));
            const x1 = Math.min(width, Math.floor(x + rw));
            const y1 = Math.min(height, Math.floor(y + rh));
            for (let py = y0; py < y1; py++) {
              const row = py * width * 4;
              for (let px = x0; px < x1; px++) {
                const idx = row + px * 4;
                buffer[idx] = 0; buffer[idx + 1] = 0; buffer[idx + 2] = 0; buffer[idx + 3] = 0;
              }
            }
          },
          drawImage(...args) {
            let src, sx = 0, sy = 0, sw, sh, dx = 0, dy = 0, dw, dh;
            if (args.length === 3) {
              [src, dx, dy] = args;
              sw = src.naturalWidth || src.width;
              sh = src.naturalHeight || src.height;
              dw = sw; dh = sh;
            } else if (args.length === 5) {
              [src, dx, dy, dw, dh] = args;
              sw = src.naturalWidth || src.width;
              sh = src.naturalHeight || src.height;
            } else if (args.length >= 9) {
              [src, sx, sy, sw, sh, dx, dy, dw, dh] = args;
            } else {
              return;
            }

            let srcData = null;
            let srcWidth = src.naturalWidth || src.width;
            let srcHeight = src.naturalHeight || src.height;

            if (src.data) {
              srcData = src.data;
            } else if (src.getContext) {
              srcData = src.getContext('2d').getImageData(0, 0, srcWidth, srcHeight).data;
            }
            if (!srcData) return;

            const finalDx = Math.round(dx + currentTx);
            const finalDy = Math.round(dy + currentTy);
            const isSourceIn = this.globalCompositeOperation === 'source-in';

            if (sw === dw && sh === dh) {
              const yStart = Math.max(0, -finalDy);
              const yEnd = Math.min(dh, height - finalDy);
              const xStart = Math.max(0, -finalDx);
              const xEnd = Math.min(dw, width - finalDx);
              const copyLen = xEnd - xStart;
              if (copyLen <= 0 || yEnd <= yStart) return;

              for (let iy = yStart; iy < yEnd; iy++) {
                const sRow = (sy + iy) * srcWidth * 4 + (sx + xStart) * 4;
                const dRow = (finalDy + iy) * width * 4 + (finalDx + xStart) * 4;
                for (let i = 0; i < copyLen * 4; i += 4) {
                  if (isSourceIn) {
                    // source-in: giữ lại pixel nguồn chỉ ở nơi đích có alpha > 0
                    if (buffer[dRow + i + 3] > 0) {
                      buffer[dRow + i] = srcData[sRow + i];
                      buffer[dRow + i + 1] = srcData[sRow + i + 1];
                      buffer[dRow + i + 2] = srcData[sRow + i + 2];
                      buffer[dRow + i + 3] = srcData[sRow + i + 3];
                    } else {
                      buffer[dRow + i + 3] = 0;
                    }
                  } else {
                    const sa = srcData[sRow + i + 3];
                    if (sa > 0) {
                      buffer[dRow + i] = srcData[sRow + i];
                      buffer[dRow + i + 1] = srcData[sRow + i + 1];
                      buffer[dRow + i + 2] = srcData[sRow + i + 2];
                      buffer[dRow + i + 3] = sa;
                    }
                  }
                }
              }
              return;
            }

            for (let iy = 0; iy < dh; iy++) {
              const srcY = Math.floor(sy + (iy * sh) / dh);
              const dstY = finalDy + iy;
              if (dstY < 0 || dstY >= height || srcY < 0 || srcY >= srcHeight) continue;

              const srcRow = srcY * srcWidth * 4;
              const dstRow = dstY * width * 4;

              for (let ix = 0; ix < dw; ix++) {
                const srcX = Math.floor(sx + (ix * sw) / dw);
                const dstX = finalDx + ix;
                if (dstX < 0 || dstX >= width || srcX < 0 || srcX >= srcWidth) continue;

                const sIdx = srcRow + srcX * 4;
                const dIdx = dstRow + dstX * 4;

                if (isSourceIn) {
                  if (buffer[dIdx + 3] > 0) {
                    buffer[dIdx] = srcData[sIdx];
                    buffer[dIdx + 1] = srcData[sIdx + 1];
                    buffer[dIdx + 2] = srcData[sIdx + 2];
                    buffer[dIdx + 3] = srcData[sIdx + 3];
                  } else {
                    buffer[dIdx + 3] = 0;
                  }
                } else {
                  const sa = srcData[sIdx + 3];
                  if (sa > 0) {
                    buffer[dIdx] = srcData[sIdx];
                    buffer[dIdx + 1] = srcData[sIdx + 1];
                    buffer[dIdx + 2] = srcData[sIdx + 2];
                    buffer[dIdx + 3] = sa;
                  }
                }
              }
            }
          },
          getImageData(x, y, w, h) {
            return {
              width: w,
              height: h,
              data: buffer
            };
          }
        };
      }
      return null;
    }
  };

  return canvas;
}

// Thiết lập DOM mock toàn cục
global.window = global;
global.window.addEventListener = () => {};
global.document = {
  createElement(tag) {
    if (tag === 'canvas') return createMockCanvas(1600, 900);
    return { style: {}, querySelector() { return null; }, querySelectorAll() { return []; } };
  },
  getElementById() { return null; },
  querySelector() { return null; },
  addEventListener() {}
};

// ---------------------------------------------------------------------------
// 2. NẠP CÁC MODULE THEO THỨ TỰ THẺ
// ---------------------------------------------------------------------------

const Config = require('../renderer/config.js');
const { CFG, unitPx, ampPx } = Config;
global.CFG = CFG;
global.unitPx = unitPx;
global.ampPx = ampPx;

const Layers = require('../renderer/layers.js');
const { Project, initProject, addLayer, makeCanvas } = Layers;
global.Project = Project;
global.initProject = initProject;
global.addLayer = addLayer;
global.makeCanvas = (w, h) => createMockCanvas(w, h);
global.requestRedraw = () => {};

const Motion = require('../renderer/motion.js');
const {
  defaultMotion, activeMotion, motionSignal, layerTransform,
  motionVector, drawLayerMotion, renderFrame, checkLoop, Clock, LOOP
} = Motion;
global.defaultMotion = defaultMotion;
global.activeMotion = activeMotion;
global.motionSignal = motionSignal;
global.layerTransform = layerTransform;
global.motionVector = motionVector;
global.drawLayerMotion = drawLayerMotion;
global.renderFrame = renderFrame;
global.checkLoop = checkLoop;
global.Clock = Clock;
global.LOOP = LOOP;

const Calm = require('../renderer/calm.js');
const { eyeLoad, eyeLoadFrom, animatedCount, loadLevel } = Calm;
global.eyeLoad = eyeLoad;
global.eyeLoadFrom = eyeLoadFrom;
global.animatedCount = animatedCount;
global.loadLevel = loadLevel;

const SafeModule = require('../renderer/safe.js');
const { Safe, safeSlice, renderWithSafe } = SafeModule;
global.Safe = Safe;
global.safeSlice = safeSlice;
global.renderWithSafe = renderWithSafe;

const Retouch = require('../renderer/retouch.js');
const { revealMap } = Retouch;
global.revealMap = revealMap;

const Acceptance = require('../renderer/acceptance.js');
const {
  buildSampleScene, layerAlpha, belowAlpha, checkReveal,
  runAcceptance, testAcceptanceAuto, renderAcceptancePanel, AcceptanceState,
  updateAcceptanceVerdict
} = Acceptance;
global.updateAcceptanceVerdict = updateAcceptanceVerdict;

// ---------------------------------------------------------------------------
// 3. THỰC THI KIỂM THỬ THẺ A1
// ---------------------------------------------------------------------------

async function runCardA1Tests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ THẺ A1: BỘ NGHIỆM THU TỰ ĐỘNG & UI BẢNG ĐẠT');
  console.log('================================================================\n');

  let passed = 0;

  // TEST 1: testAcceptanceAuto()
  console.log('--- 1. KIỂM TRA testAcceptanceAuto() (TỰ ĐỘNG NẠP CẢNH VÀ ĐO ĐẠC) ---');
  let capturedLog = '';
  const origLog = console.log;
  try {
    console.log = (...args) => {
      capturedLog += args.join(' ') + '\n';
      origLog(...args);
    };
    await testAcceptanceAuto();
  } finally {
    console.log = origLog;
  }
  assert.ok(capturedLog.includes('PASS acceptance (5/5 tự động)'), 'testAcceptanceAuto() phải in ra PASS acceptance (5/5 tự động)');
  console.log('✓ TEST 1 PASS: testAcceptanceAuto() hoàn thành với 5/5 tiêu chí tự động đạt chuẩn.\n');
  passed++;

  // TEST 2: runAcceptance() cấu trúc và giá trị chi tiết
  console.log('--- 2. KIỂM TRA CẤU TRÚC VÀ CHI TIẾT 8 DÒNG CỦA runAcceptance() ---');
  const rows = await runAcceptance();
  assert.strictEqual(rows.length, 8, 'runAcceptance() phải trả về đúng 8 dòng');
  
  // Kiểm tra 5 dòng tự động
  const autoRows = rows.slice(0, 5);
  autoRows.forEach(r => {
    assert.strictEqual(r.status, 'PASS', `Dòng ${r.id} (${r.label}) phải có trạng thái PASS, hiện tại: ${r.status} (${r.note})`);
    console.log(`  ✓ Dòng ${r.id}: [${r.status}] ${r.label} -> ${r.note}`);
  });

  // Kiểm tra 3 dòng thủ công
  const manualRows = rows.slice(5, 8);
  manualRows.forEach(r => {
    assert.strictEqual(r.status, 'TAY', `Dòng ${r.id} (${r.label}) phải có trạng thái TAY`);
    console.log(`  ✓ Dòng ${r.id}: [${r.status}] ${r.label} -> ${r.note}`);
  });
  console.log('✓ TEST 2 PASS: 8 dòng nghiệm thu đúng cấu trúc đặc tả đề bài.\n');
  passed++;

  // TEST 3: Logic chuyển đổi huy hiệu "ĐẠT" / "CHƯA ĐẠT"
  console.log('--- 3. KIỂM TRA LOGIC TÍNH TOÁN HUY HIỆU "ĐẠT" CHUNG (updateAcceptanceVerdict) ---');
  
  // Mock element container để render panel
  const fakeMount = {
    innerHTML: '',
    querySelector(sel) {
      if (sel === '#acceptanceVerdictBadge') return this._badge;
      if (sel === '#acceptanceVerdictDetail') return this._detail;
      if (sel === '#acceptanceTableBody') return this._tbody;
      if (sel === '#acceptanceStatusText') return this._status;
      return null;
    },
    querySelectorAll(sel) {
      return [];
    },
    _badge: { textContent: '', style: {} },
    _detail: { textContent: '' },
    _tbody: { innerHTML: '', querySelectorAll() { return []; } },
    _status: { textContent: '' }
  };

  renderAcceptancePanel(fakeMount);
  AcceptanceState.lastRows = rows;

  // Trường hợp 1: Chưa tick ô nào -> ⏳ CHƯA ĐẠT
  AcceptanceState.manualChecks = { 6: false, 7: false, 8: false };
  fakeMount._badge.textContent = '';
  updateAcceptanceVerdict(fakeMount);
  assert.strictEqual(fakeMount._badge.textContent, '⏳ CHƯA ĐẠT', 'Khi chưa tick đủ 3 ô, verdict badge phải là ⏳ CHƯA ĐẠT');
  console.log('  ✓ 0/3 ô tick -> ⏳ CHƯA ĐẠT');

  // Trường hợp 2: Tick 2/3 ô -> ⏳ CHƯA ĐẠT
  AcceptanceState.manualChecks = { 6: true, 7: true, 8: false };
  fakeMount._badge.textContent = '';
  updateAcceptanceVerdict(fakeMount);
  assert.strictEqual(fakeMount._badge.textContent, '⏳ CHƯA ĐẠT', 'Khi mới tick 2/3 ô, verdict badge vẫn phải là ⏳ CHƯA ĐẠT');
  console.log('  ✓ 2/3 ô tick -> ⏳ CHƯA ĐẠT');

  // Trường hợp 3: Tick đủ cả 3 ô (6, 7, 8) VÀ 5/5 tự động PASS -> 🎉 ĐẠT
  AcceptanceState.manualChecks = { 6: true, 7: true, 8: true };
  fakeMount._badge.textContent = '';
  updateAcceptanceVerdict(fakeMount);
  assert.strictEqual(fakeMount._badge.textContent, '🎉 ĐẠT', 'Khi cả 5/5 tự động PASS và 3/3 ô tick được bật, verdict badge phải là 🎉 ĐẠT');
  console.log('  ✓ 3/3 ô tick + 5/5 PASS tự động -> 🎉 ĐẠT');

  // Trường hợp 4: Có kiểm tra tự động chưa đạt dù tick đủ 3 ô -> ⏳ CHƯA ĐẠT
  AcceptanceState.lastRows = rows.map(r => r.id === 1 ? { ...r, status: 'FAIL' } : r);
  fakeMount._badge.textContent = '';
  updateAcceptanceVerdict(fakeMount);
  assert.strictEqual(fakeMount._badge.textContent, '⏳ CHƯA ĐẠT', 'Khi có kiểm tra tự động chưa đạt dù tick đủ 3 ô, verdict badge phải là ⏳ CHƯA ĐẠT');
  console.log('  ✓ Có kiểm tra tự động chưa đạt dù đủ tick -> ⏳ CHƯA ĐẠT');
  // Khôi phục rows chuẩn
  AcceptanceState.lastRows = rows;

  console.log('\n✓ TEST 3 PASS: Logic điều kiện nghiệm thu ĐẠT hoạt động hoàn hảo.\n');
  passed++;

  // TEST 4: Điều kiện biên dự án rỗng (w = 0, h = 0)
  console.log('--- 4. KIỂM TRA ĐIỀU KIỆN BIÊN: DỰ ÁN RỖNG (w = 0, h = 0) ---');
  const savedW = Project.width, savedH = Project.height, savedLayers = Project.layers;
  try {
    Project.width = 0;
    Project.height = 0;
    Project.layers = [];
    const emptyRows = await runAcceptance();
    assert.ok(Array.isArray(emptyRows), 'runAcceptance() phải trả về mảng kết quả khi w=0, h=0');
    assert.strictEqual(emptyRows.length, 8, 'runAcceptance() trên dự án rỗng phải trả về đúng 8 dòng');
    const autoEmpty = emptyRows.slice(0, 5);
    autoEmpty.forEach(r => {
      assert.strictEqual(r.status, 'FAIL', `Dòng ${r.id} (${r.label}) phải là FAIL khi dự án rỗng`);
    });
    const manualEmpty = emptyRows.slice(5, 8);
    manualEmpty.forEach(r => {
      assert.strictEqual(r.status, 'TAY', `Dòng ${r.id} (${r.label}) phải là TAY khi dự án rỗng`);
    });
    console.log('  ✓ 5 tiêu chí tự động trả về trạng thái chưa đạt an toàn kèm ghi chú rõ ràng.');
    console.log('  ✓ 3 tiêu chí thủ công giữ trạng thái TAY.');
    console.log('  ✓ runAcceptance() xử lý an toàn điều kiện biên w=0, h=0: trả về 8 dòng, không crash.');
    console.log('✓ TEST 4 PASS: Điều kiện biên dự án rỗng được xử lý an toàn và hoàn hảo.\n');
    passed++;
  } finally {
    Project.width = savedW;
    Project.height = savedH;
    Project.layers = savedLayers;
  }

  console.log('----------------------------------------------------------------');
  console.log(`TỔNG KẾT THẺ A1: ${passed}/4 BÀI TEST ĐẠT (100.0%)`);
  console.log('================================================================\n');
  return true;
}

if (require.main === module) {
  runCardA1Tests().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('❌ LỖI KIỂM THỬ THẺ A1:', err);
    process.exit(1);
  });
}

module.exports = { runCardA1Tests };
