# Architektur – Ru-Pokémon

## Tech-Stack

- **Godot 4.3+**, GDScript
- **Rendering:** 3D-Welt (glTF-Maps aus *Apicula*) + `Sprite3D`-Billboards (Y-Achse), `texture_filter = Nearest`
- **Netzwerk:** `ENetMultiplayerPeer` + `MultiplayerAPI`, Client-Server
- **Daten:** lokale JSON in `data/generated/` (einmalig aus der PokéAPI importiert – kein Laufzeit-Call)

## Verzeichnisstruktur

```
assets/          Rohdaten, NICHT im Spiel referenziert (.gitignore)
  spritesheets/  von The Spriters Resource
  maps_gltf/     Apicula-Exporte (.gltf/.glb)
  audio/
data/            Spiel-Datenbank
  generated/     Output des PokéAPI-Importers (pokemon/moves/types/items .json)
  maps/          Map-Metadaten: Warps, Encounter-Tables, NPC-Spawns
  trainers/      Trainer-Teams + Dialoge
  encounters/    Wild-Encounter-Tabellen pro Route
  dialogue/      Dialog-Trees
resources/       typisierte .tres (aus data/ erzeugt, im Editor nutzbar)
scenes/
  main/          Main.tscn (Einstieg)
  ui/            Menüs, Dialogbox, Multiplayer-Menü, Pokédex ...
  overworld/     Overworld.tscn, Player, RemotePlayer, NPC, maps/*
  battle/        Battle.tscn, BattlePokemon, BattleMenu ...
scripts/
  core/          state_machine, billboard, generische Helfer
  overworld/     grid_actor, player, remote_player, map, overworld
  battle/        battle_engine (pure Logik), damage_calc, turn_resolver, battle_ai
  data/          pokemon_instance, stat_calc, party, inventory
  net/           net_protocol, net_player_sync, net_chat
  tools/         pokeapi_importer (EditorScript)
  main/          main.gd
autoload/        GameData, GameState, NetworkManager, SceneManager (+ später BattleManager, AudioManager, SaveSystem)
docs/
```

## Autoloads (Singletons)

| Autoload | Hält | Hält NICHT |
|---|---|---|
| **GameData** | Statische DB: Species, Moves, Typen-Matrix, Items. Einmal geladen, read-only. | Spielerfortschritt |
| **GameState** | Dynamischer Zustand des *lokalen* Spielers: Party, Beutel, Geld, Flags, Pokédex, letzte Position | Daten anderer Spieler, Netzcode |
| **NetworkManager** | Peer, `peer_id → info`, Signale `player_joined/left`, `remote_moved`, `remote_status_changed` | Spielmechanik, Kampf-Regeln |
| **SceneManager** | Aktuelle Overworld-Map, Warp-Logik, Übergänge | — |

Reihenfolge in `project.godot`: GameData → GameState → SaveSystem → QuestManager →
NetworkManager → SceneManager → BattleManager → DialogueManager → MartManager.

Weitere Autoloads: **SaveSystem** (Savegames), **QuestManager** (Story-Ziel), **BattleManager**
(Kampf-Lebenszyklus), **DialogueManager** (Textboxen), **MartManager** (Kauf/Verkauf).

## Design-Prinzipien

1. **Logik von Darstellung trennen.** `battle_engine.gd`, `stat_calc.gd`, `damage_calc.gd` sind
   pure Klassen ohne `Node` → unit-testbar und deterministisch (wichtig für PvP übers Netz).
2. **Server autoritativ für Encounters, Kämpfe, Tausch** – „dumb" für Bewegung.
   Overworld-Bewegung wird clientseitig simuliert und nur repliziert (kein Anti-Cheat, Koop unter Freunden).
3. **`PokemonInstance` ist serialisierbar** (`to_dict()` / `from_dict()`) – dieselbe Funktion für
   Savegame *und* Tausch/Kampf übers Netz.
4. **Maps sind austauschbar.** Jede `maps/*.tscn` erbt von `MapBase`: glTF-Mesh + Kollision +
   Marker (Warps, NPC-Spawns) + `EncounterZone`-Nodes.

## Bestätigte Design-Entscheidungen (Multiplayer)

