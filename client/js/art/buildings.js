// Gebaeude werden als Ganzes gemalt (Dach, Wand, Fenster, Tuer, Schild), passend zur Groesse
// des Rechtecks aus der Karte. Stile: house, center, mart, lab, gym, school, tower, big.
import { px, shade, text3x5, textWidth3x5 } from './pixel.js';

const STYLES = {
  house: { roof: '#c8583e', wall: '#f4ead2' },
  house2: { roof: '#4a7cc8', wall: '#f4ead2' },
  house3: { roof: '#5aa452', wall: '#f2ecd8' },
  house4: { roof: '#a066b8', wall: '#f4ead2' },
  house5: { roof: '#d48a38', wall: '#f6eed8' },
  center: { roof: '#e24848', wall: '#fbf6ee', sign: 'P', signBg: '#e24848', glassDoor: true },
  mart: { roof: '#3f88dc', wall: '#fbf6ee', sign: 'SHOP', signBg: '#3f88dc', glassDoor: true },
  lab: { roof: '#6e8c9c', wall: '#eef0ea', sign: 'LABOR', signBg: '#4c6676', wide: true },
  gym: { roof: '#9a6a44', wall: '#d8c8a8', sign: 'ARENA', signBg: '#6a4426', glassDoor: true },
  school: { roof: '#d0a040', wall: '#f6eed8', sign: 'SCHULE', signBg: '#8a6420' },
  tv: { roof: '#7a5ac8', wall: '#eeeaf6', sign: 'TV', signBg: '#5a3aa8', glassDoor: true },
  corp: { roof: '#5a6a80', wall: '#dde4ee', sign: 'POKECOM', signBg: '#3a4a60', glassDoor: true, tall: true },
  mine: { roof: '#6a5a4a', wall: '#a8988a', sign: 'MINE', signBg: '#4a3a2a' },
  galactic: { roof: '#3f8f9c', wall: '#d6dee6', sign: 'GALAKTIK', signBg: '#2a5866', glassDoor: true, tall: true },
  plant: { roof: '#8a9aa8', wall: '#e6ecf0', sign: 'KRAFTWERK', signBg: '#5a6a7a', glassDoor: true },
  shop: { roof: '#e07890', wall: '#fbf2ee', sign: 'BLUMEN', signBg: '#c04868' },
  bike: { roof: '#f0a030', wall: '#fbf2e6', sign: 'RAD', signBg: '#c07010' },
  contest: { roof: '#d86aa8', wall: '#fbeef6', sign: 'SHOW', signBg: '#a8407a', glassDoor: true },
  store: { roof: '#4a9a7a', wall: '#eef6f2', sign: 'KAUFHAUS', signBg: '#2a6a50', glassDoor: true, tall: true },
  library: { roof: '#7a5a3a', wall: '#efe4d0', sign: 'BIBLIOTHEK', signBg: '#5a3a1a' },
  lighthouse: { roof: '#e85a3a', wall: '#f6f6f6', sign: 'TURM', signBg: '#a83a2a', tall: true },
  league: { roof: '#4858b8', wall: '#eef0fa', sign: 'LIGA', signBg: '#2a3488', glassDoor: true, tall: true },
  temple: { roof: '#8a7a9a', wall: '#e6e0ea', sign: 'TEMPEL', signBg: '#5a4a6a' },
  gate: { roof: '#6a8a5a', wall: '#eef0e6', sign: 'TOR', signBg: '#4a6a3a', glassDoor: true }
};
const HOUSE_STYLES = ['house', 'house2', 'house3', 'house4', 'house5'];

export function styleFor(b, index) {
  if (b.style && STYLES[b.style]) return STYLES[b.style];
  if (b.doors.some((d) => d.kind === 'C')) return STYLES.center;
  return STYLES[HOUSE_STYLES[index % HOUSE_STYLES.length]];
}

