/**
 * moduleManager.js - Decoupled Module Registry & Coordinator
 * Strictly adheres to the Open-Closed Principle (OCP):
 * New modules can register dynamically without editing any existing module's code.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./eventBus.js', './projectState.js'], factory);
  } else if (typeof module === 'object' && module.exports) {
    const EventBus = require('./eventBus.js');
    const ProjectStateManager = require('./projectState.js');
    module.exports = factory(EventBus, ProjectStateManager);
  } else {
    root.ModuleManager = factory(root.EventBus, root.ProjectStateManager);
  }
})(typeof self !== 'undefined' ? self : this, function (EventBus, ProjectStateManager) {
  'use strict';

  class ModuleManager {
    constructor(options = {}) {
      this.bus = options.bus || new EventBus();
      this.state = options.state || new ProjectStateManager(this.bus, options.initialState || null);
      this.config = options.config || (typeof CFG !== 'undefined' ? CFG : {});
      this._modules = new Map();
      this._initialized = false;
    }

    /**
     * Register and initialize a new module.
     * Complies with OCP: New modules can be added seamlessly.
     * @param {object} moduleDefinition 
     * @returns {object} The registered module
     */
    register(moduleDefinition) {
      if (!moduleDefinition || typeof moduleDefinition !== 'object') {
        throw new TypeError('[ModuleManager] Module must be an object');
      }

      const id = moduleDefinition.id;
      if (!id || typeof id !== 'string') {
        throw new TypeError('[ModuleManager] Module must have a non-empty string "id"');
      }

      if (this._modules.has(id)) {
        console.warn(`[ModuleManager] Module "${id}" already registered. Unregistering previous instance.`);
        this.unregister(id);
      }

      const context = {
        bus: this.bus,
        state: this.state,
        config: this.config
      };

      try {
        if (typeof moduleDefinition.init === 'function') {
          moduleDefinition.init(context);
        }
        this._modules.set(id, moduleDefinition);
        this.bus.emit('module:registered', { id, name: moduleDefinition.name, version: moduleDefinition.version });
        return moduleDefinition;
      } catch (err) {
        console.error(`[ModuleManager] Failed to initialize module "${id}":`, err);
        throw err;
      }
    }

    /**
     * Unregister a module and invoke its destroy lifecycle method
     * @param {string} id 
     * @returns {boolean}
     */
    unregister(id) {
      const mod = this._modules.get(id);
      if (!mod) return false;

      try {
        if (typeof mod.destroy === 'function') {
          mod.destroy();
        }
      } catch (err) {
        console.error(`[ModuleManager] Error during destroy of module "${id}":`, err);
      }

      this._modules.delete(id);
      this.bus.emit('module:unregistered', { id });
      return true;
    }

    /**
     * Retrieve a registered module by its id
     * @param {string} id 
     * @returns {object|null}
     */
    get(id) {
      return this._modules.get(id) || null;
    }

    /**
     * Check if a module is registered
     * @param {string} id 
     * @returns {boolean}
     */
    has(id) {
      return this._modules.has(id);
    }

    /**
     * List all registered modules
     * @returns {Array<{ id: string, name: string, version: string }>}
     */
    list() {
      return Array.from(this._modules.values()).map(m => ({
        id: m.id,
        name: m.name || m.id,
        version: m.version || '1.0.0'
      }));
    }

    /**
     * Destroy all registered modules and clear bus
     */
    destroyAll() {
      for (const id of Array.from(this._modules.keys())) {
        this.unregister(id);
      }
      this.bus.clear();
    }
  }

  return ModuleManager;
});
