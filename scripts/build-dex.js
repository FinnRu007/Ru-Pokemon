// Baut den kompletten Pokedex der vierten Generation (Nr. 1 bis 493) mit allen Attacken im
// Platin-Stand aus den offenen CSV-Daten der PokeAPI (https://github.com/PokeAPI/pokeapi, BSD-3).
// Ergebnis: shared/data/dex/gen4.json, wird beim Start automatisch eingemischt.
//
// Aufruf: npm run build-dex                 (laedt die CSV-Dateien von raw.githubusercontent.com)
//         npm run build-dex -- ./csv-ordner  (nutzt bereits heruntergeladene CSV-Dateien)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shared', 'data', 'dex', 'gen4.json');
const BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/';
const FILES = ['pokemon_species', 'pokemon', 'pokemon_stats', 'pokemon_stats_past', 'pokemon_types', 'pokemon_types_past', 'pokemon_abilities',
  'abilities', 'pokemon_moves', 'moves', 'move_changelog', 'move_meta', 'move_meta_stat_changes', 'move_names', 'move_flag_map',
  'pokemon_species_names', 'pokemon_evolution', 'growth_rates', 'types', 'pokemon_dex_numbers', 'machines', 'ability_names', 'items'];

const MAX_ID = 493;
const GERMAN = '6';
const PLATINUM = '9';      // version_group_id
const SINNOH_DEX = '6';    // extended-sinnoh: Regionaler Pokedex von Platin (210 Arten)
const LAST_GEN4_VG = 10;   // HeartGold/SoulSilver
const GROWTH = { slow: 'slow', medium: 'medium_fast', fast: 'fast', 'medium-slow': 'medium_slow', 'slow-then-very-fast': 'erratic', 'fast-then-very-slow': 'fluctuating' };
const STAT_KEYS = { atk: 2, def: 3, spa: 4, spd: 5, spe: 6, acc: 7, eva: 8 };
const AILMENT = { 1: 'par', 2: 'slp', 3: 'frz', 4: 'brn', 5: 'psn' };
// Ersatzlevel fuer Entwicklungen, die es im Spiel (noch) nicht gibt: Tausch, Steine, Freundschaft, Orte
const FALLBACK = { trade: 36, item: 30, friendship: 30, babyFriendship: 15, other: 30 };

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

async function load(dir) {
  const t = {};
  for (const f of FILES) {
    let text;
    if (dir) text = fs.readFileSync(path.join(dir, f + '.csv'), 'utf8');
    else {
      const res = await fetch(BASE + f + '.csv');
      if (!res.ok) throw new Error(`${res.status} beim Laden von ${f}.csv`);
      text = await res.text();
    }
    t[f] = parseCsv(text);
  }
  return t;
}

const num = (v) => (v === '' || v == null ? null : Number(v));
const groupBy = (rows, key) => { const m = new Map(); for (const r of rows) { const k = r[key]; if (!m.has(k)) m.set(k, []); m.get(k).push(r); } return m; };

