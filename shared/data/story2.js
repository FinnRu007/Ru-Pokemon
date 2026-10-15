// Story ab dem Kohleorden bis zur Pokemon Liga. Eigene Texte entlang der Handlung von Platin:
// Flori und das Windkraftwerk, Ewigwald und Ewigenau, Radweg und Kraterberg, Herzhofen, Trostu,
// Schleiede, Weideburg, Elyses, Fleetburg, die drei Seen, Blizzach, das Galaktik-Hauptquartier,
// die Speersaeule, die Zerrwelt, Sonnewik, die Siegesstrasse, die Top Vier und der Champ.
// Format wie in story.js. Zusaetzliche Skriptschritte:
//   { choose: [Label, ...], branches: [[...], ...] }  Auswahl mit beliebig vielen Zweigen
//   { warp: [karte, x, y, richtung?] }               Spieler versetzen
//   { legend: art, level }                           Legendaeres Pokemon (echter, fangbarer Kampf)

const CENTER = (map) => ({ id: `${map}_nurse`, x: 5, y: 2, dir: 'down', look: 'nurse', name: 'Pflegerin' });
const CLERK = (map) => ({ id: `${map}_clerk`, x: 0, y: 3, dir: 'right', look: 'clerk', name: 'Verkäufer' });
const GUIDE = (map, script) => ({ id: `${map}_guide`, x: 9, y: 16, dir: 'left', look: 'worker', name: 'Arenaberater', talk: script });
const say = (who, text) => [[who, text]];
const gift = (flag, lines, after) => [{ if: '!' + flag, then: [...lines, { flag }], else: after }];
const hm = (name) => [null, `Du erhältst die VM ${name}! Ab jetzt setzt dein Team ${name} automatisch ein, wenn du davorstehst.`];

