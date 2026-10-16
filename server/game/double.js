// Echte Doppelkämpfe wie in Platin: zwei gegen zwei, mit Zielwahl, Flächenattacken und
// Partnern (Heide, Mira, Urs, Barry, Buck oder Kampfturm-Partner), die von der KI gesteuert werden.
// Baut auf der Wildkampf-Engine auf und nutzt deren Attackenlogik (beforeMove, hitTarget).
import { MOVES } from '../../shared/data/moves.js';
import { typeEffectiveness, BALLS, ballBonus, catchAttempt, escapeAttempt } from '../../shared/formulas.js';
import { ITEMS, applyItem, heldOf } from '../../shared/data/items.js';
import { species, displayName, publicPokemon } from './pokemonFactory.js';
import { WildBattle, makeBattler } from './battle.js';
import { ALL_FOES, ALL_OTHERS, isSelfMove } from '../../shared/data/targets.js';

const rnd = (n) => Math.floor(Math.random() * n);
const SLOT_KEYS = { ally: ['ally', 'ally2'], foe: ['foe', 'foe2'] };

export class DoubleBattle extends WildBattle {
  /**
   * @param {object} o wie WildBattle, dazu:
   *   kind: 'wild' | 'trainer'
   *   wilds: [mon, mon?] wilde Pokémon (kind wild)
   *   foes: [{ name, cls, look, leader, party }] ein oder zwei gegnerische Trainer (kind trainer)
   *   partner: { name, party: [mon] } von der KI gesteuert, kämpft im zweiten Platz
   */
  constructor(o) {
    const firstFoe = o.kind === 'wild' ? o.wilds[0] : o.foes[0].party[0];
    super({ ...o, wild: firstFoe, partner: null, catchable: o.kind === 'wild' ? o.catchable : false, catchBlockReason: o.kind === 'wild' ? o.catchBlockReason : 'Man darf die Pokémon anderer Trainer nicht fangen!' });
    this.double = true;
    this.kind = o.kind;
    this.expBonus = o.kind === 'trainer' ? 1.5 : 1;
    const me = { name: null, party: this.party, player: true };
    this.partnerOwner = o.partner ? { name: o.partner.name, party: o.partner.party, ai: true } : null;
    this.partner = o.partner ? { name: o.partner.name } : null;
    const allyOwners = this.partnerOwner ? [me, this.partnerOwner] : [me, me];
    let foeOwners;
    if (o.kind === 'wild') { const w = { name: null, party: o.wilds.filter(Boolean), ai: true, wild: true }; foeOwners = [w, w]; this.foeTrainers = []; }
    else { this.foeTrainers = o.foes.map((t) => ({ ...t, ai: true })); foeOwners = this.foeTrainers.length > 1 ? this.foeTrainers : [this.foeTrainers[0], this.foeTrainers[0]]; }
    this.trainer = o.kind === 'trainer' ? this.trainerInfo() : null;
    this.slots = { ally: allyOwners.map((owner) => ({ owner, b: null })), foe: foeOwners.map((owner) => ({ owner, b: null })) };
    for (const side of ['ally', 'foe']) for (const sl of this.slots[side]) { const m = this.nextMon(sl.owner); if (m) this.place(sl, m); }
    this.participants = new Set(this.mine().map((b) => b.mon.id));
    this.pendingSwitch = [];
    this.caughtB = null;
  }

  // Alte Schnittstelle (game.js, Story): ally und wild zeigen auf das jeweils erste Pokémon im Feld
  get ally() { return this.slots?.ally.find((s) => s.b)?.b || this._ally; }
  set ally(v) { this._ally = v; }
  get wild() { return this.caughtB || this.slots?.foe.find((s) => s.b)?.b || this._wild; }
  set wild(v) { this._wild = v; }
  get foeParty() { return this.slots.foe.map((s) => s.owner).filter((o, i, a) => a.indexOf(o) === i).flatMap((o) => o.party); }
  get trainerName() { return this.trainer?.name; }

