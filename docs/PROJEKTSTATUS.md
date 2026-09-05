# Ru-Pokemon – Projektstatus & Übergabe-Dokument

> **Zweck dieser Datei:** Vollständiger, eigenständiger Kontext für einen NEUEN Chat, falls
> das automatische Claude-Memory mal nicht zieht. Einfach diese Datei am Anfang eines neuen
> Chats verlinken/einfügen ("lies docs/PROJEKTSTATUS.md und mach weiter") — dann muss nichts
> wiederholt erklärt werden.
>
> Stand: 2026-09-04, Ende einer sehr langen Arbeitssitzung (Module A–O).

---

## 1. Was ist das Projekt?

Finn baut mit Claude ein **PC-Remake von Pokémon Perl/Platin (Gen 4)** in **Godot 4.7 /
GDScript**. Kern-Eigenschaften:

- **2.5D-Optik**: echte 3D-Welt (ArrayMesh-Boden + -Wände), Kamera fest schräg von
  hinten-oben, orthografische Projektion (kein Perspektiv-Verzerren).
- **Echtzeit-Multiplayer auf der Overworld** (ENet Client-Server) ist ein Kern-Feature, kein
  Nachtrag.
- **Nur privater Gebrauch** (Nintendo-IP) — Repo bleibt privat, nichts wird veröffentlicht.
- Ziel-Vorgabe von Finn, wortwörtlich wiederkehrend: **"Soll aussehen wie das echte Spiel."**

Godot-Binary liegt direkt im Projektordner: `Godot_v4.7.2-stable_win64.exe` (gitignored).
Finn hat **volle Ausführungsberechtigung ohne Rückfrage** erteilt (Skip-Permissions).

## 2. Wie arbeitet Finn / wie soll ich arbeiten?

- **Zügig, ohne Zwischenfragen.** Nicht nach jedem Schritt nachfragen — ganzes
  Modul/Feature fertig bauen, testen, dann berichten. Design-/Scope-Entscheidungen kurz
  abstimmen ist ok, die Umsetzung selbst nicht ständig rückfragen.
- **Immer headless testen, BEVOR man "fertig" meldet**:
  ```
  ./Godot_v4.7.2-stable_win64.exe --headless --path . --import        # Parse-Check
  ./Godot_v4.7.2-stable_win64.exe --headless --path . res://_test_x.tscn   # Funktionstest
  ./Godot_v4.7.2-stable_win64.exe --rendering-driver opengl3 --resolution 960x540 res://_shot_x.tscn  # Screenshot
  ```
  Testszenen als `_test_*.gd`/`.tscn` bzw. `_shot_*.gd`/`.tscn` im Projekt-Root anlegen,
  NACH dem Test wieder löschen (Konvention: Projekt bleibt sauber).
- **`-s script.gd` (extends SceneTree) sieht KEINE Autoloads** — Tests immer als normale
  Node-Szene laufen lassen, nie mit `-s`.
- Bei sichtbaren Ergebnissen (neue Optik, Bugfixes) **Screenshots senden** (SendUserFile),
  danach lokale Kopie wieder löschen.
- Wenn Finn "mach weiter, frag nicht nach" sagt: einfach direkt weiterarbeiten, keine
  Rückfrage mehr, auch nicht am Ende der Antwort.

## 3. Copyright-Grenzen (selbst gesetzt, gilt weiter)

- **Kein wörtliches Original-Dialogscript** aus den echten Spielen übernehmen — eigener
  Wortlaut, der denselben Zweck erfüllt.
- **Keine ROM-Extraktion** möglich/gewünscht — für Karten-Layouts stattdessen echte
  Strukturbeschreibungen von Bulbapedia/PokéWiki recherchieren (WebSearch/WebFetch) und
  "nachempfunden" mit eigener Tile-Art nachbauen, nicht pixelgenau kopieren.
