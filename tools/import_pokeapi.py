#!/usr/bin/env python3
"""
PokeAPI -> data/generated/*.json  (Ru-Pokemon, Gen-4-Regeln)

Holt den kompletten National-Dex Gen 1-4 (#1..493): Basiswerte, Typen, Faehigkeiten,
Level-Lernsaetze (Platin), Entwicklungen, alle referenzierten Attacken.
Deutsche Namen. Ergebnis-Schema passt zu scripts/data + scripts/battle.

Aufruf:  python tools/import_pokeapi.py [max_dex]
"""
import json, os, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "generated")
CACHE = os.path.join(ROOT, ".pokeapi_cache")
API = "https://pokeapi.co/api/v2"
MAX_DEX = int(sys.argv[1]) if len(sys.argv) > 1 else 493
VERSION_GROUPS = ["platinum", "diamond-pearl", "heartgold-soulsilver"]

STAT_MAP = {
    "hp": "hp", "attack": "atk", "defense": "def", "special-attack": "spa",
    "special-defense": "spd", "speed": "spe", "accuracy": "acc", "evasion": "eva",
}
GROWTH_MAP = {
    "slow": "slow", "medium": "medium_fast", "fast": "fast",
    "medium-slow": "medium_slow", "slow-then-very-fast": "erratic",
    "fast-then-very-slow": "fluctuating",
}
GEN4_TYPES = [
    "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
    "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel",
]

os.makedirs(OUT, exist_ok=True)
os.makedirs(CACHE, exist_ok=True)