  trainerInfo() {
    const names = this.foeTrainers.map((t) => (t.cls ? `${t.cls} ${t.name}` : t.name));
    const t = this.foeTrainers[0];
    // Trainerpaar (Zwillinge, Junges Glück ...): ein Trainer mit zwei Personen, eigene Kampfbilder in looks
    const looks = this.foeTrainers.length === 1 && t.looks ? t.looks : this.foeTrainers.map((x) => x.look);
    return { name: names.join(' und '), look: t.look, cls: t.cls, leader: !!t.leader, looks, count: this.foeTrainers.length, pair: !!t.pair };
  }
  ownerName(owner) { return owner.cls ? `${owner.cls} ${owner.name}` : owner.name; }

  // ---------------------------------------------------------------- Plätze
  active(side) { return this.slots[side].filter((s) => s.b && s.b.mon.hp > 0).map((s) => s.b); }
  all() { return [...this.active('ally'), ...this.active('foe')]; }
  mine() { return this.slots.ally.filter((s) => s.owner.player && s.b && s.b.mon.hp > 0).map((s) => s.b); }
  slotOf(b) { for (const side of ['ally', 'foe']) { const i = this.slots[side].findIndex((s) => s.b === b); if (i >= 0) return [side, i]; } return [null, -1]; }
  sideOf(b) { return this.slotOf(b)[0]; }
  isAlly(b) { return this.sideOf(b) === 'ally'; }
  side(b) { const [side, i] = this.slotOf(b); return side ? SLOT_KEYS[side][i] : 'foe'; }
  foesOf(b) { return this.active(this.isAlly(b) ? 'foe' : 'ally'); }
  partnerOf(b) { const side = this.sideOf(b); return this.active(side).find((x) => x !== b) || null; }
  other(b) { return this.foesOf(b)[0] || b; }
  battlerOfMon(p) { return this.all().find((b) => b.mon === p) || null; }
  isMine(b) { const [side, i] = this.slotOf(b); return side === 'ally' && this.slots.ally[i].owner.player; }
  inField(mon) { return Object.values(this.slots).some((list) => list.some((s) => s.b?.mon === mon)); }
  nextMon(owner) { return owner.party.find((m) => !m.egg && m.alive !== false && m.hp > 0 && !this.inField(m)); }
  place(sl, mon) { sl.b = makeBattler(mon); sl.b.seen = new Set(); }
  ownerHasMore(owner) { return !!this.nextMon(owner); }
  sideDone(side) { return !this.active(side).length && !this.slots[side].some((s) => this.ownerHasMore(s.owner)); }

  name(b) {
    if (this.isAlly(b)) return displayName(b.mon);
    return `${this.kind === 'wild' ? 'Das wilde' : 'Das gegnerische'} ${displayName(b.mon)}`;
  }
  get foeAdj() { return this.kind === 'wild' ? 'wild' : 'gegnerisch'; }

  // ---------------------------------------------------------------- Darstellung
  snapshot() {
    const pub = (side, i) => {
      const b = this.slots[side][i].b;
      if (!b || b.mon.hp <= 0 && b.fainted) return null;
      const p = { ...publicPokemon(b.mon), stages: b.stages, owner: this.slots[side][i].owner.player ? null : this.slots[side][i].owner.name };
      if (side === 'foe') { delete p.moves; delete p.stats; }
      if (side === 'ally' && !this.slots.ally[i].owner.player) delete p.stats;
      return p;
    };
    const control = this.slots.ally.map((s) => !!s.owner.player);
    return {
      id: this.id, state: this.state, kind: this.kind, double: true, catchable: this.catchable && this.active('foe').length === 1,
      ally: pub('ally', 0), ally2: pub('ally', 1), foe: pub('foe', 0), foe2: pub('foe', 1),
      control, partnerName: this.partnerOwner?.name || null, pending: this.pendingSwitch,
      party: this.party.map(publicPokemon),
      balls: Object.fromEntries(Object.keys(BALLS).map((k) => [k, this.items[k] || 0])),
      bag: Object.fromEntries(Object.entries(ITEMS).filter(([k, it]) => (it.kind === 'med' || it.kind === 'battle') && !it.candy && !it.ev && !it.ppUp && this.items[k] > 0).map(([k, it]) => [k, { name: it.name, count: this.items[k], kind: it.kind, pp: !!it.pp && !it.all }])),
      trainer: this.trainer,
      foeTeam: this.kind === 'trainer' ? this.foeParty.map((m) => (m.hp > 0 ? 'ok' : 'down')) : undefined,
      shiftOffer: false
    };
  }

