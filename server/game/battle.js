// Rundenbasierte Wildkampf-Engine nach Generation-4-Regeln (serverautoritativ).
// Der Client sendet nur Aktionen, der Server berechnet alles und liefert Ereignisse.
import { MOVES } from '../../shared/data/moves.js';
import { TYPE_NAMES_DE } from '../../shared/data/types.js';
import {
  calcDamage, typeEffectiveness, stageMultiplier, accStageMultiplier, critChance,
  catchAttempt, BALLS, ballBonus, expGain, escapeAttempt
} from '../../shared/formulas.js';
import { species, displayName, addExp, gainEvs, publicPokemon } from './pokemonFactory.js';
import { ITEMS, applyItem, heldOf } from '../../shared/data/items.js';

const rnd = (n) => Math.floor(Math.random() * n);
const chance = (pct) => Math.random() * 100 < pct;
const STAT_DE = { atk: 'Angriff', def: 'Verteidigung', spa: 'Spezial-Angriff', spd: 'Spezial-Verteidigung', spe: 'Initiative', acc: 'Genauigkeit', eva: 'Fluchtwert' };
const STATUS_DE = { par: 'paralysiert', slp: 'eingeschlafen', psn: 'vergiftet', tox: 'schwer vergiftet', brn: 'verbrannt', frz: 'eingefroren' };
const PINCH = { overgrow: 'grass', blaze: 'fire', torrent: 'water', swarm: 'bug' };

export function makeBattler(mon) {
  return {
    mon,
    stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
    vol: { confused: 0, flinch: false, leechSeed: false, trap: 0, focus: false, charged: false, endure: false, furyCutter: 0, toxic: 1, sleep: 0, hitThisTurn: false, lastMove: null }
  };
}

export class WildBattle {
  /**
   * @param {object} o
   * @param {object[]} o.party Live-Referenzen auf das Team des Spielers (Reihenfolge = Slots)
   * @param {object} o.wild Das wilde Pokemon
   * @param {boolean} o.catchable Nuzlocke-Freigabe fuer Baelle
   * @param {string} o.catchBlockReason Text, falls nicht fangbar
   * @param {object} o.items Inventar des Spielers (Baelle werden verbraucht)
   * @param {function} o.onFaint (mon) => events[]  Nuzlocke/Soulbound-Hook
   */
  constructor(o) {
    this.id = o.id;
    this.party = o.party;
    this.items = o.items;
    this.route = o.route;
    this.catchable = o.catchable;
    this.catchBlockReason = o.catchBlockReason;
    this.onFaint = o.onFaint;
    this.nuzlocke = o.nuzlocke;
    this.ballCtx = o.ballCtx || {};
    this.wild = makeBattler(o.wild);
    const first = this.party.find((p) => p.alive !== false && p.hp > 0);
    this.ally = makeBattler(first);
    this.participants = new Set([first.id]);
    this.escapeAttempts = 0;
    this.state = 'action'; // action | switch | ended
    this.result = null;
    this.turn = 0;
    // Partner wie Heide, Urs oder Buck: kämpft an deiner Seite und greift jede Runde mit an
    this.partner = o.partner ? { name: o.partner.name, b: makeBattler(o.partner.mon) } : null;
    // Wanderndes Pokémon (Vesprit, Cresselia): flieht, sobald es an der Reihe ist
    this.roamer = !!o.roamer;
  }

  intro() {
    const ev = [];
    const w = this.wild.mon;
    ev.push({ type: 'text', text: `Ein wildes ${displayName(w)} erscheint!${w.shiny ? ' (Schillernd!)' : ''}` });
    if (!this.catchable) ev.push({ type: 'text', text: this.catchBlockReason });
    ev.push({ type: 'text', text: `Los, ${displayName(this.ally.mon)}!` });
    ev.push(...this.partnerIntro());
    ev.push(...this.switchInAbility(this.ally, this.wild));
    ev.push(...this.switchInAbility(this.wild, this.ally));
    return ev;
  }

  partnerIntro() {
    return this.partner ? [{ type: 'text', text: `${this.partner.name} schickt ${displayName(this.partner.b.mon)} in den Kampf!` }] : [];
  }

  // Der Partner greift den Gegner mit seiner stärksten Attacke an (Doppelkampf nachempfunden)
  partnerTurn(ev) {
    const pb = this.partner?.b;
    if (!pb || this.state !== 'action' || this.wild.mon.hp <= 0) return;
    const foeTypes = species(this.wild.mon.speciesId).types;
    const own = species(pb.mon.speciesId).types;
    const best = pb.mon.moves.map((m) => MOVES[m.id]).filter((mv) => mv && mv.cat !== 'status' && mv.power)
      .map((mv) => ({ mv, eff: mv.type === '???' ? 1 : typeEffectiveness(mv.type, foeTypes) }))
      .sort((a, b) => b.mv.power * b.eff * (own.includes(b.mv.type) ? 1.5 : 1) - a.mv.power * a.eff * (own.includes(a.mv.type) ? 1.5 : 1))[0];
    if (!best) return;
    const { mv, eff } = best;
    ev.push({ type: 'text', text: `${this.partner.name}s ${displayName(pb.mon)} setzt ${mv.name} ein!` });
    ev.push({ type: 'anim', side: 'ally', move: mv.id, moveType: mv.type, cat: mv.cat, power: mv.power || 0 });
    if (mv.acc !== null && Math.random() * 100 >= mv.acc * accStageMultiplier(-this.wild.stages.eva)) {
      ev.push({ type: 'text', text: 'Die Attacke ging daneben!' });
      return;
    }
    if (eff === 0) { ev.push({ type: 'text', text: `Es hat keine Wirkung auf ${this.nameAcc(this.wild)}...` }); return; }
    const { damage, crit } = this.computeDamage(pb, this.wild, mv, eff);
    if (crit) ev.push({ type: 'text', text: 'Ein Volltreffer!' });
    this.applyDamage(this.wild, damage, ev);
    if (eff > 1) ev.push({ type: 'text', text: 'Das ist sehr effektiv!' });
    if (eff < 1) ev.push({ type: 'text', text: 'Das ist nicht sehr effektiv...' });
  }

