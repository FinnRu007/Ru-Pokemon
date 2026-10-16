// Baut die Originalkarten aus Platin (Daten von github.com/pret/pokeplatinum, nicht im Repo):
//   client/sprites/world/<matrix>/<feld>.png       Bild je Matrixfeld (Schraegsicht wie auf dem DS)
//   client/sprites/world/<matrix>/<feld>.rows.png  Tiefenkarte (Kachelreihe je Pixel) fuer Verdeckung
//   client/sprites/world/index.json                welche Bilder wo liegen
//   shared/data/generated/world.js                 Kollision, Hoehen und Lage jeder Karte (Server + Client)
// Aufruf ueber `npm run sprites` (oder direkt: node scripts/world/build-world.js). Vorhandene Bilder
// werden nur neu gezeichnet, wenn sich die Zeichenversion aendert.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readLandData, cellTris, renderCell, groundHeights, groundCover, parseNsbmd, resolveTextures, parseTex0, ROW_BIAS } from './render.js';
import { encodePNG } from './png.js';
import { ORIG_SPEC } from '../../shared/data/origSpec.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = path.join(ROOT, 'tools', 'pret');
const OUT = path.join(ROOT, 'client', 'sprites', 'world');
const GEN = path.join(ROOT, 'shared', 'data', 'generated');
const RAW = 'https://raw.githubusercontent.com/pret/pokeplatinum/main/';
const VERSION = 3;
const LOCAL = process.env.PRET_DIR;

