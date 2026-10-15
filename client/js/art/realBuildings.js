// Gebaeude im Stil der 4. Generation aus einem Kachelsatz (Pokemon Essentials, Outside.png, geladen von
// `npm run sprites` nach client/sprites/field/, nicht im Repo). Die Vorlagen liegen in 32-px-Kacheln
// vor und werden halbiert gezeichnet. Breite und Hoehe passen sich der Karte an: Randspalten bleiben,
// mittlere Spalten und eine Dachreihe werden wiederholt oder weggelassen, die Tuer sitzt immer dort,
// wo sie auf der Karte ist. Fehlt die Datei, malt buildings.js die eigene Grafik.
let sheet = null;
const variants = new Map();

// col/row: linke obere Kachel, cols/rows: Groesse, door: Tuerspalte, top/rep/bottom: Zeilen (relativ)
const DEFS = {
  house3: { col: 0, row: 167, cols: 5, rows: 4, door: 2, top: [0], rep: 1, bottom: [2, 3] },
  house2: { col: 0, row: 171, cols: 5, rows: 4, door: 2, top: [0], rep: 1, bottom: [2, 3] },
  house4: { col: 3, row: 184, cols: 5, rows: 3, door: 2, top: [0], rep: 1, bottom: [2] },
  center: { col: 0, row: 326, cols: 5, rows: 5, door: 2, top: [0], rep: 1, bottom: [2, 3, 4], drop: [2] },
  mart: { col: 0, row: 331, cols: 5, rows: 4, door: 2, top: [0], rep: 1, bottom: [2, 3] },
  gym: { col: 0, row: 350, cols: 7, rows: 5, door: 3, top: [0], rep: 1, bottom: [2, 3, 4], drop: [2] }
};
// Weitere Hausfarben durch Farbdrehung der vorhandenen Haeuser
const TINTED = { house: ['house2', 'hue-rotate(150deg) saturate(1.2)'], house5: ['house3', 'hue-rotate(-75deg) saturate(1.3)'] };

export async function loadBuildings(index) {
  if (!index?.field?.includes('Outside')) return false;
  sheet = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = '/sprites/field/Outside.png'; });
  return !!sheet;
}
export const buildingsReady = () => !!sheet;

// Quelle fuer einen Stil (bei Farbvarianten eine eingefaerbte Kopie des Ausschnitts)
function source(style) {
  if (DEFS[style]) return { img: sheet, def: DEFS[style], ox: DEFS[style].col * 32, oy: DEFS[style].row * 32 };
  const t = TINTED[style];
  if (!t) return null;
  if (!variants.has(style)) {
    const d = DEFS[t[0]];
    const c = document.createElement('canvas'); c.width = d.cols * 32; c.height = d.rows * 32;
    const g = c.getContext('2d');
    g.drawImage(sheet, d.col * 32, d.row * 32, c.width, c.height, 0, 0, c.width, c.height);
    // Nur das Dach einfaerben (obere Haelfte), Waende und Fenster bleiben
    const roofH = Math.round(d.rows * 32 * 0.72);
    g.clearRect(0, 0, c.width, roofH);
    g.filter = t[1];
    g.drawImage(sheet, d.col * 32, d.row * 32, c.width, roofH, 0, 0, c.width, roofH);
    g.filter = 'none';
    variants.set(style, c);
  }
  return { img: variants.get(style), def: DEFS[t[0]], ox: 0, oy: 0 };
}

// Zeilenfolge fuer h Kacheln Hoehe
function rowsFor(d, h) {
  let mid = [d.rep];
  let bottom = d.bottom;
  let need = h - d.top.length - bottom.length;
  if (need < 1 && d.drop) { bottom = bottom.filter((r) => !d.drop.includes(r)); need = h - d.top.length - bottom.length; }
  if (need <= 0) mid = [];
  else mid = Array(need).fill(d.rep);
  const rows = [...d.top, ...mid, ...bottom];
  return rows.slice(Math.max(0, rows.length - Math.max(h, 2)));
}

// Liefert true, wenn das Gebaeude gemalt wurde
export function paintRealBuilding(g, b, style) {
  if (!sheet) return false;
  const src = source(style);
  if (!src) return false;
  const { img, def: d, ox, oy } = src;
  const W = b.w; const rows = rowsFor(d, b.h);
  const door = b.doors[0] ? b.doors[0].x - b.x : Math.floor(W / 2);
  const mids = []; for (let c = 1; c < d.cols - 1; c++) if (c !== d.door) mids.push(c);
  const colFor = (c) => {
    if (c === door) return d.door;
    if (c === 0) return 0;
    if (c === W - 1) return d.cols - 1;
    return mids[(c - 1) % mids.length];
  };
  const X = b.x * 16; const Y = (b.y + b.h - rows.length) * 16;
  // Schatten am Boden
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(X + 2, Y + rows.length * 16, W * 16 - 2, 2);
  rows.forEach((r, ry) => {
    for (let c = 0; c < W; c++) g.drawImage(img, ox + colFor(c) * 32, oy + r * 32, 32, 32, X + c * 16, Y + ry * 16, 16, 16);
  });
  return true;
}
