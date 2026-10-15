// Prozedurale Pokemon-Sprites (eigene Pixelgrafik, keine Originalbilder).
// Aus Familie, Entwicklungsstufe und Typen entsteht immer dasselbe Wesen: Koerperbau,
// Farben, Ohren, Hoerner, Flossen und Augen werden aus einem Startwert abgeleitet.
// Entwicklungen einer Familie teilen den Grundbauplan und werden groesser und kantiger.
import { canvas, rng, shade, mix, hueShift } from './pixel.js';
import { TRAINER_BY_NAME, TRAINER_BY_CLASS, TRAINER_BY_LOOK } from './realTrainers.js';

const TYPE_COLORS = {
  normal: '#c8b890', fire: '#f07838', water: '#5890e8', electric: '#f8d030', grass: '#68c050', ice: '#88d8e0',
  fighting: '#c84838', poison: '#a050b0', ground: '#d8b060', flying: '#a8a8f0', psychic: '#f070a0', bug: '#a8c030',
  rock: '#b8a058', ghost: '#7860a8', dragon: '#7050e8', dark: '#685848', steel: '#b0b8c8'
};
const ARCH = {
  normal: ['quad', 'biped', 'blob', 'bird'], fire: ['quad', 'biped'], water: ['fish', 'blob', 'quad', 'biped'],
  electric: ['quad', 'biped', 'blob'], grass: ['quad', 'blob', 'biped'], ice: ['quad', 'blob', 'biped'],
  fighting: ['biped'], poison: ['blob', 'serpent', 'quad', 'bug'], ground: ['quad', 'biped', 'serpent'],
  flying: ['bird'], psychic: ['biped', 'blob'], bug: ['bug'], rock: ['blob', 'quad', 'biped'],
  ghost: ['ghost'], dragon: ['serpent', 'biped', 'quad'], dark: ['quad', 'biped'], steel: ['blob', 'biped', 'quad']
};

