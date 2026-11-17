/**
 * parallax/index.js - Parallax Depth Motion Module
 * Shifts each layer with depth-dependent amplitudes based on mouse coordinates,
 * smoothed via exponential lerp, with full enable/disable control.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ParallaxModule = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class ParallaxModule {
    constructor() {
      this.id = 'parallax';
      this.name = 'Parallax Depth Engine';
      this.version = '1.0.0';

      this._bus = null;
      this._state = null;
      this._config = null;
      this._unsubs = [];

      // Current smoothed mouse coordinates (normalized -1.0 .. 1.0)
      this._targetMouse = { x: 0, y: 0 };
      this._currentMouse = { x: 0, y: 0 };
      this._lastTimestamp = 0;
    }

    init(context) {
      this._bus = context.bus;
      this._state = context.state;
      this._config = context.config || {};

      // Register event listeners
      this._unsubs.push(
        this._bus.on('mouse:move', (payload) => this._onMouseMove(payload)),
        this._bus.on('parallax:toggle', (payload) => this.setEnabled(payload ? payload.enabled : true)),
        this._bus.on('preview:render', (payload) => this._onRenderFrame(payload))
      );
    }

    _onMouseMove(payload) {
      if (!payload) return;
      // Normalized coordinates: -1.0 (left/top) to 1.0 (right/bottom)
      const nx = typeof payload.normX === 'number' ? Math.max(-1.0, Math.min(1.0, payload.normX)) : 0;
      const ny = typeof payload.normY === 'number' ? Math.max(-1.0, Math.min(1.0, payload.normY)) : 0;
      this._targetMouse = { x: nx, y: ny };
    }

    _onRenderFrame(payload) {
      const timeMs = (payload && payload.timestamp) || Date.now();
      const dt = this._lastTimestamp > 0 ? Math.min(0.1, (timeMs - this._lastTimestamp) / 1000) : 0.016;
      this._lastTimestamp = timeMs;

      const shifts = this.update(dt);
      if (this._bus) {
        this._bus.emit('parallax:calculated', shifts);
      }
    }

    /**
     * Compute and lerp current smoothed mouse position and calculate per-layer shift
     * @param {number} dtSec Delta time in seconds
     * @returns {object} Calculated shifts per layer
     */
    update(dtSec = 0.016) {
      const pSettings = (this._state && this._state.get('settings.parallax')) || {
        enabled: false,
        maxPermille: 8,
        tau: 0.25
      };

      const isEnabled = !!pSettings.enabled;
      const tau = typeof pSettings.tau === 'number' ? pSettings.tau : 0.25;
      const maxPermille = typeof pSettings.maxPermille === 'number' ? pSettings.maxPermille : 8;

      // Exponential lerp smoothing: factor = 1 - exp(-dt / tau)
      const alpha = tau > 0 ? Math.min(1.0, 1.0 - Math.exp(-dtSec / tau)) : 1.0;
      this._currentMouse.x += (this._targetMouse.x - this._currentMouse.x) * alpha;
      this._currentMouse.y += (this._targetMouse.y - this._currentMouse.y) * alpha;

      const layers = (this._state && this._state.get('layers')) || [];
      const image = (this._state && this._state.get('image')) || { width: 1920, height: 1080 };
      const maxSide = Math.max(image.width || 1920, image.height || 1080);
      const maxShiftPx = (maxPermille / 1000.0) * maxSide;

      const layerShifts = {};

      for (const layer of layers) {
        if (!layer || !layer.id) continue;
        if (!isEnabled) {
          layerShifts[layer.id] = { dx: 0, dy: 0, depth: layer.depth ?? 0.5 };
          continue;
        }

        // Depth modulates parallax:
        // depth ~ 0.0 (far): very subtle opposite parallax (e.g. -0.2x)
        // depth ~ 0.5 (midground): 0 shift or neutral
        // depth ~ 1.0 (foreground): strong forward parallax (e.g. +1.0x)
        const depthVal = typeof layer.depth === 'number' ? Math.max(0.0, Math.min(1.0, layer.depth)) : 0.5;
        const depthFactor = (depthVal - 0.35) * 1.5; // [-0.525 .. 0.975]

        const dx = Math.round(this._currentMouse.x * maxShiftPx * depthFactor * 100) / 100;
        const dy = Math.round(this._currentMouse.y * maxShiftPx * depthFactor * 100) / 100;

        layerShifts[layer.id] = {
          dx,
          dy,
          depth: depthVal,
          depthFactor
        };
      }

      return {
        enabled: isEnabled,
        rawMouse: { ...this._targetMouse },
        smoothedMouse: {
          x: Math.round(this._currentMouse.x * 1000) / 1000,
          y: Math.round(this._currentMouse.y * 1000) / 1000
        },
        layerShifts
      };
    }

    /**
     * Enable or disable parallax
     * @param {boolean} enabled 
     */
    setEnabled(enabled) {
      if (this._state) {
        this._state.patch('settings.parallax', { enabled: !!enabled });
      }
      return !!enabled;
    }

    /**
     * Check if parallax is enabled
     * @returns {boolean}
     */
    isEnabled() {
      const p = this._state && this._state.get('settings.parallax');
      return !!(p && p.enabled);
    }

    destroy() {
      for (const unsub of this._unsubs) {
        if (typeof unsub === 'function') unsub();
      }
      this._unsubs = [];
    }
  }

  return new ParallaxModule();
});
