// Entwicklungsszene wie in Platin (Ablauf nach src/evolution.c aus pret/pokeplatinum):
// "Nanu? X entwickelt sich!", Ruf, Musik, das Pokemon wird weiss, schwarze Balken schieben sich von oben und
// unten heran, alte und neue Gestalt wechseln sich immer schneller ab (Lichter fliegen dazu), weisser Blitz,
// die neue Gestalt erscheint in Farbe, Ruf, "Glueckwunsch! Dein X wurde zu Y!" mit Fanfare.
// Waehrend des Wechsels bricht B (X, Esc, Ruecktaste) die Entwicklung ab wie im Original.
// Gezeichnet wird in DS-Aufloesung (256x192) und hochskaliert. Hintergrund aus `npm run sprites`, sonst ein Verlauf.
import { monsterDataUrl, spriteIndex } from './art/monsters.js';
import { audio } from './audio.js';
import { textStep, textPause } from './options.js';

const W = 256, H = 192, TOP = 160; // darunter liegt das Textfeld
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(r));
const rand = (a, b) => a + Math.random() * (b - a);
const ACCEPT = ['KeyZ', 'Enter', 'Space', 'NumpadEnter'];
const CANCEL = ['KeyX', 'KeyB', 'Escape', 'Backspace'];

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Pokemon auf eine eigene Flaeche, damit es sich weiss einfaerben laesst
function spriteCanvas(img) {
  const c = document.createElement('canvas'); c.width = 80; c.height = 80;
  if (!img) return c;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const k = Math.min(80 / img.width, 80 / img.height, img.width >= 64 ? 1 : 80 / Math.max(img.width, img.height));
  const w = Math.round(img.width * k), h = Math.round(img.height * k);
  g.drawImage(img, Math.round((80 - w) / 2), 80 - h, w, h);
  return c;
}

