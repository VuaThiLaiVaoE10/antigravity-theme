/**
 * petModels.js
 * Curated Pet Models Library & Custom Model Management for Antigravity Theme Studio
 */

const DEFAULT_PET_MODELS = [
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
    size: 58,
    speech: 'Chủ nhân cố lên nhé! Hôm nay code gì thế ạ? ✨',
    description: 'Pixel art golem thân thiện tràn đầy năng lượng tích cực'
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
    size: 60,
    speech: 'Em luôn ở đây đồng hành cùng anh code nè! 🌸',
    description: 'Anime Waifu đồng hành dễ thương giúp giảm căng thẳng'
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
    size: 54,
    speech: 'Hệ thống bảo vệ mã nguồn trực tuyến! ⚡',
    description: 'Drone công nghệ cao tuần tra và bảo vệ mã nguồn 24/7'
  },
  {
    id: 'model-magic-cat',
    name: 'Mèo Thần Thoại',
    avatar: '../assets/deco-floral-bird.png',
    avatarUrl: '../assets/deco-floral-bird.png',
    hasMissingImage: true,
    warningMsg: 'Chưa có file ảnh - Vui lòng tải file',
    borderStyle: 'glass-bubble',
    glowColor: '#FFE066',
    glowRadius: 10,
    borderWidth: 2,
    pedestal: true,
    pedestalColor: '#FFA07A',
    animation: 'glow',
    anim: 'glow',
    scale: 52,
    size: 52,
    speech: 'Meow meow~ Chúc chủ nhân code không gặp bug! 🐾',
    description: 'Mèo thần mang lại may mắn, xua tan mọi bug khó hiểu (Chờ người dùng nạp ảnh)'
  }
];

/**
 * Find a pet model by its unique ID
 * @param {string} id
 * @returns {object|null}
 */
function getPetModelById(id) {
  if (!id || typeof id !== 'string') return null;
  return DEFAULT_PET_MODELS.find(m => m.id === id) || null;
}

/**
 * Create a new custom pet model with validated schema and default fallbacks
 * @param {object} data
 * @returns {object}
 */
function createCustomPetModel(data = {}) {
  const customId = data.id || ('model-custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));
  const avatar = data.avatar || data.avatarUrl || '../assets/mascot-pixel-pet.png';
  const anim = data.animation || data.anim || 'bob';
  const scale = typeof data.scale === 'number' ? data.scale : (typeof data.size === 'number' ? data.size : 56);
  const glowRadius = typeof data.glowRadius === 'number' ? data.glowRadius : 12;
  const borderWidth = typeof data.borderWidth === 'number' ? data.borderWidth : 2;
  const pedestal = typeof data.pedestal === 'boolean' ? data.pedestal : true;

  return {
    id: customId,
    name: data.name || 'Pet Tùy Chỉnh',
    avatar: avatar,
    avatarUrl: avatar,
    borderStyle: data.borderStyle || 'theme-gradient',
    glowColor: data.glowColor || '#7DCFFF',
    glowRadius: glowRadius,
    borderWidth: borderWidth,
    pedestal: pedestal,
    pedestalColor: data.pedestalColor || '#7DCFFF',
    animation: anim,
    anim: anim,
    scale: scale,
    size: scale,
    speech: data.speech || 'Chủ nhân ơi, em sẵn sàng code cùng rồi nè! ✨',
    description: data.description || 'Pet tùy chỉnh người dùng tải lên'
  };
}

/**
 * Validate if a given object conforms to the PetModel specification
 * @param {object} model
 * @param {object} [options]
 * @returns {boolean|object}
 */
function validatePetModel(model, options = {}) {
  const errors = [];
  if (!model || typeof model !== 'object') {
    errors.push('Model must be a valid non-null object');
  } else {
    if (!model.id || typeof model.id !== 'string' || !model.id.trim()) {
      errors.push('Model must have a valid string id');
    }
    if (!model.name || typeof model.name !== 'string' || !model.name.trim()) {
      errors.push('Model must have a valid string name');
    }
    const avatar = model.avatar || model.avatarUrl;
    if (!avatar || typeof avatar !== 'string' || !avatar.trim()) {
      errors.push('Model must have a valid string avatar or avatarUrl');
    }
    if (model.glowRadius !== undefined && typeof model.glowRadius !== 'number') {
      errors.push('glowRadius must be a number');
    }
    if (model.borderWidth !== undefined && typeof model.borderWidth !== 'number') {
      errors.push('borderWidth must be a number');
    }
    if (model.scale !== undefined && typeof model.scale !== 'number') {
      errors.push('scale must be a number');
    }
    if (model.size !== undefined && typeof model.size !== 'number') {
      errors.push('size must be a number');
    }
    if (model.pedestal !== undefined && typeof model.pedestal !== 'boolean') {
      errors.push('pedestal must be a boolean');
    }
  }

  const isValid = errors.length === 0;
  validatePetModel.errors = errors;

  if (options && options.detailed) {
    return { valid: isValid, errors };
  }
  return isValid;
}

/**
 * Detailed validator returning { valid: boolean, errors: string[] }
 * @param {object} model
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePetModelWithDetails(model) {
  return validatePetModel(model, { detailed: true });
}

// Module exports for CommonJS (Node.js / Electron main / test runners)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_PET_MODELS,
    getPetModelById,
    createCustomPetModel,
    validatePetModel,
    validatePetModelWithDetails
  };
}

// Browser global exposure for renderer scripts
if (typeof window !== 'undefined') {
  window.PetModels = {
    DEFAULT_PET_MODELS,
    getPetModelById,
    createCustomPetModel,
    validatePetModel,
    validatePetModelWithDetails
  };
}
