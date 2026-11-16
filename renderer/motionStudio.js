/**
 * Antigravity Theme Studio - Motion Studio (Flow Map & Cinemagraph Engine)
 * Converts any static image into an infinite 60fps flowing animation.
 */

class MotionStudio {
  constructor(options = {}) {
    this.container = options.container;
    this.imgUrl = options.imgUrl || '';
    this.arrows = []; // [{ x1, y1, x2, y2, speed }] (normalized 0..1)
    this.pins = [];   // [{ x, y, radius }] (normalized 0..1)
    this.activeTool = 'arrow'; // 'arrow' | 'pin' | 'erase'
    this.flowSpeed = 1.0;
    this.isPlaying = false;
    this.animFrameId = null;
    this.startTime = Date.now();

    // Canvas Layers
    this.displayCanvas = null; // Canvas showing arrows/pins or WebGL
    this.webglCanvas = null;
    this.gl = null;
    this.shaderProgram = null;
    this.imageTexture = null;
    this.flowTexture = null;
    this.flowCanvas = null; // 256x256 offscreen flow map
    this.flowCtx = null;

    this.currentImg = new Image();
    this.isDragging = false;
    this.dragStart = null;
    this.dragCurrent = null;

    this.onStateChange = options.onStateChange || (() => {});
  }