  snapshot() {
    return {
      id: this.id,
      state: this.state,
      catchable: this.catchable,
      ally: { ...publicPokemon(this.ally.mon), stages: this.ally.stages },
      foe: { ...publicPokemon(this.wild.mon), stages: this.wild.stages, moves: undefined, stats: undefined },
      party: this.party.map(publicPokemon),
      balls: Object.fromEntries(Object.keys(BALLS).map((k) => [k, this.items[k] || 0])),
      bag: Object.fromEntries(Object.entries(ITEMS).filter(([k, it]) => (it.kind === 'med' || it.kind === 'battle') && !it.candy && !it.ev && !it.ppUp && this.items[k] > 0).map(([k, it]) => [k, { name: it.name, count: this.items[k], kind: it.kind, pp: !!it.pp && !it.all }])),
      kind: 'wild',
      shiftOffer: !!this.shiftOffer
    };
  }

  side(b) { return b === this.ally ? 'ally' : 'foe'; }
  isAlly(b) { return b === this.ally; }
  other(b) { return b === this.ally ? this.wild : this.ally; }
  name(b) { return b === this.ally ? displayName(b.mon) : `Das wilde ${displayName(b.mon)}`; }
  // Dativ und Akkusativ fuer Saetze wie "Verteidigung von dem wilden X" oder "Wirkung auf das wilde X"
  nameDat(b) { return this.isAlly(b) ? displayName(b.mon) : `dem ${this.foeAdj}en ${displayName(b.mon)}`; }
  nameAcc(b) { return this.isAlly(b) ? displayName(b.mon) : `das ${this.foeAdj}e ${displayName(b.mon)}`; }
  get foeAdj() { return 'wild'; }

  // ---------------------------------------------------------------- Aktionen
  act(action) {
    if (this.state === 'ended') return { events: [], error: 'Kampf ist beendet' };
    const ev = [];
    if (this.state === 'switch') {
      if (action.type !== 'switch') return { events: [], error: 'Du musst ein Pokemon einwechseln' };
      const r = this.doSwitch(action.index, ev);
      if (r) return { events: [], error: r };
      this.state = 'action';
      return { events: ev };
    }
    // Kampfstil Wechsel: nach einem besiegten Gegner einmal frei wechseln
    const offer = this.shiftOffer; this.shiftOffer = false;
    if (offer && action.type === 'switch' && action.free) {
      const r = this.doSwitch(action.index, ev);
      if (r) return { events: [], error: r };
      return { events: ev };
    }

    this.turn++;
    this.ally.vol.hitThisTurn = false;
    this.wild.vol.hitThisTurn = false;
    this.ally.vol.flinch = false;
    this.wild.vol.flinch = false;
    this.ally.vol.endure = false;
    this.wild.vol.endure = false;

    const foeMove = this.pickWildMove();

    if (action.type === 'run') {
      if (this.ally.vol.trap > 0 && this.ally.mon.ability !== 'run-away') {
        ev.push({ type: 'text', text: 'Du kannst nicht fliehen!' });
      } else {
        this.escapeAttempts++;
        const ok = this.ally.mon.ability === 'run-away' || heldOf(this.ally.mon)?.flee || escapeAttempt(this.effSpeed(this.ally), this.effSpeed(this.wild), this.escapeAttempts);
        if (ok) {
          ev.push({ type: 'text', text: 'Du bist entkommen!' });
          return { events: this.end('fled', ev) };
        }
        ev.push({ type: 'text', text: 'Flucht gescheitert!' });
      }
      this.useMove(this.wild, foeMove, ev, false);
    } else if (action.type === 'ball') {
      const ball = BALLS[action.ball];
      if (!ball) return { events: [], error: 'Unbekannter Ball' };
      if (!this.catchable) return { events: [{ type: 'text', text: this.catchBlockReason }] };
      if (!this.items[action.ball]) return { events: [{ type: 'text', text: `Du hast keine ${ball.name}s mehr.` }] };
      this.items[action.ball]--;
      ev.push({ type: 'text', text: `Du wirfst einen ${ball.name}!` });
      const w = this.wild.mon;
      const sp = species(w.speciesId);
      const bonus = ballBonus(action.ball, { ...this.ballCtx, types: sp.types, level: w.level, turn: this.turn, caught: !!this.ballCtx?.caught?.[sp.id] });
      const r = catchAttempt({ maxHp: w.stats.hp, hp: w.hp, catchRate: sp.catchRate, ballBonus: bonus, status: w.status });
      ev.push({ type: 'shake', count: r.shakes, caught: r.caught, ball: action.ball });
      if (r.caught) {
        ev.push({ type: 'text', text: `Toll! ${displayName(w)} wurde gefangen!` });
        w.metRoute = this.route;
        w.ball = action.ball;
        // Heilball: gefangenes Pokemon ist sofort wieder fit
        if (ball.heal) { w.hp = w.stats.hp; w.status = null; for (const m of w.moves) m.pp = m.maxPp; }
        return { events: this.end('caught', ev) };
      }
      ev.push({ type: 'text', text: ['Oh nein! Es hat sich befreit!', 'Mist! Fast hätte es geklappt!', 'Argh! Beinahe!', 'Verflixt! Es war so knapp!'][r.shakes] });
      this.useMove(this.wild, foeMove, ev, false);
    } else if (action.type === 'item') {
      const it = ITEMS[action.item];
      const mon = it?.kind === 'battle' ? this.ally.mon : this.party[action.index];
      if (!it || !(it.kind === 'med' || it.kind === 'battle') || it.candy || it.ev || it.ppUp || !mon) return { events: [], error: 'Ungültiger Gegenstand' };
      if (!this.items[action.item]) return { events: [{ type: 'text', text: `Du hast keinen ${it.name} mehr.` }] };
      if (it.kind === 'battle') {
        const b = this.ally;
        if ((it.stage && b.stages[it.stage] >= 6) || (it.crit && b.vol.focus) || (it.mist && b.vol.mist > 0)) return { events: [{ type: 'text', text: 'Es hätte keine Wirkung.' }] };
        this.items[action.item]--;
        ev.push({ type: 'text', text: `Du setzt ${it.name} ein.` });
        if (it.stage) this.changeStages(b, { [it.stage]: 1 }, ev, b);
        if (it.crit) { b.vol.focus = true; ev.push({ type: 'text', text: `${this.name(b)} ist in Topform!` }); }
        if (it.mist) { b.vol.mist = 5; ev.push({ type: 'text', text: `Megablock hüllt dein Team ein!` }); }
      } else {
        const r = applyItem(action.item, mon, displayName(mon), { nuzlocke: this.nuzlocke, moveIndex: Number(action.moveIndex) || 0, moveBasePp: (id) => MOVES[id]?.pp, moveName: (id) => MOVES[id]?.name });
        if (!r.ok) return { events: [{ type: 'text', text: r.text }] };
        this.items[action.item]--;
        ev.push({ type: 'text', text: `Du setzt ${it.name} ein.` }, { type: 'text', text: r.text });
        if (mon === this.ally.mon) ev.push({ type: 'hp', side: 'ally', hp: mon.hp, maxHp: mon.stats.hp, damage: 0 }, this.statusEvent(this.ally));
      }
      this.useMove(this.wild, foeMove, ev, false);
    } else if (action.type === 'switch') {
      const err = this.doSwitch(action.index, ev);
      if (err) return { events: [], error: err };
      this.useMove(this.wild, foeMove, ev, false);
    } else if (action.type === 'move') {
      const slot = this.ally.mon.moves[action.index];
      const usable = this.ally.mon.moves.some((m) => m.pp > 0);
      let allyMove;
      if (!usable) allyMove = 'struggle';
      else if (!slot || slot.pp <= 0) return { events: [], error: 'Keine AP mehr fuer diese Attacke' };
      else allyMove = slot.id;
      const lock = this.choiceLock(this.ally);
      if (lock && allyMove !== lock && allyMove !== 'struggle') return { events: [], error: `Wegen ${this.itemName(this.ally)} geht nur ${MOVES[lock].name}!` };
      const order = this.turnOrder(allyMove, foeMove);
      for (let i = 0; i < order.length; i++) {
        const [b, mv] = order[i];
        if (this.state === 'ended' || b.mon.hp <= 0 || this.other(b).mon.hp <= 0) continue;
        this.useMove(b, mv, ev, i === 0);
        if (this.checkFaints(ev)) break;
      }
    } else {
      return { events: [], error: 'Unbekannte Aktion' };
    }

    if (this.state === 'action') {
      if (!this.checkFaints(ev)) {
        this.partnerTurn(ev);
        if (!this.checkFaints(ev)) this.endOfTurn(ev);
      }
      this.checkFaints(ev);
    }
    return { events: ev };
  }

