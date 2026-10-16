import { MAPS } from '../../shared/data/maps.js'; // im Browser /shared/..., in den Tests relativ
// Zuordnung der Karten dieses Spiels zur Karte von Sinnoh aus Platin (Karten-App).
// Ein Feld der Karte entspricht einem Matrixfeld der Hauptmatrix (res/field/matrices/map_matrix_000.json,
// je 32x32 Kacheln). PLACES: Karten-ID -> [Platin-Map-Header (generated/map_headers.txt), x0, z0, x1, z1]
// mit den Matrixfeldern, die der Header belegt (x1/z1 fehlen bei einem einzelnen Feld). Header ausserhalb der
// Hauptmatrix (Seen, Hoehlen, Innenraeume) liegen auf dem Feld, auf dem die Karten-App sie zeigt.
export const PLACES = {
  twinleaf_town: ['TWINLEAF_TOWN', 3, 27],
  route_201: ['ROUTE_201', 3, 26, 4, 26],
  lake_verity: ['LAKE_VERITY', 1, 25, 2, 26],
  sandgem_town: ['SANDGEM_TOWN', 5, 26],
  route_202: ['ROUTE_202', 5, 25],
  jubilife_city: ['JUBILIFE_CITY', 4, 23, 5, 24],
  route_203: ['ROUTE_203', 6, 23, 7, 23],
  oreburgh_city: ['OREBURGH_CITY', 8, 23, 9, 24],
  route_204: ['ROUTE_204_SOUTH', 5, 22],
  route_204_north: ['ROUTE_204_NORTH', 5, 21],
  floaroma_town: ['FLOAROMA_TOWN', 5, 19, 5, 20],
  floaroma_meadow: ['FLOAROMA_MEADOW', 5, 19],
  valley_windworks: ['VALLEY_WINDWORKS_OUTSIDE', 7, 20],
  route_205_south: ['ROUTE_205_SOUTH', 6, 18, 6, 20],
  eterna_forest: ['ETERNA_FOREST_OUTSIDE', 6, 16, 7, 17],
  eterna_city: ['ETERNA_CITY', 9, 16, 10, 17],
  route_206: ['ROUTE_206', 9, 18, 9, 21],
  route_207: ['ROUTE_207', 9, 22, 10, 22],
  route_208: ['ROUTE_208', 12, 22, 13, 22],
  hearthome_city: ['HEARTHOME_CITY', 14, 21, 15, 22],
  route_209: ['ROUTE_209', 16, 21, 17, 22],
  solaceon_town: ['SOLACEON_TOWN', 17, 20, 18, 20],
  route_210: ['ROUTE_210_SOUTH', 17, 16, 17, 19], // hier eine Karte fuer Nord- und Suedteil
  route_212: ['ROUTE_212_NORTH', 14, 23, 14, 26],
  pastoria_city: ['PASTORIA_CITY', 18, 25, 19, 26],
  route_213: ['ROUTE_213', 20, 25, 22, 26],
  valor_lakefront: ['VALOR_LAKEFRONT', 21, 23, 22, 24],
  lake_valor: ['LAKE_VALOR', 21, 23, 22, 24],
  route_214: ['ROUTE_214', 22, 20, 22, 22],
  veilstone_city: ['VEILSTONE_CITY', 21, 18, 22, 19],
  route_215: ['ROUTE_215', 18, 18, 20, 18],
  route_216: ['ROUTE_216', 9, 12, 11, 12],
  route_217: ['ROUTE_217', 9, 8, 9, 11],
  lake_acuity: ['LAKE_ACUITY', 9, 6, 10, 7],
  snowpoint_city: ['SNOWPOINT_CITY', 11, 6, 11, 7],
  celestic_town: ['CELESTIC_TOWN', 14, 16],
  route_222: ['ROUTE_222', 23, 24, 25, 24],
  sunyshore_city: ['SUNYSHORE_CITY', 26, 23, 27, 24],
  route_223: ['ROUTE_223', 26, 19, 26, 22],
  pokemon_league_south: ['POKEMON_LEAGUE', 26, 18],
  pokemon_league: ['POKEMON_LEAGUE', 26, 17],
  canalave_city: ['CANALAVE_CITY', 1, 22, 1, 23],
  route_218: ['ROUTE_218', 2, 23, 3, 23],
  fight_area: ['FIGHT_AREA', 19, 13, 20, 13],
  route_225: ['ROUTE_225', 19, 10, 19, 12],
  survival_area: ['SURVIVAL_AREA', 20, 10],
  route_226: ['ROUTE_226', 21, 10, 23, 10],
  route_227: ['ROUTE_227', 23, 8, 23, 9],
  route_228: ['ROUTE_228', 24, 10, 24, 12],
  route_229: ['ROUTE_229', 24, 13, 25, 13],
  route_230: ['ROUTE_230', 21, 13, 23, 13],
  resort_area: ['RESORT_AREA', 25, 14],
  north_sea: [null, 13, 7, 18, 11], // keine Entsprechung in Platin: Meer zwischen Blizzach und Kampfareal
  // Hoehlen und Gebaeude mit eigenem Feld auf der Karte
  oreburgh_gate: ['OREBURGH_GATE_1F', 7, 23],
  oreburgh_mine: ['OREBURGH_MINE_B1F', 9, 24],
  ravaged_path: ['RAVAGED_PATH', 5, 22],
  windworks_inside: ['VALLEY_WINDWORKS_BUILDING', 7, 20],
  old_chateau: ['OLD_CHATEAU', 7, 16],
  wayward_cave: ['WAYWARD_CAVE_1F', 9, 19],
  mt_coronet: ['MT_CORONET_1F_SOUTH', 11, 20, 12, 22],
  spear_pillar: ['SPEAR_PILLAR', 11, 19],
  solaceon_ruins: ['SOLACEON_RUINS_ROOM_1', 18, 20],
  galactic_hq: ['GALACTIC_HQ_1F', 22, 18],
  snowpoint_temple: ['SNOWPOINT_TEMPLE_1F', 11, 6],
  iron_island: ['IRON_ISLAND', 3, 15],
  iron_island_deep: ['IRON_ISLAND_B3F', 3, 15],
  iron_ruins: ['IRON_RUINS', 3, 15],
  fullmoon_island: ['FULLMOON_ISLAND', 1, 8],
  stark_mountain: ['STARK_MOUNTAIN_ROOM_1', 23, 7],
  stark_mountain_deep: ['STARK_MOUNTAIN_ROOM_3', 23, 7],
  turnback_cave: ['TURNBACK_CAVE_ENTRANCE', 23, 22],
  victory_road: ['VICTORY_ROAD_1F', 26, 18],
  verity_cavern: ['VERITY_CAVERN', 2, 26],
  valor_cavern: ['VALOR_CAVERN', 22, 23],
  acuity_cavern: ['ACUITY_CAVERN', 10, 7],
  sunyshore_lighthouse: ['VISTA_LIGHTHOUSE', 27, 24],
  league_lobby: ['POKEMON_LEAGUE', 26, 17],
  e4_aaron: ['POKEMON_LEAGUE_AARON_ROOM', 26, 17],
  e4_bertha: ['POKEMON_LEAGUE_BERTHA_ROOM', 26, 17],
  e4_flint: ['POKEMON_LEAGUE_FLINT_ROOM', 26, 17],
  e4_lucian: ['POKEMON_LEAGUE_LUCIAN_ROOM', 26, 17],
  champion_room: ['POKEMON_LEAGUE_CHAMPION_ROOM', 26, 17],
  hall_of_fame: ['POKEMON_LEAGUE_HALL_OF_FAME', 26, 17]
};

