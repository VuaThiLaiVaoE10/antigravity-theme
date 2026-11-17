/**
 * parallax.js - Antigravity Theme Studio: Thẻ 4.1 Hiệu ứng Parallax chuột
 * Dịch chuyển các lớp theo chuột với biên độ chuẩn hóa theo độ sâu depth
 */

const { CFG, unitPx } = (typeof window !== 'undefined' && window.CFG) ? window : (typeof global !== 'undefined' && global.CFG ? global : require('./config.js'));

const Parallax = { enabled: CFG.parallax.defaultEnabled, maxPermille: CFG.parallax.maxPermille, tau: CFG.parallax.tau, mx: 0, my: 0, cx: 0, cy: 0 };

function parallaxOffset(L) {
  if (!Parallax.enabled) return { dx: 0, dy: 0 };
  const d = Math.min(1, Math.max(0, L.depth || 0)), k = Math.min(CFG.parallax.maxPermille, Parallax.maxPermille) * unitPx();
  return { dx: -Parallax.cx * d * k, dy: -Parallax.cy * d * k };
}

const ParallaxProvider = {
  get: () => ({ enabled: Parallax.enabled, maxPermille: Parallax.maxPermille }),
  set: s => { if (s) { Parallax.enabled = !!s.enabled; Parallax.maxPermille = Math.min(CFG.parallax.maxPermille, s.maxPermille || CFG.parallax.maxPermille); } }
};

function testParallax() {
  if (typeof initProject === 'function' && typeof makeCanvas === 'function') initProject(makeCanvas(1000, 1000));
  Parallax.maxPermille = 8;
  Parallax.enabled = true;
  Parallax.cx = 1; Parallax.cy = 0;
  const L = { depth: 1 };
  const a = parallaxOffset(L);
  const ok = Math.abs(a.dx + 8) < 0.1 && a.dy === 0;
  console.log(ok ? 'PASS parallax' : 'FAIL parallax ' + a.dx);
  return ok;
}

if (typeof window !== 'undefined') {
  window.Parallax = Parallax;
  window.parallaxOffset = parallaxOffset;
  window.ParallaxProvider = ParallaxProvider;
  window.testParallax = testParallax;
}

if (typeof global !== 'undefined') {
  global.Parallax = Parallax;
  global.parallaxOffset = parallaxOffset;
  global.ParallaxProvider = ParallaxProvider;
  global.testParallax = testParallax;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Parallax, parallaxOffset, ParallaxProvider, testParallax };
}