  // Wahlband, Wahlglas, Wahlschal: nur die zuerst gewählte Attacke, solange sie AP hat
  choiceLock(b) {
    const id = b.vol.choiceMove;
    return id && heldOf(b.mon)?.choice && b.mon.moves.some((m) => m.id === id && m.pp > 0) ? id : null;
  }

  pickWildMove() {
    if (this.roamer && !this.wild.vol.trap) return 'flee';
    const usable = this.wild.mon.moves.filter((m) => m.pp > 0);
    if (!usable.length) return 'struggle';
    return usable[rnd(usable.length)].id;
  }

  effSpeed(b) {
    let s = b.mon.stats.spe * stageMultiplier(b.stages.spe);
    if (b.mon.status === 'par') s /= 4;
    const h = heldOf(b.mon);
    if (h?.choice === 'spe') s *= 1.5;
    if (h?.slow) s *= h.slow;
    return Math.floor(s);
  }

  turnOrder(allyMove, foeMove) {
    const a = [this.ally, allyMove];
    const f = [this.wild, foeMove];
    const pa = MOVES[allyMove]?.prio || 0;
    const pf = MOVES[foeMove]?.prio || 0;
    if (pa !== pf) return pa > pf ? [a, f] : [f, a];
    const qa = this.quickRoll(this.ally); const qf = this.quickRoll(this.wild);
    if (qa !== qf) return qa > qf ? [a, f] : [f, a];
    const sa = this.effSpeed(this.ally);
    const sf = this.effSpeed(this.wild);
    if (sa !== sf) return sa > sf ? [a, f] : [f, a];
    return Math.random() < 0.5 ? [a, f] : [f, a];
  }

  // Flinkklaue (manchmal zuerst) und Schwerschweif (immer zuletzt) innerhalb derselben Priorität
  quickRoll(b) {
    const h = heldOf(b.mon);
    if (h?.last) return -1;
    return h?.quick && chance(h.quick) ? 1 : 0;
  }

  // Getragenes Item wird verbraucht (Beeren, Kräuter, Fokusgurt): wie in Platin auch nach dem Kampf weg
  consumeItem(b) { b.mon.item = null; }
  itemName(b) { return ITEMS[b.mon.item]?.name || b.mon.item; }

  // Beeren lösen aus, sobald ihr Anlass eintritt
  checkBerry(b, ev) {
    const h = heldOf(b.mon)?.berry;
    if (!h || b.mon.hp <= 0) return;
    const max = b.mon.stats.hp;
    const name = this.itemName(b);
    if ((h.hp || h.hpPct) && b.mon.hp <= Math.floor(max / 2)) {
      this.consumeItem(b);
      this.heal(b, h.hp || Math.floor(max * h.hpPct), ev, `${this.name(b)} isst seine ${name} und füllt KP auf!`);
      return;
    }
    if (h.cure && h.cure.includes(b.mon.status)) {
      this.consumeItem(b);
      b.mon.status = null;
      ev.push({ type: 'text', text: `${this.name(b)} isst seine ${name} und ist wieder gesund!` }, this.statusEvent(b));
      return;
    }
    if (h.confuse && b.vol.confused > 0) {
      this.consumeItem(b);
      b.vol.confused = 0;
      ev.push({ type: 'text', text: `${this.name(b)} isst seine ${name} und ist nicht mehr verwirrt!` });
      return;
    }
    const empty = h.pp && b.mon.moves.find((m) => m.pp <= 0);
    if (empty) {
      this.consumeItem(b);
      empty.pp = Math.min(empty.maxPp, h.pp);
      ev.push({ type: 'text', text: `${this.name(b)} isst seine ${name} und füllt die AP von ${MOVES[empty.id]?.name || empty.id} auf!` });
    }
  }

