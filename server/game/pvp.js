// Kämpfe und Tausch zwischen echten Spielern, wie im Union-Raum von Platin.
// Ein Spieler spricht einen anderen in der Welt an (Aktionstaste vor ihm) und wählt Einzelkampf,
// Doppelkampf oder Tausch. Der andere bekommt eine Anfrage und kann annehmen oder ablehnen.
//
// Kampf: Die Engine rechnet aus Sicht von Spieler A (Seite ally), Spieler B steht auf der Seite foe.
// Jeder Spieler bekommt Ereignisse und Zustand aus seiner eigenen Sicht (Seiten gespiegelt, Namen
// wie "Das gegnerische X" passend). Wie im Original kämpfen Kopien der Teams: danach ist alles wie vorher,
// es gibt keine Erfahrung, kein Geld, keine Items aus dem Beutel und keine Nuzlocke-Tode.
import { MOVES } from '../../shared/data/moves.js';
import { S2C } from '../../shared/protocol.js';
import { displayName, publicPokemon, species, evoOptions, recalc } from './pokemonFactory.js';
import { DoubleBattle } from './double.js';
import { POKEMON } from '../../shared/data/pokemon.js';

const SWAP = { ally: 'foe', ally2: 'foe2', foe: 'ally', foe2: 'ally2' };
const SLOT_KEYS = { ally: ['ally', 'ally2'], foe: ['foe', 'foe2'] };
const other = (who) => (who === 'A' ? 'B' : 'A');
const usable = (party) => party.filter((m) => !m.egg && m.alive !== false && m.hp > 0);
const NAME_RE = /\u0001([AB])\u0002([nad])\u0002([^\u0001]*)\u0001/g;
const LINE_RE = /\u0003([a-z]+)\u0002([AB])\u0002([^\u0003]*)\u0003/g;
const INVITE_MS = 30000;
const MODE_DE = { single: 'Einzelkampf', double: 'Doppelkampf', trade: 'Tausch' };

export class PvpBattle extends DoubleBattle {
  /** @param {{ id, double, a: { name, look, party }, b: { name, look, party } }} o */
  constructor(o) {
    const clone = (party) => party.map((m) => structuredClone(m));
    const partyA = clone(o.a.party); const partyB = clone(o.b.party);
    super({ id: o.id, party: partyA, items: {}, kind: 'trainer', catchable: false, nuzlocke: false, onFaint: null,
      foes: [{ name: o.b.name, cls: '', look: o.b.look || 'player', party: partyB }] });
    this.pvp = true;
    this.isDouble = !!o.double;
    this.names = { A: o.a.name, B: o.b.name };
    this.looks = { A: o.a.look || 'player', B: o.b.look || 'player' };
    this.owners = { A: this.slots.ally[0].owner, B: this.slots.foe[0].owner };
    this.owners.B.ai = false;
    this.choice = { A: null, B: null };
    this.pending = { A: [], B: [] };
    if (!this.isDouble) for (const side of ['ally', 'foe']) { this.slots[side][1].b = null; this.slots[side][1].closed = true; }
  }

  // ---------------------------------------------------------------- Sicht der Spieler
  whoOfSide(side) { return side === 'ally' ? 'A' : 'B'; }
  whoOf(b) { return this.whoOfSide(this.sideOf(b)); }
  sideOfWho(who) { return who === 'A' ? 'ally' : 'foe'; }
  partyOfWho(who) { return this.owners[who].party; }

  // Namen werden als Platzhalter verschickt und erst pro Spieler ausgeschrieben
  name(b) { return `\u0001${this.whoOf(b)}\u0002n\u0002${displayName(b.mon)}\u0001`; }
  nameDat(b) { return `\u0001${this.whoOf(b)}\u0002d\u0002${displayName(b.mon)}\u0001`; }
  nameAcc(b) { return `\u0001${this.whoOf(b)}\u0002a\u0002${displayName(b.mon)}\u0001`; }
  line(kind, who, payload = '') { return `\u0003${kind}\u0002${who}\u0002${payload}\u0003`; }

