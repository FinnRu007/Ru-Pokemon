// Aussenkacheln mit den Original-Texturen aus Platin (siehe realField.js). paintRealTile liefert true,
// wenn es die Kachel gemalt hat, sonst malt tileset.js die eigene Pixelgrafik.
import { fieldReady, fieldTex, fieldObject } from './realField.js';
import { hash } from './pixel.js';

// Wegartige Felder: an ihnen bekommt ein Weg keinen Grasrand
const PATHLIKE = new Set(['.', 'D', 'C', 'H', 'S', 'b', null]);
const SANDLIKE = new Set(['=', 'D', 'C', 'H', 'S', 'b', '~', null]);

function blit(g, img, sx, sy, w, h, dx, dy, flip = false) {
  if (!img) return;
  if (!flip) { g.drawImage(img, sx, sy, w, h, dx, dy, w, h); return; }
  g.save(); g.translate(dx + w, dy); g.scale(-1, 1); g.drawImage(img, sx, sy, w, h, 0, 0, w, h); g.restore();
}

// Kachel aus einer groesseren Textur fortlaufend wiederholen (z. B. 32x32-Klippen)
function tiled(g, img, x, y, ox, oy, shiftX = 0) {
  const w = img.width; const h = img.height;
  const sx = ((x * 16 + shiftX) % w + w) % w; const sy = (y * 16) % h;
  for (let dy = 0; dy < 16; dy += 8) for (let dx = 0; dx < 16; dx += 8) {
    g.drawImage(img, (sx + dx) % w, (sy + dy) % h, 8, 8, ox + dx, oy + dy, 8, 8);
  }
}

// Wellige Raender: der untere Streifen der 32x32-Randtextur (Flaeche oben, Gras unten) wird fuer
// jede Seite gedreht. inside(dx, dy) sagt, ob der Nachbar zur Flaeche gehoert.
const strips = new Map();
function stripsOf(edge) {
  if (strips.has(edge)) return strips.get(edge);
  const make = (rot) => {
    const c = document.createElement('canvas'); c.width = rot % 2 ? 8 : 32; c.height = rot % 2 ? 32 : 8;
    const g = c.getContext('2d');
    g.save();
    if (rot === 0) g.drawImage(edge, 0, 24, 32, 8, 0, 0, 32, 8);                      // unten
    if (rot === 2) { g.translate(0, 8); g.scale(1, -1); g.drawImage(edge, 0, 24, 32, 8, 0, 0, 32, 8); } // oben
    if (rot === 1) { g.translate(8, 0); g.rotate(Math.PI / 2); g.drawImage(edge, 0, 24, 32, 8, 0, 0, 32, 8); } // links
    if (rot === 3) { g.translate(0, 32); g.rotate(-Math.PI / 2); g.drawImage(edge, 0, 24, 32, 8, 0, 0, 32, 8); } // rechts
    g.restore();
    return c;
  };
  const out = { s: make(0), w: make(1), n: make(2), e: make(3) };
  strips.set(edge, out);
  return out;
}
function edged(g, base, edge, ox, oy, x, y, inside) {
  g.drawImage(base, 0, 0, 16, 16, ox, oy, 16, 16);
  const st = stripsOf(edge);
  const px = (x % 2) * 16; const py = (y % 2) * 16;
  if (!inside(0, 1)) g.drawImage(st.s, px, 0, 16, 8, ox, oy + 8, 16, 8);
  if (!inside(0, -1)) g.drawImage(st.n, px, 0, 16, 8, ox, oy, 16, 8);
  if (!inside(-1, 0)) g.drawImage(st.e, 0, py, 8, 16, ox, oy, 8, 16);
  if (!inside(1, 0)) g.drawImage(st.w, 0, py, 8, 16, ox + 8, oy, 8, 16);
}

const isSnow = (map) => map.tint === 'snow';

function ground(g, map, ox, oy) {
  const t = fieldTex('lgreen', isSnow(map));
  if (t) g.drawImage(t, 0, 0, 16, 16, ox, oy, 16, 16);
}

