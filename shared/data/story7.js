// Nach der Liga wie in Platin: Revanchen gegen die Top Vier und den Champ mit stärkeren Teams,
// das Schiff von Blizzach zur Kampfzone, Barry und sein Vater Palmer im Kampfturm, Buck und die
// letzten Galaktik-Commander am Kahlberg mit Heatran, Regigigas im Tempel von Blizzach, Dialga und
// Palkia auf der Speersäule, Cresselia auf der Vollmondinsel und Giratina in der Höhle der Umkehr.
const CENTER = (map) => ({ id: `${map}_nurse`, x: 5, y: 2, dir: 'down', look: 'nurse', name: 'Pflegerin' });
const CLERK = (map) => ({ id: `${map}_clerk`, x: 0, y: 3, dir: 'right', look: 'clerk', name: 'Verkäufer' });
const say = (who, text) => [[who, text]];
const T = (name, cls, look, prize, sight, party, intro, win, after) => ({ name, cls, look, prize, sight, party, intro: say(`${cls} ${name}`, intro), win: say(`${cls} ${name}`, win), ...(after ? { after: say(`${cls} ${name}`, after) } : {}) });

// Legendäres Pokémon: echter, fangbarer Kampf. Wer verliert, kann es später erneut versuchen.
const legend = (name, species, level, flag, intro, cry) => [
  [null, intro],
  [name, cry],
  { legend: species, level },
  { flag },
  [null, 'Es ist wieder still.']
];

// Stärkere Teams nach dem Titel (die Top Vier setzt der Eingang der Liga ohnehin jedes Mal zurück)
export const REMATCH7 = {
  e4_aaron: { flag: 'champion', party: [[469, 65], [212, 65], [416, 65], [214, 66], [452, 69]] },
  e4_bertha: { flag: 'champion', party: [[340, 65], [472, 66], [450, 67], [76, 66], [464, 69]] },
  e4_flint: { flag: 'champion', party: [[229, 66], [136, 66], [78, 66], [392, 68], [467, 69]] },
  e4_lucian: { flag: 'champion', party: [[122, 66], [196, 66], [437, 66], [65, 67], [475, 70]] },
  champ_cynthia: { flag: 'champion', party: [[442, 74], [407, 74], [468, 74], [448, 76], [350, 74], [445, 78]] }
};

