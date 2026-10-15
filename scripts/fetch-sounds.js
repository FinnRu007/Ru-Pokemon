// Laedt die Original-Klaenge der 4. Generation nach client/sounds/:
//   Pokemon-Rufe 1 bis 493 (Fassung vor Generation 6, also wie in Platin) aus github.com/PokeAPI/cries,
//   Musik und Fanfaren aus der offiziellen Pokemon DP Sound Library (Abbild auf archive.org),
//   Attacken-Klaenge (Diamant, Perl, Platin, HeartGold, SoulSilver) und Fanfaren von The Sounds Resource.
// Der Ordner ist gitignored: Die Klaenge gehoeren Nintendo und werden nicht mit dem Code verteilt.
// Fehlen sie, spielt der Client die eigenen WebAudio-Klaenge (client/js/audio.js).
// Aufruf: npm run sounds   (bereits vorhandene Dateien werden uebersprungen)
// Blockt The Sounds Resource den automatischen Download, reicht es, das ZIP einmal im Browser ueber
// "Download" zu laden: Das Skript findet es im Ordner Downloads (oder in client/sounds/) und entpackt es.

// Ein Netzfehler soll den Lauf nicht stumm beenden
process.on('unhandledRejection', (e) => console.log(`\n  Fehler: ${e?.message || e}`));
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { soundKey, ALL_TRACKS } from '../client/js/realAudio.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'client', 'sounds');
const CRY_BASE = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy';
const MAX_ID = 493;
// Pakete von sounds.spriters-resource.com (Seite fuer Platin selbst ist leer, die Klaenge sind in Gen 4 gleich)
const PACKS = [
  { dir: 'moves', name: 'Attack Move Sound Effects', id: '417934', page: 'https://sounds.spriters-resource.com/ds_dsi/pokemonheartgoldsoulsilver/asset/417934/', url: 'https://sounds.spriters-resource.com/media/assets/415/417934.zip' },
  { dir: 'misc', name: 'Miscellaneous Sound Effects', id: '393812', page: 'https://sounds.spriters-resource.com/ds_dsi/pokemonheartgoldsoulsilver/asset/393812/', url: 'https://sounds.spriters-resource.com/media/assets/391/393812.zip' }
];
const ARCHIVE = 'https://archive.org/details/pokemon-dp-sound-library-87200';
const AUDIO = /\.(mp3|wav|ogg)$/i;

const useCurl = !!(process.env.HTTPS_PROXY || process.env.https_proxy);
async function download(url) {
  if (useCurl) {
    try { return execFileSync('curl', ['-sSfL', '--retry', '2', '-A', 'Mozilla/5.0', url], { maxBuffer: 1 << 28 }); } catch { return null; }
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      if (res.status === 404) return null;
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch { /* erneut versuchen */ }
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  return null;
}

// Kleiner ZIP-Entpacker (ohne Zusatzpaket): liest das zentrale Verzeichnis, kann "stored" und "deflate"
function unzip(buf) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('keine ZIP-Datei');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue;
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    const data = method === 0 ? raw : method === 8 ? zlib.inflateRawSync(raw) : null;
    if (data) files.push({ name, data });
  }
  return files;
}

