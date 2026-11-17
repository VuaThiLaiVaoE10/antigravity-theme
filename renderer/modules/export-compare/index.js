/**
 * export-compare/index.js - Export & Before/After Comparison Module
 * Handles Before/After visual comparison (split divider & hold-to-compare),
 * slow-motion playback speed control, and looping WebM/MP4/APNG video export.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ExportCompareModule = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class ExportCompareModule {
    constructor() {
      this.id = 'export-compare';
      this.name = 'Comparison & Video/APNG Exporter';
      this.version = '1.0.0';

      this._bus = null;
      this._state = null;
      this._config = null;
      this._unsubs = [];

      // Comparison state
      this.compareRatio = null; // null: off, 0.0 .. 1.0: split position
      this.isHoldingOriginal = false;

      // Playback speed rate: 0.25, 0.5, 1.0, 2.0
      this.playbackRate = 1.0;

      // Export state
      this.isExporting = false;
    }

    init(context) {
      this._bus = context.bus;
      this._state = context.state;
      this._config = context.config || {};

      this._unsubs.push(
        this._bus.on('compare:ratio', (payload) => this.setCompareRatio(payload ? payload.ratio : null)),
        this._bus.on('compare:hold', (payload) => this.setHoldOriginal(payload ? payload.holding : false)),
        this._bus.on('playback:rate', (payload) => this.setPlaybackRate(payload ? payload.rate : 1.0)),
        this._bus.on('export:start', (payload) => this.startExport(payload))
      );
    }

    /**
     * Set split-screen divider ratio (null turns off comparison)
     * @param {number|null} ratio 
     */
    setCompareRatio(ratio) {
      if (ratio === null || ratio === undefined || ratio < 0) {
        this.compareRatio = null;
      } else {
        this.compareRatio = Math.max(0.0, Math.min(1.0, Number(ratio)));
      }

      if (this._bus) {
        this._bus.emit('compare:changed', {
          active: this.compareRatio !== null,
          ratio: this.compareRatio
        });
      }
      return this.compareRatio;
    }

    /**
     * Set hold-to-compare mode (when held, displays 100% original static image)
     * @param {boolean} isHolding 
     */
    setHoldOriginal(isHolding) {
      this.isHoldingOriginal = !!isHolding;
      if (this._bus) {
        this._bus.emit('compare:hold-changed', {
          holding: this.isHoldingOriginal
        });
      }
      return this.isHoldingOriginal;
    }

    /**
     * Set slow-motion or fast playback rate (0.25x, 0.5x, 1.0x, 2.0x)
     * @param {number} rate 
     */
    setPlaybackRate(rate) {
      const allowed = [0.25, 0.5, 1.0, 2.0];
      const parsed = Number(rate);
      this.playbackRate = allowed.includes(parsed) ? parsed : 1.0;

      if (this._bus) {
        this._bus.emit('playback:rate-changed', {
          rate: this.playbackRate
        });
      }
      return this.playbackRate;
    }

    /**
     * Simulate or perform looping animation export (WebM / MP4 / APNG)
     * @param {object} options { format, fps, loopDurationSec, onFrameCapture }
     * @returns {Promise<object>} Export summary
     */
    async startExport(options = {}) {
      if (this.isExporting) {
        throw new Error('[ExportCompare] Export already in progress');
      }

      const format = options.format || 'webm';
      const fps = options.fps || 30;
      const loopSec = options.loopDurationSec || (this._state ? this._state.get('settings.loopPeriodSec') : 12) || 12;
      const totalFrames = Math.round(loopSec * fps);

      this.isExporting = true;
      if (this._bus) {
        this._bus.emit('export:progress', {
          status: 'started',
          format,
          fps,
          totalFrames,
          currentFrame: 0,
          percent: 0.0
        });
      }

      // Frame stepping loop
      for (let f = 1; f <= totalFrames; f++) {
        const timeSec = (f / fps) % loopSec;
        const percent = Math.round((f / totalFrames) * 1000) / 10;

        if (typeof options.onFrameCapture === 'function') {
          await options.onFrameCapture(f, timeSec);
        }

        if (this._bus && (f % Math.max(1, Math.floor(fps / 2)) === 0 || f === totalFrames)) {
          this._bus.emit('export:progress', {
            status: 'rendering',
            format,
            currentFrame: f,
            totalFrames,
            percent
          });
        }
      }

      this.isExporting = false;
      const result = {
        success: true,
        format,
        fps,
        loopDurationSec: loopSec,
        totalFrames,
        estimatedBytes: Math.round(totalFrames * (format === 'apng' ? 45000 : 15000))
      };

      if (this._bus) {
        this._bus.emit('export:done', result);
      }

      return result;
    }

    destroy() {
      for (const unsub of this._unsubs) {
        if (typeof unsub === 'function') unsub();
      }
      this._unsubs = [];
    }
  }

  return new ExportCompareModule();
});