export const TRAINERS7 = {
  swimmer_kira: T('Kira', 'Schwimmerin', 'swimmer', 24, 3, [[73, 50], [226, 51]], 'Bis zur Kampfzone schwimme ich in einem Zug!', 'Ich nehme beim nächsten Mal das Schiff.'),
  rival6: {
    name: 'Barry', cls: 'Rivale', look: 'rival', prize: 90, sight: 4, flag: 'rival6', party: [[398, 61], [214, 60], [78, 60], [143, 63], [407, 60], ['rival', 65]],
    intro: [['Barry', 'Da bist du ja, Champ! Ich wusste, dass du herkommst. Hier im Kampfareal trainieren nur die Besten.'], ['Barry', 'Und mein Vater ist der Herr des Kampfturms! Aber erst kämpfst du gegen mich!']],
    win: [['Barry', 'Wieder verloren! Aber ich bin näher dran als je zuvor, oder?'], ['Barry', 'Geh in den Kampfturm. Mein Vater Palmer wartet ganz oben. Er ist noch stärker als ich!']]
  },
  tower_leni: T('Leni', 'Ass-Trainerin', 'ace', 60, 2, [[373, 62], [248, 62]], 'Im Kampfturm gibt es keine Pause. Bereit?', 'Du bist wirklich ein Champ.'),
  tower_jakob: T('Jakob', 'Ass-Trainer', 'ace', 60, 2, [[445, 62], [212, 62]], 'Nur wer mich besiegt, darf zu Palmer!', 'Na gut, geh weiter.'),
  tower_selma: T('Selma', 'Psycho', 'psychic', 40, 2, [[282, 62], [475, 62], [65, 63]], 'Ich habe deinen Sieg schon gesehen. Aber nicht heute!', 'Meine Vision war falsch.'),
  tower_bernd: T('Bernd', 'Veteran', 'oldman', 60, 2, [[248, 63], [306, 63], [464, 64]], 'Ich kämpfe schon im Turm, seit es ihn gibt.', 'Du hast es verdient, Palmer zu sehen.'),
  palmer: {
    name: 'Palmer', cls: 'Turmherr', look: 'leader', prize: 200, leader: true, sight: 3, flag: 'tower_done', party: [[464, 66], [350, 66], [149, 68]],
    intro: [['Palmer', 'Du bist also der Freund, von dem Barry ständig erzählt. Ich bin Palmer, Herr des Kampfturms.'], ['Palmer', 'Barry sagt, du bist der stärkste Trainer, den er kennt. Zeig mir, ob er recht hat!']],
    win: [['Palmer', 'Großartig! Jetzt verstehe ich, warum Barry dir immer hinterherrennt.'], ['Palmer', 'Komm jederzeit wieder. Der Kampfturm steht dir offen.']],
    after: say('Palmer', 'Barry trainiert jeden Tag, um dich einzuholen. Pass auf, eines Tages schafft er es!')
  },
  ace_rolf: T('Rolf', 'Ass-Trainer', 'ace', 60, 3, [[59, 55], [230, 55]], 'Auf Route 225 trainieren nur echte Profis.', 'Du bist eine Klasse für sich.'),
  ace_tara: T('Tara', 'Ass-Trainerin', 'ace', 60, 3, [[36, 54], [407, 55]], 'Ein Champ auf meiner Route? Das will ich sehen!', 'Gesehen und verloren.'),
  hiker_gustav: T('Gustav', 'Wanderer', 'hiker', 40, 3, [[76, 56], [208, 56]], 'Hoho! Die Asche hier oben macht mich nur noch stärker!', 'Hoho! Ich brauche einen Schluck Wasser.'),
  ace_frank: T('Frank', 'Ass-Trainer', 'ace', 60, 3, [[59, 57], [461, 57]], 'Am Kahlberg ist es heiß. Mein Kampfgeist auch!', 'Abgekühlt.'),
  ace_paula: T('Paula', 'Ass-Trainerin', 'ace', 60, 3, [[477, 58], [460, 58]], 'Tief im Berg wohnt etwas Gewaltiges. Bist du stark genug dafür?', 'Du bist stark genug.'),
  mars_stark: {
    name: 'Mars', cls: 'Commander', look: 'commander', prize: 120, sight: 2, party: [[437, 58], [169, 58], [432, 60]],
    intro: [['Mars', 'Du schon wieder! Zyrus ist fort, aber Charon sagt, mit dem Magmastein bauen wir alles neu auf!']],
    win: [['Mars', 'Immer du. Vielleicht sollte ich mir wirklich etwas anderes suchen.']]
  },
  jupiter_stark: {
    name: 'Jupiter', cls: 'Commander', look: 'jupiter', prize: 120, sight: 2, party: [[437, 58], [169, 59], [435, 60]],
    intro: [['Jupiter', 'Ich folge Charon nicht, weil ich ihn mag. Aber ohne Team Galaktik bin ich niemand. Verschwinde!']],
    win: [['Jupiter', 'Na gut. Es ist vorbei. Endgültig.']]
  }
};

