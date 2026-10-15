// Einstiegspunkt des Clients: verbindet Netzwerk, Overworld, Renderer, Kampf und HUD.
import { MAPS } from '/shared/data/maps.js';
import { Net } from './net.js';
import { Input } from './input.js';
import { World } from './world.js';
import { Renderer } from './renderer.js';
import { BattleUI } from './battleUI.js';
import { Hud } from './hud.js';
import { monsterDataUrl, loadRealSprites, itemIcon } from './art/monsters.js';
import { Dialog } from './dialog.js';
import { audio, musicForMap } from './audio.js';
import { trackForMap } from './realAudio.js';
import { WorldMap, placeName, areaOf } from './worldmap.js';
import { Intro } from './intro.js';
import { terrainFor } from './art/realTerrain.js';
import { EMOTES } from '/shared/protocol.js';
import { weatherFor, timeOfDay, TIME_NAMES } from './ambience.js';
import { GameMenu } from './menu.js';
import { loadTexts } from './texts.js';
import { onOptions } from './options.js';

const $ = (id) => document.getElementById(id);
const manifest = await (await fetch('/assets/sprites/manifest.json')).json();
await Promise.all([loadRealSprites(), loadTexts()]);
const net = new Net();
const input = new Input();
const world = new World(net);
const renderer = new Renderer($('game'), manifest);
const hud = new Hud(net, manifest, MAPS);
const dialog = new Dialog();
const worldMap = new WorldMap();
const menu = new GameMenu({ net, hud, world, onClose: () => { updateLock(); setTimeout(processLearnQueue, 50); setTimeout(flushDialogs, 0); } });
onOptions((o) => { $('stage').dataset.frame = o.frame; audio.setMono(o.sound === 'mono'); });
let mapOpen = false;
let introDone = false;
new Intro($('stage'), () => { introDone = true; $('loginName').focus(); });

