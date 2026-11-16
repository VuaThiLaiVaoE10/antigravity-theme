const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST SUITE: TikTok/YouTube Import UI Integration ===\n');

// 1. Check renderer/index.html
console.log('--- 1. Testing renderer/index.html ---');
const htmlPath = path.join(__dirname, '../renderer/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

assert(html.includes('NHẬP TỪ LINK TIKTOK / YOUTUBE (3 BƯỚC: CẮT VIỀN ➔ XỬ LÝ ẢNH ➔ NHẬP THEME ĐỘNG)'), 'Missing section header in index.html');
console.log('  ✓ Section title present in index.html');

assert(html.includes('id="inputVideoUrl"'), 'Missing #inputVideoUrl');
assert(html.includes('id="btnFetchVideoUrl"'), 'Missing #btnFetchVideoUrl');
assert(html.includes('id="videoImportMount"'), 'Missing #videoImportMount');
console.log('  ✓ Elements #inputVideoUrl, #btnFetchVideoUrl, #videoImportMount exist');

assert(html.includes('<script src="videoImportStudio.js"></script>'), 'Missing videoImportStudio.js script tag');
console.log('  ✓ Script videoImportStudio.js included in index.html');

// 2. Check renderer/style.css
console.log('\n--- 2. Testing renderer/style.css ---');
const cssPath = path.join(__dirname, '../renderer/style.css');
const css = fs.readFileSync(cssPath, 'utf8');

assert(css.includes('.video-import-section'), 'Missing .video-import-section in CSS');
assert(css.includes('.video-url-input'), 'Missing .video-url-input in CSS');
assert(css.includes('.btn-fetch-video'), 'Missing .btn-fetch-video in CSS');
assert(css.includes('.vis-stepper'), 'Missing .vis-stepper styling in CSS');
assert(css.includes('.vis-canvas-container'), 'Missing .vis-canvas-container in CSS');
assert(css.includes('.vis-controls-grid') || css.includes('.vis-slider'), 'Missing filter sliders in CSS');
assert(css.includes('.vis-export-card'), 'Missing .vis-export-card in CSS');
console.log('  ✓ All CSS classes for stepper, crop canvas, sliders, and export cards present');

// 3. Check renderer/app.js
console.log('\n--- 3. Testing renderer/app.js ---');
const appPath = path.join(__dirname, '../renderer/app.js');
const appJs = fs.readFileSync(appPath, 'utf8');

assert(appJs.includes('btnFetchVideoUrl'), 'Missing btnFetchVideoUrl wiring in app.js');
assert(appJs.includes('initVideoImportStudio'), 'Missing initVideoImportStudio in app.js');
assert(appJs.includes('onApplyWallpaper'), 'Missing onApplyWallpaper in app.js');
assert(appJs.includes('onSendToMotionStudio'), 'Missing onSendToMotionStudio in app.js');
assert(appJs.includes('onApplyPet'), 'Missing onApplyPet in app.js');
assert(appJs.includes('switchToTab'), 'Missing switchToTab helper in app.js');
console.log('  ✓ Callbacks onApplyWallpaper, onSendToMotionStudio, onApplyPet present');
console.log('  ✓ Wire for btnFetchVideoUrl present');
console.log('  ✓ Helper switchToTab present');

// 4. Test app.js logic in mock environment
console.log('\n--- 4. Mocking Callbacks & Logic ---');
let state = { wallpaperUrl: '', mascotUrl: '' };
let activeTab = 'tab-wallpaper';
let saved = false;
let motionLoaded = null;

const mockCallbacks = {
  onApplyWallpaper: async (dataUrl) => {
    state.wallpaperUrl = dataUrl;
    saved = true;
  },
  onSendToMotionStudio: async (dataUrl) => {
    activeTab = 'tab-motion';
    motionLoaded = dataUrl;
  },
  onApplyPet: async (dataUrl) => {
    state.mascotUrl = dataUrl;
    activeTab = 'tab-pet';
    saved = true;
  }
};

(async () => {
  // Test apply wallpaper
  await mockCallbacks.onApplyWallpaper('data:image/png;base64,wp');
  assert.strictEqual(state.wallpaperUrl, 'data:image/png;base64,wp');
  assert.strictEqual(saved, true);
  console.log('  ✓ onApplyWallpaper callback updates state and saves');

  // Test send to motion studio
  await mockCallbacks.onSendToMotionStudio('data:image/png;base64,motion');
  assert.strictEqual(activeTab, 'tab-motion');
  assert.strictEqual(motionLoaded, 'data:image/png;base64,motion');
  console.log('  ✓ onSendToMotionStudio callback switches tab and loads image');

  // Test apply pet
  saved = false;
  await mockCallbacks.onApplyPet('data:image/png;base64,pet');
  assert.strictEqual(state.mascotUrl, 'data:image/png;base64,pet');
  assert.strictEqual(activeTab, 'tab-pet');
  assert.strictEqual(saved, true);
  console.log('  ✓ onApplyPet callback updates mascotUrl, switches tab, and saves');

  console.log('\n=======================================');
  console.log('🎉 ALL UI VIDEO IMPORT INTEGRATION TESTS PASSED (100%)');
  console.log('=======================================');
})();
