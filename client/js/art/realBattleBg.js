// Kampfhintergruende aus Platin (github.com/pret/pokeplatinum, res/prebuilt/battle/graphic/pl_batt_bg.narc).
// `npm run sprites` setzt Kacheln, Palette und Tilemap zu PNGs in client/sprites/battlebg/ zusammen.
// Hier: welcher Hintergrund und welcher Kampfboden zu welcher Karte gehoert, und die Tageszeit.
// Fehlen die Bilder, bleibt der gezeichnete Farbverlauf.
import { spriteIndex } from './monsters.js';

// Reihenfolge wie im Spiel (BACKGROUND_PLAIN ... BACKGROUND_BATTLE_HALL): Kacheln 3 + i, Paletten 172 + i * 3
export const BATTLE_BGS = ['plain', 'water', 'city', 'forest', 'mountain', 'snow', 'indoors_1', 'indoors_2', 'indoors_3',
  'cave_1', 'cave_2', 'cave_3', 'aaron', 'bertha', 'flint', 'lucian', 'cynthia', 'distortion_world',
  'battle_tower', 'battle_factory', 'battle_arcade', 'battle_castle', 'battle_hall'];
// Nur die Aussenhintergruende haben im Original Paletten fuer Abend und Nacht
export const TIMED_BGS = BATTLE_BGS.slice(0, 6);
export const BG_TIMES = ['day', 'evening', 'night'];

// Tageszeit wie in Platin: Morgen 4 bis 10, Tag bis 17, Abend bis 20, danach Nacht. Morgen nutzt die Tagespalette.
export function timeOfDay(d = new Date()) {
  const h = d.getHours();
  if (h >= 20 || h < 4) return 'night';
  if (h >= 17) return 'evening';
  return 'day';
}

const CAVE_DARK = ['victory_road', 'wayward_cave', 'iron_island_deep', 'stark_mountain_deep', 'galactic_hq'];
const CAVE_DARKEST = ['turnback_cave'];
const SNOW = ['route_216', 'route_217', 'snowpoint_city', 'lake_acuity'];
const FOREST = ['eterna_forest', 'floaroma_meadow'];
const MOUNTAIN = ['route_206', 'route_207', 'route_211', 'route_227', 'route_228', 'stark_mountain', 'spear_pillar', 'ravaged_path'];
const LEAGUE = { e4_aaron: ['aaron', 'league_aaron'], e4_bertha: ['bertha', 'league_bertha'], e4_flint: ['flint', 'league_flint'], e4_lucian: ['lucian', 'league_lucian'], champion_room: ['cynthia', 'league_cynthia'] };
const LAB = ['eterna_galactic', 'galactic_warehouse', 'windworks_inside', 'sunyshore_lighthouse', 'canalave_library'];

// Hintergrund und Kampfboden fuer eine Karte. pos: Spielerposition (auf Wasser: Wasserkampf).
export function battleScene(mapId, map, pos) {
  const tile = pos && map?.tiles?.[pos.y]?.[pos.x];
  const s = (bg, terrain) => ({ bg, terrain, time: TIMED_BGS.includes(bg) ? timeOfDay() : 'day' });
  if (LEAGUE[mapId]) return s(...LEAGUE[mapId]);
  if (mapId === 'distortion_world') return s('distortion_world', 'distortion_world');
  if (mapId === 'battle_tower') return s('battle_tower', 'battle_tower');
  if (tile === '~') return s('water', 'water');
  if (mapId === 'spear_pillar') return s('mountain', 'rocky');
  if (CAVE_DARKEST.includes(mapId)) return s('cave_3', 'cave');
  if (CAVE_DARK.includes(mapId)) return s('cave_2', 'cave');
  if (map?.theme === 'cave') return s('cave_1', 'cave');
  if (map?.indoor) {
    if (map.theme === 'gym') return s('indoors_3', 'indoors');
    if (map.theme === 'lab' || LAB.includes(mapId)) return s('indoors_2', 'indoors');
    return s('indoors_1', 'indoors');
  }
  if (SNOW.includes(mapId) || map?.tint === 'snow') return s('snow', 'snow');
  if (map?.weather === 'sand') return s('mountain', 'sand');
  if (MOUNTAIN.includes(mapId)) return s('mountain', 'rocky');
  if (FOREST.includes(mapId)) return s('forest', 'grass');
  if (mapId === 'route_215') return s('plain', 'path_puddles');
  if (/_(city|town)$/.test(mapId) || ['fight_area', 'survival_area', 'resort_area', 'pokemon_league', 'pokemon_league_south'].includes(mapId)) {
    // Kaempfe in Staedten: auf Gras wie draussen, sonst auf dem Weg
    return tile === '"' ? s('plain', 'grass') : s('city', 'path');
  }
  return s('plain', 'grass');
}

// Datei des Hintergrunds (oder null, wenn `npm run sprites` ihn nicht geladen hat)
export function battleBgUrl(bg, time = 'day') {
  const have = spriteIndex()?.battlebg;
  if (!have) return null;
  const name = time !== 'day' && TIMED_BGS.includes(bg) ? `${bg}_${time}` : bg;
  if (have.includes(name)) return `/sprites/battlebg/${name}.png`;
  return have.includes(bg) ? `/sprites/battlebg/${bg}.png` : null;
}

// Hintergrund auf das Kampffeld legen (ohne Bilder: Klasse weg, CSS-Verlauf bleibt)
export function applyBattleBg(field, scene) {
  const url = scene?.bg && battleBgUrl(scene.bg, scene.time);
  field.classList.toggle('real-bg', !!url);
  if (url) field.style.setProperty('--battle-bg', `url(${url})`);
  else field.style.removeProperty('--battle-bg');
}
