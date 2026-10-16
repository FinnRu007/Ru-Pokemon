// Pokétch wie in Platin: Bildschirm mit vier Graustufen, rechts der Knopf zum Wechseln der App
// (oben zurück, unten weiter, Tasten Q und E, bei Apps ohne Knöpfe auch die Pfeiltasten links und rechts).
// Welche Apps es gibt, steht in shared/data/poketch.js; die Daten aus dem Spielstand kommen vom Server.
import { MAPS } from '/shared/data/maps.js';
import { TYPES, TYPE_NAMES_DE, typeEffectiveness } from '/shared/data/types.js';
import { appsOf } from '/shared/data/poketch.js';
import { monsterIcon } from './art/monsters.js';
import { layout, worldPos, placeName } from './worldmap.js';
import { audio } from './audio.js';

// Farbwechsler: acht Farben mit je vier Stufen (hell bis dunkel) wie das Display im Original
const PALETTES = [
  ['Grün', ['#9cc88c', '#78a868', '#4a7044', '#183018']],
  ['Gelb', ['#e8e088', '#c0b050', '#807028', '#383010']],
  ['Orange', ['#f4c088', '#d09050', '#905428', '#402010']],
  ['Rot', ['#f4a8a8', '#d07070', '#903c3c', '#401818']],
  ['Lila', ['#d8b0e8', '#a880c0', '#704c88', '#302040']],
  ['Blau', ['#b0c8f4', '#7c98d0', '#4c6094', '#182040']],
  ['Türkis', ['#a8e4e0', '#70b4b0', '#3c7c78', '#103838']],
  ['Weiß', ['#f4f4f4', '#bcbcbc', '#7c7c7c', '#282828']]
];
const pad = (n, l = 2) => String(n).padStart(l, '0');
const WEEK = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const store = {
  get(k, d) { try { const v = localStorage.getItem('platin.poketch.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('platin.poketch.' + k, JSON.stringify(v)); } catch { /* privat */ } }
};
// Pro Spieler gespeichert: Schrittzähler-Nullpunkt, Notizen, Zeichnungen, Kalender, Zähler
const own = (name, k) => `${k}.${(name || '').toLowerCase()}`;
const palette = () => PALETTES[store.get('color', 0)]?.[1] || PALETTES[0][1];

let active = null;
addEventListener('keydown', (e) => {
  if (!active || e.target.tagName === 'INPUT' || active.menu.msgResolve) return;
  if (active.menu.stack[active.menu.stack.length - 1] !== active.scr || !active.menu.isOpen) return;
  if (e.code === 'KeyQ' || e.code === 'PageUp') { e.preventDefault(); active.switchApp(-1); }
  if (e.code === 'KeyE' || e.code === 'PageDown') { e.preventDefault(); active.switchApp(1); }
}, true);

export function poketchScreen(menu) {
  const name = () => menu.me?.name || '';
  const apps = () => appsOf(menu.flags);
  const st = { app: 0, data: null, timer: null, calc: { show: '0', acc: null, op: null, fresh: true }, coin: null, spin: null, pen: true, dowse: 0, move: { atk: 0, d1: 0, d2: -1 }, cal: new Date(), kt: { left: store.get('kt', 180), run: false, end: 0, ring: 0 } };
  const startId = store.get('app', 'clock');
  st.app = Math.max(0, apps().findIndex(([id]) => id === startId));
  menu.ctx.net.send({ t: 'poketch' });
  const cur = () => apps()[st.app] || apps()[0];
  const steps = () => Math.max(0, (st.data?.steps || 0) - store.get(own(name(), 'steps'), 0));
  const btn = (attr, label, cls = '') => `<button data-nav class="pt-key ${cls}" ${attr}>${label}</button>`;

  const body = () => {
    const d = st.data;
    switch (cur()[0]) {
      case 'clock': {
        const t = new Date();
        return `<div class="pt-clock">${pad(t.getHours())}<span class="blink">:</span>${pad(t.getMinutes())}</div>
          <div class="pt-sub">${t.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</div>`;
      }
      case 'calc': {
        const keys = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '=', '+'];
        return `<div class="pt-lcd">${st.calc.show}</div><div class="pt-grid4">${keys.map((k) => btn(`data-calc="${k}"`, k)).join('')}</div>
          <div class="pt-row">${btn('data-calc="C"', 'C', 'wide')}</div>`;
      }
      case 'memo':
        return `<canvas class="pt-canvas" data-draw="memo" width="192" height="120"></canvas>
          <div class="pt-row">${btn('data-pen="1"', 'Stift', st.pen ? 'on' : '')}${btn('data-pen="0"', 'Radierer', st.pen ? '' : 'on')}${btn('data-clear', 'Löschen')}</div>`;
      case 'steps':
        return `<div class="pt-clock">${pad(steps(), 5)}</div><div class="pt-sub">Schritte</div>${btn('data-reset', 'Zurücksetzen')}`;
      case 'party':
        if (!d) return '<div class="pt-sub">Lade ...</div>';
        return `<div class="pt-party">${d.party.map((p) => {
          const pct = p.egg ? 0 : Math.round((p.hp / Math.max(1, p.maxHp)) * 100);
          return `<div class="pt-mon"><img src="${monsterIcon(p)}" alt=""><div class="pt-hp"><i style="width:${pct}%"></i></div>${p.item ? '<b class="pt-item">●</b>' : ''}</div>`;
        }).join('')}</div>`;
      case 'dowse':
        return `<canvas class="pt-canvas" data-radar width="180" height="180"></canvas>
          <div class="pt-sub">${!d ? 'Lade ...' : st.dowse ? (d.items?.length ? 'Reaktion! In der Nähe liegt etwas.' : 'Keine Reaktion.') : 'Berühre den Bildschirm zum Suchen.'}</div>${btn('data-dowse', 'Suchen')}`;
      case 'berry':
        return `<canvas class="pt-map" width="320" height="200"></canvas>
          <div class="pt-list">${!d ? 'Lade ...' : d.berries?.length ? [...new Set(d.berries.map((b) => placeName(b.map)))].map((n) => `<div>Reife Beeren: ${n}</div>`).join('') : 'Nirgends sind Beeren reif.'}</div>`;
      case 'history':
        if (!d) return '<div class="pt-sub">Lade ...</div>';
        return d.history?.length ? `<div class="pt-hist">${d.history.map((id) => `<img src="${monsterIcon({ speciesId: id })}" alt="">`).join('')}</div>` : '<div class="pt-sub">Noch keine Einträge.</div>';
      case 'counter': {
        const n = store.get(own(name(), 'counter'), 0);
        return `<div class="pt-clock">${pad(n, 4)}</div>${btn('data-count', 'Zählen', 'big')}${btn('data-count-reset', 'Zurücksetzen')}`;
      }
      case 'analog':
        return '<canvas class="pt-canvas" data-analog width="180" height="180"></canvas>';
      case 'map':
        return `<canvas class="pt-map" width="320" height="200"></canvas>
          <div class="pt-list">${!d ? 'Lade ...' : d.roamers.length ? d.roamers.map((r) => `<div>${r.name}: ${placeName(r.map)}</div>`).join('') : 'Keine wandernden Pokémon unterwegs.'}</div>`;
      case 'link': {
        if (!d) return '<div class="pt-sub">Lade ...</div>';
        const list = d.link || [];
        const here = list.filter((x) => x.here).length;
        return `<div class="pt-clock small">${pad(here)}</div><div class="pt-sub">Trainer hier in der Nähe</div>
          <div class="pt-list">${list.length ? list.slice(0, 8).map((x) => `<div>${x.name}: ${placeName(x.map)}</div>`).join('') : 'Gerade ist sonst niemand unterwegs.'}</div>`;
      }
      case 'coin':
        return `<canvas class="pt-canvas" data-coin width="160" height="140"></canvas>
          <div class="pt-sub">${st.coin == null ? 'Wirf die Münze!' : st.coin === 'spin' ? '...' : st.coin ? 'Kopf' : 'Zahl'}</div>${btn('data-toss', 'Werfen')}`;
      case 'move': {
        const m = st.move;
        const def = [TYPES[m.d1], m.d2 >= 0 ? TYPES[m.d2] : null].filter(Boolean);
        const f = typeEffectiveness(TYPES[m.atk], def);
        const verdict = f === 0 ? 'Keine Wirkung' : f > 1 ? 'Sehr effektiv' : f < 1 ? 'Nicht sehr effektiv' : 'Normale Wirkung';
        const marks = f === 0 ? '×' : f >= 4 ? '!!!' : f > 1 ? '!!' : f < 1 ? '!' : '!!';
        const row = (k, label, val) => `<div class="pt-sel">${btn(`data-mv="${k}" data-d="-1"`, '◀')}<span><small>${label}</small>${val}</span>${btn(`data-mv="${k}" data-d="1"`, '▶')}</div>`;
        return `${row('atk', 'Attacke', TYPE_NAMES_DE[TYPES[m.atk]])}<div class="pt-vs">gegen</div>
          ${row('d1', 'Typ 1', TYPE_NAMES_DE[TYPES[m.d1]])}${row('d2', 'Typ 2', m.d2 >= 0 ? TYPE_NAMES_DE[TYPES[m.d2]] : 'keiner')}
          <div class="pt-verdict"><b>${marks}</b> ${verdict}</div>`;
      }
      case 'calendar': {
        const c = st.cal; const y = c.getFullYear(); const mo = c.getMonth();
        const first = new Date(y, mo, 1).getDay(); const days = new Date(y, mo + 1, 0).getDate();
        const marks = store.get(own(name(), 'cal'), {});
        const today = new Date();
        const cells = [];
        for (let i = 0; i < first; i++) cells.push('<span></span>');
        for (let dd = 1; dd <= days; dd++) {
          const key = `${y}-${mo + 1}-${dd}`;
          const now = today.getFullYear() === y && today.getMonth() === mo && today.getDate() === dd;
          cells.push(`<button data-nav class="pt-day${marks[key] ? ' on' : ''}${now ? ' now' : ''}" data-day="${key}">${dd}</button>`);
        }
        return `<div class="pt-sel">${btn('data-mon="-1"', '◀')}<span>${c.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</span>${btn('data-mon="1"', '▶')}</div>
          <div class="pt-cal">${WEEK.map((w) => `<i>${w}</i>`).join('')}${cells.join('')}</div>`;
      }
      case 'dot':
        return `<canvas class="pt-canvas" data-dot width="192" height="160"></canvas>${btn('data-dot-clear', 'Löschen')}`;
      case 'roulette':
        return `<canvas class="pt-canvas" data-draw="roulette" width="180" height="180"></canvas>
          <div class="pt-row">${btn('data-spin', st.spin?.run ? 'Stopp' : 'Start')}${btn('data-clear', 'Löschen')}</div>`;
      case 'timer': {
        const k = st.kt;
        const left = k.run ? Math.max(0, Math.ceil((k.end - Date.now()) / 1000)) : k.left;
        return `<div class="pt-clock${k.ring ? ' ring' : ''}">${pad(Math.floor(left / 60))}:${pad(left % 60)}</div>
          <div class="pt-row">${btn('data-kt="60"', '+1 Min.')}${btn('data-kt="10"', '+10 Sek.')}${btn('data-kt="0"', '0')}</div>
          ${btn('data-kt-run', k.run ? 'Stopp' : 'Start', 'wide')}`;
      }
      case 'color':
        return `<div class="pt-colors">${PALETTES.map(([n, c], i) => `<button data-nav class="pt-swatch${store.get('color', 0) === i ? ' on' : ''}" data-col="${i}" style="background:${c[0]};color:${c[3]}">${n}</button>`).join('')}</div>`;
    }
    return '';
  };

  // ---------------------------------------------------------------- Zeichnen
  const drawWorld = (c, dots) => {
    const g = c.getContext('2d'); const L = layout(); const P = palette();
    const k = Math.min(c.width / L.w, c.height / L.h);
    const ox = (c.width - L.w * k) / 2; const oy = (c.height - L.h * k) / 2;
    g.fillStyle = P[0]; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = P[1];
    for (const [id, p] of Object.entries(L.pos)) {
      if (p.cave || !MAPS[id]) continue;
      g.fillRect(ox + (p.x - L.minX) * k, oy + (p.y - L.minY) * k, Math.max(1, MAPS[id].width * k), Math.max(1, MAPS[id].height * k));
    }
    const dot = (mapId, x, y, r, col) => {
      const w = worldPos(mapId, x, y);
      if (!w) return;
      g.fillStyle = col; g.beginPath(); g.arc(ox + w.x * k, oy + w.y * k, r, 0, Math.PI * 2); g.fill();
    };
    for (const [mapId, x, y] of dots) dot(mapId, x, y, 4, P[3]);
    const me = menu.me;
    if (me && Math.floor(performance.now() / 500) % 2 === 0) dot(me.map, me.x, me.y, 3, '#f8f8f8');
  };
  const drawAnalog = (c) => {
    const g = c.getContext('2d'); const P = palette(); const t = new Date();
    const r = c.width / 2;
    g.fillStyle = P[0]; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = P[3]; g.lineWidth = 4; g.beginPath(); g.arc(r, r, r - 6, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillStyle = P[i % 3 ? 2 : 3]; g.fillRect(r + Math.sin(a) * (r - 18) - 3, r - Math.cos(a) * (r - 18) - 3, 6, 6); }
    const hand = (a, len, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'square'; g.beginPath(); g.moveTo(r, r); g.lineTo(r + Math.sin(a) * len, r - Math.cos(a) * len); g.stroke(); };
    hand(((t.getHours() % 12) + t.getMinutes() / 60) / 12 * Math.PI * 2, r * 0.5, 7, P[3]);
    hand((t.getMinutes() / 60) * Math.PI * 2, r * 0.75, 5, P[2]);
    g.fillStyle = P[3]; g.fillRect(r - 5, r - 5, 10, 10);
  };
  const drawRadar = (c) => {
    const g = c.getContext('2d'); const P = palette(); const n = 15; const s = c.width / n;
    g.fillStyle = P[0]; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = P[1];
    for (let i = 0; i <= n; i++) { g.fillRect(i * s, 0, 1, c.height); g.fillRect(0, i * s, c.width, 1); }
    g.fillStyle = P[3]; g.fillRect(7 * s + 2, 7 * s + 2, s - 4, s - 4);
    if (!st.dowse) return;
    const age = (performance.now() - st.dowse) / 1000;
    if (age > 3) return;
    for (const [dx, dy] of st.data?.items || []) {
      const x = (7 + dx + 0.5) * s; const y = (7 + dy + 0.5) * s;
      g.strokeStyle = P[2]; g.lineWidth = 2;
      for (let k = 0; k < 3; k++) { const rr = ((age * 18 + k * 8) % 24) + 2; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.stroke(); }
    }
  };
  const drawCoin = (c) => {
    const g = c.getContext('2d'); const P = palette();
    g.fillStyle = P[0]; g.fillRect(0, 0, c.width, c.height);
    const spin = st.coin === 'spin';
    const t = performance.now() / 80;
    const w = spin ? Math.abs(Math.cos(t)) : 1;
    const y = spin ? 70 - Math.abs(Math.sin(t / 3)) * 40 : 70;
    g.fillStyle = P[2]; g.beginPath(); g.ellipse(80, y, 46 * w + 1, 46, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = P[1]; g.beginPath(); g.ellipse(80, y, 38 * w + 1, 38, 0, 0, Math.PI * 2); g.fill();
    if (!spin && st.coin != null) {
      g.fillStyle = P[3];
      if (st.coin) { g.fillRect(52, y - 4, 56, 8); g.beginPath(); g.arc(80, y, 12, 0, Math.PI * 2); g.fill(); g.fillStyle = P[1]; g.beginPath(); g.arc(80, y, 6, 0, Math.PI * 2); g.fill(); } else { g.font = 'bold 34px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1', 80, y + 2); }
    }
  };
  // Notizblock und Roulette: Zeichnung als Liste von Punkten pro Spieler
  const drawLines = (c, key) => {
    const g = c.getContext('2d'); const P = palette();
    g.fillStyle = P[0]; g.fillRect(0, 0, c.width, c.height);
    if (key === 'roulette') {
      g.strokeStyle = P[2]; g.lineWidth = 3; g.beginPath(); g.arc(90, 90, 84, 0, Math.PI * 2); g.stroke();
    }
    const img = st.img?.[key] || store.get(own(name(), key), []);
    g.fillStyle = P[3];
    for (const [x, y] of img) g.fillRect(x, y, 3, 3);
    if (key === 'roulette') {
      const a = st.spin?.a || 0;
      g.strokeStyle = P[3]; g.lineWidth = 5; g.beginPath(); g.moveTo(90, 90); g.lineTo(90 + Math.sin(a) * 70, 90 - Math.cos(a) * 70); g.stroke();
      g.fillStyle = P[3]; g.beginPath(); g.arc(90, 90, 8, 0, Math.PI * 2); g.fill();
    }
  };
  const drawDots = (c) => {
    const g = c.getContext('2d'); const P = palette(); const s = 8;
    const grid = store.get(own(name(), 'dot'), []);
    for (let y = 0; y < 20; y++) for (let x = 0; x < 24; x++) { g.fillStyle = P[grid[y * 24 + x] || 0]; g.fillRect(x * s, y * s, s, s); }
  };
  const paint = (root) => {
    const q = (sel) => root.querySelector(sel);
    const id = cur()[0];
    if (q('.pt-map')) drawWorld(q('.pt-map'), id === 'berry' ? (st.data?.berries || []).map((b) => [b.map, b.x, b.y]) : (st.data?.roamers || []).map((r) => [r.map, (MAPS[r.map]?.width || 0) / 2, (MAPS[r.map]?.height || 0) / 2]));
    if (q('[data-analog]')) drawAnalog(q('[data-analog]'));
    if (q('[data-radar]')) drawRadar(q('[data-radar]'));
    if (q('[data-coin]')) drawCoin(q('[data-coin]'));
    if (q('[data-draw]')) drawLines(q('[data-draw]'), q('[data-draw]').dataset.draw);
    if (q('[data-dot]')) drawDots(q('[data-dot]'));
  };

  // ---------------------------------------------------------------- Bedienung
  const calcKey = (k) => {
    const c = st.calc;
    const val = () => Number(c.show);
    const apply = () => {
      if (c.op == null || c.acc == null) return val();
      const b = val();
      const r = c.op === '+' ? c.acc + b : c.op === '-' ? c.acc - b : c.op === '×' ? c.acc * b : b === 0 ? NaN : c.acc / b;
      return r;
    };
    const fmt = (n) => { if (!Number.isFinite(n) || Math.abs(n) >= 1e10) return 'Fehler'; const s = String(Math.round(n * 1e6) / 1e6); return s.length > 10 ? s.slice(0, 10) : s; };
    if (k === 'C') { st.calc = { show: '0', acc: null, op: null, fresh: true }; return; }
    if (c.show === 'Fehler') st.calc = { show: '0', acc: null, op: null, fresh: true };
    const d = st.calc;
    if (/\d/.test(k)) { d.show = d.fresh || d.show === '0' ? k : (d.show + k).slice(0, 10); d.fresh = false; return; }
    if (k === '.') { if (d.fresh) { d.show = '0.'; d.fresh = false; } else if (!d.show.includes('.')) d.show += '.'; return; }
    if (k === '=') { d.show = fmt(apply()); d.acc = null; d.op = null; d.fresh = true; return; }
    const r = d.fresh && d.op ? d.acc : apply();
    d.acc = r; d.op = k; d.show = fmt(r); d.fresh = true;
  };
  const bindDraw = (c, key) => {
    let down = false;
    const at = (e) => { const r = c.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) * c.width / r.width), Math.floor((e.clientY - r.top) * c.height / r.height)]; };
    st.img ||= {};
    st.img[key] = store.get(own(name(), key), []);
    const put = (e) => {
      const [x, y] = at(e);
      const list = st.img[key];
      if (st.pen || key === 'roulette') { if (key !== 'roulette' || Math.hypot(x - 90, y - 90) < 84) list.push([x - 1, y - 1]); } else st.img[key] = list.filter(([px, py]) => Math.hypot(px - x, py - y) > 6);
      drawLines(c, key);
    };
    c.onpointerdown = (e) => { down = true; c.setPointerCapture?.(e.pointerId); put(e); };
    c.onpointermove = (e) => { if (down) put(e); };
    c.onpointerup = () => { down = false; if (st.img[key].length > 6000) st.img[key] = st.img[key].slice(-6000); store.set(own(name(), key), st.img[key]); };
  };

  const scr = {
    cls: 'm-poketch',
    html: () => {
      const P = palette();
      const vars = P.map((c, i) => `--lcd${i}:${c}`).join(';');
      return `<div class="poketch"><div class="pt-body"><div class="pt-screen" style="${vars}"><div class="pt-title">${cur()[1]}</div>${body()}</div>
        <div class="pt-side"><button class="pt-up" data-app="-1" aria-label="Vorherige App"></button><button class="pt-down" data-app="1" aria-label="Nächste App"></button></div></div>
        <div class="pt-nav"><span>${st.app + 1} / ${apps().length}</span><span>Q / E: App wechseln</span></div></div>`;
    },
    bind: (root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((b) => { b.onclick = (e) => { fn(b, e); }; });
      on('[data-app]', (b) => switchApp(Number(b.dataset.app)));
      on('[data-reset]', () => { store.set(own(name(), 'steps'), st.data?.steps || 0); audio.sfx('select'); menu.render(); });
      on('[data-calc]', (b) => { calcKey(b.dataset.calc); audio.sfx('click'); rerender(b); });
      on('[data-pen]', (b) => { st.pen = b.dataset.pen === '1'; menu.render(); });
      on('[data-clear]', () => { const k = root.querySelector('[data-draw]').dataset.draw; store.set(own(name(), k), []); st.img[k] = []; menu.render(); });
      on('[data-dowse]', () => { st.dowse = performance.now(); menu.ctx.net.send({ t: 'poketch' }); audio.sfx('click'); });
      on('[data-count]', (b) => { store.set(own(name(), 'counter'), (store.get(own(name(), 'counter'), 0) + 1) % 10000); audio.sfx('click'); rerender(b); });
      on('[data-count-reset]', () => { store.set(own(name(), 'counter'), 0); menu.render(); });
      on('[data-toss]', () => {
        if (st.coin === 'spin') return;
        st.coin = 'spin'; audio.sfx('throw'); menu.render();
        setTimeout(() => { st.coin = Math.random() < 0.5; audio.sfx('click'); if (active?.scr === scr) menu.render(); }, 1200);
      });
      on('[data-mv]', (b) => {
        const m = st.move; const k = b.dataset.mv; const d = Number(b.dataset.d);
        if (k === 'd2') m.d2 = ((m.d2 + 1 + d + TYPES.length + 1) % (TYPES.length + 1)) - 1;
        else m[k] = (m[k] + d + TYPES.length) % TYPES.length;
        audio.sfx('click'); rerender(b);
      });
      on('[data-mon]', (b) => { st.cal = new Date(st.cal.getFullYear(), st.cal.getMonth() + Number(b.dataset.mon), 1); rerender(b); });
      on('[data-day]', (b) => { const m = store.get(own(name(), 'cal'), {}); if (m[b.dataset.day]) delete m[b.dataset.day]; else m[b.dataset.day] = 1; store.set(own(name(), 'cal'), m); audio.sfx('click'); rerender(b); });
      on('[data-dot-clear]', () => { store.set(own(name(), 'dot'), []); menu.render(); });
      on('[data-spin]', () => {
        const sp = (st.spin ||= { a: 0, v: 0, run: false });
        if (sp.run) { sp.run = false; sp.brake = true; } else { sp.run = true; sp.brake = false; sp.v = 0.5; }
        audio.sfx('click'); menu.render();
      });
      on('[data-kt]', (b) => { const k = st.kt; if (k.run) return; const add = Number(b.dataset.kt); k.left = add ? Math.min(99 * 60 + 59, k.left + add) : 0; k.ring = 0; store.set('kt', k.left); audio.sfx('click'); rerender(b); });
      on('[data-kt-run]', () => {
        const k = st.kt;
        if (k.run) { k.left = Math.max(0, Math.ceil((k.end - Date.now()) / 1000)); k.run = false; } else if (k.left > 0) { k.run = true; k.end = Date.now() + k.left * 1000; k.ring = 0; }
        audio.sfx('click'); menu.render();
      });
      on('[data-col]', (b) => { store.set('color', Number(b.dataset.col)); audio.sfx('select'); rerender(b); });
      const draw = root.querySelector('[data-draw]');
      if (draw) bindDraw(draw, draw.dataset.draw);
      const dot = root.querySelector('[data-dot]');
      if (dot) {
        let down = false; let paintVal = 1;
        const at = (e) => { const r = dot.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * 24), Math.floor((e.clientY - r.top) / r.height * 20)]; };
        const set = (e, first) => {
          const [x, y] = at(e); if (x < 0 || y < 0 || x >= 24 || y >= 20) return;
          const grid = store.get(own(name(), 'dot'), []);
          if (first) paintVal = ((grid[y * 24 + x] || 0) + 1) % 4;
          grid[y * 24 + x] = paintVal; store.set(own(name(), 'dot'), grid); drawDots(dot);
        };
        dot.onpointerdown = (e) => { down = true; dot.setPointerCapture?.(e.pointerId); set(e, true); };
        dot.onpointermove = (e) => { if (down) set(e, false); };
        dot.onpointerup = () => { down = false; };
      }
      const radar = root.querySelector('[data-radar]');
      if (radar) radar.onclick = () => { st.dowse = performance.now(); menu.ctx.net.send({ t: 'poketch' }); audio.sfx('click'); };
      paint(root);
      // Uhren, Animationen und die blinkende Markierung laufen weiter, solange der Pokétch offen ist
      clearInterval(st.timer);
      let tick = 0;
      st.timer = setInterval(() => {
        if (menu.stack[menu.stack.length - 1] !== scr || !menu.isOpen) { clearInterval(st.timer); if (active?.scr === scr) active = null; return; }
        tick++;
        const id = cur()[0];
        const k = st.kt;
        if (k.run && Date.now() >= k.end) { k.run = false; k.left = 0; k.ring = 8; }
        if (k.ring && tick % 5 === 0) { k.ring--; audio.sfx('exclaim'); }
        const sp = st.spin;
        if (sp && (sp.run || sp.brake)) { sp.a += sp.v; if (sp.brake) { sp.v *= 0.96; if (sp.v < 0.004) { sp.brake = false; sp.v = 0; } } }
        if (menu.msgResolve) return;
        if (['map', 'berry', 'analog', 'dowse', 'coin', 'roulette'].includes(id)) paint(menu.root);
        if ((id === 'clock' && tick % 5 === 0) || (id === 'timer' && (k.run || k.ring) && tick % 5 === 0)) menu.render();
      }, 100);
    },
    onKey: (code) => {
      // Apps ohne eigene Knöpfe: Pfeiltasten links und rechts wechseln die App
      const controls = menu.root.querySelectorAll('.pt-screen [data-nav]').length;
      if (controls <= 1 && (code === 'ArrowLeft' || code === 'KeyA')) { switchApp(-1); return true; }
      if (controls <= 1 && (code === 'ArrowRight' || code === 'KeyD')) { switchApp(1); return true; }
      return false;
    },
    onData: (d) => { st.data = d; if (!menu.msgResolve) menu.render(); }
  };
  // Nach einem Knopfdruck neu zeichnen und den Fokus auf demselben Knopf lassen
  const rerender = (b) => {
    const sel = [...b.attributes].filter((a) => a.name.startsWith('data-') && a.name !== 'data-nav').map((a) => `[${a.name}="${a.value}"]`).join('');
    menu.render();
    menu.root.querySelector(sel)?.focus();
  };
  const switchApp = (dir) => {
    const n = apps().length;
    st.app = (st.app + dir + n) % n;
    store.set('app', cur()[0]);
    audio.sfx('click');
    if (!['clock', 'calc', 'analog', 'counter', 'coin', 'move', 'calendar', 'dot', 'memo', 'roulette', 'timer', 'color'].includes(cur()[0])) menu.ctx.net.send({ t: 'poketch' });
    menu.render();
  };
  active = { menu, scr, switchApp };
  return scr;
}
