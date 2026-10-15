// Weltpruefung: Kartenraender, Erreichbarkeit und Story-Blockaden. Simuliert den Spieler per
// Breitensuche ueber alle Karten. NPCs mit show-Bedingung und Ausloeser mit { back } sperren
// Felder je nach Story-Fortschritt, Feldhindernisse brauchen die passenden VM-Flags.
import { MAPS } from '../shared/data/maps.js';
import { NPCS, TRIGGERS, SCRIPTS, TRAINERS, cond, visibleNpcs } from '../shared/data/story.js';
import { resolveStep, isStandable, SOLID } from '../shared/world.js';

const OPP = { north: 'south', south: 'north', east: 'west', west: 'east' };

// Liefert true, wenn ein Skript den Spieler zuruecksetzt (Blockade)
function pushesBack(steps) {
  return (steps || []).some((s) => s && !Array.isArray(s) && (s.back || (s.then && pushesBack(s.then))));
}

export function reachable(flags, start = { map: 'twinleaf_town', x: 10, y: 7 }) {
  const seen = new Set(); const maps = new Set();
  const key = (m, x, y) => `${m}|${x}|${y}`;
  const q = [start]; seen.add(key(start.map, start.x, start.y));
  const blockedTile = (m, x, y) => {
    if (visibleNpcs(m, flags).some((n) => n.x === x && n.y === y)) return true;
    return (TRIGGERS[m] || []).some((t) => x >= t.x && x < t.x + (t.w || 1) && y >= t.y && y < t.y + (t.h || 1) && cond(flags, t.when) && pushesBack(SCRIPTS[t.script]));
  };
  while (q.length) {
    const p = q.shift(); maps.add(p.map);
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
    if (!t || (SOLID.has(t) && t !== '~') || 'DCGU'.includes(t)) errors.push(`${id}/${n.id} steht auf ${t}`);
  }
  // Mit allen Faehigkeiten muss jede Karte erreichbar sein
  const all = reachable(ALL);
  for (const id of Object.keys(MAPS)) if (!all.maps.has(id)) errors.push(`${id} ist nicht erreichbar`);
  return errors;
}