function buildMoves(t) {
  const names = new Map(t.move_names.filter((r) => r.local_language_id === GERMAN).map((r) => [r.move_id, r.name]));
  const types = new Map(t.types.map((r) => [r.id, r.identifier]));
  const meta = new Map(t.move_meta.map((r) => [r.move_id, r]));
  const statChanges = groupBy(t.move_meta_stat_changes, 'move_id');
  const changes = groupBy(t.move_changelog, 'move_id');
  const contact = new Set(t.move_flag_map.filter((r) => r.move_flag_id === '1').map((r) => r.move_id));
  const out = {}; const byNumId = {};
  for (const m of t.moves) {
    if (Number(m.generation_id) > 4 || Number(m.id) >= 10000) continue;
    const v = { type: m.type_id, power: num(m.power), pp: num(m.pp), acc: num(m.accuracy), prio: num(m.priority) };
    // Changelog nennt die Werte VOR einer Aenderung. Der frueheste Eintrag nach HGSS enthaelt den Gen-4-Stand.
    const later = (changes.get(m.id) || []).filter((c) => Number(c.changed_in_version_group_id) > LAST_GEN4_VG)
      .sort((a, b) => Number(b.changed_in_version_group_id) - Number(a.changed_in_version_group_id));
    for (const c of later) {
      if (c.type_id) v.type = c.type_id;
      if (c.power) v.power = Number(c.power);
      if (c.pp) v.pp = Number(c.pp);
      if (c.accuracy) v.acc = Number(c.accuracy);
      if (c.priority) v.prio = Number(c.priority);
    }
    const cat = { 1: 'status', 2: 'physical', 3: 'special' }[m.damage_class_id] || 'status';
    const mm = meta.get(m.id) || {};
    const self = m.target_id === '7' || m.target_id === '13' || m.target_id === '4';
    let effect = null; let simplified = false;
    const ail = Number(mm.meta_ailment_id || 0);
    const stats = (statChanges.get(m.id) || []).reduce((o, r) => {
      const k = Object.keys(STAT_KEYS).find((x) => String(STAT_KEYS[x]) === r.stat_id);
      if (k) o[k] = Number(r.change);
      return o;
    }, {});
    const statChance = Number(mm.stat_chance || 0) || 100;
    if (Number(mm.drain) > 0) effect = { kind: 'drain', ratio: Number(mm.drain) / 100 };
    else if (Number(mm.drain) < 0) effect = { kind: 'recoil', ratio: -Number(mm.drain) / 100 };
    else if (mm.meta_category_id === '3' && Number(mm.healing) > 0) effect = { kind: 'heal', amount: Number(mm.healing) / 100 };
    else if (AILMENT[ail]) effect = { kind: 'status', status: m.identifier === 'toxic' || m.identifier === 'poison-fang' ? 'tox' : AILMENT[ail], chance: Number(mm.ailment_chance) || 100 };
    else if (ail === 6) effect = { kind: 'confuse', chance: Number(mm.ailment_chance) || 100 };
    else if (ail === 8 && cat !== 'status') effect = { kind: 'trap' };
    else if (ail === 18) effect = { kind: 'leechSeed' };
    else if (Object.keys(stats).length) effect = { kind: 'stat', target: self || mm.meta_category_id === '7' ? 'self' : 'foe', stats, chance: cat === 'status' ? 100 : statChance };
    else if (mm.meta_category_id === '12' && cat === 'status') effect = { kind: 'escape' };
    if (mm.meta_category_id === '5') effect = { kind: 'swagger' };
    if (Number(mm.flinch_chance) > 0) {
      if (!effect) effect = { kind: 'flinch', chance: Number(mm.flinch_chance) };
      else effect.flinch = Number(mm.flinch_chance);
    }
    if (Number(mm.max_hits) > 1) effect = { kind: 'multihit', min: Number(mm.min_hits), max: Number(mm.max_hits) };
    if (m.identifier === 'sonic-boom') effect = { kind: 'fixed', damage: 20 };
    if (m.identifier === 'dragon-rage') effect = { kind: 'fixed', damage: 40 };
    if (m.identifier === 'seismic-toss' || m.identifier === 'night-shade') effect = { kind: 'fixed', damage: 'level' };
    let power = v.power || 0;
    if (cat !== 'status' && !power && !effect?.kind?.startsWith('fixed')) { power = 60; simplified = true; }
    if (cat === 'status' && !effect) simplified = true;
    if (mm.meta_category_id === '9' || mm.meta_category_id === '13' || mm.meta_category_id === '10' || mm.meta_category_id === '11') simplified = simplified || cat === 'status';
    const mv = {
      id: m.identifier, name: names.get(m.id) || m.identifier, type: types.get(v.type) || 'normal', cat, power,
      acc: v.acc, pp: v.pp || 10, prio: v.prio || 0, contact: contact.has(m.id), effect, highCrit: Number(mm.crit_rate || 0) > 0
    };
    if (simplified) mv.simplified = true;
    out[m.identifier] = mv; byNumId[m.id] = m.identifier;
  }
  return { moves: out, byNumId };
}

