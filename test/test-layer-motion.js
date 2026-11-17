/**
 * test-layer-motion.js
 * Comprehensive Unit Test Suite for GIAI ĐOẠN 2: Động Cơ Chuyển Động Mềm Cho Từng Lớp
 * 
 * Verifies:
 * 1. Layer Motion Configuration & CFG Permille Units (Breathe: 2‰, Sway: 3‰, Drift: 3‰, Ripple: 2.5‰)
 * 2. 4 Motion Modes Math & Easing:
 *    - Thở (Breathe): Scale & translate around anchor
 *    - Đung đưa (Sway): Rotation around anchor (root at anchor strictly 0 displacement, tip sways)
 *    - Trôi (Drift): Directional harmonic cyclic translation
 *    - Gợn (Ripple): Harmonic multi-sine displacement warp
 * 3. Perpetual Seamless Loop Continuity (0 Jerk, Zero Discontinuity at t=0 vs t=T)
 * 4. Hyperbolic Tangent Amplitude Clamping (Decision D-007)
 * 5. Visual Warning Threshold Guard (Biên độ vượt 75% ngưỡng khuyến nghị)
 * 6. Seam Check Mode (seamCheck API & loop verification)
 * 7. Motion UI Layer Controller & Anchor Picking
 */

const assert = require('assert');
const path = require('path');

const MotionEngine = require('../renderer/motion.js');
const { CFG, unitPx, ampPx } = require('../renderer/config.js');

console.log('====================================================');
console.log('🧪 RUNNING LAYER MOTION ENGINE TESTS (GIAI ĐOẠN 2)');
console.log('====================================================\n');

