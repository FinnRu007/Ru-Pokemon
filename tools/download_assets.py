#!/usr/bin/env python3
"""
Automatischer Asset-Download fuer Ru-Pokemon.

Zieht Sprites / Icons / Cries / Typ-Symbole / (best effort) Tilesets, UI, Fonts und
BGM aus dem Netz und legt sie in die richtigen assets/-Ordner. Idempotent: bereits
vorhandene Dateien werden uebersprungen.

    python tools/download_assets.py                 # alles
    python tools/download_assets.py --list          # nur auflisten
    python tools/download_assets.py --only pokemon,cries
    python tools/download_assets.py --pokemon-limit 50 --bgm-limit 10
    python tools/download_assets.py --dry-run

Hinweis Recht: Alle Inhalte gehoeren Nintendo / den jeweiligen Rechteinhabern.
Nur privater Gebrauch. Spriters-Resource / khinsider sind "best effort" – wenn ihr
Anti-Bot-Schutz greift, bricht NUR dieser Teil ab, der Rest laeuft weiter.
"""
import argparse, io, json, os, re, sys, time, urllib.parse, urllib.request, urllib.error, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = lambda *p: os.path.join(ROOT, "assets", *p)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36"

DIRS = [
    A("spritesheets", "characters"), A("spritesheets", "pokemon", "front"),
    A("spritesheets", "pokemon", "back"), A("spritesheets", "pokemon", "icons"),
    A("spritesheets", "tilesets"), A("spritesheets", "ui"), A("spritesheets", "types"),
    A("fonts"), A("audio", "bgm"), A("audio", "sfx"), A("audio", "cries"),
]

manifest = {"downloaded": [], "skipped": [], "failed": []}


# ---------------------------------------------------------------- HTTP

def _get(url, referer=None, tries=4):
    headers = {"User-Agent": UA, "Accept": "*/*"}
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    last = None
    for i in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                return r.read(), r.geturl()
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (404, 403, 410):
                break
            time.sleep(1.5 * (i + 1))
        except Exception as e:
            last = e
            time.sleep(1.5 * (i + 1))
    raise last if last else RuntimeError(url)


def save(url, dest, referer=None):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        manifest["skipped"].append(os.path.relpath(dest, ROOT))
        return "skip"
    try:
        data, _ = _get(url, referer)
        if not data:
            raise RuntimeError("leer")
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as f:
            f.write(data)
        manifest["downloaded"].append(os.path.relpath(dest, ROOT))
        return "ok"
    except Exception as e:
        manifest["failed"].append({"url": url, "dest": os.path.relpath(dest, ROOT), "err": str(e)})
        return "fail"


def gh_api(url):
    data, _ = _get(url)
    return json.loads(data)


# ---------------------------------------------------------------- Jobs

def job_pokemon(limit):
    """Gen-4 (Platin) Front/Back-Sprites aus dem PokeAPI/sprites-Repo."""
    base = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iv/platinum"
    n = min(limit, 493)
    print(f"  Pokémon-Sprites 1..{n} (front+back) ...")
    ok = 0
    for i in range(1, n + 1):
        r1 = save(f"{base}/{i}.png", A("spritesheets", "pokemon", "front", f"{i}.png"))
        r2 = save(f"{base}/back/{i}.png", A("spritesheets", "pokemon", "back", f"{i}.png"))
        ok += (r1 in ("ok", "skip")) + (r2 in ("ok", "skip"))
        if i % 50 == 0:
            print(f"    ... {i}")
    print(f"    {ok} Dateien vorhanden")


def job_icons(limit):
    """Box-/Menue-Icons (pokesprite, gen7/8-Stil) nach name_en aus pokemon.json."""
    pj = os.path.join(ROOT, "data", "generated", "pokemon.json")
    if not os.path.exists(pj):
        print("  icons: data/generated/pokemon.json fehlt – erst Modul-D-Import laufen lassen")
        return
    mons = json.load(open(pj, encoding="utf-8"))
    order = sorted(mons.values(), key=lambda m: m.get("dex", 9999))[:limit]
    base = "https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular"
    print(f"  Menue-Icons ({len(order)}) ...")
    for m in order:
        slug = m["name_en"]
        save(f"{base}/{slug}.png", A("spritesheets", "pokemon", "icons", f"{m['dex']:03d}_{slug}.png"))


def job_cries(limit):
    base = "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy"
    n = min(limit, 493)
    print(f"  Cries 1..{n} ...")
    for i in range(1, n + 1):
        save(f"{base}/{i}.ogg", A("audio", "cries", f"{i}.ogg"))
        if i % 100 == 0:
            print(f"    ... {i}")


def job_types():
    """Typ-Symbole (duiker101/pokemon-type-svg-icons, MIT)."""
    print("  Typ-Symbole ...")
    try:
        entries = gh_api("https://api.github.com/repos/duiker101/pokemon-type-svg-icons/contents/icons")
    except Exception as e:
        manifest["failed"].append({"url": "type-svg-icons", "err": str(e)})
        print("    fehlgeschlagen:", e)
        return
    for e in entries:
        if e["name"].endswith(".svg"):
            save(e["download_url"], A("spritesheets", "types", e["name"]))