- Bereits im Projekt vorhandene, teils geripte Asset-Dateien (Sprites, Musik, UI-Sheets, DS-
  Charakterbögen) werden für den **rein privaten Gebrauch** verwendet — das ist mit Finn so
  abgestimmt (siehe Abschnitt 6).

## 4. Architektur-Überblick

- **Autoloads** (`project.godot` `[autoload]`): `GameData`, `GameState`, `SaveSystem`,
  `QuestManager`, `NetworkManager`, `SceneManager`, `BattleManager`, `DialogueManager`,
  `MartManager`, `NameEntryManager`, `AudioManager`, `TransitionManager`.
- **Overworld**: `scripts/overworld/grid_actor.gd` (Basis-Bewegung, tile-basiert, 1 Feld =
  1m, Tween-Animation, kein Physik-Movement) → `player.gd` (lokaler Spieler) / `npc.gd` /
  `remote_player.gd`. `overworld.gd` hält die aktuelle Karte + lokalen Spieler + Remote-
  Spieler. `scene_manager.gd` (Autoload) besitzt die Overworld-Instanz, lädt Karten.
- **Karten sind datengetrieben**: `data/maps.json` (JSON, ein Eintrag pro Karte) wird von
  `scripts/overworld/placeholder_map.gd` (`class_name PlaceholderMap extends MapBase`)
  prozedural zu echter 3D-Geometrie gebaut — **kein `.tscn` pro Karte nötig**. Unterstützte
  Datenkeys pro Karte (nicht-erschöpfend, siehe `build_from_data()`):
  `size`, `indoor`, `cave`, `gym`, `spawns`, `warps`, `doors`, `stairs`, `buildings`,
  `roads`, `water`, `fences`, `flowers`, `grass`, `ledges`, `npcs`, `trainers`, `signs`,
  `objects` (kind: `starter_table`/`professor`/`shop`/`gate`/`smash_rock`/`item`/`deco`/`tv`).
- **Kampf**: `scripts/battle/battle_engine.gd` (reine Logik, Event-Liste, seed-
  deterministisch) + `battle_screen.gd`/`Battle.tscn` (UI/Animation) + `BattleManager`
  (Autoload, startet/beendet Kämpfe, PRIVAT pro Spieler).
- **Kamera**: `scripts/overworld/camera_rig.gd` (`class_name CameraRig extends Camera3D`),
  sitzt als Kind-Node am Spieler, `top_level = true`. Orthografisch, fester Pitch, folgt
  weich. `set_context(indoor, room_hw, room_hh)` schaltet zwischen Innen-/Außen-Preset um
  UND klemmt die Position bei Innenräumen hart auf die Raumgrenzen (wichtig! siehe
  Abschnitt 7).
- **Dialog**: `DialogueManager` (Autoload) + `DialogueBox.tscn`/`dialogue_box.gd` — eigenes
  Gen-4-Textbox-Design (abgerundet, blauer Rahmen, Namensschild, hüpfender Pfeil), Grafik
  prozedural erzeugt via `tools/make_dialogue_box.py`.
- **Musik/Sound**: `AudioManager` (Autoload) — Karten-BGM nach `MAP_BGM`-Tabelle, Kampf-/
  Sieges-Themes, Pokémon-Schreie. **Wichtig**: BGM-Dateinamen auf der Platte sind WÖRTLICH
  prozent-kodiert (`%20`, `%28`, `%29`, `%27`, `%21` sind Teil des echten Dateinamens, keine
  URL-Kodierung) — siehe Konstanten in `autoload/audio_manager.gd`.
- **Kartenwechsel-Fade**: `TransitionManager` (Autoload) blendet bei JEDEM Kartenwechsel
  kurz ab/auf (0.14s/0.18s). `SceneManager.load_map()` ist deshalb **async** — alle Aufrufer
  müssen `await` nutzen (aktuell: `main.gd`, `battle_manager.gd`; `warp.gd` nutzt
  `call_deferred`, unkritisch).

## 5. Aktuelle Welt (22 Karten, Stand Ende dieser Session)

