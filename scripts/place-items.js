// Verteilt die sichtbaren Gegenstaende (Itembaelle) aus Platin auf die Karten dieses Spiels und schreibt
// shared/data/fieldItems.js. Quelle der Liste: res/field/scripts/scripts_visible_items.s aus
// github.com/pret/pokeplatinum (welcher Gegenstand auf welcher Originalkarte liegt). Die Karten hier
// sind eigene Nachbauten, deshalb waehlt das Skript die Felder selbst: begehbar, nicht vor Tueren,
// nicht in Sichtlinien von Trainern, moeglichst in Nischen und so, dass kein Weg versperrt wird.
//
// Aufruf: node scripts/place-items.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAPS } from '../shared/data/maps.js';
import { NPCS, TRIGGERS, TRAINERS } from '../shared/data/story.js';
import { ITEMS } from '../shared/data/items.js';
import { resolveStep, SOLID, DIRS, FIELD } from '../shared/world.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shared', 'data', 'fieldItems.js');

const ORIGINAL = {
  Route202: 'potion',
  Route203: 'repel poke-ball x-defense',
  OreburghGateB1F: 'tm01 tm31 tm70 earth-plate big-pearl',
  OreburghMineB2F: 'escape-rope potion',
  Route204South: 'sea-incense hp-up parlyz-heal',
  RavagedPath: 'tm39 luck-incense tm03 potion',
  Route204North: 'tm09 awakening',
  ValleyWindworksOutside: 'tm24 potion electirizer',
  Route205South: 'heal-ball x-sp-def repel super-potion',
  EternaForest: 'antidote parlyz-heal net-ball green-shard ether potion',
  OldChateauSideRooms: 'old-gateau',
  Route205North: 'guard-spec',
  EternaCity: 'tm46 super-potion',
  Unused7025: 'pp-up',
  Route211West: 'tm12',
  EternaForestOutside: 'tm82 silverpowder',
  Route206: 'poison-barb pp-up super-repel burn-heal',
  WaywardCave1F: 'tm32 revive escape-rope tm26',
  MtCoronet4FRooms1And2: 'adamant-orb lustrous-orb',
  WaywardCaveB1F: 'max-ether rare-candy grip-claw',
  Route207: 'poke-ball revive iron super-potion timer-ball',
  MtCoronet1FSouth: 'protein dawn-stone',
  Route208: 'carbos great-ball ether',
  AmitySquare: 'tm45 tm43 spooky-plate amulet-coin',
  Route212North: 'tm11 rose-incense elixir iron green-shard',
  PokemonMansionOffice: 'tm87',
  PokemonMansionMaidsRoom: 'luxury-ball',
  Route212South: 'full-heal tm84 tm62 zinc hyper-potion tm06 revive blue-shard elixir',
  GreatMarsh1: 'yellow-shard poke-ball',
  GreatMarsh2: 'blue-shard',
  GreatMarsh4: 'poke-ball green-shard',
  GreatMarsh3: 'great-ball',
  GreatMarsh5: 'great-ball',
  GreatMarsh6: 'red-shard',
  PastoriaCity: 'mystic-water',
  Route213: 'tm05 tm40 yellow-shard max-revive water-stone pp-up protein',
  ValorLakefront: 'tm85 ultra-ball iron',
  Route209: 'great-ball hyper-potion calcium tm47 tm19 ether',
  Route209LostTower2F: 'oval-stone',
  FullmoonIslandForest: 'lunar-wing',
  Route209LostTower3F: 'revive',
  Route209LostTower4F: 'tm27',
  SolaceonRuinsRoom7: 'mind-plate odd-incense nugget hm05',
  Route210South: 'super-repel max-repel nest-ball hyper-potion',
  Route221: 'pure-incense ultra-ball protein tm81',
  Route215: 'fist-plate hyper-potion max-ether full-heal tm34 hp-up',
  VeilstoneCity: 'full-incense rare-candy star-piece',
  VeilstoneCityGalacticWarehouse: 'dusk-stone hm02',
  Route214: 'big-root red-shard max-repel rare-candy magmarizer',
  RuinManiacCaveOrTunnel: 'tm28',
  Route210North: 'smoke-ball wave-incense tm30 red-shard zinc',
  FuegoIronworksBuilding: 'tm35 rock-incense calcium fire-stone blue-shard red-shard green-shard yellow-shard',
  Route219: 'antidote',
  Route220: 'splash-plate carbos max-repel',
  Route218: 'rare-candy hyper-potion x-accuracy',
  CanalaveCity: 'tm89',
  IronIslandB1FLeftRoom: 'protector yellow-shard',
  IronIslandB1FRightRoom: 'escape-rope max-repel revive',
  IronIslandB2FRightRoom: 'elixir tm23',
  IronIslandB2FLeftRoom: 'dusk-ball max-potion ultra-ball hp-up red-shard magnet',
  IronIslandB3F: 'shiny-stone',
  FloaromaMeadow: 'miracle-seed leaf-stone ultra-ball rare-candy',
  Route211East: 'tm29 carbos',
  MtCoronet1FNorthRoom1: 'tm69 escape-rope rare-candy ice-heal',
  MtCoronetB1F: 'soft-sand light-clay ultra-ball full-restore max-elixir revive',
  Route216: 'tm13 mental-herb full-heal hp-up max-potion revive',
  Route217: 'tm07 hm08 iron blue-shard ultra-ball rare-candy',
  AcuityLakefront: 'ultra-ball reaper-cloth',
  GalacticHQB2F: 'tm36 galactic-key zinc',
  GalacticHQ1F: 'tm49 dubious-disc',
  GalacticHQ3F: 'tm21 max-elixir protein',
  GalacticHQ2F: 'max-revive green-shard',
  MtCoronet2F: 'max-revive tm80 max-repel escape-rope',
  MtCoronet1FNorthRoom: 'tm02',
  Route222: 'carbos full-restore quick-ball pp-up',
  SunyshoreCity: 'thunderstone',
  Route223: 'ultra-ball dive-ball tm18 rare-candy',
  VictoryRoad1F: 'tm41 max-repel rare-candy zinc razor-claw',
  VictoryRoad2F: 'max-elixir full-restore tm79 tm71',
  VictoryRoadB1F: 'tm59 ultra-ball calcium',
  VictoryRoad1FRoom2: 'full-restore dusk-stone nugget leftovers',
  Route224: 'razor-claw rare-candy destiny-knot upgrade repeat-ball pp-max ultra-ball',
  Route225: 'razor-fang rare-candy hp-up lax-incense dubious-disc dawn-stone revive green-shard',
  Route226: 'tm53 lagging-tail carbos',
  Route227: 'charcoal zinc yellow-shard',
  StarkMountainOutside: 'max-elixir life-orb',
  StarkMountainRoom1: 'full-heal escape-rope pp-up full-restore',
  StarkMountainRoom2: 'tm50 iron-ball max-elixir nugget rare-candy ultra-ball max-revive calcium',
  Route228: 'protector iron shiny-stone shed-shell tm37',
  Route229: 'reaper-cloth protein full-restore',
  ResortArea: 'nugget',
  Route230: 'rare-candy blue-shard',
  OreburghMineB1F: 'poke-ball',
  Unused7238: 'storage-key',
  LakeVerity: 'tm38',
  LakeValor: 'tm25',
  LakeAcuity: 'tm14',
  SnowpointTempleB1F: 'calcium',
  SnowpointTempleB4F: 'full-heal',
  BattlePark: 'razor-fang',
  OldChateauBackWestRoom: 'dread-plate',
  OldChateauBackEastRoom: 'tm90',
  JubilifeCity: 'potion',
  TrainersSchool: 'x-attack',
  OreburghCity: 'dire-hit yellow-shard',
  TeamGalacticEternaBuilding2F: 'x-speed',
  TeamGalacticEternaBuilding3F: 'x-special',
  TeamGalacticEternaBuilding4F: 'blue-shard upgrade revive',
  OldChateauDiningArea: 'rare-candy big-pearl',
  SolaceonTown: 'pp-up rare-candy',
  GalacticHQLaboratory: 'full-restore',
  SnowpointCity: 'ultra-ball',
  SurvivalArea: 'red-shard rare-candy',
  CelesticTown: 'dragon-fang',
  Unused7321: 'griseous-orb',
  IronIslandIronRuins: 'metal-coat',
  MtCoronetIcebergRuins: 'nevermeltice',
  Route228RockPeakRuins: 'hard-stone',
  Unused7325: 'nugget',
  Unused7326: 'nugget',
};