// ------------------------------------------------------------------ Trainer
export const TRAINERS2 = {
  // Route 204 Nord
  lass_sina: { name: 'Sina', cls: 'Göre', look: 'lass', prize: 16, sight: 3, party: [[406, 9], [396, 9]],
    intro: say('Göre Sina', 'Endlich mal jemand Neues auf dieser Route! Kämpf mit mir!'), win: say('Göre Sina', 'Das war schneller vorbei als gedacht.'),
    after: say('Göre Sina', 'In Flori riecht es immer nach Blumen. Ich liebe es dort!') },
  youngster_ben: { name: 'Ben', cls: 'Knirps', look: 'youngster', prize: 16, sight: 3, party: [[401, 10], [399, 10]],
    intro: say('Knirps Ben', 'Ich hab die Felsige Schneise ganz allein geschafft. Jetzt bist du dran!'), win: say('Knirps Ben', 'Okay, du bist auch nicht schlecht.'),
    after: say('Knirps Ben', 'Mit Zertrümmerer zerlegst du Felsbrocken einfach, indem du dagegen läufst.') },
  // Flori-Wiese und Windkraftwerk
  grunt_meadow_a: { name: 'Rüpel', cls: 'Team Galaktik', look: 'grunt', prize: 30, sight: 4, party: [[434, 12]],
    intro: say('Galaktik-Rüpel', 'Diese Wiese gehört jetzt Team Galaktik! Der süße Honig hier ist für unsere Forschung!'),
    win: say('Galaktik-Rüpel', 'Mist! Ich hätte mehr Honig essen sollen. Für die Kraft!') },
  grunt_meadow_b: { name: 'Rüpel', cls: 'Team Galaktik', look: 'grunt', prize: 30, sight: 3, flag: 'windworks_key', party: [[41, 12], [434, 12]],
    intro: say('Galaktik-Rüpel', 'Du schon wieder? Dann eben ich. Team Galaktik gibt nicht auf!'),
    win: [['Galaktik-Rüpel', 'Argh! Dann behalte doch den blöden Schlüssel! Wir haben im Windkraftwerk sowieso schon alles im Griff!'], [null, 'Der Rüpel hat den Werkschlüssel fallen lassen. Du hebst ihn auf.']],
    after: say('Galaktik-Rüpel', 'Lass mich in Ruhe. Ich suche nur Honig.') },
  hiker_rolf: { name: 'Rolf', cls: 'Wanderer', look: 'hiker', prize: 40, sight: 2, party: [[74, 12], [74, 13]],
    intro: say('Wanderer Rolf', 'Hoho! Der Wind hier oben bläst ganz schön. Ein Kampf wärmt auf!'), win: say('Wanderer Rolf', 'Hoho! Mir ist richtig warm geworden.'),
    after: say('Wanderer Rolf', 'Im Windkraftwerk ist irgendwas faul. Seit gestern drehen sich die Räder nicht mehr.') },
  camper_tom: { name: 'Tom', cls: 'Camper', look: 'boy', prize: 20, sight: 3, party: [[418, 13]],
    intro: say('Camper Tom', 'Mein Bamelin schwimmt schneller als alle anderen. Und kämpft auch so!'), win: say('Camper Tom', 'Unglaublich. Es ist trotzdem schnell!'),
    after: say('Camper Tom', 'Wasser-Pokémon findest du hier auch im Fluss. Dafür musst du aber surfen können.') },
  grunt_ww1: { name: 'Rüpel', cls: 'Team Galaktik', look: 'grunt', prize: 30, sight: 3, party: [[41, 13], [434, 13]],
    intro: say('Galaktik-Rüpel', 'Wie bist du hier reingekommen? Egal, raus mit dir!'), win: say('Galaktik-Rüpel', 'Kommandantin Mars wird das gar nicht gefallen.') },
  grunt_ww2: { name: 'Rüpel', cls: 'Team Galaktik', look: 'grunt', prize: 30, sight: 3, party: [[434, 14]],
    intro: say('Galaktik-Rüpel', 'Die Energie dieses Werks gehört jetzt uns!'), win: say('Galaktik-Rüpel', 'Nicht mal Energie habe ich mehr.') },
  mars1: { name: 'Mars', cls: 'Commander', look: 'commander', prize: 60, leader: true, flag: 'windworks_done', party: [[41, 15], [431, 17]],
    intro: [['Mars', 'Oh, ein Kind. Hier ist kein Spielplatz! Wir brauchen die Energie dieses Werks für etwas Großes.'], ['Mars', 'Ich bin Mars, eine der Commander von Team Galaktik. Und du störst gewaltig!']],
    win: [['Mars', 'Ich habe verloren? Na schön. Wir haben ohnehin genug Energie gesammelt.'], ['Mars', 'Rüpel, wir ziehen ab! Wir sehen uns wieder, Kleines.']] },
  // Ewigwald
  bug_finn: { name: 'Lars', cls: 'Käferfänger', look: 'boy', prize: 16, sight: 2, party: [[265, 12], [266, 12], [268, 12]],
    intro: say('Käferfänger Lars', 'Im Ewigwald gibt es die tollsten Käfer-Pokémon! Hier, schau sie dir an!'), win: say('Käferfänger Lars', 'Meine Käfer haben gekrabbelt, aber nicht gewonnen.'),
    after: say('Käferfänger Lars', 'Nachts kommen hier andere Pokémon heraus. Ein Geist soll im Wald spuken!') },
  lass_mila: { name: 'Mila', cls: 'Göre', look: 'lass', prize: 16, sight: 3, party: [[406, 13], [427, 13]],
    intro: say('Göre Mila', 'Ich habe mich verlaufen! Ein Kampf beruhigt mich bestimmt.'), win: say('Göre Mila', 'Jetzt bin ich verloren UND habe verloren.'),
    after: say('Göre Mila', 'Der Ausgang nach Ewigenau liegt im Nordosten, glaube ich.') },
  psychic_ida: { name: 'Ida', cls: 'Psycho', look: 'psychic', prize: 30, sight: 3, party: [[63, 14], [92, 14]],
    intro: say('Psycho Ida', 'Ich habe gespürt, dass du kommst. Und dass du kämpfen willst.'), win: say('Psycho Ida', 'Dass ich verliere, habe ich nicht gespürt.') },
  // Arena Ewigenau
  gym_aroma: { name: 'Rosa', cls: 'Aromalady', look: 'lass', prize: 30, sight: 4, party: [[420, 16], [406, 16]],
    intro: say('Aromalady Rosa', 'Riechst du das? So duftet der Sieg meiner Pflanzen-Pokémon!'), win: say('Aromalady Rosa', 'Dein Duft war heute stärker.'),
    after: say('Aromalady Rosa', 'Feuer und Flug sind gut gegen Pflanzen. Gift und Käfer auch.') },
  gym_lena: { name: 'Lena', cls: 'Göre', look: 'lass', prize: 20, sight: 4, party: [[187, 17]],
    intro: say('Göre Lena', 'Silvana ist die Beste! An mir kommst du nicht vorbei!'), win: say('Göre Lena', 'Na gut. Aber an Silvana kommst du nicht vorbei!') },
  gym_jonas: { name: 'Jonas', cls: 'Camper', look: 'boy', prize: 20, sight: 2, party: [[315, 17], [406, 17]],
    intro: say('Camper Jonas', 'Hier drinnen ist es wie im Dschungel. Bereit?'), win: say('Camper Jonas', 'Der Dschungel hat dich nicht verschluckt.') },
  leader_silvana: { name: 'Silvana', cls: 'Arenaleiterin', look: 'gardenia', prize: 120, leader: true, flag: 'badge_forest', badge: 'Waldorden',
    party: [[420, 20], [387, 20], [407, 22]],
    intro: [['Silvana', 'Willkommen in meinem Garten! Ich bin Silvana, Arenaleiterin von Ewigenau.'], ['Silvana', 'Meine Pflanzen-Pokémon sind zäh und wunderschön. Mal sehen, ob du sie zum Welken bringst!']],
    win: [['Silvana', 'Wow! Du hast meine Pflanzen einfach überrannt.'], ['Silvana', 'Hier ist der Waldorden. Den hast du dir verdient!']],
    after: say('Silvana', 'Im Galaktik-Gebäude passiert etwas Seltsames. Man hat den Besitzer des Radladens dorthin verschleppt!') },
  // Galaktik-Gebaeude Ewigenau
  grunt_et1: { name: 'Rüpel', cls: 'Team Galaktik', look: 'grunt', prize: 30, sight: 4, party: [[41, 16], [434, 16]],
    intro: say('Galaktik-Rüpel', 'Ein Eindringling! Alarm! Ach, egal, ich mach das selbst!'), win: say('Galaktik-Rüpel', 'Ich hätte doch den Alarm drücken sollen.') },
  grunt_et2: { name: 'Rüpel', cls: 'Team Galaktik', look: 'grunt', prize: 30, sight: 4, party: [[431, 17]],
    intro: say('Galaktik-Rüpel', 'Unsere Mission ist größer als du dir vorstellen kannst!'), win: say('Galaktik-Rüpel', 'Meine Mission war wohl zu groß für mich.') },
  grunt_et3: { name: 'Rüpel', cls: 'Team Galaktik', look: 'grunt', prize: 30, sight: 3, party: [[41, 17], [41, 17]],
    intro: say('Galaktik-Rüpel', 'Zwei Zubat, doppelter Ärger!'), win: say('Galaktik-Rüpel', 'Doppelt verloren.') },
  jupiter1: { name: 'Jupiter', cls: 'Commander', look: 'jupiter', prize: 60, leader: true, flag: 'eterna_done', party: [[41, 18], [435, 20]],
    intro: [['Jupiter', 'Du bist also das Kind, das Mars geärgert hat. Ich bin Jupiter, Commander von Team Galaktik.'], ['Jupiter', 'Wir suchen hier nach der Kraft der Legenden. Und du bist im Weg!']],
    win: [['Jupiter', 'Hmpf. Du bist stärker als du aussiehst.'], ['Jupiter', 'Wir haben hier ohnehin alles gefunden, was wir brauchten. Den Radladenbesitzer kannst du behalten.']] },
  // Radweg, Route 207, Kraterberg, Route 208
  cyclist_kai: { name: 'Kai', cls: 'Radler', look: 'ace', prize: 24, sight: 3, party: [[77, 19]],
    intro: say('Radler Kai', 'Auf dem Radweg bin ich der Schnellste. Auch im Kampf!'), win: say('Radler Kai', 'Zu schnell gebremst.') },
  cyclist_ela: { name: 'Ela', cls: 'Radlerin', look: 'lass', prize: 24, sight: 3, party: [[403, 18], [396, 19]],
    intro: say('Radlerin Ela', 'Halt! Erst ein Kampf, dann darfst du weiterrollen.'), win: say('Radlerin Ela', 'Du bist ja ein richtiger Profi.') },
  hiker_horst: { name: 'Horst', cls: 'Wanderer', look: 'hiker', prize: 40, sight: 3, party: [[74, 19], [95, 20]],
    intro: say('Wanderer Horst', 'Hoho! Unter dem Radweg lässt es sich gut wandern!'), win: say('Wanderer Horst', 'Hoho! Ein starker Kampf!') },
  hiker_uwe: { name: 'Uwe', cls: 'Wanderer', look: 'hiker', prize: 40, sight: 3, party: [[66, 19], [74, 19]],
    intro: say('Wanderer Uwe', 'Der Kraterberg teilt Sinnoh in Ost und West. Bereit für die Reise?'), win: say('Wanderer Uwe', 'Du bist bereit, keine Frage.') },
  hiker_kurt2: { name: 'Gerd', cls: 'Wanderer', look: 'hiker', prize: 40, sight: 3, party: [[74, 20], [75, 21]],
    intro: say('Wanderer Gerd', 'In diesem Berg steckt eine uralte Kraft. Das spürt man!'), win: say('Wanderer Gerd', 'Deine Kraft ist auch nicht ohne.'),
    after: say('Wanderer Gerd', 'Ganz oben auf dem Kraterberg soll es eine Ruine geben. Aber der Weg dorthin ist versperrt.') },
  psychic_tara: { name: 'Tara', cls: 'Psycho', look: 'psychic', prize: 30, sight: 2, party: [[307, 21]],
    intro: say('Psycho Tara', 'Mein Meditie und ich haben meditiert. Jetzt sind wir unschlagbar.'), win: say('Psycho Tara', 'Wir müssen wohl länger meditieren.') },
  ace_nils: { name: 'Nils', cls: 'Ass-Trainer', look: 'ace', prize: 60, sight: 2, party: [[400, 21], [315, 22]],
    intro: say('Ass-Trainer Nils', 'Herzhofen wartet hinter mir. Aber erst musst du an mir vorbei!'), win: say('Ass-Trainer Nils', 'Du darfst passieren. Herzhofen wird dir gefallen.') },
  lass_jule: { name: 'Jule', cls: 'Göre', look: 'lass', prize: 16, sight: 3, party: [[54, 21], [307, 21]],
    intro: say('Göre Jule', 'Ich übe für die Wettbewerbe in Herzhofen. Ein Kampf ist auch gut!'), win: say('Göre Jule', 'Im Wettbewerb hätte ich gewonnen!') }
};

