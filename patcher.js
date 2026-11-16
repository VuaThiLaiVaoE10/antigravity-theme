/**
 * Antigravity Theme Studio - Core Patcher Engine
 * Safely backs up and injects Theme Studio Hook into Antigravity app.asar.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const asar = require('@electron/asar');

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

    function buildCss(cfg) {
      const mode = cfg.mode || 'dark';
      const c = (cfg.palette && cfg.palette[mode]?.colors) || cfg.colors || {};
      const glass = cfg.glass || {};
      const blur = glass.blur ?? 16;
      const sidebarOpacity = (glass.sidebarOpacity ?? 75) / 100;
      const cardOpacity = (glass.cardOpacity ?? 85) / 100;

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
        '}',
        'body, html, .agy-shell, .agy-inset-shell {',
        '  background: transparent !important;',
        '  background-color: transparent !important;',
        '}',
        '.bg-background, .bg-\\\\[var\\\\(--shell-canvas\\\\)\\\\] {',
        '  background-color: transparent !important;',
        '}',
        '.shrink-0:has(.bg-sidebar), .flex.items-center.gap-1.px-2.h-full.bg-sidebar.w-full {',
        '  background-color: rgba(8, 24, 38, ' + Math.min(sidebarOpacity + 0.1, 0.9) + ') !important;',
        '  backdrop-filter: blur(' + blur + 'px) !important;',
        '  -webkit-backdrop-filter: blur(' + blur + 'px) !important;',
        '  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;',
        '}',
        '.h-full.w-full.flex.flex-col.pb-2.bg-sidebar {',
        '  background-color: rgba(8, 24, 38, ' + sidebarOpacity + ') !important;',
        '  backdrop-filter: blur(' + blur + 'px) !important;',
        '  -webkit-backdrop-filter: blur(' + blur + 'px) !important;',
        '  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;',
        '  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.25) !important;',
        '}',
        '.h-full.w-full.flex.flex-col.pb-2.bg-sidebar .bg-sidebar,',
        '.h-full.w-full.flex.flex-col.pb-2.bg-sidebar div.bg-sidebar,',
        '.h-full.w-full.flex.flex-col.pb-2.bg-sidebar button.bg-sidebar {',
        '  background-color: transparent !important;',
        '  background: transparent !important;',
        '}',
        '.group\\\\/section-header {',
        '  background-color: transparent !important;',
        '  color: rgba(255, 255, 255, 0.7) !important;',
        '  font-weight: 600 !important;',
        '}',
        '.group\\\\/headerbtn {',
        '  background-color: transparent !important;',
        '  border-radius: 6px !important;',
        '}',
        '.group\\\\/headerbtn:hover {',
        '  background-color: rgba(255, 255, 255, 0.06) !important;',
        '}',
        '.bg-sidebar-secondary {',
        '  background-color: rgba(125, 207, 255, 0.14) !important;',
        '  border-radius: 8px !important;',
        '  border: 1px solid rgba(125, 207, 255, 0.22) !important;',
        '}',
        '.agy-sidebar-row:hover {',
        '  background-color: rgba(255, 255, 255, 0.06) !important;',
        '  border-radius: 6px !important;',
        '}',
        '.h-full.w-full.flex.flex-col.pb-2.bg-sidebar .border-border.bg-sidebar-muted {',
        '  background-color: rgba(125, 207, 255, 0.10) !important;',
        '  border: 1px solid rgba(125, 207, 255, 0.25) !important;',
        '}',
        '[data-split-sash="true"] { background-color: transparent !important; }',
        '[data-testid="sidebar-sash"] .bg-border { background-color: rgba(125, 207, 255, 0.25) !important; }',
        '.agy-sheet, .agy-shell > div, .agy-inset-shell > div { background-color: transparent !important; }',
        '.surface-composer {',
        '  position: relative !important;',
        '  overflow: visible !important;',
        '  background: ' + (cfg.composerGradient || 'linear-gradient(90deg, #E6FF80 0%, #38EF7D 35%, #11998E 70%, #FFE066 100%)') + ' !important;',
        '  padding: 2px !important;',
        '  border-radius: ' + (cfg.composerRadius ?? 18) + 'px !important;',
        '  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45), 0 0 ' + (cfg.composerGlow ?? 18) + 'px rgba(212, 252, 121, 0.35) !important;',
        '}',
        '.surface-composer-card {',
        '  background: rgba(12, 24, 34, ' + Math.max(cardOpacity, 0.84) + ') !important;',
        '  backdrop-filter: blur(' + blur + 'px) !important;',
        '  -webkit-backdrop-filter: blur(' + blur + 'px) !important;',
        '  border-radius: ' + Math.max((cfg.composerRadius ?? 18) - 2, 4) + 'px !important;',
        '  border: none !important;',
        '}',
        '@keyframes agBreathing { 0% { transform: scale(1); } 50% { transform: scale(1.06) translate(-1%, -1%); } 100% { transform: scale(1); } }',
        '.wallpaper-breathing { animation: agBreathing 14s ease-in-out infinite !important; }'
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
  CONFIG_PATH,
  CONFIG_DIR
};
