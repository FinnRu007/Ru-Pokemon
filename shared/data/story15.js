// Kapitel 6 nach den Originalskripten von Platin: LeBelle im Galaktik-Lagerhaus (VM Fliegen), Barry in Weideburg,
// Marinus und die Galaktik-Bombe am Großen Moor, die Verfolgung bis zum Seeufer und Cynthias Geheimtrank,
// die Enton auf Route 210, der Alte Talisman für die Älteste von Elyses und Zyrus vor dem Höhlenbild.
import { ITEMS } from './items.js';
export function applyStory15({ TRAINERS, SCRIPTS, NPCS, TRIGGERS, MAPS, ORIG_ON }) {
  if (!ORIG_ON) return;
  ITEMS['secret-potion'] ||= { name: 'Geheimtrank', price: 0, kind: 'key', sell: false };
  ITEMS['old-charm'] ||= { name: 'Alter Talisman', price: 0, kind: 'key', sell: false };
  const G = (map, gx, gz) => { const o = MAPS[map]?.orig; return o && o.m === 0 ? [gx - o.x, gz - o.z] : [gx, gz]; };
  const npc = (map, id) => (NPCS[map] || []).find((n) => n.id === id);
  const put = (map, n) => { NPCS[map] = (NPCS[map] || []).filter((x) => x.id !== n.id); NPCS[map].push(n); };
  const drop = (map, ...ids) => { NPCS[map] = (NPCS[map] || []).filter((x) => !ids.includes(x.id)); };
  const trig = (map, list, ...dropScripts) => {
    TRIGGERS[map] = [...(TRIGGERS[map] || []).filter((t) => !dropScripts.includes(t.script) && !list.some((x) => x.script === t.script)), ...list];
  };

  // ================================================================ Lagerhaus: LeBelle findet die VM Fliegen
  {
    const W = 'galactic_warehouse';
    // In Platin ist das Lagerhaus leer: die Rüpel sind nach dem Doppelkampf geflohen
    drop(W, 'wh_g1', 'wh_g2', 'wh_owner');
    delete TRAINERS.grunt_wh1; delete TRAINERS.grunt_wh2; delete SCRIPTS.warehouse; delete SCRIPTS.cynthiaPastoria;
    put(W, { id: 'looker_wh', x: 9, y: 10, dir: 'up', look: 'police', name: 'LeBelle', show: ['vs_tag_done', '!galactic_hq_done'], talk: 'whLookerTalk' });
    SCRIPTS.whLooker = [
      { wait: 400 },
      { walk: 'looker_wh', path: 'uu' },
      ['LeBelle', 'Hmm ... Um weiterzukommen, bräuchten wir einen Schlüssel. Vorerst können wir die Flüchtigen nicht verfolgen.'],
      { walk: 'looker_wh', path: 'd' },
      { face: 'looker_wh', dir: 'right' },
      { emote: 'looker_wh' },
      ['LeBelle', 'Ah, diese Versteckte Maschine ... Sie enthält die Attacke Fliegen. @P, die solltest du behalten. Es geht nicht, dass Team Galaktik sie hier zurücklässt und benutzt.'],
      { flag: 'hm_fly' },
      [null, '@P erhält VM02 Fliegen! Draußen kannst du mit F zu Orten fliegen, die du schon besucht hast.'],
      { face: 'looker_wh', dir: 'player' },
      ['LeBelle', 'Viel haben wir hier also nicht erfahren ... Macht nichts. Mich beunruhigt, was ich in der Spielhalle aufgeschnappt habe. Team Galaktik hat etwas nach Weideburg gebracht. Was sie vorhaben, weiß ich nicht, aber ich habe ein ungutes Gefühl dabei.'],
      { flag: 'warehouse_done' }
    ];
    SCRIPTS.whLookerTalk = [['LeBelle', 'Mich beunruhigt, was ich in der Spielhalle aufgeschnappt habe. Team Galaktik hat etwas nach Weideburg gebracht. Was sie vorhaben, weiß ich nicht, aber ich habe ein ungutes Gefühl dabei.']];
    const tag = SCRIPTS.vsTag;
    if (tag && tag[tag.length - 1]?.warp) tag.push({ run: 'whLooker' });
  }

  // ================================================================ Weideburg
  const P = 'pastoria_city';
  TRAINERS.rival_pa = {
    name: 'Barry', cls: 'Rivale', look: 'rival', prize: 65, flag: 'rival_pa', party: [[397, 31], [419, 31], [315, 31], [78, 32], ['rival', 34]],
    intro: [],
    win: [['Barry', 'Heh, ja, vielleicht bist du seit dem letzten Mal ein bisschen stärker geworden. Das hat sogar mich etwas geschockt. Ich hab nur verloren, weil ich unvorsichtig war.']]
  };
  {
    const [bx, by] = G(P, 595, 819);
    const [dx, dy] = G(P, 589, 827); // Arenatür
    const [gx, gy] = G(P, 614, 810); // Rüpel vor dem Beobachtungstor
    const [wx, wy] = G(P, 611, 810); // Marinus vor dem Tor
    const [rx, ry] = G(P, 608, 814); // Barry wartet
    const [ex, ey] = G(P, 637, 812); // Rüpel flieht nach Osten

    // Barry rennt vor der Arena in dich hinein
    put(P, { id: 'barry_pa', x: bx, y: by, dir: 'down', look: 'rival', name: 'Barry', show: ['pa_barry_in', '!pa_barry_left'] });
    SCRIPTS.paRival = [
      { flag: 'pa_barry_in', quiet: true },
      { emote: 'barry_pa' },
      { walk: 'barry_pa', to: 'player', fast: true },
      ['Barry', 'Huch! Hehehe! Ich renne dich ja nicht jedes Mal um, wenn wir uns treffen! Und, wie läuft’s, @P? Du trainierst deine Pokémon, was? Ich teste mal, wie stark und zäh du und deine Pokémon geworden seid!'],
      { battle: 'rival_pa' },
      ['Barry', 'Ach ja, übrigens: Ich bin jetzt der Schüler von Herrn Marinus! Ich will nämlich auch mein eigenes Titellied!'],
      { walk: 'barry_pa', to: 'exit', fast: true },
      { flag: 'pa_barry_left', quiet: true }
    ];
    trig(P, [{ x: dx, y: dy + 1, w: 1, h: 1, when: ['!rival_pa', '!badge_fen'], script: 'paRival' }]);

    // Der Rüpel wartet vor dem Beobachtungstor auf sein Paket
    put(P, { id: 'grunt_pa', x: gx, y: gy, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', show: ['warehouse_done', '!pa_bomb'], talk: 'paGruntWait' });
    SCRIPTS.paGruntWait = [['Galaktik-Rüpel', 'Grr ... Das Paket aus dem Lagerhaus in Schleiede ist immer noch nicht da ... Muss ich etwa so lange hier warten? Ich werd noch verrückt vom Warten ... Ich wünschte, ich dürfte was mit ganz viel Sprengstoff machen! Jep, das wird ein echter Knaller für Team Galaktik ...']];

    // Nach dem Sumpforden: Barry holt Marinus, der Rüpel hat eine Bombe
    put(P, { id: 'barry_pa2', x: bx, y: by, dir: 'down', look: 'rival', name: 'Barry', show: ['badge_fen', 'pa_exit_in', '!pa_gym_exit'] });
    put(P, { id: 'wake_pa', x: dx, y: dy, dir: 'down', look: 'wake', name: 'Marinus', show: ['pa_wake_out', '!pa_gym_exit'], fromDoor: true });
    SCRIPTS.paGymExit = [
      { flag: 'pa_exit_in', quiet: true },
      { walk: 'barry_pa2', to: 'player', fast: true },
      ['Barry', 'Oh, he! Du hast hier den Orden geholt, was? Was hab ich dir gesagt? Herr Marinus, ich meine, der Meister, ist ziemlich genial, oder?'],
      { me: 'l' },
      { face: 'me', dir: 'right' },
      { flag: 'pa_wake_out', quiet: true },
      { walk: 'wake_pa', path: 'd' },
      ['Marinus', 'Was ist das denn für ein Lärm? Ach, ihr zwei seid es.'],
      { emote: 'barry_pa2' },
      ['Barry', 'Oh, Meister!'],
      ['Marinus', '... Hör mal, Kleiner. Ich kenne deinen Vater, das streite ich nicht ab. Aber ich kann mich nicht erinnern, dich jemals als Schüler aufgenommen zu haben. Nicht im Geringsten.'],
      ['Marinus', 'Außerdem braucht ihr zwei mich nicht. Ihr könnt auch ohne mich als Meister stark werden.'],
      ['Barry', 'Egal! Ich hab dich zu meinem Meister gemacht! Ich hab das entschieden! Aber vergiss das jetzt! Es gibt Ärger! Vor dem Beobachtungstor steht ein Galaktik-Typ. Er hat was von einer Bombe gesagt!'],
      ['Marinus', 'WAAAAS?! Niemand legt sich mit Weideburg an! Nicht, solange ich hier bin!'],
      { walk: 'wake_pa', to: { at: [wx, wy] }, fast: true },
      ['Barry', 'He! Meister! Warte!'],
      { walk: 'barry_pa2', to: { at: [rx, ry] }, fast: true },
      { flag: 'pa_gym_exit', quiet: true }
    ];
    trig(P, [{ x: dx, y: dy + 1, w: 1, h: 1, when: ['badge_fen', '!pa_gym_exit'], script: 'paGymExit' }]);

    // Vor dem Beobachtungstor: DDDOOOMMM!!
    put(P, { id: 'wake_pa3', x: wx, y: wy, dir: 'up', look: 'wake', name: 'Marinus', show: ['pa_gym_exit', '!pa_bomb'] });
    put(P, { id: 'barry_pa3', x: rx, y: ry, dir: 'down', look: 'rival', name: 'Barry', show: ['pa_gym_exit', '!secret_potion'], talk: 'paBarryWait' });
    put(P, { id: 'grunt_pa2', x: wx + 1, y: wy, dir: 'left', look: 'grunt', name: 'Galaktik-Rüpel', show: ['pa_grunt_out', '!pa_bomb'] });
    put(P, { id: 'grunt_pa3', x: ex, y: ey, dir: 'right', look: 'grunt', name: 'Galaktik-Rüpel', show: ['pa_bomb', '!pa_grunt_gone'], talk: 'paGruntFlee' });
    SCRIPTS.paBomb = [
      { walk: 'barry_pa3', to: 'player', fast: true },
      ['Barry', 'He! Bin ich Luft, oder was? Vergesst nicht, dass ich auch noch da bin!'],
      { face: 'wake_pa3', dir: 'player' },
      ['Marinus', 'Also, wo ist dieser Galak ...'],
      { face: 'wake_pa3', dir: 'up' }, { face: 'barry_pa3', dir: 'up' }, { face: 'me', dir: 'up' },
      { wait: 300 },
      [null, 'DDDOOOMMM!!'],
      { flag: 'pa_grunt_out', quiet: true },
      { face: 'wake_pa3', dir: 'grunt_pa2' },
      ['Galaktik-Rüpel', 'Puh! Das war heftig.'],
      ['Marinus', 'DU! Was hast du getan?!'],
      ['Galaktik-Rüpel', 'Was ich getan habe, fragst du? Na ja, genau genommen war ich es gar nicht. Das Paket, das angekommen ist, war eine Bombe. Die Galaktik-Bombe. Ich sollte nur den Knopf drücken. Also hab ich das gemacht. So: „Poink!“'],
      ['Galaktik-Rüpel', 'Ach ja! Fast vergessen! Die Testergebnisse müssen gemeldet werden! Also tschüssi! Du alter Kauz, deine Maske ist lächerlich!'],
      { walk: 'grunt_pa2', to: { at: [ex, ey] }, fast: true },
      { flag: 'pa_bomb', quiet: true },
      ['Marinus', 'Das Große Moor ist unbezahlbar ...'],
      { face: 'wake_pa3', dir: 'player' },
      ['Marinus', 'Ihr zwei! Folgt mir NICHT! Und lasst auch sonst niemanden rein! Es gäbe großen Ärger, falls von der Bombe noch etwas übrig ist!'],
      { walk: 'wake_pa3', to: 'exit', fast: true },
      { flag: 'pa_wake_marsh', quiet: true },
      { face: 'barry_pa3', dir: 'player' },
      ['Barry', 'He! @P! Du verfolgst diesen Galaktik-Typen! Ich bleibe hier, wie der Meister gesagt hat! Ich muss die anderen davon abhalten, reinzugehen! Lass den Galaktik-Kerl nicht entkommen!']
    ];
    trig(P, [{ x: wx - 7, y: wy, w: 15, h: 5, when: ['pa_gym_exit', '!pa_bomb'], script: 'paBomb' }]);
    SCRIPTS.paBarryWait = [{ face: 'barry_pa3', dir: 'player' }, ['Barry', 'Was ist denn?! Warum bist du noch nicht weg?! Verfolg diesen Galaktik-Typen!']];
    SCRIPTS.paGruntFlee = [
      { face: 'grunt_pa3', dir: 'player' },
      ['Galaktik-Rüpel', 'Was willst du denn? Hör auf, mich zu verfolgen! Ich hätte nicht übel Lust, dich mit meinen Pokémon plattzumachen! Aber ich muss so schnell wie möglich zum See! Du hast also Glück! Ich bin weg!'],
      ['Galaktik-Rüpel', 'Alles klar? Wehe, du folgst mir!'],
      { walk: 'grunt_pa3', to: 'exit', fast: true },
      { flag: 'pa_grunt_gone' }
    ];
  }

  // ================================================================ Seeufer: der Rüpel, Barry und Cynthia mit dem Geheimtrank
  {
    const V = 'valor_lakefront';
    const [g1x, g1y] = G(V, 719, 790);
    const [g2x, g2y] = G(V, 723, 769);
    const [cx, cy] = G(V, 723, 760);
    TRAINERS.grunt_vl = {
      name: 'Rüpel', cls: 'Team Galaktik', look: 'grunt', prize: 40, flag: 'vl_grunt_beaten', party: [[42, 32], [434, 32], [431, 33]],
      intro: [], win: [['Galaktik-Rüpel', 'Ich kann nicht mehr kämpfen ...']]
    };
    put(V, { id: 'grunt_vl', x: g1x, y: g1y, dir: 'up', look: 'grunt', name: 'Galaktik-Rüpel', show: ['pa_grunt_gone', '!vl_grunt_n'], talk: 'vlGrunt1' });
    put(V, { id: 'grunt_vl2', x: g2x, y: g2y, dir: 'up', look: 'grunt', name: 'Galaktik-Rüpel', show: ['vl_grunt_n', '!vl_grunt_left'], talk: 'vlGrunt2' });
    SCRIPTS.vlGrunt1 = [
      ['Galaktik-Rüpel', '... Keuch ... keuch ... Warum renne ich eigentlich so? Diese neue Welt ... Das neue Universum, von dem unser Boss gesprochen hat ... Mir wird ganz schwindlig, wenn ich daran denke ... Wenn wir das Ding hier benutzen ...'],
      { emote: 'grunt_vl' },
      { face: 'grunt_vl', dir: 'player' },
      ['Galaktik-Rüpel', 'Gweh! Du hast gelauscht! Ich habe nur mit mir selbst geredet! Und hartnäckig bist du auch noch ... Ich bin total fertig vom Rennen ... Aber ich werde ... nicht gegen dich kämpfen ...'],
      { walk: 'grunt_vl', to: { at: [g2x, g2y] }, fast: true },
      { flag: 'vl_grunt_n', quiet: true }
    ];
    // Cynthia steht weiter oben, kommt aber erst nach dem Kampf herunter
    const c = npc(V, 'cynthia_pa');
    if (c) Object.assign(c, { x: cx, y: cy, dir: 'down', show: ['vl_cyn_in', '!secret_potion'], talk: undefined });
    put(V, { id: 'barry_valor', x: g2x, y: g2y + 8, dir: 'up', look: 'rival', name: 'Barry', show: ['vl_barry_in', '!vl_barry_left'] });
    SCRIPTS.vlGrunt2 = [
      { face: 'grunt_vl2', dir: 'player' },
      ['Galaktik-Rüpel', 'Ach nee ... Du bist mir immer noch auf den Fersen ...? Der See ist schon in Sichtweite ... Du lässt mir keine Wahl ... Meine Pokémon machen dich fertig ...'],
      { battle: 'grunt_vl' },
      ['Galaktik-Rüpel', 'Ich kann nicht mehr ... Ich bin völlig ausgepumpt ... Dann muss ich das hier eben dem Commander geben ... Dabei wollte ich es so gern am See benutzen ...'],
      { walk: 'grunt_vl2', to: 'exit', fast: true },
      { flag: 'vl_grunt_left', quiet: true },
      { flag: 'vl_cyn_in', quiet: true },
      { walk: 'cynthia_pa', to: 'player' },
      ['Cynthia', 'Oh, hallo, lange nicht gesehen! Wie füllt sich dein Pokédex? Ich wollte die Legenden über den See erforschen, aber ... Na ja, der See ist im Moment wohl nicht für die Öffentlichkeit zugänglich.'],
      ['Cynthia', 'Kennst du die Legende über den See? Man sagt, im See gibt es eine Insel. Und in dieser Insel gibt es das Trugbild eines Pokémon. Niemand darf die Kammer dieses Pokémon betreten ... Ach ja, richtig! Ich wollte noch über etwas anderes mit dir reden ...'],
      { flag: 'vl_barry_in' },
      { walk: 'barry_valor', to: 'player', fast: true },
      [null, '@P: „He, Barry! Wohin ist dieser Galaktik-Typ abgehauen?“'],
      { face: 'barry_valor', dir: 'cynthia_pa' },
      ['Barry', 'Hä? Ist das deine große Schwester? Nein? Ist sie nicht? Ach so, okay.'],
      { face: 'barry_valor', dir: 'player' },
      ['Barry', 'Die Explosion im Großen Moor? Das war nichts Schlimmes. Das soll ich dir von Herrn Marinus ausrichten. Aber dieses Team Galaktik ... Wow! Die sind ja völlig außer Kontrolle! Wenn ich die das nächste Mal sehe, erteile ich ihnen eine Lektion, die sie nie vergessen! Bis dann!'],
      { walk: 'barry_valor', to: 'exit', fast: true },
      { flag: 'vl_barry_left', quiet: true },
      { face: 'cynthia_pa', dir: 'player' },
      ['Cynthia', 'Er ist dein Freund? Er ist eher ungeduldig als energiegeladen, oder?'],
      ['Cynthia', 'Um auf das zurückzukommen, was ich vorhin sagen wollte ... Hast du die Gruppe Enton auf Route 210 gesehen?'],
      { ask: ['Ja', 'Nein'],
        yes: [['Cynthia', 'Ja, genau. Beim Café auf Route 210. Du hast diese Enton gesehen, die sich den Kopf halten, oder?']],
        no: [['Cynthia', 'Du hast sie nicht gesehen? Beim Café auf Route 210 sitzt eine Gruppe Enton, die sich den Kopf halten.']] },
      ['Cynthia', 'Jedenfalls solltest du diese Medizin bei den Enton anwenden. Du arbeitest an einem Pokédex, also lohnt es sich für dich.'],
      { give: 'secret-potion' },
      ['Cynthia', 'Als ich jünger war, habe ich auch mit einem Pokédex eine große Reise gemacht. Ich hoffe, du lernst jede Art von Pokémon kennen. Vielleicht hilft dir das mit dem Geheimnis des Trugbild-Pokémon. Bis später!'],
      { walk: 'cynthia_pa', to: 'exit' },
      { flag: 'secret_potion' }
    ];
  }
  // ================================================================ Route 210: die Enton und Cynthias Bitte
  {
    const R = 'route_210';
    const [px, py] = G(R, 561, 585);
    if (npc(R, 'psy1')) put(R, { ...npc(R, 'psy1'), id: 'psy4', x: px, y: py });
    for (const id of ['psy1', 'psy2', 'psy3', 'psy4']) Object.assign(npc(R, id) || {}, { show: ['!psy_left', '!psyduck_cured'] });
    const [cx, cy] = G(R, 561, 596);
    put(R, { id: 'cynthia_210', x: cx, y: cy, dir: 'up', look: 'cynthia', name: 'Cynthia', show: ['psy_cyn_in', '!psyduck_cured'] });
    SCRIPTS.psyduck = [
      { if: '!secret_potion', then: [[null, 'Die Enton stehen wie angewurzelt da. Sie haben nicht die geringste Lust, sich zu bewegen.']],
        else: [
          [null, 'Die Enton stehen wie angewurzelt da. Sie haben nicht die geringste Lust, sich zu bewegen. Möchtest du den Geheimtrank benutzen?'],
          { ask: ['Ja', 'Nein'], no: [],
            yes: [
              { take: 'secret-potion' },
              [null, '@P hat den Geheimtrank benutzt! Die Enton scheinen von ihren chronischen Kopfschmerzen geheilt zu sein!'],
              { emote: 'psy3' }, { emote: 'psy4' }, { emote: 'psy2' }, { emote: 'psy1' },
              { walk: ['psy3', 'psy4', 'psy2', 'psy1'], to: 'exit' },
              { flag: 'psy_left', quiet: true },
              { wait: 500 },
              { flag: 'psy_cyn_in', quiet: true },
              { walk: 'cynthia_210', to: 'player' },
              ['Cynthia', 'Oh, gut. Du hast den Geheimtrank benutzt, den ich dir gegeben habe. Enton leiden bekanntlich unter chronischen Kopfschmerzen. Aber niemand hat bisher herausgefunden, woher die Kopfschmerzen kommen.'],
              ['Cynthia', 'Ach ja! Darf ich dich um einen großen Gefallen bitten? Bring bitte diesen Alten Talisman zu meiner Großmutter nach Elyses. Zwischen hier und Elyses gibt es einige seltene Pokémon, es lohnt sich also für dich.'],
              { ask: ['Ja', 'Nein'], yes: [],
                no: [['Cynthia', 'Ich weiß, das ist ein großer Gefallen. Aber ich möchte wirklich, dass du das machst. Gehst du für mich nach Elyses?'], [null, '@P nickt.']] },
              { give: 'old-charm' },
              ['Cynthia', 'Meine Großmutter hat so eine leicht herrische Ausstrahlung. Ich glaube, du erkennst sie sofort. Ja, ganz bestimmt. Sie ist die Älteste von Elyses. Und wo sie wohnt ... Sieh auf deiner Karte nach. Du kannst es nicht verfehlen. Okay, ich zähle auf dich! Wir sehen uns unterwegs!'],
              { walk: 'cynthia_210', to: 'exit' },
              { flag: 'psyduck_cured' }
            ] }
        ] }
    ];
  }

  // ================================================================ Elyses: der Rüpel mit der Bombe, die Älteste, Zyrus in der Höhle
  {
    const C = 'celestic_town';
    TRAINERS.grunt_cel = { ...TRAINERS.grunt_cel, flag: 'cel_grunt_beaten', sight: 0, intro: [],
      win: [['Galaktik-Rüpel', 'Das ist zu viel für mich ... Ich kann hier nichts ausrichten ... Dieser Ort ist ein Nichts! Ich bin froh, wenn ich hier weg bin!']] };
    Object.assign(npc(C, 'cel_grunt') || {}, { trainer: undefined, talk: 'celGrunt', show: ['!cel_grunt_left', '!celestic_done'] });
    const [ex, ey] = G(C, 466, 531);
    Object.assign(npc(C, 'cel_elder') || {}, { name: 'Älteste', show: ['!cel_grunt_left'], talk: 'celElder' });
    put(C, { id: 'cel_elder2', x: ex, y: ey, dir: 'up', look: 'oldman', name: 'Älteste', show: ['cel_elder_up', '!cel_elder_ruins'] });
    SCRIPTS.celElder = [
      { if: 'old_charm_given', then: [['Älteste', 'Du hast extra den Weg nach Elyses gemacht. Warum nimmst du dir nicht noch etwas Zeit und siehst dir die Ruinen an?']],
        else: [['Älteste', 'Vor den Ruinen steht ein seltsamer Raumfahrer. Dort gibt es gar nichts, aber genau das scheint ihn wütend zu machen. Er sagt, er will die Stadt mit einer Bombe in die Luft jagen ... So eine Frechheit ... Wäre ich nur jünger, würde ich diesen Raumfahrer mit meinen Pokémon bestrafen ...']] },
      { flag: 'cel_elder_talk', quiet: true }
    ];
    const [tx, ty] = G(C, 463, 538);
    trig(C, [{ x: tx, y: ty, w: 3, h: 1, when: ['!cel_elder_talk', '!cel_grunt_left'], script: 'celElderTrig' }]);
    SCRIPTS.celElderTrig = [{ face: 'cel_elder', dir: 'player' }, { face: 'me', dir: 'cel_elder' }, { run: 'celElder' }];
    SCRIPTS.celGrunt = [
      ['Galaktik-Rüpel', 'Diese Stadt ist bedeutungslos! Hier gibt es nichts von Wert. Sie muss nicht existieren, also jage ich sie mit einer Galaktik-Bombe in die Luft! Wenn du dich mit mir anlegst, mache ich dich in einem Pokémon-Kampf fertig. Also, was ist? Legst du dich mit mir an?'],
      { ask: ['Ja', 'Nein'],
        no: [['Galaktik-Rüpel', 'Genau! Sehr klug! Du weißt, was gut für dich ist! Team Galaktik ist zum Wohl aller bis in diese Einöde gekommen. Danke für deine Mitarbeit. Wo ist bloß mein Partner ...?']],
        yes: [
          ['Galaktik-Rüpel', 'Du wagst es, dich Team Galaktik zu widersetzen? Dann nimmst du es mit der ganzen Welt auf ... Nein, sogar mit dem ganzen Universum!'],
          { battle: 'grunt_cel' },
          { walk: 'cel_grunt', to: 'exit', fast: true },
          { flag: 'cel_grunt_left', quiet: true },
          { flag: 'cel_elder_up', quiet: true },
          { walk: 'cel_elder2', to: 'player' },
          ['Älteste', 'Oh, du warst großartig! Was für ein Trainer! Als Älteste von Elyses danke ich dir. Oh? Dieser Alte Talisman ... Darf ich ihn sehen, Liebes? ... Was sagst du? Cynthia hat ihn dir anvertraut, damit du ihn mir bringst? Diese Cynthia ... Sie ist meine Enkelin.'],
          { take: 'old-charm' },
          [null, '@P übergibt der Ältesten den Alten Talisman.'],
          { flag: 'old_charm_given', quiet: true },
          ['Älteste', 'Dieser Alte Talisman wurde vor langer, langer Zeit in Elyses gefertigt. Zu Ehren einer mythischen Gottheit, die Sinnoh erschaffen haben soll. Solche Talismane werden heute noch ab und zu gefunden. Wenn du schon in Elyses bist, warum siehst du dich nicht in den Ruinen um?'],
          { walk: 'cel_elder2', to: { door: 'celestic_ruins' } },
          { flag: 'cel_elder_ruins', quiet: true },
          { flag: 'celestic_done' }
        ] }
    ];

    // In der Höhle: das Höhlenbild, die Älteste und Zyrus
    const H = 'celestic_ruins';
    TRAINERS.cyrus_cel = {
      name: 'Zyrus', cls: 'Galaktik-Boss', look: 'boss', prize: 100, leader: true, flag: 'beat_cyrus_cel', party: [[198, 38], [42, 38], [215, 40]],
      intro: [], win: [['Zyrus', '... Bemerkenswert.']]
    };
    put(H, { id: 'elder_ru', x: 12, y: 4, dir: 'up', look: 'oldman', name: 'Älteste', show: ['cel_ru_elder', '!cel_ru_done'] });
    put(H, { id: 'cyrus_ru', x: 10, y: 5, dir: 'up', look: 'boss', name: 'Zyrus', show: ['cel_ru_cyrus', '!cel_cyrus_left'], talk: 'celCyrus' });
    SCRIPTS.celPainting = [
      { face: 'me', dir: 'up' },
      [null, '@P betrachtet das uralte Höhlenbild. Geheimnisvolle Muster bedecken einen ganzen Teil der Wand. Drei seltsame Wesen bilden ein Dreieck. In ihrer Mitte eine leuchtende Kugel? Was hat das zu bedeuten?'],
      { flag: 'cel_painting', quiet: true },
      { flag: 'cel_ru_elder' },
      { walk: 'elder_ru', to: 'player' },
      ['Älteste', 'Das Höhlenbild bedeutet wohl Folgendes ... Es gab Wesen ... Wesen, so mächtig, dass man sie damals für Gottheiten hielt. Und es gab drei Pokémon, deren Kraft jedem dieser Wesen gewachsen war. Die drei hielten das Gleichgewicht mit diesen Wesen, als bildeten sie eine Pyramide. Das ist eine uralte Legende von Sinnoh, die man sich in Elyses noch heute erzählt.'],
      ['???', 'Über diese Legende würde ich gern mehr erfahren.'],
      { face: 'elder_ru', dir: 'down' }, { face: 'me', dir: 'down' },
      ['Älteste', 'Wer bist du denn ...?'],
      { flag: 'cel_ru_cyrus' },
      { walk: 'cyrus_ru', to: 'player' },
      ['Zyrus', 'Mein Name ist Zyrus. Ich will sinnlosem Streit und Feindseligkeit ein Ende setzen. Ich suche die Kraft, eine ideale Welt zu erschaffen. Darum möchte ich, dass du mir antwortest. Die Welt von heute kann sich nicht ändern, weil die drei Pokémon sie im Gleichgewicht halten. Willst du das damit sagen?'],
      ['Älteste', 'Das weiß ich nicht. Ich weiß nur, dass die Welt im Gleichgewicht ist. Ich bin mit der Welt, so wie sie ist, sehr zufrieden. Deine Frage interessiert mich nicht.'],
      ['Zyrus', '... Du stellst dich also unwissend? Was für eine sinnlose Haltung. Du begreifst nicht, dass die Welt unvollständig ist. Ich werde die Welt verändern. Als ersten Schritt zerstöre ich dieses Höhlenbild, das du all die Jahre beschützt hast. Eine neue Legende einer neuen Welt soll an seine Stelle treten.'],
      { run: 'celCyrus' }
    ];
    SCRIPTS.celCyrus = [
      { face: 'cyrus_ru', dir: 'player' },
      ['Zyrus', 'Habe ich etwa unrecht? Wenn du so denkst, dann fordere mich heraus.'],
      { ask: ['Ja', 'Nein'],
        no: [['Zyrus', '... Du hast dich entschieden, ein Feigling zu sein. Wie vernünftig von dir. Tritt zur Seite und sieh zu, wie ich die Welt verändere.']],
        yes: [
          ['Zyrus', '... Ich kenne dich, Trainer. Wir sind uns am Kraterberg begegnet. Warum willst du diese unvollständige Welt beschützen? Als Boss von Team Galaktik werde ich dir deinen Irrtum zeigen.'],
          { battle: 'cyrus_cel' },
          ['Zyrus', '... Bemerkenswert. Aber, Älteste, deine Haltung hat mir verraten, was ich wissen musste. Wenn die Wesen der Zeit und des Raums zusammengebracht werden, sind sie nicht mehr aufzuhalten ...'],
          { walk: 'cyrus_ru', to: 'exit' },
          { flag: 'cel_cyrus_left', quiet: true },
          { face: 'elder_ru', dir: 'player' },
          ['Älteste', 'So ein seltsamer, seltsamer Mann. Was für einen Unsinn er redet. Zeit und Raum in Sinnoh sind erfüllt von den Erinnerungen und Gedanken unzähliger Menschen und Pokémon. Das ist eine wunderbare Welt. Wozu muss man sie verändern?'],
          ['Älteste', 'Ach ja. Ich habe etwas Nützliches gefunden. Das solltest du nehmen. Es gehörte meiner Enkelin, aber sie braucht es nicht mehr.'],
          { flag: 'hm_surf' },
          [null, '@P erhält VM03 Surfer!'],
          ['Älteste', 'Wenn ein Pokémon Surfer lernt, trägt es dich über Wasser und das Meer. Du warst mir eine große Hilfe. Das ist mein Dank dafür.'],
          { walk: 'elder_ru', to: 'exit' },
          { flag: 'cel_ru_done' }
        ] }
    ];
    trig(H, [{ x: 7, y: 3, w: 7, h: 1, when: ['celestic_done', '!cel_painting'], script: 'celPainting' }]);

    // Draußen wartet Cynthia
    const cy = npc(C, 'cynthia_cel');
    if (cy) Object.assign(cy, { show: ['cel_ru_done', '!badge_mine'], talk: 'celCynthia' });
    delete SCRIPTS.cynthiaSurf;
    SCRIPTS.celCynthia = [
      { face: 'cynthia_cel', dir: 'player' },
      ['Cynthia', 'Übrigens, hat es Spaß gemacht, die Ruinen zu erkunden? Wenn es dich interessiert: In Fleetburg gibt es eine Bibliothek. Dort stehen uralte Bücher. Darin kannst du die Geschichte von Sinnoh nachlesen. Vielleicht hilft dir das auch, deinen Pokédex zu vervollständigen. Am schnellsten kommst du nach Fleetburg, wenn du von Jubelstadt aus nach Westen gehst.']
    ];
    SCRIPTS.celCynthiaMeet = [
      { emote: 'cynthia_cel' },
      { walk: 'cynthia_cel', to: 'player' },
      ['Cynthia', 'War hier alles in Ordnung? Du hast diese seltsamen Leute mit der Galaktik-Bombe gesehen, oder?'],
      ['Cynthia', 'Dieses Team Galaktik ...! Ich hielt sie für harmlos. Ihre bizarre Kleidung und ihre wilden Behauptungen, ein neues Universum zu erschaffen ... Ich dachte, das sei nur dummes Gerede. Nichts, was man ernst nehmen müsste. Aber sie machen mehr Ärger als gedacht. Pokémon für sich allein haben zu wollen, ist einfach nicht hinnehmbar!'],
      { wait: 300 },
      { run: 'celCynthia' },
      { flag: 'cel_cynthia_talk' }
    ];
    const ruinsDoor = (MAPS[C]?.warps || []).find((w) => w.to === H);
    if (ruinsDoor) trig(C, [{ x: ruinsDoor.x, y: ruinsDoor.y + 1, w: 1, h: 1, when: ['cel_ru_done', '!cel_cynthia_talk'], script: 'celCynthiaMeet' }]);
  }
}