// Flugziele der Karten-App (src/applications/town_map/fly_locations.c): Form und Farbe der Markierung,
// Bildposition (spriteX/spriteY ohne den Versatz des Rasters). shape: 0 1x1, 1 hoch, 2 2x2, 3/4 Winkel, 5 quer, 6 klein
const G = 7; // TOWN_MAP_GRID_SPACING
// Originalkarten (shared/data/origLayout.js): Lage direkt aus der Hauptmatrix, Raeume und Tore auf ihre Tuer
for (const [id, m] of Object.entries(MAPS)) {
  if (PLACES[id] || !m.orig) continue;
  if (m.orig.m === 0) PLACES[id] = [id.toUpperCase(), m.orig.x >> 5, m.orig.z >> 5, (m.orig.x + m.width - 1) >> 5, (m.orig.z + m.height - 1) >> 5];
  else if (!m.indoor && m.like && PLACES[m.like]) PLACES[id] = PLACES[m.like];
}

export const FLY_SPOTS = [
  { map: 'twinleaf_town', shape: 0, city: false, x: 3 * G, y: 27 * G },
  { map: 'sandgem_town', shape: 0, city: false, x: 5 * G, y: 26 * G },
  { map: 'floaroma_town', shape: 1, city: false, x: 5 * G, y: 19 * G + 3 },
  { map: 'solaceon_town', shape: 5, city: false, x: 17 * G + 3, y: 20 * G },
  { map: 'celestic_town', shape: 0, city: false, x: 14 * G, y: 16 * G },
  { map: 'survival_area', shape: 0, city: false, x: 20 * G, y: 10 * G },
  { map: 'resort_area', shape: 0, city: false, x: 25 * G, y: 14 * G },
  { map: 'jubilife_city', shape: 2, city: true, x: 4 * G + 3, y: 23 * G + 3 },
  { map: 'canalave_city', shape: 1, city: true, x: 1 * G, y: 22 * G + 3 },
  { map: 'oreburgh_city', shape: 4, city: true, x: 8 * G + 4, y: 23 * G + 3 },
  { map: 'eterna_city', shape: 3, city: true, x: 9 * G + 3, y: 16 * G + 3 },
  { map: 'hearthome_city', shape: 2, city: true, x: 14 * G + 3, y: 21 * G + 3 },
  { map: 'pastoria_city', shape: 2, city: true, x: 18 * G + 3, y: 25 * G + 3 },
  { map: 'veilstone_city', shape: 2, city: true, x: 21 * G + 3, y: 18 * G + 3 },
  { map: 'sunyshore_city', shape: 2, city: true, x: 26 * G + 3, y: 23 * G + 3 },
  { map: 'snowpoint_city', shape: 1, city: true, x: 11 * G, y: 6 * G + 3 },
  { map: 'fight_area', shape: 5, city: true, x: 19 * G + 4, y: 13 * G },
  { map: 'pokemon_league', shape: 0, city: true, x: 26 * G, y: 17 * G }
];

