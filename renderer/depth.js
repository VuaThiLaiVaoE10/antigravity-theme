/**
 * depth.js - Depth Engine (Gợi ý độ sâu tự động & cọ tô bản đồ độ sâu)
 * 
 * Strict Ownership: Worker B (motion-engine-dev)
 * 
 * Features:
 * 1. generateAutoDepth(imageOrCanvas, options): Tự động tính toán bản đồ độ sâu cục bộ từ
 *    sự kết hợp của luminance, gradient phối cảnh dọc (vertical perspective) và độ nổi viền (edge saliency).
 * 2. Cọ tô độ sâu (Depth Brush): Tô mượt vùng độ sâu theo bán kính, độ cứng (hardness) và giá trị độ sâu (0.0..1.0).
 * 3. Gradient độ sâu: Phối cảnh tuyến tính hoặc xuyên tâm (radial).
 * 4. Tích hợp WebGL Texture: Cung cấp texture bản đồ độ sâu cho MotionEngine parallax.
 * 
 * 100% Client-side: Không gọi API ra bên ngoài.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DepthEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class DepthEngineCore {
    constructor() {
      this.width = 256;
      this.height = 256;
      this.canvas = null;
      this.ctx = null;
      this.depthBuffer = new Uint8Array(this.width * this.height);
      this.brush = {
        radius: 25,
        hardness: 0.5,
        depthValue: 0.8, // 0.0 = xa nhất, 1.0 = gần nhất
        opacity: 0.8
      };
      this.listeners = [];
      this._initCanvas();
      this.clearToDefault(0.5);
    }

    _initCanvas() {
      if (typeof document !== 'undefined') {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d');
      }
    }

    clearToDefault(depthVal = 0.5) {
      const gray = Math.round(Math.max(0, Math.min(1, depthVal)) * 255);
      if (this.depthBuffer) this.depthBuffer.fill(gray);
      if (this.ctx) {
        this.ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
      }
      this._emitChange('clear', { depthVal });
    }

    getCanvas() {
      return this.canvas;
    }

    setBrush(options = {}) {
      if (typeof options.radius === 'number') this.brush.radius = Math.max(2, options.radius);
      if (typeof options.hardness === 'number') this.brush.hardness = Math.max(0, Math.min(1, options.hardness));
      if (typeof options.depthValue === 'number') this.brush.depthValue = Math.max(0, Math.min(1, options.depthValue));
      if (typeof options.opacity === 'number') this.brush.opacity = Math.max(0.05, Math.min(1, options.opacity));
      return Object.assign({}, this.brush);
    }

    getBrush() {
      return Object.assign({}, this.brush);
    }

    /**
     * Tô độ sâu tại tọa độ chuẩn hóa (nx, ny: 0.0 .. 1.0)
     */
    paintDepth(nx, ny, overrideValue = null) {
      const x = Math.round(nx * (this.width - 1));
      const y = Math.round(ny * (this.height - 1));
      const r = this.brush.radius;
      const val = overrideValue !== null ? overrideValue : this.brush.depthValue;
      const gray = Math.round(Math.max(0, Math.min(1, val)) * 255);
      const alpha = this.brush.opacity;

      // Update in-memory depthBuffer
      const rHard = r * this.brush.hardness;
      const rSoftRange = Math.max(0.001, r - rHard);

      const yMin = Math.max(0, y - r);
      const yMax = Math.min(this.height - 1, y + r);
      const xMin = Math.max(0, x - r);
      const xMax = Math.min(this.width - 1, x + r);

      for (let py = yMin; py <= yMax; py++) {
        const dy = py - y;
        for (let px = xMin; px <= xMax; px++) {
          const dx = px - x;
          const dist = Math.hypot(dx, dy);
          if (dist <= r) {
            let falloff = 1.0;
            if (dist > rHard) {
              falloff = 1.0 - (dist - rHard) / rSoftRange;
            }
            const effAlpha = alpha * falloff;
            const idx = py * this.width + px;
            const cur = this.depthBuffer[idx];
            this.depthBuffer[idx] = Math.round(cur * (1.0 - effAlpha) + gray * effAlpha);
          }
        }
      }

      // Update canvas if present
      if (this.ctx && this.canvas) {
        const ctx = this.ctx;
        ctx.save();
        const grad = ctx.createRadialGradient(x, y, r * this.brush.hardness, x, y, r);
        grad.addColorStop(0, `rgba(${gray}, ${gray}, ${gray}, ${alpha})`);
        grad.addColorStop(1, `rgba(${gray}, ${gray}, ${gray}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      this._emitChange('paint', { x, y, depthValue: val });
    }

    /**
     * Tạo gradient độ sâu (vertical perspective hoặc radial)
     */
    paintGradient(type = 'vertical', startVal = 0.1, endVal = 0.9) {
      const w = this.width;
      const h = this.height;
      const gStart = Math.max(0, Math.min(1, startVal));
      const gEnd = Math.max(0, Math.min(1, endVal));

      if (type === 'vertical') {
        for (let y = 0; y < h; y++) {
          const progress = y / (h - 1);
          const val = gStart + (gEnd - gStart) * progress;
          const byteVal = Math.round(val * 255);
          for (let x = 0; x < w; x++) {
            this.depthBuffer[y * w + x] = byteVal;
          }
        }
      } else if (type === 'radial') {
        const cx = w / 2;
        const cy = h / 2;
        const maxR = Math.min(cx, cy);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const dist = Math.hypot(x - cx, y - cy);
            const progress = Math.min(1.0, dist / maxR);
            const val = gEnd + (gStart - gEnd) * progress;
            this.depthBuffer[y * w + x] = Math.round(val * 255);
          }
        }
      }

      if (this.ctx && this.canvas) {
        const ctx = this.ctx;
        const bgStart = Math.round(gStart * 255);
        const bgEnd = Math.round(gEnd * 255);
        ctx.save();
        let grad;
        if (type === 'vertical') {
          grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, `rgb(${bgStart}, ${bgStart}, ${bgStart})`);
          grad.addColorStop(1, `rgb(${bgEnd}, ${bgEnd}, ${bgEnd})`);
        } else if (type === 'radial') {
          const cx = w / 2;
          const cy = h / 2;
          const r = Math.min(cx, cy);
          grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          grad.addColorStop(0, `rgb(${bgEnd}, ${bgEnd}, ${bgEnd})`);
          grad.addColorStop(1, `rgb(${bgStart}, ${bgStart}, ${bgStart})`);
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      this._emitChange('gradient', { type, startVal, endVal });
    }

    /**
     * Gợi ý độ sâu tự động (Auto-Depth Estimation) từ ảnh nguồn:
     * Kết hợp:
     * - Phối cảnh dọc (vertical perspective): gốc ảnh thường ở tiền cảnh (gần hơn)
     * - Độ sáng (luminance): các chi tiết sáng nổi bật thường ở gần hơn
     * - Độ tương phản biên (edge contrast): chủ thể có chi tiết biên sắc nét
     * - Bộ lọc làm mịn Gaussian 5x5 để độ sâu chuyển tiếp mềm mại không giật
     */
    generateAutoDepth(imageOrCanvas, options = {}) {
      if (!imageOrCanvas) return null;

      const w = this.width;
      const h = this.height;

      // Offscreen canvas để đọc pixel ảnh nguồn
      let sampleCanvas = null;
      let sampleCtx = null;

      if (typeof document !== 'undefined') {
        sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = w;
        sampleCanvas.height = h;
        sampleCtx = sampleCanvas.getContext('2d');
      }

      if (!sampleCtx) {
        // Fallback môi trường Node.js
        this.paintGradient('vertical', 0.2, 0.9);
        return this.canvas;
      }

      sampleCtx.drawImage(imageOrCanvas, 0, 0, w, h);
      const srcData = sampleCtx.getImageData(0, 0, w, h);
      const src = srcData.data;

      const depthData = this.ctx.createImageData(w, h);
      const out = depthData.data;

      const weightVertical = typeof options.verticalWeight === 'number' ? options.verticalWeight : 0.45;
      const weightLuminance = typeof options.luminanceWeight === 'number' ? options.luminanceWeight : 0.35;
      const weightSaliency = typeof options.saliencyWeight === 'number' ? options.saliencyWeight : 0.20;

      // Bước 1: Tính toán độ sâu thô cho từng pixel
      const rawDepth = new Float32Array(w * h);

      for (let y = 0; y < h; y++) {
        const ny = y / h; // 0..1 từ trên xuống
        // Phối cảnh dọc cong nhẹ (quang học mắt nhìn mặt đất)
        const vertFactor = Math.pow(ny, 1.2);

        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = src[idx];
          const g = src[idx + 1];
          const b = src[idx + 2];

          // Độ sáng chuẩn Rec. 709
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

          // Độ nổi biên cục bộ (Sobel nhẹ đơn giản)
          let edge = 0;
          if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
            const idxLeft = (y * w + (x - 1)) * 4;
            const idxRight = (y * w + (x + 1)) * 4;
            const idxUp = ((y - 1) * w + x) * 4;
            const idxDown = ((y + 1) * w + x) * 4;

            const lumLeft = (src[idxLeft] * 0.3 + src[idxLeft + 1] * 0.59 + src[idxLeft + 2] * 0.11) / 255;
            const lumRight = (src[idxRight] * 0.3 + src[idxRight + 1] * 0.59 + src[idxRight + 2] * 0.11) / 255;
            const lumUp = (src[idxUp] * 0.3 + src[idxUp + 1] * 0.59 + src[idxUp + 2] * 0.11) / 255;
            const lumDown = (src[idxDown] * 0.3 + src[idxDown + 1] * 0.59 + src[idxDown + 2] * 0.11) / 255;

            edge = Math.min(1.0, (Math.abs(lumRight - lumLeft) + Math.abs(lumDown - lumUp)) * 1.5);
          }

          const d = vertFactor * weightVertical + lum * weightLuminance + edge * weightSaliency;
          rawDepth[y * w + x] = Math.max(0.05, Math.min(0.95, d));
        }
      }

      // Bước 2: Làm mịn Box/Gaussian 3x3 để loại bỏ nhiễu hạt
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let sum = 0;
          let count = 0;

          for (let dy = -1; dy <= 1; dy++) {
            const py = y + dy;
            if (py < 0 || py >= h) continue;
            for (let dx = -1; dx <= 1; dx++) {
              const px = x + dx;
              if (px < 0 || px >= w) continue;
              const weight = (dx === 0 && dy === 0) ? 2.0 : 1.0;
              sum += rawDepth[py * w + px] * weight;
              count += weight;
            }
          }

          const smoothed = sum / count;
          const byteVal = Math.round(smoothed * 255);
          const outIdx = (y * w + x) * 4;
          out[outIdx] = byteVal;     // R
          out[outIdx + 1] = byteVal; // G
          out[outIdx + 2] = byteVal; // B
          out[outIdx + 3] = 255;     // A
          if (this.depthBuffer) this.depthBuffer[y * w + x] = byteVal;
        }
      }

      this.ctx.putImageData(depthData, 0, 0);
      this._emitChange('autoDepthGenerated', { width: w, height: h });
      return this.canvas;
    }

    /**
     * Đọc giá trị độ sâu tại điểm chuẩn hóa (nx, ny)
     */
    getDepthAt(nx, ny) {
      const x = Math.max(0, Math.min(this.width - 1, Math.round(nx * (this.width - 1))));
      const y = Math.max(0, Math.min(this.height - 1, Math.round(ny * (this.height - 1))));
      if (this.depthBuffer) {
        return this.depthBuffer[y * this.width + x] / 255;
      }
      if (this.ctx && this.canvas) {
        const pixel = this.ctx.getImageData(x, y, 1, 1).data;
        return pixel[0] / 255;
      }
      return 0.5;
    }

    exportDataURL() {
      if (!this.canvas) return '';
      return this.canvas.toDataURL('image/png');
    }

    importDataURL(dataUrl) {
      if (!dataUrl) return Promise.reject(new Error('No dataURL'));
      return new Promise((resolve, reject) => {
        if (typeof Image === 'undefined') return resolve(false);
        const img = new Image();
        img.onload = () => {
          this.ctx.clearRect(0, 0, this.width, this.height);
          this.ctx.drawImage(img, 0, 0, this.width, this.height);
          this._emitChange('imported', img);
          resolve(true);
        };
        img.onerror = reject;
        img.src = dataUrl;
      });
    }

    on(fn) {
      if (typeof fn === 'function') this.listeners.push(fn);
    }

    _emitChange(type = 'change', data = null) {
      for (const fn of this.listeners) {
        try { fn(type, data); } catch (e) { console.error(e); }
      }
    }
  }

  const instance = new DepthEngineCore();
  instance.DepthEngineCore = DepthEngineCore;
  return instance;
});
