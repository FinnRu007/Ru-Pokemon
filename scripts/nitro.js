// Kleine Helfer fuer Nintendo-DS-Grafikdateien (ohne Zusatzpakete): NARC-Archive entpacken,
// LZ77 (Typ 0x10/0x11) dekomprimieren, Kacheln (NCGR), Paletten (NCLR) und Tilemaps (NSCR)
// zu einem Bild zusammensetzen und als PNG schreiben. Genutzt von scripts/fetch-sprites.js.
import zlib from 'node:zlib';

// NARC: Liste der enthaltenen Dateien (als Buffer-Ausschnitte)
export function unpackNarc(buf) {
  if (buf.toString('latin1', 0, 4) !== 'NARC') throw new Error('keine NARC-Datei');
  const fat = buf.readUInt16LE(12);
  const fatSize = buf.readUInt32LE(fat + 4);
  const count = buf.readUInt16LE(fat + 8);
  const fnt = fat + fatSize;
  const img = fnt + buf.readUInt32LE(fnt + 4) + 8;
  const out = [];
  for (let i = 0; i < count; i++) out.push(buf.subarray(img + buf.readUInt32LE(fat + 12 + i * 8), img + buf.readUInt32LE(fat + 16 + i * 8)));
  return out;
}

// LZ77 der DS-BIOS (0x10) und erweiterte Variante (0x11). Unkomprimiertes bleibt unveraendert.
export function lzDecompress(b) {
  if (b[0] !== 0x10 && b[0] !== 0x11) return b;
  const size = b.readUInt32LE(0) >>> 8;
  const out = Buffer.alloc(size);
  let i = 4, o = 0;
  const copy = (len, dist) => { for (let j = 0; j < len && o < size; j++, o++) out[o] = out[o - dist]; };
  while (o < size) {
    const flags = b[i++];
    for (let k = 7; k >= 0 && o < size; k--) {
      if (!(flags & (1 << k))) { out[o++] = b[i++]; continue; }
      if (b[0] === 0x10) { const x = b[i++], y = b[i++]; copy((x >> 4) + 3, ((x & 15) << 8 | y) + 1); continue; }
      const t = b[i] >> 4;
      if (t === 0) { copy(((b[i] & 15) << 4 | b[i + 1] >> 4) + 0x11, ((b[i + 1] & 15) << 8 | b[i + 2]) + 1); i += 3; }
      else if (t === 1) { copy(((b[i] & 15) << 12 | b[i + 1] << 4 | b[i + 2] >> 4) + 0x111, ((b[i + 2] & 15) << 8 | b[i + 3]) + 1); i += 4; }
      else { copy(t + 1, ((b[i] & 15) << 8 | b[i + 1]) + 1); i += 2; }
    }
  }
  return out;
}

// NCLR: Farben als [r, g, b] (BGR555)
export function readPalette(b) {
  const blk = b.readUInt16LE(12);
  const size = b.readUInt32LE(blk + 16);
  const data = blk + 0x18;
  const cols = [];
  for (let i = 0; i < size / 2; i++) {
    const v = b.readUInt16LE(data + i * 2);
    cols.push([(v & 31) * 255 / 31 | 0, (v >> 5 & 31) * 255 / 31 | 0, (v >> 10 & 31) * 255 / 31 | 0]);
  }
  return cols;
}

// NCGR: Kacheldaten (8x8) mit 4 oder 8 Bit je Pixel
export function readTiles(b) {
  const blk = b.readUInt16LE(12);
  const bpp = b.readUInt32LE(blk + 12) === 4 ? 8 : 4;
  const size = b.readUInt32LE(blk + 0x18);
  return { bpp, data: b.subarray(blk + 0x20, blk + 0x20 + size) };
}

// NSCR: Tilemap (Breite und Hoehe in Pixeln, Eintraege wie im VRAM: Bloecke zu 32x32 Kacheln)
export function readScreen(b) {
  const blk = b.readUInt16LE(12);
  const w = b.readUInt16LE(blk + 8), h = b.readUInt16LE(blk + 10);
  const size = b.readUInt32LE(blk + 16);
  return { w, h, data: b.subarray(blk + 0x14, blk + 0x14 + size) };
}

