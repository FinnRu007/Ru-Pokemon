// Baut aus den Original-Overworld-Sprites (eine Spalte, Bilder untereinander: je 4 fuer oben, unten,
// links, rechts) ein Blatt im Format der eigenen Figuren: Spalten stehen/Schritt A/Schritt B,
// Zeilen down, left, right, up. Bis das Bild geladen ist, liefert overworldSheet null.
import { hasReal } from './monsters.js';
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

// { sheet, fw } fuer eine Figur ({ name, look }) oder den Spieler (player = true), sonst null
export function overworldSheet(o, player = false) {
  const file = (player ? [OW_PLAYER] : overworldFor(o)).find((f) => hasReal('overworld', f));
  if (!file) return null;
  const e = sheets.get(file) || load(file);
  return e.sheet ? e : null;
}