```
player_house_1f/2f (Zuhause, EG+OG, Treppe)
  ↕ (Tür, SO-Ecke)
Zweiblattdorf (Twinleaf Town, Spielerhaus SO, Rivalenhaus NW, Teich, Blumenbeete)
  ├ rival_house
  └ Route 201 (Starter-Koffer, Gate blockt bis got_starter, Weststummel "Corallosee")
      └ Sandgemme (Sandgem Town: Labor/Markt/Center, Straßenkreuz, Wohnhaus)
          ├ proflab, pokemart, pokecenter
          └ Route 202 (Trainer: Tristan/Natalie/Logan, 4 Gras-Flecken)
              └ Jubelstadt (Jubilife City, 22×16, TV-Sender/Pokétch/Trainerschule/
                             eigenes Center+Markt — ALLE begehbar)
                  ├ jubel_tv, poketch_hq, trainer_school, pokecenter_jubel, pokemart_jubel
                  └ Route 203 (Trainer Schulkind Max)
                      └ Erzelingen-Tunnel (oreburgh_gate, Höhle, VM Zertrümmerer-Item)
                          └ Erzelingen (Oreburgh City: Arena, Museum, Fahrradladen)
                              ├ erzbingen_gym (Arenaleiter Veit, Steinorden)
                              ├ erzbingen_museum
                              └ coal_mine (Kohlemine, zentrale Erzplatte MIT Ledge-Kante)
```

**Interne Map-IDs bleiben teils "alt"** (z.B. `erzbingen` als Key, obwohl Anzeigename jetzt
korrekt "Erzelingen" ist) — das ist bewusst so belassen (Aufwand/Risiko), betrifft nichts
Sichtbares.

## 6. Asset-Inventar (bereits im Projekt, wichtig: erst hier nachsehen, bevor "fehlt X"!)

- `assets/spritesheets/pokemon/{front,back,icons}/<dex-nummer>.png` — 986 Sprites je Ordner.
  Zugriff über `PokemonInstance.front_sprite_path()` / `back_sprite_path()` /
  `icon_sprite_path()` (nutzen `species().dex`).
- `assets/audio/bgm/` — 30 echte Diamant/Perl/Platin-Musikstücke (früher Spielverlauf:
  Zweiblattdorf/Route201/Rivale/Kampf-Themes/Sandgemme/Center/Jubelstadt/Trainer-Fanfaren
  etc.). Dateinamen wörtlich prozent-kodiert, siehe oben.
- `assets/audio/cries/<dex>.ogg` — 986 Pokémon-Schreie.
- `assets/spritesheets/ui/`: `battle_backgrounds.png` (viele Kampfhintergründe +
  Plattformen, Tag/Nachmittag/Nacht-Varianten, bisher nur "Field Day" ausgeschnitten →
  `assets/battle/`), `battle_gui.png` (**enthält einen fertigen EXP-Balken, noch nicht
  verdrahtet!**, HP-Balken-Grafik, Status-Icons, Font), `bag.png`, `text_box_styles.png`,
  `signboards.png` — alle noch weitgehend ungenutzt.
- `assets/spritesheets/characters/` — DS-Charakterbögen (Lucas/Dawn/Barry/NPCs/Trainer),
  per `tools/slice_sprites.py` in `resources/characters/*_frames.tres` geschnitten.
- Tileset: **kein echter Platin-Rip verfügbar** → `tools/make_tileset.py` erzeugt eigene
  DS-Stil-Pixel-Art (aktuell 55 Tiles). Das ist der einzige Bereich, wo wirklich neue
  Grafik nötig wäre für mehr Varianz (Finn empfand Außenkarten als "repetitiv").
- Download-Pipeline: `tools/download_assets.py` (Spriters Resource IDs, siehe Kommentare
  im Skript), `tools/import_pokeapi.py` (PokéAPI, 493 Pokémon/448 Attacken/Typen/
  Entwicklungen, deutsche Namen, Cache `.pokeapi_cache/`).

