// Einstiegspunkt des Clients: verbindet Netzwerk, Overworld, Renderer, Kampf und HUD.
import { MAPS } from '/shared/data/maps.js';
import { Net } from './net.js';
import { Input } from './input.js';
import { World } from './world.js';
import { Renderer } from './renderer.js';
import { BattleUI } from './battleUI.js';
import { Hud } from './hud.js';

const $ = (id) => document.getElementById(id);
const manifest = await (await fetch('/assets/sprites/manifest.json')).json();
const net = new Net();
const input = new Input();
const world = new World(net);
const renderer = new Renderer($('game'), manifest);
const hud = new Hud(net, manifest, MAPS);
let dialogOpen = false;

const battle = new BattleUI(net, manifest, {
  log: (t, c) => hud.log(t, c),
  onEnd: () => { world.locked = dialogOpen || starterOpen || gameOver; },
  onLearnPrompt: (ev) => learnQueue.push(ev)
});
const learnQueue = [];
let starterOpen = false;
let gameOver = false;

// ------------------------------------------------------------------ Login
const saved = (() => { try { return JSON.parse(localStorage.getItem('platin.session') || 'null'); } catch { return null; } })();
if (saved) $('loginSaved').innerHTML = `Gespeicherter Spielstand: <b>${saved.name}</b>. Leer lassen und "Spielen" drücken, um fortzufahren.`;
$('loginBtn').onclick = () => {
  const name = $('loginName').value.trim();
  const runCode = $('loginRun').value.trim();
  const rules = {};
  document.querySelectorAll('#ruleSet input').forEach((i) => { rules[i.dataset.rule] = i.checked; });
  const hello = (!name && saved) || (saved && saved.name.toLowerCase() === name.toLowerCase())
    ? { t: 'hello', token: saved.token }
    : { t: 'hello', name, runCode, rules };
  $('loginError').textContent = '';
  net.connect(hello);
};
$('loginName').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('loginBtn').click(); });

// ------------------------------------------------------------------ Netzwerk-Handler
net.on('welcome', (m) => {
  try { localStorage.setItem('platin.session', JSON.stringify({ token: m.token, name: m.player.name })); } catch { /* privat */ }
  net.helloMsg = { t: 'hello', token: m.token };
  $('login').classList.add('hidden');
  world.walkMs = m.walkMs; world.runMs = m.runMs;
  world.setSelf(m.player);
  world.setOthers(m.players);
  showMapName(m.player.map);
  hud.log(`Willkommen, ${m.player.name}!${m.run ? ` Run: ${m.run.id}` : ' (Solo)'}`, 'dialog');
});
net.on('error', (m) => {
  if ($('login').classList.contains('hidden')) hud.log('Fehler: ' + m.message, 'death');
  else { $('loginError').textContent = m.message; net.helloMsg = null; }
});
net.on('_close', () => hud.log('Verbindung getrennt. Versuche erneut ...', 'death'));
net.on('needStarter', (m) => {
  starterOpen = true; world.locked = true;
  openModal(`<h1>Wähle deinen Partner</h1><p>Prof. Eibe überlässt dir eines dieser Pokémon.</p><div class="choices">${m.options.map((o) =>
    `<button data-id="${o.id}" style="background:${manifest.typeColors[o.types[0]]}">${o.name}</button>`).join('')}</div>`);
  document.querySelectorAll('#modalPanel button[data-id]').forEach((b) => {
    b.onclick = () => { net.send({ t: 'chooseStarter', speciesId: Number(b.dataset.id) }); closeModal(); starterOpen = false; world.locked = false; };
  });
});
net.on('moveAck', (m) => world.reconcile(m));
net.on('mapChange', (m) => {
  Object.assign(world.me, { map: m.map, x: m.x, y: m.y, dir: m.dir });
  world.anim = null;
  world.setOthers(m.players);
  showMapName(m.map);
});
world.onMapChange = (mapId) => showMapName(mapId);
net.on('playerJoined', (m) => { if (m.player.map === world.me?.map) { world.addOther(m.player); hud.log(`${m.player.name} ist hier.`); } });
net.on('playerLeft', (m) => world.removeOther(m.id));
net.on('playerMoved', (m) => world.moveOther(m));
net.on('playerState', (m) => { if (m.player.map === world.me?.map) world.updateOther(m.player); });
net.on('chat', (m) => hud.chat(m.from, m.text));
net.on('notice', (m) => {
  hud.log(m.text, m.kind);
  if (m.kind === 'dialog') showDialog(m.text);
});
net.on('party', (m) => hud.setParty(m));
net.on('nuzlocke', (m) => hud.setNuzlocke(m));
net.on('soulDeath', (m) => {
  const txt = m.cause === 'soulbound_failed_encounter'
    ? `Seelenband gerissen: ${m.pokemonName} von ${m.playerName} ist tot.`
    : `Seelenband: ${m.pokemonName} von ${m.playerName} ist mit ${m.partnerName || 'seinem Partner'} (${m.partnerPlayer}) gestorben.`;
  hud.log(txt, 'death');
});
net.on('battleStart', (m) => { world.locked = true; world.anim = null; battle.start(m); });
net.on('battleEvents', (m) => battle.enqueue(m.events, m.state));
net.on('battleEnd', (m) => {
  battle.end(m);
  setTimeout(processLearnQueue, 50);
});
net.on('gameOver', (m) => {
  gameOver = true; world.locked = true;
  openModal(`<h1>Game Over</h1><p>${m.reason}</p><p class="hint">Der Spielstand bleibt erhalten. Für einen neuen Run einen neuen Namen wählen.</p><button id="newRun">Neuer Trainer</button>`);
  $('newRun').onclick = () => { try { localStorage.removeItem('platin.session'); } catch { /* */ } location.reload(); };
});

