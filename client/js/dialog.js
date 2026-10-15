// Textfenster im Stil der DS-Spiele: Schreibmaschineneffekt, Sprechername, Weiter-Pfeil,
// optionale Auswahl (Ja/Nein usw.). Aktionstaste beschleunigt bzw. blaettert weiter.
import { textStep } from './options.js';
const $ = (id) => document.getElementById(id);

export class Dialog {
  constructor() {
    this.el = $('dialog');
    this.queue = [];
    this.open = false;
    this.typing = false;
    this.onDone = null;
    this.choiceEl = null;
    this.el.addEventListener('click', () => this.advance());
  }

  // lines: [{ speaker?, text }] oder Strings. choices: [{ label, value }] nach der letzten Zeile.
  show(lines, onDone, choices) {
    this.queue = lines.map((l) => (typeof l === 'string' ? { text: l } : l));
    this.onDone = onDone || null;
    this.choices = choices || null;
    this.open = true;
    this.el.classList.remove('hidden');
    this.next();
  }

  next() {
    const line = this.queue.shift();
    if (!line) return this.close();
    this.el.innerHTML = `${line.speaker ? `<div class="speaker">${esc(line.speaker)}</div>` : ''}<div class="text"></div><div class="more">▼</div>`;
    this.textEl = this.el.querySelector('.text');
    this.full = line.text;
    this.shown = 0;
    this.typing = true;
    this.el.classList.remove('waiting');
    clearInterval(this.timer);
    const [step, ms] = textStep();
    this.timer = setInterval(() => {
      this.shown += step;
      this.textEl.textContent = this.full.slice(0, this.shown);
      if (this.shown >= this.full.length) this.finishLine();
    }, ms);
  }

  finishLine() {
    clearInterval(this.timer);
    this.typing = false;
    this.textEl.textContent = this.full;
    if (!this.queue.length && this.choices) return this.showChoices();
    this.el.classList.add('waiting');
  }

  showChoices() {
    const box = document.createElement('div');
    box.className = 'dialog-choices';
    this.choices.forEach((c, i) => {
      const b = document.createElement('button');
      b.textContent = c.label;
      b.onclick = (e) => { e.stopPropagation(); this.pick(c.value); };
      if (i === 0) setTimeout(() => b.focus(), 0);
      box.appendChild(b);
    });
    this.el.appendChild(box);
    this.choiceEl = box;
  }

  pick(value) {
    const cb = this.onDone;
    this.choices = null; this.choiceEl = null;
    this.close(value, cb);
  }

  advance() {
    if (!this.open || this.choiceEl) return;
    if (this.typing) return this.finishLine();
    this.next();
  }

  close(value, cb = this.onDone) {
    clearInterval(this.timer);
    this.open = false;
    this.el.classList.add('hidden');
    this.onDone = null;
    if (cb) cb(value);
  }
}

function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
