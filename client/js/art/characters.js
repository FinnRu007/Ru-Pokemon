// Figuren (Spieler und NPCs): ein gemeinsames 16x20-Raster, eingefaerbt ueber Paletten.
// Vorder- und Rueckansicht werden aus der linken Haelfte gespiegelt, rechts = gespiegelte linke Seite.
import { canvas, drawRows, shade } from './pixel.js';

const HEAD = ['........', '.....ooo', '...oohhh', '..ohhhhh', '..ohhwww', '.oHHHHHH'];
const FRONT_FACE = ['.oorrSSS', '..orssss', '..orsess', '..oossss', '...oosss'];
const BACK_HEAD = ['.oorrrrr', '..orrrrr', '..orrrrr', '..oorrrr', '...oorrr'];
const BODY = ['..ocCccc', '.occCccc', '.osCcccc'];
const LEGS = ['..oppppp', '..oppppp', '..opppPo', '..opppo.', '.obbbbo.', '..oooo..'];
const STEP_LEGS = [
  '..oppppppppppo..', '..oppppppppppo..', '..opppPooPpppo..', '..opppo..obbbo..', '.obbbbo...ooo...', '..oooo..........'
];
const SIDE = [
  '................', '.....oooo.......', '....ohhhhoo.....', '...ohhhhhhho....', '...owwwhhhhho...', '.ooHHHHHHHHho...',
  '..oSSSrrrrrro...', '...osssrrrrro...', '...oesssrrro....', '...osssssrro....', '....ooossoo.....', '.....occcco.....',
  '.....ocsCco.....', '.....ocsCco.....'
];
const SIDE_LEGS = ['.....oppppo.....', '.....oppppo.....', '.....opPppo.....', '.....oppppo.....', '....obbbbbo.....', '.....ooooo......'];
const SIDE_STEP = ['.....oppppo.....', '....opppppo.....', '...oppPoppo.....', '..oppo..oppo....', '.obbbo..obbbo...', '..ooo....ooo....'];

const mirrorRow = (r) => r + [...r].reverse().join('');
const FRONT = [...HEAD, ...FRONT_FACE, ...BODY].map(mirrorRow);
const BACK = [...HEAD, ...BACK_HEAD, ...BODY].map(mirrorRow);
const FRAMES = {
  down: [[...FRONT, ...LEGS.map(mirrorRow)], [...FRONT, ...STEP_LEGS]],
  up: [[...BACK, ...LEGS.map(mirrorRow)], [...BACK, ...STEP_LEGS]],
  left: [[...SIDE, ...SIDE_LEGS], [...SIDE, ...SIDE_STEP]]
};