1. **Host-Migration: nein.** Stürzt der Host ab, treten alle neu bei.
2. **Persistenz: eigenes Savegame pro Client.** Jeder Spieler speichert Team/Inventar/Fortschritt
   lokal (`GameState` + späteres `SaveSystem`, `user://saves/`) und bringt diese Daten in die
   Host-Sitzung mit. Keine geteilte Welt.
3. **Kampf ist privat** (lokaler Kampfbildschirm). Auf der Overworld zeigt ein Icon über dem Kopf
   (`RemotePlayer/StatusIcon`: ⚔ Kampf, 🤝 Tausch), dass der Spieler gerade beschäftigt ist.

## Netzwerk-Konzept (Modul B)

### Peer-Setup
`ENetMultiplayerPeer.create_server(PORT, MAX_CLIENTS)` bzw. `create_client(ip, PORT)`.
Host ist immer `peer_id == 1`.

### Handshake
1. Client verbindet → `_register_player.rpc(GameState.to_network_info())` an alle.
2. Server empfängt, trägt in `players` ein, sendet dem Neuen per `rpc_id` die volle Liste zurück.
3. `player_joined` wird emittiert → `Overworld` spawnt `RemotePlayer`.

### Positions-Updates
Grid-Bewegung → kein Update pro Frame. Gesendet wird:
- nach **jedem abgeschlossenen Tile-Schritt** (`Player._on_step_finished`)
- bei **Richtungswechsel im Stand** (`Player._on_facing_changed`)

`@rpc("any_peer", "unreliable_ordered", "call_remote", Channel.MOVEMENT)` mit `(pos, facing, map)`.
Empfänger (`RemotePlayer.network_move_to`) interpoliert per Tween über `step_time` zum Ziel-Tile
→ sieht identisch zum lokalen Spieler aus.

### ENet-Kanäle
| Kanal | Modus | Inhalt |
|---|---|---|
| 0 `EVENTS` | reliable | Handshake, Join/Leave, Map-Wechsel, Status, Battle-/Trade-Requests |
| 1 `MOVEMENT` | unreliable_ordered | Positions-Updates |
| 2 `CHAT` | reliable | Chat |

### Map-Sichtbarkeit
`RemotePlayer` nur sichtbar, wenn `info.map == SceneManager.current_map`.
`Overworld` spawnt/entfernt Remotes bei `remote_moved` / `player_joined` / Map-Wechsel.

### PvP-Kampf & Tausch (späteres Modul)
- Anfrage: `request_battle.rpc_id(target)` → UI-Prompt → `accept_battle.rpc_id(sender)`.
- **Host = Schiedsrichter:** beide Clients schicken ihre Aktion (`submit_turn.rpc_id(1, action)`),
  Host löst mit `battle_engine.gd` deterministisch auf (geseedeter RNG), sendet Ergebnis an beide.
- Tausch: beide legen `PokemonInstance.to_dict()` in Trade-Slot, beide bestätigen, Host validiert & tauscht.

## Modul-Reihenfolge

- **A – Overworld-Foundation** ✅ (GridActor, Player, Kamera, MapBase, SceneManager, Autoload-Gerüst)
- **B – Netzwerk-Kern** ✅ (Host/Join-Menü, Handshake, Positions-RPCs, Chat, RemotePlayer) – headless getestet: echte ENet-Verbindung, Sync, Chat
- **C – Kampfsystem** ✅ (PokemonInstance + Serialisierung, stat_calc Gen-4-Formeln, damage_calc,
  battle_engine als Event-Liste, battle_ai, Battle-Screen-UI, BattleManager-Autoload, TrainerNPC)
  – headless getestet: Trainerkampf über Overworld-Interaktion, Statuseffekte, Level-up, K.o./Wechsel
- **D – Daten-Pipeline** ✅ voller National-Dex Gen 1–4 aus PokéAPI importiert:
  `data/generated/pokemon.json` (493), `moves.json` (448), `types.json` (Gen-4, 17 Typen),
  `evolutions.json` (240). Deutsche Namen. Zwei Importer: `tools/import_pokeapi.py` (Python,
  getestet) und `scripts/tools/pokeapi_importer.gd` (Godot-headless, gleiche Ausgabe).
  `GameData` lädt beim Start, `[GameData]`-Zeile im Log.
