// Sinnoh Mitte: Herzhofen, Route 209, Trostu, Route 210, Route 215, Schleiede, Route 214,
// Seeufer der Kühnheit, Route 213, Weideburg und Route 212.
import { build, house, grid, centerRoom, martRoom, houseRoom, gymRoom, GYM_PALETTES } from './mapkit.js';
import { MAPS4, LINKS4 } from './maps4.js';

const enc = (rate, list) => ({ grassRate: rate, grass: list.map(([species, min, max, weight]) => ({ species, min, max, weight })) });
const slots = (list) => list.map(([species, min, max, weight]) => ({ species, min, max, weight }));

export const MAPS3 = {
  // ------------------------------------------------------------------ Herzhofen
  hearthome_city: {
    name: 'Herzhofen', width: 34, height: 26, music: 'jubilife', fly: [5, 8],
    tiles: build(34, 26, [
      ['rect', 1, 1, 32, 24, ','],
      ['rect', 13, 8, 8, 4, '*'], ['rect', 1, 23, 12, 2, '*'], ['rect', 20, 22, 12, 2, '*'],
      ['rect', 0, 13, 34, 2, '.'], ['rect', 15, 2, 3, 24, '.'],
      ...house(3, 3, 6, 4, 5, 'C'), ...house(10, 3, 4, 3, 11), ...house(22, 3, 9, 5, 26),
      ...house(3, 17, 7, 5, 6), ...house(22, 17, 5, 3, 24), ...house(28, 17, 4, 3, 29),
      ['tile', 14, 12, 'S']
    ]),
    buildings: [{ x: 3, y: 3, style: 'center' }, { x: 10, y: 3, style: 'mart' }, { x: 22, y: 3, style: 'contest' }, { x: 3, y: 17, style: 'gym' }, { x: 22, y: 17, style: 'house2' }, { x: 28, y: 17, style: 'house5' }],
    events: [
      { x: 14, y: 12, type: 'text', text: 'Herzhofen: Die Stadt, in der sich Herzen begegnen. Osten: Route 209  Süden: Route 212' },
      { x: 26, y: 7, type: 'text', text: 'Wettbewerbshalle. Heute findet keine Vorführung statt.' },
      { x: 29, y: 19, type: 'text', text: 'Hier wohnt niemand. Die Tür ist abgeschlossen.' }
    ],
    encounters: null
  },
  route_209: {
    name: 'Route 209', width: 30, height: 14,
    tiles: build(30, 14, [
      ['rect', 0, 1, 30, 12, ','],
      ['rect', 3, 1, 8, 4, '"'], ['rect', 14, 9, 10, 4, '"'], ['rect', 22, 1, 6, 4, '"'], ['rect', 12, 2, 3, 3, '~'],
      ['rect', 0, 6, 30, 2, '.'],
      ['tile', 5, 5, 'S']
    ]),
    events: [{ x: 5, y: 5, type: 'text', text: 'Route 209  Osten: Trostu' }],
    encounters: { ...enc(30, [[400, 24, 26, 20], [397, 24, 26, 20], [315, 24, 26, 15], [438, 24, 26, 15], [92, 24, 26, 10], [355, 24, 26, 15], [113, 25, 26, 5]]), waterRate: 10, water: slots([[54, 25, 30, 60], [129, 20, 30, 40]]) }
  },
  // ------------------------------------------------------------------ Trostu
  solaceon_town: {
    name: 'Trostu', width: 26, height: 22, music: 'sandgem', fly: [5, 8],
    tiles: build(26, 22, [
      ['rect', 1, 1, 24, 20, ','],
      ['rect', 20, 15, 4, 4, '*'], ['rect', 1, 19, 8, 2, '*'],
      ['rect', 0, 10, 21, 2, '.'], ['rect', 11, 0, 3, 12, '.'],
      ...house(3, 3, 5, 4, 5, 'C'), ...house(16, 3, 4, 3, 17), ...house(3, 14, 5, 3, 5), ...house(16, 14, 5, 3, 18),
      ['rect', 20, 4, 4, 3, 'X'], ['tile', 21, 6, 'G'],
      ['tile', 10, 9, 'S']
    ]),
    buildings: [{ x: 3, y: 3, style: 'center' }, { x: 16, y: 3, style: 'mart' }, { x: 3, y: 14, style: 'house3' }, { x: 16, y: 14, style: 'house' }],
    events: [{ x: 10, y: 9, type: 'text', text: 'Trostu: Ein ruhiges Dorf, in dem die Zeit langsamer vergeht. Norden: Route 210' }],
    encounters: null
  },
  route_210: {
    name: 'Route 210', width: 16, height: 46,
    tiles: build(16, 46, [
      ['rect', 1, 0, 14, 46, ','],
      ['rect', 1, 26, 5, 8, '"'], ['rect', 10, 34, 5, 8, '"'], ['rect', 1, 4, 5, 10, '"'], ['rect', 10, 8, 5, 10, '"'],
      ['rect', 6, 0, 3, 46, '.'], ['rect', 8, 30, 8, 2, '.'],
      ['rect', 1, 22, 14, 2, '#'], ['rect', 6, 22, 3, 2, '.'],
      ['tile', 9, 44, 'S'], ['tile', 9, 20, 'S']
    ]),
    events: [
      { x: 9, y: 44, type: 'text', text: 'Route 210  Osten: Route 215 nach Schleiede  Norden: Elyses' },
      { x: 9, y: 20, type: 'text', text: 'Route 210 Nord. Dichter Nebel liegt über dem Weg nach Elyses.' }
    ],
    encounters: enc(30, [[397, 26, 29, 20], [400, 26, 29, 15], [77, 26, 28, 15], [438, 26, 28, 10], [315, 26, 28, 15], [193, 27, 29, 10], [54, 26, 28, 10], [113, 27, 28, 5]])
  },
  route_215: {
    name: 'Route 215', width: 40, height: 14,
    tiles: build(40, 14, [
      ['rect', 0, 1, 40, 12, ','],
      ['rect', 3, 1, 10, 4, '"'], ['rect', 16, 9, 12, 4, '"'], ['rect', 30, 1, 8, 4, '"'],
      ['rect', 0, 6, 40, 2, '.'],
      ['tile', 36, 5, 'S']
    ]),
    events: [{ x: 36, y: 5, type: 'text', text: 'Route 215. Hier regnet es fast immer. Osten: Schleiede' }],
    encounters: enc(30, [[77, 26, 28, 20], [78, 28, 30, 5], [63, 26, 28, 15], [108, 26, 28, 10], [66, 26, 28, 20], [67, 28, 29, 10], [203, 27, 29, 20]])
  },
  // ------------------------------------------------------------------ Schleiede
  veilstone_city: {
    name: 'Schleiede', width: 36, height: 28, music: 'oreburgh', fly: [4, 8],
    tiles: build(36, 28, [
      ['rect', 1, 1, 34, 26, ','],
      ['rect', 0, 12, 35, 2, '.'], ['rect', 17, 2, 3, 26, '.'],
      ['rect', 12, 9, 2, 2, 'X'], ['rect', 24, 9, 2, 2, 'X'],
      ...house(2, 3, 5, 4, 4, 'C'), ...house(8, 3, 7, 5, 11), ...house(22, 3, 8, 5, 26),
      ...house(2, 17, 10, 6, 7), ...house(22, 17, 8, 4, 25), ...house(31, 17, 4, 3, 32),
      ['tile', 16, 11, 'S']
    ]),
    buildings: [{ x: 2, y: 3, style: 'center' }, { x: 8, y: 3, style: 'store' }, { x: 22, y: 3, style: 'gym' }, { x: 2, y: 17, style: 'galactic' }, { x: 22, y: 17, style: 'mine' }, { x: 31, y: 17, style: 'house4' }],
    events: [
      { x: 16, y: 11, type: 'text', text: 'Schleiede: Die Stadt, die aus dem Fels gemeißelt wurde. Süden: Route 214' },
      { x: 12, y: 10, type: 'text', text: 'Ein Meteorit. Er soll vor langer Zeit vom Himmel gefallen sein.' },
      { x: 24, y: 10, type: 'text', text: 'Ein Meteorit. Er fühlt sich seltsam warm an.' }
    ],
    encounters: null
  },
  route_214: {
    name: 'Route 214', width: 16, height: 63,
    tiles: build(16, 63, [
      ['rect', 1, 0, 14, 63, ','],
      ['rect', 1, 3, 5, 8, '"'], ['rect', 10, 12, 5, 8, '"'], ['rect', 1, 24, 5, 8, '"'], ['rect', 10, 26, 3, 3, 'X'],
      ['rect', 10, 36, 5, 9, '"'], ['rect', 1, 40, 4, 3, 'X'], ['tile', 2, 42, 'G'], ['rect', 1, 47, 5, 9, '"'], ['rect', 11, 50, 3, 3, 'X'], ['rect', 10, 56, 5, 5, '"'],
      ['rect', 6, 0, 3, 63, '.'], ['rect', 0, 18, 7, 2, '.'],
      ['tile', 9, 2, 'S'], ['tile', 5, 17, 'S'], ['tile', 9, 58, 'S']
    ]),
    events: [
      { x: 9, y: 2, type: 'text', text: 'Route 214  Süden: Seeufer der Kühnheit' },
      { x: 5, y: 17, type: 'text', text: 'Westen: See der Kühnheit' },
      { x: 9, y: 58, type: 'text', text: 'Route 214  Norden: Schleiede' }
    ],
    encounters: enc(30, [[185, 30, 32, 10], [41, 29, 31, 10], [42, 31, 32, 10], [228, 29, 31, 15], [111, 29, 31, 15], [434, 29, 31, 15], [74, 29, 31, 10], [75, 31, 32, 15]])
  },
  valor_lakefront: {
    name: 'Seeufer der Kühnheit', width: 30, height: 18, music: 'lake',
    tiles: build(30, 18, [
      ['rect', 1, 1, 28, 16, ','],
      ['rect', 1, 1, 8, 6, '~'], ['rect', 20, 12, 8, 4, '"'], ['rect', 1, 15, 8, 2, '*'],
      ['rect', 13, 0, 3, 10, '.'], ['rect', 0, 8, 30, 2, '.'],
      ...house(19, 2, 5, 3, 21, 'C'), ...house(3, 12, 5, 3, 5),
      ['tile', 12, 7, 'S']
    ]),
    buildings: [{ x: 19, y: 2, style: 'center' }, { x: 3, y: 12, style: 'house5' }],
    events: [{ x: 12, y: 7, type: 'text', text: 'Seeufer der Kühnheit  Westen: Route 213 nach Weideburg  Osten: Route 222 nach Sonnewik' }],
    encounters: { ...enc(30, [[397, 30, 32, 25], [400, 30, 32, 20], [203, 30, 32, 20], [183, 30, 32, 20], [108, 30, 32, 15]]), waterRate: 10, water: slots([[54, 30, 35, 50], [55, 32, 36, 20], [130, 30, 34, 30]]) }
  },
  route_213: {
    name: 'Route 213', width: 95, height: 16,
    tiles: build(95, 16, [
      ['rect', 0, 1, 95, 10, ','],
      ['rect', 4, 2, 8, 4, '"'], ['rect', 20, 2, 10, 4, '"'], ['rect', 40, 2, 9, 4, '"'], ['rect', 62, 2, 7, 4, '"'], ['rect', 80, 2, 9, 4, '"'],
      ['rect', 52, 2, 5, 2, 'X'],
      ['rect', 0, 10, 95, 3, '='], ['rect', 0, 13, 95, 3, '~'],
      ['rect', 0, 8, 95, 2, '.'],
      ...house(71, 3, 5, 3, 73),
      ['tile', 30, 7, 'S'], ['tile', 88, 7, 'S']
    ]),
    buildings: [{ x: 71, y: 3, style: 'house5' }],
    events: [
      { x: 30, y: 7, type: 'text', text: 'Route 213  Westen: Weideburg. Am Strand weht immer eine frische Brise.' },
      { x: 88, y: 7, type: 'text', text: 'Route 213  Osten: Seeufer der Kühnheit' }
    ],
    encounters: { ...enc(30, [[183, 30, 32, 20], [278, 30, 32, 25], [422, 30, 32, 20], [451, 30, 32, 15], [453, 30, 32, 20]]), waterRate: 10, water: slots([[72, 30, 35, 40], [73, 32, 36, 15], [278, 30, 34, 25], [279, 32, 36, 20]]) }
  },
  route_213_house: houseRoom('Strandhaus', 2),
  // ------------------------------------------------------------------ Weideburg
  pastoria_city: {
    name: 'Weideburg', width: 34, height: 26, music: 'sandgem', fly: [5, 8],
    tiles: build(34, 26, [
      ['rect', 1, 1, 32, 24, ','],
      ['rect', 27, 17, 5, 3, '*'], ['rect', 1, 10, 3, 2, '*'],
      ['rect', 1, 8, 33, 2, '.'], ['rect', 15, 0, 3, 21, '.'],
      ['rect', 1, 21, 32, 3, '~'],
      ...house(3, 3, 5, 4, 5, 'C'), ...house(9, 3, 4, 3, 10), ...house(21, 2, 9, 5, 25), ...house(3, 13, 9, 5, 7), ...house(21, 13, 5, 3, 23),
      ['tile', 14, 7, 'S']
    ]),
    buildings: [{ x: 3, y: 3, style: 'center' }, { x: 9, y: 3, style: 'mart' }, { x: 21, y: 2, style: 'gym' }, { x: 3, y: 13, style: 'gate' }, { x: 21, y: 13, style: 'house3' }],
    events: [
      { x: 14, y: 7, type: 'text', text: 'Weideburg: Die Stadt am Rand des großen Moores. Norden: Route 212 nach Herzhofen' },
      { x: 7, y: 17, type: 'text', text: 'Großmoor-Safari. Wegen Hochwasser vorübergehend geschlossen.' }
    ],
    encounters: { waterRate: 10, water: slots([[194, 30, 34, 50], [195, 32, 36, 20], [129, 25, 34, 30]]) }
  },
  route_212: {
    name: 'Route 212', width: 18, height: 40,
    tiles: build(18, 40, [
      ['rect', 1, 0, 16, 40, ','],
      ['rect', 1, 3, 6, 8, '"'], ['rect', 11, 12, 6, 10, '"'], ['rect', 1, 24, 6, 10, '"'], ['rect', 11, 28, 5, 5, '~'],
      ['rect', 7, 0, 3, 40, '.'],
      ['rect', 1, 6, 16, 1, '#'], ['rect', 7, 6, 3, 1, 'Z'],
      ['tile', 10, 2, 'S']
    ]),
    events: [{ x: 10, y: 2, type: 'text', text: 'Route 212  Süden: Weideburg. Achtung, der Weg ist oft verregnet und sumpfig.' }],
    encounters: { ...enc(30, [[194, 28, 30, 20], [195, 30, 32, 10], [453, 28, 30, 15], [183, 28, 30, 15], [315, 28, 30, 15], [402, 28, 30, 10], [400, 28, 30, 15]]), waterRate: 10, water: slots([[194, 28, 32, 60], [195, 30, 34, 40]]) }
  },

  // ------------------------------------------------------------------ Innenraeume
  hearthome_center: centerRoom(),
  hearthome_mart: martRoom(),
  hearthome_gym: gymRoom('Arena Herzhofen', 1, GYM_PALETTES.ghost),
  hearthome_house: houseRoom('Herzhofen', 0),
  solaceon_center: centerRoom(),
  solaceon_mart: martRoom(),
  solaceon_daycare: houseRoom('Pension', 1, [{ x: 3, y: 2, type: 'text', text: 'Ein Foto von vielen glücklichen Pokémon, die hier schon gewohnt haben.' }]),
  solaceon_house: houseRoom('Trostu', 2),
  veilstone_center: centerRoom(),
  veilstone_store: (() => { const r = martRoom(); return { ...r, name: 'Kaufhaus Schleiede', events: r.events.map((e) => (e.type === 'shop' ? { ...e, stock: 'store' } : e)) }; })(),
  veilstone_gym: gymRoom('Arena Schleiede', 2, GYM_PALETTES.fight),
  veilstone_house: houseRoom('Schleiede', 1),
  galactic_warehouse: {
    name: 'Galaktik-Lagerhaus', indoor: true, theme: 'lab', entry: { x: 7, y: 9 }, palette: GYM_PALETTES.galactic,
    ...grid(['WWWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWWW', 'BBB__BBBBBB__BBB', '________________', '_BBB___BB___BBB_', '________________',
      'BB____BBBB____BB', '________________', '________________', '_______E________']),
    events: [{ x: 6, y: 2, type: 'text', text: 'Kisten voller Pokébälle. Auf jeder steht ein anderer Name. Gestohlen?' }]
  },
  lakefront_center: centerRoom(),
  lakefront_house: houseRoom('Restaurant am See', 1, [{ x: 0, y: 2, type: 'text', text: 'Eine Speisekarte: „Heute: Beerenkuchen à la See.“' }]),
  pastoria_center: centerRoom(),
  pastoria_mart: martRoom(),
  pastoria_gym: gymRoom('Arena Weideburg', 0, GYM_PALETTES.water),
  pastoria_house: houseRoom('Weideburg', 2)
};

