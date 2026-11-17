/**
 * test-physics-segment.js
 * Comprehensive Unit Test Suite for PhysicsEngine & SegmentEngine (GIAI ĐOẠN 6 - BỘ MÁY)
 * 
 * Verifies:
 * 1. PhysicsEngine Contract & Anchor Restraint (Root fixed at anchor)
 * 2. Harmonic Spring-Damper Response & Spatial Phase Lag
 * 3. Strict Boundary Conditions: displacement(0) === displacement(T) and velocity(0) === velocity(T) (0 Jerk, Seamless)
 * 4. Hyperbolic Tangent Amplitude Clamping (Anti-Tearing Guard)
 * 5. MotionEngine.setPhysics() attachment and renderFrame integration
 * 6. SegmentEngine 100% Deterministic Local Image Segmentation (No AI)
 * 7. Region Candidates: Tóc bay, Váy lay động, Suối nước, Mây trôi with distinct pastel colors, feathered masks & depth
 * 8. MotionEngine.suggestRegions() binding
 */

const assert = require('assert');
const path = require('path');

const PetPhysics = require('../renderer/physics.js');
const PetSegment = require('../renderer/segment.js');
const MotionEngine = require('../renderer/motion.js');

console.log('====================================================');
console.log('🧪 RUNNING COMPREHENSIVE PHYSICS & SEGMENT ENGINE TESTS');
console.log('====================================================\n');

let testsPassed = 0;

// Helper to create synthetic test images
function createSyntheticImage(w = 120, h = 120) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const ny = y / h;
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      const idx = (y * w + x) * 4;

      if (ny < 0.3) {
        // Upper zone: Sky/Clouds (Light cyan / white)
        data[idx] = 220;
        data[idx + 1] = 240;
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      } else if (ny < 0.55 && nx > 0.3 && nx < 0.7) {
        // Upper-mid zone: Hair strand (Dark contrast with edge texture)
        data[idx] = 45 + (x % 4) * 15;
        data[idx + 1] = 30;
        data[idx + 2] = 25;
        data[idx + 3] = 255;
      } else if (ny < 0.8 && nx > 0.25 && nx < 0.75) {
        // Mid-lower zone: Dress / Fabric (Vibrant purple/magenta)
        data[idx] = 180;
        data[idx + 1] = 90;
        data[idx + 2] = 210;
        data[idx + 3] = 255;
      } else {
        // Lower zone: Flowing water / stream (Blue/cyan)
        data[idx] = 40;
        data[idx + 1] = 140;
        data[idx + 2] = 230;
        data[idx + 3] = 255;
      }
    }
  }
  return { width: w, height: h, data };
}

// =========================================================================
// TEST 1: PhysicsEngine Contract & Defaults
// =========================================================================
console.log('TEST 1: PhysicsEngine Contract & Defaults');
assert(PetPhysics, 'PetPhysics module must be defined');
assert(typeof PetPhysics.applyPhysics === 'function', 'applyPhysics must be a function');
assert(typeof PetPhysics.calculateDisplacement === 'function', 'calculateDisplacement must be a function');
assert(typeof PetPhysics.getAnchorRestraint === 'function', 'getAnchorRestraint must be a function');
assert(typeof PetPhysics.verifySeamlessLoop === 'function', 'verifySeamlessLoop must be a function');

const defaultCfg = PetPhysics.defaultConfig;
assert.strictEqual(defaultCfg.enabled, true, 'Default physics enabled should be true');
assert.strictEqual(defaultCfg.stiffness, 1.0, 'Default stiffness should be 1.0');
assert.strictEqual(defaultCfg.damping, 0.8, 'Default damping should be 0.8');
assert.strictEqual(defaultCfg.lag, 0.3, 'Default lag should be 0.3');
console.log('✓ TEST 1 Passed: PhysicsEngine defaults and API contracts verified.\n');
testsPassed++;

// =========================================================================
// TEST 2: Anchor Restraint & Distance Falloff (Root Fixed)
// =========================================================================
console.log('TEST 2: Anchor Restraint & Distance Falloff');
const testAnchor = { x: 0.5, y: 0.2 };
// At anchor root: dist = 0, factor must be 0
const rootRestraint = PetPhysics.getAnchorRestraint({ x: 0.5, y: 0.2 }, testAnchor);
assert.strictEqual(rootRestraint.dist, 0, 'Distance at anchor must be 0');
assert.strictEqual(rootRestraint.factor, 0, 'Restraint factor at anchor must be 0 (fixed root)');

