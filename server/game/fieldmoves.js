// Feldattacken wie in Platin: vor dem Baum, Felsbrocken, Felsblock oder Wasser die Aktionstaste,
// Frage, dann blendet das Pokémon ein (Client) und das Hindernis verschwindet. Freigeräumte Felder
// gelten pro Spieler, bis er durch eine Tür oder Höhle geht (Bäume wachsen wie im Original nach).
import { MAPS } from '../../shared/data/maps.js';
import { MOVES } from '../../shared/data/moves.js';
import { DIRS, tileAt, FIELD, FIELD_NAMES, FIELD_MOVES, fieldFlags, isStandable } from '../../shared/world.js';
import { S2C } from '../../shared/protocol.js';
import { displayName } from './pokemonFactory.js';

const ASK = {
  Z: ['Dieser Baum sieht aus, als könnte man ihn fällen.', 'Möchtest du Zerschneider einsetzen?'],
  Q: ['Dieser Felsbrocken sieht aus, als könnte man ihn zertrümmern.', 'Möchtest du Zertrümmerer einsetzen?'],
  M: ['Ein großer Felsblock. Ein Pokémon könnte ihn vielleicht wegschieben.', 'Möchtest du Stärke einsetzen?'],
  '~': ['Das Wasser ist tiefblau.', 'Möchtest du Surfer einsetzen?']
};
const fast = () => !!process.env.SCENE_FAST;
// Dauer der Einblendung im Client (Pokémon zieht durchs Bild, danach die Wirkung)
export const FIELD_ANIM_MS = 1700;

export const FieldMoves = {
  moveFlags(s) {
    const f = fieldFlags(s.player.flags, s.party);
    f._cleared = (s.cleared ||= new Set());
    return f;
  },
  clearField(s) { if (s.cleared?.size) this.send(s.ws, { t: S2C.FIELD_MOVE, reset: true }); s.cleared = new Set(); },

  // Pokémon im Team, das die Feldattacke beherrscht
  fieldUser(s, flag) {
    const move = FIELD_MOVES[flag];
    return s.party.find((m) => !m.egg && m.alive !== false && (m.moves || []).some((x) => x.id === move)) || null;
  },

  // Aktionstaste vor einem Hindernis. Liefert true, wenn etwas passiert.
  fieldInteract(s, x, y) {
    const p = s.player; const map = MAPS[p.map];
    const t = tileAt(map, x, y);
    const flag = FIELD[t];
    if (!ASK[t] || !flag) return false;
    const key = `${p.map}:${x},${y}`;
    if (s.cleared?.has(key)) return false;
    if (t === '~' && tileAt(map, p.x, p.y) === '~') return false;
    const [look, ask] = ASK[t];
    const mon = p.flags[flag] && this.fieldUser(s, flag);
    if (!mon) {
      // Ohne Orden oder Pokémon: nur die Beschreibung (Wasser sagt im Original nichts)
      if (t === '~') return false;
      return this.story.start(s, [[null, look]]);
    }
    if (t === '~') {
      const d = DIRS[p.dir];
      if (!isStandable(MAPS, p.map, x, y, this.moveFlags(s)) && tileAt(map, x, y) !== '~') return false;
      if (x !== p.x + d.dx || y !== p.y + d.dy) return false;
    }
    return this.story.start(s, [[null, `${look} ${ask}`], { ask: ['Ja', 'Nein'], yes: [{ fieldMove: flag, x, y }] }]);
  },

  // Skriptschritt: Attacke einsetzen (Text, Einblendung, Hindernis weg)
  fieldStep(s, step, sc, lines) {
    const p = s.player;
    const mon = this.fieldUser(s, step.fieldMove);
    if (!mon) return;
    const move = FIELD_MOVES[step.fieldMove];
    lines.push({ speaker: null, text: `${displayName(mon)} setzt ${MOVES[move]?.name || FIELD_NAMES[step.fieldMove]} ein!` });
    if (step.fieldMove !== 'hm_surf') (s.cleared ||= new Set()).add(`${p.map}:${step.x},${step.y}`);
    // Erst der Text, dann die Einblendung (Skriptschritt fieldFx), beim Surfen danach der Sprung aufs Wasser
    const after = [{ fieldFx: { move, speciesId: mon.speciesId, shiny: !!mon.shiny, name: displayName(mon), map: p.map, x: step.x, y: step.y } }, { wait: FIELD_ANIM_MS }];
    if (step.fieldMove === 'hm_surf') after.push({ me: p.dir[0], water: true, jump: true });
    sc.stack.push({ steps: after, i: 0 });
  },
  fieldFx(s, fx) {
    const p = s.player;
    this.send(s.ws, { t: S2C.FIELD_MOVE, ...fx, dir: p.dir });
    this.broadcastMap(p.map, { t: S2C.FIELD_MOVE, move: fx.move, other: p.id, map: fx.map, x: fx.x, y: fx.y }, p.id);
  },

  // Fliegen: erst die Einblendung, dann der Flug
  flyTo(s, map, x, y) {
    const mon = this.fieldUser(s, 'hm_fly');
    const p = s.player;
    if (mon) this.send(s.ws, { t: S2C.FIELD_MOVE, move: 'fly', speciesId: mon.speciesId, shiny: !!mon.shiny, name: displayName(mon), map: p.map, x: p.x, y: p.y, dir: p.dir });
    s.flying = true;
    const go = () => { s.flying = false; if (this.sessions.get(p.id) === s) { this.clearField(s); this.teleport(s, map, x, y); } };
    if (!mon || fast()) go(); else setTimeout(go, FIELD_ANIM_MS + 200);
  }
};
