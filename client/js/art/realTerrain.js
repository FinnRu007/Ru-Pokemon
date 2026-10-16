// Kampfboden aus Platin (github.com/pret/pokeplatinum, res/graphics/battle/terrain/), passend zur Karte.
// Welcher Boden zu welcher Karte gehoert, steht zusammen mit dem Hintergrund in realBattleBg.js.
import { battleScene } from './realBattleBg.js';
export const TERRAINS = ['grass', 'cave', 'snow', 'indoors', 'rocky', 'sand', 'water', 'path_puddles', 'distortion_world',
  'path', 'mud', 'ice', 'league_aaron', 'league_bertha', 'league_flint', 'league_lucian', 'league_cynthia', 'battle_tower', 'giratina'];
// Diese Boeden haben im Original eigene Paletten fuer Abend und Nacht (day.pal, evening.pal, night.pal)
export const TIMED_TERRAINS = ['grass', 'ice', 'mud', 'path', 'path_puddles', 'rocky', 'sand', 'snow', 'water'];

export function terrainFor(mapId, map, pos) {
  return battleScene(mapId, map, pos).terrain;
}

// Die PNGs haben keine Transparenz: Farbe des Pixels oben links wird durchsichtig. Ergebnis als data:-URL.
const cache = new Map();
// time: evening oder night nimmt die passende Fassung (npm run sprites legt sie mit der Originalpalette an)
export function terrainImage(t, side, time = 'day') {
  const key = time !== 'day' && TIMED_TERRAINS.includes(t) ? `${t}/${side}_${time}` : `${t}/${side}`;
  if (cache.has(key)) return cache.get(key);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height); const px = d.data;
      const [r, gg, b] = px;
      for (let i = 0; i < px.length; i += 4) if (px[i] === r && px[i + 1] === gg && px[i + 2] === b) px[i + 3] = 0;
      g.putImageData(d, 0, 0);
      resolve(c.toDataURL());
    };
    img.onerror = () => resolve(key !== `${t}/${side}` ? terrainImage(t, side) : null);
    img.src = `/sprites/terrain/${key}.png`;
  });
  cache.set(key, p);
  return p;
}
