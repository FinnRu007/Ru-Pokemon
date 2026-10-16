// Originalkarten aus Platin einsetzen. `npm run sprites` erzeugt shared/data/generated/world.js (nicht im
// Repo, Daten von pret/pokeplatinum). Fehlt die Datei, bleibt alles bei den eigenen Karten.
//
// applyOrigMaps(MAPS) ersetzt Kacheln, Groesse und Lage der Karten aus ORIG_SPEC, legt fehlende Orte
// und Tore neu an und verdrahtet alle Tueren, Treppen und Durchgaenge nach den Originaldaten.
// Die eigene Story wurde fuer die alten Karten geschrieben: remap(id, x, y) rechnet alte Koordinaten
// auf die Originalkarte um (Anker sind passende Tueren und Kartenuebergaenge, dazwischen wird
// gestreckt und auf ein begehbares Feld geschoben). Feste Zuordnungen stehen in origFix.js.
import { ORIG_SPEC, HEADER_MAP } from './origSpec.js';
import { ORIG_FIX } from './origFix.js';

let W = null;
try { W = (await import('./generated/world.js')).ORIG_WORLD; } catch { W = null; }
export const ORIG_WORLD = W;
export const ORIG_ON = !!W;

const SOLID = new Set([' ', '#', '~', 'H', 'S', 'F', 'X', 'W', 'K', 'B', 'T', 'Y', 'P', 'V', 'R', 'O', 'Q', 'Z', 'M', 'N', 'J', 'D', 'C', 'G', 'U', 'L', '<', '>', '^']);
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
// Kachelverhalten der Warp-Felder (pret: MB_WARP_*)
const OFF_DIR = { 0x6c: 'right', 0x6d: 'left', 0x6e: 'up', 0x6f: 'down' };
const ENTRANCE = { 0x62: 'right', 0x63: 'left', 0x64: 'up', 0x65: 'down' };

// Zuordnung Platin-Header -> Karten-ID dieses Spiels
const BY_HEADER = {};
for (const [id, s] of Object.entries(ORIG_SPEC)) if (s.h && !BY_HEADER[s.h]) BY_HEADER[s.h] = id;
Object.assign(BY_HEADER, HEADER_MAP);
const headerTarget = (h) => BY_HEADER[h] || BY_HEADER[h.replace(/_LOW_WATER$|_DRAINED$/, '')] || null;

export const REMAP = {};       // id -> { pt(x, y, opts), rect(r) } fuer Karten mit alten Koordinaten
export const ORIG_REPORT = []; // Hinweise fuer die Entwicklung (nicht zugeordnete Tueren usw.)

function standable(map, x, y) {
  const t = map.tiles[y]?.[x];
  return t !== undefined && !SOLID.has(t);
}
// Naechstes begehbares Feld (Spirale), optional ohne belegte Felder
export function snap(map, x, y, avoid) {
  x = Math.max(0, Math.min(map.width - 1, Math.round(x))); y = Math.max(0, Math.min(map.height - 1, Math.round(y)));
  for (let r = 0; r <= 12; r++) {
    let best = null; let bd = Infinity;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = x + dx, ny = y + dy;
      if (!standable(map, nx, ny) || avoid?.has(`${nx},${ny}`)) continue;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = [nx, ny]; }
    }
    if (best) return best;
  }
  // Weit weg: naechstes begehbares Feld der ganzen Karte
  let best = [x, y]; let bd = Infinity;
  for (let ny = 0; ny < map.height; ny++) for (let nx = 0; nx < map.width; nx++) {
    if (!standable(map, nx, ny) || avoid?.has(`${nx},${ny}`)) continue;
    const d = (nx - x) ** 2 + (ny - y) ** 2;
    if (d < bd) { bd = d; best = [nx, ny]; }
  }
  return best;
}
// Rechteck der begehbaren Felder
function walkBox(map) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) if (standable(map, x, y)) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? { x0: 0, y0: 0, x1: map.width - 1, y1: map.height - 1 } : { x0, y0, x1, y1 };
}

