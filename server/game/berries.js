// Beerenpflanzen wie in Platin: weicher Boden an den Originalstellen, pflanzen, gießen, düngen und
// ernten. Ablauf wie res/field/scripts/scripts_berry_tree_interaction.s, Wachstum in shared/data/berries.js.
// Der Zustand gehoert zum Spielstand (player.berry) und wird in GameServer eingemischt.
import { MAPS } from '../../shared/data/maps.js';
import { ITEMS, sortItems } from '../../shared/data/items.js';
import { facingTile } from '../../shared/world.js';
import { Extras } from './extras.js';
import {
  BERRY_INIT, BERRY_TEXT as T, STAGE, PATCH, MULCHES, SPRAYDUCK, initPatches, catchUp, plant, water,
  setMulch, harvest, viewOf, soilIndex, berryItem, berryOfItem
} from '../../shared/data/berries.js';

const YES_NO = ['Ja', 'Nein'];
const has = (p, id) => (p.items[id] || 0) > 0;
const berriesIn = (p) => sortItems(Object.keys(p.items).filter((k) => p.items[k] > 0 && ITEMS[k]?.kind === 'berry' && berryOfItem(k)));
const mulchesIn = (p) => MULCHES.filter((k) => has(p, k));
const onMapChange = Extras.onMapChange;