export const NPCS7 = {
  snowpoint_city: [
    { id: 'temple_monk', x: 21, y: 17, dir: 'down', look: 'oldman', name: 'Mönch', show: '!champion', talk: [['Mönch', 'Im Tempel schläft ein uraltes Pokémon. Nur der Champ der Pokémon Liga darf ihn betreten.']] },
    { id: 'temple_monk2', x: 23, y: 17, dir: 'left', look: 'oldman', name: 'Mönch', show: 'champion', talk: [['Mönch', 'Du bist der Champ? Dann darfst du in den Tempel. Weck den Riesen nicht zu laut.']] },
    { id: 'harbor_guard', x: 16, y: 2, dir: 'left', look: 'worker', name: 'Matrose', show: '!champion', talk: [['Matrose', 'Das Schiff zur Kampfzone fährt nur für den Champ der Pokémon Liga. Komm wieder, wenn du es geschafft hast!']] }
  ],
  north_sea: [
    { id: 'ferry_snow', x: 12, y: 16, dir: 'right', look: 'worker', name: 'Matrose', talk: 'ferryToFight' },
    { id: 'kira_s', x: 34, y: 10, dir: 'left', look: 'swimmer', name: 'Schwimmerin Kira', trainer: 'swimmer_kira' }
  ],
  fight_area: [
    { id: 'ferry_fight', x: 4, y: 11, dir: 'right', look: 'worker', name: 'Matrose', talk: 'ferryToSnow' },
    { id: 'barry_fa', x: 10, y: 16, dir: 'left', look: 'rival', name: 'Barry', show: '!rival6', trainer: 'rival6' },
    { id: 'flint_fa', x: 25, y: 12, dir: 'down', look: 'flint', name: 'Ignaz', talk: [['Ignaz', 'Hey, Champ! Volkner und ich trainieren hier jetzt jeden Tag. Er hat endlich wieder Feuer!']] },
    { id: 'volkner_fa', x: 26, y: 12, dir: 'left', look: 'volkner', name: 'Volkner', talk: [['Volkner', 'Seit du mich besiegt hast, ist mir nicht mehr langweilig. Danke dafür.']] }
  ],
  fight_center: [CENTER('fight_center')],
  fight_mart: [CLERK('fight_mart')],
  fight_house: [{ id: 'fa_house', x: 3, y: 4, dir: 'right', look: 'mom', name: 'Frau', talk: [['Frau', 'Mein Mann trainiert im Kampfturm. Ich koche nur noch für Sieger!']] }],
  battle_tower: [
    { id: 'leni_t', x: 4, y: 11, dir: 'right', look: 'ace', name: 'Ass-Trainerin Leni', trainer: 'tower_leni' },
    { id: 'jakob_t', x: 8, y: 9, dir: 'left', look: 'ace', name: 'Ass-Trainer Jakob', trainer: 'tower_jakob' },
    { id: 'selma_t', x: 4, y: 7, dir: 'right', look: 'psychic', name: 'Psycho Selma', trainer: 'tower_selma' },
    { id: 'bernd_t', x: 8, y: 5, dir: 'left', look: 'oldman', name: 'Veteran Bernd', trainer: 'tower_bernd' },
    { id: 'palmer', x: 6, y: 3, dir: 'down', look: 'leader', name: 'Palmer', trainer: 'palmer' }
  ],
  route_225: [
    { id: 'rolf_225', x: 9, y: 20, dir: 'left', look: 'ace', name: 'Ass-Trainer Rolf', trainer: 'ace_rolf' },
    { id: 'tara_225', x: 5, y: 9, dir: 'right', look: 'ace', name: 'Ass-Trainerin Tara', trainer: 'ace_tara' }
  ],
  survival_center: [CENTER('survival_center')],
  survival_mart: [CLERK('survival_mart')],
  survival_house: [{ id: 'buck_grandpa', x: 3, y: 4, dir: 'down', look: 'oldman', name: 'Opa', talk: [['Opa', 'Mein Enkel Buck ist schon wieder zum Kahlberg gelaufen. Er sagt, im Berg schläft ein Pokémon aus Magma.'], ['Opa', 'Wenn du ihn siehst, sag ihm, das Essen wird kalt.']] }],
  route_227: [
    { id: 'gustav_227', x: 10, y: 5, dir: 'down', look: 'hiker', name: 'Wanderer Gustav', trainer: 'hiker_gustav' },
    { id: 'frank_227', x: 20, y: 8, dir: 'left', look: 'ace', name: 'Ass-Trainer Frank', trainer: 'ace_frank' }
  ],
  stark_mountain: [
    { id: 'buck', x: 2, y: 8, dir: 'right', look: 'youngster', name: 'Buck', talk: 'buck' },
    { id: 'paula_sm', x: 19, y: 7, dir: 'left', look: 'ace', name: 'Ass-Trainerin Paula', trainer: 'ace_paula' }
  ],
  stark_mountain_deep: [
    { id: 'mars_sm', x: 5, y: 8, dir: 'right', look: 'commander', name: 'Mars', show: '!stark_done', trainer: 'mars_stark' },
    { id: 'jupiter_sm', x: 9, y: 7, dir: 'left', look: 'jupiter', name: 'Jupiter', show: '!stark_done', trainer: 'jupiter_stark' },
    { id: 'charon', x: 7, y: 5, dir: 'down', look: 'scientist', name: 'Charon', show: '!stark_done', talk: 'charon' },
    { id: 'heatran', x: 7, y: 3, dir: 'down', look: 'heatran', name: 'Heatran', show: ['stark_done', '!met_heatran'], talk: 'heatran' }
  ],
  snowpoint_temple: [{ id: 'regigigas', x: 7, y: 3, dir: 'down', look: 'regigigas', name: 'Regigigas', show: '!met_regigigas', talk: 'regigigas' }],
  spear_pillar: [
    { id: 'dialga', x: 6, y: 3, dir: 'down', look: 'dialga', name: 'Dialga', show: ['champion', '!met_dialga'], talk: 'dialga' },
    { id: 'palkia', x: 9, y: 3, dir: 'down', look: 'palkia', name: 'Palkia', show: ['champion', '!met_palkia'], talk: 'palkia' }
  ],
  fullmoon_island: [{ id: 'cresselia', x: 7, y: 4, dir: 'down', look: 'cresselia', name: 'Cresselia', show: '!met_cresselia', talk: 'cresselia' }],
  turnback_cave: [{ id: 'giratina2', x: 7, y: 3, dir: 'down', look: 'giratina', name: 'Giratina', show: ['champion', '!met_giratina2'], talk: 'giratina2' }]
};