// Originalbilder aus `npm run sprites` (client/sprites/, nicht im Repo). Sind sie vorhanden,
// haben sie Vorrang, sonst bleibt es bei der prozeduralen Grafik.
let REAL = null;
let NAMED = { types: new Set(), items: new Set(), trainers: new Set(), overworld: new Set() };
export const hasReal = (kind, name) => NAMED[kind]?.has(name) || false;
export async function loadRealSprites() {
  try {
    const res = await fetch('/sprites/index.json', { cache: 'no-cache' });
    if (!res.ok) return false;
    const { kinds, types = [], items = [], trainers = [], overworld = [] } = await res.json();
    REAL = Object.fromEntries(Object.entries(kinds).map(([k, ids]) => [k, new Set(ids)]));
    NAMED = { types: new Set(types), items: new Set(items), trainers: new Set(trainers), overworld: new Set(overworld) };
    return true;
  } catch { return false; }
}
function realUrl(mon, kind) {
  const id = mon.speciesId;
  if (!REAL || !id) return null;
  const k = mon.shiny && REAL[`${kind}-shiny`]?.has(id) ? `${kind}-shiny` : kind;
  return REAL[k]?.has(id) ? `/sprites/${k}/${id}.png` : null;
}
// Typ-Schild und Gegenstandssymbol als <img>, leer ohne Originalbilder
export const typeBadge = (type) => NAMED.types.has(type) ? `<img class="type-badge" src="/sprites/types/${type}.png" alt="">` : '';
export const itemIcon = (id) => NAMED.items.has(id) ? `<img class="item-ic" src="/sprites/items/${id}.png" alt="">` : '';
// Trainerbild fuer den Kampf: { name, cls, look } -> URL oder null
export function trainerImage(t) {
  for (const f of [TRAINER_BY_NAME[t.name], TRAINER_BY_CLASS[t.cls], TRAINER_BY_LOOK[t.look]]) {
    if (f && NAMED.trainers.has(f)) return `/sprites/trainers/${encodeURIComponent(f)}.png`;
  }
  return null;
}
// Zeichnet ein Originalbild auf die Leinwand: bei fit auf den sichtbaren Teil zugeschnitten, unten mittig.
function paintReal(g, img, size, fit) {
  const [t, tg] = canvas(img.width, img.height);
  tg.drawImage(img, 0, 0);
  const px = tg.getImageData(0, 0, img.width, img.height).data;
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    if (px[(y * img.width + x) * 4 + 3] > 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  if (x1 < 0) return;
  if (!fit) { x0 = 0; y0 = 0; x1 = img.width - 1; y1 = img.height - 1; }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const sc = Math.min(size / w, size / h);
  g.imageSmoothingEnabled = false;
  g.drawImage(t, x0, y0, w, h, Math.round((size - w * sc) / 2), Math.round(size - h * sc), Math.round(w * sc), Math.round(h * sc));
}

const ell = (cx, cy, rx, ry, color, o = {}) => ({ k: 'e', cx, cy, rx, ry, color, ...o });
const tri = (pts, color, o = {}) => ({ k: 't', pts, color, ...o });

function plan(mon) {
  const fam = mon.family || mon.speciesId || 1;
  const R = rng(fam * 9973 + 17);
  const v = (a, b) => a + R() * (b - a);
  const t1 = mon.types?.[0] || 'normal'; const t2 = mon.types?.[1];
  const opts = (t2 === 'flying' && t1 !== 'flying' && R() < 0.5) ? ['bird'] : ARCH[t1] || ARCH.normal;
  const arch = opts[Math.floor(R() * opts.length)];
  const stage = Math.max(1, Math.min(3, mon.stage || 1));
  const P = [];
  let head;
  const bodyW = v(0.42, 0.56) + stage * 0.03;

  if (arch === 'biped') {
    P.push(ell(0.28, 0.86, 0.15, 0.15, 'dark', { m: 1 }));
    P.push(ell(0, 0.38, bodyW, v(0.4, 0.5), 'main', { body: 1 }));
    if (R() < 0.75) P.push(ell(0, 0.46, bodyW * 0.6, 0.3, 'belly'));
    P.push(ell(bodyW + 0.02, 0.28, 0.12, 0.2, 'main', { m: 1 }));
    head = ell(0, -0.32, v(0.36, 0.48), v(0.32, 0.4), 'main');
  } else if (arch === 'quad') {
    P.push(ell(0.44, 0.84, 0.13, 0.17, 'dark', { m: 1 }), ell(0.2, 0.88, 0.12, 0.14, 'main', { m: 1 }));
    P.push(ell(0, 0.48, bodyW + 0.1, v(0.3, 0.38), 'main', { body: 1 }));
    P.push(ell(0, 0.56, bodyW * 0.55, 0.22, 'belly'));
    head = ell(0, -0.12, v(0.36, 0.46), v(0.3, 0.38), 'main');
  } else if (arch === 'bird') {
    P.push(ell(0.14, 0.9, 0.07, 0.08, 'beak', { m: 1 }));
    P.push(ell(0.52, 0.28, v(0.26, 0.36), 0.2, 'second', { m: 1, wing: 1 }));
    P.push(ell(0, 0.38, 0.38, 0.44, 'main', { body: 1 }));
    P.push(ell(0, 0.48, 0.24, 0.3, 'belly'));
    head = ell(0, -0.38, 0.3, 0.28, 'main');
  } else if (arch === 'fish') {
    P.push(ell(0.72, 0.28, 0.2, 0.12, 'second', { m: 1 }));
    P.push(tri([[-0.12, -0.3], [0.12, -0.3], [0, -0.7 - stage * 0.06]], 'second'));
    head = ell(0, 0.2, v(0.56, 0.66), v(0.5, 0.6), 'main', { body: 1 });
    P.push(head);
    P.push(ell(0, 0.42, 0.36, 0.26, 'belly'));
  } else if (arch === 'serpent') {
    P.push(ell(0, 0.7, 0.6, 0.26, 'main', { body: 1 }));
    P.push(ell(0, 0.72, 0.36, 0.14, 'belly'));
    P.push(ell(0, 0.28, 0.3, 0.34, 'main'));
    P.push(ell(0, 0.32, 0.16, 0.26, 'belly'));
    head = ell(0, -0.3, 0.36, 0.3, 'main');
  } else if (arch === 'bug') {
    for (let i = 0; i < 3; i++) P.push(ell(0.4 + i * 0.04, 0.2 + i * 0.22, 0.2, 0.05, 'dark', { m: 1 }));
    P.push(ell(0, 0.6, 0.36, 0.32, 'main', { body: 1 }));
    P.push(ell(0, 0.62, 0.36, 0.06, 'dark'), ell(0, 0.78, 0.3, 0.05, 'dark'));
    P.push(ell(0, 0.18, 0.28, 0.22, 'second'));
    head = ell(0, -0.22, 0.3, 0.26, 'main');
    P.push(tri([[0.08, -0.42], [0.14, -0.44], [0.32, -0.82]], 'dark', { m: 1 }));
  } else if (arch === 'ghost') {
    P.push(ell(0.48, 0.22, 0.14, 0.12, 'main', { m: 1 }));
    head = ell(0, 0.08, v(0.5, 0.6), v(0.6, 0.72), 'main', { body: 1, wavy: 1 });
    P.push(head);
  } else { // blob
    P.push(ell(0.32, 0.92, 0.16, 0.08, 'dark', { m: 1 }));
    head = ell(0, 0.3, v(0.55, 0.7), v(0.55, 0.66), 'main', { body: 1 });
    P.push(head);
    if (R() < 0.6) P.push(ell(0, 0.5, 0.36, 0.3, 'belly'));
  }

  const hx = head.cx; const hy = head.cy; const hrx = head.rx; const hry = head.ry;
  // Ohren, Hoerner, Blatt, Kamm
  const earRoll = R();
  if (['biped', 'quad', 'blob'].includes(arch) || (arch === 'serpent' && R() < 0.5)) {
    if (earRoll < 0.4) P.push(tri([[hrx * 0.25, hy - hry * 0.7], [hrx * 0.8, hy - hry * 0.45], [hrx * v(0.6, 0.95), hy - hry * v(1.6, 2.1)]], R() < 0.5 ? 'main' : 'second', { m: 1 }));
    else if (earRoll < 0.65) P.push(ell(hrx * 0.7, hy - hry * 0.75, hrx * 0.3, hry * 0.38, 'main', { m: 1 }));
  }
  if (['rock', 'steel', 'ground', 'dragon'].includes(t1) || stage === 3 && R() < 0.6) {
    P.push(tri([[hrx * 0.15, hy - hry * 0.85], [hrx * 0.45, hy - hry * 0.75], [hrx * 0.3, hy - hry * (1.4 + stage * 0.2)]], 'horn', { m: 1 }));
  }
  if (t1 === 'grass' || t2 === 'grass') P.push(ell(0, hy - hry * 1.1, 0.12 + stage * 0.04, 0.2 + stage * 0.05, 'leaf'));
  if (t1 === 'fire' || t2 === 'fire') P.push(ell(0, hy - hry * 1.05, 0.1 + stage * 0.03, 0.16 + stage * 0.04, 'flame'));
  if (t1 === 'electric' && arch !== 'fish') P.push(tri([[hrx * 0.6, hy - hry * 0.5], [hrx * 1.0, hy - hry * 0.2], [hrx * 1.5, hy - hry * 1.3]], 'second', { m: 1 }));
  if (t1 === 'psychic' || t2 === 'psychic') P.push(ell(0, hy - hry * 0.45, 0.07, 0.07, 'gem'));
  if (t2 === 'flying' && arch !== 'bird') P.push(ell(0.62, 0.15, 0.26, 0.14, 'wingc', { m: 1, under: 1 }));
  if (stage === 3) P.push(tri([[bodyW * 0.7, 0.2], [bodyW * 1.0, 0.35], [bodyW * 1.25, -0.05]], 'second', { m: 1, under: 1 }));
  if (!P.includes(head) || !['fish', 'ghost', 'blob'].includes(arch)) P.push(head);

  // Farben
  let main = hueShift(TYPE_COLORS[t1] || TYPE_COLORS.normal, v(-18, 18), v(0.85, 1.1));
  if (mon.shiny) main = hueShift(main, 150, 1.1);
  const second = t2 ? hueShift(TYPE_COLORS[t2], v(-10, 10)) : (R() < 0.5 ? shade(main, -0.28) : hueShift(main, v(25, 50)));
  const colors = {
    main, second, belly: mix(main, '#fff6e0', v(0.5, 0.75)), dark: shade(main, -0.38), beak: '#f0b040', horn: '#efe6d0',
    leaf: '#50b848', flame: '#ff9a30', gem: '#ff4a8a', wingc: mix(second, '#ffffff', 0.35)
  };
  const eye = { style: Math.floor(R() * 3), size: R() < 0.4 ? 1 : 0, y: hy - hry * v(0.05, 0.25), x: hrx * v(0.35, 0.5) };
  const pattern = R() < 0.3 ? 'spots' : R() < 0.25 ? 'stripes' : null;
  // Spiegeln (m = symmetrisches Paar, under = hinter dem Koerper)
  const prims = [];
  const under = P.filter((p) => p.under); const over = P.filter((p) => !p.under);
  for (const p of [...under, ...over]) {
    prims.push(p);
    if (p.m) prims.push(p.k === 'e' ? { ...p, cx: -p.cx } : { ...p, pts: p.pts.map(([x, y]) => [-x, y]) });
  }
  return { prims, colors, eye, head, stage, pattern, arch, seed: fam };
}

function inside(p, x, y) {
  if (p.k === 'e') {
    const nx = (x - p.cx) / p.rx; const ny = (y - p.cy) / p.ry;
    if (p.wavy && ny > 0.35 && ny > 0.55 + 0.25 * Math.sin(x * 14)) return null;
    return nx * nx + ny * ny <= 1 ? [nx, ny] : null;
  }
  const [[x1, y1], [x2, y2], [x3, y3]] = p.pts;
  const d = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
  const a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / d;
  const b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / d;
  const c = 1 - a - b;
  return a >= 0 && b >= 0 && c >= 0 ? [0, c * 2 - 1] : null;
}

const cache = new Map();
export function monsterCanvas(mon, back = false, size = 56, fit = false) {
  const key = `${mon.speciesId}|${mon.family}|${mon.stage}|${(mon.types || []).join()}|${mon.shiny ? 1 : 0}|${back ? 1 : 0}|${size}|${fit ? 1 : 0}`;
  if (cache.has(key)) return cache.get(key);
  const url = realUrl(mon, back ? 'back' : 'front');
  if (url) {
    const [c, g] = canvas(size, size);
    const img = new Image();
    img.onload = () => paintReal(g, img, size, fit);
    img.src = url;
    cache.set(key, c);
    return c;
  }
  const pl = plan(mon);
  const [c, g] = canvas(size, size);
  const scale = fit ? 1.02 : [0.74, 0.88, 1.0][pl.stage - 1];
  const unit = (size * 0.45) * scale * (back ? 1.3 : 1);
  const bottom = back ? size + unit * 0.12 : size - 3;
  const toLocal = (X, Y) => [(X + 0.5 - size / 2) / unit, (Y + 0.5 - bottom) / unit + 1];
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  for (let Y = 0; Y < size; Y++) {
    for (let X = 0; X < size; X++) {
      const [x, y] = toLocal(X, Y);
      for (let i = pl.prims.length - 1; i >= 0; i--) {
        const p = pl.prims[i];
        const hit = inside(p, x, y);
        if (hit) { grid[Y][X] = { i, color: back && p.color === 'belly' ? 'main' : p.color, nx: hit[0], ny: hit[1], body: p.body }; break; }
      }
    }
  }
  const col = pl.colors;
  const outline = shade(col.main, -0.72);
  for (let Y = 0; Y < size; Y++) {
    for (let X = 0; X < size; X++) {
      const cell = grid[Y][X];
      if (!cell) continue;
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !grid[Y + dy]?.[X + dx]);
      let color = col[cell.color] || col.main;
      if (edge) color = outline;
      else {
        const below = grid[Y + 1]?.[X];
        if (below && below.i < cell.i && below.color !== cell.color) color = shade(color, -0.35);
        else if (cell.ny > 0.55) color = shade(color, -0.2);
        else if (cell.ny < -0.5 && cell.nx < 0.1) color = shade(color, 0.22);
        if (back) color = shade(color, -0.06);
        if (pl.pattern && cell.body && cell.color === 'main') {
          const [x, y] = toLocal(X, Y);
          if (pl.pattern === 'spots' && Math.sin(x * 11 + pl.seed) * Math.sin(y * 9 + pl.seed) > 0.72) color = col.second;
          if (pl.pattern === 'stripes' && Math.abs(Math.sin(y * 12 + pl.seed)) > 0.9) color = col.dark;
        }
      }
      g.fillStyle = color;
      g.fillRect(X, Y, 1, 1);
    }
  }
  if (!back) drawFace(g, pl, unit, bottom, size, outline);
  cache.set(key, c);
  return c;
}

