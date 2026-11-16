const assert = require('assert');
const path = require('path');
const VideoImportStudio = require('../renderer/videoImportStudio.js');

console.log('--- 1. Testing VideoImportStudio Exports & Constants ---');
assert.ok(typeof VideoImportStudio === 'function', 'VideoImportStudio should be a class constructor');
assert.ok(VideoImportStudio.ASPECT_RATIOS, 'ASPECT_RATIOS should exist');
assert.strictEqual(VideoImportStudio.ASPECT_RATIOS['16:9'], 16 / 9);
assert.strictEqual(VideoImportStudio.ASPECT_RATIOS['21:9'], 21 / 9);
assert.strictEqual(VideoImportStudio.ASPECT_RATIOS['1:1'], 1.0);
assert.strictEqual(VideoImportStudio.ASPECT_RATIOS['free'], null);

assert.ok(VideoImportStudio.FILTER_PRESETS, 'FILTER_PRESETS should exist');
assert.ok(VideoImportStudio.FILTER_PRESETS['normal']);
assert.ok(VideoImportStudio.FILTER_PRESETS['lofi-warm']);
assert.ok(VideoImportStudio.FILTER_PRESETS['cyberpunk']);
assert.ok(VideoImportStudio.FILTER_PRESETS['dark-clean']);

console.log('--- 2. Testing YouTube URL Parsing ---');
const ytUrls = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'http://youtube.com/watch?feature=share&v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ?t=12',
  'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  'https://youtube.com/shorts/dQw4w9WgXcQ?si=abcdef',
  'https://www.youtube.com/embed/dQw4w9WgXcQ'
];

for (const u of ytUrls) {
  const res = VideoImportStudio.parseUrl(u);
  assert.strictEqual(res.platform, 'youtube', `Failed for ${u}`);
  assert.strictEqual(res.videoId, 'dQw4w9WgXcQ', `Wrong videoId for ${u}`);
  assert.ok(res.thumbnailUrl.includes('maxresdefault.jpg'), `Missing maxres thumbnail for ${u}`);
  assert.ok(res.hqThumbnailUrl.includes('hqdefault.jpg'), `Missing hq thumbnail for ${u}`);
  assert.ok(res.embedUrl.includes('embed/dQw4w9WgXcQ'), `Missing embedUrl for ${u}`);
  assert.strictEqual(res.isValid, true);
  console.log(`  ✓ YouTube OK: ${u.substring(0, 45)}... -> id: ${res.videoId}`);
}

console.log('--- 3. Testing TikTok URL Parsing ---');
const ttStandard = VideoImportStudio.parseUrl('https://www.tiktok.com/@mrbeast/video/7123456789012345678');
assert.strictEqual(ttStandard.platform, 'tiktok');
assert.strictEqual(ttStandard.videoId, '7123456789012345678');
assert.strictEqual(ttStandard.username, 'mrbeast');
assert.ok(ttStandard.oembedUrl.includes('tiktok.com/oembed'));
assert.strictEqual(ttStandard.isValid, true);
console.log('  ✓ TikTok standard video OK');

const ttShort = VideoImportStudio.parseUrl('https://vm.tiktok.com/ZM8vRkY9U/');
assert.strictEqual(ttShort.platform, 'tiktok');
assert.ok(ttShort.oembedUrl.includes('tiktok.com/oembed'));
assert.strictEqual(ttShort.isValid, true);
console.log('  ✓ TikTok shortlink OK');

console.log('--- 4. Testing Direct Media Parsing ---');
const mp4 = VideoImportStudio.parseUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
assert.strictEqual(mp4.platform, 'direct-video');
assert.strictEqual(mp4.mediaType, 'video');
assert.strictEqual(mp4.isValid, true);
console.log('  ✓ Direct MP4 OK');

const webm = VideoImportStudio.parseUrl('https://example.com/asset.webm');
assert.strictEqual(webm.platform, 'direct-video');
assert.strictEqual(webm.mediaType, 'video');
assert.strictEqual(webm.isValid, true);
console.log('  ✓ Direct WEBM OK');

const png = VideoImportStudio.parseUrl('https://example.com/wallpaper.png');
assert.strictEqual(png.platform, 'direct-image');
assert.strictEqual(png.mediaType, 'image');
assert.strictEqual(png.isValid, true);
console.log('  ✓ Direct PNG OK');

const webp = VideoImportStudio.parseUrl('https://example.com/photo.webp');
assert.strictEqual(webp.platform, 'direct-image');
assert.strictEqual(webp.mediaType, 'image');
assert.strictEqual(webp.isValid, true);
console.log('  ✓ Direct WEBP OK');

