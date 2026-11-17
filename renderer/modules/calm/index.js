/**
 * calm/index.js - Calm & Visual Protection Module
 * Manages the 3 calm presets (subtle, medium, lively) with hard bounds on amplitude,
 * active regions count, and automatic background attenuation when window loses focus.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CalmModule = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PRESETS = {
    subtle: {
      name: 'Tinh tế',
      maxAmp: 1,      // 1‰
      maxActive: 2,   // Tối đa 2 lớp động
      loopSec: 14,
      chaosMax: 0.10,
      speedLimit: 1.0
    },
    medium: {
      name: 'Vừa (Mặc định)',
      maxAmp: 2,      // 2‰
      maxActive: 3,   // Tối đa 3 lớp động
      loopSec: 12,
      chaosMax: 0.20,
      speedLimit: 1.5
    },
    lively: {
      name: 'Sống động',
      maxAmp: 3,      // 3‰
      maxActive: 4,   // Tối đa 4 lớp động
      loopSec: 9,
      chaosMax: 0.35,
      speedLimit: 2.0
    }
  };

  class CalmModule {
    constructor() {
      this.id = 'calm';
      this.name = 'Visual Calm & Focus Protection Engine';
      this.version = '1.0.0';

      this._bus = null;
      this._state = null;
      this._config = null;
      this._unsubs = [];
      this._isWindowFocused = true;
    }

    init(context) {
      this._bus = context.bus;
      this._state = context.state;
      this._config = context.config || {};

      // Register event listeners
      this._unsubs.push(
        this._bus.on('calm:set-preset', (payload) => this.setPreset(payload ? payload.preset : 'medium')),
        this._bus.on('window:focus-change', (payload) => this.setWindowFocus(payload ? payload.focused : true)),
        this._bus.on('state:changed', (payload) => {
          if (payload && payload.slice === 'layers') {
            this.enforceLimits();
          }
        })
      );

      // Auto-bind to DOM window if available
      this._bindWindowEvents();
    }

    _bindWindowEvents() {
      if (typeof window === 'undefined') return;

      const onBlur = () => this.setWindowFocus(false);
      const onFocus = () => this.setWindowFocus(true);
      const onVisChange = () => {
        if (typeof document !== 'undefined' && document.hidden) {
          this.setWindowFocus(false);
        } else {
          this.setWindowFocus(true);
        }
      };

      window.addEventListener('blur', onBlur);
      window.addEventListener('focus', onFocus);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', onVisChange);
      }

      this._domCleanup = () => {
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('focus', onFocus);
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', onVisChange);
        }
      };
    }

    /**
     * Set active calm preset (subtle, medium, lively)
     * @param {'subtle'|'medium'|'lively'} presetKey 
     */
    setPreset(presetKey) {
      const key = (presetKey in PRESETS) ? presetKey : 'medium';
      const preset = PRESETS[key];

      if (this._state) {
        this._state.patch('settings.calm', { preset: key });
      }

      const enforcement = this.enforceLimits(key);
      if (this._bus) {
        this._bus.emit('calm:preset-applied', {
          preset: key,
          presetConfig: preset,
          enforcement
        });
      }

      return preset;
    }

    /**
     * Get current preset configuration
     * @returns {object}
     */
    getPreset() {
      const currentKey = (this._state && this._state.get('settings.calm.preset')) || 'medium';
      return PRESETS[currentKey] || PRESETS.medium;
    }

    /**
     * Handle window focus/blur for auto-attenuation
     * @param {boolean} isFocused 
     */
    setWindowFocus(isFocused) {
      this._isWindowFocused = !!isFocused;
      const attenuated = !this._isWindowFocused;

      if (this._state) {
        this._state.patch('settings.calm', { backgroundAttenuated: attenuated });
      }

      if (this._bus) {
        this._bus.emit('calm:attenuation-changed', {
          focused: this._isWindowFocused,
          attenuated,
          attenuationFactor: attenuated ? 0.2 : 1.0
        });
      }
    }

    /**
     * Enforce preset bounds on all layers (clamps amplitude, speed, active regions count)
     * @param {string|null} presetKey 
     * @returns {object} Summary of clamped and muted layers
     */
    enforceLimits(presetKey = null) {
      if (!this._state) return { clamped: [], muted: [] };

      const key = presetKey || this._state.get('settings.calm.preset') || 'medium';
      const preset = PRESETS[key] || PRESETS.medium;

      const layers = this._state.get('layers') || [];
      const clamped = [];
      const muted = [];

      let activeCount = 0;
      let hasChanges = false;

      const updatedLayers = layers.map(l => {
        if (!l) return l;
        const copy = Object.assign({}, l);

        // Clamp amplitude
        if (typeof copy.amplitude === 'number' && copy.amplitude > preset.maxAmp) {
          copy.amplitude = preset.maxAmp;
          clamped.push({ id: copy.id, field: 'amplitude', to: preset.maxAmp });
          hasChanges = true;
        }

        // Clamp chaos
        if (typeof copy.chaos === 'number' && copy.chaos > preset.chaosMax) {
          copy.chaos = preset.chaosMax;
          clamped.push({ id: copy.id, field: 'chaos', to: preset.chaosMax });
          hasChanges = true;
        }

        // Check active layers count
        if (copy.visible !== false) {
          activeCount++;
          if (activeCount > preset.maxActive) {
            copy.visible = false;
            muted.push(copy.id);
            hasChanges = true;
          }
        }

        return copy;
      });

      if (hasChanges) {
        this._state.patch('layers', updatedLayers);
      }

      return {
        preset: key,
        maxAmp: preset.maxAmp,
        maxActive: preset.maxActive,
        clamped,
        muted
      };
    }

    destroy() {
      for (const unsub of this._unsubs) {
        if (typeof unsub === 'function') unsub();
      }
      this._unsubs = [];
      if (this._domCleanup) {
        this._domCleanup();
        this._domCleanup = null;
      }
    }
  }

  return new CalmModule();
});
