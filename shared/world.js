// Gemeinsame Bewegungs- und Kollisionslogik fuer Client (Vorhersage) und Server (Autoritaet).
export const DIRS = {
  up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 }
};
const EDGE = { up: 'north', down: 'south', left: 'west', right: 'east' };
export const SOLID = new Set(['#', '~', 'H', 'S', 'F', 'X', 'W', 'K', 'B', 'T', 'Y', 'P', 'V', 'R', 'O', 'Q', 'Z', 'M', 'N', 'J']);
// Tueren, Treppen und Hoehleneingaenge sind nur mit Warp begehbar
const PORTAL = new Set(['D', 'C', 'G', 'U']);
export const GRASS = '"';
export const WATER = '~';
// Feldhindernisse: blockieren, bis der Spieler die passende Feldattacke beherrscht (Story-Flag).
//   Q  Felsbrocken (Zertruemmerer)   Z  Duenner Baum (Zerschneider)   M  Schwerer Felsblock (Staerke)
//   N  Felswand (Kraxler)            J  Wasserfall (Kaskade)          ~  Wasser (Surfer)
export const FIELD = { Q: 'hm_rocksmash', Z: 'hm_cut', M: 'hm_strength', N: 'hm_rockclimb', J: 'hm_waterfall', '~': 'hm_surf' };
export const FIELD_NAMES = { hm_rocksmash: 'Zertrümmerer', hm_cut: 'Zerschneider', hm_strength: 'Stärke', hm_rockclimb: 'Kraxler', hm_waterfall: 'Kaskade', hm_surf: 'Surfer', hm_fly: 'Fliegen' };
export function fieldOpen(t, flags) { const need = FIELD[t]; return !!(need && flags && flags[need]); }
const passable = (t, flags) => t !== null && (!SOLID.has(t) || fieldOpen(t, flags));
export const CAVE_FLOOR = ':';

export function tileAt(map, x, y) {
  if (y < 0 || y >= map.height || x < 0 || x >= map.width) return null;
  return map.tiles[y][x];
}

function warpIndex(map) {
  if (!map._warpOn) {
    const on = new Map(); const off = new Map();
    for (const w of map.warps || []) (w.off ? off : on).set(w.off ? `${w.x},${w.y},${w.off}` : `${w.x},${w.y}`, w);
    Object.defineProperty(map, '_warpOn', { value: on, enumerable: false });
    Object.defineProperty(map, '_warpOff', { value: off, enumerable: false });
  }
  return map;
}
export function warpAt(map, x, y) { return warpIndex(map)._warpOn.get(`${x},${y}`) || null; }
export function exitWarp(map, x, y, dir) { return warpIndex(map)._warpOff.get(`${x},${y},${dir}`) || null; }

const warpResult = (w) => ({ ok: true, map: w.to, x: w.tx, y: w.ty, dir: w.dir, jump: false, warp: true });

// Berechnet das Ergebnis eines Schrittes. Liefert { ok, map, x, y, jump, warp?, dir? } oder { ok:false }.
// blocked(mapId, x, y) optional: z. B. NPCs. Spieler blockieren sich nicht (wie im Union-Raum).
// flags optional: Story-Flags des Spielers fuer Feldattacken.
export function resolveStep(maps, mapId, x, y, dir, blocked, flags) {
  const map = maps[mapId];
  const d = DIRS[dir];
  if (!map || !d) return { ok: false };
  let nx = x + d.dx;
  let ny = y + d.dy;
  let nMapId = mapId;

  if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) {
    const conn = map.connections && map.connections[EDGE[dir]];
    if (!conn) {
      const w = exitWarp(map, x, y, dir);
      return w ? warpResult(w) : { ok: false };
    }
    const target = maps[conn.map];
    if (!target) return { ok: false };
    if (dir === 'up') { ny = target.height - 1; nx = x + conn.offset; }
    if (dir === 'down') { ny = 0; nx = x + conn.offset; }
    if (dir === 'left') { nx = target.width - 1; ny = y + conn.offset; }
    if (dir === 'right') { nx = 0; ny = y + conn.offset; }
    nMapId = conn.map;
  } else {
    const w = exitWarp(map, x, y, dir);
    if (w) return warpResult(w);
  }

  const target = maps[nMapId];
  const t = tileAt(target, nx, ny);
  if (!passable(t, flags)) return { ok: false };
  if (PORTAL.has(t)) {
    const w = warpAt(target, nx, ny);
    return w ? warpResult(w) : { ok: false };
  }
  if (t === 'L') {
    if (dir !== 'down') return { ok: false };
    const landing = tileAt(target, nx, ny + 1);
    if (!passable(landing, flags) || landing === 'L') return { ok: false };
    if (blocked && blocked(nMapId, nx, ny + 1)) return { ok: false };
    return { ok: true, map: nMapId, x: nx, y: ny + 1, jump: true };
  }
  if (blocked && blocked(nMapId, nx, ny)) return { ok: false };
  return { ok: true, map: nMapId, x: nx, y: ny, jump: false };
}

export function facingTile(x, y, dir) {
  const d = DIRS[dir];
  return { x: x + d.dx, y: y + d.dy };
}

// Steht der Spieler auf einem gueltigen Feld? (Alte Spielstaende nach Kartenumbau absichern)
export function isStandable(maps, mapId, x, y, flags) {
  const map = maps[mapId];
  if (!map) return false;
  const t = tileAt(map, x, y);
  return passable(t, flags) && !PORTAL.has(t) && t !== 'L';
}
