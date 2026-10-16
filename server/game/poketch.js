// Pokétch wie in Platin: Kampagne mit den drei Clowns in Jubelstadt, Apps von den Figuren des Originals
// (res/field/scripts in pret/pokeplatinum) und die Daten, die die Apps vom Server brauchen.
// Wird in GameServer eingemischt.
import { MAPS } from '../../shared/data/maps.js';
import { ITEMS } from '../../shared/data/items.js';
import { NATURES } from '../../shared/data/natures.js';
import { POKEMON } from '../../shared/data/pokemon.js';
import { S2C } from '../../shared/protocol.js';
import { visibleNpcs } from '../../shared/data/story.js';
import { APP_NAME, PRESIDENT_APPS, BADGE_FLAGS, appFlag, hasApp } from '../../shared/data/poketch.js';
import { displayName, species } from './pokemonFactory.js';

// Beerenbeete gibt es nur, wenn das Beerenpflanzen eingebaut ist
const BERRY = await import('../../shared/data/berries.js').catch(() => null);
const YES_NO = ['Ja', 'Nein'];
const CLOWN_QUIZ = {
  1: ['Wird ein Pokémon durch Kämpfen und durch Erfahrungspunkte stärker?', 'Ganz genau! Pokémon werden stärker, wenn sie im Kampf Erfahrungspunkte sammeln.', 'Pokémon werden durch Kämpfe stärker!'],
  2: ['Die Pokémon haben Typen beziehungsweise Elementklassen. Gilt das auch für Attacken?', 'Ganz genau! Auch Attacken haben einen Typ.', 'Auch Attacken haben einen Typ, so wie Pokémon!'],
  3: ['Kann ein Pokémon ein Item halten?', 'Ganz genau! Pokémon können Items tragen.', 'Pokémon können Items tragen. Probier es doch mal aus!']
};
const NATURE_APPS = [['calendar', 'Ernst'], ['dot', 'Naiv'], ['roulette', 'Kauzig']];
const HISTORY_MAX = 12;

