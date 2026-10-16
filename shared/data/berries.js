// Beerenpflanzen wie in Platin (pret/pokeplatinum: src/berry_patches.c, include/data/berry_init.h,
// res/field/scripts/scripts_berry_tree_interaction.s). Jeder Spieler hat eigene Beerenbeete: die
// weichen Boeden liegen an den Stellen der Original-Ereignisse (OBJ_EVENT_GFX_BERRY_SOIL, data[0] =
// Nummer des Beets). Zu Beginn traegt jedes Beet die Beere aus der Startliste, die Zeit laeuft in
// echten Minuten wie die Uhr des DS.
//
// Zustand eines Beets: [beere, stufe, minuten, feuchteMinuten, ernten, ertrag, feuchte, ertragswert, mulch, waechst]

// Beeren in Platin-Reihenfolge (Itemnummer 149 bis 212): Kennung, deutscher Name,
// Dauer einer Wachstumsstufe in Stunden, Austrocknung pro Stunde, Grundertrag
export const BERRIES = [
  ['cheri', 'Amrenabeere', 3, 15, 1], ['chesto', 'Maronbeere', 3, 15, 1], ['pecha', 'Pirsifbeere', 3, 15, 1], ['rawst', 'Fragiabeere', 3, 15, 1],
  ['aspear', 'Wilbirbeere', 3, 15, 1], ['leppa', 'Jonagobeere', 4, 15, 1], ['oran', 'Sinelbeere', 4, 15, 1], ['persim', 'Persimbeere', 4, 15, 1],
  ['lum', 'Prunusbeere', 12, 8, 1], ['sitrus', 'Tsitrubeere', 8, 7, 1], ['figy', 'Giefebeere', 5, 10, 1], ['wiki', 'Wikibeere', 5, 10, 1],
  ['mago', 'Magobeere', 5, 10, 1], ['aguav', 'Gauvebeere', 5, 10, 1], ['iapapa', 'Yapabeere', 5, 10, 1], ['razz', 'Himmihbeere', 2, 35, 2],
  ['bluk', 'Morbbeere', 2, 35, 2], ['nanab', 'Nanabbeere', 2, 35, 2], ['wepear', 'Nirbebeere', 2, 35, 2], ['pinap', 'Sananabeere', 2, 35, 2],
  ['pomeg', 'Granabeere', 8, 8, 1], ['kelpsy', 'Setangbeere', 8, 8, 1], ['qualot', 'Qualotbeere', 8, 8, 1], ['hondew', 'Honmelbeere', 8, 8, 1],
  ['grepa', 'Labrusbeere', 8, 8, 1], ['tamato', 'Tamotbeere', 8, 8, 1], ['cornn', 'Saimbeere', 6, 10, 2], ['magost', 'Magostbeere', 6, 10, 2],
  ['rabuta', 'Rabutabeere', 6, 10, 2], ['nomel', 'Tronzibeere', 6, 10, 2], ['spelon', 'Kiwanbeere', 15, 8, 3], ['pamtre', 'Pallmbeere', 15, 8, 3],
  ['watmel', 'Wasmelbeere', 15, 8, 3], ['durin', 'Durinbeere', 15, 8, 3], ['belue', 'Myrtilbeere', 15, 8, 3], ['occa', 'Koakobeere', 18, 6, 1],
  ['passho', 'Foepasbeere', 18, 6, 1], ['wacan', 'Kerzalbeere', 18, 6, 1], ['rindo', 'Grindobeere', 18, 6, 1], ['yache', 'Kiroyabeere', 18, 6, 1],
  ['chople', 'Rospelbeere', 18, 6, 1], ['kebia', 'Grarzbeere', 18, 6, 1], ['shuca', 'Schukebeere', 18, 6, 1], ['coba', 'Kobabeere', 18, 6, 1],
  ['payapa', 'Pyapabeere', 18, 6, 1], ['tanga', 'Tanigabeere', 18, 6, 1], ['charti', 'Chiaribeere', 18, 6, 1], ['kasib', 'Zitarzbeere', 18, 6, 1],
  ['haban', 'Terirobeere', 18, 6, 1], ['colbur', 'Burleobeere', 18, 6, 1], ['babiri', 'Babiribeere', 18, 6, 1], ['chilan', 'Latchibeere', 18, 6, 1],
  ['liechi', 'Lydzibeere', 24, 4, 1], ['ganlon', 'Linganbeere', 24, 4, 1], ['salac', 'Salkabeere', 24, 4, 1], ['petaya', 'Tahaybeere', 24, 4, 1],
  ['apicot', 'Apikobeere', 24, 4, 1], ['lansat', 'Lansatbeere', 24, 4, 1], ['starf', 'Krambobeere', 24, 4, 1], ['enigma', 'Enigmabeere', 24, 7, 1],
  ['micle', 'Wunfrubeere', 24, 7, 1], ['custap', 'Eipfelbeere', 24, 7, 1], ['jaboca', 'Jabocabeere', 24, 7, 1], ['rowap', 'Roselbeere', 24, 7, 1]
];
export const berryItem = (b) => (BERRIES[b - 1] ? BERRIES[b - 1][0] + '-berry' : null);
export const berryOfItem = (item) => BERRIES.findIndex(([k]) => k + '-berry' === item) + 1;

