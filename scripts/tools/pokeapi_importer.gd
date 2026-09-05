extends SceneTree
## PokéAPI -> res://data/generated/*.json  (Godot-native Alternative zu
## tools/import_pokeapi.py – gleiche Ausgabe, gleiches Schema).
##
## Aufruf (im Projektordner):
##   Godot --headless --path . -s res://scripts/tools/pokeapi_importer.gd -- 151
## Ohne Argument werden #1..493 (National-Dex Gen 1-4) importiert.
## Antworten werden in res://.pokeapi_cache/ zwischengespeichert (erneuter Lauf = schnell).

const API := "https://pokeapi.co/api/v2"
const OUT := "res://data/generated/"
const CACHE := "res://.pokeapi_cache/"
const VERSION_GROUPS := ["platinum", "diamond-pearl", "heartgold-soulsilver"]

const STAT_MAP := {
	"hp": "hp", "attack": "atk", "defense": "def", "special-attack": "spa",
	"special-defense": "spd", "speed": "spe", "accuracy": "acc", "evasion": "eva",
}
const GROWTH_MAP := {
	"slow": "slow", "medium": "medium_fast", "fast": "fast", "medium-slow": "medium_slow",
	"slow-then-very-fast": "erratic", "fast-then-very-slow": "fluctuating",
}

var _http: HTTPRequest

func _initialize() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUT))
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(CACHE))
	_http = HTTPRequest.new()
	root.add_child(_http)

	var args := OS.get_cmdline_user_args()
	var max_dex := int(args[0]) if args.size() > 0 else 493
	print("Import #1..%d" % max_dex)

	var species := {}
	var moves_needed := {}
	var evolutions := {}
	var seen_chains := {}

	for i in range(1, max_dex + 1):
		var poke: Dictionary = await _get("/pokemon/%d" % i)
		var spec: Dictionary = await _get("/pokemon-species/%d" % i)
		if poke.is_empty() or spec.is_empty():
			continue
		var slug := String(spec.get("name", ""))

		var stats := {}
		for s in poke.get("stats", []):
			stats[STAT_MAP.get(s["stat"]["name"], s["stat"]["name"])] = s["base_stat"]

		var types_arr := []
		var tslots := poke.get("types", []).duplicate()
		tslots.sort_custom(func(a, b): return a["slot"] < b["slot"])
		for t in tslots:
			types_arr.append(t["type"]["name"])

		var learnset := {}
		for m in poke.get("moves", []):
			var best_rank := 99
			var best_lvl := -1
			for d in m["version_group_details"]:
				if d["move_learn_method"]["name"] != "level-up":
					continue
				var vg := String(d["version_group"]["name"])
				var r := VERSION_GROUPS.find(vg)
				if r != -1 and r < best_rank:
					best_rank = r
					best_lvl = int(d["level_learned_at"])
			if best_lvl >= 0:
				var key := str(max(1, best_lvl))
				if not learnset.has(key):
					learnset[key] = []
				learnset[key].append(m["move"]["name"])
				moves_needed[m["move"]["name"]] = true

		var abilities := []
		var hidden := ""
		for a in poke.get("abilities", []):
			if a["is_hidden"]:
				hidden = a["ability"]["name"]
			else:
				abilities.append(a["ability"]["name"])

		species[slug] = {
			"dex": spec["id"],
			"name": _localized(spec.get("names", []), slug.capitalize()),
			"name_en": slug,
			"types": types_arr,
			"base_stats": stats,
			"abilities": abilities,
			"hidden_ability": hidden,
			"growth_rate": GROWTH_MAP.get(spec.get("growth_rate", {}).get("name", ""), "medium_fast"),
			"base_exp": poke.get("base_experience", 60),
			"catch_rate": spec.get("capture_rate", 45),
			"gender_rate": spec.get("gender_rate", -1),
			"egg_groups": poke_egg_groups(spec),
			"height": poke.get("height", 0),
			"weight": poke.get("weight", 0),
			"learnset": _sort_learnset(learnset),
		}

		var chain_url := String(spec.get("evolution_chain", {}).get("url", ""))
		if chain_url != "" and not seen_chains.has(chain_url):
			seen_chains[chain_url] = true
			var chain: Dictionary = await _get(chain_url)
			if not chain.is_empty():
				_walk_evolution(chain.get("chain", {}), evolutions)

		if i % 25 == 0:
			print("  ... #%d" % i)

	print("%d Pokémon, %d Attacken" % [species.size(), moves_needed.size()])

	var moves := {}
	for name in moves_needed.keys():
		var mv: Dictionary = await _get("/move/%s" % name)
		if mv.is_empty():
			continue
		var entry := {
			"name": _localized(mv.get("names", []), name),
			"name_en": name,
			"type": mv["type"]["name"],
			"category": mv["damage_class"]["name"],
			"power": mv.get("power", 0) if mv.get("power") != null else 0,
			"accuracy": mv.get("accuracy", 100) if mv.get("accuracy") != null else 100,
			"pp": mv.get("pp", 5) if mv.get("pp") != null else 5,
			"priority": mv.get("priority", 0),
			"target": mv.get("target", {}).get("name", "selected-pokemon"),
		}
		var eff := _move_effect(mv)
		if eff.has("crit_stage"):
			entry["crit_stage"] = eff["crit_stage"]
			eff.erase("crit_stage")
		if not eff.is_empty():
			entry["effect"] = eff
		moves[name] = entry

	_write("pokemon.json", species)
	_write("moves.json", moves)
	_write("types.json", _gen4_types())
	_write("evolutions.json", evolutions)
	print("Fertig -> ", OUT)
	quit()

