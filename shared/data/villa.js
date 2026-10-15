// Möbel der Villa im Erholungsgebiet wie in Platin: [id, Name, Preis, Bedingung, Besucher]
// Bedingungen prüft server/game/extras.js (villaReq). Ersatzbedingungen stehen im Kommentar.
export const FURNITURE = [
  ['table', 'Tisch', 0, null, 'mom'],
  ['big-sofa', 'Großes Sofa', 120000, null],
  ['small-sofa', 'Kleines Sofa', 90000, null, 'lucia'],
  ['bed', 'Bett', 187000, null],
  ['night-table', 'Nachttisch', 58000, null],
  ['tv', 'Fernseher', 220000, null],
  ['audio', 'Stereoanlage', 160000, null],
  ['bookshelf', 'Bücherregal', 150000, null, 'rowan'],
  ['rack', 'Regal', 127000, null],
  ['plant', 'Zimmerpflanze', 120000, null, 'gardenia'],
  ['pc-desk', 'Computertisch', 168000, null],
  ['music-box', 'Spieluhr', 25300, 'rack'],
  ['silver-statue', 'Pokémon-Statue (Silber)', 150000, 'tower_silver'],
  ['gold-statue', 'Pokémon-Statue (Gold)', 150000, 'tower_gold'],
  ['piano', 'Klavier', 146700, 'league10', 'cynthia'],
  ['reception', 'Empfangsgarnitur', 208000, 'tower50'],
  ['wall-clock', 'Wanduhr', 52000, 'berries50'],
  ['painting', 'Großes Gemälde', 140000, 'eggs30'],
  ['tea-set', 'Teeservice', 108000, 'music-box'],
  ['chandelier', 'Kronleuchter', 120000, 'steps300k']
];
export const FURNITURE_REQ_TEXT = {
  rack: 'Erst nach dem Regal erhältlich.', 'music-box': 'Erst nach der Spieluhr erhältlich.',
  tower_silver: 'Erst nach dem Silberdruck von Turmherr Palmer.', tower_gold: 'Erst nach dem Golddruck von Turmherr Palmer.',
  league10: 'Erst nach zehn Siegen über die Pokémon Liga.', tower50: 'Erst nach 50 Siegen im Kampfturm.',
  berries50: 'Erst nach 50 gesammelten Beeren.', eggs30: 'Erst nach 30 geschlüpften Eiern oder 300 gefangenen Pokémon.', steps300k: 'Erst nach 300 000 Schritten.'
};
