// Gemeinsame Bewegungs- und Kollisionslogik fuer Client (Vorhersage) und Server (Autoritaet).
export const DIRS = {
  up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 }
};
const EDGE = { up: 'north', down: 'south', left: 'west', right: 'east' };
export const SOLID = new Set(['#', '~', 'H', 'S', 'F']);
export const GRASS = '"';

export function tileAt(map, x, y) {
  if (y < 0 || y >= map.height || x < 0 || x >= map.width) return null;
  return map.tiles[y][x];
}

// Berechnet das Ergebnis eines Schrittes. Liefert { ok, map, x, y, jump } oder { ok:false }.
// occupied(mapId, x, y) optional: Spieler blockieren sich nicht (wie im Union-Raum ueblich),
// kann aber fuer strengere Regeln genutzt werden.
export function resolveStep(maps, mapId, x, y, dir, occupied) {
  const map = maps[mapId];
  const d = DIRS[dir];
  if (!map || !d) return { ok: false };
  let nx = x + d.dx;
  let ny = y + d.dy;
  let nMapId = mapId;

  if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) {
    const conn = map.connections && map.connections[EDGE[dir]];
    if (!conn) return { ok: false };
    const target = maps[conn.map];
    if (!target) return { ok: false };
    if (dir === 'up') { ny = target.height - 1; nx = x + conn.offset; }
    if (dir === 'down') { ny = 0; nx = x + conn.offset; }
    if (dir === 'left') { nx = target.width - 1; ny = y + conn.offset; }
    if (dir === 'right') { nx = 0; ny = y + conn.offset; }
    nMapId = conn.map;
  }

  const target = maps[nMapId];
  const t = tileAt(target, nx, ny);
  if (t === null || SOLID.has(t)) return { ok: false };
  if (t === 'L') {
    if (dir !== 'down') return { ok: false };
    const landing = tileAt(target, nx, ny + 1);
    if (landing === null || SOLID.has(landing) || landing === 'L') return { ok: false };
    return { ok: true, map: nMapId, x: nx, y: ny + 1, jump: true };
  }
  if (occupied && occupied(nMapId, nx, ny)) return { ok: false };
  return { ok: true, map: nMapId, x: nx, y: ny, jump: false };
}

export function facingTile(x, y, dir) {
  const d = DIRS[dir];
  return { x: x + d.dx, y: y + d.dy };
}
