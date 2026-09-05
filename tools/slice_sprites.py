#!/usr/bin/env python3
"""
Schneidet die heruntergeladenen DS-Overworld-Sheets in Godot-SpriteFrames.

Ergebnis pro Figur:
  assets/spritesheets/characters/clean/<name>.png   (Hintergrund -> transparent)
  resources/characters/<name>_frames.tres           (SpriteFrames: idle_/walk_ x 4 Richtungen)

  resources/characters/roles.json                   (Rolle -> .tres, für den Code)

DS-Overworld-Raster: 32x32-Frames, Pitch 34, Start (2,2).
Zeilen = Richtung (down, up, left, right), Spalten = Animationsphasen.
"""
import json, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHAR_DIR = os.path.join(ROOT, "assets", "spritesheets", "characters")
CLEAN_DIR = os.path.join(CHAR_DIR, "clean")
RES_DIR = os.path.join(ROOT, "resources", "characters")

PITCH = 34
SIZE = 32
DIRS = ["down", "up", "left", "right"]
WALK_SEQ = [1, 0, 3, 0]   # Spalten-Reihenfolge für den Laufzyklus

# DS-Overworld-Sheets (Spriters Resource) haben zwei Hintergrundfarben:
#   (0,128,128) in den Luecken, (136,184,176) hinter jedem Frame.
HERO_BG = [(0, 128, 128), (136, 184, 176)]

# name -> (quelldatei, spalten_offset, zeilen_offset)
HEROES = {
    "lucas": ("lucas.png", 0, 0),
    "dawn": ("dawn.png", 0, 0),
    "barry": ("barry.png", 0, 0),
}
# NPC-Sheet npcs.png: Raster-Ursprung (17,97), Zellen 32x32 ohne Lücke.
# Jede Zelle hat einen eigenen Tint-Hintergrund -> pro Zelle die Ecke keyen.
NPC_ORIGIN = (17, 97)
NPC_CELL = 32
NPC_ROLES = [
    ("professor", 3), ("oldman", 3), ("villager_m", 0), ("villager_f", 7),
    ("boy", 9), ("girl", 13), ("hiker", 4), ("bugcatcher", 6),
    ("lass", 10), ("gent", 1),
]


def clean(src_path, bg_colors, tol=18):
    im = Image.open(src_path).convert("RGBA")
    px = im.load()
    w, h = im.size
    keys = [tuple(c) for c in bg_colors]
    keys.append(px[0, 0][:3])
    keys.append(px[w - 1, h - 1][:3])

    def is_bg(p):
        for k in keys:
            if abs(p[0] - k[0]) <= tol and abs(p[1] - k[1]) <= tol and abs(p[2] - k[2]) <= tol:
                return True
        return False

    for y in range(h):
        for x in range(w):
            if is_bg(px[x, y]):
                px[x, y] = (0, 0, 0, 0)
    return im


def frame_rect(col, row):
    return (2 + PITCH * col, 2 + PITCH * row, SIZE, SIZE)


def _key_cell(cell, tol=14):
    """Rand-/Tint-Hintergrund der Zelle transparent machen (per Zelle eigene Farbe)."""
    px = cell.load()
    w, h = cell.size
    from collections import Counter
    edge = Counter()
    for x in range(w):
        edge[px[x, 0][:3]] += 1
        edge[px[x, h - 1][:3]] += 1
    for y in range(h):
        edge[px[0, y][:3]] += 1
        edge[px[w - 1, y][:3]] += 1
    keys = [c for c, _ in edge.most_common(3)]
    keys += [(0, 128, 128), (136, 184, 176), (255, 255, 255)]

    def is_bg(p):
        for k in keys:
            if abs(p[0] - k[0]) <= tol and abs(p[1] - k[1]) <= tol and abs(p[2] - k[2]) <= tol:
                return True
        return False

    for y in range(h):
        for x in range(w):
            if is_bg(px[x, y]):
                px[x, y] = (0, 0, 0, 0)
    return cell


def _build_npc_png(raw, col, out_png):
    ox, oy = NPC_ORIGIN
    strip = Image.new("RGBA", (SIZE * 4, SIZE * 4), (0, 0, 0, 0))
    for r in range(3):
        x = ox + col * NPC_CELL
        y = oy + r * NPC_CELL
        cell = _key_cell(raw.crop((x, y, x + NPC_CELL, y + NPC_CELL)).copy())
        strip.paste(cell, (0, r * SIZE))
        strip.paste(cell, (1 * SIZE, r * SIZE))
        strip.paste(cell, (2 * SIZE, r * SIZE))
        strip.paste(cell, (3 * SIZE, r * SIZE))
    left = _key_cell(raw.crop((ox + col * NPC_CELL, oy + 2 * NPC_CELL,
                               ox + col * NPC_CELL + NPC_CELL, oy + 3 * NPC_CELL)).copy())
    right = left.transpose(Image.FLIP_LEFT_RIGHT)
    for c in range(4):
        strip.paste(right, (c * SIZE, 3 * SIZE))
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    strip.save(out_png)


