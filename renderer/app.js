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
        if (found.hasMissingImage || card.querySelector('.pet-avatar-placeholder')) {
          showStatus(`⚠️ Bé "${found.name}" chưa có file ảnh. Hãy nạp ảnh của bạn bằng nút "+ Tự tạo Pet riêng"!`);
        } else {
          showStatus(`Đã áp dụng mẫu Pet: ${found.name}`);
        }
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

    if (window.MotionUI && typeof window.MotionUI.init === 'function') {
      window.MotionUI.init(mount);
    }

    if (!motionStudioInstance && typeof MotionStudio !== 'undefined') {
      const initImg = appState.wallpaperUrl || '../assets/violinist-earth.jpg';
      motionStudioInstance = new MotionStudio({
        container: mount,
        imgUrl: initImg,
        onStateChange: (cfg) => {
          appState.motionFlow = cfg;
          if (window.MotionEngine) window.MotionEngine.setConfig(cfg);
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
    hasMissingImage: true,
    warningMsg: 'Chưa có file ảnh',
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
        auraFrameEl.style.borderRadius = '0';
        auraFrameEl.style.border = 'none';
        auraFrameEl.style.background = 'transparent';
        auraFrameEl.style.boxShadow = 'none';
        auraFrameEl.style.filter = `drop-shadow(0 0 ${bw} ${glowCol}) drop-shadow(0 0 ${glowRad}px ${glowCol})`;
      } else if (borderStyle === 'neon-glow') {
        auraFrameEl.style.borderRadius = '0';
        auraFrameEl.style.border = 'none';
        auraFrameEl.style.background = 'transparent';
        auraFrameEl.style.boxShadow = 'none';
        auraFrameEl.style.filter = `drop-shadow(0 0 ${bw} ${glowCol}) drop-shadow(0 0 ${glowRad}px ${glowCol})`;
      } else if (borderStyle === 'holo-pedestal') {
        auraFrameEl.style.borderRadius = '0';
        auraFrameEl.style.border = 'none';
        auraFrameEl.style.background = 'transparent';
        auraFrameEl.style.boxShadow = 'none';
        auraFrameEl.style.filter = `drop-shadow(0 0 ${glowRad}px ${pedCol})`;
      } else if (borderStyle === 'glass-bubble') {
        auraFrameEl.style.borderRadius = '50%';
        auraFrameEl.style.border = `${bw} solid rgba(255, 255, 255, 0.45)`;
        auraFrameEl.style.background = 'rgba(255, 255, 255, 0.12)';
        auraFrameEl.style.backdropFilter = 'blur(6px)';
        auraFrameEl.style.webkitBackdropFilter = 'blur(6px)';
        auraFrameEl.style.boxShadow = `0 4px 14px rgba(0,0,0,0.35), 0 0 ${glowRad}px ${glowCol}`;
        auraFrameEl.style.filter = 'none';
      } else {
        // none
        auraFrameEl.style.borderRadius = '0';
        auraFrameEl.style.border = 'none';
        auraFrameEl.style.background = 'transparent';
        auraFrameEl.style.boxShadow = 'none';
        auraFrameEl.style.filter = 'none';
      }

      // Configure Pet Sprite
      const isMissingMascot = (appState.activePetModelId === 'model-magic-cat' && !appState.mascotUrl.startsWith('data:')) || !appState.mascotUrl;
      if (isMissingMascot) {
        spriteEl.style.backgroundImage = 'none';
        spriteEl.innerHTML = '<div class="preview-pet-placeholder" title="Chưa có ảnh Pet">🐾<span class="preview-pet-missing-tag">⚠️ Chưa có ảnh</span></div>';
      } else {
        spriteEl.innerHTML = '';
        spriteEl.style.backgroundImage = `url(${appState.mascotUrl})`;
      }

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

  if (typeof window.mountPetOverlayInPreview === 'function') {
    window.mountPetOverlayInPreview();
  }
}

// ================================================================
//  PET BUILDER STUDIO (PBS) — Integrated Canvas Editor
// ================================================================
(function initPetBuilderStudio() {
  // --- State ---
  let pbsOrigImageData = null; // original pixel data (pre-edit)
  let pbsCanvas = null;
  let pbsCtx = null;
  let pbsOverlayCanvas = null;
  let pbsOverlayCtx = null;
  let pbsHistory = [];          // undo stack [{imageData}]
  let pbsHistoryIndex = -1;
  let pbsActiveTool = 'eraser';
  let pbsZoom = 1.0;
  let pbsPanX = 0, pbsPanY = 0;
  let pbsIsPainting = false;
  let pbsLastX = -1, pbsLastY = -1;
  let pbsAnchor = null;         // {x, y}
  let pbsHitbox = null;         // {x1, y1, x2, y2}
  let pbsCropStart = null;
  let pbsSourceImage = null;    // HTMLImageElement
  // Sandbox state
  let sbAnimId = null;
  let sbFrames = [];            // array of ImageData or DataURL per frame
  let sbActiveState = 'idle';
  let sbStates = { idle: { start: 0, end: 0 }, walk: null, sleep: null, click: null, drag: null };
  let sbFps = 12;
  let sbFrameIdx = 0;
  let sbLastTime = 0;

  function domReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  domReady(() => {
    pbsCanvas = document.getElementById('pbsCanvas');
    if (!pbsCanvas) return;
    pbsCtx = pbsCanvas.getContext('2d', { willReadFrequently: true });
    pbsOverlayCanvas = document.getElementById('pbsOverlayCanvas');
    if (pbsOverlayCanvas) pbsOverlayCtx = pbsOverlayCanvas.getContext('2d');

    _bindDropzone();
    _bindToolbar();
    _bindControlsBar();
    _bindCanvasEvents();
    _bindZoomControls();
    _bindAnimSection();
    _bindSaveBtn();
    _bindKeyboardShortcuts();
    _bindFilterTargetSwitch();

    // Mount PetOverlay in preview pane if available
    _mountPetOverlayInPreview();
  });

  // ---- Dropzone ----
  function _bindDropzone() {
    const dz = document.getElementById('pbsDropzone');
    const fi = document.getElementById('pbsFileInput');
    const ub = document.getElementById('pbsUploadBtn');
    if (!dz || !fi) return;

    if (ub) ub.addEventListener('click', (e) => { e.stopPropagation(); fi.click(); });
    dz.addEventListener('click', () => fi.click());

    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      dz.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f) _loadFile(f);
    });

    fi.addEventListener('change', () => {
      if (fi.files[0]) _loadFile(fi.files[0]);
    });
  }

  function _loadFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        pbsSourceImage = img;
        pbsCanvas.width = img.width;
        pbsCanvas.height = img.height;
        if (pbsOverlayCanvas) {
          pbsOverlayCanvas.width = img.width;
          pbsOverlayCanvas.height = img.height;
        }
        pbsCtx.clearRect(0, 0, pbsCanvas.width, pbsCanvas.height);
        pbsCtx.drawImage(img, 0, 0);
        pbsOrigImageData = pbsCtx.getImageData(0, 0, pbsCanvas.width, pbsCanvas.height);
        pbsHistory = [];
        pbsHistoryIndex = -1;
        _pushHistory();
        _zoomFit();
        document.getElementById('pbsViewportWrap') && (document.getElementById('pbsViewportWrap').style.display = '');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ---- History ----
  function _pushHistory() {
    if (!pbsCanvas) return;
    const snap = pbsCtx.getImageData(0, 0, pbsCanvas.width, pbsCanvas.height);
    pbsHistory = pbsHistory.slice(0, pbsHistoryIndex + 1);
    pbsHistory.push(snap);
    pbsHistoryIndex = pbsHistory.length - 1;
    _updateUndoRedoState();
  }

  function _undo() {
    if (pbsHistoryIndex <= 0) return;
    pbsHistoryIndex--;
    pbsCtx.putImageData(pbsHistory[pbsHistoryIndex], 0, 0);
    _updateUndoRedoState();
  }

  function _redo() {
    if (pbsHistoryIndex >= pbsHistory.length - 1) return;
    pbsHistoryIndex++;
    pbsCtx.putImageData(pbsHistory[pbsHistoryIndex], 0, 0);
    _updateUndoRedoState();
  }

  function _updateUndoRedoState() {
    const undoBtn = document.getElementById('pbsUndo');
    const redoBtn = document.getElementById('pbsRedo');
    if (undoBtn) undoBtn.disabled = pbsHistoryIndex <= 0;
    if (redoBtn) redoBtn.disabled = pbsHistoryIndex >= pbsHistory.length - 1;
  }

  // ---- Toolbar ----
  function _bindToolbar() {
    document.querySelectorAll('.pbs-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pbs-tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        pbsActiveTool = btn.getAttribute('data-tool');
        if (pbsActiveTool === 'autotrim') { _autoTrim(); }
      });
    });
  }

  // ---- Controls Bar ----
  function _bindControlsBar() {
    const br = document.getElementById('pbsBrushRadius');
    const brv = document.getElementById('pbsBrushRadiusVal');
    if (br && brv) br.addEventListener('input', () => { brv.textContent = br.value + 'px'; });

    const wt = document.getElementById('pbsWandTolerance');
    const wtv = document.getElementById('pbsWandToleranceVal');
    if (wt && wtv) wt.addEventListener('input', () => { wtv.textContent = wt.value; });

    const undoBtn = document.getElementById('pbsUndo');
    const redoBtn = document.getElementById('pbsRedo');
    if (undoBtn) undoBtn.addEventListener('click', _undo);
    if (redoBtn) redoBtn.addEventListener('click', _redo);
    _updateUndoRedoState();
  }

  // ---- Canvas Events ----
  function _getCanvasPos(e) {
    if (!pbsCanvas) return { x: 0, y: 0 };
    const rect = pbsCanvas.getBoundingClientRect();
    const scaleX = pbsCanvas.width / rect.width;
    const scaleY = pbsCanvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY)
    };
  }

  function _bindCanvasEvents() {
    if (!pbsCanvas) return;
    pbsCanvas.addEventListener('mousedown', _onPaintStart);
    pbsCanvas.addEventListener('mousemove', _onPaintMove);
    pbsCanvas.addEventListener('mouseup', _onPaintEnd);
    pbsCanvas.addEventListener('mouseleave', _onPaintEnd);
    pbsCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); _onPaintStart(e); }, { passive: false });
    pbsCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); _onPaintMove(e); }, { passive: false });
    pbsCanvas.addEventListener('touchend', _onPaintEnd);
  }

  function _onPaintStart(e) {
    if (!pbsCanvas || !pbsCtx) return;
    pbsIsPainting = true;
    const pos = _getCanvasPos(e);
    pbsLastX = pos.x;
    pbsLastY = pos.y;

    switch (pbsActiveTool) {
      case 'wand':
        _magicWand(pos.x, pos.y);
        break;
      case 'colorkey':
        _colorKeyErase(pos.x, pos.y);
        break;
      case 'anchor':
        pbsAnchor = { x: pos.x, y: pos.y };
        _drawOverlay();
        break;
      case 'hitbox':
        pbsCropStart = { x: pos.x, y: pos.y };
        pbsHitbox = null;
        break;
      case 'crop':
        pbsCropStart = { x: pos.x, y: pos.y };
        break;
      default:
        _paintBrush(pos.x, pos.y);
    }
  }

  function _onPaintMove(e) {
    if (!pbsIsPainting || !pbsCanvas) return;
    const pos = _getCanvasPos(e);
    switch (pbsActiveTool) {
      case 'eraser':
      case 'restore':
        _paintBrush(pos.x, pos.y);
        break;
      case 'hitbox':
        if (pbsCropStart) {
          pbsHitbox = { x1: pbsCropStart.x, y1: pbsCropStart.y, x2: pos.x, y2: pos.y };
          _drawOverlay();
        }
        break;
      case 'crop':
        if (pbsCropStart) {
          pbsHitbox = { x1: pbsCropStart.x, y1: pbsCropStart.y, x2: pos.x, y2: pos.y };
          _drawOverlay();
        }
        break;
    }
    pbsLastX = pos.x;
    pbsLastY = pos.y;
  }

  function _onPaintEnd() {
    if (!pbsIsPainting) return;
    pbsIsPainting = false;
    if (['eraser', 'restore', 'colorkey', 'wand'].includes(pbsActiveTool)) {
      _pushHistory();
    }
    if (pbsActiveTool === 'crop' && pbsHitbox) {
      _applyCrop();
    }
  }

  function _paintBrush(cx, cy) {
    if (!pbsCtx || !pbsCanvas) return;
    const radius = parseInt(document.getElementById('pbsBrushRadius')?.value || '12');
    if (pbsActiveTool === 'eraser') {
      pbsCtx.save();
      pbsCtx.globalCompositeOperation = 'destination-out';
      pbsCtx.beginPath();
      pbsCtx.arc(cx, cy, radius, 0, Math.PI * 2);
      pbsCtx.fill();
      pbsCtx.restore();
    } else if (pbsActiveTool === 'restore' && pbsOrigImageData) {
      // Restore original pixels in brush area
      const restored = pbsCtx.getImageData(0, 0, pbsCanvas.width, pbsCanvas.height);
      const r2 = radius * radius;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > r2) continue;
          const px = cx + dx, py = cy + dy;
          if (px < 0 || py < 0 || px >= pbsCanvas.width || py >= pbsCanvas.height) continue;
          const idx = (py * pbsCanvas.width + px) * 4;
          restored.data[idx]     = pbsOrigImageData.data[idx];
          restored.data[idx + 1] = pbsOrigImageData.data[idx + 1];
          restored.data[idx + 2] = pbsOrigImageData.data[idx + 2];
          restored.data[idx + 3] = pbsOrigImageData.data[idx + 3];
        }
      }
      pbsCtx.putImageData(restored, 0, 0);
    }
  }

  // ---- Magic Wand ----
  function _magicWand(sx, sy) {
    if (!pbsCtx || !pbsCanvas) return;
    const contiguous = document.getElementById('pbsContiguous')?.checked !== false;
    const tolerance = parseInt(document.getElementById('pbsWandTolerance')?.value || '32');
    const imgData = pbsCtx.getImageData(0, 0, pbsCanvas.width, pbsCanvas.height);
    const W = pbsCanvas.width, H = pbsCanvas.height;
    const data = imgData.data;
    const idx0 = (sy * W + sx) * 4;
    const tr = data[idx0], tg = data[idx0+1], tb = data[idx0+2], ta = data[idx0+3];

    function colorDiff(i) {
      return Math.abs(data[i]-tr) + Math.abs(data[i+1]-tg) + Math.abs(data[i+2]-tb) + Math.abs(data[i+3]-ta);
    }

    const visited = new Uint8Array(W * H);
    const queue = [sy * W + sx];
    visited[sy * W + sx] = 1;

    while (queue.length) {
      const pos = queue.shift();
      const px = pos % W, py = (pos / W) | 0;
      const i4 = pos * 4;
      if (colorDiff(i4) <= tolerance * 4) {
        // Erase this pixel
        data[i4+3] = 0;
        if (contiguous) {
          const neighbors = [pos-1, pos+1, pos-W, pos+W];
          for (const n of neighbors) {
            if (n >= 0 && n < W*H && !visited[n]) {
              const nx = n % W, ny = (n/W)|0;
              if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
                visited[n] = 1;
                queue.push(n);
              }
            }
          }
        }
      }
      if (!contiguous) {
        // Flood whole image (non-contiguous = select by color everywhere)
        for (let p = 0; p < W*H; p++) {
          if (!visited[p]) {
            visited[p] = 1;
            const pi = p*4;
            if (colorDiff(pi) <= tolerance * 4) data[pi+3] = 0;
          }
        }
        break;
      }
    }
    pbsCtx.putImageData(imgData, 0, 0);
    _pushHistory();
  }

  // ---- 1-Tap Color Key ----
  function _colorKeyErase(sx, sy) {
    if (!pbsCtx || !pbsCanvas) return;
    const tolerance = parseInt(document.getElementById('pbsWandTolerance')?.value || '32');
    const imgData = pbsCtx.getImageData(0, 0, pbsCanvas.width, pbsCanvas.height);
    const data = imgData.data;
    const idx0 = (sy * pbsCanvas.width + sx) * 4;
    const tr = data[idx0], tg = data[idx0+1], tb = data[idx0+2];
    for (let i = 0; i < data.length; i += 4) {
      const diff = Math.abs(data[i]-tr) + Math.abs(data[i+1]-tg) + Math.abs(data[i+2]-tb);
      if (diff <= tolerance * 3) data[i+3] = 0;
    }
    pbsCtx.putImageData(imgData, 0, 0);
    _pushHistory();
  }

  // ---- Auto-Trim ----
  function _autoTrim() {
    if (!pbsCtx || !pbsCanvas) return;
    const imgData = pbsCtx.getImageData(0, 0, pbsCanvas.width, pbsCanvas.height);
    const data = imgData.data;
    const W = pbsCanvas.width, H = pbsCanvas.height;
    let minX = W, minY = H, maxX = 0, maxY = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const a = data[(y * W + x) * 4 + 3];
        if (a > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return;
    const cropped = pbsCtx.getImageData(minX, minY, maxX - minX + 1, maxY - minY + 1);
    pbsCanvas.width = cropped.width;
    pbsCanvas.height = cropped.height;
    if (pbsOverlayCanvas) { pbsOverlayCanvas.width = cropped.width; pbsOverlayCanvas.height = cropped.height; }
    pbsCtx.putImageData(cropped, 0, 0);
    _pushHistory();
    _zoomFit();
    if (typeof showStatus === 'function') showStatus('✓ Đã cắt viền tự động (Auto-trim)!');
  }

  // ---- Manual Crop ----
  function _applyCrop() {
    if (!pbsHitbox || !pbsCtx || !pbsCanvas) return;
    const x1 = Math.min(pbsHitbox.x1, pbsHitbox.x2);
    const y1 = Math.min(pbsHitbox.y1, pbsHitbox.y2);
    const w  = Math.abs(pbsHitbox.x2 - pbsHitbox.x1);
    const h  = Math.abs(pbsHitbox.y2 - pbsHitbox.y1);
    if (w < 2 || h < 2) return;
    const cropped = pbsCtx.getImageData(x1, y1, w, h);
    pbsCanvas.width = w;
    pbsCanvas.height = h;
    if (pbsOverlayCanvas) { pbsOverlayCanvas.width = w; pbsOverlayCanvas.height = h; }
    pbsCtx.putImageData(cropped, 0, 0);
    pbsHitbox = null;
    pbsCropStart = null;
    _pushHistory();
    _zoomFit();
  }

  // ---- Overlay (Anchor + Hitbox) ----
  function _drawOverlay() {
    if (!pbsOverlayCtx || !pbsOverlayCanvas) return;
    pbsOverlayCtx.clearRect(0, 0, pbsOverlayCanvas.width, pbsOverlayCanvas.height);
    // Hitbox
    if (pbsHitbox) {
      const x1 = Math.min(pbsHitbox.x1, pbsHitbox.x2);
      const y1 = Math.min(pbsHitbox.y1, pbsHitbox.y2);
      const w  = Math.abs(pbsHitbox.x2 - pbsHitbox.x1);
      const h  = Math.abs(pbsHitbox.y2 - pbsHitbox.y1);
      pbsOverlayCtx.save();
      pbsOverlayCtx.setLineDash([4, 3]);
      pbsOverlayCtx.strokeStyle = 'cyan';
      pbsOverlayCtx.lineWidth = 1.5;
      pbsOverlayCtx.strokeRect(x1, y1, w, h);
      pbsOverlayCtx.restore();
    }
    // Anchor crosshair
    if (pbsAnchor) {
      const { x, y } = pbsAnchor;
      pbsOverlayCtx.save();
      pbsOverlayCtx.strokeStyle = '#FFB400';
      pbsOverlayCtx.lineWidth = 1.5;
      pbsOverlayCtx.beginPath();
      pbsOverlayCtx.moveTo(x - 8, y); pbsOverlayCtx.lineTo(x + 8, y);
      pbsOverlayCtx.moveTo(x, y - 8); pbsOverlayCtx.lineTo(x, y + 8);
      pbsOverlayCtx.stroke();
      pbsOverlayCtx.restore();
    }
  }

  // ---- Zoom ----
  function _bindZoomControls() {
    const zi = document.getElementById('pbsZoomIn');
    const zo = document.getElementById('pbsZoomOut');
    const zr = document.getElementById('pbsZoomReset');
    if (zi) zi.addEventListener('click', () => _setZoom(pbsZoom * 1.25));
    if (zo) zo.addEventListener('click', () => _setZoom(pbsZoom / 1.25));
    if (zr) zr.addEventListener('click', () => _zoomFit());
  }

  function _setZoom(z) {
    pbsZoom = Math.max(0.1, Math.min(8, z));
    if (pbsCanvas) {
      pbsCanvas.style.transform = `scale(${pbsZoom})`;
      pbsCanvas.style.transformOrigin = 'center center';
      if (pbsOverlayCanvas) {
        pbsOverlayCanvas.style.transform = `scale(${pbsZoom})`;
        pbsOverlayCanvas.style.transformOrigin = 'center center';
      }
    }
    const lbl = document.getElementById('pbsZoomLabel');
    if (lbl) lbl.textContent = Math.round(pbsZoom * 100) + '%';
  }

  function _zoomFit() {
    if (!pbsCanvas) return;
    const vp = document.getElementById('pbsViewport');
    if (!vp) { _setZoom(1); return; }
    const vpW = vp.clientWidth || 400;
    const vpH = vp.clientHeight || 280;
    const z = Math.min(vpW / pbsCanvas.width, vpH / pbsCanvas.height, 1);
    _setZoom(z);
  }

  // ---- Anim Section ----
  function _bindAnimSection() {
    const cols  = document.getElementById('pbsCols');
    const rows  = document.getElementById('pbsRows');
    const fpsEl = document.getElementById('pbsFps');
    [cols, rows, fpsEl].forEach(el => {
      if (el) el.addEventListener('change', _sliceFrames);
    });

    // State range inputs
    ['Idle','Walk','Sleep','Click','Drag'].forEach(s => {
      const el = document.getElementById(`pbsState${s}`);
      if (el) el.addEventListener('change', () => _parseStates());
    });

    // Sandbox state buttons
    document.querySelectorAll('.pbs-state-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pbs-state-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sbActiveState = btn.getAttribute('data-state');
        sbFrameIdx = 0;
      });
    });

    const showOvChk = document.getElementById('pbsSandboxShowOverlays');
    if (showOvChk) showOvChk.addEventListener('change', _renderSandboxFrame);

    _startSandboxLoop();
  }

  function _sliceFrames() {
    if (!pbsCanvas || !pbsCtx) return;
    const cols = parseInt(document.getElementById('pbsCols')?.value || '4');
    const rows = parseInt(document.getElementById('pbsRows')?.value || '1');
    sbFps = parseInt(document.getElementById('pbsFps')?.value || '12');
    const fw = Math.floor(pbsCanvas.width / cols);
    const fh = Math.floor(pbsCanvas.height / rows);
    sbFrames = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        sbFrames.push(pbsCtx.getImageData(c * fw, r * fh, fw, fh));
      }
    }
    _parseStates();
  }

  function _parseStates() {
    ['idle','walk','sleep','click','drag'].forEach(s => {
      const el = document.getElementById(`pbsState${s.charAt(0).toUpperCase() + s.slice(1)}`);
      if (!el || !el.value.trim()) { sbStates[s] = null; return; }
      const parts = el.value.split('-').map(n => parseInt(n.trim()));
      sbStates[s] = { start: parts[0] || 0, end: (parts[1] !== undefined ? parts[1] : parts[0]) || 0 };
    });
    if (!sbStates.idle) sbStates.idle = { start: 0, end: Math.max(0, sbFrames.length - 1) };
  }

  function _startSandboxLoop() {
    function loop(ts) {
      sbAnimId = requestAnimationFrame(loop);
      if (!sbFrames.length) return;
      const delay = 1000 / Math.max(1, sbFps);
      if (ts - sbLastTime < delay) return;
      sbLastTime = ts;
      const st = sbStates[sbActiveState] || sbStates.idle || { start: 0, end: sbFrames.length - 1 };
      if (!st) return;
      const range = st.end - st.start + 1;
      sbFrameIdx = st.start + (sbFrameIdx - st.start + 1) % Math.max(1, range);
      _renderSandboxFrame();
    }
    sbAnimId = requestAnimationFrame(loop);
  }

  function _renderSandboxFrame() {
    const sbCanvas = document.getElementById('pbsSandboxCanvas');
    if (!sbCanvas || !sbFrames.length) return;
    const ctx = sbCanvas.getContext('2d');
    const frame = sbFrames[sbFrameIdx] || sbFrames[0];
    // Draw frame
    const tmpC = document.createElement('canvas');
    tmpC.width = frame.width; tmpC.height = frame.height;
    tmpC.getContext('2d').putImageData(frame, 0, 0);
    ctx.clearRect(0, 0, sbCanvas.width, sbCanvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmpC, 0, 0, sbCanvas.width, sbCanvas.height);

    // Overlays
    const showOv = document.getElementById('pbsSandboxShowOverlays')?.checked;
    if (showOv) {
      // Hitbox
      if (pbsHitbox) {
        const cols = parseInt(document.getElementById('pbsCols')?.value || '4');
        const rows = parseInt(document.getElementById('pbsRows')?.value || '1');
        if (cols > 0 && rows > 0 && pbsCanvas) {
          const fw = sbCanvas.width; const fh = sbCanvas.height;
          const scaleX = fw / (pbsCanvas.width / cols);
          const scaleY = fh / (pbsCanvas.height / rows);
          const x1 = Math.min(pbsHitbox.x1, pbsHitbox.x2) * scaleX;
          const y1 = Math.min(pbsHitbox.y1, pbsHitbox.y2) * scaleY;
          const w  = Math.abs(pbsHitbox.x2 - pbsHitbox.x1) * scaleX;
          const h  = Math.abs(pbsHitbox.y2 - pbsHitbox.y1) * scaleY;
          ctx.save(); ctx.setLineDash([3, 2]); ctx.strokeStyle = 'cyan'; ctx.lineWidth = 1;
          ctx.strokeRect(x1, y1, w, h); ctx.restore();
        }
      }
      // Anchor
      if (pbsAnchor && pbsCanvas) {
        const cols = parseInt(document.getElementById('pbsCols')?.value || '4');
        const rows = parseInt(document.getElementById('pbsRows')?.value || '1');
        const scaleX = sbCanvas.width / (pbsCanvas.width / Math.max(1, cols));
        const scaleY = sbCanvas.height / (pbsCanvas.height / Math.max(1, rows));
        const ax = pbsAnchor.x * scaleX, ay = pbsAnchor.y * scaleY;
        ctx.save(); ctx.strokeStyle = '#FFB400'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ax - 5, ay); ctx.lineTo(ax + 5, ay);
        ctx.moveTo(ax, ay - 5); ctx.lineTo(ax, ay + 5);
        ctx.stroke(); ctx.restore();
      }
    }
  }

  // ---- Save / Export ----
  function _bindSaveBtn() {
    const btn = document.getElementById('pbsSaveToLibrary');
    if (!btn) return;
    btn.addEventListener('click', _savePetToLibrary);
  }

  function _savePetToLibrary() {
    if (!pbsCanvas) {
      if (typeof showStatus === 'function') showStatus('⚠️ Chưa có ảnh Pet nào trong Editor!');
      return;
    }
    const dataUrl = pbsCanvas.toDataURL('image/png');
    const hint = document.getElementById('pbsSaveHint');

    // Build animation config
    const animConfig = _getAnimationConfig();

    // Apply to appState
    if (typeof appState !== 'undefined' && appState) {
      appState.activePetModelId = 'custom-builder';
      appState.mascotType = 'custom';
      appState.mascotUrl = dataUrl;
      appState.petAnimConfig = animConfig;
      appState.petAnchor = pbsAnchor;
      appState.petHitbox = pbsHitbox;
      if (typeof updateLivePreview === 'function') updateLivePreview();
      if (typeof saveConfig === 'function') saveConfig();
    }

    // Update library card preview
    const customCard = document.getElementById('btnUploadPetModel');
    if (customCard) {
      let previewImg = customCard.querySelector('img.pbs-preview-thumb');
      if (!previewImg) {
        const wrap = customCard.querySelector('.pet-model-avatar-wrap');
        if (wrap) {
          previewImg = document.createElement('img');
          previewImg.className = 'pet-model-thumb pbs-preview-thumb';
          previewImg.alt = 'Custom Pet';
          wrap.innerHTML = '';
          wrap.appendChild(previewImg);
        }
      }
      if (previewImg) previewImg.src = dataUrl;
      document.querySelectorAll('#petModelsGrid .pet-model-card').forEach(c => c.classList.remove('active'));
      customCard.classList.add('active');
    }

    // Also mount preview overlay
    _mountPetOverlayInPreview();

    if (hint) hint.textContent = '✓ Đã lưu và áp dụng!';
    setTimeout(() => { if (hint) hint.textContent = ''; }, 3000);
    if (typeof showStatus === 'function') showStatus('✓ Pet Builder: Đã lưu vào thư viện và áp dụng ngay!');
  }

  function _getAnimationConfig() {
    const cols = parseInt(document.getElementById('pbsCols')?.value || '4');
    const rows = parseInt(document.getElementById('pbsRows')?.value || '1');
    const fps  = parseInt(document.getElementById('pbsFps')?.value || '12');
    _parseStates();
    return {
      cols, rows, fps,
      totalFrames: cols * rows,
      states: { ...sbStates },
      anchor: pbsAnchor,
      hitbox: pbsHitbox
    };
  }
  window.PetBuilderStudio = { getAnimationConfig: _getAnimationConfig };

  // ---- Mount PetOverlay ----
  function _mountPetOverlayInPreview() {
    if (typeof window.PetOverlay !== 'function') return;
    try {
      if (!window._globalPetOverlay) {
        window._globalPetOverlay = new window.PetOverlay({
          doc: document,
          appState: typeof appState !== 'undefined' ? appState : null,
          posX: (typeof appState !== 'undefined' && appState && appState.petOffsetX) || 120,
          posY: (typeof appState !== 'undefined' && appState && appState.petOffsetY) || 120,
          showPedestal: (typeof appState !== 'undefined' && appState && appState.petPedestal) ?? true,
          pedestalColor: (typeof appState !== 'undefined' && appState && appState.petPedestalColor) || '#7DCFFF',
          petDataUrl: (typeof appState !== 'undefined' && appState && appState.mascotUrl) || '',
          filterOnPet: (typeof appState !== 'undefined' && appState && appState.filterTargets && appState.filterTargets.pet) || false
        });
        window._globalPetOverlay.mount();
        window.PetOverlayInstance = window._globalPetOverlay;
        if (typeof window.PetEventsUI !== 'undefined' && window.PetEventsUI.init) {
          window.PetEventsUI.init();
        }
      } else {
        if (typeof appState !== 'undefined' && appState) {
          window._globalPetOverlay.setPetData({
            dataUrl: appState.mascotUrl || '',
            anchorX: (appState.petAnchor && appState.petAnchor.x) || 0,
            anchorY: (appState.petAnchor && appState.petAnchor.y) || 0,
            hitbox: appState.petHitbox || null
          });
          window._globalPetOverlay.setPedestal(
            appState.petPedestal ?? true,
            appState.petPedestalColor || '#7DCFFF'
          );
          if (typeof window._globalPetOverlay.setFilterOnPet === 'function') {
            window._globalPetOverlay.setFilterOnPet(appState.filterTargets && appState.filterTargets.pet);
          }
        }
      }
    } catch (err) {
      console.warn('PetOverlay mount error:', err);
    }
  }
  window.mountPetOverlayInPreview = _mountPetOverlayInPreview;

  // ---- Keyboard Shortcuts ----
  function _bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only active when PBS canvas studio is visible/focused
      const studio = document.getElementById('petBuilderStudio');
      if (!studio) return;
      // Allow globally when pet tab is active
      const petPane = document.getElementById('tab-pet');
      if (!petPane || !petPane.classList.contains('active')) return;

      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        _undo();
      } else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z') || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        _redo();
      }
    });
  }

  // ---- Filter Target Switch ----
  function _bindFilterTargetSwitch() {
    ['chkFilterBg','chkFilterUI','chkFilterPet'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', _applyFilterTargetSwitch);
    });
    _applyFilterTargetSwitch();
  }

  function _applyFilterTargetSwitch() {
    const filterPet = document.getElementById('chkFilterPet')?.checked || false;
    const filterBg  = document.getElementById('chkFilterBg')?.checked !== false;
    const filterUI  = document.getElementById('chkFilterUI')?.checked !== false;
    // Expose on appState for patcher/liveSync to consume
    if (typeof appState !== 'undefined' && appState) {
      appState.filterTargets = { pet: filterPet, bg: filterBg, ui: filterUI };
      if (typeof saveConfig === 'function') saveConfig();
    }
    // Visual: prevent filters on the preview overlay mount if pet filter is off
    const mount = document.getElementById('previewPetOverlayMount');
    if (mount) {
      mount.style.filter = filterPet ? '' : 'none';
      mount.style.backdropFilter = filterPet ? '' : 'none';
    }
    if (typeof window.patcherApplyFilterTargets === 'function') {
      window.patcherApplyFilterTargets({ pet: filterPet, bg: filterBg, ui: filterUI });
    }
  }

})();

// Start
init();
