// Stimmung in der Overworld: Tageszeit nach der echten Uhr (wie auf dem DS), Wetter pro Gebiet
// und kleine Effekte beim Laufen. Das Wetter haengt nur von Karte und Uhrzeit ab, darum sehen
// alle Spieler auf derselben Route dasselbe Wetter.
import { MAPS } from '/shared/data/maps.js';

// Wetter, das auf einer Karte vorkommen kann (sonst immer klar)
const WEATHER_POOL = {
  route_201: ['clear', 'clear', 'clear', 'rain'],
  route_202: ['clear', 'clear', 'rain', 'leaves'],
  route_203: ['clear', 'rain', 'rain', 'leaves'],
  route_204: ['clear', 'rain', 'leaves', 'leaves'],
  lake_verity: ['fog', 'fog', 'clear', 'rain'],
  oreburgh_city: ['clear', 'ash', 'ash', 'clear'],
  twinleaf_town: ['clear', 'clear', 'clear', 'leaves'],
  sandgem_town: ['clear', 'clear', 'rain', 'clear'],
  jubilife_city: ['clear', 'clear', 'clear', 'rain']
};
const SLOT_MS = 8 * 60 * 1000;
const ORIG_WEATHER = {
  FOG: 'fog', RAINING: 'rain', ROUTE_212_SOUTH: 'rain', ROUTE_213: 'rain', SANDSTORM: 'sand', SLOW_ASHFALL: 'ash',
  SNOWPOINT_CITY: 'snow', ROUTE_216: 'snow', ACUITY_LAKEFRONT: 'snow', HEAVY_SNOW: 'snow', BLIZZARD: 'snow', CLOUDY: 'snow'
};