  // Schlohkraut setzt gesenkte Werte zurück
  checkHerb(b, ev) {
    if (!heldOf(b.mon)?.white || !Object.values(b.stages).some((v) => v < 0)) return;
    for (const k of Object.keys(b.stages)) if (b.stages[k] < 0) b.stages[k] = 0;
    ev.push({ type: 'text', text: `${this.name(b)} setzt mit ${this.itemName(b)} seine Werte zurück!` });
    this.consumeItem(b);
  }

  doSwitch(index, ev) {
    const mon = this.party[index];
    if (!mon) return 'Ungueltiger Slot';
    if (mon.alive === false || mon.hp <= 0) return `${displayName(mon)} kann nicht kaempfen`;
    if (mon === this.ally.mon) return `${displayName(mon)} kaempft bereits`;
    if (this.ally.mon.hp > 0) {
      if (this.ally.mon.ability === 'natural-cure') this.ally.mon.status = null;
      ev.push({ type: 'text', text: `${displayName(this.ally.mon)}, komm zurueck!` });
    }
    this.ally = makeBattler(mon);
    this.wild.vol.leechSeed = this.wild.vol.leechSeed; // Egelsamen bleibt beim Gegner
    this.participants.add(mon.id);
    ev.push({ type: 'switch', side: 'ally', mon: publicPokemon(mon) });
    ev.push({ type: 'text', text: `Los, ${displayName(mon)}!` });
    ev.push(...this.switchInAbility(this.ally, this.wild));
    return null;
  }

  switchInAbility(b, target) {
    const ev = [];
    if (b.mon.ability === 'intimidate') {
      ev.push({ type: 'text', text: `Bedroher von ${this.nameDat(b)}!` });
      this.changeStages(target, { atk: -1 }, ev, b);
    }
    return ev;
  }

  // ---------------------------------------------------------------- Attacke ausfuehren
  useMove(user, moveId, ev, movedFirst) {
    if (moveId === 'flee') {
      ev.push({ type: 'text', text: `${this.name(user)} ist geflohen!` });
      this.end('fled', ev);
      return;
    }
    const target = this.other(user);
    const move = MOVES[moveId];
    if (!this.beforeMove(user, moveId, move, ev, target)) return;
    this.hitTarget(user, target, move, ev, movedFirst);
  }

  // Statusprobleme, AP und Ansage. Liefert false, wenn der Anwender nicht angreifen kann.
  beforeMove(user, moveId, move, ev, target) {
    const uName = this.name(user);

    // Statusprobleme vor dem Angriff
    if (user.mon.status === 'slp') {
      if (user.vol.sleep > 0) {
        user.vol.sleep--;
        ev.push({ type: 'text', text: `${uName} schläft tief und fest.` });
        user.vol.furyCutter = 0;
        return false;
      }
      user.mon.status = null;
      ev.push({ type: 'text', text: `${uName} ist aufgewacht!` }, this.statusEvent(user));
    }
    if (user.mon.status === 'frz') {
      if (chance(20)) {
        user.mon.status = null;
        ev.push({ type: 'text', text: `${uName} ist wieder aufgetaut!` }, this.statusEvent(user));
      } else {
        ev.push({ type: 'text', text: `${uName} ist eingefroren!` });
        return false;
      }
    }
    if (user.vol.flinch) {
      ev.push({ type: 'text', text: `${uName} schreckt zurück!` });
      user.vol.flinch = false;
      return false;
    }
    if (user.vol.confused > 0) {
      user.vol.confused--;
      if (user.vol.confused === 0) {
        ev.push({ type: 'text', text: `${uName} ist nicht mehr verwirrt!` });
      } else {
        ev.push({ type: 'text', text: `${uName} ist verwirrt!` });
        if (chance(50)) {
          const dmg = calcDamage({ level: user.mon.level, power: 40, attack: this.statFor(user, 'atk', false), defense: this.statFor(user, 'def', false), stab: false, typeMult: 1, crit: false, burned: false, physical: true });
          ev.push({ type: 'text', text: 'Es hat sich vor Verwirrung selbst verletzt!' });
          this.applyDamage(user, dmg, ev);
          return false;
        }
      }
    }
    if (user.mon.status === 'par' && chance(25)) {
      ev.push({ type: 'text', text: `${uName} ist paralysiert! Es kann nicht angreifen!` });
      return false;
    }

    // AP verbrauchen
    if (moveId !== 'struggle') {
      const slot = user.mon.moves.find((m) => m.id === moveId);
      if (slot) slot.pp = Math.max(0, slot.pp - 1);
    }
    ev.push({ type: 'text', text: `${uName} setzt ${move.name} ein!` });
    ev.push({ type: 'anim', side: this.side(user), target: this.side(target), move: moveId, moveType: move.type, cat: move.cat, power: move.power || 0 });
    if (move.id !== 'fury-cutter') user.vol.furyCutter = 0;
    user.vol.lastMove = moveId;
    if (heldOf(user.mon)?.choice && !user.vol.choiceMove && moveId !== 'struggle') user.vol.choiceMove = moveId;
    return true;
  }

