/**
 * Antigravity Theme Studio - Video & Social Import Studio
 * 3-Step Pipeline: Cắt viền (Crop) ➔ Xử lý ảnh (Color Grade) ➔ Nhập Theme động (Export)
 * Supports YouTube (Standard, Shortlink, Shorts), TikTok (Video, Shortlinks), and Direct Media (MP4, WEBM, PNG, JPG, WEBP).
 */

class VideoImportStudio {
  /**
   * Supported Aspect Ratios
   */
  static ASPECT_RATIOS = {
    '16:9': 16 / 9,
    '21:9': 21 / 9,
    '1:1': 1.0,
    'free': null
  };

  static ASPECT_RATIO_LABELS = {
    '16:9': '16:9 (Desktop)',
    '21:9': '21:9 (Ultrawide)',
    '1:1': '1:1 (Pet / Avatar)',
    'free': 'Tự do (Free)'
  };

  /**
   * Color Grade Presets
   */
  static FILTER_PRESETS = {
    'normal': {
      id: 'normal',
      name: 'Bình thường (Normal)',
      icon: '✨',
      description: 'Màu gốc nguyên bản, độ tương phản và độ nét cân bằng',
      brightness: 0,
      contrast: 100,
      saturation: 100,
      blur: 0,
      sharpen: 0,
      tint: 'none'
    },
    'lofi-warm': {
      id: 'lofi-warm',
      name: 'Lofi Ấm áp (Warm)',
      icon: '☕',
      description: 'Tone ấm hoài niệm, hơi dịu bão hòa, phủ vàng cam nhẹ',
      brightness: 6,
      contrast: 110,
      saturation: 85,
      blur: 0,
      sharpen: 10,
      tint: 'warm'
    },
    'cyberpunk': {
      id: 'cyberpunk',
      name: 'Cyberpunk Neon',
      icon: '⚡',
      description: 'Tương phản rực rỡ, bão hòa cao, phủ sắc Cyan & Magenta',
      brightness: 8,
      contrast: 135,
      saturation: 160,
      blur: 0,
      sharpen: 25,
      tint: 'cyberpunk'
    },
    'dark-clean': {
      id: 'dark-clean',
      name: 'Dark Clean (Tối sâu)',
      icon: '🌑',
      description: 'Hạ độ sáng nền, tăng tương phản sâu, phù hợp theme tối Hallmark',
      brightness: -15,
      contrast: 125,
      saturation: 75,
      blur: 0,
      sharpen: 15,
      tint: 'dark-clean'
    }
  };

