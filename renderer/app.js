/**
 * Antigravity Theme Studio - Renderer Logic
 */

const I18N = {
  vi: {
    tabWallpaper: 'Hình nền',
    tabColors: 'Màu & Avatar',
    tabGlass: 'Kính & Mờ',
    tabProfiles: 'Hồ sơ',
    tabAdvanced: 'Nâng cao',
    wallpaperSelect: 'CHỌN HÌNH NỀN CHO ANTIGRAVITY',
    pickImageBtn: 'Chọn ảnh từ máy tính...',
    presetWallpapers: 'HÌNH NỀN MẪU CÓ SẴN (PRESETS)',
    wallpaperSliders: 'TÙY CHỈNH HÌNH NỀN',
    wpOpacity: 'Độ hiển thị ảnh nền',
    quickPalettesTitle: 'BẢNG MÀU NHANH (GIỮ NGUYÊN HÌNH NỀN)',
    paletteDark: '🌙 Bảng màu Dark',
    paletteLight: '☀️ Bảng màu Light',
    gradientTitle: 'GRADIENT KHUNG NHẬP & BONG BÓNG USER',
    glassTitle: 'HIỆU ỨNG KÍNH MỜ (GLASSMORPHISM)',
    blurLabel: 'Độ mờ hậu cảnh (Backdrop Blur)',
    sidebarOpacityLabel: 'Độ mờ thanh Sidebar',
    cardOpacityLabel: 'Độ mờ thẻ Card / Hộp thoại',
    scrimOpacityLabel: 'Độ phủ tối Scrim',
    savedProfiles: 'DANH SÁCH HỒ SƠ THEME',
    btnSaveNewProfile: '+ Lưu thành hồ sơ mới',
    modStatusTitle: 'TRẠNG THÁI THEME MOD ANTIGRAVITY',
    installModBtn: 'Cài đặt Theme Mod vào Antigravity',
    installModDesc: 'Tự động sao lưu an toàn và kích hoạt khả năng đổi hình nền & kính mờ.',
    restoreModBtn: 'Khôi phục Antigravity nguyên bản',
    restoreModDesc: 'Gỡ bỏ mod và hoàn trả Antigravity 100% về trạng thái gốc của Google.',
    restartAgBtn: 'Khởi động lại Antigravity',
    restartAgDesc: 'Khởi động lại app Antigravity để nạp lại giao diện.',
    labelSave: 'Lưu & Chạy',
    statusReady: 'Sẵn sàng. Chọn ảnh và nhấn Lưu & Chạy!',
    statusSaved: 'Đã lưu và đồng bộ sang Antigravity!',
    statusModInstalled: 'Đã cài đặt Mod vào Antigravity thành công!',
    statusRestored: 'Đã khôi phục Antigravity nguyên bản!'
  },
  en: {
    tabWallpaper: 'Wallpaper',
    tabColors: 'Colors & Avatar',
    tabGlass: 'Glass & Blur',
    tabProfiles: 'Profiles',
    tabAdvanced: 'Advanced',
    wallpaperSelect: 'SELECT WALLPAPER FOR ANTIGRAVITY',
    pickImageBtn: 'Pick image from computer...',
    presetWallpapers: 'BUILT-IN WALLPAPER PRESETS',
    wallpaperSliders: 'WALLPAPER SETTINGS',
    wpOpacity: 'Wallpaper Opacity',
    quickPalettesTitle: 'QUICK PALETTES (PRESERVES WALLPAPER)',
    paletteDark: '🌙 Dark Palette',
    paletteLight: '☀️ Light Palette',
    gradientTitle: 'COMPOSER GRADIENT & USER BUBBLE',
    glassTitle: 'GLASSMORPHISM & BLUR EFFECTS',
    blurLabel: 'Backdrop Blur',
    sidebarOpacityLabel: 'Sidebar Opacity',
    cardOpacityLabel: 'Card & Dialog Opacity',
    scrimOpacityLabel: 'Scrim Dimming',
    savedProfiles: 'SAVED THEME PROFILES',
    btnSaveNewProfile: '+ Save as New Profile',
    modStatusTitle: 'ANTIGRAVITY THEME MOD STATUS',
    installModBtn: 'Install Theme Mod into Antigravity',
    installModDesc: 'Safely backup and enable wallpaper & glassmorphism customizer.',
    restoreModBtn: 'Restore Original Antigravity',
    restoreModDesc: 'Uninstall mod and revert 100% back to Google stock state.',
    restartAgBtn: 'Restart Antigravity',
    restartAgDesc: 'Relaunch Antigravity desktop app to reload UI.',
    labelSave: 'Save & Apply',
    statusReady: 'Ready. Pick an image and click Save & Apply!',
    statusSaved: 'Saved and synced to Antigravity!',
    statusModInstalled: 'Theme Mod successfully installed into Antigravity!',
    statusRestored: 'Antigravity successfully restored to stock!'
  }
};

