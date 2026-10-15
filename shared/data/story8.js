// Feinschliff wie in Platin: Begleiter (Heide im Ewigwald, Mira im Irrweg, Urs auf der Eiseninsel,
// Barry auf der Speersäule, Buck am Kahlberg) mit Doppelkämpfen gegen zwei Gegner, das Riolu-Ei,
// wandernde Pokémon (Vesprit, Cresselia, die drei Vögel), Rotom nur nachts, die Kugeln für Dialga und
// Palkia, die drei Titanen für Regigigas, der Kampfturm mit Siegesserie und die restliche Kampfzone.
// applyStory8 wird am Ende von story.js aufgerufen und passt dort die bestehenden Daten an.
const say = (who, text) => [[who, text]];
const T = (name, cls, look, prize, sight, party, intro, win) => ({ name, cls, look, prize, sight, party, intro: say(`${cls} ${name}`, intro), win: say(`${cls} ${name}`, win) });
const CENTER = (map) => ({ id: `${map}_nurse`, x: 5, y: 2, dir: 'down', look: 'nurse', name: 'Pflegerin' });

// Begleiter: kämpfen in jedem Kampf auf ihren Karten mit, heilen dein Team danach und gehen,
// sobald du ihre Karten verlässt (bye) oder ein Skript sie verabschiedet.
export const PARTNERS = {
  heide: { name: 'Heide', party: [[113, 15]], maps: ['eterna_forest'], heal: true, bye: 'Heide: Hier ist der Ausgang! Danke, dass du mich begleitet hast. Pass gut auf deine Pokémon auf!' },
  mira: { name: 'Mira', party: [[64, 37]], maps: ['wayward_cave'], heal: true, bye: 'Mira: Endlich draußen! Danke, dass du mich aus dem Irrweg geführt hast. Ich trainiere jetzt weiter mit Kadabra.' },
  riley: { name: 'Urs', party: [[448, 34]], maps: ['iron_island', 'iron_island_deep'], heal: true, bye: 'Urs: Ich bleibe noch auf der Insel. Danke für deine Hilfe!' },
  barry_sp: { name: 'Barry', party: [[398, 46]], maps: [] },
  buck: { name: 'Buck', party: [[344, 61]], maps: ['stark_mountain', 'stark_mountain_deep'], heal: true, bye: 'Buck: Ich bleibe noch ein bisschen hier am Berg. Bis bald, Champ!' }
};

// Wandernde Pokémon: Art -> Level
export const ROAMERS = { 481: 50, 488: 50, 144: 60, 145: 60, 146: 60 };
// Titanen für Regigigas
export const TITANS = [377, 378, 379];

// ------------------------------------------------------------------ Kampfturm
// Turmherr Palmer im 21. und 49. Kampf, sonst zufällige Trainer mit drei Pokémon auf Level 50
export const TOWER = {
  level: 50, round: 7,
  brain: { 21: [[464, 50], [350, 50], [149, 50]], 49: [[485, 50], [488, 50], [486, 50]] },
  classes: [['Ass-Trainer', 'ace'], ['Ass-Trainerin', 'ace'], ['Psycho', 'psychic'], ['Veteran', 'oldman'], ['Wanderer', 'hiker'], ['Schwimmerin', 'swimmer'], ['Forscher', 'scientist'], ['Göre', 'lass'], ['Arbeiter', 'worker'], ['Skifahrer', 'skier']],
  names: ['Leni', 'Jakob', 'Selma', 'Bernd', 'Tom', 'Anna', 'Paul', 'Mia', 'Lukas', 'Emma', 'Felix', 'Lina', 'Jonas', 'Nora', 'Ben', 'Ella', 'Max', 'Lea', 'Tim', 'Ida'],
  // Kampfpunkte je geschaffter Runde (danach bleibt es beim letzten Wert)
  bp: [3, 4, 5, 6, 7, 8, 9, 10],
  // Tausch gegen Kampfpunkte: [Gegenstand, Preis]
  shop: [['rare-candy', 48], ['tm06', 32], ['tm45', 32], ['tm61', 32], ['tm40', 40], ['tm31', 40], ['tm08', 48], ['tm04', 48], ['tm81', 64], ['tm30', 64], ['tm53', 64], ['tm71', 80], ['tm26', 80]]
};

