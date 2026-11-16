const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getState: () => ipcRenderer.invoke('get-state'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  selectWallpaper: () => ipcRenderer.invoke('select-wallpaper'),
  installMod: () => ipcRenderer.invoke('install-mod'),
  restoreOriginal: () => ipcRenderer.invoke('restore-original'),
  restartAntigravity: () => ipcRenderer.invoke('restart-antigravity')
});
