// Kapitel 9 nach den Originalskripten von Platin: der Rüpel mit dem Lagerschlüssel und LeBelle in Schleiede,
// Zyrus und Saturn im Galaktik-Hauptquartier, Barry an der Speersäule, Dialga, Palkia, der Schatten,
// Cynthia und die Zerrwelt mit Zyrus und Giratina.
export function applyStory18({ TRAINERS, SCRIPTS, NPCS, TRIGGERS, MAPS, ORIG_ON }) {
  if (!ORIG_ON) return;
  const G = (map, gx, gz) => { const o = MAPS[map]?.orig; return o && o.m === 0 ? [gx - o.x, gz - o.z] : [gx, gz]; };
  const npc = (map, id) => (NPCS[map] || []).find((n) => n.id === id);
  const put = (map, n) => { NPCS[map] = (NPCS[map] || []).filter((x) => x.id !== n.id); NPCS[map].push(n); };
  const trig = (map, list, ...dropScripts) => {
    TRIGGERS[map] = [...(TRIGGERS[map] || []).filter((t) => !dropScripts.includes(t.script) && !list.some((x) => x.script === t.script)), ...list];
  };
  const say = (who, text) => [[who, text]];

  // ================================================================ Schleiede: der Lagerschlüssel und LeBelle
  {
    const V = 'veilstone_city';
    const doors = (MAPS[V]?.warps || []).filter((w) => w.to === 'galactic_hq');
    if (doors.length) {
      const xs = doors.map((w) => w.x); const y = doors[0].y + 1;
      SCRIPTS.hqLocked = [[null, 'Die Tür ist verschlossen. Ohne Schlüssel kommt man hier nicht hinein.'], { back: true }];
      trig(V, [{ x: Math.min(...xs), y, w: Math.max(...xs) - Math.min(...xs) + 1, h: 1, when: ['acuity_done', '!hq_open'], script: 'hqLocked' }]);
    }
    const [kx, ky] = G(V, 721, 593);
    const [lx, ly] = G(V, 692, 603);
    put(V, { id: 'grunt_key', x: kx, y: ky, dir: 'up', look: 'grunt', name: 'Galaktik-Rüpel', show: ['acuity_done', '!vs_key_left'], talk: 'vsKeyGrunt' });
    put(V, { id: 'looker_hq', x: lx, y: ly, dir: 'up', look: 'police', name: 'LeBelle', show: ['vs_key_left', '!hq_open'], talk: 'vsLookerHq' });
    SCRIPTS.vsKeyGrunt = [
      ['Galaktik-Rüpel', 'Da! Sieh dir diese Antennen an! Ich weiß nicht, wofür die sind, aber das sind ganz schön beeindruckende Antennen!'],
      { emote: 'grunt_key' },
      { face: 'grunt_key', dir: 'player' },
      ['Galaktik-Rüpel', 'He! Du bist es! Wetten, du erinnerst dich nicht an mich, aber ich erinnere mich an dich! Deinetwegen haben sie mir mein Piepi weggenommen ... Mein Partner hat hingeschmissen und ist in seine Heimat zurück ... Buhuu! Ich weiß von nichts! Ich weiß überhaupt nichts von einem Lagerschlüssel!'],
      { walk: 'grunt_key', to: 'exit', fast: true },
      { flag: 'vs_key_left', quiet: true },
      { walk: 'looker_hq', to: 'player', fast: true },
      ['LeBelle', '@P!'],
      { run: 'vsLookerHq' }
    ];
    SCRIPTS.vsLookerHq = [
      { face: 'looker_hq', dir: 'player' },
      ['LeBelle', 'Aha! Überlass das mir! Den Lagerschlüssel für das Versteck von Team Galaktik habe ich genau hier. Ein Frontalangriff ist nicht möglich. Aber wir können in ihr Versteck eindringen. Nun? Gehst du in das Versteck? Du hast deine Gründe, ja?'],
      { ask: ['Ja', 'Nein'],
        no: [['LeBelle', '... Ja, ich verstehe. In das Versteck von Team Galaktik einzudringen ... das ist beängstigend.']],
        yes: [
          ['LeBelle', 'Sehr gut. Ich öffne die Tür. Bereite dich so gut vor, wie du kannst.'],
          { walk: 'looker_hq', to: { door: 'galactic_hq' } },
          [null, 'Ka-tschunk! Die Tür ist offen!'],
          { flag: 'hq_open' }
        ] }
    ];
  }

  // ================================================================ Hauptquartier: erst Zyrus, dann Saturn an der Maschine
  {
    const H = 'galactic_hq';
    TRAINERS.zyrus1 = {
      ...TRAINERS.zyrus1, flag: 'beat_zyrus1', sight: 0, intro: [],
      win: [['Zyrus', 'Verstehe. Du bist wirklich stark.']]
    };
    TRAINERS.saturn2 = { ...TRAINERS.saturn2, sight: 0, intro: [], win: [['Saturn', '... Gah! Was macht dich so stark?']] };
    Object.assign(npc(H, 'zyrus_hq') || {}, { x: 8, y: 7, trainer: undefined, show: ['!hq_cyrus_left', '!galactic_hq_done'] });
    Object.assign(npc(H, 'saturn_hq') || {}, { x: 8, y: 3, trainer: undefined, talk: 'hqSaturn', show: ['!galactic_hq_done'] });
    put(H, { id: 'uxie_hq', x: 4, y: 2, dir: 'down', look: 'uxie', name: 'Selfe', show: ['!hq_trio_free'], talk: say(null, 'Selfe ist in der Maschine eingeschlossen! Es scheint zu leiden, die Augen fest zusammengekniffen.') });
    put(H, { id: 'mesprit_hq', x: 5, y: 2, dir: 'down', look: 'mesprit', name: 'Vesprit', show: ['!hq_trio_free'], talk: say(null, 'Vesprit ist in der Maschine eingeschlossen! Es scheint zu leiden, sein Schweif zuckt.') });
    put(H, { id: 'azelf_hq', x: 12, y: 2, dir: 'down', look: 'azelf', name: 'Tobutz', show: ['!hq_trio_free'], talk: say(null, 'Tobutz ist in der Maschine eingeschlossen! Es scheint zu leiden und zittert heftig.') });
    SCRIPTS.hqCyrus = [
      { face: 'zyrus_hq', dir: 'player' },
      ['Zyrus', '... Du bist also gekommen. Du hast meine Rede gehört, nehme ich an. Hehe ... Natürlich eine große Lüge. Es stimmt zwar, dass ich eine neue Welt erschaffen will. Aber diese Welt ist nicht für Leute wie Team Galaktik. Ich suche eine völlig neue Welt nur für mich allein. Sonst könnte sie niemals vollständig und perfekt sein. Du hast meine Untergebenen von Team Galaktik gesehen. Du weißt selbst, dass sie allesamt nutzlos und unvollständig sind.'],
      { walk: 'zyrus_hq', to: 'player' },
      ['Zyrus', 'Ich weiß, warum du hier bist. Ich spüre es. Es geht um Selfe, Vesprit und Tobutz, richtig? Du willst sie retten ... Ich brauche sie nicht mehr. Ich bin mit ihnen fertig. Wenn dein Herz sich danach sehnt, sie zu retten, nur zu. Das ist mir gleich.'],
      ['Zyrus', 'Aber ich muss sagen ... Du bist ein bemerkenswertes Exemplar. Diese Pokémon haben nichts mit dir zu tun, oder? Und trotzdem kommst du aus Mitleid, um sie zu retten? Solch erbärmlich nutzlose Gefühle ... Das ist unlogisch und unvernünftig. Mitleid und Mitgefühl sind Erzeugnisse des schwachen, fehlerhaften menschlichen Herzens. Ich werde dich bereuen lassen, auf dein Herz gehört zu haben!'],
      { battle: 'zyrus1' },
      ['Zyrus', 'Und die Grundlage deiner Kraft ist dein Mitgefühl für Pokémon. ... Wie verschwenderisch ... Solche Gefühle sind nichts als Illusionen. Und wie alle Illusionen verblassen sie mit der Zeit, bis der Tod sie für immer verbannt. Darum habe ich alle Gefühle als nutzlose Sentimentalität abgelegt.'],
      ['Zyrus', '... Aber das spielt keine Rolle. Ich bezweifle, dass du meine Haltung je verstehen wirst. Dennoch erkenne ich an, dass du stark und mutig bist, allein hierherzukommen. Das ist deine Belohnung.'],
      { give: 'master-ball' },
      ['Zyrus', 'Der Meisterball ist der ultimative Pokéball. Er fängt jedes wilde Pokémon, ohne zu versagen. Aber ich brauche ihn nicht. Anders als ihr Trainer mache ich Pokémon nicht zu Freunden oder Partnern. Anders als die anderen Mitglieder von Team Galaktik benutze ich Pokémon nicht als Werkzeuge. Stattdessen mache ich mir die Kraft der Pokémon zu eigen.'],
      ['Zyrus', 'Wenn du die Pokémon der Seen retten willst, geh weiter nach hinten. Ich breche zum Kraterberg auf. Ich steige hinauf zum Gipfel, wo mich das Schicksal erwartet. Dort werde ich meine neue Welt erschaffen ...'],
      { walk: 'zyrus_hq', to: 'exit' },
      { flag: 'hq_cyrus_left', quiet: true }
    ];
    trig(H, [{ x: 0, y: 9, w: 18, h: 1, when: ['!beat_zyrus1'], script: 'hqCyrus' }]);
    SCRIPTS.hqSaturn = [
      { face: 'saturn_hq', dir: 'player' },
      { if: '!beat_saturn2', then: [
        ['Saturn', 'Du ... Du bist den ganzen Weg hierhergekommen, nur um ein paar Pokémon zu retten? ... Auch wenn es nichts Neues ist, verstehe ich unseren Boss nicht ... Warum lässt er so ein Kind einfach kommen und gehen? Wir, Team Galaktik, nehmen uns alles, was wir brauchen, und beseitigen, was wir nicht brauchen. Aber egal. Du hast dir die Mühe gemacht herzukommen. Dann heiße ich dich willkommen! Betrachte es als Vergeltung dafür, dass du mich am See beleidigt hast.'],
        { battle: 'saturn2' }
      ] },
      ['Saturn', 'Na gut ... Mach mit diesen drei Pokémon, was du willst. Drück den Knopf an der Maschine, um sie zu befreien.'],
      { walk: 'saturn_hq', path: 'r' },
      { face: 'saturn_hq', dir: 'player' },
      [null, '@P drückt den Knopf und befreit die Pokémon.'],
      { walk: ['uxie_hq', 'mesprit_hq', 'azelf_hq'], path: 'dd' },
      [null, 'Selfe, Vesprit und Tobutz flackern auf und fliegen davon, zurück zu ihren Seen.'],
      { flag: 'hq_trio_free', quiet: true },
      ['Saturn', 'Unser Boss hat aus Kristallen, die er den drei Pokémon entnommen hat, eine Rote Kette gefertigt. Diese Rote Kette brauchte er, um etwas am Kraterberg zu fesseln. Angeblich braucht man sie auch, um etwas zu erschaffen. Mehr weiß ich nicht. Wer weiß, was er dort oben vorhat.'],
      { flag: 'galactic_hq_done' }
    ];
  }

  // ================================================================ Speersäule: Barry, Mars und Jupiter, Zyrus und der Schatten
  {
    const S = 'spear_pillar';
    TRAINERS.spear_tag = {
      ...TRAINERS.spear_tag, sight: 0, intro: [],
      win: [['Mars', 'Schon wieder ...'], ['Jupiter', 'Na gut ...']]
    };
    Object.assign(npc(S, 'mars_sp') || {}, { trainer: undefined, show: ['!sp_aside', '!spear_done'] });
    Object.assign(npc(S, 'jupiter_sp') || {}, { show: ['!sp_aside', '!spear_done'], talk: say('Jupiter', 'Sei still und sieh zu, was unser Boss gleich tun wird.') });
    put(S, { id: 'mars_sp2', x: 6, y: 10, dir: 'right', look: 'commander', name: 'Mars', show: ['sp_aside', '!spear_done'],
      talk: [{ if: 'sp_cyrus_gone', then: say('Mars', 'M-Meister Zyrus?! Wo ist er hin?!'), else: say('Mars', 'Ich bin überrascht, dass du es bis hierher geschafft hast. Du darfst bleiben, wenn du dich nicht einmischst.') }] });
    put(S, { id: 'jupiter_sp2', x: 9, y: 10, dir: 'left', look: 'jupiter', name: 'Jupiter', show: ['sp_aside', '!spear_done'],
      talk: [{ if: 'sp_cyrus_gone', then: say('Jupiter', 'Ohne jemanden, der uns führt, können wir nur ziellos in Panik geraten ...'), else: say('Jupiter', 'Sei still und sieh zu, was unser Boss gleich tun wird.') }] });
    Object.assign(npc(S, 'barry_sp') || {}, { x: 4, y: 12, show: ['sp_barry_in', '!spear_done'], talk: say('Barry', 'He, @P! Jetzt geht’s los! Das ist jetzt deine Show!') });
    SCRIPTS.spMars = [
      { face: 'mars_sp', dir: 'player' },
      ['Mars', 'Wo willst du denn hin? Ich lasse nicht zu, dass du unseren Boss störst. Wenn du nicht hören willst, musst du erst an mir vorbei. Schließlich hast du mich öfter blamiert, als mir lieb ist!'],
      ['Jupiter', 'Und danach bin ich dran. Du magst stark sein, aber diesmal ziehen wir die Handschuhe aus!'],
      { flag: 'sp_barry_in', quiet: true },
      ['Barry', 'Moment mal! Fangt die Party bloß nicht ohne mich an!'],
      { walk: 'barry_sp', to: 'player', fast: true },
      ['Jupiter', 'Hä?'],
      ['Barry', 'Erinnerst du dich an mich? Ich bin hier, um mich zu rächen!'],
      ['Jupiter', 'Ha! Wenn das nicht der kleine Junge ist. Die kleine Heulsuse vom See der Willenskraft. Bist du ein bisschen härter geworden? Klar, kämpfen wir zwei gegen zwei!'],
      { battle: 'spear_tag' },
      ['Barry', '... Heh. Meine Pokémon sind zäh, oder? Ich kann noch zäher werden! ... Aber weißt du, das war’s für uns. Wir sind an unsere Grenze gestoßen ... @P, ich helfe dir dabei!'],
      { heal: true },
      [null, 'Barry hat die Pokémon von @P vollständig geheilt!'],
      ['Barry', 'He, @P! Jetzt geht’s los! Das ist jetzt deine Show!'],
      { walk: 'mars_sp', path: 'l' }, { walk: 'jupiter_sp', path: 'r' },
      { flag: 'sp_aside', quiet: true }
    ];
    trig(S, [{ x: 6, y: 11, w: 4, h: 1, when: ['galactic_hq_done', '!beat_spear_tag'], script: 'spMars' }]);

    TRAINERS.zyrus2 = { ...TRAINERS.zyrus2, sight: 0, intro: [], win: [['Zyrus', '... Glaub nicht, dass du dieses Pokémon besiegen oder fangen kannst.']] };
    Object.assign(npc(S, 'zyrus_sp') || {}, { trainer: undefined, show: ['!sp_cyrus_gone'] });
    put(S, { id: 'dialga_ev', x: 5, y: 3, dir: 'down', look: 'dialga', name: 'Dialga', show: ['sp_legends', '!spear_done'] });
    put(S, { id: 'palkia_ev', x: 10, y: 3, dir: 'down', look: 'palkia', name: 'Palkia', show: ['sp_legends', '!spear_done'] });
    put(S, { id: 'uxie_sp', x: 3, y: 5, dir: 'right', look: 'uxie', name: 'Selfe', show: ['sp_trio', '!spear_done'] });
    put(S, { id: 'mesprit_sp', x: 8, y: 2, dir: 'down', look: 'mesprit', name: 'Vesprit', show: ['sp_trio', '!spear_done'] });
    put(S, { id: 'azelf_sp', x: 12, y: 5, dir: 'left', look: 'azelf', name: 'Tobutz', show: ['sp_trio', '!spear_done'] });
    put(S, { id: 'cynthia_sp2', x: 9, y: 12, dir: 'up', look: 'cynthia', name: 'Cynthia', show: ['sp_cyrus_gone', '!spear_done'], talk: 'spCynthia' });
    SCRIPTS.spCyrus = [
      { face: 'me', dir: 'up' },
      ['Zyrus', '... ... Alles ist bereit für die Erschaffung einer neuen Welt. Jetzt wird alles enden. Und alles wird beginnen. Mit dieser Roten Kette aus den Kristallen der drei Pokémon der Seen ... Und mit dieser Roten Kette, die ich mit technischen Mitteln nachgebaut habe ... Mit diesen Roten Ketten öffne ich das Tor zu einer anderen Dimension. Ich befehle euch, eure Kraft für mich zu entfesseln ...'],
      { flag: 'sp_legends', quiet: true },
      [null, 'Dialga, das mythische Pokémon und der Herrscher über die Zeit!'],
      [null, '... Und das andere. Palkia, das mythische Pokémon und der Herrscher über Raum und Dimensionen!'],
      ['Zyrus', 'Auf diesen Moment habe ich so lange gewartet, Dialga und Palkia. Diese Welt wird von einer doppelten Spirale aus Zeit und Raum geformt. Ja, genau den Dingen, die ihr beherrschen könnt! Ihr werdet mir gehorchen! Eure Fähigkeiten werden meine sein! Mit dieser Macht erschaffe ich eine völlig neue Welt!'],
      ['Zyrus', 'Die unvollständige und hässliche Welt von heute darf verschwinden. Ich setze alles auf null zurück. Nichts darf bleiben. Alles für die ultimative Welt. Eine Welt vollkommener Perfektion. Nichts so Vages und Unvollständiges wie der Geist darf bleiben.'],
      { flag: 'sp_trio', quiet: true },
      ['Zyrus', '... Damit hätte ich rechnen müssen. Selfe, „das Wesen des Wissens“. Tobutz, „das Wesen der Willenskraft“. Und Vesprit, „das Wesen der Gefühle“ ...'],
      ['Zyrus', 'Die Pokémon sind gekommen, um Sinnoh zu beschützen? Erbärmlich und wertlos. Es braucht alle drei Pokémon der Seen, die den Geist verkörpern, um das Pokémon der Zeit oder das des Raums im Gleichgewicht zu halten. Aber gegen beide können sie das Gleichgewicht nicht halten. Ihr Kommen ist vergebens. So viel bedeutungsloses Theater.'],
      { face: 'zyrus_sp', dir: 'player' },
      ['Zyrus', 'Nun, @P. Du hast dich ständig in meine Pläne eingemischt, aber dir sei vergeben. Schließlich wird kein Geist mehr bleiben, wenn ich fertig bin. Aller Geist wird verschwinden. Er wird herausgerissen ... Aus dir! Aus deinen Pokémon! Aus denen, die dir lieb sind ...! Es ist so weit! Mein Traum wird Wirklichkeit!'],
      { face: 'zyrus_sp', dir: 'up' },
      ['Zyrus', 'Was ist das für ein Druck, den ich spüre ...? Etwas ... ist wütend?'],
      [null, 'Ein gewaltiger Schatten bricht aus einem Spalt hervor!'],
      ['Zyrus', 'Interessant. Es gibt also ein Pokémon, das nur als Schatten erscheinen kann. Wie dem auch sei, dieser Versuch ist voreilig und dumm. Ich habe die Kräfte von Dialga und Palkia gebändigt ...'],
      ['Zyrus', 'Ich, Zyrus, dulde keine weitere Einmischuuuuung ...!'],
      [null, 'Der Schatten zieht Zyrus in den Spalt!'],
      { walk: 'zyrus_sp', path: 'u' },
      { flag: 'sp_cyrus_gone', quiet: true },
      ['Mars', 'M-Meister Zyrus?! Wo ist er hin?!'],
      ['Jupiter', 'Dieser Schatten ... Was war das ...?!'],
      { walk: 'cynthia_sp2', to: 'player', fast: true },
      ['Cynthia', 'Nein ...!'],
      ['Cynthia', 'Tut mir leid, dass ich so lange gebraucht habe. Ich glaube, ich habe in den Mythen endlich die Antwort gefunden. Als diese Welt erschaffen wurde, erschienen Dialga und Palkia. Offenbar erschien gleichzeitig noch ein weiteres Pokémon. Ein Pokémon, so mächtig wie Dialga und Palkia ... Aber auch eines, dessen Name nie ausgesprochen werden durfte: Giratina! Es soll in einer anderen Welt lauern ... Einer Welt auf der anderen Seite der unseren ... Das war der Schatten. Das muss Giratina gewesen sein.'],
      ['Cynthia', 'Die Säulen verzerren sich ... Das liegt an diesem Tor. Es hat uns mit der anderen Welt verbunden. Wenn es nicht geschlossen wird, breitet sich die Verzerrung über Sinnoh und darüber hinaus aus ... Unsere Welt wird zerstört ...'],
      { flag: 'sp_cyrus_scene' },
      { run: 'spCynthia' }
    ];
    trig(S, [{ x: 6, y: 5, w: 4, h: 1, when: ['beat_spear_tag', '!sp_cyrus_scene'], script: 'spCyrus' }], 'toDistortion');
    SCRIPTS.spCynthia = [
      { face: 'cynthia_sp2', dir: 'player' },
      ['Cynthia', 'Bist du bereit? Wir müssen Zyrus folgen!'],
      { ask: ['Ja', 'Nein'],
        no: [['Cynthia', 'Du musst dich noch vorbereiten? Ich warte hier.']],
        yes: [['Cynthia', 'Wir müssen uns beeilen!'], [null, 'Alles um dich herum verzerrt sich. Du stürzt in eine andere Welt.'], { warp: ['distortion_world', 7, 9, 'up'] }] }
    ];
  }

  // ================================================================ Zerrwelt: Cynthia, Zyrus und Giratina
  {
    const D = 'distortion_world';
    put(D, { id: 'cynthia_dw', x: 6, y: 8, dir: 'up', look: 'cynthia', name: 'Cynthia', show: ['sp_cyrus_scene', '!spear_done'], talk: 'dwCynthia' });
    put(D, { id: 'cyrus_dw', x: 8, y: 6, dir: 'down', look: 'boss', name: 'Zyrus', show: ['sp_cyrus_scene', '!dw_cyrus_left'], talk: 'dwCyrus' });
    put(D, { id: 'cyrus_dw2', x: 10, y: 6, dir: 'left', look: 'boss', name: 'Zyrus', show: ['dw_giratina', '!spear_done'] });
    SCRIPTS.dwArrive = [
      ['Cynthia', 'Dieser Ort ...'],
      ['Cynthia', 'Spürst du es? Hier gibt es überhaupt keine Pokémon. Die Zeit fließt nicht. Und der Raum ist nicht stabil. Eine Welt, in der die Regeln gebrochen sind. Ein Raum, den man die Zerrwelt nennen könnte ...'],
      ['Cynthia', 'Suchen wir Giratina. Wir brauchen es, um die Verzerrung an der Speersäule aufzuhalten ... Ach, du bist also schon hier.'],
      { face: 'cyrus_dw', dir: 'player' },
      ['Cynthia', 'Warum willst du die Welt verändern? Wenn du unsere Welt hasst, dann geh doch einfach allein irgendwohin. Such dir einen Ort, an dem du leben kannst, ohne andere zu sehen.'],
      ['Zyrus', 'Warum sollte ich vor der Welt fliehen, mich verstecken und still warten? Mein Ziel ist es, unsere Welt von diesem vagen und unvollständigen Ding namens Geist zu befreien. Wenn wir uns davon befreien, kann unsere Welt vollständig werden. Das ist meine Gerechtigkeit! Niemand kann sich einmischen!'],
      ['Cynthia', 'Aber ... Das ist überhaupt keine Gerechtigkeit!'],
      { flag: 'dw_arrive' }
    ];
    trig(D, [{ x: 5, y: 8, w: 6, h: 1, when: ['sp_cyrus_scene', '!dw_arrive'], script: 'dwArrive' }]);
    SCRIPTS.dwCyrus = [
      { face: 'cyrus_dw', dir: 'player' },
      ['Zyrus', 'Ich werde nicht verlieren! Nicht gegen dieses Schatten-Pokémon! Nicht in irgendeiner wertlosen Welt!'],
      { battle: 'zyrus2' },
      ['Zyrus', '... Dieses bizarre Reich ist nichts anderes als das Pokémon selbst! Wenn du es fängst oder besiegst, verschwindet diese Welt! Na schön! Mach, was du willst! Statt die Welt zu reparieren, zerstörst du sie für mich! Tu es. Du trittst mein Erbe an.'],
      { walk: 'cyrus_dw', to: 'exit' },
      { flag: 'dw_cyrus_left', quiet: true },
      { face: 'cynthia_dw', dir: 'player' },
      ['Cynthia', 'Glaub seinen Lügen nicht. Es ist unmöglich, dass ein Pokémon die Welt verschwinden lässt. Die Welt hat auf deine Geburt gewartet. Und nicht nur auf deine. Auch auf die Pokémon an deiner Seite. Auf die Menschen, die dir nahestehen. Alle Pokémon und Menschen wurden geboren, weil sie ein Teil der Welt sind. Davon bin ich überzeugt.'],
      ['Cynthia', 'Giratina wird nicht aufhören zu existieren. Diese Zerrwelt wird nicht verschwinden. Und unsere Welt auch nicht. Gehen wir zu Giratina. ... Hoppla. Zuerst sollte ich mich um deine fleißigen Pokémon kümmern.'],
      { heal: true },
      [null, 'Cynthia hat die Pokémon von @P vollständig geheilt.'],
      ['Cynthia', 'Giratina ist wütend, weil beide Welten in Gefahr sind. Es hat die Zerrwelt und unsere Welt an der Speersäule verbunden. Darum verzerren sich beide Welten. Aber du musst keine Angst haben. Du kannst Giratina besiegen und zeigen, wie eng du mit deinen Pokémon verbunden bist. Oder du zeigst ihm, wie sehr du willst, dass es sich dir anschließt. Wenn dir eins davon gelingt, wird Giratina verstehen. Dann hört die Verzerrung auf!']
    ];
    SCRIPTS.dwCynthia = [{ face: 'cynthia_dw', dir: 'player' }, { if: 'beat_zyrus2', then: say('Cynthia', 'Ich weiß, dass deine Bindung zu deinen Pokémon stark ist!'), else: say('Cynthia', 'Aber ... Das ist überhaupt keine Gerechtigkeit!') }];
    SCRIPTS.giratina = [
      [null, 'Ein gewaltiges Pokémon schwebt vor dir. Oben und unten scheinen hier keine Rolle zu spielen.'],
      ['Giratina', 'Giygogagohgwooh!'],
      { legend: 487, level: 47 },
      { flag: 'dw_giratina' },
      ['Cynthia', 'Giratina scheint uns verstanden zu haben!'],
      ['Zyrus', 'Dieses Pokémon ... Dieses Schatten-Pokémon wurde bezwungen?! Damit bleibt diese unvernünftige Welt bestehen! Heißt das, ich kann keine neue Welt erschaffen? Selbst wenn ich neue Rote Ketten mache, kann die neue Welt nicht entstehen! Warum?! Was treibt dich an, beide Welten zu beschützen? Ist der Geist, so ein vages und unvollständiges Ding, dir so wichtig?!'],
      ['Cynthia', '... Die Orte, an denen wir geboren werden. Die Zeit, die wir leben ... Die Sprachen, die wir sprechen ... Wir sind alle verschieden. Aber die Pokémon verbinden uns. Wir teilen unser Leben mit unseren Pokémon, und unser Glück wächst, weil wir zusammen mehr sind als allein. Darum können wir mit jedem kämpfen und tauschen, den wir wählen ...'],
      ['Zyrus', 'Schweig! Genug von deinem Geschwätz! So rechtfertigst du den Geist als etwas Wertvolles?! Das ist nur die Hoffnung der Menschen, die sich einreden, glücklich und sicher zu sein! Die Gefühle, die in mir brodeln ... Wut, Hass, Frust ... Diese hässlichen Gefühle entstehen, weil mein eigener Geist unvollständig ist!'],
      ['Zyrus', '... Genug. Wir werden uns nie einig sein. Das verspreche ich dir. Ich werde die Geheimnisse der Welt lüften. Mit diesem Wissen erschaffe ich meine vollständige und perfekte Welt. Eines Tages wirst du in einer Welt erwachen, die ich erschaffen habe. Einer Welt ohne Geist.'],
      { walk: 'cyrus_dw2', to: 'exit' },
      ['Cynthia', '... ... Weil es Traurigkeit gibt, können wir Freude empfinden. Wo Wut ist, entsteht Mitgefühl ...'],
      ['Cynthia', 'Gehen wir nach Hause. Das Tor, wo Giratina war, sollte zurück in unsere Welt führen.'],
      { flag: 'spear_done' },
      { warp: ['spear_pillar', 7, 11, 'up'] }
    ];
    const t = (TRIGGERS[D] || []).find((x) => x.script === 'giratina');
    if (t) t.when = ['beat_zyrus2', '!spear_done'];
    Object.assign(npc(D, 'giratina') || {}, { show: ['!dw_giratina', '!spear_done'] });
  }
}
