// Laedt die deutschen Original-Texte fuer Pokedex-Eintraege, Attacken, Faehigkeiten und Gegenstaende
// aus den offenen CSV-Daten der PokeAPI (https://github.com/PokeAPI/pokeapi) nach
// shared/data/generated/texts.json. Der Ordner ist gitignored: Die Texte gehoeren Nintendo und werden
// nicht mit dem Code verteilt. Fehlt die Datei, nutzt das Spiel eigene, aus den Werten erzeugte Texte.
// Die PokeAPI kennt deutsche Texte erst ab X und Y, deshalb stammen sie aus diesen Editionen.
// Die Gegenstandsbeschreibungen kommen danach aus der Platin-Spalte der Beschreibungstabellen im
// PokeWiki (https://www.pokewiki.de, Seiten mit {{Item Tabelle|mode=Beschreibungen}}), also genau so
// wie sie im Beutel von Pokemon Platin stehen. Fehlt dort ein Eintrag, bleibt der Text aus X und Y.
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

// ---- Platin-Beschreibungen aus dem PokeWiki ----
const WIKI = 'https://www.pokewiki.de/api.php';
const UA = 'platin-multiplayer-texts/1.0 (npm run texts)';
async function wikiGet(params) {
  const url = WIKI + '?' + new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  if (useCurl) return JSON.parse(execFileSync('curl', ['-sSfL', '--retry', '2', '-A', UA, url], { maxBuffer: 1 << 28 }).toString('utf8'));
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} vom PokeWiki`);
  return res.json();
}

// Inhalt der Vorlage ab `start` bis zur passenden schliessenden Klammer
function templateAt(text, start) {
  let depth = 0;
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === '{' && text[i + 1] === '{') { depth++; i++; } else if (text[i] === '}' && text[i + 1] === '}') { depth--; i++; if (!depth) return text.slice(start + 2, i - 1); }
  }
  return text.slice(start + 2);
}
// Parameter einer Vorlage, nur an '|' ausserhalb von [[...]] und {{...}} getrennt
function templateParams(body) {
  const parts = []; let cur = ''; let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; cur += two; i++; continue; }
    if ((two === '}}' || two === ']]') && depth) { depth--; cur += two; i++; continue; }
    if (body[i] === '|' && !depth) { parts.push(cur); cur = ''; continue; }
    cur += body[i];
  }
  parts.push(cur);
  const out = {};
  for (const p of parts.slice(1)) { const eq = p.indexOf('='); if (eq > 0) out[p.slice(0, eq).trim()] = p.slice(eq + 1).trim(); }
  return out;
}
// Wiki-Auszeichnung entfernen; bei mehreren Teilen (Beutel, Pruefen, Untergrund) zaehlt der Beutel-Text
function wikiText(v) {
  let segs = v.split(/<br\s*\/?>/i).map((t) => t.trim()).filter(Boolean);
  const label = /^(?:'{2,3})?([A-Za-zÄÖÜäöüß ]{2,20})(?:'{2,3})?:(?:'{2,3})?\s*/;
  if (segs.length > 1 || label.test(segs[0] || '')) {
    const bag = segs.find((t) => { const m = t.match(label); return m && /^beutel$/i.test(m[1].trim()); });
    if (bag) segs = [bag];
    else if (segs.every((t) => label.test(t))) segs = [segs[0]];
    segs = segs.map((t) => t.replace(label, ''));
  }
  let t = segs.join(' ');
  for (let k = 0; k < 4; k++) t = t.replace(/\{\{([^{}|]*)(?:\|([^{}|]*))?[^{}]*\}\}/g, (_, a, b) => (b ?? a));
  t = t.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/<ref[^>]*\/>/gi, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<[^>]+>/g, ' ').replace(/'{2,3}/g, '').replace(/&nbsp;/g, ' ').replace(/[\u2013\u2014]/g, '-');
  return clean(t);
}
function platinumFromWikitext(text) {
  const out = { en: null, text: null };
  const en = text.match(/\|\s*Name_en\s*=\s*([^\n|}]+)/);
  if (en) out.en = en[1].trim();
  const at = text.search(/\{\{\s*Item Tabelle\s*\|\s*mode\s*=\s*Beschreibungen/);
  if (at < 0) return out;
  const p = templateParams(templateAt(text, at));
  const v = p.pt || p.dppt || p.ptdp || p.dp || p.hgss;
  if (v) out.text = wikiText(v) || null;
  return out;
}

async function platinumItems(dir, itemId) {
  const names = parseCsv(await get(dir, 'item_names'));
  const gen4 = new Set(parseCsv(await get(dir, 'item_game_indices')).filter((r) => r.generation_id === '4').map((r) => r.item_id));
  const byEn = new Map(); const de = new Map();
  for (const r of names) {
    if (!gen4.has(r.item_id)) continue;
    const ident = itemId.get(r.item_id);
    if (!ident || /^(tm|hm)\d/.test(ident)) continue;
    if (r.local_language_id === '9') byEn.set(r.name.toLowerCase(), ident);
    if (r.local_language_id === '6') de.set(r.name, ident);
  }
  console.log(`Lade Platin-Beschreibungen von ${WIKI.replace('/api.php', '')} (${de.size} Gegenstaende) ...`);
  const result = {};
  const titles = [...de.keys()];
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const data = await wikiGet({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', redirects: '1', titles: batch.join('|') });
    const q = data.query || {};
    // angefragter Titel zu endgueltigem Seitentitel
    const final = new Map(batch.map((t) => [t, t]));
    for (const n of q.normalized || []) for (const [k, v] of final) if (v === n.from) final.set(k, n.to);
    for (const r of q.redirects || []) for (const [k, v] of final) if (v === r.from) final.set(k, r.to);
    const byTitle = new Map((q.pages || []).filter((pg) => !pg.missing).map((pg) => [pg.title, pg.revisions?.[0]?.slots?.main?.content || '']));
    for (const t of batch) {
      const content = byTitle.get(final.get(t));
      if (!content) continue;
      const r = platinumFromWikitext(content);
      if (!r.text) continue;
      const ident = (r.en && byEn.get(r.en.toLowerCase())) || de.get(t);
      if (ident) result[ident] = r.text;
    }
    await new Promise((res) => setTimeout(res, 300));
  }
  return result;
}

const dir = process.argv[2];
console.log(dir ? `Lese CSV-Dateien aus ${dir} ...` : 'Lade deutsche Texte von github.com/PokeAPI/pokeapi ...');
const moves = parseCsv(await get(dir, 'moves'));
const abilities = parseCsv(await get(dir, 'abilities'));
const items = parseCsv(await get(dir, 'items'));
const moveId = new Map(moves.map((r) => [r.id, r.identifier]));
const abilityId = new Map(abilities.map((r) => [r.id, r.identifier]));
const itemId = new Map(items.map((r) => [r.id, r.identifier]));

const out = { source: 'PokeAPI CSV, deutsche Texte aus X/Y; Gegenstaende aus Platin (PokeWiki)', dex: {}, moves: {}, abilities: {}, items: {} };
out.dex = pick(parseCsv(await get(dir, 'pokemon_species_flavor_text')), 'species_id', 'version_id', VERSIONS, (k) => (Number(k) <= 493 ? k : null));
console.log(`  Pokedex-Eintraege: ${Object.keys(out.dex).length}`);
out.moves = pick(parseCsv(await get(dir, 'move_flavor_text')), 'move_id', 'version_group_id', GROUPS, (k) => moveId.get(k));
console.log(`  Attacken: ${Object.keys(out.moves).length}`);
out.abilities = pick(parseCsv(await get(dir, 'ability_flavor_text')), 'ability_id', 'version_group_id', GROUPS, (k) => abilityId.get(k));
console.log(`  Faehigkeiten: ${Object.keys(out.abilities).length}`);
out.items = pick(parseCsv(await get(dir, 'item_flavor_text')), 'item_id', 'version_group_id', GROUPS, (k) => itemId.get(k));
console.log(`  Gegenstaende (X/Y): ${Object.keys(out.items).length}`);
if (process.env.NO_WIKI) console.log('  Platin-Texte uebersprungen (NO_WIKI)');
else {
  try {
    const pt = await platinumItems(dir, itemId);
    Object.assign(out.items, pt);
    out.itemsPlatinum = Object.keys(pt).length;
    console.log(`  Gegenstaende aus Platin: ${out.itemsPlatinum}`);
  } catch (e) {
    console.log(`  Platin-Texte nicht geladen (${e.message}), es bleiben die Texte aus X/Y`);
  }
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`Fertig: ${path.relative(ROOT, OUT)} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);
