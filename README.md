# Pokémon Platin Multiplayer

2D-Top-Down-Klon von Pokémon Platin mit Multiplayer-Overworld (Spieler sehen sich in Echtzeit), rundenbasierten Wildkämpfen nach Generation-4-Formeln, Nuzlocke und Linked Soulbound (Hardcore). Server: Node.js + WebSockets. Client: Browser mit Canvas und eigener Pixelgrafik im Stil der DS-Generation.

## Start

```bash
npm install        # installiert nur "ws"
npm start          # http://localhost:3000
npm test           # Regelwerk, Kampf und 2-Spieler-Sync über echte WebSockets
```

Voraussetzung: Node.js 22.5 oder neuer (für das eingebaute `node:sqlite`).

Mehrere Spieler: Browserfenster öffnen (oder andere Rechner im Netz auf `http://<IP>:3000`), Namen eingeben und **denselben Run-Code** verwenden. Der erste Spieler mit einem neuen Code legt die Regeln fest.

Steuerung: Pfeiltasten/WASD laufen, Shift rennen, Z/Enter/Leertaste interagieren, T Chat, M Weltkarte, 1 bis 6 Emotes, N Ton an/aus. Kurzes Antippen dreht nur die Blickrichtung.

### Online mit Freunden spielen

Doppelklick auf **`Online spielen.bat`**. Das Skript startet den Server, lädt beim ersten Mal das kostenlose Programm `cloudflared` nach `tools/` und öffnet einen Cloudflare Quick Tunnel. Danach steht eine Adresse wie `https://irgendwas.trycloudflare.com` im Fenster, in der Zwischenablage und in `Online-Adresse.txt`. Diese Adresse an Freunde schicken: Sie öffnen sie im Browser, geben ihren Namen und denselben Run-Code ein.

Kein Konto, keine Kosten, keine Router-Einstellungen. Die Spielstände bleiben auf deinem Rechner. Das Fenster muss offen bleiben, solange gespielt wird, und die Adresse ist bei jedem Start eine neue.

### Umgebungsvariablen

| Variable | Standard | Bedeutung |
|---|---|---|
| `PORT` | 3000 | HTTP- und WebSocket-Port (`/ws`) |
| `DATA_DIR` | `./data` | Speicherort der Datenbank. Auf Netzlaufwerken einen lokalen Pfad wählen |
| `STORAGE` | auto | `sqlite` (node:sqlite), `better-sqlite3` oder `json` |
| `POKEAPI` | 0 | `1` lädt beim Start fehlende Arten live von pokeapi.co |
| `POKEAPI_IDS` | 387-405 | Nationale Dex-Nummern für den Live-Abruf, z. B. `387-493,25` |
| `STORY` | an | `off` schaltet Story, NPCs und Trainer ab (freies Spiel ab Zweiblattdorf mit 10 Pokébällen) |

## Ordnerstruktur

```
platin-multiplayer/
├── package.json
├── server/
│   ├── index.js              HTTP (liefert Client und /shared aus) + WebSocket-Server, Heartbeat
│   ├── config.js
│   ├── db/
│   │   ├── schema.sql        Tabellen, Soulbound-Trigger, Nuzlocke-Revive-Sperre
│   │   └── storage.js        node:sqlite | better-sqlite3 | JSON-Fallback, gleiche Schnittstelle
│   ├── data/pokeapiLoader.js PokéAPI-Abruf im Platin-Stand, Cache und Merge
│   └── game/
│       ├── game.js           Sitzungen, Bewegung, Sichtbarkeit, Encounter, Kampfablauf, Team/Box
│       ├── battle.js         Rundenbasierte Kampfengine (serverautoritativ)
│       ├── rules.js          Nuzlocke + Linked Soulbound
│       └── pokemonFactory.js Werte, EP, Level-Up, Attacken, Entwicklung
├── shared/                   von Server UND Browser genutzt (ES-Module)
│   ├── protocol.js           Nachrichtentypen, Lauf-/Renntempo
│   ├── world.js              Kollision und Kartenübergänge (Client-Vorhersage = Server-Prüfung)
│   ├── formulas.js           Gen-4-Formeln: Werte, Schaden, Volltreffer, Fangen, EP, Flucht, Encounter
│   └── data/                 types, natures, growth, moves, pokemon, maps
├── client/
│   ├── index.html, css/style.css
│   ├── js/main.js            Spielschleife und Nachrichten-Handler
│   ├── js/net.js             WebSocket mit Token-Login und Reconnect
│   ├── js/input.js           Tastatur
│   ├── js/world.js           Kachelbewegung, Vorhersage, Serverabgleich, Interpolation anderer Spieler
│   ├── js/renderer.js        Canvas, Kamera, nahtlose Nachbarkarten, Platzhalter/Sprites
│   ├── js/battleUI.js        Kampfmenüs und Ereignis-Wiedergabe
│   ├── js/hud.js             Team, Nuzlocke, Seelenband, Box, Log, Chat
│   └── assets/sprites/manifest.json   Farben und optionale Bildpfade
├── scripts/fetch-pokeapi.js  npm run fetch-data -- 387-493
├── scripts/build-dex.js      npm run build-dex: kompletter Gen-4-Pokédex aus PokeAPI-CSV
└── test/smoke.js
```

