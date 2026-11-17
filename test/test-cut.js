const assert = require('assert');

// Thiết lập Canvas 2D mock hỗ trợ fillRect, clearRect, drawImage, getImageData, putImageData cho Node.js
function createMockCanvas(w = 4, h = 4) {
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
          fillStyle: '#000',
          fillRect(x, y, rw, rh) {
            let r = 0, g = 0, b = 0, a = 255;
            if (this.fillStyle === '#f00' || this.fillStyle === '#ff0000') {
              r = 255;
            } else if (this.fillStyle === '#0f0' || this.fillStyle === '#00ff00') {
              g = 255;
            } else if (this.fillStyle === '#00f' || this.fillStyle === '#0000ff') {
              b = 255;
            }
            for (let py = y; py < y + rh && py < height; py++) {
              for (let px = x; px < x + rw && px < width; px++) {
                const idx = (py * width + px) * 4;
                buffer[idx] = r;
                buffer[idx + 1] = g;
                buffer[idx + 2] = b;
                buffer[idx + 3] = a;
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
            const srcCtx = src.getContext ? src.getContext('2d') : null;
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
            return new ImageData(cw, ch);
          },
          getImageData(x, y, rw, rh) {
            const sub = new Uint8ClampedArray(rw * rh * 4);
            let s = 0;
            for (let py = y; py < y + rh; py++) {
              for (let px = x; px < x + rw; px++) {
                if (py >= 0 && py < height && px >= 0 && px < width) {
                  const idx = (py * width + px) * 4;
                  sub[s++] = buffer[idx];
                  sub[s++] = buffer[idx + 1];
                  sub[s++] = buffer[idx + 2];
                  sub[s++] = buffer[idx + 3];
                } else {
                  sub[s++] = 0; sub[s++] = 0; sub[s++] = 0; sub[s++] = 0;
                }
              }
            }
            return new ImageData(sub, rw, rh);
          },
          putImageData(imgData, dx, dy) {
            const srcData = imgData.data;
            const sw = imgData.width;
            const sh = imgData.height;
            for (let py = 0; py < sh && py + dy < height; py++) {
              for (let px = 0; px < sw && px + dx < width; px++) {
                const sIdx = (py * sw + px) * 4;
                const dIdx = ((py + dy) * width + (px + dx)) * 4;
                buffer[dIdx] = srcData[sIdx];
                buffer[dIdx + 1] = srcData[sIdx + 1];
                buffer[dIdx + 2] = srcData[sIdx + 2];
                buffer[dIdx + 3] = srcData[sIdx + 3];
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

global.ImageData = class ImageData {
  constructor(arg1, arg2, arg3) {
    if (arg1 instanceof Uint8ClampedArray) {
      this.data = arg1;
      this.width = arg2;
      this.height = arg3;
    } else {
      this.width = arg1;
      this.height = arg2;
      this.data = new Uint8ClampedArray(arg1 * arg2 * 4);
    }
  }
};

global.document = {
  createElement(tag) {
    if (tag === 'canvas') return createMockCanvas(4, 4);
    return {
      style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      querySelector: () => null,
      appendChild() {}
    };
  },
  getElementById() { return null; },
  head: { appendChild() {} }
};

const Layers = require('../renderer/layers.js');
const UndoModule = require('../renderer/undo.js');
const CutModule = require('../renderer/cut.js');

console.log('--- CHẠY BÀI TEST BƯỚC 1.4 ---');

// 1. Chạy testCut() theo đúng đề bài
const passCut = CutModule.testCut();
assert.strictEqual(passCut, true, 'testCut() phải PASS');

// 2. Kiểm tra decontaminate (khử viền sáng / quầng sáng)
const testImgData = new Uint8ClampedArray([
  // Pixel 0: đặc (alpha = 255, đỏ: 200, 0, 0)
  200, 0, 0, 255,
  // Pixel 1: viền mờ (alpha = 100, quầng sáng trắng: 255, 255, 255)
  255, 255, 255, 100
]);
CutModule.decontaminate(testImgData, 2, 1);
assert.strictEqual(testImgData[4], 200, 'Pixel viền 1 phải lấy màu đỏ 200 từ pixel đặc 0');
assert.strictEqual(testImgData[5], 0, 'Pixel viền 1 kênh Green phải về 0');
assert.strictEqual(testImgData[6], 0, 'Pixel viền 1 kênh Blue phải về 0');

// 3. Kiểm tra copyOnly (Sao chép thành lớp mới không xóa lớp nguồn)
const srcCanvas = Layers.makeCanvas(4, 1);
const g = srcCanvas.getContext('2d');
g.fillStyle = '#0f0';
g.fillRect(0, 0, 4, 1);
Layers.initProject(srcCanvas);

const copyLayer = CutModule.cutToLayer(new Uint8ClampedArray([255, 255, 0, 0]), true, false);
assert.ok(copyLayer, 'Lớp sao chép phải được tạo');
assert.strictEqual(Layers.Project.layers.length, 2, 'Tổng số lớp phải là 2');

// Lớp nguồn không bị mất pixel khi copyOnly = true
const srcDataAfterCopy = Layers.getLayer(1).canvas.getContext('2d').getImageData(0, 0, 4, 1).data;
assert.strictEqual(srcDataAfterCopy[3], 255, 'Pixel 0 của lớp nguồn vẫn phải còn nguyên');
assert.strictEqual(srcDataAfterCopy[7], 255, 'Pixel 1 của lớp nguồn vẫn phải còn nguyên');

// 4. Kiểm tra performCutOrCopy bảo vệ lớp khóa và không có vùng chọn
let notified = null;
global.window = {
  showToast: (msg) => { notified = msg; }
};

// Không có vùng chọn
UndoModule.Selection.mask = new Uint8ClampedArray(4 * 1);
const cutNoSel = CutModule.performCutOrCopy(false);
assert.strictEqual(cutNoSel, null);
assert.strictEqual(notified, 'Hãy chọn vùng cần cắt');

// Lớp bị khóa
const activeL = Layers.getActiveLayer();
activeL.locked = true;
UndoModule.Selection.mask[0] = 255;
const cutLocked = CutModule.performCutOrCopy(false);
assert.strictEqual(cutLocked, null);
assert.strictEqual(notified, 'Lớp đang khóa');
activeL.locked = false;

// 5. Kiểm tra performCutOrCopy thực thi hoàn chỉnh + xóa vùng chọn + Undo 1 bước
const cutResult = CutModule.performCutOrCopy(false);
assert.ok(cutResult, 'Cắt thành công phải trả về layer mới');
assert.strictEqual(UndoModule.Selection.mask[0], 0, 'Vùng chọn phải được bỏ sau khi cắt');

// Undo 1 bước duy nhất phải khôi phục cả cấu trúc lớp và vùng chọn
UndoModule.undo();
assert.strictEqual(UndoModule.Selection.mask[0], 255, 'Undo phải khôi phục lại vùng chọn ban đầu');

console.log('--- TEST HOÀN TẤT THÀNH CÔNG ---');