const COLOR_NAMES = {
  vi: {
    bgChrome: 'Nền Chrome',
    fgChrome: 'Chữ Chrome',
    accentPrimary: 'Nhấn chính',
    blue: 'Xanh Blue',
    aqua: 'Ngọc Aqua',
    green: 'Xanh lá',
    pink: 'Hồng Pink',
    violet: 'Tím Violet',
    orange: 'Cam Orange',
    fgMain: 'Chữ chính',
    fgSecondary: 'Chữ phụ',
    fgMuted: 'Chữ mờ',
    bgCard: 'Nền Card',
    bgSidebar: 'Nền Sidebar',
    bgPopup: 'Nền Popup',
    scrim: 'Màu phủ Scrim',
    selection: 'Vùng chọn',
    composerBorder1: 'Viền Composer 1',
    composerBorder2: 'Viền Composer 2',
    composerBorder3: 'Viền Composer 3',
    composerBg1: 'Nền Composer 1',
    composerBg2: 'Nền Composer 2',
    composerBg3: 'Nền Composer 3',
    userBubble1: 'Bong bóng User 1',
    userBubble2: 'Bong bóng User 2',
    userBubbleBorder: 'Viền Bong bóng'
  },
  en: {
    bgChrome: 'Chrome BG',
    fgChrome: 'Chrome FG',
    accentPrimary: 'Primary Accent',
    blue: 'Blue',
    aqua: 'Aqua',
    green: 'Green',
    pink: 'Pink',
    violet: 'Violet',
    orange: 'Orange',
    fgMain: 'Main Text',
    fgSecondary: 'Secondary Text',
    fgMuted: 'Muted Text',
    bgCard: 'Card BG',
    bgSidebar: 'Sidebar BG',
    bgPopup: 'Popup BG',
    scrim: 'Scrim BG',
    selection: 'Selection',
    composerBorder1: 'Composer Border 1',
    composerBorder2: 'Composer Border 2',
    composerBorder3: 'Composer Border 3',
    composerBg1: 'Composer BG 1',
    composerBg2: 'Composer BG 2',
    composerBg3: 'Composer BG 3',
    userBubble1: 'User Bubble 1',
    userBubble2: 'User Bubble 2',
    userBubbleBorder: 'Bubble Border'
  }
};

let appState = null;
let palettesList = [];
let modStatus = null;
let activeSubtab = 'dark'; // 'dark' | 'light'

// === DOM ELEMENTS ===
const badgePalette = document.getElementById('badgePalette');
const btnToggleMode = document.getElementById('btnToggleMode');
const labelMode = document.getElementById('labelMode');
const btnToggleLang = document.getElementById('btnToggleLang');
const btnSaveApply = document.getElementById('btnSaveApply');
const labelSave = document.getElementById('labelSave');
const statusMessage = document.getElementById('statusMessage');

const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

const btnBrowseWallpaper = document.getElementById('btnBrowseWallpaper');
const currentWpName = document.getElementById('currentWpName');
const wpPresetsGrid = document.getElementById('wpPresetsGrid');
const sliderWpOpacity = document.getElementById('sliderWpOpacity');
const valWpOpacity = document.getElementById('valWpOpacity');

const quickPalettesGrid = document.getElementById('quickPalettesGrid');
const subtabDark = document.getElementById('subtabDark');
const subtabLight = document.getElementById('subtabLight');
const colorTokensGrid = document.getElementById('colorTokensGrid');
const gradientTokensGrid = document.getElementById('gradientTokensGrid');

const sliderBlur = document.getElementById('sliderBlur');
const valBlur = document.getElementById('valBlur');
const sliderSidebarOpacity = document.getElementById('sliderSidebarOpacity');
const valSidebarOpacity = document.getElementById('valSidebarOpacity');
const sliderCardOpacity = document.getElementById('sliderCardOpacity');
const valCardOpacity = document.getElementById('valCardOpacity');
const sliderScrimOpacity = document.getElementById('sliderScrimOpacity');
const valScrimOpacity = document.getElementById('valScrimOpacity');

const modStatusDot = document.getElementById('modStatusDot');
const modStatusText = document.getElementById('modStatusText');
const modStatusDesc = document.getElementById('modStatusDesc');
const btnInstallMod = document.getElementById('btnInstallMod');
const btnRestoreOriginal = document.getElementById('btnRestoreOriginal');
const btnRestartAntigravity = document.getElementById('btnRestartAntigravity');

// Preview Elements
const previewWallpaper = document.getElementById('previewWallpaper');
const previewSidebar = document.getElementById('previewSidebar');
const previewUserBubble = document.getElementById('previewUserBubble');
const previewComposer = document.getElementById('previewComposer');

// === INITIALIZATION ===
async function init() {
  setupTabs();
  setupEvents();

  if (window.api) {
    const data = await window.api.getState();
    appState = data.config;
    palettesList = data.palettes || [];
    modStatus = data.status;
  } else {
    // Fallback for browser mock
    appState = {
      activePaletteId: 'midnight-aqua',
      mode: 'dark',
      language: 'vi',
      wallpaperName: 'Cô gái kéo đàn ngắm Trái Đất (Mặc định)',
      wallpaperUrl: '',
      glass: { blur: 16, sidebarOpacity: 75, cardOpacity: 85, scrimOpacity: 60, wallpaperOpacity: 95 }
    };
  }

  activeSubtab = appState.mode || 'dark';
  applyLanguage(appState.language || 'vi');
  renderQuickPalettes();
  renderColorTokens();
  renderGradientTokens();
  renderWallpaperPresets();
  renderSliders();
  renderModStatus();
  updateLivePreview();
}

