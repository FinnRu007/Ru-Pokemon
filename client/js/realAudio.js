// Zuordnung der Original-Klaenge aus `npm run sounds` (client/sounds/, nicht im Repo).
// Musik und Fanfaren stammen aus der offiziellen Pokemon DP Sound Library (Diamant/Perl, in Platin
// fast identisch), Rufe aus PokeAPI/cries, Attacken-Klaenge aus einer Gen-4-Sammlung.
// Fehlt eine Datei, spielt audio.js den eigenen Chiptune-Klang.

// Gleicher Schluessel fuer Dateinamen und Spiel-IDs: "Vine_Whip" == "vine-whip" == "vineWhip"
export const soundKey = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Titel aus der Sound Library. [Tag, Nacht] wechselt um 20 Uhr (wie im Spiel).
const T = (name) => [`${name} (Day)`, `${name} (Night)`];
const TOWN = {
  twinleaf: T('Twinleaf Town'), sandgem: T('Sandgem Town'), jubilife: ['Jubilife City (Day)', 'Jubilife City'],
  oreburgh: T('Oreburgh City'), floaroma: T('Floaroma Town'), eterna: T('Eterna City'), hearthome: T('Hearthome City'),
  solaceon: T('Solaceon Town'), veilstone: T('Veilstone City'), canalave: ['Canalave City', 'Canalave City (Night)'], snowpoint: T('Snowpoint City'),
  // Ohne eigenen Titel in der Sound Library: naechstes passendes Stueck
  pastoria: T('Hearthome City'), celestic: T('Solaceon Town'), sunyshore: T('Sunyshore City'), fight: T('Fight Area'), survival: T('Fight Area')
};

