// Selbst gezeichnete 16x16-Kacheln im Stil der DS-Generation. Jede Kachel wird als Funktion
// gemalt, damit Raender (Wege, Ufer, Zaeune) automatisch an die Nachbarn angepasst werden.
import { drawRows, hash, px, shade } from './pixel.js';

export const C = {
  grass: '#88cf68', grassDark: '#6cb450', grassLight: '#a6e27e',
  path: '#e9dca8', pathDark: '#d4c48a', pathEdge: '#bfa870', pathLight: '#f5ecc4',
  tall: '#4fa844', tallDark: '#2f7a2e', tallLight: '#7ccb5c', tallTip: '#a4e07a',
  canopy: '#3f9a46', canopyDark: '#28703a', canopyLight: '#64be58', treeLine: '#173f22', trunk: '#80542e', trunkDark: '#5a3a1e',
  water: '#5a98e8', waterDark: '#3f78cc', waterLight: '#8ec0f6', foam: '#e6f4ff',
  ledge: '#5f9a3e', ledgeDark: '#3f6e2a', ledgeLight: '#b4e488',
  wood: '#b8844c', woodDark: '#7a5230', woodLight: '#e0b478',
  fence: '#f4f0e6', fenceDark: '#a8a090',
  sand: '#f0e0a8', sandDark: '#dcc888'
};

const TREE = [
  '.....ooo', '...oolll', '..ollllg', '.olllggg', '.ollgggd', 'olgggdgg', 'olggdggg', 'oggggggd',
  'ogggdggg', 'odggggdd', 'oddgddgg', '.oddddgd', '.oddoddd', '..oo.odd', '.....oot', '......ot',
  '......ot', '.....ott', '......oo'
];
const TREE_PAL = { o: C.treeLine, l: C.canopyLight, g: C.canopy, d: C.canopyDark, t: C.trunk };
const TREE_RIGHT = { l: C.canopy, g: C.canopy, t: C.trunkDark };

const TUFT = ['l...l', 'gl.lg', 'dg.gd', 'dgggd', '.ddd.'];
const TUFT_PAL = { l: C.tallTip, g: C.tallLight, d: C.tallDark };

export function paintGrass(g, ox, oy, x, y) {
  px(g, C.grass, ox, oy, 16, 16);
  // kleine Grashalme an festen Zufallsstellen
  for (let i = 0; i < 3; i++) {
    const hx = Math.floor(hash(x, y, i) * 13) + 1; const hy = Math.floor(hash(x, y, i + 7) * 13) + 1;
    px(g, C.grassDark, ox + hx, oy + hy + 1); px(g, C.grassDark, ox + hx + 2, oy + hy + 1); px(g, C.grassDark, ox + hx + 1, oy + hy + 2);
    if (hash(x, y, i + 3) > 0.6) px(g, C.grassLight, ox + hx + 1, oy + hy);
  }
}

export function paintPath(g, ox, oy, x, y, n) {
  px(g, C.path, ox, oy, 16, 16);
  for (let i = 0; i < 5; i++) {
    const hx = Math.floor(hash(x, y, i) * 15); const hy = Math.floor(hash(x, y, i + 11) * 15);
    px(g, hash(x, y, i + 5) > 0.5 ? C.pathDark : C.pathLight, ox + hx, oy + hy);
  }
  const isPath = (t) => t === '.' || t === 'D' || t === 'C' || t === null || t === 'S' || t === '=';
  // Weiche Raender zu Gras und Hindernissen
  const edge = (side) => {
    if (side === 'n') { px(g, C.pathEdge, ox, oy, 16, 1); px(g, C.pathDark, ox, oy + 1, 16, 1); }
    if (side === 's') { px(g, C.pathDark, ox, oy + 14, 16, 1); px(g, C.pathEdge, ox, oy + 15, 16, 1); }
    if (side === 'w') { px(g, C.pathEdge, ox, oy, 1, 16); px(g, C.pathDark, ox + 1, oy, 1, 16); }
    if (side === 'e') { px(g, C.pathDark, ox + 14, oy, 1, 16); px(g, C.pathEdge, ox + 15, oy, 1, 16); }
  };
  if (!isPath(n(0, -1))) edge('n');
  if (!isPath(n(0, 1))) edge('s');
  if (!isPath(n(-1, 0))) edge('w');
  if (!isPath(n(1, 0))) edge('e');
}

export function paintTall(g, ox, oy, x, y, frame = 0) {
  px(g, C.tall, ox, oy, 16, 16);
  const sway = frame === 1 ? 1 : 0;
  drawTufts(g, ox, oy, sway, 0, 16);
}
// Nur die untere Haelfte: wird ueber die Fuesse von Figuren im hohen Gras gelegt.
export function paintTallOverlay(g, ox, oy) { drawTufts(g, ox, oy, 0, 8, 16); }
function drawTufts(g, ox, oy, sway, minY, maxY) {
  const spots = [[1, 1], [9, 1], [5, 8], [13, 8], [-3, 8]];
  for (const [tx, ty] of spots) {
    for (let r = 0; r < TUFT.length; r++) {
      const yy = ty + r + 2; if (yy < minY || yy >= maxY) continue;
      for (let c = 0; c < 5; c++) {
        const ch = TUFT[r][c]; if (ch === '.') continue;
        const xx = tx + c + (r < 2 ? sway : 0); if (xx < 0 || xx > 15) continue;
        px(g, TUFT_PAL[ch], ox + xx, oy + yy);
      }
    }
  }
}

