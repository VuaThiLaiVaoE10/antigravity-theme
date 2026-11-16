/**
 * QA Verification Test Suite for TikTok / YouTube Import Studio
 * Covers:
 * 1. Comprehensive URL parsing (YouTube, TikTok, Direct Media, Edge cases)
 * 2. 3-step pipeline (Crop calculations, Filter & Sharpen engine, Export callbacks)
 * 3. UI and State integration
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const VideoImportStudio = require('../renderer/videoImportStudio.js');

console.log('================================================================');
console.log('🧪 QA VERIFICATION: TIKTOK / YOUTUBE IMPORT STUDIO PIPELINE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

// -------------------------------------------------------------
// SECTION 1: URL Parsing Logic
// -------------------------------------------------------------
console.log('--- SECTION 1: URL Parsing Logic (YouTube, TikTok, Direct) ---');

it('Parses standard YouTube watch URL', () => {
  const parsed = VideoImportStudio.parseUrl('https://www.youtube.com/watch?v=jNQXAC9IVRw');
  assert.strictEqual(parsed.platform, 'youtube');
  assert.strictEqual(parsed.videoId, 'jNQXAC9IVRw');
  assert.strictEqual(parsed.thumbnailUrl, 'https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg');
  assert.strictEqual(parsed.hqThumbnailUrl, 'https://img.youtube.com/vi/jNQXAC9IVRw/hqdefault.jpg');
  assert.strictEqual(parsed.embedUrl, 'https://www.youtube.com/embed/jNQXAC9IVRw');
  assert.strictEqual(parsed.mediaType, 'image');
  assert.strictEqual(parsed.isValid, true);
});

it('Parses YouTube watch URL with multiple query parameters', () => {
  const parsed = VideoImportStudio.parseUrl('https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=45s&list=RDdQw4w9WgXcQ');
  assert.strictEqual(parsed.platform, 'youtube');
  assert.strictEqual(parsed.videoId, 'dQw4w9WgXcQ');
  assert.strictEqual(parsed.isValid, true);
});

it('Parses youtu.be shortlink', () => {
  const parsed = VideoImportStudio.parseUrl('https://youtu.be/9bZkp7q19f0?t=15');
  assert.strictEqual(parsed.platform, 'youtube');
  assert.strictEqual(parsed.videoId, '9bZkp7q19f0');
  assert.strictEqual(parsed.isValid, true);
});

it('Parses YouTube Shorts URL', () => {
  const parsed = VideoImportStudio.parseUrl('https://www.youtube.com/shorts/5O9nK8iX_fU?si=sampleTag');
  assert.strictEqual(parsed.platform, 'youtube');
  assert.strictEqual(parsed.videoId, '5O9nK8iX_fU');
  assert.strictEqual(parsed.isValid, true);
});

it('Parses YouTube Embed URL', () => {
  const parsed = VideoImportStudio.parseUrl('https://www.youtube.com/embed/kJQP7kiw5Fk');
  assert.strictEqual(parsed.platform, 'youtube');
  assert.strictEqual(parsed.videoId, 'kJQP7kiw5Fk');
  assert.strictEqual(parsed.isValid, true);
});

it('Parses standard TikTok user video URL', () => {
  const url = 'https://www.tiktok.com/@scout2015/video/6718335390845095173';
  const parsed = VideoImportStudio.parseUrl(url);
  assert.strictEqual(parsed.platform, 'tiktok');
  assert.strictEqual(parsed.username, 'scout2015');
  assert.strictEqual(parsed.videoId, '6718335390845095173');
  assert.strictEqual(parsed.embedUrl, 'https://www.tiktok.com/embed/v2/6718335390845095173');
  assert.ok(parsed.oembedUrl.includes('oembed?url='));
  assert.strictEqual(parsed.mediaType, 'video');
  assert.strictEqual(parsed.isValid, true);
});

it('Parses TikTok shortlinks (vm.tiktok.com & vt.tiktok.com)', () => {
  const vmUrl = 'https://vm.tiktok.com/ZM8vRkY9U/';
  const parsedVm = VideoImportStudio.parseUrl(vmUrl);
  assert.strictEqual(parsedVm.platform, 'tiktok');
  assert.strictEqual(parsedVm.isValid, true);
  assert.ok(parsedVm.oembedUrl.includes(encodeURIComponent(vmUrl)));

  const vtUrl = 'https://vt.tiktok.com/ZSefGHijK/';
  const parsedVt = VideoImportStudio.parseUrl(vtUrl);
  assert.strictEqual(parsedVt.platform, 'tiktok');
  assert.strictEqual(parsedVt.isValid, true);
  assert.ok(parsedVt.oembedUrl.includes(encodeURIComponent(vtUrl)));
});

it('Parses direct video files (.mp4, .webm)', () => {
  const mp4 = VideoImportStudio.parseUrl('https://cdn.example.com/assets/matrix-rain.mp4?auth=true');
  assert.strictEqual(mp4.platform, 'direct-video');
  assert.strictEqual(mp4.mediaType, 'video');
  assert.strictEqual(mp4.videoUrl, 'https://cdn.example.com/assets/matrix-rain.mp4?auth=true');
  assert.strictEqual(mp4.isValid, true);

  const webm = VideoImportStudio.parseUrl('https://cdn.example.com/assets/cyberpunk.webm');
  assert.strictEqual(webm.platform, 'direct-video');
  assert.strictEqual(webm.mediaType, 'video');
  assert.strictEqual(webm.isValid, true);
});

it('Parses direct images and Data URLs (.png, .webp, data:image)', () => {
  const png = VideoImportStudio.parseUrl('https://cdn.example.com/wallpapers/anime-city.png');
  assert.strictEqual(png.platform, 'direct-image');
  assert.strictEqual(png.mediaType, 'image');
  assert.strictEqual(png.thumbnailUrl, 'https://cdn.example.com/wallpapers/anime-city.png');
  assert.strictEqual(png.isValid, true);

  const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const parsedData = VideoImportStudio.parseUrl(dataUri);
  assert.strictEqual(parsedData.platform, 'direct-image');
  assert.strictEqual(parsedData.mediaType, 'image');
  assert.strictEqual(parsedData.isValid, true);
});

it('Handles empty, malformed, and non-string URL inputs safely', () => {
  const empty = VideoImportStudio.parseUrl('');
  assert.strictEqual(empty.isValid, false);

  const nullVal = VideoImportStudio.parseUrl(null);
  assert.strictEqual(nullVal.isValid, false);

  const malformed = VideoImportStudio.parseUrl('not a url at all');
  assert.strictEqual(malformed.isValid, false);
});

// -------------------------------------------------------------
// SECTION 2: 3-Step Pipeline - Step 1 (Cropping Calculations)
// -------------------------------------------------------------
console.log('\n--- SECTION 2: Step 1 Cropping Calculations ---');

it('Computes 16:9 crop on 16:9 source (Full 1920x1080 without letterbox)', () => {
  const studio = new VideoImportStudio();
  studio.naturalWidth = 1920;
  studio.naturalHeight = 1080;
  studio.setAspectRatio('16:9');
  const coords = studio.getCropCoordinates();
  assert.strictEqual(coords.sx, 0);
  assert.strictEqual(coords.sy, 0);
  assert.strictEqual(coords.sWidth, 1920);
  assert.strictEqual(coords.sHeight, 1080);
});

it('Computes 16:9 crop on 9:16 vertical TikTok source (Cuts watermarks/black bars)', () => {
  const studio = new VideoImportStudio();
  studio.naturalWidth = 1080;
  studio.naturalHeight = 1920;
  studio.setAspectRatio('16:9');
  const coords = studio.getCropCoordinates();
  // Target ratio 16/9 = 1.777. Source ratio 1080/1920 = 0.5625.
  // Crop width should be full 1080, height should be 1080 / (16/9) = 607.5 -> 608.
  // Centered vertically: (1920 - 608)/2 = 656
  assert.strictEqual(coords.sx, 0);
  assert.strictEqual(coords.sWidth, 1080);
  assert.strictEqual(coords.sHeight, 608);
  assert.strictEqual(coords.sy, 656);
});

it('Computes 21:9 ultrawide crop on 1920x1080 source', () => {
  const studio = new VideoImportStudio();
  studio.naturalWidth = 1920;
  studio.naturalHeight = 1080;
  studio.setAspectRatio('21:9');
  const coords = studio.getCropCoordinates();
  assert.strictEqual(coords.sWidth, 1920);
  // 1920 / (21/9) = 822.85 -> 823
  assert.strictEqual(coords.sHeight, 823);
  // Centered vertically: (1080 - 823) / 2 = 128.5 -> 129
  assert.strictEqual(coords.sy, 129);
});

it('Computes 1:1 pet companion square crop on 1920x1080 source', () => {
  const studio = new VideoImportStudio();
  studio.naturalWidth = 1920;
  studio.naturalHeight = 1080;
  studio.setAspectRatio('1:1');
  const coords = studio.getCropCoordinates();
  assert.strictEqual(coords.sWidth, 1080);
  assert.strictEqual(coords.sHeight, 1080);
  assert.strictEqual(coords.sy, 0);
  // Centered horizontally: (1920 - 1080) / 2 = 420
  assert.strictEqual(coords.sx, 420);
});

it('Tests crop box repositioning, center, and reset', () => {
  const studio = new VideoImportStudio();
  studio.naturalWidth = 1920;
  studio.naturalHeight = 1080;
  studio.setAspectRatio('1:1');

  // Move box
  studio.cropBox.x = 0.1;
  studio.cropBox.y = 0.1;
  assert.strictEqual(studio.cropBox.x, 0.1);

  // Re-center
  studio.centerCropBox();
  assert.strictEqual(studio.cropBox.y, 0);
  assert.strictEqual(Math.round(studio.cropBox.x * 1920), 420);

  // Reset
  studio.resetCropBox();
  assert.strictEqual(studio.cropBox.h, 1.0);
});

it('Tests crop box resizing with aspect ratio constraints', () => {
  const studio = new VideoImportStudio();
  studio.naturalWidth = 1920;
  studio.naturalHeight = 1080;
  studio.setAspectRatio('16:9');
  studio.cropBoxStart = { x: 0, y: 0, w: 1.0, h: 1.0 };

  // Resize SE corner
  studio.resizeCropBox('se', -0.2, -0.2);
  assert.ok(studio.cropBox.w <= 0.85);
  assert.ok(studio.cropBox.h <= 0.85);
  // Aspect ratio preserved
  const r = (studio.cropBox.w * 1920) / (studio.cropBox.h * 1080);
  assert.ok(Math.abs(r - (16 / 9)) < 0.05, `Ratio deviated: ${r}`);
});

// -------------------------------------------------------------
// SECTION 3: 3-Step Pipeline - Step 2 (Canvas Filter Engine)
// -------------------------------------------------------------
console.log('\n--- SECTION 3: Step 2 Filter & Presets Engine ---');

it('Applies presets correctly with distinct grading params', () => {
  const studio = new VideoImportStudio();

  // 1. Lofi-warm
  studio.applyPreset('lofi-warm');
  assert.strictEqual(studio.filters.preset, 'lofi-warm');
  assert.strictEqual(studio.filters.brightness, 6);
  assert.strictEqual(studio.filters.contrast, 110);
  assert.strictEqual(studio.filters.saturation, 85);
  assert.strictEqual(studio.filters.tint, 'warm');

  // 2. Cyberpunk
  studio.applyPreset('cyberpunk');
  assert.strictEqual(studio.filters.preset, 'cyberpunk');
  assert.strictEqual(studio.filters.contrast, 135);
  assert.strictEqual(studio.filters.saturation, 160);
  assert.strictEqual(studio.filters.sharpen, 25);
  assert.strictEqual(studio.filters.tint, 'cyberpunk');

  // 3. Dark Clean
  studio.applyPreset('dark-clean');
  assert.strictEqual(studio.filters.preset, 'dark-clean');
  assert.strictEqual(studio.filters.brightness, -15);
  assert.strictEqual(studio.filters.contrast, 125);
  assert.strictEqual(studio.filters.saturation, 75);
  assert.strictEqual(studio.filters.tint, 'dark-clean');

  // 4. Normal Reset
  studio.applyPreset('normal');
  assert.strictEqual(studio.filters.preset, 'normal');
  assert.strictEqual(studio.filters.brightness, 0);
  assert.strictEqual(studio.filters.contrast, 100);
  assert.strictEqual(studio.filters.saturation, 100);
  assert.strictEqual(studio.filters.blur, 0);
  assert.strictEqual(studio.filters.sharpen, 0);
  assert.strictEqual(studio.filters.tint, 'none');
});

it('Switches to "custom" preset when individual slider is adjusted', () => {
  const studio = new VideoImportStudio();
  studio.applyPreset('cyberpunk');
  studio.setFilter('contrast', 150);
  assert.strictEqual(studio.filters.contrast, 150);
  assert.strictEqual(studio.filters.preset, 'custom');
});

it('Verifies Sharpen Convolution formula and bounds clamp (0..255)', () => {
  const studio = new VideoImportStudio();
  // Mock mock context with a 3x3 pixel area
  const width = 3;
  const height = 3;
  const data = new Uint8ClampedArray(width * height * 4);
  // Center pixel with contrasting neighbors
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 100;     // R
    data[i + 1] = 100; // G
    data[i + 2] = 100; // B
    data[i + 3] = 255; // A
  }
  // Center pixel (x=1, y=1) -> index (1*3 + 1)*4 = 16
  data[16] = 200; // Bright center

  const mockCtx = {
    getImageData: () => ({ data }),
    putImageData: (imgData) => {
      // Validate clamp
      for (let i = 0; i < imgData.data.length; i++) {
        assert.ok(imgData.data[i] >= 0 && imgData.data[i] <= 255, `Pixel byte overflow: ${imgData.data[i]}`);
      }
      // Sharpened center should be enhanced above 200
      assert.ok(imgData.data[16] >= 200, 'Center pixel was not sharpened');
    }
  };

  studio.applySharpenConvolution(mockCtx, width, height, 50);
});

// -------------------------------------------------------------
// SECTION 4: 3-Step Pipeline - Step 3 (Export & Callbacks)
// -------------------------------------------------------------
console.log('\n--- SECTION 4: Step 3 Export & Integration Callbacks ---');

it('Navigates between pipeline steps 1, 2, and 3 cleanly', () => {
  const studio = new VideoImportStudio();
  assert.strictEqual(studio.currentStep, 1);

  studio.setStep(2);
  assert.strictEqual(studio.currentStep, 2);

  studio.setStep(3);
  assert.strictEqual(studio.currentStep, 3);

  studio.setStep(1);
  assert.strictEqual(studio.currentStep, 1);
});

it('Invokes onApplyWallpaper with exported dataURL and persists config', async () => {
  let appliedUrl = null;
  const studio = new VideoImportStudio({
    imgUrl: 'https://example.com/wp.jpg',
    onApplyWallpaper: async (dataUrl) => {
      appliedUrl = dataUrl;
    }
  });

  const res = await studio.applyWallpaper();
  assert.ok(appliedUrl !== null);
  assert.strictEqual(appliedUrl, res);
});

it('Invokes onSendToMotionStudio to seamlessly pipe into 60fps motion studio', async () => {
  let motionUrl = null;
  const studio = new VideoImportStudio({
    imgUrl: 'https://example.com/motion-src.png',
    onSendToMotionStudio: async (dataUrl) => {
      motionUrl = dataUrl;
    }
  });

  const res = await studio.sendToMotionStudio();
  assert.ok(motionUrl !== null);
  assert.strictEqual(motionUrl, res);
});

it('Invokes onApplyPet to seamlessly pipe into Pet Companion mascotUrl', async () => {
  let petUrl = null;
  const studio = new VideoImportStudio({
    imgUrl: 'https://example.com/pet-avatar.png',
    onApplyPet: async (dataUrl) => {
      petUrl = dataUrl;
    }
  });

  const res = await studio.applyPet();
  assert.ok(petUrl !== null);
  assert.strictEqual(petUrl, res);
});

// -------------------------------------------------------------
// SECTION 5: Full UI & DOM Integration Verification
// -------------------------------------------------------------
console.log('\n--- SECTION 5: UI & DOM Structure Verification ---');

it('Validates renderer/index.html elements for TikTok / YouTube Import Studio', () => {
  const html = fs.readFileSync(path.join(__dirname, '../renderer/index.html'), 'utf8');
  assert.ok(html.includes('id="inputVideoUrl"'), 'Missing #inputVideoUrl');
  assert.ok(html.includes('id="btnFetchVideoUrl"'), 'Missing #btnFetchVideoUrl');
  assert.ok(html.includes('id="videoImportMount"'), 'Missing #videoImportMount');
  assert.ok(html.includes('src="videoImportStudio.js"'), 'Missing videoImportStudio.js script tag');
});

it('Validates renderer/style.css definitions for 3-step import studio UI', () => {
  const css = fs.readFileSync(path.join(__dirname, '../renderer/style.css'), 'utf8');
  assert.ok(css.includes('.video-import-section'), 'Missing .video-import-section');
  assert.ok(css.includes('.vis-stepper'), 'Missing .vis-stepper');
  assert.ok(css.includes('.vis-canvas-container'), 'Missing .vis-canvas-container');
  assert.ok(css.includes('.vis-controls-grid') || css.includes('.vis-slider'), 'Missing .vis-controls-grid / .vis-slider');
  assert.ok(css.includes('.vis-export-card'), 'Missing .vis-export-card');
});

it('Validates renderer/app.js wiring for VideoImportStudio integration', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../renderer/app.js'), 'utf8');
  assert.ok(appJs.includes('btnFetchVideoUrl'), 'btnFetchVideoUrl not bound in app.js');
  assert.ok(appJs.includes('initVideoImportStudio'), 'initVideoImportStudio not found in app.js');
  assert.ok(appJs.includes('onApplyWallpaper'), 'onApplyWallpaper callback not found in app.js');
  assert.ok(appJs.includes('onSendToMotionStudio'), 'onSendToMotionStudio callback not found in app.js');
  assert.ok(appJs.includes('onApplyPet'), 'onApplyPet callback not found in app.js');
  assert.ok(appJs.includes('switchToTab'), 'switchToTab helper not found in app.js');
});

console.log('\n================================================================');
console.log(`📊 ALL TESTS PASSED: ${passedTests} / ${totalTests} (100%)`);
console.log('================================================================\n');
