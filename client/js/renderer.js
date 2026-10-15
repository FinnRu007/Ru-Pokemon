// Canvas-Renderer mit selbst erstellter Pixelgrafik (client/js/art). Jede Karte wird einmal
// in 16-px-Aufloesung vorgerendert (drei Animationsbilder fuer Wasser, Gras und Blumen) und
// dann dreifach vergroessert gezeichnet. Figuren und Grasueberlagerung kommen pro Bild dazu.
// Eigene PNGs koennen weiterhin ueber assets/sprites/manifest.json eingebunden werden.
import { MAPS } from '/shared/data/maps.js';
import { canvas } from './art/pixel.js';
import { paintTile, findBuildings, isIndoor } from './art/tileset.js';
import { paintBuilding } from './art/buildings.js';
import { paintTallOverlay, paintTree } from './art/tiles.js';
import { characterSheet, DIR_ROW } from './art/characters.js';

const VIEW_W = 15, VIEW_H = 11;
const S = 3; // Vergroesserung 16 px -> 48 px

export class Renderer {
  constructor(canvasEl, manifest) {
    this.c = canvasEl;
    this.g = canvasEl.getContext('2d');
    this.g.imageSmoothingEnabled = false;
    this.m = manifest;
    this.T = canvasEl.width / VIEW_W; // 48
    this.baked = new Map();
    this.images = {};
    for (const [k, t] of Object.entries(manifest.tiles || {})) if (t.image) this.load('tile:' + k, t.image);
    if (manifest.player?.image) this.load('player', manifest.player.image);
    const [oc, og] = canvas(16, 16);
    paintTallOverlay(og, 0, 0);
    this.tallOverlay = oc;
    const [fc, fg] = canvas(16, 32);
    paintTree(fg, 0, 3); paintTree(fg, 0, 19);
    this.forest = this.g.createPattern(scaleUp(fc), 'repeat');
  }

  load(key, src) {
    const img = new Image();
    img.onload = () => { this.images[key] = img; this.baked.clear(); };
    img.src = '/assets/sprites/' + src;
  }