  renderText(text, who) {
    const out = text
      .replace(LINE_RE, (_, kind, w, p) => {
        const own = w === who; const n = this.names[w];
        if (kind === 'send') return own ? `Los, ${p}!` : `${n} schickt ${p} in den Kampf!`;
        if (kind === 'recall') return own ? `${p}, komm zurück!` : `${n} ruft ${p} zurück!`;
        if (kind === 'vs') return `${this.names[other(who)]} möchte kämpfen!`;
        if (kind === 'win') return own ? `Du hast ${this.names[other(w)]} besiegt!` : `${n} hat dich besiegt!`;
        if (kind === 'forfeit') return own ? 'Du hast aufgegeben.' : `${n} hat aufgegeben!`;
        if (kind === 'gone') return own ? 'Die Verbindung ist abgebrochen.' : `Die Verbindung zu ${n} ist abgebrochen.`;
        return p;
      })
      .replace(NAME_RE, (_, w, c, n) => (w === who ? n : c === 'n' ? `Das gegnerische ${n}` : c === 'a' ? `das gegnerische ${n}` : `dem gegnerischen ${n}`));
    return out.charAt(0).toUpperCase() + out.slice(1);
  }

  view(events, who) {
    const out = [];
    for (const e of events) {
      if (e.type === 'needSwitch') { if (e.who === who) out.push({ type: 'needSwitch', slots: e.slots }); continue; }
      if (e.type === 'pvpSwitch') {
        const key = who === 'A' ? e.key : SWAP[e.key];
        out.push(e.who === who ? { type: 'switch', side: key, mon: e.mon } : { type: 'foeSwitch', side: key, mon: { ...e.mon, moves: undefined, stats: undefined } });
        continue;
      }
      if (e.type === 'end') { out.push({ type: 'end', result: this.resultFor(who) }); continue; }
      const c = { ...e };
      if (who === 'B') { if (SWAP[c.side]) c.side = SWAP[c.side]; if (SWAP[c.target]) c.target = SWAP[c.target]; }
      if (typeof c.text === 'string') c.text = this.renderText(c.text, who);
      out.push(c);
    }
    return out;
  }

  resultFor(who) { return !this.winner ? 'fled' : this.winner === who ? 'win' : 'lose'; }

  snapshotFor(who) {
    const mySide = this.sideOfWho(who); const theirSide = this.sideOfWho(other(who));
    const pub = (side, i, own) => {
      const sl = this.slots[side][i];
      if (!sl || !sl.b || (sl.b.mon.hp <= 0 && sl.b.fainted)) return null;
      const p = { ...publicPokemon(sl.b.mon), stages: sl.b.stages, owner: null };
      if (!own) { delete p.moves; delete p.stats; }
      return p;
    };
    const mine = this.partyOfWho(who); const theirs = this.partyOfWho(other(who));
    const waiting = this.state === 'action' && this.choice[who];
    return {
      id: this.id, pvp: true, kind: 'trainer', double: this.isDouble, catchable: false,
      state: this.state === 'ended' ? 'ended' : this.state === 'switch' ? (this.pending[who].length ? 'switch' : 'wait') : waiting ? 'wait' : 'action',
      ally: pub(mySide, 0, true), ally2: pub(mySide, 1, true), foe: pub(theirSide, 0, false), foe2: pub(theirSide, 1, false),
      control: [true, this.isDouble], partnerName: null, pending: this.pending[who],
      party: mine.map(publicPokemon), balls: {}, bag: {},
      trainer: { name: this.names[other(who)], look: this.looks[other(who)], cls: '', leader: false, count: 1 },
      foeTeam: theirs.filter((m) => !m.egg).map((m) => (m.hp > 0 ? 'ok' : 'down')),
      shiftOffer: false
    };
  }
  snapshot() { return this.snapshotFor('A'); }

  intro() {
    const ev = [{ type: 'text', text: this.line('vs', 'A') }];
    for (const who of ['B', 'A']) {
      const side = this.sideOfWho(who);
      const list = this.slots[side].filter((s) => s.b).map((s) => displayName(s.b.mon));
      if (list.length) ev.push({ type: 'text', text: this.line('send', who, list.join(' und ')) });
    }
    for (const b of this.all()) ev.push(...this.switchInAbility(b));
    return ev;
  }

