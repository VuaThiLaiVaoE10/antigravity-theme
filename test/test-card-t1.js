/**
 * test-card-t1.js - KIỂM THỬ THẺ T1 (tests.js & In-App Test Runner)
 * 1. selfCheckRunner() -> PASS runner
 * 2. runAllTests() -> Chạy tất cả test và báo kết quả testReport()
 */

const { performance } = require('perf_hooks');

// 1. Thiết lập môi trường DOM Mock hoàn chỉnh cho Node.js
function pointInPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function createMockCanvas(w = 4, h = 4) {
  let width = w || 4;
  let height = h || 4;
  let buffer = new Uint8ClampedArray(Math.max(1, width * height * 4));
  let currentPath = [];

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
    toBlob(callback, type = 'image/png') {
      const payload = JSON.stringify({
        w: width,
        h: height,
        data: Array.from(buffer)
      });
      const bytes = new TextEncoder().encode(payload);
      const b = new Blob([bytes], { type });
      callback(b);
    },
    getContext(type) {
      if (type === '2d') {
        return {
          canvas,
          fillStyle: '#000',
          strokeStyle: '#000',
          lineWidth: 1,
          globalAlpha: 1.0,
          filter: 'none',
          globalCompositeOperation: 'source-over',
          save() {},
          restore() {},
          translate() {},
          rotate() {},
          scale() {},
          beginPath() { currentPath = []; },
          moveTo(x, y) { currentPath.push({ x, y }); },
          lineTo(x, y) { currentPath.push({ x, y }); },
          closePath() {},
          stroke() {},
          fill() {
            if (currentPath.length < 3) return;
            for (let py = 0; py < height; py++) {
              for (let px = 0; px < width; px++) {
                if (pointInPolygon(px + 0.5, py + 0.5, currentPath)) {
                  const idx = (py * width + px) * 4;
                  buffer[idx] = 255;
                  buffer[idx + 1] = 255;
                  buffer[idx + 2] = 255;
                  buffer[idx + 3] = 255;
                }
              }
            }
          },
          fillRect(x, y, rw, rh) {
            let r = 0, g = 0, b = 0, a = 255;
            if (this.fillStyle === '#f00' || this.fillStyle === '#ff0000') {
              r = 255;
            } else if (this.fillStyle === '#0f0' || this.fillStyle === '#00ff00') {
              g = 255;
            } else if (this.fillStyle === '#00f' || this.fillStyle === '#0000ff') {
              b = 255;
            }
            for (let py = y; py < y + rh && py < height; py++) {
              for (let px = x; px < x + rw && px < width; px++) {
                const idx = (py * width + px) * 4;
                buffer[idx] = r;
                buffer[idx + 1] = g;
                buffer[idx + 2] = b;
                buffer[idx + 3] = a;
              }
            }
          },
          clearRect(x, y, rw, rh) {
            for (let py = y; py < y + rh && py < height; py++) {
              for (let px = x; px < x + rw && px < width; px++) {
                const idx = (py * width + px) * 4;
                buffer[idx] = 0; buffer[idx + 1] = 0; buffer[idx + 2] = 0; buffer[idx + 3] = 0;
              }
            }
          },
          drawImage(src, x = 0, y = 0, dw, dh) {
            let srcWidth = src.naturalWidth || src.width;
            let srcHeight = src.naturalHeight || src.height;
            let srcData = null;
            if (src.data) {
              srcData = src.data;
            } else if (src.getContext) {
              srcData = src.getContext('2d').getImageData(0, 0, srcWidth, srcHeight).data;
            }
            if (!srcData) return;
            for (let py = 0; py < srcHeight && py + y < height; py++) {
              for (let px = 0; px < srcWidth && px + x < width; px++) {
                const sIdx = (py * srcWidth + px) * 4;
                const dIdx = ((py + y) * width + (px + x)) * 4;
                buffer[dIdx] = srcData[sIdx];
                buffer[dIdx + 1] = srcData[sIdx + 1];
                buffer[dIdx + 2] = srcData[sIdx + 2];
                buffer[dIdx + 3] = srcData[sIdx + 3];
              }
            }
          },
          createImageData(cw, ch) {
            return new ImageData(cw, ch);
          },
          getImageData(x, y, rw, rh) {
            const sub = new Uint8ClampedArray(rw * rh * 4);
            let s = 0;
            for (let py = y; py < y + rh; py++) {
              for (let px = x; px < x + rw; px++) {
                if (py >= 0 && py < height && px >= 0 && px < width) {
                  const idx = (py * width + px) * 4;
                  sub[s++] = buffer[idx];
                  sub[s++] = buffer[idx + 1];
                  sub[s++] = buffer[idx + 2];
                  sub[s++] = buffer[idx + 3];
                } else {
                  sub[s++] = 0; sub[s++] = 0; sub[s++] = 0; sub[s++] = 0;
                }
              }
            }
            return new ImageData(sub, rw, rh);
          },
          putImageData(imgData, dx, dy) {
            const srcData = imgData.data;
            const sw = imgData.width;
            const sh = imgData.height;
            for (let py = 0; py < sh && py + dy < height; py++) {
              for (let px = 0; px < sw && px + dx < width; px++) {
                const sIdx = (py * sw + px) * 4;
                const dIdx = ((py + dy) * width + (px + dx)) * 4;
                buffer[dIdx] = srcData[sIdx];
                buffer[dIdx + 1] = srcData[sIdx + 1];
                buffer[dIdx + 2] = srcData[sIdx + 2];
                buffer[dIdx + 3] = srcData[sIdx + 3];
              }
            }
          }
        };
      }
      return null;
    }
  };
  return canvas;
}

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
  querySelector() { return null; },
  querySelectorAll() { return []; },
  head: { appendChild() {} }
};

