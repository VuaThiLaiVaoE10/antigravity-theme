/**
 * safe.js - Antigravity Theme Studio: Thẻ 3.2 Vùng an toàn
 * Bảo vệ khung chat, ô nhập và văn bản không bị chuyển động nền làm khó đọc
 */

const { CFG, unitPx } = (typeof window !== 'undefined' && window.CFG) ? window : (typeof global !== 'undefined' && global.CFG ? global : require('./config.js'));
const { makeCanvas } = (typeof window !== 'undefined' && window.makeCanvas) ? window : (typeof global !== 'undefined' && global.makeCanvas ? global : require('./layers.js'));

const Safe = {
  feather: CFG.safe.featherPermille,
  version: 1,
  cache: {},
  zones: []
};

function safeSlice(r, staticCanvas, w, h) {
  const px = Safe.feather * unitPx();
  const key = JSON.stringify([r.x, r.y, r.w, r.h, px, Safe.version, w, h]);
  if (Safe.cache[r.name] && Safe.cache[r.name].key === key) return Safe.cache[r.name].canvas;
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.save(); g.filter = 'blur(' + px + 'px)'; g.fillStyle = '#fff'; g.fillRect(r.x * w, r.y * h, r.w * w, r.h * h); g.restore();
  g.globalCompositeOperation = 'source-in'; g.drawImage(staticCanvas, 0, 0); g.globalCompositeOperation = 'source-over';
  Safe.cache[r.name] = { key, canvas: c }; return c;
}

function renderWithSafe(ctx, u) {
  if (typeof renderFrame === 'function') {
    renderFrame(ctx, u);
  }
  const rects = Safe.rects || Safe.zones;
  if (!rects || !rects.length) return;
  const _maxSide = CFG.image.maxSide || 1920;
  const w = (typeof Project !== 'undefined' && Project.width) || (ctx.canvas && ctx.canvas.width) || _maxSide;
  const h = (typeof Project !== 'undefined' && Project.height) || (ctx.canvas && ctx.canvas.height) || Math.round(_maxSide * 9 / 16);

  const staticC = makeCanvas(w, h), g = staticC.getContext('2d');
  if (typeof Project !== 'undefined' && Project.layers) {
    Project.layers.forEach(L => {
      if (L.visible && L.canvas) {
        g.save();
        g.globalAlpha = L.opacity !== undefined ? L.opacity : 1;
        g.drawImage(L.canvas, 0, 0);
        g.restore();
      }
    });
  }

  for (const r of rects) {
    const slice = safeSlice(r, staticC, w, h);
    const alpha = (r.factor !== undefined) ? (1 - r.factor) : 1;
    if (alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(slice, 0, 0);
    ctx.restore();
  }
}

function testSafe() {
  if (typeof initProject === 'function' && typeof makeCanvas === 'function') initProject(makeCanvas(100, 100));
  Safe.feather = 40;
  const staticC = makeCanvas(100, 100);
  const r = { name: 'chat', x: 0.1, y: 0.1, w: 0.5, h: 0.5 };
  const c1 = safeSlice(r, staticC, 100, 100);
  const c2 = safeSlice(r, staticC, 100, 100);
  const ok = c1 === c2 && c1.width === 100;
  console.log(ok ? 'PASS safe' : 'FAIL safe');
  return ok;
}

if (typeof window !== 'undefined') {
  window.Safe = Safe;
  window.safeSlice = safeSlice;
  window.renderWithSafe = renderWithSafe;
  window.testSafe = testSafe;
}

if (typeof global !== 'undefined') {
  global.Safe = Safe;
  global.safeSlice = safeSlice;
  global.renderWithSafe = renderWithSafe;
  global.testSafe = testSafe;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Safe, safeSlice, renderWithSafe, testSafe };
}