def job_github_dir(name, repo, path, dest, exts):
    """Generisch: alle passenden Dateien eines GitHub-Verzeichnisses holen."""
    print(f"  {name}: {repo}/{path} ...")
    api = f"https://api.github.com/repos/{repo}/contents/{path}"
    try:
        entries = gh_api(api)
    except Exception as e:
        manifest["failed"].append({"url": api, "err": str(e)})
        print(f"    (uebersprungen: {e})  –  Repo evtl. umbenannt/privat")
        return
    if not isinstance(entries, list):
        print(f"    (uebersprungen: {entries})")
        return
    for e in entries:
        if e["type"] == "file" and e["name"].lower().endswith(tuple(exts)):
            save(e["download_url"], os.path.join(dest, e["name"]))
        elif e["type"] == "dir":
            job_github_dir(name, repo, e["path"], os.path.join(dest, e["name"]), exts)


SR = "https://www.spriters-resource.com"
SR_SECTION = "/ds_dsi/pokemonplatinum"

def job_spriters(assets):
    """Sheets von spriters-resource.com. 2 Schritte: Asset-Seite -> CDN-PNG.
    assets: Liste (asset_id, dest_sub, dateiname)."""
    print("  Spriters-Resource Sheets ...")
    for aid, dest_sub, fname in assets:
        dest = A("spritesheets", dest_sub, fname + ".png")
        if os.path.exists(dest) and os.path.getsize(dest) > 0:
            manifest["skipped"].append(os.path.relpath(dest, ROOT))
            continue
        page_url = f"{SR}{SR_SECTION}/asset/{aid}/"
        try:
            html, _ = _get(page_url, tries=3)
            m = re.search(rb'/media/assets/\d+/\d+\.png[^"\']*', html)
            if not m:
                raise RuntimeError("kein /media/assets-Link auf der Seite")
            png_url = SR + m.group(0).decode()
            data, _ = _get(png_url, referer=page_url, tries=3)
            if data[:8] != b"\x89PNG\r\n\x1a\n":
                raise RuntimeError("Antwort ist kein PNG")
            p = A("spritesheets", dest_sub, fname + ".png")
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, "wb") as f:
                f.write(data)
            manifest["downloaded"].append(os.path.relpath(p, ROOT))
            print(f"    {fname} ({aid}) -> {dest_sub}/  ({len(data)} B)")
        except Exception as e:
            manifest["failed"].append({"url": page_url, "err": str(e)})
            print(f"    {fname} ({aid}) fehlgeschlagen: {e}")


def _unzip(data, dest):
    z = zipfile.ZipFile(io.BytesIO(data))
    os.makedirs(dest, exist_ok=True)
    for m in z.namelist():
        if m.endswith("/"):
            continue
        target = os.path.join(dest, os.path.basename(m))
        with z.open(m) as src, open(target, "wb") as out:
            out.write(src.read())


def job_khinsider(album_url, limit):
    """Best effort: BGM-MP3s von khinsider."""
    print(f"  khinsider BGM (best effort, max {limit}) ...")
    try:
        html, final = _get(album_url, tries=2)
        html = html.decode("utf-8", "ignore")
    except Exception as e:
        manifest["failed"].append({"url": album_url, "err": str(e)})
        print("    Albumseite nicht erreichbar:", e)
        return
    base = "https://downloads.khinsider.com"
    tracks = []
    for m in re.finditer(r'href="(/game-soundtracks/album/[^"]+?\.mp3)"', html):
        u = m.group(1)
        if u not in tracks:
            tracks.append(u)
    print(f"    {len(tracks)} Tracks gefunden")
    for i, t in enumerate(tracks[:limit]):
        try:
            page, _ = _get(base + t, referer=final, tries=2)
            page = page.decode("utf-8", "ignore")
            dl = re.search(r'href="(https?://[^"]+?\.mp3)"', page)
            if not dl:
                raise RuntimeError("kein Direktlink")
            name = urllib.parse.unquote(os.path.basename(t))
            name = re.sub(r'^\d+\.?\s*', "", name).strip()
            save(dl.group(1), A("audio", "bgm", f"{i + 1:02d}_{name}"), referer=base + t)
        except Exception as e:
            manifest["failed"].append({"url": t, "err": str(e)})
        time.sleep(0.3)


# ---------------------------------------------------------------- main

