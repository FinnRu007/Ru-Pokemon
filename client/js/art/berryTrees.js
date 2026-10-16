// Beerenbeete auf der Original-Oberwelt: weicher Boden (eigene Grafik, dunkler wenn feucht) und die
// Beerenpflanzen aus Platin (res/graphics/field_sprites/berry_trees, geladen von `npm run sprites`
// nach client/sprites/berry_trees/). Jede Datei hat zwei Bilder untereinander (die Pflanze wiegt sich).
// Fehlt eine Datei, zeichnet eine einfache eigene Pflanze die Wachstumsstufe.
import { BERRIES, STAGE } from '/shared/data/berries.js';

const cache = new Map(); // Dateiname -> Image | false (fehlt) | null (laedt)
function image(file) {
  if (cache.has(file)) return cache.get(file);
  cache.set(file, null);
  const img = new Image();
  img.onload = () => cache.set(file, img);
  img.onerror = () => cache.set(file, false);
  img.src = `/sprites/berry_trees/${file}.png`;
  return null;
}

const STAGE_FILE = { [STAGE.GROWING]: 'growing', [STAGE.BLOOMING]: 'blooming', [STAGE.FRUIT]: 'fruit' };
// Bild der Pflanze fuer Beere b und Stufe: { img, sy, h } oder null (dann eigene Grafik)
function frameOf(b, stage, now) {
  const k = BERRIES[b - 1]?.[0];
  if (!k) return null;
  const f = Math.floor(now / 500) % 2;
  if (stage === STAGE.SPROUTED) {
    const img = image('berry_sprout');
    return img ? { img, sy: (img.height >= 32 ? f : 0) * 16, h: 16 } : null;
  }
  const name = `${k}_${STAGE_FILE[stage]}`;
  // Labrus und Apiko bluehen mit zwei einzelnen Bildern
  if (stage === STAGE.BLOOMING && (k === 'grepa' || k === 'apicot')) {
    const img = image(`${name}_${f + 1}`) || image(`${name}_1`);
    return img ? { img, sy: 0, h: 32 } : null;
  }
  const img = image(name);
  return img ? { img, sy: (img.height >= 64 ? f : 0) * 32, h: 32 } : null;
}

// Feuchte 0 sehr trocken, 1 trocken, 2 feucht
const SOIL = [['#a98a5e', '#8c6d45'], ['#80603b', '#664a2b'], ['#5b3d22', '#432b16']];
export function drawSoil(g, x, y, S, moisture, mulch) {
  const [c, d] = SOIL[moisture] || SOIL[1];
  const px = (ax, ay, w, h, col) => { g.fillStyle = col; g.fillRect(x + ax * S, y + ay * S, w * S, h * S); };
  px(2, 3, 12, 11, d); px(1, 4, 14, 9, d);
  px(2, 4, 12, 9, c); px(3, 3, 10, 1, c);
  for (const [ax, ay] of [[4, 6], [8, 5], [11, 7], [5, 10], [9, 9], [12, 11], [3, 8]]) px(ax, ay, 2, 1, d);
  // Mulch: helle Krumen auf der Erde
  if (mulch) for (const [ax, ay] of [[5, 5], [10, 6], [6, 9], [11, 10], [3, 11], [8, 7]]) px(ax, ay, 1, 1, ['', '#9fc46a', '#7fb0d8', '#e0c070', '#d07ab0'][mulch]);
}

// Eigene Ersatzgrafik: Keimling, junge Pflanze, Bluete, Fruechte in einer Farbe je Beere
const HUE = (b) => (b * 47) % 360;
function drawOwn(g, cx, base, S, b, stage, now) {
  const sway = Math.floor(now / 500) % 2 ? S : 0;
  const px = (ax, ay, w, h, col) => { g.fillStyle = col; g.fillRect(cx + ax * S + (ay < -4 ? sway : 0), base + ay * S, w * S, h * S); };
  const leaf = '#3f9a3a', dark = '#2a6a28', stem = '#6b4a2a';
  if (stage === STAGE.PLANTED) { px(-1, -2, 2, 1, '#43301c'); return; }
  if (stage === STAGE.SPROUTED) { px(0, -4, 1, 4, dark); px(-3, -6, 3, 2, leaf); px(1, -6, 3, 2, leaf); return; }
  const h = stage === STAGE.GROWING ? 12 : 18;
  px(0, -h, 1, h, stem);
  px(-4, -h + 2, 9, 4, leaf); px(-5, -h + 6, 11, 5, leaf); px(-3, -h + 11, 7, 2, dark);
  if (stage === STAGE.BLOOMING) for (const [ax, ay] of [[-3, 3], [2, 4], [-1, 8], [3, 9], [-4, 9]]) px(ax, -h + ay, 2, 2, '#f4a6c8');
  if (stage === STAGE.FRUIT) for (const [ax, ay] of [[-3, 3], [2, 4], [-1, 8], [3, 9], [-4, 9]]) px(ax, -h + ay, 2, 2, `hsl(${HUE(b)},70%,50%)`);
}

// Pflanze auf dem Beet; x, y = linke obere Ecke der Kachel auf dem Bildschirm
export function drawBerryTree(g, x, y, S, b, stage, now) {
  if (!b || stage === STAGE.NONE) return 0;
  const fr = stage === STAGE.PLANTED ? null : frameOf(b, stage, now);
  if (fr) {
    // Stamm (Zeile 27 bzw. 11 im Bild) steht in der Mitte der Kachel
    const top = y + (12 - (fr.h === 16 ? 11 : 27)) * S;
    g.drawImage(fr.img, 0, fr.sy, 16, fr.h, x, top, 16 * S, fr.h * S);
    return fr.h - 4;
  }
  drawOwn(g, x + 8 * S, y + 12 * S, S, b, stage, now);
  return stage === STAGE.SPROUTED ? 12 : stage === STAGE.PLANTED ? 0 : 22;
}