def get(url):
    if url.startswith("/"):
        url = API + url
    key = url.replace(API, "").strip("/").replace("/", "_").replace("?", "_") + ".json"
    path = os.path.join(CACHE, key)
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    req = urllib.request.Request(url, headers={
        "User-Agent": "Ru-Pokemon-Importer/1.0 (+https://github.com/; educational fan project)",
        "Accept": "application/json",
    })
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read().decode("utf-8"))
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f)
            return data
        except urllib.error.HTTPError as e:
            if e.code in (404, 403) and attempt >= 1:
                raise RuntimeError(f"{e.code} {url}")
            time.sleep(2.0 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError("Fehlgeschlagen: " + url)


def de_name(names, fallback):
    for n in names:
        if n["language"]["name"] == "de":
            return n["name"]
    for n in names:
        if n["language"]["name"] == "en":
            return n["name"]
    return fallback


def parse_evolution(chain, out):
    src = chain["species"]["name"]
    for nxt in chain["evolves_to"]:
        det = nxt["evolution_details"][0] if nxt["evolution_details"] else {}
        trig = (det.get("trigger") or {}).get("name", "level-up")
        entry = {"to": nxt["species"]["name"], "trigger": trig}
        if det.get("min_level"):
            entry["min_level"] = det["min_level"]
        if det.get("item"):
            entry["item"] = det["item"]["name"]
        if det.get("held_item"):
            entry["held_item"] = det["held_item"]["name"]
        if det.get("min_happiness"):
            entry["min_happiness"] = det["min_happiness"]
        if det.get("time_of_day"):
            entry["time_of_day"] = det["time_of_day"]
        if det.get("known_move"):
            entry["known_move"] = det["known_move"]["name"]
        if det.get("location"):
            entry["location"] = det["location"]["name"]
        out.setdefault(src, []).append(entry)
        parse_evolution(nxt, out)


def move_effect(mv):
    meta = mv.get("meta") or {}
    target_user = (mv.get("target") or {}).get("name") == "user"
    tgt = "self" if target_user else "opponent"
    out = {}
    crit = meta.get("crit_rate") or 0

    ailment = (meta.get("ailment") or {}).get("name", "none")
    ac = meta.get("ailment_chance") or 0
    stat_changes = mv.get("stat_changes") or []
    sc = meta.get("stat_chance") or 0
    drain = meta.get("drain") or 0
    flinch = meta.get("flinch_chance") or 0
    heal = meta.get("healing") or 0

    amap = {"paralysis": "paralysis", "burn": "burn", "poison": "poison",
            "toxic": "poison", "freeze": "freeze", "sleep": "sleep"}
    if ailment in amap:
        out = {"kind": "status_chance", "status": amap[ailment],
               "chance": ac if ac > 0 else 100}
    elif stat_changes:
        changes = [{"stat": STAT_MAP.get(s["stat"]["name"], s["stat"]["name"]),
                    "stages": s["change"]} for s in stat_changes]
        if 0 < sc < 100:
            out = {"kind": "stat_chance", "chance": sc, "target": tgt, "stat_changes": changes}
        else:
            out = {"kind": "stat", "target": tgt, "stat_changes": changes}
    elif drain > 0:
        out = {"kind": "drain", "ratio": round(drain / 100.0, 3)}
    elif drain < 0:
        out = {"kind": "recoil", "ratio": round(-drain / 100.0, 3)}
    elif heal > 0:
        out = {"kind": "heal", "ratio": round(heal / 100.0, 3)}
    elif flinch > 0:
        out = {"kind": "flinch_chance", "chance": flinch}
    return out, crit


def fetch_species(i):
    return get(f"/pokemon/{i}"), get(f"/pokemon-species/{i}")


def main():
    print(f"Import #1..{MAX_DEX}  (Cache: {CACHE})")
    pokemon, moves_needed, evo_chart = {}, set(), {}
    seen_chains = set()

    with ThreadPoolExecutor(max_workers=16) as ex:
        results = list(ex.map(fetch_species, range(1, MAX_DEX + 1)))

    for poke, spec in results:
        slug = spec["name"]
        stats = {STAT_MAP[s["stat"]["name"]]: s["base_stat"] for s in poke["stats"]}
        types = [t["type"]["name"] for t in sorted(poke["types"], key=lambda x: x["slot"])]

        learnset = {}
        for m in poke["moves"]:
            best = None
            for d in m["version_group_details"]:
                if d["move_learn_method"]["name"] != "level-up":
                    continue
                vg = d["version_group"]["name"]
                if vg in VERSION_GROUPS:
                    rank = VERSION_GROUPS.index(vg)
                    if best is None or rank < best[0]:
                        best = (rank, d["level_learned_at"])
            if best and best[1] > 0:
                learnset.setdefault(str(best[1]), []).append(m["move"]["name"])
                moves_needed.add(m["move"]["name"])
            elif best and best[1] == 0:
                learnset.setdefault("1", []).append(m["move"]["name"])
                moves_needed.add(m["move"]["name"])

        pokemon[slug] = {
            "dex": spec["id"],
            "name": de_name(spec["names"], slug.capitalize()),
            "name_en": slug,
            "types": types,
            "base_stats": stats,
            "abilities": [a["ability"]["name"] for a in poke["abilities"] if not a["is_hidden"]],
            "hidden_ability": next((a["ability"]["name"] for a in poke["abilities"] if a["is_hidden"]), ""),
            "growth_rate": GROWTH_MAP.get(spec["growth_rate"]["name"], "medium_fast"),
            "base_exp": poke.get("base_experience") or 60,
            "catch_rate": spec.get("capture_rate", 45),
            "gender_rate": spec.get("gender_rate", -1),
            "egg_groups": [g["name"] for g in spec.get("egg_groups", [])],
            "height": poke.get("height", 0),
            "weight": poke.get("weight", 0),
            "learnset": {k: learnset[k] for k in sorted(learnset, key=lambda x: int(x))},
        }

        chain_url = spec.get("evolution_chain", {}).get("url")
        if chain_url and chain_url not in seen_chains:
            seen_chains.add(chain_url)
            try:
                parse_evolution(get(chain_url)["chain"], evo_chart)
            except Exception as e:
                print("  Evo-Kette uebersprungen:", e)

    print(f"{len(pokemon)} Pokémon, {len(moves_needed)} Attacken -> hole Attacken ...")

    def fetch_move(name):
        return name, get(f"/move/{name}")

    moves = {}
    with ThreadPoolExecutor(max_workers=16) as ex:
        for name, mv in ex.map(fetch_move, sorted(moves_needed)):
            dc = mv["damage_class"]["name"]  # physical | special | status
            eff, crit = move_effect(mv)
            entry = {
                "name": de_name(mv["names"], name),
                "name_en": name,
                "type": mv["type"]["name"],
                "category": dc,
                "power": mv.get("power") or 0,
                "accuracy": mv.get("accuracy") if mv.get("accuracy") is not None else 100,
                "pp": mv.get("pp") or 5,
                "priority": mv.get("priority", 0),
                "target": (mv.get("target") or {}).get("name", "selected-pokemon"),
            }
            if crit:
                entry["crit_stage"] = crit
            if eff:
                entry["effect"] = eff
            moves[name] = entry

    types_json = build_type_chart()

    _write("pokemon.json", pokemon)
    _write("moves.json", moves)
    _write("types.json", types_json)
    _write("evolutions.json", evo_chart)
    print("Fertig ->", OUT)


def _write(name, obj):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1, sort_keys=True)
    print(f"  {name}: {len(obj)} Eintraege")


