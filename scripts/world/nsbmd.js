// NSBMD (Nitro model) parser: liefert Dreiecke mit Textur-Koordinaten und Materialien.
import { readDict, parseTex0, decodeTex } from './tex0.js';

const fx32 = (v, o) => v.getInt32(o, true) / 4096;
const fx16 = (v, o) => v.getInt16(o, true) / 4096;

// 4x3 matrices as arrays of 12 (column major like NDS: m[0..2] row0?) -> use 4x4 row-major [16]
const ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a, b) { // a*b, row-major 4x4, vectors as columns
  const r = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[i * 4 + k] * b[k * 4 + j]; r[i * 4 + j] = s; }
  return r;
}
const apply = (m, [x, y, z]) => [m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]];
export { mul, apply, ident };

function pivotMatrix(sel, neg, a, b) {
  // apicula: pivot rotation
  const m = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const o = neg & 1 ? -1 : 1, c = neg & 2 ? -b : b, d = neg & 4 ? -a : a;
  const idx = [[4, 5, 7, 8], [3, 5, 6, 8], [3, 4, 6, 7], [1, 2, 7, 8], [0, 2, 6, 8], [0, 1, 6, 7], [1, 2, 4, 5], [0, 2, 3, 5], [0, 1, 3, 4]][sel];
  m[sel] = o;
  m[idx[0]] = a; m[idx[1]] = b; m[idx[2]] = c; m[idx[3]] = d;
  return m;
}