// At distant tip: dist > 0, factor must approach 1
const midRestraint = PetPhysics.getAnchorRestraint({ x: 0.5, y: 0.45 }, testAnchor);
const tipRestraint = PetPhysics.getAnchorRestraint({ x: 0.5, y: 0.85 }, testAnchor);
assert(midRestraint.factor > 0.5, 'Mid-strand factor must be > 0.5');
assert(tipRestraint.factor > midRestraint.factor, 'Tip factor must be strictly greater than mid-strand factor');
assert(tipRestraint.factor > 0.9, 'Tip factor should approach full amplitude (> 0.9)');

// Check applyPhysics at root vs tip
const hairLayer = {
  id: 'test-hair',
  direction: 90,
  intensity: 1.5,
  maxShift: 30,
  physics: {
    enabled: true,
    anchor: { x: 0.5, y: 0.2 },
    stiffness: 1.2,
    damping: 0.7,
    lag: 0.4
  }
};

const rootPhys = PetPhysics.applyPhysics({ x: 0.5, y: 0.2 }, hairLayer, 1.0, 4000, 1.0);
const tipPhys = PetPhysics.applyPhysics({ x: 0.5, y: 0.7 }, hairLayer, 1.0, 4000, 1.0);

assert.strictEqual(rootPhys.displacement, 0, 'Displacement at root anchor must be 0');
assert.strictEqual(rootPhys.dx, 0, 'dx at root anchor must be 0');
assert.strictEqual(rootPhys.dy, 0, 'dy at root anchor must be 0');
assert(Math.abs(tipPhys.displacement) > 0.05, 'Tip displacement must be non-zero');
console.log(`   - Root Displacement: ${rootPhys.displacement.toFixed(4)}px (Factor: ${rootPhys.factor})`);
console.log(`   - Tip Displacement: ${tipPhys.displacement.toFixed(4)}px (Factor: ${tipPhys.factor.toFixed(4)})`);
console.log('✓ TEST 2 Passed: Root remains firmly fixed at anchor while tip oscillates freely.\n');
testsPassed++;

// =========================================================================
// TEST 3: Spatial Phase Lag
// =========================================================================
console.log('TEST 3: Spatial Phase Lag (Tip Lags Behind Root)');
const nearPoint = { x: 0.5, y: 0.3 };
const farPoint = { x: 0.5, y: 0.75 };

const nearRes = PetPhysics.applyPhysics(nearPoint, hairLayer, 0.5, 4000, 1.0);
const farRes = PetPhysics.applyPhysics(farPoint, hairLayer, 0.5, 4000, 1.0);

assert(farRes.spatialLag < nearRes.spatialLag, 'Spatial phase lag must be strictly more negative with distance');
console.log(`   - Near Spatial Lag: ${nearRes.spatialLag.toFixed(4)} rad`);
console.log(`   - Far Spatial Lag: ${farRes.spatialLag.toFixed(4)} rad`);
console.log('✓ TEST 3 Passed: Phase lag scales proportionally with Euclidean distance from anchor.\n');
testsPassed++;

// =========================================================================
// TEST 4: Strict Boundary Conditions (0 Jerk, Seamless Perpetual Loop)
// =========================================================================
console.log('TEST 4: Strict Periodic Boundary Conditions (Zero Jerk, Seamless Loop)');
const loopCheck = PetPhysics.verifySeamlessLoop(hairLayer, 4000);
assert.strictEqual(loopCheck.seamless, true, 'Loop must be mathematically seamless');
assert(loopCheck.maxPosDelta < 1e-6, `maxPosDelta (${loopCheck.maxPosDelta}) must be < 1e-6`);
assert(loopCheck.maxVelDelta < 1e-4, `maxVelDelta (${loopCheck.maxVelDelta}) must be < 1e-4`);