export const TRAINERS8 = {
  // Doppelkämpfe gegen zwei Trainer mit Partner an deiner Seite
  iron_tag: {
    name: 'Rüpel und Rüpel', cls: 'Team Galaktik', look: 'grunt', prize: 40, sight: 4, partner: 'riley',
    party: [[42, 39], [434, 39], [431, 40], [109, 40], [42, 40], [435, 41]],
    intro: [['Galaktik-Rüpel', 'Was willst du hier unten? Wir sammeln nur ein paar Pokémon für Team Galaktik!'], ['Galaktik-Rüpel', 'Und Urs bringt uns auch nicht davon ab! Zu zweit schaffen wir euch!'], ['Urs', 'Wir kämpfen zusammen. Lucario, los!']],
    win: [['Galaktik-Rüpel', 'Mist! Der Boss ist doch weg, warum machen wir überhaupt noch weiter?'], ['Galaktik-Rüpel', 'Ich gebe auf. Ich suche mir einen ehrlichen Beruf.']]
  },
  spear_tag: {
    name: 'Mars und Jupiter', cls: 'Commander', look: 'commander', prize: 80, sight: 3, partner: 'barry_sp',
    party: [[42, 44], [432, 46], [435, 46], [42, 44]],
    intro: [['Barry', 'Warte! Ich bin auch da! Ich lasse dich hier oben doch nicht allein!'], ['Mars', 'Bis hierher und nicht weiter! Der Boss braucht Ruhe für das Ritual!'], ['Jupiter', 'Zwei Kinder gegen zwei Commander? Na schön. Ihr wollt es ja nicht anders.']],
    win: [['Mars', 'Schon wieder... Geh, du bist sowieso nicht aufzuhalten.'], ['Jupiter', 'Na gut. Sieh selbst, was der Boss erschafft.'], ['Barry', 'Geh vor zu Zyrus! Ich halte dir hier den Rücken frei!']]
  },
  stark_tag: {
    name: 'Mars und Jupiter', cls: 'Commander', look: 'commander', prize: 120, sight: 2, partner: 'buck',
    party: [[437, 58], [169, 58], [432, 60], [437, 58], [169, 59], [435, 60]],
    intro: [['Mars', 'Du schon wieder! Zyrus ist fort, aber Charon sagt, mit dem Magmastein bauen wir alles neu auf!'], ['Jupiter', 'Ich folge Charon nicht, weil ich ihn mag. Aber ohne Team Galaktik bin ich niemand. Verschwinde!'], ['Buck', 'Zwei gegen zwei! Komm, Champ, das schaffen wir!']],
    win: [['Mars', 'Immer du. Vielleicht sollte ich mir wirklich etwas anderes suchen.'], ['Jupiter', 'Na gut. Es ist vorbei. Endgültig.']]
  },
  // Restliche Kampfzone
  ace_ronja: T('Ronja', 'Ass-Trainerin', 'ace', 60, 3, [[407, 56], [36, 56]], 'Route 226 ist nur etwas für echte Profis. Zeig mal!', 'Echt profimäßig.'),
  swimmer_jan: T('Jan', 'Schwimmer', 'swimmer', 24, 3, [[73, 54], [121, 55]], 'Hier im Wasser bin ich der Schnellste!', 'Ich muss Luft holen.'),
  ace_kurt: T('Kurt', 'Ass-Trainer', 'ace', 60, 3, [[450, 56], [28, 56]], 'Der Sandsturm macht mich nur stärker!', 'Sand in den Augen. Das war es.'),
  hiker_otto: T('Otto', 'Wanderer', 'hiker', 40, 3, [[76, 56], [112, 57]], 'Hoho! In der Wüste findet man die besten Steine!', 'Hoho! Ein Stein vom Herzen.'),
  ace_greta: T('Greta', 'Ass-Trainerin', 'ace', 60, 3, [[36, 57], [213, 57], [468, 57]], 'Fast am Erholungsgebiet. Aber erst kämpfen!', 'Jetzt brauche ich wirklich Erholung.'),
  swimmer_lisa: T('Lisa', 'Schwimmerin', 'swimmer', 24, 3, [[226, 55], [171, 55]], 'Bis zum Kampfareal ist es nicht mehr weit!', 'Weiter schwimmen, weiter trainieren.')
};

