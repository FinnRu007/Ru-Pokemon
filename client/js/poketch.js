// Pokétch wie in Platin: grüner Bildschirm mit Anwendungen, mit den Pfeiltasten links und rechts
// gewechselt. Uhr, Markierungskarte (wandernde Pokémon), Schrittzähler und Pokémon-Liste.
import { MAPS } from '/shared/data/maps.js';
import { monsterIcon } from './art/monsters.js';
import { layout, worldPos, placeName } from './worldmap.js';
import { audio } from './audio.js';

const APPS = [['clock', 'Digitaluhr'], ['map', 'Markierungskarte'], ['steps', 'Schrittzähler'], ['party', 'Pokémon-Liste']];
const LCD = { bg: '#9cc88c', mid: '#5c8c54', ink: '#183018' };
const pad = (n) => String(n).padStart(2, '0');
const stepKey = (name) => 'platin.poketch.steps.' + (name || '').toLowerCase();

export function poketchScreen(menu) {
  const st = { app: 0, data: null, timer: null };
  menu.ctx.net.send({ t: 'poketch' });
  const name = () => menu.me?.name || '';
  const offset = () => { try { return Number(localStorage.getItem(stepKey(name()))) || 0; } catch { return 0; } };

  const body = () => {
    const d = st.data;
    switch (APPS[st.app][0]) {
      case 'clock': {
        const t = new Date();
        return `<div class="pt-clock">${pad(t.getHours())}<span class="blink">:</span>${pad(t.getMinutes())}</div>
          <div class="pt-sub">${t.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</div>`;
      }
      case 'map':
        return `<canvas class="pt-map" width="320" height="200"></canvas>
          <div class="pt-list">${!d ? 'Lade ...' : d.roamers.length ? d.roamers.map((r) => `<div>${r.name}: ${placeName(r.map)}</div>`).join('') : 'Keine wandernden Pokémon unterwegs.'}</div>`;
      case 'steps': {
        const n = Math.max(0, (d?.steps || 0) - offset());
        return `<div class="pt-clock">${String(n).padStart(5, '0')}</div><div class="pt-sub">Schritte</div>
          <button data-nav class="pt-btn" data-reset>Zurücksetzen</button>`;
      }
      case 'party':
        if (!d) return '<div class="pt-sub">Lade ...</div>';
        return `<div class="pt-party">${d.party.map((p) => {
          const pct = p.egg ? 0 : Math.round((p.hp / Math.max(1, p.maxHp)) * 100);
          return `<div class="pt-mon"><img src="${monsterIcon(p)}" alt=""><div class="pt-hp"><i style="width:${pct}%"></i></div>${p.item ? '<b class="pt-item">●</b>' : ''}</div>`;
        }).join('')}</div>`;
    }
    return '';
  };

  const drawMap = (root) => {
    const c = root.querySelector('.pt-map');
    if (!c) return;
    const g = c.getContext('2d'); const L = layout();
    const k = Math.min(c.width / L.w, c.height / L.h);
    const ox = (c.width - L.w * k) / 2; const oy = (c.height - L.h * k) / 2;
    g.fillStyle = LCD.bg; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = LCD.mid;
    for (const [id, p] of Object.entries(L.pos)) {
      if (p.cave || !MAPS[id]) continue;
      g.fillRect(ox + (p.x - L.minX) * k, oy + (p.y - L.minY) * k, Math.max(1, MAPS[id].width * k), Math.max(1, MAPS[id].height * k));
    }
    const dot = (mapId, x, y, r, fill) => {
      const w = worldPos(mapId, x, y);
      if (!w) return;
      g.fillStyle = fill; g.beginPath(); g.arc(ox + w.x * k, oy + w.y * k, r, 0, Math.PI * 2); g.fill();
    };
    for (const r of st.data?.roamers || []) { const m = MAPS[r.map]; if (m) dot(r.map, m.width / 2, m.height / 2, 5, LCD.ink); }
    const me = menu.me;
    if (me && Math.floor(performance.now() / 500) % 2 === 0) dot(me.map, me.x, me.y, 3, '#f8f8f8');
  };

  const scr = {
    cls: 'm-poketch',
    html: () => `<div class="poketch"><div class="pt-screen"><div class="pt-title">${APPS[st.app][1]}</div>${body()}</div>
      <div class="pt-nav"><button data-nav data-app="-1">◀</button><span>${st.app + 1} / ${APPS.length}</span><button data-nav data-app="1">▶</button></div></div>`,
    bind: (root) => {
      root.querySelectorAll('[data-app]').forEach((b) => { b.onclick = () => switchApp(Number(b.dataset.app)); });
      const r = root.querySelector('[data-reset]');
      if (r) r.onclick = () => { try { localStorage.setItem(stepKey(name()), String(st.data?.steps || 0)); } catch { /* privat */ } audio.sfx('select'); menu.render(); };
      drawMap(root);
      // Uhr und blinkende Markierung laufen weiter, solange der Pokétch offen ist
      clearInterval(st.timer);
      st.timer = setInterval(() => {
        if (menu.stack[menu.stack.length - 1] !== scr || !menu.isOpen) { clearInterval(st.timer); return; }
        if (APPS[st.app][0] === 'map') drawMap(menu.root);
        else if (APPS[st.app][0] === 'clock' && !menu.msgResolve) menu.render();
      }, 500);
    },
    onKey: (code) => {
      if (code === 'ArrowLeft' || code === 'KeyA') { switchApp(-1); return true; }
      if (code === 'ArrowRight' || code === 'KeyD') { switchApp(1); return true; }
      return false;
    },
    onData: (d) => { st.data = d; menu.render(); }
  };
  const switchApp = (dir) => { st.app = (st.app + dir + APPS.length) % APPS.length; audio.sfx('click'); if (APPS[st.app][0] !== 'clock') menu.ctx.net.send({ t: 'poketch' }); menu.render(); };
  return scr;
}
