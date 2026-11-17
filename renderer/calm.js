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
  window.loadLevel = loadLevel;
  window.testLoad = testLoad;
}

if (typeof global !== 'undefined') {
  global.Calm = Calm;
  global.LOAD_THRESH = LOAD_THRESH;
  global.MAX_ACTIVE = MAX_ACTIVE;
  global.eyeLoadFrom = eyeLoadFrom;
  global.loadLevel = loadLevel;
  global.testLoad = testLoad;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Calm, LOAD_THRESH, MAX_ACTIVE, eyeLoadFrom, loadLevel, testLoad };
}
