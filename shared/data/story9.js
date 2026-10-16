// Restliche Abweichungen zu Platin: Pokétch, Bänder (Mona, Fleiß-Band, Band-Verein), Beerenmeister,
// Möbel und Besucher der Villa, Geheimgeschehen-Bote mit Regigigas, Regi-Ruinen nur mit Regigigas im Team
// und der Attacken-Lehrer im Überlebensareal. applyStory9 wird am Ende von story.js aufgerufen.
const say = (who, text) => [[who, text]];
const TITAN_LOCK = [[null, 'Die Tür zur inneren Kammer ist fest verschlossen. In die Wand sind uralte Zeichen gemeißelt.'], [null, '„Wer den König der Titanen bei sich trägt, dem öffnet sich die Kammer.“']];

export const NPCS9 = {
  jubilife_city: [{ id: 'poketch_boss', x: 25, y: 7, dir: 'down', look: 'worker', name: 'Pokétch-Firmenchef', show: 'has_starter', talk: 'poketchBoss' }],
  route_208: [{ id: 'berry_master', x: 21, y: 4, dir: 'down', look: 'oldman', name: 'Beerenmeister', talk: 'berryMaster' }],
  sunyshore_house: [{ id: 'mona_ribbon', x: 7, y: 4, dir: 'left', look: 'lass', name: 'Mona', talk: 'mona' }],
  sunyshore_mart: [{ id: 'effort_lady', x: 2, y: 6, dir: 'down', look: 'lass', name: 'Junge Frau', talk: 'effortLady' }],
  resort_house: [{ id: 'ribbon_club', x: 8, y: 3, dir: 'down', look: 'clerk', name: 'Band-Verein', talk: 'ribbonClub' }],
  jubilife_center: [{ id: 'gift_jubilife', x: 9, y: 4, dir: 'down', look: 'worker', name: 'Geheimgeschehen-Bote', show: 'champion', talk: 'mysteryGift' }],
  resort_center: [{ id: 'gift_resort', x: 9, y: 4, dir: 'down', look: 'worker', name: 'Geheimgeschehen-Bote', talk: 'mysteryGift' }],
  survival_area: [{ id: 'tutor_survival', x: 12, y: 8, dir: 'down', look: 'oldman', name: 'Attacken-Lehrer', talk: 'tutorSurvival' }],
  // Besucher der Villa: kommen, sobald das passende Möbelstück steht
  resort_villa: [
    { id: 'villa_mom', x: 7, y: 3, dir: 'down', look: 'mom', name: 'Mama', show: 'villa_visit_mom', talk: say('Mama', 'Was für ein schönes Haus! Und der Tisch ist perfekt für ein gemeinsames Essen.') },
    { id: 'villa_lucia', x: 10, y: 6, dir: 'left', look: 'assistant', name: 'Lucia', show: 'villa_small-sofa', talk: say('Lucia', 'Ich habe mich ein bisschen aufs Sofa gesetzt. Du hast es hier richtig gemütlich!') },
    { id: 'villa_rowan', x: 2, y: 8, dir: 'right', look: 'prof', name: 'Prof. Eibe', show: 'villa_bookshelf', talk: say('Prof. Eibe', 'Ein beachtliches Bücherregal. Ein Trainer sollte nie aufhören zu lernen.') },
    { id: 'villa_gardenia', x: 11, y: 8, dir: 'left', look: 'gardenia', name: 'Silvana', show: 'villa_plant', talk: say('Silvana', 'Die Pflanze ist ja toll gepflegt! Pflanzen und Pokémon brauchen beide viel Liebe.') },
    { id: 'villa_cynthia', x: 6, y: 7, dir: 'up', look: 'cynthia', name: 'Cynthia', show: 'villa_piano', talk: say('Cynthia', 'Darf ich ein wenig Klavier spielen? Hier ist es so ruhig. Hier kann ich gut abschalten.') }
  ]
};

