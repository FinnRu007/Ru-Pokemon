// Original-Bodentexturen aus Platin (Kartentexturen im NSBTX-Format aus github.com/pret/pokeplatinum,
// geladen von `npm run sprites` nach client/sprites/field/). Der Browser entpackt sie hier selbst in
// Leinwaende: Gras, Wege, hohes Gras, Blumen, Wasser, Strand, Klippen, Baeume und Zaeune.
// Fehlen die Dateien, bleibt es bei der eigenen Pixelgrafik.
const SETS = { normal: 'map_texture_set_006', snow: 'map_texture_set_014' };
const OBJECTS = ['rock_smash', 'cut_tree', 'strength_boulder', 'bollard'];
const tex = { normal: null, snow: null };
const objects = {};
let readyFlag = false;

const rgb555 = (c) => [((c & 31) * 255 / 31) | 0, (((c >> 5) & 31) * 255 / 31) | 0, (((c >> 10) & 31) * 255 / 31) | 0];

function readDict(v, off) {
  const cnt = v.getUint8(off + 1);
  let p = off + 4 + 8 + 4 * cnt;
  const unit = v.getUint16(p, true); p += 4;
  const entries = [];
  for (let i = 0; i < cnt; i++) entries.push(p + i * unit);
  p += unit * cnt;
  const names = [];
  for (let i = 0; i < cnt; i++) {
    let s = '';
    for (let k = 0; k < 16; k++) { const c = v.getUint8(p + i * 16 + k); if (!c) break; s += String.fromCharCode(c); }
    names.push(s);
  }
  return names.map((n, i) => [n, entries[i]]);
}

// Entpackt alle Texturen einer NSBTX-Datei: { name: canvas }
export function decodeNsbtx(buf) {
  const bytes = new Uint8Array(buf);
  let t = -1;
  for (let i = 0; i < bytes.length - 4; i++) if (bytes[i] === 0x54 && bytes[i + 1] === 0x45 && bytes[i + 2] === 0x58 && bytes[i + 3] === 0x30) { t = i; break; }
  if (t < 0) return {};
  const v = new DataView(buf, t);
  const texInfo = v.getUint16(0x0e, true); const texData = v.getUint32(0x14, true);
  const cData = v.getUint32(0x24, true); const cInfo = v.getUint32(0x28, true);
  const palInfo = v.getUint32(0x34, true); const palData = v.getUint32(0x38, true);
  const texs = readDict(v, texInfo);
  const pals = readDict(v, palInfo).map(([n, e]) => [n, v.getUint16(e, true) << 3]);
  const palMap = new Map(pals);
  const out = {};
  for (const [name, e] of texs) {
    const off = v.getUint16(e, true) << 3; const params = v.getUint16(e + 2, true);
    const w = 8 << ((params >> 4) & 7); const h = 8 << ((params >> 7) & 7);
    const fmt = (params >> 10) & 7; const tr0 = (params >> 13) & 1;
    let pn = [name + '_pl', name + '_p', name].find((c) => palMap.has(c));
    if (!pn && pals.length) {
      const score = (p) => { let l = 0; while (l < Math.min(p.length, name.length) && p[l] === name[l]) l++; if (name.includes(p) || p.includes(name.slice(1)) || name.slice(1).includes(p)) l = Math.max(l, p.length - 0.5); return l; };
      pn = pals.map(([n]) => n).reduce((a, b) => (score(b) > score(a) ? b : a));
    }
    const pOff = palData + (palMap.get(pn) || 0);
    const pal = (i) => (pOff + 2 * i + 2 <= v.byteLength ? rgb555(v.getUint16(pOff + 2 * i, true)) : [255, 0, 255]);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); const img = g.createImageData(w, h); const d = img.data;
    const set = (n, [r, gg, b], a) => { d[n * 4] = r; d[n * 4 + 1] = gg; d[n * 4 + 2] = b; d[n * 4 + 3] = a; };
    if ([1, 2, 3, 4, 6, 7].includes(fmt)) {
      const base = texData + off; const bpp = { 1: 8, 2: 2, 3: 4, 4: 8, 6: 8, 7: 16 }[fmt];
      for (let n = 0; n < w * h; n++) {
        if (bpp === 16) { const val = v.getUint16(base + 2 * n, true); set(n, rgb555(val), val & 0x8000 ? 255 : 0); continue; }
        const bit = n * bpp; const byte = v.getUint8(base + (bit >> 3));
        const val = (byte >> (bit % 8)) & ((1 << bpp) - 1);
        if (fmt === 1) set(n, pal(val & 31), ((val >> 5) * 255 / 7) | 0);
        else if (fmt === 6) set(n, pal(val & 7), ((val >> 3) * 255 / 31) | 0);
        else set(n, pal(val), tr0 && val === 0 ? 0 : 255);
      }
    } else if (fmt === 5) {
      const base = cData + off; const iBase = cInfo + (off >> 1); const bw = w / 4;
      for (let by = 0; by < h / 4; by++) for (let bx = 0; bx < bw; bx++) {
        const bi = by * bw + bx;
        const texel = v.getUint32(base + bi * 4, true); const pi = v.getUint16(iBase + bi * 2, true);
        const pof = (pi & 0x3fff) * 2; const mode = pi >> 14;
        const c4 = [0, 1, 2, 3].map((k) => pal(pof + k));
        const mix = (a, b, x, y) => a.map((q, i) => ((x * q + y * b[i]) / (x + y)) | 0);
        const cols = [[c4[0], 255], [c4[1], 255]];
        if (mode === 0) cols.push([c4[2], 255], [[0, 0, 0], 0]);
        else if (mode === 1) cols.push([mix(c4[0], c4[1], 1, 1), 255], [[0, 0, 0], 0]);
        else if (mode === 2) cols.push([c4[2], 255], [c4[3], 255]);
        else cols.push([mix(c4[0], c4[1], 5, 3), 255], [mix(c4[0], c4[1], 3, 5), 255]);
        for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) {
          const k = (texel >>> (2 * (yy * 4 + xx))) & 3;
          set((by * 4 + yy) * w + bx * 4 + xx, cols[k][0], cols[k][1]);
        }
      }
    } else continue;
    g.putImageData(img, 0, 0);
    out[name] = c;
  }
  return out;
}

function loadImage(src) {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

// Laedt Texturen und Feldobjekte. Liefert true, wenn die Original-Grafik bereitsteht.
export async function loadField(index) {
  if (!index?.field?.length) return false;
  await Promise.all(Object.entries(SETS).map(async ([k, file]) => {
    if (!index.field.includes(file)) return;
    try {
      const r = await fetch(`/sprites/field/${file}.nsbtx`);
      if (r.ok) tex[k] = decodeNsbtx(await r.arrayBuffer());
    } catch { /* eigene Grafik bleibt */ }
  }));
  await Promise.all(OBJECTS.map(async (o) => { if (index.field.includes(o)) objects[o] = await loadImage(`/sprites/field/${o}.png`); }));
  readyFlag = !!tex.normal?.lgreen;
  return readyFlag;
}

export const fieldReady = () => readyFlag;
// Textur nach Name, bei Schnee aus dem Schnee-Satz (falls vorhanden)
export function fieldTex(name, snow = false) { return (snow && tex.snow?.[name]) || tex.normal?.[name] || null; }
export const fieldObject = (name) => objects[name] || null;
