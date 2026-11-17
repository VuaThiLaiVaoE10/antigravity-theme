/**
 * test-card-g1.js - Antigravity Theme Studio: KIỂM THỬ THẺ G1
 * Kiểm thử Ảnh Chuẩn Hồi Quy (Golden Scene Regression Testing)
 * 
 * 1. Chạy testGolden() lần đầu: BẮT BUỘC FAIL vì chưa có ảnh chuẩn trong idb (đúng thiết kế).
 * 2. Chạy recordGolden(): Ghi chữ ký ảnh chuẩn tại các mốc u = [0, 0.25, 0.5, 0.75].
 * 3. Chạy testGolden() lần hai: BẮT BUỘC PASS với độ nhạy sens > 8.
 * 4. Kiểm tra hàm toán học sigMaxDiff.
 */

const { performance } = require('perf_hooks');

// ---------------------------------------------------------------------------
// 1. MOCK DOM & CANVAS MÔ PHỎNG ĐỒ HOẠ 2D CHÍNH XÁC CHO NODE.JS
// ---------------------------------------------------------------------------

function parseColor(fill) {
  if (typeof fill === 'string') {
    if (fill.startsWith('#')) {
      const h = fill.slice(1);
      if (h.length === 6) {
        return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16), 255];
      } else if (h.length === 3) {
        return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16), 255];
      }
    }
  } else if (fill && typeof fill === 'object') {
    // Gradient #10243a (16, 36, 58) -> #3b2a5a (59, 42, 90) -> trung bình (37, 39, 74)
    return [37, 39, 74, 255];
  }
  return [0, 0, 0, 255];
}

