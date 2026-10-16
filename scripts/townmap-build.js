// Setzt die Karte von Sinnoh aus den Originaldateien von pret/pokeplatinum zusammen (Kacheln,
// Palette und Tilemaps des oberen Bildschirms der Karten-App) und schreibt fertige PNG-Bilder nach
// client/sprites/townmap/. Ohne Abhaengigkeiten: PNG lesen und schreiben ueber node:zlib.
// Aufruf: node scripts/townmap-build.js   (wird auch von scripts/fetch-sprites.js aufgerufen)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TOWNMAP_DIR = path.join(ROOT, 'client', 'sprites', 'townmap');
const RES = 'https://raw.githubusercontent.com/pret/pokeplatinum/main/res';
// Quelldateien (werden nach client/sprites/townmap/src/ geladen)
export const TOWNMAP_SOURCES = {
  'top_screen_map_tiles.png': `${RES}/graphics/town_map/top_screen_map_tiles.png`,
  'top_screen_map.pal': `${RES}/graphics/town_map/top_screen_map.pal`,
  'top_screen_region_map_tilemap.NSCR': `${RES}/graphics/town_map/top_screen_region_map_tilemap.NSCR`,
  'top_screen_region_bg_tilemap.NSCR': `${RES}/graphics/town_map/top_screen_region_bg_tilemap.NSCR`,
  'hidden_locations_top_screen.NSCR': `${RES}/graphics/town_map/hidden_locations_top_screen.NSCR`,
  'player_icons.png': `${RES}/graphics/town_map/player_icons.png`,
  'player_male.pal': `${RES}/graphics/town_map/player_male.pal`,
  'cursor.png': `${RES}/graphics/town_map/cursor.png`,
  'cursor_player_female.pal': `${RES}/graphics/town_map/cursor_player_female.pal`,
  'fly_destination_blocks.png': `${RES}/graphics/town_map/fly_destination_blocks.png`,
  'town_map_data.json': `${RES}/town_map/town_map_data.json`
};

// ------------------------------------------------------------------ PNG
function readPng(buf) {
  let p = 8; let ihdr = null; let plte = null; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const type = buf.toString('latin1', p + 4, p + 8); const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], color: data[9], interlace: data[12] };
    else if (type === 'PLTE') plte = [...Array(len / 3)].map((_, i) => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]]);
    else if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const { w, h, depth, color } = ihdr;
  if (ihdr.interlace || ![0, 3].includes(color)) throw new Error('PNG-Format nicht unterstuetzt');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = Math.ceil((w * depth) / 8); const bpp = Math.max(1, depth / 8);
  const out = new Uint8Array(w * h); let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]; const line = Uint8Array.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0; const b = prev[i]; const c = i >= bpp ? prev[i - bpp] : 0;
      if (f === 1) line[i] += a;
      else if (f === 2) line[i] += b;
      else if (f === 3) line[i] += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); line[i] += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
    }
    for (let x = 0; x < w; x++) {
      out[y * w + x] = depth === 8 ? line[x] : depth === 4 ? (line[x >> 1] >> (x & 1 ? 0 : 4)) & 15 : (line[(x * depth) >> 3] >> (8 - depth - ((x * depth) & 7))) & ((1 << depth) - 1);
    }
    prev = line;
  }
  // Graustufen-Bilder von pret speichern den Farbindex umgekehrt (Weiss = Index 0)
  if (color === 0) for (let i = 0; i < out.length; i++) out[i] = (1 << depth) - 1 - out[i];
  return { w, h, px: out, plte };
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf) { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])));
  return Buffer.concat([head, data, crc]);
}
export function writePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// JASC-PAL: Liste von [r, g, b]
function readPal(text) { return text.trim().split(/\r?\n/).slice(3).map((l) => l.trim().split(/\s+/).map(Number)); }
// NSCR: Breite, Hoehe (Pixel) und 16-Bit-Eintraege (Kachel, Spiegelung, Palette)
function readNscr(buf) {
  const scrn = buf.indexOf('NRCS', 0, 'latin1');
  const w = buf.readUInt16LE(scrn + 8); const h = buf.readUInt16LE(scrn + 10); const size = buf.readUInt32LE(scrn + 16);
  const cells = []; for (let i = 0; i < size / 2; i++) cells.push(buf.readUInt16LE(scrn + 20 + i * 2));
  return { tw: w / 8, th: h / 8, cells };
}

