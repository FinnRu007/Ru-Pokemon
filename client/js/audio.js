// Klang: eigener Chiptune-Synthesizer auf WebAudio. Alle Stuecke und Effekte sind selbst
// komponiert bzw. werden zur Laufzeit erzeugt. Hat `npm run sounds` die Original-Klaenge nach
// client/sounds/ geladen (nicht im Repo), spielen Musik, Fanfaren, Rufe und Attacken diese ab
// (Zuordnung in realAudio.js), sonst bleibt alles beim eigenen Synthesizer.
//
// Notation der Melodien: "note.laenge" mit Laenge in Sechzehnteln, z. B. "c5.4 e5.2 r.2".
// Akkorde (ein Takt je Akkord) erzeugen Bass und Arpeggio automatisch, Schlagzeug kommt
// aus 16-stelligen Mustern (k = Kick, s = Snare, h = Hi-Hat, . = Pause).

import { soundKey, trackForSong, JINGLE_TRACKS } from './realAudio.js';

const NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
function midi(n) {
  const m = /^([a-g])(#|b)?(\d)$/.exec(n);
  if (!m) throw new Error('Note? ' + n);
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

function parseMelody(src) {
  const out = []; let t = 0;
  for (const tok of src.split(/[\s|]+/).filter(Boolean)) {
    const [n, l] = tok.split('.');
    const len = Number(l || 2);
    if (n !== 'r') out.push({ t, len, m: midi(n) });
    t += len;
  }
  return { notes: out, len: t };
}

const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], dim: [0, 3, 6] };
function chordTones(name) {
  const m = /^([A-G])(#|b)?(m7|m|7|dim)?$/.exec(name);
  if (!m) throw new Error('Akkord? ' + name);
  const root = NOTE[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return { root, tones: QUAL[m[3] || ''] };
}

// ------------------------------------------------------------------ Stuecke
const S = {
  title: {
    bpm: 96, chords: 'C G Am F C G F G', bass: 'pulse', arp: 'up', drums: ['k...h...s...h...', 'k...h.k.s...h.hh'],
    lead: 'e5.4 g5.4 c6.6 b5.2 | a5.4 g5.4 d5.8 | e5.4 a5.4 c6.4 e6.4 | d6.6 c6.2 a5.8 | g5.4 c6.4 e6.6 d6.2 | d6.4 b5.4 g5.8 | a5.4 c6.4 f6.6 e6.2 | d6.8 g5.4 b5.4'
  },
  twinleaf: {
    bpm: 88, chords: 'G Em C D G Em Am D', bass: 'walk', arp: 'soft', drums: ['k.......h.......'],
    lead: 'b4.4 d5.4 g5.6 f#5.2 | e5.4 g5.4 b4.8 | c5.4 e5.4 g5.4 e5.4 | f#5.6 e5.2 d5.8 | b4.2 d5.2 g5.4 a5.4 b5.4 | g5.6 e5.2 b4.8 | c5.4 e5.4 a5.4 g5.4 | d5.4 f#5.4 a5.8'
  },
  sandgem: {
    bpm: 104, chords: 'D Bm G A D Bm G A', bass: 'walk', arp: 'up', drums: ['k...h...k.s.h...'],
    lead: 'f#5.4 a5.4 d6.4 a5.4 | f#5.6 d5.2 b4.8 | g5.4 b5.4 d6.4 b5.4 | a5.8 e5.4 c#5.4 | d5.2 f#5.2 a5.4 d6.4 c#6.4 | b5.6 a5.2 f#5.8 | g5.4 a5.4 b5.4 d6.4 | e6.4 c#6.4 a5.8'
  },
  jubilife: {
    bpm: 120, chords: 'F C Dm Bb F C Bb C', bass: 'oct', arp: 'up', drums: ['k.h.s.h.k.h.s.hh'],
    lead: 'c5.2 f5.2 a5.2 c6.2 a5.4 f5.4 | e5.2 g5.2 c6.4 e5.8 | d5.2 f5.2 a5.4 d6.4 a5.4 | bb5.6 a5.2 g5.4 f5.4 | a5.4 c6.4 f6.4 e6.4 | d6.4 c6.4 g5.8 | bb5.4 d6.4 f6.4 d6.4 | e6.8 c6.4 g5.4'
  },
  oreburgh: {
    bpm: 100, chords: 'Am Am F G Am Am Dm E', bass: 'oct', arp: 'down', drums: ['k..k..s.k.k...s.'],
    lead: 'a4.4 c5.2 e5.2 a5.6 g5.2 | e5.4 c5.4 a4.8 | f5.4 a5.4 c6.6 b5.2 | b5.8 d5.4 g5.4 | a5.4 e6.4 d6.2 c6.2 b5.4 | c6.6 b5.2 a5.8 | d5.4 f5.4 a5.4 d6.4 | e6.8 g#5.8'
  },
  route1: {
    bpm: 132, chords: 'C F G C Am F G G', bass: 'oct', arp: 'up', drums: ['k.h.s.h.k.h.s.h.'],
    lead: 'c5.2 e5.2 g5.4 c6.4 g5.4 | a5.4 f5.4 c6.8 | b5.4 g5.2 d5.2 g5.8 | e5.2 g5.2 c6.6 r.6 | a5.4 c6.4 e6.4 c6.4 | f6.4 e6.2 d6.2 c6.8 | d6.4 b5.4 g5.4 b5.4 | d6.12 r.4'
  },
  route2: {
    bpm: 140, chords: 'Em C D G Em C B7 B7', bass: 'oct', arp: 'up', drums: ['k.h.s.hkk.h.s.hh'],
    lead: 'e5.2 g5.2 b5.4 e6.4 d6.4 | c6.6 b5.2 g5.8 | a5.4 f#5.4 d5.4 a5.4 | b5.8 g5.4 d5.4 | e5.2 g5.2 b5.4 e6.6 f#6.2 | g6.4 e6.4 c6.8 | b5.4 d#6.4 f#6.4 b5.4 | d#6.8 f#5.8'
  },
  bicycle: {
    bpm: 160, chords: 'G C D G Em C D D', bass: 'oct', arp: 'up', drums: ['k.h.s.hkk.h.s.h.'],
    lead: 'd5.2 g5.2 b5.2 d6.2 b5.4 g5.4 | c6.4 e6.4 c6.4 g5.4 | a5.2 b5.2 c6.2 d6.2 f#6.4 d6.4 | g6.8 d6.8 | e6.4 d6.4 b5.4 g5.4 | c6.4 b5.4 a5.4 g5.4 | a5.4 d6.4 f#6.4 a6.4 | g6.12 r.4'
  },
  lake: {
    bpm: 72, chords: 'Dm Bb Gm A Dm Bb Gm A', bass: 'pulse', arp: 'soft', drums: null,
    lead: 'a5.8 f5.4 d5.4 | d6.8 bb5.8 | g5.6 a5.2 bb5.8 | a5.12 c#5.4 | d5.4 f5.4 a5.4 d6.4 | f6.8 d6.8 | e6.6 d6.2 bb5.8 | a5.16'
  },
  cave: {
    bpm: 84, chords: 'Em Em C B Em Em Am B', bass: 'pulse', arp: 'soft', drums: ['k.......k..k....'], leadWave: 'tri',
    lead: 'e4.6 g4.2 b4.8 | a4.4 g4.4 e4.8 | c5.6 b4.2 g4.8 | f#4.8 d#4.8 | e5.4 r.4 b4.4 g4.4 | a4.6 b4.2 c5.8 | e5.4 d5.4 c5.4 b4.4 | b4.16'
  },
  center: {
    bpm: 92, chords: 'C Am Dm G C Am F G', bass: 'walk', arp: 'soft', drums: ['k...h...k...h...'],
    lead: 'e5.4 c5.4 g5.8 | a5.4 g5.4 e5.8 | f5.4 a5.4 d6.6 c6.2 | b5.8 g5.8 | e5.2 g5.2 c6.4 e6.8 | d6.4 c6.4 a5.8 | f5.4 a5.4 c6.4 a5.4 | g5.8 b5.4 d6.4'
  },
  gym: {
    bpm: 138, chords: 'Gm Gm Eb F Gm Gm Cm D', bass: 'oct', arp: 'up', drums: ['k.hhs.h.k.hks.hh'],
    lead: 'g5.2 g5.2 bb5.2 d6.2 g6.4 f6.4 | d6.6 bb5.2 g5.8 | eb6.4 d6.4 bb5.4 g5.4 | f5.4 a5.4 c6.8 | g5.2 bb5.2 d6.2 g6.2 a6.4 bb6.4 | a6.6 g6.2 d6.8 | c6.4 eb6.4 g6.4 eb6.4 | d6.4 f#6.4 a6.8'
  },
  battle_wild: {
    bpm: 168, chords: 'Am F G Am Am F E E', bass: 'oct', arp: 'up', drums: ['k.hsk.hsk.hsk.ss'],
    lead: 'a5.2 e5.2 a5.2 c6.2 b5.4 a5.4 | c6.4 a5.4 f5.8 | g5.2 b5.2 d6.4 b5.4 g5.4 | a5.12 e5.4 | a5.2 c6.2 e6.4 d6.4 c6.4 | f6.6 e6.2 c6.8 | b5.4 g#5.4 e5.4 b5.4 | e6.8 g#5.8'
  },
  battle_trainer: {
    bpm: 176, chords: 'Em C Am B Em C D B', bass: 'oct', arp: 'up', drums: ['k.hsk.hsk.hsk.hs', 'k.hsk.hsk.hss.ss'],
    lead: 'e6.2 b5.2 g5.2 b5.2 e6.4 f#6.4 | g6.4 e6.4 c6.8 | a5.2 c6.2 e6.4 a6.4 g6.4 | f#6.8 d#6.8 | e6.2 g6.2 b6.4 a6.4 g6.4 | e6.6 c6.2 g5.8 | f#5.4 a5.4 d6.4 f#6.4 | b5.8 d#6.8'
  },
  victory: {
    bpm: 140, chords: 'C F G C', bass: 'oct', arp: 'up', drums: ['k.h.s.h.k.h.s.h.'],
    lead: 'c5.2 e5.2 g5.2 c6.2 g5.2 c6.2 e6.4 | f6.4 c6.4 a5.8 | d6.2 e6.2 f6.4 b5.4 d6.4 | c6.12 r.4'
  }
};
// Entwicklung: gleichbleibendes, spannungsvolles Arpeggio, steigt jede Runde etwas an
S.evolution = {
  bpm: 120, chords: 'Am Am F G Am Am Dm E', bass: 'pulse', arp: 'up', drums: null, leadWave: 'tri',
  lead: 'a5.2 e5.2 a5.2 c6.2 b5.2 e5.2 b5.2 c6.2 | a5.2 e5.2 a5.2 c6.2 d6.4 c6.4 | a5.2 f5.2 a5.2 c6.2 f6.4 e6.4 | d6.2 b5.2 g5.2 b5.2 d6.4 g6.4 | a5.2 e5.2 a5.2 c6.2 b5.2 e5.2 b5.2 c6.2 | e6.2 c6.2 a5.2 c6.2 e6.4 a6.4 | f6.4 d6.4 a5.4 d6.4 | e6.4 g#5.4 b5.4 e6.4'
};
S.battle_leader = { ...S.battle_trainer, bpm: 188, drums: ['kkhsk.hskkhsk.ss'] };
S.victory_trainer = S.victory_leader = S.victory;
// Weitere Kampfarten ohne eigenen Chiptune: naechstes passendes Stueck
for (const k of ['rival', 'galactic']) { S['battle_' + k] = S.battle_trainer; S['victory_' + k] = S.victory; }
for (const k of ['commander', 'boss', 'elite', 'champion']) { S['battle_' + k] = S.battle_leader; S['victory_' + k] = S.victory; }
for (const k of ['legend', 'lakes', 'creation']) S['battle_' + k] = S.battle_leader;

// Kurze Fanfaren (spielen einmal, danach laeuft die Musik weiter)
const J = {
  heal: { bpm: 120, lead: 'c6.2 e6.2 g6.2 c7.4 r.2 g6.2 c7.8 r.4', chords: 'C C' },
  levelup: { bpm: 150, lead: 'g5.1 c6.1 e6.1 g6.3 e6.2 g6.8', chords: 'C' },
  caught: { bpm: 130, lead: 'e5.2 g5.2 c6.2 e6.2 d6.2 b5.2 g5.4 | c6.8 r.8', chords: 'C G' },
  badge: { bpm: 120, lead: 'g5.2 g5.2 g5.2 c6.6 e6.4 | d6.2 c6.2 d6.2 e6.2 g6.8 | c7.12 r.4', chords: 'C G C' },
  item: { bpm: 140, lead: 'c6.2 d6.2 e6.2 g6.6 r.4', chords: 'C' },
  evolved: { bpm: 132, lead: 'c6.2 c6.2 c6.2 g5.2 c6.2 e6.2 g6.4 | f6.2 e6.2 d6.2 e6.2 c6.8 | g6.12 r.4', chords: 'C F C' }
};

// Musik pro Karte: feste Zuordnung, sonst ueber Thema oder Ortsnamen
const MAP_MUSIC = {
  twinleaf_town: 'twinleaf', route_201: 'route1', route_202: 'route1', lake_verity: 'lake', sandgem_town: 'sandgem',
  jubilife_city: 'jubilife', route_203: 'route2', route_204: 'route2', oreburgh_city: 'oreburgh', sandgem_lab: 'sandgem'
};
export function musicForMap(id, map) {
  if (MAP_MUSIC[id]) return MAP_MUSIC[id];
  if (map?.like && map.like !== id && !map.music) return musicForMap(map.like, null);
  if (map?.music && S[map.music]) return map.music;
  const th = map?.theme;
  if (th === 'cave') return 'cave';
  if (th === 'center' || th === 'mart') return 'center';
  if (th === 'gym') return 'gym';
  for (const town of ['twinleaf', 'sandgem', 'jubilife', 'oreburgh']) if (id.startsWith(town)) return town;
  return 'route1';
}

// ------------------------------------------------------------------ Engine
const PREFS_KEY = 'platin.audio';

class Chip {
  constructor() {
    this.ctx = null;
    this.prefs = { music: 0.45, sfx: 0.6, muted: false, musicOn: true, sfxOn: true };
    try { Object.assign(this.prefs, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')); } catch { /* privat */ }
    this.current = null; // { name, gain, timer }
    this.wanted = null;
    this.jingleUntil = 0;
    // Original-Klaenge: Verzeichnis aus `npm run sounds`, dekodierte Puffer je Datei
    this.real = { cries: new Set(), moves: {}, misc: {}, music: new Set() };
    this.buffers = new Map();
    this.token = 0;
    if (typeof fetch === 'function' && typeof window !== 'undefined') this.loadReal();
  }

  async loadReal() {
    try {
      const res = await fetch('/sounds/index.json', { cache: 'no-cache' });
      if (!res.ok) return;
      const idx = await res.json();
      this.real = { cries: new Set(idx.cries || []), moves: idx.moves || {}, misc: idx.misc || {}, music: new Set(idx.music || []) };
    } catch { /* keine Original-Klaenge, eigener Synthesizer */ }
  }

  // Datei laden und dekodieren (einmal je Datei, danach aus dem Speicher)
  buffer(file) {
    if (!this.buffers.has(file)) {
      const url = '/sounds/' + file.split('/').map(encodeURIComponent).join('/');
      const p = fetch(url).then((r) => { if (!r.ok) throw new Error(url); return r.arrayBuffer(); })
        .then((b) => this.ctx.decodeAudioData(b));
      p.catch(() => this.buffers.delete(file));
      this.buffers.set(file, p);
    }
    return this.buffers.get(file);
  }

  // Datei abspielen. Gibt ein Handle wie startSong zurueck (gain, stop ueber stopHandle).
  playFile(file, bus, { loop = false, vol = 1, at = 0, onEnd, onFail } = {}) {
    const ctx = this.ctx;
    const gain = ctx.createGain(); gain.gain.value = vol; gain.connect(bus);
    const h = { name: file, gain, timer: null, src: null, dead: false };
    this.buffer(file).then((buf) => {
      if (h.dead) return;
      const src = h.src = ctx.createBufferSource();
      src.buffer = buf; src.loop = loop;
      src.connect(gain);
      src.onended = () => { if (!h.dead && !loop) { h.dead = true; gain.disconnect(); onEnd?.(); } };
      src.start(Math.max(ctx.currentTime, at));
    }).catch(() => { if (!h.dead) { h.dead = true; gain.disconnect(); onFail?.(); } });
    return h;
  }

  // Titel aus der Sound Library vorhanden? Liefert den Dateinamen oder null.
  musicFile(title) {
    if (!title) return null;
    if (title.startsWith('misc:')) return this.real.misc[title.slice(5)] || null;
    const k = soundKey(title);
    return this.real.music.has(k) ? `music/${k}.mp3` : null;
  }

  // Ton-Option Mono: alles wird auf einen Kanal heruntergemischt
  setMono(on) {
    this.mono = !!on;
    if (!this.master) return;
    this.master.channelCountMode = 'explicit';
    this.master.channelCount = this.mono ? 1 : 2;
  }

  // Muss aus einer Nutzeraktion heraus aufgerufen werden (Browser-Regel fuer Autoplay)
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.setMono(this.mono);
    // Leichter Kompressor, damit Musik und Effekte nicht uebersteuern
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(this.master);
    // Tiefpass nimmt den Pulswellen die Schaerfe (weicherer, waermerer Klang)
    const mlp = ctx.createBiquadFilter(); mlp.type = 'lowpass'; mlp.frequency.value = 2200; mlp.Q.value = 0.5; mlp.connect(comp);
    const slp = ctx.createBiquadFilter(); slp.type = 'lowpass'; slp.frequency.value = 5000; slp.Q.value = 0.5; slp.connect(comp);
    this.musicBus = ctx.createGain(); this.musicBus.connect(mlp);
    this.sfxBus = ctx.createGain(); this.sfxBus.connect(slp);
    // Original-Aufnahmen gehen am Filter vorbei, haengen aber an denselben Schaltern
    this.realMusicBus = ctx.createGain(); this.realMusicBus.connect(this.master);
    this.realSfxBus = ctx.createGain(); this.realSfxBus.connect(this.master);
    this.waves = { p12: this.pulse(0.125), p25: this.pulse(0.25), p50: this.pulse(0.5) };
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyPrefs();
    if (this.wanted) this.resumeWanted();
  }

  pulse(duty) {
    const n = 32; const re = new Float32Array(n); const im = new Float32Array(n);
    for (let i = 1; i < n; i++) re[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    return this.ctx.createPeriodicWave(re, im);
  }

  applyPrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs)); } catch { /* privat */ }
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.prefs.muted ? 0 : 0.9, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.prefs.musicOn ? this.prefs.music * 0.5 : 0, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.prefs.sfxOn ? this.prefs.sfx : 0, t, 0.05);
    this.realMusicBus.gain.setTargetAtTime(this.prefs.musicOn ? this.prefs.music * 0.7 : 0, t, 0.05);
    this.realSfxBus.gain.setTargetAtTime(this.prefs.sfxOn ? this.prefs.sfx * 0.8 : 0, t, 0.05);
  }
  toggle(kind) { const k = kind === 'music' ? 'musicOn' : 'sfxOn'; this.prefs[k] = !this.prefs[k]; this.applyPrefs(); return this.prefs[k]; }
  toggleMute() { this.prefs.muted = !this.prefs.muted; this.applyPrefs(); return this.prefs.muted; }
  setVolume(kind, v) { this.prefs[kind] = Math.max(0, Math.min(1, v)); this.applyPrefs(); }

  // Ton mit Huellkurve
  tone(dest, wave, f, t, dur, vol, opts = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    if (this.waves[wave]) o.setPeriodicWave(this.waves[wave]); else o.type = wave === 'tri' ? 'triangle' : wave;
    o.frequency.setValueAtTime(f, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t + (opts.glide ?? dur));
    if (opts.vib) {
      const l = ctx.createOscillator(); const lg = ctx.createGain();
      l.frequency.value = opts.vib; lg.gain.value = f * 0.02;
      l.connect(lg); lg.connect(o.frequency); l.start(t + 0.08); l.stop(t + dur + 0.05);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    const sus = opts.decay ? vol * opts.decay : vol;
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, sus), t + Math.min(dur, 0.12) + 0.006);
    g.gain.setValueAtTime(Math.max(0.0002, sus), t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + (opts.release ?? 0.05));
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + (opts.release ?? 0.05) + 0.02);
  }

  hit(dest, t, kind, vol = 1) {
    const ctx = this.ctx;
    if (kind === 'k') return this.tone(dest, 'sine', 160, t, 0.09, 0.5 * vol, { to: 40, glide: 0.09, release: 0.03 });
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = kind === 'h' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'h' ? 5000 : 1500;
    const g = ctx.createGain();
    const dur = kind === 'h' ? 0.03 : 0.12;
    g.gain.setValueAtTime((kind === 'h' ? 0.05 : 0.28) * vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }

  // Song in eine Liste aus Ereignissen (Position in Sechzehnteln) uebersetzen
  compile(song) {
    const ev = [];
    const lead = parseMelody(song.lead);
    for (const n of lead.notes) ev.push({ t: n.t, len: n.len, ch: 'lead', m: n.m });
    const chords = song.chords.split(/\s+/);
    const len = Math.max(lead.len, chords.length * 16);
    chords.forEach((c, bar) => {
      const { root, tones } = chordTones(c);
      const b0 = bar * 16; const bm = 36 + root + (root > 5 ? 0 : 12); // Bass um C2/C3
      const bass = song.bass || 'oct';
      for (let i = 0; i < 16; i += (bass === 'pulse' ? 4 : 2)) {
        let m = bm;
        if (bass === 'oct' && (i / 2) % 2) m += 12;
        if (bass === 'walk') m += [0, 7, 12, 7][(i / 2) % 4];
        ev.push({ t: b0 + i, len: bass === 'pulse' ? 3 : 1.6, ch: 'bass', m });
      }
      if (song.arp) {
        const notes = [...tones, 12].map((x) => 48 + root + x);
        const order = song.arp === 'down' ? [...notes].reverse() : notes;
        const step = song.arp === 'soft' ? 2 : 1;
        for (let i = 0; i < 16; i += step) ev.push({ t: b0 + i, len: step * 0.8, ch: 'arp', m: order[(i / step) % order.length] });
      }
    });
    if (song.drums) {
      for (let bar = 0; bar < len / 16; bar++) {
        const pat = song.drums[bar % song.drums.length];
        for (let i = 0; i < 16; i++) if (pat[i] !== '.') ev.push({ t: bar * 16 + i, ch: 'drum', kind: pat[i] });
      }
    }
    ev.sort((a, b) => a.t - b.t);
    return { ev, len };
  }

  schedule(dest, e, t, step, song) {
    if (e.ch === 'drum') return this.hit(dest, t, e.kind);
    const f = hz(e.m);
    // Melodie eine Oktave tiefer als notiert und mit 50-%-Puls: runder, nicht schrill
    if (e.ch === 'lead') return this.tone(dest, song.leadWave || 'p50', f / 2, t, e.len * step * 0.92, 0.2, { decay: 0.7, vib: e.len >= 6 ? 5 : 0 });
    if (e.ch === 'bass') return this.tone(dest, 'tri', f, t, e.len * step, 0.32, { release: 0.02 });
    if (e.ch === 'arp') return this.tone(dest, 'tri', f, t, e.len * step, 0.09, { decay: 0.4, release: 0.02 });
  }

  // Song abspielen. loop = false fuer Fanfaren, onEnd danach.
  startSong(name, song, loop, onEnd) {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.25);
    gain.connect(this.musicBus);
    const { ev, len } = this.compile(song);
    const step = 60 / song.bpm / 4;
    const h = { name, gain, idx: 0, base: ctx.currentTime + 0.08, timer: null };
    h.timer = setInterval(() => {
      const horizon = ctx.currentTime + 0.25;
      for (;;) {
        if (h.idx >= ev.length) {
          if (!loop) {
            clearInterval(h.timer);
            setTimeout(() => { gain.disconnect(); onEnd?.(); }, Math.max(0, (h.base + len * step - ctx.currentTime) * 1000) + 120);
            return;
          }
          h.idx = 0; h.base += len * step;
        }
        const e = ev[h.idx];
        const t = h.base + e.t * step;
        if (t > horizon) break;
        if (t > ctx.currentTime - 0.02) this.schedule(gain, e, t, step, song);
        h.idx++;
      }
    }, 40);
    return h;
  }

  stopHandle(h, fade = 0.35) {
    if (!h) return;
    clearInterval(h.timer);
    if (h.src !== undefined && !h.src) { h.dead = true; h.gain.disconnect(); return; }
    h.dead = true;
    const t = this.ctx.currentTime;
    h.gain.gain.cancelScheduledValues(t);
    h.gain.gain.setValueAtTime(h.gain.gain.value, t);
    h.gain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    setTimeout(() => { h.gain.disconnect(); try { h.src?.stop(); } catch { /* schon beendet */ } }, fade * 1000 + 300);
  }

  // Hintergrundmusik wechseln (gleicher Name: nichts tun). track: Titel aus der Sound Library
  // fuer diese Karte; ohne Angabe gilt der Titel zum Stueck (realAudio.js), sonst der Chiptune.
  music(name, track) {
    const want = { name, track };
    if (!this.ctx) { this.wanted = want; return; }
    const file = this.musicFile(track ?? trackForSong(name));
    const key = file || name;
    if (this.current?.key === key) return;
    this.wanted = want;
    if (this.jingleUntil) return; // laeuft nach der Fanfare an
    this.stopHandle(this.current);
    this.current = null;
    if (file) {
      const h = this.playFile(file, this.realMusicBus, { loop: true, onFail: () => { if (this.current === h) { this.current = null; this.startSynth(name); } } });
      h.key = key;
      // sanft einblenden
      h.gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      h.gain.gain.exponentialRampToValueAtTime(1, this.ctx.currentTime + 0.3);
      this.current = h;
    } else this.startSynth(name);
  }

  startSynth(name) {
    if (name && S[name]) { this.current = this.startSong(name, S[name], true); this.current.key = name; }
  }

  resumeWanted() {
    this.jingleUntil = 0; this.jingleH = null;
    const w = this.wanted; this.wanted = null;
    if (w) this.music(w.name, w.track);
  }

  jingle(name) {
    if (!this.ctx) return;
    const file = (JINGLE_TRACKS[name] || []).map((t) => this.musicFile(t)).find(Boolean);
    if (!file && !J[name]) return;
    this.stopHandle(this.current, 0.08);
    this.stopHandle(this.jingleH, 0.05);
    this.current = null;
    const id = ++this.token;
    const done = () => { if (this.token === id) this.resumeWanted(); };
    this.jingleUntil = 1;
    if (file) return void (this.jingleH = this.playFile(file, this.realMusicBus, { onEnd: done, onFail: done }));
    if (!J[name]) return done();
    const song = { ...J[name], bass: 'oct', arp: null, drums: null };
    this.jingleH = this.startSong('jingle', song, false, done);
  }

  // ---------------------------------------------------------------- Effekte
  sfx(name, arg) {
    if (!this.ctx) return;
    const d = this.sfxBus; const t = this.ctx.currentTime + 0.01;
    const T = (w, f, s, dur, v, o) => this.tone(d, w, f, t + s, dur, v, o);
    switch (name) {
      case 'select': T('p25', 1320, 0, 0.04, 0.18); T('p25', 1760, 0.04, 0.05, 0.18); break;
      case 'back': T('p25', 1100, 0, 0.04, 0.15); T('p25', 740, 0.04, 0.05, 0.15); break;
      case 'text': T('p50', 1500, 0, 0.025, 0.06); break;
      case 'bump': T('tri', 110, 0, 0.08, 0.5, { to: 70 }); break;
      case 'door': this.noiseSweep(d, t, 0.3, 400, 3000, 0.25); break;
      case 'grass': this.noiseSweep(d, t, 0.07, 3000, 6000, 0.08); break;
      case 'ledge': T('p25', 300, 0, 0.18, 0.18, { to: 700, glide: 0.1 }); break;
      case 'encounter': [0, 3, 6, 9, 12, 15].forEach((x, i) => T('p25', hz(72 + x), i * 0.045, 0.04, 0.16)); break;
      case 'exclaim': T('p50', 1800, 0, 0.06, 0.18); T('p50', 2400, 0.07, 0.1, 0.18); break;
      case 'emote': T('p25', 900, 0, 0.05, 0.14, { to: 1400 }); break;
      case 'hit': this.noiseSweep(d, t, 0.12, 2400, 600, 0.45); T('square', 220, 0, 0.08, 0.2, { to: 90 }); break;
      case 'hitSuper': this.noiseSweep(d, t, 0.2, 3600, 400, 0.55); T('square', 330, 0, 0.14, 0.24, { to: 60 }); break;
      case 'hitWeak': this.noiseSweep(d, t, 0.07, 1600, 900, 0.25); break;
      case 'faint': T('p50', 900, 0, 0.6, 0.2, { to: 90 }); break;
      case 'throw': T('p12', 300, 0, 0.3, 0.14, { to: 1400 }); this.noiseSweep(d, t, 0.3, 800, 4000, 0.12); break;
      case 'shake': T('p25', 520, 0, 0.05, 0.18); T('p25', 380, 0.07, 0.05, 0.18); break;
      case 'click': T('p50', 2000, 0, 0.03, 0.2); T('p50', 1000, 0.05, 0.05, 0.2); break;
      case 'poof': this.noiseSweep(d, t, 0.25, 6000, 1000, 0.3); break;
      case 'statUp': for (let i = 0; i < 6; i++) T('p25', 600 + i * 150, i * 0.05, 0.05, 0.12); break;
      case 'statDown': for (let i = 0; i < 6; i++) T('p25', 1350 - i * 150, i * 0.05, 0.05, 0.12); break;
      case 'heal': for (let i = 0; i < 5; i++) T('p25', hz(76 + [0, 4, 7, 12, 16][i]), i * 0.06, 0.08, 0.13); break;
      case 'map': T('p25', 660, 0, 0.05, 0.14); T('p25', 990, 0.05, 0.07, 0.14); break;
      // Entwicklung: Leuchten (aufsteigend), Wechsel der Gestalt und heller Blitz am Ende
      case 'evoShine': T('tri', 220, 0, 1.2, 0.16, { to: 880, glide: 1.1 }); this.noiseSweep(d, t, 1.2, 600, 5000, 0.1); break;
      case 'evoPulse': T('p25', 1320, 0, 0.06, 0.08); T('p25', 1760, 0.05, 0.08, 0.06); break;
      case 'evoFlash': this.noiseSweep(d, t, 0.8, 8000, 800, 0.3); T('p50', 1760, 0, 0.5, 0.12, { to: 440 }); break;
      case 'evoSparkle': for (let i = 0; i < 8; i++) T('p25', hz(84 + [0, 4, 7, 12, 7, 12, 16, 19][i]), i * 0.05, 0.06, 0.1); break;
      case 'start': [0, 4, 7, 12].forEach((x, i) => T('p25', hz(72 + x), i * 0.07, 0.12, 0.2)); T('p25', hz(91), 0.3, 0.4, 0.2, { vib: 6 }); break;
      case 'move': {
        // arg: { move, type } oder nur der Typ
        const parts = arg?.move && this.real.moves[soundKey(arg.move)];
        if (parts) this.playParts(parts);
        else this.moveSound(arg?.type ?? arg);
        break;
      }
      case 'cry':
        if (this.real.cries.has(Number(arg))) this.playFile(`cries/${Number(arg)}.ogg`, this.realSfxBus, { onFail: () => this.cry(arg) });
        else this.cry(arg);
        break;
    }
  }

  // Mehrteilige Attacken-Klaenge nacheinander abspielen
  async playParts(files) {
    let at = this.ctx.currentTime + 0.01;
    for (const f of files) {
      let buf;
      try { buf = await this.buffer(f); } catch { continue; }
      this.playFile(f, this.realSfxBus, { at });
      at = Math.max(at, this.ctx.currentTime) + buf.duration;
    }
  }

  noiseSweep(dest, t, dur, f0, f1, vol) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }

  // Attackenklang je nach Typ
  moveSound(type) {
    const d = this.sfxBus; const t = this.ctx.currentTime + 0.01;
    const T = (w, f, s, dur, v, o) => this.tone(d, w, f, t + s, dur, v, o);
    switch (type) {
      case 'fire': this.noiseSweep(d, t, 0.5, 500, 2500, 0.35); T('sawtooth', 120, 0, 0.4, 0.1, { to: 60 }); break;
      case 'water': for (let i = 0; i < 6; i++) T('sine', 500 + Math.random() * 700, i * 0.06, 0.08, 0.2, { to: 1500 }); break;
      case 'grass': this.noiseSweep(d, t, 0.35, 4000, 7000, 0.18); T('p12', 1200, 0, 0.3, 0.08, { vib: 12 }); break;
      case 'electric': for (let i = 0; i < 8; i++) T('square', 200 + Math.random() * 1600, i * 0.035, 0.03, 0.14); break;
      case 'ice': for (let i = 0; i < 5; i++) T('sine', 2200 + i * 300, i * 0.05, 0.12, 0.12); break;
      case 'psychic': case 'ghost': T('sine', 400, 0, 0.6, 0.2, { to: 900, vib: 8 }); T('sine', 600, 0.05, 0.6, 0.12, { to: 300, vib: 7 }); break;
      case 'poison': for (let i = 0; i < 4; i++) T('sine', 300, i * 0.1, 0.08, 0.2, { to: 800 }); break;
      case 'rock': case 'ground': this.noiseSweep(d, t, 0.4, 300, 100, 0.5); T('tri', 70, 0, 0.3, 0.5, { to: 40 }); break;
      case 'flying': this.noiseSweep(d, t, 0.45, 600, 3000, 0.25); break;
      case 'dragon': T('sawtooth', 90, 0, 0.5, 0.18, { to: 180, vib: 10 }); this.noiseSweep(d, t, 0.5, 300, 900, 0.3); break;
      case 'dark': T('square', 160, 0, 0.3, 0.14, { to: 70 }); break;
      case 'steel': T('p12', 1800, 0, 0.25, 0.14, { to: 1600, vib: 20 }); T('p12', 2600, 0.02, 0.2, 0.1); break;
      case 'bug': for (let i = 0; i < 6; i++) T('p25', 900 + (i % 2) * 300, i * 0.04, 0.035, 0.12); break;
      case 'fighting': this.noiseSweep(d, t, 0.1, 1500, 500, 0.4); this.noiseSweep(d, t + 0.12, 0.1, 1500, 500, 0.4); break;
      default: this.noiseSweep(d, t, 0.15, 2000, 800, 0.3);
    }
  }

  // Jede Art bekommt einen eigenen, aus der Pokedex-Nummer abgeleiteten Ruf
  cry(id) {
    let s = (Number(id) || 1) * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const d = this.sfxBus; const t0 = this.ctx.currentTime + 0.02;
    const base = 260 + rnd() * 700;
    const parts = 2 + Math.floor(rnd() * 3);
    const wave = ['p25', 'p12', 'sawtooth', 'p50'][Math.floor(rnd() * 4)];
    let t = 0;
    for (let i = 0; i < parts; i++) {
      const dur = 0.08 + rnd() * 0.18;
      const f0 = base * (0.7 + rnd() * 0.8); const f1 = f0 * (0.6 + rnd() * 0.9);
      this.tone(d, wave, f0, t0 + t, dur, 0.14, { to: f1, vib: 14 + rnd() * 20, release: 0.04 });
      if (rnd() > 0.5) this.tone(d, 'p12', f0 * 1.5, t0 + t, dur * 0.8, 0.05, { to: f1 * 1.5 });
      t += dur * (0.7 + rnd() * 0.4);
    }
  }
}

export const audio = new Chip();
export const SONGS = S;
export const JINGLES = J;
export const _test = { parseMelody, chordTones };
