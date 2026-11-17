/**
 * projectState.js - Central Immutable State Manager
 * Strictly enforces that no module directly mutates another module's state.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ProjectStateManager = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(item => deepClone(item));
    const copy = {};
    for (const key of Object.keys(obj)) {
      copy[key] = deepClone(obj[key]);
    }
    return copy;
  }

  function deepFreeze(obj) {
    if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(val => {
        if (val && typeof val === 'object' && !Object.isFrozen(val)) {
          deepFreeze(val);
        }
      });
      return Object.freeze(obj);
    }
    return obj;
  }

  class ProjectStateManager {
    constructor(eventBus = null, initialData = null) {
      this._bus = eventBus;
      this._state = this._createDefaultState();

      if (initialData && typeof initialData === 'object') {
        this.reset(initialData);
      }
    }

    _createDefaultState() {
      return {
        schemaVersion: 2,
        image: {
          url: '',
          width: 1920,
          height: 1080,
          name: 'default.jpg'
        },
        layers: [],
        settings: {
          loopPeriodSec: 12,
          naturalness: 50,
          calm: {
            preset: 'medium',
            focusShieldEnabled: true,
            typingFactor: 0.2,
            blurFocus: false,
            backgroundAttenuated: false
          },
          parallax: {
            enabled: false,
            maxPermille: 8,
            tau: 0.25
          },
          safeZones: []
        }
      };
    }

    /**
     * Get an immutable snapshot of the entire state or a specific slice.
     * @param {string|null} slice - e.g. 'layers', 'settings.calm', 'image'
     * @returns {any} Deep-frozen snapshot
     */
    get(slice = null) {
      if (!slice) {
        return deepFreeze(deepClone(this._state));
      }

      const parts = slice.split('.');
      let curr = this._state;
      for (const p of parts) {
        if (curr && typeof curr === 'object' && p in curr) {
          curr = curr[p];
        } else {
          return undefined;
        }
      }

      return deepFreeze(deepClone(curr));
    }

    /**
     * Safely patch a slice of the project state.
     * @param {string} slice - e.g. 'settings.parallax', 'layers'
     * @param {any} partialData 
     * @returns {any} New state snapshot
     */
    patch(slice, partialData) {
      if (!slice || typeof slice !== 'string') {
        throw new TypeError('[ProjectState] slice must be a non-empty string path');
      }

      const parts = slice.split('.');
      const nextState = deepClone(this._state);
      let target = nextState;

      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!(p in target) || typeof target[p] !== 'object') {
          target[p] = {};
        }
        target = target[p];
      }

      const lastKey = parts[parts.length - 1];
      const oldValue = deepClone(target[lastKey]);

      if (Array.isArray(partialData)) {
        target[lastKey] = deepClone(partialData);
      } else if (partialData && typeof partialData === 'object' && !Array.isArray(partialData)) {
        target[lastKey] = Object.assign({}, target[lastKey] || {}, deepClone(partialData));
      } else {
        target[lastKey] = partialData;
      }

      const newValue = deepClone(target[lastKey]);
      this._state = nextState;

      // Notify via Event Bus
      if (this._bus && typeof this._bus.emit === 'function') {
        this._bus.emit('state:changed', {
          slice,
          oldValue,
          newValue,
          timestamp: Date.now()
        });
      }

      return this.get(slice);
    }

    /**
     * Replace entire state with new data
     * @param {object} newState 
     */
    reset(newState) {
      if (!newState || typeof newState !== 'object') {
        throw new TypeError('[ProjectState] newState must be a valid object');
      }

      const oldValue = deepClone(this._state);
      this._state = Object.assign(this._createDefaultState(), deepClone(newState));

      if (this._bus && typeof this._bus.emit === 'function') {
        this._bus.emit('state:changed', {
          slice: '*',
          oldValue,
          newValue: deepClone(this._state),
          timestamp: Date.now()
        });
      }

      return this.get();
    }
  }

  return ProjectStateManager;
});
