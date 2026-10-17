// Overworld-Zustand im Client: lokale Bewegungsvorhersage (Kachel fuer Kachel wie im Original),
// Kollision ueber dieselbe Logik wie der Server, Interpolation der anderen Spieler.
import { MAPS } from '/shared/data/maps.js';
import { resolveStep, fieldFlags } from '/shared/world.js';
import { visibleNpcs, npcAt, NPCS } from '/shared/data/story.js';

const TURN_DELAY = 90; // kurzes Antippen dreht nur die Blickrichtung (wie im Original)

export class World {
  constructor(net) {
    this.net = net;
    this.me = null;           // { id, name, map, x, y, dir, color }
    this.anim = null;         // { fromX, fromY, toX, toY, start, dur, jump }
    this.others = new Map();  // id -> { ...publicPlayer, rx, ry, anim }
    this.seq = 0;
    this.walkMs = 250; this.runMs = 125; this.bikeMs = 80;
    this.locked = false;      // Kampf, Dialog, Starterwahl
    this.onMapChange = () => {};
    this.onStep = () => {};   // Effekte und Klang (Gras, Staub, Sprung)
    this.onBump = () => {};
    this.flags = {};          // Story-Fortschritt vom Server
    this.npcState = {};       // Blickrichtung, Emotes und Laufwege einzelner NPCs (Szenen)
    this.scriptPath = [];     // Schritte des Spielers in einer Szene
    this.cleared = new Set(); // freigeraeumte Hindernisse "karte:x,y" (vom Server)
    this.onFieldStep = null;  // Einblendung vor Surfer, Kraxler und Kaskade
    this.blocked = (m, x, y) => (m === this.me?.map ? this.visibleNpcs().some((n) => !n.ghost && n.x === x && n.y === y) : !!npcAt(m, x, y, this.flags));
  }

  get map() { return MAPS[this.me.map]; }

  // NPCs der aktuellen Karte, gefiltert nach Story-Flags. Laufende Figuren bekommen ihre
  // Zwischenposition (rx, ry) und ein anim-Objekt fuer die Schrittbilder.
  visibleNpcs(now = performance.now()) {
    if (!this.me) return [];
    const list = visibleNpcs(this.me.map, this.flags);
    const ids = new Set();
    const out = [];
    for (const n of list) {
      ids.add(n.id);
      const st = this.npcState[n.id];
      if (!st) { out.push(n); continue; }
      if (st.hideUntil > now && !st.walk) continue; // taucht gleich laufend auf
      if (st.gone > now - 2500 && !st.walk) continue; // ist schon hinausgelaufen, Flag kommt gleich
      out.push(this.npcView(n, st, now));
    }
    // Figuren, die schon weg sind, aber noch aus dem Bild laufen
    for (const [id, st] of Object.entries(this.npcState)) {
      if (!ids.has(id) && st.gone && !st.walk) st.gone = 0;
      if (ids.has(id) || !(st.walk?.mode === 'hide' || st.vanishUntil > now)) continue;
      const n = (NPCS[this.me.map] || []).find((x) => x.id === id);
      if (n) { const v = this.npcView(n, st, now); if (v) out.push({ ...v, ghost: true }); }
    }
    return out;
  }
  npcView(n, st, now) {
    const v = { ...n, x: st.x ?? n.x, y: st.y ?? n.y, dir: st.dir || n.dir, emote: st.emoteUntil > now ? '!' : null };
    const w = st.walk;
    if (!w) return v;
    const ms = w.ms; const t = now - w.start; const i = Math.floor(t / ms);
    if (i >= w.path.length) {
      st.walk = null;
      if (w.mode === 'hide') { st.vanishUntil = 0; st.gone = now; return null; }
      st.dir = w.face || st.dir;
      return { ...v, dir: st.dir };
    }
    const from = i === 0 ? w.from : w.path[i - 1];
    const to = w.path[i];
    const f = (t - i * ms) / ms;
    v.rx = from[0] + (to[0] - from[0]) * f; v.ry = from[1] + (to[1] - from[1]) * f; v.t = f;
    v.anim = { fromX: from[0], fromY: from[1], toX: to[0], toY: to[1] };
    v.dir = to[2];
    if (w.mode === 'hide') v.alpha = i === w.path.length - 1 ? 1 - f * 0.6 : 1;
    return v;
  }
  emote(id) { (this.npcState[id] ||= {}).emoteUntil = performance.now() + 1200; }
  faceNpc(id, dir) { const st = (this.npcState[id] ||= {}); st.dir = dir; if (st.walk) st.walk.face = dir; }
  // Szene: Figur laeuft einen Weg ab (mode stay | hide = danach weg | show = laeuft ins Bild)
  npcWalk(m) {
    if (m.map !== this.me?.map) return;
    const st = (this.npcState[m.id] ||= {});
    const now = performance.now();
    st.walk = { from: m.from, path: m.path, start: now, ms: m.fast ? this.runMs : this.walkMs, mode: m.mode, face: m.face };
    st.hideUntil = 0; st.vanishUntil = 0; st.gone = 0;
    if (m.mode !== 'hide') { const end = m.path[m.path.length - 1]; if (end) { st.x = end[0]; st.y = end[1]; } }
    if (m.mode === 'show') { st.x = undefined; st.y = undefined; }
    if (!m.path.length) { st.walk = null; st.dir = m.face; }
  }
  // Leute gehen umher (gilt fuer alle, darum wird die gemeinsame Figur selbst verschoben)
  npcMoved(m) {
    const n = (NPCS[m.map] || []).find((x) => x.id === m.id);
    if (!n) return;
    const from = [n.x, n.y];
    n.x = m.x; n.y = m.y; n.dir = m.dir;
    if (m.map !== this.me?.map) return;
    const st = (this.npcState[m.id] ||= {});
    st.dir = m.dir;
    if (m.step) st.walk = { from, path: [[m.x, m.y, m.dir]], start: performance.now(), ms: this.walkMs, mode: 'stay', face: m.dir };
  }
  // Flags aendern sich: verschwundene Figuren bleiben kurz stehen (bis ihr Weg kommt), neue warten kurz
  setFlags(flags) {
    const before = this.me ? visibleNpcs(this.me.map, this.flags) : [];
    this.flags = flags || {};
    if (!this.me || !this.scriptActive) return;
    const after = new Set(visibleNpcs(this.me.map, this.flags).map((n) => n.id));
    const now = performance.now();
    const had = new Set(before.map((n) => n.id));
    for (const n of before) if (!after.has(n.id) && !n.item) (this.npcState[n.id] ||= {}).vanishUntil = now + 450;
    for (const id of after) if (!had.has(id)) Object.assign((this.npcState[id] ||= {}), { hideUntil: now + 350, gone: 0 });
  }