  // Trifft ein Ziel: Genauigkeit, Statusattacke oder Schaden mit Zusatzeffekten
  hitTarget(user, target, move, ev, movedFirst) {
    const uName = this.name(user);

    // Genauigkeit
    if (move.acc !== null && !(move.cat === 'status' && move.effect?.target === 'self')) {
      const stage = Math.max(-6, Math.min(6, user.stages.acc - target.stages.eva));
      let hitChance = move.acc * accStageMultiplier(stage);
      const hu = heldOf(user.mon); const ht = heldOf(target.mon);
      if (hu?.acc) hitChance *= hu.acc;
      if (hu?.zoom && target.moved) hitChance *= hu.zoom;
      if (ht?.evade) hitChance *= ht.evade;
      if (Math.random() * 100 >= hitChance) {
        ev.push({ type: 'text', text: `Die Attacke von ${uName} ging daneben!` });
        user.vol.furyCutter = 0;
        return;
      }
    }

    if (move.cat === 'status') {
      this.applyStatusMove(user, target, move, ev);
      return;
    }

    // Schadensattacke
    const typeMult = move.type === '???' ? 1 : typeEffectiveness(move.type, species(target.mon.speciesId).types);
    if (typeMult === 0) {
      ev.push({ type: 'text', text: `Es hat keine Wirkung auf ${this.nameAcc(target)}...` });
      return;
    }

    const e = move.effect || {};
    let hits = 1;
    if (e.kind === 'multihit') {
      const r = rnd(8);
      hits = e.min && e.min === e.max ? e.min : r < 3 ? 2 : r < 6 ? 3 : r < 7 ? 4 : 5;
    }
    let total = 0;
    let landed = 0;
    for (let h = 0; h < hits && target.mon.hp > 0 && user.mon.hp > 0; h++) {
      const { damage, crit } = this.computeDamage(user, target, move, typeMult);
      if (crit) ev.push({ type: 'text', text: 'Ein Volltreffer!' });
      total += this.applyDamage(target, damage, ev);
      landed++;
      target.vol.hitThisTurn = true;
      this.contactAbility(user, target, move, ev);
    }
    if (hits > 1) ev.push({ type: 'text', text: `${landed}-mal getroffen!` });
    const hu = heldOf(user.mon);
    if (total > 0 && user.mon.hp > 0) {
      if (hu?.shell) this.heal(user, Math.max(1, Math.floor(total * hu.shell)), ev, `${this.name(user)} füllt mit der Muschelglocke KP auf!`);
      if (hu?.orb && user.mon.ability !== 'magic-guard') { ev.push({ type: 'text', text: `${this.name(user)} verliert durch den Leben-Orb KP!` }); this.applyDamage(user, Math.max(1, Math.floor(user.mon.stats.hp / 10)), ev); }
      if (hu?.flinch && movedFirst && target.mon.hp > 0 && !e.flinch && e.kind !== 'flinch' && chance(hu.flinch) && target.mon.ability !== 'inner-focus') target.vol.flinch = true;
    }
    if (e.kind !== 'fixed' && e.kind !== 'endeavor') {
      if (typeMult > 1) ev.push({ type: 'text', text: 'Das ist sehr effektiv!' });
      if (typeMult < 1) ev.push({ type: 'text', text: 'Das ist nicht sehr effektiv...' });
    }
    if (user.vol.charged && move.type === 'electric') user.vol.charged = false;

    // Zusatzeffekte
    if (e.kind === 'drain' && total > 0) this.heal(user, Math.max(1, Math.floor(total * e.ratio)), ev, `${this.isAlly(target) ? this.name(target) : this.nameDat(target).replace(/^d/, 'D')} wurde Energie abgesaugt!`);
    if (e.kind === 'recoil' && total > 0) {
      const rec = e.ofMaxHp ? Math.floor(user.mon.stats.hp * e.ratio) : Math.floor(total * e.ratio);
      ev.push({ type: 'text', text: `${uName} wird durch den Rückstoß getroffen!` });
      this.applyDamage(user, Math.max(1, rec), ev);
    }
    if (e.kind === 'trap' && target.mon.hp > 0 && !target.vol.trap) {
      target.vol.trap = 2 + rnd(4);
      ev.push({ type: 'text', text: `${this.name(target)} wurde gefangen!` });
    }
    if (target.mon.hp > 0 && target.mon.ability !== 'shield-dust') {
      if (e.kind === 'status' && chance(e.chance)) this.inflictStatus(target, e.status, ev, false);
      if ((e.kind === 'flinch' && chance(e.chance)) || (e.flinch && chance(e.flinch))) {
        if (movedFirst && target.mon.ability !== 'inner-focus') target.vol.flinch = true;
      }
      if (e.kind === 'confuse' && chance(e.chance)) this.confuse(target, ev, false);
      if (e.kind === 'stat' && e.target === 'foe' && chance(e.chance ?? 100)) this.changeStages(target, e.stats, ev, user);
    }
    if (e.kind === 'stat' && e.target === 'self' && chance(e.chance ?? 100)) this.changeStages(user, e.stats, ev, user);
  }

  statFor(b, key, crit, isAttacker = true) {
    let stage = b.stages[key];
    if (crit && isAttacker && stage < 0) stage = 0;
    if (crit && !isAttacker && stage > 0) stage = 0;
    return Math.max(1, Math.floor(b.mon.stats[key] * stageMultiplier(stage)));
  }

  computeDamage(user, target, move, typeMult) {
    const e = move.effect || {};
    if (e.kind === 'fixed') return { damage: e.damage === 'level' ? user.mon.level : e.damage, crit: false };
    if (e.kind === 'endeavor') return { damage: Math.max(0, target.mon.hp - user.mon.hp), crit: false };

    let power = move.power;
    if (e.kind === 'magnitude') {
      const r = rnd(100);
      const table = [[5, 4, 10], [15, 5, 30], [35, 6, 50], [65, 7, 70], [85, 8, 90], [95, 9, 110], [100, 10, 150]];
      const [, mag, pw] = table.find(([lim]) => r < lim);
      power = pw;
      this._pendingText = `Intensität ${mag}!`;
    }
    if (e.kind === 'facade' && ['psn', 'tox', 'brn', 'par'].includes(user.mon.status)) power *= 2;
    if (e.kind === 'brine' && target.mon.hp <= target.mon.stats.hp / 2) power *= 2;
    if (e.kind === 'revenge' && user.vol.hitThisTurn) power *= 2;
    if (e.kind === 'furyCutter') { power = Math.min(160, 10 * 2 ** user.vol.furyCutter); user.vol.furyCutter = Math.min(4, user.vol.furyCutter + 1); }
    if (user.vol.charged && move.type === 'electric') power *= 2;
    const pinch = PINCH[user.mon.ability];
    if (pinch === move.type && user.mon.hp <= Math.floor(user.mon.stats.hp / 3)) power = Math.floor(power * 1.5);

    const physical = move.cat === 'physical';
    const hu = heldOf(user.mon);
    if (hu?.boost === move.type) power = Math.floor(power * 1.2);
    if (physical && hu?.physical) power = Math.floor(power * hu.physical);
    if (!physical && hu?.special) power = Math.floor(power * hu.special);
    const critStage = (move.highCrit ? 1 : 0) + (user.vol.focus ? 2 : 0) + (hu?.crit || 0);
    const crit = Math.random() < critChance(critStage);
    let attack = this.statFor(user, physical ? 'atk' : 'spa', crit, true);
    const defense = this.statFor(target, physical ? 'def' : 'spd', crit, false);
    const guts = user.mon.ability === 'guts' && user.mon.status;
    if (guts && physical) attack = Math.floor(attack * 1.5);
    if (hu?.choice === (physical ? 'atk' : 'spa')) attack = Math.floor(attack * 1.5);
    const stab = species(user.mon.speciesId).types.includes(move.type);
    let damage = calcDamage({ level: user.mon.level, power, attack, defense, stab, typeMult, crit, burned: user.mon.status === 'brn' && !guts, physical });
    // Doppelkampf: Attacken gegen mehrere Ziele richten je drei Viertel Schaden an
    if (this.spreadHit) damage = Math.max(1, Math.floor(damage * 0.75));
    if (hu?.expert && typeMult > 1) damage = Math.floor(damage * hu.expert);
    if (hu?.orb) damage = Math.floor(damage * hu.orb);
    return { damage, crit };
  }

