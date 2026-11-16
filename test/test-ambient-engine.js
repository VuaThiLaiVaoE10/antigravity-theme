const assert = require('assert');
const path = require('path');

const AmbientEngine = require('../renderer/ambientEngine.js');

console.log('=== AMBIENT ENGINE UNIT TESTS ===\n');

// Mock Canvas 2D Context
class MockCanvasRenderingContext2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1;
    this.globalAlpha = 1;
    this.calls = [];
  }

  _record(name, args) {
    this.calls.push({ name, args });
  }

  clearRect(x, y, w, h) { this._record('clearRect', [x, y, w, h]); }
  fillRect(x, y, w, h) { this._record('fillRect', [x, y, w, h]); }
  beginPath() { this._record('beginPath', []); }
  closePath() { this._record('closePath', []); }
  moveTo(x, y) { this._record('moveTo', [x, y]); }
  lineTo(x, y) { this._record('lineTo', [x, y]); }
  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) { this._record('bezierCurveTo', [cp1x, cp1y, cp2x, cp2y, x, y]); }
  arc(x, y, r, sa, ea) { this._record('arc', [x, y, r, sa, ea]); }
  ellipse(x, y, rx, ry, rot, sa, ea) { this._record('ellipse', [x, y, rx, ry, rot, sa, ea]); }
  fill() { this._record('fill', []); }
  stroke() { this._record('stroke', []); }
  save() { this._record('save', []); }
  restore() { this._record('restore', []); }
  translate(x, y) { this._record('translate', [x, y]); }
  rotate(a) { this._record('rotate', [a]); }
  scale(sx, sy) { this._record('scale', [sx, sy]); }

  createLinearGradient(x0, y0, x1, y1) {
    return {
      addColorStop: (offset, color) => {}
    };
  }

  createRadialGradient(x0, y0, r0, x1, y1, r1) {
    return {
      addColorStop: (offset, color) => {}
    };
  }
}

class MockCanvas {
  constructor(w = 800, h = 600) {
    this.width = w;
    this.height = h;
    this.clientWidth = w;
    this.clientHeight = h;
    this.style = {};
    this.ctx = new MockCanvasRenderingContext2D(this);
  }

  getContext(type) {
    if (type === '2d') return this.ctx;
    return null;
  }
}

// 1. Basic initialization
console.log('1. Testing initialization & defaults:');
const canvas = new MockCanvas(1024, 768);
const engine = new AmbientEngine(canvas, {
  effect: 'aurora-mist',
  opacity: 35,
  speed: 1.0
});

assert.strictEqual(engine.getEffect(), 'aurora-mist', 'Initial effect should be aurora-mist');
assert.strictEqual(engine.getOpacity(), 0.35, 'Normalized opacity should be 0.35');
assert.strictEqual(engine.getSpeed(), 1.0, 'Speed should be 1.0');
assert.strictEqual(engine.width, 1024, 'Width should match canvas width');
assert.strictEqual(engine.height, 768, 'Height should match canvas height');
console.log('   ✓ Initialization matches expected properties');

// 2. Opacity normalization
console.log('\n2. Testing opacity & speed normalization:');
engine.setOpacity(40);
assert.strictEqual(engine.getOpacity(), 0.40, '40% normalized to 0.40');
engine.setOpacity(0.25);
assert.strictEqual(engine.getOpacity(), 0.25, '0.25 stays 0.25');
engine.setOpacity(150);
assert.strictEqual(engine.getOpacity(), 1.0, 'Clamped to 1.0');
engine.setOpacity(-10);
assert.strictEqual(engine.getOpacity(), 0.0, 'Clamped to 0.0');

engine.setSpeed(1.5);
assert.strictEqual(engine.getSpeed(), 1.5, 'Speed set to 1.5');
engine.setSpeed(5.0);
assert.strictEqual(engine.getSpeed(), 3.0, 'Speed clamped to 3.0');
console.log('   ✓ Opacity and speed normalization validated');

// 3. Testing all 6 subtle effects + legacy effects execution
console.log('\n3. Testing frame rendering across all effect presets:');
const testEffects = [
  'aurora-mist',
  'rain-glass',
  'constellation',
  'sunbeam-dust',
  'sakura-drift',
  'water-ripple',
  'snow',
  'fireflies',
  'rain',
  'breathing',
  'none'
];

for (const fx of testEffects) {
  engine.setEffect(fx);
  assert.strictEqual(engine.getEffect(), fx, `Effect should transition to ${fx}`);
  canvas.ctx.calls = [];
  engine._renderFrame(0.016);
  if (fx !== 'none') {
    assert.ok(canvas.ctx.calls.length > 0, `Effect ${fx} should draw canvas operations`);
  }
  console.log(`   ✓ Effect '${fx}' initialized and rendered frame successfully (operations: ${canvas.ctx.calls.length})`);
}

// 4. Resize and theme updates
console.log('\n4. Testing resize & theme harmonization:');
engine.resize(1920, 1080);
assert.strictEqual(engine.width, 1920, 'Width resized to 1920');
assert.strictEqual(engine.height, 1080, 'Height resized to 1080');

engine.setTheme({ accent: '#10b981', paper: '#0f172a' });
assert.strictEqual(engine.themeColors.accent, '#10b981', 'Theme accent updated');
console.log('   ✓ Resize and theme harmonization verified');

// 5. Lifecycle start, stop, destroy
console.log('\n5. Testing lifecycle controls:');
engine.setEffect('aurora-mist');
engine.start();
assert.strictEqual(engine.isRunning, true, 'Engine should be running');
engine.stop();
assert.strictEqual(engine.isRunning, false, 'Engine should be stopped');
engine.destroy();
assert.strictEqual(engine.canvas, null, 'Engine canvas cleaned up');
console.log('   ✓ Lifecycle start/stop/destroy verified');

console.log('\n=== ALL AMBIENT ENGINE TESTS PASSED (100%) ===');
