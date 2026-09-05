#!/usr/bin/env python3
"""
Erzeugt ein sauberes 16x16-Overworld-Tileset im DS/Platin-Stil (eigene Pixel-Art,
kein Rip). Ausgabe:
  assets/spritesheets/tilesets/overworld.png   (Atlas, 8 Spalten)
  assets/spritesheets/tilesets/overworld.json  (Tile-Namen + solide-Flag)

Wird von tools/download_assets.py (Job "tilesets") aufgerufen; kann auch direkt
laufen. Sobald ein echtes Tileset vorliegt, einfach overworld.png ersetzen (gleiche
Rastergröße) – die Map-Logik bleibt.
"""
import json, os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "assets", "spritesheets", "tilesets")
TS = 16
COLS = 8

# Reihenfolge = Tile-Index. name, solid
TILES = [
    ("grass", False), ("grass_tuft", False), ("tall_grass", False), ("path", False),
    ("path_edge", False), ("flowers", False), ("sand", False), ("puddle", False),
    ("tree", True), ("tree_top", True), ("bush", True), ("fence", True),
    ("sign", True), ("rock", True), ("water", True), ("water_edge", True),
    ("ledge", False), ("wall_brick", True), ("wall_plaster", True), ("roof_red", True),
    ("roof_blue", True), ("door", False), ("window", True), ("floor_wood", False),
    ("floor_tile", False), ("carpet", False), ("counter", True), ("table", True),
    ("pc", True), ("stairs", False), ("void", True), ("mat", False),
    ("house_roof", True), ("house_wall", True), ("house_door", False), ("shop_roof", True),
    ("center_roof", True), ("lab_wall", True), ("tree_tall", True), ("flower_bed", False),
    ("cave_floor", False), ("cave_wall", True), ("cave_rubble", False), ("boulder", True),
    ("gym_wall", True), ("gym_roof", True), ("mine_cart", True), ("ore", False),
    ("tv", True), ("bed", True), ("dresser", True), ("roof_green", True),
    ("bookshelf", True), ("stairs_up", False), ("rug", False),
]

P = {
    "grass_a": (104, 168, 88), "grass_b": (80, 144, 64), "grass_c": (128, 184, 104),
    "path_a": (216, 192, 152), "path_b": (192, 160, 112), "sand": (224, 208, 152),
    "tree_a": (56, 96, 48), "tree_b": (74, 124, 64), "tree_trunk": (110, 78, 48),
    "water_a": (104, 144, 240), "water_b": (72, 112, 216), "water_c": (144, 184, 248),
    "brick_a": (200, 120, 96), "brick_b": (168, 88, 72), "plaster": (224, 216, 200),
    "roof_r": (208, 96, 80), "roof_r2": (168, 64, 56), "roof_b": (96, 128, 200), "roof_b2": (64, 96, 168),
    "wood_a": (176, 128, 88), "wood_b": (152, 104, 68), "tile_a": (208, 208, 216), "tile_b": (176, 176, 192),
    "carpet": (192, 80, 88), "dark": (48, 48, 56), "flower_r": (232, 96, 112), "flower_y": (248, 224, 120),
    "cave_a": (96, 84, 76), "cave_b": (76, 66, 60), "cave_c": (120, 106, 96),
    "ore_a": (150, 170, 190), "ore_b": (200, 140, 90),
    "roof_g": (72, 148, 96), "roof_g2": (48, 112, 72), "screen": (120, 200, 220),
}


def checker(d, c1, c2):
    for y in range(TS):
        for x in range(TS):
            d.point((x, y), c1 if (x + y) % 2 == 0 else c2)


def fill(d, c):
    d.rectangle([0, 0, TS - 1, TS - 1], fill=c)


