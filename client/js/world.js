// Overworld-Zustand im Client: lokale Bewegungsvorhersage (Kachel fuer Kachel wie im Original),
// Kollision ueber dieselbe Logik wie der Server, Interpolation der anderen Spieler.
import { MAPS } from '/shared/data/maps.js';
import { resolveStep } from '/shared/world.js';

const TURN_DELAY = 90; // kurzes Antippen dreht nur die Blickrichtung (wie im Original)

export class World {
  constructor(net) {
    this.net = net;
    this.me = null;           // { id, name, map, x, y, dir, color }
    this.anim = null;         // { fromX, fromY, toX, toY, start, dur, jump }
    this.others = new Map();  // id -> { ...publicPlayer, rx, ry, anim }
    this.seq = 0;
    this.walkMs = 250; this.runMs = 125;
    this.locked = false;      // Kampf, Dialog, Starterwahl
    this.onMapChange = () => {};
  }

  get map() { return MAPS[this.me.map]; }

  // NPCs der aktuellen Karte (werden ab der Story-Etappe befuellt)
  visibleNpcs() { return this.npcs || []; }

  setSelf(p) { this.me = { ...p }; this.anim = null; }

  setOthers(list) {
    this.others.clear();
    for (const p of list) this.addOther(p);
  }
  addOther(p) { this.others.set(p.id, { ...p, rx: p.x, ry: p.y, anim: null }); }
  removeOther(id) { this.others.delete(id); }
  moveOther(m) {
    const o = this.others.get(m.id);
    if (!o) return;
    const now = performance.now();
    o.anim = { fromX: o.rx, fromY: o.ry, toX: m.x, toY: m.y, start: now, dur: m.running ? this.runMs : this.walkMs, jump: m.jump };
    o.x = m.x; o.y = m.y; o.dir = m.dir;
  }
  updateOther(p) {
    const o = this.others.get(p.id);
    if (!o) return this.addOther(p);
    Object.assign(o, { dir: p.dir, inBattle: p.inBattle, name: p.name, color: p.color });
    if (o.x !== p.x || o.y !== p.y) { o.x = o.rx = p.x; o.y = o.ry = p.y; o.anim = null; }
  }

  // Lokaler Schritt: Vorhersage, dann Bestaetigung durch den Server (moveAck).
  update(input, now) {
    if (!this.me) return;
    if (this.anim) {
      const t = (now - this.anim.start) / this.anim.dur;
      if (t >= 1) this.anim = null; else return;
    }
    if (this.locked) return;
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
    const r = resolveStep(MAPS, this.me.map, this.me.x, this.me.y, dir);
    if (!r.ok) {
      if (!this.bumpAt || now - this.bumpAt > 300) { this.bumpAt = now; this.net.send({ t: 'face', dir }); }
      return;
    }
    const running = input.running;
    const dur = (running ? this.runMs : this.walkMs) * (r.jump ? 2 : 1);
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

  selfPos(now) { return this.renderPos(this.me, this.anim, now); }
  otherPos(o, now) {
    const p = this.renderPos(o, o.anim, now);
    if (o.anim && p.t >= 1) { o.anim = null; o.rx = o.x; o.ry = o.y; } else if (o.anim) { o.rx = p.x; o.ry = p.y; }
    return p;
  }
}
