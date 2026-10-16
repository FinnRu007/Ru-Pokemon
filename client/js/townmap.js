// Karte von Sinnoh wie in der Karten-App von Platin. Die Bilder setzt scripts/townmap-build.js aus den
// Originaldateien zusammen (client/sprites/townmap/, nicht im Repo). Fehlen sie, bleibt TM.ready false
// und worldmap.js zeichnet die eigene Karte.
import { MAPS } from '/shared/data/maps.js';
import { PLACES, FLY_SPOTS, areaName } from './townmapData.js';

const BASE = '/sprites/townmap/';
// Sichtbarer Teil des oberen Bildschirms (ohne die Namensleiste unten)
const CROP = { x: 16, y: 0, w: 224, h: 168 };
// Raster der Karten-App (TOWN_MAP_GRID_X/Y in defs.h): Feld (x, z) hat seine Mitte bei 7x+25 / 7z-34,
// eine 16x16-Figur beginnt 8 Pixel davor. Ein Feld ist 7 Pixel gross, also beginnt es bei 7x+21 / 7z-38.
const G = 7, GX = 21, GY = -38;
const FRAME = '#6283d5';
const BAR = { line: '#6a5a00', fill: '#eeb431', text: '#3a3000' };

export const TM = { ready: false, data: null, img: {}, version: 0 };

function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
(async () => {
  try {
    const r = await fetch(BASE + 'townmap.json', { cache: 'no-cache' });
    if (!r.ok) return;
    const data = await r.json();
    const [map, hidden, icons, fly] = await Promise.all(['map', 'map_hidden', 'icons', 'fly'].map((n) => loadImage(`${BASE}${n}.png`)));
    Object.assign(TM, { data, img: { map, hidden, icons, fly }, ready: true });
  } catch { /* ohne Originaldateien bleibt die eigene Karte */ }
})();

// ------------------------------------------------------------------ Lage auf der Karte
const box = (id) => { const p = PLACES[id]; return p && { x0: p[1], z0: p[2], x1: p[3] ?? p[1], z1: p[4] ?? p[2] }; };

// Globale Kachel (Hauptmatrix, 32 Kacheln je Feld) einer Position. Umgebaute Aussenkarten haben orig.
export function globalTile(mapId, x, y, depth = 0) {
  const m = MAPS[mapId]; if (!m) return null;
  if (m.orig?.m === 0) return { gx: m.orig.x + x + 0.5, gz: m.orig.z + y + 0.5, inside: false };
  const b = box(mapId);
  if (b && !m.indoor) {
    // Ohne Originalmasse: Position anteilig auf die Felder des Headers verteilen
    return { gx: (b.x0 + ((x + 0.5) / m.width) * (b.x1 - b.x0 + 1)) * 32, gz: (b.z0 + ((y + 0.5) / m.height) * (b.z1 - b.z0 + 1)) * 32 };
  }
  if (b) return { gx: ((b.x0 + b.x1 + 1) / 2) * 32, gz: ((b.z0 + b.z1 + 1) / 2) * 32, inside: true };
  if (depth > 0) return null;
  // Innenraum ohne eigenes Feld: auf die Tuer der Aussenkarte legen (Breitensuche ueber Warps)
  const seen = new Set([mapId]); let q = [mapId];
  for (let d = 0; d < 6 && q.length; d++) {
    const next = [];
    for (const id of q) {
      const outs = MAPS[id].warps.map((w) => w.to);
      const ins = Object.keys(MAPS).filter((o) => MAPS[o].warps.some((w) => w.to === id));
      for (const n of [...outs, ...ins]) {
        if (seen.has(n) || !MAPS[n]) continue;
        seen.add(n); next.push(n);
        const door = MAPS[n].warps.find((w) => w.to === id);
        if (!MAPS[n].indoor && door) { const g = globalTile(n, door.x, door.y, 1); if (g) return { ...g, inside: true }; }
        if (MAPS[n].indoor && PLACES[n]) { const g = globalTile(n, 0, 0, 1); if (g) return { ...g, inside: true }; }
      }
    }
    q = next;
  }
  return null;
}
const CACHE = new Map();
function indoorTile(mapId) { if (!CACHE.has(mapId)) CACHE.set(mapId, globalTile(mapId, 0, 0)); return CACHE.get(mapId); }
// Bildpunkt auf der Karte (Koordinaten des oberen Bildschirms)
export function mapPixel(mapId, x, y) {
  const m = MAPS[mapId]; if (!m) return null;
  const g = m.indoor ? indoorTile(mapId) : globalTile(mapId, x, y);
  return g && { x: GX + (G * g.gx) / 32, y: GY + (G * g.gz) / 32, inside: g.inside };
}