func poke_egg_groups(spec: Dictionary) -> Array:
	var out := []
	for g in spec.get("egg_groups", []):
		out.append(g["name"])
	return out

func _sort_learnset(ls: Dictionary) -> Dictionary:
	var keys := ls.keys()
	keys.sort_custom(func(a, b): return int(a) < int(b))
	var out := {}
	for k in keys:
		out[k] = ls[k]
	return out

func _walk_evolution(node: Dictionary, out: Dictionary) -> void:
	var src := String(node.get("species", {}).get("name", ""))
	for nxt in node.get("evolves_to", []):
		var det: Dictionary = nxt["evolution_details"][0] if nxt["evolution_details"].size() > 0 else {}
		var entry := { "to": nxt["species"]["name"], "trigger": det.get("trigger", {}).get("name", "level-up") }
		if det.get("min_level") != null:
			entry["min_level"] = det["min_level"]
		if det.get("item") != null:
			entry["item"] = det["item"]["name"]
		if det.get("min_happiness") != null:
			entry["min_happiness"] = det["min_happiness"]
		if not out.has(src):
			out[src] = []
		out[src].append(entry)
		_walk_evolution(nxt, out)

func _move_effect(mv: Dictionary) -> Dictionary:
	var meta: Dictionary = mv.get("meta", {})
	if meta.is_empty():
		return {}
	var target_user := String(mv.get("target", {}).get("name", "")) == "user"
	var tgt := "self" if target_user else "opponent"
	var out := {}
	var crit := int(meta.get("crit_rate", 0))
	if crit > 0:
		out["crit_stage"] = crit

	var ailment := String(meta.get("ailment", {}).get("name", "none"))
	var ac := int(meta.get("ailment_chance", 0))
	var stat_changes: Array = mv.get("stat_changes", [])
	var sc := int(meta.get("stat_chance", 0))
	var drain := int(meta.get("drain", 0))
	var flinch := int(meta.get("flinch_chance", 0))
	var heal := int(meta.get("healing", 0))
	var amap := { "paralysis": "paralysis", "burn": "burn", "poison": "poison", "toxic": "poison", "freeze": "freeze", "sleep": "sleep" }

	if amap.has(ailment):
		out.merge({ "kind": "status_chance", "status": amap[ailment], "chance": ac if ac > 0 else 100 })
	elif not stat_changes.is_empty():
		var changes := []
		for s in stat_changes:
			changes.append({ "stat": STAT_MAP.get(s["stat"]["name"], s["stat"]["name"]), "stages": s["change"] })
		if sc > 0 and sc < 100:
			out.merge({ "kind": "stat_chance", "chance": sc, "target": tgt, "stat_changes": changes })
		else:
			out.merge({ "kind": "stat", "target": tgt, "stat_changes": changes })
	elif drain > 0:
		out.merge({ "kind": "drain", "ratio": drain / 100.0 })
	elif drain < 0:
		out.merge({ "kind": "recoil", "ratio": -drain / 100.0 })
	elif heal > 0:
		out.merge({ "kind": "heal", "ratio": heal / 100.0 })
	elif flinch > 0:
		out.merge({ "kind": "flinch_chance", "chance": flinch })
	return out

func _localized(names: Array, fallback: String) -> String:
	for n in names:
		if n["language"]["name"] == "de":
			return n["name"]
	for n in names:
		if n["language"]["name"] == "en":
			return n["name"]
	return fallback