  init(domElement) {
    if (domElement) this.container = domElement;
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="motion-studio-wrap">
        <div class="motion-toolbar">
          <div class="motion-tool-group">
            <button class="motion-tool-btn active" data-tool="arrow" title="Vẽ mũi tên dòng chảy (Kéo chuột từ gốc đến ngọn)">
              🏹 Mũi tên chuyển động
            </button>
            <button class="motion-tool-btn" data-tool="pin" title="Cắm ghim cố định (Chặn vùng không cho trôi)">
              📍 Ghim neo cố định
            </button>
            <button class="motion-tool-btn" data-tool="erase" title="Tẩy xóa mũi tên hoặc ghim gần nhất">
              🧹 Tẩy xóa
            </button>
            <button class="motion-tool-btn danger" id="btnClearMotion" title="Xóa toàn bộ">
              🗑️ Xóa hết
            </button>
          </div>

          <div class="motion-tool-group">
            <span class="motion-label">Tốc độ:</span>
            <input type="range" id="sliderMotionSpeed" min="0.2" max="3.0" step="0.1" value="1.0" style="width:90px;">
            <span id="valMotionSpeed" style="font-size:11px;color:#7DCFFF;min-width:30px;">1.0x</span>
          </div>

          <div class="motion-tool-group">
            <button class="motion-action-btn primary" id="btnTogglePlayMotion">
              ▶️ Chạy xem thử
            </button>
            <button class="motion-action-btn success" id="btnApplyMotion">
              ✨ Áp dụng vào Antigravity
            </button>
          </div>
        </div>

        <div class="motion-canvas-container" id="motionCanvasContainer">
          <canvas id="motionEditorCanvas"></canvas>
          <canvas id="motionWebglCanvas" style="display:none;"></canvas>
          <div class="motion-hint-badge" id="motionHintBadge">
            💡 Kéo thả chuột để vẽ hướng tóc bay, nước chảy hoặc mây trôi.
          </div>
        </div>
      </div>
    `;

    this.editorCanvas = this.container.querySelector('#motionEditorCanvas');
    this.webglCanvas = this.container.querySelector('#motionWebglCanvas');
    this.editorCtx = this.editorCanvas.getContext('2d');

    // Create offscreen flow canvas for vector field texture
    this.flowCanvas = document.createElement('canvas');
    this.flowCanvas.width = 256;
    this.flowCanvas.height = 256;
    this.flowCtx = this.flowCanvas.getContext('2d');

    this.setupEvents();
    this.initWebGL();

    if (this.imgUrl) {
      this.loadImage(this.imgUrl);
    }
  }

  setupEvents() {
    // Tool buttons
    this.container.querySelectorAll('.motion-tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.motion-tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTool = btn.getAttribute('data-tool');
        this.updateHint();
      });
    });

    // Speed slider
    const slider = this.container.querySelector('#sliderMotionSpeed');
    const valText = this.container.querySelector('#valMotionSpeed');
    if (slider) {
      slider.addEventListener('input', (e) => {
        this.flowSpeed = parseFloat(e.target.value);
        if (valText) valText.textContent = this.flowSpeed.toFixed(1) + 'x';
        this.updateFlowTexture();
      });
    }

    // Clear button
    const btnClear = this.container.querySelector('#btnClearMotion');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn xóa tất cả mũi tên và ghim chuyển động?')) {
          this.arrows = [];
          this.pins = [];
          this.updateFlowTexture();
          this.redrawEditor();
          this.onStateChange(this.exportConfig());
        }
      });
    }

    // Play/Pause button
    const btnPlay = this.container.querySelector('#btnTogglePlayMotion');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        this.togglePlay();
      });
    }

    // Apply button
    const btnApply = this.container.querySelector('#btnApplyMotion');
    if (btnApply) {
      btnApply.addEventListener('click', () => {
        if (this.onApply) {
          this.onApply(this.exportConfig());
        }
      });
    }

    // Canvas mouse interactions
    this.editorCanvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }

  updateHint() {
    const badge = this.container.querySelector('#motionHintBadge');
    if (!badge) return;
    if (this.activeTool === 'arrow') {
      badge.textContent = '🏹 Nhấp & Kéo chuột để vẽ hướng tóc, váy, nước hoặc mây chuyển động.';
    } else if (this.activeTool === 'pin') {
      badge.textContent = '📍 Nhấp chuột vào mặt, mắt, chi tiết cơ thể để cắm ghim cố định không cho trôi.';
    } else if (this.activeTool === 'erase') {
      badge.textContent = '🧹 Nhấp vào mũi tên hoặc ghim gần nhất để xóa.';
    }
  }

  loadImage(url) {
    this.imgUrl = url;
    this.currentImg = new Image();
    this.currentImg.crossOrigin = 'anonymous';
    this.currentImg.onload = () => {
      this.resizeCanvas();
      this.updateImageTexture();
      this.updateFlowTexture();
      this.redrawEditor();
    };
    this.currentImg.src = url;
  }

  resizeCanvas() {
    if (!this.editorCanvas || !this.currentImg.naturalWidth) return;
    const containerW = this.editorCanvas.parentElement.clientWidth || 700;
    const maxH = 460;

    const imgW = this.currentImg.naturalWidth;
    const imgH = this.currentImg.naturalHeight;

    let targetW = containerW;
    let targetH = Math.round((imgH / imgW) * targetW);

    if (targetH > maxH) {
      targetH = maxH;
      targetW = Math.round((imgW / imgH) * targetH);
    }

    this.editorCanvas.width = targetW;
    this.editorCanvas.height = targetH;
    this.webglCanvas.width = targetW;
    this.webglCanvas.height = targetH;

    if (this.gl) {
      this.gl.viewport(0, 0, targetW, targetH);
    }
  }

  getCanvasPos(e) {
    const rect = this.editorCanvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    };
  }

  onMouseDown(e) {
    if (e.button !== 0) return;
    const pos = this.getCanvasPos(e);

    if (this.activeTool === 'pin') {
      this.pins.push({ x: pos.x, y: pos.y, radius: 0.08 });
      this.updateFlowTexture();
      this.redrawEditor();
      this.onStateChange(this.exportConfig());
      return;
    }

    if (this.activeTool === 'erase') {
      this.eraseNear(pos);
      return;
    }

    if (this.activeTool === 'arrow') {
      this.isDragging = true;
      this.dragStart = pos;
      this.dragCurrent = pos;
    }
  }

  onMouseMove(e) {
    if (!this.isDragging || this.activeTool !== 'arrow') return;
    this.dragCurrent = this.getCanvasPos(e);
    this.redrawEditor();
  }

  onMouseUp(e) {
    if (!this.isDragging || this.activeTool !== 'arrow') return;
    this.isDragging = false;
    const end = this.getCanvasPos(e);
    const dx = end.x - this.dragStart.x;
    const dy = end.y - this.dragStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.02) {
      this.arrows.push({
        x1: this.dragStart.x,
        y1: this.dragStart.y,
        x2: end.x,
        y2: end.y,
        speed: Math.min(2.5, Math.max(0.4, dist * 6))
      });
      this.updateFlowTexture();
      this.redrawEditor();
      this.onStateChange(this.exportConfig());
    }

    this.dragStart = null;
    this.dragCurrent = null;
  }

  eraseNear(pos) {
    let changed = false;
    // Check pins first
    const pinIdx = this.pins.findIndex(p => {
      const d = Math.hypot(p.x - pos.x, p.y - pos.y);
      return d < 0.05;
    });
    if (pinIdx !== -1) {
      this.pins.splice(pinIdx, 1);
      changed = true;
    } else {
      // Check arrows
      const arrowIdx = this.arrows.findIndex(a => {
        const mx = (a.x1 + a.x2) / 2;
        const my = (a.y1 + a.y2) / 2;
        return Math.hypot(mx - pos.x, my - pos.y) < 0.06;
      });
      if (arrowIdx !== -1) {
        this.arrows.splice(arrowIdx, 1);
        changed = true;
      }
    }

    if (changed) {
      this.updateFlowTexture();
      this.redrawEditor();
      this.onStateChange(this.exportConfig());
    }
  }

  redrawEditor() {
    const ctx = this.editorCtx;
    if (!ctx) return;
    const w = this.editorCanvas.width;
    const h = this.editorCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw background base image
    if (this.currentImg.complete && this.currentImg.naturalWidth) {
      ctx.drawImage(this.currentImg, 0, 0, w, h);
    }

    // Dim background slightly when editing
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, w, h);

    // Draw Freeze Pins
    this.pins.forEach(pin => {
      const px = pin.x * w;
      const py = pin.y * h;
      const r = (pin.radius || 0.08) * Math.min(w, h);

      // Freeze halo radius
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pin Head
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#EF4444';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw Motion Arrows
    this.arrows.forEach(arrow => {
      this.drawArrow(ctx, arrow.x1 * w, arrow.y1 * h, arrow.x2 * w, arrow.y2 * h, '#38EF7D', '#11998E');
    });

    // Draw Current Dragging Arrow
    if (this.isDragging && this.dragStart && this.dragCurrent) {
      this.drawArrow(
        ctx,
        this.dragStart.x * w,
        this.dragStart.y * h,
        this.dragCurrent.x * w,
        this.dragCurrent.y * h,
        '#FFE066',
        '#FFA07A'
      );
    }
  }

  drawArrow(ctx, x1, y1, x2, y2, headColor, bodyColor) {
    const headLen = 12;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy);

    if (dist < 4) return;

    // Outer glow
    ctx.save();
    ctx.shadowColor = headColor;
    ctx.shadowBlur = 8;

    // Body
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = bodyColor || '#38EF7D';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Origin dot
    ctx.beginPath();
    ctx.arc(x1, y1, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = headColor || '#11998E';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  // === WEBGL SIMULATION & FLOW FIELD ===
  initWebGL() {
    const gl = this.webglCanvas.getContext('webgl', { premultipliedAlpha: false, alpha: false });
    if (!gl) return;
    this.gl = gl;

    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = (a_position + 1.0) * 0.5;
        v_uv.y = 1.0 - v_uv.y;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform sampler2D u_image;
      uniform sampler2D u_flow;
      uniform float u_time;
      uniform float u_speed;
      varying vec2 v_uv;

      void main() {
        vec4 flow = texture2D(u_flow, v_uv);
        // RG: directional vector mapped from 0..1 to -1..1
        vec2 dir = (flow.rg - 0.5) * 2.0;
        float speed = flow.b * u_speed;
        float mask = flow.a;

        if (mask < 0.01 || length(dir) < 0.01) {
          gl_FragColor = texture2D(u_image, v_uv);
          return;
        }

        vec2 flowVec = normalize(dir) * speed * 0.075 * mask;

        // Two-phase advection cycle
        float t1 = fract(u_time * 0.45);
        float t2 = fract(u_time * 0.45 + 0.5);

        vec2 uv1 = v_uv - flowVec * t1;
        vec2 uv2 = v_uv - flowVec * t2;

        float weight = abs((t1 - 0.5) * 2.0);

        vec4 col1 = texture2D(u_image, clamp(uv1, 0.0, 1.0));
        vec4 col2 = texture2D(u_image, clamp(uv2, 0.0, 1.0));

        gl_FragColor = mix(col1, col2, weight);
      }
    `;

    const createShader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);
    this.shaderProgram = program;

