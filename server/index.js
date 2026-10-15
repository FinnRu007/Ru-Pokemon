// Einstiegspunkt: HTTP-Server (liefert Client und gemeinsame Module aus) + WebSocket-Server.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { config, ROOT } from './config.js';
import { openStorage } from './db/storage.js';
import { GameServer } from './game/game.js';
import { loadCache, applyData, fetchSpecies, saveCache } from './data/pokeapiLoader.js';
import { POKEMON } from '../shared/data/pokemon.js';
import { MOVES } from '../shared/data/moves.js';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ico': 'image/x-icon'
};
const STATIC = { '/shared/': path.join(ROOT, 'shared'), '/': path.join(ROOT, 'client') };

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': MIME['.json'] });
    return res.end(JSON.stringify({ ok: true, players: game.sessions.size, storage: repo.kind, species: Object.keys(POKEMON).length, moves: Object.keys(MOVES).length }));
  }
  const prefix = url.pathname.startsWith('/shared/') ? '/shared/' : '/';
  const base = STATIC[prefix];
  let rel = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html';
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Nicht gefunden'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

// Daten: eingebettete Kerndaten + optionaler PokeAPI-Cache
if (config.pokeapi) {
  try {
    const ids = (process.env.POKEAPI_IDS || '387-405').split(',').flatMap((p) => { const [a, b] = p.split('-').map(Number); return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a]; });
    const cached = loadCache();
    const missing = ids.filter((id) => !cached?.pokemon?.[id]);
    if (missing.length) saveCache(await fetchSpecies(missing, { log: console }));
  } catch (e) {
    console.warn('PokeAPI nicht erreichbar, nutze eingebettete Daten:', e.message);
  }
}
const added = applyData(loadCache());
if (added.pokemon || added.moves) console.log(`PokeAPI-Cache: +${added.pokemon} Arten, +${added.moves} Attacken`);

const repo = openStorage(config.dataDir);
const game = new GameServer(repo);
const server = http.createServer(serveStatic);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  game.attach(ws);
});
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 15000);

server.listen(config.port, config.host, () => {
  console.log(`Platin Multiplayer laeuft auf http://localhost:${config.port}  (Speicher: ${repo.kind}, Daten: ${config.dataDir})`);
});

function shutdown() {
  console.log('Fahre herunter ...');
  clearInterval(heartbeat);
  game.stop();
  for (const s of game.sessions.values()) game.savePlayerNow(s);
  repo.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { server, game, repo };
