// Szenen wie in Platin: Figuren laufen sichtbar Feld fuer Feld, statt zu erscheinen oder zu verschwinden.
//   { walk: 'npcId', to: 'player' }        zum Spieler laufen und ihn ansehen
//   { walk: 'npcId', to: 'exit' }          weggehen (zur naechsten Tuer, zum Ausgang oder aus dem Bild)
//   { walk: 'npcId', to: 'home' }          zurueck auf den eigenen Platz
//   { walk: 'npcId', to: { door: 'karte' } }  zur Tuer, die auf diese Karte fuehrt (und hinein)
//   { walk: 'npcId', to: { npc: 'id2' } }  neben eine andere Figur
//   { walk: 'npcId', path: 'llu' }         feste Schritte (l r u d), stoppt vor Hindernissen
//   fast: true = rennen, nowait: true = nicht auf das Ende warten, Liste in walk = alle gleichzeitig
//   { me: 'llu' } oder { me: { to: 'npcId' } }  den Spieler laufen lassen
//   { face: 'npcId'|'me', dir: 'up'|'player'|'npcId' }   Blickrichtung
//   { wait: ms }                           kurze Pause
// Verschwindet eine Figur durch ein Flag mitten in der Szene, geht sie automatisch weg. Taucht eine auf,
// kommt sie ins Bild gelaufen. quiet: true an einem Flag-Schritt schaltet das ab.
import { MAPS } from '../../shared/data/maps.js';
import { visibleNpcs, NPCS } from '../../shared/data/story.js';
import { DIRS, tileAt, SOLID, LEDGE, PORTAL, warpAt, exitWarp } from '../../shared/world.js';
import { S2C, WALK_MS, RUN_MS } from '../../shared/protocol.js';

const LETTER = { l: 'left', r: 'right', u: 'up', d: 'down' };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
// Figuren, die nicht laufen (Itembaelle, Pokemon in der Oberwelt)
const STILL = new Set(['item_ball', 'azelf', 'uxie', 'mesprit', 'dialga', 'palkia', 'giratina', 'heatran', 'regigigas', 'rotom', 'cresselia', 'briefcase']);
export const canWalk = (n) => !!n && !n.item && !n.still && !STILL.has(n.look);
const dirTo = (ax, ay, bx, by) => (bx > ax ? 'right' : bx < ax ? 'left' : by > ay ? 'down' : 'up');
const fast = () => !!process.env.SCENE_FAST;

// Begehbar fuer eine Figur: kein Hindernis, kein Vorsprung, keine Tuer
function open(map, x, y) {
  const t = tileAt(map, x, y);
  return t !== null && !SOLID.has(t) && !LEDGE[t] && !PORTAL.has(t);
}

