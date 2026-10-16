// Feste Stellen auf den Originalkarten: Fleetburg, Blizzach, Sonnewik, Pokemon Liga (Route 216 bis 224, Inseln). Format siehe origFix.js.
const ball = (map, i, x, y, item) => ({ id: `ball_${map}_${i}`, x, y, dir: 'down', look: 'item_ball', name: 'Gegenstand', item: true, show: `!got_ball_${map}_${i}`, talk: [{ find: item }, { flag: `got_ball_${map}_${i}` }] });
const S = (species, min, max, weight) => ({ species, min, max, weight });

export const FIX = {
  // ------------------------------------------------------------ Route 218 (Trainer auf den Platzen von Matrose Skyler und Angler Luc)
  route_218: {
    ole: [12, 10, 'right'],
    karl: [29, 15, 'down'],
    ball_route_218_1: [29, 23],
    ball_route_218_2: [40, 12]
  },
  // ------------------------------------------------------------ Fleetburg: Barry auf der Bruecke, Adam vor der Arena, Seemann bei Eldritchs Haus
  canalave_city: {
    barry_cv: [13, 20, 'right'],
    'trigger:rival4': { x: 15, y: 19, w: 1, h: 4 },
    adam_out: [8, 28, 'left'],
    cv_sailor: [13, 46, 'left'],
    ball_canalave_city_0: [2, 58]
  },
  // ------------------------------------------------------------ Route 216 (Skifahrerin Kaitlyn, Skifahrer Bradley)
  route_216: {
    ida_s: [54, 1, 'right'],
    bo_s: [62, 8, 'left'],
    ball_route_216_0: [89, 8],
    ball_route_216_1: [70, 5],
    ball_route_216_2: [54, 12],
    ball_route_216_3: [79, 2],
    ball_route_216_4: [81, 13],
    ball_route_216_5: [43, 27]
  },
  // ------------------------------------------------------------ Route 217: Hilda wartet am Suedeingang (wie Maylene in Platin), bis die Seen befreit sind
  route_217: {
    kai_s: [30, 88, 'down'],
    jens: [6, 40, 'up'],
    ball_route_217_0: [12, 60],
    ball_route_217_1: [17, 74],
    ball_route_217_2: [9, 102],
    ball_route_217_3: [23, 94],
    ball_route_217_4: [28, 53]
  },
  // ------------------------------------------------------------ See der Willenskraft: Jupiter und Barry wie in Platin, Baelle vom Ufer
  lake_acuity: {
    jupiter_acuity: [17, 44, 'down'],
    barry_acuity: [17, 45, 'up'],
    ball_lake_acuity_0: { map: 'acuity_lakefront', x: 52, y: 38 },
    ball_lake_acuity_1: { map: 'acuity_lakefront', x: 35, y: 43 },
    ball_lake_acuity_2: [38, 8]
  },
  // ------------------------------------------------------------ Blizzach: Tempelwache auf dem Weg zum Tempel, Ball am Hafen
  snowpoint_city: {
    temple_monk: [15, 6, 'down'],
    temple_monk2: [15, 6, 'left'],
    ball_snowpoint_city_0: [20, 53]
  },
  // ------------------------------------------------------------ Route 222 (Angler Alec, Polizist Thomas, Badende Holly)
  route_222: {
    hein: [25, 21, 'right'],
    udo: [58, 10, 'right'],
    mara_s: [51, 20, 'up'],
    ball_route_222_0: [80, 15],
    ball_route_222_1: [49, 13],
    ball_route_222_2: [73, 22],
    ball_route_222_3: [62, 14]
  },
  // ------------------------------------------------------------ Sonnewik: Jasmin auf dem Aussichtsfelsen
  sunyshore_city: {
    jasmine: [25, 5, 'right'],
    // Ignaz steht direkt vor der Arenatuer
    flint_sun: [13, 12, 'down'],
    ball_sunyshore_city_0: [49, 43],
    // stand oben auf der Kraxelwand vor dem Haus im Osten
    sun_kid: [52, 36, 'right']
  },
  // ------------------------------------------------------------ Route 223 (Schwimmer Gabrielle, Troy, Cassandra)
  route_223: {
    jonas_223: [11, 34, 'left'],
    ella: [18, 14, 'left'],
    max_s: [23, 28, 'left'],
    ball_route_223_0: [18, 41],
    ball_route_223_1: [10, 28],
    ball_route_223_2: [8, 76],
    ball_route_223_3: [26, 22]
  },
  // ------------------------------------------------------------ Pokemon Liga: Ordenskontrolle am Eingang der Siegesstrasse, Barry vor dem Liga-Gebaeude
  pokemon_league_south: {
    vr_guard: [21, 22, 'left'],
    'trigger:badgeGate': { x: 18, y: 21, w: 3, h: 1 }
  },
  pokemon_league: {
    barry_pl: [16, 17, 'left'],
    'trigger:rival5': { x: 15, y: 17, w: 1, h: 1 }
  },

  _add: {
    route_217: [{ id: 'hilda_217', x: 17, y: 127, dir: 'up', look: 'maylene', name: 'Hilda', show: '!verity_done', talk: 'hildaSnow' }],
    // Eldritchs Boot faehrt den Champ auch zur Neumondinsel
    canalave_dock: [{ id: 'newmoon_sailor', x: 8, y: 3, dir: 'down', look: 'worker', name: 'Matrose', show: 'champion', talk: 'boatToNewmoon' }],
    newmoon_island_outside: [{ id: 'boat_newmoon', x: 23, y: 21, dir: 'right', look: 'worker', name: 'Matrose', talk: 'boatToCanalave' }],
    route_224: [
      ball('route_224', 0, 20, 90, 'razor-claw'), ball('route_224', 1, 5, 50, 'rare-candy'), ball('route_224', 2, 43, 29, 'destiny-knot'),
      ball('route_224', 3, 59, 23, 'repeat-ball'), ball('route_224', 4, 40, 44, 'pp-max'), ball('route_224', 5, 50, 29, 'ultra-ball')
    ]
  },
  _scripts: {
    hildaSnow: [
      ['Hilda', 'Oh, du bist es! Willst du etwa nach Blizzach?'],
      ['Hilda', 'Weiter nördlich tobt gerade ein Schneesturm. Und an den Seen treibt sich Team Galaktik herum!'],
      ['Hilda', 'Sieh erst am See der Kühnheit und am See der Wahrheit nach dem Rechten. Danach gehen wir zusammen nach Blizzach.']
    ],
    snowBlock: [
      ['Hilda', 'Warte! Bei diesem Schneesturm kommt niemand nach Blizzach durch.'],
      ['Hilda', 'Kümmere dich erst um Team Galaktik an den Seen der Kühnheit und der Wahrheit!'],
      { back: true }
    ],
    templeBlock: [
      ['Mönch', 'Halt! Im Tempel schläft ein uraltes Pokémon. Nur der Champ der Pokémon Liga darf ihn betreten.'],
      { back: true }
    ],
    waterfallBlock: [
      [null, 'Vor dir stürzt ein gewaltiger Wasserfall herab. Ohne Kaskade kommst du hier nicht hinauf.'],
      { back: true }
    ],
    vrBackBlock: [
      [null, 'Ein Schild: Dieser Teil der Siegesstraße ist nur für den Champ der Pokémon Liga geöffnet.'],
      { back: true }
    ],
    boatToNewmoon: [
      ['Matrose', 'Du bist der Champ? Dann bringe ich dich zur Neumondinsel. Dort soll es nachts unheimlich sein.'],
      { ask: ['Ja', 'Nein'], yes: [['Matrose', 'Leinen los!'], { warp: ['newmoon_island_outside', 24, 21, 'left'] }, [null, 'Das Boot legt an der Neumondinsel an.']], no: [['Matrose', 'Dann ein andermal.']] }
    ]
  },
  _triggers: {
    // Hilda laesst erst nach Blizzach, wenn Team Galaktik an beiden Seen vertrieben ist
    route_217: [{ x: 14, y: 120, w: 2, h: 1, when: '!valor_done', script: 'snowBlock' }, { x: 14, y: 120, w: 2, h: 1, when: '!verity_done', script: 'snowBlock' }],
    // Der Weg zum Tempel ist zwei Felder breit, die Wache steht auf einem
    snowpoint_city: [{ x: 14, y: 6, w: 1, h: 1, when: '!champion', script: 'templeBlock' }],
    // Am Ende von Route 223 stuerzt der Wasserfall zur Liga herab
    route_223: [{ x: 0, y: 0, w: 32, h: 1, when: '!hm_waterfall', script: 'waterfallBlock' }],
    // Siegesstrasse: hinterer Ausgang zu Route 224 erst fuer den Champ
    victory_road: [{ x: 3, y: 19, w: 1, h: 1, when: '!champion', script: 'vrBackBlock' }]
  },
  // Iceberg-Ruinen: Eingang wie in Platin im Kraterberg (Seite von Route 216), Route 224 hinter der Siegesstrasse
  _retarget: {
    'iceberg_ruins>route_217': ['mt_coronet', 13, 2, 'right']
  },
  _links: [
    ['tile', 'mt_coronet', 12, 2, 'G'],
    ['pass', 'mt_coronet', 12, 2, 'iceberg_ruins', 7, 9, 'up'],
    ['tile', 'victory_road', 2, 19, 'G'],
    ['pass', 'victory_road', 2, 19, 'route_224', 14, 80, 'right'],
    ['tile', 'route_224', 13, 80, 'D'],
    ['pass', 'route_224', 13, 80, 'victory_road', 3, 19, 'right'],
    // Brandungsweg: in Platin oeffnet ihn der Brief von Professor Eich am Dankesstein, hier ist der Pfad offen
    ...[7, 8, 9].flatMap((y) => [['tile', 'route_224', 47, y, ','], ['tile', 'route_224', 48, y, ',']]),
    // Siegesstrasse: unten zurueck zum Eingang, oben hinaus vor die Liga
    ['pass', 'victory_road', 14, 25, 'pokemon_league_south', 19, 22, 'down'],
    ['pass', 'victory_road', 22, 1, 'pokemon_league_south', 20, 6, 'left']
  ],
  _maps: {
    // Eingang und Ausgang der Siegesstrasse getrennt (die automatische Zuordnung fuehrt beide zum Eingang)
    pokemon_league_south: {
      warps: [
        { x: 10, y: 22, to: 'league_south_center', tx: 5, ty: 7, dir: 'up' },
        ...[18, 19, 20].map((x) => ({ x, y: 21, off: 'up', to: 'victory_road', tx: 14, ty: 24, dir: 'up' })),
        ...[5, 6, 7].map((y) => ({ x: 21, y, off: 'right', to: 'victory_road', tx: 22, ty: 2, dir: 'down' }))
      ]
    },
    // Wilde Pokemon nach res/field/encounters (Platin)
    route_224: { encounters: { grassRate: 30, grass: [S(419, 50, 50, 20), S(315, 50, 50, 20), S(69, 49, 49, 20), S(279, 51, 51, 10), S(423, 49, 49, 10), S(44, 51, 51, 5), S(70, 51, 51, 5), S(267, 52, 52, 5), S(269, 52, 52, 5)], waterRate: 10, water: [S(279, 35, 55, 60), S(73, 35, 55, 30), S(423, 35, 55, 10)] } },
    acuity_lakefront: { encounters: { grassRate: 30, grass: [S(459, 32, 35, 40), S(220, 32, 34, 35), S(215, 33, 35, 25)] } },
    iron_island_outside: { encounters: { waterRate: 10, water: [S(278, 20, 30, 60), S(72, 20, 30, 30), S(279, 20, 40, 9), S(73, 20, 40, 1)] } }
  }
};
