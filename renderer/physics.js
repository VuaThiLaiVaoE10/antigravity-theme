/**
 * physics.js - Spring-Damper Physics for Motion Layers (Hair, Dress, Ribbon)
 * 
 * Strict Ownership: Worker B (motion-adv-dev)
 * 
 * Contract:
 * Layer.physics = {
 *   enabled: boolean,          // Bật/tắt mô phỏng vật lý lò xo giảm chấn
 *   anchor: { x: number, y: number }, // Điểm neo gốc (chuẩn hóa 0..1), ví dụ chân tóc hoặc eo váy
 *   stiffness: number,         // Độ cứng lò xo (0.1 .. 5.0)
 *   damping: number,           // Độ giảm chấn (0.1 .. 1.0)
 *   lag: number,               // Độ trễ pha (0.0 .. 1.0), càng xa điểm neo độ trễ càng lớn
 *   maxDisplacement: number    // Giới hạn dịch chuyển tối đa (px hoặc tỷ lệ)
 * };
 * 
 * Physics Model:
 * 1. Distance-from-anchor scaling: Root at anchor is fixed (0 displacement), amplitude smoothly ramps up with distance.
 * 2. Harmonic spring-damper displacement with spatial phase lag: Tip lags behind root motion.
 * 3. Strict periodic boundary conditions: displacement(0) === displacement(loopPeriodMs), velocity(0) === velocity(loopPeriodMs).
 *    0 Jerk, mathematically seamless perpetual loop.
 * 4. Hyperbolic tangent soft saturation: Strictly prevents edge tearing and extreme distortion.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PetPhysics = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class PhysicsEngine {
    constructor() {
      this.enabled = true;
      this.defaultConfig = {
        enabled: true,
        anchor: { x: 0.5, y: 0.1 },
        stiffness: 1.0,
        damping: 0.8,
        lag: 0.3,
        maxDisplacement: 35.0
      };
    }

    /**
     * Compute distance and normalized anchor restraint factor.
     * At anchor (dist = 0): factor is 0 (fixed root).
     * Smoothly ramps up to 1.0 as distance increases.
     */
    getAnchorRestraint(coords, anchor) {
      const ax = (anchor && typeof anchor.x === 'number') ? anchor.x : 0.5;
      const ay = (anchor && typeof anchor.y === 'number') ? anchor.y : 0.1;
      const x = (coords && typeof coords.x === 'number') ? coords.x : 0.5;
      const y = (coords && typeof coords.y === 'number') ? coords.y : 0.5;

      const dist = Math.hypot(x - ax, y - ay);
      // C-infinity smooth exponential approach: 1 - exp(-4 * dist)
      const factor = 1.0 - Math.exp(-4.0 * Math.max(0, dist));
      return { dist, factor };
    }

    /**
     * Analytical Harmonic Spring-Damper Solver.
     * Steady-state solution to driven damped harmonic oscillator:
     * m * x'' + c * x' + k * x = F0 * sin(Omega * t)
     * Exact periodic boundary condition guaranteed:
     * displacement(0) == displacement(T) and velocity(0) == velocity(T).
     */
    solveHarmonicSpringDamper({
      timeSec,
      loopPeriodSec = 4.0,
      stiffness = 1.0,
      damping = 0.8,
      dist = 0.3,
      lag = 0.3,
      harmonics = [
        { freqMult: 1, weight: 0.60 },
        { freqMult: 2, weight: 0.28 },
        { freqMult: 3, weight: 0.12 }
      ]
    }) {
      const T = Math.max(0.1, loopPeriodSec);
      // Exact time modulo inside period [0, T)
      const normT = ((timeSec % T) + T) % T;
      const omega0 = (2 * Math.PI) / T;

      // Natural frequency wn and damping factor zeta
      const s = Math.max(0.1, Math.min(5.0, stiffness));
      const d = Math.max(0.05, Math.min(1.2, damping));
      const wn = Math.sqrt(s) * 2.5 + 1.0;
      const zeta = d * 1.2;

      // Spatial phase lag proportional to distance from anchor
      const spatialLag = -dist * Math.max(0, Math.min(1.0, lag)) * (2 * Math.PI);

      let displacement = 0;
      let velocity = 0;
      let acceleration = 0;
      let totalWeight = 0;

      for (const h of harmonics) {
        const k = h.freqMult;
        const omegaK = k * omega0;

        // Driven oscillator amplitude magnification factor
        const denom = Math.sqrt(
          Math.pow(wn * wn - omegaK * omegaK, 2) + Math.pow(2 * zeta * wn * omegaK, 2)
        );
        const gain = (wn * wn) / (denom || 1.0);

        // Phase shift delta due to damping and inertia
        const delta = Math.atan2(2 * zeta * wn * omegaK, wn * wn - omegaK * omegaK);

        // Instantaneous phase
        const phase = omegaK * normT - delta + spatialLag;

        const compDisp = h.weight * gain * Math.sin(phase);
        const compVel = h.weight * gain * omegaK * Math.cos(phase);
        const compAcc = -h.weight * gain * omegaK * omegaK * Math.sin(phase);

        displacement += compDisp;
        velocity += compVel;
        acceleration += compAcc;
        totalWeight += h.weight * gain;
      }

      const normalizedDisp = totalWeight > 0.0001 ? displacement / totalWeight : displacement;
      const normalizedVel = totalWeight > 0.0001 ? velocity / totalWeight : velocity;
      const normalizedAcc = totalWeight > 0.0001 ? acceleration / totalWeight : acceleration;

      return {
        displacement: normalizedDisp,
        velocity: normalizedVel,
        acceleration: normalizedAcc,
        spatialLag
      };
    }

    /**
     * Smooth hyperbolic tangent amplitude clamp.
     * Preserves continuous first and second derivatives with no hard kinks.
     */
    clampDisplacement(val, maxShift = 35.0) {
      const limit = Math.max(1.0, maxShift);
      return limit * Math.tanh(val / limit);
    }

    /**
     * Primary Physics Displacement Method.
     * Contract: applyPhysics(coords, layer, t, loopPeriodMs, baseDisplacement)
     * Returns 2D vector offset { dx, dy, displacement, dist, factor }.
     */
    applyPhysics(coords, layer, t = 0, loopPeriodMs = 4000, baseDisplacement = 1.0) {
      if (!layer) {
        return { dx: 0, dy: 0, displacement: 0, dist: 0, factor: 0 };
      }

      const phys = Object.assign({}, this.defaultConfig, layer.physics || {});
      if (!phys.enabled) {
        if (typeof baseDisplacement === 'number') {
          return { dx: baseDisplacement, dy: baseDisplacement, displacement: baseDisplacement, dist: 0, factor: 1 };
        }
        return baseDisplacement || { dx: 0, dy: 0, displacement: 0, dist: 0, factor: 1 };
      }

      const periodSec = (loopPeriodMs || 4000) / 1000;
      const timeSec = typeof t === 'number' ? (t > 1000 ? t / 1000 : t) : 0;

      // 1. Distance from anchor
      const anchor = phys.anchor || { x: 0.5, y: 0.1 };
      const { dist, factor } = this.getAnchorRestraint(coords, anchor);

      // 2. Harmonic spring-damper solution
      const solution = this.solveHarmonicSpringDamper({
        timeSec,
        loopPeriodSec: periodSec,
        stiffness: phys.stiffness,
        damping: phys.damping,
        dist,
        lag: phys.lag
      });

      // 3. Amplitude scaling by anchor restraint and layer intensity
      const layerIntensity = typeof layer.intensity === 'number' ? layer.intensity : 1.0;
      const maxShift = typeof phys.maxDisplacement === 'number' ? phys.maxDisplacement : (layer.maxShift || 35.0);

      // Base displacement scaling
      let baseVal = 1.0;
      let baseDx = 0;
      let baseDy = 0;
      if (typeof baseDisplacement === 'number') {
        baseVal = baseDisplacement;
      } else if (baseDisplacement && typeof baseDisplacement === 'object') {
        baseDx = baseDisplacement.dx || 0;
        baseDy = baseDisplacement.dy || 0;
        baseVal = Math.hypot(baseDx, baseDy) || 1.0;
      }

      // Calculate raw physical displacement
      const rawAmplitude = solution.displacement * layerIntensity * factor * baseVal;

      // Clamped displacement to strictly prevent tearing
      const clampedAmplitude = this.clampDisplacement(rawAmplitude, maxShift);

      // Flow direction angle (degrees or radians)
      let dirRad = (layer.direction || 90) * (Math.PI / 180);
      if (Array.isArray(layer.arrows) && layer.arrows.length > 0) {
        const arr = layer.arrows[0];
        dirRad = Math.atan2(arr.y2 - arr.y1, arr.x2 - arr.x1);
      }

      // 2D components: primary tangential and perpendicular sway
      const dirX = Math.cos(dirRad);
      const dirY = Math.sin(dirRad);
      const perpX = -dirY;
      const perpY = dirX;

      // Tip sways more perpendicular to flow, advects slightly tangential
      const dx = this.clampDisplacement(
        (dirX * 0.35 + perpX * 0.85) * clampedAmplitude + baseDx,
        maxShift
      );
      const dy = this.clampDisplacement(
        (dirY * 0.35 + perpY * 0.85) * clampedAmplitude + baseDy,
        maxShift
      );

      return {
        dx,
        dy,
        displacement: clampedAmplitude,
        velocity: solution.velocity,
        acceleration: solution.acceleration,
        dist,
        factor,
        spatialLag: solution.spatialLag
      };
    }

    /**
     * Backward-compatible calculateDisplacement method.
     */
    calculateDisplacement(layer, t, baseDisplacement = 1.0, coords = { x: 0.5, y: 0.5 }, loopPeriodMs = 4000) {
      const res = this.applyPhysics(coords, layer, t, loopPeriodMs, baseDisplacement);
      if (typeof baseDisplacement === 'number') {
        return res.displacement;
      }
      return res;
    }

    /**
     * Verify seamless loop continuity (t = 0 vs t = loopPeriodMs).
     * Returns { seamless: bool, maxPosDelta, maxVelDelta }.
     */
    verifySeamlessLoop(layer, loopPeriodMs = 4000) {
      const T = (loopPeriodMs || 4000) / 1000;
      const sampleCoords = [
        { x: 0.5, y: 0.1 },
        { x: 0.5, y: 0.5 },
        { x: 0.2, y: 0.8 },
        { x: 0.8, y: 0.9 }
      ];

      let maxPosDelta = 0;
      let maxVelDelta = 0;
      const dt = 0.0001;

      for (const pt of sampleCoords) {
        const r0 = this.applyPhysics(pt, layer, 0, loopPeriodMs, 1.0);
        const rT = this.applyPhysics(pt, layer, T, loopPeriodMs, 1.0);

        const dPos = Math.hypot(r0.dx - rT.dx, r0.dy - rT.dy);
        if (dPos > maxPosDelta) maxPosDelta = dPos;

        const r0Plus = this.applyPhysics(pt, layer, dt, loopPeriodMs, 1.0);
        const r0Minus = this.applyPhysics(pt, layer, -dt, loopPeriodMs, 1.0);
        const vx0 = (r0Plus.dx - r0Minus.dx) / (2 * dt);
        const vy0 = (r0Plus.dy - r0Minus.dy) / (2 * dt);

        const rTPlus = this.applyPhysics(pt, layer, T + dt, loopPeriodMs, 1.0);
        const rTMinus = this.applyPhysics(pt, layer, T - dt, loopPeriodMs, 1.0);
        const vxT = (rTPlus.dx - rTMinus.dx) / (2 * dt);
        const vyT = (rTPlus.dy - rTMinus.dy) / (2 * dt);

        const dVel = Math.hypot(vx0 - vxT, vy0 - vyT);
        if (dVel > maxVelDelta) maxVelDelta = dVel;
      }

      return {
        seamless: maxPosDelta < 1e-4 && maxVelDelta < 1e-3,
        maxPosDelta,
        maxVelDelta
      };
    }

    /**
     * Set physics config on layer and update MotionEngine if available.
     */
    setPhysics(layerId, cfg = {}, motionEngine = null) {
      let engine = motionEngine;
      if (!engine && typeof window !== 'undefined' && window.MotionEngine) {
        engine = window.MotionEngine;
      }

      if (engine && typeof engine.setPhysics === 'function') {
        return engine.setPhysics(layerId, cfg);
      }

      if (engine && typeof engine.getLayer === 'function') {
        const layer = engine.getLayer(layerId);
        if (layer) {
          layer.physics = Object.assign({}, this.defaultConfig, layer.physics || {}, cfg);
          return layer.physics;
        }
      }

      return Object.assign({}, this.defaultConfig, cfg);
    }

    getEffectivePhaseLag(layer, basePhaseLag = 0.5) {
      if (!layer || !layer.physics || !layer.physics.enabled) {
        return basePhaseLag;
      }
      const lag = typeof layer.physics.lag === 'number' ? layer.physics.lag : 0.3;
      return basePhaseLag + lag * 0.8;
    }
  }

  const instance = new PhysicsEngine();
  instance.PhysicsEngine = PhysicsEngine;

  return instance;
});
