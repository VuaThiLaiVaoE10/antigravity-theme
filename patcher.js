/**
 * Antigravity Theme Studio - Core Patcher Engine
 * Safely backs up and injects Theme Studio Hook into Antigravity app.asar.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const asar = require('@electron/asar');
const PetOverlay = require('./renderer/petOverlay');

const LOCALAPPDATA = process.env.LOCALAPPDATA || 'C:\\Users\\Admin\\AppData\\Local';
const ANTIGRAVITY_DIR = path.join(LOCALAPPDATA, 'Programs', 'antigravity');
const ANTIGRAVITY_EXE = path.join(ANTIGRAVITY_DIR, 'Antigravity.exe');
const ASAR_PATH = path.join(ANTIGRAVITY_DIR, 'resources', 'app.asar');
const BACKUP_PATH = ASAR_PATH + '.backup';
const CONFIG_DIR = path.join(process.env.USERPROFILE || 'C:\\Users\\Admin', '.gemini', 'antigravity', 'theme-studio');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

const HOOK_START = '// === ANTIGRAVITY THEME STUDIO HOOK ===';
const HOOK_END = '// === END ANTIGRAVITY THEME STUDIO HOOK ===';

function generateHookCode() {
  return `
${HOOK_START}
(function() {
  try {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.env.USERPROFILE || 'C:\\\\Users\\\\Admin', '.gemini', 'antigravity', 'theme-studio', 'config.json');

    function toRgba(hex, alpha) {
      if (!hex || typeof hex !== 'string') return 'rgba(125, 207, 255, ' + alpha + ')';
      if (hex.startsWith('rgba')) return hex;
      if (hex.startsWith('rgb')) return hex.replace('rgb', 'rgba').replace(')', ', ' + alpha + ')');
      const clean = hex.replace('#', '');
      if (clean.length === 3) {
        const r = parseInt(clean[0] + clean[0], 16);
        const g = parseInt(clean[1] + clean[1], 16);
        const b = parseInt(clean[2] + clean[2], 16);
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
      }
      if (clean.length >= 6) {
        const r = parseInt(clean.substring(0, 2), 16);
        const g = parseInt(clean.substring(2, 4), 16);
        const b = parseInt(clean.substring(4, 6), 16);
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
      }
      return 'rgba(125, 207, 255, ' + alpha + ')';
    }

    function buildCss(cfg) {
      const mode = cfg.mode || 'dark';
      const c = (cfg.palette && cfg.palette[mode]?.colors) || cfg.colors || {};
      const g = (cfg.palette && cfg.palette[mode]?.gradients) || cfg.gradients || {};
      const glass = cfg.glass || {};
      const blur = glass.blur ?? 16;
      const sidebarOpacity = (glass.sidebarOpacity ?? 75) / 100;
      const cardOpacity = (glass.cardOpacity ?? 85) / 100;

      // Hallmark Anti-Slop Parameters
      const compRadius = typeof cfg.composerRadius === 'number' ? cfg.composerRadius : (cfg.composerRadius ?? 18);
      const compInnerRadius = Math.max(compRadius - 2, 4);

      // Hallmark Chat Bubble Tokens (>= 4.5:1 contrast guaranteed)
      const userBubble1 = g.userBubble1 || (mode === 'light' ? '#CFEDEB' : '#15524D');
      const userBubble2 = g.userBubble2 || (mode === 'light' ? '#B8E0DE' : '#082430');
      const userBubbleBorder = g.userBubbleBorder || (mode === 'light' ? 'rgba(30, 124, 112, 0.4)' : 'rgba(115, 218, 202, 0.4)');
      const userBubbleTextColor = mode === 'light' ? '#0F172A' : '#F8FAFC';

      const petGlow = cfg.petGlowColor || (cfg.palette && cfg.palette[mode]?.colors?.accentPrimary) || '#7DCFFF';
      const petGlowRad = cfg.petGlowRadius !== undefined ? (parseFloat(cfg.petGlowRadius) || 12) : 12;
      const petPedCol = cfg.petPedestalColor || petGlow;
      const petBwRaw = cfg.petBorderWidth !== undefined ? cfg.petBorderWidth : 2;
      const petBw = typeof petBwRaw === 'number' ? petBwRaw + 'px' : String(petBwRaw);
      const composerGrad = cfg.composerGradient || 'linear-gradient(90deg, #E6FF80 0%, #38EF7D 35%, #11998E 70%, #FFE066 100%)';

      return [
        ':root {',
        '  --background: transparent !important;',
        '  --body-background: transparent !important;',
        '  --color-background: transparent !important;',
        '  --shell: transparent !important;',
        '  --shell-canvas: transparent !important;',
        '  --sidebar: rgba(8, 24, 38, ' + sidebarOpacity + ') !important;',
        '  --color-sidebar: rgba(8, 24, 38, ' + sidebarOpacity + ') !important;',
        '  --card: rgba(15, 25, 38, ' + cardOpacity + ') !important;',
        '  --scrim: ' + (c.scrim || '#061019') + ' !important;',
        '  --bg-selection: ' + (c.selection || '#15415E') + ' !important;',
        '  --color-rule: rgba(255, 255, 255, 0.08) !important;',
        '  --color-rule-2: rgba(255, 255, 255, 0.05) !important;',
        '  --ag-user-bubble-1: ' + userBubble1 + ' !important;',
        '  --ag-user-bubble-2: ' + userBubble2 + ' !important;',
        '  --ag-user-bubble-border: ' + userBubbleBorder + ' !important;',
        '}',
        'body, html, .agy-shell, .agy-inset-shell {',
        '  background: transparent !important;',
        '  background-color: transparent !important;',
        '}',
        '.bg-background, .bg-\\\\[var\\\\(--shell-canvas\\\\)\\\\] {',
        '  background-color: transparent !important;',
        '}',
        '/* 1. Header / Topbar Area (Hairline 1px bottom border) */',
        '.shrink-0:has(.bg-sidebar), .flex.items-center.gap-1.px-2.h-full.bg-sidebar.w-full, .agy-topbar, .preview-titlebar {',
        '  background-color: rgba(8, 24, 38, ' + Math.min(sidebarOpacity + 0.1, 0.9) + ') !important;',
        '  backdrop-filter: blur(' + blur + 'px) !important;',
        '  -webkit-backdrop-filter: blur(' + blur + 'px) !important;',
        '  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;',
        '}',
        '/* 2. Main Sidebar Glass Container & Panels (Hairline 1px right border) */',
        '.h-full.w-full.flex.flex-col.pb-2.bg-sidebar, [data-testid="sidebar-pane"], .agy-sidebar, .preview-sidebar, .sidebar-panel {',
        '  background-color: rgba(8, 24, 38, ' + sidebarOpacity + ') !important;',
        '  backdrop-filter: blur(' + blur + 'px) !important;',
        '  -webkit-backdrop-filter: blur(' + blur + 'px) !important;',
        '  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;',
        '  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.25) !important;',
        '}',
        '/* 3. Eliminate Opaque Nested Patches Inside Sidebar */',
        '.h-full.w-full.flex.flex-col.pb-2.bg-sidebar .bg-sidebar,',
        '.h-full.w-full.flex.flex-col.pb-2.bg-sidebar div.bg-sidebar,',
        '.h-full.w-full.flex.flex-col.pb-2.bg-sidebar button.bg-sidebar {',
        '  background-color: transparent !important;',
        '  background: transparent !important;',
        '}',
        '/* 4. Section Headers */',
        '.group\\\\/section-header {',
        '  background-color: transparent !important;',
        '  color: rgba(255, 255, 255, 0.7) !important;',
        '  font-weight: 600 !important;',
        '  letter-spacing: 0.02em !important;',
        '}',
        '/* 5. Folder / Item Buttons */',
        '.group\\\\/headerbtn {',
        '  background-color: transparent !important;',
        '  border-radius: 6px !important;',
        '  transition: background-color 0.15s ease !important;',
        '}',
        '.group\\\\/headerbtn:hover {',
        '  background-color: rgba(255, 255, 255, 0.06) !important;',
        '}',
        '/* 6. Active Item Highlight with Hairline Accent */',
        '.bg-sidebar-secondary {',
        '  background-color: rgba(125, 207, 255, 0.12) !important;',
        '  border-radius: 8px !important;',
        '  border: 1px solid rgba(255, 255, 255, 0.08) !important;',
        '}',
        '/* 7. Hover Rows */',
        '.agy-sidebar-row:hover {',
        '  background-color: rgba(255, 255, 255, 0.06) !important;',
        '  border-radius: 6px !important;',
        '}',
        '/* 8. New Conversation / Action Buttons (Hairline Border) */',
        '.h-full.w-full.flex.flex-col.pb-2.bg-sidebar .border-border.bg-sidebar-muted {',
        '  background-color: rgba(125, 207, 255, 0.08) !important;',
        '  border: 1px solid rgba(255, 255, 255, 0.08) !important;',
        '  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;',
        '}',
        '.h-full.w-full.flex.flex-col.pb-2.bg-sidebar .border-border.bg-sidebar-muted:hover {',
        '  background-color: rgba(125, 207, 255, 0.16) !important;',
        '}',
        '/* 9. Hallmark Hairline Split Sashes / Divider Rules */',
        '[data-split-sash="true"] { background-color: transparent !important; }',
        '[data-testid="sidebar-sash"] .bg-border, .split-sash, .split-view-container .sash, .monaco-sash {',
        '  background-color: rgba(255, 255, 255, 0.08) !important;',
        '  border-left: 1px solid rgba(255, 255, 255, 0.08) !important;',
        '}',
        '/* 10. Hallmark Anti-Slop Hairline Cards & Panels */',
        '.agy-sheet, .agy-shell > div, .agy-inset-shell > div { background-color: transparent !important; }',
        '.agy-card, .bg-card, [data-testid="card"], .rounded-lg.border.bg-card, .rounded-xl.border.bg-card, .border.bg-card, .card, .status-card, .pet-model-card, .pet-border-box, .pet-adjust-box, .motion-card, .agy-panel-card {',
        '  background-color: rgba(15, 25, 38, ' + cardOpacity + ') !important;',
        '  border: 1px solid rgba(255, 255, 255, 0.08) !important;',
        '  backdrop-filter: blur(' + blur + 'px) !important;',
        '  -webkit-backdrop-filter: blur(' + blur + 'px) !important;',
        '  border-radius: 10px !important;',
        '  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;',
        '}',
        '/* 11. Hallmark Refined Surface Composer Outer Gradient Ring */',
        '.surface-composer {',
        '  position: relative !important;',
        '  overflow: visible !important;',
        '  background: ' + composerGrad + ' !important;',
        '  padding: 1.5px !important;',
        '  border-radius: ' + compRadius + 'px !important;',
        '  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35), 0 0 ' + Math.min(cfg.composerGlow ?? 14, 16) + 'px rgba(125, 207, 255, 0.25) !important;',
        '  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;',
        '}',
        '/* 12. Hallmark Concentric Inner Card with 1px Hairline Inner Boundary */',
        '.surface-composer-card {',
        '  background: rgba(12, 24, 34, ' + Math.max(cardOpacity, 0.88) + ') !important;',
        '  backdrop-filter: blur(' + blur + 'px) !important;',
        '  -webkit-backdrop-filter: blur(' + blur + 'px) !important;',
        '  border-radius: ' + compInnerRadius + 'px !important;',
        '  border: 1px solid rgba(255, 255, 255, 0.08) !important;',
        '  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;',
        '}',
        '/* 13. Hallmark Anti-Slop Chat Bubbles */',
        '/* User Bubble: clean hairline border and readable contrast (>= 4.5:1) */',
        '.sample-bubble.user, #previewUserBubble, [data-message-author="user"], [data-role="user"], .chat-user-message, .agy-user-message, .user-message, .chat-bubble-user {',
        '  background: linear-gradient(135deg, ' + userBubble1 + ', ' + userBubble2 + ') !important;',
        '  border: 1px solid ' + userBubbleBorder + ' !important;',
        '  color: ' + userBubbleTextColor + ' !important;',
        '  border-radius: 12px !important;',
        '  padding: 8px 14px !important;',
        '  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;',
        '}',
        '.sample-bubble.user *, #previewUserBubble *, [data-message-author="user"] *, [data-role="user"] *, .chat-user-message *, .agy-user-message * {',
        '  color: ' + userBubbleTextColor + ' !important;',
        '}',
        '/* Assistant Message: clean transparent background */',
        '.sample-bubble.agent, #previewAgentBubble, [data-message-author="assistant"], [data-role="assistant"], [data-message-author="model"], [data-role="model"], .chat-assistant-message, .agy-assistant-message, .agent-message, .assistant-message, .antigravity-chat-assistant {',
        '  background: transparent !important;',
        '  background-color: transparent !important;',
        '  border: none !important;',
        '  box-shadow: none !important;',
        '  color: ' + (mode === 'light' ? '#1E293B' : 'rgba(240, 246, 252, 0.94)') + ' !important;',
        '}',
        '/* Assistant Message Code Blocks */',
        '.sample-bubble.agent pre, [data-message-author="assistant"] pre, [data-role="assistant"] pre, .agy-assistant-message pre, .agy-code-block {',
        '  background: rgba(10, 20, 30, 0.65) !important;',
        '  border: 1px solid rgba(255, 255, 255, 0.08) !important;',
        '  border-radius: 8px !important;',
        '  backdrop-filter: blur(8px) !important;',
        '  -webkit-backdrop-filter: blur(8px) !important;',
        '}',
        '/* Thought Accordion Disclosure Pill */',
        '.thought-disclosure, .thinking-accordion, details[data-testid="thinking-accordion"] {',
        '  background: rgba(255, 255, 255, 0.04) !important;',
        '  border: 1px solid rgba(255, 255, 255, 0.08) !important;',
        '  border-radius: 16px !important;',
        '  color: rgba(255, 255, 255, 0.7) !important;',
        '}',
        '@keyframes agBreathing { 0% { transform: scale(1); } 50% { transform: scale(1.06) translate(-1%, -1%); } 100% { transform: scale(1); } }',
        '.wallpaper-breathing { animation: agBreathing 14s ease-in-out infinite !important; }',
        '/* 14. Interactive Pet Mascot Entity */',
        '#ag-interactive-pet {',
        '  position: fixed;',
        '  z-index: 999999;',
        '  cursor: pointer;',
        '  user-select: none;',
        '  transition: transform 0.2s ease, filter 0.2s ease;',
        '  filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: center;',
        '}',
        '#ag-interactive-pet:hover { transform: scale(1.1) translateY(-2px); }',
        '#ag-interactive-pet:active { transform: scale(0.95); }',
        '.ag-pet-pedestal {',
        '  position: absolute;',
        '  bottom: -4px;',
        '  left: 50%;',
        '  transform: translateX(-50%);',
        '  width: 90%;',
        '  height: 14px;',
        '  border-radius: 50%;',
        '  pointer-events: none;',
        '  z-index: 1;',
        '  background: radial-gradient(ellipse at center, ' + petPedCol + ' 0%, ' + toRgba(petPedCol, 0.45) + ' 45%, transparent 75%);',
        '  box-shadow: 0 0 10px ' + toRgba(petPedCol, 0.4) + ';',
        '  animation: agPedestalPulse 2.8s ease-in-out infinite alternate;',
        '}',
        '@keyframes agPedestalPulse {',
        '  0% { transform: translateX(-50%) scale(0.88); opacity: 0.55; }',
        '  100% { transform: translateX(-50%) scale(1.12); opacity: 0.95; }',
        '}',
        '.ag-pet-aura-frame {',
        '  position: relative;',
        '  width: 100%;',
        '  height: 100%;',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: center;',
        '  box-sizing: border-box;',
        '  z-index: 2;',
        '  transition: all 0.3s ease;',
        '}',
        '.ag-pet-aura-frame.border-theme-gradient {',
        '  border-radius: 50%;',
        '  border: ' + petBw + ' solid transparent;',
        '  background: linear-gradient(rgba(12, 24, 38, 0.45), rgba(12, 24, 38, 0.45)) padding-box, ' + composerGrad + ' border-box;',
        '  box-shadow: 0 0 ' + petGlowRad + 'px ' + petGlow + ';',
        '  filter: drop-shadow(0 0 6px ' + petGlow + ');',
        '  overflow: hidden;',
        '}',
        '.ag-pet-aura-frame.border-neon-glow {',
        '  border-radius: 50%;',
        '  border: ' + petBw + ' solid ' + petGlow + ';',
        '  box-shadow: 0 0 ' + petGlowRad + 'px ' + petGlow + ', inset 0 0 6px ' + toRgba(petGlow, 0.5) + ';',
        '  filter: drop-shadow(0 0 ' + petGlowRad + 'px ' + petGlow + ');',
        '  background: ' + toRgba(petGlow, 0.12) + ';',
        '  overflow: hidden;',
        '}',
        '.ag-pet-aura-frame.border-holo-pedestal {',
        '  border-radius: 50%;',
        '  border: ' + petBw + ' solid ' + petGlow + ';',
        '  box-shadow: 0 0 ' + petGlowRad + 'px ' + petGlow + ', 0 0 16px rgba(0, 229, 255, 0.4);',
        '  filter: drop-shadow(0 0 ' + petGlowRad + 'px ' + petGlow + ');',
        '  background: radial-gradient(circle, ' + toRgba(petGlow, 0.22) + ' 0%, rgba(12, 24, 38, 0.35) 100%);',
        '  overflow: hidden;',
        '}',
        '.ag-pet-aura-frame.border-glass-bubble {',
        '  border-radius: 50%;',
        '  border: ' + petBw + ' solid rgba(255, 255, 255, 0.45);',
        '  background: rgba(255, 255, 255, 0.10);',
        '  backdrop-filter: blur(6px);',
        '  -webkit-backdrop-filter: blur(6px);',
        '  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.6), 0 4px 14px rgba(0, 0, 0, 0.35), 0 0 ' + petGlowRad + 'px ' + petGlow + ';',
        '  filter: drop-shadow(0 0 6px ' + petGlow + ');',
        '  overflow: hidden;',
        '}',
        '.ag-pet-aura-frame.border-none {',
        '  border: none;',
        '  background: transparent;',
        '  box-shadow: none;',
        '  filter: none;',
        '  overflow: visible;',
        '}',
        '.ag-pet-sprite {',
        '  width: 100%;',
        '  height: 100%;',
        '  background-size: contain;',
        '  background-repeat: no-repeat;',
        '  background-position: center center;',
        '  pointer-events: none;',
        '  transition: transform 0.2s ease;',
        '}',
        '.ag-pet-bubble {',
        '  position: absolute;',
        '  bottom: 100%;',
        '  right: 0;',
        '  margin-bottom: 8px;',
        '  background: rgba(12, 24, 38, 0.95);',
        '  border: 1px solid ' + petGlow + ';',
        '  color: #fff;',
        '  border-radius: 10px;',
        '  padding: 6px 12px;',
        '  font-size: 11px;',
        '  white-space: nowrap;',
        '  pointer-events: none;',
        '  box-shadow: 0 4px 14px rgba(0,0,0,0.5);',
        '  animation: agPop 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28);',
        '  z-index: 9999999;',
        '}',
        '.ag-pet-bubble::after {',
        '  content: "";',
        '  position: absolute;',
        '  top: 100%;',
        '  right: 18px;',
        '  border-width: 5px;',
        '  border-style: solid;',
        '  border-color: ' + petGlow + ' transparent transparent transparent;',
        '}',
        '@keyframes agPop { 0% { opacity: 0; transform: scale(0.6); } 100% { opacity: 1; transform: scale(1); } }',
        '.anim-bob { animation: agPetBob 2.5s ease-in-out infinite alternate !important; }',
        '.anim-pulse { animation: agPetPulse 1.8s ease-in-out infinite !important; }',
        '.anim-sway { animation: agPetSway 2s ease-in-out infinite alternate !important; }',
        '.anim-glow { animation: agPetGlow 2s ease-in-out infinite alternate !important; }',
        '.anim-sleep { animation: agPetSleep 3s ease-in-out infinite alternate !important; }',
        '@keyframes agPetBob { 0% { transform: translateY(0); } 100% { transform: translateY(-8px); } }',
        '@keyframes agPetPulse { 0% { transform: scale(1); } 50% { transform: scale(1.14); } 100% { transform: scale(1); } }',
        '@keyframes agPetSway { 0% { transform: rotate(-8deg); } 100% { transform: rotate(8deg); } }',
        '@keyframes agPetGlow { 0% { filter: drop-shadow(0 0 5px #7DCFFF); } 100% { filter: drop-shadow(0 0 20px #BB9AF7); } }',
        '@keyframes agPetSleep { 0% { transform: translateY(0) scale(0.98); opacity: 0.85; } 100% { transform: translateY(-4px) scale(1); opacity: 1; } }'
      ].join('\\n');
    }

    function applyCustomTheme() {
      try {
        if (!fs.existsSync(configPath)) return;
        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!cfg.enabled) return;

        const doc = globalThis.document;
        if (!doc) return;

        // 1. Wallpaper Layer
        let bg = doc.getElementById('ag-theme-bg');
        if (!bg) {
          bg = doc.createElement('div');
          bg.id = 'ag-theme-bg';
          doc.documentElement.prepend(bg);
        }

        const fit = cfg.wallpaperFit || 'cover';
        const bgSize = fit === 'contain' ? 'contain' : fit === 'stretch' ? '100% 100%' : fit === 'center' ? 'auto' : 'cover';
        bg.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none;background-position:center;background-repeat:no-repeat;transition:background-image 0.4s ease, opacity 0.3s ease;background-size:' + bgSize + ';';

        if (cfg.wallpaperUrl) {
          bg.style.backgroundImage = 'url(' + JSON.stringify(cfg.wallpaperUrl) + ')';
          bg.style.opacity = String((cfg.glass?.wallpaperOpacity ?? 95) / 100);
        } else {
          bg.style.backgroundImage = 'none';
        }

        // 2. CSS Stylesheet
        let style = doc.getElementById('ag-theme-css');
        if (!style) {
          style = doc.createElement('style');
          style.id = 'ag-theme-css';
          (doc.head || doc.documentElement).appendChild(style);
        }
        style.textContent = buildCss(cfg);

        // 3. Pet Entity
        let pet = doc.getElementById('ag-interactive-pet');
        if (!pet) {
          pet = doc.createElement('div');
          pet.id = 'ag-interactive-pet';
          doc.body.appendChild(pet);
        }
        if (cfg.mascotUrl) {
          pet.style.display = 'block';
          pet.style.backgroundImage = 'none';

          // Inner hierarchy: .ag-pet-pedestal, .ag-pet-aura-frame, .ag-pet-sprite
          let pedestal = pet.querySelector('.ag-pet-pedestal');
          if (!pedestal) {
            pedestal = doc.createElement('div');
            pedestal.className = 'ag-pet-pedestal';
            pet.appendChild(pedestal);
          }

          let frame = pet.querySelector('.ag-pet-aura-frame');
          if (!frame) {
            frame = doc.createElement('div');
            frame.className = 'ag-pet-aura-frame';
            pet.appendChild(frame);
          }

          let sprite = frame.querySelector('.ag-pet-sprite');
          if (!sprite) {
            sprite = doc.createElement('div');
            sprite.className = 'ag-pet-sprite';
            frame.appendChild(sprite);
          }

          const sz = cfg.mascotSize || 56;
          pet.style.width = sz + 'px';
          pet.style.height = sz + 'px';
          const pos = cfg.mascotPos || 'composer-top-right';
          const offX = cfg.petOffsetX || 0;
          const offY = cfg.petOffsetY || 0;
          const flip = cfg.petFlip ? -1 : 1;

          // Sprite setup
          sprite.style.width = '100%';
          sprite.style.height = '100%';
          sprite.style.backgroundImage = 'url(' + JSON.stringify(cfg.mascotUrl) + ')';
          sprite.style.backgroundSize = 'contain';
          sprite.style.backgroundRepeat = 'no-repeat';
          sprite.style.backgroundPosition = 'center center';
          sprite.style.transform = flip === -1 ? 'scaleX(-1)' : 'none';

          // Pedestal setup
          const isPed = Boolean(cfg.petPedestal);
          const glowColor = cfg.petGlowColor || '#7DCFFF';
          const glowRadNum = cfg.petGlowRadius !== undefined ? (parseFloat(cfg.petGlowRadius) || 12) : 12;
          const glowRadius = glowRadNum + 'px';
          const pedCol = cfg.petPedestalColor || glowColor;
          if (isPed) {
            pedestal.style.display = 'block';
            pedestal.style.background = 'radial-gradient(ellipse at center, ' + pedCol + ' 0%, ' + toRgba(pedCol, 0.45) + ' 45%, transparent 75%)';
            pedestal.style.boxShadow = '0 0 10px ' + toRgba(pedCol, 0.4);
            pedestal.style.animation = 'agPedestalPulse 2.8s ease-in-out infinite alternate';
          } else {
            pedestal.style.display = 'none';
            pedestal.style.animation = 'none';
          }

          // Aura frame setup
          const borderStyle = cfg.petBorderStyle || 'none';
          const bwRaw = cfg.petBorderWidth !== undefined ? cfg.petBorderWidth : 2;
          const bw = typeof bwRaw === 'number' ? bwRaw + 'px' : String(bwRaw);
          const compGrad = cfg.composerGradient || 'linear-gradient(90deg, #E6FF80 0%, #38EF7D 35%, #11998E 70%, #FFE066 100%)';

          frame.className = 'ag-pet-aura-frame border-' + borderStyle;
          frame.style.border = 'none';
          frame.style.background = 'transparent';
          frame.style.boxShadow = 'none';
          frame.style.filter = 'none';
          frame.style.backdropFilter = 'none';
          frame.style.webkitBackdropFilter = 'none';

          if (borderStyle === 'theme-gradient') {
            frame.style.borderRadius = '0';
            frame.style.border = 'none';
            frame.style.background = 'transparent';
            frame.style.boxShadow = 'none';
            frame.style.filter = 'drop-shadow(0 0 ' + bw + ' ' + glowColor + ') drop-shadow(0 0 ' + glowRadius + ' ' + glowColor + ')';
            frame.style.overflow = 'visible';
          } else if (borderStyle === 'neon-glow') {
            frame.style.borderRadius = '0';
            frame.style.border = 'none';
            frame.style.background = 'transparent';
            frame.style.boxShadow = 'none';
            frame.style.filter = 'drop-shadow(0 0 ' + bw + ' ' + glowColor + ') drop-shadow(0 0 ' + glowRadius + ' ' + glowColor + ')';
            frame.style.overflow = 'visible';
          } else if (borderStyle === 'holo-pedestal') {
            frame.style.borderRadius = '0';
            frame.style.border = 'none';
            frame.style.background = 'transparent';
            frame.style.boxShadow = 'none';
            frame.style.filter = 'drop-shadow(0 0 ' + glowRadius + ' ' + glowColor + ')';
            frame.style.overflow = 'visible';
          } else if (borderStyle === 'glass-bubble') {
            frame.style.borderRadius = '50%';
            frame.style.border = bw + ' solid rgba(255, 255, 255, 0.45)';
            frame.style.background = 'rgba(255, 255, 255, 0.10)';
            frame.style.backdropFilter = 'blur(6px)';
            frame.style.webkitBackdropFilter = 'blur(6px)';
            frame.style.boxShadow = 'inset 0 1px 2px rgba(255, 255, 255, 0.6), 0 4px 14px rgba(0, 0, 0, 0.35), 0 0 ' + glowRadius + ' ' + glowColor;
            frame.style.filter = 'drop-shadow(0 0 6px ' + glowColor + ')';
            frame.style.overflow = 'hidden';
          } else {
            frame.style.borderRadius = '0';
            frame.style.border = 'none';
            frame.style.background = 'transparent';
            frame.style.boxShadow = 'none';
            frame.style.filter = 'none';
            frame.style.overflow = 'visible';
          }

          const comp = doc.querySelector('.surface-composer');
          if (pos.startsWith('composer') && comp) {
            const r = comp.getBoundingClientRect();
            pet.style.bottom = (window.innerHeight - r.top - 4 + offY) + 'px';
            pet.style.top = 'auto';
            if (pos === 'composer-top-left') {
              pet.style.left = (r.left + 24 + offX) + 'px';
              pet.style.right = 'auto';
            } else if (pos === 'composer-top-center') {
              pet.style.left = (r.left + r.width / 2 - sz / 2 + offX) + 'px';
              pet.style.right = 'auto';
            } else {
              pet.style.right = (window.innerWidth - r.right + 24 - offX) + 'px';
              pet.style.left = 'auto';
            }
          } else if (pos === 'screen-bottom-left') {
            pet.style.bottom = (24 + offY) + 'px';
            pet.style.left = (28 + offX) + 'px';
            pet.style.right = 'auto';
            pet.style.top = 'auto';
          } else if (pos === 'sidebar-bottom') {
            pet.style.bottom = (24 + offY) + 'px';
            pet.style.left = (offX + 16) + 'px';
            pet.style.right = 'auto';
            pet.style.top = 'auto';
          } else {
            pet.style.bottom = (24 + offY) + 'px';
            pet.style.right = (28 - offX) + 'px';
            pet.style.left = 'auto';
            pet.style.top = 'auto';
          }

          pet.className = 'anim-' + (cfg.petAnim || 'bob');

          // Click interaction: Speech Bubble
          pet.onclick = () => {
            let bubble = pet.querySelector('.ag-pet-bubble') || doc.getElementById('ag-pet-bubble');
            if (bubble) bubble.remove();
            bubble = doc.createElement('div');
            bubble.id = 'ag-pet-bubble';
            bubble.className = 'ag-pet-bubble';
            bubble.textContent = cfg.petSpeech || 'Chủ nhân cố lên nhé! Hôm nay code gì thế ạ? ✨';
            pet.appendChild(bubble);
            setTimeout(() => { if (bubble && bubble.parentNode) bubble.remove(); }, 4500);
          };
        } else {
          pet.style.display = 'none';
        }

        // 4. Motion Flow WebGL Engine (Persistent 60fps Native WebGL flow theme)
        const motion = cfg.motionFlow;
        let mc = doc.getElementById('ag-theme-motion-canvas');
        if (motion && motion.enabled && motion.arrows && motion.arrows.length > 0 && cfg.wallpaperUrl) {
          if (!mc) {
            mc = doc.createElement('canvas');
            mc.id = 'ag-theme-motion-canvas';
            mc.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none;transition:opacity 0.3s ease;';
            (doc.body || doc.documentElement).prepend(mc);
          }
          mc.style.display = 'block';
          mc.style.opacity = String((cfg.glass?.wallpaperOpacity ?? 95) / 100);
          if (bg) bg.style.display = 'none';

          const motionKey = JSON.stringify({ motion, url: cfg.wallpaperUrl });
          if (mc.dataset.motionKey !== motionKey) {
            mc.dataset.motionKey = motionKey;
            mc.width = window.innerWidth;
            mc.height = window.innerHeight;

            const gl = mc.getContext('webgl', { premultipliedAlpha: false });
            if (gl) {
              const vsSrc = 'attribute vec2 p;varying vec2 u;void main(){u=(p+1.)*.5;u.y=1.-u.y;gl_Position=vec4(p,0.,1.);}';
              const fsSrc = 'precision mediump float;uniform sampler2D img,flow;uniform float t,spd;varying vec2 u;' +
                'void main(){vec4 f=texture2D(flow,u);vec2 d=(f.rg-.5)*2.;float s=f.b*spd;float m=f.a;' +
                'if(m<.01||length(d)<.01){gl_FragColor=texture2D(img,u);return;}' +
                'vec2 v=normalize(d)*s*0.075*m;float t1=fract(t*0.45);float t2=fract(t*0.45+0.5);' +
                'vec2 u1=u-v*t1;vec2 u2=u-v*t2;float w=abs((t1-0.5)*2.0);' +
                'gl_FragColor=mix(texture2D(img,clamp(u1,0.,1.)),texture2D(img,clamp(u2,0.,1.)),w);}';

              const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
              const prg = gl.createProgram();
              gl.attachShader(prg, sh(gl.VERTEX_SHADER, vsSrc));
              gl.attachShader(prg, sh(gl.FRAGMENT_SHADER, fsSrc));
              gl.linkProgram(prg);

              const buf = gl.createBuffer();
              gl.bindBuffer(gl.ARRAY_BUFFER, buf);
              gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
              const pLoc = gl.getAttribLocation(prg, 'p');
              gl.enableVertexAttribArray(pLoc);
              gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

              const fc = doc.createElement('canvas');
              fc.width = 128; fc.height = 128;
              const fctx = fc.getContext('2d');
              const idata = fctx.createImageData(128, 128);
              const d = idata.data;
              for (let i = 0; i < d.length; i += 4) { d[i] = 128; d[i+1] = 128; d[i+2] = 0; d[i+3] = 0; }

              const arrows = motion.arrows || [];
              const pins = motion.pins || [];

              for (let py = 0; py < 128; py++) {
                const ny = py / 128;
                for (let px = 0; px < 128; px++) {
                  const nx = px / 128;
                  const idx = (py * 128 + px) * 4;

                  let pinDist = 999;
                  for (const p of pins) {
                    const dist = Math.hypot(nx - p.x, ny - p.y);
                    const r = p.radius || 0.08;
                    if (dist < r) { pinDist = 0; break; }
                    pinDist = Math.min(pinDist, (dist - r) / (r * 1.5));
                  }
                  if (pinDist <= 0) continue;

                  let tw = 0, fdx = 0, fdy = 0, fspd = 0;
                  for (const a of arrows) {
                    const mx = (a.x1 + a.x2) / 2, my = (a.y1 + a.y2) / 2;
                    const w = 1.0 / Math.pow(Math.max(Math.hypot(nx - mx, ny - my), 0.04), 2.2);
                    const adx = a.x2 - a.x1, ady = a.y2 - a.y1;
                    const alen = Math.hypot(adx, ady) || 1;
                    fdx += (adx / alen) * w; fdy += (ady / alen) * w;
                    fspd += (a.speed || 1.0) * w; tw += w;
                  }
                  if (tw > 0.001) {
                    fdx /= tw; fdy /= tw; fspd /= tw;
                    const mag = Math.hypot(fdx, fdy);
                    if (mag > 0.001) {
                      d[idx] = Math.round(((fdx / mag + 1) / 2) * 255);
                      d[idx+1] = Math.round(((fdy / mag + 1) / 2) * 255);
                      d[idx+2] = Math.round(Math.min(255, fspd * 100));
                      d[idx+3] = Math.round(Math.min(1.0, pinDist) * 255);
                    }
                  }
                }
              }
              fctx.putImageData(idata, 0, 0);

              const flTex = gl.createTexture();
              gl.bindTexture(gl.TEXTURE_2D, flTex);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fc);

              const imTex = gl.createTexture();
              const im = new Image();
              im.crossOrigin = 'anonymous';
              im.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, imTex);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);

                if (window._agMotionLoop) cancelAnimationFrame(window._agMotionLoop);
                const st = Date.now();
                const loop = () => {
                  gl.viewport(0, 0, mc.width, mc.height);
                  gl.useProgram(prg);
                  gl.activeTexture(gl.TEXTURE0);
                  gl.bindTexture(gl.TEXTURE_2D, imTex);
                  gl.uniform1i(gl.getUniformLocation(prg, 'img'), 0);

                  gl.activeTexture(gl.TEXTURE1);
                  gl.bindTexture(gl.TEXTURE_2D, flTex);
                  gl.uniform1i(gl.getUniformLocation(prg, 'flow'), 1);

                  gl.uniform1f(gl.getUniformLocation(prg, 't'), (Date.now() - st) / 1000);
                  gl.uniform1f(gl.getUniformLocation(prg, 'spd'), motion.flowSpeed || 1.0);

                  gl.drawArrays(gl.TRIANGLES, 0, 6);
                  window._agMotionLoop = requestAnimationFrame(loop);
                };
                loop();
              };
              im.src = cfg.wallpaperUrl;
            }
          }
        } else {
          if (mc) {
            mc.style.display = 'none';
            mc.dataset.motionKey = '';
          }
          if (window._agMotionLoop) cancelAnimationFrame(window._agMotionLoop);
          if (bg) bg.style.display = 'block';
        }

        // 5. Live Wallpaper Ambient FX Engine (#ag-theme-canvas-fx)
        let cv = doc.getElementById('ag-theme-canvas-fx');
        const fx = cfg.wallpaperFx || 'none';
        let fxOpacity = 0.35;
        if (cfg.wallpaperFxOpacity !== undefined && cfg.wallpaperFxOpacity !== null) {
          const parsed = parseFloat(cfg.wallpaperFxOpacity);
          if (!isNaN(parsed)) {
            fxOpacity = parsed > 1 ? parsed / 100 : parsed;
          }
        }
        fxOpacity = Math.max(0, Math.min(1, fxOpacity));

        let fxSpeed = 1.0;
        if (cfg.wallpaperFxSpeed !== undefined && cfg.wallpaperFxSpeed !== null) {
          const parsed = parseFloat(cfg.wallpaperFxSpeed);
          if (!isNaN(parsed)) {
            fxSpeed = Math.max(0.1, Math.min(5.0, parsed));
          }
        }
        const themeAccent = (cfg.palette && cfg.palette[cfg.mode || 'dark']?.colors?.accentPrimary) || cfg.colors?.accentPrimary || '#7DCFFF';

        if (fx !== 'none' && fx !== 'breathing') {
          if (!cv) {
            cv = doc.createElement('canvas');
            cv.id = 'ag-theme-canvas-fx';
            cv.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none;transition:opacity 0.3s ease;';
            (doc.body || doc.documentElement).prepend(cv);
          }
          cv.style.position = 'fixed';
          cv.style.top = '0';
          cv.style.left = '0';
          cv.style.width = '100vw';
          cv.style.height = '100vh';
          cv.style.zIndex = '0';
          cv.style.pointerEvents = 'none';
          cv.style.opacity = String(fxOpacity);

          const fxKey = JSON.stringify({ fx: fx, opacity: fxOpacity, speed: fxSpeed, accent: themeAccent });
          if (cv.dataset.fxKey !== fxKey) {
            cv.dataset.fxKey = fxKey;
            cv.width = window.innerWidth;
            cv.height = window.innerHeight;

            if (window._agFxLoop) cancelAnimationFrame(window._agFxLoop);
            if (window._agFxResize) window.removeEventListener('resize', window._agFxResize);

            window._agFxResize = () => {
              if (cv) {
                cv.width = window.innerWidth;
                cv.height = window.innerHeight;
              }
            };
            window.addEventListener('resize', window._agFxResize);

            const ctx = cv.getContext('2d');
            let t = 0;
            let particles = [];

            if (fx === 'aurora-mist') {
              // Wave based, uses t and gradients
            } else if (fx === 'rain-glass') {
              for (let i = 0; i < 40; i++) {
                particles.push({
                  x: Math.random() * cv.width,
                  y: Math.random() * cv.height,
                  r: Math.random() * 2.5 + 1.5,
                  vy: Math.random() < 0.2 ? Math.random() * 1.5 + 0.8 : Math.random() * 0.08 + 0.02,
                  sliding: Math.random() < 0.2,
                  alpha: Math.random() * 0.3 + 0.4
                });
              }
            } else if (fx === 'constellation') {
              for (let i = 0; i < 45; i++) {
                particles.push({
                  x: Math.random() * cv.width,
                  y: Math.random() * cv.height,
                  vx: (Math.random() - 0.5) * 0.6,
                  vy: (Math.random() - 0.5) * 0.6,
                  r: Math.random() * 1.5 + 1.0
                });
              }
            } else if (fx === 'sunbeam-dust') {
              for (let i = 0; i < 40; i++) {
                particles.push({
                  x: Math.random() * cv.width,
                  y: Math.random() * cv.height,
                  r: Math.random() * 10 + 3,
                  vy: Math.random() * 0.5 + 0.2,
                  phase: Math.random() * Math.PI * 2,
                  alpha: Math.random() * 0.25 + 0.15
                });
              }
            } else if (fx === 'sakura-drift') {
              for (let i = 0; i < 30; i++) {
                particles.push({
                  x: Math.random() * cv.width,
                  y: Math.random() * cv.height,
                  sz: Math.random() * 6 + 7,
                  vx: Math.random() * 0.8 + 0.4,
                  vy: Math.random() * 0.9 + 0.6,
                  ang: Math.random() * Math.PI * 2,
                  rotSpd: (Math.random() - 0.5) * 0.03,
                  flip: Math.random() * Math.PI * 2,
                  flipSpd: Math.random() * 0.03 + 0.015,
                  color: Math.random() < 0.5 ? 'rgba(255, 182, 193, 0.65)' : 'rgba(255, 210, 225, 0.6)'
                });
              }
            } else if (fx === 'water-ripple') {
              const maxR = Math.min(cv.width, cv.height) * 0.75;
              for (let i = 0; i < 7; i++) {
                particles.push({
                  x: cv.width * 0.2,
                  y: cv.height * 0.8,
                  r: (i / 7) * maxR,
                  maxR: maxR,
                  speed: 0.6
                });
              }
            } else if (fx === 'snow') {
              for (let i = 0; i < 40; i++) {
                particles.push({
                  x: Math.random() * cv.width,
                  y: Math.random() * cv.height,
                  r: Math.random() * 2.5 + 1.2,
                  s: Math.random() * 1.2 + 0.6
                });
              }
            } else if (fx === 'fireflies') {
              for (let i = 0; i < 30; i++) {
                particles.push({
                  x: Math.random() * cv.width,
                  y: Math.random() * cv.height,
                  r: Math.random() * 2.2 + 1.5,
                  s: Math.random() * 1.0 + 0.4
                });
              }
            } else if (fx === 'rain') {
              for (let i = 0; i < 60; i++) {
                particles.push({
                  x: Math.random() * cv.width,
                  y: Math.random() * cv.height,
                  s: Math.random() * 2.0 + 2.0
                });
              }
            }

            const draw = () => {
              ctx.clearRect(0, 0, cv.width, cv.height);
              t += 0.008 * fxSpeed;

              if (fx === 'aurora-mist') {
                const g1 = ctx.createLinearGradient(0, 0, 0, cv.height * 0.45);
                g1.addColorStop(0, toRgba(themeAccent, 0.22));
                g1.addColorStop(0.5, toRgba(themeAccent, 0.08));
                g1.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g1;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                for (let x = 0; x <= cv.width; x += 25) {
                  const y = cv.height * 0.22 + Math.sin(x * 0.003 + t) * 35 + Math.cos(x * 0.0015 - t * 0.7) * 20;
                  ctx.lineTo(x, y);
                }
                ctx.lineTo(cv.width, 0);
                ctx.closePath();
                ctx.fill();

                const g2 = ctx.createLinearGradient(0, cv.height, 0, cv.height * 0.55);
                g2.addColorStop(0, toRgba(themeAccent, 0.18));
                g2.addColorStop(0.6, toRgba('#BB9AF7', 0.06));
                g2.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g2;
                ctx.beginPath();
                ctx.moveTo(0, cv.height);
                for (let x = 0; x <= cv.width; x += 25) {
                  const y = cv.height * 0.78 - (Math.sin(x * 0.0025 - t * 0.8) * 30 + Math.sin(x * 0.005 + t * 0.5) * 15);
                  ctx.lineTo(x, y);
                }
                ctx.lineTo(cv.width, cv.height);
                ctx.closePath();
                ctx.fill();

                const g3 = ctx.createRadialGradient(
                  cv.width * (0.5 + Math.sin(t * 0.5) * 0.2),
                  cv.height * (0.5 + Math.cos(t * 0.4) * 0.1),
                  10,
                  cv.width * 0.5,
                  cv.height * 0.5,
                  cv.width * 0.6
                );
                g3.addColorStop(0, toRgba(themeAccent, 0.08));
                g3.addColorStop(0.6, toRgba('#73DACA', 0.03));
                g3.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g3;
                ctx.fillRect(0, 0, cv.width, cv.height);
              } else if (fx === 'rain-glass') {
                if (Math.random() < 0.02 * fxSpeed) {
                  const d = particles[Math.floor(Math.random() * particles.length)];
                  if (d && !d.sliding) {
                    d.sliding = true;
                    d.vy = Math.random() * 1.8 + 1.0;
                    d.r = Math.min(d.r + 0.8, 4.0);
                  }
                }
                particles.forEach(d => {
                  d.y += d.vy * fxSpeed;
                  if (d.sliding) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, ' + (d.alpha * 0.25) + ')';
                    ctx.lineWidth = d.r * 0.7;
                    ctx.beginPath();
                    ctx.moveTo(d.x, d.y - d.vy * 4);
                    ctx.lineTo(d.x, d.y);
                    ctx.stroke();
                  }
                  ctx.beginPath();
                  ctx.ellipse(d.x, d.y, d.r, d.sliding ? d.r * 1.3 : d.r, 0, 0, Math.PI * 2);
                  ctx.fillStyle = 'rgba(220, 240, 255, ' + (d.alpha * 0.45) + ')';
                  ctx.fill();

                  ctx.beginPath();
                  ctx.arc(d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.35, 0, Math.PI * 2);
                  ctx.fillStyle = 'rgba(255, 255, 255, ' + (d.alpha * 0.85) + ')';
                  ctx.fill();

                  if (d.y > cv.height + 10) {
                    d.y = -10;
                    d.x = Math.random() * cv.width;
                    d.sliding = Math.random() < 0.15;
                    d.vy = d.sliding ? Math.random() * 1.5 + 0.8 : Math.random() * 0.08 + 0.02;
                    d.r = Math.random() * 2.5 + 1.5;
                  }
                });
              } else if (fx === 'constellation') {
                const maxDist = 125;
                for (let i = 0; i < particles.length; i++) {
                  for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < maxDist) {
                      const alpha = (1 - dist / maxDist) * 0.22;
                      ctx.strokeStyle = 'rgba(165, 215, 255, ' + alpha + ')';
                      ctx.lineWidth = 0.8;
                      ctx.beginPath();
                      ctx.moveTo(particles[i].x, particles[i].y);
                      ctx.lineTo(particles[j].x, particles[j].y);
                      ctx.stroke();
                    }
                  }
                }
                particles.forEach(s => {
                  s.x += s.vx * fxSpeed;
                  s.y += s.vy * fxSpeed;
                  if (s.x < 0 || s.x > cv.width) s.vx = -s.vx;
                  if (s.y < 0 || s.y > cv.height) s.vy = -s.vy;
                  ctx.beginPath();
                  ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                  ctx.fillStyle = 'rgba(215, 235, 255, 0.75)';
                  ctx.fill();
                });
              } else if (fx === 'sunbeam-dust') {
                particles.forEach(m => {
                  m.y -= m.vy * fxSpeed;
                  m.x += Math.sin(m.y * 0.01 + m.phase) * 0.35 * fxSpeed;
                  if (m.y < -20) {
                    m.y = cv.height + 20;
                    m.x = Math.random() * cv.width;
                  }
                  const rg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
                  rg.addColorStop(0, 'rgba(255, 230, 160, ' + m.alpha + ')');
                  rg.addColorStop(0.5, 'rgba(255, 220, 140, ' + (m.alpha * 0.4) + ')');
                  rg.addColorStop(1, 'rgba(255, 210, 120, 0)');
                  ctx.beginPath();
                  ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
                  ctx.fillStyle = rg;
                  ctx.fill();
                });
              } else if (fx === 'sakura-drift') {
                particles.forEach(p => {
                  p.y += p.vy * fxSpeed;
                  p.x += (p.vx + Math.sin(p.y * 0.015) * 0.6) * fxSpeed;
                  p.ang += p.rotSpd * fxSpeed;
                  p.flip += p.flipSpd * fxSpeed;
                  if (p.y > cv.height + 20) {
                    p.y = -20;
                    p.x = Math.random() * cv.width;
                  }
                  if (p.x > cv.width + 20) {
                    p.x = -20;
                  }
                  ctx.save();
                  ctx.translate(p.x, p.y);
                  ctx.rotate(p.ang);
                  ctx.scale(Math.cos(p.flip), 1);
                  ctx.beginPath();
                  ctx.moveTo(0, 0);
                  ctx.bezierCurveTo(p.sz * 0.5, -p.sz * 0.8, p.sz, -p.sz * 0.4, p.sz * 0.8, p.sz * 0.6);
                  ctx.bezierCurveTo(p.sz * 0.4, p.sz * 0.9, -p.sz * 0.2, p.sz * 0.6, 0, 0);
                  ctx.fillStyle = p.color;
                  ctx.fill();
                  ctx.restore();
                });
              } else if (fx === 'water-ripple') {
                particles.forEach(rp => {
                  rp.r += rp.speed * fxSpeed;
                  if (rp.r > rp.maxR) {
                    rp.r = 0;
                  }
                  const prog = rp.r / rp.maxR;
                  const alpha = Math.sin(prog * Math.PI) * 0.25;
                  ctx.beginPath();
                  ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
                  ctx.strokeStyle = toRgba(themeAccent, alpha);
                  ctx.lineWidth = 1.2;
                  ctx.stroke();
                });
              } else if (fx === 'snow') {
                ctx.fillStyle = 'rgba(255, 235, 245, 0.75)';
                particles.forEach(p => {
                  ctx.beginPath();
                  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                  ctx.fill();
                  p.y += p.s * fxSpeed;
                  p.x += Math.sin(p.y * 0.02) * 0.5 * fxSpeed;
                  if (p.y > cv.height) { p.y = -10; p.x = Math.random() * cv.width; }
                });
              } else if (fx === 'fireflies') {
                particles.forEach(p => {
                  ctx.beginPath();
                  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                  ctx.fillStyle = 'rgba(255, 230, 100, 0.8)';
                  ctx.fill();
                  p.y += p.s * 0.5 * fxSpeed;
                  p.x += Math.sin(p.y * 0.05) * 0.8 * fxSpeed;
                  if (p.y > cv.height) { p.y = -10; p.x = Math.random() * cv.width; }
                  if (p.y < -10) { p.y = cv.height; p.x = Math.random() * cv.width; }
                });
              } else if (fx === 'rain') {
                ctx.fillStyle = 'rgba(125, 207, 255, 0.65)';
                particles.forEach(p => {
                  ctx.fillRect(p.x, p.y, 1.5, 9);
                  p.y += p.s * 4 * fxSpeed;
                  if (p.y > cv.height) { p.y = -10; p.x = Math.random() * cv.width; }
                });
              }

              window._agFxLoop = requestAnimationFrame(draw);
            };
            draw();
          }
        } else {
          if (cv) {
            cv.remove();
            cv.dataset.fxKey = '';
          }
          if (window._agFxLoop) cancelAnimationFrame(window._agFxLoop);
          if (window._agFxResize) {
            window.removeEventListener('resize', window._agFxResize);
            window._agFxResize = null;
          }
        }

        // 6. Independent Pet Overlay Layer (Part C - Giai Doan 1)
        // Mounts #ag-pet-overlay-container: position:fixed, inset:0, z-index:999999,
        // pointer-events:none, with filter:none for full isolation from glass pipeline.
        (function injectPetOverlay() {
          try {
            var OVERLAY_ID     = 'ag-pet-overlay-container';
            var PET_ENTITY_ID  = 'ag-pet-entity';
            var HITBOX_CLS     = 'ag-pet-hitbox';
            var SPRITE_CLS     = 'ag-pet-sprite-canvas';
            var PEDESTAL_CLS   = 'ag-pet-pedestal-holo';
            var BUBBLE_CLS     = 'ag-pet-speech-bubble';
            var STYLE_ID       = 'ag-pet-overlay-style';
            var SPEECH = [
              'Chu nhan co len nhe! \u2728',
              'Code dep lam hom nay! \uD83C\uDF38',
              'Nghi giai lao chut di nao~ \u2615',
              'Toi luon o day ben ban! \uD83D\uDC3E',
              'Hom nay build co pass khong? \uD83E\uDD1E'
            ];

            if (!doc.getElementById(STYLE_ID)) {
              var st = doc.createElement('style');
              st.id = STYLE_ID;
              st.textContent = [
                '#' + OVERLAY_ID + '{position:fixed!important;inset:0!important;z-index:999999!important;pointer-events:none!important;background:transparent!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;isolation:isolate!important;overflow:visible!important;}',
                '#' + PET_ENTITY_ID + '{position:absolute;pointer-events:none;user-select:none;transform-origin:bottom center;will-change:transform,left,top;}',
                '.' + HITBOX_CLS + '{position:absolute;pointer-events:auto!important;cursor:grab;background:transparent;}',
                '.' + HITBOX_CLS + ':active{cursor:grabbing;}',
                '.' + SPRITE_CLS + '{position:absolute;pointer-events:none;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.55));image-rendering:pixelated;}',
                '.' + PEDESTAL_CLS + '{position:absolute;pointer-events:none;border-radius:50%;animation:agPedestalPulse 2.8s ease-in-out infinite alternate;}',
                '@keyframes agPedestalPulse{0%{transform:translateX(-50%) scaleX(0.88);opacity:0.55;}100%{transform:translateX(-50%) scaleX(1.12);opacity:0.95;}}',
                '.' + BUBBLE_CLS + '{position:absolute;pointer-events:none;background:rgba(10,20,36,0.95);border:1px solid rgba(125,207,255,0.7);color:#e8f4ff;border-radius:10px;padding:6px 12px;font-size:11px;font-family:system-ui,sans-serif;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,0.5);animation:agBubblePop 0.22s cubic-bezier(0.18,0.89,0.32,1.28) forwards;transform-origin:bottom right;z-index:1000000;bottom:calc(100% + 10px);right:0;}',
                '.' + BUBBLE_CLS + '::after{content:"";position:absolute;top:100%;right:14px;border:5px solid transparent;border-top-color:rgba(125,207,255,0.7);}',
                '@keyframes agBubblePop{0%{opacity:0;transform:scale(0.55);}100%{opacity:1;transform:scale(1);}}'
              ].join('\\n');
              (doc.head || doc.documentElement).appendChild(st);
            }

            // Overlay container
            var overlay = doc.getElementById(OVERLAY_ID);
            if (!overlay) {
              overlay = doc.createElement('div');
              overlay.id = OVERLAY_ID;
              doc.body.appendChild(overlay);
            }
            var filterEnabled = Boolean(cfg.petFilterEnabled);
            overlay.style.filter = filterEnabled ? '' : 'none';
            overlay.style.backdropFilter = filterEnabled ? '' : 'none';
            overlay.style.webkitBackdropFilter = filterEnabled ? '' : 'none';

            // Pet entity
            var entity = doc.getElementById(PET_ENTITY_ID);
            if (!entity) {
              entity = doc.createElement('div');
              entity.id = PET_ENTITY_ID;
              overlay.appendChild(entity);
            }

            var anchorX = cfg.petAnchorX !== undefined ? cfg.petAnchorX : 40;
            var anchorY = cfg.petAnchorY !== undefined ? cfg.petAnchorY : 80;
            var hitboxW = cfg.petHitboxW || 80;
            var hitboxH = cfg.petHitboxH || 80;
            var posX    = cfg.petPosX !== undefined ? cfg.petPosX : 200;
            var posY    = cfg.petPosY !== undefined ? cfg.petPosY : (window.innerHeight - 160);

            entity.style.position = 'absolute';
            entity.style.left = (posX - anchorX) + 'px';
            entity.style.top  = (posY - anchorY) + 'px';
            entity.style.pointerEvents = 'none';
            entity.style.userSelect = 'none';

            // Pedestal
            var ped = entity.querySelector('.' + PEDESTAL_CLS);
            if (!ped) {
              ped = doc.createElement('div');
              ped.className = PEDESTAL_CLS;
              entity.appendChild(ped);
            }
            var pedColor = cfg.petPedestalColor || glowColor || '#7DCFFF';
            if (Boolean(cfg.petPedestal)) {
              var pw = Math.max(hitboxW * 0.9, 40), ph = 14;
              ped.style.cssText = 'display:block;position:absolute;width:'+pw+'px;height:'+ph+'px;left:'+anchorX+'px;top:'+(anchorY-ph/2)+'px;transform:translateX(-50%);background:radial-gradient(ellipse at center,'+pedColor+' 0%,'+toRgba(pedColor,0.4)+' 50%,transparent 78%);box-shadow:0 0 10px '+toRgba(pedColor,0.45)+';animation:agPedestalPulse 2.8s ease-in-out infinite alternate;pointer-events:none;z-index:0;';
            } else {
              ped.style.display = 'none';
            }

            // Sprite canvas
            var spriteCanvas = entity.querySelector('.' + SPRITE_CLS);
            if (!spriteCanvas) {
              spriteCanvas = doc.createElement('canvas');
              spriteCanvas.className = SPRITE_CLS;
              entity.appendChild(spriteCanvas);
            }
            var sw = hitboxW, sh = hitboxH;
            spriteCanvas.width = sw; spriteCanvas.height = sh;
            spriteCanvas.style.width  = sw + 'px';
            spriteCanvas.style.height = sh + 'px';
            spriteCanvas.style.left   = (anchorX - sw / 2) + 'px';
            spriteCanvas.style.top    = (anchorY - sh) + 'px';

            // Draw static mascot image if no animation engine
            if (cfg.mascotUrl) {
              var sCtx = spriteCanvas.getContext('2d');
              var img = new Image();
              img.onload = function() {
                spriteCanvas.width  = img.naturalWidth  || sw;
                spriteCanvas.height = img.naturalHeight || sh;
                spriteCanvas.style.width  = spriteCanvas.width  + 'px';
                spriteCanvas.style.height = spriteCanvas.height + 'px';
                spriteCanvas.style.left   = (anchorX - spriteCanvas.width  / 2) + 'px';
                spriteCanvas.style.top    = (anchorY - spriteCanvas.height)     + 'px';
                sCtx.clearRect(0, 0, spriteCanvas.width, spriteCanvas.height);
                sCtx.drawImage(img, 0, 0, spriteCanvas.width, spriteCanvas.height);
              };
              img.src = cfg.mascotUrl;
            }

            // Hitbox
            var hitbox = entity.querySelector('.' + HITBOX_CLS);
            if (!hitbox) {
              hitbox = doc.createElement('div');
              hitbox.className = HITBOX_CLS;
              entity.appendChild(hitbox);
            }
            hitbox.style.width  = hitboxW + 'px';
            hitbox.style.height = hitboxH + 'px';
            hitbox.style.left   = (anchorX - hitboxW / 2) + 'px';
            hitbox.style.top    = (anchorY - hitboxH) + 'px';

            // Drag & Drop state
            var dragging = false, faceDir = 1, speechIdx = 0;
            var dragStartX, dragStartY, dragOriginX, dragOriginY, lastDragX = 0;
            var bubbleTimer, clickTimer;

            function onMouseDown(e) {
              if (e.button !== 0) return;
              e.preventDefault(); e.stopPropagation();
              dragging = true;
              dragStartX = e.clientX; dragStartY = e.clientY;
              dragOriginX = posX; dragOriginY = posY;
              lastDragX = e.clientX;
              hitbox.style.cursor = 'grabbing';
              doc.addEventListener('mousemove', onMouseMove);
              doc.addEventListener('mouseup', onMouseUp);
            }
            function onMouseMove(e) {
              if (!dragging) return;
              var vx = e.clientX - lastDragX;
              lastDragX = e.clientX;
              if (Math.abs(vx) > 0.5) faceDir = vx > 0 ? 1 : -1;
              posX = dragOriginX + (e.clientX - dragStartX);
              posY = dragOriginY + (e.clientY - dragStartY);
              entity.style.left = (posX - anchorX) + 'px';
              entity.style.top  = (posY - anchorY) + 'px';
              // Flip sprite for direction
              spriteCanvas.style.transform = faceDir === -1 ? 'scaleX(-1)' : 'none';
            }
            function onMouseUp() {
              if (!dragging) return;
              dragging = false;
              doc.removeEventListener('mousemove', onMouseMove);
              doc.removeEventListener('mouseup', onMouseUp);
              hitbox.style.cursor = 'grab';
              if (window._agAppState) { window._agAppState.petPosX = posX; window._agAppState.petPosY = posY; }
            }
            function showBubble() {
              var old = entity.querySelector('.' + BUBBLE_CLS);
              if (old && old.parentNode) old.parentNode.removeChild(old);
              var bub = doc.createElement('div');
              bub.className = BUBBLE_CLS;
              bub.textContent = (cfg.petSpeechLines && cfg.petSpeechLines[speechIdx % cfg.petSpeechLines.length]) || SPEECH[speechIdx % SPEECH.length];
              speechIdx++;
              entity.appendChild(bub);
              clearTimeout(bubbleTimer);
              bubbleTimer = setTimeout(function() { if (bub.parentNode) bub.parentNode.removeChild(bub); }, 3500);
            }
            function onClick(e) {
              var dx = e.clientX - (dragStartX || e.clientX), dy = e.clientY - (dragStartY || e.clientY);
              if (Math.sqrt(dx*dx+dy*dy) > 4) return;
              e.stopPropagation();
              showBubble();
              clearTimeout(clickTimer);
              clickTimer = setTimeout(function() {}, 3500);
            }

            hitbox.addEventListener('mousedown', onMouseDown);
            hitbox.addEventListener('click', onClick);

            // Expose control handle
            window._agPetOverlay = {
              setState: function() {},
              setPosition: function(x, y) { posX = x; posY = y; entity.style.left = (posX - anchorX) + 'px'; entity.style.top = (posY - anchorY) + 'px'; },
              getPosition: function() { return { x: posX, y: posY }; }
            };
          } catch (ovErr) {
            try { console.warn('[AG Theme] PetOverlay injection error:', ovErr && ovErr.message); } catch {}
          }
        })();
        if (bg) {
          if (fx === 'breathing') bg.classList.add('wallpaper-breathing');
          else bg.classList.remove('wallpaper-breathing');
        }
      } catch (e) {}
    }

    if (globalThis.document) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyCustomTheme);
      } else {
        applyCustomTheme();
      }

      // Re-apply on dynamic SPA view updates
      let checkCount = 0;
      const interval = setInterval(() => {
        applyCustomTheme();
        checkCount++;
        if (checkCount > 15) clearInterval(interval);
      }, 1000);

      // Watch config file for instant live updates
      try {
        fs.watchFile(configPath, { interval: 800 }, () => {
          applyCustomTheme();
        });
      } catch(e) {}
    }
  } catch(e) {}
})();
${HOOK_END}
`;
}

/**
 * Safe OS-level file copy that completely bypasses Electron's monkey-patched ASAR filesystem
 */
function safeCopyFile(src, dst) {
  const cmd = `powershell -NoProfile -Command "Copy-Item -LiteralPath '${src.replace(/'/g, "''")}' -Destination '${dst.replace(/'/g, "''")}' -Force"`;
  execSync(cmd, { stdio: 'ignore' });
}

function isAntigravityRunning() {
  try {
    const stdout = execSync('powershell -NoProfile -Command "Get-Process Antigravity -ErrorAction SilentlyContinue"', { encoding: 'utf8' });
    return stdout.includes('Antigravity');
  } catch {
    return false;
  }
}

function getStatus() {
  try { asar.uncacheAll(); } catch {}
  const asarExists = fs.existsSync(ASAR_PATH);
  const backupExists = fs.existsSync(BACKUP_PATH);
  let isPatched = false;

  if (asarExists) {
    try {
      const preloadBuf = asar.extractFile(ASAR_PATH, 'dist/preload.js');
      isPatched = preloadBuf.toString('utf8').includes(HOOK_START);
    } catch {
      isPatched = false;
    }
  }

  return {
    antigravityInstalled: fs.existsSync(ANTIGRAVITY_EXE),
    asarExists,
    backupExists,
    isPatched,
    running: isAntigravityRunning(),
    asarPath: ASAR_PATH,
    configPath: CONFIG_PATH
  };
}

async function installMod() {
  try { asar.uncacheAll(); } catch {}
  if (!fs.existsSync(ASAR_PATH)) {
    throw new Error('Không tìm thấy file app.asar tại: ' + ASAR_PATH);
  }

  // 1. Tạo backup an toàn cấp OS nếu chưa có
  if (!fs.existsSync(BACKUP_PATH)) {
    safeCopyFile(ASAR_PATH, BACKUP_PATH);
  }

  // 2. Thư mục tạm
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const tempDir = path.join(CONFIG_DIR, 'temp_extract_' + Date.now());
  const tempAsar = path.join(CONFIG_DIR, 'temp_app_' + Date.now() + '.asar');

  try {
    fs.mkdirSync(tempDir, { recursive: true });

    // Extract asar using native @electron/asar module
    asar.extractAll(ASAR_PATH, tempDir);

    const preloadPath = path.join(tempDir, 'dist', 'preload.js');
    if (!fs.existsSync(preloadPath)) {
      throw new Error('Không tìm thấy dist/preload.js trong app.asar');
    }

    let preloadContent = fs.readFileSync(preloadPath, 'utf8');
    const newHook = generateHookCode();

    if (preloadContent.includes(HOOK_START)) {
      // Replace existing hook with the updated full-persistence version
      const startIdx = preloadContent.indexOf(HOOK_START);
      const endIdx = preloadContent.indexOf(HOOK_END);
      if (startIdx !== -1 && endIdx !== -1) {
        preloadContent = preloadContent.slice(0, startIdx) + newHook.trim() + preloadContent.slice(endIdx + HOOK_END.length);
      } else {
        preloadContent += '\n' + newHook + '\n';
      }
    } else {
      preloadContent += '\n' + newHook + '\n';
    }

    fs.writeFileSync(preloadPath, preloadContent, 'utf8');

    // Pack to temp asar
    await asar.createPackage(tempDir, tempAsar);

    // Safe OS-level atomic replace
    safeCopyFile(tempAsar, ASAR_PATH);

    return { success: true, message: 'Đã lưu giữ theme vĩnh viễn vào Antigravity! Ngay cả khi thoát app mở lại vẫn giữ nguyên theme.' };
  } finally {
    try {
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
      if (fs.existsSync(tempAsar)) fs.unlinkSync(tempAsar);
    } catch {}
  }
}

function restoreOriginal() {
  try { asar.uncacheAll(); } catch {}
  if (!fs.existsSync(BACKUP_PATH)) {
    throw new Error('Chưa có file backup để khôi phục (không tìm thấy app.asar.backup)!');
  }
  safeCopyFile(BACKUP_PATH, ASAR_PATH);
  try { asar.uncacheAll(); } catch {}
  return { success: true, message: 'Đã khôi phục Antigravity về nguyên bản 100%!' };
}

function restartAntigravity() {
  try {
    execSync('powershell -NoProfile -Command "Stop-Process -Name Antigravity -Force -ErrorAction SilentlyContinue"');
  } catch {}

  setTimeout(() => {
    try {
      spawn(ANTIGRAVITY_EXE, [], { detached: true, stdio: 'ignore' }).unref();
    } catch (e) {
      console.warn('Could not launch Antigravity:', e);
    }
  }, 1000);

  return { success: true, message: 'Đang khởi động lại Antigravity...' };
}

module.exports = {
  getStatus,
  installMod,
  restoreOriginal,
  restartAntigravity,
  generateHookCode,
  CONFIG_PATH,
  CONFIG_DIR
};