export const NPCS8 = {
  route_226: [
    { id: 'ronja_226', x: 4, y: 8, dir: 'right', look: 'ace', name: 'Ass-Trainerin Ronja', trainer: 'ace_ronja' },
    { id: 'jan_226', x: 14, y: 8, dir: 'left', look: 'swimmer', name: 'Schwimmer Jan', trainer: 'swimmer_jan' }
  ],
  route_228: [
    { id: 'kurt_228', x: 14, y: 10, dir: 'left', look: 'ace', name: 'Ass-Trainer Kurt', trainer: 'ace_kurt' },
    { id: 'otto_228', x: 6, y: 25, dir: 'left', look: 'hiker', name: 'Wanderer Otto', trainer: 'hiker_otto' }
  ],
  route_229: [{ id: 'greta_229', x: 15, y: 5, dir: 'down', look: 'ace', name: 'Ass-Trainerin Greta', trainer: 'ace_greta' }],
  route_230: [{ id: 'lisa_230', x: 22, y: 7, dir: 'left', look: 'swimmer', name: 'Schwimmerin Lisa', trainer: 'swimmer_lisa' }],
  resort_area: [{ id: 'resort_man', x: 9, y: 9, dir: 'down', look: 'oldman', name: 'Gärtner', talk: [['Gärtner', 'Im Erholungsgebiet ruhen sich die Trainer der Kampfzone aus. Die Villa dort oben gehört jetzt dir, Champ!']] }],
  resort_center: [CENTER('resort_center')],
  resort_villa: [{ id: 'villa_butler', x: 3, y: 3, dir: 'down', look: 'clerk', name: 'Butler', talk: 'villa' }],
  resort_house: [{ id: 'resort_girl', x: 6, y: 4, dir: 'left', look: 'lass', name: 'Frau', talk: [['Frau', 'Nach einem langen Tag im Kampfturm komme ich hierher. Das Meer ist so schön ruhig.']] }],
  rock_peak_ruins: [{ id: 'regirock', x: 7, y: 4, dir: 'down', look: 'regigigas', name: 'Regirock', show: ['champion', '!met_regirock'], talk: 'regirock' }],
  iceberg_ruins: [{ id: 'regice', x: 7, y: 4, dir: 'down', look: 'regigigas', name: 'Regice', show: ['champion', '!met_regice'], talk: 'regice' }],
  iron_ruins: [{ id: 'registeel', x: 7, y: 4, dir: 'down', look: 'regigigas', name: 'Registeel', show: ['champion', '!met_registeel'], talk: 'registeel' }],
  eterna_city: [{ id: 'oak', x: 21, y: 9, dir: 'down', look: 'prof', name: 'Prof. Eich', show: 'champion', talk: 'oak' }]
};

const legend = (name, species, level, flag, intro, cry) => [[null, intro], [name, cry], { legend: species, level }, { flag }, [null, 'Es ist wieder still.']];
const titan = (name, species, flag, intro, cry) => legend(name, species, 30, flag, intro, cry);

