// Attacken-Lehrer, Attacken-Erinnerer und Attacken-Verlerner wie in Platin.
// Wird in story.js eingehaengt. Der Schritt { service } oeffnet die Auswahl im Spiel (server/game/game.js).
export const SERVICE_NPCS = {
  pastoria_house: [{ id: 'relearner', x: 7, y: 3, dir: 'down', look: 'oldman', name: 'Attacken-Erinnerer', talk: 'relearner' }],
  canalave_house: [{ id: 'deleter', x: 7, y: 3, dir: 'down', look: 'oldman', name: 'Attacken-Verlerner', talk: 'deleter' }],
  snowpoint_house: [{ id: 'tutor_snowpoint', x: 2, y: 3, dir: 'down', look: 'oldman', name: 'Attacken-Lehrer', talk: 'tutorSnowpoint' }],
  route_212: [{ id: 'tutor_212', x: 11, y: 37, dir: 'left', look: 'oldman', name: 'Attacken-Lehrer', talk: 'tutor212' }]
};

const tutor = (where) => [
  ['Attacken-Lehrer', 'Ich bin der Attacken-Lehrer! Für ein paar Scherben bringe ich deinen Pokémon besondere Attacken bei.'],
  ['Attacken-Lehrer', 'Rote, Blaue, Gelbe und Grüne Scherben findest du überall in Sinnoh. Möchtest du etwas lernen?'],
  { ask: ['Ja', 'Nein'], yes: [{ service: 'tutor', tutor: where }, ['Attacken-Lehrer', 'Komm wieder, wenn du neue Scherben hast!']], no: [['Attacken-Lehrer', 'Schade. Du weißt, wo du mich findest.']] }
];

export const SERVICE_SCRIPTS = {
  tutor212: tutor('route212'),
  tutorSnowpoint: tutor('snowpoint'),
  relearner: [
    ['Attacken-Erinnerer', 'Ich bin der Attacken-Erinnerer. Ich helfe Pokémon, sich an Attacken zu erinnern, die sie vergessen haben.'],
    ['Attacken-Erinnerer', 'Für eine Herzschuppe erinnere ich dein Pokémon an eine Attacke. Interessiert?'],
    { ask: ['Ja', 'Nein'], yes: [{ service: 'relearn' }, ['Attacken-Erinnerer', 'Komm jederzeit wieder, wenn du eine Herzschuppe hast.']], no: [['Attacken-Erinnerer', 'Dann eben nicht. Herzschuppen findest du oft an Stränden.']] }
  ],
  deleter: [
    ['Attacken-Verlerner', 'Ähm ... Oh ja, ich bin der Attacken-Verlerner. Ich bringe Pokémon dazu, Attacken zu vergessen.'],
    ['Attacken-Verlerner', 'Auch VM-Attacken. Soll eines deiner Pokémon etwas vergessen?'],
    { ask: ['Ja', 'Nein'], yes: [{ service: 'deleter' }, ['Attacken-Verlerner', 'Komm wieder, wenn noch etwas vergessen werden soll.']], no: [['Attacken-Verlerner', 'Komm wieder, wenn du willst, dass ein Pokémon etwas vergisst.']] }
  ]
};