export const Scenes = {
  // Position einer Figur fuer diesen Spieler (Szenen verschieben Figuren nur fuer ihn)
  npcPos(s, n) {
    const o = s.npcPos?.map === s.player.map ? s.npcPos.list[n.id] : null;
    return o ? { ...n, x: o.x, y: o.y, dir: o.dir || n.dir } : n;
  },
  npcsFor(s, mapId = s.player.map) {
    const list = visibleNpcs(mapId, s.player.flags || {});
    return mapId === s.player.map ? list.map((n) => this.npcPos(s, n)) : list;
  },
  npcAtFor(s, mapId, x, y) { return this.npcsFor(s, mapId).find((n) => n.x === x && n.y === y) || null; },
  setNpcPos(s, id, x, y, dir) {
    if (s.npcPos?.map !== s.player.map) s.npcPos = { map: s.player.map, list: {} };
    s.npcPos.list[id] = { x, y, dir };
  },
  resetNpcPos(s) { s.npcPos = null; },

  // Kuerzester Weg (Breitensuche) von a nach einem Ziel. goal(x, y) -> true; liefert [[x, y, dir], ...]
  findPath(s, from, goal, { ignore, limit = 60, last } = {}) {
    const map = MAPS[s.player.map];
    const occ = new Set(this.npcsFor(s).filter((n) => n.id !== ignore).map((n) => `${n.x},${n.y}`));
    occ.add(`${s.player.x},${s.player.y}`);
    const key = (x, y) => `${x},${y}`;
    const prev = new Map([[key(from.x, from.y), null]]);
    let q = [[from.x, from.y]]; let depth = 0;
    while (q.length && depth <= limit) {
      const next = [];
      for (const [x, y] of q) {
        if ((depth > 0 || last) && goal(x, y)) {
          const path = []; let k = key(x, y);
          while (prev.get(k)) { const [px, py] = prev.get(k); const [cx, cy] = k.split(',').map(Number); path.unshift([cx, cy, dirTo(px, py, cx, cy)]); k = key(px, py); }
          return path;
        }
        for (const d of Object.values(DIRS)) {
          const nx = x + d.dx, ny = y + d.dy, k = key(nx, ny);
          if (prev.has(k) || occ.has(k)) continue;
          if (!open(map, nx, ny) && !(last && last(nx, ny))) continue;
          prev.set(k, [x, y]); next.push([nx, ny]);
        }
      }
      q = next; depth++;
    }
    return null;
  },

  // Weg aus dem Bild: Tuer, Ausgangsfeld oder weit genug vom Spieler weg (ausserhalb der Sicht)
  exitPath(s, n) {
    const map = MAPS[s.player.map]; const p = s.player;
    const door = (x, y) => { const t = tileAt(map, x, y); return PORTAL.has(t) && !!warpAt(map, x, y); };
    const mat = (x, y) => Object.keys(DIRS).find((d) => exitWarp(map, x, y, d));
    const far = (x, y) => Math.abs(x - p.x) >= 8 || Math.abs(y - p.y) >= 6;
    const edge = (x, y) => !map.indoor && (x === 0 || y === 0 || x === map.width - 1 || y === map.height - 1);
    let path = this.findPath(s, n, (x, y) => door(x, y) || !!mat(x, y) || far(x, y) || edge(x, y), { ignore: n.id, last: door });
    if (!path) {
      // Kein Ausgang erreichbar: so weit wie moeglich weg vom Spieler
      path = []; let cur = { x: n.x, y: n.y };
      for (let i = 0; i < 6; i++) {
        const opts = Object.entries(DIRS).map(([dir, d]) => [dir, cur.x + d.dx, cur.y + d.dy]).filter(([, x, y]) => open(map, x, y) && !(x === p.x && y === p.y) && !this.npcAtFor(s, p.map, x, y));
        opts.sort((a, b) => (Math.abs(b[1] - p.x) + Math.abs(b[2] - p.y)) - (Math.abs(a[1] - p.x) + Math.abs(a[2] - p.y)));
        const o = opts[0]; if (!o || Math.abs(o[1] - p.x) + Math.abs(o[2] - p.y) <= Math.abs(cur.x - p.x) + Math.abs(cur.y - p.y)) break;
        path.push([o[1], o[2], o[0]]); cur = { x: o[1], y: o[2] };
      }
    }
    // Am Ausgangsfeld noch einen Schritt hinaus
    const end = path[path.length - 1] || [n.x, n.y, n.dir];
    const out = mat(end[0], end[1]);
    if (out && !door(end[0], end[1])) path.push([end[0] + DIRS[out].dx, end[1] + DIRS[out].dy, out]);
    return path;
  },

  // Szenenschritt ausfuehren: liefert Dauer in ms (0 = nichts zu tun)
  sceneStep(s, step) {
    if (step.wait) return step.wait;
    if (step.face) {
      const dir = this.faceDir(s, step.face, step.dir);
      if (!dir) return 0;
      if (step.face === 'me') { s.player.dir = dir; this.game.send(s.ws, { t: S2C.SELF_FACE, dir }); return 0; }
      const n = this.findNpc(s, step.face);
      if (!n) return 0;
      this.setNpcPos(s, n.id, n.x, n.y, dir);
      this.game.send(s.ws, { t: S2C.NPC_FACE, id: n.id, dir });
      return 0;
    }
    if (step.me) return this.walkPlayer(s, step);
    const list = Array.isArray(step.walk) ? step.walk : [step];
    let dur = 0;
    for (const w of list) dur = Math.max(dur, this.walkNpc(s, typeof w === 'string' ? { ...step, walk: w } : w));
    return step.nowait ? 0 : dur;
  },

  findNpc(s, id) { const n = this.npcsFor(s).find((x) => x.id === id); return n || null; },
  faceDir(s, who, dir) {
    const me = s.player;
    const at = who === 'me' ? me : this.findNpc(s, who);
    if (!at) return null;
    if (DIRS[dir]) return dir;
    const other = dir === 'player' ? me : dir === 'me' ? me : this.findNpc(s, dir);
    return other ? dirTo(at.x, at.y, other.x, other.y) : null;
  },

  walkNpc(s, w, mode = 'stay', forced) {
    const n = forced || this.findNpc(s, w.walk);
    if (!canWalk(n)) return 0;
    const p = s.player; const map = MAPS[p.map];
    let path = null;
    if (w.path) {
      path = []; let x = n.x, y = n.y;
      for (const c of w.path) {
        const dir = LETTER[c]; if (!dir) continue;
        const nx = x + DIRS[dir].dx, ny = y + DIRS[dir].dy;
        if (!open(map, nx, ny) || (nx === p.x && ny === p.y) || this.npcAtFor(s, p.map, nx, ny)) { path.push([x, y, dir]); break; }
        path.push([nx, ny, dir]); x = nx; y = ny;
      }
    } else if (w.to === 'player') {
      path = this.findPath(s, n, (x, y) => Math.abs(x - p.x) + Math.abs(y - p.y) === 1, { ignore: n.id }) || [];
    } else if (w.to === 'exit') {
      path = this.exitPath(s, n); mode = 'hide';
    } else if (w.to === 'home') {
      const home = (NPCS[p.map] || []).find((x) => x.id === n.id) || n;
      path = this.findPath(s, n, (x, y) => x === home.x && y === home.y, { ignore: n.id }) || [];
    } else if (w.to?.door) {
      const target = (x, y) => warpAt(map, x, y)?.to === w.to.door;
      path = this.findPath(s, n, target, { ignore: n.id, last: target }) || [];
      mode = 'hide';
    } else if (w.to?.npc) {
      const o = this.findNpc(s, w.to.npc);
      path = o ? this.findPath(s, n, (x, y) => Math.abs(x - o.x) + Math.abs(y - o.y) === 1, { ignore: n.id }) || [] : [];
    } else if (w.to?.at) {
      const [tx, ty] = w.to.at;
      path = this.findPath(s, n, (x, y) => x === tx && y === ty, { ignore: n.id }) || [];
    }
    if (!path) path = [];
    const end = path[path.length - 1];
    let face = end ? end[2] : n.dir;
    if (w.to === 'player' || w.face === 'player') face = dirTo(end ? end[0] : n.x, end ? end[1] : n.y, p.x, p.y);
    if (end || mode !== 'stay') {
      if (mode !== 'hide') this.setNpcPos(s, n.id, end ? end[0] : n.x, end ? end[1] : n.y, face);
      this.game.send(s.ws, { t: S2C.NPC_WALK, map: p.map, id: n.id, from: [n.x, n.y, n.dir], path, face, mode, fast: !!w.fast });
    }
    // Der Spieler sieht die Figur an, wenn sie zu ihm kommt
    if (w.to === 'player' && end) { p.dir = OPP[face]; this.game.send(s.ws, { t: S2C.SELF_FACE, dir: p.dir }); }
    return path.length * (w.fast ? RUN_MS : WALK_MS) + (mode === 'hide' ? 120 : 0);
  },

  walkPlayer(s, step) {
    const p = s.player; const map = MAPS[p.map];
    const path = []; let x = p.x, y = p.y;
    if (typeof step.me === 'string') {
      for (const c of step.me) {
        const dir = LETTER[c]; if (!dir) continue;
        const nx = x + DIRS[dir].dx, ny = y + DIRS[dir].dy;
        const water = step.water && tileAt(map, nx, ny) === '~';
        if ((!open(map, nx, ny) && !water) || this.npcAtFor(s, p.map, nx, ny)) { path.push([x, y, dir]); break; }
        path.push([nx, ny, dir]); x = nx; y = ny;
      }
    } else if (step.me.to) {
      const o = this.findNpc(s, step.me.to);
      const found = o && this.findPath(s, p, (gx, gy) => Math.abs(gx - o.x) + Math.abs(gy - o.y) === 1);
      if (found) path.push(...found);
    }
    if (!path.length) return 0;
    const end = path[path.length - 1];
    let dir = end[2];
    if (step.me.to) { const o = this.findNpc(s, step.me.to); if (o) dir = dirTo(end[0], end[1], o.x, o.y); }
    Object.assign(p, { x: end[0], y: end[1], dir });
    s.posDirty = true; s.prev = null;
    this.game.send(s.ws, { t: S2C.SELF_WALK, path, face: dir, fast: !!step.fast, jump: !!step.jump });
    this.game.broadcastMap(p.map, { t: S2C.PLAYER_MOVED, id: p.id, x: p.x, y: p.y, dir: p.dir }, p.id);
    return path.length * (step.fast ? RUN_MS : WALK_MS);
  },

  // Figuren, die mitten in der Szene verschwinden oder auftauchen, laufen aus dem Bild oder hinein
  sceneDiff(s) {
    const sc = s.script; if (!sc) return 0;
    const p = s.player;
    const now = new Map(visibleNpcs(p.map, p.flags || {}).map((n) => [n.id, n]));
    const seen = sc.seen;
    sc.seen = { map: p.map, ids: new Set(now.keys()) };
    if (!seen || seen.map !== p.map || sc.quiet) { sc.quiet = false; return 0; }
    let dur = 0;
    for (const id of seen.ids) {
      if (now.has(id)) continue;
      const base = (NPCS[p.map] || []).find((n) => n.id === id);
      if (!canWalk(base)) continue;
      // Tausch an derselben Stelle (andere Fassung derselben Figur): kein Weggehen
      if ([...now.values()].some((o) => !seen.ids.has(o.id) && o.x === base.x && o.y === base.y)) continue;
      dur = Math.max(dur, this.walkNpc(s, { to: 'exit' }, 'hide', this.npcPos(s, base)));
    }
    for (const [id, n] of now) {
      if (seen.ids.has(id) || !canWalk(n)) continue;
      if ([...seen.ids].some((o) => { const b = (NPCS[p.map] || []).find((x) => x.id === o); return b && !now.has(o) && b.x === n.x && b.y === n.y; })) continue;
      // Von einem Ausgang her ins Bild laufen
      const out = this.exitPath(s, n);
      if (!out.length) continue;
      const back = [];
      for (let i = out.length - 2; i >= -1; i--) {
        const [x, y] = i >= 0 ? out[i] : [n.x, n.y];
        back.push([x, y, OPP[out[i + 1][2]]]);
      }
      const start = out[out.length - 1];
      this.game.send(s.ws, { t: S2C.NPC_WALK, map: p.map, id, from: [start[0], start[1], back[0]?.[2] || n.dir], path: back, face: n.dir, mode: 'show' });
      dur = Math.max(dur, back.length * WALK_MS);
    }
    return dur;
  },

  // Szene wartet, bis alle Figuren angekommen sind
  sceneWait(s, ms) {
    const sc = s.script;
    sc.waiting = 'scene';
    const go = () => { if (s.script === sc && sc.waiting === 'scene') { sc.waiting = null; this.run(s); } };
    if (fast() || ms <= 0) setImmediate(go); else setTimeout(go, ms);
    return 'wait';
  }
};