  intro() {
    const ev = [];
    if (this.kind === 'wild') {
      const w = this.active('foe');
      ev.push({ type: 'text', text: w.length > 1 ? `Ein wildes ${displayName(w[0].mon)} und ein wildes ${displayName(w[1].mon)} erscheinen!` : `Ein wildes ${displayName(w[0].mon)} erscheint!` });
      if (!this.catchable) ev.push({ type: 'text', text: this.catchBlockReason });
    } else {
      const many = this.foeTrainers.length > 1 || this.trainer.pair;
      ev.push({ type: 'text', text: `${this.trainer.name} ${many ? 'möchten' : 'möchte'} kämpfen!` });
      const byOwner = new Map();
      for (const s of this.slots.foe) if (s.b) byOwner.set(s.owner, [...(byOwner.get(s.owner) || []), s.b]);
      for (const [o, list] of byOwner) ev.push({ type: 'text', text: `${this.ownerName(o)} ${o.pair ? 'schicken' : 'schickt'} ${list.map((b) => displayName(b.mon)).join(' und ')} in den Kampf!` });
    }
    const mine = this.mine();
    if (this.partnerOwner) {
      const pb = this.slots.ally[1].b;
      if (pb) ev.push({ type: 'text', text: `${this.partnerOwner.name} schickt ${displayName(pb.mon)} in den Kampf!` });
    }
    ev.push({ type: 'text', text: `Los, ${mine.map((b) => displayName(b.mon)).join(' und ')}!` });
    for (const b of this.all()) ev.push(...this.switchInAbility(b));
    this.markSeen();
    return ev;
  }

  switchInAbility(b) {
    const ev = [];
    if (b.mon.ability === 'intimidate') {
      ev.push({ type: 'text', text: `Bedroher von ${this.nameDat(b)}!` });
      for (const t of this.foesOf(b)) this.changeStages(t, { atk: -1 }, ev, b);
    }
    return ev;
  }

  // Jedes Pokémon im Feld merkt sich, wer gegen es gekämpft hat (für die Erfahrung)
  markSeen() { for (const f of this.active('foe')) for (const m of this.mine()) f.seen.add(m.mon.id); }