// === TABS SETUP ===
function setupTabs() {
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const pane = document.getElementById(targetId);
      if (pane) pane.classList.add('active');
    });
  });

  subtabDark.addEventListener('click', () => {
    subtabDark.classList.add('active');
    subtabLight.classList.remove('active');
    activeSubtab = 'dark';
    renderColorTokens();
    renderGradientTokens();
    updateLivePreview();
  });

  subtabLight.addEventListener('click', () => {
    subtabLight.classList.add('active');
    subtabDark.classList.remove('active');
    activeSubtab = 'light';
    renderColorTokens();
    renderGradientTokens();
    updateLivePreview();
  });
}

// === EVENTS SETUP ===
function setupEvents() {
  btnToggleMode.addEventListener('click', () => {
    appState.mode = appState.mode === 'dark' ? 'light' : 'dark';
    activeSubtab = appState.mode;
    if (activeSubtab === 'dark') {
      subtabDark.classList.add('active');
      subtabLight.classList.remove('active');
    } else {
      subtabLight.classList.add('active');
      subtabDark.classList.remove('active');
    }
    labelMode.textContent = appState.mode === 'dark' ? 'Dark' : 'Light';
    btnToggleMode.querySelector('.mode-icon').textContent = appState.mode === 'dark' ? '🌙' : '☀️';
    renderColorTokens();
    renderGradientTokens();
    updateLivePreview();
  });

  btnToggleLang.addEventListener('click', () => {
    appState.language = appState.language === 'vi' ? 'en' : 'vi';
    btnToggleLang.textContent = appState.language.toUpperCase();
    applyLanguage(appState.language);
    renderColorTokens();
    renderGradientTokens();
  });

  btnBrowseWallpaper.addEventListener('click', async () => {
    if (!window.api) return;
    const res = await window.api.selectWallpaper();
    if (res && !res.canceled && res.dataUrl) {
      appState.wallpaperUrl = res.dataUrl;
      appState.wallpaperName = res.fileName;
      currentWpName.textContent = res.fileName;
      showStatus('Đã chọn hình nền: ' + res.fileName);

      // Inspect image dimensions and detect aspect ratio
      detectImageResolution(res.dataUrl);

      updateLivePreview();
      // Auto save & apply!
      await saveConfig();
    }
  });

  // Optimize to 1920x1080 Canvas Tool
  const btnOptimize1080 = document.getElementById('btnOptimize1080');
  if (btnOptimize1080) {
    btnOptimize1080.addEventListener('click', async () => {
      if (!appState.wallpaperUrl) return;
      showStatus('Đang tối ưu ảnh về độ phân giải chuẩn 1920x1080...');
      try {
        const optimized = await cropAndResizeTo1080p(appState.wallpaperUrl);
        appState.wallpaperUrl = optimized;
        const badgeWpRes = document.getElementById('badgeWpRes');
        if (badgeWpRes) badgeWpRes.textContent = '🖥️ Đã chuẩn hóa 1920x1080 (16:9 Full HD)';
        showStatus('✓ Đã chuẩn hóa hình nền về 1920x1080 chuẩn nét!');
        updateLivePreview();
        await saveConfig();
      } catch (e) {
        showStatus('Lỗi khi tối ưu: ' + e.message);
      }
    });
  }

  // === COMPOSER PRESETS & MASCOT PET HANDLERS ===
  const COMPOSER_PRESETS = {
    lime: 'linear-gradient(90deg, #E6FF80 0%, #38EF7D 35%, #11998E 70%, #FFE066 100%)',
    aqua: 'linear-gradient(90deg, #7DCFFF 0%, #73DACA 50%, #2AC3DE 100%)',
    sakura: 'linear-gradient(90deg, #F7768E 0%, #BB9AF7 50%, #FF9E64 100%)',
    sunset: 'linear-gradient(90deg, #FF9E64 0%, #F7768E 50%, #FFE066 100%)'
  };

  document.querySelectorAll('.comp-preset-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.comp-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const p = btn.getAttribute('data-preset');
      appState.composerGradient = COMPOSER_PRESETS[p] || COMPOSER_PRESETS.lime;
      showStatus(`Đã áp dụng viền Composer: ${btn.textContent.trim()}`);
      updateLivePreview();
      await saveConfig();
    });
  });

  // === 4-STOP GRADIENT COLOR PICKERS ===
  function updateCustomGradient() {
    const c1 = document.getElementById('pickGrad1')?.value || '#E6FF80';
    const c2 = document.getElementById('pickGrad2')?.value || '#38EF7D';
    const c3 = document.getElementById('pickGrad3')?.value || '#11998E';
    const c4 = document.getElementById('pickGrad4')?.value || '#FFE066';
    appState.composerGradient = `linear-gradient(90deg, ${c1} 0%, ${c2} 35%, ${c3} 70%, ${c4} 100%)`;
    updateLivePreview();
    saveConfig();
  }

  [1, 2, 3, 4].forEach(i => {
    const pick = document.getElementById(`pickGrad${i}`);
    const hex = document.getElementById(`hexGrad${i}`);
    if (pick && hex) {
      pick.addEventListener('input', (e) => {
        hex.value = e.target.value.toUpperCase();
        updateCustomGradient();
      });
      hex.addEventListener('input', (e) => {
        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
          pick.value = e.target.value;
          updateCustomGradient();
        }
      });
    }
  });

  const sliderCompRadius = document.getElementById('sliderCompRadius');
  const valCompRadius = document.getElementById('valCompRadius');
  if (sliderCompRadius && valCompRadius) {
    sliderCompRadius.addEventListener('input', async (e) => {
      valCompRadius.textContent = e.target.value + 'px';
      appState.composerRadius = parseInt(e.target.value);
      updateLivePreview();
      await saveConfig();
    });
  }

  const sliderCompGlow = document.getElementById('sliderCompGlow');
  const valCompGlow = document.getElementById('valCompGlow');
  if (sliderCompGlow && valCompGlow) {
    sliderCompGlow.addEventListener('input', async (e) => {
      valCompGlow.textContent = e.target.value + 'px';
      appState.composerGlow = parseInt(e.target.value);
      updateLivePreview();
      await saveConfig();
    });
  }

  // Pet Inputs (Name & Speech)
  const inputPetName = document.getElementById('inputPetName');
  if (inputPetName) {
    inputPetName.addEventListener('input', (e) => {
      appState.petName = e.target.value;
      saveConfig();
    });
  }

  const inputPetSpeech = document.getElementById('inputPetSpeech');
  if (inputPetSpeech) {
    inputPetSpeech.addEventListener('input', (e) => {
      appState.petSpeech = e.target.value;
      saveConfig();
    });
  }

  // Upload Custom Pet in Tab 4
  const btnUploadPetCustom = document.getElementById('btnUploadPetCustom');
  if (btnUploadPetCustom) {
    btnUploadPetCustom.addEventListener('click', async () => {
      if (!window.api) return;
      const res = await window.api.selectWallpaper();
      if (res && !res.canceled && res.dataUrl) {
        document.querySelectorAll('#mascotPresetsGrid2 .mascot-card').forEach(c => c.classList.remove('active'));
        btnUploadPetCustom.classList.add('active');
        appState.mascotType = 'custom';
        appState.mascotUrl = res.dataUrl;
        showStatus('Đã tải ảnh Pet riêng của bạn: ' + res.fileName);
        updateLivePreview();
        await saveConfig();
      }
    });
  }

  // Corner Ornaments
  document.querySelectorAll('.ornament-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.ornament-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const orn = btn.getAttribute('data-ornament');
      appState.ornament = orn;
      showStatus(`Đã chọn họa tiết góc: ${btn.textContent.trim()}`);
      updateLivePreview();
      await saveConfig();
    });
  });

  // Mascot Selection
  document.querySelectorAll('.mascot-card').forEach(card => {
    card.addEventListener('click', async () => {
      const type = card.getAttribute('data-mascot');
      if (type === 'custom') {
        // Handled by upload button
        return;
      }
      document.querySelectorAll('.mascot-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      if (type === 'pixel-pet') {
        // Load built-in pixel pet
        appState.mascotType = 'pixel-pet';
        appState.mascotUrl = '../assets/mascot-pixel-pet.png';
        showStatus('Đã chọn Mascot: Pixel Golem Pet (Ảnh 2)');
      } else if (type === 'waifu') {
        appState.mascotType = 'waifu';
        appState.mascotUrl = '../assets/composer-banner.jpg';
        showStatus('Đã chọn Mascot: Anime Waifu (Ảnh 1)');
      } else {
        appState.mascotType = 'none';
        appState.mascotUrl = '';
        showStatus('Đã tắt Mascot');
      }

      updateLivePreview();
      await saveConfig();
    });
  });

  const btnUploadMascot = document.getElementById('btnUploadMascot');
  if (btnUploadMascot) {
    btnUploadMascot.addEventListener('click', async () => {
      if (!window.api) return;
      const res = await window.api.selectWallpaper();
      if (res && !res.canceled && res.dataUrl) {
        document.querySelectorAll('.mascot-card').forEach(c => c.classList.remove('active'));
        btnUploadMascot.classList.add('active');
        appState.mascotType = 'custom';
        appState.mascotUrl = res.dataUrl;
        showStatus('Đã tải ảnh Mascot tùy chỉnh: ' + res.fileName);
        updateLivePreview();
        await saveConfig();
      }
    });
  }

  const selectMascotPos = document.getElementById('selectMascotPos');
  if (selectMascotPos) {
    selectMascotPos.addEventListener('change', async (e) => {
      appState.mascotPos = e.target.value;
      updateLivePreview();
      await saveConfig();
    });
  }

  const sliderMascotSize = document.getElementById('sliderMascotSize');
  const valMascotSize = document.getElementById('valMascotSize');
  if (sliderMascotSize) {
    sliderMascotSize.addEventListener('input', async (e) => {
      const sz = parseInt(e.target.value);
      valMascotSize.textContent = sz + 'px';
      appState.mascotSize = sz;
      updateLivePreview();
      await saveConfig();
    });
  }

  const chkMascotBounce = document.getElementById('chkMascotBounce');
  if (chkMascotBounce) {
    chkMascotBounce.addEventListener('change', async (e) => {
      appState.mascotBounce = e.target.checked;
      updateLivePreview();
      await saveConfig();
    });
  }

  // Resolution Segments Selection
  document.querySelectorAll('.segment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetRes = btn.getAttribute('data-res');
      appState.targetResolution = targetRes;
      showStatus(`Đã chọn phân khúc độ phân giải: ${btn.textContent.trim()}`);
    });
  });

  // Fit Modes Selection (Cover, Contain, Stretch, Center)
  document.querySelectorAll('.fit-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.fit-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const fit = btn.getAttribute('data-fit');
      appState.wallpaperFit = fit;
      updateLivePreview();
      showStatus(`Chế độ căn chỉnh hình nền: ${fit.toUpperCase()}`);
      await saveConfig();
    });
  });

  // Category Filter Tabs
  document.querySelectorAll('.cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cat = tab.getAttribute('data-cat');
      renderWallpaperPresets(cat);
    });
  });

  // Glassmorphism Tiers (Subtle, Deep, Ultra, Cyber)
  document.querySelectorAll('.tier-card').forEach(card => {
    card.addEventListener('click', async () => {
      document.querySelectorAll('.tier-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const tier = card.getAttribute('data-tier');
      applyGlassTier(tier);
      updateLivePreview();
      await saveConfig();
    });
  });

  sliderWpOpacity.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    valWpOpacity.textContent = val + '%';
    appState.glass.wallpaperOpacity = val;
    updateLivePreview();
  });

  sliderBlur.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    valBlur.textContent = val + 'px';
    appState.glass.blur = val;
    updateLivePreview();
  });

  sliderSidebarOpacity.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    valSidebarOpacity.textContent = val + '%';
    appState.glass.sidebarOpacity = val;
    updateLivePreview();
  });

  sliderCardOpacity.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    valCardOpacity.textContent = val + '%';
    appState.glass.cardOpacity = val;
    updateLivePreview();
  });

  sliderScrimOpacity.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    valScrimOpacity.textContent = val + '%';
    appState.glass.scrimOpacity = val;
    updateLivePreview();
  });

  btnSaveApply.addEventListener('click', async () => {
    await saveConfig();
  });

  btnInstallMod.addEventListener('click', async () => {
    if (!window.api) return;
    btnInstallMod.disabled = true;
    showStatus('Đang sao lưu và cài đặt Mod vào Antigravity...');
    const res = await window.api.installMod();
    btnInstallMod.disabled = false;
    if (res.success) {
      showStatus(I18N[appState.language].statusModInstalled);
      modStatus.isPatched = true;
      modStatus.backupExists = true;
      renderModStatus();
    } else {
      alert('Lỗi: ' + res.error);
    }
  });

  const btnToggleAutoLaunch = document.getElementById('btnToggleAutoLaunch');
  const labelAutoLaunch = document.getElementById('labelAutoLaunch');

  if (window.api && window.api.getAutoLaunch && labelAutoLaunch) {
    window.api.getAutoLaunch().then(res => {
      if (res && res.openAtLogin) {
        labelAutoLaunch.textContent = 'Khởi động cùng Windows: BẬT';
        btnToggleAutoLaunch.classList.add('active');
      } else {
        labelAutoLaunch.textContent = 'Khởi động cùng Windows: TẮT';
        btnToggleAutoLaunch.classList.remove('active');
      }
    });
  }

  if (btnToggleAutoLaunch) {
    btnToggleAutoLaunch.addEventListener('click', async () => {
      if (!window.api || !window.api.setAutoLaunch) return;
      const cur = btnToggleAutoLaunch.classList.contains('active');
      const res = await window.api.setAutoLaunch(!cur);
      if (res && res.success) {
        if (res.openAtLogin) {
          labelAutoLaunch.textContent = 'Khởi động cùng Windows: BẬT';
          btnToggleAutoLaunch.classList.add('active');
          showStatus('✓ Đã bật tự động chạy ngầm cùng Windows để giữ theme vĩnh viễn!');
        } else {
          labelAutoLaunch.textContent = 'Khởi động cùng Windows: TẮT';
          btnToggleAutoLaunch.classList.remove('active');
          showStatus('Đã tắt khởi động cùng Windows.');
        }
      }
    });
  }

  btnRestoreOriginal.addEventListener('click', async () => {
    if (!window.api) return;
    if (!confirm('Bạn có chắc chắn muốn gỡ bỏ Theme Mod và khôi phục Antigravity về nguyên bản 100%?')) return;
    const res = await window.api.restoreOriginal();
    if (res.success) {
      showStatus(I18N[appState.language].statusRestored);
      modStatus.isPatched = false;
      renderModStatus();
    } else {
      alert('Lỗi: ' + res.error);
    }
  });

  btnRestartAntigravity.addEventListener('click', async () => {
    if (!window.api) return;
    showStatus('Đang khởi động lại Antigravity...');
    await window.api.restartAntigravity();
  });
}