function createMockCanvas(w = 1000, h = 1000) {
  let width = w || 1000;
  let height = h || 1000;
  let buffer = new Uint8ClampedArray(Math.max(1, width * height * 4));
  let stateStack = [];
  let currentTx = 0;
  let currentTy = 0;

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
          fillStyle: '#000000',
          strokeStyle: '#000000',
          lineWidth: 1,
          globalAlpha: 1.0,
          createLinearGradient(x0, y0, x1, y1) {
            return {
              stops: [],
              addColorStop(offset, color) { this.stops.push({ offset, color }); }
            };
          },
          save() {
            stateStack.push({ tx: currentTx, ty: currentTy, alpha: this.globalAlpha });
          },
          restore() {
            const st = stateStack.pop() || { tx: 0, ty: 0, alpha: 1.0 };
            currentTx = st.tx;
            currentTy = st.ty;
            this.globalAlpha = st.alpha;
          },
          translate(dx, dy) {
            currentTx += dx;
            currentTy += dy;
          },
          rotate(rad) {},
          scale(sx, sy) {},
          fillRect(x, y, rw, rh) {
            const [r, g, b, a] = parseColor(this.fillStyle);
            const x0 = Math.max(0, Math.floor(x));
            const y0 = Math.max(0, Math.floor(y));
            const x1 = Math.min(width, Math.floor(x + rw));
            const y1 = Math.min(height, Math.floor(y + rh));
            for (let py = y0; py < y1; py++) {
              let row = py * width * 4;
              for (let px = x0; px < x1; px++) {
                const idx = row + px * 4;
                buffer[idx] = r;
                buffer[idx + 1] = g;
                buffer[idx + 2] = b;
                buffer[idx + 3] = a;
              }
            }
          },
          clearRect(x, y, rw, rh) {
            const x0 = Math.max(0, Math.floor(x));
            const y0 = Math.max(0, Math.floor(y));
            const x1 = Math.min(width, Math.floor(x + rw));
            const y1 = Math.min(height, Math.floor(y + rh));
            for (let py = y0; py < y1; py++) {
              let row = py * width * 4;
              for (let px = x0; px < x1; px++) {
                const idx = row + px * 4;
                buffer[idx] = 0; buffer[idx + 1] = 0; buffer[idx + 2] = 0; buffer[idx + 3] = 0;
              }
            }
          },
          drawImage(...args) {
            let src, sx = 0, sy = 0, sw, sh, dx = 0, dy = 0, dw, dh;
            if (args.length === 3) {
              [src, dx, dy] = args;
              sw = src.naturalWidth || src.width;
              sh = src.naturalHeight || src.height;
              dw = sw;
              dh = sh;
            } else if (args.length === 5) {
              [src, dx, dy, dw, dh] = args;
              sw = src.naturalWidth || src.width;
              sh = src.naturalHeight || src.height;
            } else if (args.length >= 9) {
              [src, sx, sy, sw, sh, dx, dy, dw, dh] = args;
            } else {
              return;
            }

            let srcData = null;
            let srcWidth = src.naturalWidth || src.width;
            let srcHeight = src.naturalHeight || src.height;

            if (src.data) {
              srcData = src.data;
            } else if (src.getContext) {
              srcData = src.getContext('2d').getImageData(0, 0, srcWidth, srcHeight).data;
            }
            if (!srcData) return;

            const finalDx = Math.round(dx + currentTx);
            const finalDy = Math.round(dy + currentTy);

            if (sw === dw && sh === dh) {
              const yStart = Math.max(0, -finalDy);
              const yEnd = Math.min(dh, height - finalDy);
              const xStart = Math.max(0, -finalDx);
              const xEnd = Math.min(dw, width - finalDx);
              const copyLen = xEnd - xStart;
              if (copyLen <= 0 || yEnd <= yStart) return;

              for (let iy = yStart; iy < yEnd; iy++) {
                const sRow = (sy + iy) * srcWidth * 4 + (sx + xStart) * 4;
                const dRow = (finalDy + iy) * width * 4 + (finalDx + xStart) * 4;
                for (let i = 0; i < copyLen * 4; i += 4) {
                  const sa = srcData[sRow + i + 3];
                  if (sa > 0) {
                    buffer[dRow + i] = srcData[sRow + i];
                    buffer[dRow + i + 1] = srcData[sRow + i + 1];
                    buffer[dRow + i + 2] = srcData[sRow + i + 2];
                    buffer[dRow + i + 3] = sa;
                  }
                }
              }
              return;
            }

            for (let iy = 0; iy < dh; iy++) {
              const srcY = Math.floor(sy + (iy * sh) / dh);
              const dstY = finalDy + iy;
              if (dstY < 0 || dstY >= height || srcY < 0 || srcY >= srcHeight) continue;

              const srcRow = srcY * srcWidth * 4;
              const dstRow = dstY * width * 4;

              for (let ix = 0; ix < dw; ix++) {
                const srcX = Math.floor(sx + (ix * sw) / dw);
                const dstX = finalDx + ix;
                if (dstX < 0 || dstX >= width || srcX < 0 || srcX >= srcWidth) continue;

                const sIdx = srcRow + srcX * 4;
                const dIdx = dstRow + dstX * 4;
                const sa = srcData[sIdx + 3];

                if (sa > 0) {
                  buffer[dIdx] = srcData[sIdx];
                  buffer[dIdx + 1] = srcData[sIdx + 1];
                  buffer[dIdx + 2] = srcData[sIdx + 2];
                  buffer[dIdx + 3] = sa;
                }
              }
            }
          },
          getImageData(x, y, rw, rh) {
            const sub = new Uint8ClampedArray(rw * rh * 4);
            const x0 = Math.max(0, Math.floor(x));
            const y0 = Math.max(0, Math.floor(y));
            const x1 = Math.min(width, Math.floor(x + rw));
            const y1 = Math.min(height, Math.floor(y + rh));

            for (let py = y0; py < y1; py++) {
              const srcRow = py * width * 4;
              const dstRow = (py - y0) * rw * 4;
              for (let px = x0; px < x1; px++) {
                const sIdx = srcRow + px * 4;
                const dIdx = dstRow + (px - x0) * 4;
                sub[dIdx] = buffer[sIdx];
                sub[dIdx + 1] = buffer[sIdx + 1];
                sub[dIdx + 2] = buffer[sIdx + 2];
                sub[dIdx + 3] = buffer[sIdx + 3];
              }
            }
            return { width: rw, height: rh, data: sub };
          }
        };
      }
      return null;
    }
  };
  return canvas;
}

// Thiết lập môi trường toàn cục
global.window = global;
global.window.addEventListener = () => {};
global.performance = performance;
global.document = {
  createElement(tag) {
    if (tag === 'canvas') return createMockCanvas(1000, 1000);
    return { style: {}, querySelector() { return null; } };
  },
  getElementById() { return null; },
  querySelector() { return null; },
  addEventListener() {}
};

// ---------------------------------------------------------------------------
// 2. NẠP CÁC MODULE THEO THỨ TỰ
// ---------------------------------------------------------------------------
const CFG = require('../renderer/config.js');
const Layers = require('../renderer/layers.js');
const ProjectIO = require('../renderer/project-io.js');
const Motion = require('../renderer/motion.js');
const Tests = require('../renderer/tests.js');
const Golden = require('../renderer/golden.js');