// Mulch (Itemnummer 95 bis 98) und die Enton-Kanne
export const MULCHES = ['growth-mulch', 'damp-mulch', 'stable-mulch', 'gooey-mulch'];
export const SPRAYDUCK = 'sprayduck';
export const MULCH_STOCK = [...MULCHES];

// Gegenstaende fuer den Beutel (items.js uebernimmt fehlende Eintraege)
export const BERRY_ITEMS = {
  ...Object.fromEntries(BERRIES.map(([k, name]) => [k + '-berry', { name, price: 20, kind: 'berry', hold: true, held: {}, buy: false }])),
  'growth-mulch': { name: 'Wachsmulch', price: 200, kind: 'item', mulch: 1 },
  'damp-mulch': { name: 'Feuchtmulch', price: 200, kind: 'item', mulch: 2 },
  'stable-mulch': { name: 'Stabilmulch', price: 200, kind: 'item', mulch: 3 },
  'gooey-mulch': { name: 'Neumulch', price: 200, kind: 'item', mulch: 4 },
  sprayduck: { name: 'Enton-Kanne', price: 0, kind: 'key', sell: false, sprayduck: true }
};
export const BERRY_ITEM_NUM = {
  ...Object.fromEntries(BERRIES.map(([k], i) => [k + '-berry', 149 + i])),
  'growth-mulch': 95, 'damp-mulch': 96, 'stable-mulch': 97, 'gooey-mulch': 98, sprayduck: 448
};

// Startbeeren je Beet (sBerryInitTable): Beere und Anzahl
const INIT = 'oran 1,cheri 1,chesto 1,pecha 1,oran 1,pecha 1,razz 2,bluk 2,cheri 1,oran 2,sitrus 1,wepear 2,wepear 2,kelpsy 1,cheri 1,pecha 1,'
  + 'oran 1,oran 1,rawst 1,rawst 1,razz 1,razz 1,cheri 1,oran 1,oran 1,bluk 1,nanab 2,razz 2,bluk 2,pinap 2,leppa 1,chesto 1,razz 1,razz 1,'
  + 'persim 1,nanab 1,nanab 1,figy 1,aspear 1,aspear 1,razz 1,pinap 1,sitrus 1,chesto 1,wiki 1,aguav 1,pecha 1,aspear 1,iapapa 1,grepa 1,'
  + 'sitrus 1,aspear 1,tamato 1,lum 1,pecha 1,pinap 1,pinap 1,pinap 1,persim 1,persim 1,nanab 1,nanab 1,aguav 1,iapapa 1,rawst 1,rawst 1,'
  + 'cheri 1,sitrus 1,chesto 1,pomeg 1,pecha 2,bluk 2,wiki 1,mago 1,rawst 1,persim 1,figy 1,pinap 2,leppa 1,pecha 1,mago 1,hondew 1,wiki 2,'
  + 'mago 2,aguav 2,qualot 1,sitrus 2,bluk 3,nanab 3,wepear 3,pomeg 1,pomeg 1,hondew 2,hondew 2,kelpsy 1,kelpsy 1,tamato 1,tamato 1,qualot 1,'
  + 'qualot 1,pomeg 1,pomeg 1,hondew 1,hondew 1,tamato 1,tamato 1,grepa 1,grepa 1,qualot 1,qualot 1,lum 1,leppa 1,qualot 2,grepa 2,kelpsy 2,'
  + 'kelpsy 2,grepa 1,grepa 1';
