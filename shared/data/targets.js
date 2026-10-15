// Ziele von Attacken im Doppelkampf (4. Generation): beide Gegner oder alle anderen Pokémon (auch der Partner)
export const ALL_FOES = new Set(['acid', 'air-cutter', 'blizzard', 'bubble', 'captivate', 'eruption', 'growl', 'heat-wave', 'hyper-voice', 'icy-wind', 'leer',
  'muddy-water', 'poison-gas', 'powder-snow', 'razor-leaf', 'razor-wind', 'rock-slide', 'string-shot', 'sweet-scent', 'swift', 'tail-whip', 'twister', 'water-spout']);
export const ALL_OTHERS = new Set(['earthquake', 'magnitude', 'surf', 'explosion', 'self-destruct', 'discharge', 'lava-plume', 'teeter-dance']);
// Statusattacken, die nur den Anwender betreffen
export const SELF_KINDS = new Set(['heal', 'focus', 'charge', 'endure']);
export const isSpread = (id) => ALL_FOES.has(id) || ALL_OTHERS.has(id);
export const isSelfMove = (mv) => mv?.cat === 'status' && (mv.effect?.target === 'self' || SELF_KINDS.has(mv.effect?.kind));