  // ---------------------------------------------------------------- Aktionen
  act(action) {
    if (this.state === 'ended') return { events: [], error: 'Kampf ist beendet' };
    const ev = [];
    if (this.state === 'switch') return this.actSwitch(action);

    // Aktionen des Spielers je eigenem Platz (Platz 0 und, ohne Partner, Platz 1)
    const list = action.type === 'multi' && Array.isArray(action.actions) ? action.actions : [action];
    const plan = [];
    const chosenSwitch = new Set();
    for (let i = 0; i < 2; i++) {
      const sl = this.slots.ally[i];
      if (!sl.owner.player || !sl.b || sl.b.mon.hp <= 0) continue;
      const a = list.find((x) => Number(x?.slot) === i) || (list.length === 1 && i === this.firstOwnSlot() ? list[0] : null) || this.defaultAction(sl.b);
      const err = this.validate(sl.b, a, i, chosenSwitch);
      if (err) return { events: [], error: err };
      plan.push({ b: sl.b, a, slot: i });
    }
    // Flucht und Bälle wirken sofort für das ganze Team
    const run = plan.find((p) => p.a.type === 'run');
    if (run) {
      if (this.kind !== 'wild') return { events: [{ type: 'text', text: 'Vor einem Trainerkampf kann man nicht fliehen!' }] };
      this.turnStart();
      this.escapeAttempts++;
      const fastest = Math.max(...this.active('foe').map((b) => this.effSpeed(b)));
      const ok = run.b.mon.ability === 'run-away' || heldOf(run.b.mon)?.flee || escapeAttempt(this.effSpeed(run.b), fastest, this.escapeAttempts);
      if (ok) { ev.push({ type: 'text', text: 'Du bist entkommen!' }); return { events: this.end('fled', ev) }; }
      ev.push({ type: 'text', text: 'Flucht gescheitert!' });
      return this.runTurn([], ev);
    }
    const ball = plan.find((p) => p.a.type === 'ball');
    if (ball) {
      if (this.kind !== 'wild') return { events: [{ type: 'text', text: 'Der Trainer blockt den Ball ab. Man darf fremde Pokémon nicht fangen!' }] };
      const foes = this.active('foe');
      if (foes.length > 1) return { events: [{ type: 'text', text: 'Da sind zwei Pokémon! Du kannst nicht richtig zielen!' }] };
      if (!this.catchable) return { events: [{ type: 'text', text: this.catchBlockReason }] };
      const def = BALLS[ball.a.ball];
      if (!def) return { events: [], error: 'Unbekannter Ball' };
      if (!this.items[ball.a.ball]) return { events: [{ type: 'text', text: `Du hast keine ${def.name}s mehr.` }] };
      this.turnStart();
      this.items[ball.a.ball]--;
      const t = foes[0]; const w = t.mon; const sp = species(w.speciesId);
      ev.push({ type: 'text', text: `Du wirfst einen ${def.name}!` });
      const bonus = ballBonus(ball.a.ball, { ...this.ballCtx, types: sp.types, level: w.level, turn: this.turn, caught: !!this.ballCtx?.caught?.[sp.id] });
      const r = catchAttempt({ maxHp: w.stats.hp, hp: w.hp, catchRate: sp.catchRate, ballBonus: bonus, status: w.status });
      ev.push({ type: 'shake', count: r.shakes, caught: r.caught, ball: ball.a.ball, side: this.side(t) });
      if (r.caught) {
        ev.push({ type: 'text', text: `Toll! ${displayName(w)} wurde gefangen!` });
        w.metRoute = this.route; w.ball = ball.a.ball;
        if (def.heal) { w.hp = w.stats.hp; w.status = null; for (const m of w.moves) m.pp = m.maxPp; }
        this.caughtB = t;
        return { events: this.end('caught', ev) };
      }
      ev.push({ type: 'text', text: ['Oh nein! Es hat sich befreit!', 'Mist! Fast hätte es geklappt!', 'Argh! Beinahe!', 'Verflixt! Es war so knapp!'][r.shakes] });
      return this.runTurn(plan.filter((p) => p !== ball), ev);
    }
    this.turnStart();
    return this.runTurn(plan, ev);
  }

  firstOwnSlot() { return this.slots.ally.findIndex((s) => s.owner.player && s.b && s.b.mon.hp > 0); }

  defaultAction(b) {
    const i = b.mon.moves.findIndex((m) => m.pp > 0);
    return { type: 'move', index: Math.max(0, i) };
  }

  validate(b, a, slot, chosenSwitch) {
    if (!a || !a.type) return 'Ungültige Aktion';
    if (a.type === 'move') {
      const usable = b.mon.moves.some((m) => m.pp > 0);
      const mv = b.mon.moves[a.index];
      if (usable && (!mv || mv.pp <= 0)) return 'Keine AP mehr fuer diese Attacke';
      const lock = this.choiceLock(b);
      if (usable && lock && mv.id !== lock) return `Wegen ${this.itemName(b)} geht nur ${MOVES[lock].name}!`;
      return null;
    }
    if (a.type === 'switch') {
      const mon = this.party[a.index];
      if (!mon || mon.egg) return 'Ungueltiger Slot';
      if (mon.alive === false || mon.hp <= 0) return `${displayName(mon)} kann nicht kaempfen`;
      if (this.inField(mon) || chosenSwitch.has(a.index)) return `${displayName(mon)} kaempft bereits`;
      if (b.vol.trap > 0) return `${displayName(b.mon)} kann nicht ausgewechselt werden!`;
      chosenSwitch.add(a.index);
      return null;
    }
    if (a.type === 'item') {
      const it = ITEMS[a.item];
      if (!it || !(it.kind === 'med' || it.kind === 'battle') || it.candy || it.ev || it.ppUp) return 'Ungültiger Gegenstand';
      if (!this.items[a.item]) return `Du hast keinen ${it.name} mehr.`;
      return null;
    }
    if (a.type === 'run' || a.type === 'ball') return slot === this.firstOwnSlot() ? null : 'Das geht nur mit dem ersten Pokémon.';
    return 'Unbekannte Aktion';
  }