// Originalkarte -> Karte in diesem Spiel (null = gibt es hier nicht)
const MAP_OF = [
  [/^Route(\d{3})(South|North|West|East)?$/, (m) => ({ '204North': 'route_204_north', '205South': 'route_205_south', '205North': 'eterna_forest' }[m[1] + (m[2] || '')] || `route_${m[1]}`)],
  [/^OreburghGate/, 'oreburgh_gate'], [/^OreburghMine/, 'oreburgh_mine'], [/^OreburghCity$/, 'oreburgh_city'],
  [/^RavagedPath$/, 'ravaged_path'], [/^ValleyWindworksOutside$/, 'valley_windworks'], [/^EternaForest/, 'eterna_forest'],
  [/^EternaCity$/, 'eterna_city'], [/^TeamGalacticEternaBuilding/, 'eterna_galactic'], [/^WaywardCave/, 'wayward_cave'],
  [/^MtCoronet(?!IcebergRuins)/, 'mt_coronet'], [/^PastoriaCity$/, 'pastoria_city'], [/^ValorLakefront$/, 'valor_lakefront'],
  [/^SolaceonRuins/, 'solaceon_ruins'], [/^SolaceonTown$/, 'solaceon_town'], [/^VeilstoneCityGalacticWarehouse$/, 'galactic_warehouse'],
  [/^VeilstoneCity$/, 'veilstone_city'], [/^CanalaveCity$/, 'canalave_city'], [/^IronIsland(?!IronRuins)/, 'iron_island_deep'],
  [/^FloaromaMeadow$/, 'floaroma_meadow'], [/^AcuityLakefront$/, 'lake_acuity'], [/^GalacticHQ/, 'galactic_hq'],
  [/^SunyshoreCity$/, 'sunyshore_city'], [/^VictoryRoad/, 'victory_road'], [/^LakeVerity$/, 'lake_verity'], [/^LakeValor$/, 'lake_valor'],
  [/^LakeAcuity$/, 'lake_acuity'], [/^OldChateau/, 'old_chateau'], [/^JubilifeCity$/, 'jubilife_city'], [/^TrainersSchool$/, 'jubilife_school'],
  [/^SnowpointCity$/, 'snowpoint_city'], [/^CelesticTown$/, 'celestic_town'], [/^SnowpointTemple/, 'snowpoint_temple'],
  [/^StarkMountainOutside$/, 'stark_mountain'], [/^StarkMountainRoom/, 'stark_mountain_deep'], [/^SurvivalArea$/, 'survival_area'],
  [/^FullmoonIsland/, 'fullmoon_island']
];
// Story-Gegenstaende (VMs, Schluessel) vergibt die Story selbst
const SKIP = new Set(['hm02', 'hm05', 'hm08', 'storage-key', 'galactic-key', 'lunar-wing']);
const RENAME = { 'parlyz-heal': 'paralyze-heal', upgrade: 'up-grade', silverpowder: 'silver-powder', nevermeltice: 'never-melt-ice', 'x-special': 'x-sp-atk', thunderstone: 'thunder-stone' };