// Eine Kachel (8x8, 4 bpp) in ein RGBA-Bild malen; Farbe 0 ist durchsichtig
function blitTile(dst, dw, tiles, pal, entry, dx, dy) {
  const t = entry & 0x3ff; const hf = entry & 0x400; const vf = entry & 0x800; const p = entry >> 12;
  const perRow = tiles.w / 8; const tx = (t % perRow) * 8; const ty = Math.floor(t / perRow) * 8;
  if (ty >= tiles.h) return;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const sx = hf ? 7 - x : x; const sy = vf ? 7 - y : y;
    const v = tiles.px[(ty + sy) * tiles.w + tx + sx] & 15;
    if (!v) continue;
    const c = pal[p * 16 + v] || [255, 0, 255]; const i = ((dy + y) * dw + dx + x) * 4;
    dst[i] = c[0]; dst[i + 1] = c[1]; dst[i + 2] = c[2]; dst[i + 3] = 255;
  }
}

// Rechteck aus einer Tilemap in eine andere kopieren (wie Bg_CopyToTilemapRect)
function copyRect(dst, src, r) {
  for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) {
    const v = src.cells[(r.srcY + y) * src.tw + r.srcX + x];
    if (v !== undefined) dst.cells[(r.destY + y) * dst.tw + r.destX + x] = v;
  }
}
// Versteckte Orte (graphics.c, ShowHiddenLocation): Rechteck fuer Hintergrund und Karte
export const HIDDEN_RECTS = {
  fullmoon_island: { bg: { srcX: 5, srcY: 0, destX: 3, destY: 1, width: 2, height: 3 }, map: { srcX: 5, srcY: 3, destX: 3, destY: 2, width: 2, height: 2 } },
  newmoon_island: { bg: { srcX: 0, srcY: 0, destX: 6, destY: 1, width: 2, height: 3 }, map: { srcX: 0, srcY: 3, destX: 6, destY: 2, width: 2, height: 2 } },
  spring_path: { bg: null, map: { srcX: 4, srcY: 5, destX: 22, destY: 13, width: 3, height: 3 } },
  seabreak_path: { bg: { srcX: 2, srcY: 0, destX: 26, destY: 0, width: 3, height: 3 }, map: { srcX: 2, srcY: 3, destX: 27, destY: 0, width: 2, height: 9 } }
};

function compose(tiles, pal, bg, map) {
  const W = bg.tw * 8, H = bg.th * 8; const img = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) img.set([...pal[0], 255], i * 4); // Hintergrundfarbe
  for (const layer of [bg, map]) {
    for (let ty = 0; ty < H / 8; ty++) for (let tx = 0; tx < W / 8; tx++) blitTile(img, W, tiles, pal, layer.cells[ty * layer.tw + tx], tx * 8, ty * 8);
  }
  return { W, H, img };
}

// 16x16-Sprites aus einer Grafik mit 2 Kacheln Breite (1D-Anordnung) holen
function sprite(src, pal, index, palOffset = 0) {
  const out = new Uint8Array(16 * 16 * 4);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const v = src.px[(index * 16 + y) * src.w + x] & 15; if (!v) continue;
    const c = pal[palOffset + v]; out.set([c[0], c[1], c[2], 255], (y * 16 + x) * 4);
  }
  return out;
}
function sheet(sprites, cols) {
  const rows = Math.ceil(sprites.length / cols); const W = cols * 16, H = rows * 16; const img = new Uint8Array(W * H * 4);
  sprites.forEach((s, k) => { if (!s) return; const ox = (k % cols) * 16, oy = Math.floor(k / cols) * 16; for (let y = 0; y < 16; y++) img.set(s.subarray(y * 64, y * 64 + 64), ((oy + y) * W + ox) * 4); });
  return { W, H, img };
}

