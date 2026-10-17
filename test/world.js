// Weltpruefung: Kartenraender, Erreichbarkeit und Story-Blockaden. Simuliert den Spieler per
// Breitensuche ueber alle Karten. NPCs mit show-Bedingung und Ausloeser mit { back } sperren
// Felder je nach Story-Fortschritt, Feldhindernisse brauchen die passenden VM-Flags.
import { MAPS, SPAWN } from '../shared/data/maps.js';
import { NPCS, TRIGGERS, SCRIPTS, TRAINERS, cond, visibleNpcs } from '../shared/data/story.js';
import { resolveStep, isStandable, SOLID } from '../shared/world.js';

const OPP = { north: 'south', south: 'north', east: 'west', west: 'east' };

// Liefert true, wenn ein Skript den Spieler zuruecksetzt (Blockade)
function pushesBack(steps) {
  return (steps || []).some((s) => s && !Array.isArray(s) && (s.back || (s.then && pushesBack(s.then))));
}

// Ziele von { warp } in einem Skript (Schiffe, Boote)
function scriptWarps(steps, out = []) {
  for (const s of steps || []) {
    if (!s || Array.isArray(s)) continue;
    if (s.warp) out.push(s.warp);
    for (const k of ['then', 'else', 'yes', 'no']) scriptWarps(s[k], out);
  }
  return out;
}

export function reachable(flags, start = { map: SPAWN.map, x: SPAWN.x, y: SPAWN.y }) {
  const seen = new Set(); const maps = new Set();
  const key = (m, x, y) => `${m}|${x}|${y}`;
  const q = [start]; seen.add(key(start.map, start.x, start.y));
  const blockedTile = (m, x, y) => {
    if (visibleNpcs(m, flags).some((n) => n.x === x && n.y === y)) return true;
    return (TRIGGERS[m] || []).some((t) => x >= t.x && x < t.x + (t.w || 1) && y >= t.y && y < t.y + (t.h || 1) && cond(flags, t.when) && pushesBack(SCRIPTS[t.script]));
  };
  const sailed = new Set();
  while (q.length) {
    const p = q.shift();
    if (!maps.has(p.map)) {
      // Figuren mit Fahrt-Skript bringen den Spieler woanders hin
      for (const n of visibleNpcs(p.map, flags)) {
        if (typeof n.talk !== 'string' || sailed.has(n.id)) continue;
        for (const [m, x, y] of scriptWarps(SCRIPTS[n.talk])) {
          if (!/Leinen los|Boot|Schiff/.test(JSON.stringify(SCRIPTS[n.talk]))) continue;
          sailed.add(n.id);
          const k = key(m, x, y);
          if (!seen.has(k)) { seen.add(k); q.push({ map: m, x, y }); }
        }
      }
    }
    maps.add(p.map);
    for (const dir of ['up', 'down', 'left', 'right']) {
      const r = resolveStep(MAPS, p.map, p.x, p.y, dir, (m, x, y) => blockedTile(m, x, y), flags);
      if (!r.ok || (r.warp && blockedTile(r.map, r.x, r.y))) continue;
      const k = key(r.map, r.x, r.y);
      if (seen.has(k)) continue;
      seen.add(k); q.push({ map: r.map, x: r.x, y: r.y });
    }
  }
  return { maps, seen };
}

