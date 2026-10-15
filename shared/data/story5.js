// Story Sinnoh Ost und Pokémon Liga: Route 222, Sonnewik mit Ignaz vor der Arena und Volkner im
// Leuchtturm (Leuchtorden), Jasmin mit Kaskade, Route 223, die Ordenskontrolle vor der Siegesstraße,
// Barrys letzter Kampf, die Top Vier, Champ Cynthia und die Ruhmeshalle.
const CENTER = (map) => ({ id: `${map}_nurse`, x: 5, y: 2, dir: 'down', look: 'nurse', name: 'Pflegerin' });
const CLERK = (map) => ({ id: `${map}_clerk`, x: 0, y: 3, dir: 'right', look: 'clerk', name: 'Verkäufer' });
const GUIDE = (map, script) => ({ id: `${map}_guide`, x: 9, y: 16, dir: 'left', look: 'worker', name: 'Arenaberater', talk: script });
const say = (who, text) => [[who, text]];
const gift = (flag, lines, after) => [{ if: '!' + flag, then: [...lines, { flag }], else: after }];
const T = (name, cls, look, prize, sight, party, intro, win, after) => ({ name, cls, look, prize, sight, party, intro: say(`${cls} ${name}`, intro), win: say(`${cls} ${name}`, win), ...(after ? { after: say(`${cls} ${name}`, after) } : {}) });
const hm = (name, how) => [null, `Du erhältst die VM ${name}! ${how}`];
const E4 = ['beat_e4_aaron', 'beat_e4_bertha', 'beat_e4_flint', 'beat_e4_lucian', 'beat_champ_cynthia'];
const BADGE_FLAGS = ['badge_coal', 'badge_forest', 'badge_relic', 'badge_cobble', 'badge_fen', 'badge_mine', 'badge_icicle', 'badge_beacon'];

