// Karten von Sinnoh bis zur ersten Arena: Zweiblattdorf, Route 201, Kraterberg-See, Sandgemme,
// Route 202, Jubelstadt, Route 203, Erzelingen-Tor, Erzelingen, Erzelingen-Mine, Route 204
// sowie alle betretbaren Innenraeume. Aussenkarten werden aus Bauanweisungen erzeugt,
// Hoehlen und Innenraeume aus ASCII-Rastern.
//
// Kacheln aussen:
//   #  Baum (blockiert)        .  Weg            ,  Wiese          "  Hohes Gras (Encounter)
//   ~  Wasser (blockiert)      =  Sand           *  Blumen         ;  Kohleboden (Erzelingen)
//   H  Gebaeude (blockiert)    D  Tuer           C  Tuer Pokemon-Center
//   S  Schild (lesbar)         F  Zaun           L  Vorsprung (nur nach Sueden, Sprung)
//   X  Fels / Klippe           G  Hoehleneingang
// Kacheln innen (Aussehen haengt von map.theme ab: house, center, mart, lab, school, gym, cave):
//   _  Boden   W  Wand   K  Theke   B  Regal   T  Tisch   Y  Pflanze   P  Geraet/PC
//   V  Fernseher/Tafel   R  Bett   U  Treppe   E  Ausgangsmatte   :  Hoehlenboden   O  Felsbrocken
//
// connections: nahtloser Uebergang am Kartenrand (north/south: newX = x + offset, east/west: newY = y + offset)
// warps: { x, y, to, tx, ty, dir } betreten loest den Wechsel aus; mit off: 'down' beim Verlassen in diese Richtung.
// buildings: Stilvorgaben fuer die Grafik ({ x, y, style }, ein Punkt im Gebaeude genuegt).

function build(w, h, ops) {
  const g = Array.from({ length: h }, () => Array(w).fill('#'));
  for (const [kind, ...a] of ops) {
    if (kind === 'rect') {
      const [x, y, rw, rh, t] = a;
      for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (g[j] && g[j][i] !== undefined) g[j][i] = t;
    } else if (kind === 'tile') {
      const [x, y, t] = a;
      g[y][x] = t;
    }
  }
  return g.map((r) => r.join(''));
}

function grid(rows) {
  const w = rows[0].length;
  rows.forEach((r, i) => { if (r.length !== w) throw new Error(`Kartenzeile ${i} hat Laenge ${r.length} statt ${w}`); });
  return { tiles: rows, width: w, height: rows.length };
}

const house = (x, y, w, h, doorX, door = 'D') => [['rect', x, y, w, h, 'H'], ['tile', doorX, y + h - 1, door]];

const HEAL_TEXT = 'Willkommen im Pokémon-Center! Wir pflegen deine Pokémon wieder gesund. ... Fertig! Wir hoffen, dich bald wiederzusehen.';

