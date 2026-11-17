/**
 * test-safezone-calm.js
 * Comprehensive Unit Test Suite for GIAI ĐOẠN 3:
 * - Visual Load Meter & Focal Point Limiting (CFG.load)
 * - Safe Zones Text & Chat Protection (D-008 & CFG.safe)
 * - Focus Shield Typing Attenuation & Smooth Recovery (D-009 & CFG.calm)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('====================================================');
console.log('🧪 RUNNING GIAI ĐOẠN 3: VISUAL LOAD, SAFE ZONES & FOCUS SHIELD');
console.log('====================================================\n');

// 1. Load Config
const { CFG, ampPx, unitPx } = require('../renderer/config.js');
assert(CFG && CFG.load, 'CFG.load must exist');
assert(CFG.calm, 'CFG.calm must exist');
assert(CFG.safe, 'CFG.safe must exist');

// 2. Load Motion Engine
const MotionEngine = require('../renderer/motion.js');
const { calculateLayerMotion, calculateVisualLoad, MotionEngineCore } = MotionEngine;

assert(typeof calculateVisualLoad === 'function', 'calculateVisualLoad must be a function');
assert(typeof calculateLayerMotion === 'function', 'calculateLayerMotion must be a function');

console.log('✓ TEST 1: Config and Motion Engine modules loaded successfully.\n');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: Visual Load Calculation and Thresholds (CFG.load)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 2: Visual Load Calculation & Levels ---');

// Case A: Low load (Green <= 1.5)
const lowLayers = [
  { id: 'l1', name: 'Nhẹ 1', visible: true, amplitude: 0.8, speed: 1.0 }
];
const resLow = calculateVisualLoad(lowLayers, CFG);
assert.strictEqual(resLow.load, 0.8);
assert.strictEqual(resLow.level, 'green', 'Load 0.8 should be green');
assert.strictEqual(resLow.isOverloaded, false);
console.log(`✓ Case A (Low Load): ${resLow.load} -> level: ${resLow.level} (${resLow.levelLabel})`);

// Case B: Medium load (Yellow <= 3.0)
const medLayers = [
  { id: 'l1', name: 'Vừa 1', visible: true, amplitude: 1.2, speed: 1.0 },
  { id: 'l2', name: 'Vừa 2', visible: true, amplitude: 1.0, speed: 1.2 }
];
const resMed = calculateVisualLoad(medLayers, CFG);
assert.strictEqual(resMed.load, 2.4);
assert.strictEqual(resMed.level, 'yellow', 'Load 2.4 should be yellow');
assert.strictEqual(resMed.isOverloaded, false);
console.log(`✓ Case B (Medium Load): ${resMed.load} -> level: ${resMed.level} (${resMed.levelLabel})`);

// Case C: High load (Red > 3.0)
const highLayers = [
  { id: 'l1', name: 'Mạnh 1', visible: true, amplitude: 2.0, speed: 1.2 },
  { id: 'l2', name: 'Mạnh 2', visible: true, amplitude: 1.5, speed: 1.0 }
];
const resHigh = calculateVisualLoad(highLayers, CFG);
assert.strictEqual(resHigh.load, 3.9);
assert.strictEqual(resHigh.level, 'red', 'Load 3.9 should be red');
console.log(`✓ Case C (High Load): ${resHigh.load} -> level: ${resHigh.level} (${resHigh.levelLabel})`);

// Case D: Overloaded Active Layers Count (> 3)
const fourLayers = [
  { id: 'l1', visible: true, amplitude: 0.5, speed: 1.0 },
  { id: 'l2', visible: true, amplitude: 0.5, speed: 1.0 },
  { id: 'l3', visible: true, amplitude: 0.5, speed: 1.0 },
  { id: 'l4', visible: true, amplitude: 0.5, speed: 1.0 }
];
const resOverload = calculateVisualLoad(fourLayers, CFG);
assert.strictEqual(resOverload.activeCount, 4);
assert.strictEqual(resOverload.isOverloaded, true, '4 active layers should trigger overload warning');
console.log(`✓ Case D (Overload Layers): ${resOverload.activeCount} layers -> isOverloaded: ${resOverload.isOverloaded}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Safe Zones Attenuation (D-008 & CFG.safe)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 3: Safe Zones Attenuation (20% inside, 100% outside) ---');

const testSafeZones = [
  { id: 'chat', name: 'Khung chat', x: 0.30, y: 0.20, width: 0.40, height: 0.50, enabled: true }
];

const testLayer = {
  id: 'test-sway',
  motionType: 'sway',
  amplitude: 2.0,
  speed: 1.0,
  loopSec: 12,
  anchor: { x: 0.1, y: 0.1 }
};

// Point 1: Deep inside safe zone (x = 0.50, y = 0.40)
const insideRes = calculateLayerMotion({
  layer: testLayer,
  x: 0.50,
  y: 0.40,
  timeSec: 3.0,
  loopPeriodSec: 12,
  imageWidth: 1000,
  imageHeight: 1000,
  cfg: CFG,
  safeZones: testSafeZones,
  safeZoneMode: 'dampen'
});

assert.strictEqual(insideRes.safeMultiplier, CFG.calm.typingFactor, 'Inside safe zone must attenuate to CFG.calm.typingFactor (0.2)');
console.log(`✓ Inside safe zone: safeMultiplier = ${insideRes.safeMultiplier} (Attenuated to 20%)`);

// Point 2: Deep outside safe zone (x = 0.05, y = 0.85)
const outsideRes = calculateLayerMotion({
  layer: testLayer,
  x: 0.05,
  y: 0.85,
  timeSec: 3.0,
  loopPeriodSec: 12,
  imageWidth: 1000,
  imageHeight: 1000,
  cfg: CFG,
  safeZones: testSafeZones,
  safeZoneMode: 'dampen'
});

assert.strictEqual(outsideRes.safeMultiplier, 1.0, 'Outside safe zone must have safeMultiplier = 1.0');
console.log(`✓ Outside safe zone: safeMultiplier = ${outsideRes.safeMultiplier} (Full 100% motion)`);

// Point 3: Safe Zone in 'freeze' mode
const freezeRes = calculateLayerMotion({
  layer: testLayer,
  x: 0.50,
  y: 0.40,
  timeSec: 3.0,
  loopPeriodSec: 12,
  imageWidth: 1000,
  imageHeight: 1000,
  cfg: CFG,
  safeZones: testSafeZones,
  safeZoneMode: 'freeze'
});

assert.strictEqual(freezeRes.safeMultiplier, 0.0, 'Freeze mode must result in safeMultiplier = 0.0');
assert.strictEqual(freezeRes.displacement, 0.0, 'Displacement inside freeze safe zone must be 0');
console.log(`✓ Safe zone freeze mode: safeMultiplier = ${freezeRes.safeMultiplier}, displacement = ${freezeRes.displacement}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: Focus Shield Attenuation & Exponential Smooth Recovery (D-009 & CFG.calm)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 4: Focus Shield Typing Attenuation & Smooth Recovery ---');

const engine = new MotionEngineCore();

// State 1: Idle (typingFactor = 1.0)
assert.strictEqual(engine.getTypingFactor(), 1.0, 'Initial idle typingFactor should be 1.0');

// State 2: User starts typing -> Immediately attenuates to CFG.calm.typingFactor (0.2)
engine.setTypingState(true);
assert.strictEqual(engine.isTyping, true);
assert.strictEqual(engine.getTypingFactor(), CFG.calm.typingFactor, 'Active typing must drop factor to CFG.calm.typingFactor (0.2)');
console.log(`✓ Typing Active: typingFactor = ${engine.getTypingFactor()} (calmed to 20%)`);

// State 3: User stops typing -> Within recoverMs (3000ms), factor stays at 0.2
engine.setTypingState(false);
assert.strictEqual(engine.isTyping, false);
// Mock elapsed 1000ms after typing
engine.lastTypingTime = engine.getTimeMs() - 1000;
assert.strictEqual(engine.getTypingFactor(), CFG.calm.typingFactor, 'Within recoverMs (1000ms < 3000ms), factor remains 0.2');
console.log(`✓ Inactivity 1000ms (< 3000ms): typingFactor = ${engine.getTypingFactor()} (holding quiet)`);

// State 4: Inactivity passes recoverMs (e.g. 3000ms + 500ms with tau = 0.5)
// Alpha = 1 - exp(-0.5 / 0.5) = 1 - 1/e ≈ 0.632
// Expected factor = 0.2 + 0.8 * 0.632 ≈ 0.7057
engine.lastTypingTime = engine.getTimeMs() - (CFG.calm.recoverMs + 500);
const recoveredHalfSec = engine.getTypingFactor();
assert(recoveredHalfSec > 0.65 && recoveredHalfSec < 0.75, `Expected factor around 0.705, got ${recoveredHalfSec}`);
console.log(`✓ Inactivity 3500ms (recovering): typingFactor = ${recoveredHalfSec.toFixed(3)}`);

// State 5: Full recovery after 6 seconds (3000ms + 3000ms = 6 tau)
// Alpha = 1 - exp(-3.0 / 0.5) = 1 - exp(-6) ≈ 0.9975
engine.lastTypingTime = engine.getTimeMs() - (CFG.calm.recoverMs + 3000);
const fullyRecovered = engine.getTypingFactor();
assert(fullyRecovered > 0.99, `Expected factor near 1.0, got ${fullyRecovered}`);
console.log(`✓ Inactivity 6000ms: fully recovered typingFactor = ${fullyRecovered.toFixed(4)}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5: Auto-Reduce Excess Layers Helper
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 5: Auto-Reduce Excess Layers Helper ---');

engine.config.layers = [
  { id: 'layer-1', name: 'Lớp 1', visible: true, amplitude: 1.0 },
  { id: 'layer-2', name: 'Lớp 2', visible: true, amplitude: 1.2 },
  { id: 'layer-3', name: 'Lớp 3', visible: true, amplitude: 0.9 },
  { id: 'layer-4', name: 'Lớp 4', visible: true, amplitude: 1.5 },
  { id: 'layer-5', name: 'Lớp 5', visible: true, amplitude: 0.8 }
];

const loadBefore = engine.getVisualLoad();
assert.strictEqual(loadBefore.activeCount, 5);
assert.strictEqual(loadBefore.isOverloaded, true);

const muted = engine.reduceExcessLayers(3);
assert.strictEqual(muted.length, 2, 'Should mute 2 excess layers');
const loadAfter = engine.getVisualLoad();
assert.strictEqual(loadAfter.activeCount, 3, 'Active layers count must be reduced to 3');
assert.strictEqual(loadAfter.isOverloaded, false, 'isOverloaded must become false after reduce');
console.log(`✓ Successfully reduced ${muted.length} excess layers: activeCount now ${loadAfter.activeCount} (isOverloaded: ${loadAfter.isOverloaded})\n`);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 6: Dynamic Safe Zones Measurement from Live Preview Elements
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 6: Dynamic Safe Zones Measurement ---');

// Mock DOM container for live preview
const mockPreviewWindow = {
  getBoundingClientRect: () => ({ left: 100, top: 50, width: 800, height: 600 })
};

const defaultZones = engine.measureLivePreviewSafeZones(mockPreviewWindow);
assert(Array.isArray(defaultZones) && defaultZones.length >= 4, 'Must return at least 4 safe zones (sidebar, chat, composer, code)');

const sidebarZone = defaultZones.find(z => z.id === 'sidebar');
const chatZone = defaultZones.find(z => z.id === 'chat');
const composerZone = defaultZones.find(z => z.id === 'composer');
const codeZone = defaultZones.find(z => z.id === 'code');

assert(sidebarZone, 'Sidebar zone must be defined');
assert(chatZone, 'Chat zone must be defined');
assert(composerZone, 'Composer zone must be defined');
assert(codeZone, 'Code zone must be defined');

console.log(`✓ Safe zones measured:`);
console.log(`   - Sidebar:  x=${sidebarZone.x}, y=${sidebarZone.y}, w=${sidebarZone.width}, h=${sidebarZone.height}`);
console.log(`   - Chat:     x=${chatZone.x}, y=${chatZone.y}, w=${chatZone.width}, h=${chatZone.height}`);
console.log(`   - Composer: x=${composerZone.x}, y=${composerZone.y}, w=${composerZone.width}, h=${composerZone.height}`);
console.log(`   - Code:     x=${codeZone.x}, y=${codeZone.y}, w=${codeZone.width}, h=${codeZone.height}\n`);

console.log('====================================================');
console.log('🎉 ALL GIAI ĐOẠN 3 TESTS PASSED PERFECTLY (100%)');
console.log('====================================================\n');
