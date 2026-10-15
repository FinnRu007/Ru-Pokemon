// Kampfeffekte: Partikel je Attackentyp, Treffer, Wertaenderungen, Ballwurf und Fang.
// Alles wird auf eine Canvas-Ebene ueber dem Kampffeld gezeichnet (eigene Pixeloptik).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const BALL_COLORS = { 'poke-ball': ['#e8403c', '#f8f8f8'], 'great-ball': ['#3c78e0', '#f8f8f8', '#e8403c'], 'ultra-ball': ['#303038', '#f8f8f8', '#f0c020'] };

// Farben und Form der Partikel pro Typ
const STYLE = {
  normal: { c: ['#ffffff', '#f0f0d8'], shape: 'star' },
  fire: { c: ['#ffd040', '#ff8020', '#e83018'], shape: 'flame' },
  water: { c: ['#8cd0ff', '#3c90f0', '#ffffff'], shape: 'drop' },
  grass: { c: ['#7cdc4c', '#3ca83c', '#c8f080'], shape: 'leaf' },
  electric: { c: ['#fff470', '#ffd820', '#ffffff'], shape: 'bolt' },
  ice: { c: ['#c8f4ff', '#7cd4f0', '#ffffff'], shape: 'shard' },
  fighting: { c: ['#ffb060', '#e05030'], shape: 'star' },
  poison: { c: ['#c070e0', '#8040b0', '#e0a0f0'], shape: 'bubble' },
  ground: { c: ['#d0a860', '#a07840', '#7a5830'], shape: 'rock' },
  flying: { c: ['#ffffff', '#d8e8ff'], shape: 'wind' },
  psychic: { c: ['#ff70c0', '#e040a0', '#ffc0e0'], shape: 'ring' },
  bug: { c: ['#b0d040', '#80a020'], shape: 'dot' },
  rock: { c: ['#b8a078', '#8a7458', '#5a4a38'], shape: 'rock' },
  ghost: { c: ['#9070d0', '#5a3c98', '#c8b0ff'], shape: 'wisp' },
  dragon: { c: ['#8060f0', '#4c3cc0', '#c0b0ff'], shape: 'flame' },
  dark: { c: ['#383048', '#5a4a6a', '#a090b0'], shape: 'slash' },
  steel: { c: ['#e0e0f0', '#a8a8c0', '#ffffff'], shape: 'star' }
};

export class BattleFx {
  constructor(field) {
    this.field = field;
    this.c = document.createElement('canvas');
    this.c.id = 'fx';
    field.appendChild(this.c);
    this.g = this.c.getContext('2d');
    this.parts = [];
    this.balls = [];
    this.running = false;
    this.flashUntil = 0;
  }

  resize() {
    const r = this.field.getBoundingClientRect();
    const w = Math.round(this.field.offsetWidth) || 720; const h = Math.round(this.field.offsetHeight) || 392;
    if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    this.scale = r.width ? w / r.width : 1;
  }

  // Mittelpunkt eines Sprites in Canvas-Koordinaten
  center(side) {
    this.resize();
    const el = document.getElementById(side === 'ally' ? 'allySprite' : 'foeSprite');
    const fr = this.field.getBoundingClientRect(); const r = el.getBoundingClientRect();
    if (!r.width) return side === 'ally' ? { x: 170, y: 280 } : { x: 550, y: 100 };
    return { x: (r.left - fr.left + r.width / 2) * this.scale, y: (r.top - fr.top + r.height * 0.6) * this.scale, r: r.width * this.scale / 2 };
  }

