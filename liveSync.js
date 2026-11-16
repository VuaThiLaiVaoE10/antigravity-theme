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

    /* 11. Composer Outer Border Gradient (Like Image 1) */
    .surface-composer {
      background: ${config.composerGradient || 'linear-gradient(90deg, #E6FF80 0%, #38EF7D 35%, #11998E 70%, #FFE066 100%)'} !important;
      padding: 2px !important;
      border-radius: ${config.composerRadius || 18}px !important;
      box-shadow: 0 0 ${config.composerGlow ?? 16}px rgba(125, 207, 255, 0.32) !important;
      position: relative !important;
      transition: all 0.3s ease !important;
    }

    /* 12. Composer Inner Card */
    .surface-composer-card {
      background: rgba(12, 22, 34, 0.88) !important;
      backdrop-filter: blur(20px) !important;
      border-radius: ${(config.composerRadius || 18) - 2}px !important;
    }

    /* 13. Corner Floral Ornament */
    ${config.ornament === 'floral-bird' ? `
    .surface-composer::before {
      content: '🕊️🌸';
      position: absolute;
      top: -24px;
      left: 12px;
      font-size: 20px;
      z-index: 50;
      pointer-events: none;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));
    }
    ` : ''}

    /* 14. Interactive Pet Mascot Entity */
    #ag-interactive-pet {
      position: fixed;
      z-index: 999999;
      cursor: pointer;
      user-select: none;
      transition: transform 0.2s ease, filter 0.2s ease;
      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
    }
    #ag-interactive-pet:hover {
      transform: scale(1.1) translateY(-2px);
    }
    #ag-interactive-pet:active {
      transform: scale(0.95);
    }
    .ag-pet-bubble {
      position: absolute;
      bottom: 100%;
      right: 0;
      margin-bottom: 8px;
      background: rgba(12, 24, 38, 0.95);
      border: 1px solid #7DCFFF;
      color: #fff;
      border-radius: 10px;
      padding: 6px 12px;
      font-size: 11px;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 4px 14px rgba(0,0,0,0.5);
      animation: agPop 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }
    .ag-pet-bubble::after {
      content: '';
      position: absolute;
      top: 100%;
      right: 18px;
      border-width: 5px;
      border-style: solid;
      border-color: #7DCFFF transparent transparent transparent;
    }
    @keyframes agPop {
      0% { opacity: 0; transform: scale(0.6); }
      100% { opacity: 1; transform: scale(1); }
    }
    /* 15. Dynamic Pet Animations */
    .anim-bob { animation: agPetBob 2.5s ease-in-out infinite alternate !important; }
    .anim-pulse { animation: agPetPulse 1.8s ease-in-out infinite !important; }
    .anim-sway { animation: agPetSway 2s ease-in-out infinite alternate !important; }
    .anim-glow { animation: agPetGlow 2s ease-in-out infinite alternate !important; }
    .anim-sleep { animation: agPetSleep 3s ease-in-out infinite alternate !important; }

    @keyframes agPetBob {
      0% { transform: translateY(0); }
      100% { transform: translateY(-8px); }
    }
    @keyframes agPetPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.14); }
      100% { transform: scale(1); }
    }
    @keyframes agPetSway {
      0% { transform: rotate(-8deg); }
      100% { transform: rotate(8deg); }
    }
    @keyframes agPetGlow {
      0% { filter: drop-shadow(0 0 5px #7DCFFF); }
      100% { filter: drop-shadow(0 0 20px #BB9AF7); }
    }
    @keyframes agPetSleep {
      0% { transform: translateY(0) scale(0.98); opacity: 0.85; }
      100% { transform: translateY(-4px) scale(1); opacity: 1; }
    }

    .wallpaper-breathing {
      animation: agBreathing 12s ease-in-out infinite alternate !important;
    }
    @keyframes agBreathing {
      0% { transform: scale(1); }
      100% { transform: scale(1.06); }
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
      const fit = config.wallpaperFit || 'cover';
      const bgSize = fit === 'contain' ? 'contain' : fit === 'stretch' ? '100% 100%' : fit === 'center' ? 'auto' : 'cover';

      const evalScript = `(() => {
        try {
          // 1. Wallpaper Layer
          let bg = document.getElementById('ag-theme-bg');
          if (!bg) {
            bg = document.createElement('div');
            bg.id = 'ag-theme-bg';
            bg.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none;background-size:${bgSize};background-position:center;background-repeat:no-repeat;transition:background-image 0.4s ease, opacity 0.3s ease;';
            document.body.prepend(bg);
          }
          bg.style.backgroundSize = '${bgSize}';
          bg.style.backgroundRepeat = 'no-repeat';
          bg.style.backgroundPosition = 'center';
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

          // 3. Injected Interactive Pet Mascot
          let pet = document.getElementById('ag-interactive-pet');
          if (!pet) {
            pet = document.createElement('div');
            pet.id = 'ag-interactive-pet';
            document.body.appendChild(pet);
          }

          const mascotUrl = ${JSON.stringify(config.mascotUrl || '')};
          if (mascotUrl) {
            pet.style.display = 'block';
            pet.style.backgroundImage = 'url(' + mascotUrl + ')';
            pet.style.backgroundSize = 'contain';
            pet.style.backgroundRepeat = 'no-repeat';
            pet.style.backgroundPosition = 'center bottom';
            const sz = ${config.mascotSize || 52};
            pet.style.width = sz + 'px';
            pet.style.height = sz + 'px';

            const comp = document.querySelector('.surface-composer');
            if (comp && '${config.mascotPos || 'top-right'}' !== 'bottom-right') {
              const r = comp.getBoundingClientRect();
              pet.style.bottom = (window.innerHeight - r.top - 4) + 'px';
              if ('${config.mascotPos || 'top-right'}' === 'top-left') {
                pet.style.left = (r.left + 24) + 'px';
                pet.style.right = 'auto';
              } else {
                pet.style.right = (window.innerWidth - r.right + 24) + 'px';
                pet.style.left = 'auto';
              }
            } else {
              pet.style.bottom = '24px';
              pet.style.right = '28px';
              pet.style.left = 'auto';
            }

            pet.className = 'anim-${config.petAnim || 'bob'}';

            // Click Interaction: Popup Speech Bubble
            pet.onclick = () => {
              let bubble = document.getElementById('ag-pet-bubble');
              if (bubble) bubble.remove();
              bubble = document.createElement('div');
              bubble.id = 'ag-pet-bubble';
              bubble.className = 'ag-pet-bubble';
              bubble.textContent = ${JSON.stringify(config.petSpeech || 'Chủ nhân cố lên nhé! Hôm nay code gì thế ạ? ✨')};
              pet.appendChild(bubble);
              setTimeout(() => { if (bubble) bubble.remove(); }, 4500);
            };
          } else {
            pet.style.display = 'none';
          }

          // 4. Live Wallpaper Effects (Canvas particles)
          let cv = document.getElementById('ag-theme-canvas-fx');
          const fx = '${config.wallpaperFx || 'none'}';
          if (fx !== 'none' && fx !== 'breathing') {
            if (!cv) {
              cv = document.createElement('canvas');
              cv.id = 'ag-theme-canvas-fx';
              cv.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none;';
              document.body.prepend(cv);
            }
            cv.width = window.innerWidth;
            cv.height = window.innerHeight;
            const ctx = cv.getContext('2d');
            const pts = [];
            const count = fx === 'rain' ? 60 : 35;
            for (let i = 0; i < count; i++) {
              pts.push({
                x: Math.random() * cv.width,
                y: Math.random() * cv.height,
                r: fx === 'fireflies' ? (Math.random() * 2.5 + 1.5) : (Math.random() * 3 + 1),
                d: Math.random() * 2 + 1,
                s: Math.random() * 1.5 + 0.5
              });
            }
            if (window._agFxLoop) cancelAnimationFrame(window._agFxLoop);
            const draw = () => {
              ctx.clearRect(0, 0, cv.width, cv.height);
              ctx.fillStyle = fx === 'snow' ? 'rgba(255, 230, 240, 0.75)' : fx === 'fireflies' ? 'rgba(255, 230, 100, 0.8)' : 'rgba(125, 207, 255, 0.6)';
              pts.forEach(p => {
                ctx.beginPath();
                if (fx === 'rain') {
                  ctx.rect(p.x, p.y, 1.5, 8);
                } else {
                  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                }
                ctx.fill();
                p.y += p.s * (fx === 'rain' ? 4 : 1);
                if (fx === 'fireflies') p.x += Math.sin(p.y * 0.05) * 0.8;
                if (p.y > cv.height) { p.y = -10; p.x = Math.random() * cv.width; }
              });
              window._agFxLoop = requestAnimationFrame(draw);
            };
            draw();
          } else {
            if (cv) cv.remove();
            if (window._agFxLoop) cancelAnimationFrame(window._agFxLoop);
          }

          if (bg) {
            if (fx === 'breathing') bg.classList.add('wallpaper-breathing');
            else bg.classList.remove('wallpaper-breathing');
          }

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
