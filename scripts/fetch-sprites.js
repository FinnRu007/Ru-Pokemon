// Laedt die Pokemon-Sprites aus Platin (Vorder- und Rueckansicht, normal und schillernd), die Typ-Schilder
// aus Platin und die Symbole der Gegenstaende aus dem Projekt PokeAPI/sprites sowie die Trainerbilder
// aus Diamant/Perl/Platin aus dem Projekt smogon/sprites, die Overworld-Figuren und Kampfboeden aus pret/pokeplatinum nach client/sprites/. Der Ordner ist gitignored: Die Bilder gehoeren
// Nintendo und werden nicht mit dem Code verteilt. Fehlen sie, zeichnet der Client die eigene Pixelgrafik.
// Aufruf: npm run sprites   (bereits vorhandene Dateien werden uebersprungen)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ITEMS } from '../shared/data/items.js';
import { MOVES } from '../shared/data/moves.js';
import { TRAINER_FILES } from '../client/js/art/realTrainers.js';
import { OW_FILES } from '../client/js/art/realOverworld.js';
import { TERRAINS } from '../client/js/art/realTerrain.js';
import { TOWNMAP_SOURCES, TOWNMAP_DIR, buildTownMap } from './townmap-build.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'client', 'sprites');
const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
const MAX_ID = 493;
const KINDS = {
  front: 'pokemon/versions/generation-iv/platinum',
  back: 'pokemon/versions/generation-iv/platinum/back',
  'front-shiny': 'pokemon/versions/generation-iv/platinum/shiny',
  'back-shiny': 'pokemon/versions/generation-iv/platinum/back/shiny'
};
// Typ-Schilder sind bei PokeAPI nach Typnummer abgelegt
const TYPE_IDS = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark'];

// Hinter einem Proxy (HTTPS_PROXY) kann fetch von Node nicht direkt raus, dann hilft curl.
const useCurl = !!(process.env.HTTPS_PROXY || process.env.https_proxy);
async function download(url) {
  if (useCurl) {
    try { return execFileSync('curl', ['-sSfL', '--retry', '2', url], { maxBuffer: 1 << 22 }); } catch { return null; }
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch { /* erneut versuchen */ }
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
  }
  return null;
}

const jobs = [];
for (const [kind, dir] of Object.entries(KINDS)) {
  fs.mkdirSync(path.join(OUT, kind), { recursive: true });
  for (let id = 1; id <= MAX_ID; id++) jobs.push({ url: `${BASE}/${dir}/${id}.png`, file: path.join(OUT, kind, `${id}.png`) });
}
const TRAINER_BASE = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen4/diamond-pearl';
for (const dir of ['types', 'items', 'trainers']) fs.mkdirSync(path.join(OUT, dir), { recursive: true });
TYPE_IDS.forEach((t, i) => jobs.push({ url: `${BASE}/types/generation-iv/platinum/${i + 1}.png`, file: path.join(OUT, 'types', `${t}.png`) }));
// TMs und VMs teilen sich ein Bild pro Typ (tm-fire.png usw.)
for (const [id, it] of Object.entries(ITEMS)) {
  const name = it.kind === 'tm' ? `${it.hm ? 'hm' : 'tm'}-${MOVES[it.move]?.type || 'normal'}` : id;
  jobs.push({ url: `${BASE}/items/${name}.png`, file: path.join(OUT, 'items', `${id}.png`) });
}
for (const name of TRAINER_FILES) jobs.push({ url: `${TRAINER_BASE}/${encodeURIComponent(name)}.png`, file: path.join(OUT, 'trainers', `${name}.png`) });
const OW_BASE = 'https://raw.githubusercontent.com/pret/pokeplatinum/main/res/graphics/field_sprites';
for (const f of OW_FILES) {
  fs.mkdirSync(path.join(OUT, 'overworld', path.dirname(f)), { recursive: true });
  jobs.push({ url: `${OW_BASE}/${f}.png`, file: path.join(OUT, 'overworld', `${f}.png`) });
}
const TERRAIN_BASE = 'https://raw.githubusercontent.com/pret/pokeplatinum/main/res/graphics/battle/terrain';
for (const t of TERRAINS) {
  fs.mkdirSync(path.join(OUT, 'terrain', t), { recursive: true });
  for (const side of ['enemy', 'player']) jobs.push({ url: `${TERRAIN_BASE}/${t}/${side}.png`, file: path.join(OUT, 'terrain', t, `${side}.png`) });
}
// Bodentexturen (NSBTX, entpackt der Browser selbst) und Feldobjekte fuer die Weltgrafik
const FIELD_BASE = 'https://raw.githubusercontent.com/pret/pokeplatinum/main/res';
const FIELD_SETS = ['map_texture_set_006', 'map_texture_set_014'];
const FIELD_OBJECTS = ['rock_smash', 'cut_tree', 'strength_boulder'];
fs.mkdirSync(path.join(OUT, 'field'), { recursive: true });
for (const f of FIELD_SETS) jobs.push({ url: `${FIELD_BASE}/field/maps/texture_sets/${f}.nsbtx`, file: path.join(OUT, 'field', `${f}.nsbtx`) });
// Gebaeude im Stil der 4. Generation (Kachelsatz aus Pokemon Essentials)
jobs.push({ url: 'https://raw.githubusercontent.com/Manurocker95/Pokemon-Essentials-21-With-Unofficial-EBDX/main/Graphics/Tilesets/Outside.png', file: path.join(OUT, 'field', 'Outside.png') });
for (const f of FIELD_OBJECTS) jobs.push({ url: `${FIELD_BASE}/graphics/field_sprites/objects/${f}.png`, file: path.join(OUT, 'field', `${f}.png`) });
// Formen (Icognito-Buchstaben) und das Ei
const FORMS = { 201: [...'bcdefghijklmnopqrstuvwxyz'.split(''), 'exclamation', 'question'] };
for (const [kind, dir] of Object.entries(KINDS)) {
  fs.mkdirSync(path.join(OUT, 'forms', kind), { recursive: true });
  for (const [id, forms] of Object.entries(FORMS)) for (const f of forms) jobs.push({ url: `${BASE}/${dir}/${id}-${f}.png`, file: path.join(OUT, 'forms', kind, `${id}-${f}.png`) });
}
jobs.push({ url: `${BASE}/pokemon/egg.png`, file: path.join(OUT, 'egg.png') });
// Karte von Sinnoh (Karten-App): Kacheln, Palette, Tilemaps und Felder, zusammengesetzt von townmap-build.js
fs.mkdirSync(path.join(TOWNMAP_DIR, 'src'), { recursive: true });
for (const [name, url] of Object.entries(TOWNMAP_SOURCES)) jobs.push({ url, file: path.join(TOWNMAP_DIR, 'src', name) });
const total = jobs.length;

