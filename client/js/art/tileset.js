// Ordnet Kartenzeichen den Kachel-Malfunktionen zu und erkennt Gebaeude in der Karte.
import {
  paintGrass, paintPath, paintTall, paintTree, paintWater, paintLedge, paintFlowers, paintFence, paintSign, paintSand
} from './tiles.js';
import { px } from './pixel.js';

const BUILDING = new Set(['H', 'D', 'C']);

export function isIndoor(map) { return !!map.indoor; }

export function paintTile(g, map, x, y, frame, pass) {
  const t = map.tiles[y][x];
  const ox = x * 16; const oy = y * 16;
  const n = (dx, dy) => map.tiles[y + dy]?.[x + dx] ?? null;
  if (pass === 'object') {
    if (t === '#') paintTree(g, ox, oy);
    return;
  }
  switch (t) {
    case ',': return paintGrass(g, ox, oy, x, y);
    case '.': return paintPath(g, ox, oy, x, y, n);
    case '"': return paintTall(g, ox, oy, x, y, frame);
    case '~': return paintWater(g, ox, oy, x, y, n, frame);
    case 'L': return paintLedge(g, ox, oy, x, y, n);
    case '*': return paintFlowers(g, ox, oy, x, y, frame);
    case 'F': return paintFence(g, ox, oy, x, y, n);
    case 'S': return paintSign(g, ox, oy, x, y, n, [n(0, 1), n(0, -1), n(-1, 0), n(1, 0)].includes('.') ? '.' : ',');
    case '=': return paintSand(g, ox, oy, x, y);
    case '#': return paintGrass(g, ox, oy, x, y);
    case 'H': return paintGrass(g, ox, oy, x, y);
    case 'D': case 'C': return paintPath(g, ox, oy, x, y, () => '.');
    default: return px(g, '#ff00ff', ox, oy, 16, 16);
  }
}

// Gebaeude: zusammenhaengende Rechtecke aus H/D/C. Karten koennen ueber map.buildings
// Stile vorgeben ({ x, y, style }: ein Punkt innerhalb des Gebaeudes genuegt).
export function findBuildings(map) {
  if (map._buildings) return map._buildings;
  const seen = new Set(); const out = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (!BUILDING.has(map.tiles[y][x]) || seen.has(x + ',' + y)) continue;
      let minX = x, maxX = x, minY = y, maxY = y; const doors = [];
      const stack = [[x, y]]; seen.add(x + ',' + y);
      while (stack.length) {
        const [cx, cy] = stack.pop();
        minX = Math.min(minX, cx); maxX = Math.max(maxX, cx); minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
        const t = map.tiles[cy][cx];
        if (t === 'D' || t === 'C') doors.push({ x: cx, y: cy, kind: t });
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx; const ny = cy + dy; const k = nx + ',' + ny;
          if (!seen.has(k) && BUILDING.has(map.tiles[ny]?.[nx])) { seen.add(k); stack.push([nx, ny]); }
        }
      }
      const b = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, doors };
      const hint = (map.buildings || []).find((h) => h.x >= b.x && h.x < b.x + b.w && h.y >= b.y && h.y < b.y + b.h);
      if (hint) b.style = hint.style;
      out.push(b);
    }
  }
  Object.defineProperty(map, '_buildings', { value: out, enumerable: false });
  return out;
}
