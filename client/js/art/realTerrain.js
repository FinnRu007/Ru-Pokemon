// Kampfboden aus Platin (github.com/pret/pokeplatinum, res/graphics/battle/terrain/), passend zur Karte.
export const TERRAINS = ['grass', 'cave', 'snow', 'indoors', 'rocky', 'sand', 'water', 'path_puddles', 'distortion_world'];
const CAVE = ['oreburgh_mine', 'oreburgh_gate', 'ravaged_path', 'mt_coronet', 'celestic_ruins', 'galactic_hq', 'eterna_galactic', 'galactic_warehouse', 'windworks_inside'];
const SNOW = ['route_216', 'route_217', 'snowpoint_city', 'lake_acuity'];

export function terrainFor(mapId, map) {
  if (mapId === 'distortion_world') return 'distortion_world';
  if (mapId === 'spear_pillar') return 'rocky';
  if (CAVE.includes(mapId)) return 'cave';
  if (SNOW.includes(mapId)) return 'snow';
  if (map?.indoor) return 'indoors';
  if (mapId === 'route_215') return 'path_puddles';
  return 'grass';
}

// Die PNGs haben keine Transparenz: Farbe des Pixels oben links wird durchsichtig. Ergebnis als data:-URL.
const cache = new Map();
export function terrainImage(t, side) {
  const key = `${t}/${side}`;
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
    img.onerror = () => resolve(null);
    img.src = `/sprites/terrain/${key}.png`;
  });
  cache.set(key, p);
  return p;
}
