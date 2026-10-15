// Canvas-Renderer mit Platzhaltergrafik. Echte Sprites werden ueber assets/sprites/manifest.json
// eingebunden: Ist fuer eine Kachel/Figur ein Bild gesetzt und geladen, wird es statt der Farbe gezeichnet.
import { MAPS } from '/shared/data/maps.js';

const VIEW_W = 15, VIEW_H = 11;
const EDGE = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] };

export class Renderer {
  constructor(canvas, manifest) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.g.imageSmoothingEnabled = false;
    this.m = manifest;
    this.T = canvas.width / VIEW_W; // Kachelgroesse in Pixeln (48 bei 720px)
    this.images = {};
    for (const [k, t] of Object.entries(manifest.tiles)) if (t.image) this.load('tile:' + k, t.image);
    if (manifest.player.image) this.load('player', manifest.player.image);
  }
  load(key, src) {
    const img = new Image();
    img.onload = () => { this.images[key] = img; };
    img.src = '/assets/sprites/' + src;
  }

  draw(world, now) {
    const g = this.g; const T = this.T;
    g.fillStyle = '#000'; g.fillRect(0, 0, this.c.width, this.c.height);
    if (!world.me) return;
    const me = world.selfPos(now);
    const camX = me.x - (VIEW_W - 1) / 2;
    const camY = me.y - (VIEW_H - 1) / 2;
    const map = MAPS[world.me.map];

    this.drawMap(map, 0, 0, camX, camY, now);
    // Nachbarkarten nahtlos mitzeichnen (wie im Original)
    for (const [edge, conn] of Object.entries(map.connections || {})) {
      const nb = MAPS[conn.map];
      if (!nb) continue;
      let ox = 0, oy = 0;
      if (edge === 'north') { oy = -nb.height; ox = -conn.offset; }
      if (edge === 'south') { oy = map.height; ox = -conn.offset; }
      if (edge === 'west') { ox = -nb.width; oy = -conn.offset; }
      if (edge === 'east') { ox = map.width; oy = -conn.offset; }
      this.drawMap(nb, ox, oy, camX, camY, now, true);
    }

    // Andere Spieler (nach y sortiert fuer korrekte Ueberlappung)
    const ents = [...world.others.values()].map((o) => ({ o, p: world.otherPos(o, now) }));
    ents.push({ o: { ...world.me, self: true }, p: me });
    ents.sort((a, b) => a.p.y - b.p.y);
    for (const { o, p } of ents) this.drawPlayer(o, (p.x - camX) * T, (p.y - camY - p.hop) * T, now);
  }

  drawMap(map, ox, oy, camX, camY, now, dim = false) {
    const g = this.g; const T = this.T;
    const x0 = Math.max(0, Math.floor(camX - ox) - 1), x1 = Math.min(map.width, Math.ceil(camX - ox + VIEW_W) + 1);
    const y0 = Math.max(0, Math.floor(camY - oy) - 1), y1 = Math.min(map.height, Math.ceil(camY - oy + VIEW_H) + 1);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const ch = map.tiles[y][x];
        this.drawTile(ch, Math.round((x + ox - camX) * T), Math.round((y + oy - camY) * T), x, y, now);
      }
    }
    if (dim) { /* Nachbarkarten koennten hier abgedunkelt werden */ }
  }

  drawTile(ch, px, py, tx, ty, now) {
    const g = this.g; const T = this.T;
    const def = this.m.tiles[ch] || { color: '#f0f' };
    const img = this.images['tile:' + ch];
    if (img) { g.drawImage(img, px, py, T, T); return; }
    g.fillStyle = def.color; g.fillRect(px, py, T + 1, T + 1);
    const u = T / 16;
    switch (def.detail) {
      case 'tree':
        g.fillStyle = '#1f4d22'; g.beginPath(); g.arc(px + T / 2, py + T / 2 - u, T * 0.42, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#5a3a1e'; g.fillRect(px + T / 2 - u * 2, py + T - u * 5, u * 4, u * 4);
        break;
      case 'grass': {
        g.strokeStyle = '#2b7a28'; g.lineWidth = u * 1.5;
        const sway = Math.sin(now / 400 + tx + ty) * u;
        for (let i = 0; i < 3; i++) { const bx = px + u * (3 + i * 5); g.beginPath(); g.moveTo(bx, py + T - u * 2); g.lineTo(bx + sway, py + u * 5); g.stroke(); }
        break;
      }
      case 'water': {
        g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = u;
        const o = ((now / 120 + tx * 3) % 16) * u;
        g.beginPath(); g.moveTo(px + o - u * 4, py + T / 2); g.lineTo(px + o, py + T / 2); g.stroke();
        break;
      }
      case 'roof': g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(px, py + T - u * 3, T, u * 3); break;
      case 'center': g.fillStyle = '#fff'; g.fillRect(px + u * 6, py + u * 3, u * 4, u * 10); g.fillRect(px + u * 3, py + u * 6, u * 10, u * 4); break;
      case 'sign': g.fillStyle = '#e8d7a8'; g.fillRect(px + u * 2, py + u * 3, u * 12, u * 7); g.fillStyle = '#5a3a1e'; g.fillRect(px + u * 7, py + u * 10, u * 2, u * 5); break;
      case 'ledge': g.fillStyle = '#6b8a3e'; g.fillRect(px, py + T - u * 4, T, u * 4); break;
    }
  }

  drawPlayer(o, px, py, now) {
    const g = this.g; const T = this.T; const u = T / 16;
    const img = this.images.player;
    // Schatten
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(px + T / 2, py + T - u * 2, T * 0.32, u * 2.5, 0, 0, Math.PI * 2); g.fill();
    if (img) {
      const row = { down: 0, left: 1, right: 2, up: 3 }[o.dir] || 0;
      const fw = this.m.player.frameWidth, fh = this.m.player.frameHeight;
      g.drawImage(img, 0, row * fh, fw, fh, px, py - u * 4, T, T);
    } else {
      g.fillStyle = o.color || '#e53935';
      g.fillRect(px + u * 3, py + u * 1, T - u * 6, T - u * 3);
      g.fillStyle = '#fff';
      const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[o.dir] || [0, 1];
      g.fillRect(px + T / 2 - u * 2 + d[0] * u * 4, py + T / 2 - u * 2 + d[1] * u * 4, u * 4, u * 4);
      if (o.self) { g.strokeStyle = '#fff'; g.lineWidth = u; g.strokeRect(px + u * 3, py + u, T - u * 6, T - u * 3); }
    }
    g.font = `bold ${Math.round(u * 5)}px system-ui`; g.textAlign = 'center';
    const label = o.name + (o.inBattle ? ' ⚔' : '');
    const w = g.measureText(label).width + u * 4;
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(px + T / 2 - w / 2, py - u * 7, w, u * 6);
    g.fillStyle = '#fff'; g.fillText(label, px + T / 2, py - u * 2.4);
  }
}
