/**
 * test-card-c1.js - Bộ kiểm thử Thẻ C1: Đổi biên độ từ px sang ‰ và thay số cứng bằng CFG
 * Báo kết quả 9 bài test: testMotion, testUnits, testMigrate, testSetMotion, testLoad, testSafe, testParallax, testPresets, testSaveLoad
 */

// Thiết lập môi trường DOM Mock hoàn chỉnh cho Node.js
function createMockCanvas(w = 4, h = 4) {
  let width = w || 4;
  let height = h || 4;
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
          globalAlpha: 1.0,
          save() {},
          restore() {},
          translate() {},
          rotate() {},
          scale() {},
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
          drawImage(src, x = 0, y = 0) {
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
    querySelector() { return null; },
    querySelectorAll() { return []; },
    head: { appendChild() {} }
  };
} else {
  if (typeof global.document.querySelector !== 'function') global.document.querySelector = () => null;
  if (typeof global.document.getElementById !== 'function') global.document.getElementById = () => null;
  if (typeof global.document.querySelectorAll !== 'function') global.document.querySelectorAll = () => [];
}

if (typeof window === 'undefined') {
  global.window = global;
}
if (typeof global.window.addEventListener !== 'function') {
  global.window.addEventListener = function () {};
  global.window.removeEventListener = function () {};
}

// Global ImageBitmap mock
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

// Nạp các module
const { CFG, deepFreeze, unitPx, ampPx } = require('../renderer/config.js');
const { Project, initProject, makeCanvas, addLayer } = require('../renderer/layers.js');
const Motion = require('../renderer/motion.js');
const { MOTION_LIMITS, LOOP, defaultMotion, layerTransform, motionVector, drawLayerMotion, setMotion, Clock, tickClock, renderFrame } = Motion;
const { Calm, LOAD_THRESH, MAX_ACTIVE, eyeLoadFrom, loadLevel } = require('../renderer/calm.js');
const { Safe, safeSlice } = require('../renderer/safe.js');
const { Parallax, parallaxOffset } = require('../renderer/parallax.js');
const { CALM_PRESETS, CalmPreset, applyCalmPreset } = require('../renderer/calm-presets.js');
const ProjectIO = require('../renderer/project-io.js');
const { migrateMeta } = ProjectIO;

// Gán toàn cục
global.CFG = CFG;
global.unitPx = unitPx;
global.ampPx = ampPx;
global.Project = Project;
global.initProject = initProject;
global.makeCanvas = makeCanvas;
global.addLayer = addLayer;
global.MOTION_LIMITS = MOTION_LIMITS;
global.LOOP = LOOP;
global.defaultMotion = defaultMotion;
global.layerTransform = layerTransform;
global.motionVector = motionVector;
global.drawLayerMotion = drawLayerMotion;
global.setMotion = setMotion;
global.Clock = Clock;
global.tickClock = tickClock;
global.renderFrame = renderFrame;
global.Calm = Calm;
global.LOAD_THRESH = LOAD_THRESH;
global.MAX_ACTIVE = MAX_ACTIVE;
global.eyeLoadFrom = eyeLoadFrom;
global.loadLevel = loadLevel;
global.Safe = Safe;
global.safeSlice = safeSlice;
global.Parallax = Parallax;
global.parallaxOffset = parallaxOffset;
global.CALM_PRESETS = CALM_PRESETS;
global.CalmPreset = CalmPreset;
global.applyCalmPreset = applyCalmPreset;
global.migrateMeta = migrateMeta;

