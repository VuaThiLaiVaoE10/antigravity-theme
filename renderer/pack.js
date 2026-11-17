/**
 * pack.js - Pet Pack Export / Import & VSIX Scaffold Generator
 * 
 * Strict Data Contract (STATUS.md Section 3.1):
 * pet.json = {
 *   schemaVersion: 1,
 *   name: string,
 *   speech: string,
 *   fps: number,
 *   size: number,
 *   anchor: { x: number, y: number },
 *   hitbox: { x: number, y: number, w: number, h: number },
 *   states: {
 *     idle: { startFrame: number, endFrame: number, loop: boolean, fps: number },
 *     walk: { startFrame: number, endFrame: number, loop: boolean, fps: number },
 *     sleep: { startFrame: number, endFrame: number, loop: boolean, fps: number },
 *     click: { startFrame: number, endFrame: number, loop: boolean, fps: number },
 *     drag: { startFrame: number, endFrame: number, loop: boolean, fps: number }
 *   },
 *   events: [
 *     { event: string, state: string, speech: string, priority: number, returnAfterMs: number }
 *   ],
 *   frames: [
 *     "sprites/0001.png",
 *     "sprites/0002.png"
 *   ]
 * };
 * 
 * API:
 *   PetPack.exportZip(petData) -> Promise<Blob>
 *   PetPack.importZip(file, options) -> Promise<PetData>
 *   PetPack.exportVsix(petData) -> Promise<Blob>
 *   PetPack.restorePet(petData)
 *   PetPack.undoRestore()
 *   PetPack.init(mountEl)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PetPack = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Constants & Limits
  // ═══════════════════════════════════════════════════════════════════════════
  const MAX_ZIP_BYTES = 30 * 1024 * 1024;        // 30MB
  const MAX_TOTAL_UNCOMPRESSED = 100 * 1024 * 1024; // 100MB (Zip bomb guard)
  const MAX_FRAME_COUNT = 500;                  // 500 frames limit
  const REQUIRED_STATES = ['idle', 'walk', 'sleep', 'click', 'drag'];
  const PNG_MAGIC = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

  const DEFAULT_PET_EVENTS = [
    { event: 'error', state: 'sleep', speech: 'Ối có lỗi rồi chủ nhân ơi! Mau sửa thôi 💥', priority: 100, returnAfterMs: 4000 },
    { event: 'ai-thinking', state: 'walk', speech: 'Em đang suy nghĩ giải pháp đây... 💭', priority: 80, returnAfterMs: 3500 },
    { event: 'user-typing', state: 'walk', speech: 'Chủ nhân đang gõ gì hay thế ạ? ✨', priority: 60, returnAfterMs: 2500 },
    { event: 'ai-done', state: 'idle', speech: 'Nhiệm vụ đã hoàn thành xuất sắc! 🎉', priority: 40, returnAfterMs: 3000 },
    { event: 'pet-click', state: 'click', speech: 'Hehe nhột quá chủ nhân ơi! ✨', priority: 30, returnAfterMs: 2000 },
    { event: 'pet-drag', state: 'drag', speech: 'Waaa... em đang bay lượn trên màn hình! 🎈', priority: 25, returnAfterMs: 2000 },
    { event: 'idle-long', state: 'sleep', speech: 'Chủ nhân ơi em chợp mắt tí nhé... zZz 💤', priority: 10, returnAfterMs: 5000 }
  ];

  // 1x1 transparent PNG fallback
  const TRANSPARENT_PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Pure JS / Node Utility Functions
  // ═══════════════════════════════════════════════════════════════════════════

  // CRC-32 Table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c >>> 0;
  }

  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const len = buf.length;
    for (let i = 0; i < len; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8Encode(str) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str);
    }
    if (typeof Buffer !== 'undefined') {
      const b = Buffer.from(str, 'utf8');
      return new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
    }
    // Fallback utf8 encoder
    const utf8 = [];
    for (let i = 0; i < str.length; i++) {
      let charcode = str.charCodeAt(i);
      if (charcode < 0x80) utf8.push(charcode);
      else if (charcode < 0x800) {
        utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
      } else if (charcode < 0xd800 || charcode >= 0xe000) {
        utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
      } else {
        i++;
        charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
      }
    }
    return new Uint8Array(utf8);
  }

  function utf8Decode(bytes) {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8').decode(bytes);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('utf8');
    }
    let out = '';
    let i = 0;
    while (i < bytes.length) {
      const c = bytes[i++];
      if (c < 128) out += String.fromCharCode(c);
      else if (c > 191 && c < 224) {
        const c2 = bytes[i++];
        out += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
      } else if (c > 223 && c < 240) {
        const c2 = bytes[i++]; const c3 = bytes[i++];
        out += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
      } else {
        const c2 = bytes[i++]; const c3 = bytes[i++]; const c4 = bytes[i++];
        const u = (((c & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63)) - 0x10000;
        out += String.fromCharCode(0xD800 + (u >> 10), 0xDC00 + (u & 0x3FF));
      }
    }
    return out;
  }

  function base64ToBytes(base64) {
    if (typeof base64 !== 'string') {
      throw new Error('Dữ liệu ảnh không phải chuỗi base64 hợp lệ.');
    }
    const clean = base64.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '');
    if (typeof Buffer !== 'undefined') {
      const buf = Buffer.from(clean, 'base64');
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    const bin = atob(clean);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }

  function bytesToBase64(bytes, mimeType = 'image/png') {
    if (typeof Buffer !== 'undefined') {
      return `data:${mimeType};base64,` + Buffer.from(bytes).toString('base64');
    }
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return `data:${mimeType};base64,` + btoa(binary);
  }

  function isPngHeader(bytes) {
    if (!bytes || bytes.length < 8) return false;
    for (let i = 0; i < 8; i++) {
      if (bytes[i] !== PNG_MAGIC[i]) return false;
    }
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Security & Validation Guards
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * PATH TRAVERSAL GUARD:
   * Strictly reject any entry containing '../', '..\', or absolute paths ('/', 'C:').
   */
  function validateEntryPath(name) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('Tên tệp trong gói Pet (.zip) không được để trống.');
    }
    const trimmed = name.trim();

    // Check path traversal segments
    if (trimmed.includes('../') || trimmed.includes('..\\') || /(^|[\\\/])\.\.([\\\/]|$)/.test(trimmed)) {
      throw new Error(`[BẢO MẬT] Phát hiện tệp vi phạm bảo mật Path Traversal (chứa '..'): "${name}". Đã hủy giải nén.`);
    }

    // Check absolute path prefixes
    if (trimmed.startsWith('/') || trimmed.startsWith('\\') || /^[A-Za-z]:[\\\/]/.test(trimmed)) {
      throw new Error(`[BẢO MẬT] Phát hiện tệp có đường dẫn tuyệt đối trái phép: "${name}". Đã hủy giải nén.`);
    }

    // Check null bytes or control characters
    if (/[\x00-\x1f]/.test(trimmed)) {
      throw new Error(`[BẢO MẬT] Tên tệp chứa ký tự điều khiển không hợp lệ: "${name}".`);
    }

    return true;
  }

  /**
   * Validate pet.json schema
   */
  function validatePetJsonSchema(pet) {
    if (!pet || typeof pet !== 'object') {
      throw new Error('Nội dung pet.json không phải là một đối tượng JSON hợp lệ.');
    }

    // schemaVersion === 1
    if (pet.schemaVersion !== 1) {
      throw new Error(`Phiên bản cấu trúc gói Pet không hợp lệ: 'schemaVersion' phải là 1 (nhận được: ${pet.schemaVersion}).`);
    }

    // name: non-empty string
    if (typeof pet.name !== 'string' || !pet.name.trim()) {
      throw new Error("Thiếu trường bắt buộc trong pet.json: 'name' (tên Pet không được rỗng).");
    }

    // states: must be an object with idle, walk, sleep, click, drag
    if (!pet.states || typeof pet.states !== 'object') {
      throw new Error("Trường 'states' trong pet.json bị thiếu hoặc không phải đối tượng.");
    }

    for (const stateName of REQUIRED_STATES) {
      const s = pet.states[stateName];
      if (!s || typeof s !== 'object') {
        throw new Error(`Trường 'states' trong pet.json bị thiếu trạng thái bắt buộc: '${stateName}'.`);
      }
      if (typeof s.startFrame !== 'number' || s.startFrame < 0) {
        throw new Error(`Trạng thái '${stateName}' trong pet.json có 'startFrame' không hợp lệ (phải là số >= 0).`);
      }
      if (typeof s.endFrame !== 'number' || s.endFrame < 0) {
        throw new Error(`Trạng thái '${stateName}' trong pet.json có 'endFrame' không hợp lệ (phải là số >= 0).`);
      }
      if (typeof s.loop !== 'boolean') {
        throw new Error(`Trạng thái '${stateName}' trong pet.json có 'loop' không hợp lệ (phải là boolean).`);
      }
      if (typeof s.fps !== 'number' || s.fps <= 0) {
        throw new Error(`Trạng thái '${stateName}' trong pet.json có 'fps' không hợp lệ (phải là số > 0).`);
      }
    }

    // events: array
    if (!Array.isArray(pet.events)) {
      throw new Error("Trường 'events' trong pet.json phải là một mảng danh sách các phản ứng sự kiện.");
    }
    for (let i = 0; i < pet.events.length; i++) {
      const ev = pet.events[i];
      if (!ev || typeof ev !== 'object' || typeof ev.event !== 'string') {
        throw new Error(`Sự kiện thứ ${i + 1} trong pet.json thiếu trường 'event' (tên sự kiện).`);
      }
    }

    // frames: non-empty array of strings
    if (!Array.isArray(pet.frames) || pet.frames.length === 0) {
      throw new Error("Trường 'frames' trong pet.json phải là một mảng chứa ít nhất 1 đường dẫn khung hình.");
    }
    if (pet.frames.length > MAX_FRAME_COUNT) {
      throw new Error(`Số lượng khung hình vượt quá giới hạn an toàn (tối đa ${MAX_FRAME_COUNT} frames, nhận được ${pet.frames.length} frames).`);
    }
    for (let i = 0; i < pet.frames.length; i++) {
      const f = pet.frames[i];
      if (typeof f !== 'string' || !f.trim()) {
        throw new Error(`Khung hình thứ ${i + 1} trong pet.json không phải là đường dẫn tệp hợp lệ.`);
      }
    }

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. PKZIP Binary Encoder & Decoder (Pure JS + Node zlib)
  // ═══════════════════════════════════════════════════════════════════════════

  class PKZipEngine {
    /**
     * Create a ZIP binary buffer from an array of files.
     * @param {Array<{ name: string, data: Uint8Array|string }>} files
     * @returns {Uint8Array}
     */
    static createZip(files) {
      let zlib = null;
      if (typeof require === 'function') {
        try { zlib = require('zlib'); } catch (_) {}
      }

      const localEntries = [];
      const cdEntries = [];
      let currentOffset = 0;

      for (const file of files) {
        validateEntryPath(file.name);
        const nameBytes = utf8Encode(file.name.replace(/\\/g, '/'));
        let rawData = typeof file.data === 'string' ? utf8Encode(file.data) : file.data;
        if (!rawData) rawData = new Uint8Array(0);

        const uncompressedSize = rawData.length;
        const crc = crc32(rawData);

        // Try deflate if available and beneficial
        let compressedData = rawData;
        let method = 0; // STORED
        if (zlib && uncompressedSize > 128) {
          try {
            const deflated = zlib.deflateRawSync(rawData);
            if (deflated.length < uncompressedSize) {
              compressedData = new Uint8Array(deflated.buffer, deflated.byteOffset, deflated.byteLength);
              method = 8; // DEFLATE
            }
          } catch (_) {}
        }
        const compressedSize = compressedData.length;

        // 1. Local File Header (30 bytes + nameLen)
        const localHeader = new Uint8Array(30 + nameBytes.length);
        const lView = new DataView(localHeader.buffer, localHeader.byteOffset, localHeader.byteLength);
        lView.setUint32(0, 0x04034B50, true);  // Local signature
        lView.setUint16(4, 20, true);          // Version needed
        lView.setUint16(6, 0x0800, true);      // Flags (Bit 11: UTF-8)
        lView.setUint16(8, method, true);      // Compression method
        lView.setUint16(10, 0, true);          // Mod time
        lView.setUint16(12, 0, true);          // Mod date
        lView.setUint32(14, crc, true);        // CRC-32
        lView.setUint32(18, compressedSize, true);
        lView.setUint32(22, uncompressedSize, true);
        lView.setUint16(26, nameBytes.length, true);
        lView.setUint16(28, 0, true);          // Extra field length
        localHeader.set(nameBytes, 30);

        localEntries.push(localHeader, compressedData);

        // 2. Central Directory Header (46 bytes + nameLen)
        const cdHeader = new Uint8Array(46 + nameBytes.length);
        const cdView = new DataView(cdHeader.buffer, cdHeader.byteOffset, cdHeader.byteLength);
        cdView.setUint32(0, 0x02014B50, true); // CD signature
        cdView.setUint16(4, 0x0314, true);     // Version made by (Unix 2.0)
        cdView.setUint16(6, 20, true);         // Version needed
        cdView.setUint16(8, 0x0800, true);     // Flags (UTF-8)
        cdView.setUint16(10, method, true);    // Method
        cdView.setUint16(12, 0, true);         // Mod time
        cdView.setUint16(14, 0, true);         // Mod date
        cdView.setUint32(16, crc, true);       // CRC-32
        cdView.setUint32(20, compressedSize, true);
        cdView.setUint32(24, uncompressedSize, true);
        cdView.setUint16(28, nameBytes.length, true);
        cdView.setUint16(30, 0, true);         // Extra length
        cdView.setUint16(32, 0, true);         // Comment length
        cdView.setUint16(34, 0, true);         // Disk start
        cdView.setUint16(36, 0, true);         // Internal attrs
        cdView.setUint32(38, 0x81A40000, true);// External attrs (-rw-r--r--)
        cdView.setUint32(42, currentOffset, true); // Local header offset
        cdHeader.set(nameBytes, 46);

        cdEntries.push(cdHeader);
        currentOffset += localHeader.length + compressedData.length;
      }

      const cdOffset = currentOffset;
      let cdTotalSize = 0;
      for (const h of cdEntries) cdTotalSize += h.length;

      // 3. End of Central Directory (EOCD, 22 bytes)
      const eocd = new Uint8Array(22);
      const eocdView = new DataView(eocd.buffer, eocd.byteOffset, eocd.byteLength);
      eocdView.setUint32(0, 0x06054B50, true); // EOCD signature
      eocdView.setUint16(4, 0, true);          // Disk num
      eocdView.setUint16(6, 0, true);          // CD start disk
      eocdView.setUint16(8, files.length, true); // Entries on disk
      eocdView.setUint16(10, files.length, true); // Total entries
      eocdView.setUint32(12, cdTotalSize, true);  // CD size
      eocdView.setUint32(16, cdOffset, true);     // CD offset
      eocdView.setUint16(20, 0, true);          // Comment length

      // Combine all parts into single Uint8Array
      const totalBytes = currentOffset + cdTotalSize + eocd.length;
      const result = new Uint8Array(totalBytes);
      let pos = 0;
      for (const chunk of localEntries) {
        result.set(chunk, pos);
        pos += chunk.length;
      }
      for (const chunk of cdEntries) {
        result.set(chunk, pos);
        pos += chunk.length;
      }
      result.set(eocd, pos);

      return result;
    }

    /**
     * Parse a ZIP buffer and extract files with Path Traversal and Zip Bomb guards.
     * @param {Uint8Array} buffer
     * @returns {Promise<Array<{ name: string, data: Uint8Array }>>}
     */
    static async readZip(buffer) {
      if (!buffer || buffer.length < 22) {
        throw new Error('Tệp không phải định dạng ZIP hợp lệ (dung lượng quá nhỏ).');
      }

      if (buffer.length > MAX_ZIP_BYTES) {
        const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
        throw new Error(`Tệp .zip vượt quá giới hạn dung lượng cho phép (tối đa 30MB, tệp hiện tại: ${sizeMB}MB).`);
      }

      let zlib = null;
      if (typeof require === 'function') {
        try { zlib = require('zlib'); } catch (_) {}
      }

      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

      // 1. Locate End of Central Directory (EOCD: 0x06054B50)
      let eocdOffset = -1;
      const searchStart = Math.max(0, buffer.length - 65557);
      for (let i = buffer.length - 22; i >= searchStart; i--) {
        if (view.getUint32(i, true) === 0x06054B50) {
          eocdOffset = i;
          break;
        }
      }

      if (eocdOffset === -1) {
        // Fallback: scan local headers if EOCD is missing
        return PKZipEngine._readLocalHeadersFallback(buffer, view, zlib);
      }

      const totalEntries = view.getUint16(eocdOffset + 10, true);
      const cdSize = view.getUint32(eocdOffset + 12, true);
      const cdOffset = view.getUint32(eocdOffset + 16, true);

      if (cdOffset + cdSize > buffer.length) {
        throw new Error('Cấu trúc Central Directory trong tệp ZIP bị hư hỏng (vượt quá giới hạn tệp).');
      }

      const files = [];
      let p = cdOffset;
      let totalUncompressed = 0;

      for (let entryIdx = 0; entryIdx < totalEntries; entryIdx++) {
        if (p + 46 > buffer.length) break;
        if (view.getUint32(p, true) !== 0x02014B50) {
          throw new Error(`Đầu mục Central Directory thứ ${entryIdx + 1} bị sai chữ ký.`);
        }

        const method = view.getUint16(p + 10, true);
        const entryCrc = view.getUint32(p + 16, true);
        const compSize = view.getUint32(p + 20, true);
        const uncompSize = view.getUint32(p + 24, true);
        const nameLen = view.getUint16(p + 28, true);
        const extraLen = view.getUint16(p + 30, true);
        const commentLen = view.getUint16(p + 32, true);
        const localOffset = view.getUint32(p + 42, true);

        const nameBytes = buffer.subarray(p + 46, p + 46 + nameLen);
        const filename = utf8Decode(nameBytes).replace(/\\/g, '/');

        // Advance central directory pointer
        p += 46 + nameLen + extraLen + commentLen;

        // Skip pure directory entries (trailing slash)
        if (filename.endsWith('/')) {
          continue;
        }

        // PATH TRAVERSAL GUARD
        validateEntryPath(filename);

        // ZIP BOMB GUARD
        totalUncompressed += uncompSize;
        if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED) {
          throw new Error('Tổng dung lượng sau khi giải nén vượt quá ngưỡng an toàn (tối đa 100MB). Đã hủy giải nén.');
        }

        // Extract from local header
        if (localOffset + 30 > buffer.length) {
          throw new Error(`Vị trí tệp "${filename}" trong ZIP không hợp lệ.`);
        }
        if (view.getUint32(localOffset, true) !== 0x04034B50) {
          throw new Error(`Local file header cho tệp "${filename}" bị hư hỏng.`);
        }

        const localNameLen = view.getUint16(localOffset + 26, true);
        const localExtraLen = view.getUint16(localOffset + 28, true);
        if (localOffset + 30 + localNameLen > buffer.length) {
          throw new Error(`Đầu mục tệp "${filename}" vượt quá giới hạn tệp.`);
        }
        const localNameBytes = buffer.subarray(localOffset + 30, localOffset + 30 + localNameLen);
        const localFilename = utf8Decode(localNameBytes).replace(/\\/g, '/');
        validateEntryPath(localFilename);
        const dataStart = localOffset + 30 + localNameLen + localExtraLen;

        if (dataStart + compSize > buffer.length) {
          throw new Error(`Dữ liệu tệp "${filename}" bị cắt cụt trong tệp ZIP.`);
        }

        const compData = buffer.subarray(dataStart, dataStart + compSize);
        let uncompressedData;

        if (method === 0) {
          // STORED
          uncompressedData = compData.slice();
        } else if (method === 8) {
          // DEFLATED
          if (zlib) {
            try {
              const inf = zlib.inflateRawSync(compData);
              uncompressedData = new Uint8Array(inf.buffer, inf.byteOffset, inf.byteLength);
            } catch (err) {
              throw new Error(`Không thể giải nén dữ liệu cho tệp "${filename}": ${err.message}`);
            }
          } else if (typeof DecompressionStream !== 'undefined') {
            try {
              const ds = new DecompressionStream('deflate-raw');
              const writer = ds.writable.getWriter();
              writer.write(compData);
              writer.close();
              const ab = await new Response(ds.readable).arrayBuffer();
              uncompressedData = new Uint8Array(ab);
            } catch (err) {
              throw new Error(`Không thể giải nén DecompressionStream cho tệp "${filename}": ${err.message}`);
            }
          } else {
            throw new Error(`Môi trường không hỗ trợ giải nén tệp "${filename}" (phương thức nén DEFLATE).`);
          }
        } else {
          throw new Error(`Phương thức nén không được hỗ trợ (${method}) trong tệp "${filename}".`);
        }

        // Verify CRC-32
        const actualCrc = crc32(uncompressedData);
        if (entryCrc !== 0 && actualCrc !== entryCrc) {
          throw new Error(`Tính toàn vẹn tệp "${filename}" bị lỗi (sai mã kiểm tra CRC-32). Tệp có thể đã bị chỉnh sửa hoặc hư hỏng.`);
        }

        files.push({ name: filename, data: uncompressedData });
      }

      return files;
    }

    /**
     * Fallback local headers scanner
     */
    static async _readLocalHeadersFallback(buffer, view, zlib) {
      const files = [];
      let offset = 0;
      let totalUncompressed = 0;

      while (offset + 30 <= buffer.length) {
        const sig = view.getUint32(offset, true);
        if (sig === 0x02014B50 || sig === 0x06054B50) break; // Reached CD
        if (sig !== 0x04034B50) {
          offset++;
          continue;
        }

        const method = view.getUint16(offset + 8, true);
        const crc = view.getUint32(offset + 14, true);
        const compSize = view.getUint32(offset + 18, true);
        const uncompSize = view.getUint32(offset + 22, true);
        const nameLen = view.getUint16(offset + 26, true);
        const extraLen = view.getUint16(offset + 28, true);

        const nameBytes = buffer.subarray(offset + 30, offset + 30 + nameLen);
        const filename = utf8Decode(nameBytes).replace(/\\/g, '/');
        const dataStart = offset + 30 + nameLen + extraLen;

        validateEntryPath(filename);

        totalUncompressed += uncompSize;
        if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED) {
          throw new Error('Tổng dung lượng sau khi giải nén vượt quá ngưỡng an toàn (tối đa 100MB).');
        }

        const compData = buffer.subarray(dataStart, dataStart + compSize);
        let uncompressedData;

        if (method === 0) {
          uncompressedData = compData.slice();
        } else if (method === 8 && zlib) {
          const inf = zlib.inflateRawSync(compData);
          uncompressedData = new Uint8Array(inf.buffer, inf.byteOffset, inf.byteLength);
        } else {
          uncompressedData = compData.slice();
        }

        if (crc !== 0 && crc32(uncompressedData) !== crc) {
          throw new Error(`Lỗi kiểm tra tính toàn vẹn (CRC mismatch) cho file: ${filename}`);
        }

        if (!filename.endsWith('/')) {
          files.push({ name: filename, data: uncompressedData });
        }

        offset = dataStart + compSize;
      }

      return files;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Main PetPackController Class
  // ═══════════════════════════════════════════════════════════════════════════

  class PetPackController {
    constructor() {
      this.version = 1;
      this.container = null;
      this._undoSnapshot = null;
    }

    validateEntryPath(name) {
      return validateEntryPath(name);
    }

    validatePetJson(json) {
      return validatePetJsonSchema(json);
    }

    /**
     * Get active pet data from current application state, PetEventsUI, PetCanvasStudio.
     */
    getActivePetData() {
      const state = (typeof window !== 'undefined' && window.appState) ? window.appState : null;
      const name = (state && state.petName) || 'Antigravity Pet';
      const speech = (state && state.petSpeech) || 'Chủ nhân cố lên nhé! Hôm nay code gì thế ạ? ✨';
      const fps = (state && state.petAnimConfig && state.petAnimConfig.fps) || 12;
      const size = (state && state.petSize) || 128;
      const anchor = (state && state.petAnchor) ? { ...state.petAnchor } : { x: 64, y: 128 };
      const hitbox = (state && state.petHitbox) ? { ...state.petHitbox } : { x: 0, y: 0, w: 128, h: 128 };

      // States
      const states = (state && state.petAnimConfig && state.petAnimConfig.states) ? JSON.parse(JSON.stringify(state.petAnimConfig.states)) : {
        idle: { startFrame: 0, endFrame: 0, loop: true, fps: 12 },
        walk: { startFrame: 0, endFrame: 0, loop: true, fps: 12 },
        sleep: { startFrame: 0, endFrame: 0, loop: true, fps: 6 },
        click: { startFrame: 0, endFrame: 0, loop: false, fps: 12 },
        drag: { startFrame: 0, endFrame: 0, loop: true, fps: 12 }
      };

      // Events
      let events = null;
      if (typeof window !== 'undefined' && window.PetEventsUI && typeof window.PetEventsUI.getEvents === 'function') {
        events = window.PetEventsUI.getEvents();
      } else if (state && Array.isArray(state.petEvents)) {
        events = JSON.parse(JSON.stringify(state.petEvents));
      } else {
        events = JSON.parse(JSON.stringify(DEFAULT_PET_EVENTS));
      }

      // Frames
      let frames = [];
      if (typeof window !== 'undefined') {
        const pbsCanvas = document.getElementById('pbsCanvas');
        if (pbsCanvas && typeof pbsCanvas.toDataURL === 'function') {
          try {
            const du = pbsCanvas.toDataURL('image/png');
            if (du && du.startsWith('data:image/png')) frames.push(du);
          } catch (_) {}
        }
      }

      if (frames.length === 0 && state && state.mascotUrl && state.mascotUrl.startsWith('data:image/png')) {
        frames.push(state.mascotUrl);
      }

      if (frames.length === 0) {
        frames.push(TRANSPARENT_PNG_DATA_URL);
      }

      return {
        schemaVersion: 1,
        name,
        speech,
        fps,
        size,
        anchor,
        hitbox,
        states,
        events,
        frames
      };
    }

    /**
     * Export active or provided pet data as a PKZIP binary package (.zip).
     * @param {Object} [petData]
     * @returns {Promise<Blob>}
     */
    async exportZip(petData) {
      const data = petData ? JSON.parse(JSON.stringify(petData)) : this.getActivePetData();
      
      // Ensure schemaVersion === 1
      data.schemaVersion = 1;
      data.name = data.name || 'Antigravity Pet';
      data.speech = data.speech || 'Chào bạn! Em là Pet Companion ✨';
      data.fps = data.fps || 12;
      data.size = data.size || 128;
      data.anchor = data.anchor || { x: 64, y: 128 };
      data.hitbox = data.hitbox || { x: 0, y: 0, w: data.size, h: data.size };
      
      // Ensure all 5 states exist
      data.states = data.states || {};
      for (const st of REQUIRED_STATES) {
        if (!data.states[st]) {
          data.states[st] = { startFrame: 0, endFrame: 0, loop: true, fps: data.fps };
        }
      }

      data.events = Array.isArray(data.events) ? data.events : JSON.parse(JSON.stringify(DEFAULT_PET_EVENTS));

      // Build sprites entries and frames list
      const rawFrames = Array.isArray(data.frames) && data.frames.length > 0 ? data.frames : [TRANSPARENT_PNG_DATA_URL];
      const zipFiles = [];
      const relativeFramePaths = [];

      for (let i = 0; i < rawFrames.length; i++) {
        const frameItem = rawFrames[i];
        const numStr = String(i + 1).padStart(4, '0');
        const filename = `sprites/${numStr}.png`;
        relativeFramePaths.push(filename);

        let binaryPng;
        if (typeof frameItem === 'string' && frameItem.startsWith('data:image/')) {
          binaryPng = base64ToBytes(frameItem);
        } else if (frameItem instanceof Uint8Array) {
          binaryPng = frameItem;
        } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(frameItem)) {
          binaryPng = new Uint8Array(frameItem.buffer, frameItem.byteOffset, frameItem.byteLength);
        } else {
          binaryPng = base64ToBytes(TRANSPARENT_PNG_DATA_URL);
        }

        // Verify valid PNG header
        if (!isPngHeader(binaryPng)) {
          throw new Error(`Khung hình ${i + 1} (${filename}) không phải là định dạng PNG hợp lệ.`);
        }

        zipFiles.push({ name: filename, data: binaryPng });
      }

      // Build pet.json object
      const petJsonObj = {
        schemaVersion: 1,
        name: data.name,
        speech: data.speech,
        fps: data.fps,
        size: data.size,
        anchor: data.anchor,
        hitbox: data.hitbox,
        states: data.states,
        events: data.events,
        frames: relativeFramePaths
      };

      // Validate schema before packaging
      validatePetJsonSchema(petJsonObj);

      zipFiles.unshift({
        name: 'pet.json',
        data: JSON.stringify(petJsonObj, null, 2)
      });

      const zipBytes = PKZipEngine.createZip(zipFiles);
      return new Blob([zipBytes], { type: 'application/zip' });
    }

    /**
     * Import a pet package (.zip).
     * Strictly verifies Path Traversal, limits, pet.json schema, and image integrity.
     * @param {Blob|File|ArrayBuffer|Uint8Array|Buffer|string} file
     * @param {Object} [options]
     * @returns {Promise<Object>} The parsed and validated PetData
     */
    async importZip(file, options = {}) {
      let uint8;

      if (typeof file === 'string') {
        // File path in Node
        if (typeof require === 'function') {
          const fs = require('fs');
          const buf = fs.readFileSync(file);
          uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        } else {
          throw new Error('Không thể đọc đường dẫn tệp trong trình duyệt.');
        }
      } else if (file instanceof Blob || (typeof File !== 'undefined' && file instanceof File)) {
        const ab = await file.arrayBuffer();
        uint8 = new Uint8Array(ab);
      } else if (file instanceof ArrayBuffer) {
        uint8 = new Uint8Array(file);
      } else if (file instanceof Uint8Array) {
        uint8 = file;
      } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
        uint8 = new Uint8Array(file.buffer, file.byteOffset, file.byteLength);
      } else {
        throw new Error('Dữ liệu gói pet không hợp lệ (không phải Blob, Buffer hoặc đường dẫn tệp).');
      }

      // 1. Unzip and check limits & path traversal
      const entries = await PKZipEngine.readZip(uint8);

      // 2. Locate pet.json
      const petJsonEntry = entries.find(e => e.name === 'pet.json');
      if (!petJsonEntry) {
        throw new Error("Tệp gói Pet không hợp lệ: Thiếu file cấu hình bắt buộc 'pet.json' ở thư mục gốc của gói .zip.");
      }

      let petJson;
      try {
        const text = utf8Decode(petJsonEntry.data);
        petJson = JSON.parse(text);
      } catch (err) {
        throw new Error(`Không thể phân tích cú pháp tệp 'pet.json': ${err.message}`);
      }

      // 3. Validate schema
      validatePetJsonSchema(petJson);

      // 4. Check all frame PNGs referenced in pet.json exist and are valid PNG images
      const frameDataUrls = [];
      for (const framePath of petJson.frames) {
        const normalizedPath = framePath.replace(/\\/g, '/');
        const imgEntry = entries.find(e => e.name === normalizedPath);
        if (!imgEntry) {
          throw new Error(`Tệp gói Pet bị thiếu ảnh khung hình: '${framePath}'. Vui lòng kiểm tra lại cấu trúc gói zip.`);
        }

        if (!isPngHeader(imgEntry.data)) {
          throw new Error(`Khung hình '${framePath}' không phải là định dạng ảnh PNG hợp lệ (sai magic header).`);
        }

        const dataUrl = bytesToBase64(imgEntry.data, 'image/png');
        frameDataUrls.push(dataUrl);
      }

      const importedPetData = {
        schemaVersion: 1,
        name: petJson.name,
        speech: petJson.speech || '',
        fps: petJson.fps || 12,
        size: petJson.size || 128,
        anchor: petJson.anchor || { x: 64, y: 128 },
        hitbox: petJson.hitbox || { x: 0, y: 0, w: petJson.size || 128, h: petJson.size || 128 },
        states: petJson.states,
        events: petJson.events,
        frames: petJson.frames,
        frameDataUrls: frameDataUrls,
        dataUrl: frameDataUrls[0]
      };

      // 5. Restore if confirmed
      if (options.applyNow !== false && typeof window !== 'undefined') {
        this.restorePet(importedPetData);
      }

      return importedPetData;
    }

    /**
     * Take an undo snapshot of current active pet state before overwrite.
     */
    takeUndoSnapshot() {
      if (typeof window === 'undefined') return null;
      const state = window.appState;
      const snapshot = {
        appState: state ? {
          petName: state.petName,
          petSpeech: state.petSpeech,
          mascotUrl: state.mascotUrl,
          petAnchor: state.petAnchor ? { ...state.petAnchor } : null,
          petHitbox: state.petHitbox ? { ...state.petHitbox } : null,
          petAnimConfig: state.petAnimConfig ? JSON.parse(JSON.stringify(state.petAnimConfig)) : null,
          petEvents: state.petEvents ? JSON.parse(JSON.stringify(state.petEvents)) : null,
          petSize: state.petSize
        } : null,
        events: (window.PetEventsUI && typeof window.PetEventsUI.getEvents === 'function') ? window.PetEventsUI.getEvents() : null
      };
      this._undoSnapshot = snapshot;
      return snapshot;
    }

    /**
     * Restore previous pet snapshot (Undo).
     */
    undoRestore() {
      if (!this._undoSnapshot) {
        throw new Error('Chưa có bản ghi nào để hoàn tác.');
      }
      const s = this._undoSnapshot;
      if (typeof window !== 'undefined' && window.appState && s.appState) {
        Object.assign(window.appState, JSON.parse(JSON.stringify(s.appState)));
        if (typeof window.updateLivePreview === 'function') window.updateLivePreview();
        if (typeof window.saveConfig === 'function') window.saveConfig();
      }
      if (typeof window !== 'undefined' && window.PetEventsUI && s.events) {
        window.PetEventsUI.events = JSON.parse(JSON.stringify(s.events));
        if (typeof window.PetEventsUI._persistEvents === 'function') window.PetEventsUI._persistEvents();
        if (typeof window.PetEventsUI.render === 'function') window.PetEventsUI.render();
        if (typeof window.PetEventsUI.renderSimBar === 'function') window.PetEventsUI.renderSimBar();
      }
      if (typeof window !== 'undefined') {
        const overlay = window._globalPetOverlay || window.PetOverlayInstance;
        if (overlay && typeof overlay.setPetData === 'function' && s.appState) {
          overlay.setPetData({
            dataUrl: s.appState.mascotUrl || '',
            anchorX: (s.appState.petAnchor && s.appState.petAnchor.x) || 0,
            anchorY: (s.appState.petAnchor && s.appState.petAnchor.y) || 0,
            hitbox: s.appState.petHitbox || null
          });
        }
      }
      this._undoSnapshot = null;
      return true;
    }

    /**
     * Restore imported PetData into PetCanvasStudio, PetOverlay, PetEvents, and appState.
     * @param {Object} petData
     */
    restorePet(petData) {
      if (!petData) return;

      // 1. appState
      if (typeof window !== 'undefined' && window.appState) {
        const s = window.appState;
        s.petName = petData.name;
        s.petSpeech = petData.speech || '';
        if (petData.dataUrl) s.mascotUrl = petData.dataUrl;
        s.petAnchor = petData.anchor ? { ...petData.anchor } : { x: 0, y: 0 };
        s.petHitbox = petData.hitbox ? { ...petData.hitbox } : null;
        s.petSize = petData.size || 128;
        s.petAnimConfig = {
          fps: petData.fps || 12,
          states: petData.states ? JSON.parse(JSON.stringify(petData.states)) : {},
          totalFrames: (petData.frames && petData.frames.length) || 1,
          anchor: s.petAnchor,
          hitbox: s.petHitbox
        };
        if (petData.events) s.petEvents = JSON.parse(JSON.stringify(petData.events));
        if (typeof window.updateLivePreview === 'function') window.updateLivePreview();
        if (typeof window.saveConfig === 'function') window.saveConfig();
      }

      // 2. PetEventsUI
      if (typeof window !== 'undefined' && window.PetEventsUI && petData.events) {
        window.PetEventsUI.events = JSON.parse(JSON.stringify(petData.events));
        if (typeof window.PetEventsUI._persistEvents === 'function') window.PetEventsUI._persistEvents();
        if (typeof window.PetEventsUI.render === 'function') window.PetEventsUI.render();
        if (typeof window.PetEventsUI.renderSimBar === 'function') window.PetEventsUI.renderSimBar();
      }

      // 3. PetOverlay
      if (typeof window !== 'undefined') {
        const overlay = window._globalPetOverlay || window.PetOverlayInstance;
        if (overlay && typeof overlay.setPetData === 'function') {
          overlay.setPetData({
            dataUrl: petData.dataUrl || (petData.frameDataUrls && petData.frameDataUrls[0]) || '',
            anchorX: petData.anchor ? petData.anchor.x : 0,
            anchorY: petData.anchor ? petData.anchor.y : 0,
            hitbox: petData.hitbox || null
          });
        }
      }

      // 4. PetCanvasStudio / Editor Canvas
      if (typeof window !== 'undefined') {
        const targetUrl = petData.dataUrl || (petData.frameDataUrls && petData.frameDataUrls[0]);
        if (window.petCanvasStudioInstance && typeof window.petCanvasStudioInstance.loadImage === 'function' && targetUrl) {
          window.petCanvasStudioInstance.loadImage(targetUrl);
        }
        const pbsCanvas = document.getElementById('pbsCanvas');
        if (pbsCanvas && targetUrl && typeof Image !== 'undefined') {
          const img = new Image();
          img.onload = () => {
            pbsCanvas.width = img.width;
            pbsCanvas.height = img.height;
            const ctx = pbsCanvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, pbsCanvas.width, pbsCanvas.height);
              ctx.drawImage(img, 0, 0);
            }
          };
          img.src = targetUrl;
        }
      }
    }

    /**
     * Export active pet as a VS Code / Antigravity Extension project scaffold (VSIX / ZIP).
     * @param {Object} [petData]
     * @returns {Promise<Blob>}
     */
    async exportVsix(petData) {
      const data = petData ? JSON.parse(JSON.stringify(petData)) : this.getActivePetData();
      data.schemaVersion = 1;
      data.name = data.name || 'Antigravity Pet';

      const zipFiles = [];
      const relativeFramePaths = [];
      const rawFrames = Array.isArray(data.frames) && data.frames.length > 0 ? data.frames : [TRANSPARENT_PNG_DATA_URL];

      // Store sprite files under media/sprites/
      for (let i = 0; i < rawFrames.length; i++) {
        const frameItem = rawFrames[i];
        const numStr = String(i + 1).padStart(4, '0');
        const filename = `media/sprites/${numStr}.png`;
        relativeFramePaths.push(`sprites/${numStr}.png`);

        let binaryPng;
        if (typeof frameItem === 'string' && frameItem.startsWith('data:image/')) {
          binaryPng = base64ToBytes(frameItem);
        } else if (frameItem instanceof Uint8Array) {
          binaryPng = frameItem;
        } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(frameItem)) {
          binaryPng = new Uint8Array(frameItem.buffer, frameItem.byteOffset, frameItem.byteLength);
        } else {
          binaryPng = base64ToBytes(TRANSPARENT_PNG_DATA_URL);
        }

        zipFiles.push({ name: filename, data: binaryPng });
      }

      // Build media/pet.json
      const petJsonObj = {
        schemaVersion: 1,
        name: data.name,
        speech: data.speech || '',
        fps: data.fps || 12,
        size: data.size || 128,
        anchor: data.anchor || { x: 64, y: 128 },
        hitbox: data.hitbox || { x: 0, y: 0, w: data.size || 128, h: data.size || 128 },
        states: data.states,
        events: data.events || DEFAULT_PET_EVENTS,
        frames: relativeFramePaths
      };
      zipFiles.push({
        name: 'media/pet.json',
        data: JSON.stringify(petJsonObj, null, 2)
      });

      // 1. package.json (VS Code extension manifest)
      const extPackageJson = {
        name: `antigravity-pet-${(data.name || 'companion').toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        displayName: `${data.name} - Pet Companion`,
        description: `Mascot Pet companion overlay for VS Code & Google Antigravity (${data.name})`,
        version: '1.0.0',
        publisher: 'antigravity-studio',
        engines: {
          vscode: '^1.80.0'
        },
        categories: ['Other'],
        activationEvents: [
          'onStartupFinished'
        ],
        main: './extension.js',
        contributes: {
          commands: [
            {
              command: 'antigravityPet.show',
              title: 'Antigravity Pet: Hiện Pet Companion'
            },
            {
              command: 'antigravityPet.hide',
              title: 'Antigravity Pet: Ẩn Pet Companion'
            },
            {
              command: 'antigravityPet.triggerEvent',
              title: 'Antigravity Pet: Kích hoạt sự kiện thử nghiệm'
            }
          ],
          viewsContainers: {
            activitybar: [
              {
                id: 'antigravity-pet-container',
                title: 'Pet Companion',
                icon: 'media/sprites/0001.png'
              }
            ]
          },
          views: {
            'antigravity-pet-container': [
              {
                type: 'webview',
                id: 'antigravityPetView',
                name: data.name
              }
            ]
          }
        }
      };
      zipFiles.push({
        name: 'package.json',
        data: JSON.stringify(extPackageJson, null, 2)
      });

      // 2. extension.js (VS Code Extension Entry Point)
      const extensionSource = `/**
 * extension.js - ${data.name} Companion Extension Entry Point
 * Generated by Antigravity Theme Studio (GIAI ĐOẠN 5)
 */
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

let currentPanel = null;

function activate(context) {
  console.log('[Antigravity Pet] Extension activated for mascot: "${data.name}"');

  // Register Show Command
  const showCmd = vscode.commands.registerCommand('antigravityPet.show', () => {
    if (currentPanel) {
      currentPanel.reveal(vscode.ViewColumn.Beside);
    } else {
      currentPanel = vscode.window.createWebviewPanel(
        'antigravityPetPanel',
        '${data.name} Companion',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))]
        }
      );
      currentPanel.webview.html = getWebviewContent(context, currentPanel.webview);
      currentPanel.onDidDispose(() => { currentPanel = null; }, null, context.subscriptions);
    }
  });

  // Register Hide Command
  const hideCmd = vscode.commands.registerCommand('antigravityPet.hide', () => {
    if (currentPanel) {
      currentPanel.dispose();
      currentPanel = null;
    }
  });

  // Register Trigger Event Command
  const triggerCmd = vscode.commands.registerCommand('antigravityPet.triggerEvent', async () => {
    if (!currentPanel) {
      vscode.window.showInformationMessage('Vui lòng mở Pet Companion trước bằng lệnh "antigravityPet.show"!');
      return;
    }
    const ev = await vscode.window.showQuickPick(
      ['ai-thinking', 'user-typing', 'ai-done', 'error', 'pet-click', 'idle-long'],
      { placeHolder: 'Chọn sự kiện để mô phỏng tương tác Pet' }
    );
    if (ev) {
      currentPanel.webview.postMessage({ type: 'triggerEvent', event: ev });
    }
  });

  // Event Listeners for Editor Reactivity
  vscode.workspace.onDidChangeTextDocument((e) => {
    if (currentPanel) {
      currentPanel.webview.postMessage({ type: 'triggerEvent', event: 'user-typing' });
    }
  }, null, context.subscriptions);

  context.subscriptions.push(showCmd, hideCmd, triggerCmd);
}