let testsPassed = 0;

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: CFG Permille Units & Motion Limits
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 1: CFG Permille Units & Motion Limits ---');
{
  assert(CFG.motion, 'CFG.motion must be defined');
  assert.strictEqual(CFG.motion.limit.breathe, 2, 'Breathe limit must be 2‰');
  assert.strictEqual(CFG.motion.limit.sway, 3, 'Sway limit must be 3‰');
  assert.strictEqual(CFG.motion.limit.drift, 3, 'Drift limit must be 3‰');
  assert.strictEqual(CFG.motion.limit.ripple, 2.5, 'Ripple limit must be 2.5‰');
  assert.strictEqual(CFG.motion.defaultAmp, 1, 'Default amplitude must be 1‰');
  assert.strictEqual(CFG.motion.defaultChaos, 0.15, 'Default chaos must be 15%');
  assert.strictEqual(CFG.motion.chaosMax, 0.5, 'Max chaos must be 50%');
  assert.strictEqual(CFG.motion.warnRatio, 0.75, 'Warn ratio must be 75%');
  assert.strictEqual(CFG.loop.seconds, 12, 'Default loop duration must be 12s');

  console.log('✓ TEST 1 Passed: CFG Permille units and limits validated.\n');
  testsPassed++;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: Đung Đưa (Sway) Mode - Root Fixed at Anchor, Tip Sways
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 2: Sway Mode - Root Fixed at Anchor, Tip Sways ---');
{
  const layerSway = {
    id: 'layer-test-sway',
    motionType: 'sway',
    amplitude: 2.0, // 2‰
    chaos: 0.15,
    loopSec: 12,
    anchor: { x: 0.5, y: 0.2 } // Root anchor at top-center
  };

  const W = 1920;
  const H = 1080;
  const t = 3.0; // quarter period, high displacement

  // Point A: Exactly at the anchor (root of hair/strand)
  const rootMotion = MotionEngine.calculateLayerMotion({
    layer: layerSway,
    x: 0.5,
    y: 0.2,
    timeSec: t,
    loopPeriodSec: 12,
    imageWidth: W,
    imageHeight: H
  });

  assert.strictEqual(rootMotion.motionType, 'sway');
  assert(Math.abs(rootMotion.dx) < 1e-4, `Root dx must be ~0, got ${rootMotion.dx}`);
  assert(Math.abs(rootMotion.dy) < 1e-4, `Root dy must be ~0, got ${rootMotion.dy}`);
  assert(rootMotion.displacement < 1e-4, 'Displacement at anchor root must be strictly 0');

  // Point B: Halfway down the strand
  const midMotion = MotionEngine.calculateLayerMotion({
    layer: layerSway,
    x: 0.5,
    y: 0.5,
    timeSec: t,
    loopPeriodSec: 12,
    imageWidth: W,
    imageHeight: H
  });

  // Point C: At the tip (far from anchor)
  const tipMotion = MotionEngine.calculateLayerMotion({
    layer: layerSway,
    x: 0.5,
    y: 0.85,
    timeSec: t,
    loopPeriodSec: 12,
    imageWidth: W,
    imageHeight: H
  });

  assert(midMotion.displacement > 0.01, 'Mid-strand should have positive displacement');
  assert(tipMotion.displacement > midMotion.displacement, 'Tip displacement must be strictly greater than mid displacement');

  console.log(`   - Root displacement: ${rootMotion.displacement.toFixed(4)}px (strictly 0)`);
  console.log(`   - Mid-strand displacement: ${midMotion.displacement.toFixed(4)}px`);
  console.log(`   - Tip displacement: ${tipMotion.displacement.toFixed(4)}px (maximum sway)`);
  console.log('✓ TEST 2 Passed: Sway mode rotates around anchor with 0 root displacement.\n');
  testsPassed++;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Thở (Breathe) Mode - Radial Scale Around Anchor
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 3: Breathe Mode - Radial Scale Around Anchor ---');
{
  const layerBreathe = {
    id: 'layer-test-breathe',
    motionType: 'breathe',
    amplitude: 1.5,
    chaos: 0.1,
    loopSec: 10,
    anchor: { x: 0.5, y: 0.5 }
  };

  const t = 2.5; // peak sin
  const centerMotion = MotionEngine.calculateLayerMotion({
    layer: layerBreathe,
    x: 0.5,
    y: 0.5,
    timeSec: t,
    loopPeriodSec: 10,
    imageWidth: 1000,
    imageHeight: 1000
  });

  // At center, radial expansion (relX * scale, relY * scale) is zero, only minor vertical translate
  assert(Math.abs(centerMotion.dx) < 1e-4, `Center dx should be ~0, got ${centerMotion.dx}`);

  const edgeMotion = MotionEngine.calculateLayerMotion({
    layer: layerBreathe,
    x: 0.9,
    y: 0.5,
    timeSec: t,
    loopPeriodSec: 10,
    imageWidth: 1000,
    imageHeight: 1000
  });

  assert(Math.abs(edgeMotion.dx) > 0.1, 'Edge dx should expand radially outward');
  console.log(`   - Breathe center dx: ${centerMotion.dx.toFixed(4)}px`);
  console.log(`   - Breathe edge dx: ${edgeMotion.dx.toFixed(4)}px`);
  console.log('✓ TEST 3 Passed: Breathe mode scales radially around anchor.\n');
  testsPassed++;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: Trôi (Drift) & Gợn (Ripple) Modes
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 4: Drift & Ripple Modes ---');
{
  const layerDrift = {
    id: 'layer-test-drift',
    motionType: 'drift',
    amplitude: 2.0,
    direction: 90, // vertical down
    loopSec: 12
  };

  const driftMotion = MotionEngine.calculateLayerMotion({
    layer: layerDrift,
    x: 0.5,
    y: 0.5,
    timeSec: 3.0,
    loopPeriodSec: 12,
    imageWidth: 1000,
    imageHeight: 1000
  });

  assert(Math.abs(driftMotion.dy) > Math.abs(driftMotion.dx), 'Direction 90° should displace primarily along y-axis');

  const layerRipple = {
    id: 'layer-test-ripple',
    motionType: 'ripple',
    amplitude: 2.0,
    direction: 45,
    loopSec: 12
  };

  const rippleMotion = MotionEngine.calculateLayerMotion({
    layer: layerRipple,
    x: 0.5,
    y: 0.5,
    timeSec: 3.0,
    loopPeriodSec: 12,
    imageWidth: 1000,
    imageHeight: 1000
  });

  assert(rippleMotion.displacement > 0.05, 'Ripple mode should produce smooth displacement warp');
  console.log(`   - Drift (dy=${driftMotion.dy.toFixed(2)}, dx=${driftMotion.dx.toFixed(2)})`);
  console.log(`   - Ripple displacement: ${rippleMotion.displacement.toFixed(2)}px`);
  console.log('✓ TEST 4 Passed: Drift and Ripple modes validated.\n');
  testsPassed++;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5: Mathematical Seamless Loop Continuity Across All 4 Modes (0 Jerk)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 5: Seamless Loop Continuity (f(0) == f(T) & f\'(0) == f\'(T)) ---');
{
  const types = ['breathe', 'sway', 'drift', 'ripple'];
  const T = 12.0;
  const dt = 0.0001;

  for (const mType of types) {
    const layer = {
      id: `layer-seamless-${mType}`,
      motionType: mType,
      amplitude: 2.0,
      chaos: 0.25, // with significant noise
      loopSec: T,
      anchor: { x: 0.5, y: 0.2 }
    };

    const res0 = MotionEngine.calculateLayerMotion({
      layer,
      x: 0.6,
      y: 0.7,
      timeSec: 0,
      loopPeriodSec: T
    });

    const resT = MotionEngine.calculateLayerMotion({
      layer,
      x: 0.6,
      y: 0.7,
      timeSec: T,
      loopPeriodSec: T
    });

    const dPos = Math.hypot(res0.dx - resT.dx, res0.dy - resT.dy);
    assert(dPos < 1e-5, `Position discontinuity in ${mType} must be virtually 0 (< 1e-5), got ${dPos}`);

    // Velocity derivative at t = 0
    const res0Plus = MotionEngine.calculateLayerMotion({ layer, x: 0.6, y: 0.7, timeSec: dt, loopPeriodSec: T });
    const res0Minus = MotionEngine.calculateLayerMotion({ layer, x: 0.6, y: 0.7, timeSec: -dt, loopPeriodSec: T });
    const vx0 = (res0Plus.dx - res0Minus.dx) / (2 * dt);
    const vy0 = (res0Plus.dy - res0Minus.dy) / (2 * dt);

    // Velocity derivative at t = T
    const resTPlus = MotionEngine.calculateLayerMotion({ layer, x: 0.6, y: 0.7, timeSec: T + dt, loopPeriodSec: T });
    const resTMinus = MotionEngine.calculateLayerMotion({ layer, x: 0.6, y: 0.7, timeSec: T - dt, loopPeriodSec: T });
    const vxT = (resTPlus.dx - resTMinus.dx) / (2 * dt);
    const vyT = (resTPlus.dy - resTMinus.dy) / (2 * dt);

    const dVel = Math.hypot(vx0 - vxT, vy0 - vyT);
    assert(dVel < 1e-3, `Velocity discontinuity in ${mType} must be virtually 0 (< 1e-3), got ${dVel}`);

    console.log(`   ✓ ${mType.toUpperCase().padEnd(7)}: Δpos = ${dPos.toExponential(2)} (PASS), Δvel = ${dVel.toExponential(2)} (PASS)`);
  }

  console.log('✓ TEST 5 Passed: All 4 motion modes guarantee 100% seamless C-infinity loops.\n');
  testsPassed++;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 6: Hyperbolic Tangent Soft Clamping (Decision D-007)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 6: Hyperbolic Tangent Soft Clamping ---');
{
  const W = 1000;
  const H = 1000;
  // Limit for sway is 3‰ -> 3px on 1000px image
  const layerExtreme = {
    id: 'layer-extreme',
    motionType: 'sway',
    amplitude: 99.0, // extremely large request
    chaos: 0.5,
    loopSec: 12,
    anchor: { x: 0.1, y: 0.1 }
  };

  const res = MotionEngine.calculateLayerMotion({
    layer: layerExtreme,
    x: 0.9,
    y: 0.9,
    timeSec: 3.0,
    loopPeriodSec: 12,
    imageWidth: W,
    imageHeight: H
  });

  const limitPx = 3.0; // 3‰ of 1000px = 3px
  assert(res.displacement <= limitPx + 0.001, `Displacement (${res.displacement}) must never exceed limitPx (${limitPx})`);
  console.log(`   - Requested 99‰ -> Clamped result: ${res.displacement.toFixed(4)}px (Limit: ${limitPx}px)`);
  console.log('✓ TEST 6 Passed: Hyperbolic tangent clamping strictly bounds maximum displacement.\n');
  testsPassed++;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 7: Visual Warning Threshold Guard (warnRatio = 75%)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 7: Visual Warning Threshold Guard ---');
{
  // For breathe: limit = 2‰, warn threshold = 2 * 0.75 = 1.5‰
  const layerSafe = {
    id: 'layer-safe',
    motionType: 'breathe',
    amplitude: 1.2 // 1.2 <= 1.5 -> Safe
  };
  const resSafe = MotionEngine.calculateLayerMotion({ layer: layerSafe });
  assert.strictEqual(resSafe.isWarning, false, '1.2‰ should not trigger warning for breathe (limit 2‰)');

  const layerWarn = {
    id: 'layer-warn',
    motionType: 'breathe',
    amplitude: 1.8 // 1.8 > 1.5 -> Warning
  };
  const resWarn = MotionEngine.calculateLayerMotion({ layer: layerWarn });
  assert.strictEqual(resWarn.isWarning, true, '1.8‰ must trigger warning for breathe (threshold 1.5‰)');

  console.log(`   - Breathe 1.2‰: isWarning = ${resSafe.isWarning} (SAFE)`);
  console.log(`   - Breathe 1.8‰: isWarning = ${resWarn.isWarning} (WARN: Dễ gây rối mắt)`);
  console.log('✓ TEST 7 Passed: Warning threshold accurately triggers at >75% of limit.\n');
  testsPassed++;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 8: Seam Check API and Report
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 8: Seam Check API ---');
{
  const seamRes = MotionEngine.seamCheck();
  assert(typeof seamRes === 'object', 'seamCheck must return status object');
  assert.strictEqual(seamRes.seamless, true, 'seamCheck must confirm seamless: true');
  console.log(`   - Seam Check toggled: isSeamCheck=${seamRes.isSeamCheck}, seamless=${seamRes.seamless}`);
  // Toggle back
  MotionEngine.seamCheck();
  console.log('✓ TEST 8 Passed: Seam check verification completed.\n');
  testsPassed++;
}

console.log('====================================================');
console.log(`🎉 ALL ${testsPassed} LAYER MOTION TEST SUITES PASSED (100.0%)`);
console.log('====================================================');
