// Tausch mit einem anderen Spieler wie im Union-Raum: jeder bietet ein Pokémon an, sieht das Angebot
// des anderen mit allen Werten, und erst wenn beide zustimmen, wird getauscht.
import { monsterIcon, monsterDataUrl, typeBadge } from './art/monsters.js';
import { speciesOf, moveOf } from './texts.js';
import { ITEMS } from '/shared/data/items.js';
import { audio } from './audio.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function tradeScreen(menu, first) {
  const st = { m: first };
  const send = (msg) => menu.ctx.net.send({ t: 'trade', ...msg });
  const card = (p) => {
    if (!p) return '<div class="tr-empty">Noch kein Angebot</div>';
    const sp = speciesOf(p.speciesId);
    const moves = (p.moves || []).map((mv) => esc(moveOf(mv.id)?.name || mv.name || mv.id)).join(', ');
    return `<div class="tr-card"><img src="${p.egg ? monsterIcon(p) : monsterDataUrl(p, false, 96)}" alt="">
      <div><b>${esc(p.name)}</b> ${p.egg ? '' : `Lv. ${p.level}`}<br><small>${p.egg ? 'Ei' : esc(sp?.name || p.species || '')}</small>
      <div>${p.egg ? '' : (sp?.types || []).map((t) => typeBadge(t)).join(' ')}</div>
      ${p.egg ? '' : `<small>Wesen: ${esc(p.nature)} · Item: ${p.item ? esc(ITEMS[p.item]?.name || p.item) : 'keins'}</small><br><small>${moves}</small>`}</div></div>`;
  };
  const scr = {
    cls: 'm-trade',
    html: () => {
      const m = st.m; const party = menu.party;
      const status = !m.mine ? 'Wähle ein Pokémon, das du anbieten möchtest.' : !m.theirs ? `Warte auf das Angebot von ${esc(m.partner)} ...`
        : m.okMine && !m.okTheirs ? `Warte, bis ${esc(m.partner)} zustimmt ...` : m.okTheirs ? `${esc(m.partner)} ist bereit zu tauschen.` : 'Beide Angebote stehen. Tauschen?';
      return `<div class="trade"><div class="dex-head"><b>Tausch mit ${esc(m.partner)}</b><span>${status}</span></div>
        <div class="tr-grid"><div class="tr-party">${party.map((p) => `<button data-nav data-offer="${p.id}" class="tr-mon ${p.id === m.mine ? 'sel' : ''}" ${p.alive === false ? 'disabled' : ''}><img src="${monsterIcon(p)}" alt=""><span>${esc(p.name)}<small>${p.egg ? 'Ei' : 'Lv. ' + p.level}</small></span></button>`).join('')}</div>
        <div class="tr-theirs"><div class="tr-label">Angebot von ${esc(m.partner)}</div>${card(m.theirs)}</div></div>
        <div class="tr-actions"><button data-nav data-go ${m.mine && m.theirs && !m.okMine ? '' : 'disabled'}>Tauschen</button><button data-nav data-cancel>Abbrechen</button></div>
        ${m.text ? `<div class="tr-note">${esc(m.text)}</div>` : ''}</div>`;
    },
    bind: (root) => {
      root.querySelectorAll('[data-offer]').forEach((b) => { b.onclick = () => { audio.sfx('select'); send({ op: 'offer', pokemonId: b.dataset.offer }); }; });
      const go = root.querySelector('[data-go]'); if (go) go.onclick = () => { audio.sfx('select'); send({ op: 'confirm' }); };
      const no = root.querySelector('[data-cancel]'); if (no) no.onclick = () => { audio.sfx('back'); send({ op: 'cancel' }); };
    },
    onKey: (code) => {
      if (['KeyX', 'Escape', 'Backspace'].includes(code)) { audio.sfx('back'); send({ op: 'cancel' }); return true; }
      return false;
    },
    onBack: () => { send({ op: 'cancel' }); return false; },
    update: (m) => { st.m = m; menu.render(); }
  };
  return scr;
}