  applyDamage(b, dmg, ev) {
    if (this._pendingText) { ev.push({ type: 'text', text: this._pendingText }); this._pendingText = null; }
    let d = Math.min(dmg, b.mon.hp);
    const h = heldOf(b.mon);
    if (b.vol.endure && d >= b.mon.hp) {
      d = b.mon.hp - 1;
      ev.push({ type: 'text', text: `${this.name(b)} übersteht den Angriff!` });
    } else if (d >= b.mon.hp && b.mon.hp > 1 && ((h?.sash && b.mon.hp === b.mon.stats.hp) || (h?.band && chance(h.band)))) {
      d = b.mon.hp - 1;
      ev.push({ type: 'text', text: `${this.name(b)} hält sich mit ${this.itemName(b)} auf den Beinen!` });
      if (h.sash) this.consumeItem(b);
    }
    b.mon.hp -= d;
    ev.push({ type: 'hp', side: this.side(b), hp: b.mon.hp, maxHp: b.mon.stats.hp, damage: d });
    if (b.mon.hp > 0) this.checkBerry(b, ev);
    return d;
  }

  heal(b, amount, ev, text) {
    const before = b.mon.hp;
    b.mon.hp = Math.min(b.mon.stats.hp, b.mon.hp + amount);
    if (text) ev.push({ type: 'text', text });
    if (b.mon.hp !== before) ev.push({ type: 'hp', side: this.side(b), hp: b.mon.hp, maxHp: b.mon.stats.hp, damage: before - b.mon.hp });
  }

  contactAbility(user, target, move, ev) {
    if (!move.contact || user.mon.hp <= 0) return;
    if (target.mon.ability === 'static' && chance(30)) this.inflictStatus(user, 'par', ev, false);
  }

  applyStatusMove(user, target, move, ev) {
    const e = move.effect || { kind: 'nothing' };
    const fail = () => ev.push({ type: 'text', text: 'Es schlug fehl!' });
    switch (e.kind) {
      case 'stat':
        if (e.target === 'self') this.changeStages(user, e.stats, ev, user);
        else this.changeStages(target, e.stats, ev, user);
        break;
      case 'status': this.inflictStatus(target, e.status, ev, true); break;
      case 'confuse': this.confuse(target, ev, true); break;
      case 'swagger': this.changeStages(target, { atk: 2 }, ev, user); this.confuse(target, ev, true); break;
      case 'heal':
        if (user.mon.hp >= user.mon.stats.hp) fail();
        else this.heal(user, Math.floor(user.mon.stats.hp * e.amount), ev, `${this.name(user)} regeneriert KP!`);
        break;
      case 'focus':
        if (user.vol.focus) fail();
        else { user.vol.focus = true; ev.push({ type: 'text', text: `${this.name(user)} konzentriert sich!` }); }
        break;
      case 'charge':
        user.vol.charged = true;
        ev.push({ type: 'text', text: `${this.name(user)} lädt sich auf!` });
        this.changeStages(user, { spd: 1 }, ev, user);
        break;
      case 'endure': user.vol.endure = true; ev.push({ type: 'text', text: `${this.name(user)} macht sich bereit!` }); break;
      case 'leechSeed':
        if (target.vol.leechSeed || species(target.mon.speciesId).types.includes('grass')) fail();
        else { target.vol.leechSeed = true; ev.push({ type: 'text', text: `${this.name(target)} wurde bepflanzt!` }); }
        break;
      case 'escape':
        // Im Wildkampf beenden Teleport, Wirbelwind und Bruellen den Kampf sofort.
        if (user === this.ally) {
          ev.push({ type: 'text', text: move.id === 'teleport' ? `${this.name(user)} ist entkommen!` : `${this.name(target)} wurde weggeweht!` });
          this.end('fled', ev);
        } else {
          ev.push({ type: 'text', text: move.id === 'teleport' ? `${this.name(user)} ist geflohen!` : `${this.name(target)} wurde weggeweht!` });
          this.end('foeFled', ev);
        }
        break;
      case 'nothing':
      default:
        ev.push({ type: 'text', text: move.simplified ? 'Aber es passierte nichts (Effekt noch nicht umgesetzt).' : 'Aber nichts geschah!' });
    }
  }

  changeStages(b, stats, ev, source) {
    for (const [k, raw] of Object.entries(stats)) {
      let delta = raw;
      if (b.mon.ability === 'simple') delta *= 2;
      if (delta < 0 && source !== b && b.vol.mist > 0) { ev.push({ type: 'text', text: `${this.name(b)} ist durch Megablock geschützt!` }); continue; }
      if (delta < 0 && source !== b && (b.mon.ability === 'clear-body' || (k === 'acc' && b.mon.ability === 'keen-eye'))) {
        ev.push({ type: 'text', text: `${this.name(b)} verhindert die Senkung!` });
        continue;
      }
      const before = b.stages[k];
      b.stages[k] = Math.max(-6, Math.min(6, before + delta));
      const diff = b.stages[k] - before;
      if (diff === 0) ev.push({ type: 'text', text: `${STAT_DE[k]} von ${this.nameDat(b)} kann nicht weiter ${delta > 0 ? 'steigen' : 'sinken'}!` });
      else ev.push({ type: 'stat', side: this.side(b), up: diff > 0 }, { type: 'text', text: `${STAT_DE[k]} von ${this.nameDat(b)} ${Math.abs(diff) >= 2 ? (diff > 0 ? 'steigt stark' : 'sinkt stark') : diff > 0 ? 'steigt' : 'sinkt'}!` });
    }
    this.checkHerb(b, ev);
  }