  // ---------------------------------------------------------------- Aktionen beider Spieler
  isMine() { return true; } // keine KI: jede Aktion kommt von einem Menschen
  actFor(who, action) {
    if (this.state === 'ended') return { events: [], error: 'Kampf ist beendet' };
    if (action.type === 'run') {
      const ev = [{ type: 'text', text: this.line('forfeit', who) }];
      this.winner = other(who);
      return { events: this.end(this.resultFor('A'), ev), done: true };
    }
    if (this.state === 'switch') return this.switchFor(who, action);
    if (this.choice[who]) return { events: [], error: `Warte auf ${this.names[other(who)]} ...` };
    const list = action.type === 'multi' && Array.isArray(action.actions) ? action.actions : [action];
    const side = this.sideOfWho(who); const party = this.partyOfWho(who);
    const plan = []; const chosen = new Set();
    for (let i = 0; i < 2; i++) {
      const sl = this.slots[side][i];
      if (!sl || sl.closed || !sl.b || sl.b.mon.hp <= 0) continue;
      const own = this.slots[side].filter((x) => x.b && x.b.mon.hp > 0 && !x.closed);
      const a = list.find((x) => Number(x?.slot) === i) || (list.length === 1 && own[0] === sl ? list[0] : null) || this.defaultAction(sl.b);
      const err = this.check(sl.b, a, party, chosen);
      if (err) return { events: [], error: err };
      // Ziele kommen aus Sicht des Spielers, die Engine rechnet aus Sicht von A
      plan.push({ b: sl.b, a: { ...a, target: who === 'B' && SWAP[a.target] ? SWAP[a.target] : a.target }, slot: i });
    }
    this.choice[who] = plan;
    if (!this.choice[other(who)]) return { events: [], waiting: true };
    const all = [...this.choice.A, ...this.choice.B];
    this.choice = { A: null, B: null };
    this.turnStart();
    return this.runTurn(all, []);
  }

  check(b, a, party, chosen) {
    if (!a || !a.type) return 'Ungültige Aktion';
    if (this.forcedMove(b)) return null;
    if (a.type === 'move') {
      const can = b.mon.moves.some((m) => m.pp > 0);
      const mv = b.mon.moves[a.index];
      if (can && (!mv || mv.pp <= 0)) return 'Keine AP mehr für diese Attacke';
      const lock = this.choiceLock(b);
      if (can && lock && mv.id !== lock) return `Wegen ${this.itemName(b)} geht nur ${MOVES[lock].name}!`;
      return null;
    }
    if (a.type === 'switch') {
      const mon = party[a.index];
      if (!mon || mon.egg || mon.alive === false || mon.hp <= 0) return 'Dieses Pokémon kann nicht kämpfen';
      if (this.inField(mon) || chosen.has(a.index)) return `${displayName(mon)} kämpft bereits`;
      if (b.vol.trap > 0) return `${displayName(b.mon)} kann nicht ausgewechselt werden!`;
      chosen.add(a.index);
      return null;
    }
    if (a.type === 'item' || a.type === 'ball') return 'Im Kampf gegen andere Spieler sind keine Items aus dem Beutel erlaubt.';
    return 'Unbekannte Aktion';
  }

  switchSlot(b, index, ev) {
    const [side, i] = this.slotOf(b);
    const mon = side && this.slots[side][i].owner.party[index];
    if (!mon || this.inField(mon) || mon.hp <= 0 || mon.alive === false) return;
    if (b.mon.hp > 0) {
      if (b.mon.ability === 'natural-cure') b.mon.status = null;
      ev.push({ type: 'text', text: this.line('recall', this.whoOfSide(side), displayName(b.mon)) });
    }
    this.sendIn(side, i, mon, ev);
  }

  sendIn(side, i, mon, ev) {
    const sl = this.slots[side][i];
    this.place(sl, mon);
    const who = this.whoOfSide(side);
    ev.push({ type: 'pvpSwitch', who, key: SLOT_KEYS[side][i], mon: publicPokemon(mon) });
    ev.push({ type: 'text', text: this.line('send', who, displayName(mon)) });
    ev.push(...this.switchInAbility(sl.b));
  }