  turnStart() {
    this.turn++;
    for (const b of this.all()) { b.vol.hitThisTurn = false; b.vol.flinch = false; b.vol.endure = false; b.moved = false; }
  }

  // ---------------------------------------------------------------- KI
  // Schadensschätzung für die Wahl von Attacke und Ziel
  score(user, mv, target) {
    if (!mv || !target) return 0;
    if (mv.cat === 'status') return mv.simplified ? 1 : 15 + Math.random() * 15;
    const eff = mv.type === '???' ? 1 : typeEffectiveness(mv.type, species(target.mon.speciesId).types);
    const stab = species(user.mon.speciesId).types.includes(mv.type) ? 1.5 : 1;
    const spread = ALL_FOES.has(mv.id) || ALL_OTHERS.has(mv.id) ? 1.4 : 1;
    const hurtsAlly = ALL_OTHERS.has(mv.id) && this.partnerOf(user) ? 0.5 : 1;
    return (mv.power || 40) * eff * stab * spread * hurtsAlly * ((mv.acc ?? 100) / 100) * (0.85 + Math.random() * 0.3);
  }
  aiAction(b) {
    const usable = b.mon.moves.filter((m) => m.pp > 0);
    const foes = this.foesOf(b);
    if (!usable.length) return { type: 'move', id: 'struggle', target: foes[0] };
    const lock = this.choiceLock(b);
    const options = [];
    for (const m of usable) {
      if (lock && m.id !== lock) continue;
      const mv = MOVES[m.id];
      for (const t of foes) options.push({ id: m.id, target: t, s: this.score(b, mv, t) });
    }
    if (!options.length) return { type: 'move', id: usable[0].id, target: foes[0] };
    options.sort((x, y) => y.s - x.s);
    // Wilde Pokémon wählen zufällig, Trainer und Partner meist die beste Option
    const wild = this.kind === 'wild' && !this.isAlly(b);
    const pick = wild ? options[rnd(options.length)] : Math.random() < 0.85 ? options[0] : options[rnd(options.length)];
    return { type: 'move', id: pick.id, target: pick.target };
  }

  // ---------------------------------------------------------------- Runde
  runTurn(plan, ev) {
    const queue = [];
    for (const p of plan) {
      if (p.a.type === 'move') {
        const usable = p.b.mon.moves.some((m) => m.pp > 0);
        const id = usable ? p.b.mon.moves[p.a.index].id : 'struggle';
        queue.push({ b: p.b, kind: 'move', id, target: this.targetFromKey(p.b, p.a.target) });
      } else queue.push({ b: p.b, kind: p.a.type, a: p.a });
    }
    for (const b of this.all()) {
      if (this.isMine(b)) continue;
      const a = this.aiAction(b);
      queue.push({ b, kind: 'move', id: a.id, target: a.target });
    }
    // Wechsel und Items zuerst, dann Attacken nach Priorität, Flinkklaue und Initiative
    const rank = (q) => q.kind === 'switch' ? 7 : q.kind === 'item' ? 6 : MOVES[q.id]?.prio || 0;
    for (const q of queue) { q.rank = rank(q); q.quick = q.kind === 'move' ? this.quickRoll(q.b) : 0; q.speed = this.effSpeed(q.b); q.tie = Math.random(); }
    queue.sort((x, y) => y.rank - x.rank || y.quick - x.quick || y.speed - x.speed || y.tie - x.tie);

    for (const q of queue) {
      if (this.state === 'ended') break;
      if (q.b.mon.hp <= 0 || !this.sideOf(q.b)) continue;
      if (q.kind === 'switch') this.switchSlot(q.b, q.a.index, ev);
      else if (q.kind === 'item') this.useBagItem(q.b, q.a, ev);
      else this.doMove(q.b, q.id, q.target, ev);
      q.b.moved = true;
      this.faints(ev);
      if (this.checkEnd(ev)) return { events: ev };
    }
    if (this.state !== 'ended') {
      this.endOfTurn(ev);
      this.faints(ev);
      if (this.checkEnd(ev)) return { events: ev };
      this.refill(ev);
      this.markSeen();
    }
    // Hat der Spieler nichts mehr im Feld, aber der Partner kämpft noch: Runden laufen allein weiter
    let guard = 0;
    while (this.state === 'action' && !this.mine().length && this.active('ally').length && guard++ < 40) {
      this.turnStart();
      const r = this.runTurn([], ev);
      if (r.error) break;
    }
    return { events: ev };
  }

