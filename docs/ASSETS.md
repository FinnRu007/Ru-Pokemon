# Assets & DS-Optik

Ziel: das Spiel soll aussehen wie **Pokémon Perl / Platin** auf dem DS.
Der Code ist schon darauf ausgelegt – es fehlen nur die echten Grafiken.

## Automatischer Download

```bash
python tools/download_assets.py
```

Holt automatisch und legt sortiert ab:

| zuverlässig | Quelle | Ziel |
|---|---|---|
| Pokémon Front/Back (Gen-4/Platin) | PokeAPI/sprites | `assets/spritesheets/pokemon/{front,back}/` |
| Menü-Icons | msikma/pokesprite | `assets/spritesheets/pokemon/icons/` |
| Cries (1–493) | PokeAPI/cries | `assets/audio/cries/` |
| Typ-Symbole | duiker101/pokemon-type-svg-icons | `assets/spritesheets/types/` |

| funktioniert (Spriters Resource, echte Asset-IDs) | Quelle | Ziel |
|---|---|---|
| Held/Heldin/Rivale/NPCs (DS-Overworld) | spriters-resource.com | `assets/spritesheets/characters/` |
| Trainer-Kampfsprites + UI-Sheets | spriters-resource.com | `assets/spritesheets/{trainers,ui}/` |

| generiert / best effort | Werkzeug/Quelle | Ziel |
|---|---|---|
| **Tileset** (eigene DS-Stil-Pixel-Art, 40 Tiles) | `tools/make_tileset.py` | `assets/spritesheets/tilesets/overworld.png` |
| Charakter-**SpriteFrames** (aus den Sheets geschnitten) | `tools/slice_sprites.py` | `resources/characters/*_frames.tres` |
| BGM | khinsider (2-Schritt-Scrape) | `assets/audio/bgm/` |
| Pixel-Fonts | – (noch keine funktionierende Quelle) | `assets/fonts/` |

`python tools/download_assets.py` macht Download → Slicing → Tileset in einem Rutsch.
Optionen: `--only pokemon,cries,characters,tilesets`, `--pokemon-limit 50`, `--bgm-limit 10`,
`--no-spriters`, `--no-khinsider`, `--list`, `--dry-run`.
Ergebnis-Protokoll: `assets/ASSET_MANIFEST.json`. Danach Godot einmal öffnen (Auto-Import).

## 1. Wie die DS-Optik im Projekt entsteht

| Baustein | Wo | Einstellung |
|---|---|---|
| Low-Res-Render | `scenes/main/Main.tscn` → `WorldViewport` | `SubViewportContainer`, `stretch = true`, `stretch_shrink = 2` → 3D rendert in halber Auflösung und wird **nearest** hochskaliert (chunky Pixel) |
| Kein Kantenglätten | `project.godot [rendering]` | `msaa_3d = 0`, `screen_space_aa = 0`, `use_taa = false` |
| Harte Sprite-Pixel | `CharacterVisual` (`scripts/core/character_visual.gd`) | `texture_filter = NEAREST`, `billboard = FIXED_Y`, `shaded = false`, `alpha_cut = discard` |
| Feste Schrägkamera | `CameraRig` (`scripts/overworld/camera_rig.gd`) | `pitch_deg ≈ 51`, `view_fov ≈ 30` (enger FOV = fast orthografisch, wie DPP) |

**Kamera feinjustieren:** Player-Szene öffnen → Knoten `Camera3D` → im Inspector
`Pitch Deg`, `Height`, `Back Distance`, `View Fov` live anpassen, bis der Bildausschnitt
zu Perl/Platin passt.

**Render-Auflösung ändern:** `Main.tscn` → `SubViewport` → `stretch_shrink`
(2 = kräftig pixelig, 1 = scharf). Für echtes DS-Feeling ggf. Fenster auf 4:3 stellen.

## 2. Charakter-Sprites – automatisch

`python tools/download_assets.py --only characters` lädt die DS-Overworld-Sheets
(Lucas/Dawn/Barry/NPCs) und ruft `tools/slice_sprites.py` auf:

- Hintergrund `(0,128,128)` **und** `(136,184,176)` werden transparent.
- 32×32-Raster, Pitch 34, Start (2,2). Zeilen 0–2 = down/up/left, **right = left gespiegelt**.
- Ergebnis: `resources/characters/<name>_frames.tres` (Animationen
  `idle_/walk_` × `down/up/left/right`), Rolle→Datei in `resources/characters/roles.json`.

`Player`/`RemotePlayer` laden die `.tres` **per Skript** (Fallback: Icon-Platzhalter, kein Crash).
NPCs/Trainer bekommen ihre Rolle über das Feld `role` in `data/maps.json`
(`professor`, `hiker`, `lass`, `boy`, `girl`, `gent`, `villager_m/f`, `bugcatcher`, `oldman`).

**Andere Figur einbinden:** Sheet nach `assets/spritesheets/characters/` legen, in
`tools/slice_sprites.py` unter `HEROES` bzw. `NPC_ROLES` Datei/Spalte ergänzen, Skript laufen.
`pixel_size` am `Visual`-Knoten ist **0.045** (32-px-Sprite auf 1-m-Kachel).

## 3. Maps & Tileset

Spriters Resource hat **kein** freies Platin-Overworld-Tileset. Daher erzeugt
`tools/make_tileset.py` ein eigenes DS-Stil-Tileset (`assets/spritesheets/tilesets/overworld.png`,
16-px-Raster, 8 Spalten, 40 Tiles: Gras/Pfad/hohes Gras/Wasser/Baum/Zaun/Haus/Boden …).

`PlaceholderMap` baut daraus:
- **Boden**: ein `ArrayMesh` (1 Draw-Call), UV in den Atlas, aus `data/maps.json` (size, grass-rects,
  Pfad zwischen den Warps).
- **Objekte**: Bäume/Zäune/Häuser/Schilder als Y-Billboard-`Sprite3D` (Atlas-Region) + `StaticBody3D`.
- **Warps/Türen/GrassZones**: wie in Modul F, unverändert.

**Echtes Tileset einbinden:** `overworld.png` durch einen echten Rip ersetzen (gleiches 16-px-Raster,
gleiche Tile-Reihenfolge wie in `overworld.json`). Für eine feinere Map: pro Map eine eigene
`scenes/overworld/maps/<id>.tscn` anlegen – `overworld.load_map()` nimmt die dann vor `PlaceholderMap`.

Bewegungsraster: 1 Kachel = **1 Weltmeter**. Der Ordner `assets/maps_gltf/` bleibt ungenutzt.

## 4. Musik & Sounds

DS-Rips (NSF/2SF → OGG/WAV) nach `assets/audio/bgm/` bzw. `assets/audio/sfx/`.
Wiedergabe später über ein `AudioManager`-Autoload (`bgm`-Key in `MapBase`).

## 5. Rechtliches

Alle oben genannten Assets sind Nintendo-Eigentum. **Nur privat nutzen**, Repo privat halten,
keine Builds mit diesen Assets veröffentlichen.
