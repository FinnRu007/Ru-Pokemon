// Gegenstaende: Baelle, Heilmittel und Statusheiler mit Preisen im Pokemon-Markt.
// heal: KP-Menge, cure: geheilte Statusprobleme, revive: Anteil der KP (nicht in Nuzlocke-Runs nutzbar).
export const ITEMS = {
  'poke-ball': { name: 'Pokéball', price: 200, kind: 'ball' },
  'great-ball': { name: 'Superball', price: 600, kind: 'ball', requires: 'badge_coal' },
  'ultra-ball': { name: 'Hyperball', price: 1200, kind: 'ball', requires: 'badge_relic' },
  potion: { name: 'Trank', price: 300, kind: 'med', heal: 20 },
  'super-potion': { name: 'Supertrank', price: 700, kind: 'med', heal: 50, requires: 'badge_coal' },
  antidote: { name: 'Gegengift', price: 100, kind: 'med', cure: ['psn', 'tox'] },
  'paralyze-heal': { name: 'Para-Heiler', price: 200, kind: 'med', cure: ['par'] },
  awakening: { name: 'Aufwecker', price: 250, kind: 'med', cure: ['slp'] },
  'burn-heal': { name: 'Feuerheiler', price: 250, kind: 'med', cure: ['brn'] },
  'ice-heal': { name: 'Eisheiler', price: 250, kind: 'med', cure: ['frz'] },
  'hyper-potion': { name: 'Hypertrank', price: 1200, kind: 'med', heal: 200, requires: 'badge_forest' },
  'max-potion': { name: 'Top-Trank', price: 2500, kind: 'med', heal: 9999, requires: 'badge_mine' },
  'full-heal': { name: 'Hyperheiler', price: 600, kind: 'med', cure: ['psn', 'tox', 'par', 'slp', 'brn', 'frz'], requires: 'badge_cobble' },
  'full-restore': { name: 'Top-Genesung', price: 3000, kind: 'med', heal: 9999, cure: ['psn', 'tox', 'par', 'slp', 'brn', 'frz'], requires: 'badge_beacon' },
  revive: { name: 'Beleber', price: 1500, kind: 'med', revive: 0.5, requires: 'badge_coal' },
  'rare-candy': { name: 'Sonderbonbon', price: 4800, kind: 'med', candy: true, sell: false },
  'heart-scale': { name: 'Herzschuppe', price: 100, kind: 'item' },
  'red-shard': { name: 'Purpurstück', price: 200, kind: 'item' },
  'blue-shard': { name: 'Indigostück', price: 200, kind: 'item' },
  'yellow-shard': { name: 'Gelbstück', price: 200, kind: 'item' },
  'green-shard': { name: 'Grünstück', price: 200, kind: 'item' },
  'max-revive': { name: 'Top-Beleber', price: 4000, kind: 'med', revive: 1, buy: false },
  'old-gateau': { name: 'Spezialität', price: 200, kind: 'med', cure: ['psn', 'tox', 'par', 'slp', 'brn', 'frz'], buy: false },
  // AP: pp = wiederhergestellte AP (999 = alle), all = alle Attacken, sonst wird eine Attacke gewaehlt
  ether: { name: 'Äther', price: 1200, kind: 'med', pp: 10, buy: false },
  'max-ether': { name: 'Top-Äther', price: 2000, kind: 'med', pp: 999, buy: false },
  elixir: { name: 'Elixier', price: 3000, kind: 'med', pp: 10, all: true, buy: false },
  'max-elixir': { name: 'Top-Elixier', price: 4500, kind: 'med', pp: 999, all: true, buy: false },
  'pp-up': { name: 'AP-Plus', price: 9800, kind: 'med', ppUp: 1, buy: false },
  'pp-max': { name: 'AP-Top', price: 9800, kind: 'med', ppUp: 3, buy: false },
  // Vitamine: +10 Fleißpunkte, nur bis 100 pro Wert
  'hp-up': { name: 'KP-Plus', price: 9800, kind: 'med', ev: 'hp' },
  protein: { name: 'Protein', price: 9800, kind: 'med', ev: 'atk' },
  iron: { name: 'Eisen', price: 9800, kind: 'med', ev: 'def' },
  calcium: { name: 'Kalzium', price: 9800, kind: 'med', ev: 'spa' },
  zinc: { name: 'Zink', price: 9800, kind: 'med', ev: 'spd' },
  carbos: { name: 'Carbon', price: 9800, kind: 'med', ev: 'spe' },
  // Feld: Schutz (Schritte ohne schwaechere wilde Pokemon) und Fluchtseil (aus Hoehlen)
  repel: { name: 'Schutz', price: 350, kind: 'item', repel: 100, requires: 'badge_coal' },
  'super-repel': { name: 'Superschutz', price: 500, kind: 'item', repel: 200, requires: 'badge_relic' },
  'max-repel': { name: 'Top-Schutz', price: 700, kind: 'item', repel: 250, requires: 'badge_fen' },
  'escape-rope': { name: 'Fluchtseil', price: 550, kind: 'item', rope: true },
  // Kampf-Items: Statuswerte +1, Volltrefferquote, Megablock (5 Runden keine Senkung)
  'x-attack': { name: 'X-Angriff', price: 500, kind: 'battle', stage: 'atk' },
  'x-defense': { name: 'X-Abwehr', price: 550, kind: 'battle', stage: 'def' },
  'x-sp-atk': { name: 'X-Spezial', price: 350, kind: 'battle', stage: 'spa' },
  'x-sp-def': { name: 'X-Sp.-Vert.', price: 350, kind: 'battle', stage: 'spd' },
  'x-speed': { name: 'X-Tempo', price: 350, kind: 'battle', stage: 'spe' },
  'x-accuracy': { name: 'X-Treffer', price: 950, kind: 'battle', stage: 'acc' },
  'dire-hit': { name: 'Angriffplus', price: 650, kind: 'battle', crit: true },
  'guard-spec': { name: 'Megablock', price: 700, kind: 'battle', mist: true },
  // Besondere Baelle (Fangbonus in shared/formulas.js)
  'heal-ball': { name: 'Heilball', price: 300, kind: 'ball', requires: 'badge_coal' },
  'net-ball': { name: 'Netzball', price: 1000, kind: 'ball', buy: false },
  'nest-ball': { name: 'Nestball', price: 1000, kind: 'ball', buy: false },
  'dive-ball': { name: 'Tauchball', price: 1000, kind: 'ball', buy: false },
  'dusk-ball': { name: 'Finsterball', price: 1000, kind: 'ball', buy: false },
  'quick-ball': { name: 'Flottball', price: 1000, kind: 'ball', buy: false },
  'timer-ball': { name: 'Timerball', price: 1000, kind: 'ball', buy: false },
  'repeat-ball': { name: 'Wiederball', price: 1000, kind: 'ball', buy: false },
  'luxury-ball': { name: 'Luxusball', price: 1000, kind: 'ball', buy: false },
  // Entwicklungs-Items: Steine wie im Original, Tausch-Items werden ersatzweise angewendet
  'fire-stone': { name: 'Feuerstein', price: 2100, kind: 'item', evo: true, buy: false },
  'water-stone': { name: 'Wasserstein', price: 2100, kind: 'item', evo: true, buy: false },
  'thunder-stone': { name: 'Donnerstein', price: 2100, kind: 'item', evo: true, buy: false },
  'leaf-stone': { name: 'Blattstein', price: 2100, kind: 'item', evo: true, buy: false },
  'moon-stone': { name: 'Mondstein', price: 2100, kind: 'item', evo: true, buy: false },
  'sun-stone': { name: 'Sonnenstein', price: 2100, kind: 'item', evo: true, buy: false },
  'shiny-stone': { name: 'Leuchtstein', price: 2100, kind: 'item', evo: true, buy: false },
  'dusk-stone': { name: 'Finsterstein', price: 2100, kind: 'item', evo: true, buy: false },
  'dawn-stone': { name: 'Funkelstein', price: 2100, kind: 'item', evo: true, buy: false },
  'oval-stone': { name: 'Ovaler Stein', price: 2100, kind: 'item', evo: true, buy: false },
  'up-grade': { name: 'Up-Grade', price: 2100, kind: 'item', evo: true, buy: false },
  protector: { name: 'Schützer', price: 2100, kind: 'item', evo: true, buy: false },
  electirizer: { name: 'Stromisierer', price: 2100, kind: 'item', evo: true, buy: false },
  magmarizer: { name: 'Magmaisierer', price: 2100, kind: 'item', evo: true, buy: false },
  'dubious-disc': { name: 'Dubiosdisc', price: 2100, kind: 'item', evo: true, buy: false },
  'reaper-cloth': { name: 'Düsterumhang', price: 2100, kind: 'item', evo: true, buy: false },
  'razor-claw': { name: 'Scharfklaue', price: 2100, kind: 'item', evo: true, buy: false },
  'razor-fang': { name: 'Scharfzahn', price: 2100, kind: 'item', evo: true, buy: false },
  'metal-coat': { name: 'Metallmantel', price: 100, kind: 'item', evo: true, buy: false },
  'dragon-scale': { name: 'Drachenhaut', price: 2100, kind: 'item', evo: true, buy: false },
  'kings-rock': { name: 'King-Stein', price: 100, kind: 'item', evo: true, buy: false },
  'deep-sea-tooth': { name: 'Abysszahn', price: 200, kind: 'item', evo: true, buy: false },
  'deep-sea-scale': { name: 'Abyssplatte', price: 200, kind: 'item', evo: true, buy: false },
  // Wertsachen (nur zum Verkaufen)
  nugget: { name: 'Nugget', price: 10000, kind: 'item', buy: false },
  'big-pearl': { name: 'Riesenperle', price: 7500, kind: 'item', buy: false },
  'star-piece': { name: 'Sternenstück', price: 9800, kind: 'item', buy: false }
};

