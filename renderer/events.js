/**
 * events.js - Pet Events Bus & Event Reactions Management (Tab "Pet & Khung Chat")
 * 
 * Strict Data Contract (STATUS.md Section 3.3 & 3.4):
 * PetEvents = [{ event, state, speech, priority, returnAfterMs }]
 * 7 Events: 'error', 'ai-thinking', 'user-typing', 'ai-done', 'pet-click', 'pet-drag', 'idle-long'
 * Priority rules:
 *   error (100) > ai-thinking (80) > user-typing (60) > ai-done (40) > pet-click (30) > pet-drag (25) > idle-long (10)
 * Higher priority interrupts lower priority. Same or lower priority does not overwrite an active higher priority event.
 * Timer: after returnAfterMs, automatically reverts to 'idle'. No two states run concurrently.
 * Live Simulation Bar: mounts into #previewPetSimBar with buttons "Thinking", "Đang gõ", "Xong", "Lỗi", "Rảnh lâu".
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const res = factory();
    root.StudioEvents = res.StudioEvents;
    root.PetEventsUI = res.PetEventsUI;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // 1. Studio Event Bus
  // ─────────────────────────────────────────────────────────────
  class StudioEventBus {
    constructor() {
      this.handlers = {};
    }

    on(event, fn) {
      if (!this.handlers[event]) this.handlers[event] = [];
      this.handlers[event].push(fn);
      return () => this.off(event, fn);
    }

    off(event, fn) {
      if (!this.handlers[event]) return;
      this.handlers[event] = this.handlers[event].filter(h => h !== fn);
    }

    emit(event, data) {
      if (!this.handlers[event]) return;
      const fns = this.handlers[event].slice();
      for (const fn of fns) {
        try {
          fn(data);
        } catch (e) {
          console.error('[StudioEvents Error on ' + event + ']:', e);
        }
      }
    }
  }

  const StudioEvents = new StudioEventBus();

  // ─────────────────────────────────────────────────────────────
  // 2. Constants & Priority Contract
  // ─────────────────────────────────────────────────────────────
  const EVENT_PRIORITIES = {
    'error': 100,
    'ai-thinking': 80,
    'user-typing': 60,
    'ai-done': 40,
    'pet-click': 30,
    'pet-drag': 25,
    'idle-long': 10
  };

  const VALID_STATES = ['idle', 'walk', 'sleep', 'click', 'drag'];

  const DEFAULT_PET_EVENTS = [
    {
      event: 'error',
      label: 'Lỗi hệ thống (error)',
      state: 'sleep',
      speech: 'Ối có lỗi rồi chủ nhân ơi! Mau sửa thôi 💥',
      priority: 100,
      returnAfterMs: 4000
    },
    {
      event: 'ai-thinking',
      label: 'AI đang nghĩ (ai-thinking)',
      state: 'walk',
      speech: 'Em đang suy nghĩ giải pháp đây... 💭',
      priority: 80,
      returnAfterMs: 3500
    },
    {
      event: 'user-typing',
      label: 'Người dùng gõ (user-typing)',
      state: 'walk',
      speech: 'Chủ nhân đang gõ gì hay thế ạ? ✨',
      priority: 60,
      returnAfterMs: 2500
    },
    {
      event: 'ai-done',
      label: 'AI hoàn thành (ai-done)',
      state: 'idle',
      speech: 'Đã hoàn thành xong nhiệm vụ rồi nha! 🎉',
      priority: 40,
      returnAfterMs: 3000
    },
    {
      event: 'pet-click',
      label: 'Bấm vào Pet (pet-click)',
      state: 'click',
      speech: 'Chủ nhân bấm em nè! Hôm nay code vui vẻ nhé! 🐾',
      priority: 30,
      returnAfterMs: 3500
    },
    {
      event: 'pet-drag',
      label: 'Kéo rê Pet (pet-drag)',
      state: 'drag',
      speech: 'Dời em đi đâu thế này 🛸',
      priority: 25,
      returnAfterMs: 1500
    },
    {
      event: 'idle-long',
      label: 'Rảnh rỗi / Chờ lâu (idle-long)',
      state: 'sleep',
      speech: 'Khò khò... Chủ nhân nghỉ ngơi tí nhé Zzz',
      priority: 10,
      returnAfterMs: 5000
    }
  ];

  // ─────────────────────────────────────────────────────────────
  // 3. PetEventsController
  // ─────────────────────────────────────────────────────────────
  class PetEventsController {
    constructor() {
      this.container = null;
      this.simBar = null;
      this.events = JSON.parse(JSON.stringify(DEFAULT_PET_EVENTS));
      this.currentActiveEvent = null;
      this.currentPetState = 'idle';
      this.returnTimer = null;
      this._busUnbinds = [];
      this.lastWarning = null;
    }

    init(mountEl, simBarEl) {
      if (mountEl) this.container = mountEl;
      if (!this.container && typeof document !== 'undefined') {
        this.container = document.getElementById('petEventsMount');
      }

      if (simBarEl) this.simBar = simBarEl;
      if (!this.simBar && typeof document !== 'undefined') {
        this.simBar = document.getElementById('previewPetSimBar');
      }

      // Sync from global appState if present
      if (typeof window !== 'undefined' && window.appState && Array.isArray(window.appState.petEvents)) {
        this._mergePersistedEvents(window.appState.petEvents);
      }

      this._bindEventBus();
      this.render();
      this.renderSimBar();
    }

    _mergePersistedEvents(persisted) {
      if (!Array.isArray(persisted)) return;
      for (const p of persisted) {
        const target = this.events.find(e => e.event === p.event);
        if (target) {
          if (p.state !== undefined) target.state = p.state;
          if (p.speech !== undefined) target.speech = p.speech;
          if (p.returnAfterMs !== undefined) target.returnAfterMs = Number(p.returnAfterMs);
          if (p.priority !== undefined) target.priority = Number(p.priority);
        }
      }
    }

    _persistEvents() {
      if (typeof window !== 'undefined' && window.appState) {
        window.appState.petEvents = JSON.parse(JSON.stringify(this.events));
      }
    }

    _bindEventBus() {
      // Unbind previous listeners if re-binding
      for (const unbind of this._busUnbinds) {
        try { unbind(); } catch {}
      }
      this._busUnbinds = [];

      for (const item of this.events) {
        const unbind = StudioEvents.on(item.event, (data) => {
          this.triggerEvent(item.event, data);
        });
        this._busUnbinds.push(unbind);
      }
    }

    /**
     * Trigger a pet event.
     * Higher priority interrupts lower priority.
     * Lower or equal priority does not overwrite higher priority.
     * @param {string} eventName
     * @param {object} [extraData]
     * @returns {boolean} true if triggered, false if blocked or not found
     */
    triggerEvent(eventName, extraData = {}) {
      const config = this.events.find(e => e.event === eventName);
      if (!config) {
        console.warn(`[PetEvents] Unknown event: "${eventName}"`);
        return false;
      }

      const newPri = EVENT_PRIORITIES[eventName] !== undefined ? EVENT_PRIORITIES[eventName] : (config.priority || 0);

      // Check priority interrupt rule
      if (this.currentActiveEvent) {
        const currentPri = EVENT_PRIORITIES[this.currentActiveEvent] !== undefined
          ? EVENT_PRIORITIES[this.currentActiveEvent]
          : 0;

        // "If an event with lower or equal priority fires while a higher one is active, it does not overwrite."
        if (newPri <= currentPri) {
          // Blocked by active higher or equal priority event
          return false;
        }
      }

      // Clear previous return timer
      if (this.returnTimer) {
        clearTimeout(this.returnTimer);
        this.returnTimer = null;
      }

      this.currentActiveEvent = eventName;

      // Validate state with gentle warning fallback to 'idle'
      let stateToPlay = config.state;
      if (!stateToPlay || !VALID_STATES.includes(stateToPlay)) {
        const warnMsg = `[PetEvents] Cảnh báo: Trạng thái "${stateToPlay}" không hợp lệ hoặc bị thiếu cho sự kiện "${eventName}". Tự động chuyển về "idle".`;
        console.warn(warnMsg);
        this.lastWarning = warnMsg;
        stateToPlay = 'idle';
      }

      this.currentPetState = stateToPlay;
      const speechText = (extraData && extraData.speech) !== undefined ? extraData.speech : (config.speech || '');

      // Apply to Pet Overlay (runtime / on screen)
      this.applyToOverlay(stateToPlay, speechText);

      // Apply to Pet Live Preview
      this.setPreviewPetState(stateToPlay);
      this.showPreviewSpeech(speechText);

      // Update UI active indicator
      this.updateActiveUI();

      // Return to 'idle' after returnAfterMs
      const returnTime = Math.max(10, Number(config.returnAfterMs) || 3000);
      this.returnTimer = setTimeout(() => {
        this.revertToIdle();
      }, returnTime);

      return true;
    }

    /**
     * Automatically revert to 'idle' state.
     */
    revertToIdle() {
      if (this.returnTimer) {
        clearTimeout(this.returnTimer);
        this.returnTimer = null;
      }

      this.currentActiveEvent = null;
      this.currentPetState = 'idle';

      // Revert overlay
      this.applyToOverlay('idle', '');

      // Revert preview pet
      this.setPreviewPetState('idle');
      this.removePreviewSpeech();

      // Update UI highlights
      this.updateActiveUI();
    }

    applyToOverlay(state, speech) {
      if (typeof window === 'undefined') return;

      const overlay = window.PetOverlayInstance || window._globalPetOverlay;
      if (!overlay) return;

      if (typeof overlay.setState === 'function') {
        overlay.setState(state);
      }

      if (speech) {
        if (typeof overlay.showSpeechBubble === 'function') {
          overlay.showSpeechBubble(speech);
        } else if (typeof overlay._showSpeechBubble === 'function') {
          overlay.speechLines = [speech];
          overlay._speechIdx = 0;
          overlay._showSpeechBubble();
        }
      } else {
        if (typeof overlay._removeBubble === 'function') {
          overlay._removeBubble();
        }
      }
    }

    setPreviewPetState(state) {
      if (typeof document === 'undefined') return;

      const badge = document.getElementById('previewMascotBadge');
      if (badge) {
        for (const s of VALID_STATES) {
          badge.classList.remove(`pet-state-${s}`);
        }
        badge.classList.add(`pet-state-${state}`);
        badge.dataset.petState = state;
      }

      // Also notify animation engine if active in sandbox
      if (typeof window !== 'undefined' && window.PetAnimationEngineInstance) {
        if (typeof window.PetAnimationEngineInstance.activateState === 'function') {
          window.PetAnimationEngineInstance.activateState(state, true);
        }
      }
    }

    showPreviewSpeech(text) {
      if (typeof document === 'undefined' || !text) return;

      const composer = document.getElementById('previewComposer') || document.querySelector('.preview-composer');
      if (!composer) return;

      let bubble = document.getElementById('previewSpeechBubble');
      if (!bubble) {
        bubble = document.createElement('div');
        bubble.id = 'previewSpeechBubble';
        bubble.className = 'preview-speech-bubble';
        composer.appendChild(bubble);
      }

      bubble.textContent = text;
      bubble.style.display = 'block';
    }

    removePreviewSpeech() {
      if (typeof document === 'undefined') return;
      const bubble = document.getElementById('previewSpeechBubble');
      if (bubble) {
        bubble.style.display = 'none';
        if (bubble.parentNode) {
          bubble.parentNode.removeChild(bubble);
        }
      }
    }

    updateActiveUI() {
      if (typeof document === 'undefined') return;

      // Update table row highlights
      const rows = document.querySelectorAll('.pet-event-row');
      rows.forEach(row => {
        const ev = row.dataset.event;
        if (ev === this.currentActiveEvent) {
          row.classList.add('is-active');
        } else {
          row.classList.remove('is-active');
        }
      });

      // Update sim bar button highlights
      const simBtns = document.querySelectorAll('.pet-sim-btn');
      simBtns.forEach(btn => {
        const ev = btn.dataset.event;
        if (ev === this.currentActiveEvent) {
          btn.classList.add('is-active');
        } else {
          btn.classList.remove('is-active');
        }
      });

      // Update status banner if present
      const statusEl = document.getElementById('petEventsActiveStatus');
      if (statusEl) {
        if (this.currentActiveEvent) {
          statusEl.textContent = `Đang kích hoạt: ${this.currentActiveEvent} (State: ${this.currentPetState}) [Ưu tiên: ${EVENT_PRIORITIES[this.currentActiveEvent] || 0}]`;
          statusEl.className = 'pet-events-status is-active';
        } else {
          statusEl.textContent = 'Trạng thái hiện tại: idle (Sẵn sàng)';
          statusEl.className = 'pet-events-status is-idle';
        }
      }
    }

    getCurrentState() {
      return this.currentPetState;
    }

    getActiveEvent() {
      return this.currentActiveEvent;
    }

    getEvents() {
      return JSON.parse(JSON.stringify(this.events));
    }

    resetDefaults() {
      this.events = JSON.parse(JSON.stringify(DEFAULT_PET_EVENTS));
      this._persistEvents();
      this.render();
      this.renderSimBar();
    }

    // ─────────────────────────────────────────────────────────────
    // 4. UI Rendering (Table & Sim Bar)
    // ─────────────────────────────────────────────────────────────
    render() {
      if (!this.container) return;

      this.container.innerHTML = `
        <div class="pet-events-section">
          <div class="pet-events-header">
            <div class="pet-events-title-wrap">
              <span class="pet-events-icon">⚡</span>
              <div>
                <h4 class="pet-events-title">BẢNG PHẢN ỨNG SỰ KIỆN CHO PET</h4>
                <p class="pet-events-subtitle">Cấu hình phản ứng, hoạt ảnh và bong bóng thoại khi Antigravity IDE phát sinh sự kiện.</p>
              </div>
            </div>
            <button type="button" class="pet-events-reset-btn" id="btnResetPetEvents" title="Khôi phục cài đặt gốc">
              🔄 Mặc định
            </button>
          </div>

          <div class="pet-priority-legend">
            <span class="pet-pri-title">Độ ưu tiên ngắt:</span>
            <span class="pri-badge pri-100">Lỗi (100)</span>
            <span class="pri-arrow">></span>
            <span class="pri-badge pri-80">Nghĩ (80)</span>
            <span class="pri-arrow">></span>
            <span class="pri-badge pri-60">Gõ (60)</span>
            <span class="pri-arrow">></span>
            <span class="pri-badge pri-40">Xong (40)</span>
            <span class="pri-arrow">></span>
            <span class="pri-badge pri-30">Click (30)</span>
            <span class="pri-arrow">></span>
            <span class="pri-badge pri-25">Drag (25)</span>
            <span class="pri-arrow">></span>
            <span class="pri-badge pri-10">Rảnh (10)</span>
          </div>

          <div id="petEventsActiveStatus" class="pet-events-status is-idle">
            Trạng thái hiện tại: idle (Sẵn sàng)
          </div>

          <div class="pet-events-table-wrap">
            <table class="pet-events-table">
              <thead>
                <tr>
                  <th style="width: 22%;">Sự kiện</th>
                  <th style="width: 18%;">Hoạt ảnh (State)</th>
                  <th style="width: 34%;">Câu thoại bong bóng</th>
                  <th style="width: 14%;">Hồi idle (ms)</th>
                  <th style="width: 12%; text-align: center;">Thử</th>
                </tr>
              </thead>
              <tbody id="petEventsTableBody">
                ${this.events.map(item => this._renderRow(item)).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      this._attachTableEvents();
    }

    _renderRow(item) {
      const pri = EVENT_PRIORITIES[item.event] || item.priority || 0;
      return `
        <tr class="pet-event-row" data-event="${item.event}">
          <td class="pet-col-event">
            <div class="pet-event-name-wrap">
              <span class="pri-pill pri-${pri}">${pri}</span>
              <span class="pet-event-label" title="${item.event}">${item.label || item.event}</span>
            </div>
          </td>
          <td class="pet-col-state">
            <select class="pet-event-select" data-event="${item.event}">
              ${VALID_STATES.map(s => `
                <option value="${s}" ${item.state === s ? 'selected' : ''}>${s}</option>
              `).join('')}
            </select>
          </td>
          <td class="pet-col-speech">
            <input type="text" class="pet-event-speech-input" data-event="${item.event}" value="${this._escapeHtml(item.speech || '')}" placeholder="Nhập câu thoại..." />
          </td>
          <td class="pet-col-time">
            <div class="pet-num-unit-wrap">
              <input type="number" class="pet-event-return-input" data-event="${item.event}" value="${item.returnAfterMs || 3000}" min="200" step="500" />
              <span class="pet-unit-label">ms</span>
            </div>
          </td>
          <td class="pet-col-action" style="text-align: center;">
            <button type="button" class="pet-event-test-btn" data-event="${item.event}" title="Kích hoạt sự kiện ${item.event}">
              ▶ Thử
            </button>
          </td>
        </tr>
      `;
    }

    _escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    _attachTableEvents() {
      if (!this.container) return;

      // Reset button
      const resetBtn = this.container.querySelector('#btnResetPetEvents');
      if (resetBtn) {
        resetBtn.onclick = () => this.resetDefaults();
      }

      // State select changes
      const selects = this.container.querySelectorAll('.pet-event-select');
      selects.forEach(sel => {
        sel.onchange = (e) => {
          const evName = e.target.dataset.event;
          const target = this.events.find(ev => ev.event === evName);
          if (target) {
            target.state = e.target.value;
            this._persistEvents();
          }
        };
      });

      // Speech input changes
      const speechInputs = this.container.querySelectorAll('.pet-event-speech-input');
      speechInputs.forEach(inp => {
        inp.oninput = (e) => {
          const evName = e.target.dataset.event;
          const target = this.events.find(ev => ev.event === evName);
          if (target) {
            target.speech = e.target.value;
            this._persistEvents();
          }
        };
      });

      // ReturnAfterMs changes
      const returnInputs = this.container.querySelectorAll('.pet-event-return-input');
      returnInputs.forEach(inp => {
        inp.onchange = (e) => {
          const evName = e.target.dataset.event;
          const target = this.events.find(ev => ev.event === evName);
          if (target) {
            target.returnAfterMs = Math.max(200, Number(e.target.value) || 3000);
            this._persistEvents();
          }
        };
      });

      // Test buttons
      const testBtns = this.container.querySelectorAll('.pet-event-test-btn');
      testBtns.forEach(btn => {
        btn.onclick = (e) => {
          const evName = e.currentTarget.dataset.event;
          StudioEvents.emit(evName);
        };
      });
    }

    renderSimBar() {
      if (!this.simBar) {
        if (typeof document !== 'undefined') {
          this.simBar = document.getElementById('previewPetSimBar');
        }
      }
      if (!this.simBar) return;

      // 5 required buttons: "Thinking", "Đang gõ", "Xong", "Lỗi", "Rảnh lâu"
      this.simBar.innerHTML = `
        <div class="pet-sim-bar">
          <span class="pet-sim-label" title="Mô phỏng sự kiện Pet trong Live Preview">
            <span class="pet-sim-icon">🐾</span> Mô phỏng:
          </span>
          <button type="button" class="pet-sim-btn btn-sim-thinking" data-event="ai-thinking" title="Ưu tiên 80 - AI đang suy nghĩ">
            Thinking
          </button>
          <button type="button" class="pet-sim-btn btn-sim-typing" data-event="user-typing" title="Ưu tiên 60 - Người dùng đang gõ">
            Đang gõ
          </button>
          <button type="button" class="pet-sim-btn btn-sim-done" data-event="ai-done" title="Ưu tiên 40 - AI đã hoàn thành">
            Xong
          </button>
          <button type="button" class="pet-sim-btn btn-sim-error" data-event="error" title="Ưu tiên 100 - Báo lỗi hệ thống">
            Lỗi
          </button>
          <button type="button" class="pet-sim-btn btn-sim-idle" data-event="idle-long" title="Ưu tiên 10 - Chờ lâu / Nghỉ ngơi">
            Rảnh lâu
          </button>
        </div>
      `;

      const btns = this.simBar.querySelectorAll('.pet-sim-btn');
      btns.forEach(btn => {
        btn.onclick = (e) => {
          const ev = e.currentTarget.dataset.event;
          StudioEvents.emit(ev);
        };
      });
    }
  }

  const PetEventsUI = new PetEventsController();

  // Auto-init on DOMContentLoaded if running in browser
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        PetEventsUI.init();
      });
    } else {
      setTimeout(() => {
        if (!PetEventsUI.container && document.getElementById('petEventsMount')) {
          PetEventsUI.init();
        }
      }, 0);
    }
  }

  return {
    StudioEvents,
    PetEventsUI,
    EVENT_PRIORITIES,
    DEFAULT_PET_EVENTS
  };
});
