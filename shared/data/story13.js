// Kapitel 4 nach den Originalskripten von Platin: Ewigenau (Barry rempelt dich an, Zyrus vor der Statue,
// Silvana vor der Arena, Cynthia mit Zerschneider, Jupiter im Galaktik-Gebäude, Cynthias Ei).
export function applyStory13({ TRAINERS, SCRIPTS, NPCS, TRIGGERS, MAPS, ORIG_ON }) {
  if (!ORIG_ON) return;
  const G = (map, gx, gz) => { const o = MAPS[map]?.orig; return o && o.m === 0 ? [gx - o.x, gz - o.z] : [gx, gz]; };
  const npc = (map, id) => (NPCS[map] || []).find((n) => n.id === id);
  const put = (map, n) => { NPCS[map] = (NPCS[map] || []).filter((x) => x.id !== n.id); NPCS[map].push(n); };
  const set = (map, id, fields) => { const n = npc(map, id); if (n) Object.assign(n, fields); return n; };
  const trig = (map, list, ...dropScripts) => {
    TRIGGERS[map] = [...(TRIGGERS[map] || []).filter((t) => !dropScripts.includes(t.script) && !list.some((x) => x.script === t.script)), ...list];
  };
  const at = (map, gx, gz, w = 1, h = 1) => { const [x, y] = G(map, gx, gz); return { x, y, w, h }; };
  const E = 'eterna_city';

  // ================================================================ Ankunft: Barry und Zyrus an der Statue
  {
    const [bx, by] = G(E, 299, 533);
    const [zx, zy] = G(E, 327, 526);
    put(E, { id: 'barry_et', x: bx, y: by, dir: 'up', look: 'rival', name: 'Barry', show: ['et_barry_in', '!et_arrive'] });
    put(E, { id: 'cyrus_et', x: zx, y: zy, dir: 'up', look: 'boss', name: 'Zyrus', show: ['!et_cyrus_left', '!et_arrive', '!eterna_done'] });
    SCRIPTS.etArrive = [
      { flag: 'et_barry_in', quiet: true },
      { walk: 'barry_et', to: 'player', fast: true },
      [null, 'Rums!!'],
      ['Barry', 'He, @P! Du bist gekommen, um dir die Pokémon-Statue anzusehen, oder? Ich bring dich hin!'],
      { walk: 'barry_et', to: { at: [zx - 4, zy + 1] }, fast: true },
      { me: { to: 'barry_et' } },
      ['Barry', 'Was zum ...'],
      ['Zyrus', '... Das ist also die Pokémon-Statue von Ewigenau ... Unsere Welt wird geformt von Zeit und Raum, verflochten in einer Spirale. In Sinnoh verehrt man die Pokémon der Zeit und des Raums ...'],
      ['Zyrus', 'Sinnohs Mythos ... Seine Wahrheit muss erforscht werden ...'],
      { walk: 'cyrus_et', path: 'lll' },
      { face: 'cyrus_et', dir: 'player' },
      ['Zyrus', '... Verzeihung. Tritt zur Seite.'],
      { walk: 'cyrus_et', to: 'exit' },
      { flag: 'et_cyrus_left', quiet: true },
      { wait: 600 },
      { face: 'barry_et', dir: 'player' },
      ['Barry', 'Oh, he! Als wir zusammengestoßen sind, hatte ich eine geniale Eingebung! Ein einfacher Weg, ein großer Trainer zu werden! Genau! Hör gut zu ...'],
      ['Barry', 'Sorg dafür, dass alle deine Attacken treffen! Weich allen gegnerischen Attacken aus! Wenn du das machst, verlierst du nie! Dann bist du der unbesiegbare Trainer!'],
      ['Barry', 'Egal, sieh dir die Pokémon-Statue an. Bis dann!'],
      { walk: 'barry_et', to: 'exit', fast: true },
      { flag: 'et_arrive' }
    ];
    trig(E, [{ ...at(E, 303, 523, 1, 4), when: ['!et_arrive', '!badge_forest', '!eterna_done'], script: 'etArrive' }]);
  }

  // ================================================================ Silvana vor der Arena
  {
    const [sx, sy] = G(E, 312, 563);
    put(E, { id: 'gardenia_et', x: sx, y: sy, dir: 'down', look: 'gardenia', name: 'Silvana', show: ['!et_gardenia_in', '!badge_forest'], talk: 'etGardenia' });
    SCRIPTS.etGardenia = [
      { face: 'gardenia_et', dir: 'player' },
      ['Silvana', 'Hi! Ich bin Silvana! Ich bin die Arenaleiterin dieser Stadt! Mein letzter Herausforderer war so ein schrecklich schneller Junge. ... Er hieß übrigens Barry. Er hat mir von dir erzählt.'],
      ['Silvana', 'Er meinte, es sei noch ein Herausforderer unterwegs, da wurde ich ganz kribbelig! In meiner Arena kämpft niemand gegen mich, die Arenaleiterin, bevor er nicht alle anderen Trainer der Arena besiegt hat.'],
      ['Silvana', 'Ich warte ganz hinten auf dich, Trainer. Enttäusch mich nicht!'],
      { walk: 'gardenia_et', to: { door: 'eterna_gym' } },
      { flag: 'et_gardenia_in' }
    ];
  }

  // ================================================================ Cynthia schenkt Zerschneider (nach dem Waldorden)
  {
    const c = set(E, 'cynthia_et', { show: ['et_cynthia_in', '!et_cynthia_left'], talk: undefined });
    if (c) {
      SCRIPTS.cynthiaEterna = [
        { flag: 'et_cynthia_in', quiet: true },
        { walk: 'cynthia_et', to: 'player' },
        ['Cynthia', 'Oh, das Gerät, das du da hast ... Ist das ein Pokédex? Wow, da werden Erinnerungen wach. Entschuldige, wie heißt du? ... Okay, hallo, @P. Den Namen merke ich mir!'],
        ['Cynthia', 'Ich heiße Cynthia. Ich bin eine Trainerin, genau wie du. In letzter Zeit beschäftige ich mich aus Neugier mit der Mythologie der Pokémon.'],
        ['Cynthia', 'Hier in Ewigenau steht die Statue eines uralten Pokémon. Hast du sie schon gesehen? Laut dem Mythos war es ein unglaublich mächtiges Pokémon. Wer weiß? Vielleicht begegnest du auf deiner Reise mit dem Pokédex etwas Ähnlichem. Oh, ich weiß! Probier das mal. Es sollte dir helfen.'],
        { flag: 'hm_cut' },
        [null, '@P erhält VM01 Zerschneider!'],
        ['Cynthia', 'Denk daran: Die versteckte Attacke Zerschneider kann man auch auf dem Feld einsetzen. Damit kommst du an Orte, die du vorher nicht erreichen konntest. Das ist wichtig, um deinen Pokédex zu füllen, oder?'],
        ['Cynthia', 'Dann viel Glück, junger Trainer! Ach, eine Sache noch! Grüß bitte Prof. Eibe von mir.'],
        { walk: 'cynthia_et', to: 'exit' },
        { flag: 'et_cynthia_left', quiet: true }
      ];
      const [tx, ty] = G(E, 303, 523);
      trig(E, [{ x: tx, y: ty - 2, w: 1, h: 6, when: ['badge_forest', '!hm_cut'], script: 'cynthiaEterna' }]);
    }
  }

  // ================================================================ Galaktik-Gebäude: Jupiter, danach Cynthias Ei
  {
    TRAINERS.jupiter1 = {
      ...TRAINERS.jupiter1, flag: 'beat_jupiter1',
      intro: [['Jupiter', 'Hm? Wolltest du etwas? Wie dumm von mir, überhaupt zu fragen. Du willst die Pokémon befreien. Na schön! Ich, Jupiter, kümmere mich um dich.']],
      win: [['Jupiter', 'Na, bist du nicht zäh ...?']]
    };
    const j = set('eterna_galactic', 'jupiter_et', { trainer: undefined, talk: 'etJupiter' });
    if (j) {
      SCRIPTS.etJupiter = [
        { if: '!beat_jupiter1', then: [{ battle: 'jupiter1' }] },
        ['Jupiter', 'Schon gut. Unsere offizielle Untersuchung der Pokémon-Statue ist abgeschlossen. Mars hat die Energie aus dem Windkraftwerk gesammelt. Wir sind hier so gut wie fertig.'],
        ['Jupiter', 'Ich verrate dir eine Kleinigkeit. Unser Boss erforscht die Mythen uralter Pokémon. Mit der Kraft mythischer Pokémon wird er der Herrscher über Sinnoh ... Ich rate dir, dich von nun an aus den Angelegenheiten von Team Galaktik herauszuhalten. Das ist deine letzte Warnung!'],
        { walk: 'jupiter_et', to: 'exit' },
        { flag: 'eterna_done', quiet: true },
        { wait: 300 },
        ['Radladenbesitzer', 'Ich habe mein Piepi zurück, und das nur dank dir! Aber dieses Team Galaktik ... Die sagten: „Piepi kommt aus dem All. Rück es raus!“ Ihre Logik verstehe ich immer noch nicht. Als kämen die selbst aus dem All!'],
        ['Radladenbesitzer', 'Jedenfalls sind sie jetzt weg. Vielen, vielen Dank! Jetzt kann ich mich nicht richtig bedanken, aber komm in meinem Radladen vorbei, okay?'],
        { walk: 'bike_owner_cap', to: 'exit' },
        { flag: 'et_owner_home' }
      ];
      set('eterna_galactic', 'bike_owner_cap', { show: ['!et_owner_home', '!bike', 'beat_jupiter1|!eterna_done'] });
    }
    // Cynthia wartet nach dem Galaktik-Gebäude mit einem Ei
    const [cx, cy] = G(E, 304, 548);
    put(E, { id: 'cynthia_egg', x: cx, y: cy, dir: 'right', look: 'cynthia', name: 'Cynthia', show: ['eterna_done', 'et_egg_in', '!et_egg'], talk: 'cynthiaEgg' });
    SCRIPTS.cynthiaEgg = [
      { flag: 'et_egg_in', quiet: true },
      { walk: 'cynthia_egg', to: 'player' },
      ['Cynthia', 'Oh, da bist du ja! Ich habe dich gesucht. Ich habe etwas Schönes für dich. Ich möchte dir dieses Pokémon-Ei schenken. Nimmst du es an?'],
      { ask: ['Ja', 'Nein'],
        yes: [
          { partyAtLeast: 6,
            then: [['Cynthia', 'Oh? Du hast schon sechs Pokémon dabei. Für dieses Ei ist kein Platz. Bring zuerst ein Pokémon im Pokémon-Center in eine Box. Ich gebe dir das Ei, sobald du Platz hast. Ich warte hier.']],
            else: [
              ['Cynthia', 'Wunderbar! Das Pokémon im Ei freut sich bestimmt auch!'],
              { egg: 175 },
              ['Cynthia', 'Behalte das Ei in deinem Team. Während du reist, schlüpft daraus ein Pokémon. Ich würde mich freuen, wenn es dir hilft, eine weitere Seite in deinem Pokédex zu füllen. Bis bald!'],
              { flag: 'et_egg' },
              { walk: 'cynthia_egg', to: 'exit' }
            ] }
        ],
        no: [['Cynthia', 'Oh ...? Du musst dich nicht verpflichtet fühlen. Es ist nicht leicht, die Seiten des Pokédex zu füllen, oder? Ich wollte dir nur ein bisschen helfen, das ist alles.']] }
    ];
    trig(E, [{ ...at(E, 308, 541, 1, 5), when: ['eterna_done', '!et_egg_in'], script: 'cynthiaEgg' }]);
  }

  // ================================================================ Heide verabschiedet sich am Ausgang des Ewigwalds
  // (Begleiterin aus story8.js: am Ausgang bedankt sie sich wie Cheryl mit der Sanftglocke)
}