// Items zum Tragen: im Spiel sammel- und verkaufbar, Trage-Effekte gibt es (noch) nicht
const HOLD = {
  'adamant-orb': 'Adamant-Orb', 'lustrous-orb': 'Weiß-Orb', 'griseous-orb': 'Platinum-Orb', 'amulet-coin': 'Münzamulett',
  'big-root': 'Großwurzel', 'charcoal': 'Holzkohle', 'destiny-knot': 'Fatumknoten', 'dragon-fang': 'Drachenzahn',
  'grip-claw': 'Griffklaue', 'hard-stone': 'Granitstein', 'iron-ball': 'Eisenkugel', 'lagging-tail': 'Schwerschweif',
  'leftovers': 'Überreste', 'life-orb': 'Leben-Orb', 'light-clay': 'Lichtlehm', 'magnet': 'Magnet', 'mental-herb': 'Mentalkraut',
  'miracle-seed': 'Wundersaat', 'mystic-water': 'Zauberwasser', 'never-melt-ice': 'Ewiges Eis', 'poison-barb': 'Giftstich',
  'shed-shell': 'Wechselhülle', 'silver-powder': 'Silberstaub', 'smoke-ball': 'Rauchball', 'soft-sand': 'Pudersand',
  'full-incense': 'Lahmrauch', 'lax-incense': 'Laxrauch', 'luck-incense': 'Glücksrauch', 'odd-incense': 'Schrägrauch',
  'pure-incense': 'Scheuchrauch', 'rock-incense': 'Steinrauch', 'rose-incense': 'Rosenrauch', 'sea-incense': 'Seerauch',
  'wave-incense': 'Wellenrauch', 'earth-plate': 'Erdtafel', 'fist-plate': 'Fausttafel', 'mind-plate': 'Hirntafel',
  'dread-plate': 'Furchttafel', 'splash-plate': 'Wassertafel', 'spooky-plate': 'Spuktafel'
};
for (const [id, name] of Object.entries(HOLD)) ITEMS[id] = { name, price: 200, kind: 'item', hold: true, buy: false };