console.log(`   - Position Delta at seam (t=0 vs t=T): ${loopCheck.maxPosDelta.toExponential(4)}`);
console.log(`   - Velocity Delta at seam: ${loopCheck.maxVelDelta.toExponential(4)}`);
console.log('✓ TEST 4 Passed: displacement(0) === displacement(T) & velocity(0) === velocity(T) guaranteed (0 jerk).\n');
testsPassed++;

// =========================================================================
// TEST 5: Amplitude Clamping (Anti-Tearing Guard)
// =========================================================================
console.log('TEST 5: Hyperbolic Tangent Amplitude Clamping');
const maxShift = 25.0;
const normalVal = 10.0;
const extremeVal = 500.0;

const clampedNormal = PetPhysics.clampDisplacement(normalVal, maxShift);
const clampedExtreme = PetPhysics.clampDisplacement(extremeVal, maxShift);
const clampedNegExtreme = PetPhysics.clampDisplacement(-extremeVal, maxShift);

assert(clampedNormal < maxShift && clampedNormal > 9.0, 'Normal values should pass through with minimal compression');
assert(clampedExtreme <= maxShift, 'Extreme positive values must be clamped within maxShift');
assert(clampedNegExtreme >= -maxShift, 'Extreme negative values must be clamped within -maxShift');
assert(!isNaN(clampedExtreme) && isFinite(clampedExtreme), 'Clamped values must be finite numbers');

console.log(`   - Normal input (10.0): clamped to ${clampedNormal.toFixed(3)}px`);
console.log(`   - Extreme input (500.0): clamped to ${clampedExtreme.toFixed(3)}px (limit: ${maxShift}px)`);
console.log('✓ TEST 5 Passed: Amplitude clamping prevents extreme tearing or distortion.\n');
testsPassed++;

// =========================================================================
// TEST 6: MotionEngine.setPhysics() & renderFrame Integration
// =========================================================================
console.log('TEST 6: MotionEngine.setPhysics() & renderFrame Integration');
MotionEngine.setConfig({
  layers: [
    {
      id: 'layer-hair-dyn',
      name: 'Tóc bay',
      visible: true,
      speed: 1.0,
      intensity: 1.2,
      maxShift: 30,
      physics: {
        enabled: false,
        anchor: { x: 0.5, y: 0.1 },
        stiffness: 1.0,
        damping: 0.8,
        lag: 0.3
      }
    }
  ],
  loopPeriodMs: 4000
});

// Update physics config via setPhysics
const updatedPhysics = MotionEngine.setPhysics('layer-hair-dyn', {
  enabled: true,
  anchor: { x: 0.5, y: 0.15 },
  stiffness: 1.4,
  damping: 0.65,
  lag: 0.45
});

assert(updatedPhysics, 'setPhysics must return updated physics config');
assert.strictEqual(updatedPhysics.enabled, true, 'Physics enabled should be true');
assert.strictEqual(updatedPhysics.stiffness, 1.4, 'Stiffness must be 1.4');
assert.strictEqual(updatedPhysics.damping, 0.65, 'Damping must be 0.65');
assert.strictEqual(updatedPhysics.lag, 0.45, 'Lag must be 0.45');

// Test renderFrame with physics enabled layer
const frameResult = MotionEngine.renderFrame(1.5);
assert(frameResult, 'renderFrame must return frame execution result');
assert.strictEqual(frameResult.rendered, true, 'Frame must be rendered successfully');

console.log('✓ TEST 6 Passed: MotionEngine.setPhysics() updates layer and renderFrame executes smoothly.\n');
testsPassed++;

// =========================================================================
// TEST 7: SegmentEngine Deterministic Region Proposals (No AI)
// =========================================================================
console.log('TEST 7: SegmentEngine Local Region Proposal Engine');
assert(PetSegment, 'PetSegment module must be defined');
assert(typeof PetSegment.suggestRegions === 'function', 'suggestRegions must be a function');

