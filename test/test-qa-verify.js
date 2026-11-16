const fs = require('fs');
const vm = require('vm');
const path = require('path');

const appDir = path.resolve(__dirname, '..');
const patcher = require(path.join(appDir, 'patcher.js'));
const MotionStudio = require(path.join(appDir, 'renderer', 'motionStudio.js'));
const liveSync = require(path.join(appDir, 'liveSync.js'));

async function runQAVerification() {
  console.log('=== QA VERIFICATION SUITE ===\n');

  // 1. Patcher generateHookCode Verification
  console.log('1. Verifying patcher.js and generateHookCode():');
  const hookCode = patcher.generateHookCode();
  if (!hookCode || typeof hookCode !== 'string') {
    throw new Error('generateHookCode() returned empty or non-string result');
  }
  console.log(`   - Generated hook code length: ${hookCode.length} characters`);

  const checks = [
    { name: '#ag-theme-motion-canvas element', regex: /ag-theme-motion-canvas/ },
    { name: 'motionFlow config evaluation', regex: /motion\s*&&\s*motion\.enabled/ },
    { name: 'WebGL context initialization', regex: /\.getContext\(['"]webgl['"]/ },
    { name: 'WebGL shader creation and compilation', regex: /gl\.createShader/ },
    { name: 'Motion key caching logic', regex: /motionKey/ },
    { name: 'Fallback/cleanup when motion disabled', regex: /cancelAnimationFrame/ }
  ];

  for (const check of checks) {
    if (!check.regex.test(hookCode)) {
      throw new Error(`Hook code missing expected feature: ${check.name}`);
    }
    console.log(`   ✓ Hook code contains: ${check.name}`);
  }

  // Syntax check hookCode via vm.Script
  new vm.Script(hookCode);
  console.log('   ✓ vm.Script syntax validation of hook code: SUCCESS (0 syntax errors)');

  // 2. Presets Verification
  console.log('\n2. Verifying MotionStudio Presets:');
  const expectedPresets = ['hair-wind', 'waterfall', 'clouds', 'sway-fabric'];
  for (const presetId of expectedPresets) {
    const tmpl = MotionStudio.PRESET_TEMPLATES[presetId];
    if (!tmpl) {
      throw new Error(`Missing preset template: ${presetId}`);
    }
    if (!tmpl.name || !Array.isArray(tmpl.arrows) || !Array.isArray(tmpl.pins) || typeof tmpl.flowSpeed !== 'number') {
      throw new Error(`Invalid preset structure for: ${presetId}`);
    }
    console.log(`   ✓ Preset '${presetId}' ("${tmpl.name}"): ${tmpl.arrows.length} arrows, ${tmpl.pins.length} pins, speed=${tmpl.flowSpeed}`);
  }

  // Test applyPresetTemplate on instance
  const studio = new MotionStudio({});
  for (const presetId of expectedPresets) {
    studio.applyPresetTemplate(presetId);
    const tmpl = MotionStudio.PRESET_TEMPLATES[presetId];
    if (studio.arrows.length !== tmpl.arrows.length || studio.pins.length !== tmpl.pins.length || studio.flowSpeed !== tmpl.flowSpeed) {
      throw new Error(`Preset application failed for ${presetId}`);
    }
    // Verify deep copy (modifying studio arrows does not mutate template)
    studio.arrows[0].speed = 999;
    if (tmpl.arrows[0].speed === 999) {
      throw new Error(`Preset mutation leak detected on ${presetId}`);
    }
  }
  console.log('   ✓ applyPresetTemplate() deep-cloning & state updates: ALL PASSED');

  // 3. UI and wiring verification
  console.log('\n3. Verifying renderer/index.html & renderer/app.js:');
  const indexHtml = fs.readFileSync(path.join(appDir, 'renderer', 'index.html'), 'utf8');
  if (!indexHtml.includes('id="motionPresetsRow"')) {
    throw new Error('renderer/index.html missing #motionPresetsRow');
  }
  for (const presetId of expectedPresets) {
    if (!indexHtml.includes(`data-preset="${presetId}"`)) {
      throw new Error(`renderer/index.html missing button for preset ${presetId}`);
    }
  }
  console.log('   ✓ renderer/index.html contains #motionPresetsRow and all 4 preset buttons');

  const appJs = fs.readFileSync(path.join(appDir, 'renderer', 'app.js'), 'utf8');
  if (!appJs.includes('.motion-preset-btn') || !appJs.includes('applyPresetTemplate')) {
    throw new Error('renderer/app.js missing motion preset click handling');
  }
  console.log('   ✓ renderer/app.js contains event delegation & wiring for .motion-preset-btn');

  // 4. Live CDP Sync Verification
  console.log('\n4. Verifying Live CDP Application to Antigravity:');
  const configPath = path.join(
    process.env.USERPROFILE || 'C:\\Users\\Admin',
    '.gemini', 'antigravity', 'theme-studio', 'config.json'
  );
  if (!fs.existsSync(configPath)) {
    throw new Error(`Theme studio config not found at: ${configPath}`);
  }
  const baseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Test live sync with custom flow config
  const testFlowConfig = {
    ...baseConfig,
    motionFlow: {
      enabled: true,
      flowSpeed: 1.2,
      arrows: [{ x1: 0.3, y1: 0.2, x2: 0.7, y2: 0.25, speed: 1.2 }],
      pins: [{ x: 0.5, y: 0.5, radius: 0.1 }]
    }
  };

  const syncResult = await liveSync.applyToAntigravity(testFlowConfig);
  console.log(`   ✓ CDP Live Sync Result:`, syncResult);
  if (!syncResult || !syncResult.success) {
    throw new Error(`CDP Live Sync failed: ${JSON.stringify(syncResult)}`);
  }

  // Also test each of the 4 presets applied via liveSync
  console.log('\n5. Testing Live CDP Sync with All 4 Presets:');
  for (const presetId of expectedPresets) {
    const tmpl = MotionStudio.PRESET_TEMPLATES[presetId];
    const presetFlowConfig = {
      ...baseConfig,
      motionFlow: {
        enabled: true,
        flowSpeed: tmpl.flowSpeed,
        arrows: tmpl.arrows,
        pins: tmpl.pins
      }
    };
    const res = await liveSync.applyToAntigravity(presetFlowConfig);
    console.log(`   ✓ Applied preset '${presetId}' ("${tmpl.name}") via CDP: success=${res.success}, port=${res.targetPort}`);
    if (!res.success) {
      throw new Error(`Failed to apply preset ${presetId} via CDP`);
    }
  }

  console.log('\n=========================================');
  console.log('QA VERIFICATION COMPLETED WITH 100% PASS');
  console.log('=========================================');
}

runQAVerification().catch(err => {
  console.error('\n❌ QA VERIFICATION FAILED:', err);
  process.exit(1);
});
