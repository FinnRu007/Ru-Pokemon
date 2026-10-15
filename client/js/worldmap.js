// Weltkarte: setzt alle Aussenkarten ueber ihre Randverbindungen zu einer grossen Karte
// zusammen, legt Hoehlen (Tor, Mine) passend dazwischen und zeigt, wo man selbst und alle
// anderen Spieler gerade sind. Zusaetzlich gibt es eine kleine Umgebungskarte in der Seitenleiste.
import { MAPS, SPAWN } from '/shared/data/maps.js';

const COLORS = {
  '#': '#2c6538', '~': '#3d7fd6', ',': '#80c45c', '"': '#4c9a3a', '.': '#e2d29c', '=': '#ecdca6', '*': '#b4dc72',
  H: '#c45a48', D: '#f4ecd8', C: '#e8483c', S: '#9a6a3a', F: '#b08a52', L: '#5f9a44', X: '#8c765a', G: '#30241c',
  ';': '#4c4450', O: '#7a6a5a', ':': '#6a5844', E: '#6a5844', U: '#6a5844',
  Q: '#a09078', Z: '#3a8a44', M: '#6e665c', N: '#7a6650', J: '#8ec0f6', b: '#b8844c', n: '#eef4fa'
};
const CAVE_COLORS = { X: '#2a2420', O: '#4a4038' };

// ------------------------------------------------------------------ Layout (einmal berechnet)
function computeLayout() {
  const pos = {};
  const outdoor = Object.keys(MAPS).filter((id) => !MAPS[id].indoor);
  pos[SPAWN.map] = { x: 0, y: 0 };
  const queue = [SPAWN.map];
  while (queue.length) {
    const id = queue.shift(); const a = MAPS[id]; const p = pos[id];
    for (const [edge, c] of Object.entries(a.connections || {})) {
      const b = MAPS[c.map];
      if (!b || pos[c.map]) continue;
      if (edge === 'north') pos[c.map] = { x: p.x - c.offset, y: p.y - b.height };
      if (edge === 'south') pos[c.map] = { x: p.x - c.offset, y: p.y + a.height };
      if (edge === 'west') pos[c.map] = { x: p.x - b.width, y: p.y - c.offset };
      if (edge === 'east') pos[c.map] = { x: p.x + a.width, y: p.y - c.offset };
      queue.push(c.map);
    }
    // Nicht verbundene Aussenkarten ueber eine Hoehle mit zwei Ausgaengen anlegen
    if (!queue.length) {
      for (const u of outdoor.filter((o) => !pos[o])) {
        for (const [iid, inner] of Object.entries(MAPS)) {
          if (!inner.indoor) continue;
          const wu = inner.warps.find((w) => w.to === u);
          const wp = inner.warps.find((w) => pos[w.to] && !MAPS[w.to].indoor);
          if (!wu || !wp) continue;
          const dp = MAPS[wp.to].warps.find((w) => w.to === iid);
          const du = MAPS[u].warps.find((w) => w.to === iid);
          if (!dp || !du) continue;
          const P = pos[wp.to];
          pos[u] = { x: P.x + dp.x + (wu.x - wp.x) - du.x, y: P.y + dp.y + (wu.y - wp.y) - du.y };
          queue.push(u);
          break;
        }
        if (queue.length) break;
      }
    }
  }
  // Innenraeume: Hoehlen werden in Weltkoordinaten eingeblendet, Haeuser auf ihre Tuer gelegt
  const anchor = {};
  for (const [id, m] of Object.entries(MAPS)) {
    if (!m.indoor) continue;
    const seen = new Set([id]); let cur = id; let found = null;
    for (let depth = 0; depth < 4 && !found; depth++) {
      const w = MAPS[cur].warps.find((x) => !seen.has(x.to));
      if (!w) break;
      if (!MAPS[w.to].indoor && pos[w.to]) {
        const door = MAPS[w.to].warps.find((x) => x.to === cur);
        if (door) found = { map: w.to, door, inner: w, via: cur };
      }
      seen.add(w.to); cur = w.to;
    }
    if (!found) continue;
    const P = pos[found.map];
    if (m.theme === 'cave' && found.via === id) {
      pos[id] = { x: P.x + found.door.x - found.inner.x, y: P.y + found.door.y - found.inner.y, cave: true };
    } else {
      anchor[id] = { map: found.map, x: P.x + found.door.x, y: P.y + found.door.y };
    }
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [id, p] of Object.entries(pos)) {
    const m = MAPS[id];
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + m.width); maxY = Math.max(maxY, p.y + m.height);
  }
  return { pos, anchor, minX, minY, w: maxX - minX, h: maxY - minY };
}

