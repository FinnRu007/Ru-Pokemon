// Sinnoh ab Route 204: Felsige Schneise, Flori, Windkraftwerk, Ewigwald, Ewigenau, Radweg,
// Kraterberg und alles Weitere bis zur Pokemon Liga. Zeichenerklaerung in maps.js, neue Zeichen:
//   Q  Felsbrocken (Zertruemmerer)   Z  Duenner Baum (Zerschneider)   M  Felsblock (Staerke)
//   N  Felswand (Kraxler)            J  Wasserfall (Kaskade)          b  Holzbruecke   n  Schnee
// Wasser (~) laesst sich mit Surfer befahren. map.fly = Landepunkt fuer Fliegen.
// map.palette faerbt Innenraeume (Arenen), map.tint faerbt ganze Karten (snow, distortion, dusk).
import { build, grid, house, centerRoom, martRoom, houseRoom, gymRoom, GYM_PALETTES } from './mapkit.js';
import { MAPS3, LINKS3 } from './maps3.js';

export { GYM_PALETTES };

const enc = (rate, list) => ({ grassRate: rate, grass: list.map(([species, min, max, weight]) => ({ species, min, max, weight })) });
const slots = (list) => list.map(([species, min, max, weight]) => ({ species, min, max, weight }));

export const MAPS2 = {
  // ------------------------------------------------------------------ Felsige Schneise
  ravaged_path: {
    name: 'Felsige Schneise', indoor: true, theme: 'cave',
    ...grid([
      'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXGX',
      'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX:::X',
      'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXQXX',
      'XXX::::::::::::XXXXX::::::::::::::XXXX:::::::X',
      'XX::::O::::::::::::::::::O:::::::::::::::::::X',
      'XX::::::::XXXX:::::::::::::::::XXXXX:::::::::X',
      'XX::::::::::::::::O:::::::::::::::::::::O::::X',
      'XXX::::::::::XXX:::::::::::::XXXX:::::::::::XX',
      'XXX:::::::::XXXXXXXX:::::XXXXXXXXXXXXXXXXXXXXX',
      'XXX:::XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      'XXXXGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    ]),
    events: [],
    encounters: { caveRate: 10, cave: slots([[41, 8, 10, 45], [74, 8, 10, 35], [54, 8, 10, 20]]) }
  },
  route_204_north: {
    name: 'Route 204', width: 16, height: 12,
    tiles: build(16, 12, [
      ['rect', 1, 0, 14, 11, ','],
      ['rect', 2, 2, 4, 4, '"'], ['rect', 10, 4, 5, 4, '"'],
      ['rect', 1, 7, 4, 2, '~'], ['rect', 11, 8, 3, 2, '*'],
      ['rect', 6, 0, 4, 10, '.'],
      ['rect', 3, 10, 10, 2, 'X'], ['tile', 7, 10, 'G'],
      ['tile', 5, 9, 'S']
    ]),
    events: [{ x: 5, y: 9, type: 'text', text: 'Route 204  Nord: Flori, die Stadt der Blumen' }],
    encounters: { ...enc(30, [[406, 8, 10, 25], [265, 8, 9, 20], [396, 8, 10, 20], [399, 8, 10, 15], [401, 9, 10, 10], [403, 9, 10, 10]]), waterRate: 10, water: slots([[54, 10, 14, 60], [129, 8, 12, 40]]) }
  },
  // ------------------------------------------------------------------ Flori
  floaroma_town: {
    name: 'Flori', width: 28, height: 22, fly: [5, 8],
    tiles: build(28, 22, [
      ['rect', 1, 1, 26, 20, ','],
      ['rect', 1, 1, 26, 1, '*'], ['rect', 9, 3, 3, 6, '*'], ['rect', 16, 3, 3, 6, '*'], ['rect', 9, 14, 3, 6, '*'], ['rect', 16, 14, 3, 6, '*'],
      ['rect', 1, 19, 10, 2, '*'], ['rect', 17, 19, 10, 2, '*'],
      ['rect', 12, 0, 4, 22, '.'], ['rect', 1, 10, 27, 3, '.'],
      ...house(3, 3, 5, 4, 5, 'C'), ...house(19, 3, 5, 3, 21), ...house(3, 14, 5, 3, 5), ...house(19, 14, 5, 3, 21),
      ['tile', 11, 9, 'S']
    ]),
    buildings: [{ x: 3, y: 3, style: 'center' }, { x: 19, y: 3, style: 'mart' }, { x: 3, y: 14, style: 'shop' }, { x: 19, y: 14, style: 'house3' }],
    events: [{ x: 11, y: 9, type: 'text', text: 'Flori: Die Stadt, in der Blumen das ganze Jahr blühen. Norden: Flori-Wiese  Osten: Route 205' }],
    encounters: null
  },
  floaroma_meadow: {
    name: 'Flori-Wiese', width: 24, height: 16,
    tiles: build(24, 16, [
      ['rect', 1, 1, 22, 15, '*'],
      ['rect', 2, 8, 6, 5, '"'], ['rect', 16, 8, 6, 5, '"'],
      ['rect', 3, 3, 18, 3, '.'], ['rect', 10, 6, 4, 10, '.'],
      ['tile', 9, 13, 'S']
    ]),
    events: [{ x: 9, y: 13, type: 'text', text: 'Flori-Wiese. Hier summen die Bienen und der Honig fließt.' }],
    encounters: enc(30, [[406, 9, 11, 30], [396, 9, 11, 20], [399, 9, 11, 20], [415, 9, 11, 15], [420, 9, 11, 15]])
  },
  route_205_south: {
    name: 'Route 205', width: 32, height: 24,
    tiles: build(32, 24, [
      ['rect', 1, 1, 30, 22, ','],
      ['rect', 2, 2, 8, 6, '"'], ['rect', 22, 2, 8, 6, '"'], ['rect', 3, 15, 9, 6, '"'], ['rect', 22, 15, 8, 6, '"'],
      ['rect', 13, 0, 3, 24, '~'],
      ['rect', 0, 10, 32, 3, '.'], ['rect', 13, 10, 3, 3, 'b'],
      ['rect', 17, 0, 5, 10, '#'], ['rect', 18, 0, 3, 10, '.'],
      ['tile', 11, 9, 'S']
    ]),
    events: [{ x: 11, y: 9, type: 'text', text: 'Route 205  Osten: Windkraftwerk  Norden: Ewigwald, dahinter Ewigenau' }],
    encounters: { ...enc(30, [[399, 10, 12, 20], [418, 10, 12, 25], [422, 10, 12, 25], [417, 10, 12, 15], [265, 10, 11, 15]]), waterRate: 10, water: slots([[54, 14, 20, 40], [422, 14, 20, 40], [72, 14, 18, 20]]) }
  },
  valley_windworks: {
    name: 'Windkraftwerk', width: 20, height: 16,
    tiles: build(20, 16, [
      ['rect', 1, 1, 18, 14, ','],
      ['rect', 14, 1, 5, 8, '"'], ['rect', 1, 13, 6, 2, '*'], ['rect', 15, 11, 4, 4, '~'],
      ['rect', 0, 10, 12, 3, '.'], ['rect', 9, 7, 1, 3, '.'],
      ...house(5, 2, 9, 5, 9),
      ['tile', 11, 9, 'S']
    ]),
    buildings: [{ x: 5, y: 2, style: 'plant' }],
    events: [{ x: 11, y: 9, type: 'text', text: 'Windkraftwerk. Hier wird aus dem Wind des Tals Strom für ganz Sinnoh.' }],
    encounters: { ...enc(30, [[417, 10, 13, 40], [418, 10, 12, 25], [403, 10, 12, 20], [425, 11, 13, 15]]), waterRate: 10, water: slots([[54, 14, 20, 50], [422, 14, 20, 50]]) }
  },
  windworks_inside: {
    name: 'Windkraftwerk', indoor: true, theme: 'lab', entry: { x: 6, y: 9 }, palette: GYM_PALETTES.galactic,
    ...grid(['WWWWWWWWWWWWWW', 'WWWWWWWWWWWWWW', 'PP__PP__PP__PP', '______________', '_PP________PP_', '______________', '__PP______PP__', '______________', '______________', '______E_______']),
    events: [{ x: 4, y: 2, type: 'text', text: 'Die Turbinen stehen still. Jemand hat die Steuerung blockiert.' }]
  },
  // ------------------------------------------------------------------ Ewigwald
  eterna_forest: {
    name: 'Ewigwald', width: 30, height: 30, music: 'lake', tint: 'dusk',
    tiles: build(30, 30, [
      ['rect', 10, 20, 8, 4, '"'], ['rect', 12, 8, 7, 6, '"'], ['rect', 2, 10, 6, 8, '"'], ['rect', 24, 18, 5, 8, '"'], ['rect', 11, 1, 10, 4, '"'],
      ['rect', 4, 24, 3, 6, '.'], ['rect', 4, 24, 20, 3, '.'], ['rect', 21, 14, 3, 13, '.'], ['rect', 8, 14, 16, 3, '.'],
      ['rect', 8, 5, 3, 12, '.'], ['rect', 8, 5, 22, 3, '.'],
      ['tile', 7, 27, 'S']
    ]),
    events: [{ x: 7, y: 27, type: 'text', text: 'Ewigwald. Ein alter, dunkler Wald. Bleib auf dem Weg!' }],
    encounters: enc(30, [[265, 10, 12, 15], [266, 10, 12, 10], [268, 10, 12, 10], [406, 10, 12, 20], [427, 10, 12, 15], [92, 11, 13, 10], [163, 10, 12, 10], [401, 10, 12, 10]])
  },
  // ------------------------------------------------------------------ Ewigenau
  eterna_city: {
    name: 'Ewigenau', width: 34, height: 28, music: 'oreburgh', fly: [16, 18],
    tiles: build(34, 28, [
      ['rect', 1, 1, 32, 26, ','],
      ['rect', 1, 1, 32, 1, '*'], ['rect', 20, 10, 4, 3, '*'], ['rect', 27, 10, 5, 3, '*'], ['rect', 1, 24, 8, 2, '*'],
      ['rect', 0, 14, 33, 3, '.'], ['rect', 15, 2, 4, 26, '.'],
      ...house(3, 3, 8, 6, 7), ...house(22, 3, 8, 5, 26),
      ...house(3, 19, 5, 3, 5, 'C'), ...house(10, 19, 4, 3, 11), ...house(22, 19, 5, 3, 24), ...house(28, 19, 4, 3, 29),
      ['rect', 11, 10, 2, 2, 'X'],
      ['tile', 14, 13, 'S']
    ]),
    buildings: [{ x: 3, y: 3, style: 'galactic' }, { x: 22, y: 3, style: 'gym' }, { x: 3, y: 19, style: 'center' }, { x: 10, y: 19, style: 'mart' }, { x: 22, y: 19, style: 'bike' }, { x: 28, y: 19, style: 'house4' }],
    events: [
      { x: 14, y: 13, type: 'text', text: 'Ewigenau: Die Stadt, in der die Zeit stillzustehen scheint.' },
      { x: 11, y: 11, type: 'text', text: 'Eine uralte Statue eines Pokémon. Man sagt, es habe die Zeit selbst erschaffen.' },
      { x: 12, y: 11, type: 'text', text: 'Eine uralte Statue eines Pokémon. Man sagt, es habe die Zeit selbst erschaffen.' }
    ],
    encounters: null
  },
  eterna_galactic: {
    name: 'Galaktik-Gebäude', indoor: true, theme: 'lab', entry: { x: 7, y: 11 }, palette: GYM_PALETTES.galactic,
    ...grid(['WWWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWWW', 'PP__PPPPPPPP__PP', '________________', '_BB__BB__BB__BB_', '________________',
      'PP____PPPP____PP', '________________', '_BB__BB__BB__BB_', '________________', '________________', '_______E________']),
    events: [{ x: 6, y: 2, type: 'text', text: 'Ein Plakat: „Team Galaktik. Für eine neue Welt ohne Streit.“ Darunter steht klein: „Spenden willkommen.“' }]
  },
  // ------------------------------------------------------------------ Radweg und Route 207
  route_206: {
    name: 'Route 206', width: 16, height: 90,
    tiles: build(16, 90, [
      ['rect', 1, 0, 14, 90, ','],
      ['rect', 1, 4, 3, 10, '"'], ['rect', 10, 14, 5, 10, '"'], ['rect', 1, 26, 4, 10, '"'], ['rect', 10, 30, 4, 4, 'X'],
      ['rect', 10, 40, 5, 12, '"'], ['rect', 1, 46, 3, 6, 'X'], ['rect', 1, 56, 4, 12, '"'], ['rect', 10, 60, 4, 4, 'X'],
      ['rect', 10, 70, 5, 10, '"'], ['rect', 1, 74, 4, 3, 'X'], ['rect', 1, 80, 4, 6, '"'],
      ['rect', 5, 0, 4, 90, '.'],
      ['tile', 9, 2, 'S'], ['tile', 9, 86, 'S']
    ]),
    events: [
      { x: 9, y: 2, type: 'text', text: 'Route 206: Radweg. Süden: Route 207 und Kraterberg' },
      { x: 9, y: 86, type: 'text', text: 'Route 206: Radweg. Norden: Ewigenau' }
    ],
    encounters: enc(30, [[74, 15, 17, 20], [77, 15, 17, 15], [41, 15, 17, 10], [434, 15, 17, 15], [431, 15, 17, 15], [207, 15, 17, 10], [402, 16, 17, 15]])
  },
  route_207: {
    name: 'Route 207', width: 28, height: 14,
    tiles: build(28, 14, [
      ['rect', 0, 1, 24, 12, ','],
      ['rect', 2, 9, 8, 3, '"'], ['rect', 14, 9, 8, 3, '"'], ['rect', 14, 1, 8, 4, '"'],
      ['rect', 0, 6, 24, 2, '.'], ['rect', 8, 0, 4, 8, '.'],
      ['rect', 3, 1, 1, 12, 'X'], ['rect', 3, 6, 1, 2, '.'],
      ['rect', 24, 1, 4, 12, 'X'], ['rect', 24, 6, 3, 2, '.'], ['tile', 27, 6, 'G'],
      ['tile', 6, 5, 'S']
    ]),
    events: [{ x: 6, y: 5, type: 'text', text: 'Route 207  Westen: Erzelingen  Osten: Kraterberg  Norden: Radweg nach Ewigenau' }],
    encounters: enc(30, [[74, 15, 17, 30], [77, 15, 17, 20], [66, 15, 17, 25], [403, 15, 17, 15], [207, 16, 17, 10]])
  },
  // ------------------------------------------------------------------ Kraterberg
  mt_coronet: {
    name: 'Kraterberg', indoor: true, theme: 'cave',
    ...grid([
      'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXGXXXXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXX:::XXXXXXXXUXXXXXXX',
      'XXXXXXXXXXXXXXMXXXXXXX:::XXXXXXX',
      'XXXX::::::XX:::::::::::::::XXXXX',
      'XXX::::::::::::::O::::::::::XXXX',
      'G:::::O:::::XXXX:::::::::::::::G',
      'XX:::::::::::XXXX:::::O:::::::XX',
      'XXX::::::::::::::::::::::::::XXX',
      'XXXX:::O::::::::XXXXXX:::::::XXX',
      'XXXXXX:::::::::XXXXXXXX::::XXXXX',
      'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    ]),
    events: [],
    encounters: { caveRate: 10, cave: slots([[41, 17, 20, 20], [74, 17, 20, 20], [66, 17, 20, 15], [436, 17, 20, 15], [307, 17, 20, 10], [433, 17, 19, 10], [75, 19, 21, 10]]) }
  },
  route_208: {
    name: 'Route 208', width: 30, height: 12,
    tiles: build(30, 12, [
      ['rect', 2, 1, 28, 10, ','],
      ['rect', 6, 1, 8, 3, '"'], ['rect', 16, 8, 10, 3, '"'], ['rect', 20, 1, 4, 3, '~'],
      ['rect', 0, 0, 2, 12, 'X'], ['tile', 1, 5, 'G'],
      ['rect', 2, 5, 28, 2, '.'],
      ['tile', 27, 4, 'S']
    ]),
    events: [{ x: 27, y: 4, type: 'text', text: 'Route 208  Osten: Herzhofen, die Stadt der Herzen' }],
    encounters: { ...enc(30, [[400, 18, 20, 20], [54, 18, 20, 15], [307, 18, 20, 20], [315, 18, 20, 20], [280, 18, 19, 10], [397, 19, 20, 15]]), waterRate: 10, water: slots([[54, 20, 25, 60], [55, 22, 26, 40]]) }
  },

  // ------------------------------------------------------------------ Innenraeume Etappe 1
  floaroma_center: centerRoom(),
  floaroma_mart: martRoom(),
  floaroma_flowershop: houseRoom('Blumenladen Flori', 1, [{ x: 3, y: 2, type: 'text', text: 'Bunte Blumen in kleinen Töpfen. Es duftet herrlich.' }]),
  floaroma_house: houseRoom('Flori', 2),
  eterna_center: centerRoom(),
  eterna_mart: martRoom(),
  eterna_gym: gymRoom('Arena Ewigenau', 0, GYM_PALETTES.forest),
  eterna_bikeshop: houseRoom('Radladen Rasant', 0, [{ x: 0, y: 2, type: 'text', text: 'Fahrradschläuche, Klingeln und Werkzeug. Alles fein säuberlich sortiert.' }]),
  eterna_house: houseRoom('Ewigenau', 1)
};

// Verbindungen: ['conn', a, Rand, b, Versatz] (beidseitig), ['door', aussen, x, y, innen], ['pass', a, x, y, b, x, y, Richtung]
export const LINKS2 = [
  ['pass', 'route_204', 7, 0, 'ravaged_path', 4, 10, 'up'],
  ['pass', 'ravaged_path', 4, 11, 'route_204', 7, 1, 'down'],
  ['pass', 'ravaged_path', 44, 1, 'route_204_north', 7, 9, 'up'],
  ['pass', 'route_204_north', 7, 10, 'ravaged_path', 44, 2, 'down'],
  ['conn', 'route_204_north', 'north', 'floaroma_town', 6],
  ['conn', 'floaroma_town', 'north', 'floaroma_meadow', -2],
  ['conn', 'floaroma_town', 'east', 'route_205_south', 0],
  ['conn', 'route_205_south', 'east', 'valley_windworks', 0],
  ['conn', 'route_205_south', 'north', 'eterna_forest', -14],
  ['conn', 'eterna_forest', 'east', 'eterna_city', 9],
  ['conn', 'eterna_city', 'south', 'route_206', -10],
  ['conn', 'route_206', 'south', 'route_207', 3],
  ['conn', 'oreburgh_city', 'east', 'route_207', -3],
  ['pass', 'route_207', 27, 6, 'mt_coronet', 1, 6, 'right'],
  ['pass', 'mt_coronet', 0, 6, 'route_207', 26, 6, 'left'],
  ['pass', 'mt_coronet', 31, 6, 'route_208', 2, 5, 'right'],
  ['pass', 'route_208', 1, 5, 'mt_coronet', 30, 6, 'left'],
  ['door', 'floaroma_town', 5, 6, 'floaroma_center'],
  ['door', 'floaroma_town', 21, 5, 'floaroma_mart'],
  ['door', 'floaroma_town', 5, 16, 'floaroma_flowershop'],
  ['door', 'floaroma_town', 21, 16, 'floaroma_house'],
  ['door', 'valley_windworks', 9, 6, 'windworks_inside'],
  ['door', 'eterna_city', 7, 8, 'eterna_galactic'],
  ['door', 'eterna_city', 26, 7, 'eterna_gym'],
  ['door', 'eterna_city', 5, 21, 'eterna_center'],
  ['door', 'eterna_city', 11, 21, 'eterna_mart'],
  ['door', 'eterna_city', 24, 21, 'eterna_bikeshop'],
  ['door', 'eterna_city', 29, 21, 'eterna_house']
];

Object.assign(MAPS2, MAPS3);
LINKS2.push(...LINKS3);
