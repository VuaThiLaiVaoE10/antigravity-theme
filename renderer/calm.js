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

if (typeof window !== 'undefined') {
  window.Calm = Calm;
  window.LOAD_THRESH = LOAD_THRESH;
  window.MAX_ACTIVE = MAX_ACTIVE;
  window.eyeLoadFrom = eyeLoadFrom;
  window.loadLevel = loadLevel;
}

if (typeof global !== 'undefined') {
  global.Calm = Calm;
  global.LOAD_THRESH = LOAD_THRESH;
  global.MAX_ACTIVE = MAX_ACTIVE;
  global.eyeLoadFrom = eyeLoadFrom;
  global.loadLevel = loadLevel;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Calm, LOAD_THRESH, MAX_ACTIVE, eyeLoadFrom, loadLevel };
}
