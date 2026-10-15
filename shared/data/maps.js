// Overworld-Karten (vereinfachte Platin-Struktur: Zweiblattdorf, Route 201, Kraterberg-See,
// Sandgemme, Route 202, Jubelstadt, Route 203, Route 204). Karten werden aus Bauanweisungen
// zu Kachelrastern erzeugt, damit sie leicht editierbar bleiben.
//
// Kacheln:
//   #  Baum / Wand (blockiert)      .  Weg            ,  Wiese
//   "  Hohes Gras (Encounter)       ~  Wasser (blockiert, spaeter Surfer)
//   H  Gebaeude (blockiert)         D  Tuer           C  Pokemon-Center (heilt)
//   S  Schild (blockiert, lesbar)   F  Zaun (blockiert)
//   L  Vorsprung (nur von Norden nach Sueden passierbar, Sprung)
//
// connections: Uebergang am Kartenrand wie im Original (nahtlos).
//   north/south: newX = x + offset, east/west: newY = y + offset.

function build(w, h, ops) {
  const g = Array.from({ length: h }, () => Array(w).fill('#'));
  for (const [kind, ...a] of ops) {
    if (kind === 'rect') {
      const [x, y, rw, rh, t] = a;
      for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (g[j] && g[j][i] !== undefined) g[j][i] = t;
    } else if (kind === 'tile') {
      const [x, y, t] = a;
      g[y][x] = t;
    }
  }
  return g.map((r) => r.join(''));
}

const house = (x, y, w, h, doorX) => [['rect', x, y, w, h, 'H'], ['tile', doorX, y + h - 1, 'D']];