global.window = global;
global.performance = performance;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};

global.createImageBitmap = async function (blob) {
  const ab = await blob.arrayBuffer();
  const text = new TextDecoder().decode(ab);
  let w = 4, h = 4, data = new Uint8ClampedArray(w * h * 4);
  try {
    const parsed = JSON.parse(text);
    w = parsed.w;
    h = parsed.h;
    data = new Uint8ClampedArray(parsed.data);
  } catch (e) {}
  return {
    width: w,
    height: h,
    data,
    getContext: () => ({
      getImageData: (x, y, rw, rh) => ({ data })
    })
  };
};

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

// 2. Nạp toàn bộ các module renderer vào môi trường
const Config = require('../renderer/config.js');
const Layers = require('../renderer/layers.js');
const Viewport = require('../renderer/viewport.js');
const Undo = require('../renderer/undo.js');
const Selection = require('../renderer/selection.js');
const Cut = require('../renderer/cut.js');
const Retouch = require('../renderer/retouch.js');
const ProjectIO = require('../renderer/project-io.js');
const Motion = require('../renderer/motion.js');
const Calm = require('../renderer/calm.js');
const Safe = require('../renderer/safe.js');
const Parallax = require('../renderer/parallax.js');
const CalmPresets = require('../renderer/calm-presets.js');

// Gán toàn cục cho các hàm kiểm thử
global.window.makeCanvas = Layers.makeCanvas;
global.window.initProject = Layers.initProject;
global.window.addLayer = Layers.addLayer;
global.window.getLayer = Layers.getLayer;
global.window.getActiveLayer = Layers.getActiveLayer;
global.window.Project = Layers.Project;
global.window.View = Viewport.View;
global.window.zoomAt = Viewport.zoomAt;
global.window.screenToLayer = Viewport.screenToLayer;
global.window.pushUndoPatch = Undo.pushUndoPatch;
global.window.undo = Undo.undo;
global.window.redo = Undo.redo;
global.window.withGroup = Undo.withGroup;
global.window.withStructureUndo = Undo.withStructureUndo;
global.window.beginPixelEdit = Undo.beginPixelEdit;
global.window.commitPixelEdit = Undo.commitPixelEdit;
global.window.Selection = Undo.Selection;
global.window.magicWand = Selection.magicWand;
global.window.stampBrush = Selection.stampBrush;
global.window.polygonToMask = Selection.polygonToMask;
global.window.morphMask = Selection.morphMask;
global.window.cutToLayer = Cut.cutToLayer;
global.window.cloneDab = Retouch.cloneDab;
global.window.fillHole = Retouch.fillHole;
global.window.revealMap = Retouch.revealMap;
global.window.saveProjectBlob = ProjectIO.saveProjectBlob;
global.window.loadProjectBuffer = ProjectIO.loadProjectBuffer;
global.window.migrateMeta = ProjectIO.migrateMeta;

