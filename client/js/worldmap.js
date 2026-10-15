// Weltkarte: setzt alle Aussenkarten ueber ihre Randverbindungen zu einer grossen Karte
// zusammen, legt Hoehlen (Tor, Mine) passend dazwischen und zeigt, wo man selbst und alle
// anderen Spieler gerade sind. Zusaetzlich gibt es eine kleine Umgebungskarte in der Seitenleiste.
import { MAPS, SPAWN } from '/shared/data/maps.js';

const COLORS = {
  '#': '#2c6538', '~': '#3d7fd6', ',': '#80c45c', '"': '#4c9a3a', '.': '#e2d29c', '=': '#ecdca6', '*': '#b4dc72',
  H: '#c45a48', D: '#f4ecd8', C: '#e8483c', S: '#9a6a3a', F: '#b08a52', L: '#5f9a44', X: '#8c765a', G: '#30241c',
  ';': '#4c4450', O: '#7a6a5a', ':': '#6a5844', E: '#6a5844', U: '#6a5844'
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

// ------------------------------------------------------------------ Bild der Welt (1 px pro Kachel)
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
    const known = !visited || visited.has(id);
    for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
      const t = m.tiles[y][x];
      const wx = p.x + x - L.minX; const wy = p.y + y - L.minY;
      if (wx < 0 || wy < 0 || wx >= L.w || wy >= L.h) continue;
      if (cave && t === 'X') continue; // Fels der Hoehle verdeckt nichts
      let col = (cave && CAVE_COLORS[t]) || COLORS[t] || '#6a6a6a';
      if (!known) col = t === '#' || t === 'X' ? '#2a3050' : t === '~' ? '#34406a' : '#3c4672';
      put(wx, wy, col, cave ? 200 : 255);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

const NAME_SPOTS = (L) => Object.entries(L.pos).filter(([, p]) => !p.cave).map(([id]) => {
  const m = MAPS[id]; const p = L.pos[id];
  return { id, name: m.name, x: p.x - L.minX + m.width / 2, y: p.y - L.minY + m.height / 2, town: !/^route_|lake_/.test(id) };
});

// ------------------------------------------------------------------ Darstellung
export class WorldMap {
  constructor() {
    this.roster = [];
    this.me = null;
    this.visited = new Set();
    this.key = null;
    this.baked = null;
    this.open = false;
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

  image() { return (this.baked ||= bakeWorld(this.visited)); }

  // Zeichnet die Welt in ein Rechteck. view = { cx, cy, scale } oder null = alles einpassen
  draw(g, W, H, now, opts = {}) {
    const L = layout();
    const img = this.image();
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#141830'; g.fillRect(0, 0, W, H);
    let k, ox, oy;
    if (opts.zoom) {
      k = opts.zoom;
      const me = this.me && worldPos(this.me.map, this.me.x, this.me.y);
      ox = Math.round(W / 2 - (me ? me.x + 0.5 : L.w / 2) * k);
      oy = Math.round(H / 2 - (me ? me.y + 0.5 : L.h / 2) * k);
    } else {
      k = Math.floor(Math.min((W - 40) / L.w, (H - 70) / L.h) * 2) / 2;
      ox = Math.round((W - L.w * k) / 2); oy = Math.round((H - L.h * k) / 2 + 14);
    }
    // Wasser-Hintergrund im Raster, wie auf einer Kartenrolle
    g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 1;
    for (let x = ox % (k * 8); x < W; x += k * 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = oy % (k * 8); y < H; y += k * 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.35)'; // Schatten unter den Karten
    for (const [id, p] of Object.entries(L.pos)) {
      if (p.cave) continue;
      const m = MAPS[id];
      g.fillRect(ox + (p.x - L.minX) * k + k, oy + (p.y - L.minY) * k + k, m.width * k, m.height * k);
    }
    g.drawImage(img, ox, oy, L.w * k, L.h * k);

    // Ortsnamen
    if (!opts.zoom || opts.zoom < 6) {
      g.textAlign = 'center';
      for (const s of NAME_SPOTS(L)) {
        const known = this.visited.has(s.id);
        const label = known ? s.name : '???';
        g.font = `${s.town ? 700 : 400} ${opts.zoom ? 11 : s.town ? 15 : 12}px "Pixelify Sans", monospace`;
        const x = ox + s.x * k; const y = oy + s.y * k;
        const w = g.measureText(label).width + 10;
        g.fillStyle = s.town ? 'rgba(250,250,242,.92)' : 'rgba(20,24,48,.7)';
        g.fillRect(Math.round(x - w / 2), Math.round(y - 9), Math.round(w), 16);
        g.fillStyle = s.town ? '#2a2a34' : '#e8ecff';
        g.fillText(label, x, y + 4);
      }
    }

    // Spieler (andere zuerst, man selbst oben drauf)
    const t = now / 1000;
    const others = this.roster.filter((p) => !this.me || p.id !== this.me.id);
    for (const p of others) {
      const w = worldPos(p.map, p.x, p.y);
      if (!w) continue;
      this.marker(g, ox + (w.x + 0.5) * k, oy + (w.y + 0.5) * k, p.color || '#8fb4ff', p.name, false, t, w.inside, opts.zoom);
    }
    if (this.me) {
      const w = worldPos(this.me.map, this.me.x, this.me.y);
      if (w) this.marker(g, ox + (w.x + 0.5) * k, oy + (w.y + 0.5) * k, this.me.color || '#e53935', 'Du', true, t, w.inside, opts.zoom);
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