def draw_tile(name):
    img = Image.new("RGBA", (TS, TS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if name in ("grass",):
        checker(d, P["grass_a"], P["grass_b"])
    elif name == "grass_tuft":
        checker(d, P["grass_a"], P["grass_b"])
        for px in (4, 8, 11):
            d.line([px, 11, px, 8], fill=P["grass_c"])
    elif name == "tall_grass":
        checker(d, P["grass_b"], (64, 120, 52))
        # Grasbüschel unregelmäßig
        blades = [(2, 13), (5, 15), (4, 9), (8, 14), (7, 10), (11, 15), (10, 11), (13, 13), (14, 9), (1, 15)]
        for bx, by in blades:
            d.line([bx, by, bx, by - 5], fill=P["grass_a"])
            d.line([bx - 1, by, bx - 1, by - 3], fill=P["grass_c"])
            d.line([bx + 1, by, bx + 1, by - 3], fill=P["grass_c"])
        d.line([0, 15, TS - 1, 15], fill=P["grass_a"])
    elif name == "path":
        checker(d, P["path_a"], P["path_b"])
    elif name == "path_edge":
        checker(d, P["path_a"], P["path_b"])
        d.line([0, 0, TS - 1, 0], fill=P["grass_b"])
    elif name == "flowers":
        checker(d, P["grass_a"], P["grass_b"])
        d.point((4, 5), P["flower_r"]); d.point((11, 9), P["flower_y"]); d.point((7, 12), P["flower_r"])
    elif name == "sand":
        checker(d, P["sand"], P["path_b"])
    elif name == "puddle":
        checker(d, P["grass_a"], P["grass_b"])
        d.ellipse([3, 5, 12, 11], fill=P["water_c"])
    elif name in ("tree", "tree_top", "bush"):
        # transparenter Hintergrund (wird als Billboard genutzt)
        if name == "bush":
            d.ellipse([1, 5, 14, 15], fill=P["tree_b"]); d.ellipse([3, 7, 12, 14], fill=P["tree_a"])
        else:
            d.rectangle([6, 11, 9, 15], fill=P["tree_trunk"])
            d.ellipse([0, 0, 15, 13], fill=P["tree_b"]); d.ellipse([2, 1, 13, 11], fill=P["tree_a"])
            d.ellipse([4, 3, 9, 7], fill=P["grass_c"])
    elif name == "fence":
        d.rectangle([0, 6, TS - 1, 8], fill=P["wood_b"])
        d.rectangle([3, 3, 5, 14], fill=P["wood_a"]); d.rectangle([10, 3, 12, 14], fill=P["wood_a"])
    elif name == "sign":
        d.rectangle([2, 1, 13, 9], fill=P["wood_a"]); d.rectangle([3, 2, 12, 8], fill=P["wood_b"])
        d.rectangle([7, 9, 8, 15], fill=P["tree_trunk"])
    elif name == "rock":
        d.ellipse([2, 5, 14, 15], fill=(150, 150, 150)); d.ellipse([4, 7, 11, 13], fill=(190, 190, 190))
    elif name in ("water", "water_edge"):
        checker(d, P["water_a"], P["water_b"])
        d.line([2, 4, 6, 4], fill=P["water_c"]); d.line([9, 10, 13, 10], fill=P["water_c"])
        if name == "water_edge":
            d.line([0, 0, TS - 1, 0], fill=P["sand"])
    elif name == "ledge":
        d.rectangle([0, 9, TS - 1, 15], fill=P["path_b"])
        d.line([0, 9, TS - 1, 9], fill=P["dark"])
        for x in range(1, TS, 4):
            d.line([x, 11, x, 14], fill=P["path_a"])
    elif name in ("wall_brick",):
        fill(d, P["brick_a"])
        for y in range(0, TS, 4):
            d.line([0, y, TS - 1, y], fill=P["brick_b"])
        for y in range(0, TS, 8):
            for x in range(0, TS, 8):
                d.line([x, y, x, y + 3], fill=P["brick_b"])
        for x in range(4, TS, 8):
            for y in range(4, TS, 8):
                d.line([x, y, x, y + 3], fill=P["brick_b"])
    elif name == "wall_plaster":
        fill(d, P["plaster"])
        d.rectangle([0, 0, TS - 1, TS - 1], outline=P["brick_b"])
    elif name == "roof_red":
        fill(d, P["roof_r"])
        for y in range(0, TS, 5):
            d.line([0, y, TS - 1, y], fill=P["roof_r2"])
    elif name == "roof_blue":
        fill(d, P["roof_b"])
        for y in range(0, TS, 5):
            d.line([0, y, TS - 1, y], fill=P["roof_b2"])
    elif name == "door":
        d.rectangle([3, 1, 12, 15], fill=P["wood_b"]); d.rectangle([4, 2, 11, 15], fill=P["wood_a"])
        d.ellipse([9, 8, 11, 10], fill=P["tile_b"])
    elif name == "window":
        d.rectangle([2, 2, 13, 12], fill=P["water_c"]); d.rectangle([2, 2, 13, 12], outline=P["plaster"])
        d.line([7, 2, 7, 12], fill=P["plaster"]); d.line([2, 7, 13, 7], fill=P["plaster"])
    elif name == "floor_wood":
        fill(d, P["wood_a"])
        for x in range(0, TS, 4):
            d.line([x, 0, x, TS - 1], fill=P["wood_b"])
    elif name == "floor_tile":
        checker(d, P["tile_a"], P["tile_b"])
    elif name == "carpet":
        fill(d, P["carpet"])
        d.rectangle([0, 0, TS - 1, TS - 1], outline=(230, 200, 120))
    elif name == "counter":
        fill(d, P["floor_tile" and "wood_b"] if False else P["wood_b"])
        d.rectangle([0, 0, TS - 1, 6], fill=P["wood_a"])
    elif name == "table":
        fill(d, P["wood_a"])
        d.rectangle([1, 1, 14, 14], fill=P["wood_b"])
    elif name == "pc":
        fill(d, P["tile_b"])
        d.rectangle([2, 1, 13, 10], fill=P["dark"]); d.rectangle([3, 2, 12, 9], fill=P["water_a"])
    elif name == "stairs":
        fill(d, P["tile_b"])
        for y in range(2, TS, 4):
            d.line([0, y, TS - 1, y], fill=P["dark"])
    elif name == "void":
        fill(d, P["dark"])
    elif name == "mat":
        fill(d, P["carpet"])
        d.rectangle([2, 4, 13, 11], fill=(200, 160, 90))
    elif name in ("house_roof", "shop_roof", "center_roof"):
        col = {"house_roof": P["roof_r"], "shop_roof": P["roof_b"], "center_roof": (224, 96, 96)}[name]
        col2 = {"house_roof": P["roof_r2"], "shop_roof": P["roof_b2"], "center_roof": (176, 64, 64)}[name]
        d.polygon([(0, 15), (2, 6), (13, 6), (15, 15)], fill=col)
        d.polygon([(0, 15), (2, 6), (13, 6), (15, 15)], outline=col2)
        for x in range(2, 14, 3):
            d.line([x, 7, x - 1, 14], fill=col2)
    elif name in ("house_wall", "lab_wall"):
        base = P["plaster"] if name == "house_wall" else (206, 214, 224)
        fill(d, base)
        d.rectangle([0, 0, TS - 1, TS - 1], outline=P["brick_b"])
        d.rectangle([2, 3, 6, 8], fill=P["water_c"]); d.rectangle([2, 3, 6, 8], outline=base)
        d.rectangle([9, 3, 13, 8], fill=P["water_c"]); d.rectangle([9, 3, 13, 8], outline=base)
    elif name == "house_door":
        fill(d, P["plaster"])
        d.rectangle([4, 3, 11, 15], fill=P["wood_b"]); d.rectangle([5, 4, 10, 15], fill=P["wood_a"])
        d.ellipse([8, 9, 9, 10], fill=P["tile_b"])
    elif name == "tree_tall":
        d.rectangle([6, 12, 9, 15], fill=P["tree_trunk"])
        d.ellipse([1, 2, 14, 14], fill=P["tree_b"])
        d.ellipse([2, 0, 13, 10], fill=P["tree_a"])
        d.ellipse([5, 3, 10, 8], fill=P["tree_b"])
    elif name == "flower_bed":
        checker(d, P["grass_a"], P["grass_b"])
        for fx, fy in [(3, 4), (8, 3), (12, 6), (5, 10), (10, 11)]:
            d.point((fx, fy), P["flower_r"]); d.point((fx + 1, fy), P["flower_y"])
    elif name == "roof_green":
        d.polygon([(0, 15), (2, 4), (13, 4), (15, 15)], fill=P["roof_g"])
        d.polygon([(0, 15), (2, 4), (13, 4), (15, 15)], outline=P["roof_g2"])
        for x in range(2, 14, 3):
            d.line([x, 5, x - 1, 14], fill=P["roof_g2"])
    elif name == "tv":
        d.rectangle([1, 2, 14, 11], fill=(50, 46, 42))
        d.rectangle([3, 4, 12, 9], fill=P["screen"])
        d.rectangle([5, 11, 10, 15], fill=(40, 36, 32))
    elif name == "bed":
        d.rectangle([1, 5, 14, 15], fill=(220, 220, 232))
        d.rectangle([1, 5, 14, 8], fill=(232, 96, 112))
        d.rectangle([1, 1, 14, 6], fill=(210, 60, 76))
    elif name == "dresser":
        d.rectangle([1, 3, 14, 15], fill=P["wood_b"])
        d.line([1, 8, 14, 8], fill=P["wood_a"]); d.line([1, 12, 14, 12], fill=P["wood_a"])
        d.rectangle([3, 5, 5, 6], fill=P["dark"]); d.rectangle([10, 5, 12, 6], fill=P["dark"])
    elif name == "bookshelf":
        d.rectangle([1, 1, 14, 15], fill=P["wood_b"])
        for y in range(2, 15, 4):
            d.line([1, y, 14, y], fill=P["wood_a"])
            for x in range(2, 14, 2):
                d.rectangle([x, y + 1, x + 1, y + 3], fill=[P["flower_r"], P["water_a"], P["tree_a"]][x % 3])
    elif name == "stairs_up":
        checker(d, P["path_a"], P["path_b"])
        for y in range(0, TS, 3):
            d.line([0, y, TS - 1, y], fill=P["dark"])
    elif name == "rug":
        fill(d, P["carpet"])
        d.rectangle([1, 1, 14, 14], outline=(230, 200, 120))
        d.rectangle([4, 4, 11, 11], outline=(230, 200, 120))
    elif name == "cave_floor":
        checker(d, P["cave_a"], P["cave_b"])
    elif name == "cave_wall":
        fill(d, P["cave_c"])
        for i in range(6):
            x = (i * 7 + 3) % TS
            y = (i * 5 + 2) % TS
            d.line([x, y, x + 3, y + 4], fill=P["cave_b"])
        d.rectangle([0, 0, TS - 1, TS - 1], outline=P["cave_b"])
    elif name == "cave_rubble":
        checker(d, P["cave_a"], P["cave_b"])
        d.ellipse([3, 9, 8, 14], fill=P["cave_c"]); d.ellipse([9, 6, 13, 10], fill=P["cave_c"])
    elif name == "boulder":
        d.ellipse([1, 4, 15, 15], fill=(120, 106, 96)); d.ellipse([3, 6, 12, 13], fill=(150, 134, 120))
        d.line([5, 8, 7, 8], fill=P["cave_b"]); d.line([8, 10, 11, 10], fill=P["cave_b"])
    elif name == "gym_wall":
        fill(d, (196, 108, 92))
        for y in range(0, TS, 4):
            d.line([0, y, TS - 1, y], fill=(160, 80, 68))
        d.rectangle([0, 0, TS - 1, TS - 1], outline=(140, 64, 54))
    elif name == "gym_roof":
        d.polygon([(0, 15), (2, 4), (13, 4), (15, 15)], fill=(120, 60, 52))
        d.polygon([(0, 15), (2, 4), (13, 4), (15, 15)], outline=(90, 40, 34))
        d.rectangle([5, 0, 10, 5], fill=(220, 200, 90))
    elif name == "mine_cart":
        d.rectangle([2, 6, 13, 13], fill=(90, 70, 50)); d.rectangle([3, 7, 12, 12], fill=(60, 46, 32))
        d.ellipse([2, 13, 5, 15], fill=P["dark"]); d.ellipse([10, 13, 13, 15], fill=P["dark"])
    elif name == "ore":
        checker(d, P["cave_a"], P["cave_b"])
        for fx, fy, c in [(4, 5, P["ore_a"]), (9, 8, P["ore_b"]), (6, 11, P["ore_a"]), (11, 4, P["ore_b"])]:
            d.point((fx, fy), c); d.point((fx + 1, fy), c)
    else:
        fill(d, (255, 0, 255))
    return img


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    rows = (len(TILES) + COLS - 1) // COLS
    atlas = Image.new("RGBA", (COLS * TS, rows * TS), (0, 0, 0, 0))
    meta = {"tile_size": TS, "columns": COLS, "rows": rows, "tiles": []}
    for i, (name, solid) in enumerate(TILES):
        cx, cy = (i % COLS) * TS, (i // COLS) * TS
        atlas.paste(draw_tile(name), (cx, cy))
        meta["tiles"].append({"index": i, "name": name, "solid": solid})
    atlas.save(os.path.join(OUT_DIR, "overworld.png"))
    json.dump(meta, open(os.path.join(OUT_DIR, "overworld.json"), "w", encoding="utf-8"), indent=1)
    print(f"  overworld.png ({atlas.width}x{atlas.height}, {len(TILES)} Tiles) + overworld.json")


if __name__ == "__main__":
    main()