// Von Hand geladenes ZIP suchen (Downloads oder client/sounds/), erkannt an Nummer oder Titel
function localZip(pack) {
  for (const dir of [OUT, path.join(os.homedir(), 'Downloads')]) {
    let names = [];
    try { names = fs.readdirSync(dir); } catch { continue; }
    const hit = names.filter((f) => /\.zip$/i.test(f) && (f.includes(pack.id) || soundKey(f).includes(soundKey(pack.name))))
      .map((f) => path.join(dir, f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
    if (hit) return { file: hit, data: fs.readFileSync(hit) };
  }
  return null;
}

const list = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => AUDIO.test(f)) : [];

// ---------------------------------------------------------------- Rufe
fs.mkdirSync(path.join(OUT, 'cries'), { recursive: true });
const jobs = [];
for (let id = 1; id <= MAX_ID; id++) jobs.push({ url: `${CRY_BASE}/${id}.ogg`, file: path.join(OUT, 'cries', `${id}.ogg`) });
let loaded = 0, failed = 0, done = 0;
async function worker() {
  while (jobs.length) {
    const job = jobs.shift();
    if (!fs.existsSync(job.file)) {
      const data = await download(job.url);
      if (data && data.length) { fs.writeFileSync(job.file, data); loaded++; } else failed++;
    }
    if (++done % 100 === 0) process.stdout.write(`\r${done} / ${MAX_ID} Rufe`);
  }
}
console.log('Lade Pokemon-Rufe aus github.com/PokeAPI/cries ...');
await Promise.all(Array.from({ length: useCurl ? 8 : 16 }, worker));
console.log(`\nRufe: ${loaded} neu geladen, ${failed} nicht gefunden.`);

// ---------------------------------------------------------------- Musik und Fanfaren
const MUSIC = path.join(OUT, 'music');
fs.mkdirSync(MUSIC, { recursive: true });
const missing = ALL_TRACKS.filter((t) => !fs.existsSync(path.join(MUSIC, soundKey(t) + '.mp3')));
if (missing.length) {
  console.log(`Lade ${missing.length} Musikstuecke aus ${ARCHIVE} ...`);
  const meta = await download(ARCHIVE.replace('/details/', '/metadata/'));
  let files = [];
  try { files = JSON.parse(meta.toString('utf8')).files.map((f) => f.name).filter((n) => /\.mp3$/i.test(n)); } catch { console.log('  Verzeichnis nicht erreichbar, es bleibt bei der eigenen Musik.'); }
  let n = 0;
  for (const title of missing) {
    const want = soundKey(title);
    const name = files.find((f) => soundKey(path.basename(f).replace(/\.mp3$/i, '')) === want);
    if (!name) { console.log(`  nicht gefunden: ${title}`); continue; }
    let data = null;
    try { data = await download(ARCHIVE.replace('/details/', '/download/') + '/' + name.split('/').map(encodeURIComponent).join('/')); } catch { /* unten gemeldet */ }
    if (data && data.length) { fs.writeFileSync(path.join(MUSIC, want + '.mp3'), data); process.stdout.write(`\r  ${++n} / ${missing.length}`); }
    else console.log(`  Fehler beim Laden: ${title}`);
  }
  console.log('');
}

// ---------------------------------------------------------------- Klangpakete
for (const pack of PACKS) {
  const dir = path.join(OUT, pack.dir);
  if (list(dir).length) { console.log(`${pack.dir}: schon vorhanden (${list(dir).length} Dateien)`); continue; }
  console.log(`Lade ${pack.dir} von ${pack.page} ...`);
  let zip = localZip(pack);
  if (zip) console.log(`  gefunden: ${zip.file}`);
  else {
    const data = await download(pack.url);
    if (data && data.readUInt32LE(0) === 0x04034b50) zip = { data };
  }
  if (!zip) {
    console.log(`  Die Seite blockt automatische Downloads. Einmal im Browser oeffnen, auf "Download" klicken und danach npm run sounds erneut starten:\n  ${pack.page}`);
    continue;
  }
  let files;
  try { files = unzip(zip.data); } catch (e) { console.log(`  ZIP unlesbar: ${e.message}`); continue; }
  fs.mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const f of files) {
    const base = path.basename(f.name);
    if (!AUDIO.test(base)) continue;
    fs.writeFileSync(path.join(dir, base), f.data); n++;
  }
  console.log(`  ${n} Dateien entpackt`);
}

// ---------------------------------------------------------------- Verzeichnis fuer den Client
// moves: Schluessel aus dem Attackennamen -> Dateien in Abspielreihenfolge (Teil 1, Teil 2, ...).
// Die Grunddatei ist der ganze Klang; Teile oder Varianten wie "_1hit" nur, wenn sie fehlt.
const moves = {};
for (const f of list(path.join(OUT, 'moves'))) {
  const m = /^(.*?)(?:_part_(\d+))?(?:_(\d+)hits?)?\.\w+$/i.exec(f);
  const key = soundKey(m[1]);
  const e = moves[key] ||= { base: null, parts: [], hits: [] };
  if (m[2]) e.parts.push([+m[2], f]); else if (m[3]) e.hits.push([+m[3], f]); else e.base = f;
}
for (const [k, e] of Object.entries(moves)) {
  const sort = (a) => a.sort((x, y) => x[0] - y[0]).map((x) => 'moves/' + x[1]);
  moves[k] = e.base ? ['moves/' + e.base] : e.parts.length ? sort(e.parts) : sort(e.hits).slice(0, 1);
}
const music = fs.readdirSync(MUSIC).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4));
const misc = Object.fromEntries(list(path.join(OUT, 'misc')).map((f) => [f.replace(/\.\w+$/, ''), 'misc/' + f]));
const index = {
  source: ['https://github.com/PokeAPI/cries', ARCHIVE, ...PACKS.map((p) => p.page)],
  cries: fs.readdirSync(path.join(OUT, 'cries')).filter((f) => f.endsWith('.ogg')).map((f) => +f.slice(0, -4)).sort((a, b) => a - b),
  moves, misc, music
};
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));
console.log(`Fertig. Ordner: client/sounds/\n  Rufe: ${index.cries.length}\n  Musik und Fanfaren: ${music.length} von ${ALL_TRACKS.length}\n  Attacken: ${Object.keys(moves).length}\n  Weitere Klaenge: ${Object.keys(misc).join(', ') || 'keine'}`);