// ------------------------------------------------------------------ NPCs
export const NPCS2 = {
  route_204_north: [
    { id: 'sina', x: 11, y: 5, dir: 'left', look: 'lass', name: 'Göre Sina', trainer: 'lass_sina' },
    { id: 'ben', x: 7, y: 10, dir: 'down', look: 'youngster', name: 'Knirps Ben', trainer: 'youngster_ben' }
  ],
  floaroma_town: [
    { id: 'flo_girl', x: 14, y: 6, dir: 'down', look: 'girl', name: 'Mädchen', show: '!windworks_done', talk: [['Mädchen', 'Mein Papa arbeitet im Windkraftwerk. Seit Leute in Raumanzügen da sind, kommt er nicht mehr nach Hause!']] },
    { id: 'flo_girl2', x: 14, y: 6, dir: 'down', look: 'girl', name: 'Mädchen', show: 'windworks_done', talk: [['Mädchen', 'Papa ist wieder da! Danke, dass du ihm geholfen hast!']] },
    { id: 'flo_man', x: 20, y: 12, dir: 'left', look: 'oldman', name: 'Opa', talk: [['Opa', 'Auf der Flori-Wiese im Norden treiben sich seltsame Gestalten herum. Sie reden von Honig und Schlüsseln.']] }
  ],
  floaroma_meadow: [
    { id: 'meadow_a', x: 11, y: 7, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', trainer: 'grunt_meadow_a' },
    { id: 'meadow_b', x: 12, y: 4, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', trainer: 'grunt_meadow_b' }
  ],
  floaroma_center: [CENTER('floaroma_center')],
  floaroma_mart: [CLERK('floaroma_mart')],
  floaroma_flowershop: [{ id: 'flower_lady', x: 5, y: 4, dir: 'down', look: 'mom', name: 'Floristin', talk: 'flowerShop' }],
  floaroma_house: [{ id: 'flo_house', x: 2, y: 4, dir: 'left', look: 'oldman', name: 'Opa', talk: [['Opa', 'Früher war Flori eine kahle Ebene. Dann brachte ein Pokémon die Blumen. So erzählt man es hier.']] }],
  route_205_south: [
    { id: 'grunt_205', x: 19, y: 3, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', show: '!windworks_done', talk: 'grunt205' },
    { id: 'rolf', x: 25, y: 9, dir: 'down', look: 'hiker', name: 'Wanderer Rolf', trainer: 'hiker_rolf' },
    { id: 'tom', x: 6, y: 13, dir: 'up', look: 'boy', name: 'Camper Tom', trainer: 'camper_tom' }
  ],
  valley_windworks: [
    { id: 'ww_guard', x: 9, y: 7, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', show: '!windworks_key', talk: [['Galaktik-Rüpel', 'Das Werk ist abgeschlossen. Den Schlüssel hat mein Kollege auf der Flori-Wiese. Und den kriegst du nie!']] }
  ],
  windworks_inside: [
    { id: 'mars_ww', x: 6, y: 3, dir: 'down', look: 'commander', name: 'Mars', show: '!windworks_done', trainer: 'mars1' },
    { id: 'ww_g1', x: 3, y: 5, dir: 'right', look: 'grunt', name: 'Galaktik-Rüpel', show: '!windworks_done', trainer: 'grunt_ww1' },
    { id: 'ww_g2', x: 10, y: 7, dir: 'left', look: 'grunt', name: 'Galaktik-Rüpel', show: '!windworks_done', trainer: 'grunt_ww2' },
    { id: 'ww_dad', x: 9, y: 3, dir: 'down', look: 'worker', name: 'Techniker', talk: 'wwDad' }
  ],
  eterna_forest: [
    { id: 'heide', x: 10, y: 25, dir: 'left', look: 'assistant', name: 'Heide', talk: 'heide' },
    { id: 'lars', x: 14, y: 15, dir: 'down', look: 'boy', name: 'Käferfänger Lars', trainer: 'bug_finn' },
    { id: 'mila', x: 9, y: 10, dir: 'right', look: 'lass', name: 'Göre Mila', trainer: 'lass_mila' },
    { id: 'ida', x: 25, y: 6, dir: 'left', look: 'psychic', name: 'Psycho Ida', trainer: 'psychic_ida' }
  ],
  eterna_city: [
    { id: 'et_guard', x: 7, y: 9, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', show: '!badge_forest', talk: [['Galaktik-Rüpel', 'Das ist das Galaktik-Gebäude. Kinder ohne Orden haben hier nichts verloren!']] },
    { id: 'cynthia_et', x: 26, y: 9, dir: 'down', look: 'cynthia', name: 'Cynthia', show: ['badge_forest', '!hm_cut'], talk: 'cynthiaEterna' },
    { id: 'et_woman', x: 20, y: 15, dir: 'down', look: 'lass', name: 'Frau', talk: [['Frau', 'Die Statue zeigt ein Pokémon, das die Zeit beherrschen soll. Team Galaktik schleicht ständig um sie herum.']] },
    { id: 'et_kid', x: 13, y: 22, dir: 'right', look: 'youngster', name: 'Junge', talk: [['Junge', 'Mit einem Fahrrad kommst du über den Radweg im Süden. Ohne darfst du da gar nicht drauf!']] }
  ],
  eterna_center: [CENTER('eterna_center')],
  eterna_mart: [CLERK('eterna_mart')],
  eterna_gym: [
    GUIDE('eterna_gym', 'guideForest'),
    { id: 'rosa', x: 3, y: 5, dir: 'right', look: 'lass', name: 'Aromalady Rosa', trainer: 'gym_aroma' },
    { id: 'lena', x: 11, y: 8, dir: 'left', look: 'lass', name: 'Göre Lena', trainer: 'gym_lena' },
    { id: 'jonas_g', x: 7, y: 12, dir: 'down', look: 'boy', name: 'Camper Jonas', trainer: 'gym_jonas' },
    { id: 'silvana', x: 7, y: 3, dir: 'down', look: 'gardenia', name: 'Silvana', trainer: 'leader_silvana' }
  ],
  eterna_galactic: [
    { id: 'et_g1', x: 2, y: 5, dir: 'right', look: 'grunt', name: 'Galaktik-Rüpel', show: '!eterna_done', trainer: 'grunt_et1' },
    { id: 'et_g2', x: 13, y: 7, dir: 'left', look: 'grunt', name: 'Galaktik-Rüpel', show: '!eterna_done', trainer: 'grunt_et2' },
    { id: 'et_g3', x: 4, y: 9, dir: 'right', look: 'grunt', name: 'Galaktik-Rüpel', show: '!eterna_done', trainer: 'grunt_et3' },
    { id: 'jupiter_et', x: 7, y: 3, dir: 'down', look: 'jupiter', name: 'Jupiter', show: '!eterna_done', trainer: 'jupiter1' },
    { id: 'bike_owner_cap', x: 10, y: 3, dir: 'down', look: 'oldman', name: 'Radladenbesitzer', show: '!eterna_done', talk: [['Radladenbesitzer', 'Hilfe! Diese Leute wollen, dass ich ihnen Fahrräder baue. Für irgendeine Weltraumreise!']] }
  ],
  eterna_bikeshop: [{ id: 'bike_owner', x: 5, y: 4, dir: 'down', look: 'oldman', name: 'Radladenbesitzer', show: 'eterna_done', talk: 'bikeShop' }],
  eterna_house: [{ id: 'et_house', x: 6, y: 4, dir: 'down', look: 'mom', name: 'Frau', talk: [['Frau', 'Herzhofen liegt hinter dem Kraterberg. Über den Radweg und Route 207 kommst du hin.']] }],
  route_206: [
    { id: 'kai', x: 6, y: 10, dir: 'down', look: 'ace', name: 'Radler Kai', trainer: 'cyclist_kai' },
    { id: 'ela', x: 7, y: 22, dir: 'up', look: 'lass', name: 'Radlerin Ela', trainer: 'cyclist_ela' },
    { id: 'horst', x: 3, y: 30, dir: 'right', look: 'hiker', name: 'Wanderer Horst', trainer: 'hiker_horst' }
  ],
  route_207: [{ id: 'uwe', x: 18, y: 7, dir: 'left', look: 'hiker', name: 'Wanderer Uwe', trainer: 'hiker_uwe' }],
  mt_coronet: [
    { id: 'gerd', x: 8, y: 5, dir: 'right', look: 'hiker', name: 'Wanderer Gerd', trainer: 'hiker_kurt2' },
    { id: 'tara', x: 20, y: 8, dir: 'up', look: 'psychic', name: 'Psycho Tara', trainer: 'psychic_tara' }
  ],
  route_208: [
    { id: 'nils', x: 10, y: 4, dir: 'down', look: 'ace', name: 'Ass-Trainer Nils', trainer: 'ace_nils' },
    { id: 'jule', x: 22, y: 7, dir: 'up', look: 'lass', name: 'Göre Jule', trainer: 'lass_jule' }
  ]
};

// ------------------------------------------------------------------ Ausloeser
export const TRIGGERS2 = {
  sandgem_town: [{ x: 10, y: 0, w: 5, h: 1, when: '!lab_done', script: 'needLab' }],
  jubilife_city: [{ x: 31, y: 12, w: 1, h: 3, when: '!grunts_jub', script: 'jubEast' }],
  oreburgh_city: [{ x: 22, y: 7, w: 1, h: 1, when: ['badge_coal', '!barry_ore'], script: 'barryOre' }],
  route_205_south: [{ x: 18, y: 4, w: 3, h: 1, when: '!windworks_done', script: 'grunt205' }],
  eterna_city: [{ x: 15, y: 26, w: 4, h: 1, when: '!bike', script: 'needBike' }],
  route_207: [{ x: 3, y: 6, w: 1, h: 2, when: '!bike', script: 'bikeSlope' }],
  mt_coronet: [{ x: 24, y: 3, w: 1, h: 1, when: '!galactic_hq_done', script: 'coronetTop' }]
};

// ------------------------------------------------------------------ Skripte
export const SCRIPTS2 = {
  needLab: [['Lucia', 'Warte! Der Professor möchte dich unbedingt noch in seinem Labor sprechen. Es ist das Gebäude unten links!'], { back: true }],
  jubEast: [['Polizist', 'Halt! Die Straße nach Osten ist gesperrt. Im Norden der Stadt treiben Leute in Raumanzügen ihr Unwesen. Kannst du nachsehen, was die wollen?'], { back: true }],
  barryOre: [
    { emote: 'barry_ore' },
    ['Barry', 'Du hast den Kohleorden auch? Dann sind wir gleichauf. Noch!'],
    ['Barry', 'Veit hat mir das hier für dich mitgegeben. Damit kannst du die Felsbrocken in der Felsigen Schneise auf Route 204 zertrümmern!'],
    hm('Zertrümmerer'),
    { flag: 'hm_rocksmash' },
    ['Barry', 'Hinter der Schneise liegt Flori, und weiter nördlich Ewigenau mit dem nächsten Orden. Wer zuletzt da ist, zahlt die Limo!'],
    { flag: 'barry_ore' }
  ],
  flowerShop: gift('flower_gift', [['Floristin', 'Willkommen! Du hast ja Pokémon dabei. Hier, ein kleines Geschenk für deine Reise.'], { give: 'super-potion', count: 2 }],
    [['Floristin', 'Blumen und Pokémon brauchen beide Liebe und Geduld.']]),
  grunt205: [['Galaktik-Rüpel', 'Hier geht es nicht weiter! Team Galaktik hat das Windkraftwerk besetzt, und solange bleibt auch dieser Weg zu.'], { back: true }],
  wwDad: [{ if: '!windworks_done', then: [['Techniker', 'Bitte hilf mir! Diese Commander will die ganze Energie des Werks abzapfen!']],
    else: [['Techniker', 'Danke! Die Räder drehen sich wieder. Meine Tochter in Flori wird sich freuen.'], ...gift('ww_gift', [{ give: 'great-ball', count: 3 }], [])] }],
  heide: [['Heide', 'Hallo! Ich bin Heide und suche hier seltene Pokémon. Du siehst erschöpft aus. Lass mich deinem Team helfen.'], { heal: true }, ['Heide', 'So, alle wieder fit! Der Ausgang nach Ewigenau ist im Nordosten.']],
  cynthiaEterna: [
    ['Cynthia', 'Du bist also der Trainer, von dem Silvana erzählt. Ich bin Cynthia. Ich erforsche die Legenden Sinnohs.'],
    ['Cynthia', 'Diese Statue hier zeigt ein Pokémon, das die Zeit erschaffen haben soll. Team Galaktik interessiert sich sehr dafür. Das gefällt mir nicht.'],
    ['Cynthia', 'Nimm das. Mit Zerschneider kommst du an dünnen Bäumen vorbei, die dir den Weg versperren.'],
    hm('Zerschneider'),
    { flag: 'hm_cut' },
    ['Cynthia', 'Pass gut auf deine Pokémon auf. Wir sehen uns bestimmt wieder.']
  ],
  bikeShop: gift('bike', [['Radladenbesitzer', 'Du hast mich gerettet! Als Dank bekommst du mein bestes Fahrrad. Ganz umsonst!'], [null, 'Du erhältst das Fahrrad! Damit kommst du über den Radweg und steile Hänge hinauf.']],
    [['Radladenbesitzer', 'Wie fährt sich das Rad? Über den Radweg im Süden kommst du zum Kraterberg.']]),
  needBike: [['Radwegwächter', 'Ab hier beginnt der Radweg. Ohne Fahrrad darf hier niemand durch!'], { back: true }],
  bikeSlope: [[null, 'Der Hang ist steil und schlammig. Zu Fuß rutschst du immer wieder ab. Mit einem Fahrrad käme man hinauf.'], { back: true }],
  coronetTop: [[null, 'Eine uralte Treppe führt nach oben. Eine seltsame, kalte Kraft hält dich zurück. Noch ist es nicht so weit.'], { back: true }],
  guideForest: [{ if: '!badge_forest', then: [['Arenaberater', 'Silvana setzt auf Pflanzen-Pokémon. Feuer, Eis, Flug, Gift und Käfer sind hier deine Freunde!']],
    else: [['Arenaberater', 'Der Waldorden! Glückwunsch, Champion in spe!']] }]
};

// Neue Orden in Reihenfolge der Geschichte
export const BADGES2 = [
  { flag: 'badge_forest', name: 'Waldorden', color: '#4a9a4a' }
];

// Weitere Kapitel einhaengen
import { TRAINERS3, NPCS3, TRIGGERS3, SCRIPTS3, BADGES3 } from './story3.js';
Object.assign(TRAINERS2, TRAINERS3);
Object.assign(SCRIPTS2, SCRIPTS3);
for (const [m, list] of Object.entries(NPCS3)) NPCS2[m] = [...(NPCS2[m] || []), ...list];
for (const [m, list] of Object.entries(TRIGGERS3)) TRIGGERS2[m] = [...(TRIGGERS2[m] || []), ...list];
BADGES2.push(...BADGES3);
