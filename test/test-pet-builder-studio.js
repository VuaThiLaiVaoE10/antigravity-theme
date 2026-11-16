/**
 * Test suite for Pet Builder Studio integration in Tab "Pet & Khung Chat"
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST SUITE: Pet Builder Studio Integration ===\n');

// 1. Check renderer/index.html
console.log('1. Verifying renderer/index.html:');
const html = fs.readFileSync(path.join(__dirname, '../renderer/index.html'), 'utf8');

const requiredHtmlElements = [
  'id="pbsDropzone"',
  'id="pbsFileInput"',
  'id="pbsUploadBtn"',
  'Tải ảnh/GIF/APNG/WebP/Sprite sheet...',
  'id="pbsViewportWrap"',
  'id="pbsViewport"',
  'id="pbsCanvas"',
  'id="pbsOverlayCanvas"',
  'id="pbsZoomIn"',
  'id="pbsZoomOut"',
  'id="pbsZoomReset"',
  'id="pbsZoomLabel"',
  'data-tool="eraser"',
  'Cọ xóa',
  'data-tool="restore"',
  'Cọ khôi phục',
  'data-tool="wand"',
  'Đũa thần',
  'data-tool="colorkey"',
  'Xóa màu 1-chạm',
  'data-tool="autotrim"',
  'Cắt viền tự động',
  'data-tool="crop"',
  'Cắt thủ công',
  'data-tool="anchor"',
  'Điểm chân +',
  'data-tool="hitbox"',
  'Vùng nhận chuột',
  'id="pbsBrushRadius"',
  'id="pbsWandTolerance"',
  'id="pbsContiguous"',
  'Chỉ vùng liền kề',
  'id="pbsUndo"',
  'id="pbsRedo"',
  'id="pbsCols"',
  'id="pbsRows"',
  'id="pbsFps"',
  'id="pbsStateIdle"',
  'id="pbsStateWalk"',
  'id="pbsStateSleep"',
  'id="pbsStateClick"',
  'id="pbsStateDrag"',
  'id="pbsSandboxCanvas"',
  'id="pbsSandboxWrap"',
  'Bộ lọc áp dụng cho:',
  'id="chkFilterBg"',
  'id="chkFilterUI"',
  'id="chkFilterPet"',
  'id="pbsSaveToLibrary"',
  'Lưu vào Thư viện Pet & Áp dụng ngay',
  'petCanvasStudio.js',
  'petAnimationEngine.js',
  'petOverlay.js',
  'id="previewPetOverlayMount"',
  'data-model="model-magic-cat"',
  'handlePetImageError'
];

requiredHtmlElements.forEach(item => {
  assert(html.includes(item), `HTML missing expected content: ${item}`);
  console.log(`   ✓ Found in index.html: ${item}`);
});

// 2. Check renderer/style.css
console.log('\n2. Verifying renderer/style.css:');
const css = fs.readFileSync(path.join(__dirname, '../renderer/style.css'), 'utf8');

const requiredCssRules = [
  '.pet-filter-target-bar',
  '.pet-builder-studio',
  '.pbs-dropzone',
  '.pbs-viewport',
  '.pbs-toolbar',
  '.pbs-tool-btn',
  '.pbs-controls-bar',
  '.pbs-anim-section',
  '.pbs-sandbox-canvas',
  '.pbs-save-btn',
  '#previewPetOverlayMount',
  '.preview-pet-placeholder',
  '.preview-pet-missing-tag'
];

requiredCssRules.forEach(cls => {
  assert(css.includes(cls), `CSS missing expected rule: ${cls}`);
  console.log(`   ✓ Found in style.css: ${cls}`);
});

// 3. Check renderer/app.js
console.log('\n3. Verifying renderer/app.js:');
const appJs = fs.readFileSync(path.join(__dirname, '../renderer/app.js'), 'utf8');

const requiredAppFeatures = [
  'initPetBuilderStudio',
  '_bindKeyboardShortcuts',
  'e.ctrlKey',
  '_undo',
  '_redo',
  '_bindToolbar',
  '_bindControlsBar',
  '_bindCanvasEvents',
  '_bindZoomControls',
  '_bindAnimSection',
  '_bindSaveBtn',
  '_bindFilterTargetSwitch',
  '_mountPetOverlayInPreview',
  'PetBuilderStudio',
  'getAnimationConfig',
  'model-magic-cat',
  'preview-pet-placeholder'
];

requiredAppFeatures.forEach(feat => {
  assert(appJs.includes(feat), `app.js missing expected feature: ${feat}`);
  console.log(`   ✓ Found in app.js: ${feat}`);
});

console.log('\n===============================================');
console.log('🎉 ALL PET BUILDER STUDIO TESTS PASSED (100%)');
console.log('===============================================');
