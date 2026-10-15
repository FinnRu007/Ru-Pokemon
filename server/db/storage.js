// Persistenzschicht mit drei Backends (automatische Auswahl):
//   1. node:sqlite (in Node >= 22.5 eingebaut, keine Installation noetig)
//   2. better-sqlite3 (falls installiert)
//   3. JSON-Datei (Fallback ohne SQLite)
// Erzwingen per Umgebungsvariable STORAGE=sqlite|better-sqlite3|json.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const now = () => Date.now();

function rowToPokemon(r) {
  if (!r) return null;
  return { ...JSON.parse(r.data), id: r.id, ownerId: r.owner_id, runId: r.run_id, alive: !!r.alive, deathCause: r.death_cause, diedAt: r.died_at };
}
function rowToPlayer(r) {
  if (!r) return null;
  return { ...JSON.parse(r.data), id: r.id, name: r.name, token: r.token, runId: r.run_id, gameOver: !!r.game_over, createdAt: r.created_at };
}
function splitPokemon(p) {
  const { id, ownerId, runId, alive, deathCause, diedAt, ...data } = p;
  return { id, owner_id: ownerId, run_id: runId ?? null, alive: alive === false ? 0 : 1, death_cause: deathCause ?? null, died_at: diedAt ?? null, data: JSON.stringify(data) };
}
function splitPlayer(p) {
  const { id, name, token, runId, gameOver, createdAt, ...data } = p;
  return { id, name, token, run_id: runId ?? null, game_over: gameOver ? 1 : 0, data: JSON.stringify(data), created_at: createdAt ?? now() };
}

