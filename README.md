# Ru-Pokémon

PC-Remake von *Pokémon Perl* (Gen 4) in **Godot 4** – DS-2.5D-Optik (3D-Welt + Billboard-Sprites),
native Tastatursteuerung und **Echtzeit-Multiplayer auf der Overworld** (Client-Server / ENet).

> ⚠️ **Nur privater Gebrauch.** Das Projekt nutzt urheberrechtlich geschützte Nintendo-Assets.
> Repo privat halten, keine öffentlichen Builds verteilen.

## Setup

1. **Godot 4.3+** (Standard-Version, *nicht* .NET) installieren: <https://godotengine.org/download>
2. Godot starten → **Import** → diesen Ordner wählen (`project.godot`).
3. **F5** drücken. Es startet das Multiplayer-Menü.

## Steuerung

| Taste | Aktion |
|---|---|
| `W A S D` / Pfeiltasten | Bewegung (tile-basiert, 4 Richtungen) |
| `E` / `Enter` / `Leertaste` | Interagieren / Dialog weiter |
| `Esc` | ESC-Menü (Pokémon / Beutel / Pokédex / Speichern) |
| `T` | Chat öffnen (Enter = senden, ESC = abbrechen) |

**Erster Start:** Neues Spiel → aus dem Haus nach draußen → nach Norden auf Route 201 → Koffer
(links) ansprechen → Starter wählen → weiter nach Norden nach Sandgemme (Labor: Pokédex holen) →
Route 202 → Jubelstadt → Route 203 → Erzelingen-Tunnel (VM Zertrümmerer aufsammeln!) → Erzelingen
→ Arenaleiter Veit herausfordern → mit Orden + VM den Felsen in der Kohlemine zertrümmern.

## Multiplayer testen (2 Instanzen)

1. In Godot: **Debug → „Run Multiple Instances" → 2 Instanzen**, dann F5.
2. Instanz 1: Name eingeben → **Server hosten**.
3. Instanz 2: IP `127.0.0.1` → **Beitreten**.
4. Beide laufen auf der Testkarte herum und sehen sich in Echtzeit; `T` zum Chatten.

Über LAN/Internet: Host gibt seine IP weiter (Port **7777** UDP muss erreichbar / weitergeleitet sein).

## Status

### Modul A – Overworld-Foundation ✅
Tile-Bewegung + Kollision (`GridActor`), lokaler Spieler, Map-System (`MapBase`), `SceneManager`,
Autoload-Gerüst.

### Modul B – Netzwerk-Kern ✅
- `NetworkManager`: ENet Host/Join, Handshake, Spielerliste, Kanäle (Events/Movement/Chat)
- Positions-Replikation (unreliable_ordered) → `RemotePlayer` interpoliert zwischen Tiles
- `MultiplayerMenu` (Solo / Host / Beitreten) + `ChatBox`
- Status-Icons ⚔/⇄ über Remote-Spielern (Kampf/Tausch – privat, nur Icon sichtbar)

### Modul C – Kampfsystem ✅
- `PokemonInstance` (IVs/EVs/Wesen/Attacken/XP, serialisierbar), `StatCalc` (Gen-4-Formeln)
- `DamageCalc` (Gen-4-Schaden, STAB, Krit, Typentabelle), `BattleEngine` (Event-basiert, seed-deterministisch → PvP-tauglich)
- Kampfbildschirm mit Menü Kampf/Beutel/Pokémon/Flucht, Attackenauswahl, (erzwungenem) Wechsel
- `BattleManager`-Autoload, Statuseffekte, Level-up, EXP, Fangen; Kampf ist privat + setzt ⚔-Status

### Modul D – Daten-Pipeline ✅
- Voller National-Dex Gen 1–4 aus [PokéAPI](https://pokeapi.co) importiert (deutsche Namen):
  493 Pokémon, 448 Attacken, Gen-4-Typentabelle, 240 Entwicklungen → `data/generated/*.json`
- Zwei Importer: [`tools/import_pokeapi.py`](tools/import_pokeapi.py) (Python) und
  [`scripts/tools/pokeapi_importer.gd`](scripts/tools/pokeapi_importer.gd) (Godot headless)
- Neu importieren: `python tools/import_pokeapi.py` (Cache in `.pokeapi_cache/`)

### Modul E – Spielsysteme ✅
Dialog, Speichern (3 Slots, „Weiterspielen"), Wild-Encounter, Gen-4-Fangen, Starter-Wahl,
Inventar/Pokédex-Logik, ESC-Menü (Pokémon/Beutel/Pokédex/Speichern).

### Modul F – Welt & Story ✅
- **Datengetriebene Maps** (`data/maps.json`): 9 Maps von Zweiblattdorf über Route 201,
  Sandgemme (Labor/Markt/Center), Route 202 bis Jubelstadt
- **Warps & Türen**, **flag-gesteuerte Blockaden**, **Markt-System**, **Trainer mit Sichtlinie**
- **QuestManager**: aktuelles Ziel im ESC-Menü

### Modul G – Visuelle Integration ✅ (Gen-4/Platin-Optik)
- **Gekacheltes Boden-Mesh** (Gras/Pfad/hohes Gras/Holzboden/Höhle) aus einem 48-Tile-Atlas
- **Bäume, Zäune, Häuser** als Billboards mit Kollision
- **Echte DS-Overworld-Sprites** (Lucas/Dawn/Barry/NPCs) mit 4-Wege-Idle/Walk-Animation
- Pipeline: `python tools/download_assets.py` → lädt Sheets, schneidet Frames, baut Tileset

### Modul H – Welterweiterung & Arena-System ✅
- **Neue Gebiete**: Route 203 → Erzelingen-Tunnel (Höhle) → Erzelingen (Stadt + Arena + Kohlemine)
- **Höhlen-Mechanik**: eigene Boden-/Wandoptik, funktionierende Höhlen-Encounter (Zubat, Geodude, Onix …)
- **Arena & Orden**: Arenaleiter Veit (Erzelingen-Arena, Gesteins-Team) vergibt den Steinorden
- **Zertrümmerer**: Felsen im Feld, blockiert ohne Orden + VM, danach dauerhaft zertrümmerbar
- **Fahrrad**: verdoppelt das Lauftempo, sobald in der Tasche
- **Beeren**: neue Item-Kategorie, nutzbar im Beutel & Kampf (heilt HP / kuriert Status)

### DS-Optik-Grundlage ✅
- Low-Res-`SubViewport` (halbe Auflösung, nearest hochskaliert)
- Feste Perl/Platin-Kamera (`CameraRig`, enger FOV, im Inspector justierbar)
- Sprite-Sheet-fähiges `CharacterVisual` (4 Richtungen, idle/walk) – Platzhalter bis echte Sheets

**Grafik einbinden:** siehe [`docs/ASSETS.md`](docs/ASSETS.md)

## Nächstes

- **Echte Tileset-Grafik** einbauen (Assets werden nachgeliefert) – siehe [`docs/ASSETS.md`](docs/ASSETS.md)
- Audio (BGM/SFX/Cries)
- Weitere Städte/Arenen, Läden in Erzelingen, mehr TMs
- PvP-Kampf & Tausch übers Netz (BattleEngine ist seed-deterministisch → bereit)

Architektur-Details: [`docs/ARCHITEKTUR.md`](docs/ARCHITEKTUR.md)
