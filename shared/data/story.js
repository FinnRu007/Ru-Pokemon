// Story bis zum ersten Orden: NPCs, Trainer, Ausloeser und Skripte. Eigene Texte, die sich lose
// an der Handlung von Platin orientieren. Server und Client nutzen dieselben Daten: der Client
// zeichnet die NPCs und kennt ihre Kollision, der Server fuehrt die Skripte aus.
//
// Bedingungen (show, when): 'flag' = gesetzt, '!flag' = nicht gesetzt, Liste = alle muessen gelten.
// Skriptschritte:
//   ['Sprecher', 'Text']        Textzeile (Sprecher null = Erzaehler)
//   { flag: 'x' }               Flag setzen            { unflag: 'x' }
//   { give: 'item', count }     Gegenstand             { money: n }
//   { starter: true }           Starterwahl (Koffer)   { heal: true }
//   { battle: 'trainerId' }     Trainerkampf, bei Niederlage endet das Skript
//   { wild: speciesId, level }  Geskripteter Wildkampf (zaehlt nicht fuer Nuzlocke)
//   { ask: [ja, nein], yes: [...], no: [...] }  Auswahl nach der letzten Textzeile
//   { back: true }              Spieler einen Schritt zurueckschieben
//   { if: bedingung, then: [...], else: [...] }
//   { emote: 'npcId' }          Ausrufezeichen ueber einem NPC
//   { heal: 'center' }          Heilen und Heilpunkt setzen (Pokemon-Center)
// Trainer: flag = zusaetzliches Flag nach dem Sieg, badge = Ordenname. Jeder Sieg setzt beat_<id>.

export function cond(flags, c) {
  if (!c) return true;
  if (Array.isArray(c)) return c.every((x) => cond(flags, x));
  if (c.startsWith('!')) return !flags?.[c.slice(1)];
  return !!flags?.[c];
}

