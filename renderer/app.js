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
let motionStudioInstance = null;
let videoImportStudioInstance = null;

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
      glass: { blur: 16, sidebarOpacity: 75, cardOpacity: 85, scrimOpacity: 60, wallpaperOpacity: 95 },
      petBorderStyle: 'theme-gradient',
      petGlowColor: '#38EF7D',
      petGlowRadius: 12,
      petBorderWidth: 2,
      petPedestal: true,
      petPedestalColor: '#7DCFFF',
      activePetModelId: 'model-pixel-golem',
      mascotUrl: '../assets/mascot-pixel-pet.png',
      mascotType: 'model-pixel-golem'
    };
  }

  // Ensure Pet defaults if missing in existing configs
  if (appState.petBorderStyle === undefined) appState.petBorderStyle = 'theme-gradient';
  if (appState.petGlowColor === undefined) appState.petGlowColor = '#38EF7D';
  if (appState.petGlowRadius === undefined) appState.petGlowRadius = 12;
  if (appState.petBorderWidth === undefined) appState.petBorderWidth = 2;
  if (appState.petPedestal === undefined) appState.petPedestal = true;
  if (appState.petPedestalColor === undefined) appState.petPedestalColor = '#7DCFFF';
  if (!appState.mascotUrl) appState.mascotUrl = '../assets/mascot-pixel-pet.png';
  if (!appState.mascotType) appState.mascotType = 'model-pixel-golem';
  if (!appState.activePetModelId) appState.activePetModelId = 'model-pixel-golem';

  activeSubtab = appState.mode || 'dark';
  applyLanguage(appState.language || 'vi');
  renderQuickPalettes();
  renderColorTokens();
  renderGradientTokens();
  renderWallpaperPresets();
  renderSliders();
  renderModStatus();
  updateLivePreview();
  if (typeof window.initVideoImportStudio === 'function') {
    window.initVideoImportStudio();
  }
}

// === TABS SETUP ===
function switchToTab(targetId) {
  tabButtons.forEach(b => {
    if (b.getAttribute('data-tab') === targetId) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });
  tabPanes.forEach(p => {
    if (p.id === targetId) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });
  if (targetId === 'tab-motion') {
    if (typeof window.initMotionStudio === 'function') {
      window.initMotionStudio();
    }
  }
}
window.switchToTab = switchToTab;

