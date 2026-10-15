// Grundwerkzeuge fuer die selbst erstellte Pixelgrafik: Canvas, Zufall mit Startwert, Farben,
// Raster aus Zeichenketten (mit optionaler Spiegelung fuer symmetrische Figuren).

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

// Deterministischer Zufall (mulberry32)
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Kleiner Hash fuer Texturen (gleiche Kachelposition = gleiches Muster)
export function hash(x, y, i = 0) {
  let h = (x * 374761393 + y * 668265263 + i * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
// amount > 0 hellt auf, < 0 dunkelt ab
export function shade(hex, amount) {
  const c = hexToRgb(hex);
  return rgbToHex(c.map((v) => (amount >= 0 ? v + (255 - v) * amount : v * (1 + amount))));
}
export function mix(a, b, t) {
  const x = hexToRgb(a); const y = hexToRgb(b);
  return rgbToHex(x.map((v, i) => v + (y[i] - v) * t));
}
export function hueShift(hex, deg, sat = 1) {
  let [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b); const min = Math.min(r, g, b);
  let h = 0; let s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  h = (h + deg / 360 + 1) % 1; s = Math.min(1, s * sat);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return rgbToHex(s === 0 ? [l * 255, l * 255, l * 255] : [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]);
}

// Zeichnet ein Raster aus Zeichenketten. '.' und ' ' sind transparent.
// mirror: Zeilen enthalten nur die linke Haelfte und werden gespiegelt ergaenzt.
export function drawRows(g, rows, pal, ox = 0, oy = 0, { mirror = false, flip = false, rightPal = null } = {}) {
  for (let y = 0; y < rows.length; y++) {
    let row = rows[y];
    if (mirror) row = row + [...row].reverse().join('');
    if (flip) row = [...row].reverse().join('');
    const half = row.length / 2;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const p = rightPal && x >= half ? (rightPal[ch] ?? pal[ch]) : pal[ch];
      if (!p) continue;
      g.fillStyle = p;
      g.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

export function px(g, color, x, y, w = 1, h = 1) { g.fillStyle = color; g.fillRect(x, y, w, h); }

// Winzige 3x5-Pixelschrift fuer Gebaeudeschilder
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', K: '101101110101101',
  L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010',
  W: '101101111111101', Z: '111001010100111', '-': '000000111000000', ' ': '000000000000000'
};
export function text3x5(g, str, x, y, color) {
  g.fillStyle = color;
  for (const ch of str.toUpperCase()) {
    const f = FONT[ch] || FONT[' '];
    for (let i = 0; i < 15; i++) if (f[i] === '1') g.fillRect(x + (i % 3), y + Math.floor(i / 3), 1, 1);
    x += 4;
  }
}
export const textWidth3x5 = (str) => str.length * 4 - 1;