## Architektur

**Serverautorität.** Der Client sagt Bewegungen mit derselben Kollisionslogik (`shared/world.js`) voraus, damit sich Laufen sofort anfühlt. Der Server prüft jeden Schritt (Kollision, Tempo, Kampfstatus), bestätigt per `moveAck` und korrigiert bei Abweichung. Encounter werden ausschließlich serverseitig gewürfelt, Kämpfe komplett auf dem Server berechnet. Der Client sendet nur Aktionen (Attacke, Ball, Wechsel, Flucht) und spielt die gelieferten Ereignisse ab.

**Sichtbarkeit.** Jeder Spieler erhält nur Ereignisse seiner aktuellen Karte (`playerJoined`, `playerMoved`, `playerLeft`, `playerState`). Beim Kartenwechsel bekommt er die Liste der dort anwesenden Spieler. Andere Spieler werden zwischen Kacheln interpoliert, ein ⚔ zeigt, wer gerade kämpft.

**Karten.** Zweiblattdorf, Route 201, Kraterberg-See, Sandgemme, Route 202, Jubelstadt, Route 203, Erzelingen-Tor (Höhle), Erzelingen mit Arena, Erzelingen-Mine und Route 204 mit nahtlosen Übergängen wie im Original. Dazu alle betretbaren Innenräume: Zuhause mit eigenem Zimmer, Haus des Rivalen, Forschungslabor, Pokémon-Center, Pokémon-Märkte, Trainerschule, Arena und Wohnhäuser. Türen, Treppen und Höhleneingänge sind Warps (`warps` in `shared/data/maps.js`), Höhlen haben eigene Begegnungstabellen (`cave`). Neue Außenkarten entstehen aus Rechtecken, Höhlen und Räume aus ASCII-Rastern.

## Kampf (Generation 4)

- Werte: `KP = (2B + DV + EV/4) * L/100 + L + 10`, sonstige `((2B + DV + EV/4) * L/100 + 5) * Wesen`
- Schaden: `((2L/5 + 2) * Stärke * A/V) / 50`, Verbrennung halbiert physisch, `+2`, Volltreffer x2, Zufall 85 bis 100 %, STAB 1,5, Typeneffektivität (Gen-4-Tabelle ohne Fee)
- Physisch/Speziell pro Attacke (Gen-4-Aufteilung), Prioritäten, Initiative mit Statusstufen und Paralyse-Viertelung
- Volltrefferstufen 1/16, 1/8, 1/4, 1/3, 1/2; Volltreffer ignorieren ungünstige Stufen
- Status: Paralyse, Schlaf (1 bis 4 Runden), Gift, schweres Gift, Verbrennung, Einfrieren (20 % Auftauen), Verwirrung, Zurückschrecken, Egelsamen, Klammerattacken
- Fangformel Gen 3/4 mit vier Wackelproben, Ballbonus und Statusbonus
- EP `(Basis-EP * Level) / 7` geteilt durch Teilnehmer, EVs, Level-Up mit KP-Nachzug, neue Attacken, Level-Entwicklungen
- Fähigkeiten: Notdünger/Großbrand/Sturzbach/Hexaplaga, Bedroher, Statik, Wankelmut, Adlerauge, Neutraltorso, Konzentrator, Puderabwehr, Adrenalin, Expidermis, Innere Kraft, Angsthase
- Attacken mit `simplified: true` in `shared/data/moves.js` (z. B. Geduld, Verhöhner, Walzer) sind spielbar, ihre Spezialmechanik ist aber noch nicht nachgebaut

## Nuzlocke