// ------------------------------------------------------------------ UI-Helfer
function openModal(html) { $('modalPanel').innerHTML = html; $('modal').classList.remove('hidden'); }
function closeModal() { $('modal').classList.add('hidden'); }
let bannerTimer;
function showMapName(id) {
  const el = $('mapName');
  el.textContent = MAPS[id]?.name || id;
  el.classList.remove('hidden');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}
function showDialog(text) {
  dialogOpen = true; world.locked = true;
  $('dialog').textContent = text;
  $('dialog').classList.remove('hidden');
}
function closeDialog() {
  dialogOpen = false;
  $('dialog').classList.add('hidden');
  world.locked = battle.active || starterOpen || gameOver;
}
function processLearnQueue() {
  if (battle.active || !learnQueue.length) return;
  const ev = learnQueue.shift();
  const mon = hud.party.find((p) => p.id === ev.pokemonId);
  if (!mon) return processLearnQueue();
  openModal(`<h1>Neue Attacke</h1><p>${ev.text}</p><p>Welche Attacke soll vergessen werden?</p><div class="choices">${mon.moves.map((mv, i) =>
    `<button data-i="${i}">${mv.name}</button>`).join('')}<button data-i="-1" style="background:#555">Nicht erlernen</button></div>`);
  document.querySelectorAll('#modalPanel button[data-i]').forEach((b) => {
    b.onclick = () => {
      const i = Number(b.dataset.i);
      if (i >= 0) net.send({ t: 'learnMove', pokemonId: ev.pokemonId, moveId: ev.moveId, replaceIndex: i });
      closeModal();
      processLearnQueue();
    };
  });
}

input.on('action', () => {
  if (battle.active || starterOpen || gameOver) return;
  if (dialogOpen) return closeDialog();
  if (world.me && !world.anim) net.send({ t: 'interact' });
});
input.on('chat', () => $('chatInput').focus());
$('chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('chatInput').value.trim();
  if (text) net.send({ t: 'chat', text });
  $('chatInput').value = '';
  $('chatInput').blur();
});
setInterval(() => net.send({ t: 'ping', at: Date.now() }), 20000);

// ------------------------------------------------------------------ Spielschleife
function frame(now) {
  if (world.me) world.update(input, now);
  renderer.draw(world, now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