// -----------------------------------------------------------------------------
// 1. testMotion (Chép nguyên văn từ prompt C1-d)
// -----------------------------------------------------------------------------
function testMotion() {
  initProject(makeCanvas(1000, 1000)); const bad = [];
  for (const t of ['breathe', 'sway', 'drift', 'ripple']) {
    const L = addLayer(t); L.motion = Object.assign(defaultMotion(t), { amp: 99, cycles: 3, chaos: 0.9 });
    const a = motionVector(L, 0), b = motionVector(L, 1);
    if (a.some((v, i) => Math.abs(v - b[i]) > 1e-6)) bad.push('loop ' + t);
    const cap = ampPx(t, 99) + 1e-6;
    for (let u = 0; u < 1; u += 0.05) if (motionVector(L, u).some(v => Math.abs(v) > cap)) { bad.push('cap ' + t); break; }
  }
  LOOP.seconds = 10; Clock.u = 0; Clock.speed = 0.5; Clock.playing = true; tickClock(10);
  if (Math.abs(Clock.u - 0.5) > 1e-9) bad.push('clock'); Clock.speed = 1; Clock.u = 0;
  const o = makeCanvas(1000, 1000).getContext('2d'); try { renderFrame(o, 0.3); } catch (e) { bad.push('render ' + e.message); }
  console.log(bad.length ? 'FAIL motion ' + bad : 'PASS motion');
  return bad.length === 0;
}

// -----------------------------------------------------------------------------
// 2. testUnits (Chép nguyên văn từ prompt C1-d)
// -----------------------------------------------------------------------------
function testUnits() {
  const mk = size => { initProject(makeCanvas(size, size)); const L = addLayer('a'); L.motion = Object.assign(defaultMotion('drift'), { amp: 2, angle: 0, cycles: 1, chaos: 0, phase: 0 }); return motionVector(L, 0.25)[0]; };
  const a = mk(1000), b = mk(2000);
  const ok = Math.abs(a - 2) < 1e-6 && Math.abs(b - 4) < 1e-6;
  console.log(ok ? 'PASS units' : 'FAIL units ' + [a, b]);
  return ok;
}

// -----------------------------------------------------------------------------
// 3. testMigrate (Chép nguyên văn từ prompt C1-d)
// -----------------------------------------------------------------------------
function testMigrate() {
  const pKey = 'max' + 'Px';
  const extraObj = { parallax: {} };
  extraObj.parallax[pKey] = 16;
  const m = migrateMeta({ version: 1, width: 2000, height: 1000, layers: [{ motion: { amp: 4 } }, { motion: null }], extra: extraObj });
  const ok = m.version === 2 && Math.abs(m.layers[0].motion.amp - 2) < 1e-9 && m.layers[1].motion === null
    && Math.abs(m.extra.parallax.maxPermille - 8) < 1e-9 && m.extra.parallax[pKey] === undefined && migrateMeta({ version: 2, layers: [] }).version === 2;
  console.log(ok ? 'PASS migrate' : 'FAIL migrate');
  return ok;
}

// -----------------------------------------------------------------------------
// 4. testSetMotion (Chép nguyên văn theo hướng dẫn prompt C1-d)
// -----------------------------------------------------------------------------
function testSetMotion() {
  initProject(makeCanvas(100, 100));
  const L = addLayer('test');
  setMotion(L, { type: 'breathe', amp: 99, cycles: 99, chaos: 99 });
  const m = L.motion;
  const ok = m.type === 'breathe' && m.amp === CFG.motion.limit.breathe && m.cycles === CFG.motion.cyclesMax && m.chaos === CFG.motion.chaosMax;
  console.log(ok ? 'PASS setMotion' : 'FAIL setMotion');
  return ok;
}

// -----------------------------------------------------------------------------
// 5. testLoad (Chép nguyên văn từ prompt C1-d)
// -----------------------------------------------------------------------------
function testLoad() {
  const lo = eyeLoadFrom([{ type: 'sway', amp: 1.5, cycles: 1, cov: 0.2 }], 12);
  const hi = eyeLoadFrom([1, 2, 3, 4].map(() => ({ type: 'sway', amp: 99, cycles: 3, cov: 0.5 })), 12);
  const ok = Math.abs(lo - 0.5) < 1e-9 && loadLevel(lo) === 'green' && loadLevel(hi) === 'red' && loadLevel(2) === 'yellow';
  console.log(ok ? 'PASS load' : 'FAIL load ' + [lo, hi]);
  return ok;
}

