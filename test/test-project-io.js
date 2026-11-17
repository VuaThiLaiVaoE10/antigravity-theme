const assert = require('assert');

// Thiết lập Canvas 2D mock hỗ trợ toBlob và drawImage từ mock ImageBitmap cho Node.js
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
    toBlob(callback, type = 'image/png') {
      const payload = JSON.stringify({
        w: width,
        h: height,
        data: Array.from(buffer)
      });
      const bytes = new TextEncoder().encode(payload);
      const b = new Blob([bytes], { type });
      callback(b);
    },
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
            let srcWidth = src.naturalWidth || src.width;
            let srcHeight = src.naturalHeight || src.height;
            let srcData = null;
            if (src.data) {
              srcData = src.data;
            } else if (src.getContext) {
              srcData = src.getContext('2d').getImageData(0, 0, srcWidth, srcHeight).data;
            }
            if (!srcData) return;
            for (let py = 0; py < srcHeight && py + y < height; py++) {
              for (let px = 0; px < srcWidth && px + x < width; px++) {
                const sIdx = (py * srcWidth + px) * 4;
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

global.createImageBitmap = async function(blob) {
  const ab = await blob.arrayBuffer();
  const text = new TextDecoder().decode(ab);
  let w = 4, h = 4, data = new Uint8ClampedArray(w * h * 4);
  try {
    const parsed = JSON.parse(text);
    w = parsed.w;
    h = parsed.h;
    data = new Uint8ClampedArray(parsed.data);
  } catch (e) {}
  return {
    width: w,
    height: h,
    data,
    getContext: () => ({
      getImageData: (x, y, rw, rh) => ({ data })
    })
  };
};

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
      appendChild() {},
      removeChild() {},
      click() {}
    };
  },
  getElementById() { return null; },
  body: { appendChild() {}, removeChild() {} },
  head: { appendChild() {} }
};

global.URL = {
  createObjectURL: () => 'blob:mock-url',
  revokeObjectURL: () => {}
};

const Layers = require('../renderer/layers.js');
const UndoModule = require('../renderer/undo.js');
const Viewport = require('../renderer/viewport.js');
const ProjectIO = require('../renderer/project-io.js');

async function runAllIOTests() {
  console.log('--- CHẠY BÀI TEST BƯỚC 1.6b ---');

  // 1. Chạy testZip() theo đúng đề bài
  const passZip = await ProjectIO.testZip();
  assert.strictEqual(passZip, true, 'testZip() phải PASS');

  // 2. Chạy testSaveLoad() theo đúng đề bài
  const passSaveLoad = await ProjectIO.testSaveLoad();
  assert.strictEqual(passSaveLoad, true, 'testSaveLoad() phải PASS');

  // 3. Kiểm tra hàm validateMeta
  const err1 = ProjectIO.validateMeta(null);
  assert.ok(err1.length > 0, 'validateMeta null phải báo lỗi');

  const err2 = ProjectIO.validateMeta({ version: 99 });
  assert.ok(err2.some(e => e.includes('Phiên bản 99 không được hỗ trợ')), 'validateMeta version sai phải báo lỗi');

  const err3 = ProjectIO.validateMeta({ version: 2, width: 10, height: 10, layers: [] });
  assert.ok(err3.some(e => e.includes('không có lớp nào')), 'Dự án không có lớp phải báo lỗi');

  // 4. Kiểm tra zip nén bị từ chối trong unzipStore
  const fakeCompressedHeader = new ArrayBuffer(40);
  const dv = new DataView(fakeCompressedHeader);
  dv.setUint32(0, 0x04034b50, true);
  dv.setUint16(8, 8, true); // method 8 = Deflate (nén)
  assert.throws(() => {
    ProjectIO.unzipStore(fakeCompressedHeader);
  }, /không được hỗ trợ/, 'Zip nén phải bị từ chối');

  console.log('--- TEST HOÀN TẤT THÀNH CÔNG ---');
  process.exit(0);
}

runAllIOTests().catch(err => {
  console.error('Test thất bại:', err);
  process.exit(1);
});
