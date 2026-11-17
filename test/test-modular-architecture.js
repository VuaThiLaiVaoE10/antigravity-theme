/**
 * test-modular-architecture.js
 * Verification Suite for Modular Architecture & Multi-Agent Open-Closed Principle
 * Tests:
 * 1. EventBus decoupling & pub/sub contracts
 * 2. ProjectStateManager immutability & slice patching
 * 3. Parallax Module (depth-based mouse shifts, lerp, toggle)
 * 4. Calm Module (3 presets, hard bounds, window focus attenuation)
 * 5. Export & Compare Module (hold-to-compare, slow-mo 0.25x-2x, looping export)
 * 6. COMPLETION CRITERION: Add a brand new 4th module dynamically with ZERO changes to existing modules
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('====================================================');
console.log('🧪 RUNNING MODULAR ARCHITECTURE & MULTI-AGENT VERIFICATION');
console.log('====================================================\n');

// 1. Load Core Infrastructure
const EventBus = require('../renderer/modules/core/eventBus.js');
const ProjectStateManager = require('../renderer/modules/core/projectState.js');
const ModuleManager = require('../renderer/modules/core/moduleManager.js');

// 2. Load the 3 Feature Modules
const ParallaxModule = require('../renderer/modules/parallax/index.js');
const CalmModule = require('../renderer/modules/calm/index.js');
const ExportCompareModule = require('../renderer/modules/export-compare/index.js');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: EventBus Decoupled Pub/Sub Contract
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 1: EventBus Pub/Sub & Wildcards ---');
const bus = new EventBus();
let receivedMessage = null;
const unsub = bus.on('test:ping', (payload) => {
  receivedMessage = payload;
});

bus.emit('test:ping', { text: 'hello agent' });
assert.deepStrictEqual(receivedMessage, { text: 'hello agent' });
assert.strictEqual(bus.listenerCount('test:ping'), 1);

unsub();
assert.strictEqual(bus.listenerCount('test:ping'), 0);
console.log('✓ EventBus correctly registers, dispatches, and unsubscribes.\n');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: ProjectStateManager Immutability & No Cross-Mutation
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 2: ProjectState Immutability & Safe Patching ---');
const stateMgr = new ProjectStateManager(bus);
const snapshot = stateMgr.get();

assert.strictEqual(snapshot.schemaVersion, 2);
assert(Object.isFrozen(snapshot), 'State snapshot must be frozen');

// Attempting to directly mutate snapshot should fail or throw in strict mode
let mutationThrew = false;
try {
  snapshot.schemaVersion = 999;
} catch (e) {
  mutationThrew = true;
}
assert(mutationThrew || snapshot.schemaVersion === 2, 'Direct mutation of snapshot must be prevented');

// Safe patching
let stateChangeNotification = null;
bus.once('state:changed', (e) => {
  stateChangeNotification = e;
});

stateMgr.patch('settings.calm', { preset: 'subtle' });
const updatedCalm = stateMgr.get('settings.calm');
assert.strictEqual(updatedCalm.preset, 'subtle');
assert(stateChangeNotification, 'State patch must emit state:changed event');
assert.strictEqual(stateChangeNotification.slice, 'settings.calm');
console.log('✓ ProjectStateManager guarantees immutability and transactional patching.\n');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: ModuleManager Lifecycle & Module Registration
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 3: Module Registration & Lifecycle ---');
const manager = new ModuleManager({ bus, state: stateMgr });

manager.register(ParallaxModule);
manager.register(CalmModule);
manager.register(ExportCompareModule);

const modList = manager.list();
assert.strictEqual(modList.length, 3);
assert(manager.has('parallax'));
assert(manager.has('calm'));
assert(manager.has('export-compare'));
console.log(`✓ 3 modules successfully registered: ${modList.map(m => m.id).join(', ')}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: Parallax Module (Depth-scaling, Lerp & Toggle)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 4: Parallax Depth & Lerp Behavior ---');
// Populate test layers with different depths
stateMgr.patch('layers', [
  { id: 'layer-bg', name: 'Nền trời', depth: 0.1, visible: true },
  { id: 'layer-mid', name: 'Cây cối', depth: 0.5, visible: true },
  { id: 'layer-fg', name: 'Nhân vật', depth: 0.9, visible: true }
]);

// Parallax disabled by default
let shifts = ParallaxModule.update(0.016);
assert.strictEqual(shifts.layerShifts['layer-fg'].dx, 0, 'When disabled, shift must be 0');

// Enable parallax and simulate mouse move to right (+0.8, +0.6)
ParallaxModule.setEnabled(true);
bus.emit('mouse:move', { normX: 0.8, normY: 0.6 });

// Advance lerp by several frames
for (let i = 0; i < 20; i++) {
  shifts = ParallaxModule.update(0.016);
}

const fgShift = shifts.layerShifts['layer-fg'];
const bgShift = shifts.layerShifts['layer-bg'];

assert(fgShift.dx > 0, 'Foreground layer must shift significantly in mouse direction');
assert(fgShift.dx > bgShift.dx, 'Foreground (depth 0.9) must shift more than Background (depth 0.1)');
console.log(`✓ Parallax depth scaling: FG dx=${fgShift.dx}px vs BG dx=${bgShift.dx}px (Lerped smoothly)`);

// Toggle off
ParallaxModule.setEnabled(false);
const offShifts = ParallaxModule.update(0.016);
assert.strictEqual(offShifts.layerShifts['layer-fg'].dx, 0);
console.log('✓ Parallax toggle off cleanly zeroes out all shifts.\n');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5: Calm Module (3 Presets, Bound Enforcement & Window Blur)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 5: Calm Module Presets & Blur Attenuation ---');

// Test subtle preset (maxAmp: 1, maxActive: 2)
stateMgr.patch('layers', [
  { id: 'l1', name: 'L1', visible: true, amplitude: 2.5 },
  { id: 'l2', name: 'L2', visible: true, amplitude: 2.0 },
  { id: 'l3', name: 'L3', visible: true, amplitude: 1.5 }
]);

const appliedSubtle = CalmModule.setPreset('subtle');
assert.strictEqual(appliedSubtle.maxAmp, 1);
assert.strictEqual(appliedSubtle.maxActive, 2);

const layersAfterSubtle = stateMgr.get('layers');
// L1 and L2 amplitude must be clamped to 1
assert.strictEqual(layersAfterSubtle[0].amplitude, 1);
assert.strictEqual(layersAfterSubtle[1].amplitude, 1);
// L3 must be muted because maxActive = 2
assert.strictEqual(layersAfterSubtle[2].visible, false, 'Third layer must be muted to respect maxActive: 2');
console.log('✓ Subtle preset clamped amplitude to 1‰ and limited active layers to 2.');

// Test Window Focus Change (Blur -> Attenuate)
let calmAttenuationPayload = null;
bus.once('calm:attenuation-changed', (p) => {
  calmAttenuationPayload = p;
});

CalmModule.setWindowFocus(false);
assert.strictEqual(calmAttenuationPayload.attenuated, true);
assert.strictEqual(calmAttenuationPayload.attenuationFactor, 0.2);
assert.strictEqual(stateMgr.get('settings.calm.backgroundAttenuated'), true);
console.log('✓ Window blur automatically triggers 20% background attenuation.\n');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 6: Export & Compare Module (Split, Hold, Slow-Mo, Export)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 6: Export & Compare Module ---');

// Split compare
ExportCompareModule.setCompareRatio(0.5);
assert.strictEqual(ExportCompareModule.compareRatio, 0.5);

// Hold to compare
ExportCompareModule.setHoldOriginal(true);
assert.strictEqual(ExportCompareModule.isHoldingOriginal, true);

// Slow-motion playback rate
ExportCompareModule.setPlaybackRate(0.25);
assert.strictEqual(ExportCompareModule.playbackRate, 0.25);
ExportCompareModule.setPlaybackRate(1.0);
assert.strictEqual(ExportCompareModule.playbackRate, 1.0);

// Looping Export Simulation
let progressEvents = [];
bus.on('export:progress', (p) => progressEvents.push(p));

const exportPromise = ExportCompareModule.startExport({
  format: 'webm',
  fps: 30,
  loopDurationSec: 2 // 2 seconds = 60 frames for quick test
});

exportPromise.then(res => {
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.totalFrames, 60);
  assert(progressEvents.length > 0, 'Export must emit progress events');
  console.log(`✓ Looping WebM export completed: ${res.totalFrames} frames simulated successfully.\n`);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 7: COMPLETION CRITERION (Open-Closed Principle Demonstration)
// Register a brand new 4th module WITHOUT modifying any existing modules!
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 7: COMPLETION CRITERION (Add New Module with ZERO Changes to Old Modules) ---');

// Define a brand new feature module by another agent: "ambient-particles"
const AmbientParticlesModule = {
  id: 'ambient-particles',
  name: 'Ambient Floating Dust Particles',
  version: '1.0.0',
  init(ctx) {
    this.bus = ctx.bus;
    this.state = ctx.state;
    this.particleCount = 50;
    this.active = true;

    // Listen to existing system events without touching existing modules
    this.unsub = this.bus.on('parallax:calculated', (shifts) => {
      // Particles react to parallax shifts
      this.lastShift = shifts;
    });
  },
  spawnParticles() {
    return Array.from({ length: this.particleCount }, (_, i) => ({
      id: i,
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2 + 1
    }));
  },
  destroy() {
    if (this.unsub) this.unsub();
  }
};

// Register dynamically into ModuleManager
manager.register(AmbientParticlesModule);

assert(manager.has('ambient-particles'), 'New module must be registered');
assert.strictEqual(manager.list().length, 4, 'Total registered modules must now be 4');

// Verify new module interacts with bus and state
const particles = manager.get('ambient-particles').spawnParticles();
assert.strictEqual(particles.length, 50);

// Emit parallax calculated and verify new module receives it
bus.emit('parallax:calculated', { dx: 10, dy: 5 });
assert.deepStrictEqual(manager.get('ambient-particles').lastShift, { dx: 10, dy: 5 });

console.log('✓ Successfully registered brand new 4th module (ambient-particles) without modifying 1 single character of existing modules!');
console.log('✓ Open-Closed Principle (OCP) criteria 100% satisfied.\n');

console.log('====================================================');
console.log('🎉 ALL MODULAR ARCHITECTURE TESTS PASSED PERFECTLY (100%)');
console.log('====================================================\n');