class SqlRepository {
  constructor(db, kind) {
    this.db = db;
    this.kind = kind;
    db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    this.s = {};
  }
  q(sql) { return (this.s[sql] ||= this.db.prepare(sql)); }
  transaction(fn) {
    this.db.exec('BEGIN');
    try { const r = fn(); this.db.exec('COMMIT'); return r; } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  // Runs
  getRun(id) { const r = this.q('SELECT * FROM runs WHERE id = ?').get(id); return r ? { id: r.id, name: r.name, rules: JSON.parse(r.rules), createdAt: r.created_at } : null; }
  createRun(run) { this.q('INSERT INTO runs (id, name, rules, created_at) VALUES (?, ?, ?, ?)').run(run.id, run.name, JSON.stringify(run.rules), now()); return this.getRun(run.id); }
  // Spieler
  getPlayer(id) { return rowToPlayer(this.q('SELECT * FROM players WHERE id = ?').get(id)); }
  getPlayerByName(name) { return rowToPlayer(this.q('SELECT * FROM players WHERE name = ? COLLATE NOCASE').get(name)); }
  getPlayerByToken(token) { return rowToPlayer(this.q('SELECT * FROM players WHERE token = ?').get(token)); }
  listRunPlayers(runId) { return this.q('SELECT * FROM players WHERE run_id = ?').all(runId).map(rowToPlayer); }
  savePlayer(p) {
    const r = splitPlayer(p);
    this.q(`INSERT INTO players (id, name, token, run_id, game_over, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, token = excluded.token, run_id = excluded.run_id, game_over = excluded.game_over, data = excluded.data`)
      .run(r.id, r.name, r.token, r.run_id, r.game_over, r.data, r.created_at);
    return p;
  }
  // Pokemon
  getPokemon(id) { return rowToPokemon(this.q('SELECT * FROM pokemon WHERE id = ?').get(id)); }
  listPokemon(ownerId) { return this.q('SELECT * FROM pokemon WHERE owner_id = ?').all(ownerId).map(rowToPokemon); }
  savePokemon(p) {
    const r = splitPokemon(p);
    this.q(`INSERT INTO pokemon (id, owner_id, run_id, alive, death_cause, died_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET owner_id = excluded.owner_id, data = excluded.data`)
      .run(r.id, r.owner_id, r.run_id, r.alive, r.death_cause, r.died_at, r.data);
    return p;
  }
  // Tod wird separat geschrieben, damit der Soulbound-Trigger zuverlaessig feuert.
  markDead(pokemonId, cause, at = now()) {
    this.q('UPDATE pokemon SET alive = 0, death_cause = ?, died_at = ? WHERE id = ? AND alive = 1').run(cause, at, pokemonId);
  }
  // Encounter (Nuzlocke)
  getEncounter(playerId, route) { return this.q('SELECT * FROM encounters WHERE player_id = ? AND route = ?').get(playerId, route) || null; }
  listEncounters(playerId) { return this.q('SELECT * FROM encounters WHERE player_id = ? ORDER BY created_at').all(playerId); }
  listRouteEncounters(runId, route) { return this.q('SELECT * FROM encounters WHERE run_id = ? AND route = ?').all(runId, route); }
  insertEncounter(e) {
    this.q('INSERT INTO encounters (run_id, player_id, route, species_id, outcome, pokemon_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(e.run_id ?? null, e.player_id, e.route, e.species_id, e.outcome, e.pokemon_id ?? null, now());
    return this.getEncounter(e.player_id, e.route);
  }
  updateEncounter(playerId, route, outcome, pokemonId = null) {
    this.q('UPDATE encounters SET outcome = ?, pokemon_id = ? WHERE player_id = ? AND route = ?').run(outcome, pokemonId, playerId, route);
  }
  // Soul Links
  getLinkByRoute(runId, route) { return this.q('SELECT * FROM soul_links WHERE run_id = ? AND route = ?').get(runId, route) || null; }
  getLink(id) { return this.q('SELECT * FROM soul_links WHERE id = ?').get(id) || null; }
  createLink(link) { this.q('INSERT INTO soul_links (id, run_id, route, state, created_at) VALUES (?, ?, ?, ?, ?)').run(link.id, link.run_id, link.route, link.state || 'active', now()); return this.getLink(link.id); }
  setLinkState(id, state) { this.q('UPDATE soul_links SET state = ? WHERE id = ?').run(state, id); }
  addLinkMember(linkId, pokemonId, playerId) { this.q('INSERT OR IGNORE INTO soul_link_members (link_id, pokemon_id, player_id) VALUES (?, ?, ?)').run(linkId, pokemonId, playerId); }
  getLinkForPokemon(pokemonId) {
    return this.q('SELECT l.* FROM soul_links l JOIN soul_link_members m ON m.link_id = l.id WHERE m.pokemon_id = ?').get(pokemonId) || null;
  }
  listLinkMembers(linkId) { return this.q('SELECT * FROM soul_link_members WHERE link_id = ?').all(linkId); }
  listRunLinks(runId) { return this.q('SELECT * FROM soul_links WHERE run_id = ? ORDER BY created_at').all(runId); }
  log(runId, type, payload) { this.q('INSERT INTO event_log (run_id, type, payload, created_at) VALUES (?, ?, ?, ?)').run(runId ?? null, type, JSON.stringify(payload), now()); }
  close() { this.db.close(); }
}

// JSON-Fallback mit identischer Schnittstelle. Speichert verzoegert (debounced) auf Platte.
class JsonRepository {
  constructor(file) {
    this.kind = 'json';
    this.file = file;
    this.d = { runs: {}, players: {}, pokemon: {}, encounters: [], links: {}, members: [], log: [] };
    if (fs.existsSync(file)) this.d = { ...this.d, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
    this.timer = null;
  }
  flush() { fs.writeFileSync(this.file + '.tmp', JSON.stringify(this.d)); fs.renameSync(this.file + '.tmp', this.file); }
  dirty() { clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), 200); }
  transaction(fn) { const snap = JSON.stringify(this.d); try { const r = fn(); this.dirty(); return r; } catch (e) { this.d = JSON.parse(snap); throw e; } }
  getRun(id) { return this.d.runs[id] || null; }
  createRun(run) { this.d.runs[run.id] = { ...run, createdAt: now() }; this.dirty(); return this.d.runs[run.id]; }
  getPlayer(id) { return this.d.players[id] ? structuredClone(this.d.players[id]) : null; }
  getPlayerByName(name) { const p = Object.values(this.d.players).find((x) => x.name.toLowerCase() === name.toLowerCase()); return p ? structuredClone(p) : null; }
  getPlayerByToken(token) { const p = Object.values(this.d.players).find((x) => x.token === token); return p ? structuredClone(p) : null; }
  listRunPlayers(runId) { return Object.values(this.d.players).filter((p) => p.runId === runId).map((p) => structuredClone(p)); }
  savePlayer(p) { this.d.players[p.id] = structuredClone({ createdAt: now(), ...p }); this.dirty(); return p; }
  getPokemon(id) { return this.d.pokemon[id] ? structuredClone(this.d.pokemon[id]) : null; }
  listPokemon(ownerId) { return Object.values(this.d.pokemon).filter((p) => p.ownerId === ownerId).map((p) => structuredClone(p)); }
  savePokemon(p) {
    const old = this.d.pokemon[p.id];
    // Lebensstatus wird nur ueber markDead geaendert (wie in SQL).
    this.d.pokemon[p.id] = structuredClone({ ...p, alive: old ? old.alive : p.alive !== false, deathCause: old?.deathCause ?? null, diedAt: old?.diedAt ?? null });
    this.dirty();
    return p;
  }
  markDead(pokemonId, cause, at = now()) {
    const p = this.d.pokemon[pokemonId];
    if (!p || !p.alive) return;
    p.alive = false; p.deathCause = cause; p.diedAt = at;
    // Gleiche Semantik wie trg_soulbound_death
    const m = this.d.members.find((x) => x.pokemon_id === pokemonId);
    if (m) {
      for (const o of this.d.members.filter((x) => x.link_id === m.link_id && x.pokemon_id !== pokemonId)) {
        const q = this.d.pokemon[o.pokemon_id];
        if (q && q.alive) { q.alive = false; q.deathCause = 'soulbound'; q.diedAt = at; }
      }
      this.d.links[m.link_id].state = 'dead';
    }
    this.dirty();
  }
  getEncounter(playerId, route) { return this.d.encounters.find((e) => e.player_id === playerId && e.route === route) || null; }
  listEncounters(playerId) { return this.d.encounters.filter((e) => e.player_id === playerId); }
  listRouteEncounters(runId, route) { return this.d.encounters.filter((e) => e.run_id === runId && e.route === route); }
  insertEncounter(e) {
    if (this.getEncounter(e.player_id, e.route)) throw new Error('UNIQUE constraint failed: encounters.player_id, encounters.route');
    const row = { id: this.d.encounters.length + 1, pokemon_id: null, run_id: null, ...e, created_at: now() };
    this.d.encounters.push(row); this.dirty(); return row;
  }
  updateEncounter(playerId, route, outcome, pokemonId = null) { const e = this.getEncounter(playerId, route); if (e) { e.outcome = outcome; e.pokemon_id = pokemonId; this.dirty(); } }
  getLinkByRoute(runId, route) { return Object.values(this.d.links).find((l) => l.run_id === runId && l.route === route) || null; }
  getLink(id) { return this.d.links[id] || null; }
  createLink(link) { this.d.links[link.id] = { state: 'active', ...link, created_at: now() }; this.dirty(); return this.d.links[link.id]; }
  setLinkState(id, state) { if (this.d.links[id]) { this.d.links[id].state = state; this.dirty(); } }
  addLinkMember(linkId, pokemonId, playerId) {
    if (this.d.members.some((m) => m.pokemon_id === pokemonId || (m.link_id === linkId && m.player_id === playerId))) return;
    this.d.members.push({ link_id: linkId, pokemon_id: pokemonId, player_id: playerId }); this.dirty();
  }
  getLinkForPokemon(pokemonId) { const m = this.d.members.find((x) => x.pokemon_id === pokemonId); return m ? this.d.links[m.link_id] : null; }
  listLinkMembers(linkId) { return this.d.members.filter((m) => m.link_id === linkId); }
  listRunLinks(runId) { return Object.values(this.d.links).filter((l) => l.run_id === runId); }
  log(runId, type, payload) { this.d.log.push({ run_id: runId, type, payload, created_at: now() }); if (this.d.log.length > 5000) this.d.log.shift(); this.dirty(); }
  close() { clearTimeout(this.timer); this.flush(); }
}

export function openStorage(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const want = process.env.STORAGE || 'auto';
  const dbFile = path.join(dataDir, 'platin.db');
  if (want === 'auto' || want === 'sqlite') {
    try {
      const { DatabaseSync } = require('node:sqlite');
      return new SqlRepository(new DatabaseSync(dbFile), 'node:sqlite');
    } catch (e) { if (want === 'sqlite') throw e; }
  }
  if (want === 'auto' || want === 'better-sqlite3') {
    try {
      const Database = require('better-sqlite3');
      return new SqlRepository(new Database(dbFile), 'better-sqlite3');
    } catch (e) { if (want === 'better-sqlite3') throw e; }
  }
  return new JsonRepository(path.join(dataDir, 'save.json'));
}
