// Sinnoh Nord und West: Elyses, Route 218, Fleetburg, See der Kühnheit, Routen 216 und 217,
// Blizzach, See der Willenskraft, Galaktik-Hauptquartier, Speersäule und Zerrwelt.
import { build, house, grid, centerRoom, martRoom, houseRoom, gymRoom, GYM_PALETTES } from './mapkit.js';

const enc = (rate, list) => ({ grassRate: rate, grass: list.map(([species, min, max, weight]) => ({ species, min, max, weight })) });
const slots = (list) => list.map(([species, min, max, weight]) => ({ species, min, max, weight }));
const RUIN = { floor: '#d8d0c0', speck: '#b8b0a0', wall: '#8a8478', wallStripe: '#7a7468', base: '#4a463e', top: '#3a362e', rock: '#9a9488' };

export const MAPS4 = {
  // ------------------------------------------------------------------ Elyses
  celestic_town: {
    name: 'Elyses', width: 24, height: 18, music: 'twinleaf', fly: [11, 10],
    tiles: build(24, 18, [
      ['rect', 1, 1, 22, 16, ','],
      ['rect', 1, 13, 6, 3, '*'], ['rect', 17, 13, 5, 3, '*'],
      ['rect', 3, 8, 18, 2, '.'], ['rect', 10, 5, 3, 13, '.'],
      ...house(3, 3, 5, 4, 5, 'C'), ...house(9, 1, 5, 4, 11), ...house(16, 3, 5, 3, 18),
      ['rect', 0, 0, 24, 1, 'X'],
      ['tile', 9, 11, 'S']
    ]),
    buildings: [{ x: 3, y: 3, style: 'center' }, { x: 9, y: 1, style: 'temple' }, { x: 16, y: 3, style: 'house4' }],
    events: [{ x: 9, y: 11, type: 'text', text: 'Elyses: Ein Dorf, in dem die alten Legenden noch lebendig sind.' }],
    encounters: null
  },
  celestic_ruins: {
    name: 'Elyses-Ruine', indoor: true, theme: 'gym', palette: RUIN, entry: { x: 4, y: 7 },
    ...grid(['WWWWWWWWWW', 'WWWWWWWWWW', 'X___VV___X', '__________', '_O______O_', '__________', '_O______O_', '____E_____']),
    events: [
      { x: 4, y: 2, type: 'text', text: 'Eine Wandmalerei: Drei Pokémon in einem Kreis. Eines herrscht über die Zeit, eines über den Raum. Das dritte steht im Schatten, verbannt in eine andere Welt.' },
      { x: 5, y: 2, type: 'text', text: 'Darunter steht: „Wer die Herzen der Seen verletzt, ruft das Unglück herbei.“' }
    ]
  },
  celestic_center: centerRoom(),
  celestic_house: houseRoom('Haus der Ältesten', 0),
  // ------------------------------------------------------------------ Route 218 und Fleetburg
  route_218: {
    name: 'Route 218', width: 40, height: 14,
    tiles: build(40, 14, [
      ['rect', 0, 1, 40, 12, ','],
      ['rect', 8, 1, 24, 12, '~'],
      ['rect', 0, 6, 8, 3, '.'], ['rect', 32, 6, 8, 3, '.'],
      ['tile', 34, 5, 'S']
    ]),
    events: [{ x: 34, y: 5, type: 'text', text: 'Route 218  Westen: Fleetburg. Hinüber kommt man nur schwimmend, mit Surfer.' }],
    encounters: { ...enc(30, [[72, 30, 33, 30], [278, 30, 33, 40], [423, 30, 33, 30]]), waterRate: 10, water: slots([[72, 32, 36, 40], [73, 34, 38, 20], [278, 32, 36, 20], [279, 34, 38, 10], [423, 32, 36, 10]]) }
  },
  canalave_city: {
    name: 'Fleetburg', width: 34, height: 26, music: 'jubilife', fly: [4, 8],
    tiles: build(34, 26, [
      ['rect', 1, 1, 32, 24, ','],
      ['rect', 15, 0, 3, 26, '~'], ['rect', 1, 23, 32, 2, '~'],
      ['rect', 1, 12, 33, 3, '.'], ['rect', 15, 12, 3, 3, 'b'],
      ...house(2, 3, 5, 4, 4, 'C'), ...house(8, 3, 5, 3, 10), ...house(20, 2, 9, 5, 24),
      ...house(2, 17, 9, 5, 6), ...house(20, 17, 5, 3, 22), ...house(27, 17, 5, 3, 29),
      ['tile', 14, 11, 'S']
    ]),
    buildings: [{ x: 2, y: 3, style: 'center' }, { x: 8, y: 3, style: 'mart' }, { x: 20, y: 2, style: 'library' }, { x: 2, y: 17, style: 'gym' }, { x: 20, y: 17, style: 'house2' }, { x: 27, y: 17, style: 'house' }],
    events: [
      { x: 14, y: 11, type: 'text', text: 'Fleetburg: Die Hafenstadt am Ende des Kanals.' },
      { x: 29, y: 19, type: 'text', text: 'Das Haus eines Seemanns. Er ist gerade auf See.' }
    ],
    encounters: { waterRate: 10, water: slots([[72, 34, 38, 50], [279, 36, 40, 25], [130, 34, 38, 25]]) }
  },
  canalave_center: centerRoom(),
  canalave_mart: martRoom(),
  canalave_gym: gymRoom('Arena Fleetburg', 2, GYM_PALETTES.steel),
  canalave_house: houseRoom('Fleetburg', 2),
  canalave_library: {
    name: 'Bibliothek Fleetburg', indoor: true, theme: 'school', entry: { x: 6, y: 9 },
    ...grid(['WWWWWWWWWWWWWW', 'WWWWWWWWWWWWWW', 'BBBBB____BBBBB', '______________', 'BBB__BBBB__BBB', '______________',
      '__TT______TT__', '__TT______TT__', '______________', '______E_______']),
    events: [
      { x: 0, y: 2, type: 'text', text: '„Die Entstehung Sinnohs“: Am Anfang war ein Ei. Daraus schlüpfte das Erste, das dann Zeit und Raum erschuf.' },
      { x: 10, y: 2, type: 'text', text: '„Die drei Seen“: In jedem See schläft ein Wesen. Eines schenkt Wissen, eines Gefühle, eines Willenskraft.' },
      { x: 5, y: 4, type: 'text', text: '„Die Zerrwelt“: Eine Welt hinter unserer Welt, in der oben und unten nichts bedeuten. Dort lebt ein verbanntes Pokémon.' }
    ]
  },
  // ------------------------------------------------------------------ See der Kuehnheit
  lake_valor: {
    name: 'See der Kühnheit', width: 28, height: 18, music: 'lake',
    tiles: build(28, 18, [
      ['rect', 1, 1, 26, 16, ','],
      ['rect', 3, 3, 14, 11, '='], ['rect', 5, 5, 10, 7, '~'], ['rect', 9, 7, 2, 3, '='],
      ['rect', 20, 2, 6, 4, '"'], ['rect', 20, 12, 6, 4, '"'],
      ['rect', 16, 8, 12, 2, '.'],
      ['tile', 19, 7, 'S']
    ]),
    events: [{ x: 19, y: 7, type: 'text', text: 'See der Kühnheit. Ein Großteil des Wassers ist verschwunden. Was ist hier nur passiert?' }],
    encounters: { ...enc(30, [[397, 36, 38, 25], [400, 36, 38, 20], [203, 36, 38, 20], [183, 36, 38, 20], [339, 36, 38, 15]]), waterRate: 10, water: slots([[54, 36, 40, 40], [55, 38, 42, 20], [130, 36, 40, 40]]) }
  },
  // ------------------------------------------------------------------ Routen 216 und 217
  route_216: {
    name: 'Route 216', width: 34, height: 14, tint: 'snow', music: 'route2',
    tiles: build(34, 14, [
      ['rect', 0, 1, 30, 12, ','],
      ['rect', 4, 1, 8, 4, '"'], ['rect', 14, 9, 10, 4, '"'], ['rect', 20, 2, 4, 3, 'X'],
      ['rect', 30, 1, 4, 12, 'X'], ['rect', 30, 6, 3, 2, '.'], ['tile', 33, 6, 'G'],
      ['rect', 0, 6, 30, 2, '.'],
      ['tile', 27, 5, 'S']
    ]),
    events: [{ x: 27, y: 5, type: 'text', text: 'Route 216. Schneegestöber! Westen: Route 217 nach Blizzach' }],
    encounters: enc(30, [[459, 34, 36, 30], [220, 34, 36, 25], [215, 34, 36, 20], [217, 35, 36, 10], [42, 34, 36, 15]])
  },
  route_217: {
    name: 'Route 217', width: 30, height: 30, tint: 'snow', music: 'route2',
    tiles: build(30, 30, [
      ['rect', 1, 1, 28, 28, ','],
      ['rect', 2, 2, 10, 7, '"'], ['rect', 18, 3, 10, 6, '"'], ['rect', 2, 14, 10, 10, '"'], ['rect', 18, 14, 10, 6, '"'],
      ['rect', 14, 0, 3, 24, '.'], ['rect', 14, 22, 16, 2, '.'],
      ['rect', 1, 10, 28, 1, 'X'], ['rect', 14, 10, 3, 1, 'N'],
      ...house(20, 25, 4, 3, 21),
      ['tile', 13, 21, 'S']
    ]),
    buildings: [{ x: 20, y: 25, style: 'house2' }],
    events: [{ x: 13, y: 21, type: 'text', text: 'Route 217. Norden: Blizzach. Weiter oben ist eine Felswand, über die man nur mit Kraxler kommt.' }],
    encounters: enc(30, [[459, 36, 38, 25], [220, 36, 38, 20], [215, 36, 38, 15], [361, 36, 38, 20], [221, 38, 39, 10], [460, 38, 39, 10]])
  },
  route_217_house: houseRoom('Hütte am Pass', 1),
  // ------------------------------------------------------------------ Blizzach
  snowpoint_city: {
    name: 'Blizzach', width: 30, height: 24, tint: 'snow', music: 'twinleaf', fly: [4, 7],
    tiles: build(30, 24, [
      ['rect', 1, 1, 28, 22, ','],
      ['rect', 13, 8, 3, 16, '.'], ['rect', 1, 8, 29, 2, '.'],
      ...house(2, 2, 5, 4, 4, 'C'), ...house(8, 2, 4, 3, 9), ...house(18, 1, 9, 5, 22),
      ...house(3, 13, 5, 3, 5), ...house(19, 13, 6, 4, 21),
      ['tile', 12, 7, 'S']
    ]),
    buildings: [{ x: 2, y: 2, style: 'center' }, { x: 8, y: 2, style: 'mart' }, { x: 18, y: 1, style: 'gym' }, { x: 3, y: 13, style: 'house2' }, { x: 19, y: 13, style: 'temple' }],
    events: [
      { x: 12, y: 7, type: 'text', text: 'Blizzach: Die Stadt im ewigen Schnee. Osten: See der Willenskraft' },
      { x: 21, y: 16, type: 'text', text: 'Der Tempel von Blizzach. Nur Auserwählte dürfen ihn betreten.' }
    ],
    encounters: null
  },
  snowpoint_center: centerRoom(),
  snowpoint_mart: martRoom(),
  snowpoint_gym: gymRoom('Arena Blizzach', 1, GYM_PALETTES.ice),
  snowpoint_house: houseRoom('Blizzach', 0),
  lake_acuity: {
    name: 'See der Willenskraft', width: 24, height: 16, tint: 'snow', music: 'lake',
    tiles: build(24, 16, [
      ['rect', 1, 1, 22, 14, ','],
      ['rect', 8, 3, 13, 9, '~'], ['rect', 2, 2, 4, 4, '"'], ['rect', 2, 11, 5, 3, '"'],
      ['rect', 0, 8, 8, 2, '.'],
      ['tile', 4, 7, 'S']
    ]),
    events: [{ x: 4, y: 7, type: 'text', text: 'See der Willenskraft. Das Wasser ist eiskalt und spiegelglatt.' }],
    encounters: { ...enc(30, [[459, 38, 40, 30], [215, 38, 40, 25], [220, 38, 40, 25], [361, 38, 40, 20]]), waterRate: 10, water: slots([[54, 38, 42, 50], [55, 40, 44, 20], [130, 38, 42, 30]]) }
  },
  // ------------------------------------------------------------------ Galaktik-Hauptquartier, Speersaeule, Zerrwelt
  galactic_hq: {
    name: 'Galaktik-Hauptquartier', indoor: true, theme: 'lab', entry: { x: 8, y: 13 }, palette: GYM_PALETTES.galactic,
    ...grid(['WWWWWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWWWWW', 'PPPP__PPPPPP__PPPP', '__________________', '_PP____PPPP____PP_', '__________________',
      'BBBBBB______BBBBBB', '__________________', '_PP__PP____PP__PP_', '__________________', 'BBBB__________BBBB', '__________________',
      '__________________', '________E_________']),
    events: [{ x: 8, y: 2, type: 'text', text: 'Ein riesiger Bildschirm zeigt den Kraterberg. Darunter blinkt: „Speersäule. Ziel erreicht.“' }]
  },
  spear_pillar: {
    name: 'Speersäule', indoor: true, theme: 'gym', palette: RUIN, music: 'cave',
    ...grid(['XXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXX', 'XX__X______X__XX', 'XX____________XX', 'XX__X______X__XX', 'XX____________XX',
      'XXXXXX____XXXXXX', 'XX____________XX', 'XX__X______X__XX', 'XX____________XX', 'XXXXXX____XXXXXX', 'XX____________XX',
      'XX____________XX', 'XXXXXXXUXXXXXXXX']),
    events: []
  },
  distortion_world: {
    name: 'Zerrwelt', indoor: true, theme: 'cave', tint: 'distortion', music: 'cave', scripted: true,
    ...grid(['XXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXX', 'XXXXX::::::XXXXX', 'XXX::::::::::XXX', 'XX::::XXXX::::XX', 'XX:::XX::XX:::XX',
      'XX::::::::::::XX', 'XXX::::::::::XXX', 'XXXXX::::::XXXXX', 'XXXXXXX::XXXXXXX', 'XXXXXXXUXXXXXXXX', 'XXXXXXXXXXXXXXXX']),
    events: []
  }
};

