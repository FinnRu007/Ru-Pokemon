// Baut aus den Original-Overworld-Sprites (eine Spalte, Bilder untereinander: je 4 fuer oben, unten,
// links, rechts) ein Blatt im Format der eigenen Figuren: Spalten stehen/Schritt A/Schritt B,
// Zeilen down, left, right, up. Bis das Bild geladen ist, liefert overworldSheet null.
import { hasReal, hasFront } from './monsters.js';
import { overworldFor, OW_PLAYER } from './realOverworld.js';

const ROW_START = { down: 4, left: 8, right: 12, up: 0 };
const ROWS = ['down', 'left', 'right', 'up'];
const sheets = new Map();

function load(file) {
  const entry = { sheet: null, fw: 0 };
  sheets.set(file, entry);
  const img = new Image();
  img.onload = () => {
    const fw = img.width; const n = Math.floor(img.height / fw);
    const c = document.createElement('canvas'); c.width = fw * 3; c.height = fw * 4;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    ROWS.forEach((dir, r) => {
      const cols = n >= 16 ? [ROW_START[dir], ROW_START[dir] + 1, ROW_START[dir] + 3] : [0, 0, 0];
      cols.forEach((f, i) => g.drawImage(img, 0, f * fw, fw, fw, i * fw, r * fw, fw, fw));
    });
    entry.sheet = c; entry.fw = fw;
  };
  img.src = `/sprites/overworld/${file}.png`;
  return entry;
}

// Kampfbild als stehende Figur: zugeschnitten und auf 32x32 verkleinert, ein Bild fuer alle Richtungen
function loadMon(file) {
  const entry = { sheet: null, fw: 0 };
  sheets.set(file, entry);
  const img = new Image();
  img.onload = () => {
    const t = document.createElement('canvas'); t.width = img.width; t.height = img.height;
    const tg = t.getContext('2d'); tg.drawImage(img, 0, 0);
    const d = tg.getImageData(0, 0, t.width, t.height).data;
    let x0 = t.width, y0 = t.height, x1 = 0, y1 = 0;
    for (let y = 0; y < t.height; y++) for (let x = 0; x < t.width; x++) if (d[(y * t.width + x) * 4 + 3] > 20) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    if (x1 < x0) return;
    const fw = 32; const w = x1 - x0 + 1; const h = y1 - y0 + 1; const k = Math.min(1, (fw - 2) / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = fw * 3; c.height = fw * 4;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const dw = Math.round(w * k); const dh = Math.round(h * k);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) g.drawImage(img, x0, y0, w, h, i * fw + Math.round((fw - dw) / 2), r * fw + fw - dh, dw, dh);
    entry.sheet = c; entry.fw = fw;
  };
  img.src = `/sprites/front/${file.slice(4)}.png`;
  return entry;
}

// { sheet, fw } fuer eine Figur ({ name, look }) oder den Spieler (player = true), sonst null
export function overworldSheet(o, player = false, bike = false) {
  const file = (player ? (bike ? [OW_PLAYER + '_bike', OW_PLAYER] : [OW_PLAYER]) : overworldFor(o)).find((f) => (f.startsWith('mon:') ? hasFront(+f.slice(4)) : hasReal('overworld', f)));
  if (!file) return null;
  const e = sheets.get(file) || (file.startsWith('mon:') ? loadMon(file) : load(file));
  return e.sheet ? e : null;
}
