import { FIX as R1 } from './origfix/r1.js';
import { FIX as R2 } from './origfix/r2.js';
import { FIX as R3 } from './origfix/r3.js';
import { FIX as R4 } from './origfix/r4.js';
import { FIX as R5 } from './origfix/r5.js';

// Feste Positionen der eigenen Story auf den Originalkarten (Vorrang vor der automatischen Umrechnung
// in origLayout.js). Koordinaten in Kacheln der Originalkarte, Vorbild sind die Figuren und Ausloeser
// aus den Platin-Daten (MAPS[id].orig.objects / .coords).
//   karte: {
//     npcId: [x, y, richtung?]            neue Stelle
//     npcId: { x, y, dir, map, show, ... } Felder ersetzen (map: zieht auf eine andere Karte)
//     npcId: null                          gibt es auf den Originalkarten nicht
//     'trigger:skript': { x, y, w, h } | [{...}, ...] | null
//   }
//   _warps: { skript: [karte, x, y, richtung] }   Ziel von { warp } in diesem Skript
//   _retarget: { 'von>nach': [karte, x, y, richtung] | [karte, 'entrance'] }   Warps alter Raeume umleiten
//   _add: { karte: [npc, ...] }, _scripts: { name: [...] }   Figuren und Skripte nur fuer die Originalkarten
//   _triggers: { karte: [{ x, y, w, h, when, script }] }      zusaetzliche Ausloeser (Originalkoordinaten)
//   _maps: { karte: { encounters, fly, name, ... } }        Felder einer Karte setzen
//   _links: [['pass', von, x, y, nach, tx, ty, richtung], ['tile', karte, x, y, zeichen]]  Durchgaenge in eigenen Raeumen
//   _signs: { karte: { 'x,y': text | null } }               Schild- oder Tuertext an dieser Stelle (null entfernt ihn)
// Jede Region hat eine eigene Datei in origfix/, hier werden alle zusammengefuehrt.
const BASE = {
  // Das Nordmeer gibt es in Platin nicht: das Schiff zur Kampfzone legt im Hafen von Blizzach ab
  north_sea: { ferry_snow: { map: 'snowpoint_city', x: 4, y: 55, dir: 'up', show: 'champion' } },
  snowpoint_city: { harbor_guard: [4, 55, 'up'], 'trigger:harborBlock': null },
  fight_area: { ferry_fight: [11, 19, 'left'] },
  // Eldritchs Boot (Hafenhaus Fleetburg) legt an den Stegen der Inseln an, Rueckfahrt beim Matrosen dort
  _retarget: {
    'canalave_dock>iron_island': ['iron_island_outside', 4, 22, 'right'],
    'canalave_dock>fullmoon_island': ['fullmoon_island_outside', 7, 21, 'left'],
    'iron_island>canalave_dock': ['iron_island_outside', 'entrance'],
    'fullmoon_island>canalave_dock': ['fullmoon_island_outside', 'entrance']
  },
  _add: {
    iron_island_outside: [{ id: 'boat_iron', x: 3, y: 22, dir: 'right', look: 'worker', name: 'Matrose', talk: 'boatToCanalave' }],
    fullmoon_island_outside: [{ id: 'boat_fullmoon', x: 8, y: 21, dir: 'left', look: 'worker', name: 'Matrose', talk: 'boatToCanalave' }]
  },
  _scripts: {
    boatToCanalave: [
      ['Matrose', 'Zurück nach Fleetburg?'],
      { ask: ['Ja', 'Nein'], yes: [['Matrose', 'Leinen los!'], { warp: ['canalave_city', 13, 47, 'down'] }, [null, 'Das Boot legt in Fleetburg an.']], no: [['Matrose', 'Ich warte hier.']] }
    ]
  },
  // Eldritchs Boot (Hafenhaus Fleetburg) legt an den Stegen der Inseln an, Rueckfahrt beim Matrosen dort
  _retarget: {
    'canalave_dock>iron_island': ['iron_island_outside', 4, 22, 'right'],
    'canalave_dock>fullmoon_island': ['fullmoon_island_outside', 7, 21, 'left'],
    'iron_island>canalave_dock': ['iron_island_outside', 'entrance'],
    'fullmoon_island>canalave_dock': ['fullmoon_island_outside', 'entrance']
  },
  _add: {
    iron_island_outside: [{ id: 'boat_iron', x: 3, y: 22, dir: 'right', look: 'worker', name: 'Matrose', talk: 'boatToCanalave' }],
    fullmoon_island_outside: [{ id: 'boat_fullmoon', x: 8, y: 21, dir: 'left', look: 'worker', name: 'Matrose', talk: 'boatToCanalave' }]
  },
  _scripts: {
    boatToCanalave: [
      ['Matrose', 'Zurück nach Fleetburg?'],
      { ask: ['Ja', 'Nein'], yes: [['Matrose', 'Leinen los!'], { warp: ['canalave_city', 13, 47, 'down'] }, [null, 'Das Boot legt in Fleetburg an.']], no: [['Matrose', 'Ich warte hier.']] }
    ]
  },
  _warps: {
    ferryToFight: ['fight_area', 12, 18, 'down'],
    ferryToSnow: ['snowpoint_city', 4, 54, 'down']
  }
};

// Regionen zusammenfuehren (Karteneintraege und _-Listen werden vereinigt)
export const ORIG_FIX = {};
for (const part of [BASE, R1, R2, R3, R4, R5]) {
  for (const [k, v] of Object.entries(part)) {
    if (Array.isArray(v)) ORIG_FIX[k] = [...(ORIG_FIX[k] || []), ...v];
    else ORIG_FIX[k] = { ...(ORIG_FIX[k] || {}), ...v };
  }
}
