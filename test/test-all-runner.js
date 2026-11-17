/**
 * test-all-runner.js - BỘ CHẠY TẤT CẢ TEST TOÀN DỰ ÁN (Central Test Runner)
 * Quét và thực thi 100% các bài test, bao gồm cả test thẻ mới và toàn bộ test cũ.
 * Định dạng chuẩn: PASS / FAIL / KHÔNG KẾT LUẬN / THIẾU
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const TEST_FILES = [
  'test-config.js',
  'test-layer-motion.js',
  'test-layers.js',
  'test-viewport.js',
  'test-selection.js',
  'test-cut.js',
  'test-retouch.js',
  'test-undo.js',
  'test-project-io.js',
  'test-motion-engine.js',
  'test-physics-segment.js',
  'test-motion-adv-ui.js',
  'test-pet-events.js',
  'test-pet-pack.js',
  'test-e2e-pet-builder.js',
  'test-layers-panel.js',
  'test-app.js',
  'test-hallmark.js',
  'test-video-import.js',
  'test-ambient-engine.js',
  'test-presets.js',
  'test-qa-verify.js',
  'test-qa-video-import.js',
  'test-ui-pet.js',
  'test-ui-video-import.js',
  'test-pet-builder-studio.js',
  'test-pet-engine.js',
  'test-pet-models.js',
  'test-pet-overlay.js'
];

console.log('================================================================');
console.log('🧪 BÁO CÁO: CHẠY TẤT CẢ TEST TOÀN BỘ DỰ ÁN (ANTIGRAVITY STUDIO)');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;
let missingCount = 0;
let inconclusiveCount = 0;

const rootDir = path.resolve(__dirname, '..');

for (const tf of TEST_FILES) {
  const fullPath = path.join(__dirname, tf);
  if (!fs.existsSync(fullPath)) {
    console.log(`[THIẾU] ${tf} - File test không tồn tại`);
    missingCount++;
    continue;
  }

  let stdout = '';
  let success = false;
  let lastErr = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      stdout = execSync(`node "${fullPath}"`, {
        cwd: rootDir,
        timeout: 30000,
        encoding: 'utf8'
      });
      success = true;
      break;
    } catch (err) {
      lastErr = err;
      if (attempt < 2) {
        try { execSync('ping 127.0.0.1 -n 2 > nul', { shell: 'cmd.exe', timeout: 2000 }); } catch (e) {}
      }
    }
  }

  if (success) {
    const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
    const passLines = lines.filter(l => l.startsWith('PASS ') || l.includes('✓') || l.includes('PASS') || l.includes('PASSED'));
    const failLines = lines.filter(l => l.startsWith('FAIL ') || l.includes('FAIL') || l.includes('FAILED'));

    if (failLines.length > 0) {
      console.log(`[FAIL] ${tf} -> ${failLines[0]}`);
      failCount++;
    } else if (passLines.length > 0) {
      const summary = lines.find(l => l.startsWith('PASS ')) || passLines[0];
      console.log(`[PASS] ${tf} -> ${summary}`);
      passCount++;
    } else {
      console.log(`[KHÔNG KẾT LUẬN] ${tf} - Không tìm thấy dòng kết quả chuẩn PASS/FAIL`);
      inconclusiveCount++;
    }
  } else {
    const errMsg = (lastErr && (lastErr.stdout || lastErr.message) || '').split('\n').filter(Boolean).pop() || 'Lỗi thực thi';
    console.log(`[FAIL] ${tf} -> ${errMsg.trim()}`);
    failCount++;
  }
}

console.log('\n----------------------------------------------------------------');
console.log(`TỔNG KẾT: ${passCount} PASS | ${failCount} FAIL | ${inconclusiveCount} KHÔNG KẾT LUẬN | ${missingCount} THIẾU`);
console.log(`TỶ LỆ VƯỢT QUA: ${((passCount / TEST_FILES.length) * 100).toFixed(1)}%`);
console.log('================================================================');

if (failCount > 0 || missingCount > 0 || inconclusiveCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