function ourMap(orig) {
  for (const [re, to] of MAP_OF) { const m = orig.match(re); if (m) return typeof to === 'function' ? to(m) : to; }
  return null;
}

const ALL = new Proxy({}, { get: (_, k) => typeof k === 'string' && !k.startsWith('!') });
const NONE = {};
// Felder, auf denen ein Ball liegen darf
const FLOOR = new Set(['.', ',', '=', '*', ';', ':', '_']);

function placeOnMap(id, items) {
  const map = MAPS[id];
  const npcs = (NPCS[id] || []).filter((n) => !n.id.startsWith('ball_'));
  const bad = new Set();
  const mark = (x, y) => bad.add(`${x},${y}`);
  for (const n of npcs) {
    for (const [dx, dy] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]) mark(n.x + dx, n.y + dy);
    const tr = n.trainer && TRAINERS[n.trainer];
    if (tr?.sight) for (let k = 1; k <= tr.sight + 1; k++) mark(n.x + DIRS[n.dir].dx * k, n.y + DIRS[n.dir].dy * k);
  }
  for (const t of TRIGGERS[id] || []) for (let y = t.y - 1; y < t.y + (t.h || 1) + 1; y++) for (let x = t.x - 1; x < t.x + (t.w || 1) + 1; x++) mark(x, y);
  for (const w of map.warps || []) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) mark(w.x + dx, w.y + dy);
  for (const m of Object.values(MAPS)) for (const w of m.warps || []) if (w.to === id) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) mark(w.tx + dx, w.ty + dy);
  for (const e of map.events || []) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) mark(e.x + dx, e.y + dy);
  if (map.fly) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) mark(map.fly[0] + dx, map.fly[1] + dy);

  // Einstiege: Warp-Ziele und Kartenraender mit Verbindung
  const entries = [];
  for (const m of Object.values(MAPS)) for (const w of m.warps || []) if (w.to === id) entries.push([w.tx, w.ty]);
  const C = map.connections || {};
  for (let x = 0; x < map.width; x++) { if (C.north) entries.push([x, 0]); if (C.south) entries.push([x, map.height - 1]); }
  for (let y = 0; y < map.height; y++) { if (C.west) entries.push([0, y]); if (C.east) entries.push([map.width - 1, y]); }
  if (map.fly) entries.push(map.fly);

  const blockedBy = (balls) => (m, x, y) => m === id && (balls.has(`${x},${y}`) || npcs.some((n) => n.x === x && n.y === y));
  const reach = (balls, flags) => {
    const seen = new Set(); const q = [];
    for (const [x, y] of entries) {
      const t = map.tiles[y]?.[x];
      if (t === undefined || (SOLID.has(t) && !(FIELD[t] && flags[FIELD[t]])) || balls.has(`${x},${y}`)) continue;
      const k = `${x},${y}`; if (!seen.has(k)) { seen.add(k); q.push([x, y]); }
    }
    const blocked = blockedBy(balls);
    while (q.length) {
      const [x, y] = q.shift();
      for (const dir of Object.keys(DIRS)) {
        const r = resolveStep(MAPS, id, x, y, dir, blocked, flags);
        if (!r.ok || r.map !== id || r.warp) continue;
        const k = `${r.x},${r.y}`;
        if (!seen.has(k)) { seen.add(k); q.push([r.x, r.y]); }
      }
    }
    return seen;
  };
  const balls = new Set();
  const placed = [];
  const baseAll = reach(balls, ALL);
  // Offene Nachbarn: alles ausser festen Hindernissen (Feldhindernisse und Vorspruenge zaehlen als offen)
  const hard = (x, y) => { const t = map.tiles[y]?.[x]; return t === undefined || (SOLID.has(t) && !FIELD[t]) || npcs.some((n) => n.x === x && n.y === y); };
  const open = (x, y) => [[0, 1], [0, -1], [1, 0], [-1, 0]].filter(([dx, dy]) => !hard(x + dx, y + dy) && !balls.has(`${x + dx},${y + dy}`)).length;
  const cands = [...baseAll].map((k) => k.split(',').map(Number)).filter(([x, y]) => (FLOOR.has(map.tiles[y][x]) || map.tiles[y][x] === '~') && !bad.has(`${x},${y}`)
    && x > 0 && y > 0 && x < map.width - 1 && y < map.height - 1);
  // Pruefung fuer Felder mit mehr als einem offenen Nachbarn: kein Einstieg darf etwas verlieren,
  // weder ohne noch mit allen Feldattacken noch mit jeder einzelnen.
  const flagSets = [NONE, ALL, ...Object.values(FIELD).map((f) => ({ [f]: true }))];
  const reps = [];
  for (const e of entries) if (!reps.some((r) => Math.abs(r[0] - e[0]) + Math.abs(r[1] - e[1]) <= 1)) reps.push(e);
  const reachFrom = (e, b, flags) => { const save = entries.splice(0); entries.push(e); const r = reach(b, flags); entries.splice(0); entries.push(...save); return r; };
  const safe = (k) => {
    const before = new Set(balls); const after = new Set(balls); after.add(k);
    for (const flags of flagSets) for (const e of reps) {
      if (after.has(`${e[0]},${e[1]}`)) return false;
      const a = reachFrom(e, before, flags); const b = reachFrom(e, after, flags);
      for (const t of a) if (t !== k && !b.has(t)) return false;
    }
    return true;
  };
  for (const item of items) {
    const score = ([x, y]) => {
      const dist = placed.length ? Math.min(...placed.map((p) => Math.abs(p.x - x) + Math.abs(p.y - y))) : 12;
      return (open(x, y) === 1 ? 40 : 0) + Math.min(dist, 12) + (map.tiles[y][x] === '~' ? -30 : 0) + ((x * 7 + y * 13) % 5) / 10;
    };
    const sorted = cands.filter(([x, y]) => !balls.has(`${x},${y}`) && open(x, y) >= 1).sort((a, b) => score(b) - score(a));
    let hit = null;
    for (const c of sorted.slice(0, 40)) {
      const k = `${c[0]},${c[1]}`;
      if (open(c[0], c[1]) === 1 || safe(k)) { hit = c; break; }
    }
    if (!hit) { console.warn(`  Kein Platz auf ${id} fuer ${item}`); continue; }
    balls.add(`${hit[0]},${hit[1]}`);
    placed.push({ x: hit[0], y: hit[1], item });
  }
  return placed;
}