function buildPokemon(t, moveIds) {
  const species = new Map(t.pokemon_species.map((r) => [r.id, r]));
  const names = new Map(t.pokemon_species_names.filter((r) => r.local_language_id === GERMAN).map((r) => [r.pokemon_species_id, r.name]));
  const types = new Map(t.types.map((r) => [r.id, r.identifier]));
  const growth = new Map(t.growth_rates.map((r) => [r.id, r.identifier]));
  const abilities = new Map(t.abilities.map((r) => [r.id, r]));
  const pkm = new Map(t.pokemon.map((r) => [r.id, r]));
  const stats = groupBy(t.pokemon_stats, 'pokemon_id');
  const statsPast = groupBy(t.pokemon_stats_past, 'pokemon_id');
  const ptypes = groupBy(t.pokemon_types, 'pokemon_id');
  const ptypesPast = groupBy(t.pokemon_types_past, 'pokemon_id');
  const pabil = groupBy(t.pokemon_abilities, 'pokemon_id');
  const learn = new Map(); const machine = new Map(); const tutor = new Map();
  const push = (m, k, v) => { if (!m.has(k)) m.set(k, new Set()); m.get(k).add(v); };
  for (const r of t.pokemon_moves) {
    if (r.version_group_id !== PLATINUM || Number(r.pokemon_id) > MAX_ID) continue;
    const id = moveIds[r.move_id]; if (!id) continue;
    // Methode 4: TM/VM, Methode 3: Attacken-Lehrer
    if (r.pokemon_move_method_id === '4') { push(machine, r.pokemon_id, id); continue; }
    if (r.pokemon_move_method_id === '3') { push(tutor, r.pokemon_id, id); continue; }
    if (r.pokemon_move_method_id !== '1') continue;
    if (!learn.has(r.pokemon_id)) learn.set(r.pokemon_id, []);
    learn.get(r.pokemon_id).push([Math.max(1, Number(r.level)), id, Number(r.order || 0)]);
  }
  const genus = new Map(t.pokemon_species_names.filter((r) => r.local_language_id === GERMAN).map((r) => [r.pokemon_species_id, r.genus]));
  const sinnoh = new Map(t.pokemon_dex_numbers.filter((r) => r.pokedex_id === SINNOH_DEX).map((r) => [r.species_id, Number(r.pokedex_number)]));
  const familyOf = (id) => { let cur = species.get(String(id)); while (cur?.evolves_from_species_id) cur = species.get(cur.evolves_from_species_id); return Number(cur.id); };

  const itemName = new Map(t.items.map((r) => [r.id, r.identifier]));
  const evos = new Map();
  for (const e of t.pokemon_evolution) {
    const to = Number(e.evolved_species_id);
    if (to > MAX_ID || (e.version_group_id && Number(e.version_group_id) > LAST_GEN4_VG)) continue;
    const sp = species.get(String(to)); const from = sp?.evolves_from_species_id;
    if (!from) continue;
    const base = species.get(from);
    let how; let level;
    if (e.evolution_trigger_id === '1' && e.minimum_level && !e.minimum_happiness && !e.known_move_id && !e.location_id && !e.held_item_id && !e.party_species_id) { how = 'level'; level = Number(e.minimum_level); }
    else if (e.evolution_trigger_id === '1' && e.minimum_happiness) { how = 'friendship'; level = base?.is_baby === '1' ? FALLBACK.babyFriendship : FALLBACK.friendship; }
    else if (e.evolution_trigger_id === '2') { how = 'trade'; level = FALLBACK.trade; }
    else if (e.evolution_trigger_id === '3') { how = 'item'; level = FALLBACK.item; }
    else if (e.evolution_trigger_id === '1') { how = 'other'; level = Number(e.minimum_level) || FALLBACK.other; }
    else continue; // z. B. Ninjask/Ninjatom
    const ev = { to, level, how };
    // Stein (Ausloeser 3) oder getragener Gegenstand beim Tausch bzw. Levelaufstieg
    const itemNo = e.trigger_item_id || e.held_item_id;
    if (itemNo) ev.item = itemName.get(itemNo);
    if (e.gender_id) ev.gender = e.gender_id === '1' ? 'f' : 'm';
    if (!evos.has(from)) evos.set(from, []);
    const list = evos.get(from);
    if (!list.some((x) => x.to === to)) list.push(ev);
  }

  const out = {};
  for (let id = 1; id <= MAX_ID; id++) {
    const s = species.get(String(id)); const p = pkm.get(String(id));
    if (!s || !p) continue;
    const pid = String(id);
    const base = [1, 2, 3, 4, 5, 6].map((sid) => {
      const past = (statsPast.get(pid) || []).filter((r) => r.stat_id === String(sid) && Number(r.generation_id) >= 4).sort((a, b) => a.generation_id - b.generation_id)[0];
      return Number(past ? past.base_stat : stats.get(pid).find((r) => r.stat_id === String(sid)).base_stat);
    });
    const pastTypes = (ptypesPast.get(pid) || []).filter((r) => Number(r.generation_id) >= 4);
    const minGen = pastTypes.length ? Math.min(...pastTypes.map((r) => Number(r.generation_id))) : null;
    const typeRows = minGen ? pastTypes.filter((r) => Number(r.generation_id) === minGen) : ptypes.get(pid);
    const tlist = typeRows.sort((a, b) => a.slot - b.slot).map((r) => types.get(r.type_id)).filter((x) => x && x !== 'fairy');
    const ab = (pabil.get(pid) || []).filter((r) => r.is_hidden === '0' && Number(abilities.get(r.ability_id)?.generation_id) <= 4).sort((a, b) => a.slot - b.slot);
    const ls = (learn.get(pid) || []).sort((a, b) => a[0] - b[0] || a[2] - b[2]).map(([lv, mv]) => [lv, mv]);
    const sp = {
      id, name: names.get(pid) || s.identifier, types: tlist.length ? tlist : ['normal'], base,
      catchRate: Number(s.capture_rate), baseExp: Number(p.base_experience) || 64,
      growth: GROWTH[growth.get(s.growth_rate_id)] || 'medium_fast',
      ability: ab[0] ? abilities.get(ab[0].ability_id).identifier : 'none',
      genderRatio: Number(s.gender_rate) < 0 ? -1 : 1 - Number(s.gender_rate) / 8,
      family: familyOf(id), learnset: ls,
      // Pokedex: Groesse in Dezimetern, Gewicht in Hektogramm, Kategorie, Nummer im Sinnoh-Dex
      height: Number(p.height), weight: Number(p.weight), genus: (genus.get(pid) || '').replace(/-?Pokémon$/, '').trim()
    };
    if (sinnoh.has(pid)) sp.sinnoh = sinnoh.get(pid);
    if (machine.has(pid)) sp.tm = [...machine.get(pid)].sort();
    if (tutor.has(pid)) sp.tutor = [...tutor.get(pid)].sort();
    if (ab[1]) sp.ability2 = abilities.get(ab[1].ability_id).identifier;
    if (s.is_legendary === '1' || s.is_mythical === '1') sp.legendary = true;
    const e = evos.get(pid);
    if (e) sp.evos = e;
    out[id] = sp;
  }
  return out;
}