  faints(ev) {
    for (const side of ['foe', 'ally']) {
      for (const sl of this.slots[side]) {
        const b = sl.b;
        if (!b || b.mon.hp > 0 || b.fainted) continue;
        b.fainted = true;
        ev.push({ type: 'faint', side: this.side(b) }, { type: 'text', text: `${this.name(b)} wurde besiegt!` });
      }
    }
  }

  checkEnd(ev) {
    if (this.state === 'ended') return true;
    const doneA = this.sideDone('ally'); const doneB = this.sideDone('foe');
    if (!doneA && !doneB) return false;
    // Fallen beide gleichzeitig, gewinnt wie im Original der, dessen Pokémon zuletzt stand (hier: B verliert zuerst)
    this.winner = doneB ? 'A' : 'B';
    ev.push({ type: 'text', text: this.line('win', this.winner) });
    this.end(this.resultFor('A'), ev);
    return true;
  }

  sideDone(side) {
    const live = this.slots[side].some((s) => s.b && s.b.mon.hp > 0);
    return !live && !usable(this.slots[side][0].owner.party).some((m) => !this.inField(m));
  }

  refill(ev) {
    this.pending = { A: [], B: [] };
    for (const side of ['ally', 'foe']) {
      const who = this.whoOfSide(side);
      const owner = this.slots[side][0].owner;
      let free = usable(owner.party).filter((m) => !this.inField(m)).length;
      this.slots[side].forEach((sl, i) => {
        if (sl.closed || (sl.b && sl.b.mon.hp > 0)) return;
        if (free > 0) { this.pending[who].push(i); free--; } else sl.b = null;
      });
      if (this.pending[who].length) ev.push({ type: 'needSwitch', who, slots: this.pending[who] });
    }
    if (this.pending.A.length || this.pending.B.length) this.state = 'switch';
  }

  switchFor(who, action) {
    if (action.type !== 'switch') return { events: [], error: 'Du musst ein Pokémon einwechseln' };
    if (!this.pending[who].length) return { events: [], error: `Warte auf ${this.names[other(who)]} ...` };
    const slot = action.slot != null && this.pending[who].includes(Number(action.slot)) ? Number(action.slot) : this.pending[who][0];
    const mon = this.partyOfWho(who)[action.index];
    if (!mon || mon.egg || mon.alive === false || mon.hp <= 0) return { events: [], error: 'Dieses Pokémon kann nicht kämpfen' };
    if (this.inField(mon)) return { events: [], error: `${displayName(mon)} kämpft bereits` };
    // Wie im Original kommen die Pokémon erst ins Feld, wenn beide gewählt haben
    (this.picks ||= []).push({ who, slot, mon });
    this.pending[who] = this.pending[who].filter((x) => x !== slot);
    if (this.pending.A.length || this.pending.B.length) return { events: [], waiting: true };
    const ev = [];
    for (const p of this.picks) this.sendIn(this.sideOfWho(p.who), p.slot, p.mon, ev);
    this.picks = [];
    this.state = 'action';
    return { events: ev };
  }

  externalDeath() { return []; }
  giveExp() {}
}

// Tausch-Entwicklungen (Kadabra, Maschock, mit Item: Seemops, Onix usw.) wie im Original
export function tradeEvolve(mon) {
  const e = evoOptions(species(mon.speciesId)).find((x) => x.how === 'trade' && POKEMON[x.to] && (!x.item || mon.item === x.item));
  if (!e || mon.item === 'everstone') return null;
  const from = displayName(mon);
  if (e.item) mon.item = null;
  mon.speciesId = e.to;
  mon.ability = species(e.to).ability;
  recalc(mon);
  return `${from} hat sich zu ${species(e.to).name} entwickelt!`;
}