  targetFromKey(user, key) {
    const all = this.all();
    const t = key ? all.find((b) => this.side(b) === key) : null;
    return t || null;
  }

  doMove(user, moveId, target, ev) {
    const move = MOVES[moveId];
    const foes = this.foesOf(user);
    if (!foes.length && !isSelfMove(move)) return;
    let targets;
    if (isSelfMove(move)) targets = [user];
    else if (ALL_FOES.has(moveId)) targets = foes;
    else if (ALL_OTHERS.has(moveId)) targets = [...foes, ...(this.partnerOf(user) ? [this.partnerOf(user)] : [])];
    else {
      // Gewähltes Ziel; ist es schon besiegt, trifft die Attacke den anderen Gegner
      const t = target && target !== user && target.mon.hp > 0 && this.sideOf(target) ? target : null;
      if (!t && !foes.length) return;
      targets = [t || foes[rnd(foes.length)]];
    }
    if (!this.beforeMove(user, moveId, move, ev, targets[0])) return;
    this.spreadHit = targets.length > 1;
    for (const t of targets) {
      if (this.state === 'ended' || user.mon.hp <= 0) break;
      if (t.mon.hp <= 0) continue;
      this.hitTarget(user, t, move, ev, !t.moved);
    }
    this.spreadHit = false;
  }

  // Im Doppelkampf beenden Teleport, Wirbelwind und Brüllen nichts
  applyStatusMove(user, target, move, ev) {
    if (move.effect?.kind === 'escape') { ev.push({ type: 'text', text: 'Es schlug fehl!' }); return; }
    super.applyStatusMove(user, target, move, ev);
  }

  useBagItem(b, a, ev) {
    const it = ITEMS[a.item];
    if (!this.items[a.item]) return;
    if (it.kind === 'battle') {
      if ((it.stage && b.stages[it.stage] >= 6) || (it.crit && b.vol.focus)) { ev.push({ type: 'text', text: 'Es hätte keine Wirkung.' }); return; }
      this.items[a.item]--;
      ev.push({ type: 'text', text: `Du setzt ${it.name} ein.` });
      if (it.stage) this.changeStages(b, { [it.stage]: 1 }, ev, b);
      if (it.crit) { b.vol.focus = true; ev.push({ type: 'text', text: `${this.name(b)} ist in Topform!` }); }
      if (it.mist) { for (const x of this.active('ally')) x.vol.mist = 5; ev.push({ type: 'text', text: 'Megablock hüllt dein Team ein!' }); }
      return;
    }
    const mon = this.party[a.index];
    if (!mon) return;
    const r = applyItem(a.item, mon, displayName(mon), { nuzlocke: this.nuzlocke, moveIndex: Number(a.moveIndex) || 0, moveBasePp: (id) => MOVES[id]?.pp, moveName: (id) => MOVES[id]?.name });
    if (!r.ok) { ev.push({ type: 'text', text: r.text }); return; }
    this.items[a.item]--;
    ev.push({ type: 'text', text: `Du setzt ${it.name} ein.` }, { type: 'text', text: r.text });
    const fb = this.battlerOfMon(mon);
    if (fb) ev.push({ type: 'hp', side: this.side(fb), hp: mon.hp, maxHp: mon.stats.hp, damage: 0 }, this.statusEvent(fb));
  }