async function saveConfig() {
  if (!window.api) return;
  showStatus('Đang lưu và đồng bộ sang Antigravity...');
  const res = await window.api.saveConfig(appState);
  if (res.success) {
    if (res.liveSynced) {
      showStatus('✓ Đã áp dụng theme sang Antigravity thành công!');
    } else {
      showStatus(I18N[appState.language].statusSaved);
    }
  } else {
    alert('Lỗi khi lưu: ' + res.error);
  }
}

function showStatus(msg) {
  statusMessage.textContent = msg;
  statusMessage.style.color = '#7DCFFF';
}

function applyLanguage(lang) {
  const dict = I18N[lang] || I18N.vi;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  labelSave.textContent = dict.labelSave;
}

// === QUICK PALETTES ===
function renderQuickPalettes() {
  quickPalettesGrid.innerHTML = '';
  palettesList.forEach(p => {
    const btn = document.createElement('button');
    btn.className = `palette-btn ${p.id === appState.activePaletteId ? 'active' : ''}`;
    btn.innerHTML = `
      <span class="palette-dot" style="background:${p.swatch}"></span>
      <span>${p.name}</span>
    `;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.activePaletteId = p.id;
      badgePalette.textContent = p.id;
      // Copy palette colors into state
      appState.palette = {
        dark: JSON.parse(JSON.stringify(p.dark)),
        light: JSON.parse(JSON.stringify(p.light))
      };
      renderColorTokens();
      renderGradientTokens();
      updateLivePreview();
      showStatus(`Đã đổi bảng màu ${p.name}`);
    });
    quickPalettesGrid.appendChild(btn);
  });
}

