// 25 Wesen. plus/minus: betroffene Werte (+10 % / -10 %).
const S = ['atk', 'def', 'spe', 'spa', 'spd'];
const NAMES = [
  ['Robust', 'Solo', 'Mutig', 'Hart', 'Frech'],
  ['Kühn', 'Sanft', 'Locker', 'Pfiffig', 'Lasch'],
  ['Scheu', 'Hastig', 'Ernst', 'Froh', 'Naiv'],
  ['Mäßig', 'Mild', 'Ruhig', 'Zaghaft', 'Hitzig'],
  ['Still', 'Zart', 'Forsch', 'Sacht', 'Kauzig']
];
export const NATURES = [];
for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 5; j++) {
    NATURES.push({ id: i * 5 + j, name: NAMES[i][j], plus: i === j ? null : S[i], minus: i === j ? null : S[j] });
  }
}
export function natureMultiplier(natureId, stat) {
  const n = NATURES[natureId];
  if (!n || !n.plus) return 1;
  if (n.plus === stat) return 1.1;
  if (n.minus === stat) return 0.9;
  return 1;
}