- **E – Spielsysteme** ✅ Dialog, Speichern, Wild-Encounter + Fangen, Starter-Wahl, Inventar/Pokédex, ESC-Menü.
- **F – Welt & Story** ✅ datengetriebene Maps (`data/maps.json` → `PlaceholderMap`), 9 Maps,
  Warps/Türen, `Gate`, Markt, Trainer-Sichtlinie, `QuestManager`.
- **G – Visuelle Integration** ✅ (Gen-4/Platin-Optik):
  gekacheltes Boden-Mesh (ArrayMesh) aus 40-Tile-Atlas, Bäume/Zäune/Häuser als Billboards mit
  Kollision, echte DS-Overworld-Sprites (Lucas/Dawn/Barry/NPCs) mit 4-Wege-Idle/Walk-Frames.
  Asset-Pipeline: `tools/download_assets.py` (Spriters Resource, korrekte Asset-IDs) →
  `tools/slice_sprites.py` (→ `resources/characters/*.tres`) + `tools/make_tileset.py` (→
  `assets/spritesheets/tilesets/overworld.png`, eigene Pixel-Art). Playthrough-Test (_ftest) grün.
- **H – Welterweiterung & Arena-System** ✅ Route 203, Erzelingen-Tunnel (Höhle), Erzelingen
  (Stadt + Arena + Kohlemine), Orden-System, Zertrümmerer-Felsen, Fahrrad, Beeren.
- danach: Audio (BGM/SFX/Cries), weitere Städte/Arenen, echte Tileset-Grafik statt der
  generierten, PvP-Kampf/Tausch übers Netz

## Spielsysteme (Modul E)

| System | Ort | Kurz |
|---|---|---|
| **Dialog** | `DialogueManager` (Autoload) + `DialogueBox.tscn` | `await DialogueManager.run([zeilen], name)` / `await ask(frage, [optionen]) -> int`. Schreibmaschineneffekt, sperrt Spielerbewegung. |
| **Speichern** | `SaveSystem` (Autoload) | `user://saves/slot_N.json` (3 Slots). `GameState.to_save_dict()`/`load_save_dict()`. `slot_summary()` für Menü. |
| **Encounter** | `GrassZone` (Area3D) + `data/generated/encounters.json` | Nach jedem Tile-Schritt im Gras Wurf gegen `rate`; gewichtete Art-/Level-Wahl → `BattleManager.start_wild_battle`. |
| **Fangen** | `BattleEngine._attempt_catch` (Gen-4-Formel) | `resolve_turn({action:"item", item:"poke-ball"})`. `winner()==-3` → `BattleManager` legt Fang ins Team/Box, `register_caught`. |
| **Starter** | `StarterTable` (`scripts/overworld/starter_table.gd`) | Interaktion → Dialog-Auswahl Chelast/Panflam/Plinfa → Team + Flag `got_starter`. |
| **Inventar** | `GameState` + `data/generated/items.json` | `add_item/remove_item/item_count/items_in_category`. Kategorien balls/medicine/items/key. Item-Effekte (`heal_hp`, `cure_status`, `revive`, `ball_bonus`). |
| **Pokédex** | `GameState` | `register_seen/register_caught`, `seen_count/caught_count`. Auto-Registrierung bei Kampfstart + Fang. |
| **ESC-Menü** | `PauseMenu.tscn` (`scripts/ui/pause_menu.gd`) | Pokémon / Beutel / Pokédex / Speichern. Von `main.gd` per „menu"-Action geöffnet. |
| **NPC** | `NPC` (`scripts/overworld/npc.gd`) | `lines` (Zeile = Textbox), optional `lines_after` je Flag, `heal_party_on_talk`. |
| **Whiteout** | `BattleManager._handle_whiteout` | Team K.o. → Dialog, Heilung, −30 % Geld, zurück zum letzten Spawn. |

## Welt & Story (Modul F)

**Datengetriebene Maps** – statt pro Map eine `.tscn` gibt es `data/maps.json`
(`{map_id: {name, size, indoor, spawns, walls, warps, doors, grass, npcs, trainers, signs, objects}}`).
`overworld.load_map(id)` nimmt `scenes/overworld/maps/<id>.tscn` falls vorhanden, sonst
`PlaceholderMap` + `build_from_data(id)` (baut Boden, Perimeter-Wände mit Lücken an Warps, alles
prozedural). Echte Tileset-Maps können später einzeln als `.tscn` dazukommen, ohne den Rest zu ändern.

