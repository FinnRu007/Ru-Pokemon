// Erfahrungskurven (Gesamt-EP für Level n).
export const GROWTH = {
  fast: (n) => Math.floor((4 * n ** 3) / 5),
  medium_fast: (n) => n ** 3,
  medium_slow: (n) => Math.floor((6 / 5) * n ** 3 - 15 * n ** 2 + 100 * n - 140),
  slow: (n) => Math.floor((5 * n ** 3) / 4),
  erratic: (n) => {
    if (n <= 50) return Math.floor((n ** 3 * (100 - n)) / 50);
    if (n <= 68) return Math.floor((n ** 3 * (150 - n)) / 100);
    if (n <= 98) return Math.floor((n ** 3 * Math.floor((1911 - 10 * n) / 3)) / 500);
    return Math.floor((n ** 3 * (160 - n)) / 100);
  },
  fluctuating: (n) => {
    if (n <= 15) return Math.floor((n ** 3 * (Math.floor((n + 1) / 3) + 24)) / 50);
    if (n <= 36) return Math.floor((n ** 3 * (n + 14)) / 50);
    return Math.floor((n ** 3 * (Math.floor(n / 2) + 32)) / 50);
  }
};
export function expForLevel(rate, level) {
  if (level <= 1) return 0;
  return Math.max(0, GROWTH[rate](level));
}
export function levelForExp(rate, exp) {
  let lv = 1;
  while (lv < 100 && expForLevel(rate, lv + 1) <= exp) lv++;
  return lv;
}