// Gắn tất cả các hàm test vào window/global để discoverTests() tìm thấy
global.window.testConfig = Config.testConfig;
global.window.testLayers = Layers.testLayers;
global.window.testView = Viewport.testView;
global.window.testUndo = Undo.testUndo;
global.window.testWand = Selection.testWand;
global.window.testBrush = Selection.testBrush;
global.window.testLasso = Selection.testLasso;
global.window.testMorph = Selection.testMorph;
global.window.testCut = Cut.testCut;
global.window.testClone = Retouch.testClone;
global.window.testFill = Retouch.testFill;
global.window.testReveal = Retouch.testReveal;
global.window.testZip = ProjectIO.testZip;
global.window.testSaveLoad = ProjectIO.testSaveLoad;
global.window.testMigrate = ProjectIO.testMigrate;
global.window.testMotion = Motion.testMotion;
global.window.testUnits = Motion.testUnits;
global.window.testSetMotion = Motion.testSetMotion;
global.window.testLoad = Calm.testLoad;
global.window.testSafe = Safe.testSafe;
global.window.testParallax = Parallax.testParallax;
global.window.testPresets = CalmPresets.testPresets;

// 3. Nạp tests.js
const TestsModule = require('../renderer/tests.js');
const { selfCheckRunner, runAllTests, testReport, Tests, REQUIRED_TESTS, discoverTests } = TestsModule;

async function runCardT1Tests() {
  console.log('================================================================');
  console.log('🧪 BÁO CÁO KIỂM THỬ THẺ T1 (tests.js & In-App Test Runner)');
  console.log('================================================================\n');

  // Test 1: selfCheckRunner
  console.log('--- 1. CHẠY selfCheckRunner() ---');
  let selfCheckOutput = '';
  const origLog = console.log;
  console.log = (...args) => {
    selfCheckOutput += args.join(' ') + '\n';
  };
  await selfCheckRunner();
  console.log = origLog;

  const passRunner = selfCheckOutput.includes('PASS runner');
  if (passRunner) {
    console.log('PASS runner');
  } else {
    console.error('Lỗi: selfCheckRunner không trả về PASS runner!');
    process.exit(1);
  }

  // Test 2: discoverTests
  console.log('\n--- 2. KIỂM TRA discoverTests() ---');
  const found = discoverTests();
  console.log(`Tìm thấy ${found.length} bài test:`, found.join(', '));
  if (found.length < 22) {
    console.error(`Lỗi: Không tìm đủ bài test (kỳ vọng >= 22, tìm thấy ${found.length})`);
    process.exit(1);
  }

  // Test 3: runAllTests() và testReport()
  console.log('\n--- 3. CHẠY TẤT CẢ TEST QUA runAllTests() ---');
  const results = await runAllTests();
  const report = testReport();
  console.log(report);

  const failCount = results.filter(r => r.status === 'FAIL').length;
  const missingCount = results.filter(r => r.status === 'THIẾU').length;
  const passCount = results.filter(r => r.status === 'PASS').length;

  console.log('\n----------------------------------------------------------------');
  console.log(`KẾT QUẢ THẺ T1: ${passCount}/${results.length} PASS (HOÀN TẤT)`);
  console.log('================================================================');

  if (failCount > 0 || missingCount > 0) {
    console.error('Lỗi: Có bài test bị lỗi hoặc thiếu!');
    process.exit(1);
  }

  return { passRunner, results, report };
}

if (require.main === module) {
  runCardT1Tests().catch(err => {
    console.error('Lỗi ngoại lệ khi chạy test Thẻ T1:', err);
    process.exit(1);
  });
}

module.exports = { runCardT1Tests };
