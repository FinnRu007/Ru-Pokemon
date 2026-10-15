// Sinnoh Ost und Pokémon Liga: Route 222, Sonnewik mit Leuchtturm, Route 223, Pokémon Liga Süd,
// Siegesstraße, Pokémon Liga mit Vorhalle, die Räume der Top Vier, der Raum des Champs und die Ruhmeshalle.
import { build, house, grid, centerRoom, martRoom, houseRoom, gymRoom, leagueRoom, GYM_PALETTES } from './mapkit.js';

const enc = (rate, list) => ({ grassRate: rate, grass: list.map(([species, min, max, weight]) => ({ species, min, max, weight })) });
const slots = (list) => list.map(([species, min, max, weight]) => ({ species, min, max, weight }));

// Farben der Liga-Räume
const EARTH = { floor: '#d8b888', speck: '#b89868', wall: '#8a6a4a', wallStripe: '#7a5a3a', base: '#5a3a22', top: '#3a2a18', rock: '#a8885a' };
const FIRE = { floor: '#e8b090', speck: '#d08a6a', wall: '#a83a2a', wallStripe: '#922e22', base: '#5a1a12', top: '#3a120c', rock: '#c85a3a' };
const PSY = { floor: '#d8c0e8', speck: '#b8a0d0', wall: '#6a4a9a', wallStripe: '#5a3a8a', base: '#3a2a5a', top: '#2a1a48', rock: '#8a6ab8' };
const CHAMP = { floor: '#e8e4d8', speck: '#c8c4b8', wall: '#3a3a4a', wallStripe: '#2e2e3e', base: '#1a1a24', top: '#121218', rock: '#d8c070' };
const HALL = { floor: '#f0e8c8', speck: '#d8d0a8', wall: '#c8a040', wallStripe: '#b89030', base: '#6a5020', top: '#4a3818', rock: '#e8c860' };

const SEA = slots([[73, 40, 44, 40], [279, 40, 44, 30], [458, 38, 42, 20], [226, 42, 44, 10]]);

