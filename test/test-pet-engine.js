const assert = require('assert');
const path = require('path');
const vm = require('vm');
const fs = require('fs');

const appDir = path.resolve(__dirname, '..');
const patcher = require(path.join(appDir, 'patcher.js'));
const liveSync = require(path.join(appDir, 'liveSync.js'));

console.log('=== PET ENGINE VERIFICATION SUITE ===\n');

// 1. Patcher generateHookCode pet hierarchy & styles
console.log('1. Verifying patcher.js and generateHookCode():');
const hook = patcher.generateHookCode();
assert.ok(typeof hook === 'string' && hook.length > 0, 'generateHookCode() should return string');

const expectedElements = [
  'ag-interactive-pet',
  'ag-pet-pedestal',
  'ag-pet-aura-frame',
  'ag-pet-sprite',
  'ag-pet-bubble'
];
for (const el of expectedElements) {
  assert.ok(hook.includes(el), `Hook code must contain element class/id: ${el}`);
  console.log(`   ✓ Hook contains: ${el}`);
}

const expectedStyles = [
  'border-theme-gradient',
  'border-neon-glow',
  'border-holo-pedestal',
  'border-glass-bubble',
  'border-none',
  'agPedestalPulse'
];
for (const st of expectedStyles) {
  assert.ok(hook.includes(st), `Hook code must contain style/keyframe: ${st}`);
  console.log(`   ✓ Hook contains: ${st}`);
}

new vm.Script(hook);
console.log('   ✓ vm.Script syntax validation of hook code: SUCCESS (0 syntax errors)');

// 2. liveSync buildThemeCss tests
console.log('\n2. Verifying liveSync buildThemeCss():');
const sampleConfigs = [
  {
    name: 'Theme Gradient + Pedestal',
    cfg: {
      enabled: true,
      mascotUrl: '../assets/mascot-pixel-pet.png',
      petBorderStyle: 'theme-gradient',
      petBorderWidth: 3,
      petGlowColor: '#38EF7D',
      petGlowRadius: 14,
      petPedestal: true,
      petPedestalColor: '#7DCFFF'
    }
  },
  {
    name: 'Neon Glow + Pedestal',
    cfg: {
      enabled: true,
      mascotUrl: '../assets/icon.png',
      petBorderStyle: 'neon-glow',
      petBorderWidth: 2,
      petGlowColor: '#7DCFFF',
      petGlowRadius: 16,
      petPedestal: true,
      petPedestalColor: '#00E5FF'
    }
  },
  {
    name: 'Holo Pedestal',
    cfg: {
      enabled: true,
      mascotUrl: '../assets/composer-banner.jpg',
      petBorderStyle: 'holo-pedestal',
      petBorderWidth: 2,
      petGlowColor: '#BD93F9',
      petGlowRadius: 15,
      petPedestal: true,
      petPedestalColor: '#BD93F9'
    }
  },
  {
    name: 'Glass Bubble',
    cfg: {
      enabled: true,
      mascotUrl: '../assets/deco-floral-bird.png',
      petBorderStyle: 'glass-bubble',
      petBorderWidth: 2,
      petGlowColor: '#FFE066',
      petGlowRadius: 10,
      petPedestal: true,
      petPedestalColor: '#FFA07A'
    }
  },
  {
    name: 'Backward Compatibility (Legacy Config without pet props)',
    cfg: {
      enabled: true,
      mascotUrl: '../assets/mascot-pixel-pet.png',
      mascotSize: 56
    }
  }
];

for (const sample of sampleConfigs) {
  const css = liveSync.buildThemeCss(sample.cfg);
  assert.ok(css && css.length > 0, `CSS should not be empty for ${sample.name}`);
  assert.ok(css.includes('.ag-pet-pedestal'), `Missing pedestal rule in ${sample.name}`);
  assert.ok(css.includes('.ag-pet-aura-frame'), `Missing aura frame rule in ${sample.name}`);
  assert.ok(css.includes('.ag-pet-sprite'), `Missing sprite rule in ${sample.name}`);
  assert.ok(css.includes('.ag-pet-bubble'), `Missing bubble rule in ${sample.name}`);
  console.log(`   ✓ CSS validated for: ${sample.name}`);
}

// 3. Live CDP test
console.log('\n3. Verifying Live CDP Application:');
const configPath = path.join(
  process.env.USERPROFILE || 'C:\\Users\\Admin',
  '.gemini', 'antigravity', 'theme-studio', 'config.json'
);
if (fs.existsSync(configPath)) {
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  cfg.mascotUrl = '../assets/mascot-pixel-pet.png';
  cfg.mascotSize = 58;
  cfg.petBorderStyle = 'theme-gradient';
  cfg.petBorderWidth = 2;
  cfg.petGlowColor = '#38EF7D';
  cfg.petGlowRadius = 12;
  cfg.petPedestal = true;
  cfg.petPedestalColor = '#7DCFFF';

  liveSync.applyToAntigravity(cfg).then(res => {
    assert.strictEqual(res.success, true, 'Live sync pet update should succeed');
    console.log(`   ✓ Live CDP Pet Injection: success=${res.success}, targetPort=${res.targetPort}`);
    console.log('\n=========================================');
    console.log('PET ENGINE VERIFICATION: 100% PASS');
    console.log('=========================================');
  }).catch(err => {
    console.error('CDP Live Sync Error:', err);
    process.exit(1);
  });
} else {
  console.log('   (Skipping CDP live sync: config.json not found)');
  console.log('\n=========================================');
  console.log('PET ENGINE VERIFICATION: 100% PASS');
  console.log('=========================================');
}
