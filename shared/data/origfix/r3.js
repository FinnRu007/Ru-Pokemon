// Feste Stellen auf den Originalkarten: Herzhofen bis Trostu, Schleiede, Weideburg, Elyses (Route 208 bis 215). Format siehe origFix.js.
const say = (who, text) => [[who, text]];
// Wilde Pokemon wie in Platin (res/field/encounters), Gewichte aus den Slot-Anteilen 20/20/10/10/10/10/5/5/4/4/1/1 und 60/30/5/4/1
const slots = (list) => list.map(([species, min, max, weight]) => ({ species, min, max, weight }));

export const FIX = {
  route_208: {
    nils: [36, 18, 'down'],
    jule: [55, 20, 'left'],
    berry_master: [58, 13, 'down'],
    ball_route_208_0: [17, 1], // carbos
    ball_route_208_1: [15, 16], // great-ball
    ball_route_208_2: [32, 10] // ether
  },
  hearthome_city: {
    // Barry wartet am Westeingang (Stelle der Begegnung mit Keira)
    barry_hh: [15, 55, 'left'],
    'trigger:rival3': { x: 13, y: 53, w: 1, h: 5 },
    hh_woman: [15, 29, 'right'],
    // Sperre zu Route 209 wie in Platin: zwei Personen vor dem Tor
    hh_guard: [57, 54, 'left'],
    'trigger:gate209': null,
    // Tor zu Route 212 im Sueden
    hh_guard2: [12, 57, 'left'],
    'trigger:gate212': { x: 10, y: 57, w: 2, h: 1 }
  },
  route_209: {
    mona: [32, 48, 'down'],
    otto: [10, 53, 'down'],
    ball_route_209_0: [15, 36], // great-ball
    ball_route_209_1: [45, 48], // hyper-potion
    ball_route_209_2: [36, 2], // calcium
    ball_route_209_3: [60, 20], // tm47
    ball_route_209_4: [56, 54], // tm19
    ball_route_209_5: [44, 31] // ether
  },
  solaceon_town: {
    sol_man: [25, 10, 'down'],
    ball_solaceon_town_0: [40, 22], // pp-up
    ball_solaceon_town_1: [50, 13] // rare-candy
  },
  route_210: {
    lutz: [11, 83, 'right'],
    greta: [19, 57, 'down'],
    // Die Enton sitzen im Engpass noerdlich des Cafes (zwei Felder breit)
    psy1: [16, 43, 'down'],
    psy2: [17, 43, 'down'],
    psy3: [16, 42, 'down'],
    // Im Nebel auf Route 210 Nord
    rico: { map: 'route_210_north', x: 54, y: 10, dir: 'right' },
    bruno: { map: 'route_210_north', x: 14, y: 16, dir: 'down' },
    ball_route_210_0: [10, 54], // super-repel
    ball_route_210_1: [2, 34], // max-repel
    ball_route_210_2: [31, 2], // nest-ball
    ball_route_210_3: [18, 21], // hyper-potion
    ball_route_210_4: { map: 'route_210_north', x: 47, y: 23 }, // smoke-ball
    ball_route_210_5: { map: 'route_210_north', x: 17, y: 21 }, // wave-incense
    ball_route_210_6: { map: 'route_210_north', x: 13, y: 28 }, // tm30
    ball_route_210_7: { map: 'route_210_north', x: 71, y: 24 }, // red-shard
    ball_route_210_8: { map: 'route_210_north', x: 82, y: 14 } // zinc
  },
  route_215: {
    kim: [13, 14, 'down'],
    jo: [31, 8, 'left'],
    vera: [72, 20, 'down'],
    ball_route_215_0: [44, 4], // fist-plate
    ball_route_215_1: [50, 23], // hyper-potion
    ball_route_215_2: [24, 15], // max-ether
    ball_route_215_3: [61, 20], // full-heal
    ball_route_215_4: [85, 11], // tm34
    ball_route_215_5: [84, 0] // hp-up
  },
  veilstone_city: {
    // Rüpel in der Gasse zum Lagerhaus (Platin: zwei Wachen und ein Ausloeser dazwischen)
    wh_guard: [25, 20, 'left'],
    // Vor den drei Tueren des Galaktik-Gebaeudes
    hq_guard: [45, 14, 'down'],
    // Tor zu Route 214 im Sueden
    vs_police: [45, 62, 'right'],
    'trigger:gate214': { x: 40, y: 62, w: 11, h: 1 },
    vs_kid: { x: 23, y: 37, dir: 'down', talk: say('Junge', 'Die Arena von Hilda ist im Westen der Stadt. Sie kämpft mit Kampf-Pokémon und ist super stark!') },
    ball_veilstone_city_0: [18, 37], // full-incense
    ball_veilstone_city_1: [38, 8], // rare-candy
    ball_veilstone_city_2: [21, 8] // star-piece
  },
  route_214: {
    fritz: [15, 61, 'up'],
    ralf: [10, 51, 'right'],
    hugo_214: [17, 20, 'left'],
    // Der Zugang zum See liegt am Seeufer (Kameraleute vor dem Eingang wie in Platin)
    valor_guard: { map: 'valor_lakefront', x: 46, y: 24, dir: 'right' },
    'trigger:gateValor': null,
    ball_route_214_0: [20, 61], // big-root
    ball_route_214_1: [18, 87], // red-shard
    ball_route_214_2: [21, 38], // max-repel
    ball_route_214_3: [27, 8], // rare-candy
    ball_route_214_4: [7, 47] // magmarizer
  },
  valor_lakefront: {
    iris: [52, 52, 'left'],
    // Sperre nach Sonnewik an der Stelle aus Platin
    vl_guard: [53, 54, 'left'],
    'trigger:gate222': { x: 52, y: 53, w: 1, h: 3 },
    ball_valor_lakefront_0: [40, 47], // tm85
    ball_valor_lakefront_1: [45, 12], // ultra-ball
    ball_valor_lakefront_2: [40, 44] // iron
  },
  lake_valor: {
    saturn_valor: [33, 33, 'left'],
    ball_lake_valor_0: [53, 46] // tm25
  },
  route_213: {
    tim_s: [51, 58, 'right'],
    lea_s: [90, 42, 'left'],
    olaf_s: [85, 42, 'right'],
    hans_f: [25, 45, 'down'],
    nele_s: [28, 27, 'left'],
    piet_f: [77, 54, 'up'],
    ball_route_213_0: [49, 26], // tm05
    ball_route_213_1: [37, 31], // tm40
    ball_route_213_2: [60, 18], // yellow-shard
    ball_route_213_3: [46, 51], // max-revive
    ball_route_213_4: [86, 37], // water-stone
    ball_route_213_5: [50, 11], // pp-up
    ball_route_213_6: [77, 13] // protein
  },
  pastoria_city: {
    // In Platin gibt Cynthia den Geheimtrank am Seeufer vor dem Eingang zum See
    cynthia_pa: { map: 'valor_lakefront', x: 51, y: 24, dir: 'left' },
    pa_man: [31, 33, 'right'],
    ball_pastoria_city_0: [49, 29] // mystic-water
  },
  route_212: {
    // Der Attacken-Lehrer wohnt in Platin im Haus auf Route 212 Sued
    tutor_212: { map: 'route_212_south', x: 70, y: 15, dir: 'up' },
    ball_route_212_0: [2, 41], // tm11
    ball_route_212_1: [8, 55], // rose-incense
    ball_route_212_2: [11, 85], // elixir
    ball_route_212_3: [13, 30], // iron
    ball_route_212_4: [28, 32], // green-shard
    ball_route_212_5: { map: 'route_212_south', x: 7, y: 28 }, // full-heal
    ball_route_212_6: { map: 'route_212_south', x: 27, y: 20 }, // tm84
    ball_route_212_7: { map: 'route_212_south', x: 59, y: 14 }, // tm62
    ball_route_212_8: { map: 'route_212_south', x: 74, y: 10 }, // zinc
    ball_route_212_9: { map: 'route_212_south', x: 97, y: 3 }, // hyper-potion
    ball_route_212_10: { map: 'route_212_south', x: 99, y: 30 }, // tm06
    ball_route_212_11: { map: 'route_212_south', x: 110, y: 12 }, // revive
    ball_route_212_12: { map: 'route_212_south', x: 4, y: 8 }, // blue-shard
    ball_route_212_13: { map: 'route_212_south', x: 83, y: 17 } // elixir
  },
  celestic_town: {
    cel_grunt: [15, 10, 'down'],
    cel_elder: [14, 26, 'up'],
    ball_celestic_town_0: [21, 21] // dragon-fang
  },
  // Cynthia wartet in Platin vor der Ruine
  celestic_house: { cynthia_cel: { map: 'celestic_town', x: 18, y: 10, dir: 'left' } },
  _add: {
    hearthome_city: [{ id: 'hh_guard_b', x: 57, y: 55, dir: 'left', look: 'hiker', name: 'Wanderer', show: '!badge_relic', talk: say('Wanderer', 'Wir lassen hier niemanden nach Route 209, der Lamina noch nicht besiegt hat. Ihre Arena liegt im Osten der Stadt.') }],
    veilstone_city: [
      { id: 'wh_guard_n', x: 25, y: 19, dir: 'left', look: 'grunt', name: 'Galaktik-Rüpel', show: '!badge_cobble', talk: say('Galaktik-Rüpel', 'He, du! Das ist das Lagerhaus von Team Galaktik! Das ist kein Spielplatz für Kinder!') },
      { id: 'wh_guard_s', x: 25, y: 21, dir: 'left', look: 'grunt', name: 'Galaktik-Rüpel', show: '!badge_cobble', talk: say('Galaktik-Rüpel', 'Kleine Kinder sollten lieber in der Arena spielen. Hier hast du nichts verloren!') },
      { id: 'hq_guard_w', x: 42, y: 14, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', show: '!acuity_done', talk: say('Galaktik-Rüpel', 'Das Galaktik-Gebäude ist für Besucher geschlossen. Verschwinde!') },
      { id: 'hq_guard_e', x: 48, y: 14, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', show: '!acuity_done', talk: say('Galaktik-Rüpel', 'Wir träumen vom Universum. Und du störst!') }
    ],
    valor_lakefront: [{ id: 'vl_cam', x: 46, y: 25, dir: 'right', look: 'worker', name: 'Kameramann', show: '!badge_mine', talk: say('Kameramann', 'Das Pokémon des Sees zeigt sich nicht, wenn es Menschen spürt. Wir liegen hier auf der Lauer. Bitte nicht durchgehen!') }]
  },
  _links: [
    // Tor zum Großmoor (in diesem Spiel geschlossen)
    ['tile', 'pastoria_city', 34, 9, '#'], ['tile', 'pastoria_city', 35, 9, '#']
  ],
  _maps: {
    route_210_north: {
      weather: 'fog',
      encounters: {
        grassRate: 30, grass: slots([[333, 27, 27, 20], [400, 28, 28, 20], [123, 27, 29, 15], [307, 27, 29, 20], [66, 28, 29, 15], [67, 29, 30, 10]]),
        waterRate: 10, water: slots([[54, 20, 30, 90], [55, 20, 40, 10]])
      },
      events: [
        { x: 8, y: 17, type: 'text', text: 'Route 210  Westen: Elyses. Dichter Nebel liegt über dem Weg.' },
        { x: 82, y: 4, type: 'text', text: 'Haus von Oma Wilma' }
      ]
    },
    route_212_south: {
      weather: 'rain',
      encounters: {
        grassRate: 30, grass: slots([[422, 23, 26, 45], [195, 24, 26, 30], [418, 23, 25, 15], [453, 24, 25, 10]]),
        waterRate: 10, water: slots([[422, 20, 30, 60], [72, 20, 30, 30], [423, 20, 40, 9], [73, 20, 40, 1]])
      },
      events: [
        { x: 122, y: 13, type: 'text', text: 'Route 212  Süden: Weideburg' },
        { x: 68, y: 15, type: 'text', text: 'Splitter gesucht! Hier werden Attacken gelehrt.' }
      ]
    },
    route_212: { weather: 'rain' },
    route_215: { weather: 'rain' },
    hearthome_city: {
      events: [
        { x: 33, y: 51, type: 'text', text: 'Herzhofen: Die Stadt, in der sich Herzen begegnen. Osten: Route 209  Süden: Route 212' },
        { x: 28, y: 21, type: 'text', text: 'Wettbewerbshalle. Heute findet keine Vorführung statt.' },
        { x: 31, y: 19, type: 'text', text: 'Wettbewerbshalle. Heute findet keine Vorführung statt.' },
        { x: 47, y: 25, type: 'text', text: 'Arena von Herzhofen. Leiterin: Lamina' },
        { x: 38, y: 25, type: 'text', text: 'Hier wohnt niemand. Die Tür ist abgeschlossen.' },
        { x: 13, y: 52, type: 'text', text: 'Westen: Route 208  Süden: Route 212' },
        { x: 50, y: 53, type: 'text', text: 'Osten: Route 209 nach Trostu' }
      ]
    },
    solaceon_town: {
      events: [
        { x: 20, y: 27, type: 'text', text: 'Trostu: Ein ruhiges Dorf, in dem die Zeit langsamer vergeht. Norden: Route 210' },
        { x: 12, y: 5, type: 'text', text: 'Pokémon-Pension. Wir ziehen deine Pokémon groß.' }
      ]
    },
    route_210: {
      events: [
        { x: 19, y: 87, type: 'text', text: 'Route 210  Osten: Route 215 nach Schleiede  Norden: Elyses' },
        { x: 20, y: 52, type: 'text', text: 'Café am Wegesrand. Frische Milch.' }
      ]
    },
    veilstone_city: {
      events: [
        { x: 25, y: 36, type: 'text', text: 'Schleiede: Die Stadt, die aus dem Fels gemeißelt wurde. Süden: Route 214' },
        { x: 57, y: 40, type: 'text', text: 'Ein Meteorit. Er soll vor langer Zeit vom Himmel gefallen sein.' },
        { x: 59, y: 46, type: 'text', text: 'Ein Meteorit. Er fühlt sich seltsam warm an.' },
        { x: 24, y: 18, type: 'text', text: 'Lagerhaus von Team Galaktik. Betreten verboten!' },
        { x: 47, y: 17, type: 'text', text: 'Galaktik-Gebäude Schleiede. Wir träumen vom Universum!' },
        { x: 32, y: 27, type: 'text', text: 'Kaufhaus Schleiede' },
        { x: 16, y: 35, type: 'text', text: 'Arena von Schleiede. Leiterin: Hilda' },
        { x: 43, y: 59, type: 'text', text: 'Besucht den schönen See der Kühnheit! Gleich hinter Route 214!' }
      ]
    },
    route_214: {
      events: [
        { x: 12, y: 16, type: 'text', text: 'Route 214  Norden: Schleiede' },
        { x: 22, y: 77, type: 'text', text: 'Route 214  Süden: Seeufer der Kühnheit' }
      ]
    },
    pastoria_city: {
      events: [
        { x: 28, y: 28, type: 'text', text: 'Weideburg: Die Stadt am Rand des großen Moores. Norden: Route 212 nach Herzhofen' },
        { x: 34, y: 9, type: 'text', text: 'Großmoor-Safari. Wegen Hochwasser vorübergehend geschlossen.' },
        { x: 35, y: 9, type: 'text', text: 'Großmoor-Safari. Wegen Hochwasser vorübergehend geschlossen.' },
        { x: 17, y: 27, type: 'text', text: 'Arena von Weideburg. Leiter: Marinus' }
      ]
    }
  }
};
