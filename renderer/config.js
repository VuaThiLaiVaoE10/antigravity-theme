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

// Module exports for Node.js & browser contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    deepFreeze,
    CFG,
    unitPx,
    ampPx
  };
}

if (typeof window !== 'undefined') {
  window.deepFreeze = deepFreeze;
  window.CFG = CFG;
  window.unitPx = unitPx;
  window.ampPx = ampPx;
}
if (typeof global !== 'undefined') {
  global.deepFreeze = deepFreeze;
  global.CFG = CFG;
  global.unitPx = unitPx;
  global.ampPx = ampPx;
}
