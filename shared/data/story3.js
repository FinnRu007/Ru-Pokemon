// Story Sinnoh Mitte: Barry in Herzhofen, Lamina (Reliktorden), Trostu, Route 210 mit den Enton,
// Hilda in Schleiede (Pfahlorden), das Galaktik-Lagerhaus mit der VM Fliegen, das Seeufer,
// Marinus in Weideburg (Sumpforden) und Cynthia mit dem Geheimtrank.
const CENTER = (map) => ({ id: `${map}_nurse`, x: 5, y: 2, dir: 'down', look: 'nurse', name: 'Pflegerin' });
const CLERK = (map) => ({ id: `${map}_clerk`, x: 0, y: 3, dir: 'right', look: 'clerk', name: 'Verkäufer' });
const GUIDE = (map, script) => ({ id: `${map}_guide`, x: 9, y: 16, dir: 'left', look: 'worker', name: 'Arenaberater', talk: script });
const say = (who, text) => [[who, text]];
const gift = (flag, lines, after) => [{ if: '!' + flag, then: [...lines, { flag }], else: after }];
const T = (name, cls, look, prize, sight, party, intro, win, after) => ({ name, cls, look, prize, sight, party, intro: say(`${cls} ${name}`, intro), win: say(`${cls} ${name}`, win), ...(after ? { after: say(`${cls} ${name}`, after) } : {}) });
const GRUNT = (party, intro, win, extra = {}) => ({ name: 'Rüpel', cls: 'Team Galaktik', look: 'grunt', prize: 30, sight: 3, party, intro: say('Galaktik-Rüpel', intro), win: say('Galaktik-Rüpel', win), ...extra });

