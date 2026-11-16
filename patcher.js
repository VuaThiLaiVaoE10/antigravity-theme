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

const HOOK_SIGNATURE = '// === ANTIGRAVITY THEME STUDIO HOOK ===';

/**
 * Safe OS-level file copy that completely bypasses Electron's monkey-patched ASAR filesystem
 */
function safeCopyFile(src, dst) {
  // Use PowerShell Copy-Item with LiteralPath to avoid EISDIR on .asar files
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
      isPatched = preloadBuf.toString('utf8').includes(HOOK_SIGNATURE);
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
    if (!preloadContent.includes(HOOK_SIGNATURE)) {
      const hookCode = `
${HOOK_SIGNATURE}
(function() {
  try {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.env.USERPROFILE || 'C:\\\\Users\\\\Admin', '.gemini', 'antigravity', 'theme-studio', 'config.json');
    if (globalThis.document) {
      const applyTheme = () => {
        try {
          if (!fs.existsSync(configPath)) return;
          const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (!cfg.enabled) return;
          let bg = document.getElementById('ag-theme-bg');
          if (!bg) {
            bg = document.createElement('div');
            bg.id = 'ag-theme-bg';
            bg.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none;background-size:cover;background-position:center;transition:background-image 0.4s ease, opacity 0.3s ease;';
            document.body.prepend(bg);
          }
          if (cfg.wallpaperUrl) {
            bg.style.backgroundImage = 'url(' + JSON.stringify(cfg.wallpaperUrl) + ')';
            bg.style.opacity = String((cfg.glass?.wallpaperOpacity ?? 95) / 100);
          }
        } catch(e) {}
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyTheme);
      } else {
        applyTheme();
      }
    }
  } catch(e) {}
})();
// === END ANTIGRAVITY THEME STUDIO HOOK ===
`;
      preloadContent += '\n' + hookCode + '\n';
      fs.writeFileSync(preloadPath, preloadContent, 'utf8');
    }

    // Pack to temp asar
    await asar.createPackage(tempDir, tempAsar);

    // Safe OS-level atomic replace
    safeCopyFile(tempAsar, ASAR_PATH);

    return { success: true, message: 'Đã cài đặt Theme Mod vào Antigravity thành công!' };
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