  switchSlot(b, index, ev) {
    const [side, i] = this.slotOf(b);
    const mon = this.party[index];
    if (!side || !mon || this.inField(mon) || mon.hp <= 0 || mon.alive === false) return;
    if (b.mon.hp > 0) {
      if (b.mon.ability === 'natural-cure') b.mon.status = null;
      ev.push({ type: 'text', text: `${displayName(b.mon)}, komm zurück!` });
    }
    this.sendIn(side, i, mon, ev, true);
  }

  sendIn(side, i, mon, ev, own) {
    const sl = this.slots[side][i];
    this.place(sl, mon);
    const key = SLOT_KEYS[side][i];
    if (side === 'ally') {
      if (sl.owner.player) this.participants.add(mon.id);
      ev.push({ type: 'switch', side: key, mon: publicPokemon(mon) });
      ev.push({ type: 'text', text: sl.owner.player ? `Los, ${displayName(mon)}!` : `${sl.owner.name} schickt ${displayName(mon)} in den Kampf!` });
    } else {
      ev.push({ type: 'text', text: this.kind === 'wild' ? `Ein wildes ${displayName(mon)} erscheint!` : `${this.ownerName(sl.owner)} schickt ${displayName(mon)} in den Kampf!` });
      ev.push({ type: 'foeSwitch', side: key, mon: { ...publicPokemon(mon), moves: undefined, stats: undefined } });
    }
    ev.push(...this.switchInAbility(sl.b));
    if (own !== undefined) this.markSeen();
  }

  // Besiegte Pokémon verlassen das Feld
  faints(ev) {
    for (const side of ['foe', 'ally']) {
      for (const sl of this.slots[side]) {
        const b = sl.b;
        if (!b || b.mon.hp > 0 || b.fainted) continue;
        b.fainted = true;
        ev.push({ type: 'faint', side: this.side(b) }, { type: 'text', text: `${this.name(b)} wurde besiegt!` });
        if (side === 'foe') this.awardFor(b, ev);
        else if (sl.owner.player) ev.push(...(this.onFaint ? this.onFaint(b.mon) : []));
      }
    }
  }

  awardFor(foe, ev) {
    const parts = this.party.filter((p) => foe.seen.has(p.id) && p.alive !== false && p.hp > 0);
    this.giveExp(parts, foe.mon, ev);
  }

  checkEnd(ev) {
    if (this.state === 'ended') return true;
    if (this.sideDone('foe')) {
      if (this.kind === 'trainer') ev.push({ type: 'text', text: `Du hast ${this.trainer.name} besiegt!` });
      this.end('win', ev);
      return true;
    }
    if (this.sideDone('ally') || !this.party.some((p) => !p.egg && p.alive !== false && p.hp > 0) && !this.partnerOwner) {
      ev.push({ type: 'text', text: 'Du hast keine kampffähigen Pokémon mehr!' });
      this.end('lose', ev);
      return true;
    }
    return false;
  }

  // Am Rundenende rücken neue Pokémon nach: Gegner und Partner sofort, der Spieler wählt selbst
  refill(ev) {
    for (const side of ['foe', 'ally']) {
      this.slots[side].forEach((sl, i) => {
        if (sl.b && sl.b.mon.hp > 0) return;
        if (side === 'ally' && sl.owner.player) return;
        const m = this.nextMon(sl.owner);
        if (m) this.sendIn(side, i, m, ev);
        else if (sl.b) sl.b = null;
      });
    }
    this.pendingSwitch = [];
    const free = this.party.filter((m) => !m.egg && m.alive !== false && m.hp > 0 && !this.inField(m)).length;
    this.slots.ally.forEach((sl, i) => {
      if (!sl.owner.player || (sl.b && sl.b.mon.hp > 0)) return;
      if (this.pendingSwitch.length < free) this.pendingSwitch.push(i);
      else sl.b = null;
    });
    if (this.pendingSwitch.length) { this.state = 'switch'; ev.push({ type: 'needSwitch', slots: this.pendingSwitch }); }
  }