export const TRAINERS5 = {
  fisher_hein: T('Hein', 'Angler', 'oldman', 30, 3, [[130, 41], [73, 40]], 'Hier beißt heute nur Garados an. Willst du es sehen?', 'Das war wohl der falsche Köder.'),
  police_udo: T('Udo', 'Polizist', 'police', 50, 3, [[59, 42]], 'Halt, Kontrolle! Na gut, ein Kampf tut es auch.', 'Alles in Ordnung. Weitergehen, bitte.'),
  swimmer_mara: T('Mara', 'Schwimmerin', 'swimmer', 24, 2, [[279, 41], [419, 41]], 'Das Meer vor Sonnewik ist herrlich warm!', 'Ich schwimme lieber weiter.'),
  gym_elec1: T('Rocko', 'Gitarrist', 'youngster', 40, 3, [[125, 45], [82, 45]], 'Hörst du das Summen? Das ist der Strom in meinen Saiten!', 'Kurzschluss!'),
  gym_elec2: T('Lina', 'Ass-Trainerin', 'ace', 60, 4, [[405, 46]], 'Volkner wartet ganz oben. Erst kommst du an mir vorbei!', 'Na gut, du darfst weiter.'),
  gym_elec3: T('Ralf', 'Techniker', 'worker', 40, 3, [[101, 45], [462, 46]], 'Die Zahnräder dieser Arena habe ich selbst gebaut!', 'Ich muss wohl nachjustieren.', 'Boden-Attacken wirken gegen Elektro-Pokémon am besten.'),
  leader_volkner: {
    name: 'Volkner', cls: 'Arenaleiter', look: 'volkner', prize: 150, leader: true, flag: 'badge_beacon', badge: 'Leuchtorden',
    party: [[135, 46], [26, 46], [405, 48], [466, 50]],
    intro: [['Volkner', 'Du bist mir also wirklich gefolgt. Gut.'], ['Volkner', 'Ich bin Volkner, Arenaleiter von Sonnewik. Zeig mir, dass sich das Warten gelohnt hat!']],
    win: [['Volkner', 'Ha! So einen Kampf hatte ich ewig nicht mehr. Endlich spüre ich wieder Strom in den Adern.'], ['Volkner', 'Nimm den Leuchtorden. Du bist bereit für die Pokémon Liga.']],
    after: say('Volkner', 'Am Strand wartet eine Freundin von mir. Sie hat etwas für dich, damit du den Wasserfall auf Route 223 hinaufkommst.')
  },
  swimmer_jonas: T('Jonas', 'Schwimmer', 'swimmer', 24, 4, [[73, 44], [279, 44]], 'Bis zur Liga schwimme ich jeden Tag!', 'Puh, ich brauche eine Pause.'),
  swimmer_ella: T('Ella', 'Schwimmerin', 'swimmer', 24, 3, [[226, 45]], 'Mein Mantax gleitet schneller als jedes Boot!', 'Untergegangen.'),
  swimmer_max: T('Max', 'Schwimmer', 'swimmer', 24, 3, [[130, 45], [419, 45]], 'Vor dem Wasserfall gibt es keine Abkürzung. Nur mich!', 'Dann schwimm halt weiter.'),
  ace_tim: T('Tim', 'Ass-Trainer', 'ace', 60, 4, [[214, 48], [229, 48]], 'Wer die Siegesstraße schafft, darf zu den Top Vier. Aber zuerst zu mir!', 'Du bist bereit für die Liga.'),
  ace_mia: T('Mia', 'Ass-Trainerin', 'ace', 60, 3, [[407, 48], [186, 48]], 'Hier oben trennt sich die Spreu vom Weizen.', 'Du bist eindeutig der Weizen.'),
  psychic_leon: T('Leon', 'Psycho', 'psychic', 40, 4, [[64, 47], [178, 48]], 'Ich sehe es in deinen Gedanken. Du willst Champ werden.', 'Meine Vision war richtig.'),
  hiker_bruno: T('Bruno', 'Wanderer', 'hiker', 40, 3, [[76, 48], [112, 48]], 'Hoho! Der Ausgang ist gleich da oben. Aber nicht ohne Kampf!', 'Hoho! Geh nur, die Liga wartet.'),
  rival5: {
    name: 'Barry', cls: 'Rivale', look: 'rival', prize: 80, party: [[398, 48], [214, 47], [78, 47], [143, 49], [419, 47], ['rival', 51]],
    intro: [['Barry', 'Bevor du da reingehst, will ich es ein letztes Mal wissen!']],
    win: [['Barry', 'Mann! Wieder verloren. Aber weißt du was? Es fühlt sich gar nicht schlimm an.']]
  },
  e4_aaron: {
    name: 'Herbaro', cls: 'Top Vier', look: 'aaron', prize: 160, leader: true, sight: 6, party: [[469, 49], [212, 49], [416, 50], [214, 51], [452, 53]],
    intro: [['Herbaro', 'Willkommen in der Pokémon Liga! Ich bin Herbaro von den Top Vier.'], ['Herbaro', 'Ich liebe Käfer-Pokémon. Sie sind wunderschön und stark. Gleich wirst du es sehen!']],
    win: [['Herbaro', 'Verloren. Aber meine Pokémon waren trotzdem wunderschön.'], ['Herbaro', 'Geh weiter. Teresa wartet im nächsten Raum.']]
  },
  e4_bertha: {
    name: 'Teresa', cls: 'Top Vier', look: 'bertha', prize: 160, leader: true, sight: 6, party: [[340, 50], [472, 53], [450, 52], [76, 52], [464, 55]],
    intro: [['Teresa', 'Ach, wie nett, junger Besuch! Ich bin Teresa von den Top Vier.'], ['Teresa', 'Meine Boden-Pokémon und ich haben schon viel erlebt. Lass uns sehen, was du gelernt hast!']],
    win: [['Teresa', 'Du hast Herz und Verstand. Das gefällt mir.'], ['Teresa', 'Im nächsten Raum ist Ignaz. Er brennt schon auf dich.']]
  },
  e4_flint: {
    name: 'Ignaz', cls: 'Top Vier', look: 'flint', prize: 160, leader: true, sight: 6, party: [[229, 52], [136, 55], [78, 53], [392, 55], [467, 57]],
    intro: [['Ignaz', 'Da bist du ja! Ich hab doch in Sonnewik gesagt, dass wir uns wiedersehen.'], ['Ignaz', 'Ich bin Ignaz von den Top Vier. Meine Feuer-Pokémon lodern heute besonders heiß!']],
    win: [['Ignaz', 'Das hat mein Feuer nicht gelöscht, nur noch mehr angefacht! Volkner hatte recht mit dir.'], ['Ignaz', 'Weiter! Lucian ist der Letzte der Top Vier.']]
  },
  e4_lucian: {
    name: 'Lucian', cls: 'Top Vier', look: 'lucian', prize: 170, leader: true, sight: 6, party: [[122, 53], [196, 55], [437, 54], [65, 56], [475, 59]],
    intro: [['Lucian', 'Ich habe gerade ein Buch zu Ende gelesen. Du kommst zur rechten Zeit.'], ['Lucian', 'Ich bin Lucian, der Stärkste der Top Vier. Meine Psycho-Pokémon lesen jeden deiner Züge.']],
    win: [['Lucian', 'Bemerkenswert. Dieses Kapitel endet zu deinen Gunsten.'], ['Lucian', 'Hinter mir wartet der Champ. Du kennst sie bereits.']]
  },
  champ_cynthia: {
    name: 'Cynthia', cls: 'Champ', look: 'cynthia', prize: 200, leader: true, sight: 6, party: [[442, 58], [407, 58], [468, 60], [448, 60], [350, 58], [445, 62]],
    intro: [['Cynthia', 'Du bist gekommen. Ich habe es seit unserem ersten Treffen in Ewigenau gewusst.'], ['Cynthia', 'Wir haben zusammen Team Galaktik aufgehalten. Jetzt stehen wir uns als Gegner gegenüber.'], ['Cynthia', 'Ich bin Cynthia, Champ der Pokémon Liga Sinnoh. Ich gebe alles. Du auch?']],
    win: [['Cynthia', 'Nur einen Moment lang hatte ich das Gefühl, dass ich verliere. Und dann war es wirklich so.'], ['Cynthia', 'Glückwunsch! Du bist jetzt Champ von Sinnoh. Komm, die Ruhmeshalle wartet.']],
    after: say('Cynthia', 'Die Ruhmeshalle liegt hinter mir. Geh nur, sie gehört dir.')
  }
};

