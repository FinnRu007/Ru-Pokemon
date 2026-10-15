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
  revive: { name: 'Beleber', price: 1500, kind: 'med', revive: 0.5, requires: 'badge_coal' }
};

export const MART_STOCK = ['poke-ball', 'great-ball', 'ultra-ball', 'potion', 'super-potion', 'hyper-potion', 'max-potion', 'full-restore', 'antidote', 'paralyze-heal', 'awakening', 'burn-heal', 'ice-heal', 'full-heal', 'revive'];

// Wendet einen Heilgegenstand auf ein Pokemon an. Liefert { ok, text }.
export function applyItem(itemId, mon, monName, { nuzlocke = false } = {}) {
  const it = ITEMS[itemId];
  if (!it || it.kind !== 'med') return { ok: false, text: 'Das kann man hier nicht benutzen.' };
  if (mon.alive === false) return { ok: false, text: `${monName} ist tot. Nichts kann es zurückholen.` };
  if (it.revive) {
    if (mon.hp > 0) return { ok: false, text: 'Es hätte keine Wirkung.' };
    if (nuzlocke) return { ok: false, text: 'Nuzlocke: Besiegte Pokémon bleiben besiegt.' };
    mon.hp = Math.max(1, Math.floor(mon.stats.hp * it.revive));
    return { ok: true, text: `${monName} ist wieder bei Kräften!` };
  }
  if (mon.hp <= 0) return { ok: false, text: 'Es hätte keine Wirkung.' };
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