func _gen4_types() -> Dictionary:
	return {
		"normal": {"rock": 0.5, "ghost": 0.0, "steel": 0.5},
		"fire": {"fire": 0.5, "water": 0.5, "grass": 2.0, "ice": 2.0, "bug": 2.0, "rock": 0.5, "dragon": 0.5, "steel": 2.0},
		"water": {"fire": 2.0, "water": 0.5, "grass": 0.5, "ground": 2.0, "rock": 2.0, "dragon": 0.5},
		"electric": {"water": 2.0, "electric": 0.5, "grass": 0.5, "ground": 0.0, "flying": 2.0, "dragon": 0.5},
		"grass": {"fire": 0.5, "water": 2.0, "grass": 0.5, "poison": 0.5, "ground": 2.0, "flying": 0.5, "bug": 0.5, "rock": 2.0, "dragon": 0.5, "steel": 0.5},
		"ice": {"fire": 0.5, "water": 0.5, "grass": 2.0, "ice": 0.5, "ground": 2.0, "flying": 2.0, "dragon": 2.0, "steel": 0.5},
		"fighting": {"normal": 2.0, "ice": 2.0, "poison": 0.5, "flying": 0.5, "psychic": 0.5, "bug": 0.5, "rock": 2.0, "ghost": 0.0, "dark": 2.0, "steel": 2.0},
		"poison": {"grass": 2.0, "poison": 0.5, "ground": 0.5, "rock": 0.5, "ghost": 0.5, "steel": 0.0},
		"ground": {"fire": 2.0, "electric": 2.0, "grass": 0.5, "poison": 2.0, "flying": 0.0, "bug": 0.5, "rock": 2.0, "steel": 2.0},
		"flying": {"electric": 0.5, "grass": 2.0, "fighting": 2.0, "bug": 2.0, "rock": 0.5, "steel": 0.5},
		"psychic": {"fighting": 2.0, "poison": 2.0, "psychic": 0.5, "dark": 0.0, "steel": 0.5},
		"bug": {"fire": 0.5, "grass": 2.0, "fighting": 0.5, "poison": 0.5, "flying": 0.5, "psychic": 2.0, "ghost": 0.5, "dark": 2.0, "steel": 0.5},
		"rock": {"fire": 2.0, "ice": 2.0, "fighting": 0.5, "ground": 0.5, "flying": 2.0, "bug": 2.0, "steel": 0.5},
		"ghost": {"normal": 0.0, "psychic": 2.0, "ghost": 2.0, "dark": 0.5, "steel": 0.5},
		"dragon": {"dragon": 2.0, "steel": 0.5},
		"dark": {"fighting": 0.5, "psychic": 2.0, "ghost": 2.0, "dark": 0.5, "steel": 0.5},
		"steel": {"fire": 0.5, "water": 0.5, "electric": 0.5, "ice": 2.0, "rock": 2.0, "steel": 0.5},
	}

func _get(path: String) -> Dictionary:
	var url := path if path.begins_with("http") else API + path
	var key := url.replace(API + "/", "").replace("/", "_").replace(":", "").replace(".", "") + ".json"
	var cpath := CACHE + key
	if FileAccess.file_exists(cpath):
		var v = JSON.parse_string(FileAccess.get_file_as_string(cpath))
		return v if typeof(v) == TYPE_DICTIONARY else {}
	for attempt in 4:
		var err := _http.request(url, ["User-Agent: Ru-Pokemon-Importer/1.0", "Accept: application/json"])
		if err != OK:
			await create_timer(1.0).timeout
			continue
		var res: Array = await _http.request_completed
		if int(res[1]) == 200:
			var body := (res[3] as PackedByteArray).get_string_from_utf8()
			var f := FileAccess.open(cpath, FileAccess.WRITE)
			if f:
				f.store_string(body)
				f.close()
			var v = JSON.parse_string(body)
			return v if typeof(v) == TYPE_DICTIONARY else {}
		await create_timer(1.5 * (attempt + 1)).timeout
	push_error("Fehlgeschlagen: " + url)
	return {}

func _write(name: String, obj: Dictionary) -> void:
	var keys := obj.keys()
	keys.sort()
	var ordered := {}
	for k in keys:
		ordered[k] = obj[k]
	var f := FileAccess.open(OUT + name, FileAccess.WRITE)
	f.store_string(JSON.stringify(ordered, "\t"))
	f.close()
	print("  %s: %d Eintraege" % [name, obj.size()])