export const MAPS5 = {
  // ------------------------------------------------------------------ Route 222
  route_222: {
    name: 'Route 222', width: 40, height: 16,
    tiles: build(40, 16, [
      ['rect', 0, 1, 40, 10, ','],
      ['rect', 0, 11, 40, 2, '='], ['rect', 0, 13, 40, 3, '~'],
      ['rect', 4, 2, 8, 4, '"'], ['rect', 22, 2, 7, 4, '"'], ['rect', 14, 9, 6, 2, '"'],
      ['rect', 0, 7, 40, 2, '.'],
      ...house(31, 2, 5, 3, 33),
      ['tile', 3, 6, 'S']
    ]),
    buildings: [{ x: 31, y: 2, style: 'house3' }],
    events: [{ x: 3, y: 6, type: 'text', text: 'Route 222  Osten: Sonnewik, die Stadt am Meer' }],
    encounters: { ...enc(30, [[404, 38, 40, 25], [441, 38, 40, 20], [122, 38, 40, 15], [279, 38, 40, 20], [419, 39, 41, 20]]), waterRate: 10, water: slots([[73, 38, 42, 40], [279, 38, 42, 30], [419, 38, 42, 20], [226, 40, 42, 10]]) }
  },
  route_222_house: houseRoom('Haus am Strand', 1),
  // ------------------------------------------------------------------ Sonnewik
  sunyshore_city: {
    name: 'Sonnewik', width: 36, height: 28, music: 'jubilife', fly: [5, 8],
    tiles: build(36, 28, [
      ['rect', 1, 1, 26, 26, ','],
      ['rect', 27, 0, 9, 28, '~'], ['rect', 24, 1, 3, 26, '='],
      ['rect', 0, 9, 24, 2, '.'], ['rect', 12, 3, 2, 22, '.'],
      ['rect', 2, 25, 9, 1, '*'], ['rect', 15, 25, 8, 1, '*'],
      ...house(3, 3, 5, 4, 5, 'C'), ...house(16, 4, 4, 3, 17), ...house(2, 13, 9, 5, 6),
      ...house(16, 12, 5, 6, 18), ...house(15, 21, 5, 3, 17), ...house(3, 21, 5, 3, 5),
      ['tile', 11, 8, 'S']
    ]),
    buildings: [{ x: 3, y: 3, style: 'center' }, { x: 16, y: 4, style: 'mart' }, { x: 2, y: 13, style: 'gym' }, { x: 16, y: 12, style: 'lighthouse' }, { x: 15, y: 21, style: 'house2' }, { x: 3, y: 21, style: 'house5' }],
    events: [{ x: 11, y: 8, type: 'text', text: 'Sonnewik: Die Stadt, die von der Sonne lebt. Norden über das Meer: Route 223 zur Pokémon Liga' }],
    encounters: { waterRate: 10, water: SEA }
  },
  sunyshore_center: centerRoom(),
  sunyshore_mart: martRoom(),
  sunyshore_gym: gymRoom('Arena Sonnewik', 0, GYM_PALETTES.electric),
  sunyshore_house: houseRoom('Sonnewik', 0),
  sunyshore_house2: houseRoom('Sonnewik', 2),
  sunyshore_lighthouse: {
    name: 'Leuchtturm Sonnewik', indoor: true, theme: 'lab', entry: { x: 5, y: 7 },
    ...grid(['WWWWWWWWWWW', 'WWWWWWWWWWW', 'Y___VVV___Y', '___________', '_P_______P_', '___________', '___________', '_____E_____']),
    events: [
      { x: 4, y: 2, type: 'text', text: 'Durch das Fernrohr siehst du weit über das Meer. Ganz im Norden erkennst du die Pokémon Liga.' },
      { x: 6, y: 2, type: 'text', text: 'Unter dir glitzern die Solarstege von Sonnewik in der Sonne.' }
    ]
  },
  // ------------------------------------------------------------------ Route 223 (nur mit Surfer und Kaskade)
  route_223: {
    name: 'Route 223', width: 24, height: 40, music: 'route2',
    tiles: build(24, 40, [
      ['rect', 0, 0, 24, 40, '~'],
      ['rect', 0, 0, 2, 40, 'X'], ['rect', 22, 0, 2, 40, 'X'],
      ['rect', 2, 4, 20, 3, 'X'], ['rect', 11, 4, 2, 3, 'J'],
      ['rect', 5, 30, 3, 3, 'X'], ['rect', 15, 22, 4, 3, 'X'], ['rect', 4, 14, 3, 4, 'X'], ['rect', 15, 9, 3, 2, 'X'],
      ['rect', 8, 34, 4, 2, '='], ['tile', 9, 34, 'S']
    ]),
    events: [{ x: 9, y: 34, type: 'text', text: 'Route 223  Norden: Pokémon Liga. Den Wasserfall am Ende kommt nur hinauf, wer Kaskade beherrscht.' }],
    encounters: { waterRate: 10, water: slots([[73, 42, 46, 35], [279, 42, 46, 30], [226, 42, 46, 20], [458, 40, 44, 15]]) }
  },
  // ------------------------------------------------------------------ Pokemon Liga Sued und Siegesstrasse
  pokemon_league_south: {
    name: 'Pokémon Liga Süd', width: 30, height: 24, music: 'route1',
    tiles: build(30, 24, [
      ['rect', 1, 1, 28, 22, ','],
      ['rect', 0, 0, 30, 4, 'X'], ['rect', 1, 4, 12, 3, 'X'], ['rect', 16, 4, 13, 3, 'X'],
      ['rect', 13, 4, 3, 10, '.'], ['tile', 14, 3, 'G'],
      ['rect', 3, 14, 24, 2, '='], ['rect', 3, 16, 24, 8, '~'],
      ...house(4, 8, 5, 4, 6, 'C'),
      ['rect', 19, 8, 7, 4, '"'],
      ['tile', 11, 12, 'S']
    ]),
    buildings: [{ x: 4, y: 8, style: 'center' }],
    events: [{ x: 11, y: 12, type: 'text', text: 'Pokémon Liga  Norden: Siegesstraße. Nur mit allen acht Orden!' }],
    encounters: { ...enc(30, [[78, 44, 46, 25], [308, 44, 46, 25], [75, 44, 46, 20], [22, 44, 46, 15], [357, 44, 46, 15]]), waterRate: 10, water: SEA }
  },
  league_south_center: centerRoom(),
  victory_road: {
    name: 'Siegesstraße', indoor: true, theme: 'cave',
    ...grid([
      'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXXXXXXXXXGXXXXXXX',
      'XXXXXXXXXXXXXXXXXXX:::::XXXXXX',
      'XXXXXXXXXXXXXXXXXX:::::::XXXXX',
      'XXXXXXXXXXXXXXXXXXXNNNNNXXXXXX',
      'XXXXXXXXXXXXXXXXXX:::::::XXXXX',
      'XXXXXXXXXXXXXXXXX:::::O:::XXXX',
      'XXXXXXXXXXXXXXXXX:::::::::XXXX',
      'XXXXXXXXXXXXXXXXXX::::::::XXXX',
      'XXXXXXXXXXXXXXXXXXXX:::XXXXXXX',
      'XXXXX:::::::XXXXXXXX:::XXXXXXX',
      'XXXX:::::::::XXXXXX:::::XXXXXX',
      'XXXX:::O::::::::::M:::::XXXXXX',
      'XXXX:::::::::XXXXXX:::::XXXXXX',
      'XXXXX:::::::XXXXXXXXXXXXXXXXXX',
      'XXXXXXX:XXXXXXXXXXXXXXXXXXXXXX',
      'XXXXXXXQXXXXXXXXXXXXXXXXXXXXXX',
      'XXXXXX:::XXXXXXXXXXXXXXXXXXXXX',
      'XXXX:::::::::::::::::::::XXXXX',
      'XXX:::::O::::::::::::::::XXXXX',
      'XXX::::::::XXXXXX:::::O::XXXXX',
      'XXX:::::::XXXXXXXX::::::::XXXX',
      'XXXX:::::::::::::::::::::XXXXX',
      'XXXXX::::::::::::::::::XXXXXXX',
      'XXXXXXXXXXXXX:::XXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXGXXXXXXXXXXXXXXX'
    ]),
    events: [],
    encounters: { caveRate: 10, cave: slots([[42, 44, 46, 20], [75, 44, 46, 15], [95, 44, 46, 10], [67, 44, 46, 15], [308, 45, 47, 10], [208, 46, 48, 8], [112, 46, 48, 10], [82, 45, 47, 8], [444, 46, 46, 4]]) }
  },
  // ------------------------------------------------------------------ Pokemon Liga
  pokemon_league: {
    name: 'Pokémon Liga', width: 26, height: 20, music: 'title', fly: [12, 14],
    tiles: build(26, 20, [
      ['rect', 1, 1, 24, 14, ','],
      ['rect', 0, 15, 26, 5, 'X'], ['tile', 12, 15, 'G'],
      ['rect', 2, 10, 6, 3, '*'], ['rect', 18, 10, 6, 3, '*'],
      ...house(6, 1, 14, 7, 12),
      ['rect', 11, 8, 3, 7, '.'],
      ['tile', 15, 9, 'S']
    ]),
    buildings: [{ x: 6, y: 1, style: 'league' }],
    events: [{ x: 15, y: 9, type: 'text', text: 'Pokémon Liga Sinnoh. Hier warten die Top Vier und der Champ.' }],
    encounters: null
  },
  league_lobby: {
    name: 'Vorhalle der Liga', indoor: true, theme: 'center', entry: { x: 7, y: 10 },
    ...grid(['WWWWWWWWWWWWWWW', 'WWWWWWWUWWWWWWW', 'Y_____________Y', '_______________', '_KKK_______KKK_', '_______________',
      '_______________', 'Y_____________Y', '_______________', '_______________', '_______E_______']),
    events: [
      { x: 2, y: 4, type: 'heal', text: 'Willkommen in der Pokémon Liga! Wir pflegen deine Pokémon für den großen Kampf.' },
      { x: 12, y: 4, type: 'shop', text: 'Willkommen! Hier gibt es alles für die Top Vier.' }
    ]
  },
  e4_aaron: { ...leagueRoom('Raum von Herbaro', GYM_PALETTES.forest), music: 'gym' },
  e4_bertha: { ...leagueRoom('Raum von Teresa', EARTH), music: 'gym' },
  e4_flint: { ...leagueRoom('Raum von Ignaz', FIRE), music: 'gym' },
  e4_lucian: { ...leagueRoom('Raum von Lucian', PSY), music: 'gym' },
  champion_room: { ...leagueRoom('Raum des Champs', CHAMP), music: 'gym' },
  hall_of_fame: {
    name: 'Ruhmeshalle', indoor: true, theme: 'gym', palette: HALL, music: 'victory',
    ...grid(['WWWWWWWWWWW', 'WWWWWWWWWWW', 'Y___PPP___Y', '___________', '__Y_____Y__', '___________', '___________', '_____E_____']),
    events: []
  }
};

