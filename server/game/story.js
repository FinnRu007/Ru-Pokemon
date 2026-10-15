// Fuehrt Story-Skripte serverseitig aus: Dialoge (mit Token), Flags, Gegenstaende, Kaempfe und
// Ausloeser. Pro Sitzung laeuft hoechstens ein Skript; waehrenddessen ist die Bewegung gesperrt.
import { SCRIPTS, TRAINERS, TRIGGERS, cond, visibleNpcs, npcAt } from '../../shared/data/story.js';
import { ITEMS, HM_FLAGS } from '../../shared/data/items.js';
import { MOVES } from '../../shared/data/moves.js';
import { MAPS } from '../../shared/data/maps.js';
import { DIRS, tileAt, SOLID } from '../../shared/world.js';
import { S2C } from '../../shared/protocol.js';

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export class StoryRunner {
  constructor(game) { this.game = game; }

  flags(s) { return (s.player.flags ||= {}); }

  start(s, steps, ctx = {}) {
    if (s.script || s.battle) return false;
    s.script = { stack: [{ steps, i: 0 }], ctx, waiting: null, token: 0, ask: null };
    this.game.send(s.ws, { t: S2C.SCRIPT, active: true });
    this.run(s);
    return true;
  }

  runNamed(s, name, ctx) { return SCRIPTS[name] ? this.start(s, SCRIPTS[name], ctx) : false; }

  run(s) {
    const sc = s.script;
    if (!sc) return;
    const lines = [];
    for (;;) {
      const frame = sc.stack[sc.stack.length - 1];
      if (!frame) break;
      if (frame.i >= frame.steps.length) { sc.stack.pop(); continue; }
      const step = frame.steps[frame.i];
      if (Array.isArray(step)) { lines.push({ speaker: step[0], text: step[1] }); frame.i++; continue; }
      if (step.ask || step.choose) { frame.i++; return this.dialog(s, lines, step); }
      // Alle anderen Schritte wirken erst, wenn die Zeilen davor gelesen wurden
      if (lines.length) return this.dialog(s, lines);
      frame.i++;
      if (this.exec(s, step, lines, sc) === 'wait') return;
    }
    if (lines.length) return this.dialog(s, lines);
    this.finish(s);
  }

  exec(s, step, lines, sc) {
    const g = this.game; const p = s.player; const flags = this.flags(s);
    if (step.flag) {
      flags[step.flag] = true;
      // Feldattacke erhalten: die passende VM kommt in den Beutel
      if (HM_FLAGS[step.flag] && !p.items[HM_FLAGS[step.flag]]) { p.items[HM_FLAGS[step.flag]] = 1; g.sendParty(s); }
      g.sendProgress(s); return;
    }
    if (step.service) { g.openService(s, step); sc.waiting = 'service'; return 'wait'; }
    if (step.unflag) { delete flags[step.unflag]; g.sendProgress(s); return; }
    if (step.give) {
      const n = step.count || 1;
      p.items[step.give] = (p.items[step.give] || 0) + n;
      lines.push({ speaker: null, text: `Du erhältst ${n > 1 ? n + 'x ' : ''}${ITEMS[step.give]?.name || step.give}!` });
      g.sendParty(s);
      return;
    }
    if (step.pokemon) { lines.push({ speaker: null, text: g.giftPokemon(s, step.pokemon, step.level || 5) }); return; }
    if (step.find) {
      const it = ITEMS[step.find];
      p.items[step.find] = (p.items[step.find] || 0) + 1;
      const pocket = { med: 'Medizin', ball: 'Bälle', tm: 'TM/VM', battle: 'Kampf-Items', key: 'Basis-Items' }[it?.kind] || 'Items';
      lines.push({ speaker: null, text: `${p.name} hat ${it?.kind === 'tm' ? `${it.name} ${MOVES[it.move]?.name || ''}` : it?.name || step.find} gefunden!` });
      lines.push({ speaker: null, text: `${p.name} verstaut es in der Tasche „${pocket}“.` });
      g.sendParty(s);
      return;
    }
    if (step.money) { p.money = (p.money || 0) + step.money; lines.push({ speaker: null, text: `Du erhältst ${step.money} ¥.` }); g.sendProgress(s); return; }
    if (step.heal) { g.healParty(s, step.heal === 'center'); return; }
    if (step.emote) { g.send(s.ws, { t: S2C.NPC_EMOTE, id: step.emote }); return; }
    if (step.back) { g.pushBack(s); return; }
    if (step.warp) { g.teleport(s, step.warp[0], step.warp[1], step.warp[2], step.warp[3] || 'down'); return; }
    if (step.legend) {
      // Legendaeres Pokemon: echter Wildkampf (fangbar, zaehlt fuer Nuzlocke auf dieser Karte)
      if (!g.startWildBattle(s, step.legend, step.level || 50, p.map, { script: true })) return;
      sc.waiting = 'battle';
      return 'wait';
    }
    if (step.if) { sc.stack.push({ steps: (cond(flags, step.if) ? step.then : step.else) || [], i: 0 }); return; }
    if (step.ifOwn) {
      const own = [...s.party, ...s.box].some((m) => m.speciesId === step.ifOwn);
      sc.stack.push({ steps: (own ? step.then : step.else) || [], i: 0 });
      return;
    }
    if (step.starter) {
      if (p.starterChosen) return;
      sc.waiting = 'starter';
      g.sendStarterChoice(s);
      return 'wait';
    }
    if (step.wild) {
      if (!g.startScriptWild(s, step.wild, step.level || 3)) return;
      sc.waiting = 'battle';
      return 'wait';
    }
    if (step.battle) {
      if (!g.startTrainerBattle(s, step.battle)) return;
      sc.waiting = 'battle';
      return 'wait';
    }
  }

  dialog(s, lines, ask) {
    const sc = s.script;
    sc.waiting = 'dialog';
    sc.token++;
    sc.ask = ask || null;
    this.game.send(s.ws, {
      t: S2C.DIALOG, token: sc.token, lines,
      choices: ask ? (ask.ask || ask.choose).map((label, value) => ({ label, value })) : null,
      face: sc.ctx.face || null
    });
  }

  dialogDone(s, msg) {
    const sc = s.script;
    if (!sc || sc.waiting !== 'dialog' || Number(msg.token) !== sc.token) return;
    sc.waiting = null;
    if (sc.ask) {
      const c = Number(msg.choice);
      const branch = sc.ask.branches ? sc.ask.branches[c] : c === 0 ? sc.ask.yes : sc.ask.no;
      sc.ask = null;
      sc.stack.push({ steps: branch || [], i: 0 });
    }
    this.run(s);
  }

  serviceDone(s) {
    const sc = s.script;
    if (sc?.waiting !== 'service') return;
    sc.waiting = null;
    this.run(s);
  }

  starterChosen(s) {
    const sc = s.script;
    if (sc?.waiting !== 'starter') return;
    sc.waiting = null;
    this.run(s);
  }

  // Nach Kampfende: weiter im Skript oder (Niederlage in einem echten Kampf) abbrechen.
  battleEnded(s, result, meta) {
    const sc = s.script;
    if (!sc || sc.waiting !== 'battle') return;
    sc.waiting = null;
    if (result === 'win' || meta?.safe || result === 'caught' || (meta?.script && result === 'fled')) return this.run(s);
    this.finish(s);
  }

  finish(s) {
    if (!s.script) return;
    s.script = null;
    this.game.savePlayerNow(s);
    this.game.send(s.ws, { t: S2C.SCRIPT, active: false });
  }

  // ---------------------------------------------------------------- Ausloeser
  // Nach jedem Schritt: Bodenausloeser, dann Sichtlinie der Trainer. Liefert true, wenn etwas startet.
  afterMove(s) {
    if (s.script || s.battle) return true;
    const p = s.player; const flags = this.flags(s);
    const trg = (TRIGGERS[p.map] || []).find((t) => p.x >= t.x && p.x < t.x + (t.w || 1) && p.y >= t.y && p.y < t.y + (t.h || 1) && cond(flags, t.when));
    if (trg) return this.runNamed(s, trg.script);
    const spotter = this.spottedBy(s);
    if (spotter) return this.start(s, [{ emote: spotter.id }, ...TRAINERS[spotter.trainer].intro, { battle: spotter.trainer }], { face: { id: spotter.id, dir: spotter.dir } });
    return false;
  }

  spottedBy(s) {
    const p = s.player; const flags = this.flags(s); const map = MAPS[p.map];
    for (const n of visibleNpcs(p.map, flags)) {
      const tr = n.trainer && TRAINERS[n.trainer];
      if (!tr?.sight || flags['beat_' + n.trainer] || !s.party.some((m) => m.alive !== false && m.hp > 0)) continue;
      const d = DIRS[n.dir];
      for (let k = 1; k <= tr.sight; k++) {
        const x = n.x + d.dx * k; const y = n.y + d.dy * k;
        if (x === p.x && y === p.y) return n;
        const t = tileAt(map, x, y);
        if (t === null || SOLID.has(t) || npcAt(p.map, x, y, flags)) break;
      }
    }
    return null;
  }

  // Ansprechen eines NPCs. Liefert true, wenn ein NPC vor dem Spieler stand.
  talk(s, x, y) {
    const p = s.player; const flags = this.flags(s);
    const n = npcAt(p.map, x, y, flags);
    if (!n) return false;
    const ctx = { face: { id: n.id, dir: OPPOSITE[p.dir] } };
    if (n.trainer) {
      const tr = TRAINERS[n.trainer];
      if (flags['beat_' + n.trainer]) return this.start(s, tr.after || tr.win || [], ctx);
      if (!s.party.some((m) => m.alive !== false && m.hp > 0)) return this.start(s, [[n.name, 'Komm wieder, wenn du ein kampfbereites Pokémon hast.']], ctx);
      return this.start(s, [...tr.intro, { battle: n.trainer }], ctx);
    }
    if (typeof n.talk === 'string') return this.runNamed(s, n.talk, ctx);
    if (Array.isArray(n.talk)) return this.start(s, n.talk, ctx);
    return this.start(s, [[n.name, '...']], ctx);
  }
}