export const BERRY_INIT = INIT.split(',').map((e) => { const [k, n] = e.split(' '); return [BERRIES.findIndex(([id]) => id === k) + 1, Number(n)]; });

// Wachstumsstufen (generated/berry_growth_stages.h)
export const STAGE = { NONE: 0, PLANTED: 1, SPROUTED: 2, GROWING: 3, BLOOMING: 4, FRUIT: 5 };
const B = 0, ST = 1, MIN = 2, MM = 3, REP = 4, Y = 5, MOIST = 6, YR = 7, MULCH = 8, G = 9;
export const PATCH = { B, ST, MIN, MM, REP, Y, MOIST, YR, MULCH, G };
const MAX_MOISTURE = 100, MAX_YIELD_RATING = 5, HARVEST_STAGES = 4, MAX_REPLANT = 10;
const empty = () => [0, STAGE.NONE, 0, 0, 0, 0, 0, 0, 0, 0];

function stageMinutes(b, mulch) {
  const m = BERRIES[b - 1][2] * 60;
  return mulch === 1 ? Math.floor(m * 3 / 4) : mulch === 2 ? m + Math.floor(m / 2) : m;
}
function drainRate(b, mulch) {
  const d = BERRIES[b - 1][3];
  return mulch === 2 ? Math.floor(d / 2) : mulch === 1 ? d + Math.floor(d / 2) : d;
}
const harvestStages = (p) => (p[MULCH] === 3 ? HARVEST_STAGES + HARVEST_STAGES / 2 : HARVEST_STAGES);
const maxReplant = (p) => (p[MULCH] === 4 ? MAX_REPLANT + MAX_REPLANT / 2 : MAX_REPLANT);
const totalStages = (p) => 1 + (3 + harvestStages(p)) * maxReplant(p);
function zero(p) { p.splice(0, p.length, ...empty()); }

// Neuer Spielstand: jedes Beet traegt reife Beeren, die Zeit laeuft erst, wenn der Spieler das Beet gesehen hat
export function initPatches(now = Date.now()) {
  return {
    t: now,
    p: BERRY_INIT.map(([b, n]) => [b, STAGE.FRUIT, stageMinutes(b, 0) * 4, 0, 0, n, MAX_MOISTURE, 3, 0, 0])
  };
}

function advance(p) {
  switch (p[ST]) {
    case STAGE.PLANTED: case STAGE.SPROUTED: case STAGE.GROWING: p[ST]++; break;
    case STAGE.BLOOMING:
      p[Y] = Math.max(2, BERRIES[p[B] - 1][4] * p[YR]);
      p[ST]++;
      break;
    case STAGE.FRUIT:
      // Nicht gepflueckt: die Beeren fallen ab und die Pflanze treibt neu aus
      p[Y] = 0; p[ST] = STAGE.SPROUTED; p[YR] = MAX_YIELD_RATING; p[REP]++;
      if (p[REP] === maxReplant(p)) zero(p);
      break;
  }
}

function drain(p, minutes) {
  if (p[ST] === STAGE.FRUIT) return;
  const rate = drainRate(p[B], p[MULCH]);
  minutes += p[MM];
  let hours = Math.floor(minutes / 60);
  p[MM] = minutes % 60;
  if (!hours) return;
  if (p[MOIST] >= rate * hours) { p[MOIST] -= rate * hours; return; }
  if (p[MOIST] > 0) { hours -= Math.ceil(p[MOIST] / rate); p[MOIST] = 0; }
  // Trockener Boden kostet pro Stunde einen Punkt Ertrag
  p[YR] = p[YR] > hours ? p[YR] - hours : 0;
}

