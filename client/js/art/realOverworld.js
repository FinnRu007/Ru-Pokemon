// Zuordnung der Overworld-Figuren zu den Original-Sprites aus Platin (github.com/pret/pokeplatinum,
// res/graphics/field_sprites/, geladen von `npm run sprites` nach client/sprites/overworld/).
// Reihenfolge: genauer Name, dann erstes Wort des Namens (Trainerklasse), dann das Aussehen.
export const OW_PLAYER = 'player/player_m';
export const OW_BY_NAME = {
  Lucia: 'player/player_f', Zyrus: 'npc/cyrus', Adam: 'npc/byron', Frida: 'npc/candice', Mars: 'npc/mars', Jupiter: 'npc/jupiter',
  Saturn: 'npc/saturn', Cynthia: 'npc/cynthia', Lamina: 'npc/fantina', Silvana: 'npc/gardenia', Hilda: 'npc/maylene',
  Marinus: 'npc/crasher_wake', Veit: 'npc/roark', Volkner: 'npc/volkner', Herbaro: 'npc/aaron', Teresa: 'npc/bertha',
  Ignaz: 'npc/flint', Lucian: 'npc/lucian', Barry: 'npc/barry', 'Prof. Eibe': 'npc/prof_rowan', Mama: 'npc/mom',
  Pflegerin: 'npc/pokecenter_nurse', 'Verkäufer': 'npc/cashier_m', Enton: 'pokemon/psyduck', Giratina: 'pokemon/giratina_altered',
  'Barrys Mutter': 'npc/middle_aged_woman', Frau: 'npc/middle_aged_woman', Pensionsleiterin: 'npc/middle_aged_woman',
  Opa: 'npc/old_man', 'Alter Mann': 'npc/old_man', 'Großmutter': 'npc/old_woman', Arenaberater: 'npc/gym_guide',
  Bergmann: 'npc/worker', Seemann: 'npc/sailor', Lehrerin: 'npc/scientist_f', Bibliothekar: 'npc/middle_aged_man',
  Assistent: 'npc/scientist_m', 'Mädchen': 'npc/school_kid_f', Junge: 'npc/youngster', Mann: 'npc/middle_aged_man',
  Koch: 'npc/waiter', Floristin: 'npc/lady', Radladenbesitzer: 'npc/middle_aged_man', Lagerarbeiter: 'npc/worker',
  Polizist: 'npc/policeman', Techniker: 'npc/worker', Bergsteiger: 'npc/hiker', 'Galaktik-Rüpel': 'npc/grunt_m', Heide: 'npc/school_kid_f',
  Jasmin: 'npc/jasmine', Urs: 'npc/riley', Palmer: 'npc/palmer', Selfe: 'pokemon/uxie', Vesprit: 'pokemon/mesprit', Tobutz: 'pokemon/azelf',
  Dialga: 'pokemon/dialga', Palkia: 'pokemon/palkia', Heatran: 'pokemon/heatran', Regigigas: 'pokemon/regigigas', Cresselia: 'pokemon/cresselia',
  // Ohne Overworld-Bild in Platin: verkleinertes Kampfbild (mon:<Nr>)
  Clown: 'npc/clown', LeBelle: 'npc/looker', Charon: 'npc/charon', 'Kleines Mädchen': 'npc/twin', Honigmann: 'npc/pokefan_m', 'Pokétch-Firmenchef': 'npc/middle_aged_man', Zwilling: 'npc/twin', 'Schnösel': 'npc/rich_boy', Forscher: 'npc/scientist_m',
  Regirock: 'mon:377', Regice: 'mon:378', Registeel: 'mon:379', Rotom: 'mon:479', Buck: 'npc/buck'
};
export const OW_BY_CLASS = {
  'Ass-Trainer': 'npc/ace_trainer_m', 'Ass-Trainerin': 'npc/ace_trainer_f', Radler: 'npc/cyclist_m', Radlerin: 'npc/cyclist_f',
  Camper: 'npc/camper', 'Käferfänger': 'npc/bug_catcher', Ruinenforscher: 'npc/ruin_maniac', Wanderer: 'npc/hiker',
  Aromalady: 'npc/picnicker', 'Göre': 'npc/lass', Lady: 'npc/lady', Angler: 'npc/fisherman', Psycho: 'npc/psychic',
  Skifahrer: 'npc/skier_m', Skifahrerin: 'npc/skier_f', Schwimmer: 'npc/swimmer_m', Schwimmerin: 'npc/swimmer_f',
  Arbeiter: 'npc/worker', Schwarzgurt: 'npc/black_belt', Gitarrist: 'npc/guitarist', 'Strandläuferin': 'npc/beauty', Veteran: 'npc/gentleman', Turmherr: 'npc/palmer', Knirps: 'npc/youngster', 'Schülerin': 'npc/school_kid_f',
  'Schüler': 'npc/school_kid_m', Picknickerin: 'npc/picnicker', Seemann: 'npc/sailor', Gentleman: 'npc/gentleman'
};
export const OW_BY_LOOK = {
  player: OW_PLAYER, player2: 'player/player_f', mom: 'npc/mom', rival: 'npc/barry', prof: 'npc/prof_rowan',
  assistant: 'player/player_f', grunt: 'npc/grunt_m', nurse: 'npc/pokecenter_nurse', clerk: 'npc/cashier_m', leader: 'npc/roark',
  youngster: 'npc/youngster', lass: 'npc/lass', hiker: 'npc/hiker', worker: 'npc/worker', oldman: 'npc/old_man',
  girl: 'npc/school_kid_f', boy: 'npc/camper', scientist: 'npc/scientist_m', boss: 'npc/cyrus', commander: 'npc/mars',
  jupiter: 'npc/jupiter', saturn: 'npc/saturn', gardenia: 'npc/gardenia', fantina: 'npc/fantina', maylene: 'npc/maylene',
  wake: 'npc/crasher_wake', byron: 'npc/byron', candice: 'npc/candice', volkner: 'npc/volkner', aaron: 'npc/aaron',
  bertha: 'npc/bertha', flint: 'npc/flint', lucian: 'npc/lucian', cynthia: 'npc/cynthia', police: 'npc/policeman',
  item_ball: 'objects/pokeball', jasmine: 'npc/jasmine', riley: 'npc/riley', uxie: 'pokemon/uxie', mesprit: 'pokemon/mesprit', azelf: 'pokemon/azelf',
  dialga: 'pokemon/dialga', palkia: 'pokemon/palkia', heatran: 'pokemon/heatran', regigigas: 'pokemon/regigigas', cresselia: 'pokemon/cresselia', swimmer: 'npc/swimmer_m', ace: 'npc/ace_trainer_m', skier: 'npc/skier_m', giratina: 'pokemon/giratina_altered', psychic: 'npc/psychic',
  twin: 'npc/twin', guitarist: 'npc/guitarist', beauty: 'npc/beauty', cowgirl: 'npc/cowgirl', rancher: 'npc/rancher', ace_f: 'npc/ace_trainer_f'
};
export const OW_FILES = [...new Set([OW_PLAYER, OW_PLAYER + '_bike', ...Object.values(OW_BY_NAME), ...Object.values(OW_BY_CLASS), ...Object.values(OW_BY_LOOK)])].filter((f) => !f.startsWith('mon:'));

export function overworldFor({ name = '', look = '' } = {}) {
  return [OW_BY_NAME[name], OW_BY_CLASS[name.split(' ')[0]], OW_BY_LOOK[look]].filter(Boolean);
}
