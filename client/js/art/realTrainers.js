// Zuordnung der Kampfgegner zu den Original-Trainerbildern aus Diamant/Perl/Platin
// (github.com/smogon/sprites, geladen von `npm run sprites` nach client/sprites/trainers/).
// Reihenfolge: zuerst der Name (Arenaleiter, Top Vier, Galaktik), dann die Trainerklasse, dann das Aussehen.
export const TRAINER_BY_NAME = {
  Veit: 'Roark', Silvana: 'Gardenia', Hilda: 'Maylene', Marinus: 'Crasher_Wake', Lamina: 'Fantina', Adam: 'Byron',
  Frida: 'Candice', Volkner: 'Volkner', Herbaro: 'Aaron', Teresa: 'Bertha', Ignaz: 'Flint', Lucian: 'Lucian',
  Cynthia: 'Cynthia', Barry: 'Barry', Mars: 'Mars', Jupiter: 'Jupiter', Saturn: 'Saturn', Zyrus: 'Cyrus', Urs: 'Riley', Palmer: 'Palmer'
};
export const TRAINER_BY_CLASS = {
  Knirps: 'Youngster', 'Göre': 'Lass', 'Schülerin': 'School_Kid~F', 'Schüler': 'School_Kid', Camper: 'Camper',
  Picknickerin: 'Picnicker', Wanderer: 'Hiker', Arbeiter: 'Worker', 'Team Galaktik': 'Galactic_Grunt',
  'Käferfänger': 'Bug_Catcher', Psycho: 'Psychic', Radler: 'Cyclist', Radlerin: 'Cyclist~F', 'Ass-Trainer': 'Ace_Trainer',
  'Ass-Trainerin': 'Ace_Trainer~F', Aromalady: 'Aroma_Lady', Skifahrer: 'Skier', Skifahrerin: 'Skier~F',
  Schwimmer: 'Swimmer', Schwimmerin: 'Swimmer~F', Wissenschaftler: 'Scientist', Rivale: 'Barry', Commander: 'Mars',
  'Galaktik-Boss': 'Cyrus', Polizist: 'Policeman', Gentleman: 'Gentleman', Seemann: 'Sailor', Angler: 'Fisherman',
  'Ruinenmaniac': 'Ruin_Maniac', Kampfgirl: 'Battle_Girl', Schwarzgurt: 'Blackbelt', Vogelfan: 'Bird_Keeper',
  Ruinenforscher: 'Ruin_Maniac', Lady: 'Lady', 'Strandläuferin': 'Beauty', Gitarrist: 'Guitarist', Techniker: 'Worker',
  Veteran: 'Veteran', Turmherr: 'Palmer', Sammler: 'Collector', 'Reicher Junge': 'Rich_Boy', Idol: 'Idol', Schirmdame: 'Parasol_Lady',
  Zwillinge: 'Twins', 'Junges Glück': 'Young_Couple', Duo: 'Double_Team'
};
export const TRAINER_BY_LOOK = {
  youngster: 'Youngster', lass: 'Lass', girl: 'School_Kid~F', boy: 'Camper', hiker: 'Hiker', worker: 'Worker',
  grunt: 'Galactic_Grunt', ace: 'Ace_Trainer', psychic: 'Psychic', skier: 'Skier', swimmer: 'Swimmer',
  scientist: 'Scientist', police: 'Policeman', rival: 'Barry', boss: 'Cyrus', commander: 'Mars', jupiter: 'Jupiter',
  saturn: 'Saturn', cynthia: 'Cynthia', byron: 'Byron', candice: 'Candice', fantina: 'Fantina', gardenia: 'Gardenia',
  maylene: 'Maylene', wake: 'Crasher_Wake', leader: 'Roark', oldman: 'Gentleman', cowgirl: 'Cowgirl', rancher: 'Rancher'
};
export const TRAINER_FILES = [...new Set([...Object.values(TRAINER_BY_NAME), ...Object.values(TRAINER_BY_CLASS), ...Object.values(TRAINER_BY_LOOK)])];
