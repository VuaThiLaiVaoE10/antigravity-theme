/**
 * golden.js - Antigravity Theme Studio: THẺ G1 KIỂM THỬ ẢNH CHUẨN HỒI QUY (GOLDEN SCENE REGRESSION)
 * Phụ thuộc: idbPut, idbGet (project-io.js)
 */

const GOLDEN_US = [0, 0.25, 0.5, 0.75];

function buildGoldenScene() {
  const S = 1000, bg = makeCanvas(S, S), g = bg.getContext('2d');
  const grad = g.createLinearGradient(0, 0, S, S); grad.addColorStop(0, '#10243a'); grad.addColorStop(1, '#3b2a5a');
  g.fillStyle = grad; g.fillRect(0, 0, S, S);
  initProject(bg);
  const A = addLayer('khối'); const ag = A.canvas.getContext('2d'); ag.fillStyle = '#e04050'; ag.fillRect(300, 300, 400, 400);
  A.motion = Object.assign(defaultMotion('drift'), { amp: 3, angle: 0.6, cycles: 1, chaos: 0.2, seed: 7, phase: 0 });
  const B = addLayer('sóng'); const bgx = B.canvas.getContext('2d'); bgx.fillStyle = '#40b0e0'; bgx.fillRect(0, 700, S, 120);
  B.motion = Object.assign(defaultMotion('ripple'), { amp: 2.5, cycles: 2, chaos: 0.15, seed: 11, phase: 0 });
  return { A, B };
}

function frameSignature(u, grid = 40) { // trung bình RGB mỗi ô lưới grid x grid
  const w = Project.width, h = Project.height, c = makeCanvas(w, h), g = c.getContext('2d');
  renderFrame(g, u, { ampScale: 1, noHooks: true });
  const d = g.getImageData(0, 0, w, h).data, bw = w / grid, bh = h / grid, sig = [];
  for (let by = 0; by < grid; by++) for (let bx = 0; bx < grid; bx++) {
    let r = 0, gg = 0, b = 0, n = 0;
    for (let y = Math.floor(by * bh); y < Math.floor((by + 1) * bh); y++) for (let x = Math.floor(bx * bw); x < Math.floor((bx + 1) * bw); x++) {
      const i = (y * w + x) * 4; r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
    sig.push(Math.round(r / n), Math.round(gg / n), Math.round(b / n));
  }
  return sig;
}
function sigMaxDiff(a, b) { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m; }

async function recordGolden() { // CHỈ gọi sau khi người dùng xem bằng mắt và đồng ý
  buildGoldenScene(); const data = { v: 1, tol: 8, frames: {} };
  for (const u of GOLDEN_US) data.frames[u] = frameSignature(u);
  await idbPut('golden', data); return data;
}

async function testGolden() {
  const { A } = buildGoldenScene();
  const base = frameSignature(0.25); A.motion.amp = 0; const still = frameSignature(0.25); A.motion.amp = 3;
  const sens = sigMaxDiff(base, still);
  if (sens <= 8) { console.log('FAIL golden: không đủ nhạy, khác biệt chỉ ' + sens); return; }
  const saved = await idbGet('golden');
  if (!saved) { console.log('FAIL golden: chưa có ảnh chuẩn. Hãy xem bằng mắt rồi bấm "Ghi ảnh chuẩn"'); return; }
  const bad = [];
  for (const u of GOLDEN_US) { const d = sigMaxDiff(frameSignature(u), saved.frames[u]); if (d > saved.tol) bad.push(u + ':' + d); }
  console.log(bad.length ? 'FAIL golden ' + bad : 'PASS golden (độ nhạy ' + sens + ')');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GOLDEN_US,
    buildGoldenScene,
    frameSignature,
    sigMaxDiff,
    recordGolden,
    testGolden
  };
}

if (typeof window !== 'undefined') {
  window.GOLDEN_US = GOLDEN_US;
  window.buildGoldenScene = buildGoldenScene;
  window.frameSignature = frameSignature;
  window.sigMaxDiff = sigMaxDiff;
  window.recordGolden = recordGolden;
  window.testGolden = testGolden;
}

if (typeof global !== 'undefined') {
  global.GOLDEN_US = GOLDEN_US;
  global.buildGoldenScene = buildGoldenScene;
  global.frameSignature = frameSignature;
  global.sigMaxDiff = sigMaxDiff;
  global.recordGolden = recordGolden;
  global.testGolden = testGolden;
}