const useCurl = !!(process.env.HTTPS_PROXY || process.env.https_proxy);
function fetchFile(rel) {
  const file = path.join(CACHE, rel);
  if (fs.existsSync(file)) return new Uint8Array(fs.readFileSync(file));
  if (LOCAL && fs.existsSync(path.join(LOCAL, rel))) return new Uint8Array(fs.readFileSync(path.join(LOCAL, rel)));
  let data = null;
  for (let i = 0; i < 3 && !data; i++) {
    try { data = execFileSync('curl', ['-sSfL', '--retry', '2', RAW + rel], { maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { data = null; }
  }
  if (!data) return null;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  return new Uint8Array(data);
}
// Viele Dateien parallel vorladen (curl in mehreren Prozessen)
async function prefetch(list) {
  const todo = list.filter((rel) => !fs.existsSync(path.join(CACHE, rel)) && !(LOCAL && fs.existsSync(path.join(LOCAL, rel))));
  let done = 0;
  const { spawn } = await import('node:child_process');
  const one = (rel) => new Promise((res) => {
    const file = path.join(CACHE, rel); fs.mkdirSync(path.dirname(file), { recursive: true });
    const p = spawn('curl', ['-sSfL', '--retry', '3', '-o', file, RAW + rel], { stdio: 'ignore' });
    p.on('close', (code) => { if (code) try { fs.unlinkSync(file); } catch { /* fehlt */ } if (++done % 50 === 0) process.stdout.write(`\r  ${done} / ${todo.length} Dateien`); res(); });
  });
  const queue = [...todo];
  await Promise.all(Array.from({ length: 12 }, async () => { while (queue.length) await one(queue.shift()); }));
  if (todo.length) process.stdout.write(`\r  ${todo.length} Dateien geladen\n`);
}
const text = (rel) => { const b = fetchFile(rel); return b ? Buffer.from(b).toString('utf8') : null; };
const pad3 = (n) => String(n).padStart(3, '0');

// ------------------------------------------------------------------ Kopfdaten
export async function buildWorld({ log = console.log } = {}) {
  log('Lade Originalkarten aus github.com/pret/pokeplatinum ...');
  await prefetch(['include/data/map_headers.h', 'res/field/props/models/map_prop_models.order']);
  const headersSrc = text('include/data/map_headers.h');
  const order = text('res/field/props/models/map_prop_models.order');
  if (!headersSrc || !order) { log('  Kartendaten nicht erreichbar, es bleibt bei den eigenen Karten.'); return false; }
  const HEAD = {};
  for (const m of headersSrc.matchAll(/\[MAP_HEADER_(\w+)\] = \{([\s\S]*?)\n {4}\}/g)) {
    const b = m[2];
    HEAD[m[1]] = {
      area: +(b.match(/areaDataArchiveID = area_data_(\d+)/)?.[1] ?? 0),
      matrix: +(b.match(/mapMatrixID = map_matrix_(\d+)/)?.[1] ?? 0),
      events: b.match(/eventsArchiveID = (\w+)/)?.[1],
      battleBG: b.match(/battleBG = (\w+)/)?.[1],
      weather: b.match(/weather = OVERWORLD_WEATHER_(\w+)/)?.[1],
      mapType: b.match(/mapType = (\w+)/)?.[1]
    };
  }
  const PROPS = order.trim().split(/\r?\n/);

  // Benoetigte Matrizen
  const matrices = new Set([0, ...Object.values(ORIG_SPEC).map((s) => s.m)]);
  await prefetch([...matrices].map((m) => `res/field/matrices/map_matrix_${pad3(m)}.json`));
  const MX = {};
  for (const m of matrices) {
    const j = JSON.parse(text(`res/field/matrices/map_matrix_${pad3(m)}.json`) || 'null');
    if (!j) continue;
    const h = j.maps.length, w = j.maps[0].length;
    MX[m] = { w, h, maps: j.maps, headers: j.headers?.length ? j.headers : null, alt: j.altitudes?.length ? j.altitudes : null };
  }
  const headerOf = (m, x, y) => {
    const X = MX[m];
    if (X.headers) return X.headers[y][x].replace(/^MAP_HEADER_/, '');
    return Object.entries(ORIG_SPEC).find(([, s]) => s.m === m)?.[1].h || 'EVERYWHERE';
  };
  // Areas, Texturen und Bodendaten vorladen
  const cells = [];
  for (const [m, X] of Object.entries(MX)) for (let y = 0; y < X.h; y++) for (let x = 0; x < X.w; x++) {
    const id = X.maps[y][x];
    if (!id || id === 'MAP_NONE') continue;
    const hd = headerOf(+m, x, y);
    const area = HEAD[hd]?.area ?? HEAD[Object.values(ORIG_SPEC).find((s) => s.m === +m)?.h]?.area ?? 0;
    cells.push({ m: +m, x, y, land: +id.slice(4), hd, area, alt: X.alt ? X.alt[y][x] : 0 });
  }
  // Randfelder ohne eigenes Gebiet (Meer, Waldrand) nutzen im Spiel die Texturen des Gebiets, in dem man steht:
  // hier die des naechsten Feldes mit Gebiet
  for (const c of cells) {
    if (c.area) continue;
    let best = null, bd = Infinity;
    for (const o of cells) if (o.m === c.m && o.area) { const d = Math.hypot(o.x - c.x, o.y - c.y); if (d < bd) { bd = d; best = o; } }
    if (best) c.texArea = best.area;
  }
  const areas = [...new Set(cells.flatMap((c) => [c.area, c.texArea]).filter((a) => a != null))];
  await prefetch(areas.map((a) => `res/field/area_data/area_data_${pad3(a)}.json`));
  const AREA = {};
  for (const a of areas) AREA[a] = JSON.parse(text(`res/field/area_data/area_data_${pad3(a)}.json`) || '{}');
  await prefetch([
    ...new Set(cells.map((c) => `res/field/maps/data/map_data_${pad3(c.land)}.bin`)),
    ...new Set(areas.map((a) => `res/field/maps/texture_sets/${AREA[a].mapTextureSet}.nsbtx`)),
    ...new Set(areas.map((a) => `res/field/props/texture_sets/${(AREA[a].mapPropSet || '').replace('model_set', 'texture_set')}.nsbtx`))
  ]);
  const LAND = {};
  for (const c of cells) {
    if (!LAND[c.land]) { const b = fetchFile(`res/field/maps/data/map_data_${pad3(c.land)}.bin`); LAND[c.land] = b ? readLandData(b) : null; }
  }
  const propIds = new Set();
  for (const c of cells) for (const p of LAND[c.land]?.props || []) propIds.add(p.id);
  await prefetch([...propIds].filter((i) => PROPS[i]).map((i) => `res/field/props/models/${PROPS[i]}`));
  // Ereignisse (Tueren, Schilder, Feldhindernisse) der benutzten Header
  const usedHeaders = new Set(cells.map((c) => c.hd));
  await prefetch([...usedHeaders].map((h) => HEAD[h]?.events).filter(Boolean).map((e) => `res/field/events/${e}.json`));

  // ------------------------------------------------------------------ Zeichnen
  const texCache = new Map();
  const tex = (rel) => { if (!texCache.has(rel)) { const b = fetchFile(rel); texCache.set(rel, b ? parseTex0(b) : null); } return texCache.get(rel); };
  const modelCache = new Map();
  const propModel = (propTex) => (id) => {
    if (!modelCache.has(propTex)) modelCache.set(propTex, new Map());
    const cache = modelCache.get(propTex);
    if (!cache.has(id)) {
      const b = PROPS[id] ? fetchFile(`res/field/props/models/${PROPS[id]}`) : null;
      let m = null;
      if (b) { try { m = parseNsbmd(b); resolveTextures(m, propTex); } catch { m = null; } }
      cache.set(id, m);
    }
    return cache.get(id);
  };
  fs.mkdirSync(OUT, { recursive: true });
  const idxFile = path.join(OUT, 'index.json');
  const oldIdx = fs.existsSync(idxFile) ? JSON.parse(fs.readFileSync(idxFile, 'utf8')) : null;
  const fresh = oldIdx?.version === VERSION;
  const index = { version: VERSION, matrices: {} };
  const cellInfo = {};
  let drawn = 0;
  for (const c of cells) {
    const X = MX[c.m];
    const ad = AREA[c.area] || {};
    const land = LAND[c.land];
    if (!land) continue;
    const name = `l${c.land}_a${c.area}_h${c.alt}` + (c.texArea != null ? `_t${c.texArea}` : '');
    const dir = path.join(OUT, String(c.m));
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, name + '.png');
    const mt = tex(`res/field/maps/texture_sets/${ad.mapTextureSet}.nsbtx`);
    const ta = c.texArea != null ? AREA[c.texArea] : null;
    const mts = ta ? [tex(`res/field/maps/texture_sets/${ta.mapTextureSet}.nsbtx`), mt] : mt;
    const pt = tex(`res/field/props/texture_sets/${(ad.mapPropSet || '').replace('model_set', 'texture_set')}.nsbtx`);
    let info = fresh ? oldIdx.matrices?.[c.m]?.files?.[name] : null;
    if (!info || !fs.existsSync(file)) {
      const tris = cellTris(land, c.alt, mts, pt, propModel(pt));
      const img = renderCell(tris);
      if (!img) continue;
      fs.writeFileSync(file, encodePNG(img.w, img.h, img.color));
      const rows = new Uint8Array(img.w * img.h * 4);
      for (let i = 0; i < img.rows.length; i++) { rows[i * 4] = img.rows[i]; rows[i * 4 + 3] = img.rows[i] ? 255 : 0; }
      fs.writeFileSync(path.join(dir, name + '.rows.png'), encodePNG(img.w, img.h, rows));
      info = { ox: img.ox, oy: img.oy, w: img.w, h: img.h };
      drawn++;
      if (drawn % 20 === 0) process.stdout.write(`\r  ${drawn} Kartenteile gezeichnet`);
    }
    const M = (index.matrices[c.m] ||= { w: X.w, h: X.h, files: {}, cells: Array.from({ length: X.h }, () => Array(X.w).fill(0)) });
    M.files[name] = info;
    M.cells[c.y][c.x] = name;
    cellInfo[`${c.m},${c.x},${c.y}`] = { ...c, heights: groundHeights(land, c.alt) };
  }
  if (drawn) process.stdout.write(`\r  ${drawn} Kartenteile gezeichnet\n`);
  fs.writeFileSync(idxFile, JSON.stringify(index));
  // Alte Bilder, die nicht mehr gebraucht werden, aufraeumen
  for (const [m, M] of Object.entries(index.matrices)) {
    const keep = new Set(Object.keys(M.files));
    for (const f of fs.readdirSync(path.join(OUT, m))) if (!keep.has(f.replace(/(\.rows)?\.png$/, ''))) fs.rmSync(path.join(OUT, m, f));
  }

  // ------------------------------------------------------------------ Kollision je Karte
  const maps = {};
  const owner = {};
  for (const [id, spec] of Object.entries(ORIG_SPEC)) {
    const X = MX[spec.m];
    if (!X) continue;
    const own = [];
    for (let y = 0; y < X.h; y++) for (let x = 0; x < X.w; x++) {
      const c = cellInfo[`${spec.m},${x},${y}`];
      if (!c) continue;
      if (spec.cells ? spec.cells.some(([a, b]) => a === x && b === y) : (headerOf(spec.m, x, y) === spec.h || (!X.headers && spec.h))) own.push([x, y]);
    }
    if (!own.length) { log(`  Keine Felder fuer ${id}`); continue; }
    const x0 = Math.min(...own.map((o) => o[0])), x1 = Math.max(...own.map((o) => o[0]));
    const y0 = Math.min(...own.map((o) => o[1])), y1 = Math.max(...own.map((o) => o[1]));
    const W = (x1 - x0 + 1) * 32, H = (y1 - y0 + 1) * 32;
    const grid = Array.from({ length: H }, () => Array(W).fill(' '));
    const beh = new Uint8Array(W * H);
    const hgt = new Int16Array(W * H);
    for (const [cx, cy] of own) {
      if (spec.m === 0) (owner[`${cx},${cy}`] = id);
      const c = cellInfo[`${spec.m},${cx},${cy}`];
      const perms = LAND[c.land].perms;
      const cov = spec.indoor ? groundCover(LAND[c.land]) : null;
      // Treppen und Moebel gehoeren nicht zum Bodenmodell: begehbare Kacheln direkt daneben zaehlen mit
      if (cov) for (let pass = 0; pass < 2; pass++) {
        const add = [];
        for (let i = 0; i < 1024; i++) {
          if (cov[i] || (perms[i] & 0x8000)) continue;
          const x = i & 31, y = i >> 5;
          if ((x > 0 && cov[i - 1]) || (x < 31 && cov[i + 1]) || (y > 0 && cov[i - 32]) || (y < 31 && cov[i + 32])) add.push(i);
        }
        for (const i of add) cov[i] = 1;
      }
      for (let ty = 0; ty < 32; ty++) for (let tx = 0; tx < 32; tx++) {
        const gx = (cx - x0) * 32 + tx, gy = (cy - y0) * 32 + ty;
        grid[gy][gx] = cov && !cov[ty * 32 + tx] ? ' ' : tileChar(perms[ty * 32 + tx]);
        beh[gy * W + gx] = perms[ty * 32 + tx] & 0xff;
        hgt[gy * W + gx] = Math.round(c.heights[ty * 32 + tx]);
      }
    }
    // Tueren, Schilder und Feldhindernisse aus den Ereignissen
    const warps = [];
    const objects = [];
    const coords = [];
    const bgs = [];
    for (const hd of X.headers ? new Set(own.map(([cx, cy]) => headerOf(spec.m, cx, cy))) : [spec.h]) {
      const ev = HEAD[hd]?.events && JSON.parse(text(`res/field/events/${HEAD[hd].events}.json`) || 'null');
      if (!ev) continue;
      const local = (gx, gz) => [gx - x0 * 32, gz - y0 * 32];
      (ev.warp_events || []).forEach((w, i) => {
        const [x, y] = local(w.x, w.z);
        if (y < 0 || y >= H || x < 0 || x >= W) return;
        warps.push({ x, y, hd, i, to: w.dest_header_id.replace(/^MAP_HEADER_/, ''), id: w.dest_warp_id, b: beh[y * W + x] });
      });
      for (const c of ev.coord_events || []) {
        const [x, y] = local(c.x, c.z);
        if (y < 0 || y >= H || x < 0 || x >= W) continue;
        coords.push({ x, y, w: c.width, h: c.length, var: c.var, value: c.value, script: c.script });
      }
      for (const b of ev.bg_events || []) {
        const [x, y] = local(b.x, b.z);
        if (y < 0 || y >= H || x < 0 || x >= W) continue;
        bgs.push({ x, y, type: b.type, script: b.script });
      }
      for (const o of ev.object_events || []) {
        const [x, y] = local(o.x, o.z);
        if (y < 0 || y >= H || x < 0 || x >= W) continue;
        const g = o.graphics_id.replace('OBJ_EVENT_GFX_', '');
        const t = { CUT_TREE: 'Z', ROCK_SMASH: 'Q', STRENGTH_BOULDER: 'M', SIGNBOARD: 'S', ARROW_SIGNPOST: 'S', MAP_SIGNPOST: 'S', TRAINER_TIPS_SIGNPOST: 'S', GYM_SIGNPOST: 'S' }[g];
        if (t && grid[y][x] !== ' ') grid[y][x] = t;
        objects.push({ x, y, g, id: o.id, flag: o.hidden_flag, script: o.script, dir: o.initial_dir, move: o.movement_type, tr: o.trainer_type, range: o.data?.[0] });
      }
    }
    maps[id] = {
      m: spec.m, x: x0 * 32, z: y0 * 32, width: W, height: H,
      tiles: grid.map((r) => r.join('')),
      heights: Buffer.from(hgt.buffer).toString('base64'),
      beh: Buffer.from(beh).toString('base64'),
      warps, objects, coords, bgs,
      battleBG: HEAD[spec.h]?.battleBG || null,
      weather: HEAD[spec.h]?.weather || null
    };
  }
  fs.mkdirSync(GEN, { recursive: true });
  const ownerGrid = Array.from({ length: MX[0].h }, (_, y) => Array.from({ length: MX[0].w }, (_, x) => owner[`${x},${y}`] || ''));
  fs.writeFileSync(path.join(GEN, 'world.js'),
    '// Automatisch erzeugt von scripts/world/build-world.js aus den Platin-Daten (pret/pokeplatinum). Nicht bearbeiten.\n' +
    `export const ORIG_WORLD = ${JSON.stringify({ version: VERSION, owner: ownerGrid, maps })};\n`);
  log(`  Originalkarten: ${Object.keys(maps).length} Gebiete, ${cells.length} Kartenteile`);
  return true;
}

// Kachelattribut -> Zeichen dieses Spiels (siehe shared/world.js)
//   ' ' fremdes Feld   # Hindernis   , Boden   " hohes Gras   ~ Wasser   J Wasserfall   N Kraxelwand
//   L/</>/^ Vorsprung nach Sueden/Westen/Osten/Norden   D Tuer/Durchgang   = Sand
function tileChar(p) {
  const b = p & 0xff; const solid = (p & 0x8000) !== 0;
  if (b === 0x13) return 'J';
  if (b === 0x10 || b === 0x15) return '~';
  if (b === 0x4b || b === 0x4c) return 'N';
  if (b === 0x38 || b === 0x5d) return '>';
  if (b === 0x39 || b === 0x5c) return '<';
  if (b === 0x3a || b === 0x5a) return '^';
  if (b === 0x3b || b === 0x5b) return 'L';
  if (solid) return '#';
  if (b === 0x02 || b === 0x03) return '"';
  if (b === 0x21) return '=';
  return ',';
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await buildWorld();
