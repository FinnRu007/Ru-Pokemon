// Kapitel 8 nach den Originalskripten von Platin: Mars, Lucia und Prof. Eibe am See der Wahrheit,
// Barry am Scharfsinn-Ufer und Jupiter, die am See der Willenskraft Selfe mitnimmt.
export function applyStory17({ TRAINERS, SCRIPTS, NPCS, TRIGGERS, MAPS, ORIG_ON }) {
  if (!ORIG_ON) return;
  const G = (map, gx, gz) => { const o = MAPS[map]?.orig; return o && o.m === 0 ? [gx - o.x, gz - o.z] : [gx, gz]; };
  const npc = (map, id) => (NPCS[map] || []).find((n) => n.id === id);
  const put = (map, n) => { NPCS[map] = (NPCS[map] || []).filter((x) => x.id !== n.id); NPCS[map].push(n); };
  const trig = (map, list, ...dropScripts) => {
    TRIGGERS[map] = [...(TRIGGERS[map] || []).filter((t) => !dropScripts.includes(t.script) && !list.some((x) => x.script === t.script)), ...list];
  };
  const say = (who, text) => [[who, text]];

  // ================================================================ See der Wahrheit: Mars und ihre Rüpel
  {
    const L = 'lake_verity';
    const during = ['valor_done', '!verity_done'];
    put(L, { id: 'rowan_lv', x: 53, y: 39, dir: 'right', look: 'prof', name: 'Prof. Eibe', show: ['valor_done', '!acuity_done'], talk: 'lvRowanTalk' });
    put(L, { id: 'lucia_lv', x: 54, y: 38, dir: 'right', look: 'assistant', name: 'Lucia', show: ['valor_done', '!acuity_done'], talk: 'lvLuciaTalk' });
    const GR = (name, party, intro, win) => ({ name, cls: 'Team Galaktik', look: 'grunt', prize: 40, sight: 3, party, intro: say('Galaktik-Rüpel', intro), win: say('Galaktik-Rüpel', win) });
    TRAINERS.grunt_lv1 = GR('Rüpel', [[42, 38], [434, 38]], 'Hier kommt keiner durch! Der See gehört jetzt Team Galaktik!', 'Grr ... Aber Commander Mars hält dich schon auf!');
    TRAINERS.grunt_lv2 = GR('Rüpel', [[431, 38], [436, 39]], 'Du schon wieder? Ich dachte, du wärst am See der Kühnheit!', 'Wie bist du so schnell hergekommen?');
    TRAINERS.grunt_lv3 = GR('Rüpel', [[41, 38], [42, 39]], 'Halt! Der Commander ist beschäftigt!', 'Ich sollte doch nur Wache stehen ...');
    TRAINERS.grunt_lv4 = GR('Rüpel', [[434, 39]], 'Die Pokémon des Sees gehören uns. Wie alle Pokémon der Welt!', 'Das wird der Commander nicht gern hören.');
    const spots = [['grunt_lv1', 43, 49, 'right'], ['grunt_lv2', 50, 49, 'left'], ['grunt_lv3', 48, 43, 'down'], ['grunt_lv4', 53, 43, 'left']];
    for (const [id, x, y, dir] of spots) put(L, { id, x, y, dir, look: 'grunt', name: 'Galaktik-Rüpel', show: during, trainer: id });
    put(L, { id: 'grunt_lv0', x: 47, y: 51, dir: 'down', look: 'grunt', name: 'Galaktik-Rüpel', show: during,
      talk: [['Galaktik-Rüpel', 'Was will denn dieser Opa hier? Der regt sich ständig über uns auf. Soll er doch, wir sind gleich fertig!']] });
    SCRIPTS.lvRowan = [
      { face: 'rowan_lv', dir: 'down' },
      { emote: 'rowan_lv' },
      { walk: 'rowan_lv', path: 'd' },
      ['Prof. Eibe', 'Ah, @P! Gerade rechtzeitig! Diese Schurken von Team Galaktik sind hinter dem legendären Pokémon her! @P, hilf uns! Du musst Lucia helfen!'],
      { flag: 'lv_rowan_talk' }
    ];
    trig(L, [{ x: 44, y: 52, w: 6, h: 1, when: ['valor_done', '!verity_done', '!lv_rowan_talk'], script: 'lvRowan' }]);
    SCRIPTS.lvRowanTalk = [
      { if: '!verity_done', then: say('Prof. Eibe', 'Wie könnt ihr es wagen! Ihr irregeleiteten Rüpel! @P! Lucia braucht deine Hilfe!'),
        else: say('Prof. Eibe', '@P, ich brauche dich sofort am See der Willenskraft. Ich mache mir Sorgen um Barry.') }
    ];
    SCRIPTS.lvLuciaTalk = [
      { face: 'lucia_lv', dir: 'player' },
      { if: '!verity_done', then: say('Lucia', '@P! Das ist T-Team Galaktik! Sie nehmen das Pokémon des Sees mit ... Ich ... Ich konnte diese Person nicht besiegen ...'),
        else: say('Lucia', '@P, was hat Team Galaktik vor? Geht es den entführten Pokémon der Seen gut?') }
    ];
    TRAINERS.mars2 = { ...TRAINERS.mars2, sight: 0, intro: [], win: [['Mars', 'Schon wieder verloren ...']] };
    Object.assign(npc(L, 'mars_verity') || {}, { x: 55, y: 38, dir: 'left', trainer: undefined, talk: 'lvMars', show: ['valor_done', '!lv_mars_left'] });
    SCRIPTS.lvMars = [
      { face: 'lucia_lv', dir: 'mars_verity' },
      { face: 'mars_verity', dir: 'player' },
      ['Mars', 'Dieses Gesicht ...! Das weckt schlechte Erinnerungen! Ich rede vom Windkraftwerk! Für diesen kleinen Vorfall habe ich ganz schön Ärger bekommen. Was guckst du so? Du erinnerst dich doch an mich, oder? Na gut, egal. Ich sag dir noch einmal, wer ich bin! Ich bin Mars, eine der Commander von Team Galaktik.'],
      ['Mars', 'Na, was ist? Seid ihr ein verliebtes Pärchen, das zur Rettung eilt? Keine Chance! Nicht die kleinste! Ihr verliert alle!'],
      { battle: 'mars2' },
      ['Mars', 'Ich hab schon wieder verloren ... Erst das Windkraftwerk und jetzt auch noch der See der Wahrheit ... Das darf einer Commander von Team Galaktik nicht passieren ... Ruhig, Mars ... Ich habe meinen Teil erledigt ... Meine Mission war, das Pokémon des Sees in unser Hauptquartier zu bringen ... Genau! Ich habe meine Mission ohne Probleme erfüllt!'],
      ['Mars', 'Team! Wir ziehen ab! Der Boss wartet im Hauptquartier!'],
      ['Mars', 'Die Pokémon der drei Seen sind irgendwie miteinander verbunden. Dank Saturns Auftritt am See der Kühnheit ist hier eine Höhle aufgetaucht. Die Höhle, in der das Pokémon Vesprit schlief. Vesprit ist auch erschienen, wahrscheinlich um seinen Freunden zu helfen. Das kam uns sehr gelegen. Es war super leicht zu fangen.'],
      ['Mars', 'Jetzt haben wir sie alle: Vesprit, „das Wesen der Gefühle“. Tobutz, „das Wesen der Willenskraft“. Selfe, „das Wesen des Wissens“. Und jetzt, wo wir sie alle haben ... Freut euch schon mal darauf, was Team Galaktik mit ihnen vorhat!'],
      { walk: ['mars_verity', 'grunt_lv0', 'grunt_lv1', 'grunt_lv2', 'grunt_lv3', 'grunt_lv4'], to: 'exit', fast: true },
      { flag: 'lv_mars_left', quiet: true },
      { flag: 'verity_done', quiet: true },
      { face: 'lucia_lv', dir: 'player' },
      { face: 'rowan_lv', dir: 'player' },
      ['Prof. Eibe', 'Verstehe ... Das ist also auch am See der Kühnheit passiert ... Noch ein legendäres Pokémon wurde von Team Galaktik verschleppt ... Ihr beide habt euch mit echten Verbrechern angelegt ... Dass ihr unverletzt seid, ist schon ein Grund zum Feiern. ... Aber was ist mit Barry? Was passiert am See der Willenskraft? Ist Barry in Sicherheit?']
    ];
  }

  // ================================================================ Scharfsinn-Ufer: Barry wartet an den Felsen
  {
    const A = 'acuity_lakefront';
    const [bx, by] = G(A, 310, 237);
    const [tx, ty] = G(A, 310, 244);
    put(A, { id: 'barry_alf', x: bx, y: by, dir: 'down', look: 'rival', name: 'Barry', show: ['verity_done', '!alf_barry_left'] });
    SCRIPTS.alfBarry = [
      { face: 'barry_alf', dir: 'player' },
      ['Barry', 'He, @P! Was, du kommst erst jetzt? Laaaangsam! Viel zu langsam! Hör zu, @P. Siehst du, wie uneben die Felsen hier sind? Die kannst du erst hochklettern, wenn du den Orden von Blizzach hast. Egal, ich bin weg. Team Galaktik! Ich komme!'],
      { walk: 'barry_alf', to: { door: 'lake_acuity' }, fast: true },
      { flag: 'alf_barry_left', quiet: true },
      { flag: 'alf_barry' }
    ];
    trig(A, [{ x: tx, y: ty, w: 2, h: 1, when: ['verity_done', '!alf_barry'], script: 'alfBarry' }]);
  }

  // ================================================================ See der Willenskraft: Jupiter hat Selfe, Barry hat verloren
  {
    const L = 'lake_acuity';
    delete TRAINERS.jupiter2;
    Object.assign(npc(L, 'jupiter_acuity') || {}, { x: 17, y: 44, dir: 'up', trainer: undefined, show: ['verity_done', 'badge_icicle', '!la_jupiter_left'] });
    Object.assign(npc(L, 'barry_acuity') || {}, { x: 17, y: 45, dir: 'up', show: ['verity_done', 'badge_icicle', '!acuity_done'], talk: 'laBarryTalk' });
    SCRIPTS.laJupiter = [
      { face: 'barry_acuity', dir: 'up' },
      ['Barry', '! Damit kommst du nicht durch, Team Galaktik!'],
      { face: 'jupiter_acuity', dir: 'down' },
      ['Jupiter', 'Oh? Bist du schon fertig? Deine Pokémon sind nicht schlecht, aber du bist lachhaft schwach. Hast du ernsthaft geglaubt, du könntest das Pokémon des Sees retten? Und Pokémon-Champ werden? Träum weiter, Kleiner. Aber igitt, ist das kalt hier. Gehen wir zurück ins Hauptquartier nach Schleiede.'],
      { walk: 'jupiter_acuity', to: 'player' },
      ['Jupiter', 'Oh? Kenne ich dich nicht? Wir haben uns in Ewigenau getroffen. Hör zu. Team Galaktik wird etwas Gewaltiges tun, zum Wohl aller. Darum solltest du Team Galaktik nicht in die Quere kommen. Und komm mir nicht mit armen Pokémon und anderem belanglosen Kram. Verschwende deine Zeit nicht damit, in unser Hauptquartier in Schleiede zu kommen. Wenn du mich jetzt entschuldigst.'],
      { walk: 'jupiter_acuity', to: 'exit' },
      { flag: 'la_jupiter_left', quiet: true },
      { me: { to: 'barry_acuity' } },
      { face: 'barry_acuity', dir: 'player' },
      ['Barry', '... ... Ja, genau! Ich konnte nichts gegen Team Galaktik ausrichten!'],
      { face: 'barry_acuity', dir: 'up' },
      ['Barry', 'Dieses Pokémon namens Selfe ... Es hat gelitten ...'],
      { face: 'barry_acuity', dir: 'player' },
      ['Barry', 'Ich werde stärker werden ... Es geht nicht ums Gewinnen oder Verlieren ... Das reicht nicht ... Ich muss stärker sein ... Es reicht nicht, einfach der stärkste Trainer aller Zeiten werden zu wollen ... Dafür braucht es ehrliche Mühe ... Und ein entschlossenes Herz.'],
      { walk: 'barry_acuity', to: 'exit' },
      { flag: 'acuity_done' }
    ];
    const ws = (MAPS[L]?.warps || []).filter((w) => w.to === 'acuity_lakefront');
    if (ws.length) {
      const xs = ws.map((w) => w.x); const y = Math.min(...ws.map((w) => w.y)) - 1;
      trig(L, [{ x: Math.min(...xs), y, w: Math.max(...xs) - Math.min(...xs) + 1, h: 1, when: ['verity_done', 'badge_icicle', '!acuity_done'], script: 'laJupiter' }]);
    }
    SCRIPTS.laBarryTalk = [{ face: 'barry_acuity', dir: 'player' }, ['Barry', 'Was machst du hier? Du solltest gar nicht hier sein. Hier gibt es sowieso nichts. Falls etwas passiert, bin ich ja da.']];
  }
}
