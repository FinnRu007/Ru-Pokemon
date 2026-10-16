// Erweiterungen der Spiellogik wie in Platin: Begleiter im Kampf, wandernde Pokémon, Eier,
// Icognito-Formen und der Kampfturm mit Siegesserie. Wird in GameServer eingemischt.
import { MAPS } from '../../shared/data/maps.js';
import { DIRS, tileAt, FIELD, FIELD_NAMES, fieldFlags, bikeAllowed } from '../../shared/world.js';
import { POKEMON } from '../../shared/data/pokemon.js';
import { ITEMS } from '../../shared/data/items.js';
import { MOVES } from '../../shared/data/moves.js';
import { S2C } from '../../shared/protocol.js';
import { PARTNERS, ROAMERS, TOWER } from '../../shared/data/story8.js';
import { RIBBONS, DAY_RIBBONS, RIBBON_SHOP } from '../../shared/data/ribbons.js';
import { FURNITURE, FURNITURE_REQ_TEXT } from '../../shared/data/villa.js';
import { createPokemon, displayName, recalc, species } from './pokemonFactory.js';
import { TrainerBattle } from './battle.js';
import { DoubleBattle } from './double.js';

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
  // Fahrrad wie in Platin: aufsteigen und absteigen über den Beutel oder Taste R
  toggleBike(s) {
    const p = s.player;
    if (s.battle || s.script) return;
    if (!(p.items.bicycle > 0)) return this.notice(s, 'Du hast kein Fahrrad.', 'error');
    if (!p.flags.riding && !bikeAllowed(MAPS, p.map)) return this.notice(s, 'Hier kannst du nicht Fahrrad fahren.', 'error');
    if (!p.flags.riding && MAPS[p.map].tiles[p.y]?.[p.x] === '~') return this.notice(s, 'Auf dem Wasser geht das nicht.', 'error');
    if (p.flags.riding && p.map === 'route_206') return this.notice(s, 'Auf dem Radweg kannst du nicht absteigen.', 'error');
    this.setRiding(s, !p.flags.riding);
  },
  setRiding(s, on) {
    const p = s.player;
    p.flags.riding = !!on;
    this.sendProgress(s);
    this.broadcastMap(p.map, { t: S2C.PLAYER_STATE, player: this.publicPlayer(p) }, p.id);
  },
  onMapChange(s, oldMap) {
    const p = s.player;
    const d = p.partner && PARTNERS[p.partner];
    if (d && d.maps.includes(oldMap) && !d.maps.includes(p.map)) {
      p.partner = null;
      if (d.bye) this.notice(s, d.bye, 'dialog');
    }
    // In Gebäuden steigt man vom Fahrrad ab, in Höhlen nicht
    if (p.flags.riding && !bikeAllowed(MAPS, p.map)) this.setRiding(s, false);
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
      s.player.eggsHatched = (s.player.eggsHatched || 0) + 1;
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
      p.leagueWins = (p.leagueWins || 0) + 1;
      // Band des Sinnoh-Champs für alle Pokémon im Team (wie beim Eintrag in die Ruhmeshalle)
      this.giveRibbon(s, s.party.filter((m) => !m.egg && m.alive !== false).map((m) => m.id), 'sinnoh-champ');
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
  // Einzel (3 Pokémon), Doppel (4) und Multi (2 plus Partner) mit eigener Siegesserie je Art
  towerStep(s, step, sc, lines) {
    const p = s.player;
    const t = (p.tower ||= { streak: 0, best: 0, bp: 0 });
    t.modes ||= { single: { streak: t.streak || 0, best: t.best || 0 }, double: { streak: 0, best: 0 }, multi: { streak: 0, best: 0 } };
    const say = (text) => lines.push({ speaker: 'Empfang', text });
    const push = (steps) => sc.stack.push({ steps, i: 0 });
    const MODE_DE = { single: 'Einzelkampf', double: 'Doppelkampf', multi: 'Multi-Kampf' };
    const cur = () => t.modes[s.tower?.mode || 'single'];
    const wins = (n) => `${n} ${n === 1 ? 'Sieg' : 'Siegen'}`;
    const stop = () => { const m = cur(); m.best = Math.max(m.best, m.streak); m.streak = 0; t.streak = t.modes.single.streak; t.best = t.modes.single.best; s.tower = null; };
    switch (step.tower) {
      case 'record':
        say(`Längste Serien: Einzel ${t.modes.single.best}, Doppel ${t.modes.double.best}, Multi ${t.modes.multi.best}. Kampfpunkte: ${t.bp}.`);
        return;
      case 'shop': {
        const offers = (TOWER[step.list || 'shop'] || TOWER.shop).filter(([id]) => ITEMS[id]);
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
      case 'multi':
        lines.push({ speaker: 'Empfang', text: 'Mit wem möchtest du im Multi-Kampf antreten?' });
        push([{ choose: [...TOWER.partners.map(([n]) => n), 'Abbrechen'], branches: TOWER.partners.map((_, i) => [{ tower: 'start', mode: 'multi', partner: i }]) }]);
        return;
      case 'start': {
        const mode = step.mode || 'single';
        const size = { single: 3, double: 4, multi: 2 }[mode];
        const team = s.party.filter((m) => !m.egg && m.alive !== false).slice(0, size);
        if (team.length < size) { say(`Für den ${MODE_DE[mode]} brauchst du ${size} kampfbereite Pokémon.`); return; }
        // Kopien auf höchstens Level 50: dein echtes Team bleibt unberührt
        const copy = (m) => { const c = structuredClone(m); c.level = Math.min(c.level, TOWER.level); recalc(c); c.hp = c.stats.hp; c.status = null; for (const mv of c.moves) mv.pp = mv.maxPp; return c; };
        s.tower = { mode, team: team.map(copy), ids: team.map((m) => m.id), partner: mode === 'multi' ? TOWER.partners[step.partner || 0] : null };
        t.modes[mode].streak = 0;
        say(`${MODE_DE[mode]}: Es treten an ${team.map(displayName).join(', ')}${s.tower.partner ? ` zusammen mit ${s.tower.partner[0]}` : ''}. Bitte hier entlang!`);
        push([{ tower: 'battle' }]);
        return;
      }
      case 'battle':
        if (!s.tower) return;
        push([{ tower: 'after' }]);
        if (!this.startTowerBattle(s, cur().streak + 1)) { sc.stack.pop(); return; }
        sc.waiting = 'battle';
        return 'wait';
      case 'after': {
        if (!s.tower) return;
        const m = cur();
        if (sc.lastResult !== 'win') { say(`Schade! Deine Serie endet nach ${wins(m.streak)}.`); stop(); return; }
        m.streak++; m.best = Math.max(m.best, m.streak);
        t.wins = (t.wins || 0) + 1;
        if (s.tower.mode === 'single') { t.streak = m.streak; t.best = m.best; }
        for (const c of s.tower.team) { c.hp = c.stats.hp; c.status = null; for (const mv of c.moves) mv.pp = mv.maxPp; }
        const mode = s.tower.mode;
        if (mode === 'single' && m.streak === 21 && !p.flags.tower_silver) { p.flags.tower_silver = true; lines.push({ speaker: null, text: 'Du erhältst den Silberdruck von Turmherr Palmer!' }); }
        if (mode === 'single' && m.streak === 49 && !p.flags.tower_gold) { p.flags.tower_gold = true; lines.push({ speaker: null, text: 'Du erhältst den Golddruck von Turmherr Palmer!' }); }
        const ribbon = TOWER.ribbons[mode + m.streak];
        if (ribbon) {
          const got = this.giveRibbon(s, s.tower.ids, ribbon);
          if (got) lines.push({ speaker: 'Empfang', text: `Zur Erinnerung an diesen Rekord erhält dein Team das ${RIBBONS[ribbon].name}!` });
        }
        if (m.streak % TOWER.round === 0) {
          const won = TOWER.bp[Math.min(TOWER.bp.length - 1, m.streak / TOWER.round - 1)] + (mode === 'single' ? 0 : 1);
          t.bp += won;
          say(`Glückwunsch, ${m.streak} Siege in Folge! Du erhältst ${won} Kampfpunkte.`);
        } else say(`Sieg Nummer ${m.streak}! Dein Team wurde geheilt.`);
        this.sendProgress(s);
        push([{ choose: ['Weiter', 'Aufhören'], branches: [[{ tower: 'battle' }], [{ tower: 'quit' }]] }]);
        return;
      }
      case 'quit':
        say(`Du beendest die Herausforderung mit ${wins(cur().streak)} in Folge.`);
        stop();
        return;
    }
  },

  startTowerBattle(s, n) {
    const mode = s.tower.mode;
    const brain = mode === 'single' && TOWER.brain[n];
    const mk = (list) => list.map(([sp, lv]) => createPokemon(sp, lv, { metRoute: 'trainer' }));
    const randomTrainer = (count) => {
      const [cls, look] = pick(TOWER.classes);
      const pool = [...towerTier(n)];
      const foe = [];
      while (foe.length < count && pool.length) foe.push([pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id, TOWER.level]);
      return { name: pick(TOWER.names), cls, look, party: mk(foe) };
    };
    s.encounter = { route: 'trainer', counted: false };
    s.battleMeta = { tower: true, safe: true };
    const base = { id: crypto.randomUUID(), party: s.tower.team, route: 'trainer', items: {}, nuzlocke: false, onFaint: () => [] };
    if (mode === 'single') {
      let trainer; let foeParty;
      if (brain) { trainer = { name: 'Palmer', cls: 'Turmherr', look: 'leader', leader: true }; foeParty = mk(brain); }
      else { const r = randomTrainer(3); trainer = { name: r.name, cls: r.cls, look: r.look }; foeParty = r.party; }
      s.battle = new TrainerBattle({ ...base, foeParty, trainer });
    } else if (mode === 'double') {
      s.battle = new DoubleBattle({ ...base, kind: 'trainer', foes: [randomTrainer(4)] });
    } else {
      const [name, team] = s.tower.partner;
      s.battle = new DoubleBattle({ ...base, kind: 'trainer', foes: [randomTrainer(2), randomTrainer(2)], partner: { name, party: mk(team) } });
    }
    this.beginBattle(s);
    if (brain) this.send(s.ws, { t: S2C.NOTICE, text: 'Turmherr Palmer stellt sich dir!', kind: 'info' });
    return true;
  },

  // ---------------------------------------------------------------- Bänder
  // Gibt den Pokémon (IDs) ein Band, falls sie es noch nicht haben. Liefert die Anzahl neuer Bänder.
  giveRibbon(s, ids, ribbon) {
    let n = 0;
    for (const m of [...s.party, ...s.box]) {
      if (!ids.includes(m.id) || m.egg) continue;
      m.ribbons ||= [];
      if (m.ribbons.includes(ribbon)) continue;
      m.ribbons.push(ribbon); n++;
      this.repo.savePokemon(m);
    }
    if (n) this.sendParty(s);
    return n;
  },
  lead(s) { return s.party.find((m) => !m.egg && m.alive !== false); },
  dayKey(s) { const d = this.localDate(s); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; },

  // Kleine Story-Schritte dieses Updates: { x: 'name', ... }
  extraStep(s, step, sc, lines) {
    const p = s.player;
    const lead = this.lead(s);
    const say = (who, text) => lines.push({ speaker: who, text });
    switch (step.x) {
      case 'linkInvite': return this.linkInvite(s, step, say);
      case 'linkAnswer': return this.linkAnswer(s, step, say);
      case 'dayRibbon': {
        const r = DAY_RIBBONS[this.localDate(s).getDay()];
        if (!lead) return;
        if (lead.ribbons?.includes(r)) { say('Mona', `${displayName(lead)} hat das ${RIBBONS[r].name} schon. Komm an einem anderen Tag wieder!`); return; }
        this.giveRibbon(s, [lead.id], r);
        say('Mona', `Heute ist so ein Tag... Ich schenke ${displayName(lead)} das ${RIBBONS[r].name}.`);
        say(null, `${displayName(lead)} erhält das ${RIBBONS[r].name}!`);
        return;
      }
      case 'effortRibbon': {
        if (!lead) return;
        const total = Object.values(lead.evs || {}).reduce((a, b) => a + b, 0);
        if (lead.ribbons?.includes('effort')) { say('Junge Frau', `${displayName(lead)} trägt das Fleiß-Band. Es sieht toll aus!`); return; }
        if (total < 510) { say('Junge Frau', `${displayName(lead)} könnte noch fleißiger trainieren. Komm wieder, wenn es richtig hart gearbeitet hat!`); return; }
        this.giveRibbon(s, [lead.id], 'effort');
        say('Junge Frau', `Was für ein fleißiges Pokémon! ${displayName(lead)} hat das Fleiß-Band verdient.`);
        return;
      }
      case 'ribbonShop': {
        if (!lead) return;
        say('Band-Verein', `Möchtest du ${displayName(lead)} ein Band kaufen? Du hast ${p.money} ¥.`);
        sc.stack.push({ steps: [{ choose: [...RIBBON_SHOP.map(([id, price]) => `${RIBBONS[id].name} (${price} ¥)`), 'Nein danke'], branches: RIBBON_SHOP.map(([id, price]) => [{ x: 'buyRibbon', id, price }]) }], i: 0 });
        return;
      }
      case 'buyRibbon': {
        if (lead.ribbons?.includes(step.id)) { say('Band-Verein', `${displayName(lead)} hat dieses Band bereits.`); return; }
        if ((p.money || 0) < step.price) { say('Band-Verein', 'Leider reicht dein Geld dafür nicht.'); return; }
        p.money -= step.price;
        this.giveRibbon(s, [lead.id], step.id);
        this.sendProgress(s);
        say(null, `${displayName(lead)} erhält das ${RIBBONS[step.id].name}!`);
        return;
      }
      case 'berryMaster': {
        p.daily ||= {};
        if (p.daily.berry === this.dayKey(s)) { say('Beerenmeister', 'Heute habe ich dir schon eine Beere geschenkt. Komm morgen wieder!'); return; }
        p.daily.berry = this.dayKey(s);
        const pool = Object.entries(ITEMS).filter(([, it]) => it.kind === 'berry' && it.held?.berry).map(([id]) => id);
        const id = pick(pool);
        p.items[id] = (p.items[id] || 0) + 1;
        p.berries = (p.berries || 0) + 1;
        say('Beerenmeister', 'Hallo! Ich bin der Beerenmeister. Jeden Tag schenke ich Besuchern eine Beere.');
        say(null, `Du erhältst eine ${ITEMS[id].name}!`);
        this.sendParty(s);
        return;
      }
      case 'poketch': return this.poketchStep(s, { who: 'president', ...step }, sc, lines);
      case 'villaShop': {
        p.villa ||= ['table'];
        const offers = FURNITURE.filter(([id]) => !p.villa.includes(id));
        if (!offers.length) { say('Butler', 'Ihre Villa ist vollständig eingerichtet. Ganz wunderbar!'); return; }
        say('Butler', `Welches Möbelstück darf ich bestellen? Sie haben ${p.money} ¥.`);
        sc.stack.push({ steps: [{ choose: [...offers.map(([id, name, price]) => `${name} (${price} ¥)`), 'Zurück'], branches: offers.map(([id]) => [{ x: 'buyFurniture', id }]) }], i: 0 });
        return;
      }
      case 'buyFurniture': {
        const f = FURNITURE.find(([id]) => id === step.id);
        if (!f) return;
        const [id, name, price, req] = f;
        if (req && !this.villaReq(s, req)) { say('Butler', FURNITURE_REQ_TEXT[req] || 'Das ist noch nicht lieferbar.'); return; }
        if ((p.money || 0) < price) { say('Butler', 'Verzeihung, dafür reicht Ihr Geld leider nicht.'); return; }
        p.money -= price;
        p.villa.push(id);
        p.flags['villa_' + id] = true;
        this.sendProgress(s);
        say('Butler', `Sehr wohl. ${name} wird sofort geliefert und aufgestellt.`);
        return;
      }
      case 'villaLook': {
        p.villa ||= ['table'];
        const names = FURNITURE.filter(([id]) => p.villa.includes(id)).map(([, n]) => n);
        say(null, `In der Villa stehen: ${names.join(', ')}.`);
        return;
      }
      case 'mysteryGift': {
        if (p.flags.gift_regigigas) { say('Bote', 'Für dich liegt im Moment nichts weiter vor. Schau ein anderes Mal wieder vorbei!'); return; }
        say('Bote', 'Hallo! Ich bin vom Geheimgeschehen. Ich habe ein Geschenk für dich: ein besonderes Regigigas!');
        const full = s.party.length >= 6;
        const mon = createPokemon(486, 100, { ownerId: p.id, runId: p.runId, metRoute: 'gift' });
        if (full) s.box.push(mon); else s.party.push(mon);
        this.reslot(s);
        this.repo.savePokemon(mon);
        this.dexMark(s, 486, true);
        p.flags.gift_regigigas = true;
        say(null, `Du erhältst Regigigas!${full ? ' Es wurde in die Box geschickt.' : ''}`);
        say('Bote', 'Mit Regigigas im Team öffnen sich vielleicht die alten Ruinen der Titanen.');
        this.sendParty(s);
        this.sendProgress(s);
        return;
      }
    }
  },

  // Bedingungen für die Möbel der Villa
  villaReq(s, req) {
    const p = s.player;
    if (req === 'league10') return (p.leagueWins || 0) >= 10;
    if (req === 'tower50') return (p.tower?.wins || 0) >= 50;
    if (req === 'berries50') return (p.berries || 0) >= 50;
    if (req === 'eggs30') return (p.eggsHatched || 0) >= 30 || Object.keys(p.dex?.caught || {}).length >= 300;
    if (req === 'steps300k') return (p.steps || 0) >= 300000;
    if (p.flags[req]) return true;
    return (p.villa || []).includes(req);
  },

  // Feldhindernis mit Orden, aber ohne passendes Pokémon im Team: Hinweis wie in Platin
  fieldHint(s, dir) {
    const p = s.player;
    const d = DIRS[dir];
    const t = d && tileAt(MAPS[p.map], p.x + d.dx, p.y + d.dy);
    const need = FIELD[t];
    if (!need || !p.flags[need] || fieldFlags(p.flags, s.party)[need]) return;
    const key = `${p.map},${p.x},${p.y},${dir}`;
    if (s.lastFieldHint === key) return;
    s.lastFieldHint = key;
    this.notice(s, `Hier könnte ein Pokémon ${FIELD_NAMES[need]} einsetzen. Keines in deinem Team beherrscht die Attacke.`, 'info');
  },

  // Items geben und nehmen
  holdItem(s, msg) {
    if (s.battle) return;
    const mon = s.party.find((m) => m.id === msg.pokemonId);
    if (!mon || mon.egg) return;
    const p = s.player;
    const want = msg.item || null;
    if (want && (!ITEMS[want]?.hold || !(p.items[want] > 0))) return this.notice(s, 'Dieses Item kann man nicht tragen lassen.', 'error');
    if (mon.item) { p.items[mon.item] = (p.items[mon.item] || 0) + 1; this.notice(s, `Du nimmst ${displayName(mon)} ${ITEMS[mon.item]?.name || mon.item} ab.`); }
    mon.item = null;
    if (want) { p.items[want]--; mon.item = want; this.notice(s, `${displayName(mon)} trägt jetzt ${ITEMS[want].name}.`); }
    this.repo.savePokemon(mon);
    this.sendParty(s);
  }
};