export const MAPS = {
  twinleaf_town: {
    name: 'Zweiblattdorf', width: 20, height: 16, music: 'twinleaf',
    tiles: build(20, 16, [
      ['rect', 1, 1, 18, 13, ','],
      ['rect', 8, 0, 5, 13, '.'],
      ...house(2, 2, 4, 3, 3), ...house(14, 2, 4, 3, 16), ...house(2, 9, 4, 3, 4), ...house(13, 9, 5, 3, 15),
      ['rect', 5, 6, 10, 3, '.'],
      ['tile', 6, 7, 'S'],
      ['rect', 1, 14, 18, 1, '~']
    ]),
    connections: { north: { map: 'route_201', offset: 0 } },
    buildings: [{ x: 2, y: 2, style: 'house' }, { x: 14, y: 2, style: 'house2' }, { x: 2, y: 9, style: 'house3' }, { x: 13, y: 9, style: 'house5' }],
    events: [
      { x: 3, y: 4, type: 'heal', text: 'Mama: Ruh dich aus, Schatz! Dein Team ist wieder fit.' },
      { x: 16, y: 4, type: 'text', text: 'Das Haus deines Rivalen. Niemand ist da.' },
      { x: 6, y: 7, type: 'text', text: 'Zweiblattdorf: Frische Brise, frisches Laub.' }
    ],
    encounters: null
  },
  route_201: {
    name: 'Route 201', width: 44, height: 14,
    tiles: build(44, 14, [
      ['rect', 1, 1, 42, 12, ','],
      ['rect', 0, 6, 44, 3, '.'],
      ['rect', 8, 9, 5, 5, '.'],
      ['rect', 3, 2, 8, 4, '"'],
      ['rect', 15, 2, 10, 3, '"'],
      ['rect', 14, 9, 8, 3, '"'],
      ['rect', 28, 9, 10, 3, '"'],
      ['rect', 26, 2, 2, 3, '#'],
      ['rect', 30, 5, 10, 1, 'L'],
      ['tile', 13, 5, 'S']
    ]),
    connections: {
      south: { map: 'twinleaf_town', offset: 0 },
      west: { map: 'lake_verity', offset: 0 },
      east: { map: 'sandgem_town', offset: 0 }
    },
    events: [{ x: 13, y: 5, type: 'text', text: 'Route 201  West: Kraterberg-See  Ost: Sandgemme' }],
    encounters: {
      grassRate: 30,
      grass: [
        { species: 396, min: 2, max: 3, weight: 45 },
        { species: 399, min: 2, max: 3, weight: 45 },
        { species: 401, min: 3, max: 3, weight: 10 }
      ]
    }
  },
  lake_verity: {
    name: 'Kraterberg-See', width: 24, height: 16,
    tiles: build(24, 16, [
      ['rect', 1, 1, 22, 14, ','],
      ['rect', 14, 6, 10, 3, '.'],
      ['rect', 3, 3, 10, 9, '~'],
      ['rect', 15, 2, 6, 3, '"'],
      ['rect', 15, 10, 6, 3, '"']
    ]),
    connections: { east: { map: 'route_201', offset: 0 } },
    events: [],
    encounters: {
      grassRate: 30,
      grass: [
        { species: 396, min: 2, max: 4, weight: 40 },
        { species: 399, min: 2, max: 4, weight: 40 },
        { species: 54, min: 3, max: 4, weight: 20 }
      ]
    }
  },
  sandgem_town: {
    name: 'Sandgemme', width: 24, height: 18,
    tiles: build(24, 18, [
      ['rect', 1, 1, 22, 14, ','],
      ['rect', 0, 6, 24, 3, '.'],
      ['rect', 10, 0, 5, 9, '.'],
      ['rect', 10, 8, 3, 7, '.'],
      ...house(3, 10, 6, 4, 6),
      ['rect', 15, 9, 5, 3, 'H'], ['tile', 17, 11, 'C'],
      ['rect', 1, 15, 22, 2, '~'],
      ['tile', 9, 5, 'S']
    ]),
    connections: { west: { map: 'route_201', offset: 0 }, north: { map: 'route_202', offset: -5 } },
    buildings: [{ x: 3, y: 10, style: 'lab' }],
    events: [
      { x: 6, y: 13, type: 'text', text: 'Pokemon-Forschungslabor von Prof. Eibe.' },
      { x: 17, y: 11, type: 'heal', text: 'Willkommen im Pokemon-Center! Deine Pokemon sind wieder fit.' },
      { x: 9, y: 5, type: 'text', text: 'Sandgemme: Die Stadt mit dem Sand der Zeit.' }
    ],
    encounters: null
  },
  route_202: {
    name: 'Route 202', width: 16, height: 36,
    tiles: build(16, 36, [
      ['rect', 1, 1, 14, 34, ','],
      ['rect', 5, 0, 5, 36, '.'],
      ['rect', 2, 5, 12, 5, '"'],
      ['rect', 2, 18, 12, 4, '"'],
      ['rect', 9, 27, 6, 5, '"'],
      ['tile', 4, 33, 'S']
    ]),
    connections: { south: { map: 'sandgem_town', offset: 5 }, north: { map: 'jubilife_city', offset: 9 } },
    events: [{ x: 4, y: 33, type: 'text', text: 'Route 202  Nord: Jubelstadt' }],
    encounters: {
      grassRate: 30,
      grass: [
        { species: 396, min: 3, max: 4, weight: 30 },
        { species: 399, min: 3, max: 4, weight: 30 },
        { species: 403, min: 3, max: 4, weight: 30 },
        { species: 401, min: 3, max: 4, weight: 10 }
      ]
    }
  },
  jubilife_city: {
    name: 'Jubelstadt', width: 32, height: 26,
    tiles: build(32, 26, [
      ['rect', 1, 1, 30, 24, ','],
      ['rect', 14, 0, 5, 26, '.'],
      ['rect', 0, 12, 32, 3, '.'],
      ...house(3, 3, 7, 4, 6),
      ...house(22, 3, 7, 4, 25),
      ['rect', 3, 17, 6, 3, 'H'], ['tile', 5, 19, 'C'],
      ...house(22, 17, 7, 4, 24),
      ['rect', 10, 9, 2, 2, 'F'],
      ['tile', 13, 22, 'S']
    ]),
    connections: { south: { map: 'route_202', offset: -9 }, north: { map: 'route_204', offset: -9 }, east: { map: 'route_203', offset: -6 } },
    buildings: [{ x: 3, y: 3, style: 'school' }, { x: 22, y: 3, style: 'tv' }, { x: 22, y: 17, style: 'corp' }],
    events: [
      { x: 6, y: 6, type: 'text', text: 'Trainerschule von Jubelstadt.' },
      { x: 25, y: 6, type: 'text', text: 'Jubel-TV. Heute: Live aus Sinnoh!' },
      { x: 5, y: 19, type: 'heal', text: 'Willkommen im Pokemon-Center! Deine Pokemon sind wieder fit.' },
      { x: 24, y: 20, type: 'text', text: 'Der Pokecom-Konzern. Leider geschlossen.' },
      { x: 13, y: 22, type: 'text', text: 'Jubelstadt: Die modernste Stadt Sinnohs.' }
    ],
    encounters: null
  },
  route_203: {
    name: 'Route 203', width: 40, height: 14,
    tiles: build(40, 14, [
      ['rect', 1, 1, 38, 12, ','],
      ['rect', 0, 6, 38, 3, '.'],
      ['rect', 6, 2, 9, 4, '"'],
      ['rect', 18, 9, 10, 3, '"'],
      ['rect', 30, 2, 7, 4, '"'],
      ['rect', 22, 2, 3, 3, '#'],
      ['tile', 38, 7, 'S']
    ]),
    connections: { west: { map: 'jubilife_city', offset: 6 } },
    events: [{ x: 38, y: 7, type: 'text', text: 'Erzelingen-Tor. Der Weg ist noch versperrt.' }],
    encounters: {
      grassRate: 30,
      grass: [
        { species: 396, min: 4, max: 6, weight: 20 },
        { species: 399, min: 4, max: 6, weight: 20 },
        { species: 403, min: 4, max: 6, weight: 20 },
        { species: 401, min: 5, max: 5, weight: 10 },
        { species: 63, min: 4, max: 6, weight: 15 },
        { species: 41, min: 5, max: 6, weight: 15 }
      ]
    }
  },
  route_204: {
    name: 'Route 204', width: 16, height: 30,
    tiles: build(16, 30, [
      ['rect', 1, 1, 14, 28, ','],
      ['rect', 5, 2, 5, 28, '.'],
      ['rect', 2, 4, 12, 5, '"'],
      ['rect', 1, 14, 6, 6, '"'],
      ['rect', 10, 20, 5, 5, '"'],
      ['rect', 5, 1, 5, 1, '.'],
      ['tile', 4, 2, 'S']
    ]),
    connections: { south: { map: 'jubilife_city', offset: 9 } },
    events: [{ x: 4, y: 2, type: 'text', text: 'Route 204  Nord: Felsige Hoehle (noch versperrt)' }],
    encounters: {
      grassRate: 30,
      grass: [
        { species: 406, min: 4, max: 6, weight: 20 },
        { species: 265, min: 4, max: 5, weight: 20 },
        { species: 396, min: 4, max: 6, weight: 15 },
        { species: 399, min: 4, max: 6, weight: 15 },
        { species: 403, min: 4, max: 6, weight: 10 },
        { species: 401, min: 4, max: 6, weight: 10 },
        { species: 41, min: 5, max: 5, weight: 10 }
      ]
    }
  }
};

export const SPAWN = { map: 'twinleaf_town', x: 10, y: 7, dir: 'down' };