export function paintBuilding(g, b, index = 0) {
  const st = styleFor(b, index);
  const X = b.x * 16; const Y = b.y * 16; const W = b.w * 16; const H = b.h * 16;
  const wallH = b.h >= 5 ? 30 : b.h >= 4 ? 26 : 19;
  const roofH = H - wallH;
  const outline = '#2a2420';

  // Schatten am Boden
  px(g, 'rgba(0,0,0,.22)', X + 2, Y + H, W - 2, 2);

  // Dach: Ueberstand, Ziegelreihen, First, Traufe
  const roof = st.roof; const roofDark = shade(roof, -0.32); const roofLight = shade(roof, 0.28);
  px(g, outline, X, Y + 1, W, roofH);
  px(g, roof, X + 1, Y + 2, W - 2, roofH - 3);
  px(g, roofLight, X + 2, Y + 2, W - 4, 2);
  for (let ry = Y + 5; ry < Y + roofH - 4; ry += 4) {
    px(g, roofLight, X + 1, ry, W - 2, 1);
    px(g, roofDark, X + 1, ry + 3, W - 2, 1);
  }
  px(g, roofDark, X + 1, Y + roofH - 3, W - 2, 2);
  px(g, outline, X, Y + roofH - 1, W, 1);
  px(g, outline, X + 1, Y, W - 2, 1);

  // Wand
  const wall = st.wall; const wallDark = shade(wall, -0.18);
  const wy = Y + roofH;
  px(g, outline, X + 1, wy, W - 2, wallH);
  px(g, wall, X + 2, wy, W - 4, wallH - 1);
  px(g, wallDark, X + 2, wy, W - 4, 2);
  px(g, wallDark, X + 2, wy + wallH - 3, W - 4, 2);

  // Fenster in jeder Spalte ohne Tuer
  const doorCols = new Set(b.doors.map((d) => d.x - b.x));
  for (let c = 0; c < b.w; c++) {
    if (doorCols.has(c)) continue;
    if (b.w > 2 && (c === 0 || c === b.w - 1) && b.w < 5) continue;
    const fx = X + c * 16 + 3; const fy = wy + 4;
    const fh = Math.min(9, wallH - 9);
    px(g, outline, fx, fy, 10, fh + 2);
    px(g, '#7cb4e6', fx + 1, fy + 1, 8, fh);
    px(g, '#b8dcff', fx + 1, fy + 1, 3, fh - 2);
    px(g, '#ffffff', fx + 2, fy + 2, 1, 2);
    px(g, '#f4f0e6', fx + 4, fy + 1, 1, fh);
  }

  // Tueren
  for (const d of b.doors) {
    const dx = d.x * 16 + 3; const dh = Math.min(15, wallH - 3); const dy = wy + wallH - dh - 1;
    if (st.glassDoor || d.kind === 'C') {
      px(g, outline, dx - 1, dy - 1, 12, dh + 1);
      px(g, '#9ad0f0', dx, dy, 10, dh);
      px(g, '#d8f0ff', dx, dy, 4, dh);
      px(g, outline, dx + 4, dy, 1, dh);
      px(g, '#6aa0c8', dx + 5, dy, 5, dh);
    } else {
      px(g, outline, dx - 1, dy - 1, 12, dh + 1);
      px(g, '#9a6638', dx, dy, 10, dh);
      px(g, '#b88050', dx + 1, dy + 1, 3, dh - 2);
      px(g, '#6e4422', dx + 8, dy + 1, 1, dh - 1);
      px(g, '#f0d070', dx + 7, dy + Math.floor(dh / 2), 1, 1);
    }
    px(g, '#d8c8a0', dx - 1, Y + H - 1, 12, 1);
  }

  // Schild ueber der Tuer bzw. auf dem Dach
  if (st.sign) {
    const tw = textWidth3x5(st.sign);
    const sw = tw + 6; const sx = X + Math.floor((W - sw) / 2); const sy = Y + Math.max(3, roofH - 13);
    px(g, outline, sx - 1, sy - 1, sw + 2, 11);
    px(g, '#ffffff', sx, sy, sw, 9);
    px(g, st.signBg, sx + 1, sy + 1, sw - 2, 7);
    text3x5(g, st.sign, sx + 3, sy + 2, '#ffffff');
  }
}
