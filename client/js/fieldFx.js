// Feldattacke wie in Platin: ein Band zieht über das Bild, das Pokémon gleitet hinein und ruft,
// danach wirkt die Attacke auf das Hindernis (Baum fällt, Felsen zerspringt, Felsblock rutscht weg).
import { monsterDataUrl } from './art/monsters.js';
import { audio } from './audio.js';

export const CUTIN_MS = 1150;
const WORDS = { cut: 'Zerschneider', 'rock-smash': 'Zertrümmerer', strength: 'Stärke', surf: 'Surfer', fly: 'Fliegen', 'rock-climb': 'Kraxler', waterfall: 'Kaskade', defog: 'Auflockern' };

let el = null;
function ensure() {
  if (el) return el;
  el = document.createElement('div');
  el.id = 'fieldCut';
  el.innerHTML = '<div class="band"><img alt=""><span></span></div>';
  document.getElementById('stage').appendChild(el);
  return el;
}

// Einblendung abspielen. Liefert die Dauer in ms.
export function playCutIn(mon, move) {
  const root = ensure();
  const img = root.querySelector('img');
  img.src = monsterDataUrl({ speciesId: mon.speciesId, shiny: !!mon.shiny }, false);
  root.querySelector('span').textContent = WORDS[move] || '';
  root.classList.remove('on'); void root.offsetWidth; root.classList.add('on');
  setTimeout(() => { try { audio.sfx('cry', mon.speciesId); } catch { /* kein Ruf */ } }, 380);
  clearTimeout(root.timer); clearTimeout(root.timer2);
  root.timer = setTimeout(() => root.classList.remove('on'), CUTIN_MS + 50);
  if (['cut', 'rock-smash', 'strength'].includes(move)) root.timer2 = setTimeout(() => { try { audio.sfx('move', { move }); } catch { /* still */ } }, CUTIN_MS);
  return CUTIN_MS;
}

// Erstes Pokémon im Team, das die Attacke kann
export function fieldMon(party, move) {
  return (party || []).find((m) => !m.egg && m.alive !== false && (m.moves || []).some((x) => x.id === move)) || null;
}

// Wirkung auf dem Feld (Renderer zeichnet sie): bis CUTIN_MS steht das Hindernis noch, dann die Wirkung
export const FX_MS = 650;
export function drawFieldFx(g, fx, sx, sy, T, S, img, now) {
  const t = now - fx.start - CUTIN_MS;
  const w = img ? img.width * S : T, h = img ? img.height * S : T;
  const bx = sx + T / 2 - w / 2, by = sy + T - h;
  const whole = () => { if (img) g.drawImage(img, bx, by, w, h); else { g.fillStyle = '#6a7a50'; g.fillRect(sx + 6, sy + 6, T - 12, T - 12); } };
  if (t < 0) { whole(); return true; }
  const f = Math.min(1, t / FX_MS);
  if (f >= 1) return false;
  g.save();
  if (fx.move === 'cut') {
    // Baum faellt in zwei Haelften auseinander, Blaetter fliegen
    g.globalAlpha = 1 - f;
    for (const side of [-1, 1]) {
      g.save();
      g.translate(bx + w / 2 + side * f * T * 0.5, by + h);
      g.rotate(side * f * 0.9);
      g.beginPath(); g.rect(side < 0 ? -w / 2 : 0, -h, w / 2, h); g.clip();
      if (img) g.drawImage(img, -w / 2, -h, w, h); else { g.fillStyle = '#4a7a3a'; g.fillRect(-w / 2, -h, w, h); }
      g.restore();
    }
    g.fillStyle = '#68c050';
    for (let i = 0; i < 8; i++) { const a = i * 0.8; g.fillRect(sx + T / 2 + Math.cos(a) * f * T * 1.2, sy + T / 2 - Math.sin(a) * f * T + f * f * T, 5, 5); }
  } else if (fx.move === 'rock-smash') {
    // Felsen zerspringt in Brocken
    const shake = f < 0.25 ? Math.sin(t / 15) * 3 : 0;
    if (f < 0.25) { if (img) g.drawImage(img, bx + shake, by, w, h); else whole(); }
    else {
      g.globalAlpha = 1 - (f - 0.25) / 0.75;
      g.fillStyle = '#8a8478';
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2; const r = (f - 0.25) * T * 1.4;
        g.fillRect(sx + T / 2 + Math.cos(a) * r - 4, sy + T / 2 - Math.abs(Math.sin(a)) * r + (f - 0.25) * (f - 0.25) * T * 2, 8, 7);
      }
    }
  } else if (fx.move === 'strength') {
    // Felsblock rutscht in Blickrichtung weg
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[fx.dir] || [0, -1];
    g.globalAlpha = f < 0.6 ? 1 : 1 - (f - 0.6) / 0.4;
    g.translate(d[0] * f * T, d[1] * f * T);
    whole();
  }
  g.restore();
  return true;
}