  /**
   * URL Parser: YouTube, TikTok, Direct Media
   */
  static parseUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return {
        url: '',
        platform: 'unknown',
        isValid: false,
        error: 'URL trống hoặc không hợp lệ'
      };
    }

    const trimmed = rawUrl.trim();

    // 1. YouTube Detection
    const ytId = VideoImportStudio.extractYouTubeId(trimmed);
    if (ytId) {
      const maxResUrl = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
      const hqUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      const mqUrl = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
      const embedUrl = `https://www.youtube.com/embed/${ytId}`;

      return {
        url: trimmed,
        platform: 'youtube',
        videoId: ytId,
        thumbnailUrl: maxResUrl,
        maxResThumbnailUrl: maxResUrl,
        hqThumbnailUrl: hqUrl,
        mqThumbnailUrl: mqUrl,
        embedUrl: embedUrl,
        mediaType: 'image',
        isValid: true
      };
    }

    // 2. TikTok Detection
    const tiktokInfo = VideoImportStudio.extractTikTokInfo(trimmed);
    if (tiktokInfo) {
      return {
        url: trimmed,
        platform: 'tiktok',
        videoId: tiktokInfo.videoId || null,
        username: tiktokInfo.username || null,
        oembedUrl: tiktokInfo.oembedUrl,
        thumbnailUrl: tiktokInfo.thumbnailUrl || null,
        embedUrl: tiktokInfo.embedUrl || null,
        mediaType: 'video',
        isValid: true
      };
    }

    // 3. Direct Video / Image Detection
    const directMedia = VideoImportStudio.detectDirectMedia(trimmed);
    if (directMedia) {
      return {
        url: trimmed,
        platform: directMedia.platform,
        mediaType: directMedia.mediaType,
        thumbnailUrl: directMedia.mediaType === 'image' ? trimmed : null,
        videoUrl: directMedia.mediaType === 'video' ? trimmed : null,
        isValid: true
      };
    }

    // Fallback if URL is a valid web URL
    try {
      new URL(trimmed);
      return {
        url: trimmed,
        platform: 'generic-url',
        mediaType: 'image',
        thumbnailUrl: trimmed,
        isValid: true
      };
    } catch {
      return {
        url: trimmed,
        platform: 'unknown',
        isValid: false,
        error: 'Định dạng URL không hợp lệ'
      };
    }
  }

  /**
   * Extract YouTube Video ID from standard watch, shorts, embed, youtu.be
   */
  static extractYouTubeId(url) {
    if (!url) return null;
    const str = url.trim();

    // youtu.be/<id>
    const shortMatch = str.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
    if (shortMatch) return shortMatch[1];

    // youtube.com/shorts/<id>
    const shortsMatch = str.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
    if (shortsMatch) return shortsMatch[1];

    // youtube.com/embed/<id> or /v/<id>
    const embedMatch = str.match(/youtube\.com\/(?:embed|v)\/([a-zA-Z0-9_-]{11})/i);
    if (embedMatch) return embedMatch[1];

    // watch?v=<id> or ?...&v=<id>
    const watchMatch = str.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
    if (watchMatch) return watchMatch[1];

    return null;
  }

  /**
   * Extract TikTok info (username, video ID, oEmbed endpoint)
   */
  static extractTikTokInfo(url) {
    if (!url) return null;
    const str = url.trim();
    if (!/(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/i.test(str)) return null;

    let videoId = null;
    let username = null;

    const userMatch = str.match(/@([^/?#]+)\/video\/(\d+)/i);
    if (userMatch) {
      username = userMatch[1];
      videoId = userMatch[2];
    } else {
      const vMatch = str.match(/\/v\/(\d+)/i);
      if (vMatch) videoId = vMatch[1];
    }

    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(str)}`;
    return {
      videoId,
      username,
      oembedUrl,
      thumbnailUrl: null,
      embedUrl: videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : null
    };
  }

  /**
   * Detect direct video or image URLs
   */
  static detectDirectMedia(url) {
    if (!url) return null;
    const cleanUrl = url.trim().split('?')[0].split('#')[0].toLowerCase();

    if (/\.(mp4|webm|ogv|mov|mkv)$/i.test(cleanUrl)) {
      return { platform: 'direct-video', mediaType: 'video' };
    }
    if (/\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(cleanUrl)) {
      return { platform: 'direct-image', mediaType: 'image' };
    }
    if (url.startsWith('data:image/')) {
      return { platform: 'direct-image', mediaType: 'image' };
    }
    if (url.startsWith('data:video/')) {
      return { platform: 'direct-video', mediaType: 'video' };
    }
    return null;
  }

  /**
   * Constructor
   */
  constructor(options = {}) {
    this.container = options.container || null;
    this.imgUrl = options.imgUrl || '';

    // Callbacks
    this.onApplyWallpaper = options.onApplyWallpaper || (() => {});
    this.onSendToMotionStudio = options.onSendToMotionStudio || (() => {});
    this.onApplyPet = options.onApplyPet || (() => {});
    this.onStateChange = options.onStateChange || (() => {});

    // Pipeline State
    this.currentStep = 1; // 1: Crop, 2: Process, 3: Export
    this.sourceData = null; // Result from parseUrl
    this.currentImg = null; // Image or Video element
    this.naturalWidth = 1920;
    this.naturalHeight = 1080;
    this.isMediaLoaded = false;

    // Step 1: Crop State (Normalized 0..1)
    this.aspectRatio = '16:9'; // '16:9' | '21:9' | '1:1' | 'free'
    this.cropBox = { x: 0, y: 0, w: 1, h: 1 };
    this.isDragging = false;
    this.dragMode = null; // 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
    this.dragStart = { x: 0, y: 0 };
    this.cropBoxStart = { x: 0, y: 0, w: 1, h: 1 };

    // Step 2: Filters State
    this.filters = {
      brightness: 0,    // -50..+50
      contrast: 100,    // 50..180%
      saturation: 100,  // 0..200%
      blur: 0,          // 0..16px
      sharpen: 0,       // 0..100%
      preset: 'normal',
      tint: 'none'
    };

    // Step 3: Export Cache
    this.lastExportDataUrl = null;

    // DOM & Canvas References
    this.dom = {};
    this.cropCanvas = null;
    this.cropCtx = null;
    this.filterCanvas = null;
    this.filterCtx = null;

    // Bound handlers for clean removal
    this._onMouseDown = this.handleCropMouseDown.bind(this);
    this._onMouseMove = this.handleCropMouseMove.bind(this);
    this._onMouseUp = this.handleCropMouseUp.bind(this);
    this._onTouchStart = this.handleCropTouchStart.bind(this);
    this._onTouchMove = this.handleCropTouchMove.bind(this);
    this._onTouchEnd = this.handleCropTouchEnd.bind(this);

    // Initial configuration if imgUrl provided
    if (this.imgUrl) {
      this.sourceData = VideoImportStudio.parseUrl(this.imgUrl);
    }
  }

  /**
   * Initialize DOM inside container
   */
  init(domElement) {
    if (domElement) this.container = domElement;
    if (!this.container) return;

    this.injectStyles();
    this.renderDOM();
    this.setupEvents();

    if (this.imgUrl) {
      this.loadUrl(this.imgUrl);
    } else {
      this.renderCropCanvas();
    }
  }

  /**
   * Injects CSS styles if not already present
   */
  injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('video-import-studio-styles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'video-import-studio-styles';
    styleEl.textContent = `
      .vis-wrap {
        display: flex;
        flex-direction: column;
        gap: 14px;
        background: var(--color-paper-2, #131b26);
        border: 1px solid var(--color-rule, rgba(125, 207, 255, 0.2));
        border-radius: 12px;
        padding: 16px;
        color: var(--color-ink, #f0f4fc);
        font-family: inherit;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
        user-select: none;
      }
      .vis-stepper {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--color-paper-contrast, #0a111a);
        padding: 6px;
        border-radius: 8px;
        border: 1px solid var(--color-rule, rgba(255, 255, 255, 0.08));
      }
      .vis-step-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--color-muted, #8ea1b5);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .vis-step-btn:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--color-ink, #ffffff);
      }
      .vis-step-btn.active {
        background: rgba(125, 207, 255, 0.18);
        color: #7DCFFF;
        box-shadow: 0 0 12px rgba(125, 207, 255, 0.25);
      }
      .vis-step-btn.completed {
        color: #38EF7D;
      }
      .vis-step-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        font-size: 11px;
      }
      .vis-step-btn.active .vis-step-num {
        background: #7DCFFF;
        color: #0c1622;
        font-weight: 700;
      }
      .vis-panel {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .vis-panel.hidden {
        display: none !important;
      }
      .vis-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        background: rgba(255, 255, 255, 0.02);
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.06);
      }
      .vis-btn-group {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .vis-btn {
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: #fff;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .vis-btn:hover {
        background: rgba(125, 207, 255, 0.15);
        border-color: rgba(125, 207, 255, 0.4);
      }
      .vis-btn.active {
        background: rgba(125, 207, 255, 0.25);
        border-color: #7DCFFF;
        color: #7DCFFF;
        font-weight: 600;
      }
      .vis-btn.primary {
        background: #7DCFFF;
        color: #0c1622;
        border: none;
        font-weight: 700;
      }
      .vis-btn.primary:hover {
        box-shadow: 0 0 14px rgba(125, 207, 255, 0.6);
        transform: translateY(-1px);
      }
      .vis-btn.success {
        background: linear-gradient(135deg, #11998E, #38EF7D);
        color: #052216;
        border: none;
        font-weight: 700;
      }
      .vis-btn.success:hover {
        box-shadow: 0 0 16px rgba(56, 239, 125, 0.6);
        transform: translateY(-1px);
      }
      .vis-btn.purple {
        background: linear-gradient(135deg, #8A2387, #E94057, #F27121);
        color: #fff;
        border: none;
        font-weight: 700;
      }
      .vis-btn.purple:hover {
        box-shadow: 0 0 16px rgba(233, 64, 87, 0.6);
        transform: translateY(-1px);
      }
      .vis-canvas-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #090e14;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        overflow: hidden;
        min-height: 380px;
        max-height: 520px;
      }
      .vis-canvas {
        max-width: 100%;
        max-height: 480px;
        display: block;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
      }
      .vis-badge {
        position: absolute;
        bottom: 12px;
        right: 12px;
        background: rgba(0, 0, 0, 0.75);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-family: monospace;
        backdrop-filter: blur(6px);
      }
      .vis-hint-badge {
        position: absolute;
        bottom: 12px;
        left: 12px;
        background: rgba(0, 0, 0, 0.75);
        border: 1px solid rgba(125, 207, 255, 0.3);
        color: #7DCFFF;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 11px;
        backdrop-filter: blur(6px);
      }
      .vis-controls-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        background: rgba(0, 0, 0, 0.2);
        padding: 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.06);
      }
      .vis-control-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .vis-control-header {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: var(--color-muted, #8ea1b5);
      }
      .vis-control-header span:last-child {
        color: #7DCFFF;
        font-family: monospace;
      }
      .vis-slider {
        width: 100%;
        accent-color: #7DCFFF;
        cursor: pointer;
      }
      .vis-actions-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding-top: 6px;
      }
      .vis-export-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }
      .vis-export-card {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 14px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      .vis-export-card:hover {
        border-color: #7DCFFF;
        background: rgba(125, 207, 255, 0.06);
      }
      .vis-toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #0D2818;
        border: 1px solid #38EF7D;
        color: #38EF7D;
        padding: 10px 18px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
        font-size: 13px;
        font-weight: 600;
        z-index: 99999;
        display: none;
        animation: visFadeIn 0.25s ease;
      }
      @keyframes visFadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(styleEl);
  }

  /**
   * Render Base DOM
   */
  renderDOM() {
    this.container.innerHTML = `
      <div class="vis-wrap">
        <!-- 3-Step Stepper Navigation -->
        <div class="vis-stepper">
          <button class="vis-step-btn active" data-step="1" id="visStepBtn1">
            <span class="vis-step-num">1</span>
            <span>Cắt viền & Tỉ lệ (Crop)</span>
          </button>
          <button class="vis-step-btn" data-step="2" id="visStepBtn2">
            <span class="vis-step-num">2</span>
            <span>Xử lý ảnh & Màu sắc (Grade)</span>
          </button>
          <button class="vis-step-btn" data-step="3" id="visStepBtn3">
            <span class="vis-step-num">3</span>
            <span>Nhập Theme Động (Export)</span>
          </button>
        </div>

        <!-- STEP 1: Cắt viền / Crop -->
        <div class="vis-panel" id="visPanelStep1">
          <div class="vis-toolbar">
            <div class="vis-btn-group" id="visAspectGroup">
              <span style="font-size:11px;color:#8ea1b5;margin-right:4px;">Tỉ lệ khung hình:</span>
              <button class="vis-btn active" data-aspect="16:9">🖥️ 16:9 Desktop</button>
              <button class="vis-btn" data-aspect="21:9">🌌 21:9 Ultrawide</button>
              <button class="vis-btn" data-aspect="1:1">🐱 1:1 Pet/Avatar</button>
              <button class="vis-btn" data-aspect="free">✂️ Tự do</button>
            </div>
            <div class="vis-btn-group">
              <button class="vis-btn" id="visBtnCenterCrop" title="Căn giữa khung cắt">🎯 Căn giữa</button>
              <button class="vis-btn" id="visBtnResetCrop" title="Phủ toàn bộ khung hình">🔄 Đặt lại</button>
            </div>
          </div>

          <div class="vis-canvas-container" id="visCropContainer">
            <canvas class="vis-canvas" id="visCropCanvas"></canvas>
            <div class="vis-hint-badge">💡 Kéo góc / cạnh để cắt viền đen, watermark TikTok hoặc UI YouTube</div>
            <div class="vis-badge" id="visCropDimBadge">1920 × 1080 (16:9)</div>
          </div>

          <div class="vis-actions-bar">
            <span style="font-size:11px;color:#8ea1b5;" id="visMediaSourceLabel">Nguồn: Chưa tải media</span>
            <button class="vis-btn primary" id="visBtnGoToStep2">Tiếp tục: Xử lý màu sắc ➔</button>
          </div>
        </div>

        <!-- STEP 2: Xử lý ảnh / Color Grade -->
        <div class="vis-panel hidden" id="visPanelStep2">
          <div class="vis-toolbar">
            <div class="vis-btn-group" id="visPresetGroup">
              <span style="font-size:11px;color:#8ea1b5;margin-right:4px;">Bộ lọc nhanh:</span>
              <button class="vis-btn active" data-preset="normal">✨ Bình thường</button>
              <button class="vis-btn" data-preset="lofi-warm">☕ Lofi Ấm áp</button>
              <button class="vis-btn" data-preset="cyberpunk">⚡ Cyberpunk Neon</button>
              <button class="vis-btn" data-preset="dark-clean">🌑 Dark Clean</button>
            </div>
            <button class="vis-btn" id="visBtnResetFilters">↺ Đặt lại bộ lọc</button>
          </div>

          <div class="vis-canvas-container">
            <canvas class="vis-canvas" id="visFilterCanvas"></canvas>
            <div class="vis-hint-badge">🎨 Xem trước màu sắc & độ nét thời gian thực</div>
          </div>

          <!-- Realtime Filter Sliders -->
          <div class="vis-controls-grid">
            <div class="vis-control-item">
              <div class="vis-control-header">
                <span>Độ sáng (Brightness)</span>
                <span id="visValBrightness">0</span>
              </div>
              <input type="range" class="vis-slider" id="visSliderBrightness" min="-50" max="50" step="1" value="0">
            </div>

            <div class="vis-control-item">
              <div class="vis-control-header">
                <span>Độ tương phản (Contrast)</span>
                <span id="visValContrast">100%</span>
              </div>
              <input type="range" class="vis-slider" id="visSliderContrast" min="50" max="180" step="1" value="100">
            </div>

            <div class="vis-control-item">
              <div class="vis-control-header">
                <span>Độ bão hòa (Saturation)</span>
                <span id="visValSaturation">100%</span>
              </div>
              <input type="range" class="vis-slider" id="visSliderSaturation" min="0" max="200" step="1" value="100">
            </div>

            <div class="vis-control-item">
              <div class="vis-control-header">
                <span>Độ mờ hậu cảnh (Blur)</span>
                <span id="visValBlur">0px</span>
              </div>
              <input type="range" class="vis-slider" id="visSliderBlur" min="0" max="16" step="0.5" value="0">
            </div>

            <div class="vis-control-item">
              <div class="vis-control-header">
                <span>Độ sắc nét (Sharpen)</span>
                <span id="visValSharpen">0%</span>
              </div>
              <input type="range" class="vis-slider" id="visSliderSharpen" min="0" max="100" step="5" value="0">
            </div>
          </div>

          <div class="vis-actions-bar">
            <button class="vis-btn" id="visBtnBackToStep1">⬅ Quay lại Cắt viền</button>
            <button class="vis-btn primary" id="visBtnGoToStep3">Tiếp tục: Xuất & Áp dụng ➔</button>
          </div>
        </div>

        <!-- STEP 3: Nhập Theme Động / Export -->
        <div class="vis-panel hidden" id="visPanelStep3">
          <div class="vis-canvas-container" style="min-height: 280px; max-height: 380px;">
            <canvas class="vis-canvas" id="visExportCanvas"></canvas>
            <div class="vis-badge" id="visExportDimBadge">1920 × 1080 • Đã xử lý</div>
          </div>

          <div class="vis-export-grid">
            <div class="vis-export-card">
              <span style="font-size:24px;">🖼️</span>
              <div style="font-weight:600;font-size:13px;">Làm Wallpaper</div>
              <div style="font-size:11px;color:#8ea1b5;">Cài làm hình nền tĩnh cho Antigravity</div>
              <button class="vis-btn success" style="margin-top:8px;width:100%;" id="visBtnApplyWallpaper">
                ✨ Áp dụng Wallpaper
              </button>
            </div>

            <div class="vis-export-card">
              <span style="font-size:24px;">🌊</span>
              <div style="font-weight:600;font-size:13px;">Motion Studio</div>
              <div style="font-size:11px;color:#8ea1b5;">Chuyển sang vẽ dòng chảy 60fps vô tận</div>
              <button class="vis-btn purple" style="margin-top:8px;width:100%;" id="visBtnSendMotion">
                🚀 Chuyển sang Motion Studio
              </button>
            </div>

            <div class="vis-export-card">
              <span style="font-size:24px;">🐾</span>
              <div style="font-weight:600;font-size:13px;">Làm Pet Companion</div>
              <div style="font-size:11px;color:#8ea1b5;">Đặt làm linh vật thú cưng tương tác</div>
              <button class="vis-btn primary" style="margin-top:8px;width:100%;" id="visBtnApplyPet">
                🐱 Áp dụng cho Pet
              </button>
            </div>

            <div class="vis-export-card">
              <span style="font-size:24px;">💾</span>
              <div style="font-weight:600;font-size:13px;">Tải PNG về máy</div>
              <div style="font-size:11px;color:#8ea1b5;">Lưu file độ phân giải cao vào ổ cứng</div>
              <button class="vis-btn" style="margin-top:8px;width:100%;" id="visBtnDownloadPng">
                ⬇️ Tải ảnh PNG
              </button>
            </div>
          </div>

          <div class="vis-actions-bar">
            <button class="vis-btn" id="visBtnBackToStep2">⬅ Quay lại Chỉnh màu</button>
          </div>
        </div>
      </div>
      <div class="vis-toast" id="visToast"></div>
    `;

    // Cache elements
    this.cropCanvas = this.container.querySelector('#visCropCanvas');
    this.cropCtx = this.cropCanvas ? this.cropCanvas.getContext('2d') : null;
    this.filterCanvas = this.container.querySelector('#visFilterCanvas');
    this.filterCtx = this.filterCanvas ? this.filterCanvas.getContext('2d') : null;
    this.exportCanvas = this.container.querySelector('#visExportCanvas');
    this.exportCtx = this.exportCanvas ? this.exportCanvas.getContext('2d') : null;
  }

  /**
   * Set up UI Event Listeners
   */
  setupEvents() {
    if (!this.container) return;

    // Stepper buttons
    const stepBtns = this.container.querySelectorAll('.vis-step-btn');
    stepBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.getAttribute('data-step'), 10);
        this.setStep(step);
      });
    });

    // Navigation buttons
    const btnGoToStep2 = this.container.querySelector('#visBtnGoToStep2');
    if (btnGoToStep2) btnGoToStep2.addEventListener('click', () => this.setStep(2));

    const btnBackToStep1 = this.container.querySelector('#visBtnBackToStep1');
    if (btnBackToStep1) btnBackToStep1.addEventListener('click', () => this.setStep(1));

    const btnGoToStep3 = this.container.querySelector('#visBtnGoToStep3');
    if (btnGoToStep3) btnGoToStep3.addEventListener('click', () => this.setStep(3));

    const btnBackToStep2 = this.container.querySelector('#visBtnBackToStep2');
    if (btnBackToStep2) btnBackToStep2.addEventListener('click', () => this.setStep(2));

    // Aspect ratio buttons
    const aspectBtns = this.container.querySelectorAll('#visAspectGroup .vis-btn');
    aspectBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const aspect = btn.getAttribute('data-aspect');
        aspectBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setAspectRatio(aspect);
      });
    });

    // Center & Reset crop
    const btnCenter = this.container.querySelector('#visBtnCenterCrop');
    if (btnCenter) btnCenter.addEventListener('click', () => this.centerCropBox());

    const btnResetCrop = this.container.querySelector('#visBtnResetCrop');
    if (btnResetCrop) btnResetCrop.addEventListener('click', () => this.resetCropBox());

    // Preset buttons
    const presetBtns = this.container.querySelectorAll('#visPresetGroup .vis-btn');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const pId = btn.getAttribute('data-preset');
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyPreset(pId);
      });
    });

    // Reset filters
    const btnResetFilters = this.container.querySelector('#visBtnResetFilters');
    if (btnResetFilters) btnResetFilters.addEventListener('click', () => this.resetFilters());

    // Filter Sliders
    this.wireSlider('visSliderBrightness', 'brightness', 'visValBrightness', val => val > 0 ? `+${val}` : `${val}`);
    this.wireSlider('visSliderContrast', 'contrast', 'visValContrast', val => `${val}%`);
    this.wireSlider('visSliderSaturation', 'saturation', 'visValSaturation', val => `${val}%`);
    this.wireSlider('visSliderBlur', 'blur', 'visValBlur', val => `${val}px`);
    this.wireSlider('visSliderSharpen', 'sharpen', 'visValSharpen', val => `${val}%`);

    // Action buttons in Step 3
    const btnApplyWallpaper = this.container.querySelector('#visBtnApplyWallpaper');
    if (btnApplyWallpaper) btnApplyWallpaper.addEventListener('click', () => this.applyWallpaper());

    const btnSendMotion = this.container.querySelector('#visBtnSendMotion');
    if (btnSendMotion) btnSendMotion.addEventListener('click', () => this.sendToMotionStudio());

    const btnApplyPet = this.container.querySelector('#visBtnApplyPet');
    if (btnApplyPet) btnApplyPet.addEventListener('click', () => this.applyPet());

    const btnDownloadPng = this.container.querySelector('#visBtnDownloadPng');
    if (btnDownloadPng) btnDownloadPng.addEventListener('click', () => this.downloadExportedPng());

    // Canvas Mouse & Touch Dragging for Crop
    if (this.cropCanvas) {
      this.cropCanvas.addEventListener('mousedown', this._onMouseDown);
      window.addEventListener('mousemove', this._onMouseMove);
      window.addEventListener('mouseup', this._onMouseUp);

      this.cropCanvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
      window.addEventListener('touchmove', this._onTouchMove, { passive: false });
      window.addEventListener('touchend', this._onTouchEnd);
    }
  }

  /**
   * Helper to wire a slider input with its value label
   */
  wireSlider(sliderId, filterKey, valLabelId, formatFn) {
    const slider = this.container.querySelector(`#${sliderId}`);
    const valLabel = this.container.querySelector(`#${valLabelId}`);
    if (!slider || !valLabel) return;

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      this.filters[filterKey] = val;
      this.filters.preset = 'custom';
      valLabel.textContent = formatFn(val);

      // Deselect preset buttons
      const presetBtns = this.container.querySelectorAll('#visPresetGroup .vis-btn');
      presetBtns.forEach(b => b.classList.remove('active'));

      this.renderFilterCanvas();
    });
  }

  /**
   * Switch between Step 1, 2, 3
   */
  setStep(step) {
    this.currentStep = step;

    // Update Stepper Buttons UI
    const stepBtns = this.container ? this.container.querySelectorAll('.vis-step-btn') : [];
    stepBtns.forEach(btn => {
      const s = parseInt(btn.getAttribute('data-step'), 10);
      btn.classList.toggle('active', s === step);
      btn.classList.toggle('completed', s < step);
    });

    // Update Panels UI
    if (this.container) {
      const panel1 = this.container.querySelector('#visPanelStep1');
      const panel2 = this.container.querySelector('#visPanelStep2');
      const panel3 = this.container.querySelector('#visPanelStep3');

      if (panel1) panel1.classList.toggle('hidden', step !== 1);
      if (panel2) panel2.classList.toggle('hidden', step !== 2);
      if (panel3) panel3.classList.toggle('hidden', step !== 3);
    }

    if (step === 1) {
      this.renderCropCanvas();
    } else if (step === 2) {
      this.renderFilterCanvas();
    } else if (step === 3) {
      this.renderExportCanvas();
    }

    if (this.onStateChange) {
      this.onStateChange({ step: this.currentStep });
    }
  }

  /**
   * Load any Media URL (YouTube, TikTok, Direct Video, Image)
   */
  async loadUrl(url) {
    if (!url) return false;
    this.imgUrl = url;
    const parsed = VideoImportStudio.parseUrl(url);
    this.sourceData = parsed;

    if (this.container) {
      const label = this.container.querySelector('#visMediaSourceLabel');
      if (label) {
        label.textContent = `Nguồn: [${parsed.platform.toUpperCase()}] ${url.length > 50 ? url.substring(0, 47) + '...' : url}`;
      }
    }

    // 1. YouTube Handler
    if (parsed.platform === 'youtube') {
      return await this.loadYouTubeMedia(parsed);
    }

    // 2. TikTok Handler
    if (parsed.platform === 'tiktok') {
      return await this.loadTikTokMedia(parsed);
    }

    // 3. Direct Video Handler
    if (parsed.platform === 'direct-video') {
      return await this.loadDirectVideo(parsed.url);
    }

    // 4. Direct Image or Fallback
    return await this.loadImage(parsed.thumbnailUrl || parsed.url);
  }

  /**
   * Load YouTube thumbnail with fallback from maxresdefault to hqdefault
   */
  async loadYouTubeMedia(parsed) {
    return new Promise((resolve) => {
      if (typeof Image === 'undefined') {
        this.naturalWidth = 1920;
        this.naturalHeight = 1080;
        this.isMediaLoaded = true;
        return resolve(true);
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // YouTube returns 120x90 placeholder when maxres is absent
        if (img.naturalWidth === 120 && img.naturalHeight === 90 && parsed.hqThumbnailUrl) {
          const hqImg = new Image();
          hqImg.crossOrigin = 'anonymous';
          hqImg.onload = () => {
            this.setMediaSource(hqImg);
            resolve(true);
          };
          hqImg.onerror = () => {
            this.setMediaSource(img);
            resolve(true);
          };
          hqImg.src = parsed.hqThumbnailUrl;
        } else {
          this.setMediaSource(img);
          resolve(true);
        }
      };

      img.onerror = () => {
        if (parsed.hqThumbnailUrl) {
          const fallback = new Image();
          fallback.crossOrigin = 'anonymous';
          fallback.onload = () => {
            this.setMediaSource(fallback);
            resolve(true);
          };
          fallback.onerror = () => resolve(false);
          fallback.src = parsed.hqThumbnailUrl;
        } else {
          resolve(false);
        }
      };

      img.src = parsed.thumbnailUrl || parsed.maxResThumbnailUrl;
    });
  }

  /**
   * Load TikTok Media via oEmbed or direct media extraction
   */
  async loadTikTokMedia(parsed) {
    let resolvedThumbnail = parsed.thumbnailUrl;

    if (!resolvedThumbnail && parsed.oembedUrl && typeof fetch !== 'undefined') {
      try {
        const res = await fetch(parsed.oembedUrl);
        if (res.ok) {
          const data = await res.json();
          if (data && data.thumbnail_url) {
            resolvedThumbnail = data.thumbnail_url;
            parsed.thumbnailUrl = data.thumbnail_url;
            if (data.title && this.container) {
              const label = this.container.querySelector('#visMediaSourceLabel');
              if (label) label.textContent = `TikTok: "${data.title.substring(0, 40)}" by @${data.author_name || 'user'}`;
            }
          }
        }
      } catch (err) {
        console.warn('[VideoImportStudio] TikTok oEmbed fetch warning:', err);
      }
    }

    if (resolvedThumbnail) {
      return await this.loadImage(resolvedThumbnail);
    }

    // Default TikTok frame if offline or blocked
    return await this.loadImage(parsed.url);
  }

  /**
   * Capture a video frame from a direct .mp4 or .webm
   */
  async loadDirectVideo(videoUrl) {
    if (typeof document === 'undefined') {
      this.naturalWidth = 1920;
      this.naturalHeight = 1080;
      this.isMediaLoaded = true;
      return true;
    }

    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      let resolved = false;
      const captureFrame = () => {
        if (resolved) return;
        resolved = true;
        try {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = video.videoWidth || 1920;
          offCanvas.height = video.videoHeight || 1080;
          const ctx = offCanvas.getContext('2d');
          ctx.drawImage(video, 0, 0, offCanvas.width, offCanvas.height);
          const frameUrl = offCanvas.toDataURL('image/png');
          const img = new Image();
          img.onload = () => {
            this.setMediaSource(img);
            resolve(true);
          };
          img.src = frameUrl;
        } catch {
          this.setMediaSource(video);
          resolve(true);
        }
      };

      video.onloadeddata = () => {
        video.currentTime = Math.min(1.0, (video.duration || 1) / 2);
      };
      video.onseeked = captureFrame;
      video.onerror = () => resolve(false);
      video.src = videoUrl;

      setTimeout(() => {
        if (!resolved) captureFrame();
      }, 4000);
    });
  }

  /**
   * Load regular image
   */
  async loadImage(url) {
    if (!url) return false;
    this.imgUrl = url;

    return new Promise((resolve) => {
      if (typeof Image === 'undefined') {
        this.naturalWidth = 1920;
        this.naturalHeight = 1080;
        this.isMediaLoaded = true;
        return resolve(true);
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.setMediaSource(img);
        resolve(true);
      };
      img.onerror = () => {
        console.warn('[VideoImportStudio] Failed to load image:', url);
        resolve(false);
      };
      img.src = url;
    });
  }

  /**
   * Set active media source element
   */
  setMediaSource(imgOrVideo) {
    this.currentImg = imgOrVideo;
    this.naturalWidth = imgOrVideo.videoWidth || imgOrVideo.naturalWidth || imgOrVideo.width || 1920;
    this.naturalHeight = imgOrVideo.videoHeight || imgOrVideo.naturalHeight || imgOrVideo.height || 1080;
    this.isMediaLoaded = true;
    this.lastExportDataUrl = null;

    // Reset crop box for current aspect ratio
    this.setAspectRatio(this.aspectRatio);
  }

  getImageWidth() {
    return this.naturalWidth || 1920;
  }

  getImageHeight() {
    return this.naturalHeight || 1080;
  }

  /**
   * Step 1: Set Aspect Ratio ('16:9', '21:9', '1:1', 'free')
   */
  setAspectRatio(ratioKey) {
    this.aspectRatio = ratioKey;
    const targetRatio = VideoImportStudio.ASPECT_RATIOS[ratioKey];

    if (targetRatio && this.getImageWidth() && this.getImageHeight()) {
      const iw = this.getImageWidth();
      const ih = this.getImageHeight();
      const imgRatio = iw / ih;

      let w = 1.0;
      let h = 1.0;

      if (targetRatio >= imgRatio) {
        // Fits width, adjust height
        w = 1.0;
        h = (iw / targetRatio) / ih;
      } else {
        // Fits height, adjust width
        h = 1.0;
        w = (ih * targetRatio) / iw;
      }

      // Clamp to [0..1]
      w = Math.min(1.0, Math.max(0.1, w));
      h = Math.min(1.0, Math.max(0.1, h));

      this.cropBox = {
        x: Math.max(0, (1.0 - w) / 2),
        y: Math.max(0, (1.0 - h) / 2),
        w: w,
        h: h
      };
    }

    this.updateCropDimBadge();
    this.renderCropCanvas();
  }

  /**
   * Center crop box within current bounds
   */
  centerCropBox() {
    this.cropBox.x = Math.max(0, (1.0 - this.cropBox.w) / 2);
    this.cropBox.y = Math.max(0, (1.0 - this.cropBox.h) / 2);
    this.updateCropDimBadge();
    this.renderCropCanvas();
  }

  /**
   * Reset crop box to full cover
   */
  resetCropBox() {
    if (this.aspectRatio === 'free') {
      this.cropBox = { x: 0, y: 0, w: 1, h: 1 };
    } else {
      this.setAspectRatio(this.aspectRatio);
    }
    this.updateCropDimBadge();
    this.renderCropCanvas();
  }

  /**
   * Get exact pixel crop coordinates in source image
   */
  getCropCoordinates(customW, customH) {
    const iw = customW || this.getImageWidth();
    const ih = customH || this.getImageHeight();
    const sx = Math.max(0, Math.round(this.cropBox.x * iw));
    const sy = Math.max(0, Math.round(this.cropBox.y * ih));
    const sWidth = Math.min(iw - sx, Math.max(1, Math.round(this.cropBox.w * iw)));
    const sHeight = Math.min(ih - sy, Math.max(1, Math.round(this.cropBox.h * ih)));
    return { sx, sy, sWidth, sHeight };
  }

  /**
   * Update dimension badge in Crop step
   */
  updateCropDimBadge() {
    if (!this.container) return;
    const badge = this.container.querySelector('#visCropDimBadge');
    if (!badge) return;

    const { sWidth, sHeight } = this.getCropCoordinates();
    badge.textContent = `${sWidth} × ${sHeight} (${this.aspectRatio})`;
  }

  /**
   * Render Crop Canvas (Image + Scrim + Rule of Thirds + Handles)
   */
  renderCropCanvas() {
    if (!this.cropCanvas || !this.cropCtx) return;

    const canvas = this.cropCanvas;
    const ctx = this.cropCtx;
    const container = canvas.parentElement;

    const targetW = container ? Math.min(container.clientWidth || 720, 800) : 720;
    const targetH = Math.round(targetW * 9 / 16);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw dark pattern background
    ctx.fillStyle = '#080d14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!this.currentImg) {
      ctx.fillStyle = '#8ea1b5';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Chưa nạp media. Hãy nhập link YouTube / TikTok hoặc tải ảnh lên.', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Compute fit scale
    const iw = this.getImageWidth();
    const ih = this.getImageHeight();
    const scale = Math.min(canvas.width / iw, canvas.height / ih);
    const dispW = iw * scale;
    const dispH = ih * scale;
    const dispX = (canvas.width - dispW) / 2;
    const dispY = (canvas.height - dispH) / 2;

    this.displayBounds = { dispX, dispY, dispW, dispH, scale };

    // 1. Draw source image
    ctx.drawImage(this.currentImg, dispX, dispY, dispW, dispH);

    // 2. Compute crop box in canvas pixels
    const cx = dispX + this.cropBox.x * dispW;
    const cy = dispY + this.cropBox.y * dispH;
    const cw = this.cropBox.w * dispW;
    const ch = this.cropBox.h * dispH;

    // 3. Darkened Scrim outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    // Top
    ctx.fillRect(dispX, dispY, dispW, Math.max(0, cy - dispY));
    // Bottom
    ctx.fillRect(dispX, cy + ch, dispW, Math.max(0, (dispY + dispH) - (cy + ch)));
    // Left
    ctx.fillRect(dispX, cy, Math.max(0, cx - dispX), ch);
    // Right
    ctx.fillRect(cx + cw, cy, Math.max(0, (dispX + dispW) - (cx + cw)), ch);

    // 4. Rule of thirds grid inside crop
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(cx + cw / 3, cy);
    ctx.lineTo(cx + cw / 3, cy + ch);
    ctx.moveTo(cx + 2 * cw / 3, cy);
    ctx.lineTo(cx + 2 * cw / 3, cy + ch);
    ctx.moveTo(cx, cy + ch / 3);
    ctx.lineTo(cx + cw, cy + ch / 3);
    ctx.moveTo(cx, cy + 2 * ch / 3);
    ctx.lineTo(cx + cw, cy + 2 * ch / 3);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Border of Crop Box
    ctx.strokeStyle = '#7DCFFF';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(125, 207, 255, 0.6)';
    ctx.shadowBlur = 8;
    ctx.strokeRect(cx, cy, cw, ch);
    ctx.shadowBlur = 0;

    // 6. Draw 8 Resize Handles
    this.drawCropHandles(ctx, cx, cy, cw, ch);
  }

  /**
   * Draw corner and edge handles for crop
   */
  drawCropHandles(ctx, cx, cy, cw, ch) {
    const handleSize = 8;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0c1622';
    ctx.lineWidth = 2;

    const corners = [
      { x: cx, y: cy },
      { x: cx + cw, y: cy },
      { x: cx + cw, y: cy + ch },
      { x: cx, y: cy + ch }
    ];

    corners.forEach(c => {
      ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
    });

    // Edges
    const edges = [
      { x: cx + cw / 2, y: cy, w: 16, h: 6 },
      { x: cx + cw, y: cy + ch / 2, w: 6, h: 16 },
      { x: cx + cw / 2, y: cy + ch, w: 16, h: 6 },
      { x: cx, y: cy + ch / 2, w: 6, h: 16 }
    ];

    edges.forEach(e => {
      ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
      ctx.strokeRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
    });
  }

  /**
   * Mouse Down on Crop Canvas
   */
  handleCropMouseDown(e) {
    const pos = this.getCanvasPointerPos(e);
    if (!pos || !this.displayBounds) return;

    this.dragMode = this.detectCropHandle(pos.x, pos.y);
    if (this.dragMode) {
      this.isDragging = true;
      this.dragStart = { x: pos.x, y: pos.y };
      this.cropBoxStart = { ...this.cropBox };
    }
  }

  /**
   * Mouse Move on Crop Canvas
   */
  handleCropMouseMove(e) {
    const pos = this.getCanvasPointerPos(e);
    if (!pos || !this.displayBounds) return;

    if (!this.isDragging) {
      // Hover cursor
      const mode = this.detectCropHandle(pos.x, pos.y);
      if (mode === 'move') this.cropCanvas.style.cursor = 'move';
      else if (mode === 'nw' || mode === 'se') this.cropCanvas.style.cursor = 'nwse-resize';
      else if (mode === 'ne' || mode === 'sw') this.cropCanvas.style.cursor = 'nesw-resize';
      else if (mode === 'n' || mode === 's') this.cropCanvas.style.cursor = 'ns-resize';
      else if (mode === 'e' || mode === 'w') this.cropCanvas.style.cursor = 'ew-resize';
      else this.cropCanvas.style.cursor = 'default';
      return;
    }

    const dx = (pos.x - this.dragStart.x) / this.displayBounds.dispW;
    const dy = (pos.y - this.dragStart.y) / this.displayBounds.dispH;

    if (this.dragMode === 'move') {
      const newX = Math.max(0, Math.min(1.0 - this.cropBoxStart.w, this.cropBoxStart.x + dx));
      const newY = Math.max(0, Math.min(1.0 - this.cropBoxStart.h, this.cropBoxStart.y + dy));
      this.cropBox.x = newX;
      this.cropBox.y = newY;
    } else {
      this.resizeCropBox(this.dragMode, dx, dy);
    }

    this.updateCropDimBadge();
    this.renderCropCanvas();
  }

  /**
   * Mouse Up on Crop Canvas
   */
  handleCropMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragMode = null;
      this.lastExportDataUrl = null;
    }
  }

  handleCropTouchStart(e) {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.handleCropMouseDown(e.touches[0]);
    }
  }

  handleCropTouchMove(e) {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.handleCropMouseMove(e.touches[0]);
    }
  }

  handleCropTouchEnd() {
    this.handleCropMouseUp();
  }

  /**
   * Pointer pos relative to canvas
   */
  getCanvasPointerPos(e) {
    if (!this.cropCanvas) return null;
    const rect = this.cropCanvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    return {
      x: (clientX - rect.left) * (this.cropCanvas.width / rect.width),
      y: (clientY - rect.top) * (this.cropCanvas.height / rect.height)
    };
  }

  /**
   * Detect which handle or region is clicked
   */
  detectCropHandle(px, py) {
    if (!this.displayBounds) return null;
    const { dispX, dispY, dispW, dispH } = this.displayBounds;
    const cx = dispX + this.cropBox.x * dispW;
    const cy = dispY + this.cropBox.y * dispH;
    const cw = this.cropBox.w * dispW;
    const ch = this.cropBox.h * dispH;
    const hitRadius = 14;

    // Corners
    if (Math.hypot(px - cx, py - cy) < hitRadius) return 'nw';
    if (Math.hypot(px - (cx + cw), py - cy) < hitRadius) return 'ne';
    if (Math.hypot(px - (cx + cw), py - (cy + ch)) < hitRadius) return 'se';
    if (Math.hypot(px - cx, py - (cy + ch)) < hitRadius) return 'sw';

    // Edges
    if (Math.abs(py - cy) < hitRadius && px >= cx && px <= cx + cw) return 'n';
    if (Math.abs(py - (cy + ch)) < hitRadius && px >= cx && px <= cx + cw) return 's';
    if (Math.abs(px - cx) < hitRadius && py >= cy && py <= cy + ch) return 'w';
    if (Math.abs(px - (cx + cw)) < hitRadius && py >= cy && py <= cy + ch) return 'e';

    // Inside box
    if (px >= cx && px <= cx + cw && py >= cy && py <= cy + ch) return 'move';

    return null;
  }

  /**
   * Resize crop box while maintaining aspect ratio (if not 'free')
   */
  resizeCropBox(mode, dx, dy) {
    const start = this.cropBoxStart;
    const targetRatio = VideoImportStudio.ASPECT_RATIOS[this.aspectRatio];
    const iw = this.getImageWidth();
    const ih = this.getImageHeight();

    let newX = start.x;
    let newY = start.y;
    let newW = start.w;
    let newH = start.h;

    if (mode === 'se') {
      newW = Math.max(0.1, Math.min(1.0 - start.x, start.w + dx));
      if (targetRatio) {
        newH = (newW * iw / targetRatio) / ih;
        if (newY + newH > 1.0) {
          newH = 1.0 - newY;
          newW = (newH * ih * targetRatio) / iw;
        }
      } else {
        newH = Math.max(0.1, Math.min(1.0 - start.y, start.h + dy));
      }
    } else if (mode === 'nw') {
      newW = Math.max(0.1, Math.min(start.x + start.w, start.w - dx));
      if (targetRatio) {
        newH = (newW * iw / targetRatio) / ih;
        newX = start.x + (start.w - newW);
        newY = start.y + (start.h - newH);
      } else {
        newH = Math.max(0.1, Math.min(start.y + start.h, start.h - dy));
        newX = start.x + (start.w - newW);
        newY = start.y + (start.h - newH);
      }
    } else if (mode === 'ne') {
      newW = Math.max(0.1, Math.min(1.0 - start.x, start.w + dx));
      if (targetRatio) {
        newH = (newW * iw / targetRatio) / ih;
        newY = start.y + (start.h - newH);
      } else {
        newH = Math.max(0.1, Math.min(start.y + start.h, start.h - dy));
        newY = start.y + (start.h - newH);
      }
    } else if (mode === 'sw') {
      newW = Math.max(0.1, Math.min(start.x + start.w, start.w - dx));
      if (targetRatio) {
        newH = (newW * iw / targetRatio) / ih;
        newX = start.x + (start.w - newW);
      } else {
        newH = Math.max(0.1, Math.min(1.0 - start.y, start.h + dy));
        newX = start.x + (start.w - newW);
      }
    } else if (mode === 'e' || mode === 'w') {
      if (mode === 'e') newW = Math.max(0.1, Math.min(1.0 - start.x, start.w + dx));
      else {
        newW = Math.max(0.1, Math.min(start.x + start.w, start.w - dx));
        newX = start.x + (start.w - newW);
      }
      if (targetRatio) {
        newH = (newW * iw / targetRatio) / ih;
      }
    } else if (mode === 's' || mode === 'n') {
      if (mode === 's') newH = Math.max(0.1, Math.min(1.0 - start.y, start.h + dy));
      else {
        newH = Math.max(0.1, Math.min(start.y + start.h, start.h - dy));
        newY = start.y + (start.h - newH);
      }
      if (targetRatio) {
        newW = (newH * ih * targetRatio) / iw;
      }
    }

    // Clamp inside [0..1]
    newX = Math.max(0, Math.min(1.0 - newW, newX));
    newY = Math.max(0, Math.min(1.0 - newH, newY));

    this.cropBox.x = newX;
    this.cropBox.y = newY;
    this.cropBox.w = newW;
    this.cropBox.h = newH;
  }

  /**
   * STEP 2: Color Grade & Filters
   */
  applyPreset(presetKey) {
    const preset = VideoImportStudio.FILTER_PRESETS[presetKey];
    if (!preset) return false;

    this.filters.preset = presetKey;
    this.filters.brightness = preset.brightness;
    this.filters.contrast = preset.contrast;
    this.filters.saturation = preset.saturation;
    this.filters.blur = preset.blur;
    this.filters.sharpen = preset.sharpen;
    this.filters.tint = preset.tint || 'none';

    this.updateFilterSlidersUI();
    this.renderFilterCanvas();
    return true;
  }

  setFilter(name, value) {
    if (name in this.filters) {
      this.filters[name] = Number(value);
      this.filters.preset = 'custom';
      this.updateFilterSlidersUI();
      this.renderFilterCanvas();
      return true;
    }
    return false;
  }

  resetFilters() {
    this.applyPreset('normal');
  }

  updateFilterSlidersUI() {
    if (!this.container) return;
    const b = this.container.querySelector('#visSliderBrightness');
    if (b) b.value = this.filters.brightness;
    const vb = this.container.querySelector('#visValBrightness');
    if (vb) vb.textContent = this.filters.brightness > 0 ? `+${this.filters.brightness}` : this.filters.brightness;

    const c = this.container.querySelector('#visSliderContrast');
    if (c) c.value = this.filters.contrast;
    const vc = this.container.querySelector('#visValContrast');
    if (vc) vc.textContent = `${this.filters.contrast}%`;

    const s = this.container.querySelector('#visSliderSaturation');
    if (s) s.value = this.filters.saturation;
    const vs = this.container.querySelector('#visValSaturation');
    if (vs) vs.textContent = `${this.filters.saturation}%`;

    const bl = this.container.querySelector('#visSliderBlur');
    if (bl) bl.value = this.filters.blur;
    const vbl = this.container.querySelector('#visValBlur');
    if (vbl) vbl.textContent = `${this.filters.blur}px`;

    const sh = this.container.querySelector('#visSliderSharpen');
    if (sh) sh.value = this.filters.sharpen;
    const vsh = this.container.querySelector('#visValSharpen');
    if (vsh) vsh.textContent = `${this.filters.sharpen}%`;
  }

  /**
   * Render Filter Preview Canvas
   */
  renderFilterCanvas() {
    if (!this.filterCanvas || !this.filterCtx || !this.currentImg) return;

    const canvas = this.filterCanvas;
    const ctx = this.filterCtx;
    const { sx, sy, sWidth, sHeight } = this.getCropCoordinates();

    const targetW = Math.min(canvas.parentElement ? canvas.parentElement.clientWidth || 720 : 720, 800);
    const targetH = Math.round(targetW * (sHeight / sWidth));

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply CSS filters on context
    const bPercent = 100 + this.filters.brightness;
    const cPercent = this.filters.contrast;
    const sPercent = this.filters.saturation;
    const blurPx = this.filters.blur;

    ctx.filter = `brightness(${bPercent}%) contrast(${cPercent}%) saturate(${sPercent}%) blur(${blurPx}px)`;
    ctx.drawImage(this.currentImg, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';

    // Apply color grading tints
    this.applyTintOverlay(ctx, canvas.width, canvas.height, this.filters.tint);

    // Apply Convolution Sharpen if requested
    if (this.filters.sharpen > 0) {
      this.applySharpenConvolution(ctx, canvas.width, canvas.height, this.filters.sharpen);
    }

    this.lastExportDataUrl = null;
  }

  /**
   * Color Grade Tints (warm, cyberpunk, dark-clean)
   */
  applyTintOverlay(ctx, width, height, tint) {
    if (tint === 'warm') {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(255, 170, 90, 0.25)';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    } else if (tint === 'cyberpunk') {
      ctx.save();
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0.22)');
      grad.addColorStop(1, 'rgba(255, 0, 128, 0.22)');
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    } else if (tint === 'dark-clean') {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  /**
   * Fast 3x3 Sharpen Convolution
   */
  applySharpenConvolution(ctx, width, height, amount) {
    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const copy = new Uint8ClampedArray(data);
      const k = (amount / 100) * 0.75;

      for (let y = 1; y < height - 1; y++) {
        const yOff = y * width;
        for (let x = 1; x < width - 1; x++) {
          const idx = (yOff + x) * 4;
          for (let c = 0; c < 3; c++) {
            const center = copy[idx + c];
            const up = copy[((y - 1) * width + x) * 4 + c];
            const down = copy[((y + 1) * width + x) * 4 + c];
            const left = copy[(yOff + x - 1) * 4 + c];
            const right = copy[(yOff + x + 1) * 4 + c];
            const val = center * (1 + 4 * k) - (up + down + left + right) * k;
            data[idx + c] = val < 0 ? 0 : (val > 255 ? 255 : val);
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (e) {
      // Ignore security errors in tainted canvas
    }
  }

  /**
   * STEP 3: Render Final Export Preview
   */
  renderExportCanvas() {
    if (!this.exportCanvas || !this.exportCtx || !this.currentImg) return;

    const canvas = this.exportCanvas;
    const ctx = this.exportCtx;
    const { sx, sy, sWidth, sHeight } = this.getCropCoordinates();

    const targetW = Math.min(canvas.parentElement ? canvas.parentElement.clientWidth || 720 : 720, 720);
    const targetH = Math.round(targetW * (sHeight / sWidth));

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bPercent = 100 + this.filters.brightness;
    const cPercent = this.filters.contrast;
    const sPercent = this.filters.saturation;
    const blurPx = this.filters.blur;

    ctx.filter = `brightness(${bPercent}%) contrast(${cPercent}%) saturate(${sPercent}%) blur(${blurPx}px)`;
    ctx.drawImage(this.currentImg, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';

    this.applyTintOverlay(ctx, canvas.width, canvas.height, this.filters.tint);

    if (this.filters.sharpen > 0) {
      this.applySharpenConvolution(ctx, canvas.width, canvas.height, this.filters.sharpen);
    }

    if (this.container) {
      const badge = this.container.querySelector('#visExportDimBadge');
      if (badge) {
        badge.textContent = `${sWidth} × ${sHeight} • ${this.aspectRatio} • Preset: ${this.filters.preset}`;
      }
    }
  }

  /**
   * Produce Full High-Resolution Processed DataURL
   */
  exportDataUrl(format = 'image/png', quality = 0.95) {
    if (this.lastExportDataUrl) return this.lastExportDataUrl;

    if (typeof document === 'undefined') {
      return this.imgUrl || '';
    }

    const { sx, sy, sWidth, sHeight } = this.getCropCoordinates();
    const offCanvas = document.createElement('canvas');
    offCanvas.width = sWidth;
    offCanvas.height = sHeight;
    const ctx = offCanvas.getContext('2d');

    const bPercent = 100 + this.filters.brightness;
    const cPercent = this.filters.contrast;
    const sPercent = this.filters.saturation;
    const blurPx = this.filters.blur;

    ctx.filter = `brightness(${bPercent}%) contrast(${cPercent}%) saturate(${sPercent}%) blur(${blurPx}px)`;
    if (this.currentImg) {
      ctx.drawImage(this.currentImg, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
    }
    ctx.filter = 'none';

    this.applyTintOverlay(ctx, sWidth, sHeight, this.filters.tint);

    if (this.filters.sharpen > 0) {
      this.applySharpenConvolution(ctx, sWidth, sHeight, this.filters.sharpen);
    }

    try {
      this.lastExportDataUrl = offCanvas.toDataURL(format, quality);
    } catch {
      this.lastExportDataUrl = this.imgUrl;
    }

    return this.lastExportDataUrl;
  }

  /**
   * Action 1: Apply as Wallpaper
   */
  async applyWallpaper() {
    const dataUrl = this.exportDataUrl();
    if (this.onApplyWallpaper) {
      await this.onApplyWallpaper(dataUrl);
    }
    this.showToast('✨ Đã áp dụng làm hình nền Wallpaper!');
    return dataUrl;
  }

  /**
   * Action 2: Send to Motion Studio (60fps flowmap)
   */
  async sendToMotionStudio() {
    const dataUrl = this.exportDataUrl();
    if (this.onSendToMotionStudio) {
      await this.onSendToMotionStudio(dataUrl);
    }
    this.showToast('🚀 Đã gửi sang Motion Studio để tạo ảnh động!');
    return dataUrl;
  }

  /**
   * Action 3: Apply for Pet Companion / Avatar
   */
  async applyPet() {
    const dataUrl = this.exportDataUrl();
    if (this.onApplyPet) {
      await this.onApplyPet(dataUrl);
    }
    this.showToast('🐾 Đã áp dụng cho Pet Companion!');
    return dataUrl;
  }

  /**
   * Action 4: Download processed PNG
   */
  downloadExportedPng() {
    const dataUrl = this.exportDataUrl();
    if (typeof document === 'undefined') return;

    const link = document.createElement('a');
    link.download = `antigravity-theme-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    this.showToast('💾 Đang tải ảnh PNG về máy...');
  }

  /**
   * Show feedback toast
   */
  showToast(message) {
    if (!this.container) return;
    const toast = this.container.querySelector('#visToast');
    if (!toast) return;

    toast.textContent = message;
    toast.style.display = 'block';

    setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  }

  /**
   * Cleanup event listeners
   */
  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this._onMouseMove);
      window.removeEventListener('mouseup', this._onMouseUp);
      window.removeEventListener('touchmove', this._onTouchMove);
      window.removeEventListener('touchend', this._onTouchEnd);
    }
    if (this.cropCanvas) {
      this.cropCanvas.removeEventListener('mousedown', this._onMouseDown);
      this.cropCanvas.removeEventListener('touchstart', this._onTouchStart);
    }
  }
}

// Global browser window export
if (typeof window !== 'undefined') {
  window.VideoImportStudio = VideoImportStudio;
}

// Node.js CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoImportStudio;
}