  actSwitch(action) {
    if (action.type !== 'switch') return { events: [], error: 'Du musst ein Pokemon einwechseln' };
    const slot = action.slot != null && this.pendingSwitch.includes(Number(action.slot)) ? Number(action.slot) : this.pendingSwitch[0];
    const mon = this.party[action.index];
    if (!mon || mon.egg || mon.alive === false || mon.hp <= 0) return { events: [], error: 'Dieses Pokémon kann nicht kämpfen' };
    if (this.inField(mon)) return { events: [], error: `${displayName(mon)} kämpft bereits` };
    const ev = [];
    this.sendIn('ally', slot, mon, ev, true);
    this.pendingSwitch = this.pendingSwitch.filter((x) => x !== slot);
    if (!this.pendingSwitch.length) this.state = 'action';
    return { events: ev };
  }

  endOfTurn(ev) {
    for (const b of this.active('ally')) if (b.vol.mist > 0 && --b.vol.mist === 0) ev.push({ type: 'text', text: 'Megablock hat keine Wirkung mehr.' });
    for (const b of this.all()) {
      if (this.state === 'ended' || b.mon.hp <= 0) continue;
      const max = b.mon.stats.hp;
      if (b.mon.status === 'brn') { ev.push({ type: 'text', text: `${this.name(b)} wird durch Verbrennungen geschwächt!` }); this.applyDamage(b, Math.max(1, Math.floor(max / 8)), ev); }
      if (b.mon.status === 'psn') { ev.push({ type: 'text', text: `${this.name(b)} wird durch Gift geschwächt!` }); this.applyDamage(b, Math.max(1, Math.floor(max / 8)), ev); }
      if (b.mon.status === 'tox') { ev.push({ type: 'text', text: `${this.name(b)} wird durch Gift geschwächt!` }); this.applyDamage(b, Math.max(1, Math.floor((max * b.vol.toxic) / 16)), ev); b.vol.toxic++; }
      if (b.vol.leechSeed && b.mon.hp > 0) {
        const d = this.applyDamage(b, Math.max(1, Math.floor(max / 8)), ev);
        const o = this.foesOf(b)[0];
        if (o && o.mon.hp > 0) this.heal(o, d, ev, `Egelsamen saugt ${this.nameDat(b)} Energie ab!`);
      }
      if (b.vol.trap > 0 && b.mon.hp > 0) {
        b.vol.trap--;
        ev.push({ type: 'text', text: `${this.name(b)} ist gefangen!` });
        this.applyDamage(b, Math.max(1, Math.floor(max / 16)), ev);
        if (b.vol.trap === 0) ev.push({ type: 'text', text: `${this.name(b)} wurde befreit!` });
      }
      if (b.mon.ability === 'shed-skin' && b.mon.status && Math.random() < 0.3) {
        b.mon.status = null;
        ev.push({ type: 'text', text: `${this.name(b)} heilt sich durch Expidermis!` }, this.statusEvent(b));
      }
      this.heldEndOfTurn(b, ev);
    }
  }

  // Seelenband: ein eigenes Pokémon stirbt außerhalb dieses Kampfes
  externalDeath(pokemonId, text) {
    const ev = [];
    if (this.state === 'ended') return ev;
    const mon = this.party.find((p) => p.id === pokemonId);
    if (!mon) return ev;
    mon.hp = 0;
    ev.push({ type: 'text', text });
    const b = this.battlerOfMon(mon);
    if (b) {
      ev.push({ type: 'hp', side: this.side(b), hp: 0, maxHp: mon.stats.hp, damage: 0 });
      b.fainted = true;
      ev.push({ type: 'faint', side: this.side(b) });
      if (!this.checkEnd(ev) && this.state === 'action') this.refill(ev);
    }
    return ev;
  }
}
