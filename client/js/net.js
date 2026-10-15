// WebSocket-Verbindung mit automatischem Wiederverbinden und Token-Login.
export class Net {
  constructor() {
    this.handlers = new Map();
    this.ws = null;
    this.queue = [];
    this.helloMsg = null;
    this.retry = 0;
  }
  on(type, fn) { this.handlers.set(type, fn); }
  connect(helloMsg) {
    this.helloMsg = helloMsg;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws.onopen = () => {
      this.retry = 0;
      this.ws.send(JSON.stringify(this.helloMsg));
      for (const m of this.queue.splice(0)) this.ws.send(JSON.stringify(m));
    };
    this.ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      const h = this.handlers.get(m.t);
      if (h) h(m); else console.debug('Unbehandelt', m);
    };
    this.ws.onclose = () => {
      const h = this.handlers.get('_close');
      if (h) h();
      if (this.helloMsg?.token) {
        const delay = Math.min(10000, 500 * 2 ** this.retry++);
        setTimeout(() => this.connect(this.helloMsg), delay);
      }
    };
  }
  send(m) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m));
    else this.queue.push(m);
  }
}
