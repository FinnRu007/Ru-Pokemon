// Seitenleiste: Team, Nuzlocke-Uebersicht, Seelenbaender, Box, Log und Chat.
import { monsterIcon, itemIcon } from './art/monsters.js';
import { ITEMS, POCKETS, pocketOf, sortItems } from '/shared/data/items.js';
import { moveOf } from './texts.js';
import { BADGES } from '/shared/data/story.js';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ROUTE_NAMES = { starter: 'Starter' };
const OUTCOME = { caught: 'gefangen', failed: 'verloren', pending: 'läuft' };
const CAUSE = { fainted: 'im Kampf gefallen', soulbound: 'Seelenband', soulbound_failed_encounter: 'Seelenband gerissen' };

export class Hud {
  constructor(net, manifest, maps) {
    this.net = net; this.m = manifest; this.maps = maps;
    this.party = []; this.box = []; this.items = {}; this.progress = { flags: {}, money: 0 }; this.pocket = 'items';
    document.querySelectorAll('.tabs button').forEach((b) => { b.onclick = () => this.showTab(b.dataset.tab); });
  }

  showTab(tab) {
    document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x.dataset.tab === tab));
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('hidden', t.id !== 'tab-' + tab));
  }
  // Reiter Nuzlocke und Seelenband nur, wenn die Regel in diesem Spiel gilt
  setRuleTabs(rules) {
    const on = { nuzlocke: !!rules?.nuzlocke, links: !!(rules?.nuzlocke && rules?.soulbound) };
    for (const [tab, show] of Object.entries(on)) document.querySelector(`.tabs button[data-tab="${tab}"]`)?.classList.toggle('hidden', !show);
    const active = document.querySelector('.tabs button.active');
    if (!active || active.classList.contains('hidden')) this.showTab('party');
  }

  routeName(r) { return ROUTE_NAMES[r] || this.maps[r]?.name || r; }

  log(text, cls = '') {
    const el = $('log');
    const line = document.createElement('div');
    line.className = cls ? 'lg-' + cls : '';
    line.innerHTML = cls === 'chat' ? text : esc(text);
    el.appendChild(line);
    while (el.children.length > 200) el.firstChild.remove();
    el.scrollTop = el.scrollHeight;
  }
  chat(from, text) { this.log(`<b>${esc(from)}:</b> ${esc(text)}`, 'chat'); this.onChat?.(); }

  monRow(p, actions) {
    const pct = p.alive ? Math.round((p.hp / p.maxHp) * 100) : 0;
    const cls = pct <= 20 ? 'low' : pct <= 50 ? 'mid' : '';
    const sub = p.egg ? (p.eggHint || '') : p.alive ? `Lv${p.level} · ${p.hp}/${p.maxHp}${p.status ? ' · ' + p.status.toUpperCase() : ''}` : `† ${CAUSE[p.deathCause] || 'tot'}`;
    return `<div class="mon ${p.alive ? '' : 'dead'}"><img class="icon" src="${monsterIcon(p)}" alt="">
      <div><div class="name">${esc(p.name)}${p.shiny ? ' ★' : ''}</div><div class="sub">${p.egg ? esc(sub) : `${esc(p.species)} · ${sub}`}</div>
      <div class="hpbar ${cls}"><i style="width:${pct}%"></i></div></div><div class="acts">${actions}</div></div>`;
  }

  setProgress(m) {
    this.progress = m;
    const badges = BADGES.filter((b) => m.flags?.[b.flag]);
    $('trainerCard').innerHTML = `<span>Geld: <b>${m.money ?? 0} ¥</b></span><span>Orden: ${badges.length
      ? badges.map((b) => `<i class="badge-icon" style="background:${b.color}" title="${esc(b.name)}"></i>${esc(b.name)}`).join(' ') : 'keine'}</span>`;
  }

  // Beutel wie in Platin: Taschen als Reiter, innerhalb nach Itemnummer sortiert
  renderBag() {
    const owned = Object.keys(this.items).filter((k) => this.items[k] > 0 && ITEMS[k]);
    const count = (p) => owned.filter((k) => pocketOf(k) === p).length;
    const alive = this.party.filter((p) => p.alive && !p.egg);
    const rows = sortItems(owned.filter((k) => pocketOf(k) === this.pocket));
    const name = (k) => (ITEMS[k].kind === 'tm' ? `${ITEMS[k].name} ${moveOf(ITEMS[k].move)?.name || ''}` : ITEMS[k].name);
    const tabs = `<div class="bag-pockets">${POCKETS.map(([k, l]) => `<button data-pocket="${k}" class="${k === this.pocket ? 'on' : ''}${count(k) ? '' : ' empty'}">${l}</button>`).join('')}</div>`;
    const list = rows.length ? rows.map((k) => {
      const it = ITEMS[k]; const n = this.items[k];
      const use = it.kind === 'med' && (it.heal || it.cure || it.revive) && alive.length ? `<div class="use">${alive.map((p) => `<button data-item="${k}" data-id="${p.id}" title="${esc(p.name)}"><img class="icon" src="${monsterIcon(p)}" alt=""></button>`).join('')}</div>` : '';
      return `<div class="bag-row"><span>${itemIcon(k)}${esc(name(k))}</span><span>${it.hm ? '' : 'x' + n}</span>${use}</div>`;
    }).join('') + (this.pocket === 'medicine' ? '<div class="hint">Heilmittel: auf das Pokémon klicken, das es bekommen soll.</div>' : '')
      : `<div class="hint">${owned.length ? 'Diese Tasche ist leer.' : 'Dein Beutel ist leer.'}</div>`;
    $('tab-bag').innerHTML = tabs + `<div class="bag-items">${list}</div>`;
    for (const b of document.querySelectorAll('#tab-bag button[data-pocket]')) b.onclick = () => { this.pocket = b.dataset.pocket; this.renderBag(); };
    for (const b of document.querySelectorAll('#tab-bag button[data-item]')) b.onclick = () => this.net.send({ t: 'useItem', item: b.dataset.item, pokemonId: b.dataset.id });
  }

  setParty(msg) {
    this.party = msg.party; this.box = msg.box; this.items = msg.items || {};
    this.renderBag();
    $('tab-party').innerHTML = msg.party.length ? msg.party.map((p, i) => this.monRow(p,
      `${i > 0 ? `<button data-a="up" data-i="${i}">▲</button>` : ''}<button data-a="nick" data-id="${p.id}">✎</button><button data-a="tobox" data-id="${p.id}">Box</button>`)).join('')
      : '<div class="hint">Du hast noch kein Pokémon.</div>';
    $('tab-box').innerHTML = msg.box.length ? msg.box.map((p) => this.monRow(p, p.alive ? `<button data-a="toparty" data-id="${p.id}">Team</button>` : '')).join('') : '<div class="hint">Box ist leer.</div>';
    for (const btn of document.querySelectorAll('#tab-party button, #tab-box button')) {
      btn.onclick = () => {
        const a = btn.dataset.a;
        if (a === 'up') this.net.send({ t: 'partySwap', from: Number(btn.dataset.i), to: Number(btn.dataset.i) - 1 });
        if (a === 'tobox') this.net.send({ t: 'boxMove', pokemonId: btn.dataset.id, to: 'box' });
        if (a === 'toparty') this.net.send({ t: 'boxMove', pokemonId: btn.dataset.id, to: 'party' });
        if (a === 'nick') { const n = prompt('Spitzname (leer = keiner):'); if (n !== null) this.net.send({ t: 'nickname', pokemonId: btn.dataset.id, name: n }); }
      };
    }
  }

  setNuzlocke(msg) {
    const r = msg.rules || {};
    this.setRuleTabs(r);
    const flags = [r.nuzlocke && 'Nuzlocke', r.soulbound && 'Soulbound', r.dupesClause && 'Dupes', r.shinyClause && 'Shiny'].filter(Boolean).join(' · ');
    $('tab-nuzlocke').innerHTML = `<div class="hint">Regeln: ${flags || 'keine'}</div>` + (msg.encounters.length
      ? msg.encounters.map((e) => `<div class="route"><span>${esc(this.routeName(e.route))}</span><span>${esc(e.species)} <span class="badge ${e.outcome}">${OUTCOME[e.outcome] || e.outcome}</span></span></div>`).join('')
      : '<div class="hint">Noch keine Encounter.</div>');
    $('tab-links').innerHTML = r.soulbound ? (msg.links.length ? msg.links.map((l) => `
      <div class="link"><b>${esc(this.routeName(l.route))}</b> <span class="badge ${l.state}">${{ active: 'aktiv', dead: 'tot', broken: 'gerissen' }[l.state]}</span>
      <div class="members">${l.members.map((m) => `<span>${m.alive ? '♥' : '†'} ${esc(m.name)} <span class="hint">(${esc(m.playerName)})</span></span>`).join('')}</div></div>`).join('')
      : '<div class="hint">Noch keine Seelenbänder. Fänge auf derselben Route werden automatisch verbunden.</div>')
      : '<div class="hint">Soulbound ist in diesem Run deaktiviert.</div>';
  }
}
