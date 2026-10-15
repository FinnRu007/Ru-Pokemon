// Optionaler Loader fuer die PokeAPI (https://pokeapi.co). Laedt Arten und Attacken im
// Platin-Stand (version_group "platinum") und speichert sie als JSON-Cache. Beim Serverstart
// werden gecachte Daten in die eingebetteten Tabellen gemischt (eingebettete Werte haben Vorrang
// nur, wenn OVERRIDE nicht gesetzt ist).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../config.js';
import { POKEMON } from '../../shared/data/pokemon.js';
import { MOVES } from '../../shared/data/moves.js';

const API = 'https://pokeapi.co/api/v2';
const CACHE = path.join(ROOT, 'shared', 'data', 'generated', 'pokeapi.json');
const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const GROWTH_MAP = { 'slow': 'slow', 'medium': 'medium_fast', 'fast': 'fast', 'medium-slow': 'medium_slow', 'slow-then-very-fast': 'erratic', 'fast-then-very-slow': 'fluctuating' };
const GEN4_GROUPS = ['diamond-pearl', 'platinum', 'heartgold-soulsilver'];

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'platin-multiplayer' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function germanName(names, fallback) {
  return names?.find((n) => n.language.name === 'de')?.name || fallback;
}

// Gen-4-Werte einer Attacke: past_values ueberschreiben aktuelle Werte, falls sie fuer
// eine Versionsgruppe nach Gen 4 geaendert wurden.
function gen4MoveValues(m) {
  const v = { power: m.power, accuracy: m.accuracy, pp: m.pp, type: m.type.name };
  const later = (m.past_values || []).filter((pv) => !GEN4_GROUPS.includes(pv.version_group.name));
  // past_values geben den Wert VOR der genannten Versionsgruppe an. Der frueheste Eintrag nach Gen 4 enthaelt den Gen-4-Wert.
  for (const pv of later.reverse()) {
    if (pv.power !== null) v.power = pv.power;
    if (pv.accuracy !== null) v.accuracy = pv.accuracy;
    if (pv.pp !== null) v.pp = pv.pp;
    if (pv.type) v.type = pv.type.name;
  }
  return v;
}

export async function fetchSpecies(ids, { log = console } = {}) {
  const out = { pokemon: {}, moves: {} };
  const neededMoves = new Set();
  for (const id of ids) {
    const [p, s] = await Promise.all([getJson(`${API}/pokemon/${id}`), getJson(`${API}/pokemon-species/${id}`)]);
    const learnset = [];
    for (const mv of p.moves) {
      for (const d of mv.version_group_details) {
        if (d.version_group.name === 'platinum' && d.move_learn_method.name === 'level-up') {
          learnset.push([Math.max(1, d.level_learned_at), mv.move.name]);
          neededMoves.add(mv.move.name);
        }
      }
    }
    learnset.sort((a, b) => a[0] - b[0]);
    const types = (p.past_types?.find((pt) => ['generation-i', 'generation-ii', 'generation-iii', 'generation-iv', 'generation-v'].includes(pt.generation.name))?.types || p.types)
      .sort((a, b) => a.slot - b.slot).map((t) => t.type.name).filter((t) => t !== 'fairy');
    out.pokemon[id] = {
      id,
      name: germanName(s.names, p.name),
      types: types.length ? types : ['normal'],
      base: STAT_ORDER.map((k) => p.stats.find((x) => x.stat.name === k).base_stat),
      catchRate: s.capture_rate,
      baseExp: p.base_experience ?? 64,
      growth: GROWTH_MAP[s.growth_rate.name] || 'medium_fast',
      ability: p.abilities.find((a) => !a.is_hidden)?.ability.name || 'none',
      genderRatio: s.gender_rate < 0 ? -1 : 1 - s.gender_rate / 8,
      family: Number(s.evolution_chain.url.split('/').filter(Boolean).pop()) * 1000,
      learnset
    };
    log.info?.(`PokeAPI: ${out.pokemon[id].name} geladen`);
  }
  for (const name of neededMoves) {
    if (MOVES[name]) continue;
    const m = await getJson(`${API}/move/${name}`);
    const v = gen4MoveValues(m);
    const meta = m.meta || {};
    let effect = null;
    if (meta.drain > 0) effect = { kind: 'drain', ratio: meta.drain / 100 };
    else if (meta.drain < 0) effect = { kind: 'recoil', ratio: -meta.drain / 100 };
    else if (meta.ailment && ['paralysis', 'sleep', 'poison', 'burn', 'freeze'].includes(meta.ailment.name)) {
      effect = { kind: 'status', status: { paralysis: 'par', sleep: 'slp', poison: 'psn', burn: 'brn', freeze: 'frz' }[meta.ailment.name], chance: meta.ailment_chance || 100 };
    } else if (meta.ailment?.name === 'confusion') effect = { kind: 'confuse', chance: meta.ailment_chance || 100 };
    else if (m.stat_changes?.length) {
      const map = { attack: 'atk', defense: 'def', 'special-attack': 'spa', 'special-defense': 'spd', speed: 'spe', accuracy: 'acc', evasion: 'eva' };
      effect = { kind: 'stat', target: m.target.name === 'user' ? 'self' : 'foe', stats: Object.fromEntries(m.stat_changes.map((c) => [map[c.stat.name], c.change])), chance: meta.stat_chance || 100 };
    } else if (meta.flinch_chance) effect = { kind: 'flinch', chance: meta.flinch_chance };
    if (meta.min_hits && meta.max_hits && meta.max_hits > 1) effect = { kind: 'multihit', min: meta.min_hits, max: meta.max_hits };
    out.moves[name] = {
      id: name, name: germanName(m.names, name), type: v.type, cat: m.damage_class.name, power: v.power || 0,
      acc: v.accuracy ?? null, pp: v.pp, prio: m.priority, contact: false, effect, highCrit: (meta.crit_rate || 0) > 0,
      simplified: !effect && m.damage_class.name === 'status'
    };
  }
  return out;
}

export function loadCache() {
  if (!fs.existsSync(CACHE)) return null;
  return JSON.parse(fs.readFileSync(CACHE, 'utf8'));
}

export function saveCache(data) {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  const prev = loadCache() || { pokemon: {}, moves: {} };
  const merged = { pokemon: { ...prev.pokemon, ...data.pokemon }, moves: { ...prev.moves, ...data.moves } };
  fs.writeFileSync(CACHE, JSON.stringify(merged, null, 1));
  return merged;
}

// Mischt Cache-Daten in die Laufzeittabellen. Eingebettete Eintraege bleiben erhalten,
// es sei denn override = true.
export function applyData(data, { override = false } = {}) {
  if (!data) return { pokemon: 0, moves: 0 };
  let p = 0; let m = 0;
  for (const [id, mv] of Object.entries(data.moves || {})) if (override || !MOVES[id]) { MOVES[id] = mv; m++; }
  for (const [id, sp] of Object.entries(data.pokemon || {})) {
    if (!override && POKEMON[id]) continue;
    sp.learnset = sp.learnset.filter(([, mv]) => MOVES[mv]);
    POKEMON[id] = sp; p++;
  }
  return { pokemon: p, moves: m };
}