    // Full screen quad buffer
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    this.imageTexture = gl.createTexture();
    this.flowTexture = gl.createTexture();
  }

  updateImageTexture() {
    if (!this.gl || !this.currentImg.complete) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.currentImg);
  }

  updateFlowTexture() {
    if (!this.gl || !this.flowCtx) return;
    const w = this.flowCanvas.width;
    const h = this.flowCanvas.height;
    const ctx = this.flowCtx;

    // Neutral flow: RG = 128 (no direction), B = 0 (no speed), A = 0 (freeze)
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = 128;     // R
      data[i + 1] = 128; // G
      data[i + 2] = 0;   // B
      data[i + 3] = 0;   // A
    }

    // Calculate influence of each arrow and pin at each grid pixel
    for (let py = 0; py < h; py++) {
      const ny = py / h;
      for (let px = 0; px < w; px++) {
        const nx = px / w;
        const idx = (py * w + px) * 4;

        // Check pins (Freeze Mask)
        let pinDist = 999;
        for (const pin of this.pins) {
          const d = Math.hypot(nx - pin.x, ny - pin.y);
          const r = pin.radius || 0.08;
          if (d < r) {
            pinDist = 0;
            break;
          }
          pinDist = Math.min(pinDist, (d - r) / (r * 1.5));
        }

        if (pinDist <= 0) {
          continue; // Frozen
        }

        const pinWeight = Math.min(1.0, pinDist);

        // Calculate flow direction from arrows using Inverse Distance Weighting
        let totalWeight = 0;
        let flowDx = 0;
        let flowDy = 0;
        let flowSpeed = 0;

        for (const arrow of this.arrows) {
          const arrowMidX = (arrow.x1 + arrow.x2) / 2;
          const arrowMidY = (arrow.y1 + arrow.y2) / 2;
          const d = Math.hypot(nx - arrowMidX, ny - arrowMidY);
          const weight = 1.0 / Math.pow(Math.max(d, 0.04), 2.2);

          const adx = arrow.x2 - arrow.x1;
          const ady = arrow.y2 - arrow.y1;
          const alen = Math.hypot(adx, ady) || 1;

          flowDx += (adx / alen) * weight;
          flowDy += (ady / alen) * weight;
          flowSpeed += (arrow.speed || 1.0) * weight;
          totalWeight += weight;
        }

        if (totalWeight > 0.001) {
          flowDx /= totalWeight;
          flowDy /= totalWeight;
          flowSpeed /= totalWeight;

          const mag = Math.hypot(flowDx, flowDy);
          if (mag > 0.001) {
            const ndx = flowDx / mag;
            const ndy = flowDy / mag;

            data[idx] = Math.round(((ndx + 1) / 2) * 255);
            data[idx + 1] = Math.round(((ndy + 1) / 2) * 255);
            data[idx + 2] = Math.round(Math.min(255, flowSpeed * 100));
            data[idx + 3] = Math.round(pinWeight * 255); // Alpha mask
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Upload to WebGL flow texture
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.flowTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.flowCanvas);
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    const btnPlay = this.container.querySelector('#btnTogglePlayMotion');

    if (this.isPlaying) {
      if (btnPlay) {
        btnPlay.textContent = '⏸️ Tạm dừng';
        btnPlay.classList.add('active');
      }
      this.editorCanvas.style.display = 'none';
      this.webglCanvas.style.display = 'block';
      this.startTime = Date.now();
      this.renderLoop();
    } else {
      if (btnPlay) {
        btnPlay.textContent = '▶️ Chạy xem thử';
        btnPlay.classList.remove('active');
      }
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      this.webglCanvas.style.display = 'none';
      this.editorCanvas.style.display = 'block';
      this.redrawEditor();
    }
  }

  renderLoop() {
    if (!this.isPlaying || !this.gl) return;
    const gl = this.gl;
    const elapsed = (Date.now() - this.startTime) / 1000;

    gl.useProgram(this.shaderProgram);

    // Bind Image Texture (Unit 0)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
    gl.uniform1i(gl.getUniformLocation(this.shaderProgram, 'u_image'), 0);

    // Bind Flow Texture (Unit 1)
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.flowTexture);
    gl.uniform1i(gl.getUniformLocation(this.shaderProgram, 'u_flow'), 1);

    gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_time'), elapsed);
    gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_speed'), this.flowSpeed);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    this.animFrameId = requestAnimationFrame(() => this.renderLoop());
  }

  exportConfig() {
    return {
      enabled: this.arrows.length > 0,
      flowSpeed: this.flowSpeed,
      arrows: this.arrows,
      pins: this.pins
    };
  }

  importConfig(cfg = {}) {
    this.arrows = cfg.arrows || [];
    this.pins = cfg.pins || [];
    this.flowSpeed = cfg.flowSpeed || 1.0;

    const slider = this.container ? this.container.querySelector('#sliderMotionSpeed') : null;
    const valText = this.container ? this.container.querySelector('#valMotionSpeed') : null;
    if (slider) slider.value = this.flowSpeed;
    if (valText) valText.textContent = this.flowSpeed.toFixed(1) + 'x';

    this.updateFlowTexture();
    this.redrawEditor();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MotionStudio;
}
