// Erzeugung und Entwicklung einzelner Pokemon (Werte, Attacken, EP, Entwicklung).
import crypto from 'node:crypto';
import { POKEMON } from '../../shared/data/pokemon.js';
import { MOVES } from '../../shared/data/moves.js';
import { NATURES } from '../../shared/data/natures.js';
import { calcStats, STAT_KEYS, SHINY_ODDS } from '../../shared/formulas.js';
import { expForLevel, levelForExp } from '../../shared/data/growth.js';

const rnd = (n) => Math.floor(Math.random() * n);

export function species(id) {
  const s = POKEMON[id];
  if (!s) throw new Error(`Unbekannte Art ${id}`);
  return s;
}

// Die letzten vier per Level erlernbaren Attacken (wie bei wilden Pokemon im Original).
export function defaultMoves(sp, level) {
  const learned = [];
  for (const [lv, id] of sp.learnset) {
    if (lv > level || !MOVES[id] || learned.includes(id)) continue;
    learned.push(id);
  }
  return learned.slice(-4).map((id) => ({ id, pp: MOVES[id].pp, maxPp: MOVES[id].pp }));
}

export function createPokemon(speciesId, level, opts = {}) {
  const sp = species(speciesId);
  const ivs = Object.fromEntries(STAT_KEYS.map((k) => [k, rnd(32)]));
  const evs = Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
  const p = {
    id: crypto.randomUUID(),
    ownerId: opts.ownerId ?? null,
    runId: opts.runId ?? null,
    speciesId,
    nickname: null,
    level,
    exp: expForLevel(sp.growth, level),
    nature: rnd(25),
    ivs,
    evs,
    gender: sp.genderRatio < 0 ? 'none' : Math.random() < sp.genderRatio ? 'm' : 'f',
    shiny: opts.shiny ?? rnd(SHINY_ODDS) === 0,
    ability: sp.ability,
    moves: defaultMoves(sp, level),
    status: null,
    hp: 0,
    stats: null,
    location: 'party',
    slot: 0,
    metRoute: opts.metRoute ?? null,
    metLevel: level,
    alive: true
  };
  p.stats = calcStats(sp, level, ivs, evs, p.nature);
  p.hp = p.stats.hp;
  return p;
}

// Entwicklungsstufe (1 = Basis). Wird fuer die prozedurale Grafik und Trainer-KI genutzt.
let preCache = null; let preCount = 0;
export function stageOf(id) {
  const count = Object.keys(POKEMON).length;
  if (!preCache || preCount !== count) {
    preCache = new Map(); preCount = count;
    for (const sp of Object.values(POKEMON)) {
      for (const e of [sp.evo, ...(sp.evos || [])]) if (e?.to) preCache.set(Number(e.to), sp.id);
    }
  }
  let stage = 1; let cur = Number(id);
  while (preCache.has(cur) && stage < 3) { cur = preCache.get(cur); stage++; }
  return stage;
}

export function displayName(p) {
  return p.nickname || species(p.speciesId).name;
}

export function recalc(p) {
  const sp = species(p.speciesId);
  const oldMax = p.stats ? p.stats.hp : 0;
  p.stats = calcStats(sp, p.level, p.ivs, p.evs, p.nature);
  // Gen 4: aktuelle KP steigen um die Differenz der Max-KP
  if (p.hp > 0) p.hp = Math.min(p.stats.hp, p.hp + (p.stats.hp - oldMax));
  return p;
}

// EV-Ertrag (vereinfacht: Basiswert-Verteilung der besiegten Art, max. 510 gesamt / 255 pro Wert).
export function gainEvs(p, defeatedSpeciesId) {
  const sp = species(defeatedSpeciesId);
  const maxIdx = sp.base.indexOf(Math.max(...sp.base));
  const key = STAT_KEYS[maxIdx];
  const total = Object.values(p.evs).reduce((a, b) => a + b, 0);
  if (total < 510 && p.evs[key] < 255) p.evs[key] += 1;
}

// Liefert Ereignisse fuer den Kampflog: Levelaufstiege und neue Attacken.
export function addExp(p, amount) {
  const sp = species(p.speciesId);
  const events = [];
  if (p.level >= 100) return events;
  p.exp += amount;
  const newLevel = levelForExp(sp.growth, p.exp);
  while (p.level < newLevel) {
    p.level++;
    recalc(p);
    events.push({ type: 'levelup', pokemonId: p.id, level: p.level, text: `${displayName(p)} erreicht Level ${p.level}!` });
    for (const [lv, moveId] of sp.learnset) {
      if (lv !== p.level || !MOVES[moveId] || p.moves.some((m) => m.id === moveId)) continue;
      if (p.moves.length < 4) {
        p.moves.push({ id: moveId, pp: MOVES[moveId].pp, maxPp: MOVES[moveId].pp });
        events.push({ type: 'learn', text: `${displayName(p)} erlernt ${MOVES[moveId].name}!` });
      } else {
        // Im Original fragt das Spiel nach. Hier wird die Anfrage an den Client gemeldet.
        events.push({ type: 'learnPrompt', pokemonId: p.id, moveId, text: `${displayName(p)} moechte ${MOVES[moveId].name} erlernen, kennt aber schon vier Attacken.` });
      }
    }
  }
  return events;
}

export function canEvolve(p) {
  const sp = species(p.speciesId);
  return sp.evo && p.level >= sp.evo.level && POKEMON[sp.evo.to] ? sp.evo.to : null;
}

export function evolve(p) {
  const to = canEvolve(p);
  if (!to) return null;
  const from = displayName(p);
  p.speciesId = to;
  p.ability = species(to).ability;
  recalc(p);
  return { type: 'evolve', pokemonId: p.id, text: `${from} hat sich zu ${species(to).name} entwickelt!` };
}

export function healPokemon(p) {
  if (!p.alive) return p; // Nuzlocke: Tote bleiben tot
  p.hp = p.stats.hp;
  p.status = null;
  for (const m of p.moves) m.pp = m.maxPp;
  return p;
}

export function publicPokemon(p) {
  const sp = species(p.speciesId);
  return {
    id: p.id, speciesId: p.speciesId, species: sp.name, name: displayName(p), nickname: p.nickname, types: sp.types,
    family: sp.family, stage: stageOf(p.speciesId),
    level: p.level, hp: p.hp, maxHp: p.stats.hp, status: p.status, alive: p.alive !== false, deathCause: p.deathCause ?? null,
    shiny: p.shiny, gender: p.gender, nature: NATURES[p.nature].name, ability: p.ability, stats: p.stats,
    exp: p.exp, expThis: expForLevel(sp.growth, p.level), expNext: expForLevel(sp.growth, Math.min(100, p.level + 1)),
    moves: p.moves.map((m) => ({ ...m, name: MOVES[m.id].name, type: MOVES[m.id].type, cat: MOVES[m.id].cat, power: MOVES[m.id].power })),
    location: p.location, slot: p.slot, metRoute: p.metRoute
  };
}
