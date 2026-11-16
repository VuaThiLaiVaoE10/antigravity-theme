/**
 * Live Sync Engine - Instantly injects theme & wallpaper into running Antigravity via dynamic CDP port
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const LS_LOG_PATH = path.join(
  process.env.APPDATA || 'C:\\Users\\Admin\\AppData\\Roaming',
  'Antigravity', 'logs', 'language_server.log'
);

function getLatestCdpPortFromLog() {
  try {
    if (!fs.existsSync(LS_LOG_PATH)) return null;
    const content = fs.readFileSync(LS_LOG_PATH, 'utf8');
    const regex = /ws:\/\/127\.0\.0\.1:(\d+)\/devtools\/browser\//g;
    let match, lastPort = null;
    while ((match = regex.exec(content)) !== null) {
      lastPort = parseInt(match[1]);
    }
    return lastPort;
  } catch {
    return null;
  }
}

async function getCdpTargets(port) {
  if (!port) return null;
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/json/list`, { timeout: 1500 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function findAntigravityTarget() {
  const discoveredPort = getLatestCdpPortFromLog();
  const portsToTry = [];
  if (discoveredPort) {
    portsToTry.push(discoveredPort);
    // Also try adjacent ports just in case
    for (let delta = -5; delta <= 5; delta++) {
      if (delta !== 0) portsToTry.push(discoveredPort + delta);
    }
  }

  for (const port of portsToTry) {
    const targets = await getCdpTargets(port);
    if (targets && Array.isArray(targets)) {
      // Find the main Antigravity page window
      const page = targets.find(t => 
        t.type === 'page' && 
        t.webSocketDebuggerUrl && 
        (t.title?.includes('Antigravity') || t.url?.includes('127.0.0.1')) &&
        !t.url?.startsWith('data:')
      );
      if (page) {
        return { page, port };
      }
    }
  }
  return null;
}

function buildThemeCss(config) {
  const mode = config.mode || 'dark';
  const c = (config.palette && config.palette[mode]?.colors) || config.colors || {};
  const g = (config.palette && config.palette[mode]?.gradients) || config.gradients || {};
  const glass = config.glass || {};
  const blur = glass.blur ?? 16;
  const sidebarOpacity = (glass.sidebarOpacity ?? 75) / 100;
  const cardOpacity = (glass.cardOpacity ?? 85) / 100;
  const accent = c.accentPrimary || '#7DCFFF';

  return `
    :root {
      --background: transparent !important;
      --body-background: transparent !important;
      --color-background: transparent !important;
      --shell: transparent !important;
      --shell-canvas: transparent !important;
      --sidebar: rgba(8, 24, 38, ${sidebarOpacity}) !important;
      --color-sidebar: rgba(8, 24, 38, ${sidebarOpacity}) !important;
      --card: rgba(15, 25, 38, ${cardOpacity}) !important;
      --scrim: ${c.scrim || '#061019'} !important;
      --bg-selection: ${c.selection || '#15415E'} !important;
    }

    body, html, .agy-shell, .agy-inset-shell {
      background: transparent !important;
      background-color: transparent !important;
    }

    .bg-background, .bg-\\\\[var\\\\(--shell-canvas\\\\)\\\\] {
      background-color: transparent !important;
    }

    /* 1. Header / Topbar Area */
    .shrink-0:has(.bg-sidebar),
    .flex.items-center.gap-1.px-2.h-full.bg-sidebar.w-full {
      background-color: rgba(8, 24, 38, ${Math.min(sidebarOpacity + 0.1, 0.9)}) !important;
      backdrop-filter: blur(${blur}px) !important;
      -webkit-backdrop-filter: blur(${blur}px) !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    /* 2. Main Sidebar Glass Container */
    .h-full.w-full.flex.flex-col.pb-2.bg-sidebar {
      background-color: rgba(8, 24, 38, ${sidebarOpacity}) !important;
      backdrop-filter: blur(${blur}px) !important;
      -webkit-backdrop-filter: blur(${blur}px) !important;
      border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
      box-shadow: 4px 0 24px rgba(0, 0, 0, 0.25) !important;
    }

    /* 3. Eliminate Opaque Nested Patches Inside Sidebar */
    .h-full.w-full.flex.flex-col.pb-2.bg-sidebar .bg-sidebar,
    .h-full.w-full.flex.flex-col.pb-2.bg-sidebar div.bg-sidebar,
    .h-full.w-full.flex.flex-col.pb-2.bg-sidebar button.bg-sidebar {
      background-color: transparent !important;
      background: transparent !important;
    }

    /* 4. Section Headers (Projects, Conversations) */
    .group\\/section-header {
      background-color: transparent !important;
      color: rgba(255, 255, 255, 0.7) !important;
      font-weight: 600 !important;
      letter-spacing: 0.02em !important;
    }

    /* 5. Folder / Item Buttons */
    .group\\/headerbtn {
      background-color: transparent !important;
      border-radius: 6px !important;
      transition: background-color 0.15s ease !important;
    }
    .group\\/headerbtn:hover {
      background-color: rgba(255, 255, 255, 0.06) !important;
    }

    /* 6. Active Item Highlight */
    .bg-sidebar-secondary {
      background-color: rgba(125, 207, 255, 0.14) !important;
      border-radius: 8px !important;
      border: 1px solid rgba(125, 207, 255, 0.22) !important;
    }

    /* 7. Hover Rows */
    .agy-sidebar-row:hover {
      background-color: rgba(255, 255, 255, 0.06) !important;
      border-radius: 6px !important;
    }

    /* 8. New Conversation Button */
    .h-full.w-full.flex.flex-col.pb-2.bg-sidebar .border-border.bg-sidebar-muted {
      background-color: rgba(125, 207, 255, 0.10) !important;
      border: 1px solid rgba(125, 207, 255, 0.25) !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
    }
    .h-full.w-full.flex.flex-col.pb-2.bg-sidebar .border-border.bg-sidebar-muted:hover {
      background-color: rgba(125, 207, 255, 0.18) !important;
    }

    /* 9. Sash / Splitter / Border Line */
    [data-split-sash="true"] {
      background-color: transparent !important;
    }
    [data-testid="sidebar-sash"] .bg-border {
      background-color: rgba(125, 207, 255, 0.25) !important;
    }

    /* 10. Main Content Area & Cards */
    .agy-sheet, .agy-shell > div, .agy-inset-shell > div {
      background-color: transparent !important;
    }
  `;
}

async function applyToAntigravity(config) {
  const match = await findAntigravityTarget();
  if (!match) {
    return { success: false, reason: 'Antigravity main window target not found' };
  }

  const { page } = match;

  return new Promise((resolve) => {
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { ws.close(); } catch {}
        resolve({ success: false, reason: 'Timeout connecting to Antigravity window' });
      }
    }, 4000);

    ws.onopen = () => {
      const wallpaperOpacity = ((config.glass?.wallpaperOpacity ?? 95) / 100);
      const wallpaperUrl = config.wallpaperUrl || '';
      const customCss = buildThemeCss(config);

      const evalScript = `(() => {
        try {
          // 1. Wallpaper Layer
          let bg = document.getElementById('ag-theme-bg');
          if (!bg) {
            bg = document.createElement('div');
            bg.id = 'ag-theme-bg';
            bg.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none;background-size:cover;background-position:center;transition:background-image 0.4s ease, opacity 0.3s ease;';
            document.body.prepend(bg);
          }
          if (${JSON.stringify(wallpaperUrl)}) {
            bg.style.backgroundImage = 'url(' + ${JSON.stringify(wallpaperUrl)} + ')';
            bg.style.opacity = '${wallpaperOpacity}';
          } else {
            bg.style.backgroundImage = 'none';
          }

          // 2. Injected Custom CSS Style
          let style = document.getElementById('ag-theme-css');
          if (!style) {
            style = document.createElement('style');
            style.id = 'ag-theme-css';
            document.head.appendChild(style);
          }
          style.textContent = ${JSON.stringify(customCss)};
          return true;
        } catch (e) {
          return false;
        }
      })()`;

      ws.send(JSON.stringify({
        id: 100,
        method: 'Runtime.evaluate',
        params: { expression: evalScript, returnByValue: true }
      }));
    };

    ws.onmessage = (msg) => {
      try {
        const res = JSON.parse(msg.data);
        if (res.id === 100) {
          clearTimeout(timeout);
          resolved = true;
          ws.close();
          resolve({ success: true, targetPort: match.port });
        }
      } catch {}
    };

    ws.onerror = () => {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        resolve({ success: false, reason: 'WebSocket connection failed' });
      }
    };
  });
}

module.exports = {
  getLatestCdpPortFromLog,
  findAntigravityTarget,
  applyToAntigravity,
  buildThemeCss
};
