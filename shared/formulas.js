// Formeln nach Generation 4 (Diamant/Perl/Platin).
import { natureMultiplier } from './data/natures.js';
import { typeEffectiveness } from './data/types.js';

export const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

// KP = ((2*Basis + DV + floor(EV/4)) * Level / 100) + Level + 10
// Andere = (((2*Basis + DV + floor(EV/4)) * Level / 100) + 5) * Wesen
export function calcStats(species, level, ivs, evs, natureId) {
  const out = {};
  STAT_KEYS.forEach((k, i) => {
    const b = species.base[i];
    const core = Math.floor(((2 * b + ivs[k] + Math.floor(evs[k] / 4)) * level) / 100);
    out[k] = k === 'hp' ? core + level + 10 : Math.floor((core + 5) * natureMultiplier(natureId, k));
  });
  return out;
}

// Stufen -6..+6. Angriffswerte: (2+n)/2 bzw. 2/(2-n). Genauigkeit/Fluchtwert: (3+n)/3 bzw. 3/(3-n).
export function stageMultiplier(stage) {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
}
export function accStageMultiplier(stage) {
  return stage >= 0 ? (3 + stage) / 3 : 3 / (3 - stage);
}

// Volltrefferchance Gen 4: Stufe 0: 1/16, 1: 1/8, 2: 1/4, 3: 1/3, 4+: 1/2
export function critChance(stage) {
  return [1 / 16, 1 / 8, 1 / 4, 1 / 3, 1 / 2][Math.min(4, Math.max(0, stage))];
}

// Schadensformel Gen 4:
// Schaden = (((((2*Level/5+2) * Staerke * A / V) / 50) * Brand * ... ) + 2) * Volltreffer * Zufall(85..100)/100 * STAB * Typ
export function calcDamage({ level, power, attack, defense, stab, typeMult, crit, burned, physical, random = rand85to100(), extraMods = 1 }) {
  let base = Math.floor(Math.floor(Math.floor((2 * level) / 5 + 2) * power * attack / defense) / 50);
  if (burned && physical) base = Math.floor(base / 2);
  base += 2;
  if (crit) base = base * 2;
  base = Math.floor(base * extraMods);
  base = Math.floor((base * random) / 100);
  if (stab) base = Math.floor(base * 1.5);
  base = Math.floor(base * typeMult);
  if (typeMult > 0 && base < 1) base = 1;
  return base;
}

export function rand85to100() {
  return 85 + Math.floor(Math.random() * 16);
}

export { typeEffectiveness };

// Fangformel Gen 3/4:
// a = ((3*MaxKP - 2*KP) * Fangrate * Ballbonus) / (3*MaxKP) * Statusbonus
// b = 1048560 / sqrt(sqrt(16711680 / a)); vier Wackelproben mit rand(65536) < b
export function catchAttempt({ maxHp, hp, catchRate, ballBonus, status }) {
  const statusBonus = status === 'slp' || status === 'frz' ? 2 : status ? 1.5 : 1;
  let a = Math.floor((((3 * maxHp - 2 * hp) * catchRate * ballBonus) / (3 * maxHp)) * statusBonus);
  a = Math.max(1, a);
  if (a >= 255) return { caught: true, shakes: 3 };
  const b = Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / a)));
  let shakes = 0;
  for (let i = 0; i < 4; i++) {
    if (Math.floor(Math.random() * 65536) >= b) return { caught: false, shakes };
    shakes++;
  }
  return { caught: true, shakes: 3 };
}

// bonus: fester Faktor oder Funktion (ctx) mit { types, level, turn, water, cave, night, caught } wie in Platin
export const BALLS = {
  'poke-ball': { name: 'Pokéball', bonus: 1 },
  'great-ball': { name: 'Superball', bonus: 1.5 },
  'ultra-ball': { name: 'Hyperball', bonus: 2 },
  'heal-ball': { name: 'Heilball', bonus: 1, heal: true },
  'luxury-ball': { name: 'Luxusball', bonus: 1 },
  'net-ball': { name: 'Netzball', bonus: (c) => (c.types.includes('water') || c.types.includes('bug') ? 3 : 1) },
  'nest-ball': { name: 'Nestball', bonus: (c) => Math.max(1, (40 - c.level) / 10) },
  'dive-ball': { name: 'Tauchball', bonus: (c) => (c.water ? 3.5 : 1) },
  'dusk-ball': { name: 'Finsterball', bonus: (c) => (c.night || c.cave ? 3.5 : 1) },
  'quick-ball': { name: 'Flottball', bonus: (c) => (c.turn <= 1 ? 4 : 1) },
  'timer-ball': { name: 'Timerball', bonus: (c) => Math.min(4, (c.turn - 1 + 10) / 10) },
  'repeat-ball': { name: 'Wiederball', bonus: (c) => (c.caught ? 3 : 1) }
};
export const ballBonus = (id, ctx) => { const b = BALLS[id]; return typeof b?.bonus === 'function' ? b.bonus(ctx) : b?.bonus || 1; };

// EP Gen 4: floor((a * b * L) / 7) / Teilnehmer; a = 1 wild, 1.5 Trainer. Getauscht: x1.5
export function expGain({ baseExp, level, trainer = false, participants = 1, traded = false }) {
  let e = Math.floor(((trainer ? 1.5 : 1) * baseExp * level) / 7);
  e = Math.floor(e / participants);
  if (traded) e = Math.floor(e * 1.5);
  return Math.max(1, e);
}

// Fluchtformel Gen 3/4: F = (A*128/B + 30*Versuche) mod 256
export function escapeAttempt(playerSpeed, wildSpeed, attempts) {
  if (playerSpeed >= wildSpeed) return true;
  const f = (Math.floor((playerSpeed * 128) / wildSpeed) + 30 * attempts) % 256;
  return Math.floor(Math.random() * 256) < f;
}

// Zufallsbegegnung pro Schritt im hohen Gras (Rate aus Kartendaten).
export function encounterRoll(rate) {
  return Math.floor(Math.random() * 2880) < rate * 16;
}

export const SHINY_ODDS = 8192;
