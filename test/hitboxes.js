// Unsichtbare Hindernisse: Jedes Feld, das auf einer Originalkarte nur wegen eines Objekts blockiert
// (Schild, Briefkasten, Poller, Feldhindernis), muss im Spiel auch etwas zeigen. Die Kartenbilder aus
// Platin enthalten diese Objekte nicht, der Client zeichnet sie einzeln (renderer.drawOrig).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAPS } from '../shared/data/maps.js';
import { PROP_KINDS } from '../client/js/art/props.js';
import { FIELD_MODELS } from '../scripts/world/build-world.js';
import { SPRITES_BUILD } from '../scripts/spritesBuild.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const drawnObject = (g) => g === 'BOLLARD' || PROP_KINDS.has(g);
// Objekte, die im Original fest im Weg stehen und keine Figur sind
const STATIC = /SIGN|MAILBOX|BOLLARD|BOOK|CUT_TREE|ROCK_SMASH|STRENGTH_BOULDER/;

export function checkHitboxes() {
  const errors = [];
  for (const [id, m] of Object.entries(MAPS)) {
    if (!m.orig) continue;
    const at = new Map(m.orig.objects.map((o) => [`${o.x},${o.y}`, o]));
    for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
      const t = m.tiles[y][x];
      const o = at.get(`${x},${y}`);
      if (t === 'S' && !(o && drawnObject(o.g))) errors.push(`${id} ${x},${y}: Schild ohne Grafik`);
      if (t === '#' && o && STATIC.test(o.g) && !drawnObject(o.g)) errors.push(`${id} ${x},${y}: ${o.g} blockiert ohne Grafik`);
    }
    for (const o of m.orig.objects) if (STATIC.test(o.g) && !drawnObject(o.g) && !/CUT_TREE|ROCK_SMASH|STRENGTH_BOULDER/.test(o.g)) errors.push(`${id} ${o.x},${o.y}: ${o.g} wird nicht gezeichnet`);
  }
  return errors;
}

// Passt die heruntergeladene Originalgrafik zum Code? (Der Server baut sie sonst beim Start nach.)
export function checkSprites() {
  const errors = [];
  let idx = null, world = null;
  try { idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'client/sprites/index.json'), 'utf8')); } catch { return errors; }
  if ((idx.build ?? 0) !== SPRITES_BUILD) errors.push(`Originalgrafik veraltet (Stand ${idx.build ?? 0}, Code ${SPRITES_BUILD}): npm run sprites`);
  try { world = JSON.parse(fs.readFileSync(path.join(ROOT, 'client/sprites/world/index.json'), 'utf8')); } catch { return errors; }
  for (const g of Object.keys(FIELD_MODELS)) if (!world.objects?.[g]) errors.push(`Bild fuer ${g} fehlt: npm run sprites`);
  return errors;
}