function readNode(v, o) {
  const flag = v.getUint16(o, true); const m0 = fx16(v, o + 2); let p = o + 4;
  let t = [0, 0, 0], r = null, s = [1, 1, 1];
  if (!(flag & 1)) { t = [fx32(v, p), fx32(v, p + 4), fx32(v, p + 8)]; p += 12; }
  if (!(flag & 2)) {
    if (flag & 8) { const a = fx16(v, p), b = fx16(v, p + 2); p += 4; r = pivotMatrix((flag >> 4) & 15, (flag >> 8) & 15, a, b); }
    else { const q = []; for (let i = 0; i < 8; i++) q.push(fx16(v, p + 2 * i)); p += 16; r = [m0, ...q]; }
  }
  if (!(flag & 4)) { s = [fx32(v, p), fx32(v, p + 4), fx32(v, p + 8)]; p += 24; }
  // NDS matrices are row vectors (v*M). r given as m[row][col] for v*M. Convert to column-vector form: transpose.
  const R = r || [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const M = [
    R[0] * s[0], R[3] * s[1], R[6] * s[2], t[0],
    R[1] * s[0], R[4] * s[1], R[7] * s[2], t[1],
    R[2] * s[0], R[5] * s[1], R[8] * s[2], t[2],
    0, 0, 0, 1];
  return M;
}

function readMaterial(v, o, name) {
  const size = v.getUint16(o + 2, true);
  const diffAmb = v.getUint32(o + 4, true); const polyAttr = v.getUint32(o + 12, true);
  const texImage = v.getUint32(o + 20, true);
  const flag = v.getUint16(o + 30, true);
  const origW = v.getUint16(o + 32, true), origH = v.getUint16(o + 34, true);
  let p = o + 44; let sS = 1, sT = 1, tS = 0, tT = 0;
  if (flag & 1) { // texmtx used
    if (!(flag & 2)) { sS = fx32(v, p); sT = fx32(v, p + 4); p += 8; }
    if (!(flag & 4)) { p += 4; }
    if (!(flag & 8)) { tS = fx32(v, p); tT = fx32(v, p + 4); p += 8; }
  }
  const alpha = (polyAttr >> 16) & 31;
  const diffuse = [diffAmb & 31, (diffAmb >> 5) & 31, (diffAmb >> 10) & 31].map((c) => c * 255 / 31);
  return { name, size, polyAttr, alpha, texImage, flag, origW, origH, sS, sT, tS, tT, diffuse, useVtxColor: !!(diffAmb & 0x8000),
    repS: !!(texImage & (1 << 16)), repT: !!(texImage & (1 << 17)), flipS: !!(texImage & (1 << 18)), flipT: !!(texImage & (1 << 19)),
    cull: (polyAttr >> 6) & 3 };
}

const GX_SIZES = { 0x00: 0, 0x10: 1, 0x11: 0, 0x12: 1, 0x13: 1, 0x14: 1, 0x15: 0, 0x16: 16, 0x17: 12, 0x18: 16, 0x19: 12, 0x1a: 9, 0x1b: 3, 0x1c: 3,
  0x20: 1, 0x21: 1, 0x22: 1, 0x23: 2, 0x24: 1, 0x25: 1, 0x26: 1, 0x27: 1, 0x28: 1, 0x29: 1, 0x2a: 1, 0x2b: 1, 0x30: 1, 0x31: 1, 0x32: 1, 0x33: 1, 0x34: 32,
  0x40: 1, 0x41: 0, 0x50: 1, 0x60: 1, 0x70: 3, 0x71: 2, 0x72: 1 };

// Runs a display list and emits polygons [{v:[[x,y,z],...], uv:[[s,t]...], col:[[r,g,b]...]}]
function runDL(v, start, size, posScale, curMtx, stack, emit) {
  let p = start; const end = start + size;
  let mode = 0, vtx = [0, 0, 0], uv = [0, 0], col = [255, 255, 255], buf = [], mtx = curMtx;
  const pushV = () => {
    buf.push({ p: apply(mtx, vtx.map((c) => c * posScale)), uv: [...uv], col: [...col] });
    const n = buf.length;
    if (mode === 0 && n === 3) { emit(buf); buf = []; }
    else if (mode === 1 && n === 4) { emit([buf[0], buf[1], buf[2]]); emit([buf[0], buf[2], buf[3]]); buf = []; }
    else if (mode === 2 && n >= 3) { const a = buf[n - 3], b = buf[n - 2], c = buf[n - 1]; emit((n % 2) ? [a, b, c] : [b, a, c]); }
    else if (mode === 3 && n >= 4 && n % 2 === 0) { const a = buf[n - 4], b = buf[n - 3], c = buf[n - 2], d = buf[n - 1]; emit([a, b, d]); emit([a, d, c]); }
  };
  while (p < end) {
    const cmds = [v.getUint8(p), v.getUint8(p + 1), v.getUint8(p + 2), v.getUint8(p + 3)]; p += 4;
    for (const c of cmds) {
      const n = GX_SIZES[c] ?? 0;
      const prm = (i) => v.getUint32(p + 4 * i, true);
      switch (c) {
        case 0x14: { const m = stack[prm(0) & 31]; if (m) mtx = m; break; }
        case 0x1b: { mtx = mul(mtx, [fx32(v, p), 0, 0, 0, 0, fx32(v, p + 4), 0, 0, 0, 0, fx32(v, p + 8), 0, 0, 0, 0, 1]); break; }
        case 0x20: { const q = prm(0); col = [q & 31, (q >> 5) & 31, (q >> 10) & 31].map((x) => x * 255 / 31); break; }
        case 0x22: { const q = prm(0); uv = [((q << 16) >> 16) / 16, (q >> 16) / 16]; break; }
        case 0x23: { const a = prm(0), b = prm(1); vtx = [((a << 16) >> 16) / 4096, (a >> 16) / 4096, ((b << 16) >> 16) / 4096]; pushV(); break; }
        case 0x24: { const a = prm(0); vtx = [((a << 22) >> 22) / 64, ((a << 12) >> 22) / 64, ((a << 2) >> 22) / 64]; pushV(); break; }
        case 0x25: { const a = prm(0); vtx = [((a << 16) >> 16) / 4096, (a >> 16) / 4096, vtx[2]]; pushV(); break; }
        case 0x26: { const a = prm(0); vtx = [((a << 16) >> 16) / 4096, vtx[1], (a >> 16) / 4096]; pushV(); break; }
        case 0x27: { const a = prm(0); vtx = [vtx[0], ((a << 16) >> 16) / 4096, (a >> 16) / 4096]; pushV(); break; }
        case 0x28: { const a = prm(0); vtx = [vtx[0] + ((a << 22) >> 22) / 4096 / 8, vtx[1] + ((a << 12) >> 22) / 4096 / 8, vtx[2] + ((a << 2) >> 22) / 4096 / 8]; pushV(); break; }
        case 0x40: mode = prm(0) & 3; buf = []; break;
        case 0x41: buf = []; break;
        default: break;
      }
      p += 4 * n;
    }
  }
}

export function parseNsbmd(bytes) {
  const v0 = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const nb = v0.getUint16(0xe, true);
  let mdl = -1, tex = null;
  for (let i = 0; i < nb; i++) {
    const o = v0.getUint32(0x10 + 4 * i, true);
    const tag = String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
    if (tag === 'MDL0') mdl = o; else if (tag === 'TEX0') tex = parseTex0(bytes.subarray(o));
  }
  const v = new DataView(bytes.buffer, bytes.byteOffset + mdl);
  const models = readDict(v, 8).map(([name, e]) => [name, v.getUint32(e, true)]);
  const [mname, mo] = models[0];
  const M = new DataView(bytes.buffer, bytes.byteOffset + mdl + mo);
  const sbcOff = M.getUint32(4, true), matOff = M.getUint32(8, true), shpOff = M.getUint32(12, true);
  const posScale = fx32(M, 0x14 + 8);
  const nodeInfo = 0x14 + 0x2c;
  const nodes = readDict(M, nodeInfo).map(([n, e]) => ({ name: n, mtx: readNode(M, nodeInfo + M.getUint32(e, true)) }));
  // materials
  const texDictOff = M.getUint16(matOff, true), palDictOff = M.getUint16(matOff + 2, true);
  const mats = readDict(M, matOff + 4).map(([n, e]) => readMaterial(M, matOff + M.getUint32(e, true), n));
  for (const [tn, e] of readDict(M, matOff + texDictOff)) {
    const off = M.getUint16(e, true), cnt = M.getUint8(e + 2);
    for (let i = 0; i < cnt; i++) { const mi = M.getUint8(matOff + off + i); if (mats[mi]) mats[mi].tex = tn; }
  }
  for (const [pn, e] of readDict(M, matOff + palDictOff)) {
    const off = M.getUint16(e, true), cnt = M.getUint8(e + 2);
    for (let i = 0; i < cnt; i++) { const mi = M.getUint8(matOff + off + i); if (mats[mi]) mats[mi].pal = pn; }
  }
  const shapes = readDict(M, shpOff).map(([n, e]) => {
    const so = shpOff + M.getUint32(e, true);
    return { name: n, dlOff: so + M.getUint32(so + 8, true), dlSize: M.getUint32(so + 0xc, true) };
  });
  // SBC ausfuehren
  const tris = [];
  let p = sbcOff; let cur = ident(); const stack = []; let mat = null;
  for (let guard = 0; guard < 100000; guard++) {
    const op = M.getUint8(p); const c = op & 0x1f;
    if (c === 0x01) break;
    if (c === 0x00) { p++; continue; }
    if (c === 0x02) { p += 3; continue; }
    if (c === 0x03) { const i = M.getUint8(p + 1); if (stack[i]) cur = stack[i]; p += 2; continue; }
    if (c === 0x04) { mat = mats[M.getUint8(p + 1)]; p += 2; continue; }
    if (c === 0x05) {
      const s = shapes[M.getUint8(p + 1)];
      if (s) runDL(M, s.dlOff, s.dlSize, posScale, cur, stack, (vs) => tris.push({ v: vs.map((q) => q.p), uv: vs.map((q) => q.uv), col: vs.map((q) => q.col), mat }));
      p += 2; continue;
    }
    if (c === 0x06) {
      const node = M.getUint8(p + 1); let q = p + 4;
      let dst = -1, src = -1;
      if (op & 0x20) dst = M.getUint8(q++);
      if (op & 0x40) src = M.getUint8(q++);
      if (src >= 0 && stack[src]) cur = stack[src];
      cur = mul(cur, nodes[node]?.mtx || ident());
      if (dst >= 0) stack[dst] = cur;
      p = q; continue;
    }
    if (c === 0x07 || c === 0x08) { let q = p + 2; if (op & 0x20) q++; if (op & 0x40) q++; p = q; continue; }
    if (c === 0x09) { const n = M.getUint8(p + 2); p += 3 + 3 * n; continue; }
    if (c === 0x0a) { p += 9; continue; }
    if (c === 0x0b) { p += 1; continue; }
    if (c === 0x0c || c === 0x0d) { p += 3; continue; }
    p++;
  }
  return { name: mname, tris, mats, tex, posScale };
}

// Texturen zu Materialien aufloesen (aus Modell-TEX0 oder externer Textursammlung)
export function resolveTextures(model, ...texSets) {
  const cache = new Map();
  for (const m of model.mats) {
    if (!m.tex) continue;
    for (const T of [model.tex, ...texSets]) {
      if (!T) continue;
      const t = T.texs.find((x) => x.name === m.tex);
      if (!t || (t.off === 0 && T.texData === 0)) continue;
      const key = `${m.tex}|${m.pal}`;
      if (!cache.has(key)) cache.set(key, decodeTex(T, t, m.pal));
      m.img = cache.get(key);
      break;
    }
  }
}