ALL_JOBS = {
    "pokemon": lambda a: job_pokemon(a.pokemon_limit),
    "icons":   lambda a: job_icons(a.pokemon_limit),
    "cries":   lambda a: job_cries(a.pokemon_limit),
    "types":   lambda a: job_types(),
    "characters": lambda a: (job_spriters([
        ("47489", "characters", "lucas"),
        ("47488", "characters", "dawn"),
        ("47490", "characters", "barry"),
        ("25791", "characters", "npcs"),
        ("25790", "characters", "gym_leaders"),
    ]) if not a.no_spriters else None, job_slice()),
    "trainers": lambda a: (None if a.no_spriters else job_spriters([
        ("18524", "trainers", "trainers_front"),
        ("151090", "trainers", "trainers_back"),
        ("18526", "trainers", "trainer_vs_faces"),
    ])),
    "tilesets": lambda a: job_make_tileset(),
    "ui":       lambda a: (None if a.no_spriters else job_spriters([
        ("18507", "ui", "text_box_styles"),
        ("20099", "ui", "battle_gui"),
        ("18502", "ui", "battle_backgrounds"),
        ("113227", "ui", "signboards"),
        ("23525", "ui", "bag"),
    ])),
    "fonts":    lambda a: job_github_dir("Fonts", "PokeAPI/api-data", "NOPE", A("fonts"), (".ttf",)) if False else _fonts(),
    "bgm":      lambda a: (None if a.no_khinsider else job_khinsider(
        "https://downloads.khinsider.com/game-soundtracks/album/pokemon-platinum", a.bgm_limit)),
    "slice": lambda a: job_slice(),
    "sfx":      lambda a: (None if a.no_spriters else print("  SFX: bitte manuell von sounds-resource.com/ds_dsi/pokemonplatinum/")),
}


def job_make_tileset():
    """Kein echtes Platin-Tileset frei verfuegbar -> sauberes DS-Stil-Tileset erzeugen."""
    print("  Tileset: erzeuge assets/spritesheets/tilesets/overworld.png ...")
    try:
        import subprocess
        subprocess.run([sys.executable, os.path.join(ROOT, "tools", "make_tileset.py")], check=True)
        manifest["downloaded"].append("assets/spritesheets/tilesets/overworld.png (generiert)")
    except Exception as e:
        manifest["failed"].append({"url": "make_tileset.py", "err": str(e)})
        print("    fehlgeschlagen:", e)


def job_slice():
    """Character-Sheets in Godot-SpriteFrames zerlegen (tools/slice_sprites.py)."""
    print("  Slicing: resources/characters/*.tres ...")
    try:
        import subprocess
        subprocess.run([sys.executable, os.path.join(ROOT, "tools", "slice_sprites.py")], check=True)
        manifest["downloaded"].append("resources/characters/*.tres (geschnitten)")
    except Exception as e:
        manifest["failed"].append({"url": "slice_sprites.py", "err": str(e)})
        print("    fehlgeschlagen:", e)


def _fonts():
    """Freie Pixel-Fonts als DS-Ersatz (bis echte Pokémon-Font vorliegt)."""
    print("  Pixel-Fonts (frei) ...")
    cand = [
        ("https://raw.githubusercontent.com/mrmax1998/pokemon-font/master/pokemon-font.ttf", "pokemon-font.ttf"),
        ("https://raw.githubusercontent.com/nfrasser/monogram/master/monogram-extended.ttf", "monogram-extended.ttf"),
        ("https://github.com/idleberg/Pixel-UI/raw/master/fonts/pixel.ttf", "pixel.ttf"),
    ]
    got = 0
    for url, name in cand:
        if save(url, A("fonts", name)) in ("ok", "skip"):
            got += 1
    if got == 0:
        print("    Keine der Kandidaten-Fonts erreichbar – bitte eine .ttf manuell nach assets/fonts/ legen")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="Kommagetrennt: " + ",".join(ALL_JOBS))
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--pokemon-limit", type=int, default=493)
    ap.add_argument("--bgm-limit", type=int, default=30)
    ap.add_argument("--no-spriters", action="store_true", help="Spriters-Resource ueberspringen")
    ap.add_argument("--no-khinsider", action="store_true", help="khinsider ueberspringen")
    args = ap.parse_args()

    for d in DIRS:
        os.makedirs(d, exist_ok=True)

    jobs = [j.strip() for j in args.only.split(",") if j.strip()] or list(ALL_JOBS)
    if args.list:
        print("Verfuegbare Jobs:", ", ".join(ALL_JOBS))
        print("Ausgewaehlt:", ", ".join(jobs))
        return
    if args.dry_run:
        print("DRY RUN – wuerde ausfuehren:", ", ".join(jobs))
        return

    print("== Ru-Pokemon Asset-Download ==")
    for name in jobs:
        if name not in ALL_JOBS:
            print(f"!! unbekannter Job: {name}")
            continue
        print(f"[{name}]")
        try:
            ALL_JOBS[name](args)
        except Exception as e:
            print(f"  JOB-FEHLER {name}: {e}")

    mpath = os.path.join(ROOT, "assets", "ASSET_MANIFEST.json")
    json.dump(manifest, open(mpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("\n== Zusammenfassung ==")
    print(f"  neu geladen : {len(manifest['downloaded'])}")
    print(f"  uebersprungen: {len(manifest['skipped'])} (schon da)")
    print(f"  fehlgeschlagen: {len(manifest['failed'])}")
    if manifest["failed"]:
        print("  -> Details in assets/ASSET_MANIFEST.json")
        print("  -> Fehlende Sheets ggf. manuell laden (Links in docs/ASSETS.md), dann Godot neu oeffnen.")
    print("\nDanach: Godot einmal oeffnen (importiert automatisch).")


if __name__ == "__main__":
    main()
