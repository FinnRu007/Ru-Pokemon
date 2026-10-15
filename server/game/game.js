// Zentrale Spiellogik: Sitzungen, Overworld-Synchronisation, Encounter, Kaempfe, Regeln.
import crypto from 'node:crypto';
import { MAPS, SPAWN } from '../../shared/data/maps.js';
import { POKEMON, STARTERS } from '../../shared/data/pokemon.js';
import { MOVES } from '../../shared/data/moves.js';
import { resolveStep, tileAt, facingTile, GRASS, CAVE_FLOOR, WATER, DIRS, isStandable } from '../../shared/world.js';
import { encounterRoll } from '../../shared/formulas.js';
import { C2S, S2C, WALK_MS, RUN_MS, EMOTES } from '../../shared/protocol.js';
import { createPokemon, publicPokemon, displayName, healPokemon, evolve, canEvolve, species, recalc, defaultMoves } from './pokemonFactory.js';
import { WildBattle, TrainerBattle } from './battle.js';
import { RulesEngine, DEFAULT_RULES } from './rules.js';
import { StoryRunner } from './story.js';
import { TRAINERS, RIVAL_STARTER, NEW_PLAYER_SPAWN, LEGACY_FLAGS, npcAt } from '../../shared/data/story.js';
import { ITEMS, MART_STOCK, applyItem } from '../../shared/data/items.js';

const NAME_RE = /^[\p{L}\p{N} _-]{2,16}$/u;
const COLORS = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1', '#fdd835', '#6d4c41'];

export class GameServer {
  // opts.story = false schaltet Story, Ausloeser und Trainer ab (freies Spiel wie vor Etappe 3).
  constructor(repo, log = console, opts = {}) {
    this.repo = repo;
    this.log = log;
    this.storyOn = opts.story !== false && process.env.STORY !== 'off';
    this.story = new StoryRunner(this);
    this.sessions = new Map(); // playerId -> session
    this.rules = new RulesEngine(repo);
    this.saveTimer = setInterval(() => this.flushPositions(), 2000);
    this.rosterTimer = setInterval(() => this.broadcastRoster(), 1500);
    this.lastRoster = '';
  }

