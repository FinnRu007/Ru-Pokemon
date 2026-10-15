// Kampfzone wie in Platin: Route 226 zwischen Überlebensareal und Route 227, die Wüste auf Route 228
// mit den Felsgipfelruinen (Regirock), Route 229, das Erholungsgebiet und der Seeweg Route 230 zurück
// zum Kampfareal. Dazu die Eisbergruinen an Route 217 (Regice) und die Eisenruinen auf der Eiseninsel
// (Registeel).
import { build, house, grid, centerRoom, houseRoom, GYM_PALETTES } from './mapkit.js';

const enc = (rate, list) => ({ grassRate: rate, grass: list.map(([species, min, max, weight]) => ({ species, min, max, weight })) });
const slots = (list) => list.map(([species, min, max, weight]) => ({ species, min, max, weight }));
const SEA = slots([[72, 46, 50, 30], [73, 48, 52, 30], [279, 48, 52, 20], [226, 48, 52, 10], [278, 46, 48, 10]]);
const RUIN = { floor: '#d8d0c0', speck: '#b8b0a0', wall: '#8a8478', wallStripe: '#7a7468', base: '#4a463e', top: '#3a362e', rock: '#9a9488' };

// Ruine eines Titanen: ein Raum, in der Mitte schläft das Pokémon
const ruin = (name, palette, text) => ({
  name, indoor: true, theme: 'gym', palette, music: 'cave',
  ...grid(['XXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXX', 'XXX:::::::::XXX', 'XX:X:::::::X:XX', 'XX:::::::::::XX', 'XX:X:::::::X:XX',
    'XX:::::::::::XX', 'XX:X:::::::X:XX', 'XXX:::::::::XXX', 'XXXXXX:::XXXXXX', 'XXXXXXXGXXXXXXX']),
  events: [{ x: 7, y: 1, type: 'text', text }]
});

export const MAPS8 = {
  route_226: {
    name: 'Route 226', width: 30, height: 16,
    tiles: build(30, 16, [
      ['rect', 0, 1, 30, 14, ','],
      ['rect', 2, 2, 6, 3, '"'], ['rect', 2, 10, 6, 4, '"'], ['rect', 24, 1, 5, 4, '"'],
      ['rect', 10, 0, 10, 16, '~'], ['rect', 12, 3, 2, 2, 'X'], ['rect', 16, 11, 2, 2, 'X'],
      ['rect', 0, 6, 10, 2, '.'], ['rect', 20, 6, 10, 2, '.'],
      ['rect', 21, 8, 3, 8, '.'],
      ['rect', 25, 10, 4, 4, 'X'], ['rect', 25, 9, 4, 1, 'N'],
      ['tile', 8, 5, 'S']
    ]),
    events: [{ x: 8, y: 5, type: 'text', text: 'Route 226. Westen: Überlebensareal  Osten: Route 227  Süden: Route 228' }],
    encounters: { ...enc(30, [[55, 53, 55, 20], [195, 52, 55, 20], [279, 52, 54, 15], [108, 52, 54, 15], [128, 53, 55, 15], [241, 53, 55, 15]]), waterRate: 10, water: SEA }
  },
  route_228: {
    name: 'Route 228', width: 20, height: 36, weather: 'sand',
    tiles: build(20, 36, [
      ['rect', 1, 0, 18, 36, '='],
      ['rect', 2, 2, 5, 6, '"'], ['rect', 10, 4, 4, 8, '"'], ['rect', 8, 22, 9, 5, '"'], ['rect', 1, 28, 2, 6, '"'],
      ['rect', 2, 9, 6, 4, 'X'], ['tile', 4, 12, 'G'],
      ['rect', 15, 0, 3, 20, '.'], ['rect', 3, 18, 15, 2, '.'], ['rect', 3, 18, 3, 18, '.'],
      ['rect', 12, 14, 2, 2, 'X'], ['rect', 14, 30, 3, 3, 'X'],
      ['tile', 14, 2, 'S']
    ]),
    events: [{ x: 14, y: 2, type: 'text', text: 'Route 228. Vorsicht, Sandsturm! Süden: Route 229 zum Erholungsgebiet' }],
    encounters: enc(30, [[331, 52, 55, 20], [332, 54, 56, 15], [450, 53, 56, 15], [28, 52, 55, 20], [112, 54, 56, 10], [328, 52, 54, 10], [449, 52, 54, 10]])
  },
  rock_peak_ruins: ruin('Felsgipfelruinen', RUIN, 'Eine alte Inschrift: „Wer die Titanen ruft, braucht den Champ-Titel. Dann erwacht der Stein.“'),
  route_229: {
    name: 'Route 229', width: 30, height: 14,
    tiles: build(30, 14, [
      ['rect', 1, 0, 29, 13, ','],
      ['rect', 6, 1, 8, 4, '"'], ['rect', 10, 9, 8, 3, '"'], ['rect', 24, 1, 5, 4, '"'],
      ['rect', 3, 0, 3, 8, '.'], ['rect', 3, 6, 27, 2, '.'], ['rect', 20, 6, 3, 8, '.'],
      ['rect', 1, 9, 6, 3, '*'], ['rect', 24, 9, 4, 3, 'Z'],
      ['tile', 7, 5, 'S']
    ]),
    events: [{ x: 7, y: 5, type: 'text', text: 'Route 229. Osten: Erholungsgebiet  Süden: Route 230 zum Kampfareal (Surfer)' }],
    encounters: enc(30, [[108, 52, 55, 15], [313, 52, 55, 15], [314, 52, 55, 15], [166, 52, 54, 15], [168, 52, 54, 15], [127, 53, 55, 10], [214, 53, 55, 15]])
  },
  resort_area: {
    name: 'Erholungsgebiet', width: 26, height: 20, music: 'sandgem', fly: [12, 12],
    tiles: build(26, 20, [
      ['rect', 0, 1, 25, 18, ','],
      ['rect', 0, 6, 25, 2, '.'], ['rect', 11, 6, 3, 12, '.'],
      ...house(2, 1, 5, 4, 4, 'C'), ...house(15, 1, 8, 5, 19), ...house(16, 12, 5, 3, 18),
      ['rect', 2, 11, 7, 6, '*'], ['rect', 21, 14, 3, 3, '~'],
      ['tile', 10, 5, 'S']
    ]),
    buildings: [{ x: 2, y: 1, style: 'center' }, { x: 15, y: 1, style: 'house3' }, { x: 16, y: 12, style: 'house2' }],
    events: [{ x: 10, y: 5, type: 'text', text: 'Erholungsgebiet: Ruhe und Erholung für fleißige Trainer. Die Villa wartet auf einen neuen Besitzer.' }],
    encounters: null
  },
  resort_center: centerRoom(),
  resort_villa: {
    name: 'Villa', indoor: true, theme: 'house', entry: { x: 6, y: 9 },
    ...grid(['WWWWWWWWWWWWW', 'WWWWWWWWWWWWW', 'Y__BB___V___Y', '_____________', '__TTT____RR__', '__TTT____RR__', '_____________', 'P___________Y', '_____________', '______E______']),
    events: [{ x: 8, y: 2, type: 'text', text: 'Ein großer Fernseher. Es läuft gerade eine Sendung über die Kampfzone.' }]
  },
  resort_house: houseRoom('Erholungsgebiet', 0),
  route_230: {
    name: 'Route 230', width: 35, height: 14,
    tiles: build(35, 14, [
      ['rect', 0, 0, 35, 14, '~'],
      ['rect', 0, 8, 3, 2, 'b'],
      ['rect', 9, 2, 3, 2, 'X'], ['rect', 18, 9, 2, 3, 'X'], ['rect', 28, 4, 2, 2, 'X'],
      ['rect', 14, 4, 4, 3, '='], ['tile', 15, 4, 'S']
    ]),
    events: [{ x: 15, y: 4, type: 'text', text: 'Route 230. Westen: Kampfareal  Norden: Route 229' }],
    encounters: { waterRate: 10, water: SEA }
  },
  iceberg_ruins: ruin('Eisbergruinen', GYM_PALETTES.ice, 'Eine alte Inschrift: „Im Eis schläft ein Titan, älter als jeder Gletscher.“'),
  iron_ruins: ruin('Eisenruinen', GYM_PALETTES.steel, 'Eine alte Inschrift: „Hart wie Eisen und doch lebendig. Der Titan wartet.“')
};