export const TRAINERS3 = {
  rival3: {
    name: 'Barry', cls: 'Rivale', look: 'rival', prize: 60, party: [[397, 23], [418, 23], [77, 24], ['rival', 26]],
    intro: [['Barry', 'Da bist du ja! Ich hab schon zwei Orden mehr gesammelt als du. Oder so ähnlich. Egal, Kampf!']],
    win: [['Barry', 'Waaas? Schon wieder verloren! Ich muss härter trainieren. Viel härter!']]
  },
  // Arena Herzhofen
  gym_ghost1: T('Erik', 'Ass-Trainer', 'ace', 50, 2, [[200, 23]], 'Hast du Angst im Dunkeln? Meine Pokémon lieben es!', 'Das war gruselig gut.'),
  gym_ghost2: T('Elvira', 'Psycho', 'psychic', 30, 4, [[92, 22], [93, 23]], 'Die Geister haben mir deine Niederlage vorhergesagt!', 'Die Geister haben gelogen.', 'Normal- und Kampf-Attacken gehen durch Geister einfach hindurch.'),
  gym_ghost3: T('Mara', 'Psycho', 'psychic', 30, 4, [[355, 24]], 'Spürst du die Kälte? Das sind meine Freunde.', 'Brrr. Du bist kälter als ich dachte.'),
  leader_lamina: {
    name: 'Lamina', cls: 'Arenaleiterin', look: 'fantina', prize: 120, leader: true, flag: 'badge_relic', badge: 'Reliktorden',
    party: [[355, 24], [93, 24], [429, 26]],
    intro: [['Lamina', 'Bonjour! Ich bin Lamina, Arenaleiterin von Herzhofen. Meine Geist-Pokémon tanzen im Kampf wie auf einer Bühne!'], ['Lamina', 'Zeig mir deinen Tanz, chéri!']],
    win: [['Lamina', 'Magnifique! Du hast meine Geister vertrieben.'], ['Lamina', 'Der Reliktorden gehört dir. Jetzt kannst du auch Hyperbälle kaufen!']],
    after: say('Lamina', 'In Schleiede wartet Hilda. Sie kämpft mit Fäusten und mit Herz!')
  },
  // Routen 209, 210, 215
  ace_mona: T('Mona', 'Ass-Trainerin', 'ace', 60, 3, [[400, 25], [397, 25]], 'Route 209 ist mein Trainingsplatz. Zeig, was du kannst!', 'Ein toller Kampf!'),
  hiker_otto: T('Otto', 'Wanderer', 'hiker', 40, 3, [[438, 25], [185, 26]], 'Hoho! Mein Mogelbaum sieht aus wie ein Baum. Ist aber keiner!', 'Hoho! Du hast ihn durchschaut.'),
  camper_lutz: T('Lutz', 'Camper', 'boy', 20, 3, [[77, 27], [78, 28]], 'Mein Gallopa rennt schneller als der Wind!', 'Zu schnell für dich war es wohl doch nicht.'),
  lass_greta: T('Greta', 'Göre', 'lass', 20, 3, [[315, 27], [407, 28]], 'Meine Blumen-Pokémon blühen im Kampf richtig auf!', 'Sie sind verwelkt.'),
  ace_rico: T('Rico', 'Ass-Trainer', 'ace', 60, 3, [[357, 30]], 'Im Nebel sieht man kaum etwas. Ich sehe trotzdem deine Niederlage!', 'Der Nebel hat mich verwirrt.'),
  psychic_ben: T('Bruno', 'Psycho', 'psychic', 30, 3, [[55, 30], [42, 30]], 'Elyses liegt hinter dem Nebel. Dort ruht eine alte Kraft.', 'Die Kraft war nicht mit mir.'),
  psychic_kim: T('Kim', 'Psycho', 'psychic', 30, 3, [[64, 28]], 'Mein Kadabra hat deinen Zug schon gesehen.', 'Es hat ihn wohl falsch gesehen.'),
  black_belt_jo: T('Jo', 'Schwarzgurt', 'worker', 40, 3, [[66, 27], [67, 28]], 'Hilda hat mich trainiert. Bereit für meine Fäuste?', 'Meine Fäuste brauchen mehr Training.'),
  ace_vera: T('Vera', 'Ass-Trainerin', 'ace', 60, 3, [[307, 28], [203, 28]], 'Im Regen kämpft es sich am besten!', 'Ich bin nass und habe verloren.'),
  // Arena Schleiede
  gym_fight1: T('Max', 'Schwarzgurt', 'worker', 40, 3, [[307, 28], [66, 28]], 'Hier zählt nur Kraft! Los geht’s!', 'Uff. Deine Kraft ist größer.'),
  gym_fight2: T('Ina', 'Ass-Trainerin', 'ace', 60, 2, [[57, 29]], 'Mein Rasaff ist immer wütend. Pass auf!', 'Jetzt ist es noch wütender.'),
  gym_fight3: T('Ken', 'Schwarzgurt', 'worker', 40, 3, [[237, 30]], 'Ein Kopfstand-Tritt, und du liegst am Boden!', 'Ich liege selbst am Boden.', 'Psycho- und Flug-Attacken treffen Kampf-Pokémon besonders hart.'),
  leader_hilda: {
    name: 'Hilda', cls: 'Arenaleiterin', look: 'maylene', prize: 120, leader: true, flag: 'badge_cobble', badge: 'Pfahlorden',
    party: [[307, 28], [67, 29], [448, 32]],
    intro: [['Hilda', 'Ich bin Hilda. Ich trainiere jeden Tag mit meinen Pokémon, Seite an Seite.'], ['Hilda', 'Ich kämpfe nicht gern gegen Freunde. Aber ich verliere noch weniger gern! Los!']],
    win: [['Hilda', 'Du bist wirklich stark. Danke für diesen ehrlichen Kampf.'], ['Hilda', 'Hier ist der Pfahlorden. Mit ihm kannst du auch Hyperheiler kaufen.']],
    after: say('Hilda', 'Team Galaktik hat im Lagerhaus der Stadt Pokémon versteckt. Bitte hilf den Leuten!')
  },
  // Galaktik-Lagerhaus
  grunt_wh1: GRUNT([[434, 28], [41, 28]], 'Das Lagerhaus ist Sperrgebiet! Die Pokémon hier gehören jetzt uns!', 'Na und? Wir haben noch mehr.'),
  grunt_wh2: GRUNT([[42, 29], [435, 30]], 'Du kommst nicht weiter! Diese Pokémon brauchen wir für unser Hauptquartier!', 'Grr! Nimm sie halt mit. Wir ziehen sowieso bald um!', { flag: 'warehouse_done' }),
  // Route 214, Seeufer, Route 213, Route 212
  hiker_fritz: T('Fritz', 'Wanderer', 'hiker', 40, 3, [[185, 30], [75, 30]], 'Hoho! Der See der Kühnheit liegt gleich da drüben.', 'Hoho! Kühn gekämpft!'),
  ruin_maniac: T('Ralf', 'Ruinenforscher', 'hiker', 40, 3, [[228, 30], [434, 30]], 'In diesen Felsen stecken uralte Geheimnisse!', 'Das größte Geheimnis ist, wie du gewonnen hast.'),
  lady_iris: T('Iris', 'Lady', 'lass', 80, 3, [[203, 31]], 'Am Seeufer zu kämpfen ist so elegant.', 'Wie unelegant von mir.'),
  swimmer_tim: T('Tim', 'Schwimmer', 'swimmer', 20, 3, [[72, 30], [279, 31]], 'Das Meer ist mein Zuhause!', 'Ich schwimme jetzt nach Hause.'),
  swimmer_lea: T('Lea', 'Schwimmerin', 'swimmer', 20, 3, [[423, 32]], 'Hast du schon mal ein Gastrodon gesehen? Hier ist eins!', 'Es ist trotzdem süß.'),
  fisher_hans: T('Hans', 'Angler', 'oldman', 30, 3, [[129, 25], [130, 31]], 'Ich habe ein Karpador geangelt. Es ist gewachsen!', 'Das ist der, der davonkam.'),
  gym_water1: T('Jan', 'Angler', 'oldman', 30, 3, [[118, 30], [119, 31]], 'Hier im Becken bin ich der König!', 'Ein König ohne Wasser.'),
  gym_water2: T('Uli', 'Schwimmer', 'swimmer', 20, 4, [[61, 31], [183, 31]], 'Marinus ist der stärkste Wrestler am Wasser!', 'Ich gehe baden.'),
  gym_water3: T('Sven', 'Schwimmer', 'swimmer', 20, 2, [[130, 32]], 'Mein Garados ist so wild wie die Brandung!', 'Die Brandung ist abgeebbt.', 'Elektro- und Pflanzen-Attacken sind gegen Wasser-Pokémon stark.'),
  leader_marinus: {
    name: 'Marinus', cls: 'Arenaleiter', look: 'wake', prize: 120, leader: true, flag: 'badge_fen', badge: 'Sumpforden',
    party: [[130, 33], [195, 34], [419, 37]],
    intro: [['Marinus', 'HAHAHA! Ich bin Marinus, der Wellenbrecher! Arenaleiter von Weideburg!'], ['Marinus', 'Meine Wasser-Pokémon rollen über dich hinweg wie eine Riesenwelle! Bereit?']],
    win: [['Marinus', 'HAHA! Was für ein Kampf! Du hast meine Welle gebrochen!'], ['Marinus', 'Der Sumpforden gehört dir. Jetzt gibt es im Markt auch Top-Tränke.']],
    after: say('Marinus', 'Cynthia war gerade in der Stadt. Sie sucht nach dir, glaube ich!')
  }
};

