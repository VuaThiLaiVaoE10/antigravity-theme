/**
 * eventBus.js - Central Decoupled Event Bus for Antigravity Theme Studio Modules
 * Lightweight, zero-dependency Pub/Sub implementation
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EventBus = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class EventBus {
    constructor() {
      this._handlers = new Map();
      this._history = [];
      this._maxHistory = 100;
    }

    /**
     * Subscribe to an event
     * @param {string} event 
     * @param {Function} handler 
     * @returns {Function} Unsubscribe function
     */
    on(event, handler) {
      if (typeof event !== 'string' || typeof handler !== 'function') {
        throw new TypeError('[EventBus] event must be a string and handler must be a function');
      }

      if (!this._handlers.has(event)) {
        this._handlers.set(event, new Set());
      }
      this._handlers.get(event).add(handler);

      return () => this.off(event, handler);
    }

    /**
     * Subscribe to an event once
     * @param {string} event 
     * @param {Function} handler 
     * @returns {Function} Unsubscribe function
     */
    once(event, handler) {
      const wrapper = (payload) => {
        this.off(event, wrapper);
        handler(payload);
      };
      return this.on(event, wrapper);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event 
     * @param {Function} handler 
     */
    off(event, handler) {
      const set = this._handlers.get(event);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          this._handlers.delete(event);
        }
      }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} event 
     * @param {any} payload 
     * @returns {number} Number of handlers invoked
     */
    emit(event, payload = null) {
      const set = this._handlers.get(event);
      let count = 0;

      // Record in audit history
      if (this._history.length >= this._maxHistory) {
        this._history.shift();
      }
      this._history.push({ event, payload, timestamp: Date.now() });

      if (set && set.size > 0) {
        // Iterate over a copy to allow handlers to unsubscribe safely
        for (const handler of Array.from(set)) {
          try {
            handler(payload);
            count++;
          } catch (err) {
            console.error(`[EventBus] Error in handler for event "${event}":`, err);
          }
        }
      }

      // Also notify wildcard listeners if any
      const wildcards = this._handlers.get('*');
      if (wildcards && wildcards.size > 0 && event !== '*') {
        for (const handler of Array.from(wildcards)) {
          try {
            handler({ event, payload });
          } catch (err) {
            console.error(`[EventBus] Error in wildcard handler:`, err);
          }
        }
      }

      return count;
    }

    /**
     * Get subscriber count for an event
     * @param {string} event 
     * @returns {number}
     */
    listenerCount(event) {
      const set = this._handlers.get(event);
      return set ? set.size : 0;
    }

    /**
     * Get recent event history
     * @returns {Array}
     */
    getHistory() {
      return [...this._history];
    }

    /**
     * Clear all subscribers and history
     */
    clear() {
      this._handlers.clear();
      this._history = [];
    }
  }

  return EventBus;
});
