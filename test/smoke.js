// Rauchtest: Regelwerk (Nuzlocke + Soulbound) direkt und Multiplayer ueber echte WebSockets.
// Aufruf: npm test
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openStorage } from '../server/db/storage.js';
import { RulesEngine, DEFAULT_RULES } from '../server/game/rules.js';
import { createPokemon } from '../server/game/pokemonFactory.js';
import { WildBattle, TrainerBattle } from '../server/game/battle.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'platin-'));
let failures = 0;
async function test(name, fn) {
  try { await fn(); console.log('  ok  ', name); } catch (e) { failures++; console.log('  FAIL', name, '\n', e); }
}

for (const backend of ['sqlite', 'json']) {
  console.log(`\nRegelwerk mit Speicher: ${backend}`);
  process.env.STORAGE = backend;
  const repo = openStorage(path.join(tmp, backend));
  const rules = new RulesEngine(repo);
  repo.createRun({ id: 'SOUL', name: 'Test', rules: { ...DEFAULT_RULES, nuzlocke: true, soulbound: true, dupesClause: true, shinyClause: true, failedEncounterBreaksLink: true } });
  const mk = (name) => repo.savePlayer({ id: name, name, token: name + 't', runId: 'SOUL', gameOver: false, map: 'route_201', x: 0, y: 0 });
  const A = mk('Ash'); const B = mk('Barry');
  const catchOn = (pl, route, speciesId) => {
    const mon = createPokemon(speciesId, 3, { ownerId: pl.id, runId: 'SOUL', metRoute: route });
    const gate = rules.onEncounterStart(pl, route, mon, new Set());
    if (!gate.catchable) return { gate };
    repo.savePokemon(mon);
    const res = rules.onEncounterResolved(pl, route, 'caught', mon);
    return { gate, mon, res };
  };

  await test('Nuzlocke: nur erster Encounter pro Route fangbar', () => {
    const first = catchOn(A, 'route_201', 396);
    assert.equal(first.gate.catchable, true);
    const second = rules.onEncounterStart(A, 'route_201', createPokemon(399, 3), new Set());
    assert.equal(second.catchable, false);
  });

  await test('Soulbound: Tod von A toetet verlinkten Partner von B sofort', () => {
    const b = catchOn(B, 'route_201', 399);
    const aMon = repo.listPokemon('Ash').find((p) => p.metRoute === 'route_201');
    const r = rules.onPokemonFainted(A, aMon);
    assert.equal(r.dead, true);
    assert.equal(r.victims.length, 1);
    assert.equal(r.victims[0].pokemonId, b.mon.id);
    assert.equal(repo.getPokemon(b.mon.id).alive, false);
    assert.equal(repo.getPokemon(b.mon.id).deathCause, 'soulbound');
    assert.equal(repo.getLinkByRoute('SOUL', 'route_201').state, 'dead');
  });

  await test('Soulbound: gescheiterter Encounter bricht die Route fuer alle', () => {
    const a = catchOn(A, 'route_202', 403);
    const gate = rules.onEncounterStart(B, 'route_202', createPokemon(396, 3), new Set());
    assert.equal(gate.counted, true);
    const res = rules.onEncounterResolved(B, 'route_202', 'failed', null);
    assert.equal(res.victims[0].pokemonId, a.mon.id);
    assert.equal(repo.getPokemon(a.mon.id).alive, false);
  });

  await test('Dupes Clause: bekannte Familie zaehlt nicht', () => {
    const gate = rules.onEncounterStart(A, 'route_203', createPokemon(397, 5), new Set([396]));
    assert.equal(gate.catchable, false);
    assert.equal(gate.counted, false);
  });

  if (backend === 'sqlite') {
    await test('SQLite-Trigger: direkte DB-Aenderung propagiert den Tod', () => {
      const a = catchOn(A, 'route_204', 406);
      const b = catchOn(B, 'route_204', 265);
      repo.db.prepare('UPDATE pokemon SET alive = 0, died_at = 1 WHERE id = ?').run(a.mon.id);
      assert.equal(repo.getPokemon(b.mon.id).alive, false);
      assert.throws(() => repo.db.prepare('UPDATE pokemon SET alive = 1 WHERE id = ?').run(a.mon.id), /Nuzlocke/);
    });
  }
  repo.close();
}

console.log('\nKampfengine');
await test('Wildkampf laeuft bis zum Ende und vergibt EP', () => {
  for (let i = 0; i < 50; i++) {
    const mon = createPokemon(390, 12);
    const wild = createPokemon(396, 3);
    const b = new WildBattle({ id: 'x', party: [mon], wild, route: 'r', items: { 'poke-ball': 5 }, catchable: true, onFaint: () => [] });
    b.intro();
    let guard = 0;
    while (b.state !== 'ended' && guard++ < 60) b.act({ type: 'move', index: 0 });
    assert.equal(b.state, 'ended');
    if (b.result === 'win') assert.ok(mon.exp > 0);
  }
});
await test('Kampfstil Wechsel: nach besiegtem Gegner freier Wechsel ohne Gegenangriff', () => {
  const a = createPokemon(392, 60); const c = createPokemon(395, 60);
  const b = new TrainerBattle({ id: 't', party: [a, c], foeParty: [createPokemon(396, 2), createPokemon(396, 2)], trainer: { name: 'Test', cls: 'Top Vier' }, items: {}, onFaint: () => [] });
  b.intro();
  let guard = 0;
  while (!b.shiftOffer && b.state !== 'ended' && guard++ < 20) b.act({ type: 'move', index: 0 });
  assert.ok(b.snapshot().shiftOffer, 'Angebot');
  assert.equal(b.snapshot().trainer.cls, 'Top Vier');
  const hp = c.hp; const turn = b.turn;
  const r = b.act({ type: 'switch', index: 1, free: true });
  assert.ok(!r.error, r.error);
  assert.equal(b.ally.mon, c); assert.equal(c.hp, hp); assert.equal(b.turn, turn);
  assert.ok(!b.snapshot().shiftOffer);
});

await test('Fangen mit Ball', () => {
  let caught = 0;
  for (let i = 0; i < 40; i++) {
    const wild = createPokemon(396, 2);
    wild.hp = 1; // bei 1 KP liegt die Fangchance von Staralili (Fangrate 255) bei rund 95 %
    const b = new WildBattle({ id: 'x', party: [createPokemon(393, 30)], wild, route: 'r', items: { 'poke-ball': 1 }, catchable: true, onFaint: () => [] });
    b.act({ type: 'ball', ball: 'poke-ball' });
    if (b.result === 'caught') caught++;
  }
  assert.ok(caught >= 30, `nur ${caught}/40 gefangen`);
});
await test('Nuzlocke-Sperre verhindert Ballwurf', () => {
  const items = { 'poke-ball': 3 };
  const b = new WildBattle({ id: 'x', party: [createPokemon(393, 10)], wild: createPokemon(396, 2), route: 'r', items, catchable: false, catchBlockReason: 'gesperrt', onFaint: () => [] });
  b.act({ type: 'ball', ball: 'poke-ball' });
  assert.equal(items['poke-ball'], 3);
  assert.notEqual(b.result, 'caught');
});