export function checkWorld() {
  const errors = [];
  const ALL = new Proxy({}, { get: (_, k) => (typeof k === 'string' && !k.startsWith('!')) });
  for (const [id, m] of Object.entries(MAPS)) {
    for (const [edge, c] of Object.entries(m.connections || {})) {
      const b = MAPS[c.map];
      if (!b) { errors.push(`${id}: Verbindung zu fehlender Karte ${c.map}`); continue; }
      const back = b.connections?.[OPP[edge]];
      if (!back || back.map !== id || back.offset !== -c.offset) errors.push(`${id} ${edge} -> ${c.map}: Gegenstueck fehlt oder passt nicht`);
      // Mindestens ein begehbarer Uebergang
      const cells = edge === 'north' || edge === 'south' ? m.width : m.height;
      let ok = 0;
      for (let i = 0; i < cells; i++) {
        const x = edge === 'east' ? m.width - 1 : edge === 'west' ? 0 : i;
        const y = edge === 'south' ? m.height - 1 : edge === 'north' ? 0 : i;
        const dir = { north: 'up', south: 'down', east: 'right', west: 'left' }[edge];
        if (!isStandable(MAPS, id, x, y, ALL)) continue;
        const r = resolveStep(MAPS, id, x, y, dir, null, ALL);
        if (r.ok && r.map === c.map) ok++;
      }
      if (!ok) errors.push(`${id} ${edge} -> ${c.map}: kein begehbarer Uebergang`);
    }
    for (const w of m.warps) if (!isStandable(MAPS, w.to, w.tx, w.ty, ALL)) errors.push(`${id}: Warp-Ziel ${w.to} ${w.tx},${w.ty} nicht begehbar`);
    for (const e of m.events) if (e.x < 0 || e.y < 0 || e.x >= m.width || e.y >= m.height) errors.push(`${id}: Ereignis ausserhalb`);
    if (m.fly && !isStandable(MAPS, id, m.fly[0], m.fly[1])) errors.push(`${id}: Landepunkt nicht begehbar`);
  }
  for (const [id, list] of Object.entries(TRIGGERS)) {
    if (!MAPS[id]) { errors.push(`Ausloeser auf fehlender Karte ${id}`); continue; }
    for (const t of list) {
      if (!SCRIPTS[t.script]) errors.push(`${id}: Skript ${t.script} fehlt`);
      for (let y = t.y; y < t.y + (t.h || 1); y++) for (let x = t.x; x < t.x + (t.w || 1); x++) {
        const tile = MAPS[id].tiles[y]?.[x];
        if (tile === undefined) errors.push(`${id}: Ausloeser ${t.script} ausserhalb`);
      }
    }
  }
  const used = new Set();
  const walk = (steps) => { for (const s of steps || []) { if (!s || Array.isArray(s)) continue; if (s.battle) used.add(s.battle); walk(s.then); walk(s.else); walk(s.yes); walk(s.no); for (const b of s.branches || []) walk(b); } };
  Object.values(SCRIPTS).forEach(walk);
  for (const list of Object.values(NPCS)) for (const n of list) {
    if (n.trainer) used.add(n.trainer);
  }
  for (const id of Object.keys(TRAINERS)) if (!used.has(id)) errors.push(`Trainer ${id} wird nirgends eingesetzt`);
  for (const [id, list] of Object.entries(NPCS)) for (const n of list) {
    const t = MAPS[id]?.tiles[n.y]?.[n.x];
    if (!t || (SOLID.has(t) && t !== '~') || ('DCGU'.includes(t) && !(n.fromDoor && t === 'D'))) errors.push(`${id}/${n.id} steht auf ${t}`);
  }
  // Mit allen Faehigkeiten muss jede Karte erreichbar sein
  const all = reachable(ALL);
  for (const id of Object.keys(MAPS)) if (!all.maps.has(id) && !MAPS[id].scripted && !MAPS[id].retired) errors.push(`${id} ist nicht erreichbar`);
  return errors;
}

// Weltkarte: Aussenkarten liegen ueber Randverbindungen und Innenraeume mit zwei Ausgaengen
// zueinander. Alle Wege muessen dieselbe Lage ergeben, und keine zwei Aussenkarten duerfen sich decken.
export function checkLayout(spawn = 'twinleaf_town') {
  const errors = [];
  const edges = [];
  for (const [id, a] of Object.entries(MAPS)) {
    if (a.indoor) continue;
    for (const [edge, c] of Object.entries(a.connections || {})) {
      const b = MAPS[c.map];
      const d = edge === 'north' ? { x: -c.offset, y: -b.height } : edge === 'south' ? { x: -c.offset, y: a.height }
        : edge === 'west' ? { x: -b.width, y: -c.offset } : { x: a.width, y: -c.offset };
      edges.push({ a: id, b: c.map, d, via: edge });
    }
  }
  for (const [cid, c] of Object.entries(MAPS)) {
    if (!c.indoor) continue;
    const outs = [...new Set(c.warps.map((w) => w.to).filter((t) => !MAPS[t].indoor))];
    for (const u of outs) for (const v of outs) {
      if (u === v) continue;
      const wu = c.warps.find((w) => w.to === u); const wv = c.warps.find((w) => w.to === v);
      const du = MAPS[u].warps.find((w) => w.to === cid); const dv = MAPS[v].warps.find((w) => w.to === cid);
      if (du && dv) edges.push({ a: u, b: v, d: { x: du.x - wu.x + wv.x - dv.x, y: du.y - wu.y + wv.y - dv.y }, via: cid });
    }
  }
  const pos = { [spawn]: { x: 0, y: 0 } }; const q = [spawn];
  while (q.length) {
    const id = q.shift();
    for (const e of edges) if (e.a === id && !pos[e.b]) { pos[e.b] = { x: pos[id].x + e.d.x, y: pos[id].y + e.d.y }; q.push(e.b); }
  }
  for (const e of edges) {
    const dx = pos[e.a].x + e.d.x - pos[e.b].x; const dy = pos[e.a].y + e.d.y - pos[e.b].y;
    if (dx || dy) errors.push(`${e.a} -> ${e.b} (${e.via}) liegt um ${dx}, ${dy} daneben`);
  }
  const ids = Object.keys(pos);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const [a, b] = [ids[i], ids[j]]; const A = pos[a]; const B = pos[b];
    const ox = Math.min(A.x + MAPS[a].width, B.x + MAPS[b].width) - Math.max(A.x, B.x);
    const oy = Math.min(A.y + MAPS[a].height, B.y + MAPS[b].height) - Math.max(A.y, B.y);
    if (ox > 0 && oy > 0) errors.push(`${a} und ${b} ueberlappen (${ox}x${oy})`);
  }
  for (const id of Object.keys(MAPS)) if (!MAPS[id].indoor && !pos[id]) errors.push(`${id} hat keine Lage auf der Weltkarte`);
  return errors;
}
