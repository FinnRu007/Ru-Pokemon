// Innenraeume, Hoehlen und Fels: Boden, Waende und Moebel je nach Thema der Karte.
import { hash, px, shade } from './pixel.js';

export const THEMES = {
  house: { floor: '#d9a86a', floorLine: '#bb8a52', wall: '#f2e2c4', wallStripe: '#e4cfa6', base: '#a87848', top: '#5a4636', counter: '#c89058' },
  center: { floor: '#f6f2ea', floor2: '#f2d4da', wall: '#fbeaee', wallStripe: '#f2b4c2', base: '#d06878', top: '#9a4656', counter: '#fbf4f4', counterFront: '#e87890' },
  mart: { floor: '#eef4fa', floor2: '#cfe0f2', wall: '#e8f0fa', wallStripe: '#9cc0e6', base: '#3f78c0', top: '#2e5a8a', counter: '#f4f8fc', counterFront: '#4f88d0' },
  lab: { floor: '#e6ebe2', floorLine: '#c6cfc0', wall: '#e8efe8', wallStripe: '#c8d8cc', base: '#6a8a78', top: '#4a6658', counter: '#e8ece8' },
  school: { floor: '#e2bc80', floorLine: '#c89c62', wall: '#f4ecd8', wallStripe: '#d8e4c0', base: '#7a9a5a', top: '#5a6a4a', counter: '#c89058' },
  gym: { floor: '#cdb48a', speck: '#a88e66', wall: '#9a7a5a', wallStripe: '#866648', base: '#5a4430', top: '#4a3a2a', rock: '#8e7458' },
  cave: { floor: '#b89a6a', speck: '#957a50', rock: '#7c6248', top: '#4a3a2a' }
};

export function paintFloor(g, ox, oy, x, y, th, theme) {
  if (theme === 'center' || theme === 'mart') {
    const alt = (x + y) % 2 === 0;
    px(g, alt ? th.floor : th.floor2, ox, oy, 16, 16);
    px(g, shade(th.floor2, -0.08), ox, oy + 15, 16, 1); px(g, shade(th.floor2, -0.08), ox + 15, oy, 1, 16);
    return;
  }
  if (theme === 'gym' || theme === 'cave') {
    px(g, th.floor, ox, oy, 16, 16);
    for (let i = 0; i < 6; i++) px(g, hash(x, y, i + 20) > 0.5 ? th.speck : shade(th.floor, 0.12), ox + Math.floor(hash(x, y, i) * 15), oy + Math.floor(hash(x, y, i + 9) * 15), hash(x, y, i + 3) > 0.7 ? 2 : 1, 1);
    return;
  }
  if (theme === 'lab') {
    px(g, th.floor, ox, oy, 16, 16);
    px(g, th.floorLine, ox, oy, 16, 1); px(g, th.floorLine, ox, oy, 1, 16);
    return;
  }
  // Holzdielen
  px(g, th.floor, ox, oy, 16, 16);
  for (let r = 0; r < 4; r++) {
    px(g, th.floorLine, ox, oy + r * 4 + 3, 16, 1);
    const seam = (Math.floor(hash(x, y + r, 1) * 12) + r * 5) % 16;
    px(g, th.floorLine, ox + seam, oy + r * 4, 1, 3);
  }
  px(g, shade(th.floor, 0.1), ox, oy + 1, 16, 1);
}

export function paintWall(g, ox, oy, x, y, n, th) {
  const face = n(0, 1) !== 'W';
  if (!face) {
    px(g, th.top, ox, oy, 16, 16);
    px(g, shade(th.top, 0.15), ox, oy + 15, 16, 1);
    return;
  }
  px(g, th.wall, ox, oy, 16, 16);
  for (let i = 0; i < 16; i += 4) px(g, th.wallStripe, ox + i, oy, 2, 13);
  px(g, shade(th.wall, 0.1), ox, oy, 16, 2);
  px(g, th.base, ox, oy + 13, 16, 3);
  px(g, shade(th.base, -0.3), ox, oy + 15, 16, 1);
  // Bild oder Fenster an festen Stellen
  if (hash(x, y, 4) > 0.78) {
    px(g, '#3a3030', ox + 3, oy + 3, 10, 8);
    px(g, '#8ec8ee', ox + 4, oy + 4, 8, 6);
    px(g, '#c8ecff', ox + 4, oy + 4, 3, 3);
  }
}

export function paintCounter(g, ox, oy, x, y, n, th) {
  const top = th.counter; const front = th.counterFront || shade(top, -0.3);
  px(g, '#2a2420', ox, oy + 2, 16, 14);
  px(g, top, ox, oy + 3, 16, 5);
  px(g, shade(top, 0.2), ox, oy + 3, 16, 1);
  px(g, front, ox, oy + 8, 16, 7);
  px(g, shade(front, -0.25), ox, oy + 14, 16, 1);
  if (n(-1, 0) !== 'K') px(g, '#2a2420', ox, oy + 2, 1, 14);
  if (n(1, 0) !== 'K') px(g, '#2a2420', ox + 15, oy + 2, 1, 14);
  if (n(0, -1) === 'K') px(g, top, ox + 1, oy, 14, 3);
}

