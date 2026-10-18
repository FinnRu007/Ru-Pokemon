// Kapitel 7 nach den Originalskripten von Platin: Barry auf der Brücke von Fleetburg, Urs mit Stärke vor der Eiseninsel,
// Barry vor der Arena, Prof. Eibe in der Bibliothek, die Explosion am See der Kühnheit und Saturn in der Höhle.
export function applyStory16({ TRAINERS, SCRIPTS, NPCS, TRIGGERS, MAPS, ORIG_ON }) {
  if (!ORIG_ON) return;
  const G = (map, gx, gz) => { const o = MAPS[map]?.orig; return o && o.m === 0 ? [gx - o.x, gz - o.z] : [gx, gz]; };
  const npc = (map, id) => (NPCS[map] || []).find((n) => n.id === id);
  const put = (map, n) => { NPCS[map] = (NPCS[map] || []).filter((x) => x.id !== n.id); NPCS[map].push(n); };
  const drop = (map, ...ids) => { NPCS[map] = (NPCS[map] || []).filter((x) => !ids.includes(x.id)); };
  const trig = (map, list, ...dropScripts) => {
    TRIGGERS[map] = [...(TRIGGERS[map] || []).filter((t) => !dropScripts.includes(t.script) && !list.some((x) => x.script === t.script)), ...list];
  };
  const C = 'canalave_city';
  const door = (map, to) => (MAPS[map]?.warps || []).find((w) => w.to === to);

  // ================================================================ Brücke: Barry prüft dich vor der Arena
  {
    const [bx, by] = G(C, 37, 723);
    const b = npc(C, 'barry_cv');
    if (b) Object.assign(b, { x: bx, y: by, dir: 'right', show: ['cv_barry_in', '!cv_barry_left'] });
    TRAINERS.rival4 = {
      ...TRAINERS.rival4,
      win: [['Barry', 'Ja, ja, du bist wie immer ein kleines bisschen besser als ich.']]
    };
    SCRIPTS.rival4 = [
      { flag: 'cv_barry_in', quiet: true },
      { walk: 'barry_cv', path: 'rrrr', fast: true },
      { emote: 'barry_cv' },
      { walk: 'barry_cv', to: 'player', fast: true },
      ['Barry', 'Huch! He, @P! Du willst den Arenaleiter da hinten herausfordern, was? Jemand sollte prüfen, ob du für diese Herausforderung bereit bist! Und dieser Jemand bin ich! Mit meinem brandneuen Orden!'],
      { battle: 'rival4' },
      { flag: 'rival4', quiet: true },
      ['Barry', 'Aber hör zu! Ich sag dir, wer die Pokémon Liga herausfordert und Champ wird. Richtig geraten! Ich! Jedenfalls solltest du auf die Eiseninsel gehen und noch etwas härter werden. Ja, trainier auf der Eiseninsel! Das hab ich vor der Arena auch gemacht!'],
      { walk: 'barry_cv', to: 'exit', fast: true },
      { flag: 'cv_barry_left', quiet: true }
    ];
  }

  // ================================================================ Eiseninsel: Urs schenkt dir Stärke
  {
    drop(C, 'adam_out');
    delete SCRIPTS.adamStrength;
    const I = 'iron_island_outside';
    const [rx, ry] = G(I, 117, 490);
    put(I, { id: 'riley_out', x: rx, y: ry, dir: 'down', look: 'riley', name: 'Urs', show: ['!iron_riley_in', '!hm_strength'], talk: 'rileyOut' });
    SCRIPTS.rileyOut = [
      { face: 'riley_out', dir: 'player' },
      ['Urs', '... Wer bist du? Okay, du bist @P. Ich bin Urs. Ich bin Trainer, und ja, es ist etwas seltsam, dass ich ausgerechnet hier trainiere. Jedenfalls ist es immer schön, einen anderen Trainer zu treffen. Hier, ein Geschenk.'],
      { flag: 'hm_strength' },
      [null, '@P erhält VM04 Stärke!'],
      { if: 'badge_mine',
        then: [['Urs', 'Diese Versteckte Maschine enthält die Attacke Stärke. Um sie außerhalb von Kämpfen einzusetzen, brauchst du den Orden der Arena von Fleetburg ... Ach, vergiss es, du hast den Mineralorden ja schon. Mein Fehler. Ich trainiere drinnen. Du kannst gern mitkommen.']],
        else: [['Urs', 'Diese Versteckte Maschine enthält die Attacke Stärke. Um sie außerhalb von Kämpfen einzusetzen, brauchst du den Mineralorden der Arena von Fleetburg. Ich trainiere drinnen. Du kannst gern mitkommen.']] },
      { face: 'riley_out', dir: 'up' },
      { walk: 'riley_out', to: { door: 'iron_island' } },
      { flag: 'iron_riley_in', quiet: true }
    ];
  }

  // ================================================================ Nach dem Mineralorden: Barry holt dich in die Bibliothek
  const gym = door(C, 'canalave_gym');
  const lib = door(C, 'canalave_library');
  if (gym && lib) {
    put(C, { id: 'barry_cv2', x: gym.x + 2, y: gym.y + 2, dir: 'left', look: 'rival', name: 'Barry', show: ['cv_gym_barry', '!cv_lib_call'] });
    SCRIPTS.cvGymExit = [
      { flag: 'cv_gym_barry', quiet: true },
      { walk: 'barry_cv2', to: 'player', fast: true },
      ['Barry', 'He! Das ist ja der Mineralorden! Gut gemacht! Du bist stark genug, um darüber nachzudenken, Pokémon-Champ zu werden. Natürlich bin ich stärker, also wird daraus nichts. Jedenfalls, @P, komm mit mir in die Bibliothek.'],
      { walk: 'barry_cv2', to: { at: [lib.x, lib.y + 1] }, fast: true },
      { flag: 'cv_lib_call', quiet: true }
    ];
    trig(C, [{ x: gym.x, y: gym.y + 1, w: 1, h: 1, when: ['badge_mine', '!cv_lib_call'], script: 'cvGymExit' }]);
    put(C, { id: 'barry_lib', x: lib.x, y: lib.y + 1, dir: 'down', look: 'rival', name: 'Barry', show: ['cv_lib_call', '!cv_lib_in'], talk: 'cvBarryLib' });
    SCRIPTS.cvBarryLib = [
      { face: 'barry_lib', dir: 'player' },
      { if: 'hm_strength',
        then: [
          ['Barry', 'Zu langsam! Komm schon! Beweg dich!'],
          { walk: 'barry_lib', to: { door: 'canalave_library' }, fast: true },
          { flag: 'cv_lib_in', quiet: true }
        ],
        else: [['Barry', 'He, du bist da! Endlich! Oh, aber was ... Ach, Mann, du warst noch nicht auf der Eiseninsel, oder? Du hast die VM Stärke noch nicht, stimmt’s? Mensch! Ich warte hier auf dich! Beeil dich und geh endlich!']] }
    ];
    trig(C, [{ x: lib.x - 1, y: lib.y + 1, w: 3, h: 2, when: ['cv_lib_call', '!cv_lib_in'], script: 'cvBarryLib' }]);

    // In der Bibliothek: Prof. Eibe, Lucia und Barry
    const L = 'canalave_library';
    const ld = (MAPS[L]?.warps || []).find((w) => w.to === C);
    if (ld) {
      put(L, { id: 'rowan_lib', x: 6, y: 2, dir: 'down', look: 'prof', name: 'Prof. Eibe', show: ['cv_lib_call', '!cv_lib_done'] });
      put(L, { id: 'lucia_lib', x: 7, y: 2, dir: 'down', look: 'assistant', name: 'Lucia', show: ['cv_lib_call', '!cv_lib_done'] });
      put(L, { id: 'barry_lib2', x: 5, y: 2, dir: 'down', look: 'rival', name: 'Barry', show: ['cv_lib_in', '!cv_lib_done'] });
      SCRIPTS.cvLibrary = [
        ['Barry', 'He, @P! Hier rüber! Hier lang!'],
        { me: { to: 'rowan_lib' } },
        ['Barry', 'Okay, Opa! Ich hab @P mitgebracht, wie versprochen! Gut, dann bin ich weg!'],
        { face: 'barry_lib2', dir: 'up' },
        ['Prof. Eibe', '... ... ... ...'],
        ['Barry', '... Okay ... Hab’s verstanden ...'],
        { face: 'barry_lib2', dir: 'rowan_lib' },
        ['Prof. Eibe', 'Hm! Endlich sind alle da. Barry, alle, hört zu. Ihr habt es vielleicht schon vergessen, aber ich erforsche die Entwicklung der Pokémon.'],
        ['Prof. Eibe', 'Doch je mehr ich forsche, desto mehr Rätsel tauchen auf. Pokémon, die sich entwickeln, und solche, die es nicht tun ... Was unterscheidet sie voneinander? Entwickeln sich unreife Lebewesen zu reiferen? Wenn ja, was sollen wir dann von den legendären Pokémon halten, die sich nicht entwickeln? Sind die legendären Pokémon als Lebewesen vollkommen?'],
        ['Prof. Eibe', 'Hier kommt ihr drei ins Spiel. In den drei Seen von Sinnoh soll es Trugbild-Pokémon geben. Wenn wir Daten über sie bekommen, wirft das vielleicht Licht darauf, wie die Entwicklung der Pokémon funktioniert. Ich brauche bei diesem großen Vorhaben eure Hilfe. Helft mir, diese Pokémon zu finden, die man für Trugbilder hält.'],
        ['Barry', 'Was soll das heißen? Ich hab doch gar keinen Pokédex bekommen!'],
        ['Prof. Eibe', '... Und wer ist aus dem Labor gestürmt, bevor ich dir einen Pokédex geben konnte? Aber das ist Schnee von gestern! Pokémon mit eigenen Augen zu sehen, ist auch wichtig, damit du ein besserer Trainer wirst.'],
        ['Lucia', 'Auf mich kannst du zählen! Das hilft auch meinem Pokédex. Barry, du kommst doch auch mit, oder?'],
        ['Prof. Eibe', 'Hm! Ich hätte euch ohnehin alle hingeschickt ... Jedenfalls: Es gibt drei Seen. Und zufällig seid ihr zu dritt. Ihr solltet euch also aufteilen und die Seen einzeln untersuchen.'],
        { face: 'rowan_lib', dir: 'lucia_lib' }, { face: 'lucia_lib', dir: 'rowan_lib' },
        ['Prof. Eibe', 'Lucia, du gehst zum See der Wahrheit.'],
        ['Lucia', 'Wird gemacht!'],
        { face: 'rowan_lib', dir: 'down' }, { face: 'lucia_lib', dir: 'down' },
        ['Prof. Eibe', 'Barry, du untersuchst den See der Willenskraft. Der liegt fast schon bei Blizzach. Der Weg dorthin ist hart. Ich brauche einen zähen Trainer dafür.'],
        { emote: 'barry_lib2' },
        ['Barry', 'Äh ... Ja, klar! Opa, du hast den richtigen Riecher! Du merkst, dass ich der Größte bin! Und weißt du was? Ich wollte diese legendären Pokémon sowieso für dich fangen. Als Dank dafür, dass du uns die Pokémon auf Route 201 gelassen hast. ... Obwohl ich das bis gerade eben komplett vergessen hatte.'],
        ['Prof. Eibe', 'Sehr gut. Ich zähle auf dich. Bleibt für @P der See der Kühnheit. Der See liegt zwischen Schleiede und Weideburg, wenn ich mich recht erinnere ...'],
        { wait: 300 },
        [null, 'DDDOOOMMM!!'],
        ['Prof. Eibe', '... ... Hat es aufgehört? Seid ihr alle unverletzt?'],
        ['Barry', 'Was war das denn?! Nein, warte, ich meine: Fernseher! Der Fernseher! Nachrichten! Irgendwas!'],
        [null, 'Im Fernseher der Bibliothek läuft eine Sondersendung. Ein Krater klafft dort, wo eben noch der See der Kühnheit war.'],
        ['Sprecher', 'Was Sie gerade gesehen haben, sind echte Aufnahmen vom Ort des Geschehens. Gefilmt hat sie ein Kameramann, der zufällig vor Ort war.'],
        ['Moderator', 'Das ist wirklich beeindruckend. Wer weiß, was die Explosion am See freigelegt hat?'],
        ['Barry', 'Opa! Die haben gesagt, das war eine Explosion?!'],
        ['Prof. Eibe', 'Hmm ... Aber warum am See der Kühnheit ...? Lasst uns rausgehen. Ich mache mir Sorgen um die Stadt. Kinder, seid vorsichtig.'],
        { walk: 'lucia_lib', to: { door: C } },
        { walk: 'barry_lib2', to: { door: C }, fast: true },
        { face: 'rowan_lib', dir: 'player' },
        ['Prof. Eibe', '@P. Du solltest jetzt auch gehen. ... Es könnte allerdings Nachbeben geben. Sei immer wachsam.'],
        { walk: 'rowan_lib', to: { door: C } },
        { flag: 'cv_lib_done', quiet: true }
      ];
      trig(L, [{ x: ld.x, y: ld.y - 1, w: 1, h: 1, when: ['cv_lib_in', '!cv_lib_done'], script: 'cvLibrary' }]);
    }

    // Vor der Bibliothek: der Seemann bringt die Nachricht, Barry rennt los
    const [px, py] = G(C, 38, 720);
    const [sx, sy] = G(C, 43, 725);
    put(C, { id: 'rowan_cv', x: px, y: py, dir: 'up', look: 'prof', name: 'Prof. Eibe', show: ['cv_lib_done', '!valor_done'], talk: 'cvRowan' });
    put(C, { id: 'lucia_cv', x: px + 1, y: py, dir: 'up', look: 'assistant', name: 'Lucia', show: ['cv_lib_done', '!valor_done'], talk: 'cvLucia' });
    put(C, { id: 'barry_cv3', x: px - 2, y: py, dir: 'up', look: 'rival', name: 'Barry', show: ['cv_lib_done', '!cv_after'] });
    put(C, { id: 'sailor_cv', x: sx, y: sy, dir: 'left', look: 'worker', name: 'Seemann', show: ['cv_sailor_in', '!cv_after'] });
    SCRIPTS.cvAfter = [
      { face: 'rowan_cv', dir: 'player' },
      ['Prof. Eibe', '... Dieses Beben ... Das war nichts Natürliches.'],
      { flag: 'cv_sailor_in', quiet: true },
      { walk: 'sailor_cv', to: 'player', fast: true },
      ['Seemann', 'He, he! Opa und Kinder! Habt ihr gehört?! Es heißt, am See der Kühnheit gab es eine riesige Explosion! Aber angeblich ist jetzt alles wieder in Ordnung. War wohl nur viel Lärm.'],
      { walk: 'sailor_cv', to: 'exit', fast: true },
      { face: 'barry_cv3', dir: 'up' },
      ['Barry', 'Opa! Ich geh los! Ich hab ein ungutes Gefühl bei der Sache!'],
      { walk: 'barry_cv3', to: 'exit', fast: true },
      { flag: 'cv_after', quiet: true },
      { face: 'rowan_cv', dir: 'player' },
      ['Prof. Eibe', '... Dieser Barry ... Kann einfach nicht stillsitzen ... @P, ich verlange nicht gern etwas, aber ich brauche dich am See der Kühnheit. Nach so einer Explosion kann unmöglich alles in Ordnung sein. Aber ich habe keine Ahnung, was dort vor sich geht ...'],
      ['Prof. Eibe', 'Bevor du gehst, lass mich eines betonen: Übernimm dich nicht. Wir versuchen, zu dir zu stoßen, sobald wir den See der Wahrheit untersucht haben.'],
      { face: 'lucia_cv', dir: 'player' },
      ['Lucia', '... @P, dir passiert doch nichts, egal was kommt, oder?']
    ];
    trig(C, [{ x: lib.x, y: lib.y + 1, w: 1, h: 1, when: ['cv_lib_done', '!cv_after'], script: 'cvAfter' }]);
    SCRIPTS.cvRowan = [{ face: 'rowan_cv', dir: 'player' }, ['Prof. Eibe', 'Hmm ... Was geht am See der Kühnheit vor sich ... Du musst es herausfinden! Aber übernimm dich nicht. Wir versuchen, zu dir zu stoßen, sobald wir den See der Wahrheit untersucht haben.']];
    SCRIPTS.cvLucia = [{ face: 'lucia_cv', dir: 'player' }, ['Lucia', 'Wir gehen zuerst zum See der Wahrheit ... Mach nichts Unüberlegtes, falls etwas passiert.']];
  }

  // ================================================================ See der Kühnheit: Rüpel am Krater, Saturn in der Höhle
  {
    const V = 'valor_lakefront';
    for (const id of ['valor_guard', 'vl_cam']) Object.assign(npc(V, id) || {}, { show: ['!cv_after'] });
    const LV = 'lake_valor';
    drop(LV, 'saturn_valor');
    put(LV, { id: 'grunt_lv', x: 34, y: 34, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', show: ['cv_after', '!valor_done'],
      talk: [['Galaktik-Rüpel', 'Was willst du? Du untersuchst die Explosion? Pah, egal wer du bist. Es ist zu spät, um noch etwas zu ändern. Jetzt wird es richtig spannend. Alle legendären Pokémon werden in unser Hauptquartier nach Schleiede gebracht!']] });
    TRAINERS.saturn1 = {
      ...TRAINERS.saturn1, sight: 0, intro: [],
      win: [['Saturn', 'Gah! Selbst ich, ein Commander, konnte nur Zeit gewinnen?']]
    };
    put('valor_cavern', { id: 'saturn_vc', x: 14, y: 19, dir: 'up', look: 'saturn', name: 'Saturn', show: ['cv_after', '!vc_saturn_left'], talk: 'vcSaturn' });
    SCRIPTS.vcSaturn = [
      { if: '!valor_done', then: [
        ['Saturn', 'Die Mission verläuft ohne Zwischenfälle. Der Boss dürfte zufrieden sein. Alles für alle, und zum Wohl von Team Galaktik!'],
        { emote: 'saturn_vc' },
        { face: 'saturn_vc', dir: 'player' },
        ['Saturn', 'Dein Gesicht kenne ich! Du bist das Kind, das das Galaktik-Gebäude in Ewigenau gestürmt hat! Pah! Jupiter sollte sich schämen, von einem Kind besiegt worden zu sein. Aber alles und jeder, der sich Team Galaktik widersetzt, muss zerschmettert werden! Selbst der bloße Gedanke an Widerstand wird nicht geduldet!'],
        { battle: 'saturn1' }
      ] },
      ['Saturn', 'Aber das macht nichts. Ein Kind wie du wird den Lauf der Zeit niemals aufhalten! Team Galaktik holt sich die drei legendären Pokémon der Seen! Mit ihrer Kraft erschaffen wir ein völlig neues Universum! Mars dürfte inzwischen das Pokémon vom See der Wahrheit gefangen haben ...'],
      { walk: 'saturn_vc', to: 'exit', fast: true },
      { flag: 'vc_saturn_left' }
    ];
  }
}
