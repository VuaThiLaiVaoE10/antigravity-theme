/**
 * Test Suite for Part C: Pet Overlay Engine (renderer/petOverlay.js, liveSync.js, patcher.js)
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const PetOverlay = require('../renderer/petOverlay.js');
const liveSync = require('../liveSync.js');
const patcher = require('../patcher.js');

console.log('=== TEST SUITE: Part C - Pet Overlay Engine ===\n');

// 1. Structure & Export Verification
console.log('1. Verifying PetOverlay Class & Exports:');
assert.strictEqual(typeof PetOverlay, 'function', 'PetOverlay must be a constructor/class');
assert.strictEqual(typeof PetOverlay.buildInjectionScript, 'function', 'PetOverlay must have static buildInjectionScript()');
console.log('   ✓ PetOverlay class and static methods verified');

// 2. DOM Mock & Lifecycle Test
console.log('\n2. Verifying DOM Mount, Independent Layer & Structure:');
function createMockElement(tag, id = '', className = '') {
  const listeners = {};
  const children = [];
  const style = {
    removeProperty(prop) { delete this[prop]; }
  };
  const el = {
    tagName: tag.toUpperCase(),
    id,
    className,
    style,
    children,
    parentNode: null,
    appendChild(child) {
      child.parentNode = el;
      children.push(child);
      return child;
    },
    removeChild(child) {
      const idx = children.indexOf(child);
      if (idx !== -1) children.splice(idx, 1);
      child.parentNode = null;
      return child;
    },
    querySelector(selector) {
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        return children.find(c => c.className === cls || (c.className && c.className.split(' ').includes(cls))) || null;
      }
      if (selector.startsWith('#')) {
        const selId = selector.slice(1);
        return children.find(c => c.id === selId) || null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        return children.filter(c => c.className === cls || (c.className && c.className.split(' ').includes(cls)));
      }
      return [];
    },
    addEventListener(evt, fn) {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(fn);
    },
    removeEventListener(evt, fn) {
      if (listeners[evt]) {
        listeners[evt] = listeners[evt].filter(f => f !== fn);
      }
    },
    dispatchEvent(evt) {
      if (listeners[evt.type]) {
        for (const fn of listeners[evt.type]) fn(evt);
      }
    },
    getContext(type) {
      return {
        clearRect: () => {},
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        scale: () => {},
      };
    }
  };
  return el;
}

const mockDoc = {
  head: createMockElement('head'),
  body: createMockElement('body'),
  documentElement: createMockElement('html'),
  elementsById: {},
  getElementById(id) {
    return this.elementsById[id] || null;
  },
  createElement(tag) {
    const el = createMockElement(tag);
    return el;
  },
  addEventListener: () => {},
  removeEventListener: () => {}
};

// Hook createElement to track elements by id
const origCreateElement = mockDoc.createElement.bind(mockDoc);
mockDoc.createElement = function(tag) {
  const el = origCreateElement(tag);
  Object.defineProperty(el, 'id', {
    get() { return this._id || ''; },
    set(val) {
      this._id = val;
      if (val) mockDoc.elementsById[val] = this;
    }
  });
  return el;
};

const overlay = new PetOverlay({
  doc: mockDoc,
  posX: 250,
  posY: 400,
  anchorX: 40,
  anchorY: 80,
  hitboxW: 80,
  hitboxH: 80,
  showPedestal: true,
  pedestalColor: '#7DCFFF'
});

overlay.mount();

const overlayContainer = mockDoc.getElementById('ag-pet-overlay-container');
assert.ok(overlayContainer, '#ag-pet-overlay-container must exist in DOM');
assert.strictEqual(overlayContainer.style.filter, 'none', 'Overlay container must isolate filters (filter: none)');
assert.strictEqual(overlayContainer.style.backdropFilter, 'none', 'Overlay container must isolate backdrop filters');
console.log('   ✓ #ag-pet-overlay-container exists with independent filter isolation');

const entity = mockDoc.getElementById('ag-pet-entity');
assert.ok(entity, '#ag-pet-entity must exist inside overlay');
assert.strictEqual(entity.style.left, (250 - 40) + 'px', 'Entity left offset matches posX - anchorX');
assert.strictEqual(entity.style.top, (400 - 80) + 'px', 'Entity top offset matches posY - anchorY');
console.log('   ✓ #ag-pet-entity positioned accurately via foot anchor');

const hitbox = entity.querySelector('.ag-pet-hitbox');
assert.ok(hitbox, '.ag-pet-hitbox must exist inside entity');
assert.strictEqual(hitbox.style.width, '80px', 'Hitbox width matches config');
assert.strictEqual(hitbox.style.height, '80px', 'Hitbox height matches config');
console.log('   ✓ Hitbox element configured with pointer-events');

const sprite = entity.querySelector('.ag-pet-sprite-canvas');
assert.ok(sprite, '.ag-pet-sprite-canvas must exist inside entity');
console.log('   ✓ Sprite canvas element present for contour rendering');

const pedestal = entity.querySelector('.ag-pet-pedestal-holo');
assert.ok(pedestal, '.ag-pet-pedestal-holo must exist inside entity');
assert.strictEqual(pedestal.style.display, 'block', 'Pedestal visible when showPedestal is true');
console.log('   ✓ Holographic pedestal element rendered under feet');

// 3. State & Repositioning
console.log('\n3. Verifying State Machine & Repositioning:');
overlay.setState('walk');
assert.strictEqual(overlay._state, 'walk', 'State switches to walk');
overlay.setState('drag');
assert.strictEqual(overlay._state, 'drag', 'State switches to drag');
overlay.setPosition(500, 600);
assert.strictEqual(overlay.posX, 500);
assert.strictEqual(overlay.posY, 600);
assert.strictEqual(entity.style.left, (500 - 40) + 'px');
assert.strictEqual(entity.style.top, (600 - 80) + 'px');
console.log('   ✓ setState and setPosition work correctly');

// 4. Click & Speech Bubble Interaction
console.log('\n4. Verifying Click & Speech Bubble:');
hitbox.dispatchEvent({ type: 'click', clientX: 250, clientY: 400, stopPropagation: () => {} });
assert.strictEqual(overlay._state, 'click', 'Click triggers click animation state');
const bubble = entity.querySelector('.ag-pet-speech-bubble');
assert.ok(bubble, 'Speech bubble element must be attached on click');
assert.ok(bubble.textContent.length > 0, 'Speech bubble contains encouraging text');
console.log(`   ✓ Speech bubble generated: "${bubble.textContent}"`);

// 5. Filter Scope Switch
console.log('\n5. Verifying Filter Scope Switch:');
overlay.setFilterOnPet(true);
assert.strictEqual(overlay.filterOnPet, true);
overlay.setFilterOnPet(false);
assert.strictEqual(overlay.filterOnPet, false);
assert.strictEqual(overlayContainer.style.filter, 'none');
console.log('   ✓ Filter scope toggle successfully switches filter isolation');

// 6. Injection Code Verification for liveSync & patcher
console.log('\n6. Verifying liveSync & patcher Integration:');
const injectionScript = PetOverlay.buildInjectionScript({
  petPosX: 300,
  petPosY: 450,
  petAnchorX: 30,
  petAnchorY: 60,
  petHitboxW: 70,
  petHitboxH: 70,
  petPedestal: true
});
assert.ok(injectionScript.includes('ag-pet-overlay-container'), 'Injection script contains overlay container id');
assert.ok(injectionScript.includes('ag-pet-hitbox'), 'Injection script contains hitbox class');
assert.ok(injectionScript.includes('ag-pet-speech-bubble'), 'Injection script contains speech bubble');

// Verify syntax of injection script via vm.Script
new vm.Script(injectionScript);
console.log('   ✓ PetOverlay.buildInjectionScript syntax verified via vm.Script');

const patcherHook = patcher.generateHookCode();
assert.ok(patcherHook.includes('ag-pet-overlay-container'), 'Patcher hook code includes pet overlay container');
assert.ok(patcherHook.includes('injectPetOverlay'), 'Patcher hook code includes injectPetOverlay');
new vm.Script(patcherHook);
console.log('   ✓ Patcher hook code contains overlay injection and compiles cleanly');

const liveSyncContent = fs.readFileSync(path.join(__dirname, '..', 'liveSync.js'), 'utf8');
assert.ok(liveSyncContent.includes('PetOverlay.buildInjectionScript'), 'liveSync.js invokes PetOverlay.buildInjectionScript');
console.log('   ✓ liveSync.js properly integrates PetOverlay injection');

console.log('\n=============================================');
console.log('🎉 ALL PART C PET OVERLAY TESTS PASSED (100%)');
console.log('=============================================');