  loop() {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(50, now - last) / 16.67; last = now;
      this.tick(dt, now);
      if (this.parts.length || this.balls.length || now < this.flashUntil) requestAnimationFrame(step);
      else { this.running = false; this.g.clearRect(0, 0, this.c.width, this.c.height); }
    };
    requestAnimationFrame(step);
  }

  add(p) { this.parts.push({ life: 0, max: 30, size: 6, vx: 0, vy: 0, grav: 0, rot: 0, vr: 0, ...p }); this.loop(); }

  tick(dt, now) {
    const g = this.g;
    g.clearRect(0, 0, this.c.width, this.c.height);
    for (const p of this.parts) {
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.life += dt;
      if (p.target) { // Projektil: Bezierflug zum Ziel
        const t = Math.min(1, p.life / p.max);
        const ix = p.x0 + (p.target.x - p.x0) * t; const iy = p.y0 + (p.target.y - p.y0) * t - Math.sin(t * Math.PI) * (p.arc || 0);
        p.x = ix + Math.sin(p.life * 0.5 + p.seed) * (p.wobble || 0); p.y = iy + Math.cos(p.life * 0.4 + p.seed) * (p.wobble || 0);
      } else {
        p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      }
      p.rot += p.vr * dt;
      this.drawPart(g, p);
    }
    this.parts = this.parts.filter((p) => p.delay > 0 || p.life < p.max);
    for (const b of this.balls) this.drawBall(g, b, now);
    if (now < this.flashUntil) {
      g.fillStyle = `rgba(255,255,255,${(this.flashUntil - now) / 260})`;
      g.fillRect(0, 0, this.c.width, this.c.height);
    }
  }

  drawPart(g, p) {
    const fade = 1 - Math.max(0, (p.life - p.max * 0.6) / (p.max * 0.4));
    g.globalAlpha = Math.max(0, Math.min(1, fade));
    g.fillStyle = p.color; g.strokeStyle = p.color;
    const s = Math.round(p.size); const x = Math.round(p.x); const y = Math.round(p.y);
    g.save(); g.translate(x, y); g.rotate(p.rot);
    switch (p.shape) {
      case 'ring': { const r = p.size + p.life * (p.grow || 2); g.lineWidth = 4; g.strokeRect(-r, -r * 0.6, r * 2, r * 1.2); break; }
      case 'bolt': g.lineWidth = 4; g.beginPath(); g.moveTo(0, -s * 3); g.lineTo(-s, 0); g.lineTo(s, 0); g.lineTo(0, s * 3); g.stroke(); break;
      case 'leaf': g.fillRect(-s, -s / 2, s * 2, s); g.fillStyle = '#2a7a2a'; g.fillRect(-s, -1, s * 2, 2); break;
      case 'drop': g.fillRect(-s / 2, -s, s, s * 2); g.fillRect(-s, -s / 2, s * 2, s); break;
      case 'shard': g.beginPath(); g.moveTo(0, -s * 2); g.lineTo(s / 2, 0); g.lineTo(0, s * 2); g.lineTo(-s / 2, 0); g.fill(); break;
      case 'wind': g.fillRect(-s * 3, -1, s * 6, 3); break;
      case 'slash': g.lineWidth = 5; g.beginPath(); g.moveTo(-s * 4, -s * 4); g.lineTo(s * 4, s * 4); g.stroke(); break;
      case 'star': g.fillRect(-s, -s / 3, s * 2, s * 2 / 3); g.fillRect(-s / 3, -s, s * 2 / 3, s * 2); g.fillRect(-s / 2, -s / 2, s, s); break;
      case 'arrow': g.fillRect(-3, -s, 6, s * 2); g.beginPath(); g.moveTo(-s, p.up ? -s : s); g.lineTo(s, p.up ? -s : s); g.lineTo(0, p.up ? -s * 2 : s * 2); g.fill(); break;
      case 'bubble': g.lineWidth = 3; g.strokeRect(-s / 2, -s / 2, s, s); break;
      default: g.fillRect(-s / 2, -s / 2, s, s);
    }
    g.restore();
    g.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- Attacken
  async move(ev) {
    const from = this.center(ev.side); const to = this.center(ev.side === 'ally' ? 'foe' : 'ally');
    const st = STYLE[ev.moveType] || STYLE.normal;
    const pick = () => st.c[Math.floor(Math.random() * st.c.length)];
    if (ev.cat === 'status') {
      // Aura um den Anwender (Statusattacke)
      for (let i = 0; i < 18; i++) {
        const a = rand(0, Math.PI * 2);
        this.add({ x: from.x + Math.cos(a) * 60, y: from.y + Math.sin(a) * 40, vx: -Math.cos(a) * 1.2, vy: -Math.sin(a) * 1.2 - 0.6, color: pick(), shape: st.shape === 'ring' ? 'ring' : 'star', size: rand(3, 6), max: rand(26, 40), delay: i * 1.2, grow: 0.6 });
      }
      await sleep(550);
      return;
    }
    if (ev.cat === 'physical') {
      const el = document.getElementById(ev.side === 'ally' ? 'allySprite' : 'foeSprite');
      el.classList.remove('lunge'); void el.offsetWidth; el.classList.add('lunge');
      await sleep(180);
      this.burst(to, st, 14);
      await sleep(240);
      el.classList.remove('lunge');
      return;
    }
    // Spezialattacke: Projektile vom Anwender zum Ziel, dann Einschlag
    const n = st.shape === 'bolt' ? 6 : 14;
    for (let i = 0; i < n; i++) {
      this.add({
        x0: from.x, y0: from.y - 10, x: from.x, y: from.y, target: { x: to.x + rand(-18, 18), y: to.y + rand(-18, 18) },
        arc: ev.moveType === 'grass' || ev.moveType === 'water' ? 60 : 20, wobble: st.shape === 'wisp' || st.shape === 'bubble' ? 10 : 3, seed: i,
        color: pick(), shape: st.shape, size: rand(4, 8), max: 22, delay: i * 1.6, vr: st.shape === 'leaf' || st.shape === 'shard' ? 0.3 : 0
      });
    }
    await sleep(380 + n * 25);
    this.burst(to, st, 12);
    await sleep(120);
  }

  burst(at, st = STYLE.normal, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2); const v = rand(2, 6);
      this.add({ x: at.x, y: at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, grav: st.shape === 'rock' ? 0.35 : 0.08, color: st.c[i % st.c.length], shape: st.shape === 'bolt' ? 'star' : st.shape, size: rand(4, 9), max: rand(16, 26), vr: 0.2 });
    }
    this.add({ x: at.x, y: at.y, color: '#ffffff', shape: 'star', size: 18, max: 8 });
  }

  impact(side, strength) {
    const at = this.center(side);
    this.add({ x: at.x, y: at.y, color: '#ffffff', shape: 'star', size: strength > 1 ? 26 : 16, max: 9 });
    if (strength > 1) {
      this.flashUntil = performance.now() + 260;
      const st = document.getElementById('stage');
      st.classList.remove('quake'); void st.offsetWidth; st.classList.add('quake');
      this.loop();
    }
  }

  stat(side, up) {
    const at = this.center(side);
    for (let i = 0; i < 10; i++) {
      this.add({ x: at.x + rand(-50, 50), y: at.y + (up ? 40 : -60), vy: up ? -2.4 : 2.4, color: up ? '#ff9040' : '#4c8cf0', shape: 'arrow', up, size: 7, max: 34, delay: i * 2 });
    }
  }

  sparkle(side, color = '#fff6a0') {
    const at = this.center(side);
    for (let i = 0; i < 16; i++) {
      const a = rand(0, Math.PI * 2); const r = rand(20, 80);
      this.add({ x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r * 0.7, vy: -0.6, color, shape: 'star', size: rand(3, 7), max: rand(20, 36), delay: i * 1.5 });
    }
  }

  // ---------------------------------------------------------------- Pokeball
  drawBall(g, b, now) {
    const [top, bottom, band] = BALL_COLORS[b.kind] || BALL_COLORS['poke-ball'];
    const s = 4; const x = Math.round(b.x); const y = Math.round(b.y);
    g.save(); g.translate(x, y); g.rotate(b.rot || 0);
    const rows = ['..xxxx..', '.xTTTTx.', 'xTTBTTTx', 'xxxooxxx', 'xWWooWWx', 'xWWWWWWx', '.xWWWWx.', '..xxxx..'];
    const pal = { x: '#202028', T: top, W: bottom, o: '#ffffff', B: band || top };
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') { g.fillStyle = pal[ch]; g.fillRect((i - 4) * s, (j - 4) * s, s, s); } }));
    g.restore();
  }

  // Wurf, Einsaugen, Wackeln, Ergebnis. hooks.sfx(name) fuer die Klaenge.
  async catchSequence(ev, hooks) {
    const to = this.center('foe');
    const ground = { x: to.x, y: to.y + 46 };
    const b = { kind: ev.ball || 'poke-ball', x: 40, y: 330, rot: 0 };
    this.balls.push(b); this.loop();
    hooks.sfx('throw');
    await this.tween(420, (t) => { b.x = 40 + (to.x - 40) * t; b.y = 330 + (to.y - 40 - 330) * t - Math.sin(t * Math.PI) * 140; b.rot = t * 12; });
    const foe = document.getElementById('foeSprite');
    foe.classList.add('absorb');
    this.flashUntil = performance.now() + 200;
    for (let i = 0; i < 10; i++) this.add({ x: to.x + rand(-60, 60), y: to.y + rand(-60, 30), target: { x: to.x, y: to.y - 40 }, x0: to.x + rand(-70, 70), y0: to.y + rand(-70, 30), color: '#ff6060', shape: 'star', size: 5, max: 14, delay: i });
    hooks.sfx('poof');
    await sleep(380);
    b.rot = 0;
    await this.tween(260, (t) => { b.y = to.y - 40 + (ground.y - to.y + 40) * t * t; });
    hooks.sfx('click');
    for (let i = 0; i < ev.count; i++) {
      await sleep(320);
      hooks.sfx('shake');
      await this.tween(420, (t) => { b.rot = Math.sin(t * Math.PI * 2) * 0.45; });
      b.rot = 0;
    }
    await sleep(320);
    if (ev.caught) {
      hooks.sfx('click');
      for (let i = 0; i < 3; i++) this.add({ x: ground.x, y: ground.y - 10, vx: (i - 1) * 2.2, vy: -3, grav: 0.12, color: '#fff070', shape: 'star', size: 7, max: 40 });
      await sleep(700);
      this.balls = this.balls.filter((x) => x !== b);
    } else {
      this.balls = this.balls.filter((x) => x !== b);
      this.flashUntil = performance.now() + 220;
      hooks.sfx('poof');
      foe.classList.remove('absorb');
      this.burst(ground, { c: ['#ffffff', '#ffd0d0'], shape: 'star' }, 10);
      await sleep(350);
    }
    this.loop();
  }

  // Eigenes Pokemon wird aus dem Ball geschickt
  async sendOut(hooks) {
    const at = this.center('ally');
    const el = document.getElementById('allySprite');
    el.classList.add('waiting');
    const b = { kind: 'poke-ball', x: at.x - 140, y: at.y, rot: 0 };
    this.balls.push(b); this.loop();
    await this.tween(300, (t) => { b.x = at.x - 140 + 140 * t; b.y = at.y - Math.sin(t * Math.PI) * 90; b.rot = t * 10; });
    this.balls = this.balls.filter((x) => x !== b);
    hooks.sfx('poof');
    el.classList.remove('waiting'); el.classList.add('flash');
    this.burst(at, { c: ['#ffffff', '#fff0b0'], shape: 'star' }, 12);
    await sleep(260);
    el.classList.remove('flash');
  }

  tween(ms, fn) {
    return new Promise((res) => {
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        fn(t);
        if (t < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
      this.loop();
    });
  }

  clear() { this.parts = []; this.balls = []; }
}

