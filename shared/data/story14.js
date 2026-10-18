// Kapitel 5 nach den Originalskripten von Platin: Lucia auf Route 207, Zyrus im Kraterberg, Barry in
// Herzhofen und Trostu, Schleiede (Marinus vor der Arena, Lucias gestohlener Pokédex, Doppelkampf am
// Lagerhaus, LeBelle führt dich hinein).
import { PARTNERS } from './story8.js';

export function applyStory14({ TRAINERS, SCRIPTS, NPCS, TRIGGERS, MAPS, ORIG_ON }) {
  if (!ORIG_ON) return;
  const G = (map, gx, gz) => { const o = MAPS[map]?.orig; return o && o.m === 0 ? [gx - o.x, gz - o.z] : [gx, gz]; };
  const npc = (map, id) => (NPCS[map] || []).find((n) => n.id === id);
  const put = (map, n) => { NPCS[map] = (NPCS[map] || []).filter((x) => x.id !== n.id); NPCS[map].push(n); };
  const set = (map, id, fields) => { const n = npc(map, id); if (n) Object.assign(n, fields); return n; };
  const trig = (map, list, ...dropScripts) => {
    TRIGGERS[map] = [...(TRIGGERS[map] || []).filter((t) => !dropScripts.includes(t.script) && !list.some((x) => x.script === t.script)), ...list];
  };
  const at = (map, gx, gz, w = 1, h = 1) => { const [x, y] = G(map, gx, gz); return { x, y, w, h }; };

  // ================================================================ Route 207: Lucia bringt das Itemradar
  {
    const R = 'route_207';
    const l = set(R, 'pt_lucia_207', { x: G(R, 332, 713)[0], y: G(R, 332, 713)[1], dir: 'right', show: ['badge_forest', 'poketch', '!papp_dowse', 'r207_lucia_in'] });
    if (l) {
      SCRIPTS.lucia207 = [
        { flag: 'r207_lucia_in', quiet: true },
        { walk: 'pt_lucia_207', to: 'player' },
        ['Lucia', 'Hallo, @P! Wie läuft es mit deinem Pokédex? Bei mir? Irgendwo zwischen fantastisch und, äh, hoffnungslos ... Aber es geht nicht um mich! Ich habe etwas Schönes für dich.'],
        { x: 'poketch', who: 'lucia' },
        ['Lucia', 'Okay, arbeiten wir weiter an unseren Pokédex-Einträgen. Prof. Eibe zählt auf uns!'],
        { walk: 'pt_lucia_207', to: 'exit' }
      ];
      trig(R, [{ ...at(R, 340, 712, 1, 3), when: ['badge_forest', 'poketch', '!papp_dowse', '!r207_lucia_in'], script: 'lucia207' }]);
    }
  }

  // ================================================================ Kraterberg: Zyrus spricht über den Ursprung Sinnohs
  {
    const C = 'mt_coronet';
    put(C, { id: 'cyrus_mc', x: 6, y: 7, dir: 'left', look: 'boss', name: 'Zyrus', show: ['badge_forest', '!coronet_cyrus'] });
    SCRIPTS.coronetCyrus = [
      { walk: 'cyrus_mc', to: 'player' },
      ['Zyrus', 'Einer Theorie zufolge ist der Kraterberg der Ort, an dem die Region Sinnoh entstand.'],
      ['Zyrus', '... In einer neu erschaffenen Welt ... Einer Welt, in der nur die Zeit floss und der Raum sich ausdehnte ... Dort hätte es keinen Streit geben dürfen.'],
      ['Zyrus', 'Doch was ist aus dieser Welt geworden? Weil der menschliche Geist schwach und unvollkommen ist, hat sich Streit ausgebreitet ... Diese Welt wird dadurch zugrunde gerichtet ... Ich finde diesen Zustand bedauerlich ...'],
      { walk: 'cyrus_mc', to: 'exit' },
      { flag: 'coronet_cyrus' }
    ];
    trig(C, [{ x: 1, y: 4, w: 3, h: 5, when: ['badge_forest', '!coronet_cyrus'], script: 'coronetCyrus' }]);
  }

  // ================================================================ Herzhofen: Barry fordert dich heraus
  SCRIPTS.rival3 = [
    { emote: 'barry_hh' },
    { walk: 'barry_hh', to: 'player', fast: true },
    ['Barry', 'He! Warte! Du bist auch in Herzhofen? Das trifft sich super! Ich zeig dir, wie viel stärker ich geworden bin!'],
    { battle: 'rival3' },
    ['Barry', 'Mist! Na gut, ich gehe jetzt zum Freundschaftsplatz und trainiere mit meinen Pokémon. Wir sehen uns!'],
    { walk: 'barry_hh', to: 'exit', fast: true },
    { flag: 'rival3' }
  ];

  // ================================================================ Trostu: Barry kommt aus den Ruinen gerannt
  {
    const T = 'solaceon_town';
    const [bx, by] = G(T, 560, 659);
    put(T, { id: 'barry_sol', x: bx, y: by, dir: 'down', look: 'rival', name: 'Barry', show: ['sol_barry_in', '!sol_barry'] });
    SCRIPTS.solBarry = [
      { flag: 'sol_barry_in', quiet: true },
      { walk: 'barry_sol', to: 'player', fast: true },
      ['Barry', 'Juhuu!'],
      { face: 'barry_sol', dir: 'left' }, { face: 'barry_sol', dir: 'right' }, { face: 'barry_sol', dir: 'player' },
      ['Barry', 'He, @P! Ich habe was Cooles. Ich zeig es dir, als besonderen Gefallen!'],
      ['Barry', 'Hä? Was zum ... Was soll das denn? ... Ich habe ein paar Sticker bekommen, aber vergessen, sie aufzukleben. Ach ja. Weil ich in den Ruinen war. Die Ruinen hier sind cool. Die musst du dir ansehen!'],
      ['Barry', 'Ich habe sogar eine Versteckte Maschine gefunden. Auflockern! Egal, wir kämpfen ein andermal. Bis dann!'],
      { walk: 'barry_sol', to: 'exit', fast: true },
      { flag: 'sol_barry' }
    ];
    trig(T, [{ ...at(T, 557, 669, 7, 1), when: ['has_starter', '!sol_barry'], script: 'solBarry' }]);
  }

  // ================================================================ Schleiede
  {
    const V = 'veilstone_city';
    const [lx, ly] = G(V, 682, 614);
    const [dx, dy] = G(V, 684, 611); // Arenatür
    // Vor der Arena: Lucia, Marinus kommt singend aus der Arena
    put(V, { id: 'lucia_vs1', x: lx, y: ly, dir: 'right', look: 'assistant', name: 'Lucia', show: ['!vs_lucia_left', '!badge_cobble'] });
    put(V, { id: 'wake_vs', x: dx, y: dy, dir: 'down', look: 'wake', name: 'Marinus', show: ['vs_wake_out', '!vs_wake'], fromDoor: true });
    SCRIPTS.vsWake = [
      { face: 'lucia_vs1', dir: 'player' },
      ['Lucia', '@P, willst du die Arena herausfordern? Mensch, du wirst immer stärker, oder? Ich? Na ja, ich war im Kaufhaus shoppen, und ... Ich meine, natürlich arbeite ich auch an meinem Pokédex, aber ...'],
      { face: 'lucia_vs1', dir: 'down' },
      { flag: 'vs_wake_out', quiet: true },
      { walk: 'wake_vs', path: 'd' },
      ['???', 'Der Ring ist mein tosendes Meer! Die hohen Wellen haben mich geformt! Crash! Crash! Marinus! Crash! Crash! Marinus! Ich bin die Flutwelle, die dich fortspült! Lösch das Feuer, Marinus! Flieh vor dem Strom, Marinus! Ah, ah, aaaah! Der Ring ist mein Meer!'],
      ['???', 'Hallo, ihr zwei! Ihr wollt die Arenaleiterin herausfordern, was? Ich sag es euch gleich: Sie ist jung, aber ein geborenes Genie. Ich habe mit ihr trainiert und war baff, wie stark sie ist!'],
      ['Marinus', 'Hoppla! Ich sollte mich wohl vorstellen! Ich bin der dreifache Champion in Pokémon, Wrestling und Gesang. Ich bin Marinus, Arenaleiter von Weideburg! Wir sehen uns wieder!'],
      { walk: 'wake_vs', to: 'exit', fast: true },
      { flag: 'vs_wake', quiet: true },
      ['Lucia', '...'],
      { wait: 300 },
      ['Lucia', 'Also, äh, @P. Viel Glück bei der Arena.'],
      { walk: 'lucia_vs1', to: 'exit' },
      { flag: 'vs_lucia_left' }
    ];
    trig(V, [{ ...at(V, 681, 616, 4, 1), when: ['!vs_lucia_left', '!badge_cobble'], script: 'vsWake' }]);

    // Nach dem Orden: Lucias Pokédex wurde gestohlen
    put(V, { id: 'lucia_vs2', x: lx, y: ly + 2, dir: 'up', look: 'assistant', name: 'Lucia', show: ['vs_help_in', '!vs_help'] });
    SCRIPTS.vsHelp = [
      { flag: 'vs_help_in', quiet: true },
      { walk: 'lucia_vs2', to: 'player' },
      ['Lucia', 'Hallo, @P! Bitte, kannst du mir helfen? Ein paar Galaktik-Gauner haben mir meinen Pokédex weggenommen. Ich brauche deine Hilfe, um ihn zurückzubekommen. Ich warte vor den Lagerhäusern. Bitte komm!'],
      { walk: 'lucia_vs2', to: 'exit' },
      { flag: 'vs_help' }
    ];
    trig(V, [{ x: dx - 1, y: dy + 1, w: 3, h: 1, when: ['badge_cobble', '!vs_help', '!warehouse_done'], script: 'vsHelp' }]);

    // Vor dem Lagerhaus: Doppelkampf mit Lucia, dann LeBelle
    const gn = npc(V, 'wh_guard_n');
    const gs = npc(V, 'wh_guard_s');
    const gm = npc(V, 'wh_guard');
    if (gn && gs) {
      for (const g of [gn, gs, gm].filter(Boolean)) Object.assign(g, { show: ['!vs_grunts_left', '!warehouse_done'] });
      if (gm) Object.assign(gm, { talk: 'vsGuard' });
      Object.assign(gn, { talk: 'vsGuard' }); Object.assign(gs, { talk: 'vsGuard' });
      SCRIPTS.vsGuard = [
        { face: 'wh_guard_n', dir: 'player' },
        ['Rüpel 1', 'He, du! Ja, du! Das ist das Lagerhaus von Team Galaktik! Das ist kein Spielplatz für Kinder!'],
        ['Rüpel 2', 'Das ist das geniale Lagerhaus des genialen Team Galaktik! So ein kleines Kind wie du sollte lieber in der Pokémon-Arena spielen. Die Arenaleiterin ist ja auch nur ein Kind wie du!']
      ];
      PARTNERS.lucia_vs = { name: 'Lucia', party: [['third', 30], [35, 28]], maps: [] };
      TRAINERS.grunts_vs_tag = {
        name: 'Rüpel und Rüpel', cls: 'Team Galaktik', look: 'grunt', prize: 40, partner: 'lucia_vs', flag: 'grunts_vs_tag',
        party: [[434, 29], [41, 29], [431, 29], [41, 29]], intro: [], win: [['Galaktik-Rüpel', 'Ooch, so ein Mist!']]
      };
      put(V, { id: 'lucia_vs3', x: gn.x - 3, y: gn.y + 1, dir: 'right', look: 'assistant', name: 'Lucia', show: ['vs_help', '!vs_tag_done'], talk: 'vsTag' });
      const [kx, ky] = G(V, 692, 603);
      put(V, { id: 'looker_vs', x: kx, y: ky + 6, dir: 'up', look: 'police', name: 'LeBelle', show: ['vs_looker_in', '!vs_tag_done'] });
      SCRIPTS.vsTag = [
        { face: 'lucia_vs3', dir: 'player' },
        ['Lucia', 'Hallo, @P! Erinnerst du dich an Team Galaktik? Diese furchtbaren Leute? Sie wollten in Jubelstadt die Forschungsergebnisse von Prof. Eibe stehlen, weißt du noch? Ich bin ihnen begegnet, und sie haben mir meinen Pokédex weggenommen.'],
        ['Lucia', 'Bitte, ich brauche deine Hilfe. Lass uns zusammen kämpfen! Du und deine Pokémon zusammen mit mir und meinen Pokémon ... So vereint kann unser Traumteam gar nicht verlieren! Diese bösen Leute kommen mit ihren schmutzigen Taten nicht davon!'],
        { face: 'lucia_vs3', dir: 'right' },
        ['Rüpel 1', 'Was? Jetzt hast du deinen Kumpel mitgebracht, um deinen Pokédex zurückzuholen? Wir schicken euch gern beide heulend nach Hause zu Mami!'],
        ['Rüpel 2', 'Ihr wollt den Pokédex von uns zurück? Nicht, wenn wir, Team Galaktik, ihn viel besser gebrauchen können! Aber okay, Lagerhaus bewachen ist langweilig! Wir nehmen es mit euch beiden auf!'],
        { battle: 'grunts_vs_tag' },
        ['Rüpel 1', 'Ooch, so ein Mist! Unsere Pokémon sind Versager! Wir sollten uns im Hauptquartier neue holen. Pah! Wen interessiert schon so ein Pokédex? Team Galaktik wird alle Pokémon der Welt besitzen ... Nein, des Universums!'],
        ['Rüpel 1', 'Da! Nimm ihn! Nimm deinen Pokédex!'],
        ['Rüpel 2', 'Die Sachen aus dem Lagerhaus sind sowieso schon nach Weideburg gebracht worden ... Also sagen wir: „Das zahlen wir euch heim!“ Und rennen weg, wie es sich für Rüpel gehört.'],
        { walk: ['wh_guard_n', 'wh_guard_s'], to: 'exit', fast: true },
        { flag: 'vs_grunts_left', quiet: true },
        { wait: 400 },
        { flag: 'vs_looker_in', quiet: true },
        { walk: 'looker_vs', to: 'player' },
        ['LeBelle', 'Keine Angst, ich bin herbeigeeilt. Ich hörte von Kindern, die sich mit Team Galaktik anlegen. Und natürlich seid es ihr.'],
        { face: 'lucia_vs3', dir: 'player' },
        ['Lucia', 'Oh ... Das ist doch dieser komische Mann aus Jubelstadt ...'],
        ['LeBelle', 'Du beleidigst mich ins Gesicht? Wie überaus unhöflich.'],
        ['Lucia', 'Das tut mir furchtbar leid. Team Galaktik hatte meinen Pokédex, darum war ich so gereizt ... Das ist mir einfach rausgerutscht ... Ich gehe jetzt besser. Nimm dich vor Team Galaktik in Acht.'],
        { walk: 'lucia_vs3', to: 'exit' },
        { flag: 'vs_lucia3_left', quiet: true },
        ['LeBelle', 'Das macht nichts. Viel interessanter ist das kriminelle Verhalten von Team Galaktik. Sie versuchen, einem Kind seine Sachen zu stehlen? Das Ausmaß ihrer Kriminalität wirkt eher winzig. Gerade das macht sie vielleicht umso unheimlicher.'],
        ['LeBelle', 'Ihr Lagerhaus muss untersucht werden. Kommt mit, wir sehen uns das an!'],
        { flag: 'vs_tag_done' },
        { warp: ['galactic_warehouse', 8, 10, 'up'] }
      ];
      set(V, 'lucia_vs3', { show: ['vs_help', '!vs_lucia3_left', '!vs_tag_done'] });
    }
  }
}