function drawFace(g, pl, unit, bottom, size, outline) {
  const toPx = (x, y) => [Math.round(size / 2 + x * unit - 0.5), Math.round(bottom + (y - 1) * unit - 0.5)];
  const ew = Math.max(2, Math.round(unit * (0.1 + pl.eye.size * 0.05)));
  const eh = ew + 1;
  for (const s of [-1, 1]) {
    const [ex, ey] = toPx(s * pl.eye.x, pl.eye.y);
    const x0 = ex - (s < 0 ? ew - 1 : 0);
    if (pl.eye.style === 0) {
      g.fillStyle = outline; g.fillRect(x0, ey, ew, eh);
      g.fillStyle = '#ffffff'; g.fillRect(x0 + (s < 0 ? ew - 1 : 0), ey, 1, 1);
    } else if (pl.eye.style === 1) {
      g.fillStyle = '#ffffff'; g.fillRect(x0 - 1, ey - 1, ew + 2, eh + 1);
      g.fillStyle = outline; g.fillRect(x0, ey, ew, eh);
      g.fillStyle = '#ffffff'; g.fillRect(x0, ey, 1, 1);
    } else {
      g.fillStyle = outline; g.fillRect(x0, ey + 1, ew, eh - 1);
      g.fillRect(x0 - (s < 0 ? 1 : 0), ey, ew + 1, 1);
      g.fillStyle = '#ffffff'; g.fillRect(x0 + (s < 0 ? 0 : ew - 1), ey + 1, 1, 1);
    }
  }
  const [mx, my] = toPx(0, pl.eye.y + pl.head.ry * 0.45);
  g.fillStyle = outline;
  g.fillRect(mx - 1, my, 2, 1);
  if (pl.arch === 'bird') { g.fillStyle = '#f0b040'; g.fillRect(mx - 1, my - 2, 3, 2); g.fillRect(mx, my, 1, 1); }
}

