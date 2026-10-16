// Doppelkampf-Trainerpaare wie in Platin (Zwillinge, Junges Glück, Mädel & Papa, Duo). Beide Figuren stehen
// an den Stellen der Originalkarte (double_battle_id 1 und 2) und teilen sich einen Trainer: ein Kampf
// zwei gegen zwei, beide gelten danach als besiegt. Mit nur einem kampfbereiten Pokémon sehen sie den
// Spieler nicht, beim Ansprechen kommt der Hinweis aus dem Original. Format siehe origFix.js.
//   _trainers: { id: Trainer } wie in story.js, dazu double: true, looks (zwei Kampfbilder) und notEnough
//   NPC: sight (eigene Sichtweite), after und notEnough (eigener Text dieser Figur)

const pair = (trainer, a, b) => [a, b].map(([id, x, y, dir, sight, look, name, after, notEnough]) =>
  ({ id, x, y, dir, look, name, trainer, sight, after: [[name.split(' ').pop(), after]], notEnough: [[name.split(' ').pop(), notEnough]] }));

const T = (name, cls, look, prize, party, intro, win, looks) => ({ name, cls, look, ...(looks ? { looks } : {}), prize, double: true, party, intro, win });

export const FIX = {
  // Ass-Trainerin Mona (eigene Figur) weicht den Zwillingen aus und steht an der Stelle der Züchterin
  route_209: { mona: [42, 39, 'right'] },
  _add: {
    route_204_north: pair('twins_liz_lena',
      ['twin_liz', 15, 7, 'down', 3, 'twin', 'Zwillinge Liz', 'Dieser Trainer wird bestimmt damit angeben, dass er uns besiegt hat, Lena.', 'Du hast nur ein Pokémon? Das ist ja langweilig!'],
      ['twin_lena', 16, 7, 'down', 4, 'twin', 'Zwillinge Lena', 'Dieser Trainer freut sich richtig, dass er uns besiegt hat, Liz.', 'Ähm, kämpfst du mit uns? Mit mir und Liz?']),
    route_209: [
      ...pair('twins_emma_ina',
        ['twin_emma', 32, 48, 'down', 4, 'twin', 'Zwillinge Emma', 'Das war super! Bist du vielleicht ein Pokémon-Genie? Du hast echt Respekt verdient!', 'Mit Leuten, die nur ein Pokémon haben, reden wir nicht!'],
        ['twin_ina', 33, 48, 'down', 4, 'twin', 'Zwillinge Ina', 'Wir werden auch so starke Trainer wie du! Das hab ich gerade beschlossen! Feuer uns an!', 'Wir reden nicht mit Leuten, die nur ein Pokémon haben!']),
      ...pair('couple_ivan_dea',
        ['couple_ivan', 49, 12, 'down', 2, 'guitarist', 'Junges Glück Ivan', 'Dea, sogar wenn du verlierst, bist du wunderschön...!', 'Ohne Dea mache ich gar nichts... Bring mindestens zwei Pokémon mit, okay?'],
        ['couple_dea', 49, 13, 'left', 2, 'beauty', 'Junges Glück Dea', 'Wir haben verloren... Ivan, ich brauche eine Umarmung, dann ist alles wieder gut!', 'Ich kämpfe nur an der Seite meines süßen Ivan. Hast du keine zwei Pokémon?'])
    ],
    route_210: [
      ...pair('twins_tia_tara',
        ['twin_tia', 13, 65, 'down', 3, 'twin', 'Zwillinge Tia', 'Unsere Mama ist auch ein Zwilling.', 'Wir wollen mit ganz vielen Pokémon kämpfen.'],
        ['twin_tara', 14, 65, 'down', 3, 'twin', 'Zwillinge Tara', 'Wenn Mama und Tante und ich und Tia zusammen sind, ist das total verwirrend und lustig!', 'Ähm, nein. Wir wollen alle zusammen kämpfen.']),
      ...pair('belle_doro_max',
        ['pa_max', 19, 71, 'left', 1, 'rancher', 'Papa Max', 'Ich glaube, das Band zwischen dir und deinen Pokémon ist wie das zwischen Eltern und ihren Kindern.', 'Oh, mit nur einem Pokémon kannst du uns beide unmöglich schlagen.'],
        ['belle_doro', 19, 72, 'left', 1, 'cowgirl', 'Mädel Doro', 'Papa, tut mir leid! Ab morgen strenge ich mich mehr an! ...Ja, morgen fange ich mit der Arbeit an.', 'Du kämpfst gegen mich und meinen Papa. Ein Pokémon reicht da nicht, Schätzchen!'])
    ],
    // Ede folgt Ines im Nebel und hält selbst keine Ausschau
    route_210_north: pair('duo_ede_ines',
      ['duo_ede', 57, 16, 'down', 0, 'ace', 'Duo Ede', 'Selbst wenn ich den besten Trainer der Region treffen könnte... ich würde trotzdem lieber von Ines lernen.', 'Hättest du Lust, gegen uns beide gleichzeitig zu kämpfen? Ich meine, hast du zwei oder mehr Pokémon dabei?'],
      ['duo_ines', 57, 17, 'right', 2, 'ace_f', 'Duo Ines', 'Ede, es tut mir so leid. Als Lehrerin habe ich versagt.', 'Möchtest du mit uns einen Kampf zwei gegen zwei austragen?'])
  },
  // Teams, Level und Preisgeld (Klassenfaktor mal 4) aus res/trainers/data von pret/pokeplatinum
  _trainers: {
    twins_liz_lena: T('Liz & Lena', 'Zwillinge', 'twin', 16, [[417, 11], [417, 11]],
      [['Liz', 'Den Trainer schaffen wir doch mit links, oder, Lena?'], ['Lena', 'Wir sind die Stärksten in unserer Klasse!']],
      [['Liz', 'Oh, oh, oh?'], ['Lena', 'Oh, aber, warte mal!']]),
    twins_emma_ina: T('Emma & Ina', 'Zwillinge', 'twin', 16, [[438, 22], [439, 22]],
      [['Emma', 'Wir sind stark, weil wir zusammen kämpfen!'], ['Ina', 'Wir machen dich ratzeputz fertig!']],
      [['Emma', 'Waaah!'], ['Ina', 'Hwaaah!']]),
    couple_ivan_dea: T('Ivan & Dea', 'Junges Glück', 'guitarist', 64, [[427, 23], [418, 23]],
      [['Ivan', 'Du sollst nicht stören, wenn ich mit Dea zusammen bin!'], ['Dea', 'Hä? Du willst gegen mich kämpfen? Na gut, wenn ich mit Ivan zusammen kämpfen darf!']],
      [['Ivan', 'Ich habe nur Augen für Dea. Haben wir deshalb verloren?'], ['Dea', 'Tut mir leid, Ivan!']]),
    twins_tia_tara: T('Tia & Tara', 'Zwillinge', 'twin', 16, [[25, 23], [35, 23]],
      [['Tia', 'Juhu! Wir kämpfen mit ganz vielen Pokémon!'], ['Tara', 'Juhu! Wir kämpfen alle zusammen!']],
      [['Tia', 'Wir haben uns zusammen echt angestrengt, aber trotzdem verloren.'], ['Tara', 'Wir haben uns zusammen echt angestrengt, aber gewonnen haben wir trotzdem nicht.']]),
    belle_doro_max: T('Doro & Max', 'Mädel & Papa', 'cowgirl', 56, [[77, 24], [78, 24]],
      [['Max', 'Uhohoho! Ich zeige euch, wie eng ich mit meiner Tochter verbunden bin!'], ['Doro', 'Wenn meine Pokémon draußen sind, kann ich mich vor der Arbeit drücken!']],
      [['Max', 'Die Kraft von Vater und Tochter hat nicht gereicht.'], ['Doro', 'Ach, menno!']], ['cowgirl', 'rancher']),
    duo_ede_ines: T('Ede & Ines', 'Duo', 'ace', 120, [[130, 36], [26, 36]],
      [['Ede', 'Ines, schau zu! Ich setze alles ein, was du mir beigebracht hast!'], ['Ines', 'Da kommt ein Trainer. Ede, bist du bereit? Los geht es!']],
      [['Ede', 'Wow. Jemand, der noch besser ist als Ines...'], ['Ines', 'Jetzt habe ich mich vor meinem kleinen Kumpel blamiert...']])
  }
};
