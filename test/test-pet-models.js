const assert = require('assert');
const path = require('path');
const fs = require('fs');
const petModels = require('../petModels.js');

console.log('--- Testing petModels.js ---');

// 1. Verify DEFAULT_PET_MODELS array
assert.ok(Array.isArray(petModels.DEFAULT_PET_MODELS), 'DEFAULT_PET_MODELS must be an array');
assert.strictEqual(petModels.DEFAULT_PET_MODELS.length, 4, 'DEFAULT_PET_MODELS must have 4 models');

const expectedIds = ['model-pixel-golem', 'model-chibi-waifu', 'model-cyber-drone', 'model-magic-cat'];
for (const id of expectedIds) {
  const m = petModels.getPetModelById(id);
  assert.ok(m, `Model with id ${id} must exist`);
  assert.strictEqual(m.id, id, `Model id should match ${id}`);
  assert.ok(typeof m.name === 'string' && m.name.length > 0, `${id} must have a non-empty name`);
  assert.ok(typeof m.avatar === 'string' && m.avatar.length > 0, `${id} must have a non-empty avatar`);
  assert.ok(typeof m.avatarUrl === 'string' && m.avatarUrl.length > 0, `${id} must have a non-empty avatarUrl`);
  assert.ok(typeof m.borderStyle === 'string', `${id} must have borderStyle`);
  assert.ok(typeof m.glowColor === 'string', `${id} must have glowColor`);
  assert.ok(typeof m.glowRadius === 'number', `${id} must have numeric glowRadius`);
  assert.strictEqual(m.pedestal, true, `${id} must have pedestal true`);
  assert.ok(typeof m.pedestalColor === 'string', `${id} must have pedestalColor`);
  assert.ok(typeof m.animation === 'string', `${id} must have animation string`);
  assert.ok(typeof m.scale === 'number', `${id} must have numeric scale`);
  assert.ok(typeof m.speech === 'string', `${id} must have speech string`);

  // Validate model using validatePetModel
  const isValid = petModels.validatePetModel(m);
  assert.strictEqual(isValid, true, `validatePetModel should return true for ${id}`);

  console.log(`✓ Model ${id}: "${m.name}" validated (avatar=${m.avatar}, glow=${m.glowColor}, pedestal=${m.pedestalColor})`);
}

// 2. Test createCustomPetModel
const custom = petModels.createCustomPetModel({
  name: 'Bé Rồng Con',
  avatar: '../assets/custom-dragon.png',
  glowColor: '#FF5555',
  animation: 'pulse',
  speech: 'Graooo! Cùng code thôi nào!'
});
assert.ok(custom.id.startsWith('model-custom-'), 'Custom model id should start with model-custom-');
assert.strictEqual(custom.name, 'Bé Rồng Con');
assert.strictEqual(custom.glowColor, '#FF5555');
assert.strictEqual(petModels.validatePetModel(custom), true, 'Custom model must be valid');
console.log('✓ createCustomPetModel validated:', custom.name);

// 3. Test validatePetModel on invalid inputs
assert.strictEqual(petModels.validatePetModel(null), false, 'null model must be invalid');
assert.strictEqual(petModels.validatePetModel({}), false, 'empty object must be invalid');
assert.strictEqual(petModels.validatePetModel({ id: 'test' }), false, 'object without name or avatar must be invalid');
console.log('✓ validatePetModel edge cases validated.');

console.log('\n=========================================');
console.log('ALL PET MODELS TESTS PASSED');
console.log('=========================================');
