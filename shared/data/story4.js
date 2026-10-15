// Story Sinnoh Nord: Elyses und die VM Surfer, Barry in Fleetburg, Adam (Mineralorden) und Stärke,
// die Anschläge auf die drei Seen, Kraxler auf Route 217, Frida in Blizzach (Gletscherorden),
// das Galaktik-Hauptquartier, die Speersäule und die Zerrwelt mit Giratina.
const CENTER = (map) => ({ id: `${map}_nurse`, x: 5, y: 2, dir: 'down', look: 'nurse', name: 'Pflegerin' });
const CLERK = (map) => ({ id: `${map}_clerk`, x: 0, y: 3, dir: 'right', look: 'clerk', name: 'Verkäufer' });
const GUIDE = (map, script) => ({ id: `${map}_guide`, x: 9, y: 16, dir: 'left', look: 'worker', name: 'Arenaberater', talk: script });
const say = (who, text) => [[who, text]];
const gift = (flag, lines, after) => [{ if: '!' + flag, then: [...lines, { flag }], else: after }];
const T = (name, cls, look, prize, sight, party, intro, win, after) => ({ name, cls, look, prize, sight, party, intro: say(`${cls} ${name}`, intro), win: say(`${cls} ${name}`, win), ...(after ? { after: say(`${cls} ${name}`, after) } : {}) });
const GRUNT = (party, intro, win, extra = {}) => ({ name: 'Rüpel', cls: 'Team Galaktik', look: 'grunt', prize: 40, sight: 3, party, intro: say('Galaktik-Rüpel', intro), win: say('Galaktik-Rüpel', win), ...extra });
const hm = (name, how) => [null, `Du erhältst die VM ${name}! ${how}`];

