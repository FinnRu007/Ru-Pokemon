// Optionen wie im Platin-Menue: Textgeschwindigkeit, Kampfanimation, Kampfstil, Ton und Rahmen.
// Gespeichert pro Browser (localStorage), wirkt sofort.
const KEY = 'platin.options';
export const OPTION_DEFS = [
  { key: 'textSpeed', label: 'Textgeschw.', values: [['slow', 'Langsam'], ['mid', 'Mittel'], ['fast', 'Schnell']] },
  { key: 'battleAnim', label: 'Kampfanimation', values: [[true, 'An'], [false, 'Aus']] },
  { key: 'battleStyle', label: 'Kampfstil', values: [['shift', 'Wechsel'], ['set', 'Folge']] },
  { key: 'sound', label: 'Ton', values: [['stereo', 'Stereo'], ['mono', 'Mono']] },
  { key: 'frame', label: 'Rahmen', values: Array.from({ length: 8 }, (_, i) => [i + 1, `Typ ${i + 1}`]) }
];
const DEFAULTS = { textSpeed: 'mid', battleAnim: true, battleStyle: 'shift', sound: 'stereo', frame: 1 };

function load() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; }
}
export const options = load();
const listeners = [];
export function onOptions(fn) { listeners.push(fn); fn(options); }
export function setOption(key, value) {
  options[key] = value;
  try { localStorage.setItem(KEY, JSON.stringify(options)); } catch { /* privat */ }
  for (const fn of listeners) fn(options);
}

// Zeichen pro Takt und Takt in Millisekunden. Original: Langsam 8, Mittel 4, Schnell 1 Bild pro Zeichen.
const SPEED = { slow: [1, 70], mid: [1, 34], fast: [3, 16] };
export function textStep() { return SPEED[options.textSpeed] || SPEED.mid; }
// Wartezeit nach einer Kampfmeldung skaliert mit der Textgeschwindigkeit
export function textPause(ms) { return Math.round(ms * ({ slow: 1.35, mid: 1, fast: 0.7 }[options.textSpeed] || 1)); }