const battle = new BattleUI(net, manifest, {
  log: (t, c) => hud.log(t, c),
  onEnd: () => { updateLock(); flushDialogs(); if (world.me) audio.music(musicForMap(world.me.map, MAPS[world.me.map]), trackForMap(world.me.map, MAPS[world.me.map])); },
  onLearnPrompt: (ev) => learnQueue.push(ev),
  terrain: () => world.me && terrainFor(world.me.map, MAPS[world.me.map])
});
const learnQueue = [];
let starterOpen = false;
let gameOver = false;
let scriptActive = false;
let shopOpen = false;
const pendingDialogs = [];
function updateLock() { world.locked = battle.active || starterOpen || gameOver || dialog.open || scriptActive || shopOpen || mapOpen || menu.isOpen; }

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
  audio.unlock();
  audio.sfx('select');
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
  worldMap.setPlayer(m.player.name);
  worldMap.me = world.me;
  enterMap(m.player.map, false);
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
  enterMap(m.map, true);
});
world.onMapChange = (mapId, warp) => { world.npcState = {}; if (warp) { fade(); audio.sfx('door'); } enterMap(mapId, false); };
world.onStep = (mapId, x, y, tile, running, jump) => {
  renderer.amb.step(mapId, x, y, tile, running);
  if (jump) audio.sfx('ledge'); else if (tile === '"') audio.sfx('grass');
};
world.onBump = () => audio.sfx('bump');
function enterMap(mapId, fromServer) {
  showMapName(mapId);
  worldMap.visit(mapId);
  if (!battle.active) audio.music(musicForMap(mapId, MAPS[mapId]), trackForMap(mapId, MAPS[mapId]));
  drawMinimap(true);
}
net.on('playerJoined', (m) => { if (m.player.map === world.me?.map) { world.addOther(m.player); hud.log(`${m.player.name} ist hier.`); } });
net.on('playerLeft', (m) => world.removeOther(m.id));
net.on('playerMoved', (m) => world.moveOther(m));
net.on('playerState', (m) => { if (m.player.map === world.me?.map) world.updateOther(m.player); });
net.on('chat', (m) => hud.chat(m.from, m.text));
net.on('roster', (m) => { worldMap.roster = m.players; $('onlineCount').textContent = m.players.length; });
net.on('playerEmote', (m) => { world.playerEmote(m.id, m.kind); audio.sfx('emote'); });
net.on('notice', (m) => {
  hud.log(m.text, m.kind);
  if (menu.isOpen && menu.onNotice(m.text)) return;
  if (m.kind === 'dialog') showDialog(m.text);
});
net.on('party', (m) => { hud.setParty(m); menu.onParty(); });
net.on('saved', (m) => menu.onSaved(m));
net.on('learnPrompt', (m) => { learnQueue.push(m); setTimeout(processLearnQueue, 300); });
net.on('service', (m) => {
  if (m.update) { menu.serviceMsg = m; return; }
  world.locked = true; menu.service(m).then(updateLock);
});
net.on('nuzlocke', (m) => hud.setNuzlocke(m));
net.on('soulDeath', (m) => {
  const txt = m.cause === 'soulbound_failed_encounter'
    ? `Seelenband gerissen: ${m.pokemonName} von ${m.playerName} ist tot.`
    : `Seelenband: ${m.pokemonName} von ${m.playerName} ist mit ${m.partnerName || 'seinem Partner'} (${m.partnerPlayer}) gestorben.`;
  hud.log(txt, 'death');
  // Seelenband reisst: roter Puls ueber dem Bild
  const st = $('stage'); st.classList.remove('soulflash'); void st.offsetWidth; st.classList.add('soulflash');
  audio.sfx('faint');
});
net.on('battleStart', (m) => { world.locked = true; world.anim = null; battle.start(m); });
// Story: Dialoge vom Server. Waehrend eines Kampfes warten sie, bis der Kampfbildschirm zu ist.
net.on('dialog', (m) => { pendingDialogs.push(m); flushDialogs(); });
net.on('script', (m) => { scriptActive = m.active; updateLock(); });
net.on('progress', (m) => { world.flags = m.flags || {}; hud.setProgress(m); menu.refresh(); });
net.on('npcEmote', (m) => { world.emote(m.id); audio.sfx('exclaim'); });
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
  if (battle.active || dialog.open || menu.isOpen || !pendingDialogs.length) return;
  const m = pendingDialogs.shift();
  if (m.face) world.faceNpc(m.face.id, m.face.dir);
  for (const l of m.lines) hud.log(l.speaker ? `${l.speaker}: ${l.text}` : l.text, 'dialog');
  const all = m.lines.map((l) => l.text || l).join(' ');
  if (/wieder gesund/.test(all)) audio.jingle('heal');
  else if (/(erhältst|bekommst) (den|die|das|einen|eine|\d)/.test(all)) audio.jingle('item');
  showDialog(m.lines, (v) => { net.send({ t: 'dialogDone', token: m.token, choice: v ?? 0 }); setTimeout(flushDialogs, 0); }, m.choices);
}
function openShop(m) {
  shopOpen = true; updateLock();
  const rows = m.stock.map((it) => `<div class="shop-row${it.locked ? ' locked' : ''}"><span class="nm">${itemIcon(it.id)}${it.name}<small>Im Beutel: ${it.have}</small></span><span class="pr">${it.price} ¥</span>
    ${it.locked ? '<span class="hint">ab Orden 1</span>' : `<button data-buy="${it.id}" data-n="1" ${m.money < it.price ? 'disabled' : ''}>1</button><button data-buy="${it.id}" data-n="5" ${m.money < it.price * 5 ? 'disabled' : ''}>5</button><button data-buy="${it.id}" data-n="10" ${m.money < it.price * 10 ? 'disabled' : ''}>10</button>`}</div>`).join('');
  openModal(`<h1>Pokémon-Markt</h1><p>Dein Geld: <b>${m.money} ¥</b></p><div class="shop">${rows}</div><button id="shopClose">Fertig</button>`);
  document.querySelectorAll('#modalPanel button[data-buy]').forEach((b) => { b.onclick = () => net.send({ t: 'buy', item: b.dataset.buy, count: Number(b.dataset.n) }); });
  $('shopClose').onclick = () => { net.send({ t: 'shopClose' }); closeModal(); shopOpen = false; updateLock(); };
}
// Neue Attacke nach dem Kampf: Ablauf wie im Original (vergessen, 1, 2 und ... Schwupp!)
async function processLearnQueue() {
  if (battle.active || menu.isOpen || !learnQueue.length) return;
  const ev = learnQueue.shift();
  world.locked = true;
  await menu.levelUpLearn(ev);
  updateLock();
  setTimeout(processLearnQueue, 50);
}