// === COLOR TOKENS ===
function renderColorTokens() {
  colorTokensGrid.innerHTML = '';
  const mode = activeSubtab;
  const currentSet = appState.palette[mode] || {};
  const colors = currentSet.colors || {};
  const names = COLOR_NAMES[appState.language] || COLOR_NAMES.vi;

  Object.entries(colors).forEach(([key, hex]) => {
    const row = document.createElement('div');
    row.className = 'token-row';
    row.innerHTML = `
      <span class="token-label">${names[key] || key}</span>
      <div class="token-controls">
        <span class="token-hex" id="hex_${key}">${hex}</span>
        <input type="color" value="${hex}" id="picker_${key}">
      </div>
    `;

    const picker = row.querySelector(`#picker_${key}`);
    const hexText = row.querySelector(`#hex_${key}`);
    picker.addEventListener('input', (e) => {
      const val = e.target.value.toUpperCase();
      hexText.textContent = val;
      colors[key] = val;
      updateLivePreview();
    });

    colorTokensGrid.appendChild(row);
  });
}

// === GRADIENT TOKENS ===
function renderGradientTokens() {
  gradientTokensGrid.innerHTML = '';
  const mode = activeSubtab;
  const currentSet = appState.palette[mode] || {};
  const grads = currentSet.gradients || {};
  const names = COLOR_NAMES[appState.language] || COLOR_NAMES.vi;

  Object.entries(grads).forEach(([key, hex]) => {
    const row = document.createElement('div');
    row.className = 'token-row';
    row.innerHTML = `
      <span class="token-label">${names[key] || key}</span>
      <div class="token-controls">
        <span class="token-hex" id="hex_${key}">${hex}</span>
        <input type="color" value="${hex}" id="picker_${key}">
      </div>
    `;

    const picker = row.querySelector(`#picker_${key}`);
    const hexText = row.querySelector(`#hex_${key}`);
    picker.addEventListener('input', (e) => {
      const val = e.target.value.toUpperCase();
      hexText.textContent = val;
      grads[key] = val;
      updateLivePreview();
    });

    gradientTokensGrid.appendChild(row);
  });
}

