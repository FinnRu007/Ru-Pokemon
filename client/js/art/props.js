// Eigene Ersatzgrafik fuer Feldobjekte der Originalkarten (Schilder, Briefkasten, Poller, Felsen, Baeume),
// falls die Originalbilder (npm run sprites) fehlen oder noch laden. Ein Hindernis ist so nie unsichtbar.
// Gezeichnet in 16er Pixeln, unten mittig auf dem Feld. Liefert die Breite in Pixeln (fuer die Verdeckung).
const SIGNS = new Set(['MAP_SIGNPOST', 'SIGNBOARD', 'ARROW_SIGNPOST', 'GYM_SIGNPOST', 'TRAINER_TIPS_SIGNPOST']);
export const PROP_KINDS = new Set([...SIGNS, 'MAILBOX', 'BOOK', 'bollard', 'rock_smash', 'cut_tree', 'strength_boulder']);

export function drawProp(g, kind, sx, sy, S) {
  // sx/sy: linke obere Ecke des Feldes auf dem Bildschirm
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(sx + x * S), Math.round(sy + y * S), Math.ceil(w * S), Math.ceil(h * S)); };
  if (SIGNS.has(kind)) {
    const board = kind === 'GYM_SIGNPOST' ? '#4a6fd0' : kind === 'TRAINER_TIPS_SIGNPOST' ? '#3f9a5a' : kind === 'ARROW_SIGNPOST' ? '#5b9c6e' : '#a0703c';
    px(7, 6, 2, 9, '#5a4028'); px(6, 14, 4, 1, 'rgba(0,0,0,.25)');
    px(1, -3, 14, 10, '#2b2b2b'); px(2, -2, 12, 8, board); px(3, -1, 10, 1, 'rgba(255,255,255,.35)');
    px(4, 1, 8, 1, 'rgba(255,255,255,.55)'); px(4, 3, 6, 1, 'rgba(255,255,255,.55)');
    return 16;
  }
  if (kind === 'MAILBOX') {
    px(7, 6, 2, 9, '#4a4a52'); px(3, -4, 10, 10, '#2b2b2b'); px(4, -3, 8, 8, '#d84848'); px(5, -2, 6, 2, '#f08080'); px(6, 1, 4, 1, '#2b2b2b');
    return 14;
  }
  if (kind === 'BOOK') { px(3, 6, 10, 6, '#2b2b2b'); px(4, 7, 4, 4, '#f4f4f4'); px(8, 7, 4, 4, '#e8e8f8'); return 12; }
  if (kind === 'bollard') { px(4, 4, 8, 11, '#2b2b2b'); px(5, 5, 6, 9, '#8a8a92'); px(5, 7, 6, 2, '#c84848'); return 10; }
  if (kind === 'cut_tree') {
    px(7, 10, 2, 5, '#5a4028'); px(2, 1, 12, 10, '#1e5a2e'); px(3, 2, 10, 7, '#3a9a4a'); px(5, 3, 4, 2, '#6acb6a');
    return 14;
  }
  // Felsen und Felsblock
  const big = kind === 'strength_boulder';
  px(big ? 1 : 2, big ? 1 : 5, big ? 14 : 12, big ? 14 : 10, '#2b2b2b');
  px(big ? 2 : 3, big ? 2 : 6, big ? 12 : 10, big ? 12 : 8, big ? '#9a8a70' : '#a8a0a0');
  px(big ? 4 : 5, big ? 4 : 7, 4, 2, 'rgba(255,255,255,.4)');
  return big ? 16 : 14;
}
