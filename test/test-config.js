/**
 * test-config.js - Kiểm thử Thẻ C0: config.js (Đóng băng CFG & Đơn vị ‰)
 */

// Thiết lập môi trường Canvas 2D mock cho Node.js unit test
function createMockCanvas(w, h) {
  let width = w || 0;
  let height = h || 0;
  let buffer = new Uint8ClampedArray(Math.max(1, width * height * 4));

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
    getContext(type) {
      if (type === '2d') {
        return {
          canvas,
          fillStyle: '#000000',
          globalAlpha: 1.0,
          fillRect() {},
          clearRect() {},
          drawImage() {},
          getImageData(x, y, rw, rh) {
            return { width: rw, height: rh, data: new Uint8ClampedArray(rw * rh * 4) };
          },
          putImageData() {}
        };
      }
      return null;
    }
  };
  return canvas;
}

if (typeof document === 'undefined') {
  global.document = {
    createElement(tag) {
      if (tag === 'canvas') return createMockCanvas();
      return {
        style: {},
        dataset: {},
        classList: { add() {}, remove() {} },
        appendChild() {},
        querySelectorAll() { return []; },
        querySelector() { return null; }
      };
    },
    getElementById() { return null; },
    head: { appendChild() {} }
  };
}

if (typeof window === 'undefined') {
  global.window = global;
}

// Nạp các hàm lõi từ config.js và layers.js
const { CFG, deepFreeze, unitPx, ampPx } = require('../renderer/config.js');
const { Project, initProject, makeCanvas } = require('../renderer/layers.js');

// Gán toàn cục để hàm test chạy nguyên văn không phụ thuộc ngữ cảnh require
global.CFG = CFG;
global.deepFreeze = deepFreeze;
global.unitPx = unitPx;
global.ampPx = ampPx;
global.Project = Project;
global.initProject = initProject;
global.makeCanvas = makeCanvas;

// BÀI TEST CHÉP NGUYÊN VĂN:
function testConfig() {
  const bad = [];
  try { CFG.loop.seconds = 99; } catch (e) {}
  if (CFG.loop.seconds === 99) bad.push('CFG chưa đóng băng');
  for (const t of ['breathe', 'sway', 'drift', 'ripple']) if (!(CFG.motion.limit[t] > 0)) bad.push('limit ' + t);
  if (CFG.presets[CFG.defaultPreset].maxActive !== CFG.load.maxActive) bad.push('preset mặc định lệch load.maxActive');
  const maxLimit = Math.max(...Object.values(CFG.motion.limit));
  for (const [n, p] of Object.entries(CFG.presets)) {
    if (p.loopSec < CFG.loop.min || p.loopSec > CFG.loop.max) bad.push('loopSec ' + n);
    if (p.chaosMax > CFG.motion.chaosMax) bad.push('chaosMax ' + n);
    if (p.maxAmp > maxLimit) bad.push('maxAmp ' + n);
  }
  if (CFG.motion.defaultAmp > CFG.motion.limit.breathe) bad.push('defaultAmp vượt giới hạn');
  if (CFG.loop.seconds < CFG.loop.min || CFG.loop.seconds > CFG.loop.max) bad.push('loop mặc định ngoài khoảng');
  initProject(makeCanvas(1000, 500));
  if (Math.abs(unitPx() - 1) > 1e-9) bad.push('unitPx');
  if (Math.abs(ampPx('sway', 99) - 3) > 1e-9) bad.push('ampPx không kẹp giới hạn');
  console.log(bad.length ? 'FAIL config ' + bad : 'PASS config');
  return bad.length === 0;
}

if (require.main === module) {
  const ok = testConfig();
  if (!ok) process.exit(1);
}

module.exports = { testConfig };