// Deutsche Namen der Gebiete aus res/town_map/town_map_data.json (fuer Felder ohne eigene Karte)
export const AREA_NAMES = {
  route_205_north: 'Route 205', route_205_south: 'Route 205', route_210_north: 'Route 210', route_210_south: 'Route 210',
  route_211: 'Route 211', route_212_north: 'Route 212', route_212_south: 'Route 212', twinleaf_town: 'Zweiblattdorf',
  sandgem_town: 'Sandgemme', floaroma_town: 'Flori', solaceon_town: 'Trostu', celestic_town: 'Elyses',
  survival_area: 'Überlebensareal', resort_area: 'Erholungsgebiet', jubilife_city: 'Jubelstadt', canalave_city: 'Fleetburg',
  oreburgh_city: 'Erzelingen', eternia_city: 'Ewigenau', hearthome_city: 'Herzhofen', pastoria_city: 'Weideburg',
  veilstone_city: 'Schleiede', sunyshore_city: 'Sonnewik', snowpoint_city: 'Blizzach', pokemon_league: 'Pokémon Liga',
  victory_road: 'Siegesstraße', fight_area: 'Kampfareal', verity_lakefront: 'Kraterberg-See', valor_lakefront: 'Seeufer der Kühnheit',
  acuity_lakefront: 'See der Willenskraft', spring_path: 'Quellenweg', valley_windworks: 'Windkraftwerk', eterna_forest: 'Ewigwald',
  fuego_ironworks: 'Eisenhütte', mount_coronet: 'Kraterberg', fullmoon_island: 'Vollmondinsel', newmoon_island: 'Neumondinsel',
  stark_mountain: 'Kahlberg', flower_paradise: 'Blumenparadies', seabreak_path: 'Brandungspfad', iron_island: 'Eiseninsel',
  battle_frontier: 'Kampfzone'
};
export const areaName = (area) => AREA_NAMES[area] || (/^route_(\d+)/.test(area) ? `Route ${area.match(/^route_(\d+)/)[1]}` : area);
