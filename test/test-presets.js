const fs = require('fs');
const path = require('path');
const assert = require('assert');

const MotionStudio = require('../renderer/motionStudio.js');

console.log('1. Testing MotionStudio and PRESET_TEMPLATES...');
assert.ok(typeof MotionStudio === 'function', 'MotionStudio should be a class/constructor');
assert.ok(MotionStudio.PRESET_TEMPLATES, 'MotionStudio.PRESET_TEMPLATES should exist');

const presetIds = ['hair-wind', 'waterfall', 'clouds', 'sway-fabric'];
for (const id of presetIds) {
  const p = MotionStudio.PRESET_TEMPLATES[id];
  assert.ok(p, `Preset ${id} should exist`);
  assert.ok(Array.isArray(p.arrows) && p.arrows.length > 0, `${id} should have arrows`);
  assert.ok(Array.isArray(p.pins) && p.pins.length > 0, `${id} should have pins`);
  assert.ok(typeof p.flowSpeed === 'number' && p.flowSpeed > 0, `${id} should have flowSpeed`);
  console.log(` - ${id}: ${p.name} (${p.arrows.length} arrows, ${p.pins.length} pins, speed=${p.flowSpeed})`);
}

console.log('2. Testing applyPresetTemplate method...');
const studio = new MotionStudio({});
for (const id of presetIds) {
  const ok = studio.applyPresetTemplate(id);
  assert.strictEqual(ok, true, `applyPresetTemplate should return true for ${id}`);
  assert.strictEqual(studio.arrows.length, MotionStudio.PRESET_TEMPLATES[id].arrows.length);
  assert.strictEqual(studio.pins.length, MotionStudio.PRESET_TEMPLATES[id].pins.length);
  assert.strictEqual(studio.flowSpeed, MotionStudio.PRESET_TEMPLATES[id].flowSpeed);
}
assert.strictEqual(studio.applyPresetTemplate('nonexistent'), false, 'Should return false for unknown preset');

console.log('3. Testing renderer/index.html for #motionPresetsRow...');
const htmlPath = path.join(__dirname, '..', 'renderer', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
assert.ok(html.includes('id="motionPresetsRow"'), 'index.html must have #motionPresetsRow');
assert.ok(html.includes('data-preset="hair-wind"'), 'index.html must have hair-wind');
assert.ok(html.includes('data-preset="waterfall"'), 'index.html must have waterfall');
assert.ok(html.includes('data-preset="clouds"'), 'index.html must have clouds');
assert.ok(html.includes('data-preset="sway-fabric"'), 'index.html must have sway-fabric');
assert.ok(html.includes('💇 Tóc bay'), 'index.html must have 💇 Tóc bay');
assert.ok(html.includes('🌊 Suối nước'), 'index.html must have 🌊 Suối nước');
assert.ok(html.includes('☁️ Mây trôi'), 'index.html must have ☁️ Mây trôi');
assert.ok(html.includes('👗 Váy lay động'), 'index.html must have 👗 Váy lay động');

console.log('4. Testing renderer/app.js wiring...');
const appJsPath = path.join(__dirname, '..', 'renderer', 'app.js');
const appJs = fs.readFileSync(appJsPath, 'utf8');
assert.ok(appJs.includes('motionPresetsRow'), 'app.js should reference motionPresetsRow');
assert.ok(appJs.includes('applyPresetTemplate'), 'app.js should call applyPresetTemplate');

console.log('\n✓ ALL PRESET CHECKS PASSED PERFECTLY!');