// Gerade a*x+b durch Punktpaare (kleinste Quadrate), sonst Streckung um fallback (= [a, b] ohne Anker)
function fit(pairs, fallback) {
  if (!pairs.length) return fallback;
  return fit1(pairs, fallback[0]);
}
function fit1(pairs, fallback) {
  const xs = pairs.map((p) => p[0]);
  if (pairs.length >= 2 && Math.max(...xs) - Math.min(...xs) >= 4) {
    const n = pairs.length, mx = xs.reduce((a, b) => a + b) / n, my = pairs.reduce((a, p) => a + p[1], 0) / n;
    let sxy = 0, sxx = 0;
    for (const [a, b] of pairs) { sxy += (a - mx) * (b - my); sxx += (a - mx) * (a - mx); }
    const a = Math.max(0.4, Math.min(6, sxy / sxx));
    return [a, my - a * mx];
  }
  if (pairs.length) return [fallback, pairs.reduce((s, [a, b]) => s + b - fallback * a, 0) / pairs.length];
  return [fallback, 0];
}

function makeRemap(map, o, anchors) {
  // Ohne Anker: begehbarer Bereich alt -> begehbarer Bereich neu
  const A = walkBox({ ...o, width: o.width, height: o.height }), B = walkBox(map);
  const lin = (a0, a1, b0, b1) => { const k = (b1 - b0 + 1) / (a1 - a0 + 1); return [k, b0 + k * 0.5 - 0.5 - k * a0 + (k - 1) * 0]; };
  const fx = fit(anchors.map((a) => [a.o[0], a.n[0]]), lin(A.x0, A.x1, B.x0, B.x1));
  const fy = fit(anchors.map((a) => [a.o[1], a.n[1]]), lin(A.y0, A.y1, B.y0, B.y1));
  const base = (x, y) => [fx[0] * x + fx[1], fy[0] * y + fy[1]];
  const res = anchors.map((a) => { const b = base(...a.o); return { o: a.o, r: [a.n[0] - b[0], a.n[1] - b[1]] }; });
  const raw = (x, y) => {
    const b = base(x, y);
    if (!res.length) return b;
    let sw = 0, rx = 0, ry = 0;
    for (const a of res) {
      const d2 = (a.o[0] - x) ** 2 + (a.o[1] - y) ** 2;
      if (d2 === 0) return [b[0] + a.r[0], b[1] + a.r[1]];
      const w = 1 / (d2 * d2);
      sw += w; rx += w * a.r[0]; ry += w * a.r[1];
    }
    return [b[0] + rx / sw, b[1] + ry / sw];
  };
  return {
    raw,
    pt: (x, y, opts = {}) => { const [nx, ny] = raw(x, y); return opts.exact ? [Math.round(nx), Math.round(ny)] : snap(map, nx, ny, opts.avoid); },
    rect: (r) => {
      const [x0, y0] = raw(r.x, r.y); const [x1, y1] = raw(r.x + (r.w || 1) - 1, r.y + (r.h || 1) - 1);
      const nx = Math.round(Math.min(x0, x1)), ny = Math.round(Math.min(y0, y1));
      return { x: nx, y: ny, w: Math.max(1, Math.round(Math.abs(x1 - x0)) + 1), h: Math.max(1, Math.round(Math.abs(y1 - y0)) + 1) };
    }
  };
}

const b64 = (s) => (typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));

