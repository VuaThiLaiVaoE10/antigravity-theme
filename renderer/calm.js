/**
 * calm.js - Antigravity Theme Studio: Thẻ 3.1 & Focus Shield
 * Quản lý mức tải mắt và làm dịu chuyển động khi người dùng đang tập trung hoặc gõ phím
 */

const { CFG } = (typeof window !== 'undefined' && window.CFG) ? window : (typeof global !== 'undefined' && global.CFG ? global : require('./config.js'));
const MOTION_LIMITS = CFG.motion.limit; // đơn vị ‰

const Calm = { typingTarget: 1, typing: 1, focus: 1, focusTarget: 1, typingFactor: CFG.calm.typingFactor, recoverMs: CFG.calm.recoverMs, tau: CFG.calm.tau, timer: null };

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('blur', () => {
    Calm.focusTarget = CFG.calm.blurFocus;
  });
  window.addEventListener('focus', () => {
    Calm.focusTarget = 1;
  });
}

const LOAD_THRESH = { green: CFG.load.green, yellow: CFG.load.yellow };
const MAX_ACTIVE = CFG.load.maxActive;

function eyeLoadFrom(items, loopSec) {
  let s = 0;
  for (const it of items) {
    s += Math.min(it.amp, MOTION_LIMITS[it.type]) * Math.round(it.cycles) * it.cov / loopSec * 10 * CFG.load.scale;
  }
  return s;
}

function layerCoverage(L, totalW, totalH) {
  if (L.coverage !== undefined) return L.coverage;
  if (!L.canvas) return 0.2;
  const w = L.canvas.width, h = L.canvas.height;
  const total = (totalW && totalH) ? (totalW * totalH) : (w * h);
  if (!total) return 0.2;
  try {
    const ctx = L.canvas.getContext('2d');
    if (!ctx || typeof ctx.getImageData !== 'function') return 0.2;
    const data = ctx.getImageData(0, 0, w, h).data;
    let nonZero = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 10) nonZero++;
    }
    return Math.min(1, Math.max(0.01, nonZero / total));
  } catch (e) {
    console.warn('[calm] layerCoverage error:', e);
    return 0.2;
  }
}

function eyeLoad(layers = (typeof Project !== 'undefined' ? Project.layers : []), loopSec = (typeof LOOP !== 'undefined' && LOOP.seconds) ? LOOP.seconds : CFG.loop.seconds) {
  if (!layers || !layers.length) return 0;
  const _maxSide = CFG.image.maxSide || 1920;
  const totalW = (typeof Project !== 'undefined' && Project.width) ? Project.width : (typeof document !== 'undefined' && document.getElementById('mainCanvas') ? document.getElementById('mainCanvas').width : _maxSide);
  const totalH = (typeof Project !== 'undefined' && Project.height) ? Project.height : (typeof document !== 'undefined' && document.getElementById('mainCanvas') ? document.getElementById('mainCanvas').height : Math.round(_maxSide * 9 / 16));
  const items = [];
  for (const L of layers) {
    if (L.visible === false) continue;
    const m = (typeof activeMotion === 'function') ? activeMotion(L) : (L.motion && L.motion.enabled !== false ? L.motion : null);
    if (!m) continue;
    const cov = layerCoverage(L, totalW, totalH);
    items.push({
      type: m.type,
      amp: m.amp !== undefined ? m.amp : CFG.motion.defaultAmp,
      cycles: m.cycles !== undefined ? m.cycles : 1,
      cov
    });
  }
  return eyeLoadFrom(items, loopSec);
}

function animatedCount(layers = (typeof Project !== 'undefined' ? Project.layers : [])) {
  if (!layers || !layers.length) return 0;
  return layers.filter(L => {
    if (L.visible === false) return false;
    const m = (typeof activeMotion === 'function') ? activeMotion(L) : (L.motion && L.motion.enabled !== false ? L.motion : null);
    return !!m;
  }).length;
}

function loadLevel(load) {
  if (load <= LOAD_THRESH.green) return 'green';
  if (load <= LOAD_THRESH.yellow) return 'yellow';
  return 'red';
}

function testLoad() {
  const lo = eyeLoadFrom([{ type: 'sway', amp: 1.5, cycles: 1, cov: 0.2 }], 12);
  const hi = eyeLoadFrom([1, 2, 3, 4].map(() => ({ type: 'sway', amp: 99, cycles: 3, cov: 0.5 })), 12);
  const ok = Math.abs(lo - 0.5) < 1e-9 && loadLevel(lo) === 'green' && loadLevel(hi) === 'red' && loadLevel(2) === 'yellow';
  console.log(ok ? 'PASS load' : 'FAIL load ' + [lo, hi]);
  return ok;
}

if (typeof window !== 'undefined') {
  window.Calm = Calm;
  window.LOAD_THRESH = LOAD_THRESH;
  window.MAX_ACTIVE = MAX_ACTIVE;
  window.eyeLoadFrom = eyeLoadFrom;
  window.eyeLoad = eyeLoad;
  window.animatedCount = animatedCount;
  window.loadLevel = loadLevel;
  window.testLoad = testLoad;
}

if (typeof global !== 'undefined') {
  global.Calm = Calm;
  global.LOAD_THRESH = LOAD_THRESH;
  global.MAX_ACTIVE = MAX_ACTIVE;
  global.eyeLoadFrom = eyeLoadFrom;
  global.eyeLoad = eyeLoad;
  global.animatedCount = animatedCount;
  global.loadLevel = loadLevel;
  global.testLoad = testLoad;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Calm, LOAD_THRESH, MAX_ACTIVE, eyeLoadFrom, eyeLoad, animatedCount, loadLevel, testLoad };
}