const BOOKS = ['#d04848', '#4878d0', '#48a050', '#e0b040', '#8a50b0', '#e07830'];
export function paintShelf(g, ox, oy, x, y, theme) {
  px(g, '#3a2a1e', ox, oy - 4, 16, 20);
  px(g, '#8a5a34', ox + 1, oy - 3, 14, 18);
  for (let r = 0; r < 3; r++) {
    const sy = oy - 2 + r * 6;
    px(g, '#5a3a20', ox + 2, sy, 12, 5);
    for (let b = 0; b < 6; b++) {
      const c = theme === 'mart' ? ['#f4f4f4', '#e04848', '#4878d0'][(b + r) % 3] : BOOKS[Math.floor(hash(x * 7 + b, y + r, 3) * BOOKS.length)];
      const h = theme === 'mart' ? 3 : 4 + (hash(x, b, r) > 0.5 ? 0 : -1);
      px(g, c, ox + 2 + b * 2, sy + 5 - h, 2, h);
    }
    px(g, '#a8784a', ox + 1, sy + 5, 14, 1);
  }
}

export function paintTable(g, ox, oy, x, y, n) {
  const l = n(-1, 0) === 'T'; const r = n(1, 0) === 'T'; const u = n(0, -1) === 'T'; const d = n(0, 1) === 'T';
  const x0 = l ? 0 : 1; const x1 = r ? 16 : 15; const y0 = u ? 0 : 2; const y1 = d ? 16 : 12;
  px(g, '#3a2a1e', ox + x0, oy + y0, x1 - x0, y1 - y0 + 1);
  px(g, '#c8945a', ox + x0 + (l ? 0 : 1), oy + y0 + (u ? 0 : 1), x1 - x0 - (l ? 0 : 1) - (r ? 0 : 1), y1 - y0 - (u ? 0 : 1));
  px(g, '#e0b078', ox + x0 + 1, oy + y0 + 1, x1 - x0 - 2, 1);
  if (!d) { px(g, '#8a5a34', ox + x0 + 1, oy + y1 - 1, x1 - x0 - 2, 2); if (!l) px(g, '#3a2a1e', ox + 2, oy + 13, 2, 3); if (!r) px(g, '#3a2a1e', ox + 12, oy + 13, 2, 3); }
}

export function paintPlant(g, ox, oy) {
  px(g, '#6a3a20', ox + 4, oy + 10, 8, 6); px(g, '#a05a30', ox + 5, oy + 10, 6, 5); px(g, '#c87848', ox + 5, oy + 10, 6, 1);
  const L = '#3a9a40'; const D = '#24702e'; const H = '#6ac860';
  px(g, D, ox + 3, oy + 2, 10, 8); px(g, L, ox + 4, oy + 1, 8, 8); px(g, H, ox + 5, oy + 2, 3, 3);
  px(g, L, ox + 1, oy + 5, 3, 3); px(g, L, ox + 12, oy + 5, 3, 3); px(g, D, ox + 7, oy - 2, 2, 4);
}

export function paintMachine(g, ox, oy, x, y, theme) {
  px(g, '#2a2a34', ox + 1, oy - 2, 14, 17);
  px(g, '#b8bcc8', ox + 2, oy - 1, 12, 15);
  px(g, '#d8dce6', ox + 2, oy - 1, 12, 2);
  if (theme === 'center') {
    for (let i = 0; i < 3; i++) { px(g, '#e04848', ox + 3 + i * 4, oy + 3, 3, 2); px(g, '#ffffff', ox + 3 + i * 4, oy + 5, 3, 2); }
    px(g, '#58d878', ox + 4, oy + 10, 8, 2);
  } else {
    px(g, '#203048', ox + 3, oy + 1, 10, 7);
    px(g, hash(x, y, 1) > 0.5 ? '#58b8f0' : '#68e0a0', ox + 4, oy + 2, 8, 5);
    px(g, '#e8f8ff', ox + 4, oy + 2, 2, 1);
    px(g, '#e04848', ox + 4, oy + 10, 2, 2); px(g, '#f0d040', ox + 7, oy + 10, 2, 2);
  }
  px(g, 'rgba(0,0,0,.2)', ox + 1, oy + 15, 14, 1);
}