export const NPCS3 = {
  hearthome_city: [
    { id: 'barry_hh', x: 4, y: 12, dir: 'left', look: 'rival', name: 'Barry', show: '!rival3' },
    { id: 'hh_woman', x: 20, y: 15, dir: 'down', look: 'lass', name: 'Frau', talk: [['Frau', 'Auf dem Freundschaftsplatz treffen sich Trainer und Pokémon. Herzhofen ist die Stadt der Begegnungen.']] },
    { id: 'hh_guard', x: 31, y: 12, dir: 'left', look: 'police', name: 'Polizist', show: '!badge_relic', talk: [['Polizist', 'Route 209 ist gesperrt, bis Arenaleiterin Lamina die Herausforderer geprüft hat. Besieg sie zuerst!']] },
    { id: 'hh_guard2', x: 18, y: 24, dir: 'up', look: 'police', name: 'Polizist', show: '!warehouse_done', talk: [['Polizist', 'Route 212 steht nach dem Unwetter unter Wasser. Probier es später wieder, oder nimm den Weg über Schleiede.']] }
  ],
  hearthome_center: [CENTER('hearthome_center')],
  hearthome_mart: [CLERK('hearthome_mart')],
  hearthome_house: [{ id: 'hh_house', x: 6, y: 4, dir: 'down', look: 'oldman', name: 'Opa', talk: [['Opa', 'Im Osten, auf Route 209, steht ein alter Turm. Dort gedenken Trainer ihrer verstorbenen Pokémon. Gerade bei Nuzlocke-Läufen ein wichtiger Ort.']] }],
  hearthome_gym: [
    GUIDE('hearthome_gym', 'guideRelic'),
    { id: 'erik', x: 7, y: 6, dir: 'down', look: 'ace', name: 'Ass-Trainer Erik', trainer: 'gym_ghost1' },
    { id: 'elvira', x: 3, y: 8, dir: 'right', look: 'psychic', name: 'Psycho Elvira', trainer: 'gym_ghost2' },
    { id: 'mara', x: 11, y: 11, dir: 'left', look: 'psychic', name: 'Psycho Mara', trainer: 'gym_ghost3' },
    { id: 'lamina', x: 7, y: 3, dir: 'down', look: 'fantina', name: 'Lamina', trainer: 'leader_lamina' }
  ],
  route_209: [
    { id: 'mona', x: 8, y: 8, dir: 'up', look: 'ace', name: 'Ass-Trainerin Mona', trainer: 'ace_mona' },
    { id: 'otto', x: 20, y: 5, dir: 'down', look: 'hiker', name: 'Wanderer Otto', trainer: 'hiker_otto' }
  ],
  solaceon_town: [
    { id: 'sol_man', x: 14, y: 13, dir: 'down', look: 'oldman', name: 'Opa', talk: [['Opa', 'Nördlich von Trostu wird es neblig. Und weiter oben sitzen seit Tagen ein paar Enton mitten auf dem Weg. Die haben Kopfweh, sagt man.']] }
  ],
  solaceon_center: [CENTER('solaceon_center')],
  solaceon_mart: [CLERK('solaceon_mart')],
  solaceon_daycare: [{ id: 'daycare', x: 5, y: 4, dir: 'down', look: 'mom', name: 'Pensionsleiterin', talk: [['Pensionsleiterin', 'Hier kümmern wir uns um Pokémon, wenn ihre Trainer viel unterwegs sind. Im Moment sind leider alle Plätze belegt.']] }],
  solaceon_house: [{ id: 'sol_house', x: 2, y: 4, dir: 'right', look: 'girl', name: 'Mädchen', talk: [['Mädchen', 'In Schleiede gibt es ein riesiges Kaufhaus. Und ein Lagerhaus, in das niemand hinein darf.']] }],
  route_210: [
    { id: 'lutz', x: 7, y: 36, dir: 'down', look: 'boy', name: 'Camper Lutz', trainer: 'camper_lutz' },
    { id: 'greta', x: 4, y: 28, dir: 'right', look: 'lass', name: 'Göre Greta', trainer: 'lass_greta' },
    { id: 'psy1', x: 6, y: 22, dir: 'down', look: 'girl', name: 'Enton', show: '!psyduck_cured', talk: 'psyduck' },
    { id: 'psy2', x: 7, y: 22, dir: 'down', look: 'girl', name: 'Enton', show: '!psyduck_cured', talk: 'psyduck' },
    { id: 'psy3', x: 8, y: 22, dir: 'down', look: 'girl', name: 'Enton', show: '!psyduck_cured', talk: 'psyduck' },
    { id: 'rico', x: 7, y: 14, dir: 'down', look: 'ace', name: 'Ass-Trainer Rico', trainer: 'ace_rico' },
    { id: 'bruno', x: 5, y: 6, dir: 'right', look: 'psychic', name: 'Psycho Bruno', trainer: 'psychic_ben' }
  ],
  route_215: [
    { id: 'kim', x: 8, y: 8, dir: 'up', look: 'psychic', name: 'Psycho Kim', trainer: 'psychic_kim' },
    { id: 'jo', x: 20, y: 5, dir: 'down', look: 'worker', name: 'Schwarzgurt Jo', trainer: 'black_belt_jo' },
    { id: 'vera', x: 31, y: 8, dir: 'up', look: 'ace', name: 'Ass-Trainerin Vera', trainer: 'ace_vera' }
  ],
  veilstone_city: [
    { id: 'wh_guard', x: 25, y: 21, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', show: '!badge_cobble', talk: [['Galaktik-Rüpel', 'Das ist unser Lagerhaus. Hier gibt es nichts zu sehen. Gar nichts!']] },
    { id: 'hq_guard', x: 7, y: 23, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', show: '!acuity_done', talk: [['Galaktik-Rüpel', 'Das Hauptquartier von Team Galaktik! Hier kommt niemand rein. Unser Boss plant etwas Großes!']] },
    { id: 'vs_police', x: 18, y: 25, dir: 'up', look: 'police', name: 'Polizist', show: '!warehouse_done', talk: [['Polizist', 'Halt! Im Lagerhaus von Team Galaktik sollen gestohlene Pokémon sein. Solange wir das nicht geklärt haben, bleibt Route 214 gesperrt.']] },
    { id: 'vs_kid', x: 14, y: 15, dir: 'down', look: 'youngster', name: 'Junge', talk: [['Junge', 'Die Arena von Hilda ist oben rechts. Sie kämpft mit Kampf-Pokémon und ist super stark!']] }
  ],
  veilstone_center: [CENTER('veilstone_center')],
  veilstone_store: [CLERK('veilstone_store')],
  veilstone_house: [{ id: 'vs_house', x: 6, y: 4, dir: 'left', look: 'mom', name: 'Frau', talk: [['Frau', 'Mein Mann hat erzählt, dass Team Galaktik nachts riesige Maschinen in ihr Hauptquartier schleppt. Was die wohl vorhaben?']] }],
  veilstone_gym: [
    GUIDE('veilstone_gym', 'guideCobble'),
    { id: 'max_g', x: 4, y: 13, dir: 'right', look: 'worker', name: 'Schwarzgurt Max', trainer: 'gym_fight1' },
    { id: 'ina_g', x: 7, y: 9, dir: 'down', look: 'ace', name: 'Ass-Trainerin Ina', trainer: 'gym_fight2' },
    { id: 'ken_g', x: 10, y: 5, dir: 'left', look: 'worker', name: 'Schwarzgurt Ken', trainer: 'gym_fight3' },
    { id: 'hilda', x: 7, y: 3, dir: 'down', look: 'maylene', name: 'Hilda', trainer: 'leader_hilda' }
  ],
  galactic_warehouse: [
    { id: 'wh_g1', x: 3, y: 7, dir: 'right', look: 'grunt', name: 'Galaktik-Rüpel', show: '!warehouse_done', trainer: 'grunt_wh1' },
    { id: 'wh_g2', x: 7, y: 3, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', show: '!warehouse_done', trainer: 'grunt_wh2' },
    { id: 'wh_owner', x: 9, y: 5, dir: 'down', look: 'oldman', name: 'Lagerarbeiter', talk: 'warehouse' }
  ],
  route_214: [
    { id: 'fritz', x: 7, y: 10, dir: 'down', look: 'hiker', name: 'Wanderer Fritz', trainer: 'hiker_fritz' },
    { id: 'ralf', x: 3, y: 22, dir: 'right', look: 'hiker', name: 'Ruinenforscher Ralf', trainer: 'ruin_maniac' },
    { id: 'valor_guard', x: 1, y: 18, dir: 'right', look: 'police', name: 'Polizist', show: '!badge_mine', talk: [['Polizist', 'Der See der Kühnheit ist gerade gesperrt. Dort wurden verdächtige Leute gesehen. Wir ermitteln noch.']] }
  ],
  valor_lakefront: [
    { id: 'iris', x: 22, y: 11, dir: 'down', look: 'lass', name: 'Lady Iris', trainer: 'lady_iris' },
    { id: 'vl_guard', x: 28, y: 8, dir: 'left', look: 'police', name: 'Polizist', show: '!spear_done', talk: [['Polizist', 'Route 222 nach Sonnewik ist gesperrt. In Sonnewik ist der Strom ausgefallen, und es geht drunter und drüber.']] }
  ],
  lakefront_center: [CENTER('lakefront_center')],
  lakefront_house: [{ id: 'lf_chef', x: 5, y: 4, dir: 'down', look: 'clerk', name: 'Koch', talk: [['Koch', 'Willkommen im Restaurant am See! Heute ist leider alles ausgebucht. Ein Pokémon-Wettbewerb in Herzhofen.']] }],
  route_213: [
    { id: 'tim_s', x: 10, y: 11, dir: 'right', look: 'swimmer', name: 'Schwimmer Tim', trainer: 'swimmer_tim' },
    { id: 'lea_s', x: 24, y: 11, dir: 'left', look: 'swimmer', name: 'Schwimmerin Lea', trainer: 'swimmer_lea' },
    { id: 'hans_f', x: 16, y: 6, dir: 'down', look: 'oldman', name: 'Angler Hans', trainer: 'fisher_hans' }
  ],
  pastoria_city: [
    { id: 'cynthia_pa', x: 18, y: 10, dir: 'down', look: 'cynthia', name: 'Cynthia', show: ['badge_fen', '!secret_potion'], talk: 'cynthiaPastoria' },
    { id: 'pa_man', x: 12, y: 11, dir: 'down', look: 'oldman', name: 'Opa', talk: [['Opa', 'Weideburg liegt am großen Moor. Wer weiter nach Norden will, nimmt Route 212 nach Herzhofen.']] }
  ],
  pastoria_center: [CENTER('pastoria_center')],
  pastoria_mart: [CLERK('pastoria_mart')],
  pastoria_house: [{ id: 'pa_house', x: 2, y: 4, dir: 'right', look: 'girl', name: 'Mädchen', talk: [['Mädchen', 'Marinus ist im Fernsehen ein Wrestler! Er trägt immer eine Maske.']] }],
  pastoria_gym: [
    GUIDE('pastoria_gym', 'guideFen'),
    { id: 'jan_g', x: 3, y: 5, dir: 'right', look: 'oldman', name: 'Angler Jan', trainer: 'gym_water1' },
    { id: 'uli_g', x: 11, y: 8, dir: 'left', look: 'swimmer', name: 'Schwimmer Uli', trainer: 'gym_water2' },
    { id: 'sven_g', x: 7, y: 12, dir: 'down', look: 'swimmer', name: 'Schwimmer Sven', trainer: 'gym_water3' },
    { id: 'marinus', x: 7, y: 3, dir: 'down', look: 'wake', name: 'Marinus', trainer: 'leader_marinus' }
  ]
};

export const TRIGGERS3 = {
  hearthome_city: [
    { x: 0, y: 13, w: 1, h: 2, when: ['!rival3', 'has_starter'], script: 'rival3' },
    { x: 33, y: 13, w: 1, h: 2, when: '!badge_relic', script: 'gate209' },
    { x: 15, y: 25, w: 3, h: 1, when: '!warehouse_done', script: 'gate212' }
  ],
  veilstone_city: [{ x: 17, y: 26, w: 3, h: 1, when: '!warehouse_done', script: 'gate214' }],
  route_214: [{ x: 0, y: 18, w: 1, h: 2, when: '!badge_mine', script: 'gateValor' }],
  valor_lakefront: [{ x: 29, y: 8, w: 1, h: 2, when: '!spear_done', script: 'gate222' }]
};

export const SCRIPTS3 = {
  rival3: [
    { emote: 'barry_hh' },
    ['Barry', 'He! Warte! Du bist auch in Herzhofen? Das trifft sich super!'],
    { battle: 'rival3' },
    ['Barry', 'Ich gehe jetzt zum Freundschaftsplatz und trainiere mit meinen Pokémon. Wir sehen uns!'],
    { flag: 'rival3' }
  ],
  gate209: [['Polizist', 'Route 209 ist gesperrt, bis Arenaleiterin Lamina dich geprüft hat. Ihre Arena ist unten links!'], { back: true }],
  gate212: [['Polizist', 'Route 212 steht nach dem Unwetter unter Wasser. Nimm den Weg über Trostu und Schleiede.'], { back: true }],
  gate214: [['Polizist', 'Halt! Route 214 bleibt gesperrt, bis wir wissen, was Team Galaktik im Lagerhaus versteckt.'], { back: true }],
  gateValor: [['Polizist', 'Der See der Kühnheit ist gesperrt. Dort wurden verdächtige Leute gesehen.'], { back: true }],
  gate222: [['Polizist', 'Route 222 nach Sonnewik ist gesperrt. In Sonnewik ist der Strom ausgefallen.'], { back: true }],
  warehouse: [{ if: '!warehouse_done', then: [['Lagerarbeiter', 'Pssst! Diese Leute haben die Pokémon der ganzen Stadt hier eingesperrt. Bitte hilf uns!']],
    else: gift('hm_fly', [
      ['Lagerarbeiter', 'Die Rüpel sind weg und alle Pokémon sind frei! Danke! Das hier haben sie zurückgelassen.'],
      [null, 'Du erhältst die VM Fliegen! Drück draußen F, um zu einem Ort zu fliegen, den du schon besucht hast.']
    ], [['Lagerarbeiter', 'Die Pokémon sind alle wieder bei ihren Trainern. Danke!']]) }],
  cynthiaPastoria: [
    ['Cynthia', 'Da bist du ja. Ich habe gehört, du hast den Sumpforden gewonnen. Glückwunsch!'],
    ['Cynthia', 'Auf Route 210, nördlich von Trostu, sitzen ein paar Enton mitten auf dem Weg. Sie haben furchtbare Kopfschmerzen.'],
    ['Cynthia', 'Nimm diesen Geheimtrank. Er hilft ihnen bestimmt. Hinter ihnen liegt Elyses, die Stadt meiner Großmutter.'],
    [null, 'Du erhältst den Geheimtrank!'],
    { flag: 'secret_potion' }
  ],
  psyduck: [{ if: 'secret_potion', then: [
    [null, 'Du gibst den Enton etwas vom Geheimtrank.'],
    [null, 'Die Enton quaken erleichtert und watscheln davon. Der Weg nach Norden ist frei!'],
    { flag: 'psyduck_cured' }
  ], else: [[null, 'Ein Enton hält sich den Kopf und quakt kläglich. Es rührt sich nicht von der Stelle.']] }],
  guideRelic: [['Arenaberater', 'Lamina setzt auf Geist-Pokémon. Unlicht- und Geist-Attacken wirken hier am besten. Normal und Kampf gehen ins Leere!']],
  guideCobble: [['Arenaberater', 'Hilda kämpft mit Kampf-Pokémon. Psycho- und Flug-Attacken sind sehr effektiv!']],
  guideFen: [['Arenaberater', 'Marinus liebt Wasser-Pokémon. Elektro- und Pflanzen-Attacken helfen dir hier!']]
};

export const BADGES3 = [
  { flag: 'badge_relic', name: 'Reliktorden', color: '#8a5ac8' },
  { flag: 'badge_cobble', name: 'Pfahlorden', color: '#c87a3a' },
  { flag: 'badge_fen', name: 'Sumpforden', color: '#3a8ad8' }
];

// Weitere Kapitel einhaengen
import { TRAINERS4, NPCS4, TRIGGERS4, SCRIPTS4, BADGES4 } from './story4.js';
Object.assign(TRAINERS3, TRAINERS4);
Object.assign(SCRIPTS3, SCRIPTS4);
for (const [m, list] of Object.entries(NPCS4)) NPCS3[m] = [...(NPCS3[m] || []), ...list];
for (const [m, list] of Object.entries(TRIGGERS4)) TRIGGERS3[m] = [...(TRIGGERS3[m] || []), ...list];
BADGES3.push(...BADGES4);