// TM01 bis TM92 und VM01 bis VM08 wie in Platin. TMs verschwinden nach Gebrauch (4. Generation), VMs nicht.
export const TM_MOVES = ['focus-punch', 'dragon-claw', 'water-pulse', 'calm-mind', 'roar', 'toxic', 'hail', 'bulk-up', 'bullet-seed', 'hidden-power',
  'sunny-day', 'taunt', 'ice-beam', 'blizzard', 'hyper-beam', 'light-screen', 'protect', 'rain-dance', 'giga-drain', 'safeguard', 'frustration',
  'solar-beam', 'iron-tail', 'thunderbolt', 'thunder', 'earthquake', 'return', 'dig', 'psychic', 'shadow-ball', 'brick-break', 'double-team',
  'reflect', 'shock-wave', 'flamethrower', 'sludge-bomb', 'sandstorm', 'fire-blast', 'rock-tomb', 'aerial-ace', 'torment', 'facade',
  'secret-power', 'rest', 'attract', 'thief', 'steel-wing', 'skill-swap', 'snatch', 'overheat', 'roost', 'focus-blast', 'energy-ball',
  'false-swipe', 'brine', 'fling', 'charge-beam', 'endure', 'dragon-pulse', 'drain-punch', 'will-o-wisp', 'silver-wind', 'embargo',
  'explosion', 'shadow-claw', 'payback', 'recycle', 'giga-impact', 'rock-polish', 'flash', 'stone-edge', 'avalanche', 'thunder-wave',
  'gyro-ball', 'swords-dance', 'stealth-rock', 'psych-up', 'captivate', 'dark-pulse', 'rock-slide', 'x-scissor', 'sleep-talk',
  'natural-gift', 'poison-jab', 'dream-eater', 'grass-knot', 'swagger', 'pluck', 'u-turn', 'substitute', 'flash-cannon', 'trick-room'];