// === WALLPAPER PRESETS DATABASE (CATEGORIES & RESOLUTIONS) ===
const WALLPAPER_PRESETS = [
  { id: 'violinist', cat: 'anime', name: 'Cô gái kéo đàn ngắm Trái Đất', res: '1920x1080', bg: 'linear-gradient(135deg, #091c2b, #15334c)' },
  { id: 'kindred', cat: 'anime', name: 'Kindred Spirit Hunters', res: '1920x1080', bg: 'linear-gradient(135deg, #180926, #321045)' },
  { id: 'cyberpunk-girl', cat: 'anime', name: 'Cyberpunk Girl Horizon', res: '1920x1080', bg: 'linear-gradient(135deg, #081a26, #2a1130)' },
  { id: 'tokyo-rain', cat: 'city', name: 'Tokyo Midnight Rain', res: '1920x1080', bg: 'linear-gradient(135deg, #0d1b2a, #1b263b)' },
  { id: 'neo-seoul', cat: 'city', name: 'Neo Seoul Sunset Horizon', res: '2560x1440', bg: 'linear-gradient(135deg, #2b0e1d, #4c1833)' },
  { id: 'neon-alley', cat: 'city', name: 'Cyber Neon Alley 1080p', res: '1920x1080', bg: 'linear-gradient(135deg, #0f0c29, #302b63)' },
  { id: 'frosted-blue', cat: 'minimal', name: 'Deep Frosted Glass Aura', res: '1920x1080', bg: 'linear-gradient(135deg, #081826, #15415E)' },
  { id: 'nebula', cat: 'minimal', name: 'Cosmic 4K Nebula', res: '3840x2160', bg: 'linear-gradient(135deg, #160a29, #281140)' },
  { id: 'sakura-glass', cat: 'minimal', name: 'Sakura Dusk Glassmorphism', res: '1920x1080', bg: 'linear-gradient(135deg, #2b1220, #421c32)' },
  { id: 'synthwave', cat: 'pixel', name: 'Synthwave Neon Sun Grid', res: '1920x1080', bg: 'linear-gradient(135deg, #1a0826, #3f0d40)' },
  { id: 'pixel-room', cat: 'pixel', name: '8-Bit Cozy Lofi Room', res: '1920x1080', bg: 'linear-gradient(135deg, #1a1c29, #292e42)' },
  { id: 'ultrawide-cyber', cat: 'minimal', name: 'Ultrawide Cyber Deep Blue', res: '2560x1080', bg: 'linear-gradient(135deg, #040d14, #0d283e)' }
];

