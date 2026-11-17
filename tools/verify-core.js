const fs = require('fs');
const norm = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' ')
  .replace(/\s*([{}()\[\];,:=<>+\-*\/%&|!?.])\s*/g, '$1').trim();

function chunks(src) { // cắt file lõi thành các câu lệnh cấp cao nhất
  const out = []; let depth = 0, cur = '', i = 0, q = null;
  const flush = () => { if (cur.trim()) out.push(cur); cur = ''; };
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (q) { cur += c; if (c === '\\') { cur += n || ''; i += 2; continue; } if (c === q) q = null; i++; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; cur += c; i++; continue; }
    if ('{(['.includes(c)) depth++;
    if ('})]'.includes(c)) depth--;
    cur += c; i++;
    if (depth === 0 && c === ';') flush();
    else if (depth === 0 && c === '}') { let j = i; while (j < src.length && /\s/.test(src[j])) j++; if (!';,).'.includes(src[j] || '')) flush(); }
  }
  flush(); return out;
}

const [, , coreFile, ...srcFiles] = process.argv;
if (!coreFile || !srcFiles.length) { console.error('Cách dùng: node tools/verify-core.js <file lõi> <file nguồn...>'); process.exit(2); }
const src = norm(srcFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n'));
const missing = [];
for (const ch of chunks(fs.readFileSync(coreFile, 'utf8'))) { const t = norm(ch); if (t.length >= 12 && !src.includes(t)) missing.push(t.slice(0, 100)); }
if (missing.length) { console.log('THIẾU ' + missing.length + ' khối lõi nguyên văn:'); missing.forEach(m => console.log(' - ' + m + '...')); process.exit(1); }
console.log('ĐẠT: mọi khối lõi còn nguyên văn.');
