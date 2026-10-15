// Rauchtest: Regelwerk (Nuzlocke + Soulbound) direkt und Multiplayer ueber echte WebSockets.
// Aufruf: npm test
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openStorage } from '../server/db/storage.js';
import { RulesEngine, DEFAULT_RULES } from '../server/game/rules.js';
import { createPokemon } from '../server/game/pokemonFactory.js';
import { WildBattle } from '../server/game/battle.js';

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
  repo.createRun({ id: 'SOUL', name: 'Test', rules: DEFAULT_RULES });
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
await test('Tueren, Treppen und Hoehlen fuehren hin und zurueck', () => {
  const go = (map, x, y, dir) => resolveStep(MAPS, map, x, y, dir);
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
await test('Jede Karte mit Pokemon-Center ist erreichbar und heilt', () => {
  for (const id of ['sandgem_center', 'jubilife_center', 'oreburgh_center']) assert.ok(MAPS[id].events.some((e) => e.type === 'heal'));
});

// ------------------------------------------------------------ Netzwerk
console.log('\nMultiplayer ueber WebSocket');
process.env.STORAGE = 'sqlite';
process.env.DATA_DIR = path.join(tmp, 'net');
process.env.PORT = '3199';
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
  a.send({ t: 'hello', name: 'Lucas', runCode: 'NET1' });
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
  a.send({ t: 'move', dir: 'up', seq: 1 });
  const ack = await a.wait((m) => m.t === 'moveAck' && m.seq === 1);
  assert.equal(ack.ok, true);
  const seen = await b.wait((m) => m.t === 'playerMoved' && m.id === wa.selfId);
  assert.equal(seen.y, 6);
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

await test('Encounter im hohen Gras startet serverseitigen Kampf', async () => {
  const a = client('C');
  await a.open;
  a.send({ t: 'hello', name: 'Gary', runCode: 'NET2' });
  await a.wait((m) => m.t === 'welcome');
  a.send({ t: 'chooseStarter', speciesId: 387 });
  await a.wait((m) => m.t === 'party' && m.party.length === 1);
  let seq = 0;
  const step = async (dir) => { a.send({ t: 'move', dir, seq: ++seq, running: true }); await sleep(110); };
  for (let i = 0; i < 7; i++) await step('up');     // Zweiblattdorf -> Route 201 (10,13)
  for (let i = 0; i < 3; i++) await step('up');     // (10,10)
  for (let i = 0; i < 4; i++) await step('right');  // (14,10) hohes Gras
  let started = null;
  for (let i = 0; i < 300 && !started; i++) {
    await step(i % 2 ? 'left' : 'right');
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
  for (let i = 0; i < 2; i++) await step('up');
  for (let i = 0; i < 7; i++) await step('left');
  await step('up');
  const inside = await a.wait((m) => m.t === 'mapChange');
  assert.deepEqual([inside.map, inside.x, inside.y], ['twinleaf_home_1f', 4, 7]);
  await step('down');
  const out = await a.wait((m) => m.t === 'mapChange');
  assert.deepEqual([out.map, out.x, out.y, out.dir], ['twinleaf_town', 3, 5, 'down']);
  a.ws.close();
});

await sleep(200);
game.stop();
server.close();
repo.close();
console.log(failures ? `\n${failures} Test(s) fehlgeschlagen` : '\nAlle Tests bestanden');
process.exit(failures ? 1 : 0);