async function testSegmentation() {
  const syntheticImg = createSyntheticImage(120, 120);
  const candidates = await PetSegment.suggestRegions(syntheticImg);

  assert(Array.isArray(candidates), 'suggestRegions must return an array of layers');
  assert(candidates.length >= 3 && candidates.length <= 4, `Must return 3-4 candidate regions, got ${candidates.length}`);

  const candidateNames = candidates.map(c => c.name);
  console.log('   - Detected Candidate Regions:', candidateNames.join(', '));

  assert(candidateNames.includes('Tóc bay'), 'Must include Tóc bay candidate');
  assert(candidateNames.includes('Váy lay động'), 'Must include Váy lay động candidate');
  assert(candidateNames.includes('Suối nước'), 'Must include Suối nước candidate');
  assert(candidateNames.includes('Mây trôi'), 'Must include Mây trôi candidate');

  // Verify pastel color assignments
  const hair = candidates.find(c => c.name === 'Tóc bay');
  const dress = candidates.find(c => c.name === 'Váy lay động');
  const water = candidates.find(c => c.name === 'Suối nước');
  const cloud = candidates.find(c => c.name === 'Mây trôi');

  assert.strictEqual(hair.color, '#FF9EAF', 'Tóc bay must have pastel rose color');
  assert.strictEqual(dress.color, '#BB9AF7', 'Váy lay động must have pastel lavender color');
  assert.strictEqual(water.color, '#7AA2F7', 'Suối nước must have pastel blue color');
  assert.strictEqual(cloud.color, '#7DCFFF', 'Mây trôi must have pastel cyan color');

  // Verify Depth Hierarchy
  assert(hair.depth > dress.depth, 'Hair depth should be greater than dress depth');
  assert(dress.depth > water.depth, 'Dress depth should be greater than water depth');
  assert(water.depth > cloud.depth, 'Water depth should be greater than cloud depth');

  // Verify Physics Configurations
  assert.strictEqual(hair.physics.enabled, true, 'Hair candidate must have physics enabled');
  assert.strictEqual(dress.physics.enabled, true, 'Dress candidate must have physics enabled');
  assert.strictEqual(water.physics.enabled, false, 'Water candidate physics should be disabled');
  assert.strictEqual(cloud.physics.enabled, false, 'Cloud candidate physics should be disabled');

  // Verify Mask Canvases
  for (const c of candidates) {
    assert(c.mask, `Candidate ${c.name} must have a mask`);
    assert(c.mask.width > 0 && c.mask.height > 0, `Mask for ${c.name} must have valid dimensions`);
    assert(typeof c.mask.getContext === 'function', `Mask for ${c.name} must provide getContext()`);
  }

  // Verify Determinism: Same input produces identical output
  const candidates2 = await PetSegment.suggestRegions(syntheticImg);
  assert.strictEqual(candidates.length, candidates2.length, 'Deterministic region count must match');
  for (let i = 0; i < candidates.length; i++) {
    assert.strictEqual(candidates[i].name, candidates2[i].name, 'Deterministic names must match');
    assert.strictEqual(candidates[i].depth, candidates2[i].depth, 'Deterministic depth must match');
    assert.strictEqual(candidates[i].physics.enabled, candidates2[i].physics.enabled, 'Deterministic physics must match');
  }

  console.log('✓ TEST 7 Passed: Deterministic 4-region proposal with pastel colors, depth, and masks verified.\n');
  testsPassed++;

  // =========================================================================
  // TEST 8: MotionEngine.suggestRegions() Binding
  // =========================================================================
  console.log('TEST 8: MotionEngine.suggestRegions() Binding');
  assert(typeof MotionEngine.suggestRegions === 'function', 'MotionEngine.suggestRegions must be a function');
  
  // Attach synthetic image to MotionEngine
  MotionEngine.currentImage = syntheticImg;
  const engineCandidates = await MotionEngine.suggestRegions();
  assert(Array.isArray(engineCandidates), 'MotionEngine.suggestRegions must resolve to an array');
  assert(engineCandidates.length >= 3, `MotionEngine.suggestRegions must return candidates (got ${engineCandidates.length})`);
  assert(engineCandidates.some(c => c.name === 'Tóc bay'), 'Candidate Tóc bay must be present');

  console.log('✓ TEST 8 Passed: MotionEngine.suggestRegions() binding verified.\n');
  testsPassed++;

  console.log('====================================================');
  console.log(`🎉 ALL ${testsPassed} PHYSICS & SEGMENTATION TESTS PASSED (100%)`);
  console.log('====================================================');
}

testSegmentation().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
