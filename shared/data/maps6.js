// Nebengebiete wie in Platin: die Höhlen in den drei Seen (Selfe, Vesprit, Tobutz), der Hafen von
// Fleetburg mit der Eiseninsel, die Alte Villa im Ewigwald, der Irrweg unter dem Radweg und die
// Trostu-Ruinen. Alles ist Innenraum, die Eingänge liegen auf den bestehenden Karten.
import { grid, GYM_PALETTES } from './mapkit.js';

const slots = (list) => list.map(([species, min, max, weight]) => ({ species, min, max, weight }));
const RUIN = { floor: '#d8d0c0', speck: '#b8b0a0', wall: '#8a8478', wallStripe: '#7a7468', base: '#4a463e', top: '#3a362e', rock: '#9a9488' };

// Höhle im See: klein, still, ohne wilde Pokémon. Ganz oben schläft eines der drei Wesen.
const cavern = (name, text) => ({
  name, indoor: true, theme: 'cave', music: 'lake',
  ...grid(['XXXXXXXXXXXXXX', 'XXXXXXXXXXXXXX', 'XXXX::::::XXXX', 'XXX::::::::XXX', 'XX::::::::::XX', 'XX:::O::O:::XX',
    'XXX::::::::XXX', 'XXXX::::::XXXX', 'XXXXXX::XXXXXX', 'XXXXXXXGXXXXXX']),
  events: [{ x: 7, y: 1, type: 'text', text }]
});

export const MAPS6 = {
  verity_cavern: cavern('Höhle im Kraterberg-See', 'Die Wand ist glatt wie Glas. Man spürt hier eine sanfte Wärme, als würde jemand an dich denken.'),
  valor_cavern: cavern('Höhle im See der Kühnheit', 'In die Wand ist ein Zeichen geritzt. Es sieht aus wie ein Kopf mit zwei Zacken.'),
  acuity_cavern: cavern('Höhle im See der Willenskraft', 'Die Luft ist eiskalt und klar. Hier kann man gut nachdenken.'),
  // ------------------------------------------------------------------ Fleetburg Hafen und Eiseninsel
  canalave_dock: {
    name: 'Hafenhaus Fleetburg', indoor: true, theme: 'house', entry: { x: 4, y: 7 },
    ...grid(['WWWWWWWWWW', 'WWWWUWWWWW', 'Y________Y', '__________', '_TT____BB_', '_TT_______', '__________', '____E_____']),
    events: []
  },
  iron_island: {
    name: 'Eiseninsel', indoor: true, theme: 'cave', music: 'cave',
    ...grid([
      'XXXXXXXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXGXXXXX',
      'XXXXXXXXXXXX:::::XXX',
      'XXXXXXXXXXX:::::::XX',
      'XXXX::::::::::O:::XX',
      'XXX:::::::::::::::XX',
      'XXX:::XXXXXXX::::XXX',
      'XXX:::XXXXXXXX::XXXX',
      'XXX::::::XXXXX::XXXX',
      'XXXX:::::::::::::XXX',
      'XXXXXX::::::::::::XX',
      'XXXXXXXX::::O:::::XX',
      'XXXXXXXXX:::::::XXXX',
      'XXXXXXXXXX::::XXXXXX',
      'XXXXXXXXXXX::XXXXXXX',
      'XXXXXXXXXXXUXXXXXXXX'
    ]),
    events: [],
    encounters: { caveRate: 10, cave: slots([[75, 36, 38, 25], [42, 36, 38, 25], [95, 36, 38, 15], [436, 36, 38, 15], [74, 34, 36, 15], [208, 38, 40, 5]]) }
  },
  iron_island_deep: {
    name: 'Eiseninsel Tiefe', indoor: true, theme: 'cave', music: 'cave',
    ...grid([
      'XXXXXXXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXXXXXXX',
      'XXX::::::XXXXXXXXXXX',
      'XX::::::::XXXXXXXXXX',
      'XX::::::::::::::XXXX',
      'XXX:::::::::::::XXXX',
      'XXXXXXX:::XXX:::XXXX',
      'XXXXXX::::XXX:::XXXX',
      'XXXX::::::::::::XXXX',
      'XXX::::::::::::XXXXX',
      'XXX:::XXXXXX::XXXXXX',
      'XXXXXXXXXXXX::XXXXXX',
      'XXXXXXXXXXXX::XXXXXX',
      'XXXXXXXXXXXXGXXXXXXX'
    ]),
    events: [],
    encounters: { caveRate: 10, cave: slots([[75, 38, 40, 25], [42, 38, 40, 25], [95, 38, 40, 15], [437, 38, 40, 10], [208, 39, 41, 15], [74, 36, 38, 10]]) }
  },
  // ------------------------------------------------------------------ Alte Villa im Ewigwald
  old_chateau: {
    name: 'Alte Villa', indoor: true, theme: 'gym', palette: GYM_PALETTES.ghost, music: 'cave', entry: { x: 7, y: 11 },
    ...grid([
      'WWWWWWWWWWWWWWWW',
      'WWWWWWWWWWWWWWWW',
      'Y:::V::::::BBBBY',
      '::::::::::::::::',
      ':TTTTT::::TTTT::',
      '::::::::::::::::',
      'WWWWWWW::WWWWWWW',
      '::::::::::::::::',
      ':R:::::::::::P::',
      '::::::::::::::::',
      'Y::::::::::::::Y',
      '_______E________'
    ]),
    events: [
      { x: 4, y: 2, type: 'text', text: 'Ein uralter Fernseher. Er ist nicht eingesteckt, und trotzdem flackert das Bild.' },
      { x: 12, y: 2, type: 'text', text: 'Ein Gemälde einer Dame. Für einen Moment scheinen sich ihre Augen zu bewegen.' },
      { x: 13, y: 8, type: 'text', text: 'Ein Tagebuch: „Heute ist der Besitzer fortgegangen. Er kommt nicht wieder. Die Villa gehört jetzt den Geistern.“' }
    ],
    encounters: { caveRate: 10, cave: slots([[92, 15, 17, 75], [93, 17, 19, 25]]) }
  },
  // ------------------------------------------------------------------ Irrweg unter dem Radweg
  wayward_cave: {
    name: 'Irrweg', indoor: true, theme: 'cave', music: 'cave',
    ...grid([
      'XXXXXXXXXXXXXXXXXXXXXXXX',
      'XXX::::::XXXXXXX:::::XXX',
      'XX::::::::XXXXX:::::::XX',
      'XX:::O::::::::::::O:::XX',
      'XX::::::::XXXXX:::::::XX',
      'XXX:::::XXXXXXXX:::::XXX',
      'XXXX:::XXXXXXXXXX:::XXXX',
      'XXXX:::XXXXXXXXXX:::XXXX',
      'XXX:::::XXXXXXXX:::::XXX',
      'XX::::::::::::::::::::XX',
      'XX::::::XXXXXXXX::::::XX',
      'XXX::::XXXXXXXXXX::::XXX',
      'XXXX::::XXXXXXXX::::XXXX',
      'XXXXX::::::::::::::XXXXX',
      'XXXXXXXXXXX::XXXXXXXXXXX',
      'XXXXXXXXXXXGXXXXXXXXXXXX'
    ]),
    events: [],
    encounters: { caveRate: 10, cave: slots([[74, 15, 17, 25], [41, 15, 17, 25], [436, 15, 17, 15], [95, 16, 17, 10], [66, 15, 17, 15], [443, 15, 17, 10]]) }
  },
  // ------------------------------------------------------------------ Trostu-Ruinen
  solaceon_ruins: {
    name: 'Trostu-Ruinen', indoor: true, theme: 'gym', palette: RUIN, music: 'cave',
    ...grid([
      'XXXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXXX',
      'XX::::::::::::XX',
      'XX:X::::::::X:XX',
      'XX::::::::::::XX',
      'XXXXX::::::XXXXX',
      'XX::::::::::::XX',
      'XX:X::::::::X:XX',
      'XX::::::::::::XX',
      'XXXXXX::::XXXXXX',
      'XXXXXX::::XXXXXX',
      'XXXXXXXGXXXXXXXX'
    ]),
    events: [
      { x: 7, y: 1, type: 'text', text: 'In die Wand sind seltsame Zeichen gemeißelt. Jedes sieht aus wie ein kleines Pokémon mit einem Auge.' },
      { x: 3, y: 3, type: 'text', text: 'Eine alte Inschrift: „Alles Leben ist mit anderem Leben verbunden. Und daraus entsteht neues Leben.“' }
    ],
    encounters: { caveRate: 12, cave: slots([[201, 14, 18, 100]]) }
  }
};

