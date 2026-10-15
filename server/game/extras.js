// Erweiterungen der Spiellogik wie in Platin: Begleiter im Kampf, wandernde Pokémon, Eier,
// Icognito-Formen und der Kampfturm mit Siegesserie. Wird in GameServer eingemischt.
import { MAPS } from '../../shared/data/maps.js';
import { POKEMON } from '../../shared/data/pokemon.js';
import { ITEMS } from '../../shared/data/items.js';
import { MOVES } from '../../shared/data/moves.js';
import { S2C } from '../../shared/protocol.js';
import { PARTNERS, ROAMERS, TOWER } from '../../shared/data/story8.js';
import { createPokemon, displayName, recalc, species } from './pokemonFactory.js';
import { TrainerBattle } from './battle.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
// Die Kampfzone gehört nicht zum Gebiet der wandernden Pokémon
const BATTLE_ZONE = new Set(['north_sea', 'fight_area', 'route_225', 'survival_area', 'route_226', 'route_227', 'route_228', 'route_229', 'resort_area', 'route_230']);
let roamPool = null;
export const roamMaps = () => (roamPool ||= Object.entries(MAPS).filter(([id, m]) => !m.indoor && m.encounters?.grass?.length && !BATTLE_ZONE.has(id)).map(([id]) => id));

// Icognito: 26 Buchstaben, ! und ? erst nach dem Titel
export const UNOWN_FORMS = 'abcdefghijklmnopqrstuvwxyz'.split('');
export const EGG_STEPS = { 447: 25 * 256 };
const LEGENDS = new Set([144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493]);
const bst = (sp) => sp.base.reduce((a, b) => a + b, 0);
let towerPool = null;
function towerTier(n) {
  towerPool ||= Object.values(POKEMON).filter((sp) => !LEGENDS.has(sp.id) && !sp.evo && !sp.evos?.length && bst(sp) >= 400);
  const ranges = [[400, 480], [450, 520], [490, 560], [500, 999]];
  const [lo, hi] = ranges[Math.min(3, Math.floor((n - 1) / TOWER.round))];
  const list = towerPool.filter((sp) => bst(sp) >= lo && bst(sp) <= hi);
  return list.length >= 3 ? list : towerPool;
}

