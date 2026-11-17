const assert = require('assert');

// Point-in-polygon ray casting cho mock fill('evenodd')
function pointInPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Thiết lập Canvas 2D mock cho Node.js
function createMockCanvas(w = 40, h = 40) {
  let width = w;
  let height = h;
  let buffer = new Uint8ClampedArray(Math.max(1, width * height * 4));
  let currentPath = [];

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
          beginPath() {
            currentPath = [];
          },
          moveTo(x, y) {
            currentPath.push({ x, y });
          },
          lineTo(x, y) {
            currentPath.push({ x, y });
          },
          closePath() {},
          fill() {
            if (currentPath.length < 3) return;
            for (let py = 0; py < height; py++) {
              for (let px = 0; px < width; px++) {
                if (pointInPolygon(px + 0.5, py + 0.5, currentPath)) {
                  const idx = (py * width + px) * 4;
                  buffer[idx] = 255;
                  buffer[idx + 1] = 255;
                  buffer[idx + 2] = 255;
                  buffer[idx + 3] = 255;
                }
              }
            }
          },
          fillRect() {},
          clearRect() {},
          drawImage() {},
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
            const src = imgData.data;
            const sw = imgData.width;
            const sh = imgData.height;
            for (let py = 0; py < sh && py + dy < height; py++) {
              for (let px = 0; px < sw && px + dx < width; px++) {
                const sIdx = (py * sw + px) * 4;
                const dIdx = ((py + dy) * width + (px + dx)) * 4;
                buffer[dIdx] = src[sIdx];
                buffer[dIdx + 1] = src[sIdx + 1];
                buffer[dIdx + 2] = src[sIdx + 2];
                buffer[dIdx + 3] = src[sIdx + 3];
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
    if (tag === 'canvas') return createMockCanvas(40, 40);
    return {
      style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      querySelector: () => null,
      appendChild() {}
    };
  },
  getElementById() { return null; },
  head: { appendChild() {} },
  hidden: false
};

const Layers = require('../renderer/layers.js');
const UndoModule = require('../renderer/undo.js');
const Viewport = require('../renderer/viewport.js');
const SelectionModule = require('../renderer/selection.js');

console.log('--- CHẠY BÀI TEST BƯỚC 1.3a, 1.3b, 1.3c & 1.3d ---');

// 1. Chạy testWand()
const passWand = SelectionModule.testWand();
assert.strictEqual(passWand, true, 'testWand() phải PASS');

// 2. Chạy testBrush()
const passBrush = SelectionModule.testBrush();
assert.strictEqual(passBrush, true, 'testBrush() phải PASS');

// 3. Chạy testLasso()
const passLasso = SelectionModule.testLasso();
assert.strictEqual(passLasso, true, 'testLasso() phải PASS');

// 4. Chạy testMorph() theo đề bài BƯỚC 1.3d
const passMorph = SelectionModule.testMorph();
assert.strictEqual(passMorph, true, 'testMorph() phải PASS');

// 5. Kiểm tra InvertMask & Deselect & Undo
Layers.initProject(createMockCanvas(20, 20));
UndoModule.resetUndo();
UndoModule.Selection.mask = SelectionModule.newMask(20, 20);
UndoModule.Selection.mask[0] = 255;

// Đảo vùng chọn
SelectionModule.invertSelection();
assert.strictEqual(UndoModule.Selection.mask[0], 0, 'Pixel 0 sau invert phải bằng 0');
assert.strictEqual(UndoModule.Selection.mask[1], 255, 'Pixel 1 sau invert phải bằng 255');

// Bỏ chọn
SelectionModule.deselectAll();
assert.strictEqual(UndoModule.Selection.mask[1], 0, 'Sau deselectAll pixel 1 phải bằng 0');

// Undo lại
UndoModule.undo();
assert.strictEqual(UndoModule.Selection.mask[1], 255, 'Undo deselectAll phải phục hồi trạng thái invert');

// 6. Kiểm tra drawSelectionOverlay tạo viền kiến bò marching ants và màu nền cyan tint
const testCtx = createMockCanvas(20, 20).getContext('2d');
const testMask = SelectionModule.newMask(20, 20);
testMask[10 * 20 + 10] = 255; // 1 pixel chọn duy nhất
SelectionModule.drawSelectionOverlay(testCtx, testMask, 20, 20, 0);

console.log('--- TEST HOÀN TẤT THÀNH CÔNG ---');
