// Nebengeschichten wie in Platin: Selfe, Vesprit und Tobutz kehren nach der Speersäule in ihre
// Seehöhlen zurück, Urs und Riolu auf der Eiseninsel (ab dem Mineralorden), Rotom in der Alten Villa,
// Mira im Irrweg und die Icognito der Trostu-Ruinen.
const say = (who, text) => [[who, text]];
const gift = (flag, lines, after) => [{ if: '!' + flag, then: [...lines, { flag }], else: after }];
const T = (name, cls, look, prize, sight, party, intro, win, after) => ({ name, cls, look, prize, sight, party, intro: say(`${cls} ${name}`, intro), win: say(`${cls} ${name}`, win), ...(after ? { after: say(`${cls} ${name}`, after) } : {}) });
const GRUNT = (party, intro, win, extra = {}) => ({ name: 'Rüpel', cls: 'Team Galaktik', look: 'grunt', prize: 40, sight: 3, party, intro: say('Galaktik-Rüpel', intro), win: say('Galaktik-Rüpel', win), ...extra });

// Eines der drei Seewesen: echter, fangbarer Kampf. Wer verliert, kann es später erneut versuchen.
const lakeSpirit = (name, species, flag, intro) => [
  [null, intro],
  [name, '...'],
  { legend: species, level: 50 },
  { flag },
  [null, 'In der Höhle ist es wieder still.']
];

export const TRAINERS6 = {
  worker_kurt: T('Kurt', 'Arbeiter', 'worker', 40, 3, [[75, 37], [95, 37]], 'Auf der Eiseninsel wird seit hundert Jahren Erz abgebaut. Und gekämpft!', 'Ich gehe wohl lieber wieder an die Arbeit.'),
  hiker_lasse: T('Lasse', 'Wanderer', 'hiker', 40, 3, [[208, 38]], 'Hoho! Mein Stahlos ist hier unten aufgewachsen.', 'Hoho! Hart wie Eisen bist du.'),
  iron_grunt1: GRUNT([[42, 39], [434, 39], [431, 40]], 'Was willst du hier unten? Wir sammeln nur ein paar Pokémon für Team Galaktik!', 'Mist! Der Boss ist doch weg, warum machen wir überhaupt noch weiter?', { sight: 4 }),
  iron_grunt2: GRUNT([[109, 40], [42, 40], [435, 41]], 'Noch so ein Kind! Hier kommst du nicht weiter!', 'Ich gebe auf. Ich suche mir einen ehrlichen Beruf.', { sight: 4 })
};

export const NPCS6 = {
  verity_cavern: [{ id: 'mesprit', x: 7, y: 3, dir: 'down', look: 'mesprit', name: 'Vesprit', show: ['spear_done', '!met_mesprit'], talk: 'mesprit' }],
  valor_cavern: [{ id: 'azelf', x: 7, y: 3, dir: 'down', look: 'azelf', name: 'Tobutz', show: ['spear_done', '!met_azelf'], talk: 'azelf' }],
  acuity_cavern: [{ id: 'uxie', x: 7, y: 3, dir: 'down', look: 'uxie', name: 'Selfe', show: ['spear_done', '!met_uxie'], talk: 'uxie' }],
  canalave_dock: [
    { id: 'captain', x: 6, y: 2, dir: 'down', look: 'oldman', name: 'Kapitän', talk: 'captain' },
    { id: 'dock_kid', x: 2, y: 6, dir: 'right', look: 'boy', name: 'Junge', talk: [['Junge', 'Auf der Eiseninsel lebt ein Trainer mit einem Lucario. Ich will auch mal so stark werden!']] }
  ],
  iron_island: [
    { id: 'kurt_i', x: 6, y: 9, dir: 'right', look: 'worker', name: 'Arbeiter Kurt', trainer: 'worker_kurt' },
    { id: 'lasse_i', x: 16, y: 5, dir: 'left', look: 'hiker', name: 'Wanderer Lasse', trainer: 'hiker_lasse' }
  ],
  iron_island_deep: [
    { id: 'iron_g1', x: 5, y: 8, dir: 'right', look: 'grunt', name: 'Galaktik-Rüpel', show: '!riolu_gift', trainer: 'iron_grunt1' },
    { id: 'iron_g2', x: 15, y: 4, dir: 'left', look: 'grunt', name: 'Galaktik-Rüpel', show: '!riolu_gift', trainer: 'iron_grunt2' },
    { id: 'riley', x: 4, y: 3, dir: 'down', look: 'riley', name: 'Urs', talk: 'riley' }
  ],
  old_chateau: [{ id: 'rotom', x: 4, y: 3, dir: 'down', look: 'rotom', name: 'Rotom', show: '!met_rotom', talk: 'rotom' }],
  wayward_cave: [{ id: 'mira', x: 4, y: 2, dir: 'down', look: 'girl', name: 'Mira', talk: 'mira' }],
  solaceon_ruins: [{ id: 'ruin_scholar', x: 10, y: 8, dir: 'left', look: 'scientist', name: 'Forscher', talk: [['Forscher', 'Die Zeichen an den Wänden sind Icognito. Es gibt sie in vielen Formen, jede sieht aus wie ein Buchstabe.'], ['Forscher', 'Manchmal glaube ich, sie schreiben uns eine Nachricht. Ich habe sie nur noch nicht entschlüsselt.']] }]
};