  setSelf(p) { this.me = { ...p }; this.anim = null; }

  setOthers(list) {
    this.others.clear();
    for (const p of list) this.addOther(p);
  }
  addOther(p) { this.others.set(p.id, { ...p, rx: p.x, ry: p.y, anim: null }); }
  removeOther(id) { this.others.delete(id); }
  // Sprechblase ueber einem Spieler (auch ueber einem selbst)
  playerEmote(id, kind) {
    const o = id === this.me?.id ? this.me : this.others.get(id);
    if (!o) return;
    o.emote = kind;
    clearTimeout(o.emoteTimer);
    o.emoteTimer = setTimeout(() => { o.emote = null; }, 1800);
  }
  moveOther(m) {
    const o = this.others.get(m.id);
    if (!o) return;
    const now = performance.now();
    o.anim = { fromX: o.rx, fromY: o.ry, toX: m.x, toY: m.y, start: now, dur: m.bike ? this.bikeMs : m.running ? this.runMs : this.walkMs, jump: m.jump };
    o.x = m.x; o.y = m.y; o.dir = m.dir; o.bike = !!m.bike;
  }
  updateOther(p) {
    const o = this.others.get(p.id);
    if (!o) return this.addOther(p);
    Object.assign(o, { dir: p.dir, inBattle: p.inBattle, name: p.name, color: p.color, bike: !!p.bike });

    if (o.x !== p.x || o.y !== p.y) { o.x = o.rx = p.x; o.y = o.ry = p.y; o.anim = null; }
  }

