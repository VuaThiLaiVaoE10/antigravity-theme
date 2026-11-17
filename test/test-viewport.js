const assert = require('assert');

// Thiết lập môi trường test Node.js
function createMockCanvas(w = 800, h = 600) {
  let width = w;
  let height = h;
  const canvas = {
    get width() { return width; },
    set width(val) { width = val; },
    get height() { return height; },
    set height(val) { height = val; },
    style: {},
    parentElement: null,
    getBoundingClientRect: () => ({ left: 50, top: 50, width, height }),
    addEventListener() {},
    getContext: () => ({
      setTransform() {},
      clearRect() {},
      fillRect() {},
      drawImage() {}
    })
  };
  return canvas;
}

global.document = {
  createElement(tag) {
    if (tag === 'canvas') return createMockCanvas(0, 0);
    return {
      style: {},
      className: '',
      innerHTML: '',
      querySelector: () => null,
      appendChild: () => {}
    };
  },
  getElementById: () => null,
  head: { appendChild: () => {} },
  hidden: false
};

global.window = {
  addEventListener() {}
};

const Layers = require('../renderer/layers.js');
const Viewport = require('../renderer/viewport.js');

console.log('--- CHẠY BÀI TEST BƯỚC 1.2 ---');

// 1. Chạy testView() theo đề bài
const pass = Viewport.testView();
assert.strictEqual(pass, true, 'testView() phải PASS');

// 2. Kiểm tra screenToImage và imageToLocal
Viewport.viewCanvas = createMockCanvas(800, 600);
Viewport.View.zoom = 2;
Viewport.View.panX = 100;
Viewport.View.panY = 50;

// Giả sử tọa độ màn hình (sx=250, sy=150), với rect.left=50, rect.top=50
// Tọa độ canvas cục bộ: lx = 250 - 50 = 200, ly = 150 - 50 = 100
// Tọa độ ảnh: ix = (200 - 100) / 2 = 50, iy = (100 - 50) / 2 = 25
const imgPt = Viewport.screenToImage(250, 150);
assert.strictEqual(imgPt.x, 50, 'screenToImage x phải bằng 50');
assert.strictEqual(imgPt.y, 25, 'screenToImage y phải bằng 25');

const localPt = Viewport.imageToLocal(50, 25);
assert.strictEqual(localPt.x, 200, 'imageToLocal x phải bằng 200');
assert.strictEqual(localPt.y, 100, 'imageToLocal y phải bằng 100');

// 3. Kiểm tra fitToView
Layers.Project.width = 1000;
Layers.Project.height = 500;
Viewport.fitToView();
assert(Viewport.View.zoom > 0, 'fitToView zoom phải > 0');

// 4. Kiểm tra pixelated khi zoom >= 4.0 (400%)
Viewport.View.zoom = 4.5;
Viewport.updateCanvasPixelated();
assert.strictEqual(Viewport.viewCanvas.style.imageRendering, 'pixelated', 'Zoom >= 4x phải có pixelated');

Viewport.View.zoom = 1.0;
Viewport.updateCanvasPixelated();
assert.strictEqual(Viewport.viewCanvas.style.imageRendering, 'auto', 'Zoom < 4x phải auto');

console.log('--- TEST HOÀN TẤT THÀNH CÔNG ---');