export function weatherFor(mapId, now = Date.now()) {
  // Originalkarten: festes Wetter aus dem Kartenkopf wie in Platin
  if (MAPS[mapId]?.orig) return MAPS[mapId].indoor ? 'clear' : ORIG_WEATHER[MAPS[mapId].orig.weather] || 'clear';
  // Festes Wetter einer Karte (Sandsturm auf Route 228)
  if (MAPS[mapId]?.weather && !MAPS[mapId].indoor) return MAPS[mapId].weather;
  const pool = WEATHER_POOL[mapId];
  if (!pool || MAPS[mapId]?.indoor) return 'clear';
  const slot = Math.floor(now / SLOT_MS);
  let h = slot * 2654435761 >>> 0;
  for (const ch of mapId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return pool[h % pool.length];
}

// Tageszeit wie in Platin: Morgen 4 bis 10, Tag bis 17, Abend bis 20, sonst Nacht
export function timeOfDay(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 4 && h < 10) return 'morning';
  if (h >= 10 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'evening';
  return 'night';
}
export const TIME_NAMES = { morning: 'Morgen', day: 'Tag', evening: 'Abend', night: 'Nacht' };
const TINT = { morning: 'rgba(255,200,140,.10)', day: null, evening: 'rgba(255,120,40,.20)', night: 'rgba(16,24,80,.42)' };

export class Ambience {
  constructor() {
    this.drops = Array.from({ length: 140 }, () => ({ x: Math.random() * 720, y: Math.random() * 528, v: 9 + Math.random() * 6 }));
    this.flakes = Array.from({ length: 40 }, () => ({ x: Math.random() * 720, y: Math.random() * 528, p: Math.random() * 6, v: 0.6 + Math.random() }));
    this.puffs = []; // Schrittpartikel in Kachelkoordinaten
    this.override = null; // zum Testen: { time, weather }
  }

  step(mapId, x, y, tile, running) {
    const now = performance.now();
    if (tile === '"') for (let i = 0; i < 5; i++) this.puffs.push({ x: x + 0.5, y: y + 0.7, vx: (Math.random() - 0.5) * 0.05, vy: -0.04 - Math.random() * 0.03, t: now, life: 380, c: i % 2 ? '#3c8c34' : '#6cc04c', s: 6, map: mapId });
    else if (running && tile !== '~') for (let i = 0; i < 2; i++) this.puffs.push({ x: x + 0.5, y: y + 0.95, vx: (Math.random() - 0.5) * 0.02, vy: -0.01, t: now, life: 300, c: 'rgba(240,230,210,.8)', s: 6, map: mapId });
  }

  // Unter der Tageszeit-Toenung: Schrittpartikel
  drawGround(g, mapId, ox, oy, T, now) {
    this.puffs = this.puffs.filter((p) => now - p.t < p.life);
    for (const p of this.puffs) {
      if (p.map !== mapId) continue;
      const age = (now - p.t) / 16.67;
      const a = 1 - (now - p.t) / p.life;
      g.globalAlpha = a; g.fillStyle = p.c;
      g.fillRect(Math.round(ox + (p.x + p.vx * age) * T - p.s / 2), Math.round(oy + (p.y + p.vy * age + 0.002 * age * age) * T), p.s, p.s);
    }
    g.globalAlpha = 1;
  }

  // Wetter und Licht ueber allem. cam = { ox, oy, T }: Verschiebung der Welt auf dem Bildschirm,
  // damit Regentropfen und Pfuetzen an ihrer Stelle in der Welt bleiben, wenn die Kamera mitlaeuft.
  drawSky(g, map, mapId, W, H, now, playerScreen, cam = { ox: 0, oy: 0, T: 48 }) {
    if (map.indoor) return;
    const weather = this.override?.weather || weatherFor(mapId);
    const tod = this.override?.time || timeOfDay();
    const wrap = (v, m) => ((v % m) + m) % m;
    if (weather === 'rain') {
      g.fillStyle = 'rgba(30,40,80,.18)'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(200,220,255,.55)'; g.lineWidth = 2;
      g.beginPath();
      for (const d of this.drops) {
        d.y += d.v; d.x -= d.v * 0.25;
        const x = wrap(d.x + cam.ox, W + 100) - 50; const y = wrap(d.y + cam.oy, H + 20) - 10;
        g.moveTo(x, y); g.lineTo(x + 4, y - 14);
      }
      g.stroke();
      // Pfuetzenringe: ein Ring je Weltzelle, fest an ihrem Platz auf dem Boden
      g.strokeStyle = 'rgba(220,235,255,.35)'; g.lineWidth = 1;
      const CELL = cam.T * 3;
      const cx0 = Math.floor(-cam.ox / CELL); const cy0 = Math.floor(-cam.oy / CELL);
      for (let cy = cy0; cy <= cy0 + Math.ceil(H / CELL); cy++) for (let cx = cx0; cx <= cx0 + Math.ceil(W / CELL); cx++) {
        const h = (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) >>> 0;
        if (h % 3) continue;
        const p = ((now / 900) + (h % 97) / 97) % 1;
        const x = cam.ox + cx * CELL + (h % CELL); const y = cam.oy + cy * CELL + ((h >>> 8) % CELL);
        g.beginPath(); g.ellipse(x, y, 3 + p * 10, 1 + p * 4, 0, 0, Math.PI * 2); g.stroke();
      }
    } else if (weather === 'sand') {
      g.fillStyle = 'rgba(210,170,100,.16)'; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(230,200,140,.7)';
      for (const d of this.drops) {
        d.x += d.v * 0.9; d.y += Math.sin(now / 300 + d.v) * 0.4;
        const x = wrap(d.x + cam.ox, W + 100) - 50; const y = wrap(d.y + cam.oy, H);
        g.fillRect(Math.round(x), Math.round(y), 16, 3);
      }
    } else if (weather === 'leaves' || weather === 'ash') {
      for (const f of this.flakes) {
        f.y += f.v * (weather === 'ash' ? 0.6 : 1); f.x += Math.sin(now / 700 + f.p) * 0.8 + (weather === 'leaves' ? 0.6 : 0);
        if (f.y > H) { f.y = -10; f.x = Math.random() * W; }
        if (f.x > W) f.x = 0;
        g.fillStyle = weather === 'ash' ? 'rgba(90,86,96,.75)' : ['#d8a040', '#c86a30', '#e8c060'][Math.floor(f.p) % 3];
        g.fillRect(Math.round(f.x), Math.round(f.y), weather === 'ash' ? 4 : 6, weather === 'ash' ? 4 : 3);
      }
    } else if (weather === 'snow') {
      for (const f of this.flakes) {
        f.y += f.v * 0.7; f.x += Math.sin(now / 900 + f.p) * 0.6 - 0.3;
        if (f.y > H) { f.y = -10; f.x = Math.random() * W; }
        if (f.x < 0) f.x = W;
        g.fillStyle = 'rgba(255,255,255,.9)';
        const sz = 3 + (Math.floor(f.p) % 3);
        g.fillRect(Math.round(f.x), Math.round(f.y), sz, sz);
      }
    } else if (weather === 'fog') {
      for (let i = 0; i < 4; i++) {
        const x = ((now / (60 + i * 25)) + i * 260) % (W + 400) - 200;
        const gr = g.createRadialGradient(x, 120 + i * 110, 10, x, 120 + i * 110, 260);
        gr.addColorStop(0, 'rgba(235,240,255,.35)'); gr.addColorStop(1, 'rgba(235,240,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      }
    }
    const tint = TINT[tod];
    if (tint) {
      g.fillStyle = tint; g.fillRect(0, 0, W, H);
      if (tod === 'night' && playerScreen) {
        // Kleiner Lichtkegel um die eigene Figur
        const gr = g.createRadialGradient(playerScreen.x, playerScreen.y, 10, playerScreen.x, playerScreen.y, 120);
        gr.addColorStop(0, 'rgba(255,230,170,.16)'); gr.addColorStop(1, 'rgba(255,230,170,0)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      }
    }
  }
}
