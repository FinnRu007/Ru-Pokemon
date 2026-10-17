// Original-Oberwelt aus Platin: zeichnet die Kartenteile, die scripts/world/build-world.js aus den
// Originaldaten erzeugt (client/sprites/world, nur lokal). Jedes Matrixfeld (32x32 Kacheln) ist ein Bild
// in der Schraegsicht der DS-Kamera: Bildschirm-y = Welt-z - 0.6 * Hoehe, 16 px je Kachel.
// Zu jedem Bild gibt es eine Tiefenkarte (.rows.png, Rotkanal = Kachelreihe der Flaeche + 9), mit der
// Baeume, Daecher und Haenge Figuren verdecken, die dahinter stehen: Eine Flaeche liegt vor einer
// aufrechten Figur, wenn sie weiter suedlich (naeher an der Kamera) liegt.
import { MAPS } from '/shared/data/maps.js';

const S = 3;
const CY = 0.6, DEPTH_Y = 1.664, ROW_BIAS = 8;

let INDEX = null;
fetch('/sprites/world/index.json').then((r) => (r.ok ? r.json() : null)).then((j) => { INDEX = j; }).catch(() => {});
const cache = new Map();

function cell(m, name) {
  const key = m + '/' + name;
  let c = cache.get(key);
  if (c) return c;
  c = { img: null, rowsImg: null, color: null, rows: null };
  const img = new Image(); img.onload = () => { c.img = img; }; img.src = `/sprites/world/${m}/${name}.png`;
  const r = new Image(); r.onload = () => { c.rowsImg = r; }; r.src = `/sprites/world/${m}/${name}.rows.png`;
  cache.set(key, c);
  return c;
}

// Pixeldaten eines Kartenteils (erst bei Bedarf, fuer Verdeckung)
function pixels(c) {
  if (c.color) return c;
  if (!c.img || !c.rowsImg) return null;
  const w = c.img.width, h = c.img.height;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(c.img, 0, 0); c.color = g.getImageData(0, 0, w, h).data;
  g.clearRect(0, 0, w, h); g.drawImage(c.rowsImg, 0, 0);
  const d = g.getImageData(0, 0, w, h).data; c.rows = new Uint8Array(w * h);
  for (let i = 0; i < c.rows.length; i++) c.rows[i] = d[i * 4 + 3] ? d[i * 4] : 0;
  return c;
}

// Schilder und Briefkaesten (eigene Bilder in client/sprites/world/objects, Lage in index.json)
const objImgs = new Map();
export function fieldModel(g) {
  const info = INDEX?.objects?.[g];
  if (!info) return null;
  let o = objImgs.get(g);
  if (!o) {
    o = { info, img: null };
    const img = new Image(); img.onload = () => { o.img = img; }; img.src = `/sprites/world/objects/${g}.png`;
    objImgs.set(g, o);
  }
  return o.img ? o : null;
}

export function origReady(map) { return !!(INDEX && map?.orig && INDEX.matrices[map.orig.m]); }
export function matrixOf(map) { return INDEX?.matrices[map.orig.m]; }

// Karte an einer globalen Kachel (Hauptmatrix: ueber die Besitzertabelle, sonst nur die Karte selbst)
export function mapAtGlobal(map, gx, gz) {
  const lx = gx - map.orig.x, lz = gz - map.orig.z;
  if (lx >= 0 && lz >= 0 && lx < map.width && lz < map.height) return map;
  if (map.orig.m !== 0 || gx < 0 || gz < 0) return null;
  const id = MAPS._owner?.[gz >> 5]?.[gx >> 5];
  const m = id && MAPS[id];
  return m?.orig ? m : null;
}
function heightAt(map, gx, gz) {
  const m = mapAtGlobal(map, gx, gz);
  if (!m) return 0;
  return m.orig.heights[(gz - m.orig.z) * m.width + (gx - m.orig.x)] || 0;
}
export function tileAt(map, gx, gz) {
  const m = mapAtGlobal(map, gx, gz);
  return m ? m.tiles[gz - m.orig.z]?.[gx - m.orig.x] : ' ';
}
// Bodenhoehe an einer Kommaposition (Schritte laufen immer entlang einer Achse)
export function heightF(map, gx, gz) {
  const x0 = Math.floor(gx), z0 = Math.floor(gz), fx = gx - x0, fz = gz - z0;
  const a = heightAt(map, x0, z0);
  const b = fx ? heightAt(map, x0 + 1, z0) : a;
  const c = fz ? heightAt(map, x0, z0 + 1) : a;
  return a + (b - a) * fx + (c - a) * fz;
}

