/**
 * segment.js - Local Image Segmentation & Region Proposal Engine
 * 
 * Strict Ownership: Worker B (motion-adv-dev)
 * 
 * Contract:
 * MotionEngine.suggestRegions() -> Promise<Layer[]>
 * 
 * 100% Offline, Deterministic, Client-Side Analysis:
 * Absolutely NO AI / Generative models. Uses spatial color-clustering,
 * luminance, saturation, and directional gradient analysis.
 * 
 * Detects 3-4 natural candidate regions:
 * 1. Tóc bay (Hair / Strands) - Pastel Pink #FF9EAF, Depth 0.85, Physics Enabled
 * 2. Váy lay động (Dress / Fabric) - Pastel Lavender #BB9AF7, Depth 0.70, Physics Enabled
 * 3. Suối nước (Stream / Waterfall) - Pastel Blue #7AA2F7, Depth 0.45, Physics Disabled
 * 4. Mây trôi (Clouds / Sky) - Pastel Cyan #7DCFFF, Depth 0.15, Physics Disabled
 * 
 * Each candidate includes a feathered alpha mask Canvas, flow arrows,
 * fixed pins, physics configuration, and pastel identification colors.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PetSegment = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function createMaskCanvas(w = 256, h = 256) {
    if (typeof document !== 'undefined' && document.createElement) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    }
    // Headless / Node.js Mock Canvas
    const buffer = new Uint8ClampedArray(w * h * 4);
    return {
      width: w,
      height: h,
      _data: buffer,
      getContext: function () {
        return {
          createImageData: (width, height) => ({
            width,
            height,
            data: new Uint8ClampedArray(width * height * 4)
          }),
          getImageData: (sx, sy, sw, sh) => ({
            width: sw,
            height: sh,
            data: buffer
          }),
          putImageData: (imgData) => {
            buffer.set(imgData.data);
          },
          fillRect: () => {},
          drawImage: () => {}
        };
      },
      toDataURL: () => 'data:image/png;base64,mock'
    };
  }

  // Parse Hex color into [r, g, b]
  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  class SegmentEngine {
    constructor() {
      this.name = 'SegmentEngine';
      this.regionTemplates = [
        {
          idPrefix: 'hair',
          name: 'Tóc bay',
          color: '#FF9EAF', // Pastel Rose
          depth: 0.85,
          speed: 1.2,
          intensity: 1.0,
          direction: 110,
          feather: 18,
          maxShift: 25,
          physics: {
            enabled: true,
            stiffness: 1.2,
            damping: 0.7,
            lag: 0.4
          }
        },
        {
          idPrefix: 'dress',
          name: 'Váy lay động',
          color: '#BB9AF7', // Pastel Lavender
          depth: 0.70,
          speed: 0.9,
          intensity: 1.2,
          direction: 85,
          feather: 20,
          maxShift: 30,
          physics: {
            enabled: true,
            stiffness: 0.8,
            damping: 0.8,
            lag: 0.5
          }
        },
        {
          idPrefix: 'water',
          name: 'Suối nước',
          color: '#7AA2F7', // Pastel Blue
          depth: 0.45,
          speed: 1.6,
          intensity: 1.4,
          direction: 90,
          feather: 15,
          maxShift: 25,
          physics: {
            enabled: false,
            stiffness: 1.0,
            damping: 0.9,
            lag: 0.2
          }
        },
        {
          idPrefix: 'cloud',
          name: 'Mây trôi',
          color: '#7DCFFF', // Pastel Cyan
          depth: 0.15,
          speed: 0.5,
          intensity: 0.6,
          direction: 0,
          feather: 25,
          maxShift: 20,
          physics: {
            enabled: false,
            stiffness: 1.0,
            damping: 1.0,
            lag: 0.1
          }
        }
      ];
    }

    /**
     * Extracts ImageData from various input formats (Canvas, Image, ImageData, or Node mock).
     */
    extractImageData(canvasOrImageData) {
      if (!canvasOrImageData) return null;

      // Direct ImageData object
      if (canvasOrImageData.data && typeof canvasOrImageData.width === 'number' && typeof canvasOrImageData.height === 'number') {
        return canvasOrImageData;
      }

      // Canvas element
      if (typeof canvasOrImageData.getContext === 'function') {
        try {
          const ctx = canvasOrImageData.getContext('2d');
          if (ctx && typeof ctx.getImageData === 'function') {
            return ctx.getImageData(0, 0, canvasOrImageData.width, canvasOrImageData.height);
          }
        } catch (e) {}
      }

      // Image element
      if (typeof document !== 'undefined' && document.createElement) {
        try {
          const w = canvasOrImageData.naturalWidth || canvasOrImageData.width || 256;
          const h = canvasOrImageData.naturalHeight || canvasOrImageData.height || 256;
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = w;
          tempCanvas.height = h;
          const ctx = tempCanvas.getContext('2d');
          ctx.drawImage(canvasOrImageData, 0, 0, w, h);
          return ctx.getImageData(0, 0, w, h);
        } catch (e) {}
      }

      return null;
    }

    /**
     * Deterministic Multi-Feature Analysis Grid.
     * Computes luminance, saturation, color bias, edge gradients, and spatial priors.
     */
    analyzeGrid(imgData, gridW = 64, gridH = 64) {
      const srcW = imgData.width;
      const srcH = imgData.height;
      const data = imgData.data;

      const grid = new Array(gridH);
      for (let y = 0; y < gridH; y++) {
        grid[y] = new Array(gridW);
      }

      for (let gy = 0; gy < gridH; gy++) {
        const ny = (gy + 0.5) / gridH;
        const py = Math.min(srcH - 1, Math.floor(ny * srcH));

        for (let gx = 0; gx < gridW; gx++) {
          const nx = (gx + 0.5) / gridW;
          const px = Math.min(srcW - 1, Math.floor(nx * srcW));

          const idx = (py * srcW + px) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          // Compute luminance and saturation
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const sat = maxC - minC;

          // Color biases
          const blueBias = b - (r + g) / 2;
          const redBias = r - (g + b) / 2;

          // Edge gradient approximation from adjacent pixels
          let grad = 0;
          if (px > 0 && px < srcW - 1 && py > 0 && py < srcH - 1) {
            const idxLeft = (py * srcW + (px - 1)) * 4;
            const idxRight = (py * srcW + (px + 1)) * 4;
            const idxUp = ((py - 1) * srcW + px) * 4;
            const idxDown = ((py + 1) * srcW + px) * 4;

            const dX = Math.abs(data[idxRight] - data[idxLeft]);
            const dY = Math.abs(data[idxDown] - data[idxUp]);
            grad = (dX + dY) / 2;
          }

          grid[gy][gx] = {
            nx,
            ny,
            r,
            g,
            b,
            a,
            lum,
            sat,
            blueBias,
            redBias,
            grad
          };
        }
      }

      return grid;
    }

    /**
     * Evaluate suitability score of a grid cell for each semantic region.
     */
    evaluateCellScores(cell) {
      if (cell.a < 20) {
        return [0, 0, 0, 0];
      }

      const { nx, ny, lum, sat, blueBias, grad } = cell;

      // 1. TÓC BAY (Hair): Upper-center region, high directional gradient, moderate-to-dark contrast
      const hairSpatial = Math.exp(-Math.pow((ny - 0.28) / 0.18, 2) - Math.pow((nx - 0.50) / 0.32, 2));
      const hairEdge = Math.min(1.0, grad / 60.0);
      const scoreHair = hairSpatial * (0.45 + 0.55 * hairEdge);

      // 2. VÁY LAY ĐỘNG (Dress / Fabric): Mid-lower region, vibrant saturation or vertical draping
      const dressSpatial = Math.exp(-Math.pow((ny - 0.60) / 0.20, 2) - Math.pow((nx - 0.50) / 0.30, 2));
      const dressSat = Math.min(1.0, sat / 80.0);
      const scoreDress = dressSpatial * (0.50 + 0.50 * dressSat);

      // 3. SUỐI NƯỚC (Stream / Water): Lower area, blue/cyan bias or fluid gradient
      const waterSpatial = Math.exp(-Math.pow((ny - 0.80) / 0.22, 2));
      const waterBlue = Math.max(0, Math.min(1.0, (blueBias + 40) / 100));
      const scoreWater = waterSpatial * (0.45 + 0.55 * waterBlue);

      // 4. MÂY TRÔI (Clouds / Sky): Upper atmosphere, high luminance, low edge roughness
      const cloudSpatial = Math.exp(-Math.pow((ny - 0.14) / 0.16, 2));
      const cloudLum = Math.min(1.0, lum / 200.0);
      const cloudSmooth = Math.max(0, 1.0 - grad / 80.0);
      const scoreCloud = cloudSpatial * (0.40 + 0.35 * cloudLum + 0.25 * cloudSmooth);

      return [scoreHair, scoreDress, scoreWater, scoreCloud];
    }

    /**
     * Generate feathered alpha mask canvas from downsampled membership grid.
     */
    generateMaskCanvas(membershipGrid, gridW, gridH, targetW = 256, targetH = 256, pastelColor = '#7DCFFF') {
      const canvas = createMaskCanvas(targetW, targetH);
      const ctx = canvas.getContext('2d');
      const imgData = ctx.createImageData(targetW, targetH);
      const data = imgData.data;

      const [pr, pg, pb] = hexToRgb(pastelColor);

      // 2D separable box-feather blur over membership grid
      const blurRadius = 2;
      const blurred = new Float32Array(gridW * gridH);

      // Horizontal pass
      const tempH = new Float32Array(gridW * gridH);
      for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
          let sum = 0;
          let count = 0;
          for (let dx = -blurRadius; dx <= blurRadius; dx++) {
            const nx = x + dx;
            if (nx >= 0 && nx < gridW) {
              sum += membershipGrid[y * gridW + nx];
              count++;
            }
          }
          tempH[y * gridW + x] = count > 0 ? sum / count : 0;
        }
      }

      // Vertical pass
      for (let x = 0; x < gridW; x++) {
        for (let y = 0; y < gridH; y++) {
          let sum = 0;
          let count = 0;
          for (let dy = -blurRadius; dy <= blurRadius; dy++) {
            const ny = y + dy;
            if (ny >= 0 && ny < gridH) {
              sum += tempH[ny * gridW + x];
              count++;
            }
          }
          blurred[y * gridW + x] = count > 0 ? sum / count : 0;
        }
      }

      // Upsample to target canvas dimensions with smooth interpolation
      for (let ty = 0; ty < targetH; ty++) {
        const gy = (ty / targetH) * (gridH - 1);
        const y0 = Math.floor(gy);
        const y1 = Math.min(gridH - 1, y0 + 1);
        const fy = gy - y0;

        for (let tx = 0; tx < targetW; tx++) {
          const gx = (tx / targetW) * (gridW - 1);
          const x0 = Math.floor(gx);
          const x1 = Math.min(gridW - 1, x0 + 1);
          const fx = gx - x0;

          // Bilinear interpolation
          const v00 = blurred[y0 * gridW + x0];
          const v10 = blurred[y0 * gridW + x1];
          const v01 = blurred[y1 * gridW + x0];
          const v11 = blurred[y1 * gridW + x1];

          const interp = (v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy;

          // S-curve smoothstep easing on alpha
          const alphaNorm = Math.max(0, Math.min(1.0, interp));
          const easedAlpha = alphaNorm * alphaNorm * (3 - 2 * alphaNorm);
          const alphaByte = Math.round(easedAlpha * 255);

          const idx = (ty * targetW + tx) * 4;
          data[idx] = pr;
          data[idx + 1] = pg;
          data[idx + 2] = pb;
          data[idx + 3] = alphaByte;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      return canvas;
    }

    /**
     * Suggest 3-4 natural candidate regions from image.
     * Contract: suggestRegions(canvasOrImageData) -> Promise<Layer[]>
     */
    async suggestRegions(canvasOrImageData) {
      let imgData = this.extractImageData(canvasOrImageData);

      // Fallback: If no image passed, check MotionEngine currentImage
      if (!imgData && typeof window !== 'undefined' && window.MotionEngine && window.MotionEngine.currentImage) {
        imgData = this.extractImageData(window.MotionEngine.currentImage);
      }

      // If still no image, return default fallback candidate layers
      if (!imgData) {
        return this._generateDefaultCandidates();
      }

      const gridW = 48;
      const gridH = 48;
      const grid = this.analyzeGrid(imgData, gridW, gridH);

      // Membership buffers for 4 regions
      const memberships = [
        new Float32Array(gridW * gridH),
        new Float32Array(gridW * gridH),
        new Float32Array(gridW * gridH),
        new Float32Array(gridW * gridH)
      ];

      const regionStats = [
        { sumX: 0, sumY: 0, count: 0, minX: 1, minY: 1, maxX: 0, maxY: 0 },
        { sumX: 0, sumY: 0, count: 0, minX: 1, minY: 1, maxX: 0, maxY: 0 },
        { sumX: 0, sumY: 0, count: 0, minX: 1, minY: 1, maxX: 0, maxY: 0 },
        { sumX: 0, sumY: 0, count: 0, minX: 1, minY: 1, maxX: 0, maxY: 0 }
      ];

      for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
          const cell = grid[gy][gx];
          const scores = this.evaluateCellScores(cell);

          // Find dominant region
          let maxScore = 0.12;
          let dominantIdx = -1;
          for (let i = 0; i < 4; i++) {
            if (scores[i] > maxScore) {
              maxScore = scores[i];
              dominantIdx = i;
            }
          }

          if (dominantIdx >= 0) {
            memberships[dominantIdx][gy * gridW + gx] = maxScore;
            const stats = regionStats[dominantIdx];
            stats.sumX += cell.nx;
            stats.sumY += cell.ny;
            stats.count++;
            if (cell.nx < stats.minX) stats.minX = cell.nx;
            if (cell.ny < stats.minY) stats.minY = cell.ny;
            if (cell.nx > stats.maxX) stats.maxX = cell.nx;
            if (cell.ny > stats.maxY) stats.maxY = cell.ny;
          }
        }
      }

      const candidateLayers = [];
      const timestamp = Date.now();

      for (let i = 0; i < 4; i++) {
        const tmpl = this.regionTemplates[i];
        const stats = regionStats[i];

        // Ensure reasonable centroids
        let cx = stats.count > 0 ? stats.sumX / stats.count : 0.5;
        let cy = stats.count > 0 ? stats.sumY / stats.count : (0.2 + i * 0.22);
        let minY = stats.count > 0 ? stats.minY : Math.max(0, cy - 0.15);
        let maxY = stats.count > 0 ? stats.maxY : Math.min(1, cy + 0.15);

        // Clamping centroids within [0.05, 0.95]
        cx = Math.max(0.08, Math.min(0.92, cx));
        cy = Math.max(0.08, Math.min(0.92, cy));

        // Generate feathered alpha mask canvas
        const maskCanvas = this.generateMaskCanvas(
          memberships[i],
          gridW,
          gridH,
          256,
          256,
          tmpl.color
        );

        // Anchor configuration
        const anchor = {
          x: Math.round(cx * 1000) / 1000,
          y: Math.round((tmpl.idPrefix === 'hair' || tmpl.idPrefix === 'dress' ? minY + 0.04 : cy) * 1000) / 1000
        };

        // Arrows tailored to region dynamics
        const arrows = [];
        const pins = [];

        if (tmpl.idPrefix === 'hair') {
          arrows.push({
            x1: anchor.x,
            y1: anchor.y + 0.05,
            x2: Math.min(0.95, anchor.x + 0.12),
            y2: Math.min(0.95, anchor.y + 0.25),
            speed: tmpl.speed
          });
          pins.push({ x: anchor.x, y: anchor.y, radius: 0.06 });
        } else if (tmpl.idPrefix === 'dress') {
          arrows.push({
            x1: anchor.x,
            y1: anchor.y + 0.06,
            x2: Math.max(0.05, anchor.x - 0.08),
            y2: Math.min(0.95, anchor.y + 0.32),
            speed: tmpl.speed
          });
          pins.push({ x: anchor.x, y: anchor.y, radius: 0.07 });
        } else if (tmpl.idPrefix === 'water') {
          arrows.push({
            x1: cx,
            y1: Math.max(0.55, minY),
            x2: cx,
            y2: Math.min(0.95, maxY + 0.1),
            speed: tmpl.speed
          });
          pins.push({ x: Math.max(0.05, cx - 0.15), y: Math.max(0.55, minY), radius: 0.05 });
          pins.push({ x: Math.min(0.95, cx + 0.15), y: Math.max(0.55, minY), radius: 0.05 });
        } else if (tmpl.idPrefix === 'cloud') {
          arrows.push({
            x1: 0.20,
            y1: cy,
            x2: 0.65,
            y2: cy,
            speed: tmpl.speed
          });
        }

        const layer = {
          id: `layer-${tmpl.idPrefix}-${timestamp}-${i + 1}`,
          name: tmpl.name,
          color: tmpl.color,
          visible: true,
          locked: false,
          mask: maskCanvas,
          arrows,
          pins,
          speed: tmpl.speed,
          intensity: tmpl.intensity,
          direction: tmpl.direction,
          feather: tmpl.feather,
          maxShift: tmpl.maxShift,
          depth: tmpl.depth,
          physics: {
            enabled: tmpl.physics.enabled,
            anchor,
            stiffness: tmpl.physics.stiffness,
            damping: tmpl.physics.damping,
            lag: tmpl.physics.lag
          }
        };

        candidateLayers.push(layer);
      }

      return candidateLayers;
    }

    _generateDefaultCandidates() {
      const timestamp = Date.now();
      return this.regionTemplates.map((tmpl, i) => {
        const maskCanvas = createMaskCanvas(256, 256);
        return {
          id: `layer-${tmpl.idPrefix}-${timestamp}-${i + 1}`,
          name: tmpl.name,
          color: tmpl.color,
          visible: true,
          locked: false,
          mask: maskCanvas,
          arrows: [
            { x1: 0.5, y1: 0.2 + i * 0.2, x2: 0.55, y2: 0.4 + i * 0.2, speed: tmpl.speed }
          ],
          pins: [
            { x: 0.5, y: 0.2 + i * 0.2, radius: 0.06 }
          ],
          speed: tmpl.speed,
          intensity: tmpl.intensity,
          direction: tmpl.direction,
          feather: tmpl.feather,
          maxShift: tmpl.maxShift,
          depth: tmpl.depth,
          physics: {
            enabled: tmpl.physics.enabled,
            anchor: { x: 0.5, y: 0.15 + i * 0.2 },
            stiffness: tmpl.physics.stiffness,
            damping: tmpl.physics.damping,
            lag: tmpl.physics.lag
          }
        };
      });
    }
  }

  const instance = new SegmentEngine();
  instance.SegmentEngine = SegmentEngine;

  return instance;
});
