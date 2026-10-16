// Kampfoberflaeche: spielt Server-Ereignisse nacheinander ab und sendet Aktionen.
import { showLevelStats } from './levelStats.js';
import { ITEMS } from '/shared/data/items.js';
import { monsterDataUrl, typeBadge, itemIcon, trainerImage, hasReal } from './art/monsters.js';
import { terrainImage } from './art/realTerrain.js';
import { characterSheet } from './art/characters.js';
import { BattleFx, battleTransition, spriteEl } from './battleFx.js';
import { audio } from './audio.js';
import { options, textStep, textPause } from './options.js';
const $ = (id) => document.getElementById(id);
const STATUS = { par: ['PAR', '#c9a400'], slp: ['SLF', '#7a7a7a'], psn: ['GIF', '#a040a0'], tox: ['GIF', '#702070'], brn: ['BRT', '#e05a2a'], frz: ['GFR', '#4bb3d6'] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEYS = ['ally', 'ally2', 'foe', 'foe2'];
const boxEl = (key) => $(key.startsWith('ally') ? 'allyBox' + (key === 'ally2' ? '2' : '') : 'foeBox' + (key === 'foe2' ? '2' : ''));
const isAllyKey = (key) => key.startsWith('ally');

// Kampfmusik wie in Platin: nach Trainerklasse, bei wilden Pokemon nach Legendaeren
const LEGENDS = new Set([144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386, 485, 486, 487, 488, 489, 490, 491, 492, 493]);
const CLASS_KIND = { 'Top Vier': 'elite', Champ: 'champion', Rivale: 'rival', 'Team Galaktik': 'galactic', Commander: 'commander', 'Galaktik-Boss': 'boss' };
function foeKindOf(s, leader) {
  if (s.kind === 'trainer') return CLASS_KIND[s.trainer?.cls] || (leader ? 'leader' : 'trainer');
  const id = (s.foe || s.foe2)?.speciesId;
  if (id >= 480 && id <= 482) return 'lakes';
  if (id === 483 || id === 484) return 'creation';
  return LEGENDS.has(id) ? 'legend' : 'wild';
}

export class BattleUI {
  constructor(net, manifest, hooks) {
    this.net = net;
    this.m = manifest;
    this.hooks = hooks; // { onEnd(), log(text, cls), onLearnPrompt(ev) }
    this.state = null;
    this.queue = [];
    this.playing = false;
    this.busy = false;
    this.skip = false;
    this.root = $('battle');
    this.fx = new BattleFx(this.root.querySelector('.field'));
    this.intro = null;
    this.root.addEventListener('click', () => { this.skip = true; });
    addEventListener('keydown', (e) => { if (!this.root.classList.contains('hidden') && ['KeyZ', 'Enter', 'Space'].includes(e.code)) this.skip = true; });
  }

  get active() { return !!this.shown; }

  start(msg) {
    this.state = msg.state;
    this.pendingEnd = null;
    this.won = false;
    const s = this.state;
    const leader = s.kind === 'trainer' && (s.trainer?.leader || s.trainer?.look === 'leader');
    audio.sfx('encounter');
    this.foeKind = foeKindOf(s, leader);
    audio.music('battle_' + this.foeKind);
    this.intro = (async () => {
      this.shown = true;
      await battleTransition($('stage'), s.kind);
      this.fx.clear();
      for (const k of KEYS) spriteEl(k).classList.remove('fainted', 'absorb', 'flash', 'lunge', 'hit', 'empty');
      $('allySprite').classList.add('waiting'); $('allySprite2').classList.add('waiting');
      this.root.classList.toggle('double', !!s.double);
      this.root.classList.remove('hidden');
      this.renderBoxes(s);
      this.renderSprites(s);
      this.renderTerrain();
      this.menu(null);
      const tr = $('trainerSprite'); const tr2 = $('trainerSprite2');
      const foeKeys = ['foe', 'foe2'].filter((k) => s[k]);
      tr2.classList.add('hidden');
      if (s.kind === 'trainer' && s.trainer) {
        // Trainerpaar: beide Trainer stehen nebeneinander
        const looks = s.trainer.looks || [s.trainer.look];
        [tr, tr2].slice(0, looks.length).forEach((el, i) => {
          const real = trainerImage({ ...s.trainer, look: looks[i] });
          el.style.backgroundImage = `url(${real || trainerUrl(looks[i])})`;
          el.classList.toggle('real', !!real);
          el.classList.remove('hidden', 'leave');
        });
        for (const k of foeKeys) spriteEl(k).classList.add('waiting');
        await this.say(`${s.trainer.name} ${looks.length > 1 ? 'möchten' : 'möchte'} kämpfen!`, 1300, false);
        tr.classList.add('leave'); tr2.classList.add('leave');
        await sleep(350);
        for (const k of foeKeys) { spriteEl(k).classList.remove('waiting'); this.fx.burst(this.fx.center(k), { c: ['#ffffff', '#fff0b0'], shape: 'star' }, 10); }
        audio.sfx('poof');
      } else {
        tr.classList.add('hidden');
        await sleep(450);
      }
      for (const k of foeKeys) { audio.sfx('cry', s[k].speciesId); await sleep(450); }
      await sleep(150);
      for (const k of ['ally2', 'ally'].filter((x) => s[x])) { await this.fx.sendOut({ sfx: (n) => audio.sfx(n) }, k); audio.sfx('cry', s[k].speciesId); }
      tr.classList.add('hidden'); tr2.classList.add('hidden');
    })();
    this.enqueue(msg.events, msg.state);
  }

  enqueue(events, state) {
    this.queue.push({ events, state });
    if (!this.playing) this.play();
  }

  end(msg) { this.pendingEnd = msg; if (!this.playing) this.finish(); }

  async play() {
    this.playing = true;
    this.menu(null);
    if (this.intro) { await this.intro; this.intro = null; }
    while (this.queue.length) {
      const { events, state } = this.queue.shift();
      for (let i = 0; i < events.length; i++) await this.playEvent(events[i], events.slice(i + 1, i + 4));
      if (state) { this.state = state; this.renderBoxes(state); this.renderSprites(state); }
    }
    this.playing = false;
    if (this.pendingEnd) return this.finish();
    if (this.state && this.state.state === 'switch') return this.partyMenu(true);
    if (this.state && this.state.state === 'action') {
      if (this.state.shiftOffer && options.battleStyle === 'shift' && this.shiftFor !== this.state.foe.id) return this.shiftPrompt();
      this.beginTurn();
    }
  }
  // Kampfstil Wechsel: wie in Platin vor dem naechsten Gegner fragen
  shiftPrompt() {
    this.shiftFor = this.state.foe.id;
    $('battleText').textContent = `${this.state.trainer?.name || 'Der Trainer'} setzt ${this.state.foe.name} ein. Möchtest du dein Pokémon wechseln?`;
    this.menu([
      { label: 'Ja', color: '#3fa34d', fn: () => this.partyMenu(false, true) },
      { label: 'Nein', color: '#d9534f', fn: () => this.mainMenu() }
    ]);
  }

  async say(text, ms = 900, log = true) {
    const el = $('battleText');
    if (log) this.hooks.log(text, 'battle');
    this.skip = false;
    // Schreibmaschine wie im Original, Aktionstaste zeigt sofort alles
    const [step, tick] = textStep();
    for (let n = step; n < text.length && !this.skip; n += step) { el.textContent = text.slice(0, n); await sleep(Math.max(8, tick / 2)); }
    el.textContent = text;
    this.skip = false;
    const t0 = performance.now(); const wait = textPause(ms);
    while (performance.now() - t0 < wait && !this.skip) await sleep(30);
  }

  async playEvent(ev, next = []) {
    const sfx = (n, a) => audio.sfx(n, a);
    switch (ev.type) {
      case 'text':
        if (/wurde besiegt|ist besiegt/.test(ev.text) || /^Du hast .* besiegt/.test(ev.text)) this.won = true;
        return this.say(ev.text);
      case 'death': this.hooks.log(ev.text, 'death'); return this.say(ev.text, 1400, false);
      case 'anim':
        sfx('move', { move: ev.move, type: ev.moveType });
        // Kampfanimation aus (Optionen): nur kurzes Aufblitzen wie im Original
        if (!options.battleAnim) return sleep(200);
        return this.fx.move(ev);
      case 'stat': sfx(ev.up ? 'statUp' : 'statDown'); this.fx.stat(ev.side, ev.up); return sleep(350);
      case 'hp': {
        const box = this.state[ev.side];
        if (!box) return;
        const before = box.hp;
        box.hp = ev.hp; box.maxHp = ev.maxHp;
        if (ev.damage > 0) {
          const txt = next.filter((e) => e.type === 'text').map((e) => e.text).join(' ');
          const mult = /sehr effektiv/.test(txt) ? 2 : /nicht sehr effektiv/.test(txt) ? 0.5 : 1;
          sfx(mult > 1 ? 'hitSuper' : mult < 1 ? 'hitWeak' : 'hit');
          this.fx.impact(ev.side, mult);
          const el = spriteEl(ev.side); el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
        } else if (ev.hp > before) {
          sfx('heal'); this.fx.sparkle(ev.side, '#90f0a0');
        }
        await this.animateHp(ev.side, before, ev.hp, ev.maxHp);
        this.renderBoxes(this.state);
        return;
      }
      case 'status': {
        const mon = this.state[ev.side];
        if (!mon) return;
        mon.status = ev.status; this.renderBoxes(this.state);
        if (ev.status && STATUS[ev.status]) { this.fx.sparkle(ev.side, STATUS[ev.status][1]); sfx('statDown'); }
        return;
      }
      case 'faint': {
        const mon = this.state[ev.side];
        sfx('cry', mon?.speciesId); await sleep(380); sfx('faint');
        spriteEl(ev.side).classList.add('fainted');
        return sleep(600);
      }
      case 'foeSwitch': {
        const k = ev.side || 'foe';
        this.state[k] = { ...ev.mon, stages: {} };
        spriteEl(k).classList.remove('fainted', 'absorb', 'empty');
        this.renderBoxes(this.state); this.renderSprites(this.state);
        this.fx.burst(this.fx.center(k), { c: ['#ffffff', '#fff0b0'], shape: 'star' }, 10);
        sfx('poof'); await sleep(250); sfx('cry', ev.mon.speciesId);
        return sleep(500);
      }
      case 'switch': {
        const k = ev.side || 'ally';
        this.state[k] = { ...ev.mon, stages: {} };
        spriteEl(k).classList.add('waiting');
        spriteEl(k).classList.remove('fainted', 'empty');
        this.renderBoxes(this.state); this.renderSprites(this.state);
        await this.fx.sendOut({ sfx }, k);
        sfx('cry', ev.mon.speciesId);
        return sleep(300);
      }
      case 'shake':
        await this.fx.catchSequence(ev, { sfx });
        if (ev.caught) { audio.jingle('caught'); this.caught = true; }
        return;
      case 'learnPrompt': this.hooks.onLearnPrompt(ev); return this.say(ev.text, 1200);
      case 'levelup': {
        audio.jingle('levelup'); this.fx.sparkle(this.state.ally2?.id === ev.pokemonId ? 'ally2' : 'ally');
        await this.say(ev.text, 600);
        return showLevelStats(this.root.querySelector('.field') || this.root, ev.before, ev.after);
      }
      case 'learn': return this.say(ev.text, 1100);
      case 'needSwitch': case 'exp': case 'end': return;
      default: return;
    }
  }

  finish() {
    const msg = this.pendingEnd;
    this.pendingEnd = null;
    (async () => {
      if (this.intro) await this.intro;
      if (msg.result === 'win' && !this.caught) audio.music(['wild', 'legend', 'lakes', 'creation'].includes(this.foeKind) ? 'victory' : 'victory_' + this.foeKind);
      for (const t of msg.messages || []) {
        if (/Orden/.test(t) && /erhältst/.test(t)) audio.jingle('badge');
        await this.say(t, 1300);
      }
      this.caught = false;
      await sleep(200);
      $('fade').classList.remove('on'); void $('fade').offsetWidth; $('fade').classList.add('on');
      this.root.classList.add('hidden');
      this.fx.clear();
      this.shown = false;
      this.state = null;
      this.hooks.onEnd(msg);
    })();
  }

  // KP-Balken laeuft sichtbar herunter, beim eigenen Pokemon zaehlen die Zahlen mit
  async animateHp(side, from, to, max) {
    const box = boxEl(side);
    const bar = box.querySelector('.hpbar'); const fill = bar?.querySelector('i');
    const num = box.querySelector('.hpnum');
    if (!fill) return sleep(300);
    const ms = Math.min(900, 250 + Math.abs(from - to) / Math.max(1, max) * 900);
    const t0 = performance.now();
    while (true) {
      const t = Math.min(1, (performance.now() - t0) / ms);
      const v = Math.round(from + (to - from) * t);
      const pct = Math.max(0, (v / max) * 100);
      fill.style.transition = 'none';
      fill.style.width = pct + '%';
      bar.className = 'hpbar ' + (pct <= 20 ? 'low' : pct <= 50 ? 'mid' : '');
      if (num) num.textContent = `${v} / ${max}`;
      if (t >= 1) break;
      await sleep(16);
    }
    await sleep(120);
  }

  // -------------------------------------------------------------- Darstellung
  color(types) { return this.m.typeColors[types?.[0]] || '#888'; }
  // Original-Kampfboden (npm run sprites) statt der gezeichneten Ellipsen
  async renderTerrain() {
    const field = this.root.querySelector('.field');
    const t = this.hooks.terrain?.();
    if (!t || !hasReal('terrain', t)) { field.classList.remove('real-terrain'); return; }
    const [enemy, player] = await Promise.all([terrainImage(t, 'enemy'), terrainImage(t, 'player')]);
    if (!enemy || !player) return;
    field.style.setProperty('--terrain-enemy', `url(${enemy})`);
    field.style.setProperty('--terrain-player', `url(${player})`);
    field.classList.add('real-terrain');
  }
  renderSprites(s) {
    const set = (el, mon, back) => {
      // Eigene Grafik aus dem Manifest hat Vorrang, sonst das prozedural erzeugte Sprite.
      const src = monsterDataUrl(mon, back);
      el.style.backgroundImage = `url(${src})`;
      el.classList.toggle('real', src.startsWith('/sprites/'));
      el.title = `${mon.species} (${mon.types.join('/')})`;
      el.classList.toggle('shiny', !!mon.shiny);
      if (this.m.pokemon?.useImages) {
        const url = `/assets/sprites/${(back ? this.m.pokemon.backPathPattern : this.m.pokemon.pathPattern).replace('{id}', mon.speciesId)}`;
        const img = new Image();
        img.onload = () => { el.style.backgroundImage = `url(${url})`; };
        img.src = url;
      }
    };
    for (const k of KEYS) {
      const el = spriteEl(k);
      if (s[k]) set(el, s[k], isAllyKey(k));
      else if (s.double) el.classList.add('empty');
    }
  }
  boxHtml(mon, ally) {
    if (!mon) return '';
    const pct = Math.max(0, Math.round((mon.hp / mon.maxHp) * 100));
    const cls = pct <= 20 ? 'low' : pct <= 50 ? 'mid' : '';
    const st = mon.status ? `<span class="st" style="background:${STATUS[mon.status][1]}">${STATUS[mon.status][0]}</span>` : '';
    const g = mon.gender === 'm' ? ' ♂' : mon.gender === 'f' ? ' ♀' : '';
    let html = `<div class="row"><span>${mon.name}${g}${st}</span><span>Lv${mon.level}</span></div><div class="hprow"><b>KP</b><div class="hpbar ${cls}"><i style="width:${pct}%"></i></div></div>`;
    if (mon.owner) html = `<div class="owner">${mon.owner}</div>` + html;
    if (ally && !mon.owner) {
      const span = Math.max(1, mon.expNext - mon.expThis);
      const ep = Math.min(100, Math.max(0, Math.round(((mon.exp - mon.expThis) / span) * 100)));
      html += `<div class="row" style="font-size:12px;margin-top:2px"><span></span><span class="hpnum">${mon.hp} / ${mon.maxHp}</span></div><div class="exp"><i style="width:${ep}%"></i></div>`;
    }
    return html;
  }
  renderBoxes(s) {
    const team = s.kind === 'trainer' && s.foeTeam ? `<div class="foe-team">${s.foeTeam.map((t) => `<i class="${t}"></i>`).join('')}</div>` : '';
    if (s.double) {
      for (const k of KEYS) { const el = boxEl(k); el.innerHTML = this.boxHtml(s[k], isAllyKey(k)); el.style.visibility = s[k] ? '' : 'hidden'; }
      if (team && s.foe2) $('foeBox2').innerHTML += team; else if (team) $('foeBox').innerHTML += team;
      return;
    }
    $('foeBox').innerHTML = (s.trainer ? `<div class="hint" style="font-size:11px">${s.trainer.name}</div>` : '') + this.boxHtml(s.foe, false) + team;
    $('allyBox').innerHTML = this.boxHtml(s.ally, true);
  }

  // -------------------------------------------------------------- Menues
  menu(buttons) {
    const el = $('battleMenu');
    el.innerHTML = '';
    if (!buttons) return;
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.innerHTML = b.html || b.label;
      if (b.cls) btn.className = b.cls;
      if (b.color) btn.style.background = b.color;
      btn.disabled = !!b.disabled;
      btn.onclick = (e) => { e.stopPropagation(); audio.sfx(b.cls === 'back' ? 'back' : 'select'); b.fn(); };
      el.appendChild(btn);
    }
  }
  // Im Doppelkampf sammelt act() die Befehle für beide eigenen Pokémon und schickt sie zusammen
  act(a) {
    if (!this.state.double || a.type === 'switch' && this.state.state === 'switch') { this.menu(null); this.net.send({ t: 'battleAction', ...a }); return; }
    if (a.type === 'run' || a.type === 'ball') { this.menu(null); this.net.send({ t: 'battleAction', type: 'multi', actions: [{ ...a, slot: this.slot }] }); return; }
    this.plan.push({ ...a, slot: this.slot });
    const next = this.ownSlots().find((i) => i > this.slot);
    if (next != null) { this.slot = next; return this.mainMenu(); }
    this.menu(null);
    this.net.send({ t: 'battleAction', type: 'multi', actions: this.plan });
  }
  ownSlots() { return this.state.double ? [0, 1].filter((i) => this.state.control?.[i] && this.state[i ? 'ally2' : 'ally']) : [0]; }
  get cur() { return this.state[this.slot === 1 ? 'ally2' : 'ally'] || this.state.ally; }
  beginTurn() { this.plan = []; this.slot = this.ownSlots()[0] ?? 0; this.mainMenu(); }
  stepBack() { this.plan.pop(); this.slot = this.ownSlots()[0]; this.mainMenu(); }

  mainMenu() {
    $('battleText').textContent = `Was soll ${this.cur.name} tun?`;
    const second = this.state.double && this.slot !== this.ownSlots()[0];
    this.menu([
      { label: 'KAMPF', color: '#d9534f', fn: () => this.moveMenu() },
      { label: 'BEUTEL', color: '#e0a526', fn: () => this.bagMenu() },
      { label: 'POKéMON', color: '#3fa34d', fn: () => this.partyMenu(false) },
      second ? { label: 'ZURÜCK', color: '#5a5f78', fn: () => this.stepBack() } : { label: 'FLUCHT', color: '#3b6fd6', disabled: this.state.kind === 'trainer', fn: () => this.act({ type: 'run' }) }
    ]);
  }
  moveMenu() {
    const moves = this.cur.moves;
    const allEmpty = moves.every((m) => m.pp <= 0);
    const btns = moves.map((m, i) => ({
      cls: 'mv', color: this.m.typeColors[m.type],
      html: `${m.name}<small>${typeBadge(m.type)}AP ${m.pp}/${m.maxPp} · ${m.power || '-'}</small>`,
      disabled: m.pp <= 0 && !allEmpty,
      fn: () => this.chooseTarget(m, i)
    }));
    btns.push({ label: 'Zurück', cls: 'back', fn: () => this.mainMenu() });
    this.menu(btns);
  }
  // Doppelkampf: bei zwei Gegnern das Ziel wählen (Flächenattacken und Statusattacken auf sich selbst nicht)
  chooseTarget(m, i) {
    const foes = ['foe', 'foe2'].filter((k) => this.state[k] && this.state[k].hp > 0);
    const self = m.cat === 'status' && m.self;
    if (!this.state.double || foes.length < 2 || m.spread || self) return this.act({ type: 'move', index: i });
    $('battleText').textContent = `${m.name}: Welches Ziel?`;
    const other = this.slot === 1 ? 'ally' : 'ally2';
    const btns = foes.map((k) => ({ html: `${this.state[k].name}<small>Lv${this.state[k].level}</small>`, cls: 'mv', color: '#b0453f', fn: () => this.act({ type: 'move', index: i, target: k }) }));
    if (this.state[other] && m.cat !== 'status') btns.push({ html: `${this.state[other].name}<small>Partner</small>`, cls: 'mv', color: '#3f7ab0', fn: () => this.act({ type: 'move', index: i, target: other }) });
    btns.push({ label: 'Zurück', cls: 'back', fn: () => this.moveMenu() });
    this.menu(btns);
  }
  bagMenu() {
    const btns = [];
    if (this.state.kind !== 'trainer') {
      for (const [k, n] of Object.entries(this.state.balls)) if (n > 0) btns.push({ html: `${itemIcon(k)}${ITEMS[k]?.name || k} x${n}`, disabled: !this.state.catchable || (this.state.double && this.slot !== this.ownSlots()[0]), fn: () => this.act({ type: 'ball', ball: k }) });
    }
    for (const [k, it] of Object.entries(this.state.bag || {})) {
      btns.push({ html: `${itemIcon(k)}${it.name} x${it.count}`, color: it.kind === 'battle' ? '#a0522d' : '#3f8a7a', fn: () => (it.kind === 'battle' ? this.act({ type: 'item', item: k, index: 0 }) : this.itemTarget(k, it.name, it.pp)) });
    }
    $('battleText').textContent = !btns.length ? 'Dein Beutel ist leer.' : this.state.kind === 'trainer' ? 'Welchen Gegenstand?' : !this.state.catchable ? 'Dieses Pokémon kannst du nicht fangen.' : 'Welchen Gegenstand?';
    btns.push({ label: 'Zurück', cls: 'back', fn: () => this.mainMenu() });
    this.menu(btns);
  }
  itemTarget(item, name, pickMove) {
    $('battleText').textContent = `${name}: Für welches Pokémon?`;
    const btns = this.state.party.map((p, i) => ({
      html: `${p.alive ? '' : '† '}${p.name} Lv${p.level}<small>${p.hp}/${p.maxHp}${p.status ? ' · ' + p.status.toUpperCase() : ''}</small>`, cls: 'mv',
      disabled: !p.alive, fn: () => (pickMove ? this.itemMove(item, name, i) : this.act({ type: 'item', item, index: i }))
    }));
    btns.push({ label: 'Zurück', cls: 'back', fn: () => this.bagMenu() });
    this.menu(btns);
  }
  // Äther und Top-Äther: Attacke wählen
  itemMove(item, name, index) {
    const p = this.state.party[index];
    $('battleText').textContent = `${name}: Welche Attacke?`;
    const btns = (p.moves || []).map((m, j) => ({ html: `${m.name}<small>AP ${m.pp}/${m.maxPp}</small>`, cls: 'mv', fn: () => this.act({ type: 'item', item, index, moveIndex: j }) }));
    btns.push({ label: 'Zurück', cls: 'back', fn: () => this.itemTarget(item, name, true) });
    this.menu(btns);
  }
  partyMenu(forced, free = false) {
    $('battleText').textContent = forced ? 'Welches Pokémon soll kämpfen?' : 'Pokémon wechseln';
    const busy = new Set([this.state.ally?.id, this.state.ally2?.id, ...(this.plan || []).filter((a) => a.type === 'switch').map((a) => this.state.party[a.index]?.id)]);
    const btns = this.state.party.map((p, i) => ({
      html: `${p.alive ? '' : '† '}${p.name} Lv${p.level}<small>${p.hp}/${p.maxHp}</small>`, cls: 'mv',
      disabled: !p.alive || p.hp <= 0 || p.egg || busy.has(p.id),
      fn: () => this.act(free ? { type: 'switch', index: i, free: true } : { type: 'switch', index: i, ...(forced && this.state.double ? { slot: this.state.pending?.[0] } : {}) })
    }));
    if (!forced) btns.push({ label: 'Zurück', cls: 'back', fn: () => (free ? this.shiftPrompt() : this.mainMenu()) });
    this.menu(btns);
  }
}

// Trainergrafik aus dem Overworld-Spritesheet, gross fuer den Kampfbildschirm
const trainerCache = {};
function trainerUrl(look) {
  if (trainerCache[look]) return trainerCache[look];
  const sheet = characterSheet(look || 'youngster');
  const c = document.createElement('canvas'); c.width = 16; c.height = 20;
  c.getContext('2d').drawImage(sheet, 0, 0, 16, 20, 0, 0, 16, 20);
  return (trainerCache[look] = c.toDataURL());
}
