// Kapitel 3 nach den Originalskripten von Platin: Flori, Route 205 (Mädchen und Rüpel an der Brücke),
// Flori-Wiese (Honigmann und zwei Rüpel), Windkraftwerk (Wache, Werksschlüssel, Mars und Charon, LeBelle).
import { ITEMS } from './items.js';

export function applyStory12({ TRAINERS, SCRIPTS, NPCS, TRIGGERS, MAPS, ORIG_ON }) {
  if (!ORIG_ON) return;
  const G = (map, gx, gz) => { const o = MAPS[map]?.orig; return o && o.m === 0 ? [gx - o.x, gz - o.z] : [gx, gz]; };
  const npc = (map, id) => (NPCS[map] || []).find((n) => n.id === id);
  const put = (map, n) => { NPCS[map] = (NPCS[map] || []).filter((x) => x.id !== n.id); NPCS[map].push(n); };
  const set = (map, id, fields) => { const n = npc(map, id); if (n) Object.assign(n, fields); return n; };
  const trig = (map, list, ...dropScripts) => {
    TRIGGERS[map] = [...(TRIGGERS[map] || []).filter((t) => !dropScripts.includes(t.script) && !list.some((x) => x.script === t.script)), ...list];
  };
  const at = (map, gx, gz, w = 1, h = 1) => { const [x, y] = G(map, gx, gz); return { x, y, w, h }; };

  ITEMS['works-key'] ||= { name: 'Kraftwerksschlüssel', price: 0, kind: 'key', sell: false };
  ITEMS.honey ||= { name: 'Honig', price: 100, kind: 'item' };

  // ================================================================ Flori: zwei Rüpel zwischen den Blumen
  {
    const F = 'floaroma_town';
    const [wx, wy] = G(F, 162, 641);
    const show = ['!ww_girl_talk', '!windworks_done'];
    put(F, { id: 'flo_grunt_w', x: wx, y: wy, dir: 'right', look: 'grunt', name: 'Galaktik-Rüpel', show, talk: 'floGrunts' });
    put(F, { id: 'flo_grunt_e', x: wx + 1, y: wy, dir: 'left', look: 'grunt', name: 'Galaktik-Rüpel', show, talk: 'floGrunts' });
    SCRIPTS.floGrunts = [
      { face: 'flo_grunt_w', dir: 'right' },
      ['Rüpel 1', 'Sind wir nicht Team Galaktik? Und dann werden wir hierher abkommandiert? Zwischen Blumen herumstehen ... Das ist nicht gerade cool.'],
      { face: 'flo_grunt_e', dir: 'left' },
      ['Rüpel 2', 'He! Hör auf zu jammern. Das ist doch ein ganz ordentlicher Auftrag. Aber Käfer- und Pflanzen-Pokémon sind mir unheimlich ... Ich bin auch nicht gern hier.']
    ];
  }

  // ================================================================ Route 205: das Mädchen vom Windkraftwerk, Rüpel an der Brücke
  {
    const R = 'route_205_south';
    const [gx, gy] = G(R, 211, 661);
    put(R, { id: 'ww_girl205', x: gx, y: gy, dir: 'right', look: 'twin', name: 'Kleines Mädchen', show: '!windworks_done', talk: 'wwGirl205' });
    SCRIPTS.wwGirl205 = [
      { if: 'ww_girl_talk', then: [['Kleines Mädchen', 'Ich will zu meinem Papa ...']], else: [
        { emote: 'ww_girl205' },
        { walk: 'ww_girl205', to: 'player' },
        ['Kleines Mädchen', 'Hilfe, Hilfe, Trainer! Bitte, ich will zu meinem Papa. Mein Papa und ich haben im Windkraftwerk gewohnt. Aber dann kamen ganz viele Leute, die wie Raumfahrer angezogen waren ...'],
        ['Kleines Mädchen', 'Die haben mich rausgeworfen, und jetzt muss mein Papa irgendwas für sie machen. Bitte, Trainer! Ich vermisse meinen Papa!'],
        { flag: 'ww_girl_talk' },
        { walk: 'ww_girl205', to: 'home' }, { face: 'ww_girl205', dir: 'right' }
      ] }
    ];
    trig(R, [{ ...at(R, 211, 659, 1, 6), when: ['!ww_girl_talk', '!windworks_done'], script: 'wwGirl205' }]);
    SCRIPTS.grunt205 = [
      { face: 'grunt_205b', dir: 'right' },
      ['Galaktik-Rüpel', 'Wir, Team Galaktik, betreiben Forschung im Ewigwald! Weiter kommst du nicht!'],
      { face: 'grunt_205', dir: 'left' },
      ['Galaktik-Rüpel', 'Für unsere Forschung fangen wir Pokémon auf den Blumenwiesen von Flori. Außerdem zapfen wir heimlich die Energie des Windkraftwerks ab. Aber das geht dich nichts an!'],
      { face: 'grunt_205b', dir: 'down' }, { face: 'grunt_205', dir: 'down' },
      { back: true }
    ];
  }

  // ================================================================ Flori-Wiese: Rüpel wollen den Honig
  {
    const W = 'floaroma_meadow';
    const a = set(W, 'meadow_a', { show: '!meadow_grunts_left', trainer: undefined, talk: 'meadowGrunts', dir: 'up' });
    const b = set(W, 'meadow_b', { show: '!meadow_grunts_left', trainer: undefined, talk: 'meadowGrunts', dir: 'up' });
    if (a && b) {
      TRAINERS.grunt_meadow_a = { ...TRAINERS.grunt_meadow_a, sight: 0, intro: [], win: [['Rüpel 1', 'Das ist so peinlich ... Die kürzen mir bestimmt den Lohn!']] };
      TRAINERS.grunt_meadow_b = { ...TRAINERS.grunt_meadow_b, sight: 0, intro: [], win: [['Rüpel 2', 'Was?! Auch noch gegen mich?']] };
      put(W, { id: 'honey_man', x: a.x, y: a.y - 1, dir: 'left', look: 'worker', name: 'Honigmann', talk: 'honeyMan' });
      SCRIPTS.meadowGrunts = [
        { if: 'meadow_grunts_left', then: [], else: [
          ['Rüpel 1', 'Genug geredet! Rück den süßen Honig raus!'],
          ['Rüpel 2', 'Tu, was wir sagen! Team Galaktik braucht diesen Honig! Damit locken wir Pokémon in großen Mengen an!'],
          { face: 'meadow_a', dir: 'down' }, { face: 'meadow_b', dir: 'down' },
          { emote: 'meadow_a' },
          ['Rüpel 1', 'He! Das Kind hat alles gesehen! Was machen wir jetzt?'],
          ['Rüpel 2', 'Das Gör darf auf keinen Fall Hilfe holen ... Ganz einfach! Wir sorgen dafür, dass es den Mund hält!'],
          { battle: 'grunt_meadow_a' },
          { face: 'meadow_a', dir: 'right' },
          ['Rüpel 2', 'Jetzt bin ich dran! Hehehe ... Mein Kollege hat dich schon geschwächt, das ist mein Vorteil!'],
          { face: 'meadow_a', dir: 'down' },
          { battle: 'grunt_meadow_b' },
          ['Rüpel 1', 'Das Gör ist stark! So richtig, richtig stark! Stärker, als ich in Worte fassen kann, und ich kenne viele Wörter! Wir sind hier fertig ... Zurück zum Windkraftwerk!'],
          { walk: ['meadow_a', 'meadow_b'], to: 'exit', fast: true },
          { flag: 'meadow_grunts_left', quiet: true },
          { face: 'honey_man', dir: 'player' },
          ['Honigmann', 'Oh, was ist denn das? Das haben sie wohl vergessen ... Ein Kraftwerksschlüssel ... Der gehört sicher zum Windkraftwerk! Ich kann damit nichts anfangen. Nimm du ihn.'],
          { give: 'works-key' },
          { flag: 'windworks_key' },
          ['Honigmann', 'Danke! Du hast mich wirklich gerettet. Diese Gauner wollten mir meinen süßen, süßen Honig rauben. Komische Leute waren das. Du hast ja gesehen, wie die angezogen waren. Und was sie gesagt haben, ergab auch nicht viel Sinn.'],
          ['Honigmann', 'Oh! Ich muss mich bedanken! Mit diesem süßen, süßen Honig! Hier, nimm eine ganze Menge!'],
          { give: 'honey', count: 10 },
          ['Honigmann', 'Streich den Honig an einen süß duftenden Baum. Vielleicht lockt er Pokémon an.']
        ] }
      ];
      SCRIPTS.honeyMan = [{ if: '!meadow_grunts_left', then: [{ run: 'meadowGrunts' }], else: [['Honigmann', 'Streich den Honig an einen süß duftenden Baum. Vielleicht lockt er Pokémon an.']] }];
      trig(W, [{ x: a.x, y: a.y + 1, w: 2, h: 1, when: ['!meadow_grunts_left', '!windworks_key'], script: 'meadowGrunts' }]);
    }
  }

  // ================================================================ Windkraftwerk: Wache vor der Tür, Tür mit dem Schlüssel
  {
    const V = 'valley_windworks';
    const g = npc(V, 'ww_guard');
    if (g) {
      TRAINERS.grunt_ww_gate = {
        name: 'Rüpel', cls: 'Team Galaktik', look: 'grunt', prize: 30, flag: 'ww_guard_beaten', party: [[431, 13], [41, 13]],
        intro: [], win: [['Galaktik-Rüpel', 'Na toll. Von einem Kind geschlagen.']]
      };
      Object.assign(g, { show: ['!ww_guard_in', '!windworks_done'], talk: 'wwGuard' });
      SCRIPTS.wwGuard = [
        ['Galaktik-Rüpel', 'Wehe, du gehst ins Windkraftwerk. Ich soll jeden draußen halten, der nicht zu Team Galaktik gehört. Du guckst mich so an, als wolltest du trotzdem rein. Na gut. Dann musst du mich erst besiegen!'],
        { battle: 'grunt_ww_gate' },
        ['Galaktik-Rüpel', 'Na toll. Von einem Kind fertiggemacht. Aber du kannst nichts machen, wenn ich mich mit meinem Kraftwerksschlüssel einschließe! Genau, der andere Schlüssel ist nicht hier! Meine Kollegen auf der Blumenwiese haben ihn! Hahaha! So gesehen bin ich gar nicht der Verlierer!'],
        { face: 'ww_guard', dir: 'up' },
        { walk: 'ww_guard', to: { door: 'windworks_inside' } },
        { flag: 'ww_guard_in', quiet: true },
        [null, 'Klack!']
      ];
      SCRIPTS.wwDoor = [
        { if: 'windworks_key', then: [
          [null, 'Die Tür ist von innen abgeschlossen! Du benutzt den Kraftwerksschlüssel.'],
          [null, 'Klack! Die Tür des Windkraftwerks hat sich geöffnet!'],
          { flag: 'ww_door_open' }
        ], else: [[null, 'Die Tür ist von innen abgeschlossen.'], { back: true }] }
      ];
      trig(V, [{ x: g.x, y: g.y, w: 1, h: 1, when: ['ww_guard_in', '!ww_door_open', '!windworks_done'], script: 'wwDoor' }]);

      // Nach Mars: LeBelle kommt angerannt, sieht drinnen nach und reist weiter nach Ewigenau
      const [lx, ly] = G(V, 242, 659);
      put(V, { id: 'looker_ww', x: lx, y: ly, dir: 'up', look: 'police', name: 'LeBelle', show: ['windworks_done', '!ww_looker_in', '!ww_looker_done'] });
      put(V, { id: 'looker_ww2', x: g.x, y: g.y - 1, dir: 'down', look: 'police', name: 'LeBelle', show: ['ww_looker_out', '!ww_looker_done'], fromDoor: true });
      SCRIPTS.wwLooker = [
        { walk: 'looker_ww', to: 'player' },
        ['LeBelle', 'Ah ja. Ihr seid es, ja. Ich habe gehört, dass Team Galaktik in diesem Kraftwerk aufgetaucht ist. Darum bin ich sofort hergerannt. Also, Team Galaktik. Wo sind sie?'],
        ['LeBelle', '... Ihr habt sie vertrieben, sagt ihr? Ihr seid doch nur ein Trainer, aber ...? Nun gut! Ich sehe mir das drinnen selbst an!'],
        { walk: 'looker_ww', to: { door: 'windworks_inside' } },
        { flag: 'ww_looker_in', quiet: true },
        { wait: 2000 },
        { flag: 'ww_looker_out', quiet: true },
        { walk: 'looker_ww2', path: 'd' },
        { face: 'looker_ww2', dir: 'player' },
        ['LeBelle', 'Großartig! Ja, das ist es! Alles, was ihr gesagt habt, ist wahr! Hervorragend! Ihr seid zwar jung, aber durch und durch ein Trainer! Nun gut! Ich nehme die Verfolgung der Täter auf!'],
        ['LeBelle', 'Ich habe Hinweise erhalten, dass sich das Versteck von Team Galaktik in Ewigenau befindet. Dorthin muss ich nun!'],
        { walk: 'looker_ww2', to: 'exit' },
        { flag: 'ww_looker_done' }
      ];
      trig(V, [{ x: g.x - 1, y: g.y + 1, w: 3, h: 1, when: ['windworks_done', '!ww_looker_done'], script: 'wwLooker' }]);
    }
  }

  // ================================================================ Im Windkraftwerk: der Rüpel flieht, Mars und Charon
  {
    const I = 'windworks_inside';
    const g1 = npc(I, 'ww_g1');
    const mars = npc(I, 'mars_ww');
    if (g1 && mars) {
      Object.assign(g1, { trainer: undefined, show: ['!ww_g1_fled', '!windworks_done'], talk: 'wwFlee' });
      put(I, { id: 'ww_g3', x: 18, y: 8, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', show: '!windworks_done', trainer: 'grunt_ww1' });
      SCRIPTS.wwFlee = [
        { emote: 'ww_g1' },
        ['Galaktik-Rüpel', 'Was?! Das gibt es doch nicht! Du hast den Schlüssel? Dann war das Abschließen ja sinnlos! Ich bin doch der Verlierer! Keine Zeit für Selbstmitleid! Ich muss die Commander warnen!'],
        { walk: 'ww_g1', to: 'exit', fast: true },
        { flag: 'ww_g1_fled', quiet: true }
      ];
      trig(I, [{ x: g1.x - 6, y: g1.y + 1, w: 13, h: 1, when: ['!ww_g1_fled', '!windworks_done'], script: 'wwFlee' }]);
      TRAINERS.mars1 = { ...TRAINERS.mars1, flag: 'beat_mars1', intro: [], win: [['Mars', 'Hoppla! Das ging daneben! Macht aber nichts. Der Kampf hat mir richtig Spaß gemacht.']] };
      Object.assign(mars, { trainer: undefined, talk: 'wwMars' });
      put(I, { id: 'charon_ww', x: mars.x + 1, y: mars.y, dir: 'left', look: 'scientist', name: 'Charon', show: '!windworks_done' });
      SCRIPTS.wwMars = [
        { if: 'beat_mars1', then: [], else: [
          { face: 'mars_ww', dir: 'player' },
          ['Mars', 'Ich bin eine der drei Commander von Team Galaktik. ... Nein, Moment. Eine von vier Commandern. Mein Name ist Mars!'],
          ['Mars', 'Wir versuchen, eine neue Welt zu erschaffen, die besser ist als diese ... Aber die Leute zeigen wenig Verständnis für das, was wir tun. Du verstehst es auch nicht, oder? Das ist ein bisschen traurig ...'],
          ['Mars', 'Also lass uns kämpfen, um zu entscheiden, wie es weitergeht. Wenn ich gewinne, gehst du. Wenn du gewinnst, ziehen wir, Team Galaktik, ab.'],
          { battle: 'mars1' }
        ] },
        { face: 'charon_ww', dir: 'down' },
        { wait: 300 },
        ['Charon', 'Na, na. Gegen ein Kind verloren, was? Aber egal. Wir haben reichlich Strom gesammelt. Mit dieser Energie können wir etwas ganz Spektakuläres anstellen. Das ist für mich, Charon, das Genie, das sogar der Boss anerkennt, ganz offensichtlich. Nun, Mars, wir sollten gehen.'],
        { face: 'mars_ww', dir: 'right' },
        ['Mars', 'Halt die Klappe! Der Boss ist der Einzige auf der Welt, der mir Befehle geben darf! In meiner Nähe hältst du den Mund! Du bist erst seit Kurzem dabei. Bilde dir bloß nichts ein!'],
        { face: 'mars_ww', dir: 'player' },
        ['Mars', 'Dann wird es wohl Zeit, sich zu verabschieden und vorerst zu gehen!'],
        { walk: ['mars_ww', 'charon_ww'], to: 'exit' },
        { flag: 'windworks_done' }
      ];
      trig(I, [{ x: mars.x - 2, y: mars.y - 1, w: 4, h: 1, when: ['ww_g1_fled', '!windworks_done'], script: 'wwMars' }, { x: mars.x - 1, y: mars.y, w: 1, h: 1, when: ['ww_g1_fled', '!windworks_done'], script: 'wwMars' }]);
      SCRIPTS.wwDad = [
        { if: '!windworks_done', then: [['Techniker', 'Bitte hilf mir! Diese Leute zapfen die ganze Energie des Werks ab!']], else: [
          { if: 'ww_dad_thanks', then: [['Papa', 'Danke noch mal! Die Räder drehen sich wieder.']], else: [
            ['Techniker', 'Team Galaktik ... Sie sagten, sie müssten um jeden Preis Pokémon und Energie sammeln. Um ein neues Universum zu erschaffen, oder so ähnlich. Nichts davon ergab für mich einen Sinn.'],
            ['Techniker', 'Ich kann dir gar nicht sagen, wie dankbar ich bin, dass du mich gerettet hast. Endlich kann ich meine kleine Tochter wiedersehen!'],
            { flag: 'ww_dad_thanks' },
            ['Kleines Mädchen', 'Papa! Iiih! Papa, du stinkst! Geh sofort duschen, du Stinker!'],
            ['Papa', 'Oh, Entschuldigung! Ahaha! Die haben mich ohne Pause arbeiten lassen!'],
            ['Kleines Mädchen', 'Danke, Trainer! Du hast die bösen Leute vertrieben! Ich glaube, das Ballon-Pokémon kommt uns jetzt wieder besuchen!'],
            { give: 'great-ball', count: 3 }
          ] }
        ] }
      ];
      put(I, { id: 'ww_girl_in', x: npc(I, 'ww_dad')?.x - 1, y: npc(I, 'ww_dad')?.y, dir: 'right', look: 'twin', name: 'Kleines Mädchen', show: 'ww_dad_thanks', talk: [['Kleines Mädchen', 'Ich glaube, das Ballon-Pokémon kommt uns jetzt wieder besuchen!']] });
    }
  }
}