| Baustein | Skript | Zweck |
|---|---|---|
| `Warp` | `scripts/overworld/warp.gd` | Area3D-Übergang. `auto` (betreten) oder Tür (`interact` + `require_facing`). |
| `Gate` | `gate.gd` | Blockade bis `open_flag` gesetzt; gibt solange `block_text` aus. Live-Update über `GameState.flag_changed`. |
| `NPC` / `Sign` | `npc.gd` / `sign.gd` | Gesprächs-NPC (Zeilen, `flag_after`/`lines_after`, `heal_party_on_talk`) / Schild. |
| `TrainerNPC` | `trainer.gd` | Sichtlinie in `facing`-Richtung bis `sight_range` (Hindernis-Check per Point-Query); „!" → Heranlaufen → Kampf. `bind_player` von `overworld` nach Map-Load. |
| `Shopkeeper` + `MartManager` + `MartMenu` | Kaufen (Preis) / Verkaufen (halber Preis), 1 Stück pro Klick. |
| `ProfessorNPC` / `StarterTable` | Pokédex + Startbälle / Starter-Auswahl. |
| `QuestManager` (Autoload) | `current_text()` = nächstes offenes Story-Ziel (Flags aus `BEATS`), Anzeige im ESC-Menü. |

`SceneManager.load_map` setzt automatisch `visited_<map_id>` als Flag (für Quest-Fortschritt).
Der Spieler wird bei Warps per `GridActor.teleport()` versetzt (bricht laufende Bewegung ab).

### Visuelle Integration (Modul G)

- **Boden**: `PlaceholderMap._build_floor_mesh()` – ein `ArrayMesh` (1 Draw-Call) aus 1×1-Quads,
  UV in `assets/spritesheets/tilesets/overworld.png` (40 Tiles, 8 Spalten). Gras/Pfad/hohes
  Gras/Holzboden; `_base_tile()` streut deterministisch Büschel & Blumen, `_paint_paths()` legt
  einen L-Pfad zwischen den beiden Warps.
- **Objekte** (Bäume, Zäune, Häuser, Schilder): `_flat_sprite(tile_idx)` – `Sprite3D` mit
  `region_rect` in den Atlas, Y-Billboard, `alpha_cut = discard`. Kollision über `StaticBody3D`.
- **Charaktere**: `CharacterVisual` (`AnimatedSprite3D`) mit `SpriteFrames` aus
  `resources/characters/<rolle>_frames.tres` (idle_/walk_ × down/up/left/right; right = left
  gespiegelt). Rolle→Datei in `resources/characters/roles.json`. Fällt auf den Icon-Platzhalter
  zurück, wenn die Assets nicht heruntergeladen wurden (kein harter Fehler).
- **Tileset-Grafik ersetzen**: `overworld.png` (16px-Raster, gleiche Tile-Reihenfolge) austauschen.
  **Charakter-Grafik ersetzen**: neue Sheets nach `assets/spritesheets/characters/`, IDs/Spalten
  in `tools/slice_sprites.py` anpassen, Skript laufen lassen.

## Welterweiterung & Arena-System (Modul H)

**Neue Maps** (`data/maps.json`): `route203`, `oreburgh_gate` (Erzelingen-Tunnel, `cave: true`),
`erzbingen` (Stadt), `erzbingen_gym` (`gym: true`), `coal_mine` (Kohlemine, `cave: true`).
Kette: Jubelstadt ↔ Route 203 ↔ Tunnel ↔ Erzelingen ↔ Arena / Kohlemine.

- **`cave` / `gym` Map-Flags** (`PlaceholderMap`): eigene Boden-/Wandtexturen (Höhlenfels bzw.
  Arena-Ziegel); `cave` unterdrückt außerdem die Gras-Textur unter `GrassZone`s (die Encounter-
  Logik bleibt aktiv, nur die Optik passt sich an).