## 7. Wiederkehrende technische Fallen (unbedingt merken!)

1. **Godot 4.7 verdreht `Transform3D`-Rotationen** beim ersten Editor-Öffnen einer `.tscn`
   (Vorzeichen-Flip). Kamera + Licht deshalb **immer per Skript** ausrichten
   (`camera_rig.gd`, `overworld.gd _ready()`), nie über Szenen-Transform-Rotation.
2. **GDScript strict typing**: untypisierte Instanz-Vars lassen (`var _menu = null` statt
   `var _menu: MultiplayerMenu`), sonst "Function not found in base Node" bei dynamischem
   Zugriff. `var x := autoload.func_ohne_typ()` schlägt fehl → `var x = ...` ohne `:=`.
3. **Interact-Trigger brauchen entweder `auto=true` (Betreten reicht) ODER
   `params.collide_with_areas = true` im Raycast** — `player.gd _interact()`s Raycast
   erkennt standardmäßig KEINE `Area3D` (Godot-Default `collide_with_areas=false`). Das war
   die wahre Ursache, warum Türen lange gar nicht funktionierten.
4. **Frisch erzeugte `Area3D` kann `body_entered` phantomhaft sofort feuern**, auch ohne
   echte geometrische Überlappung (hart mit Debug-Prints nachgewiesen). Bei neuen
   Warp-artigen Triggern: `monitoring` nach `_ready()` für 1-2 Physik-Frames deaktiviert
   lassen, dann erst aktivieren (siehe `warp.gd`).
5. **Ein gehaltener Bewegungs-Knopf überlebt einen Teleport** und kann sofort einen
   weiteren Schritt auslösen (z.B. zurück auf eine Nachbar-Treppe → Loop). Nach jedem
   `teleport()`: `block_held_move_input()` aufrufen (verlangt Loslassen der Taste, bevor
   Bewegung in dieselbe Richtung weitergeht).
6. **Eine Innenraum-Decke MUSS höher sitzen als jede mögliche Kamera-Höhe**, sonst schwebt
   die Kamera über der Decke und blickt von aussen auf die Deckenoberseite (kompletter
   Blackout-Bug). Aktuell: Decke bei y=7.0, Kamera max. ~7.5 (Außen-Preset).
7. **Eine feste Kamera-`back_distance` ist NIE für alle Raumgrößen sicher** — bei kleinen
   Räumen mit Spawn nah an der Tür kann die Kamera rechnerisch außerhalb des Raums (hinter
   der Wand) landen. Lösung: `camera_rig.gd` bekommt echte Raumgrenzen
   (`set_context(indoor, room_hw, room_hh)`) und klemmt (`clampf`) die Position hart
   darauf. Faustregel für Sichtbarkeit: `height / tan(pitch)` muss klar unter dem
   Raum-Halbmaß liegen, sonst sieht man nur die gegenüberliegende Wand statt den Boden.
8. **Wandtexturen NIE über die ganze Fläche strecken** — immer in ~1×1-Kacheln aufteilen
   (`_tiled_wall()` in `placeholder_map.gd`), sonst wirkt die Wand verzerrt/verwaschen.
9. **Boden-Mesh braucht für Außenkarten einen Extra-Ring über die Wandgrenze hinaus** (wirkt
   bewachsen), aber NICHT für Innenräume/Höhlen/Arenen (sonst sieht man über niedrige Wände
   hinweg endlosen Boden — "riesige leere Halle"-Effekt).
10. **Geteilte Interior-Maps (z.B. `pokemart`/`pokecenter`) haben ihren Rückweg fest
    verdrahtet** (z.B. immer zurück nach "sandgemme"). Für eine zweite Stadt mit eigenem
    Laden/Center: NEUE Map-ID mit eigenem Rückweg anlegen, nicht die bestehende
    wiederverwenden.
