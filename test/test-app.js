const assert = require('assert');
const path = require('path');
const fs = require('fs');
const patcher = require('../patcher');
const { PALETTES } = require('../palettes');

console.log('--- 1. Testing Palettes ---');
assert.strictEqual(PALETTES.length, 6, 'Should have 6 quick palettes');
const midnight = PALETTES.find(p => p.id === 'midnight-aqua');
assert.ok(midnight, 'Midnight aqua should exist');
assert.strictEqual(midnight.dark.colors.bgChrome, '#081826');
assert.strictEqual(midnight.dark.colors.accentPrimary, '#73DACA');
assert.strictEqual(midnight.dark.gradients.composerBorder1, '#7DCFFF');
console.log('✓ Palettes validated.');

console.log('--- 2. Testing Patcher Status ---');
const status = patcher.getStatus();
assert.ok(status.antigravityInstalled, 'Antigravity should be detected');
assert.ok(status.asarExists, 'app.asar should exist');
console.log('✓ Patcher status validated:', status);

console.log('--- 3. Testing Asset Existence ---');
const assetPath = path.join(__dirname, '..', 'assets', 'violinist-earth.jpg');
assert.ok(fs.existsSync(assetPath), 'Violinist earth image asset should exist');
console.log('✓ Asset exists, size:', fs.statSync(assetPath).size, 'bytes');

console.log('--- 4. Testing HTML & CSS Rendering Assets ---');
const htmlPath = path.join(__dirname, '..', 'renderer', 'index.html');
const cssPath = path.join(__dirname, '..', 'renderer', 'style.css');
const jsPath = path.join(__dirname, '..', 'renderer', 'app.js');
assert.ok(fs.existsSync(htmlPath), 'index.html exists');
assert.ok(fs.existsSync(cssPath), 'style.css exists');
assert.ok(fs.existsSync(jsPath), 'app.js exists');
console.log('✓ Renderer assets validated.');

console.log('\n=========================================');
console.log('ALL UNIT & SYSTEM INTEGRATION CHECKS PASS');
console.log('=========================================');