  inflictStatus(b, status, ev, primary) {
    const types = species(b.mon.speciesId).types;
    const immune =
      (status === 'brn' && types.includes('fire')) ||
      (status === 'frz' && types.includes('ice')) ||
      ((status === 'psn' || status === 'tox') && (types.includes('poison') || types.includes('steel')));
    if (b.mon.status || immune || b.mon.hp <= 0) {
      if (primary) ev.push({ type: 'text', text: 'Es schlug fehl!' });
      return false;
    }
    b.mon.status = status;
    if (status === 'slp') b.vol.sleep = 1 + rnd(4);
    if (status === 'tox') b.vol.toxic = 1;
    ev.push({ type: 'text', text: `${this.name(b)} wurde ${STATUS_DE[status]}!` }, this.statusEvent(b));
    this.checkBerry(b, ev);
    return true;
  }

  confuse(b, ev, primary) {
    if (b.vol.confused > 0) { if (primary) ev.push({ type: 'text', text: `${this.name(b)} ist bereits verwirrt!` }); return; }
    b.vol.confused = 2 + rnd(4);
    ev.push({ type: 'text', text: `${this.name(b)} wurde verwirrt!` });
    this.checkBerry(b, ev);
  }

  statusEvent(b) { return { type: 'status', side: this.side(b), status: b.mon.status }; }

  endOfTurn(ev) {
    if (this.ally.vol.mist > 0 && --this.ally.vol.mist === 0) ev.push({ type: 'text', text: 'Megablock hat keine Wirkung mehr.' });
    for (const b of [this.ally, this.wild]) {
      if (this.state === 'ended' || b.mon.hp <= 0) continue;
      const max = b.mon.stats.hp;
      if (b.mon.status === 'brn') { ev.push({ type: 'text', text: `${this.name(b)} wird durch Verbrennungen geschwächt!` }); this.applyDamage(b, Math.max(1, Math.floor(max / 8)), ev); }
      if (b.mon.status === 'psn') { ev.push({ type: 'text', text: `${this.name(b)} wird durch Gift geschwächt!` }); this.applyDamage(b, Math.max(1, Math.floor(max / 8)), ev); }
      if (b.mon.status === 'tox') { ev.push({ type: 'text', text: `${this.name(b)} wird durch Gift geschwächt!` }); this.applyDamage(b, Math.max(1, Math.floor((max * b.vol.toxic) / 16)), ev); b.vol.toxic++; }
      if (b.vol.leechSeed && b.mon.hp > 0) {
        const d = this.applyDamage(b, Math.max(1, Math.floor(max / 8)), ev);
        const o = this.other(b);
        if (o.mon.hp > 0) this.heal(o, d, ev, `Egelsamen saugt ${this.nameDat(b)} Energie ab!`);
      }
      if (b.vol.trap > 0 && b.mon.hp > 0) {
        b.vol.trap--;
        ev.push({ type: 'text', text: `${this.name(b)} ist gefangen!` });
        this.applyDamage(b, Math.max(1, Math.floor(max / 16)), ev);
        if (b.vol.trap === 0) ev.push({ type: 'text', text: `${this.name(b)} wurde befreit!` });
      }
      if (b.mon.ability === 'shed-skin' && b.mon.status && chance(30)) {
        b.mon.status = null;
        ev.push({ type: 'text', text: `${this.name(b)} heilt sich durch Expidermis!` }, this.statusEvent(b));
      }
      this.heldEndOfTurn(b, ev);
    }
  }

  // Überreste, Giftschleim, Toxik-Orb und Heiß-Orb am Rundenende
  heldEndOfTurn(b, ev) {
    const h = heldOf(b.mon);
    if (!h || this.state === 'ended' || b.mon.hp <= 0) return;
    const max = b.mon.stats.hp;
    const poison = species(b.mon.speciesId).types.includes('poison');
    if ((h.heal || (h.sludge && poison)) && b.mon.hp < max) this.heal(b, Math.max(1, Math.floor(max / 16)), ev, `${this.name(b)} füllt mit ${this.itemName(b)} ein wenig KP auf!`);
    else if (h.sludge && !poison) { ev.push({ type: 'text', text: `${this.name(b)} wird durch den Giftschleim verletzt!` }); this.applyDamage(b, Math.max(1, Math.floor(max / 8)), ev); }
    if (h.inflict && !b.mon.status && b.mon.hp > 0) this.inflictStatus(b, h.inflict, ev, false);
  }

  // Liefert true, wenn der Zug durch K.O. unterbrochen werden muss.
  checkFaints(ev) {
    if (this.state === 'ended') return true;
    let stop = false;
    if (this.wild.mon.hp <= 0 && !this.wild.fainted) {
      this.wild.fainted = true;
      ev.push({ type: 'faint', side: 'foe' }, { type: 'text', text: `${this.name(this.wild)} wurde besiegt!` });
      this.awardExp(ev);
      this.onFoeDefeated(ev);
      stop = true;
    }
    if (this.ally.mon.hp <= 0 && !this.ally.fainted) {
      this.ally.fainted = true;
      ev.push({ type: 'faint', side: 'ally' }, { type: 'text', text: `${displayName(this.ally.mon)} wurde besiegt!` });
      ev.push(...(this.onFaint ? this.onFaint(this.ally.mon) : []));
      stop = true;
      this.afterAllyLoss(ev);
    }
    return stop;
  }

  onFoeDefeated(ev) { this.end('win', ev); }

  afterAllyLoss(ev) {
    if (this.state === 'ended') return;
    const anyLeft = this.party.some((p) => p.alive !== false && p.hp > 0);
    if (!anyLeft) {
      ev.push({ type: 'text', text: 'Du hast keine kampffähigen Pokemon mehr!' });
      this.end('lose', ev);
    } else {
      this.state = 'switch';
      ev.push({ type: 'needSwitch' });
    }
  }

  // Wird vom Soulbound-System aufgerufen, wenn ein verlinktes Pokemon ausserhalb dieses Kampfes stirbt.
  externalDeath(pokemonId, text) {
    const ev = [];
    if (this.state === 'ended') return ev;
    const mon = this.party.find((p) => p.id === pokemonId);
    if (!mon) return ev;
    mon.hp = 0;
    ev.push({ type: 'text', text });
    if (this.ally.mon.id === pokemonId && !this.ally.fainted) {
      this.ally.fainted = true;
      ev.push({ type: 'hp', side: 'ally', hp: 0, maxHp: mon.stats.hp, damage: 0 }, { type: 'faint', side: 'ally' });
      this.afterAllyLoss(ev);
    }
    return ev;
  }