  // ------------------------------------------------------------------ Verbindung
  attach(ws) {
    const conn = { ws, session: null };
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return this.send(ws, { t: S2C.ERROR, message: 'Ungueltiges JSON' }); }
      try { this.handle(conn, msg); } catch (e) {
        this.log.error('Fehler bei Nachricht', msg?.t, e);
        this.send(ws, { t: S2C.ERROR, message: 'Serverfehler: ' + e.message });
      }
    });
    ws.on('close', () => this.disconnect(conn));
  }

  send(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
  sendTo(playerId, msg) { const s = this.sessions.get(playerId); if (s) this.send(s.ws, msg); }
  broadcastMap(mapId, msg, exceptId) {
    for (const s of this.sessions.values()) if (s.player.map === mapId && s.player.id !== exceptId) this.send(s.ws, msg);
  }
  broadcastRun(runId, msg) {
    if (!runId) return;
    for (const s of this.sessions.values()) if (s.player.runId === runId) this.send(s.ws, msg);
  }

  handle(conn, msg) {
    if (msg.t === C2S.PING) return this.send(conn.ws, { t: S2C.PONG, at: msg.at });
    if (msg.t === C2S.HELLO) return this.hello(conn, msg);
    const s = conn.session;
    if (!s) return this.send(conn.ws, { t: S2C.ERROR, message: 'Bitte zuerst anmelden' });
    if (s.player.gameOver && ![C2S.CHAT].includes(msg.t)) return this.send(s.ws, { t: S2C.ERROR, message: 'Game Over: Dein Run ist beendet.' });
    switch (msg.t) {
      case C2S.CHOOSE_STARTER: return this.chooseStarter(s, msg);
      case C2S.MOVE: return this.move(s, msg);
      case C2S.FACE: return this.face(s, msg);
      case C2S.INTERACT: return this.interact(s);
      case C2S.CHAT: return this.chat(s, msg);
      case C2S.BATTLE_ACTION: return this.battleAction(s, msg);
      case C2S.PARTY_SWAP: return this.partySwap(s, msg);
      case C2S.BOX_MOVE: return this.boxMove(s, msg);
      case C2S.NICKNAME: return this.nickname(s, msg);
      case C2S.LEARN_MOVE: return this.learnMove(s, msg);
      case C2S.DIALOG_DONE: return this.story.dialogDone(s, msg);
      case C2S.BUY: return this.buy(s, msg);
      case C2S.SHOP_CLOSE: s.shop = false; return;
      case C2S.USE_ITEM: return this.useItem(s, msg);
      case C2S.EMOTE: return this.emote(s, msg);
      case C2S.FLY: return this.fly(s);
      default: return this.send(s.ws, { t: S2C.ERROR, message: 'Unbekannter Nachrichtentyp ' + msg.t });
    }
  }

  // ------------------------------------------------------------------ Anmeldung
  hello(conn, msg) {
    if (conn.session) return;
    let player = msg.token ? this.repo.getPlayerByToken(String(msg.token)) : null;
    if (!player && process.env.DEV === '1' && msg.name) player = this.repo.getPlayerByName(String(msg.name).trim()); // nur zum Testen
    if (!player) {
      const name = String(msg.name || '').trim();
      if (!NAME_RE.test(name)) return this.send(conn.ws, { t: S2C.ERROR, message: 'Name: 2 bis 16 Zeichen (Buchstaben, Zahlen, Leerzeichen, _ und -)' });
      if (this.repo.getPlayerByName(name)) return this.send(conn.ws, { t: S2C.ERROR, message: 'Name ist bereits vergeben. Mit gespeichertem Token anmelden oder anderen Namen waehlen.' });
      let runId = null;
      const code = String(msg.runCode || '').trim().toUpperCase();
      if (code) {
        if (!/^[A-Z0-9]{3,12}$/.test(code)) return this.send(conn.ws, { t: S2C.ERROR, message: 'Run-Code: 3 bis 12 Zeichen A-Z/0-9' });
        if (!this.repo.getRun(code)) {
          const rules = { ...DEFAULT_RULES };
          for (const k of Object.keys(DEFAULT_RULES)) if (msg.rules && typeof msg.rules[k] === typeof DEFAULT_RULES[k]) rules[k] = msg.rules[k];
          this.repo.createRun({ id: code, name: `Run ${code}`, rules });
        }
        runId = code;
      }
      const start = this.storyOn ? NEW_PLAYER_SPAWN : SPAWN;
      player = {
        id: crypto.randomUUID(), token: crypto.randomBytes(24).toString('hex'), name, runId, gameOver: false,
        map: start.map, x: start.x, y: start.y, dir: start.dir,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        starterChosen: false,
        // Mit Story gibt es die ersten Baelle erst im Labor
        items: this.storyOn ? {} : { 'poke-ball': 10, 'great-ball': 0, 'ultra-ball': 0 },
        money: 3000, flags: {},
        lastHeal: { map: SPAWN.map, x: SPAWN.x, y: SPAWN.y }
      };
      this.repo.savePlayer(player);
      this.repo.log(runId, 'player_created', { playerId: player.id, name });
    }

    // Spielstaende von vor der Story: Fortschritt bis zum Labor gilt als erledigt
    if (!player.flags) player.flags = player.starterChosen ? Object.fromEntries(LEGACY_FLAGS.map((f) => [f, true])) : {};
    if (player.money == null) player.money = 3000;
    if (!player.items) player.items = {};
    if (this.storyOn && !player.flags.intro) Object.assign(player, NEW_PLAYER_SPAWN);

    // Nach Kartenumbauten kann ein alter Spielstand auf einem ungueltigen Feld stehen
    if (!isStandable(MAPS, player.map, player.x, player.y, player.flags)) {
      const h = player.lastHeal;
      Object.assign(player, h && isStandable(MAPS, h.map, h.x, h.y, player.flags) ? { map: h.map, x: h.x, y: h.y } : { map: SPAWN.map, x: SPAWN.x, y: SPAWN.y });
    }
    if (player.lastHeal && !isStandable(MAPS, player.lastHeal.map, player.lastHeal.x, player.lastHeal.y)) player.lastHeal = { map: SPAWN.map, x: SPAWN.x, y: SPAWN.y };

    const old = this.sessions.get(player.id);
    if (old) { this.send(old.ws, { t: S2C.ERROR, message: 'Du hast dich an anderer Stelle angemeldet.' }); old.ws.close(); this.disconnect({ session: old }); }

    const s = { ws: conn.ws, player, party: [], box: [], battle: null, lastMoveAt: 0, posDirty: false, pendingLearn: [], script: null, shop: false, prev: null };
    this.loadMons(s);
    conn.session = s;
    this.sessions.set(player.id, s);

    this.send(conn.ws, {
      t: S2C.WELCOME,
      selfId: player.id,
      token: player.token,
      player: this.publicPlayer(player),
      run: player.runId ? this.repo.getRun(player.runId) : null,
      players: this.playersOnMap(player.map, player.id),
      walkMs: WALK_MS, runMs: RUN_MS
    });
    this.sendParty(s);
    this.sendNuzlocke(s);
    this.sendProgress(s);
    if (!player.starterChosen && !this.storyOn) this.sendStarterChoice(s);
    if (player.gameOver) this.send(conn.ws, { t: S2C.GAME_OVER, reason: 'Alle Pokemon deines Teams sind tot.' });
    this.broadcastMap(player.map, { t: S2C.PLAYER_JOINED, player: this.publicPlayer(player) }, player.id);
    this.log.info(`[+] ${player.name} (${player.runId || 'solo'}) online`);
    if (this.storyOn && !player.gameOver) {
      if (!player.flags.intro) this.story.runNamed(s, 'intro');
      else this.story.afterMove(s);
    }
  }

  sendStarterChoice(s) {
    this.send(s.ws, { t: S2C.NEED_STARTER, options: STARTERS.map((id) => ({ id, speciesId: id, name: POKEMON[id].name, types: POKEMON[id].types, family: POKEMON[id].family, stage: 1 })) });
  }
  sendProgress(s) { this.send(s.ws, { t: S2C.PROGRESS, flags: s.player.flags, money: s.player.money }); }

  loadMons(s) {
    const all = this.repo.listPokemon(s.player.id);
    s.party = all.filter((p) => p.location === 'party').sort((a, b) => a.slot - b.slot);
    s.box = all.filter((p) => p.location !== 'party');
    this.reslot(s);
  }

  reslot(s) { s.party.forEach((p, i) => { p.slot = i; p.location = 'party'; }); s.box.forEach((p) => { p.location = 'box'; p.slot = null; }); }

  disconnect(conn) {
    const s = conn.session;
    if (!s || this.sessions.get(s.player.id) !== s) return;
    if (s.battle && s.battle.state !== 'ended') {
      // Anti-Exploit: Verbindungsabbruch im Kampf zaehlt als Flucht (Encounter gilt als verbraucht).
      s.battle.end('fled', []);
      this.finishBattle(s, 'fled');
    }
    this.savePlayerNow(s);
    this.sessions.delete(s.player.id);
    this.broadcastMap(s.player.map, { t: S2C.PLAYER_LEFT, id: s.player.id });
    this.log.info(`[-] ${s.player.name} offline`);
  }

  publicPlayer(p) {
    const s = this.sessions.get(p.id);
    return { id: p.id, name: p.name, map: p.map, x: p.x, y: p.y, dir: p.dir, color: p.color, inBattle: !!(s && s.battle), runId: p.runId };
  }
  playersOnMap(mapId, exceptId) {
    return [...this.sessions.values()].filter((s) => s.player.map === mapId && s.player.id !== exceptId).map((s) => this.publicPlayer(s.player));
  }

  savePlayerNow(s) { this.repo.savePlayer(s.player); s.posDirty = false; }
  flushPositions() { for (const s of this.sessions.values()) if (s.posDirty) this.savePlayerNow(s); }
  saveMons(s) { this.repo.transaction(() => { for (const p of [...s.party, ...s.box]) this.repo.savePokemon(p); }); }

  sendParty(s) {
    this.send(s.ws, { t: S2C.PARTY, party: s.party.map(publicPokemon), box: s.box.map(publicPokemon), items: s.player.items });
  }
  sendNuzlocke(s) { this.send(s.ws, { t: S2C.NUZLOCKE, ...this.rules.summary(s.player) }); }
  // Seelengruppen betreffen alle Run-Mitglieder: Uebersicht bei jedem online Mitglied aktualisieren.
  refreshRun(player) {
    if (!player.runId) { const s = this.sessions.get(player.id); if (s) this.sendNuzlocke(s); return; }
    for (const s of this.sessions.values()) if (s.player.runId === player.runId) this.sendNuzlocke(s);
  }
  notice(s, text, kind = 'info') { this.send(s.ws, { t: S2C.NOTICE, text, kind }); }

  // ------------------------------------------------------------------ Starter
  chooseStarter(s, msg) {
    if (s.player.starterChosen) return this.notice(s, 'Du hast bereits einen Starter.');
    if (this.storyOn && s.script?.waiting !== 'starter') return this.notice(s, 'Das geht gerade nicht.', 'error');
    const id = Number(msg.speciesId);
    if (!STARTERS.includes(id)) return this.notice(s, 'Ungueltiger Starter', 'error');
    const mon = createPokemon(id, 5, { ownerId: s.player.id, runId: s.player.runId, metRoute: 'starter' });
    mon.shiny = false;
    s.party.push(mon);
    this.reslot(s);
    s.player.starterChosen = true;
    s.player.starterSpecies = id;
    s.player.flags.has_starter = true;
    this.repo.transaction(() => { this.repo.savePlayer(s.player); this.repo.savePokemon(mon); });
    // Starter zaehlen als Encounter "starter" und werden bei Soulbound miteinander verlinkt.
    const rules = this.rules.rulesFor(s.player);
    if (rules.nuzlocke) {
      this.rules.onEncounterStart(s.player, 'starter', mon, new Set());
      const res = this.rules.onEncounterResolved(s.player, 'starter', 'caught', mon);
      this.handleVictims(res.victims, s.player);
    }
    this.notice(s, `Du hast ${displayName(mon)} als Partner gewählt!`);
    this.sendParty(s);
    this.refreshRun(s.player);
    this.broadcastRun(s.player.runId, { t: S2C.NOTICE, text: `${s.player.name} hat ${displayName(mon)} gewählt.`, kind: 'info' });
    this.sendProgress(s);
    this.story.starterChosen(s);
  }

  // ------------------------------------------------------------------ Bewegung
  face(s, msg) {
    if (!DIRS[msg.dir] || s.battle || s.script) return;
    s.player.dir = msg.dir;
    this.broadcastMap(s.player.map, { t: S2C.PLAYER_STATE, player: this.publicPlayer(s.player) }, s.player.id);
  }

  move(s, msg) {
    const p = s.player;
    const ack = (ok) => this.send(s.ws, { t: S2C.MOVE_ACK, seq: msg.seq, ok, map: p.map, x: p.x, y: p.y, dir: p.dir });
    if (!DIRS[msg.dir] || s.battle || s.script || (!p.starterChosen && !this.storyOn)) return ack(false);
    const now = Date.now();
    const minGap = (msg.running ? RUN_MS : WALK_MS) * 0.75; // Toleranz fuer Netzwerk-Jitter
    if (now - s.lastMoveAt < minGap) return ack(false);
    p.dir = msg.dir;
    const r = resolveStep(MAPS, p.map, p.x, p.y, msg.dir, this.storyOn ? (m, x, y) => !!npcAt(m, x, y, p.flags) : undefined, this.storyOn ? p.flags : undefined);
    if (!r.ok) { ack(false); return this.broadcastMap(p.map, { t: S2C.PLAYER_STATE, player: this.publicPlayer(p) }, p.id); }
    s.lastMoveAt = now;
    s.prev = { map: p.map, x: p.x, y: p.y };
    const oldMap = p.map;
    p.map = r.map; p.x = r.x; p.y = r.y;
    if (r.dir) p.dir = r.dir;
    s.posDirty = true;
    ack(true);

    if (oldMap !== p.map) {
      if (MAPS[p.map].fly && !p.flags['visit_' + p.map]) { p.flags['visit_' + p.map] = true; this.sendProgress(s); }
      this.broadcastMap(oldMap, { t: S2C.PLAYER_LEFT, id: p.id });
      this.broadcastMap(p.map, { t: S2C.PLAYER_JOINED, player: this.publicPlayer(p) }, p.id);
      this.send(s.ws, { t: S2C.MAP_CHANGE, map: p.map, x: p.x, y: p.y, dir: p.dir, players: this.playersOnMap(p.map, p.id) });
    } else {
      this.broadcastMap(p.map, { t: S2C.PLAYER_MOVED, id: p.id, x: p.x, y: p.y, dir: p.dir, running: !!msg.running, jump: r.jump }, p.id);
    }

    if (this.storyOn && this.story.afterMove(s)) return;
    if (!r.warp) this.tryEncounter(s, tileAt(MAPS[p.map], p.x, p.y));
  }

  // Skriptschritt "back": Spieler auf das vorige Feld zuruecksetzen
  pushBack(s) {
    const p = s.player;
    if (!s.prev || s.prev.map !== p.map) return;
    const dx = s.prev.x - p.x; const dy = s.prev.y - p.y;
    p.x = s.prev.x; p.y = s.prev.y;
    p.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    s.prev = null; s.posDirty = true;
    this.send(s.ws, { t: S2C.MAP_CHANGE, map: p.map, x: p.x, y: p.y, dir: p.dir, players: this.playersOnMap(p.map, p.id) });
    this.broadcastMap(p.map, { t: S2C.PLAYER_MOVED, id: p.id, x: p.x, y: p.y, dir: p.dir }, p.id);
  }

  interact(s) {
    if (s.battle || s.script) return;
    const p = s.player;
    const f = facingTile(p.x, p.y, p.dir);
    if (this.storyOn && this.story.talk(s, f.x, f.y)) return;
    const map = MAPS[p.map];
    const ev = map.events.find((e) => e.x === f.x && e.y === f.y) || map.events.find((e) => e.x === p.x && e.y === p.y);
    if (!ev) return;
    if (ev.type === 'heal') return this.healAt(s, ev);
    if (ev.type === 'shop') return this.openShop(s);
    if (this.storyOn) return this.story.start(s, [[null, ev.text]]);
    this.notice(s, ev.text, 'dialog');
  }

  healParty(s, setHealPoint) {
    for (const m of s.party) healPokemon(m);
    if (setHealPoint) s.player.lastHeal = { map: s.player.map, x: s.player.x, y: s.player.y };
    this.saveMons(s);
    this.savePlayerNow(s);
    this.sendParty(s);
  }

  healAt(s, ev) {
    const dead = s.party.filter((m) => !m.alive).length;
    const tail = dead ? ` ${dead === 1 ? 'Ein totes Pokémon kann' : dead + ' tote Pokémon können'} leider nicht mehr geheilt werden.` : '';
    if (this.storyOn) {
      return this.story.start(s, [
        ['Pflegerin', 'Willkommen im Pokémon-Center! Ich kümmere mich kurz um dein Team.'],
        { heal: 'center' },
        [null, 'Ding ding dideldum!'],
        ['Pflegerin', 'Fertig! Deine Pokémon sind wieder topfit.' + tail + ' Bis bald!']
      ]);
    }
    this.healParty(s, true);
    this.notice(s, (ev?.text || 'Dein Team wurde geheilt.') + tail, 'dialog');
  }

  // ------------------------------------------------------------------ Markt und Beutel
  shopStock(s) {
    return MART_STOCK.map((id) => ({ id, name: ITEMS[id].name, price: ITEMS[id].price, locked: !!ITEMS[id].requires && !s.player.flags?.[ITEMS[id].requires], have: s.player.items[id] || 0 }));
  }
  openShop(s) {
    s.shop = true;
    this.send(s.ws, { t: S2C.SHOP, stock: this.shopStock(s), money: s.player.money });
  }
  buy(s, msg) {
    if (!s.shop || s.battle || s.script) return;
    const it = ITEMS[msg.item];
    const count = Math.floor(Number(msg.count));
    if (!it || !MART_STOCK.includes(msg.item) || !(count >= 1 && count <= 99)) return;
    if (it.requires && !s.player.flags[it.requires]) return this.notice(s, 'Das gibt es erst mit dem passenden Orden.', 'error');
    const cost = it.price * count;
    if (s.player.money < cost) return this.notice(s, 'Du hast nicht genug Geld.', 'error');
    s.player.money -= cost;
    s.player.items[msg.item] = (s.player.items[msg.item] || 0) + count;
    // Wie im Original: Wer 10 Pokebaelle kauft, bekommt einen Premierball dazu (hier ein Pokeball)
    if (msg.item === 'poke-ball' && count >= 10) { s.player.items['poke-ball']++; this.notice(s, 'Als Dankeschön gibt es einen Pokéball gratis dazu!'); }
    this.notice(s, `Du hast ${count}x ${it.name} für ${cost} ¥ gekauft.`);
    this.savePlayerNow(s);
    this.sendParty(s);
    this.sendProgress(s);
    this.send(s.ws, { t: S2C.SHOP, stock: this.shopStock(s), money: s.player.money });
  }
  useItem(s, msg) {
    if (s.battle || s.script) return;
    const mon = s.party.find((m) => m.id === msg.pokemonId);
    if (!mon || !(s.player.items[msg.item] > 0)) return;
    const r = applyItem(msg.item, mon, displayName(mon), { nuzlocke: this.rules.rulesFor(s.player).nuzlocke });
    if (r.ok) { s.player.items[msg.item]--; this.repo.savePokemon(mon); this.savePlayerNow(s); this.sendParty(s); }
    this.notice(s, r.text, r.ok ? 'info' : 'error');
  }

  // Weltkarte: wer ist wo. Wird nur verschickt, wenn sich etwas geaendert hat.
  roster() { return [...this.sessions.values()].map((x) => { const p = x.player; return { id: p.id, name: p.name, map: p.map, x: p.x, y: p.y, color: p.color, runId: p.runId }; }); }
  broadcastRoster(force) {
    const players = this.roster();
    const key = JSON.stringify(players);
    if (key === this.lastRoster && !force) return;
    this.lastRoster = key;
    for (const s of this.sessions.values()) this.send(s.ws, { t: S2C.ROSTER, players });
  }

  emote(s, msg) {
    if (!EMOTES.includes(msg.kind)) return;
    const now = Date.now();
    if (now - (s.lastEmote || 0) < 700) return;
    s.lastEmote = now;
    const out = { t: S2C.PLAYER_EMOTE, id: s.player.id, kind: msg.kind };
    this.broadcastMap(s.player.map, out, s.player.id);
    this.send(s.ws, out);
  }

  chat(s, msg) {
    const text = String(msg.text || '').slice(0, 200).trim();
    if (!text) return;
    if (process.env.DEV === '1' && text.startsWith('/')) return this.devCommand(s, text.split(/\s+/));
    this.broadcastMap(s.player.map, { t: S2C.CHAT, from: s.player.name, id: s.player.id, text });
    this.send(s.ws, { t: S2C.CHAT, from: s.player.name, id: s.player.id, text });
  }

  // Spieler direkt an einen Ort versetzen (Fliegen, Skripte, Testbefehl)
  teleport(s, map, x, y, dir = 'down') {
    const p = s.player; const old = p.map;
    Object.assign(p, { map, x, y, dir });
    s.posDirty = true; s.prev = null;
    if (MAPS[map].fly) p.flags['visit_' + map] = true;
    this.broadcastMap(old, { t: S2C.PLAYER_LEFT, id: p.id });
    this.send(s.ws, { t: S2C.MAP_CHANGE, map: p.map, x: p.x, y: p.y, dir: p.dir, players: this.playersOnMap(p.map, p.id) });
    this.broadcastMap(p.map, { t: S2C.PLAYER_JOINED, player: this.publicPlayer(p) }, p.id);
  }

  // Fliegen: Auswahl aller besuchten Orte (nur draussen und mit der VM Fliegen)
  fly(s) {
    if (s.battle || s.script || !this.storyOn) return;
    const p = s.player;
    if (!p.flags.hm_fly) return this.notice(s, 'Du beherrschst Fliegen noch nicht.', 'error');
    if (MAPS[p.map].indoor) return this.notice(s, 'Hier drinnen kannst du nicht fliegen.', 'error');
    const spots = Object.entries(MAPS).filter(([id, m]) => m.fly && p.flags['visit_' + id] && id !== p.map);
    if (!spots.length) return this.notice(s, 'Du kennst noch keine anderen Orte.', 'error');
    const labels = [...spots.map(([, m]) => m.name), 'Abbrechen'];
    const branches = spots.map(([id, m]) => [{ warp: [id, m.fly[0], m.fly[1]] }]);
    this.story.start(s, [[null, 'Wohin möchtest du fliegen?'], { choose: labels, branches }]);
  }

  // Nur zum Testen (DEV=1): /tp karte x y, /flag name, /lv n
  devCommand(s, [cmd, a, b, c]) {
    const p = s.player;
    if (cmd === '/tp' && MAPS[a]) this.teleport(s, a, Number(b), Number(c));
    if (cmd === '/flag') { p.flags[a] = true; this.sendProgress(s); }
    if (cmd === '/lv') { for (const m of s.party) { m.level = Number(a); m.moves = defaultMoves(species(m.speciesId), m.level); recalc(m); m.hp = m.stats.hp; } this.saveMons(s); this.sendParty(s); }
    this.savePlayerNow(s);
  }

  // ------------------------------------------------------------------ Encounter
  tryEncounter(s, tile) {
    const map = MAPS[s.player.map];
    const table = map.encounters;
    if (!table) return;
    const list = tile === GRASS ? table.grass : tile === CAVE_FLOOR ? table.cave : tile === WATER ? table.water : null;
    if (!list?.length) return;
    if (!s.party.some((m) => m.alive && m.hp > 0)) return;
    if (!encounterRoll(tile === GRASS ? table.grassRate : tile === WATER ? (table.waterRate || 10) : table.caveRate)) return;
    const total = list.reduce((a, e) => a + e.weight, 0);
    let r = Math.random() * total;
    const slot = list.find((e) => (r -= e.weight) < 0) || list[0];
    const level = slot.min + Math.floor(Math.random() * (slot.max - slot.min + 1));
    this.startWildBattle(s, slot.species, level, s.player.map);
  }

  startWildBattle(s, speciesId, level, route, meta = null) {
    if (!s.party.some((m) => m.alive !== false && m.hp > 0)) return false;
    const wild = createPokemon(speciesId, level, { metRoute: route });
    const families = new Set([...s.party, ...s.box].map((m) => species(m.speciesId).family));
    // Vor den ersten Pokebaellen zaehlt keine Begegnung fuer Nuzlocke (wie die gaengige Regel)
    const gate = this.storyOn && !s.player.flags.got_balls
      ? { counted: false, catchable: false, reason: 'Du hast noch keine Pokébälle. Diese Begegnung zählt nicht.' }
      : this.rules.onEncounterStart(s.player, route, wild, families);
    s.encounter = { route, counted: gate.counted };
    s.battleMeta = meta;
    s.battle = new WildBattle({
      id: crypto.randomUUID(), party: s.party, wild, route, items: s.player.items,
      catchable: gate.catchable, catchBlockReason: gate.reason, nuzlocke: this.rules.rulesFor(s.player).nuzlocke,
      onFaint: (mon) => this.onAllyFaint(s, mon)
    });
    const events = s.battle.intro();
    this.send(s.ws, { t: S2C.BATTLE_START, state: s.battle.snapshot(), events });
    this.broadcastMap(s.player.map, { t: S2C.PLAYER_STATE, player: this.publicPlayer(s.player) }, s.player.id);
    if (gate.counted) this.sendNuzlocke(s);
    return true;
  }

  // Geskripteter Wildkampf: zaehlt nicht fuer Nuzlocke, niemand stirbt, Niederlage ohne Folgen.
  startScriptWild(s, speciesId, level) {
    if (!s.party.some((m) => m.alive !== false && m.hp > 0)) return false;
    const wild = createPokemon(speciesId, level, { metRoute: 'story' });
    s.encounter = { route: 'story', counted: false };
    s.battleMeta = { safe: true, script: true };
    s.battle = new WildBattle({
      id: crypto.randomUUID(), party: s.party, wild, route: 'story', items: s.player.items,
      catchable: false, catchBlockReason: 'Jetzt ist keine Zeit zum Fangen!', nuzlocke: false, onFaint: () => []
    });
    this.beginBattle(s);
    return true;
  }

  startTrainerBattle(s, trainerId) {
    const tr = TRAINERS[trainerId];
    if (!tr || !s.party.some((m) => m.alive !== false && m.hp > 0)) return false;
    const starter = s.player.starterSpecies || s.party.concat(s.box).find((m) => m.metRoute === 'starter')?.speciesId || 387;
    // Der Starter des Rivalen entwickelt sich mit seinem Level mit
    const rivalSp = (lv) => (RIVAL_STARTER[species(starter).family] || RIVAL_STARTER[starter] || 390) + (lv >= 34 ? 2 : lv >= 16 ? 1 : 0);
    const foeParty = tr.party.map(([sp, lv]) => createPokemon(sp === 'rival' ? rivalSp(lv) : sp, lv, { metRoute: 'trainer' }));
    const nuz = this.rules.rulesFor(s.player).nuzlocke;
    s.encounter = { route: 'trainer', counted: false };
    s.battleMeta = { trainerId, safe: !!tr.safe };
    s.battle = new TrainerBattle({
      id: crypto.randomUUID(), party: s.party, foeParty, route: 'trainer', items: s.player.items,
      trainer: { name: tr.name, cls: tr.cls, look: tr.look, leader: !!tr.leader }, nuzlocke: nuz && !tr.safe,
      onFaint: tr.safe ? () => [] : (mon) => this.onAllyFaint(s, mon)
    });
    this.beginBattle(s);
    return true;
  }

  beginBattle(s) {
    const events = s.battle.intro();
    this.send(s.ws, { t: S2C.BATTLE_START, state: s.battle.snapshot(), events });
    this.broadcastMap(s.player.map, { t: S2C.PLAYER_STATE, player: this.publicPlayer(s.player) }, s.player.id);
  }

  battleAction(s, msg) {
    const b = s.battle;
    if (!b) return this.notice(s, 'Kein aktiver Kampf', 'error');
    const action = { type: msg.type, index: Number(msg.index), ball: msg.ball, item: msg.item };
    const { events, error } = b.act(action);
    if (error) return this.send(s.ws, { t: S2C.BATTLE_EVENTS, events: [{ type: 'text', text: error }], state: b.snapshot(), error: true });
    this.send(s.ws, { t: S2C.BATTLE_EVENTS, events, state: b.snapshot() });
    if (b.state === 'ended') this.finishBattle(s, b.result);
  }

  onAllyFaint(s, mon) {
    const res = this.rules.onPokemonFainted(s.player, mon);
    this.repo.savePokemon(mon);
    const ev = [];
    if (res.dead) ev.push({ type: 'death', pokemonId: mon.id, text: `${displayName(mon)} ist gestorben. (Nuzlocke)` });
    for (const v of res.victims) {
      const owner = this.repo.getPlayer(v.playerId);
      const victim = this.repo.getPokemon(v.pokemonId);
      ev.push({ type: 'text', text: `Seelenband: ${victim ? displayName(victim) : '?'} von ${owner?.name ?? '?'} stirbt mit!` });
    }
    this.handleVictims(res.victims, s.player, mon);
    return ev;
  }

  // Verteilt Soulbound-Todesfaelle an betroffene Spieler (online: sofort, offline: beim naechsten Login aus der DB).
  handleVictims(victims, sourcePlayer, sourceMon) {
    for (const v of victims) {
      const target = this.sessions.get(v.playerId);
      const dbMon = this.repo.getPokemon(v.pokemonId);
      const name = dbMon ? displayName(dbMon) : '?';
      const info = {
        t: S2C.SOUL_DEATH, cause: v.cause, pokemonId: v.pokemonId, pokemonName: name, playerName: this.repo.getPlayer(v.playerId)?.name,
        partnerName: sourceMon ? displayName(sourceMon) : null, partnerPlayer: sourcePlayer?.name
      };
      if (sourcePlayer?.runId) this.broadcastRun(sourcePlayer.runId, info);
      if (!target) continue;
      const mon = [...target.party, ...target.box].find((m) => m.id === v.pokemonId);
      if (mon) { mon.alive = false; mon.deathCause = v.cause; mon.hp = 0; }
      if (target.battle && target.battle.state !== 'ended') {
        const text = v.cause === 'soulbound_failed_encounter'
          ? `Das Seelenband ist zerrissen! ${name} stirbt.`
          : `Seelenband! ${sourceMon ? displayName(sourceMon) : 'Ein Partner'} von ${sourcePlayer?.name} ist gefallen. ${name} folgt ihm in den Tod!`;
        const ev = target.battle.externalDeath(v.pokemonId, text);
        if (ev.length) this.send(target.ws, { t: S2C.BATTLE_EVENTS, events: ev, state: target.battle.snapshot() });
        if (target.battle.state === 'ended') this.finishBattle(target, target.battle.result);
      }
      this.sendParty(target);
      this.sendNuzlocke(target);
      this.checkGameOver(target);
    }
    if (sourcePlayer) { const s = this.sessions.get(sourcePlayer.id); if (s) this.sendNuzlocke(s); }
  }

  finishBattle(s, result) {
    const b = s.battle;
    if (!b) return;
    s.battle = null;
    const enc = s.encounter || {};
    s.encounter = null;
    const meta = s.battleMeta || null;
    s.battleMeta = null;
    const tr = meta?.trainerId ? TRAINERS[meta.trainerId] : null;
    const extra = [];
    let victims = [];

    if (result === 'caught') {
      const mon = b.wild.mon;
      mon.ownerId = s.player.id;
      mon.runId = s.player.runId;
      mon.status = mon.status || null;
      if (s.party.length < 6) s.party.push(mon); else { s.box.push(mon); extra.push(`${displayName(mon)} wurde in die Box geschickt.`); }
      this.reslot(s);
      this.repo.savePokemon(mon);
      if (enc.counted) victims = this.rules.onEncounterResolved(s.player, enc.route, 'caught', mon).victims;
      if (!mon.alive) extra.push(`Das Seelenband dieser Route ist bereits zerstört. ${displayName(mon)} ist sofort tot.`);
    } else if (enc.counted) {
      victims = this.rules.onEncounterResolved(s.player, enc.route, 'failed', null).victims;
      extra.push('Nuzlocke: Der Encounter dieser Route ist verbraucht.');
    }

    if (result === 'win' && tr) {
      const flags = s.player.flags;
      for (const [who, text] of tr.win || []) extra.push(who ? `${who}: ${text}` : text);
      const prize = tr.prize * Math.max(...b.foeParty.map((m) => m.level));
      if (prize) { s.player.money += prize; extra.push(`Du erhältst ${prize} ¥ als Preisgeld.`); }
      flags['beat_' + meta.trainerId] = true;
      if (tr.flag) flags[tr.flag] = true;
      if (tr.badge) extra.push(`Du erhältst den ${tr.badge}!`);
      this.sendProgress(s);
    }

    if (result === 'lose' && meta?.safe) {
      // Story-Kaempfe ohne Risiko: Team wird geheilt, es geht einfach weiter
      for (const m of s.party) healPokemon(m);
      extra.push(tr ? `${tr.name}: Ha! Aber keine Sorge, das war nur ein Übungskampf.` : 'Dein Pokémon hat sich zum Glück schnell erholt.');
    } else if (result === 'win') {
      for (const m of s.party) {
        if (m.alive && m.hp > 0 && canEvolve(m)) { const e = evolve(m); if (e) extra.push(e.text); }
      }
    }

    if (result === 'lose' && !meta?.safe) {
      const rules = this.rules.rulesFor(s.player);
      if (rules.nuzlocke) {
        this.checkGameOver(s);
      }
      if (!s.player.gameOver) {
        // Whiteout: zurueck zum letzten Heilpunkt, Team wird geheilt (Tote bleiben tot).
        const oldMap = s.player.map;
        Object.assign(s.player, s.player.lastHeal || { map: SPAWN.map, x: SPAWN.x, y: SPAWN.y });
        for (const m of s.party) healPokemon(m);
        const lost = Math.floor((s.player.money || 0) / 2);
        s.player.money -= lost;
        if (lost) extra.push(`Du verlierst ${lost} ¥.`);
        extra.push('Du bist in Ohnmacht gefallen und eilst zum letzten Heilpunkt.');
        this.sendProgress(s);
        this.broadcastMap(oldMap, { t: S2C.PLAYER_LEFT, id: s.player.id });
        this.send(s.ws, { t: S2C.MAP_CHANGE, map: s.player.map, x: s.player.x, y: s.player.y, dir: 'down', players: this.playersOnMap(s.player.map, s.player.id) });
        this.broadcastMap(s.player.map, { t: S2C.PLAYER_JOINED, player: this.publicPlayer(s.player) }, s.player.id);
      }
    }

    this.saveMons(s);
    this.savePlayerNow(s);
    this.send(s.ws, { t: S2C.BATTLE_END, result, messages: extra });
    this.sendParty(s);
    this.refreshRun(s.player);
    this.broadcastMap(s.player.map, { t: S2C.PLAYER_STATE, player: this.publicPlayer(s.player) }, s.player.id);
    if (victims.length) this.handleVictims(victims, s.player, null);
    this.story.battleEnded(s, result, meta);
  }

  checkGameOver(s) {
    const rules = this.rules.rulesFor(s.player);
    if (!rules.nuzlocke || s.player.gameOver || !s.player.starterChosen) return;
    if (s.party.some((m) => m.alive)) return;
    s.player.gameOver = true;
    this.savePlayerNow(s);
    this.repo.log(s.player.runId, 'game_over', { playerId: s.player.id });
    this.send(s.ws, { t: S2C.GAME_OVER, reason: 'Alle Pokemon deines Teams sind tot. Der Nuzlocke-Run ist vorbei.' });
    this.broadcastRun(s.player.runId, { t: S2C.NOTICE, text: `${s.player.name} hat den Run verloren.`, kind: 'death' });
  }

  // ------------------------------------------------------------------ Team-Verwaltung
  partySwap(s, msg) {
    if (s.battle) return;
    const a = Number(msg.from); const b = Number(msg.to);
    if (!s.party[a] || !s.party[b]) return;
    [s.party[a], s.party[b]] = [s.party[b], s.party[a]];
    this.reslot(s); this.saveMons(s); this.sendParty(s);
  }

  boxMove(s, msg) {
    if (s.battle) return;
    if (msg.to === 'box') {
      const i = s.party.findIndex((m) => m.id === msg.pokemonId);
      if (i < 0) return;
      if (s.party.filter((m) => m.alive).length <= 1 && s.party[i].alive) return this.notice(s, 'Du brauchst mindestens ein lebendes Pokemon im Team.', 'error');
      s.box.push(...s.party.splice(i, 1));
    } else {
      const i = s.box.findIndex((m) => m.id === msg.pokemonId);
      if (i < 0) return;
      if (s.party.length >= 6) return this.notice(s, 'Dein Team ist voll.', 'error');
      if (!s.box[i].alive && this.rules.rulesFor(s.player).nuzlocke) return this.notice(s, 'Tote Pokemon bleiben auf dem Friedhof.', 'error');
      s.party.push(...s.box.splice(i, 1));
    }
    this.reslot(s); this.saveMons(s); this.sendParty(s);
  }

  nickname(s, msg) {
    const m = [...s.party, ...s.box].find((x) => x.id === msg.pokemonId);
    const name = String(msg.name || '').trim().slice(0, 12);
    if (!m || (name && !NAME_RE.test(name))) return;
    m.nickname = name || null;
    this.repo.savePokemon(m);
    this.sendParty(s); this.sendNuzlocke(s);
  }

  learnMove(s, msg) {
    const m = s.party.find((x) => x.id === msg.pokemonId);
    const mv = MOVES[msg.moveId];
    if (!m || !mv || s.battle) return;
    const legal = species(m.speciesId).learnset.some(([lv, id]) => id === mv.id && lv <= m.level);
    if (!legal || m.moves.some((x) => x.id === mv.id)) return;
    const idx = Number(msg.replaceIndex);
    if (idx < 0) return;
    const entry = { id: mv.id, pp: mv.pp, maxPp: mv.pp };
    if (m.moves.length < 4) m.moves.push(entry); else if (m.moves[idx]) m.moves[idx] = entry; else return;
    this.repo.savePokemon(m);
    this.notice(s, `${displayName(m)} hat ${mv.name} erlernt!`);
    this.sendParty(s);
  }

  stop() { clearInterval(this.saveTimer); clearInterval(this.rosterTimer); this.flushPositions(); }
}
