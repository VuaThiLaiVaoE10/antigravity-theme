const assert = require('assert');

// Mock DOM cho test giao diện Panel Lớp
function createMockElement(tagName = 'div') {
  const listeners = {};
  const children = [];
  const classListSet = new Set();

  const el = {
    tagName: tagName.toUpperCase(),
    style: {},
    dataset: {},
    innerHTML: '',
    value: '',
    textContent: '',
    draggable: false,
    disabled: false,
    focus() {},
    select() {},
    addEventListener(evt, handler) {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(handler);
    },
    removeEventListener(evt, handler) {
      if (listeners[evt]) {
        listeners[evt] = listeners[evt].filter(h => h !== handler);
      }
    },
    dispatchEvent(evt) {
      const type = evt.type || evt;
      if (listeners[type]) {
        listeners[type].forEach(h => h(evt));
      }
      if (el['on' + type]) el['on' + type](evt);
    },
    appendChild(child) {
      children.push(child);
      child.parentNode = el;
      return child;
    },
    removeChild(child) {
      const idx = children.indexOf(child);
      if (idx >= 0) children.splice(idx, 1);
      return child;
    },
    querySelector(selector) {
      if (selector.startsWith('#')) {
        const id = selector.slice(1);
        return findFirst(el, c => c.id === id);
      }
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        return findFirst(el, c => c.classList && c.classList.contains(cls));
      }
      return findFirst(el, c => c.tagName.toLowerCase() === selector.toLowerCase());
    },
    querySelectorAll(selector) {
      const results = [];
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        findAll(el, c => c.classList && c.classList.contains(cls), results);
      } else if (selector.startsWith('#')) {
        const id = selector.slice(1);
        findAll(el, c => c.id === id, results);
      } else {
        findAll(el, c => c.tagName.toLowerCase() === selector.toLowerCase(), results);
      }
      return results;
    },
    closest(selector) {
      let cur = el;
      while (cur) {
        if (selector.startsWith('.') && cur.classList && cur.classList.contains(selector.slice(1))) {
          return cur;
        }
        cur = cur.parentNode;
      }
      return null;
    }
  };

  el.classList = {
    add(cls) { classListSet.add(cls); },
    remove(cls) { classListSet.delete(cls); },
    contains(cls) { return classListSet.has(cls); }
  };

  function findFirst(node, predicate) {
    for (const ch of node.children || children) {
      if (predicate(ch)) return ch;
      const found = findFirst(ch, predicate);
      if (found) return found;
    }
    return null;
  }

  function findAll(node, predicate, acc) {
    for (const ch of node.children || children) {
      if (predicate(ch)) acc.push(ch);
      findAll(ch, predicate, acc);
    }
  }

  return el;
}

// Mock Canvas
function createMockCanvas(w = 100, h = 100) {
  const el = createMockElement('canvas');
  el.width = w;
  el.height = h;
  el.getContext = (type) => ({
    canvas: el,
    clearRect() {},
    fillRect() {},
    drawImage() {},
    getImageData() { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }
  });
  return el;
}

global.document = {
  createElement(tag) {
    if (tag === 'canvas') return createMockCanvas(36, 36);
    return createMockElement(tag);
  },
  getElementById() { return null; },
  head: { appendChild() {} }
};

const Layers = require('../renderer/layers.js');

let redrawCount = 0;
global.window = {
  requestRedraw() { redrawCount++; }
};

console.log('--- TEST TOÀN DIỆN PANEL LỚP (BƯỚC 1.1) ---');

// 1. Khởi tạo dự án
const testCanvas = createMockCanvas(200, 200);
Layers.initProject(testCanvas);
assert.strictEqual(Layers.Project.layers.length, 1, 'Project phải có 1 lớp nền ban đầu');
assert.strictEqual(Layers.Project.activeId, 1, 'Lớp hoạt động ban đầu là id=1');

// 2. Thêm lớp trống
const L2 = Layers.addLayer('Tóc');
assert.strictEqual(Layers.Project.layers.length, 2, 'Project phải có 2 lớp');
assert.strictEqual(L2.name, 'Tóc', 'Tên lớp mới phải đúng');

// 3. Nhân bản lớp
const L2_dup = Layers.duplicateLayer(L2.id);
assert.strictEqual(Layers.Project.layers.length, 3, 'Project phải có 3 lớp sau nhân bản');
assert.strictEqual(L2_dup.name, 'Tóc (bản sao)', 'Tên lớp nhân bản phải có hậu tố (bản sao)');

// 4. Di chuyển lớp
Layers.moveLayer(L2_dup.id, 0);
assert.strictEqual(Layers.Project.layers[0].id, L2_dup.id, 'Lớp nhân bản phải về vị trí 0');

// 5. Thử nghiệm giao diện
const panelContainer = createMockElement('div');
Layers.renderLayersPanel(panelContainer);
console.log('Render layers panel: OK');

console.log('Tất cả assertions kiểm tra logic lớp & giao diện: PASS');