export const TRIGGERS7 = {
  snowpoint_city: [{ x: 13, y: 1, w: 3, h: 1, when: '!champion', script: 'harborBlock' }],
  canalave_dock: [{ x: 7, y: 2, when: '!champion', script: 'fullmoonBlock' }]
};

export const SCRIPTS7 = {
  harborBlock: [['Matrose', 'Halt! Der Hafen ist nur für den Champ der Pokémon Liga geöffnet.'], { back: true }],
  fullmoonBlock: [['Kapitän', 'Zur Vollmondinsel fahre ich nur den Champ der Pokémon Liga.'], { back: true }],
  ferryToFight: [
    ['Matrose', 'Willkommen an Bord! Das Schiff bringt dich zur Kampfzone. Mit Surfer kannst du natürlich auch schwimmen.'],
    { ask: ['Ja', 'Nein'], yes: [['Matrose', 'Leinen los!'], { warp: ['fight_area', 4, 12, 'right'] }, [null, 'Nach einer kurzen Fahrt legt das Schiff im Kampfareal an.']], no: [['Matrose', 'Dann ein andermal.']] }
  ],
  ferryToSnow: [
    ['Matrose', 'Zurück nach Blizzach?'],
    { ask: ['Ja', 'Nein'], yes: [['Matrose', 'Leinen los!'], { warp: ['snowpoint_city', 14, 2, 'down'] }, [null, 'Das Schiff legt im Hafen von Blizzach an.']], no: [['Matrose', 'Ich warte hier.']] }
  ],
  buck: [
    { if: 'stark_done', then: [['Buck', 'Heatran ist aufgewacht! Und du hast Charon aufgehalten. Du bist echt der Champ.']],
      else: [['Buck', 'Ich bin Buck. Ich trainiere hier am Kahlberg, weil es hier so schön heiß ist!'], ['Buck', 'Aber tief im Berg sind komische Leute in Raumanzügen. Sie wollen den Magmastein stehlen. Ohne den Stein wacht das Pokémon im Berg nie auf!']] }
  ],
  charon: [
    { if: ['beat_mars_stark', 'beat_jupiter_stark'],
      then: [
        ['Charon', 'Was? Mars und Jupiter haben verloren? Gegen ein Kind?'],
        ['Charon', 'Mit dem Magmastein hätte ich die Legende von Heatran beherrscht. Und dann ganz Sinnoh!'],
        [null, 'Die Erde bebt. Charon stolpert und lässt den Magmastein fallen.'],
        ['Charon', 'Nein! Gut, gut. Ich gehe ja schon. Aber ihr hört noch von mir!'],
        { flag: 'stark_done' },
        [null, 'Tief im Berg glüht etwas auf. Ein Pokémon ist erwacht.']
      ],
      else: [['Charon', 'Ah, Besuch. Meine Leute werden sich gern um dich kümmern.']] }
  ],
  heatran: legend('Heatran', 485, 50, 'met_heatran', 'Aus dem Magma steigt ein gewaltiges Pokémon. Es ist Heatran, geweckt durch den Magmastein.', 'Grrroooh!'),
  regigigas: legend('Regigigas', 486, 70, 'met_regigigas', 'Eine riesige Gestalt aus Stein und Eis steht reglos im Tempel. Plötzlich leuchten ihre Augen auf.', 'Gigaaas!'),
  dialga: legend('Dialga', 483, 70, 'met_dialga', 'Die Zeit auf der Speersäule scheint stillzustehen. Dialga, der Herrscher über die Zeit, ist zurück.', 'Gyaaahh!'),
  palkia: legend('Palkia', 484, 70, 'met_palkia', 'Der Raum um dich herum verzerrt sich. Palkia, der Herrscher über den Raum, ist zurück.', 'Gyaaaah!'),
  cresselia: legend('Cresselia', 488, 50, 'met_cresselia', 'Im Mondlicht schwebt ein anmutiges Pokémon über der Lichtung. Es ist Cresselia, das Pokémon der schönen Träume.', 'Fiiiu!'),
  giratina2: [
    { ifOwn: 487,
      then: [[null, 'Ein Schatten zieht durch die Höhle. Giratina sieht dich lange an und verschwindet in seiner Welt.'], { flag: 'met_giratina2' }],
      else: legend('Giratina', 487, 47, 'met_giratina2', 'Die Höhle verzerrt sich. Giratina ist aus der Zerrwelt zurückgekehrt.', 'Gyaaaoooh!') }
  ]
};
