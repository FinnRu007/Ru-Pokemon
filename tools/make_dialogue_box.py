#!/usr/bin/env python3
"""
Erzeugt eine eigene, an Pokémon Platin angelehnte Dialogbox-Grafik (9-Slice-
freundlich) – reine prozedurale Pixel-Art, kein Asset-Rip. Ausgabe:
  assets/ui/dialogue_box.png   (Haupt-Textbox, abgerundete Ecken, blauer Rahmen)
  assets/ui/dialogue_box.json  (9-Slice-Margins fuer StyleBoxTexture)
  assets/ui/name_tag.png       (kleines Namensschild-Panel für den Sprecher)
  assets/ui/choice_box.png     (Panel fuer Auswahl-Buttons, gleicher Stil)
  assets/ui/arrow_indicator.png (kleiner "weiter"-Pfeil, blinkt/hüpft im Spiel)

Wird von tools/download_assets.py nicht benötigt (kein Download) – einfach
direkt ausführen: `python tools/make_dialogue_box.py`.
"""
import json, os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "assets", "ui")
os.makedirs(OUT_DIR, exist_ok=True)

# Palette (eigene Interpretation des Gen4-Textbox-Looks: dunkles Navy aussen,
# mittleres Blau, cremeweisser Innenraum, hellblauer Glanzstreifen oben).
NAVY = (32, 40, 88, 255)
BLUE = (72, 104, 200, 255)
BLUE_LIGHT = (144, 176, 240, 255)
CREAM = (255, 252, 240, 255)
CREAM_SHADE = (232, 226, 204, 255)


def rounded_box(size, radius, layers):
    """layers: Liste von (inset_px, farbe) von aussen nach innen."""
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for inset, color in layers:
        r = max(0, radius - inset)
        draw.rounded_rectangle([inset, inset, w - 1 - inset, h - 1 - inset], radius=r, fill=color)
    return img


def make_main_box():
    w, h = 96, 64
    img = rounded_box((w, h), 14, [
        (0, NAVY),
        (4, BLUE),
        (7, CREAM),
    ])
    draw = ImageDraw.Draw(img)
    # Glanzstreifen oben (leicht hellerer Rand innen, Platin-typisch).
    draw.rounded_rectangle([8, 8, w - 9, 14], radius=5, fill=CREAM_SHADE)
    img.save(os.path.join(OUT_DIR, "dialogue_box.png"))
    # 9-Slice-Margins (wie viele Randpixel nicht gestreckt werden).
    with open(os.path.join(OUT_DIR, "dialogue_box.json"), "w", encoding="utf-8") as f:
        json.dump({"margin": 16}, f)


def make_name_tag():
    w, h = 64, 24
    img = rounded_box((w, h), 10, [
        (0, NAVY),
        (3, BLUE),
        (6, CREAM),
    ])
    img.save(os.path.join(OUT_DIR, "name_tag.png"))


def make_choice_box():
    w, h = 64, 40
    img = rounded_box((w, h), 10, [
        (0, NAVY),
        (3, BLUE_LIGHT),
        (6, CREAM),
    ])
    img.save(os.path.join(OUT_DIR, "choice_box.png"))


def make_arrow():
    w, h = 16, 16
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.polygon([(2, 3), (14, 3), (8, 13)], fill=NAVY)
    draw.polygon([(3, 3), (13, 3), (8, 11)], fill=BLUE)
    img.save(os.path.join(OUT_DIR, "arrow_indicator.png"))


def main():
    make_main_box()
    make_name_tag()
    make_choice_box()
    make_arrow()
    print("Dialogbox-Grafiken erzeugt in", OUT_DIR)


if __name__ == "__main__":
    main()