export const SCRIPTS8 = {
  // Begleiter
  heideJoin: [
    ['Heide', 'Hallo! Ich bin Heide und suche hier seltene Pokémon. Der Wald ist dunkel und ich fürchte mich ein bisschen.'],
    ['Heide', 'Gehen wir zusammen bis zum Ausgang? Mein Chaneira kämpft an deiner Seite und heilt dein Team nach jedem Kampf.'],
    { heal: true }, { partner: 'heide' }, { flag: 'heide_joined' }, [null, 'Heide begleitet dich jetzt.']
  ],
  miraJoin: [
    ['Mira', 'Oh! Endlich jemand! Ich habe mich in diesem Irrweg verlaufen. Er ist so dunkel und verwinkelt.'],
    ['Mira', 'Darf ich mit dir gehen? Mein Kadabra hilft dir in jedem Kampf, und danach heile ich deine Pokémon.'],
    { heal: true }, { partner: 'mira' }, { flag: 'mira_joined' }, [null, 'Mira begleitet dich jetzt.']
  ],
  rileyJoin: [
    ['Urs', 'Du bist doch der Trainer, der Team Galaktik schon so oft aufgehalten hat. Ich bin Urs.'],
    ['Urs', 'Team Galaktik sammelt tief in dieser Höhle Pokémon ein. Allein schaffe ich es nicht. Gehen wir zusammen?'],
    ['Urs', 'Mein Lucario kämpft an deiner Seite, und nach jedem Kampf heile ich dein Team.'],
    { heal: true }, { partner: 'riley' }, { flag: 'riley_joined' }, [null, 'Urs begleitet dich jetzt.']
  ],
  riley: [
    { if: 'riolu_gift', then: say('Urs', 'Kümmere dich gut um das Ei. Wenn Riolu dir vertraut, wird aus ihm ein starkes Lucario.'),
      else: [
        ['Urs', 'Geschafft! Die Pokémon der Insel sind wieder sicher. Danke, ohne dich hätte ich das nicht geschafft.'],
        ['Urs', 'Ich möchte dir etwas schenken. Dieses Ei hat Lucario gefunden. Es spürt in ihm eine starke Aura.'],
        { egg: 447 }, { flag: 'riolu_gift' }, { partner: null },
        ['Urs', 'Trag es bei dir, dann schlüpft es irgendwann. Ich bleibe noch auf der Insel.']
      ] }
  ],
  buck: [
    { if: 'stark_done', then: [['Buck', 'Heatran ist aufgewacht! Und du hast Charon aufgehalten. Du bist echt der Champ.']],
      else: [
        ['Buck', 'Ich bin Buck. Ich trainiere hier am Kahlberg, weil es hier so schön heiß ist!'],
        ['Buck', 'Aber tief im Berg sind komische Leute in Raumanzügen. Sie wollen den Magmastein stehlen. Ohne den Stein wacht das Pokémon im Berg nie auf!'],
        { if: '!buck_joined', then: [['Buck', 'Ich komme mit! Mein Zirkulas kämpft an deiner Seite, und nach jedem Kampf heile ich dein Team.'], { heal: true }, { partner: 'buck' }, { flag: 'buck_joined' }, [null, 'Buck begleitet dich jetzt.']],
          else: [{ partner: 'buck' }, ['Buck', 'Los, wir gehen zusammen weiter!']] }
      ] }
  ],
  charon: [
    { if: 'beat_stark_tag',
      then: [
        ['Charon', 'Was? Mars und Jupiter haben verloren? Gegen zwei Kinder?'],
        ['Charon', 'Mit dem Magmastein hätte ich die Legende von Heatran beherrscht. Und dann ganz Sinnoh!'],
        [null, 'Die Erde bebt. Charon stolpert und lässt den Magmastein fallen.'],
        ['Charon', 'Nein! Gut, gut. Ich gehe ja schon. Aber ihr hört noch von mir!'],
        { flag: 'stark_done' },
        [null, 'Tief im Berg glüht etwas auf. Ein Pokémon ist erwacht.'],
        ['Buck', 'Wow! Ich gehe zurück zu Opa ins Überlebensareal. Danke, Champ!'], { partner: null }
      ],
      else: [['Charon', 'Ah, Besuch. Meine Leute werden sich gern um dich kümmern.']] }
  ],
  // Wandernde Pokémon
  mesprit: [
    [null, 'Ein kleines rosa Pokémon schwebt vor dir. Es ist Vesprit, das Wesen der Gefühle. Es lächelt dich an.'],
    ['Vesprit', '...!'],
    [null, 'Vesprit fliegt davon! Es zieht jetzt durch ganz Sinnoh.'],
    { roam: 481 }, { flag: 'met_mesprit' }
  ],
  cresselia: [
    [null, 'Im Mondlicht schwebt ein anmutiges Pokémon über der Lichtung. Es ist Cresselia, das Pokémon der schönen Träume.'],
    ['Cresselia', 'Fiiiu!'],
    [null, 'Cresselia fliegt davon! Es zieht jetzt durch ganz Sinnoh. Wo es eben schwebte, liegt eine Feder.'],
    { give: 'lunar-wing' }, { roam: 488 }, { flag: 'met_cresselia' }
  ],
  oak: [
    { if: 'birds_roam', then: say('Prof. Eich', 'Hast du schon einen der drei Vögel gesehen? Sie sind schnell, du brauchst Geduld und gute Bälle!'),
      else: [
        ['Prof. Eich', 'Hallo! Ich bin Prof. Eich aus Kanto. Ich besuche meinen alten Freund Prof. Eibe.'],
        ['Prof. Eich', 'Du bist also der neue Champ! Dann erzähle ich dir ein Geheimnis: Arktos, Zapdos und Lavados sind nach Sinnoh gekommen.'],
        ['Prof. Eich', 'Sie ziehen von Route zu Route. Wenn du Glück hast, triffst du sie im hohen Gras.'],
        { roam: 144 }, { roam: 145 }, { roam: 146 }, { flag: 'birds_roam' }
      ] }
  ],
  // Rotom erscheint nur nachts (20 bis 4 Uhr) im alten Fernseher
  rotomTv: [
    { if: 'met_rotom', then: [[null, 'Ein uralter Fernseher. Er ist dunkel und still.']],
      else: [{ ifNight: true,
        then: [
          [null, 'Plötzlich springt der alte Fernseher an. Ein kleines Pokémon aus Plasma flitzt aus dem Bildschirm!'],
          ['Rotom', 'Rotom! Rotom!'],
          { legend: 479, level: 20 }, { flag: 'met_rotom' },
          [null, 'Der Fernseher ist wieder dunkel.']
        ],
        else: [[null, 'Ein uralter Fernseher. Er ist nicht eingesteckt, und trotzdem flackert das Bild. Vielleicht passiert hier nachts etwas.']] }] }
  ],
  // Die Kugeln für Dialga und Palkia
  orbsGrandma: [
    { if: '!champion', then: say('Großmutter', 'Danke, dass du die Ruine beschützt hast. Meine Enkelin wollte dich unbedingt treffen.'),
      else: [
        ['Großmutter', 'Du bist also jetzt der Champ, wie meine Enkelin Cynthia. Dann sollst du es wissen.'],
        ['Großmutter', 'Dialga und Palkia sind auf die Speersäule zurückgekehrt. Aber sie zeigen sich nur dem, der ihre Kugeln trägt.'],
        ['Großmutter', 'Die Diamantkugel und die Weißkugel liegen irgendwo im Kraterberg, unter alten Felsen versteckt.'],
        { flag: 'orbs_hint' }
      ] }
  ],
  adamantOrb: [
    { if: ['orbs_hint', '!got_adamant'], then: [[null, 'Unter dem Felsen glitzert etwas!'], { give: 'adamant-orb' }, { flag: 'got_adamant' }], else: [[null, 'Ein schwerer Felsbrocken.']] }
  ],
  lustrousOrb: [
    { if: ['orbs_hint', '!got_lustrous'], then: [[null, 'Unter dem Felsen glitzert etwas!'], { give: 'lustrous-orb' }, { flag: 'got_lustrous' }], else: [[null, 'Ein schwerer Felsbrocken.']] }
  ],
  // Regigigas erwacht nur, wenn Regirock, Regice und Registeel im Team sind
  regigigas: [
    { ifParty: TITANS,
      then: legend('Regigigas', 486, 70, 'met_regigigas', 'Regirock, Regice und Registeel leuchten auf. Die riesige Gestalt im Tempel öffnet die Augen!', 'Gigaaas!'),
      else: [[null, 'Eine riesige Gestalt aus Stein und Eis steht reglos im Tempel. Sie scheint auf etwas zu warten.'], [null, 'In den Sockel sind drei Zeichen geritzt: ein Fels, ein Eisblock und ein Stück Eisen.']] }
  ],
  regirock: titan('Regirock', 377, 'met_regirock', 'Eine Gestalt aus Felsen steht in der Mitte der Ruine. Plötzlich leuchten ihre Augen auf.', 'Rrrock!'),
  regice: titan('Regice', 378, 'met_regice', 'Eine Gestalt aus Eis steht in der Mitte der Ruine. Plötzlich leuchten ihre Augen auf.', 'Iiiice!'),
  registeel: titan('Registeel', 379, 'met_registeel', 'Eine Gestalt aus Eisen steht in der Mitte der Ruine. Plötzlich leuchten ihre Augen auf.', 'Steeel!'),
  villa: [['Butler', 'Willkommen in Ihrer Villa! Der vorige Besitzer hat sie dem neuen Champ geschenkt.'], ['Butler', 'Ruhen Sie sich aus, so lange Sie möchten.'], { heal: true }, ['Butler', 'Ihr Team ist wieder bei Kräften.']],
  // Kampfturm
  towerDesk: [
    ['Empfang', 'Willkommen im Kampfturm! Hier kämpfst du so lange wie möglich ohne Pause. Pro Runde gibt es sieben Kämpfe.'],
    ['Empfang', 'Die ersten drei Pokémon deines Teams treten an. Pokémon über Level 50 kämpfen auf Level 50. Nach jedem Kampf wird geheilt.'],
    { choose: ['Einzelkampf', 'Rekord', 'Abbrechen'], branches: [[{ tower: 'start' }], [{ tower: 'record' }], [['Empfang', 'Wir hoffen, dich bald wiederzusehen.']]] }
  ],
  towerShop: [
    ['Tausch', 'Hier tauschst du Kampfpunkte gegen Preise. Was möchtest du?'],
    { tower: 'shop' }
  ]
};