// Vordefinierte Erscheinungsbilder
export const LOOKS = {
  player: { hat: '#e04040', band: '#ffffff', hair: '#2a2a3a', shirt: '#3a5ac8', pants: '#2a2f48', shoes: '#c03030' },
  player2: { hat: '#f0f0f0', band: '#e05080', hair: '#5a3a28', shirt: '#e05080', pants: '#2a2f48', shoes: '#f0f0f0' },
  mom: { hat: '#a8603a', band: '#a8603a', hair: '#a8603a', shirt: '#e88aa0', pants: '#6070b0', shoes: '#704020' },
  rival: { hat: '#f4d048', band: '#f4d048', hair: '#e8b830', shirt: '#f08838', pants: '#2a3a68', shoes: '#30a060' },
  prof: { hat: '#d8d8d8', band: '#f0f0f0', hair: '#c8c8c8', shirt: '#6a5a4a', pants: '#3a3a3a', shoes: '#4a3020' },
  assistant: { hat: '#3a3040', band: '#3a3040', hair: '#3a3040', shirt: '#f4f4f4', pants: '#4a5a8a', shoes: '#3a3a3a' },
  grunt: { hat: '#40b0b0', band: '#40b0b0', hair: '#40b0b0', shirt: '#d8d8e0', pants: '#a0a8b8', shoes: '#383848' },
  nurse: { hat: '#f0f0f0', band: '#f07090', hair: '#f090b0', shirt: '#f8f0f4', pants: '#f8c0d0', shoes: '#f0f0f0' },
  clerk: { hat: '#3870c8', band: '#3870c8', hair: '#3a2a20', shirt: '#4a88e0', pants: '#2a3048', shoes: '#2a2a2a' },
  leader: { hat: '#e05030', band: '#f8e050', hair: '#3a2a20', shirt: '#2a4a8a', pants: '#3a4a3a', shoes: '#5a3a20' },
  youngster: { hat: '#f0c040', band: '#f0c040', hair: '#4a3020', shirt: '#4ab048', pants: '#3a4ac0', shoes: '#c03030' },
  lass: { hat: '#e07818', band: '#e07818', hair: '#e07818', shirt: '#f070a0', pants: '#5070d0', shoes: '#c03060' },
  hiker: { hat: '#7a5a3a', band: '#7a5a3a', hair: '#3a2a1a', shirt: '#c08848', pants: '#5a4a3a', shoes: '#3a2a1a' },
  worker: { hat: '#f0c020', band: '#f0f0f0', hair: '#3a2a1a', shirt: '#5a78a8', pants: '#3a4a6a', shoes: '#2a2a2a' },
  oldman: { hat: '#e8e8e8', band: '#e8e8e8', hair: '#e8e8e8', shirt: '#7a6a8a', pants: '#4a4a5a', shoes: '#3a2a2a' },
  girl: { hat: '#303040', band: '#303040', hair: '#303040', shirt: '#60c0e0', pants: '#f0f0f0', shoes: '#e05050' },
  boy: { hat: '#2a2a2a', band: '#2a2a2a', hair: '#2a2a2a', shirt: '#e0e040', pants: '#4a4ad0', shoes: '#ffffff' },
  scientist: { hat: '#8090a0', band: '#8090a0', hair: '#8090a0', shirt: '#f4f4f4', pants: '#606878', shoes: '#404040' },
  boss: { hat: '#4a8ab8', band: '#4a8ab8', hair: '#4a8ab8', shirt: '#3a3a4a', pants: '#2a2a38', shoes: '#1a1a1a' },
  commander: { hat: '#c84060', band: '#c84060', hair: '#c84060', shirt: '#e8e8f0', pants: '#3a3a4a', shoes: '#1a1a1a' },
  jupiter: { hat: '#7a4ab0', band: '#7a4ab0', hair: '#7a4ab0', shirt: '#e8e8f0', pants: '#3a3a4a', shoes: '#1a1a1a' },
  saturn: { hat: '#4a6ab8', band: '#4a6ab8', hair: '#4a6ab8', shirt: '#e8e8f0', pants: '#3a3a4a', shoes: '#1a1a1a' },
  gardenia: { hat: '#e07a2a', band: '#e07a2a', hair: '#e07a2a', shirt: '#3a9a4a', pants: '#2a5a2a', shoes: '#5a3a1a' },
  fantina: { hat: '#6a3a9a', band: '#d0a040', hair: '#6a3a9a', shirt: '#9a5ad0', pants: '#5a2a8a', shoes: '#3a1a4a' },
  maylene: { hat: '#e890b0', band: '#e890b0', hair: '#e890b0', shirt: '#3a6ac8', pants: '#e8e8f0', shoes: '#c03040' },
  wake: { hat: '#f0f0f0', band: '#3a8ad8', hair: '#3a8ad8', shirt: '#f0a020', pants: '#2a5ab0', shoes: '#f0f0f0' },
  byron: { hat: '#6a4a2a', band: '#6a4a2a', hair: '#6a4a2a', shirt: '#8a8a8a', pants: '#4a4a4a', shoes: '#2a2a2a' },
  candice: { hat: '#3a2a3a', band: '#e05050', hair: '#3a2a3a', shirt: '#f0f0f8', pants: '#e05050', shoes: '#f0f0f8' },
  volkner: { hat: '#f0d040', band: '#f0d040', hair: '#f0d040', shirt: '#2a3a8a', pants: '#3a3a4a', shoes: '#1a1a1a' },
  aaron: { hat: '#3a7a4a', band: '#3a7a4a', hair: '#4a8a3a', shirt: '#c8b060', pants: '#2a4a3a', shoes: '#3a2a1a' },
  bertha: { hat: '#e8e8e8', band: '#e8e8e8', hair: '#d8d8d8', shirt: '#c08840', pants: '#6a4a2a', shoes: '#3a2a1a' },
  flint: { hat: '#e83a2a', band: '#f08020', hair: '#e83a2a', shirt: '#2a2a2a', pants: '#8a5a2a', shoes: '#2a2a2a' },
  lucian: { hat: '#9a3a9a', band: '#9a3a9a', hair: '#9a3a9a', shirt: '#7a2a2a', pants: '#2a2a3a', shoes: '#1a1a1a' },
  cynthia: { hat: '#f0e8c8', band: '#1a1a1a', hair: '#f0e8c8', shirt: '#1a1a1a', pants: '#2a2a2a', shoes: '#1a1a1a' },
  police: { hat: '#2a3a7a', band: '#f0d040', hair: '#2a2a2a', shirt: '#3a5ab0', pants: '#2a3a7a', shoes: '#1a1a1a' },
  swimmer: { hat: '#e04040', band: '#e04040', hair: '#3a2a1a', shirt: '#f0c8a0', pants: '#3a6ad0', shoes: '#f0c8a0' },
  ace: { hat: '#2a2a3a', band: '#f0f0f0', hair: '#2a2a3a', shirt: '#e8e8f0', pants: '#2a2a3a', shoes: '#c03030' },
  skier: { hat: '#3ab0e0', band: '#ffffff', hair: '#3a2a1a', shirt: '#e05050', pants: '#3a3a6a', shoes: '#2a2a2a' },
  psychic: { hat: '#c8a0e0', band: '#c8a0e0', hair: '#c8a0e0', shirt: '#6a4a9a', pants: '#4a3a7a', shoes: '#2a2a3a' }
};

