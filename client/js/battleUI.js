// Kampfoberflaeche: spielt Server-Ereignisse nacheinander ab und sendet Aktionen.
import { monsterDataUrl } from './art/monsters.js';
const $ = (id) => document.getElementById(id);
const STATUS = { par: ['PAR', '#c9a400'], slp: ['SLF', '#7a7a7a'], psn: ['GIF', '#a040a0'], tox: ['GIF', '#702070'], brn: ['BRT', '#e05a2a'], frz: ['GFR', '#4bb3d6'] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    this.root.addEventListener('click', () => { this.skip = true; });
    addEventListener('keydown', (e) => { if (!this.root.classList.contains('hidden') && ['KeyZ', 'Enter', 'Space'].includes(e.code)) this.skip = true; });
  }

  get active() { return !this.root.classList.contains('hidden'); }

  start(msg) {
    this.state = msg.state;
    this.pendingEnd = null;
    this.root.classList.remove('hidden');
    $('foeSprite').classList.remove('fainted');
    $('allySprite').classList.remove('fainted');
    this.renderBoxes(this.state);
    this.renderSprites(this.state);
    this.menu(null);
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
    while (this.queue.length) {
      const { events, state } = this.queue.shift();
      for (const ev of events) await this.playEvent(ev);
      if (state) { this.state = state; this.renderBoxes(state); this.renderSprites(state); }
    }
    this.playing = false;
    if (this.pendingEnd) return this.finish();
    if (this.state && this.state.state === 'switch') return this.partyMenu(true);
    if (this.state && this.state.state === 'action') this.mainMenu();
  }

  async say(text, ms = 900) {
    $('battleText').textContent = text;
    this.hooks.log(text, 'battle');
    this.skip = false;
    const t0 = performance.now();
    while (performance.now() - t0 < ms && !this.skip) await sleep(30);
  }

  async playEvent(ev) {
    switch (ev.type) {
      case 'text': return this.say(ev.text);
      case 'death': this.hooks.log(ev.text, 'death'); return this.say(ev.text, 1400);
      case 'hp': {
        const box = ev.side === 'ally' ? this.state.ally : this.state.foe;
        box.hp = ev.hp; box.maxHp = ev.maxHp;
        if (ev.damage > 0) { const el = $(ev.side === 'ally' ? 'allySprite' : 'foeSprite'); el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
        this.renderBoxes(this.state);
        return sleep(350);
      }
      case 'status': (ev.side === 'ally' ? this.state.ally : this.state.foe).status = ev.status; this.renderBoxes(this.state); return;
      case 'faint': $(ev.side === 'ally' ? 'allySprite' : 'foeSprite').classList.add('fainted'); return sleep(500);
      case 'switch': this.state.ally = { ...ev.mon, stages: {} }; $('allySprite').classList.remove('fainted'); this.renderBoxes(this.state); this.renderSprites(this.state); return sleep(300);
      case 'shake': for (let i = 0; i < ev.count; i++) await this.say('... wackelt ...', 600); return;
      case 'anim': return sleep(150);
      case 'learnPrompt': this.hooks.onLearnPrompt(ev); return this.say(ev.text, 1200);
      case 'levelup': case 'learn': return this.say(ev.text, 1100);
      case 'needSwitch': case 'exp': case 'end': return;
      default: return;
    }
  }

  finish() {
    const msg = this.pendingEnd;
    this.pendingEnd = null;
    (async () => {
      for (const t of msg.messages || []) await this.say(t, 1300);
      this.root.classList.add('hidden');
      this.state = null;
      this.hooks.onEnd(msg);
    })();
  }

  // -------------------------------------------------------------- Darstellung
  color(types) { return this.m.typeColors[types?.[0]] || '#888'; }
  renderSprites(s) {
    const set = (el, mon, back) => {
      // Eigene Grafik aus dem Manifest hat Vorrang, sonst das prozedural erzeugte Sprite.
      el.style.backgroundImage = `url(${monsterDataUrl(mon, back)})`;
      el.title = `${mon.species} (${mon.types.join('/')})`;
      el.classList.toggle('shiny', !!mon.shiny);
      if (this.m.pokemon?.useImages) {
        const url = `/assets/sprites/${(back ? this.m.pokemon.backPathPattern : this.m.pokemon.pathPattern).replace('{id}', mon.speciesId)}`;
        const img = new Image();
        img.onload = () => { el.style.backgroundImage = `url(${url})`; };
        img.src = url;
      }
    };
    set($('foeSprite'), s.foe, false);
    set($('allySprite'), s.ally, true);
  }
  boxHtml(mon, ally) {
    const pct = Math.max(0, Math.round((mon.hp / mon.maxHp) * 100));
    const cls = pct <= 20 ? 'low' : pct <= 50 ? 'mid' : '';
    const st = mon.status ? `<span class="st" style="background:${STATUS[mon.status][1]}">${STATUS[mon.status][0]}</span>` : '';
    const g = mon.gender === 'm' ? ' ♂' : mon.gender === 'f' ? ' ♀' : '';
    let html = `<div class="row"><span>${mon.name}${g}${st}</span><span>Lv${mon.level}</span></div><div class="hprow"><b>KP</b><div class="hpbar ${cls}"><i style="width:${pct}%"></i></div></div>`;
    if (ally) {
      const span = Math.max(1, mon.expNext - mon.expThis);
      const ep = Math.min(100, Math.max(0, Math.round(((mon.exp - mon.expThis) / span) * 100)));
      html += `<div class="row" style="font-size:12px;margin-top:2px"><span></span><span>${mon.hp} / ${mon.maxHp}</span></div><div class="exp"><i style="width:${ep}%"></i></div>`;
    }
    return html;
  }
  renderBoxes(s) {
    $('foeBox').innerHTML = this.boxHtml(s.foe, false);
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
      btn.onclick = (e) => { e.stopPropagation(); b.fn(); };
      el.appendChild(btn);
    }
  }
  act(a) { this.menu(null); this.net.send({ t: 'battleAction', ...a }); }

  mainMenu() {
    $('battleText').textContent = `Was soll ${this.state.ally.name} tun?`;
    this.menu([
      { label: 'KAMPF', color: '#d9534f', fn: () => this.moveMenu() },
      { label: 'BEUTEL', color: '#e0a526', fn: () => this.bagMenu() },
      { label: 'POKéMON', color: '#3fa34d', fn: () => this.partyMenu(false) },
      { label: 'FLUCHT', color: '#3b6fd6', fn: () => this.act({ type: 'run' }) }
    ]);
  }
  moveMenu() {
    const moves = this.state.ally.moves;
    const allEmpty = moves.every((m) => m.pp <= 0);
    const btns = moves.map((m, i) => ({
      cls: 'mv', color: this.m.typeColors[m.type],
      html: `${m.name}<small>AP ${m.pp}/${m.maxPp} · ${m.power || '-'}</small>`,
      disabled: m.pp <= 0 && !allEmpty,
      fn: () => this.act({ type: 'move', index: i })
    }));
    btns.push({ label: 'Zurück', cls: 'back', fn: () => this.mainMenu() });
    this.menu(btns);
  }
  bagMenu() {
    const names = { 'poke-ball': 'Pokéball', 'great-ball': 'Superball', 'ultra-ball': 'Hyperball' };
    const btns = Object.entries(this.state.balls).map(([k, n]) => ({
      label: `${names[k]} x${n}`, disabled: n <= 0 || !this.state.catchable, fn: () => this.act({ type: 'ball', ball: k })
    }));
    if (!this.state.catchable) $('battleText').textContent = 'Nuzlocke: Dieses Pokémon darfst du nicht fangen.';
    btns.push({ label: 'Zurück', cls: 'back', fn: () => this.mainMenu() });
    this.menu(btns);
  }
  partyMenu(forced) {
    $('battleText').textContent = forced ? 'Welches Pokémon soll kämpfen?' : 'Pokémon wechseln';
    const btns = this.state.party.map((p, i) => ({
      html: `${p.alive ? '' : '† '}${p.name} Lv${p.level}<small>${p.hp}/${p.maxHp}</small>`, cls: 'mv',
      disabled: !p.alive || p.hp <= 0 || p.id === this.state.ally.id,
      fn: () => this.act({ type: 'switch', index: i })
    }));
    if (!forced) btns.push({ label: 'Zurück', cls: 'back', fn: () => this.mainMenu() });
    this.menu(btns);
  }
}