export const HM_MOVES = ['cut', 'fly', 'surf', 'strength', 'defog', 'rock-smash', 'waterfall', 'rock-climb'];
// Feldattacken-Flag der Story (hm_cut usw.) zur passenden VM
export const HM_FLAGS = { hm_cut: 'hm01', hm_fly: 'hm02', hm_surf: 'hm03', hm_strength: 'hm04', hm_defog: 'hm05', hm_rocksmash: 'hm06', hm_waterfall: 'hm07', hm_rockclimb: 'hm08' };
TM_MOVES.forEach((move, i) => { const n = String(i + 1).padStart(2, '0'); ITEMS['tm' + n] = { name: 'TM' + n, kind: 'tm', move, price: 3000 }; });
HM_MOVES.forEach((move, i) => { const n = String(i + 1).padStart(2, '0'); ITEMS['hm' + n] = { name: 'VM' + n, kind: 'tm', move, hm: true, price: 0 }; });
// VM-Attacken lassen sich nur beim Attacken-Verlerner vergessen
export const isHmMove = (moveId) => HM_MOVES.includes(moveId);

export const MART_STOCK = ['poke-ball', 'great-ball', 'ultra-ball', 'potion', 'super-potion', 'hyper-potion', 'max-potion', 'full-restore', 'antidote', 'paralyze-heal', 'awakening', 'burn-heal', 'ice-heal', 'full-heal', 'revive',
  'escape-rope', 'repel', 'super-repel', 'max-repel'];
// Kaufhaus Schleiede: Kampf-Items, Vitamine, Heilball und TMs wie im Original
export const STORE_STOCK = ['poke-ball', 'great-ball', 'ultra-ball', 'heal-ball', 'potion', 'super-potion', 'hyper-potion', 'revive', 'full-heal', 'escape-rope', 'repel', 'super-repel', 'max-repel',
  'x-attack', 'x-defense', 'x-sp-atk', 'x-sp-def', 'x-speed', 'x-accuracy', 'dire-hit', 'guard-spec',
  'hp-up', 'protein', 'iron', 'calcium', 'zinc', 'carbos', 'tm16', 'tm17', 'tm20', 'tm33', 'tm54', 'tm70', 'tm83'];
// Verkaufspreis wie im Original: halber Kaufpreis
export const sellPrice = (id) => (ITEMS[id] && ITEMS[id].sell !== false && ITEMS[id].kind !== 'key' && !ITEMS[id].hm ? Math.floor((ITEMS[id].price || 0) / 2) : 0);

