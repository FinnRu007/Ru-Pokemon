// Feste Stellen auf den Originalkarten: Zweiblattdorf bis Erzelingen (Route 201 bis 204, 219 bis 221, Jubelstadt). Format siehe origFix.js.
const ball = (map, i, x, y, item) => {
  const id = `ball_${map}_${i}`;
  return { id, x, y, dir: 'down', look: 'item_ball', name: 'Gegenstand', item: true, show: `!got_${id}`, talk: [{ find: item }, { flag: `got_${id}` }] };
};
const slot = (species, min, max, weight) => ({ species, min, max, weight });
// Surfen an der Kueste (Route 219 bis 221)
const SEA = [slot(72, 20, 30, 60), slot(278, 20, 30, 30), slot(73, 20, 40, 9), slot(279, 20, 40, 1)];
// Surfen auf dem Kraterberg-See und im Fluss von Zweiblattdorf
const LAKE = [slot(54, 20, 30, 90), slot(55, 20, 40, 10)];

export const FIX = {
  // Rivale vor dem Ausgang nach Route 201, Ausloeser wie in Platin am Ortsausgang
  route_201: {
    barry_201: [16, 23, 'down'],
    'trigger:route201': { x: 14, y: 25, w: 4, h: 1 },
    // Ohne eigenes Pokemon geht es nicht nach Sandgemme (ganze Grenze im Osten)
    'trigger:noPokemon': { x: 63, y: 10, w: 1, h: 6 }
  },
  // Erster Besuch am See: Zyrus am Ufer wie in Platin (wenig Wasser), Szene am Eingang
  lake_verity: {
    zyrus: [48, 43, 'up'],
    eibe_lake: [48, 43, 'down'],
    lucia_lake: [49, 43, 'down'],
    barry_lake: [47, 50, 'up'],
    'trigger:lake': { x: 44, y: 52, w: 6, h: 1 },
    mars_verity: [55, 38, 'left'],
    ball_lake_verity_0: [25, 54]
  },
  route_202: {
    lucia_202: [21, 27, 'down'],
    tim: [6, 13, 'down'],
    nina: [21, 18, 'down'],
    ball_route_202_0: [2, 6]
  },
  // Rüpel am Nordausgang wie in Platin, der Polizist sperrt den Osten (Route 203)
  jubilife_city: {
    grunt_a: [46, 4, 'right'],
    grunt_b: [46, 3, 'right'],
    jub_man: [41, 30, 'left'],
    poketch_boss: [46, 35, 'down'],
    ball_jubilife_city_0: [14, 30],
    'trigger:jubEast': { x: 60, y: 21, w: 1, h: 4 }
  },
  route_203: {
    barry_203: [9, 21, 'left'],
    'trigger:rival203': { x: 4, y: 21, w: 1, h: 4 },
    jonas: [30, 20, 'down'],
    kira: [48, 12, 'down'],
    paul: [42, 21, 'left'],
    ball_route_203_0: [30, 9],
    ball_route_203_1: [19, 14],
    ball_route_203_2: [39, 18]
  },
  route_204: {
    ball_route_204_0: [2, 28],
    ball_route_204_1: [29, 12],
    ball_route_204_2: [17, 18]
  },
  route_204_north: {
    sina: [17, 20, 'down'],
    ben: [22, 13, 'left'],
    ball_route_204_north_0: [2, 10],
    ball_route_204_north_1: [20, 23]
  },
  // Barry steht vor der Arenatuer, bis Veit aus der Mine zurueck ist; nach dem Orden wartet er dort wieder
  oreburgh_city: {
    barry_gym: [26, 21, 'down'],
    barry_ore: [26, 22, 'up'],
    'trigger:barryOre': { x: 26, y: 21, w: 1, h: 1 },
    'trigger:oreIntro': { x: 7, y: 12, w: 1, h: 4 },
    ore_guide: { x: 12, y: 13, dir: 'left', talk: [['Bergmann', 'Willkommen in Erzelingen! Die Arena steht mitten in der Stadt, das Pokémon-Center liegt weiter östlich.']] },
    ore_kid: [37, 40, 'down'],
    ball_oreburgh_city_0: [39, 38],
    ball_oreburgh_city_1: [35, 37]
  },
  // Muddiger Hang auf Route 207: ohne Fahrrad kein Weg hinauf zum Kraterberg (Platin: Hangfelder bei x 18)
  route_207: {
    'trigger:bikeSlope': { x: 18, y: 14, w: 1, h: 2 }
  },
  _warps: {
    oreIntro: ['oreburgh_city', 26, 22, 'up'],
    hallOfFame: ['twinleaf_town', 20, 22, 'down']
  },
  _add: {
    route_219: [ball('route_219', 0, 9, 13, 'antidote')],
    route_220: [ball('route_220', 0, 39, 21, 'carbos'), ball('route_220', 1, 11, 22, 'splash-plate'), ball('route_220', 2, 20, 14, 'max-repel')],
    route_221: [ball('route_221', 0, 15, 12, 'protein'), ball('route_221', 1, 71, 26, 'tm81'), ball('route_221', 2, 32, 20, 'ultra-ball'), ball('route_221', 3, 26, 6, 'pure-incense')]
  },
  _maps: {
    twinleaf_town: { encounters: { waterRate: 10, water: LAKE } },
    lake_verity: { encounters: { grassRate: 30, grass: [slot(396, 2, 4, 40), slot(399, 2, 4, 40), slot(54, 3, 4, 20)], waterRate: 10, water: LAKE } },
    route_219: { encounters: { waterRate: 10, water: SEA } },
    route_220: { encounters: { waterRate: 10, water: SEA } },
    route_221: { encounters: { grassRate: 30, grass: [slot(419, 29, 31, 25), slot(203, 28, 30, 25), slot(315, 28, 30, 25), slot(185, 29, 31, 25)], waterRate: 10, water: SEA } }
  },
  _signs: {
    route_201: {
      '55,11': 'Route 201  Ost: Sandgemme  West: Zweiblattdorf',
      '40,19': 'Tipps für Trainer: Im hohen Gras springen wilde Pokémon heraus. Ohne eigenes Pokémon solltest du es meiden!'
    },
    sandgem_town: {
      '5,11': 'Pokémon-Forschungslabor von Professor Eibe',
      '14,22': 'Lucias Haus',
      '20,10': 'Pokémon-Center: Heilung für deine Pokémon',
      '25,10': 'Pokémon-Markt: Alles für Trainer'
    },
    route_202: {
      '16,4': 'Route 202  Nord: Jubelstadt  Süd: Sandgemme',
      '14,16': 'Tipps für Trainer: Schwäche ein wildes Pokémon, bevor du einen Pokéball wirfst.'
    },
    jubilife_city: {
      '48,8': 'Jubelstadt: Die modernste Stadt Sinnohs.',
      '59,20': 'Jubelstadt: Die modernste Stadt Sinnohs.',
      '4,20': 'Jubelstadt: Die modernste Stadt Sinnohs.',
      '42,55': 'Jubelstadt: Die modernste Stadt Sinnohs.',
      '36,40': 'Trainerschule: Hier lernst du die Grundlagen des Pokémon-Kampfes.',
      '49,19': 'Jubel-Wohnanlage',
      '13,19': 'Pokécom-Konzern',
      '39,19': 'Jubel-TV',
      '19,44': 'Globale Tauschstation',
      '57,16': null,
      '36,15': 'Jubel-TV. Ein Schild an der Tür: Heute nur für Mitarbeiter.',
      '55,44': null,
      '17,15': 'Pokécom-Konzern. Die Drehtür ist verriegelt.',
      '13,15': 'Pokécom-Konzern. Die Drehtür ist verriegelt.'
    },
    route_203: { '8,20': 'Route 203  West: Jubelstadt  Ost: Erzelingen' },
    route_204: { '14,17': 'Route 204  Süd: Jubelstadt  Nord: Flori' },
    oreburgh_city: {
      '4,11': 'Erzelingen: Die Stadt, die die Energie der Erde antreibt.',
      '22,20': 'Pokémon-Arena Erzelingen. Arenaleiter Veit, der felsenfeste Kumpel.',
      '45,12': 'Kohle-Museum. Wegen Umbau geschlossen.',
      '50,49': null,
      '45,56': 'Erzelingen-Mine. Vorsicht, Bergbaubetrieb!'
    },
    route_221: { '84,17': 'Park der Freunde. Wegen Bauarbeiten noch geschlossen.' }
  }
};