console.log('\nWelt und Warps');
const { MAPS } = await import('../shared/data/maps.js');
const { resolveStep, isStandable, SOLID } = await import('../shared/world.js');
const { ORIG_ON, REMAP } = await import('../shared/data/origLayout.js');
const { ORIG_FIX } = await import('../shared/data/origFix.js');
const { SPAWN } = await import('../shared/data/maps.js');
// Alte Koordinaten auf die Originalkarten umrechnen (ohne Originaldaten unveraendert)
const P = (map, x, y) => (ORIG_ON && REMAP[map] ? REMAP[map].pt(x, y) : [x, y]);
// Kuerzester Weg (Liste von Richtungen) von einem Feld zu einem Ziel, mit derselben Schrittlogik wie Server und Client
function findPath(map, x, y, goal, max = 4000) {
  const key = (m, a, b) => `${m},${a},${b}`;
  const seen = new Map([[key(map, x, y), null]]); const q = [[map, x, y]];
  while (q.length && seen.size < max) {
    const [m, a, b] = q.shift();
    if (goal(m, a, b)) { const path = []; let k = key(m, a, b); while (seen.get(k)) { const [pk, d] = seen.get(k); path.unshift(d); k = pk; } return path; }
    for (const d of ['up', 'down', 'left', 'right']) {
      const r = resolveStep(MAPS, m, a, b, d);
      if (!r.ok || r.warp) continue;
      const k = key(r.map, r.x, r.y);
      if (!seen.has(k)) { seen.set(k, [key(m, a, b), d]); q.push([r.map, r.x, r.y]); }
    }
  }
  return null;
}
await test('Tueren, Treppen und Hoehlen fuehren hin und zurueck', () => {
  const go = (map, x, y, dir) => resolveStep(MAPS, map, x, y, dir);
  if (ORIG_ON) {
    // Originalkarten: jede Tuer fuehrt in einen Raum, aus dem ein Weg zurueck auf dieselbe Karte fuehrt
    let r = go('twinleaf_town', 20, 22, 'up');
    assert.deepEqual([r.warp, r.map], [true, 'twinleaf_home_1f']);
    r = go('twinleaf_home_1f', r.x, r.y, 'down');
    assert.deepEqual([r.map, r.x, r.y, r.dir], ['twinleaf_town', 20, 22, 'down']);
    const reached = new Set(Object.values(MAPS).flatMap((m) => m.warps.map((w) => w.to)));
    for (const [id, m] of Object.entries(MAPS)) for (const w of m.warps) {
      if (!reached.has(id) && m.indoor) continue; // Raum, den es in Platin nicht gibt
      if (!m.orig && !MAPS[w.to].orig) continue;
      if (Object.entries(ORIG_FIX._retarget || {}).some(([k, v]) => k.startsWith(id + '>') && v[0] === w.to)) continue; // Boot zur Insel, zurueck per Matrose
      if (!MAPS[w.to]) assert.fail(`${id}: Ziel ${w.to} fehlt`);
      assert.ok(MAPS[w.to].warps.some((b) => b.to === id) || ['spear_pillar', 'distortion_world', 'hall_of_fame'].includes(w.to), `${id} -> ${w.to} ohne Rueckweg`);
    }
    return;
  }
  let r = go('twinleaf_town', 3, 5, 'up');
  assert.deepEqual([r.warp, r.map, r.x, r.y], [true, 'twinleaf_home_1f', 4, 7]);
  r = go('twinleaf_home_1f', 4, 7, 'down');
  assert.deepEqual([r.map, r.x, r.y, r.dir], ['twinleaf_town', 3, 5, 'down']);
  r = go('twinleaf_home_1f', 8, 3, 'up');
  assert.equal(r.map, 'twinleaf_home_2f');
  r = go('route_203', 37, 7, 'right');
  assert.deepEqual([r.map, r.x, r.y], ['oreburgh_gate', 1, 5]);
  r = go('oreburgh_gate', 22, 5, 'right');
  assert.deepEqual([r.map, r.x, r.y], ['oreburgh_city', 2, 9]);
  r = go('oreburgh_city', 7, 23, 'down');
  assert.deepEqual([r.map, r.x, r.y], ['oreburgh_mine', 3, 2]);
  assert.equal(go('jubilife_city', 25, 7, 'up').ok, false, 'geschlossene Tuer muss blockieren');
});
await test('Alle Warp-Ziele sind begehbar und alle Karten rechteckig', () => {
  for (const [id, m] of Object.entries(MAPS)) {
    assert.equal(m.tiles.length, m.height, id);
    for (const row of m.tiles) assert.equal(row.length, m.width, id);
    for (const w of m.warps) assert.ok(isStandable(MAPS, w.to, w.tx, w.ty), `${id} -> ${w.to} ${w.tx},${w.ty}`);
    for (const e of m.encounters?.grass || []) assert.ok(e.species);
  }
});
await test('Originalkarte: jede Aussenkarte und jedes Flugziel hat ein Feld auf der Karte von Sinnoh', async () => {
  const { PLACES, FLY_SPOTS } = await import('../client/js/townmapData.js');
  for (const [id, m] of Object.entries(MAPS)) if (!m.indoor) assert.ok(PLACES[id], `${id} fehlt in PLACES`);
  for (const [id, p] of Object.entries(PLACES)) {
    assert.ok(MAPS[id], `PLACES: unbekannte Karte ${id}`);
    const [, x0, z0, x1 = x0, z1 = z0] = p;
    assert.ok(x0 >= 0 && z0 >= 0 && x1 >= x0 && z1 >= z0 && x1 < 30 && z1 < 30, `${id}: Felder ausserhalb`);
  }
  for (const f of FLY_SPOTS) assert.ok(MAPS[f.map]?.fly, `Flugziel ${f.map}`);
  for (const [id, m] of Object.entries(MAPS)) if (m.fly) assert.ok(FLY_SPOTS.some((f) => f.map === id), `${id} ohne Markierung`);
});
await test('Jede Karte mit Pokemon-Center ist erreichbar und heilt', () => {
  for (const id of ['sandgem_center', 'jubilife_center', 'oreburgh_center']) assert.ok(MAPS[id].events.some((e) => e.type === 'heal'));
});