let LAYOUT = null;
export function layout() { return (LAYOUT ||= computeLayout()); }

// Weltkoordinate (in Kacheln) eines Spielers. Innenraeume landen auf ihrer Haustuer.
export function worldPos(mapId, x, y) {
  const L = layout();
  if (L.pos[mapId]) return { x: L.pos[mapId].x + x - L.minX, y: L.pos[mapId].y + y - L.minY, area: mapId };
  const a = L.anchor[mapId];
  if (a) return { x: a.x - L.minX, y: a.y - L.minY, area: a.map, inside: true };
  return null;
}
// Gebiet, das als besucht zaehlt (Haeuser zaehlen zu ihrem Ort)
export function areaOf(mapId) { const L = layout(); return L.pos[mapId] ? mapId : L.anchor[mapId]?.map || mapId; }

// ------------------------------------------------------------------ Landschaft rund um die Karten
// Eine Regionskarte: Meer am Rand, Kueste, Wiesen, Waelder und Gebirge zwischen den Orten.
// Erzeugt aus dem Abstand zu den echten Karten plus Rauschen, damit es natuerlich aussieht.
const PAD = 26; // Kacheln Rand rundherum

function noise2(x, y, seed) {
  const h = (i, j) => { let n = Math.imul(i * 374761393 + j * 668265263 + seed * 2246822519, 3266489917); n = (n ^ (n >>> 13)) >>> 0; return (Math.imul(n, 1274126177) >>> 0) / 4294967296; };
  const xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi;
  const s = (t) => t * t * (3 - 2 * t);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
}
const fbm = (x, y, seed) => noise2(x / 18, y / 18, seed) * 0.6 + noise2(x / 7, y / 7, seed + 1) * 0.3 + noise2(x / 3, y / 3, seed + 2) * 0.1;

