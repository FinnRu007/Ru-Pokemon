// Feste Stellen auf den Originalkarten: Kampfzone (Kampfareal, Ueberlebensareal, Erholungsgebiet, Route 225 bis 230). Format siehe origFix.js.
export const FIX = {
  // Kampfareal: Matrose am Anleger wie in Platin, Barry am Weg vom Hafen in die Stadt,
  // Ignaz und Volkner kaempfen auf dem Platz vor dem Tor zur Kampfzone
  fight_area: {
    ferry_fight: [11, 19, 'right'],
    barry_fa: [20, 18, 'left'],
    flint_fa: [45, 11, 'right'],
    volkner_fa: [47, 11, 'left']
  },
  // Trainer auf den Plaetzen der Originaltrainer
  route_225: {
    rolf_225: [16, 47, 'up'],
    tara_225: [11, 20, 'right'],
    ball_route_225_0: [3, 90], ball_route_225_1: [29, 74], ball_route_225_2: [10, 79], ball_route_225_3: [2, 48],
    ball_route_225_4: [2, 30], ball_route_225_5: [20, 1], ball_route_225_6: [3, 68], ball_route_225_7: [22, 18]
  },
  survival_area: {
    // Der Lehrer stand vor der Tuer des Ladens
    tutor_survival: [27, 18, 'down'],
    ball_survival_area_0: [9, 4], ball_survival_area_1: [22, 15]
  },
  route_226: {
    ronja_226: [35, 11, 'left'],
    jan_226: [88, 22, 'down'],
    ball_route_226_0: [45, 19], ball_route_226_1: [21, 13], ball_route_226_2: [18, 24]
  },
  route_227: {
    frank_227: [20, 52, 'left'],
    gustav_227: [28, 10, 'down'],
    ball_route_227_0: [23, 27], ball_route_227_1: [9, 39], ball_route_227_2: [15, 15]
  },
  // Lebensorb und Top-Elixier liegen in Platin vor dem Berg
  stark_mountain: {
    ball_stark_mountain_0: { map: 'stark_mountain_outside', x: 26, y: 8 },
    ball_stark_mountain_1: { map: 'stark_mountain_outside', x: 4, y: 24 }
  },
  route_228: {
    kurt_228: [21, 55, 'left'],
    otto_228: [11, 5, 'left'],
    ball_route_228_0: [18, 13], ball_route_228_1: [28, 26], ball_route_228_2: [26, 65], ball_route_228_3: [12, 25], ball_route_228_4: [11, 60]
  },
  route_229: {
    greta_229: [33, 16, 'left'],
    ball_route_229_0: [48, 10], ball_route_229_1: [60, 22], ball_route_229_2: [60, 4]
  },
  resort_area: {
    resort_man: { x: 6, y: 23, dir: 'up', talk: [['Gärtner', 'Im Erholungsgebiet ruhen sich die Trainer der Kampfzone aus. Die Villa dort drüben gehört jetzt dir, Champ!']] },
    ball_resort_area_0: [15, 14]
  },
  route_230: {
    lisa_230: [27, 22, 'up'],
    ball_route_230_0: [55, 11], ball_route_230_1: [36, 15]
  },
  // Buck wartet in Platin auf Route 227 am Ende der Bruecke
  _add: {
    route_227: [{
      id: 'buck_227', x: 22, y: 19, dir: 'down', look: 'youngster', name: 'Buck', show: ['champion', '!buck_joined', '!stark_done'],
      talk: [
        ['Buck', 'Hey, du bist doch der Champ! Weiter oben liegt ein Vulkan, der Kahlberg.'],
        ['Buck', 'Tief im Berg liegt der Magmastein. Er lässt ein Pokémon schlafen. Angeblich treiben sich dort Leute in Raumanzügen herum.'],
        ['Buck', 'Ich gehe gleich hinterher. Wir sehen uns im Berg!']
      ]
    }]
  },
  _maps: {
    // Wilde Pokémon am Kahlberg (pret: encounters_stark_mountain_outside)
    stark_mountain_outside: {
      encounters: {
        grassRate: 10,
        grass: [[323, 53, 53, 20], [112, 54, 54, 20], [22, 51, 53, 20], [75, 51, 53, 15], [110, 52, 52, 10], [227, 53, 53, 5], [322, 51, 51, 5], [111, 52, 52, 5]]
          .map(([species, min, max, weight]) => ({ species, min, max, weight }))
      }
    }
  },
  // Route 227: Mit dem Rad springt man in Platin ueber die Rampen (Verhalten 0xd8) westwaerts ueber
  // die kleinen Felsen dahinter. Hier als Sprung nach Westen ueber den Felsen hinter der Rampe.
  _links: [
    ['tile', 'route_227', 22, 49, '<'],
    ['tile', 'route_227', 15, 53, '<']
  ]
};