// ------------------------------------------------------------------ GameServer-Erweiterung
export const Link = {
  sessionAt(map, x, y, exceptId) {
    for (const t of this.sessions.values()) if (t.player.id !== exceptId && t.player.map === map && t.player.x === x && t.player.y === y) return t;
    return null;
  },
  linkBusy(t) { return !!(t.battle || t.script || t.trade || t.shop); },

  // Spieler vor sich ansprechen: Auswahl wie im Union-Raum
  talkToPlayer(s, t) {
    const inv = s.linkInvite;
    if (inv && Date.now() - inv.at <= INVITE_MS) return this.story.start(s, [[null, `Du wartest noch auf die Antwort von ${this.sessions.get(inv.target)?.player.name || 'deinem Gegenüber'} ...`]]);
    return this.story.start(s, [
      [null, `Was möchtest du mit ${t.player.name} machen?`],
      { choose: ['Einzelkampf', 'Doppelkampf', 'Tauschen', 'Abbrechen'], branches: [
        [{ x: 'linkInvite', mode: 'single', target: t.player.id }],
        [{ x: 'linkInvite', mode: 'double', target: t.player.id }],
        [{ x: 'linkInvite', mode: 'trade', target: t.player.id }],
        []
      ] }
    ]);
  },

  linkInvite(s, step, say) {
    const t = this.sessions.get(step.target);
    if (!t) return say(null, 'Der andere Spieler ist nicht mehr da.');
    const near = t.player.map === s.player.map && Math.abs(t.player.x - s.player.x) + Math.abs(t.player.y - s.player.y) <= 2;
    if (!near) return say(null, `${t.player.name} ist zu weit weg.`);
    const err = this.linkCheck(s, step.mode) || this.linkCheck(t, step.mode, t.player.name);
    if (err) return say(null, err);
    if (this.linkBusy(t)) return say(null, `${t.player.name} ist gerade beschäftigt. Versuch es gleich noch einmal.`);
    s.linkInvite = { target: t.player.id, mode: step.mode, at: Date.now() };
    say(null, `Du fragst ${t.player.name} nach einem ${MODE_DE[step.mode]}. Warte auf die Antwort ...`);
    setTimeout(() => {
      if (this.linkBusy(t)) { s.linkInvite = null; return this.notice(s, `${t.player.name} ist gerade beschäftigt.`, 'info'); }
      this.story.start(t, [
        [null, `${s.player.name} möchte ${step.mode === 'trade' ? 'mit dir tauschen' : `einen ${MODE_DE[step.mode]} gegen dich`}. Annehmen?`],
        { choose: ['Ja', 'Nein'], branches: [[{ x: 'linkAnswer', from: s.player.id, mode: step.mode, yes: true }], [{ x: 'linkAnswer', from: s.player.id, mode: step.mode, yes: false }]] }
      ]);
    }, 60);
  },

  // Wer mitmachen will, braucht kampffähige Pokémon (Doppelkampf: zwei)
  linkCheck(s, mode, who) {
    const n = usable(s.party).length;
    const pre = who ? `${who} hat` : 'Du hast';
    if (mode === 'double' && n < 2) return `${pre} keine zwei kampffähigen Pokémon.`;
    if (mode !== 'trade' && n < 1) return `${pre} keine kampffähigen Pokémon.`;
    if (mode === 'trade' && s.party.length < 2) return `${pre} nur ein Pokémon. Zum Tauschen braucht man mindestens zwei.`;
    return null;
  },

  linkAnswer(t, step, say) {
    const s = this.sessions.get(step.from);
    const inv = s?.linkInvite;
    if (!s || !inv || inv.target !== t.player.id || inv.mode !== step.mode || Date.now() - inv.at > INVITE_MS) return say(null, 'Die Anfrage ist nicht mehr gültig.');
    s.linkInvite = null;
    if (!step.yes) { this.notice(s, `${t.player.name} hat abgelehnt.`, 'info'); return; }
    const err = this.linkCheck(s, step.mode, s.player.name) || this.linkCheck(t, step.mode);
    if (err) { say(null, err); return this.notice(s, err, 'info'); }
    // Erst wenn beide Skripte zu Ende sind, beginnt der Kampf oder Tausch
    // Liest einer noch eine Textbox, kurz warten statt abzulehnen
    const begin = (tries) => {
      if (s.battle || s.trade || t.battle || t.trade || !this.sessions.has(s.player.id) || !this.sessions.has(t.player.id)) return this.notice(t, `${s.player.name} ist gerade beschäftigt.`, 'info');
      if (s.script || t.script) return tries > 0 ? setTimeout(() => begin(tries - 1), 200) : this.notice(t, `${s.player.name} ist gerade beschäftigt.`, 'info');
      if (step.mode === 'trade') this.startTrade(s, t); else this.startPvp(s, t, step.mode === 'double');
    };
    setTimeout(() => begin(25), 80);
  },

  // ---------------------------------------------------------------- Kampf
  startPvp(sa, sb, double) {
    const b = new PvpBattle({ id: crypto.randomUUID(), double,
      a: { name: sa.player.name, look: sa.player.look, party: sa.party },
      b: { name: sb.player.name, look: sb.player.look, party: sb.party } });
    b.sessions = { A: sa, B: sb };
    sa.battle = b; sb.battle = b;
    sa.battleMeta = { pvp: true }; sb.battleMeta = { pvp: true };
    const intro = b.intro();
    for (const [who, s] of [['A', sa], ['B', sb]]) {
      for (const m of b.partyOfWho(other(who))) if (!m.egg) this.dexMark(s, m.speciesId);
      this.send(s.ws, { t: S2C.BATTLE_START, state: b.snapshotFor(who), events: b.view(intro, who) });
      this.broadcastMap(s.player.map, { t: S2C.PLAYER_STATE, player: this.publicPlayer(s.player) }, s.player.id);
    }
  },

  pvpAction(s, action) {
    const b = s.battle;
    const who = b.sessions.A === s ? 'A' : 'B';
    const r = b.actFor(who, action);
    if (r.error) return this.send(s.ws, { t: S2C.BATTLE_EVENTS, events: [{ type: 'text', text: r.error }], state: b.snapshotFor(who), error: true });
    if (r.waiting) return this.send(s.ws, { t: S2C.BATTLE_EVENTS, events: [{ type: 'text', text: `Warte auf ${b.names[other(who)]} ...` }], state: b.snapshotFor(who) });
    for (const w of ['A', 'B']) {
      const ss = b.sessions[w];
      if (ss.battle !== b) continue;
      const events = b.view(r.events, w);
      for (const e of events) if (e.type === 'foeSwitch') this.dexMark(ss, e.mon.speciesId);
      this.send(ss.ws, { t: S2C.BATTLE_EVENTS, events, state: b.snapshotFor(w) });
    }
    if (b.state === 'ended') this.finishPvp(b);
  },

  // Verbindung weg: der andere gewinnt
  pvpLeave(s) {
    const b = s.battle;
    const who = b.sessions.A === s ? 'A' : 'B';
    if (b.state !== 'ended') {
      b.winner = other(who);
      const ev = b.end(b.resultFor('A'), [{ type: 'text', text: b.line('gone', who) }]);
      const o = b.sessions[other(who)];
      if (o.battle === b) this.send(o.ws, { t: S2C.BATTLE_EVENTS, events: b.view(ev, other(who)), state: b.snapshotFor(other(who)) });
    }
    this.finishPvp(b);
  },

  finishPvp(b) {
    for (const w of ['A', 'B']) {
      const s = b.sessions[w];
      if (s.battle !== b) continue;
      s.battle = null; s.battleMeta = null;
      const res = b.resultFor(w);
      const msgs = ['Die Pokémon sind wieder so fit wie vor dem Kampf.'];
      if (res === 'win') { s.player.pvpWins = (s.player.pvpWins || 0) + 1; }
      if (res === 'lose') { s.player.pvpLosses = (s.player.pvpLosses || 0) + 1; }
      this.send(s.ws, { t: S2C.BATTLE_END, result: res, messages: msgs, pvp: true });
      this.sendParty(s);
      this.savePlayerNow(s);
      this.broadcastMap(s.player.map, { t: S2C.PLAYER_STATE, player: this.publicPlayer(s.player) }, s.player.id);
    }
  },

  // ---------------------------------------------------------------- Tausch
  startTrade(sa, sb) {
    const tr = { id: crypto.randomUUID(), s: { A: sa, B: sb }, offer: { A: null, B: null }, ok: { A: false, B: false } };
    sa.trade = tr; sb.trade = tr;
    this.sendTrade(tr);
  },
  tradeWho(s) { return s.trade.s.A === s ? 'A' : 'B'; },
  sendTrade(tr, extra = {}) {
    for (const w of ['A', 'B']) {
      const s = tr.s[w]; const o = tr.s[other(w)];
      const theirs = tr.offer[other(w)] && o.party.find((m) => m.id === tr.offer[other(w)]);
      this.send(s.ws, { t: S2C.TRADE, open: true, partner: o.player.name, mine: tr.offer[w], theirs: theirs ? publicPokemon(theirs) : null, okMine: tr.ok[w], okTheirs: tr.ok[other(w)], ...extra });
    }
  },
  tradeMsg(s, msg) {
    const tr = s.trade;
    if (!tr) return;
    const w = this.tradeWho(s);
    if (msg.op === 'cancel') return this.endTrade(tr, `${s.player.name} hat den Tausch abgebrochen.`);
    if (msg.op === 'offer') {
      const mon = s.party.find((m) => m.id === msg.pokemonId);
      if (!mon) return;
      if (mon.alive === false) return this.notice(s, 'Ein totes Pokémon kann nicht getauscht werden.', 'error');
      tr.offer[w] = mon.id; tr.ok = { A: false, B: false };
      return this.sendTrade(tr);
    }
    if (msg.op === 'confirm') {
      if (!tr.offer.A || !tr.offer.B) return;
      tr.ok[w] = true;
      if (!(tr.ok.A && tr.ok.B)) return this.sendTrade(tr);
      return this.doTrade(tr);
    }
  },
  doTrade(tr) {
    const { A: sa, B: sb } = tr.s;
    const ia = sa.party.findIndex((m) => m.id === tr.offer.A); const ib = sb.party.findIndex((m) => m.id === tr.offer.B);
    if (ia < 0 || ib < 0) return this.endTrade(tr, 'Der Tausch hat nicht geklappt.');
    const ma = sa.party[ia]; const mb = sb.party[ib];
    // Niemand darf ohne kampffähiges Pokémon dastehen
    const left = (party, idx, incoming) => usable(party.filter((_, i) => i !== idx)).length + (usable([incoming]).length);
    if (left(sa.party, ia, mb) < 1 || left(sb.party, ib, ma) < 1) { tr.ok = { A: false, B: false }; this.sendTrade(tr, { text: 'Nach dem Tausch hätte jemand kein kampffähiges Pokémon mehr.' }); return; }
    const give = (mon, to) => { mon.ot ||= mon.ownerId && mon.ownerId !== to.player.id ? this.repo.getPlayer(mon.ownerId)?.name || null : null; mon.ownerId = to.player.id; mon.runId = to.player.runId; };
    give(ma, sb); give(mb, sa);
    sa.party[ia] = mb; sb.party[ib] = ma;
    const texts = { A: [`Du hast ${displayName(ma)} gegen ${displayName(mb)} getauscht!`], B: [`Du hast ${displayName(mb)} gegen ${displayName(ma)} getauscht!`] };
    for (const [w, s, mon] of [['A', sa, mb], ['B', sb, ma]]) {
      const evo = tradeEvolve(mon);
      if (evo) texts[w].push(evo);
      this.dexMark(s, mon.speciesId, true);
      this.reslot(s); this.repo.savePokemon(mon); this.saveMons(s); this.savePlayerNow(s); this.sendParty(s);
      this.sendProgress(s);
    }
    for (const w of ['A', 'B']) this.send(tr.s[w].ws, { t: S2C.TRADE, open: false, done: true, texts: texts[w] });
    sa.trade = null; sb.trade = null;
  },
  endTrade(tr, text) {
    for (const w of ['A', 'B']) { const s = tr.s[w]; if (s.trade === tr) { s.trade = null; this.send(s.ws, { t: S2C.TRADE, open: false, text }); } }
  }
};