// Bild aus Kacheln, Palette und Tilemap. crop: { w, h } schneidet oben links aus. Ergebnis RGBA.
export function composeScreen(tiles, pal, scr, crop = null) {
  const W = crop?.w || scr.w, H = crop?.h || scr.h;
  const rgba = Buffer.alloc(W * H * 4);
  const blocksX = Math.max(1, scr.w / 256);
  for (let ty = 0; ty < H / 8; ty++) for (let tx = 0; tx < W / 8; tx++) {
    const idx = ((tx >> 5) + (ty >> 5) * blocksX) * 1024 + (ty & 31) * 32 + (tx & 31);
    const e = scr.data.readUInt16LE(idx * 2);
    const t = e & 1023, hf = e >> 10 & 1, vf = e >> 11 & 1, pn = e >> 12;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const sx = hf ? 7 - x : x, sy = vf ? 7 - y : y;
      let ci;
      if (tiles.bpp === 8) ci = tiles.data[t * 64 + sy * 8 + sx];
      else { const v = tiles.data[t * 32 + sy * 4 + (sx >> 1)]; ci = (sx & 1 ? v >> 4 : v & 15) + pn * 16; }
      const c = pal[ci] || [0, 0, 0];
      const o = ((ty * 8 + y) * W + tx * 8 + x) * 4;
      rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2]; rgba[o + 3] = 255;
    }
  }
  return { w: W, h: H, rgba };
}

// ---------------------------------------------------------------- PNG
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf) { let c = ~0; for (const x of buf) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function encodePng({ w, h, rgba }) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// JASC-PAL (Textformat aus pret) zu [[r, g, b], ...]
export function parseJascPal(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines[0] !== 'JASC-PAL') return null;
  return lines.slice(3, 3 + Number(lines[2])).map((l) => l.split(/\s+/).map(Number));
}

// Indizierte PNG mit anderer Palette (z. B. Kampfboden am Abend): PLTE-Block ersetzen
export function swapPngPalette(png, colors) {
  const parts = [SIG];
  for (let p = 8; p < png.length;) {
    const len = png.readUInt32BE(p); const type = png.toString('latin1', p + 4, p + 8);
    if (type === 'PLTE') {
      const old = png.subarray(p + 8, p + 8 + len);
      const data = Buffer.from(old);
      colors.slice(0, len / 3).forEach((c, i) => { data[i * 3] = c[0]; data[i * 3 + 1] = c[1]; data[i * 3 + 2] = c[2]; });
      parts.push(chunk('PLTE', data));
    } else parts.push(png.subarray(p, p + 12 + len));
    p += 12 + len;
  }
  return Buffer.concat(parts);
}

// Indizierte PNG (Farbtyp 3, 4 oder 8 Bit) lesen: { w, h, idx: Uint8Array, pal: [[r, g, b], ...] }
export function decodeIndexedPng(png) {
  let w = 0, h = 0, depth = 8, type = 0; const idat = []; let pal = [];
  for (let p = 8; p < png.length;) {
    const len = png.readUInt32BE(p); const t = png.toString('latin1', p + 4, p + 8); const d = png.subarray(p + 8, p + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; type = d[9]; }
    else if (t === 'PLTE') for (let i = 0; i < len; i += 3) pal.push([d[i], d[i + 1], d[i + 2]]);
    else if (t === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  if (type !== 3 || (depth !== 4 && depth !== 8)) throw new Error('nur indizierte PNG mit 4 oder 8 Bit');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = Math.ceil(w * depth / 8);
  const rows = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]; const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = rows.subarray(y * stride, (y + 1) * stride); const prev = y ? rows.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i ? cur[i - 1] : 0, b = prev ? prev[i] : 0, c = prev && i ? prev[i - 1] : 0;
      let v = src[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
  }
  const idx = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = rows[y * stride + (depth === 8 ? x : x >> 1)];
    idx[y * w + x] = depth === 8 ? v : (x & 1 ? v & 15 : v >> 4);
  }
  return { w, h, idx, pal };
}

// Kacheln aus einem indizierten Bild (8x8, zeilenweise) als 4-Bit-Kachelsatz wie readTiles
export function tilesFromIndexedPng(img) {
  const perRow = img.w / 8; const count = perRow * (img.h / 8);
  const data = Buffer.alloc(count * 32);
  for (let t = 0; t < count; t++) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x += 2) {
    const px = (t % perRow) * 8 + x, py = Math.floor(t / perRow) * 8 + y;
    data[t * 32 + y * 4 + (x >> 1)] = (img.idx[py * img.w + px] & 15) | (img.idx[py * img.w + px + 1] & 15) << 4;
  }
  return { bpp: 4, data };
}