// BerryPatches_ElapseMinutes
export function elapseMinutes(state, minutes) {
  if (minutes <= 0) return;
  for (const p of state.p) {
    if (!p[B] || p[ST] === STAGE.NONE || !p[G]) continue;
    if (minutes >= stageMinutes(p[B], p[MULCH]) * totalStages(p)) { zero(p); continue; }
    let left = minutes;
    while (p[ST] !== STAGE.NONE && left) {
      if (p[MIN] > left) { drain(p, left); p[MIN] -= left; break; }
      drain(p, p[MIN]);
      advance(p);
      left -= p[MIN];
      if (p[ST] === STAGE.NONE) break;
      p[MIN] = stageMinutes(p[B], p[MULCH]);
      if (p[ST] === STAGE.FRUIT) p[MIN] *= harvestStages(p);
    }
  }
}

// Echte Zeit seit dem letzten Stand verrechnen (ganze Minuten, der Rest bleibt fuer das naechste Mal)
export function catchUp(state, now = Date.now()) {
  const minutes = Math.floor((now - state.t) / 60000);
  if (minutes <= 0) { if (now < state.t) state.t = now; return false; }
  elapseMinutes(state, minutes);
  state.t += minutes * 60000;
  return true;
}

export function plant(state, id, b) {
  const p = state.p[id];
  Object.assign(p, { [B]: b, [ST]: STAGE.PLANTED, [MIN]: stageMinutes(b, p[MULCH]), [MM]: 0, [REP]: 0, [Y]: 0, [MOIST]: MAX_MOISTURE, [YR]: MAX_YIELD_RATING, [G]: 1 });
}
export function water(state, id) { state.p[id][MOIST] = MAX_MOISTURE; }
export function setMulch(state, id, m) { state.p[id][MULCH] = m; }
// Ernte: Beeren und Anzahl, das Beet ist danach wieder leer (auch der Mulch ist aufgebraucht)
export function harvest(state, id) {
  const p = state.p[id];
  const out = { b: p[B], n: p[Y] };
  zero(p);
  return out;
}
// Feuchte wie BerryPatches_GetPatchMoisture: 0 sehr trocken, 1 trocken, 2 feucht
export const moistureOf = (p) => (p[MOIST] === 0 ? 0 : p[MOIST] <= 50 ? 1 : 2);
// Was der Client zum Zeichnen braucht: [beere, stufe, feuchte, mulch]
export const viewOf = (state) => state.p.map((p) => [p[B], p[ST], moistureOf(p), p[MULCH]]);

// ------------------------------------------------------------------ Lage der Beete auf den Originalkarten
let soilCache = null;
export function soilIndex(MAPS) {
  if (soilCache && soilCache.maps === MAPS) return soilCache;
  const byId = []; const at = new Map(); const byMap = {};
  for (const [mapId, m] of Object.entries(MAPS)) {
    for (const o of m.orig?.objects || []) {
      if (o.g !== 'BERRY_SOIL') continue;
      const id = o.range || 0;
      if (id >= BERRY_INIT.length || byId[id]) continue;
      byId[id] = { id, map: mapId, x: o.x, y: o.y };
      at.set(`${mapId},${o.x},${o.y}`, id);
      (byMap[mapId] ||= []).push(byId[id]);
    }
  }
  soilCache = { maps: MAPS, byId, byMap, at: (mapId, x, y) => at.get(`${mapId},${x},${y}`) ?? null };
  return soilCache;
}

// Weicher Boden ist ein Feldobjekt und blockiert wie im Original (fast alle Felder sind schon fest)
// Dazu der Spezialitaetenverkaeufer im Markt von Flori mit Mulch.
export function placeBerrySoil(MAPS) {
  for (const s of soilIndex(MAPS).byId) {
    if (!s) continue;
    const m = MAPS[s.map]; const r = m.tiles[s.y];
    if (r[s.x] !== '#') m.tiles[s.y] = r.slice(0, s.x) + '#' + r.slice(s.x + 1);
  }
  const mart = MAPS.floaroma_mart;
  if (mart && !mart.events.some((e) => e.stock === 'mulch')) mart.events.push({ x: 1, y: 2, type: 'shop', stock: 'mulch', text: 'Willkommen! Was darf es sein?' });
}

