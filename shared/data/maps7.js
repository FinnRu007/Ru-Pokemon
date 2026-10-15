// Nach der Liga wie in Platin: der Seeweg von Blizzach zur Kampfzone mit Kampfareal und Kampfturm,
// Route 225, Überlebensareal, Route 227 und der Kahlberg mit Heatran. Dazu der Tempel von Blizzach
// (Regigigas), die Vollmondinsel (Cresselia) und die Höhle der Umkehr (Giratina).
import { build, house, grid, centerRoom, martRoom, houseRoom, GYM_PALETTES } from './mapkit.js';

const enc = (rate, list) => ({ grassRate: rate, grass: list.map(([species, min, max, weight]) => ({ species, min, max, weight })) });
const slots = (list) => list.map(([species, min, max, weight]) => ({ species, min, max, weight }));
const TOWER = { floor: '#d8d4e8', speck: '#b8b4d0', wall: '#4a4a7a', wallStripe: '#3e3e6a', base: '#2a2a4a', top: '#1e1e38', rock: '#8a8ab8' };
const SEA = slots([[73, 45, 50, 40], [279, 45, 50, 25], [226, 46, 50, 15], [130, 46, 50, 20]]);

export const MAPS7 = {
  // ------------------------------------------------------------------ Seeweg zur Kampfzone
  north_sea: {
    name: 'Nordmeer', width: 60, height: 20,
    tiles: build(60, 20, [
      ['rect', 0, 0, 60, 20, '~'],
      ['rect', 12, 12, 5, 8, 'b'],
      ['rect', 28, 4, 3, 2, 'X'], ['rect', 44, 13, 2, 2, 'X'], ['rect', 20, 2, 2, 2, 'X']
    ]),
    events: [],
    encounters: { waterRate: 10, water: SEA }
  },
  // ------------------------------------------------------------------ Kampfareal
  fight_area: {
    name: 'Kampfareal', width: 30, height: 26, music: 'jubilife', fly: [15, 18],
    tiles: build(30, 26, [
      ['rect', 3, 1, 26, 24, ','],
      ['rect', 0, 8, 3, 16, '~'], ['rect', 3, 10, 3, 6, 'b'],
      ['rect', 3, 16, 26, 2, '.'], ['rect', 14, 0, 3, 16, '.'],
      ['rect', 4, 20, 8, 3, '*'], ['rect', 24, 21, 4, 3, '*'],
      ...house(4, 2, 5, 4, 6, 'C'), ...house(9, 3, 4, 3, 10), ...house(19, 1, 9, 7, 23),
      ...house(18, 19, 5, 3, 20),
      ['tile', 13, 15, 'S']
    ]),
    buildings: [{ x: 4, y: 2, style: 'center' }, { x: 9, y: 3, style: 'mart' }, { x: 19, y: 1, style: 'lighthouse' }, { x: 18, y: 19, style: 'house2' }],
    events: [{ x: 13, y: 15, type: 'text', text: 'Kampfareal: Hier treffen sich die stärksten Trainer Sinnohs. Norden: Route 225 zum Überlebensareal' }],
    encounters: { waterRate: 10, water: SEA }
  },
  fight_center: centerRoom(),
  fight_mart: martRoom(),
  fight_house: houseRoom('Kampfareal', 1),
  battle_tower: {
    name: 'Kampfturm', indoor: true, theme: 'gym', palette: TOWER, entry: { x: 6, y: 13 },
    ...grid(['WWWWWWWWWWWWW', 'WWWWWWWWWWWWW', 'Y___________Y', '_____________', '__PP_____PP__', '_____________', '_____________',
      '_____________', '__TT_____TT__', '_____________', '_____________', '_____________', '_____________', '______E______']),
    events: []
  },
  // ------------------------------------------------------------------ Route 225 und Überlebensareal
  route_225: {
    name: 'Route 225', width: 16, height: 40,
    tiles: build(16, 40, [
      ['rect', 1, 0, 14, 40, ','],
      ['rect', 1, 4, 4, 10, '"'], ['rect', 10, 8, 5, 10, '"'], ['rect', 1, 22, 4, 8, '"'], ['rect', 10, 26, 5, 8, '"'],
      ['rect', 10, 2, 4, 3, 'X'], ['rect', 1, 33, 3, 3, 'X'],
      ['rect', 6, 0, 3, 40, '.'],
      ['tile', 9, 37, 'S']
    ]),
    events: [{ x: 9, y: 37, type: 'text', text: 'Route 225  Norden: Überlebensareal  Süden: Kampfareal' }],
    encounters: enc(30, [[217, 50, 53, 20], [75, 50, 53, 20], [20, 50, 52, 15], [22, 50, 52, 15], [214, 51, 53, 10], [227, 51, 53, 10], [232, 50, 52, 10]])
  },
  survival_area: {
    name: 'Überlebensareal', width: 26, height: 20, music: 'sandgem', fly: [12, 10],
    tiles: build(26, 20, [
      ['rect', 1, 1, 24, 18, ','],
      ['rect', 11, 8, 3, 12, '.'], ['rect', 1, 8, 25, 2, '.'],
      ...house(3, 2, 5, 4, 5, 'C'), ...house(9, 2, 4, 3, 10), ...house(18, 12, 5, 3, 20),
      ['rect', 2, 13, 6, 4, '*'],
      ['tile', 10, 7, 'S']
    ]),
    buildings: [{ x: 3, y: 2, style: 'center' }, { x: 9, y: 2, style: 'mart' }, { x: 18, y: 12, style: 'house5' }],
    events: [{ x: 10, y: 7, type: 'text', text: 'Überlebensareal: Für Trainer, die immer weiter wollen. Osten: Route 227 zum Kahlberg' }],
    encounters: null
  },
  survival_center: centerRoom(),
  survival_mart: martRoom(),
  survival_house: houseRoom('Überlebensareal', 2),
  // ------------------------------------------------------------------ Route 227 und Kahlberg
  route_227: {
    name: 'Route 227', width: 30, height: 16, tint: 'dusk',
    tiles: build(30, 16, [
      ['rect', 0, 1, 26, 14, '='],
      ['rect', 2, 2, 6, 3, '"'], ['rect', 14, 10, 8, 3, '"'], ['rect', 16, 2, 6, 2, '"'],
      ['rect', 9, 3, 3, 2, 'X'], ['rect', 4, 11, 3, 2, 'X'],
      ['rect', 0, 6, 26, 2, '.'],
      ['rect', 26, 1, 4, 14, 'X'], ['tile', 26, 7, 'G'],
      ['tile', 12, 5, 'S']
    ]),
    events: [{ x: 12, y: 5, type: 'text', text: 'Route 227. Asche liegt in der Luft. Osten: Kahlberg' }],
    encounters: enc(30, [[227, 52, 55, 20], [323, 52, 55, 20], [328, 52, 54, 15], [329, 53, 55, 10], [75, 52, 54, 20], [332, 53, 55, 15]])
  },
  stark_mountain: {
    name: 'Kahlberg', indoor: true, theme: 'cave', music: 'cave',
    ...grid([
      'XXXXXXXXXXXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXGXXXXXXXXXXX',
      'XXXXXXXXXXX:::XXXXXXXXXX',
      'XXXXXXXX:::::::::XXXXXXX',
      'XXXXXX::::::O::::::XXXXX',
      'XXXXX::::::::::::::::XXX',
      'XXXX::::XXXXXXXX::::::XX',
      'XXX::::XXXXXXXXXXX:::::X',
      'XX:::::XXXXXXXXXXX:::::X',
      'G::::::::::::O::::::::XX',
      'XX::::::::::::::::::XXXX',
      'XXX:::XXXXXXXXXX::::XXXX',
      'XXXX::XXXXXXXXXX:::XXXXX',
      'XXXX:::::::::::::::XXXXX',
      'XXXXX:::::::O:::::XXXXXX',
      'XXXXXXX:::::::::XXXXXXXX',
      'XXXXXXXXX::::XXXXXXXXXXX',
      'XXXXXXXXXXXXXXXXXXXXXXXX'
    ]),
    events: [],
    encounters: { caveRate: 10, cave: slots([[75, 52, 55, 25], [42, 52, 55, 20], [219, 52, 55, 20], [126, 53, 56, 15], [112, 53, 56, 10], [324, 52, 55, 10]]) }
  },
  stark_mountain_deep: {
    name: 'Kahlberg Inneres', indoor: true, theme: 'cave', music: 'cave',
    ...grid(['XXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXX', 'XXXXX:::::XXXXX', 'XXX:::::::::XXX', 'XX:::::::::::XX', 'XX:::::::::::XX',
      'XX:::::::::::XX', 'XXX:::::::::XXX', 'XXXX:::::::XXXX', 'XXXXX:::::XXXXX', 'XXXXXX:::XXXXXX', 'XXXXXXXGXXXXXXX']),
    events: [{ x: 7, y: 1, type: 'text', text: 'Die Wand ist heiß. Tief im Berg brodelt Magma.' }]
  },
  // ------------------------------------------------------------------ Tempel, Vollmondinsel, Höhle der Umkehr
  snowpoint_temple: {
    name: 'Tempel von Blizzach', indoor: true, theme: 'gym', palette: GYM_PALETTES.ice, music: 'cave', entry: { x: 7, y: 13 },
    ...grid(['WWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWW', 'XX___________XX', 'XX_X_______X_XX', 'XX___________XX', 'XX_X_______X_XX', 'XX___________XX',
      'XX_X_______X_XX', 'XX___________XX', 'XX_X_______X_XX', 'XX___________XX', 'XX___________XX', 'XX___________XX', 'XXXXXXXEXXXXXXX']),
    events: [{ x: 7, y: 1, type: 'text', text: 'Eine uralte Inschrift: „Es zog die Kontinente an Seilen hinter sich her. Dann schlief es hier ein.“' }]
  },
  fullmoon_island: {
    name: 'Vollmondinsel', indoor: true, theme: 'gym', palette: GYM_PALETTES.forest, music: 'lake',
    ...grid(['YYYYYYYYYYYYYYYY', 'YYYYYYYYYYYYYYYY', 'YYYYY::::::YYYYY', 'YYY::::::::::YYY', 'YY::::::::::::YY', 'YY::::::::::::YY', 'YYY::::::::::YYY',
      'YYYYY::::::YYYYY', 'YYYYYY::::YYYYYY', 'YYYYYY::::YYYYYY', 'YYYYYY::::YYYYYY', 'YYYYYYY::YYYYYYY', 'YYYYYYY::YYYYYYY', 'YYYYYYYUYYYYYYYY']),
    events: []
  },
  turnback_cave: {
    name: 'Höhle der Umkehr', indoor: true, theme: 'cave', tint: 'distortion', music: 'cave',
    ...grid(['XXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXX', 'XXXXX::::::XXXXX', 'XXX::::::::::XXX', 'XX:::O::::O:::XX', 'XX::::::::::::XX',
      'XXX::::::::::XXX', 'XXXX::::::::XXXX', 'XXXXX::::::XXXXX', 'XXXXXX::::XXXXXX', 'XXXXXXX::XXXXXXX', 'XXXXXXXGXXXXXXXX']),
    events: [{ x: 7, y: 1, type: 'text', text: 'Hier scheinen oben und unten für einen Moment die Plätze zu tauschen.' }]
  }
};