export const Extras = {
  // ---------------------------------------------------------------- Uhrzeit des Spielers
  // Wie die Uhr im DS: Tag und Nacht richten sich nach der Uhrzeit auf dem Gerät des Spielers
  localDate(s) {
    if (s?.tz == null) return new Date();
    const d = new Date(Date.now() - s.tz * 60000);
    return { getHours: () => d.getUTCHours(), getMinutes: () => d.getUTCMinutes(), getDay: () => d.getUTCDay(), getDate: () => d.getUTCDate(), getMonth: () => d.getUTCMonth(), getFullYear: () => d.getUTCFullYear() };
  },
  hourFor(s) { return this.localDate(s).getHours(); },

  // ---------------------------------------------------------------- Begleiter
  setPartner(s, id) {
    s.player.partner = id && PARTNERS[id] ? id : null;
  },
  // Partner für diesen Kampf: fest beim Doppelkampf (tr.partner), sonst der aktive Begleiter auf seinen Karten
  partnerFor(s, tr = null) {
    const p = s.player;
    const id = tr?.partner || (p.partner && PARTNERS[p.partner]?.maps.includes(p.map) ? p.partner : null);
    const d = id && PARTNERS[id];
    if (!d) return null;
    const party = d.party.map(([sp, lv]) => createPokemon(sp, lv, { metRoute: 'partner', shiny: false }));
    return { id, name: d.name, party, mon: party[0] };
  },
  onMapChange(s, oldMap) {
    const p = s.player;
    const d = p.partner && PARTNERS[p.partner];
    if (d && d.maps.includes(oldMap) && !d.maps.includes(p.map)) {
      p.partner = null;
      if (d.bye) this.notice(s, d.bye, 'dialog');
    }
    // Wandernde Pokémon wechseln die Route, sobald du die Karte wechselst
    for (const r of Object.values(p.roamers || {})) if (!r.defeated) r.map = pick(roamMaps());
  },

  // ---------------------------------------------------------------- Wandernde Pokémon
  startRoaming(s, speciesId) {
    const p = s.player;
    (p.roamers ||= {})[speciesId] = { level: ROAMERS[speciesId] || 50, hp: null, status: null, map: pick(roamMaps()), defeated: false };
    this.dexMark(s, speciesId);
  },
  roamerHere(s) {
    const p = s.player;
    const hit = Object.entries(p.roamers || {}).filter(([, r]) => !r.defeated && r.map === p.map);
    return hit.length && Math.random() < 0.5 ? Number(pick(hit)[0]) : null;
  },
  makeRoamer(s, speciesId) {
    const r = s.player.roamers[speciesId];
    const mon = createPokemon(speciesId, r.level, { metRoute: s.player.map });
    if (r.ivs) { mon.ivs = r.ivs; mon.nature = r.nature; mon.shiny = r.shiny; mon.gender = r.gender; recalc(mon); } else { r.ivs = mon.ivs; r.nature = mon.nature; r.shiny = mon.shiny; r.gender = mon.gender; }
    if (r.hp != null) mon.hp = Math.max(1, Math.min(mon.stats.hp, r.hp));
    mon.status = r.status || null;
    return mon;
  },

  // ---------------------------------------------------------------- Eier
  giftEgg(s, speciesId) {
    const mon = createPokemon(speciesId, 1, { ownerId: s.player.id, runId: s.player.runId, metRoute: 'egg' });
    Object.assign(mon, { egg: true, eggSteps: EGG_STEPS[speciesId] || 20 * 256, hp: 0 });
    const full = s.party.length >= 6;
    if (full) s.box.push(mon); else s.party.push(mon);
    this.reslot(s);
    this.repo.savePokemon(mon);
    this.sendParty(s);
    return 'Du erhältst ein Ei!' + (full ? ' Das Ei wurde in die Box geschickt.' : '');
  },
  // Jeder Schritt bringt Eier im Team dem Schlüpfen näher (Flammkörper und Magmapanzer doppelt so schnell)
  eggStep(s) {
    const eggs = s.party.filter((m) => m.egg);
    if (!eggs.length) return;
    const fast = s.party.some((m) => !m.egg && m.alive !== false && ['flame-body', 'magma-armor'].includes(m.ability));
    for (const m of eggs) {
      m.eggSteps -= fast ? 2 : 1;
      if (m.eggSteps > 0) { if (m.eggSteps % 64 === 0) this.repo.savePokemon(m); continue; }
      m.egg = false; delete m.eggSteps;
      recalc(m); m.hp = m.stats.hp;
      this.repo.savePokemon(m);
      this.dexMark(s, m.speciesId, true);
      this.notice(s, `Oh? Das Ei bewegt sich! Aus dem Ei ist ${species(m.speciesId).name} geschlüpft!`, 'dialog');
      this.sendParty(s);
    }
  },

  // Icognito bekommt einen zufälligen Buchstaben
  applyForm(mon, flags) {
    if (mon.speciesId !== 201) return mon;
    mon.form = pick(flags?.champion ? [...UNOWN_FORMS, 'exclamation', 'question'] : UNOWN_FORMS);
    return mon;
  },

  // ---------------------------------------------------------------- Nach dem Kampf
  afterBattleExtras(s, b, result, meta, extra) {
    const p = s.player;
    if (meta?.roamer) {
      const r = p.roamers?.[meta.roamer];
      if (r) {
        if (result === 'caught') delete p.roamers[meta.roamer];
        else if (result === 'win') { r.defeated = true; extra.push(`${species(meta.roamer).name} ist verschwunden. Vielleicht kehrt es zurück, wenn du die Top Vier erneut besiegst.`); }
        else { r.hp = b.wild.mon.hp; r.status = b.wild.mon.status; r.map = pick(roamMaps()); }
      }
    }
    // Neuer Eintrag in der Ruhmeshalle: besiegte Wanderer kehren zurück
    if (result === 'win' && meta?.trainerId === 'champ_cynthia') {
      for (const r of Object.values(p.roamers || {})) if (r.defeated) Object.assign(r, { defeated: false, hp: null, status: null, map: pick(roamMaps()) });
    }
    // Begleiter heilen dein Team nach jedem Kampf
    const d = b.partner && PARTNERS[p.partner];
    if (d?.heal && result !== 'lose' && d.maps.includes(p.map)) {
      this.healParty(s, false);
      extra.push(`${d.name} hat dein Team geheilt.`);
    }
  },

  // ---------------------------------------------------------------- Kampfturm
  towerStep(s, step, sc, lines) {
    const p = s.player;
    const t = (p.tower ||= { streak: 0, best: 0, bp: 0 });
    const say = (text) => lines.push({ speaker: 'Empfang', text });
    const push = (steps) => sc.stack.push({ steps, i: 0 });
    switch (step.tower) {
      case 'record':
        say(`Deine längste Siegesserie: ${t.best}. Kampfpunkte: ${t.bp}.`);
        return;
      case 'shop': {
        const offers = TOWER.shop.filter(([id]) => ITEMS[id]);
        const label = ([id, price]) => `${ITEMS[id].name}${ITEMS[id].kind === 'tm' ? ' ' + (MOVES[ITEMS[id].move]?.name || '') : ''} (${price} KP)`;
        lines.push({ speaker: 'Tausch', text: `Du hast ${t.bp} Kampfpunkte.` });
        push([{ choose: [...offers.map(label), 'Zurück'], branches: offers.map(([item, price]) => [{ tower: 'buy', item, price }]) }]);
        return;
      }
      case 'buy':
        if (t.bp < step.price) { lines.push({ speaker: 'Tausch', text: 'Dafür hast du nicht genug Kampfpunkte.' }); return; }
        t.bp -= step.price;
        p.items[step.item] = (p.items[step.item] || 0) + 1;
        lines.push({ speaker: null, text: `Du erhältst ${ITEMS[step.item].name}! Übrig: ${t.bp} Kampfpunkte.` });
        this.sendParty(s);
        return;
      case 'start': {
        const team = s.party.filter((m) => !m.egg && m.alive !== false).slice(0, 3);
        if (team.length < 3) { say('Du brauchst drei kampfbereite Pokémon für den Kampfturm.'); return; }
        // Kopien auf höchstens Level 50: dein echtes Team bleibt unberührt
        s.tower = { team: team.map((m) => { const c = structuredClone(m); c.level = Math.min(c.level, TOWER.level); recalc(c); c.hp = c.stats.hp; c.status = null; for (const mv of c.moves) mv.pp = mv.maxPp; return c; }) };
        t.streak = 0;
        say(`Es treten an: ${team.map(displayName).join(', ')}. Bitte hier entlang!`);
        push([{ tower: 'battle' }]);
        return;
      }
      case 'battle':
        if (!s.tower) return;
        push([{ tower: 'after' }]);
        if (!this.startTowerBattle(s, t.streak + 1)) { sc.stack.pop(); return; }
        sc.waiting = 'battle';
        return 'wait';
      case 'after': {
        if (!s.tower) return;
        if (sc.lastResult !== 'win') {
          say(`Schade! Deine Serie endet nach ${t.streak} ${t.streak === 1 ? 'Sieg' : 'Siegen'}.`);
          t.best = Math.max(t.best, t.streak); t.streak = 0; s.tower = null;
          return;
        }
        t.streak++; t.best = Math.max(t.best, t.streak);
        for (const c of s.tower.team) { c.hp = c.stats.hp; c.status = null; for (const mv of c.moves) mv.pp = mv.maxPp; }
        if (t.streak === 21 && !p.flags.tower_silver) { p.flags.tower_silver = true; lines.push({ speaker: null, text: 'Du erhältst den Silberdruck von Turmherr Palmer!' }); }
        if (t.streak === 49 && !p.flags.tower_gold) { p.flags.tower_gold = true; lines.push({ speaker: null, text: 'Du erhältst den Golddruck von Turmherr Palmer!' }); }
        if (t.streak % TOWER.round === 0) {
          const won = TOWER.bp[Math.min(TOWER.bp.length - 1, t.streak / TOWER.round - 1)];
          t.bp += won;
          say(`Glückwunsch, ${t.streak} Siege in Folge! Du erhältst ${won} Kampfpunkte.`);
        } else say(`Sieg Nummer ${t.streak}! Dein Team wurde geheilt.`);
        this.sendProgress(s);
        push([{ choose: ['Weiter', 'Aufhören'], branches: [[{ tower: 'battle' }], [{ tower: 'quit' }]] }]);
        return;
      }
      case 'quit':
        say(`Du beendest die Herausforderung mit ${t.streak} ${t.streak === 1 ? 'Sieg' : 'Siegen'} in Folge.`);
        t.best = Math.max(t.best, t.streak); t.streak = 0; s.tower = null;
        return;
    }
  },

  startTowerBattle(s, n) {
    const brain = TOWER.brain[n];
    let trainer; let foe;
    if (brain) {
      trainer = { name: 'Palmer', cls: 'Turmherr', look: 'leader', leader: true };
      foe = brain;
    } else {
      const [cls, look] = pick(TOWER.classes);
      trainer = { name: pick(TOWER.names), cls, look };
      const pool = [...towerTier(n)];
      foe = [];
      while (foe.length < 3 && pool.length) foe.push([pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id, TOWER.level]);
    }
    const foeParty = foe.map(([sp, lv]) => createPokemon(sp, lv, { metRoute: 'trainer' }));
    s.encounter = { route: 'trainer', counted: false };
    s.battleMeta = { tower: true, safe: true };
    s.battle = new TrainerBattle({
      id: crypto.randomUUID(), party: s.tower.team, foeParty, route: 'trainer', items: {},
      trainer, nuzlocke: false, onFaint: () => []
    });
    this.beginBattle(s);
    if (brain) this.send(s.ws, { t: S2C.NOTICE, text: 'Turmherr Palmer stellt sich dir!', kind: 'info' });
    return true;
  }
};
