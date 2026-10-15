// Bausteine fuer Karten: Aussenkarten aus Rechtecken, Innenraeume aus ASCII-Rastern und fertige
// Vorlagen fuer Pokemon-Center, Markt, Wohnhaeuser und Arenen. Zeichenerklaerung in maps.js.

export function build(w, h, ops) {
  const g = Array.from({ length: h }, () => Array(w).fill('#'));
  for (const [kind, ...a] of ops) {
    if (kind === 'rect') {
      const [x, y, rw, rh, t] = a;
      for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (g[j] && g[j][i] !== undefined) g[j][i] = t;
    } else if (kind === 'tile') {
      const [x, y, t] = a;
      if (g[y] && g[y][x] !== undefined) g[y][x] = t;
    }
  }
  return g.map((r) => r.join(''));
}

export function grid(rows) {
  const w = rows[0].length;
  rows.forEach((r, i) => { if (r.length !== w) throw new Error(`Kartenzeile ${i} hat Laenge ${r.length} statt ${w}`); });
  return { tiles: rows, width: w, height: rows.length };
}

// Gebaeude als Rechteck mit Tuer in der untersten Reihe
export const house = (x, y, w, h, doorX, door = 'D') => [['rect', x, y, w, h, 'H'], ['tile', doorX, y + h - 1, door]];

export const HEAL_TEXT = 'Willkommen im Pokémon-Center! Wir pflegen deine Pokémon wieder gesund.';

export const centerRoom = () => ({
  name: 'Pokémon-Center', indoor: true, theme: 'center', entry: { x: 5, y: 7 },
  ...grid(['WWWWWWWWWWW', 'WWWWWWWWWWW', 'Y__P___P__Y', '___KKKKK___', '___________', '_TT_____BB_', '___________', '_____E_____']),
  events: [{ x: 5, y: 3, type: 'heal', text: HEAL_TEXT }]
});

export const martRoom = () => ({
  name: 'Pokémon-Markt', indoor: true, theme: 'mart', entry: { x: 5, y: 7 },
  ...grid(['WWWWWWWWWWW', 'WWWWWWWWWWW', '_K_________', '_K__BBB_BBB', '_K_________', '____BBB_BBB', '___________', '_____E_____']),
  events: [{ x: 1, y: 3, type: 'shop', text: 'Willkommen! Was darf es sein?' }]
});

const HOUSES = [
  ['WWWWWWWWWW', 'WWWWWWWWWW', 'BB__V____Y', '__________', '___TT_____', '___TT_____', '__________', '____E_____'],
  ['WWWWWWWWWW', 'WWWWWWWWWW', 'Y__BB__V_Y', '__________', '_TT_______', '_TT_______', '________Y_', '____E_____'],
  ['WWWWWWWWWW', 'WWWWWWWWWW', 'B_V____BBY', '__________', '_____TT___', '_____TT___', 'R_________', '____E_____']
];
export const houseRoom = (name, variant = 0, events = []) => ({
  name, indoor: true, theme: 'house', entry: { x: 4, y: 7 }, ...grid(HOUSES[variant % HOUSES.length]), events
});

// Arenen: drei Grundrisse, Farben ueber palette. Leiter steht oben (7,3), Eingang unten (7,17).
const GYMS = [
  [
    'WWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWW', 'Y_____________Y', '_______________', 'XXXXXX___XXXXXX', '_______________',
    '__Y_________Y__', '____XXX_XXX____', '_______________', 'XXX_________XXX', '_______________', '__Y___XXX___Y__',
    '_______________', 'XXXXX_____XXXXX', '_______________', '__Y_________Y__', '_______________', '_______E_______'
  ],
  [
    'WWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWW', 'X_____________X', 'X_____________X', 'X__O_______O__X', 'XXXXXX___XXXXXX',
    '_______________', '_XXXX_____XXXX_', '_______________', '______XXX______', '_XX_________XX_', '_______________',
    'XXXXXX___XXXXXX', '_______________', '_O___________O_', '_______________', '_______________', '_______E_______'
  ],
  [
    'WWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWW', 'XX___________XX', 'X_____________X', 'X___XX___XX___X', 'X_____________X',
    'XXXX__XXX__XXXX', '_______________', '__XX_______XX__', '_______________', 'XXXXX_____XXXXX', '_______________',
    '___XX_____XX___', '_______________', 'XXX__XXXXX__XXX', '_______________', '_______________', '_______E_______'
  ]
];
export const gymRoom = (name, layout, palette) => ({
  name, indoor: true, theme: 'gym', entry: { x: 7, y: 17 }, palette, ...grid(GYMS[layout % GYMS.length]), events: []
});

// Raum der Top Vier: Durchgang oben (U), Eingang unten
export const leagueRoom = (name, palette) => ({
  name, indoor: true, theme: 'gym', palette, entry: { x: 5, y: 10 },
  ...grid(['WWWWWWWWWWW', 'WWWWWUWWWWW', 'Y_________Y', '___________', '___________', 'X_________X', '___________',
    '__Y_____Y__', '___________', '___________', '_____E_____']),
  events: []
});

// Farben fuer Arenen und Galaktik-Gebaeude
export const GYM_PALETTES = {
  forest: { floor: '#a6cc84', speck: '#86ac64', wall: '#5a8a4a', wallStripe: '#4a7a3a', base: '#3a5a2a', top: '#2a4a20', rock: '#4f8f42' },
  ghost: { floor: '#6a5a86', speck: '#54466e', wall: '#3a2e52', wallStripe: '#2e2444', base: '#221a34', top: '#1a1428', rock: '#4a3a66' },
  fight: { floor: '#c8c0b4', speck: '#a8a094', wall: '#8a6a5a', wallStripe: '#7a5a4a', base: '#5a3a2a', top: '#3a2a20', rock: '#9a8a7a' },
  water: { floor: '#8cc0e8', speck: '#6aa0d0', wall: '#3a6aa8', wallStripe: '#2e5a96', base: '#1e3a6a', top: '#16305a', rock: '#3a7ac0' },
  steel: { floor: '#b8bcc4', speck: '#989ca8', wall: '#6a6e7a', wallStripe: '#5a5e6a', base: '#3a3e48', top: '#2a2e38', rock: '#8a8e9a' },
  ice: { floor: '#dceef8', speck: '#b8d8ec', wall: '#8ab8d8', wallStripe: '#7aa8c8', base: '#4a789a', top: '#3a6888', rock: '#a8d0ec' },
  electric: { floor: '#e8d890', speck: '#c8b870', wall: '#6a6a7a', wallStripe: '#5a5a6a', base: '#3a3a48', top: '#2a2a38', rock: '#d8b840' },
  galactic: { floor: '#c8d4dc', floorLine: '#a8b8c4', wall: '#9ab0bc', wallStripe: '#7a98a8', base: '#3a6a7a', top: '#2a4a5a', counter: '#d8e0e6' }
};