export function paintRealTile(g, map, x, y, frame, pass, t, n) {
  if (!fieldReady() || map.indoor) return false;
  const snow = isSnow(map);
  const ox = x * 16; const oy = y * 16;
  if (pass === 'object') {
    if (t !== '#') return t === ',' || t === '.' || t === '"' || t === '*' || t === '=' || t === '~' || t === 'X';
    paintTreeAt(g, map, x, y, n, snow);
    return true;
  }
  switch (t) {
    case ',': case '#': ground(g, map, ox, oy); return true;
    case '.': case 'D': case 'C': case 'H': {
      const base = fieldTex('nsand', snow); const edge = fieldTex('nsandp', snow);
      if (!base || !edge) return false;
      if (t !== '.') { g.drawImage(base, ox, oy); return true; }
      edged(g, base, edge, ox, oy, x, y, (dx, dy) => PATHLIKE.has(n(dx, dy)));
      return true;
    }
    case '=': {
      const base = fieldTex('beach', snow); const edge = fieldTex('beachp', snow);
      if (!base || !edge) return false;
      edged(g, base, edge, ox, oy, x, y, (dx, dy) => SANDLIKE.has(n(dx, dy)) || n(dx, dy) === '.');
      return true;
    }
    case '"': {
      const tall = fieldTex('ngrass', snow);
      if (!tall) return false;
      g.drawImage(tall, ox, oy);
      return true;
    }
    case '*': {
      ground(g, map, ox, oy);
      const kinds = ['rhana', 'nhana', 'shana'];
      const f = fieldTex(kinds[Math.floor(hash(x >> 1, y >> 1, 4) * 3)], snow) || fieldTex('rhana', snow);
      if (f) g.drawImage(f, ox, oy);
      return true;
    }
    case '~': {
      const sea = fieldTex('sea', snow);
      if (!sea) return false;
      tiled(g, sea, x, y, ox, oy, frame * 2);
      // Ufer: heller Schaum zu Land hin
      const land = (dx, dy) => { const k = n(dx, dy); return k !== null && k !== '~' && k !== 'J' && k !== 'b'; };
      g.fillStyle = 'rgba(230,244,255,.85)';
      if (land(0, -1)) g.fillRect(ox, oy, 16, 2);
      if (land(0, 1)) g.fillRect(ox, oy + 14, 16, 2);
      if (land(-1, 0)) g.fillRect(ox, oy, 2, 16);
      if (land(1, 0)) g.fillRect(ox + 14, oy, 2, 16);
      return true;
    }
    case 'X': {
      const c = fieldTex(snow ? 'a9_criffp' : 'criffp', snow) || fieldTex('criffp', snow);
      if (!c) return false;
      tiled(g, c, x, y, ox, oy);
      return true;
    }
    case 'J': {
      const w = fieldTex('taki', snow);
      if (!w) return false;
      tiled(g, w, x, y + frame, ox, oy);
      return true;
    }
    case 'F': {
      ground(g, map, ox, oy);
      const f = fieldTex('imped', snow);
      if (!f) return false;
      g.drawImage(f, (x % 2) * 16, 0, 16, 16, ox, oy, 16, 16);
      return true;
    }
    case 'Q': case 'Z': case 'M': {
      ground(g, map, ox, oy);
      const o = fieldObject({ Q: 'rock_smash', Z: 'cut_tree', M: 'strength_boulder' }[t]);
      if (!o) return false;
      // Baum zum Zerschneiden: 32x32-Bild mit zwei Bildern nebeneinander? Nur das erste 16x16-Feld unten mittig
      if (o.width > 16) g.drawImage(o, 0, 0, 16, 16, ox, oy, 16, 16);
      else g.drawImage(o, ox, oy);
      return true;
    }
    default: return false;
  }
}

// Baeume wie in Platin aus Schichten: Stumpf mit Schatten, dunkle Krone, helle Krone, Spitze.
// Volle 2x2-Bloecke (an geraden Koordinaten) werden ein grosser Baum, einzelne Felder ein kleiner.
function paintTreeAt(g, map, x, y, n, snow) {
  const bx = x - (x & 1); const by = y - (y & 1);
  const full = [[0, 0], [1, 0], [0, 1], [1, 1]].every(([dx, dy]) => map.tiles[by + dy]?.[bx + dx] === '#');
  const a = fieldTex(snow ? 'tree2_01' : 'tree01', snow);
  if (!a) return;
  if (full) {
    // Nur einmal pro Block malen (unten rechts, damit Reihen darunter darueberliegen)
    if (x !== bx + 1 || y !== by + 1) return;
    const X = bx * 16; const Y = by * 16;
    g.drawImage(a, 32, 0, 32, 32, X, Y + 4, 32, 32);      // Stumpf mit Schatten
    g.drawImage(a, 32, 32, 32, 32, X, Y - 6, 32, 32);     // dunkle Krone
    g.drawImage(a, 0, 0, 32, 30, X, Y - 12, 32, 30);      // helle Krone
    g.drawImage(a, 0, 32, 24, 28, X + 4, Y - 18, 24, 28); // Spitze
    void n;
    return;
  }
  // Waagrechtes Paar: ein Baum ueber zwei Felder, die Krone ragt nach oben
  const T = (dx) => map.tiles[y]?.[bx + dx] === '#';
  if (T(0) && T(1)) {
    if (x !== bx + 1) return;
    const X = bx * 16; const Y = y * 16;
    g.drawImage(a, 32, 4, 32, 28, X, Y - 6, 32, 22);
    g.drawImage(a, 32, 32, 32, 32, X + 1, Y - 18, 30, 28);
    g.drawImage(a, 0, 0, 32, 30, X + 2, Y - 23, 28, 26);
    g.drawImage(a, 0, 32, 24, 28, X + 6, Y - 28, 20, 23);
    return;
  }
  // Kleiner Baum auf einem Feld
  const X = x * 16; const Y = y * 16;
  g.drawImage(a, 32, 0, 32, 32, X, Y + 2, 16, 16);
  g.drawImage(a, 32, 32, 32, 32, X, Y - 3, 16, 16);
  g.drawImage(a, 0, 0, 32, 30, X, Y - 6, 16, 15);
  g.drawImage(a, 0, 32, 24, 28, X + 2, Y - 9, 12, 14);
}

// Wald ausserhalb der Karte: 32x32-Kachel mit einem grossen Baum (wiederholbar)
export function forestTile(snow) {
  const a = fieldTex(snow ? 'tree2_01' : 'tree01', snow); const gr = fieldTex('lgreen', snow);
  if (!a || !gr) return null;
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  const g = c.getContext('2d');
  for (let y = 0; y < 32; y += 16) for (let x = 0; x < 32; x += 16) g.drawImage(gr, x, y);
  for (const Y of [32, 0]) {
    g.drawImage(a, 32, 0, 32, 32, 0, Y + 4, 32, 32);
    g.drawImage(a, 32, 32, 32, 32, 0, Y - 6, 32, 32);
    g.drawImage(a, 0, 0, 32, 30, 0, Y - 12, 32, 30);
    g.drawImage(a, 0, 32, 24, 28, 4, Y - 18, 24, 28);
  }
  return c;
}
