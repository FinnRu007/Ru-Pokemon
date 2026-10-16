// Sonderregeln für Attacken mit Nachteilen oder zwei Runden, wie in Platin.
//   selfKO: Anwender wird besiegt (Finale, Explosion halbieren dazu die Verteidigung des Ziels)
//   recharge: nächste Runde muss sich der Anwender erholen (Hyperstrahl, Giga-Stoß ...)
//   charge: erste Runde Aufladen, zweite Runde Angriff. semi: in der Ladezeit kaum zu treffen
//   rampage: 2 bis 3 Runden festgelegt, danach verwirrt (Wutanfall, Fuchtler, Blütentanz)
//   crash: verfehlt die Attacke, verletzt sich der Anwender (Sprungkick, Turmkick)
//   focus: scheitert, wenn der Anwender vorher in der Runde getroffen wurde (Power-Punch)
//   protect / rest: Schutzschild und Erholung
export const MOVE_RULES = {
  'self-destruct': { selfKO: true, halveDef: true },
  explosion: { selfKO: true, halveDef: true },
  memento: { selfKO: true },
  'hyper-beam': { recharge: true }, 'giga-impact': { recharge: true }, 'blast-burn': { recharge: true },
  'frenzy-plant': { recharge: true }, 'hydro-cannon': { recharge: true }, 'rock-wrecker': { recharge: true }, 'roar-of-time': { recharge: true },
  'solar-beam': { charge: 'nimmt Sonnenlicht auf!' },
  'sky-attack': { charge: 'wird von grellem Licht umhüllt!' },
  'skull-bash': { charge: 'zieht seinen Kopf ein!', chargeStats: { def: 1 } },
  'razor-wind': { charge: 'erzeugt einen Wirbelwind!' },
  fly: { charge: 'fliegt hoch empor!', semi: 'sky' },
  bounce: { charge: 'springt hoch empor!', semi: 'sky' },
  dig: { charge: 'gräbt sich ein!', semi: 'ground' },
  dive: { charge: 'taucht unter!', semi: 'water' },
  'shadow-force': { charge: 'verschwindet blitzschnell!', semi: 'shadow' },
  outrage: { rampage: true }, thrash: { rampage: true }, 'petal-dance': { rampage: true },
  'jump-kick': { crash: true }, 'high-jump-kick': { crash: true },
  'focus-punch': { focus: true },
  protect: { protect: true }, detect: { protect: true },
  rest: { rest: true }
};

// Welche Attacken ein Pokémon in der Ladezeit trotzdem treffen
export const SEMI_HITS = {
  sky: new Set(['gust', 'twister', 'thunder', 'sky-uppercut']),
  ground: new Set(['earthquake', 'magnitude']),
  water: new Set(['surf', 'whirlpool']),
  shadow: new Set()
};