export const TRIGGERS6 = {
  canalave_dock: [{ x: 4, y: 2, when: '!badge_mine', script: 'ironBlock' }]
};

export const SCRIPTS6 = {
  mesprit: lakeSpirit('Vesprit', 481, 'met_mesprit', 'Ein kleines rosa Pokémon schwebt vor dir. Es ist Vesprit, das Wesen der Gefühle. Es lächelt dich an.'),
  azelf: lakeSpirit('Tobutz', 482, 'met_azelf', 'Ein kleines blaues Pokémon schwebt vor dir. Es ist Tobutz, das Wesen der Willenskraft. Es sieht dich entschlossen an.'),
  uxie: lakeSpirit('Selfe', 480, 'met_uxie', 'Ein kleines gelbes Pokémon schwebt mit geschlossenen Augen vor dir. Es ist Selfe, das Wesen des Wissens.'),
  rotom: [
    [null, 'Plötzlich springt der alte Fernseher an. Ein kleines Pokémon aus Plasma flitzt aus dem Bildschirm!'],
    ['Rotom', 'Rotom! Rotom!'],
    { legend: 479, level: 20 },
    { flag: 'met_rotom' },
    [null, 'Der Fernseher ist wieder dunkel.']
  ],
  captain: [
    { if: '!badge_mine', then: [['Kapitän', 'Mein Schiff fährt zur Eiseninsel. Aber nur mit Trainern, die den Mineralorden von Adam haben. Die Insel ist gefährlich!']],
      else: [['Kapitän', 'Zur Eiseninsel? Die linke Treppe hoch zum Steg, wir legen sofort ab!'], ['Kapitän', 'Und zurück bringe ich dich auch. Ich warte am Steg der Insel.'],
        { if: 'champion', then: [['Kapitän', 'Für den Champ fahre ich auch zur Vollmondinsel. Das ist die rechte Treppe.']] }] }
  ],
  ironBlock: [['Kapitän', 'Halt! Ohne den Mineralorden nehme ich niemanden mit zur Eiseninsel.'], { back: true }],
  riley: [
    { if: 'riolu_gift', then: say('Urs', 'Kümmere dich gut um Riolu. Wenn es dir vertraut, wird aus ihm ein starkes Lucario.'),
      else: [{ if: ['beat_iron_grunt1', 'beat_iron_grunt2'],
        then: [
          ['Urs', 'Du hast die Rüpel vertrieben? Allein? Danke. Ohne dich hätte ich das nicht geschafft.'],
          ['Urs', 'Ich bin Urs. Ich trainiere hier auf der Insel mit meinem Lucario. Es spürt die Aura anderer Lebewesen.'],
          ['Urs', 'Dieses Riolu hat deine Aura gespürt und will mit dir gehen. Nimm es bitte mit.'],
          { pokemon: 447, level: 30 },
          { flag: 'riolu_gift' }
        ],
        else: [['Urs', 'Team Galaktik sammelt hier unten Pokémon ein. Ich muss die Pokémon der Insel beschützen.'], ['Urs', 'Kannst du mir helfen? Zwei Rüpel sind noch in dieser Höhle.']] }] }
  ],
  mira: gift('mira_gift', [
    ['Mira', 'Oh! Endlich jemand! Ich habe mich in diesem Irrweg verlaufen. Er ist so dunkel und verwinkelt.'],
    ['Mira', 'Danke, dass du mich gefunden hast. Hier, das soll dir helfen.'],
    { give: 'max-potion' },
    ['Mira', 'Tief in der Höhle sollen Kaumalat leben. Sie beißen in alles, sogar in Felsen!']
  ], say('Mira', 'Kaumalat wohnen tief in dieser Höhle. Sei vorsichtig!'))
};

// Nach der Liga
import { TRAINERS7, NPCS7, TRIGGERS7, SCRIPTS7 } from './story7.js';
Object.assign(TRAINERS6, TRAINERS7);
Object.assign(SCRIPTS6, SCRIPTS7);
for (const [m, list] of Object.entries(NPCS7)) NPCS6[m] = [...(NPCS6[m] || []), ...list];
for (const [m, list] of Object.entries(TRIGGERS7)) TRIGGERS6[m] = [...(TRIGGERS6[m] || []), ...list];