// ------------------------------------------------------------------ Trainer
// party: [Art, Level]. Art 'rival' = Starter mit Typvorteil gegenueber dem Starter des Spielers.
export const TRAINERS = {
  rival1: {
    name: 'Barry', cls: 'Rivale', look: 'rival', prize: 0, safe: true,
    party: [['rival', 5]],
    intro: [['Barry', 'Jetzt testen wir sofort, wer von uns das bessere Team hat! Los geht\'s!']],
    win: [['Barry', 'Was? Ich hab verloren? Okay, okay. Das war nur zum Aufwärmen!']]
  },
  rival2: {
    name: 'Barry', cls: 'Rivale', look: 'rival', prize: 60,
    party: [[396, 7], ['rival', 9]],
    intro: [['Barry', 'Da bist du ja! Ich hab trainiert wie verrückt. Zeit für Runde zwei!']],
    win: [['Barry', 'Schon wieder! Na gut, du bist stark. Aber in Erzelingen hole ich den Orden zuerst!']]
  },
  youngster_tim: {
    name: 'Tim', cls: 'Knirps', look: 'youngster', prize: 16, sight: 3,
    party: [[396, 4], [399, 4]],
    intro: [['Knirps Tim', 'Hey! Wer in meine Richtung schaut, muss kämpfen. So sind die Regeln!']],
    win: [['Knirps Tim', 'Mist. Ich hätte wohl nicht so genau hinschauen sollen.']],
    after: [['Knirps Tim', 'Ich trainiere hier jeden Tag. Irgendwann bin ich der Stärkste auf Route 202!']]
  },
  lass_nina: {
    name: 'Nina', cls: 'Göre', look: 'lass', prize: 16, sight: 4,
    party: [[403, 5]],
    intro: [['Göre Nina', 'Mein Sheinux funkelt heute besonders. Willst du es mal erleben?']],
    win: [['Göre Nina', 'Ach, so ein Pech! Es hat aber trotzdem toll gefunkelt.']],
    after: [['Göre Nina', 'Elektro-Pokémon sind schnell. Pass auf, dass du nicht gelähmt wirst!']]
  },
  school_kid: {
    name: 'Mia', cls: 'Schülerin', look: 'girl', prize: 16,
    party: [[399, 6]],
    intro: [['Schülerin Mia', 'Ich übe gerade für die Prüfung. Hilfst du mir mit einem Probekampf?']],
    win: [['Schülerin Mia', 'Danke! Jetzt weiß ich, was ich noch lernen muss.']],
    after: [['Schülerin Mia', 'Statusprobleme wie Gift bleiben auch nach dem Kampf. Ein Gegengift hilft!']]
  },
  grunt_jub: {
    name: 'Rüpel', cls: 'Team Galaktik', look: 'grunt', prize: 30, flag: 'grunts_jub',
    party: [[41, 7], [399, 7]],
    intro: [['Galaktik-Rüpel', 'Was glotzt du so? Team Galaktik hat hier wichtige Geschäfte! Verschwinde, oder wir zeigen dir, wie das läuft!']],
    win: [['Galaktik-Rüpel', 'Grr! Ein Kind hat mich besiegt? Das erzählst du niemandem, klar?']]
  },
  youngster_jonas: {
    name: 'Jonas', cls: 'Knirps', look: 'youngster', prize: 16, sight: 3,
    party: [[396, 7], [399, 7]],
    intro: [['Knirps Jonas', 'Auf Route 203 bin ich der König. Zeig mal, was du draufhast!']],
    win: [['Knirps Jonas', 'Oh. Dann bin ich wohl doch eher der Prinz.']],
    after: [['Knirps Jonas', 'Hinter dem Erzelingen-Tor wohnen ganz viele Felsen-Pokémon.']]
  },
  lass_kira: {
    name: 'Kira', cls: 'Göre', look: 'lass', prize: 16, sight: 2,
    party: [[406, 8]],
    intro: [['Göre Kira', 'Mein Knospi hat heute geblüht! Lass uns kämpfen!']],
    win: [['Göre Kira', 'Es ist trotzdem das hübscheste Pokémon der Route.']],
    after: [['Göre Kira', 'Gift-Pokémon können dein Team langsam schwächen. Achte auf deine KP.']]
  },
  camper_paul: {
    name: 'Paul', cls: 'Camper', look: 'boy', prize: 20, sight: 3,
    party: [[66, 8]],
    intro: [['Camper Paul', 'Mein Machollo hat den ganzen Morgen Steine gestemmt. Es ist bereit!']],
    win: [['Camper Paul', 'Wir müssen wohl größere Steine stemmen.']],
    after: [['Camper Paul', 'Arenaleiter Veit setzt auf Gestein. Wasser und Pflanze helfen dir dort.']]
  },
  hiker_bernd: {
    name: 'Bernd', cls: 'Wanderer', look: 'hiker', prize: 40, sight: 3,
    party: [[74, 8], [74, 8]],
    intro: [['Wanderer Bernd', 'Hoho! In dieser Höhle wird jeder Schritt zum Abenteuer. Auch der nächste Kampf!']],
    win: [['Wanderer Bernd', 'Hoho! Du bist so standfest wie ein Fels.']],
    after: [['Wanderer Bernd', 'In der Dunkelheit verstecken sich viele Zubat. Ein Trank im Beutel schadet nie.']]
  },
  worker_kurt: {
    name: 'Kurt', cls: 'Arbeiter', look: 'worker', prize: 40, sight: 3,
    party: [[74, 9], [95, 9]],
    intro: [['Arbeiter Kurt', 'He, das ist ein Arbeitsplatz! Wer hier rumläuft, muss mit anpacken. Oder kämpfen!']],
    win: [['Arbeiter Kurt', 'Na schön, du darfst weiter. Aber Helm auf!']],
    after: [['Arbeiter Kurt', 'Veit arbeitet selbst mit. Er ist hinten im Stollen.']]
  },
  worker_olaf: {
    name: 'Olaf', cls: 'Arbeiter', look: 'worker', prize: 40, sight: 4,
    party: [[74, 10], [74, 10]],
    intro: [['Arbeiter Olaf', 'Die Kohle hier treibt die ganze Stadt an. Und mein Kampfgeist meine Pokémon!']],
    win: [['Arbeiter Olaf', 'Puh. Da hab ich wohl zu viel Kohle verheizt.']],
    after: [['Arbeiter Olaf', 'Kleinstein lieben die Mine. Hier gibt es mehr davon als Kohlestücke.']]
  },
  gym_daniel: {
    name: 'Daniel', cls: 'Knirps', look: 'youngster', prize: 16, sight: 4,
    party: [[74, 10], [74, 10]],
    intro: [['Knirps Daniel', 'Bevor du zu Veit darfst, musst du an mir vorbei!']],
    win: [['Knirps Daniel', 'Okay, okay. Du darfst durch.']],
    after: [['Knirps Daniel', 'Veits Pokémon halten viel aus. Physische Attacken prallen oft einfach ab.']]
  },
  gym_jakob: {
    name: 'Jakob', cls: 'Knirps', look: 'youngster', prize: 16, sight: 5,
    party: [[74, 11], [95, 11]],
    intro: [['Knirps Jakob', 'Mein Onix ist größer als du! Hast du Angst?']],
    win: [['Knirps Jakob', 'Größe ist eben nicht alles.']],
    after: [['Knirps Jakob', 'Viel Erfolg gegen Veit. Du wirst es brauchen!']]
  },
  leader_veit: {
    name: 'Veit', cls: 'Arenaleiter', look: 'leader', prize: 100, leader: true, flag: 'badge_coal', badge: 'Kohleorden',
    party: [[74, 12], [95, 12], [408, 14]],
    intro: [
      ['Veit', 'Willkommen in der Arena von Erzelingen! Ich bin Veit, Arenaleiter und Bergmann aus Leidenschaft.'],
      ['Veit', 'Meine Gestein-Pokémon sind so hart wie das Gestein, aus dem sie kommen. Zeig mir, ob du einen Orden verdienst!']
    ],
    win: [
      ['Veit', 'Unglaublich. Du hast meine Felsen zertrümmert!'],
      ['Veit', 'Hier, der Kohleorden gehört dir. Er beweist, dass du ein echter Trainer bist.']
    ],
    after: [['Veit', 'Mit dem Kohleorden kannst du jetzt Superbälle und bessere Tränke im Markt kaufen. Weiter so!']]
  }
};

