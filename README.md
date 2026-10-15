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

Steuerung: Pfeiltasten/WASD laufen, Shift rennen, Z/Enter/Leertaste interagieren, T Chat. Kurzes Antippen dreht nur die Blickrichtung.

### Umgebungsvariablen

| Variable | Standard | Bedeutung |
|---|---|---|
| `PORT` | 3000 | HTTP- und WebSocket-Port (`/ws`) |
| `DATA_DIR` | `./data` | Speicherort der Datenbank. Auf Netzlaufwerken einen lokalen Pfad wählen |
| `STORAGE` | auto | `sqlite` (node:sqlite), `better-sqlite3` oder `json` |
| `POKEAPI` | 0 | `1` lädt beim Start fehlende Arten live von pokeapi.co |
| `POKEAPI_IDS` | 387-405 | Nationale Dex-Nummern für den Live-Abruf, z. B. `387-493,25` |

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
└── test/smoke.js
```

## Architektur

**Serverautorität.** Der Client sagt Bewegungen mit derselben Kollisionslogik (`shared/world.js`) voraus, damit sich Laufen sofort anfühlt. Der Server prüft jeden Schritt (Kollision, Tempo, Kampfstatus), bestätigt per `moveAck` und korrigiert bei Abweichung. Encounter werden ausschließlich serverseitig gewürfelt, Kämpfe komplett auf dem Server berechnet. Der Client sendet nur Aktionen (Attacke, Ball, Wechsel, Flucht) und spielt die gelieferten Ereignisse ab.

**Sichtbarkeit.** Jeder Spieler erhält nur Ereignisse seiner aktuellen Karte (`playerJoined`, `playerMoved`, `playerLeft`, `playerState`). Beim Kartenwechsel bekommt er die Liste der dort anwesenden Spieler. Andere Spieler werden zwischen Kacheln interpoliert, ein ⚔ zeigt, wer gerade kämpft.

**Karten.** Zweiblattdorf, Route 201, Kraterberg-See, Sandgemme, Route 202, Jubelstadt, Route 203 und Route 204 mit nahtlosen Übergängen wie im Original, hohem Gras, Vorsprüngen (nur nach Süden), Schildern und Heilpunkten. Neue Karten werden in `shared/data/maps.js` aus Rechtecken und Einzelkacheln gebaut.

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

## Daten erweitern

Die Kerndaten (35 Arten der ersten Sinnoh-Routen, rund 120 Attacken, vollständige Typentabelle, alle 25 Wesen, alle Wachstumskurven) sind eingebettet, das Spiel läuft also offline. Weitere Arten:

```bash
npm run fetch-data -- 387-493   # gesamter Sinnoh-Dex, Lernsets im Platin-Stand
```

Der Cache landet in `shared/data/generated/pokeapi.json` und wird beim Start automatisch eingemischt. Eingebettete Einträge haben Vorrang.

## Protokoll (Auszug)

Client an Server: `hello`, `chooseStarter`, `move`, `face`, `interact`, `chat`, `battleAction`, `partySwap`, `boxMove`, `nickname`, `learnMove`.
Server an Client: `welcome`, `needStarter`, `moveAck`, `mapChange`, `playerJoined`, `playerMoved`, `playerLeft`, `playerState`, `party`, `nuzlocke`, `soulDeath`, `battleStart`, `battleEvents`, `battleEnd`, `gameOver`. Vollständig in `shared/protocol.js`.

## Nächste Ausbaustufen

Trainerkämpfe und Arenen, Innenräume hinter Türen, Surfer/Angel-Encounter, Tageszeiten, Items und Shop, PvP-Kämpfe zwischen Spielern, Level-Caps pro Arena.
