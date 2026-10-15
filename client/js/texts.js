// Pokedex-Daten (shared/data/dex/gen4.json) und Texte fuer Pokedex, Attacken, Faehigkeiten und
// Gegenstaende. Original-Texte kommen aus `npm run texts` (shared/data/generated/texts.json, nicht im
// Repo). Fehlen sie, werden Attacken- und Gegenstandsbeschreibungen aus den Werten erzeugt.
import { ITEMS } from '/shared/data/items.js';

export let DEX = null;
let TEXTS = { dex: {}, moves: {}, abilities: {}, items: {} };

export async function loadTexts() {
  const [dex, texts] = await Promise.all([
    fetch('/shared/data/dex/gen4.json').then((r) => r.json()).catch(() => null),
    fetch('/shared/data/generated/texts.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
  ]);
  DEX = dex || { pokemon: {}, moves: {}, machines: {}, abilities: {} };
  if (texts) TEXTS = { ...TEXTS, ...texts };
  // Entwicklungsstufe fuer die eigene Pixelgrafik
  const pre = new Map();
  for (const sp of Object.values(DEX.pokemon)) for (const e of sp.evos || []) pre.set(Number(e.to), sp.id);
  for (const sp of Object.values(DEX.pokemon)) { let st = 1; let cur = sp.id; while (pre.has(cur) && st < 3) { cur = pre.get(cur); st++; } sp.stage = st; }
  return DEX;
}

export const hasOriginalTexts = () => Object.keys(TEXTS.dex).length > 0;
export const speciesOf = (id) => DEX?.pokemon[id] || null;
export const moveOf = (id) => DEX?.moves[id] || null;
export const dexText = (id) => TEXTS.dex[id] || null;
export const abilityName = (id) => DEX?.abilities?.[id] || id;
export const abilityText = (id) => TEXTS.abilities[id] || 'Über diese Fähigkeit ist noch nichts bekannt.';
// Zum Anzeigen im Pokedex und im Statusbildschirm: Sprite-Daten fuer monsterDataUrl
export const spriteMon = (id, shiny = false) => { const sp = speciesOf(id); return sp ? { speciesId: sp.id, types: sp.types, family: sp.family, stage: sp.stage, shiny } : { speciesId: id }; };

const STATUS = { par: 'paralysieren', slp: 'in Schlaf versetzen', psn: 'vergiften', tox: 'schwer vergiften', brn: 'verbrennen', frz: 'einfrieren' };
const STAT = { atk: 'Angriff', def: 'Verteidigung', spa: 'Spezial-Angriff', spd: 'Spezial-Verteidigung', spe: 'Initiative', acc: 'Genauigkeit', eva: 'Fluchtwert' };

export function moveText(id) {
  if (TEXTS.moves[id]) return TEXTS.moves[id];
  const m = moveOf(id);
  if (!m) return '';
  const e = m.effect || {};
  const parts = [];
  if (m.cat !== 'status') parts.push(m.cat === 'physical' ? 'Ein körperlicher Angriff.' : 'Ein Spezial-Angriff.');
  const chance = e.chance && e.chance < 100 ? 'eventuell ' : '';
  switch (e.kind) {
    case 'status': parts.push(`Kann das Ziel ${chance}${STATUS[e.status] || 'schwächen'}.`); break;
    case 'confuse': parts.push(`Das Ziel wird ${chance}verwirrt.`); break;
    case 'stat': {
      const list = Object.entries(e.stats || {}).map(([k, v]) => `${STAT[k] || k} ${v > 0 ? (v > 1 ? 'steigt stark' : 'steigt') : v < -1 ? 'sinkt stark' : 'sinkt'}`);
      parts.push(`${e.target === 'self' ? 'Beim Anwender' : 'Beim Ziel'}: ${chance}${list.join(', ')}.`);
      break;
    }
    case 'drain': parts.push('Die Hälfte des Schadens wird dem Anwender als KP gutgeschrieben.'); break;
    case 'recoil': parts.push('Der Anwender erleidet dabei Rückstoßschaden.'); break;
    case 'heal': parts.push('Der Anwender stellt KP wieder her.'); break;
    case 'flinch': parts.push('Das Ziel schreckt eventuell zurück.'); break;
    case 'multihit': parts.push(`Trifft ${e.min}- bis ${e.max}-mal hintereinander.`); break;
    case 'fixed': parts.push(e.damage === 'level' ? 'Richtet Schaden in Höhe des Levels an.' : `Richtet immer ${e.damage} KP Schaden an.`); break;
    case 'trap': parts.push('Das Ziel wird für einige Runden festgehalten.'); break;
    case 'leechSeed': parts.push('Saugt dem Ziel jede Runde KP ab.'); break;
    case 'escape': parts.push('Ermöglicht die Flucht aus dem Kampf.'); break;
    case 'swagger': parts.push('Verwirrt das Ziel und erhöht dessen Angriff.'); break;
    default: break;
  }
  if (e.flinch && e.kind !== 'flinch') parts.push('Das Ziel schreckt eventuell zurück.');
  if (m.highCrit) parts.push('Hohe Volltrefferquote.');
  if (m.prio > 0) parts.push('Erstschlag-Attacke.');
  if (m.prio < 0) parts.push('Der Anwender greift als Letzter an.');
  if (!parts.length) parts.push('Eine besondere Attacke mit eigener Wirkung.');
  return parts.join(' ');
}

const POCKET_TEXT = {
  ball: 'Ein Ball, mit dem man wilde Pokémon fangen kann.',
  med: 'Ein Heilmittel für Pokémon.',
  tm: 'Bringt einem Pokémon eine Attacke bei.',
  key: 'Ein wichtiger Gegenstand.',
  item: 'Ein nützlicher Gegenstand.'
};
export function itemText(id) {
  const it = ITEMS[id];
  if (it?.kind === 'tm') return moveText(it.move || DEX?.machines?.[id]);
  if (TEXTS.items[id]) return TEXTS.items[id];
  if (it?.heal && it.heal < 999) return `Füllt die KP eines Pokémon um ${it.heal} Punkte auf.`;
  if (it?.heal) return 'Füllt die KP eines Pokémon vollständig auf.';
  if (it?.cure) return 'Heilt ein Pokémon von Statusproblemen.';
  return it?.desc || POCKET_TEXT[it?.kind] || '';
}

// Groesse und Gewicht im deutschen Format: 0,4 m und 5,2 kg
export const fmtHeight = (dm) => `${(dm / 10).toFixed(1).replace('.', ',')} m`;
export const fmtWeight = (hg) => `${(hg / 10).toFixed(1).replace('.', ',')} kg`;