// Rivale waehlt den Starter mit Typvorteil
export const RIVAL_STARTER = { 387: 390, 390: 393, 393: 387 };

// ------------------------------------------------------------------ NPCs pro Karte
const CENTER = (map) => ({ id: `${map}_nurse`, x: 5, y: 2, dir: 'down', look: 'nurse', name: 'Pflegerin' });
const CLERK = (map) => ({ id: `${map}_clerk`, x: 0, y: 3, dir: 'right', look: 'clerk', name: 'Verkäufer' });

export const NPCS = {
  twinleaf_home_2f: [
    { id: 'barry_room', x: 5, y: 3, dir: 'left', look: 'rival', name: 'Barry', show: '!barry_room' }
  ],
  twinleaf_home_1f: [
    { id: 'mom', x: 5, y: 4, dir: 'left', look: 'mom', name: 'Mama', talk: 'mom' }
  ],
  twinleaf_rival_house: [
    { id: 'barry_mom', x: 6, y: 4, dir: 'down', look: 'lass', name: 'Barrys Mutter', talk: [['Barrys Mutter', 'Barry ist schon wieder losgerannt. Der Junge hat immer es eilig! Pass gut auf ihn auf, ja?']] }
  ],
  twinleaf_town: [
    { id: 'twinleaf_kid', x: 17, y: 8, dir: 'down', look: 'boy', name: 'Junge', talk: [['Junge', 'Mit eigenen Pokémon kannst du ins hohe Gras! Ohne ist es viel zu gefährlich.']] }
  ],
  route_201: [
    { id: 'barry_201', x: 10, y: 10, dir: 'down', look: 'rival', name: 'Barry', show: '!barry_201' }
  ],
  lake_verity: [
    { id: 'zyrus', x: 14, y: 7, dir: 'left', look: 'boss', name: 'Zyrus', show: '!zyrus_lake' },
    { id: 'eibe_lake', x: 14, y: 7, dir: 'right', look: 'prof', name: 'Prof. Eibe', show: ['zyrus_lake', '!eibe_left'] },
    { id: 'lucia_lake', x: 14, y: 8, dir: 'right', look: 'assistant', name: 'Lucia', show: ['zyrus_lake', '!eibe_left'] },
    { id: 'barry_lake', x: 17, y: 6, dir: 'left', look: 'rival', name: 'Barry', show: '!lake_done' }
  ],
  sandgem_town: [
    { id: 'sandgem_man', x: 13, y: 4, dir: 'down', look: 'oldman', name: 'Opa', talk: [['Opa', 'Professor Eibe ist erst vor Kurzem aus Kanto zurückgekommen. Er erforscht, warum Pokémon sich entwickeln.']] }
  ],
  sandgem_lab: [
    { id: 'eibe', x: 6, y: 4, dir: 'down', look: 'prof', name: 'Prof. Eibe', talk: 'eibe' },
    { id: 'lucia', x: 8, y: 4, dir: 'down', look: 'assistant', name: 'Lucia', show: '!lab_done', talk: [['Lucia', 'Der Professor wirkt streng, aber er freut sich, wenn Pokémon und Menschen gut zusammenpassen.']] },
    { id: 'lab_aide', x: 11, y: 7, dir: 'left', look: 'scientist', name: 'Assistent', talk: [['Assistent', 'Wir messen hier, wie stark die Bindung zwischen Trainer und Pokémon ist. Spannend, oder?']] }
  ],
  sandgem_center: [CENTER('sandgem_center'), { id: 'sg_c_guest', x: 4, y: 5, dir: 'right', look: 'girl', name: 'Mädchen', talk: [['Mädchen', 'Im Nuzlocke-Modus kann die Pflegerin nur lebende Pokémon heilen. Sei vorsichtig!']] }],
  sandgem_mart: [CLERK('sandgem_mart')],
  sandgem_house: [
    { id: 'lucia_mom', x: 6, y: 4, dir: 'down', look: 'mom', name: 'Frau', talk: [['Frau', 'Meine Tochter Lucia hilft dem Professor. Sie erzählt ständig von seltsamen Leuten in Weltraumanzügen.']] }
  ],
  route_202: [
    { id: 'lucia_202', x: 8, y: 33, dir: 'down', look: 'assistant', name: 'Lucia', show: 'lab_done', talk: 'lucia202' },
    { id: 'tim', x: 3, y: 15, dir: 'right', look: 'youngster', name: 'Knirps Tim', trainer: 'youngster_tim' },
    { id: 'nina', x: 12, y: 24, dir: 'left', look: 'lass', name: 'Göre Nina', trainer: 'lass_nina' }
  ],
  jubilife_city: [
    { id: 'grunt_a', x: 15, y: 2, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', show: '!grunts_jub', trainer: 'grunt_jub' },
    { id: 'grunt_b', x: 17, y: 2, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', show: '!grunts_jub', talk: [['Galaktik-Rüpel', 'Sprich mit meinem Kollegen. Ich bin nur zum Aufpassen hier.']] },
    { id: 'jub_woman', x: 20, y: 13, dir: 'left', look: 'lass', name: 'Frau', talk: [['Frau', 'Jubelstadt ist die größte Stadt Sinnohs. Hier findest du ein Pokémon-Center, einen Markt und die Trainerschule.']] },
    { id: 'jub_man', x: 8, y: 13, dir: 'right', look: 'worker', name: 'Mann', show: '!grunts_jub', talk: [['Mann', 'Oben im Norden stehen komische Typen in Raumanzügen herum. Team Galaktik nennen die sich.']] }
  ],
  jubilife_school: [
    { id: 'teacher', x: 5, y: 3, dir: 'down', look: 'scientist', name: 'Lehrerin', talk: [['Lehrerin', 'Willkommen in der Trainerschule! Hier lernt man die Grundlagen: Typen, Statusprobleme und Teamaufbau.']] },
    { id: 'mia', x: 3, y: 5, dir: 'down', look: 'girl', name: 'Schülerin Mia', trainer: 'school_kid' }
  ],
  jubilife_center: [CENTER('jubilife_center')],
  jubilife_mart: [CLERK('jubilife_mart')],
  route_203: [
    { id: 'barry_203', x: 5, y: 7, dir: 'left', look: 'rival', name: 'Barry', show: ['has_starter', '!rival2'] },
    { id: 'jonas', x: 10, y: 9, dir: 'up', look: 'youngster', name: 'Knirps Jonas', trainer: 'youngster_jonas' },
    { id: 'kira', x: 20, y: 5, dir: 'down', look: 'lass', name: 'Göre Kira', trainer: 'lass_kira' },
    { id: 'paul', x: 32, y: 9, dir: 'up', look: 'boy', name: 'Camper Paul', trainer: 'camper_paul' }
  ],
  oreburgh_gate: [
    { id: 'bernd', x: 15, y: 4, dir: 'down', look: 'hiker', name: 'Wanderer Bernd', trainer: 'hiker_bernd' }
  ],
  oreburgh_city: [
    { id: 'ore_guide', x: 4, y: 11, dir: 'up', look: 'worker', name: 'Bergmann', talk: [['Bergmann', 'Willkommen in Erzelingen! Die Arena ist oben rechts, das Pokémon-Center oben links.']] },
    { id: 'barry_ore', x: 23, y: 8, dir: 'down', look: 'rival', name: 'Barry', show: ['badge_coal', '!barry_ore'], talk: 'barryOre' },
    { id: 'ore_kid', x: 16, y: 18, dir: 'left', look: 'youngster', name: 'Junge', talk: [['Junge', 'Mein Papa arbeitet in der Mine. Er sagt, man findet dort manchmal uralte Fossilien!']] }
  ],
  oreburgh_mine: [
    { id: 'veit_mine', x: 20, y: 11, dir: 'left', look: 'leader', name: 'Veit', show: '!roark_mine', talk: 'veitMine' },
    { id: 'kurt', x: 8, y: 4, dir: 'down', look: 'worker', name: 'Arbeiter Kurt', trainer: 'worker_kurt' },
    { id: 'olaf', x: 15, y: 8, dir: 'left', look: 'worker', name: 'Arbeiter Olaf', trainer: 'worker_olaf' }
  ],
  oreburgh_center: [CENTER('oreburgh_center')],
  oreburgh_mart: [CLERK('oreburgh_mart')],
  oreburgh_house: [
    { id: 'ore_fossil', x: 6, y: 4, dir: 'down', look: 'oldman', name: 'Opa', talk: [['Opa', 'Früher war hier alles Wald. Die Kohle ist das, was davon übrig ist. Ist das nicht wunderbar?']] }
  ],
  oreburgh_gym: [
    { id: 'gym_guide', x: 9, y: 16, dir: 'left', look: 'worker', name: 'Arenaberater', talk: 'gymGuide' },
    { id: 'daniel', x: 5, y: 13, dir: 'right', look: 'youngster', name: 'Knirps Daniel', trainer: 'gym_daniel' },
    { id: 'jakob', x: 10, y: 9, dir: 'left', look: 'youngster', name: 'Knirps Jakob', trainer: 'gym_jakob' },
    { id: 'veit', x: 7, y: 3, dir: 'down', look: 'leader', name: 'Veit', show: 'roark_mine', trainer: 'leader_veit' }
  ]
};

// ------------------------------------------------------------------ Ausloeser (Felder betreten)
export const TRIGGERS = {
  route_201: [
    { x: 8, y: 12, w: 5, h: 1, when: '!barry_201', script: 'route201' },
    { x: 43, y: 6, w: 1, h: 3, when: '!has_starter', script: 'noPokemon' }
  ],
  lake_verity: [{ x: 19, y: 6, w: 1, h: 3, when: '!lake_done', script: 'lake' }],
  sandgem_lab: [{ x: 0, y: 8, w: 14, h: 1, when: ['has_starter', '!lab_done'], script: 'lab' }],
  route_203: [{ x: 1, y: 6, w: 1, h: 3, when: ['has_starter', '!rival2'], script: 'rival203' }],
  oreburgh_gym: [{ x: 1, y: 4, w: 13, h: 1, when: '!roark_mine', script: 'gymBlocked' }]
};

// ------------------------------------------------------------------ Skripte
export const SCRIPTS = {
  intro: [
    [null, 'Die Region Sinnoh. Ein Land aus Seen, Bergen und uralten Legenden.'],
    ['Prof. Eibe', 'Hallo! Ich bin Professor Eibe. Ich erforsche Pokémon, diese erstaunlichen Wesen, die überall mit uns leben.'],
    ['Prof. Eibe', 'Manche Menschen kämpfen mit ihnen, andere arbeiten oder spielen mit ihnen. Und du? Deine Geschichte beginnt genau jetzt.'],
    [null, 'Du wachst in deinem Zimmer in Zweiblattdorf auf. Im Fernsehen läuft gerade eine Sendung über ein rotes Garados.'],
    { emote: 'barry_room' },
    ['Barry', 'He! Hast du das gerade gesehen? Ein rotes Garados in einem See! Wir müssen sofort zu unserem See, vielleicht wohnt da auch so was!'],
    ['Barry', 'Ich warte auf Route 201. Wer trödelt, muss mir eine Limo ausgeben!'],
    { flag: 'barry_room' },
    { flag: 'intro' }
  ],
  mom: [
    { if: '!has_starter', then: [['Mama', 'Barry war gerade hier und ist wie ein Wirbelwind hinausgerannt. Geh ruhig mit, aber bleib aus dem hohen Gras, solange du kein eigenes Pokémon hast!']],
      else: [['Mama', 'Du hast ein Pokémon! Ruh dich kurz aus, ich mache euch beiden etwas zu essen.'], { heal: true }, ['Mama', 'So, alle sind wieder fit. Pass gut auf euch auf!']] }
  ],
  route201: [
    { emote: 'barry_201' },
    ['Barry', 'Da bist du ja endlich! Die Limo geht auf dich, klar?'],
    ['Barry', 'Der Kraterberg-See liegt im Westen. Komm schon, ich bin schneller da als du!'],
    { flag: 'barry_201' }
  ],
  noPokemon: [
    [null, 'Hinter dir ruft jemand: „Halt! Ohne eigenes Pokémon ist das hohe Gras viel zu gefährlich!“'],
    { back: true }
  ],
  lake: [
    ['Barry', 'Da ist der See! Und schau mal, da steht jemand.'],
    ['Zyrus', '...Dieser See ist still. Man sagt, hier schläft ein Wesen, das den Menschen ihre Gefühle gab.'],
    ['Zyrus', 'Gefühle machen die Welt unvollkommen. Eines Tages wird es eine neue Welt geben, ganz ohne Streit. Dafür sorge ich.'],
    [null, 'Der Mann dreht sich um und verschwindet wortlos zwischen den Bäumen.'],
    { flag: 'zyrus_lake' },
    ['Barry', 'Was war DAS denn für einer? Egal! Wir suchen das legendäre Pokémon!'],
    ['Prof. Eibe', 'Hm. Nichts Ungewöhnliches. Lucia, wir gehen zurück ins Labor. Ich habe genug gesehen.'],
    ['Lucia', 'Ja, Professor! ... Oh, wartet, der Koffer!'],
    [null, 'Die beiden gehen eilig davon. Am Ufer bleibt ein Aktenkoffer stehen.'],
    { flag: 'eibe_left' },
    ['Barry', 'Der Koffer vom Professor! Da sind bestimmt Pokémon drin. Wir leihen uns nur ganz kurz welche, ja?'],
    [null, 'Plötzlich raschelt es im Gras. Ein wildes Pokémon springt heraus!'],
    ['Barry', 'Schnell, schnapp dir eins aus dem Koffer!'],
    { starter: true },
    { wild: 396, level: 2 },
    ['Barry', 'Puh, das war knapp! Und jetzt du gegen mich!'],
    { battle: 'rival1' },
    { heal: true },
    ['Barry', 'Wir haben Pokémon benutzt, die uns nicht gehören. Wir müssen sie dem Professor zurückbringen. Sein Labor ist in Sandgemme, östlich von Route 201!'],
    { flag: 'lake_done' }
  ],
  lab: [
    ['Prof. Eibe', 'Du bist also der Dieb meines Koffers. ... Zeig mir das Pokémon.'],
    [null, 'Professor Eibe schaut dein Pokémon lange und ernst an.'],
    ['Prof. Eibe', 'Hm. Es vertraut dir bereits. Ein Pokémon, das so schnell Vertrauen fasst, sollte bei seinem Trainer bleiben.'],
    ['Prof. Eibe', 'Behalte es. Und hilf mir dafür: Reise durch Sinnoh und lerne alle Pokémon kennen, die dir begegnen.'],
    [null, 'Du erhältst den Pokédex!'],
    { flag: 'dex' },
    ['Lucia', 'Ich bin Lucia, die Assistentin des Professors. Hier, nimm diese Pokébälle. Damit kannst du wilde Pokémon fangen!'],
    { give: 'poke-ball', count: 5 },
    { give: 'potion', count: 3 },
    { flag: 'got_balls' },
    ['Lucia', 'Barry ist übrigens schon nach Jubelstadt gerannt. Die Stadt liegt nördlich, über Route 202.'],
    { flag: 'lab_done' }
  ],
  eibe: [
    { if: '!badge_coal', then: [['Prof. Eibe', 'Pokémon entwickeln sich, wenn sie wachsen. Ich will verstehen, warum. Reise weiter und berichte mir!']],
      else: [['Prof. Eibe', 'Der Kohleorden! Du entwickelst dich als Trainer genauso schnell wie deine Pokémon.']] }
  ],
  lucia202: [
    { if: '!lucia_tip', then: [
      ['Lucia', 'Da bist du ja! Kleiner Tipp: Schwäche ein wildes Pokémon erst, bevor du einen Ball wirfst. Dann klappt es viel öfter.'],
      ['Lucia', 'Und denk an die Nuzlocke-Regel: Pro Route zählt nur die erste Begegnung. Nimm noch diese Tränke mit!'],
      { give: 'potion', count: 2 },
      { flag: 'lucia_tip' }
    ], else: [['Lucia', 'Viel Erfolg! Jubelstadt liegt direkt im Norden.']] }
  ],
  rival203: [
    { emote: 'barry_203' },
    { battle: 'rival2' },
    ['Barry', 'Bis gleich in Erzelingen! Ich bin sowieso schneller da!'],
    { flag: 'rival2' }
  ],
  gymBlocked: [
    ['Arenaberater', 'Moment! Veit ist gerade gar nicht in der Arena. Er arbeitet unten in der Erzelingen-Mine, südlich der Stadt.'],
    { back: true }
  ],
  gymGuide: [
    { if: '!roark_mine', then: [['Arenaberater', 'Veit ist gerade unten in der Mine. Schau doch dort nach ihm!']],
      else: [['Arenaberater', 'Veit setzt auf Gestein-Pokémon. Wasser- und Pflanzen-Attacken sind sehr effektiv. Normal- und Flug-Attacken dagegen kaum!']] }
  ],
  veitMine: [
    ['Veit', 'Hm? Ein Herausforderer? Hier unten in der Mine?'],
    ['Veit', 'Ich bin Veit, der Arenaleiter. Wenn du einen Orden willst, komm in die Arena. Ich mache mich gleich auf den Weg!'],
    { flag: 'roark_mine' }
  ],
  barryOre: [
    ['Barry', 'Du hast den Kohleorden auch? Dann sind wir gleichauf. Noch!'],
    ['Barry', 'Ich ziehe weiter Richtung Ewigenau. Der nächste Orden gehört mir! Wer zuletzt da ist, zahlt die Limo!'],
    [null, 'Das ist das Ende der aktuellen Geschichte. Weitere Kapitel folgen.'],
    { flag: 'barry_ore' }
  ]
};

export const NEW_PLAYER_SPAWN = { map: 'twinleaf_home_2f', x: 3, y: 4, dir: 'up' };
// Flags fuer Spielstaende von vor der Story (Starter schon gewaehlt)
export const LEGACY_FLAGS = ['intro', 'barry_room', 'barry_201', 'zyrus_lake', 'eibe_left', 'has_starter', 'lake_done', 'dex', 'got_balls', 'lab_done'];

export const BADGES = [{ flag: 'badge_coal', name: 'Kohleorden', color: '#7a6a58' }];

export function visibleNpcs(mapId, flags) {
  return (NPCS[mapId] || []).filter((n) => cond(flags, n.show));
}
export function npcAt(mapId, x, y, flags) {
  return visibleNpcs(mapId, flags).find((n) => n.x === x && n.y === y) || null;
}
