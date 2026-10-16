// Pokétch wie in Platin: Anwendungen in der Reihenfolge des Originals (generated/poketch_apps.txt in
// pret/pokeplatinum) mit den deutschen Namen. Der Pokétch kommt vom Firmenchef in Jubelstadt gegen die
// drei Coupons der Clowns, weitere Apps von den Figuren wie im Original. Freundschaftsstatus, Pension-Prüfer,
// Vergleich und Trainer-Zähler fehlen, weil es Freundschaft, Pension, Großmoor und Pokéradar hier nicht gibt.
// Stoppuhr und Wecker gab es auch in Platin nie.
export const POKETCH_APPS = [
  ['clock', 'Digitaluhr'], ['calc', 'Taschenrechner'], ['memo', 'Notizblock'], ['steps', 'Schrittzähler'],
  ['party', 'Pokémon-Liste'], ['dowse', 'Itemradar'], ['berry', 'Beerensucher'], ['history', 'Pokémon-Historie'],
  ['counter', 'Zähler'], ['analog', 'Analoguhr'], ['map', 'Landkarte'], ['link', 'Linkfinder'], ['coin', 'Münzwurf'],
  ['move', 'Attackentester'], ['calendar', 'Kalender'], ['dot', 'Zeichenbrett'], ['roulette', 'Roulette'],
  ['timer', 'Eieruhr'], ['color', 'Farbwechsler']
];
export const APP_NAME = Object.fromEntries(POKETCH_APPS);
// Mit dem Pokétch: Digitaluhr, Taschenrechner, Schrittzähler und Pokémon-Liste (JubilifeCity_GivePoketch)
export const BASE_APPS = ['clock', 'calc', 'steps', 'party'];
export const appFlag = (id) => 'papp_' + id;
// Ältere Spielstände hatten die Landkarte schon mit dem Pokétch (ohne Flag poketch2)
export const hasApp = (flags, id) => !!flags?.poketch && (BASE_APPS.includes(id) || !!flags[appFlag(id)] || (id === 'map' && !flags.poketch2));
export const appsOf = (flags) => POKETCH_APPS.filter(([id]) => hasApp(flags, id));
// Apps vom Firmenchef nach Orden (PoketchCo1F_PoketchCoPresident)
export const PRESIDENT_APPS = [['memo', 1], ['map', 3], ['link', 5], ['move', 7]];
export const BADGE_FLAGS = ['badge_coal', 'badge_forest', 'badge_relic', 'badge_cobble', 'badge_fen', 'badge_mine', 'badge_icicle', 'badge_beacon'];

// Figuren. x/y gelten für die alten Karten und eigenen Räume, POKETCH_FIX setzt sie auf den Originalkarten.
export const POKETCH_NPCS = {
  jubilife_city: [
    { id: 'pt_clown_1', x: 22, y: 8, dir: 'down', look: 'youngster', name: 'Clown', show: ['has_starter', '!poketch'], talk: [{ x: 'poketch', who: 'clown', n: 1 }] },
    { id: 'pt_clown_2', x: 28, y: 8, dir: 'down', look: 'youngster', name: 'Clown', show: ['has_starter', '!poketch'], talk: [{ x: 'poketch', who: 'clown', n: 2 }] },
    { id: 'pt_clown_3', x: 25, y: 10, dir: 'down', look: 'youngster', name: 'Clown', show: ['has_starter', '!poketch'], talk: [{ x: 'poketch', who: 'clown', n: 3 }] }
  ],
  route_207: [{ id: 'pt_lucia_207', x: 20, y: 6, dir: 'left', look: 'assistant', name: 'Lucia', show: ['badge_forest', 'poketch', '!papp_dowse'], talk: [{ x: 'poketch', who: 'lucia' }] }],
  route_208: [{ id: 'pt_berry_twin', x: 20, y: 4, dir: 'down', look: 'girl', name: 'Zwilling', talk: [{ x: 'poketch', who: 'twin' }] }],
  solaceon_town: [{ id: 'pt_ruin_maniac', x: 8, y: 10, dir: 'down', look: 'hiker', name: 'Ruinenforscher', talk: [{ x: 'poketch', who: 'ruin' }] }],
  veilstone_store: [{ id: 'pt_counter_vendor', x: 9, y: 6, dir: 'left', look: 'clerk', name: 'Verkäuferin', talk: [{ x: 'poketch', who: 'vendor' }] }],
  celestic_house: [{ id: 'pt_black_belt', x: 8, y: 4, dir: 'left', look: 'ace', name: 'Schwarzgurt', talk: [{ x: 'poketch', who: 'blackbelt' }] }],
  route_213_house: [{ id: 'pt_rich_boy', x: 7, y: 4, dir: 'left', look: 'boy', name: 'Schnösel', talk: [{ x: 'poketch', who: 'richboy' }] }],
  sunyshore_house: [{ id: 'pt_app_dev', x: 8, y: 6, dir: 'left', look: 'scientist', name: 'Forscher', talk: [{ x: 'poketch', who: 'developer' }] }],
  eterna_city: [{ id: 'pt_app_lady', x: 25, y: 9, dir: 'down', look: 'lass', name: 'Lady', show: 'champion', talk: [{ x: 'poketch', who: 'lady' }] }]
};

// Stellen auf den Originalkarten (Clowns, Firmenchef und Ruinenforscher wie in den Platin-Kartendaten)
export const POKETCH_FIX = {
  jubilife_city: { pt_clown_1: [55, 33, 'down'], pt_clown_2: [15, 18, 'down'], pt_clown_3: [36, 16, 'down'] },
  route_207: { pt_lucia_207: [50, 9, 'left'] },
  route_208: { pt_berry_twin: [57, 14, 'down'] },
  solaceon_town: { pt_ruin_maniac: [14, 19, 'down'] },
  eterna_city: { pt_app_lady: [25, 40, 'left'] }
};

export function applyPoketch({ NPCS }) {
  for (const [m, list] of Object.entries(POKETCH_NPCS)) NPCS[m] = [...(NPCS[m] || []), ...list];
}