  // Karte einmalig in drei Animationsbildern vorrendern
  bake(mapId) {
    if (this.baked.has(mapId)) return this.baked.get(mapId);
    const map = MAPS[mapId];
    const buildings = findBuildings(map);
    const frames = [0, 1, 2].map((frame) => {
      const [c, g] = canvas(map.width * 16, map.height * 16);
      for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) paintTile(g, map, x, y, frame, 'ground');
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) paintTile(g, map, x, y, frame, 'object');
        buildings.forEach((b, i) => { if (b.y + b.h - 1 === y) paintBuilding(g, b, i); });
      }
      // Eigene Kachelbilder aus dem Manifest haben Vorrang
      for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
        const img = this.images['tile:' + map.tiles[y][x]];
        if (img) g.drawImage(img, x * 16, y * 16, 16, 16);
      }
      return c;
    });
    const out = { frames, map };
    this.baked.set(mapId, out);
    return out;
  }

  draw(world, now) {
    const g = this.g; const T = this.T;
    if (!world.me) { g.fillStyle = '#000'; g.fillRect(0, 0, this.c.width, this.c.height); return; }
    const map = MAPS[world.me.map];
    const me = world.selfPos(now);
    const camX = me.x - (VIEW_W - 1) / 2;
    const camY = me.y - (VIEW_H - 1) / 2;
    const ox = Math.round(-camX * T); const oy = Math.round(-camY * T);

    if (isIndoor(map)) { g.fillStyle = '#000'; g.fillRect(0, 0, this.c.width, this.c.height); } else {
      g.save(); g.translate(ox % (T), oy % (T * 2)); g.fillStyle = this.forest;
      g.fillRect(-T, -T * 2, this.c.width + T * 2, this.c.height + T * 4); g.restore();
    }
    const frame = Math.floor(now / 420) % 3;
    this.drawMapLayer(world.me.map, ox, oy, frame);
    for (const [edge, conn] of Object.entries(map.connections || {})) {
      const nb = MAPS[conn.map];
      if (!nb) continue;
      let dx = 0, dy = 0;
      if (edge === 'north') { dy = -nb.height; dx = -conn.offset; }
      if (edge === 'south') { dy = map.height; dx = -conn.offset; }
      if (edge === 'west') { dx = -nb.width; dy = -conn.offset; }
      if (edge === 'east') { dx = map.width; dy = -conn.offset; }
      this.drawMapLayer(conn.map, ox + dx * T, oy + dy * T, frame);
    }

    // Figuren nach y sortiert (NPCs, andere Spieler, man selbst)
    const ents = [];
    for (const n of world.visibleNpcs()) ents.push({ kind: 'npc', o: n, p: { x: n.x, y: n.y, hop: 0 } });
    for (const o of world.others.values()) ents.push({ kind: 'player', o, p: world.otherPos(o, now), anim: o.anim });
    ents.push({ kind: 'self', o: world.me, p: me, anim: world.anim });
    ents.sort((a, b) => a.p.y - b.p.y);
    for (const e of ents) this.drawEntity(e, map, ox, oy, now);
  }

  drawMapLayer(mapId, ox, oy, frame) {
    const { frames, map } = this.bake(mapId);
    const W = map.width * this.T; const H = map.height * this.T;
    if (ox > this.c.width || oy > this.c.height || ox + W < 0 || oy + H < 0) return;
    this.g.drawImage(frames[frame], ox, oy, W, H);
  }

  drawEntity(e, map, ox, oy, now) {
    const g = this.g; const T = this.T;
    const { o, p, anim } = e;
    const sx = Math.round(ox + p.x * T); const sy = Math.round(oy + (p.y - (p.hop || 0)) * T);
    // Schatten
    g.fillStyle = 'rgba(0,0,0,.22)';
    g.beginPath(); g.ellipse(sx + T / 2, Math.round(oy + p.y * T) + T - 5, T * 0.3, 5, 0, 0, Math.PI * 2); g.fill();

    let frameIdx = 0;
    if (anim && p.t !== undefined && p.t < 1) {
      const parity = (anim.toX + anim.toY) % 2;
      frameIdx = p.t < 0.55 ? 1 + parity : 0;
    }
    const sheet = e.kind === 'npc' ? characterSheet(o.look || 'youngster') : (this.images.player || characterSheet(o.look || 'player', o.color));
    const row = DIR_ROW[o.dir] ?? 0;
    g.drawImage(sheet, frameIdx * 16, row * 20, 16, 20, sx, sy + T - 20 * S - 3, 16 * S, 20 * S);

    // Hohes Gras verdeckt die Fuesse
    const tx = anim && p.t < 0.5 ? anim.fromX : Math.round(p.x);
    const ty = anim && p.t < 0.5 ? anim.fromY : Math.round(p.y);
    if (!p.hop && map.tiles[ty]?.[tx] === '"') g.drawImage(this.tallOverlay, 0, 8, 16, 8, Math.round(ox + tx * T), Math.round(oy + ty * T) + T / 2, T, T / 2);

    if (o.emote) this.drawEmote(sx, sy + T - 20 * S - 6, o.emote);
    if (e.kind === 'player') this.drawLabel(o.name + (o.inBattle ? ' ⚔' : ''), sx + T / 2, sy + T - 20 * S - 6);
  }

  drawEmote(x, y, kind) {
    const g = this.g;
    g.fillStyle = '#fff'; g.strokeStyle = '#20202a'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(x + 12, y - 30, 24, 28, 6); g.fill(); g.stroke();
    g.fillStyle = kind === '!' ? '#e03030' : '#20202a';
    g.font = 'bold 22px "Pixelify Sans", monospace'; g.textAlign = 'center';
    g.fillText(kind, x + 24, y - 9);
  }

  drawLabel(label, cx, y) {
    const g = this.g;
    g.font = '14px "Pixelify Sans", monospace'; g.textAlign = 'center';
    const w = g.measureText(label).width + 10;
    g.fillStyle = 'rgba(20,24,40,.75)'; g.fillRect(Math.round(cx - w / 2), y - 18, Math.round(w), 17);
    g.fillStyle = '#fff'; g.fillText(label, cx, y - 5);
  }
}

function scaleUp(src) {
  const [c, g] = canvas(src.width * S, src.height * S);
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