export const MAPS = {
  // ------------------------------------------------------------------ Zweiblattdorf
  twinleaf_town: {
    name: 'Zweiblattdorf', width: 20, height: 16, music: 'twinleaf',
    tiles: build(20, 16, [
      ['rect', 1, 1, 18, 13, ','],
      ['rect', 8, 0, 5, 13, '.'],
      ['rect', 5, 6, 10, 3, '.'],
      ['rect', 3, 5, 5, 1, '.'], ['rect', 13, 5, 4, 1, '.'], ['rect', 4, 12, 4, 1, '.'], ['rect', 13, 12, 3, 1, '.'],
      ['rect', 1, 6, 3, 2, '*'], ['rect', 16, 6, 3, 2, '*'], ['rect', 6, 13, 3, 1, '*'], ['rect', 12, 13, 3, 1, '*'],
      ...house(2, 2, 4, 3, 3), ...house(14, 2, 4, 3, 16), ...house(2, 9, 4, 3, 4), ...house(13, 9, 5, 3, 15),
      ['tile', 6, 7, 'S'],
      ['rect', 1, 14, 18, 1, '~']
    ]),
    connections: { north: { map: 'route_201', offset: 0 } },
    buildings: [{ x: 2, y: 2, style: 'house' }, { x: 14, y: 2, style: 'house2' }, { x: 2, y: 9, style: 'house3' }, { x: 13, y: 9, style: 'house5' }],
    events: [
      { x: 6, y: 7, type: 'text', text: 'Zweiblattdorf: Frische Brise, frisches Laub.' }
    ],
    encounters: null
  },
  route_201: {
    name: 'Route 201', width: 44, height: 14,
    tiles: build(44, 14, [
      ['rect', 1, 1, 42, 12, ','],
      ['rect', 0, 6, 44, 3, '.'],
      ['rect', 8, 9, 5, 5, '.'],
      ['rect', 3, 2, 8, 4, '"'],
      ['rect', 15, 2, 10, 3, '"'],
      ['rect', 14, 9, 8, 3, '"'],
      ['rect', 28, 9, 10, 3, '"'],
      ['rect', 26, 2, 2, 3, '#'],
      ['rect', 30, 5, 10, 1, 'L'],
      ['rect', 23, 9, 3, 2, '*'], ['rect', 1, 10, 4, 2, '*'],
      ['tile', 13, 5, 'S']
    ]),
    connections: {
      south: { map: 'twinleaf_town', offset: 0 },
      west: { map: 'lake_verity', offset: 0 },
      east: { map: 'sandgem_town', offset: 0 }
    },
    events: [{ x: 13, y: 5, type: 'text', text: 'Route 201  West: Kraterberg-See  Ost: Sandgemme' }],
    encounters: {
      grassRate: 30,
      grass: [
        { species: 396, min: 2, max: 3, weight: 45 },
        { species: 399, min: 2, max: 3, weight: 45 },
        { species: 401, min: 3, max: 3, weight: 10 }
      ]
    }
  },
  lake_verity: {
    name: 'Kraterberg-See', width: 24, height: 16,
    tiles: build(24, 16, [
      ['rect', 1, 1, 22, 14, ','],
      ['rect', 14, 6, 10, 3, '.'],
      ['rect', 2, 2, 12, 11, '='],
      ['rect', 3, 3, 10, 9, '~'],
      ['rect', 15, 2, 6, 3, '"'],
      ['rect', 15, 10, 6, 3, '"'],
      ['rect', 20, 13, 3, 2, '*']
    ]),
    connections: { east: { map: 'route_201', offset: 0 } },
    events: [],
    encounters: {
      grassRate: 30,
      grass: [
        { species: 396, min: 2, max: 4, weight: 40 },
        { species: 399, min: 2, max: 4, weight: 40 },
        { species: 54, min: 3, max: 4, weight: 20 }
      ]
    }
  },
  // ------------------------------------------------------------------ Sandgemme
  sandgem_town: {
    name: 'Sandgemme', width: 24, height: 18,
    tiles: build(24, 18, [
      ['rect', 1, 1, 22, 14, ','],
      ['rect', 1, 14, 22, 1, '='],
      ['rect', 0, 6, 24, 3, '.'],
      ['rect', 10, 0, 5, 9, '.'],
      ['rect', 10, 8, 3, 7, '.'],
      ['rect', 5, 5, 1, 1, '.'], ['rect', 17, 5, 1, 1, '.'], ['rect', 13, 12, 5, 1, '.'], ['rect', 6, 14, 4, 1, '.'],
      ['rect', 20, 10, 3, 3, '*'], ['rect', 1, 2, 2, 3, '*'],
      ...house(3, 2, 5, 3, 5), ...house(16, 2, 4, 3, 17),
      ...house(3, 10, 6, 4, 6),
      ...house(15, 9, 5, 3, 17, 'C'),
      ['rect', 1, 15, 22, 2, '~'],
      ['tile', 9, 5, 'S']
    ]),
    connections: { west: { map: 'route_201', offset: 0 }, north: { map: 'route_202', offset: -5 } },
    buildings: [{ x: 3, y: 2, style: 'house4' }, { x: 16, y: 2, style: 'mart' }, { x: 3, y: 10, style: 'lab' }, { x: 15, y: 9, style: 'center' }],
    events: [
      { x: 9, y: 5, type: 'text', text: 'Sandgemme: Die Stadt mit dem Sand der Zeit.' }
    ],
    encounters: null
  },
  route_202: {
    name: 'Route 202', width: 16, height: 36,
    tiles: build(16, 36, [
      ['rect', 1, 1, 14, 34, ','],
      ['rect', 5, 0, 5, 36, '.'],
      ['rect', 2, 5, 12, 5, '"'],
      ['rect', 2, 18, 12, 4, '"'],
      ['rect', 9, 27, 6, 5, '"'],
      ['rect', 1, 12, 3, 3, '*'], ['rect', 11, 13, 3, 2, '*'],
      ['tile', 4, 33, 'S']
    ]),
    connections: { south: { map: 'sandgem_town', offset: 5 }, north: { map: 'jubilife_city', offset: 9 } },
    events: [{ x: 4, y: 33, type: 'text', text: 'Route 202  Nord: Jubelstadt' }],
    encounters: {
      grassRate: 30,
      grass: [
        { species: 396, min: 3, max: 4, weight: 30 },
        { species: 399, min: 3, max: 4, weight: 30 },
        { species: 403, min: 3, max: 4, weight: 30 },
        { species: 401, min: 3, max: 4, weight: 10 }
      ]
    }
  },
  // ------------------------------------------------------------------ Jubelstadt
  jubilife_city: {
    name: 'Jubelstadt', width: 32, height: 26,
    tiles: build(32, 26, [
      ['rect', 1, 1, 30, 24, ','],
      ['rect', 14, 0, 5, 26, '.'],
      ['rect', 0, 12, 32, 3, '.'],
      ['rect', 6, 7, 1, 5, '.'], ['rect', 25, 7, 1, 5, '.'], ['rect', 5, 20, 1, 2, '.'], ['rect', 24, 21, 1, 2, '.'], ['rect', 11, 20, 1, 2, '.'],
      ['rect', 1, 21, 5, 3, '*'], ['rect', 10, 8, 3, 3, '*'], ['rect', 20, 8, 2, 3, '*'], ['rect', 27, 22, 3, 2, '*'],
      ...house(3, 3, 7, 4, 6),
      ...house(22, 3, 7, 4, 25),
      ...house(3, 17, 6, 3, 5, 'C'),
      ...house(22, 17, 7, 4, 24),
      ...house(10, 17, 4, 3, 11),
      ['tile', 13, 22, 'S']
    ]),
    connections: { south: { map: 'route_202', offset: -9 }, north: { map: 'route_204', offset: -9 }, east: { map: 'route_203', offset: -6 } },
    buildings: [{ x: 3, y: 3, style: 'school' }, { x: 22, y: 3, style: 'tv' }, { x: 3, y: 17, style: 'center' }, { x: 22, y: 17, style: 'corp' }, { x: 10, y: 17, style: 'mart' }],
    events: [
      { x: 25, y: 6, type: 'text', text: 'Jubel-TV. Ein Schild an der Tür: Heute nur für Mitarbeiter.' },
      { x: 24, y: 20, type: 'text', text: 'Pokécom-Konzern. Die Drehtür ist verriegelt.' },
      { x: 13, y: 22, type: 'text', text: 'Jubelstadt: Die modernste Stadt Sinnohs.' }
    ],
    encounters: null
  },
  route_203: {
    name: 'Route 203', width: 40, height: 14,
    tiles: build(40, 14, [
      ['rect', 1, 1, 38, 12, ','],
      ['rect', 0, 6, 38, 3, '.'],
      ['rect', 6, 2, 9, 4, '"'],
      ['rect', 18, 9, 10, 3, '"'],
      ['rect', 30, 2, 6, 4, '"'],
      ['rect', 22, 2, 3, 3, '#'],
      ['rect', 2, 10, 4, 2, '*'],
      ['rect', 37, 0, 3, 14, 'X'],
      ['rect', 37, 6, 1, 3, '.'],
      ['tile', 38, 7, 'G'],
      ['tile', 36, 9, 'S']
    ]),
    connections: { west: { map: 'jubilife_city', offset: 6 } },
    events: [{ x: 36, y: 9, type: 'text', text: 'Route 203  Ost: Erzelingen-Tor, dahinter Erzelingen' }],
    encounters: {
      grassRate: 30,
      grass: [
        { species: 396, min: 4, max: 6, weight: 20 },
        { species: 399, min: 4, max: 6, weight: 20 },
        { species: 403, min: 4, max: 6, weight: 20 },
        { species: 401, min: 5, max: 5, weight: 10 },
        { species: 63, min: 4, max: 6, weight: 15 },
        { species: 41, min: 5, max: 6, weight: 15 }
      ]
    }
  },
  route_204: {
    name: 'Route 204', width: 16, height: 30,
    tiles: build(16, 30, [
      ['rect', 1, 1, 14, 28, ','],
      ['rect', 5, 2, 5, 28, '.'],
      ['rect', 2, 4, 12, 5, '"'],
      ['rect', 1, 14, 6, 6, '"'],
      ['rect', 10, 20, 5, 5, '"'],
      ['rect', 11, 12, 3, 4, '*'],
      ['rect', 3, 0, 9, 2, 'X'],
      ['rect', 5, 1, 5, 1, '.'],
      ['tile', 7, 0, 'G'],
      ['tile', 4, 2, 'S']
    ]),
    connections: { south: { map: 'jubilife_city', offset: 9 } },
    events: [
      { x: 4, y: 2, type: 'text', text: 'Route 204  Nord: Felsige Schneise' },
      { x: 7, y: 0, type: 'text', text: 'Riesige Felsbrocken versperren den Weg. Ohne Zertrümmerer geht es hier nicht weiter.' }
    ],
    encounters: {
      grassRate: 30,
      grass: [
        { species: 406, min: 4, max: 6, weight: 20 },
        { species: 265, min: 4, max: 5, weight: 20 },
        { species: 396, min: 4, max: 6, weight: 15 },
        { species: 399, min: 4, max: 6, weight: 15 },
        { species: 403, min: 4, max: 6, weight: 10 },
        { species: 401, min: 4, max: 6, weight: 10 },
        { species: 41, min: 5, max: 5, weight: 10 }
      ]
    }
  },
  // ------------------------------------------------------------------ Erzelingen-Tor (Hoehle)
  oreburgh_gate: {
    name: 'Erzelingen-Tor', indoor: true, theme: 'cave',
    ...grid([
      'XXXXXXXXXXXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXXXXXXXXXXX',
      'XX::::XXXX::::::XXX:::XX',
      'X::::::XX::::O:::X::::XX',
      'X:::O:::::::::::::::::XX',
      'G:::::::::XXX::::::::::G',
      'X:::::::::XXX:::::O::::X',
      'X::XX::::::::::::::::::X',
      'X::XX:::O:::XXX::::::::X',
      'XX:::::::::XXXXX::::::XX',
      'XXXXXXXXXXXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXXXXXXXXXXX'
    ]),
    events: [],
    encounters: {
      caveRate: 10,
      cave: [
        { species: 41, min: 5, max: 7, weight: 50 },
        { species: 74, min: 5, max: 7, weight: 40 },
        { species: 66, min: 6, max: 7, weight: 10 }
      ]
    }
  },
  // ------------------------------------------------------------------ Erzelingen
  oreburgh_city: {
    name: 'Erzelingen', width: 30, height: 26,
    tiles: build(30, 26, [
      ['rect', 2, 1, 27, 24, ','],
      ['rect', 0, 0, 2, 26, 'X'],
      ['tile', 1, 9, 'G'],
      ['rect', 2, 9, 26, 2, '.'],
      ['rect', 14, 2, 2, 21, '.'],
      ['rect', 2, 17, 12, 7, ';'],
      ['rect', 2, 24, 12, 1, 'X'],
      ['tile', 7, 24, 'G'],
      ['rect', 7, 11, 1, 6, '.'],
      ['rect', 5, 6, 1, 3, '.'], ['rect', 10, 6, 1, 3, '.'], ['rect', 22, 7, 1, 2, '.'],
      ['rect', 4, 15, 4, 1, '.'], ['rect', 16, 15, 5, 1, '.'], ['rect', 16, 22, 8, 1, '.'],
      ['rect', 24, 13, 4, 3, '*'], ['rect', 9, 13, 3, 2, '*'], ['rect', 3, 1, 10, 1, '*'],
      ['rect', 26, 17, 2, 7, '#'],
      ['tile', 3, 18, 'O'], ['tile', 11, 19, 'O'], ['tile', 4, 22, 'O'], ['tile', 12, 22, 'O'], ['tile', 9, 18, 'O'],
      ...house(3, 3, 5, 3, 5, 'C'),
      ...house(9, 3, 4, 3, 10),
      ...house(18, 2, 8, 5, 22),
      ...house(3, 12, 4, 3, 4),
      ...house(18, 12, 5, 3, 20),
      ...house(21, 18, 6, 4, 23),
      ['tile', 13, 8, 'S'], ['tile', 24, 7, 'S'], ['tile', 27, 8, 'S'], ['tile', 8, 16, 'S']
    ]),
    buildings: [{ x: 3, y: 3, style: 'center' }, { x: 9, y: 3, style: 'mart' }, { x: 18, y: 2, style: 'gym' }, { x: 3, y: 12, style: 'house2' }, { x: 18, y: 12, style: 'house4' }, { x: 21, y: 18, style: 'mine' }],
    events: [
      { x: 13, y: 8, type: 'text', text: 'Erzelingen: Die Stadt, die die Energie der Erde antreibt.' },
      { x: 24, y: 7, type: 'text', text: 'Pokémon-Arena Erzelingen. Arenaleiter Veit, der felsenfeste Kumpel.' },
      { x: 27, y: 8, type: 'text', text: 'Route 207. Der Hang ist steil und schlammig. Ohne Fahrrad kommst du hier nicht hoch.' },
      { x: 8, y: 16, type: 'text', text: 'Erzelingen-Mine. Vorsicht, Bergbaubetrieb!' },
      { x: 23, y: 21, type: 'text', text: 'Kohle-Museum. Wegen Umbau geschlossen.' }
    ],
    encounters: null
  },
  oreburgh_mine: {
    name: 'Erzelingen-Mine', indoor: true, theme: 'cave',
    ...grid([
      'XXXXXXXXXXXXXXXXXXXXXXXXXX',
      'XXXG::XXXXXXXXXXXXXXXXXXXX',
      'XX::::::XXXXXX::::::::XXXX',
      'XX:::::::::::::::O::::::XX',
      'XXX:::O:::::::::::::::::XX',
      'XXX:::::XXXX::::::XXX:::XX',
      'XX::::::XXXX::::::XXX:::XX',
      'XX::::::::::::O:::::::::XX',
      'XXXX:::::::::::::::::O::XX',
      'XXXX::XXXXX:::::::::::::XX',
      'XX::::XXXXX:::XXXX::::::XX',
      'XX::O:::::::::XXXX::::::XX',
      'XX::::::::::::::::::::XXXX',
      'XXX:::::::O::::::::::XXXXX',
      'XXXXXXXXXXXXXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXXXXXXXXXXXXX'
    ]),
    events: [],
    encounters: {
      caveRate: 10,
      cave: [
        { species: 74, min: 6, max: 8, weight: 50 },
        { species: 41, min: 6, max: 8, weight: 30 },
        { species: 95, min: 7, max: 8, weight: 20 }
      ]
    }
  },

  // ------------------------------------------------------------------ Innenraeume
  twinleaf_home_1f: {
    name: 'Zuhause', indoor: true, theme: 'house', entry: { x: 4, y: 7 },
    ...grid(['WWWWWWWWWW', 'WWWWWWWWWW', 'B_V____YU_', '__________', '__TT______', '__TT______', '__________', '____E_____']),
    events: [
      { x: 2, y: 2, type: 'text', text: 'Der Fernseher zeigt eine Reportage über einen roten Gyarados in einem fernen See.' },
      { x: 0, y: 2, type: 'text', text: 'Mamas Kochbücher. „Eintopf für Trainer, die viel unterwegs sind.“' }
    ]
  },
  twinleaf_home_2f: {
    name: 'Dein Zimmer', indoor: true, theme: 'house',
    ...grid(['WWWWWWWW', 'WWWWWWWW', 'P_V___YU', '________', 'R_______', 'R___TT__', '________']),
    events: [
      { x: 0, y: 2, type: 'text', text: 'Dein PC. Im Postfach liegt eine Nachricht: „Vergiss nicht, die Laufschuhe zu benutzen! Mit Shift rennst du.“' },
      { x: 2, y: 2, type: 'text', text: 'Eine Spielkonsole. Gerade keine Zeit dafür, draußen wartet ein Abenteuer!' }
    ]
  },
  twinleaf_rival_house: {
    name: 'Haus des Rivalen', indoor: true, theme: 'house', entry: { x: 4, y: 7 },
    ...grid(['WWWWWWWWWW', 'WWWWWWWWWW', 'BB__V___Y_', '__________', '___TT_____', '___TT_____', 'Y________Y', '____E_____']),
    events: [{ x: 0, y: 2, type: 'text', text: 'Ein Regal voller Bücher über schnelle Pokémon. Jemand hat überall Eselsohren hineingemacht.' }]
  },
  twinleaf_house_a: {
    name: 'Zweiblattdorf', indoor: true, theme: 'house', entry: { x: 4, y: 7 },
    ...grid(['WWWWWWWWWW', 'WWWWWWWWWW', 'Y__B__V__Y', '__________', '_____TT___', '_____TT___', '__________', '____E_____']),
    events: []
  },
  twinleaf_house_b: {
    name: 'Zweiblattdorf', indoor: true, theme: 'house', entry: { x: 4, y: 7 },
    ...grid(['WWWWWWWWWW', 'WWWWWWWWWW', 'BB____V__Y', '__________', '_TT_______', '_TT_______', '__________', '____E_____']),
    events: []
  },
  sandgem_lab: {
    name: 'Forschungslabor', indoor: true, theme: 'lab', entry: { x: 6, y: 9 },
    ...grid(['WWWWWWWWWWWWWW', 'WWWWWWWWWWWWWW', 'BBBB__PP__BBBB', '______________', '_PP________PP_', '______________', '__TT____TT____', '__TT____TT____', '______________', '______E_______']),
    events: [
      { x: 0, y: 2, type: 'text', text: 'Dicke Ordner: „Beobachtungen zur Entwicklung von Pokémon“. Jede Seite ist voller Notizen.' },
      { x: 6, y: 2, type: 'text', text: 'Ein Analysegerät. Es summt leise vor sich hin.' }
    ]
  },
  sandgem_center: {
    name: 'Pokémon-Center', indoor: true, theme: 'center', entry: { x: 5, y: 7 },
    ...grid(['WWWWWWWWWWW', 'WWWWWWWWWWW', 'Y__P___P__Y', '___KKKKK___', '___________', '_TT_____BB_', '___________', '_____E_____']),
    events: [{ x: 5, y: 3, type: 'heal', text: HEAL_TEXT }]
  },
  sandgem_mart: {
    name: 'Pokémon-Markt', indoor: true, theme: 'mart', entry: { x: 5, y: 7 },
    ...grid(['WWWWWWWWWWW', 'WWWWWWWWWWW', '_K_________', '_K__BBB_BBB', '_K_________', '____BBB_BBB', '___________', '_____E_____']),
    events: [{ x: 1, y: 3, type: 'shop', text: 'Willkommen! Was darf es sein?' }]
  },
  sandgem_house: {
    name: 'Sandgemme', indoor: true, theme: 'house', entry: { x: 4, y: 7 },
    ...grid(['WWWWWWWWWW', 'WWWWWWWWWW', 'BB__V____Y', '__________', '___TT_____', '___TT_____', '__________', '____E_____']),
    events: []
  },
  jubilife_school: {
    name: 'Trainerschule', indoor: true, theme: 'school', entry: { x: 5, y: 8 },
    ...grid(['WWWWWWWWWWWW', 'WWWWWWWWWWWW', '___VVVV____Y', '____________', '_TT_TT_TT___', '____________', '_TT_TT_TT___', '____________', '_____E______']),
    events: [{ x: 4, y: 2, type: 'text', text: 'An der Tafel steht: „Typen merken! Wasser schlägt Feuer, Feuer schlägt Pflanze, Pflanze schlägt Wasser und Gestein.“' }]
  },
  jubilife_center: {
    name: 'Pokémon-Center', indoor: true, theme: 'center', entry: { x: 5, y: 7 },
    ...grid(['WWWWWWWWWWW', 'WWWWWWWWWWW', 'Y__P___P__Y', '___KKKKK___', '___________', '_TT_____BB_', '___________', '_____E_____']),
    events: [{ x: 5, y: 3, type: 'heal', text: HEAL_TEXT }]
  },
  jubilife_mart: {
    name: 'Pokémon-Markt', indoor: true, theme: 'mart', entry: { x: 5, y: 7 },
    ...grid(['WWWWWWWWWWW', 'WWWWWWWWWWW', '_K_________', '_K__BBB_BBB', '_K_________', '____BBB_BBB', '___________', '_____E_____']),
    events: [{ x: 1, y: 3, type: 'shop', text: 'Willkommen! Was darf es sein?' }]
  },
  oreburgh_center: {
    name: 'Pokémon-Center', indoor: true, theme: 'center', entry: { x: 5, y: 7 },
    ...grid(['WWWWWWWWWWW', 'WWWWWWWWWWW', 'Y__P___P__Y', '___KKKKK___', '___________', '_TT_____BB_', '___________', '_____E_____']),
    events: [{ x: 5, y: 3, type: 'heal', text: HEAL_TEXT }]
  },
  oreburgh_mart: {
    name: 'Pokémon-Markt', indoor: true, theme: 'mart', entry: { x: 5, y: 7 },
    ...grid(['WWWWWWWWWWW', 'WWWWWWWWWWW', '_K_________', '_K__BBB_BBB', '_K_________', '____BBB_BBB', '___________', '_____E_____']),
    events: [{ x: 1, y: 3, type: 'shop', text: 'Willkommen! Was darf es sein?' }]
  },
  oreburgh_house: {
    name: 'Erzelingen', indoor: true, theme: 'house', entry: { x: 4, y: 7 },
    ...grid(['WWWWWWWWWW', 'WWWWWWWWWW', 'Y__BB__V_Y', '__________', '___TT_____', '___TT_____', '__________', '____E_____']),
    events: [{ x: 3, y: 2, type: 'text', text: 'Bücher über Fossilien. Eines heißt: „Was die Kohle über die Urzeit erzählt“.' }]
  },
  oreburgh_house_b: {
    name: 'Erzelingen', indoor: true, theme: 'house', entry: { x: 4, y: 7 },
    ...grid(['WWWWWWWWWW', 'WWWWWWWWWW', 'BB_____V_Y', '__________', '_TT_______', '_TT_______', '__________', '____E_____']),
    events: []
  },
  oreburgh_gym: {
    name: 'Arena Erzelingen', indoor: true, theme: 'gym', entry: { x: 7, y: 17 },
    ...grid([
      'WWWWWWWWWWWWWWW',
      'WWWWWWWWWWWWWWW',
      'XXX_________XXX',
      'XXX_________XXX',
      'XXXXXX___XXXXXX',
      'X_____________X',
      'X__O_______O__X',
      'X_____XXX_____X',
      'XXXX__XXX__XXXX',
      'X_____________X',
      'X__O_______O__X',
      'X_____XXX_____X',
      'XXXXX_____XXXXX',
      'X_____________X',
      'X__Y_______Y__X',
      'X_____________X',
      'X_____________X',
      'X______E______X'
    ]),
    events: []
  }
};

