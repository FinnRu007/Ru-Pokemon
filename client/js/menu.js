// Startmenue wie in Platin (Taste X): Pokedex, Pokemon, Beutel, Trainerpass, Speichern, Optionen.
// Dazu Statusbildschirm, Attacken lernen (Level-Up, TM/VM, Lehrer, Erinnerer) und Verlerner.
// Alle Bildschirme liegen als HTML ueber dem Spielfeld und lassen sich mit Tastatur und Maus bedienen:
// Pfeiltasten waehlen, Z/Enter bestaetigt, X/Esc geht zurueck.
import { MAPS } from '/shared/data/maps.js';
import { ITEMS, isHmMove } from '/shared/data/items.js';
import { BADGES } from '/shared/data/story.js';
import { monsterDataUrl, monsterIcon, typeBadge, itemIcon } from './art/monsters.js';
import { DEX, speciesOf, moveOf, moveText, dexText, abilityName, abilityText, itemText, spriteMon, fmtHeight, fmtWeight } from './texts.js';
import { options, setOption, OPTION_DEFS, textStep } from './options.js';
import { audio } from './audio.js';
import { layout } from './worldmap.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TYPE_DE = {
  normal: 'Normal', fire: 'Feuer', water: 'Wasser', electric: 'Elektro', grass: 'Pflanze', ice: 'Eis', fighting: 'Kampf', poison: 'Gift',
  ground: 'Boden', flying: 'Flug', psychic: 'Psycho', bug: 'Käfer', rock: 'Gestein', ghost: 'Geist', dragon: 'Drache', dark: 'Unlicht', steel: 'Stahl'
};
const CAT_DE = { physical: 'Physisch', special: 'Spezial', status: 'Status' };
const STAT_ROWS = [['hp', 'KP'], ['atk', 'Angriff'], ['def', 'Verteidigung'], ['spa', 'Sp.-Angriff'], ['spd', 'Sp.-Vert.'], ['spe', 'Initiative']];
const POCKETS = [['item', 'Items'], ['med', 'Medizin'], ['ball', 'Bälle'], ['tm', 'TM/VM'], ['berry', 'Beeren'], ['battle', 'Kampf-Items'], ['key', 'Basis-Items']];
const typeTag = (t) => typeBadge(t) || `<span class="type-tag t-${t}">${TYPE_DE[t] || t}</span>`;
const pad3 = (n) => String(n).padStart(3, '0');
export const fmtTime = (ms) => { const m = Math.floor((ms || 0) / 60000); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
const genderSym = (g) => (g === 'm' ? '<b class="g-m">♂</b>' : g === 'f' ? '<b class="g-f">♀</b>' : '');

export class GameMenu {
  // ctx: { net, hud, world, onClose() }
  constructor(ctx) {
    this.ctx = ctx;
    this.root = $('menu');
    this.stack = [];
    this.msgResolve = null;
    this.waitSaved = null;
    addEventListener('keydown', (e) => this.onKey(e), true);
    this.root.addEventListener('click', (e) => { if (e.target === this.root && this.stack.length) this.back(); });
  }

  get isOpen() { return this.stack.length > 0; }
  get party() { return this.ctx.hud.party || []; }
  get progress() { return this.ctx.hud.progress || { flags: {}, money: 0 }; }
  get flags() { return this.progress.flags || {}; }
  get items() { return this.ctx.hud.items || {}; }
  get me() { return this.ctx.world.me; }

  // ---------------------------------------------------------------- Stapel der Bildschirme
  open() { if (!this.isOpen) { audio.sfx('start'); this.push(this.startScreen()); } }
  push(screen) { this.stack.push(screen); this.root.classList.remove('hidden'); this.render(); }
  replace(screen) { this.stack[this.stack.length - 1] = screen; this.render(); }
  back() {
    if (this.msgResolve) return;
    const top = this.stack[this.stack.length - 1];
    if (top?.onBack && top.onBack() === false) return;
    audio.sfx('back');
    this.stack.pop();
    if (!this.stack.length) return this.close();
    this.render();
  }
  close() {
    this.stack = [];
    this.root.classList.add('hidden');
    this.root.innerHTML = '';
    this.ctx.onClose?.();
  }
  render(focusIdx) {
    const top = this.stack[this.stack.length - 1];
    if (!top) return;
    const prev = focusIdx ?? top.focus ?? 0;
    this.root.className = 'menu ' + (top.cls || '');
    this.root.innerHTML = top.html() + '<div class="menu-msg hidden" id="menuMsg"></div>';
    top.bind?.(this.root);
    for (const b of this.root.querySelectorAll('[data-nav]')) {
      b.addEventListener('focus', () => { top.focus = this.navList().indexOf(b); top.onFocus?.(b); });
    }
    const list = this.navList();
    (list[Math.min(prev, list.length - 1)] || list[0])?.focus({ preventScroll: false });
  }
  navList() { return [...this.root.querySelectorAll('[data-nav]:not([disabled])')]; }
  refresh() { if (this.isOpen && !this.msgResolve) this.render(); }

  // Tastatur: hat Vorrang vor der Spielsteuerung, solange das Menue offen ist
  onKey(e) {
    if (!this.isOpen || e.target.tagName === 'INPUT') return;
    const code = e.code;
    const handled = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'Enter', 'Space', 'KeyX', 'Escape', 'Backspace'];
    if (!handled.includes(code)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (this.msgResolve) {
      const box = this.root.querySelector('#menuMsg');
      const btns = [...(box?.querySelectorAll('.msg-choices button') || [])];
      if (!btns.length) { if (['KeyZ', 'Enter', 'Space', 'KeyX', 'Escape', 'Backspace'].includes(code)) this.msgAdvance?.(); return; }
      if (['KeyX', 'Escape', 'Backspace'].includes(code)) { audio.sfx('back'); return btns[btns.length - 1].click(); }
      if (['KeyZ', 'Enter', 'Space'].includes(code)) { audio.sfx('select'); return (btns.includes(document.activeElement) ? document.activeElement : btns[0]).click(); }
      const i = Math.max(0, btns.indexOf(document.activeElement));
      if (['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS'].includes(code)) { audio.sfx('click'); btns[(i + (code === 'ArrowDown' || code === 'KeyS' ? 1 : btns.length - 1)) % btns.length].focus(); }
      return;
    }
    const top = this.stack[this.stack.length - 1];
    if (top?.onKey && top.onKey(code) === true) return;
    if (['KeyX', 'Escape', 'Backspace'].includes(code)) return this.back();
    if (['KeyZ', 'Enter', 'Space'].includes(code)) { const f = document.activeElement; if (f && this.root.contains(f)) { audio.sfx('select'); f.click(); } return; }
    this.moveFocus(code, this.root);
  }
  // Raeumliche Navigation: naechstes Element in Pfeilrichtung
  moveFocus(code, scope) {
    const dir = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] }[code];
    if (!dir) { if (['KeyZ', 'Enter', 'Space'].includes(code)) document.activeElement?.click(); return; }
    const list = [...scope.querySelectorAll('[data-nav]:not([disabled]), .menu-msg button')].filter((b) => b.offsetParent);
    const cur = document.activeElement;
    if (!list.includes(cur)) return list[0]?.focus();
    const r = cur.getBoundingClientRect(); const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
    let best = null; let bestD = Infinity;
    for (const b of list) {
      if (b === cur) continue;
      const q = b.getBoundingClientRect(); const dx = q.left + q.width / 2 - cx; const dy = q.top + q.height / 2 - cy;
      const along = dx * dir[0] + dy * dir[1];
      if (along <= 2) continue;
      const across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]);
      const d = along + across * 2.5;
      if (d < bestD) { bestD = d; best = b; }
    }
    if (best) { audio.sfx('click'); best.focus(); best.scrollIntoView({ block: 'nearest' }); }
  }

  // Textbox unten im Menue: Schreibmaschine wie im Spiel, optional mit Auswahl. Liefert die Wahl.
  say(text, choices = null) {
    return new Promise((resolve) => {
      const box = this.root.querySelector('#menuMsg');
      if (!box) return resolve(null);
      box.classList.remove('hidden');
      box.innerHTML = '<div class="t"></div>';
      const t = box.querySelector('.t');
      let shown = 0; let done = false;
      const [step, ms] = textStep();
      const finish = () => {
        clearInterval(timer); t.textContent = text; done = true;
        if (choices) {
          const c = document.createElement('div'); c.className = 'msg-choices';
          choices.forEach((label, i) => { const b = document.createElement('button'); b.textContent = label; b.onclick = (e) => { e.stopPropagation(); end(i); }; c.appendChild(b); });
          box.appendChild(c); c.querySelector('button').focus();
        } else box.classList.add('waiting');
      };
      const end = (v) => {
        this.msgResolve = null; this.msgChoices = null; this.msgAdvance = null;
        box.classList.add('hidden'); box.classList.remove('waiting'); box.innerHTML = '';
        resolve(v);
        const top = this.stack[this.stack.length - 1]; const list = this.navList();
        (list[top?.focus ?? 0] || list[0])?.focus();
      };
      const timer = setInterval(() => { shown += step; t.textContent = text.slice(0, shown); if (shown >= text.length) finish(); }, ms);
      this.msgResolve = resolve; this.msgChoices = choices;
      this.msgAdvance = () => { if (!done) finish(); else if (!choices) end(null); };
      box.onclick = (e) => { e.stopPropagation(); if (!choices) this.msgAdvance(); };
    });
  }

  // ---------------------------------------------------------------- Startmenue
  startScreen() {
    const entries = () => [
      this.flags.dex && ['dex', 'Pokédex', 'ic-dex'],
      this.party.length && ['party', 'Pokémon', 'ic-ball'],
      ['bag', 'Beutel', 'ic-bag'],
      ['card', esc(this.me?.name || 'Trainer'), 'ic-card'],
      ['save', 'Speichern', 'ic-save'],
      ['options', 'Optionen', 'ic-opt'],
      ['close', 'Zurück', 'ic-back']
    ].filter(Boolean);
    return {
      cls: 'm-start',
      html: () => `<div class="start-menu">${entries().map(([k, l, ic]) => `<button data-nav data-k="${k}"><i class="mi ${ic}"></i>${l}</button>`).join('')}</div>`,
      bind: (root) => root.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => this.startPick(b.dataset.k); })
    };
  }
  startPick(k) {
    if (k === 'close') return this.back();
    if (k === 'dex') return this.push(this.dexScreen());
    if (k === 'party') return this.push(this.partyScreen());
    if (k === 'bag') return this.push(this.bagScreen());
    if (k === 'card') return this.push(this.cardScreen());
    if (k === 'save') return this.push(this.saveScreen());
    if (k === 'options') return this.push(this.optionsScreen());
  }

  // ---------------------------------------------------------------- Pokedex
  dexIds(national) {
    const all = Object.values(DEX?.pokemon || {});
    if (national) return all.map((s) => s.id).sort((a, b) => a - b);
    return all.filter((s) => s.sinnoh).sort((a, b) => a.sinnoh - b.sinnoh).map((s) => s.id);
  }
  dexScreen() {
    const canNational = !!this.flags.national_dex;
    const st = { national: false, sel: null };
    const seen = () => new Set(this.progress.dex?.seen || []);
    const caught = () => new Set(this.progress.dex?.caught || []);
    const scr = {
      cls: 'm-dex',
      html: () => {
        const S = seen(); const C = caught(); const ids = this.dexIds(st.national);
        const num = (id) => (st.national ? id : speciesOf(id).sinnoh);
        // Wie im Original endet die Liste beim hoechsten gesehenen Eintrag
        let last = 0; ids.forEach((id, i) => { if (S.has(id)) last = i; });
        const shown = ids.slice(0, Math.max(last + 1, 1));
        const sel = st.sel && shown.includes(st.sel) ? st.sel : shown.find((id) => S.has(id)) || shown[0];
        st.sel = sel;
        return `<div class="dex">
          <div class="dex-head"><b>${st.national ? 'Nationaler Pokédex' : 'Sinnoh-Pokédex'}</b>
            <span>Gesehen <b>${ids.filter((id) => S.has(id)).length}</b></span><span>Gefangen <b>${ids.filter((id) => C.has(id)).length}</b></span>
            ${canNational ? `<button data-nav data-sw="1" class="small">${st.national ? 'Sinnoh' : 'National'}</button>` : ''}</div>
          <div class="dex-body">
            <div class="dex-view" id="dexView">${this.dexPreview(sel, S, C)}</div>
            <div class="dex-list">${shown.map((id) => `<button data-nav data-id="${id}" class="${S.has(id) ? '' : 'unseen'}"><span class="n">${pad3(num(id))}</span>${C.has(id) ? '<i class="caught"></i>' : '<i></i>'}<span>${S.has(id) ? esc(speciesOf(id).name) : '-----'}</span></button>`).join('')}</div>
          </div>
          <div class="hint dex-foot">Z: Eintrag ansehen · X: zurück</div></div>`;
      },
      bind: (root) => {
        const S = seen(); const C = caught();
        root.querySelector('[data-sw]')?.addEventListener('click', () => { st.national = !st.national; st.sel = null; scr.focus = 0; this.render(); });
        root.querySelectorAll('.dex-list [data-id]').forEach((b) => {
          b.addEventListener('focus', () => { st.sel = Number(b.dataset.id); $('dexView').innerHTML = this.dexPreview(st.sel, S, C); });
          b.onclick = () => { const id = Number(b.dataset.id); if (S.has(id)) this.push(this.dexEntry(id, st.national)); else audio.sfx('bump'); };
        });
        const cur = root.querySelector(`.dex-list [data-id="${st.sel}"]`);
        if (cur) { scr.focus = this.navList().indexOf(cur); }
      }
    };
    return scr;
  }
  dexPreview(id, S, C) {
    const sp = speciesOf(id);
    if (!sp || !S.has(id)) return '<div class="dex-sprite unknown">?</div>';
    return `<div class="dex-sprite"><img src="${monsterDataUrl(spriteMon(id), false, 96, true)}" alt=""></div><div class="dex-name">${esc(sp.name)}</div>
      <div>${sp.types.map(typeTag).join(' ')}</div>${C.has(id) ? '' : '<div class="hint">Noch nicht gefangen</div>'}`;
  }
  dexEntry(id, national) {
    const st = { page: 'info' };
    const sp = speciesOf(id);
    const caught = new Set(this.progress.dex?.caught || []).has(id);
    const nr = national || !sp.sinnoh ? id : sp.sinnoh;
    const scr = {
      cls: 'm-dex-entry',
      html: () => {
        const tabs = [['info', 'Info'], ['area', 'Gebiet'], ['cry', 'Ruf']];
        const body = st.page === 'area' ? this.dexArea(id) : `
          <div class="entry-top"><div class="dex-sprite big"><img src="${monsterDataUrl(spriteMon(id), false, 128, true)}" alt=""></div>
            <div class="entry-facts"><div class="nr">Nr. ${pad3(nr)} <b>${esc(sp.name)}</b></div>
              <div>${caught ? esc(sp.genus) + '-Pokémon' : '?????-Pokémon'}</div><div>${sp.types.map(typeTag).join(' ')}</div>
              <div class="fact"><span>Größe</span><b>${caught ? fmtHeight(sp.height) : '??? m'}</b></div>
              <div class="fact"><span>Gewicht</span><b>${caught ? fmtWeight(sp.weight) : '???,? kg'}</b></div></div></div>
          <div class="entry-text">${caught ? esc(dexText(id) || 'Für dieses Pokémon ist noch kein Eintrag vorhanden. (npm run texts lädt die Original-Einträge.)') : ''}</div>`;
        return `<div class="dex entry"><div class="dex-head"><b>Pokédex</b><span>${esc(sp.name)}</span></div>${body}
          <div class="tabs-row">${tabs.map(([k, l]) => `<button data-nav data-tab="${k}" class="${st.page === k ? 'on' : ''}">${l}</button>`).join('')}<button data-nav data-back>Zurück</button></div></div>`;
      },
      bind: (root) => {
        root.querySelectorAll('[data-tab]').forEach((b) => {
          b.onclick = () => {
            if (b.dataset.tab === 'cry') { audio.sfx('cry', id); return; }
            st.page = b.dataset.tab; scr.focus = this.navList().indexOf(b); this.render();
            if (st.page === 'area') this.drawArea(id);
          };
        });
        root.querySelector('[data-back]').onclick = () => this.back();
        if (st.page === 'area') this.drawArea(id);
      },
      onKey: (code) => {
        if (code === 'ArrowLeft' || code === 'ArrowRight') {
          const order = ['info', 'area'];
          st.page = order[(order.indexOf(st.page) + (code === 'ArrowRight' ? 1 : order.length - 1)) % order.length];
          this.render(); return true;
        }
        return false;
      }
    };
    return scr;
  }
  // Fundorte: alle Karten, auf denen die Art wild vorkommt
  areasOf(id) {
    const out = [];
    for (const [mid, m] of Object.entries(MAPS)) {
      const e = m.encounters; if (!e) continue;
      const kinds = Object.entries(e).filter(([, v]) => Array.isArray(v) && v.some((s) => s.species === id)).map(([k]) => k);
      if (kinds.length) out.push({ id: mid, name: m.name, kinds });
    }
    return out;
  }
  dexArea(id) {
    const list = this.areasOf(id);
    const KIND = { grass: 'Gras', cave: 'Höhle', water: 'Wasser' };
    return `<div class="area"><canvas id="areaMap" width="440" height="250"></canvas>
      <div class="area-list">${list.length ? list.map((a) => `<div>${esc(a.name)} <span class="hint">${a.kinds.map((k) => KIND[k] || k).join(', ')}</span></div>`).join('') : '<div class="hint">Lebensraum unbekannt.</div>'}</div></div>`;
  }
  drawArea(id) {
    const c = $('areaMap'); if (!c) return;
    const g = c.getContext('2d'); const L = layout();
    const hits = new Set(this.areasOf(id).map((a) => a.id));
    const k = Math.min(c.width / L.w, c.height / L.h);
    const ox = (c.width - L.w * k) / 2; const oy = (c.height - L.h * k) / 2;
    g.fillStyle = '#2c5a9c'; g.fillRect(0, 0, c.width, c.height);
    for (const [mid, p] of Object.entries(L.pos)) {
      const m = MAPS[mid];
      g.fillStyle = p.cave ? 'rgba(90,70,50,.9)' : m.tint === 'snow' ? '#dfe8f0' : '#78b860';
      g.fillRect(ox + (p.x - L.minX) * k, oy + (p.y - L.minY) * k, Math.max(1, m.width * k), Math.max(1, m.height * k));
    }
    for (const [mid, p] of Object.entries(L.pos)) {
      if (!hits.has(mid)) continue;
      const m = MAPS[mid];
      g.fillStyle = 'rgba(232,56,48,.85)';
      g.fillRect(ox + (p.x - L.minX) * k, oy + (p.y - L.minY) * k, Math.max(2, m.width * k), Math.max(2, m.height * k));
    }
  }

  // ---------------------------------------------------------------- Pokemon (Team)
  // pick: { title, label(mon) -> Text oder null, onPick(mon) } fuer Gegenstaende, TMs und Lehrer
  partyScreen(pick = null) {
    const st = { swapFrom: null };
    const scr = {
      cls: 'm-party',
      html: () => `<div class="party-grid">${this.party.map((p, i) => {
        const pct = p.alive ? Math.round((p.hp / p.maxHp) * 100) : 0;
        const tag = pick?.label ? pick.label(p) : null;
        return `<button data-nav data-i="${i}" class="pcard ${p.alive ? '' : 'dead'} ${st.swapFrom === i ? 'swap' : ''} ${i === 0 ? 'lead' : ''}">
          <img src="${monsterIcon(p)}" alt=""><div class="pn">${esc(p.name)} ${genderSym(p.gender)}</div>
          ${p.egg ? `<div class="pl">&nbsp;</div><div class="ptag">${tag || ''}</div>` : `<div class="pl">Lv. ${p.level}${p.status ? ` <span class="st st-${p.status}">${p.status.toUpperCase()}</span>` : ''}</div>
          ${tag ? `<div class="ptag">${tag}</div>` : `<div class="hpbar ${pct <= 20 ? 'low' : pct <= 50 ? 'mid' : ''}"><i style="width:${pct}%"></i></div><div class="php">${p.hp}/${p.maxHp}</div>`}`}
        </button>`;
      }).join('')}</div><div class="party-foot">${pick ? esc(pick.title) : st.swapFrom != null ? 'Mit welchem Pokémon tauschen?' : 'Wähle ein Pokémon.'}</div>
        <button data-nav data-back class="party-back">Zurück</button>`,
      bind: (root) => {
        root.querySelector('[data-back]').onclick = () => this.back();
        root.querySelectorAll('[data-i]').forEach((b) => {
          b.onclick = async () => {
            const i = Number(b.dataset.i); const mon = this.party[i];
            if (pick) return pick.onPick(mon);
            if (st.swapFrom != null) {
              if (st.swapFrom !== i) await this.swapParty(st.swapFrom, i);
              st.swapFrom = null; return this.render(i);
            }
            if (mon.egg && !pick) {
              const c = await this.say(`Ein Ei. ${mon.eggHint || ''}`, ['Tausch', 'Zurück']);
              if (c === 0) { st.swapFrom = i; this.render(i); }
              return;
            }
            const c = await this.say(`Was tun mit ${mon.name}?`, ['Bericht', 'Tausch', 'Zurück']);
            if (c === 0) this.push(this.summaryScreen(i));
            if (c === 1) { st.swapFrom = i; this.render(i); }
          };
        });
      },
      onBack: () => { if (st.swapFrom != null) { st.swapFrom = null; this.render(); return false; } return true; }
    };
    return scr;
  }
  async swapParty(a, b) {
    // Server tauscht nur benachbarte Plaetze nicht, sondern beliebige: partySwap(from, to)
    this.ctx.net.send({ t: 'partySwap', from: a, to: b });
    await this.waitParty();
  }
  waitParty() { return new Promise((r) => { this.partyWaiter = r; setTimeout(r, 800); }); }
  onParty() { const r = this.partyWaiter; this.partyWaiter = null; r?.(); this.refresh(); }

  // ---------------------------------------------------------------- Statusbildschirm (Bericht)
  summaryScreen(index) {
    const st = { i: index, page: 0, moveSel: null, swapMove: null };
    const pages = ['Info', 'Werte', 'Attacken'];
    const scr = {
      cls: 'm-summary',
      html: () => {
        const p = this.party[st.i]; if (!p) return '';
        const sp = speciesOf(p.speciesId) || {};
        const head = `<div class="sum-head"><img src="${monsterDataUrl(p, false, 96, true)}" alt=""><div><b>${esc(p.name)}</b> ${genderSym(p.gender)}<div>Lv. ${p.level}${p.shiny ? ' ★' : ''}</div>
          <div>${p.types.map(typeTag).join(' ')}</div></div><div class="sum-pages">${pages.map((l, i) => `<span class="${i === st.page ? 'on' : ''}">${l}</span>`).join('')}</div></div>`;
        let body = '';
        if (st.page === 0) {
          const ot = esc(this.me?.name || '');
          const met = MAPS[p.metRoute]?.name || (p.metRoute === 'starter' ? 'Zweiblattdorf' : 'unbekannt');
          body = `<div class="sum-rows"><div><span>Nr.</span><b>${pad3(sp.sinnoh && !this.flags.champion ? sp.sinnoh : p.speciesId)}</b></div><div><span>Name</span><b>${esc(p.species)}</b></div>
            <div><span>Typ</span><b>${p.types.map(typeTag).join(' ')}</b></div><div><span>OT</span><b>${ot}</b></div><div><span>ID-Nr.</span><b>${this.progress.trainerId || '00000'}</b></div>
            <div><span>EP</span><b>${p.exp}</b></div><div><span>Nächstes Lv.</span><b>${Math.max(0, (p.expNext || 0) - p.exp)}</b></div></div>
            <div class="sum-memo"><b>${esc(p.nature)}</b> ist sein Wesen. Getroffen in ${esc(met)}${p.metLevel ? ` mit Lv. ${p.metLevel}` : ''}.${p.alive ? '' : ' <span class="dead-note">Gestorben.</span>'}</div>`;
        } else if (st.page === 1) {
          body = `<div class="sum-rows stats">${STAT_ROWS.map(([k, l]) => `<div><span>${l}</span><b>${k === 'hp' ? `${p.hp}/${p.maxHp}` : p.stats?.[k] ?? '?'}</b></div>`).join('')}</div>
            <div class="sum-memo"><b>${esc(abilityName(p.ability))}</b><br>${esc(abilityText(p.ability))}</div>`;
        } else {
          const mv = st.moveSel != null ? p.moves[st.moveSel] : null; const md = mv && moveOf(mv.id);
          body = `<div class="sum-moves">${p.moves.map((m, i) => `<button data-nav data-mv="${i}" class="mrow ${st.swapMove === i ? 'swap' : ''}">${typeTag(m.type)}<span>${esc(m.name)}</span><small>AP ${m.pp}/${m.maxPp}</small></button>`).join('')}</div>
            <div class="sum-memo move-info">${md ? `<div class="mfacts"><span>Kategorie <b>${CAT_DE[md.cat]}</b></span><span>Stärke <b>${md.power || '---'}</b></span><span>Genauigkeit <b>${md.acc ?? '---'}</b></span></div>${esc(moveText(mv.id))}` : 'Wähle eine Attacke, um mehr zu erfahren. Z zweimal: Reihenfolge ändern.'}</div>`;
        }
        return `<div class="summary">${head}${body}<div class="sum-foot"><span class="hint">◀ ▶ Seite · ▲ ▼ Pokémon · X zurück</span></div></div>`;
      },
      bind: (root) => {
        root.querySelectorAll('[data-mv]').forEach((b) => {
          b.addEventListener('focus', () => { if (st.moveSel !== Number(b.dataset.mv)) { st.moveSel = Number(b.dataset.mv); scr.focus = st.moveSel; this.render(); } });
          b.onclick = () => {
            const i = Number(b.dataset.mv);
            if (st.swapMove == null) { st.swapMove = i; return this.render(i); }
            if (st.swapMove !== i) this.ctx.net.send({ t: 'moveSwap', pokemonId: this.party[st.i].id, a: st.swapMove, b: i });
            st.swapMove = null; this.render(i);
          };
        });
      },
      onKey: (code) => {
        const n = this.party.length;
        if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'KeyA' || code === 'KeyD') {
          st.page = (st.page + (code === 'ArrowRight' || code === 'KeyD' ? 1 : 2)) % 3; st.moveSel = st.page === 2 ? 0 : null; scr.focus = 0; audio.sfx('click'); this.render(); return true;
        }
        if (st.page !== 2 && (code === 'ArrowUp' || code === 'ArrowDown' || code === 'KeyW' || code === 'KeyS')) {
          st.i = (st.i + (code === 'ArrowDown' || code === 'KeyS' ? 1 : n - 1)) % n; audio.sfx('cry', this.party[st.i].speciesId); this.render(); return true;
        }
        return false;
      },
      onBack: () => { if (st.swapMove != null) { st.swapMove = null; this.render(); return false; } return true; }
    };
    return scr;
  }

  // ---------------------------------------------------------------- Beutel
  bagScreen(opts = {}) {
    const st = { pocket: opts.pocket || 'item', sel: null };
    const list = () => Object.entries(this.items).filter(([k, n]) => n > 0 && ITEMS[k] && (ITEMS[k].kind === st.pocket || (st.pocket === 'item' && !POCKETS.some(([p]) => p === ITEMS[k].kind))))
      .sort(([a], [b]) => (ITEMS[a].kind === 'tm' ? (a.startsWith('hm') ? 1 : 0) - (b.startsWith('hm') ? 1 : 0) || a.localeCompare(b) : 0));
    const label = (k) => (ITEMS[k].kind === 'tm' ? `${ITEMS[k].name} ${esc(moveOf(ITEMS[k].move)?.name || '')}` : esc(ITEMS[k].name));
    const scr = {
      cls: 'm-bag',
      html: () => {
        const rows = list();
        if (!rows.some(([k]) => k === st.sel)) st.sel = rows[0]?.[0] || null;
        return `<div class="bag"><div class="pockets">${POCKETS.map(([k, l]) => `<button data-nav data-p="${k}" class="${k === st.pocket ? 'on' : ''}">${l}</button>`).join('')}</div>
          <div class="bag-list">${rows.length ? rows.map(([k, n]) => `<button data-nav data-it="${k}">${itemIcon(k)}<span>${label(k)}</span><b>${ITEMS[k].hm ? '' : '×' + n}</b></button>`).join('') : '<div class="hint">Diese Tasche ist leer.</div>'}</div>
          <div class="bag-desc" id="bagDesc">${st.sel ? `${itemIcon(st.sel)}${esc(itemText(st.sel))}` : ''}</div>
          <div class="bag-money">Geld: <b>${this.progress.money ?? 0} ¥</b></div></div>`;
      },
      bind: (root) => {
        root.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => { st.pocket = b.dataset.p; st.sel = null; scr.focus = POCKETS.findIndex(([k]) => k === st.pocket); this.render(); }; });
        root.querySelectorAll('[data-it]').forEach((b) => {
          b.addEventListener('focus', () => { st.sel = b.dataset.it; $('bagDesc').innerHTML = `${itemIcon(st.sel)}${esc(itemText(st.sel))}`; });
          b.onclick = () => this.useBagItem(b.dataset.it);
        });
      },
      onKey: (code) => {
        if ((code === 'ArrowLeft' || code === 'ArrowRight') && document.activeElement?.dataset?.it) {
          const i = POCKETS.findIndex(([k]) => k === st.pocket);
          st.pocket = POCKETS[(i + (code === 'ArrowRight' ? 1 : POCKETS.length - 1)) % POCKETS.length][0]; st.sel = null; scr.focus = POCKETS.length; audio.sfx('click'); this.render(); return true;
        }
        return false;
      }
    };
    return scr;
  }
  async useBagItem(k) {
    const it = ITEMS[k];
    const c = await this.say(`${it.kind === 'tm' ? it.name + ' ' + (moveOf(it.move)?.name || '') : it.name}: Was tun?`, ['Benutzen', 'Zurück']);
    if (c !== 0) return;
    if (it.kind === 'tm') return this.teachTm(k);
    // Schutz und Fluchtseil wirken ohne Pokemon
    if (it.repel || it.rope) {
      this.ctx.net.send({ t: 'useItem', item: k });
      const n = await this.waitNotice();
      if (n && it.rope && !/nicht benutzen/.test(n)) { this.close(); return; }
      return n && this.say(n);
    }
    if (!(it.kind === 'med' || it.evo)) return this.say(it.kind === 'battle' ? 'Das kann man nur im Kampf benutzen.' : 'Das kann man hier nicht benutzen.');
    if (!this.party.length) return this.say('Du hast keine Pokémon.');
    const evoTo = (mon) => (speciesOf(mon.speciesId)?.evos || []).find((e) => e.item === k);
    return this.push(this.partyScreen({
      title: `${it.name} bei welchem Pokémon anwenden?`,
      label: it.evo ? (p) => (p.alive && evoTo(p) ? 'Möglich' : 'Unmöglich') : null,
      onPick: async (mon) => {
        let moveIndex;
        if ((it.pp && !it.all) || it.ppUp) {
          moveIndex = await this.pickMove(mon, mon.moves.map((m) => ({ id: m.id, note: `AP ${m.pp}/${m.maxPp}` })), it.ppUp ? 'AP welcher Attacke erhöhen?' : 'AP welcher Attacke auffüllen?');
          if (moveIndex == null) return;
        }
        this.ctx.net.send({ t: 'useItem', item: k, pokemonId: mon.id, moveIndex });
        const n = await this.waitNotice();
        await this.waitParty();
        if (n) await this.say(n);
        if (!(this.items[k] > 0)) this.back();
      }
    }));
  }
  waitNotice() { return new Promise((r) => { this.noticeWaiter = r; setTimeout(() => { if (this.noticeWaiter === r) { this.noticeWaiter = null; r(null); } }, 1500); }); }
  onNotice(text) { const r = this.noticeWaiter; this.noticeWaiter = null; if (r) { r(text); return true; } return false; }

  // ---------------------------------------------------------------- Attacken lernen
  canLearnTm(mon, moveId) { const sp = speciesOf(mon.speciesId); return !!sp?.tm?.includes(moveId); }
  async teachTm(item) {
    const it = ITEMS[item]; const mv = moveOf(it.move);
    await this.say(`${it.name} wurde eingeschaltet. Es enthält ${mv?.name || it.move}.`);
    const go = await this.say(`Soll ${mv?.name} einem Pokémon beigebracht werden?`, ['Ja', 'Nein']);
    if (go !== 0) return;
    this.push(this.partyScreen({
      title: `Welchem Pokémon ${mv?.name} beibringen?`,
      label: (p) => (p.moves.some((m) => m.id === it.move) ? 'Erlernt' : this.canLearnTm(p, it.move) ? 'Fähig' : 'Unfähig'),
      onPick: async (mon) => {
        if (mon.moves.some((m) => m.id === it.move)) return this.say(`${mon.name} kennt ${mv.name} bereits.`);
        if (!this.canLearnTm(mon, it.move)) return this.say(`${mon.name} kann ${mv.name} nicht erlernen.`);
        const ok = await this.learnFlow(mon, it.move, (replaceIndex) => this.ctx.net.send({ t: 'teach', source: 'tm', item, pokemonId: mon.id, moveId: it.move, replaceIndex }));
        if (ok) { this.back(); if (!(this.items[item] > 0)) this.render(); }
      }
    }));
  }
  // Ablauf wie im Original. send(replaceIndex) schickt die Entscheidung an den Server. Liefert true, wenn gelernt.
  async learnFlow(mon, moveId, send) {
    const mv = moveOf(moveId); const name = mv?.name || moveId;
    if (mon.moves.length < 4) {
      send(mon.moves.length);
      await this.waitParty();
      audio.jingle('levelup');
      await this.say(`${mon.name} hat ${name} erlernt!`);
      return true;
    }
    for (;;) {
      await this.say(`${mon.name} möchte ${name} erlernen.`);
      await this.say(`Aber ${mon.name} kennt bereits vier Attacken.`);
      const c = await this.say(`Soll eine Attacke vergessen werden, um Platz für ${name} zu schaffen?`, ['Ja', 'Nein']);
      if (c === 0) {
        const idx = await this.pickForget(mon, moveId);
        if (idx != null && idx >= 0) {
          const old = mon.moves[idx].name;
          if (isHmMove(mon.moves[idx].id)) { await this.say('VM-Attacken können jetzt nicht vergessen werden.'); continue; }
          send(idx);
          await this.waitParty();
          await this.say('1, 2 und ... Schwupp!');
          await this.say(`${mon.name} hat ${old} vergessen ...`);
          audio.jingle('levelup');
          await this.say(`... und ${name} erlernt!`);
          return true;
        }
      }
      const stop = await this.say(`${name} wirklich nicht erlernen?`, ['Ja', 'Nein']);
      if (stop === 0) { await this.say(`${mon.name} hat ${name} nicht erlernt.`); send(-1); return false; }
    }
  }
  // Auswahl der zu vergessenden Attacke mit Beschreibungen. Liefert Index, -1 = neue verwerfen, null = Abbruch.
  pickForget(mon, newMove) {
    return new Promise((resolve) => {
      const st = { sel: 0 };
      const all = [...mon.moves.map((m) => m.id), newMove];
      const scr = {
        cls: 'm-forget',
        html: () => {
          const id = all[st.sel]; const md = moveOf(id);
          return `<div class="forget"><div class="dex-head"><b>${esc(mon.name)}</b><span>Welche Attacke soll vergessen werden?</span></div>
            <div class="sum-moves">${all.map((m, i) => { const d = moveOf(m); const own = mon.moves[i]; return `<button data-nav data-f="${i}" class="mrow ${i === 4 ? 'new' : ''}">${typeTag(d?.type)}<span>${esc(d?.name || m)}</span><small>AP ${own ? own.pp + '/' + own.maxPp : d?.pp + '/' + d?.pp}</small></button>`; }).join('')}</div>
            <div class="sum-memo move-info">${md ? `<div class="mfacts"><span>Kategorie <b>${CAT_DE[md.cat]}</b></span><span>Stärke <b>${md.power || '---'}</b></span><span>Genauigkeit <b>${md.acc ?? '---'}</b></span></div>${esc(moveText(id))}` : ''}</div></div>`;
        },
        bind: (root) => root.querySelectorAll('[data-f]').forEach((b) => {
          b.addEventListener('focus', () => { const i = Number(b.dataset.f); if (i !== st.sel) { st.sel = i; scr.focus = i; this.render(); } });
          b.onclick = () => { const i = Number(b.dataset.f); this.stack.pop(); this.render(); resolve(i === 4 ? -1 : i); };
        }),
        onBack: () => { setTimeout(() => resolve(null), 0); return true; }
      };
      this.push(scr);
    });
  }

  // Level-Up nach dem Kampf (Ereignis learnPrompt vom Server)
  async levelUpLearn(ev) {
    const mon = this.party.find((p) => p.id === ev.pokemonId);
    if (!mon) return;
    const wasOpen = this.isOpen;
    if (!wasOpen) this.push({ cls: 'm-plain', html: () => `<div class="plain"><img src="${monsterDataUrl(mon, false, 96, true)}" alt=""></div>` });
    await this.learnFlow(mon, ev.moveId, (i) => this.ctx.net.send({ t: 'learnMove', pokemonId: mon.id, moveId: ev.moveId, replaceIndex: i >= mon.moves.length && mon.moves.length < 4 ? i : i }));
    if (!wasOpen) this.close();
  }

  // ---------------------------------------------------------------- Dienste: Lehrer, Erinnerer, Verlerner
  // msg: { kind: 'tutor'|'relearn'|'deleter', title, intro, moves: { [pokemonId]: [{ id, cost? }] }, shards }
  async service(msg) {
    this.serviceMsg = msg;
    if (!this.isOpen) this.push({ cls: 'm-plain', html: () => '<div class="plain"></div>', onBack: () => { this.ctx.net.send({ t: 'serviceDone' }); return true; } });
    const done = () => { this.ctx.net.send({ t: 'serviceDone' }); this.close(); };
    for (;;) {
      const m = this.serviceMsg;
      const title = m.kind === 'deleter' ? 'Welches Pokémon soll eine Attacke vergessen?' : 'Welchem Pokémon soll ich eine Attacke beibringen?';
      const mon = await new Promise((resolve) => {
        this.push(this.partyScreen({
          title,
          label: m.kind === 'deleter' ? null : (p) => ((m.moves[p.id] || []).length ? 'Fähig' : 'Unfähig'),
          onPick: (p) => { this.stack.pop(); this.render(); resolve(p); }
        }));
        this.stack[this.stack.length - 1].onBack = () => { setTimeout(() => resolve(null), 0); return true; };
      });
      if (!mon) return done();
      if (m.kind === 'deleter') {
        if (mon.moves.length <= 1) { await this.say(`${mon.name} kennt nur eine Attacke. Die kann es nicht vergessen.`); continue; }
        const idx = await this.pickMove(mon, mon.moves.map((x) => ({ id: x.id })), 'Welche Attacke soll vergessen werden?');
        if (idx == null) continue;
        const name = mon.moves[idx].name;
        const ok = await this.say(`${mon.name} soll ${name} vergessen?`, ['Ja', 'Nein']);
        if (ok !== 0) continue;
        this.ctx.net.send({ t: 'forget', pokemonId: mon.id, index: idx });
        await this.waitParty();
        await this.say('1, 2 und ... Schwupp!');
        await this.say(`${mon.name} hat ${name} vergessen!`);
        continue;
      }
      const opts = m.moves[mon.id] || [];
      if (!opts.length) { await this.say(m.kind === 'relearn' ? `${mon.name} kann sich an keine Attacke erinnern.` : `Ich kann ${mon.name} leider nichts beibringen.`); continue; }
      const idx = await this.pickMove(mon, opts, m.kind === 'relearn' ? 'An welche Attacke soll es sich erinnern?' : 'Welche Attacke soll es lernen?');
      if (idx == null) continue;
      const choice = opts[idx];
      if (choice.cost && !this.affordable(choice.cost)) { await this.say('Du hast nicht genug Scherben dabei.'); continue; }
      await this.learnFlow(mon, choice.id, (replaceIndex) => { if (replaceIndex >= 0) this.ctx.net.send({ t: 'teach', source: m.kind, pokemonId: mon.id, moveId: choice.id, replaceIndex }); });
      const more = await this.say('Soll ich noch etwas beibringen?', ['Ja', 'Nein']);
      if (more !== 0) return done();
    }
  }
  affordable(cost) { return Object.entries(cost).every(([k, n]) => (this.items[k] || 0) >= n); }
  pickMove(mon, opts, title) {
    return new Promise((resolve) => {
      const st = { sel: 0 };
      const SH = { 'red-shard': 'Rot', 'blue-shard': 'Blau', 'yellow-shard': 'Gelb', 'green-shard': 'Grün' };
      const scr = {
        cls: 'm-forget',
        html: () => {
          const md = moveOf(opts[st.sel]?.id);
          return `<div class="forget"><div class="dex-head"><b>${esc(mon.name)}</b><span>${esc(title)}</span></div>
            <div class="sum-moves scroll">${opts.map((o, i) => { const d = moveOf(o.id); return `<button data-nav data-f="${i}" class="mrow">${typeTag(d?.type)}<span>${esc(d?.name || o.id)}</span><small>${o.note ? esc(o.note) : o.cost ? Object.entries(o.cost).filter(([, n]) => n).map(([k, n]) => `${SH[k]} ${n}`).join(' ') : 'AP ' + (d?.pp ?? '')}</small></button>`; }).join('')}</div>
            <div class="sum-memo move-info">${md ? `<div class="mfacts"><span>Kategorie <b>${CAT_DE[md.cat]}</b></span><span>Stärke <b>${md.power || '---'}</b></span><span>Genauigkeit <b>${md.acc ?? '---'}</b></span></div>${esc(moveText(md.id))}` : ''}
            ${opts[0]?.cost ? `<div class="hint">Deine Scherben: ${Object.entries(SH).map(([k, l]) => `${l} ${this.items[k] || 0}`).join(' · ')}</div>` : ''}</div></div>`;
        },
        bind: (root) => root.querySelectorAll('[data-f]').forEach((b) => {
          b.addEventListener('focus', () => { const i = Number(b.dataset.f); if (i !== st.sel) { st.sel = i; scr.focus = i; this.render(); } });
          b.onclick = () => { this.stack.pop(); this.render(); resolve(Number(b.dataset.f)); };
        }),
        onBack: () => { setTimeout(() => resolve(null), 0); return true; }
      };
      this.push(scr);
    });
  }

  // ---------------------------------------------------------------- Trainerpass
  cardScreen() {
    return {
      cls: 'm-card',
      html: () => {
        const f = this.flags; const p = this.progress;
        return `<div class="tcard"><div class="tc-top"><span>Trainerpass</span><span>ID-Nr. ${p.trainerId || '00000'}</span></div>
          <div class="tc-body"><div class="tc-rows"><div><span>Name</span><b>${esc(this.me?.name)}</b></div><div><span>Geld</span><b>${p.money ?? 0} ¥</b></div>
            <div><span>Pokédex</span><b>${f.dex ? (p.dex?.seen?.length || 0) : '---'}</b></div><div><span>Spielzeit</span><b>${fmtTime(p.playMs)}</b></div></div>
            <div class="tc-photo"></div></div>
          <div class="tc-badges">${BADGES.map((b) => `<i class="tc-badge ${f[b.flag] ? 'on' : ''}" style="--c:${b.color}" title="${esc(b.name)}"></i>`).join('')}</div>
          <button data-nav data-back>Zurück</button></div>`;
      },
      bind: (root) => { root.querySelector('[data-back]').onclick = () => this.back(); }
    };
  }

  // ---------------------------------------------------------------- Speichern
  saveScreen() {
    const scr = {
      cls: 'm-save',
      html: () => {
        const p = this.progress; const f = this.flags;
        return `<div class="save-info"><div><b>${esc(MAPS[this.me?.map]?.name || '')}</b></div><div><span>Spieler</span><b>${esc(this.me?.name)}</b></div>
          <div><span>Orden</span><b>${BADGES.filter((b) => f[b.flag]).length}</b></div><div><span>Pokédex</span><b>${f.dex ? (p.dex?.seen?.length || 0) : '---'}</b></div>
          <div><span>Spielzeit</span><b>${fmtTime(p.playMs)}</b></div></div>`;
      },
      bind: () => setTimeout(() => this.runSave(), 0)
    };
    return scr;
  }
  async runSave() {
    const c = await this.say('Möchtest du das Spiel speichern?', ['Ja', 'Nein']);
    if (c !== 0) return this.back();
    const saved = new Promise((r) => { this.waitSaved = r; setTimeout(() => r(null), 5000); });
    this.ctx.net.send({ t: 'save' });
    const sayDone = this.say('Speichern ... Bitte das Spiel nicht schließen.');
    const res = await saved; this.waitSaved = null;
    await sleep(600);
    this.msgAdvance?.(); await sayDone;
    if (res) { audio.jingle('item'); await this.say(`${this.me?.name} hat das Spiel gespeichert.`); } else await this.say('Das Speichern hat nicht geklappt.');
    this.close();
  }
  onSaved(m) { this.waitSaved?.(m); }

  // ---------------------------------------------------------------- Optionen
  optionsScreen() {
    const draft = { ...options };
    const scr = {
      cls: 'm-options',
      html: () => `<div class="opts"><div class="dex-head"><b>Optionen</b></div>${OPTION_DEFS.map((d) => {
        const i = d.values.findIndex(([v]) => v === draft[d.key]);
        return `<div class="opt-row"><span>${d.label}</span><button data-nav data-o="${d.key}">◀ <b>${d.values[Math.max(0, i)][1]}</b> ▶</button></div>`;
      }).join('')}<div class="opt-preview frame-${draft.frame}"><span>So sieht das Textfenster aus.</span></div>
        <div class="opt-btns"><button data-nav data-ok>Bestätigen</button><button data-nav data-back>Abbrechen</button></div></div>`,
      bind: (root) => {
        root.querySelectorAll('[data-o]').forEach((b) => { b.onclick = () => this.cycleOption(draft, b.dataset.o, 1, scr, b); });
        root.querySelector('[data-ok]').onclick = () => { for (const d of OPTION_DEFS) setOption(d.key, draft[d.key]); this.back(); };
        root.querySelector('[data-back]').onclick = () => this.back();
      },
      onKey: (code) => {
        const k = document.activeElement?.dataset?.o;
        if (k && (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'KeyA' || code === 'KeyD')) { this.cycleOption(draft, k, code === 'ArrowRight' || code === 'KeyD' ? 1 : -1, scr, document.activeElement); return true; }
        return false;
      }
    };
    return scr;
  }
  cycleOption(draft, key, dir, scr, btn) {
    const d = OPTION_DEFS.find((x) => x.key === key);
    const i = d.values.findIndex(([v]) => v === draft[key]);
    draft[key] = d.values[(Math.max(0, i) + dir + d.values.length) % d.values.length][0];
    scr.focus = this.navList().indexOf(btn); audio.sfx('click'); this.render();
  }
}
