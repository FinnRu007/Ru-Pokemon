// Kapitel 2 nach den Originalskripten von Platin: Jubelstadt (Lucia, LeBelle, Trainerschule, Pokétch,
// Team Galaktik mit Prof. Eibe), Route 203 und Erzelingen (Junge zur Arena, Veit in der Mine, Barry nach
// dem Orden). Koordinaten wie in story10.js: G(karte, x, z) rechnet globale pret-Koordinaten um.
import { PARTNERS } from './story8.js';

export function applyStory11({ TRAINERS, SCRIPTS, NPCS, TRIGGERS, MAPS, ORIG_ON }) {
  if (!ORIG_ON) return;
  const G = (map, gx, gz) => { const o = MAPS[map]?.orig; return o && o.m === 0 ? [gx - o.x, gz - o.z] : [gx, gz]; };
  const npc = (map, id) => (NPCS[map] || []).find((n) => n.id === id);
  const put = (map, n) => { NPCS[map] = (NPCS[map] || []).filter((x) => x.id !== n.id); NPCS[map].push(n); };
  const set = (map, id, fields) => { const n = npc(map, id); if (n) Object.assign(n, fields); return n; };
  const trig = (map, list, ...dropScripts) => {
    TRIGGERS[map] = [...(TRIGGERS[map] || []).filter((t) => !dropScripts.includes(t.script) && !list.some((x) => x.script === t.script)), ...list];
  };
  const at = (map, gx, gz, w = 1, h = 1) => { const [x, y] = G(map, gx, gz); return { x, y, w, h }; };
  const J = 'jubilife_city';

  // ================================================================ Jubelstadt: Ankunft
  // Lucia wartet am Südeingang, führt dich nach Norden, dort tarnt sich LeBelle von der Internationalen Polizei
  {
    const [lx, ly] = G(J, 174, 788);
    const [kx, ky] = G(J, 177, 774);
    const [sx, sy] = G(J, 168, 777); // vor der Trainerschule
    put(J, { id: 'lucia_jub', x: lx, y: ly, dir: 'down', look: 'assistant', name: 'Lucia', show: ['jub_lucia_in', '!jub_arrive'] });
    put(J, { id: 'looker_jub', x: kx, y: ky, dir: 'down', look: 'police', name: 'LeBelle', show: ['got_balls', '!jub_looker_left', '!badge_coal'] });
    SCRIPTS.jubArrive = [
      { flag: 'jub_lucia_in', quiet: true },
      { walk: 'lucia_jub', to: 'player' },
      ['Lucia', 'Hallo, @P! Fängst du fleißig Pokémon?'],
      { partyAtLeast: 4,
        then: [['Lucia', 'Wow! Du hast ja schon richtig viele Pokémon dabei! In dem Tempo ist dein Pokédex bestimmt bald voll!']],
        else: [['Lucia', '... Ähm ... Ich glaube, du wärst viel sicherer unterwegs, wenn du noch ein paar mehr fängst. Gerade wenn du weit weg reisen musst.']] },
      ['Lucia', 'Ach, ich weiß was! Findest du nicht auch, dass es besser ist, mehr über Pokémon zu wissen? Na klar! Ich kenne genau den richtigen Ort. Komm mit! Sei nicht schüchtern. Folge mir!'],
      { walk: 'lucia_jub', to: { at: [kx - 1, ky + 3] } },
      { me: { to: 'lucia_jub' } },
      ['Lucia', 'Der Mann da ... Was macht der denn?'],
      { walk: 'looker_jub', path: 'lll' },
      { face: 'looker_jub', dir: 'right' }, { face: 'looker_jub', dir: 'up' },
      { walk: 'looker_jub', path: 'rrr' },
      ['Lucia', 'Ähm ...'],
      { face: 'looker_jub', dir: 'down' },
      { emote: 'looker_jub' },
      ['???', 'WAAAS?!'],
      ['Mysteriöser Mann', '... Woher wusstet ihr das? Wie habt ihr mich als Mitglied der Internationalen Polizei entlarvt?!'],
      ['Lucia', 'Hä? Was? Wie bitte? Ich wollte mich doch nur unterhalten ...'],
      ['Seltsamer Mann', '... Heh. Nur unterhalten, sagt ihr? Mich legt ihr nicht herein. Nein, nein, nein. Ihr habt sofort erkannt, dass ich jemand Besonderes bin. Darum habt ihr mich angesprochen, nicht wahr? Eure Beobachtungsgabe ist furchterregend! Bewundernswert!'],
      ['Seltsamer Mann', 'Da meine Tarnung nun aufgeflogen ist, stelle ich mich vor. Ich bin ein weltreisendes Elitemitglied der Internationalen Polizei. Mein Name ... Ah, nein, ich nenne euch nur meinen Decknamen. Er lautet LeBelle. So nennen mich alle.'],
      ['LeBelle', 'Übrigens, kennt ihr den Spruch „Du sollst nicht stehlen!“?'],
      { ask: ['Ja', 'Nein'],
        yes: [['LeBelle', 'Ja, das ist richtig. Es ist falsch, anderen etwas wegzunehmen.']],
        no: [['LeBelle', 'Nein? Ihr kennt ihn nicht? Wie kann das sein? Vielleicht hat eure Mama ihn gesagt und ihr habt ihn vergessen, wie so oft? Hört gut zu, meine Freunde: Es ist falsch, anderen etwas wegzunehmen.']] },
      ['LeBelle', 'Leider gibt es Leute, die diese Worte nicht beherzigen. Hier in Sinnoh stehlen Verbrecher anderen Menschen ihre Pokémon. Darum halte ich Ausschau nach verdächtigen Gestalten.'],
      ['LeBelle', 'Außerdem habe ich eine Bitte. Wenn ihr mich wiederseht, sprecht mich bitte nicht an, denn ich bin im Dienst. ... Eigentlich doch, ja, ja, ihr dürft mich ansprechen. Ihr müsst sogar! Nicht, weil ich einsam bin, nein, nein! Ihr müsst mir von Bösewichten berichten! Von allen Vorfällen!'],
      { walk: 'looker_jub', to: 'exit' },
      { flag: 'jub_looker_left', quiet: true },
      ['Lucia', '... Bei der Internationalen Polizei zu arbeiten, ist bestimmt anstrengend.'],
      { wait: 500 },
      { walk: 'lucia_jub', to: { at: [sx + 1, sy] } },
      { me: { to: 'lucia_jub' } },
      { face: 'lucia_jub', dir: 'player' },
      ['Lucia', '@P, hier ist es. Die Trainerschule! Der Name sagt alles!'],
      ['Lucia', 'Ich habe vorhin gesehen, wie dein Freund Barry hineingegangen ist. Vielleicht lernt er da drin noch. Okay, tschüss!'],
      { walk: 'lucia_jub', to: 'exit' },
      { flag: 'jub_arrive' }
    ];
    trig(J, [{ ...at(J, 173, 796, 4, 1), when: ['got_balls', '!jub_arrive', '!school_barry', '!badge_coal'], script: 'jubArrive' }]);
  }

  // ================================================================ Trainerschule: Barry bekommt das Paket
  {
    const S = 'jubilife_school';
    put(S, { id: 'barry_school', x: 6, y: 3, dir: 'up', look: 'rival', name: 'Barry', show: ['got_balls', '!school_barry', '!badge_coal'], talk: 'schoolBarry' });
    SCRIPTS.schoolBarry = [
      { face: 'barry_school', dir: 'player' },
      ['Barry', 'He, @P! Bist du auch zum Lernen hier? Ich habe mir alles gemerkt, was an der Tafel stand. Schließlich ist es die Aufgabe eines Trainers, dafür zu sorgen, dass seine Pokémon im Kampf nicht verletzt werden, oder?'],
      { if: 'parcel', then: [
        ['Barry', 'Und, @P, was führt dich her? Hä? Du hast was für mich?'],
        [null, '@P übergibt das Paket.'],
        { take: 'parcel' },
        ['Barry', 'Was ist das denn ...? Klasse! Eine Karte! Hä?! Warum sind da zwei drin? Ich finde sie super, aber zwei brauche ich nicht. Hier, @P, nimm du eine!']
      ], else: [
        ['Barry', 'Ach ja! Meine Mutter hat mir zwei Karten eingepackt. Zwei brauche ich nicht. Hier, @P, nimm du eine!']
      ] },
      { give: 'town-map' },
      ['Barry', 'Hmm ... Laut der Karte sollte ich wohl als Nächstes nach Erzelingen. Da gibt es eine Arena, perfekt für meine frisch gefangenen Pokémon. Tja, ich bin auf dem Weg, der größte Trainer aller Zeiten zu werden! Bis dann!'],
      { walk: 'barry_school', to: 'exit', fast: true },
      { flag: 'school_barry' }
    ];
    // Die Lehrerin erklärt wie im Original die Tafel
    set(S, 'teacher', { talk: [['Lehrerin', 'Es ist völlig in Ordnung, wenn Trainer und Pokémon sich in ihrem eigenen Tempo entwickeln. Wenn dir etwas nicht vertraut ist, kannst du es hier nachschlagen.']] });
  }

  // ================================================================ Pokétch-Kampagne
  {
    const cond = ['has_starter', '!poketch', 'school_barry|badge_coal|poketch'];
    for (const id of ['pt_clown_1', 'pt_clown_2', 'pt_clown_3']) set(J, id, { show: cond });
    set(J, 'poketch_boss', { show: ['has_starter', 'school_barry|badge_coal|poketch'] });
    SCRIPTS.poketchCall = [
      { face: 'poketch_boss', dir: 'down' },
      { face: 'me', dir: 'up' },
      ['Pokétch-Firmenchef', 'Oh, oh, oh? Du nennst dich einen Pokémon-Trainer? Und hast keinen Pokétch? Also eine Pokémon-Uhr, kurz Pokétch! Meine Güte, du bist wirklich ein seltener Fall!'],
      ['Pokétch-Firmenchef', 'Weißt du, ich habe den Pokétch erfunden und stelle ihn her. Und jetzt veranstalte ich eine Pokétch-Werbeaktion! Du musst nur drei Clowns in Jubelstadt finden. Wenn du sie findest, schenke ich dir einen Pokétch!'],
      ['Pokétch-Firmenchef', 'Jeder Clown stellt dir eine Wissensfrage über Pokémon. Sammle von jedem Clown einen Coupon und komm dann zu mir, okay?'],
      { flag: 'pt_called' }
    ];
    trig(J, [{ ...at(J, 172, 776, 5, 1), when: ['school_barry', '!poketch', '!pt_called'], script: 'poketchCall' }]);
  }

  // ================================================================ LeBelle sperrt den Weg zur Route 203
  {
    const [px, py] = G(J, 186, 756);
    put(J, { id: 'looker_post', x: px, y: py, dir: 'down', look: 'police', name: 'LeBelle', show: ['!badge_coal', 'jub_looker_left|school_barry'], talk: 'lookerPost' });
    SCRIPTS.lookerPost = [
      { if: '!school_barry', then: [['LeBelle', 'Ah, ihr seid es! Keine Sorge, hier sind keine zwielichtigen Gestalten. Übrigens, wart ihr schon in der Trainerschule? Hat euch eure Freundin nicht vorhin dorthin geführt?']],
        else: [{ if: '!poketch', then: [['LeBelle', 'Ah, ihr seid es! Keine Sorge, hier sind keine zwielichtigen Gestalten. Übrigens, habt ihr noch keinen Pokétch? Ich glaube, einen Pokétch gibt es gerade gratis im Tausch gegen ein paar Coupons.']],
          else: [['LeBelle', 'Ah, ihr seid es! Übrigens, habt ihr noch keinen Orden? Ich glaube, man bekommt einen, wenn man den Arenaleiter einer Pokémon-Arena besiegt.'], ['LeBelle', 'Wie auch immer, in Jubelstadt scheint niemand Verdächtiges zu sein. Ich setze meine Ermittlungen woanders fort. Aber bleibt wachsam, meine Freunde, und achtet auf zwielichtige Erwachsene!']] }] }
    ];
    SCRIPTS.lookerBlock = [
      { walk: 'looker_post', to: 'player' },
      { run: 'lookerPost' },
      { back: true },
      { walk: 'looker_post', to: 'home' }, { face: 'looker_post', dir: 'down' }
    ];
    TRIGGERS[J] = (TRIGGERS[J] || []).filter((t) => t.script !== 'jubEast');
    trig(J, [
      { ...at(J, 188, 757, 1, 4), when: ['!school_barry', '!badge_coal'], script: 'lookerBlock' },
      { ...at(J, 188, 757, 1, 4), when: ['school_barry', '!poketch', '!badge_coal'], script: 'lookerBlock2' }
    ]);
    SCRIPTS.lookerBlock2 = SCRIPTS.lookerBlock;
  }

  // ================================================================ Team Galaktik bedrängt Prof. Eibe (nach dem Kohleorden)
  {
    delete TRAINERS.grunt_jub; // früher ein Einzelkampf, jetzt der Doppelkampf mit Lucia
    PARTNERS.lucia_jub = { name: 'Lucia', party: [['third', 14]], maps: [] };
    TRAINERS.grunts_jub_tag = {
      name: 'Rüpel und Rüpel', cls: 'Team Galaktik', look: 'grunt', prize: 30, partner: 'lucia_jub', flag: 'grunts_jub_tag',
      party: [[434, 11], [431, 11]],
      intro: [['Galaktik-Rüpel', 'Zwei Kinder? Na schön, wir zeigen euch, wie Team Galaktik kämpft!']],
      win: [['Galaktik-Rüpel', 'Was?! Gegen zwei Kinder verloren?']]
    };
    const [gx, gy] = G(J, 174, 740);
    set(J, 'grunt_a', { x: gx, y: gy, dir: 'right', show: ['badge_coal', '!jub_grunts_left', '!grunts_jub'], trainer: undefined, talk: 'jubGrunts' });
    set(J, 'grunt_b', { x: gx, y: gy - 1, dir: 'right', show: ['badge_coal', '!jub_grunts_left', '!grunts_jub'], talk: 'jubGrunts' });
    put(J, { id: 'rowan_jub', x: gx + 1, y: gy, dir: 'left', look: 'prof', name: 'Prof. Eibe', show: ['badge_coal', '!jub_rowan_left', '!grunts_jub'], talk: 'jubGrunts' });
    put(J, { id: 'lucia_jub2', x: gx + 2, y: gy - 1, dir: 'left', look: 'assistant', name: 'Lucia', show: ['badge_coal', '!jub_rowan_left', '!grunts_jub'], talk: 'jubGrunts' });
    SCRIPTS.jubGrunts = [
      { if: 'jub_grunts_left', then: [], else: [
        { face: 'grunt_a', dir: 'right' },
        ['Mysteriöser Mann', 'Na, na, na, na, na! Professor Eibe, Sie müssen gehorchen. Geben Sie uns all Ihre Forschungsergebnisse. Umsonst, versteht sich. Sonst wird es für Ihre Assistentin sehr unangenehm.'],
        { face: 'rowan_jub', dir: 'player' },
        ['Prof. Eibe', 'Ah, @P. Nun? Wie kommt der Pokédex voran? Hm! Das ist der Orden der Arena von Erzelingen, wie ich sehe. Aber habe ich dir nicht erst vor Kurzem dein erstes Pokémon gegeben ...? Vielleicht liegt dir das Trainersein im Blut.'],
        { face: 'grunt_a', dir: 'right' },
        ['Mysteriöser Mann', 'Ach, Herr Pokémon-Professor, müssen Sie so schwierig sein? Wir sprechen hier geschäftlich mit Ihnen. Das ist unsere Arbeit. Kurz gesagt: Wir verlangen, dass Sie unsere Forderungen erfüllen.'],
        { face: 'rowan_jub', dir: 'left' },
        ['Prof. Eibe', 'Ruhe, ihr da! Warum müsst ihr nur so lästig sein? Ich zähle euch auf, was ihr noch lernen müsst. Erstens: Lungert nicht grundlos herum. Zweitens: Unterbrecht andere nicht, wenn sie sich unterhalten. Drittens: Werdet nicht laut, nur weil ihr euren Willen nicht bekommt. Viertens: Bildet euch nicht ein, ihr wärt stark, nur weil ihr in der Gruppe seid. Fünftens: Was sollen diese absurden Anzüge?'],
        { face: 'rowan_jub', dir: 'down' },
        ['Prof. Eibe', 'Meine Güte ... Ihr nennt euch Erwachsene? Ihr Kinder, werdet bloß nicht wie diese traurigen Gestalten.'],
        { emote: 'grunt_a' }, { emote: 'grunt_b' },
        ['Mysteriöser Mann', 'Iiiiih! Jetzt wird es persönlich! Sie zwingen uns, unsere Stärke zu zeigen! Das werdet ihr bereuen, Team Galaktik beleidigt zu haben!'],
        ['Prof. Eibe', 'Kinder, erteilt diesen Rüpeln bitte eine Lektion in Anstand.'],
        { face: 'lucia_jub2', dir: 'down' },
        ['Lucia', '@P! Lass uns zusammen kämpfen!'],
        { face: 'rowan_jub', dir: 'left' },
        { battle: 'grunts_jub_tag' },
        { face: 'grunt_b', dir: 'right' },
        ['Galaktik-Rüpel', 'Ihr lasst uns keine Wahl. Wir ziehen uns vorerst zurück. Und zwar, weil Team Galaktik allen gegenüber gütig ist.'],
        { walk: ['grunt_a', 'grunt_b'], to: 'exit', fast: true },
        { flag: 'jub_grunts_left', quiet: true },
        { face: 'rowan_jub', dir: 'down' },
        ['Prof. Eibe', 'Diese Leute ... Sie nannten sich Team Galaktik. Wenn Pokémon sich entwickeln, scheinen sie eine Art Energie freizusetzen ... Ich glaube allerdings, dass es eine mystische Kraft ist, die sich unserer Kontrolle entzieht. Aber Team Galaktik scheint das Potenzial dieser Kraft zu erforschen. Sie wollen wissen, ob man sie als Energie für etwas nutzen kann ...'],
        { face: 'lucia_jub2', dir: 'player' },
        ['Lucia', '@P, wusstest du das? Der Professor erforscht auch die Entwicklung von Pokémon. Laut seiner Forschung haben 90 % aller Pokémon irgendwie mit Entwicklung zu tun! Vielleicht wollten diese Leute deshalb mit Gewalt an seine Forschungsdaten. Das ist wirklich unverzeihlich!'],
        ['Prof. Eibe', 'Es ist vorbei, ihr könnt euch entspannen. Dank euch beiden ist nichts passiert. Das weiß ich zu schätzen. Übrigens, @P, alle Achtung für dein Können im Kampf. Das hat mich auf eine Idee gebracht.'],
        ['Prof. Eibe', 'Warum sammelst du nicht alle Orden Sinnohs? Dabei wirst du bestimmt vielen Pokémon begegnen. Dann füllen sich die Seiten deines Pokédex ständig weiter. Das hilft meiner Forschung sehr. Dein erstes Pokémon und den Pokédex hast du von mir aber geschenkt bekommen. Du kannst damit tun, was du möchtest. Pass auf dich auf.'],
        { walk: ['lucia_jub2', 'rowan_jub'], to: 'exit' },
        { flag: 'jub_rowan_left' }
      ] }
    ];
    trig(J, [{ ...at(J, 173, 743, 3, 1), when: ['badge_coal', '!jub_rowan_left', '!grunts_jub'], script: 'jubGrunts' }]);
  }

  // ================================================================ Route 203: Barry will wissen, ob du stärker geworden bist
  {
    set('route_203', 'barry_203', { show: ['has_starter', '!rival2'] });
    SCRIPTS.rival203 = [
      { emote: 'barry_203' },
      { walk: 'barry_203', to: 'player', fast: true },
      ['Barry', 'He! @P! Sag mir, dass du ein bisschen stärker geworden bist! Und ich? Musst du das überhaupt fragen? Natürlich bin ich stärker geworden! Komm schon! Ich zeig es dir!'],
      { battle: 'rival2' },
      ['Barry', 'Waaah! Was soll das heißen, ich habe verloren?! Na gut, das war das letzte Mal, dass ich verliere! Ich werde der stärkste Trainer der Welt, das weißt du! Als Erstes nehme ich mir die Arena von Erzelingen vor! Dafür trainiere ich jetzt, aber richtig!'],
      { walk: 'barry_203', to: 'exit', fast: true },
      { flag: 'rival2' }
    ];
  }

  // ================================================================ Erzelingen
  {
    const O = 'oreburgh_city';
    const [yx, yy] = G(O, 266, 752);
    const [bx, by] = G(O, 282, 757); // vor der Arena
    put(O, { id: 'ore_youngster', x: yx, y: yy, dir: 'up', look: 'youngster', name: 'Junge', talk: 'oreYoungster' });
    SCRIPTS.oreYoungster = [
      { if: 'badge_coal', then: [['Junge', 'Darf ich mal dein Orden-Etui sehen? Da ist doch der Orden drin, den du gerade gewonnen hast, oder?']],
        else: [{ if: 'roark_mine', then: [['Junge', 'Oh, hallo, du bist zurück! Der Arenaleiter wartet schon auf dich.']],
          else: [['Junge', 'Ist der Typ vor der Arena dein Freund? Der ist irgendwie zappelig und ungeduldig.']] }] }
    ];
    SCRIPTS.oreIntro = [
      { emote: 'ore_youngster' },
      { walk: 'ore_youngster', to: 'player' },
      ['Junge', 'Hallo, Trainer! Hä? Oh, oh! Du hast nicht einen einzigen Orden? Da musst du was unternehmen! Ich bringe dich zur Pokémon-Arena.'],
      { walk: 'ore_youngster', to: { at: [bx - 2, by + 1] } },
      { me: { to: 'ore_youngster' } },
      { face: 'ore_youngster', dir: 'right' },
      ['Junge', 'Hä? Da steht ja schon jemand.'],
      { flag: 'ore_intro' },
      { walk: 'ore_youngster', to: 'home' }, { face: 'ore_youngster', dir: 'up' }
    ];
    TRIGGERS[O] = (TRIGGERS[O] || []).filter((t) => t.script !== 'oreIntro');
    trig(O, [{ ...at(O, 262, 748, 1, 4), when: ['has_starter', '!ore_intro', '!roark_mine', '!badge_coal'], script: 'oreIntro' }]);
    set(O, 'barry_gym', { x: bx, y: by, dir: 'down', show: ['has_starter', '!roark_mine', '!badge_coal'], talk: 'barryGym' });
    SCRIPTS.barryGym = [
      { face: 'barry_gym', dir: 'player' },
      { if: 'barry_gym_talk', then: [['Barry', 'Ich hab dir doch gesagt, der Arenaleiter ist runter in die Erzelingen-Mine gegangen. Wenn du die Arena herausfordern willst, musst du in die Mine.']],
        else: [
          ['Barry', 'Hä? Ach, du bist es, @P! Bist du endlich da? Langsam wie immer. Aber egal, der Arenaleiter ist stark! Also, ernsthaft ernsthaft! Wenn der Arenaleiter schon so stark ist, wie schlägt er sich dann wohl gegen meinen Vater ...'],
          ['Barry', 'Hä? Da bin ich wohl abgeschweift. Jedenfalls ist der Arenaleiter in die Kohlemine gegangen. Wenn du ihn herausfordern willst, musst du in die Mine!'],
          { flag: 'barry_gym_talk' }
        ] }
    ];

    // Nach dem Orden: Barry rennt dich am Westeingang fast um und zieht weiter
    const [rx, ry] = G(O, 271, 750);
    put(O, { id: 'barry_ore', x: rx, y: ry, dir: 'left', look: 'rival', name: 'Barry', show: ['ore_barry_in', '!barry_ore'] });
    SCRIPTS.barryOre = [
      { flag: 'ore_barry_in', quiet: true },
      { walk: 'barry_ore', to: 'player', fast: true },
      [null, 'Rums!!'],
      ['Barry', 'Huch! @P! Du hast den Orden, was? Ewigenau ist der nächste Ort mit einer Arena, die Orden vergibt, oder?'],
      ['Barry', 'Also, ich war auf Route 207, aber da kommt man ohne Fahrrad nicht weiter. Ich habe mein Team dort kämpfen lassen und stärker gemacht, also war es keine Zeitverschwendung.'],
      ['Barry', 'Darum gehe ich jetzt zurück nach Jubelstadt. Nächster Halt: der Orden von Ewigenau! Zehn Sekunden, dann renne ich los! Neun ... Ach was! Wer hat schon Zeit zum Zählen?!'],
      { walk: 'barry_ore', to: 'exit', fast: true },
      { flag: 'hm_rocksmash', quiet: true },
      [null, 'Mit dem Kohleorden kannst du Zertrümmerer jetzt auch außerhalb von Kämpfen einsetzen. Die VM06 liegt in deinem Beutel.'],
      { flag: 'barry_ore' }
    ];
    TRIGGERS[O] = (TRIGGERS[O] || []).filter((t) => t.script !== 'barryOre');
    trig(O, [{ ...at(O, 266, 748, 1, 4), when: ['badge_coal', '!barry_ore'], script: 'barryOre' }]);
  }

  // ================================================================ Mine: Veit zeigt Zertrümmerer
  {
    const M = 'oreburgh_mine';
    const v = npc(M, 'veit_mine');
    if (v) {
      SCRIPTS.veitMine = [
        { face: 'veit_mine', dir: 'player' },
        ['Veit', 'Hm? Ein Herausforderer? Hier unten in der Mine? Okay, tritt zurück und sieh zu. Mit der versteckten Attacke Zertrümmerer wird ein Felsbrocken, der den Weg versperrt ...'],
        { fieldFx: { move: 'rock-smash', speciesId: 95, shiny: false, name: 'Onix', map: M, x: v.x - 1, y: v.y } },
        { wait: 1700 },
        ['Veit', 'Heruntergefallene Felsbrocken müssen zertrümmert werden, damit sie aus dem Weg sind. Wenn du den Orden der Arena in der Stadt hättest, könntest du das auch. Dafür müsstest du aber erst den Arenaleiter besiegen. Und das bin ich!'],
        ['Veit', 'Ich bin Veit, der Arenaleiter von Erzelingen. Ich gehe schon mal vor in die Arena!'],
        { walk: 'veit_mine', to: 'exit' },
        { flag: 'roark_mine' }
      ];
    }
  }
}