export function paintTv(g, ox, oy, x, y, n, theme) {
  if (theme === 'school') {
    const l = n(-1, 0) === 'V'; const r = n(1, 0) === 'V';
    px(g, '#7a5230', ox, oy - 2, 16, 14);
    px(g, '#2e5a3a', ox + (l ? 0 : 2), oy, 16 - (l ? 0 : 2) - (r ? 0 : 2), 10);
    if (hash(x, y, 2) > 0.4) px(g, '#e8f0e8', ox + 4, oy + 3, 7, 1);
    if (hash(x, y, 5) > 0.5) px(g, '#e8f0e8', ox + 3, oy + 6, 5, 1);
    return;
  }
  px(g, '#3a3a44', ox + 3, oy + 11, 10, 4);
  px(g, '#1a1a22', ox + 1, oy + 1, 14, 11);
  px(g, '#3a5a8a', ox + 2, oy + 2, 12, 8);
  px(g, '#6a9ad0', ox + 2, oy + 2, 4, 3);
}

export function paintBed(g, ox, oy, x, y, n) {
  const head = n(0, -1) !== 'R';
  px(g, '#3a2a1e', ox + 1, oy + (head ? 1 : 0), 14, head ? 15 : 14);
  px(g, '#5a88d8', ox + 2, oy + (head ? 2 : 0), 12, head ? 14 : 12);
  if (head) { px(g, '#ffffff', ox + 3, oy + 3, 10, 5); px(g, '#d8e0f0', ox + 3, oy + 7, 10, 1); }
  else { px(g, '#4870c0', ox + 2, oy + 10, 12, 2); px(g, '#8a5a34', ox + 1, oy + 13, 14, 2); }
}

export function paintStairs(g, ox, oy) {
  px(g, '#3a2a1e', ox, oy, 16, 16);
  for (let i = 0; i < 5; i++) { px(g, '#c8945a', ox + 1, oy + 1 + i * 3, 14, 2); px(g, '#8a5a34', ox + 1, oy + 3 + i * 3, 14, 1); }
}

export function paintMat(g, ox, oy) {
  px(g, '#a83030', ox + 1, oy + 4, 14, 10);
  px(g, '#e05050', ox + 2, oy + 5, 12, 8);
  px(g, '#f08080', ox + 3, oy + 6, 10, 1);
}

export function paintBoulder(g, ox, oy) {
  px(g, 'rgba(0,0,0,.2)', ox + 2, oy + 13, 12, 2);
  px(g, '#3a3028', ox + 2, oy + 3, 12, 11); px(g, '#3a3028', ox + 3, oy + 2, 10, 13);
  px(g, '#8a8070', ox + 3, oy + 3, 10, 10); px(g, '#a89e8c', ox + 4, oy + 4, 5, 3); px(g, '#6a6052', ox + 7, oy + 9, 6, 3);
}

// Fels: Oberseite rau, sichtbare Front mit senkrechten Kanten
export function paintRock(g, ox, oy, x, y, n, palette) {
  const rock = palette.rock; const top = palette.top;
  const face = n(0, 1) !== null && n(0, 1) !== 'X' && n(0, 1) !== 'G';
  if (!face) {
    px(g, shade(rock, -0.25), ox, oy, 16, 16);
    for (let i = 0; i < 5; i++) px(g, hash(x, y, i) > 0.5 ? shade(rock, 0.1) : top, ox + Math.floor(hash(x, y, i + 1) * 14), oy + Math.floor(hash(x, y, i + 2) * 14), 3, 2);
    if (n(0, -1) !== 'X' && n(0, -1) !== null) px(g, shade(rock, 0.25), ox, oy, 16, 2);
    return;
  }
  px(g, rock, ox, oy, 16, 16);
  for (let i = 1; i < 16; i += 5) px(g, shade(rock, -0.25), ox + i + ((y % 2) * 2), oy + 2, 1, 12);
  px(g, shade(rock, 0.22), ox, oy, 16, 2);
  px(g, shade(rock, -0.4), ox, oy + 14, 16, 2);
}

export function paintCaveMouth(g, ox, oy, x, y, n, palette) {
  paintRock(g, ox, oy, x, y, (dx, dy) => (dx === 0 && dy === 1 ? '.' : n(dx, dy)), palette);
  px(g, '#100c0a', ox + 2, oy + 3, 12, 13);
  px(g, '#100c0a', ox + 4, oy + 1, 8, 2);
  px(g, '#2a201a', ox + 3, oy + 13, 10, 3);
}

export function paintCoal(g, ox, oy, x, y) {
  px(g, '#7c736a', ox, oy, 16, 16);
  for (let i = 0; i < 7; i++) px(g, hash(x, y, i) > 0.4 ? '#4c4640' : '#9c9288', ox + Math.floor(hash(x, y, i + 3) * 15), oy + Math.floor(hash(x, y, i + 6) * 15), hash(x, y, i + 9) > 0.6 ? 2 : 1, 1);
}
