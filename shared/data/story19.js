// Kapitel 10 nach den Originalskripten von Platin: Ignaz am Stadteingang von Sonnewik, Volkner im Leuchtturm,
// Barry und Jasmin nach dem Leuchtorden, Barry in der Vorhalle der Liga, die Top Vier, Cynthia und die Ruhmeshalle.
export function applyStory19({ TRAINERS, SCRIPTS, NPCS, TRIGGERS, MAPS, ORIG_ON }) {
  if (!ORIG_ON) return;
  const G = (map, gx, gz) => { const o = MAPS[map]?.orig; return o && o.m === 0 ? [gx - o.x, gz - o.z] : [gx, gz]; };
  const npc = (map, id) => (NPCS[map] || []).find((n) => n.id === id);
  const put = (map, n) => { NPCS[map] = (NPCS[map] || []).filter((x) => x.id !== n.id); NPCS[map].push(n); };
  const trig = (map, list, ...dropScripts) => {
    TRIGGERS[map] = [...(TRIGGERS[map] || []).filter((t) => !dropScripts.includes(t.script) && !list.some((x) => x.script === t.script)), ...list];
  };

  // ================================================================ Sonnewik: Ignaz am Stadteingang und vor der Arena
  {
    const S = 'sunyshore_city';
    const [fx, fy] = G(S, 841, 790);
    put(S, { id: 'flint_gate', x: fx, y: fy, dir: 'left', look: 'flint', name: 'Ignaz', show: '!sun_flint_met' });
    Object.assign(npc(S, 'flint_sun') || {}, { show: ['!sun_flint_gone'], talk: 'flintGym' });
    const gate = (MAPS[S]?.warps || []).filter((w) => w.to === 'gate_222');
    if (gate.length) {
      const ys = gate.map((w) => w.y);
      trig(S, [{ x: gate[0].x + 1, y: Math.min(...ys), w: 1, h: ys.length, when: '!sun_flint_met', script: 'sunFlint' }]);
    }
    SCRIPTS.sunFlint = [
      { emote: 'flint_gate' },
      { walk: 'flint_gate', to: 'player' },
      ['Ignaz', 'Yo! Kollege! Deine Pokémon sind zwar sicher in ihren Pokébällen, aber diese Aura echter Stärke kannst du nicht verbergen! Ups, sorry, ich sollte mich vorstellen. Ich heiße Ignaz! Ich bin einer der Top Vier der Pokémon Liga!'],
      { face: 'flint_gate', dir: 'down' },
      { wait: 400 },
      { face: 'flint_gate', dir: 'player' },
      ['Ignaz', 'Mir ist gerade eine Idee gekommen. Vielleicht schaffst du das. Es geht um den Arenaleiter dieser Stadt. Er hat in letzter Zeit jede Begeisterung verloren, weil kaum noch gute Herausforderer kommen, die seine Zeit wert sind. Ihm ist so langweilig, dass er nur noch an seiner Arena herumbaut. Und dann kam auch noch der Stromausfall ... Das hat seine Laune nicht gerade gehoben.'],
      ['Ignaz', 'Du weißt, worauf ich hinauswill, oder? Liefere ihm einen Kampf, der so heiß ist, dass seine Leidenschaft fürs Kämpfen wieder entbrennt! Ich zähle auf dich, Heißsporn!'],
      { wait: 400 },
      { walk: 'flint_gate', to: { at: [fx + 4, fy] } },
      { flag: 'sun_flint_met', quiet: true }
    ];
    SCRIPTS.flintGym = [
      { if: 'volkner_ready',
        then: [
          ['Ignaz', 'Yo! Hallo! Er ist endlich zurück! Und er wirkte richtig gut gelaunt. Ich habe so eine Ahnung, dass er deine Stärke sofort erkannt hat. Wetten, er freut sich schon auf den Kampf gegen dich?'],
          ['Ignaz', 'Denk dran, was du zu tun hast, Heißsporn. Liefere ihm einen Kampf, der so heiß ist, dass seine Leidenschaft fürs Kämpfen wieder entbrennt! Also gut, Heißsporn! Ich warte in der Pokémon Liga auf dich!'],
          { wait: 300 },
          { walk: 'flint_sun', to: { at: [(npc(S, 'flint_sun')?.x ?? 13) + 9, (npc(S, 'flint_sun')?.y ?? 12) + 2] } },
          { flag: 'sun_flint_gone', quiet: true }
        ],
        else: [
          ['Ignaz', 'Yo! Hallo! Er ist noch nicht zurück. Er starrt bestimmt wieder vom Leuchtturm aufs Meer. Wenn er kommt, weißt du, was zu tun ist. Liefere ihm einen Kampf, der so heiß ist, dass seine Leidenschaft fürs Kämpfen wieder entbrennt! Ich zähle auf dich, Heißsporn!']
        ] }
    ];

    // ---------------------------------------------- Barry und Jasmin nach dem Leuchtorden
    const [jx, jy] = G(S, 857, 741);
    const [bx, by] = G(S, 855, 747);
    const [tx, ty] = G(S, 853, 743);
    Object.assign(npc(S, 'jasmine') || {}, { x: jx, y: jy, dir: 'down', show: undefined, talk: 'jasmine' });
    put(S, { id: 'barry_sun', x: bx, y: by, dir: 'up', look: 'rival', name: 'Barry', show: ['sun_barry_in', '!sun_barry_left'] });
    trig(S, [{ x: tx, y: ty, w: 5, h: 1, when: ['badge_beacon', '!hm_waterfall'], script: 'sunBarry' }]);
    SCRIPTS.sunBarry = [
      { emote: 'jasmine' },
      { flag: 'sun_barry_in' },
      { walk: 'barry_sun', to: 'player', fast: true },
      ['Barry', 'He! @P! Was zum ... Du hast dir alle acht Orden von Sinnoh geholt! Mann, du ... Das ist der Hammer! Ich bin so neidisch! Aber glaub bloß nicht, dass du gewonnen hast!'],
      { face: 'barry_sun', dir: 'down' },
      ['Barry', 'Denn ich werde der stärkste Trainer überhaupt! Pass nur auf! Früher habe ich nur geträumt. Ich wollte einfach so sein wie mein Vater. Jetzt ist das anders. Ich habe darüber nachgedacht, was es heißt, ein Trainer zu sein. Und darüber, was Pokémon sind. Wir werden Schritt für Schritt stärker!'],
      { face: 'barry_sun', dir: 'player' },
      ['Barry', 'Ich fordere dich jetzt nicht zum Kampf heraus. Ich sag es nicht gern, aber ich weiß, dass du stärker bist als ich. Aber nicht viel stärker. Nur ein kleines bisschen. Der Unterschied ist vielleicht ein Meter? Nee, nicht mal ein Zentimeter. ... Was ich sagen will: Ich hole dich im Handumdrehen ein. Wenn du dich nicht beeilst, zur Pokémon Liga zu kommen, lasse ich dich weit hinter mir!'],
      { walk: 'barry_sun', to: 'exit', fast: true },
      { flag: 'sun_barry_left', quiet: true },
      { walk: 'jasmine', to: 'player' },
      ['Jasmin', '... War das dein Freund? Euch beide zusammen zu sehen, hat mich irgendwie glücklich gemacht. Es muss wunderbar sein, so einen Freund zu haben. Jemanden, mit dem man alles teilen kann. Jemanden, mit dem man sich messen kann, ohne zu streiten.'],
      ['Jasmin', '... Ähm, es hat mir richtig warm ums Herz gemacht, euch zu sehen. Es klingt vielleicht seltsam, aber ich möchte dir das hier als Dank geben. Es ist nicht viel, aber ...'],
      { flag: 'hm_waterfall' },
      [null, '@P erhält VM07 Kaskade!'],
      ['Jasmin', '... Diese Versteckte Maschine ... Sie enthält Kaskade. Wenn du sie einsetzt, kommst du zur Pokémon Liga. ... Ähm ... Ich ... Ich weiß nicht, wie ich das sagen soll, aber ... viel Glück.'],
      { walk: 'jasmine', to: 'home' },
      { face: 'jasmine', dir: 'down' }
    ];
    SCRIPTS.jasmine = [
      { if: 'hm_waterfall',
        then: [['Jasmin', '... Ich bin von sehr weit her gekommen, weil ich stärker werden wollte. Unterwegs habe ich alle möglichen Menschen mit ihren Pokémon getroffen ... Sie sahen alle so aus, als hätten sie Spaß. Das hat mich glücklich gemacht.']],
        else: [['Jasmin', '... Diese Stadt gibt mir irgendwie ein Gefühl von Zuhause. Sie liegt am Meer, und es gibt einen Leuchtturm ...'], ['Jasmin', 'Oh, ohne den Orden dieser Arena musst du hier wohl umkehren.']] }
    ];
  }

  // ================================================================ Leuchtturm: Volkner geht selbst zur Arena
  SCRIPTS.volknerLight = [
    ['Volkner', '... ... ... Du bist also der neueste Herausforderer der Arena von Sonnewik ...'],
    ['Volkner', 'Also gut, ich habe mich entschieden! Wenn du dich als schwach herausstellst, fordere ich selbst die Pokémon Liga heraus. Mit dem Umbau der Arena bin ich fertig, also muss ich nicht mehr hier sein. Mehr als alles andere will ich wieder Kämpfe, die mich mitreißen.'],
    ['Volkner', 'Als stärkster Arenaleiter von Sinnoh werde ich dir alles entgegenschleudern, was ich habe.'],
    { wait: 300 },
    { walk: 'volkner_light', to: 'exit' },
    { flag: 'volkner_ready', quiet: true }
  ];

  // ================================================================ Vorhalle der Liga: Barry kommt hinterher
  {
    NPCS.pokemon_league = (NPCS.pokemon_league || []).filter((n) => n.id !== 'barry_pl');
    trig('pokemon_league', [], 'rival5');
    const L = 'league_lobby';
    const door = (MAPS[L]?.warps || []).find((w) => w.to === 'pokemon_league') || { x: 7, y: 10 };
    put(L, { id: 'barry_ll', x: door.x, y: door.y - 1, dir: 'up', look: 'rival', name: 'Barry', show: ['ll_barry_in', '!ll_barry_left'] });
    trig(L, [{ x: 1, y: door.y - 2, w: (MAPS[L]?.width || 15) - 2, h: 1, when: '!rival5', script: 'rival5' }]);
    TRAINERS.rival5 = { ...TRAINERS.rival5, sight: 0, intro: [], win: [] };
    SCRIPTS.rival5 = [
      { flag: 'll_barry_in' },
      { walk: 'barry_ll', to: 'player', fast: true },
      ['Barry', 'Halt! Geh nicht ohne mich! Du forderst die Pokémon Liga heraus, oder? Deshalb bin ich auch hier. Lass uns mit einem Kampf herausfinden, wer von uns die Herausforderung mehr verdient hat!'],
      { battle: 'rival5' },
      ['Barry', 'Wenn ich gegen dich verliere, bin ich wohl noch nicht bereit für die Pokémon Liga! Verflixt! Aber pass auf! Ich werde stärker und kämpfe mich durch die Pokémon Liga! Denn ich werde Champ, der stärkste Trainer von allen! @P! Wehe, du verlierst gegen jemand anderen als mich!'],
      { flag: 'rival5', quiet: true },
      { walk: 'barry_ll', to: 'exit', fast: true },
      { flag: 'll_barry_left', quiet: true }
    ];
    Object.assign(npc(L, 'league_guard1') || {}, { talk: [['Wache', 'Du trittst gegen die Top Vier der Pokémon Liga an. Wenn du nicht alle vier nacheinander besiegst, musst du wieder beim Ersten anfangen.']] });
    Object.assign(npc(L, 'league_guard2') || {}, { talk: [['Wache', 'Es spielt keine Rolle, wenn es langsam vorangeht. Und auch nicht, wie viele Anläufe du brauchst. Gib nur nicht auf, bis du die Top Vier besiegt hast!']] });
    const enter = SCRIPTS.e4Enter || [];
    const ask = enter.find((x) => x && x.ask);
    if (ask) ask.yes = [...ask.yes.filter((x) => !Array.isArray(x)), { unflag: 'champ_cyn_gone', quiet: true }, ...ask.yes.filter((x) => Array.isArray(x))];
    SCRIPTS.e4Enter = [
      { if: '!league_badges',
        then: [
          ['Wache', 'Ich muss prüfen, ob du die Pokémon Liga herausfordern darfst. Also! Sehen wir uns die Orden an, die du in Sinnoh gesammelt hast.'],
          ['Wache', 'Der Kohleorden aus Erzelingen! Der Waldorden aus Ewigenau! Der Reliktorden aus Herzhofen! Der Kopforden aus Schleiede! Der Sumpforden aus Weideburg! Der Mineorden aus Fleetburg! Der Eisorden aus Blizzach! Und ... der Leuchtorden aus Sonnewik!'],
          ['Wache', 'Sehr gut! Trainer, du hast tatsächlich alle Orden von Sinnoh gesammelt! Zeig die Kraft, die dich hierher gebracht hat, und hol dir den Ruhm!'],
          { flag: 'league_badges', quiet: true }
        ] },
      ...enter
    ];
  }

  // ================================================================ Die Top Vier mit ihren Worten aus Platin
  const e4 = (id, intro, win, after) => { if (TRAINERS[id]) Object.assign(TRAINERS[id], { intro, win, after }); };
  e4('e4_aaron',
    [['Herbaro', 'Hallo! Willkommen in der Pokémon Liga! Ich bin Herbaro von den Top Vier. Schön, dich kennenzulernen. Oh, ich sollte es erklären: Ich bin ein riesiger Fan von Käfer-Pokémon. Käfer-Pokémon sind fies und gemein, und doch sind sie auch wunderschön ...'], ['Herbaro', 'Willst du wissen, warum ich hier Herausforderer empfange? Weil ich perfekt werden will, genau wie meine Käfer-Pokémon! Okay! Dann lass uns kämpfen!']],
    [['Herbaro', 'Ich habe mit den schönsten und stärksten aller Käfer-Pokémon verloren ... Wir haben verloren, weil ich nicht gut genug war ... Genau! Zurück ins Trainingslager! Ein Hoch auf mich! Nein ... Das war falsch ...'], ['Herbaro', 'Wie auch immer ... Geh weiter in den nächsten Raum! Drei Trainer warten auf dich. Sie sind alle stärker als ich.']],
    [['Herbaro', 'Na los, geh in den nächsten Raum. Mit meinen wunderschönen und starken Käfer-Pokémon werde ich ein Spitzentrainer, den niemand übertrifft!']]);
  e4('e4_bertha',
    [['Teresa', 'Na, na. Du bist ja ein richtig niedlicher Trainer, aber Rückgrat hast du auch. Ahaha! Ich bin Teresa. Ich habe eine Vorliebe für Boden-Pokémon. Na, zeigst du dieser alten Dame, wie viel du gelernt hast?']],
    [['Teresa', 'Du bist wirklich etwas Besonderes, Jungspund. Mir gefällt, wie du und deine Pokémon den Sieg gemeinsam errungen habt. Das macht dich so stark. Ahahaha! Ich glaube, du kannst so weit kommen, wie du willst.']],
    [['Teresa', 'Der Trainer im nächsten Raum ist ein viel gefährlicherer Gegner. Du musst wirklich einen klaren Kopf behalten. Aber ich glaube, du kannst so weit kommen, wie du möchtest. Ahahaha!']]);
  e4('e4_flint',
    [['Ignaz', 'Yo, Trainer! Ich habe schon die Tage an den Fingern abgezählt, bis du kommst. Volkner hat mir erzählt, was du in Sonnewik getan hast. Du hast in dem Kerl wieder ein Feuer entfacht. Wie könnte ich mich da nicht auf einen Kampf mit dir freuen?'], ['Ignaz', 'Du trittst gegen einen Feuer-Trainer an. Zeig Ignaz, wie heiß dein Kampfgeist brennt!']],
    [['Ignaz', '... ... ... Puh ... ... Komplett zu Asche verbrannt ...']],
    [['Ignaz', '... ... ... Mach weiter ... Ich weiß, dass dein Kampfgeist heiß brennt. Der deines ganzen Teams auch.']]);
  e4('e4_lucian',
    [['Lucian', 'Ah, du kommst genau zur rechten Zeit. Ich habe gerade ein Buch zu Ende gelesen. Erlaube mir, mich vorzustellen. Ich bin Lucian. Ich setze auf Psycho-Pokémon.'], ['Lucian', 'Ich muss sagen, dass du schon großartig bist, weil du es bis hierher geschafft hast. Man sagt, ich sei der Stärkste der Top Vier. Ich fürchte, ich muss alles geben, um diesem Ruf gerecht zu werden.']],
    [['Lucian', 'Glückwunsch. Du hast die Top Vier besiegt. Aber damit ist die Pokémon Liga noch nicht vorbei. Es bleibt noch der Champ. Ich sollte dich warnen: Der Champ ist weit stärker als die Top Vier. Nun geh. Tritt durch die Tür zu deinem letzten Kampf.']],
    [['Lucian', 'Ich lese Bücher, bis der nächste Herausforderer kommt. Das beruhigt meine Nerven, damit ich in jeder Lage die Ruhe bewahre.']]);

  // ================================================================ Raum des Champs: Cynthia
  {
    const C = 'champion_room';
    Object.assign(npc(C, 'cynthia_champ') || {}, { trainer: undefined, show: '!champ_cyn_gone' });
    TRAINERS.champ_cynthia = { ...TRAINERS.champ_cynthia, sight: 0, intro: [], win: [], after: [] };
    const h = MAPS[C]?.height || 11;
    trig(C, [{ x: 0, y: h - 3, w: MAPS[C]?.width || 11, h: 1, when: '!beat_champ_cynthia', script: 'champIntro' }]);
    SCRIPTS.champIntro = [
      { me: { to: 'cynthia_champ' } },
      { if: 'champion',
        then: [['Cynthia', 'Ein Blick auf dich verrät mir vieles über dich. Gemeinsam haben du und deine Pokémon jede Herausforderung gemeistert, so schwer sie auch war. Das heißt, dass du auch deine eigenen Schwächen überwunden hast. Die Kraft, die du dabei gewonnen hast ... Ich kann sie spüren. Genug geredet. Kommen wir zu dem, weshalb du hier bist. Ich, Cynthia, nehme als Champ der Pokémon Liga deine Herausforderung an! Ich werde dich nicht schonen!']],
        else: [['Cynthia', 'Ist es dir gut ergangen? Danke für den Kraterberg. Und für die Zerrwelt. Ich bin dir wirklich dankbar. Gemeinsam haben du und deine Pokémon jede Herausforderung gemeistert, so schwer sie auch war. Das heißt, dass du auch deine eigenen Schwächen überwunden hast.'], ['Cynthia', 'Die Kraft, die du dabei gewonnen hast ... Ich spüre, wie sie von dir ausgeht. Aber genug geredet. Kommen wir zu dem, weshalb du hier bist. Als Champ der Pokémon Liga nehme ich deine Herausforderung an!']] },
      { battle: 'champ_cynthia' },
      ['Cynthia', 'Das war hervorragend. Wirklich, ein herausragender Kampf. Du hast deinen Pokémon die Unterstützung gegeben, die sie brauchten, um ihre ganze Kraft zu entfalten. Und du hast sie mit Gewissheit zum Sieg geführt. Du hast Leidenschaft und kühle Berechnung zugleich.'],
      ['Cynthia', 'Gemeinsam können du und deine Pokémon jede Herausforderung meistern, die sich euch in den Weg stellt. Das ist mein Eindruck aus unserem Kampf. Ich freue mich, dass ich bei der Krönung des neuen Champs von Sinnoh dabei sein durfte!'],
      ['Cynthia', 'Komm mit. Hier entlang.'],
      { walk: 'cynthia_champ', to: { door: 'hall_of_fame' } },
      { flag: 'champ_cyn_gone', quiet: true },
      { me: 'uu' },
      { warp: ['hall_of_fame', 5, 7, 'up'] }
    ];
  }

  // ================================================================ Ruhmeshalle mit Cynthia und Prof. Eibe
  {
    const H = 'hall_of_fame';
    put(H, { id: 'cynthia_hof', x: 4, y: 3, dir: 'down', look: 'cynthia', name: 'Cynthia' });
    put(H, { id: 'rowan_hof', x: 6, y: 3, dir: 'down', look: 'prof', name: 'Prof. Eibe', show: 'hof_rowan' });
    const old = SCRIPTS.hallOfFame || [];
    const home = old.slice(old.findIndex((x) => x && x.warp));
    SCRIPTS.hallOfFame = [
      ['Cynthia', 'Der Raum hier ist die Ruhmeshalle ...'],
      { flag: 'hof_rowan' },
      ['Prof. Eibe', '@P! Dein letzter Kampf war großartig!'],
      { face: 'cynthia_hof', dir: 'rowan_hof' },
      ['Cynthia', 'Oh, hallo, Professor Eibe.'],
      { face: 'rowan_hof', dir: 'player' },
      ['Prof. Eibe', 'Hm! Ein Kind, das ich für mein Pokédex-Projekt angeworben habe, ist bis hierher gekommen ... Da ist es nur natürlich, dass ich komme und diesen großen Triumph miterlebe. @P! Ich sollte dich wohl nicht mehr Kind nennen. Du bist ein echter Champ geworden!'],
      ['Cynthia', 'Professor, Sie freuen sich immer noch über die Begeisterung, die Kinder in Ihre Forschung bringen, nicht wahr?'],
      { if: 'champion',
        then: [['Prof. Eibe', 'Ganz gleich, wie oft ich hierherkomme, ich stehe jedes Mal aufrechter als sonst.'], ['Cynthia', 'Das ist ganz natürlich, Professor. Dieser Raum ist ein Vermächtnis der Hoffnungen, Träume und Mühen von Pokémon und ihren Trainern.']],
        else: [['Prof. Eibe', 'Es ist lange her, seit ich diesen Raum zuletzt betreten habe ...'], ['Cynthia', 'Wenn Sie zuletzt hier waren, als ich Champ wurde, dann ist das tatsächlich eine ganze Weile her.']] },
      { face: 'cynthia_hof', dir: 'player' },
      ['Cynthia', '@P, willkommen in der Ruhmeshalle. Hier werden eure Namen für die Nachwelt festgehalten. Was ihr hier hinterlasst, sind die Erinnerungen an euer bisheriges Abenteuer.'],
      ['Cynthia', 'Es ist Zeit, eure Namen festzuhalten. Deinen und den deiner Pokémon. Denk daran: Deine Pokémon sind Partner, die mit dir durch viele harte Kämpfe gewachsen sind. Diese Maschine hält deinen Erfolg für immer fest.'],
      { me: 'uuu' },
      { heal: true },
      [null, 'Dein Team wird in der Ruhmeshalle verewigt.'],
      { flag: 'champion' },
      [null, 'Du bist Champ der Pokémon Liga Sinnoh!'],
      ...home
    ];
  }
}