- **Orden-System**: `GameState.badges` (+`add_badge/has_badge/badge_count`, in Save/Load).
  `TrainerNPC` bekommt optional `badge_id`/`badge_name` – beim Sieg wird der Orden vergeben
  (Arenaleiter Veit/Erzelingen-Arena → „Steinorden", `coal`).
  Test: `erzbingen_gym`, Trainer „Arenaleiter Veit" (Geodude/Geodude/Onix).
- **Zertrümmerer-Felsen**: `smash_rock`-Objekt (`scripts/overworld/smash_rock.gd`) – blockiert,
  bis `GameState.has_badge(required_badge)` **und** `has_item(required_item)` (Standard: `coal` +
  `hm06-rock-smash`); danach einmalig zertrümmerbar (Flag), optionale Item-Belohnung.
- **Item-Fundstücke**: `item_pickup`-Objekt (`scripts/overworld/item_pickup.gd`) – einmalig
  aufsammelbar (Flag), für HM/Beeren/Fahrrad im Feld.
- **Fahrrad**: `GameState.has_bike()` (Item `bicycle` in der Tasche) → `player.gd` setzt
  `step_time` auf die Hälfte (`BIKE_TIME` statt `WALK_TIME`), pro Physik-Tick neu ausgewertet.
- **Beeren**: neue Item-Kategorie `berries` in `data/generated/items.json`, gleiche
  Effekt-Kinds wie Tränke/Heiler (`heal_hp`, `cure_status`) – im Beutel und im Kampf nutzbar
  (`pause_menu.gd`, `battle_screen._open_bag` zeigen die Kategorie mit an).

## Datenbank (Modul D)

**`data/generated/pokemon.json`** – pro Slug: `dex, name (de), name_en, types[], base_stats{hp,atk,def,spa,spd,spe},
abilities[], hidden_ability, growth_rate, base_exp, catch_rate, gender_rate, egg_groups[], height,
weight, learnset{level:[move_slug]}` (Level-Lernsatz Platin).

**`moves.json`** – pro Slug: `name (de), name_en, type, category (physical|special|status), power,
accuracy, pp, priority, target, crit_stage?, effect?`. `effect.kind` ∈
`status_chance | stat | stat_chance | drain | recoil | heal | flinch_chance`
(`stat`/`stat_chance` mit `stat_changes:[{stat,stages}]` + `target: self|opponent`).

**`types.json`** – `{angreifer: {verteidiger: multiplikator}}`, nur ≠ 1.0. Gen-4-Regeln fest
(kein Feentyp; Stahl resistiert Geist & Unlicht).

**`evolutions.json`** – `{slug: [{to, trigger, min_level?, item?, min_happiness?}]}`.

Neu importieren:  `python tools/import_pokeapi.py [max_dex]`  oder
`Godot --headless --path . -s res://scripts/tools/pokeapi_importer.gd -- [max_dex]`.
Antworten werden in `.pokeapi_cache/` gecacht (2. Lauf schnell, .gitignore'd).

## Kampfsystem (Modul C)

- **`PokemonInstance`** (`scripts/data/`): Spezies + Level + IVs/EVs + Wesen + Attacken(+AP) + XP +
  Status. `to_dict()`/`from_dict()` – dieselbe Serialisierung für Savegame und Netz-Tausch.
- **`StatCalc`**: Gen-4-Formeln (HP separat), 25 Naturen, Stat-Stufen, Erfahrungskurven.
- **`DamageCalc`**: Gen-4-Schadensformel, STAB, Krit (×2), Zufall 0.85–1.0, Typentabelle über `GameData`.
- **`BattleEngine`** (RefCounted, keine Nodes): `resolve_turn(choice)` → Array von Events
  (`text`, `move`, `damage`, `faint`, `exp`, `stat`, `status`, `switch`, `send`, `request_switch`,
  `win`, `run`). Deterministisch bei `seed_val` → direkt für PvP nutzbar (Host würfelt).
- **`BattleAI`**: meist stärkste Attacke, 25 % zufällig.
- **`battle_screen.gd`** + `Battle.tscn`: CanvasLayer über allem, spielt Events mit Pacing ab,
  Menüs Kampf/Beutel/Pokémon/Flucht + Attackenauswahl + Wechsel (auch erzwungen).
- **`BattleManager`** (Autoload): `start_trainer_battle()` / `start_wild_battle()`, sperrt Overworld-
  Input, setzt `NetworkManager` -Status `"battle"` (⚔-Icon), Team-HP/EXP bleiben in `GameState.party`.
- **`TrainerNPC`** (`scripts/overworld/trainer.gd`): `interact()` → Kampf; im TestMap an `NpcDummy`.