  // Lokaler Schritt: Vorhersage, dann Bestaetigung durch den Server (moveAck).
  update(input, now) {
    if (!this.me) return;
    if (this.anim) {
      const t = (now - this.anim.start) / this.anim.dur;
      if (t >= 1) this.anim = null; else return;
    }
    // Szene: der Server laesst den Spieler ein paar Schritte gehen
    if (this.scriptPath.length) {
      const [x, y, dir, jump] = this.scriptPath.shift();
      const dur = (this.scriptFast ? this.runMs : this.walkMs) * (jump ? 2 : 1);
      this.anim = { fromX: this.me.x, fromY: this.me.y, toX: x, toY: y, start: now, dur, jump };
      Object.assign(this.me, { x, y, dir });
      if (!this.scriptPath.length && this.scriptFace) this.me.dir = this.scriptFace;
      this.onStep(this.me.map, x, y, MAPS[this.me.map].tiles[y]?.[x], false, jump);
      return;
    }
    if (this.locked || now < (this.warpUntil || 0)) return;
    const dir = input.currentDir();
    if (!dir) return;
    if (this.me.dir !== dir) {
      // Erst drehen. Wird die Taste laenger gehalten, folgt der Schritt.
      this.me.dir = dir;
      this.net.send({ t: 'face', dir });
      this.turnUntil = now + TURN_DELAY;
      return;
    }
    if (now < (this.turnUntil || 0)) return;
    const ff = fieldFlags(this.flags, this.party); ff._cleared = this.cleared;
    const r = resolveStep(MAPS, this.me.map, this.me.x, this.me.y, dir, this.blocked, ff);
    if (!r.ok) {
      if (!this.bumpAt || now - this.bumpAt > 300) { this.bumpAt = now; this.net.send({ t: 'face', dir }); this.onBump(); }
      return;
    }
    // Surfer, Kraxler, Kaskade: erst blendet das Pokemon ein, dann geht es los
    const here = this.map.tiles[this.me.y]?.[this.me.x];
    const there = !r.warp && MAPS[r.map]?.tiles[r.y]?.[r.x];
    const fm = there === '~' && here !== '~' ? 'surf' : there === 'N' && here !== 'N' ? 'rock-climb' : there === 'J' && here !== 'J' ? 'waterfall' : null;
    if (fm && this.onFieldStep) {
      if (!this.fieldWait || this.fieldWait.key !== `${r.map}:${r.x},${r.y}`) { this.fieldWait = { key: `${r.map}:${r.x},${r.y}`, until: now + (this.onFieldStep(fm) || 0) }; return; }
      if (now < this.fieldWait.until) return;
    }
    this.fieldWait = null;
    const running = input.running;
    const dur = (this.flags?.riding ? this.bikeMs : running ? this.runMs : this.walkMs) * (r.jump ? 2 : 1);
    if (r.warp) {
      // Tuer, Treppe oder Hoehle: harter Wechsel mit Abblende
      Object.assign(this.me, { map: r.map, x: r.x, y: r.y, dir: r.dir || dir });
      this.anim = null;
      this.others.clear();
      this.warpUntil = now + 260;
      this.onMapChange(r.map, true);
      this.net.send({ t: 'move', dir, seq: ++this.seq, running });
      return;
    }
    let fromX = this.me.x; let fromY = this.me.y;
    if (r.map !== this.me.map) {
      // Nahtloser Kartenwechsel: Startpunkt in Koordinaten der neuen Karte umrechnen
      fromX = r.x - (dir === 'right' ? 1 : dir === 'left' ? -1 : 0);
      fromY = r.y - (dir === 'down' ? 1 : dir === 'up' ? -1 : 0);
      this.me.map = r.map;
      this.others.clear();
      this.onMapChange(r.map);
    }
    this.anim = { fromX, fromY, toX: r.x, toY: r.y, start: now, dur, jump: r.jump };
    this.me.x = r.x; this.me.y = r.y;
    this.onStep(this.me.map, r.x, r.y, MAPS[this.me.map].tiles[r.y]?.[r.x], running, r.jump);
    this.net.send({ t: 'move', dir, seq: ++this.seq, running });
  }

  // Serverkorrektur (abgelehnter Schritt oder Abweichung)
  reconcile(ack) {
    if (ack.seq !== this.seq) return;
    if (!ack.ok || ack.map !== this.me.map || ack.x !== this.me.x || ack.y !== this.me.y) {
      const mapChanged = ack.map !== this.me.map;
      Object.assign(this.me, { map: ack.map, x: ack.x, y: ack.y });
      this.anim = null;
      if (mapChanged) this.onMapChange(ack.map);
    }
  }

  // Interpolierte Darstellungsposition (Kacheln, Kommazahlen)
  renderPos(entity, anim, now) {
    if (!anim) return { x: entity.x, y: entity.y, hop: 0 };
    const t = Math.min(1, (now - anim.start) / anim.dur);
    const x = anim.fromX + (anim.toX - anim.fromX) * t;
    const y = anim.fromY + (anim.toY - anim.fromY) * t;
    return { x, y, hop: anim.jump ? Math.sin(t * Math.PI) * 0.6 : 0, t };
  }

  selfWalk(m) { this.scriptPath.push(...m.path.map(([x, y, d]) => [x, y, d, m.jump])); this.scriptFace = m.face; this.scriptFast = !!m.fast; }

  selfPos(now) { return this.renderPos(this.me, this.anim, now); }
  otherPos(o, now) {
    const p = this.renderPos(o, o.anim, now);
    if (o.anim && p.t >= 1) { o.anim = null; o.rx = o.x; o.ry = o.y; } else if (o.anim) { o.rx = p.x; o.ry = p.y; }
    return p;
  }
}