  awardExp(ev) {
    const parts = this.party.filter((p) => this.participants.has(p.id) && p.alive !== false && p.hp > 0);
    this.giveExp(parts, this.wild.mon, ev);
  }

  // EP für Teilnehmer, Glücks-Ei mal 1,5, EP-Teiler gibt Trägern außerhalb des Kampfes die Hälfte
  giveExp(parts, foe, ev) {
    const sp = species(foe.speciesId);
    const sharers = this.party.filter((p) => !parts.includes(p) && !p.egg && p.alive !== false && p.hp > 0 && heldOf(p)?.share);
    for (const p of [...parts, ...sharers]) {
      const share = parts.includes(p) ? 1 : 0.5;
      const amount = Math.floor(expGain({ baseExp: sp.baseExp, level: foe.level, participants: Math.max(1, parts.length) }) * (this.expBonus || 1) * (heldOf(p)?.exp || 1) * share);
      ev.push({ type: 'text', text: `${displayName(p)} erhält ${amount} Erfahrungspunkte!` });
      gainEvs(p, foe.speciesId);
      const lv = addExp(p, amount);
      ev.push({ type: 'exp', pokemonId: p.id, exp: p.exp }, ...lv);
      const b = this.battlerOfMon(p);
      if (b) ev.push({ type: 'hp', side: this.side(b), hp: p.hp, maxHp: p.stats.hp, damage: 0 });
    }
  }
  battlerOfMon(p) { return p === this.ally.mon ? this.ally : null; }

  end(result, ev) {
    if (this.state === 'ended') return ev;
    this.state = 'ended';
    this.result = result;
    // Kampfstatus (Verwirrung etc.) verfaellt, Statusprobleme bleiben wie im Original.
    ev.push({ type: 'end', result });
    return ev;
  }
}

// Trainerkampf: mehrere gegnerische Pokemon, kein Fangen, keine Flucht, einfache KI.
export class TrainerBattle extends WildBattle {
  /**
   * @param {object} o wie WildBattle, zusaetzlich foeParty (Pokemon-Liste) und trainer { name, cls }
   */
  constructor(o) {
    super({ ...o, wild: o.foeParty[0], catchable: false, catchBlockReason: 'Man darf die Pokémon anderer Trainer nicht fangen!' });
    this.foeParty = o.foeParty;
    this.trainer = o.trainer;
    this.expBonus = 1.5;
  }

  get trainerName() { return this.trainer.cls ? `${this.trainer.cls} ${this.trainer.name}` : this.trainer.name; }

  intro() {
    const ev = [];
    ev.push({ type: 'text', text: `${this.trainerName} möchte kämpfen!` });
    ev.push({ type: 'text', text: `${this.trainerName} schickt ${displayName(this.wild.mon)} in den Kampf!` });
    ev.push({ type: 'text', text: `Los, ${displayName(this.ally.mon)}!` });
    ev.push(...this.partnerIntro());
    ev.push(...this.switchInAbility(this.ally, this.wild));
    ev.push(...this.switchInAbility(this.wild, this.ally));
    return ev;
  }

  snapshot() {
    return {
      ...super.snapshot(),
      kind: 'trainer',
      trainer: { name: this.trainerName, look: this.trainer.look, cls: this.trainer.cls, leader: !!this.trainer.leader },
      foeTeam: this.foeParty.map((m) => (m.hp > 0 ? 'ok' : 'down'))
    };
  }

  name(b) { return b === this.ally ? displayName(b.mon) : `Das gegnerische ${displayName(b.mon)}`; }
  get foeAdj() { return 'gegnerisch'; }

  act(action) {
    if (this.state === 'action' && action.type === 'run') return { events: [{ type: 'text', text: 'Vor einem Trainerkampf kann man nicht fliehen!' }] };
    if (this.state === 'action' && action.type === 'ball') return { events: [{ type: 'text', text: 'Der Trainer blockt den Ball ab. Man darf fremde Pokémon nicht fangen!' }] };
    return super.act(action);
  }

  // KI: waehlt meist die Attacke mit dem hoechsten erwarteten Schaden, manchmal eine Statusattacke.
  pickWildMove() {
    const usable = this.wild.mon.moves.filter((m) => m.pp > 0);
    if (!usable.length) return 'struggle';
    const lock = this.choiceLock(this.wild);
    if (lock) return lock;
    const target = species(this.ally.mon.speciesId).types;
    const own = species(this.wild.mon.speciesId).types;
    const scored = usable.map((m) => {
      const mv = MOVES[m.id];
      if (mv.cat === 'status') return { id: m.id, score: mv.simplified ? 1 : 18 + Math.random() * 20 };
      const eff = mv.type === '???' ? 1 : typeEffectiveness(mv.type, target);
      const stab = own.includes(mv.type) ? 1.5 : 1;
      return { id: m.id, score: (mv.power || 40) * eff * stab * ((mv.acc ?? 100) / 100) * (0.85 + Math.random() * 0.3) };
    });
    scored.sort((a, b) => b.score - a.score);
    return Math.random() < 0.85 ? scored[0].id : scored[rnd(scored.length)].id;
  }

  onFoeDefeated(ev) {
    const next = this.foeParty.find((m) => m.hp > 0);
    if (!next) {
      ev.push({ type: 'text', text: `Du hast ${this.trainerName} besiegt!` });
      return this.end('win', ev);
    }
    this.wild = makeBattler(next);
    this.participants = new Set([this.ally.mon.id]);
    ev.push({ type: 'text', text: `${this.trainerName} schickt ${displayName(next)} in den Kampf!` });
    ev.push({ type: 'foeSwitch', mon: { ...publicPokemon(next), moves: undefined, stats: undefined } });
    ev.push(...this.switchInAbility(this.wild, this.ally));
    this.shiftOffer = !this.partner && this.ally.mon.hp > 0 && this.party.some((m) => m.alive !== false && m.hp > 0 && m !== this.ally.mon);
  }
}