function renderWallpaperPresets(filterCat = 'all') {
  wpPresetsGrid.innerHTML = '';
  const list = filterCat === 'all' ? WALLPAPER_PRESETS : WALLPAPER_PRESETS.filter(p => p.cat === filterCat);

  list.forEach(p => {
    const card = document.createElement('div');
    card.className = `wp-preset-card ${appState.wallpaperName?.includes(p.name) ? 'active' : ''}`;
    card.style.background = p.bg;
    card.innerHTML = `
      <span class="wp-preset-title">${p.name}</span>
      <span style="font-size:9px;color:rgba(125,207,255,0.85);margin-top:2px;">${p.res}</span>
    `;
    card.addEventListener('click', async () => {
      document.querySelectorAll('.wp-preset-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentWpName.textContent = `${p.name} (${p.res})`;
      appState.wallpaperName = p.name;
      const badgeWpRes = document.getElementById('badgeWpRes');
      if (badgeWpRes) badgeWpRes.textContent = `🖥️ Chuẩn ${p.res}`;
      updateLivePreview();
      await saveConfig();
    });
    wpPresetsGrid.appendChild(card);
  });
}

function detectImageResolution(dataUrl) {
  const img = new Image();
  img.onload = () => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const ratio = (w / h).toFixed(2);
    let ratioLabel = '16:9';
    if (Math.abs(ratio - 1.78) < 0.05) ratioLabel = '16:9 Full HD';
    else if (Math.abs(ratio - 2.33) < 0.1) ratioLabel = '21:9 Ultrawide';
    else if (Math.abs(ratio - 0.56) < 0.05) ratioLabel = '9:16 Dọc';
    else if (Math.abs(ratio - 1.33) < 0.05) ratioLabel = '4:3 Standard';

    const badgeWpRes = document.getElementById('badgeWpRes');
    if (badgeWpRes) {
      badgeWpRes.textContent = `🖥️ ${w}x${h} (${ratioLabel})`;
    }
  };
  img.src = dataUrl;
}