const urls = new Map();
export function monsterDataUrl(mon, back = false, size = 56, fit = false) {
  const url = realUrl(mon, back ? 'back' : 'front');
  if (url) return url;
  const c = monsterCanvas(mon, back, size, fit);
  if (!urls.has(c)) urls.set(c, c.toDataURL());
  return urls.get(c);
}
// Kleines Symbol fuer Team- und Boxlisten (fuellt das Bild unabhaengig von der Stufe)
// Mit Originalbildern: Vorderansicht auf den sichtbaren Teil zugeschnitten. Bis der Zuschnitt fertig ist,
// steht das ganze Bild da, danach werden passende <img> im Dokument ausgetauscht.
const icons = new Map();
export function monsterIcon(mon) {
  const url = realUrl(mon, 'front');
  if (!url) return monsterDataUrl(mon, false, 40, true);
  if (icons.get(url)) return icons.get(url);
  if (!icons.has(url)) {
    icons.set(url, null);
    const img = new Image();
    img.onload = () => {
      const [c, g] = canvas(40, 40);
      paintReal(g, img, 40, true);
      const data = c.toDataURL();
      icons.set(url, data);
      for (const el of document.querySelectorAll('img')) if (el.getAttribute('src') === url) el.src = data;
    };
    img.src = url;
  }
  return url;
}