export const PoketchLogic = {
  badgeCount(p) { return BADGE_FLAGS.filter((f) => p.flags[f]).length; },

  // Gibt eine App und meldet es wie Common_GivePoketchApp
  giveApp(s, app, lines) {
    const p = s.player;
    p.flags[appFlag(app)] = true;
    lines.push({ speaker: null, text: `Die App „${APP_NAME[app]}“ wurde dem Pokétch hinzugefügt!` });
    this.sendProgress(s);
  },

  // Pokémon-Historie: zuletzt gefangene, geschlüpfte, entwickelte oder erhaltene Pokémon
  noteHistory(s, speciesId) {
    const h = (s.player.pokeHistory ||= []);
    h.push(Number(speciesId));
    if (h.length > HISTORY_MAX) h.splice(0, h.length - HISTORY_MAX);
  },

  poketchStep(s, step, sc, lines) {
    const p = s.player;
    const say = (who, text) => lines.push({ speaker: who, text });
    const push = (steps) => sc.stack.push({ steps, i: 0 });
    const has = (app) => hasApp(p.flags, app);
    switch (step.who) {
      case 'clown': {
        const [q, , after] = CLOWN_QUIZ[step.n];
        if (p.flags['coupon_' + step.n]) { say('Clown', after); return; }
        say('Clown', 'Hallo! Ich bin ein Clown der Pokétch-Kampagne! Hier kommt meine Frage:');
        say('Clown', q);
        push([{ ask: YES_NO, yes: [{ x: 'poketch', who: 'clownRight', n: step.n }], no: [['Clown', 'Bzzzzt! Das ist leider falsch...']] }]);
        return;
      }
      case 'clownRight': {
        say('Clown', CLOWN_QUIZ[step.n][1]);
        say('Clown', 'Bitte sehr! Dein Pokétch-Coupon!');
        p.flags['coupon_' + step.n] = true;
        p.items['coupon-' + step.n] = 1;
        say(null, `Du erhältst ${ITEMS['coupon-' + step.n]?.name || 'Coupon ' + step.n}!`);
        this.sendParty(s);
        this.sendProgress(s);
        return;
      }
      case 'president': {
        if (!p.flags.poketch) {
          const n = [1, 2, 3].filter((i) => p.flags['coupon_' + i]).length;
          if (n < 3) {
            say('Firmenchef', 'Oh, oh, oh? Du nennst dich Pokémon-Trainer und hast keinen Pokétch? Das ist eine Pokémon-Uhr, kurz Pokétch!');
            say('Firmenchef', 'Ich erfinde und baue Pokétches. Und gerade läuft meine Pokétch-Kampagne! Finde die drei Clowns in Jubelstadt.');
            say('Firmenchef', 'Jeder Clown stellt dir eine Frage über Pokémon. Sammle von jedem einen Coupon und komm dann zu mir!');
            if (n) say('Firmenchef', `Du hast schon ${n} von 3 Coupons.`);
            return;
          }
          say('Firmenchef', 'Lass mich deine Coupons zählen! Eins, zwei, drei! Bravo! Ich sage nur: Bravo!');
          say('Firmenchef', 'Für diese Coupons bekommst du diese Pokémon-Uhr, kurz Pokétch!');
          for (const i of [1, 2, 3]) delete p.items['coupon-' + i];
          p.flags.poketch = true;
          p.flags.poketch2 = true;
          say(null, `${p.name} erhält einen Pokétch!`);
          say('Firmenchef', 'Du kannst deinem Pokétch Apps hinzufügen, dann kann er noch mehr! Öffne ihn mit der Taste P und wechsle die Apps mit dem Knopf an der Seite.');
          this.sendParty(s);
          this.sendProgress(s);
          return;
        }
        const badges = this.badgeCount(p);
        say('Firmenchef', 'Hallo, hallo! Ich bin der Chef der Pokétch-Gesellschaft!');
        const next = PRESIDENT_APPS.find(([app]) => !has(app));
        if (!next) { say('Firmenchef', 'Ja, ja, alle möglichen Leute verschenken Pokétch-Apps. So freuen sich alle!'); return; }
        const [app, need] = next;
        if (badges < need) {
          say('Firmenchef', `Ich entwickle gerade eine neue Pokétch-App, aber sie ist noch nicht ganz fertig. Ich schätze, sie ist fertig, wenn du ${need === 1 ? 'einen Orden' : need + ' Orden'} hast.`);
          return;
        }
        say('Firmenchef', 'Hallo, hallo! Deine Geduld wird belohnt! Ich habe eine neue Pokétch-App entwickelt!');
        this.giveApp(s, app, lines);
        const about = {
          memo: 'Das ist der Notizblock! Er ist... na ja, eben ein Notizblock!',
          map: 'Eine Landkarte immer im Blick, praktisch, oder? Du siehst auch, wo wandernde Pokémon gerade sind.',
          link: 'Damit siehst du, welche Trainer gerade in deiner Nähe unterwegs sind.',
          move: 'Prüfe die Wirkung deiner Attacken auf jeden Typ, damit sie alle sehr effektiv sind!'
        };
        say('Firmenchef', about[app]);
        return;
      }
      case 'lucia': {
        if (has('dowse')) { say('Lucia', 'Benutz das Itemradar ruhig oft. Es findet Items in deiner Nähe!'); return; }
        say('Lucia', `Hallo, ${p.name}! Wie läuft es mit deinem Pokédex? Ich habe etwas Nettes für dich.`);
        say('Lucia', 'Du hast doch einen Pokétch, oder? Ja, hast du. Dann bekommst du das hier. Du hast es dir mit deinem Einsatz verdient!');
        this.giveApp(s, 'dowse', lines);
        say('Lucia', 'Mit dem Itemradar findest du Items in deiner Umgebung. Benutz es oft!');
        return;
      }
      case 'twin': {
        if (!p.flags.poketch) { say('Zwilling', 'Mein Opa ist der Beerenmeister! Er weiß alles über Beeren.'); return; }
        if (has('berry')) { say('Zwilling', 'Der Beerensucher zeigt dir, wo reife Beeren auf dich warten. Manche Beeren brauchen viel Wasser!'); return; }
        say('Zwilling', 'Bist du einer von denen, die vergessen, wo sie Beeren gepflanzt haben?');
        push([{ ask: YES_NO, yes: [['Zwilling', 'Dann nimm diese Pokétch-App!'], { x: 'poketch', who: 'give', app: 'berry' }, ['Zwilling', 'Der Beerensucher zeigt dir, wo reife Beeren wachsen.']], no: [['Zwilling', 'Na gut, dann brauchst du das hier wohl nicht.']] }]);
        return;
      }
      case 'give': this.giveApp(s, step.app, lines); return;
      case 'ruin': {
        if (!p.flags.poketch) { say('Ruinenforscher', 'In den Ruinen von Trostu gibt es noch viel zu entdecken.'); return; }
        if (has('history')) { say('Ruinenforscher', 'Du hast deine Geschichte, und jedes Pokémon hat seine eigene. Wenn beide aufeinandertreffen, beginnt etwas Neues.'); return; }
        const seen = Object.keys(p.dex?.seen || {}).filter((id) => POKEMON[id]?.sinnoh).length;
        say('Ruinenforscher', 'Ein reisender Trainer, was? Wie viele Pokémon-Arten hast du schon getroffen?');
        if (seen < 50) { say('Ruinenforscher', 'Ein fähiger Trainer hätte mindestens fünfzig getroffen. Zieh weiter und such gründlicher, junger Freund.'); return; }
        say('Ruinenforscher', 'Deine Begegnungen mit Pokémon sind eure gemeinsame Geschichte. Diese Pokétch-App heißt Pokémon-Historie. Damit siehst du, welche Pokémon du zuletzt bekommen hast.');
        this.giveApp(s, 'history', lines);
        return;
      }
      case 'vendor': {
        if (!p.flags.poketch) { say('Verkäuferin', 'Willkommen im Kaufhaus Schleiede!'); return; }
        if (has('counter')) { say('Verkäuferin', 'Ich hoffe, die App Zähler ist dir nützlich.'); return; }
        say('Verkäuferin', 'Zur Werbung verschenken wir eine Pokétch-App! Möchtest du die App Zähler haben?');
        push([{ ask: YES_NO, yes: [['Verkäuferin', 'Bitte sehr!'], { x: 'poketch', who: 'give', app: 'counter' }], no: [['Verkäuferin', 'Schade. Komm gerne wieder!']] }]);
        return;
      }
      case 'blackbelt': {
        if (!p.flags.poketch) { say('Schwarzgurt', 'Ich muss hart trainieren. Die Zeit spielt dabei keine Rolle.'); return; }
        if (has('analog')) { say('Schwarzgurt', 'Analog oder digital: Welche Uhr magst du lieber? Ich selbst nehme lieber eine Sanduhr.'); return; }
        say('Schwarzgurt', 'Ich muss mich anstrengen und trainieren... Dafür ist die Zeit unwichtig. Also brauche ich keine Uhr. Nimm du das hier!');
        this.giveApp(s, 'analog', lines);
        return;
      }
      case 'richboy': {
        if (!p.flags.poketch) { say('Schnösel', 'Wir wollten hier endlich mal ungestört sein.'); return; }
        if (has('coin')) { say('Schnösel', 'Ich lasse bei jeder Entscheidung die Münze entscheiden. Das macht Mut, weil ich nichts verantworten muss.'); return; }
        say('Schnösel', 'Eigentlich war alles ausgebucht, aber sie haben uns doch noch hier untergebracht. Endlich sind wir zu zweit, wenn du gehst. Das hier brauchen wir nicht mehr. Nimmst du es?');
        this.giveApp(s, 'coin', lines);
        return;
      }
      case 'developer': {
        if (!p.flags.poketch) { say('Forscher', 'Ich entwickle Apps für den Pokétch. Hast du etwa keinen?'); return; }
        const open = NATURE_APPS.find(([app]) => !has(app));
        if (!open) { say('Forscher', 'Eines Tages gibt es vielleicht mehr Pokétch-Apps als Pokémon-Arten.'); return; }
        say('Forscher', 'Das glänzende Ding an deinem Arm! Das ist doch ein Pokétch, das neueste Modell! Die Pokétch-Gesellschaft erlaubt mir, eigene Apps zu entwickeln.');
        say('Forscher', `Du hast doch Pokémon mit verschiedenen Wesen, oder? Was möchte ich jetzt sehen... Ein Pokémon mit dem Wesen ${open[1]}.`);
        const mon = s.party.find((m) => !m.egg && NATURES[m.nature]?.name === open[1]);
        if (!mon) return;
        say('Forscher', `Jawohl! Dein ${displayName(mon)} hat wirklich das Wesen ${open[1]}! Danke! Dafür bekommst du die App ${APP_NAME[open[0]]} für deinen Pokétch.`);
        this.giveApp(s, open[0], lines);
        return;
      }
      case 'lady': {
        if (!p.flags.poketch) { say('Lady', 'Prof. Eich hat so viele seltene Pokémon gesehen!'); return; }
        if (has('color')) { say('Lady', 'Wenn sich die Farben ändern, ändert sich auch die Laune.'); return; }
        const inParty = (id) => s.party.some((m) => m.speciesId === id && !m.egg);
        say('Lady', 'Ich möchte so gerne einmal Pokémon sehen, die ich noch nie gesehen habe!');
        if (!has('timer')) {
          say('Lady', 'Zum Beispiel ein Pokémon, das nur frisst und schläft.');
          if (!inParty(143)) return;
          say('Lady', 'Oh, ein Relaxo! Dafür bekommst du eine Pokétch-App. Mit der Eieruhr verkochst du nie wieder etwas!');
          this.giveApp(s, 'timer', lines);
          return;
        }
        say('Lady', 'Zum Beispiel ein Pokémon, das ständig seine Farbe ändert.');
        if (!inParty(352)) return;
        say('Lady', 'Oh, ein Kecleon! Wie bunt! Ich habe eine Pokétch-App mit einem Kecleon-Design. Die bekommst du, weil du mir ein echtes Kecleon gezeigt hast!');
        this.giveApp(s, 'color', lines);
        return;
      }
    }
  },

  // Daten für die Apps: Landkarte, Schrittzähler, Pokémon-Liste, Itemradar, Beerensucher, Historie, Linkfinder
  poketch(s) {
    const p = s.player;
    if (!p.flags.poketch) return;
    const roamers = Object.entries(p.roamers || {}).filter(([, r]) => !r.defeated).map(([id, r]) => ({ speciesId: Number(id), map: r.map, name: species(id).name }));
    const party = s.party.map((m) => ({ speciesId: m.speciesId, name: displayName(m), hp: m.hp, maxHp: m.stats.hp, egg: !!m.egg, item: m.item || null, alive: m.alive !== false, form: m.form || null, shiny: !!m.shiny }));
    const out = { t: S2C.POKETCH, roamers, steps: p.steps || 0, party };
    // Itemradar: Items in der Nähe (wie DowsingMachine: 7 Felder in jede Richtung)
    if (hasApp(p.flags, 'dowse')) {
      out.items = visibleNpcs(p.map, p.flags).filter((n) => n.item && Math.abs(n.x - p.x) <= 7 && Math.abs(n.y - p.y) <= 7).map((n) => [n.x - p.x, n.y - p.y]);
    }
    if (hasApp(p.flags, 'history')) out.history = (p.pokeHistory || []).slice().reverse();
    if (hasApp(p.flags, 'link')) {
      out.link = [...this.sessions.values()].filter((x) => x !== s && x.player).map((x) => ({ name: x.player.name, map: x.player.map, here: x.player.map === p.map }));
    }
    if (hasApp(p.flags, 'berry') && BERRY && this.berryState) {
      const st = this.berryState(s);
      out.berries = BERRY.soilIndex(MAPS).byId.filter((b) => b && st.p[b.id]?.[BERRY.PATCH.ST] === BERRY.STAGE.FRUIT).map((b) => ({ map: b.map, x: b.x, y: b.y }));
    }
    this.send(s.ws, out);
  }
};