// Orte (Karten dieses Spiels), die ein Feld belegen
function placesAt(bx, bz) {
  return Object.keys(PLACES).filter((id) => { const b = box(id); return MAPS[id] && bx >= b.x0 && bx <= b.x1 && bz >= b.z0 && bz <= b.z1; });
}
const headerArea = (id) => (PLACES[id][0] || '').toLowerCase().replace('eterna_city', 'eternia_city');

// ------------------------------------------------------------------ Darstellung
export class TownMap {
  constructor(owner) {
    this.o = owner;          // WorldMap: me, roster, visited, canFlyTo
    this.view = null;        // { k: Geraetepixel je Kartenpixel (ganzzahlig), cx, cy: Mitte in Kartenpixeln }
    this.cursor = null;      // Feld unter dem Mauszeiger oder Tastatur-Cursor
    this.dpr = 1;
    this.baked = null; this.bakedKey = '';
  }

  // Karte mit den schon besuchten versteckten Orten
  image() {
    const open = this.unlockedHidden();
    const key = [...open].sort().join(',');
    if (this.baked && this.bakedKey === key) return this.baked;
    const c = document.createElement('canvas'); const [w, h] = TM.data.size; c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.drawImage(TM.img.map, 0, 0);
    for (const k of open) { const r = TM.data.hidden[k]; if (r) g.drawImage(TM.img.hidden, r[0], r[1], r[2], r[3], r[0], r[1], r[2], r[3]); }
    this.baked = c; this.bakedKey = key;
    return c;
  }
  seen(id) { return this.o.visited.has(id); }
  unlockedHidden() {
    const out = new Set();
    for (const b of TM.data.blocks) if (b.hidden && placesAt(b.x, b.z).some((id) => this.seen(id))) out.add(b.hidden);
    return out;
  }
  block(bx, bz) {
    const b = TM.data.blocks.find((q) => q.x === bx && q.z === bz);
    if (!b || (b.hidden && !this.unlockedHidden().has(b.hidden))) return null;
    return b;
  }
  // Name und Zielkarte eines Feldes
  spot(b) {
    const ids = placesAt(b.x, b.z);
    const main = ids.find((id) => headerArea(id) === b.area && !MAPS[id].indoor) || ids.find((id) => !MAPS[id].indoor) || null;
    const flyId = ids.find((id) => MAPS[id].fly && FLY_SPOTS.some((f) => f.map === id));
    const id = flyId || main;
    const name = main && headerArea(main) === b.area ? MAPS[main].name : areaName(b.area);
    return { id, name, fly: !!flyId, bx: b.x, bz: b.z };
  }