const OLD = {};
export function applyOrigMaps(MAPS) {
  if (!W) return false;
  const old = OLD;
  // ------------------------------------------------------------ Kacheln und Lage
  for (const [id, spec] of Object.entries(ORIG_SPEC)) {
    const g = W.maps[id];
    if (!g) continue;
    const m = MAPS[id];
    if (m) old[id] = { width: m.width, height: m.height, tiles: m.tiles, warps: m.warps || [], connections: m.connections || {}, events: m.events || [] };
    const map = m || (MAPS[id] = { name: spec.name, events: [], warps: [], encounters: null });
    Object.assign(map, { width: g.width, height: g.height, tiles: g.tiles.slice(), warps: [], connections: {} });
    if (spec.like) map.like = spec.like;
    if (spec.indoor) { map.indoor = true; map.theme = spec.theme || map.theme || 'gate'; }
    let hcache = null, bcache = null;
    map.orig = {
      m: g.m, x: g.x, z: g.z, battleBG: g.battleBG, weather: g.weather, objects: g.objects, coords: g.coords, bgs: g.bgs, warps: g.warps,
      get heights() { return hcache || (hcache = new Int16Array(b64(g.heights).buffer)); },
      // Verhalten je Kachel (Gras, Sand, Schnee ...), wie in include/constants/field/map_tile_behaviors.h
      get beh() { return bcache || (bcache = g.beh ? b64(g.beh) : new Uint8Array(g.width * g.height)); }
    };
  }
  Object.defineProperty(MAPS, '_owner', { value: W.owner, enumerable: false, configurable: true });
  const migrated = (id) => !!MAPS[id]?.orig;
  // Verbindungen zu Originalkarten gibt es nicht mehr (Oberwelt ist nahtlos, Rest ueber Warps)
  for (const m of Object.values(MAPS)) for (const [e, c] of Object.entries(m.connections || {})) if (migrated(c.map)) delete m.connections[e];

  // ------------------------------------------------------------ Eingaenge der Originalkarten
  // Benachbarte Warp-Felder mit gleichem Ziel bilden einen Eingang
  const ents = {};
  for (const id of Object.keys(MAPS)) {
    const map = MAPS[id];
    if (!map.orig) continue;
    const seen = new Map();
    for (const w of map.orig.warps) {
      const k = `${w.x},${w.y}`;
      const prev = seen.get(k);
      // Gleiche Stelle mit zwei Zielen (See mit wenig Wasser): das zugeordnete nehmen
      if (prev) { if (!headerTarget(prev.to) && headerTarget(w.to)) seen.set(k, w); continue; }
      seen.set(k, w);
    }
    const list = [];
    for (const w of seen.values()) {
      const kind = OFF_DIR[w.b] ? 'off' : (ENTRANCE[w.b] || w.b === 0x69 || w.b === 0x5e || w.b === 0x5f || w.b === 0x67) ? 'portal' : 'edge';
      let dir = OFF_DIR[w.b] || null;
      if (kind === 'edge') {
        // Ohne Verhalten: Richtung nach aussen (Kartenrand oder Wand), der Spieler laeuft hinaus
        for (const d of ['down', 'up', 'left', 'right']) {
          const [dx, dy] = DIRV[d]; const t = map.tiles[w.y + dy]?.[w.x + dx];
          const back = map.tiles[w.y - dy]?.[w.x - dx];
          if ((t === undefined || t === ' ' || t === '#') && back !== undefined && !SOLID.has(back)) { dir = d; break; }
        }
        dir ||= 'down';
      }
      // Warp auf einem festen Feld (z. B. Hoehlenmund): Betreten loest aus, wie eine Tuer
      const e = { ...w, kind: kind === 'edge' && SOLID.has(map.tiles[w.y][w.x]) ? 'portal' : kind, dir, map: id, dest: headerTarget(w.to) };
      const grp = list.find((g) => g.to === w.to && g.tiles.some((t) => Math.abs(t.x - w.x) + Math.abs(t.y - w.y) === 1));
      if (grp) grp.tiles.push(e); else list.push({ to: w.to, dest: e.dest, map: id, tiles: [e] });
    }
    ents[id] = list;
  }
  // Ankunft an einem Warp-Feld der Originalkarte
  const arrival = (e) => {
    const map = MAPS[e.map];
    let x = e.x, y = e.y, dir = 'down';
    if (e.kind === 'off') { dir = OPP[e.dir]; } else if (ENTRANCE[e.b]) {
      dir = OPP[ENTRANCE[e.b]]; x += DIRV[dir][0]; y += DIRV[dir][1];
    } else if (e.b === 0x69) { y += 1; } else if (e.kind === 'edge') { dir = OPP[e.dir]; } else {
      for (const d of ['down', 'up', 'left', 'right']) { const [dx, dy] = DIRV[d]; if (standable(map, x + dx, y + dy)) { x += dx; y += dy; dir = d; break; } }
    }
    if (e.kind !== 'off' && e.kind !== 'edge' && !standable(map, x, y)) [x, y] = snap(map, x, y);
    return { x, y, dir };
  };
  const findEnt = (id, hd, i) => {
    for (const g of ents[id] || []) for (const t of g.tiles) if (t.hd === hd && t.i === i) return t;
    return null;
  };
  // Alte Warps einer alten Karte zu einem Ziel (fuer die Paarung)
  const oldTo = (id, dest) => (old[id]?.warps || []).filter((w) => w.to === dest);
  const anyOldTo = (dest) => Object.values(old).flatMap((o) => o.warps).find((w) => w.to === dest);

  // ------------------------------------------------------------ Anker und Umrechnung
  const pairs = {}; // id -> [{ o:[x,y], n:[x,y] }]
  const pairing = {}; // `${id}|${groupIndex}` -> alter Warp
  for (const [id, list] of Object.entries(ents)) {
    if (!old[id]) continue;
    const A = (pairs[id] = []);
    const byDest = {};
    list.forEach((g, gi) => { if (g.dest && !migrated(g.dest)) (byDest[g.dest] ||= []).push(gi); });
    for (const [dest, gis] of Object.entries(byDest)) {
      const ow = oldTo(id, dest);
      if (ow.length === 1 && gis.length === 1) {
        const g = list[gis[0]]; const c = center(g.tiles);
        A.push({ o: [ow[0].x, ow[0].y], n: c }); pairing[`${id}|${gis[0]}`] = ow[0];
      }
    }
    // Kartenuebergaenge der alten Karte <-> gemeinsame Grenze auf der Originalwelt
    const map = MAPS[id]; const o = old[id];
    if (map.orig.m === 0) {
      for (const [edge, c] of Object.entries(o.connections)) {
        const nb = MAPS[c.map];
        if (!nb?.orig || nb.orig.m !== 0) continue;
        const nOld = old[c.map]; if (!nOld) continue;
        const span = edge === 'north' || edge === 'south'
          ? [Math.max(0, c.offset < 0 ? 0 : 0) , o.width] : [0, o.height];
        // Ueberlappung entlang der Kante (alte Koordinaten dieser Karte)
        const len = edge === 'north' || edge === 'south' ? nOld.width : nOld.height;
        const lo = Math.max(0, -c.offset), hi = Math.min(span[1], len - c.offset);
        if (hi <= lo) continue;
        // Begehbare Kanten-Felder im Altbestand
        const oldOpen = [];
        for (let k = lo; k < hi; k++) {
          const [x, y] = edge === 'north' ? [k, 0] : edge === 'south' ? [k, o.height - 1] : edge === 'west' ? [0, k] : [o.width - 1, k];
          if (!SOLID.has(o.tiles[y][x]) || o.tiles[y][x] === 'L') oldOpen.push([x, y]);
        }
        const border = sharedBorder(MAPS, id, c.map);
        if (!oldOpen.length || !border.length) continue;
        A.push({ o: center(oldOpen.map(([x, y]) => ({ x, y }))), n: center(border.map(([x, y]) => ({ x, y }))) });
      }
    }
    REMAP[id] = makeRemap(map, o, A);
    REMAP[id].anchors = A;
  }

  // ------------------------------------------------------------ Warps verdrahten
  for (const [id, list] of Object.entries(ents)) {
    const map = MAPS[id];
    list.forEach((g, gi) => {
      const dest = g.dest;
      let target = null; // { to, tx, ty, dir }
      if (dest && migrated(dest)) {
        const t = g.tiles[0];
        const e = findEnt(dest, ORIG_SPEC[dest]?.h || t.to, t.id) || findEnt(dest, t.to, t.id)
          || (ents[dest] || []).find((x) => x.dest === id)?.tiles[0];
        if (e) { const a = arrival(e); target = { to: dest, tx: a.x, ty: a.y, dir: a.dir }; }
      } else if (dest && MAPS[dest]) {
        const ow = pairing[`${id}|${gi}`] || oldTo(id, dest)[0] || anyOldTo(dest);
        const inside = MAPS[dest];
        if (ow) target = { to: dest, tx: ow.tx, ty: ow.ty, dir: ow.dir || 'up' };
        else if (inside.entry) target = { to: dest, tx: inside.entry.x, ty: inside.entry.y, dir: 'up' };
        else {
          // Raum ohne alten Eingang von hier: Ankunft neben seinem Ausgang zu einer anderen Karte
          const ex = (inside.warps || []).find((w) => w.off || w.to);
          if (ex) { const [tx, ty] = snap(inside, ex.x, ex.y); target = { to: dest, tx, ty, dir: 'up' }; }
        }
      }
      if (!target) {
        ORIG_REPORT.push(`${id}: Eingang zu ${g.to} bleibt zu`);
        for (const t of g.tiles) if (t.kind === 'portal' && map.tiles[t.y][t.x] !== ' ') setTile(map, t.x, t.y, '#');
        return;
      }
      for (const t of g.tiles) {
        if (t.kind === 'portal') {
          setTile(map, t.x, t.y, 'D');
          map.warps.push({ x: t.x, y: t.y, ...target });
        } else {
          map.warps.push({ x: t.x, y: t.y, off: t.dir, ...target });
        }
      }
      g.target = target;
    });
  }

  // ------------------------------------------------------------ Warps alter Raeume zurueck auf die Originalkarten
  for (const [rid, room] of Object.entries(MAPS)) {
    if (room.orig) continue;
    for (const w of room.warps || []) {
      if (!migrated(w.to)) continue;
      const list = ents[w.to] || [];
      // Passenden Eingang finden: gleicher Raum als Ziel, bei mehreren der naechste zur alten Lage
      let cand = list.filter((g) => g.dest === rid && g.target);
      // Der Raum liegt jetzt an einer anderen Originalkarte (z. B. Kahlberg statt Route 227)
      if (!cand.length) {
        const other = Object.values(ents).flat().filter((g) => g.dest === rid && g.target);
        if (other.length) { w.to = other[0].map; cand = other.filter((g) => g.map === w.to); }
      }
      let g = cand[0];
      if (cand.length > 1) {
        const [px, py] = REMAP[w.to] ? REMAP[w.to].raw(w.tx, w.ty) : [w.tx, w.ty];
        g = cand.reduce((b, c) => (dist(center(c.tiles), [px, py]) < dist(center(b.tiles), [px, py]) ? c : b));
      }
      if (g) {
        const a = arrival(g.tiles[Math.floor((g.tiles.length - 1) / 2)]);
        Object.assign(w, { tx: a.x, ty: a.y, dir: a.dir });
      } else if (REMAP[w.to]) {
        const [x, y] = REMAP[w.to].pt(w.tx, w.ty);
        Object.assign(w, { tx: x, ty: y });
        ORIG_REPORT.push(`${rid}: Ausgang nach ${w.to} ohne Originaleingang`);
      } else {
        const [x, y] = snap(MAPS[w.to], MAPS[w.to].width / 2, MAPS[w.to].height / 2);
        Object.assign(w, { tx: x, ty: y });
      }
    }
  }

  // ------------------------------------------------------------ Feste Umleitungen (origFix.js, _retarget)
  for (const [k, v] of Object.entries(ORIG_FIX._retarget || {})) {
    const [from, to] = k.split('>');
    for (const w of MAPS[from]?.warps || []) {
      if (w.to !== to) continue;
      if (v[1] === 'entrance') {
        const g = (ents[v[0]] || []).find((e) => e.dest === from && e.target);
        if (!g) continue;
        const a = arrival(g.tiles[Math.floor((g.tiles.length - 1) / 2)]);
        Object.assign(w, { to: v[0], tx: a.x, ty: a.y, dir: a.dir });
      } else Object.assign(w, { to: v[0], tx: v[1], ty: v[2], dir: v[3] || w.dir });
    }
  }

  // Feste Durchgaenge und Kacheln in eigenen Raeumen, Kartenfelder (origFix.js)
  for (const l of ORIG_FIX._links || []) {
    if (l[0] === 'tile' && MAPS[l[1]]) setTile(MAPS[l[1]], l[2], l[3], l[4]);
    if (l[0] === 'pass' && MAPS[l[1]] && MAPS[l[4]]) MAPS[l[1]].warps.push({ x: l[2], y: l[3], to: l[4], tx: l[5], ty: l[6], dir: l[7] });
  }

  // Raeume und Karten, zu denen kein Weg mehr fuehrt (gibt es in Platin nicht, z. B. Nordmeer)
  const into = new Set(Object.values(MAPS).flatMap((m) => [...(m.warps || []).map((w) => w.to), ...Object.values(m.connections || {}).map((c) => c.map)]));
  for (const [id, m] of Object.entries(MAPS)) if (!m.orig && !into.has(id)) m.retired = true;

  // ------------------------------------------------------------ Schilder, Ereignisse, Flugziele
  for (const [id, o] of Object.entries(old)) {
    const map = MAPS[id]; const R = REMAP[id];
    if (!R) continue;
    const signs = [];
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) if (map.tiles[y][x] === 'S') signs.push([x, y]);
    const used = new Set();
    map.events = (o.events || []).map((e) => {
      if (o.tiles[e.y]?.[e.x] === 'S' && signs.length) {
        const [px, py] = R.raw(e.x, e.y);
        const free = signs.filter((s) => !used.has(s.join()));
        const s = (free.length ? free : signs).reduce((b, c) => (dist(c, [px, py]) < dist(b, [px, py]) ? c : b));
        used.add(s.join());
        return { ...e, x: s[0], y: s[1] };
      }
      const [x, y] = R.pt(e.x, e.y);
      return { ...e, x, y };
    });
    if (map.fly) map.fly = flyPoint(map, R.pt(...map.fly));
  }
  // Kartenfelder aus origFix.js (_maps) erst nach der Umrechnung, damit eigene events und fly erhalten bleiben
  for (const [id, f] of Object.entries(ORIG_FIX._maps || {})) if (MAPS[id]) Object.assign(MAPS[id], f);
  for (const [id, map] of Object.entries(MAPS)) {
    if (!map.orig) continue;
    // Schilder ohne eigenen Text: Ortsname wie auf dem Original-Schild
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      if (map.tiles[y][x] === 'S' && !map.events.some((e) => e.x === x && e.y === y)) map.events.push({ x, y, type: 'text', text: map.name });
    }
    if (map.fly) map.fly = flyPoint(map, map.fly);
  }
  // Feste Schildtexte (origFix.js, _signs): Text an genau dieser Stelle, null entfernt das Ereignis
  for (const [id, list] of Object.entries(ORIG_FIX._signs || {})) {
    const map = MAPS[id]; if (!map) continue;
    for (const [k, text] of Object.entries(list)) {
      const [x, y] = k.split(',').map(Number);
      map.events = (map.events || []).filter((e) => e.x !== x || e.y !== y);
      if (text) map.events.push({ x, y, type: 'text', text });
    }
  }
  return true;
}