// ---------------------------------------------------------------------------
// 3. THỰC HIỆN KIỂM THỬ THẺ G1
// ---------------------------------------------------------------------------

async function runCardG1Tests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ THẺ G1 (golden.js & Ảnh Chuẩn Hồi Quy)');
  console.log('================================================================');

  let passedAll = true;

  // Test 1: Hàm toán học sigMaxDiff
  console.log('\n--- 1. KIỂM TRA sigMaxDiff() ---');
  const d0 = sigMaxDiff([10, 20, 30], [10, 20, 30]);
  const d5 = sigMaxDiff([10, 20, 30], [10, 25, 28]);
  if (d0 === 0 && d5 === 5) {
    console.log('✓ sigMaxDiff tính chính xác hiệu số lớn nhất:', { d0, d5 });
  } else {
    console.error('LỖI: sigMaxDiff sai kết quả!', { d0, d5 });
    passedAll = false;
  }

  // Test 2: Chạy testGolden() lần đầu khi chưa có ảnh chuẩn
  console.log('\n--- 2. CHẠY testGolden() LẦN ĐẦU (KỲ VỌNG CHƯA CÓ ẢNH CHUẨN) ---');
  let firstLog = null;
  const origLog = console.log;
  console.log = (...args) => {
    firstLog = args.join(' ');
  };

  try {
    await testGolden();
  } finally {
    console.log = origLog;
  }

  if (firstLog && firstLog.startsWith('FAIL golden: chưa có ảnh chuẩn')) {
    console.log('✓ Đúng thiết kế: Lần chạy đầu testGolden BÁO LỖI CHÍNH XÁC vì chưa có ảnh chuẩn trong idb!');
    console.log('  [Nội dung thông báo thực tế]:', firstLog.replace('FAIL', '[LỖI KỲ VỌNG]'));
  } else {
    console.error('LỖI: Kỳ vọng chưa có ảnh chuẩn nhưng nhận được:', firstLog);
    passedAll = false;
  }

  // Test 3: Chạy recordGolden() để ghi lại ảnh chuẩn
  console.log('\n--- 3. CHẠY recordGolden() GHI ẢNH CHUẨN ---');
  const recordResult = await recordGolden();
  if (recordResult && recordResult.v === 1 && recordResult.tol === 8 && recordResult.frames) {
    const frameKeys = Object.keys(recordResult.frames);
    console.log(`✓ recordGolden() thành công: ${frameKeys.length} khung hình tại u =`, frameKeys.join(', '));
    const sampleSig = recordResult.frames[0.25];
    console.log(`✓ Kích thước vector chữ ký mỗi frame: ${sampleSig.length} giá trị RGB (lưới 40x40x3)`);
    if (sampleSig.length !== 40 * 40 * 3) {
      console.error('LỖI: Độ dài vector chữ ký không đúng 4800!');
      passedAll = false;
    }
  } else {
    console.error('LỖI: recordGolden() không trả về đúng định dạng!', recordResult);
    passedAll = false;
  }

  // Test 4: Chạy testGolden() lần 2 sau khi đã có ảnh chuẩn
  console.log('\n--- 4. CHẠY testGolden() LẦN HAI (KỲ VỌNG PASS ĐỘ NHẠY > 8) ---');
  let secondLog = null;
  console.log = (...args) => {
    secondLog = args.join(' ');
  };

  try {
    await testGolden();
  } finally {
    console.log = origLog;
  }

  if (secondLog && secondLog.startsWith('PASS golden')) {
    console.log('✓ testGolden() LẦN HAI ĐẠT:', secondLog);
  } else {
    console.error('LỖI: testGolden() lần hai thất bại!', secondLog);
    passedAll = false;
  }

  console.log('\n----------------------------------------------------------------');
  if (passedAll) {
    console.log('PASS testGolden - HOÀN TẤT VÀ ĐÚNG THIẾT KẾ');
    console.log('================================================================');
    process.exit(0);
  } else {
    console.error('LỖI: KIỂM THỬ THẺ G1 THẤT BẠI!');
    console.log('================================================================');
    process.exit(1);
  }
}

if (require.main === module) {
  runCardG1Tests().catch(err => {
    console.error('Lỗi ngoại lệ khi chạy test Thẻ G1:', err);
    process.exit(1);
  });
}

module.exports = { runCardG1Tests };