const dir = process.argv[2];
console.log(dir ? `Lese CSV-Dateien aus ${dir} ...` : 'Lade CSV-Dateien von GitHub ...');
const t = await load(dir);
const { moves, byNumId } = buildMoves(t);
const pokemon = buildPokemon(t, byNumId);
// TM01 bis TM92 und VM01 bis VM08 in Platin (Maschinennummer 101 bis 108 sind die VMs)
const machines = {};
for (const r of t.machines) {
  if (r.version_group_id !== PLATINUM || !byNumId[r.move_id]) continue;
  const n = Number(r.machine_number);
  machines[n > 100 ? `hm${String(n - 100).padStart(2, '0')}` : `tm${String(n).padStart(2, '0')}`] = byNumId[r.move_id];
}
// Deutsche Namen der Faehigkeiten
const abilityIds = new Map(t.abilities.map((r) => [r.id, r.identifier]));
const abilities = {};
for (const r of t.ability_names) if (r.local_language_id === GERMAN && abilityIds.has(r.ability_id) && Number(r.ability_id) < 10000) abilities[abilityIds.get(r.ability_id)] = r.name;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ source: 'PokeAPI CSV (BSD-3-Clause), Stand Platin', pokemon, moves, machines, abilities }));
console.log(`Fertig: ${Object.keys(pokemon).length} Arten, ${Object.keys(moves).length} Attacken -> ${path.relative(ROOT, OUT)} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);
