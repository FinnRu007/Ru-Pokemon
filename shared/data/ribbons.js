// Bänder wie in Platin (ohne Wettbewerbe). Gespeichert als Liste von IDs am Pokémon (mon.ribbons).
export const RIBBONS = {
  'sinnoh-champ': { name: 'Band des Sinnoh-Champs', text: 'Für den Sieg über den Champ und den Eintrag in die Ruhmeshalle.' },
  ability: { name: 'Fähigkeitsband', text: 'Für den Sieg über Turmherr Palmer im Kampfturm.' },
  'great-ability': { name: 'Großes Fähigkeitsband', text: 'Für den zweiten Sieg über Turmherr Palmer im Kampfturm.' },
  'double-ability': { name: 'Doppel-Fähigkeitsband', text: 'Für 50 Siege in Folge im Doppelkampf des Kampfturms.' },
  'multi-ability': { name: 'Multi-Fähigkeitsband', text: 'Für 50 Siege in Folge im Multi-Kampf des Kampfturms.' },
  alert: { name: 'Band der Wachsamkeit', text: 'Ein Band für einen frischen Start in die Woche.' },
  shock: { name: 'Band des Schocks', text: 'Ein Band, das an einen schockierenden Moment erinnert.' },
  downcast: { name: 'Band der Traurigkeit', text: 'Ein Band, das an einen traurigen Moment erinnert.' },
  careless: { name: 'Band der Sorglosigkeit', text: 'Ein Band, das an einen sorglosen Fehler erinnert.' },
  relax: { name: 'Band der Entspannung', text: 'Ein Band, das an einen entspannten Moment erinnert.' },
  snooze: { name: 'Band des Schlafens', text: 'Ein Band, das an ein tiefes Schläfchen erinnert.' },
  smile: { name: 'Band des Lächelns', text: 'Ein Band, das an ein Lächeln erinnert.' },
  effort: { name: 'Fleiß-Band', text: 'Für ein Pokémon, das mit großem Fleiß trainiert wurde.' },
  gorgeous: { name: 'Prachtband', text: 'Ein wunderschönes, prächtiges Band.' },
  royal: { name: 'Königsband', text: 'Ein unglaublich edles, königliches Band.' },
  'gorgeous-royal': { name: 'Prachtkönigsband', text: 'Ein prächtiges und königliches Band, das schönste von allen.' }
};
// Bänder von Mona in Sonnewik: Sonntag = 0
export const DAY_RIBBONS = ['smile', 'alert', 'shock', 'downcast', 'careless', 'relax', 'snooze'];
// Band-Verein im Erholungsgebiet
export const RIBBON_SHOP = [['gorgeous', 10000], ['royal', 100000], ['gorgeous-royal', 999999]];
