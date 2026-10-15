// Mischt den kompletten Gen-4-Pokedex (shared/data/dex/gen4.json, erzeugt mit `npm run build-dex`)
// in die Laufzeittabellen. Arten werden durch die vollstaendigen Daten ersetzt, eingebettete
// Attacken behalten ihre handgebauten Effekte, fehlende Attacken kommen dazu.
import fs from 'node:fs';
import { POKEMON } from '../../shared/data/pokemon.js';
import { MOVES } from '../../shared/data/moves.js';

const FILE = new URL('../../shared/data/dex/gen4.json', import.meta.url);

export function applyDex() {
  if (!fs.existsSync(FILE)) return { pokemon: 0, moves: 0 };
  const dex = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  let m = 0;
  for (const [id, mv] of Object.entries(dex.moves)) if (!MOVES[id]) { MOVES[id] = mv; m++; }
  for (const [id, sp] of Object.entries(dex.pokemon)) {
    sp.learnset = sp.learnset.filter(([, mv]) => MOVES[mv]);
    POKEMON[id] = sp;
  }
  return { pokemon: Object.keys(dex.pokemon).length, moves: m };
}

export const DEX = applyDex();