function setupTabs() {
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      switchToTab(targetId);
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

  // === TIKTOK & YOUTUBE IMPORT STUDIO WIRE ===
  const inputVideoUrl = document.getElementById('inputVideoUrl');
  const btnFetchVideoUrl = document.getElementById('btnFetchVideoUrl');

  if (btnFetchVideoUrl) {
    btnFetchVideoUrl.addEventListener('click', async () => {
      const rawUrl = inputVideoUrl ? inputVideoUrl.value.trim() : '';
      if (!rawUrl) {
        showStatus('⚠️ Vui lòng dán link TikTok hoặc YouTube vào ô nhập!');
        if (inputVideoUrl) inputVideoUrl.focus();
        return;
      }

      const studio = typeof window.initVideoImportStudio === 'function' ? window.initVideoImportStudio() : null;
      if (!studio) {
        showStatus('❌ Chưa thể khởi tạo bộ xử lý video. Hãy kiểm tra lại!');
        return;
      }

      showStatus(`🔍 Đang tải và phân tích: ${rawUrl.length > 50 ? rawUrl.substring(0, 47) + '...' : rawUrl}`);
      btnFetchVideoUrl.disabled = true;
      try {
        const ok = await studio.loadUrl(rawUrl);
        if (ok) {
          showStatus('✓ Đã tải media thành công! Bước 1: Hãy chỉnh khung cắt viền.');
        } else {
          showStatus('⚠️ Không thể trích xuất thumbnail/video từ URL này. Vui lòng kiểm tra lại!');
        }
      } catch (err) {
        showStatus('❌ Lỗi tải video: ' + (err.message || err));
      } finally {
        btnFetchVideoUrl.disabled = false;
      }
    });
  }

  if (inputVideoUrl) {
    inputVideoUrl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (btnFetchVideoUrl) btnFetchVideoUrl.click();
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

  // === PET MODELS LIBRARY & CUSTOM MODEL EVENT HANDLERS ===
  document.querySelectorAll('#petModelsGrid .pet-model-card').forEach(card => {
    card.addEventListener('click', async () => {
      const modelId = card.getAttribute('data-model');
      if (modelId === 'custom') {
        if (!window.api) return;
        const res = await window.api.selectWallpaper();
        if (res && !res.canceled && res.dataUrl) {
          document.querySelectorAll('#petModelsGrid .pet-model-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          appState.activePetModelId = 'custom';
          appState.mascotType = 'custom';
          appState.mascotUrl = res.dataUrl;
          showStatus('Đã nạp Pet riêng tùy chỉnh: ' + res.fileName);
          updateLivePreview();
          await saveConfig();
        }
        return;
      }

      document.querySelectorAll('#petModelsGrid .pet-model-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const found = (typeof window !== 'undefined' && window.PetModels && window.PetModels.getPetModelById)
        ? window.PetModels.getPetModelById(modelId)
        : PET_MODELS_LIB.find(m => m.id === modelId);
      if (found) {
        applyPetModel(found);
        showStatus(`Đã áp dụng mẫu Pet: ${found.name}`);
      }
    });
  });

  const btnUploadPetModel = document.getElementById('btnUploadPetModel');
  if (btnUploadPetModel) {
    btnUploadPetModel.addEventListener('click', async () => {
      if (!window.api) return;
      const res = await window.api.selectWallpaper();
      if (res && !res.canceled && res.dataUrl) {
        document.querySelectorAll('#petModelsGrid .pet-model-card').forEach(c => c.classList.remove('active'));
        btnUploadPetModel.classList.add('active');
        appState.activePetModelId = 'custom';
        appState.mascotType = 'custom';
        appState.mascotUrl = res.dataUrl;
        showStatus('Đã nạp Pet riêng tùy chỉnh: ' + res.fileName);
        updateLivePreview();
        await saveConfig();
      }
    });
  }

  // === PET BORDER STYLE SELECTOR ===
  document.querySelectorAll('#petBorderStyleRow .pet-border-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('#petBorderStyleRow .pet-border-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const style = btn.getAttribute('data-style');
      appState.petBorderStyle = style;
      showStatus(`Đã chọn kiểu viền Pet: ${btn.textContent.trim()}`);
      updateLivePreview();
      await saveConfig();
    });
  });

  // === PET GLOW COLOR & PEDESTAL COLOR PICKERS ===
  const pickerPetGlow = document.getElementById('pickerPetGlow');
  const hexPetGlow = document.getElementById('hexPetGlow');
  if (pickerPetGlow && hexPetGlow) {
    pickerPetGlow.addEventListener('input', async (e) => {
      hexPetGlow.value = e.target.value.toUpperCase();
      appState.petGlowColor = e.target.value;
      updateLivePreview();
      await saveConfig();
    });
    hexPetGlow.addEventListener('input', async (e) => {
      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
        pickerPetGlow.value = e.target.value;
        appState.petGlowColor = e.target.value;
        updateLivePreview();
        await saveConfig();
      }
    });
  }

  const pickerPetPedestalColor = document.getElementById('pickerPetPedestalColor');
  const hexPetPedestalColor = document.getElementById('hexPetPedestalColor');
  if (pickerPetPedestalColor && hexPetPedestalColor) {
    pickerPetPedestalColor.addEventListener('input', async (e) => {
      hexPetPedestalColor.value = e.target.value.toUpperCase();
      appState.petPedestalColor = e.target.value;
      updateLivePreview();
      await saveConfig();
    });
    hexPetPedestalColor.addEventListener('input', async (e) => {
      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
        pickerPetPedestalColor.value = e.target.value;
        appState.petPedestalColor = e.target.value;
        updateLivePreview();
        await saveConfig();
      }
    });
  }

  // === PET GLOW RADIUS & BORDER WIDTH SLIDERS ===
  const sliderPetGlowRadius = document.getElementById('sliderPetGlowRadius');
  const valPetGlowRadius = document.getElementById('valPetGlowRadius');
  if (sliderPetGlowRadius && valPetGlowRadius) {
    sliderPetGlowRadius.addEventListener('input', async (e) => {
      const rad = parseInt(e.target.value);
      valPetGlowRadius.textContent = rad + 'px';
      appState.petGlowRadius = rad;
      updateLivePreview();
      await saveConfig();
    });
  }

  const sliderPetBorderWidth = document.getElementById('sliderPetBorderWidth');
  const valPetBorderWidth = document.getElementById('valPetBorderWidth');
  if (sliderPetBorderWidth && valPetBorderWidth) {
    sliderPetBorderWidth.addEventListener('input', async (e) => {
      const bw = parseInt(e.target.value);
      valPetBorderWidth.textContent = bw + 'px';
      appState.petBorderWidth = bw;
      updateLivePreview();
      await saveConfig();
    });
  }

  // === HOLOGRAPHIC PEDESTAL TOGGLE ===
  const chkPetPedestal = document.getElementById('chkPetPedestal');
  if (chkPetPedestal) {
    chkPetPedestal.addEventListener('change', async (e) => {
      appState.petPedestal = e.target.checked;
      showStatus(e.target.checked ? 'Đã bật bệ đỡ Holographic Pedestal' : 'Đã tắt bệ đỡ');
      updateLivePreview();
      await saveConfig();
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

  // Live Wallpaper Effects (Particle Overlay & Breathing)
  document.querySelectorAll('#wpFxPresetsRow .fx-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('#wpFxPresetsRow .fx-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const fx = btn.getAttribute('data-fx');
      appState.wallpaperFx = fx;
      showStatus(`Hiệu ứng hình nền động: ${btn.textContent.trim()}`);
      updateLivePreview();
      await saveConfig();
    });
  });

  const sliderWpFxSpeed = document.getElementById('sliderWpFxSpeed');
  const valWpFxSpeed = document.getElementById('valWpFxSpeed');
  if (sliderWpFxSpeed && valWpFxSpeed) {
    sliderWpFxSpeed.addEventListener('input', async (e) => {
      const spd = parseInt(e.target.value);
      valWpFxSpeed.textContent = 'Mức ' + spd;
      appState.wallpaperFxSpeed = spd;
      await saveConfig();
    });
  }

  // Pet Dynamic Animation Effects (Bob, Pulse, Sway, Glow, Sleep)
  document.querySelectorAll('#petFxRow .pet-fx-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('#petFxRow .pet-fx-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const anim = btn.getAttribute('data-anim');
      appState.petAnim = anim;
      showStatus(`Hoạt ảnh Pet: ${btn.textContent.trim()}`);
      updateLivePreview();
      await saveConfig();
    });
  });

  // Pet Placement & Positioning Controls
  document.querySelectorAll('#petPosPresetsRow .pet-pos-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('#petPosPresetsRow .pet-pos-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const pos = btn.getAttribute('data-pos');
      appState.mascotPos = pos;
      showStatus(`Vị trí đặt Pet: ${btn.textContent.trim()}`);
      updateLivePreview();
      await saveConfig();
    });
  });

  const sliderPetSize = document.getElementById('sliderPetSize');
  const valPetSize = document.getElementById('valPetSize');
  if (sliderPetSize && valPetSize) {
    sliderPetSize.addEventListener('input', async (e) => {
      const sz = parseInt(e.target.value);
      valPetSize.textContent = sz + 'px';
      appState.mascotSize = sz;
      updateLivePreview();
      await saveConfig();
    });
  }

  const sliderPetOffsetX = document.getElementById('sliderPetOffsetX');
  const valPetOffsetX = document.getElementById('valPetOffsetX');
  if (sliderPetOffsetX && valPetOffsetX) {
    sliderPetOffsetX.addEventListener('input', async (e) => {
      const offX = parseInt(e.target.value);
      valPetOffsetX.textContent = offX + 'px';
      appState.petOffsetX = offX;
      updateLivePreview();
      await saveConfig();
    });
  }

  const sliderPetOffsetY = document.getElementById('sliderPetOffsetY');
  const valPetOffsetY = document.getElementById('valPetOffsetY');
  if (sliderPetOffsetY && valPetOffsetY) {
    sliderPetOffsetY.addEventListener('input', async (e) => {
      const offY = parseInt(e.target.value);
      valPetOffsetY.textContent = offY + 'px';
      appState.petOffsetY = offY;
      updateLivePreview();
      await saveConfig();
    });
  }

  const btnTogglePetFlip = document.getElementById('btnTogglePetFlip');
  if (btnTogglePetFlip) {
    btnTogglePetFlip.addEventListener('click', async () => {
      appState.petFlip = !appState.petFlip;
      showStatus(appState.petFlip ? 'Đã lật Pet quay sang trái' : 'Đã lật Pet quay sang phải');
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

  // === VIDEO IMPORT STUDIO INITIALIZATION ===
  window.initVideoImportStudio = function() {
    const mount = document.getElementById('videoImportMount');
    if (!mount) return null;

    if (!videoImportStudioInstance && typeof VideoImportStudio !== 'undefined') {
      videoImportStudioInstance = new VideoImportStudio({
        container: mount,
        imgUrl: '',
        onApplyWallpaper: async (dataUrl) => {
          if (!appState) return;
          appState.wallpaperUrl = dataUrl;
          if (currentWpName) {
            currentWpName.textContent = 'Ảnh từ TikTok / YouTube (Đã xử lý)';
          }
          const badgeWpRes = document.getElementById('badgeWpRes');
          if (badgeWpRes) {
            badgeWpRes.textContent = '🖥️ Chuẩn Custom (TikTok/YouTube)';
          }
          updateLivePreview();
          showStatus('✨ Đang lưu hình nền từ TikTok/YouTube sang Antigravity...');
          await saveConfig();
          showStatus('✓ Đã áp dụng hình nền từ TikTok/YouTube thành công!');
        },
        onSendToMotionStudio: async (dataUrl) => {
          showStatus('🚀 Đang chuyển sang tab Vẽ Chuyển Động (Motion Studio)...');
          switchToTab('tab-motion');
          if (typeof window.initMotionStudio === 'function') {
            window.initMotionStudio();
          }
          if (motionStudioInstance) {
            await motionStudioInstance.loadImage(dataUrl);
            showStatus('✓ Đã nạp ảnh vào Motion Studio thành công!');
          }
        },
        onApplyPet: async (dataUrl) => {
          if (!appState) return;
          appState.mascotUrl = dataUrl;
          showStatus('🐾 Đang áp dụng làm thú cưng Pet Companion...');
          switchToTab('tab-pet');
          renderPetControls();
          updateLivePreview();
          await saveConfig();
          showStatus('✓ Đã áp dụng bé Pet từ TikTok/YouTube thành công!');
        }
      });
      videoImportStudioInstance.init();
      window.videoImportStudioInstance = videoImportStudioInstance;
    }
    return videoImportStudioInstance;
  };

  // === MOTION STUDIO INITIALIZATION ===
  window.initMotionStudio = function() {
    const mount = document.getElementById('motionStudioMount');
    if (!mount) return;

    if (!motionStudioInstance && typeof MotionStudio !== 'undefined') {
      const initImg = appState.wallpaperUrl || '../assets/violinist-earth.jpg';
      motionStudioInstance = new MotionStudio({
        container: mount,
        imgUrl: initImg,
        onStateChange: (cfg) => {
          appState.motionFlow = cfg;
        }
      });
      motionStudioInstance.init();
      window.motionStudioInstance = motionStudioInstance;
      if (appState.motionFlow) {
        motionStudioInstance.importConfig(appState.motionFlow);
      }
      motionStudioInstance.onApply = async (cfg) => {
        appState.motionFlow = cfg;
        showStatus('✨ Đang lưu và áp dụng hiệu ứng chuyển động Flow Map vào Antigravity...');
        await saveConfig();
        showStatus('✓ Đã áp dụng ảnh chuyển động Flow Map vào Antigravity thành công!');
      };
    } else if (motionStudioInstance) {
      motionStudioInstance.resizeCanvas();
    }
  };

  const btnMotionUseWallpaper = document.getElementById('btnMotionUseWallpaper');
  if (btnMotionUseWallpaper) {
    btnMotionUseWallpaper.addEventListener('click', () => {
      window.initMotionStudio();
      if (motionStudioInstance) {
        const url = appState.wallpaperUrl || '../assets/violinist-earth.jpg';
        motionStudioInstance.loadImage(url);
        showStatus('Đã nạp ảnh Wallpaper vào Motion Studio');
      }
    });
  }

  const btnMotionUsePet = document.getElementById('btnMotionUsePet');
  if (btnMotionUsePet) {
    btnMotionUsePet.addEventListener('click', () => {
      window.initMotionStudio();
      if (motionStudioInstance && appState.mascotUrl) {
        motionStudioInstance.loadImage(appState.mascotUrl);
        showStatus('Đã nạp ảnh Pet vào Motion Studio');
      } else {
        showStatus('Chưa có ảnh Pet. Hãy chọn hoặc tải ảnh Pet trước!');
      }
    });
  }

  const btnMotionUploadCustom = document.getElementById('btnMotionUploadCustom');
  if (btnMotionUploadCustom) {
    btnMotionUploadCustom.addEventListener('click', async () => {
      if (!window.api) return;
      const res = await window.api.selectWallpaper();
      if (res && !res.canceled && res.dataUrl) {
        window.initMotionStudio();
        if (motionStudioInstance) {
          motionStudioInstance.loadImage(res.dataUrl);
          showStatus('Đã nạp ảnh mới từ máy tính: ' + res.fileName);
        }
      }
    });
  }

  // Quick Preset Row for Motion Studio
  const motionPresetsRow = document.getElementById('motionPresetsRow');
  if (motionPresetsRow) {
    motionPresetsRow.querySelectorAll('.motion-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const presetId = btn.getAttribute('data-preset');
        if (!presetId) return;

        window.initMotionStudio();
        if (motionStudioInstance) {
          const applied = motionStudioInstance.applyPresetTemplate(presetId);
          if (applied) {
            motionPresetsRow.querySelectorAll('.motion-preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showStatus(`✓ Đã áp dụng mẫu chuyển động: ${btn.textContent.trim()}`);
          }
        }
      });
    });
  }
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

// === PET MODELS LIBRARY & CONTROLS HELPER ===
const PET_MODELS_LIB = (typeof window !== 'undefined' && window.PetModels && window.PetModels.DEFAULT_PET_MODELS) ? window.PetModels.DEFAULT_PET_MODELS : [
  {
    id: 'model-pixel-golem',
    name: 'Bé Golem Má Hồng',
    avatar: '../assets/mascot-pixel-pet.png',
    avatarUrl: '../assets/mascot-pixel-pet.png',
    borderStyle: 'theme-gradient',
    glowColor: '#38EF7D',
    glowRadius: 12,
    borderWidth: 2,
    pedestal: true,
    pedestalColor: '#7DCFFF',
    animation: 'bob',
    anim: 'bob',
    scale: 58,
    speech: 'Chủ nhân cố lên nhé! Hôm nay code gì thế ạ? ✨'
  },
  {
    id: 'model-chibi-waifu',
    name: 'Chibi Waifu',
    avatar: '../assets/composer-banner.jpg',
    avatarUrl: '../assets/composer-banner.jpg',
    borderStyle: 'theme-gradient',
    glowColor: '#FF79C6',
    glowRadius: 14,
    borderWidth: 2,
    pedestal: true,
    pedestalColor: '#BD93F9',
    animation: 'pulse',
    anim: 'pulse',
    scale: 60,
    speech: 'Em luôn ở đây đồng hành cùng anh code nè! 🌸'
  },
  {
    id: 'model-cyber-drone',
    name: 'Cyber Mecha Drone',
    avatar: '../assets/icon.png',
    avatarUrl: '../assets/icon.png',
    borderStyle: 'neon-glow',
    glowColor: '#7DCFFF',
    glowRadius: 16,
    borderWidth: 2,
    pedestal: true,
    pedestalColor: '#00E5FF',
    animation: 'sway',
    anim: 'sway',
    scale: 54,
    speech: 'Hệ thống bảo vệ mã nguồn trực tuyến! ⚡'
  },
  {
    id: 'model-magic-cat',
    name: 'Mèo Thần Thoại',
    avatar: '../assets/deco-floral-bird.png',
    avatarUrl: '../assets/deco-floral-bird.png',
    borderStyle: 'glass-bubble',
    glowColor: '#FFE066',
    glowRadius: 10,
    borderWidth: 2,
    pedestal: true,
    pedestalColor: '#FFA07A',
    animation: 'glow',
    anim: 'glow',
    scale: 52,
    speech: 'Meow meow~ Chúc chủ nhân code không gặp bug! 🐾'
  }
];

function applyPetModel(model) {
  if (!model) return;
  appState.activePetModelId = model.id;
  appState.petName = model.name;
  appState.petSpeech = model.speech;
  appState.mascotUrl = model.avatarUrl || model.avatar;
  appState.mascotType = model.id;
  appState.mascotSize = model.scale || model.size || 56;
  appState.petAnim = model.animation || model.anim || 'bob';
  appState.petBorderStyle = model.borderStyle || 'theme-gradient';
  appState.petGlowColor = model.glowColor || '#38EF7D';
  appState.petGlowRadius = model.glowRadius !== undefined ? model.glowRadius : 12;
  appState.petBorderWidth = model.borderWidth !== undefined ? model.borderWidth : 2;
  appState.petPedestal = model.pedestal !== undefined ? model.pedestal : true;
  appState.petPedestalColor = model.pedestalColor || '#7DCFFF';

  const inputPetName = document.getElementById('inputPetName');
  if (inputPetName) inputPetName.value = appState.petName;
  const inputPetSpeech = document.getElementById('inputPetSpeech');
  if (inputPetSpeech) inputPetSpeech.value = appState.petSpeech;

  renderPetControls();
  updateLivePreview();
  saveConfig();
}

function renderPetControls() {
  const curModelId = appState.activePetModelId || 'model-pixel-golem';
  document.querySelectorAll('#petModelsGrid .pet-model-card').forEach(c => {
    if (c.getAttribute('data-model') === curModelId) c.classList.add('active');
    else c.classList.remove('active');
  });

  const curBorderStyle = appState.petBorderStyle || 'theme-gradient';
  document.querySelectorAll('#petBorderStyleRow .pet-border-btn').forEach(b => {
    if (b.getAttribute('data-style') === curBorderStyle) b.classList.add('active');
    else b.classList.remove('active');
  });

  const pickerPetGlow = document.getElementById('pickerPetGlow');
  const hexPetGlow = document.getElementById('hexPetGlow');
  if (pickerPetGlow && hexPetGlow) {
    const col = appState.petGlowColor || '#38EF7D';
    pickerPetGlow.value = col;
    hexPetGlow.value = col.toUpperCase();
  }

  const pickerPetPedestalColor = document.getElementById('pickerPetPedestalColor');
  const hexPetPedestalColor = document.getElementById('hexPetPedestalColor');
  if (pickerPetPedestalColor && hexPetPedestalColor) {
    const col = appState.petPedestalColor || '#7DCFFF';
    pickerPetPedestalColor.value = col;
    hexPetPedestalColor.value = col.toUpperCase();
  }

  const sliderPetGlowRadius = document.getElementById('sliderPetGlowRadius');
  const valPetGlowRadius = document.getElementById('valPetGlowRadius');
  if (sliderPetGlowRadius && valPetGlowRadius) {
    const rad = appState.petGlowRadius !== undefined ? appState.petGlowRadius : 12;
    sliderPetGlowRadius.value = rad;
    valPetGlowRadius.textContent = rad + 'px';
  }

  const sliderPetBorderWidth = document.getElementById('sliderPetBorderWidth');
  const valPetBorderWidth = document.getElementById('valPetBorderWidth');
  if (sliderPetBorderWidth && valPetBorderWidth) {
    const bw = appState.petBorderWidth !== undefined ? appState.petBorderWidth : 2;
    sliderPetBorderWidth.value = bw;
    valPetBorderWidth.textContent = bw + 'px';
  }

  const chkPetPedestal = document.getElementById('chkPetPedestal');
  if (chkPetPedestal) {
    chkPetPedestal.checked = appState.petPedestal !== false;
  }
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

  const sliderWpFxSpeed = document.getElementById('sliderWpFxSpeed');
  const valWpFxSpeed = document.getElementById('valWpFxSpeed');
  if (sliderWpFxSpeed && valWpFxSpeed) {
    const spd = appState.wallpaperFxSpeed ?? 3;
    sliderWpFxSpeed.value = spd;
    valWpFxSpeed.textContent = 'Mức ' + spd;
  }

  // Active state for Wallpaper Effects buttons
  const curFx = appState.wallpaperFx || 'none';
  document.querySelectorAll('#wpFxPresetsRow .fx-btn').forEach(b => {
    if (b.getAttribute('data-fx') === curFx) b.classList.add('active');
    else b.classList.remove('active');
  });

  // Active state for Pet Anim buttons
  const curAnim = appState.petAnim || 'bob';
  document.querySelectorAll('#petFxRow .pet-fx-btn').forEach(b => {
    if (b.getAttribute('data-anim') === curAnim) b.classList.add('active');
    else b.classList.remove('active');
  });

  // Pet Positioning Sliders & Active Presets
  const sliderPetSize = document.getElementById('sliderPetSize');
  const valPetSize = document.getElementById('valPetSize');
  if (sliderPetSize && valPetSize) {
    const sz = appState.mascotSize ?? 56;
    sliderPetSize.value = sz;
    valPetSize.textContent = sz + 'px';
  }

  const sliderPetOffsetX = document.getElementById('sliderPetOffsetX');
  const valPetOffsetX = document.getElementById('valPetOffsetX');
  if (sliderPetOffsetX && valPetOffsetX) {
    const offX = appState.petOffsetX ?? 0;
    sliderPetOffsetX.value = offX;
    valPetOffsetX.textContent = offX + 'px';
  }

  const sliderPetOffsetY = document.getElementById('sliderPetOffsetY');
  const valPetOffsetY = document.getElementById('valPetOffsetY');
  if (sliderPetOffsetY && valPetOffsetY) {
    const offY = appState.petOffsetY ?? 0;
    sliderPetOffsetY.value = offY;
    valPetOffsetY.textContent = offY + 'px';
  }

  const curPos = appState.mascotPos || 'composer-top-right';
  document.querySelectorAll('#petPosPresetsRow .pet-pos-btn').forEach(b => {
    if (b.getAttribute('data-pos') === curPos) b.classList.add('active');
    else b.classList.remove('active');
  });

  // Sync pet aura and pedestal customizer controls
  renderPetControls();
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

  if (appState.wallpaperFx === 'breathing') {
    previewWallpaper.classList.add('wallpaper-breathing');
  } else {
    previewWallpaper.classList.remove('wallpaper-breathing');
  }

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
      mascotBadge.style.display = 'flex';
      mascotBadge.style.backgroundImage = 'none';
      const sz = Math.round((appState.mascotSize || 56) * 0.75);
      mascotBadge.style.width = sz + 'px';
      mascotBadge.style.height = sz + 'px';
      
      const pos = appState.mascotPos || 'composer-top-right';
      const offX = Math.round((appState.petOffsetX || 0) * 0.75);
      const offY = Math.round((appState.petOffsetY || 0) * 0.75);

      if (pos === 'composer-top-left') {
        mascotBadge.style.top = '-' + (sz - 6 - offY) + 'px';
        mascotBadge.style.left = (16 + offX) + 'px';
        mascotBadge.style.right = 'auto';
        mascotBadge.style.bottom = 'auto';
      } else if (pos === 'composer-top-center') {
        mascotBadge.style.top = '-' + (sz - 6 - offY) + 'px';
        mascotBadge.style.left = `calc(50% - ${sz/2}px + ${offX}px)`;
        mascotBadge.style.right = 'auto';
        mascotBadge.style.bottom = 'auto';
      } else if (pos === 'screen-bottom-right') {
        mascotBadge.style.top = 'auto';
        mascotBadge.style.bottom = (6 + offY) + 'px';
        mascotBadge.style.right = (16 - offX) + 'px';
        mascotBadge.style.left = 'auto';
      } else if (pos === 'sidebar-bottom') {
        mascotBadge.style.top = 'auto';
        mascotBadge.style.bottom = (6 + offY) + 'px';
        mascotBadge.style.left = (16 + offX) + 'px';
        mascotBadge.style.right = 'auto';
      } else {
        // composer-top-right default
        mascotBadge.style.top = '-' + (sz - 6 - offY) + 'px';
        mascotBadge.style.right = (16 - offX) + 'px';
        mascotBadge.style.left = 'auto';
        mascotBadge.style.bottom = 'auto';
      }

      const petAnim = appState.petAnim || 'bob';
      mascotBadge.className = 'preview-mascot-badge ' + ((appState.mascotBounce !== false) ? ('anim-' + petAnim) : '');
      mascotBadge.style.animation = '';
      mascotBadge.style.transform = appState.petFlip ? 'scaleX(-1)' : 'none';
      mascotBadge.style.cursor = 'pointer';

      // Inner hierarchy: .ag-pet-pedestal + .ag-pet-aura-frame + .ag-pet-sprite
      let pedestalEl = mascotBadge.querySelector('.ag-pet-pedestal');
      if (!pedestalEl) {
        pedestalEl = document.createElement('div');
        pedestalEl.className = 'ag-pet-pedestal';
        mascotBadge.appendChild(pedestalEl);
      }

      let auraFrameEl = mascotBadge.querySelector('.ag-pet-aura-frame');
      if (!auraFrameEl) {
        auraFrameEl = document.createElement('div');
        auraFrameEl.className = 'ag-pet-aura-frame';
        mascotBadge.appendChild(auraFrameEl);
      }

      let spriteEl = auraFrameEl.querySelector('.ag-pet-sprite');
      if (!spriteEl) {
        spriteEl = document.createElement('div');
        spriteEl.className = 'ag-pet-sprite';
        auraFrameEl.appendChild(spriteEl);
      }

      // Configure Pedestal Platform
      const pedCol = appState.petPedestalColor || '#7DCFFF';
      if (appState.petPedestal !== false) {
        pedestalEl.style.display = 'block';
        pedestalEl.style.background = `radial-gradient(ellipse at center, ${pedCol} 0%, rgba(125, 207, 255, 0.45) 45%, transparent 75%)`;
        pedestalEl.style.boxShadow = `0 0 10px ${pedCol}`;
      } else {
        pedestalEl.style.display = 'none';
      }

      // Configure Aura Frame
      const borderStyle = appState.petBorderStyle || 'theme-gradient';
      const glowCol = appState.petGlowColor || '#38EF7D';
      const glowRad = appState.petGlowRadius !== undefined ? appState.petGlowRadius : 12;
      const bw = (appState.petBorderWidth !== undefined ? appState.petBorderWidth : 2) + 'px';

      auraFrameEl.className = 'ag-pet-aura-frame border-' + borderStyle;
      auraFrameEl.style.border = 'none';
      auraFrameEl.style.background = 'transparent';
      auraFrameEl.style.boxShadow = 'none';
      auraFrameEl.style.filter = 'none';
      auraFrameEl.style.backdropFilter = 'none';
      auraFrameEl.style.webkitBackdropFilter = 'none';

      if (borderStyle === 'theme-gradient') {
        auraFrameEl.style.borderRadius = '50%';
        auraFrameEl.style.border = bw + ' solid transparent';
        auraFrameEl.style.background = `linear-gradient(#081826, #081826) padding-box, ${compGrad} border-box`;
        auraFrameEl.style.boxShadow = `0 0 ${glowRad}px ${glowCol}`;
      } else if (borderStyle === 'neon-glow') {
        auraFrameEl.style.borderRadius = '50%';
        auraFrameEl.style.border = `${bw} solid ${glowCol}`;
        auraFrameEl.style.boxShadow = `0 0 ${glowRad}px ${glowCol}, inset 0 0 ${Math.round(glowRad / 2)}px ${glowCol}`;
      } else if (borderStyle === 'holo-pedestal') {
        auraFrameEl.style.borderRadius = '50%';
        auraFrameEl.style.border = `${bw} dashed ${pedCol}`;
        auraFrameEl.style.boxShadow = `0 0 ${glowRad}px ${pedCol}`;
      } else if (borderStyle === 'glass-bubble') {
        auraFrameEl.style.borderRadius = '50%';
        auraFrameEl.style.border = `${bw} solid rgba(255, 255, 255, 0.45)`;
        auraFrameEl.style.background = 'rgba(255, 255, 255, 0.12)';
        auraFrameEl.style.backdropFilter = 'blur(6px)';
        auraFrameEl.style.webkitBackdropFilter = 'blur(6px)';
        auraFrameEl.style.boxShadow = `0 4px 14px rgba(0,0,0,0.35), 0 0 ${glowRad}px ${glowCol}`;
      } else {
        // none
        auraFrameEl.style.borderRadius = '0';
      }

      // Configure Pet Sprite
      spriteEl.style.backgroundImage = `url(${appState.mascotUrl})`;

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