// Figuren im Blumenladen von Flori wie in Platin: Beere am Tag (Zuechterin) und Enton-Kanne (Göre)
export function applyBerryStory({ SCRIPTS, NPCS }) {
  SCRIPTS.flowerShop = [{ berry: 'shopGift' }];
  SCRIPTS.flowerShopSprayduck = [
    { if: 'got_sprayduck', then: [['Göre', 'Gieß mit der Enton-Kanne den Boden, in den du Beeren gepflanzt hast. Auch wachsende Beerenpflanzen solltest du gießen.']],
      else: [['Göre', 'Bitte gieß Beeren mit dieser Gießkanne, der Enton-Kanne!'], { give: SPRAYDUCK }, { flag: 'got_sprayduck' }] }
  ];
  const shop = (NPCS.floaroma_flowershop ||= []);
  const lady = shop.find((n) => n.id === 'flower_lady');
  if (lady) Object.assign(lady, { name: 'Pokémon-Züchterin' });
  if (!shop.some((n) => n.id === 'flower_lass')) shop.push({ id: 'flower_lass', x: 2, y: 3, dir: 'down', look: 'lass', name: 'Göre', talk: 'flowerShopSprayduck' });
  const mart = (NPCS.floaroma_mart ||= []);
  if (!mart.some((n) => n.id === 'floaroma_mart_mulch')) mart.push({ id: 'floaroma_mart_mulch', x: 0, y: 2, dir: 'right', look: 'clerk', name: 'Verkäufer' });
}

// ------------------------------------------------------------------ Texte (Platin, berry_trees.json)
const nameOf = (b) => BERRIES[b - 1]?.[1] || 'Beere';
const plural = (b) => nameOf(b) + 'n';
export const BERRY_TEXT = {
  soil: 'Hier ist weicher, fruchtbarer Boden.',
  mulchLaid: (m) => `Hier wurde ${m} ausgelegt.`,
  menu: ['Düngen', 'Beere pflanzen', 'Zurück'],
  askMulch: 'Möchtest du den Boden düngen?',
  askPlant: 'Möchtest du eine Beere pflanzen?',
  mulchScattered: (m) => `${m} wurde auf dem Boden verteilt.`,
  planted: (b) => `${nameOf(b)} wurde in den weichen, fruchtbaren Boden gepflanzt.`,
  plantedHere: (b) => `Hier wurde eine ${nameOf(b)} gepflanzt.`,
  sprouted: (b) => `Die ${nameOf(b)} ist gekeimt.`,
  growing: (b) => `Die Pflanze der ${nameOf(b)} wird größer.`,
  bloom: (b) => `Die Pflanze der ${nameOf(b)} blüht!`,
  askWater: 'Möchtest du sie gießen?',
  happy: 'So! Jetzt ist sie glücklich!',
  askPick: (b, n) => (n > 1 ? `Hier wachsen ${n} ${plural(b)}! Möchtest du sie pflücken?` : `Hier wächst eine ${nameOf(b)}! Möchtest du sie pflücken?`),
  left: (who, b, n) => (n > 1 ? `${who} ließ die ${plural(b)} hängen.` : `${who} ließ die ${nameOf(b)} hängen.`),
  picked: (b, n) => (n > 1 ? `Du hast ${n} ${plural(b)} gepflückt.` : `Du hast die ${nameOf(b)} gepflückt.`),
  stored: (who, b, n) => `${who} verstaut die ${n > 1 ? plural(b) : nameOf(b)} in der Tasche „Beeren“.`,
  soilBack: 'Der Boden ist wieder weich und fruchtbar.',
  pickBerry: 'Welche Beere möchtest du pflanzen?',
  pickMulch: 'Welchen Mulch möchtest du verteilen?',
  back: 'Zurück',
  shopIntro: ['Pokémon-Züchterin', 'Aus einer einzigen Beere wächst eine Pflanze mit vielen Beeren. Wenn man sie pflanzt, gibt es auf der Welt immer mehr Beeren. Hilf uns doch, überall Beeren zu verbreiten!'],
  shopDone: ['Pokémon-Züchterin', 'Bitte pflanz diese Beere in weichen, fruchtbaren Boden. Wenn du morgen wiederkommst, habe ich eine andere Beere für dich.']
};