11. **`-s script.gd` sieht keine Autoloads** (s.o., Abschnitt 2).
12. **Async-UI-Screens testen** (Pattern: `add_child.call_deferred()` + 2× `await
    process_frame` vor `setup()`): ein Test, der die Node per Polling sucht und *sofort*
    Werte setzt, kann `setup()` überholen (Race) — nach dem Fund 3-5 Frames warten, bevor
    man interagiert. Beim Suchen der NÄCHSTEN Instanz (z.B. 2. Namenseingabe) niemals die
    alte Node-Referenz vergleichen (wird `queue_free()`t → Fehler), sondern
    `get_instance_id()` **vor** dem Freigeben merken und per ID ausschließen.
13. **`_ftest`-Playthrough-Testfallen**: `trainer.gd` startet den Kampf erst nach "!" +
    1-3s Vorkampf-Dialog — nach `trainer.interact()` auf `BattleManager.in_battle==true`
    **pollen**, nicht sofort prüfen. Move-Index 0 ist nicht automatisch die beste Attacke
    (Status-Moves ohne Schaden gibt's auch bei niedrigem Level). Der Dialog-Auto-Advance-
    Pump muss in JEDER Testszene laufen, sonst hängt jeder `DialogueManager.run()` für
    immer (siehe Test-Vorlage weiter unten).

### Test-Vorlage (Kopiervorlage für neue `_test_*.gd`)

```gdscript
extends Node
const MAIN_SCENE := preload("res://scenes/main/Main.tscn")
var _main: Node

func _ready() -> void:
	_main = MAIN_SCENE.instantiate()
	add_child(_main)
	await get_tree().process_frame
	await get_tree().process_frame
	GameState.new_game("Fina", "girl", "Barry")
	for c in _main.get_node("UILayer").get_children():
		c.queue_free()   # Hauptmenü weg, direkt in die Welt
	SceneManager.world_root = _main.get_node("WorldViewport/SubViewport")
	for id in GameData.maps.keys():
		await SceneManager.load_map(id, "SpawnPoint")   # load_map ist jetzt ASYNC (Fade)!
		await get_tree().process_frame
		assert(SceneManager.get_player() != null, "Kein Spieler bei " + id)
	print("Alle Maps OK.")
	get_tree().quit(0)
```

## 8. Story-Fakten (per PokéWiki/Bulbapedia verifiziert, wichtig für Konsistenz)

- Professor: **Professor Eibe** (deutsch, korrekt).
- Rivale: **Barry** (deutsch, korrekt — Spieler kann Namen frei wählen, Barry ist Vorschlag).
- Männlicher Protagonist (deutsch): **Lucius** (NICHT "Lukas"/"Lucas" — war lange falsch im
  Code, seit Modul L korrigiert).
- Weiblicher Protagonist (deutsch): **Lucia** (korrekt).
- Zweiblattdorf = Twinleaf Town (korrekt, verifiziert).
- **Erzelingen** = Oreburgh City (NICHT "Erzbingen" — war lange falsch, seit Modul M im
  sichtbaren Text korrigiert; interner Map-ID-Key `erzbingen` blieb unverändert).
- Arenaleiter von Erzelingen: **Veit** (deutsch für Roark, korrekt), Gesteins-Typ,
  Steinorden.
- Route-202-Trainer (korrekt recherchiert): Jungspund Tristan, Jugendliche Natalie,
  Jungspund Logan.

## 9. Multiplayer-Design-Entscheidungen (fest, bis Finn sie widerruft)

1. **Keine Host-Migration.** Stürzt der Host ab, treten alle einfach neu bei. Bewusst
   einfach gehalten (Koop unter Freunden).
2. **Eigenes Savegame pro Client**, lokal (`user://saves/`), kein geteilter/serverseitiger
   Weltzustand.
3. **Kampf ist privat** — eigener Kampfbildschirm nur für den jeweiligen Spieler. Auf der
   Overworld zeigt ein Icon über dem Kopf des Remote-Spielers den Status (⚔ = Kampf,
   🤝 = Tausch).

## 10. Offene TODOs (Priorität nach Einschätzung, nicht zwingend Reihenfolge)

- **EXP-Balken im Kampf verdrahten** — Asset liegt fertig in `assets/spritesheets/ui/
  battle_gui.png`, nur noch nicht ausgeschnitten/eingebaut (analog zu
  `tools/slice_battle_bg.py`).
- **Oreburgh-Gate (Erzelingen-Tunnel) als echte T-Kreuzung** — aktuell nur Deko-Objekte,
  Wandtopologie ist noch der einfache Rechteck-Raum (Risiko: den einzigen Durchgang
  blockieren, daher bisher ausgelassen).
- **Zweistöckige Kohlemine** (laut Bulbapedia hat die echte Mine 2 Ebenen).
- **Mehr Tile-Varianz für Außenkarten** — einziger Punkt, der wirklich neue Grafik statt nur
  Verdrahtung braucht (Finn empfand Gras/Wald als repetitiv).
- **Story-Content schreiben** — eigener Wortlaut für weitere Dialoge/Ereignisse, Stück für
  Stück (kein Copy-Paste-Original-Script, s. Abschnitt 3).
- **PvP-Kampf / Tausch übers Netz** — Engine/Architektur ist dafür vorbereitet
  (`BattleManager`, Netzwerk-Kanäle), aber noch nicht implementiert.
- Weitere Städte/Arenen (Sinnoh hat insgesamt 8 Arenen, bisher nur Erzelingen/Veit).

## 11. Erledigte Module (Kurzchronik, A bis O)

| Modul | Inhalt |
|---|---|
| A | Overworld-Grundgerüst (GridActor, Player, Map, SceneManager) |
| B | Netzwerk (ENet Host/Join, MultiplayerMenu, ChatBox, RemotePlayer) |
| C | Kampfsystem (PokemonInstance, StatCalc, DamageCalc, BattleEngine, BattleAI) |
| D | PokéAPI-Datenpipeline (493 Pokémon, 448 Attacken, deutsche Namen) |
| E | Dialog/Save/Encounter/Inventar/Pokédex/PauseMenu |
| F | Datengetriebene Maps, Warp/Gate/Sign/Shopkeeper, QuestManager, MartManager |
| G | Visuelle Integration: eigenes Tileset, DS-Sprites, Boden als ArrayMesh |
| H | Welterweiterung: Route 203, Tunnel, Erzelingen, Arena, Orden-System, Fahrrad |
| I | **Originalitäts-Pivot**: echte Intro-Sequenz, Namenseingabe, 3D-Häuser statt Billboards |
| I-Fix | Treppen-Warp-Loop-Bug + Wand-/Kamera-Fixes (Wände verzerrt, Räume zu leer) |
| I-3 | Eigenes Gen-4-Textbox-Design (StyleBoxTexture, Namensschild, hüpfender Pfeil) |
| J | Kampf-Sprites/-Hintergrund/-Musik/-Animationen verdrahtet (Assets lagen schon da!) |
| K | Häuser-Bugfix (Türen via Interact funktionierten nie) + Zweiblattdorf/Sandgemme nach Bulbapedia neu gebaut |
| L | Kartenwechsel-Fade (TransitionManager), Story-Namenskorrekturen (Lucius), Route-202-Trainer |
| M | Stadt-Namenskorrektur (Erzelingen), Jubelstadt/Erzelingen/Route201/Kohlemine nach Bulbapedia erweitert |
| N | Ledge-Mechanik (einseitig überquerbare Kanten, GridActor.try_step()) |
| O | Jubelstadt-/Erzelingen-Gebäude begehbar gemacht (6 neue Innenräume) + Kamera-Raumgrenzen-Fix |

---

**Nächster Schritt beim Fortsetzen im neuen Chat**: einfach fragen "was soll ich als
Nächstes machen" oder direkt einen der offenen TODOs (Abschnitt 10) angehen — der Kontext
oben reicht, um ohne weitere Rückfragen loszulegen.