export const LINKS7 = [
  ['conn', 'snowpoint_city', 'north', 'north_sea', 0],
  ['conn', 'north_sea', 'east', 'fight_area', 10],
  ['conn', 'fight_area', 'north', 'route_225', -8],
  ['conn', 'route_225', 'north', 'survival_area', 5],
  ['conn', 'survival_area', 'east', 'route_227', -2],
  ['door', 'fight_area', 6, 5, 'fight_center'],
  ['door', 'fight_area', 10, 5, 'fight_mart'],
  ['door', 'fight_area', 23, 7, 'battle_tower'],
  ['door', 'fight_area', 20, 21, 'fight_house'],
  ['door', 'survival_area', 5, 5, 'survival_center'],
  ['door', 'survival_area', 10, 4, 'survival_mart'],
  ['door', 'survival_area', 20, 14, 'survival_house'],
  ['pass', 'route_227', 26, 7, 'stark_mountain', 1, 9, 'right'],
  ['pass', 'stark_mountain', 0, 9, 'route_227', 25, 7, 'left'],
  ['pass', 'stark_mountain', 12, 1, 'stark_mountain_deep', 7, 10, 'up'],
  ['pass', 'stark_mountain_deep', 7, 11, 'stark_mountain', 12, 2, 'down'],
  ['door', 'snowpoint_city', 21, 16, 'snowpoint_temple'],
  ['pass', 'canalave_dock', 7, 1, 'fullmoon_island', 7, 12, 'up'],
  ['pass', 'fullmoon_island', 7, 13, 'canalave_dock', 7, 2, 'down'],
  ['pass', 'route_214', 2, 42, 'turnback_cave', 7, 10, 'up'],
  ['pass', 'turnback_cave', 7, 11, 'route_214', 2, 43, 'down']
];