def build_type_chart():
    """Gen-4-Typentabelle (17 Typen, kein Fairy; Stahl resistiert Geist & Unlicht)."""
    w = {
        "normal": {"rock": .5, "ghost": 0, "steel": .5},
        "fire": {"fire": .5, "water": .5, "grass": 2, "ice": 2, "bug": 2, "rock": .5, "dragon": .5, "steel": 2},
        "water": {"fire": 2, "water": .5, "grass": .5, "ground": 2, "rock": 2, "dragon": .5},
        "electric": {"water": 2, "electric": .5, "grass": .5, "ground": 0, "flying": 2, "dragon": .5},
        "grass": {"fire": .5, "water": 2, "grass": .5, "poison": .5, "ground": 2, "flying": .5, "bug": .5, "rock": 2, "dragon": .5, "steel": .5},
        "ice": {"fire": .5, "water": .5, "grass": 2, "ice": .5, "ground": 2, "flying": 2, "dragon": 2, "steel": .5},
        "fighting": {"normal": 2, "ice": 2, "poison": .5, "flying": .5, "psychic": .5, "bug": .5, "rock": 2, "ghost": 0, "dark": 2, "steel": 2},
        "poison": {"grass": 2, "poison": .5, "ground": .5, "rock": .5, "ghost": .5, "steel": 0},
        "ground": {"fire": 2, "electric": 2, "grass": .5, "poison": 2, "flying": 0, "bug": .5, "rock": 2, "steel": 2},
        "flying": {"electric": .5, "grass": 2, "fighting": 2, "bug": 2, "rock": .5, "steel": .5},
        "psychic": {"fighting": 2, "poison": 2, "psychic": .5, "dark": 0, "steel": .5},
        "bug": {"fire": .5, "grass": 2, "fighting": .5, "poison": .5, "flying": .5, "psychic": 2, "ghost": .5, "dark": 2, "steel": .5},
        "rock": {"fire": 2, "ice": 2, "fighting": .5, "ground": .5, "flying": 2, "bug": 2, "steel": .5},
        "ghost": {"normal": 0, "psychic": 2, "ghost": 2, "dark": .5, "steel": .5},
        "dragon": {"dragon": 2, "steel": .5},
        "dark": {"fighting": .5, "psychic": 2, "ghost": 2, "dark": .5, "steel": .5},
        "steel": {"fire": .5, "water": .5, "electric": .5, "ice": 2, "rock": 2, "steel": .5},
    }
    return {t: w.get(t, {}) for t in GEN4_TYPES}


if __name__ == "__main__":
    main()