// Uebergang vom Overworld in den Kampf (Blitz, dann Streifen). trainer: anderes Muster.
export function battleTransition(stage, kind) {
  return new Promise((res) => {
    const c = document.createElement('canvas');
    c.className = 'transition';
    c.width = 720; c.height = 528;
    stage.appendChild(c);
    const g = c.getContext('2d');
    const t0 = performance.now();
    const step = (now) => {
      const t = now - t0;
      g.clearRect(0, 0, 720, 528);
      if (t < 420) {
        const on = Math.floor(t / 70) % 2 === 0;
        g.fillStyle = on ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.6)';
        g.fillRect(0, 0, 720, 528);
      } else {
        const p = Math.min(1, (t - 420) / 520);
        g.fillStyle = '#000';
        if (kind === 'trainer') {
          // Spirale aus Keilen
          const steps = 24;
          for (let i = 0; i < Math.floor(p * steps); i++) {
            const a0 = (i / steps) * Math.PI * 2; const a1 = ((i + 1) / steps) * Math.PI * 2 + 0.02;
            g.beginPath(); g.moveTo(360, 264); g.arc(360, 264, 600, a0 - Math.PI / 2, a1 - Math.PI / 2); g.fill();
          }
        } else {
          const rows = 12; const h = 528 / rows;
          for (let i = 0; i < rows; i++) {
            const w = Math.min(720, p * 720 * 1.2 - (i % 3) * 40);
            if (w <= 0) continue;
            if (i % 2) g.fillRect(720 - w, i * h, w, h + 1); else g.fillRect(0, i * h, w, h + 1);
          }
        }
      }
      if (t < 980) requestAnimationFrame(step);
      else { c.remove(); res(); }
    };
    requestAnimationFrame(step);
  });
}