// Alle Kartenteile einer Matrix, die im Bild liegen. O = Bildschirmlage von Matrixpixel (0, 0), k = Massstab.
function* visibleCells(M, Ox, Oy, k, W, H) {
  const cx0 = Math.max(0, Math.floor((-Ox / k - 64) / 512)), cx1 = Math.min(M.w - 1, Math.floor(((W - Ox) / k + 64) / 512));
  const cy0 = Math.max(0, Math.floor((-Oy / k - 64) / 512)), cy1 = Math.min(M.h - 1, Math.floor(((H - Oy) / k + 320) / 512));
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    const name = M.cells[cy]?.[cx];
    if (name) yield { cx, cy, name, f: M.files[name] };
  }
}

export function drawCells(g, m, Ox, Oy, k, W, H) {
  const M = INDEX?.matrices[m];
  if (!M) return;
  g.imageSmoothingEnabled = false;
  for (const { cx, cy, name, f } of visibleCells(M, Ox, Oy, k, W, H)) {
    const c = cell(m, name);
    if (!c.img) continue;
    const x = Ox + (cx * 512 + f.ox) * k, y = Oy + (cy * 512 + f.oy) * k;
    if (x > W || y > H || x + f.w * k < 0 || y + f.h * k < 0) continue;
    g.drawImage(c.img, Math.round(x), Math.round(y), Math.round(f.w * k), Math.round(f.h * k));
  }
}

// Malt die Teile der Karte, die vor einer Figur liegen, erneut ueber sie.
// r = Rechteck der Figur in Weltpixeln (Bildschirmlage bei Massstab 1), row = globale Kachelreihe der Figur.
const patch = document.createElement('canvas');
const pg = patch.getContext('2d');
export function occlude(g, m, Ox, Oy, r, row) {
  const M = INDEX?.matrices[m];
  if (!M) return;
  const x0 = Math.floor(r.x), y0 = Math.floor(r.y), w = Math.ceil(r.x + r.w) - x0, h = Math.ceil(r.y + r.h) - y0;
  if (w <= 0 || h <= 0) return;
  if (patch.width < w || patch.height < h) { patch.width = Math.max(patch.width, w); patch.height = Math.max(patch.height, h); }
  const out = pg.createImageData(w, h); const o = out.data;
  let any = false;
  const cx0 = Math.max(0, Math.floor((x0 - 64) / 512)), cx1 = Math.min(M.w - 1, Math.floor((x0 + w + 64) / 512));
  const cy0 = Math.max(0, Math.floor((y0 - 64) / 512)), cy1 = Math.min(M.h - 1, Math.floor((y0 + h + 320) / 512));
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    const name = M.cells[cy]?.[cx];
    if (!name) continue;
    const f = M.files[name];
    const c = pixels(cell(m, name));
    if (!c) continue;
    const bx = cx * 512 + f.ox, by = cy * 512 + f.oy, base = cy * 32 - ROW_BIAS - 1;
    for (let y = 0; y < h; y++) {
      const iy = y0 + y - by;
      if (iy < 0 || iy >= f.h) continue;
      for (let x = 0; x < w; x++) {
        const ix = x0 + x - bx;
        if (ix < 0 || ix >= f.w) continue;
        const i = iy * f.w + ix, R = c.rows[i];
        if (!R) continue;
        const j = (y * w + x) * 4;
        if (base + R > row) { o[j] = c.color[i * 4]; o[j + 1] = c.color[i * 4 + 1]; o[j + 2] = c.color[i * 4 + 2]; o[j + 3] = 255; any = true; }
        else o[j + 3] = 0;
      }
    }
  }
  if (!any) return;
  pg.clearRect(0, 0, w, h);
  pg.putImageData(out, 0, 0);
  g.imageSmoothingEnabled = false;
  g.drawImage(patch, 0, 0, w, h, Ox + x0 * S, Oy + y0 * S, w * S, h * S);
}

// Untere Haelfte einer Kachel (hohes Gras) ueber die Fuesse legen
export function drawTileBottom(g, m, Ox, Oy, gx, gz, hgt) {
  const M = INDEX?.matrices[m];
  const cx = gx >> 5, cy = gz >> 5;
  const name = M?.cells[cy]?.[cx];
  if (!name) return;
  const f = M.files[name]; const c = cell(m, name);
  if (!c.img) return;
  const wx = gx * 16, wy = Math.round(gz * 16 - CY * hgt) + 8;
  g.drawImage(c.img, wx - (cx * 512 + f.ox), wy - (cy * 512 + f.oy), 16, 8, Ox + wx * S, Oy + wy * S, 16 * S, 8 * S);
}

export { CY, DEPTH_Y };
