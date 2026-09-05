#!/usr/bin/env python3
"""
Schneidet aus dem bereits vorhandenen Rip assets/spritesheets/ui/battle_backgrounds.png
(DPPt-Kampfhintergründe, "Ripped by Sunday-Bombs") die Standard-Feld-Kulisse (Tag) +
die beiden Gras-Plattformen (Gegner=klein/fern, Spieler=groß/nah) frei und speichert sie
einzeln unter assets/battle/. Nur für den privaten Gebrauch dieses Projekts (siehe
[[asset-quellen]]/Projektnotizen) – kein neuer Download, nur Zuschnitt vorhandener Dateien.

Koordinaten wurden manuell am Original-Sheet (1536x2016) vermessen.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "spritesheets", "ui", "battle_backgrounds.png")
OUT_DIR = os.path.join(ROOT, "assets", "battle")
os.makedirs(OUT_DIR, exist_ok=True)

CROPS = {
    "bg_field_day.png": (0, 14, 253, 166),
    "platform_enemy_grass.png": (766, 22, 1010, 58),
    "platform_player_grass.png": (768, 60, 1010, 97),
}


def main():
    img = Image.open(SRC)
    for name, box in CROPS.items():
        crop = img.crop(box)
        crop.save(os.path.join(OUT_DIR, name))
        print("gespeichert:", name, crop.size)


if __name__ == "__main__":
    main()