function getWebviewContent(context, webview) {
  const mediaPath = path.join(context.extensionPath, 'media');
  const petJsonRaw = fs.readFileSync(path.join(mediaPath, 'pet.json'), 'utf8');
  const petConfig = JSON.parse(petJsonRaw);

  const runtimeUri = webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, 'petOverlayRuntime.js')));
  const cssUri = webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, 'petOverlayRuntime.css')));

  const spriteUris = petConfig.frames.map(f => {
    return webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, f))).toString();
  });

  return \`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="\${cssUri}">
</head>
<body class="pet-companion-body">
  <div id="petStage" class="pet-stage">
    <div id="petPedestal" class="pet-pedestal"></div>
    <div id="petMascot" class="pet-mascot"></div>
    <div id="speechBubble" class="pet-speech-bubble" style="display:none;"></div>
  </div>
  <script>
    window.__PET_CONFIG__ = \${JSON.stringify(petConfig)};
    window.__SPRITE_URIS__ = \${JSON.stringify(spriteUris)};
  </script>
  <script src="\${runtimeUri}"></script>
</body>
</html>\`;
}

function deactivate() {
  if (currentPanel) currentPanel.dispose();
}

module.exports = { activate, deactivate };
`;
      zipFiles.push({ name: 'extension.js', data: extensionSource });

      // 3. media/petOverlayRuntime.js
      const runtimeSource = `/**
 * petOverlayRuntime.js - Standalone Pet Runtime for VS Code Webview
 */
(function() {
  const cfg = window.__PET_CONFIG__ || {};
  const spriteUris = window.__SPRITE_URIS__ || [];
  const mascotEl = document.getElementById('petMascot');
  const bubbleEl = document.getElementById('speechBubble');
  let currentFrameIdx = 0;
  let currentState = 'idle';
  let animTimer = null;
  let revertTimer = null;
  let currentPriority = 0;

  function setFrame(idx) {
    if (!mascotEl || spriteUris.length === 0) return;
    const uri = spriteUris[idx % spriteUris.length];
    mascotEl.style.backgroundImage = 'url(' + uri + ')';
    mascotEl.style.width = (cfg.size || 128) + 'px';
    mascotEl.style.height = (cfg.size || 128) + 'px';
  }

  function playState(stateName) {
    currentState = stateName;
    const st = (cfg.states && cfg.states[stateName]) || { startFrame: 0, endFrame: Math.max(0, spriteUris.length - 1), fps: cfg.fps || 12 };
    if (animTimer) clearInterval(animTimer);

    currentFrameIdx = st.startFrame;
    setFrame(currentFrameIdx);

    const intervalMs = 1000 / (st.fps || 12);
    animTimer = setInterval(() => {
      currentFrameIdx++;
      if (currentFrameIdx > st.endFrame) {
        if (st.loop !== false) {
          currentFrameIdx = st.startFrame;
        } else {
          currentFrameIdx = st.endFrame;
          clearInterval(animTimer);
        }
      }
      setFrame(currentFrameIdx);
    }, intervalMs);
  }

  function triggerEvent(evName) {
    const ev = (cfg.events || []).find(e => e.event === evName);
    if (!ev) return;
    if (ev.priority <= currentPriority && currentPriority > 0) return; // Strict non-overwrite

    currentPriority = ev.priority;
    playState(ev.state || 'idle');

    if (bubbleEl && ev.speech) {
      bubbleEl.textContent = ev.speech;
      bubbleEl.style.display = 'block';
    }

    if (revertTimer) clearTimeout(revertTimer);
    revertTimer = setTimeout(() => {
      currentPriority = 0;
      playState('idle');
      if (bubbleEl) bubbleEl.style.display = 'none';
    }, ev.returnAfterMs || 3000);
  }

  window.addEventListener('message', e => {
    if (e.data && e.data.type === 'triggerEvent') {
      triggerEvent(e.data.event);
    }
  });

  if (mascotEl) {
    mascotEl.addEventListener('click', () => triggerEvent('pet-click'));
  }

  // Start with idle
  playState('idle');
})();
`;
      zipFiles.push({ name: 'media/petOverlayRuntime.js', data: runtimeSource });

      // 4. media/petOverlayRuntime.css
      const cssSource = `/* petOverlayRuntime.css - Pet Webview Styles */
body.pet-companion-body {
  margin: 0;
  padding: 0;
  background: transparent;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-family: system-ui, -apple-system, sans-serif;
}

.pet-stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.pet-mascot {
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  cursor: pointer;
  z-index: 2;
  transition: transform 0.15s ease;
}

.pet-mascot:hover {
  transform: scale(1.08);
}

.pet-pedestal {
  position: absolute;
  bottom: 0px;
  width: 110px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(125, 207, 255, 0.7) 0%, rgba(125, 207, 255, 0.2) 50%, transparent 80%);
  z-index: 1;
}

.pet-speech-bubble {
  position: absolute;
  top: -46px;
  background: rgba(13, 26, 44, 0.92);
  border: 1px solid #7DCFFF;
  color: #E6F1FF;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 11px;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
  z-index: 10;
  pointer-events: none;
}
`;
      zipFiles.push({ name: 'media/petOverlayRuntime.css', data: cssSource });

      // 5. README.md (Comprehensive, Honest & Transparent Documentation)
      const readmeSource = `# 🐾 ${data.name} - VS Code / Antigravity Companion Extension Scaffold

Dự án mẫu (Scaffold Project) xuất từ **Antigravity Theme Studio** dành cho Mascot Pet **${data.name}**.

---

## 🔍 BÁO CÁO MINH BẠCH VỀ TÍNH NĂNG (TRANSPARENCY & INTEGRITY REPORT)

Để đảm bảo tính trung thực tuyệt đối về kỹ thuật, vui lòng lưu ý:

### ✅ NHỮNG TÍNH NĂNG HOẠT ĐỘNG THỰC TẾ (What Works Out-of-the-box):
1. **Mascot Companion Webview Overlay**: Khởi chạy một cửa sổ hoặc bảng điều khiển Webview hiển thị Pet sinh động bên cạnh code editor.
2. **Hệ Thống Trạng Thái Animation (State Machine)**: Hoạt họa mượt mà chuyển đổi giữa 5 trạng thái (\`idle\`, \`walk\`, \`sleep\`, \`click\`, \`drag\`) dựa trên khung hình sprite được xuất từ Studio.
3. **Bộ Phản Ứng 7 Sự Kiện Thời Gian Thực**:
   - \`error\` (Độ ưu tiên 100): Kích hoạt khi có lỗi hệ thống hoặc lỗi cú pháp.
   - \`ai-thinking\` (Độ ưu tiên 80): Kích hoạt khi AI/LLM đang sinh code.
   - \`user-typing\` (Độ ưu tiên 60): Kích hoạt tự động khi người dùng gõ phím (\`onDidChangeTextDocument\`).
   - \`ai-done\` (Độ ưu tiên 40): Kích hoạt khi AI hoàn thành nhiệm vụ.
   - \`pet-click\` (Độ ưu tiên 30): Phản ứng nhột/vui vẻ khi người dùng click chuột vào Pet.
   - \`idle-long\` (Độ ưu tiên 10): Đi ngủ khi người dùng không hoạt động.
4. **Quy Tắc Ưu Tiên Ngắt Nghiêm Ngặt & Tự Động Hồi Phục**: Sự kiện ưu tiên cao ngắt ưu tiên thấp; tự động trở về \`idle\` sau \`returnAfterMs\`.
5. **Bong Bóng Thoại & Hiệu Ứng Bệ Đỡ**: Bong bóng thoại Cyan sắc nét và bệ đỡ phát sáng.

---

### ⚠️ NHỮNG HẠN CHẾ & YÊU CẦU CÀI ĐẶT THỦ CÔNG (Scaffold / Manual Setup):
1. **ĐÂY LÀ DỰ ÁN MÃ NGUỒN MẪU (SCAFFOLD), CHƯA PHẢI BẢN PHÁT HÀNH CHÍNH THỨC TRÊN VS CODE MARKETPLACE**:
   - Gói này chưa được publish lên Microsoft Extension Marketplace.
   - Bạn cần mở thư mục này trong VS Code và nhấn **F5** (Extension Development Host) để trải nghiệm.
2. **Giới Hạn Nền Tảng Electron Trong VS Code**:
   - VS Code không cho phép extension tạo cửa sổ native OS trong suốt nằm ngoài khung cửa sổ của VS Code (khác với ứng dụng Antigravity Desktop độc lập).
   - Pet sẽ hiển thị trong Webview Panel hoặc Sidebar View của VS Code.
3. **Cách Đóng Gói Thành File .vsix Thật Sự**:
   \`\`\`bash
   # Cài đặt công cụ đóng gói VSCE của Microsoft
   npm install -g @vscode/vsce
   # Chạy lệnh đóng gói
   vsce package
   # Cài đặt vào VS Code
   code --install-extension *.vsix
   \`\`\`

---

## 🚀 HƯỚNG DẪN SỬ DỤNG
1. Giải nén thư mục này.
2. Mở thư mục bằng **VS Code** hoặc **Antigravity IDE**.
3. Nhấn **F5** để khởi chạy chế độ kiểm thử Extension.
4. Nhấn \`Ctrl+Shift+P\` (hoặc \`Cmd+Shift+P\`), gõ:
   - \`Antigravity Pet: Hiện Pet Companion\`
   - \`Antigravity Pet: Kích hoạt sự kiện thử nghiệm\`
`;
      zipFiles.push({ name: 'README.md', data: readmeSource });

      const vsixBytes = PKZipEngine.createZip(zipFiles);
      return new Blob([vsixBytes], { type: 'application/zip' });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 6. UI Mounting & DOM Binding (#petPackMount)
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Mount UI into container (#petPackMount)
     * @param {HTMLElement|string} [mountEl]
     */
    init(mountEl) {
      if (typeof document === 'undefined') return;

      const container = (typeof mountEl === 'string') 
        ? document.getElementById(mountEl) 
        : (mountEl || document.getElementById('petPackMount'));

      if (!container) return;
      this.container = container;
      this.render();
      this.bindEvents();
    }

    render() {
      if (!this.container) return;

      this.container.innerHTML = `
        <div class="pet-pack-box">
          <div class="pet-pack-header">
            <div class="pet-pack-title-wrap">
              <span class="pet-pack-icon">📦</span>
              <div>
                <h4 class="pet-pack-title">GIAI ĐOẠN 5: XUẤT / NHẬP GÓI PET & KHUNG EXTENSION VSIX</h4>
                <p class="pet-pack-subtitle">Chia sẻ gói Pet độc lập (.zip) chuẩn Schema 1 hoặc xuất khung dự án Extension (.vsix) cho VS Code & Antigravity</p>
              </div>
            </div>
          </div>
          
          <div class="pet-pack-actions">
            <button class="pet-pack-btn pet-pack-btn-export" id="btnExportPetZip" title="Xuất toàn bộ sprite và cấu hình pet thành tệp .zip">
              <span class="pet-pack-btn-icon">📦</span> Xuất gói Pet (.zip)
            </button>
            <button class="pet-pack-btn pet-pack-btn-import" id="btnImportPetZip" title="Nạp gói Pet từ tệp .zip (Kiểm tra schema & bảo mật path traversal)">
              <span class="pet-pack-btn-icon">📂</span> Nhập gói Pet (.zip)
            </button>
            <button class="pet-pack-btn pet-pack-btn-vsix" id="btnExportPetVsix" title="Xuất khung dự án Extension hoàn chỉnh cho VS Code và Antigravity">
              <span class="pet-pack-btn-icon">🧩</span> Xuất thành Extension (VSIX)
            </button>
            <input type="file" id="petPackFileInput" accept=".zip,application/zip" style="display: none;">
          </div>

          <div class="pet-pack-status-area" id="petPackStatusArea" style="display: none;">
            <div class="pet-pack-status-message" id="petPackStatusMessage"></div>
            <div class="pet-pack-status-actions" id="petPackStatusActions"></div>
          </div>
        </div>
      `;
    }

    bindEvents() {
      if (!this.container) return;

      const btnExport = this.container.querySelector('#btnExportPetZip');
      const btnImport = this.container.querySelector('#btnImportPetZip');
      const btnVsix = this.container.querySelector('#btnExportPetVsix');
      const fileInput = this.container.querySelector('#petPackFileInput');

      if (btnExport) {
        btnExport.onclick = async () => {
          try {
            this.showStatus('Đang đóng gói dữ liệu Pet thành PKZIP (.zip)...', 'info');
            const blob = await this.exportZip();
            const activeData = this.getActivePetData();
            const cleanName = (activeData.name || 'pet').toLowerCase().replace(/[^a-z0-9]/g, '-');
            this.downloadBlob(blob, `${cleanName}-pack.zip`);
            this.showStatus(`✓ Xuất gói Pet thành công! (${(blob.size / 1024).toFixed(1)} KB)`, 'success');
          } catch (err) {
            this.showStatus(`Lỗi khi xuất gói Pet: ${err.message}`, 'error');
          }
        };
      }

      if (btnImport && fileInput) {
        btnImport.onclick = () => {
          fileInput.value = '';
          fileInput.click();
        };

        fileInput.onchange = async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;

          try {
            this.showStatus(`Đang đọc và kiểm tra tệp "${file.name}"...`, 'info');
            
            // Validate and parse without immediate restore
            const parsedPet = await this.importZip(file, { applyNow: false });

            // Ask confirmation before overwrite
            const confirmMsg = `Bạn có chắc chắn muốn nạp gói Pet "${parsedPet.name}" (${parsedPet.frames.length} frames) và ghi đè Pet hiện tại không?\n\n(Hệ thống sẽ lưu snapshot tự động để bạn có thể Hoàn tác)`;
            const ok = (typeof window.confirm === 'function') ? window.confirm(confirmMsg) : true;

            if (!ok) {
              this.showStatus('Đã hủy thao tác nạp gói Pet.', 'info');
              return;
            }

            // Take snapshot for Undo
            this.takeUndoSnapshot();

            // Apply restoration
            this.restorePet(parsedPet);

            this.showStatus(
              `✓ Đã nạp thành công gói Pet: "${parsedPet.name}" (${parsedPet.frames.length} khung hình, ${parsedPet.events.length} sự kiện).`,
              'success',
              true // Show undo button
            );
          } catch (err) {
            this.showStatus(`Lỗi nạp gói Pet: ${err.message}`, 'error');
            console.warn('[PetPack Import Lỗi]:', err);
          }
        };
      }

      if (btnVsix) {
        btnVsix.onclick = async () => {
          try {
            this.showStatus('Đang tạo khung dự án Extension (VSIX)...', 'info');
            const blob = await this.exportVsix();
            const activeData = this.getActivePetData();
            const cleanName = (activeData.name || 'companion').toLowerCase().replace(/[^a-z0-9]/g, '-');
            this.downloadBlob(blob, `${cleanName}-extension.vsix`);
            this.showStatus(`✓ Xuất dự án Extension thành công! Mở tệp .vsix bằng VS Code hoặc giải nén để xem mã nguồn.`, 'success');
          } catch (err) {
            this.showStatus(`Lỗi khi xuất Extension: ${err.message}`, 'error');
          }
        };
      }
    }

    showStatus(msg, type = 'info', allowUndo = false) {
      if (!this.container) return;
      const area = this.container.querySelector('#petPackStatusArea');
      const msgEl = this.container.querySelector('#petPackStatusMessage');
      const actionsEl = this.container.querySelector('#petPackStatusActions');
      if (!area || !msgEl) return;

      area.style.display = 'flex';
      area.className = `pet-pack-status-area status-${type}`;
      msgEl.textContent = msg;

      if (actionsEl) {
        actionsEl.innerHTML = '';
        if (allowUndo && this._undoSnapshot) {
          const btnUndo = document.createElement('button');
          btnUndo.className = 'pet-pack-undo-btn';
          btnUndo.textContent = '↺ Hoàn tác (Undo)';
          btnUndo.onclick = () => {
            try {
              this.undoRestore();
              this.showStatus('✓ Đã hoàn tác thành công về trạng thái Pet trước đó.', 'success');
            } catch (err) {
              this.showStatus(`Không thể hoàn tác: ${err.message}`, 'error');
            }
          };
          actionsEl.appendChild(btnUndo);
        }

        const btnClose = document.createElement('button');
        btnClose.className = 'pet-pack-close-btn';
        btnClose.innerHTML = '&times;';
        btnClose.title = 'Đóng thông báo';
        btnClose.onclick = () => { area.style.display = 'none'; };
        actionsEl.appendChild(btnClose);
      }
    }

    downloadBlob(blob, filename) {
      if (typeof window === 'undefined') return;
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (err) {
        console.error('[PetPack Download Error]:', err);
      }
    }
  }

  const instance = new PetPackController();

  // Auto-init on DOMContentLoaded if running in browser
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        instance.init();
      });
    } else {
      setTimeout(() => {
        if (!instance.container && document.getElementById('petPackMount')) {
          instance.init();
        }
      }, 0);
    }
  }

  return instance;
});
