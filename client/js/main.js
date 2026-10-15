// Einstiegspunkt des Clients: verbindet Netzwerk, Overworld, Renderer, Kampf und HUD.
import { MAPS } from '/shared/data/maps.js';
import { Net } from './net.js';
import { Input } from './input.js';
import { World } from './world.js';
import { Renderer } from './renderer.js';
import { BattleUI } from './battleUI.js';
import { Hud } from './hud.js';
import { monsterDataUrl } from './art/monsters.js';
import { Dialog } from './dialog.js';

const $ = (id) => document.getElementById(id);
const manifest = await (await fetch('/assets/sprites/manifest.json')).json();
const net = new Net();
const input = new Input();
const world = new World(net);
const renderer = new Renderer($('game'), manifest);
const hud = new Hud(net, manifest, MAPS);
const dialog = new Dialog();

const battle = new BattleUI(net, manifest, {
  log: (t, c) => hud.log(t, c),
  onEnd: () => { updateLock(); flushDialogs(); },
  onLearnPrompt: (ev) => learnQueue.push(ev)
});
const learnQueue = [];
let starterOpen = false;
let gameOver = false;
let scriptActive = false;
let shopOpen = false;
const pendingDialogs = [];
function updateLock() { world.locked = battle.active || starterOpen || gameOver || dialog.open || scriptActive || shopOpen; }

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
  openModal(`<h1>Der Koffer</h1><p>Im Koffer liegen drei Pokébälle. Welches Pokémon wählst du als Partner?</p><div class="choices starters">${m.options.map((o) =>
    `<button data-id="${o.id}" style="background:${manifest.typeColors[o.types[0]]}"><img src="${monsterDataUrl(o, false)}" alt="">${o.name}</button>`).join('')}</div>`);
  document.querySelectorAll('#modalPanel button[data-id]').forEach((b) => {
    b.onclick = () => { net.send({ t: 'chooseStarter', speciesId: Number(b.dataset.id) }); closeModal(); starterOpen = false; updateLock(); };
  });
});
net.on('moveAck', (m) => world.reconcile(m));
net.on('mapChange', (m) => {
  if (m.map !== world.me.map) world.npcState = {};
  Object.assign(world.me, { map: m.map, x: m.x, y: m.y, dir: m.dir });
  world.anim = null;
  world.setOthers(m.players);
  showMapName(m.map);
});
world.onMapChange = (mapId, warp) => { world.npcState = {}; if (warp) fade(); showMapName(mapId); };
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
// Story: Dialoge vom Server. Waehrend eines Kampfes warten sie, bis der Kampfbildschirm zu ist.
net.on('dialog', (m) => { pendingDialogs.push(m); flushDialogs(); });
net.on('script', (m) => { scriptActive = m.active; updateLock(); });
net.on('progress', (m) => { world.flags = m.flags || {}; hud.setProgress(m); });
net.on('npcEmote', (m) => world.emote(m.id));
net.on('shop', (m) => openShop(m));
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
let bannerTimer; let lastBanner = null;
function fade() {
  const el = $('fade');
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
}
function showMapName(id) {
  const el = $('mapName');
  const name = MAPS[id]?.name || id;
  if (name === lastBanner) return;
  lastBanner = name;
  el.textContent = name;
  el.classList.remove('hidden');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}
function showDialog(text, onDone, choices) {
  world.locked = true;
  dialog.show(Array.isArray(text) ? text : [text], (v) => {
    updateLock();
    if (onDone) onDone(v);
  }, choices);
}
function flushDialogs() {
  if (battle.active || dialog.open || !pendingDialogs.length) return;
  const m = pendingDialogs.shift();
  if (m.face) world.faceNpc(m.face.id, m.face.dir);
  for (const l of m.lines) hud.log(l.speaker ? `${l.speaker}: ${l.text}` : l.text, 'dialog');
  showDialog(m.lines, (v) => { net.send({ t: 'dialogDone', token: m.token, choice: v ?? 0 }); setTimeout(flushDialogs, 0); }, m.choices);
}
function openShop(m) {
  shopOpen = true; updateLock();
  const rows = m.stock.map((it) => `<div class="shop-row${it.locked ? ' locked' : ''}"><span class="nm">${it.name}<small>Im Beutel: ${it.have}</small></span><span class="pr">${it.price} ¥</span>
    ${it.locked ? '<span class="hint">ab Orden 1</span>' : `<button data-buy="${it.id}" data-n="1" ${m.money < it.price ? 'disabled' : ''}>1</button><button data-buy="${it.id}" data-n="5" ${m.money < it.price * 5 ? 'disabled' : ''}>5</button><button data-buy="${it.id}" data-n="10" ${m.money < it.price * 10 ? 'disabled' : ''}>10</button>`}</div>`).join('');
  openModal(`<h1>Pokémon-Markt</h1><p>Dein Geld: <b>${m.money} ¥</b></p><div class="shop">${rows}</div><button id="shopClose">Fertig</button>`);
  document.querySelectorAll('#modalPanel button[data-buy]').forEach((b) => { b.onclick = () => net.send({ t: 'buy', item: b.dataset.buy, count: Number(b.dataset.n) }); });
  $('shopClose').onclick = () => { net.send({ t: 'shopClose' }); closeModal(); shopOpen = false; updateLock(); };
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
  if (battle.active || starterOpen || gameOver || shopOpen) return;
  if (dialog.open) return dialog.advance();
  if (world.me && !world.anim && !scriptActive) net.send({ t: 'interact' });
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