let FIELD = null; // { W, H, dist, owner, ids, coast } fuer Gelaende und Nebel
function bakeTerrain() {
  const L = layout();
  const W = L.w + PAD * 2, H = L.h + PAD * 2;
  // Abstand jeder Zelle zur naechsten Karte (Mehrquellen-Breitensuche) und welche Karte das ist
  const dist = new Float32Array(W * H).fill(1e9); const owner = new Int16Array(W * H).fill(-1);
  const ids = Object.keys(L.pos); const q = [];
  ids.forEach((id, k) => {
    const p = L.pos[id]; const m = MAPS[id];
    for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
      const i = (p.y - L.minY + y + PAD) * W + (p.x - L.minX + x + PAD);
      if (dist[i] > 0) { dist[i] = 0; owner[i] = k; q.push(i); }
    }
  });
  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi]; const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx; if (dist[j] <= dist[i] + 1) continue;
      dist[j] = dist[i] + 1; owner[j] = owner[i]; q.push(j);
    }
  }
  FIELD = { W, H, dist, owner, ids };
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); const img = g.createImageData(W, H);
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const P = {
    deep: rgb('#2c5a9c'), sea: rgb('#3f78c0'), shallow: rgb('#5c9ad6'), foam: rgb('#a8d0f0'), sand: rgb('#e4d49a'),
    grass: rgb('#86bc5c'), grass2: rgb('#76b050'), forest: rgb('#3c7a40'), forest2: rgb('#2e6634'), hill: rgb('#9c8e66'),
    rock: rgb('#8a7e70'), rock2: rgb('#6c6258'), snow: rgb('#f0f4fa'), snowg: rgb('#d8e2ee'), dusk: rgb('#2e5a3a'), peak: rgb('#aaa298')
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; const d = dist[i];
    const n = fbm(x, y, 3); const n2 = fbm(x + 400, y, 9);
    const coast = 9 + n * 20; // so weit reicht Land um die Orte herum
    const tint = owner[i] >= 0 ? MAPS[ids[owner[i]]].tint : null;
    let col;
    if (d > coast) {
      const depth = d - coast;
      col = depth < 1.5 ? P.foam : depth < 4 ? P.shallow : depth < 10 + n2 * 6 ? P.sea : P.deep;
      if (col !== P.foam && ((x * 7 + y * 13) % 23 === 0) && noise2(x / 2, y / 2, 5) > 0.6) col = P.foam; // Wellen
    } else if (d > coast - 1.6) col = P.sand;
    else {
      const e = n2 * 0.9 + Math.min(1, d / 8) * 0.35 - Math.max(0, d - coast + 6) * 0.07; // Berge im Inland, flache Kuesten // Hoehe waechst weg von den Wegen
      const snow = tint === 'snow';
      // Schnee nur im verschneiten Norden, sonst graue Gipfel
      if (e > 0.86) col = snow ? P.snow : e > 0.97 ? P.peak : (x + y) % 3 ? P.rock : P.rock2;
      else if (e > 0.72) col = snow ? P.snowg : P.hill;
      else if (e > 0.5) col = snow ? P.snowg : tint === 'dusk' ? P.dusk : ((x * 3 + y * 5) % 4 === 0 ? P.forest2 : P.forest);
      else col = snow ? P.snow : (noise2(x / 3, y / 3, 7) > 0.55 ? P.grass2 : P.grass);
    }
    img.data.set([col[0], col[1], col[2], 255], i * 4);
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Nebel ueber dem Land unbekannter Gebiete (das Meer bleibt frei), damit man nicht vorab sieht,
// was einen erwartet. Bekannte Gebiete und ihr Umland bleiben klar.
function bakeFog(visited) {
  if (!FIELD) bakeTerrain();
  const { W, H, dist, owner, ids } = FIELD;
  const known = ids.map((id) => visited.has(id));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); const img = g.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const o = owner[i];
    if (o < 0 || known[o]) continue;
    const coast = 9 + fbm(i % W, (i / W) | 0, 3) * 20;
    if (dist[i] > coast + 1) continue;
    img.data.set([26, 30, 52, 205], i * 4);
  }
  g.putImageData(img, 0, 0);
  return c;
}

// ------------------------------------------------------------------ Bild der Karten (1 px pro Kachel)
function bakeWorld(visited) {
  const L = layout();
  const c = document.createElement('canvas');
  c.width = L.w; c.height = L.h;
  const g = c.getContext('2d');
  const img = g.createImageData(L.w, L.h);
  const put = (x, y, hex, a = 255) => {
    const i = (y * L.w + x) * 4;
    img.data[i] = parseInt(hex.slice(1, 3), 16); img.data[i + 1] = parseInt(hex.slice(3, 5), 16); img.data[i + 2] = parseInt(hex.slice(5, 7), 16); img.data[i + 3] = a;
  };
  // Hoehlen zuerst, damit Aussenkarten darueber liegen
  const ids = Object.keys(L.pos).sort((a, b) => (L.pos[b].cave ? 1 : 0) - (L.pos[a].cave ? 1 : 0));
  for (const id of ids) {
    const m = MAPS[id]; const p = L.pos[id]; const cave = p.cave;
    if (cave && visited && !visited.has(id)) continue; // unbekannte Hoehlen bleiben verborgen
    for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
      const t = m.tiles[y][x];
      const wx = p.x + x - L.minX; const wy = p.y + y - L.minY;
      if (wx < 0 || wy < 0 || wx >= L.w || wy >= L.h) continue;
      if (cave && t === 'X') continue; // Fels der Hoehle verdeckt nichts
      let col = (cave && CAVE_COLORS[t]) || COLORS[t] || '#6a6a6a';
      if (m.tint === 'snow' && (t === ',' || t === '"' || t === '*')) col = t === '"' ? '#c8d8e8' : '#eef2f8';
      put(wx, wy, col, cave ? 150 : 255);
    }
  }
  g.putImageData(img, 0, 0);
  // Unbekannte Gebiete: nur als Umriss unter dem Nebel, ohne Einzelheiten
  if (visited) {
    for (const id of ids) {
      if (visited.has(id) || L.pos[id].cave) continue;
      const m = MAPS[id]; const p = L.pos[id];
      g.clearRect(p.x - L.minX, p.y - L.minY, m.width, m.height);
      g.fillStyle = '#3a3f62';
      g.fillRect(p.x - L.minX, p.y - L.minY, m.width, m.height);
    }
  }
  return c;
}

