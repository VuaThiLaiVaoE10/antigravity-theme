const assert = require('assert');

// Thiết lập môi trường Canvas 2D thuần cho Node.js unit test
function createMockCanvas(w, h) {
  let width = w || 0;
  let height = h || 0;
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
    getContext(type) {
      if (type === '2d') {
        return {
          canvas,
          fillStyle: '#000000',
          globalAlpha: 1.0,
          fillRect(x, y, rw, rh) {
            let r = 0, g = 0, b = 0, a = 255;
            if (this.fillStyle === '#f00' || this.fillStyle === '#ff0000') {
              r = 255; g = 0; b = 0;
            } else if (this.fillStyle === '#00f' || this.fillStyle === '#0000ff') {
              r = 0; g = 0; b = 255;
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
                buffer[idx] = 0;
                buffer[idx + 1] = 0;
                buffer[idx + 2] = 0;
                buffer[idx + 3] = 0;
              }
            }
          },
          drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh) {
            const srcCtx = src.getContext ? src.getContext('2d') : null;
            if (!srcCtx) return;
            const srcData = srcCtx.getImageData(0, 0, src.width, src.height).data;
            const alpha = this.globalAlpha;
            for (let py = 0; py < src.height && py < height; py++) {
              for (let px = 0; px < src.width && px < width; px++) {
                const sIdx = (py * src.width + px) * 4;
                const dIdx = (py * width + px) * 4;
                if (alpha === 1) {
                  buffer[dIdx] = srcData[sIdx];
                  buffer[dIdx + 1] = srcData[sIdx + 1];
                  buffer[dIdx + 2] = srcData[sIdx + 2];
                  buffer[dIdx + 3] = srcData[sIdx + 3];
                } else {
                  buffer[dIdx] = Math.round(srcData[sIdx] * alpha + buffer[dIdx] * (1 - alpha));
                  buffer[dIdx + 1] = Math.round(srcData[sIdx + 1] * alpha + buffer[dIdx + 1] * (1 - alpha));
                  buffer[dIdx + 2] = Math.round(srcData[sIdx + 2] * alpha + buffer[dIdx + 2] * (1 - alpha));
                  buffer[dIdx + 3] = Math.max(buffer[dIdx + 3], srcData[sIdx + 3]);
                }
              }
            }
          },
          getImageData(x, y, rw, rh) {
            const out = new Uint8ClampedArray(rw * rh * 4);
            let ptr = 0;
            for (let py = y; py < y + rh; py++) {
              for (let px = x; px < x + rw; px++) {
                if (py >= 0 && py < height && px >= 0 && px < width) {
                  const idx = (py * width + px) * 4;
                  out[ptr++] = buffer[idx];
                  out[ptr++] = buffer[idx + 1];
                  out[ptr++] = buffer[idx + 2];
                  out[ptr++] = buffer[idx + 3];
                } else {
                  out[ptr++] = 0; out[ptr++] = 0; out[ptr++] = 0; out[ptr++] = 0;
                }
              }
            }
            return { width: rw, height: rh, data: out };
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
      dataset: {},
      classList: {
        add() {},
        remove() {}
      },
      appendChild() {},
      querySelectorAll() { return []; },
      querySelector() { return null; }
    };
  },
  getElementById() { return null; },
  head: { appendChild() {} }
};

const Layers = require('../renderer/layers.js');

console.log('--- CHẠY BÀI TEST BƯỚC 1.1 ---');
const result = Layers.testLayers();
if (!result) {
  process.exit(1);
}
console.log('--- TEST HOÀN TẤT THÀNH CÔNG ---');