export const SCRIPTS9 = {
  poketchBoss: [{ x: 'poketch' }],
  berryMaster: [{ x: 'berryMaster' }],
  mona: [
    ['Mona', 'Ich schreibe jeden Tag in mein Tagebuch, wie ich mich fühle. Und jeden Tag verschenke ich ein passendes Band.'],
    { x: 'dayRibbon' }
  ],
  effortLady: [{ x: 'effortRibbon' }],
  ribbonClub: [
    ['Band-Verein', 'Willkommen im Band-Verein! Hier gibt es die edelsten Bänder Sinnohs für das Pokémon an der Spitze deines Teams.'],
    { x: 'ribbonShop' }
  ],
  mysteryGift: [{ x: 'mysteryGift' }],
  tutorSurvival: [
    ['Attacken-Lehrer', 'Ich bin der Attacken-Lehrer des Überlebensareals! Für ein paar Scherben bringe ich deinen Pokémon besondere Attacken bei.'],
    { ask: ['Ja', 'Nein'], yes: [{ service: 'tutor', tutor: 'survival' }, ['Attacken-Lehrer', 'Komm wieder, wenn du neue Scherben hast!']], no: [['Attacken-Lehrer', 'Schade. Du weißt, wo du mich findest.']] }
  ],
  villa: [
    ['Butler', 'Willkommen in Ihrer Villa! Der vorige Besitzer hat sie dem neuen Champ geschenkt.'],
    { choose: ['Ausruhen', 'Möbel bestellen', 'Einrichtung ansehen', 'Zurück'], branches: [
      [{ heal: true }, ['Butler', 'Ihr Team ist wieder bei Kräften.']],
      [{ x: 'villaShop' }],
      [{ x: 'villaLook' }],
      [['Butler', 'Wie Sie wünschen.']]
    ] }
  ]
};

// Regi-Ruinen: die innere Kammer öffnet sich nur mit Regigigas im Team
const lockTitan = (script) => [{ ifParty: [486], then: script, else: TITAN_LOCK }];

// Erzelingen wie in Platin: Ein Junge bringt dich zur Arena, Barry steht vor der Tür und schickt dich in die Mine
const ORE_INTRO = {
  oreIntro: [
    ['Junge', 'He, du! Du bist ein Trainer, oder? Ohne Orden nimmt dich hier keiner ernst.'],
    ['Junge', 'Komm mit, ich bring dich zur Arena!'],
    { warp: ['oreburgh_city', 22, 9, 'up'] },
    ['Junge', 'Da ist sie! Die Pokémon-Arena von Erzelingen. Viel Glück!'],
    { flag: 'ore_intro' },
    ['Barry', 'Was?! Du bist auch schon hier? Hör zu, der Arenaleiter ist gar nicht da!'],
    ['Barry', 'Veit ist unten in der Erzelingen-Mine. Der Eingang liegt ganz im Süden der Stadt, hinter der Kohlegrube.'],
    ['Barry', 'Geh ihn holen, sonst kann keiner von uns den Orden bekommen. Und beeil dich, sonst bekommst du eine Strafe von mir!']
  ],
  barryGym: [
    ['Barry', 'Was?! Du bist auch schon hier? Hör zu, der Arenaleiter ist gar nicht da!'],
    ['Barry', 'Veit ist unten in der Erzelingen-Mine. Der Eingang liegt ganz im Süden der Stadt, hinter der Kohlegrube.'],
    ['Barry', 'Geh ihn holen, sonst kann keiner von uns den Orden bekommen. Und beeil dich, sonst bekommst du eine Strafe von mir!']
  ]
};

export function applyStory9({ SCRIPTS, NPCS, TRIGGERS }) {
  Object.assign(SCRIPTS, ORE_INTRO);
  NPCS.oreburgh_city.push({ id: 'barry_gym', x: 22, y: 7, dir: 'down', look: 'rival', name: 'Barry', show: '!roark_mine', talk: 'barryGym' });
  (TRIGGERS.oreburgh_city ||= []).push({ x: 2, y: 9, w: 2, h: 2, when: ['has_starter', '!ore_intro', '!roark_mine'], script: 'oreIntro' });
  const mine = NPCS.oreburgh_mine.find((n) => n.id === 'veit_mine');
  if (mine) mine.talk = 'veitMine';
  SCRIPTS.veitMine = [
    ['Veit', 'Hm? Ein Herausforderer? Hier unten in der Mine?'],
    ['Veit', 'Ich räume gerade Geröll mit Zertrümmerer weg. Mit dem Orden meiner Arena kannst du das außerhalb von Kämpfen auch.'],
    ['Veit', 'Ich bin Veit, der Arenaleiter von Erzelingen. Wenn du einen Orden willst, komm in die Arena. Ich gehe schon vor!'],
    { flag: 'roark_mine' }
  ];
  for (const [m, list] of Object.entries(NPCS9)) NPCS[m] = [...(NPCS[m] || []), ...list];
  for (const id of ['regirock', 'regice', 'registeel']) SCRIPTS[id] = lockTitan(SCRIPTS[id]);
  Object.assign(SCRIPTS, SCRIPTS9);
  // Mama besucht die Villa von Anfang an (der Tisch steht schon)
  const mom = NPCS.resort_villa.find((n) => n.id === 'villa_mom');
  mom.show = 'champion';
  // Prof. Eich kommt wie in Platin erst mit dem Nationalen Pokédex nach Ewigenau
  NPCS.eterna_city.find((n) => n.id === 'oak').show = ['champion', 'national_dex'];
}
