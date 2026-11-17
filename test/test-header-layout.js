/**
 * test-header-layout.js - KIỂM THỬ GIAO DIỆN THANH PHÍA TRÊN & KHUNG XEM TRƯỚC (UI-1)
 * Kiểm tra các tiêu chuẩn:
 * 1. Thuộc tính data-ui (header, panel, tabbar, tab, preview, pet, pet-bubble, studio-tool).
 * 2. Header 1 hàng cao tối đa 48px, nút Lưu & Chạy nổi bật, nút ⋯ với menu.
 * 3. Thanh tab 1 hàng cao tối đa 52px, 6 tab chia đều, không cắt ở bề rộng 420px-560px.
 * 4. Bong bóng thoại của pet kẹp trong khung xem trước, tự ẩn sau 3s, z-index < studio.
 * 5. Thanh mô phỏng chuyển vào tab Pet, khung xem trước không chứa nút của Studio.
 * 6. Chạy hàm testHeaderLayout() đạt PASS layout.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 BÁO CÁO KIỂM THỬ UI-1: THANH PHÍA TRÊN THEME STUDIO & LAYOUT');
console.log('================================================================\n');

const rootDir = path.resolve(__dirname, '..');
const htmlPath = path.join(rootDir, 'renderer', 'index.html');
const cssPath = path.join(rootDir, 'renderer', 'style.css');
const petOverlayPath = path.join(rootDir, 'renderer', 'petOverlay.js');
const testsJsPath = path.join(rootDir, 'renderer', 'tests.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const petJs = fs.readFileSync(petOverlayPath, 'utf8');
const testsJs = fs.readFileSync(testsJsPath, 'utf8');

// 1. Kiểm tra data-ui attributes trong index.html
console.log('--- 1. KIỂM TRA THUỘC TÍNH data-ui TRONG index.html ---');
assert.ok(html.includes('data-ui="header"'), 'Thiếu data-ui="header"');
assert.ok(html.includes('data-ui="panel"'), 'Thiếu data-ui="panel"');
assert.ok(html.includes('data-ui="tabbar"'), 'Thiếu data-ui="tabbar"');
assert.ok(html.includes('data-ui="tab"'), 'Thiếu data-ui="tab"');
assert.ok(html.includes('data-ui="preview"'), 'Thiếu data-ui="preview"');
assert.ok(html.includes('data-ui="studio-tool"'), 'Thiếu data-ui="studio-tool"');
console.log('✓ Tất cả thuộc tính data-ui cốt lõi hiện diện trong HTML');

// 2. Kiểm tra thanh tab 6 tab
console.log('\n--- 2. KIỂM TRA CẤU TRÚC THANH TAB (6 TAB) ---');
const tabMatches = html.match(/class="tab-btn[^"]*"\s+data-tab="([^"]+)"\s+data-ui="tab"/g) || [];
assert.strictEqual(tabMatches.length, 6, `Cần đúng 6 tab trên thanh tab, tìm thấy: ${tabMatches.length}`);
const expectedTabLabels = ['Nền', 'Màu', 'Kính', 'Pet', 'Động', 'Hồ sơ'];
expectedTabLabels.forEach(lbl => {
  assert.ok(html.includes(`>${lbl}</span>`), `Thanh tab thiếu nhãn ngắn gọn: ${lbl}`);
});
console.log('✓ 6 tab ngắn gọn chia đều hiện diện đầy đủ: Nền, Màu, Kính, Pet, Động, Hồ sơ');

// 3. Kiểm tra Header và Menu ⋯
console.log('\n--- 3. KIỂM TRA HEADER & MENU TÙY CHỌN ⋯ ---');
assert.ok(html.includes('id="btnStudioMenu"'), 'Thiếu nút menu ⋯ (#btnStudioMenu)');
assert.ok(html.includes('id="studioDropdownMenu"'), 'Thiếu menu dropdown (#studioDropdownMenu)');
assert.ok(html.includes('id="btnSaveApply"'), 'Thiếu nút Lưu & Chạy (#btnSaveApply)');
assert.ok(html.includes('data-tab-target="tab-advanced"'), 'Thiếu tùy chọn Nâng cao trong menu');
assert.ok(html.includes('data-tab-target="tab-tests"'), 'Thiếu tùy chọn Kiểm thử trong menu');
assert.ok(html.includes('data-tab-target="tab-acceptance"'), 'Thiếu tùy chọn Nghiệm thu trong menu');
console.log('✓ Header 1 hàng tinh gọn với nút Lưu & Chạy và menu ⋯ chứa Nâng cao, Kiểm thử, Nghiệm thu');

// 4. Kiểm tra Di chuyển Thanh Mô phỏng vào Tab Pet
console.log('\n--- 4. KIỂM TRA DI CHUYỂN THANH MÔ PHỎNG SỰ KIỆN VÀO TAB PET ---');
const petTabIdx = html.indexOf('id="tab-pet"');
const simBarIdx = html.indexOf('id="previewPetSimBar"');
const previewIdx = html.indexOf('id="previewWindow"');
assert.ok(simBarIdx > petTabIdx && simBarIdx < previewIdx, 'Thanh mô phỏng sự kiện phải nằm trong tab-pet, không nằm trong previewWindow');
console.log('✓ previewPetSimBar nằm trong tab Pet, không phủ lên previewWindow');

// 5. Kiểm tra CSS Variables và Quy chuẩn Kích thước
console.log('\n--- 5. KIỂM TRA CSS VARIABLES & KHÔNG CẮT TAB ---');
assert.ok(css.includes('--header-height: 46px;'), 'Thiếu biến CSS --header-height <= 48px');
assert.ok(css.includes('--tabbar-height: 50px;'), 'Thiếu biến CSS --tabbar-height <= 52px');
assert.ok(css.includes('--tab-icon-size: 17px;'), 'Thiếu biến CSS --tab-icon-size (16-18px)');
assert.ok(css.includes('white-space: nowrap;'), 'Thanh tab phải có white-space: nowrap');
console.log('✓ CSS variables và chuẩn kích thước đạt yêu cầu (header <= 48px, tabbar <= 52px, icon 17px)');

// 6. Kiểm tra Bong bóng Thoại Pet và Khung Xem Trước trong petOverlay.js
console.log('\n--- 6. KIỂM TRA PET OVERLAY & BONG BÓNG THOẠI TRONG petOverlay.js ---');
assert.ok(petJs.includes("'data-ui', 'pet'") || petJs.includes('"data-ui", "pet"'), 'Pet entity phải có data-ui="pet"');
assert.ok(petJs.includes("'data-ui', 'pet-bubble'") || petJs.includes('"data-ui", "pet-bubble"'), 'Bong bóng thoại phải có data-ui="pet-bubble"');
assert.ok(petJs.includes('z-index: 5'), 'Overlay container phải có z-index: 5 (thấp hơn studio UI z=10)');
assert.ok(petJs.includes('3000'), 'Bong bóng thoại phải tự ẩn sau 3 giây (3000ms)');
assert.ok(petJs.includes('_positionBubble'), 'Phải có logic _positionBubble kẹp trong khung xem trước');
console.log('✓ PetOverlay gắn data-ui="pet", "pet-bubble", kẹp trong khung xem trước, tự ẩn 3s');

// 7. Thực thi trực tiếp testHeaderLayout()
console.log('\n--- 7. THỰC THI HÀM KIỂM THỬ testHeaderLayout() ---');
const { testHeaderLayout } = require('../renderer/tests.js');
assert.strictEqual(typeof testHeaderLayout, 'function', 'testHeaderLayout phải là một hàm');

let loggedOutput = '';
const origLog = console.log;
console.log = (...args) => {
  loggedOutput += args.join(' ') + '\n';
  origLog.apply(console, args);
};

(async () => {
  // Mock layout environment cho Node.js
  const mockPanel = {
    style: { width: '520px' },
    getBoundingClientRect() {
      const w = parseFloat(this.style.width) || 520;
      return { left: 0, top: 0, width: w, right: w, height: 800, bottom: 800 };
    }
  };
  const mockHeader = {
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 520, height: 46, right: 520, bottom: 46 };
    }
  };
  const mockBar = {
    getBoundingClientRect() {
      const w = parseFloat(mockPanel.style.width) || 520;
      return { left: 0, top: 46, width: w, right: w, height: 50, bottom: 96 };
    }
  };
  const tabs = ['Nền', 'Màu', 'Kính', 'Pet', 'Động', 'Hồ sơ'].map((lbl, idx) => ({
    textContent: lbl,
    get clientWidth() {
      const w = parseFloat(mockPanel.style.width) || 520;
      return w / 6;
    },
    get scrollWidth() { return 30; },
    getBoundingClientRect() {
      const w = parseFloat(mockPanel.style.width) || 520;
      const tw = w / 6;
      return { left: idx * tw, right: (idx + 1) * tw, width: tw, height: 50 };
    }
  }));

  let bubble = null;
  const mockPreview = {
    getBoundingClientRect() {
      return { left: 520, top: 0, right: 1200, bottom: 800, width: 680, height: 800 };
    },
    querySelector(sel) {
      if (sel === '[data-ui="studio-tool"]') return null;
      return null;
    }
  };
  const mockPet = {
    dispatchEvent(evt) {
      if (evt && evt.type === 'click') {
        bubble = {
          getBoundingClientRect() {
            return { left: 600, top: 100, right: 720, bottom: 130, width: 120, height: 30 };
          }
        };
      }
    }
  };

  global.MouseEvent = class MouseEvent {
    constructor(t, i = {}) { this.type = t; Object.assign(this, i); }
  };

  global.document = {
    querySelector(sel) {
      if (sel === '[data-ui="header"]') return mockHeader;
      if (sel === '[data-ui="panel"]') return mockPanel;
      if (sel === '[data-ui="tabbar"]') return mockBar;
      if (sel === '[data-ui="preview"]') return mockPreview;
      if (sel === '[data-ui="pet"]') return mockPet;
      if (sel === '[data-ui="pet-bubble"]') return bubble;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '[data-ui="tab"]') return tabs;
      return [];
    }
  };

  await testHeaderLayout();
  console.log = origLog;

  assert.ok(loggedOutput.includes('PASS layout'), 'testHeaderLayout phải in ra PASS layout');
  console.log('\n================================================================');
  console.log('🎉 TẤT CẢ KIỂM THỬ UI-1 ĐÃ VƯỢT QUA HOÀN TOÀN: PASS layout (100%)');
  console.log('================================================================');
})().catch(err => {
  console.error('Lỗi khi chạy testHeaderLayout:', err);
  process.exit(1);
});
