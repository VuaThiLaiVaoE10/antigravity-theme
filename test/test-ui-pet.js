const fs = require('fs');
const path = require('path');
const assert = require('assert');

const appDir = path.resolve(__dirname, '..');
const htmlPath = path.join(appDir, 'renderer', 'index.html');
const cssPath = path.join(appDir, 'renderer', 'style.css');
const jsPath = path.join(appDir, 'renderer', 'app.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

console.log('=== 1. Checking renderer/index.html ===');
const expectedHtmlTokens = [
  'id="petModelsGrid"',
  'data-model="model-pixel-golem"',
  'data-model="model-chibi-waifu"',
  'data-model="model-cyber-drone"',
  'data-model="model-magic-cat"',
  'data-model="custom"',
  'id="petBorderStyleRow"',
  'data-style="theme-gradient"',
  'data-style="neon-glow"',
  'data-style="holo-pedestal"',
  'data-style="glass-bubble"',
  'data-style="none"',
  'id="pickerPetGlow"',
  'id="hexPetGlow"',
  'id="sliderPetGlowRadius"',
  'id="sliderPetBorderWidth"',
  'id="chkPetPedestal"',
  'id="pickerPetPedestalColor"',
  'id="hexPetPedestalColor"'
];

for (const token of expectedHtmlTokens) {
  assert.ok(html.includes(token), `index.html must contain: ${token}`);
  console.log(`✓ HTML has ${token}`);
}

console.log('\n=== 2. Checking renderer/style.css ===');
const expectedCssClasses = [
  '.pet-models-grid',
  '.pet-model-card',
  '.pet-border-box',
  '.pet-border-style-row',
  '.pet-border-btn',
  '.switch-toggle',
  '.ag-pet-pedestal',
  '.ag-pet-aura-frame',
  '.border-theme-gradient',
  '.border-neon-glow',
  '.border-holo-pedestal',
  '.border-glass-bubble',
  '.border-none',
  '.ag-pet-sprite',
  '.preview-mascot-badge'
];

for (const cls of expectedCssClasses) {
  assert.ok(css.includes(cls), `style.css must contain class: ${cls}`);
  console.log(`✓ CSS has ${cls}`);
}

console.log('\n=== 3. Checking renderer/app.js ===');
const expectedJsKeywords = [
  'petBorderStyle',
  'petGlowColor',
  'petGlowRadius',
  'petBorderWidth',
  'petPedestal',
  'petPedestalColor',
  'applyPetModel',
  'renderPetControls',
  'previewMascotBadge',
  'ag-pet-pedestal',
  'ag-pet-aura-frame',
  'ag-pet-sprite'
];

for (const kw of expectedJsKeywords) {
  assert.ok(js.includes(kw), `app.js must contain keyword: ${kw}`);
  console.log(`✓ JS has ${kw}`);
}

console.log('\n=========================================');
console.log('ALL UI PET CUSTOMIZER TESTS PASSED (100%)');
console.log('=========================================');
