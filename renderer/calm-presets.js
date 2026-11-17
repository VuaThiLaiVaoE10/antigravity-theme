/**
 * calm-presets.js - Antigravity Theme Studio: Thẻ 4.2 Cài đặt Độ êm (Calm Presets)
 * subtle, medium, lively
 */

const { CFG } = (typeof window !== 'undefined' && window.CFG) ? window : (typeof global !== 'undefined' && global.CFG ? global : require('./config.js'));

const CALM_PRESETS = CFG.presets;
const CalmPreset = { name: CFG.defaultPreset };

function applyCalmPreset(name, layers) {
  CalmPreset.name = name;
  const P = CFG.presets[name];
  if (!P) return;
  if (typeof LOOP !== 'undefined') LOOP.seconds = P.loopSec;
  if (typeof window !== 'undefined' && window.LOOP) window.LOOP.seconds = P.loopSec;
  if (typeof global !== 'undefined' && global.LOOP) global.LOOP.seconds = P.loopSec;
  let active = 0;
  for (const L of layers || []) {
    const m = L.motion;
    if (m) {
      m.amp = Math.min(m.amp, P.maxAmp);
      m.chaos = Math.min(m.chaos, P.chaosMax);
      if (active < P.maxActive) {
        m.enabled = true;
        active++;
      } else {
        m.enabled = false;
      }
    }
  }
}

function testPresets() {
  if (typeof LOOP !== 'undefined') LOOP.seconds = CFG.loop.seconds;
  const layers = [1, 2, 3, 4].map(() => ({ motion: { enabled: true, amp: 99, chaos: 99, type: 'breathe' } }));
  applyCalmPreset('subtle', layers);
  const ms = layers.map(l => l.motion);
  const P = CFG.presets.subtle, ok = (typeof LOOP !== 'undefined' ? LOOP.seconds === P.loopSec : true) && ms.every(m => m.amp <= P.maxAmp && m.chaos <= P.chaosMax) && ms.filter(m => m.enabled !== false).length === P.maxActive;
  console.log(ok ? 'PASS presets' : 'FAIL presets');
  return ok;
}

if (typeof window !== 'undefined') {
  window.CALM_PRESETS = CALM_PRESETS;
  window.CalmPreset = CalmPreset;
  window.applyCalmPreset = applyCalmPreset;
  window.testPresets = testPresets;
}

if (typeof global !== 'undefined') {
  global.CALM_PRESETS = CALM_PRESETS;
  global.CalmPreset = CalmPreset;
  global.applyCalmPreset = applyCalmPreset;
  global.testPresets = testPresets;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CALM_PRESETS, CalmPreset, applyCalmPreset, testPresets };
}