input.on('action', () => {
  if (!introDone) return;
  if (mapOpen) return toggleMap(false);
  if (battle.active || starterOpen || gameOver || shopOpen || menu.isOpen) return;
  if (dialog.open) return dialog.advance();
  if (world.me && !world.anim && !scriptActive) net.send({ t: 'interact' });
});
input.on('chat', () => $('chatInput').focus());
input.on('map', () => { if (world.me && !battle.active) toggleMap(); });
input.on('escape', () => { if (mapOpen) toggleMap(false); });
input.on('menu', () => openMenu());
$('menuBtn').onclick = () => openMenu();
function openMenu() {
  if (!world.me || !introDone || battle.active || starterOpen || gameOver || dialog.open || scriptActive || shopOpen || menu.isOpen) return;
  if (mapOpen) toggleMap(false);
  menu.open(); updateLock();
}
input.on('mute', () => toggleMute());
input.on('fly', () => { if (world.me && !battle.active) net.send({ t: 'fly' }); });
input.on('emote', () => { if (world.me && !battle.active) net.send({ t: 'emote', kind: EMOTES[input.emote] }); });
$('mapBtn').onclick = () => { if (world.me && !battle.active) toggleMap(); };
// Weltkarte: Mausrad zoomt, Ziehen verschiebt, Klick auf einen besuchten Ort fliegt dorthin
worldMap.canFlyTo = (id) => !!(world.flags.hm_fly && world.flags['visit_' + id] && world.me && id !== world.me.map && !MAPS[world.me.map]?.indoor);
const wmc = $('wmCanvas');
const wmSize = () => { const r = wmc.getBoundingClientRect(); return { W: r.width, H: r.height }; };
const wmPoint = (e) => { const r = wmc.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
wmc.addEventListener('wheel', (e) => { e.preventDefault(); const { W, H } = wmSize(); const p = wmPoint(e); worldMap.zoomAt(e.deltaY < 0 ? 1.25 : 0.8, p.x, p.y, W, H); }, { passive: false });
let wmDrag = null;
wmc.addEventListener('pointerdown', (e) => { wmDrag = { ...wmPoint(e), moved: 0 }; wmc.setPointerCapture(e.pointerId); });
wmc.addEventListener('pointermove', (e) => {
  const p = wmPoint(e); const { W, H } = wmSize();
  if (wmDrag) { worldMap.pan(p.x - wmDrag.x, p.y - wmDrag.y, W, H); wmDrag.moved += Math.abs(p.x - wmDrag.x) + Math.abs(p.y - wmDrag.y); wmDrag.x = p.x; wmDrag.y = p.y; }
  const s = worldMap.spotAt(p.x, p.y, W, H);
  worldMap.hover = s && s.fly && worldMap.canFlyTo(s.id) ? s.id : null;
  wmc.style.cursor = wmDrag?.moved > 4 ? 'grabbing' : worldMap.hover ? 'pointer' : 'grab';
  $('wmFoot').textContent = worldMap.hover ? `Klicken: nach ${MAPS[worldMap.hover].name} fliegen` : 'Mausrad oder +/−: Zoom · Ziehen: verschieben · M oder Esc: schließen';
});
wmc.addEventListener('pointerup', (e) => {
  const d = wmDrag; wmDrag = null;
  if (!d || d.moved > 4) return;
  const p = wmPoint(e); const { W, H } = wmSize();
  const s = worldMap.spotAt(p.x, p.y, W, H);
  if (s && s.fly && worldMap.canFlyTo(s.id)) { audio.sfx('throw'); toggleMap(false); net.send({ t: 'fly', to: s.id }); }
});
const wmZoom = (f) => { const { W, H } = wmSize(); worldMap.zoomAt(f, W / 2, H / 2, W, H); };
$('wmIn').onclick = () => wmZoom(1.4);
$('wmOut').onclick = () => wmZoom(1 / 1.4);
$('wmHome').onclick = () => { const { W, H } = wmSize(); worldMap.resetView(W, H); };
$('wmClose').onclick = () => toggleMap(false);
addEventListener('keydown', (e) => {
  if (!mapOpen) return;
  if (e.key === '+' || e.key === '=') wmZoom(1.4);
  if (e.key === '-') wmZoom(1 / 1.4);
});
$('musicVol').value = Math.round(audio.prefs.music * 100);
$('sfxVol').value = Math.round(audio.prefs.sfx * 100);
$('musicVol').oninput = (e) => audio.setVolume('music', e.target.value / 100);
$('sfxVol').oninput = (e) => { audio.setVolume('sfx', e.target.value / 100); };
$('sfxVol').onchange = () => audio.sfx('select');
$('emoteBar').innerHTML = EMOTES.map((k, i) => `<button data-e="${i}" title="Taste ${i + 1}">${k}</button>`).join('');
$('emoteBar').querySelectorAll('button').forEach((b) => { b.onclick = () => { if (world.me) net.send({ t: 'emote', kind: EMOTES[Number(b.dataset.e)] }); }; });

// Seitenleiste: Verlauf und Einstellungen sind einklappbar, Musik und Effekte getrennt schaltbar
const ui = (() => { try { return { log: false, settings: false, ...JSON.parse(localStorage.getItem('platin.ui') || '{}') }; } catch { return { log: false, settings: false }; } })();
function saveUi() { try { localStorage.setItem('platin.ui', JSON.stringify(ui)); } catch { /* privat */ } }
function renderToggles() {
  $('log').classList.toggle('hidden', !ui.log);
  $('setPanel').classList.toggle('hidden', !ui.settings);
  $('logBtn').classList.toggle('on', ui.log);
  $('setBtn').classList.toggle('on', ui.settings);
  $('musicBtn').classList.toggle('on', audio.prefs.musicOn);
  $('sfxBtn').classList.toggle('on', audio.prefs.sfxOn);
  if (ui.log) { $('logBadge').classList.add('hidden'); unread = 0; $('log').scrollTop = $('log').scrollHeight; }
}
let unread = 0;
hud.onChat = () => { if (!ui.log) { unread++; $('logBadge').textContent = unread; $('logBadge').classList.remove('hidden'); } };
$('logBtn').onclick = () => { ui.log = !ui.log; saveUi(); renderToggles(); };
$('setBtn').onclick = () => { ui.settings = !ui.settings; saveUi(); renderToggles(); };
$('musicBtn').onclick = () => toggleMute();
$('sfxBtn').onclick = () => { audio.toggle('sfx'); renderToggles(); audio.sfx('select'); };
function toggleMute() { audio.toggle('music'); renderToggles(); }
renderToggles();

// ------------------------------------------------------------------ Weltkarte und Minikarte
function toggleMap(open = !mapOpen) {
  if (open === mapOpen) return;
  mapOpen = open;
  $('worldmap').classList.toggle('hidden', !open);
  audio.sfx(open ? 'map' : 'back');
  updateLock();
  if (open) {
    const list = worldMap.roster.length ? worldMap.roster : [world.me];
    worldMap.view = null; // beim Oeffnen auf die eigene Position zentrieren
    $('wmList').innerHTML = list.map((p) => `<span><i style="background:${p.color || '#e53935'}"></i>${escHtml(p.name)}${p.id === world.me.id ? ' (du)' : ''}: ${escHtml(placeName(p.map))}</span>`).join('');
    requestAnimationFrame(drawWorldMap);
  }
}
// Nur fuer automatische Tests (?test): Bildschirmposition eines Ortes auf der Weltkarte
if (location.search.includes('test')) window.__wmTarget = (id) => { const r = wmc.getBoundingClientRect(); const s = worldMap.screenOf(id, r.width, r.height); return s && { x: r.left + s.x, y: r.top + s.y }; };
function drawWorldMap(now) {
  if (!mapOpen) return;
  const c = $('wmCanvas');
  // Canvas in echter Bildschirmaufloesung, damit Schrift scharf bleibt
  const r = c.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
  if (c.width !== Math.round(r.width * dpr) || c.height !== Math.round(r.height * dpr)) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  worldMap.draw(g, r.width, r.height, now);
  const tod = timeOfDay(); const w = weatherFor(areaOf(world.me.map));
  $('wmInfo').textContent = `${placeName(world.me.map)} · ${TIME_NAMES[tod]}${w !== 'clear' ? ' · ' + { rain: 'Regen', fog: 'Nebel', leaves: 'Windig', ash: 'Kohlenstaub' }[w] : ''}`;
  requestAnimationFrame(drawWorldMap);
}
let miniAt = 0;
function drawMinimap(force) {
  const now = performance.now();
  if (!world.me || (!force && now - miniAt < 200)) return;
  miniAt = now;
  const c = $('minimap');
  worldMap.me = world.me;
  worldMap.draw(c.getContext('2d'), c.width, c.height, now, { zoom: 3 });
  $('miniLabel').textContent = placeName(world.me.map);
}
function escHtml(s) { return String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
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
  drawMinimap(false);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
