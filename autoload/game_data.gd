extends Node
## GameData (Autoload)
## Statische Spiel-Datenbank: Spezies, Attacken, Typen-Matrix, Entwicklungen.
## Wird EINMAL beim Start geladen und danach nur noch gelesen.
## Erzeugt von tools/import_pokeapi.py bzw. scripts/tools/pokeapi_importer.gd.

var species: Dictionary = {}      # "turtwig" -> { dex, name, types, base_stats, learnset, ... }
var moves: Dictionary = {}        # "tackle"  -> { name, type, category, power, accuracy, pp, priority, effect }
var types: Dictionary = {}        # "fire"    -> { "grass": 2.0, "water": 0.5, ... }
var items: Dictionary = {}
var evolutions: Dictionary = {}   # "turtwig" -> [ { to, trigger, min_level, ... } ]
var encounters: Dictionary = {}   # "testmap" -> { rate, grass: [ {species, min, max, weight} ] }
var maps: Dictionary = {}         # "route201" -> { size, spawns, walls, warps, npcs, trainers, ... }

const GENERATED_DIR := "res://data/generated/"

func _ready() -> void:
	_try_load("pokemon.json", func(d): species = d)
	_try_load("moves.json", func(d): moves = d)
	_try_load("types.json", func(d): types = d)
	_try_load("items.json", func(d): items = d)
	_try_load("evolutions.json", func(d): evolutions = d)
	_try_load("encounters.json", func(d): encounters = d)
	_load_maps()
	if not species.is_empty():
		print("[GameData] %d Spezies, %d Attacken, %d Typen geladen" % [species.size(), moves.size(), types.size()])

func _try_load(file_name: String, assign: Callable) -> void:
	var path := GENERATED_DIR + file_name
	if not FileAccess.file_exists(path):
		return
	var txt := FileAccess.get_file_as_string(path)
	var parsed: Variant = JSON.parse_string(txt)
	if typeof(parsed) == TYPE_DICTIONARY:
		assign.call(parsed)
	else:
		push_error("GameData: %s ist kein gueltiges JSON-Objekt" % path)

## Maps aus data/maps/*.json (getrennte Dateien) + data/maps.json (Sammel-Datei).
func _load_maps() -> void:
	_try_load_to("maps.json", func(d): maps.merge(d, true))
	var dir := DirAccess.open("res://data/maps/")
	if dir != null:
		for f in dir.get_files():
			if f.ends_with(".json"):
				var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://data/maps/" + f))
				if typeof(parsed) == TYPE_DICTIONARY:
					maps[f.get_basename()] = parsed
	if not maps.is_empty():
		print("[GameData] %d Maps geladen" % maps.size())

func _try_load_to(file_name: String, assign: Callable) -> void:
	var path := "res://data/" + file_name
	if FileAccess.file_exists(path):
		var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
		if typeof(parsed) == TYPE_DICTIONARY:
			assign.call(parsed)

## Typ-Multiplikator einer Angriffsart gegen EINEN Verteidiger-Typ.
func type_multiplier(attacking: String, defending: String) -> float:
	if types.has(attacking) and types[attacking].has(defending):
		return float(types[attacking][defending])
	return 1.0

func has_species(id: String) -> bool:
	return species.has(id)

func species_name(id: String) -> String:
	return String(species.get(id, {}).get("name", id.capitalize()))

## Spezies-Slugs sortiert nach Pokédex-Nummer.
func species_by_dex() -> Array:
	var ids := species.keys()
	ids.sort_custom(func(a, b): return int(species[a].get("dex", 9999)) < int(species[b].get("dex", 9999)))
	return ids

## Zu welcher Spezies entwickelt sich `id` (erste passende Regel) – oder "".
func evolution_target(id: String, level: int) -> String:
	for rule in evolutions.get(id, []):
		if String(rule.get("trigger", "")) == "level-up" and level >= int(rule.get("min_level", 999)):
			return String(rule.get("to", ""))
	return ""