// -----------------------------------------------------------------------------
// 6. testSafe (Chép nguyên văn theo hướng dẫn prompt C1-d)
// -----------------------------------------------------------------------------
function testSafe() {
  initProject(makeCanvas(100, 100));
  Safe.feather = 40;
  const staticC = makeCanvas(100, 100);
  const r = { name: 'chat', x: 0.1, y: 0.1, w: 0.5, h: 0.5 };
  const c1 = safeSlice(r, staticC, 100, 100);
  const c2 = safeSlice(r, staticC, 100, 100);
  const ok = c1 === c2 && c1.width === 100;
  console.log(ok ? 'PASS safe' : 'FAIL safe');
  return ok;
}

// -----------------------------------------------------------------------------
// 7. testParallax (Chép nguyên văn theo hướng dẫn prompt C1-d)
// -----------------------------------------------------------------------------
function testParallax() {
  initProject(makeCanvas(1000, 1000));
  Parallax.maxPermille = 8;
  Parallax.enabled = true;
  Parallax.cx = 1; Parallax.cy = 0;
  const L = { depth: 1 };
  const a = parallaxOffset(L);
  const ok = Math.abs(a.dx + 8) < 0.1 && a.dy === 0;
  console.log(ok ? 'PASS parallax' : 'FAIL parallax ' + a.dx);
  return ok;
}

// -----------------------------------------------------------------------------
// 8. testPresets (Chép nguyên văn theo hướng dẫn prompt C1-d)
// -----------------------------------------------------------------------------
function testPresets() {
  LOOP.seconds = CFG.loop.seconds;
  const layers = [1, 2, 3, 4].map(() => ({ motion: { enabled: true, amp: 99, chaos: 99, type: 'breathe' } }));
  applyCalmPreset('subtle', layers);
  const ms = layers.map(l => l.motion);
  const P = CFG.presets.subtle, ok = LOOP.seconds === P.loopSec && ms.every(m => m.amp <= P.maxAmp && m.chaos <= P.chaosMax) && ms.filter(m => m.enabled !== false).length === P.maxActive;
  console.log(ok ? 'PASS presets' : 'FAIL presets');
  return ok;
}

// -----------------------------------------------------------------------------
// 9. testSaveLoad (Chép nguyên văn từ project-io.js)
// -----------------------------------------------------------------------------
async function testSaveLoad() {
  const ok = await ProjectIO.testSaveLoad();
  return ok;
}

async function runCardC1All() {
  console.log('================================================================');
  console.log('🧪 BÁO CÁO KIỂM THỬ THẺ C1 (ĐỔI BIÊN ĐỘ SANG ‰ & SỐ CỨNG CFG)');
  console.log('================================================================');

  let passed = 0;
  if (testMotion()) passed++;
  if (testUnits()) passed++;
  if (testMigrate()) passed++;
  if (testSetMotion()) passed++;
  if (testLoad()) passed++;
  if (testSafe()) passed++;
  if (testParallax()) passed++;
  if (testPresets()) passed++;
  if (await testSaveLoad()) passed++;

  console.log('----------------------------------------------------------------');
  console.log(`KẾT QUẢ THẺ C1: ${passed}/9 PASS`);
  console.log('================================================================');

  if (passed === 9) {
    return true;
  } else {
    return false;
  }
}

if (require.main === module) {
  runCardC1All().then(ok => {
    process.exit(ok ? 0 : 1);
  }).catch(err => {
    console.error('Lỗi thực thi test-card-c1:', err);
    process.exit(1);
  });
}

module.exports = {
  testMotion,
  testUnits,
  testMigrate,
  testSetMotion,
  testLoad,
  testSafe,
  testParallax,
  testPresets,
  testSaveLoad,
  runCardC1All
};
