const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const patcher = require('../patcher');
const liveSync = require('../liveSync');

console.log('=== TEST 1: Hallmark Tokens CSS Validation ===');
const cssTokens = fs.readFileSync('renderer/hallmarkTokens.css', 'utf8');
const expectedTokens = [
  '--color-paper', '--color-paper-2', '--color-paper-3',
  '--color-ink', '--color-ink-2', '--color-muted',
  '--color-rule', '--color-rule-2',
  '--color-accent', '--color-accent-soft', '--color-focus',
  '--radius-xs', '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl',
  '--space-2xs', '--space-xs', '--space-sm', '--space-md', '--space-lg',
  '--tracking-display', '--tracking-mono',
  'data-theme="graphite"', 'data-theme="midnight"', 'data-theme="cyber-lime"',
  'data-theme="sakura"', 'data-theme="dusk"'
];
for (const token of expectedTokens) {
  assert(cssTokens.includes(token), 'Missing token in hallmarkTokens.css: ' + token);
}
console.log('✓ All Hallmark design tokens and theme colorways verified.');

console.log('\n=== TEST 2: Live Preview Chat Markup in index.html ===');
const html = fs.readFileSync('renderer/index.html', 'utf8');
assert(html.includes('hallmarkTokens.css'), 'Missing hallmarkTokens.css link');
assert(html.includes('previewSidebar'), 'Missing previewSidebar');
assert(html.includes('side-btn-new'), 'Missing New Conversation button');
assert(html.includes('Automations'), 'Missing Automations navigation button');
assert(html.includes('Customizations'), 'Missing Customizations navigation button');
assert(html.includes('preview-main-header'), 'Missing preview-main-header');
assert(html.includes('Gemini 3.8 Flash High'), 'Missing model badge');
assert(html.includes('thought-disclosure'), 'Missing thought-disclosure');
assert(html.includes('code-snippet-card'), 'Missing code snippet card');
assert(html.includes('surface-composer'), 'Missing surface composer');
assert(html.includes('surface-composer-card'), 'Missing surface-composer-card');
assert(html.includes('previewMascotBadge'), 'Missing previewMascotBadge');
console.log('✓ Live Preview chat window markup verified.');

console.log('\n=== TEST 3: CSS Hairline Rules & Concentric Radii in style.css ===');
const styleCss = fs.readFileSync('renderer/style.css', 'utf8');
assert(styleCss.includes('--color-rule'), 'Missing --color-rule references');
assert(styleCss.includes('.preview-sidebar'), 'Missing .preview-sidebar styles');
assert(styleCss.includes('.thought-disclosure'), 'Missing .thought-disclosure styles');
assert(styleCss.includes('.surface-composer-card'), 'Missing .surface-composer-card styles');
console.log('✓ CSS Hallmark styling rules verified.');

console.log('\n=== TEST 4: Patcher & LiveSync Anti-Slop Implementation ===');
const patcherHook = patcher.generateHookCode();
new vm.Script(patcherHook);
assert(patcherHook.includes('--color-rule'), 'Patcher hook missing --color-rule');
assert(patcherHook.includes('ag-theme-motion-canvas'), 'Patcher hook missing motion canvas');
assert(patcherHook.includes('ag-interactive-pet'), 'Patcher hook missing pet engine');

const sampleCfg = {
  themeMode: 'dark',
  sidebarBg: 'rgba(15, 23, 42, 0.85)',
  editorBg: 'rgba(2, 6, 23, 0.90)',
  accentColor: '#38EF7D',
  accentSecondary: '#11998E',
  glowEffect: true,
  glowColor: '#38EF7D',
  glowRadius: 16,
  cardRadius: 10,
  blurStrength: 16,
  motionFlow: { enabled: false, flowSpeed: 1, arrows: [], pins: [] }
};
const generatedCss = liveSync.buildThemeCss(sampleCfg);
assert(generatedCss.includes('--color-rule: rgba(255, 255, 255, 0.08)'), 'Missing --color-rule in buildThemeCss');
assert(generatedCss.includes('.surface-composer-card'), 'Missing .surface-composer-card in buildThemeCss');
assert(generatedCss.includes('.sample-bubble.user'), 'Missing .sample-bubble.user in buildThemeCss');
assert(generatedCss.includes('.sample-bubble.agent'), 'Missing .sample-bubble.agent in buildThemeCss');
console.log('✓ liveSync and patcher CSS generation verified.');

console.log('\n=========================================');
console.log('ALL HALLMARK VERIFICATION CHECKS PASSED');
console.log('=========================================');