export const LINKS8 = [
  ['conn', 'survival_area', 'east', 'route_226', -2],
  ['conn', 'route_226', 'east', 'route_227', 0],
  ['conn', 'route_226', 'south', 'route_228', -6],
  ['conn', 'route_228', 'south', 'route_229', 0],
  ['conn', 'route_229', 'east', 'resort_area', 0],
  ['conn', 'route_229', 'south', 'route_230', 5],
  ['conn', 'fight_area', 'east', 'route_230', -8],
  ['pass', 'route_228', 4, 12, 'rock_peak_ruins', 7, 9, 'up'],
  ['pass', 'rock_peak_ruins', 7, 10, 'route_228', 4, 13, 'down'],
  ['door', 'resort_area', 4, 4, 'resort_center'],
  ['door', 'resort_area', 19, 5, 'resort_villa'],
  ['door', 'resort_area', 18, 14, 'resort_house'],
  ['pass', 'route_217', 5, 10, 'iceberg_ruins', 7, 9, 'up'],
  ['pass', 'iceberg_ruins', 7, 10, 'route_217', 5, 11, 'down'],
  ['pass', 'iron_island_deep', 5, 1, 'iron_ruins', 7, 9, 'up'],
  ['pass', 'iron_ruins', 7, 10, 'iron_island_deep', 5, 2, 'down']
];

// Änderungen an bestehenden Karten: [Karte, x, y, Kachel]
export const TILES8 = [
  ['fight_area', 29, 16, '.'], ['fight_area', 29, 17, '.'],
  ['route_217', 5, 10, 'G'],
  ['iron_island_deep', 5, 1, 'G']
];
// Ereignisse an bestehenden Karten, die ein Skript starten: [Karte, x, y, Skript]
export const EVENTS8 = [
  ['old_chateau', 4, 2, 'rotomTv'],
  ['mt_coronet', 17, 5, 'adamantOrb'],
  ['mt_coronet', 22, 7, 'lustrousOrb']
];
