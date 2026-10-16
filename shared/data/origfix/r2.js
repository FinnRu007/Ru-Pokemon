// Feste Stellen auf den Originalkarten: Flori bis Ewigenau (Route 205 bis 207, 211, Ewigwald, Radweg). Format siehe origFix.js.
const ball = (map, i, x, y, item) => ({ id: `ball_${map}_${i}`, x, y, dir: 'down', look: 'item_ball', name: 'Gegenstand', item: true, show: `!got_ball_${map}_${i}`, talk: [{ find: item }, { flag: `got_ball_${map}_${i}` }] });

export const FIX = {
  floaroma_town: {
    flo_girl: [23, 43, 'left'],
    flo_girl2: [23, 43, 'left'],
    flo_man: [19, 53, 'down']
  },
  // Die Rüpel bedrängen den Honigsammler am Aufgang der Wiese, beide sehen den schmalen Weg vom Stadteingang
  floaroma_meadow: {
    meadow_a: [12, 47, 'down'],
    meadow_b: [13, 47, 'down'],
    ball_floaroma_meadow_0: [14, 15],
    ball_floaroma_meadow_1: [46, 28],
    ball_floaroma_meadow_2: [20, 27],
    ball_floaroma_meadow_3: [11, 35]
  },
  // Zwei Rüpel sperren die Brücke nach Norden, bis das Windkraftwerk frei ist
  route_205_south: {
    grunt_205: [24, 77, 'down'],
    'trigger:grunt205': { x: 25, y: 77, w: 1, h: 1 },
    rolf: [16, 34, 'down'],
    tom: [23, 70, 'right'],
    ball_route_205_south_0: [12, 42],
    ball_route_205_south_1: [21, 64],
    ball_route_205_south_2: [11, 27],
    ball_route_205_south_3: [27, 32]
  },
  valley_windworks: {
    ww_guard: [19, 15, 'down'],
    ball_valley_windworks_0: [18, 4],
    ball_valley_windworks_1: [22, 20],
    ball_valley_windworks_2: [8, 9]
  },
  // Heide wartet am Waldeingang wie Silvana in Platin, Trainer an den Platin-Stellen
  eterna_forest: {
    heide: [28, 83, 'down'],
    lars: [37, 67, 'right'],
    mila: [40, 67, 'left'],
    ida: [55, 67, 'left'],
    ball_eterna_forest_0: [15, 81],
    ball_eterna_forest_1: [41, 59],
    ball_eterna_forest_2: [50, 85],
    ball_eterna_forest_3: [66, 42],
    ball_eterna_forest_4: [81, 12],
    ball_eterna_forest_5: [84, 82],
    // Diese drei liegen in Platin auf Route 205 Nord und am Waldrand
    ball_eterna_forest_6: { map: 'route_205_north', x: 18, y: 29 },
    ball_eterna_forest_7: { map: 'eterna_forest_outside', x: 51, y: 57 },
    ball_eterna_forest_8: { map: 'eterna_forest_outside', x: 36, y: 59 }
  },
  // Das Galaktik-Gebäude liegt hinter Bäumen, die erst Zerschneider freimacht (Cynthia an der Statue)
  eterna_city: {
    et_guard: [17, 8, 'down'],
    cynthia_et: [23, 11, 'left'],
    et_woman: [20, 40, 'up'],
    et_kid: [15, 49, 'up'],
    oak: [24, 40, 'left'],
    ball_eterna_city_0: [38, 4],
    ball_eterna_city_1: [29, 46],
    // Radweg: vor dem Tor im Süden, ohne Fahrrad geht es nicht weiter
    'trigger:needBike': { x: 14, y: 53, w: 6, h: 1, when: '!bike' }
  },
  route_206: {
    kai: [14, 25, 'right'],
    ela: [11, 55, 'right'],
    horst: [23, 46, 'down'],
    tom_r: [15, 68, 'right'],
    mona_r: [11, 93, 'right'],
    gerd_r: [16, 46, 'left'],
    ball_route_206_0: [4, 47],
    ball_route_206_1: [25, 103],
    ball_route_206_2: [26, 55],
    ball_route_206_3: [14, 76]
  },
  // Schlammiger Hang (Radhang) zwischen Erzelingen und dem oberen Teil vor dem Kraterberg
  route_207: {
    uwe: [41, 11, 'left'],
    'trigger:bikeSlope': { x: 18, y: 14, w: 1, h: 2 },
    ball_route_207_0: [3, 7],
    ball_route_207_1: [35, 26],
    // Eisen und Timerball liegen in Platin am Ostrand, den man nur aus Kraterberg 2F erreicht (fehlt hier)
    ball_route_207_2: [47, 9],
    ball_route_207_3: [39, 11],
    ball_route_207_4: [40, 24]
  },
  // Aus dem Irrweg kommt man am Haupteingang neben dem Radweg heraus
  _retarget: {
    'wayward_cave>route_206': ['route_206', 22, 31, 'down']
  },
  _add: {
    route_205_south: [{ id: 'grunt_205b', x: 26, y: 77, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', show: '!windworks_done', talk: 'grunt205' }],
    route_211_west: [ball('route_211_west', 0, 16, 23, 'tm12')],
    route_211_east: [ball('route_211_east', 0, 8, 2, 'tm29'), ball('route_211_east', 1, 17, 23, 'carbos')],
    mt_coronet_north: [
      ball('mt_coronet_north', 0, 14, 26, 'rare-candy'), ball('mt_coronet_north', 1, 2, 31, 'tm69'),
      ball('mt_coronet_north', 2, 28, 43, 'escape-rope'), ball('mt_coronet_north', 3, 12, 60, 'tm02'),
      ball('mt_coronet_north', 4, 12, 37, 'ice-heal')
    ]
  },
  // Wilde Pokémon der neuen Gebiete nach den Platin-Daten
  _maps: {
    route_205_north: { encounters: { grassRate: 30, grass: [{ species: 399, min: 12, max: 14, weight: 30 }, { species: 406, min: 12, max: 14, weight: 28 }, { species: 265, min: 13, max: 13, weight: 10 }, { species: 401, min: 12, max: 12, weight: 10 }, { species: 266, min: 14, max: 14, weight: 10 }, { species: 268, min: 14, max: 14, weight: 10 }, { species: 267, min: 15, max: 15, weight: 1 }, { species: 269, min: 15, max: 15, weight: 1 }], waterRate: 10, water: [{ species: 54, min: 20, max: 30, weight: 90 }, { species: 55, min: 20, max: 40, weight: 10 }] } },
    fuego_ironworks: { encounters: { grassRate: 30, grass: [{ species: 126, min: 28, max: 29, weight: 30 }, { species: 81, min: 28, max: 30, weight: 30 }, { species: 419, min: 29, max: 31, weight: 25 }, { species: 423, min: 30, max: 31, weight: 15 }], waterRate: 10, water: [{ species: 72, min: 20, max: 30, weight: 60 }, { species: 422, min: 20, max: 30, weight: 30 }, { species: 73, min: 20, max: 40, weight: 9 }, { species: 423, min: 20, max: 40, weight: 1 }] } },
    route_211_west: { encounters: { grassRate: 30, grass: [{ species: 307, min: 13, max: 15, weight: 40 }, { species: 399, min: 14, max: 14, weight: 20 }, { species: 433, min: 14, max: 16, weight: 15 }, { species: 66, min: 14, max: 15, weight: 15 }, { species: 436, min: 14, max: 16, weight: 10 }] } },
    route_211_east: { encounters: { grassRate: 30, grass: [{ species: 307, min: 27, max: 29, weight: 40 }, { species: 75, min: 28, max: 28, weight: 20 }, { species: 433, min: 28, max: 30, weight: 15 }, { species: 67, min: 29, max: 30, weight: 15 }, { species: 436, min: 29, max: 29, weight: 10 }] } },
    mt_coronet_north: { encounters: { caveRate: 10, cave: [{ species: 436, min: 14, max: 14, weight: 20 }, { species: 74, min: 15, max: 15, weight: 20 }, { species: 307, min: 14, max: 16, weight: 20 }, { species: 173, min: 13, max: 13, weight: 10 }, { species: 66, min: 16, max: 16, weight: 10 }, { species: 433, min: 13, max: 15, weight: 10 }, { species: 299, min: 14, max: 14, weight: 5 }, { species: 41, min: 15, max: 15, weight: 5 }] } }
  }
};
