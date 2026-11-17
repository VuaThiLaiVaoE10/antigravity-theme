const assert = require('assert');

// Thiết lập Canvas 2D mock hỗ trợ fillRect, getImageData, putImageData cho Node.js
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
          globalAlpha: 1.0,
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

// ImageData polyfill hỗ trợ cả ImageData(w, h) và ImageData(dataArray, w, h)
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
    return { style: {}, classList: { add(){}, remove(){} }, querySelector: () => null, appendChild(){} };
  },
  getElementById() { return null; },
  hidden: false
};

const Layers = require('../renderer/layers.js');
const UndoModule = require('../renderer/undo.js');

// Đồng bộ biến toàn cục cho bài test
global.Project = Layers.Project;
global.getLayer = Layers.getLayer;
global.getActiveLayer = Layers.getActiveLayer;
global.addLayer = Layers.addLayer;
global.makeCanvas = Layers.makeCanvas;
global.initProject = Layers.initProject;
global.resetUndo = UndoModule.resetUndo;
global.pushUndoPatch = UndoModule.pushUndoPatch;
global.undo = UndoModule.undo;
global.redo = UndoModule.redo;
global.withGroup = UndoModule.withGroup;
global.beginPixelEdit = UndoModule.beginPixelEdit;
global.commitPixelEdit = UndoModule.commitPixelEdit;
global.withStructureUndo = UndoModule.withStructureUndo;

console.log('--- CHẠY BÀI TEST BƯỚC 1.6a ---');
const ok = UndoModule.testUndo();
assert.strictEqual(ok, true, 'testUndo() phải PASS');
console.log('--- TEST HOÀN TẤT THÀNH CÔNG ---');
