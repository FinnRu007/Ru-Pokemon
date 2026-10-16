// TEX0 decoder -> { name: {w,h,data:Uint8Array RGBA} }
const rgb555 = (c) => [((c & 31) * 255 / 31) | 0, (((c >> 5) & 31) * 255 / 31) | 0, (((c >> 10) & 31) * 255 / 31) | 0];
function readDict(v, off) {
  const cnt = v.getUint8(off + 1);
  let p = off + 4 + 8 + 4 * cnt;
  const unit = v.getUint16(p, true); p += 4;
  const entries = []; for (let i = 0; i < cnt; i++) entries.push(p + i * unit);
  p += unit * cnt;
  const names = [];
  for (let i = 0; i < cnt; i++) { let s = ''; for (let k = 0; k < 16; k++) { const c = v.getUint8(p + i * 16 + k); if (!c) break; s += String.fromCharCode(c); } names.push(s); }
  return names.map((n, i) => [n, entries[i]]);
}
export { readDict };
export function findBlock(bytes, tag) {
  const t = [...tag].map((c) => c.charCodeAt(0));
  for (let i = 0; i < bytes.length - 4; i++) if (bytes[i] === t[0] && bytes[i + 1] === t[1] && bytes[i + 2] === t[2] && bytes[i + 3] === t[3]) return i;
  return -1;
}
export function parseTex0(bytes) {
  const t = findBlock(bytes, 'TEX0'); if (t < 0) return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset + t);
  const texInfo = v.getUint16(0x0e, true); const texData = v.getUint32(0x14, true);
  const cData = v.getUint32(0x24, true); const cInfo = v.getUint32(0x28, true);
  const palInfo = v.getUint32(0x34, true); const palData = v.getUint32(0x38, true);
  const texs = readDict(v, texInfo).map(([n, e]) => ({ name: n, off: v.getUint16(e, true) << 3, params: v.getUint16(e + 2, true) }));
  const pals = readDict(v, palInfo).map(([n, e]) => ({ name: n, off: v.getUint16(e, true) << 3 }));
  return { v, texData, cData, cInfo, palData, texs, pals };
}
export function decodeTex(T, tex, palName) {
  const { v, texData, cData, cInfo, palData } = T;
  const params = tex.params, off = tex.off;
  const w = 8 << ((params >> 4) & 7); const h = 8 << ((params >> 7) & 7);
  const fmt = (params >> 10) & 7; const tr0 = (params >> 13) & 1;
  const p = T.pals.find((q) => q.name === palName);
  const pOff = palData + (p ? p.off : 0);
  const pal = (i) => (pOff + 2 * i + 2 <= v.byteLength ? rgb555(v.getUint16(pOff + 2 * i, true)) : [255, 0, 255]);
  const d = new Uint8Array(w * h * 4);
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
  }
  return { w, h, fmt, data: d };
}