const isTown = (id) => !!MAPS[id].fly || !/^route_|lake_|_path|_cave|mt_/.test(id);
function spots(L) {
  return Object.entries(L.pos).filter(([, p]) => !p.cave).map(([id, p]) => {
    const m = MAPS[id];
    return { id, name: m.name, x: p.x - L.minX + m.width / 2, y: p.y - L.minY + m.height / 2, w: m.width, h: m.height, town: isTown(id), fly: !!m.fly };
  });
}

// ------------------------------------------------------------------ Darstellung
export class WorldMap {
  constructor() {
    this.roster = [];
    this.me = null;
    this.visited = new Set();
    this.key = null;
    this.baked = null;
    this.view = null;     // { k, cx, cy } Zoom (Pixel pro Kachel) und Mittelpunkt in Kacheln
    this.hover = null;    // Ort unter dem Mauszeiger
    this.canFlyTo = () => false; // wird vom Spiel gesetzt (VM Fliegen und besuchte Orte)
  }

  setPlayer(name) {
    this.key = 'platin.visited.' + name.toLowerCase();
    try { this.visited = new Set(JSON.parse(localStorage.getItem(this.key) || '[]')); } catch { this.visited = new Set(); }
    this.baked = null;
  }

  visit(mapId) {
    const a = areaOf(mapId);
    if (this.visited.has(a)) return;
    this.visited.add(a);
    this.baked = null;
    try { localStorage.setItem(this.key, JSON.stringify([...this.visited])); } catch { /* privat */ }
  }

  image() { if (!this.baked) { this.baked = bakeWorld(this.visited); this.fogImg = null; } return this.baked; }
  fog() { return (this.fogImg ||= bakeFog(this.visited)); }
  terrain() { return (this.land ||= bakeTerrain()); }

  // Zoomstufe, bei der die ganze Welt hineinpasst
  fitK(W, H) { const L = layout(); return Math.max(1, Math.min(W / (L.w + 16), H / (L.h + 16))); }
  resetView(W, H, onMe = true) {
    const L = layout();
    const me = onMe && this.me && worldPos(this.me.map, this.me.x, this.me.y);
    const k = this.fitK(W, H);
    this.view = { k: me ? Math.min(k * 2.5, 8) : k, cx: me ? me.x : L.w / 2, cy: me ? me.y : L.h / 2 };
    this.clampView(W, H);
  }
  zoomAt(factor, sx, sy, W, H) {
    const v = this.view; const before = this.toWorld(sx, sy, W, H);
    v.k = Math.max(this.fitK(W, H), Math.min(24, v.k * factor));
    const after = this.toWorld(sx, sy, W, H);
    v.cx += before.x - after.x; v.cy += before.y - after.y;
    this.clampView(W, H);
  }
  pan(dx, dy, W, H) { this.view.cx -= dx / this.view.k; this.view.cy -= dy / this.view.k; this.clampView(W, H); }
  clampView(W, H) {
    const L = layout(); const v = this.view;
    const hw = W / 2 / v.k, hh = H / 2 / v.k;
    v.cx = L.w * v.k <= W ? L.w / 2 : Math.max(hw - 12, Math.min(L.w - hw + 12, v.cx));
    v.cy = L.h * v.k <= H ? L.h / 2 : Math.max(hh - 12, Math.min(L.h - hh + 12, v.cy));
  }
  toWorld(sx, sy, W, H) { const v = this.view; return { x: v.cx + (sx - W / 2) / v.k, y: v.cy + (sy - H / 2) / v.k }; }