// Baum: 16x19, ragt nach oben in die Kachel darueber (dichter Wald wie im Original)
export function paintTree(g, ox, oy) {
  drawRows(g, TREE, TREE_PAL, ox, oy - 3, { mirror: true, rightPal: TREE_RIGHT });
}

export function paintWater(g, ox, oy, x, y, n, frame = 0) {
  px(g, C.water, ox, oy, 16, 16);
  // Wellen wandern mit dem Animationsbild
  for (let i = 0; i < 3; i++) {
    const wy = (i * 5 + 2 + ((x + i) % 2) * 2) % 16;
    const wx = (Math.floor(hash(x, y, i) * 10) + frame * 2) % 16;
    px(g, C.waterLight, ox + wx, oy + wy, 3, 1);
    px(g, C.waterDark, ox + ((wx + 7) % 14), oy + ((wy + 3) % 16), 2, 1);
  }
  const land = (t) => t !== null && t !== '~';
  if (land(n(0, -1))) { px(g, C.foam, ox, oy, 16, 2); px(g, C.waterLight, ox, oy + 2, 16, 1); }
  if (land(n(0, 1))) { px(g, C.waterDark, ox, oy + 14, 16, 1); px(g, C.foam, ox, oy + 15, 16, 1); }
  if (land(n(-1, 0))) { px(g, C.foam, ox, oy, 2, 16); px(g, C.waterLight, ox + 2, oy, 1, 16); }
  if (land(n(1, 0))) { px(g, C.waterLight, ox + 13, oy, 1, 16); px(g, C.foam, ox + 14, oy, 2, 16); }
}

export function paintLedge(g, ox, oy, x, y, n) {
  paintGrass(g, ox, oy, x, y);
  px(g, C.ledgeLight, ox, oy + 9, 16, 2);
  px(g, C.ledge, ox, oy + 11, 16, 3);
  px(g, C.ledgeDark, ox, oy + 14, 16, 2);
  for (let i = 1; i < 16; i += 4) px(g, C.ledgeDark, ox + i, oy + 12, 1, 2);
  if (n(-1, 0) !== 'L') { px(g, C.ledgeDark, ox, oy + 9, 1, 7); }
  if (n(1, 0) !== 'L') { px(g, C.ledgeDark, ox + 15, oy + 9, 1, 7); }
}

const FLOWER = ['.w.', 'wyw', '.w.'];
export function paintFlowers(g, ox, oy, x, y, frame = 0) {
  paintGrass(g, ox, oy, x, y);
  const colors = ['#f04848', '#ffffff', '#f8d038', '#f080c0'];
  const petal = colors[Math.floor(hash(x, y, 9) * colors.length)];
  const spots = [[2, 2], [10, 4], [5, 10], [12, 11]];
  spots.forEach(([fx, fy], i) => {
    const s = (frame + i) % 2;
    drawRows(g, FLOWER, { w: petal, y: '#f8e070' }, ox + fx + (s ? 1 : 0), oy + fy);
    px(g, C.grassDark, ox + fx + 1, oy + fy + 3);
  });
}

export function paintFence(g, ox, oy, x, y, n) {
  paintGrass(g, ox, oy, x, y);
  const left = n(-1, 0) === 'F'; const right = n(1, 0) === 'F';
  const x0 = left ? 0 : 5; const x1 = right ? 16 : 11;
  px(g, C.fenceDark, ox + x0, oy + 6, x1 - x0, 1); px(g, C.fence, ox + x0, oy + 5, x1 - x0, 1);
  px(g, C.fenceDark, ox + x0, oy + 10, x1 - x0, 1); px(g, C.fence, ox + x0, oy + 9, x1 - x0, 1);
  px(g, C.fenceDark, ox + 6, oy + 3, 4, 11); px(g, C.fence, ox + 6, oy + 3, 3, 10); px(g, '#ffffff', ox + 6, oy + 3, 1, 9);
  px(g, 'rgba(0,0,0,.18)', ox + 5, oy + 14, 6, 1);
}

const SIGN = [
  'oooooooooooooo', 'olllllllllllld', 'olwwwwwwwwwwld', 'olwkkwkkwkwwld', 'olwwwwwwwwwwld', 'olwkwkkkwkkwld',
  'olwwwwwwwwwwld', 'odddddddddddd', '.....odo.....', '.....odo.....', '.....odo.....', '....ooooo....'
];
export function paintSign(g, ox, oy, x, y, n, ground = ',') {
  if (ground === '.') paintPath(g, ox, oy, x, y, () => '.'); else paintGrass(g, ox, oy, x, y);
  drawRows(g, SIGN, { o: C.woodDark, l: C.woodLight, d: C.woodDark, w: C.wood, k: C.woodDark }, ox + 1, oy + 2);
  px(g, 'rgba(0,0,0,.2)', ox + 4, oy + 14, 8, 1);
}

export function paintSand(g, ox, oy, x, y) {
  px(g, C.sand, ox, oy, 16, 16);
  for (let i = 0; i < 4; i++) px(g, C.sandDark, ox + Math.floor(hash(x, y, i) * 16), oy + Math.floor(hash(x, y, i + 4) * 16));
}

// Gemeinsamer Helfer: dunklerer Schattenwurf unter Objekten
export function dropShadow(g, ox, oy, w) { px(g, 'rgba(0,0,0,.18)', ox, oy, w, 1); }
export { shade };