function palette(l) {
  const skin = l.skin || '#f8d0a8';
  return {
    o: '#20202a', h: l.hat, H: shade(l.hat, -0.3), w: l.band, r: l.hair, s: skin, S: shade(skin, -0.15), e: '#20202a',
    c: l.shirt, C: shade(l.shirt, -0.28), p: l.pants, P: shade(l.pants, -0.3), b: l.shoes
  };
}

const cache = new Map();
// Liefert ein Spritesheet (3 Bilder x 4 Richtungen, je 16x20): Spalten stehen/Schritt A/Schritt B,
// Zeilen down, left, right, up.
export function characterSheet(look, overrideColor) {
  const key = (typeof look === 'string' ? look : JSON.stringify(look)) + (overrideColor || '');
  if (cache.has(key)) return cache.get(key);
  let l = typeof look === 'string' ? (LOOKS[look] || LOOKS.player) : look;
  if (overrideColor) l = { ...l, hat: overrideColor, shirt: shade(overrideColor, -0.1) };
  const pal = palette(l);
  const [c, g] = canvas(48, 80);
  const rows = ['down', 'left', 'right', 'up'];
  rows.forEach((dir, ri) => {
    const base = dir === 'right' ? 'left' : dir;
    const [stand, step] = FRAMES[base];
    const flip = dir === 'right';
    drawRows(g, stand, pal, 0, ri * 20, { flip });
    // Schrittbilder mit 1 px Federung, Schritt B = gespiegelter Schritt A (bei Seitenansicht gleich)
    drawRows(g, step, pal, 16, ri * 20 + 1, { flip });
    drawRows(g, step, pal, 32, ri * 20 + 1, { flip: base === 'left' ? flip : !flip });
  });
  cache.set(key, c);
  return c;
}

export const DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };
