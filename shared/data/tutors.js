// Attacken-Lehrer wie in Platin (Daten aus pret/pokeplatinum, res/pokemon/move_tutors.json): jede Attacke
// kostet Scherben. Route 212 und Blizzach sind im Spiel, das Ueberlebensareal gehoert zum Kampfareal (noch nicht da).
export const TUTORS = {
  route212: { moves: [
    { id: 'dive', cost: { 'red-shard': 2, 'blue-shard': 4, 'yellow-shard': 2 } },
    { id: 'fury-cutter', cost: { 'blue-shard': 8 } },
    { id: 'icy-wind', cost: { 'blue-shard': 6, 'green-shard': 2 } },
    { id: 'thunder-punch', cost: { 'red-shard': 2, 'blue-shard': 6 } },
    { id: 'fire-punch', cost: { 'red-shard': 2, 'blue-shard': 6 } },
    { id: 'ice-punch', cost: { 'red-shard': 2, 'blue-shard': 6 } },
    { id: 'ominous-wind', cost: { 'blue-shard': 6, 'green-shard': 2 } },
    { id: 'air-cutter', cost: { 'red-shard': 2, 'blue-shard': 4, 'green-shard': 2 } },
    { id: 'zen-headbutt', cost: { 'blue-shard': 4, 'yellow-shard': 4 } },
    { id: 'vacuum-wave', cost: { 'red-shard': 2, 'blue-shard': 4, 'green-shard': 2 } },
    { id: 'trick', cost: { 'blue-shard': 4, 'yellow-shard': 4 } },
    { id: 'knock-off', cost: { 'red-shard': 4, 'blue-shard': 4 } },
    { id: 'sucker-punch', cost: { 'blue-shard': 6, 'yellow-shard': 2 } }
  ] },
  snowpoint: { moves: [
    { id: 'snore', cost: { 'red-shard': 2, 'yellow-shard': 4, 'green-shard': 2 } },
    { id: 'spite', cost: { 'yellow-shard': 8 } },
    { id: 'helping-hand', cost: { 'red-shard': 2, 'yellow-shard': 4, 'green-shard': 2 } },
    { id: 'synthesis', cost: { 'yellow-shard': 2, 'green-shard': 6 } },
    { id: 'magnet-rise', cost: { 'blue-shard': 2, 'yellow-shard': 4, 'green-shard': 2 } },
    { id: 'last-resort', cost: { 'green-shard': 8 } },
    { id: 'swift', cost: { 'blue-shard': 2, 'yellow-shard': 2, 'green-shard': 4 } },
    { id: 'uproar', cost: { 'yellow-shard': 6, 'green-shard': 2 } }
  ] },
  survival: { moves: [
    { id: 'mud-slap', cost: { 'red-shard': 4, 'blue-shard': 4 } },
    { id: 'rollout', cost: { 'red-shard': 4, 'blue-shard': 2, 'green-shard': 2 } },
    { id: 'superpower', cost: { 'red-shard': 8 } },
    { id: 'iron-head', cost: { 'red-shard': 6, 'yellow-shard': 2 } },
    { id: 'aqua-tail', cost: { 'red-shard': 6, 'green-shard': 2 } },
    { id: 'gastro-acid', cost: { 'red-shard': 4, 'yellow-shard': 2, 'green-shard': 2 } },
    { id: 'endeavor', cost: { 'red-shard': 4, 'yellow-shard': 4 } },
    { id: 'outrage', cost: { 'red-shard': 6, 'yellow-shard': 2 } },
    { id: 'ancient-power', cost: { 'red-shard': 6, 'green-shard': 2 } },
    { id: 'signal-beam', cost: { 'red-shard': 2, 'blue-shard': 2, 'yellow-shard': 2, 'green-shard': 2 } },
    { id: 'earth-power', cost: { 'red-shard': 6, 'green-shard': 2 } },
    { id: 'gunk-shot', cost: { 'red-shard': 4, 'blue-shard': 2, 'green-shard': 2 } },
    { id: 'twister', cost: { 'red-shard': 6, 'green-shard': 2 } },
    { id: 'seed-bomb', cost: { 'red-shard': 4, 'green-shard': 4 } },
    { id: 'iron-defense', cost: { 'red-shard': 4, 'blue-shard': 2, 'yellow-shard': 2 } },
    { id: 'bounce', cost: { 'red-shard': 4, 'yellow-shard': 2, 'green-shard': 2 } },
    { id: 'heat-wave', cost: { 'red-shard': 4, 'blue-shard': 2, 'green-shard': 2 } }
  ] }
};
TUTORS.route212.name = 'Attacken-Lehrer (Route 212)';
TUTORS.snowpoint.name = 'Attacken-Lehrer (Blizzach)';
TUTORS.survival.name = 'Attacken-Lehrer (Überlebensareal)';

// Attacken-Erinnerer (Weideburg) nimmt eine Herzschuppe pro Attacke
export const RELEARN_COST = { 'heart-scale': 1 };

// TM, die jeder Arenaleiter nach dem Sieg ueberreicht (wie im Original)
export const BADGE_TMS = {
  badge_coal: 'tm76', badge_forest: 'tm86', badge_relic: 'tm65', badge_cobble: 'tm60',
  badge_fen: 'tm55', badge_mine: 'tm91', badge_icicle: 'tm72', badge_beacon: 'tm57'
};