- **Permadeath:** Ein besiegtes Pokémon wird in der Datenbank als tot markiert (`alive = 0`, `death_cause`). Ein SQLite-Trigger verhindert jede Wiederbelebung in Nuzlocke-Runs. Heilpunkte heilen nur Lebende.
- **Erster Encounter pro Route:** Tabelle `encounters` mit `UNIQUE(player_id, route)`. Beim ersten Kampf auf einer Route wird der Eintrag angelegt. Danach sind Bälle auf dieser Route gesperrt. Fliehen, Besiegen oder Verlieren macht den Encounter zu `failed`.
- **Dupes Clause** (bereits besessene Entwicklungsreihe zählt nicht) und **Shiny Clause** (Schillernde immer fangbar) sind pro Run schaltbar.
- Verbindungsabbruch im Kampf zählt als Flucht. Ist kein lebendes Pokémon mehr im Team, ist der Run für den Spieler vorbei (Game Over).

## Linked Soulbound

- Alle Fänge der Spieler eines Runs auf **derselben Route** bilden automatisch eine Seelengruppe (`soul_links` + `soul_link_members`). Die Starter werden ebenfalls verbunden.
- **Stirbt Pokémon X von Spieler A, wird jedes verlinkte Pokémon Y von Spieler B sofort als tot markiert.** Doppelt abgesichert: in `rules.js` (inklusive Live-Benachrichtigung) und per Trigger `trg_soulbound_death` direkt in SQLite, falls Daten an anderer Stelle geändert werden.
- Ist B gerade im Kampf und Y aktiv, fällt Y sofort um und B muss wechseln. Offline-Spieler sehen den Tod beim nächsten Login.
- Hardcore-Option `failedEncounterBreaksLink`: Verpatzt ein Spieler den Encounter einer Route, stirbt der dortige Fang aller Partner, und spätere Fänge auf dieser Route sind direkt tot.

## Grafik

Alle Grafiken sind selbst erstellt und liegen als Code in `client/js/art/`. Es werden keine Originalgrafiken von Nintendo oder Game Freak verwendet.

- `tiles.js` und `tileset.js`: 16x16-Kacheln (Wiese, Weg mit weichen Raendern, hohes Gras mit Animation, Baeume, Wasser mit Ufern, Vorsprung, Blumen, Zaun, Schild). Raender passen sich automatisch an die Nachbarkacheln an.
- `buildings.js`: Gebaeude werden als Ganzes aus dem Rechteck der Karte gemalt (Dach, Wand, Fenster, Tuer, Schild). Stile: `house` bis `house5`, `center`, `mart`, `lab`, `gym`, `school`, `tv`, `corp`, `mine`. Vergabe pro Karte ueber `buildings: [{ x, y, style }]`.
- `characters.js`: Figuren mit vier Richtungen und Laufanimation, eingefaerbt ueber Paletten (Spieler in der eigenen Spielerfarbe, NPCs wie Professor, Rivale, Team Galaktik, Schwester, Arenaleiter).
- `monsters.js`: Pokemon-Sprites werden prozedural erzeugt. Familie, Entwicklungsstufe und Typen bestimmen Koerperbau, Farben, Ohren, Hoerner, Flossen und Augen. Jede Art sieht dadurch immer gleich aus, Entwicklungen aehneln ihrer Vorstufe und werden groesser. Schillernde Pokemon bekommen eine andere Farbe.
- Schrift: Pixelify Sans (SIL Open Font License 1.1), siehe `CREDITS.md`.

Eigene Bilder koennen weiterhin ueber `client/assets/sprites/manifest.json` eingebunden werden (Kacheln per `image`, Spieler-Spritesheet per `player.image`, Pokemon per `pokemon.useImages` und `pokemon/{id}.png`). Gesetzte Bilder haben Vorrang vor der eingebauten Grafik.

## Präsentation

- **Vorspann:** Sternenhimmel, Flug über Sinnoh im Morgenrot, die drei Starter rennen durchs Gras, danach der Titelschirm (`client/js/intro.js`). Jede Taste überspringt.
- **Weltkarte (M):** setzt alle Karten über ihre Randverbindungen zusammen, Höhlen werden passend dazwischen gelegt. Zeigt die eigene Position und alle Spieler online (Server schickt `roster`). Unbesuchte Gebiete bleiben verdeckt. Dazu eine Minikarte in der Seitenleiste (`client/js/worldmap.js`).
- **Sound:** eigener Chiptune-Synthesizer auf WebAudio mit 15 selbst komponierten Stücken (Orte, Routen, Höhle, Center, Arena, Kämpfe, Sieg), Fanfaren, Effekten und einem eigenen Ruf pro Pokémon, abgeleitet aus der Dex-Nummer (`client/js/audio.js`). Keine Audiodateien, keine Originalmusik.
- **Kampfanimationen:** Übergang ins Kampfbild, Trainer und Ballwurf beim Einwechseln, Partikel je Attackentyp, Treffer mit Bildschirmwackeln bei sehr effektiv, laufende KP-Balken, Wertänderungen, Ballwurf mit Wackeln beim Fangen (`client/js/battleFx.js`).
- **Stimmung:** Tageszeit nach der echten Uhr (Morgen, Tag, Abend, Nacht mit Lichtkegel), Wetter pro Gebiet (Regen, Nebel, Laub, Kohlenstaub), für alle Spieler gleich. Gras raschelt, beim Rennen staubt es (`client/js/ambience.js`).
- **Emotes:** Sprechblasen über der eigenen Figur, für alle auf derselben Karte sichtbar.