export const LINKS5 = [
  ['conn', 'valor_lakefront', 'east', 'route_222', -1],
  ['conn', 'route_222', 'east', 'sunyshore_city', 2],
  ['conn', 'sunyshore_city', 'north', 'route_223', -20],
  ['conn', 'route_223', 'north', 'pokemon_league_south', 3],
  ['door', 'route_222', 33, 4, 'route_222_house'],
  ['door', 'sunyshore_city', 5, 6, 'sunyshore_center'],
  ['door', 'sunyshore_city', 17, 6, 'sunyshore_mart'],
  ['door', 'sunyshore_city', 6, 17, 'sunyshore_gym'],
  ['door', 'sunyshore_city', 18, 17, 'sunyshore_lighthouse'],
  ['door', 'sunyshore_city', 17, 23, 'sunyshore_house'],
  ['door', 'sunyshore_city', 5, 23, 'sunyshore_house2'],
  ['door', 'pokemon_league_south', 6, 11, 'league_south_center'],
  ['pass', 'pokemon_league_south', 14, 3, 'victory_road', 14, 24, 'up'],
  ['pass', 'victory_road', 14, 25, 'pokemon_league_south', 14, 4, 'down'],
  ['pass', 'victory_road', 22, 1, 'pokemon_league', 12, 14, 'up'],
  ['pass', 'pokemon_league', 12, 15, 'victory_road', 22, 2, 'down'],
  ['door', 'pokemon_league', 12, 7, 'league_lobby'],
  // Ab der Vorhalle geht es nur noch vorwärts
  ['pass', 'league_lobby', 7, 1, 'e4_aaron', 5, 10, 'up'],
  ['pass', 'e4_aaron', 5, 1, 'e4_bertha', 5, 10, 'up'],
  ['pass', 'e4_bertha', 5, 1, 'e4_flint', 5, 10, 'up'],
  ['pass', 'e4_flint', 5, 1, 'e4_lucian', 5, 10, 'up'],
  ['pass', 'e4_lucian', 5, 1, 'champion_room', 5, 10, 'up'],
  ['pass', 'champion_room', 5, 1, 'hall_of_fame', 5, 7, 'up']
];

// Nebengebiete einhaengen
import { MAPS6, LINKS6 } from './maps6.js';
Object.assign(MAPS5, MAPS6);
LINKS5.push(...LINKS6);