export const LINKS4 = [
  ['conn', 'route_210', 'north', 'celestic_town', 4],
  ['conn', 'jubilife_city', 'west', 'route_218', -6],
  ['conn', 'route_218', 'west', 'canalave_city', 6],
  ['conn', 'route_214', 'west', 'lake_valor', -10],
  ['conn', 'route_216', 'west', 'route_217', 16],
  ['conn', 'route_217', 'north', 'snowpoint_city', -1],
  ['conn', 'snowpoint_city', 'east', 'lake_acuity', 0],
  ['door', 'celestic_town', 5, 6, 'celestic_center'],
  ['door', 'celestic_town', 11, 4, 'celestic_ruins'],
  ['door', 'celestic_town', 18, 5, 'celestic_house'],
  ['door', 'canalave_city', 4, 6, 'canalave_center'],
  ['door', 'canalave_city', 10, 5, 'canalave_mart'],
  ['door', 'canalave_city', 24, 6, 'canalave_library'],
  ['door', 'canalave_city', 6, 21, 'canalave_gym'],
  ['door', 'canalave_city', 22, 19, 'canalave_house'],
  ['door', 'route_217', 21, 27, 'route_217_house'],
  ['door', 'snowpoint_city', 4, 5, 'snowpoint_center'],
  ['door', 'snowpoint_city', 9, 4, 'snowpoint_mart'],
  ['door', 'snowpoint_city', 22, 5, 'snowpoint_gym'],
  ['door', 'snowpoint_city', 5, 15, 'snowpoint_house'],
  ['door', 'veilstone_city', 7, 22, 'galactic_hq'],
  ['pass', 'mt_coronet', 14, 1, 'route_216', 32, 6, 'left'],
  ['pass', 'route_216', 33, 6, 'mt_coronet', 14, 2, 'down'],
  ['pass', 'mt_coronet', 24, 2, 'spear_pillar', 7, 12, 'up'],
  ['pass', 'spear_pillar', 7, 13, 'mt_coronet', 24, 3, 'down'],
  ['pass', 'distortion_world', 7, 10, 'spear_pillar', 7, 12, 'up']
];
