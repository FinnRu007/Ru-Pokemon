// Laedt die deutschen Original-Texte fuer Pokedex-Eintraege, Attacken, Faehigkeiten und Gegenstaende
// aus den offenen CSV-Daten der PokeAPI (https://github.com/PokeAPI/pokeapi) nach
// shared/data/generated/texts.json. Der Ordner ist gitignored: Die Texte gehoeren Nintendo und werden
// nicht mit dem Code verteilt. Fehlt die Datei, nutzt das Spiel eigene, aus den Werten erzeugte Texte.
// Die PokeAPI kennt deutsche Texte erst ab X und Y, deshalb stammen sie aus diesen Editionen.
//
// Aufruf: npm run texts                 (laedt von raw.githubusercontent.com)
//         npm run texts -- ./csv-ordner  (nutzt bereits heruntergeladene CSV-Dateien)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shared', 'data', 'generated', 'texts.json');
const BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/';
const GERMAN = '6';
// Editionen in Reihenfolge der Vorliebe: X, Y, Omega Rubin, Alpha Saphir, Sonne, Mond
const VERSIONS = ['23', '24', '25', '26', '27', '28'];
const GROUPS = ['15', '16', '17', '18', '19', '20'];

const useCurl = !!(process.env.HTTPS_PROXY || process.env.https_proxy);
async function get(dir, name) {
  if (dir) return fs.readFileSync(path.join(dir, name + '.csv'), 'utf8');
  if (useCurl) return execFileSync('curl', ['-sSfL', '--retry', '2', BASE + name + '.csv'], { maxBuffer: 1 << 26 }).toString('utf8');
  const res = await fetch(BASE + name + '.csv');
  if (!res.ok) throw new Error(`${res.status} beim Laden von ${name}.csv`);
  return res.text();
}

function parseCsv(text) {
  const rows = []; let row = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; continue; }
    if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [head, ...data] = rows;
  return data.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

// Zeilenumbrueche der DS-Textboxen entfernen, Trennstriche am Zeilenende zusammenziehen
const clean = (t) => t.replace(/­/g, '').replace(/([a-zäöüß])-\s*\n\s*([a-zäöüß])/g, '$1$2').replace(/\s*[\n\f\r]+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();

// Bevorzugten Text pro Schluessel waehlen
function pick(rows, keyCol, verCol, order, map = (k) => k) {
  const best = {};
  for (const r of rows) {
    if (r.language_id !== GERMAN) continue;
    const rank = order.indexOf(r[verCol]);
    if (rank < 0) continue;
    const k = map(r[keyCol]);
    if (k == null) continue;
    if (!best[k] || rank < best[k].rank) best[k] = { rank, text: clean(r.flavor_text) };
  }
  return Object.fromEntries(Object.entries(best).map(([k, v]) => [k, v.text]));
}

const dir = process.argv[2];
console.log(dir ? `Lese CSV-Dateien aus ${dir} ...` : 'Lade deutsche Texte von github.com/PokeAPI/pokeapi ...');
const moves = parseCsv(await get(dir, 'moves'));
const abilities = parseCsv(await get(dir, 'abilities'));
const items = parseCsv(await get(dir, 'items'));
const moveId = new Map(moves.map((r) => [r.id, r.identifier]));
const abilityId = new Map(abilities.map((r) => [r.id, r.identifier]));
const itemId = new Map(items.map((r) => [r.id, r.identifier]));

const out = { source: 'PokeAPI CSV, deutsche Texte aus X/Y', dex: {}, moves: {}, abilities: {}, items: {} };
out.dex = pick(parseCsv(await get(dir, 'pokemon_species_flavor_text')), 'species_id', 'version_id', VERSIONS, (k) => (Number(k) <= 493 ? k : null));
console.log(`  Pokedex-Eintraege: ${Object.keys(out.dex).length}`);
out.moves = pick(parseCsv(await get(dir, 'move_flavor_text')), 'move_id', 'version_group_id', GROUPS, (k) => moveId.get(k));
console.log(`  Attacken: ${Object.keys(out.moves).length}`);
out.abilities = pick(parseCsv(await get(dir, 'ability_flavor_text')), 'ability_id', 'version_group_id', GROUPS, (k) => abilityId.get(k));
console.log(`  Faehigkeiten: ${Object.keys(out.abilities).length}`);
out.items = pick(parseCsv(await get(dir, 'item_flavor_text')), 'item_id', 'version_group_id', GROUPS, (k) => itemId.get(k));
console.log(`  Gegenstaende: ${Object.keys(out.items).length}`);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`Fertig: ${path.relative(ROOT, OUT)} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);