// Flugziel: vor der Tuer des Pokemon-Centers, sonst der umgerechnete Punkt
function flyPoint(map, p) {
  const c = (map.warps || []).find((w) => /_center$/.test(w.to) && !w.off);
  if (c && standable(map, c.x, c.y + 1)) return [c.x, c.y + 1];
  return snap(map, p[0], p[1]);
}

function setTile(map, x, y, t) { const r = map.tiles[y]; map.tiles[y] = r.slice(0, x) + t + r.slice(x + 1); }
function center(tiles) {
  const n = tiles.length;
  return [Math.round(tiles.reduce((a, t) => a + t.x, 0) / n), Math.round(tiles.reduce((a, t) => a + t.y, 0) / n)];
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Begehbare Felder von a, die an ein begehbares Feld von b grenzen (globale Oberwelt)
function sharedBorder(MAPS, a, b) {
  const A = MAPS[a], B = MAPS[b]; const out = [];
  for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
    if (A.tiles[y][x] === ' ' || SOLID.has(A.tiles[y][x]) && A.tiles[y][x] !== 'L') continue;
    for (const [dx, dy] of Object.values(DIRV)) {
      const gx = A.orig.x + x + dx, gz = A.orig.z + y + dy;
      const bx = gx - B.orig.x, by = gz - B.orig.z;
      const t = B.tiles[by]?.[bx];
      if (t !== undefined && t !== ' ' && (!SOLID.has(t) || t === '~' || t === 'L') && !(x + dx >= 0 && y + dy >= 0 && x + dx < A.width && y + dy < A.height && A.tiles[y + dy][x + dx] !== ' ')) { out.push([x, y]); break; }
    }
  }
  return out;
}