export const TRAINERS4 = {
  grunt_cel: GRUNT([[42, 33], [435, 34]], 'Diese alte Ruine verrät uns, wo die Legenden schlafen. Und du störst!', 'Grr! Dann eben nicht. Der Boss weiß ohnehin schon alles.', { flag: 'celestic_done', sight: 2 }),
  swimmer_ole: T('Ole', 'Schwimmer', 'swimmer', 24, 3, [[72, 34], [73, 35]], 'Mitten im Meer ein Kampf? Klar!', 'Ich gehe lieber unter.'),
  fisher_karl: T('Karl', 'Angler', 'oldman', 30, 3, [[130, 35]], 'Ein Garados an der Angel! Das reicht für einen Kampf.', 'Es ist mir wieder entwischt.'),
  rival4: {
    name: 'Barry', cls: 'Rivale', look: 'rival', prize: 70, party: [[398, 35], [214, 35], [78, 35], ['rival', 38]],
    intro: [['Barry', 'Da bist du! Ich hab gehört, du hast überall gegen Team Galaktik gekämpft. Ich auch! Fast! Zeig mal, wie stark du geworden bist!']],
    win: [['Barry', 'Wahnsinn. Du bist richtig stark. Aber ich gebe nicht auf!']]
  },
  gym_steel1: T('Walter', 'Arbeiter', 'worker', 40, 3, [[436, 35], [208, 36]], 'Stahl ist härter als alles andere!', 'Rostig geworden.'),
  gym_steel2: T('Edda', 'Ass-Trainerin', 'ace', 60, 3, [[82, 36]], 'Mein Magneton zieht deine Pokémon magisch an!', 'Die Anziehung war wohl einseitig.'),
  gym_steel3: T('Bodo', 'Arbeiter', 'worker', 40, 2, [[375, 36]], 'Adam ist der härteste Arenaleiter von allen!', 'Ich bin wohl weicher als gedacht.', 'Feuer-, Kampf- und Boden-Attacken knacken Stahl am besten.'),
  leader_adam: {
    name: 'Adam', cls: 'Arenaleiter', look: 'byron', prize: 130, leader: true, flag: 'badge_mine', badge: 'Mineralorden',
    party: [[82, 37], [208, 38], [411, 41]],
    intro: [['Adam', 'Ha! Ich bin Adam, Arenaleiter von Fleetburg. Mein Sohn Veit hat mir von dir erzählt!'], ['Adam', 'Meine Stahl-Pokémon sind so unbeugsam wie ich. Zeig, was du draufhast!']],
    win: [['Adam', 'Hahaha! Du hast mich glatt geschlagen. Veit hatte recht!'], ['Adam', 'Nimm den Mineralorden. Du hast ihn verdient.']],
    after: say('Adam', 'Mit dem Mineralorden gibt es im Markt auch Top-Tränke.')
  },
  saturn1: {
    name: 'Saturn', cls: 'Commander', look: 'saturn', prize: 80, leader: true, sight: 4, flag: 'valor_done', party: [[42, 38], [435, 38], [437, 40]],
    intro: [['Saturn', 'Du kommst zu spät. Die Bombe hat den See schon fast leergefegt.'], ['Saturn', 'Ich bin Saturn, Commander von Team Galaktik. Das Wesen dieses Sees gehört jetzt uns!']],
    win: [['Saturn', 'Interessant. Du bist stärker als erwartet.'], ['Saturn', 'Aber es ist egal. Am See der Wahrheit und am See der Willenskraft sind wir schon dabei. Du kannst nicht überall sein!']]
  },
  mars2: {
    name: 'Mars', cls: 'Commander', look: 'commander', prize: 80, leader: true, sight: 3, flag: 'verity_done', party: [[42, 37], [432, 39]],
    intro: [['Mars', 'Du schon wieder! Diesmal holen wir uns das Wesen der Gefühle. Und du kannst nichts dagegen tun!']],
    win: [['Mars', 'Nicht schon wieder! Na gut. Wir haben es trotzdem geschafft. Das Wesen ist auf dem Weg ins Hauptquartier.']]
  },
  skier_ida: T('Ina', 'Skifahrerin', 'skier', 30, 3, [[459, 36], [460, 38]], 'Auf der Piste bin ich die Schnellste!', 'Ich bin gestürzt.'),
  skier_bo: T('Bo', 'Skifahrer', 'skier', 30, 3, [[215, 37], [220, 37]], 'Ein Kampf im Schnee? Super!', 'Mir ist kalt.'),
  hiker_jens: T('Jens', 'Wanderer', 'hiker', 40, 3, [[361, 38], [362, 40]], 'Hoho! Bei diesem Wetter wandern nur echte Profis!', 'Hoho! Du bist ein Profi.'),
  skier_kai: T('Kai', 'Skifahrer', 'skier', 30, 3, [[221, 39]], 'Blizzach ist gleich da vorne. Erst noch ein Kampf!', 'Na gut, fahr weiter.'),
  gym_ice1: T('Lisa', 'Skifahrerin', 'skier', 30, 3, [[459, 38], [220, 38]], 'Frida ist die coolste Arenaleiterin. Wortwörtlich!', 'Brr. Du hast mich eingefroren.'),
  gym_ice2: T('Nora', 'Ass-Trainerin', 'ace', 60, 4, [[215, 39]], 'Im Eis ist alles schneller vorbei!', 'Schneller als gedacht.'),
  gym_ice3: T('Paul', 'Skifahrer', 'skier', 30, 4, [[362, 39], [478, 40]], 'Ich bin bereit für einen kalten Kampf!', 'Zu kalt für mich.', 'Feuer-, Kampf-, Gestein- und Stahl-Attacken schmelzen Eis-Pokémon.'),
  leader_frida: {
    name: 'Frida', cls: 'Arenaleiterin', look: 'candice', prize: 140, leader: true, flag: 'badge_icicle', badge: 'Gletscherorden',
    party: [[215, 40], [221, 40], [460, 42], [478, 44]],
    intro: [['Frida', 'Hallo! Ich bin Frida, die Arenaleiterin von Blizzach. Ich gebe immer alles, mit voller Konzentration!'], ['Frida', 'Meine Eis-Pokémon sind bereit. Bist du es auch?']],
    win: [['Frida', 'Wow! Das war heiß! Du hast mein Eis geschmolzen.'], ['Frida', 'Hier ist der Gletscherorden. Du bist echt stark!']],
    after: say('Frida', 'Östlich der Stadt liegt der See der Willenskraft. Dort hab ich vorhin Leute in Raumanzügen gesehen.')
  },
  jupiter2: {
    name: 'Jupiter', cls: 'Commander', look: 'jupiter', prize: 80, leader: true, sight: 4, flag: 'acuity_done', party: [[42, 41], [435, 43]],
    intro: [['Jupiter', 'Du bist hartnäckig. Das muss man dir lassen. Aber das Wesen dieses Sees ist schon in unseren Händen.']],
    win: [['Jupiter', 'Unglaublich. Na schön. Alle drei Wesen sind im Hauptquartier in Schleiede. Komm doch und hol sie dir, wenn du dich traust!']]
  },
  grunt_hq1: GRUNT([[42, 40], [435, 40]], 'Eindringling im Hauptquartier! Haltet ihn auf!', 'Ich konnte ihn nicht aufhalten.'),
  grunt_hq2: GRUNT([[437, 41]], 'Hier geht es zum Boss. Aber nicht für dich!', 'Doch für dich, offenbar.'),
  saturn2: {
    name: 'Saturn', cls: 'Commander', look: 'saturn', prize: 80, sight: 3, party: [[454, 42], [437, 42], [435, 42]],
    intro: [['Saturn', 'Du bist bis hierher gekommen. Respekt. Aber der Boss darf nicht gestört werden.']],
    win: [['Saturn', 'Ich habe verloren. Geh zu Zyrus. Vielleicht ... bist du die einzige Hoffnung, die es noch gibt.']]
  },
  zyrus1: {
    name: 'Zyrus', cls: 'Galaktik-Boss', look: 'boss', prize: 100, leader: true, flag: 'galactic_hq_done', party: [[215, 44], [430, 46], [169, 46]],
    intro: [['Zyrus', 'Ich habe dich am See gesehen. Damals warst du nur ein Kind mit einem Pokémon aus einem Koffer.'], ['Zyrus', 'Die Wesen der drei Seen haben mir gegeben, was ich brauchte. Aus ihrer Kraft habe ich eine rote Kette geschaffen.'], ['Zyrus', 'Mit ihr rufe ich die Herrscher über Zeit und Raum. Doch zuerst räume ich dich aus dem Weg.']],
    win: [['Zyrus', 'Bemerkenswert. Aber zu spät.'], ['Zyrus', 'Die Kette ist fertig. Ich gehe zur Speersäule auf dem Kraterberg. Dort erschaffe ich eine neue Welt, ohne Gefühle, ohne Streit.'], [null, 'Zyrus verschwindet. In einem Nebenraum findest du die drei Wesen der Seen. Sie sind frei und fliegen davon.']]
  },
  mars3: {
    name: 'Mars', cls: 'Commander', look: 'commander', prize: 80, sight: 3, party: [[42, 44], [432, 46]],
    intro: [['Mars', 'Bis hierher und nicht weiter! Der Boss braucht Ruhe für das Ritual!']], win: [['Mars', 'Schon wieder... Geh, du bist sowieso nicht aufzuhalten.']]
  },
  jupiter3: {
    name: 'Jupiter', cls: 'Commander', look: 'jupiter', prize: 80, sight: 3, party: [[435, 46], [42, 44]],
    intro: [['Jupiter', 'Mars hat dich durchgelassen? Typisch. Ich nicht!']], win: [['Jupiter', 'Na gut. Sieh selbst, was der Boss erschafft.']]
  },
  zyrus2: {
    name: 'Zyrus', cls: 'Galaktik-Boss', look: 'boss', prize: 120, leader: true, party: [[461, 48], [430, 48], [169, 50], [130, 48]],
    intro: [['Zyrus', 'Sieh hin! Die Herrscher über Zeit und Raum erscheinen. Gleich gehört die Welt mir!'], ['Zyrus', 'Niemand wird mich jetzt noch aufhalten. Du schon gar nicht!']],
    win: [['Zyrus', 'Wie kann das sein? Mein Plan war perfekt!']]
  }
};

