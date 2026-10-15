// Vorspann beim Spielstart: Sternenhimmel, Flug ueber Sinnoh im Morgenrot, die drei Starter
// rennen durchs Gras, danach der Titelschirm mit eigenem Logo. Alles wird live gezeichnet
// (niedrige Aufloesung 240x176, dreifach vergroessert) und ist mit jeder Taste ueberspringbar.
import { monsterCanvas } from './art/monsters.js';
import { audio } from './audio.js';

const W = 240, H = 176;
const STARTERS = [
  { speciesId: 390, family: 390, stage: 1, types: ['fire'] },
  { speciesId: 393, family: 393, stage: 1, types: ['water'] },
  { speciesId: 387, family: 387, stage: 1, types: ['grass'] }
];
const BIRD = { speciesId: 396, family: 396, stage: 1, types: ['normal', 'flying'] };
const LINES = ['Eine Welt voller Pokémon ...', '... und Freunde, die sie mit dir erkunden.'];
const T_SKY = 0, T_LAND = 3600, T_RUN = 7600, T_TITLE = 11000;

function seeded(n) { let s = n; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

export class Intro {
  constructor(stage, onDone) {
    this.onDone = onDone;
    this.el = document.createElement('section');
    this.el.id = 'intro';
    this.el.innerHTML = '<canvas width="720" height="528"></canvas><div class="intro-press">Klicken oder Taste drücken</div>';
    stage.appendChild(this.el);
    this.c = this.el.querySelector('canvas');
    this.g = this.c.getContext('2d');
    this.low = document.createElement('canvas'); this.low.width = W; this.low.height = H;
    this.lg = this.low.getContext('2d');
    const r = seeded(7);
    this.stars = Array.from({ length: 90 }, () => ({ x: r() * W, y: r() * H * 1.6, p: r() * 6, s: r() < 0.15 ? 2 : 1 }));
    this.peaks = Array.from({ length: 14 }, (_, i) => ({ x: i * 20 - 10 + r() * 10, h: 30 + r() * 46 }));
    this.far = Array.from({ length: 20 }, (_, i) => ({ x: i * 14 - 8 + r() * 6, h: 16 + r() * 22 }));
    this.mons = [...STARTERS, BIRD].map((m) => monsterCanvas(m, false, 56, true));
    this.phase = 'press';
    this.t0 = 0;
    this.keyHandler = (e) => { if (e.target.tagName === 'INPUT') return; e.preventDefault(); this.advance(); };
    addEventListener('keydown', this.keyHandler);
    this.el.addEventListener('click', () => this.advance());
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  advance() {
    const now = performance.now();
    if (this.phase === 'press') {
      audio.unlock();
      audio.music('title');
      this.phase = 'film'; this.t0 = now;
      this.el.querySelector('.intro-press').remove();
    } else if (this.phase === 'film') {
      if (now - this.t0 < T_TITLE) this.t0 = now - T_TITLE; // ueberspringen
      else if (now - this.t0 > T_TITLE + 400) this.finish();
    }
  }

  finish() {
    if (this.phase === 'done') return;
    this.phase = 'done';
    audio.sfx('start');
    removeEventListener('keydown', this.keyHandler);
    this.el.classList.add('out');
    setTimeout(() => { this.el.remove(); this.onDone?.(); }, 650);
  }

  frame(now) {
    if (this.phase === 'done' && !this.el.isConnected) return;
    const t = this.phase === 'press' ? -1 : now - this.t0;
    this.draw(t, now);
    requestAnimationFrame(this.frame);
  }

  draw(t, now) {
    const g = this.lg;
    g.imageSmoothingEnabled = false;
    if (t < 0) { // Warten auf die erste Eingabe (Browser erlauben Ton erst danach)
      g.fillStyle = '#05060e'; g.fillRect(0, 0, W, H);
      this.drawStars(g, now, 0, 0.5);
    } else if (t < T_LAND) {
      this.drawSky(g, t, now, 0);
      const a = Math.min(1, t / 600);
      this.blit(); this.caption(LINES[t < 1800 ? 0 : 1], t < 1800 ? t : t - 1800, a);
      return;
    } else if (t < T_TITLE) {
      const pan = Math.min(1, (t - T_LAND) / 2200);
      this.drawSky(g, t, now, pan);
      this.drawLand(g, t, pan);
      if (t > T_RUN) this.drawRun(g, t - T_RUN);
      if (t > T_TITLE - 300) { g.fillStyle = `rgba(255,255,255,${(t - T_TITLE + 300) / 300})`; g.fillRect(0, 0, W, H); }
    } else {
      this.drawTitleBg(g, t - T_TITLE, now);
    }
    this.blit();
    if (t >= T_TITLE) this.drawLogo(t - T_TITLE, now);
  }

  blit() {
    this.g.imageSmoothingEnabled = false;
    this.g.drawImage(this.low, 0, 0, 720, 528);
  }

  drawStars(g, now, shift, alpha) {
    for (const s of this.stars) {
      const y = s.y - shift;
      if (y < 0 || y > H) continue;
      const tw = 0.5 + 0.5 * Math.sin(now / 400 + s.p);
      g.fillStyle = `rgba(255,255,240,${alpha * tw})`;
      g.fillRect(Math.round(s.x), Math.round(y), s.s, s.s);
    }
  }

  drawSky(g, t, now, pan) {
    // Von Nacht zu Morgenrot
    const top = mix('#060818', '#28306a', pan); const mid = mix('#141a40', '#e0708a', pan); const bot = mix('#1c2450', '#ffc070', pan);
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, top); gr.addColorStop(0.6, mid); gr.addColorStop(1, bot);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    this.drawStars(g, now, pan * 60, 1 - pan * 0.8);
    // Sternschnuppe
    const sp = (t % 2600) / 700;
    if (sp < 1) {
      g.fillStyle = 'rgba(255,255,255,.9)';
      for (let i = 0; i < 8; i++) g.fillRect(Math.round(200 - sp * 120 + i * 2), Math.round(14 + sp * 40 - i), 1, 1);
    }
    if (pan > 0) { // Sonne
      g.fillStyle = `rgba(255,236,170,${pan})`;
      const sy = H - 30 - pan * 26;
      for (let r = 14; r > 0; r -= 2) { g.globalAlpha = pan * (0.25 + (14 - r) / 20); g.beginPath(); g.arc(150, sy, r + 6, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1;
    }
  }

  drawLand(g, t, pan) {
    const base = H + 40 - pan * 70;
    // Ferne Berge
    g.fillStyle = '#6a5a8a';
    for (const p of this.far) { g.beginPath(); g.moveTo(p.x - 14, base - 10); g.lineTo(p.x, base - 10 - p.h); g.lineTo(p.x + 14, base - 10); g.fill(); }
    // Grosser Berg in der Mitte (mit Schnee)
    g.fillStyle = '#3c3a68';
    g.beginPath(); g.moveTo(40, base); g.lineTo(120, base - 104); g.lineTo(200, base); g.fill();
    g.fillStyle = '#e8ecff';
    g.beginPath(); g.moveTo(104, base - 82); g.lineTo(120, base - 104); g.lineTo(136, base - 82); g.lineTo(128, base - 86); g.lineTo(120, base - 80); g.lineTo(112, base - 86); g.fill();
    g.fillStyle = '#2c2c54';
    for (const p of this.peaks) { g.beginPath(); g.moveTo(p.x - 16, base); g.lineTo(p.x, base - p.h * 0.7); g.lineTo(p.x + 16, base); g.fill(); }
    // See mit Glitzern
    g.fillStyle = '#3c5aa0'; g.fillRect(0, base, W, 12);
    for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(255,220,160,.7)'; g.fillRect(((i * 37 + t / 40) % W) | 0, base + 3 + (i % 3) * 3, 4, 1); }
    // Wald und Wiese
    g.fillStyle = '#1e4a30';
    for (let x = -4; x < W + 8; x += 8) { g.beginPath(); g.moveTo(x, base + 22); g.lineTo(x + 4, base + 10 + ((x * 7) % 5)); g.lineTo(x + 8, base + 22); g.fill(); }
    g.fillStyle = '#3c8c3c'; g.fillRect(0, base + 22, W, 60);
    g.fillStyle = '#2c6c2c';
    for (let x = 0; x < W; x += 6) g.fillRect(x + ((t / 30) % 6), base + 22, 2, 3);
    // Vogel fliegt quer
    const bx = W + 20 - ((t - T_LAND) / 3200) * (W + 80);
    if (bx > -40) { g.save(); g.translate(Math.round(bx), Math.round(40 + Math.sin(t / 180) * 6)); g.scale(-0.5, 0.5); g.drawImage(this.mons[3], -28, -28); g.restore(); }
  }

  drawRun(g, t) {
    const ground = H - 14;
    STARTERS.forEach((_, i) => {
      const x = W + 30 - (t - i * 700) / 2.6;
      if (x < -60 || x > W + 40) return;
      const hop = Math.abs(Math.sin((t + i * 90) / 110)) * 8;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(Math.round(x - 12), ground - 2, 24, 3);
      g.drawImage(this.mons[i], Math.round(x - 24), Math.round(ground - 46 - hop), 48, 48);
      // Staubwolken
      g.fillStyle = 'rgba(255,255,255,.6)';
      for (let k = 1; k < 4; k++) g.fillRect(Math.round(x + 14 + k * 7), ground - 4 - ((t / 60 + k) % 4), 3, 3);
    });
    // Hohes Gras im Vordergrund
    g.fillStyle = '#2a7a2a';
    for (let x = 0; x < W; x += 5) { g.fillRect(x, ground - 2 - (x % 3), 2, 16); }
  }

  drawTitleBg(g, t, now) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#0c0c1e'); gr.addColorStop(1, '#2a2440');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    this.drawStars(g, now, 0, 0.6);
    // Zerrwelt-Ringe: langsam kreisende, schief stehende Bahnen in Gold und Platin
    const cx = 120, cy = 70;
    for (let i = 0; i < 5; i++) {
      const rot = now / (2600 + i * 700) * (i % 2 ? -1 : 1);
      g.strokeStyle = i % 2 ? 'rgba(220,190,110,.55)' : 'rgba(190,200,230,.45)';
      g.lineWidth = 1;
      g.beginPath(); g.ellipse(cx, cy, 30 + i * 18, 8 + i * 5, rot, 0, Math.PI * 2); g.stroke();
      const a = now / (500 + i * 220) + i;
      g.fillStyle = '#fff4c8';
      g.fillRect(Math.round(cx + Math.cos(a) * (30 + i * 18) * Math.cos(rot) - Math.sin(a) * (8 + i * 5) * Math.sin(rot)),
        Math.round(cy + Math.cos(a) * (30 + i * 18) * Math.sin(rot) + Math.sin(a) * (8 + i * 5) * Math.cos(rot)), 2, 2);
    }
    // Schwebende Felsen
    for (let i = 0; i < 6; i++) {
      const x = (i * 47 + 13) % W; const y = 110 + Math.sin(now / 900 + i) * 4 + (i % 3) * 14;
      g.fillStyle = '#4a4060'; g.fillRect(x, y, 10 + (i % 3) * 4, 5); g.fillStyle = '#6a6088'; g.fillRect(x + 1, y, 6, 2);
    }
    // Starter stehen unten in einer Reihe
    STARTERS.forEach((_, i) => {
      const x = 70 + i * 50; const y = H - 60 + Math.abs(Math.sin(now / 300 + i)) * -2;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 10, H - 15, 28, 3);
      g.drawImage(this.mons[i], x, y, 48, 48);
    });
    if (t < 400) { g.fillStyle = `rgba(255,255,255,${1 - t / 400})`; g.fillRect(0, 0, W, H); }
  }

  drawLogo(t, now) {
    const g = this.g;
    const y = 170 - Math.max(0, 1 - t / 500) * 60;
    g.textAlign = 'center';
    g.font = '700 30px "Pixelify Sans", monospace';
    g.fillStyle = '#20243c'; g.fillText('POKéMON', 363, y - 52 + 3);
    g.fillStyle = '#f0c840'; g.fillText('POKéMON', 360, y - 52);
    g.font = '700 92px "Pixelify Sans", monospace';
    g.fillStyle = '#1a1c30'; g.fillText('PLATIN', 366, y + 36 + 6);
    // Platinglanz: ein heller Streifen wandert schraeg durch den Schriftzug
    const sw = ((now / 2400) % 1.4) - 0.2;
    const gr = g.createLinearGradient(160, y - 60, 560, y + 40);
    gr.addColorStop(0, '#c8d0e4');
    gr.addColorStop(Math.max(0, Math.min(1, sw - 0.08)), '#b4bcd4');
    gr.addColorStop(Math.max(0, Math.min(1, sw)), '#ffffff');
    gr.addColorStop(Math.max(0, Math.min(1, sw + 0.08)), '#9ca4c0');
    gr.addColorStop(1, '#e8ecf8');
    g.fillStyle = gr; g.fillText('PLATIN', 360, y + 36);
    g.font = '700 20px "Pixelify Sans", monospace';
    g.fillStyle = '#a8b4e8'; g.fillText('M U L T I P L A Y E R', 360, y + 72);
    if (t > 700 && Math.floor(now / 500) % 2 === 0) {
      g.font = '700 22px "Pixelify Sans", monospace';
      g.fillStyle = '#ffffff'; g.fillText('Drücke Enter', 360, 440);
    }
    g.font = '13px "Pixelify Sans", monospace';
    g.fillStyle = 'rgba(200,208,240,.6)'; g.fillText('Fan-Projekt · eigene Grafik und Musik', 360, 516);
  }

  caption(text, t, alpha) {
    const g = this.g;
    const n = Math.min(text.length, Math.floor(t / 45));
    g.globalAlpha = alpha * Math.min(1, (1800 - t) / 300 + 0.2);
    g.font = '700 26px "Pixelify Sans", monospace'; g.textAlign = 'center';
    g.fillStyle = '#e8ecff'; g.fillText(text.slice(0, n), 360, 280);
    g.globalAlpha = 1;
  }
}

function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}
