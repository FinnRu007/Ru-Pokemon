// Seitenleiste: Team, Nuzlocke-Uebersicht, Seelenbaender, Box, Log und Chat.
import { monsterIcon } from './art/monsters.js';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ROUTE_NAMES = { starter: 'Starter' };
const OUTCOME = { caught: 'gefangen', failed: 'verloren', pending: 'läuft' };
const CAUSE = { fainted: 'im Kampf gefallen', soulbound: 'Seelenband', soulbound_failed_encounter: 'Seelenband gerissen' };

export class Hud {
  constructor(net, manifest, maps) {
    this.net = net; this.m = manifest; this.maps = maps;
    this.party = []; this.box = [];
    document.querySelectorAll('.tabs button').forEach((b) => {
      b.onclick = () => {
        document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x === b));
        document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('hidden', t.id !== 'tab-' + b.dataset.tab));
      };
    });
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
  chat(from, text) { this.log(`<b>${esc(from)}:</b> ${esc(text)}`, 'chat'); }

  monRow(p, actions) {
    const pct = p.alive ? Math.round((p.hp / p.maxHp) * 100) : 0;
    const cls = pct <= 20 ? 'low' : pct <= 50 ? 'mid' : '';
    const sub = p.alive ? `Lv${p.level} · ${p.hp}/${p.maxHp}${p.status ? ' · ' + p.status.toUpperCase() : ''}` : `† ${CAUSE[p.deathCause] || 'tot'}`;
    return `<div class="mon ${p.alive ? '' : 'dead'}"><img class="icon" src="${monsterIcon(p)}" alt="">
      <div><div class="name">${esc(p.name)}${p.shiny ? ' ★' : ''}</div><div class="sub">${esc(p.species)} · ${sub}</div>
      <div class="hpbar ${cls}"><i style="width:${pct}%"></i></div></div><div class="acts">${actions}</div></div>`;
  }

  setParty(msg) {
    this.party = msg.party; this.box = msg.box;
    $('tab-party').innerHTML = msg.party.map((p, i) => this.monRow(p,
      `${i > 0 ? `<button data-a="up" data-i="${i}">▲</button>` : ''}<button data-a="nick" data-id="${p.id}">✎</button><button data-a="tobox" data-id="${p.id}">Box</button>`)).join('')
      + `<div class="hint">Bälle: ${msg.items['poke-ball'] || 0} Pokéball · ${msg.items['great-ball'] || 0} Superball · ${msg.items['ultra-ball'] || 0} Hyperball</div>`;
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
    const r = msg.rules;
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