  // ---------------------------------------------------------------- Ansicht
  fitK(Wd, Hd) { return Math.max(1, Math.floor(Math.min(Wd / CROP.w, Hd / CROP.h))); }
  barH() { return 24 * Math.max(1, Math.round(this.dpr)); }
  resetView(W, H, onMe = true) {
    const Wd = W * this.dpr, Hd = H * this.dpr - this.barH();
    const k = this.fitK(Wd, Hd);
    const me = onMe && this.view && this.mePixel();
    // Erster Aufruf: ganze Region wie im Original. "Zu mir": eine Stufe naeher an die eigene Figur
    this.view = me ? { k: Math.max(k + 1, this.view.k), cx: me.x, cy: me.y } : { k, cx: CROP.x + CROP.w / 2, cy: CROP.y + CROP.h / 2 };
    this.clamp(W, H);
  }
  clamp(W, H) {
    const v = this.view; const Wd = W * this.dpr, Hd = H * this.dpr - this.barH();
    const hw = Wd / 2 / v.k, hh = Hd / 2 / v.k;
    v.cx = CROP.w * v.k <= Wd ? CROP.x + CROP.w / 2 : Math.max(CROP.x + hw, Math.min(CROP.x + CROP.w - hw, v.cx));
    v.cy = CROP.h * v.k <= Hd ? CROP.y + CROP.h / 2 : Math.max(CROP.y + hh, Math.min(CROP.y + CROP.h - hh, v.cy));
  }
  zoomAt(factor, sx, sy, W, H) {
    if (!this.view) this.resetView(W, H, false);
    const v = this.view; const before = this.toMap(sx, sy, W, H);
    const fit = this.fitK(W * this.dpr, H * this.dpr - this.barH());
    v.k = Math.max(fit, Math.min(fit * 6, v.k + (factor > 1 ? 1 : -1)));
    const after = this.toMap(sx, sy, W, H);
    v.cx += before.x - after.x; v.cy += before.y - after.y;
    this.clamp(W, H);
  }
  pan(dx, dy, W, H) { if (!this.view) return; this.view.cx -= (dx * this.dpr) / this.view.k; this.view.cy -= (dy * this.dpr) / this.view.k; this.clamp(W, H); }
  // Ursprung der Karte in Geraetepixeln (ganzzahlig, damit jedes Kartenpixel gleich gross ist)
  origin(Wd, Hd) { const v = this.view; return { ox: Math.round(Wd / 2 - v.cx * v.k), oy: Math.round(Hd / 2 - v.cy * v.k) }; }
  toMap(sx, sy, W, H) {
    const { ox, oy } = this.origin(W * this.dpr, H * this.dpr - this.barH());
    return { x: (sx * this.dpr - ox) / this.view.k, y: (sy * this.dpr - oy) / this.view.k };
  }
  spotAt(sx, sy, W, H) {
    if (!this.view) return null;
    const p = this.toMap(sx, sy, W, H);
    const inside = p.x >= CROP.x && p.y >= CROP.y && p.x < CROP.x + CROP.w && p.y < CROP.y + CROP.h;
    const b = inside && this.block(Math.floor((p.x - GX) / G), Math.floor((p.y - GY) / G));
    this.cursor = b ? { x: b.x, z: b.z } : null;
    return b ? this.spot(b) : null;
  }
  moveCursor(dx, dz) {
    const start = this.cursor || this.meBlock() || { x: 3, z: 27 };
    let x = start.x, z = start.z;
    for (let i = 0; i < 30; i++) { // zum naechsten Feld mit Ort springen
      x += dx; z += dz;
      if (x < 0 || z < 0 || x > 29 || z > 29) return this.cursorSpot();
      if (this.block(x, z)) { this.cursor = { x, z }; break; }
    }
    return this.cursorSpot();
  }
  cursorSpot() { const b = this.cursor && this.block(this.cursor.x, this.cursor.z); return b ? this.spot(b) : null; }
  mePixel() { const me = this.o.me; return me && mapPixel(me.map, me.x, me.y); }
  meBlock() { const p = this.mePixel(); return p && { x: Math.floor((p.x - GX) / G), z: Math.floor((p.y - GY) / G) }; }
  screenOf(id, W, H) {
    if (!this.view || !PLACES[id]) return null;
    const b = box(id); const { ox, oy } = this.origin(W * this.dpr, H * this.dpr - this.barH());
    const mx = GX + G * ((b.x0 + b.x1 + 1) / 2), my = GY + G * ((b.z0 + b.z1 + 1) / 2);
    return { x: (ox + mx * this.view.k) / this.dpr, y: (oy + my * this.view.k) / this.dpr };
  }

