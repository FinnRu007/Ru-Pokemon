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
import { fieldReady } from './art/realField.js';
import { forestTile } from './art/realTiles.js';
import { FIELD, fieldFlags } from '/shared/world.js';
import { visibleNpcs } from '/shared/data/story.js';
import { fieldObject } from './art/realField.js';
import * as OV from './origView.js';

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
    const open = openSet(fieldFlags(this.flags, this.party));
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
    this.flags = world.flags; this.party = world.party;
    if (!world.me) { g.fillStyle = '#000'; g.fillRect(0, 0, this.c.width, this.c.height); return; }
    const map = MAPS[world.me.map];
    const me = world.selfPos(now);
    if (OV.origReady(map)) return this.drawOrig(world, map, me, now);
    const camX = me.x - (VIEW_W - 1) / 2;
    const camY = me.y - (VIEW_H - 1) / 2;
    const ox = Math.round(-camX * T); const oy = Math.round(-camY * T);

    if (isIndoor(map)) { g.fillStyle = '#000'; g.fillRect(0, 0, this.c.width, this.c.height); } else {
      const snow = map.tint === 'snow';
      if (fieldReady() && this.realForestKey !== snow) {
        const f = forestTile(snow);
        if (f) { this.forest = this.g.createPattern(scaleUp(f), 'repeat'); this.realForestKey = snow; }
      }
      g.save(); g.translate(ox % (T * 2), oy % (T * 2)); g.fillStyle = this.forest;
      g.fillRect(-T * 2, -T * 2, this.c.width + T * 4, this.c.height + T * 4); g.restore();
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
    this.amb.drawSky(g, map, world.me.map, this.c.width, this.c.height, now, { x: ox + me.x * T + T / 2, y: oy + me.y * T + T / 2 }, { ox, oy, T });
    // Sprechblasen erst nach Licht und Wetter, damit sie gut lesbar bleiben
    for (const e of ents) if (e.o.emote) {
      const sx = Math.round(ox + e.p.x * T); const sy = Math.round(oy + (e.p.y - (e.p.hop || 0)) * T);
      this.drawEmote(sx, sy + T - 20 * S - 6 - (e.kind === 'player' ? 20 : 0), e.o.emote);
    }
  }

  // Original-Oberwelt: Kartenteile aus Platin, Figuren auf ihrer Bodenhoehe, Verdeckung ueber die Tiefenkarte
  drawOrig(world, map, me, now) {
    const g = this.g; const T = this.T; const W = this.c.width; const H = this.c.height;
    const o = map.orig; const m = o.m;
    const gx = o.x + me.x, gz = o.z + me.y;
    const h = OV.heightF(map, gx, gz);
    const Ox = Math.round(W / 2 - (gx + 0.5) * 16 * S), Oy = Math.round(H / 2 - ((gz + 0.5) * 16 - OV.CY * h) * S);
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    OV.drawCells(g, m, Ox, Oy, S, W, H);
    const ox = Ox + o.x * T, oy = Oy + o.z * T;
    this.amb.drawGround(g, world.me.map, ox, oy, T, now);

    // Figuren der eigenen und (Hauptmatrix) der Nachbarkarten im Bild
    const ents = [];
    const maps = new Set([world.me.map]);
    if (m === 0 && MAPS._owner) for (let cy = (gz >> 5) - 1; cy <= (gz >> 5) + 1; cy++) for (let cx = (gx >> 5) - 1; cx <= (gx >> 5) + 1; cx++) {
      const id = MAPS._owner[cy]?.[cx]; if (id && MAPS[id]?.orig) maps.add(id);
    }
    for (const id of maps) {
      const mm = MAPS[id];
      for (const n of id === world.me.map ? world.visibleNpcs() : visibleNpcs(id, this.flags)) ents.push({ kind: 'npc', o: n, p: { x: n.x, y: n.y, hop: 0 }, map: mm });
    }
    for (const other of world.others.values()) ents.push({ kind: 'player', o: other, p: world.otherPos(other, now), anim: other.anim, map });
    ents.push({ kind: 'self', o: world.me, p: me, anim: world.anim, map });
    // Feldhindernisse (Zerschneider-Baum, Felsen, Brocken) als Figuren
    const open = openSet(fieldFlags(this.flags, this.party));
    const OBJ = { Z: 'cut_tree', Q: 'rock_smash', M: 'strength_boulder' };
    for (const id of maps) {
      const mm = MAPS[id];
      for (let y = Math.max(0, Math.floor(gz - mm.orig.z - 8)); y < Math.min(mm.height, gz - mm.orig.z + 10); y++) {
        const row = mm.tiles[y];
        for (let x = Math.max(0, Math.floor(gx - mm.orig.x - 9)); x < Math.min(mm.width, gx - mm.orig.x + 10); x++) {
          const t = row[x];
          if (OBJ[t] && !open.has(t)) ents.push({ kind: 'obj', o: { obj: OBJ[t] }, p: { x, y, hop: 0 }, map: mm });
        }
      }
    }
    for (const e of ents) {
      e.gx = e.map.orig.x + e.p.x; e.gz = e.map.orig.z + e.p.y;
      e.h = OV.heightF(map, e.gx, e.gz);
      e.feetY = (e.gz + 1) * 16 - OV.CY * e.h;
    }
    ents.sort((a, b) => a.gz - b.gz);
    for (const e of ents) {
      e.ox = Ox + e.map.orig.x * T; e.oy = Math.round(Oy + e.map.orig.z * T - OV.CY * e.h * S);
      e.orig = true;
      let fw = 32;
      if (e.kind === 'obj') {
        const img = fieldObject(e.o.obj);
        fw = img ? img.width : 16;
        const sx = Math.round(e.ox + e.p.x * T + T / 2 - (fw / 2) * S), sy = Math.round(e.oy + (e.p.y + 1) * T - (img ? img.height : 16) * S);
        if (img) g.drawImage(img, sx, sy, img.width * S, img.height * S);
      } else {
        e.tile = OV.tileAt(map, Math.round(e.gx), Math.round(e.gz));
        this.drawEntity(e, e.map, e.ox, e.oy, now);
        fw = e.fw || 20;
        // Hohes Gras verdeckt die Fuesse
        const a = e.anim; const half = a && e.p.t < 0.5;
        const tx = e.map.orig.x + (half ? a.fromX : Math.round(e.p.x)), tz = e.map.orig.z + (half ? a.fromY : Math.round(e.p.y));
        if (!e.p.hop && OV.tileAt(map, tx, tz) === '"') OV.drawTileBottom(g, m, Ox, Oy, tx, tz, OV.heightF(map, tx, tz));
      }
      const top = e.feetY - fw - (e.p.hop || 0) * 16 - 2;
      OV.occlude(g, m, Ox, Oy, { x: (e.gx + 0.5) * 16 - fw / 2 - 1, y: top, w: fw + 2, h: e.feetY + 4 - top }, Math.round(e.gz));
    }
    this.amb.drawSky(g, map, world.me.map, W, H, now, { x: W / 2, y: H / 2 }, { ox, oy, T });
    for (const e of ents) if (e.o.emote) {
      const sx = Math.round(e.ox + e.p.x * T); const sy = Math.round(e.oy + (e.p.y - (e.p.hop || 0)) * T);
      this.drawEmote(sx, sy + T - 20 * S - 6 - (e.kind === 'player' ? 20 : 0), e.o.emote);
    }
  }

  // Freikamera auf der Originalwelt: ganz Sinnoh (Hauptmatrix) frei verschiebbar und zoombar
  drawFreeOrig(world, cam, now) {
    const g = this.g; const W = this.c.width; const H = this.c.height;
    const k = S * cam.zoom; const T = 16 * k;
    const Ox = W / 2 - cam.x * T, Oy = H / 2 - cam.y * T;
    g.fillStyle = '#183058'; g.fillRect(0, 0, W, H);
    // Felder ohne Karte mitten im Land (im Spiel nie zu sehen) als Wald fuellen
    const M = OV.matrixOf({ orig: { m: 0 } });
    g.fillStyle = '#2f5a34';
    for (let cy = 1; cy < M.h - 1; cy++) for (let cx = 1; cx < M.w - 1; cx++) {
      if (M.cells[cy][cx]) continue;
      const n = [[0, 1], [1, 0], [0, -1], [-1, 0]].filter(([a, b]) => M.cells[cy + b][cx + a]).length;
      if (n >= 3) g.fillRect(Math.floor(Ox + cx * 512 * k), Math.floor(Oy + cy * 512 * k), Math.ceil(512 * k) + 1, Math.ceil(512 * k) + 1);
    }
    OV.drawCells(g, 0, Ox, Oy, k, W, H);
    const dots = [world.me, ...world.others.values()];
    for (const pl of dots) {
      const mm = pl && MAPS[pl.map];
      if (!mm?.orig || mm.orig.m !== 0) continue;
      const x = Ox + (mm.orig.x + pl.x + 0.5) * T; const y = Oy + (mm.orig.z + pl.y + 0.5) * T;
      g.fillStyle = pl.color || '#e53935'; g.strokeStyle = '#fff'; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, Math.max(5, T * 0.4), 0, Math.PI * 2); g.fill(); g.stroke();
      this.drawLabel(pl.name, x, y - Math.max(8, T * 0.5) - 14);
    }
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(W / 2 - 10, H / 2); g.lineTo(W / 2 + 10, H / 2); g.moveTo(W / 2, H / 2 - 10); g.lineTo(W / 2, H / 2 + 10); g.stroke();
    const id = MAPS._owner?.[Math.floor(cam.y) >> 5]?.[Math.floor(cam.x) >> 5];
    return id || null;
  }

  // Freikamera: alle Aussenkarten an ihrer Lage auf der Weltkarte, frei verschiebbar und zoombar.
  // cam = { x, y, zoom } in Weltkacheln (Mitte des Bildes). Liefert die Karte unter der Bildmitte.
  drawFree(world, cam, now, layout) {
    if (OV.origReady(MAPS[world.me?.map]) || (MAPS._owner && OV.matrixOf({ orig: { m: 0 } }))) return this.drawFreeOrig(world, cam, now);
    const g = this.g; const W = this.c.width; const H = this.c.height;
    const T = this.T * cam.zoom;
    const ox = W / 2 - cam.x * T; const oy = H / 2 - cam.y * T;
    g.save(); g.fillStyle = this.forest; g.fillRect(0, 0, W, H); g.restore();
    const frame = Math.floor(now / 420) % 3;
    let under = null;
    for (const [id, p] of Object.entries(layout.pos)) {
      const m = MAPS[id];
      if (m.indoor) continue;
      const x = ox + p.x * T; const y = oy + p.y * T; const w = m.width * T; const h = m.height * T;
      if (x > W || y > H || x + w < 0 || y + h < 0) continue;
      const { frames } = this.bake(id);
      g.imageSmoothingEnabled = false;
      g.drawImage(frames[frame], Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
      if (cam.x >= p.x && cam.x < p.x + m.width && cam.y >= p.y && cam.y < p.y + m.height) under = id;
    }
    // Spieler als Punkte mit Namen
    const dots = [world.me, ...world.others.values()];
    for (const pl of dots) {
      const p = pl && layout.pos[pl.map];
      if (!p) continue;
      const x = ox + (p.x + pl.x + 0.5) * T; const y = oy + (p.y + pl.y + 0.5) * T;
      g.fillStyle = pl.color || '#e53935'; g.strokeStyle = '#fff'; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, Math.max(5, T * 0.4), 0, Math.PI * 2); g.fill(); g.stroke();
      this.drawLabel(pl.name, x, y - Math.max(8, T * 0.5) - 14);
    }
    // Fadenkreuz in der Mitte
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(W / 2 - 10, H / 2); g.lineTo(W / 2 + 10, H / 2); g.moveTo(W / 2, H / 2 - 10); g.lineTo(W / 2, H / 2 + 10); g.stroke();
    return under;
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
    if (e.kind !== 'npc' && (e.tile ?? map.tiles[fy]?.[fx]) === '~') this.drawSurfer(sx, Math.round(oy + p.y * T), now);
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
    const real = !this.images.player && overworldSheet(o, e.kind !== 'npc', e.kind === 'self' ? !!this.flags?.riding : !!o.bike);
    let headY = sy + T - 20 * S - 3;
    if (real) {
      const { sheet, fw } = real;
      headY = sy + T - (fw - 2) * S;
      g.drawImage(sheet, frameIdx * fw, row * fw, fw, fw, sx + T / 2 - (fw / 2) * S, headY, fw * S, fw * S);
      headY += Math.round(fw * 0.25 * S);
      e.fw = fw;
    } else {
      const sheet = e.kind === 'npc' ? characterSheet(o.look || 'youngster') : (this.images.player || characterSheet(o.look || 'player', o.color));
      g.drawImage(sheet, frameIdx * 16, row * 20, 16, 20, sx, headY, 16 * S, 20 * S);
      // Eigene Figur auf dem Fahrrad: Räder unter den Füßen
      if (e.kind !== 'npc' && (e.kind === 'self' ? this.flags?.riding : o.bike)) {
        g.fillStyle = '#2a2f45'; const fy = sy + T - 5; const side = o.dir === 'left' || o.dir === 'right';
        for (const d of side ? [-T * 0.28, T * 0.28] : [0]) { g.beginPath(); g.arc(sx + T / 2 + d, fy, side ? 5 : 4, 0, Math.PI * 2); g.fill(); }
      }
    }

    // Hohes Gras verdeckt die Fuesse
    const tx = anim && p.t < 0.5 ? anim.fromX : Math.round(p.x);
    const ty = anim && p.t < 0.5 ? anim.fromY : Math.round(p.y);
    if (!e.orig && !p.hop && map.tiles[ty]?.[tx] === '"') g.drawImage(this.tallOverlay, 0, 8, 16, 8, Math.round(ox + tx * T), Math.round(oy + ty * T) + T / 2, T, T / 2);

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
  if (map.tint === 'snow' && fieldReady() && !map.indoor) { g.restore(); return; }
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