// Musik je Karte (Vorrang vor allem anderen)
export const MAP_TRACKS = {
  twinleaf_town: TOWN.twinleaf, route_201: T('Route 201'), route_202: T('Route 201'),
  lake_verity: 'Lake', lake_valor: 'Lake', lake_acuity: 'Lake',
  sandgem_town: TOWN.sandgem, sandgem_lab: 'The Pokémon Lab', jubilife_city: TOWN.jubilife,
  route_203: T('Route 203'), route_204: T('Route 203'), route_204_north: T('Route 203'),
  oreburgh_gate: 'Oreburgh Gate', ravaged_path: 'Oreburgh Gate', oreburgh_city: TOWN.oreburgh, oreburgh_mine: 'Oreburgh Mine',
  floaroma_town: TOWN.floaroma, floaroma_meadow: TOWN.floaroma, route_205_south: T('Route 205'), valley_windworks: T('Route 205'),
  eterna_forest: 'Eterna Forest', eterna_city: TOWN.eterna, eterna_galactic: 'Galactic Eterna Building',
  route_206: T('Route 206'), route_207: T('Route 206'), route_208: T('Route 206'), mt_coronet: 'Mt. Coronet',
  hearthome_city: TOWN.hearthome, route_209: T('Route 209'), solaceon_town: TOWN.solaceon, route_210: T('Route 210'), route_215: T('Route 210'),
  veilstone_city: TOWN.veilstone, galactic_warehouse: 'Team Galactic HQ', route_214: T('Route 209'), route_213: T('Valor Lakefront'),
  valor_lakefront: T('Valor Lakefront'), route_212: T('Route 209'), canalave_city: TOWN.canalave, canalave_library: TOWN.canalave,
  route_216: T('Route 216'), route_217: T('Route 216'), snowpoint_city: TOWN.snowpoint,
  galactic_hq: 'Team Galactic HQ', spear_pillar: 'Spear Pillar', distortion_world: 'Spear Pillar',
  windworks_inside: T('Route 205'), pastoria_city: TOWN.pastoria, celestic_town: TOWN.celestic, route_218: T('Route 206'),
  route_222: T('Route 209'), sunyshore_city: TOWN.sunyshore, sunyshore_lighthouse: TOWN.sunyshore, route_223: 'Surf',
  pokemon_league_south: T('Pokémon League'), victory_road: 'Victory Road', pokemon_league: T('Pokémon League'),
  e4_aaron: 'Decisive Battle! (Pokémon League)', e4_bertha: 'Decisive Battle! (Pokémon League)', e4_flint: 'Decisive Battle! (Pokémon League)',
  e4_lucian: 'Decisive Battle! (Pokémon League)', champion_room: 'Champion Cynthia', hall_of_fame: 'Hall of Fame',
  verity_cavern: 'Lake Caverns', valor_cavern: 'Lake Caverns', acuity_cavern: 'Lake Caverns',
  iron_island: 'Oreburgh Gate', iron_island_deep: 'Oreburgh Gate', wayward_cave: 'Oreburgh Gate', turnback_cave: 'Mt. Coronet',
  old_chateau: 'Old Chateau', solaceon_ruins: 'Oreburgh Gate', celestic_ruins: 'Oreburgh Gate', canalave_dock: TOWN.canalave,
  north_sea: 'Surf', fight_area: TOWN.fight, battle_tower: 'Battle Tower', route_225: T('Route 225'), survival_area: TOWN.survival,
  route_227: T('Route 228'), stark_mountain: 'Stark Mountain', stark_mountain_deep: 'Stark Mountain',
  snowpoint_temple: 'Lake Caverns', fullmoon_island: 'Lake', lakefront_house: T('Valor Lakefront')
};
// Raeume nach Thema, sonst gilt die Musik des Ortes (Praefix der Karten-ID)
export const THEME_TRACKS = { center: T('Pokémon Center'), mart: 'Poké Mart', gym: 'Pokémon Gym' };
// Fallback fuer die Namen der eigenen Stuecke (Kampf, Vorspann, Orte ohne eigenen Titel)
export const SONG_TRACKS = {
  title: 'Introduction', battle_wild: 'Battle! (Wild Pokémon)', battle_trainer: 'Battle! (Trainer Battle)',
  battle_leader: 'Battle! (Gym Leader)', victory: 'Victory! (Wild Pokémon)', victory_trainer: 'Victory! (Trainer Battle)',
  victory_leader: 'Victory! (Gym Leader)', twinleaf: TOWN.twinleaf, sandgem: TOWN.sandgem, jubilife: TOWN.jubilife,
  oreburgh: TOWN.oreburgh, route1: T('Route 201'), route2: T('Route 203'), lake: 'Lake', cave: 'Oreburgh Gate',
  center: T('Pokémon Center'), gym: 'Pokémon Gym',
  battle_rival: 'Battle! (Rival)', battle_galactic: 'Battle! (Team Galactic)', battle_commander: 'Battle! (Team Galactic Commander)',
  battle_boss: 'Battle! (Team Galactic Boss)', battle_elite: 'Battle! (Elite Four)', battle_champion: 'Battle! (Champion)',
  battle_legend: 'Battle! (Legendary Pokémon)', battle_lakes: 'Battle! (Azelf/Mesprit/Uxie)', battle_creation: 'Battle! (Dialga/Palkia)',
  victory_rival: 'Victory! (Trainer Battle)', victory_galactic: 'Victory! (Team Galactic)', victory_commander: 'Victory! (Team Galactic)',
  victory_boss: 'Victory! (Team Galactic)', victory_elite: 'Victory! (Elite Four)', victory_champion: 'Victory! (Champion)'
};
// Fanfaren: erst Sound Library, dann die Gen-4-Sammlung (misc:Dateiname)
export const JINGLE_TRACKS = {
  heal: ['Pokémon Healed', 'misc:recovery'], levelup: ['Level Up!'], badge: ['Obtained a Badge!'],
  item: ['Obtained an Item!', 'misc:item_get'], evolved: ['Congratulations! Your Pokémon Evolved!']
};

// Alle Titel, die `npm run sounds` aus der Sound Library holt
export const ALL_TRACKS = [...new Set([MAP_TRACKS, THEME_TRACKS, SONG_TRACKS].flatMap((o) => Object.values(o)).flat()
  .concat(Object.values(JINGLE_TRACKS).flat().filter((t) => !t.startsWith('misc:'))))];

export const isNight = (d = new Date()) => d.getHours() >= 20 || d.getHours() < 4;
const pick = (t, night) => Array.isArray(t) ? t[night ? 1 : 0] : t;

// Titel fuer eine Karte (oder null)
export function trackForMap(id, map, night = isNight()) {
  let t = MAP_TRACKS[id] || THEME_TRACKS[map?.theme];
  if (!t) {
    const town = Object.keys(TOWN).find((k) => id.startsWith(k + '_'));
    if (town && !/^route_/.test(id)) t = TOWN[town];
    // Haeuser an Routen: Musik der Route
    const route = id.match(/^(route_\d+)_/);
    if (!t && route) t = MAP_TRACKS[route[1]];
  }
  return t ? pick(t, night) : null;
}
export const trackForSong = (name, night = isNight()) => SONG_TRACKS[name] ? pick(SONG_TRACKS[name], night) : null;