console.log('\nPokedex');
await test('Alle 493 Arten mit gueltigen Attacken und Entwicklungen', async () => {
  const { POKEMON } = await import('../shared/data/pokemon.js');
  const { MOVES } = await import('../shared/data/moves.js');
  const { canEvolve } = await import('../server/game/pokemonFactory.js');
  for (let id = 1; id <= 493; id++) {
    const sp = POKEMON[id];
    assert.ok(sp && sp.base.length === 6 && sp.learnset.length, 'Art ' + id);
    for (const [, mv] of sp.learnset) assert.ok(MOVES[mv], `${sp.name}: ${mv}`);
    for (const e of sp.evos || []) assert.ok(POKEMON[e.to], `${sp.name} -> ${e.to}`);
  }
  assert.equal(POKEMON[35].types[0], 'normal', 'Piepi ist in Gen 4 Normal');
  assert.equal(canEvolve({ ...createPokemon(393, 16), id: 'x' }), 394);
  const w = createPokemon(448, 50);
  assert.ok(w.moves.length > 0);
});

// ------------------------------------------------------------ Netzwerk
console.log('\nMultiplayer ueber WebSocket');
process.env.STORAGE = 'sqlite';
process.env.DATA_DIR = path.join(tmp, 'net');
process.env.PORT = '3199';
process.env.STORY = 'off';
const { server, game, repo } = await import('../server/index.js');
await new Promise((r) => (server.listening ? r() : server.once('listening', r)));
const { default: WebSocket } = await import('ws');

