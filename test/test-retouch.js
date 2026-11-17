const assert = require('assert');

// Thiết lập Canvas 2D mock hỗ trợ fillRect, clearRect, drawImage, getImageData, putImageData cho Node.js
function createMockCanvas(w = 20, h = 10) {
  let width = w;
  let height = h;
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
    getContext(type) {
      if (type === '2d') {
        return {
          canvas,
          fillRect(x, y, rw, rh) {
            for (let py = y; py < y + rh && py < height; py++) {
              for (let px = x; px < x + rw && px < width; px++) {
                const idx = (py * width + px) * 4;
                buffer[idx] = 255;
                buffer[idx + 1] = 0;
                buffer[idx + 2] = 0;
                buffer[idx + 3] = 255;
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
          drawImage(src, x, y) {
            const srcCtx = src && src.getContext ? src.getContext('2d') : null;
            if (!srcCtx) return;
            const srcData = srcCtx.getImageData(0, 0, src.width, src.height).data;
            for (let py = 0; py < src.height && py < height; py++) {
              for (let px = 0; px < src.width && px < width; px++) {
                const sIdx = (py * src.width + px) * 4;
                const dIdx = ((py + y) * width + (px + x)) * 4;
                buffer[dIdx] = srcData[sIdx];
                buffer[dIdx + 1] = srcData[sIdx + 1];
                buffer[dIdx + 2] = srcData[sIdx + 2];
                buffer[dIdx + 3] = srcData[sIdx + 3];
              }
            }
          },
          createImageData(cw, ch) {
            return { width: cw, height: ch, data: new Uint8ClampedArray(cw * ch * 4) };
          },
          getImageData(sx, sy, sw, sh) {
            const data = new Uint8ClampedArray(sw * sh * 4);
            for (let y = 0; y < sh; y++) {
              for (let x = 0; x < sw; x++) {
                const srcIdx = ((sy + y) * width + (sx + x)) * 4;
                const dstIdx = (y * sw + x) * 4;
                if (sx + x >= 0 && sx + x < width && sy + y >= 0 && sy + y < height) {
                  data[dstIdx] = buffer[srcIdx];
                  data[dstIdx + 1] = buffer[srcIdx + 1];
                  data[dstIdx + 2] = buffer[srcIdx + 2];
                  data[dstIdx + 3] = buffer[srcIdx + 3];
                }
              }
            }
            return { data, width: sw, height: sh };
          },
          putImageData(imgData, dx, dy) {
            const sw = imgData.width, sh = imgData.height;
            for (let y = 0; y < sh; y++) {
              for (let x = 0; x < sw; x++) {
                const srcIdx = (y * sw + x) * 4;
                const dstIdx = ((dy + y) * width + (dx + x)) * 4;
                if (dx + x >= 0 && dx + x < width && dy + y >= 0 && dy + y < height) {
                  buffer[dstIdx] = imgData.data[srcIdx];
                  buffer[dstIdx + 1] = imgData.data[srcIdx + 1];
                  buffer[dstIdx + 2] = imgData.data[srcIdx + 2];
                  buffer[dstIdx + 3] = imgData.data[srcIdx + 3];
                }
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

global.document = {
  createElement(tag) {
    if (tag === 'canvas') return createMockCanvas();
    return {
      style: {},
      classList: { toggle() {}, add() {}, remove() {} },
      addEventListener() {},
      removeEventListener() {},
      querySelector() { return null; }
    };
  },
  getElementById() { return null; },
  querySelector() { return null; }
};

global.window = {
  addEventListener() {},
  removeEventListener() {},
  showToast() {}
};

// Nạp các module
const layers = require('../renderer/layers.js');
const undoMod = require('../renderer/undo.js');
const viewport = require('../renderer/viewport.js');

// Thiết lập viewCanvas cho viewport trong mock test
const mockVCanvas = createMockCanvas(40, 30);
mockVCanvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 40, height: 30 });
viewport.viewCanvas = mockVCanvas;
global.viewCanvas = mockVCanvas;

const retouch = require('../renderer/retouch.js');

const {
  cloneDab,
  cloneStroke,
  fillHole,
  fillSelectionHole,
  revealMap,
  testShiftReveal,
  selectRevealedRegions,
  RetouchSettings,
  drawCloneOverlay,
  drawRetouchOverlay,
  handleCloneMouseDown,
  handleCloneMouseMove,
  handleCloneMouseUp,
  testClone,
  testFill,
  testReveal
} = retouch;

async function runTests() {
  console.log('--- Bắt đầu kiểm tra BƯỚC 1.5a, 1.5b & 1.5c (retouch.js) ---');

  // Test 1: Hàm testClone chuẩn theo đề bài 1.5a
  const passDefault = testClone();
  assert.strictEqual(passDefault, true, 'Hàm testClone phải trả về true');

  // Test 1b: Hàm testFill chuẩn theo đề bài 1.5b
  const passFill = testFill();
  assert.strictEqual(passFill, true, 'Hàm testFill phải trả về true');

  // Test 1c: Hàm testReveal chuẩn theo đề bài 1.5c
  const passReveal = testReveal();
  assert.strictEqual(passReveal, true, 'Hàm testReveal phải trả về true');

  // Test 2: Kiểm tra cloneDab với các thông số độ cứng và độ mờ
  const w = 30, h = 20;
  const snap = new Uint8ClampedArray(w * h * 4);
  const dst = new Uint8ClampedArray(w * h * 4);

  // Tạo một vùng màu xanh dương (0, 100, 255, 255) ở nửa trái (x: 0..14)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < 15; x++) {
      const idx = (y * w + x) * 4;
      snap[idx] = 0;
      snap[idx + 1] = 100;
      snap[idx + 2] = 255;
      snap[idx + 3] = 255;
    }
  }

  // Clone từ (5, 10) sang (20, 10), ox = 5 - 20 = -15
  cloneDab(dst, snap, w, h, 20, 10, -15, 0, 3, 1.0, 1.0);

  // Kiểm tra tâm điểm clone (20, 10)
  const centerIdx = (10 * w + 20) * 4;
  assert.strictEqual(dst[centerIdx], 0, 'Red tại tâm phải bằng 0');
  assert.strictEqual(dst[centerIdx + 1], 100, 'Green tại tâm phải bằng 100');
  assert.strictEqual(dst[centerIdx + 2], 255, 'Blue tại tâm phải bằng 255');
  assert.strictEqual(dst[centerIdx + 3], 255, 'Alpha tại tâm phải bằng 255');

  // Test 3: cloneStroke - nội suy nét vẽ
  const dstStroke = new Uint8ClampedArray(w * h * 4);
  cloneStroke(dstStroke, snap, w, h, 18, 5, 22, 5, -15, 0, 2, 1.0, 1.0);
  // Các điểm x = 18, 19, 20, 21, 22 tại y = 5 đều phải được clone
  for (let x = 18; x <= 22; x++) {
    const idx = (5 * w + x) * 4;
    assert.strictEqual(dstStroke[idx + 2], 255, `Pixel tại (${x}, 5) phải có Blue = 255`);
  }

  // Test 4: Cơ chế không tự lặp lại chính nó (Non-self-replicating invariant)
  // Nếu copy một điểm màu sang điểm tiếp theo trên cùng nét vẽ,
  // do đọc từ snap bất biến nên điểm sau không bị đọc chồng lên pixel vừa clone
  const snapNonRep = new Uint8ClampedArray(w * h * 4);
  const dstNonRep = new Uint8ClampedArray(w * h * 4);
  // Chỉ có đúng 1 pixel đỏ tại (5, 5)
  const p5_5 = (5 * w + 5) * 4;
  snapNonRep[p5_5] = 255;
  snapNonRep[p5_5 + 3] = 255;

  // Clone từ (5, 5) sang (6, 5) với ox = -1
  cloneDab(dstNonRep, snapNonRep, w, h, 6, 5, -1, 0, 1, 1, 1);
  assert.strictEqual(dstNonRep[(5 * w + 6) * 4], 255, 'Pixel (6, 5) đã được clone từ (5, 5)');

  // Điểm (7, 5) nếu dùng cùng snapNonRep với ox = -1:
  // Nguồn của (7, 5) là (6, 5). Trong snapNonRep, (6, 5) là 0 (chưa có pixel nào).
  // Vì đọc từ snapNonRep chứ không đọc từ dstNonRep, điểm (7, 5) sẽ KHÔNG bị bôi đỏ!
  cloneDab(dstNonRep, snapNonRep, w, h, 7, 5, -1, 0, 1, 1, 1);
  assert.strictEqual(dstNonRep[(5 * w + 7) * 4], 0, 'Pixel (7, 5) không bị bôi đỏ vì snapNonRep tại (6, 5) là trống');

  // Test 5: Tích hợp Project, Undo/Redo và chuột
  const imgMock = { width: 40, height: 30 };
  layers.initProject(imgMock);
  const activeL = layers.getActiveLayer();
  assert(activeL, 'Phải có lớp hoạt động');

  // Vẽ hình chữ nhật đỏ lên lớp
  activeL.canvas.getContext('2d').fillRect(0, 0, 10, 10);
  const initData = activeL.canvas.getContext('2d').getImageData(0, 0, 40, 30);
  assert.strictEqual(initData.data[0], 255, 'Góc (0, 0) phải có màu đỏ ban đầu');
  assert.strictEqual(initData.data[(15 * 40 + 25) * 4], 0, 'Góc (25, 15) ban đầu phải trống');

  // Kích hoạt cọ nhân bản
  RetouchSettings.activeTool = 'clone';
  RetouchSettings.cloneRadius = 3;
  RetouchSettings.cloneHardness = 1.0;
  RetouchSettings.cloneOpacity = 1.0;

  // 5a: Alt+nhấp chọn nguồn tại (5, 5)
  handleCloneMouseDown({ button: 0, altKey: true, clientX: 5, clientY: 5 });
  assert.deepStrictEqual(RetouchSettings.sourcePoint, { x: 5, y: 5 }, 'Điểm nguồn phải là (5, 5)');

  // 5b: Nhấp chuột thường tại (25, 15) để bắt đầu vẽ
  handleCloneMouseDown({ button: 0, altKey: false, clientX: 25, clientY: 15 });
  assert.strictEqual(RetouchSettings.isCloning, true, 'Trạng thái isCloning phải là true');

  // Di chuột đến (26, 15)
  handleCloneMouseMove({ clientX: 26, clientY: 15 });

  // Nhả chuột kết thúc nét vẽ
  handleCloneMouseUp();
  assert.strictEqual(RetouchSettings.isCloning, false, 'Trạng thái isCloning phải về false');

  // Kiểm tra điểm (25, 15) đã được clone màu đỏ
  const clonedData = activeL.canvas.getContext('2d').getImageData(0, 0, 40, 30);
  const targetIdx = (15 * 40 + 25) * 4;
  assert.strictEqual(clonedData.data[targetIdx], 255, 'Điểm đích (25, 15) phải có màu đỏ được clone');
  assert.strictEqual(clonedData.data[targetIdx + 3], 255, 'Alpha điểm đích phải là 255');

  // 5c: Kiểm tra hoàn tác Undo
  assert.strictEqual(undoMod.Undo.index > 0, true, 'Undo stack phải có lệnh');
  undoMod.undo();
  const undoneData = activeL.canvas.getContext('2d').getImageData(0, 0, 40, 30);
  assert.strictEqual(undoneData.data[targetIdx], 0, 'Sau undo, điểm đích (25, 15) phải trở về trạng thái trống (0)');

  // Redo lại
  undoMod.redo();
  const redoneData = activeL.canvas.getContext('2d').getImageData(0, 0, 40, 30);
  assert.strictEqual(redoneData.data[targetIdx], 255, 'Sau redo, điểm đích (25, 15) phải trở lại màu đỏ (255)');

  // ---------------------------------------------------------------------------
  // Test 6: BƯỚC 1.5b - fillSelectionHole & Undo Bounding Box
  // ---------------------------------------------------------------------------
  // 6a: Khi không có vùng chọn
  undoMod.Selection.mask = null;
  const noSelResult = fillSelectionHole();
  assert.strictEqual(noSelResult, false, 'Không có vùng chọn phải trả về false');

  // 6b: Khi có vùng chọn hợp lệ
  const pw = 40, ph = 30;
  // Vẽ nền màu xanh lá (0, 255, 0, 255) lên toàn bộ lớp để có pixel hàng xóm đã biết
  const lctx = activeL.canvas.getContext('2d');
  const bgData = lctx.getImageData(0, 0, pw, ph);
  for (let p = 0; p < pw * ph; p++) {
    bgData.data[p * 4] = 0;
    bgData.data[p * 4 + 1] = 255;
    bgData.data[p * 4 + 2] = 0;
    bgData.data[p * 4 + 3] = 255;
  }
  // Vùng lỗ tại [10..15, 10..15] bị đục thủng trong suốt (alpha = 0)
  for (let y = 10; y <= 15; y++) {
    for (let x = 10; x <= 15; x++) {
      bgData.data[(y * pw + x) * 4 + 3] = 0;
    }
  }
  lctx.putImageData(bgData, 0, 0);

  const testMask = new Uint8ClampedArray(pw * ph);
  // Đặt lỗ ở vùng [10..15, 10..15]
  for (let y = 10; y <= 15; y++) {
    for (let x = 10; x <= 15; x++) {
      testMask[y * pw + x] = 255;
    }
  }
  undoMod.Selection.mask = testMask;

  // Lấy dữ liệu trước khi lấp
  const centerHoleIdx = (12 * pw + 12) * 4;
  const preHoleAlpha = lctx.getImageData(0, 0, pw, ph).data[centerHoleIdx + 3];
  assert.strictEqual(preHoleAlpha, 0, 'Trước khi lấp, tâm lỗ phải có alpha = 0');

  const fillSuccess = fillSelectionHole();
  assert.strictEqual(fillSuccess, true, 'Lấp vùng chọn phải thành công');

  // Kiểm tra điểm giữa lỗ đã được lấp đầy màu xanh lá và alpha = 255
  const filledData = lctx.getImageData(0, 0, pw, ph);
  assert.strictEqual(filledData.data[centerHoleIdx + 3] >= 250, true, 'Alpha của lỗ đã lấp phải >= 250');
  assert.strictEqual(filledData.data[centerHoleIdx + 1] >= 250, true, 'Màu Green của lỗ đã lấp phải >= 250');

  // 6c: Kiểm tra Undo patch của bounding box mở rộng 2px
  const undoStepsBefore = undoMod.Undo.index;
  undoMod.undo();
  const undoneHoleData = activeL.canvas.getContext('2d').getImageData(0, 0, pw, ph);
  assert.strictEqual(undoneHoleData.data[centerHoleIdx + 3], preHoleAlpha, 'Sau undo, điểm lỗ phải khôi phục về giá trị trước khi lấp');

  // Redo lại
  undoMod.redo();
  const redoneHoleData = activeL.canvas.getContext('2d').getImageData(0, 0, pw, ph);
  assert.strictEqual(redoneHoleData.data[centerHoleIdx + 3], filledData.data[centerHoleIdx + 3], 'Sau redo, điểm lỗ phải khôi phục giá trị đã lấp');

  // 6d: Kiểm tra trường hợp ảnh lớn > 1500px kích hoạt setTimeout
  const oldW = layers.Project.width;
  layers.Project.width = 1600; // Giả lập ảnh lớn > 1500px
  let asyncCalled = false;
  const originalSetTimeout = setTimeout;
  global.setTimeout = (fn, delay) => {
    asyncCalled = true;
    assert.strictEqual(delay, 20, 'Delay setTimeout phải là 20ms');
    fn();
  };
  fillSelectionHole();
  assert.strictEqual(asyncCalled, true, 'Ảnh > 1500px phải được chia nhỏ qua setTimeout');
  global.setTimeout = originalSetTimeout;
  layers.Project.width = oldW;

  // ---------------------------------------------------------------------------
  // Test 7: BƯỚC 1.5c - testShiftReveal & selectRevealedRegions
  // ---------------------------------------------------------------------------
  // 7a: Khởi tạo dự án 2 lớp (Lớp nền ở dưới, Lớp nhân vật ở trên)
  layers.initProject({ width: 20, height: 20 });
  const baseL = layers.getActiveLayer(); // Lớp nền
  const charCanvas = createMockCanvas(20, 20);
  const charL = layers.addLayer('Nhân vật', charCanvas);
  layers.Project.activeId = charL.id; // Lớp đang chọn là lớp Nhân vật

  // Lớp nhân vật có hình vuông [5..14, 5..14]
  const cctx = charL.canvas.getContext('2d');
  const cData = cctx.getImageData(0, 0, 20, 20);
  for (let y = 5; y < 15; y++) {
    for (let x = 5; x < 15; x++) {
      const idx = (y * 20 + x) * 4;
      cData.data[idx] = 255;
      cData.data[idx + 3] = 255;
    }
  }
  cctx.putImageData(cData, 0, 0);

  // Lớp nền ban đầu hoàn toàn trong suốt (alpha = 0)
  const bctx = baseL.canvas.getContext('2d');
  const bData = bctx.getImageData(0, 0, 20, 20);
  for (let p = 0; p < 20 * 20 * 4; p++) bData.data[p] = 0;
  bctx.putImageData(bData, 0, 0);

  // 7b: Thử dịch lớp nhân vật đi 3px
  const revealRes1 = testShiftReveal(3);
  assert(revealRes1, 'Phải trả về kết quả thử dịch lớp');
  assert(revealRes1.count > 0, 'Phải có pixel lộ khi nền trống');
  assert.strictEqual(revealRes1.message, `Còn ${revealRes1.count} pixel lộ, cần lấp thêm`);
  assert(RetouchSettings.revealMask, 'RetouchSettings.revealMask phải được cập nhật');

  // 7c: Chọn các vùng lộ thành vùng chọn
  const selOk = selectRevealedRegions();
  assert.strictEqual(selOk, true, 'selectRevealedRegions phải thành công');
  assert(undoMod.Selection.mask, 'Selection.mask phải được gán');
  assert.strictEqual(undoMod.Selection.mask.length, 20 * 20, 'Độ dài Selection.mask phải bằng w*h');

  // 7d: Khi lớp nền đã được lấp đầy (alpha = 255)
  for (let p = 0; p < 20 * 20; p++) bData.data[p * 4 + 3] = 255;
  bctx.putImageData(bData, 0, 0);

  const revealRes2 = testShiftReveal(3);
  assert.strictEqual(revealRes2.count, 0, 'Khi nền phủ kín thì không còn pixel lộ');
  assert.strictEqual(revealRes2.message, 'Không còn vùng lộ');

  console.log('✅ Toàn bộ bài test BƯỚC 1.5a, 1.5b & 1.5c (retouch.js) đã VƯỢT QUA thành công!');
}

runTests().catch(err => {
  console.error('❌ Lỗi kiểm tra retouch:', err);
  process.exit(1);
});