console.log('--- 5. Testing Studio Instance & Crop Calculations ---');
const studio = new VideoImportStudio({ imgUrl: 'https://example.com/sample.jpg' });
assert.strictEqual(studio.currentStep, 1);

// Test 16:9 on 1920x1080 source
studio.naturalWidth = 1920;
studio.naturalHeight = 1080;
studio.setAspectRatio('16:9');
let coords = studio.getCropCoordinates(1920, 1080);
assert.strictEqual(coords.sWidth, 1920);
assert.strictEqual(coords.sHeight, 1080);
assert.strictEqual(coords.sx, 0);
assert.strictEqual(coords.sy, 0);
console.log('  ✓ 16:9 Crop Calculation OK');

// Test 1:1 on 1920x1080 source (square pet)
studio.setAspectRatio('1:1');
coords = studio.getCropCoordinates(1920, 1080);
assert.strictEqual(coords.sWidth, 1080);
assert.strictEqual(coords.sHeight, 1080);
assert.strictEqual(coords.sx, 420);
assert.strictEqual(coords.sy, 0);
console.log('  ✓ 1:1 Pet Crop Calculation OK (centered 1080x1080)');

// Test 21:9 on 1920x1080 source
studio.setAspectRatio('21:9');
coords = studio.getCropCoordinates(1920, 1080);
assert.strictEqual(coords.sWidth, 1920);
assert.strictEqual(coords.sHeight, 823);
console.log('  ✓ 21:9 Ultrawide Crop Calculation OK');

// Test 16:9 on vertical 1080x1920 (TikTok vertical source)
studio.naturalWidth = 1080;
studio.naturalHeight = 1920;
studio.setAspectRatio('16:9');
coords = studio.getCropCoordinates(1080, 1920);
assert.strictEqual(coords.sWidth, 1080);
assert.strictEqual(coords.sHeight, 608);
assert.strictEqual(coords.sx, 0);
assert.strictEqual(coords.sy, 656);
console.log('  ✓ TikTok 9:16 -> Desktop 16:9 Crop Calculation OK (cuts black bars & watermarks)');

console.log('--- 6. Testing Filters & Presets ---');
studio.applyPreset('cyberpunk');
assert.strictEqual(studio.filters.preset, 'cyberpunk');
assert.strictEqual(studio.filters.contrast, 135);
assert.strictEqual(studio.filters.saturation, 160);
assert.strictEqual(studio.filters.sharpen, 25);
console.log('  ✓ Preset Cyberpunk applied');

studio.applyPreset('lofi-warm');
assert.strictEqual(studio.filters.preset, 'lofi-warm');
assert.strictEqual(studio.filters.saturation, 85);
assert.strictEqual(studio.filters.tint, 'warm');
console.log('  ✓ Preset Lofi-Warm applied');

studio.applyPreset('dark-clean');
assert.strictEqual(studio.filters.preset, 'dark-clean');
assert.strictEqual(studio.filters.brightness, -15);
assert.strictEqual(studio.filters.tint, 'dark-clean');
console.log('  ✓ Preset Dark-Clean applied');

studio.setFilter('brightness', 20);
assert.strictEqual(studio.filters.brightness, 20);
assert.strictEqual(studio.filters.preset, 'custom');
console.log('  ✓ Custom filter value update OK');

console.log('--- 7. Testing Step Navigation & Callbacks ---');
studio.setStep(2);
assert.strictEqual(studio.currentStep, 2);
studio.setStep(3);
assert.strictEqual(studio.currentStep, 3);

let calledWallpaper = false;
let calledMotion = false;
let calledPet = false;

studio.onApplyWallpaper = (url) => { calledWallpaper = true; return url; };
studio.onSendToMotionStudio = (url) => { calledMotion = true; return url; };
studio.onApplyPet = (url) => { calledPet = true; return url; };

studio.applyWallpaper();
assert.ok(calledWallpaper, 'applyWallpaper should trigger onApplyWallpaper');

studio.sendToMotionStudio();
assert.ok(calledMotion, 'sendToMotionStudio should trigger onSendToMotionStudio');

studio.applyPet();
assert.ok(calledPet, 'applyPet should trigger onApplyPet');

console.log('  ✓ Callbacks and Step transitions OK');

console.log('\n=======================================');
console.log('🎉 ALL VIDEO IMPORT STUDIO TESTS PASSED (100%)');
console.log('=======================================');
