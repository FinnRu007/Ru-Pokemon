// Tastatureingabe: gehaltene Richtungen (zuletzt gedrueckte gewinnt), Rennen, Aktionstaste.
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right'
};
export class Input {
  constructor() {
    this.dirs = [];
    this.pressedAt = {};
    this.running = false;
    this.actionQueued = false;
    this.enabled = true;
    this.listeners = {};
    addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const d = KEYMAP[e.code];
      if (d) {
        e.preventDefault();
        if (!this.dirs.includes(d)) { this.dirs.push(d); this.pressedAt[d] = performance.now(); }
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyB') this.running = true;
      if (['KeyZ', 'Enter', 'Space'].includes(e.code)) { e.preventDefault(); this.actionQueued = true; this.emit('action'); }
      if (e.code === 'KeyT') { e.preventDefault(); this.emit('chat'); }
      if (e.code === 'KeyM') { e.preventDefault(); this.emit('map'); }
      if (e.code === 'KeyN') { e.preventDefault(); this.emit('mute'); }
      if (e.code === 'KeyF') { e.preventDefault(); this.emit('fly'); }
      if (e.code === 'KeyR') { e.preventDefault(); this.emit('bike'); }
      if (e.code === 'KeyP') { e.preventDefault(); this.emit('poketch'); }
      if (e.code === 'KeyC') { e.preventDefault(); this.emit('freecam'); }
      if (e.code === 'KeyV') { e.preventDefault(); this.emit('fullscreen'); }
      if (['Equal', 'NumpadAdd', 'BracketRight'].includes(e.code)) this.emit('zoomIn');
      if (['Minus', 'NumpadSubtract', 'Slash'].includes(e.code)) this.emit('zoomOut');
      if (e.code === 'Escape') this.emit('escape');
      if (e.code === 'KeyX') { e.preventDefault(); this.emit('menu'); }
      if (/^Digit[1-6]$/.test(e.code)) { e.preventDefault(); this.emote = Number(e.code.slice(5)) - 1; this.emit('emote'); }
    });
    addEventListener('keyup', (e) => {
      const d = KEYMAP[e.code];
      if (d) this.dirs = this.dirs.filter((x) => x !== d);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyB') this.running = false;
    });
    addEventListener('blur', () => { this.dirs = []; this.running = false; });
  }
  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev) { for (const fn of this.listeners[ev] || []) fn(); }
  currentDir() { return this.enabled ? this.dirs[this.dirs.length - 1] || null : null; }
  heldFor(dir) { return performance.now() - (this.pressedAt[dir] || 0); }
  consumeAction() { const a = this.actionQueued; this.actionQueued = false; return a; }
}