## Story

Die Handlung reicht bis zum ersten Orden und folgt lose dem Ablauf von Platin. Alle Texte sind selbst geschrieben.

1. Zweiblattdorf: Barry weckt dich, Mama warnt vor dem hohen Gras.
2. Kraterberg-See: Zyrus taucht auf, Prof. Eibe vergisst seinen Koffer, du wählst deinen Starter, kämpfst gegen ein wildes Staralili und gegen Barry.
3. Labor in Sandgemme: Pokédex, die ersten Pokébälle und Tränke. Erst ab hier zählen Begegnungen für Nuzlocke.
4. Route 202 und Jubelstadt: Trainer mit Sichtlinie, Lucias Tipps, Trainerschule, zwei Rüpel von Team Galaktik.
5. Route 203: zweiter Kampf gegen Barry, weitere Trainer, Erzelingen-Tor mit Wanderer.
6. Erzelingen: Veit ist erst in der Mine, danach in der Arena. Zwei Arenatrainer, dann Veit selbst. Der Sieg bringt den Kohleorden, Superbälle, Supertränke und Beleber werden im Markt freigeschaltet.

Technik: `shared/data/story.js` enthält NPCs, Trainer, Bodenausloeser und Skripte als Daten. Der Server (`server/game/story.js`) fuehrt die Skripte aus und merkt sich den Fortschritt als Flags im Spielstand. Der Client zeigt NPCs passend zu den Flags an. Trainer, die dich sehen, fordern dich von selbst heraus. Kaempfe gegen Trainer bringen Preisgeld, eine Niederlage kostet die Haelfte des Geldes. Die beiden Story-Kaempfe am See sind ohne Risiko. Pokemon-Center heilen, im Markt gibt es Baelle und Heilmittel, Heilmittel lassen sich im Kampf und im Beutel benutzen.

## Pokédex

Alle 493 Pokémon der vierten Generation und alle 467 Attacken bis Platin sind enthalten (`shared/data/dex/gen4.json`). Werte, Typen, Fähigkeiten, Fangraten, Wachstumskurven und Level-Lernsets entsprechen dem Platin-Stand, Namen sind deutsch. Erzeugt wird die Datei aus den offenen CSV-Daten der PokeAPI (BSD-3-Clause):

```bash
npm run build-dex                  # laedt die CSV-Dateien von GitHub
npm run build-dex -- ./csv-ordner  # oder aus einem Ordner mit bereits geladenen CSV-Dateien
```

Entwicklungen per Level funktionieren wie im Original. Für Entwicklungen, die es im Spiel noch nicht gibt, gilt ein Ersatzlevel: Tausch ab Level 36, Entwicklungssteine und Orte ab Level 30, Freundschaft ab Level 30 (Baby-Pokémon ab Level 15). Hat ein Pokémon mehrere Möglichkeiten (Evoli, Waumpel), entscheidet sein Wesen dauerhaft, welche es wird. Attacken mit Sondermechanik, die noch nicht nachgebaut ist, tragen `simplified: true` und wirken als normale Schadensattacke mit Stärke 60 bzw. ohne Effekt. Handgebaute Attacken in `shared/data/moves.js` haben Vorrang.

## Protokoll (Auszug)

Client an Server: `hello`, `chooseStarter`, `move`, `face`, `interact`, `chat`, `battleAction`, `partySwap`, `boxMove`, `nickname`, `learnMove`, `dialogDone`, `buy`, `shopClose`, `useItem`.
Server an Client: `welcome`, `needStarter`, `moveAck`, `mapChange`, `playerJoined`, `playerMoved`, `playerLeft`, `playerState`, `party`, `nuzlocke`, `soulDeath`, `battleStart`, `battleEvents`, `battleEnd`, `gameOver`, `dialog`, `script`, `progress`, `npcEmote`, `shop`. Vollständig in `shared/protocol.js`.

## Nächste Ausbaustufen

Alle 493 Arten und Attacken der vierten Generation, weitere Routen und Arenen, Surfer/Angel-Encounter, Tageszeiten, PvP-Kämpfe zwischen Spielern, Level-Caps pro Arena.