// ------------------------------------------------------------ Story umrechnen
// fixes: { map: { npcId: [x, y, dir?] , 'trigger:script': {x,y,w,h} } } aus origFix.js
export function applyOrigStory({ NPCS, TRIGGERS, SCRIPTS, spawns = [], fixes = {} }, MAPS) {
  if (!W) return;
  // Zusaetzliche Figuren und Skripte nur fuer die Originalkarten
  for (const [id, list] of Object.entries(fixes._add || {})) (NPCS[id] ||= []).push(...list.map((n) => ({ ...n, _fixed: true })));
  Object.assign(SCRIPTS, fixes._scripts || {});
  // NPCs, die auf eine andere Karte ziehen (fix mit map), zuerst umhaengen
  for (const [id, fx] of Object.entries(fixes)) {
    if (id.startsWith('_')) continue;
    for (const [nid, f] of Object.entries(fx)) {
      if (!f || Array.isArray(f) || !f.map || f.map === id) continue;
      const list = NPCS[id] || []; const i = list.findIndex((n) => n.id === nid);
      if (i < 0) continue;
      const [n] = list.splice(i, 1);
      (NPCS[f.map] ||= []).push(Object.assign(n, { ...f, map: undefined, _fixed: true }));
    }
  }
  for (const [id, list] of Object.entries(NPCS)) {
    const R = REMAP[id];
    const fx = fixes[id] || {};
    const avoid = new Set();
    NPCS[id] = list.filter((n) => {
      const f = fx[n.id];
      if (f === null) return false;
      if (n._fixed) { delete n._fixed; avoid.add(`${n.x},${n.y}`); return true; }
      if (Array.isArray(f)) { [n.x, n.y] = f; if (f[2]) n.dir = f[2]; } else if (f) { Object.assign(n, f); } else if (R) [n.x, n.y] = R.pt(n.x, n.y, { avoid });
      if (R && n.path) n.path = n.path.map(([x, y]) => R.pt(x, y));
      avoid.add(`${n.x},${n.y}`);
      return true;
    });
  }
  for (const [id, list] of Object.entries(TRIGGERS)) {
    const R = REMAP[id]; if (!R) continue;
    const fx = fixes[id] || {};
    TRIGGERS[id] = list.flatMap((t) => {
      const f = fx['trigger:' + (t.script || t.id)];
      if (f === null) return [];
      if (Array.isArray(f)) return f.map((r) => ({ ...t, ...r }));
      if (f) return [{ ...t, ...f }];
      // Sperre an einem alten Kartenuebergang: ganze neue Grenze zur Nachbarkarte abdecken
      const o = OLD[id]; const map = MAPS[id];
      if (o && map.orig.m === 0) {
        const near = { north: t.y <= 1 && t.h === 1, south: t.y + t.h >= o.height - 1 && t.h === 1, west: t.x <= 1 && t.w === 1, east: t.x + t.w >= o.width - 1 && t.w === 1 };
        for (const [edge, c] of Object.entries(o.connections)) {
          if (!near[edge] || !MAPS[c.map]?.orig) continue;
          const border = sharedBorder(MAPS, id, c.map);
          if (border.length) return segments(border).map((r) => ({ ...t, ...r }));
        }
      }
      return [{ ...t, ...widen(map, R.rect(t)) }];
    });
  }
  const wfix = fixes._warps || {};
  const walk = (steps, name) => {
    for (const s of steps || []) {
      if (!s || typeof s !== 'object') continue;
      if (s.warp && wfix[name]) { s.warp = wfix[name]; continue; }
      if (s.warp && REMAP[s.warp[0]]) { const [x, y] = REMAP[s.warp[0]].pt(s.warp[1], s.warp[2]); s.warp = [s.warp[0], x, y, s.warp[3]]; }
      for (const k of ['yes', 'no', 'then', 'else']) if (Array.isArray(s[k])) walk(s[k], name);
    }
  };
  for (const [name, steps] of Object.entries(SCRIPTS)) if (Array.isArray(steps)) walk(steps, name);
  for (const sp of spawns) if (sp && REMAP[sp.map]) [sp.x, sp.y] = REMAP[sp.map].pt(sp.x, sp.y);
}