export const LINKS6 = [
  // Inseln in den Seen (nur mit Surfer)
  ['pass', 'lake_verity', 7, 6, 'verity_cavern', 7, 8, 'up'],
  ['pass', 'verity_cavern', 7, 9, 'lake_verity', 7, 7, 'down'],
  ['pass', 'lake_valor', 9, 7, 'valor_cavern', 7, 8, 'up'],
  ['pass', 'valor_cavern', 7, 9, 'lake_valor', 9, 8, 'down'],
  ['pass', 'lake_acuity', 14, 6, 'acuity_cavern', 7, 8, 'up'],
  ['pass', 'acuity_cavern', 7, 9, 'lake_acuity', 14, 7, 'down'],
  // Fleetburg: Hafenhaus, Schiff zur Eiseninsel
  ['door', 'canalave_city', 29, 19, 'canalave_dock'],
  ['pass', 'canalave_dock', 4, 1, 'iron_island', 11, 14, 'up'],
  ['pass', 'iron_island', 11, 15, 'canalave_dock', 4, 2, 'down'],
  ['pass', 'iron_island', 14, 1, 'iron_island_deep', 12, 12, 'up'],
  ['pass', 'iron_island_deep', 12, 13, 'iron_island', 14, 2, 'down'],
  // Alte Villa, Irrweg, Ruinen
  ['door', 'eterna_forest', 25, 3, 'old_chateau'],
  ['pass', 'route_206', 2, 51, 'wayward_cave', 11, 14, 'up'],
  ['pass', 'wayward_cave', 11, 15, 'route_206', 2, 52, 'down'],
  ['pass', 'solaceon_town', 21, 6, 'solaceon_ruins', 7, 10, 'up'],
  ['pass', 'solaceon_ruins', 7, 11, 'solaceon_town', 21, 7, 'down']
];