const byMap = {}; const missing = {}; const unknownItems = new Set();
for (const [orig, list] of Object.entries(ORIGINAL)) {
  if (orig.startsWith('Unused')) continue;
  const id = ourMap(orig);
  for (let it of list.split(' ')) {
    it = RENAME[it] || it;
    if (SKIP.has(it)) continue;
    if (!ITEMS[it]) { unknownItems.add(it); continue; }
    if (!id || !MAPS[id]) { (missing[orig] ||= []).push(it); continue; }
    (byMap[id] ||= []).push(it);
  }
}
const out = {};
for (const [id, items] of Object.entries(byMap)) out[id] = placeOnMap(id, items);
const total = Object.values(out).reduce((a, l) => a + l.length, 0);
const body = Object.entries(out).map(([id, l]) => `  ${id}: [${l.map((p) => `[${p.x}, ${p.y}, '${p.item}']`).join(', ')}]`).join(',\n');
fs.writeFileSync(OUT, `// Itembaelle wie in Platin: [x, y, Gegenstand] pro Karte. Erzeugt von scripts/place-items.js, nicht von Hand aendern.
// Jeder Ball laesst sich pro Spieler einmal aufheben (Flag got_<id>).
export const FIELD_ITEMS = {
${body}
};
`);
console.log(`${total} Itembaelle auf ${Object.keys(out).length} Karten -> ${path.relative(ROOT, OUT)}`);
if (unknownItems.size) console.log('Unbekannte Gegenstaende:', [...unknownItems].join(' '));
console.log('Originalkarten ohne Gegenstueck:', Object.entries(missing).map(([k, l]) => `${k} (${l.length})`).join(', '));
