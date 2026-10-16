// Statuswerte beim Levelaufstieg wie in Platin: erst die Zuwaechse, dann die neuen Werte.
// Das Fenster haelt alle Tasten fest, bis es mit Aktionstaste oder Klick weitergeschaltet wird.
const LABELS = [['hp', 'KP'], ['atk', 'Angriff'], ['def', 'Verteidigung'], ['spa', 'Sp.-Angriff'], ['spd', 'Sp.-Verteid.'], ['spe', 'Initiative']];
let advance = null;

addEventListener('keydown', (e) => {
  if (!advance) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (['KeyZ', 'Enter', 'Space', 'KeyX', 'Escape'].includes(e.code) && !e.repeat) advance();
}, true);

export const levelStatsOpen = () => !!advance;

export async function showLevelStats(parent, before, after) {
  if (!before || !after || !parent) return;
  const el = document.createElement('div');
  el.className = 'lvstats';
  const page = (diff) => LABELS.map(([k, n]) => `<div><span>${n}</span><b>${diff ? '+' + Math.max(0, after[k] - before[k]) : after[k]}</b></div>`).join('');
  const wait = () => new Promise((r) => { const go = () => { advance = null; el.onclick = null; r(); }; setTimeout(() => { advance = go; el.onclick = go; }, 150); });
  el.innerHTML = page(true);
  parent.appendChild(el);
  await wait();
  el.innerHTML = page(false);
  await wait();
  el.remove();
}
