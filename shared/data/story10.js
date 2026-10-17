// Szenen nach dem Original: Abläufe, Figuren und Gespräche folgen den Skripten von Platin
// (pret/pokeplatinum, res/field/scripts). Figuren laufen sichtbar (Szenenschritte walk, me, face, wait,
// siehe server/game/scenes.js). Texte sind eigene deutsche Fassungen nah am Original.
// applyStory10 läuft nach applyOrigStory: Positionen stehen hier in Koordinaten der Originalkarten
// (G(karte, x, z) rechnet die globalen Koordinaten der Oberwelt aus pret in lokale um).
const say = (who, text) => [[who, text]];

export function applyStory10({ TRAINERS, SCRIPTS, NPCS, TRIGGERS, MAPS, ORIG_ON }) {
  const G = (map, gx, gz) => { const o = MAPS[map]?.orig; return o && o.m === 0 ? [gx - o.x, gz - o.z] : [gx, gz]; };
  const npc = (map, id) => (NPCS[map] || []).find((n) => n.id === id);
  const drop = (map, ...ids) => { if (NPCS[map]) NPCS[map] = NPCS[map].filter((n) => !ids.includes(n.id)); };
  const put = (map, n) => { drop(map, n.id); (NPCS[map] ||= []).push(n); };
  const set = (map, id, fields) => { const n = npc(map, id); if (n) Object.assign(n, fields); return n; };
  const trig = (map, list, ...dropScripts) => {
    TRIGGERS[map] = [...(TRIGGERS[map] || []).filter((t) => !dropScripts.includes(t.script) && !list.some((x) => x.script === t.script)), ...list];
  };
  const at = (map, gx, gz, w = 1, h = 1) => { const [x, y] = G(map, gx, gz); return { x, y, w, h }; };
  if (!ORIG_ON) return; // Ohne Originalkarten bleibt die bisherige Fassung

  // ================================================================ Zweiblattdorf
  // Zimmer: Fernsehsendung „Fragt Prof. Eibe!“, Barry stürmt herein, will zu Prof. Eibe
  SCRIPTS.intro = [
    [null, 'Die Region Sinnoh. Ein Land aus Seen, Bergen und uralten Legenden.'],
    ['Fernseher', '... Das war unsere Sondersendung „Fragt Prof. Eibe!“. Präsentiert von Jubelstadt-TV im landesweiten Netz!'],
    ['Fernseher', 'Bis nächste Woche, gleiche Zeit, gleicher Sender!'],
    { flag: 'intro_tv' },
    { emote: 'barry_room' },
    ['Barry', 'Da bist du ja!'],
    { walk: 'barry_room', to: 'player', fast: true },
    ['Barry', 'He, @P! Hast du gerade den Fernseher gesehen? Klar hast du! Prof. Eibe ist doch dieser total wichtige Typ, der Pokémon erforscht, oder?'],
    ['Barry', 'Dann hat er bestimmt jede Menge Pokémon. Wenn wir ihn fragen, schenkt er uns sicher welche!'],
    { emote: 'barry_room' },
    { walk: 'barry_room', path: 'll', fast: true },
    ['Barry', 'Oh, he! Ist das ein neuer PC?!'],
    { wait: 500 },
    ['Barry', 'Äh ... Wo war ich?'],
    { walk: 'barry_room', to: 'player', fast: true },
    ['Barry', 'Ach ja, genau! Wir gehen zu Prof. Eibe und holen uns Pokémon. Ich warte draußen auf dich, okay, @P?'],
    ['Barry', 'Wenn du zu spät kommst, kostet dich das 10 Millionen Strafe!'],
    { flag: 'barry_room' },
    { flag: 'intro' }
  ];
  set('twinleaf_home_2f', 'barry_room', { show: ['intro_tv', '!barry_room'] });

  // Erdgeschoss: Mama erzählt, dass Barry schon weg ist, an der Tür warnt sie vor dem hohen Gras
  SCRIPTS.momBarryLeft = [
    { emote: 'mom' },
    { walk: 'mom', to: 'player' },
    ['Mama', '@P! Barry ist schon losgerannt. Ich weiß nicht, worum es ging, aber er hatte es furchtbar eilig!'],
    { walk: 'mom', to: 'home' },
    { face: 'mom', dir: 'up' },
    { flag: 'mom_talk1' }
  ];
  SCRIPTS.momGrass = [
    { face: 'mom', dir: 'player' },
    ['Mama', 'Tschüss, @P! Pass gut auf dich auf!'],
    ['Mama', 'Ach ja! @P! Geh nicht ins hohe Gras. Wilde Pokémon könnten dich angreifen.'],
    ['Mama', 'Mit einem eigenen Pokémon wäre das kein Problem, aber du hast ja keins, also ... Pass auf dich auf, Schatz!'],
    { flag: 'mom_warned' }
  ];
  trig('twinleaf_home_1f', [
    { x: 9, y: 3, w: 3, h: 2, when: ['intro', '!mom_talk1', '!has_starter'], script: 'momBarryLeft' },
    { x: 6, y: 9, w: 1, h: 1, when: ['intro', '!mom_warned', '!has_starter'], script: 'momGrass' }
  ]);
  SCRIPTS.mom = [
    { if: '!has_starter', then: [['Mama', 'Barry wartet doch bestimmt schon auf dich. Du kennst ihn ja, er ist so ungeduldig!']],
      else: [{ if: '!lab_done', then: [['Mama', 'Geh zu Prof. Eibe nach Sandgemme und bedank dich ordentlich für dein Pokémon!']],
        else: [['Mama', 'Ruh dich kurz aus, @P.'], { heal: true }, ['Mama', 'So, deine Pokémon sehen wieder richtig munter aus. Viel Spaß auf deinem Abenteuer!']] }] }
  ];

  // Vor Barrys Haus: Rums! Barry rennt in dich hinein, hat aber etwas vergessen
  {
    const [dx, dy] = G('twinleaf_town', 105, 875);
    put('twinleaf_town', { id: 'barry_tw', x: dx, y: dy, dir: 'down', look: 'rival', name: 'Barry', show: ['barry_out', '!barry_thud'], still: false, fromDoor: true });
    SCRIPTS.barryThud = [
      { flag: 'barry_out', quiet: true },
      { walk: 'barry_tw', path: 'd', fast: true },
      { me: 'd' }, { face: 'me', dir: 'up' },
      [null, 'Rums!!'],
      ['Barry', 'Was soll das denn?! Oh, he, @P! Ich gehe zu Prof. Eibe! Du solltest auch mitkommen! Und zwar schnell!'],
      { walk: 'barry_tw', path: 'rrrr', fast: true },
      { walk: 'barry_tw', path: 'llll', fast: true },
      { face: 'barry_tw', dir: 'down' },
      ['Barry', 'Ach Mann! Ich hab was vergessen!'],
      { walk: 'barry_tw', to: { door: 'twinleaf_rival_house' }, fast: true },
      { flag: 'barry_thud', quiet: true }
    ];
    trig('twinleaf_town', [{ ...at('twinleaf_town', 105, 876), when: ['intro', '!barry_thud', '!has_starter'], script: 'barryThud' }]);
  }
  set('twinleaf_rival_house', 'barry_mom', { talk: [{ if: '!has_starter', then: say('Barrys Mutter', 'Der Junge ist mal wieder losgeschossen, wie immer. Ich schätze, er ist schon draußen auf Route 201. Er kann einfach nicht stillsitzen. Von wem er das wohl hat?'),
    else: [{ if: '!lab_done', then: say('Barrys Mutter', 'Ihr habt von Prof. Eibe Pokémon bekommen? Wie schön! Jetzt seid ihr zwei mit euren Pokémon richtig gute Freunde.'),
      else: say('Barrys Mutter', 'Barry ist wieder losgezogen, wie immer. Für ihn gibt es keinen Stillstand. Ob er seinen Vater so sehr bewundert?') }] }] });

  // ================================================================ Route 201
  // Barry will durchs hohe Gras rennen, Prof. Eibe hält die beiden auf, Lucia bringt den Koffer
  {
    const [rx, ry] = G('route_201', 105, 853);
    set('route_201', 'barry_201', { show: '!barry_201' });
    put('route_201', { id: 'eibe_201', x: rx, y: ry, dir: 'right', look: 'prof', name: 'Prof. Eibe', show: ['eibe_201', '!eibe_201_left'], talk: say('Prof. Eibe', 'Nur zu! Öffne den Koffer und wähle ein Pokémon!') });
    put('route_201', { id: 'lucia_201', x: rx, y: ry + 1, dir: 'right', look: 'assistant', name: 'Lucia', show: ['lucia_201', '!lucia_201_left'], talk: say('Lucia', 'Die Pokémon im Koffer sind wirklich etwas Besonderes.') });
    SCRIPTS.route201 = [
      { emote: 'barry_201' },
      ['Barry', 'Zu langsam!'],
      { walk: 'barry_201', to: 'player', fast: true },
      ['Barry', 'Na schön! Dann ab zu Prof. Eibes Labor!'],
      { walk: 'barry_201', path: 'u' }, { me: 'u' },
      ['Barry', '...'],
      { face: 'barry_201', dir: 'player' },
      ['Barry', 'Was? Nicht ins hohe Gras, meinst du? Keine Sorge! Kein Problem! Dass wir keine Pokémon haben, ist doch egal. Vertrau mir, ich hab eine Idee!'],
      ['Barry', 'Pass auf. Du weißt doch, dass wilde Pokémon herausspringen, wenn man durchs hohe Gras läuft?'],
      ['Barry', 'Also flitzen wir einfach zum nächsten Grasstück, bevor ein wildes Pokémon auftauchen kann! Wenn wir immer weiterrennen, kommen wir ohne eine einzige Begegnung bis nach Sandgemme! Bleib dicht bei mir!'],
      ['Barry', 'Okay, los geht\'s! Auf die Plätze ...'],
      { walk: 'barry_201', path: 'u', fast: true },
      ['???', 'Halt!!!'],
      { face: 'barry_201', dir: 'left' }, { face: 'me', dir: 'left' },
      { flag: 'eibe_201' },
      { walk: 'eibe_201', to: 'player' },
      ['Prof. Eibe', 'Ihr zwei habt doch gar keine Pokémon! Was hat es dann zu bedeuten, dass ihr ins hohe Gras wollt?!'],
      ['Barry', '... ...'],
      ['Prof. Eibe', '... ... ... ...'],
      { face: 'barry_201', dir: 'player' },
      ['Barry', 'He, @P. Dieser alte Mann ... Das ist doch Prof. Eibe, oder? Was macht der denn hier ...?'],
      { walk: 'eibe_201', path: 'l' },
      ['Prof. Eibe', '... ... Sie wollten ins hohe Gras, weil sie Pokémon haben möchten ... Hmm ... Was soll ich nur tun ...?'],
      ['Prof. Eibe', 'Ihre Welt würde sich sicher verändern, wenn sie Pokémon begegnen ... Ist es richtig, sie auf diesen Weg zu schicken ...? ... ...'],
      { walk: 'eibe_201', to: 'player' },
      ['Prof. Eibe', 'Ihr zwei. Liebt ihr Pokémon wirklich?'],
      { ask: ['Ja', 'Nein'], yes: [], no: [
        { face: 'barry_201', dir: 'player' },
        ['Barry', 'He, Moment mal! Was redest du denn da?!'],
        ['Prof. Eibe', 'Ähem! Das habe ich nicht recht verstanden. Darum frage ich noch einmal: Liebt ihr Pokémon wirklich?']
      ] },
      ['Barry', 'Ich auch! Ich liebe Pokémon auch!'],
      ['Prof. Eibe', 'Ich frage euch noch ein letztes Mal. Ihr zwei. Liebt ihr Pokémon wirklich?'],
      ['Barry', 'Was?! Du kannst hundertmal fragen! Die Antwort ändert sich nie! Wir antworten beide hundertmal: Wir lieben Pokémon!'],
      { face: 'barry_201', dir: 'player' },
      ['Barry', 'Stimmt\'s, @P?'],
      { ask: ['Ja', 'Nein'], yes: [], no: [['Barry', 'Der Witz wird langsam alt! Na los, sag es!']] },
      ['Prof. Eibe', '... Zwei leichtsinnige Kinder, die ohne eigene Pokémon ins hohe Gras wollen ...? Mir macht Sorgen, was solche Leute mit Pokémon anstellen würden.'],
      ['Barry', '... Äh ... Also, ich ... ... ... Dann vergiss mich eben, aber gib meinem Freund hier ein Pokémon! Ich war es doch, der unbedingt ins hohe Gras wollte!'],
      ['Prof. Eibe', '! Wie großherzig von dir ... Nun gut! Ich vertraue euch beiden Pokémon an! Verzeiht mir diese kleine Prüfung.'],
      ['Prof. Eibe', 'Aber! Ihr müsst mir versprechen, euch nie wieder leichtsinnig in Gefahr zu bringen. Nun denn ... Hm? Wo ist denn ...?'],
      { wait: 600 },
      { flag: 'lucia_201' },
      { walk: 'lucia_201', to: { npc: 'eibe_201' } },
      ['Lucia', 'Professor Eibe! Ihr habt Euren Koffer am See vergessen!'],
      { face: 'eibe_201', dir: 'lucia_201' },
      ['Lucia', 'Oh? Ist hier etwas passiert?'],
      ['Prof. Eibe', 'Ah! Da ist er ja! Gut gemacht, Lucia. Ich wollte diesen beiden gerade eigene Pokémon anvertrauen.'],
      ['Lucia', 'Wie bitte?! Diese Pokémon sind kaum zu ersetzen. Wollt Ihr sie wirklich einfach weggeben?'],
      ['Prof. Eibe', 'Hm! Wir leben Seite an Seite mit den Pokémon. Es kommt der Moment, an dem Menschen Pokémon begegnen sollten. Es gibt eine Welt, die man gemeinsam erkunden sollte.'],
      ['Prof. Eibe', 'Für die beiden ist heute dieser Moment. Und der Ort ist genau hier.'],
      { face: 'eibe_201', dir: 'player' },
      ['Prof. Eibe', 'Nur zu! Öffne den Koffer und wähle ein Pokémon!'],
      { face: 'barry_201', dir: 'player' },
      ['Barry', 'Echt jetzt?! Prof. Eibe! Ich kann es nicht glauben! Ich freu mich so, dass ich gar nicht mehr ernst gucken kann!'],
      ['Barry', 'He, @P. Du darfst zuerst wählen. Ich bin ja quasi schon erwachsen, da muss ich Stil zeigen.'],
      [null, 'Im Koffer liegen drei Pokébälle.'],
      { starter: true },
      { face: 'eibe_201', dir: 'player' },
      ['Barry', 'Dann wähle ich dich! Ich nehme dieses Pokémon hier!'],
      ['Prof. Eibe', 'Sehr gut! Ihr habt beide ein gutes Pokémon gewählt, wie es scheint. Und nun hört gut zu!'],
      ['Prof. Eibe', 'Die Pokémon, die man euch anvertraut hat, kennen die Welt noch nicht. Darin sind sie euch ganz ähnlich. Ich hoffe, ihr beiden Neulinge kommt gut miteinander zurecht.'],
      ['Prof. Eibe', 'Wenn ihr Schwierigkeiten habt, besucht mich in meinem Labor in Sandgemme. Und nun machen wir uns auf den Weg.'],
      { flag: 'eibe_201_left' },
      ['Lucia', 'Professor! Wartet bitte auf mich!'],
      ['Lucia', 'Entschuldigung ... Lasst mich bitte durch.'],
      { flag: 'lucia_201_left' },
      { flag: 'eibe_left', quiet: true },
      ['Barry', 'Wie findest du das? Prof. Eibe ist echt nett. Im Fernsehen wirkt er so streng und furchteinflößend.'],
      { wait: 600 },
      { walk: 'barry_201', to: 'player', fast: true },
      ['Barry', 'Hehe, @P! Jetzt haben wir beide Pokémon. Da gibt es nur eins zu tun, oder? Bist du bereit?'],
      { ask: ['Ja', 'Nein'], yes: [], no: [['Barry', 'Was soll das denn? Sei nicht so! Jetzt aber!']] },
      ['Barry', 'Das wollte ich schon immer mal sagen ... Endlich ist es so weit! @P! Ich fordere dich zum Kampf heraus!'],
      { battle: 'rival1' },
      ['Barry', 'Puh! Lass uns nach Hause gehen. Nach dem Kampf bin ich total erledigt. Mein Pokémon braucht auch eine Pause. Bis dann, @P!'],
      { flag: 'barry_201' },
      { heal: true },
      { warp: ['twinleaf_home_1f', 6, 9, 'up'] },
      { wait: 500 },
      { walk: 'mom', to: 'player' },
      ['Mama', 'Was ist denn los, Schatz? ... Wow. Das ist euch passiert? Da hattet ihr beide aber Glück, dass ihr Prof. Eibe getroffen habt.'],
      ['Mama', 'Gar nicht auszudenken, was die wilden Pokémon mit euch angestellt hätten ...'],
      ['Mama', '@P, geh zu Prof. Eibe und bedank dich ordentlich für dein Pokémon. Sein Labor ist doch in Sandgemme, oder? Mit deinem eigenen Pokémon ist das hohe Gras jetzt kein Problem mehr.'],
      ['Mama', 'Ach, ich weiß was! @P, zieh die hier an.'],
      { give: 'running-shoes' },
      ['Mama', 'Bis nach Sandgemme ist es ja schon ein kleines Abenteuer. Mit den Laufschuhen kommst du viel schneller voran. Mal sehen, was in der Anleitung steht ...'],
      ['Mama', '„Halte die Umschalttaste gedrückt und flitze schneller als je zuvor!“ Na, ist das nicht praktisch?'],
      { walk: 'mom', to: 'home' }, { face: 'mom', dir: 'up' }
    ];
    trig('route_201', [{ ...at('route_201', 110, 857, 4, 1), when: ['intro', '!barry_201'], script: 'route201' }]);
  }

  // Route 201 danach: Barry will zum See, um das legendäre Pokémon für den Professor zu fangen
  {
    const [bx, by] = G('route_201', 112, 855);
    put('route_201', { id: 'barry_201b', x: bx, y: by, dir: 'down', look: 'rival', name: 'Barry', show: ['barry_201', '!barry_lake_go'] });
    SCRIPTS.barryToLake = [
      { emote: 'barry_201b' },
      { walk: 'barry_201b', to: 'player', fast: true },
      ['Barry', 'Zu langsam! @P, ich hab keine Lust mehr zu warten! Ich will zu Prof. Eibe und mich richtig bei ihm bedanken.'],
      ['Barry', 'Und da hatte ich eine geniale Idee. Hör zu! Du kennst doch den See, an dem wir immer spielen? Dort soll ein legendäres Pokémon leben.'],
      ['Barry', 'Genau! Wir fangen dieses Pokémon. Darüber freut sich Prof. Eibe bestimmt!'],
      ['Barry', 'Du und ich zusammen, da gibt es nichts, wovor wir Angst haben müssen! Der See liegt im Westen, hinter Zweiblattdorf. Ich laufe vor!'],
      { flag: 'barry_lake_go' }
    ];
    SCRIPTS.notThatWay = [['Barry', 'He, @P! Der See liegt nicht in dieser Richtung! Er ist im Westen, über Zweiblattdorf hinaus!'], { back: true }];
    trig('route_201', [
      { ...at('route_201', 110, 857, 4, 2), when: ['barry_201', '!barry_lake_go'], script: 'barryToLake' },
      { x: (TRIGGERS.route_201 || []).find((t) => t.script === 'noPokemon')?.x ?? 63, y: (TRIGGERS.route_201 || []).find((t) => t.script === 'noPokemon')?.y ?? 10, w: 1, h: (TRIGGERS.route_201 || []).find((t) => t.script === 'noPokemon')?.h ?? 6, when: ['has_starter', '!lake_done'], script: 'notThatWay' }
    ]);
  }

  // ================================================================ See der Wahrheit
  {
    const [lx, ly] = G('verity_lakefront', 80, 845);
    put('verity_lakefront', { id: 'barry_vl', x: lx + 1, y: ly + 1, dir: 'up', look: 'rival', name: 'Barry', show: ['barry_lake_go', '!lake_done', '!barry_at_lake'] });
    SCRIPTS.atTheLake = [
      { walk: 'barry_vl', to: 'player', fast: true },
      ['Barry', 'Super! Wir sind am See! Mach dich bereit, denn jetzt fangen wir das legendäre Pokémon!'],
      ['Barry', 'Vertrau mir. Es ist hier. Das steht sogar auf dem Schild!'],
      { flag: 'barry_at_lake', quiet: true },
      { warp: ['lake_verity', 46, 53, 'up'] }
    ];
    trig('verity_lakefront', [{ ...at('verity_lakefront', 80, 844, 2, 1), when: ['barry_lake_go', '!lake_done', '!barry_at_lake'], script: 'atTheLake' }]);

    // Am See: Zyrus spricht über Zeit und Raum und geht, dann ruft das Pokémon des Sees
    drop('lake_verity', 'eibe_lake', 'lucia_lake');
    set('lake_verity', 'zyrus', { x: 48, y: 43, dir: 'up', show: ['barry_lake_go', '!zyrus_lake'] });
    set('lake_verity', 'barry_lake', { x: 47, y: 53, dir: 'up', show: ['barry_at_lake', '!lake_done'] });
    SCRIPTS.lake = [
      { face: 'barry_lake', dir: 'up' },
      ['Barry', 'Was ist denn da los ...?'],
      { wait: 400 },
      ['Zyrus', '... Die fließende Zeit ... Der sich ausdehnende Raum ... Eines Tages werde ich mir alles zu eigen machen ...'],
      ['Zyrus', 'Mein Name ist Zyrus. Merkt ihn euch ... Bis dahin schlaf, solange du noch kannst, legendäres Pokémon des Seegrunds ...'],
      { wait: 500 },
      { face: 'zyrus', dir: 'down' },
      { walk: 'zyrus', to: 'player' },
      ['Zyrus', 'Lasst mich vorbei. Geht zur Seite.'],
      { flag: 'zyrus_lake' },
      { wait: 600 },
      { face: 'barry_lake', dir: 'player' },
      ['Barry', 'Was war das denn? Komischer Typ ...'],
      { wait: 400 },
      ['Barry', 'Okay, @P! Fangen wir das legendäre Pokémon!'],
      { face: 'barry_lake', dir: 'up' }, { face: 'me', dir: 'up' },
      ['???', 'Kyauuun!'],
      { emote: 'barry_lake' },
      ['Barry', '! Hast du das gehört, @P?! Das war das legendäre Pokémon! Das muss es gewesen sein! Okay! Das ist unsere Chance! Fangen wir es!'],
      { face: 'barry_lake', dir: 'player' },
      ['Barry', '... Moment! Was ...?! Wir haben ja gar nichts dabei! Pokébälle, meine ich! Ohne Pokébälle können wir keine Pokémon fangen und mitnehmen!'],
      ['Barry', 'Ob Prof. Eibe uns welche gibt, wenn wir ihn fragen? Er hat doch gesagt, wir sollen in sein Labor kommen, wenn wir etwas brauchen.'],
      ['Barry', 'Okay, @P! Wettrennen! Wer zuerst im Labor in Sandgemme ist, hat gewonnen!'],
      { flag: 'lake_done' }
    ];
    trig('lake_verity', [{ x: 44, y: 52, w: 6, h: 1, when: ['barry_at_lake', '!lake_done'], script: 'lake' }]);
  }

  // ================================================================ Sandgemme
  // Lucia holt dich am Ortseingang ab, Barry stürmt aus dem Labor, dann Pokédex und Rundgang
  {
    const [lx, ly] = G('sandgem_town', 168, 845);
    const [dx, dy] = G('sandgem_town', 168, 842);
    put('sandgem_town', { id: 'lucia_sg', x: lx, y: ly, dir: 'left', look: 'assistant', name: 'Lucia', show: ['lake_done', '!lab_done', '!sg_lucia_in'] });
    put('sandgem_town', { id: 'barry_sg', x: dx, y: dy, dir: 'down', look: 'rival', name: 'Barry', show: ['sg_barry', '!sg_barry_gone'], fromDoor: true });
    SCRIPTS.needLab = [
      { emote: 'lucia_sg' },
      { walk: 'lucia_sg', to: 'player' },
      ['Lucia', 'Oh! Da bist du ja! Komm bitte mit! Der Professor wartet schon!'],
      { walk: 'lucia_sg', to: { at: [dx, dy + 2] } },
      { me: { to: 'lucia_sg' } },
      { face: 'lucia_sg', dir: 'up' }, { face: 'me', dir: 'up' },
      ['Lucia', 'Hier ist es! Unser Pokémon-Forschungslabor! Gehen wir rein ...'],
      { flag: 'sg_barry', quiet: true },
      { walk: 'barry_sg', path: 'd', fast: true },
      [null, 'Rums!!'],
      ['Barry', 'Was soll ... Ach, du bist es, @P! Dieser alte Mann ... Der ist gar nicht so gruselig, eher total durchgeknallt!'],
      ['Barry', 'Ach, egal, @P. Ich bin weg. Bis später!'],
      { walk: 'barry_sg', to: 'exit', fast: true },
      { flag: 'sg_barry_gone', quiet: true },
      { face: 'lucia_sg', dir: 'player' },
      ['Lucia', 'Wow, was war das denn? Dein Freund ist ja wirklich ungeduldig. Na ja ... Gehen wir rein.'],
      { walk: 'lucia_sg', to: { door: 'sandgem_lab' } },
      { flag: 'sg_lucia_in', quiet: true },
      { warp: ['sandgem_lab', 7, 13, 'up'] },
      { run: 'lab' }
    ];
    TRIGGERS.sandgem_town = (TRIGGERS.sandgem_town || []).filter((t) => t.script !== 'needLab');
    trig('sandgem_town', [{ ...at('sandgem_town', 164, 842, 1, 6), when: ['lake_done', '!lab_done', '!sg_lucia_in'], script: 'needLab' }]);
    // Ohne Besuch am See schickt Barry dich zurück (wie in Platin folgt er dir bis dahin)
    SCRIPTS.sgTooEarly = [[null, 'Barry ruft hinter dir: „He, @P! Wir wollten doch zuerst zum See!“'], { back: true }];
    trig('sandgem_town', [{ ...at('sandgem_town', 163, 842, 1, 6), when: ['has_starter', '!lake_done'], script: 'sgTooEarly' }]);
  }

  // Labor: Prof. Eibe sieht dein Pokémon an und vertraut dir den Pokédex an
  set('sandgem_lab', 'lucia', { show: 'sg_lucia_in' });
  SCRIPTS.lab = [
    { walk: 'eibe', to: 'player' },
    ['Prof. Eibe', 'Sieh mal einer an, wer da ist. @P, nicht wahr? Dann wollen wir uns dein Pokémon einmal ansehen.'],
    ['Prof. Eibe', '... Hmm ... Ich verstehe ... Dieses Pokémon scheint ziemlich glücklich zu sein.'],
    ['Prof. Eibe', 'Als ich euch beide ohne Pokémon ins hohe Gras gehen sah, war ich entsetzt. Ich war fassungslos über diese leichtsinnigen Kinder.'],
    ['Prof. Eibe', 'Aber jetzt überraschst du mich auf ganz andere Weise. Zwischen dir und deinem Pokémon wächst bereits eine Bindung. Darum bitte ich dich: Pass gut auf dein Pokémon auf.'],
    ['Lucia', 'Ich bin so froh, dass du lieb zu Pokémon bist! Wenn nicht, müsste ich ... Oh, das kann ich gar nicht aussprechen ...'],
    ['Prof. Eibe', 'Ähem! Kommen wir zur Sache. Es gibt etwas, worum ich dich bitten möchte.'],
    ['Prof. Eibe', 'Lass mich mich zuerst richtig vorstellen. Mein Name ist, wie du weißt, Eibe. Ich erforsche Pokémon.'],
    ['Prof. Eibe', 'Zuallererst möchte ich genau wissen, welche Pokémon in der Region Sinnoh leben. Dafür muss man mit dem Pokédex Daten sammeln.'],
    ['Prof. Eibe', 'Darum bitte ich dich. Ich möchte dir diesen Pokédex anvertrauen. Wirst du damit Daten über alle Pokémon in Sinnoh für mich sammeln?'],
    { ask: ['Ja', 'Nein'], yes: [], no: [['Prof. Eibe', '... ... ... ... Ich kann stundenlang hier stehen, ohne etwas zu sagen. Ich bin ein sehr geduldiger Mann. Also frage ich dich noch einmal: Wirst du die Daten aller Pokémon in Sinnoh für mich sammeln?']] },
    ['Prof. Eibe', 'Hm! Gute Antwort!'],
    [null, '@P erhält den Pokédex!'],
    { flag: 'dex' },
    ['Prof. Eibe', 'Dieser Pokédex ist ein hochmodernes Gerät. Er speichert automatisch Daten über jedes Pokémon, dem du begegnest. @P, ich bitte dich: Geh überallhin und triff jede Art von Pokémon in dieser Region!'],
    ['Lucia', 'Ich habe übrigens auch einen!'],
    ['Prof. Eibe', 'Als du mit deinem Pokémon Route 201 entlanggegangen bist, was hast du gefühlt? Ich lebe nun schon seit 60 langen Jahren. Und noch immer bin ich aufgeregt, wenn ich bei einem Pokémon bin.'],
    ['Prof. Eibe', 'Es gibt unzählige Pokémon auf dieser Welt. Also warten genauso viele aufregende Momente auf dich! Nun geh! @P, dein großes Abenteuer beginnt genau jetzt!'],
    { walk: 'lucia', to: 'player' },
    ['Lucia', 'Ich bin Lucia. Ich helfe dem Professor auch dabei, neue Seiten im Pokédex zu füllen. In gewisser Weise bin ich also genau wie du. Ich habe nur einen kleinen Vorsprung.'],
    ['Lucia', 'Ich bringe dir gern Dinge bei. Schön, dich kennenzulernen, @P!'],
    { flag: 'lab_done' }
  ];
  trig('sandgem_lab', [], 'lab');
  SCRIPTS.eibe = [
    { if: '!badge_coal', then: [['Prof. Eibe', 'Nur zu! @P, dein großes Abenteuer wartet auf dich!']],
      else: [['Prof. Eibe', 'Ah, @P! Du bist gekommen, um mir deinen Fortschritt beim Pokédex zu zeigen? Hervorragende Arbeit! Die Pokémon Sinnohs füllen deinen Pokédex. Das hilft mir sehr bei meiner Forschung über die Entwicklung.']] }
  ];

  // Vor dem Labor: Prof. Eibe schenkt die TM27, Lucia zeigt dir Pokémon-Center und Markt
  {
    const [dx, dy] = G('sandgem_town', 168, 842);
    const [cx, cy] = G('sandgem_town', 177, 842);
    const [mx, my] = G('sandgem_town', 187, 842);
    put('sandgem_town', { id: 'eibe_sg', x: dx, y: dy, dir: 'down', look: 'prof', name: 'Prof. Eibe', show: ['sg_eibe_out', '!sg_eibe_in'], fromDoor: true });
    put('sandgem_town', { id: 'lucia_sg2', x: dx + 1, y: dy + 1, dir: 'left', look: 'assistant', name: 'Lucia', show: ['lab_done', '!sg_tour', '!got_balls'] });
    SCRIPTS.sgTour = [
      [null, '„@P!“'],
      { face: 'me', dir: 'up' },
      { flag: 'sg_eibe_out', quiet: true },
      { walk: 'eibe_sg', path: 'd' },
      ['Prof. Eibe', 'Ich habe hier noch etwas Gutes. Das solltest du auch mitnehmen.'],
      { give: 'tm27' },
      ['Prof. Eibe', 'Das ist eine Technische Maschine, kurz TM. Diese enthält die Attacke Rückkehr. Mit einer TM bringst du einem Pokémon sofort eine Attacke bei.'],
      ['Prof. Eibe', 'Rückkehr wird stärker, je mehr dich dein Pokémon mag. Ob du die TM benutzt, entscheidest natürlich du. Ich wünsche dir eine schöne Reise.'],
      { walk: 'eibe_sg', to: { door: 'sandgem_lab' } },
      { flag: 'sg_eibe_in', quiet: true },
      { wait: 500 },
      { face: 'lucia_sg2', dir: 'player' },
      ['Lucia', 'Oh, wow. Ich wusste gar nicht, dass der Professor TMs hat. Ob er früher selbst Trainer war ...?'],
      ['Lucia', 'Okay, @P, ich bin jetzt deine Mentorin. Ich habe als Trainerin und als Assistentin des Professors ein bisschen mehr Erfahrung als du. Folge mir!'],
      { walk: 'lucia_sg2', to: { at: [cx + 1, cy + 1] } },
      { me: { to: 'lucia_sg2' } },
      { face: 'lucia_sg2', dir: 'player' },
      ['Lucia', 'Das Gebäude mit dem roten Dach ist das Pokémon-Center. Dort werden Pokémon geheilt, die im Kampf verletzt wurden. Ein Pokémon-Center findest du in fast jeder Stadt.'],
      { walk: 'lucia_sg2', to: { at: [mx + 1, my + 1] } },
      { me: { to: 'lucia_sg2' } },
      { face: 'lucia_sg2', dir: 'player' },
      ['Lucia', 'Das Gebäude mit dem blauen Dach hier ist der Pokémon-Supermarkt. Dort kannst du Items und Medizin kaufen und verkaufen.'],
      ['Lucia', '@P, als Trainer-Neuling kannst du noch nicht viele Waren kaufen. Lass dich davon nicht stören!'],
      ['Lucia', 'Ach, genau! @P ... Musst du deiner Familie nicht noch sagen, dass du dem Professor beim Pokédex hilfst? Vielleicht musst du weit weg, da sollte jemand Bescheid wissen.'],
      ['Lucia', 'Aber heil deine Pokémon vorher im Pokémon-Center. Dann ist alles viel weniger beängstigend. Okay, bis dann!'],
      { flag: 'sg_tour' }
    ];
    trig('sandgem_town', [{ ...at('sandgem_town', 168, 843), when: ['lab_done', '!sg_tour', '!got_balls'], script: 'sgTour' }]);
  }

  // Zuhause: Mama freut sich, Barrys Mutter bringt ein Paket für Barry
  {
    put('twinleaf_home_1f', { id: 'barry_mom_home', x: 6, y: 10, dir: 'up', look: 'mom', name: 'Barrys Mutter', show: ['parcel_mom', '!parcel'], fromDoor: true });
    SCRIPTS.momParcel = [
      { walk: 'mom', to: 'player' },
      ['Mama', 'Was ist denn, @P? ... Wow. Prof. Eibe hat dich um etwas so Großes gebeten? Okay, Schatz, dann gib alles! Deine Mama steht hinter dir!'],
      ['Mama', 'Eine Reise voller Abenteuer ... Ich beneide dich, Kleines. Und du bist ja nicht allein. Du hast deine Pokémon dabei. Ich würde am liebsten selbst gehen!'],
      ['Mama', 'War nur Spaß, Schatz! Ich komme allein gut zurecht, also geh und genieß dein Abenteuer! ... Aber komm ab und zu vorbei. Ich möchte sehen, welche Pokémon du gefangen hast.'],
      { flag: 'parcel_mom', quiet: true },
      { walk: 'barry_mom_home', path: 'u' },
      ['Barrys Mutter', 'Entschuldigung. Ist mein kleiner Barry hier?'],
      ['Mama', 'Oh? Nein, er ist nicht hier ...'],
      ['Barrys Mutter', 'Oh ... Dann ist er wohl schon weg ... Was mache ich nur? Der Junge hat etwas von einem Abenteuer gerufen und ist dann losgerannt. Er ist so ein Dickkopf und so leichtsinnig ... Ich wollte, dass er wenigstens das hier mitnimmt ...'],
      ['Mama', 'Keine Sorge, @P bringt es ihm. Nicht wahr, @P?'],
      { give: 'parcel' },
      ['Barrys Mutter', 'Mal überlegen ... So wie ich meinen Jungen kenne, ist er geradewegs nach Jubelstadt. Bitte bring das meinem Barry.'],
      ['Mama', 'Tschüss, @P! Viel Spaß auf deinem Abenteuer!'],
      { flag: 'parcel' },
      { walk: 'mom', to: 'home' }, { face: 'mom', dir: 'up' }
    ];
    trig('twinleaf_home_1f', [{ x: 3, y: 6, w: 6, h: 3, when: ['sg_tour', '!parcel', '!got_balls'], script: 'momParcel' }]);
  }

  // ================================================================ Route 202
  // Lucia schickt dich erst nach Hause, dann zeigt sie, wie man Pokémon fängt
  {
    const [lx, ly] = G('route_202', 174, 827);
    set('route_202', 'lucia_202', { x: lx, y: ly, dir: 'right', show: ['sg_tour', '!lucia_tip', '!got_balls'], talk: 'lucia202' });
    SCRIPTS.lucia202 = [
      { if: '!parcel', then: [
        { walk: 'lucia_202', to: 'player' },
        ['Lucia', '@P?! Hast du deiner Familie gesagt, dass du dem Professor hilfst? ... Hast du nicht, oder?'],
        ['Lucia', 'Ich weiß, dass du unbedingt alle möglichen Pokémon sehen willst. Aber deine Mama soll sich doch keine Sorgen machen, dass du einfach verschwunden bist.'],
        { back: true }
      ], else: [
        { walk: 'lucia_202', to: 'player' },
        ['Lucia', 'Ach ja, genau! @P, ich habe dir noch gar nicht gezeigt, wie man ein Pokémon fängt. Ich mache es dir vor, also schau gut zu, okay?'],
        [null, 'Aus dem Gras springt ein wildes Bidiza!'],
        [null, 'Lucia schickt ihr Pokémon in den Kampf und schwächt Bidiza mit einer Attacke. Dann wirft sie einen Pokéball ...'],
        [null, '... ... ... Gefangen! Bidiza wurde gefangen!'],
        ['Lucia', 'Hihi ... Siehst du? Ist doch toll, oder? Eigentlich ist es besser, die KP noch weiter zu senken als ich gerade. Ein gesundes Pokémon ist nämlich sehr schwer zu fangen.'],
        ['Lucia', 'Pokémon lassen sich auch leichter fangen, wenn du sie zum Beispiel mit einer Attacke einschlafen lässt. Okay, @P, für den Anfang gebe ich dir fünf Pokébälle!'],
        { give: 'poke-ball', count: 5 },
        { flag: 'got_balls' },
        ['Lucia', 'Mit vielen Pokémon im Team bist du auf langen Reisen sicherer. Und mit deinen Pokémon-Freunden macht es viel mehr Spaß. Okay, ich muss los. Tschüss!'],
        { flag: 'lucia_tip' }
      ] }
    ];
    trig('route_202', [{ ...at('route_202', 180, 825, 1, 5), when: ['sg_tour', '!lucia_tip', '!got_balls'], script: 'lucia202' }]);
  }
}