class Scene {
  constructor(evo, opts) {
    this.evo = evo;
    this.opts = opts;
    this.el = document.createElement('div');
    this.el.className = 'evo-scene';
    this.el.innerHTML = '<div class="evo-screen"><canvas width="256" height="192"></canvas><div class="evo-text"></div><button class="evo-cancel hidden" type="button">B Abbrechen</button></div>';
    this.c = this.el.querySelector('canvas');
    this.g = this.c.getContext('2d');
    this.textEl = this.el.querySelector('.evo-text');
    this.cancelBtn = this.el.querySelector('.evo-cancel');
    this.state = {
      fade: 1, fadeColor: '#000', // ganzer Bildschirm: 1 = voll schwarz bzw. weiss
      white: 0, // Pokemon weiss (0 bis 1)
      scaleOld: 1, scaleNew: 0,
      bar: 0, // schwarze Balken oben und unten (0 bis 40 Pixel)
      parts: [], rays: 0, glow: 0
    };
    this.skip = false; this.cancelRequested = false; this.canCancel = false;
    this.onKey = (e) => {
      if (ACCEPT.includes(e.code)) this.skip = true;
      else if (CANCEL.includes(e.code) && this.canCancel) this.cancelRequested = true;
      else return;
      e.preventDefault(); e.stopImmediatePropagation();
    };
    this.el.addEventListener('pointerdown', (e) => { if (e.target !== this.cancelBtn) this.skip = true; });
    this.cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); if (this.canCancel) this.cancelRequested = true; });
  }

  async run() {
    const { evo } = this;
    const idx = spriteIndex();
    const [bg, oldImg, newImg] = await Promise.all([
      loadImage(idx?.evolution ? '/sprites/evolution/background.png' : null),
      loadImage(monsterDataUrl(evo.from, false, 80)),
      loadImage(monsterDataUrl(evo.to, false, 80))
    ]);
    this.bg = bg; this.oldS = spriteCanvas(oldImg); this.newS = spriteCanvas(newImg);
    this.tint = document.createElement('canvas'); this.tint.width = 80; this.tint.height = 80;
    (this.opts.parent || document.getElementById('stage') || document.body).appendChild(this.el);
    addEventListener('keydown', this.onKey, true);
    this.running = true;
    const loop = () => { if (!this.running) return; this.draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    try { return await this.timeline(); } finally {
      this.running = false;
      removeEventListener('keydown', this.onKey, true);
      this.el.remove();
    }
  }

  // Wert ueber n Bilder (60 je Sekunde) gleiten lassen
  async tween(key, to, frames) {
    const from = this.state[key];
    for (let i = 1; i <= frames; i++) { await frame(); this.state[key] = from + (to - from) * (i / frames); }
  }

  async say(text, ms = 1200) {
    this.opts.log?.(text, 'battle');
    this.skip = false;
    const [step, tick] = textStep();
    for (let n = step; n < text.length && !this.skip; n += step) { this.textEl.textContent = text.slice(0, n); await sleep(Math.max(8, tick / 2)); }
    this.textEl.textContent = text;
    this.skip = false;
    const t0 = performance.now(); const wait = textPause(ms);
    while (performance.now() - t0 < wait && !this.skip) await sleep(30);
  }

  async timeline() {
    const { evo, state: st } = this;
    const fromName = evo.from.name, toName = evo.to.species;
    // Einblenden aus Schwarz
    await this.tween('fade', 0, 18);
    audio.sfx('cry', evo.from.speciesId);
    await this.say(`Nanu? ${fromName} entwickelt sich!`, 900);
    audio.music('evolution');
    await sleep(330);
    // Pokemon wird weiss, Balken schieben sich heran, Lichter fliegen zur Mitte
    audio.sfx('evoShine');
    this.spawnInward(28);
    await Promise.all([this.tween('white', 1, 64), this.tween('bar', 40, 40), this.tween('glow', 1, 64)]);
    // Wechsel alte und neue Gestalt: Schrittweite 8/256 je Bild, verdoppelt sich nach jeder Runde bis 64/256
    this.canCancel = !!evo.cancelable;
    this.cancelBtn.classList.toggle('hidden', !this.canCancel);
    let delta = 8 / 256; let shrinkOld = true; let frames = 0;
    const total = 420;
    while (frames < total) {
      await frame(); frames++;
      if (this.cancelRequested) return this.cancel();
      if (shrinkOld) {
        st.scaleOld = Math.max(0, st.scaleOld - delta); st.scaleNew = Math.min(1, st.scaleNew + delta);
        if (st.scaleOld <= 0) { shrinkOld = false; audio.sfx('evoPulse'); }
      } else {
        st.scaleOld = Math.min(1, st.scaleOld + delta); st.scaleNew = Math.max(0, st.scaleNew - delta);
        if (st.scaleNew <= 0) { shrinkOld = true; if (delta < 64 / 256) delta *= 2; }
      }
      if (frames % 3 === 0) this.spawnRising(frames > total / 2 ? 2 : 1);
      if (frames % 40 === 0) this.spawnInward(6);
      st.rays = Math.min(1, frames / 200);
    }
    this.canCancel = false; this.cancelBtn.classList.add('hidden');
    // Weisser Blitz, danach steht die neue Gestalt da
    audio.sfx('evoFlash');
    st.fadeColor = '#fff';
    await this.tween('fade', 1, 24);
    st.scaleOld = 0; st.scaleNew = 1; st.rays = 0; st.parts = [];
    await this.tween('bar', 0, 20);
    await sleep(140);
    audio.sfx('evoSparkle');
    this.spawnBurst(40);
    await Promise.all([this.tween('fade', 0, 40), this.tween('white', 0, 56), this.tween('glow', 0, 56)]);
    audio.sfx('cry', evo.to.speciesId);
    await sleep(700);
    audio.music(null); // nach der Fanfare uebernimmt die Musik der Karte
    audio.jingle('evolved');
    await this.say(`Glückwunsch! Dein ${fromName} wurde zu ${toName}!`, 3200);
    st.fadeColor = '#000';
    await this.tween('fade', 1, 20);
    return true;
  }

  // Abbruch wie im Original: kurzer weisser Schein, die alte Gestalt kehrt zurueck
  async cancel() {
    const st = this.state;
    this.canCancel = false; this.cancelBtn.classList.add('hidden');
    this.opts.onCancel?.(this.evo);
    st.fadeColor = '#fff'; st.fade = 1;
    st.scaleOld = 1; st.scaleNew = 0; st.rays = 0; st.parts = []; st.bar = 0;
    audio.music(null);
    await Promise.all([this.tween('fade', 0, 24), this.tween('white', 0, 24), this.tween('glow', 0, 24)]);
    audio.sfx('cry', this.evo.from.speciesId);
    await sleep(500);
    await this.say(`Huch? ${this.evo.from.name} hat sich nicht entwickelt!`, 1600);
    st.fadeColor = '#000';
    await this.tween('fade', 1, 20);
    return false;
  }

  // ---------------------------------------------------------------- Lichter
  spawnInward(n) {
    const cx = W / 2, cy = 88;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), r = rand(90, 150);
      this.state.parts.push({ kind: 'in', x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.75, tx: cx, ty: cy, life: 0, max: rand(40, 70), delay: rand(0, 20), size: rand(1.5, 3), spin: rand(-0.04, 0.04), a, r });
    }
  }
  spawnRising(n) {
    for (let i = 0; i < n; i++) this.state.parts.push({ kind: 'up', x: W / 2 + rand(-44, 44), y: rand(110, 130), vy: rand(-1.6, -0.8), life: 0, max: rand(40, 70), delay: 0, size: rand(1, 2.4) });
  }
  spawnBurst(n) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.1, 0.1), v = rand(1.2, 3.2);
      this.state.parts.push({ kind: 'out', x: W / 2, y: 88, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: rand(30, 55), delay: 0, size: rand(1.5, 3) });
    }
    this.state.parts.push({ kind: 'ring', x: W / 2, y: 88, life: 0, max: 36, delay: 0 });
  }

  // ---------------------------------------------------------------- Zeichnen
  draw() {
    const g = this.g, st = this.state;
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (this.bg) g.drawImage(this.bg, 0, 0);
    else {
      const grd = g.createLinearGradient(0, 0, 0, TOP);
      grd.addColorStop(0, '#3a4a50'); grd.addColorStop(0.45, '#40c8a8'); grd.addColorStop(0.7, '#f8f8f8'); grd.addColorStop(1, '#ffffff');
      g.fillStyle = grd; g.fillRect(0, 0, W, TOP);
    }
    // Schein hinter dem Pokemon
    if (st.glow > 0) {
      const rg = g.createRadialGradient(W / 2, 88, 4, W / 2, 88, 70);
      rg.addColorStop(0, `rgba(255,255,255,${0.75 * st.glow})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.fillRect(0, 0, W, TOP);
    }
    // Lichtstrahlen, die sich langsam drehen
    if (st.rays > 0) {
      const t = performance.now() / 1000;
      g.save(); g.globalCompositeOperation = 'lighter'; g.translate(W / 2, 88);
      for (let i = 0; i < 12; i++) {
        const a = t * 0.6 + (i / 12) * Math.PI * 2;
        g.rotate(Math.PI * 2 / 12);
        g.fillStyle = `rgba(200,240,255,${0.10 * st.rays * (0.6 + 0.4 * Math.sin(t * 3 + i))})`;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(140, -6 - 3 * Math.sin(a)); g.lineTo(140, 6 + 3 * Math.sin(a)); g.closePath(); g.fill();
      }
      g.restore();
    }
    this.drawMon(this.oldS, st.scaleOld);
    this.drawMon(this.newS, st.scaleNew);
    this.drawParts(g);
    // Schwarze Balken wie das Fenster im Original (oben und unten am Kampfbild)
    if (st.bar > 0) { g.fillStyle = '#000'; g.fillRect(0, 0, W, Math.round(st.bar)); g.fillRect(0, TOP - Math.round(st.bar), W, Math.round(st.bar)); }
    if (st.fade > 0) { g.globalAlpha = Math.min(1, st.fade); g.fillStyle = st.fadeColor; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  }

  drawMon(src, scale) {
    if (scale <= 0.01) return;
    const t = this.tint.getContext('2d');
    t.clearRect(0, 0, 80, 80); t.globalCompositeOperation = 'source-over'; t.drawImage(src, 0, 0);
    if (this.state.white > 0) { t.globalCompositeOperation = 'source-atop'; t.fillStyle = `rgba(255,255,255,${this.state.white})`; t.fillRect(0, 0, 80, 80); }
    const s = 80 * scale;
    this.g.drawImage(this.tint, Math.round(W / 2 - s / 2), Math.round(88 - s / 2), Math.round(s), Math.round(s));
  }

  drawParts(g) {
    const st = this.state;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const p of st.parts) {
      if (p.delay > 0) { p.delay--; continue; }
      p.life++;
      const k = p.life / p.max;
      if (p.kind === 'in') { // Spirale zur Mitte
        const r = p.r * (1 - k); const a = p.a + k * 2.4;
        p.x = p.tx + Math.cos(a) * r; p.y = p.ty + Math.sin(a) * r * 0.75;
      } else { p.x += p.vx || 0; p.y += p.vy || 0; }
      const alpha = Math.max(0, Math.min(1, k < 0.2 ? k * 5 : (1 - k) * 1.6));
      if (p.kind === 'ring') {
        g.strokeStyle = `rgba(255,255,255,${alpha})`; g.lineWidth = 2;
        g.beginPath(); g.ellipse(p.x, p.y, 8 + k * 90, 6 + k * 66, 0, 0, Math.PI * 2); g.stroke();
        continue;
      }
      const s = p.size;
      g.fillStyle = `rgba(255,255,255,${alpha})`;
      g.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), Math.ceil(s), Math.ceil(s));
      g.fillStyle = `rgba(150,230,255,${alpha * 0.7})`; // kleiner Stern
      g.fillRect(Math.round(p.x - s * 1.5), Math.round(p.y - 0.5), Math.ceil(s * 3), 1);
      g.fillRect(Math.round(p.x - 0.5), Math.round(p.y - s * 1.5), 1, Math.ceil(s * 3));
    }
    st.parts = st.parts.filter((p) => p.delay > 0 || p.life < p.max);
    g.restore();
  }
}

// Mehrere Entwicklungen nacheinander. opts: { log(text, cls), onCancel(evo), parent }
let busy = Promise.resolve();
export function playEvolutions(list, opts = {}) {
  if (!list?.length) return busy;
  busy = busy.then(async () => {
    for (const evo of list) {
      try { await new Scene(evo, opts).run(); } catch (e) { console.error(e); }
    }
  });
  return busy;
}
