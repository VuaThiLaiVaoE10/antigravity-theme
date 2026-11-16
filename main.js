const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'electron_debug.log');
try { fs.writeFileSync(logFile, 'Electron main started at ' + new Date().toISOString() + '\n'); } catch {}
process.on('uncaughtException', (err) => {
  try { fs.appendFileSync(logFile, 'Uncaught Exception: ' + err.stack + '\n'); } catch {}
});
const patcher = require('./patcher');
const liveSync = require('./liveSync');
const { PALETTES } = require('./palettes');

let mainWindow = null;

function getInitialConfig() {
  if (fs.existsSync(patcher.CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(patcher.CONFIG_PATH, 'utf8'));
    } catch (e) {
      console.warn('Failed to parse config, using defaults:', e);
    }
  }

  // Default initial configuration
  const defaultPalette = PALETTES.find(p => p.id === 'midnight-aqua') || PALETTES[0];
  const violinPreset = path.join(__dirname, 'assets', 'violinist-earth.jpg');
  let defaultWp = '';
  if (fs.existsSync(violinPreset)) {
    const ext = path.extname(violinPreset).slice(1) || 'jpeg';
    defaultWp = `data:image/${ext};base64,${fs.readFileSync(violinPreset).toString('base64')}`;
  }

  const petFile = path.join(__dirname, 'assets', 'mascot-pixel-pet.png');
  let defaultPet = '';
  if (fs.existsSync(petFile)) {
    defaultPet = `data:image/png;base64,${fs.readFileSync(petFile).toString('base64')}`;
  }

  return {
    enabled: true,
    activeProfileId: 'default',
    profiles: [
      { id: 'default', name: 'Midnight Aqua (Ảnh Gốc)', paletteId: 'midnight-aqua', mode: 'dark' }
    ],
    activePaletteId: 'midnight-aqua',
    mode: 'dark',
    language: 'vi',
    wallpaperUrl: defaultWp,
    wallpaperName: 'Cô gái kéo đàn ngắm Trái Đất (Mặc định)',
    composerGradient: 'linear-gradient(90deg, #E6FF80 0%, #38EF7D 35%, #11998E 70%, #FFE066 100%)',
    mascotUrl: defaultPet,
    mascotSize: 52,
    mascotPos: 'top-right',
    mascotBounce: true,
    glass: {
      blur: 16,
      sidebarOpacity: 75,
      cardOpacity: 85,
      scrimOpacity: 60,
      glow: 40,
      wallpaperOpacity: 95
    },
    palette: {
      dark: defaultPalette.dark,
      light: defaultPalette.light
    }
  };
}

function saveConfig(cfg) {
  fs.mkdirSync(patcher.CONFIG_DIR, { recursive: true });
  const tmpPath = patcher.CONFIG_PATH + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(cfg, null, 2), 'utf8');
  fs.renameSync(tmpPath, patcher.CONFIG_PATH);
  return { success: true };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1140,
    height: 820,
    minWidth: 960,
    minHeight: 660,
    title: 'Antigravity Theme Studio',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#081826',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('close', () => {
    try { fs.appendFileSync(logFile, 'mainWindow close fired\n'); } catch {}
  });

  mainWindow.on('closed', () => {
    try { fs.appendFileSync(logFile, 'mainWindow closed fired\n'); } catch {}
    mainWindow = null;
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    try { fs.appendFileSync(logFile, `[Renderer] ${message} (${sourceId}:${line})\n`); } catch {}
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    try { fs.appendFileSync(logFile, `[FailLoad] ${errorCode}: ${errorDescription}\n`); } catch {}
  });
}

app.on('before-quit', () => {
  try { fs.appendFileSync(logFile, 'app before-quit fired\n'); } catch {}
});

app.on('will-quit', () => {
  try { fs.appendFileSync(logFile, 'app will-quit fired\n'); } catch {}
});

app.whenReady().then(() => {
  try { fs.appendFileSync(logFile, 'app whenReady fired\n'); } catch {}
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  try { fs.appendFileSync(logFile, 'window-all-closed fired\n'); } catch {}
  if (process.platform !== 'darwin') app.quit();
});

// === IPC HANDLERS ===

ipcMain.handle('get-state', async () => {
  const config = getInitialConfig();
  const status = patcher.getStatus();
  return {
    config,
    status,
    palettes: PALETTES
  };
});

ipcMain.handle('save-config', async (_event, cfg) => {
  try {
    saveConfig(cfg);
    const syncRes = await liveSync.applyToAntigravity(cfg);
    return { success: true, liveSynced: syncRes.success };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('select-wallpaper', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Chọn ảnh nền cho Antigravity',
    filters: [
      { name: 'Hình ảnh (Images)', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
      { name: 'Tất cả file', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  try {
    const ext = path.extname(filePath).slice(1).toLowerCase() || 'jpeg';
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    const data = fs.readFileSync(filePath);
    const base64 = `data:${mime};base64,${data.toString('base64')}`;
    const name = path.basename(filePath);
    return { canceled: false, filePath, fileName: name, dataUrl: base64 };
  } catch (err) {
    return { canceled: true, error: err.message };
  }
});

ipcMain.handle('install-mod', async () => {
  try {
    const res = await patcher.installMod();
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('restore-original', async () => {
  try {
    const res = patcher.restoreOriginal();
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('restart-antigravity', async () => {
  try {
    const res = patcher.restartAntigravity();
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-auto-launch', () => {
  try {
    return { success: true, openAtLogin: app.getLoginItemSettings().openAtLogin };
  } catch {
    return { success: true, openAtLogin: false };
  }
});

ipcMain.handle('set-auto-launch', (_event, enable) => {
  try {
    app.setLoginItemSettings({ openAtLogin: !!enable });
    return { success: true, openAtLogin: app.getLoginItemSettings().openAtLogin };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// === BACKGROUND AUTO-SYNC GUARDIAN ===
// Periodically ensures Antigravity always retains the theme when launched or restarted
let lastSyncedPort = null;
setInterval(async () => {
  try {
    const match = await liveSync.findAntigravityTarget();
    if (match && match.port !== lastSyncedPort) {
      lastSyncedPort = match.port;
      const cfg = getInitialConfig();
      if (cfg && cfg.enabled) {
        await liveSync.applyToAntigravity(cfg);
        try { fs.appendFileSync(logFile, `Auto-synced theme to freshly launched Antigravity on port ${match.port}\n`); } catch {}
      }
    }
  } catch {}
}, 4000);