const E4_ROOM = (map, id, look, name, trainer) => ({ [map]: [{ id, x: 5, y: 3, dir: 'down', look, name, trainer }] });

export const NPCS5 = {
  route_222: [
    { id: 'hein', x: 10, y: 12, dir: 'up', look: 'oldman', name: 'Angler Hein', trainer: 'fisher_hein' },
    { id: 'udo', x: 24, y: 6, dir: 'down', look: 'police', name: 'Polizist Udo', trainer: 'police_udo' },
    { id: 'mara_s', x: 30, y: 14, dir: 'up', look: 'swimmer', name: 'Schwimmerin Mara', trainer: 'swimmer_mara' }
  ],
  route_222_house: [{ id: 'r222_fisher', x: 6, y: 4, dir: 'down', look: 'oldman', name: 'Alter Angler', talk: [['Alter Angler', 'Seit Sonnewik wieder Strom hat, leuchtet der Leuchtturm nachts bis zu mir herüber.'], ['Alter Angler', 'Im Meer vor der Stadt soll es sogar Mantax geben.']] }],
  sunyshore_city: [
    { id: 'flint_sun', x: 6, y: 18, dir: 'down', look: 'flint', name: 'Ignaz', show: '!volkner_ready', talk: 'flintGym' },
    { id: 'jasmine', x: 25, y: 8, dir: 'left', look: 'jasmine', name: 'Jasmin', show: ['badge_beacon', '!hm_waterfall'], talk: 'jasmine' },
    { id: 'sun_kid', x: 21, y: 10, dir: 'left', look: 'girl', name: 'Mädchen', talk: [['Mädchen', 'Die Solarstege fangen das Sonnenlicht ein. Damit hat ganz Sonnewik Strom.'], ['Mädchen', 'Nur letzte Woche war alles dunkel. Volkner hat die Stege umgebaut, weil ihm langweilig war!']] }
  ],
  sunyshore_center: [CENTER('sunyshore_center')],
  sunyshore_mart: [CLERK('sunyshore_mart')],
  sunyshore_house: [{ id: 'sun_house', x: 2, y: 4, dir: 'right', look: 'mom', name: 'Frau', talk: [['Frau', 'Volkner war früher ganz anders. Er hat jeden Tag gekämpft und gelacht.'], ['Frau', 'Vielleicht braucht er einfach wieder einen richtigen Gegner.']] }],
  sunyshore_house2: [{ id: 'sun_house2', x: 3, y: 4, dir: 'down', look: 'oldman', name: 'Opa', talk: 'sunGift' }],
  sunyshore_lighthouse: [
    { id: 'volkner_light', x: 5, y: 3, dir: 'up', look: 'volkner', name: 'Volkner', show: '!volkner_ready', talk: 'volknerLight' },
    { id: 'light_guest', x: 9, y: 5, dir: 'left', look: 'worker', name: 'Besucher', talk: [['Besucher', 'Von hier oben sieht man bis zur Pokémon Liga. Dorthin führt nur der Weg übers Meer.']] }
  ],
  sunyshore_gym: [
    GUIDE('sunyshore_gym', 'guideBeacon'),
    { id: 'rocko', x: 7, y: 12, dir: 'down', look: 'youngster', name: 'Gitarrist Rocko', trainer: 'gym_elec1' },
    { id: 'lina', x: 3, y: 8, dir: 'right', look: 'ace', name: 'Ass-Trainerin Lina', trainer: 'gym_elec2' },
    { id: 'ralf_gym', x: 11, y: 5, dir: 'left', look: 'worker', name: 'Techniker Ralf', trainer: 'gym_elec3' },
    { id: 'volkner', x: 7, y: 3, dir: 'down', look: 'volkner', name: 'Volkner', trainer: 'leader_volkner' }
  ],
  route_223: [
    { id: 'jonas_223', x: 20, y: 30, dir: 'left', look: 'swimmer', name: 'Schwimmer Jonas', trainer: 'swimmer_jonas' },
    { id: 'ella', x: 9, y: 20, dir: 'right', look: 'swimmer', name: 'Schwimmerin Ella', trainer: 'swimmer_ella' },
    { id: 'max_s', x: 13, y: 10, dir: 'down', look: 'swimmer', name: 'Schwimmer Max', trainer: 'swimmer_max' }
  ],
  pokemon_league_south: [
    { id: 'vr_guard', x: 12, y: 7, dir: 'right', look: 'police', name: 'Wache', talk: [['Wache', 'Hinter mir liegt die Siegesstraße. Wer sie betreten will, braucht alle acht Orden von Sinnoh.']] }
  ],
  league_south_center: [CENTER('league_south_center')],
  victory_road: [
    { id: 'tim_vr', x: 18, y: 19, dir: 'left', look: 'ace', name: 'Ass-Trainer Tim', trainer: 'ace_tim' },
    { id: 'mia_vr', x: 9, y: 11, dir: 'down', look: 'ace', name: 'Ass-Trainerin Mia', trainer: 'ace_mia' },
    { id: 'leon', x: 24, y: 7, dir: 'left', look: 'psychic', name: 'Psycho Leon', trainer: 'psychic_leon' },
    { id: 'bruno_vr', x: 19, y: 2, dir: 'right', look: 'hiker', name: 'Wanderer Bruno', trainer: 'hiker_bruno' }
  ],
  pokemon_league: [
    { id: 'barry_pl', x: 12, y: 10, dir: 'down', look: 'rival', name: 'Barry', show: '!rival5' }
  ],
  league_lobby: [
    { id: 'league_nurse', x: 2, y: 3, dir: 'down', look: 'nurse', name: 'Pflegerin' },
    { id: 'league_clerk', x: 12, y: 3, dir: 'down', look: 'clerk', name: 'Verkäufer' },
    { id: 'league_guard1', x: 6, y: 2, dir: 'down', look: 'police', name: 'Wache', talk: [['Wache', 'Hinter dieser Tür warten die Top Vier. Wer hineingeht, kann erst als Champ oder nach einer Niederlage zurück.']] },
    { id: 'league_guard2', x: 8, y: 2, dir: 'down', look: 'police', name: 'Wache', talk: [['Wache', 'Bereite dich gut vor. Heile deine Pokémon und kauf genug Tränke.']] }
  ],
  ...E4_ROOM('e4_aaron', 'aaron', 'aaron', 'Herbaro', 'e4_aaron'),
  ...E4_ROOM('e4_bertha', 'bertha', 'bertha', 'Teresa', 'e4_bertha'),
  ...E4_ROOM('e4_flint', 'flint', 'flint', 'Ignaz', 'e4_flint'),
  ...E4_ROOM('e4_lucian', 'lucian', 'lucian', 'Lucian', 'e4_lucian'),
  ...E4_ROOM('champion_room', 'cynthia_champ', 'cynthia', 'Cynthia', 'champ_cynthia')
};