def build_frames_png(im, col_off, row_off, out_png):
    """Packt 4x4 Frames dicht (transparent) -> 128x128.
    Zeilen im Quell-Sheet: 0=down, 1=up, 2=left. Zeile 3 (right) = left gespiegelt
    (Gen-1..4-Konvention). Ergebnis-Zeilen: 0 down, 1 up, 2 left, 3 right."""
    strip = Image.new("RGBA", (SIZE * 4, SIZE * 4), (0, 0, 0, 0))
    for r in range(3):
        for c in range(4):
            x, y, _, _ = frame_rect(col_off + c, row_off + r)
            strip.paste(im.crop((x, y, x + SIZE, y + SIZE)), (c * SIZE, r * SIZE))
    # right = left horizontal gespiegelt
    for c in range(4):
        x, y, _, _ = frame_rect(col_off + c, row_off + 2)
        cell = im.crop((x, y, x + SIZE, y + SIZE)).transpose(Image.FLIP_LEFT_RIGHT)
        strip.paste(cell, (c * SIZE, 3 * SIZE))
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    strip.save(out_png)


def write_tres(name, png_res_path):
    """SpriteFrames .tres, das in <name>.png (128x128, 4x4) reinschneidet."""
    lines = []
    subs = []
    ext_id = "1_tex"
    sub_defs = []
    anim_entries = []

    def atlas(col, row):
        sid = f"a_{row}_{col}"
        sub_defs.append(
            f'[sub_resource type="AtlasTexture" id="{sid}"]\n'
            f'atlas = ExtResource("{ext_id}")\n'
            f'region = Rect2({col * SIZE}, {row * SIZE}, {SIZE}, {SIZE})\n'
        )
        return sid

    made = set()

    def frame_ref(col, row):
        sid = f"a_{row}_{col}"
        if sid not in made:
            made.add(sid)
            atlas(col, row)
        return '{ "duration": 1.0, "texture": SubResource("%s") }' % sid

    for row, d in enumerate(DIRS):
        anim_entries.append(
            '{\n"frames": [%s],\n"loop": true,\n"name": &"idle_%s",\n"speed": 1.0\n}'
            % (frame_ref(0, row), d)
        )
        walk = ", ".join(frame_ref(c, row) for c in WALK_SEQ)
        anim_entries.append(
            '{\n"frames": [%s],\n"loop": true,\n"name": &"walk_%s",\n"speed": 6.0\n}'
            % (walk, d)
        )

    load_steps = 1 + len(made) + 1
    out = f'[gd_resource type="SpriteFrames" load_steps={load_steps} format=3]\n\n'
    out += f'[ext_resource type="Texture2D" path="{png_res_path}" id="{ext_id}"]\n\n'
    out += "".join(sub_defs) + "\n"
    out += "[resource]\nanimations = [" + ", ".join(anim_entries) + "]\n"

    os.makedirs(RES_DIR, exist_ok=True)
    with open(os.path.join(RES_DIR, f"{name}_frames.tres"), "w", encoding="utf-8") as f:
        f.write(out)


def main():
    os.makedirs(CLEAN_DIR, exist_ok=True)
    roles = {}

    for name, (fn, co, ro) in HEROES.items():
        src = os.path.join(CHAR_DIR, fn)
        if not os.path.exists(src):
            print(f"  {fn} fehlt – übersprungen")
            continue
        im = clean(src, HERO_BG)
        out_png = os.path.join(CLEAN_DIR, f"{name}.png")
        build_frames_png(im, co, ro, out_png)
        write_tres(name, f"res://assets/spritesheets/characters/clean/{name}.png")
        print(f"  {name}: frames-png + tres")

    # NPCs
    npc_src = os.path.join(CHAR_DIR, "npcs.png")
    if os.path.exists(npc_src):
        raw = Image.open(npc_src).convert("RGBA")
        for role, col in NPC_ROLES:
            out_png = os.path.join(CLEAN_DIR, f"npc_{role}.png")
            _build_npc_png(raw, col, out_png)
            write_tres(f"npc_{role}", f"res://assets/spritesheets/characters/clean/npc_{role}.png")
        print(f"  {len(NPC_ROLES)} NPC-Rollen")

    roles = {
        "player": "res://resources/characters/lucas_frames.tres",
        "player_f": "res://resources/characters/dawn_frames.tres",
        "rival": "res://resources/characters/barry_frames.tres",
        "rival_boy": "res://resources/characters/barry_frames.tres",
        "rival_girl": "res://resources/characters/dawn_frames.tres",
        "professor": "res://resources/characters/npc_professor_frames.tres",
        "npc_default": "res://resources/characters/npc_villager_m_frames.tres",
    }
    for role, _c in NPC_ROLES:
        roles["npc_" + role] = f"res://resources/characters/npc_{role}_frames.tres"
    os.makedirs(RES_DIR, exist_ok=True)
    json.dump(roles, open(os.path.join(RES_DIR, "roles.json"), "w", encoding="utf-8"), indent=1)
    print("  roles.json geschrieben")


if __name__ == "__main__":
    main()