// Wendet einen Heilgegenstand auf ein Pokemon an. Liefert { ok, text }.
const EV_NAMES = { hp: 'KP', atk: 'Angriff', def: 'Verteidigung', spa: 'Spezial-Angriff', spd: 'Spezial-Verteidigung', spe: 'Initiative' };
// moveIndex: gewaehlte Attacke (AP-Items), moveBasePp/moveName: Nachschlagen in den Attackendaten
export function applyItem(itemId, mon, monName, { nuzlocke = false, moveIndex = 0, moveBasePp = null, moveName = null } = {}) {
  const it = ITEMS[itemId];
  if (!it || it.kind !== 'med') return { ok: false, text: 'Das kann man hier nicht benutzen.' };
  if (mon.alive === false) return { ok: false, text: `${monName} ist tot. Nichts kann es zurückholen.` };
  if (it.revive) {
    if (mon.hp > 0) return { ok: false, text: 'Es hätte keine Wirkung.' };
    if (nuzlocke) return { ok: false, text: 'Nuzlocke: Besiegte Pokémon bleiben besiegt.' };
    mon.hp = Math.max(1, Math.floor(mon.stats.hp * it.revive));
    return { ok: true, text: `${monName} ist wieder bei Kräften!` };
  }
  if (it.ev) {
    const evs = mon.evs || (mon.evs = {});
    const total = Object.values(evs).reduce((a, b) => a + b, 0);
    if ((evs[it.ev] || 0) >= 100 || total >= 510) return { ok: false, text: 'Es hätte keine Wirkung.' };
    evs[it.ev] = Math.min(100, (evs[it.ev] || 0) + 10, (evs[it.ev] || 0) + 510 - total);
    return { ok: true, recalc: true, text: `Der Wert ${EV_NAMES[it.ev]} von ${monName} stieg.` };
  }
  if (it.ppUp) {
    const m = mon.moves[moveIndex];
    const base = moveBasePp?.(m?.id);
    if (!m || !base) return { ok: false, text: 'Es hätte keine Wirkung.' };
    const max = Math.floor(base * 1.6);
    if (m.maxPp >= max) return { ok: false, text: 'Es hätte keine Wirkung.' };
    const next = Math.min(max, m.maxPp + Math.floor(base / 5) * it.ppUp);
    m.pp += next - m.maxPp; m.maxPp = next;
    return { ok: true, text: `Die AP von ${moveName?.(m.id) || m.id} wurden erhöht.` };
  }
  if (mon.hp <= 0) return { ok: false, text: 'Es hätte keine Wirkung.' };
  if (it.pp) {
    const list = it.all ? mon.moves : [mon.moves[moveIndex]].filter(Boolean);
    let gained = 0;
    for (const m of list) { const before = m.pp; m.pp = Math.min(m.maxPp, m.pp + it.pp); gained += m.pp - before; }
    if (!gained) return { ok: false, text: 'Es hätte keine Wirkung.' };
    return { ok: true, text: it.all ? `Die AP von ${monName} wurden aufgefüllt.` : `Die AP von ${moveName?.(list[0].id) || list[0].id} wurden aufgefüllt.` };
  }
  if (it.heal) {
    const cures = it.cure && it.cure.includes(mon.status);
    if (mon.hp >= mon.stats.hp && !cures) return { ok: false, text: 'Es hätte keine Wirkung.' };
    const before = mon.hp;
    mon.hp = Math.min(mon.stats.hp, mon.hp + it.heal);
    if (cures) mon.status = null;
    return { ok: true, text: `${monName} wurde um ${mon.hp - before} KP geheilt.${cures ? ' Statusprobleme sind weg.' : ''}`, cured: cures || undefined };
  }
  if (it.cure) {
    if (!it.cure.includes(mon.status)) return { ok: false, text: 'Es hätte keine Wirkung.' };
    mon.status = null;
    return { ok: true, text: `${monName} ist wieder gesund.`, cured: true };
  }
  return { ok: false, text: 'Es hätte keine Wirkung.' };
}