// Grenzfelder in gerade Streifen zerlegen
function segments(tiles) {
  const set = new Set(tiles.map(([x, y]) => `${x},${y}`)); const done = new Set(); const out = [];
  for (const [x, y] of tiles.sort((a, b) => a[1] - b[1] || a[0] - b[0])) {
    if (done.has(`${x},${y}`)) continue;
    let w = 1; while (set.has(`${x + w},${y}`) && !done.has(`${x + w},${y}`)) w++;
    let h = 1; if (w === 1) while (set.has(`${x},${y + h}`) && !done.has(`${x},${y + h}`)) h++;
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) done.add(`${x + i},${y + j}`);
    out.push({ x, y, w, h });
  }
  return out;
}

// Ein Ausloeser, der einen Weg sperrt, muss den ganzen Weg abdecken: schmale Streifen bis an die Waende ziehen
function widen(map, r) {
  if (!map) return r;
  const out = { ...r };
  if (r.h === 1 && r.w <= 12) {
    let x0 = r.x, x1 = r.x + r.w - 1;
    while (x0 > 0 && standable(map, x0 - 1, r.y) && r.x - x0 < 10) x0--;
    while (x1 < map.width - 1 && standable(map, x1 + 1, r.y) && x1 - (r.x + r.w - 1) < 10) x1++;
    out.x = x0; out.w = x1 - x0 + 1;
  } else if (r.w === 1 && r.h <= 12) {
    let y0 = r.y, y1 = r.y + r.h - 1;
    while (y0 > 0 && standable(map, r.x, y0 - 1) && r.y - y0 < 10) y0--;
    while (y1 < map.height - 1 && standable(map, r.x, y1 + 1) && y1 - (r.y + r.h - 1) < 10) y1++;
    out.y = y0; out.h = y1 - y0 + 1;
  }
  return out;
}