export function buildTownMap(srcDir = path.join(TOWNMAP_DIR, 'src'), outDir = TOWNMAP_DIR) {
  const f = (n) => path.join(srcDir, n);
  if (!Object.keys(TOWNMAP_SOURCES).every((n) => fs.existsSync(f(n)))) return false;
  const tiles = readPng(fs.readFileSync(f('top_screen_map_tiles.png')));
  const pal = readPal(fs.readFileSync(f('top_screen_map.pal'), 'utf8'));
  const map = readNscr(fs.readFileSync(f('top_screen_region_map_tilemap.NSCR')));
  const bg = readNscr(fs.readFileSync(f('top_screen_region_bg_tilemap.NSCR')));
  const hidden = readNscr(fs.readFileSync(f('hidden_locations_top_screen.NSCR')));
  fs.mkdirSync(outDir, { recursive: true });
  const save = (name, o) => fs.writeFileSync(path.join(outDir, name), writePng(o.W, o.H, o.img));
  save('map.png', compose(tiles, pal, bg, map));
  // Alle versteckten Orte eingeblendet; der Client kopiert daraus nur die schon besuchten
  const map2 = { ...map, cells: [...map.cells] }; const bg2 = { ...bg, cells: [...bg.cells] };
  for (const r of Object.values(HIDDEN_RECTS)) { copyRect(map2, hidden, r.map); if (r.bg) copyRect(bg2, hidden, r.bg); }
  save('map_hidden.png', compose(tiles, pal, bg2, map2));
  // Spielerkopf (Junge mit Palette 1, Maedchen mit Palette 0) und Cursor (zwei Bilder)
  const icons = readPng(fs.readFileSync(f('player_icons.png')));
  const male = readPal(fs.readFileSync(f('player_male.pal'), 'utf8'));
  const female = readPal(fs.readFileSync(f('cursor_player_female.pal'), 'utf8'));
  const cursor = readPng(fs.readFileSync(f('cursor.png')));
  save('icons.png', sheet([sprite(icons, male, 0), sprite(icons, female, 1), sprite(cursor, female, 0), sprite(cursor, female, 1)], 4));
  // Markierungen der Flugziele: 7 Formen (Spalten) x 5 Paletten (Zeilen)
  const fly = readPng(fs.readFileSync(f('fly_destination_blocks.png')));
  const list = [];
  for (let p = 0; p < 5; p++) for (let s = 0; s < 7; s++) list.push(sprite(fly, fly.plte, s, p * 16));
  save('fly.png', sheet(list, 7));
  // Felder der Karte mit Gebiet, Sehenswuerdigkeit und versteckten Orten
  const data = JSON.parse(fs.readFileSync(f('town_map_data.json'), 'utf8'));
  const blocks = data.blocks.map((b) => ({ x: b.x, z: b.z, area: b.area, landmark: b.landmark || undefined, hidden: b.hidden_location ? b.hidden_location.replace('HIDDEN_LOCATION_', '').toLowerCase() : undefined }));
  // Pixelrechteck je verstecktem Ort (Vereinigung der Rechtecke beider Ebenen)
  const hiddenPx = Object.fromEntries(Object.entries(HIDDEN_RECTS).map(([k, r]) => {
    const rs = [r.map, r.bg].filter(Boolean);
    const x0 = Math.min(...rs.map((q) => q.destX)), y0 = Math.min(...rs.map((q) => q.destY));
    const x1 = Math.max(...rs.map((q) => q.destX + q.width)), y1 = Math.max(...rs.map((q) => q.destY + q.height));
    return [k, [x0 * 8, y0 * 8, (x1 - x0) * 8, (y1 - y0) * 8]];
  }));
  fs.writeFileSync(path.join(outDir, 'townmap.json'), JSON.stringify({ size: [bg.tw * 8, bg.th * 8], hidden: hiddenPx, blocks }));
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(buildTownMap() ? `Karte erstellt: ${path.relative(ROOT, TOWNMAP_DIR)}` : 'Quelldateien fehlen, bitte zuerst npm run sprites');
}