function cropAndResizeTo1080p(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const targetW = 1920;
      const targetH = 1080;
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      // Cover scaling math
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;
      const srcRatio = srcW / srcH;
      const targetRatio = targetW / targetH;

      let renderW, renderH, offsetX, offsetY;
      if (srcRatio > targetRatio) {
        renderH = targetH;
        renderW = srcW * (targetH / srcH);
        offsetX = (targetW - renderW) / 2;
        offsetY = 0;
      } else {
        renderW = targetW;
        renderH = srcH * (targetW / srcW);
        offsetX = 0;
        offsetY = (targetH - renderH) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
      resolve(canvas.toDataURL('image/jpeg', 0.94));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function applyGlassTier(tier) {
  const g = appState.glass || {};
  switch (tier) {
    case 'subtle':
      g.blur = 10;
      g.sidebarOpacity = 85;
      g.cardOpacity = 90;
      g.scrimOpacity = 50;
      break;
    case 'deep':
      g.blur = 20;
      g.sidebarOpacity = 65;
      g.cardOpacity = 80;
      g.scrimOpacity = 60;
      break;
    case 'ultra':
      g.blur = 24;
      g.sidebarOpacity = 45;
      g.cardOpacity = 60;
      g.scrimOpacity = 40;
      break;
    case 'cyber':
      g.blur = 16;
      g.sidebarOpacity = 70;
      g.cardOpacity = 85;
      g.scrimOpacity = 40;
      break;
  }
  appState.glass = g;
  renderSliders();
}

function renderSliders() {
  const g = appState.glass || {};
  sliderWpOpacity.value = g.wallpaperOpacity ?? 95;
  valWpOpacity.textContent = (g.wallpaperOpacity ?? 95) + '%';

  sliderBlur.value = g.blur ?? 16;
  valBlur.textContent = (g.blur ?? 16) + 'px';

  sliderSidebarOpacity.value = g.sidebarOpacity ?? 75;
  valSidebarOpacity.textContent = (g.sidebarOpacity ?? 75) + '%';

  sliderCardOpacity.value = g.cardOpacity ?? 85;
  valCardOpacity.textContent = (g.cardOpacity ?? 85) + '%';

  sliderScrimOpacity.value = g.scrimOpacity ?? 60;
  valScrimOpacity.textContent = (g.scrimOpacity ?? 60) + '%';
}

function renderModStatus() {
  if (!modStatus) return;
  if (modStatus.isPatched) {
    modStatusDot.className = 'status-dot green';
    modStatusText.textContent = 'ĐÃ CÀI ĐẶT THEME MOD (ACTIVE)';
    modStatusDesc.textContent = 'Antigravity đang được kích hoạt hiệu ứng hình nền và kính mờ thời gian thực.';
    btnInstallMod.querySelector('strong').textContent = 'Cập nhật lại Theme Mod';
  } else {
    modStatusDot.className = 'status-dot';
    modStatusText.textContent = 'CHƯA CÀI ĐẶT THEME MOD';
    modStatusDesc.textContent = 'Nhấn nút bên dưới để tự động kích hoạt tính năng đổi hình nền trực tiếp cho Antigravity.';
  }
}

// === REALTIME LIVE PREVIEW ===
function updateLivePreview() {
  const mode = activeSubtab;
  const currentSet = appState.palette[mode] || {};
  const c = currentSet.colors || {};
  const g = currentSet.gradients || {};
  const glass = appState.glass || {};

  // Wallpaper
  if (appState.wallpaperUrl) {
    previewWallpaper.style.backgroundImage = `url(${appState.wallpaperUrl})`;
  } else {
    previewWallpaper.style.background = 'linear-gradient(135deg, #091c2b, #15334c)';
  }
  const fit = appState.wallpaperFit || 'cover';
  previewWallpaper.style.backgroundSize = fit === 'contain' ? 'contain' : fit === 'stretch' ? '100% 100%' : fit === 'center' ? 'auto' : 'cover';
  previewWallpaper.style.backgroundPosition = 'center';
  previewWallpaper.style.backgroundRepeat = 'no-repeat';
  previewWallpaper.style.opacity = (glass.wallpaperOpacity ?? 95) / 100;

  // Glassmorphic CSS variables
  const root = document.getElementById('previewWindow');
  root.style.setProperty('--ag-blur', (glass.blur ?? 16) + 'px');
  root.style.setProperty('--ag-sidebar-opacity', (glass.sidebarOpacity ?? 75) / 100);
  root.style.setProperty('--ag-card-opacity', (glass.cardOpacity ?? 85) / 100);

  // Gradient bindings
  const compGrad = appState.composerGradient || 'linear-gradient(90deg, #E6FF80 0%, #38EF7D 35%, #11998E 70%, #FFE066 100%)';
  if (previewComposer) {
    previewComposer.style.background = compGrad;
    previewComposer.style.boxShadow = '0 0 14px rgba(212, 252, 121, 0.35)';

    let mascotBadge = document.getElementById('previewMascotBadge');
    if (!mascotBadge) {
      mascotBadge = document.createElement('div');
      mascotBadge.id = 'previewMascotBadge';
      mascotBadge.className = 'preview-mascot-badge';
      previewComposer.appendChild(mascotBadge);
    }

    if (appState.mascotUrl) {
      mascotBadge.style.display = 'block';
      mascotBadge.style.backgroundImage = `url(${appState.mascotUrl})`;
      const sz = Math.round((appState.mascotSize || 52) * 0.75);
      mascotBadge.style.width = sz + 'px';
      mascotBadge.style.height = sz + 'px';
      mascotBadge.style.top = '-' + (sz - 6) + 'px';
      if (appState.mascotPos === 'top-left') {
        mascotBadge.style.left = '16px';
        mascotBadge.style.right = 'auto';
      } else {
        mascotBadge.style.right = '16px';
        mascotBadge.style.left = 'auto';
      }
      mascotBadge.style.animation = (appState.mascotBounce !== false) ? 'agMascotBounce 3s ease-in-out infinite alternate' : 'none';
      mascotBadge.style.cursor = 'pointer';
      mascotBadge.onclick = () => {
        let b = document.getElementById('previewSpeechBubble');
        if (b) b.remove();
        b = document.createElement('div');
        b.id = 'previewSpeechBubble';
        b.className = 'preview-speech-bubble';
        b.textContent = appState.petSpeech || 'Chủ nhân cố lên nhé! Hôm nay code gì thế ạ? ✨';
        previewComposer.appendChild(b);
        setTimeout(() => { if (b) b.remove(); }, 3500);
      };
    } else {
      mascotBadge.style.display = 'none';
    }
  }

  root.style.setProperty('--ag-composer-border-1', g.composerBorder1 || '#7DCFFF');
  root.style.setProperty('--ag-composer-bg-1', g.composerBg1 || '#132332');
  root.style.setProperty('--ag-composer-bg-2', g.composerBg2 || '#0F1926');
  root.style.setProperty('--ag-composer-bg-3', g.composerBg3 || '#132332');

  root.style.setProperty('--ag-user-bubble-1', g.userBubble1 || '#15524D');
  root.style.setProperty('--ag-user-bubble-2', g.userBubble2 || '#082430');
  root.style.setProperty('--ag-user-bubble-border', g.userBubbleBorder || '#73DACA');
}

// Start
init();