  screenOf(id, W, H) {
    const s = spots(layout()).find((x) => x.id === id); const v = this.view;
    return s && v && { x: W / 2 + (s.x - v.cx) * v.k, y: H / 2 + (s.y - v.cy) * v.k };
  }
  // Ort an einer Bildschirmposition (fuer Fliegen per Klick)
  spotAt(sx, sy, W, H) {
    const L = layout(); const w = this.toWorld(sx, sy, W, H);
    return spots(L).find((s) => Math.abs(w.x - s.x) <= s.w / 2 && Math.abs(w.y - s.y) <= s.h / 2) || null;
  }

  // Zeichnet die Welt. opts.zoom = feste Zoomstufe um die eigene Figur (Minikarte)
  draw(g, W, H, now, opts = {}) {
    const L = layout();
    g.imageSmoothingEnabled = false;
    let k, cx, cy;
    if (opts.zoom) {
      k = opts.zoom;
      const me = this.me && worldPos(this.me.map, this.me.x, this.me.y);
      cx = me ? me.x + 0.5 : L.w / 2; cy = me ? me.y + 0.5 : L.h / 2;
    } else {
      if (!this.view) this.resetView(W, H);
      ({ k, cx, cy } = this.view);
    }
    const ox = W / 2 - cx * k; const oy = H / 2 - cy * k;
    g.fillStyle = '#2c5a9c'; g.fillRect(0, 0, W, H);
    const tr = [Math.round(ox - PAD * k), Math.round(oy - PAD * k), Math.round((L.w + PAD * 2) * k), Math.round((L.h + PAD * 2) * k)];
    g.drawImage(this.terrain(), ...tr);
    this.image();
    g.drawImage(this.fog(), ...tr);
    // Schatten und Rahmen der Karten, dann die Karten selbst
    g.fillStyle = 'rgba(0,0,0,.22)';
    for (const [id, p] of Object.entries(L.pos)) {
      if (p.cave) continue;
      const m = MAPS[id];
      g.fillRect(Math.round(ox + (p.x - L.minX) * k + Math.max(1, k / 3)), Math.round(oy + (p.y - L.minY) * k + Math.max(1, k / 3)), Math.round(m.width * k), Math.round(m.height * k));
    }
    g.drawImage(this.image(), Math.round(ox), Math.round(oy), Math.round(L.w * k), Math.round(L.h * k));

    // Ortsnamen ohne Ueberlappung: wichtigste zuerst, Rest weicht aus oder entfaellt
    const placed = [];
    // Eigene Markierung freihalten, damit kein Ortsname das "Du" verdeckt
    const meW = this.me && worldPos(this.me.map, this.me.x, this.me.y);
    if (meW && !opts.zoom) { const mx = ox + (meW.x + 0.5) * k, my = oy + (meW.y + 0.5) * k; placed.push({ x: mx - 22, y: my - 30, w: 44, h: 40 }); }
    const all = spots(L).filter((s) => this.visited.has(s.id) || s.town);
    all.sort((a, b) => (b.town - a.town) || (this.visited.has(b.id) - this.visited.has(a.id)) || (b.w * b.h - a.w * a.h));
    const small = !!opts.zoom;
    for (const s of all) {
      const known = this.visited.has(s.id);
      if (!s.town && !small && k < 3) continue; // Routennamen erst beim Hineinzoomen
      const label = known ? s.name : '???';
      g.font = `${s.town ? 700 : 400} ${small ? 11 : s.town ? 14 : 12}px "Pixelify Sans", monospace`;
      const w = g.measureText(label).width + 10; const h = 16;
      const x = ox + s.x * k; const y = oy + s.y * k;
      const cands = [[0, 0], [0, -(s.h * k) / 2 - 10], [0, (s.h * k) / 2 + 10], [-(s.w * k) / 2 - w / 2 - 4, 0], [(s.w * k) / 2 + w / 2 + 4, 0]];
      let spot = null;
      for (const [dx, dy] of cands) {
        const r = { x: x + dx - w / 2, y: y + dy - h / 2, w, h };
        if (r.x < 2 || r.y < 2 || r.x + w > W - 2 || r.y + h > H - 2) continue;
        if (!placed.some((o) => r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y)) { spot = r; break; }
      }
      if (!spot) continue;
      placed.push(spot);
      const flyable = !small && s.fly && this.canFlyTo(s.id);
      const hot = flyable && this.hover === s.id;
      g.fillStyle = hot ? '#ffe066' : s.town ? (known ? 'rgba(250,250,242,.94)' : 'rgba(60,64,96,.85)') : 'rgba(20,24,48,.75)';
      g.fillRect(Math.round(spot.x), Math.round(spot.y), Math.round(w), h);
      g.textAlign = 'center';
      g.fillStyle = s.town && known ? '#2a2a34' : '#e8ecff';
      g.fillText(label, spot.x + w / 2, spot.y + 12);
      if (flyable) { // Fluegelzeichen an Orten, die man anfliegen kann
        const fx = Math.round(spot.x + w - 2), fy = Math.round(spot.y - 2);
        g.fillStyle = '#10121e'; g.fillRect(fx - 6, fy - 4, 13, 8);
        g.fillStyle = '#8fd0ff'; g.fillRect(fx - 5, fy - 3, 4, 2); g.fillRect(fx + 2, fy - 3, 4, 2); g.fillRect(fx - 3, fy - 1, 7, 2);
      }
    }

    // Spieler (andere zuerst, man selbst oben drauf)
    const t = now / 1000;
    for (const p of this.roster.filter((p) => !this.me || p.id !== this.me.id)) {
      const w = worldPos(p.map, p.x, p.y);
      if (w) this.marker(g, ox + (w.x + 0.5) * k, oy + (w.y + 0.5) * k, p.color || '#8fb4ff', p.name, false, t, w.inside, small);
    }
    if (this.me) {
      const w = worldPos(this.me.map, this.me.x, this.me.y);
      if (w) this.marker(g, ox + (w.x + 0.5) * k, oy + (w.y + 0.5) * k, this.me.color || '#e53935', 'Du', true, t, w.inside, small);
    }
  }

