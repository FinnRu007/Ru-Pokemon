// Seitenleiste: ein Reiter mit Karte, Team (mit Nuzlocke und Seelenbaendern) und Box. Chat und Meldungen
// laufen unten links im Spielbild ein und verblassen (#chatFeed).
import { monsterIcon } from './art/monsters.js';
import { BADGES } from '/shared/data/story.js';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ROUTE_NAMES = { starter: 'Starter' };
const OUTCOME = { caught: 'gefangen', failed: 'verloren', pending: 'läuft' };
const CAUSE = { fainted: 'im Kampf gefallen', soulbound: 'Seelenband', soulbound_failed_encounter: 'Seelenband gerissen' };

export class Hud {
  constructor(net, manifest, maps) {
    this.net = net; this.m = manifest; this.maps = maps;
    this.party = []; this.box = []; this.items = {}; this.progress = { flags: {}, money: 0 };
    document.querySelectorAll('.tabs button').forEach((b) => { b.onclick = () => this.showTab(b.dataset.tab); });
  }

  showTab(tab) {
    document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x.dataset.tab === tab));
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('hidden', t.id !== 'tab-' + tab));
    try { localStorage.setItem('platin.tab', tab); } catch { /* privat */ }
    this.onTab?.(tab);
  }
  restoreTab() {
    let tab = 'party';
    try { tab = localStorage.getItem('platin.tab') || tab; } catch { /* privat */ }
    this.showTab(document.getElementById('tab-' + tab) ? tab : 'party');
  }

  routeName(r) { return ROUTE_NAMES[r] || this.maps[r]?.name || r; }

  // Meldungen und Chat unten links im Spielbild; Texte aus Dialogen und Kampf stehen dort schon
  log(text, cls = '') {
    if (cls === 'dialog' || cls === 'battle') return;
    const el = $('chatFeed');
    const line = document.createElement('div');
    line.className = cls ? 'lg-' + cls : '';
    line.innerHTML = cls === 'chat' ? text : esc(text);
    el.appendChild(line);
    while (el.children.length > 6) el.firstChild.remove();
    setTimeout(() => line.classList.add('old'), cls === 'chat' ? 12000 : 7000);
    setTimeout(() => line.remove(), cls === 'chat' ? 13000 : 8000);
  }
  chat(from, text) { this.log(`<b>${esc(from)}:</b> ${esc(text)}`, 'chat'); }

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

  setParty(msg) {
    this.party = msg.party; this.box = msg.box; this.items = msg.items || {};
    $('partyList').innerHTML = msg.party.length ? msg.party.map((p, i) => this.monRow(p,
      `${i > 0 ? `<button data-a="up" data-i="${i}">▲</button>` : ''}<button data-a="nick" data-id="${p.id}">✎</button><button data-a="tobox" data-id="${p.id}">Box</button>`)).join('')
      : '<div class="hint">Du hast noch kein Pokémon.</div>';
    $('tab-box').innerHTML = msg.box.length ? msg.box.map((p) => this.monRow(p, p.alive ? `<button data-a="toparty" data-id="${p.id}">Team</button>` : '')).join('') : '<div class="hint">Box ist leer.</div>';
    for (const btn of document.querySelectorAll('#partyList button, #tab-box button')) {
      btn.onclick = () => {
        const a = btn.dataset.a;
        if (a === 'up') this.net.send({ t: 'partySwap', from: Number(btn.dataset.i), to: Number(btn.dataset.i) - 1 });
        if (a === 'tobox') this.net.send({ t: 'boxMove', pokemonId: btn.dataset.id, to: 'box' });
        if (a === 'toparty') this.net.send({ t: 'boxMove', pokemonId: btn.dataset.id, to: 'party' });
        if (a === 'nick') { const n = prompt('Spitzname (leer = keiner):'); if (n !== null) this.net.send({ t: 'nickname', pokemonId: btn.dataset.id, name: n }); }
      };
    }
  }

  // Nuzlocke und Seelenbaender stehen im Reiter Team unter dem Team, nur wenn die Regel gilt
  setNuzlocke(msg) {
    const r = msg.rules || {};
    if (!r.nuzlocke) { $('nuzInfo').innerHTML = ''; return; }
    const flags = [r.nuzlocke && 'Nuzlocke', r.soulbound && 'Soulbound', r.dupesClause && 'Dupes', r.shinyClause && 'Shiny'].filter(Boolean).join(' · ');
    const enc = msg.encounters.length
      ? msg.encounters.map((e) => `<div class="route"><span>${esc(this.routeName(e.route))}</span><span>${esc(e.species)} <span class="badge ${e.outcome}">${OUTCOME[e.outcome] || e.outcome}</span></span></div>`).join('')
      : '<div class="hint">Noch keine Encounter.</div>';
    const links = !r.soulbound ? '' : msg.links.length ? msg.links.map((l) => `
      <div class="link"><b>${esc(this.routeName(l.route))}</b> <span class="badge ${l.state}">${{ active: 'aktiv', dead: 'tot', broken: 'gerissen' }[l.state]}</span>
      <div class="members">${l.members.map((m) => `<span>${m.alive ? '♥' : '†'} ${esc(m.name)} <span class="hint">(${esc(m.playerName)})</span></span>`).join('')}</div></div>`).join('')
      : '<div class="hint">Noch keine Seelenbänder. Fänge auf derselben Route werden automatisch verbunden.</div>';
    $('nuzInfo').innerHTML = `<h4>Nuzlocke <span class="hint">${flags}</span></h4>${enc}${r.soulbound ? `<h4>Seelenbänder</h4>${links}` : ''}`;
  }
}