let done = 0, loaded = 0, failed = 0;
async function worker() {
  while (jobs.length) {
    const job = jobs.shift();
    if (!fs.existsSync(job.file)) {
      const data = await download(job.url);
      if (data && data.length) { fs.writeFileSync(job.file, data); loaded++; } else failed++;
    }
    if (++done % 250 === 0) process.stdout.write(`\r${done} / ${total} Bilder`);
  }
}
console.log('Lade Sprites aus github.com/PokeAPI/sprites und github.com/smogon/sprites und github.com/pret/pokeplatinum ...');
await Promise.all(Array.from({ length: useCurl ? 8 : 24 }, worker));

// Verzeichnis, welche Bilder vorhanden sind (der Client fragt nur diese Datei ab)
const index = { source: ['https://github.com/PokeAPI/sprites', 'https://github.com/smogon/sprites', 'https://github.com/pret/pokeplatinum'], kinds: {} };
for (const kind of Object.keys(KINDS)) {
  index.kinds[kind] = fs.readdirSync(path.join(OUT, kind)).filter((f) => f.endsWith('.png')).map((f) => +f.slice(0, -4)).sort((a, b) => a - b);
}
for (const dir of ['types', 'items', 'trainers']) index[dir] = fs.readdirSync(path.join(OUT, dir)).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4));
index.terrain = TERRAINS.filter((t) => ['enemy', 'player'].every((s) => fs.existsSync(path.join(OUT, 'terrain', t, `${s}.png`))));
index.field = [...FIELD_SETS, ...FIELD_OBJECTS, 'Outside'].filter((f) => fs.existsSync(path.join(OUT, 'field', `${f}.${f.startsWith('map_') ? 'nsbtx' : 'png'}`)));
index.overworld = OW_FILES.filter((f) => fs.existsSync(path.join(OUT, 'overworld', `${f}.png`)));
index.forms = Object.keys(KINDS).flatMap((kind) => fs.readdirSync(path.join(OUT, 'forms', kind)).filter((f) => f.endsWith('.png')).map((f) => `${kind}/${f.slice(0, -4)}`));
index.egg = fs.existsSync(path.join(OUT, 'egg.png'));
try { index.townmap = buildTownMap(); } catch (e) { index.townmap = false; console.log(`\nKarte von Sinnoh nicht erstellt: ${e.message}`); }
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));
console.log(`\nFertig: ${loaded} neu geladen, ${failed} nicht gefunden. Ordner: client/sprites/`);
for (const [k, ids] of Object.entries({ ...index.kinds, types: index.types, items: index.items, trainers: index.trainers, overworld: index.overworld, terrain: index.terrain, field: index.field })) console.log(`  ${k}: ${ids.length}`);