  marker(g, x, y, color, label, self, t, inside, small) {
    const r = small ? 4 : 6;
    if (self) {
      const pulse = (t * 1.4) % 1;
      g.strokeStyle = `rgba(255,255,255,${1 - pulse})`; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, r + pulse * 14, 0, Math.PI * 2); g.stroke();
    }
    g.fillStyle = '#10121e';
    g.beginPath(); g.arc(x, y, r + 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = color;
    g.beginPath(); g.arc(x, y - (self ? Math.abs(Math.sin(t * 4)) * 2 : 0), r, 0, Math.PI * 2); g.fill();
    if (inside) { g.fillStyle = '#fff'; g.fillRect(x - 1, y - 1, 2, 2); }
    if (small && !self) return;
    g.font = `700 ${small ? 11 : 13}px "Pixelify Sans", monospace`; g.textAlign = 'center';
    const w = g.measureText(label).width + 8;
    g.fillStyle = self ? '#e8483c' : 'rgba(16,18,30,.85)';
    g.fillRect(Math.round(x - w / 2), Math.round(y - r - 20), Math.round(w), 15);
    g.fillStyle = '#fff'; g.fillText(label, x, y - r - 9);
  }
}

// Ortsname fuer die Spielerliste
export function placeName(mapId) {
  const m = MAPS[mapId];
  if (!m) return mapId;
  const a = areaOf(mapId);
  return a !== mapId && MAPS[a] ? `${MAPS[a].name} (${m.name})` : m.name;
}
