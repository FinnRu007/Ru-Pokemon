// Ordnet Kartenzeichen den Kachel-Malfunktionen zu und erkennt Gebaeude in der Karte.
import {
  paintGrass, paintPath, paintTall, paintTree, paintWater, paintLedge, paintFlowers, paintFence, paintSign, paintSand,
  paintCrackedRock, paintSmallTree, paintHeavyBoulder, paintClimbWall, paintWaterfall, paintBridge, paintSnow
} from './tiles.js';
import { px } from './pixel.js';
import { paintRealTile } from './realTiles.js';
import {
  THEMES, paintFloor, paintWall, paintCounter, paintShelf, paintTable, paintPlant, paintMachine, paintTv, paintBed,
  paintStairs, paintMat, paintBoulder, paintRock, paintCaveMouth, paintCoal
} from './interior.js';

const OUTDOOR_ROCK = { rock: '#a08c70', top: '#6a5a46' };
const INDOOR = new Set(['_', 'W', 'K', 'B', 'T', 'Y', 'P', 'V', 'R', 'U', 'E', ':']);

const BUILDING = new Set(['H', 'D', 'C']);

export function isIndoor(map) { return !!map.indoor; }

// Eigene Farbpaletten pro Karte (map.palette ueberschreibt die Themenfarben, z. B. Arenen)
const PALETTES = new WeakMap();
function themeOf(map, theme) {
  if (!map.palette) return THEMES[theme] || THEMES.house;
  if (!PALETTES.has(map)) PALETTES.set(map, { ...(THEMES[theme] || THEMES.house), ...map.palette });
  return PALETTES.get(map);
}

// open: Menge von Hinderniszeichen, die der Spieler schon beseitigt hat (gemalt als Boden)
export function paintTile(g, map, x, y, frame, pass, open) {
  let t = map.tiles[y][x];
  if (open && (open.has(t) || open.at?.(x, y, t))) t = map.indoor ? ':' : (map.tint === 'snow' ? 'n' : ',');
  const ox = x * 16; const oy = y * 16;
  const n = (dx, dy) => map.tiles[y + dy]?.[x + dx] ?? null;
  const theme = map.theme || 'house';
  const th = themeOf(map, theme);
  if (paintRealTile(g, map, x, y, frame, pass, t, n)) return;
  if (pass === 'object') {
    if (t === '#') paintTree(g, ox, oy);
    else if (t === 'B') paintShelf(g, ox, oy, x, y, theme);
    else if (t === 'P') paintMachine(g, ox, oy, x, y, theme);
    else if (t === 'Y') paintPlant(g, ox, oy);
    return;
  }
  if (INDOOR.has(t) || (map.indoor && t === 'O')) {
    if (t === 'W') return paintWall(g, ox, oy, x, y, n, th);
    paintFloor(g, ox, oy, x, y, th, theme === 'cave' || t === ':' ? (theme === 'gym' ? 'gym' : 'cave') : theme);
    switch (t) {
      case 'K': return paintCounter(g, ox, oy, x, y, n, th);
      case 'T': return paintTable(g, ox, oy, x, y, n);
      case 'V': return paintTv(g, ox, oy, x, y, n, theme);
      case 'R': return paintBed(g, ox, oy, x, y, n);
      case 'U': return paintStairs(g, ox, oy);
      case 'E': return paintMat(g, ox, oy);
      case 'O': return paintBoulder(g, ox, oy);
      default: return;
    }
  }
  const rockPal = map.indoor ? (th.rock ? th : THEMES.cave) : OUTDOOR_ROCK;
  const ground = () => (map.indoor ? paintFloor(g, ox, oy, x, y, th.rock ? th : THEMES.cave, 'cave') : map.tint === 'snow' ? paintSnow(g, ox, oy, x, y) : paintGrass(g, ox, oy, x, y));
  switch (t) {
    case 'Q': ground(); return paintCrackedRock(g, ox, oy);
    case 'Z': ground(); return paintSmallTree(g, ox, oy);
    case 'M': ground(); return paintHeavyBoulder(g, ox, oy);
    case 'N': return paintClimbWall(g, ox, oy, x, y, n, rockPal);
    case 'J': return paintWaterfall(g, ox, oy, x, y, frame);
    case 'b': return paintBridge(g, ox, oy, x, y, n);
    case 'n': return paintSnow(g, ox, oy, x, y);
    case 'X': return paintRock(g, ox, oy, x, y, n, rockPal);
    case 'G': return paintCaveMouth(g, ox, oy, x, y, n, rockPal);
    case ';': return paintCoal(g, ox, oy, x, y);
    case 'O': ground(); return paintBoulder(g, ox, oy);
    case ',': return map.tint === 'snow' ? paintSnow(g, ox, oy, x, y) : paintGrass(g, ox, oy, x, y);
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