  // ---------------------------------------------------------------- Zeichnen
  // opts.zoom: Minikarte (feste Stufe um die eigene Figur, ohne Leiste)
  draw(g, W, H, now, opts = {}) {
    const mini = !!opts.zoom;
    const dpr = g.getTransform().a || 1; if (!mini) this.dpr = dpr;
    const Wd = Math.round(W * dpr), Hd = Math.round(H * dpr);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
    g.fillStyle = FRAME; g.fillRect(0, 0, Wd, Hd);
    let k, ox, oy; const mapH = mini ? Hd : Hd - this.barH();
    if (mini) {
      k = Math.max(1, Math.round(opts.zoom));
      const me = this.mePixel() || { x: CROP.x + CROP.w / 2, y: CROP.y + CROP.h / 2 };
      const cx = Math.max(CROP.x + Wd / 2 / k, Math.min(CROP.x + CROP.w - Wd / 2 / k, me.x));
      const cy = Math.max(CROP.y + Hd / 2 / k, Math.min(CROP.y + CROP.h - Hd / 2 / k, me.y));
      ox = Math.round(Wd / 2 - cx * k); oy = Math.round(Hd / 2 - cy * k);
    } else {
      if (!this.view) this.resetView(W, H, false);
      k = this.view.k; ({ ox, oy } = this.origin(Wd, mapH));
    }
    g.save(); g.beginPath(); g.rect(0, 0, Wd, mapH); g.clip();
    g.drawImage(this.image(), CROP.x, CROP.y, CROP.w, CROP.h, ox + CROP.x * k, oy + CROP.y * k, CROP.w * k, CROP.h * k);
    const at = (x, y) => [ox + x * k, oy + y * k];
    const frame = Math.floor(now / (1000 / 60));

    // Flugziele: grau unbesucht, blau (Dorf) oder rot (Stadt) besucht, blinkend unter dem Cursor
    const hoverId = this.o.hover;
    for (const f of FLY_SPOTS) {
      if (!MAPS[f.map]) continue;
      const open = this.seen(f.map);
      let row = open ? (f.city ? 2 : 1) : 0;
      if (!mini && hoverId === f.map && ((frame >> 4) & 1) === 0) row = f.city ? 4 : 3;
      const [x, y] = at(f.x + 17, f.y - 42);
      g.drawImage(TM.img.fly, f.shape * 16, row * 16, 16, 16, x, y, 16 * k, 16 * k);
    }
    // Cursor (weisse Ecken) auf dem Feld unter der Maus
    if (!mini && this.cursor) {
      const [x, y] = at(G * this.cursor.x + 25 - 8, G * this.cursor.z - 34 - 8);
      const f = Math.floor(now / (34 * 1000 / 60)) % 2;
      g.drawImage(TM.img.icons, 32 + f * 16, 0, 16, 16, x, y, 16 * k, 16 * k);
    }
    // Andere Spieler: Punkt in ihrer Farbe mit Namen, man selbst als Spielerkopf
    const ik = mini ? Math.max(1, k) : Math.max(1, Math.ceil(k / 2));
    const others = (this.o.roster || []).filter((p) => !this.o.me || p.id !== this.o.me.id);
    const labels = [];
    for (const p of others) {
      const px = mapPixel(p.map, p.x, p.y); if (!px) continue;
      const [x, y] = at(px.x, px.y); const r = 3 * ik;
      g.fillStyle = '#10121e'; g.fillRect(Math.round(x - r - ik), Math.round(y - r - ik), 2 * r + 2 * ik, 2 * r + 2 * ik);
      g.fillStyle = p.color || '#8fb4ff'; g.fillRect(Math.round(x - r), Math.round(y - r), 2 * r, 2 * r);
      if (px.inside) { g.fillStyle = '#fff'; g.fillRect(Math.round(x - ik / 2), Math.round(y - ik / 2), ik, ik); }
      labels.push({ x, y: y - r - ik, text: p.name, color: p.color });
    }
    const me = this.mePixel();
    if (me) {
      const [x, y] = at(me.x, me.y);
      const bob = !mini && ((frame >> 5) & 1) ? ik : 0;
      g.drawImage(TM.img.icons, 0, 0, 16, 16, Math.round(x - 8 * ik), Math.round(y - 8 * ik - bob), 16 * ik, 16 * ik);
    }
    const fs = Math.round((mini ? 11 : 13) * dpr);
    g.font = `700 ${fs}px "Pixelify Sans", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const placed = [];
    for (const l of labels) {
      const w = g.measureText(l.text).width + 8 * dpr; const h = fs + 4 * dpr;
      let ly = l.y - h / 2 - 2 * dpr;
      while (placed.some((o) => Math.abs(o.x - l.x) < (o.w + w) / 2 && Math.abs(o.y - ly) < h)) ly -= h;
      placed.push({ x: l.x, y: ly, w });
      g.fillStyle = 'rgba(16,18,30,.85)'; g.fillRect(Math.round(l.x - w / 2), Math.round(ly - h / 2), Math.round(w), Math.round(h));
      g.fillStyle = '#fff'; g.fillText(l.text, l.x, ly + dpr);
    }
    g.restore();

    // Namensleiste wie im Original: Ort unter dem Cursor, sonst der eigene Ort
    if (!mini) {
      const bh = this.barH(); const s = bh / 24; const y0 = Hd - bh;
      g.fillStyle = BAR.line; g.fillRect(0, y0, Wd, 2 * s);
      g.fillStyle = BAR.fill; g.fillRect(0, y0 + 2 * s, Wd, bh - 2 * s);
      const c = this.cursorSpot();
      const text = c ? c.name : this.o.placeLabel?.() || '';
      g.fillStyle = BAR.text; g.font = `700 ${Math.round(14 * s)}px "Pixelify Sans", monospace`; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(text, 12 * s, y0 + 13 * s);
      if (c && c.fly && this.o.canFlyTo(c.id)) { g.textAlign = 'right'; g.fillText('Fliegen möglich', Wd - 12 * s, y0 + 13 * s); }
    }
    g.restore();
  }
}