export const Berries = {
  // Stand aller Beete dieses Spielers, mit der seit dem letzten Mal vergangenen Zeit
  berryState(s) {
    const p = s.player;
    if (!p.berry?.p) p.berry = initPatches();
    while (p.berry.p.length < BERRY_INIT.length) p.berry.p.push([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    catchUp(p.berry);
    return p.berry;
  },

  // Wie BerryPatches_UpdateGrowthStates: Beete im Bild beginnen zu wachsen (auch die Startbeeren)
  berrySeen(s) {
    const list = soilIndex(MAPS).byMap[s.player.map];
    if (!list) return;
    const st = this.berryState(s);
    for (const { id } of list) { const q = st.p[id]; if (q[PATCH.B] && q[PATCH.ST] !== STAGE.NONE) q[PATCH.G] = 1; }
  },

  // Client bekommt fuer jedes Beet [beere, stufe, feuchte, mulch], nur wenn sich etwas geaendert hat
  sendBerries(s, force = false) {
    if (!this.berryTimer) {
      this.berryTimer = setInterval(() => { for (const x of this.sessions.values()) this.sendBerries(x); }, 30000);
      this.berryTimer.unref?.();
    }
    const view = viewOf(this.berryState(s));
    const key = JSON.stringify(view);
    if (!force && key === s.berryKey) return;
    s.berryKey = key;
    this.send(s.ws, { t: 'berries', patches: view });
  },

  onMapChange(s, oldMap) {
    onMapChange.call(this, s, oldMap);
    this.berrySeen(s);
  },

  // Ansprechen des weichen Bodens vor dem Spieler. Liefert true, wenn dort ein Beet ist.
  berryTalk(s, x, y) {
    const id = soilIndex(MAPS).at(s.player.map, x, y);
    if (id == null) return false;
    this.berrySeen(s);
    const p = s.player; const q = this.berryState(s).p[id];
    const up = p.dir === 'up'; const duck = up && has(p, SPRAYDUCK);
    const b = q[PATCH.B]; const n = q[PATCH.Y];
    const offerWater = [[null, T.askWater], { ask: YES_NO, yes: [{ berry: 'water', id }], no: [] }];
    const offerPlant = [[null, T.askPlant], { ask: YES_NO, yes: [{ berry: 'choosePlant', id }], no: [] }];
    let steps;
    switch (q[PATCH.ST]) {
      case STAGE.PLANTED: steps = [[null, T.plantedHere(b)], ...(duck ? offerWater : [])]; break;
      case STAGE.SPROUTED: steps = [[null, T.sprouted(b)], ...(duck ? offerWater : [])]; break;
      case STAGE.GROWING: steps = [[null, T.growing(b)], ...(duck ? offerWater : [])]; break;
      case STAGE.BLOOMING: steps = [[null, T.bloom(b)], ...(duck ? offerWater : [])]; break;
      case STAGE.FRUIT:
        steps = [[null, T.askPick(b, n)], { ask: YES_NO, yes: [{ berry: 'harvest', id }], no: duck ? offerWater : [[null, T.left(p.name, b, n)]] }];
        break;
      default: {
        const mulch = q[PATCH.MULCH] ? ITEMS[MULCHES[q[PATCH.MULCH] - 1]].name : null;
        const berries = berriesIn(p).length > 0;
        if (mulch) steps = [[null, T.mulchLaid(mulch)], ...(berries ? offerPlant : [])];
        else if (!up) steps = [[null, T.soil]];
        else if (mulchesIn(p).length) {
          steps = berries
            ? [[null, T.soil], { choose: T.menu, branches: [[{ berry: 'chooseMulch', id }], [{ berry: 'choosePlant', id }], []] }]
            : [[null, T.soil], [null, T.askMulch], { ask: YES_NO, yes: [{ berry: 'chooseMulch', id }], no: [] }];
        } else steps = [[null, T.soil], ...(berries ? offerPlant : [])];
      }
    }
    return this.story.start(s, steps);
  },

  // Enton-Kanne, Beere oder Mulch aus dem Beutel vor einem Beet
  berryUseItem(s, item) {
    const p = s.player; const f = facingTile(p.x, p.y, p.dir);
    const id = soilIndex(MAPS).at(p.map, f.x, f.y);
    const q = id != null && this.berryState(s).p[id];
    const it = ITEMS[item];
    const no = () => { this.notice(s, 'Das kann man hier nicht benutzen.', 'dialog'); return true; };
    if (!q) return it.sprayduck || it.mulch || it.kind === 'berry' ? no() : false;
    const empty = q[PATCH.ST] === STAGE.NONE;
    if (it.sprayduck) return empty ? no() : this.story.start(s, [{ berry: 'water', id }]);
    if (it.mulch) return empty && !q[PATCH.MULCH] ? this.story.start(s, [{ berry: 'mulch', id, item }]) : no();
    if (it.kind === 'berry' && berryOfItem(item)) return empty ? this.story.start(s, [{ berry: 'plant', id, item }]) : no();
    return false;
  },

  // Skriptschritte { berry: ... } (story.js)
  berryStep(s, step, sc, lines) {
    const p = s.player; const st = this.berryState(s); const q = st.p[step.id];
    const done = () => { this.savePlayerNow(s); this.sendParty(s); this.sendBerries(s); };
    switch (step.berry) {
      case 'choosePlant': {
        const list = berriesIn(p);
        if (!list.length || q[PATCH.ST] !== STAGE.NONE) return;
        sc.stack.push({ steps: [[null, T.pickBerry], {
          choose: [...list.map((k) => `${ITEMS[k].name} ×${p.items[k]}`), T.back],
          branches: list.map((item) => [{ berry: 'plant', id: step.id, item }])
        }], i: 0 });
        return;
      }
      case 'chooseMulch': {
        const list = mulchesIn(p);
        if (!list.length || q[PATCH.ST] !== STAGE.NONE || q[PATCH.MULCH]) return;
        sc.stack.push({ steps: [[null, T.pickMulch], {
          choose: [...list.map((k) => `${ITEMS[k].name} ×${p.items[k]}`), T.back],
          branches: list.map((item) => [{ berry: 'mulch', id: step.id, item }])
        }], i: 0 });
        return;
      }
      case 'plant': {
        const b = berryOfItem(step.item);
        if (!b || !has(p, step.item) || q[PATCH.ST] !== STAGE.NONE) return;
        p.items[step.item]--;
        plant(st, step.id, b);
        lines.push({ speaker: null, text: T.planted(b) });
        return done();
      }
      case 'mulch': {
        const m = MULCHES.indexOf(step.item) + 1;
        if (!m || !has(p, step.item) || q[PATCH.ST] !== STAGE.NONE || q[PATCH.MULCH]) return;
        p.items[step.item]--;
        setMulch(st, step.id, m);
        done();
        const text = T.mulchScattered(ITEMS[step.item].name);
        if (!berriesIn(p).length) { lines.push({ speaker: null, text }); return; }
        sc.stack.push({ steps: [[null, text], [null, T.askPlant], { ask: YES_NO, yes: [{ berry: 'choosePlant', id: step.id }], no: [] }], i: 0 });
        return;
      }
      case 'water': {
        if (q[PATCH.ST] === STAGE.NONE) return;
        water(st, step.id);
        lines.push({ speaker: null, text: T.happy });
        return done();
      }
      case 'harvest': {
        if (q[PATCH.ST] !== STAGE.FRUIT) return;
        const { b, n } = harvest(st, step.id);
        const item = berryItem(b);
        p.items[item] = (p.items[item] || 0) + n;
        p.berries = (p.berries || 0) + n;
        lines.push({ speaker: null, text: T.picked(b, n) }, { speaker: null, text: T.stored(p.name, b, n) }, { speaker: null, text: T.soilBack });
        return done();
      }
      case 'shopGift': {
        // Pokémon-Züchterin im Blumenladen: einmal am Tag eine von fünf Beeren (Amrena bis Wilbir)
        p.daily ||= {};
        if (p.daily.flowerBerry === this.dayKey(s)) { lines.push({ speaker: T.shopDone[0], text: T.shopDone[1] }); return; }
        p.daily.flowerBerry = this.dayKey(s);
        const item = berryItem(1 + Math.floor(Math.random() * 5));
        p.items[item] = (p.items[item] || 0) + 1;
        lines.push({ speaker: T.shopIntro[0], text: T.shopIntro[1] }, { speaker: null, text: `Du erhältst eine ${ITEMS[item].name}!` });
        this.sendParty(s);
        return;
      }
    }
  }
};

