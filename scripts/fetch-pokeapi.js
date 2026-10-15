// Laedt Pokemon-Daten von der PokeAPI und schreibt sie nach shared/data/generated/pokeapi.json.
// Aufruf: npm run fetch-data -- 387-493        (Bereich)
//         npm run fetch-data -- 25,133,447     (Liste)
//         npm run fetch-data                   (gesamter Sinnoh-Dex 387-493)
import { fetchSpecies, saveCache } from '../server/data/pokeapiLoader.js';

function parseIds(arg) {
  if (!arg) return Array.from({ length: 107 }, (_, i) => 387 + i);
  return arg.split(',').flatMap((part) => {
    const [a, b] = part.split('-').map(Number);
    return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a];
  });
}

const ids = parseIds(process.argv[2]);
console.log(`Lade ${ids.length} Arten von pokeapi.co ...`);
const data = await fetchSpecies(ids, { log: console });
const merged = saveCache(data);
console.log(`Fertig: ${Object.keys(merged.pokemon).length} Arten, ${Object.keys(merged.moves).length} Attacken im Cache.`);