function client(name) {
  const ws = new WebSocket('ws://localhost:3199/ws');
  const inbox = [];
  const waiters = [];
  ws.on('message', (raw) => {
    const m = JSON.parse(raw);
    inbox.push(m);
    for (const w of [...waiters]) if (w.pred(m)) { waiters.splice(waiters.indexOf(w), 1); w.res(m); }
  });
  const c = {
    ws, inbox,
    send: (m) => ws.send(JSON.stringify(m)),
    wait: (pred, ms = 4000) => new Promise((res, rej) => {
      const hit = inbox.find(pred); if (hit) { inbox.splice(inbox.indexOf(hit), 1); return res(hit); }
      const w = { pred: (m) => { if (pred(m)) { inbox.splice(inbox.indexOf(m), 1); return true; } return false; }, res };
      waiters.push(w);
      setTimeout(() => rej(new Error('Timeout beim Warten in ' + name)), ms);
    }),
    open: new Promise((r) => ws.once('open', r))
  };
  return c;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await test('Zwei Spieler sehen sich und Bewegungen in Echtzeit', async () => {
  const a = client('A'); const b = client('B');
  await Promise.all([a.open, b.open]);
  a.send({ t: 'hello', name: 'Lucas', runCode: 'NET1', rules: { nuzlocke: true, soulbound: true, failedEncounterBreaksLink: true } });
  const wa = await a.wait((m) => m.t === 'welcome');
  await a.wait((m) => m.t === 'needStarter');
  b.send({ t: 'hello', name: 'Lucia', runCode: 'NET1' });
  const wb = await b.wait((m) => m.t === 'welcome');
  assert.ok(wb.players.some((p) => p.id === wa.selfId), 'B sieht A nicht');
  await a.wait((m) => m.t === 'playerJoined' && m.player.id === wb.selfId);
  a.send({ t: 'chooseStarter', speciesId: 390 });
  b.send({ t: 'chooseStarter', speciesId: 393 });
  await a.wait((m) => m.t === 'party' && m.party.length === 1);
  await b.wait((m) => m.t === 'party' && m.party.length === 1);
  const dir = ['up', 'down', 'left', 'right'].find((d) => { const r = resolveStep(MAPS, SPAWN.map, SPAWN.x, SPAWN.y, d); return r.ok && !r.warp; });
  const exp = resolveStep(MAPS, SPAWN.map, SPAWN.x, SPAWN.y, dir);
  a.send({ t: 'move', dir, seq: 1 });
  const ack = await a.wait((m) => m.t === 'moveAck' && m.seq === 1);
  assert.equal(ack.ok, true);
  const seen = await b.wait((m) => m.t === 'playerMoved' && m.id === wa.selfId);
  assert.deepEqual([seen.x, seen.y], [exp.x, exp.y]);
  // Starter beider Spieler bilden eine Seelengruppe
  const n = await a.wait((m) => m.t === 'nuzlocke' && m.links.some((l) => l.members.length === 2));
  assert.equal(n.links[0].route, 'starter');
  // Soulbound live: Stirbt der Starter von A, meldet der Server B sofort den Tod des Partners
  const sa = game.sessions.get(wa.selfId);
  const events = game.onAllyFaint(sa, sa.party[0]);
  assert.ok(events.some((e) => e.text?.includes('Seelenband')));
  const death = await b.wait((m) => m.t === 'soulDeath');
  assert.equal(death.playerName, 'Lucia');
  const pb = await b.wait((m) => m.t === 'party' && m.party[0]?.alive === false);
  assert.equal(pb.party[0].deathCause, 'soulbound');
  await b.wait((m) => m.t === 'gameOver');
  a.ws.close(); b.ws.close();
});

await test('Regeln: Standard ist das normale Spiel, Extras nur mit Nuzlocke', async () => {
  const { sanitizeRules } = await import('../server/game/rules.js');
  assert.deepEqual(Object.values(sanitizeRules(undefined)).filter((v) => v === true), []);
  const off = sanitizeRules({ nuzlocke: false, soulbound: true, dupesClause: true });
  assert.equal(off.soulbound || off.dupesClause, false);
  const solo = sanitizeRules({ nuzlocke: true, soulbound: true, dupesClause: true }, true);
  assert.equal(solo.nuzlocke && solo.dupesClause && !solo.soulbound, true);
  // Alte Solo-Spielstände ohne gespeicherte Regeln behalten Nuzlocke
  const eng = new RulesEngine(repo);
  assert.equal(eng.rulesFor({ runId: null }).nuzlocke, true);
  assert.equal(eng.rulesFor({ runId: null, rules: sanitizeRules({}, true) }).nuzlocke, false);
});

await test('Encounter im hohen Gras startet serverseitigen Kampf', async () => {
  const a = client('C');
  await a.open;
  a.send({ t: 'hello', name: 'Gary', runCode: 'NET2' });
  await a.wait((m) => m.t === 'welcome');
  a.send({ t: 'chooseStarter', speciesId: 387 });
  await a.wait((m) => m.t === 'party' && m.party.length === 1);
  let seq = 0;
  const step = async (dir) => { a.send({ t: 'move', dir, seq: ++seq, running: true }); await sleep(110); };
  // Weg ins hohe Gras von Route 201
  const path = findPath(SPAWN.map, SPAWN.x, SPAWN.y, (m, x, y) => m === 'route_201' && MAPS[m].tiles[y][x] === '"'
    && ['left', 'right', 'up', 'down'].some((d) => { const r = resolveStep(MAPS, m, x, y, d); return r.ok && MAPS[r.map].tiles[r.y][r.x] === '"'; }));
  assert.ok(path, 'kein Weg ins Gras');
  for (const d of path) await step(d);
  const s0 = game.sessions.get([...game.sessions.keys()].find((k) => game.sessions.get(k).player.name === 'Gary'));
  const { map: gm, x: gx, y: gy } = s0.player;
  const there = ['left', 'right', 'up', 'down'].find((d) => { const r = resolveStep(MAPS, gm, gx, gy, d); return r.ok && MAPS[r.map].tiles[r.y][r.x] === '"'; });
  const OPPD = { left: 'right', right: 'left', up: 'down', down: 'up' };
  let started = null;
  for (let i = 0; i < 300 && !started; i++) {
    await step(i % 2 ? OPPD[there] : there);
    started = a.inbox.find((m) => m.t === 'battleStart');
  }
  assert.ok(started, 'kein Encounter nach 300 Schritten');
  assert.equal(started.state.catchable, true);
  a.send({ t: 'battleAction', type: 'ball', ball: 'poke-ball' });
  let end = null;
  for (let i = 0; i < 40 && !end; i++) {
    await sleep(60);
    end = a.inbox.find((m) => m.t === 'battleEnd');
    if (!end) a.send({ t: 'battleAction', type: 'ball', ball: 'poke-ball' });
  }
  assert.ok(end, 'Kampf endete nicht');
  console.log('        Ergebnis:', end.result);
  a.ws.close();
});

await test('Tuer fuehrt serverseitig ins Haus und wieder hinaus', async () => {
  const a = client('D');
  await a.open;
  a.send({ t: 'hello', name: 'Dawn', runCode: 'NET3' });
  await a.wait((m) => m.t === 'welcome');
  a.send({ t: 'chooseStarter', speciesId: 393 });
  await a.wait((m) => m.t === 'party' && m.party.length === 1);
  let seq = 0;
  const step = async (dir) => { a.send({ t: 'move', dir, seq: ++seq, running: true }); await sleep(110); };
  const door = MAPS.twinleaf_town.warps.find((w) => w.to === 'twinleaf_home_1f' && !w.off);
  const path = findPath(SPAWN.map, SPAWN.x, SPAWN.y, (m, x, y) => m === 'twinleaf_town' && x === door.x && y === door.y + 1);
  assert.ok(path, 'kein Weg zur Haustuer');
  for (const d of path) await step(d);
  await step('up');
  const inside = await a.wait((m) => m.t === 'mapChange');
  assert.deepEqual([inside.map, inside.x, inside.y], ['twinleaf_home_1f', door.tx, door.ty]);
  await step('down');
  const out = await a.wait((m) => m.t === 'mapChange');
  assert.deepEqual([out.map, out.x, out.y, out.dir], ['twinleaf_town', door.x, door.y + 1, 'down']);
  a.ws.close();
});

await test('Menue: TM, Lehrer, Erinnerer, Verlerner, Sonderbonbon, Pokedex und Speichern', async () => {
  const { ITEMS } = await import('../shared/data/items.js');
  const { TUTORS } = await import('../shared/data/tutors.js');
  const dex = JSON.parse(fs.readFileSync(new URL('../shared/data/dex/gen4.json', import.meta.url)));
  const a = client('M');
  await a.open;
  a.send({ t: 'hello', name: 'Menu', runCode: 'NETM' });
  const w = await a.wait((m) => m.t === 'welcome');
  a.send({ t: 'chooseStarter', speciesId: 390 });
  const party = await a.wait((m) => m.t === 'party' && m.party.length === 1);
  const prog = await a.wait((m) => m.t === 'progress' && m.dex?.caught.includes(390));
  assert.ok(prog.dex.seen.includes(390));
  const s = game.sessions.get(w.selfId);
  const mon = s.party[0];
  const sp = dex.pokemon[390];
  // TM: wird verbraucht, Attacke kommt dazu
  const tmId = Object.keys(ITEMS).find((k) => ITEMS[k].kind === 'tm' && !ITEMS[k].hm && sp.tm.includes(ITEMS[k].move) && !mon.moves.some((m) => m.id === ITEMS[k].move));
  assert.ok(tmId, 'keine passende TM');
  s.player.items[tmId] = 1;
  const before = mon.moves.length;
  a.send({ t: 'teach', source: 'tm', item: tmId, pokemonId: mon.id, moveId: ITEMS[tmId].move, replaceIndex: 9 });
  await a.wait((m) => m.t === 'party' && m.party[0]?.moves.length === before + 1);
  assert.equal(s.player.items[tmId], 0);
  // Ohne Dienst kein Lehrer
  const offer = TUTORS.route212.moves.find((o) => sp.tutor.includes(o.id));
  assert.ok(offer, 'kein Lehrerangebot fuer Panflam');
  a.send({ t: 'teach', source: 'tutor', pokemonId: mon.id, moveId: offer.id, replaceIndex: 0 });
  await sleep(100);
  assert.ok(!mon.moves.some((m) => m.id === offer.id));
  // Lehrer mit Scherben
  for (const [k, n] of Object.entries(offer.cost)) s.player.items[k] = n;
  game.openService(s, { service: 'tutor', tutor: 'route212' });
  const sv = await a.wait((m) => m.t === 'service' && m.kind === 'tutor');
  assert.ok(sv.moves[mon.id].some((o) => o.id === offer.id));
  while (mon.moves.length < 4) mon.moves.push({ id: 'growl', pp: 40, maxPp: 40 });
  a.send({ t: 'teach', source: 'tutor', pokemonId: mon.id, moveId: offer.id, replaceIndex: 3 });
  await a.wait((m) => m.t === 'party' && m.party[0]?.moves[3].id === offer.id);
  assert.ok(Object.keys(offer.cost).every((k) => s.player.items[k] === 0));
  a.send({ t: 'serviceDone' });
  await sleep(50);
  assert.equal(s.service, null);
  // Verlerner
  game.openService(s, { service: 'deleter' });
  await a.wait((m) => m.t === 'service' && m.kind === 'deleter');
  a.send({ t: 'forget', pokemonId: mon.id, index: 3 });
  await a.wait((m) => m.t === 'party' && m.party[0]?.moves.length === 3);
  a.send({ t: 'serviceDone' });
  // Sonderbonbon bis zur neuen Attacke, dann Erinnerer mit Herzschuppe
  s.player.items['rare-candy'] = 5;
  const lv = mon.level;
  a.send({ t: 'useItem', item: 'rare-candy', pokemonId: mon.id });
  await a.wait((m) => m.t === 'party' && m.party[0]?.level === lv + 1);
  assert.equal(s.player.items['rare-candy'], 4);
  mon.moves = mon.moves.slice(0, 1);
  const rel = game.relearnable(mon);
  assert.ok(rel.length, 'nichts zum Erinnern');
  s.player.items['heart-scale'] = 1;
  game.openService(s, { service: 'relearn' });
  await a.wait((m) => m.t === 'service' && m.kind === 'relearn');
  a.send({ t: 'teach', source: 'relearn', pokemonId: mon.id, moveId: rel[0], replaceIndex: 9 });
  await a.wait((m) => m.t === 'party' && m.party[0]?.moves.some((x) => x.id === rel[0]));
  assert.equal(s.player.items['heart-scale'], 0);
  a.send({ t: 'serviceDone' });
  // Gesehen im Kampf
  game.dexMark(s, 396);
  await a.wait((m) => m.t === 'progress' && m.dex.seen.includes(396) && !m.dex.caught.includes(396));
  // Gegenstaende: Vitamin, Aether, Schutz, Entwicklungsstein, Verkaufen
  s.player.items.protein = 1;
  const atk = mon.stats.atk;
  a.send({ t: 'useItem', item: 'protein', pokemonId: mon.id });
  await a.wait((m) => m.t === 'notice' && /stieg/.test(m.text));
  assert.equal(mon.evs.atk, 10); assert.ok(mon.stats.atk >= atk);
  mon.moves[0].pp = 0; s.player.items.ether = 1;
  a.send({ t: 'useItem', item: 'ether', pokemonId: mon.id, moveIndex: 0 });
  await a.wait((m) => m.t === 'notice' && /AP/.test(m.text));
  assert.equal(mon.moves[0].pp, Math.min(10, mon.moves[0].maxPp));
  s.player.items.repel = 1;
  a.send({ t: 'useItem', item: 'repel' });
  await a.wait((m) => m.t === 'notice' && /Schutz/.test(m.text));
  assert.equal(s.player.repel, 100);
  const { recalc } = await import('../server/game/pokemonFactory.js');
  mon.speciesId = 25; recalc(mon); s.player.items['thunder-stone'] = 1;
  a.send({ t: 'useItem', item: 'thunder-stone', pokemonId: mon.id });
  await a.wait((m) => m.t === 'notice' && /entwickelt/.test(m.text));
  assert.equal(mon.speciesId, 26);
  s.player.items.nugget = 2; const money = s.player.money;
  game.openShop(s, null);
  await a.wait((m) => m.t === 'shop');
  a.send({ t: 'sell', item: 'nugget', count: 2 });
  await a.wait((m) => m.t === 'shop' && m.money === money + 10000);
  a.send({ t: 'shopClose' });
  a.send({ t: 'save' });
  const saved = await a.wait((m) => m.t === 'saved');
  assert.ok(saved.playMs >= 0 && saved.map);
  a.ws.close();
});

// ------------------------------------------------------------ Story
console.log('\nWelt und Story-Blockaden');
const world = await import('./world.js');
await test('Welt: Raender, Warps, Ausloeser und Erreichbarkeit aller Karten', () => {
  const errors = world.checkWorld();
  assert.deepEqual(errors, []);
});
await test('Weltkarte: alle Gebiete passen zusammen und ueberlappen sich nicht', () => {
  // Originalkarten liegen fest in der Matrix von Platin, nur die eigenen Karten werden hier geprueft
  if (!ORIG_ON) assert.deepEqual(world.checkLayout(), []);
});
await test('Story-Blockaden: Wege oeffnen sich erst mit dem passenden Fortschritt', () => {
  const steps = (await_ => await_);
  const base = Object.fromEntries(['intro', 'barry_room', 'barry_201', 'zyrus_lake', 'eibe_left', 'has_starter', 'lake_done', 'dex', 'got_balls', 'lab_done', 'lucia_tip', 'rival2', 'roark_mine'].map((f) => [f, true]));
  const stages = [
    [{}, ['jubilife_city', 'route_204', 'lake_verity'], ['route_203', 'oreburgh_city', 'floaroma_town']],
    [{ grunts_jub: true }, ['oreburgh_city', 'oreburgh_mine', 'route_207'], ['floaroma_town', 'mt_coronet']],
    [{ badge_coal: true, barry_ore: true, hm_rocksmash: true }, ['floaroma_town', 'floaroma_meadow', 'valley_windworks'], ['eterna_forest', 'windworks_inside']],
    [{ windworks_key: true }, ['windworks_inside'], ['eterna_forest']],
    [{ windworks_done: true }, ['eterna_forest', 'eterna_city', 'eterna_gym'], ['eterna_galactic', 'route_206', 'mt_coronet', 'old_chateau', 'wayward_cave']],
    [{ badge_forest: true }, ['eterna_galactic'], ['route_206']],
    [{ eterna_done: true, bike: true, riding: true, hm_cut: true }, ['route_206', 'mt_coronet', 'route_208', 'hearthome_city', 'hearthome_gym', 'old_chateau', 'wayward_cave'], ['route_209', 'route_212']],
    [{ rival3: true, badge_relic: true }, ['solaceon_town', 'solaceon_ruins', 'route_215', 'veilstone_gym'], ['galactic_warehouse', 'route_214', 'route_212', 'celestic_town']],
    [{ badge_cobble: true }, ['galactic_warehouse'], ['route_212', 'route_214', 'pastoria_gym']],
    [{ warehouse_done: true, hm_fly: true }, ['route_212', 'route_214', 'turnback_cave', 'valor_lakefront', 'route_213', 'pastoria_gym'], ['lake_valor', 'route_222']],
    [{ badge_fen: true, secret_potion: true, psyduck_cured: true }, ['celestic_town'], ['celestic_ruins', 'lake_valor', 'canalave_city']],
    [{ celestic_done: true, hm_surf: true }, ['celestic_ruins', 'route_218', 'canalave_city', 'canalave_gym', 'canalave_dock', 'verity_cavern'], ['lake_valor', 'route_216', 'iron_island']],
    [{ rival4: true, badge_mine: true, hm_strength: true }, ['lake_valor', 'valor_cavern', 'route_216', 'route_217', 'iron_island', 'iron_island_deep'], ['snowpoint_city', 'galactic_hq']],
    [{ valor_done: true, verity_done: true, hm_rockclimb: true }, ['snowpoint_city', 'snowpoint_gym', 'lake_acuity', 'acuity_cavern'], ['galactic_hq']],
    [{ badge_icicle: true, acuity_done: true }, ['galactic_hq'], ['spear_pillar']],
    [{ galactic_hq_done: true }, ['spear_pillar'], ['route_222']],
    [{ spear_done: true }, ['route_222', 'sunyshore_city', 'sunyshore_lighthouse', 'route_223'], ['sunyshore_gym', 'pokemon_league_south']],
    [{ volkner_ready: true }, ['sunyshore_gym'], ['pokemon_league_south']],
    [{ hm_waterfall: true }, ['pokemon_league_south', 'league_south_center'], ['victory_road']],
    [{ badge_beacon: true }, ['victory_road', 'pokemon_league', 'league_lobby', 'e4_aaron'], ['e4_bertha']],
    [{ beat_e4_aaron: true }, ['e4_bertha'], ['e4_flint']],
    [{ beat_e4_bertha: true, beat_e4_flint: true }, ['e4_lucian'], ['champion_room']],
    [{ beat_e4_lucian: true }, ['champion_room'], ['hall_of_fame']],
    [{ beat_champ_cynthia: true }, ['hall_of_fame'], ['north_sea', 'fight_area', 'snowpoint_temple', 'fullmoon_island']],
    [{ champion: true }, ['north_sea', 'fight_area', 'battle_tower', 'route_225', 'survival_area', 'route_227', 'stark_mountain', 'stark_mountain_deep', 'snowpoint_temple', 'fullmoon_island', 'spear_pillar'], []]
  ];
  let flags = { ...base };
  for (const [add, yes, no] of stages) {
    flags = { ...flags, ...add };
    const { maps } = world.reachable(flags);
    for (const m of yes) assert.ok(maps.has(m), `${m} sollte mit ${Object.keys(add).join(', ') || 'Start'} erreichbar sein`);
    for (const m of no) assert.ok(!maps.has(m), `${m} darf mit ${Object.keys(add).join(', ') || 'Start'} noch nicht erreichbar sein`);
  }
});

console.log('\nStory');
const story = await import('../shared/data/story.js');
await test('Story-Daten: NPCs, Ausloeser und Skripte sind stimmig', () => {
  for (const [mapId, list] of Object.entries(story.NPCS)) {
    assert.ok(MAPS[mapId], 'Karte fehlt: ' + mapId);
    for (const n of list) {
      const t = MAPS[mapId].tiles[n.y]?.[n.x];
      assert.ok(t && (!SOLID.has(t) || t === '~') && !'DCGU'.includes(t), `${mapId}/${n.id} steht auf ${t}`);
      if (n.trainer) assert.ok(story.TRAINERS[n.trainer], n.trainer);
      if (typeof n.talk === 'string') assert.ok(story.SCRIPTS[n.talk], n.talk);
    }
  }
  for (const [mapId, list] of Object.entries(story.TRIGGERS)) for (const t of list) assert.ok(story.SCRIPTS[t.script], t.script);
  const walk = (steps) => { for (const st of steps) { if (st.battle) assert.ok(story.TRAINERS[st.battle], st.battle); if (st.then) walk(st.then); if (st.else) walk(st.else); } };
  for (const sc of Object.values(story.SCRIPTS)) walk(sc);
  const ids = new Set(); for (const list of Object.values(story.NPCS)) for (const n of list) { assert.ok(!ids.has(n.id), 'doppelte NPC-ID ' + n.id); ids.add(n.id); }
  for (const id of ['e4_aaron', 'e4_bertha', 'e4_flint', 'e4_lucian', 'champ_cynthia']) assert.ok(story.TRAINERS[id].rematch?.party.length >= 5, `Revanche ${id}`);
});

const DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
// Feld vor einem Ausloeser und Richtung hinein
function beforeTrigger(map, script) {
  const t = story.TRIGGERS[map].find((x) => x.script === script);
  for (let y = t.y; y < t.y + t.h; y++) for (let x = t.x; x < t.x + t.w; x++) for (const [d, [dx, dy]] of Object.entries(DV)) {
    const ox = x - dx, oy = y - dy;
    if (ox >= t.x && ox < t.x + t.w && oy >= t.y && oy < t.y + t.h) continue;
    if (isStandable(MAPS, map, ox, oy) && !story.npcAt(map, ox, oy, {})) return [ox, oy, d];
  }
  throw new Error('kein Feld vor ' + script);
}
// Feld knapp ausserhalb der Sichtweite eines Trainers, Schritt hinein
function intoSight(map, id) {
  const n = story.NPCS[map].find((x) => x.id === id);
  const sight = story.TRAINERS[n.trainer].sight; const [dx, dy] = DV[n.dir];
  return [n.x + dx * (sight + 1), n.y + dy * (sight + 1), OPPOSITE[n.dir]];
}
// Spieler neben einen NPC stellen und ihn anschauen lassen
function talkTo(s, id) {
  for (const [map, list] of Object.entries(story.NPCS)) {
    const n = list.find((x) => x.id === id);
    if (!n) continue;
    for (const [d, [dx, dy]] of Object.entries(DV)) {
      const x = n.x - dx, y = n.y - dy;
      if (isStandable(MAPS, map, x, y)) { Object.assign(s.player, { map, x, y, dir: d }); return; }
    }
  }
  throw new Error('NPC fehlt: ' + id);
}

// Spielt automatisch weiter: Dialoge bestaetigen, Starter waehlen, im Kampf immer Attacke 1.
function autoplay(c) {
  const h = (m) => {
    if (m.t === 'dialog') c.send({ t: 'dialogDone', token: m.token, choice: 0 });
    if (m.t === 'needStarter') c.send({ t: 'chooseStarter', speciesId: 393 });
    const st = (m.t === 'battleStart' || m.t === 'battleEvents') && m.state;
    if (st?.state === 'action') c.send({ t: 'battleAction', type: 'move', index: 0 });
    if (st?.state === 'switch') c.send({ t: 'battleAction', type: 'switch', index: st.party.findIndex((p) => p.alive && p.hp > 0) });
  };
  c.ws.on('message', (raw) => h(JSON.parse(raw)));
}
await test('Story: Intro, See mit Starter, Labor und Trainer mit Sichtlinie', async () => {
  game.storyOn = true;
  const a = client('E');
  await a.open;
  autoplay(a);
  a.send({ t: 'hello', name: 'Story', runCode: 'STORY1' });
  const w = await a.wait((m) => m.t === 'welcome');
  assert.equal(w.player.map, 'twinleaf_home_2f');
  await a.wait((m) => m.t === 'progress' && m.flags.intro);
  const s = game.sessions.get(w.selfId);
  assert.equal(s.party.length, 0);
  const tp = (map, x, y) => Object.assign(s.player, { map, x, y });
  let seq = 0; const step = async (dir) => { s.lastMoveAt = 0; a.send({ t: 'move', dir, seq: ++seq }); await sleep(60); };
  // Ohne Pokemon schickt der Ausloeser zurueck
  let [sx, sy, sd] = beforeTrigger('route_201', 'noPokemon');
  tp('route_201', sx, sy); await step(sd);
  await a.wait((m) => m.t === 'mapChange' && m.x === sx && m.y === sy);
  // See: Zyrus, Koffer, Starter, Wildkampf, Rivalenkampf
  [sx, sy, sd] = beforeTrigger('lake_verity', 'lake');
  tp('lake_verity', sx, sy); await step(sd);
  await a.wait((m) => m.t === 'progress' && m.flags.lake_done, 20000);
  assert.equal(s.party.length, 1);
  assert.equal(s.party[0].speciesId, 393);
  assert.equal(s.player.items['poke-ball'] || 0, 0);
  // Labor: Pokedex und Baelle
  tp('sandgem_lab', 6, 9); await step('up');
  await a.wait((m) => m.t === 'progress' && m.flags.lab_done, 8000);
  assert.equal(s.player.items['poke-ball'], 5);
  // Trainer Tim schaut in eine Richtung: ein Schritt in seine Sichtlinie startet den Kampf
  for (const m of s.party) { m.level = 30; m.hp = m.stats.hp = 200; }
  [sx, sy, sd] = intoSight('route_202', 'tim');
  tp('route_202', sx, sy); await step(sd);
  await a.wait((m) => m.t === 'npcEmote' && m.id === 'tim');
  await a.wait((m) => m.t === 'battleStart' && m.state.kind === 'trainer');
  const end = await a.wait((m) => m.t === 'battleEnd', 20000);
  assert.equal(end.result, 'win');
  await a.wait((m) => m.t === 'progress' && m.flags.beat_youngster_tim);
  assert.ok(s.player.money > 3000);
  // Markt: kaufen mit Geld
  tp('sandgem_mart', 2, 3); s.player.dir = 'left'; a.send({ t: 'interact' });
  await a.wait((m) => m.t === 'shop');
  const before = s.player.money;
  a.send({ t: 'buy', item: 'potion', count: 2 });
  await a.wait((m) => m.t === 'shop' && m.money === before - 600);
  a.send({ t: 'buy', item: 'great-ball', count: 1 });
  await a.wait((m) => m.t === 'notice' && m.kind === 'error');
  a.ws.close();
});

await sleep(200);
await test('Story: Feldattacken, Fliegen, Speersäule, Zerrwelt, Pokémon Liga und Kampfzone', async () => {
  game.storyOn = true;
  const a = client('F');
  await a.open;
  autoplay(a);
  if (process.env.DEBUG_TEST) a.ws.on('message', (raw) => { const m = JSON.parse(raw); console.log('   <', m.t, m.t === 'dialog' ? m.lines.map((l) => l.text).join(' | ').slice(0, 120) : m.t === 'mapChange' ? m.map : m.t === 'moveAck' ? `${m.ok} ${m.map} ${m.x},${m.y}` : ''); });
  a.send({ t: 'hello', name: 'Feld', runCode: 'FIELD1' });
  const w = await a.wait((m) => m.t === 'welcome');
  const s = game.sessions.get(w.selfId);
  const mon = createPokemon(395, 100, { ownerId: s.player.id, runId: s.player.runId, metRoute: 'starter' });
  Object.assign(mon.stats, { hp: 9999, atk: 999, def: 999, spa: 999, spd: 999, spe: 999 }); mon.hp = 9999;
  mon.moves[0] = { id: 'hydro-pump', pp: 99, maxPp: 99 };
  s.party.push(mon); s.player.starterChosen = true;
  Object.assign(s.player.flags, { intro: true, has_starter: true, got_balls: true });
  const tp = (map, x, y) => Object.assign(s.player, { map, x, y });
  let seq = 0; const step = async (dir) => { s.lastMoveAt = 0; a.send({ t: 'move', dir, seq: ++seq }); return a.wait((m) => m.t === 'moveAck' && m.seq === seq); };
  // Felsbrocken: ohne Zertruemmerer blockiert, mit frei
  tp('ravaged_path', 43, 4);
  assert.equal((await step('up')).ok, false);
  s.player.flags.hm_rocksmash = true;
  // Feldattacke braucht Orden und ein Pokémon, das sie beherrscht
  assert.equal((await step('up')).ok, false);
  await a.wait((m) => m.t === 'notice' && /Zertrümmerer/.test(m.text));
  mon.moves = [{ id: 'hydro-pump', pp: 99, maxPp: 99 }, { id: 'rock-smash', pp: 15, maxPp: 15 }, { id: 'fly', pp: 15, maxPp: 15 }, { id: 'surf', pp: 15, maxPp: 15 }];
  assert.equal((await step('up')).ok, true);
  // Fliegen zu einem besuchten Ort
  s.player.flags.hm_fly = true; s.player.flags.visit_floaroma_town = true;
  tp('route_204', ...P('route_204', 7, 10)); a.send({ t: 'fly' });
  await a.wait((m) => m.t === 'mapChange' && m.map === 'floaroma_town', 5000);
  // Speersaeule: nach Zyrus in die Zerrwelt, Giratina, zurueck
  Object.assign(s.player.flags, { galactic_hq_done: true, beat_zyrus2: true });
  tp('spear_pillar', 7, 7); await step('up'); await step('up');
  await a.wait((m) => m.t === 'mapChange' && m.map === 'distortion_world', 8000);
  await sleep(100); await step('up'); await step('up');
  await a.wait((m) => m.t === 'battleStart' && m.state.foe?.speciesId === 487, 8000);
  await a.wait((m) => m.t === 'progress' && m.flags.spear_done, 30000);
  await a.wait((m) => m.t === 'mapChange' && m.map === 'spear_pillar', 8000);
  // Eiseninsel: Urs schließt sich an, Doppelkampf gegen beide Rüpel, danach das Riolu-Ei
  await sleep(100); tp('iron_island', 12, 13); await step('up');
  await a.wait((m) => m.t === 'progress' && m.flags.riley_joined, 8000);
  assert.equal(s.player.partner, 'riley');
  await sleep(100); tp('iron_island_deep', 8, 8); await step('left');
  const tag = await a.wait((m) => m.t === 'battleStart' && m.state.kind === 'trainer', 8000);
  assert.ok(tag.events.some((e) => /Urs schickt/.test(e.text || '')), 'Urs kämpft mit');
  await a.wait((m) => m.t === 'progress' && m.flags.beat_iron_tag, 30000);
  await sleep(100); tp('iron_island_deep', 4, 4); s.player.dir = 'up'; a.send({ t: 'interact' });
  await a.wait((m) => m.t === 'party' && m.party.some((p) => p.speciesId === 447 && p.egg), 8000);
  await a.wait((m) => m.t === 'progress' && m.flags.riolu_gift, 8000);
  assert.equal(s.player.partner, null);
  // Das Ei schlüpft beim Laufen
  s.party.find((p) => p.egg).eggSteps = 1;
  await sleep(100); tp('iron_island_deep', 8, 8); await step('right');
  await a.wait((m) => m.t === 'notice' && /geschlüpft/.test(m.text), 5000);
  assert.ok(s.party.some((p) => p.speciesId === 447 && !p.egg && p.level === 1 && p.hp > 0));
  // Seehöhle: nach der Speersäule wartet Selfe
  await sleep(100); tp('acuity_cavern', 7, 4); s.player.dir = 'up'; a.send({ t: 'interact' });
  await a.wait((m) => m.t === 'battleStart' && m.state.foe?.speciesId === 480, 8000);
  await a.wait((m) => m.t === 'progress' && m.flags.met_uxie, 30000);
  // Liga: Eingang setzt die Top Vier zurueck, die Ruhmeshalle macht zum Champ
  Object.assign(s.player.flags, { beat_e4_aaron: true, beat_e4_lucian: true });
  await sleep(100); tp('league_lobby', 7, 3); await step('up');
  await a.wait((m) => m.t === 'progress' && !m.flags.beat_e4_aaron && !m.flags.beat_e4_lucian, 5000);
  await sleep(100); await step('up');
  await a.wait((m) => m.t === 'mapChange' && m.map === 'e4_aaron', 5000);
  await sleep(100); tp('hall_of_fame', 5, 7); await step('up');
  await a.wait((m) => m.t === 'progress' && m.flags.champion, 5000);
  await a.wait((m) => m.t === 'mapChange' && m.map === 'twinleaf_town', 8000);
  // Nach der Liga: Schiff zur Kampfzone, Charon am Kahlberg, Heatran
  await sleep(100); talkTo(s, 'ferry_snow'); a.send({ t: 'interact' });
  await a.wait((m) => m.t === 'mapChange' && m.map === 'fight_area', 8000);
  Object.assign(s.player.flags, { beat_stark_tag: true });
  await sleep(100); tp('stark_mountain_deep', 7, 6); s.player.dir = 'up'; a.send({ t: 'interact' });
  await a.wait((m) => m.t === 'progress' && m.flags.stark_done, 8000);
  await sleep(100); tp('stark_mountain_deep', 7, 4); s.player.dir = 'up'; a.send({ t: 'interact' });
  await a.wait((m) => m.t === 'battleStart' && m.state.foe?.speciesId === 485, 8000);
  await a.wait((m) => m.t === 'progress' && m.flags.met_heatran, 30000);
  // Vesprit flieht und wandert, im Kampf flieht es sofort wieder
  await sleep(100); tp('verity_cavern', 7, 4); s.player.dir = 'up'; a.send({ t: 'interact' });
  await a.wait((m) => m.t === 'progress' && m.flags.met_mesprit, 8000);
  assert.ok(s.player.roamers?.[481]?.map, 'Vesprit wandert');
  // Regigigas erwacht nur mit den drei Titanen im Team
  await sleep(100); tp('snowpoint_temple', 7, 4); s.player.dir = 'up'; a.send({ t: 'interact' });
  await a.wait((m) => m.t === 'dialog' && m.lines.some((l) => /drei Zeichen/.test(l.text)), 8000);
  for (const id of [377, 378, 379]) s.party.push(createPokemon(id, 30, { ownerId: s.player.id, metRoute: 'test' }));
  await sleep(300); a.send({ t: 'interact' });
  await a.wait((m) => m.t === 'battleStart' && m.state.foe?.speciesId === 486, 8000);
  await a.wait((m) => m.t === 'progress' && m.flags.met_regigigas, 30000);
  // Kampfturm: Serie mit drei Pokémon auf Level 50, das echte Team bleibt unberührt
  for (let i = 0; i < 2; i++) { const e = createPokemon(395, 100, { ownerId: s.player.id, metRoute: 'test' }); e.moves[0] = { id: 'hydro-pump', pp: 99, maxPp: 99 }; s.party.splice(1, 0, e); }
  const lvBefore = s.party.map((m) => m.level).join();
  await sleep(200); tp('battle_tower', 6, 4); s.player.dir = 'up'; a.send({ t: 'interact' });
  const tb = await a.wait((m) => m.t === 'battleStart' && m.state.kind === 'trainer', 8000);
  assert.ok(tb.state.party.every((m) => m.level <= 50), 'Level 50');
  await a.wait((m) => m.t === 'battleStart' && m.state.kind === 'trainer', 30000);
  assert.ok(s.player.tower.streak >= 1, 'Serie zählt');
  assert.equal(s.party.map((m) => m.level).join(), lvBefore);
  a.ws.close();
});

game.stop();
server.close();
repo.close();
console.log('\nKlang');
await test('Musik: jede Melodie passt Takt fuer Takt zu ihren Akkorden', async () => {
  const { SONGS, JINGLES, musicForMap, _test } = await import('../client/js/audio.js');
  const { MAPS } = await import('../shared/data/maps.js');
  for (const [name, song] of Object.entries(SONGS)) {
    for (const bar of song.lead.split('|')) assert.equal(_test.parseMelody(bar).len, 16, `${name}: Takt "${bar.trim()}"`);
    assert.equal(_test.parseMelody(song.lead).len, song.chords.split(/\s+/).length * 16, name);
    song.chords.split(/\s+/).forEach(_test.chordTones);
  }
  for (const j of Object.values(JINGLES)) _test.parseMelody(j.lead);
  for (const [id, m] of Object.entries(MAPS)) assert.ok(SONGS[musicForMap(id, m)], `Musik fuer ${id}`);
});

await test('Original-Klaenge: Zuordnung zu Karten, Stuecken und Attacken', async () => {
  const { soundKey, trackForMap, trackForSong, ALL_TRACKS, JINGLE_TRACKS } = await import('../client/js/realAudio.js');
  const { SONGS } = await import('../client/js/audio.js');
  const { MAPS } = await import('../shared/data/maps.js');
  assert.equal(soundKey('Vine_Whip'), soundKey('vine-whip'));
  assert.equal(soundKey('Battle! (Wild Pokémon)'), 'battlewildpokemon');
  assert.equal(trackForMap('route_201', MAPS.route_201, false), 'Route 201 (Day)');
  assert.equal(trackForMap('route_201', MAPS.route_201, true), 'Route 201 (Night)');
  assert.equal(trackForMap('jubilife_center', MAPS.jubilife_center, false), 'Pokémon Center (Day)');
  assert.equal(trackForMap('twinleaf_home_1f', MAPS.twinleaf_home_1f, false), 'Twinleaf Town (Day)');
  for (const name of ['battle_wild', 'battle_trainer', 'battle_leader', 'victory', 'victory_trainer', 'victory_leader', 'title']) {
    assert.ok(SONGS[name], `Chiptune ${name}`);
    assert.ok(ALL_TRACKS.includes(trackForSong(name)), `Titel ${name}`);
  }
  for (const [id, m] of Object.entries(MAPS)) { const t = trackForMap(id, m); if (t) assert.ok(ALL_TRACKS.includes(t), id); }
  assert.ok(Object.values(JINGLE_TRACKS).every((l) => l.length));
});

console.log(failures ? `\n${failures} Test(s) fehlgeschlagen` : '\nAlle Tests bestanden');
process.exit(failures ? 1 : 0);
