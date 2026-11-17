function deepFreeze(o) { Object.values(o).forEach(v => { if (v && typeof v === 'object') deepFreeze(v); }); return Object.freeze(o); }

const CFG = deepFreeze({
  version: 2,
  image: { maxSide: 2048 },
  loop: { seconds: 12, min: 8, max: 16 },
  motion: {
    limit: { breathe: 2, sway: 3, drift: 3, ripple: 2.5 }, // đơn vị ‰ (1/1000 cạnh dài ảnh)
    defaultAmp: 1, defaultChaos: 0.15, chaosMax: 0.5,
    cyclesMin: 1, cyclesMax: 4, warnRatio: 0.75
  },
  calm: { typingFactor: 0.2, recoverMs: 3000, tau: 0.5, blurFocus: 0.3 },
  load: { green: 1.5, yellow: 3, maxActive: 3, scale: 2 },
  undo: { maxSteps: 50, maxBytes: 200 * 1024 * 1024 },
  safe: { featherPermille: 12 },
  parallax: { maxPermille: 8, tau: 0.25, defaultEnabled: false },
  presets: {
    subtle: { maxAmp: 1, maxActive: 2, loopSec: 14, chaosMax: 0.10 },
    medium: { maxAmp: 2, maxActive: 3, loopSec: 12, chaosMax: 0.20 },
    lively: { maxAmp: 3, maxActive: 4, loopSec: 9,  chaosMax: 0.35 }
  },
  defaultPreset: 'medium'
});

function unitPx() { const p = typeof Project !== 'undefined' ? Project : (typeof window !== 'undefined' && window.Project ? window.Project : null); return p ? Math.max(p.width, p.height) / 1000 : 1; }
function ampPx(type, amp) { return Math.min(amp, CFG.motion.limit[type]) * unitPx(); }

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
  if (typeof initProject === 'function' && typeof makeCanvas === 'function') {
    initProject(makeCanvas(1000, 500));
  } else if (typeof window !== 'undefined' && typeof window.initProject === 'function' && typeof window.makeCanvas === 'function') {
    window.initProject(window.makeCanvas(1000, 500));
  }
  if (Math.abs(unitPx() - 1) > 1e-9) bad.push('unitPx');
  if (Math.abs(ampPx('sway', 99) - 3) > 1e-9) bad.push('ampPx không kẹp giới hạn');
  console.log(bad.length ? 'FAIL config ' + bad : 'PASS config');
  return bad.length === 0;
}

// Module exports for Node.js & browser contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    deepFreeze,
    CFG,
    unitPx,
    ampPx,
    testConfig
  };
}

if (typeof window !== 'undefined') {
  window.deepFreeze = deepFreeze;
  window.CFG = CFG;
  window.unitPx = unitPx;
  window.ampPx = ampPx;
  window.testConfig = testConfig;
}
if (typeof global !== 'undefined') {
  global.deepFreeze = deepFreeze;
  global.CFG = CFG;
  global.unitPx = unitPx;
  global.ampPx = ampPx;
  global.testConfig = testConfig;
}