// ------------------------------------------------------------------ Verbindungen
for (const m of Object.values(MAPS)) { m.warps = m.warps || []; m.events = m.events || []; }

// Tuer aussen <-> Ausgangsmatte innen
function door(outId, x, y, inId) {
  const inside = MAPS[inId]; const e = inside.entry;
  MAPS[outId].warps.push({ x, y, to: inId, tx: e.x, ty: e.y, dir: 'up' });
  inside.warps.push({ x: e.x, y: e.y, off: 'down', to: outId, tx: x, ty: y + 1, dir: 'down' });
}
// Feld betreten -> Ziel (Treppen, Hoehleneingaenge). Ankunft immer neben dem Gegenstueck.
function pass(aId, ax, ay, bId, bx, by, dir) { MAPS[aId].warps.push({ x: ax, y: ay, to: bId, tx: bx, ty: by, dir }); }

door('twinleaf_town', 3, 4, 'twinleaf_home_1f');
door('twinleaf_town', 16, 4, 'twinleaf_rival_house');
door('twinleaf_town', 4, 11, 'twinleaf_house_a');
door('twinleaf_town', 15, 11, 'twinleaf_house_b');
pass('twinleaf_home_1f', 8, 2, 'twinleaf_home_2f', 7, 3, 'down');
pass('twinleaf_home_2f', 7, 2, 'twinleaf_home_1f', 8, 3, 'down');
door('sandgem_town', 6, 13, 'sandgem_lab');
door('sandgem_town', 17, 11, 'sandgem_center');
door('sandgem_town', 17, 4, 'sandgem_mart');
door('sandgem_town', 5, 4, 'sandgem_house');
door('jubilife_city', 6, 6, 'jubilife_school');
door('jubilife_city', 5, 19, 'jubilife_center');
door('jubilife_city', 11, 19, 'jubilife_mart');
door('oreburgh_city', 5, 5, 'oreburgh_center');
door('oreburgh_city', 10, 5, 'oreburgh_mart');
door('oreburgh_city', 22, 6, 'oreburgh_gym');
door('oreburgh_city', 4, 14, 'oreburgh_house');
door('oreburgh_city', 20, 14, 'oreburgh_house_b');
pass('route_203', 38, 7, 'oreburgh_gate', 1, 5, 'right');
pass('oreburgh_gate', 0, 5, 'route_203', 37, 7, 'left');
pass('oreburgh_gate', 23, 5, 'oreburgh_city', 2, 9, 'right');
pass('oreburgh_city', 1, 9, 'oreburgh_gate', 22, 5, 'left');
pass('oreburgh_city', 7, 24, 'oreburgh_mine', 3, 2, 'down');
pass('oreburgh_mine', 3, 1, 'oreburgh_city', 7, 23, 'up');

export const SPAWN = { map: 'twinleaf_town', x: 10, y: 7, dir: 'down' };
