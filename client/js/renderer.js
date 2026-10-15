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
import { overworldSheet } from './art/realSheets.js';
import { FIELD } from '/shared/world.js';

// Hindernisse, die nach dem Einsatz der Feldattacke verschwinden (pro Spieler gemalt)
const CLEARABLE = ['Q', 'Z', 'M'];
function openSet(flags) { return new Set(CLEARABLE.filter((t) => flags?.[FIELD[t]])); }
import { Ambience } from './ambience.js';

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
    this.amb = new Ambience();
  }

  load(key, src) {
    const img = new Image();
    img.onload = () => { this.images[key] = img; this.baked.clear(); };
    img.src = '/assets/sprites/' + src;
  }

  // Karte einmalig in drei Animationsbildern vorrendern
  bake(mapId) {
    const open = openSet(this.flags);
    const key = mapId + '|' + [...open].join('');
    if (this.baked.has(key)) return this.baked.get(key);
    const map = MAPS[mapId];
    const buildings = findBuildings(map);
    const frames = [0, 1, 2].map((frame) => {
      const [c, g] = canvas(map.width * 16, map.height * 16);
      for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) paintTile(g, map, x, y, frame, 'ground', open);
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) paintTile(g, map, x, y, frame, 'object', open);
        buildings.forEach((b, i) => { if (b.y + b.h - 1 === y) paintBuilding(g, b, i); });
      }
      // Eigene Kachelbilder aus dem Manifest haben Vorrang
      for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
        const img = this.images['tile:' + map.tiles[y][x]];
        if (img) g.drawImage(img, x * 16, y * 16, 16, 16);
      }
      tint(g, map);
      return c;
    });
    const out = { frames, map };
    this.baked.set(key, out);
    return out;
  }

  draw(world, now) {
    const g = this.g; const T = this.T;
    this.flags = world.flags;
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

    this.amb.drawGround(g, world.me.map, ox, oy, T, now);

    // Figuren nach y sortiert (NPCs, andere Spieler, man selbst)
    const ents = [];
    for (const n of world.visibleNpcs()) ents.push({ kind: 'npc', o: n, p: { x: n.x, y: n.y, hop: 0 } });
    for (const o of world.others.values()) ents.push({ kind: 'player', o, p: world.otherPos(o, now), anim: o.anim });
    ents.push({ kind: 'self', o: world.me, p: me, anim: world.anim });
    ents.sort((a, b) => a.p.y - b.p.y);
    for (const e of ents) this.drawEntity(e, map, ox, oy, now);
    this.amb.drawSky(g, map, world.me.map, this.c.width, this.c.height, now, { x: ox + me.x * T + T / 2, y: oy + me.y * T + T / 2 });
    // Sprechblasen erst nach Licht und Wetter, damit sie gut lesbar bleiben
    for (const e of ents) if (e.o.emote) {
      const sx = Math.round(ox + e.p.x * T); const sy = Math.round(oy + (e.p.y - (e.p.hop || 0)) * T);
      this.drawEmote(sx, sy + T - 20 * S - 6 - (e.kind === 'player' ? 20 : 0), e.o.emote);
    }
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
    if (o.look === 'item_ball') return this.drawItemBall(o, sx, sy);
    // Auf dem Wasser: Spieler reitet auf seinem Pokemon (Surfer), sonst Schatten
    const fx = Math.round(p.x); const fy = Math.round(p.y);
    if (e.kind !== 'npc' && map.tiles[fy]?.[fx] === '~') this.drawSurfer(sx, Math.round(oy + p.y * T), now);
    else {
      g.fillStyle = 'rgba(0,0,0,.22)';
      g.beginPath(); g.ellipse(sx + T / 2, Math.round(oy + p.y * T) + T - 5, T * 0.3, 5, 0, 0, Math.PI * 2); g.fill();
    }

    let frameIdx = 0;
    if (anim && p.t !== undefined && p.t < 1) {
      const parity = (anim.toX + anim.toY) % 2;
      frameIdx = p.t < 0.55 ? 1 + parity : 0;
    }
    const row = DIR_ROW[o.dir] ?? 0;
    // Original-Sprites (npm run sprites) haben Vorrang, sonst die eigene Figur
    const real = !this.images.player && overworldSheet(o, e.kind !== 'npc');
    let headY = sy + T - 20 * S - 3;
    if (real) {
      const { sheet, fw } = real;
      headY = sy + T - (fw - 2) * S;
      g.drawImage(sheet, frameIdx * fw, row * fw, fw, fw, sx + T / 2 - (fw / 2) * S, headY, fw * S, fw * S);
      headY += Math.round(fw * 0.25 * S);
    } else {
      const sheet = e.kind === 'npc' ? characterSheet(o.look || 'youngster') : (this.images.player || characterSheet(o.look || 'player', o.color));
      g.drawImage(sheet, frameIdx * 16, row * 20, 16, 20, sx, headY, 16 * S, 20 * S);
    }

    // Hohes Gras verdeckt die Fuesse
    const tx = anim && p.t < 0.5 ? anim.fromX : Math.round(p.x);
    const ty = anim && p.t < 0.5 ? anim.fromY : Math.round(p.y);
    if (!p.hop && map.tiles[ty]?.[tx] === '"') g.drawImage(this.tallOverlay, 0, 8, 16, 8, Math.round(ox + tx * T), Math.round(oy + ty * T) + T / 2, T, T / 2);

    if (e.kind === 'player') this.drawLabel(o.name + (o.inBattle ? ' ⚔' : ''), sx + T / 2, headY - 3);
  }

  // Itemball: Original-Sprite (npm run sprites), sonst eigener Pokeball
  drawItemBall(o, sx, sy) {
    const g = this.g; const T = this.T;
    const real = overworldSheet(o);
    g.fillStyle = 'rgba(0,0,0,.2)';
    g.beginPath(); g.ellipse(sx + T / 2, sy + T - 6, T * 0.24, 4, 0, 0, Math.PI * 2); g.fill();
    if (real) { g.drawImage(real.sheet, 0, 0, real.fw, real.fw, sx + T / 2 - (real.fw / 2) * S, sy + T - real.fw * S - 2, real.fw * S, real.fw * S); return; }
    const cx = sx + T / 2; const cy = sy + T / 2 + 3; const r = T * 0.26;
    g.fillStyle = '#202020'; g.beginPath(); g.arc(cx, cy, r + 1.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e83838'; g.beginPath(); g.arc(cx, cy, r, Math.PI, 0); g.fill();
    g.fillStyle = '#f4f4f4'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI); g.fill();
    g.fillStyle = '#202020'; g.fillRect(cx - r, cy - 1.5, r * 2, 3);
    g.fillStyle = '#f4f4f4'; g.beginPath(); g.arc(cx, cy, 3.5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#202020'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(cx - r * 0.55, cy - r * 0.7, 3, 3);
  }

  drawSurfer(x, y, now) {
    const g = this.g; const T = this.T; const bob = Math.sin(now / 220) * 2;
    const cy = y + T - 10 + bob;
    g.fillStyle = '#20304a'; g.beginPath(); g.ellipse(x + T / 2, cy, T * 0.46, 11, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4a7ad0'; g.beginPath(); g.ellipse(x + T / 2, cy - 1, T * 0.42, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#9cc4f4'; g.fillRect(x + 10, cy - 6, 14, 3);
    g.fillStyle = '#fff'; g.fillRect(x + T - 12, cy - 6, 5, 5); g.fillStyle = '#20304a'; g.fillRect(x + T - 10, cy - 5, 2, 3);
  }

  drawEmote(x, y, kind) {
    const g = this.g;
    g.fillStyle = '#fff'; g.strokeStyle = '#20202a'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(x + 12, y - 30, 24, 28, 6); g.fill(); g.stroke();
    g.fillStyle = kind === '!' || kind === '♥' ? '#e03030' : '#20202a';
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

// Stimmung ganzer Karten: Schnee (hell, entsaettigt) oder Zerrwelt (violett, unwirklich)
function tint(g, map) {
  if (!map.tint || map.tint === 'none') return;
  const { width: w, height: h } = g.canvas;
  g.save();
  if (map.tint === 'snow') {
    g.globalCompositeOperation = 'saturation'; g.fillStyle = 'rgba(128,128,128,.55)'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'screen'; g.fillStyle = '#3a4250'; g.fillRect(0, 0, w, h);
  } else if (map.tint === 'distortion') {
    g.globalCompositeOperation = 'hue'; g.fillStyle = 'rgba(140,60,200,.8)'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#9a88c8'; g.fillRect(0, 0, w, h);
  } else if (map.tint === 'dusk') {
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#c8b0a0'; g.fillRect(0, 0, w, h);
  }
  g.restore();
}

function scaleUp(src) {
  const [c, g] = canvas(src.width * S, src.height * S);
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