export const TRIGGERS8 = {
  iron_island: [{ x: 9, y: 12, w: 7, h: 1, when: '!riley_joined', script: 'rileyJoin' }]
};

// Bestehende Daten anpassen (wird am Ende von story.js aufgerufen)
export function applyStory8({ TRAINERS, SCRIPTS, NPCS, TRIGGERS }) {
  Object.assign(TRAINERS, TRAINERS8);
  Object.assign(SCRIPTS, SCRIPTS8);
  for (const [m, list] of Object.entries(NPCS8)) NPCS[m] = [...(NPCS[m] || []), ...list];
  for (const [m, list] of Object.entries(TRIGGERS8)) TRIGGERS[m] = [...(TRIGGERS[m] || []), ...list];
  const npc = (map, id) => NPCS[map].find((n) => n.id === id);
  const drop = (map, ...ids) => { NPCS[map] = NPCS[map].filter((n) => !ids.includes(n.id)); };
  // Heide und Mira schließen sich an, statt nur zu heilen oder etwas zu schenken
  Object.assign(npc('eterna_forest', 'heide'), { talk: 'heideJoin', show: '!heide_joined' });
  Object.assign(npc('wayward_cave', 'mira'), { talk: 'miraJoin', show: '!mira_joined' });
  // Eiseninsel: Urs begleitet dich, die zwei Rüpel kämpfen gemeinsam, danach gibt es das Riolu-Ei
  Object.assign(npc('iron_island_deep', 'iron_g1'), { trainer: 'iron_tag', show: '!beat_iron_tag' });
  Object.assign(npc('iron_island_deep', 'iron_g2'), { trainer: undefined, x: 5, y: 9, dir: 'up', show: '!beat_iron_tag', talk: say('Galaktik-Rüpel', 'Wir zwei gegen euch zwei!') });
  Object.assign(npc('iron_island_deep', 'riley'), { show: 'beat_iron_tag' });
  delete TRAINERS.iron_grunt1; delete TRAINERS.iron_grunt2;
  // Speersäule: Barry kämpft mit dir gegen Mars und Jupiter
  Object.assign(npc('spear_pillar', 'mars_sp'), { trainer: 'spear_tag', show: '!beat_spear_tag' });
  Object.assign(npc('spear_pillar', 'jupiter_sp'), { x: 8, y: 10, trainer: undefined, show: '!beat_spear_tag', talk: say('Jupiter', 'Mars und ich kämpfen gemeinsam.') });
  NPCS.spear_pillar.push({ id: 'barry_sp', x: 6, y: 11, dir: 'up', look: 'rival', name: 'Barry', show: '!spear_done', talk: say('Barry', 'Mach schon! Zyrus darf das Ritual nicht beenden!') });
  delete TRAINERS.mars3; delete TRAINERS.jupiter3;
  // Kahlberg: Buck kämpft mit dir gegen Mars und Jupiter
  Object.assign(npc('stark_mountain_deep', 'mars_sm'), { trainer: 'stark_tag', show: '!beat_stark_tag' });
  Object.assign(npc('stark_mountain_deep', 'jupiter_sm'), { x: 5, y: 9, dir: 'up', trainer: undefined, show: '!beat_stark_tag', talk: say('Jupiter', 'Wir zwei gegen euch zwei!') });
  delete TRAINERS.mars_stark; delete TRAINERS.jupiter_stark;
  // Rotom wohnt im Fernseher und zeigt sich nur nachts
  drop('old_chateau', 'rotom');
  // Großmutter in Elyses erzählt nach dem Titel von den Kugeln
  npc('celestic_house', 'grandma').talk = 'orbsGrandma';
  // Dialga und Palkia brauchen ihre Kugel
  npc('spear_pillar', 'dialga').show = ['champion', 'got_adamant', '!met_dialga'];
  npc('spear_pillar', 'palkia').show = ['champion', 'got_lustrous', '!met_palkia'];
  // Kampfturm: Empfang und Tausch statt fester Trainer
  drop('battle_tower', 'leni_t', 'jakob_t', 'selma_t', 'bernd_t', 'palmer');
  NPCS.battle_tower.push(
    { id: 'tower_desk', x: 6, y: 3, dir: 'down', look: 'clerk', name: 'Empfang', talk: 'towerDesk' },
    { id: 'tower_shop', x: 2, y: 6, dir: 'right', look: 'clerk', name: 'Tausch', talk: 'towerShop' },
    { id: 'tower_palmer_info', x: 10, y: 6, dir: 'left', look: 'worker', name: 'Matrose', talk: say('Matrose', 'Turmherr Palmer zeigt sich nur Trainern mit langer Siegesserie. Im 21. und im 49. Kampf wartet er auf dich!') }
  );
  for (const id of ['tower_leni', 'tower_jakob', 'tower_selma', 'tower_bernd', 'palmer']) delete TRAINERS[id];
}