export const NPCS4 = {
  celestic_town: [
    { id: 'cel_grunt', x: 11, y: 5, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', show: '!celestic_done', trainer: 'grunt_cel' },
    { id: 'cel_elder', x: 7, y: 10, dir: 'down', look: 'oldman', name: 'Alter Mann', talk: [['Alter Mann', 'In der Ruine sind Bilder von drei uralten Pokémon. Eines davon ist in eine andere Welt verbannt worden.']] }
  ],
  celestic_center: [CENTER('celestic_center')],
  celestic_house: [
    { id: 'grandma', x: 6, y: 4, dir: 'down', look: 'oldman', name: 'Großmutter', talk: [['Großmutter', 'Danke, dass du die Ruine beschützt hast. Meine Enkelin wollte dich unbedingt treffen.']] },
    { id: 'cynthia_cel', x: 7, y: 6, dir: 'left', look: 'cynthia', name: 'Cynthia', show: ['celestic_done', '!hm_surf'], talk: 'cynthiaSurf' }
  ],
  route_218: [
    { id: 'ole', x: 15, y: 4, dir: 'down', look: 'swimmer', name: 'Schwimmer Ole', trainer: 'swimmer_ole' },
    { id: 'karl', x: 4, y: 9, dir: 'up', look: 'oldman', name: 'Angler Karl', trainer: 'fisher_karl' }
  ],
  canalave_city: [
    { id: 'barry_cv', x: 30, y: 11, dir: 'left', look: 'rival', name: 'Barry', show: '!rival4' },
    { id: 'adam_out', x: 7, y: 22, dir: 'up', look: 'byron', name: 'Adam', show: ['badge_mine', '!hm_strength'], talk: 'adamStrength' },
    { id: 'cv_sailor', x: 26, y: 15, dir: 'down', look: 'worker', name: 'Seemann', talk: [['Seemann', 'Draußen auf dem Meer liegt die Eiseninsel. Aber heute fährt kein Schiff, der Wind ist zu stark.']] }
  ],
  canalave_center: [CENTER('canalave_center')],
  canalave_mart: [CLERK('canalave_mart')],
  canalave_house: [{ id: 'cv_house', x: 2, y: 4, dir: 'right', look: 'mom', name: 'Frau', talk: [['Frau', 'Mein Junge liest jeden Tag in der Bibliothek. Er sagt, dort steht alles über die Legenden von Sinnoh.']] }],
  canalave_library: [{ id: 'librarian', x: 7, y: 5, dir: 'down', look: 'scientist', name: 'Bibliothekar', talk: [['Bibliothekar', 'Psst! Das ist eine Bibliothek. Lies dir die Bücher in den Regalen durch, sie erzählen von den Legenden der Seen.']] }],
  canalave_gym: [
    GUIDE('canalave_gym', 'guideMine'),
    { id: 'walter', x: 4, y: 13, dir: 'right', look: 'worker', name: 'Arbeiter Walter', trainer: 'gym_steel1' },
    { id: 'edda', x: 7, y: 9, dir: 'down', look: 'ace', name: 'Ass-Trainerin Edda', trainer: 'gym_steel2' },
    { id: 'bodo', x: 10, y: 5, dir: 'left', look: 'worker', name: 'Arbeiter Bodo', trainer: 'gym_steel3' },
    { id: 'adam', x: 7, y: 3, dir: 'down', look: 'byron', name: 'Adam', trainer: 'leader_adam' }
  ],
  lake_valor: [
    { id: 'saturn_valor', x: 17, y: 8, dir: 'right', look: 'saturn', name: 'Saturn', show: '!valor_done', trainer: 'saturn1' }
  ],
  lake_verity: [
    { id: 'mars_verity', x: 16, y: 7, dir: 'right', look: 'commander', name: 'Mars', show: ['valor_done', '!verity_done'], trainer: 'mars2' }
  ],
  route_216: [
    { id: 'ida_s', x: 8, y: 8, dir: 'up', look: 'skier', name: 'Skifahrerin Ina', trainer: 'skier_ida' },
    { id: 'bo_s', x: 18, y: 5, dir: 'down', look: 'skier', name: 'Skifahrer Bo', trainer: 'skier_bo' }
  ],
  route_217: [
    { id: 'jens', x: 15, y: 16, dir: 'down', look: 'hiker', name: 'Wanderer Jens', trainer: 'hiker_jens' },
    { id: 'kai_s', x: 15, y: 4, dir: 'down', look: 'skier', name: 'Skifahrer Kai', trainer: 'skier_kai' }
  ],
  route_217_house: [{ id: 'climber', x: 6, y: 4, dir: 'down', look: 'hiker', name: 'Bergsteiger', talk: 'rockClimb' }],
  snowpoint_city: [
    { id: 'sp_kid', x: 16, y: 11, dir: 'left', look: 'youngster', name: 'Junge', talk: [['Junge', 'Frida ist die Arenaleiterin hier. Sie ist immer so motiviert, dass einem richtig warm wird!']] }
  ],
  snowpoint_center: [CENTER('snowpoint_center')],
  snowpoint_mart: [CLERK('snowpoint_mart')],
  snowpoint_house: [{ id: 'sp_house', x: 6, y: 4, dir: 'down', look: 'oldman', name: 'Opa', talk: [['Opa', 'Im Tempel von Blizzach schläft ein Riese, sagt man. Aber dafür bist du noch nicht bereit.']] }],
  snowpoint_gym: [
    GUIDE('snowpoint_gym', 'guideIcicle'),
    { id: 'lisa_g', x: 7, y: 6, dir: 'down', look: 'skier', name: 'Skifahrerin Lisa', trainer: 'gym_ice1' },
    { id: 'nora_g', x: 3, y: 8, dir: 'right', look: 'ace', name: 'Ass-Trainerin Nora', trainer: 'gym_ice2' },
    { id: 'paul_g', x: 11, y: 11, dir: 'left', look: 'skier', name: 'Skifahrer Paul', trainer: 'gym_ice3' },
    { id: 'frida', x: 7, y: 3, dir: 'down', look: 'candice', name: 'Frida', trainer: 'leader_frida' }
  ],
  lake_acuity: [
    { id: 'jupiter_acuity', x: 6, y: 9, dir: 'left', look: 'jupiter', name: 'Jupiter', show: ['verity_done', 'badge_icicle', '!acuity_done'], trainer: 'jupiter2' },
    { id: 'barry_acuity', x: 3, y: 9, dir: 'right', look: 'rival', name: 'Barry', show: ['verity_done', '!badge_icicle'], talk: [['Barry', 'Hier am See ist Jupiter! Aber sie lässt niemanden durch, der nicht stark genug ist. Hol dir erst den Gletscherorden bei Frida!']] }
  ],
  galactic_hq: [
    { id: 'hq_g1', x: 3, y: 11, dir: 'right', look: 'grunt', name: 'Galaktik-Rüpel', show: '!galactic_hq_done', trainer: 'grunt_hq1' },
    { id: 'hq_g2', x: 14, y: 9, dir: 'left', look: 'grunt', name: 'Galaktik-Rüpel', show: '!galactic_hq_done', trainer: 'grunt_hq2' },
    { id: 'saturn_hq', x: 8, y: 7, dir: 'down', look: 'saturn', name: 'Saturn', show: '!galactic_hq_done', trainer: 'saturn2' },
    { id: 'zyrus_hq', x: 8, y: 3, dir: 'down', look: 'boss', name: 'Zyrus', show: '!galactic_hq_done', trainer: 'zyrus1' }
  ],
  spear_pillar: [
    { id: 'mars_sp', x: 7, y: 10, dir: 'down', look: 'commander', name: 'Mars', show: '!spear_done', trainer: 'mars3' },
    { id: 'jupiter_sp', x: 8, y: 6, dir: 'down', look: 'jupiter', name: 'Jupiter', show: '!spear_done', trainer: 'jupiter3' },
    { id: 'zyrus_sp', x: 7, y: 3, dir: 'down', look: 'boss', name: 'Zyrus', show: '!spear_done', trainer: 'zyrus2' },
    { id: 'cynthia_sp', x: 9, y: 9, dir: 'left', look: 'cynthia', name: 'Cynthia', show: 'spear_done', talk: [['Cynthia', 'Ruh dich aus. Du hast die Welt gerettet. Wenn du bereit bist, wartet in Sonnewik der letzte Orden auf dich.']] }
  ],
  distortion_world: [
    { id: 'giratina', x: 7, y: 5, dir: 'down', look: 'giratina', name: 'Giratina', show: '!spear_done', talk: 'giratina' }
  ]
};

export const TRIGGERS4 = {
  canalave_city: [{ x: 33, y: 12, w: 1, h: 3, when: '!rival4', script: 'rival4' }],
  spear_pillar: [{ x: 2, y: 2, w: 12, h: 4, when: ['beat_zyrus2', '!spear_done'], script: 'toDistortion' }],
  distortion_world: [{ x: 3, y: 7, w: 10, h: 1, when: '!spear_done', script: 'giratina' }]
};

export const SCRIPTS4 = {
  cynthiaSurf: [
    ['Cynthia', 'Du hast meiner Großmutter geholfen. Danke! Ich bin froh, dass gerade du es warst.'],
    ['Cynthia', 'Team Galaktik sucht nach den Wesen der drei Seen. Ich fürchte, sie wollen etwas Schreckliches.'],
    ['Cynthia', 'Nimm das hier. Mit Surfer kannst du über das Wasser reisen. Westlich von Jubelstadt liegt Fleetburg, dort wartet der nächste Orden.'],
    hm('Surfer', 'Lauf einfach aufs Wasser, und dein Pokémon trägt dich.'),
    { flag: 'hm_surf' }
  ],
  rival4: [
    { emote: 'barry_cv' },
    ['Barry', 'He! Du kommst gerade richtig! Ich will wissen, wer von uns jetzt stärker ist!'],
    { battle: 'rival4' },
    ['Barry', 'Okay, okay. Ich trainiere weiter. Adams Arena ist auf der anderen Seite des Kanals. Viel Glück!'],
    { flag: 'rival4' }
  ],
  adamStrength: [
    ['Adam', 'Hast du das gehört? Ein lauter Knall aus dem Osten! Er kam vom See der Kühnheit!'],
    ['Adam', 'Da steckt bestimmt Team Galaktik dahinter. Nimm das hier mit. Mit Stärke schiebst du schwere Felsblöcke aus dem Weg.'],
    hm('Stärke', 'Laufe gegen einen Felsblock, und dein Pokémon schiebt ihn beiseite.'),
    { flag: 'hm_strength' },
    ['Adam', 'Der See der Kühnheit liegt westlich von Route 214. Beeil dich!']
  ],
  rockClimb: gift('hm_rockclimb', [
    ['Bergsteiger', 'Du willst nach Blizzach? Dann brauchst du das hier. Ohne Kraxler kommst du die Felswand nicht hinauf.'],
    hm('Kraxler', 'Laufe gegen eine Felswand mit Griffen, und dein Pokémon klettert mit dir hinauf.')
  ], [['Bergsteiger', 'Pass auf dich auf. Der Schnee hier oben ist tückisch.']]),
  toDistortion: [
    [null, 'Der Himmel über der Speersäule reißt auf. Ein riesiger Schatten bricht aus einem Spalt hervor!'],
    ['Zyrus', 'Was ist das? Das war nicht geplant!'],
    ['Cynthia', 'Das ist das verbannte Pokémon aus der Legende! Es zieht uns in seine Welt!'],
    [null, 'Alles um dich herum verzerrt sich. Du stürzt in eine andere Welt.'],
    { warp: ['distortion_world', 7, 9, 'up'] }
  ],
  giratina: [
    [null, 'Ein gewaltiges Pokémon schwebt vor dir. Oben und unten scheinen hier keine Rolle zu spielen.'],
    ['Giratina', 'Gyaaaoooh!'],
    { legend: 487, level: 47 },
    [null, 'Giratina zieht sich zurück. Die Zerrwelt beruhigt sich, und ein Spalt öffnet sich über dir.'],
    { flag: 'spear_done' },
    { warp: ['spear_pillar', 7, 11, 'up'] },
    ['Cynthia', 'Du bist zurück! Zyrus ist in der Zerrwelt geblieben. Er wollte eine Welt ohne Gefühle, nun hat er eine.'],
    ['Cynthia', 'Die Herrscher über Zeit und Raum sind wieder verschwunden. Sinnoh ist gerettet. Dank dir.'],
    ['Cynthia', 'Der letzte Orden wartet in Sonnewik. Der Weg über Route 222 ist jetzt frei. Und danach sehen wir uns in der Pokémon Liga!']
  ],
  guideMine: [['Arenaberater', 'Adam setzt auf Stahl-Pokémon. Feuer, Kampf und Boden sind hier am stärksten!']],
  guideIcicle: [['Arenaberater', 'Frida liebt Eis-Pokémon. Feuer, Kampf, Gestein und Stahl helfen dir!']]
};

export const BADGES4 = [
  { flag: 'badge_mine', name: 'Mineralorden', color: '#9aa0aa' },
  { flag: 'badge_icicle', name: 'Gletscherorden', color: '#8ad0f0' }
];

// Weitere Kapitel einhaengen
import { TRAINERS5, NPCS5, TRIGGERS5, SCRIPTS5, BADGES5 } from './story5.js';
Object.assign(TRAINERS4, TRAINERS5);
Object.assign(SCRIPTS4, SCRIPTS5);
for (const [m, list] of Object.entries(NPCS5)) NPCS4[m] = [...(NPCS4[m] || []), ...list];
for (const [m, list] of Object.entries(TRIGGERS5)) TRIGGERS4[m] = [...(TRIGGERS4[m] || []), ...list];
BADGES4.push(...BADGES5);