// ------------------------------------------------------------------ Umhergehen
// Leute in Städten und Häusern gehen wie in Platin ein paar Schritte umher und schauen sich um.
const WANDER_LOOKS = new Set(['boy', 'girl', 'lass', 'youngster', 'oldman', 'worker', 'mom', 'scientist', 'hiker', 'ace', 'swimmer', 'skier', 'psychic', 'police']);
const plainTalk = (t) => Array.isArray(t) && t.every((l) => Array.isArray(l));
export function isWanderer(n, mapId) {
  if (n.wander !== undefined) return !!n.wander;
  if (n.trainer || n.item || n.show || n.still || !WANDER_LOOKS.has(n.look) || !plainTalk(n.talk)) return false;
  return !/_nurse$|_clerk$|_guide$/.test(n.id) && !!MAPS[mapId];
}

export const Wander = {
  startWander() {
    this.wanderList = [];
    for (const [mapId, list] of Object.entries(NPCS)) for (const n of list) if (isWanderer(n, mapId)) {
      n.hx = n.x; n.hy = n.y; n.hdir = n.dir;
      this.wanderList.push([mapId, n, MAPS[mapId].indoor ? 1 : 2]);
    }
    this.wanderTimer = setInterval(() => this.wanderTick(), 700);
  },
  wanderPositions() {
    return (this.wanderList || []).filter(([, n]) => n.x !== n.hx || n.y !== n.hy || n.dir !== n.hdir).map(([m, n]) => [m, n.id, n.x, n.y, n.dir]);
  },
  wanderTick() {
    const maps = new Map();
    for (const s of this.sessions.values()) (maps.get(s.player.map) || maps.set(s.player.map, []).get(s.player.map)).push(s);
    if (!maps.size) return;
    for (const [mapId, n, r] of this.wanderList) {
      const here = maps.get(mapId);
      if (!here || Math.random() > 0.12) continue;
      // Nicht bewegen, waehrend jemand mit der Figur redet oder eine Szene laeuft
      if (here.some((s) => s.script || s.npcPos?.list?.[n.id])) continue;
      const dirs = Object.keys(DIRS);
      const dir = dirs[Math.floor(Math.random() * 4)];
      const d = DIRS[dir]; const map = MAPS[mapId];
      const nx = n.x + d.dx, ny = n.y + d.dy;
      let moved = false;
      if (Math.random() < 0.55 && Math.abs(nx - n.hx) <= r && Math.abs(ny - n.hy) <= r && open(map, nx, ny) && !warpAt(map, nx, ny)
        && !here.some((s) => (s.player.x === nx && s.player.y === ny) || (s.player.x === n.x + d.dx * 2 && s.player.y === n.y + d.dy * 2 && s.player.dir === OPP[dir]))
        && !(NPCS[mapId] || []).some((o) => o !== n && o.x === nx && o.y === ny)) {
        n.x = nx; n.y = ny; moved = true;
      }
      if (!moved && n.dir === dir) continue;
      n.dir = dir;
      for (const s of this.sessions.values()) this.send(s.ws, { t: S2C.NPC_MOVE, map: mapId, id: n.id, x: n.x, y: n.y, dir, step: moved });
    }
  }
};