export const LINKS3 = [
  ['conn', 'route_208', 'east', 'hearthome_city', 8],
  ['conn', 'hearthome_city', 'east', 'route_209', -7],
  ['conn', 'hearthome_city', 'south', 'route_212', -8],
  ['conn', 'route_209', 'east', 'solaceon_town', 4],
  ['conn', 'solaceon_town', 'north', 'route_210', -5],
  ['conn', 'route_210', 'east', 'route_215', -24],
  ['conn', 'route_215', 'east', 'veilstone_city', 6],
  ['conn', 'veilstone_city', 'south', 'route_214', -11],
  ['conn', 'route_214', 'south', 'valor_lakefront', 7],
  ['conn', 'valor_lakefront', 'west', 'route_213', 0],
  ['conn', 'route_213', 'west', 'pastoria_city', 0],
  ['conn', 'route_212', 'south', 'pastoria_city', 8],
  ['door', 'hearthome_city', 5, 6, 'hearthome_center'],
  ['door', 'hearthome_city', 11, 5, 'hearthome_mart'],
  ['door', 'hearthome_city', 6, 21, 'hearthome_gym'],
  ['door', 'hearthome_city', 24, 19, 'hearthome_house'],
  ['door', 'solaceon_town', 5, 6, 'solaceon_center'],
  ['door', 'solaceon_town', 17, 5, 'solaceon_mart'],
  ['door', 'solaceon_town', 5, 16, 'solaceon_daycare'],
  ['door', 'solaceon_town', 18, 16, 'solaceon_house'],
  ['door', 'veilstone_city', 4, 6, 'veilstone_center'],
  ['door', 'veilstone_city', 11, 7, 'veilstone_store'],
  ['door', 'veilstone_city', 26, 7, 'veilstone_gym'],
  ['door', 'veilstone_city', 25, 20, 'galactic_warehouse'],
  ['door', 'veilstone_city', 32, 19, 'veilstone_house'],
  ['door', 'valor_lakefront', 21, 4, 'lakefront_center'],
  ['door', 'valor_lakefront', 5, 14, 'lakefront_house'],
  ['door', 'route_213', 73, 5, 'route_213_house'],
  ['door', 'pastoria_city', 5, 6, 'pastoria_center'],
  ['door', 'pastoria_city', 10, 5, 'pastoria_mart'],
  ['door', 'pastoria_city', 25, 6, 'pastoria_gym'],
  ['door', 'pastoria_city', 23, 15, 'pastoria_house']
];

Object.assign(MAPS3, MAPS4);
LINKS3.push(...LINKS4);