const E4_GATE = (map, beat) => ({ [map]: [{ x: 1, y: 2, w: 9, h: 1, when: '!' + beat, script: 'e4Block' }] });

export const TRIGGERS5 = {
  // Vor der Siegesstrasse: fehlt ein Orden, schickt die Wache zurueck
  pokemon_league_south: BADGE_FLAGS.map((b) => ({ x: 13, y: 6, w: 3, h: 1, when: '!' + b, script: 'badgeGate' })),
  pokemon_league: [{ x: 1, y: 13, w: 24, h: 1, when: '!rival5', script: 'rival5' }],
  league_lobby: [{ x: 7, y: 2, script: 'e4Enter' }],
  ...E4_GATE('e4_aaron', 'beat_e4_aaron'),
  ...E4_GATE('e4_bertha', 'beat_e4_bertha'),
  ...E4_GATE('e4_flint', 'beat_e4_flint'),
  ...E4_GATE('e4_lucian', 'beat_e4_lucian'),
  ...E4_GATE('champion_room', 'beat_champ_cynthia'),
  hall_of_fame: [{ x: 0, y: 3, w: 11, h: 4, script: 'hallOfFame' }]
};

export const SCRIPTS5 = {
  flintGym: [
    ['Ignaz', 'Du willst zu Volkner? Pech gehabt, die Arena ist zu.'],
    ['Ignaz', 'Ich bin Ignaz, ein alter Freund von ihm. Volkner langweilt sich, weil ihn keiner mehr fordert. Er hat sogar die ganze Stadt umgebaut und dabei den Strom lahmgelegt.'],
    ['Ignaz', 'Er sitzt bestimmt oben im Leuchtturm und starrt aufs Meer. Geh hin und rüttel ihn wach!']
  ],
  volknerLight: [
    ['Volkner', 'Hm? Noch ein Herausforderer? Die letzten waren so schwach, dass ich fast vergessen habe, wie sich ein echter Kampf anfühlt.'],
    ['Volkner', 'Sieben Orden. Und Team Galaktik hast du auch aufgehalten, sagt Ignaz.'],
    ['Volkner', 'Gut. Ich gebe dir eine Chance. Wir sehen uns in der Arena.'],
    { flag: 'volkner_ready' },
    [null, 'Volkner verlässt den Leuchtturm.']
  ],
  jasmine: gift('hm_waterfall', [
    ['Jasmin', 'Hallo. Ich bin Jasmin, Arenaleiterin aus Oliviana City in Johto. Ich mache hier Urlaub.'],
    ['Jasmin', 'Volkner hat mir erzählt, dass du ihn besiegt hast. Dann brauchst du das hier für den Weg zur Liga.'],
    hm('Kaskade', 'Schwimme gegen einen Wasserfall, und dein Pokémon trägt dich hinauf.'),
    ['Jasmin', 'Route 223 führt nördlich übers Meer. Am Ende kommst du mit Kaskade den Wasserfall hinauf. Viel Glück!']
  ], [['Jasmin', 'Die Pokémon Liga liegt im Norden. Ich drücke dir die Daumen.']]),
  sunGift: gift('sun_gift', [
    ['Opa', 'Du willst zur Pokémon Liga? Dann nimm das hier mit. Ich brauche es nicht mehr.'],
    { give: 'full-restore', count: 2 }
  ], [['Opa', 'Die Top Vier kämpfen nacheinander, ohne Pause. Spar dir die Top-Genesung für den Champ auf.']]),
  guideBeacon: [['Arenaberater', 'Volkner setzt auf Elektro-Pokémon. Boden-Attacken sind hier dein bester Freund!']],
  badgeGate: [
    ['Wache', 'Halt! Die Siegesstraße darf nur betreten, wer alle acht Orden von Sinnoh besitzt.'],
    ['Wache', 'Dir fehlt noch mindestens einer. Komm wieder, wenn du alle hast!'],
    { back: true }
  ],
  rival5: [
    { emote: 'barry_pl' },
    ['Barry', 'Da bist du endlich! Ich warte hier schon eine Ewigkeit! Ich hab übrigens auch alle acht Orden.'],
    ['Barry', 'Bevor du da reingehst, will ich es ein letztes Mal wissen. Wer von uns ist stärker? Volle Kraft!'],
    { battle: 'rival5' },
    ['Barry', 'Ich glaube, ich weiß jetzt, was mir fehlt. Ich gehe zurück und trainiere mit meinem Vater.'],
    ['Barry', 'Und du zeigst den Top Vier, was wir aus Zweiblattdorf draufhaben! Versprochen?'],
    { flag: 'rival5' }
  ],
  e4Enter: [
    ['Wache', 'Ab hier gibt es kein Zurück. Du kämpfst nacheinander gegen alle Top Vier und den Champ.'],
    ['Wache', 'Verlierst du, beginnst du wieder bei Herbaro. Bist du bereit?'],
    {
      ask: ['Ja', 'Nein'],
      yes: [...E4.map((f) => ({ unflag: f })), ['Wache', 'Viel Glück! Die Tür ist offen.']],
      no: [['Wache', 'Komm wieder, wenn du bereit bist.'], { back: true }]
    }
  ],
  e4Block: [[null, 'Der Weg nach oben ist versperrt. Erst musst du hier gewinnen.'], { back: true }],
  hallOfFame: [
    ['Cynthia', 'Das ist die Ruhmeshalle. Hier werden alle Trainer festgehalten, die die Liga bezwungen haben.'],
    ['Cynthia', 'Und ihre Pokémon, die mit ihnen bis zum Ende gegangen sind.'],
    [null, 'Dein Team wird in der Ruhmeshalle verewigt.'],
    { flag: 'champion' },
    { heal: true },
    ['Cynthia', 'Ruh dich aus. Und vergiss nie, wie es sich heute angefühlt hat.'],
    [null, 'Du bist Champ der Pokémon Liga Sinnoh!'],
    { warp: ['twinleaf_town', 10, 8, 'down'] },
    ['Mama', 'Da bist du ja! Barry hat schon alles erzählt. Du bist Champ! Ich bin so stolz auf dich.'],
    ['Mama', 'Ruh dich gut aus. Die Welt da draußen ist groß, und es gibt noch so viele Pokémon zu entdecken.']
  ]
};

export const BADGES5 = [
  { flag: 'badge_beacon', name: 'Leuchtorden', color: '#f0d040' }
];

// Nebengeschichten einhaengen
import { TRAINERS6, NPCS6, TRIGGERS6, SCRIPTS6 } from './story6.js';
Object.assign(TRAINERS5, TRAINERS6);
Object.assign(SCRIPTS5, SCRIPTS6);
for (const [m, list] of Object.entries(NPCS6)) NPCS5[m] = [...(NPCS5[m] || []), ...list];
for (const [m, list] of Object.entries(TRIGGERS6)) TRIGGERS5[m] = [...(TRIGGERS5[m] || []), ...list];
// Revanchen nach dem Titel
import { REMATCH7 } from './story7.js';
for (const [id, r] of Object.entries(REMATCH7)) TRAINERS5[id].rematch = r;
