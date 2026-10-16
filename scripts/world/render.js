// Zeichnet Platin-Kartenteile (32x32 Kacheln je Matrixfeld) aus den Originaldaten von pret/pokeplatinum:
// Bodenmodell (NSBMD in map_data_XXX.bin) plus Gebaeude und Gegenstaende (Prop-Modelle) mit der
// Schraegsicht der DS-Kamera (59 Grad). Bildschirm: x = Welt-x, y = Welt-z - 0.6 * Hoehe (1 Kachel = 16 px).
// Zu jedem Bild entsteht eine Tiefenkarte (Kachelreihe je Pixel), damit Figuren hinter Baeumen und
// Gebaeuden verschwinden koennen.
import { parseNsbmd, resolveTextures } from './nsbmd.js';
import { parseTex0 } from './tex0.js';
import { makeCanvas, drawTris } from './raster.js';

export const CY = 0.6;          // Hoehe -> Bildschirm
export const DEPTH_Y = 1.664;   // Hoehe -> Naehe zur Kamera
export const ROW_BIAS = 8;      // Kachelreihen oberhalb des Feldes in der Tiefenkarte

// Liest eine map_data-Datei: Kachelattribute (Kollision + Verhalten), Props, Bodenmodell
export function readLandData(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const [ts, ps, ms] = [0, 4, 8].map((o) => dv.getInt32(o, true));
  const perms = new Uint16Array(1024);
  for (let i = 0; i < 1024 && 16 + 2 * i + 2 <= 16 + ts; i++) perms[i] = dv.getUint16(16 + 2 * i, true);
  const props = [];
  for (let i = 0; i < Math.floor(ps / 48); i++) {
    const o = 16 + ts + i * 48;
    props.push({ id: dv.getInt32(o, true), pos: [1, 2, 3].map((k) => dv.getInt32(o + 4 * k, true) / 4096) });
  }
  const model = ms > 0 ? bytes.subarray(16 + ts + ps, 16 + ts + ps + ms) : null;
  const bs = dv.getInt32(12, true);
  const bdhc = bs > 0 ? bytes.subarray(16 + ts + ps + ms, 16 + ts + ps + ms + bs) : null;
  return { perms, props, model, bdhc };
}

// Dreiecke eines Feldes in Weltkoordinaten (x, z: 0..512 innerhalb des Feldes, y absolut)
// res: { file(path) -> Uint8Array|null, propOrder: [dateiname], texSet(name), propTexSet(name) }
export function cellTris(land, altitude, mapTex, propTex, propModel) {
  const tris = [];
  const dy = altitude * 8;
  if (land.model) {
    const g = parseNsbmd(land.model);
    resolveTextures(g, ...[].concat(mapTex));
    for (const t of g.tris) tris.push({ ...t, v: t.v.map(([x, y, z]) => [x + 256, y + dy, z + 256]), ground: true });
  }
  for (const p of land.props) {
    const m = propModel(p.id);
    if (!m) continue;
    for (const t of m.tris) {
      if (t.mat?.name === 'light' || /_light$|^light/.test(t.mat?.name || '')) continue;
      tris.push({ ...t, v: t.v.map(([x, y, z]) => [p.pos[0] + x + 256, p.pos[1] + y + dy, p.pos[2] + z + 256]) });
    }
  }
  return tris;
}

// Rendert ein Feld. Liefert { w, h, ox, oy, color: RGBA, rows: Uint8Array (Kachelreihe+ROW_BIAS, 0 = leer) }
// ox/oy: Lage der linken oberen Bildecke relativ zur Feldecke in Bildschirmpixeln.
export function renderCell(tris) {
  if (!tris.length) return null;
  let minX = 0, maxX = 512, minY = 0, maxY = 512;
  for (const t of tris) for (const [x, y, z] of t.v) {
    const sy = z - y * CY;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (sy < minY) minY = sy; if (sy > maxY) maxY = sy;
  }
  minX = Math.max(-64, Math.floor(minX)); maxX = Math.min(576, Math.ceil(maxX));
  minY = Math.max(-320, Math.floor(minY)); maxY = Math.min(576, Math.ceil(maxY));
  const w = maxX - minX, h = maxY - minY;
  const cv = makeCanvas(w, h);
  const rows = new Uint8Array(w * h);
  drawTris(cv, tris, ([x, y, z]) => [x - minX, z - y * CY - minY, z + y * DEPTH_Y], {
    onPixel: (i, wz) => { rows[i] = Math.max(1, Math.min(255, Math.floor(wz / 16) + ROW_BIAS + 1)); }
  });
  return { w, h, ox: minX, oy: minY, color: cv.data, rows };
}

// Hoehe des Bodens je Kachel aus den BDHC-Daten (Ebenen mit Ebenengleichung, wie das Spiel sie fuer
// Figuren nutzt). Liegen mehrere Ebenen uebereinander (Bruecken), zaehlt die hoechste.
export function groundHeights(land, altitude) {
  const H = new Float32Array(1024).fill(altitude * 8);
  const b = land.bdhc;
  if (!b || b.length < 16) return H;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const [np, nn, nc, nplates] = [4, 6, 8, 10].map((o) => dv.getUint16(o, true));
  let p = 16;
  const pts = []; for (let i = 0; i < np; i++, p += 8) pts.push([dv.getInt32(p, true) / 4096, dv.getInt32(p + 4, true) / 4096]);
  const nrm = []; for (let i = 0; i < nn; i++, p += 12) nrm.push([dv.getInt32(p, true) / 4096, dv.getInt32(p + 4, true) / 4096, dv.getInt32(p + 8, true) / 4096]);
  const cst = []; for (let i = 0; i < nc; i++, p += 4) cst.push(dv.getInt32(p, true) / 4096);
  const plates = []; for (let i = 0; i < nplates; i++, p += 8) plates.push([0, 2, 4, 6].map((k) => dv.getUint16(p + k, true)));
  const seen = new Uint8Array(1024);
  for (const [a, c, ni, ci] of plates) {
    const A = pts[a], B = pts[c], n = nrm[ni], d = cst[ci];
    if (!A || !B || !n || !n[1]) continue;
    const x0 = Math.min(A[0], B[0]) + 256, x1 = Math.max(A[0], B[0]) + 256, z0 = Math.min(A[1], B[1]) + 256, z1 = Math.max(A[1], B[1]) + 256;
    for (let tz = Math.max(0, Math.floor(z0 / 16)); tz <= Math.min(31, Math.floor(z1 / 16)); tz++) {
      for (let tx = Math.max(0, Math.floor(x0 / 16)); tx <= Math.min(31, Math.floor(x1 / 16)); tx++) {
        const cx = tx * 16 + 8, cz = tz * 16 + 8;
        if (cx < x0 || cx > x1 || cz < z0 || cz > z1) continue;
        const y = -(n[0] * (cx - 256) + n[2] * (cz - 256) + d) / n[1] + altitude * 8;
        const i = tz * 32 + tx;
        if (!seen[i] || y > H[i]) { H[i] = y; seen[i] = 1; }
      }
    }
  }
  return H;
}

export { parseNsbmd, resolveTextures, parseTex0 };
