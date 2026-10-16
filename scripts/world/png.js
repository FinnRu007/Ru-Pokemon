import zlib from 'node:zlib'; import fs from 'node:fs';
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(t, d) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); }
export function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
export function decodePNG(buf) {
  let p = 8, w, h, bd, ct, pal, trns, idat = [];
  while (p < buf.length) { const l = buf.readUInt32BE(p); const t = buf.toString('ascii', p + 4, p + 8); const d = buf.subarray(p + 8, p + 8 + l);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; } else if (t === 'PLTE') pal = d; else if (t === 'tRNS') trns = d; else if (t === 'IDAT') idat.push(d); p += 12 + l; }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct]; const bpp = ch * bd / 8; const stride = Math.ceil(w * ch * bd / 8);
  const out = new Uint8Array(w * h * 4); let prev = new Uint8Array(stride); const bp = Math.max(1, Math.ceil(bpp));
  for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)]; const line = Uint8Array.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) { const a = i >= bp ? line[i - bp] : 0, b = prev[i], c = i >= bp ? prev[i - bp] : 0;
      if (f === 1) line[i] = (line[i] + a) & 255; else if (f === 2) line[i] = (line[i] + b) & 255; else if (f === 3) line[i] = (line[i] + ((a + b) >> 1)) & 255;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; } }
    for (let x = 0; x < w; x++) { let r, g, bb, al = 255;
      if (ct === 3) { const bit = x * bd; const v = (line[bit >> 3] >> (8 - bd - (bit & 7))) & ((1 << bd) - 1); r = pal[v * 3]; g = pal[v * 3 + 1]; bb = pal[v * 3 + 2]; if (trns && v < trns.length) al = trns[v]; out[(y*w+x)*4+3]=al; out.idx ??= new Uint8Array(w*h); out.idx[y*w+x]=v; }
      else if (ct === 6) { r = line[x * 4]; g = line[x * 4 + 1]; bb = line[x * 4 + 2]; al = line[x * 4 + 3]; }
      else if (ct === 2) { r = line[x * 3]; g = line[x * 3 + 1]; bb = line[x * 3 + 2]; }
      else if (ct === 0) { r = g = bb = line[x]; } else { r = g = bb = line[x * 2]; al = line[x * 2 + 1]; }
      out.set([r, g, bb, al], (y * w + x) * 4); }
    prev = line; }
  return { w, h, data: out, pal, idx: out.idx };
}
export const save = (f, w, h, d) => fs.writeFileSync(f, encodePNG(w, h, d));
